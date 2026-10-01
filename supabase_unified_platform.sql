-- ==============================================================================
-- KORISKO PLATAFORMA INTEGRADA - LOJA, CRM, ÁREA DO CLIENTE, AFILIADOS E ADMIN
-- ==============================================================================
-- Este script evolui o banco de dados existente sem apagar ou resetar tabelas.
-- Execute este script no SQL Editor do seu projeto Supabase.
-- ==============================================================================

-- 1. HABILITAR EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. EVOLUÇÃO SEGURA DAS TABELAS EXISTENTES (PRESERVAÇÃO TOTAL DOS DADOS)
-- ==============================================================================

-- 2.1. Evolução da tabela de PRODUTOS (Compatibilidade Loja Online + PDV)
ALTER TABLE IF EXISTS public.produtos
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS sku TEXT;

-- Gerar slugs automáticos para produtos existentes que ainda não tenham
UPDATE public.produtos
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- 2.2. Evolução da tabela de CLIENTES (Compatibilidade CRM + Loja Online)
ALTER TABLE IF EXISTS public.clientes
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'balcao';

-- 2.3. Evolução da tabela de VENDAS (Adiciona rastreabilidade de pedidos online e afiliados)
ALTER TABLE IF EXISTS public.vendas
  ADD COLUMN IF NOT EXISTS order_id UUID,
  ADD COLUMN IF NOT EXISTS affiliate_id UUID,
  ADD COLUMN IF NOT EXISTS canal_venda TEXT DEFAULT 'pdv'; -- 'pdv', 'loja_online', 'afiliado'

-- ==============================================================================
-- 3. CRIAÇÃO DAS NOVAS TABELAS DA PLATAFORMA
-- ==============================================================================

