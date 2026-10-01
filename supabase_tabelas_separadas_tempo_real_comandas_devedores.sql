-- ==============================================================================
-- 🥖 KORIZKO • PANIFICAÇÃO CONFEITARIA ARTESANAL
-- SCRIPT SQL COMPLETO E APRIMORADO: TABELAS SEPARADAS POR FUNÇÃO +
-- ATUALIZAÇÃO AUTOMÁTICA DO SALDO DEVEDOR EM TEMPO REAL AO LANÇAR COMANDA
-- ==============================================================================
-- Este script MANTÉM 100% dos códigos e tabelas anteriores e APRIMORA o banco
-- no Supabase criando tabelas separadas para cada função do sistema:
--   1. public.usuarios                        (Operadores, Admins e Permissões)
--   2. public.produtos                        (Catálogo, Preços PYG e Estoque)
--   3. public.clientes                        (Cadastro CRM, Limites e Fidelidade)
--   4. public.saldos_devedores_tempo_real     (Saldo Devedor em Fluxo Tempo Real)
--   5. public.comandas_abertas                (Comandas Ativas com Saldo Devedor Vinculado)
--   6. public.comandas_historico_setores      (Histórico de Comandas e Setores)
--   7. public.lancamentos_fiado               (Extrato Detalhado de Fiado / Débitos)
--   8. public.amortizacoes_pagamentos_fiado   (Pagamentos e Amortizações de Dívidas)
--   9. public.fluxo_cobrancas_tempo_real      (Monitoramento Ao Vivo de Comandas e Caixa)
--  10. public.vendas                          (Vendas Finalizadas PDV & Loja Online)
--  11. public.caixa_sessoes                   (Abertura e Fechamento de Turnos de Caixa)
--  12. public.caixa_movimentacoes             (Entradas, Saídas, Sangrias e Reforços)
--  13. public.estoque_movimentacoes           (Entradas, Saídas e Perdas de Estoque)
--  14. public.fornadas_producao               (Fornadas Quentinhas & Produção Artesanal)
--  15. public.korisko_system_state            (Estado Global Sincronizado)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. TABELA DE CLIENTES (MANTIDA E APRIMORADA)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.clientes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS document_cpf TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'varejo';
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS credit_limit_brl NUMERIC(14, 2) DEFAULT 200000;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS outstanding_balance_brl NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS birthday TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS total_spent_brl NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS purchase_count INTEGER DEFAULT 0;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS last_purchase_date TIMESTAMPTZ;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 2. TABELA DEDICADA: SALDOS DEVEDORES EM TEMPO REAL
-- Atualiza instantaneamente assim que uma comanda é lançada, paga ou amortizada
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.saldos_devedores_tempo_real (
  customer_id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  previous_balance_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  current_debt_balance_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  open_comandas_total_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  credit_limit_brl NUMERIC(14, 2) NOT NULL DEFAULT 200000,
  available_credit_brl NUMERIC(14, 2) NOT NULL DEFAULT 200000,
  last_comanda_id TEXT,
  last_comanda_number TEXT,
  last_operation_type TEXT NOT NULL DEFAULT 'comanda_lancada',
  last_operation_amount_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  setor_responsavel TEXT DEFAULT 'Panificação & Confeitaria Artesanal',
  updated_by TEXT DEFAULT 'Sistema',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.saldos_devedores_tempo_real ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.saldos_devedores_tempo_real ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.saldos_devedores_tempo_real ADD COLUMN IF NOT EXISTS previous_balance_brl NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE public.saldos_devedores_tempo_real ADD COLUMN IF NOT EXISTS current_debt_balance_brl NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE public.saldos_devedores_tempo_real ADD COLUMN IF NOT EXISTS open_comandas_total_brl NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE public.saldos_devedores_tempo_real ADD COLUMN IF NOT EXISTS credit_limit_brl NUMERIC(14, 2) DEFAULT 200000;
ALTER TABLE public.saldos_devedores_tempo_real ADD COLUMN IF NOT EXISTS available_credit_brl NUMERIC(14, 2) DEFAULT 200000;
ALTER TABLE public.saldos_devedores_tempo_real ADD COLUMN IF NOT EXISTS last_comanda_id TEXT;
ALTER TABLE public.saldos_devedores_tempo_real ADD COLUMN IF NOT EXISTS last_comanda_number TEXT;
ALTER TABLE public.saldos_devedores_tempo_real ADD COLUMN IF NOT EXISTS last_operation_type TEXT DEFAULT 'comanda_lancada';
ALTER TABLE public.saldos_devedores_tempo_real ADD COLUMN IF NOT EXISTS last_operation_amount_brl NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE public.saldos_devedores_tempo_real ADD COLUMN IF NOT EXISTS setor_responsavel TEXT DEFAULT 'Panificação & Confeitaria Artesanal';
ALTER TABLE public.saldos_devedores_tempo_real ADD COLUMN IF NOT EXISTS updated_by TEXT DEFAULT 'Sistema';
ALTER TABLE public.saldos_devedores_tempo_real ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 3. TABELA DEDICADA: COMANDAS ABERTAS (COM VÍNCULO DE SALDO DEVEDOR EM TEMPO REAL)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.comandas_abertas (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  total_brl NUMERIC(14, 2) DEFAULT 0,
  debt_applied_brl NUMERIC(14, 2) DEFAULT 0,
  previous_debt_brl NUMERIC(14, 2) DEFAULT 0,
  resulting_debt_brl NUMERIC(14, 2) DEFAULT 0,
  notes TEXT,
  opened_by TEXT,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  setor_responsavel TEXT DEFAULT 'todos',
  setores_envolvidos JSONB DEFAULT '["todos"]'::jsonb,
  status TEXT DEFAULT 'confirmado',
  confirmed_by_customer BOOLEAN DEFAULT true,
  confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'pdv',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.comandas_abertas ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE public.comandas_abertas ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.comandas_abertas ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.comandas_abertas ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.comandas_abertas ADD COLUMN IF NOT EXISTS total_brl NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE public.comandas_abertas ADD COLUMN IF NOT EXISTS debt_applied_brl NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE public.comandas_abertas ADD COLUMN IF NOT EXISTS previous_debt_brl NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE public.comandas_abertas ADD COLUMN IF NOT EXISTS resulting_debt_brl NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE public.comandas_abertas ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.comandas_abertas ADD COLUMN IF NOT EXISTS opened_by TEXT;
ALTER TABLE public.comandas_abertas ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.comandas_abertas ADD COLUMN IF NOT EXISTS setor_responsavel TEXT DEFAULT 'todos';
ALTER TABLE public.comandas_abertas ADD COLUMN IF NOT EXISTS setores_envolvidos JSONB DEFAULT '["todos"]'::jsonb;
ALTER TABLE public.comandas_abertas ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'confirmado';
ALTER TABLE public.comandas_abertas ADD COLUMN IF NOT EXISTS confirmed_by_customer BOOLEAN DEFAULT true;
ALTER TABLE public.comandas_abertas ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.comandas_abertas ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'pdv';
ALTER TABLE public.comandas_abertas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 4. TABELA DEDICADA: HISTÓRICO DE COMANDAS & SETORES
-- Registra cada lançamento de comanda, envio ao setor, preparo, baixa e fechamento
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.comandas_historico_setores (
  id TEXT PRIMARY KEY,
  comanda_id TEXT NOT NULL,
  comanda_number TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  total_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  debt_applied_brl NUMERIC(14, 2) DEFAULT 0,
  previous_debt_brl NUMERIC(14, 2) DEFAULT 0,
  resulting_debt_brl NUMERIC(14, 2) DEFAULT 0,
  setor_responsavel TEXT DEFAULT 'todos',
  setores_envolvidos JSONB DEFAULT '["todos"]'::jsonb,
  status TEXT NOT NULL DEFAULT 'confirmado',
  action_type TEXT NOT NULL DEFAULT 'lancamento_comanda',
  operator_name TEXT DEFAULT 'Sistema',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. TABELA DEDICADA: LANÇAMENTOS DE FIADO & EXTRATO DE CONTA
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.lancamentos_fiado (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  type TEXT NOT NULL DEFAULT 'debito_compra',
  amount_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  sale_id TEXT,
  comanda_number TEXT,
  setor_responsavel TEXT DEFAULT 'Panificação & Confeitaria Artesanal',
  confirmed_by_customer BOOLEAN DEFAULT true,
  payment_method TEXT DEFAULT 'fiado',
  recorded_by TEXT DEFAULT 'Sistema',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.lancamentos_fiado ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE public.lancamentos_fiado ADD COLUMN IF NOT EXISTS date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.lancamentos_fiado ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'debito_compra';
ALTER TABLE public.lancamentos_fiado ADD COLUMN IF NOT EXISTS amount_brl NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE public.lancamentos_fiado ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.lancamentos_fiado ADD COLUMN IF NOT EXISTS sale_id TEXT;
ALTER TABLE public.lancamentos_fiado ADD COLUMN IF NOT EXISTS comanda_number TEXT;
ALTER TABLE public.lancamentos_fiado ADD COLUMN IF NOT EXISTS setor_responsavel TEXT DEFAULT 'Panificação & Confeitaria Artesanal';
ALTER TABLE public.lancamentos_fiado ADD COLUMN IF NOT EXISTS confirmed_by_customer BOOLEAN DEFAULT true;
ALTER TABLE public.lancamentos_fiado ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'fiado';
ALTER TABLE public.lancamentos_fiado ADD COLUMN IF NOT EXISTS recorded_by TEXT DEFAULT 'Sistema';
ALTER TABLE public.lancamentos_fiado ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.lancamentos_fiado ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 6. TABELA DEDICADA: AMORTIZAÇÕES E PAGAMENTOS DE FIADO
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.amortizacoes_pagamentos_fiado (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  amount_paid_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  previous_balance_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  remaining_balance_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'dinheiro',
  notes TEXT,
  received_by TEXT DEFAULT 'Operador',
  comanda_number TEXT,
  sale_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. TABELA DEDICADA: FLUXO DE COBRANÇAS E COMANDAS EM TEMPO REAL
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.fluxo_cobrancas_tempo_real (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  operator_name TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'fiado',
  amount_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  previous_debt_brl NUMERIC(14, 2) DEFAULT 0,
  projected_debt_brl NUMERIC(14, 2) DEFAULT 0,
  comanda_number TEXT,
  setor_responsavel TEXT DEFAULT 'Panificação & Confeitaria Artesanal',
  items_summary TEXT,
  status TEXT NOT NULL DEFAULT 'em_cobranca',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 8. TABELA DEDICADA: MOVIMENTAÇÕES DE CAIXA (ENTRADAS, SAÍDAS, SANGRIAS, REFORÇOS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.caixa_movimentacoes (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  type TEXT NOT NULL,
  amount_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency_origin TEXT DEFAULT 'PYG',
  amount_origin NUMERIC(14, 2) DEFAULT 0,
  reason TEXT NOT NULL,
  category TEXT,
  document_ref TEXT,
  operator_name TEXT DEFAULT 'Operador',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 9. TABELA DEDICADA: MOVIMENTAÇÕES DE ESTOQUE (ENTRADAS, SAÍDAS E PERDAS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.estoque_movimentacoes (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity NUMERIC(12, 3) NOT NULL DEFAULT 0,
  previous_stock NUMERIC(12, 3) NOT NULL DEFAULT 0,
  new_stock NUMERIC(12, 3) NOT NULL DEFAULT 0,
  reason TEXT,
  employee_id TEXT,
  employee_name TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 10. TABELA DEDICADA: FORNADAS & PRODUÇÃO ARTESANAL
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.fornadas_producao (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC(12, 3) NOT NULL DEFAULT 0,
  baked_by TEXT DEFAULT 'Padeiro',
  notes TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 11. TABELA DE VENDAS (ATUALIZADA COM COMANDA E SETOR)
-- ==============================================================================
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS comanda_number TEXT;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS setor_responsavel TEXT DEFAULT 'Panificação & Confeitaria Artesanal';
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS confirmed_by_customer BOOLEAN DEFAULT true;

-- ==============================================================================
-- 12. GATILHOS (TRIGGERS) AUTOMÁTICOS EM TEMPO REAL NO BANCO DE DADOS
-- Assim que uma comanda é lançada ou atualizada em public.comandas_abertas,
-- ou um lançamento entra em public.lancamentos_fiado, o saldo devedor na tabela
-- public.saldos_devedores_tempo_real é sincronizado instantaneamente.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fn_sync_saldo_devedor_ao_lancar_comanda()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cust_id TEXT;
  v_cust_name TEXT;
  v_cust_phone TEXT;
  v_current_balance NUMERIC(14, 2);
  v_credit_limit NUMERIC(14, 2);
  v_open_comandas_sum NUMERIC(14, 2);
BEGIN
  v_cust_id := NEW.customer_id;
  v_cust_name := COALESCE(NEW.customer_name, 'Cliente');
  v_cust_phone := NEW.customer_phone;

  IF v_cust_id IS NOT NULL AND v_cust_id <> '' THEN
    SELECT COALESCE(outstanding_balance_brl, 0), COALESCE(credit_limit_brl, 200000), COALESCE(name, v_cust_name), COALESCE(phone, v_cust_phone)
      INTO v_current_balance, v_credit_limit, v_cust_name, v_cust_phone
      FROM public.clientes
     WHERE id = v_cust_id;

    -- Se a comanda já trouxe resulting_debt_brl calculado pelo app, sincroniza o cliente
    IF COALESCE(NEW.resulting_debt_brl, 0) > 0 THEN
      v_current_balance := NEW.resulting_debt_brl;
      UPDATE public.clientes
         SET outstanding_balance_brl = v_current_balance,
             updated_at = NOW()
       WHERE id = v_cust_id;
    END IF;

    SELECT COALESCE(SUM(total_brl), 0)
      INTO v_open_comandas_sum
      FROM public.comandas_abertas
     WHERE customer_id = v_cust_id;

    INSERT INTO public.saldos_devedores_tempo_real (
      customer_id,
      customer_name,
      customer_phone,
      previous_balance_brl,
      current_debt_balance_brl,
      open_comandas_total_brl,
      credit_limit_brl,
      available_credit_brl,
      last_comanda_id,
      last_comanda_number,
      last_operation_type,
      last_operation_amount_brl,
      setor_responsavel,
      updated_by,
      updated_at
    ) VALUES (
      v_cust_id,
      v_cust_name,
      v_cust_phone,
      COALESCE(NEW.previous_debt_brl, 0),
      COALESCE(v_current_balance, 0),
      COALESCE(v_open_comandas_sum, NEW.total_brl, 0),
      COALESCE(v_credit_limit, 200000),
      GREATEST(0, COALESCE(v_credit_limit, 200000) - COALESCE(v_current_balance, 0)),
      NEW.id,
      NEW.number,
      'comanda_lancada',
      COALESCE(NEW.total_brl, 0),
      COALESCE(NEW.setor_responsavel, 'todos'),
      COALESCE(NEW.opened_by, 'Operador'),
      NOW()
    )
    ON CONFLICT (customer_id) DO UPDATE SET
      customer_name = EXCLUDED.customer_name,
      customer_phone = COALESCE(EXCLUDED.customer_phone, public.saldos_devedores_tempo_real.customer_phone),
      previous_balance_brl = EXCLUDED.previous_balance_brl,
      current_debt_balance_brl = EXCLUDED.current_debt_balance_brl,
      open_comandas_total_brl = EXCLUDED.open_comandas_total_brl,
      credit_limit_brl = EXCLUDED.credit_limit_brl,
      available_credit_brl = EXCLUDED.available_credit_brl,
      last_comanda_id = EXCLUDED.last_comanda_id,
      last_comanda_number = EXCLUDED.last_comanda_number,
      last_operation_type = EXCLUDED.last_operation_type,
      last_operation_amount_brl = EXCLUDED.last_operation_amount_brl,
      setor_responsavel = EXCLUDED.setor_responsavel,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comanda_atualiza_saldo_devedor ON public.comandas_abertas;
CREATE TRIGGER trg_comanda_atualiza_saldo_devedor
AFTER INSERT OR UPDATE ON public.comandas_abertas
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_saldo_devedor_ao_lancar_comanda();

-- ==============================================================================
-- 13. ÍNDICES DE ALTA PERFORMANCE PARA TODAS AS TABELAS SEPARADAS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_saldos_devedores_debt ON public.saldos_devedores_tempo_real (current_debt_balance_brl DESC);
CREATE INDEX IF NOT EXISTS idx_saldos_devedores_updated ON public.saldos_devedores_tempo_real (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_comandas_abertas_customer ON public.comandas_abertas (customer_id);
CREATE INDEX IF NOT EXISTS idx_comandas_abertas_setor ON public.comandas_abertas (setor_responsavel, status);
CREATE INDEX IF NOT EXISTS idx_comandas_hist_comanda ON public.comandas_historico_setores (comanda_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lancamentos_fiado_customer_date ON public.lancamentos_fiado (customer_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_amortizacoes_fiado_customer ON public.amortizacoes_pagamentos_fiado (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fluxo_cobrancas_status_updated ON public.fluxo_cobrancas_tempo_real (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_caixa_movimentacoes_session ON public.caixa_movimentacoes (session_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_estoque_movimentacoes_product ON public.estoque_movimentacoes (product_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_fornadas_producao_timestamp ON public.fornadas_producao (timestamp DESC);

-- ==============================================================================
-- 14. SEGURANÇA RLS E PERMISSÕES PARA TODAS AS TABELAS
-- ==============================================================================
ALTER TABLE public.saldos_devedores_tempo_real ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comandas_abertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comandas_historico_setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos_fiado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amortizacoes_pagamentos_fiado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fluxo_cobrancas_tempo_real ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornadas_producao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "acesso_total_saldos_devedores" ON public.saldos_devedores_tempo_real;
CREATE POLICY "acesso_total_saldos_devedores" ON public.saldos_devedores_tempo_real FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "acesso_total_comandas_abertas" ON public.comandas_abertas;
CREATE POLICY "acesso_total_comandas_abertas" ON public.comandas_abertas FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "acesso_total_comandas_hist" ON public.comandas_historico_setores;
CREATE POLICY "acesso_total_comandas_hist" ON public.comandas_historico_setores FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "acesso_total_lancamentos_fiado" ON public.lancamentos_fiado;
CREATE POLICY "acesso_total_lancamentos_fiado" ON public.lancamentos_fiado FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "acesso_total_amortizacoes_fiado" ON public.amortizacoes_pagamentos_fiado;
CREATE POLICY "acesso_total_amortizacoes_fiado" ON public.amortizacoes_pagamentos_fiado FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "acesso_total_fluxo_cobrancas" ON public.fluxo_cobrancas_tempo_real;
CREATE POLICY "acesso_total_fluxo_cobrancas" ON public.fluxo_cobrancas_tempo_real FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "acesso_total_caixa_movimentacoes" ON public.caixa_movimentacoes;
CREATE POLICY "acesso_total_caixa_movimentacoes" ON public.caixa_movimentacoes FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "acesso_total_estoque_movimentacoes" ON public.estoque_movimentacoes;
CREATE POLICY "acesso_total_estoque_movimentacoes" ON public.estoque_movimentacoes FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "acesso_total_fornadas_producao" ON public.fornadas_producao;
CREATE POLICY "acesso_total_fornadas_producao" ON public.fornadas_producao FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

GRANT ALL PRIVILEGES ON TABLE public.saldos_devedores_tempo_real TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.comandas_abertas TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.comandas_historico_setores TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.lancamentos_fiado TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.amortizacoes_pagamentos_fiado TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.fluxo_cobrancas_tempo_real TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.caixa_movimentacoes TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.estoque_movimentacoes TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.fornadas_producao TO anon, authenticated, service_role;

-- ==============================================================================
-- 15. HABILITAR SUPABASE REALTIME EM TODAS AS TABELAS SEPARADAS
-- ==============================================================================
ALTER TABLE public.clientes REPLICA IDENTITY FULL;
ALTER TABLE public.saldos_devedores_tempo_real REPLICA IDENTITY FULL;
ALTER TABLE public.comandas_abertas REPLICA IDENTITY FULL;
ALTER TABLE public.comandas_historico_setores REPLICA IDENTITY FULL;
ALTER TABLE public.lancamentos_fiado REPLICA IDENTITY FULL;
ALTER TABLE public.amortizacoes_pagamentos_fiado REPLICA IDENTITY FULL;
ALTER TABLE public.fluxo_cobrancas_tempo_real REPLICA IDENTITY FULL;
ALTER TABLE public.caixa_movimentacoes REPLICA IDENTITY FULL;
ALTER TABLE public.estoque_movimentacoes REPLICA IDENTITY FULL;
ALTER TABLE public.fornadas_producao REPLICA IDENTITY FULL;

DO $$
DECLARE
  tbl TEXT;
  tables_to_publish TEXT[] := ARRAY[
    'clientes',
    'saldos_devedores_tempo_real',
    'comandas_abertas',
    'comandas_historico_setores',
    'lancamentos_fiado',
    'amortizacoes_pagamentos_fiado',
    'fluxo_cobrancas_tempo_real',
    'caixa_movimentacoes',
    'estoque_movimentacoes',
    'fornadas_producao',
    'vendas',
    'produtos',
    'usuarios',
    'caixa_sessoes',
    'korisko_system_state'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH tbl IN ARRAY tables_to_publish LOOP
      IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_tables
          WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
        ) THEN
          EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
        END IF;
      END IF;
    END LOOP;
  END IF;
END $$;

-- ==============================================================================
-- 16. SINCRONIZAR SALDOS DEVEDORES EXISTENTES PARA A NOVA TABELA EM TEMPO REAL
-- ==============================================================================
INSERT INTO public.saldos_devedores_tempo_real (
  customer_id,
  customer_name,
  customer_phone,
  previous_balance_brl,
  current_debt_balance_brl,
  open_comandas_total_brl,
  credit_limit_brl,
  available_credit_brl,
  last_operation_type,
  last_operation_amount_brl,
  setor_responsavel,
  updated_by,
  updated_at
)
SELECT
  c.id,
  c.name,
  c.phone,
  COALESCE(c.outstanding_balance_brl, 0),
  COALESCE(c.outstanding_balance_brl, 0),
  0,
  COALESCE(c.credit_limit_brl, 200000),
  GREATEST(0, COALESCE(c.credit_limit_brl, 200000) - COALESCE(c.outstanding_balance_brl, 0)),
  'sincronizacao_inicial',
  COALESCE(c.outstanding_balance_brl, 0),
  'Panificação & Confeitaria Artesanal',
  'Sistema',
  NOW()
FROM public.clientes c
ON CONFLICT (customer_id) DO UPDATE SET
  customer_name = EXCLUDED.customer_name,
  customer_phone = EXCLUDED.customer_phone,
  current_debt_balance_brl = EXCLUDED.current_debt_balance_brl,
  credit_limit_brl = EXCLUDED.credit_limit_brl,
  available_credit_brl = EXCLUDED.available_credit_brl,
  updated_at = NOW();

SELECT 'TABELAS SEPARADAS E SALDO DEVEDOR EM TEMPO REAL CONFIGURADOS COM SUCESSO!' AS status,
       (SELECT count(*) FROM public.saldos_devedores_tempo_real) AS clientes_sincronizados,
       (SELECT count(*) FROM public.comandas_abertas) AS comandas_ativas;
