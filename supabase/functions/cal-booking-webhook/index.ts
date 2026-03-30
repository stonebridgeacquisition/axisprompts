// Supabase Edge Function: Cal.com Booking Webhook Handler
// When a booking is created on Cal.com, this function receives the webhook,
// extracts the lead_id from the booking metadata, and updates booked_call = true.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req: Request) => {
    // Health check
    if (req.method === 'GET') {
        return new Response('Cal.com Booking Webhook is ACTIVE.', { status: 200 })
    }

    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 })
    }

    try {
        const body = await req.json()

        console.log('--- CAL.COM WEBHOOK RECEIVED ---')
        console.log('Trigger Event:', body.triggerEvent)

        // Log the FULL payload so we can see exactly what Cal.com sends
        console.log('FULL PAYLOAD:', JSON.stringify(body, null, 2))

        // Cal.com sends different triggerEvent values:
        // BOOKING_CREATED, BOOKING_RESCHEDULED, BOOKING_CANCELLED, etc.
        const triggerEvent = body.triggerEvent

        if (triggerEvent !== 'BOOKING_CREATED') {
            console.log(`Ignoring event: ${triggerEvent}`)
            return new Response(JSON.stringify({ message: `Event ${triggerEvent} ignored` }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        const payload = body.payload || {}

        // Try every possible location where Cal.com might put our lead_id metadata
        let leadId = null

        // Location 1: payload.metadata.lead_id (Cal.com embed metadata)
        if (payload.metadata?.lead_id) {
            leadId = payload.metadata.lead_id
            console.log('Found lead_id in payload.metadata.lead_id')
        }

        // Location 2: Top-level metadata
        if (!leadId && body.metadata?.lead_id) {
            leadId = body.metadata.lead_id
            console.log('Found lead_id in body.metadata.lead_id')
        }

        // Location 3: payload.responses
        if (!leadId && payload.responses?.lead_id) {
            leadId = payload.responses.lead_id
            console.log('Found lead_id in payload.responses.lead_id')
        }

        // Location 4: payload.bookingFields or payload.eventTypeCustomInputs
        if (!leadId && payload.bookingFields) {
            const field = payload.bookingFields.find?.((f: any) => f.name === 'lead_id')
            if (field) {
                leadId = field.value
                console.log('Found lead_id in payload.bookingFields')
            }
        }

        // Location 5: Deep search in metadata string (sometimes Cal.com stringifies it)
        if (!leadId && typeof payload.metadata === 'string') {
            try {
                const parsed = JSON.parse(payload.metadata)
                if (parsed.lead_id) {
                    leadId = parsed.lead_id
                    console.log('Found lead_id in parsed metadata string')
                }
            } catch (_) { /* not JSON */ }
        }

        console.log('Extracted lead_id:', leadId)

        if (!leadId) {
            console.warn('No lead_id found in the Cal.com webhook payload. Skipping DB update.')
            return new Response(JSON.stringify({ message: 'No lead_id found, booking noted.' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // Update the booking_leads record
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

        const { data, error } = await supabase
            .from('booking_leads')
            .update({ booked_call: true })
            .eq('id', leadId)
            .select('id, name, email, phone')
            .single()

        if (error) {
            console.error('Failed to update booking_leads:', error)
            return new Response(JSON.stringify({ error: 'DB update failed', details: error.message }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        console.log(`✅ Lead marked as booked: ${data.name} (${data.email})`)

        return new Response(JSON.stringify({
            message: 'Lead updated successfully',
            lead: { id: data.id, name: data.name, email: data.email }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        })

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error('Webhook processing error:', message)
        return new Response(JSON.stringify({ error: 'Internal error', message }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        })
    }
})
