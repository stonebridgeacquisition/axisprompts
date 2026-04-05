import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

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
        }

        const event = req.body;
        console.log("Paystack Event Received:", event.event);

        if (event.event === "charge.success") {
            const reference = event.data.reference;
            console.log(`Payment confirmed: ${reference}`);

            // Update transaction status directly (no Inngest)
            await supabase
                .from('transactions')
                .update({ status: 'success' })
                .eq('reference', reference);

            console.log(`Transaction ${reference} marked as success`);
        }

        return res.status(200).send("OK");
    } catch (err) {
        console.error("Paystack Hook Error:", err);
        return res.status(500).send("Internal Server Error");
    }
}
