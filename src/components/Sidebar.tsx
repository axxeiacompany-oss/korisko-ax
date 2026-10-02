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
  Lock,
  Zap,
  ShieldCheck,
  Store,
  CreditCard,
  X
} from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import { AppFeature } from '../types';
import { KorizkoEmblem } from './KorizkoLogo';

interface Props {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onLogout: () => void;
  onOpenSwitchUser: () => void;
  onOpenProfile?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  onLogout,
  onOpenSwitchUser,
  onOpenProfile,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { 
    currentUser, 
    employees,
    currentSession, 
    openComandas, 
    fichasTecnicas, 
    customers, 
    products,
    liveRateStatus,
    isFeatureAllowed,
    t,
    language
  } = useBakery();

  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
  const customersWithDebt = customers.filter(c => c.outstandingBalanceBrl > 0).length;

  const navSections = [
    {
      group: t.navGroupMain,
      items: [
        {
          id: 'dashboard' as TabType,
          label: t.tabDashboard,
          icon: LayoutDashboard,
          badge: null,
        },
        {
          id: 'pdv' as TabType,
          label: t.tabPdv,
          icon: ShoppingBag,
          badge: openComandas.length > 0 ? `${openComandas.length} cmd` : null,
          badgeColor: 'bg-amber-500/20 text-amber-300',
        },
        {
          id: 'venda_direta' as TabType,
          label: t.tabDirectSale,
          icon: Zap,
          badge: language === 'es' ? '1-Clic' : '1-Clique',
          badgeColor: 'bg-emerald-500/20 text-emerald-300',
        },
        {
          id: 'loja' as TabType,
          label: 'Loja & Vitrine',
          icon: Store,
          badge: 'Boutique',
          badgeColor: 'bg-[#C89B6E]/20 text-[#F2D6B8]',
        },
      ]
    },
    {
      group: t.navGroupProduction,
      items: [
        {
          id: 'estoque' as TabType,
          label: t.tabInventory,
          icon: Boxes,
          badge: lowStockCount > 0 ? `${lowStockCount} ${language === 'es' ? 'alertas' : 'alertas'}` : null,
          badgeColor: 'bg-rose-500/20 text-rose-300',
        },
        {
          id: 'fichas_tecnicas' as TabType,
          label: t.tabRecipes,
          icon: ChefHat,
          badge: `${fichasTecnicas.length}`,
          badgeColor: 'bg-sky-500/20 text-sky-300',
        },
        {
          id: 'clientes' as TabType,
          label: language === 'es' ? 'Clientes' : 'Clientes',
          icon: Users,
          badge: `${customers.length}`,
          badgeColor: 'bg-indigo-500/20 text-indigo-300',
        },
        {
          id: 'crm' as TabType,
          label: language === 'es' ? 'CRM & Fiado' : 'CRM & Fiado',
          icon: CreditCard,
          badge: customersWithDebt > 0 ? `${customersWithDebt} ${language === 'es' ? 'a cobrar' : 'a receber'}` : null,
          badgeColor: 'bg-rose-500/20 text-rose-300',
        },
      ]
    },
    {
      group: t.navGroupFinancial,
      items: [
        {
          id: 'caixa' as TabType,
          label: t.tabCashRegister,
          icon: Vault,
          badge: currentSession.status === 'aberto' ? (language === 'es' ? 'Abierta' : 'Aberto') : (language === 'es' ? 'Cerrada' : 'Fechado'),
          badgeColor: currentSession.status === 'aberto' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-neutral-800 text-neutral-400',
        },
        {
          id: 'mais_vendidos' as TabType,
          label: t.tabTopProducts,
          icon: TrendingUp,
          badge: null,
        },
        {
          id: 'metas' as TabType,
          label: t.tabGoals,
          icon: Target,
          badge: null,
        },
        {
          id: 'backup' as TabType,
          label: t.tabBackup,
          icon: Cloud,
          badge: null,
        },
      ]
    },
    {
      group: t.navGroupAdmin,
      items: [
        {
          id: 'afiliados' as TabType,
          label: t.tabAffiliates,
          icon: ShieldCheck,
          badge: currentUser.role === 'admin' ? (language === 'es' ? 'Panel Ax' : 'Painel Ax') : null,
          badgeColor: 'bg-indigo-500/20 text-indigo-300',
        },
        {
          id: 'portal_afiliado' as TabType,
          label: 'Portal Afiliados',
          icon: Sparkles,
          badge: 'Comissões',
          badgeColor: 'bg-emerald-500/20 text-emerald-300',
        },
      ]
    }
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      <aside 
        className={`fixed top-0 bottom-0 left-0 z-50 bg-[#07090E] border-r border-[#C89B6E]/20 flex flex-col justify-between transition-transform lg:transition-all duration-300 select-none shadow-2xl lg:shadow-none ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'w-72 sm:w-64'}`}
      >
        
        {/* Top Header / Brand Identity */}
        <div className="p-4 border-b border-[#C89B6E]/15 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {/* Logo Mark */}
            <div className="w-9 h-9 rounded-full bg-[#07070A] border border-[#C89B6E]/40 flex items-center justify-center shadow-md shadow-black/60 shrink-0">
              <KorizkoEmblem size={28} />
            </div>

            <div className={`min-w-0 flex-1 ${isCollapsed ? 'lg:hidden' : 'block'}`}>
              <div className="flex items-center gap-1.5">
                <span
                  className="font-semibold text-sm text-[#F2D6B8] tracking-[0.16em] uppercase truncate"
                  style={{ fontFamily: "'Cinzel', serif" }}
                >
                  {t.appName}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              </div>
              {t.appSlogan ? (
                <p className="text-[10px] text-[#C89B6E] truncate">
                  {t.appSlogan}
                </p>
              ) : null}
            </div>
          </div>

          {/* Close button for Mobile */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-[#141B2B] transition-colors cursor-pointer"
            title="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Collapse toggle button for Desktop */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#141B2B] transition-colors"
            title={isCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Links Area */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navSections.map((section, idx) => {
            const visibleItems = section.items.filter(item => isFeatureAllowed(item.id as AppFeature));
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                <span className={`px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1 ${
                  isCollapsed ? 'lg:hidden' : 'block'
                }`}>
                  {section.group}
                </span>
                
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onSelectTab(item.id);
                          onCloseMobile?.();
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative cursor-pointer ${
                          isActive
                            ? 'bg-gradient-to-r from-[#C89B6E]/20 to-[#8A623E]/10 text-[#F2D6B8] font-semibold border border-[#C89B6E]/40 shadow-sm'
                            : 'text-neutral-400 hover:text-white hover:bg-[#101520]'
                        } ${isCollapsed ? 'lg:justify-center justify-between' : 'justify-between'}`}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive ? 'text-[#C89B6E]' : 'text-neutral-400 group-hover:text-neutral-200'
                          }`} />
                          <span className={`truncate ${isCollapsed ? 'lg:hidden' : 'inline'}`}>
                            {item.label}
                          </span>
                        </div>

                        {item.badge && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono-nums font-medium ${
                            isCollapsed ? 'lg:hidden' : 'inline'
                          } ${item.badgeColor || 'bg-neutral-800 text-neutral-400'}`}>
                            {item.badge}
                          </span>
                        )}

                        {/* Active vertical pill indicator */}
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r bg-[#C89B6E]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Profile / Quick Action Card */}
        <div className="p-3 border-t border-[#182030] bg-[#0A0E18] space-y-2">
          
          {/* User Card with Online Indicator and Profile Trigger */}
          <div 
            onClick={() => {
              if (onOpenProfile) onOpenProfile();
              else onOpenSwitchUser();
              onCloseMobile?.();
            }}
            className={`p-2.5 rounded-xl bg-[#0F1422] border border-[#1E273A] hover:border-indigo-500/50 cursor-pointer transition-all flex items-center gap-2.5 group ${
              isCollapsed ? 'lg:justify-center' : ''
            }`}
            title={`${t.myProfile} & ${t.myPassword}`}
          >
            <div className="relative">
              <div className={`w-8 h-8 rounded-lg ${currentUser.avatarColor} text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-md`}>
                {currentUser.name.charAt(0)}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0A0E18] animate-pulse" />
            </div>
            
            <div className={`min-w-0 flex-1 ${isCollapsed ? 'lg:hidden' : 'block'}`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#F2D6B8] truncate leading-tight group-hover:text-white transition-colors">
                  {currentUser.name}
                </p>
              </div>
              <p className="text-[10px] text-neutral-400 flex items-center justify-between mt-0.5">
                <span className="capitalize">{currentUser.role === 'admin' ? 'Admin Master' : currentUser.role}</span>
                <span className="text-[#C89B6E] group-hover:underline text-[9px] font-semibold">{t.myPassword}</span>
              </p>
            </div>
          </div>

          {/* Action Row: Alternar Usuário & Bloquear Tela */}
          {employees.length > 1 ? (
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onOpenSwitchUser();
                  onCloseMobile?.();
                }}
                className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-medium text-neutral-400 hover:text-white hover:bg-[#141B2B] transition-colors border border-transparent hover:border-[#1E273A] cursor-pointer ${
                  isCollapsed ? 'lg:col-span-2' : ''
                }`}
                title={language === 'es' ? 'Cambiar Operador' : 'Alternar Operador'}
              >
                <UserCheck className="w-3.5 h-3.5 shrink-0" />
                <span className={isCollapsed ? 'lg:hidden' : 'inline'}>{t.switchOperator}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onCloseMobile?.();
                }}
                className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-medium text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors border border-transparent hover:border-rose-500/20 cursor-pointer ${
                  isCollapsed ? 'lg:col-span-2' : ''
                }`}
                title={language === 'es' ? 'Bloquear Pantalla / Volver al Login' : 'Bloquear Tela / Voltar para Login'}
              >
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span className={isCollapsed ? 'lg:hidden' : 'inline'}>{t.logout}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                onLogout();
                onCloseMobile?.();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white bg-[#0F1422] hover:bg-rose-950/30 border border-[#1E273A] hover:border-rose-500/30 transition-all cursor-pointer"
              title={language === 'es' ? 'Bloquear Pantalla / Salir' : 'Bloquear Sessão / Sair'}
            >
              <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className={isCollapsed ? 'lg:hidden' : 'inline'}>
                {language === 'es' ? 'Cerrar Sesión Segura' : 'Sair / Bloquear Sessão'}
              </span>
            </button>
          )}

        </div>

      </aside>
    </>
  );
};
