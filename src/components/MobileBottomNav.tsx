import React from 'react';
import { useBakery } from '../context/BakeryContext';
import { TabType } from './Header';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Zap, 
  Users, 
  Menu,
  Vault,
  ShieldCheck,
  Store
} from 'lucide-react';

interface Props {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenMobileMenu: () => void;
}

export const MobileBottomNav: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  onOpenMobileMenu,
}) => {
  const { 
    currentUser, 
    openComandas, 
    customers, 
    isFeatureAllowed,
    language 
  } = useBakery();

  const isAx = currentUser.id === 'emp-admin-ax' || currentUser.email === 'axxeiacompany@gmail.com';
  const customersWithDebt = customers.filter(c => c.outstandingBalanceBrl > 0).length;

  return (
    <nav 
      aria-label="Navegação Rápida Mobile"
      className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-[#07090E]/95 backdrop-blur-xl border-t border-[#C89B6E]/25 px-2 pt-1 safe-area-pb shadow-2xl select-none"
    >
      <div className="grid grid-cols-5 items-center justify-around max-w-md mx-auto h-14">
        
        {/* 1. Dashboard */}
        {isFeatureAllowed('dashboard') ? (
          <button
            type="button"
            onClick={() => onSelectTab('dashboard')}
            className={`flex flex-col items-center justify-center h-full rounded-xl transition-all cursor-pointer active:scale-95 ${
              activeTab === 'dashboard'
                ? 'text-[#F2D6B8] font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-colors ${
              activeTab === 'dashboard' ? 'bg-[#C89B6E]/20 text-[#C89B6E]' : ''
            }`}>
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight truncate">
              {language === 'es' ? 'Panel' : 'Painel'}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSelectTab('caixa')}
            className={`flex flex-col items-center justify-center h-full rounded-xl transition-all cursor-pointer active:scale-95 ${
              activeTab === 'caixa'
                ? 'text-indigo-400 font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-colors ${
              activeTab === 'caixa' ? 'bg-indigo-500/20 text-indigo-400' : ''
            }`}>
              <Vault className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight truncate">
              {language === 'es' ? 'Caja' : 'Caixa'}
            </span>
          </button>
        )}

        {/* 2. PDV */}
        {isFeatureAllowed('pdv') ? (
          <button
            type="button"
            onClick={() => onSelectTab('pdv')}
            className={`flex flex-col items-center justify-center h-full rounded-xl transition-all relative cursor-pointer active:scale-95 ${
              activeTab === 'pdv'
                ? 'text-amber-400 font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-colors relative ${
              activeTab === 'pdv' ? 'bg-amber-500/20 text-amber-400' : ''
            }`}>
              <ShoppingBag className="w-5 h-5" />
              {openComandas.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-neutral-950 text-[10px] font-black flex items-center justify-center font-mono ring-2 ring-[#0A0D15]">
                  {openComandas.length}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight truncate">
              PDV
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSelectTab('dashboard')}
            className="flex flex-col items-center justify-center h-full text-neutral-500"
          >
            <ShoppingBag className="w-5 h-5 opacity-40" />
            <span className="text-[10px] mt-0.5">PDV</span>
          </button>
        )}

        {/* 3. Central Standout Action: Venda 1-Clique */}
        <div className="flex justify-center -mt-5">
          <button
            type="button"
            onClick={() => onSelectTab('venda_direta')}
            className={`w-13 h-13 rounded-2xl flex flex-col items-center justify-center shadow-xl transition-all active:scale-90 cursor-pointer ${
              activeTab === 'venda_direta'
                ? 'bg-gradient-to-tr from-emerald-500 via-emerald-600 to-teal-400 text-white shadow-emerald-500/50 ring-4 ring-emerald-500/30'
                : 'bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-500 text-white shadow-emerald-950/70 hover:scale-105'
            }`}
            title="Lançar Venda Rápida (1-Clique)"
          >
            <Zap className="w-5 h-5 fill-current" />
            <span className="text-[8px] font-black tracking-tight uppercase leading-none mt-0.5">
              1-Clique
            </span>
          </button>
        </div>

        {/* 4. Loja / Equipe / Clientes */}
        {isFeatureAllowed('loja') ? (
          <button
            type="button"
            onClick={() => onSelectTab('loja')}
            className={`flex flex-col items-center justify-center h-full rounded-xl transition-all cursor-pointer active:scale-95 ${
              activeTab === 'loja'
                ? 'text-[#F2D6B8] font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-colors ${
              activeTab === 'loja' ? 'bg-[#C89B6E]/20 text-[#C89B6E]' : ''
            }`}>
              <Store className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight truncate">
              Loja
            </span>
          </button>
        ) : isAx ? (
          <button
            type="button"
            onClick={() => onSelectTab('afiliados')}
            className={`flex flex-col items-center justify-center h-full rounded-xl transition-all cursor-pointer active:scale-95 ${
              activeTab === 'afiliados'
                ? 'text-[#F2D6B8] font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-colors ${
              activeTab === 'afiliados' ? 'bg-[#C89B6E]/20 text-[#C89B6E]' : ''
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight truncate">
              {language === 'es' ? 'Equipo' : 'Equipe'}
            </span>
          </button>
        ) : isFeatureAllowed('crm') ? (
          <button
            type="button"
            onClick={() => onSelectTab('crm')}
            className={`flex flex-col items-center justify-center h-full rounded-xl transition-all relative cursor-pointer active:scale-95 ${
              activeTab === 'crm'
                ? 'text-sky-400 font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-colors relative ${
              activeTab === 'crm' ? 'bg-sky-500/20 text-sky-400' : ''
            }`}>
              <Users className="w-5 h-5" />
              {customersWithDebt > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-[#0A0D15]" />
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight truncate">
              {language === 'es' ? 'Clientes' : 'Clientes'}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSelectTab('caixa')}
            className={`flex flex-col items-center justify-center h-full rounded-xl transition-all cursor-pointer active:scale-95 ${
              activeTab === 'caixa'
                ? 'text-amber-400 font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-colors ${
              activeTab === 'caixa' ? 'bg-amber-500/20 text-amber-400' : ''
            }`}>
              <Vault className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight truncate">
              {language === 'es' ? 'Caja' : 'Caixa'}
            </span>
          </button>
        )}

        {/* 5. Menu Completo (Abre Gaveta Mobile) */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="flex flex-col items-center justify-center h-full rounded-xl text-neutral-400 hover:text-neutral-200 transition-all cursor-pointer active:scale-95"
          title="Abrir todos os módulos"
        >
          <div className="p-1.5 rounded-xl hover:bg-neutral-800 transition-colors">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">
            Menu
          </span>
        </button>

      </div>
    </nav>
  );
};
