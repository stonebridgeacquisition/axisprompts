import { inngest } from "../client.js";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";

// Initialize Supabase (Use Service Key for backend operations)
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

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

            // B. Fetch System Prompt
            const { data: promptData } = await supabase
                .from('brand_prompts')
                .select('system_prompt')
                .eq('client_id', business_id)
                .single();

            // B2. Fetch Store Availability and details
            const { data: clientInfo } = await supabase
                .from('clients')
                .select('is_open, opening_hours, agent_name, business_name')
                .eq('id', business_id)
                .single();

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
                systemPrompt: promptData?.system_prompt || "You are a helpful assistant.",
                history: history ? history.reverse() : [],
                isOpen: clientInfo?.is_open !== false,
                openingHours: clientInfo?.opening_hours || 'Not specified',
                agentName: clientInfo?.agent_name || 'Jade',
                businessName: clientInfo?.business_name || 'Our Store'
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

                // Add current message
                fullPrompt += `\n\nSYSTEM INSTRUCTION: If the user agrees to pay or confirms the order, calculate the total amount. THEN, instead of saying you will generate a link, output EXACTLY this tag: [GENERATE_PAYMENT: AMOUNT].\nExample: [GENERATE_PAYMENT: 4500]\nDo not output any other text after the tag.`;
                fullPrompt += `\n\nUser: ${event.data.message}\nAssistant:`;

                const result = await model.generateContent(fullPrompt);
                const response = result.response;
                let text = response.text();

                // CHECK FOR PAYMENT TAG
                const paymentMatch = text.match(/\[GENERATE_PAYMENT:\s*(\d+)\]/i);
                if (paymentMatch) {
                    const amount = parseInt(paymentMatch[1], 10);
                    console.log(`Generating Payment Link for ₦${amount}...`);

                    try {
                        // 1. Fetch Subaccount Code
                        const { data: clientData } = await supabase
                            .from('clients')
                            .select('paystack_subaccount_code')
                            .eq('id', business_id)
                            .single();

                        const subaccount = clientData?.paystack_subaccount_code;

                        // 2. Generate Reference & Call Paystack
                        const reference = `REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

                        const paystackPayload = {
                            email: `${user_id}@kfc-bot.com`,
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
                                    Authorization: `Bearer ${process.env.VITE_PAYSTACK_SECRET_KEY}`,
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
                                business_id: business_id
                            }
                        });

                        text = text.replace(paymentMatch[0], `Here is your payment link: ${authUrl} 💳 (Valid for 30 mins)`);
                    } catch (payErr) {
                        console.error("Paystack Error:", payErr.response?.data || payErr.message);
                        text = text.replace(paymentMatch[0], "I'm having trouble generating the link right now. Please try again.");
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
            } else {
                console.log("Simulating WhatsApp send (No Credentials found for client):", aiResponse);
            }
        });

        return { success: true, reply: aiResponse };
    }
);
