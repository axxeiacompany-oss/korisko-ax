import React, { useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { TabType } from './Header';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Boxes, 
  ChefHat, 
  Users, 
  Vault, 
  TrendingUp, 
  Target, 
  Coins, 
  Cloud, 
  UtensilsCrossed,
  Flame,
  ChevronLeft,
  ChevronRight,
  LogOut,
  UserCheck,
  Shield,
  Layers,
  Sparkles,
  Command,
  HelpCircle,
  ExternalLink,
  Lock
} from 'lucide-react';
import { formatCurrency } from '../utils/currency';

interface Props {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onLogout: () => void;
  onOpenSwitchUser: () => void;
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  onLogout,
  onOpenSwitchUser,
}) => {
  const { 
    currentUser, 
    currentSession, 
    openComandas, 
    fichasTecnicas, 
    customers, 
    products,
    liveRateStatus
  } = useBakery();

  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
  const customersWithDebt = customers.filter(c => c.outstandingBalanceBrl > 0).length;

  const navSections = [
    {
      group: 'Principal',
      items: [
        {
          id: 'dashboard' as TabType,
          label: 'Dashboard',
          icon: LayoutDashboard,
          badge: null,
        },
        {
          id: 'pdv' as TabType,
          label: 'PDV & Caixa',
          icon: ShoppingBag,
          badge: openComandas.length > 0 ? `${openComandas.length} cmd` : null,
          badgeColor: 'bg-amber-500/20 text-amber-300',
        },
      ]
    },
    {
      group: 'Produção & Estoque',
      items: [
        {
          id: 'estoque' as TabType,
          label: 'Estoque & Insumos',
          icon: Boxes,
          badge: lowStockCount > 0 ? `${lowStockCount} alertas` : null,
          badgeColor: 'bg-rose-500/20 text-rose-300',
        },
        {
          id: 'fichas_tecnicas' as TabType,
          label: 'Fichas Técnicas',
          icon: ChefHat,
          badge: `${fichasTecnicas.length}`,
          badgeColor: 'bg-sky-500/20 text-sky-300',
        },
        {
          id: 'crm' as TabType,
          label: 'CRM & Fiado',
          icon: Users,
          badge: customersWithDebt > 0 ? `${customersWithDebt} a receber` : null,
          badgeColor: 'bg-amber-500/20 text-amber-300',
        },
      ]
    },
    {
      group: 'Gestão Financeira',
      items: [
        {
          id: 'caixa' as TabType,
          label: 'Fechamento Caixa',
          icon: Vault,
          badge: currentSession.status === 'aberto' ? 'Aberto' : 'Fechado',
          badgeColor: currentSession.status === 'aberto' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-neutral-800 text-neutral-400',
        },
        {
          id: 'mais_vendidos' as TabType,
          label: 'Mais Vendidos',
          icon: TrendingUp,
          badge: null,
        },
        {
          id: 'metas' as TabType,
          label: 'Metas do Mês',
          icon: Target,
          badge: null,
        },
        {
          id: 'cambio' as TabType,
          label: 'Multi-Moedas & Câmbio',
          icon: Coins,
          badge: 'BRL/PYG/USD',
          badgeColor: 'bg-indigo-500/20 text-indigo-300',
        },
        {
          id: 'backup' as TabType,
          label: 'Backup & Nuvem',
          icon: Cloud,
          badge: null,
        },
      ]
    },
  ];

  return (
    <aside 
      className={`fixed top-0 bottom-0 left-0 z-40 bg-[#090D15] border-r border-[#1B2335] flex flex-col justify-between transition-all duration-300 select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      
      {/* Top Header / Workspace Selector in UTMify Style */}
      <div className="p-4 border-b border-[#182030] flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo Mark */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-violet-500 to-amber-500 p-[1.5px] shadow-md shadow-indigo-500/20 shrink-0">
            <div className="w-full h-full bg-[#0B0F17] rounded-[10px] flex items-center justify-center font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-amber-300 text-sm">
              K
            </div>
          </div>

          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-white tracking-tight truncate">
                  Korisko
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              </div>
              <p className="text-[10px] text-neutral-400 truncate">
                Padaria & Confeitaria
              </p>
            </div>
          )}
        </div>

        {/* Collapse toggle button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#141B2B] transition-colors"
          title={isCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links Area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {!isCollapsed && (
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                {section.group}
              </span>
            )}
            
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group relative ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600/20 to-violet-600/10 text-white font-semibold border border-indigo-500/30 shadow-sm'
                        : 'text-neutral-400 hover:text-white hover:bg-[#121826]'
                    } ${isCollapsed ? 'justify-center' : 'justify-between'}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-indigo-400' : 'text-neutral-400 group-hover:text-neutral-200'
                      }`} />
                      {!isCollapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </div>

                    {!isCollapsed && item.badge && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono-nums font-medium ${item.badgeColor || 'bg-neutral-800 text-neutral-400'}`}>
                        {item.badge}
                      </span>
                    )}

                    {/* Active vertical pill indicator */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r bg-indigo-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Profile / Quick Action Card */}
      <div className="p-3 border-t border-[#182030] bg-[#0A0E18] space-y-2">
        
        {/* User Card */}
        <div 
          onClick={onOpenSwitchUser}
          className={`p-2 rounded-xl bg-[#0F1422] border border-[#1E273A] hover:border-indigo-500/50 cursor-pointer transition-all flex items-center gap-2.5 ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title="Clique para alternar operador/PIN"
        >
          <div className={`w-7 h-7 rounded-lg ${currentUser.avatarColor} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
            {currentUser.name.charAt(0)}
          </div>
          
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate leading-tight">
                {currentUser.name}
              </p>
              <p className="text-[10px] text-neutral-400 capitalize">
                {currentUser.role}
              </p>
            </div>
          )}
        </div>

        {/* Lock Screen / Logout Button returning to UTMify Login */}
        <button
          type="button"
          onClick={onLogout}
          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title="Bloquear Tela / Voltar para Login"
        >
          <Lock className="w-3.5 h-3.5 shrink-0" />
          {!isCollapsed && <span>Bloquear / Sair</span>}
        </button>

      </div>

    </aside>
  );
};
