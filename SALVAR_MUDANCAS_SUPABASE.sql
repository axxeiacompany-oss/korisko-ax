-- ==============================================================================
-- 🥖 PADARIA KORISKO - SCRIPT SQL COMPLETO PARA SALVAR TODAS AS MUDANÇAS NO SUPABASE
-- ==============================================================================
-- INSTRUÇÕES DE USO:
-- 1. Abra o painel do seu Supabase (https://supabase.com/dashboard)
-- 2. Selecione o seu projeto
-- 3. No menu lateral esquerdo, clique no ícone "SQL Editor"
-- 4. Clique em "New Query" (+), cole todo este script abaixo e clique no botão verde "RUN"
-- 5. Pronto! Todas as tabelas, permissões, fotos dos produtos e dados em tempo real
--    estarão sincronizados e salvos com sucesso!
-- ==============================================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. TABELA DE USUÁRIOS E OPERADORES DO SISTEMA (usuarios)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.usuarios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'caixa',
  password TEXT NOT NULL,
  pin TEXT,
  avatar_color TEXT DEFAULT 'bg-indigo-600',
  allowed_features JSONB DEFAULT '["dashboard","pdv","venda_direta","loja","estoque","fichas_tecnicas","crm","caixa","mais_vendidos","metas","cambio","backup","afiliados","portal_afiliado"]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir Admin Ax com senha e pin
INSERT INTO public.usuarios (id, name, email, role, password, pin, avatar_color, allowed_features, active)
VALUES (
  'emp-admin-ax',
  'Ax',
  'axxeiacompany@gmail.com',
  'admin',
  '9APG_47z-EgF4yz',
  '9APG_47z-EgF4yz',
  'bg-amber-600',
  '["dashboard","pdv","venda_direta","loja","estoque","fichas_tecnicas","crm","caixa","mais_vendidos","metas","cambio","backup","afiliados","portal_afiliado"]'::jsonb,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  password = EXCLUDED.password,
  pin = EXCLUDED.pin,
  allowed_features = EXCLUDED.allowed_features,
  active = true,
  updated_at = NOW();

-- Operador Caixa padrão
INSERT INTO public.usuarios (id, name, email, role, password, pin, avatar_color, allowed_features, active)
VALUES (
  'emp-caixa-1',
  'Operador Caixa',
  'caixa@korisko.com',
  'caixa',
  '1234',
  '1234',
  'bg-emerald-600',
  '["dashboard","pdv","venda_direta","crm","caixa"]'::jsonb,
  true
)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 2. TABELA DE PRODUTOS & ESTOQUE (produtos)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.produtos (
  id TEXT PRIMARY KEY,
  code TEXT,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'paes',
  price_brl NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  cost_price_brl NUMERIC(12, 2) DEFAULT 0.00,
  stock NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
  min_stock NUMERIC(12, 3) DEFAULT 0.000,
  unit TEXT NOT NULL DEFAULT 'un',
  active BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT,
  description TEXT,
  slug TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. TABELA DE CLIENTES, CRM & CONTAS DE FIADO (clientes)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.clientes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  document_cpf TEXT,
  address TEXT,
  category TEXT NOT NULL DEFAULT 'varejo',
  credit_limit_brl NUMERIC(12, 2) NOT NULL DEFAULT 500000.00,
  outstanding_balance_brl NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  total_spent_brl NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  purchase_count INTEGER NOT NULL DEFAULT 0,
  birthday TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. TABELA DE VENDAS REALIZADAS (vendas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.vendas (
  id TEXT PRIMARY KEY,
  sale_number INTEGER,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal_brl NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  discount_brl NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_brl NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  payments JSONB NOT NULL DEFAULT '[]'::jsonb,
  employee_id TEXT,
  employee_name TEXT,
  customer_id TEXT,
  customer_name TEXT,
  status TEXT NOT NULL DEFAULT 'concluida',
  comanda_number TEXT,
  setor_responsavel TEXT DEFAULT 'Panificação & Confeitaria Artesanal',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. TABELA DE SESSÕES DE CAIXA (caixa_sessoes)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.caixa_sessoes (
  id TEXT PRIMARY KEY,
  session_number INTEGER,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  opened_by TEXT,
  closed_by TEXT,
  initial_cash_brl NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'aberto',
  total_sales_brl NUMERIC(12, 2) DEFAULT 0.00,
  expected_cash_brl NUMERIC(12, 2) DEFAULT 0.00,
  actual_cash_brl NUMERIC(12, 2) DEFAULT 0.00,
  difference_brl NUMERIC(12, 2) DEFAULT 0.00,
  notes TEXT,
  entries JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 6. TABELA DE COMANDAS EM TEMPO REAL (comandas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.comandas (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'aberto',
  customer_name TEXT,
  customer_phone TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal_brl NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  discount_brl NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_brl NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  opened_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. TABELA DE LANÇAMENTOS DE FIADO & CONTA CORRENTE (lancamentos_fiado)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.lancamentos_fiado (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL DEFAULT 'debito_compra', -- 'debito_compra' ou 'pagamento_amortizacao'
  amount_brl NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  description TEXT,
  sale_id TEXT,
  comanda_number TEXT,
  setor_responsavel TEXT DEFAULT 'Panificação & Confeitaria Artesanal',
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 8. TABELA DE SALDOS DEVEDORES EM TEMPO REAL (saldos_devedores_tempo_real)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.saldos_devedores_tempo_real (
  customer_id TEXT PRIMARY KEY REFERENCES public.clientes(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  current_debt_balance_brl NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  credit_limit_brl NUMERIC(12, 2) NOT NULL DEFAULT 500000.00,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 9. TABELA DE COBRANÇAS EM TEMPO REAL (fluxo_cobrancas_tempo_real)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.fluxo_cobrancas_tempo_real (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  amount_brl NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  payment_method TEXT NOT NULL DEFAULT 'dinheiro',
  operator_name TEXT NOT NULL,
  comanda_number TEXT,
  status TEXT NOT NULL DEFAULT 'em_cobranca',
  previous_debt_brl NUMERIC(12, 2) DEFAULT 0.00,
  projected_debt_brl NUMERIC(12, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 10. TABELA DE REGISTRO CONSOLIDADO DE COMPRAS (registro_compras_clientes)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.registro_compras_clientes (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  sale_id TEXT,
  sale_number INTEGER,
  comanda_number TEXT,
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_amount_brl NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  payment_methods TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 11. TABELA DE BACKUPS & ESTADO COMPLETO (korisko_system_state & backups)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.korisko_system_state (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.korisko_backup_points (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT,
  created_by TEXT,
  stats JSONB,
  snapshot JSONB NOT NULL
);

-- ==============================================================================
-- 12. PERMISSÕES E POLÍTICAS RLS (LEITURA E ESCRITA COMPLETAS NO APP)
-- ==============================================================================
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos_fiado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saldos_devedores_tempo_real ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fluxo_cobrancas_tempo_real ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registro_compras_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.korisko_system_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.korisko_backup_points ENABLE ROW LEVEL SECURITY;

-- Limpar políticas antigas se existirem
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_authenticated_%s" ON public.%I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_anon_%s" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "allow_all_anon_%s" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true);', tbl, tbl);
    EXECUTE format('CREATE POLICY "allow_all_authenticated_%s" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', tbl, tbl);
  END LOOP;
END $$;

-- Permitir uso das sequências e tabelas para anon e authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ==============================================================================
-- 13. HABILITAR SINCRONIZAÇÃO EM TEMPO REAL (SUPABASE REALTIME)
-- ==============================================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.usuarios;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.produtos;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clientes;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vendas;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.caixa_sessoes;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comandas;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lancamentos_fiado;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.saldos_devedores_tempo_real;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fluxo_cobrancas_tempo_real;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.registro_compras_clientes;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.korisko_system_state;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ==============================================================================
-- FIM DO SCRIPT • BANCO DE DADOS KORIZKO SALVO E ATUALIZADO COM SUCESSO!
-- ==============================================================================
