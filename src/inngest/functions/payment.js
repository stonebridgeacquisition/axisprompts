import { inngest } from "../client.js";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const paymentLifecycle = inngest.createFunction(
    { id: "payment-lifecycle", concurrency: 5 },
    { event: "payment/invoice.generated" },
    async ({ event, step }) => {
        const { user_id, reference, amount, business_id, orderData } = event.data;

        // 1. Wait for payment success (30 mins)
        const payment = await step.waitForEvent("wait-for-payment", {
            event: "payment/success",
            timeout: "30m",
            match: "data.reference" // Match the 'reference' field in both events
        });

        // 2. Handle Timeout vs Success
        if (payment) {
            // HAPPY PATH: User paid!
            await step.run("handle-success", async () => {
                console.log(`Payment Successful for Ref: ${reference}`);

                // 1. Update DB transactions status to 'success'
                await supabase
                    .from('transactions')
                    .update({ status: 'success' })
                    .eq('reference', reference);

                // 2. Create Order in Dashboard
                if (orderData) {
                    await supabase.from('orders').insert({
                        client_id: business_id,
                        order_id: reference.replace('REF-', ''), // Clean custom ID for UI
                        customer_name: orderData.customer_name || 'Customer',
                        customer_phone: orderData.customer_phone || user_id,
                        delivery_address: orderData.delivery_address || 'Pickup / Not specified',
                        items_summary: JSON.stringify(orderData.items || []),
                        total_amount: amount,
                        status: 'In Progress',
                        payment_status: 'Paid',
                        payment_method: 'Paystack'
                    });
                }

                // 3. Notify User via WhatsApp
                const { data: clientSettings } = await supabase
                    .from('clients')
                    .select('whatsapp_phone_number_id, whatsapp_access_token')
                    .eq('id', business_id)
                    .single();

                const phoneNumberId = clientSettings?.whatsapp_phone_number_id;
                const accessToken = clientSettings?.whatsapp_access_token;

                if (phoneNumberId && accessToken) {
                    try {
                        const successMsg = `🎉 *Order Confirmed!*\n\nWe have received your payment for the order (Ref: ${reference}).\n\n👨‍🍳 Your food is currently being prepared!\n🛵 You will receive another message with your rider's number as soon as it's out for delivery.\n\nThank you for choosing us! 🍽️`;
                        
                        await axios.post(
                            `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
                            {
                                messaging_product: "whatsapp",
                                to: user_id,
                                type: "text",
                                text: { body: successMsg }
                            },
                            { headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
                        );
                        
                        // Also record this message in the chat history so the AI has context
                        // We need the session_id to do this properly. Try to find the latest session.
                        const { data: session } = await supabase
                            .from('chat_sessions')
                            .select('id')
                            .match({ client_id: business_id, whatsapp_user_id: user_id })
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .single();
                            
                        if (session) {
                            await supabase.from('chat_messages').insert({
                                session_id: session.id,
                                role: 'assistant',
                                content: successMsg
                            });
                        }
                    } catch (err) {
                        console.error("Failed to send success message via WhatsApp:", err.message);
                    }
                }
            });

            return { result: "Paid", reference };
        } else {
            // TIMEOUT PATH: 30 mins passed, no payment.
            await step.run("handle-expiration", async () => {
                console.log(`Payment Expired for Ref: ${reference}`);

                // A. Update DB status to 'expired'
                await supabase
                    .from('transactions')
                    .update({ status: 'expired' })
                    .eq('reference', reference);

                // B. Release Stock if previously held
                if (orderData && orderData.items && Array.isArray(orderData.items)) {
                    for (const item of orderData.items) {
                        if (!item.id) continue;
                        const { data: currentItem } = await supabase
                            .from('menu_items')
                            .select('stock_level, track_inventory')
                            .eq('id', item.id)
                            .single();
                        
                        if (currentItem && currentItem.track_inventory && currentItem.stock_level !== null) {
                            const newStock = currentItem.stock_level + (item.quantity || 1);
                            await supabase
                                .from('menu_items')
                                .update({ stock_level: newStock })
                                .eq('id', item.id);
                        }
                    }
                }

                // C. Notify User via WhatsApp that payment expired
                const { data: clientSettings } = await supabase
                    .from('clients')
                    .select('whatsapp_phone_number_id, whatsapp_access_token')
                    .eq('id', business_id)
                    .single();

                const phoneNumberId = clientSettings?.whatsapp_phone_number_id;
                const accessToken = clientSettings?.whatsapp_access_token;

                if (phoneNumberId && accessToken) {
                    try {
                        await axios.post(
                            `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
                            {
                                messaging_product: "whatsapp",
                                to: user_id,
                                type: "text",
                                text: { body: `⏳ Your payment link has expired (30 mins).\n\nPlease place your order again if you still wish to proceed. Thank you!` }
                            },
                            { headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
                        );
                    } catch (err) {
                        console.error("Failed to send expiration message via WhatsApp:", err.message);
                    }
                }
            });

            return { result: "Expired", reference };
        }
    }
);
