import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        })
    }

    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 })
    }

    try {
        const { subaccount_code, bank_code, account_number, business_name, percentage_charge } = await req.json()

        if (!subaccount_code || !bank_code || !account_number) {
            return new Response(JSON.stringify({ error: 'subaccount_code, bank_code, and account_number are required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            })
        }

        console.log(`Updating subaccount ${subaccount_code}: bank=${bank_code}, acct=${account_number}, split=${percentage_charge}`)

        // Call Paystack Update Subaccount API
        const payload: Record<string, any> = {
            settlement_bank: bank_code,
            account_number: account_number,
        }
        if (business_name) payload.business_name = business_name
        if (percentage_charge !== undefined && percentage_charge !== null) payload.percentage_charge = percentage_charge

        const paystackRes = await fetch(`https://api.paystack.co/subaccount/${subaccount_code}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${PAYSTACK_SECRET}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        const paystackData = await paystackRes.json()

        if (!paystackData.status) {
            console.error('Paystack update failed:', paystackData)
            return new Response(JSON.stringify({
                error: paystackData.message || 'Failed to update Paystack subaccount'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            })
        }

        console.log('Paystack subaccount updated:', paystackData.data?.subaccount_code)

        return new Response(JSON.stringify({
            message: 'Subaccount updated successfully',
            subaccount: paystackData.data
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })

    } catch (err) {
        console.error('Update subaccount error:', err)
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
    }
})
