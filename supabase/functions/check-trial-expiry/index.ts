import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const sendEmail = async (to: string, subject: string, body: string) => {
    try {
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
                html: body,
            }),
        });
        if (!res.ok) {
            const errorText = await res.text();
            console.error(`Resend error for ${to}: ${errorText}`);
            return false;
        }
        console.log(`Email sent successfully to ${to}`);
        return true;
    } catch (error) {
        console.error(`Failed to send email to ${to}:`, error);
        return false;
    }
};

const getEmailTemplate = (businessName: string, titleCode: string, bodyContent: string, ctaLink: string, ctaText: string) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <!--[if mso]>
        <style type="text/css">
            table {border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;}
            body, table, td, p, a, h1, h2, h3, h4, h5, h6 {font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;}
        </style>
        <![endif]-->
        <style>
            body { margin: 0; padding: 0; min-width: 100%; background-color: #FAFAFB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827; -webkit-font-smoothing: antialiased; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
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
            .cta-container { margin: 32px 0 16px 0; text-align: center; }
            .button { display: inline-block; padding: 16px 32px; background-color: #111827; color: #FFFFFF !important; font-weight: 700; font-size: 16px; text-decoration: none; border-radius: 16px; text-align: center; letter-spacing: -0.01em; width: 100%; box-sizing: border-box; box-shadow: 0 4px 12px rgba(17, 24, 39, 0.15); }
            .footer { padding: 0 40px 40px 40px; background-color: #FFFFFF; text-align: center; }
            .divider { height: 1px; background-color: #F3F4F6; margin: 0 0 24px 0; width: 100%; }
            .footer p { font-size: 13px; color: #9CA3AF; margin-bottom: 8px; }
            .footer-link { color: #ea580c; font-weight: 500; text-decoration: none; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 16px; text-transform: uppercase; }
            .badge-warning { background: #fef3c7; color: #92400e; }
            .badge-error { background: #fee2e2; color: #991b1b; }
        </style>
    </head>
    <body>
        <center class="wrapper">
            <table class="main" width="100%">
                <tr><td class="brand-bar"><img src="https://swiftorderai.com/logo.png" alt="Swift Order AI" class="logo" /></td></tr>
                <tr>
                    <td class="content">
                        ${titleCode}
                        <p>Hi <strong>${businessName}</strong>,</p>
                        ${bodyContent}
                        <div class="cta-container">
                            <a href="${ctaLink}" class="button">${ctaText}</a>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td class="footer">
                        <div class="divider"></div>
                        <p>&copy; ${new Date().getFullYear()} Swift Order AI.</p>
                        <p>Questions? Reply to this email or contact <a href="mailto:support@swiftorderai.com" class="footer-link">support@swiftorderai.com</a>.</p>
                    </td>
                </tr>
            </table>
        </center>
    </body>
    </html>
    `;
};

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: CORS_HEADERS })
    }

    try {
        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
            throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        let processedCount = 0;
        const BASE_URL = Deno.env.get('SITE_URL') || 'https://swiftorderai.com';

        console.log("Starting trial and subscription check...");

        // ==========================================
        // 1. CHECK TRIALS (Expiry & Reminders)
        // ==========================================
        const { data: trialClients, error: fetchError } = await supabase
            .from('clients')
            .select('*')
            .eq('subscription_status', 'trial')
            .eq('payment_model', 'subscription')

        if (fetchError) throw fetchError;

        if (trialClients) {
            console.log(`Found ${trialClients.length} clients in trial status.`);
            for (const client of trialClients) {
                if (!client.trial_end_date) continue;

                const now = new Date();
                const end = new Date(client.trial_end_date);
                const diffTime = end.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const subLink = `${BASE_URL}/client/${client.slug}`;

                console.log(`Checking Client: ${client.business_name} | Days Left: ${diffDays}`);

                if (diffDays <= -3) {
                    console.log(`-> TRIAL BUFFER OVER for ${client.business_name}. Hard Lockout.`);
                    // HARD LOCKOUT ON DAY 10
                    await supabase.from('clients').update({ subscription_status: 'expired', status: 'Inactive', is_open: false }).eq('id', client.id);
                    await supabase.from('notifications').insert({ client_id: client.id, title: 'Trial Buffer Ended', message: 'Your extra access has ended. Account suspended.' });

                    const html = getEmailTemplate(
                        client.business_name,
                        '<div class="badge badge-error">Account Locked</div>',
                        '<p>The 3-day buffer period has ended. Your access is now locked and your agent is offline.</p><p>Please subscribe immediately to reactivate your orders and menu.</p>',
                        subLink,
                        'Unlock Dashboard'
                    );
                    await sendEmail(client.email, "Action Required: Your Account is Locked", html);
                    processedCount++;
                } else if (diffDays === -2) {
                    console.log(`-> Buffer Reminder (2 days left) for ${client.business_name}`);
                    const html = getEmailTemplate(
                        client.business_name,
                        '<div class="badge badge-warning">Action Required</div>',
                        '<p>Your free trial ended a few days ago. We have kept your agent live as a courtesy, but you have <b>2 days left</b> before your account is automatically locked.</p>',
                        subLink,
                        'Keep My Agent Live'
                    );
                    await sendEmail(client.email, "Urgent: 2 days left to subscribe", html);
                    processedCount++;
                } else if (diffDays === 0) {
                    console.log(`-> Trial Expired Day 7 for ${client.business_name}`);
                    // SOFT EXPIRY (Email only, no lockout)
                    await supabase.from('notifications').insert({ client_id: client.id, title: 'Trial Ended', message: 'Your free trial has ended. You have a 3-day buffer to subscribe before lockout.' });

                    const html = getEmailTemplate(
                        client.business_name,
                        '<div class="badge badge-warning">Trial Ended</div>',
                        '<p>Your free trial has officially ended today! We hope you loved using Swift Order AI.</p><p>We are giving you a <b>3-day buffer</b> to subscribe while keeping your agent live. Please subscribe now to avoid any service interruption on Day 10.</p>',
                        subLink,
                        'Subscribe Now'
                    );
                    await sendEmail(client.email, "Your Trial has Ended (3-day buffer started)", html);
                    processedCount++;
                } else if (diffDays === 1) {
                    const html = getEmailTemplate(
                        client.business_name,
                        '<div class="badge badge-warning">Expires Tomorrow</div>',
                        '<p>This is a reminder that your free trial expires <b>tomorrow</b>. Don\'t let your AI agent go offline!</p><p>Subscribe now to ensure uninterrupted service for your customers.</p>',
                        subLink,
                        'Keep My Agent Live'
                    );
                    await sendEmail(client.email, "Your Trial expires tomorrow", html);
                    processedCount++;
                } else if (diffDays === 3) {
                    const html = getEmailTemplate(
                        client.business_name,
                        '<div class="badge badge-warning">3 Days Left</div>',
                        '<p>You have 3 days left in your free trial. We hope Swift Order AI is helping you grow your business!</p><p>Upgrade now to a full plan to keep all your data and settings.</p>',
                        subLink,
                        'Upgrade Now'
                    );
                    await sendEmail(client.email, "3 Days left in your trial", html);
                    processedCount++;
                }
            }
        }

        // ==========================================
        // 2. CHECK ACTIVE SUBSCRIPTIONS (Grace Period Start)
        // ==========================================
        const { data: activeClients } = await supabase
            .from('clients')
            .select('*')
            .eq('subscription_status', 'active')
            .eq('payment_model', 'subscription')
            .lt('subscription_end_date', new Date().toISOString())

        if (activeClients) {
            for (const client of activeClients) {
                if (client.is_grace_period === true) continue;

                console.log(`Setting Grace Period for ${client.business_name}`);
                await supabase.from('clients').update({ is_grace_period: true }).eq('id', client.id);
                await supabase.from('notifications').insert({ client_id: client.id, title: 'Payment Failed', message: 'First day of grace period. Please update card immediately.' });

                const html = getEmailTemplate(
                    client.business_name,
                    '<div class="badge badge-error">Payment Failed</div>',
                    '<p>We were unable to process your subscription renewal today. Your account has been placed on a <b>10-day grace period</b> to keep your AI agent live while you resolve this.</p><p>Please update your payment method immediately to avoid account suspension.</p>',
                    `${BASE_URL}/client/${client.slug}`,
                    'Update Payment Method'
                );
                await sendEmail(client.email, "Urgent: Payment Failed - Grace Period Active", html);
                processedCount++;
            }
        }

        // ==========================================
        // 3. CHECK GRACE PERIOD (Reminders & Expiry)
        // ==========================================
        const { data: graceClients } = await supabase
            .from('clients')
            .select('*')
            .eq('is_grace_period', true)

        if (graceClients) {
            for (const client of graceClients) {
                const subLink = `${BASE_URL}/client/${client.slug}`;
                const endDate = new Date(client.subscription_end_date);
                const now = new Date();

                // Calculate how many days have passed since the subscription ended
                const diffTime = now.getTime() - endDate.getTime();
                const daysInGrace = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                const daysRemainingInGrace = 10 - daysInGrace;

                console.log(`Checking Grace Period: ${client.business_name} | Day of Grace: ${daysInGrace} | Remaining: ${daysRemainingInGrace}`);

                if (daysRemainingInGrace <= 0) {
                    console.log(`-> Grace Period Expired for ${client.business_name}. Suspending.`);
                    await supabase.from('clients').update({ subscription_status: 'expired', status: 'Inactive', is_open: false, is_grace_period: false }).eq('id', client.id);
                    await supabase.from('notifications').insert({ client_id: client.id, title: 'Subscription Suspended', message: 'Grace period ended. Account suspended.' });

                    const html = getEmailTemplate(
                        client.business_name,
                        '<div class="badge badge-error">Suspended</div>',
                        '<p>Your 10-day grace period has ended and your account has been <b>suspended</b>. Your customers can no longer place orders.</p><p>Please pay now to reactivate your dashboard immediately.</p>',
                        subLink,
                        'Reactivate Now'
                    );
                    await sendEmail(client.email, "Action Required: Your Account has been Suspended", html);
                    processedCount++;
                } else if ([1, 3, 5, 7, 9, 10].includes(daysInGrace)) {
                    // Send reminders on specific days of the grace period
                    const html = getEmailTemplate(
                        client.business_name,
                        '<div class="badge badge-warning">Payment Overdue</div>',
                        `<p>This is a reminder that your subscription payment is overdue. You have <b>${daysRemainingInGrace} days left</b> in your grace period.</p><p>Please update your payment details to prevent your account from being suspended and your AI agent going offline.</p>`,
                        subLink,
                        'Update Card'
                    );
                    await sendEmail(client.email, `Urgent: ${daysRemainingInGrace} days left to update payment`, html);
                    processedCount++;
                }
            }
        }

        return new Response(JSON.stringify({ success: true, processed: processedCount }), {
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        })

    } catch (err) {
        console.error('Trial check error:', err)
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        })
    }
})
