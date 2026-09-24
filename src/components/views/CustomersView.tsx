import React, { useState, useMemo } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { Customer, CustomerAccountEntry, CustomerCategory, PaymentMethod } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  CreditCard, 
  DollarSign, 
  Award, 
  Calendar, 
  MessageSquare, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Trash2, 
  X,
  ExternalLink,
  Receipt,
  Gift,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown
} from 'lucide-react';

export const CustomersView: React.FC = () => {
  const { 
    customers, 
    customerEntries, 
    addCustomer, 
    updateCustomer, 
    deleteCustomer, 
    recordCustomerPayment,
    redeemCustomerPoints,
    hasPermission,
    exchangeRates
  } = useBakery();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('todas');
  const [onlyDebtors, setOnlyDebtors] = useState(false);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Statement / History Modal
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);

  // Payment / Amortization Modal
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('dinheiro');
  const [payNotes, setPayNotes] = useState('');

  // Loyalty Points Redeem Modal
  const [loyaltyCustomer, setLoyaltyCustomer] = useState<Customer | null>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState('');

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDocumentCpf, setFormDocumentCpf] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCategory, setFormCategory] = useState<CustomerCategory>('varejo');
  const [formCreditLimit, setFormCreditLimit] = useState('200');
  const [formBirthday, setFormBirthday] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const canManage = hasPermission(['admin', 'gerente', 'caixa']);

  // Current Month for Birthday matching
  const currentMonthNum = (new Date().getMonth() + 1).toString().padStart(2, '0');

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchSearch = 
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        (c.documentCpf && c.documentCpf.includes(search));
      
      const matchCat = categoryFilter === 'todas' || c.category === categoryFilter;
      const matchDebtor = !onlyDebtors || c.outstandingBalanceBrl > 0;

      return matchSearch && matchCat && matchDebtor;
    });
  }, [customers, search, categoryFilter, onlyDebtors]);

  // KPIs
  const stats = useMemo(() => {
    const total = customers.length;
    const totalDebtBrl = customers.reduce((acc, c) => acc + c.outstandingBalanceBrl, 0);
    const totalDebtPyg = Math.round(totalDebtBrl * exchangeRates.BRL_TO_PYG);
    const debtorsCount = customers.filter(c => c.outstandingBalanceBrl > 0).length;
    const totalLoyaltyPoints = customers.reduce((acc, c) => acc + c.loyaltyPoints, 0);

    return { total, totalDebtBrl, totalDebtPyg, debtorsCount, totalLoyaltyPoints };
  }, [customers, exchangeRates.BRL_TO_PYG]);

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormDocumentCpf('');
    setFormAddress('');
    setFormCategory('varejo');
    setFormCreditLimit('200');
    setFormBirthday('');
    setFormNotes('');
    setIsFormOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormName(c.name);
    setFormPhone(c.phone);
    setFormEmail(c.email || '');
    setFormDocumentCpf(c.documentCpf || '');
    setFormAddress(c.address || '');
    setFormCategory(c.category);
    setFormCreditLimit(c.creditLimitBrl.toString());
    setFormBirthday(c.birthday || '');
    setFormNotes(c.notes || '');
    setIsFormOpen(true);
  };

  // Save Form
  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;

    const creditLimit = parseFloat(formCreditLimit) || 0;

    if (editingCustomer) {
      updateCustomer({
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
    } else {
      addCustomer({
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
    }

    setIsFormOpen(false);
  };

  // Open Payment / Amortization
  const handleOpenPayment = (c: Customer) => {
    setPaymentCustomer(c);
    setPayAmount(c.outstandingBalanceBrl > 0 ? c.outstandingBalanceBrl.toString() : '10');
    setPayMethod('dinheiro');
    setPayNotes('');
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentCustomer) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return;

    recordCustomerPayment(paymentCustomer.id, amount, payMethod, payNotes);
    setPaymentCustomer(null);
  };

  // Open Loyalty Redeem
  const handleOpenLoyalty = (c: Customer) => {
    setLoyaltyCustomer(c);
    setPointsToRedeem(c.loyaltyPoints.toString());
  };

  const handleConfirmRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loyaltyCustomer) return;
    const pts = parseInt(pointsToRedeem);
    if (!pts || pts <= 0) return;

    const discount = redeemCustomerPoints(loyaltyCustomer.id, pts);
    alert(`Resgate confirmado! Desconto de ${formatCurrency(discount, 'BRL')} concedido ao cliente.`);
    setLoyaltyCustomer(null);
  };

  // WhatsApp Message Generator
  const handleSendWhatsAppNotice = (c: Customer) => {
    const cleanPhone = c.phone.replace(/\D/g, '');
    const phoneWithDdi = cleanPhone.startsWith('55') || cleanPhone.startsWith('595') 
      ? cleanPhone 
      : `55${cleanPhone}`;

    const text = encodeURIComponent(
      `Olá ${c.name}, tudo bem? Aqui é da Panificadora & Confeitaria Korisko!\n\n` +
      `Passando para informar o seu saldo atual da conta/fiado: ${formatCurrency(c.outstandingBalanceBrl, 'BRL')} (aprox. ₲ ${Math.round(c.outstandingBalanceBrl * exchangeRates.BRL_TO_PYG).toLocaleString('pt-BR')}).\n\n` +
      `Seus pontos de fidelidade acumulados: ${c.loyaltyPoints} pontos.\n` +
      `Se precisar de entrega ou encomendar pão quente, avise a gente por aqui! Tenha um ótimo dia!`
    );

    window.open(`https://wa.me/${phoneWithDdi}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-neutral-900 border border-neutral-800">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-100">CRM & Gestão de Clientes</h1>
              <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 text-xs font-semibold">
                Controle de Fiado & Fidelidade
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Cadastro de clientes, limite de crédito para fiado/mensalistas, cobrança WhatsApp e programa de pontos.
            </p>
          </div>
        </div>

        {canManage && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs transition-colors shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            Novo Cliente
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Total de Clientes</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-100 font-mono-nums">
            {stats.total}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">Cadastrados no sistema Korisko</p>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Total a Receber (Fiado)</span>
            <DollarSign className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 font-mono-nums">
            {formatCurrency(stats.totalDebtBrl, 'BRL')}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            ≈ ₲ {stats.totalDebtPyg.toLocaleString('pt-BR')} Guaranis
          </p>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Contas com Débito</span>
            <CreditCard className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono-nums">
            {stats.debtorsCount}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">Clientes com saldo devedor em aberto</p>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Pontos Fidelidade Ativos</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono-nums">
            {stats.totalLoyaltyPoints.toLocaleString('pt-BR')}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">Resgatáveis em descontos no caixa</p>
        </div>

      </div>

      {/* Toolbar / Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-neutral-900/60 border border-neutral-800">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, telefone WhatsApp ou CPF..."
            className="w-full pl-9 pr-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Debt toggle filter */}
          <button
            type="button"
            onClick={() => setOnlyDebtors(!onlyDebtors)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              onlyDebtors 
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-semibold' 
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Apenas com Débito / Fiado
          </button>

          {/* Categories */}
          <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
            {[
              { id: 'todas', label: 'Todos' },
              { id: 'varejo', label: 'Varejo' },
              { id: 'mensalista', label: 'Mensalista' },
              { id: 'empresa', label: 'Empresa' },
              { id: 'confeitaria', label: 'Confeitaria' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  categoryFilter === cat.id
                    ? 'bg-amber-500 text-neutral-950 font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map(cust => {
          const hasDebt = cust.outstandingBalanceBrl > 0;
          const limitUsagePercent = cust.creditLimitBrl > 0 
            ? Math.min(100, Math.round((cust.outstandingBalanceBrl / cust.creditLimitBrl) * 100))
            : 0;

          // Check birthday
          const isBirthdayMonth = cust.birthday && cust.birthday.includes(`/${currentMonthNum}`);

          return (
            <div 
              key={cust.id}
              className="flex flex-col justify-between p-5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all group"
            >
              <div className="space-y-3.5">
                
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-neutral-800 text-[10px] font-semibold text-neutral-300 uppercase">
                        {cust.category}
                      </span>
                      {isBirthdayMonth && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
                          <Gift className="w-3 h-3" />
                          Aniversário
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-neutral-100 mt-1.5 group-hover:text-amber-300 transition-colors">
                      {cust.name}
                    </h3>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono-nums ${
                    hasDebt
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {hasDebt ? formatCurrency(cust.outstandingBalanceBrl, 'BRL') : 'Em dia'}
                  </span>
                </div>

                {/* Contact info */}
                <div className="space-y-1 text-xs text-neutral-400">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{cust.phone}</span>
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppNotice(cust)}
                      className="ml-auto text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
                      title="Conversar ou cobrar no WhatsApp"
                    >
                      <MessageSquare className="w-3 h-3" />
                      WhatsApp
                    </button>
                  </div>
                  {cust.documentCpf && (
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-neutral-500" />
                      <span>CPF: {cust.documentCpf}</span>
                    </div>
                  )}
                  {cust.address && (
                    <p className="text-[11px] text-neutral-500 truncate">
                      {cust.address}
                    </p>
                  )}
                </div>

                {/* Credit Limit & Fiado Progress */}
                <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400">Limite de Fiado:</span>
                    <span className="font-mono-nums font-semibold text-neutral-200">
                      {formatCurrency(cust.creditLimitBrl, 'BRL')}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all rounded-full ${
                        limitUsagePercent > 85 ? 'bg-rose-500' : limitUsagePercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${limitUsagePercent}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-neutral-500 font-mono-nums">
                    <span>Uso: {limitUsagePercent}%</span>
                    <span>Disponível: {formatCurrency(Math.max(0, cust.creditLimitBrl - cust.outstandingBalanceBrl), 'BRL')}</span>
                  </div>
                </div>

                {/* Loyalty & Total Spent Stats */}
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 block">Fidelidade</span>
                    <span className="font-bold text-amber-400 font-mono-nums flex items-center justify-center gap-1">
                      <Award className="w-3 h-3" />
                      {cust.loyaltyPoints} pts
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 block">Total Comprado</span>
                    <span className="font-bold text-neutral-200 font-mono-nums">
                      {formatCurrency(cust.totalSpentBrl, 'BRL')}
                    </span>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setStatementCustomer(cust)}
                  className="px-2.5 py-1.5 rounded-lg border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  Extrato
                </button>

                <div className="flex items-center gap-1.5">
                  {cust.loyaltyPoints >= 50 && (
                    <button
                      type="button"
                      onClick={() => handleOpenLoyalty(cust)}
                      className="p-1.5 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors"
                      title="Resgatar Pontos de Fidelidade"
                    >
                      <Gift className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {canManage && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(cust)}
                        className="p-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 transition-colors"
                        title="Editar Cliente"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Remover cadastro de "${cust.name}"?`)) {
                            deleteCustomer(cust.id);
                          }
                        }}
                        className="p-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
                        title="Excluir Cliente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}

                  {hasDebt && (
                    <button
                      type="button"
                      onClick={() => handleOpenPayment(cust)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 shadow-md shadow-emerald-600/20 transition-colors"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      Amortizar
                    </button>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12 bg-neutral-900/40 border border-dashed border-neutral-800 rounded-2xl">
          <Users className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-neutral-300">Nenhum cliente encontrado</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            {search ? 'Tente verificar a ortografia ou limpar os filtros.' : 'Cadastre seus clientes para gerenciar contas de fiado e fidelidade.'}
          </p>
          {canManage && !search && (
            <button
              onClick={handleOpenCreate}
              className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Primeiro Cliente
            </button>
          )}
        </div>
      )}

      {/* MODAL: Amortizar / Pagar Fiado */}
      {paymentCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">Amortizar / Baixar Fiado</h3>
                  <p className="text-[11px] text-neutral-400">{paymentCustomer.name}</p>
                </div>
              </div>
              <button
                onClick={() => setPaymentCustomer(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="p-6 space-y-4">
              
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-center">
                <span className="text-[11px] text-neutral-400 block">Saldo Atual em Aberto</span>
                <span className="text-xl font-black text-rose-400 font-mono-nums">
                  {formatCurrency(paymentCustomer.outstandingBalanceBrl, 'BRL')}
                </span>
                <span className="text-[10px] text-neutral-500 block">
                  ≈ ₲ {Math.round(paymentCustomer.outstandingBalanceBrl * exchangeRates.BRL_TO_PYG).toLocaleString('pt-BR')} Guaranis
                </span>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1">
                  Valor a Pagar / Amortizar (R$) *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={paymentCustomer.outstandingBalanceBrl}
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-mono font-bold text-neutral-100 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setPayAmount(paymentCustomer.outstandingBalanceBrl.toString())}
                    className="px-2.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium shrink-0"
                  >
                    Quitar Tudo
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1">
                  Forma de Pagamento Recebida *
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="dinheiro">Dinheiro (Espécie)</option>
                  <option value="pix">PIX (Banco Central)</option>
                  <option value="cartao_debito">Cartão de Débito</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="transferencia">Transferência Bancária</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1">
                  Observações / Recibo (opcional)
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="ex: Pago via Pix no balcão pelo cliente"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setPaymentCustomer(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-800 text-xs text-neutral-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20"
                >
                  Confirmar Pagamento
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL: Extrato Financeiro do Cliente */}
      {statementCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">Extrato de Conta & Fiado</h3>
                  <p className="text-[11px] text-neutral-400">{statementCustomer.name} ({statementCustomer.phone})</p>
                </div>
              </div>
              <button
                onClick={() => setStatementCustomer(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              
              {/* Balance Summary Header */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block">Saldo em Aberto (Fiado)</span>
                  <span className={`text-base font-bold font-mono-nums ${statementCustomer.outstandingBalanceBrl > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {formatCurrency(statementCustomer.outstandingBalanceBrl, 'BRL')}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block">Pontos Fidelidade</span>
                  <span className="text-base font-bold text-amber-400 font-mono-nums">
                    {statementCustomer.loyaltyPoints} pts
                  </span>
                </div>
              </div>

              {/* Entries list */}
              <div>
                <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                  Histórico de Compras e Amortizações
                </h4>

                {(() => {
                  const entries = customerEntries.filter(e => e.customerId === statementCustomer.id);
                  if (entries.length === 0) {
                    return (
                      <p className="text-xs text-neutral-500 italic p-4 text-center border border-neutral-800 rounded-xl bg-neutral-950">
                        Nenhum lançamento no extrato deste cliente até o momento.
                      </p>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {entries.map(entry => {
                        const isDebit = entry.type === 'debito_compra';
                        return (
                          <div 
                            key={entry.id}
                            className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                isDebit ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                              }`}>
                                {isDebit ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                              </div>
                              <div>
                                <div className="font-semibold text-neutral-200">
                                  {entry.description}
                                </div>
                                <div className="text-[10px] text-neutral-500">
                                  {new Date(entry.date).toLocaleString('pt-BR')} • Por {entry.recordedBy}
                                </div>
                              </div>
                            </div>

                            <span className={`font-mono font-bold ${isDebit ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {isDebit ? '+' : '-'} {formatCurrency(entry.amountBrl, 'BRL')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-950/60">
              <button
                type="button"
                onClick={() => handleSendWhatsAppNotice(statementCustomer)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-600/30"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Enviar Extrato via WhatsApp
              </button>

              <button
                type="button"
                onClick={() => setStatementCustomer(null)}
                className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: Resgatar Pontos de Fidelidade */}
      {loyaltyCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-400" />
                Resgate de Pontos Fidelidade
              </h3>
              <button onClick={() => setLoyaltyCustomer(null)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-center">
              <span className="text-[11px] text-neutral-400 block">Saldo de Pontos Disponíveis</span>
              <span className="text-2xl font-bold text-amber-400 font-mono-nums">
                {loyaltyCustomer.loyaltyPoints} pts
              </span>
              <span className="text-[10px] text-neutral-500 block mt-1">
                Taxa de conversão: 20 pts = R$ 1,00 de desconto
              </span>
            </div>

            <form onSubmit={handleConfirmRedeem} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1">
                  Quantos pontos deseja resgatar?
                </label>
                <input
                  type="number"
                  min="20"
                  max={loyaltyCustomer.loyaltyPoints}
                  step="10"
                  required
                  value={pointsToRedeem}
                  onChange={(e) => setPointsToRedeem(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-mono font-bold text-neutral-100"
                />
                <span className="text-[11px] text-emerald-400 block mt-1 font-semibold">
                  Equivale a R$ {((parseInt(pointsToRedeem) || 0) / 20).toFixed(2)} de desconto imediato!
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLoyaltyCustomer(null)}
                  className="px-3 py-1.5 rounded-lg border border-neutral-800 text-xs text-neutral-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs"
                >
                  Confirmar Resgate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Formulário Novo / Editar Cliente */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">
                    {editingCustomer ? 'Editar Cadastro de Cliente' : 'Cadastrar Novo Cliente'}
                  </h3>
                  <p className="text-[11px] text-neutral-400">Dados cadastrais e concessão de crédito / fiado</p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-6 space-y-4 overflow-y-auto flex-1">
              
              <div>
                <label className="text-xs font-medium text-neutral-400 block mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="ex: Dona Maria das Dores ou Restaurante Central"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-neutral-400 block mb-1">WhatsApp / Telefone *</label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="(45) 99876-5432"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500 font-mono-nums"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-400 block mb-1">CPF ou CNPJ (opcional)</label>
                  <input
                    type="text"
                    value={formDocumentCpf}
                    onChange={(e) => setFormDocumentCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500 font-mono-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-neutral-400 block mb-1">Categoria de Cliente</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as CustomerCategory)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="varejo">Varejo (Balcão)</option>
                    <option value="mensalista">Mensalista (Caderneta/Fiado)</option>
                    <option value="empresa">Empresa / Faturamento PJ</option>
                    <option value="confeitaria">Confeitaria / Encomendas</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-400 block mb-1">Limite de Crédito / Fiado (R$)</label>
                  <input
                    type="number"
                    step="10"
                    value={formCreditLimit}
                    onChange={(e) => setFormCreditLimit(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 font-mono-nums focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-neutral-400 block mb-1">Aniversário (Dia/Mês)</label>
                  <input
                    type="text"
                    value={formBirthday}
                    onChange={(e) => setFormBirthday(e.target.value)}
                    placeholder="ex: 15/04 ou 1985-04-15"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-400 block mb-1">E-mail (opcional)</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="cliente@exemplo.com"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-400 block mb-1">Endereço de Entrega (opcional)</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Rua, número, bairro e referências..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-400 block mb-1">Observações Internas</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Preferências, dias de pagamento do fiado, restrições..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-800 text-xs font-medium text-neutral-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-lg shadow-amber-500/20"
                >
                  {editingCustomer ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
