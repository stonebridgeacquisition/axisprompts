import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')!

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    console.log('[SEND-FOLLOWUPS] Starting follow-up check...')

    // Query candidate sessions for follow-up
    const { data: candidates, error: queryError } = await supabase.rpc(
      'get_followup_candidates'
    ) as any

    if (queryError) {
      console.error('[SEND-FOLLOWUPS] RPC Error:', queryError)
      return new Response(JSON.stringify({ error: 'Query failed' }), { status: 400 })
    }

    if (!candidates || candidates.length === 0) {
      console.log('[SEND-FOLLOWUPS] No candidates found for follow-up')
      return new Response(JSON.stringify({ processed: 0, sent: 0, skipped: 0 }), { status: 200 })
    }

    let sent = 0
    let failed = 0
    const batchSize = 20

    // Process in batches
    for (let i = 0; i < Math.min(candidates.length, batchSize); i++) {
      const session = candidates[i]

      try {
        console.log(`[SEND-FOLLOWUPS] Processing session ${session.id}...`)

        // Fetch last 5 messages for context
        const { data: messages } = await supabase
          .from('chat_messages')
          .select('role, content')
          .eq('session_id', session.id)
          .order('created_at', { ascending: false })
          .limit(5)

        if (!messages) {
          console.warn(`[SEND-FOLLOWUPS] No messages found for session ${session.id}`)
          continue
        }

        // Reverse to chronological order
        const context = messages.reverse()
        const contextStr = context
          .map((m: any) => `${m.role === 'user' ? 'Customer' : 'Agent'}: ${m.content}`)
          .join('\n\n')

        // Generate AI follow-up message
        let followupMsg = await generateFollowupMessage(contextStr, session.business_name)

        // Fallback template if AI fails
        if (!followupMsg) {
          followupMsg = `Hey! Still thinking about your order? Let me know if you have any questions — happy to help!`
        }

        // Send via WhatsApp Cloud API
        const waResponse = await fetch(`https://graph.facebook.com/v19.0/${session.whatsapp_phone_number_id}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.whatsapp_access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: session.whatsapp_user_id,
            type: 'text',
            text: { body: followupMsg }
          })
        })

        const waData = await waResponse.json()

        if (!waResponse.ok) {
          console.error(`[SEND-FOLLOWUPS] WhatsApp API Error for session ${session.id}:`, waData)
          failed++
          continue
        }

        console.log(`[SEND-FOLLOWUPS] Follow-up sent to ${session.whatsapp_user_id}`)

        // Save follow-up message to chat history
        await supabase.from('chat_messages').insert({
          session_id: session.id,
          role: 'assistant',
          content: followupMsg
        })

        // Mark session as followed-up
        const { error: updateError } = await supabase
          .from('chat_sessions')
          .update({ follow_up_sent: true })
          .eq('id', session.id)

        if (updateError) {
          console.error(`[SEND-FOLLOWUPS] Failed to update session ${session.id}:`, updateError)
          failed++
        } else {
          sent++
        }
      } catch (sessionError) {
        console.error(`[SEND-FOLLOWUPS] Error processing session ${session.id}:`, sessionError)
        failed++
      }
    }

    console.log(`[SEND-FOLLOWUPS] Completed: sent=${sent}, failed=${failed}`)
    return new Response(
      JSON.stringify({ processed: candidates.length, sent, skipped: failed }),
      { status: 200 }
    )
  } catch (err) {
    console.error('[SEND-FOLLOWUPS] Fatal error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
})

/**
 * Generate a contextual follow-up message using OpenRouter API
 */
async function generateFollowupMessage(conversationContext: string, businessName: string): Promise<string | null> {
  if (!OPENROUTER_API_KEY) {
    console.warn('[SEND-FOLLOWUPS] Missing OPENROUTER_API_KEY, using fallback')
    return null
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://swiftorderai.com',
        'X-Title': 'Swift Order AI'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          {
            role: 'system',
            content: `You are a friendly WhatsApp follow-up assistant for ${businessName}. Based on the conversation history, generate a short, friendly 1-2 sentence follow-up message to re-engage the customer. Be warm, not pushy. Do not repeat the menu or previous messages.`
          },
          {
            role: 'user',
            content: `Here's the conversation context:\n\n${conversationContext}\n\nGenerate a brief follow-up message.`
          }
        ],
        max_tokens: 100,
        temperature: 0.7
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[SEND-FOLLOWUPS] LLM Error:', data)
      return null
    }

    const message = data.choices?.[0]?.message?.content?.trim()
    return message || null
  } catch (err) {
    console.error('[SEND-FOLLOWUPS] LLM Request Failed:', err)
    return null
  }
}
