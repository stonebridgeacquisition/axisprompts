// Supabase Edge Function: ManyChat Webhook Handler
// 1. Receives Message from ManyChat
// 2. Verifies Business ID (via Query Param or Body)
// 3. Calls whatsapp-agent edge function directly

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

Deno.serve(async (req: Request) => {
    // 1. Setup CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                'Access-Control-Allow-Headers': 'content-type, x-custom-token',
            }
        })
    }

    // 2. Business ID Extraction (Critical Step)
    // URL Pattern: https://.../functions/v1/manychat-webhook?bid=UUID
    const url = new URL(req.url)
    const businessId = url.searchParams.get('bid')

    if (!businessId) {
        return new Response(JSON.stringify({ error: 'Missing Business ID (bid)' }), { status: 400 })
    }

    // 3. Verify Business Exists
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: business, error: busError } = await supabase
        .from('clients')
        .select('id, business_name')
        .eq('id', businessId)
        .single()

    if (busError || !business) {
        console.error(`Invalid Business ID: ${businessId}`)
        return new Response(JSON.stringify({ error: 'Invalid Business ID' }), { status: 404 })
    }

    // 4. Parse ManyChat Payload
    let payload
    try {
        payload = await req.json()
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 })
    }

    const { user_id, message, name } = payload

    if (!user_id || !message) {
        return new Response(JSON.stringify({ error: 'Missing user_id or message' }), { status: 400 })
    }

    console.log(`Received msg for ${business.business_name}: [${name}] ${message}`)

    // 5. Call whatsapp-agent edge function directly
    const agentResponse = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-agent`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
            business_id: business.id,
            user_id: String(user_id),
            user_name: name || "Customer",
            message: message,
            platform: "manychat",
        })
    })

    if (!agentResponse.ok) {
        console.error('Failed to call whatsapp-agent', await agentResponse.text())
        return new Response(JSON.stringify({ error: 'Failed to process message' }), { status: 500 })
    }

    const result = await agentResponse.json()

    return new Response(JSON.stringify({ status: 'processed', business: business.business_name, reply: result.reply }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    })
})
