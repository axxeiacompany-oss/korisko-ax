import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Re-export single client instance
export { supabase };

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

-- Gerador automático sequencial de número de venda
CREATE SEQUENCE IF NOT EXISTS public.vendas_sale_number_seq START 1;

CREATE OR REPLACE FUNCTION public.set_sale_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sale_number IS NULL OR NEW.sale_number = '' THEN
    NEW.sale_number := nextval('public.vendas_sale_number_seq')::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_sale_number ON public.vendas;
CREATE TRIGGER trg_set_sale_number
BEFORE INSERT ON public.vendas
FOR EACH ROW
EXECUTE FUNCTION public.set_sale_number();

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

-- 9. HABILITAR SINCRONIZAÇÃO EM TEMPO REAL MULTI-DISPOSITIVOS (SUPABASE REALTIME)
-- Qualquer alteração de venda, caixa, estoque ou usuário é transmitida instantaneamente
-- via WebSockets para todos os celulares, tablets e computadores conectados.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.korisko_system_state;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.usuarios;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.produtos;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vendas;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clientes;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.caixa_sessoes;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.korisko_backup_points;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 10. REPLICA IDENTITY FULL (Permite receber os dados completos no payload de tempo real)
ALTER TABLE public.korisko_system_state REPLICA IDENTITY FULL;
ALTER TABLE public.usuarios REPLICA IDENTITY FULL;
ALTER TABLE public.produtos REPLICA IDENTITY FULL;
ALTER TABLE public.vendas REPLICA IDENTITY FULL;
ALTER TABLE public.clientes REPLICA IDENTITY FULL;
ALTER TABLE public.caixa_sessoes REPLICA IDENTITY FULL;

-- 11. FUNÇÕES RPC (BAIXA DE ESTOQUE E AJUSTE DE SALDO DE CLIENTE)
CREATE OR REPLACE FUNCTION public.baixar_estoque(p_id text, p_qtd numeric)
RETURNS numeric AS $$
DECLARE
  v_novo_estoque numeric;
BEGIN
  UPDATE public.produtos
  SET stock = GREATEST(0, stock - p_qtd),
      updated_at = NOW()
  WHERE id = p_id
  RETURNING stock INTO v_novo_estoque;
  
  RETURN COALESCE(v_novo_estoque, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.ajustar_saldo_cliente(p_id text, p_valor numeric)
RETURNS numeric AS $$
DECLARE
  v_novo_saldo numeric;
BEGIN
  UPDATE public.clientes
  SET outstanding_balance_brl = GREATEST(0, outstanding_balance_brl + p_valor),
      updated_at = NOW()
  WHERE id = p_id
  RETURNING outstanding_balance_brl INTO v_novo_saldo;
  
  RETURN COALESCE(v_novo_saldo, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.baixar_estoque(text, numeric) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ajustar_saldo_cliente(text, numeric) TO anon, authenticated, service_role;

-- 12. INICIALIZAÇÃO / RESET PADRÃO DE FÁBRICA ZERADO (ADMIN AX PERMANECE SEMPRE)
-- Deixa o sistema pronto para produção real com vendas e caixa zerados,
-- garantindo que o Administrador Ax nunca seja apagado.
CREATE OR REPLACE FUNCTION public.korisko_reset_factory_zero()
RETURNS void AS $$
BEGIN
  -- 1. Limpar vendas, sessões de caixa e movimentações transacionais
  TRUNCATE TABLE public.vendas;
  TRUNCATE TABLE public.caixa_sessoes;

  -- 2. Garantir que o Administrador Geral Ax permaneça ativo e intocado
  INSERT INTO public.usuarios (id, name, email, role, password, pin, avatar_color, allowed_features, active)
  VALUES (
    'emp-admin-ax',
    'Ax',
    'axxeiacompany@gmail.com',
    'admin',
    '9APG_47z-EgF4yz',
    '9APG_47z-EgF4yz',
    'bg-indigo-600',
    '["dashboard","pdv","venda_direta","estoque","fichas_tecnicas","crm","caixa","mais_vendidos","metas","cambio","backup","afiliados"]'::jsonb,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    name = 'Ax',
    email = 'axxeiacompany@gmail.com',
    role = 'admin',
    password = '9APG_47z-EgF4yz',
    pin = '9APG_47z-EgF4yz',
    active = true;

  -- 3. Atualizar o estado consolidado em tempo real padrão de fábrica zerado
  INSERT INTO public.korisko_system_state (id, data, updated_at)
  VALUES (
    'active_state',
    jsonb_build_object(
      'version', '2.0.0',
      'timestamp', NOW(),
      'employees', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', id,
            'name', name,
            'email', email,
            'role', role,
            'password', password,
            'pin', pin,
            'avatarColor', avatar_color,
            'allowedFeatures', allowed_features,
            'active', active
          )
        ) FROM public.usuarios WHERE active = true
      ),
      'products', (SELECT COALESCE(jsonb_agg(row_to_json(p)), '[]'::jsonb) FROM public.produtos p),
      'stockMovements', '[]'::jsonb,
      'sales', '[]'::jsonb,
      'currentSession', jsonb_build_object(
        'id', 'sess-zerada',
        'openedAt', NOW(),
        'closedAt', NOW(),
        'openedById', 'emp-admin-ax',
        'openedByName', 'Ax',
        'initialCashBrl', 0,
        'status', 'fechado',
        'movements', '[]'::jsonb,
        'totalSalesBrl', 0,
        'differenceBrl', 0
      ),
      'sessionHistory', '[]'::jsonb,
      'openComandas', '[]'::jsonb,
      'fornadas', '[]'::jsonb,
      'customers', '[]'::jsonb,
      'customerEntries', '[]'::jsonb
    ),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    data = EXCLUDED.data,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Executar a sincronização padrão de fábrica inicial
SELECT public.korisko_reset_factory_zero();
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

    // Sync latest vendas to functional 'vendas' table for Table Editor
    if (Array.isArray(stateData.sales) && stateData.sales.length > 0) {
      try {
        const recentSales = stateData.sales.slice(-25).map((s: any) => ({
          id: s.id,
          sale_number: s.saleNumber || s.id,
          subtotal_brl: s.subtotalBrl || s.totalBrl || 0,
          discount_brl: s.discountBrl || 0,
          total_brl: s.totalBrl || 0,
          employee_id: s.employeeId || null,
          employee_name: s.employeeName || null,
          customer_id: s.customerId || null,
          customer_name: s.customerName || null,
          items: s.items || [],
          payments: s.payments || [],
          change_given: s.changeGiven || null,
          created_at: s.timestamp || new Date().toISOString()
        }));

        await supabase.from('vendas').upsert(recentSales, { onConflict: 'id' });
      } catch {}
    }

    // Sync currentSession to functional 'caixa_sessoes' table
    if (stateData.currentSession) {
      try {
        const sess = stateData.currentSession;
        await supabase.from('caixa_sessoes').upsert({
          id: sess.id,
          opened_at: sess.openedAt || new Date().toISOString(),
          closed_at: sess.closedAt || null,
          opened_by_id: sess.openedById || null,
          opened_by_name: sess.openedByName || null,
          initial_cash_brl: sess.initialCashBrl || 0,
          status: sess.status || 'aberto',
          total_sales_brl: sess.totalSalesBrl || 0,
          created_at: sess.openedAt || new Date().toISOString()
        }, { onConflict: 'id' });
      } catch {}
    }

    return true;
  } catch (err) {
    console.warn('[Supabase Sync Exception]:', err);
    return false;
  }
}

