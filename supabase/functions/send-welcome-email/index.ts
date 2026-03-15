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
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!--[if mso]>
    <style type="text/css">
        table {border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;}
        body, table, td, p, a, h1, h2, h3, h4, h5, h6 {font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;}
    </style>
    <![endif]-->
    <style>
        body { margin: 0; padding: 0; min-width: 100%; background-color: #FAFAFB; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111827; -webkit-font-smoothing: antialiased; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
        table { border-spacing: 0; border-collapse: collapse; }
        td { padding: 0; }
        img { border: 0; line-height: 100%; outline: none; text-decoration: none; display: block; }
        a { color: inherit; text-decoration: none; }
        .wrapper { background-color: #FAFAFB; width: 100%; table-layout: fixed; padding: 40px 0; }
        .main { background-color: #FFFFFF; margin: 0 auto; width: 100%; max-width: 520px; border-radius: 24px; box-shadow: 0px 4px 24px rgba(0, 0, 0, 0.04), 0px 1px 2px rgba(0,0,0,0.02); overflow: hidden; border: 1px solid #F3F4F6; }
        .brand-bar { text-align: center; padding: 24px 0 0 0; background-color: #FFFFFF; }
        .logo { width: 140px; height: auto; margin: 0 auto; }
        .content { padding: 32px 40px 40px 40px; background-color: #FFFFFF; }
        h1 { margin: 0 0 16px 0; font-size: 28px; font-weight: 800; color: #111827; letter-spacing: -0.04em; line-height: 1.1; }
        p { margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #4B5563; font-weight: 400; }
        strong { color: #111827; font-weight: 600; }
        .action-card { background-color: #FAFAFB; border: 1px solid #F3F4F6; border-radius: 16px; padding: 24px; margin: 32px 0; text-align: left; }
        .action-card h3 { margin: 0 0 8px 0; font-size: 16px; color: #111827; font-weight: 700; }
        .action-card p { margin: 0; font-size: 15px; color: #4B5563; }
        .cta-container { margin: 32px 0 16px 0; }
        .button { display: inline-block; padding: 16px 32px; background-color: #111827; color: #FFFFFF !important; font-weight: 700; font-size: 16px; text-decoration: none; border-radius: 16px; text-align: center; letter-spacing: -0.01em; width: 100%; box-sizing: border-box; box-shadow: 0 4px 12px rgba(17, 24, 39, 0.15); }
        .footer { padding: 0 40px 40px 40px; background-color: #FFFFFF; text-align: center; }
        .divider { height: 1px; background-color: #F3F4F6; margin: 0 0 24px 0; width: 100%; }
        .footer p { font-size: 13px; color: #9CA3AF; margin-bottom: 8px; }
        .footer-link { color: #ea580c; font-weight: 500; text-decoration: none; }
    </style>
</head>
<body>
    <center class="wrapper">
        <table class="main" width="100%">
            <tr><td class="brand-bar"><img src="https://swiftorderai.com/logo.png" alt="Swift Order AI" class="logo" /></td></tr>
            <tr>
                <td class="content">
                    <h1 style="margin-top: 10px;">Your AI employee is officially on the clock.</h1>
                    <p>Hi <strong>${businessName}</strong>,</p>
                    <p>We're thrilled to have you. Your <strong>7-day free trial</strong> is active, and your WhatsApp agent is preparing for its first shift answering DMs and taking orders.</p>
                    <div class="action-card">
                        <h3>Next Step: The Guided Setup</h3>
                        <p>One of our onboarding specialists will reach out to you within 24 hours to help connect your WhatsApp and upload your menu.</p>
                    </div>
                    <p>In the meantime, log in to explore your new unified dashboard.</p>
                    <div class="cta-container"><a href="${loginLink}" class="button">Go to Dashboard</a></div>
                </td>
            </tr>
            <tr>
                <td class="footer">
                    <div class="divider"></div>
                    <p>&copy; ${new Date().getFullYear()} Swift Order AI.</p>
                    <p>Questions? Reply to this email or visit our <a href="https://swiftorderai.com/#faq" class="footer-link">Help Center</a>.</p>
                </td>
            </tr>
        </table>
    </center>
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
