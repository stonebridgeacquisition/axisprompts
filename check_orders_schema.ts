
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env
const envPath = path.resolve(process.cwd(), '.env');
console.log('Reading .env from:', envPath);

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
} else {
    console.error('.env file not found!');
}

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

console.log('URL:', url ? 'Loaded' : 'Missing');
console.log('Key:', key ? 'Loaded' : 'Missing');

if (!url || !key) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
    const { data, error } = await supabase.from('orders').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
    } else {
        // Check if empty, if so, print fields from error message if possible or just log empty
        if (data.length === 0) {
            console.log('No orders found, cannot infer schema from data. Printing error to see if it lists columns...');
            // Try to insert invalid column to force schema error
            const { error: schemaError } = await supabase.from('orders').select('non_existent_column').limit(1);
            if (schemaError) {
                console.log('Schema Hint:', schemaError.message);
            }
        } else {
            console.log('Order Data Sample:', JSON.stringify(data[0], null, 2));
        }
    }
}

check();
