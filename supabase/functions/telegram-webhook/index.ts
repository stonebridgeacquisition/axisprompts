import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // Telegram verification or quick health check
    if (req.method === 'GET') {
      return new Response("Telegram Webhook is running", { headers: corsHeaders, status: 200 });
    }

    const body = await req.json();

    // Ensure this is a message from Telegram
    if (!body.message || !body.message.text) {
      return new Response("OK", { status: 200 }); // Telegram requires a 200 OK so it doesn't retry
    }

    const chatId = body.message.chat.id;
    const text = body.message.text.trim();

    // Check if message is a /start command with a payload (e.g. /start 12345-uuid)
    if (text.startsWith('/start ')) {
      const clientId = text.split(' ')[1];

      if (clientId) {
        // Initialize Supabase Admin client to bypass RLS and update the client row
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Update the client record with the telegram chat ID
        const { error } = await supabaseAdmin
          .from('clients')
          .update({ telegram_chat_id: chatId.toString() })
          .eq('id', clientId);

        let replyText = "✅ Welcome to Axis Prompts Alerts!\n\nYour account has been successfully linked. You will now receive instant notifications here whenever a new order is placed.";

        if (error) {
          console.error("Supabase Error updating client:", error);
          replyText = "❌ Welcome! However, we couldn't link your account. Please ensure you clicked the link directly from your Axis Prompts dashboard settings.";
        }

        // Send reply back to the user via Telegram
        const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
        if (botToken) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: replyText,
            })
          });
        }
      }
    }

    return new Response("OK", { headers: corsHeaders, status: 200 });
  } catch (error) {
    console.error("Webhook Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
