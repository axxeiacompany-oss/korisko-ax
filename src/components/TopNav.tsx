import React, { useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { TabType } from './Header';
import { 
  Search, 
  Coins, 
  Plus, 
  Flame, 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Bell, 
  ExternalLink, 
  Lock, 
  Layers, 
  Sparkles, 
  Command, 
  X, 
  Zap, 
  ShieldCheck 
} from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import { ExchangeRatesModal } from './modals/ExchangeRatesModal';
import { SwitchEmployeeModal } from './modals/SwitchEmployeeModal';
import { FornadaModal } from './modals/FornadaModal';
import { DirectSaleModal } from './modals/DirectSaleModal';
import { LanguageSwitcher } from './LanguageSwitcher';

interface Props {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onLogout: () => void;
  isSidebarCollapsed: boolean;
  onOpenProfile?: () => void;
}

export const TopNav: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  onLogout,
  isSidebarCollapsed,
  onOpenProfile,
}) => {
  const { 
    currentUser, 
    exchangeRates, 
    isCloudSyncing, 
    lastBackupTime, 
    products, 
    customers, 
    openComandas,
    liveRateStatus,
    fetchLiveRates,
    t,
    language
  } = useBakery();

  const [isRatesOpen, setIsRatesOpen] = useState(false);
  const [isSwitchUserOpen, setIsSwitchUserOpen] = useState(false);
  const [isFornadaOpen, setIsFornadaOpen] = useState(false);
  const [isDirectSaleOpen, setIsDirectSaleOpen] = useState(false);
  
  // Quick Search Modal state (Command + K)
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Tab Titles map dynamically localized
  const tabTitles: Record<TabType, { title: string; subtitle: string }> = {
    dashboard: { title: `${t.tabDashboard} & ${language === 'es' ? 'Métricas' : 'Métricas'}`, subtitle: t.subDashboard },
    pdv: { title: t.tabPdv, subtitle: t.subPdv },
    venda_direta: { title: t.tabDirectSale, subtitle: t.subDirectSale },
    estoque: { title: t.tabInventory, subtitle: t.subInventory },
    fichas_tecnicas: { title: t.tabRecipes, subtitle: t.subRecipes },
    crm: { title: t.tabCrm, subtitle: t.subCrm },
    caixa: { title: t.tabCashRegister, subtitle: t.subCashRegister },
    mais_vendidos: { title: t.tabTopProducts, subtitle: t.subTopProducts },
    metas: { title: t.tabGoals, subtitle: t.subGoals },
    cambio: { title: t.tabCurrency, subtitle: t.subCurrency },
    backup: { title: t.tabBackup, subtitle: t.subBackup },
    afiliados: { title: t.tabAffiliates, subtitle: t.subAffiliates },
  };

  const currentTabInfo = tabTitles[activeTab] || { title: 'Korisko ERP', subtitle: 'Gestão Inteligente' };

  // Search Results
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return { products: [], customers: [], comandas: [] };
    const q = searchQuery.toLowerCase();
    
    return {
      products: products.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)).slice(0, 4),
      customers: customers.filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))).slice(0, 3),
      comandas: openComandas.filter(cmd => cmd.number.includes(q) || (cmd.customerName && cmd.customerName.toLowerCase().includes(q))).slice(0, 3),
    };
  }, [searchQuery, products, customers, openComandas]);

  return (
    <>
      <header 
        className={`sticky top-0 z-30 h-16 bg-[#090D15]/90 backdrop-blur-md border-b border-[#182030] px-4 sm:px-6 flex items-center justify-between transition-all duration-300 ${
          isSidebarCollapsed ? 'lg:pl-24' : 'lg:pl-68'
        }`}
      >
        
        {/* Left: View Title & Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight leading-none truncate">
              {currentTabInfo.title}
            </h1>
            <p className="text-[11px] text-neutral-400 hidden sm:block mt-0.5 truncate">
              {currentTabInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Center: Command + K Search Bar */}
        <div className="hidden md:flex items-center flex-1 max-w-xs mx-4">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#0E1422] border border-[#1E273A] text-xs text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-neutral-500" />
              <span>{t.searchPlaceholder}</span>
            </div>
            <kbd className="px-1.5 py-0.5 rounded bg-[#161E30] text-[10px] font-mono text-neutral-400 border border-[#232D44]">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Currency ticker, Language Switcher, Actions & User */}
        <div className="flex items-center gap-2.5">
          
          {/* Language Selector Switcher (ES / PT) */}
          <LanguageSwitcher />

          {/* Real-time Exchange Rates Ticker Pill */}
          <button
            type="button"
            onClick={() => setIsRatesOpen(true)}
            className="hidden sm:flex px-2.5 py-1.5 rounded-xl border border-[#1E273A] bg-[#0E1422] hover:bg-[#151D30] text-xs text-neutral-300 transition-colors items-center gap-2 font-mono-nums"
            title={t.ratesTicker}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-amber-400">1 R$ = {exchangeRates.BRL_TO_PYG.toLocaleString('pt-BR')} ₲</span>
              <span className="text-neutral-600 hidden xl:inline">·</span>
              <span className="text-emerald-400 hidden xl:inline">US$ = R$ {exchangeRates.USD_TO_BRL.toFixed(2)}</span>
            </div>
          </button>

          {/* Fornada Quente Action */}
          <button
            type="button"
            onClick={() => setIsFornadaOpen(true)}
            className="px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
            title="Registrar Fornada do Padeiro"
          >
            <Flame className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.quickActionFornada}</span>
          </button>

          {/* Venda Direta Rápida (1-Clique: Apenas Valor e Confirme) */}
          <button
            type="button"
            onClick={() => setIsDirectSaleOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            title={t.directSaleSubtitle}
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">{t.quickActionDirectSale}</span>
            <span className="sm:hidden">⚡</span>
          </button>

          {/* Nova Venda Action */}
          <button
            type="button"
            onClick={() => onSelectTab('pdv')}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">{t.quickActionNewSale}</span>
          </button>

          {/* User Profile Online & Password View Pill */}
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-[#1E273A] bg-[#0E1422] hover:bg-[#151D30] hover:border-indigo-500/40 text-neutral-300 transition-all cursor-pointer"
            title={`${t.myProfile} (${t.myPassword})`}
          >
            <div className="relative">
              <div className={`w-6 h-6 rounded-lg ${currentUser.avatarColor || 'bg-indigo-600'} text-white flex items-center justify-center text-[11px] font-bold`}>
                {currentUser.name.charAt(0)}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-[#0E1422] animate-pulse" />
            </div>
            <div className="text-left hidden lg:block leading-tight">
              <span className="text-[11px] font-bold text-white block truncate max-w-[85px]">{currentUser.name}</span>
              <span className="text-[9px] text-emerald-400 block font-medium">Online · {language === 'es' ? 'Ver Clave' : 'Ver Senha'}</span>
            </div>
          </button>

          {/* Quick Lock / Logout */}
          <button
            type="button"
            onClick={onLogout}
            className="p-2 rounded-xl border border-[#1E273A] bg-[#0E1422] hover:bg-[#182032] text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title={t.lockSession}
          >
            <Lock className="w-4 h-4" />
          </button>

        </div>

      </header>

      {/* Global Command + K Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-[#0D121E] border border-[#1E273A] rounded-2xl shadow-2xl overflow-hidden">
            
            <div className="flex items-center px-4 border-b border-[#1A2234]">
              <Search className="w-4 h-4 text-neutral-500 mr-3" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por pães, bebidas, clientes, comandas..."
                className="w-full py-3.5 bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none font-sans"
              />
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="p-1 rounded-lg text-neutral-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 max-h-80 overflow-y-auto space-y-3">
              {searchQuery ? (
                <>
                  {searchResults.products.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2">{t.searchProducts}</span>
                      {searchResults.products.map(p => (
                        <div 
                          key={p.id}
                          onClick={() => { onSelectTab('pdv'); setIsSearchOpen(false); }}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-[#141B2B] cursor-pointer text-xs"
                        >
                          <span className="text-neutral-200 font-medium">{p.name} ({p.code})</span>
                          <span className="text-amber-400 font-mono-nums font-semibold">{formatCurrency(p.priceBrl, 'BRL')} / {p.unit}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.customers.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2">{t.searchCustomers}</span>
                      {searchResults.customers.map(c => (
                        <div 
                          key={c.id}
                          onClick={() => { onSelectTab('crm'); setIsSearchOpen(false); }}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-[#141B2B] cursor-pointer text-xs"
                        >
                          <span className="text-neutral-200 font-medium">{c.name}</span>
                          <span className="text-neutral-400 font-mono-nums">{c.phone || c.category}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.comandas.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2">{t.searchComandas}</span>
                      {searchResults.comandas.map(cmd => (
                        <div 
                          key={cmd.id}
                          onClick={() => { onSelectTab('pdv'); setIsSearchOpen(false); }}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-[#141B2B] cursor-pointer text-xs"
                        >
                          <span className="text-neutral-200 font-medium">Comanda #{cmd.number} {cmd.customerName ? `(${cmd.customerName})` : ''}</span>
                          <span className="text-emerald-400 font-mono-nums">{cmd.items.length} {language === 'es' ? 'ítems' : 'itens'}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.products.length === 0 && searchResults.customers.length === 0 && searchResults.comandas.length === 0 && (
                    <p className="text-xs text-neutral-500 text-center py-6">{t.noResultsFound} "{searchQuery}".</p>
                  )}
                </>
              ) : (
                <div className="text-center py-6 space-y-1">
                  <p className="text-xs text-neutral-400 font-medium">{t.searchTitle}</p>
                  <p className="text-[11px] text-neutral-500">{t.searchHint}</p>
                </div>
              )}
            </div>

            <div className="p-2.5 border-t border-[#1A2234] bg-[#0A0D15] flex items-center justify-between text-[11px] text-neutral-500">
              <span>{language === 'es' ? 'Presione' : 'Pressione'} <kbd className="px-1 rounded bg-[#161E30] text-neutral-300">ESC</kbd> {language === 'es' ? 'para cerrar' : 'para fechar'}</span>
              <span>Korisko ERP</span>
            </div>

          </div>
        </div>
      )}

      {/* Real-time Exchange Rates Modal */}
      <ExchangeRatesModal
        isOpen={isRatesOpen}
        onClose={() => setIsRatesOpen(false)}
      />

      {/* Switch Employee Modal */}
      <SwitchEmployeeModal
        isOpen={isSwitchUserOpen}
        onClose={() => setIsSwitchUserOpen(false)}
      />

      {/* Fornada Quente Modal */}
      <FornadaModal
        isOpen={isFornadaOpen}
        onClose={() => setIsFornadaOpen(false)}
      />

      {/* Direct Sale Modal */}
      <DirectSaleModal
        isOpen={isDirectSaleOpen}
        onClose={() => setIsDirectSaleOpen(false)}
      />

    </>
  );
};
