// Supabase Edge Function: Expire Pending Payments
// Replaces Inngest payment.js 30-min waitForEvent timer
// Called by pg_cron every minute — finds expired pending transactions and handles cleanup

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        })
    }

    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 })
    }

    console.log('[EXPIRY] Checking for expired pending payments...')

    try {
        // Find all pending transactions that have passed their expires_at time
        const now = new Date().toISOString()
        const { data: expired, error } = await supabase
            .from('transactions')
            .select('id, reference, client_id, user_id, order_items, order_metadata')
            .eq('status', 'pending')
            .not('expires_at', 'is', null)
            .lt('expires_at', now)

        if (error) {
            console.error('[EXPIRY] Query error:', error)
            return new Response(JSON.stringify({ error: error.message }), { status: 500 })
        }

        if (!expired || expired.length === 0) {
            console.log('[EXPIRY] No expired payments found.')
            return new Response(JSON.stringify({ expired: 0 }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        console.log(`[EXPIRY] Found ${expired.length} expired payment(s)`)

        let processedCount = 0

        for (const txn of expired) {
            try {
                console.log(`[EXPIRY] Processing: ${txn.reference}`)

                // A. Update status to 'expired'
                await supabase
                    .from('transactions')
                    .update({ status: 'expired' })
                    .eq('id', txn.id)

                // B. Release stock if items were held
                const items = txn.order_items
                if (items && Array.isArray(items)) {
                    for (const item of items) {
                        // Look up menu item by name + client
                        const { data: menuItems } = await supabase
                            .from('menu_items')
                            .select('id, stock_level, track_inventory')
                            .eq('client_id', txn.client_id)
                            .ilike('name', item.name)
                            .limit(1)

                        const menuItem = menuItems?.[0]
                        if (menuItem && menuItem.track_inventory && menuItem.stock_level !== null) {
                            const newStock = menuItem.stock_level + (item.quantity || 1)
                            await supabase
                                .from('menu_items')
                                .update({ stock_level: newStock })
                                .eq('id', menuItem.id)
                            console.log(`[EXPIRY] Stock released: ${item.name} (${menuItem.stock_level} -> ${newStock})`)
                        }
                    }
                }

                // C. Notify user via WhatsApp that payment expired
                const { data: clientSettings } = await supabase
                    .from('clients')
                    .select('whatsapp_phone_number_id, whatsapp_access_token')
                    .eq('id', txn.client_id)
                    .single()

                const phoneNumberId = clientSettings?.whatsapp_phone_number_id
                const accessToken = clientSettings?.whatsapp_access_token

                if (phoneNumberId && accessToken && txn.user_id) {
                    const expiryMsg = `\u23F3 Your payment link has expired (30 mins).\n\nPlease place your order again if you still wish to proceed. Thank you!`

                    try {
                        await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                messaging_product: "whatsapp",
                                to: txn.user_id,
                                type: "text",
                                text: { body: expiryMsg }
                            })
                        })

                        // Save expiration message to chat history
                        const { data: session } = await supabase
                            .from('chat_sessions')
                            .select('id')
                            .match({ client_id: txn.client_id, whatsapp_user_id: txn.user_id })
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .single()

                        if (session) {
                            await supabase.from('chat_messages').insert({
                                session_id: session.id,
                                role: 'assistant',
                                content: expiryMsg
                            })

                            await supabase.from('chat_sessions').update({
                                follow_up_eligible: false
                            }).eq('id', session.id)
                        }
                    } catch (waErr: any) {
                        console.error(`[EXPIRY] WhatsApp notification failed for ${txn.reference}:`, waErr.message)
                    }
                }

                processedCount++
                console.log(`[EXPIRY] Completed: ${txn.reference}`)

            } catch (txnErr: any) {
                console.error(`[EXPIRY] Error processing ${txn.reference}:`, txnErr.message)
                // Continue with next transaction
            }
        }

        console.log(`[EXPIRY] Done. Processed ${processedCount}/${expired.length} expired payments.`)

        return new Response(JSON.stringify({ expired: processedCount }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        })

    } catch (err: any) {
        console.error('[EXPIRY] Fatal error:', err.message)
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
})
