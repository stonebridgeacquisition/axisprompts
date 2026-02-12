import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// SMTP Configuration (Hardcoded for now as per user setup)
const SMTP_HOSTNAME = "mail.spacemail.com";
const SMTP_PORT = 465;
const SMTP_USERNAME = "team@studiocraftai.com";
const SMTP_PASSWORD = "Saudiarabia123?";

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const sendEmail = async (to: string, subject: string, body: string) => {
    const client = new SmtpClient();
    try {
        await client.connectTLS({
            hostname: SMTP_HOSTNAME,
            port: SMTP_PORT,
            username: SMTP_USERNAME,
            password: SMTP_PASSWORD,
        });

        await client.send({
            from: SMTP_USERNAME,
            to: to,
            subject: subject,
            content: body,
            html: body,
        });

        await client.close();
        console.log(`Email sent successfully to ${to}`);
        return true;
    } catch (error) {
        console.error(`Failed to send email to ${to}:`, error);
        return false;
    }
};

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: CORS_HEADERS })
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        let processedCount = 0;
        const errors = [];

        // ==========================================
        // 1. CHECK TRIALS (Existing Logic)
        // ==========================================
        const { data: trialClients } = await supabase
            .from('clients')
            .select('*')
            .eq('subscription_status', 'trial')

        if (trialClients) {
            for (const client of trialClients) {
                if (!client.trial_end_date) continue;
                const now = new Date();
                const end = new Date(client.trial_end_date);
                const diffDays = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

                if (diffDays <= 0) {
                    // EXPIRE TRIAL
                    await supabase.from('clients').update({
                        subscription_status: 'expired', status: 'Inactive', is_open: false
                    }).eq('id', client.id);

                    await supabase.from('notifications').insert({
                        client_id: client.id, title: 'Trial Expired', message: 'Your free trial has ended. Please subscribe.'
                    });
                    // Base URL for the application
                    const BASE_URL = Deno.env.get('SITE_URL') || 'https://axisprompts.vercel.app';

                    // ... (existing code)

                    // INSIDE existing logic (replacing specific lines):

                    // Trial Expired
                    await sendEmail(client.email, "AxisPrompt Trial Expired", `<p>Your trial has ended. <a href="${BASE_URL}/client/${client.slug}/subscription">Subscribe now</a>.</p>`);

                    // Trial Ending Soon
                    await sendEmail(client.email, "Trial Ends Tomorrow", `<p>1 day left. <a href="${BASE_URL}/client/${client.slug}/subscription">Subscribe now</a>.</p>`);

                    // Grace Period
                    await sendEmail(client.email, "Payment Failed - Grace Period Active",
                        `<p>Your subscription has expired. We attempted to renew it but failed.</p><p>You have been placed on a <b>10-day grace period</b>. <a href="${BASE_URL}/client/${client.slug}/subscription">Update payment method</a> immediately to avoid account suspension.</p>`);

                    // Account Suspended
                    await sendEmail(client.email, "AxisPrompt Account Suspended",
                        `<p>Your 10-day grace period has ended.</p><p>Your account has been <b>suspended</b>. Customers can no longer place orders.</p><p><a href="${BASE_URL}/client/${client.slug}/subscription">Pay now to reactivate</a>.</p>`);
                    processedCount++;
                }
            }
        }

        // ==========================================
        // 2. CHECK ACTIVE SUBSCRIPTIONS (For Grace Period)
        // ==========================================
        // Logic: If subscription_end_date has passed, put them in grace period.
        const { data: activeClients } = await supabase
            .from('clients')
            .select('*')
            .eq('subscription_status', 'active')
            .lt('subscription_end_date', new Date().toISOString()) // Only those past due

        if (activeClients) {
            for (const client of activeClients) {
                // Check if already in grace period
                if (client.is_grace_period === true) continue; // Already handled

                console.log(`Setting Grace Period for ${client.business_name}`);

                // Set Grace Period
                await supabase.from('clients').update({
                    is_grace_period: true
                }).eq('id', client.id);

                // Notify
                await supabase.from('notifications').insert({
                    client_id: client.id, title: 'Payment Failed - Grace Period Started',
                    message: 'Your subscripion payment failed or expired. You have entered a 10-day grace period.'
                });
                await sendEmail(client.email, "Payment Failed - Grace Period Active",
                    `<p>Your subscription has expired. We attempted to renew it but failed.</p><p>You have been placed on a <b>10-day grace period</b>. Please update your payment method immediately to avoid account suspension.</p>`);

                processedCount++;
            }
        }

        // ==========================================
        // 3. CHECK GRACE PERIOD EXPIRY (Suspension)
        // ==========================================
        // Logic: If is_grace_period AND (subscription_end_date + 10 days) < now -> Expire
        const tenDaysAgo = new Date();
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

        const { data: graceClients } = await supabase
            .from('clients')
            .select('*')
            .eq('is_grace_period', true)
        // .lt('subscription_end_date', tenDaysAgo.toISOString()) // This query is tricky with multiple conditions, simpler to filter in loop

        if (graceClients) {
            for (const client of graceClients) {
                const endDate = new Date(client.subscription_end_date);
                const graceEndDate = new Date(endDate);
                graceEndDate.setDate(graceEndDate.getDate() + 10);

                if (new Date() > graceEndDate) {
                    console.log(`Grace period expired for ${client.business_name}. Suspending.`);

                    // SUSPEND ACCOUNT
                    await supabase.from('clients').update({
                        subscription_status: 'expired',
                        status: 'Inactive',
                        is_open: false,
                        is_grace_period: false
                    }).eq('id', client.id);

                    // Notify
                    await supabase.from('notifications').insert({
                        client_id: client.id, title: 'Account Suspended',
                        message: 'Your grace period has ended and your account is now suspended. Please pay to reactivate.'
                    });
                    await sendEmail(client.email, "AxisPrompt Account Suspended",
                        `<p>Your 10-day grace period has ended.</p><p>Your account has been <b>suspended</b>. Customers can no longer place orders.</p><p><a href="https://axisprompt.com">Pay now to reactivate</a>.</p>`);

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
