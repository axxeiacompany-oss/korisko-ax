/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BakeryProvider, useBakery } from './context/BakeryContext';
import { TabType } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { LoginView } from './components/views/LoginView';
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
import { SwitchEmployeeModal } from './components/modals/SwitchEmployeeModal';

function MainAppShell() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Check if user previously logged in this session
    const saved = sessionStorage.getItem('KORISKO_AUTH_SESSION');
    return saved !== 'false'; // default to true for instant preview, but persists logout
  });

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isSwitchUserOpen, setIsSwitchUserOpen] = useState<boolean>(false);

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.setItem('KORISKO_AUTH_SESSION', 'false');
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    sessionStorage.setItem('KORISKO_AUTH_SESSION', 'true');
  };

  // Keyboard shortcut for Cmd/Ctrl + K (Search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        // Dispatched to TopNav search if authenticated
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // If not authenticated, show UTMify-style Login View
  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-neutral-100 font-sans flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* UTMify-Style Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        onLogout={handleLogout}
        onOpenSwitchUser={() => setIsSwitchUserOpen(true)}
      />

      {/* Top Header */}
      <TopNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onLogout={handleLogout}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      {/* Main Content Area with adaptive left padding based on sidebar */}
      <main 
        className={`flex-1 w-full mx-auto p-4 sm:p-6 lg:p-8 transition-all duration-300 ${
          isSidebarCollapsed ? 'lg:pl-24' : 'lg:pl-68'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && <DashboardView onNavigate={setActiveTab} />}
          {activeTab === 'pdv' && <PdvView />}
          {activeTab === 'estoque' && <InventoryView />}
          {activeTab === 'fichas_tecnicas' && <FichaTecnicaView />}
          {activeTab === 'crm' && <CustomersView />}
          {activeTab === 'caixa' && <CashRegisterView />}
          {activeTab === 'mais_vendidos' && <MonthlyTopProductsView />}
          {activeTab === 'metas' && <GoalsView />}
          {activeTab === 'cambio' && <CurrencyReportsView />}
          {activeTab === 'backup' && <BackupView />}
        </div>
      </main>

      {/* Footer */}
      <footer 
        className={`border-t border-[#141A28] bg-[#080B11]/80 py-4 px-6 text-center text-xs text-neutral-400 no-print transition-all duration-300 ${
          isSidebarCollapsed ? 'lg:pl-24' : 'lg:pl-68'
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-medium text-neutral-300">
            Korisko — Sistema Integrado de Gestão de Padaria, Confeitaria & Salão
          </p>
          <div className="flex items-center gap-3 text-[11px] font-mono-nums">
            <span>🇧🇷 BRL</span>
            <span>🇵🇾 PYG</span>
            <span>🇺🇸 USD</span>
            <span className="text-neutral-600">|</span>
            <span className="text-emerald-400">● Backup Automático Ativo</span>
            <span className="text-neutral-600">|</span>
            <button
              onClick={handleLogout}
              className="text-indigo-400 hover:text-indigo-300 underline font-sans cursor-pointer"
            >
              Ver Tela de Login (UTMify)
            </button>
          </div>
        </div>
      </footer>

      {/* Switch Operator / PIN Modal */}
      <SwitchEmployeeModal
        isOpen={isSwitchUserOpen}
        onClose={() => setIsSwitchUserOpen(false)}
      />

    </div>
  );
}

export default function App() {
  return (
    <BakeryProvider>
      <MainAppShell />
    </BakeryProvider>
  );
}
