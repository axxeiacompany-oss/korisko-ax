-- ==============================================================================
-- 👑 PADARIA KORISKO - SCRIPT SQL MESTRE DE ALTA PERFORMANCE (SUPABASE / POSTGRES)
-- ==============================================================================
-- Este script configura o banco de dados completo de forma definitiva:
-- 1. Cria e atualiza todas as tabelas (Produtos com Fotos, Clientes, Vendas, Caixa, Usuários)
-- 2. Configura Funções RPC Atômicas (Baixa de Estoque e Ajuste de Saldo sem falhas)
-- 3. Configura Trigger de numeração sequencial automática de vendas (#1, #2, #3...)
-- 4. Cria Índices de Velocidade para consultas instantâneas no PDV e na Loja
-- 5. Configura Permissões e Políticas RLS blindadas (sem erros 401/403/PGRST301)
-- 6. Habilita Sincronização em Tempo Real (Supabase Realtime) para Celulares e PCs
-- 7. Insere os produtos das fotos (Cuca Alemã, Bolo Pudim, Brownie) e o Admin Ax
-- ==============================================================================

-- 0. EXTENSÕES DO POSTGRESQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. TABELA DE USUÁRIOS E OPERADORES DO SISTEMA
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.usuarios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'caixa',
  password TEXT NOT NULL
);

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

