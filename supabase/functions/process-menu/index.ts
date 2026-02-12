// Supabase Edge Function: Process Menu Image with Gemini Vision
// Analyzes a menu image and extracts items + prices into the menu_items table

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req: Request) => {
  // Handle CORS for frontend calls
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
    const { client_id, menu_url } = await req.json()

    if (!client_id || !menu_url) {
      return new Response(
        JSON.stringify({ error: 'client_id and menu_url are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    console.log(`Processing menu for client: ${client_id}`)
    console.log(`Menu URL: ${menu_url}`)

    // 1. Download the menu image
    const imageResponse = await fetch(menu_url)
    if (!imageResponse.ok) {
      throw new Error(`Failed to download menu image: ${imageResponse.status}`)
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'

    // Convert to base64 using chunked approach (spread operator crashes on large arrays)
    const bytes = new Uint8Array(imageBuffer)
    const CHUNK_SIZE = 8192
    let binaryStr = ''
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      const chunk = bytes.subarray(i, i + CHUNK_SIZE)
      binaryStr += String.fromCharCode(...chunk)
    }
    const base64Image = btoa(binaryStr)

    console.log(`Image downloaded: ${(imageBuffer.byteLength / 1024).toFixed(1)}KB`)

    // 2. Send to Gemini Vision API for analysis
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

    const geminiPayload = {
      contents: [{
        parts: [
          {
            text: `Analyze this restaurant menu image. Extract ALL menu items with their names and prices.

Return ONLY a valid JSON array with this exact format, no markdown, no explanation:
[
  {
    "name": "Item Name",
    "price": 2000,
    "category": "Category Name",
    "description": "Brief description if visible, otherwise empty string"
  }
]

Rules:
- price must be a NUMBER (not string), in the local currency (Naira)
- If a price shows "2,000" or "N2,000" or "₦2,000", convert to number: 2000
- If no clear category, use "General"
- Extract EVERY item you can see, even partially visible ones
- If there are size variants (Small/Medium/Large), list each as a separate item or note in description
- Return ONLY the JSON array, nothing else`
          },
          {
            inline_data: {
              mime_type: contentType,
              data: base64Image
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
      }
    }

    console.log('Sending to Gemini 1.5 Flash...')

    // Retry up to 2 times on rate limit errors
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

    // 3. Parse the JSON response (handle markdown code blocks)
    let menuItems: Array<{ name: string; price: number; category: string; description: string }>

    try {
      // Remove markdown code blocks if present
      let cleanJson = rawText.trim()
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }
      menuItems = JSON.parse(cleanJson)
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError)
      console.error('Raw text was:', rawText)
      throw new Error('Failed to parse menu items from image')
    }

    if (!Array.isArray(menuItems) || menuItems.length === 0) {
      throw new Error('No menu items extracted from image')
    }

    console.log(`Extracted ${menuItems.length} items from menu`)

    // 4. Insert into menu_items table
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const rows = menuItems.map(item => ({
      client_id,
      name: item.name,
      price: Number(item.price) || 0,
      category: item.category || 'General',
      description: item.description || '',
      options: [],
      is_available: true
    }))

    const { data: inserted, error: insertError } = await supabase
      .from('menu_items')
      .insert(rows)
      .select()

    if (insertError) {
      console.error('Insert error:', insertError)
      throw new Error(`Database error: ${insertError.message}`)
    }

    console.log(`Successfully inserted ${inserted.length} menu items`)

    return new Response(JSON.stringify({
      message: `Successfully extracted ${inserted.length} menu items`,
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
    console.error('Process menu error:', error)
    return new Response(JSON.stringify({
      error: error.message || 'Failed to process menu'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
})
