import React, { useState } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { 
  User, 
  Mail, 
  Lock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Check, 
  Copy, 
  ShieldCheck, 
  X, 
  Sparkles,
  Layers,
  ShoppingBag,
  Zap,
  Boxes,
  ChefHat,
  Vault,
  TrendingUp,
  Target,
  Coins,
  Cloud,
  Users
} from 'lucide-react';
import { AppFeature } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const FEATURE_INFO: Record<AppFeature, { label: string; icon: any; color: string }> = {
  dashboard: { label: 'Dashboard Geral', icon: Layers, color: 'text-indigo-400 bg-indigo-500/10' },
  pdv: { label: 'PDV & Caixa Balcão', icon: ShoppingBag, color: 'text-amber-400 bg-amber-500/10' },
  venda_direta: { label: 'Venda Direta Expressa', icon: Zap, color: 'text-emerald-400 bg-emerald-500/10' },
  crm: { label: 'CRM & Fiado (Clientes)', icon: Users, color: 'text-sky-400 bg-sky-500/10' },
  estoque: { label: 'Controle de Estoque', icon: Boxes, color: 'text-rose-400 bg-rose-500/10' },
  fichas_tecnicas: { label: 'Fichas Técnicas & Receitas', icon: ChefHat, color: 'text-orange-400 bg-orange-500/10' },
  caixa: { label: 'Fechamento de Caixa', icon: Vault, color: 'text-yellow-400 bg-yellow-500/10' },
  mais_vendidos: { label: 'Ranking & Curva ABC', icon: TrendingUp, color: 'text-cyan-400 bg-cyan-500/10' },
  metas: { label: 'Metas do Mês', icon: Target, color: 'text-purple-400 bg-purple-500/10' },
  cambio: { label: 'Cotação & Multi-Moedas', icon: Coins, color: 'text-teal-400 bg-teal-500/10' },
  backup: { label: 'Backup & Nuvem', icon: Cloud, color: 'text-blue-400 bg-blue-500/10' },
  afiliados: { label: 'Gestão de Afiliados (Admin)', icon: ShieldCheck, color: 'text-indigo-400 bg-indigo-500/10' },
};

