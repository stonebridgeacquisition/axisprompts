import { inngest } from "../client.js";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

// Initialize Supabase (Use Service Key for backend operations)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);


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
                customer_name: { type: "string", description: "The customer's full name." },
                customer_phone: { type: "string", description: "The customer's phone number." },
                customer_email: { type: "string", description: "The customer's email address." },
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

// OpenRouter prioritized models — will try in order if one fails
const PRIORITIZED_MODELS = [
    'google/gemini-3-flash-preview',
    'openai/gpt-5-nano',
    'google/lyria-3-pro-preview'
];

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
            // Continue loop to try next model
        }
    }

    // If we're here, all models failed
    throw new Error(`All fallback models failed. Last error: ${lastError?.message}`);
}

/**
 * Execute a payment link generation via Paystack.
 * Called by the tool executor when the AI calls generate_payment_link.
 */
async function executePaymentLink(args, business_id, user_id) {
    try {
        const amount = Math.round(Number(args.amount));
        if (!amount || amount <= 0) {
            return { error: `Invalid amount: ${args.amount}. Please confirm the total.` };
        }

        const customerEmail = args.customer_email || `${user_id}@customer.swiftorderai.com`;
        console.log(`[PAYMENT] Executing payment link | ₦${amount} | ${args.customer_name} | ${customerEmail}`);

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
        concurrency: 5, // Match Inngest plan limit
    },
    { event: "chat/message.received" },

    async ({ event, step }) => {
        const { business_id, user_id, user_name } = event.data;

        try {

            // 1. BUFFERING: Wait 5s (reduced for testing)
            await step.sleep("5s");

            // 2. LOAD CONTEXT (The "Brain")
            const context = await step.run("load-context", async () => {
                // A. Fetch Menu
                const { data: menu } = await supabase
                    .from('menu_items')
                    .select('name, price, category, description')
                    .eq('client_id', business_id);

                // B. System Prompt — fetch from dynamic admin settings
                const { data: promptSetting } = await supabase
                    .from('platform_settings')
                    .select('value')
                    .eq('key', 'universal_agent_prompt')
                    .maybeSingle();

                const activeSystemPrompt = promptSetting?.value;
                if (!activeSystemPrompt) {
                    console.error('[AGENT] No universal_agent_prompt found in platform_settings!');
                    throw new Error('Agent prompt not configured. Please set universal_agent_prompt in platform_settings.');
                }

                // B2. Fetch Store Availability and details
                const { data: clientInfo } = await supabase
                    .from('clients')
                    .select('status, is_open, open_time, close_time, agent_name, business_name, offers_pickup, team_contact, whatsapp_phone_number_id, whatsapp_access_token')
                    .eq('id', business_id)
                    .single();

                // B3. Fetch Delivery Fees
                const { data: deliveryFees } = await supabase
                    .from('delivery_fees')
                    .select('location, fee')
                    .eq('client_id', business_id);

                // C. Get or Create Session & Fetch History
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
                            whatsapp_user_id: user_id, // user_id is now the WhatsApp phone number
                            user_name: user_name
                        })
                        .select('id')
                        .single();
                    sessionId = newSession.id;
                }

                // Fetch last 10 messages
                const { data: history } = await supabase
                    .from('chat_messages')
                    .select('role, content')
                    .eq('session_id', sessionId)
                    .order('created_at', { ascending: false })
                    .limit(10);

                return {
                    sessionId,
                    menu: menu || [],
                    systemPrompt: activeSystemPrompt,
                    history: history ? history.reverse() : [],
                    status: clientInfo?.status || 'active',
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

            // CHECK 1: If business is INACTIVE, silently stop — no response at all
            if (context.status?.toLowerCase() === 'inactive') {
                console.log(`[AGENT] Business ${business_id} is INACTIVE. Skipping.`);
                return { success: false, reason: 'business_inactive' };
            }

            // CHECK 2: If store is CLOSED (is_open = false), send automated message with open_time
            if (!context.isOpen) {
                const openTimeStr = context.openTime
                    ? context.openTime.substring(0, 5) // "09:00:00" -> "09:00"
                    : 'our usual opening time';
                const closeTimeStr = context.closeTime
                    ? context.closeTime.substring(0, 5)
                    : '';
                const hoursStr = closeTimeStr ? `${openTimeStr} - ${closeTimeStr}` : openTimeStr;

                const closedMsg = `Hey there! We're currently closed and not accepting orders right now.\n\nWe'll be open by ${hoursStr}. Feel free to message us then and we'll be happy to help you place your order!`;

                await step.run("send-closed-reply", async () => {
                    // Save to chat history
                    await supabase.from('chat_messages').insert([
                        { session_id: context.sessionId, role: 'user', content: event.data.message },
                        { session_id: context.sessionId, role: 'assistant', content: closedMsg }
                    ]);

                    // Send via WhatsApp
                    if (context.phoneNumberId && context.accessToken) {
                        if (event.data.platform === 'simulation') {
                            console.log('[SIMULATION] Store closed message saved, bypassing WhatsApp.');
                        } else {
                            await axios.post(`https://graph.facebook.com/v19.0/${context.phoneNumberId}/messages`, {
                                messaging_product: "whatsapp",
                                to: user_id,
                                type: "text",
                                text: { body: closedMsg }
                            }, {
                                headers: {
                                    'Authorization': `Bearer ${context.accessToken}`,
                                    'Content-Type': 'application/json'
                                }
                            });
                            console.log('[AGENT] Sent closed message via WhatsApp.');
                        }
                    }
                });

                return { success: true, reply: closedMsg };
            }

            // 3. GENERATE AI RESPONSE

            const aiResponse = await step.run("generate-reply", async () => {
                try {
                    // Construct the prompt context
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

                    // Build system prompt
                    let systemPrompt = context.systemPrompt
                        .replace(/{{AGENT_NAME}}/g, context.agentName)
                        .replace(/{{BUSINESS_NAME}}/g, context.businessName)
                        .replace('{{MENU}}', menuContext)
                        .replace('{{CHAT_HISTORY}}', '')
                        .replace('{{BRAND_INFO}}', '(Delivery available via Paystack)')
                        .replace('{{CURRENT_TIME}}', watTime)
                        .replace('{{OPENING_HOURS}}', context.openTime && context.closeTime ? `${context.openTime} - ${context.closeTime}` : 'Not specified');

                    // Add store/delivery/business context
                    systemPrompt += `\n\n--- STORE AVAILABILITY ---`;
                    systemPrompt += `\nCurrent Time: ${watTime}`;
                    systemPrompt += `\nOpening Hours: ${context.openTime || '?'} - ${context.closeTime || '?'}`;
                    systemPrompt += `\nStore Status: OPEN`;
                    systemPrompt += `\n\nRULE: If the current time appears to be outside the Opening Hours, politely tell the customer you are not accepting orders right now and mention the opening hours. Do NOT process any orders or generate payment links outside opening hours.`;

                    systemPrompt += `\n\n--- DELIVERY CONFIGURATION ---`;
                    systemPrompt += `\nOffers Pickup: ${context.offersPickup ? 'YES' : 'NO'}`;
                    systemPrompt += `\nDelivery Zones & Fees: ${JSON.stringify(context.deliveryFees)}`;
                    systemPrompt += `\nTeam Escalation Contact: ${context.teamContact}`;
                    systemPrompt += `\nORDER RULE 1: IN YOUR VERY FIRST MESSAGE, ask the user if they want Delivery or Pickup (only if Offers Pickup is YES). Do not ask what they want to order until fulfillment is settled.`;
                    systemPrompt += `\nORDER RULE 2: If Delivery, ask for their exact delivery area. It MUST match one of the Delivery Zones above. If it does NOT match, do NOT proceed.`;
                    systemPrompt += `\nORDER RULE 3: For Delivery, correctly add the matched Delivery Fee to the total invoice amount.`;
                    systemPrompt += `\nORDER RULE 4: For Pickup, at the final invoice step add: "Since you're picking up, please CALL our team at ${context.teamContact} when you or your rider is here to collect it, and provide your Order ID. Do NOT send a WhatsApp message for this."`;
                    systemPrompt += `\nORDER RULE 5: For Delivery, at the final invoice step add: "Our rider will call you when they are out for delivery and you will receive a message."`;
                    systemPrompt += `\nORDER RULE 6: For complaints, refunds, or special requests, give the Team Escalation Contact.`;

                    systemPrompt += `\n\n--- BUSINESS CONTEXT ---`;
                    systemPrompt += `\nAgent Name: ${context.agentName}`;
                    systemPrompt += `\nBusiness Name: ${context.businessName}`;
                    systemPrompt += `\nMenu: ${menuContext}`;

                    systemPrompt += `\n\n--- PAYMENT TOOL ---`;
                    systemPrompt += `\nYou have a tool called generate_payment_link. When the customer confirms their order and you have their name, phone, email, and all items, call this tool to generate their payment link. The tool will return a payment URL that you should share with the customer.`;
                    systemPrompt += `\nIMPORTANT: Before calling the tool, make sure you have collected ALL required info (name, phone, email, delivery address). If anything is missing, ask for it first.`;

                    // Build the messages array with conversation history
                    const messages = [
                        { role: 'system', content: systemPrompt }
                    ];

                    // Add conversation history as proper role-based messages
                    if (context.history && context.history.length > 0) {
                        for (const msg of context.history) {
                            messages.push({
                                role: msg.role === 'assistant' ? 'assistant' : 'user',
                                content: msg.content
                            });
                        }
                    }

                    // Add the current user message
                    messages.push({ role: 'user', content: event.data.message });

                    // Tool executor — handles generate_payment_link calls from the model
                    const toolExecutor = async (fnName, fnArgs) => {
                        if (fnName === 'generate_payment_link') {
                            return await executePaymentLink(fnArgs, business_id, user_id);
                        }
                        return { error: `Unknown tool: ${fnName}` };
                    };

                    // Call the LLM with tools
                    const text = await callLLMWithTools(messages, [PAYMENT_TOOL], toolExecutor);
                    return text;
                } catch (error) {
                    console.error('[LLM] Error:', error?.message || error);
                    return 'I apologize, I am having trouble thinking right now. Please try again.';
                }
            });

            // 4. SAVE & REPLY
            await step.run("save-and-send", async () => {
                // A. Insert Messages (User + AI)
                await supabase.from('chat_messages').insert([
                    { session_id: context.sessionId, role: 'user', content: event.data.message },
                    { session_id: context.sessionId, role: 'assistant', content: aiResponse }
                ]);

                // B. Send via WhatsApp Cloud API
                const { data: clientSettings } = await supabase
                    .from('clients')
                    .select('whatsapp_phone_number_id, whatsapp_access_token')
                    .eq('id', business_id)
                    .single();

                const phoneNumberId = clientSettings?.whatsapp_phone_number_id;
                const accessToken = clientSettings?.whatsapp_access_token;

                if (phoneNumberId && accessToken) {
                    if (event.data.platform === 'simulation') {
                        console.log(`[SIMULATION] Response saved for user: ${user_id}, bypassing WhatsApp.`);
                    } else {
                        try {
                            console.log(`Sending WhatsApp response to user: ${user_id} via Phone ID: ${phoneNumberId}`);
                            await axios.post(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
                                messaging_product: "whatsapp",
                                to: user_id, // User's phone number
                                type: "text",
                                text: { body: aiResponse }
                            }, {
                                headers: {
                                    'Authorization': `Bearer ${accessToken}`,
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
            // DEBUG MODE: Send the error directly to WhatsApp so we can see it
            console.error('[AGENT WORKFLOW ERROR]', workflowError?.message || workflowError);

            const errorMsg = `[DEBUG] Agent Error:\n\n${workflowError?.message || String(workflowError)}\n\nStep: ${workflowError?.stack?.split('\n')?.[1]?.trim() || 'unknown'}`;

            try {
                const { data: clientSettings } = await supabase
                    .from('clients')
                    .select('whatsapp_phone_number_id, whatsapp_access_token')
                    .eq('id', business_id)
                    .single();

                const phoneNumberId = clientSettings?.whatsapp_phone_number_id;
                const accessToken = clientSettings?.whatsapp_access_token;

                if (phoneNumberId && accessToken && event.data.platform !== 'simulation') {
                    await axios.post(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
                        messaging_product: "whatsapp",
                        to: user_id,
                        type: "text",
                        text: { body: errorMsg }
                    }, {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
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
