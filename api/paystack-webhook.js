import crypto from "crypto";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { inngest } from "../src/inngest/client.js";

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    try {
        const secret = process.env.VITE_PAYSTACK_SECRET_KEY;
        const hash = crypto.createHmac("sha512", secret).update(JSON.stringify(req.body)).digest("hex");

        if (hash !== req.headers["x-paystack-signature"]) {
            console.error("Invalid Paystack Signature");
            return res.status(400).send("Invalid signature");
        }

        const event = req.body;
        console.log("Paystack Event Received:", event.event);

        if (event.event === "charge.success") {
            const { user_id, business_id } = event.data.metadata;
            const reference = event.data.reference;
            const amount = event.data.amount / 100;
            console.log(`Payment confirmed: ${reference}`);

            // 1. Trigger Payment Success Event (stops the 30-min timer in paymentLifecycle)
            await inngest.send({
                name: "payment/success",
                data: { reference, user_id, amount, business_id },
            });

            // 2. Send payment confirmation via WhatsApp
            const { data: clientData } = await supabase
                .from("clients")
                .select("whatsapp_phone_number_id, whatsapp_access_token")
                .eq("id", business_id)
                .single();

            const phoneNumberId = clientData?.whatsapp_phone_number_id;
            const accessToken = clientData?.whatsapp_access_token;

            if (phoneNumberId && accessToken) {
                await axios.post(
                    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
                    {
                        messaging_product: "whatsapp",
                        to: user_id,
                        type: "text",
                        text: { body: `Payment of ₦${amount} received! ✅\nYour order is now being processed. Thank you!` },
                    },
                    { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
                );
                console.log("[PAYSTACK] Payment confirmation sent via WhatsApp.");
            }
        }

        return res.status(200).send("OK");
    } catch (err) {
        console.error("Paystack Hook Error:", err);
        return res.status(500).send("Internal Server Error");
    }
}
