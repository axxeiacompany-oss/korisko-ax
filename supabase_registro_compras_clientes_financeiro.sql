-- ==============================================================================
-- KORIZKO • PANIFICAÇÃO CONFEITARIA ARTESANAL
-- TABELA SQL DEDICADA: REGISTRO DE COMPRAS POR CLIENTE & ANÁLISE FINANCEIRA (ENTRADAS E SAÍDAS)
-- ==============================================================================

-- Remover view temporariamente caso já exista para permitir padronização de tipos
DROP VIEW IF EXISTS public.vw_analise_financeira_entradas_saidas;

-- 1. GARANTIR COLUNAS DE TOTAL COMPRADO NA TABELA DE CLIENTES (public.clientes)
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS total_spent_brl NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS purchase_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_purchase_date TIMESTAMPTZ;

-- Padronizar last_purchase_date para TIMESTAMPTZ caso tenha sido criada como TEXT anteriormente
ALTER TABLE public.clientes
  ALTER COLUMN last_purchase_date TYPE TIMESTAMPTZ
  USING CASE
    WHEN last_purchase_date IS NULL OR TRIM(last_purchase_date::TEXT) = '' THEN NULL
    ELSE (last_purchase_date::TEXT)::TIMESTAMPTZ
  END;

-- 2. CRIAR TABELA DEDICADA DE REGISTRO DE COMPRAS DE CADA CLIENTE (public.registro_compras_clientes)
CREATE TABLE IF NOT EXISTS public.registro_compras_clientes (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL DEFAULT 'Cliente Cadastrado',
  customer_phone TEXT,
  sale_id TEXT,
  sale_number INTEGER,
  comanda_number TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  items_summary TEXT NOT NULL DEFAULT '',
  total_amount_brl NUMERIC NOT NULL DEFAULT 0,      -- Valor Total Comprado (₲ PYG)
  estimated_cost_brl NUMERIC NOT NULL DEFAULT 0,    -- Custo Estimado dos Produtos / CMV (Controle Admin e Setores)
  paid_amount_brl NUMERIC NOT NULL DEFAULT 0,       -- Valor Pago no Ato (Entrada no Caixa)
  fiado_amount_brl NUMERIC NOT NULL DEFAULT 0,      -- Valor Lançado em Fiado / Em Aberto
  payment_method TEXT NOT NULL DEFAULT 'dinheiro',  -- dinheiro, pix, cartao_debito, cartao_credito, transferencia, fiado
  flow_type TEXT NOT NULL DEFAULT 'entrada_avista', -- entrada_avista, fiado_pendente, entrada_amortizacao, saida_custo
  setor_responsavel TEXT DEFAULT 'Panificação & Confeitaria Artesanal',
  recorded_by TEXT DEFAULT 'Operador',
  notes TEXT,
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Padronizar purchase_date para TIMESTAMPTZ caso tenha sido criada como TEXT anteriormente
ALTER TABLE public.registro_compras_clientes
  ALTER COLUMN purchase_date TYPE TIMESTAMPTZ
  USING CASE
    WHEN purchase_date IS NULL OR TRIM(purchase_date::TEXT) = '' THEN NOW()
    ELSE (purchase_date::TEXT)::TIMESTAMPTZ
  END;

-- Índices para consultas rápidas por cliente e por período (Gráfico Financeiro)
CREATE INDEX IF NOT EXISTS idx_registro_compras_customer_id
  ON public.registro_compras_clientes (customer_id, purchase_date DESC);

CREATE INDEX IF NOT EXISTS idx_registro_compras_purchase_date
  ON public.registro_compras_clientes (purchase_date DESC);

CREATE INDEX IF NOT EXISTS idx_registro_compras_flow_type
  ON public.registro_compras_clientes (flow_type, purchase_date DESC);

-- 3. TRIGGER AUTOMÁTICA PARA RECALCULAR "TOTAL COMPRADO" (total_spent_brl) DE CADA CLIENTE
-- Sem duplicar comandas abertas (purch-cmd-*) quando a venda finalizada (sale_id) é registrada,
-- e sem misturar o Preço de Custo / CMV (controle exclusivo do Admin e Setores Responsáveis) na soma da comanda do cliente.
CREATE OR REPLACE FUNCTION public.fn_atualizar_total_comprado_cliente()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_id TEXT;
  v_total NUMERIC;
  v_count INTEGER;
  v_last_date TIMESTAMPTZ;
BEGIN
  v_customer_id := COALESCE(NEW.customer_id, OLD.customer_id);
  IF v_customer_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT
    COALESCE(SUM(r.total_amount_brl), 0),
    COUNT(*),
    MAX(r.purchase_date::TIMESTAMPTZ)
  INTO v_total, v_count, v_last_date
  FROM public.registro_compras_clientes r
  WHERE r.customer_id = v_customer_id
    AND NOT (
      r.id LIKE 'purch-cmd-%'
      AND r.sale_id IS NULL
      AND r.comanda_number IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.registro_compras_clientes s
        WHERE s.customer_id = v_customer_id
          AND s.sale_id IS NOT NULL
          AND LOWER(TRIM(s.comanda_number)) = LOWER(TRIM(r.comanda_number))
      )
    );

  UPDATE public.clientes
  SET
    total_spent_brl = v_total,
    purchase_count = v_count,
    last_purchase_date = COALESCE(v_last_date, last_purchase_date)
  WHERE id = v_customer_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_atualizar_total_comprado_cliente ON public.registro_compras_clientes;
