import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const businessId = "31299f88-fba2-4644-b1bc-5660e1f1145a";
    const { data, error } = await supabase
        .from("clients")
        .select("id, whatsapp_verify_token, business_name")
        .eq("id", businessId)
        .single();
    
    console.log("Error:", error);
    console.log("Data:", data);
}
check();
