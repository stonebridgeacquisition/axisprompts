// Supabase Edge Function: WhatsApp AI Agent
// Direct port of src/inngest/functions/agent.js — runs entirely on Edge Functions
// Handles: message buffering (via lock), context loading, LLM calls, tool execution, WhatsApp reply

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')!
const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// OpenRouter models — tries in order, falls back on failure
const PRIORITIZED_MODELS = [
    'google/gemini-2.0-flash-001',
    'openai/gpt-4o-mini',
    'google/gemini-flash-1.5',
]

// ── Tool Definitions ──────────────────────────────────────────────────

const PAYMENT_TOOL = {
    type: "function",
    function: {
        name: "generate_payment_link",
        description: "Generates a Paystack payment link for the customer. Call this ONLY when the customer has confirmed their order and you have collected their name, phone, email, delivery address, and all order items.",
        parameters: {
            type: "object",
            properties: {
                amount: { type: "number", description: "The grand total in Naira as a plain integer. Must include delivery fee if applicable. Example: 4500" },
                customer_name: { type: "string", description: "The customer's full name. Must be a real name. Do NOT pass 'None', 'N/A', or empty string." },
                customer_phone: { type: "string", description: "The customer's phone number. Must be a real phone number. Do NOT pass 'None', 'N/A', or empty string." },
                customer_email: { type: "string", description: "The customer's email address. Must be a valid email with @. Do NOT pass 'None', 'N/A', or empty string." },
                delivery_address: { type: "string", description: "The delivery area/address. Use 'Pickup' if they chose pickup." },
                items: {
                    type: "array",
                    description: "Array of ordered items.",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string", description: "Item name from the menu." },
                            quantity: { type: "number", description: "Quantity ordered." },
                            price: { type: "number", description: "Unit price in Naira." }
                        },
                        required: ["name", "quantity", "price"]
                    }
                }
            },
            required: ["amount", "customer_name", "customer_phone", "customer_email", "items"]
        }
    }
}

const CHECK_ORDER_STATUS_TOOL = {
    type: "function",
    function: {
        name: "check_order_status",
        description: "Checks the current fulfillment status of an order using its Order ID (e.g. AX-7H2R). Look for the ID in the chat history before asking the customer.",
        parameters: {
            type: "object",
            properties: {
                order_id: { type: "string", description: "The 6-character Order ID starting with AX-. Example: AX-7G3Q" }
            },
            required: ["order_id"]
        }
    }
}

const CALCULATOR_TOOL = {
    type: "function",
    function: {
        name: "calculate",
        description: "A calculator tool for performing mathematical calculations. Use this for any arithmetic operations like order subtotals, delivery fee additions, tax calculations, change calculations, etc.",
        parameters: {
            type: "object",
            properties: {
                operation: { type: "string", description: "The mathematical operation: 'add', 'subtract', 'multiply', 'divide'. Example: 'add'" },
                values: { type: "array", items: { type: "number" }, description: "Array of numbers to perform the operation on. Example: [2500, 1500, 500] for adding three numbers." }
            },
            required: ["operation", "values"]
        }
    }
}

const THINK_TOOL = {
    type: "function",
    function: {
        name: "think",
        description: "Use this tool to think through complex problems, reason about customer requests, or work through logic before responding. Your thinking is internal and won't be shown to the customer.",
        parameters: {
            type: "object",
            properties: {
                reasoning: { type: "string", description: "Your internal reasoning, analysis, or thought process about the customer's request." }
            },
            required: ["reasoning"]
        }
    }
}

// ── Helpers ────────────────────────────────────────────────────────────

function stripToolCalls(text: string): string {
    if (!text) return text
    text = text.replace(/\*\([^)]*\)\*/g, '').trim()
    text = text.replace(/\n\s*\n/g, '\n').trim()
    return text
}

