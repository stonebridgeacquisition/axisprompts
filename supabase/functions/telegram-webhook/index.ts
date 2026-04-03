// Supabase Edge Function: Telegram Webhook — Client Management Agent
// Gemini 2.0 Flash powered conversational agent for clients to manage their
// Swift Order AI business via Telegram (orders, menu, delivery, finance, settings).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')!

const OPENROUTER_MODEL = 'minimax/minimax-m2.5:free'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MAX_HISTORY_MESSAGES = 20

// =====================
// TELEGRAM HELPERS
// =====================

async function sendTelegramMessage(chatId: string | number, text: string) {
  // Try sending with Markdown first
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  })

  const result = await res.json()

  // If Telegram rejects the markdown (e.g. **bold** is invalid in legacy Markdown),
  // strip formatting and retry as plain text
  if (!result.ok) {
    console.warn('Telegram Markdown failed, retrying as plain text:', result.description)
    const plainText = text
      .replace(/\*\*/g, '')       // Remove **bold**
      .replace(/\*/g, '')         // Remove *italic*
      .replace(/_/g, '')          // Remove _italic_
      .replace(/`/g, '')          // Remove `code`

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: plainText,
      }),
    })
  }
}


async function sendTelegramAction(chatId: string | number, action = 'typing') {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action }),
  })
}

async function getTelegramFileUrl(fileId: string): Promise<string | null> {
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`)
  const data = await res.json()
  if (data.ok && data.result?.file_path) {
    return `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${data.result.file_path}`
  }
  return null
}

// =====================
// TOOL DEFINITIONS (for OpenRouter function calling)
// =====================

