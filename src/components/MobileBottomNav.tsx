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
  ShieldCheck
} from 'lucide-react';
import { AppFeature } from '../types';

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
    t, 
    language 
  } = useBakery();

  const isAx = currentUser.id === 'emp-admin-ax' || currentUser.email === 'axxeiacompany@gmail.com';
  const customersWithDebt = customers.filter(c => c.outstandingBalanceBrl > 0).length;

  return (
    <nav 
      aria-label="Navegação Rápida Mobile"
      className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-[#090D16]/95 backdrop-blur-xl border-t border-[#1C2538] px-2 py-1.5 safe-area-pb shadow-2xl select-none"
    >
      <div className="grid grid-cols-5 items-center justify-around max-w-lg mx-auto">
        
        {/* 1. Dashboard */}
        {isFeatureAllowed('dashboard') ? (
          <button
            type="button"
            onClick={() => onSelectTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'text-indigo-400 font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <div className={`p-1 rounded-lg transition-colors ${
              activeTab === 'dashboard' ? 'bg-indigo-500/20' : ''
            }`}>
              <LayoutDashboard className="w-4 h-4" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-full">
              {language === 'es' ? 'Panel' : 'Painel'}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSelectTab('caixa')}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'caixa'
                ? 'text-indigo-400 font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Vault className="w-4 h-4" />
            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-full">
              {language === 'es' ? 'Caja' : 'Caixa'}
            </span>
          </button>
        )}

        {/* 2. PDV */}
        {isFeatureAllowed('pdv') ? (
          <button
            type="button"
            onClick={() => onSelectTab('pdv')}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative cursor-pointer ${
              activeTab === 'pdv'
                ? 'text-amber-400 font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <div className={`p-1 rounded-lg transition-colors relative ${
              activeTab === 'pdv' ? 'bg-amber-500/20' : ''
            }`}>
              <ShoppingBag className="w-4 h-4" />
              {openComandas.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-neutral-950 text-[9px] font-bold flex items-center justify-center font-mono">
                  {openComandas.length}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-full">
              PDV
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSelectTab('dashboard')}
            className="flex flex-col items-center justify-center py-1 px-1 text-neutral-500"
          >
            <ShoppingBag className="w-4 h-4 opacity-40" />
            <span className="text-[10px] mt-0.5">PDV</span>
          </button>
        )}

        {/* 3. Central Standout Action: Venda 1-Clique (Venda Rápida) */}
        <div className="flex justify-center -mt-4">
          <button
            type="button"
            onClick={() => onSelectTab('venda_direta')}
            className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer ${
              activeTab === 'venda_direta'
                ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-emerald-500/40 ring-2 ring-emerald-400/50'
                : 'bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-500 text-white shadow-emerald-950/60 hover:brightness-110'
            }`}
            title="Lançar Venda Rápida (1-Clique)"
          >
            <Zap className="w-5 h-5 fill-current" />
            <span className="text-[8px] font-black tracking-tight uppercase leading-none mt-0.5">
              1-Clique
            </span>
          </button>
        </div>

        {/* 4. CRM / Clientes (or Afiliados if Admin) */}
        {isAx ? (
          <button
            type="button"
            onClick={() => onSelectTab('afiliados')}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'afiliados'
                ? 'text-indigo-400 font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <div className={`p-1 rounded-lg transition-colors ${
              activeTab === 'afiliados' ? 'bg-indigo-500/20' : ''
            }`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-full">
              {language === 'es' ? 'Afiliados' : 'Afiliados'}
            </span>
          </button>
        ) : isFeatureAllowed('crm') ? (
          <button
            type="button"
            onClick={() => onSelectTab('crm')}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative cursor-pointer ${
              activeTab === 'crm'
                ? 'text-sky-400 font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <div className={`p-1 rounded-lg transition-colors relative ${
              activeTab === 'crm' ? 'bg-sky-500/20' : ''
            }`}>
              <Users className="w-4 h-4" />
              {customersWithDebt > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-full">
              {language === 'es' ? 'Clientes' : 'Clientes'}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSelectTab('caixa')}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'caixa'
                ? 'text-yellow-400 font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Vault className="w-4 h-4" />
            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-full">
              {language === 'es' ? 'Caja' : 'Caixa'}
            </span>
          </button>
        )}

        {/* 5. Menu Completo (Abre Gaveta Mobile) */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="flex flex-col items-center justify-center py-1 px-1 rounded-xl text-neutral-400 hover:text-neutral-200 transition-all cursor-pointer active:scale-95"
          title="Abrir todos os módulos"
        >
          <div className="p-1 rounded-lg hover:bg-neutral-800 transition-colors">
            <Menu className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">
            Menu
          </span>
        </button>

      </div>
    </nav>
  );
};