-- 3.1. PERFIS DE USUÁRIOS (Central de Identidade ligada ao Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'affiliate', 'employee', 'manager', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.2. CATEGORIAS DA LOJA ONLINE
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir categorias padrão caso ainda não existam
INSERT INTO public.categories (name, slug, description, display_order)
VALUES 
  ('Pães Artesanais', 'paes', 'Pães frescos, fermentação natural e tradicionais', 1),
  ('Confeitaria & Bolos', 'confeitaria', 'Bolos, tortas, doces e sobremesas', 2),
  ('Salgados & Lanches', 'salgados', 'Empadas, coxinhas, folhados e croissants', 3),
  ('Bebidas & Cafés', 'bebidas', 'Cafés especiais, sucos naturais e refrigerantes', 4),
  ('Frios & Fatiados', 'frios', 'Queijos selecionados, presuntos e embutidos', 5)
ON CONFLICT (slug) DO NOTHING;

-- 3.3. VARIAÇÕES DE PRODUTOS
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  sku TEXT,
  name TEXT NOT NULL, -- Ex: "500g", "1kg", "Tradicional", "Integral"
  price NUMERIC(12, 2) NOT NULL,
  attributes JSONB DEFAULT '{}'::jsonb, -- {"tamanho": "500g", "tipo": "integral"}
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.4. IMAGENS DO PRODUTO
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.5. ESTOQUE INTEGRADO DA LOJA
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT REFERENCES public.produtos(id) ON DELETE CASCADE,
  product_variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
  reserved_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
  minimum_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.6. ESTRUTURA DE AFILIADOS
CREATE TABLE IF NOT EXISTS public.affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  affiliate_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive')),
  commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 10.00, -- percentual (ex: 10.00%)
  clicks_count INTEGER NOT NULL DEFAULT 0,
  pix_key TEXT,
  bank_info JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.7. ENDEREÇOS DE CLIENTES
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT REFERENCES public.clientes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Principal',
  recipient_name TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT DEFAULT 'Paraguai',
  postal_code TEXT NOT NULL,
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.8. PEDIDOS DA LOJA ONLINE
CREATE SEQUENCE IF NOT EXISTS public.orders_seq START 1001;

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE,
  customer_id TEXT REFERENCES public.clientes(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  shipping_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  coupon_id TEXT,
  shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger de numeração amigável de pedido (ex: PED-1001)
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'PED-' || nextval('public.orders_seq')::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_order_number ON public.orders;
CREATE TRIGGER trg_set_order_number
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_order_number();

-- 3.9. ITENS DO PEDIDO (Preservação histórica dos dados de compra)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES public.produtos(id) ON DELETE SET NULL,
  product_variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  sku TEXT,
  quantity NUMERIC(12, 3) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.10. PAGAMENTOS DO PEDIDO
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  method TEXT NOT NULL, -- 'pix', 'cartao_credito', 'cartao_debito', 'dinheiro_entrega', 'transferencia'
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'refunded')),
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  transaction_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.11. COMISSÕES DE AFILIADOS
CREATE TABLE IF NOT EXISTS public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  rate NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- 3.12. CRM COMPLEMENTAR (Deals / Oportunidades, Notas e Atividades)
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  assigned_to TEXT,
  title TEXT NOT NULL,
  value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  stage TEXT NOT NULL DEFAULT 'lead' CHECK (stage IN ('lead', 'contato', 'proposta', 'negociacao', 'ganho', 'perdido')),
  source TEXT DEFAULT 'loja_online',
  expected_close_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  author_id TEXT,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT REFERENCES public.clientes(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'nota', -- 'ligacao', 'whatsapp', 'reuniao', 'email', 'nota'
  description TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. FUNÇÕES DE SUPORTE E SEGURANÇA (SECURITY DEFINER)
-- ==============================================================================

-- 4.1. Retorna o papel do usuário autenticado atual
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  RETURN COALESCE(v_role, 'anon');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4.2. Verifica se o usuário atual é admin, gerente ou funcionário
CREATE OR REPLACE FUNCTION public.is_admin_or_employee()
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := public.get_current_user_role();
  RETURN v_role IN ('admin', 'manager', 'employee');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4.3. Trigger seguro: Ao criar usuário no Supabase Auth, cria automaticamente o perfil
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT := 'customer';
  v_name TEXT;
  v_phone TEXT;
BEGIN
  -- Definir nome extraído dos metadados ou do email
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  v_phone := NEW.raw_user_meta_data->>'phone';

  -- Regra especial: E-mail mestre da Axxeia sempre é criado como admin
  IF LOWER(NEW.email) = 'axxeiacompany@gmail.com' THEN
    v_role := 'admin';
  END IF;

  -- Criar perfil associado
  INSERT INTO public.profiles (user_id, full_name, email, phone, role, status)
  VALUES (
    NEW.id,
    v_name,
    NEW.email,
    v_phone,
    v_role,
    'active'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    updated_at = NOW();

  -- Se for cliente, criar ou vincular na tabela clientes do CRM
  INSERT INTO public.clientes (id, user_id, name, email, phone, source)
  VALUES (
    'cli-' || SUBSTRING(NEW.id::text, 1, 8),
    NEW.id,
    v_name,
    NEW.email,
    v_phone,
    'loja_online'
  )
  ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Instalar trigger no auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 4.4. Trigger para gerar comissão automática quando um pedido de afiliado é confirmado
CREATE OR REPLACE FUNCTION public.handle_affiliate_order_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_rate NUMERIC(5, 2);
  v_commission_amount NUMERIC(12, 2);
BEGIN
  -- Se o pedido possui afiliado atribuído e o status mudou para 'confirmed' ou 'delivered'
  IF NEW.affiliate_id IS NOT NULL AND NEW.status IN ('confirmed', 'delivered') AND (OLD.status IS NULL OR OLD.status = 'pending') THEN
    -- Obter a comissão cadastrada do afiliado
    SELECT commission_rate INTO v_rate
    FROM public.affiliates
    WHERE id = NEW.affiliate_id;

    v_rate := COALESCE(v_rate, 10.00);
    v_commission_amount := ROUND((NEW.subtotal * (v_rate / 100.0)), 2);

    IF v_commission_amount > 0 THEN
      INSERT INTO public.commissions (affiliate_id, order_id, amount, rate, status)
      VALUES (NEW.affiliate_id, NEW.id, v_commission_amount, v_rate, 'approved');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_order_affiliate_commission ON public.orders;
CREATE TRIGGER trg_order_affiliate_commission
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_affiliate_order_commission();

-- ==============================================================================
-- 5. POLÍTICAS DE ROW LEVEL SECURITY (RLS) RIGOROSAS
-- ==============================================================================

-- Habilitar RLS em todas as novas tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- 5.1. PROFILES
DROP POLICY IF EXISTS "Perfis leitura" ON public.profiles;
CREATE POLICY "Perfis leitura" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    OR public.is_admin_or_employee()
  );

DROP POLICY IF EXISTS "Perfis atualizacao" ON public.profiles;
CREATE POLICY "Perfis atualizacao" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid() 
    OR public.is_admin_or_employee()
  )
  WITH CHECK (
    -- Cliente normal não pode alterar o próprio papel para admin/manager
    (user_id = auth.uid() AND role = (SELECT role FROM public.profiles WHERE user_id = auth.uid()))
    OR public.is_admin_or_employee()
  );

