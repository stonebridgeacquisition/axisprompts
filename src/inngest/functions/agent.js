import { inngest } from "../client.js";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";

// Initialize Supabase (Use Service Key for backend operations)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

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
                // Construct the full prompt context
                const menuContext = JSON.stringify(context.menu);
                const historyContext = context.history.map(m => `${m.role}: ${m.content}`).join("\n");

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

                // Replace placeholders in the system prompt
                let fullPrompt = context.systemPrompt
                    .replace(/{{AGENT_NAME}}/g, context.agentName)
                    .replace(/{{BUSINESS_NAME}}/g, context.businessName)
                    .replace('{{MENU}}', menuContext)
                    .replace('{{CHAT_HISTORY}}', historyContext)
                    .replace('{{BRAND_INFO}}', "(Delivery available via Paystack)")
                    .replace('{{CURRENT_TIME}}', watTime)
                    .replace('{{OPENING_HOURS}}', context.openingHours);

                // Add time awareness and store hours rules
                fullPrompt += `\n\n--- STORE AVAILABILITY ---`;
                fullPrompt += `\nCurrent Time: ${watTime}`;
                fullPrompt += `\nOpening Hours: ${context.openingHours}`;
                fullPrompt += `\nStore Status: OPEN`;
                fullPrompt += `\n\nRULE: If the current time appears to be outside the Opening Hours, politely tell the customer you are not accepting orders right now and mention the opening hours. Do NOT process any orders or generate payment links outside opening hours.`;

                // Add Delivery Rules
                fullPrompt += `\n\n--- DELIVERY CONFIGURATION ---`;
                fullPrompt += `\nOffers Pickup: ${context.offersPickup ? "YES" : "NO"}`;
                fullPrompt += `\nDelivery Zones & Fees: ${JSON.stringify(context.deliveryFees)}`;
                fullPrompt += `\nTeam Escalation Contact: ${context.teamContact}`;
                fullPrompt += `\nORDER RULE 1: IN YOUR VERY FIRST MESSAGE, ask the user if they want Delivery or Pickup (only if Offers Pickup is YES). Do not ask what they want to order until fulfillment is settled.`;
                fullPrompt += `\nORDER RULE 2: If Delivery, ask for their exact delivery area. It MUST match one of the Delivery Zones above. If it does NOT match, do NOT proceed.`;
                fullPrompt += `\nORDER RULE 3: For Delivery, correctly add the matched Delivery Fee to the total invoice amount.`;
                fullPrompt += `\nORDER RULE 4: For Pickup (self-collect, Bolt pickup, rider pickup), process the order. But at the final invoice step, you MUST add this exact note: "Since you're picking up, please CALL our team at ${context.teamContact} when you or your rider is here to collect it, and provide your Order ID. Do NOT send a WhatsApp message for this."`;
                fullPrompt += `\nORDER RULE 5: For Delivery, at the final invoice step you MUST add this exact note: "Our rider will call you when they are out for delivery and you will receive a message."`;
                fullPrompt += `\nORDER RULE 6: For ANY scenario requiring a phone call or direct coordination (complaints, refunds, special requests), always give the Team Escalation Contact number above.`;

                // Add Business Context
                fullPrompt += `\n\n--- BUSINESS CONTEXT ---`;
                fullPrompt += `\nAgent Name: ${context.agentName}`;
                fullPrompt += `\nBusiness Name: ${context.businessName}`;
                fullPrompt += `\nMenu: ${menuContext}`;

                // Add Conversation History (CRITICAL for memory)
                if (historyContext && historyContext.trim().length > 0) {
                    fullPrompt += `\n\n--- CONVERSATION HISTORY ---`;
                    fullPrompt += `\nBelow is the conversation so far. You MUST continue from where you left off. Do NOT restart the ordering flow if it is already in progress.`;
                    fullPrompt += `\n${historyContext}`;
                }
                
                // Add System Instruction for JSON Generation
                fullPrompt += `\n\n--- SYSTEM INSTRUCTION ---`;
                fullPrompt += `\nIf the user agrees to pay or confirms the order, calculate the total amount (menu items + delivery fee, if any).`;
                fullPrompt += `\nTHEN, instead of saying you will generate a link, output EXACTLY this JSON tag and NO OTHER TEXT:`;
                fullPrompt += `\n[GENERATE_PAYMENT: {"amount": 4500, "customer_name": "John Doe", "customer_phone": "08012345678", "customer_email": "john@example.com", "delivery_address": "Lekki", "items": [{"id": "item-id", "name": "Item Name", "quantity": 1, "price": 1000}]}]`;
                fullPrompt += `\nIn the JSON payload above:`;
                fullPrompt += `\n1. "amount" must be the final total integer (including delivery fee).`;
                fullPrompt += `\n2. You MUST extract "customer_name", "customer_phone", and "delivery_address" from the CONVERSATION HISTORY above. Do NOT leave them as "...". If any of these are genuinely missing from the history, ask the user for ONLY the missing info before generating the tag. Put "Pickup" for delivery_address if they chose pickup.`;
                fullPrompt += `\n3. "items" array must contain all ordered items. Use the exact item "id" from the Menu context above. If you cannot find the exact id, use the item name as the id.`;
                fullPrompt += `\n4. IMPORTANT: Only output the [GENERATE_PAYMENT: ...] tag when you have ALL required fields filled with real values. Never output the tag with placeholder dots.`;
                fullPrompt += `\n5. "customer_email" - extract the customer's email from conversation history. This is REQUIRED.`;
                fullPrompt += `\n6. "amount" must be a plain integer number with NO currency symbols, commas, or formatting. Example: 4500 not "₦4,500".`;
                fullPrompt += `\n\nUser: ${event.data.message}\nAssistant:`;

                const result = await model.generateContent(fullPrompt);
                const response = result.response;
                let text = response.text();
                // CHECK FOR PAYMENT TAG
                const paymentMatch = text.match(/\[GENERATE_PAYMENT:\s*(\{.*\})\]/is);
                if (paymentMatch) {
                    try {
                        const orderData = JSON.parse(paymentMatch[1]);
                        let amount = parseInt(String(orderData.amount).replace(/[^0-9]/g, ''), 10);
                        if (!amount || isNaN(amount) || amount <= 0) {
                            throw new Error(`Invalid amount from AI: ${orderData.amount}`);
                        }
                        const customerEmail = orderData.customer_email || `${user_id}@customer.swiftorderai.com`;
                        console.log(`Generating Payment Link for ₦${amount} (email: ${customerEmail})... and reserving inventory.`);

                        // 1. Fetch Subaccount Code
                        const { data: clientData } = await supabase
                            .from('clients')
                            .select('paystack_subaccount_code')
                            .eq('id', business_id)
                            .single();

                        const subaccount = clientData?.paystack_subaccount_code;

                        // 1B. Deduct Stock Immediately
                        // We do a loop for each item in the cart to safely update stock where track_inventory is true
                        if (orderData.items && Array.isArray(orderData.items)) {
                            for (const item of orderData.items) {
                                if (!item.id) continue;
                                const { data: currentItem } = await supabase
                                    .from('menu_items')
                                    .select('stock_level, track_inventory')
                                    .eq('id', item.id)
                                    .single();
                                
                                if (currentItem && currentItem.track_inventory && currentItem.stock_level !== null) {
                                    const newStock = Math.max(0, currentItem.stock_level - (item.quantity || 1));
                                    await supabase
                                        .from('menu_items')
                                        .update({ stock_level: newStock })
                                        .eq('id', item.id);
                                }
                            }
                        }

                        // 2. Generate Reference & Call Paystack
                        const reference = `REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

                        const paystackPayload = {
                            email: customerEmail,
                            amount: amount * 100,
                            reference: reference,
                            callback_url: "https://www.swiftorderai.com/payment-success",
                            metadata: {
                                user_id: user_id,
                                business_id: business_id
                            }
                        };

                        if (subaccount) {
                            paystackPayload.subaccount = subaccount;
                            console.log(`Using Subaccount: ${subaccount}`);
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

                        // 3. Log Transaction to DB
                        await supabase.from('transactions').insert({
                            reference: reference,
                            client_id: business_id,
                            user_id: user_id,
                            amount: amount,
                            status: 'pending',
                            subaccount_code: subaccount
                        });

                        // 4. Trigger Inngest 30-Min Timer
                        await inngest.send({
                            name: "payment/invoice.generated",
                            data: {
                                reference: reference,
                                user_id: user_id,
                                amount: amount,
                                business_id: business_id,
                                orderData: orderData // PASS ENTIRE JSON SO SUCCESS CAN CREATE THE "ORDER"
                            }
                        });

                        // Modify response text to just output the link and instructions
                        text = `Great! Your total is ₦${amount.toLocaleString()}.\n\nClick here to securely pay via Paystack: ${authUrl}\n\n⚠️ *Important:* After paying on Paystack, please wait for the page to redirect to the Success screen before you close it.\nYour stock is reserved for 30 minutes!`;
                    } catch (parseErr) {
                        console.error("Payment generation failed:", parseErr?.response?.data || parseErr.message || parseErr);
                        text = `I had a small issue processing your payment link. Let me try again - could you just confirm your order is correct?\n\nIf the issue continues, you can contact our team for help.`;
                    }
                }

                return text;
            } catch (error) {
                console.error("Gemini Error:", error);
                return "I apologize, I am having trouble thinking right now. Please try again.";
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
