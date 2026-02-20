// Supabase Edge Function: Process Delivery Fees with Gemini Vision
// Analyzes a delivery fee image/PDF and extracts locations + fees into the delivery_fees table

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { client_id, image_url } = await req.json()

    if (!client_id || !image_url) {
      return new Response(
        JSON.stringify({ error: 'client_id and image_url are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    console.log(`Processing delivery fees for client: ${client_id}`)
    console.log(`Image URL: ${image_url}`)

    // 1. Download the document
    const imageResponse = await fetch(image_url)
    if (!imageResponse.ok) {
      throw new Error(`Failed to download document: ${imageResponse.status}`)
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'

    // Convert to base64
    const bytes = new Uint8Array(imageBuffer)
    const CHUNK_SIZE = 8192
    let binaryStr = ''
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      const chunk = bytes.subarray(i, i + CHUNK_SIZE)
      binaryStr += String.fromCharCode(...chunk)
    }
    const base64Data = btoa(binaryStr)

    console.log(`Document downloaded: ${(imageBuffer.byteLength / 1024).toFixed(1)}KB`)

    // 2. Send to Gemini Vision API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

    const geminiPayload = {
      contents: [{
        parts: [
          {
            text: `Analyze this delivery fee document/image. Extract ALL delivery locations and their associated fees.

Return ONLY a valid JSON array with this exact format, no markdown, no explanation:
[
  {
    "location": "Location Name (e.g. Lekki Phase 1)",
    "fee": 2000
  }
]

Rules:
- fee must be a NUMBER (not string), in the local currency (Naira)
- If a price shows "2,000" or "N2,000" or "₦2,000", convert to number: 2000
- Extract every location you can see
- Return ONLY the JSON array, nothing else`
          },
          {
            inline_data: {
              mime_type: contentType,
              data: base64Data
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
      }
    }

    console.log('Sending to Gemini...')

    let geminiResponse: Response | null = null
    for (let attempt = 1; attempt <= 3; attempt++) {
      geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload)
      })

      if (geminiResponse.ok || geminiResponse.status !== 429) break

      console.log(`Rate limited (attempt ${attempt}/3), waiting ${attempt * 5}s...`)
      await new Promise(resolve => setTimeout(resolve, attempt * 5000))
    }

    if (!geminiResponse!.ok) {
      const errorText = await geminiResponse!.text()
      console.error('Gemini API error:', geminiResponse!.status, errorText)
      throw new Error(`Gemini API error: ${geminiResponse!.status} - ${errorText.substring(0, 200)}`)
    }

    const geminiData = await geminiResponse!.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    console.log('Gemini raw response:', rawText.substring(0, 200))

    // 3. Parse the JSON response
    let extractedFees: Array<{ location: string; fee: number }>

    try {
      let cleanJson = rawText.trim()
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }
      extractedFees = JSON.parse(cleanJson)
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError)
      throw new Error('Failed to parse fees from image')
    }

    if (!Array.isArray(extractedFees) || extractedFees.length === 0) {
      throw new Error('No delivery fees extracted from document')
    }

    const validFees = extractedFees.map(f => ({
      location: String(f.location).trim(),
      fee: Number(f.fee) || 0
    })).filter(f => f.location && !isNaN(f.fee));

    console.log(`Extracted ${validFees.length} valid fees`)

    // 4. Insert into delivery_fees table
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const rows = validFees.map(f => ({
      client_id,
      location: f.location,
      fee: f.fee
    }))

    const { data: inserted, error: insertError } = await supabase
      .from('delivery_fees')
      .insert(rows)
      .select()

    if (insertError) {
      console.error('Insert error:', insertError)
      throw new Error(`Database error: ${insertError.message}`)
    }

    // Also save the image URL on the client record
    await supabase
      .from('clients')
      .update({ delivery_fee_image_url: image_url })
      .eq('id', client_id)

    console.log(`Successfully inserted ${inserted.length} delivery fee rows`)

    return new Response(JSON.stringify({
      message: `Successfully extracted ${inserted.length} locations`,
      count: inserted.length,
      items: inserted
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (error) {
    console.error('Process delivery fees error:', error)
    return new Response(JSON.stringify({
      error: (error as Error).message || 'Failed to process document'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
})