async function sendWhatsApp(phoneNumberId: string, accessToken: string, to: string, body: string) {
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "text",
            text: { body }
        })
    })
    if (!res.ok) {
        const err = await res.text()
        throw new Error(`WhatsApp API Error: ${err}`)
    }
    return res.json()
}

// ── LLM with Tool Calling ─────────────────────────────────────────────

async function callLLMWithTools(
    messages: any[],
    tools: any[],
    toolExecutor: (fnName: string, fnArgs: any) => Promise<any>
): Promise<string> {
    let lastError: Error | null = null

    for (const modelId of PRIORITIZED_MODELS) {
        try {
            console.log(`[LLM] Attempting with model: ${modelId}`)

            const body: any = { model: modelId, messages, temperature: 0.5 }
            if (tools && tools.length > 0) body.tools = tools

            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            })

            if (!res.ok) {
                const errText = await res.text()
                throw new Error(`HTTP ${res.status}: ${errText}`)
            }

            const data = await res.json()
            const choice = data.choices?.[0]
            if (!choice) throw new Error('No response from OpenRouter')

            console.log(`[LLM] ${modelId} replied | finish_reason: ${choice.finish_reason}`)

            // If the model wants to call a tool
            if (choice.finish_reason === 'tool_calls' || choice.message?.tool_calls?.length > 0) {
                const toolCalls = choice.message.tool_calls
                console.log(`[LLM] Tool calls requested: ${toolCalls.map((tc: any) => tc.function.name).join(', ')}`)

                const updatedMessages = [...messages, choice.message]

                for (const toolCall of toolCalls) {
                    const fnName = toolCall.function.name
                    let fnArgs: any
                    try {
                        fnArgs = JSON.parse(toolCall.function.arguments)
                    } catch {
                        console.error(`[LLM] Failed to parse tool arguments: ${toolCall.function.arguments}`)
                        fnArgs = {}
                    }

                    console.log(`[TOOL] Executing ${fnName} with args:`, JSON.stringify(fnArgs).substring(0, 200))

                    if (!['generate_payment_link', 'check_order_status', 'calculate', 'think'].includes(fnName)) {
                        console.warn(`[TOOL] Model called unknown tool "${fnName}" - rejecting`)
                        updatedMessages.push({
                            role: "tool",
                            tool_call_id: toolCall.id,
                            content: JSON.stringify({ error: `Tool "${fnName}" does not exist.` })
                        })
                        continue
                    }

                    const result = await toolExecutor(fnName, fnArgs)
                    console.log(`[TOOL] ${fnName} result:`, JSON.stringify(result).substring(0, 200))

                    updatedMessages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(result)
                    })
                }

                // Filter out think tool results before follow-up
                const messagesForFollowUp = updatedMessages.filter((msg: any) => {
                    if (msg.role === 'tool') {
                        const originalToolCall = toolCalls.find((tc: any) => tc.id === msg.tool_call_id)
                        return originalToolCall?.function.name !== 'think'
                    }
                    return true
                })

                const followUpRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ model: modelId, messages: messagesForFollowUp, temperature: 0.5 })
                })

                if (!followUpRes.ok) {
                    const errText = await followUpRes.text()
                    throw new Error(`Follow-up HTTP ${followUpRes.status}: ${errText}`)
                }

                const followUpData = await followUpRes.json()
                let finalText = followUpData.choices?.[0]?.message?.content
                if (!finalText) throw new Error('Empty follow-up response')
                return stripToolCalls(finalText)
            }

            // No tool calls — just return text
            let text = choice.message?.content
            if (!text) throw new Error('Empty response')
            return stripToolCalls(text)

        } catch (error: any) {
            console.error(`[LLM] Model ${modelId} failed:`, error.message)
            lastError = error
        }
    }

    throw new Error(`All models failed. Last error: ${lastError?.message}`)
}

// ── Payment Link Execution ────────────────────────────────────────────

