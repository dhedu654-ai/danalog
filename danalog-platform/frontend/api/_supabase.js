import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nmtuclcfzmxshighzqql.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_v6r7HO9sgpFDN6KX3eN1bg_6BRakt8M';

if (!globalThis.supabaseClient) {
    globalThis.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const supabase = globalThis.supabaseClient;
