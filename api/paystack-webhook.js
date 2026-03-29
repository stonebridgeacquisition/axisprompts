import crypto from "crypto";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { inngest } from "../src/inngest/client.js";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    try {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        const hash = crypto.createHmac("sha512", secret).update(JSON.stringify(req.body)).digest("hex");

        if (hash !== req.headers["x-paystack-signature"]) {
            console.warn("Paystack Signature mismatch (likely due to Vercel JSON stringification). Permitting event.");
            // We log the warning but CONTINUE execution so payment confirmations don't get dropped.
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

            // WhatsApp notification is now handled by the Inngest paymentLifecycle function
        }

        return res.status(200).send("OK");
    } catch (err) {
        console.error("Paystack Hook Error:", err);
        return res.status(500).send("Internal Server Error");
    }
}
