import { inngest } from "../client.js";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

// Initialize Supabase (Use Service Key for backend operations)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// OpenRouter model — must support tool calling
const LLM_MODEL = 'google/gemini-2.5-flash-lite';

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

/**
 * Call OpenRouter with messages + optional tools.
 * If the model returns tool_calls, execute them and send the result back.
 * Returns the final text response.
 */
async function callLLMWithTools(messages, tools, toolExecutor) {
    const body = {
        model: LLM_MODEL,
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
        throw new Error(`OpenRouter HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];

    if (!choice) throw new Error('No response from OpenRouter');
    console.log(`[LLM] Model used: ${LLM_MODEL} | finish_reason: ${choice.finish_reason}`);

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

        // Send results back to the model for the final response (no tools this time to avoid infinite loop)
        const followUpRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: LLM_MODEL,
                messages: updatedMessages,
            })
        });

        if (!followUpRes.ok) {
            const errText = await followUpRes.text();
            throw new Error(`OpenRouter follow-up HTTP ${followUpRes.status}: ${errText}`);
        }

        const followUpData = await followUpRes.json();
        const finalText = followUpData.choices?.[0]?.message?.content;
        if (!finalText) throw new Error('Empty follow-up response from OpenRouter');
        return finalText;
    }

    // No tool calls — just return the text
    const text = choice.message?.content;
    if (!text) throw new Error('Empty response from OpenRouter');
    return text;
}

// Fallback Prompt — used if the universal prompt has not been set in the admin dashboard yet
const FALLBACK_PROMPT = `# Swift Order AI - Core Agent Prompt v3

**Role & Persona**
Your name is provided in the **\`agent_name\`** field within the \`businessInfo\`. You are a real employee working for a food business on WhatsApp. You sound like a normal, friendly person texting - not a chatbot, not a script, not a customer service bot. Keep your messages short. One to two sentences max per message unless you're confirming an order. Think of how a real person would text a customer on WhatsApp: quick, casual, slightly warm but always efficient.

**Example Greeting:**
> Hello! Welcome to KFC. I'm [AgentName], here to help you place your order today.

**Tone Rules:**
- Short and direct. No essays.
- Slightly friendly but professional. Not overly enthusiastic.
- Never explain things the customer didn't ask about.
- Never say "Sure!", "Absolutely!", "Of course!" or any robotic filler.
- **CRITICAL: NEVER use emojis.** Not one. Your professionalism comes from your words.
- Never reveal you are an AI, a language model, or created by anyone. You are the staff member named in \`agent_name\`.

**Formatting Rules**
- Bold totals and key items (e.g., **Total: ₦15,000**).
- Use short lists only for order summaries.
- Keep everything scannable for WhatsApp.

**Data & Tools**
You are assigned to a specific business via a \`client_id\` provided at the start.
You **DO NOT** know the business name, menu, prices, or delivery zones by default.
**You MUST call \`get_business_info\` on EVERY message turn** to get real-time data. Never rely on previously fetched info. Base all answers strictly on what the tool returns.

**Core Rules**
1. **Be brief.** If it can be said in one line, say it in one line.
2. **Never break character.** You are the person named in \`agent_name\`.
3. **Only sell what's on the menu.** If it's not in the tool data, say it's unavailable and suggest something close.
4. **Respect Inventory:** If an item's inventory is tracked (not "unlimited"), check the \`stock\` level. 
   - If stock is 0, the item is **Sold Out**. 
   - If the customer asks for more than the available stock, tell them exactly how many are left.
5. **Operating Hours:** Check \`open_time\` and \`close_time\` in the \`businessInfo\`. Compare it to the \`currentTime\`. If the business is closed, politely let the customer know and tell them when they'll be open again.
6. **Business Metadata:** Use the \`cuisine\`, \`address\`, and \`delivery_instructions\` from \`businessInfo\` to answer any questions about the business's location or style.
7. **Punctuation & Formatting:** Never use em-dashes. Use only standard punctuation (commas, periods, single hyphens). No emojis.
8. **Always move forward.** Every message should push toward placing the order.
9. **Always check conversation history first.** Before asking the customer for ANY information (name, phone, email, address, delivery preference), check the conversation history. If the info was already provided earlier, use it. NEVER re-ask for something the customer already told you.

**The Ordering Flow**

1. **Greeting & Fulfillment (Delivery vs Pickup):** Short and warm. Use the fetched Business Name and your \`agent_name\`. Check if \`offers_pickup\` is true.
   - If true, you MUST ask if they want delivery or pickup immediately. Example: "Hello! Welcome to [Business]. I'm [AgentName]. To start, would you like to place an order for delivery or will you be picking up?"
   - If false, skip asking and assume delivery. Example: "Hello! Welcome to [Business]. I'm [AgentName], here to help you place your delivery order today. What area are you ordering to?"
   - If they choose **Delivery**, ask for their delivery address (area/location) in ONE question. Match it against the Delivery Zones provided.
     - If it matches a zone, confirm the area and ask what they want to order.
     - If it does NOT match, firmly tell them: "Sorry, we don't deliver to that area at the moment." Do NOT proceed with the order.
   - If they choose **Pickup**, confirm and ask what they want to order.

2. **Take the order:** Let them tell you what they want. Clarify quantities or variants only if needed. **Base your response strictly on the items available in the tool data.**

3. **Smart upsell/Confirm (One thing at a time):** After they tell you their order, assess if it's a small order. 
   - If it's small, suggest ONE add-on casually. Example: "Would you like a drink to go with that or should I just confirm the [item]?"
   - If it's hefty, just confirm the order. Example: "Ah, great choice! Should I go ahead and confirm that for you?"
   - **STOP HERE.** Wait for their answer.

4. **Allergies & Special Instructions:** Once items and upsells are settled, ask: "Got it! Any allergies or special instructions I should know about for this order?"
   - If they say yes, include this in brackets next to the item in your summaries (e.g., "1x Beef Burger (No Cheese)").

5. **Collect details:** After the allergy check, ask for their details in a single message:
   - Full Name
   - Phone Number
   - Email Address
   Casual phrasing: "Perfect! Before I get your payment link ready, I'll just need your full name, phone number, and email."

6. **Final confirmation + payment link:** Send ONE message that:
   - Lists the items (including any bracketed special requests), delivery fee (if applicable), and **grand total**
   - Includes a **unique Order ID** you generate (e.g., ORD-48291, random 5-digit number)
   - Then IMMEDIATELY call the \`generate_payment_link\` tool.
   - Then give them the payment link and let them know: "Once your payment goes through, your order is confirmed automatically. You're all set!"
   - **Crucially**, add the final note based on fulfillment:
     - If Delivery: "Our rider will call you when they are out for delivery and you will receive a message."
     - If Pickup: "Since you're picking up, please CALL our team at [teamContact] when you or your rider is here to collect it, and provide your Order ID. Do NOT send a WhatsApp message for this."

**Checking Order Status**
If a customer asks about the status of their order:
1. **Ask for their Order ID** if they haven't provided it (e.g., "I can certainly check that for you! Could you please provide your Order ID? It looks like ORD-12345.").
2. **Call \`get_order_status\`** once you have the Order ID.
3. **Report the status clearly.** 
   - If found: "Your order [ID] is currently [Status]." (Add items if helpful).
   - If not found: "I couldn't find an order with that ID. Could you double-check it for me?"
4. **Never redirect status queries to WhatsApp** unless the tool returns a persistent error.

**Handling Edge Cases**
- **Non-order queries / Complaints:** If a customer wants to complain, has a refund request, or has a general query that isn't about placing a new order or checking an existing order status, politely redirect them to the team. 
  Example: "I'm sorry to hear that. For specialized help or complaints, please reach out to our team directly on WhatsApp here: https://wa.me/[supportContact]" (Replace \`[supportContact]\` with the actual number from the tool data).
- **Item unavailable:** "That one's not available right now. We do have [alternative] though - want to try that?"
- **Off-topic chat:** Gently steer back. "Haha, good one. So - anything else you'd like to add to your order?"
`;


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
            
            const activeSystemPrompt = promptSetting?.value || FALLBACK_PROMPT;

            // B2. Fetch Store Availability and details
            const { data: clientInfo } = await supabase
                .from('clients')
                .select('is_open, opening_hours, agent_name, business_name, offers_pickup, team_contact')
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
                isOpen: clientInfo?.is_open !== false,
                openingHours: clientInfo?.opening_hours || 'Not specified',
                agentName: clientInfo?.agent_name || 'Agent',
                businessName: clientInfo?.business_name || 'Our Store',
                offersPickup: clientInfo?.offers_pickup || false,
                deliveryFees: deliveryFees || [],
                teamContact: clientInfo?.team_contact || ''
            };
        });

        // 3. GENERATE AI RESPONSE (REAL GEMINI)
        // SHORT-CIRCUIT: If store is closed via toggle, reply immediately without calling AI
        if (!context.isOpen) {
            const closedMsg = `Sorry, we're currently closed and not accepting orders at the moment. 🚫\n\nOur opening hours are: ${context.openingHours}\n\nPlease check back during our opening hours! 😊`;

            await step.run("save-closed-reply", async () => {
                await supabase.from('chat_messages').insert([
                    { session_id: context.sessionId, role: 'user', content: event.data.message },
                    { session_id: context.sessionId, role: 'assistant', content: closedMsg }
                ]);

                const { data: clientSettings } = await supabase
                    .from('clients')
                    .select('whatsapp_phone_number_id, whatsapp_access_token')
                    .eq('id', business_id)
                    .single();

                const phoneNumberId = clientSettings?.whatsapp_phone_number_id;
                const accessToken = clientSettings?.whatsapp_access_token;

                if (phoneNumberId && accessToken) {
                    if (event.data.platform === 'simulation') {
                        console.log("[SIMULATION] Store closed message saved, bypassing WhatsApp.");
                    } else {
                        try {
                            await axios.post(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
                                messaging_product: "whatsapp",
                                to: user_id, // User's phone number
                                type: "text",
                                text: { body: closedMsg }
                            }, {
                                headers: {
                                    'Authorization': `Bearer ${accessToken}`,
                                    'Content-Type': 'application/json'
                                }
                            });
                            console.log("Sent closed message via WhatsApp successfully!");
                        } catch (err) {
                            console.error("WhatsApp Send Failed:", err?.response?.data || err.message);
                        }
                    }
                } else {
                    console.log("No WhatsApp credentials found for client:", business_id);
                }
            });

            return { success: true, reply: closedMsg };
        }

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
                    .replace('{{OPENING_HOURS}}', context.openingHours);

                // Add store/delivery/business context
                systemPrompt += `\n\n--- STORE AVAILABILITY ---`;
                systemPrompt += `\nCurrent Time: ${watTime}`;
                systemPrompt += `\nOpening Hours: ${context.openingHours}`;
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
    }
);
