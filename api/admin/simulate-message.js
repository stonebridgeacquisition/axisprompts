import { inngest } from "../../src/inngest/client.js";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { business_id, user_id, message, business_name } = req.body;

        if (!business_id || !user_id || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        console.log(`[SIMULATION] Sending message from ${user_id} to BID ${business_id}: "${message}"`);

        await inngest.send({
            name: "chat/message.received",
            data: {
                business_id,
                business_name: business_name || "Simulation Store",
                user_id, // e.g. "SIMULATION_123"
                user_name: "Simulation User",
                message,
                timestamp: Date.now(),
                platform: "simulation", // CRITICAL: This tells the agent NOT to use WhatsApp API
            },
        });

        return res.status(200).json({ success: true, message: 'Simulation event sent to Inngest' });

    } catch (error) {
        console.error('[SIMULATION] Error triggering inngest:', error);
        return res.status(500).json({ error: 'Failed to trigger agent simulation' });
    }
}
