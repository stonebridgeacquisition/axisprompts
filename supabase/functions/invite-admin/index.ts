import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        // 1. Authenticate the caller
        const {
            data: { user },
            error: userError,
        } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            throw new Error('Unauthorized');
        }

        // 2. Verify caller is an admin
        const { data: adminUser, error: adminError } = await supabaseClient
            .from('admin_users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (adminError || !adminUser) {
            throw new Error('Unauthorized: Admin privileges required');
        }

        // 3. Create the Service Role Client (for admin actions)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { email } = await req.json();

        if (!email) {
            throw new Error('Email is required');
        }

        // 4. Invite the user
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            redirectTo: 'https://app.swiftorderai.com/app/login'
        });

        if (inviteError) {
            throw inviteError;
        }

        // 5. Add to admin_users table
        // Note: inviteData.user contains the new user's info
        const { error: insertError } = await supabaseAdmin
            .from('admin_users')
            .insert({
                id: inviteData.user.id,
                email: email,
                role: 'admin'
            });

        if (insertError) {
            // Cleanup? If we fail to make them an admin, maybe we should delete the user?
            // For now, let's just report the error.
            console.error('Failed to add to admin_users:', insertError);
            throw new Error(`User invited but failed to add to admin list: ${insertError.message}`);
        }

        return new Response(
            JSON.stringify({ message: 'Invitation sent and admin access granted', user: inviteData.user }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
});
