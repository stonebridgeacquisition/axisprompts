import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const META_VERIFY_TOKEN = Deno.env.get('META_VERIFY_TOKEN') || 'swiftorder_verify_token_123'

Deno.serve(async (req: Request) => {
    const url = new URL(req.url)

    // Handle Meta Webhook Verification (GET Request)
    if (req.method === 'GET') {
        const mode = url.searchParams.get('hub.mode')
        const token = url.searchParams.get('hub.verify_token')
        const challenge = url.searchParams.get('hub.challenge')

        if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
            console.log('Webhook verified successfully!')
            return new Response(challenge, { status: 200 })
        } else {
            return new Response('Forbidden', { status: 403 })
        }
    }

    // Handle incoming messages (POST Request)
    if (req.method === 'POST') {
        let payload
        try {
            payload = await req.json()
        } catch (e) {
            return new Response('Invalid JSON', { status: 400 })
        }

        console.log('Received Webhook Payload:', JSON.stringify(payload))

        // Ensure this is an event from a page subscription
        if (payload.object === 'instagram') {
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

            // Iterate over each entry (there may be multiple if batched)
            for (const entry of payload.entry) {
                // The ig_account_id is usually entry.id for instagram webhooks
                const igAccountId = entry.id;

                // Iterate over each messaging event
                if (entry.messaging) {
                    for (const event of entry.messaging) {
                        const senderId = event.sender.id;
                        
                        // Ignore delivery and read receipts
                        if (event.message && event.message.text && !event.message.is_echo) {
                            const messageText = event.message.text;

                            // 1. Look up the client using the ig_account_id
                            const { data: business, error: busError } = await supabase
                                .from('clients')
                                .select('id, business_name')
                                .eq('ig_account_id', igAccountId)
                                .single()

                            if (busError || !business) {
                                console.error(`No business found for ig_account_id: ${igAccountId}`)
                                continue; // Skip to next event
                            }

                            console.log(`Processing message for ${business.business_name} from ${senderId}`)

                            // 2. Fetch User Profile from Instagram (Optional, but good for personalized greeting)
                            // We would need the page access token for this, so for now we'll just use "Customer" 
                            // as we don't know their name until they interact or we query the Graph API
                            // Alternatively, pass the sender.id and let agent.js query the graph API.

                            // 3. Send to WhatsApp Agent Edge Function
                            const agentResponse = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-agent`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                                },
                                body: JSON.stringify({
                                    business_id: business.id,
                                    user_id: senderId,
                                    user_name: "Customer",
                                    message: messageText,
                                    platform: "instagram",
                                })
                            })

                            if (!agentResponse.ok) {
                                console.error('Failed to call whatsapp-agent', await agentResponse.text())
                            }
                        }
                    }
                }
            }

            // Return a '200 OK' response to all requests
            return new Response('EVENT_RECEIVED', { status: 200 })
        } else {
            // Return a '404 Not Found' if event is not from a page subscription
            return new Response('Not Found', { status: 404 })
        }
    }

    return new Response('Method Not Allowed', { status: 405 })
})
