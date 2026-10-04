import React, { useState, useMemo } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { Customer, CustomerCategory } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  Edit3, 
  Trash2, 
  X, 
  MessageSquare, 
  Award, 
  ShoppingBag, 
  LayoutGrid, 
  List, 
  MapPin, 
  Calendar, 
  CreditCard, 
  ChevronRight, 
  UserPlus,
  ShieldCheck,
  Check,
  Building,
  UserCheck
} from 'lucide-react';
import { ConfirmModal } from '../modals/ConfirmModal';

interface Props {
  onNavigateCrm?: () => void;
}

export const ClientesView: React.FC<Props> = ({ onNavigateCrm }) => {
  const { 
    customers, 
    currentUser, 
    addCustomer, 
    updateCustomer, 
    deleteCustomer, 
    hasPermission, 
    language,
    showToast 
  } = useBakery();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('todas');
  const [displayMode, setDisplayMode] = useState<'cards' | 'table'>('cards');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDocumentCpf, setFormDocumentCpf] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCategory, setFormCategory] = useState<CustomerCategory>('varejo');
  const [formCreditLimit, setFormCreditLimit] = useState('500000');
  const [formBirthday, setFormBirthday] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const canManage = hasPermission(['admin', 'gerente', 'caixa']);
  const currentMonthNum = (new Date().getMonth() + 1).toString().padStart(2, '0');

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchSearch = 
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        (c.documentCpf && c.documentCpf.includes(search)) ||
        (c.address && c.address.toLowerCase().includes(search.toLowerCase()));

      const matchCat = categoryFilter === 'todas' || c.category === categoryFilter;

      return matchSearch && matchCat;
    });
  }, [customers, search, categoryFilter]);

  // KPIs
  const stats = useMemo(() => {
    const total = customers.length;
    const withPhone = customers.filter(c => c.phone && c.phone.trim().length > 0).length;
    const birthdaysThisMonth = customers.filter(c => c.birthday && c.birthday.includes(`/${currentMonthNum}`)).length;
    const mensalistaOrCompany = customers.filter(c => c.category === 'mensalista' || c.category === 'empresa').length;

    return {
      total,
      withPhone,
      birthdaysThisMonth,
      mensalistaOrCompany
    };
  }, [customers, currentMonthNum]);

  // Open Create Customer Modal
  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormDocumentCpf('');
    setFormAddress('');
    setFormCategory('varejo');
    setFormCreditLimit('500000');
    setFormBirthday('');
    setFormNotes('');
    setIsFormOpen(true);
  };

  // Open Edit Customer Modal
  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormName(c.name);
    setFormPhone(c.phone);
    setFormEmail(c.email || '');
    setFormDocumentCpf(c.documentCpf || '');
    setFormAddress(c.address || '');
    setFormCategory(c.category);
    setFormCreditLimit((c.creditLimitBrl || 500000).toString());
    setFormBirthday(c.birthday || '');
    setFormNotes(c.notes || '');
    setIsFormOpen(true);
  };

  // Save Customer (Create or Edit)
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast(
        language === 'es' 
          ? 'El nombre del cliente es obligatorio.' 
          : 'O nome do cliente é obrigatório.',
        'error'
      );
      return;
    }

    const creditLimit = parseFloat(formCreditLimit) || 0;

    if (editingCustomer) {
      await updateCustomer({
        ...editingCustomer,
        name: formName.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim() || undefined,
        documentCpf: formDocumentCpf.trim() || undefined,
        address: formAddress.trim() || undefined,
        category: formCategory,
        creditLimitBrl: creditLimit,
        birthday: formBirthday.trim() || undefined,
        notes: formNotes.trim() || undefined,
      });
      showToast(
        language === 'es' ? '¡Cliente actualizado con éxito!' : 'Cliente atualizado com sucesso!',
        'success'
      );
    } else {
      await addCustomer({
        name: formName.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim() || undefined,
        documentCpf: formDocumentCpf.trim() || undefined,
        address: formAddress.trim() || undefined,
        category: formCategory,
        creditLimitBrl: creditLimit,
        birthday: formBirthday.trim() || undefined,
        notes: formNotes.trim() || undefined,
      });
      showToast(
        language === 'es' ? '¡Nuevo cliente registrado!' : 'Novo cliente cadastrado com sucesso!',
        'success'
      );
    }

    setIsFormOpen(false);
  };

  // Delete Customer
  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    await deleteCustomer(customerToDelete.id);
    showToast(
      language === 'es' ? 'Cliente eliminado del sistema.' : 'Cliente excluído do sistema.',
      'info'
    );
    setCustomerToDelete(null);
  };

  // Helper Initials
  const getCustomerInitials = (name: string) => {
    if (!name) return 'CL';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Direct WhatsApp Chat
  const handleOpenWhatsAppChat = (c: Customer) => {
    if (!c.phone) return;
    const cleanPhone = c.phone.replace(/\D/g, '');
    const phoneWithDdi = cleanPhone.startsWith('55') || cleanPhone.startsWith('595') 
      ? cleanPhone 
      : `55${cleanPhone}`;

    const text = encodeURIComponent(
      `Olá ${c.name}! Tudo bem? Aqui é da Padaria Korizko (Panificação confeitaria artesanal). Estamos à sua disposição! 🥖☕`
    );
    window.open(`https://wa.me/${phoneWithDdi}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-x-hidden pb-24 lg:pb-0">
      
      {/* Top Banner do Cadastro de Clientes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-[#0D121E] border border-[#1E273A] shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                {language === 'es' ? 'Directorio de Clientes' : 'Cadastro & Diretório de Clientes'}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-wider">
                Fichas Cadastrais
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5 truncate">
              Korizko • Panificação confeitaria artesanal — Fichas completas, telefones, WhatsApp e endereços
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {onNavigateCrm && (
            <button
              type="button"
              onClick={onNavigateCrm}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#080B12] hover:bg-neutral-800 border border-[#1C2538] text-amber-300 hover:text-amber-200 text-xs font-semibold transition-all cursor-pointer"
              title="Ir para o controle de Contas a Receber e Fiado"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Ver Fiado & CRM →</span>
            </button>
          )}

          {canManage && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-neutral-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>{language === 'es' ? '+ Nuevo Cliente' : '+ Novo Cliente'}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards de Cadastro */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0D121E] border border-[#1E273A]">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span className="truncate">Total de Clientes</span>
            <Users className="w-4 h-4 text-indigo-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white font-mono-nums">
            {stats.total}
          </div>
          <p className="text-[10px] text-neutral-500 mt-0.5 truncate">Cadastrados no sistema</p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0D121E] border border-[#1E273A]">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span className="truncate">Com WhatsApp</span>
            <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono-nums">
            {stats.withPhone}
          </div>
          <p className="text-[10px] text-neutral-500 mt-0.5 truncate">Prontos para contato</p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0D121E] border border-[#1E273A]">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span className="truncate">Aniversariantes do Mês</span>
            <Calendar className="w-4 h-4 text-pink-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-pink-400 font-mono-nums">
            {stats.birthdaysThisMonth}
          </div>
          <p className="text-[10px] text-neutral-500 mt-0.5 truncate">Mês atual {currentMonthNum}</p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0D121E] border border-[#1E273A]">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span className="truncate">Mensalistas / Empresas</span>
            <Building className="w-4 h-4 text-blue-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-blue-400 font-mono-nums">
            {stats.mensalistaOrCompany}
          </div>
          <p className="text-[10px] text-neutral-500 mt-0.5 truncate">Contas corporativas</p>
        </div>

      </div>

      {/* Barra de Busca, Categoria e Alternância Cards/Tabela */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-[#0D121E] border border-[#1E273A]">
        
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            id="clientes-search-input"
            name="clientesSearch"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, WhatsApp, CPF ou endereço..."
            className="w-full pl-9 pr-8 py-2 bg-[#080B12] border border-[#1C2538] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
          {/* Category filter */}
          <select
            id="clientes-category-filter"
            name="clientesCategoryFilter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#080B12] border border-[#1C2538] rounded-xl text-xs text-neutral-300 focus:outline-none focus:border-indigo-500 shrink-0 cursor-pointer"
          >
            <option value="todas">Todas as Categorias</option>
            <option value="varejo">Varejo (Balcão)</option>
            <option value="mensalista">Mensalista (Fiado)</option>
            <option value="empresa">Empresa / PJ</option>
            <option value="confeitaria">Confeitaria</option>
          </select>

          {/* Toggle Cards vs Tabela */}
          <div className="flex items-center rounded-xl bg-[#080B12] border border-[#1C2538] p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setDisplayMode('cards')}
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                displayMode === 'cards' ? 'bg-indigo-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
              title="Exibir Fichas Cadastrais (Cards)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('table')}
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                displayMode === 'table' ? 'bg-indigo-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
              title="Exibir em Tabela Cadastral"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* MODO CARDS (Fichas Cadastrais Limpas e Completas) */}
      {displayMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {filteredCustomers.map(cust => {
            const isBirthdayMonth = cust.birthday && cust.birthday.includes(`/${currentMonthNum}`);
            const initials = getCustomerInitials(cust.name);

            return (
              <div 
                key={cust.id}
                className="p-4 sm:p-5 rounded-2xl bg-[#0D121E] border border-[#1E273A] hover:border-indigo-500/40 transition-all flex flex-col justify-between group shadow-lg"
              >
                <div>
                  {/* Top: Avatar, Name & Category */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 flex items-center justify-center font-black text-sm shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-white text-sm tracking-tight truncate">
                            {cust.name}
                          </h3>
                          {isBirthdayMonth && (
                            <span className="px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-[10px] font-bold shrink-0">
                              🎂 Aniversário
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-neutral-400 block truncate">
                          {cust.documentCpf ? `CPF: ${cust.documentCpf}` : 'CPF não cadastrado'}
                        </span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 border ${
                      cust.category === 'mensalista' 
                        ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                        : cust.category === 'empresa'
                        ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                        : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                    }`}>
                      {cust.category}
                    </span>
                  </div>

                  {/* Informações de Contato e Localização */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-[#080B12] border border-[#1C2538] text-xs mb-3">
                    
                    {/* Telefone / WhatsApp */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-neutral-300">
                        <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="font-mono">{cust.phone || 'Sem telefone'}</span>
                      </div>
                      {cust.phone && (
                        <button
                          type="button"
                          onClick={() => handleOpenWhatsAppChat(cust)}
                          className="px-2 py-0.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Abrir conversa no WhatsApp"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </button>
                      )}
                    </div>

                    {/* Endereço */}
                    {cust.address && (
                      <div className="flex items-start gap-1.5 text-neutral-400 pt-1 border-t border-white/5">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span className="text-[11px] truncate">{cust.address}</span>
                      </div>
                    )}

                    {/* Aniversário */}
                    {cust.birthday && (
                      <div className="flex items-center gap-1.5 text-neutral-400 pt-1 border-t border-white/5">
                        <Calendar className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                        <span className="text-[11px]">Nascimento: {cust.birthday}</span>
                      </div>
                    )}

                  </div>

                  {/* Limite de Crédito & Notas */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="p-2.5 rounded-xl bg-[#080B12] border border-[#1C2538]">
                      <span className="text-[10px] text-neutral-500 block">Limite de Crédito</span>
                      <span className="font-bold text-amber-400 font-mono-nums block mt-0.5">
                        {formatCurrency(cust.creditLimitBrl || 500000, 'PYG')}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#080B12] border border-[#1C2538]">
                      <span className="text-[10px] text-neutral-500 block">Situação no Fiado</span>
                      <span className={`font-bold font-mono-nums block mt-0.5 ${cust.outstandingBalanceBrl > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {cust.outstandingBalanceBrl > 0 ? formatCurrency(cust.outstandingBalanceBrl, 'PYG') : 'Sem débitos'}
                      </span>
                    </div>
                  </div>

                  {cust.notes && (
                    <p className="text-[11px] text-neutral-400 italic bg-[#080B12]/60 p-2 rounded-lg border border-[#1C2538]/60 line-clamp-2 mb-3">
                      "{cust.notes}"
                    </p>
                  )}

                </div>

                {/* Botões de Ação da Ficha Cadastral */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#1C2538]">
                  
                  {onNavigateCrm && (
                    <button
                      type="button"
                      onClick={onNavigateCrm}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Ver conta corrente e lançamentos no CRM"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Ver Fiado</span>
                    </button>
                  )}

                  <div className="flex items-center gap-1.5 ml-auto">
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(cust)}
                        className="px-3 py-1.5 rounded-lg bg-[#080B12] hover:bg-neutral-800 border border-[#1C2538] text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Editar ficha cadastral"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Editar</span>
                      </button>
                    )}

                    {currentUser?.role === 'admin' && (
                      <button
                        type="button"
                        onClick={() => setCustomerToDelete(cust)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 transition-colors cursor-pointer"
                        title="Excluir cadastro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* MODO TABELA CADASTRAL (Compacta e rápida) */}
      {displayMode === 'table' && (
        <div className="bg-[#0D121E] border border-[#1E273A] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#080B12] border-b border-[#1E273A] text-neutral-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5 font-semibold">Cliente</th>
                  <th className="p-3.5 font-semibold">WhatsApp / Telefone</th>
                  <th className="p-3.5 font-semibold">Categoria</th>
                  <th className="p-3.5 font-semibold">CPF / Documento</th>
                  <th className="p-3.5 font-semibold">Aniversário</th>
                  <th className="p-3.5 font-semibold text-right">Limite de Crédito</th>
                  <th className="p-3.5 font-semibold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C2538]">
                {filteredCustomers.map(cust => (
                  <tr key={cust.id} className="hover:bg-neutral-800/30 transition-colors">
                    <td className="p-3.5 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-black text-[10px]">
                          {getCustomerInitials(cust.name)}
                        </span>
                        <span className="truncate max-w-[180px]">{cust.name}</span>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-neutral-300">
                      <div className="flex items-center gap-1.5">
                        <span>{cust.phone || '—'}</span>
                        {cust.phone && (
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsAppChat(cust)}
                            className="text-emerald-400 hover:text-emerald-300 p-0.5"
                            title="Conversar no WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 text-[10px] font-semibold uppercase">
                        {cust.category}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-neutral-400">
                      {cust.documentCpf || '—'}
                    </td>
                    <td className="p-3.5 text-neutral-300">
                      {cust.birthday || '—'}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-amber-400">
                      {formatCurrency(cust.creditLimitBrl || 500000, 'PYG')}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {onNavigateCrm && (
                          <button
                            type="button"
                            onClick={onNavigateCrm}
                            className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-[11px] cursor-pointer"
                            title="Ver Fiado"
                          >
                            Fiado
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(cust)}
                          className="p-1 rounded-lg text-neutral-400 hover:text-white"
                          title="Editar Cadastro"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {currentUser?.role === 'admin' && (
                          <button
                            type="button"
                            onClick={() => setCustomerToDelete(cust)}
                            className="p-1 rounded-lg text-rose-400/80 hover:text-rose-300"
                            title="Excluir Cadastro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Estado Vazio */}
      {filteredCustomers.length === 0 && (
        <div className="text-center py-12 bg-[#0D121E]/60 border border-dashed border-[#1E273A] rounded-2xl">
          <Users className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-neutral-300">
            Nenhum cliente cadastrado
          </h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            {search ? 'Tente buscar com outros termos.' : 'Cadastre seus clientes com nome, WhatsApp e dados de entrega.'}
          </p>
          {canManage && !search && (
            <button
              onClick={handleOpenCreate}
              className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Cadastrar Primeiro Cliente</span>
            </button>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL DE CADASTRO / EDIÇÃO DE CLIENTE */}
      {/* ============================================================ */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
          <div className="w-full sm:max-w-lg bg-[#0F1420] border-t sm:border border-[#1F273A] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 max-h-[92vh] flex flex-col">
            
            {/* Mobile drag handle */}
            <div className="sm:hidden w-12 h-1 rounded-full bg-neutral-700 mx-auto mt-2.5 mb-1" />

            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#1E273A] bg-[#0A0E17]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <UserPlus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {editingCustomer ? 'Editar Ficha Cadastral' : 'Cadastrar Novo Cliente'}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Preencha os dados do cliente para registro e contato
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-5 sm:p-6 space-y-3.5 overflow-y-auto flex-1">
              
              {/* Nome Completo */}
              <div>
                <label htmlFor="cliente-form-name" className="text-xs font-semibold text-neutral-300 block mb-1">
                  Nome Completo *
                </label>
                <input
                  id="cliente-form-name"
                  name="formName"
                  type="text"
                  required
                  autoFocus
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Carlos Mendoza"
                  className="w-full bg-[#080B12] border border-[#1C2538] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Telefone / WhatsApp & CPF */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="cliente-form-phone" className="text-xs font-semibold text-neutral-300 block mb-1">
                    WhatsApp / Telefone *
                  </label>
                  <input
                    id="cliente-form-phone"
                    name="formPhone"
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="Ex: (45) 99876-5432"
                    className="w-full bg-[#080B12] border border-[#1C2538] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label htmlFor="cliente-form-doc" className="text-xs font-semibold text-neutral-300 block mb-1">
                    CPF / Documento (Opcional)
                  </label>
                  <input
                    id="cliente-form-doc"
                    name="formDocumentCpf"
                    type="text"
                    value={formDocumentCpf}
                    onChange={(e) => setFormDocumentCpf(e.target.value)}
                    placeholder="Ex: 000.000.000-00"
                    className="w-full bg-[#080B12] border border-[#1C2538] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Endereço */}
              <div>
                <label htmlFor="cliente-form-address" className="text-xs font-semibold text-neutral-300 block mb-1">
                  Endereço / Referência (Opcional)
                </label>
                <input
                  id="cliente-form-address"
                  name="formAddress"
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Ex: Rua das Flores, 123 - Centro"
                  className="w-full bg-[#080B12] border border-[#1C2538] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Categoria & Limite de Crédito */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="cliente-form-category" className="text-xs font-semibold text-neutral-300 block mb-1">
                    Categoria do Cliente
                  </label>
                  <select
                    id="cliente-form-category"
                    name="formCategory"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as CustomerCategory)}
                    className="w-full bg-[#080B12] border border-[#1C2538] rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="varejo">Varejo (Balcão)</option>
                    <option value="mensalista">Mensalista (Fiado Autorizado)</option>
                    <option value="empresa">Empresa / Pessoa Jurídica</option>
                    <option value="confeitaria">Confeitaria / Encomendas</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="cliente-form-limit" className="text-xs font-semibold text-neutral-300 block mb-1">
                    Limite de Crédito (₲ PYG)
                  </label>
                  <input
                    id="cliente-form-limit"
                    name="formCreditLimit"
                    type="number"
                    step="5000"
                    min="0"
                    value={formCreditLimit}
                    onChange={(e) => setFormCreditLimit(e.target.value)}
                    placeholder="500000"
                    className="w-full bg-[#080B12] border border-[#1C2538] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Data de Aniversário (DD/MM) */}
              <div>
                <label htmlFor="cliente-form-birthday" className="text-xs font-semibold text-neutral-300 block mb-1">
                  Data de Nascimento / Aniversário (DD/MM)
                </label>
                <input
                  id="cliente-form-birthday"
                  name="formBirthday"
                  type="text"
                  value={formBirthday}
                  onChange={(e) => setFormBirthday(e.target.value)}
                  placeholder="Ex: 15/04"
                  className="w-full bg-[#080B12] border border-[#1C2538] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* Observações */}
              <div>
                <label htmlFor="cliente-form-notes" className="text-xs font-semibold text-neutral-300 block mb-1">
                  Observações Gerais
                </label>
                <textarea
                  id="cliente-form-notes"
                  name="formNotes"
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ex: Prefere pão bem assado; costuma retirar pedidos pela manhã."
                  className="w-full bg-[#080B12] border border-[#1C2538] rounded-xl p-3 text-xs text-neutral-200 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1C2538]">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#1C2538] text-xs text-neutral-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-neutral-950 font-bold text-xs shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  {editingCustomer ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {customerToDelete && (
        <ConfirmModal
          isOpen={Boolean(customerToDelete)}
          title="Excluir Cadastro do Cliente"
          message={`Tem certeza que deseja excluir permanentemente o cadastro de "${customerToDelete.name}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Sim, Excluir Cliente"
          cancelLabel="Cancelar"
          isDestructive={true}
          onConfirm={handleConfirmDelete}
          onCancel={() => setCustomerToDelete(null)}
        />
      )}

    </div>
  );
};
