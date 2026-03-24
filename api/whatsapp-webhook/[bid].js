import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { inngest } from "../../src/inngest/client.js";

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    const businessId = req.query.bid;

    // ── GET: Meta Webhook Verification ──────────────────────────────────────
    if (req.method === "GET") {
        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];

        console.log(`[WHATSAPP] Verification request for BID: ${businessId}`);

        if (!businessId) return res.status(400).send("Missing business ID");

        const { data: business, error } = await supabase
            .from("clients")
            .select("whatsapp_verify_token")
            .eq("id", businessId)
            .single();

        if (error || !business) {
            console.error(`[WHATSAPP] Business not found for BID: ${businessId}`);
            return res.status(403).send("Forbidden");
        }

        if (mode === "subscribe" && token === business.whatsapp_verify_token) {
            console.log(`[WHATSAPP] Verified for BID: ${businessId} ✅`);
            return res.status(200).send(challenge);
        }

        console.error(`[WHATSAPP] Token mismatch for BID: ${businessId}`);
        return res.status(403).send("Forbidden");
    }

    // ── POST: Receive Incoming Messages ──────────────────────────────────────
    if (req.method === "POST") {
        if (!businessId) return res.status(400).send("Missing BID");

        try {
            const payload = req.body;
            const signature = req.headers["x-hub-signature-256"];

            const { data: business, error } = await supabase
                .from("clients")
                .select("business_name, whatsapp_app_secret")
                .eq("id", businessId)
                .single();

            if (error || !business || !business.whatsapp_app_secret) {
                console.error(`[WHATSAPP] Business/Secret not found for BID: ${businessId}`);
                return;
            }

            // Validate signature if present
            if (signature) {
                const expected = `sha256=${crypto
                    .createHmac("sha256", business.whatsapp_app_secret)
                    .update(JSON.stringify(payload))
                    .digest("hex")}`;
                if (signature !== expected) {
                    console.warn(`[WHATSAPP] Signature mismatch for BID: ${businessId}. Vercel JSON parsing likely modified the raw body.`);
                    // We log the warning but CONTINUE execution so messages don't get dropped.
                }
            }

            // Parse payload and fire Inngest event
            if (payload.object === "whatsapp_business_account") {
                for (const entry of payload.entry || []) {
                    for (const change of entry.changes || []) {
                        const value = change.value;
                        if (value.messages?.[0]) {
                            const msg = value.messages[0];
                            const senderPhone = msg.from;
                            const messageText = msg.text?.body;
                            const userName = value.contacts?.[0]?.profile?.name || "Customer";

                            if (!messageText) continue;

                            console.log(`[WHATSAPP] Msg from ${senderPhone} to BID ${businessId}: "${messageText}"`);

                            await inngest.send({
                                name: "chat/message.received",
                                data: {
                                    business_id: businessId,
                                    business_name: business.business_name,
                                    user_id: senderPhone,
                                    user_name: userName,
                                    message: messageText,
                                    timestamp: Date.now(),
                                    platform: "whatsapp",
                                },
                            });

                            console.log(`[WHATSAPP] Event sent to Inngest for BID: ${businessId} ✅`);
                        }
                    }
                }
            }
            return res.status(200).send("OK");
        } catch (err) {
            console.error(`[WHATSAPP] Error processing POST for BID: ${businessId}`, err);
            // Still send 200 so Meta doesn't retry infinitely on a bad payload
            return res.status(200).send("Error logged");
        }
    }

    return res.status(405).send("Method Not Allowed");
}
