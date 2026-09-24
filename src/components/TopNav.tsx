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
  X
} from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import { ExchangeRatesModal } from './modals/ExchangeRatesModal';
import { SwitchEmployeeModal } from './modals/SwitchEmployeeModal';
import { FornadaModal } from './modals/FornadaModal';

interface Props {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onLogout: () => void;
  isSidebarCollapsed: boolean;
}

export const TopNav: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  onLogout,
  isSidebarCollapsed,
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
    fetchLiveRates
  } = useBakery();

  const [isRatesOpen, setIsRatesOpen] = useState(false);
  const [isSwitchUserOpen, setIsSwitchUserOpen] = useState(false);
  const [isFornadaOpen, setIsFornadaOpen] = useState(false);
  
  // Quick Search Modal state (Command + K)
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Tab Titles map
  const tabTitles: Record<TabType, { title: string; subtitle: string }> = {
    dashboard: { title: 'Painel Geral & Métricas', subtitle: 'Visão consolidada em tempo real da padaria' },
    pdv: { title: 'Ponto de Venda (PDV)', subtitle: 'Frente de caixa, pesagem e recebimento multi-moeda' },
    estoque: { title: 'Controle de Estoque', subtitle: 'Insumos, produtos acabados e alertas de validade' },
    fichas_tecnicas: { title: 'Fichas Técnicas & Custos', subtitle: 'Receituário mestre, margens e ordens de fornada' },
    crm: { title: 'CRM & Gestão de Clientes', subtitle: 'Caderneta de fiado, limites de crédito e fidelidade' },
    caixa: { title: 'Fechamento de Caixa Cego', subtitle: 'Conferência de sangrias, suprimentos e trocos' },
    mais_vendidos: { title: 'Curva ABC & Produtos', subtitle: 'Ranking de giro diário e mensal' },
    metas: { title: 'Metas & Performance', subtitle: 'Acompanhamento do objetivo financeiro do mês' },
    cambio: { title: 'Cotação & Multi-Moedas', subtitle: 'Flutuação cambial em tempo real (Real, Guaraní, Dólar)' },
    backup: { title: 'Nuvem & Segurança', subtitle: 'Pontos de restauração e cópia local' },
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
              <span>Buscar produto, cliente ou comanda...</span>
            </div>
            <kbd className="px-1.5 py-0.5 rounded bg-[#161E30] text-[10px] font-mono text-neutral-400 border border-[#232D44]">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Currency ticker, Actions & User */}
        <div className="flex items-center gap-2.5">
          
          {/* Real-time Exchange Rates Ticker Pill */}
          <button
            type="button"
            onClick={() => setIsRatesOpen(true)}
            className="px-2.5 py-1.5 rounded-xl border border-[#1E273A] bg-[#0E1422] hover:bg-[#151D30] text-xs text-neutral-300 transition-colors flex items-center gap-2 font-mono-nums"
            title="Cotações em tempo real: BRL, PYG, USD"
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
            <span className="hidden sm:inline">Fornada</span>
          </button>

          {/* Nova Venda Action */}
          <button
            type="button"
            onClick={() => onSelectTab('pdv')}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Nova Venda</span>
          </button>

          {/* Quick Lock / UTMify Login Toggle */}
          <button
            type="button"
            onClick={onLogout}
            className="p-2 rounded-xl border border-[#1E273A] bg-[#0E1422] hover:bg-[#182032] text-neutral-400 hover:text-white transition-colors"
            title="Visualizar Tela de Login (UTMify)"
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
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2">Produtos</span>
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
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2">Clientes</span>
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
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2">Comandas Salão</span>
                      {searchResults.comandas.map(cmd => (
                        <div 
                          key={cmd.id}
                          onClick={() => { onSelectTab('pdv'); setIsSearchOpen(false); }}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-[#141B2B] cursor-pointer text-xs"
                        >
                          <span className="text-neutral-200 font-medium">Comanda #{cmd.number} {cmd.customerName ? `(${cmd.customerName})` : ''}</span>
                          <span className="text-emerald-400 font-mono-nums">{cmd.items.length} itens</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.products.length === 0 && searchResults.customers.length === 0 && searchResults.comandas.length === 0 && (
                    <p className="text-xs text-neutral-500 text-center py-6">Nenhum resultado encontrado para "{searchQuery}".</p>
                  )}
                </>
              ) : (
                <div className="text-center py-6 space-y-1">
                  <p className="text-xs text-neutral-400 font-medium">Atalhos de busca rápida no Korisko</p>
                  <p className="text-[11px] text-neutral-500">Digite o nome de qualquer pão, doce, cliente ou número de comanda.</p>
                </div>
              )}
            </div>

            <div className="p-2.5 border-t border-[#1A2234] bg-[#0A0D15] flex items-center justify-between text-[11px] text-neutral-500">
              <span>Pressione <kbd className="px-1 rounded bg-[#161E30] text-neutral-300">ESC</kbd> para fechar</span>
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

    </>
  );
};
