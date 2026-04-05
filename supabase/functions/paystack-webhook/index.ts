// Supabase Edge Function: Paystack Webhook Handler
// Handles both Food Order payments AND Subscription payments

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!

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

// Resend Email Helper
async function sendEmail(to: string, subject: string, html: string, fromName: string = "Swift Order AI") {
  if (!RESEND_API_KEY) {
    console.warn("Skipping Email: Missing RESEND_API_KEY");
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${fromName} <team@swiftorderai.com>`,
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    const data = await res.json();
    if (!res.ok) console.error("Resend Error:", data);
    else console.log(`Email Sent Successfully to ${to}:`, data.id);
  } catch (err) {
    console.error("Email send failed:", err);
  }
}

/**
 * Normalizes Nigerian phone numbers to the format required by WhatsApp (234...)
 * Handles: 090..., +234..., 234..., and spaces/hyphens.
 */
function normalizePhone(phone: string): string {
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');
    
    // If starts with 0 (e.g. 090...), replace with 234
    if (cleaned.startsWith('0')) {
        cleaned = '234' + cleaned.substring(1);
    }
    
    // If it's already 234..., leave as is. 
    // If it's 10 digits and missing 234, prepending it
    if (!cleaned.startsWith('234') && cleaned.length === 10) {
        cleaned = '234' + cleaned;
    }
    
    return cleaned;
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

      // ADMIN NOTIFICATION
      await supabase.from('notifications').insert({
        title: '💰 Subscription Payment',
        message: `₦${amount} received from ${client.business_name} (Subscription)`,
        is_system: true,
        type: 'payment'
      })

      // Log Finance Record for Subscription Payment
      await supabase.from('axis_finance').insert({
        client_id: client.id,
        paystack_reference: reference,
        paystack_transaction_id: String(paymentData.id),
        total_amount: amount,
        axis_commission: amount, // Full subscription amount goes to Swift Order AI
        client_revenue: 0,
        commission_rate: 1.0,
        client_name: client.business_name,
        customer_name: customerEmail || 'Subscription',
        status: 'completed'
      })

      console.log(`Finance record logged for subscription: ₦${amount}`)

      // EMAIL NOTIFICATION: Subscription Receipt
      const subscriptionHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { margin: 0; padding: 0; background-color: #FAFAFB; font-family: -apple-system, sans-serif; color: #111827; }
            .main { background-color: #FFFFFF; margin: 40px auto; width: 100%; max-width: 520px; border-radius: 24px; border: 1px solid #F3F4F6; overflow: hidden; }
            .brand-bar { text-align: center; padding: 24px 0; }
            .content { padding: 32px 40px; }
            .receipt-card { background-color: #111827; color: white; border-radius: 20px; padding: 32px; text-align: center; margin: 24px 0; }
            .amount { font-size: 36px; font-weight: 800; margin: 8px 0; }
            .label { font-size: 14px; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; }
          </style>
        </head>
        <body>
          <center>
            <div class="main">
              <div class="brand-bar"><img src="https://swiftorderai.com/logo.png" width="160" /></div>
              <div class="content">
                <h1 style="text-align: center;">Payment Successful!</h1>
                <div class="receipt-card">
                  <div class="label">Amount Paid</div>
                  <div class="amount">₦${amount.toLocaleString()}</div>
                  <div class="label">Swift Order AI Plan</div>
                </div>
                <p>Hi ${client.business_name}, your payment has been processed successfully. Your subscription is active, and your agent is ready to take orders.</p>
                <p style="font-size: 14px; text-align: center; color: #9CA3AF;">Transaction Ref: ${reference}</p>
              </div>
            </div>
          </center>
        </body>
        </html>
      `;
      await sendEmail(customerEmail, "Payment Receipt - Swift Order AI", subscriptionHtml);
    }

    return new Response(JSON.stringify({ message: 'Subscription processed' }), { status: 200 })
  }


  // ---------------------------------------------------------
  // SCENARIO 2: FOOD ORDER PAYMENT (Has subaccount)
  // ---------------------------------------------------------
  console.log(`Food Order Payment: ${amount} | Subaccount: ${subaccountCode}`)

  // Verify Subaccount MATCHES the Client Record (Rigid Check)
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, business_name, payment_model, email, logo_url, phone_number, whatsapp_phone_number_id, whatsapp_access_token')
    .eq('paystack_subaccount_code', subaccountCode)
    .single()

  if (clientError || !client) {
    console.error(`CRITICAL: Subaccount ${subaccountCode} NOT FOUND in database. Ref: ${reference}`)
    return new Response(JSON.stringify({ error: 'Client not found for subaccount' }), { status: 200 }) // Return 200 to stop Paystack retries for invalid data
  }

  // Extract metadata for complete order fulfillment
  const metadata = paymentData.metadata || {};
  const whatsappUserId = metadata.user_id || null;
  // Build itemsSummary from the metadata.items array if present
  let itemsSummary = metadata.items_summary || 'Awaiting agent confirmation';
  if (metadata.items && Array.isArray(metadata.items)) {
    itemsSummary = metadata.items.map((item: any) => {
      const qty = parseInt(item.quantity) || 0;
      const price = parseInt(item.price) || 0;
      const total = qty * price;
      return `- ${qty}x ${item.name} — ₦${total.toLocaleString()}`;
    }).join('\n');
  }

  // Generate a short, unique Order ID (e.g., AX-7H2R)
  const generateShortId = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No O, 0, I, 1 to avoid confusion
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `AX-${result}`;
  };
  const shortOrderId = generateShortId();

  // Fallback for delivery address mapping
  const deliveryAddress = metadata.delivery_details || metadata.delivery_address || 'Pickup';

  const customerName = metadata.customer_name || paymentData.customer?.first_name || 'Unknown';
  const customerPhone = metadata.customer_phone || paymentData.customer?.phone || null;

  // EXTRA SAFETY: If metadata includes business_id, verify it matches
  const metaBusinessId = paymentData.metadata?.business_id
  if (metaBusinessId && metaBusinessId !== client.id) {
    console.error(`SECURITY ALERT: Subaccount ${subaccountCode} belongs to ${client.id} but metadata says ${metaBusinessId}`)
    return new Response(JSON.stringify({ error: 'Subaccount Mismatch' }), { status: 400 })
  }

  console.log(`Verified Payment for: ${client.business_name} (${client.id})`)

  // Create Order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      client_id: client.id,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: paymentData.customer?.email || null,
      order_id: shortOrderId,
      delivery_address: deliveryAddress,
      total_amount: amount,
      payment_status: 'Paid',
      paystack_reference: reference,
      paystack_transaction_id: paymentData.id,
      subaccount_code: subaccountCode,
      status: 'In Progress',
      items_summary: itemsSummary,
      whatsapp_user_id: whatsappUserId || null
    })
    .select()
    .single()

  if (orderError) {
    console.error('Order creation failed:', orderError)
  }

  // Insert Finance Record (Commission)
  const isCommissionModel = client.payment_model === 'commission'
  const commissionRate = isCommissionModel ? 0.03 : 0.005
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

  // ADMIN NOTIFICATION
  await supabase.from('notifications').insert({
    title: '💸 New Commission Earned',
    message: `₦${axisCommission} commission from ${client.business_name} (Order ₦${amount})`,
    is_system: true,
    type: 'payment'
  })

  // ADMIN NOTIFICATION
  await supabase.from('notifications').insert({
    title: '🍕 New Order Received',
    message: `₦${amount} order for ${client.business_name} from ${paymentData.customer?.first_name || 'Customer'}.`,
    is_system: true,
    type: 'order'
  })

  // ---------------------------------------------------------
  // SEND CONFIRMATION TO CUSTOMER VIA WHATSAPP CLOUD API
  // ---------------------------------------------------------
  const whatsappPhoneId = client.whatsapp_phone_number_id
  const whatsappToken = client.whatsapp_access_token

  if (whatsappUserId && whatsappPhoneId && whatsappToken) {
    try {
      const confirmMsg = `🎉 *Payment Confirmed!* (Order #${shortOrderId})\n\nPayment of ₦${amount.toLocaleString()} received. Your order is now being prepared! Thank you for ordering with ${client.business_name}.`

      const waResponse = await fetch(`https://graph.facebook.com/v19.0/${whatsappPhoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: normalizePhone(whatsappUserId),
          type: "text",
          text: { body: confirmMsg }
        })
      });

      const waResult = await waResponse.json();
      if (waResponse.ok) {
        console.log(`Payment confirmation sent to user ${whatsappUserId} via Meta API`);

        // Save confirmation message to chat history so the AI sees it in context
        const { data: session } = await supabase
          .from('chat_sessions')
          .select('id')
          .match({ client_id: client.id, whatsapp_user_id: whatsappUserId })
          .single();

        if (session) {
          await supabase.from('chat_messages').insert({
            session_id: session.id,
            role: 'assistant',
            content: confirmMsg
          });

          // Mark session as not eligible for follow-up (this is a payment notification)
          await supabase.from('chat_sessions').update({
            follow_up_eligible: false
          }).eq('id', session.id);
        }
      } else {
        console.error('WhatsApp API send failed:', waResult);
      }
    } catch (waError) {
      console.error('WhatsApp confirmation error:', waError);
    }
  } else {
    console.warn('Missing WhatsApp credentials or user_id in payment metadata');
  }

  // ---------------------------------------------------------
  // UPDATE TRANSACTION STATUS (replaces Inngest payment lifecycle)
  // ---------------------------------------------------------
  if (reference) {
    // Mark transaction as paid (stops expire-pending-payments from expiring it)
    await supabase
      .from('transactions')
      .update({ status: 'success' })
      .eq('reference', reference)

    // Save success message to chat history so the AI agent has context
    if (whatsappUserId) {
      try {
        const { data: session } = await supabase
          .from('chat_sessions')
          .select('id')
          .match({ client_id: client.id, whatsapp_user_id: whatsappUserId })
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (session) {
          const successMsg = `\uD83C\uDF89 *Order Confirmed!*\n\nOrder #${shortOrderId} has been received and the kitchen has started preparing your meal! \uD83D\uDC68\u200D\uD83C\uDF73\n\nThank you for choosing us! \uD83C\uDF7D\uFE0F`
          await supabase.from('chat_messages').insert({
            session_id: session.id,
            role: 'assistant',
            content: successMsg
          })

          await supabase.from('chat_sessions').update({
            follow_up_eligible: false
          }).eq('id', session.id)
        }
      } catch (err: any) {
        console.error("Failed to sync success message to chat history:", err.message)
      }
    }

    console.log(`Transaction ${reference} marked as success`)
  }

  // --- Send Telegram Order Alert to Client ---
  try {
    const { data: clientData } = await supabase
      .from('clients')
      .select('telegram_chat_id, slug')
      .eq('id', client.id)
      .single();

    const telegramChatId = clientData?.telegram_chat_id;
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');

    if (telegramChatId && botToken) {
      console.log(`Sending Telegram Alert to chat_id: ${telegramChatId}`);

      const isPickup = !deliveryAddress ||
        deliveryAddress.toLowerCase().includes('pickup') ||
        deliveryAddress.toLowerCase().includes('pick up');

      const fulfillmentEmoji = isPickup ? '🏪' : '📍';
      const fulfillmentLabel = isPickup ? 'Fulfillment' : 'Delivery Address';
      const fulfillmentValue = isPickup ? 'Pick-up from store' : deliveryAddress;

      const messageText = `🚨 *New Customer Order!* 🚨\n\n` +
        `👤 *Customer:* ${customerName}\n` +
        `📞 *Phone:* ${customerPhone || 'N/A'}\n` +
        `💰 *Amount:* ₦${amount.toLocaleString()}\n` +
        `📦 *Order ID:* ${shortOrderId}\n\n` +
        `📝 *Items:* \n${itemsSummary}\n\n` +
        `${fulfillmentEmoji} *${fulfillmentLabel}:* \n${fulfillmentValue}\n\n` +
        `[Tap here to view order details](https://swiftorderai.com/client/${clientData.slug}/orders)`;

      const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: messageText,
          parse_mode: "Markdown",
          disable_web_page_preview: true
        })
      });

      const telegramResult = await telegramResponse.json();
      if (!telegramResult.ok) {
        console.error('Telegram Push Result Error:', telegramResult);
      } else {
        console.log('Telegram Push Result Success:', telegramResult.result.message_id);

        // Save the Telegram order notification to conversation history (assistant message)
        try {
          await supabase.from('telegram_conversations').insert({
            client_id: client.id,
            role: 'assistant',
            content: messageText
          });
          console.log('Telegram notification saved to conversation history');
        } catch (saveErr) {
          console.error('Failed to save Telegram notification to history:', saveErr);
        }
      }
    } else {
      console.warn("Skipping Telegram: Missing telegram_chat_id or bot token.");
    }
  } catch (err) {
    console.error("Telegram Push Notification Failed (non-fatal):", err);
  }

  // --- Send Email Notifications (Customer & Restaurant) ---
  const isPickup = !deliveryAddress ||
    deliveryAddress.toLowerCase().includes('pickup') ||
    deliveryAddress.toLowerCase().includes('pick up');
  const fulfillmentLabel = isPickup ? 'Pick-up from store' : deliveryAddress;

  // 1. Customer Receipt Email
  const customerEmailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin: 0; padding: 0; background-color: #FAFAFB; font-family: -apple-system, sans-serif; color: #111827; }
        .main { background-color: #FFFFFF; margin: 40px auto; width: 100%; max-width: 520px; border-radius: 24px; border: 1px solid #F3F4F6; overflow: hidden; }
        .brand-bar { text-align: center; padding: 24px 0; border-bottom: 1px solid #F3F4F6; }
        .content { padding: 32px 40px; }
        .order-box { background-color: #FAFAFB; border: 1px solid #F3F4F6; border-radius: 16px; padding: 20px; margin: 24px 0; }
        .total-row { border-top: 1px solid #E5E7EB; padding-top: 10px; margin-top: 10px; font-weight: 700; font-size: 16px; }
      </style>
    </head>
    <body>
      <center>
        <div class="main">
          <div class="brand-bar"><img src="${client.logo_url || 'https://swiftorderai.com/logo.png'}" width="120" /></div>
          <div class="content">
            <h1>Order Confirmed! 🍔</h1>
            <p>Hi ${customerName}, thanks for ordering from <strong>${client.business_name}</strong>. Your meal is being prepared.</p>
            <div class="order-box">
              <div style="font-weight: 700; margin-bottom: 15px;">Order #${shortOrderId}</div>
              <div style="white-space: pre-wrap; font-size: 14px; color: #4B5563;">${itemsSummary}</div>
              <div class="total-row">
                <span>Total Paid</span>
                <span style="float: right;">₦${amount.toLocaleString()}</span>
              </div>
            </div>
            <p>📍 <strong>Fulfillment:</strong><br>${fulfillmentLabel}</p>
            <p>If you have any questions, reach out to the team at ${client.phone_number || ''}.</p>
          </div>
          <div style="padding: 24px 40px; border-top: 1px solid #F3F4F6; text-align: center; font-size: 11px; color: #9CA3AF;">
            &copy; 2026 ${client.business_name}. Powered by <a href="https://swiftorderai.com" style="color: #9CA3AF; text-decoration: underline;">Swift Order AI</a>
          </div>
        </div>
      </center>
    </body>
    </html>
  `;
  await sendEmail(customerEmail, `Order Receipt - ${client.business_name}`, customerEmailHtml, client.business_name);

  // 2. Restaurant Notification Email
  if (client.email) {
    const restaurantEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { margin: 0; padding: 0; background-color: #FAFAFB; font-family: -apple-system, sans-serif; color: #111827; }
          .main { background-color: #FFFFFF; margin: 40px auto; width: 100%; max-width: 520px; border-radius: 24px; border: 1px solid #F3F4F6; overflow: hidden; }
          .brand-bar { text-align: center; padding: 24px 0; background-color: #111827; color: white; }
          .content { padding: 32px 40px; }
          .order-box { background-color: #FAFAFB; border: 1px solid #F3F4F6; border-radius: 16px; padding: 20px; margin: 24px 0; }
          .total-row { border-top: 1px solid #E5E7EB; padding-top: 10px; margin-top: 10px; font-weight: 700; font-size: 16px; }
        </style>
      </head>
      <body>
        <center>
          <div class="main">
            <div class="brand-bar">🚨 New Order Received</div>
            <div class="content">
              <h1>You have a new customer!</h1>
              <p><strong>${customerName}</strong> just placed an order through your AI assistant.</p>
              <div class="order-box">
                <div style="font-weight: 700; margin-bottom: 5px;">Order ID: ${shortOrderId}</div>
                <div style="font-size: 14px; margin-bottom: 15px;">Phone: ${customerPhone || 'N/A'}</div>
                <div style="white-space: pre-wrap; font-size: 14px; color: #4B5563;">${itemsSummary}</div>
                <div class="total-row">
                  <span>Amount Paid</span>
                  <span style="float: right;">₦${amount.toLocaleString()}</span>
                </div>
              </div>
              <p>📍 <strong>Fulfillment:</strong><br>${fulfillmentLabel}</p>
              <div style="text-align: center; margin-top: 24px;">
                <a href="https://swiftorderai.com/client/orders" style="display: inline-block; padding: 16px 32px; background-color: #111827; color: white; font-weight: 700; text-decoration: none; border-radius: 12px;">View in Dashboard</a>
              </div>
            </div>
            <div style="padding: 24px 40px; text-align: center; font-size: 11px; color: #9CA3AF;">
              Sent via Swift Order AI Agent Automations.
            </div>
          </div>
        </center>
      </body>
      </html>
    `;
    await sendEmail(client.email, "New Customer Order Received! 🚨", restaurantEmailHtml);
  }
  // -----------------------------------------

  return new Response(JSON.stringify({ message: 'Order processed' }), { status: 200 })
})
