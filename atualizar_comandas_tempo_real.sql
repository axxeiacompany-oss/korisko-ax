-- =================================================================================
-- KORIZKO • PANIFICAÇÃO CONFEITARIA ARTESANAL
-- SQL DE ATUALIZAÇÃO: COMANDAS CONFIRMADAS EM TEMPO REAL + SETORES + ADMIN TOTAL
-- Copie e execute este script no SQL Editor do seu painel Supabase
-- =================================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABELA DE COMANDAS EM TEMPO REAL (POR SETOR RESPONSÁVEL E ACESSO TOTAL ADMIN)
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
  source TEXT DEFAULT 'pdv'
);

CREATE INDEX IF NOT EXISTS idx_comandas_status ON public.comandas(status);
CREATE INDEX IF NOT EXISTS idx_comandas_setor ON public.comandas(setor_responsavel);
CREATE INDEX IF NOT EXISTS idx_comandas_opened_at ON public.comandas(opened_at DESC);

-- 2. COLUNAS DE COMANDA E SETOR RESPONSÁVEL EM VENDAS E ORDERS (EXTRATO & CUPOM)
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS comanda_number TEXT;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS setor_responsavel TEXT DEFAULT 'Panificação & Confeitaria Artesanal';
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS confirmed_by_customer BOOLEAN DEFAULT true;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS comanda_number TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS setor_responsavel TEXT DEFAULT 'Panificação & Confeitaria Artesanal';
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS confirmed_by_customer BOOLEAN DEFAULT true;
  END IF;
END $$;

-- 3. TRIGGER AUTOMÁTICA: QUANDO O CLIENTE CONFIRMA UM PEDIDO ONLINE (ORDERS),
-- CRIA OU ATUALIZA AUTOMATICAMENTE A COMANDA PARA O SETOR RESPONSÁVEL EM TEMPO REAL
CREATE OR REPLACE FUNCTION public.fn_sync_order_to_comanda()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_comanda_num TEXT;
BEGIN
  IF NEW.status IN ('confirmed', 'paid', 'preparing') THEN
    v_comanda_num := COALESCE(NEW.comanda_number, 'CMD-' || COALESCE(NEW.order_number, substring(NEW.id::text from 1 for 6)));
    INSERT INTO public.comandas (
      id,
      number,
      customer_id,
      customer_name,
      notes,
      status,
      setor_responsavel,
      confirmed_by_customer,
      confirmed_at,
      opened_by,
      opened_at,
      updated_at,
      total_brl,
      source
    ) VALUES (
      'cmd-' || NEW.id::text,
      v_comanda_num,
      NEW.user_id::text,
      COALESCE((NEW.shipping_address->>'recipientName'), 'Cliente Loja Online'),
      NEW.notes,
      CASE
        WHEN NEW.status = 'preparing' THEN 'em_preparo'
        ELSE 'confirmado'
      END,
      COALESCE(NEW.setor_responsavel, 'todos'),
      true,
      now(),
      'Cliente Loja Online',
      COALESCE(NEW.created_at, now()),
      now(),
      COALESCE(NEW.total, 0),
      'loja_online'
    )
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
    DROP TRIGGER IF EXISTS trg_sync_order_to_comanda ON public.orders;
    CREATE TRIGGER trg_sync_order_to_comanda
    AFTER INSERT OR UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_order_to_comanda();
  END IF;
END $$;

-- 4. PERMISSÕES E POLÍTICAS RLS (ACESSO TOTAL ADMIN + OPERAÇÃO EM TEMPO REAL DOS SETORES)
ALTER TABLE public.comandas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comandas_admin_and_sectors_full_access" ON public.comandas;
CREATE POLICY "comandas_admin_and_sectors_full_access"
ON public.comandas
FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

GRANT ALL ON public.comandas TO anon, authenticated, service_role;

-- 5. ATIVAR SUPABASE REALTIME EM TODAS AS TABELAS DE COMANDAS, VENDAS E ESTADO
ALTER TABLE public.comandas REPLICA IDENTITY FULL;
ALTER TABLE public.vendas REPLICA IDENTITY FULL;
ALTER TABLE public.korisko_system_state REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'comandas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comandas;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'vendas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vendas;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'korisko_system_state'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.korisko_system_state;
  END IF;
END $$;
