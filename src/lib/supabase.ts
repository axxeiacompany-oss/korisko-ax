import { createClient } from '@supabase/supabase-js';

const SUPABASE_DEFAULT_URL = 'https://lmbpvdpmrdfxfqednwxd.supabase.co';
const SUPABASE_DEFAULT_ANON_KEY = 'sb_publishable_l0-nPS9D5LQAC_AvzAyYWA_MXIFG0lm';

function normalizeSupabaseUrl(url?: string): string {
  if (!url) return SUPABASE_DEFAULT_URL;
  return url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

const supabaseUrl = normalizeSupabaseUrl(
  import.meta.env.VITE_SUPABASE_URL || SUPABASE_DEFAULT_URL
);

const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_DEFAULT_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
