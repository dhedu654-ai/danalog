import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nmtuclcfzmxshighzqql.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_v6r7HO9sgpFDN6KX3eN1bg_6BRakt8M';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
