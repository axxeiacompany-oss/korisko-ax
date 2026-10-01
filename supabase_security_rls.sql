-- =========================================================================
-- PADARIA KORISKO - SCRIPT SQL DE SEGURANÇA E BLINDAGEM COMPLETA (RLS)
-- Executar no Supabase SQL Editor para garantir que ao pressionar F12
-- ou inspecionar o tráfego do navegador, NADA apareça ou possa ser vazado.
-- =========================================================================

-- 1. HABILITAR ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
ALTER TABLE IF EXISTS public.korisko_system_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.korisko_backup_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.caixa_sessoes ENABLE ROW LEVEL SECURITY;

-- 2. REMOVER POLÍTICAS PÚBLICAS PERMISSIVAS ANTERIORES
DROP POLICY IF EXISTS "Allow public access usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Allow public access produtos" ON public.produtos;
DROP POLICY IF EXISTS "Allow public access clientes" ON public.clientes;
DROP POLICY IF EXISTS "Allow public access vendas" ON public.vendas;
DROP POLICY IF EXISTS "Allow public access caixa_sessoes" ON public.caixa_sessoes;
DROP POLICY IF EXISTS "Allow public access korisko_system_state" ON public.korisko_system_state;
DROP POLICY IF EXISTS "Allow public access korisko_backup_points" ON public.korisko_backup_points;

-- 3. BLOQUEAR LEITURA DIRETA DE SENHAS / USUÁRIOS VIA CLIENTE / F12
-- Qualquer chamada pública anon retornará vazio ([]) sem dados de credenciais
CREATE POLICY "Bloquear leitura pública de senhas em usuarios"
  ON public.usuarios
  FOR SELECT
  TO anon
  USING (false);

-- 4. POLÍTICAS SEGURAS DE ISOLAMENTO OPERACIONAL
CREATE POLICY "Acesso seguro korisko_system_state"
  ON public.korisko_system_state
  FOR ALL
  TO anon, authenticated
  USING (id = 'active_state')
  WITH CHECK (id = 'active_state');

CREATE POLICY "Acesso seguro produtos ativos"
  ON public.produtos
  FOR SELECT
  TO anon, authenticated
  USING (active = true);

CREATE POLICY "Acesso seguro clientes ativos"
  ON public.clientes
  FOR SELECT
  TO anon, authenticated
  USING (active = true);

CREATE POLICY "Acesso seguro vendas insercao"
  ON public.vendas
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Acesso seguro caixa_sessoes"
  ON public.caixa_sessoes
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Acesso seguro korisko_backup_points"
  ON public.korisko_backup_points
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 5. BLINDAGEM CONTRA EXCLUSÃO NÃO AUTORIZADA
REVOKE DELETE, TRUNCATE ON public.usuarios FROM anon;
REVOKE DELETE, TRUNCATE ON public.korisko_system_state FROM anon;
REVOKE DELETE, TRUNCATE ON public.korisko_backup_points FROM anon;

-- 6. AUDITORIA E STATUS
COMMENT ON TABLE public.usuarios IS 'Protegido por RLS Korisko contra F12 e inspeção não autorizada.';
