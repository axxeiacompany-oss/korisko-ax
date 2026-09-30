import React, { useState, useMemo } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { Customer, CustomerAccountEntry, CustomerCategory, PaymentMethod, Currency } from '../../types';
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
  TrendingDown,
  Coins,
  Sparkles
} from 'lucide-react';

export const CustomersView: React.FC = () => {
  const { 
    customers, 
    customerEntries, 
    addCustomer, 
    updateCustomer, 
    deleteCustomer, 
    recordCustomerDebt,
    recordCustomerPayment,
    recordEntradaCaixa,
    currentSession,
    redeemCustomerPoints,
    hasPermission,
    exchangeRates,
    language,
    showToast
  } = useBakery();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('todas');
  const [onlyDebtors, setOnlyDebtors] = useState(false);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // Statement / History Modal
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);

  // Payment / Amortization Modal with Multi-Currency
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [payCurrency, setPayCurrency] = useState<Currency>('BRL');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('dinheiro');
  const [payNotes, setPayNotes] = useState('');

  // Manual Debt Modal with Multi-Currency
  const [debtCustomer, setDebtCustomer] = useState<Customer | null>(null);
  const [debtCurrency, setDebtCurrency] = useState<Currency>('BRL');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtReason, setDebtReason] = useState('');

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
    const totalDebtPyg = Math.round(totalDebtBrl * (exchangeRates.BRL_TO_PYG || 1400));
    const debtorsCount = customers.filter(c => c.outstandingBalanceBrl > 0).length;
    const totalLoyaltyPoints = customers.reduce((acc, c) => acc + c.loyaltyPoints, 0);

    return {
      total,
      totalDebtBrl,
      totalDebtPyg,
      debtorsCount,
      totalLoyaltyPoints,
    };
  }, [customers, exchangeRates]);

  // Live conversion for Amortization modal
  const computedAmortizedBrl = useMemo(() => {
    if (!paymentCustomer) return 0;
    const val = parseFloat(payAmount.replace(',', '.')) || 0;
    if (val <= 0) return 0;

    if (payCurrency === 'PYG') {
      return val / (exchangeRates.BRL_TO_PYG || 1400);
    }
    if (payCurrency === 'USD') {
      return val * (exchangeRates.USD_TO_BRL || 5.62);
    }
    return val;
  }, [payAmount, payCurrency, paymentCustomer, exchangeRates]);

  const computedRemainingBrl = useMemo(() => {
    if (!paymentCustomer) return 0;
    return Math.max(0, Math.round((paymentCustomer.outstandingBalanceBrl - computedAmortizedBrl) * 100) / 100);
  }, [paymentCustomer, computedAmortizedBrl]);

  // Live conversion for Manual Debt modal
  const computedDebtBrl = useMemo(() => {
    if (!debtCustomer) return 0;
    const val = parseFloat(debtAmount.replace(',', '.')) || 0;
    if (val <= 0) return 0;

    if (debtCurrency === 'PYG') {
      return val / (exchangeRates.BRL_TO_PYG || 1400);
    }
    if (debtCurrency === 'USD') {
      return val * (exchangeRates.USD_TO_BRL || 5.62);
    }
    return val;
  }, [debtAmount, debtCurrency, debtCustomer, exchangeRates]);

  // Open Create Customer Modal
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

  // Open Edit Customer Modal
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

  // Save Customer (Create or Edit)
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      showToast(
        language === 'es' 
          ? 'Nombre y Teléfono/WhatsApp son obligatorios.' 
          : 'Nome e WhatsApp/Telefone são campos obrigatórios.',
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
    }

    setIsFormOpen(false);
  };

  // Open Payment / Amortization with chosen currency
  const handleOpenPayment = (c: Customer, initialCurrency: Currency = 'BRL') => {
    setPaymentCustomer(c);
    setPayCurrency(initialCurrency);
    if (initialCurrency === 'PYG') {
      setPayAmount(Math.round(c.outstandingBalanceBrl * (exchangeRates.BRL_TO_PYG || 1400)).toString());
    } else if (initialCurrency === 'USD') {
      setPayAmount((c.outstandingBalanceBrl / (exchangeRates.USD_TO_BRL || 5.62)).toFixed(2));
    } else {
      setPayAmount(c.outstandingBalanceBrl > 0 ? c.outstandingBalanceBrl.toFixed(2) : '');
    }
    setPayMethod('dinheiro');
    setPayNotes('');
  };

  // Handle switching currency in payment modal
  const handleSelectPayCurrency = (cur: Currency) => {
    setPayCurrency(cur);
    if (!paymentCustomer) return;
    if (cur === 'PYG') {
      setPayAmount(Math.round(paymentCustomer.outstandingBalanceBrl * (exchangeRates.BRL_TO_PYG || 1400)).toString());
    } else if (cur === 'USD') {
      setPayAmount((paymentCustomer.outstandingBalanceBrl / (exchangeRates.USD_TO_BRL || 5.62)).toFixed(2));
    } else {
      setPayAmount(paymentCustomer.outstandingBalanceBrl.toFixed(2));
    }
  };

  // Confirm Payment / Amortization
  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentCustomer) return;
    const rawVal = parseFloat(payAmount.replace(',', '.'));
    if (isNaN(rawVal) || rawVal <= 0) return;

    let finalAmountBrl = rawVal;
    let detailNote = '';

    if (payCurrency === 'PYG') {
      finalAmountBrl = rawVal / (exchangeRates.BRL_TO_PYG || 1400);
      detailNote = `Amortização recebida em ₲ ${Math.round(rawVal).toLocaleString('pt-BR')} (Câmbio 1 R$ = ₲ ${exchangeRates.BRL_TO_PYG?.toLocaleString('pt-BR') || '1.380'}).`;
    } else if (payCurrency === 'USD') {
      finalAmountBrl = rawVal * (exchangeRates.USD_TO_BRL || 5.62);
      detailNote = `Amortização recebida em US$ ${rawVal.toFixed(2)} (Câmbio 1 US$ = R$ ${exchangeRates.USD_TO_BRL?.toFixed(2) || '5.62'}).`;
    } else {
      detailNote = `Amortização recebida em R$ ${rawVal.toFixed(2)}.`;
    }

    finalAmountBrl = Math.round(finalAmountBrl * 100) / 100;
    const fullNote = [detailNote, payNotes.trim()].filter(Boolean).join(' ');

    await recordCustomerPayment(paymentCustomer.id, finalAmountBrl, payMethod, fullNote);

    // If paid in cash and cash register is open, also register Entrada de Caixa with exact currency received!
    if (payMethod === 'dinheiro' && currentSession?.status === 'aberto') {
      recordEntradaCaixa(
        rawVal,
        payCurrency,
        `Amortização Fiado - Cliente: ${paymentCustomer.name}`,
        'Recebimento Avulso',
        `Recibo Fiado #${Date.now().toString().slice(-4)}`
      );
    }

    setPaymentCustomer(null);
  };

  // Open Manual Debt Modal
  const handleOpenDebt = (c: Customer) => {
    setDebtCustomer(c);
    setDebtCurrency('BRL');
    setDebtAmount('');
    setDebtReason('');
  };

  // Confirm Manual Debt
  const handleConfirmDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtCustomer) return;
    const rawVal = parseFloat(debtAmount.replace(',', '.'));
    if (isNaN(rawVal) || rawVal <= 0) return;

    let finalAmountBrl = rawVal;
    let detailNote = '';

    if (debtCurrency === 'PYG') {
      finalAmountBrl = rawVal / (exchangeRates.BRL_TO_PYG || 1400);
      detailNote = `Débito lançado em ₲ ${Math.round(rawVal).toLocaleString('pt-BR')} (Câmbio 1 R$ = ₲ ${exchangeRates.BRL_TO_PYG?.toLocaleString('pt-BR') || '1.380'}).`;
    } else if (debtCurrency === 'USD') {
      finalAmountBrl = rawVal * (exchangeRates.USD_TO_BRL || 5.62);
      detailNote = `Débito lançado em US$ ${rawVal.toFixed(2)} (Câmbio 1 US$ = R$ ${exchangeRates.USD_TO_BRL?.toFixed(2) || '5.62'}).`;
    } else {
      detailNote = `Débito lançado em R$ ${rawVal.toFixed(2)}.`;
    }

    finalAmountBrl = Math.round(finalAmountBrl * 100) / 100;
    const fullDesc = [detailNote, debtReason.trim()].filter(Boolean).join(' ');

    await recordCustomerDebt(debtCustomer.id, finalAmountBrl, fullDesc || 'Lançamento manual de fiado/débito');
    setDebtCustomer(null);
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
    showToast(
      language === 'es'
        ? `¡Puntos canjeados! Descuento de ${formatCurrency(discount, 'BRL')} concedido al cliente.`
        : `Resgate confirmado! Desconto de ${formatCurrency(discount, 'BRL')} concedido ao cliente.`,
      'success'
    );
    setLoyaltyCustomer(null);
  };

  // WhatsApp Message Generator
  const handleSendWhatsAppNotice = (c: Customer) => {
    const cleanPhone = c.phone.replace(/\D/g, '');
    const phoneWithDdi = cleanPhone.startsWith('55') || cleanPhone.startsWith('595') 
      ? cleanPhone 
      : `55${cleanPhone}`;

    const text = encodeURIComponent(
      `Olá ${c.name}, tudo bem? Aqui é da equipe do Korizko!\n\n` +
      `Passando para informar o seu saldo atual da conta/fiado: ${formatCurrency(c.outstandingBalanceBrl, 'BRL')} (aprox. ₲ ${Math.round(c.outstandingBalanceBrl * (exchangeRates.BRL_TO_PYG || 1400)).toLocaleString('pt-BR')}).\n\n` +
      `Seus pontos de fidelidade acumulados: ${c.loyaltyPoints} pontos.\n` +
      `Se precisar de entrega ou encomendar pão quente, avise a gente por aqui! Tenha um ótimo dia!`
    );

    window.open(`https://wa.me/${phoneWithDdi}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-x-hidden pb-24 lg:pb-0">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-[#0D121E] border border-[#1E273A] shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                {language === 'es' ? 'Gestión de Clientes & Crédito' : 'CRM & Gestão de Clientes'}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider hidden sm:inline-block">
                {language === 'es' ? 'Fiado & Fidelidad' : 'Fiado & Fidelidade'}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5 truncate">
              {language === 'es' 
                ? 'Control de cuentas por cobrar multi-moneda, límites de crédito y lealtad' 
                : 'Controle de contas a receber multi-moeda, limites de crédito e fidelidade'}
            </p>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleOpenCreate}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-neutral-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{language === 'es' ? 'Nuevo Cliente' : 'Novo Cliente'}</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards - 2 cols on mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        
        <div className="p-3 sm:p-4 rounded-2xl bg-[#0D121E] border border-[#1E273A]">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span className="truncate">{language === 'es' ? 'Total Clientes' : 'Total Clientes'}</span>
            <Users className="w-4 h-4 text-amber-400 shrink-0" />
          </div>
          <div className="text-lg sm:text-2xl font-bold text-white font-mono-nums">
            {stats.total}
          </div>
          <p className="text-[10px] text-neutral-500 mt-0.5 truncate">{language === 'es' ? 'En el sistema' : 'Cadastrados no Korizko'}</p>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-[#0D121E] border border-[#1E273A]">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span className="truncate">{language === 'es' ? 'Total Fiado (A Cobrar)' : 'Total Fiado'}</span>
            <DollarSign className="w-4 h-4 text-rose-400 shrink-0" />
          </div>
          <div className="text-lg sm:text-2xl font-bold text-rose-400 font-mono-nums">
            {formatCurrency(stats.totalDebtBrl, 'BRL')}
          </div>
          <p className="text-[10px] text-neutral-500 mt-0.5 truncate">
            ≈ ₲ {stats.totalDebtPyg.toLocaleString('pt-BR')}
          </p>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-[#0D121E] border border-[#1E273A]">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span className="truncate">{language === 'es' ? 'Con Deuda' : 'Com Débito'}</span>
            <CreditCard className="w-4 h-4 text-amber-400 shrink-0" />
          </div>
          <div className="text-lg sm:text-2xl font-bold text-amber-400 font-mono-nums">
            {stats.debtorsCount}
          </div>
          <p className="text-[10px] text-neutral-500 mt-0.5 truncate">{language === 'es' ? 'Cuentas abiertas' : 'Contas em aberto'}</p>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-[#0D121E] border border-[#1E273A]">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span className="truncate">{language === 'es' ? 'Puntos Fidelidad' : 'Pontos Fidelidade'}</span>
            <Award className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>
          <div className="text-lg sm:text-2xl font-bold text-emerald-400 font-mono-nums">
            {stats.totalLoyaltyPoints.toLocaleString('pt-BR')}
          </div>
          <p className="text-[10px] text-neutral-500 mt-0.5 truncate">{language === 'es' ? 'Puntos acumulados' : 'Resgate em descontos'}</p>
        </div>

      </div>

      {/* Toolbar / Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-[#0D121E] border border-[#1E273A]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            id="crm-search-input"
            name="crmSearch"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={language === 'es' ? 'Buscar cliente por nombre, WhatsApp o documento...' : 'Buscar por nome, telefone WhatsApp ou CPF...'}
            className="w-full pl-9 pr-4 py-2 bg-[#080B12] border border-[#1C2538] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
          {/* Debt toggle filter */}
          <button
            type="button"
            onClick={() => setOnlyDebtors(!onlyDebtors)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer ${
              onlyDebtors 
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-semibold' 
                : 'bg-[#080B12] border-[#1C2538] text-neutral-400 hover:text-white'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{language === 'es' ? 'Solo con Deuda' : 'Apenas com Fiado'}</span>
          </button>

          {/* Category filter */}
          <select
            id="crm-category-filter"
            name="categoryFilter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#080B12] border border-[#1C2538] rounded-xl text-xs text-neutral-300 focus:outline-none focus:border-amber-500 shrink-0 cursor-pointer"
          >
            <option value="todas">{language === 'es' ? 'Todas las Categorías' : 'Todas as Categorias'}</option>
            <option value="varejo">{language === 'es' ? 'Venta Mostrador' : 'Varejo (Balcão)'}</option>
            <option value="mensalista">{language === 'es' ? 'Mensualista (Fiado)' : 'Mensalista (Fiado)'}</option>
            <option value="empresa">{language === 'es' ? 'Empresa / B2B' : 'Empresa / PJ'}</option>
            <option value="confeitaria">{language === 'es' ? 'Pastelería' : 'Confeitaria'}</option>
          </select>
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {filteredCustomers.map(cust => {
          const hasDebt = cust.outstandingBalanceBrl > 0;
          const isOverLimit = cust.creditLimitBrl > 0 && cust.outstandingBalanceBrl > cust.creditLimitBrl;
          const isBirthdayMonth = cust.birthday && cust.birthday.includes(`/${currentMonthNum}`);

          return (
            <div 
              key={cust.id}
              className={`p-4 sm:p-5 rounded-2xl bg-[#0D121E] border transition-all flex flex-col justify-between ${
                isOverLimit 
                  ? 'border-rose-500/40 shadow-lg shadow-rose-950/20' 
                  : hasDebt 
                  ? 'border-amber-500/30' 
                  : 'border-[#1E273A] hover:border-neutral-700'
              }`}
            >
              <div>
                
                {/* Header: Name, Badge, Birthday */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-bold text-white text-sm tracking-tight truncate">
                        {cust.name}
                      </h3>
                      {isBirthdayMonth && (
                        <span className="px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-[10px] font-bold shrink-0 flex items-center gap-1">
                          🎂 Aniversário
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1">
                      <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="font-mono">{cust.phone}</span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                    cust.category === 'mensalista' 
                      ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                      : cust.category === 'empresa'
                      ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                      : 'bg-neutral-800 text-neutral-300'
                  }`}>
                    {cust.category}
                  </span>
                </div>

                {/* Financial Balance Card */}
                <div className={`p-3 rounded-xl mb-3 ${
                  hasDebt ? 'bg-rose-950/20 border border-rose-900/30' : 'bg-[#080B12] border border-[#1C2538]'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-400 block font-medium">
                        {language === 'es' ? 'Saldo Deudor (Fiado)' : 'Saldo Devedor (Fiado)'}
                      </span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className={`text-base sm:text-lg font-black font-mono-nums ${hasDebt ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {formatCurrency(cust.outstandingBalanceBrl, 'BRL')}
                        </span>
                        {hasDebt && (
                          <span className="text-[10px] text-neutral-500 font-mono-nums">
                            (≈ ₲ {Math.round(cust.outstandingBalanceBrl * (exchangeRates.BRL_TO_PYG || 1400)).toLocaleString('pt-BR')})
                          </span>
                        )}
                      </div>
                    </div>

                    {hasDebt && (
                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppNotice(cust)}
                        className="p-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 transition-colors cursor-pointer"
                        title={language === 'es' ? 'Enviar cobro por WhatsApp' : 'Enviar aviso de cobrança via WhatsApp'}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Credit limit progress */}
                  <div className="mt-2 pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-400">
                    <span>{language === 'es' ? 'Límite de Crédito:' : 'Limite de Crédito:'} <strong>{formatCurrency(cust.creditLimitBrl, 'BRL')}</strong></span>
                    <span className={isOverLimit ? 'text-rose-400 font-bold' : 'text-neutral-500'}>
                      {isOverLimit 
                        ? (language === 'es' ? '¡Límite Excedido!' : 'Limite Excedido!') 
                        : `${Math.round((cust.outstandingBalanceBrl / (cust.creditLimitBrl || 1)) * 100)}% usado`}
                    </span>
                  </div>
                </div>

                {/* Loyalty & Total Spent Stats */}
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-[#080B12] border border-[#1C2538]">
                    <span className="text-[10px] text-neutral-500 block">{language === 'es' ? 'Fidelidad' : 'Fidelidade'}</span>
                    <span className="font-bold text-amber-400 font-mono-nums flex items-center justify-center gap-1 mt-0.5">
                      <Award className="w-3 h-3" />
                      {cust.loyaltyPoints} pts
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-[#080B12] border border-[#1C2538]">
                    <span className="text-[10px] text-neutral-500 block">{language === 'es' ? 'Total Comprado' : 'Total Comprado'}</span>
                    <span className="font-bold text-neutral-200 font-mono-nums mt-0.5 block">
                      {formatCurrency(cust.totalSpentBrl, 'BRL')}
                    </span>
                  </div>
                </div>

              </div>

              {/* Action Buttons - Designed to never overflow on mobile */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-3 mt-3 border-t border-[#1C2538]">
                
                {/* Left actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setStatementCustomer(cust)}
                    className="px-2.5 py-1.5 rounded-lg border border-[#1C2538] bg-[#080B12] text-neutral-300 hover:text-white hover:bg-neutral-800 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>{language === 'es' ? 'Extracto' : 'Extrato'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenDebt(cust)}
                    className="px-2.5 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                    title={language === 'es' ? 'Agregar deuda/crédito' : 'Lançar Débito / Fiado (Escolher Moeda)'}
                  >
                    <Plus className="w-3 h-3" />
                    <span>{language === 'es' ? '+ Deuda' : '+ Fiado'}</span>
                  </button>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-1.5">
                  {canManage && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(cust)}
                        className="p-1.5 rounded-lg border border-[#1C2538] text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 transition-colors cursor-pointer"
                        title={language === 'es' ? 'Editar Cliente' : 'Editar Cliente'}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomerToDelete(cust)}
                        className="p-1.5 rounded-lg border border-[#1C2538] text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors cursor-pointer"
                        title={language === 'es' ? 'Eliminar Cliente' : 'Excluir Cliente'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}

                  {hasDebt && (
                    <button
                      type="button"
                      onClick={() => handleOpenPayment(cust, 'BRL')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
                    >
                      <DollarSign className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{language === 'es' ? 'Amortizar' : 'Amortizar'}</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12 bg-[#0D121E]/60 border border-dashed border-[#1E273A] rounded-2xl">
          <Users className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-neutral-300">
            {language === 'es' ? 'Ningún cliente encontrado' : 'Nenhum cliente encontrado'}
          </h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            {search ? 'Tente verificar a ortografia ou limpar os filtros.' : 'Cadastre seus clientes para gerenciar contas de fiado e fidelidade.'}
          </p>
          {canManage && !search && (
            <button
              onClick={handleOpenCreate}
              className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'es' ? 'Registrar Primer Cliente' : 'Cadastrar Primeiro Cliente'}</span>
            </button>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: AMORTIZAR FIADO COM ESCOLHA DE MOEDA (MULTI-MOEDA) */}
      {/* ============================================================ */}
      {paymentCustomer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
          <div className="w-full sm:max-w-md bg-[#0F1420] border-t sm:border border-[#1F273A] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 max-h-[92vh] flex flex-col">
            
            {/* Mobile drag handle */}
            <div className="sm:hidden w-12 h-1 rounded-full bg-neutral-700 mx-auto mt-2.5 mb-1" />

            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-emerald-950/40 bg-gradient-to-r from-emerald-950/30 to-[#0F1420]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <DollarSign className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">
                    {language === 'es' ? 'Amortizar Cuenta / Fiado' : 'Amortizar / Baixar Fiado'}
                  </h3>
                  <p className="text-[11px] text-neutral-400 truncate">{paymentCustomer.name}</p>
                </div>
              </div>
              <button
                onClick={() => setPaymentCustomer(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              
              {/* Current Debt Header */}
              <div className="p-3.5 rounded-2xl bg-[#080B12] border border-[#1C2538] text-center">
                <span className="text-[11px] text-neutral-400 block">
                  {language === 'es' ? 'Saldo Actual de la Cuenta' : 'Saldo Atual em Aberto (Fiado)'}
                </span>
                <span className="text-2xl font-black text-rose-400 font-mono-nums block mt-0.5">
                  {formatCurrency(paymentCustomer.outstandingBalanceBrl, 'BRL')}
                </span>
                <div className="flex items-center justify-center gap-3 text-[11px] text-neutral-400 mt-1 font-mono-nums">
                  <span>≈ ₲ {Math.round(paymentCustomer.outstandingBalanceBrl * (exchangeRates.BRL_TO_PYG || 1400)).toLocaleString('pt-BR')}</span>
                  <span>·</span>
                  <span>≈ US$ {(paymentCustomer.outstandingBalanceBrl / (exchangeRates.USD_TO_BRL || 5.62)).toFixed(2)}</span>
                </div>
              </div>

              {/* CURRENCY SELECTOR (Qual moeda para amortizar?) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>{language === 'es' ? '¿En qué moneda paga?' : 'Moeda para Amortizar'}</span>
                  </label>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {payCurrency === 'PYG' ? `1 R$ = ₲ ${exchangeRates.BRL_TO_PYG?.toLocaleString('pt-BR') || '1.380'}` : payCurrency === 'USD' ? `US$ = R$ ${exchangeRates.USD_TO_BRL?.toFixed(2) || '5.62'}` : 'Moeda Base'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectPayCurrency('BRL')}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-95 ${
                      payCurrency === 'BRL'
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-sm ring-1 ring-emerald-500/40'
                        : 'border-[#1C2538] bg-[#080B12] text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span>🇧🇷 Real</span>
                    <span className="text-[10px] font-mono opacity-80">R$ (BRL)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectPayCurrency('PYG')}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-95 ${
                      payCurrency === 'PYG'
                        ? 'border-amber-500 bg-amber-500/20 text-amber-300 shadow-sm ring-1 ring-amber-500/40'
                        : 'border-[#1C2538] bg-[#080B12] text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span>🇵🇾 Guaraní</span>
                    <span className="text-[10px] font-mono opacity-80">₲ (PYG)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectPayCurrency('USD')}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-95 ${
                      payCurrency === 'USD'
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-sm ring-1 ring-emerald-500/40'
                        : 'border-[#1C2538] bg-[#080B12] text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span>🇺🇸 Dólar</span>
                    <span className="text-[10px] font-mono opacity-80">$ (USD)</span>
                  </button>
                </div>
              </div>

              {/* Amount input with Quick Settle button */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="customer-pay-amount" className="text-xs font-semibold text-neutral-300">
                    {language === 'es' ? `Valor entregado (${payCurrency})` : `Valor a Pagar / Amortizar (${payCurrency})`} *
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSelectPayCurrency(payCurrency)}
                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    {language === 'es' ? 'Saldar Todo' : 'Quitar Tudo'}
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 font-mono font-bold text-sm">
                    {payCurrency === 'BRL' ? 'R$' : payCurrency === 'PYG' ? '₲' : '$'}
                  </div>
                  <input
                    id="customer-pay-amount"
                    name="payAmount"
                    type="number"
                    step={payCurrency === 'PYG' ? '500' : '0.01'}
                    min="0.01"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-[#080B12] border border-[#1C2538] rounded-xl pl-12 pr-4 py-2.5 text-base font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Quick bills chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {payCurrency === 'BRL' && [10, 20, 50, 100, 200].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPayAmount(val.toString())}
                      className="px-2 py-1 rounded-lg border border-[#1C2538] bg-[#080B12] hover:bg-neutral-800 text-[11px] font-mono font-medium text-neutral-300 cursor-pointer active:scale-95"
                    >
                      +R$ {val}
                    </button>
                  ))}
                  {payCurrency === 'PYG' && [20000, 50000, 100000, 200000, 500000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPayAmount(val.toString())}
                      className="px-2 py-1 rounded-lg border border-[#1C2538] bg-[#080B12] hover:bg-neutral-800 text-[11px] font-mono font-medium text-amber-300 cursor-pointer active:scale-95"
                    >
                      +₲ {val.toLocaleString('pt-BR')}
                    </button>
                  ))}
                  {payCurrency === 'USD' && [5, 10, 20, 50, 100].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPayAmount(val.toString())}
                      className="px-2 py-1 rounded-lg border border-[#1C2538] bg-[#080B12] hover:bg-neutral-800 text-[11px] font-mono font-medium text-emerald-300 cursor-pointer active:scale-95"
                    >
                      +${val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time conversion & balance preview */}
              <div className="p-3 rounded-xl bg-[#080B12] border border-[#1C2538] space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">{language === 'es' ? 'Amortizado en cuenta:' : 'Amortizado da conta:'}</span>
                  <span className="font-bold text-emerald-400 font-mono-nums text-sm">
                    {formatCurrency(computedAmortizedBrl, 'BRL')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">{language === 'es' ? 'Nuevo saldo restante:' : 'Novo saldo restante:'}</span>
                  <span className={`font-bold font-mono-nums ${computedRemainingBrl <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(computedRemainingBrl, 'BRL')}
                  </span>
                </div>
                {payCurrency !== 'BRL' && (
                  <div className="text-[10px] text-neutral-500 pt-1 border-t border-neutral-800/80 flex items-center justify-between font-mono">
                    <span>{language === 'es' ? 'Tipo de cambio:' : 'Taxa aplicada:'}</span>
                    <span>{payCurrency === 'PYG' ? `1 R$ = ₲ ${exchangeRates.BRL_TO_PYG?.toLocaleString('pt-BR') || '1.380'}` : `1 US$ = R$ ${exchangeRates.USD_TO_BRL?.toFixed(2) || '5.62'}`}</span>
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label htmlFor="customer-pay-method" className="text-xs font-semibold text-neutral-300 block mb-1">
                  {language === 'es' ? 'Forma de Pago Recibida *' : 'Forma de Pagamento Recebida *'}
                </label>
                <select
                  id="customer-pay-method"
                  name="payMethod"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-[#080B12] border border-[#1C2538] rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="dinheiro">Dinheiro Físico (Entrada na Gaveta)</option>
                  <option value="pix">PIX (Banco Central)</option>
                  <option value="cartao_debito">Cartão de Débito</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="transferencia">Transferência Bancária</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="customer-pay-notes" className="text-xs font-semibold text-neutral-300 block mb-1">
                  {language === 'es' ? 'Observaciones / Recibo' : 'Observações / Recibo / Detalhes'}
                </label>
                <input
                  id="customer-pay-notes"
                  name="payNotes"
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Ex: Pago no balcão em dinheiro pelo titular da conta"
                  className="w-full bg-[#080B12] border border-[#1C2538] rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1C2538]">
                <button
                  type="button"
                  onClick={() => setPaymentCustomer(null)}
                  className="px-4 py-2.5 rounded-xl border border-[#1C2538] text-xs text-neutral-400 hover:text-white cursor-pointer"
                >
                  {language === 'es' ? 'Cancelar' : 'Cancelar'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  {language === 'es' ? 'Confirmar Pago' : 'Confirmar Amortização'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: LANÇAR NOVO DÉBITO MANUAL (MULTI-MOEDA) */}
      {/* ============================================================ */}
      {debtCustomer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
          <div className="w-full sm:max-w-md bg-[#0F1420] border-t sm:border border-[#1F273A] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 max-h-[92vh] flex flex-col">
            
            {/* Mobile drag handle */}
            <div className="sm:hidden w-12 h-1 rounded-full bg-neutral-700 mx-auto mt-2.5 mb-1" />

            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-rose-950/40 bg-gradient-to-r from-rose-950/30 to-[#0F1420]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">
                    {language === 'es' ? 'Registrar Deuda / Fiado' : 'Lançar Débito / Fiado na Conta'}
                  </h3>
                  <p className="text-[11px] text-neutral-400 truncate">{debtCustomer.name}</p>
                </div>
              </div>
              <button
                onClick={() => setDebtCustomer(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmDebt} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              
              <div className="p-3.5 rounded-2xl bg-[#080B12] border border-[#1C2538] text-center">
                <span className="text-[11px] text-neutral-400 block">
                  {language === 'es' ? 'Saldo Actual de la Cuenta' : 'Saldo Atual em Aberto'}
                </span>
                <span className="text-2xl font-black text-rose-400 font-mono-nums block mt-0.5">
                  {formatCurrency(debtCustomer.outstandingBalanceBrl, 'BRL')}
                </span>
                <span className="text-[10px] text-neutral-500 block mt-0.5">
                  Limite Disponível: {formatCurrency(Math.max(0, debtCustomer.creditLimitBrl - debtCustomer.outstandingBalanceBrl), 'BRL')}
                </span>
              </div>

              {/* Currency Selector for Debt */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>{language === 'es' ? 'Moeda da Conta / Débito' : 'Moeda da Conta / Débito'}</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDebtCurrency('BRL')}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      debtCurrency === 'BRL'
                        ? 'border-rose-500 bg-rose-500/20 text-rose-300 shadow-sm'
                        : 'border-[#1C2538] bg-[#080B12] text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span>🇧🇷 Real</span>
                    <span className="text-[10px] font-mono opacity-80">R$ (BRL)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDebtCurrency('PYG')}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      debtCurrency === 'PYG'
                        ? 'border-amber-500 bg-amber-500/20 text-amber-300 shadow-sm'
                        : 'border-[#1C2538] bg-[#080B12] text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span>🇵🇾 Guaraní</span>
                    <span className="text-[10px] font-mono opacity-80">₲ (PYG)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDebtCurrency('USD')}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      debtCurrency === 'USD'
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-sm'
                        : 'border-[#1C2538] bg-[#080B12] text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span>🇺🇸 Dólar</span>
                    <span className="text-[10px] font-mono opacity-80">$ (USD)</span>
                  </button>
                </div>
              </div>

              {/* Debt Amount Input */}
              <div className="space-y-1.5">
                <label htmlFor="customer-debt-amount" className="text-xs font-semibold text-neutral-300 block">
                  Valor do Débito ({debtCurrency}) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 font-mono font-bold text-sm">
                    {debtCurrency === 'BRL' ? 'R$' : debtCurrency === 'PYG' ? '₲' : '$'}
                  </div>
                  <input
                    id="customer-debt-amount"
                    name="debtAmount"
                    type="number"
                    step={debtCurrency === 'PYG' ? '500' : '0.01'}
                    min="0.01"
                    required
                    autoFocus
                    value={debtAmount}
                    onChange={(e) => setDebtAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-[#080B12] border border-[#1C2538] rounded-xl pl-12 pr-4 py-2.5 text-base font-mono font-bold text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                {debtCurrency !== 'BRL' && computedDebtBrl > 0 && (
                  <p className="text-[11px] text-amber-400 font-mono">
                    ≈ Equivalente adicionado à dívida: {formatCurrency(computedDebtBrl, 'BRL')}
                  </p>
                )}
              </div>

              {/* Reason / Items */}
              <div>
                <label htmlFor="customer-debt-reason" className="text-xs font-semibold text-neutral-300 block mb-1">
                  Descrição / Itens Comprados no Fiado *
                </label>
                <input
                  id="customer-debt-reason"
                  name="debtReason"
                  type="text"
                  required
                  value={debtReason}
                  onChange={(e) => setDebtReason(e.target.value)}
                  placeholder="Ex: 10 pães franceses, 1 refrigerante e 1 queijo"
                  className="w-full bg-[#080B12] border border-[#1C2538] rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1C2538]">
                <button
                  type="button"
                  onClick={() => setDebtCustomer(null)}
                  className="px-4 py-2.5 rounded-xl border border-[#1C2538] text-xs text-neutral-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-rose-600/20 cursor-pointer"
                >
                  Confirmar Débito
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: EXTRATO FINANCEIRO E DE COMPRAS */}
      {/* ============================================================ */}
      {statementCustomer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
          <div className="w-full sm:max-w-xl bg-[#0F1420] border-t sm:border border-[#1F273A] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 max-h-[92vh] flex flex-col">
            
            {/* Mobile drag handle */}
            <div className="sm:hidden w-12 h-1 rounded-full bg-neutral-700 mx-auto mt-2.5 mb-1" />

            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#1C2538] bg-[#080B12]/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">
                    {language === 'es' ? 'Extracto de Cuenta & Fiado' : 'Extrato de Conta & Fiado'}
                  </h3>
                  <p className="text-[11px] text-neutral-400 truncate">{statementCustomer.name} ({statementCustomer.phone})</p>
                </div>
              </div>
              <button
                onClick={() => setStatementCustomer(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              
              {/* Balance Summary Header */}
              <div className="grid grid-cols-2 gap-2.5 text-center">
                <div className="p-3 rounded-xl bg-[#080B12] border border-[#1C2538]">
                  <span className="text-[10px] text-neutral-400 block font-medium">Saldo em Aberto (Fiado)</span>
                  <span className={`text-base font-bold font-mono-nums ${statementCustomer.outstandingBalanceBrl > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {formatCurrency(statementCustomer.outstandingBalanceBrl, 'BRL')}
                  </span>
                  <span className="text-[10px] text-neutral-500 block font-mono">
                    ≈ ₲ {Math.round(statementCustomer.outstandingBalanceBrl * (exchangeRates.BRL_TO_PYG || 1400)).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#080B12] border border-[#1C2538]">
                  <span className="text-[10px] text-neutral-400 block font-medium">Pontos Fidelidade</span>
                  <span className="text-base font-bold text-amber-400 font-mono-nums flex items-center justify-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    {statementCustomer.loyaltyPoints} pts
                  </span>
                  <span className="text-[10px] text-neutral-500 block">
                    Limite: {formatCurrency(statementCustomer.creditLimitBrl, 'BRL')}
                  </span>
                </div>
              </div>

              {/* Action buttons inside statement */}
              <div className="flex items-center gap-2">
                {statementCustomer.outstandingBalanceBrl > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const cust = statementCustomer;
                      setStatementCustomer(null);
                      handleOpenPayment(cust, 'BRL');
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <DollarSign className="w-4 h-4 stroke-[2.5]" />
                    <span>Amortizar Agora (Escolher Moeda)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const cust = statementCustomer;
                    setStatementCustomer(null);
                    handleOpenDebt(cust);
                  }}
                  className="py-2 px-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Débito</span>
                </button>
              </div>

              {/* Entries list */}
              <div>
                <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                  Histórico de Lançamentos
                </h4>

                {(() => {
                  const entries = customerEntries.filter(e => e.customerId === statementCustomer.id);
                  if (entries.length === 0) {
                    return (
                      <p className="text-xs text-neutral-500 italic p-6 text-center border border-[#1C2538] rounded-xl bg-[#080B12]">
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
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-[#080B12] border border-[#1C2538] text-xs gap-2"
                          >
                            <div className="flex items-start gap-2.5">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                isDebit ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}>
                                {isDebit ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                              </div>
                              <div>
                                <div className="font-semibold text-neutral-200">
                                  {entry.description}
                                </div>
                                <div className="text-[11px] text-neutral-500 mt-0.5">
                                  {new Date(entry.date).toLocaleDateString('pt-BR')} às {new Date(entry.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  {entry.paymentMethod && ` · Via ${entry.paymentMethod.toUpperCase()}`}
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className={`font-mono font-bold text-sm ${isDebit ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {isDebit ? '+' : '-'}{formatCurrency(entry.amountBrl, 'BRL')}
                              </span>
                              {entry.resultingBalanceBrl !== undefined && (
                                <div className="text-[10px] text-neutral-500 font-mono">
                                  Saldo: {formatCurrency(entry.resultingBalanceBrl, 'BRL')}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 px-5 sm:px-6 py-3.5 border-t border-[#1C2538] bg-[#080B12]/80">
              <button
                type="button"
                onClick={() => handleSendWhatsAppNotice(statementCustomer)}
                className="px-3 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-600/30 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setStatementCustomer(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 cursor-pointer"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: RESGATE DE PONTOS DE FIDELIDADE */}
      {/* ============================================================ */}
      {loyaltyCustomer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
          <div className="w-full sm:max-w-sm bg-[#0F1420] border-t sm:border border-[#1F273A] rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-400" />
                Resgate de Fidelidade
              </h3>
              <button onClick={() => setLoyaltyCustomer(null)} className="text-neutral-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#080B12] border border-[#1C2538] text-center">
              <span className="text-[11px] text-neutral-400 block">Pontos Disponíveis de {loyaltyCustomer.name}</span>
              <span className="text-2xl font-black text-amber-400 font-mono-nums block mt-0.5">
                {loyaltyCustomer.loyaltyPoints} pts
              </span>
              <span className="text-[11px] text-emerald-400 block mt-1">
                Vale até {formatCurrency(loyaltyCustomer.loyaltyPoints * 0.05, 'BRL')} de desconto
              </span>
            </div>

            <form onSubmit={handleConfirmRedeem} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Quantidade de Pontos a Resgatar *
                </label>
                <input
                  type="number"
                  min="20"
                  max={loyaltyCustomer.loyaltyPoints}
                  required
                  value={pointsToRedeem}
                  onChange={(e) => setPointsToRedeem(e.target.value)}
                  className="w-full bg-[#080B12] border border-[#1C2538] rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1C2538]">
                <button
                  type="button"
                  onClick={() => setLoyaltyCustomer(null)}
                  className="px-3.5 py-2 rounded-xl border border-[#1C2538] text-xs text-neutral-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  Confirmar Resgate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 5: CADASTRAR OU EDITAR CLIENTE */}
      {/* ============================================================ */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
          <div className="w-full sm:max-w-lg bg-[#0F1420] border-t sm:border border-[#1F273A] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 max-h-[92vh] flex flex-col">
            
            {/* Mobile drag handle */}
            <div className="sm:hidden w-12 h-1 rounded-full bg-neutral-700 mx-auto mt-2.5 mb-1" />

            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#1C2538] bg-[#080B12]/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {editingCustomer ? 'Editar Cadastro do Cliente' : 'Novo Cliente'}
                  </h3>
                  <p className="text-[11px] text-neutral-400">Dados cadastrais e limites de fiado</p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              
              <div>
                <label htmlFor="customer-name-field" className="text-xs font-semibold text-neutral-300 block mb-1">Nome Completo *</label>
                <input
                  id="customer-name-field"
                  name="customerName"
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Dona Maria Silva ou Restaurante Central"
                  className="w-full bg-[#080B12] border border-[#1C2538] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="customer-phone-field" className="text-xs font-semibold text-neutral-300 block mb-1">WhatsApp / Telefone *</label>
                  <input
                    id="customer-phone-field"
                    name="customerPhone"
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="(45) 99876-5432"
                    className="w-full bg-[#080B12] border border-[#1C2538] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono-nums"
                  />
                </div>
                <div>
                  <label htmlFor="customer-doc-field" className="text-xs font-semibold text-neutral-300 block mb-1">CPF ou CNPJ (opcional)</label>
                  <input
                    id="customer-doc-field"
                    name="customerDoc"
                    type="text"
                    value={formDocumentCpf}
                    onChange={(e) => setFormDocumentCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full bg-[#080B12] border border-[#1C2538] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="customer-category-field" className="text-xs font-semibold text-neutral-300 block mb-1">Categoria de Cliente</label>
                  <select
                    id="customer-category-field"
                    name="customerCategory"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as CustomerCategory)}
                    className="w-full bg-[#080B12] border border-[#1C2538] rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="varejo">Varejo (Balcão)</option>
                    <option value="mensalista">Mensalista (Caderneta/Fiado)</option>
                    <option value="empresa">Empresa / Faturamento PJ</option>
                    <option value="confeitaria">Confeitaria / Encomendas</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="customer-limit-field" className="text-xs font-semibold text-neutral-300 block mb-1">Limite de Crédito / Fiado (R$)</label>
                  <input
                    id="customer-limit-field"
                    name="customerCreditLimit"
                    type="number"
                    step="10"
                    value={formCreditLimit}
                    onChange={(e) => setFormCreditLimit(e.target.value)}
                    className="w-full bg-[#080B12] border border-[#1C2538] rounded-xl px-3 py-2 text-xs text-white font-mono-nums focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="customer-bday-field" className="text-xs font-semibold text-neutral-300 block mb-1">Aniversário (Dia/Mês)</label>
                  <input
                    id="customer-bday-field"
                    name="customerBirthday"
                    type="text"
                    value={formBirthday}
                    onChange={(e) => setFormBirthday(e.target.value)}
                    placeholder="Ex: 15/04"
                    className="w-full bg-[#080B12] border border-[#1C2538] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label htmlFor="customer-email-field" className="text-xs font-semibold text-neutral-300 block mb-1">E-mail (opcional)</label>
                  <input
                    id="customer-email-field"
                    name="customerEmail"
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="cliente@exemplo.com"
                    className="w-full bg-[#080B12] border border-[#1C2538] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="customer-address-field" className="text-xs font-semibold text-neutral-300 block mb-1">Endereço de Entrega (opcional)</label>
                <input
                  id="customer-address-field"
                  name="customerAddress"
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Rua, número, bairro e referências..."
                  className="w-full bg-[#080B12] border border-[#1C2538] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label htmlFor="customer-notes-field" className="text-xs font-semibold text-neutral-300 block mb-1">Observações Internas</label>
                <textarea
                  id="customer-notes-field"
                  name="customerNotes"
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Preferências, dias de pagamento do fiado, restrições..."
                  className="w-full bg-[#080B12] border border-[#1C2538] rounded-xl p-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#1C2538]">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#1C2538] text-xs font-medium text-neutral-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-neutral-950 font-bold text-xs shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  {editingCustomer ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Confirm Delete Customer Modal */}
      <ConfirmModal
        isOpen={Boolean(customerToDelete)}
        title={language === 'es' ? 'Eliminar Cliente' : 'Excluir Cliente'}
        message={
          language === 'es'
            ? `¿Desea realmente eliminar el cliente "${customerToDelete?.name}"? Esta acción no se puede deshacer.`
            : `Deseja realmente remover o cliente "${customerToDelete?.name}"? Esta ação não pode ser desfeita.`
        }
        confirmLabel={language === 'es' ? 'Eliminar' : 'Excluir'}
        onConfirm={async () => {
          if (!customerToDelete) return;
          try {
            await deleteCustomer(customerToDelete.id);
            showToast(
              language === 'es'
                ? `Cliente "${customerToDelete.name}" eliminado correctamente.`
                : `Cliente "${customerToDelete.name}" removido com sucesso.`,
              'success'
            );
          } catch {
            showToast(
              language === 'es' ? 'Error al eliminar cliente.' : 'Erro ao excluir cliente.',
              'error'
            );
          } finally {
            setCustomerToDelete(null);
          }
        }}
        onCancel={() => setCustomerToDelete(null)}
      />

    </div>
  );
};