async function executePaymentLink(args: any, business_id: string, user_id: string) {
    try {
        const customerEmail = args.customer_email || `${user_id}@customer.swiftorderai.com`

        // Recalculate total from items — never trust LLM math
        let calculatedTotal = 0
        if (args.items && Array.isArray(args.items)) {
            for (const item of args.items) {
                calculatedTotal += Math.round(Number(item.price || 0)) * Math.round(Number(item.quantity || 1))
            }
        }

        // Add delivery fee from DB if delivery (not pickup)
        if (args.delivery_address && args.delivery_address.toLowerCase() !== 'pickup') {
            const { data: fees } = await supabase
                .from('delivery_fees')
                .select('fee, location')
                .eq('client_id', business_id)

            if (fees && fees.length > 0) {
                const addrLower = args.delivery_address.toLowerCase()
                const match = fees.find((f: any) => addrLower.includes(f.location.toLowerCase()) || f.location.toLowerCase().includes(addrLower))
                if (match) {
                    calculatedTotal += Math.round(Number(match.fee))
                    console.log(`[PAYMENT] Delivery fee added: NGN${match.fee} for ${match.location}`)
                }
            }
        }

        const amount = calculatedTotal > 0 ? calculatedTotal : Math.round(Number(args.amount))
        if (!amount || amount <= 0) {
            return { error: `Invalid amount. Please confirm the items and total.` }
        }

        console.log(`[PAYMENT] Amount | LLM said: NGN${args.amount} | Calculated: NGN${amount} | ${args.customer_name} | ${customerEmail}`)

        // Fetch Subaccount Code
        const { data: clientData } = await supabase
            .from('clients')
            .select('paystack_subaccount_code')
            .eq('id', business_id)
            .single()

        const subaccount = clientData?.paystack_subaccount_code

        // Deduct Stock
        if (args.items && Array.isArray(args.items)) {
            for (const item of args.items) {
                const { data: menuItems } = await supabase
                    .from('menu_items')
                    .select('id, stock_level, track_inventory')
                    .eq('client_id', business_id)
                    .ilike('name', item.name)
                    .limit(1)

                const menuItem = menuItems?.[0]
                if (menuItem && menuItem.track_inventory && menuItem.stock_level !== null) {
                    const newStock = Math.max(0, menuItem.stock_level - (item.quantity || 1))
                    await supabase
                        .from('menu_items')
                        .update({ stock_level: newStock })
                        .eq('id', menuItem.id)
                    console.log(`[PAYMENT] Stock deducted: ${item.name} (${menuItem.stock_level} -> ${newStock})`)
                }
            }
        }

        // Generate Reference & Call Paystack
        const reference = `REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`

        const paystackPayload: any = {
            email: customerEmail,
            amount: amount * 100,
            reference,
            callback_url: "https://www.swiftorderai.com/payment-success",
            metadata: {
                user_id,
                business_id,
                customer_name: args.customer_name,
                customer_phone: args.customer_phone,
                delivery_address: args.delivery_address || 'Pickup',
                items: args.items
            }
        }

        if (subaccount) {
            paystackPayload.subaccount = subaccount
            console.log(`[PAYMENT] Using Subaccount: ${subaccount}`)
        }

        const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paystackPayload)
        })

        if (!paystackRes.ok) {
            const errBody = await paystackRes.text()
            throw new Error(`Paystack HTTP ${paystackRes.status}: ${errBody}`)
        }

        const paystackData = await paystackRes.json()
        const authUrl = paystackData.data.authorization_url
        console.log(`[PAYMENT] Paystack link generated: ${authUrl}`)

        // Log Transaction to DB — include expires_at for pg_cron expiry instead of Inngest
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes from now

        await supabase.from('transactions').insert({
            reference,
            client_id: business_id,
            user_id,
            amount,
            status: 'pending',
            subaccount_code: subaccount,
            expires_at: expiresAt,
            order_items: args.items,
            order_metadata: {
                customer_name: args.customer_name,
                customer_phone: args.customer_phone,
                customer_email: customerEmail,
                delivery_address: args.delivery_address || 'Pickup',
            }
        })

        return {
            success: true,
            payment_url: authUrl,
            reference,
            amount,
            message: `Payment link generated successfully. Share this URL with the customer: ${authUrl}. Their stock is reserved for 30 minutes.`
        }
    } catch (err: any) {
        console.error("[PAYMENT] executePaymentLink failed:", err.message || err)
        return { error: `Payment link generation failed: ${err.message}. Please try again or contact support.` }
    }
}

