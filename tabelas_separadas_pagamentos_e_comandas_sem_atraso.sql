-- =================================================================================
-- KORIZKO • PANIFICAÇÃO CONFEITARIA ARTESANAL
-- SCRIPT DE SEPARAÇÃO DE ETAPAS DE VALORES & FLUXO CONTÍNUO DE COMANDAS
-- =================================================================================

-- 1. TABELA DE SEPARAÇÃO INDIVIDUAL DE ETAPAS DE PAGAMENTO (DINHEIRO, CARTÃO, PIX, FIADO)
-- Cada método de pagamento opera de forma independente e isolada, sem interferir no outro.
CREATE TABLE IF NOT EXISTS public.pagamentos_vendas_etapas (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL,
  sale_number INTEGER,
  comanda_number TEXT,
  customer_id TEXT,
  customer_name TEXT,
  method TEXT NOT NULL, -- 'dinheiro', 'cartao_debito', 'cartao_credito', 'pix', 'transferencia', 'fiado'
  currency TEXT NOT NULL DEFAULT 'PYG',
  amount_received NUMERIC(14, 2) NOT NULL DEFAULT 0,
  exchange_rate_used NUMERIC(14, 4) NOT NULL DEFAULT 1,
  equivalent_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  stage_status TEXT NOT NULL DEFAULT 'liquidado', -- 'liquidado' (pago), 'a_receber' (fiado)
  destination_type TEXT NOT NULL, -- 'gaveta_caixa', 'operadora_cartao', 'banco_digital', 'caderneta_fiado'
  recorded_by TEXT NOT NULL DEFAULT 'Caixa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_etapas_sale ON public.pagamentos_vendas_etapas(sale_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_etapas_method ON public.pagamentos_vendas_etapas(method);
CREATE INDEX IF NOT EXISTS idx_pagamentos_etapas_customer ON public.pagamentos_vendas_etapas(customer_id);

ALTER TABLE public.pagamentos_vendas_etapas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso pagamentos etapas" ON public.pagamentos_vendas_etapas;
CREATE POLICY "Acesso pagamentos etapas" ON public.pagamentos_vendas_etapas FOR ALL USING (true) WITH CHECK (true);

-- 2. GARANTIR STATUS E ATUALIZAÇÃO RÁPIDA NAS COMANDAS PARA ELIMINAR PEDIDOS FANTASMAS
ALTER TABLE IF EXISTS public.comandas
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmado',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_comandas_status_lookup ON public.comandas(status, number);

-- 3. FUNÇÃO PARA FINALIZAR COMANDA INSTANTANEAMENTE SEM ATRASO
CREATE OR REPLACE FUNCTION public.fn_finalizar_comanda_fluxo_continuo(p_comanda_ref TEXT)
RETURNS VOID AS $$
BEGIN
  -- Atualiza o status para 'pago' para impedir reentrada
  UPDATE public.comandas
  SET status = 'pago', updated_at = NOW()
  WHERE id = p_comanda_ref OR number = p_comanda_ref;

  -- Remove da listagem ativa imediatamente
  DELETE FROM public.comandas
  WHERE (id = p_comanda_ref OR number = p_comanda_ref)
    AND status IN ('pago', 'cancelado');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. HABILITAR TEMPO REAL NO SUPABASE (REALTIME REPLICA)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pagamentos_vendas_etapas;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN others THEN NULL;
END $$;
