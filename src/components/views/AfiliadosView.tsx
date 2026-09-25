import React, { useState } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { 
  Users, 
  UserPlus, 
  Shield, 
  ShieldCheck, 
  ShieldAlert,
  KeyRound, 
  Mail, 
  Check, 
  X, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  Copy, 
  Trash2, 
  Edit2, 
  Sparkles, 
  Layers, 
  ShoppingBag, 
  Boxes, 
  ChefHat, 
  Vault, 
  TrendingUp, 
  Target, 
  Coins, 
  Cloud, 
  Zap, 
  Eye, 
  EyeOff,
  UserCheck
} from 'lucide-react';
import { AppFeature, Employee, UserRole } from '../../types';

interface Props {
  onNavigate?: (tab: any) => void;
}

const AVAILABLE_FEATURES: Array<{
  id: AppFeature;
  label: string;
  category: string;
  description: string;
  icon: any;
  color: string;
}> = [
  {
    id: 'dashboard',
    label: 'Dashboard Geral',
    category: 'Visão Geral',
    description: 'Acesso aos gráficos de faturamento, tickets e alertas operacionais',
    icon: Layers,
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  },
  {
    id: 'pdv',
    label: 'PDV & Caixa Balcão',
    category: 'Vendas',
    description: 'Abertura de vendas com catálogo de produtos e pesagem',
    icon: ShoppingBag,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  {
    id: 'venda_direta',
    label: 'Venda Direta Rápida',
    category: 'Vendas',
    description: 'Lançar venda instantânea digitando apenas o valor e confirmando',
    icon: Zap,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    id: 'crm',
    label: 'CRM & Fiado (Clientes)',
    category: 'Vendas & Crédito',
    description: 'Controle de caderneta de clientes, limite de crédito e fidelidade',
    icon: Users,
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  },
  {
    id: 'estoque',
    label: 'Controle de Estoque',
    category: 'Operação',
    description: 'Entradas, saídas de insumos, perdas e alertas de validade',
    icon: Boxes,
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  },
  {
    id: 'fichas_tecnicas',
    label: 'Fichas Técnicas & Receitas',
    category: 'Produção',
    description: 'Engenharia de custos por receita e disparo de fornadas',
    icon: ChefHat,
    color: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  },
  {
    id: 'caixa',
    label: 'Fechamento de Caixa',
    category: 'Financeiro',
    description: 'Conferência cega de caixa, sangrias e suprimentos',
    icon: Vault,
    color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  },
  {
    id: 'mais_vendidos',
    label: 'Ranking & Curva ABC',
    category: 'Relatórios',
    description: 'Histórico de produtos com maior giro no período',
    icon: TrendingUp,
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  },
  {
    id: 'metas',
    label: 'Metas do Mês',
    category: 'Gestão',
    description: 'Acompanhamento do alvo de vendas estipulado',
    icon: Target,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  },
  {
    id: 'cambio',
    label: 'Cotação & Multi-Moedas',
    category: 'Financeiro',
    description: 'Cotações ao vivo de BRL, Guaraní (PYG) e Dólar (USD)',
    icon: Coins,
    color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
  },
  {
    id: 'backup',
    label: 'Backup & Nuvem',
    category: 'Segurança',
    description: 'Exportação, restauração de snapshots e dados locais',
    icon: Cloud,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  },
];

export const AfiliadosView: React.FC<Props> = ({ onNavigate }) => {
  const { 
    currentUser, 
    employees, 
    addEmployee, 
    updateEmployee, 
    deleteEmployee,
    updateEmployeePermissions
  } = useBakery();

  // Strict check: Only the Admin Ax can access this management panel
  const isAx = currentUser.id === 'emp-admin-ax' || currentUser.email === 'axxeiacompany@gmail.com';

  // Form State for creating a new affiliate
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('afiliado');
  const [selectedFeatures, setSelectedFeatures] = useState<AppFeature[]>([
    'dashboard', 
    'pdv', 
    'venda_direta', 
    'crm'
  ]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Edit Affiliate State (allows editing Name, Email, Password, Role and Features)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('afiliado');
  const [editFeatures, setEditFeatures] = useState<AppFeature[]>([]);

  // "so eu que posso ver a senha de cada um sem mostrar as demais senhas":
  // Exactly ONE password can be revealed at a time by the admin Ax. All other passwords remain masked.
  const [visiblePasswordEmpId, setVisiblePasswordEmpId] = useState<string | null>(null);

  // If not Admin Ax, show Restricted Access screen
  if (!isAx) {
    return (
      <div className="p-8 rounded-3xl bg-[#0D121E] border border-rose-500/30 text-center max-w-xl mx-auto my-12 space-y-5 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-lg">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-white">Painel Exclusivo do Administrador Ax</h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Somente o Administrador Geral <b>Ax</b> (<span className="text-indigo-400 font-mono">axxeiacompany@gmail.com</span>) possui autorização para criar, excluir e liberar funções de afiliados.
          </p>
          <p className="text-xs text-neutral-500">
            Você está conectado como: <b className="text-neutral-300">{currentUser.name}</b> ({currentUser.email || 'Usuário Local'}).
          </p>
        </div>
        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
          >
            Voltar ao Meu Painel
          </button>
        )}
      </div>
    );
  }

  const toggleFeature = (feat: AppFeature) => {
    setSelectedFeatures(prev => 
      prev.includes(feat) ? prev.filter(f => f !== feat) : [...prev, feat]
    );
  };

  const toggleEditFeature = (feat: AppFeature) => {
    setEditFeatures(prev => 
      prev.includes(feat) ? prev.filter(f => f !== feat) : [...prev, feat]
    );
  };

  // Toggle reveal password for a specific affiliate:
  // Automatically conceals all other passwords, showing strictly ONLY this one.
  const handleToggleRevealPassword = (empId: string) => {
    setVisiblePasswordEmpId(prev => (prev === empId ? null : empId));
  };

  const handleCreateAffiliate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      alert('Por favor, preencha o nome, Gmail e senha.');
      return;
    }

    const created = addEmployee({
      name: name.trim(),
      email: email.trim(),
      pin: password.trim().slice(0, 6) || '1234',
      password: password.trim(),
      role,
      avatarColor: 'bg-indigo-600',
      allowedFeatures: selectedFeatures,
    });

    setSuccessMessage(`Afiliado "${created.name}" adicionado com sucesso com ${selectedFeatures.length} funções liberadas!`);
    setIsCreating(false);
    setName('');
    setEmail('');
    setPassword('');
    setSelectedFeatures(['dashboard', 'pdv', 'venda_direta', 'crm']);

    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditName(emp.name);
    setEditEmail(emp.email || '');
    setEditPassword(emp.password || emp.pin || '');
    setEditRole(emp.role);
    setEditFeatures(emp.allowedFeatures || AVAILABLE_FEATURES.map(f => f.id));
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    updateEmployee({
      ...editingEmployee,
      name: editName.trim(),
      email: editEmail.trim(),
      password: editPassword.trim(),
      pin: editPassword.trim().slice(0, 6) || editingEmployee.pin,
      role: editRole,
      allowedFeatures: editFeatures,
    });

    setSuccessMessage(`Afiliado ${editName} atualizado com sucesso.`);
    setEditingEmployee(null);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const copyCredentials = (emp: Employee) => {
    const credText = `Acesso ao Sistema Korisko:\nLogin (Gmail): ${emp.email || 'Não informado'}\nSenha: ${emp.password || emp.pin}\nPIN: ${emp.pin}\nFunções: ${emp.allowedFeatures?.join(', ') || 'Todas'}`;
    navigator.clipboard.writeText(credText);
    setCopiedId(emp.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner - Painel de Controle de Afiliados do Admin Ax */}
      <div className="p-6 rounded-2xl bg-[#0D121E] border border-[#1E273A] relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Painel do Administrador Geral · Ax
              </span>
              <span className="text-xs text-neutral-400 font-mono">axxeiacompany@gmail.com</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Gestão de Afiliados & Liberação de Funções
            </h1>
            <p className="text-xs text-neutral-400 max-w-2xl">
              Somente você (<b className="text-white">Ax</b>) tem acesso a este painel para adicionar e excluir afiliados, definir suas senhas e liberar de forma individual quais funções cada afiliado poderá utilizar.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Adicionar Afiliado</span>
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      {/* COLLAPSIBLE / FORM: Adicionar Novo Afiliado */}
      {isCreating && (
        <div className="p-6 rounded-2xl bg-[#0F1524] border border-indigo-500/40 shadow-2xl relative animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-4 border-b border-[#1E283D] mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Criar Novo Afiliado pelo Gmail e Senha</h3>
                <p className="text-[11px] text-neutral-400">Insira o Gmail de acesso, crie a senha personalizada e marque as funções liberadas.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#182236]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateAffiliate} className="space-y-5">
            
            {/* Row 1: Informações de Login */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                  Nome do Afiliado *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: João Afiliado ou Maria Mendes"
                  className="w-full px-3.5 py-2.5 bg-[#090D15] border border-[#1F273A] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                  Gmail de Acesso *
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="afiliado@gmail.com"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-[#090D15] border border-[#1F273A] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                  Senha que Você Criou para Ele *
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Defina a senha de acesso"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-[#090D15] border border-[#1F273A] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

            </div>

            {/* Row 2: Seleção de Papel */}
            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                Categoria / Perfil
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'afiliado', label: 'Afiliado Externo', desc: 'Acesso às vendas e funções liberadas' },
                  { id: 'caixa', label: 'Operador de Caixa', desc: 'PDV, Venda rápida e CRM' },
                  { id: 'padeiro', label: 'Padeiro / Cozinha', desc: 'Fichas técnicas e fornadas' },
                  { id: 'gerente', label: 'Gerente Operacional', desc: 'Supervisão da loja' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRole(item.id as UserRole)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      role === item.id 
                        ? 'border-indigo-500 bg-indigo-500/15 text-white shadow-sm' 
                        : 'border-[#1E273A] bg-[#090D15] text-neutral-400 hover:text-white'
                    }`}
                  >
                    <p className="text-xs font-bold leading-tight">{item.label}</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Row 3: Seletor de Funções Liberadas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <label className="text-xs font-bold text-white block">
                    Funções Liberadas para Este Afiliado ({selectedFeatures.length} selecionadas)
                  </label>
                  <p className="text-[11px] text-neutral-400">
                    O afiliado só conseguirá acessar os módulos que você marcar:
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedFeatures(AVAILABLE_FEATURES.map(f => f.id))}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                  >
                    Marcar Todas
                  </button>
                  <span className="text-neutral-600">·</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFeatures(['dashboard', 'venda_direta', 'pdv'])}
                    className="text-[11px] text-neutral-400 hover:text-neutral-200 cursor-pointer"
                  >
                    Apenas Vendas
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                {AVAILABLE_FEATURES.map((feat) => {
                  const Icon = feat.icon;
                  const isChecked = selectedFeatures.includes(feat.id);

                  return (
                    <div
                      key={feat.id}
                      onClick={() => toggleFeature(feat.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                        isChecked 
                          ? 'border-indigo-500/60 bg-indigo-500/10 text-white' 
                          : 'border-[#1C2538] bg-[#090D15]/80 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isChecked ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-[#273248] bg-[#0E1422]'
                      }`}>
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 text-neutral-400" />
                          <span className="text-xs font-semibold truncate">{feat.label}</span>
                        </div>
                        <p className="text-[10px] text-neutral-500 leading-tight mt-0.5">
                          {feat.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1C2538]">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 rounded-xl border border-[#1E273A] text-xs text-neutral-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Salvar Afiliado & Liberar Acesso</span>
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Lista de Afiliados Cadastrados */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <span>Afiliados & Membros Ativos ({employees.length})</span>
          </h2>
          <span className="text-xs text-neutral-400">
            Controle exclusivo do Administrador Ax
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {employees.map((emp) => {
            const isAxCard = emp.id === 'emp-admin-ax' || emp.email === 'axxeiacompany@gmail.com';
            // Only this specific employee's password is shown if visiblePasswordEmpId matches. All others are strictly hidden.
            const isThisPasswordVisible = visiblePasswordEmpId === emp.id;
            const unlockedCount = isAxCard 
              ? AVAILABLE_FEATURES.length 
              : (emp.allowedFeatures ? emp.allowedFeatures.length : AVAILABLE_FEATURES.length);

            return (
              <div 
                key={emp.id}
                className={`p-5 rounded-2xl border transition-all relative ${
                  isAxCard 
                    ? 'border-indigo-500/50 bg-[#0E1424] shadow-lg shadow-indigo-500/5' 
                    : 'border-[#1C2538] bg-[#0C101A] hover:border-neutral-700'
                }`}
              >
                
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl ${emp.avatarColor || 'bg-indigo-600'} text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md`}>
                      {emp.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white truncate">{emp.name}</h3>
                        {isAxCard ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            ADMIN AX (VOCÊ)
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                            {emp.role}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 truncate flex items-center gap-1.5 mt-0.5 font-mono">
                        <Mail className="w-3 h-3 text-neutral-500" />
                        <span>{emp.email || 'Sem Gmail cadastrado'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions for this member */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => copyCredentials(emp)}
                      className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-[#161E30] transition-colors cursor-pointer"
                      title="Copiar dados de acesso (Gmail e Senha)"
                    >
                      {copiedId === emp.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    
                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(emp)}
                      className="p-2 rounded-lg text-neutral-400 hover:text-indigo-400 hover:bg-[#161E30] transition-colors cursor-pointer"
                      title="Editar dados, senha e funções liberadas"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Delete button (cannot delete Ax) */}
                    {!isAxCard && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Deseja realmente excluir o afiliado ${emp.name} (${emp.email})?`)) {
                            deleteEmployee(emp.id);
                          }
                        }}
                        className="p-2 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Excluir afiliado"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Password / PIN Section - Individual reveal strictly controlled */}
                <div className="mt-4 p-3 rounded-xl bg-[#090D15] border border-[#1A2234] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-neutral-500" />
                    <span className="text-neutral-400">Senha do Afiliado:</span>
                    <span className="font-mono text-white font-semibold">
                      {isThisPasswordVisible ? (emp.password || emp.pin) : '••••••••••••'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleRevealPassword(emp.id)}
                    className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1.5 px-2 py-1 rounded bg-[#131A29] border border-[#1E283D] transition-colors cursor-pointer"
                    title={isThisPasswordVisible ? 'Ocultar esta senha' : 'Ver somente a senha deste afiliado'}
                  >
                    {isThisPasswordVisible ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{isThisPasswordVisible ? 'Ocultar' : 'Ver Senha'}</span>
                  </button>
                </div>

                {/* Functions allowed breakdown */}
                <div className="mt-3.5 pt-3 border-t border-[#182030] space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400">
                      Funções Liberadas: <b className="text-white font-mono">{unlockedCount} de {AVAILABLE_FEATURES.length}</b>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(emp)}
                      className="text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                    >
                      Editar Funções
                    </button>
                  </div>

                  {/* Pills of unlocked features */}
                  <div className="flex flex-wrap gap-1.5">
                    {isAxCard ? (
                      <span className="px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold">
                        Acesso Total a Todas as Funções & Administração
                      </span>
                    ) : (
                      (emp.allowedFeatures || AVAILABLE_FEATURES.map(f => f.id)).map(featId => {
                        const feat = AVAILABLE_FEATURES.find(f => f.id === featId);
                        if (!feat) return null;
                        return (
                          <span 
                            key={featId}
                            className="px-2 py-0.5 rounded-md bg-[#141B2B] text-neutral-300 border border-[#222E46] text-[10px] font-medium"
                          >
                            {feat.label}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: Editar Afiliado Completo (Dados, Senha e Funções Liberadas) */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-[#0D121E] border border-[#1E273A] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            
            <div className="p-5 border-b border-[#1A2234] flex items-center justify-between bg-[#0F1424]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <span>Editar Afiliado: {editingEmployee.name}</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Atualize o nome, Gmail, senha e gerencie quais funções estão liberadas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingEmployee(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#182236] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 overflow-y-auto space-y-4 flex-1">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-neutral-300 block mb-1">Nome</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#090D15] border border-[#1F273A] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-neutral-300 block mb-1">Gmail</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-[#090D15] border border-[#1F273A] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-neutral-300 block mb-1">Nova Senha</label>
                  <input
                    type="text"
                    required
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-[#090D15] border border-[#1F273A] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-neutral-300 block mb-1.5">Perfil de Operação</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-[#090D15] border border-[#1F273A] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="afiliado">Afiliado Externo</option>
                  <option value="caixa">Operador de Caixa</option>
                  <option value="padeiro">Padeiro / Cozinha</option>
                  <option value="gerente">Gerente Operacional</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {/* Liberar Funções */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-white">
                    Módulos e Funções Liberadas ({editFeatures.length} ativas)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditFeatures(AVAILABLE_FEATURES.map(f => f.id))}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                    >
                      Liberar Todas
                    </button>
                    <span className="text-neutral-600">·</span>
                    <button
                      type="button"
                      onClick={() => setEditFeatures([])}
                      className="text-[11px] text-neutral-400 hover:text-neutral-200 cursor-pointer"
                    >
                      Desmarcar Todas
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {AVAILABLE_FEATURES.map((feat) => {
                    const Icon = feat.icon;
                    const isChecked = editFeatures.includes(feat.id);

                    return (
                      <div
                        key={feat.id}
                        onClick={() => toggleEditFeature(feat.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 select-none ${
                          isChecked 
                            ? 'border-indigo-500/60 bg-indigo-500/10 text-white' 
                            : 'border-[#1C2538] bg-[#090D15] text-neutral-400'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                          isChecked ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-[#273248]'
                        }`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold block">{feat.label}</span>
                          <span className="text-[10px] text-neutral-500 block truncate">{feat.description}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 border-t border-[#1A2234] bg-[#0A0E18] flex items-center justify-between -mx-5 -mb-5 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2 rounded-xl border border-[#1E273A] text-xs text-neutral-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Salvar Alterações
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