const toolDeclarations = [
  // --- ORDERS ---
  {
    type: 'function',
    function: {
      name: 'get_orders',
      description: 'Get a list of orders for this client. Can filter by status, date range, or search term.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Filter by order status: "In Progress", "Out for Delivery", "Completed", "Cancelled". Leave empty for all.' },
          period: { type: 'string', description: 'Filter by time period: "today", "week", "month", or "all". Default is "all".' },
          search: { type: 'string', description: 'Search by customer name.' },
          limit: { type: 'integer', description: 'Max number of orders to return. Default 10.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_order_details',
      description: 'Get full details for a specific order by its ID or order_id.',
      parameters: {
        type: 'object',
        properties: {
          order_id: { type: 'string', description: 'The order ID or UUID to look up.' },
        },
        required: ['order_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_order_status',
      description: 'Update the status of an order. Valid statuses: "In Progress", "Out for Delivery", "Completed", "Cancelled".',
      parameters: {
        type: 'object',
        properties: {
          order_id: { type: 'string', description: 'The order UUID.' },
          new_status: { type: 'string', description: 'The new status to set.' },
        },
        required: ['order_id', 'new_status'],
      },
    },
  },

  // --- MENU ---
  {
    type: 'function',
    function: {
      name: 'get_menu_items',
      description: 'Get all menu items for this client. Can filter by category or availability.',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Filter by category name.' },
          available_only: { type: 'boolean', description: 'If true, only return available items.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_menu_item',
      description: 'Add a new item to the menu.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Item name.' },
          price: { type: 'number', description: 'Item price in Naira.' },
          category: { type: 'string', description: 'Category name. Default "General".' },
          description: { type: 'string', description: 'Item description.' },
        },
        required: ['name', 'price'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_menu_item',
      description: 'Update an existing menu item. Provide the item ID and the fields to change.',
      parameters: {
        type: 'object',
        properties: {
          item_id: { type: 'string', description: 'The menu item UUID.' },
          name: { type: 'string', description: 'New name.' },
          price: { type: 'number', description: 'New price.' },
          category: { type: 'string', description: 'New category.' },
          description: { type: 'string', description: 'New description.' },
          is_available: { type: 'boolean', description: 'Set availability.' },
        },
        required: ['item_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_menu_item',
      description: 'Delete a menu item. IMPORTANT: Always ask the user for confirmation before calling this.',
      parameters: {
        type: 'object',
        properties: {
          item_id: { type: 'string', description: 'The menu item UUID to delete.' },
        },
        required: ['item_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'toggle_item_availability',
      description: 'Toggle a menu item between available and unavailable.',
      parameters: {
        type: 'object',
        properties: {
          item_id: { type: 'string', description: 'The menu item UUID.' },
        },
        required: ['item_id'],
      },
    },
  },

  // --- DELIVERY ---
  {
    type: 'function',
    function: {
      name: 'get_delivery_settings',
      description: 'Get the current delivery configuration and all delivery fee zones.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_delivery_config',
      description: 'Update delivery settings: method, instructions, or pickup availability.',
      parameters: {
        type: 'object',
        properties: {
          delivery_method: { type: 'string', description: '"rider_collects" or "restaurant_delivers".' },
          delivery_instructions: { type: 'string', description: 'Delivery instructions text.' },
          offers_pickup: { type: 'boolean', description: 'Whether the restaurant offers pickup.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_delivery_zone',
      description: 'Add a new delivery location/zone with a fee.',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'Location/zone name (e.g. "Kado", "Wuse 2").' },
          fee: { type: 'number', description: 'Delivery fee in Naira.' },
        },
        required: ['location', 'fee'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_delivery_zone',
      description: 'Remove a delivery zone. IMPORTANT: Always ask the user for confirmation before calling this.',
      parameters: {
        type: 'object',
        properties: {
          zone_id: { type: 'string', description: 'The delivery fee UUID to remove.' },
        },
        required: ['zone_id'],
      },
    },
  },

  // --- FINANCE ---
  {
    type: 'function',
    function: {
      name: 'get_finance_summary',
      description: 'Get a financial summary: total revenue, paid orders, pending orders.',
      parameters: {
        type: 'object',
        properties: {
          period: { type: 'string', description: '"today", "week", "month", "all". Default "all".' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_transactions',
      description: 'Get a list of recent transactions/orders with payment details.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'integer', description: 'Max transactions to return. Default 10.' },
        },
      },
    },
  },

  // --- SETTINGS ---
  {
    type: 'function',
    function: {
      name: 'get_settings',
      description: 'Get the current business profile settings.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_settings',
      description: 'Update business profile settings. Only provide the fields you want to change.',
      parameters: {
        type: 'object',
        properties: {
          business_name: { type: 'string' },
          email: { type: 'string' },
          phone_number: { type: 'string' },
          address: { type: 'string' },
          cuisine: { type: 'string' },
          team_contact: { type: 'string' },
          open_time: { type: 'string', description: 'Opening time in HH:MM format.' },
          close_time: { type: 'string', description: 'Closing time in HH:MM format.' },
          open_days: { type: 'string', description: 'Comma-separated days the business is open (e.g. "Mon,Tue,Wed,Thu,Fri" or "Mon,Tue,Wed,Thu,Fri,Sat,Sun").' },
          agent_name: { type: 'string', description: 'Name of the AI ordering agent.' },
        },
      },
    },
  },
]

// =====================
// SYSTEM PROMPT BUILDER
// =====================

function buildSystemPrompt(client: any): string {
  return `You are the AI management assistant for **${client.business_name}**, a business on the Swift Order AI platform. You are speaking with the business owner/manager via Telegram.

## Your Role
You help the client manage their business — the same things they can do on their web dashboard:
- View and manage **orders** (check status, mark completed, etc.)
- Manage their **menu** (add items, update prices, toggle availability, delete items)
- Manage **delivery settings** (zones, fees, delivery method, pickup)
- View **financial summaries** (revenue, transactions)
- Update **business settings** (name, phone, address, hours, etc.)

## Rules
1. Always be friendly, professional, and concise. Use emojis sparingly for warmth.
2. When listing data (orders, menu items), format them cleanly with line breaks.
3. **Before destructive actions** (deleting menu items, removing delivery zones), ALWAYS ask for confirmation first. Do NOT call the delete/remove tool until the user explicitly confirms.
4. You CANNOT modify these protected fields: subscription status, payment/bank codes, trial dates, grace period, slug, or created_at.
5. You CANNOT process refunds without the user explicitly requesting it for a specific order.
6. Format currency as ₦ (Naira). Example: ₦2,500.
7. Keep responses concise — this is Telegram, not an email.
8. If you don't have enough info to complete a request, ask a follow-up question.
9. Use Telegram markdown: *bold*, _italic_, \`code\`.
10. When showing order/item lists, limit to the most relevant results and mention if there are more.

## Business Context
- Business: ${client.business_name}
- Cuisine: ${client.cuisine || 'Not set'}
- Address: ${client.address || 'Not set'}
- Phone: ${client.phone_number || 'Not set'}
- Operating Hours: ${client.open_time || '?'} - ${client.close_time || '?'} (Days: ${client.open_days?.join(', ') || 'Every day'})
- AI Agent Name: ${client.agent_name || 'Not set'}`
}

// =====================
// TOOL EXECUTION
// =====================

async function executeTool(
  toolName: string,
  args: any,
  clientId: string,
  supabase: any
): Promise<any> {
  switch (toolName) {

    // --- ORDERS ---
    case 'get_orders': {
      let query = supabase.from('orders').select('id, order_id, customer_name, customer_phone, total_amount, status, payment_status, items_summary, delivery_address, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(args.limit || 10)

      if (args.status) query = query.eq('status', args.status)
      if (args.search) query = query.ilike('customer_name', `%${args.search}%`)

      if (args.period && args.period !== 'all') {
        const now = new Date()
        let since: Date
        if (args.period === 'today') {
          since = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        } else if (args.period === 'week') {
          since = new Date(now.getTime() - 7 * 86400000)
        } else {
          since = new Date(now.getTime() - 30 * 86400000)
        }
        query = query.gte('created_at', since.toISOString())
      }

      const { data, error } = await query
      if (error) return { error: error.message }
      return { orders: data, count: data.length }
    }

    case 'get_order_details': {
      // Try by UUID first, then by order_id field
      let { data, error } = await supabase.from('orders').select('*')
        .eq('client_id', clientId)
        .eq('id', args.order_id)
        .single()

      if (error || !data) {
        const result = await supabase.from('orders').select('*')
          .eq('client_id', clientId)
          .eq('order_id', args.order_id)
          .single()
        data = result.data
        error = result.error
      }

      if (error) return { error: 'Order not found.' }
      return { order: data }
    }

    case 'update_order_status': {
      const validStatuses = ['In Progress', 'Out for Delivery', 'Completed', 'Cancelled']
      if (!validStatuses.includes(args.new_status)) {
        return { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }
      }
      const { error } = await supabase.from('orders')
        .update({ status: args.new_status })
        .eq('id', args.order_id)
        .eq('client_id', clientId)
      if (error) return { error: error.message }
      return { success: true, message: `Order status updated to "${args.new_status}".` }
    }

    // --- MENU ---
    case 'get_menu_items': {
      let query = supabase.from('menu_items').select('id, name, price, category, description, is_available, track_inventory, stock_level')
        .eq('client_id', clientId)
        .order('category', { ascending: true })

      if (args.category) query = query.ilike('category', `%${args.category}%`)
      if (args.available_only) query = query.eq('is_available', true)

      const { data, error } = await query
      if (error) return { error: error.message }
      return { items: data, count: data.length }
    }

    case 'add_menu_item': {
      const { data, error } = await supabase.from('menu_items')
        .insert({
          client_id: clientId,
          name: args.name,
          price: args.price,
          category: args.category || 'General',
          description: args.description || null,
          is_available: true,
        })
        .select()
        .single()
      if (error) return { error: error.message }
      return { success: true, item: data }
    }

    case 'update_menu_item': {
      const updates: any = {}
      if (args.name !== undefined) updates.name = args.name
      if (args.price !== undefined) updates.price = args.price
      if (args.category !== undefined) updates.category = args.category
      if (args.description !== undefined) updates.description = args.description
      if (args.is_available !== undefined) updates.is_available = args.is_available

      const { data, error } = await supabase.from('menu_items')
        .update(updates)
        .eq('id', args.item_id)
        .eq('client_id', clientId)
        .select()
        .single()
      if (error) return { error: error.message }
      return { success: true, item: data }
    }

    case 'delete_menu_item': {
      const { error } = await supabase.from('menu_items')
        .delete()
        .eq('id', args.item_id)
        .eq('client_id', clientId)
      if (error) return { error: error.message }
      return { success: true, message: 'Menu item deleted.' }
    }

    case 'toggle_item_availability': {
      // First get current state
      const { data: item } = await supabase.from('menu_items')
        .select('id, name, is_available')
        .eq('id', args.item_id)
        .eq('client_id', clientId)
        .single()

      if (!item) return { error: 'Item not found.' }

      const newVal = !item.is_available
      const { error } = await supabase.from('menu_items')
        .update({ is_available: newVal })
        .eq('id', args.item_id)
      if (error) return { error: error.message }
      return { success: true, item_name: item.name, is_available: newVal }
    }

    // --- DELIVERY ---
    case 'get_delivery_settings': {
      const [configRes, feesRes] = await Promise.all([
        supabase.from('clients')
          .select('delivery_method, delivery_instructions, offers_pickup, delivery_fee_image_url')
          .eq('id', clientId)
          .single(),
        supabase.from('delivery_fees')
          .select('id, location, fee')
          .eq('client_id', clientId)
          .order('location', { ascending: true }),
      ])
      return {
        config: configRes.data,
        zones: feesRes.data || [],
        zone_count: feesRes.data?.length || 0,
      }
    }

    case 'update_delivery_config': {
      const updates: any = {}
      if (args.delivery_method !== undefined) updates.delivery_method = args.delivery_method
      if (args.delivery_instructions !== undefined) updates.delivery_instructions = args.delivery_instructions
      if (args.offers_pickup !== undefined) updates.offers_pickup = args.offers_pickup

      const { error } = await supabase.from('clients')
        .update(updates)
        .eq('id', clientId)
      if (error) return { error: error.message }
      return { success: true, message: 'Delivery settings updated.' }
    }

    case 'add_delivery_zone': {
      const { data, error } = await supabase.from('delivery_fees')
        .insert({ client_id: clientId, location: args.location, fee: args.fee })
        .select()
        .single()
      if (error) return { error: error.message }
      return { success: true, zone: data }
    }

    case 'remove_delivery_zone': {
      const { error } = await supabase.from('delivery_fees')
        .delete()
        .eq('id', args.zone_id)
        .eq('client_id', clientId)
      if (error) return { error: error.message }
      return { success: true, message: 'Delivery zone removed.' }
    }

    // --- FINANCE ---
    case 'get_finance_summary': {
      let query = supabase.from('orders').select('total_amount, payment_status, created_at')
        .eq('client_id', clientId)

      if (args.period && args.period !== 'all') {
        const now = new Date()
        let since: Date
        if (args.period === 'today') {
          since = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        } else if (args.period === 'week') {
          since = new Date(now.getTime() - 7 * 86400000)
        } else {
          since = new Date(now.getTime() - 30 * 86400000)
        }
        query = query.gte('created_at', since.toISOString())
      }

      const { data, error } = await query
      if (error) return { error: error.message }

      const paid = data.filter((o: any) => o.payment_status === 'Paid')
      const pending = data.filter((o: any) => o.payment_status !== 'Paid' && o.payment_status !== 'Refunded')
      return {
        total_revenue: paid.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0),
        paid_orders: paid.length,
        pending_orders: pending.length,
        total_orders: data.length,
        period: args.period || 'all',
      }
    }

    case 'get_transactions': {
      const { data, error } = await supabase.from('orders')
        .select('id, order_id, customer_name, total_amount, payment_status, status, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(args.limit || 10)
      if (error) return { error: error.message }
      return { transactions: data, count: data.length }
    }

    // --- SETTINGS ---
    case 'get_settings': {
      const { data, error } = await supabase.from('clients')
        .select('business_name, email, phone_number, address, cuisine, team_contact, open_time, close_time, open_days, agent_name, logo_url')
        .eq('id', clientId)
        .single()
      if (error) return { error: error.message }
      return { settings: data }
    }

    case 'update_settings': {
      const allowedFields = ['business_name', 'email', 'phone_number', 'address', 'cuisine', 'team_contact', 'open_time', 'close_time', 'open_days', 'agent_name']
      const updates: any = {}
      for (const field of allowedFields) {
        if (args[field] !== undefined) {
          if (field === 'open_days' && typeof args[field] === 'string') {
            // Convert comma-separated string to array
            updates[field] = args[field].split(',').map((day: string) => day.trim())
          } else if (field.endsWith('_time') && args[field] && !args[field].includes(':')) {
            updates[field] = args[field] + ':00'
          } else {
            updates[field] = args[field]
          }
        }
      }
      if (Object.keys(updates).length === 0) return { error: 'No valid fields to update.' }

      const { error } = await supabase.from('clients')
        .update(updates)
        .eq('id', clientId)
      if (error) return { error: error.message }
      return { success: true, updated_fields: Object.keys(updates) }
    }

    default:
      return { error: `Unknown tool: ${toolName}` }
  }
}

// =====================
// CONVERSATION MEMORY
// =====================

async function loadConversationHistory(supabase: any, clientId: string): Promise<any[]> {
  const { data } = await supabase
    .from('telegram_conversations')
    .select('role, content')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(MAX_HISTORY_MESSAGES)

  if (!data || data.length === 0) return []

  // Reverse so oldest first (they came DESC)
  return data.reverse().map((msg: any) => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: msg.content,
  }))
}

async function saveMessage(supabase: any, clientId: string, role: string, content: string) {
  await supabase.from('telegram_conversations').insert({
    client_id: clientId,
    role,
    content,
  })
}

// =====================
// OPENROUTER API CALL
// =====================

async function callOpenRouter(systemPrompt: string, history: any[], userMessage: string) {
  const messages = [
    ...history,
    { role: 'user', content: userMessage },
  ]

  const requestBody: any = {
    model: OPENROUTER_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    tools: toolDeclarations,
    temperature: 0.7,
    max_tokens: 1024,
  }

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error('[OPENROUTER] API error:', errText)
    throw new Error('Failed to call OpenRouter API')
  }

  return await res.json()
}

async function callOpenRouterWithToolResults(systemPrompt: string, history: any[], userMessage: string, toolResults: any[]) {
  const messages = [
    ...history,
    { role: 'user', content: userMessage },
    ...toolResults,
  ]

  const requestBody: any = {
    model: OPENROUTER_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    tools: toolDeclarations,
    temperature: 0.7,
    max_tokens: 1024,
  }

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error('[OPENROUTER] API error (with tools):', errText)
    throw new Error('Failed to call OpenRouter API')
  }

  return await res.json()
}

// =====================
// MAIN HANDLER
// =====================

Deno.serve(async (req: Request) => {
  if (req.method === 'GET') {
    return new Response('Telegram Agent Webhook is ACTIVE.', { status: 200 })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const body = await req.json()
    const message = body.message

    if (!message) {
      return new Response('OK', { status: 200 })
    }

    const chatId = message.chat.id
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // ---- HANDLE /start COMMAND (account linking) ----
    if (message.text && message.text.startsWith('/start ')) {
      const clientId = message.text.split(' ')[1]

      if (clientId) {
        const { error } = await supabase
          .from('clients')
          .update({ telegram_chat_id: chatId.toString() })
          .eq('id', clientId)

        const replyText = error
          ? "❌ Couldn't link your account. Please ensure you used the link from your dashboard."
          : "✅ *Welcome to Swift Order AI!*\n\nYour account has been linked. You'll receive order notifications here.\n\nYou can also manage your business right from this chat! Try:\n• _\"Show me today's orders\"_\n• _\"Add a new menu item\"_\n• _\"What's my revenue this week?\"_"

        await sendTelegramMessage(chatId, replyText)
      }

      return new Response('OK', { status: 200 })
    }

    // ---- IDENTIFY CLIENT ----
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, business_name, cuisine, address, phone_number, open_time, close_time, agent_name, status')
      .eq('telegram_chat_id', chatId.toString())
      .single()

    if (clientError || !client) {
      await sendTelegramMessage(chatId, "⚠️ Your Telegram account isn't linked to any Swift Order AI business. Please link it from your dashboard settings first.")
      return new Response('OK', { status: 200 })
    }

    // ---- EXTRACT USER MESSAGE ----
    let userMessage = ''

    if (message.text) {
      userMessage = message.text
    } else if (message.voice) {
      // Voice note — download and transcribe
      userMessage = '[Voice note received — voice transcription is coming soon. Please type your message for now.]'
    } else if (message.photo) {
      // Photo — get the highest resolution
      const photo = message.photo[message.photo.length - 1]
      const caption = message.caption || ''
      userMessage = caption ? `[Photo sent with caption: "${caption}"]` : '[Photo sent without caption]'
    } else {
      // Unsupported message type
      await sendTelegramMessage(chatId, "I can understand text messages for now. Please type your request! 😊")
      return new Response('OK', { status: 200 })
    }

    // ---- SHOW TYPING ----
    await sendTelegramAction(chatId)

    // ---- LOAD HISTORY & BUILD CONTEXT ----
    const history = await loadConversationHistory(supabase, client.id)
    const systemPrompt = buildSystemPrompt(client)

    // ---- CALL OPENROUTER ----
    let messages = [
      ...history,
      { role: 'user', content: userMessage },
    ]

    let finalText = ''
    let rounds = 0
    const MAX_ROUNDS = 3

    while (rounds < MAX_ROUNDS) {
      const requestBody = {
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        tools: toolDeclarations,
        temperature: 0.7,
        max_tokens: 1024,
      }

      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!res.ok) {
        const errText = await res.text()
        console.error('[OPENROUTER] API error:', errText)
        throw new Error('Failed to call OpenRouter API')
      }

      const openRouterResponse = await res.json()
      console.log(`[OPENROUTER] Response (round ${rounds + 1}):`, JSON.stringify(openRouterResponse, null, 2))

      const choice = openRouterResponse.choices?.[0]
      if (!choice) throw new Error('No response from OpenRouter')

      const assistantMessage = choice.message
      const toolCalls = assistantMessage.tool_calls || []

      // If no tool calls, extract final text and break
      if (toolCalls.length === 0) {
        finalText = assistantMessage.content || "I'm not sure how to help with that. Could you rephrase?"
        // Add assistant response to messages for history
        messages.push({ role: 'assistant', content: finalText })
        break
      }

      // Process tool calls
      console.log(`Tool calls (round ${rounds + 1}):`, toolCalls.map((tc: any) => tc.function.name))
      messages.push({ role: 'assistant', content: assistantMessage.content || '', tool_calls: toolCalls })

      const toolResults: any[] = []
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name
        let toolArgs = {}
        try {
          toolArgs = JSON.parse(toolCall.function.arguments)
        } catch (e) {
          console.error(`Failed to parse tool arguments: ${toolCall.function.arguments}`)
        }

        console.log(`Executing tool: ${toolName}`, toolArgs)
        const result = await executeTool(toolName, toolArgs, client.id, supabase)
        console.log(`Tool result for ${toolName}:`, JSON.stringify(result).slice(0, 200))

        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        })
      }

      messages.push(...toolResults)
      rounds++
    }

    // ---- EXTRACT FINAL TEXT IF NOT ALREADY SET ----
    if (!finalText) {
      finalText = "I'm not sure how to help with that. Could you rephrase?"
    }

    // ---- SAVE CONVERSATION ----
    await saveMessage(supabase, client.id, 'user', userMessage)
    await saveMessage(supabase, client.id, 'assistant', finalText)

    // ---- SEND REPLY ----
    // Telegram has a 4096 char limit, split if needed
    if (finalText.length <= 4096) {
      await sendTelegramMessage(chatId, finalText)
    } else {
      // Split into chunks
      const chunks = finalText.match(/.{1,4000}/gs) || [finalText]
      for (const chunk of chunks) {
        await sendTelegramMessage(chatId, chunk)
      }
    }

    return new Response('OK', { status: 200 })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Telegram agent error:', message)

    // Try to notify the user about the error
    try {
      const body = await req.clone().json()
      const chatId = body?.message?.chat?.id
      if (chatId) {
        await sendTelegramMessage(chatId, "⚠️ Something went wrong on my end. Please try again in a moment.")
      }
    } catch (_) { /* silently fail */ }

    return new Response('OK', { status: 200 }) // Always return 200 to Telegram
  }
})
