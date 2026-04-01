import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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
    // Handle Supabase Database Webhook trigger
    const payload = await req.json();
    console.log('--- DATABASE WEBHOOK RECEIVED ---');
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const { record, old_record, type } = payload;

    // Only process UPDATE events where the status has changed
    if (type !== 'UPDATE' || !record || !old_record) {
        console.warn(`[ORDER NOTIFICATION] Event ignored: Type is ${type}, not UPDATE`);
        return new Response(JSON.stringify({ message: 'Event ignored: Not a record update' }), { status: 200 });
    }

    // Normalize statuses for comparison
    const newStatus = record.status?.trim();
    const oldStatus = old_record.status?.trim();

    if (newStatus === oldStatus) {
        console.warn(`[ORDER NOTIFICATION] Event ignored: Status unchanged (${newStatus})`);
        return new Response(JSON.stringify({ message: 'Event ignored: Status unchanged' }), { status: 200 });
    }

    // Target statuses for notifications
    const targetStatuses = ['Out for Delivery', 'Delivered', 'Cancelled'];
    const isTarget = targetStatuses.some(s => s.toLowerCase() === newStatus?.toLowerCase());
    
    if (!isTarget) {
        console.warn(`[ORDER NOTIFICATION] Event ignored: Status "${newStatus}" not in target list`);
        return new Response(JSON.stringify({ message: `Event ignored: Status ${newStatus} not in target list` }), { status: 200 });
    }

    console.log(`[ORDER NOTIFICATION] Triggering notification: ${oldStatus} -> ${newStatus} for Order ID: ${record.id}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Fetch Client Credentials (WhatsApp ID and Token)
    const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('business_name, whatsapp_phone_number_id, whatsapp_access_token')
        .eq('id', record.client_id)
        .single();

    if (clientError || !client || !client.whatsapp_phone_number_id || !client.whatsapp_access_token) {
        console.error('[ORDER NOTIFICATION] Failed to fetch client credentials:', clientError?.message || 'Client not found');
        return new Response(JSON.stringify({ error: 'Client credentials missing' }), { status: 200 });
    }

    // 2. Format the Message
    let message = '';
    const businessName = client.business_name || 'the store';

    if (newStatus === 'Out for Delivery') {
        message = `Your order from ${businessName} is now out for delivery! 🛵 We'll be with you shortly.`;
    } else if (newStatus === 'Delivered') {
        message = `Your order from ${businessName} has been delivered. Enjoy your meal! 😋`;
    } else if (newStatus === 'Cancelled') {
        message = `Update: Your order from ${businessName} has been cancelled. If you have any questions, please contact the team.`;
    }

    // 3. Normalize Phone Number
    const rawPhone = record.customer_phone || '';
    const normalizedPhone = normalizePhone(rawPhone);

    if (!normalizedPhone || normalizedPhone.length < 10) {
        console.error('[ORDER NOTIFICATION] Invalid customer phone:', rawPhone);
        return new Response(JSON.stringify({ error: 'Invalid customer phone' }), { status: 200 });
    }

    // 4. Send via WhatsApp Cloud API
    try {
        console.log(`[ORDER NOTIFICATION] Sending WhatsApp to ${normalizedPhone} via Phone ID: ${client.whatsapp_phone_number_id}`);
        
        const waResponse = await fetch(`https://graph.facebook.com/v19.0/${client.whatsapp_phone_number_id}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${client.whatsapp_access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: normalizedPhone,
                type: "text",
                text: { body: message }
            })
        });

        const waData = await waResponse.json();

        if (!waResponse.ok) {
            console.error('[ORDER NOTIFICATION] WhatsApp API Error:', waData);
            return new Response(JSON.stringify({ error: 'WhatsApp API error', details: waData }), { status: 200 });
        }

        console.log(`[ORDER NOTIFICATION] Message sent successfully to ${normalizedPhone} ✅`);
        return new Response(JSON.stringify({ success: true, message_id: waData.messages?.[0]?.id }), { status: 200 });

    } catch (err) {
        console.error('[ORDER NOTIFICATION] Request failed:', err);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
});
