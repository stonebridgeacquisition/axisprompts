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

        const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        const agentRes = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-agent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
                business_id,
                user_id,
                user_name: "Simulation User",
                message,
                platform: "simulation",
            }),
        });

        if (!agentRes.ok) {
            const errText = await agentRes.text();
            console.error('[SIMULATION] Agent call failed:', errText);
            return res.status(500).json({ error: 'Agent call failed', details: errText });
        }

        const result = await agentRes.json();
        return res.status(200).json({ success: true, reply: result.reply });

    } catch (error) {
        console.error('[SIMULATION] Error:', error);
        return res.status(500).json({ error: 'Failed to trigger agent simulation' });
    }
}
