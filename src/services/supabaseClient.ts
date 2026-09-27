import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default configuration with the user-provided Supabase project credentials
export const DEFAULT_SUPABASE_URL = 'https://ofukieepxjawzqtlrgqy.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_sJLr9rPnGL-rVkNcQPcL0w_Q8KC7_el';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || DEFAULT_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export interface SupabaseHealthResult {
  reachable: boolean;
  authenticated: boolean;
  tablesExist: boolean;
  tableCount?: number;
  url: string;
  keyPrefix: string;
  error?: string | null;
}

export const SUPABASE_SETUP_SQL = `-- Script SQL para ativar persistência do Sistema Korisko no Supabase
-- Copie e cole este código no SQL Editor do seu projeto Supabase e clique em RUN:

-- 1. Tabela para estado completo da padaria (produtos, vendas, caixa, comandas, etc.)
CREATE TABLE IF NOT EXISTS public.korisko_system_state (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela para histórico de pontos de restauração e snapshots
CREATE TABLE IF NOT EXISTS public.korisko_backup_points (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar segurança em nível de linha (RLS) com acesso liberado para leitura e escrita
ALTER TABLE public.korisko_system_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.korisko_backup_points ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de permissão para a chave pública/anon
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'korisko_system_state' AND policyname = 'Allow public access korisko_system_state'
  ) THEN
    CREATE POLICY "Allow public access korisko_system_state" ON public.korisko_system_state
      FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'korisko_backup_points' AND policyname = 'Allow public access korisko_backup_points'
  ) THEN
    CREATE POLICY "Allow public access korisko_backup_points" ON public.korisko_backup_points
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
`;

/**
 * Checks connectivity to the Supabase instance and validates if tables are created
 */
export async function checkSupabaseHealth(): Promise<SupabaseHealthResult> {
  try {
    const { data, error } = await supabase
      .from('korisko_system_state')
      .select('id')
      .limit(1);

    if (error) {
      // Table doesn't exist yet (PGRST205 or 42P01)
      if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
        return {
          reachable: true,
          authenticated: true,
          tablesExist: false,
          url: supabaseUrl,
          keyPrefix: supabaseAnonKey.slice(0, 16) + '...',
          error: 'Tabela korisko_system_state ainda não criada no Supabase.',
        };
      }

      return {
        reachable: true,
        authenticated: false,
        tablesExist: false,
        url: supabaseUrl,
        keyPrefix: supabaseAnonKey.slice(0, 16) + '...',
        error: error.message,
      };
    }

    return {
      reachable: true,
      authenticated: true,
      tablesExist: true,
      tableCount: data ? data.length : 0,
      url: supabaseUrl,
      keyPrefix: supabaseAnonKey.slice(0, 16) + '...',
      error: null,
    };
  } catch (err: any) {
    return {
      reachable: false,
      authenticated: false,
      tablesExist: false,
      url: supabaseUrl,
      keyPrefix: supabaseAnonKey.slice(0, 16) + '...',
      error: err.message || 'Falha ao conectar com o Supabase',
    };
  }
}

/**
 * Load system state from Supabase
 */
export async function fetchStateFromSupabase(): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('korisko_system_state')
      .select('data, updated_at')
      .eq('id', 'active_state')
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data.data;
  } catch {
    return null;
  }
}

/**
 * Persist system state to Supabase
 */
export async function saveStateToSupabase(stateData: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('korisko_system_state')
      .upsert({
        id: 'active_state',
        data: stateData,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase Sync Warning]:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[Supabase Sync Exception]:', err);
    return false;
  }
}

/**
 * Save backup snapshot point to Supabase
 */
export async function saveBackupPointToSupabase(point: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('korisko_backup_points')
      .upsert({
        id: point.id,
        data: point,
        created_at: point.timestamp || new Date().toISOString(),
      }, { onConflict: 'id' });

    return !error;
  } catch {
    return false;
  }
}

/**
 * Load backup snapshots from Supabase
 */
export async function fetchBackupPointsFromSupabase(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('korisko_backup_points')
      .select('data')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error || !data) return [];
    return data.map((row: any) => row.data);
  } catch {
    return [];
  }
}