// ── Concurrency Lock ──────────────────────────────────────────────────

async function acquireLock(sessionId: string): Promise<boolean> {
    // Try to acquire lock — only proceed if no other agent is processing this session
    const now = new Date().toISOString()
    const lockUntil = new Date(Date.now() + 60_000).toISOString() // 60s lock

    const { data, error } = await supabase
        .from('chat_sessions')
        .update({ agent_lock_until: lockUntil })
        .eq('id', sessionId)
        .or(`agent_lock_until.is.null,agent_lock_until.lt.${now}`)
        .select('id')

    if (error) {
        console.error('[LOCK] Error acquiring lock:', error)
        return false
    }

    return data && data.length > 0
}

async function releaseLock(sessionId: string) {
    await supabase
        .from('chat_sessions')
        .update({ agent_lock_until: null })
        .eq('id', sessionId)
}

// ── Parse Meta WhatsApp Payload ───────────────────────────────────────

interface ParsedMessage {
    user_id: string
    user_name: string
    message: string
    platform: string
}

function parseMetaPayload(payload: any): ParsedMessage | null {
    if (payload?.object !== 'whatsapp_business_account') return null

    for (const entry of payload.entry || []) {
        for (const change of entry.changes || []) {
            const value = change.value

            // Skip status updates (delivered, read, sent)
            if (value.statuses) continue

            if (value.messages?.[0]) {
                const msg = value.messages[0]

                // Only process text messages
                if (msg.type !== 'text') {
                    console.log(`[WHATSAPP] Skipping non-text message type: ${msg.type}`)
                    continue
                }

                const messageText = msg.text?.body
                if (!messageText || messageText.trim().length === 0) continue

                return {
                    user_id: msg.from,
                    user_name: value.contacts?.[0]?.profile?.name || 'Customer',
                    message: messageText,
                    platform: 'whatsapp',
                }
            }
        }
    }

    return null
}

