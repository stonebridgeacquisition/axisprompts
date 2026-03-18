import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
    const { data: messages, error } = await supabase
        .from('chat_messages')
        .select(`content, role, session_id, created_at, chat_sessions!inner(client_id, clients!inner(business_name, agent_name))`)
        .order('created_at', { ascending: false })
        .limit(10);
    
    if (error) {
        console.error("Error fetching messages:", error);
    } else {
        console.log("Latest AI messages:\n");
        messages.forEach(m => {
            if (m.role === 'assistant') {
                console.log(`[BUSINESS: ${m.chat_sessions.clients.business_name} | AGENT: ${m.chat_sessions.clients.agent_name}]`);
                console.log(`Time: ${m.created_at}`);
                console.log(`Content: ${m.content}\n-----------------------`);
            }
        });
    }
}

main().catch(console.error);
