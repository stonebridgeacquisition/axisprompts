import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { code, client_id } = body

    if (!code || !client_id) {
      return new Response(
        JSON.stringify({ error: 'Missing code or client_id' }),
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Look up the code
    const { data: accessCode, error: lookupError } = await supabase
      .from('access_codes')
      .select('id, used')
      .eq('code', code.toUpperCase().trim())
      .single()

    if (lookupError || !accessCode) {
      console.error('[REDEEM-ACCESS-CODE] Code not found:', code)
      return new Response(
        JSON.stringify({ error: 'Code not found' }),
        { status: 404, headers: corsHeaders }
      )
    }

    // Double-check it hasn't been used (race condition check)
    if (accessCode.used) {
      console.warn('[REDEEM-ACCESS-CODE] Code already used (race condition):', code)
      return new Response(
        JSON.stringify({ error: 'Code has already been used' }),
        { status: 409, headers: corsHeaders }
      )
    }

    // Mark as used
    const { error: updateError } = await supabase
      .from('access_codes')
      .update({
        used: true,
        used_by: client_id,
        used_at: new Date().toISOString()
      })
      .eq('id', accessCode.id)

    if (updateError) {
      console.error('[REDEEM-ACCESS-CODE] Update failed:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to redeem code' }),
        { status: 500, headers: corsHeaders }
      )
    }

    console.log('[REDEEM-ACCESS-CODE] Code redeemed successfully:', code, 'by', client_id)
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: corsHeaders }
    )
  } catch (err) {
    console.error('[REDEEM-ACCESS-CODE] Error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    )
  }
})
