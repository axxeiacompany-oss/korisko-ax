-- =================================================================================
-- KORIZKO • PANIFICAÇÃO CONFEITARIA ARTESANAL
-- SQL MESTRE DO FLUXO COMPLETO EM TEMPO REAL:
-- 1. COMANDAS POR SETOR + ADMIN TOTAL (public.comandas)
-- 2. LANÇAMENTOS DE FIADO & CONTA CORRENTE ANTI-PERDA (public.lancamentos_fiado)
-- 3. FLUXO DE COBRANÇAS & PAGAMENTOS NA HORA (public.fluxo_cobrancas_tempo_real)
-- Copie e execute este script no SQL Editor do seu painel Supabase
-- =================================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =================================================================================
-- 1. TABELA DE COMANDAS EM TEMPO REAL (POR SETOR RESPONSÁVEL E ACESSO TOTAL ADMIN)
-- =================================================================================
CREATE TABLE IF NOT EXISTS public.comandas (
  id TEXT PRIMARY KEY DEFAULT ('cmd-' || extract(epoch from now())::bigint::text),
  number TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT DEFAULT 'Cliente Balcão',
  customer_phone TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'confirmado' CHECK (
    status IN ('aguardando_confirmacao', 'confirmado', 'em_preparo', 'pronto', 'entregue', 'pago', 'cancelado')
  ),
  setor_responsavel TEXT NOT NULL DEFAULT 'panificacao' CHECK (
    setor_responsavel IN ('panificacao', 'confeitaria', 'balcao', 'caixa', 'todos')
  ),
  setores_envolvidos JSONB NOT NULL DEFAULT '["panificacao"]'::jsonb,
  confirmed_by_customer BOOLEAN NOT NULL DEFAULT true,
  confirmed_at TIMESTAMPTZ DEFAULT now(),
  opened_by TEXT DEFAULT 'Cliente / PDV',
  opened_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  total_brl NUMERIC(14,2) NOT NULL DEFAULT 0,
  forma_pagamento TEXT DEFAULT 'aguardando',
  source TEXT DEFAULT 'pdv'
);

ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS forma_pagamento TEXT DEFAULT 'aguardando';

CREATE INDEX IF NOT EXISTS idx_comandas_status ON public.comandas(status);
CREATE INDEX IF NOT EXISTS idx_comandas_setor ON public.comandas(setor_responsavel);
CREATE INDEX IF NOT EXISTS idx_comandas_opened_at ON public.comandas(opened_at DESC);