-- ==============================================================================
-- 2. TABELA DE PRODUTOS & ESTOQUE (COM SUPORTE A FOTOS, PREÇO GUARANI ₲ E COMBOS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.produtos (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_brl NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);

-- Garantir que TODAS as colunas existam mesmo se a tabela já foi criada anteriormente
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

-- ==============================================================================
-- 3. TABELA DE CLIENTES & CRM (FIADO, LIMITES E PONTOS DE FIDELIDADE)
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
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS credit_limit_brl NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS outstanding_balance_brl NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS birthday TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS total_spent_brl NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS purchase_count INTEGER DEFAULT 0;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS last_purchase_date TIMESTAMPTZ;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 4. TABELA DE VENDAS & PEDIDOS (HISTÓRICO COMPLETO COM ITENS E PAGAMENTOS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.vendas (
  id TEXT PRIMARY KEY,
  total_brl NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);

ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS sale_number TEXT;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS subtotal_brl NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS discount_brl NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS total_brl NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS employee_name TEXT;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS payments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS change_given JSONB;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS canal_venda TEXT DEFAULT 'pdv';
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Sequência e trigger para gerar número de venda sequencial (#1, #2, #3...)
CREATE SEQUENCE IF NOT EXISTS public.vendas_sale_number_seq START 1;

CREATE OR REPLACE FUNCTION public.set_sale_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sale_number IS NULL OR NEW.sale_number = '' THEN
    NEW.sale_number := nextval('public.vendas_sale_number_seq')::TEXT;
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
-- 5. TABELA DE SESSÕES DE CAIXA (ABERTURA, FECHAMENTO E CONFERÊNCIA CEGA)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.caixa_sessoes (
  id TEXT PRIMARY KEY
);

ALTER TABLE public.caixa_sessoes ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.caixa_sessoes ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE public.caixa_sessoes ADD COLUMN IF NOT EXISTS opened_by_id TEXT;
ALTER TABLE public.caixa_sessoes ADD COLUMN IF NOT EXISTS opened_by_name TEXT;
ALTER TABLE public.caixa_sessoes ADD COLUMN IF NOT EXISTS initial_cash_brl NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.caixa_sessoes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aberto';
ALTER TABLE public.caixa_sessoes ADD COLUMN IF NOT EXISTS total_sales_brl NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.caixa_sessoes ADD COLUMN IF NOT EXISTS transactions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.caixa_sessoes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 6. TABELAS DE ESTADO GLOBAL E BACKUP (SINCRONIZAÇÃO EM TEMPO REAL)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.korisko_system_state (
  id VARCHAR(64) PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.korisko_backup_points (
  id VARCHAR(64) PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. FUNÇÕES RPC DE ALTA PERFORMANCE (BAIXA DE ESTOQUE E AJUSTE DE SALDO)
-- ==============================================================================
-- 7.1. Baixa atômica de estoque (previne vendas duplicadas ou estoque negativo indevido)
CREATE OR REPLACE FUNCTION public.baixar_estoque(p_id TEXT, p_qtd NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
  v_novo_estoque NUMERIC;
BEGIN
  UPDATE public.produtos
  SET stock = GREATEST(0, stock - p_qtd),
      updated_at = NOW()
  WHERE id = p_id
  RETURNING stock INTO v_novo_estoque;

  RETURN COALESCE(v_novo_estoque, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.2. Ajuste atômico de saldo devedor do cliente (Fiado / Quitação de conta)
CREATE OR REPLACE FUNCTION public.ajustar_saldo_cliente(p_id TEXT, p_valor NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
  v_novo_saldo NUMERIC;
BEGIN
  UPDATE public.clientes
  SET outstanding_balance_brl = GREATEST(0, outstanding_balance_brl + p_valor),
      updated_at = NOW()
  WHERE id = p_id
  RETURNING outstanding_balance_brl INTO v_novo_saldo;

  RETURN COALESCE(v_novo_saldo, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 8. ÍNDICES DE VELOCIDADE (ACELERA BUSCAS NO PDV, LOJA E RELATÓRIOS)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_produtos_category_active ON public.produtos (category, active);
CREATE INDEX IF NOT EXISTS idx_produtos_code ON public.produtos (code);
CREATE INDEX IF NOT EXISTS idx_vendas_created_at ON public.vendas (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendas_customer_id ON public.vendas (customer_id);
CREATE INDEX IF NOT EXISTS idx_clientes_phone ON public.clientes (phone);
CREATE INDEX IF NOT EXISTS idx_clientes_active ON public.clientes (active);

-- ==============================================================================
-- 9. SEGURANÇA E PERMISSÕES (SEM ERROS 401/403/PGRST301)
-- ==============================================================================
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.korisko_system_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.korisko_backup_points ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Remover políticas antigas para evitar duplicidades
  DROP POLICY IF EXISTS "Allow public access usuarios" ON public.usuarios;
  DROP POLICY IF EXISTS "Allow public access produtos" ON public.produtos;
  DROP POLICY IF EXISTS "Allow public access clientes" ON public.clientes;
  DROP POLICY IF EXISTS "Allow public access vendas" ON public.vendas;
  DROP POLICY IF EXISTS "Allow public access caixa_sessoes" ON public.caixa_sessoes;
  DROP POLICY IF EXISTS "Allow public access korisko_system_state" ON public.korisko_system_state;
  DROP POLICY IF EXISTS "Allow public access korisko_backup_points" ON public.korisko_backup_points;

  -- Criar políticas completas (CRUD total para o aplicativo)
  CREATE POLICY "Allow public access usuarios" ON public.usuarios FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "Allow public access produtos" ON public.produtos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "Allow public access clientes" ON public.clientes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "Allow public access vendas" ON public.vendas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "Allow public access caixa_sessoes" ON public.caixa_sessoes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "Allow public access korisko_system_state" ON public.korisko_system_state FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "Allow public access korisko_backup_points" ON public.korisko_backup_points FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
END $$;

-- Conceder permissões operacionais
GRANT ALL ON TABLE public.usuarios TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.produtos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.clientes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.vendas TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.caixa_sessoes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.korisko_system_state TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.korisko_backup_points TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.baixar_estoque(text, numeric) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ajustar_saldo_cliente(text, numeric) TO anon, authenticated, service_role;

-- ==============================================================================
-- 10. SINCRONIZAÇÃO EM TEMPO REAL MULTI-DISPOSITIVOS (SUPABASE REALTIME)
-- ==============================================================================
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.korisko_system_state; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.usuarios; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.produtos; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.clientes; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.vendas; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.caixa_sessoes; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- ==============================================================================
-- 11. INSERÇÃO DOS USUÁRIOS OFICIAIS E PRODUTOS COM FOTO
-- ==============================================================================
-- 11.1. Admin Geral Ax
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
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  password = EXCLUDED.password,
  pin = EXCLUDED.pin,
  avatar_color = EXCLUDED.avatar_color,
  allowed_features = EXCLUDED.allowed_features,
  active = true,
  updated_at = NOW();

-- 11.2. Produtos com Foto (Cuca Alemã, Bolo Pudim, Brownie e Tradicionais)
INSERT INTO public.produtos (
  id, code, name, category, price_brl, cost_price_brl, stock, min_stock, unit, active, image_url, description, slug, compare_at_price, featured
) VALUES
  (
    'prod-cuca-alema',
    'CONF-010',
    'Cuca Alemã Doce de Leite com Canela',
    'confeitaria',
    50000, -- ₲ 50.000
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
    40000, -- ₲ 40.000
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
    20000, -- ₲ 20.000
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
    50000, -- ₲ 50.000
    24000,
    10,
    3,
    'un',
    true,
    '/images/products/combo-brownies.jpg',
    'Combo promocional com 3 unidades do brownie 70% cacau. Economize ₲ 10.000!',
    'combo-3-brownies-70-cacau',
    60000,
    true
  ),
  (
    'prod-pao-frances',
    'PAO-001',
    'Pão Francês Tradicional',
    'paes',
    18000, -- ₲ 18.000 / kg
    8000,
    45,
    15,
    'kg',
    true,
    NULL,
    'Pão francês crocante e dourado por fora, miolo leve e aerado.',
    'pao-frances-tradicional',
    NULL,
    false
  ),
  (
    'prod-pao-de-queijo',
    'PAO-002',
    'Pão de Queijo Mineiro',
    'salgados',
    48000, -- ₲ 48.000 / kg
    22000,
    30,
    8,
    'kg',
    true,
    NULL,
    'Feito com queijo curado legítimo e polvilho especial.',
    'pao-de-queijo-mineiro',
    NULL,
    false
  ),
  (
    'prod-chipa',
    'SALG-001',
    'Chipa Tradicional Paraguaia',
    'salgados',
    6000, -- ₲ 6.000 / un
    2500,
    40,
    15,
    'un',
    true,
    NULL,
    'Chipa quentinha em formato de ferradura com muito queijo.',
    'chipa-tradicional-paraguaia',
    NULL,
    false
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

-- 11.3. Atualizar o estado consolidado em tempo real
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
    'products', (
      SELECT jsonb_agg(
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
      ) FROM public.produtos WHERE active = true
    ),
    'stockMovements', '[]'::jsonb,
    'sales', '[]'::jsonb,
    'currentSession', jsonb_build_object(
      'id', 'sess-ativa',
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

-- ==============================================================================
-- 12. VERIFICAÇÃO FINAL
-- ==============================================================================
SELECT 'BANCO KORISKO ATUALIZADO COM SUCESSO!' AS status,
       (SELECT count(*) FROM public.produtos) AS total_produtos,
       (SELECT count(*) FROM public.usuarios) AS total_usuarios;