export const UserProfileModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { currentUser, updateEmployee, updateEmployeePin } = useBakery();

  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [copied, setCopied] = useState(false);

  // Self edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(currentUser.name);
  const [editPassword, setEditPassword] = useState(currentUser.password || currentUser.pin || '');
  const [editPin, setEditPin] = useState(currentUser.pin || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const isAx = currentUser.id === 'emp-admin-ax' || currentUser.email === 'axxeiacompany@gmail.com';
  const myPassword = currentUser.password || currentUser.pin || '••••••••';
  const myPin = currentUser.pin || '••••';

  const handleCopyCredentials = () => {
    const text = `Meu Perfil Korisko:\nNome: ${currentUser.name}\nGmail: ${currentUser.email || 'Não informado'}\nSenha: ${currentUser.password || currentUser.pin}\nPIN: ${currentUser.pin}\nCargo: ${currentUser.role}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    updateEmployee({
      ...currentUser,
      name: editName.trim(),
      password: editPassword.trim() || currentUser.password,
      pin: editPin.trim() || currentUser.pin,
    });

    if (editPin.trim()) {
      updateEmployeePin(currentUser.id, editPin.trim());
    }

    setSaveSuccess(true);
    setIsEditing(false);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#0C101A] border border-[#1E273A] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-[#1A2234] bg-[#0F1424] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl ${currentUser.avatarColor || 'bg-indigo-600'} text-white flex items-center justify-center font-bold text-base shadow-lg`}>
              {currentUser.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">{currentUser.name}</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE
                </span>
              </div>
              <p className="text-xs text-neutral-400 flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3 h-3 text-neutral-500" />
                <span>{currentUser.email || 'Usuário Local'}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-[#1A2338] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          
          {saveSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Seus dados foram atualizados com sucesso!</span>
            </div>
          )}

          {/* Role & Admin Info Banner */}
          <div className="p-4 rounded-2xl bg-[#090D15] border border-[#192234] flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider block">
                Tipo de Acesso
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-bold text-white capitalize">
                  {currentUser.role === 'admin' ? 'Administrador Geral' : currentUser.role}
                </span>
                {isAx && (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                    Admin Ax
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyCredentials}
              className="px-3 py-1.5 rounded-xl border border-[#222E46] bg-[#121828] hover:bg-[#1A2338] text-neutral-300 hover:text-white text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar Credenciais'}</span>
            </button>
          </div>

          {/* Individual Credentials Card (Visible when online in your own profile) */}
          <div className="p-4 rounded-2xl bg-[#090D15] border border-[#1E283D] space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Minhas Credenciais Individuais</span>
              </h3>
              <span className="text-[10px] text-neutral-400">
                Apenas você tem acesso a esta visualização
              </span>
            </div>

            {/* Individual Password */}
            <div className="p-3 rounded-xl bg-[#0E1422] border border-[#1B2436] flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider block">
                  Sua Senha de Acesso
                </span>
                <span className="text-sm font-mono font-bold text-white tracking-wider">
                  {showPassword ? myPassword : '••••••••••••'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="px-3 py-1.5 rounded-lg bg-[#141B2B] hover:bg-[#1C263C] text-neutral-300 hover:text-white border border-[#222E46] text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassword ? 'Ocultar' : 'Ver Senha'}</span>
              </button>
            </div>

            {/* Individual PIN */}
            <div className="p-3 rounded-xl bg-[#0E1422] border border-[#1B2436] flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider block">
                  Seu PIN Rápido
                </span>
                <span className="text-sm font-mono font-bold text-amber-400 tracking-widest">
                  {showPin ? myPin : '••••'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="px-3 py-1.5 rounded-lg bg-[#141B2B] hover:bg-[#1C263C] text-neutral-300 hover:text-white border border-[#222E46] text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPin ? 'Ocultar' : 'Ver PIN'}</span>
              </button>
            </div>

            {/* Edit Credentials Trigger */}
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer pt-1 block"
              >
                Alterar minha senha ou PIN pessoal
              </button>
            ) : (
              <form onSubmit={handleSaveProfile} className="pt-2 border-t border-[#1C2538] space-y-3">
                <div className="text-xs font-bold text-neutral-300">
                  Editar minhas credenciais
                </div>
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">Nome de Exibição</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0A0E18] border border-[#1F273A] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Nova Senha</label>
                    <input
                      type="text"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Nova senha"
                      className="w-full px-3 py-2 bg-[#0A0E18] border border-[#1F273A] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Novo PIN (4-6 dígitos)</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={editPin}
                      onChange={(e) => setEditPin(e.target.value)}
                      placeholder="Novo PIN"
                      className="w-full px-3 py-2 bg-[#0A0E18] border border-[#1F273A] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 rounded-lg border border-[#1E273A] text-xs text-neutral-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Functions granted to this user by Admin Ax */}
          <div className="p-4 rounded-2xl bg-[#090D15] border border-[#1E283D] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Suas Funções Liberadas pelo Admin Ax</span>
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {isAx 
                    ? 'Você possui acesso total como Administrador Geral do Korisko.' 
                    : 'Módulos liberados individualmente para a sua conta pelo Administrador Ax:'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {Object.entries(FEATURE_INFO).map(([key, info]) => {
                const featKey = key as AppFeature;
                const isAllowed = isAx || (currentUser.allowedFeatures ? currentUser.allowedFeatures.includes(featKey) : true);
                if (featKey === 'afiliados' && !isAx) return null;

                const Icon = info.icon;

                return (
                  <div
                    key={featKey}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                      isAllowed 
                        ? 'border-emerald-500/30 bg-emerald-500/5 text-neutral-200' 
                        : 'border-[#1A2234] bg-[#070A10] text-neutral-500 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-1.5 rounded-lg ${info.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate font-medium">{info.label}</span>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      isAllowed 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-neutral-800 text-neutral-500'
                    }`}>
                      {isAllowed ? 'Liberado' : 'Bloqueado'}
                    </span>
                  </div>
                );
              })}
            </div>

            {!isAx && (
              <p className="text-[11px] text-neutral-500 pt-1">
                🔒 Para solicitar novas funções ou módulos, entre em contato diretamente com o <b>Administrador Geral Ax (axxeiacompany@gmail.com)</b>.
              </p>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1A2234] bg-[#0A0E18] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            Fechar Perfil
          </button>
        </div>

      </div>
    </div>
  );
};
