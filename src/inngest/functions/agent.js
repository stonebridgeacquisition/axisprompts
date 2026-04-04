import { inngest } from "../client.js";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

// Initialize Supabase (Use Service Key for backend operations)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// OpenRouter models — tries in order, falls back on failure
const PRIORITIZED_MODELS = [
    'google/gemini-2.0-flash-001',  // Primary — proven to work
    'openai/gpt-4o-mini',            // Fallback 1
    'google/gemini-flash-1.5',       // Fallback 2
];

// Tool definition for payment link generation (OpenAI-compatible format)
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
};

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
};

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
};

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
};

/**
 * Call OpenRouter with messages + optional tools.
 * Retries across multiple models if one fails.
 * Returns the final text response.
 */
async function callLLMWithTools(messages, tools, toolExecutor) {
    let lastError = null;

    for (const modelId of PRIORITIZED_MODELS) {
        try {
            console.log(`[LLM] Attempting with model: ${modelId}`);

            const body = {
                model: modelId,
                messages: messages,
                temperature: 0.5,
            };
            if (tools && tools.length > 0) {
                body.tools = tools;
            }

            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`HTTP ${res.status}: ${errText}`);
            }

            const data = await res.json();
            const choice = data.choices?.[0];

            if (!choice) throw new Error('No response from OpenRouter');
            console.log(`[LLM] ${modelId} replied | finish_reason: ${choice.finish_reason}`);

            // If the model wants to call a tool
            if (choice.finish_reason === 'tool_calls' || choice.message?.tool_calls?.length > 0) {
                const toolCalls = choice.message.tool_calls;
                console.log(`[LLM] Tool calls requested: ${toolCalls.map(tc => tc.function.name).join(', ')}`);

                // Add the assistant's tool_calls message to the conversation
                const updatedMessages = [...messages, choice.message];

                // Execute each tool and add results
                for (const toolCall of toolCalls) {
                    const fnName = toolCall.function.name;
                    let fnArgs;
                    try {
                        fnArgs = JSON.parse(toolCall.function.arguments);
                    } catch (e) {
                        console.error(`[LLM] Failed to parse tool arguments: ${toolCall.function.arguments}`);
                        fnArgs = {};
                    }

                    console.log(`[TOOL] Executing ${fnName} with args:`, JSON.stringify(fnArgs).substring(0, 200));

                    // Reject unknown tool calls
                    if (fnName !== 'generate_payment_link' && fnName !== 'check_order_status' && fnName !== 'calculate' && fnName !== 'think') {
                        console.warn(`[TOOL] Model called unknown tool "${fnName}" - rejecting`);
                        updatedMessages.push({
                            role: "tool",
                            tool_call_id: toolCall.id,
                            content: JSON.stringify({ error: `Tool "${fnName}" does not exist.` })
                        });
                        continue;
                    }

                    const result = await toolExecutor(fnName, fnArgs);
                    console.log(`[TOOL] ${fnName} result:`, JSON.stringify(result).substring(0, 200));

                    updatedMessages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(result)
                    });
                }

                // Filter out think tool results before sending back to model (they're internal only)
                const messagesForFollowUp = updatedMessages.filter(msg => {
                    if (msg.role === 'tool') {
                        // Find the corresponding tool call to check its name
                        const originalToolCall = toolCalls.find(tc => tc.id === msg.tool_call_id);
                        // Exclude think tool responses from being sent back
                        return originalToolCall?.function.name !== 'think';
                    }
                    return true;
                });

                // Send results back to the model for the final response
                const followUpRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: modelId,
                        messages: messagesForFollowUp,
                        temperature: 0.5,
                    })
                });

                if (!followUpRes.ok) {
                    const errText = await followUpRes.text();
                    throw new Error(`Follow-up HTTP ${followUpRes.status}: ${errText}`);
                }

                const followUpData = await followUpRes.json();
                const finalText = followUpData.choices?.[0]?.message?.content;
                if (!finalText) throw new Error('Empty follow-up response');
                return finalText;
            }

            // No tool calls — just return the text
            const text = choice.message?.content;
            if (!text) throw new Error('Empty response');
            return text;

        } catch (error) {
            console.error(`[LLM] Model ${modelId} failed:`, error.message);
            lastError = error;
            // Continue to try next model
        }
    }

    throw new Error(`All models failed. Last error: ${lastError?.message}`);
}

