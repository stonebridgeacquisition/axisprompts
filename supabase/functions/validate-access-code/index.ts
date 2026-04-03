import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    const body = await req.json()
    const { code } = body

    if (!code || typeof code !== 'string') {
      return new Response(
        JSON.stringify({ valid: false, reason: 'Invalid request' }),
        { status: 400 }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Look up the code
    const { data: accessCode, error } = await supabase
      .from('access_codes')
      .select('id, code, used')
      .eq('code', code.toUpperCase().trim())
      .single()

    if (error || !accessCode) {
      console.log('[VALIDATE-ACCESS-CODE] Code not found:', code)
      return new Response(
        JSON.stringify({ valid: false, reason: 'Invalid access code' }),
        { status: 200 }
      )
    }

    // Check if already used
    if (accessCode.used) {
      console.log('[VALIDATE-ACCESS-CODE] Code already used:', code)
      return new Response(
        JSON.stringify({ valid: false, reason: 'This code has already been used' }),
        { status: 200 }
      )
    }

    console.log('[VALIDATE-ACCESS-CODE] Code is valid:', code)
    return new Response(
      JSON.stringify({ valid: true, codeId: accessCode.id }),
      { status: 200 }
    )
  } catch (err) {
    console.error('[VALIDATE-ACCESS-CODE] Error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    )
  }
})
