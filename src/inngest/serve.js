import 'dotenv/config';
import express from "express";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const app = express();
const port = 3000;

app.use(express.json());

// ============================================================
// WHATSAPP CLOUD API WEBHOOKS (MULTI-TENANT)
// ============================================================

// GET: Meta Webhook Verification
app.get("/api/whatsapp-webhook/:bid", async (req, res) => {
    const businessId = req.params.bid;
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log(`[WHATSAPP] Webhook verification request received for BID: ${businessId}`);

    if (!businessId) return res.status(400).send("Missing business ID");

    try {
        const { data: business, error } = await supabase
            .from('clients')
            .select('whatsapp_verify_token')
            .eq('id', businessId)
            .single();

        if (error || !business) {
            console.error(`[WHATSAPP] Business not found or error fetching client:`, error?.message);
            return res.sendStatus(403);
        }

        if (mode === 'subscribe' && token === business.whatsapp_verify_token) {
            console.log(`[WHATSAPP] Webhook verified for BID: ${businessId}`);
            return res.status(200).send(challenge);
        } else {
            console.error(`[WHATSAPP] Verification FAILED for BID: ${businessId}. Token mismatch.`);
            return res.sendStatus(403);
        }
    } catch (err) {
         console.error(`[WHATSAPP] Error during verification:`, err);
         return res.sendStatus(500);
    }
});

// POST: Receive incoming WhatsApp messages
app.post("/api/whatsapp-webhook/:bid", async (req, res) => {
    const businessId = req.params.bid;
    const payload = req.body;
    const signature = req.headers['x-hub-signature-256'];

    console.log(`[WHATSAPP] Webhook payload received for BID: ${businessId}`);

    // Always return 200 immediately so Meta doesn't retry
    res.sendStatus(200);

    if (!businessId) {
         console.error(`[WHATSAPP] Missing business ID in URL`);
         return;
    }

    try {
        const { data: business, error } = await supabase
            .from('clients')
            .select('business_name, whatsapp_app_secret')
            .eq('id', businessId)
            .single();

        if (error || !business || !business.whatsapp_app_secret) {
            console.error(`[WHATSAPP] Business/Secret not found for BID: ${businessId}`);
            return;
        }

        if (signature) {
             const expectedSignature = `sha256=${crypto.createHmac('sha256', business.whatsapp_app_secret).update(JSON.stringify(payload)).digest('hex')}`;
             if (signature !== expectedSignature) {
                 console.error(`[WHATSAPP] Warning: Signature mismatch for BID: ${businessId}`);
             }
        }

        if (payload.object === 'whatsapp_business_account') {
            for (const entry of payload.entry || []) {
                for (const change of entry.changes || []) {
                    const value = change.value;

                    if (value.statuses) {
                        console.log(`[WHATSAPP] Skipping status update: ${value.statuses[0]?.status}`);
                        continue;
                    }

                    if (value.messages && value.messages[0]) {
                        const messagePart = value.messages[0];

                        if (messagePart.type !== 'text') {
                            console.log(`[WHATSAPP] Skipping non-text message type: ${messagePart.type}`);
                            continue;
                        }

                        const senderPhoneNumber = messagePart.from;
                        const messageText = messagePart.text?.body;
                        const userName = value.contacts?.[0]?.profile?.name || "Customer";

                        if (!messageText || messageText.trim().length === 0) {
                            console.log(`[WHATSAPP] Skipping empty message`);
                            continue;
                        }

                        console.log(`[WHATSAPP] Msg from ${senderPhoneNumber} to BID ${businessId}: "${messageText}"`);

                        // Call whatsapp-agent edge function directly
                        try {
                            const agentRes = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-agent`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                                },
                                body: JSON.stringify({
                                    business_id: businessId,
                                    user_id: senderPhoneNumber,
                                    user_name: userName,
                                    message: messageText,
                                    platform: "whatsapp",
                                }),
                            });

                            if (!agentRes.ok) {
                                console.error(`[WHATSAPP] Agent call failed:`, await agentRes.text());
                            } else {
                                console.log(`[WHATSAPP] Agent responded for BID: ${businessId}`);
                            }
                        } catch (agentErr) {
                            console.error(`[WHATSAPP] Agent call error:`, agentErr);
                        }
                    }
                }
            }
        }
    } catch (err) {
         console.error(`[WHATSAPP] Error processing webhook POST:`, err);
    }
});

// Paystack Webhook Handler
app.post("/api/paystack-webhook", async (req, res) => {
    try {
        const secret = process.env.VITE_PAYSTACK_SECRET_KEY;
        const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');

        if (hash == req.headers['x-paystack-signature']) {
            const event = req.body;
            console.log("Paystack Event Received:", event.event);

            if (event.event === 'charge.success') {
                const { user_id, business_id } = event.data.metadata;
                const reference = event.data.reference;
                const amount = event.data.amount / 100;
                console.log(`Payment confirmed: ${reference}`);

                // Update transaction status directly (no Inngest)
                await supabase
                    .from('transactions')
                    .update({ status: 'success' })
                    .eq('reference', reference);

                // Send payment confirmation via WhatsApp Cloud API
                const { data: clientData } = await supabase
                    .from('clients')
                    .select('whatsapp_phone_number_id, whatsapp_access_token')
                    .eq('id', business_id)
                    .single();

                const phoneNumberId = clientData?.whatsapp_phone_number_id;
                const accessToken = clientData?.whatsapp_access_token;

                if (phoneNumberId && accessToken) {
                    await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            messaging_product: "whatsapp",
                            to: user_id,
                            type: "text",
                            text: { body: `Payment of NGN${amount} received!\nYour order is now being processed. Thank you!` }
                        })
                    });
                    console.log("[PAYSTACK] Payment confirmation sent via WhatsApp.");
                } else {
                    console.log("[PAYSTACK] No WhatsApp credentials for client, skipping confirmation message.");
                }
            }
            res.sendStatus(200);
        } else {
            console.error("Invalid Paystack Signature");
            res.sendStatus(400);
        }
    } catch (err) {
        console.error("Paystack Hook Error:", err);
        res.sendStatus(500);
    }
});

app.listen(port, () => {
    console.log(`\n Server running on port ${port}`);
    console.log(`   WhatsApp webhook :  http://localhost:${port}/api/whatsapp-webhook/:bid`);
    console.log(`   Paystack webhook :  http://localhost:${port}/api/paystack-webhook`);
});
