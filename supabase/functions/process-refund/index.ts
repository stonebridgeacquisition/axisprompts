import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
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

    try {
        const { order_id } = await req.json()

        if (!order_id) {
            return new Response(JSON.stringify({ error: 'order_id is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            })
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

        // 1. Get the order to find the Paystack transaction reference
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', order_id)
            .single()

        if (orderError || !order) {
            return new Response(JSON.stringify({ error: 'Order not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            })
        }

        if (order.payment_status === 'Refunded') {
            return new Response(JSON.stringify({ error: 'Order already refunded' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            })
        }

        if (!order.paystack_reference) {
            return new Response(JSON.stringify({ error: 'No Paystack reference found for this order' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            })
        }

        // 2. Call Paystack Refund API
        console.log(`Processing refund for order ${order_id}, ref: ${order.paystack_reference}`)

        const paystackRes = await fetch('https://api.paystack.co/refund', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PAYSTACK_SECRET}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                transaction: order.paystack_reference
            })
        })

        const paystackData = await paystackRes.json()

        if (!paystackData.status) {
            console.error('Paystack refund failed:', paystackData)
            return new Response(JSON.stringify({
                error: paystackData.message || 'Paystack refund failed'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            })
        }

        console.log('Paystack refund successful:', paystackData.data)

        // 3. Update the order status to Refunded
        const { error: updateError } = await supabase
            .from('orders')
            .update({
                payment_status: 'Refunded',
                status: 'Cancelled'
            })
            .eq('id', order_id)

        if (updateError) {
            console.error('Error updating order after refund:', updateError)
        }

        // 4. Update axis_finance record if exists
        await supabase
            .from('axis_finance')
            .update({ status: 'refunded' })
            .eq('order_id', order_id)

        return new Response(JSON.stringify({
            message: 'Refund processed successfully',
            refund: paystackData.data
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })

    } catch (err) {
        console.error('Refund error:', err)
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
    }
})