-- 5.2. LOJA ONLINE: PRODUTOS E CATEGORIAS (Leitura Pública, Escrita Admin)
DROP POLICY IF EXISTS "Categorias leitura publica" ON public.categories;
CREATE POLICY "Categorias leitura publica" ON public.categories
  FOR SELECT TO anon, authenticated
  USING (active = true OR public.is_admin_or_employee());

DROP POLICY IF EXISTS "Categorias escrita admin" ON public.categories;
CREATE POLICY "Categorias escrita admin" ON public.categories
  FOR ALL TO authenticated
  USING (public.is_admin_or_employee())
  WITH CHECK (public.is_admin_or_employee());

DROP POLICY IF EXISTS "Variacoes leitura publica" ON public.product_variants;
CREATE POLICY "Variacoes leitura publica" ON public.product_variants
  FOR SELECT TO anon, authenticated
  USING (active = true OR public.is_admin_or_employee());

DROP POLICY IF EXISTS "Variacoes escrita admin" ON public.product_variants;
CREATE POLICY "Variacoes escrita admin" ON public.product_variants
  FOR ALL TO authenticated
  USING (public.is_admin_or_employee())
  WITH CHECK (public.is_admin_or_employee());

DROP POLICY IF EXISTS "Imagens leitura publica" ON public.product_images;
CREATE POLICY "Imagens leitura publica" ON public.product_images
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Imagens escrita admin" ON public.product_images;
CREATE POLICY "Imagens escrita admin" ON public.product_images
  FOR ALL TO authenticated
  USING (public.is_admin_or_employee())
  WITH CHECK (public.is_admin_or_employee());

-- 5.3. AFILIADOS
DROP POLICY IF EXISTS "Afiliado leitura proprio ou admin" ON public.affiliates;
CREATE POLICY "Afiliado leitura proprio ou admin" ON public.affiliates
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    OR public.is_admin_or_employee()
  );

DROP POLICY IF EXISTS "Afiliado atualizacao pix" ON public.affiliates;
CREATE POLICY "Afiliado atualizacao pix" ON public.affiliates
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid() 
    OR public.is_admin_or_employee()
  )
  WITH CHECK (
    -- Afiliado só pode atualizar dados de pagamento, nunca taxa de comissão
    (user_id = auth.uid() AND commission_rate = (SELECT commission_rate FROM public.affiliates WHERE user_id = auth.uid()))
    OR public.is_admin_or_employee()
  );

-- 5.4. COMISSÕES (Afiliado só vê as suas; nunca altera)
DROP POLICY IF EXISTS "Comissoes leitura" ON public.commissions;
CREATE POLICY "Comissoes leitura" ON public.commissions
  FOR SELECT TO authenticated
  USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
    OR public.is_admin_or_employee()
  );

DROP POLICY IF EXISTS "Comissoes gestao admin" ON public.commissions;
CREATE POLICY "Comissoes gestao admin" ON public.commissions
  FOR ALL TO authenticated
  USING (public.is_admin_or_employee())
  WITH CHECK (public.is_admin_or_employee());

-- 5.5. PEDIDOS E ITENS
DROP POLICY IF EXISTS "Pedidos leitura" ON public.orders;
CREATE POLICY "Pedidos leitura" ON public.orders
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
    OR public.is_admin_or_employee()
  );

