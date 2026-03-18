import 'dotenv/config';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
    console.log("Fetching ModiBrandy client...");
    const { data: client, error } = await supabase
        .from('clients')
        .select('*')
        .ilike('business_name', 'modibrandy%')
        .single();
    
    if (error || !client) {
        console.error("Could not find ModiBrandy client!", error);
        return;
    }

    console.log("Found client ID:", client.id);

    console.log("Updating agent_name to 'Jade'...");
    await supabase.from('clients').update({ agent_name: 'Jade' }).eq('id', client.id);

    console.log("Reading new universal prompt...");
    const promptContent = fs.readFileSync('agent-prompt.md', 'utf-8');

    console.log("Updating brand_prompts table...");
    const { data: existingPrompt } = await supabase
        .from('brand_prompts')
        .select('*')
        .eq('client_id', client.id)
        .single();

    if (existingPrompt) {
        await supabase.from('brand_prompts').update({ system_prompt: promptContent }).eq('client_id', client.id);
        console.log("Updated existing prompt for ModiBrandy.");
    } else {
        await supabase.from('brand_prompts').insert({ client_id: client.id, system_prompt: promptContent });
        console.log("Inserted new prompt for ModiBrandy.");
    }

    console.log("Done configuring ModiBrandy!");
}

main().catch(console.error);
