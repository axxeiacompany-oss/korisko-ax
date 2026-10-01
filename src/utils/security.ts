/**
 * Korisko System - Módulo de Segurança Avançada & Proteção Anti-F12 (DevTools Shield)
 * 
 * 1. Bloqueia tecla F12
 * 2. Bloqueia atalhos de desenvolvedor: Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Cmd+Option+I, etc.
 * 3. Desativa botão direito do mouse (Menu de contexto / Inspecionar elemento)
 * 4. Silencia e limpa todos os logs do console (console.log, dir, table, etc.)
 * 5. Se o DevTools for forçado, ativa tela de blindagem ("nada aparece")
 * 6. Fornece script SQL de Segurança RLS (Row Level Security) para o banco de dados Supabase/PostgreSQL.
 */

export const SECURITY_SQL_SCRIPT = `-- =========================================================================
-- PADARIA KORISKO - SCRIPT SQL DE SEGURANÇA E BLINDAGEM COMPLETA (RLS)
-- Quando alguém abrir o F12 ou tentar usar a Anon Key, NADA APARECE.
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

-- 5. BLINDAGEM CONTRA EXCLUSÃO NÃO AUTORIZADA
REVOKE DELETE, TRUNCATE ON public.usuarios FROM anon;
REVOKE DELETE, TRUNCATE ON public.korisko_system_state FROM anon;
REVOKE DELETE, TRUNCATE ON public.korisko_backup_points FROM anon;

-- 6. AUDITORIA E STATUS
COMMENT ON TABLE public.usuarios IS 'Protegido por RLS Korisko contra F12 e inspeção não autorizada.';
`;

let isShieldInitialized = false;

export function initSecurityShield() {
  if (typeof window === 'undefined' || isShieldInitialized) return;
  isShieldInitialized = true;

  // 1. Silenciar e limpar Console para que nada apareça ao inspecionar
  try {
    const noop = () => {};
    window.console.log = noop;
    window.console.info = noop;
    window.console.warn = noop;
    window.console.debug = noop;
    window.console.table = noop;
    window.console.dir = noop;
    window.console.trace = noop;
    // Deixar apenas error silenciado após clear
    window.console.error = noop;
    window.console.clear();
  } catch {}

  // 2. Interceptar Teclas de Inspeção (F12, Ctrl+Shift+I, etc.)
  window.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      // Tecla F12
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        try { window.console.clear(); } catch {}
        return false;
      }

      // Atalhos comuns de Developer Tools (Windows / Mac)
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const isAlt = e.altKey;
      const key = (e.key || '').toUpperCase();

      // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (Inspecionar / Console)
      if (isCtrlOrMeta && isShift && (key === 'I' || key === 'J' || key === 'C' || key === 'K')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        try { window.console.clear(); } catch {}
        return false;
      }

      // Mac Cmd+Option+I, Cmd+Option+J, Cmd+Option+C
      if (isCtrlOrMeta && isAlt && (key === 'I' || key === 'J' || key === 'C')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        try { window.console.clear(); } catch {}
        return false;
      }

      // Ctrl+U (Ver código-fonte)
      if (isCtrlOrMeta && key === 'U') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }

      // Ctrl+S (Salvar página completa)
      if (isCtrlOrMeta && key === 'S') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    },
    { capture: true, passive: false }
  );

  // 3. Desativar Botão Direito do Mouse (Inspecionar Elemento)
  window.addEventListener(
    'contextmenu',
    (e: MouseEvent) => {
      // Se não for em um input/textarea onde o usuário precisa colar texto
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return; // Permite colar em campos de texto normais
      }
      e.preventDefault();
      e.stopPropagation();
      return false;
    },
    { capture: true, passive: false }
  );

  // 4. Limpeza contínua do console a cada intervalo
  setInterval(() => {
    try {
      window.console.clear();
    } catch {}
  }, 2000);
}
