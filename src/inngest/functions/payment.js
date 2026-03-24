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
        const { user_id, reference, amount, business_id } = event.data;

        // 1. Wait for payment success (30 mins)
        const payment = await step.waitForEvent("wait-for-payment", {
            event: "payment/success",
            timeout: "30m",
            match: "data.reference" // Match the 'reference' field in both events
        });

        // 2. Handle Timeout vs Success
        if (payment) {
            // HAPPY PATH: User paid!
            console.log(`Payment Successful for Ref: ${reference}`);

            // Update DB status to 'success'
            await supabase
                .from('transactions')
                .update({ status: 'success' })
                .eq('reference', reference);

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

                // B. Notify User via WhatsApp that payment expired
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
