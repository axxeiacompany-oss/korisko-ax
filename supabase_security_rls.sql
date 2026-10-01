-- =========================================================================
-- PADARIA KORISKO - SCRIPT SQL DE POLÍTICAS RLS E SINCRONIZAÇÃO COMPLETA
-- Executar no Supabase SQL Editor para garantir permissões totais de leitura,
-- gravação e sincronização em tempo real para o PDV e gestão da padaria.
-- =========================================================================

-- 1. HABILITAR ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
ALTER TABLE IF EXISTS public.korisko_system_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.korisko_backup_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.caixa_sessoes ENABLE ROW LEVEL SECURITY;

-- 2. REMOVER POLÍTICAS ANTERIORES PARA EVITAR CONFLITOS
DROP POLICY IF EXISTS "Allow public access usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Allow public access produtos" ON public.produtos;
DROP POLICY IF EXISTS "Allow public access clientes" ON public.clientes;
DROP POLICY IF EXISTS "Allow public access vendas" ON public.vendas;
DROP POLICY IF EXISTS "Allow public access caixa_sessoes" ON public.caixa_sessoes;
DROP POLICY IF EXISTS "Allow public access korisko_system_state" ON public.korisko_system_state;
DROP POLICY IF EXISTS "Allow public access korisko_backup_points" ON public.korisko_backup_points;
DROP POLICY IF EXISTS "Bloquear leitura pública de senhas em usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Acesso seguro korisko_system_state" ON public.korisko_system_state;
DROP POLICY IF EXISTS "Acesso seguro produtos ativos" ON public.produtos;
DROP POLICY IF EXISTS "Acesso seguro clientes ativos" ON public.clientes;
DROP POLICY IF EXISTS "Acesso seguro vendas insercao" ON public.vendas;
DROP POLICY IF EXISTS "Acesso seguro caixa_sessoes" ON public.caixa_sessoes;
DROP POLICY IF EXISTS "Acesso seguro korisko_backup_points" ON public.korisko_backup_points;

-- 3. POLÍTICAS OPERACIONAIS COMPLETAS (CRUD 100% FUNCIONAL PARA O PDV E GESTÃO)
CREATE POLICY "Allow public access usuarios"
  ON public.usuarios
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public access produtos"
  ON public.produtos
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public access clientes"
  ON public.clientes
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public access vendas"
  ON public.vendas
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public access caixa_sessoes"
  ON public.caixa_sessoes
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public access korisko_system_state"
  ON public.korisko_system_state
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public access korisko_backup_points"
  ON public.korisko_backup_points
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 4. CONCEDER PERMISSÕES COMPLETAS AOS ROLES DA APLICAÇÃO
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
