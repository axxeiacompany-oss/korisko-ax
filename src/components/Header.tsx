import React, { useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Coins, 
  User, 
  KeyRound, 
  Shield, 
  Lock 
} from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import { SwitchEmployeeModal } from './modals/SwitchEmployeeModal';
import { ExchangeRatesModal } from './modals/ExchangeRatesModal';
import { LanguageSwitcher } from './LanguageSwitcher';

export type TabType = 
  | 'dashboard' 
  | 'pdv' 
  | 'venda_direta'
  | 'estoque' 
  | 'fichas_tecnicas'
  | 'crm'
  | 'clientes'
  | 'caixa' 
  | 'mais_vendidos' 
  | 'metas' 
  | 'cambio' 
  | 'backup'
  | 'afiliados'
  | 'loja'
  | 'minha_conta'
  | 'portal_afiliado';

interface Props {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const Header: React.FC<Props> = ({ activeTab, onSelectTab }) => {
  const { 
    currentUser, 
    exchangeRates, 
    isCloudSyncing, 
    lastBackupTime, 
    currentSession,
    dbStatus,
    t,
    language 
  } = useBakery();

  const [isSwitchUserOpen, setIsSwitchUserOpen] = useState(false);
  const [isRatesOpen, setIsRatesOpen] = useState(false);

  const navItems: Array<{ id: TabType; label: string }> = [
    { id: 'dashboard', label: t.tabDashboard },
    { id: 'pdv', label: t.tabPdv },
    { id: 'estoque', label: t.tabInventory },
    { id: 'fichas_tecnicas', label: t.tabRecipes },
    { id: 'clientes', label: language === 'es' ? 'Clientes' : 'Clientes' },
    { id: 'crm', label: t.tabCrm },
    { id: 'caixa', label: t.tabCashRegister },
    { id: 'mais_vendidos', label: t.tabTopProducts },
    { id: 'metas', label: t.tabGoals },
    { id: 'cambio', label: t.tabCurrency },
    { id: 'backup', label: t.tabBackup },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between px-6 py-3.5 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md">
        
        {/* Zone 1: Single text element wordmark */}
        <a 
          href="#dashboard" 
          onClick={(e) => { e.preventDefault(); onSelectTab('dashboard'); }}
          className="flex items-center gap-2 group shrink-0"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-neutral-950 font-black text-sm shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
            K
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-neutral-100 group-hover:text-amber-400 transition-colors leading-none">
              {t.appName}
            </div>
            {t.appSlogan ? (
              <span className="text-[10px] text-neutral-500 font-medium">{t.appSlogan}</span>
            ) : null}
          </div>
        </a>

        {/* Zone 2: Clean text navigation links */}
        <nav className="hidden lg:flex items-center gap-1.5 overflow-x-auto py-0.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-neutral-800 text-amber-400 shadow-sm font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Actions & Status */}
        <div className="flex items-center gap-3">
          
          {/* Language Switcher */}
          <LanguageSwitcher compact />
          
          {/* Official Currency Badge (₲ Guaraní) */}
          <div
            title="Moeda Oficial do Sistema: Guaraní (₲ PYG)"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 text-xs"
          >
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono-nums font-bold text-[11px] text-amber-300">
              ₲ Guaraní (PYG)
            </span>
          </div>

          {/* Cloud / Database Sync Status Indicator */}
          <button
            type="button"
            onClick={() => onSelectTab('backup')}
            title={
              dbStatus.connected
                ? 'Banco de Dados Conectado e Operacional'
                : lastBackupTime
                ? `Último backup: ${new Date(lastBackupTime).toLocaleTimeString('pt-BR')}`
                : 'Sincronização em nuvem'
            }
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800/60 transition-colors text-xs text-neutral-400"
          >
            {isCloudSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" />
            ) : dbStatus.connected ? (
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Cloud className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="hidden md:inline text-[11px]">
              {isCloudSyncing
                ? 'Sincronizando...'
                : dbStatus.connected
                ? 'Banco OK'
                : 'Nuvem OK'}
            </span>
          </button>

          {/* Active Employee Profile & Switcher */}
          <button
            type="button"
            onClick={() => setIsSwitchUserOpen(true)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900/80 hover:border-neutral-700 hover:bg-neutral-850 transition-all text-xs"
          >
            <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white shadow-sm ${currentUser.avatarColor}`}>
              {currentUser.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div className="text-left hidden sm:block">
              <span className="font-semibold text-neutral-200 block text-xs leading-none">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-amber-400/90 capitalize leading-tight">
                {currentUser.role}
              </span>
            </div>
          </button>

        </div>

      </header>

      {/* Mobile Secondary Navigation Row for narrow screens */}
      <div className="lg:hidden flex items-center gap-1 overflow-x-auto px-4 py-2 bg-neutral-950 border-b border-neutral-800 text-xs">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-neutral-800 text-amber-400 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Modals */}
      <SwitchEmployeeModal
        isOpen={isSwitchUserOpen}
        onClose={() => setIsSwitchUserOpen(false)}
      />

      <ExchangeRatesModal
        isOpen={isRatesOpen}
        onClose={() => setIsRatesOpen(false)}
      />
    </>
  );
};
