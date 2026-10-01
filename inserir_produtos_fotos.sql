-- ==============================================================================
-- PADARIA KORISKO - SCRIPT SQL: INSERÇÃO DOS PRODUTOS COM FOTO (₲ PYG - GUARANIS)
-- ==============================================================================
-- Copie e cole este script no SQL Editor do seu projeto Supabase (ou PostgreSQL)
-- e clique em RUN. Ele atualiza a estrutura e cadastra os itens automaticamente.
-- ==============================================================================

-- 1. GARANTIR QUE A TABELA PRODUTOS SUPORTA FOTOS E DESCRIÇÕES
ALTER TABLE IF EXISTS public.produtos
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT true;

-- 2. INSERIR OU ATUALIZAR OS PRODUTOS DAS FOTOS (PREÇOS EM GUARANIS ₲ PYG)
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
  -- 1) CUCA ALEMÃ DOCE DE LEITE COM CANELA (₲ 50.000)
  (
    'prod-cuca-alema',
    'CONF-010',
    'Cuca Alemã Doce de Leite com Canela',
    'confeitaria',
    50000, -- 50.000 Gs
    20000, -- Custo aproximado
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

  -- 2) BOLO PUDIM TRADICIONAL (₲ 40.000)
  (
    'prod-bolo-pudim',
    'CONF-011',
    'Bolo Pudim',
    'confeitaria',
    40000, -- 40.000 Gs
    16000, -- Custo aproximado
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

  -- 3) BROWNIE DE CHOCOLATE 70% CACAU - UNIDADE (₲ 20.000)
  (
    'prod-brownie-70',
    'CONF-012',
    'Brownie de Chocolate 70% Cacau (Unidade)',
    'confeitaria',
    20000, -- 20.000 Gs
    8000,  -- Custo aproximado
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

  -- 4) COMBO 3 UNIDADES BROWNIE 70% CACAU (₲ 50.000)
  (
    'prod-combo-brownies',
    'CONF-013',
    'Combo 3 Brownies 70% Cacau',
    'confeitaria',
    50000, -- 50.000 Gs (Preço promocional)
    24000, -- Custo aproximado
    10,
    3,
    'un',
    true,
    '/src/assets/images/combo_tres_brownies_1790886603094.jpg',
    'Combo promocional com 3 unidades do brownie 70% cacau. Economize ₲ 10.000!',
    'combo-3-brownies-70-cacau',
    60000, -- De ₲ 60.000 por ₲ 50.000
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

-- 3. ATUALIZAR O ESTADO CONSOLIDADO DO KORISKO (SINCRONIZAÇÃO INSTANTÂNEA NO FRONTEND)
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

-- 4. CONFIRMAÇÃO VISUAL DA EXECUÇÃO
SELECT id, code, name, price_brl as preco_guarani, image_url, stock, active 
FROM public.produtos 
ORDER BY created_at DESC 
LIMIT 10;
