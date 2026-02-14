import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env manually
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        process.env[key.trim()] = value.trim();
    }
});

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
    const email = "esskvy111@gmail.com";
    const { data, error } = await supabase
        .from("clients")
        .select("business_name, email, paystack_subaccount_code")
        .eq("email", email)
        .single();

    if (error) {
        console.error("Error fetching client:", error);
    } else {
        console.log("Client found:", data);
        if (!data.paystack_subaccount_code) {
            console.warn("WARNING: No subaccount code set for this client!");
        } else {
            console.log("Success: Subaccount code is set.");
        }
    }
}

check();