DROP POLICY IF EXISTS "Pedidos criacao cliente" ON public.orders;
CREATE POLICY "Pedidos criacao cliente" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    OR public.is_admin_or_employee()
  );

DROP POLICY IF EXISTS "Pedidos atualizacao status admin" ON public.orders;
CREATE POLICY "Pedidos atualizacao status admin" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_employee())
  WITH CHECK (public.is_admin_or_employee());

DROP POLICY IF EXISTS "Itens de pedido leitura" ON public.order_items;
CREATE POLICY "Itens de pedido leitura" ON public.order_items
  FOR SELECT TO authenticated
  USING (
    order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
    OR order_id IN (SELECT id FROM public.orders WHERE affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()))
    OR public.is_admin_or_employee()
  );

DROP POLICY IF EXISTS "Itens criacao pedido" ON public.order_items;
CREATE POLICY "Itens criacao pedido" ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (
    order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
    OR public.is_admin_or_employee()
  );

-- 5.6. ENDEREÇOS
DROP POLICY IF EXISTS "Enderecos cliente acesso proprio" ON public.addresses;
CREATE POLICY "Enderecos cliente acesso proprio" ON public.addresses
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid() 
    OR public.is_admin_or_employee()
  )
  WITH CHECK (
    user_id = auth.uid() 
    OR public.is_admin_or_employee()
  );

-- 5.7. CRM DEALS, NOTAS E ATIVIDADES
DROP POLICY IF EXISTS "CRM gestao colaboradores" ON public.deals;
CREATE POLICY "CRM gestao colaboradores" ON public.deals
  FOR ALL TO authenticated
  USING (public.is_admin_or_employee())
  WITH CHECK (public.is_admin_or_employee());

DROP POLICY IF EXISTS "Notas CRM colaboradores" ON public.customer_notes;
CREATE POLICY "Notas CRM colaboradores" ON public.customer_notes
  FOR ALL TO authenticated
  USING (public.is_admin_or_employee())
  WITH CHECK (public.is_admin_or_employee());

DROP POLICY IF EXISTS "Atividades CRM colaboradores" ON public.activities;
CREATE POLICY "Atividades CRM colaboradores" ON public.activities
  FOR ALL TO authenticated
  USING (public.is_admin_or_employee())
  WITH CHECK (public.is_admin_or_employee());

-- 5.8. COMANDAS & PEDIDOS CONFIRMADOS POR SETOR EM TEMPO REAL
CREATE TABLE IF NOT EXISTS public.comandas_pedidos (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL,
  order_number TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  sector TEXT NOT NULL DEFAULT 'panificacao', -- 'panificacao', 'confeitaria', 'salgados', 'cafeteria', 'expedicao', 'geral'
  sectors JSONB DEFAULT '["panificacao"]'::jsonb,
  status TEXT NOT NULL DEFAULT 'confirmado', -- 'confirmado', 'em_preparo', 'pronto', 'entregue'
  order_type TEXT DEFAULT 'mesa', -- 'mesa', 'balcao', 'entrega'
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  shipping_address JSONB DEFAULT '{}'::jsonb,
  payment_method TEXT,
  notes TEXT,
  source TEXT DEFAULT 'loja_online',
  total_brl NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  opened_by TEXT DEFAULT 'Cliente Online',
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.comandas_pedidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comandas acesso tempo real setores e admin" ON public.comandas_pedidos;
CREATE POLICY "Comandas acesso tempo real setores e admin" ON public.comandas_pedidos
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ==============================================================================
-- 6. PERMISSÕES DE ACESSO (GRANTS)
-- ==============================================================================
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.categories TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.product_variants TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.product_images TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.inventory TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.affiliates TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.commissions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.addresses TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.orders TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.order_items TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.payments TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.deals TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.customer_notes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.activities TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.comandas_pedidos TO anon, authenticated, service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- ==============================================================================
-- 7. SINCRONIZAÇÃO EM TEMPO REAL (REALTIME)
-- ==============================================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comandas_pedidos;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.commissions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.affiliates;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

ALTER TABLE public.comandas_pedidos REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_items REPLICA IDENTITY FULL;