/**
 * Subscribes to real-time database changes across all connected devices (mobile, tablet, desktop).
 * Whenever any movement (venda, caixa, estoque, usuário) occurs on one device, 
 * all other devices receive the update instantly via WebSockets without page reload.
 */
export function subscribeToRealtimeState(onRemoteChange: (newState: any) => void): () => void {
  try {
    const channel = supabase
      .channel('korisko-realtime-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'korisko_system_state',
        },
        (payload) => {
          if (payload.new && (payload.new as any).data) {
            console.log('[Korisko Realtime] Recebida atualização em tempo real de outro dispositivo.');
            onRemoteChange((payload.new as any).data);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'usuarios',
        },
        async () => {
          console.log('[Korisko Realtime] Tabela usuarios alterada no Supabase. Sincronizando credenciais.');
          const fresh = await fetchStateFromSupabase();
          if (fresh) onRemoteChange(fresh);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Korisko Realtime] Conectado e ativo para sincronização instantânea multi-dispositivo.');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[Korisko Realtime] Falha ao inicializar listener em tempo real:', err);
    return () => {};
  }
}

/**
 * Executa o reset para Padrão de Fábrica Zerado na nuvem e entrega a atualização
 * em tempo real para todos os dispositivos conectados. Admin Ax permanece SEMPRE.
 */
export async function resetCloudToFactoryZero(): Promise<boolean> {
  try {
    // 1. Tentar executar a função SQL no Supabase se existir
    try {
      const { error: rpcError } = await supabase.rpc('korisko_reset_factory_zero');
      if (!rpcError) return true;
    } catch {}

    // 2. Fallback: aplicar estado zerado diretamente via upsert com Admin Ax garantido
    const now = new Date().toISOString();
    const factoryZeroState = {
      version: '2.0.0',
      timestamp: now,
      employees: [
        {
          id: 'emp-admin-ax',
          name: 'Ax',
          email: 'axxeiacompany@gmail.com',
          role: 'admin',
          password: '9APG_47z-EgF4yz',
          pin: '9APG_47z-EgF4yz',
          avatarColor: 'bg-indigo-600',
          allowedFeatures: [
            'dashboard', 'pdv', 'venda_direta', 'estoque', 
            'fichas_tecnicas', 'crm', 'caixa', 'mais_vendidos', 
            'metas', 'cambio', 'backup', 'afiliados'
          ],
          active: true
        }
      ],
      products: [],
      stockMovements: [],
      sales: [],
      currentSession: {
        id: `sess-${Date.now()}`,
        openedAt: now,
        closedAt: now,
        openedById: 'emp-admin-ax',
        openedByName: 'Ax',
        initialCashBrl: 0,
        status: 'fechado',
        movements: [],
        totalSalesBrl: 0,
        differenceBrl: 0
      },
      sessionHistory: [],
      openComandas: [],
      fornadas: [],
      customers: [],
      customerEntries: []
    };

    return await saveStateToSupabase(factoryZeroState);
  } catch {
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
