// Supabase Edge Function: Paystack Webhook Handler
// Handles both Food Order payments AND Subscription payments

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Verify Paystack webhook signature
async function verifySignature(body: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(PAYSTACK_SECRET),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  const hash = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return hash === signature
}

Deno.serve(async (req: Request) => {
  if (req.method === 'GET') {
    return new Response('Paystack Webhook is ACTIVE. Listening for POST requests from Paystack.', { status: 200 })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const body = await req.text()
  const signature = req.headers.get('x-paystack-signature') || ''

  console.log('--- PAYSTACK WEBHOOK RECEIVED ---');
  console.log('Body:', body);

  const isValid = await verifySignature(body, signature)
  if (!isValid) {
    console.error('Invalid Paystack signature')
    return new Response('Invalid signature', { status: 401 })
  }

  const event = JSON.parse(body)
  console.log('Event Type:', event.event);

  if (event.event !== 'charge.success') {
    return new Response(JSON.stringify({ message: 'Event ignored' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const paymentData = event.data
  console.log('Payment Data Details:', {
    amount: paymentData.amount,
    reference: paymentData.reference,
    plan: paymentData.plan,
    metadata: paymentData.metadata,
    customer: paymentData.customer
  });
  const amount = paymentData.amount / 100
  const reference = paymentData.reference
  const planCode = paymentData.plan?.plan_code || paymentData.metadata?.plan_code || null
  const subaccountCode = paymentData.subaccount?.subaccount_code || null
  const customerEmail = paymentData.customer?.email || null

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // ---------------------------------------------------------
  // SCENARIO 1: SUBSCRIPTION PAYMENT (Has plan_code or no subaccount)
  // ---------------------------------------------------------
  if (planCode || !subaccountCode) {
    console.log(`Subscription Payment Detected: ${amount} | Email: ${customerEmail}`)

    // Priority 1: Use metadata client_id (FOOLPROOF)
    // Priority 2: Use email (Fallback)
    const metadataClientId = paymentData.metadata?.client_id;
    let clientQuery;

    if (metadataClientId) {
      console.log(`Subscription Identification: Metadata Client ID found: ${metadataClientId}`);
      clientQuery = supabase.from('clients').select('id, business_name').eq('id', metadataClientId);
    } else {
      console.log(`Subscription Identification: Fallback to Customer Email: ${customerEmail}`);
      clientQuery = supabase.from('clients').select('id, business_name').eq('email', customerEmail);
    }

    const { data: client, error: clientError } = await clientQuery.single();

    if (clientError || !client) {
      console.error('Subscription: Could not identify client by ID or Email:', metadataClientId || customerEmail);
      return new Response(JSON.stringify({ error: 'Client not identified for subscription' }), { status: 200 })
    }

    // Calculate new end date (30 days from now)
    const newEndDate = new Date()
    newEndDate.setDate(newEndDate.getDate() + 30)

    // Update Subscription
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        subscription_status: 'active',
        subscription_end_date: newEndDate.toISOString(),
        is_grace_period: false,
        status: 'Active', // Unblock account
        subscription_plan_code: planCode
      })
      .eq('id', client.id)

    if (updateError) {
      console.error('Subscription update failed:', updateError)
    } else {
      console.log(`Subscription ACTIVATED for ${client.business_name} until ${newEndDate.toISOString()}`)

      // Log notification
      await supabase.from('notifications').insert({
        client_id: client.id,
        title: 'Subscription Renewed',
        message: `Your subscription has been successfully renewed until ${newEndDate.toLocaleDateString()}. Payment Ref: ${reference}`
      })

      // Log Finance Record for Subscription Payment
      await supabase.from('axis_finance').insert({
        client_id: client.id,
        paystack_reference: reference,
        paystack_transaction_id: String(paymentData.id),
        total_amount: amount,
        axis_commission: amount, // Full subscription amount goes to AxisPrompt
        client_revenue: 0,
        commission_rate: 1.0,
        client_name: client.business_name,
        customer_name: customerEmail || 'Subscription',
        status: 'completed'
      })

      console.log(`Finance record logged for subscription: ₦${amount}`)
    }

    return new Response(JSON.stringify({ message: 'Subscription processed' }), { status: 200 })
  }


  // ---------------------------------------------------------
  // SCENARIO 2: FOOD ORDER PAYMENT (Has subaccount)
  // ---------------------------------------------------------
  console.log(`Food Order Payment: ${amount} | Subaccount: ${subaccountCode}`)

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, business_name')
    .eq('paystack_subaccount_code', subaccountCode)
    .single()

  if (clientError || !client) {
    console.error('Order: Client not found for subaccount:', subaccountCode)
    return new Response(JSON.stringify({ error: 'Client not found' }), { status: 200 })
  }

  // Create Order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      client_id: client.id,
      customer_name: paymentData.customer?.first_name || 'Unknown',
      customer_phone: paymentData.customer?.phone || null,
      total_amount: amount,
      payment_status: 'Paid',
      paystack_reference: reference,
      paystack_transaction_id: paymentData.id,
      subaccount_code: subaccountCode,
      status: 'In Progress',
      items_summary: 'Awaiting agent confirmation'
    })
    .select()
    .single()

  if (orderError) {
    console.error('Order creation failed:', orderError)
  }

  // Insert Finance Record (Commission)
  const commissionRate = 0.005
  const axisCommission = Math.round(amount * commissionRate * 100) / 100
  const clientRevenue = Math.round((amount - axisCommission) * 100) / 100

  await supabase.from('axis_finance').insert({
    client_id: client.id,
    order_id: order?.id, // Optional link
    paystack_reference: reference,
    paystack_transaction_id: String(paymentData.id),
    total_amount: amount,
    axis_commission: axisCommission,
    client_revenue: clientRevenue,
    commission_rate: commissionRate,
    client_name: client.business_name,
    customer_name: paymentData.customer?.email || 'Unknown',
    status: 'completed'
  })

  return new Response(JSON.stringify({ message: 'Order processed' }), { status: 200 })
})
