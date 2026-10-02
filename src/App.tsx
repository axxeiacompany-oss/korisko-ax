/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BakeryProvider, useBakery } from './context/BakeryContext';
import { TabType } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { AuthView } from './components/views/AuthView';
import { StoreView } from './components/views/StoreView';
import { CustomerAccountView } from './components/views/CustomerAccountView';
import { AffiliateDashboardView } from './components/views/AffiliateDashboardView';
import { DashboardView } from './components/views/DashboardView';
import { PdvView } from './components/views/PdvView';
import { InventoryView } from './components/views/InventoryView';
import { CashRegisterView } from './components/views/CashRegisterView';
import { MonthlyTopProductsView } from './components/views/MonthlyTopProductsView';
import { GoalsView } from './components/views/GoalsView';
import { CurrencyReportsView } from './components/views/CurrencyReportsView';
import { BackupView } from './components/views/BackupView';
import { FichaTecnicaView } from './components/views/FichaTecnicaView';
import { CustomersView } from './components/views/CustomersView';
import { ClientesView } from './components/views/ClientesView';
import { DirectSaleView } from './components/views/DirectSaleView';
import { AfiliadosView } from './components/views/AfiliadosView';
import { MobileBottomNav } from './components/MobileBottomNav';
import { SwitchEmployeeModal } from './components/modals/SwitchEmployeeModal';
import { UserProfileModal } from './components/modals/UserProfileModal';
import { ShieldAlert, AlertTriangle, X } from 'lucide-react';

