// Supabase Edge Function: ManyChat Webhook Handler
// 1. Receives Message from ManyChat
// 2. Verifies Business ID (via Query Param or Body)
// 3. Triggers Inngest Event (buffered)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const INNGEST_EVENT_KEY = Deno.env.get('INNGEST_EVENT_KEY')! // Needed to send events to Inngest

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
    // ManyChat sends: { "id": "user_123", "key": "value" ... }
    // You must configure ManyChat "External Request" to send:
    // Body: { "user_id": "{{user_id}}", "message": "{{last_input_text}}", "name": "{{full_name}}" }
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

    // 5. Send to Inngest (The "Brain")
    const inngestUrl = `https://inn.gs/e/${INNGEST_EVENT_KEY}`
    const eventPayload = {
        name: "chat/message.received",
        data: {
            business_id: business.id,
            business_name: business.business_name,
            user_id: String(user_id), // Ensure string
            user_name: name || "Customer",
            message: message,
            timestamp: Date.now()
        }
    }

    const inngestResponse = await fetch(inngestUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventPayload)
    })

    if (!inngestResponse.ok) {
        console.error('Failed to send to Inngest', await inngestResponse.text())
        return new Response(JSON.stringify({ error: 'Failed to queue message' }), { status: 500 })
    }

    return new Response(JSON.stringify({ status: 'queued', business: business.business_name }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    })
})