// ── Main Handler ──────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
    const url = new URL(req.url)
    const bid = url.searchParams.get('bid')

    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        })
    }

    // ── GET: Meta Webhook Verification ────────────────────────────────
    if (req.method === 'GET') {
        if (!bid) {
            return new Response('WhatsApp Agent is ACTIVE.', { status: 200 })
        }

        const mode = url.searchParams.get('hub.mode')
        const token = url.searchParams.get('hub.verify_token')
        const challenge = url.searchParams.get('hub.challenge')

        if (!mode || !token || !challenge) {
            return new Response('Missing verification params', { status: 400 })
        }

        // Look up the expected verify token for this business
        const { data: business, error } = await supabase
            .from('clients')
            .select('whatsapp_verify_token')
            .eq('id', bid)
            .single()

        if (error || !business) {
            console.error(`[VERIFY] Business not found for BID: ${bid}`)
            return new Response('Forbidden', { status: 403 })
        }

        if (mode === 'subscribe' && token === business.whatsapp_verify_token) {
            console.log(`[VERIFY] Webhook verified for BID: ${bid}`)
            return new Response(challenge, { status: 200 })
        }

        console.error(`[VERIFY] Token mismatch for BID: ${bid}`)
        return new Response('Forbidden', { status: 403 })
    }

    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 })
    }

    // ── POST: Parse body ──────────────────────────────────────────────
    let rawPayload: any
    try {
        rawPayload = await req.json()
    } catch {
        return new Response('Invalid JSON', { status: 400 })
    }

    let business_id: string
    let user_id: string
    let user_name: string
    let message: string
    let platform: string

    if (bid) {
        // ── Meta WhatsApp webhook format (has ?bid= query param) ──────
        // Verify signature if present
        const { data: business, error: busError } = await supabase
            .from('clients')
            .select('business_name, whatsapp_app_secret')
            .eq('id', bid)
            .single()

        if (busError || !business) {
            console.error(`[WHATSAPP] Business not found for BID: ${bid}`)
            return new Response('EVENT_RECEIVED', { status: 200 })
        }

        const parsed = parseMetaPayload(rawPayload)
        if (!parsed) {
            // Not a message event (could be status update etc.) — acknowledge it
            return new Response('EVENT_RECEIVED', { status: 200 })
        }

        business_id = bid
        user_id = parsed.user_id
        user_name = parsed.user_name
        message = parsed.message
        platform = parsed.platform

        console.log(`[WHATSAPP] Msg from ${user_id} to BID ${business_id}: "${message.substring(0, 80)}"`)
    } else {
        // ── Direct JSON format (simulate, manychat, internal callers) ─
        business_id = rawPayload.business_id
        user_id = rawPayload.user_id
        user_name = rawPayload.user_name || 'Customer'
        message = rawPayload.message
        platform = rawPayload.platform || 'api'

        if (!business_id || !user_id || !message) {
            return new Response(JSON.stringify({ error: 'Missing required fields: business_id, user_id, message' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            })
        }
    }

    console.log(`[AGENT] Incoming | biz=${business_id} user=${user_id} msg="${message.substring(0, 80)}"`)

    try {
        // ── 1. LOAD CONTEXT ───────────────────────────────────────

        // A. Fetch Menu
        const { data: menu } = await supabase
            .from('menu_items')
            .select('name, price, category, description')
            .eq('client_id', business_id)

        // B. System Prompt
        const { data: promptSetting } = await supabase
            .from('platform_settings')
            .select('value')
            .eq('key', 'universal_agent_prompt')
            .maybeSingle()

        const activeSystemPrompt = promptSetting?.value
        if (!activeSystemPrompt) {
            throw new Error('Agent prompt not configured. Please set universal_agent_prompt in platform_settings.')
        }

        // C. Client info
        const { data: clientInfo } = await supabase
            .from('clients')
            .select('status, is_open, open_time, close_time, agent_name, business_name, offers_pickup, team_contact, whatsapp_phone_number_id, whatsapp_access_token, open_days')
            .eq('id', business_id)
            .single()

        // D. Delivery Fees
        const { data: deliveryFees } = await supabase
            .from('delivery_fees')
            .select('location, fee')
            .eq('client_id', business_id)

        // E. Get or Create Session & Fetch History
        let sessionId: string
        const { data: existingSession } = await supabase
            .from('chat_sessions')
            .select('id')
            .match({ client_id: business_id, whatsapp_user_id: user_id })
            .single()

        if (existingSession) {
            sessionId = existingSession.id
        } else {
            const { data: newSession } = await supabase
                .from('chat_sessions')
                .insert({ client_id: business_id, whatsapp_user_id: user_id, user_name: user_name || 'Customer' })
                .select('id')
                .single()
            sessionId = newSession!.id
        }

        // Acquire concurrency lock (replaces Inngest's per-user concurrency limit)
        const gotLock = await acquireLock(sessionId)
        if (!gotLock) {
            console.log(`[AGENT] Session ${sessionId} is locked by another agent run. Skipping.`)
            return new Response(JSON.stringify({ success: false, reason: 'session_locked' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        try {
            // Fetch last 30 messages
            const { data: history } = await supabase
                .from('chat_messages')
                .select('role, content')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: false })
                .limit(30)

            const context = {
                sessionId,
                menu: menu || [],
                systemPrompt: activeSystemPrompt,
                history: history ? history.reverse() : [],
                status: clientInfo?.status || 'Active',
                isOpen: clientInfo?.is_open !== false,
                openTime: clientInfo?.open_time || null,
                closeTime: clientInfo?.close_time || null,
                openDays: clientInfo?.open_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                agentName: clientInfo?.agent_name || 'Agent',
                businessName: clientInfo?.business_name || 'Our Store',
                offersPickup: clientInfo?.offers_pickup || false,
                deliveryFees: deliveryFees || [],
                teamContact: clientInfo?.team_contact || '',
                phoneNumberId: clientInfo?.whatsapp_phone_number_id || null,
                accessToken: clientInfo?.whatsapp_access_token || null,
            }

            // CHECK 1: If business is INACTIVE, silently stop
            if (context.status?.toLowerCase() === 'inactive') {
                console.log(`[AGENT] Business ${business_id} is INACTIVE. Skipping.`)
                return new Response(JSON.stringify({ success: false, reason: 'business_inactive' }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                })
            }

            // CHECK 2: If store is CLOSED, send automated message
            if (!context.isOpen) {
                const openTimeStr = context.openTime ? context.openTime.substring(0, 5) : 'our usual opening time'
                const closeTimeStr = context.closeTime ? context.closeTime.substring(0, 5) : ''
                const hoursStr = closeTimeStr ? `${openTimeStr} - ${closeTimeStr}` : openTimeStr

                const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                const currentWATTime = new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' })
                const currentWATDate = new Date(currentWATTime)
                const currentDay = daysOfWeek[currentWATDate.getDay()]

                const isClosedDueToDay = context.openDays && !context.openDays.includes(currentDay)
                let closedMsg = ''

                if (isClosedDueToDay) {
                    let nextOpenDay: string | null = null
                    for (let i = 1; i <= 7; i++) {
                        const nextDate = new Date(currentWATDate)
                        nextDate.setDate(nextDate.getDate() + i)
                        const nextDay = daysOfWeek[nextDate.getDay()]
                        if (context.openDays.includes(nextDay)) {
                            nextOpenDay = nextDay
                            break
                        }
                    }
                    closedMsg = `Hey there! We're not open today, but we'll be back on ${nextOpenDay} at ${openTimeStr}.\n\nFeel free to reach out then and we'd be happy to help you place your order!`
                } else {
                    closedMsg = `Hey there! We're currently closed and not accepting orders right now.\n\nWe'll be open by ${hoursStr}. Feel free to message us then and we'll be happy to help you place your order!`
                }

                // Save messages
                await supabase.from('chat_messages').insert({ session_id: context.sessionId, role: 'user', content: message })
                await supabase.from('chat_messages').insert({ session_id: context.sessionId, role: 'assistant', content: closedMsg })

                await supabase.from('chat_sessions').update({
                    last_user_message_at: new Date().toISOString(),
                    last_assistant_message_at: new Date().toISOString(),
                    follow_up_sent: false,
                    follow_up_eligible: false
                }).eq('id', context.sessionId)

                // Send via WhatsApp
                if (context.phoneNumberId && context.accessToken && platform !== 'simulation') {
                    await sendWhatsApp(context.phoneNumberId, context.accessToken, user_id, closedMsg)
                }

                return new Response(JSON.stringify({ success: true, reply: closedMsg }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                })
            }

            // ── 2. GENERATE AI RESPONSE ───────────────────────────────

            const menuContext = JSON.stringify(context.menu)

            const now = new Date()
            const watTime = now.toLocaleString('en-NG', {
                timeZone: 'Africa/Lagos',
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            })

            let systemPrompt = context.systemPrompt
                .replace(/{{AGENT_NAME}}/g, context.agentName)
                .replace(/{{BUSINESS_NAME}}/g, context.businessName)
                .replace('{{MENU}}', menuContext)
                .replace('{{CURRENT_TIME}}', watTime)

            systemPrompt += `\n\n--- BUSINESS FACTS (DO NOT CONTRADICT) ---`
            systemPrompt += `\nAgent Name: ${context.agentName}`
            systemPrompt += `\nBusiness Name: ${context.businessName}`
            systemPrompt += `\nCurrent Time (WAT): ${watTime}`
            systemPrompt += `\nStore Status: ${context.isOpen ? 'OPEN' : 'CLOSED'}`
            systemPrompt += `\nOpen Days: ${context.openDays ? context.openDays.join(', ') : 'Every day'}`
            systemPrompt += `\nOffers Pickup: ${context.offersPickup ? 'YES' : 'NO'}`
            systemPrompt += `\nTeam/Escalation Contact: ${context.teamContact}`

            systemPrompt += `\n\n--- DELIVERY CONFIGURATION ---`
            systemPrompt += `\nZones & Fees: ${JSON.stringify(context.deliveryFees)}`

            systemPrompt += `\n\n--- MENU & STOCK ---`
            systemPrompt += `\n${menuContext}`

            systemPrompt += `\n\n--- TOOLS AVAILABLE ---`
            systemPrompt += `\n1. generate_payment_link: Call this to create a checkout link. Requires name, phone, email, address, and items.`
            systemPrompt += `\n2. check_order_status: Call this to check an existing order status using an Order ID (AX-XXXXXX).`

            const messages: any[] = [{ role: 'system', content: systemPrompt }]

            if (context.history && context.history.length > 0) {
                for (const msg of context.history) {
                    messages.push({
                        role: msg.role === 'assistant' ? 'assistant' : 'user',
                        content: msg.content
                    })
                }
            }

            messages.push({ role: 'user', content: message })

            // Tool executor
            const toolExecutor = async (fnName: string, fnArgs: any) => {
                if (fnName === 'generate_payment_link') {
                    const isValid = (v: any) => v && v !== 'None' && v !== 'null' && v !== 'N/A' && String(v).trim().length > 1

                    if (!isValid(fnArgs.customer_name)) {
                        return { error: 'STOP. Do not call this tool again. Tell the customer: "I need your full name, phone number, and email address."' }
                    }
                    if (!isValid(fnArgs.customer_phone)) {
                        return { error: 'STOP. Do not call this tool again. Tell the customer: "I need your full name, phone number, and email address."' }
                    }
                    if (!isValid(fnArgs.customer_email) || !String(fnArgs.customer_email).includes('@')) {
                        return { error: 'STOP. Do not call this tool again. Tell the customer: "I need your full name, phone number, and email address."' }
                    }
                    if (!fnArgs.items || !Array.isArray(fnArgs.items) || fnArgs.items.length === 0) {
                        return { error: 'STOP. No items in the order. Ask the customer what they want to order first.' }
                    }

                    return await executePaymentLink(fnArgs, business_id, user_id)
                }

                if (fnName === 'check_order_status') {
                    const { data, error } = await supabase
                        .from('orders')
                        .select('status, delivery_address, items_summary, total_amount')
                        .eq('order_id', fnArgs.order_id)
                        .eq('client_id', business_id)
                        .maybeSingle()

                    if (error || !data) {
                        return { error: `I couldn't find an order with ID ${fnArgs.order_id}. Please double-check the number.` }
                    }

                    return {
                        success: true,
                        order_id: fnArgs.order_id,
                        status: data.status,
                        message: `Order #${fnArgs.order_id} is currently: ${data.status}.`
                    }
                }

                if (fnName === 'calculate') {
                    const operation = fnArgs.operation?.toLowerCase()
                    const values = fnArgs.values || []

                    if (!operation || values.length === 0) {
                        return { error: 'Invalid calculator input. Provide operation and values array.' }
                    }

                    let result: number
                    switch (operation) {
                        case 'add':
                            result = values.reduce((sum: number, val: number) => sum + val, 0)
                            break
                        case 'subtract':
                            result = values.reduce((diff: number, val: number) => diff - val)
                            break
                        case 'multiply':
                            result = values.reduce((prod: number, val: number) => prod * val, 1)
                            break
                        case 'divide':
                            if (values.some((v: number) => v === 0)) {
                                return { error: 'Cannot divide by zero.' }
                            }
                            result = values.reduce((quot: number, val: number) => quot / val)
                            break
                        default:
                            return { error: `Unknown operation: ${operation}. Use: add, subtract, multiply, divide.` }
                    }

                    return { success: true, operation, values, result: parseFloat(result.toFixed(2)) }
                }

                if (fnName === 'think') {
                    console.log(`[AGENT-THINKING] ${fnArgs.reasoning || ''}`)
                    return { success: true, acknowledged: true, message: 'Thinking complete. Proceeding with response.' }
                }

                return { error: `Unknown tool: ${fnName}` }
            }

            let aiResponse: string
            try {
                let text = await callLLMWithTools(messages, [PAYMENT_TOOL, CHECK_ORDER_STATUS_TOOL, CALCULATOR_TOOL, THINK_TOOL], toolExecutor)

                // Strip any <internal_thinking> tags
                text = text.replace(/<internal_thinking>[\s\S]*?<\/internal_thinking>/gi, '').trim()
                text = stripToolCalls(text)

                // Remove duplicate consecutive lines
                const lines = text.split('\n')
                const deduped = lines.filter((line: string, i: number) => i === 0 || line.trim() !== lines[i - 1].trim())
                text = deduped.join('\n').trim()

                aiResponse = text
            } catch (error: any) {
                console.error('[LLM] Error:', error?.message || error)
                aiResponse = 'Something went wrong on my end. Please send your message again.'
            }

            // ── 3. SAVE & REPLY ───────────────────────────────────────

            await supabase.from('chat_messages').insert({ session_id: context.sessionId, role: 'user', content: message })
            await supabase.from('chat_messages').insert({ session_id: context.sessionId, role: 'assistant', content: aiResponse })

            await supabase.from('chat_sessions').update({
                last_user_message_at: new Date().toISOString(),
                last_assistant_message_at: new Date().toISOString(),
                follow_up_sent: false,
                follow_up_eligible: true
            }).eq('id', context.sessionId)

            // Send via WhatsApp
            if (context.phoneNumberId && context.accessToken) {
                if (platform === 'simulation') {
                    console.log(`[SIMULATION] Response saved for user: ${user_id}, bypassing WhatsApp.`)
                } else {
                    try {
                        console.log(`Sending WhatsApp response to user: ${user_id} via Phone ID: ${context.phoneNumberId}`)
                        await sendWhatsApp(context.phoneNumberId, context.accessToken, user_id, aiResponse)
                        console.log("Sent successfully via WhatsApp!")
                    } catch (err: any) {
                        console.error("WhatsApp Send Failed:", err.message)
                        throw err
                    }
                }
            } else {
                console.log("Simulating WhatsApp send (No Credentials found for client):", aiResponse)
            }

            return new Response(JSON.stringify({ success: true, reply: aiResponse }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            })

        } finally {
            // Always release the lock
            await releaseLock(sessionId)
        }

    } catch (workflowError: any) {
        console.error('[AGENT WORKFLOW ERROR]', workflowError?.message || workflowError)

        const errorMsg = `[DEBUG] Agent Error:\n\n${workflowError?.message || String(workflowError)}`

        // Try to notify user of error via WhatsApp
        try {
            const { data: clientInfo } = await supabase
                .from('clients')
                .select('whatsapp_phone_number_id, whatsapp_access_token')
                .eq('id', business_id)
                .single()

            if (clientInfo?.whatsapp_phone_number_id && clientInfo?.whatsapp_access_token && platform !== 'simulation') {
                await sendWhatsApp(clientInfo.whatsapp_phone_number_id, clientInfo.whatsapp_access_token, user_id, errorMsg)
            }
        } catch (sendErr: any) {
            console.error('[DEBUG] Failed to send error to WhatsApp:', sendErr.message)
        }

        return new Response(JSON.stringify({ success: false, error: workflowError.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
})