function MainAppShell() {
  const { user, profile, role, isAuthenticated, signOut, isLoading } = useAuth();
  const {
    isFeatureAllowed,
    hasStorePermission,
    validateStoreAccess,
    currentUser,
    t,
    language,
    dbError,
    clearDbError,
    toast,
    clearToast,
    showToast,
  } = useBakery();

  const isStaffAuthenticated =
    isAuthenticated &&
    (role === 'admin' || role === 'manager' || role === 'employee' || role === 'affiliate');

  // Active view state
  const [currentRoute, setCurrentRoute] = useState<'loja' | 'login' | 'minha_conta' | 'portal_afiliado' | TabType>(() => {
    // Check URL or search
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path === '/login') return 'login';
      if (path === '/minha-conta') return 'minha_conta';
      if (path === '/afiliado') return 'portal_afiliado';
      if (path === '/crm') return 'crm';
      if (path === '/dashboard') return 'dashboard';
    }
    return 'loja';
  });

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isSwitchUserOpen, setIsSwitchUserOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isStandaloneStorePreview, setIsStandaloneStorePreview] = useState<boolean>(false);

  // Determine the default module for the current user (directing to 'dashboard' if 'loja' is denied)
  const getFirstAllowedTab = (): TabType => {
    const canUseStore = validateStoreAccess();
    const allowed = (currentUser?.allowedFeatures || []).filter(
      feat => feat !== 'loja' || canUseStore
    );

    if (allowed.length > 0) {
      if (canUseStore && allowed.includes('loja') && (!allowed.includes('crm') || role === 'affiliate' || currentUser?.role === 'afiliado')) {
        return 'loja';
      }
      if (allowed.includes('dashboard')) {
        return 'dashboard';
      }
      return allowed[0] as TabType;
    }
    if (isFeatureAllowed('dashboard')) return 'dashboard';
    if (canUseStore) return 'loja';
    if (isFeatureAllowed('crm')) return 'crm';
    return 'dashboard';
  };

  // Auto-route on login status or permission change:
  // Specifically blocks 'loja' if collaborator does not have explicit 'loja' permission and redirects to 'dashboard'
  useEffect(() => {
    if (isAuthenticated) {
      if (role === 'customer') {
        if (currentRoute === 'login') {
          setCurrentRoute('minha_conta');
        }
      } else {
        const canUseStore = validateStoreAccess();

        // Specific guard: if collaborator lacks 'loja' permission, prevent store rendering and direct to default dashboard
        if ((currentRoute === 'loja' || activeTab === 'loja' || isStandaloneStorePreview) && !canUseStore) {
          setIsStandaloneStorePreview(false);
          const fallbackTab: TabType = isFeatureAllowed('dashboard') ? 'dashboard' : getFirstAllowedTab();
          setCurrentRoute(fallbackTab);
          setActiveTab(fallbackTab);
          return;
        }

        const preferredTab = getFirstAllowedTab();
        if (currentRoute === 'login') {
          setCurrentRoute(preferredTab);
          setActiveTab(preferredTab);
        } else if (!isFeatureAllowed(activeTab as any)) {
          const fallbackTab: TabType = isFeatureAllowed('dashboard') ? 'dashboard' : preferredTab;
          setCurrentRoute(fallbackTab);
          setActiveTab(fallbackTab);
        }
      }
    }
  }, [isAuthenticated, role, currentRoute, activeTab, isStandaloneStorePreview, currentUser, hasStorePermission, validateStoreAccess]);

  // Handle Logout
  const handleLogout = async () => {
    await signOut();
    setCurrentRoute('loja');
    setActiveTab('dashboard');
    try {
      sessionStorage.removeItem('KORISKO_AUTH_SESSION');
      localStorage.removeItem('KORISKO_AUTH_SESSION');
      localStorage.removeItem('KORISKO_REMEMBER_DEVICE');
      localStorage.removeItem('KORISKO_CURRENT_USER_ID');
    } catch {}
  };

  // Handle Successful Login redirection
  const handleLoginSuccess = (targetPath: string) => {
    if (targetPath === '/minha-conta') {
      setCurrentRoute('minha_conta');
    } else if (targetPath === '/loja') {
      if (validateStoreAccess()) {
        setCurrentRoute('loja');
        setActiveTab('loja');
      } else {
        setCurrentRoute('dashboard');
        setActiveTab('dashboard');
      }
    } else if (targetPath === '/afiliado') {
      if (validateStoreAccess()) {
        setCurrentRoute('loja');
        setActiveTab('loja');
      } else if (isFeatureAllowed('portal_afiliado')) {
        setCurrentRoute('portal_afiliado');
        setActiveTab('portal_afiliado');
      } else {
        setCurrentRoute('dashboard');
        setActiveTab('dashboard');
      }
    } else if (targetPath === '/crm') {
      const preferred = getFirstAllowedTab();
      setCurrentRoute(preferred);
      setActiveTab(preferred);
    } else {
      const preferred = getFirstAllowedTab();
      setCurrentRoute(preferred);
      setActiveTab(preferred);
    }
  };

  // Instant scroll & tab switch (with explicit 'loja' validation guard)
  const handleSelectTab = (tab: TabType) => {
    setIsStandaloneStorePreview(false);
    if (tab === 'minha_conta') {
      setCurrentRoute('minha_conta');
    } else if (tab === 'loja' && isStaffAuthenticated && !validateStoreAccess()) {
      showToast(
        language === 'es'
          ? 'Acceso a la Tienda denegado. Redirigiendo al Panel Principal.'
          : 'Acesso à Loja negado para este colaborador. Redirecionando para a Dashboard padrão.',
        'error'
      );
      setCurrentRoute('dashboard');
      setActiveTab('dashboard');
    } else {
      setCurrentRoute(tab);
      setActiveTab(tab);
    }
    setIsMobileMenuOpen(false);
    try {
      window.scrollTo({ top: 0, behavior: 'instant' as any });
    } catch {}
  };

  // Keyboard shortcut for Cmd/Ctrl + K (Search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // -------------------------------------------------------------
  // 1. ROTA PÚBLICA: /login (Centralizada para entrar, cadastrar, recuperar)
  // -------------------------------------------------------------
  if (currentRoute === 'login') {
    return (
      <AuthView
        onSuccessRedirect={handleLoginSuccess}
        onNavigateHome={() => setCurrentRoute('loja')}
      />
    );
  }

  // -------------------------------------------------------------
  // 2. ROTA: /minha-conta (Área do Cliente)
  // -------------------------------------------------------------
  if (currentRoute === 'minha_conta') {
    if (!isAuthenticated) {
      return (
        <AuthView
          onSuccessRedirect={() => setCurrentRoute('minha_conta')}
          onNavigateHome={() => setCurrentRoute('loja')}
        />
      );
    }
    return (
      <CustomerAccountView
        onNavigateStore={() => setCurrentRoute('loja')}
        onLogout={handleLogout}
      />
    );
  }

  // -------------------------------------------------------------
  // 3. ROTA: /afiliado (Portal de Afiliados - se não estiver no shell administrativo)
  // -------------------------------------------------------------
  if (currentRoute === 'portal_afiliado' && !isStaffAuthenticated) {
    return (
      <AuthView
        onSuccessRedirect={() => {
          setCurrentRoute('portal_afiliado');
          setActiveTab('portal_afiliado');
        }}
        onNavigateHome={() => setCurrentRoute('loja')}
      />
    );
  }

  // -------------------------------------------------------------
  // 4. ROTA PÚBLICA PADRÃO: /loja (Vitrine Pública apenas para visitantes/clientes,
  // ou preview tela cheia APENAS para colaboradores com permissão 'loja' ativa).
  // Se um colaborador logado NÃO tiver a permissão 'loja' ativa, bloqueia a loja e direciona para a dashboard!
  // -------------------------------------------------------------
  if (
    (currentRoute === 'loja' && !isStaffAuthenticated) ||
    (isStaffAuthenticated && isStandaloneStorePreview && validateStoreAccess())
  ) {
    return (
      <StoreView
        onOpenAuth={() => setCurrentRoute('login')}
        onNavigateAccount={() => {
          setIsStandaloneStorePreview(false);
          if (!isAuthenticated) {
            setCurrentRoute('login');
          } else if (role === 'customer') {
            setCurrentRoute('minha_conta');
          } else {
            const preferred = getFirstAllowedTab();
            setCurrentRoute(preferred);
            setActiveTab(preferred);
          }
        }}
      />
    );
  }

  // -------------------------------------------------------------
  // 4.1. BLOQUEIO DE SEGURANÇA: Qualquer rota interna exige login válido
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <AuthView
        onSuccessRedirect={handleLoginSuccess}
        onNavigateHome={() => setCurrentRoute('loja')}
      />
    );
  }

  // Se o usuário autenticado for um cliente normal tentando acessar rotas administrativas
  if (role === 'customer') {
    return (
      <CustomerAccountView
        onNavigateStore={() => setCurrentRoute('loja')}
        onLogout={handleLogout}
      />
    );
  }

  // -------------------------------------------------------------
  // 5. SHELL ADMINISTRATIVO: Para colaboradores, gerentes e admin
  // Preserva 100% do CRM existente, PDV, Estoque, Caixa e Métricas!
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-[#0A0D14] text-neutral-100 font-sans flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Toast Notification Surface */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#0F1422] border border-[#232E45] shadow-2xl animate-in slide-in-from-top-4 fade-in duration-200 max-w-sm">
          <div className={`w-2 h-2 rounded-full shrink-0 ${
            toast.type === 'error' ? 'bg-rose-500' : toast.type === 'success' ? 'bg-emerald-500' : 'bg-amber-500'
          }`} />
          <span className="text-xs font-medium text-neutral-100 flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={clearToast}
            className="p-1 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* UTMify-Style Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        onLogout={handleLogout}
        onOpenSwitchUser={() => setIsSwitchUserOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Top Header */}
      <TopNav
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onLogout={handleLogout}
        isSidebarCollapsed={isSidebarCollapsed}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
      />

      {/* Main Content Area */}
      <main 
        className={`flex-1 w-full max-w-full overflow-x-hidden mx-auto p-3 sm:p-6 lg:p-8 pb-24 lg:pb-8 transition-[padding-left] duration-200 ease-out ${
          isSidebarCollapsed ? 'lg:pl-24' : 'lg:pl-68'
        }`}
      >
        <div className="w-full max-w-7xl mx-auto">
          {/* Database Alert Banner if applicable */}
          {dbError && (
            <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-200 flex items-start justify-between shadow-xl gap-3 animate-in fade-in zoom-in-95">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-red-300 uppercase tracking-wider">
                    {language === 'es' ? 'Aviso de Base de Datos Supabase' : 'Aviso do Banco de Dados Supabase'}
                  </h4>
                  <p className="text-xs text-red-200/90 mt-0.5 break-all">{dbError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearDbError}
                className="p-1 rounded-lg text-red-400 hover:text-white hover:bg-red-500/20 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeTab === 'loja' && !validateStoreAccess() ? (
            <div className="w-full min-h-[60vh]">
              <DashboardView onNavigate={handleSelectTab} />
            </div>
          ) : !isFeatureAllowed(activeTab as any) ? (
            <div className="p-8 rounded-2xl bg-[#0D121E] border border-[#1E273A] text-center max-w-lg mx-auto my-12 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-white">
                {language === 'es' ? 'Módulo Restringido' : 'Módulo Restrito'}
              </h2>
              <p className="text-xs text-neutral-400">
                {language === 'es' 
                  ? `Su perfil de usuario (${currentUser.name}) no tiene autorización para acceder a este módulo. Solicite al Administrador General (Ax) la habilitación de esta función.`
                  : `O seu perfil de usuário (${currentUser.name}) não possui liberação para este módulo. Solicite ao Administrador Geral (Ax) a liberação desta função.`
                }
              </p>
              <button
                type="button"
                onClick={() => handleSelectTab('dashboard')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
              >
                {language === 'es' ? 'Ir al Panel Principal' : 'Ir para a Dashboard Padrão'}
              </button>
            </div>
          ) : (
            <div className="w-full min-h-[60vh]">
              {/* PRESERVAÇÃO TOTAL DOS MÓDULOS EXISTENTES + LOJA INTEGRADA (COM BLOQUEIO DE PERMISSÃO 'LOJA') */}
              {activeTab === 'dashboard' && <DashboardView onNavigate={handleSelectTab} />}
              {activeTab === 'pdv' && <PdvView />}
              {activeTab === 'venda_direta' && <DirectSaleView />}
              {activeTab === 'loja' && validateStoreAccess() && (
                <StoreView
                  embeddedInAdmin
                  onOpenAuth={() => setCurrentRoute('login')}
                  onNavigateAdmin={handleSelectTab}
                  onOpenStandaloneStore={() => {
                    if (validateStoreAccess()) {
                      setIsStandaloneStorePreview(true);
                    }
                  }}
                />
              )}
              {activeTab === 'estoque' && <InventoryView />}
              {activeTab === 'fichas_tecnicas' && <FichaTecnicaView />}
              {activeTab === 'clientes' && <ClientesView onNavigateCrm={() => handleSelectTab('crm')} />}
              {activeTab === 'crm' && <CustomersView onNavigateClientes={() => handleSelectTab('clientes')} />}
              {activeTab === 'caixa' && <CashRegisterView />}
              {activeTab === 'mais_vendidos' && <MonthlyTopProductsView />}
              {activeTab === 'metas' && <GoalsView />}
              {activeTab === 'cambio' && <CurrencyReportsView />}
              {activeTab === 'backup' && <BackupView />}
              {activeTab === 'afiliados' && <AfiliadosView onNavigate={handleSelectTab} />}
              {activeTab === 'portal_afiliado' && (
                <AffiliateDashboardView
                  onNavigateStore={() => {
                    if (validateStoreAccess()) {
                      handleSelectTab('loja');
                    } else {
                      handleSelectTab('dashboard');
                    }
                  }}
                  onLogout={handleLogout}
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* Mobile Sticky Quick Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
      />

      {/* Footer */}
      <footer 
        className={`border-t border-[#141A28] bg-[#080B11]/80 py-4 px-6 text-center text-xs text-neutral-400 no-print transition-[padding-left] duration-200 ease-out ${
          isSidebarCollapsed ? 'lg:pl-24' : 'lg:pl-68'
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-medium text-neutral-300">
            {t.appName} — {t.systemDescription}
          </p>
          <div className="flex items-center gap-3 text-[11px] font-mono-nums">
            <span className="text-amber-400 font-semibold">🇵🇾 Moeda Oficial: Guaraní (₲ PYG)</span>
            <span className="text-neutral-600">|</span>
            <span className="text-emerald-400">● {language === 'es' ? 'Backup Automático Activo' : 'Backup Automático Ativo'}</span>
          </div>
        </div>
      </footer>

      {/* Switch Operator / PIN Modal */}
      <SwitchEmployeeModal
        isOpen={isSwitchUserOpen}
        onClose={() => setIsSwitchUserOpen(false)}
      />

      {/* Online User Profile & Password/PIN Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BakeryProvider>
        <MainAppShell />
      </BakeryProvider>
    </AuthProvider>
  );
}