CREATE TRIGGER trg_atualizar_total_comprado_cliente
  AFTER INSERT OR UPDATE OR DELETE ON public.registro_compras_clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_atualizar_total_comprado_cliente();

-- 4. POLÍTICAS RLS E PERMISSÕES EM TEMPO REAL
ALTER TABLE public.registro_compras_clientes REPLICA IDENTITY FULL;
ALTER TABLE public.registro_compras_clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso Total Registro Compras Clientes Korizko" ON public.registro_compras_clientes;
CREATE POLICY "Acesso Total Registro Compras Clientes Korizko"
  ON public.registro_compras_clientes
  FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT ALL ON public.registro_compras_clientes TO anon, authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'registro_compras_clientes'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.registro_compras_clientes;
    END IF;
  END IF;
END $$;

-- 5. VIEW SQL DE ANÁLISE FINANCEIRA DIÁRIA: SOMA LIMPA DE COMANDAS/COMPRAS E CONTROLE INTERNO DE CMV (ADMIN & SETORES)
CREATE OR REPLACE VIEW public.vw_analise_financeira_entradas_saidas
WITH (security_invoker = true) AS
SELECT
  DATE_TRUNC('day', purchase_date::TIMESTAMPTZ)::DATE AS data_movimento,
  COUNT(*) AS total_compras_registradas,
  COALESCE(SUM(total_amount_brl), 0) AS total_comprado_clientes_pyg,
  COALESCE(SUM(paid_amount_brl), 0) AS total_entradas_pagas_pyg,
  COALESCE(SUM(fiado_amount_brl), 0) AS total_fiado_aberto_pyg,
  COALESCE(SUM(estimated_cost_brl), 0) AS total_saidas_custo_cmv_pyg,
  COALESCE(SUM(paid_amount_brl), 0) AS saldo_liquido_caixa_pyg
FROM public.registro_compras_clientes
GROUP BY DATE_TRUNC('day', purchase_date::TIMESTAMPTZ)::DATE
ORDER BY data_movimento DESC;

ALTER VIEW public.vw_analise_financeira_entradas_saidas SET (security_invoker = true);
GRANT SELECT ON public.vw_analise_financeira_entradas_saidas TO anon, authenticated, service_role;

-- 6. LIMPEZA DE DUPLICIDADES E RECÁLCULO AUTOMÁTICO DA SOMA DE COMANDAS DOS CLIENTES
DELETE FROM public.registro_compras_clientes r
WHERE r.id LIKE 'purch-cmd-%'
  AND r.sale_id IS NULL
  AND r.comanda_number IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.registro_compras_clientes s
    WHERE s.customer_id = r.customer_id
      AND s.sale_id IS NOT NULL
      AND LOWER(TRIM(s.comanda_number)) = LOWER(TRIM(r.comanda_number))
  );

UPDATE public.clientes c
SET
  total_spent_brl = COALESCE(sub.soma_limpa, 0),
  purchase_count = COALESCE(sub.qtd_compras, 0),
  last_purchase_date = COALESCE(sub.ultima_data, c.last_purchase_date)
FROM (
  SELECT
    customer_id,
    SUM(total_amount_brl) AS soma_limpa,
    COUNT(*) AS qtd_compras,
    MAX(purchase_date::TIMESTAMPTZ) AS ultima_data
  FROM public.registro_compras_clientes
  GROUP BY customer_id
) sub
WHERE c.id = sub.customer_id;
