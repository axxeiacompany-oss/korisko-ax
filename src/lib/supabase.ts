import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_DEFAULT_URL = 'https://lmbpvdpmrdfxfqednwxd.supabase.co';
export const SUPABASE_DEFAULT_ANON_KEY = 'sb_publishable_l0-nPS9D5LQAC_AvzAyYWA_MXIFG0lm';
export const DEFAULT_SUPABASE_URL = SUPABASE_DEFAULT_URL;
export const DEFAULT_SUPABASE_ANON_KEY = SUPABASE_DEFAULT_ANON_KEY;

export function normalizeSupabaseUrl(url?: string): string {
  if (!url) return SUPABASE_DEFAULT_URL;
  return url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

export function getStoredSupabaseConfig(): { url: string; anonKey: string; isCustom: boolean } {
  let customUrl = '';
  let customKey = '';
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      customUrl = window.localStorage.getItem('KORISKO_CUSTOM_SUPABASE_URL') || '';
      customKey = window.localStorage.getItem('KORISKO_CUSTOM_SUPABASE_ANON_KEY') || '';
    }
  } catch {}

  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
    (typeof process !== 'undefined' && (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL));
  const envKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
    (typeof process !== 'undefined' && (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY));

  const isCustom = Boolean(customUrl && customKey);
  return {
    url: normalizeSupabaseUrl(customUrl || envUrl || SUPABASE_DEFAULT_URL),
    anonKey: (customKey || envKey || SUPABASE_DEFAULT_ANON_KEY).trim(),
    isCustom,
  };
}

let activeConfig = getStoredSupabaseConfig();
let activeClient: SupabaseClient = createClient(activeConfig.url, activeConfig.anonKey);

export function setCustomSupabaseCredentials(url: string, anonKey: string): SupabaseClient {
  const normUrl = normalizeSupabaseUrl(url);
  const cleanKey = anonKey.trim();
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('KORISKO_CUSTOM_SUPABASE_URL', normUrl);
      window.localStorage.setItem('KORISKO_CUSTOM_SUPABASE_ANON_KEY', cleanKey);
    }
  } catch {}
  activeConfig = { url: normUrl, anonKey: cleanKey, isCustom: true };
  activeClient = createClient(normUrl, cleanKey);
  return activeClient;
}

export function resetToDefaultSupabaseCredentials(): SupabaseClient {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('KORISKO_CUSTOM_SUPABASE_URL');
      window.localStorage.removeItem('KORISKO_CUSTOM_SUPABASE_ANON_KEY');
    }
  } catch {}
  activeConfig = { url: SUPABASE_DEFAULT_URL, anonKey: SUPABASE_DEFAULT_ANON_KEY, isCustom: false };
  activeClient = createClient(SUPABASE_DEFAULT_URL, SUPABASE_DEFAULT_ANON_KEY);
  return activeClient;
}

export function getActiveClient(): SupabaseClient {
  return activeClient;
}

// Proxied client instance so calls to supabase.from, supabase.rpc, etc. always use the activeClient
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const val = (activeClient as any)[prop];
    if (typeof val === 'function') {
      return val.bind(activeClient);
    }
    return val;
  }
});
