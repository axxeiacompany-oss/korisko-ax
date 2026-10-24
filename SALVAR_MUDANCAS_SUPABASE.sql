-- ==============================================================================
-- 🥖 PADARIA KORISKO - SCRIPT SQL DEFINITIVO & OTIMIZADO PARA O SUPABASE
-- ==============================================================================
-- INSTRUÇÕES DE EXECUÇÃO:
-- 1. Acesse o painel do Supabase (https://supabase.com/dashboard)
-- 2. Selecione o seu projeto Korizko
-- 3. No menu lateral esquerdo, clique no ícone "SQL Editor"
-- 4. Clique em "New Query" (+), cole TODO este script abaixo e clique em "RUN" (▶)
-- 5. Pronto! Todas as tabelas, clientes atribuídos ao Guilherme, produtos com fotos,
--    índices de alta performance e sincronização em tempo real estarão 100% ativos!
-- ==============================================================================

-- Habilitar extensões fundamentais do PostgreSQL
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
  allowed_features JSONB DEFAULT '["dashboard","pdv","venda_direta","loja","estoque","fichas_tecnicas","crm","clientes","caixa","mais_vendidos","metas","cambio","backup","afiliados","portal_afiliado"]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir colunas na tabela usuarios
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'caixa';
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS pin TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS avatar_color TEXT DEFAULT 'bg-indigo-600';
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS allowed_features JSONB DEFAULT '["dashboard","pdv","venda_direta","crm"]'::jsonb;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Inserir / Atualizar Administrador Ax
INSERT INTO public.usuarios (id, name, email, role, password, pin, avatar_color, allowed_features, active)
VALUES (
  'emp-admin-ax',
  'Ax',
  'axxeiacompany@gmail.com',
  'admin',
  '9APG_47z-EgF4yz',
  '9APG_47z-EgF4yz',
  'bg-amber-600',
  '["dashboard","pdv","venda_direta","loja","estoque","fichas_tecnicas","crm","clientes","caixa","mais_vendidos","metas","cambio","backup","afiliados","portal_afiliado"]'::jsonb,
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
  active = true,
  updated_at = NOW();

-- Inserir / Atualizar Guilherme (Afiliado Oficial)
INSERT INTO public.usuarios (id, name, email, role, password, pin, avatar_color, allowed_features, active)
VALUES (
  'emp-afiliado-guilherme',
  'Guilherme',
  'guilherme@korisko.com',
  'afiliado',
  '1234',
  '1234',
  'bg-purple-600',
  '["dashboard","crm","clientes","loja","portal_afiliado"]'::jsonb,
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
  active = true,
  updated_at = NOW();

-- Operador de Caixa Padrão
INSERT INTO public.usuarios (id, name, email, role, password, pin, avatar_color, allowed_features, active)
VALUES (
  'emp-caixa-1',
  'Operador Caixa',
  'caixa@korisko.com',
  'caixa',
  '1234',
  '1234',
  'bg-emerald-600',
  '["dashboard","pdv","venda_direta","crm","clientes","caixa"]'::jsonb,
  true
)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 2. TABELA DE AFILIADOS & COMISSÕES (affiliates & commissions)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.affiliates (
  id TEXT PRIMARY KEY
);

-- Garantir TODAS as colunas na tabela affiliates ANTES de qualquer INSERT
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS affiliate_code TEXT;
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5, 2) DEFAULT 10.00;
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS clicks_count INTEGER DEFAULT 0;
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS pix_key TEXT;
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS bank_info JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Remover restrições foreign key restritivas para auth.users caso existam de migrações legadas
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tc.constraint_name 
    FROM information_schema.table_constraints tc 
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name 
    WHERE tc.table_schema = 'public' AND tc.table_name = 'affiliates' AND tc.constraint_type = 'FOREIGN KEY'
  ) LOOP
    EXECUTE format('ALTER TABLE public.affiliates DROP CONSTRAINT IF EXISTS %I;', r.constraint_name);
  END LOOP;
END $$;

-- Converter id e user_id para TEXT caso tenham sido criados como UUID anteriormente
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'affiliates' AND column_name = 'id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.affiliates ALTER COLUMN id TYPE TEXT USING id::TEXT;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'affiliates' AND column_name = 'user_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.affiliates ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
  END IF;
END $$;

-- Índice único em affiliate_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliates_code ON public.affiliates(affiliate_code);

-- Garantir registro do Guilherme como Afiliado Oficial
INSERT INTO public.affiliates (id, user_id, affiliate_code, status, commission_rate, clicks_count)
VALUES (
  'emp-afiliado-guilherme',
  'emp-afiliado-guilherme',
  'GUILHERME',
  'active',
  10.00,
  0
)
ON CONFLICT (id) DO UPDATE SET
  affiliate_code = 'GUILHERME',
  status = 'active',
  commission_rate = 10.00,
  clicks_count = COALESCE(public.affiliates.clicks_count, 0),
  updated_at = NOW();

CREATE TABLE IF NOT EXISTS public.commissions (
  id TEXT PRIMARY KEY DEFAULT ('com-' || extract(epoch from now())::text),
  affiliate_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  rate NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
  status TEXT NOT NULL DEFAULT 'pending',
  order_number TEXT,
  order_total NUMERIC(12, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- ==============================================================================
-- 3. TABELA DE PRODUTOS & ESTOQUE (produtos)
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
  compare_at_price NUMERIC(12, 2),
  featured BOOLEAN DEFAULT false,
  is_ingredient BOOLEAN DEFAULT false,
  expiration_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'paes';
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS price_brl NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS cost_price_brl NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS stock NUMERIC(12, 3) DEFAULT 0.000;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS min_stock NUMERIC(12, 3) DEFAULT 0.000;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'un';
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(12, 2);
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS is_ingredient BOOLEAN DEFAULT false;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS expiration_date DATE;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Inserir / Atualizar Produtos em Destaque com Imagens e Preços em Guaranis ₲
INSERT INTO public.produtos (id, code, name, category, price_brl, cost_price_brl, stock, min_stock, unit, active, image_url, description, slug, featured)
VALUES
  (
    'prod-cuca-alema',
    'CONF-010',
    'Cuca Alemã Doce de Leite com Canela',
    'confeitaria',
    50000.00,
    20000.00,
    15,
    5,
    'un',
    true,
    '/images/products/cuca-alema.jpg',
    'Massa fofinha artesanal, farta cobertura de doce de leite com canela e farofa crocante alemã.',
    'cuca-alema-doce-de-leite-canela',
    true
  ),
  (
    'prod-bolo-pudim',
    'CONF-011',
    'Bolo Pudim',
    'confeitaria',
    40000.00,
    16000.00,
    12,
    4,
    'un',
    true,
    '/images/products/bolo-pudim.jpg',
    'Pudim de leite condensado caramelizado e super cremoso sobre bolo de chocolate úmido.',
    'bolo-pudim',
    true
  ),
  (
    'prod-brownie-70',
    'CONF-012',
    'Brownie de Chocolate 70% Cacau (Unidade)',
    'confeitaria',
    20000.00,
    8000.00,
    30,
    10,
    'un',
    true,
    '/images/products/brownie-70-cacau.jpg',
    'Intenso no sabor, irresistível em cada mordida. Chocolate nobre 70% cacau com casquinha craquelada.',
    'brownie-chocolate-70-cacau',
    true
  ),
  (
    'prod-combo-brownies',
    'CONF-013',
    'Combo 3 Brownies 70% Cacau',
    'confeitaria',
    50000.00,
    24000.00,
    10,
    3,
    'un',
    true,
    '/src/assets/images/combo_tres_brownies_1790886603094.jpg',
    'Combo promocional com 3 unidades do brownie 70% cacau. Economize ₲ 10.000!',
    'combo-3-brownies-70-cacau',
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  price_brl = EXCLUDED.price_brl,
  cost_price_brl = EXCLUDED.cost_price_brl,
  stock = EXCLUDED.stock,
  image_url = EXCLUDED.image_url,
  description = EXCLUDED.description,
  slug = EXCLUDED.slug,
  featured = EXCLUDED.featured,
  active = true,
  updated_at = NOW();

-- ==============================================================================
-- 4. TABELA DE CLIENTES, CRM & CONTAS DE FIADO (clientes)
-- OTIMIZADA PARA SALVAR RÁPIDO E ATRIBUIR AO GUILHERME SEM FALHAS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.clientes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT,
  document_cpf TEXT,
  address TEXT,
  category TEXT NOT NULL DEFAULT 'varejo',
  credit_limit_brl NUMERIC(14, 2) NOT NULL DEFAULT 500000.00,
  outstanding_balance_brl NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  total_spent_brl NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  purchase_count INTEGER NOT NULL DEFAULT 0,
  birthday TEXT,
  notes TEXT,
  affiliate_id TEXT DEFAULT 'emp-afiliado-guilherme',
  affiliate_name TEXT DEFAULT 'Guilherme',
  active BOOLEAN NOT NULL DEFAULT true,
  last_purchase_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir que TODAS as colunas existam na tabela clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE public.clientes ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.clientes ALTER COLUMN phone SET DEFAULT '';

ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS document_cpf TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'varejo';
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS credit_limit_brl NUMERIC(14, 2) DEFAULT 500000.00;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS outstanding_balance_brl NUMERIC(14, 2) DEFAULT 0.00;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS total_spent_brl NUMERIC(14, 2) DEFAULT 0.00;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS purchase_count INTEGER DEFAULT 0;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS birthday TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS affiliate_id TEXT DEFAULT 'emp-afiliado-guilherme';
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS affiliate_name TEXT DEFAULT 'Guilherme';
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS last_purchase_date TIMESTAMPTZ;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 🎯 RESOLUÇÃO DO REQUISITO: Atribuir todos os clientes adicionados ao Guilherme!
UPDATE public.clientes
SET 
  affiliate_id = 'emp-afiliado-guilherme',
  affiliate_name = 'Guilherme',
  updated_at = NOW()
WHERE affiliate_id IS NULL OR affiliate_id = '' OR affiliate_name IS NULL OR affiliate_name = '';

-- Índices de Alta Velocidade para Busca e Salvamento Instantâneo de Clientes
CREATE INDEX IF NOT EXISTS idx_clientes_affiliate_id ON public.clientes (affiliate_id);
CREATE INDEX IF NOT EXISTS idx_clientes_phone ON public.clientes (phone);
CREATE INDEX IF NOT EXISTS idx_clientes_name_lower ON public.clientes (lower(name));
CREATE INDEX IF NOT EXISTS idx_clientes_created_at ON public.clientes (created_at DESC);

-- ==============================================================================
-- 5. TABELA DE VENDAS REALIZADAS (vendas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.vendas (
  id TEXT PRIMARY KEY,
  sale_number INTEGER,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal_brl NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  discount_brl NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  total_brl NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  payments JSONB NOT NULL DEFAULT '[]'::jsonb,
  change_given JSONB,
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

ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS sale_number INTEGER;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS subtotal_brl NUMERIC(14, 2) DEFAULT 0.00;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS discount_brl NUMERIC(14, 2) DEFAULT 0.00;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS total_brl NUMERIC(14, 2) DEFAULT 0.00;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS payments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS change_given JSONB;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS employee_name TEXT;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'concluida';
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS comanda_number TEXT;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS setor_responsavel TEXT DEFAULT 'Panificação & Confeitaria Artesanal';
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Sequência e trigger para gerar número de venda sequencial automático (#1, #2, #3...)
CREATE SEQUENCE IF NOT EXISTS public.vendas_sale_number_seq START 1;

CREATE OR REPLACE FUNCTION public.set_sale_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sale_number IS NULL OR NEW.sale_number = 0 THEN
    NEW.sale_number := nextval('public.vendas_sale_number_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_sale_number ON public.vendas;
CREATE TRIGGER trigger_set_sale_number
  BEFORE INSERT ON public.vendas
  FOR EACH ROW
  EXECUTE FUNCTION public.set_sale_number();

-- ==============================================================================
-- 6. TABELA DE SESSÕES DE CAIXA (caixa_sessoes)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.caixa_sessoes (
  id TEXT PRIMARY KEY,
  session_number INTEGER,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  opened_by TEXT,
  closed_by TEXT,
  initial_cash_brl NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'aberto',
  total_sales_brl NUMERIC(14, 2) DEFAULT 0.00,
  expected_cash_brl NUMERIC(14, 2) DEFAULT 0.00,
  actual_cash_brl NUMERIC(14, 2) DEFAULT 0.00,
  difference_brl NUMERIC(14, 2) DEFAULT 0.00,
  notes TEXT,
  entries JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. TABELA DE COMANDAS EM TEMPO REAL (comandas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.comandas (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'aberto',
  customer_name TEXT,
  customer_phone TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal_brl NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  discount_brl NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  total_brl NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  opened_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 8. TABELA DE LANÇAMENTOS DE FIADO & CONTA CORRENTE (lancamentos_fiado)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.lancamentos_fiado (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL DEFAULT 'debito_compra',
  amount_brl NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  description TEXT,
  sale_id TEXT,
  comanda_number TEXT,
  setor_responsavel TEXT DEFAULT 'Panificação & Confeitaria Artesanal',
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lancamentos_fiado_customer ON public.lancamentos_fiado(customer_id);

-- ==============================================================================
-- 9. TABELA DE SALDOS DEVEDORES EM TEMPO REAL (saldos_devedores_tempo_real)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.saldos_devedores_tempo_real (
  customer_id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  previous_balance_brl NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  current_debt_balance_brl NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  open_comandas_total_brl NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  open_comandas_count INTEGER NOT NULL DEFAULT 0,
  credit_limit_brl NUMERIC(14, 2) NOT NULL DEFAULT 500000.00,
  available_credit_brl NUMERIC(14, 2) NOT NULL DEFAULT 500000.00,
  last_comanda_id TEXT,
  last_comanda_number TEXT,
  last_operation_type TEXT NOT NULL DEFAULT 'comanda_lancada',
  last_operation_amount_brl NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  last_entry_description TEXT,
  last_payment_date TIMESTAMPTZ,
  last_purchase_date TIMESTAMPTZ,
  status_cobranca TEXT NOT NULL DEFAULT 'em_dia',
  setor_responsavel TEXT DEFAULT 'Panificação & Confeitaria Artesanal',
  updated_by TEXT DEFAULT 'Sistema',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 10. TABELA DE FLUXO DE COBRANÇAS EM TEMPO REAL (fluxo_cobrancas_tempo_real)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.fluxo_cobrancas_tempo_real (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  amount_brl NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  payment_method TEXT NOT NULL DEFAULT 'dinheiro',
  operator_name TEXT NOT NULL,
  comanda_number TEXT,
  status TEXT NOT NULL DEFAULT 'em_cobranca',
  previous_debt_brl NUMERIC(14, 2) DEFAULT 0.00,
  projected_debt_brl NUMERIC(14, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 11. TABELA DE REGISTRO DE COMPRAS DE CLIENTES (registro_compras_clientes)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.registro_compras_clientes (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  sale_id TEXT,
  sale_number INTEGER,
  comanda_number TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  items_summary TEXT,
  total_amount_brl NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  estimated_cost_brl NUMERIC(14, 2) DEFAULT 0.00,
  paid_amount_brl NUMERIC(14, 2) DEFAULT 0.00,
  fiado_amount_brl NUMERIC(14, 2) DEFAULT 0.00,
  payment_method TEXT NOT NULL DEFAULT 'dinheiro',
  flow_type TEXT NOT NULL DEFAULT 'entrada_avista',
  setor_responsavel TEXT DEFAULT 'Panificação & Confeitaria Artesanal',
  recorded_by TEXT DEFAULT 'Caixa',
  notes TEXT,
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registro_compras_customer ON public.registro_compras_clientes(customer_id);

-- ==============================================================================
-- 12. TABELA DE ETAPAS DE PAGAMENTO (pagamentos_vendas_etapas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.pagamentos_vendas_etapas (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL,
  sale_number INTEGER,
  comanda_number TEXT,
  customer_id TEXT,
  customer_name TEXT,
  method TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PYG',
  amount_received NUMERIC(14, 2) NOT NULL DEFAULT 0,
  exchange_rate_used NUMERIC(14, 4) NOT NULL DEFAULT 1,
  equivalent_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
  stage_status TEXT NOT NULL DEFAULT 'liquidado',
  destination_type TEXT NOT NULL,
  recorded_by TEXT NOT NULL DEFAULT 'Caixa',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 13. TABELA DE BACKUPS & ESTADO COMPLETO (korisko_system_state & backups)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.korisko_system_state (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.korisko_backup_points (
  id TEXT PRIMARY KEY,
  data JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT,
  created_by TEXT,
  stats JSONB,
  snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 14. FUNÇÕES ATÔMICAS RPC (BAIXA DE ESTOQUE E AJUSTE DE SALDO)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.baixar_estoque(p_id text, p_qtd numeric)
RETURNS numeric AS $$
DECLARE
  v_novo numeric;
BEGIN
  UPDATE public.produtos
  SET stock = GREATEST(0, stock - p_qtd),
      updated_at = NOW()
  WHERE id = p_id
  RETURNING stock INTO v_novo;
  RETURN COALESCE(v_novo, 0);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.ajustar_saldo_cliente(p_id text, p_delta numeric)
RETURNS numeric AS $$
DECLARE
  v_novo numeric;
BEGIN
  UPDATE public.clientes
  SET outstanding_balance_brl = GREATEST(0, outstanding_balance_brl + p_delta),
      updated_at = NOW()
  WHERE id = p_id
  RETURNING outstanding_balance_brl INTO v_novo;
  RETURN COALESCE(v_novo, 0);
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualização automática de updated_at
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clientes_updated_at ON public.clientes;
CREATE TRIGGER trg_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- ==============================================================================
-- 15. PERMISSÕES E POLÍTICAS RLS (LEITURA E ESCRITA SEM BLOQUEIOS 401/403)
-- ==============================================================================
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos_fiado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saldos_devedores_tempo_real ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fluxo_cobrancas_tempo_real ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registro_compras_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos_vendas_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.korisko_system_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.korisko_backup_points ENABLE ROW LEVEL SECURITY;

-- Configurar políticas de acesso universal para anon, authenticated e service_role
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'usuarios', 'affiliates', 'commissions', 'produtos', 'clientes',
    'vendas', 'caixa_sessoes', 'comandas', 'lancamentos_fiado',
    'saldos_devedores_tempo_real', 'fluxo_cobrancas_tempo_real',
    'registro_compras_clientes', 'pagamentos_vendas_etapas',
    'korisko_system_state', 'korisko_backup_points'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_anon_%s" ON public.%I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_auth_%s" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "allow_all_anon_%s" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true);', tbl, tbl);
    EXECUTE format('CREATE POLICY "allow_all_auth_%s" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', tbl, tbl);
  END LOOP;
END $$;

-- Conceder permissões totais
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- ==============================================================================
-- 16. HABILITAR SINCRONIZAÇÃO EM TEMPO REAL (SUPABASE REALTIME)
-- ==============================================================================
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'usuarios', 'affiliates', 'commissions', 'produtos', 'clientes',
    'vendas', 'caixa_sessoes', 'comandas', 'lancamentos_fiado',
    'saldos_devedores_tempo_real', 'fluxo_cobrancas_tempo_real',
    'registro_compras_clientes', 'pagamentos_vendas_etapas', 'korisko_system_state'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

-- ==============================================================================
-- FIM DO SCRIPT • BANCO KORIZKO OTIMIZADO & CLIENTES DO GUILHERME SALVOS!
-- ==============================================================================
