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

                    // Reject unknown tool calls — only generate_payment_link exists
                    if (fnName !== 'generate_payment_link') {
                        console.warn(`[TOOL] Model called unknown tool "${fnName}" - rejecting`);
                        updatedMessages.push({
                            role: "tool",
                            tool_call_id: toolCall.id,
                            content: JSON.stringify({ error: `Tool "${fnName}" does not exist. You only have generate_payment_link. Write your response as plain text.` })
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

                // Send results back to the model for the final response
                const followUpRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: modelId,
                        messages: updatedMessages,
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
                    .select('status, is_open, open_time, close_time, agent_name, business_name, offers_pickup, team_contact, whatsapp_phone_number_id, whatsapp_access_token')
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

                // Fetch last 15 messages
                const { data: history } = await supabase
                    .from('chat_messages')
                    .select('role, content')
                    .eq('session_id', sessionId)
                    .order('created_at', { ascending: false })
                    .limit(15);

                return {
                    sessionId,
                    menu: menu || [],
                    systemPrompt: activeSystemPrompt,
                    history: history ? history.reverse() : [],
                    status: clientInfo?.status || 'Active',
                    isOpen: clientInfo?.is_open !== false,
                    openTime: clientInfo?.open_time || null,
                    closeTime: clientInfo?.close_time || null,
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

                const closedMsg = `Hey there! We're currently closed and not accepting orders right now.\n\nWe'll be open by ${hoursStr}. Feel free to message us then and we'll be happy to help you place your order!`;

                await step.run("send-closed-reply", async () => {
                    await supabase.from('chat_messages').insert({ session_id: context.sessionId, role: 'user', content: event.data.message });
                    await supabase.from('chat_messages').insert({ session_id: context.sessionId, role: 'assistant', content: closedMsg });

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
                        .replace('{{CHAT_HISTORY}}', '')
                        .replace('{{BRAND_INFO}}', '(Delivery available via Paystack)')
                        .replace('{{CURRENT_TIME}}', watTime)
                        .replace('{{OPENING_HOURS}}', context.openTime ? `${context.openTime} - ${context.closeTime}` : 'Not specified');

                    // Append data sections
                    systemPrompt += `\n\n--- STORE AVAILABILITY ---`;
                    systemPrompt += `\nCurrent Time: ${watTime}`;
                    systemPrompt += `\nStore Status: OPEN`;
                    systemPrompt += `\nNOTE: Store status is determined by management. If this says OPEN, the store is open. Do NOT tell the customer it is closed.`;

                    systemPrompt += `\n\n--- DELIVERY CONFIGURATION ---`;
                    systemPrompt += `\nOffers Pickup: ${context.offersPickup ? 'YES' : 'NO'}`;
                    systemPrompt += `\nDelivery Zones & Fees: ${JSON.stringify(context.deliveryFees)}`;
                    systemPrompt += `\nTeam Escalation Contact: ${context.teamContact}`;
                    systemPrompt += `\nORDER RULE 1: In your first message, ask the user if they want Delivery or Pickup (only if Offers Pickup is YES). If NO, skip straight to taking the order.`;
                    systemPrompt += `\nORDER RULE 2: If Delivery, ask for their area. It MUST match one of the Delivery Zones. If no match, say you don't deliver there and give the team contact.`;
                    systemPrompt += `\nORDER RULE 3: For Delivery, add the matched Delivery Fee to the total.`;
                    systemPrompt += `\nORDER RULE 4: For Pickup, at the final step add: "Since you're picking up, please CALL our team at ${context.teamContact} when you or your rider arrives to collect, and give your Order ID."`;
                    systemPrompt += `\nORDER RULE 5: For Delivery, at the final step add: "Our rider will call you when they're out for delivery."`;
                    systemPrompt += `\nORDER RULE 6: For complaints, refunds, or special requests, give the Team Escalation Contact.`;

                    systemPrompt += `\n\n--- BUSINESS CONTEXT ---`;
                    systemPrompt += `\nAgent Name: ${context.agentName}`;
                    systemPrompt += `\nBusiness Name: ${context.businessName}`;
                    systemPrompt += `\nMenu: ${menuContext}`;

                    systemPrompt += `\n\n--- PAYMENT TOOL ---`;
                    systemPrompt += `\nYou have exactly ONE tool: generate_payment_link. Do NOT call any other function. If you want to say something, write plain text.`;
                    systemPrompt += `\nCall generate_payment_link ONLY when: (1) customer confirmed the order, AND (2) you have their name, phone, email, and all items.`;

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
                        return { error: `Unknown tool: ${fnName}` };
                    };

                    let text = await callLLMWithTools(messages, [PAYMENT_TOOL], toolExecutor);

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
