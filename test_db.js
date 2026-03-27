import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function check() {
    console.log("--- orders ---");
    let res = await supabase.from("orders").select("*").limit(1);
    console.log(Object.keys(res.data?.[0] || {}));
    console.log("--- menu_items ---");
    res = await supabase.from("menu_items").select("*").limit(1);
    console.log(Object.keys(res.data?.[0] || {}));
    console.log("--- delivery_fees ---");
    res = await supabase.from("delivery_fees").select("*").limit(1);
    console.log(Object.keys(res.data?.[0] || {}));
}
check();
