import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default configuration with the user-provided Supabase project credentials
export const DEFAULT_SUPABASE_URL = 'https://lmbpvdpmrdfxfqednwxd.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_l0-nPS9D5LQAC_AvzAyYWA_MXIFG0lm';

/**
 * Normalizes Supabase URL, removing any /rest/v1 or trailing slashes
 */
export function normalizeSupabaseUrl(url: string): string {
  if (!url) return DEFAULT_SUPABASE_URL;
  return url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

const rawEnvUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || DEFAULT_SUPABASE_URL;
export const supabaseUrl = normalizeSupabaseUrl(rawEnvUrl);
export const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || DEFAULT_SUPABASE_ANON_KEY;

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

export const SUPABASE_SETUP_SQL = `-- ==============================================================================
-- KORISKO ERP & PDV - SCRIPT DE CRIAÇÃO DE TABELAS FUNCIONAIS NO SUPABASE
-- Copie e cole este código no SQL Editor do seu projeto Supabase e clique em RUN.
-- Ao rodar, as tabelas aparecerão no "Table Editor" para gestão visual e edição direta.
-- ==============================================================================

-- 1. TABELA FUNCIONAL DE USUÁRIOS E OPERADORES (Table Editor -> usuarios)
CREATE TABLE IF NOT EXISTS public.usuarios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'caixa', -- 'admin', 'gerente', 'caixa', 'padeiro'
  password TEXT NOT NULL,
  pin TEXT,
  avatar_color TEXT DEFAULT 'bg-indigo-600',
  allowed_features JSONB DEFAULT '["dashboard","pdv","venda_direta","crm"]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir / Atualizar usuários iniciais (Admin Geral Ax e Operador Caixa)
INSERT INTO public.usuarios (id, name, email, role, password, pin, avatar_color, allowed_features, active)
VALUES 
  (
    'emp-admin-ax',
    'Ax',
    'axxeiacompany@gmail.com',
    'admin',
    '9APG_47z-EgF4yz',
    '9APG_47z-EgF4yz',
    'bg-indigo-600',
    '["dashboard","pdv","venda_direta","estoque","fichas_tecnicas","crm","caixa","mais_vendidos","metas","cambio","backup","afiliados"]'::jsonb,
    true
  ),
  (
    'emp-1790618698985',
    'claudia',
    'claudia@korisko.com',
    'caixa',
    '446183',
    '446183',
    'bg-emerald-600',
    '["dashboard","pdv","venda_direta","crm"]'::jsonb,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  password = EXCLUDED.password,
  pin = EXCLUDED.pin,
  avatar_color = EXCLUDED.avatar_color,
  allowed_features = EXCLUDED.allowed_features,
  updated_at = NOW();

-- 2. TABELA FUNCIONAL DE PRODUTOS & ESTOQUE (Table Editor -> produtos)
CREATE TABLE IF NOT EXISTS public.produtos (
  id TEXT PRIMARY KEY,
  code TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'paes',
  price_brl NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  cost_price_brl NUMERIC(12, 2) DEFAULT 0.00,
  stock NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
  min_stock NUMERIC(12, 3) DEFAULT 0.000,
  unit TEXT NOT NULL DEFAULT 'un',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA FUNCIONAL DE CLIENTES & CRM (Table Editor -> clientes)
CREATE TABLE IF NOT EXISTS public.clientes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  credit_limit_brl NUMERIC(12, 2) DEFAULT 0.00,
  outstanding_balance_brl NUMERIC(12, 2) DEFAULT 0.00,
  loyalty_points INTEGER DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA FUNCIONAL DE VENDAS (Table Editor -> vendas)
CREATE TABLE IF NOT EXISTS public.vendas (
  id TEXT PRIMARY KEY,
  sale_number TEXT,
  subtotal_brl NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  discount_brl NUMERIC(12, 2) DEFAULT 0.00,
  total_brl NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  employee_id TEXT,
  employee_name TEXT,
  customer_id TEXT,
  customer_name TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  payments JSONB NOT NULL DEFAULT '[]'::jsonb,
  change_given JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA FUNCIONAL DE SESSÕES DE CAIXA (Table Editor -> caixa_sessoes)
CREATE TABLE IF NOT EXISTS public.caixa_sessoes (
  id TEXT PRIMARY KEY,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  opened_by_id TEXT,
  opened_by_name TEXT,
  initial_cash_brl NUMERIC(12, 2) DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'aberto',
  total_sales_brl NUMERIC(12, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELAS DE ESTADO GLOBAL E BACKUP (Sincronização em tempo real do Frontend)
CREATE TABLE IF NOT EXISTS public.korisko_system_state (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.korisko_backup_points (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. HABILITAR SEGURANÇA EM NÍVEL DE LINHA (RLS)
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.korisko_system_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.korisko_backup_points ENABLE ROW LEVEL SECURITY;

-- 8. POLÍTICAS DE ACESSO PARA CHAVE PÚBLICA (ANON)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'usuarios' AND policyname = 'Allow public access usuarios') THEN
    CREATE POLICY "Allow public access usuarios" ON public.usuarios FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'produtos' AND policyname = 'Allow public access produtos') THEN
    CREATE POLICY "Allow public access produtos" ON public.produtos FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clientes' AND policyname = 'Allow public access clientes') THEN
    CREATE POLICY "Allow public access clientes" ON public.clientes FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendas' AND policyname = 'Allow public access vendas') THEN
    CREATE POLICY "Allow public access vendas" ON public.vendas FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'caixa_sessoes' AND policyname = 'Allow public access caixa_sessoes') THEN
    CREATE POLICY "Allow public access caixa_sessoes" ON public.caixa_sessoes FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'korisko_system_state' AND policyname = 'Allow public access korisko_system_state') THEN
    CREATE POLICY "Allow public access korisko_system_state" ON public.korisko_system_state FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'korisko_backup_points' AND policyname = 'Allow public access korisko_backup_points') THEN
    CREATE POLICY "Allow public access korisko_backup_points" ON public.korisko_backup_points FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
`;

/**
 * Checks connectivity to the Supabase instance and validates if tables are created
 */
export async function checkSupabaseHealth(): Promise<SupabaseHealthResult> {
  try {
    // Check both system state and functional usuarios table
    const [stateCheck, userCheck] = await Promise.all([
      supabase.from('korisko_system_state').select('id').limit(1),
      supabase.from('usuarios').select('id').limit(1)
    ]);

    const hasStateTable = !stateCheck.error;
    const hasUserTable = !userCheck.error;

    if (!hasStateTable && !hasUserTable) {
      const errorMsg = stateCheck.error?.message || userCheck.error?.message || '';
      if (errorMsg.includes('schema cache') || errorMsg.includes('does not exist')) {
        return {
          reachable: true,
          authenticated: true,
          tablesExist: false,
          url: supabaseUrl,
          keyPrefix: supabaseAnonKey.slice(0, 16) + '...',
          error: 'Tabelas (usuarios e korisko_system_state) ainda não criadas no Supabase. Execute o script no SQL Editor.',
        };
      }

      return {
        reachable: true,
        authenticated: false,
        tablesExist: false,
        url: supabaseUrl,
        keyPrefix: supabaseAnonKey.slice(0, 16) + '...',
        error: errorMsg || 'Falha de autenticação no Supabase',
      };
    }

    return {
      reachable: true,
      authenticated: true,
      tablesExist: true,
      tableCount: (hasStateTable ? 1 : 0) + (hasUserTable ? 1 : 0),
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
 * Load system state from Supabase, synchronizing with the functional 'usuarios' table from Table Editor
 */
export async function fetchStateFromSupabase(): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('korisko_system_state')
      .select('data, updated_at')
      .eq('id', 'active_state')
      .maybeSingle();

    if (error || !data) {
      // Fallback: If only functional 'usuarios' table was created in Supabase
      try {
        const { data: dbUsers } = await supabase.from('usuarios').select('*');
        if (Array.isArray(dbUsers) && dbUsers.length > 0) {
          return {
            employees: dbUsers.map((u: any) => ({
              id: u.id,
              name: u.name,
              email: u.email || '',
              role: u.role || 'caixa',
              password: u.password,
              pin: u.pin || u.password,
              avatarColor: u.avatar_color || 'bg-indigo-600',
              allowedFeatures: Array.isArray(u.allowed_features) ? u.allowed_features : ['dashboard', 'pdv', 'venda_direta', 'crm']
            }))
          };
        }
      } catch {}
      return null;
    }

    const state = data.data;

    // Check if user edited or added employees directly in Supabase Table Editor (usuarios)
    try {
      const { data: dbUsers } = await supabase.from('usuarios').select('*');
      if (Array.isArray(dbUsers) && dbUsers.length > 0 && state) {
        state.employees = dbUsers.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email || '',
          role: u.role || 'caixa',
          password: u.password,
          pin: u.pin || u.password,
          avatarColor: u.avatar_color || 'bg-indigo-600',
          allowedFeatures: Array.isArray(u.allowed_features) ? u.allowed_features : ['dashboard', 'pdv', 'venda_direta', 'crm']
        }));
      }
    } catch {
      // Functional table optional until user runs the script
    }

    return state;
  } catch {
    return null;
  }
}

