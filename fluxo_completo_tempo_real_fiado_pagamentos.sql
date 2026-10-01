-- =================================================================================
-- KORIZKO • PANIFICAÇÃO CONFEITARIA ARTESANAL
-- SCRIPT SQL ÚNICO E COMPLETO (PRODUTOS COM FOTOS + COMANDAS + FIADO + TEMPO REAL)
-- Copie todo este script, cole no SQL Editor do Supabase e clique em RUN.
-- =================================================================================

-- 1. GARANTIR COLUNAS DE FOTOS E DETALHES NA TABELA DE PRODUTOS
ALTER TABLE IF EXISTS public.produtos
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT true;

-- 2. INSERIR / ATUALIZAR OS PRODUTOS COM FOTOS (INCLUINDO COMBO 3 BROWNIES 70% CACAU)
INSERT INTO public.produtos (
  id,
  code,
  name,
  category,
  price_brl,
  cost_price_brl,
  stock,
  min_stock,
  unit,
  active,
  image_url,
  description,
  slug,
  compare_at_price,
  featured
) VALUES
  (
    'prod-cuca-alema',
    'CONF-010',
    'Cuca Alemã Doce de Leite com Canela',
    'confeitaria',
    50000,
    20000,
    15,
    5,
    'un',
    true,
    '/images/products/cuca-alema.jpg',
    'Massa fofinha artesanal, farta cobertura de doce de leite com canela e farofa crocante alemã.',
    'cuca-alema-doce-de-leite-canela',
    NULL,
    true
  ),
  (
    'prod-bolo-pudim',
    'CONF-011',
    'Bolo Pudim',
    'confeitaria',
    40000,
    16000,
    12,
    4,
    'un',
    true,
    '/images/products/bolo-pudim.jpg',
    'Pudim de leite condensado caramelizado e super cremoso sobre bolo de chocolate úmido.',
    'bolo-pudim',
    NULL,
    true
  ),
  (
    'prod-brownie-70',
    'CONF-012',
    'Brownie de Chocolate 70% Cacau (Unidade)',
    'confeitaria',
    20000,
    8000,
    30,
    10,
    'un',
    true,
    '/images/products/brownie-70-cacau.jpg',
    'Intenso no sabor, irresistível em cada mordida. Chocolate nobre 70% cacau com casquinha craquelada.',
    'brownie-chocolate-70-cacau',
    NULL,
    true
  ),
  (
    'prod-combo-brownies',
    'CONF-013',
    'Combo 3 Brownies 70% Cacau',
    'confeitaria',
    50000,
    24000,
    10,
    3,
    'un',
    true,
    '/src/assets/images/combo_tres_brownies_1790886603094.jpg',
    'Combo promocional com 3 unidades do brownie 70% cacau. Economize ₲ 10.000!',
    'combo-3-brownies-70-cacau',
    60000,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  price_brl = EXCLUDED.price_brl,
  cost_price_brl = EXCLUDED.cost_price_brl,
  stock = EXCLUDED.stock,
  min_stock = EXCLUDED.min_stock,
  unit = EXCLUDED.unit,
  active = EXCLUDED.active,
  image_url = EXCLUDED.image_url,
  description = EXCLUDED.description,
  slug = EXCLUDED.slug,
  compare_at_price = EXCLUDED.compare_at_price,
  featured = EXCLUDED.featured,
  updated_at = NOW();

-- 3. TABELA DE COMANDAS EM TEMPO REAL POR SETOR RESPONSÁVEL + ACESSO TOTAL ADMIN
CREATE TABLE IF NOT EXISTS public.comandas (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT DEFAULT 'Cliente Balcão',
  customer_phone TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmado', -- 'aberto', 'confirmado', 'em_preparo', 'pronto', 'entregue', 'pago', 'cancelado'
  setor_responsavel TEXT NOT NULL DEFAULT 'panificacao', -- 'panificacao', 'confeitaria', 'salgados', 'bebidas_frios', 'todos'
  confirmed_by_customer BOOLEAN NOT NULL DEFAULT true,
  confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'pdv', -- 'pdv', 'loja_online', 'cliente_direto'
  notes TEXT,
  created_by TEXT DEFAULT 'Sistema',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmado';
ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS setor_responsavel TEXT NOT NULL DEFAULT 'panificacao';
ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS confirmed_by_customer BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'pdv';
ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 4. TABELA DE LANÇAMENTOS DE FIADO E CONTA CORRENTE (ANTI-PERDA EM TEMPO REAL)
CREATE TABLE IF NOT EXISTS public.lancamentos_fiado (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  sale_id TEXT,
  comanda_number TEXT,
  setor_responsavel TEXT DEFAULT 'Panificação & Confeitaria Artesanal',
  type TEXT NOT NULL DEFAULT 'debito_compra', -- 'debito_compra' (Fiado) ou 'credito_pagamento' (Quitação)
  payment_method TEXT DEFAULT 'fiado',
  amount_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  previous_balance_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  resulting_balance_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  recorded_by TEXT NOT NULL DEFAULT 'Caixa',
  company_name TEXT NOT NULL DEFAULT 'Korizko',
  company_subtitle TEXT NOT NULL DEFAULT 'Panificação confeitaria artesanal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABELA DO FLUXO DE COBRANÇAS E SELEÇÃO DE PAGAMENTO NA HORA (TEMPO REAL)
CREATE TABLE IF NOT EXISTS public.fluxo_cobrancas_tempo_real (
  id TEXT PRIMARY KEY,
  operator_id TEXT,
  operator_name TEXT NOT NULL DEFAULT 'Caixa',
  source TEXT NOT NULL DEFAULT 'pdv', -- 'pdv', 'comanda', 'venda_direta', 'loja_online', 'fiado_quitacao'
  comanda_number TEXT,
  setor_responsavel TEXT DEFAULT 'Panificação & Confeitaria Artesanal',
  customer_id TEXT,
  customer_name TEXT DEFAULT 'Cliente Balcão',
  selected_method TEXT NOT NULL DEFAULT 'dinheiro', -- 'fiado', 'dinheiro', 'pix', 'cartao_debito', 'cartao_credito'
  status TEXT NOT NULL DEFAULT 'em_cobranca', -- 'em_cobranca', 'confirmando_fiado', 'concluido', 'cancelado'
  subtotal_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  discount_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  paid_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  remaining_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  previous_debt_brl NUMERIC(14, 2) DEFAULT 0,
  projected_debt_brl NUMERIC(14, 2) DEFAULT 0,
  items_count INTEGER NOT NULL DEFAULT 0,
  items_summary TEXT,
  sale_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. COLUNAS EXTRAS NA TABELA DE VENDAS PARA RASTREIO DE COMANDA E EXTRATO KORIZKO
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vendas') THEN
    ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS comanda_number TEXT;
    ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS setor_responsavel TEXT DEFAULT 'Panificação & Confeitaria Artesanal';
    ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS confirmed_by_customer BOOLEAN DEFAULT true;
    ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS company_subtitle TEXT DEFAULT 'Panificação confeitaria artesanal';
  END IF;
END $$;

-- 7. TRIGGER AUTOMÁTICA: ATUALIZAR SALDO DO CLIENTE NA HORA AO LANÇAR FIADO OU PAGAMENTO
CREATE OR REPLACE FUNCTION public.fn_sync_fiado_saldo_cliente()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clientes') THEN
    IF NEW.type = 'debito_compra' THEN
      UPDATE public.clientes
      SET
        outstanding_balance_brl = GREATEST(0, COALESCE(outstanding_balance_brl, 0) + NEW.amount_brl),
        total_spent_brl = COALESCE(total_spent_brl, 0) + NEW.amount_brl,
        purchase_count = COALESCE(purchase_count, 0) + 1,
        last_purchase_date = NOW(),
        updated_at = NOW()
      WHERE id = NEW.customer_id;
    ELSIF NEW.type = 'credito_pagamento' THEN
      UPDATE public.clientes
      SET
        outstanding_balance_brl = GREATEST(0, COALESCE(outstanding_balance_brl, 0) - NEW.amount_brl),
        updated_at = NOW()
      WHERE id = NEW.customer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_fiado_saldo_cliente ON public.lancamentos_fiado;
CREATE TRIGGER trg_sync_fiado_saldo_cliente
AFTER INSERT ON public.lancamentos_fiado
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_fiado_saldo_cliente();

-- 8. ÍNDICES DE ALTA PERFORMANCE E RLS
CREATE INDEX IF NOT EXISTS idx_comandas_setor_status ON public.comandas (setor_responsavel, status);
CREATE INDEX IF NOT EXISTS idx_lancamentos_fiado_customer ON public.lancamentos_fiado (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fluxo_cobrancas_status ON public.fluxo_cobrancas_tempo_real (status, updated_at DESC);

ALTER TABLE public.comandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos_fiado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fluxo_cobrancas_tempo_real ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso tempo real comandas" ON public.comandas;
CREATE POLICY "Acesso tempo real comandas" ON public.comandas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso tempo real lancamentos_fiado" ON public.lancamentos_fiado;
CREATE POLICY "Acesso tempo real lancamentos_fiado" ON public.lancamentos_fiado FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso tempo real fluxo_cobrancas" ON public.fluxo_cobrancas_tempo_real;
CREATE POLICY "Acesso tempo real fluxo_cobrancas" ON public.fluxo_cobrancas_tempo_real FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.produtos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.comandas TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.lancamentos_fiado TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.fluxo_cobrancas_tempo_real TO anon, authenticated, service_role;

-- 9. SINCRONIZAR ESTADO CONSOLIDADO (korisko_system_state) COM OS PRODUTOS ATUALIZADOS
UPDATE public.korisko_system_state
SET 
  data = jsonb_set(
    data,
    '{products}',
    (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', id,
            'code', code,
            'name', name,
            'category', category,
            'priceBrl', price_brl,
            'costPriceBrl', cost_price_brl,
            'stock', stock,
            'minStock', min_stock,
            'unit', unit,
            'active', active,
            'imageUrl', image_url,
            'description', description,
            'slug', slug,
            'compareAtPrice', compare_at_price,
            'featured', featured
          )
        ),
        '[]'::jsonb
      )
      FROM public.produtos
      WHERE active = true
    )
  ),
  updated_at = NOW()
WHERE id = 'active_state';

-- 10. ATIVAR SUPABASE REALTIME EM TODAS AS TABELAS DO FLUXO
ALTER TABLE public.produtos REPLICA IDENTITY FULL;
ALTER TABLE public.comandas REPLICA IDENTITY FULL;
ALTER TABLE public.lancamentos_fiado REPLICA IDENTITY FULL;
ALTER TABLE public.fluxo_cobrancas_tempo_real REPLICA IDENTITY FULL;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'produtos',
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


-- ==============================================================================
-- 7. APRIMORAMENTO: TABELAS SEPARADAS POR FUNÇÃO + SALDO DEVEDOR AO LANÇAR COMANDA
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

ALTER TABLE public.comandas_abertas ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE public.comandas_abertas ADD COLUMN IF NOT EXISTS debt_applied_brl NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE public.comandas_abertas ADD COLUMN IF NOT EXISTS previous_debt_brl NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE public.comandas_abertas ADD COLUMN IF NOT EXISTS resulting_debt_brl NUMERIC(14, 2) DEFAULT 0;

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

CREATE TABLE IF NOT EXISTS public.fornadas_producao (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC(12, 3) NOT NULL DEFAULT 0,
  baked_by TEXT DEFAULT 'Padeiro',
  notes TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
