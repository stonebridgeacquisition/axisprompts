import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sendEmail = async (to: string, subject: string, html: string) => {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Swift Order AI <info@swiftorderai.com>",
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Resend error: ${errorText}`);
  }
  return res.json();
};

const getWelcomeTemplate = (businessName: string, loginLink: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #374151; background-color: #f9fafb; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb; }
    .header { background: #ea580c; padding: 32px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; }
    .content { padding: 32px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #ea580c; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 24px; }
    .footer { padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Swift Order AI! 🚀</h1>
    </div>
    <div class="content">
      <p>Hi <strong>${businessName}</strong>,</p>
      <p>We are thrilled to have you on board! Your 7-day free trial has officially started.</p>
      <p>With Swift Order AI, you can automate your customer orders, manage your menu effortlessly, and let our AI agent handle the heavy lifting for you.</p>
      
      <h3>What's Next?</h3>
      <p>A member of our team will reach out to you regarding setting up your account in the next 24 hours.</p>

      <div style="text-align: center;">
        <a href="${loginLink}" class="button">Go to Dashboard</a>
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Swift Order AI by Axis Prompts Ltd. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, businessName, loginUrl } = await req.json();

    if (!email || !businessName) {
      throw new Error('Missing email or businessName');
    }

    const html = getWelcomeTemplate(businessName, loginUrl || 'https://app.swiftorderai.com');
    await sendEmail(email, 'Welcome to Swift Order AI! 🚀', html);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
