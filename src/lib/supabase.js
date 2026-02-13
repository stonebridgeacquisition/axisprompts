import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fix for supabase-js v2.95.x: navigator.locks causes "AbortError: signal is aborted without reason"
// Replace navigator.locks entirely with a simple pass-through that never blocks
if (typeof globalThis.navigator !== 'undefined' && globalThis.navigator.locks) {
    globalThis.navigator.locks.request = async (_name, _options, callback) => {
        // If called with (name, callback) instead of (name, options, callback)
        const cb = typeof _options === 'function' ? _options : callback;
        if (typeof cb === 'function') {
            return await cb();
        }
    };
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
