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
    '["dashboard","pdv","venda_direta","loja","estoque","fichas_tecnicas","crm","caixa","mais_vendidos","metas","cambio","backup","afiliados","portal_afiliado"]'::jsonb,
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
    '["dashboard","pdv","venda_direta","loja","crm"]'::jsonb,
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
  image_url TEXT,
  description TEXT,
  slug TEXT,
  compare_at_price NUMERIC(12, 2),
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA FUNCIONAL DE CLIENTES & CRM (Table Editor -> clientes)
CREATE TABLE IF NOT EXISTS public.clientes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  document_cpf TEXT,
  address TEXT,
  category TEXT DEFAULT 'varejo',
  credit_limit_brl NUMERIC(12, 2) DEFAULT 0.00,
  outstanding_balance_brl NUMERIC(12, 2) DEFAULT 0.00,
  loyalty_points INTEGER DEFAULT 0,
  total_spent_brl NUMERIC(14, 2) DEFAULT 0.00,
  purchase_count INTEGER DEFAULT 0,
  last_purchase_date TIMESTAMPTZ,
  birthday TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS total_spent_brl NUMERIC(14, 2) DEFAULT 0.00;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS purchase_count INTEGER DEFAULT 0;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS last_purchase_date TIMESTAMPTZ;

-- 4. TABELA DE REGISTRO DE COMPRAS DE CADA CLIENTE (Análise Financeira Entradas x Saídas)
CREATE TABLE IF NOT EXISTS public.registro_compras_clientes (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  sale_id TEXT,
  comanda_number TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  items_summary TEXT,
  total_amount_brl NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  paid_amount_brl NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  fiado_amount_brl NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  estimated_cost_brl NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  payment_method TEXT NOT NULL DEFAULT 'dinheiro',
  flow_category TEXT NOT NULL DEFAULT 'entrada_venda_avista',
  operator_id TEXT,
  operator_name TEXT,
  notes TEXT,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.registro_compras_clientes ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE public.registro_compras_clientes ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.registro_compras_clientes ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.registro_compras_clientes ADD COLUMN IF NOT EXISTS sale_id TEXT;
ALTER TABLE public.registro_compras_clientes ADD COLUMN IF NOT EXISTS comanda_number TEXT;
ALTER TABLE public.registro_compras_clientes ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.registro_compras_clientes ADD COLUMN IF NOT EXISTS items_summary TEXT;
ALTER TABLE public.registro_compras_clientes ADD COLUMN IF NOT EXISTS total_amount_brl NUMERIC(14, 2) DEFAULT 0.00;
ALTER TABLE public.registro_compras_clientes ADD COLUMN IF NOT EXISTS paid_amount_brl NUMERIC(14, 2) DEFAULT 0.00;
ALTER TABLE public.registro_compras_clientes ADD COLUMN IF NOT EXISTS fiado_amount_brl NUMERIC(14, 2) DEFAULT 0.00;
ALTER TABLE public.registro_compras_clientes ADD COLUMN IF NOT EXISTS estimated_cost_brl NUMERIC(14, 2) DEFAULT 0.00;
ALTER TABLE public.registro_compras_clientes ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'dinheiro';
ALTER TABLE public.registro_compras_clientes ADD COLUMN IF NOT EXISTS flow_category TEXT DEFAULT 'entrada_venda_avista';
ALTER TABLE public.registro_compras_clientes ADD COLUMN IF NOT EXISTS operator_id TEXT;
ALTER TABLE public.registro_compras_clientes ADD COLUMN IF NOT EXISTS operator_name TEXT;
ALTER TABLE public.registro_compras_clientes ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.registro_compras_clientes ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.registro_compras_clientes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_reg_compras_customer_id ON public.registro_compras_clientes(customer_id);
CREATE INDEX IF NOT EXISTS idx_reg_compras_purchased_at ON public.registro_compras_clientes(purchased_at DESC);

-- 5. TABELA FUNCIONAL DE VENDAS (Table Editor -> vendas)
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
  comanda_number TEXT,
  setor_responsavel TEXT,
  confirmed_by_customer BOOLEAN DEFAULT true,
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

-- 6. TABELA DE COMANDAS & SETORES (Panificação, Confeitaria, Balcão, Loja)
CREATE TABLE IF NOT EXISTS public.comandas (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL,
  customer_name TEXT,
  customer_id TEXT,
  table_or_note TEXT,
  status TEXT NOT NULL DEFAULT 'aberta',
  setor_responsavel TEXT DEFAULT 'panificacao',
  setores_envolvidos JSONB DEFAULT '["panificacao"]'::jsonb,
  confirmed_by_customer BOOLEAN DEFAULT true,
  confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal_brl NUMERIC(12, 2) DEFAULT 0.00,
  created_by TEXT,
  source TEXT DEFAULT 'pdv',
  delivery_address TEXT,
  customer_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'pdv';
ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS setor_responsavel TEXT DEFAULT 'panificacao';
ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS setores_envolvidos JSONB DEFAULT '["panificacao"]'::jsonb;
ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS confirmed_by_customer BOOLEAN DEFAULT true;
ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ DEFAULT NOW();

-- 7. TABELA DE LANÇAMENTOS FIADO / CADERNETA
CREATE TABLE IF NOT EXISTS public.lancamentos_fiado (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  customer_name TEXT,
  type TEXT NOT NULL DEFAULT 'debito_venda',
  amount_brl NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  description TEXT,
  sale_id TEXT,
  comanda_number TEXT,
  payment_method TEXT,
  setor_responsavel TEXT,
  operator_name TEXT,
  confirmed_by_customer BOOLEAN DEFAULT true,
  balance_after_brl NUMERIC(12, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABELA DE AUDITORIA DE LOGINS & SEGURANÇA
CREATE TABLE IF NOT EXISTS public.auditoria_logins (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  identifier TEXT NOT NULL,
  user_id TEXT,
  user_name TEXT,
  user_role TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  details TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABELA FUNCIONAL DE SESSÕES DE CAIXA (Table Editor -> caixa_sessoes)
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

-- 10. TABELA DEDICADA DE SALDOS DEVEDORES EM TEMPO REAL (saldos_devedores_tempo_real)
CREATE TABLE IF NOT EXISTS public.saldos_devedores_tempo_real (
  customer_id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  previous_balance_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  current_debt_balance_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  open_comandas_total_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  open_comandas_count INTEGER NOT NULL DEFAULT 0,
  credit_limit_brl NUMERIC(14, 2) NOT NULL DEFAULT 500000,
  available_credit_brl NUMERIC(14, 2) NOT NULL DEFAULT 500000,
  last_comanda_id TEXT,
  last_comanda_number TEXT,
  last_operation_type TEXT NOT NULL DEFAULT 'comanda_lancada',
  last_operation_amount_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  last_entry_description TEXT,
  last_payment_date TIMESTAMPTZ,
  last_purchase_date TIMESTAMPTZ,
  status_cobranca TEXT NOT NULL DEFAULT 'em_dia',
  setor_responsavel TEXT DEFAULT 'Panificação & Confeitaria Artesanal',
  updated_by TEXT DEFAULT 'Sistema',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. TABELAS DE ESTADO GLOBAL E BACKUP
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

-- 12. HABILITAR SEGURANÇA EM NÍVEL DE LINHA (RLS)
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registro_compras_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos_fiado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_logins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saldos_devedores_tempo_real ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.korisko_system_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.korisko_backup_points ENABLE ROW LEVEL SECURITY;

-- 12. POLÍTICAS DE ACESSO E PERMISSÕES RLS
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

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'registro_compras_clientes' AND policyname = 'Allow public access registro_compras_clientes') THEN
    CREATE POLICY "Allow public access registro_compras_clientes" ON public.registro_compras_clientes FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendas' AND policyname = 'Allow public access vendas') THEN
    CREATE POLICY "Allow public access vendas" ON public.vendas FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'comandas' AND policyname = 'Allow public access comandas') THEN
    CREATE POLICY "Allow public access comandas" ON public.comandas FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lancamentos_fiado' AND policyname = 'Allow public access lancamentos_fiado') THEN
    CREATE POLICY "Allow public access lancamentos_fiado" ON public.lancamentos_fiado FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'auditoria_logins' AND policyname = 'Allow public access auditoria_logins') THEN
    CREATE POLICY "Allow public access auditoria_logins" ON public.auditoria_logins FOR ALL USING (true) WITH CHECK (true);
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

-- Conceder permissões operacionais completas
GRANT ALL ON TABLE public.usuarios TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.produtos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.clientes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.registro_compras_clientes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.vendas TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.comandas TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.lancamentos_fiado TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.auditoria_logins TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.caixa_sessoes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.korisko_system_state TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.korisko_backup_points TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 13. HABILITAR SINCRONIZAÇÃO MULTI-DISPOSITIVOS (SUPABASE REALTIME)
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
    ALTER PUBLICATION supabase_realtime ADD TABLE public.registro_compras_clientes;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comandas;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lancamentos_fiado;
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

-- 14. REPLICA IDENTITY FULL
ALTER TABLE public.korisko_system_state REPLICA IDENTITY FULL;
ALTER TABLE public.usuarios REPLICA IDENTITY FULL;
ALTER TABLE public.produtos REPLICA IDENTITY FULL;
ALTER TABLE public.vendas REPLICA IDENTITY FULL;
ALTER TABLE public.clientes REPLICA IDENTITY FULL;
ALTER TABLE public.registro_compras_clientes REPLICA IDENTITY FULL;
ALTER TABLE public.comandas REPLICA IDENTITY FULL;
ALTER TABLE public.lancamentos_fiado REPLICA IDENTITY FULL;
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

-- Opcional: Se desejar zerar completamente o banco para padrão de fábrica, descomente a linha abaixo:
-- SELECT public.korisko_reset_factory_zero();
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

    // Sync produtos to functional 'produtos' table for Table Editor
    if (Array.isArray(stateData.products) && stateData.products.length > 0) {
      try {
        const prodRows = stateData.products.map((p: any) => ({
          id: p.id,
          code: p.code || '',
          name: p.name,
          category: p.category || 'paes',
          price_brl: Number(p.priceBrl) || 0,
          cost_price_brl: Number(p.costPriceBrl) || 0,
          stock: Number(p.stock) || 0,
          min_stock: Number(p.minStock) || 0,
          unit: p.unit || 'un',
          active: p.active !== false,
          updated_at: new Date().toISOString()
        }));
        await supabase.from('produtos').upsert(prodRows, { onConflict: 'id' });
      } catch {}
    }

    // Sync clientes to functional 'clientes' table for Table Editor
    if (Array.isArray(stateData.customers) && stateData.customers.length > 0) {
      try {
        const custRows = stateData.customers.map((c: any) => ({
          id: c.id,
          name: c.name,
          phone: c.phone || '',
          email: c.email || null,
          credit_limit_brl: Number(c.creditLimitBrl) || 0,
          outstanding_balance_brl: Number(c.outstandingBalanceBrl) || 0,
          loyalty_points: Math.round(Number(c.loyaltyPoints) || 0),
          active: true,
          updated_at: new Date().toISOString()
        }));
        await supabase.from('clientes').upsert(custRows, { onConflict: 'id' });
      } catch {}
    }

    // Sync saldos_devedores_tempo_real for all customers with active balances or explicit debtor records
    if (Array.isArray(stateData.customers) && stateData.customers.length > 0) {
      try {
        const activeComandas = Array.isArray(stateData.openComandas) ? stateData.openComandas : [];
        const customerEntries = Array.isArray(stateData.customerEntries) ? stateData.customerEntries : [];
        const customerPurchases = Array.isArray(stateData.customerPurchases) ? stateData.customerPurchases : [];

        const debtorRows = stateData.customers
          .filter((c: any) => {
            const currentDebt = Number(c.outstandingBalanceBrl) || 0;
            const hasOpenCmd = activeComandas.some((cmd: any) => 
              (cmd.customerId === c.id || (cmd.customerName && cmd.customerName.trim().toLowerCase() === c.name.trim().toLowerCase())) &&
              cmd.status !== 'pago' && cmd.status !== 'cancelado'
            );
            const hasExtra = Array.isArray(stateData.liveDebtorBalances) && stateData.liveDebtorBalances.some((d: any) => d.customerId === c.id);
            return currentDebt > 0 || hasOpenCmd || hasExtra;
          })
          .map((c: any) => {
            const extra = (stateData.liveDebtorBalances || []).find((d: any) => d.customerId === c.id);
            const currentDebt = Number(c.outstandingBalanceBrl) || 0;
            const creditLimit = Number(c.creditLimitBrl) || 500000;

            const custOpenCmds = activeComandas.filter((cmd: any) => 
              (cmd.customerId === c.id || (cmd.customerName && cmd.customerName.trim().toLowerCase() === c.name.trim().toLowerCase())) &&
              cmd.status !== 'pago' && cmd.status !== 'cancelado'
            );
            const openCount = custOpenCmds.length;
            const openTotal = Math.round(custOpenCmds.reduce((sum: number, cmd: any) => sum + (Number(cmd.totalBrl) || 0), 0) * 100) / 100;

            const custEntries = customerEntries.filter((e: any) => e.customerId === c.id);
            const latestEntry = custEntries[0];
            const latestPayment = custEntries.find((e: any) => e.type === 'pagamento_amortizacao');
            const latestPurchase = customerPurchases.find((p: any) => p.customerId === c.id);

            const lastPurchaseDate = extra?.lastPurchaseDate || c.lastPurchaseDate || latestPurchase?.purchaseDate || null;
            const lastPaymentDate = extra?.lastPaymentDate || latestPayment?.date || null;

            let statusCobranca = extra?.statusCobranca || 'em_dia';
            if (currentDebt > creditLimit) {
              statusCobranca = 'alerta_limite';
            } else if (currentDebt > 0 && lastPurchaseDate) {
              const daysSince = (Date.now() - new Date(lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24);
              if (daysSince > 30) statusCobranca = 'atrasado';
            }

            return {
              customer_id: c.id,
              customer_name: c.name,
              customer_phone: c.phone || null,
              previous_balance_brl: Number(extra?.previousBalanceBrl ?? latestEntry?.previousBalanceBrl ?? 0),
              current_debt_balance_brl: currentDebt,
              open_comandas_total_brl: Number(extra?.openComandasTotalBrl ?? openTotal),
              open_comandas_count: Number(extra?.openComandasCount ?? openCount),
              credit_limit_brl: creditLimit,
              available_credit_brl: Math.max(0, creditLimit - currentDebt),
              last_comanda_id: extra?.lastComandaId || custOpenCmds[0]?.id || null,
              last_comanda_number: extra?.lastComandaNumber || custOpenCmds[0]?.number || null,
              last_operation_type: extra?.lastOperationType || (latestEntry?.type === 'pagamento_amortizacao' ? 'pagamento_amortizacao' : 'venda_fiado'),
              last_operation_amount_brl: Number(extra?.lastOperationAmountBrl ?? latestEntry?.amountBrl ?? currentDebt),
              last_entry_description: extra?.lastEntryDescription || latestEntry?.description || (currentDebt > 0 ? 'Saldo devedor em aberto' : 'Conta em dia'),
              last_payment_date: lastPaymentDate,
              last_purchase_date: lastPurchaseDate,
              status_cobranca: statusCobranca,
              setor_responsavel: extra?.lastSetorResponsavel || latestEntry?.setorResponsavel || 'Panificação & Confeitaria Artesanal',
              updated_by: extra?.updatedBy || latestEntry?.recordedBy || 'Sistema',
              updated_at: extra?.updatedAt || new Date().toISOString(),
            };
          });

        if (debtorRows.length > 0) {
          await supabase.from('saldos_devedores_tempo_real').upsert(debtorRows, { onConflict: 'customer_id' });
        }

        // Clean up customers who have zero debt and no open comandas from saldos_devedores_tempo_real
        const clearedCustomerIds = stateData.customers
          .filter((c: any) => {
            const currentDebt = Number(c.outstandingBalanceBrl) || 0;
            const hasOpenCmd = activeComandas.some((cmd: any) => 
              (cmd.customerId === c.id || (cmd.customerName && cmd.customerName.trim().toLowerCase() === c.name.trim().toLowerCase())) &&
              cmd.status !== 'pago' && cmd.status !== 'cancelado'
            );
            return currentDebt <= 0 && !hasOpenCmd;
          })
          .map((c: any) => c.id);

        if (clearedCustomerIds.length > 0) {
          await supabase.from('saldos_devedores_tempo_real').delete().in('customer_id', clearedCustomerIds);
        }
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
