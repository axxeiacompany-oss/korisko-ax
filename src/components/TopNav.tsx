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
  ShieldCheck,
  Menu,
  Radio,
  ClipboardList
} from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import { ExchangeRatesModal } from './modals/ExchangeRatesModal';
import { SwitchEmployeeModal } from './modals/SwitchEmployeeModal';
import { FornadaModal } from './modals/FornadaModal';
import { DirectSaleModal } from './modals/DirectSaleModal';
import { ComandasModal } from './modals/ComandasModal';
import { LanguageSwitcher } from './LanguageSwitcher';
import { LiveSalesStream } from './LiveSalesStream';

interface Props {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onLogout: () => void;
  isSidebarCollapsed: boolean;
  onOpenProfile?: () => void;
  onOpenMobileMenu?: () => void;
}

export const TopNav: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  onLogout,
  isSidebarCollapsed,
  onOpenProfile,
  onOpenMobileMenu,
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
  const [isStreamDrawerOpen, setIsStreamDrawerOpen] = useState(false);
  const [isComandasOpen, setIsComandasOpen] = useState(false);
  
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
    loja: { title: 'Loja Online', subtitle: 'Vitrine pública e catálogo da loja virtual' },
    minha_conta: { title: 'Minha Conta', subtitle: 'Área do cliente, pedidos e endereços' },
    portal_afiliado: { title: 'Portal de Afiliados', subtitle: 'Links de divulgação, métricas e comissões' },
  };

  const currentTabInfo = tabTitles[activeTab] || { title: t.appName, subtitle: t.appSlogan || 'Gestão Inteligente' };

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
        className={`sticky top-0 z-30 h-16 bg-[#090D15] border-b border-[#182030] px-4 sm:px-6 flex items-center justify-between transition-all duration-300 ${
          isSidebarCollapsed ? 'lg:pl-24' : 'lg:pl-68'
        }`}
      >
        
        {/* Left: View Title & Breadcrumb + Mobile Menu Button */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="p-2 -ml-1 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 lg:hidden cursor-pointer shrink-0"
            title="Abrir Menu de Navegação"
            aria-label="Abrir Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight leading-none truncate">
              {currentTabInfo.title}
            </h1>
            <p className="text-[11px] text-amber-400/90 font-medium hidden sm:block mt-0.5 truncate">
              Korizko • Panificação confeitaria artesanal — {currentTabInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Center: Command + K Search Bar - only shown on large desktops (xl) so it never overflows or wraps */}
        <div className="hidden xl:flex items-center flex-1 max-w-xs mx-4 min-w-[180px]">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#0E1422] border border-[#1E273A] text-xs text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 transition-colors cursor-pointer overflow-hidden"
          >
            <div className="flex items-center gap-2 min-w-0 truncate">
              <Search className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              <span className="truncate">{t.searchPlaceholder}</span>
            </div>
            <kbd className="px-1.5 py-0.5 rounded bg-[#161E30] text-[10px] font-mono text-neutral-400 border border-[#232D44] shrink-0 ml-2">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Currency ticker, Language Switcher, Actions & User */}
        <div className="flex items-center gap-2.5">
          
          {/* Language Selector Switcher (ES / PT) */}
          <LanguageSwitcher />

          {/* Moeda Oficial Guaraní (PYG) Pill */}
          <div
            className="hidden sm:flex px-2.5 py-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-xs text-amber-300 items-center gap-1.5 font-mono-nums"
            title="Moeda Oficial: Guaraní (₲ PYG)"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="font-bold text-[11px]">₲ PYG (Guaraní)</span>
          </div>

          {/* Live Sales Stream Continuous Button - hidden on small mobile, visible sm+ */}
          <button
            type="button"
            onClick={() => setIsStreamDrawerOpen(true)}
            className="hidden sm:flex px-2.5 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold transition-colors items-center gap-1.5 cursor-pointer"
            title={language === 'es' ? 'Flujo Continuo de Ventas en Vivo' : 'Fluxo Contínuo de Vendas ao Vivo'}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden xl:inline">{language === 'es' ? 'Flujo en Vivo' : 'Fluxo ao Vivo'}</span>
          </button>

          {/* Comandas & Setores em Tempo Real Button */}
          <button
            type="button"
            onClick={() => setIsComandasOpen(true)}
            className="flex px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-bold transition-all items-center gap-1.5 cursor-pointer"
            title="Comandas Confirmadas & Setores Responsáveis em Tempo Real"
          >
            <ClipboardList className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Comandas & Setores</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-neutral-950 text-[10px] font-extrabold">
              {openComandas.length}
            </span>
          </button>

          {/* Fornada Quente Action - hidden on mobile */}
          <button
            type="button"
            onClick={() => setIsFornadaOpen(true)}
            className="hidden sm:flex px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold transition-colors items-center gap-1.5"
            title="Registrar Fornada do Padeiro"
          >
            <Flame className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t.quickActionFornada}</span>
          </button>

          {/* Venda Direta Rápida - hidden on mobile (already main action in MobileBottomNav) */}
          <button
            type="button"
            onClick={() => setIsDirectSaleOpen(true)}
            className="hidden md:flex px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all items-center gap-1.5 cursor-pointer"
            title={t.directSaleSubtitle}
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>{t.quickActionDirectSale}</span>
          </button>

          {/* Nova Venda Action - hidden on mobile */}
          <button
            type="button"
            onClick={() => onSelectTab('pdv')}
            className="hidden sm:flex px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden md:inline">{t.quickActionNewSale}</span>
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
                          <span className="text-amber-400 font-mono-nums font-semibold">{formatCurrency(p.priceBrl, 'PYG')} / {p.unit}</span>
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
              <span>{t.appName}</span>
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

      {/* Real-Time Comandas & Setores Modal */}
      <ComandasModal
        isOpen={isComandasOpen}
        onClose={() => setIsComandasOpen(false)}
        onLoadComanda={() => {
          setIsComandasOpen(false);
          onSelectTab('pdv');
        }}
      />

      {/* Live Sales Stream Drawer Modal (Slide-over) */}
      {isStreamDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          <div 
            className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsStreamDrawerOpen(false)} 
          />
          <div className="relative w-full max-w-xl h-full shadow-2xl z-10 animate-in slide-in-from-right duration-300">
            <LiveSalesStream
              mode="drawer"
              onClose={() => setIsStreamDrawerOpen(false)}
              onNavigateToPdv={() => {
                setIsStreamDrawerOpen(false);
                onSelectTab('pdv');
              }}
            />
          </div>
        </div>
      )}

    </>
  );
};