/**
 * Execute a payment link generation via Paystack.
 * Called by the tool executor when the AI calls generate_payment_link.
 */
async function executePaymentLink(args, business_id, user_id) {
    try {
        const customerEmail = args.customer_email || `${user_id}@customer.swiftorderai.com`;

        // Recalculate total from items + delivery fee — never trust LLM math for financial amounts
        let calculatedTotal = 0;
        if (args.items && Array.isArray(args.items)) {
            for (const item of args.items) {
                calculatedTotal += Math.round(Number(item.price || 0)) * Math.round(Number(item.quantity || 1));
            }
        }

        // Add delivery fee from DB if delivery (not pickup)
        if (args.delivery_address && args.delivery_address.toLowerCase() !== 'pickup') {
            const { data: fees } = await supabase
                .from('delivery_fees')
                .select('fee, location')
                .eq('client_id', business_id);

            if (fees && fees.length > 0) {
                const addrLower = args.delivery_address.toLowerCase();
                const match = fees.find(f => addrLower.includes(f.location.toLowerCase()) || f.location.toLowerCase().includes(addrLower));
                if (match) {
                    calculatedTotal += Math.round(Number(match.fee));
                    console.log(`[PAYMENT] Delivery fee added: ₦${match.fee} for ${match.location}`);
                }
            }
        }

        // Use calculated total. Fall back to LLM-provided amount only if items had no prices.
        const amount = calculatedTotal > 0 ? calculatedTotal : Math.round(Number(args.amount));
        if (!amount || amount <= 0) {
            return { error: `Invalid amount. Please confirm the items and total.` };
        }

        console.log(`[PAYMENT] Amount | LLM said: ₦${args.amount} | Calculated: ₦${amount} | ${args.customer_name} | ${customerEmail}`);

        // 1. Fetch Subaccount Code
        const { data: clientData } = await supabase
            .from('clients')
            .select('paystack_subaccount_code')
            .eq('id', business_id)
            .single();

        const subaccount = clientData?.paystack_subaccount_code;

        // 2. Deduct Stock
        if (args.items && Array.isArray(args.items)) {
            for (const item of args.items) {
                const { data: menuItems } = await supabase
                    .from('menu_items')
                    .select('id, stock_level, track_inventory')
                    .eq('client_id', business_id)
                    .ilike('name', item.name)
                    .limit(1);

                const menuItem = menuItems?.[0];
                if (menuItem && menuItem.track_inventory && menuItem.stock_level !== null) {
                    const newStock = Math.max(0, menuItem.stock_level - (item.quantity || 1));
                    await supabase
                        .from('menu_items')
                        .update({ stock_level: newStock })
                        .eq('id', menuItem.id);
                    console.log(`[PAYMENT] Stock deducted: ${item.name} (${menuItem.stock_level} -> ${newStock})`);
                }
            }
        }

        // 3. Generate Reference & Call Paystack
        const reference = `REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const paystackPayload = {
            email: customerEmail,
            amount: amount * 100,
            reference: reference,
            callback_url: "https://www.swiftorderai.com/payment-success",
            metadata: {
                user_id: user_id,
                business_id: business_id,
                customer_name: args.customer_name,
                customer_phone: args.customer_phone,
                delivery_address: args.delivery_address || 'Pickup',
                items: args.items
            }
        };

        if (subaccount) {
            paystackPayload.subaccount = subaccount;
            console.log(`[PAYMENT] Using Subaccount: ${subaccount}`);
        }

        const paystackResponse = await axios.post(
            'https://api.paystack.co/transaction/initialize',
            paystackPayload,
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const authUrl = paystackResponse.data.data.authorization_url;
        console.log(`[PAYMENT] Paystack link generated: ${authUrl}`);

        // 4. Log Transaction to DB
        await supabase.from('transactions').insert({
            reference: reference,
            client_id: business_id,
            user_id: user_id,
            amount: amount,
            status: 'pending',
            subaccount_code: subaccount
        });

        // 5. Trigger Inngest 30-Min Timer
        await inngest.send({
            name: "payment/invoice.generated",
            data: {
                reference: reference,
                user_id: user_id,
                amount: amount,
                business_id: business_id,
                orderData: {
                    customer_name: args.customer_name,
                    customer_phone: args.customer_phone,
                    customer_email: customerEmail,
                    delivery_address: args.delivery_address || 'Pickup',
                    items: args.items
                }
            }
        });

        return {
            success: true,
            payment_url: authUrl,
            reference: reference,
            amount: amount,
            message: `Payment link generated successfully. Share this URL with the customer: ${authUrl}. Their stock is reserved for 30 minutes.`
        };
    } catch (err) {
        console.error("[PAYMENT] executePaymentLink failed:", err?.response?.data || err.message || err);
        return { error: `Payment link generation failed: ${err?.response?.data?.message || err.message}. Please try again or contact support.` };
    }
}

export const agentWorkflow = inngest.createFunction(
    {
        id: "ai-agent-flow",
        concurrency: [
            { limit: 5 },                                    // Global max concurrent runs
            { limit: 1, key: "event.data.user_id" }         // Only 1 run at a time per user (prevents duplicate replies)
        ],
    },
    { event: "chat/message.received" },

    async ({ event, step }) => {
        const { business_id, user_id, user_name } = event.data;

        try {

            // 1. BUFFERING: Wait 5s to allow rapid messages to settle
            await step.sleep("5s");

            // 2. LOAD CONTEXT
            const context = await step.run("load-context", async () => {
                // A. Fetch Menu
                const { data: menu } = await supabase
                    .from('menu_items')
                    .select('name, price, category, description')
                    .eq('client_id', business_id);

                // B. System Prompt
                const { data: promptSetting } = await supabase
                    .from('platform_settings')
                    .select('value')
                    .eq('key', 'universal_agent_prompt')
                    .maybeSingle();

                const activeSystemPrompt = promptSetting?.value;
                if (!activeSystemPrompt) {
                    throw new Error('Agent prompt not configured. Please set universal_agent_prompt in platform_settings.');
                }

                // C. Client info (includes WhatsApp credentials, hours, pickup setting)
                const { data: clientInfo } = await supabase
                    .from('clients')
                    .select('status, is_open, open_time, close_time, agent_name, business_name, offers_pickup, team_contact, whatsapp_phone_number_id, whatsapp_access_token, open_days')
                    .eq('id', business_id)
                    .single();

                // D. Delivery Fees
                const { data: deliveryFees } = await supabase
                    .from('delivery_fees')
                    .select('location, fee')
                    .eq('client_id', business_id);

                // E. Get or Create Session & Fetch History
                let sessionId;
                const { data: existingSession } = await supabase
                    .from('chat_sessions')
                    .select('id')
                    .match({ client_id: business_id, whatsapp_user_id: user_id })
                    .single();

                if (existingSession) {
                    sessionId = existingSession.id;
                } else {
                    const { data: newSession } = await supabase
                        .from('chat_sessions')
                        .insert({
                            client_id: business_id,
                            whatsapp_user_id: user_id,
                            user_name: user_name
                        })
                        .select('id')
                        .single();
                    sessionId = newSession.id;
                }

                // Fetch last 30 messages
                const { data: history } = await supabase
                    .from('chat_messages')
                    .select('role, content')
                    .eq('session_id', sessionId)
                    .order('created_at', { ascending: false })
                    .limit(30);

                return {
                    sessionId,
                    menu: menu || [],
                    systemPrompt: activeSystemPrompt,
                    history: history ? history.reverse() : [],
                    status: clientInfo?.status || 'Active',
                    isOpen: clientInfo?.is_open !== false,
                    openTime: clientInfo?.open_time || null,
                    closeTime: clientInfo?.close_time || null,
                    openDays: clientInfo?.open_days || ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
                    agentName: clientInfo?.agent_name || 'Agent',
                    businessName: clientInfo?.business_name || 'Our Store',
                    offersPickup: clientInfo?.offers_pickup || false,
                    deliveryFees: deliveryFees || [],
                    teamContact: clientInfo?.team_contact || '',
                    phoneNumberId: clientInfo?.whatsapp_phone_number_id || null,
                    accessToken: clientInfo?.whatsapp_access_token || null
                };
            });

            // CHECK 1: If business is INACTIVE, silently stop
            if (context.status?.toLowerCase() === 'inactive') {
                console.log(`[AGENT] Business ${business_id} is INACTIVE. Skipping.`);
                return { success: false, reason: 'business_inactive' };
            }

            // CHECK 2: If store is CLOSED, send automated message
            if (!context.isOpen) {
                const openTimeStr = context.openTime
                    ? context.openTime.substring(0, 5)
                    : 'our usual opening time';
                const closeTimeStr = context.closeTime
                    ? context.closeTime.substring(0, 5)
                    : '';
                const hoursStr = closeTimeStr ? `${openTimeStr} - ${closeTimeStr}` : openTimeStr;

                // Check if store is closed because today is not an open day
                const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const currentWATTime = new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' });
                const currentWATDate = new Date(currentWATTime);
                const currentDay = daysOfWeek[currentWATDate.getDay()];

                let closedMsg = '';
                const isClosedDueToDay = context.openDays && !context.openDays.includes(currentDay);

                if (isClosedDueToDay) {
                    // Find next open day
                    let nextOpenDay = null;
                    for (let i = 1; i <= 7; i++) {
                        const nextDate = new Date(currentWATDate);
                        nextDate.setDate(nextDate.getDate() + i);
                        const nextDay = daysOfWeek[nextDate.getDay()];
                        if (context.openDays.includes(nextDay)) {
                            nextOpenDay = nextDay;
                            break;
                        }
                    }

                    closedMsg = `Hey there! We're not open today, but we'll be back on ${nextOpenDay} at ${openTimeStr}.\n\nFeel free to reach out then and we'd be happy to help you place your order!`;
                } else {
                    closedMsg = `Hey there! We're currently closed and not accepting orders right now.\n\nWe'll be open by ${hoursStr}. Feel free to message us then and we'll be happy to help you place your order!`;
                }

                await step.run("send-closed-reply", async () => {
                    await supabase.from('chat_messages').insert({ session_id: context.sessionId, role: 'user', content: event.data.message });
                    await supabase.from('chat_messages').insert({ session_id: context.sessionId, role: 'assistant', content: closedMsg });

                    // Mark session as not eligible for follow-up (this is a system message, not a conversation)
                    await supabase.from('chat_sessions').update({
                        last_user_message_at: new Date().toISOString(),
                        last_assistant_message_at: new Date().toISOString(),
                        follow_up_sent: false,
                        follow_up_eligible: false
                    }).eq('id', context.sessionId);

                    if (context.phoneNumberId && context.accessToken) {
                        if (event.data.platform !== 'simulation') {
                            await axios.post(`https://graph.facebook.com/v19.0/${context.phoneNumberId}/messages`, {
                                messaging_product: "whatsapp",
                                to: user_id,
                                type: "text",
                                text: { body: closedMsg }
                            }, {
                                headers: { 'Authorization': `Bearer ${context.accessToken}`, 'Content-Type': 'application/json' }
                            });
                        } else {
                            console.log('[SIMULATION] Store closed message saved, bypassing WhatsApp.');
                        }
                    }
                });

                return { success: true, reply: closedMsg };
            }

            // 3. GENERATE AI RESPONSE
            const aiResponse = await step.run("generate-reply", async () => {
                try {
                    const menuContext = JSON.stringify(context.menu);

                    // Current time in WAT (West Africa Time, UTC+1)
                    const now = new Date();
                    const watTime = now.toLocaleString('en-NG', {
                        timeZone: 'Africa/Lagos',
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    });

                    // Build system prompt with placeholder replacement
                    let systemPrompt = context.systemPrompt
                        .replace(/{{AGENT_NAME}}/g, context.agentName)
                        .replace(/{{BUSINESS_NAME}}/g, context.businessName)
                        .replace('{{MENU}}', menuContext)
                        .replace('{{CURRENT_TIME}}', watTime);

                    // Append ONLY facts/data blocks. The INSTRUCTIONS must come from Supabase platform_settings.
                    systemPrompt += `\n\n--- BUSINESS FACTS (DO NOT CONTRADICT) ---`;
                    systemPrompt += `\nAgent Name: ${context.agentName}`;
                    systemPrompt += `\nBusiness Name: ${context.businessName}`;
                    systemPrompt += `\nCurrent Time (WAT): ${watTime}`;
                    systemPrompt += `\nStore Status: ${context.isOpen ? 'OPEN' : 'CLOSED'}`;
                    systemPrompt += `\nOpen Days: ${context.openDays ? context.openDays.join(', ') : 'Every day'}`;
                    systemPrompt += `\nOffers Pickup: ${context.offersPickup ? 'YES' : 'NO'}`;
                    systemPrompt += `\nTeam/Escalation Contact: ${context.teamContact}`;

                    systemPrompt += `\n\n--- DELIVERY CONFIGURATION ---`;
                    systemPrompt += `\nZones & Fees: ${JSON.stringify(context.deliveryFees)}`;

                    systemPrompt += `\n\n--- MENU & STOCK ---`;
                    systemPrompt += `\n${menuContext}`;

                    systemPrompt += `\n\n--- TOOLS AVAILABLE ---`;
                    systemPrompt += `\n1. generate_payment_link: Call this to create a checkout link. Requires name, phone, email, address, and items.`;
                    systemPrompt += `\n2. check_order_status: Call this to check an existing order status using an Order ID (AX-XXXXXX).`;

                    // Build messages array
                    const messages = [{ role: 'system', content: systemPrompt }];

                    if (context.history && context.history.length > 0) {
                        for (const msg of context.history) {
                            messages.push({
                                role: msg.role === 'assistant' ? 'assistant' : 'user',
                                content: msg.content
                            });
                        }
                    }

                    messages.push({ role: 'user', content: event.data.message });

                    // Tool executor
                    const toolExecutor = async (fnName, fnArgs) => {
                        if (fnName === 'generate_payment_link') {
                            // Server-side validation — reject missing or fake contact info
                            const isValid = (v) => v && v !== 'None' && v !== 'null' && v !== 'N/A' && String(v).trim().length > 1;

                            if (!isValid(fnArgs.customer_name)) {
                                return { error: 'STOP. Do not call this tool again. Tell the customer: "I need your full name, phone number, and email address."' };
                            }
                            if (!isValid(fnArgs.customer_phone)) {
                                return { error: 'STOP. Do not call this tool again. Tell the customer: "I need your full name, phone number, and email address."' };
                            }
                            if (!isValid(fnArgs.customer_email) || !String(fnArgs.customer_email).includes('@')) {
                                return { error: 'STOP. Do not call this tool again. Tell the customer: "I need your full name, phone number, and email address."' };
                            }

                            if (!fnArgs.items || !Array.isArray(fnArgs.items) || fnArgs.items.length === 0) {
                                return { error: 'STOP. No items in the order. Ask the customer what they want to order first.' };
                            }

                            return await executePaymentLink(fnArgs, business_id, user_id);
                        }
                        
                        if (fnName === 'check_order_status') {
                            const { data, error } = await supabase
                                .from('orders')
                                .select('status, delivery_address, items_summary, total_amount')
                                .eq('order_id', fnArgs.order_id)
                                .eq('client_id', business_id)
                                .maybeSingle();

                            if (error || !data) {
                                return { error: `I couldn't find an order with ID ${fnArgs.order_id}. Please double-check the number.` };
                            }

                            return {
                                success: true,
                                order_id: fnArgs.order_id,
                                status: data.status,
                                message: `Order #${fnArgs.order_id} is currently: ${data.status}.`
                            };
                        }

                        if (fnName === 'calculate') {
                            const operation = fnArgs.operation?.toLowerCase();
                            const values = fnArgs.values || [];

                            if (!operation || values.length === 0) {
                                return { error: 'Invalid calculator input. Provide operation and values array.' };
                            }

                            let result;
                            switch (operation) {
                                case 'add':
                                    result = values.reduce((sum, val) => sum + val, 0);
                                    break;
                                case 'subtract':
                                    result = values.reduce((diff, val) => diff - val);
                                    break;
                                case 'multiply':
                                    result = values.reduce((prod, val) => prod * val, 1);
                                    break;
                                case 'divide':
                                    if (values.some(v => v === 0)) {
                                        return { error: 'Cannot divide by zero.' };
                                    }
                                    result = values.reduce((quot, val) => quot / val);
                                    break;
                                default:
                                    return { error: `Unknown operation: ${operation}. Use: add, subtract, multiply, divide.` };
                            }

                            return {
                                success: true,
                                operation,
                                values,
                                result: parseFloat(result.toFixed(2))
                            };
                        }

                        if (fnName === 'think') {
                            const reasoning = fnArgs.reasoning || '';
                            console.log(`[AGENT-THINKING] ${reasoning}`);
                            return {
                                success: true,
                                acknowledged: true,
                                message: 'Thinking complete. Proceeding with response.'
                            };
                        }

                        return { error: `Unknown tool: ${fnName}` };
                    };

                    let text = await callLLMWithTools(messages, [PAYMENT_TOOL, CHECK_ORDER_STATUS_TOOL, CALCULATOR_TOOL, THINK_TOOL], toolExecutor);

                    // Strip any <internal_thinking> tags that leak into responses
                    text = text.replace(/<internal_thinking>[\s\S]*?<\/internal_thinking>/gi, '').trim();

                    // Remove duplicate consecutive lines
                    const lines = text.split('\n');
                    const deduped = lines.filter((line, i) => i === 0 || line.trim() !== lines[i - 1].trim());
                    text = deduped.join('\n').trim();

                    return text;
                } catch (error) {
                    console.error('[LLM] Error:', error?.message || error);
                    return 'Something went wrong on my end. Please send your message again.';
                }
            });

            // 4. SAVE & REPLY
            await step.run("save-and-send", async () => {
                // Insert user message first, then assistant — separate inserts ensure correct timestamp ordering
                await supabase.from('chat_messages').insert({ session_id: context.sessionId, role: 'user', content: event.data.message });
                await supabase.from('chat_messages').insert({ session_id: context.sessionId, role: 'assistant', content: aiResponse });

                // Update session timestamps for follow-up tracking
                await supabase.from('chat_sessions').update({
                    last_user_message_at: new Date().toISOString(),
                    last_assistant_message_at: new Date().toISOString(),
                    follow_up_sent: false,
                    follow_up_eligible: true
                }).eq('id', context.sessionId);

                // Send via WhatsApp Cloud API
                if (context.phoneNumberId && context.accessToken) {
                    if (event.data.platform === 'simulation') {
                        console.log(`[SIMULATION] Response saved for user: ${user_id}, bypassing WhatsApp.`);
                    } else {
                        try {
                            console.log(`Sending WhatsApp response to user: ${user_id} via Phone ID: ${context.phoneNumberId}`);
                            await axios.post(`https://graph.facebook.com/v19.0/${context.phoneNumberId}/messages`, {
                                messaging_product: "whatsapp",
                                to: user_id,
                                type: "text",
                                text: { body: aiResponse }
                            }, {
                                headers: {
                                    'Authorization': `Bearer ${context.accessToken}`,
                                    'Content-Type': 'application/json'
                                }
                            });
                            console.log("Sent successfully via WhatsApp!");
                        } catch (err) {
                            const errorDetails = err?.response?.data || err.message;
                            console.error("WhatsApp Send Failed:", errorDetails);
                            throw new Error(`WhatsApp API Error: ${JSON.stringify(errorDetails)}`);
                        }
                    }
                } else {
                    console.log("Simulating WhatsApp send (No Credentials found for client):", aiResponse);
                }
            });

            return { success: true, reply: aiResponse };

        } catch (workflowError) {
            console.error('[AGENT WORKFLOW ERROR]', workflowError?.message || workflowError);

            const errorMsg = `[DEBUG] Agent Error:\n\n${workflowError?.message || String(workflowError)}\n\nStep: ${workflowError?.stack?.split('\n')?.[1]?.trim() || 'unknown'}`;

            try {
                if (context?.phoneNumberId && context?.accessToken && event.data.platform !== 'simulation') {
                    await axios.post(`https://graph.facebook.com/v19.0/${context.phoneNumberId}/messages`, {
                        messaging_product: "whatsapp",
                        to: user_id,
                        type: "text",
                        text: { body: errorMsg }
                    }, {
                        headers: {
                            'Authorization': `Bearer ${context.accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    console.log('[DEBUG] Error message sent to WhatsApp');
                }
            } catch (sendErr) {
                console.error('[DEBUG] Failed to send error to WhatsApp:', sendErr.message);
            }

            return { success: false, error: workflowError.message };
        }
    }
);