-- =================================================================================
-- 2. TABELA DE LANÇAMENTOS DE FIADO & CONTA CORRENTE (PROTEÇÃO ANTI-PERDA EM TEMPO REAL)
-- Registra cada venda no Fiado e cada Amortização/Pagamento na hora em que ocorre
-- =================================================================================
CREATE TABLE IF NOT EXISTS public.lancamentos_fiado (
  id TEXT PRIMARY KEY DEFAULT ('entry-' || extract(epoch from now())::bigint::text),
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL DEFAULT 'Cliente Cadastrado',
  type TEXT NOT NULL DEFAULT 'debito_compra' CHECK (
    type IN ('debito_compra', 'pagamento_amortizacao')
  ),
  amount_brl NUMERIC(14,2) NOT NULL DEFAULT 0,
  previous_balance_brl NUMERIC(14,2) NOT NULL DEFAULT 0,
  resulting_balance_brl NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'fiado',
  description TEXT NOT NULL DEFAULT 'Lançamento em Conta Corrente / Fiado',
  sale_id TEXT,
  comanda_number TEXT,
  setor_responsavel TEXT DEFAULT 'Panificação & Confeitaria Artesanal',
  confirmed_by_customer BOOLEAN NOT NULL DEFAULT true,
  recorded_by TEXT NOT NULL DEFAULT 'Caixa',
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lancamentos_fiado_customer ON public.lancamentos_fiado(customer_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_fiado_date ON public.lancamentos_fiado(date DESC);
CREATE INDEX IF NOT EXISTS idx_lancamentos_fiado_type ON public.lancamentos_fiado(type);

-- TRIGGER AUTOMÁTICA ANTI-PERDA:
-- Sempre que um lançamento de Fiado ou Amortização entra em public.lancamentos_fiado,
-- garante que o saldo do cliente em public.clientes seja atualizado instantaneamente.
CREATE OR REPLACE FUNCTION public.fn_proteger_saldo_fiado_cliente()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_saldo_atual NUMERIC(14,2);
  v_novo_saldo NUMERIC(14,2);
BEGIN
  SELECT COALESCE(outstanding_balance_brl, 0)
  INTO v_saldo_atual
  FROM public.clientes
  WHERE id = NEW.customer_id;

  IF FOUND THEN
    IF NEW.previous_balance_brl IS NULL OR NEW.previous_balance_brl = 0 THEN
      NEW.previous_balance_brl := v_saldo_atual;
    END IF;

    IF NEW.resulting_balance_brl IS NOT NULL AND NEW.resulting_balance_brl >= 0 THEN
      v_novo_saldo := NEW.resulting_balance_brl;
    ELSIF NEW.type = 'debito_compra' THEN
      v_novo_saldo := v_saldo_atual + COALESCE(NEW.amount_brl, 0);
      NEW.resulting_balance_brl := v_novo_saldo;
    ELSE
      v_novo_saldo := GREATEST(0, v_saldo_atual - COALESCE(NEW.amount_brl, 0));
      NEW.resulting_balance_brl := v_novo_saldo;
    END IF;

    UPDATE public.clientes
    SET outstanding_balance_brl = v_novo_saldo,
        last_purchase_date = CASE WHEN NEW.type = 'debito_compra' THEN now() ELSE last_purchase_date END,
        updated_at = now()
    WHERE id = NEW.customer_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_saldo_fiado_cliente ON public.lancamentos_fiado;
CREATE TRIGGER trg_proteger_saldo_fiado_cliente
BEFORE INSERT ON public.lancamentos_fiado
FOR EACH ROW EXECUTE FUNCTION public.fn_proteger_saldo_fiado_cliente();

-- =================================================================================
-- 3. TABELA DE FLUXO DE COBRANÇAS E PAGAMENTOS EM TEMPO REAL ("NA HORA DE COBRAR")
-- Mostra instantaneamente quando o caixa ou balcão está cobrando em Fiado, PIX,
-- Dinheiro ou Cartão antes mesmo de fechar a tela e registra a confirmação imediata
-- =================================================================================
CREATE TABLE IF NOT EXISTS public.fluxo_cobrancas_tempo_real (
  id TEXT PRIMARY KEY DEFAULT ('chk-' || extract(epoch from now())::bigint::text),
  operator_id TEXT NOT NULL DEFAULT 'emp-admin-ax',
  operator_name TEXT NOT NULL DEFAULT 'Operador',
  customer_id TEXT,
  customer_name TEXT NOT NULL DEFAULT 'Cliente Balcão',
  comanda_number TEXT,
  setor_responsavel TEXT DEFAULT 'Panificação & Confeitaria Artesanal',
  payment_method TEXT NOT NULL DEFAULT 'dinheiro' CHECK (
    payment_method IN ('dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'transferencia', 'fiado')
  ),
  amount_brl NUMERIC(14,2) NOT NULL DEFAULT 0,
  previous_debt_brl NUMERIC(14,2) NOT NULL DEFAULT 0,
  projected_debt_brl NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'em_cobranca' CHECK (
    status IN ('em_cobranca', 'confirmado_fiado', 'pago', 'cancelado')
  ),
  items_summary TEXT,
  sale_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fluxo_cobrancas_status ON public.fluxo_cobrancas_tempo_real(status);
CREATE INDEX IF NOT EXISTS idx_fluxo_cobrancas_updated ON public.fluxo_cobrancas_tempo_real(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_fluxo_cobrancas_method ON public.fluxo_cobrancas_tempo_real(payment_method);

-- =================================================================================
-- 4. COLUNAS DE COMANDA E SETOR RESPONSÁVEL EM VENDAS E ORDERS (EXTRATO & CUPOM)
-- =================================================================================
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS comanda_number TEXT;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS setor_responsavel TEXT DEFAULT 'Panificação & Confeitaria Artesanal';
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS confirmed_by_customer BOOLEAN DEFAULT true;

-- =================================================================================
-- 5. TRIGGER AUTOMÁTICA: QUANDO UMA VENDA COM PAGAMENTO EM FIADO ENTRA EM public.vendas,
-- GERA AUTOMATICAMENTE O REGISTRO NA TABELA public.lancamentos_fiado SE AINDA NÃO EXISTIR
-- =================================================================================
CREATE OR REPLACE FUNCTION public.fn_auto_registrar_fiado_da_venda()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment JSONB;
  v_fiado_amount NUMERIC(14,2) := 0;
  v_cust_name TEXT;
  v_saldo_anterior NUMERIC(14,2) := 0;
BEGIN
  IF NEW.customer_id IS NOT NULL AND NEW.payments IS NOT NULL AND jsonb_typeof(NEW.payments) = 'array' THEN
    FOR v_payment IN SELECT * FROM jsonb_array_elements(NEW.payments)
    LOOP
      IF (v_payment->>'method') = 'fiado' THEN
        v_fiado_amount := v_fiado_amount + COALESCE((v_payment->>'equivalentBrl')::numeric, (v_payment->>'amountReceived')::numeric, 0);
      END IF;
    END LOOP;

    IF v_fiado_amount > 0 THEN
      SELECT COALESCE(name, NEW.customer_name, 'Cliente Fiado'), COALESCE(outstanding_balance_brl, 0)
      INTO v_cust_name, v_saldo_anterior
      FROM public.clientes
      WHERE id = NEW.customer_id;

      IF NOT EXISTS (SELECT 1 FROM public.lancamentos_fiado WHERE sale_id = NEW.id) THEN
        INSERT INTO public.lancamentos_fiado (
          id,
          customer_id,
          customer_name,
          type,
          amount_brl,
          previous_balance_brl,
          resulting_balance_brl,
          payment_method,
          description,
          sale_id,
          comanda_number,
          setor_responsavel,
          confirmed_by_customer,
          recorded_by,
          date
        ) VALUES (
          'entry-auto-' || NEW.id,
          NEW.customer_id,
          COALESCE(v_cust_name, NEW.customer_name, 'Cliente Fiado'),
          'debito_compra',
          v_fiado_amount,
          v_saldo_anterior,
          v_saldo_anterior + v_fiado_amount,
          'fiado',
          'Venda #' || COALESCE(NEW.sale_number::text, 'PDV') || ' • Comanda #' || COALESCE(NEW.comanda_number, 'BALCÃO'),
          NEW.id,
          NEW.comanda_number,
          COALESCE(NEW.setor_responsavel, 'Panificação & Confeitaria Artesanal'),
          true,
          COALESCE(NEW.employee_name, 'Caixa'),
          COALESCE(NEW.timestamp, now())
        )
        ON CONFLICT (id) DO NOTHING;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_registrar_fiado_da_venda ON public.vendas;
CREATE TRIGGER trg_auto_registrar_fiado_da_venda
AFTER INSERT ON public.vendas
FOR EACH ROW EXECUTE FUNCTION public.fn_auto_registrar_fiado_da_venda();

-- =================================================================================
-- 6. PERMISSÕES E POLÍTICAS RLS + SUPABASE REALTIME
-- =================================================================================
ALTER TABLE public.comandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos_fiado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fluxo_cobrancas_tempo_real ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comandas_admin_and_sectors_full_access" ON public.comandas;
CREATE POLICY "comandas_admin_and_sectors_full_access"
ON public.comandas FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "lancamentos_fiado_full_access" ON public.lancamentos_fiado;
CREATE POLICY "lancamentos_fiado_full_access"
ON public.lancamentos_fiado FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "fluxo_cobrancas_tempo_real_full_access" ON public.fluxo_cobrancas_tempo_real;
CREATE POLICY "fluxo_cobrancas_tempo_real_full_access"
ON public.fluxo_cobrancas_tempo_real FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

GRANT ALL ON public.comandas TO anon, authenticated, service_role;
GRANT ALL ON public.lancamentos_fiado TO anon, authenticated, service_role;
GRANT ALL ON public.fluxo_cobrancas_tempo_real TO anon, authenticated, service_role;

ALTER TABLE public.comandas REPLICA IDENTITY FULL;
ALTER TABLE public.lancamentos_fiado REPLICA IDENTITY FULL;
ALTER TABLE public.fluxo_cobrancas_tempo_real REPLICA IDENTITY FULL;
ALTER TABLE public.clientes REPLICA IDENTITY FULL;
ALTER TABLE public.vendas REPLICA IDENTITY FULL;
ALTER TABLE public.korisko_system_state REPLICA IDENTITY FULL;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'comandas',
    'lancamentos_fiado',
    'fluxo_cobrancas_tempo_real',
    'clientes',
    'vendas',
    'korisko_system_state'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      END IF;
    END IF;
  END LOOP;
END $$;