/**
 * Persist system state to Supabase and sync functional 'usuarios' table for Table Editor
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

    // Sync to functional 'usuarios' table for direct viewing and editing in Supabase Table Editor
    if (Array.isArray(stateData.employees) && stateData.employees.length > 0) {
      try {
        const userRows = stateData.employees.map((e: any) => ({
          id: e.id,
          name: e.name,
          email: e.email || null,
          role: e.role || 'caixa',
          password: e.password || e.pin || '',
          pin: e.pin || null,
          avatar_color: e.avatarColor || 'bg-indigo-600',
          allowed_features: e.allowedFeatures || [],
          active: true,
          updated_at: new Date().toISOString()
        }));

        await supabase.from('usuarios').upsert(userRows, { onConflict: 'id' });
      } catch {
        // Non-blocking if table is not yet created
      }
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

/**
 * Execute an immediate test write and read against Supabase to verify connectivity and latency
 */
export async function testSupabaseReadWrite(): Promise<{
  success: boolean;
  latencyMs: number;
  message: string;
  error?: string;
}> {
  const t0 = performance.now();
  try {
    const testId = `ping-test-${Date.now()}`;
    const pingData = { test: true, timestamp: new Date().toISOString() };

    // 1. Test Write
    const { error: writeError } = await supabase
      .from('korisko_backup_points')
      .upsert({
        id: testId,
        data: pingData,
        created_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (writeError) {
      return {
        success: false,
        latencyMs: Math.round(performance.now() - t0),
        message: 'Falha na gravação no Supabase: ' + writeError.message,
        error: writeError.message,
      };
    }

    // 2. Test Read
    const { data: readData, error: readError } = await supabase
      .from('korisko_backup_points')
      .select('id, data')
      .eq('id', testId)
      .maybeSingle();

    if (readError || !readData) {
      return {
        success: false,
        latencyMs: Math.round(performance.now() - t0),
        message: 'Falha na leitura no Supabase: ' + (readError?.message || 'Registro não encontrado'),
        error: readError?.message,
      };
    }

    // 3. Cleanup test ping
    await supabase.from('korisko_backup_points').delete().eq('id', testId);

    const latencyMs = Math.round(performance.now() - t0);
    return {
      success: true,
      latencyMs,
      message: `Comunicação com Supabase 100% verificada! Gravação, leitura e confirmação em ${latencyMs}ms.`,
    };
  } catch (err: any) {
    return {
      success: false,
      latencyMs: Math.round(performance.now() - t0),
      message: err.message || 'Erro ao conectar ao Supabase',
      error: err.message,
    };
  }
}
