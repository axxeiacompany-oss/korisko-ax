import React, { useState, useMemo } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { Customer, CustomerAccountEntry, CustomerCategory, PaymentMethod, Currency, Sale } from '../../types';
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
  Sparkles,
  Printer,
  Share2,
  Copy,
  Check,
  Download,
  Filter,
  Clock,
  Wallet,
  ChevronRight,
  Info,
  RotateCcw,
  ShieldCheck,
  Radio,
  BookOpen,
  ShoppingBag,
  LayoutGrid,
  List,
  BarChart3,
  ChevronDown,
  ChevronUp,
  MoreVertical
} from 'lucide-react';
import { ConfirmModal } from '../modals/ConfirmModal';
import { ReceiptModal } from '../modals/ReceiptModal';
import { CustomerPurchasesModal } from '../modals/CustomerPurchasesModal';
import { FinancialPurchasesAnalytics } from '../FinancialPurchasesAnalytics';

interface CustomersViewProps {
  initialTab?: 'all' | 'debtors' | 'birthdays' | 'history';
  onNavigateClientes?: () => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ initialTab, onNavigateClientes }) => {
  const { 
    customers, 
    customerEntries, 
    customerPurchases,
    sales,
    currentUser,
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
    deleteCustomerEntry,
    clearAllCustomerEntries,
    clearCheckoutSession,
    zeroAllNumbersForRealTest,
    showToast
  } = useBakery();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('todas');
  const [onlyDebtors, setOnlyDebtors] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState<'all' | 'debtors' | 'birthdays' | 'history'>(initialTab || 'all');
  const [displayMode, setDisplayMode] = useState<'cards' | 'table'>('cards');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showLiveStreamBanner, setShowLiveStreamBanner] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | 'debito' | 'amortizacao'>('all');

  // Live Fiado on-screen feed state
  const [liveFiadoFilter, setLiveFiadoFilter] = useState<'all' | 'debito' | 'amortizacao'>('all');
  const [liveFiadoSearch, setLiveFiadoSearch] = useState('');
  const [isLiveFiadoExpanded, setIsLiveFiadoExpanded] = useState(true);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // Statement / History Modal
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);
  const [purchasesCustomer, setPurchasesCustomer] = useState<Customer | null>(null);
  const [statementViewMode, setStatementViewMode] = useState<'thermal' | 'table'>('thermal');
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);
  const [statementSearch, setStatementSearch] = useState('');
  const [statementTypeFilter, setStatementTypeFilter] = useState<'all' | 'debito' | 'amortizacao'>('all');
  const [statementPeriodFilter, setStatementPeriodFilter] = useState<'all' | '7d' | '30d' | 'month'>('all');
  const [statementCopied, setStatementCopied] = useState(false);
  const [entryForReceipt, setEntryForReceipt] = useState<CustomerAccountEntry | null>(null);

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
  const [formCreditLimit, setFormCreditLimit] = useState('500000');
  const [formBirthday, setFormBirthday] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Keep open modals synchronized in real-time when customer balances change
  React.useEffect(() => {
    if (statementCustomer) {
      const fresh = customers.find(c => c.id === statementCustomer.id);
      if (fresh && (fresh.outstandingBalanceBrl !== statementCustomer.outstandingBalanceBrl || fresh.loyaltyPoints !== statementCustomer.loyaltyPoints || fresh.creditLimitBrl !== statementCustomer.creditLimitBrl)) {
        setStatementCustomer(fresh);
      }
    }
    if (paymentCustomer) {
      const fresh = customers.find(c => c.id === paymentCustomer.id);
      if (fresh && fresh.outstandingBalanceBrl !== paymentCustomer.outstandingBalanceBrl) {
        setPaymentCustomer(fresh);
      }
    }
    if (debtCustomer) {
      const fresh = customers.find(c => c.id === debtCustomer.id);
      if (fresh && fresh.outstandingBalanceBrl !== debtCustomer.outstandingBalanceBrl) {
        setDebtCustomer(fresh);
      }
    }
    if (purchasesCustomer) {
      const fresh = customers.find(c => c.id === purchasesCustomer.id);
      if (fresh && (fresh.totalSpentBrl !== purchasesCustomer.totalSpentBrl || fresh.outstandingBalanceBrl !== purchasesCustomer.outstandingBalanceBrl)) {
        setPurchasesCustomer(fresh);
      }
    }
  }, [customers, statementCustomer, paymentCustomer, debtCustomer, purchasesCustomer]);

  const canManage = hasPermission(['admin', 'gerente', 'caixa']);

  // Current Month for Birthday matching
  const currentMonthNum = (new Date().getMonth() + 1).toString().padStart(2, '0');

  // Map of live Total Comprado and purchase count per customer (combining SQL registro_compras_clientes + sales, deduplicating comandas)
  const customerPurchasesStatsMap = useMemo(() => {
    const map = new Map<string, { totalSpent: number; count: number }>();
    const activeSaleIds = new Set((sales || []).map(s => s.id));
    customers.forEach(c => {
      const rawPurchList = (customerPurchases || []).filter(p => p.customerId === c.id);
      const hasRealPurchases = rawPurchList.some(p => !p.id.startsWith('purch-debt-'));
      const finalizedCmds = new Set<string>();
      rawPurchList.forEach(p => {
        if (p.saleId && p.comandaNumber && activeSaleIds.has(p.saleId)) {
          finalizedCmds.add(p.comandaNumber.trim().toLowerCase());
        }
      });
      const purchList = rawPurchList.filter(p => {
        if (p.id.startsWith('purch-debt-') && (hasRealPurchases || (p.saleId && !activeSaleIds.has(p.saleId)))) {
          return false;
        }
        if (p.id.startsWith('purch-sale-') && p.saleId && sales && sales.length > 0 && !activeSaleIds.has(p.saleId)) {
          return false;
        }
        if (
          p.id.startsWith('purch-cmd-') &&
          !p.saleId &&
          p.comandaNumber &&
          finalizedCmds.has(p.comandaNumber.trim().toLowerCase())
        ) {
          return false;
        }
        return true;
      });
      const sumPurch = purchList.reduce((acc, p) => {
        const itemsSum = Array.isArray(p.items) && p.items.length > 0
          ? p.items.reduce((s, it) => s + (Number(it.subtotalBrl) || Number(it.unitPriceBrl || 0) * Number(it.quantity || 1)), 0)
          : 0;
        const effectiveTotal = Number(p.totalAmountBrl) > 0 ? Number(p.totalAmountBrl) : itemsSum;
        return acc + effectiveTotal;
      }, 0);
      const recordedSaleIds = new Set(purchList.filter(p => p.saleId).map(p => p.saleId));
      const recordedCmdNums = new Set(
        purchList
          .map(p => p.comandaNumber?.trim().toLowerCase())
          .filter((cmd): cmd is string => Boolean(cmd))
      );

      const extraSales = (sales || []).filter(
        s =>
          s &&
          (s.customerId === c.id ||
            (s.customerName && s.customerName.trim().toLowerCase() === c.name.trim().toLowerCase())) &&
          !recordedSaleIds.has(s.id) &&
          !(s.comandaNumber && recordedCmdNums.has(s.comandaNumber.trim().toLowerCase()))
      );
      const extraSalesSum = extraSales.reduce((acc, s) => acc + (Number(s.totalBrl) || 0), 0);

      const exactCalculatedTotal = Math.round((sumPurch + extraSalesSum) * 100) / 100;
      const hasRecords = purchList.length > 0 || extraSales.length > 0;
      const finalTotalSpent = hasRecords
        ? exactCalculatedTotal
        : Math.max(c.totalSpentBrl || 0, c.outstandingBalanceBrl || 0);
      const finalCount = hasRecords
        ? purchList.length + extraSales.length
        : Math.max(c.purchaseCount || 0, finalTotalSpent > 0 ? 1 : 0);
      map.set(c.id, { totalSpent: finalTotalSpent, count: finalCount });
    });
    return map;
  }, [customers, customerPurchases, sales]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchSearch = 
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        (c.documentCpf && c.documentCpf.includes(search));
      
      const matchCat = categoryFilter === 'todas' || c.category === categoryFilter;

      let matchTab = true;
      if (activeViewTab === 'debtors') {
        matchTab = c.outstandingBalanceBrl > 0;
      } else if (activeViewTab === 'birthdays') {
        matchTab = Boolean(c.birthday && c.birthday.includes(`/${currentMonthNum}`));
      } else if (onlyDebtors) {
        matchTab = c.outstandingBalanceBrl > 0;
      }

      return matchSearch && matchCat && matchTab;
    });
  }, [customers, search, categoryFilter, activeViewTab, onlyDebtors, currentMonthNum]);

  // Birthday customers count for current month
  const birthdayCount = useMemo(() => {
    return customers.filter(c => c.birthday && c.birthday.includes(`/${currentMonthNum}`)).length;
  }, [customers, currentMonthNum]);

  const getCustomerInitials = (name: string) => {
    if (!name) return 'CL';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // KPIs
  const stats = useMemo(() => {
    const total = customers.length;
    const totalDebtBrl = customers.reduce((acc, c) => acc + c.outstandingBalanceBrl, 0);
    const totalDebtPyg = Math.round(totalDebtBrl);
    const debtorsCount = customers.filter(c => c.outstandingBalanceBrl > 0).length;
    const totalLoyaltyPoints = customers.reduce((acc, c) => acc + c.loyaltyPoints, 0);
    const totalPurchasedAllBrl = customers.reduce(
      (acc, c) => acc + (customerPurchasesStatsMap.get(c.id)?.totalSpent || c.totalSpentBrl || 0),
      0
    );

    return {
      total,
      totalDebtBrl,
      totalDebtPyg,
      debtorsCount,
      totalLoyaltyPoints,
      totalPurchasedAllBrl,
    };
  }, [customers, customerPurchasesStatsMap]);

  // Live conversion for Amortization modal
  const computedAmortizedBrl = useMemo(() => {
    if (!paymentCustomer) return 0;
    const val = parseFloat(payAmount.replace(',', '.')) || 0;
    return val > 0 ? Math.round(val) : 0;
  }, [payAmount, paymentCustomer]);

  const computedRemainingBrl = useMemo(() => {
    if (!paymentCustomer) return 0;
    return Math.max(0, Math.round(paymentCustomer.outstandingBalanceBrl - computedAmortizedBrl));
  }, [paymentCustomer, computedAmortizedBrl]);

  // Live conversion for Manual Debt modal (Direct Guaranís)
  const computedDebtBrl = useMemo(() => {
    if (!debtCustomer) return 0;
    const val = parseFloat(debtAmount.replace(',', '.')) || 0;
    return val > 0 ? Math.round(val) : 0;
  }, [debtAmount, debtCustomer]);

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
    setFormCreditLimit(c.creditLimitBrl.toString());
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

  // Open Payment / Amortization with Guaranis
  const handleOpenPayment = (c: Customer) => {
    setPaymentCustomer(c);
    setPayCurrency('PYG');
    setPayAmount(c.outstandingBalanceBrl > 0 ? Math.round(c.outstandingBalanceBrl).toString() : '');
    setPayMethod('dinheiro');
    setPayNotes('');
  };

  // Handle setting full amount in payment modal
  const handleSelectPayCurrency = () => {
    setPayCurrency('PYG');
    if (!paymentCustomer) return;
    setPayAmount(Math.round(paymentCustomer.outstandingBalanceBrl).toString());
  };

  // Confirm Payment / Amortization
  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentCustomer) return;
    const rawVal = parseFloat(payAmount.replace(',', '.'));
    if (isNaN(rawVal) || rawVal <= 0) return;

    const finalAmountBrl = Math.round(rawVal);
    const detailNote = `Amortização recebida em ₲ ${finalAmountBrl.toLocaleString('es-PY')}.`;
    const fullNote = [detailNote, payNotes.trim()].filter(Boolean).join(' ');

    await recordCustomerPayment(paymentCustomer.id, finalAmountBrl, payMethod, fullNote);

    // If paid in cash and cash register is open, also register Entrada de Caixa in Guaranis
    if (payMethod === 'dinheiro' && currentSession?.status === 'aberto') {
      recordEntradaCaixa(
        finalAmountBrl,
        'PYG',
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
    setDebtCurrency('PYG');
    setDebtAmount('');
    setDebtReason('');
  };

  // Confirm Manual Debt
  const handleConfirmDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtCustomer) return;
    const rawVal = parseFloat(debtAmount.replace(',', '.'));
    if (isNaN(rawVal) || rawVal <= 0) return;

    const finalAmountBrl = Math.round(rawVal);
    const detailNote = `Débito lançado em ₲ ${finalAmountBrl.toLocaleString('es-PY')}.`;
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

  // Generate statement plain text for WhatsApp, TXT or Clipboard
  const getStatementPlainText = (customer: Customer) => {
    const rawEntries = customerEntries.filter(e => e.customerId === customer.id);
    const existingSaleIds = new Set(rawEntries.filter(e => e.saleId).map(e => e.saleId));
    const missingFiadoSales = (sales || []).filter(s => 
      s &&
      s.customerId === customer.id && 
      !existingSaleIds.has(s.id) &&
      Array.isArray(s.payments) &&
      s.payments.some(p => p && p.method === 'fiado')
    );

    const mergedEntries = [...rawEntries];
    missingFiadoSales.forEach(s => {
      const fiadoPay = Array.isArray(s.payments) ? s.payments.find(p => p && p.method === 'fiado') : undefined;
      const amount = fiadoPay ? fiadoPay.amountReceived : s.totalBrl;
      const itemsList = Array.isArray(s.items) ? s.items : [];
      const itemsSummary = itemsList.map(i => `${i.quantity}x ${i.product?.name || (i as any).name || 'Item'}`).join(', ');
      mergedEntries.push({
        id: `auto-${s.id}`,
        customerId: customer.id,
        date: s.timestamp || new Date().toISOString(),
        type: 'debito_compra',
        amountBrl: amount,
        description: `Venda #${s.saleNumber || 'PDV'} no Fiado${itemsSummary ? ` (${itemsSummary})` : ''}`,
        saleId: s.id,
        comandaNumber: s.comandaNumber,
        setorResponsavel: s.setorResponsavel || 'Panificação & Confeitaria Artesanal',
        confirmedByCustomer: true,
        recordedBy: s.employeeName || 'Operador',
      });
    });

    if (mergedEntries.length === 0 && customer.outstandingBalanceBrl > 0) {
      mergedEntries.push({
        id: `initial-${customer.id}`,
        customerId: customer.id,
        date: customer.createdAt || new Date().toISOString(),
        type: 'debito_compra',
        amountBrl: customer.outstandingBalanceBrl,
        description: 'Saldo devedor anterior acumulado',
        setorResponsavel: 'Panificação & Confeitaria Artesanal',
        confirmedByCustomer: true,
        recordedBy: 'Sistema',
      });
    }

    const sorted = [...mergedEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    let text = `🥖 *KORIZKO*\n`;
    text += `*Panificação confeitaria artesanal*\n`;
    text += `📄 *EXTRATO DE CONTA & FIADO (₲ PYG)*\n`;
    text += `--------------------------------\n`;
    text += `👤 *Cliente:* ${customer.name}\n`;
    if (customer.phone) text += `📱 *Telefone:* ${customer.phone}\n`;
    if (customer.documentCpf) text += `📋 *Doc:* ${customer.documentCpf}\n`;
    text += `📅 *Emissão:* ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n`;
    text += `--------------------------------\n`;
    text += `💰 *SALDO ATUAL EM ABERTO: ${formatCurrency(customer.outstandingBalanceBrl, 'PYG')}*\n`;
    text += `💳 *Limite de Crédito:* ${formatCurrency(customer.creditLimitBrl, 'PYG')} | *Fidelidade:* ${customer.loyaltyPoints} pts\n`;
    text += `--------------------------------\n`;
    text += `📝 *LANÇAMENTOS NO EXTRATO:*\n`;
    
    if (sorted.length === 0) {
      text += `Nenhum lançamento registrado até o momento.\n`;
    } else {
      sorted.forEach(entry => {
        const isDebit = entry.type === 'debito_compra';
        const d = new Date(entry.date).toLocaleDateString('pt-BR');
        const sign = isDebit ? '[+] Débito' : '[-] Amortização';
        const saleRef = entry.saleId ? (sales || []).find(s => s.id === entry.saleId) : null;
        const cmdNum = entry.comandaNumber || saleRef?.comandaNumber;
        const setor = entry.setorResponsavel || saleRef?.setorResponsavel || 'Panificação & Confeitaria Artesanal';
        text += `${sign} (${d}): ${isDebit ? '' : '-'}${formatCurrency(entry.amountBrl, 'PYG')}\n`;
        text += `   ↳ ${entry.description}\n`;
        text += `   ↳ ${cmdNum ? `Comanda Confirmada: #${cmdNum} | ` : ''}Setor: ${setor}\n`;
        if (saleRef && Array.isArray(saleRef.items) && saleRef.items.length > 0) {
          saleRef.items.forEach(it => {
            const unit = it.product?.unit || (it as any).unit || 'un';
            const name = it.product?.name || (it as any).name || 'Produto';
            const subtotal = it.subtotalBrl ?? ((it.unitPriceBrl || 0) * (it.quantity || 1));
            text += `     • ${it.quantity} ${unit} × ${name} = ${formatCurrency(subtotal, 'PYG')}\n`;
          });
        }
      });
    }
    
    text += `--------------------------------\n`;
    text += `🔑 *Chave PIX da Padaria:*\n`;
    text += `E-mail / Chave: axxeiacompany@gmail.com\n\n`;
    text += `*Korizko • Panificação confeitaria artesanal* ☕`;
    return text;
  };

  // WhatsApp Message Generator
  const handleSendWhatsAppNotice = (c: Customer) => {
    const cleanPhone = c.phone.replace(/\D/g, '');
    const phoneWithDdi = cleanPhone.startsWith('55') || cleanPhone.startsWith('595') 
      ? cleanPhone 
      : `55${cleanPhone}`;

    const text = encodeURIComponent(getStatementPlainText(c));
    window.open(`https://wa.me/${phoneWithDdi}?text=${text}`, '_blank');
  };

  // Copy statement text to clipboard
  const handleCopyStatement = (c: Customer) => {
    try {
      const text = getStatementPlainText(c);
      navigator.clipboard.writeText(text);
      setStatementCopied(true);
      showToast(
        language === 'es' ? '¡Extracto copiado al portapapeles!' : 'Extrato copiado para a área de transferência!',
        'success'
      );
      setTimeout(() => setStatementCopied(false), 2500);
    } catch {
      showToast('Não foi possível copiar automaticamente.', 'error');
    }
  };

  // Export statement as TXT file
  const handleDownloadStatementTxt = (c: Customer) => {
    const text = getStatementPlainText(c);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `extrato-${c.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(language === 'es' ? 'Archivo de extracto descargado' : 'Arquivo de extrato baixado com sucesso', 'success');
  };

  // Computed entries for statement modal with running balance and filters
  const { filteredStatementEntries, statementTotals } = useMemo(() => {
    if (!statementCustomer) {
      return {
        filteredStatementEntries: [],
        statementTotals: { totalDebits: 0, totalAmortized: 0, debitCount: 0, amortizedCount: 0, lastMovement: null }
      };
    }

    const rawEntries = customerEntries.filter(e => e.customerId === statementCustomer.id);
    const existingSaleIds = new Set(rawEntries.filter(e => e.saleId).map(e => e.saleId));
    const missingFiadoSales = (sales || []).filter(s => 
      s &&
      s.customerId === statementCustomer.id && 
      !existingSaleIds.has(s.id) &&
      Array.isArray(s.payments) &&
      s.payments.some(p => p && p.method === 'fiado')
    );

    const mergedEntries = [...rawEntries];
    missingFiadoSales.forEach(s => {
      const fiadoPay = Array.isArray(s.payments) ? s.payments.find(p => p && p.method === 'fiado') : undefined;
      const amount = fiadoPay ? fiadoPay.amountReceived : s.totalBrl;
      const itemsList = Array.isArray(s.items) ? s.items : [];
      const itemsSummary = itemsList.map(i => `${i.quantity}x ${i.product?.name || (i as any).name || 'Item'}`).join(', ');
      mergedEntries.push({
        id: `auto-${s.id}`,
        customerId: statementCustomer.id,
        date: s.timestamp || new Date().toISOString(),
        type: 'debito_compra',
        amountBrl: amount,
        description: `Venda #${s.saleNumber || 'PDV'} no Fiado${itemsSummary ? ` (${itemsSummary})` : ''}`,
        saleId: s.id,
        comandaNumber: s.comandaNumber,
        setorResponsavel: s.setorResponsavel || 'Panificação & Confeitaria Artesanal',
        confirmedByCustomer: true,
        recordedBy: s.employeeName || 'Operador',
      });
    });

    if (mergedEntries.length === 0 && statementCustomer.outstandingBalanceBrl > 0) {
      mergedEntries.push({
        id: `initial-${statementCustomer.id}`,
        customerId: statementCustomer.id,
        date: statementCustomer.createdAt || new Date().toISOString(),
        type: 'debito_compra',
        amountBrl: statementCustomer.outstandingBalanceBrl,
        description: 'Saldo devedor anterior acumulado',
        setorResponsavel: 'Panificação & Confeitaria Artesanal',
        confirmedByCustomer: true,
        recordedBy: 'Sistema',
      });
    }

    // Calculate totals across ALL entries
    let totalDebits = 0;
    let totalAmortized = 0;
    let debitCount = 0;
    let amortizedCount = 0;

    mergedEntries.forEach(e => {
      if (e.type === 'debito_compra') {
        totalDebits += e.amountBrl;
        debitCount++;
      } else {
        totalAmortized += e.amountBrl;
        amortizedCount++;
      }
    });

    const sortedByDateDesc = [...mergedEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastMovement = sortedByDateDesc[0] || null;

    // Calculate running balance by sorting ascending first
    const sortedAsc = [...mergedEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let running = 0;
    const withRunning = sortedAsc.map(entry => {
      const isDebit = entry.type === 'debito_compra';
      running += isDebit ? entry.amountBrl : -entry.amountBrl;
      return {
        ...entry,
        runningBalanceBrl: Math.round(running * 100) / 100,
      };
    });

    // Reverse to display newest first
    const sortedDesc = withRunning.reverse();

    // Filter by period
    const now = new Date();
    const periodFiltered = sortedDesc.filter(entry => {
      if (statementPeriodFilter === 'all') return true;
      const entryDate = new Date(entry.date);
      const diffMs = now.getTime() - entryDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (statementPeriodFilter === '7d') return diffDays <= 7;
      if (statementPeriodFilter === '30d') return diffDays <= 30;
      if (statementPeriodFilter === 'month') {
        return entryDate.getMonth() === now.getMonth() && entryDate.getFullYear() === now.getFullYear();
      }
      return true;
    });

    // Filter by type
    const typeFiltered = periodFiltered.filter(entry => {
      if (statementTypeFilter === 'all') return true;
      if (statementTypeFilter === 'debito') return entry.type === 'debito_compra';
      if (statementTypeFilter === 'amortizacao') return entry.type === 'pagamento_amortizacao';
      return true;
    });

    // Filter by search
    let finalEntries = typeFiltered;
    if (statementSearch.trim()) {
      const term = statementSearch.toLowerCase().trim();
      finalEntries = typeFiltered.filter(entry =>
        entry.description.toLowerCase().includes(term) ||
        (entry.paymentMethod && entry.paymentMethod.toLowerCase().includes(term)) ||
        (entry.recordedBy && entry.recordedBy.toLowerCase().includes(term)) ||
        entry.amountBrl.toString().includes(term)
      );
    }

    return {
      filteredStatementEntries: finalEntries,
      statementTotals: {
        totalDebits: Math.round(totalDebits * 100) / 100,
        totalAmortized: Math.round(totalAmortized * 100) / 100,
        debitCount,
        amortizedCount,
        lastMovement,
      }
    };
  }, [statementCustomer, customerEntries, sales, statementPeriodFilter, statementTypeFilter, statementSearch]);

  // Filtered entries for the clean Histórico de Fiado tab
  const filteredHistoryEntries = useMemo(() => {
    let list = [...(customerEntries || [])];
    if (historyTypeFilter === 'debito') {
      list = list.filter(e => e.type === 'debito_compra');
    } else if (historyTypeFilter === 'amortizacao') {
      list = list.filter(e => e.type === 'pagamento_amortizacao');
    }
    if (historySearch.trim()) {
      const term = historySearch.toLowerCase().trim();
      list = list.filter(e => {
        const cust = customers.find(c => c.id === e.customerId);
        return (
          (e.description && e.description.toLowerCase().includes(term)) ||
          (cust && cust.name.toLowerCase().includes(term)) ||
          (e.comandaNumber && e.comandaNumber.toLowerCase().includes(term)) ||
          (e.recordedBy && e.recordedBy.toLowerCase().includes(term))
        );
      });
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [customerEntries, historyTypeFilter, historySearch, customers]);

  // Live Fiado on-screen feed (ensures all fiado debits and cash amortizations are ALWAYS visible on screen)
  const { liveFiadoEntries, liveFiadoTotals } = useMemo(() => {
    let list: CustomerAccountEntry[] = [...(customerEntries || [])];

    // Ensure any customer who has an outstanding balance > 0 has an authoritative debit record visible
    const existingDebitCustIds = new Set(list.filter(e => e.type === 'debito_compra').map(e => e.customerId));
    customers.forEach(c => {
      if (c.outstandingBalanceBrl > 0 && !existingDebitCustIds.has(c.id)) {
        list.push({
          id: `entry-debt-${c.id}`,
          customerId: c.id,
          customerName: c.name,
          date: c.lastPurchaseDate || new Date().toISOString(),
          type: 'debito_compra',
          amountBrl: c.outstandingBalanceBrl,
          description: 'Compra no Fiado / Comanda Balcão',
          comandaNumber: '01',
          setorResponsavel: 'Panificação & Confeitaria Artesanal',
          recordedBy: 'Caixa Principal',
        });
      }
    });

    const totalDebits = list
      .filter(e => e.type === 'debito_compra')
      .reduce((acc, e) => acc + (Number(e.amountBrl) || 0), 0);
    const totalAmortized = list
      .filter(e => e.type === 'pagamento_amortizacao')
      .reduce((acc, e) => acc + (Number(e.amountBrl) || 0), 0);
    const debitCount = list.filter(e => e.type === 'debito_compra').length;
    const amortizedCount = list.filter(e => e.type === 'pagamento_amortizacao').length;

    if (liveFiadoFilter === 'debito') {
      list = list.filter(e => e.type === 'debito_compra');
    } else if (liveFiadoFilter === 'amortizacao') {
      list = list.filter(e => e.type === 'pagamento_amortizacao');
    }

    if (liveFiadoSearch.trim()) {
      const term = liveFiadoSearch.toLowerCase().trim();
      list = list.filter(e => {
        const cust = customers.find(c => c.id === e.customerId);
        return (
          (e.description && e.description.toLowerCase().includes(term)) ||
          (cust && cust.name.toLowerCase().includes(term)) ||
          (e.customerName && e.customerName.toLowerCase().includes(term)) ||
          (e.comandaNumber && e.comandaNumber.toLowerCase().includes(term)) ||
          (e.recordedBy && e.recordedBy.toLowerCase().includes(term))
        );
      });
    }

    const sortedList = list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      liveFiadoEntries: sortedList,
      liveFiadoTotals: {
        totalDebits,
        totalAmortized,
        netPending: Math.max(0, totalDebits - totalAmortized),
        debitCount,
        amortizedCount,
        totalCount: debitCount + amortizedCount,
      }
    };
  }, [customerEntries, customers, liveFiadoFilter, liveFiadoSearch]);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-x-hidden pb-24 lg:pb-0">
      
      {/* Top Banner - Limpo e Objetivo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-[#0D121E] border border-[#1E273A] shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
              {language === 'es' ? 'Gestión de Clientes & Fiado' : 'CRM & Gestão de Clientes'}
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5 truncate">
              Korizko • Panificação confeitaria artesanal — Controle simplificado de clientes, fiado e pagamentos
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {onNavigateClientes && (
            <button
              type="button"
              onClick={onNavigateClientes}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#080B12] hover:bg-neutral-800 border border-[#1C2538] text-indigo-300 hover:text-indigo-200 text-xs font-semibold transition-all cursor-pointer"
              title="Ir para o Diretório & Cadastro de Clientes"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Cadastro de Clientes →</span>
            </button>
          )}

          {canManage && (
            <>
              {/* Toggle Gráficos Financeiros */}
              <button
                type="button"
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  showAnalytics 
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                    : 'bg-[#080B12] border-[#1C2538] text-neutral-300 hover:text-white hover:bg-neutral-800'
                }`}
                title="Exibir ou ocultar painel de gráficos e ranking de compras"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>{showAnalytics ? 'Ocultar Gráficos' : 'Gráficos & Análise'}</span>
              </button>

              {currentUser?.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => zeroAllNumbersForRealTest()}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600/15 hover:bg-rose-600 border border-rose-500/30 text-rose-300 hover:text-white font-bold text-xs transition-all cursor-pointer active:scale-95"
                  title="Zerar todos os números para iniciar teste real (Exclusivo Admin)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Zerar Teste</span>
                </button>
              )}

              <button
                onClick={handleOpenCreate}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-neutral-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>{language === 'es' ? '+ Nuevo Cliente' : '+ Novo Cliente'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards - Fáceis de ler e com atalho para filtrar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        <button
          type="button"
          onClick={() => setActiveViewTab('all')}
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeViewTab === 'all'
              ? 'bg-[#121829] border-amber-500/40 shadow-md shadow-amber-500/10'
              : 'bg-[#0D121E] border-[#1E273A] hover:border-neutral-700'
          }`}
        >
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span className="truncate">Total de Clientes</span>
            <Users className="w-4 h-4 text-amber-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white font-mono-nums">
            {stats.total}
          </div>
          <p className="text-[10px] text-neutral-500 mt-0.5 truncate">Clique para ver todos</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveViewTab('debtors')}
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeViewTab === 'debtors'
              ? 'bg-rose-950/30 border-rose-500/50 shadow-md shadow-rose-950/20'
              : 'bg-[#0D121E] border-[#1E273A] hover:border-rose-900/50'
          }`}
        >
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span className="truncate">Total Fiado (A Receber)</span>
            <DollarSign className="w-4 h-4 text-rose-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-rose-400 font-mono-nums truncate">
            {formatCurrency(stats.totalDebtBrl, 'PYG')}
          </div>
          <p className="text-[10px] text-neutral-500 mt-0.5 truncate">
            Moeda oficial: Guaraní (₲)
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveViewTab('debtors')}
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeViewTab === 'debtors'
              ? 'bg-amber-950/30 border-amber-500/50 shadow-md shadow-amber-950/20'
              : 'bg-[#0D121E] border-[#1E273A] hover:border-amber-900/50'
          }`}
        >
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span className="truncate">Clientes com Fiado</span>
            <CreditCard className="w-4 h-4 text-amber-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-400 font-mono-nums">
            {stats.debtorsCount}
          </div>
          <p className="text-[10px] text-neutral-500 mt-0.5 truncate">Clique para filtrar devedores</p>
        </button>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0D121E] border border-[#1E273A]">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span className="truncate">Total Comprado (Geral)</span>
            <ShoppingBag className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono-nums truncate">
            {formatCurrency(stats.totalPurchasedAllBrl, 'PYG')}
          </div>
          <p className="text-[10px] text-neutral-500 mt-0.5 truncate">Histórico consolidado</p>
        </div>

      </div>

      {/* Painel de Gráficos e Análise Financeira (Colapsável para não poluir a tela) */}
      {showAnalytics && (
        <div className="p-4 sm:p-6 rounded-2xl bg-[#0D121E] border border-amber-500/30 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Análise Gráfica & Ranking de Compras</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowAnalytics(false)}
              className="text-xs text-neutral-400 hover:text-white px-2.5 py-1 rounded-lg bg-neutral-800 cursor-pointer"
            >
              Fechar Análise ✕
            </button>
          </div>
          <FinancialPurchasesAnalytics
            onSelectCustomer={c => setPurchasesCustomer(c)}
            defaultExpanded={true}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAINEL VISÍVEL NA TELA: REGISTROS DE FIADOS QUE ENTRARAM & AMORTIZAÇÕES EM TEMPO REAL */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0D121E] border border-amber-500/40 shadow-2xl space-y-4">
        
        {/* Cabeçalho do Painel */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <BookOpen className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white tracking-tight uppercase">
                Registros de Fiados & Entradas
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Todas as compras no fiado e pagamentos que entraram no caixa com data, comanda e operador
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsLiveFiadoExpanded(!isLiveFiadoExpanded)}
              className="px-3 py-1.5 rounded-xl bg-[#080B12] hover:bg-neutral-800 border border-[#1C2538] text-xs font-semibold text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {isLiveFiadoExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Recolher</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Mostrar ({liveFiadoTotals.totalCount})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Resumo Financeiro do Fiado */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="p-3 rounded-xl bg-rose-950/25 border border-rose-500/30 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-rose-300 font-bold block uppercase tracking-wider">
                Compras no Fiado (Débitos)
              </span>
              <span className="text-base sm:text-lg font-black font-mono-nums text-rose-400 block mt-0.5">
                +{formatCurrency(liveFiadoTotals.totalDebits, 'PYG')}
              </span>
            </div>
            <span className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-[11px] font-bold font-mono">
              {liveFiadoTotals.debitCount} {liveFiadoTotals.debitCount === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-950/25 border border-emerald-500/30 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-emerald-300 font-bold block uppercase tracking-wider">
                Pagamentos Recebidos (Entrou no Caixa)
              </span>
              <span className="text-base sm:text-lg font-black font-mono-nums text-emerald-400 block mt-0.5">
                -{formatCurrency(liveFiadoTotals.totalAmortized, 'PYG')}
              </span>
            </div>
            <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[11px] font-bold font-mono">
              {liveFiadoTotals.amortizedCount} {liveFiadoTotals.amortizedCount === 1 ? 'pagamento' : 'pagamentos'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-amber-950/25 border border-amber-500/30 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-amber-300 font-bold block uppercase tracking-wider">
                Saldo Pendente a Cobrar
              </span>
              <span className="text-base sm:text-lg font-black font-mono-nums text-amber-400 block mt-0.5">
                {formatCurrency(liveFiadoTotals.netPending, 'PYG')}
              </span>
            </div>
            <span className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-[11px] font-bold">
              {stats.debtorsCount} devedores
            </span>
          </div>
        </div>

        {/* Conteúdo Expansível do Painel */}
        {isLiveFiadoExpanded && (
          <div className="space-y-3 pt-2 border-t border-neutral-800">
            
            {/* Barra de Filtros & Busca do Fiado */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
                <input
                  type="text"
                  value={liveFiadoSearch}
                  onChange={(e) => setLiveFiadoSearch(e.target.value)}
                  placeholder="Filtrar por cliente, comanda ou operador..."
                  className="w-full pl-8 pr-3 py-1.5 bg-[#080B12] border border-[#1C2538] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <button
                  type="button"
                  onClick={() => setLiveFiadoFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                    liveFiadoFilter === 'all'
                      ? 'bg-amber-500 text-neutral-950 shadow'
                      : 'bg-[#080B12] text-neutral-400 hover:text-white border border-[#1C2538]'
                  }`}
                >
                  Todos ({liveFiadoTotals.totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setLiveFiadoFilter('debito')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                    liveFiadoFilter === 'debito'
                      ? 'bg-rose-500 text-white shadow'
                      : 'bg-[#080B12] text-rose-300 hover:bg-rose-950/30 border border-rose-900/40'
                  }`}
                >
                  🔴 Compras no Fiado ({liveFiadoTotals.debitCount})
                </button>
                <button
                  type="button"
                  onClick={() => setLiveFiadoFilter('amortizacao')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                    liveFiadoFilter === 'amortizacao'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-[#080B12] text-emerald-300 hover:bg-emerald-950/30 border border-emerald-900/40'
                  }`}
                >
                  🟢 Pagamentos Recebidos ({liveFiadoTotals.amortizedCount})
                </button>
              </div>
            </div>

            {/* Quick action chips for registered customers (Leo, Jiéssica, Damasceno) */}
            {customers && customers.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5">
                <span className="text-[11px] text-neutral-400 font-semibold shrink-0">Lançar fiado rápido:</span>
                {customers.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleOpenDebt(c)}
                    className="px-2.5 py-1 rounded-xl bg-[#080B12] hover:bg-neutral-800 text-xs font-semibold text-neutral-200 hover:text-white border border-[#1C2538] hover:border-amber-500/40 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm active:scale-95"
                    title={`Lançar fiado para ${c.name}`}
                  >
                    <Plus className="w-3 h-3 text-rose-400 stroke-[3]" />
                    <span>{c.name}</span>
                    {c.outstandingBalanceBrl > 0 && (
                      <span className="text-[10px] text-rose-400 font-mono font-bold">
                        ({formatCurrency(c.outstandingBalanceBrl, 'PYG')})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}


            {/* Lista dos Registros de Fiado que Entraram */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto overscroll-contain pr-1">
              {liveFiadoEntries.length === 0 ? (
                <div className="text-center py-8 bg-[#080B12] border border-dashed border-[#1C2538] rounded-xl">
                  <BookOpen className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-neutral-300">
                    Nenhum registro de fiado ou pagamento encontrado para este filtro.
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Assim que uma venda for concluída no fiado ou um pagamento for recebido, ela aparecerá aqui na hora.
                  </p>
                </div>
              ) : (
                liveFiadoEntries.map(entry => {
                  const isDebit = entry.type === 'debito_compra';
                  const cust = customers.find(c => c.id === entry.customerId);
                  const custName = cust?.name || entry.customerName || 'Cliente Cadastrado';

                  return (
                    <div
                      key={entry.id}
                      className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                        isDebit
                          ? 'bg-[#090D18] border-rose-500/35 hover:border-rose-500/60 shadow-sm'
                          : 'bg-[#090D18] border-emerald-500/35 hover:border-emerald-500/60 shadow-sm'
                      }`}
                    >
                      {/* Left: Badge, Customer, Details, Date */}
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 mt-0.5 sm:mt-0 ${
                          isDebit 
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {isDebit ? <Plus className="w-4 h-4 stroke-[3]" /> : <Check className="w-4 h-4 stroke-[3]" />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                              isDebit 
                                ? 'bg-rose-500/25 text-rose-200 border border-rose-500/40' 
                                : 'bg-emerald-500/25 text-emerald-200 border border-emerald-500/40'
                            }`}>
                              {isDebit ? '🔴 + COMPRA NO FIADO' : '🟢 - PAGAMENTO RECEBIDO'}
                            </span>
                            
                            <span className="font-bold text-white text-xs truncate">
                              {custName}
                            </span>

                            {entry.comandaNumber && (
                              <span className="font-mono text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded">
                                Comanda #{entry.comandaNumber}
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-neutral-300 mt-1 truncate">
                            {entry.description || (isDebit ? 'Compra no Fiado' : 'Amortização de Fiado')}
                          </p>

                          <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono mt-0.5">
                            <span>{new Date(entry.date).toLocaleString('pt-BR')}</span>
                            <span>•</span>
                            <span>Op: {entry.recordedBy || 'Caixa'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Valor em Guaranis & Botões de Ação */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                        <div className="text-left sm:text-right">
                          <span className={`text-base sm:text-lg font-black font-mono-nums block ${
                            isDebit ? 'text-rose-400' : 'text-emerald-400'
                          }`}>
                            {isDebit ? '+' : '-'}{formatCurrency(entry.amountBrl, 'PYG')}
                          </span>
                          <span className="text-[10px] text-neutral-500 block">
                            {isDebit ? 'Lançado na conta' : 'Entrou no Caixa'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {cust && (
                            <>
                              <button
                                type="button"
                                onClick={() => setStatementCustomer(cust)}
                                className="px-2.5 py-1.5 rounded-lg bg-[#080B12] hover:bg-neutral-800 border border-[#1C2538] text-amber-300 hover:text-amber-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Ver extrato completo deste cliente"
                              >
                                <Receipt className="w-3 h-3" />
                                <span>Extrato</span>
                              </button>

                              {isDebit && cust.phone && (
                                <button
                                  type="button"
                                  onClick={() => handleSendWhatsAppNotice(cust)}
                                  className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 transition-colors cursor-pointer"
                                  title="Enviar extrato de cobrança no WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {isDebit && cust.outstandingBalanceBrl > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPayment(cust)}
                                  className="px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow"
                                  title="Receber pagamento deste débito"
                                >
                                  Receber
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

      </div>

      {/* Abas Principais de Navegação - Super Simples e Fáceis */}
      <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-[#0D121E] border border-[#1E273A] overflow-x-auto scrollbar-none">
        
        <button
          type="button"
          onClick={() => setActiveViewTab('all')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeViewTab === 'all'
              ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Todos os Clientes</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${activeViewTab === 'all' ? 'bg-black/20 text-neutral-950 font-bold' : 'bg-neutral-800 text-neutral-300'}`}>
            {stats.total}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveViewTab('debtors')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeViewTab === 'debtors'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
              : 'text-neutral-400 hover:text-rose-300 hover:bg-rose-950/20'
          }`}
        >
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>Contas a Receber (Fiado)</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${activeViewTab === 'debtors' ? 'bg-white/20 text-white font-bold' : 'bg-rose-950/40 text-rose-300'}`}>
            {stats.debtorsCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveViewTab('birthdays')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeViewTab === 'birthdays'
              ? 'bg-pink-600 text-white shadow-md shadow-pink-600/20'
              : 'text-neutral-400 hover:text-pink-300 hover:bg-pink-950/20'
          }`}
        >
          <span>🎂 Aniversariantes</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${activeViewTab === 'birthdays' ? 'bg-white/20 text-white font-bold' : 'bg-pink-950/40 text-pink-300'}`}>
            {birthdayCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveViewTab('history')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeViewTab === 'history'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
              : 'text-neutral-400 hover:text-sky-300 hover:bg-sky-950/20'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Histórico & Movimentações</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${activeViewTab === 'history' ? 'bg-white/20 text-white font-bold' : 'bg-sky-950/40 text-sky-300'}`}>
            {customerEntries?.length || 0}
          </span>
        </button>

      </div>

      {/* VISÃO 1: LISTA OU TABELA DE CLIENTES */}
      {activeViewTab !== 'history' && (
        <div className="space-y-4">
          
          {/* Barra de Busca, Categoria e Alternância de Visualização */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-[#0D121E] border border-[#1E273A]">
            
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                id="crm-search-input"
                name="crmSearch"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={language === 'es' ? 'Buscar por nombre, WhatsApp o documento...' : 'Buscar cliente por nome, WhatsApp ou CPF...'}
                className="w-full pl-9 pr-8 py-2 bg-[#080B12] border border-[#1C2538] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
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
                id="crm-category-filter"
                name="categoryFilter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 bg-[#080B12] border border-[#1C2538] rounded-xl text-xs text-neutral-300 focus:outline-none focus:border-amber-500 shrink-0 cursor-pointer"
              >
                <option value="todas">Todas as Categorias</option>
                <option value="varejo">Varejo (Balcão)</option>
                <option value="mensalista">Mensalista (Fiado)</option>
                <option value="empresa">Empresa / PJ</option>
                <option value="confeitaria">Confeitaria</option>
              </select>

              {/* Modo de exibição: Cartões vs Tabela */}
              <div className="flex items-center rounded-xl bg-[#080B12] border border-[#1C2538] p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setDisplayMode('cards')}
                  className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    displayMode === 'cards' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Exibir em Cartões Visuais"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode('table')}
                  className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    displayMode === 'table' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Exibir em Tabela Compacta"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

          {/* MODO CARDS (Visual, limpo e direto) */}
          {displayMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {filteredCustomers.map(cust => {
                const hasDebt = cust.outstandingBalanceBrl > 0;
                const isOverLimit = cust.creditLimitBrl > 0 && cust.outstandingBalanceBrl > cust.creditLimitBrl;
                const isBirthdayMonth = cust.birthday && cust.birthday.includes(`/${currentMonthNum}`);
                const pStats = customerPurchasesStatsMap.get(cust.id) || {
                  totalSpent: cust.totalSpentBrl || 0,
                  count: cust.purchaseCount || 0,
                };
                const initials = getCustomerInitials(cust.name);

                return (
                  <div 
                    key={cust.id}
                    className={`p-4 sm:p-5 rounded-2xl bg-[#0D121E] border transition-all flex flex-col justify-between ${
                      isOverLimit 
                        ? 'border-rose-500/50 shadow-lg shadow-rose-950/20' 
                        : hasDebt 
                        ? 'border-amber-500/40 hover:border-amber-500/60' 
                        : 'border-[#1E273A] hover:border-neutral-700'
                    }`}
                  >
                    <div>
                      {/* Top: Avatar, Name, Phone & WhatsApp */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                            hasDebt 
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
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
                            <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
                              <span className="font-mono">{cust.phone || 'Sem telefone'}</span>
                              {cust.phone && (
                                <button
                                  type="button"
                                  onClick={() => handleSendWhatsAppNotice(cust)}
                                  className="text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer p-0.5"
                                  title="Enviar Extrato no WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
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

                      {/* Financial Status Box - O Mais Importante */}
                      <div className={`p-3.5 rounded-xl mb-3 ${
                        hasDebt 
                          ? 'bg-rose-950/25 border border-rose-500/30' 
                          : 'bg-[#080B12] border border-[#1C2538]'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-neutral-400 block font-medium">
                              {hasDebt ? 'Saldo a Receber (Fiado)' : 'Situação da Conta'}
                            </span>
                            <div className="flex items-baseline gap-1.5 mt-0.5">
                              <span className={`text-lg sm:text-xl font-black font-mono-nums ${hasDebt ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {hasDebt ? formatCurrency(cust.outstandingBalanceBrl, 'PYG') : '✅ Em Dia (R$ 0)'}
                              </span>
                            </div>
                          </div>

                          {hasDebt && (
                            <button
                              type="button"
                              onClick={() => handleSendWhatsAppNotice(cust)}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Enviar aviso de cobrança via WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Cobrar</span>
                            </button>
                          )}
                        </div>

                        {/* Credit limit info */}
                        <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-400">
                          <span>Limite: <strong>{formatCurrency(cust.creditLimitBrl, 'PYG')}</strong></span>
                          <span className={isOverLimit ? 'text-rose-400 font-bold' : 'text-neutral-500'}>
                            {isOverLimit 
                              ? 'Limite Excedido!' 
                              : hasDebt ? `${Math.round((cust.outstandingBalanceBrl / (cust.creditLimitBrl || 1)) * 100)}% usado` : '100% liberado'}
                          </span>
                        </div>
                      </div>

                      {/* Mini Resumo: Total Comprado & Fidelidade */}
                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <button
                          type="button"
                          onClick={() => setPurchasesCustomer(cust)}
                          className="p-2 rounded-xl bg-[#080B12] hover:bg-neutral-800/80 border border-[#1C2538] transition-all text-left cursor-pointer group"
                          title="Clique para ver o histórico detalhado de compras deste cliente"
                        >
                          <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                            <ShoppingBag className="w-3 h-3 text-amber-400" />
                            <span>Total Comprado</span>
                          </span>
                          <span className="font-bold text-white group-hover:text-amber-300 font-mono-nums block mt-0.5">
                            {formatCurrency(pStats.totalSpent, 'PYG')}
                          </span>
                          <span className="text-[9px] text-neutral-500 block">
                            {pStats.count} {pStats.count === 1 ? 'compra' : 'compras'} →
                          </span>
                        </button>

                        <div className="p-2 rounded-xl bg-[#080B12] border border-[#1C2538] flex flex-col justify-center">
                          <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                            <Award className="w-3 h-3 text-amber-400" />
                            <span>Fidelidade</span>
                          </span>
                          <span className="font-bold text-amber-400 font-mono-nums block mt-0.5">
                            {cust.loyaltyPoints} pontos
                          </span>
                          {cust.loyaltyPoints >= 50 && (
                            <button
                              type="button"
                              onClick={() => handleOpenLoyalty(cust)}
                              className="text-[9px] text-amber-300 hover:underline text-left cursor-pointer"
                            >
                              Resgatar desconto →
                            </button>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* AÇÕES PRINCIPAIS - 3 BOTÕES CLAROS E ÓBVIOS */}
                    <div className="pt-3 border-t border-[#1C2538] space-y-2">
                      <div className="grid grid-cols-3 gap-1.5">
                        
                        {/* 1. Receber Pagamento */}
                        <button
                          type="button"
                          disabled={!hasDebt}
                          onClick={() => handleOpenPayment(cust)}
                          className={`py-2 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            hasDebt 
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 active:scale-95' 
                              : 'bg-neutral-800/40 text-neutral-500 cursor-not-allowed'
                          }`}
                          title={hasDebt ? 'Receber pagamento ou amortização' : 'Cliente sem débitos pendentes'}
                        >
                          <DollarSign className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Receber</span>
                        </button>

                        {/* 2. Lançar Fiado */}
                        <button
                          type="button"
                          onClick={() => handleOpenDebt(cust)}
                          className="py-2 px-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
                          title="Lançar nova compra no fiado para este cliente"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>+ Fiado</span>
                        </button>

                        {/* 3. Extrato */}
                        <button
                          type="button"
                          onClick={() => setStatementCustomer(cust)}
                          className="py-2 px-1 rounded-xl bg-[#080B12] hover:bg-neutral-800 border border-[#1C2538] text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                          title="Ver extrato completo e comprovante térmico"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Extrato</span>
                        </button>

                      </div>

                      {/* Ações Secundárias (Editar / Excluir) */}
                      {canManage && (
                        <div className="flex items-center justify-end gap-2 text-xs pt-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(cust)}
                            className="text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Editar</span>
                          </button>
                          <span className="text-neutral-600">•</span>
                          <button
                            type="button"
                            onClick={() => setCustomerToDelete(cust)}
                            className="text-rose-400/80 hover:text-rose-300 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Excluir</span>
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {/* MODO TABELA (Rápido, compacto para caixas e balcão) */}
          {displayMode === 'table' && (
            <div className="bg-[#0D121E] border border-[#1E273A] rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#080B12] border-b border-[#1E273A] text-neutral-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3.5 font-semibold">Cliente</th>
                      <th className="p-3.5 font-semibold">Contato / WhatsApp</th>
                      <th className="p-3.5 font-semibold">Categoria</th>
                      <th className="p-3.5 font-semibold text-right">Saldo Devedor (Fiado)</th>
                      <th className="p-3.5 font-semibold text-right">Total Comprado</th>
                      <th className="p-3.5 font-semibold text-center">Ações Rápidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C2538]">
                    {filteredCustomers.map(cust => {
                      const hasDebt = cust.outstandingBalanceBrl > 0;
                      const pStats = customerPurchasesStatsMap.get(cust.id) || {
                        totalSpent: cust.totalSpentBrl || 0,
                        count: cust.purchaseCount || 0,
                      };
                      return (
                        <tr key={cust.id} className="hover:bg-neutral-800/30 transition-colors">
                          <td className="p-3.5 font-bold text-white">
                            <div className="flex items-center gap-2">
                              <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] ${
                                hasDebt ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                              }`}>
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
                                  onClick={() => handleSendWhatsAppNotice(cust)}
                                  className="text-emerald-400 hover:text-emerald-300"
                                  title="Enviar no WhatsApp"
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
                          <td className="p-3.5 text-right font-mono font-bold">
                            <span className={hasDebt ? 'text-rose-400 text-sm' : 'text-emerald-400'}>
                              {hasDebt ? formatCurrency(cust.outstandingBalanceBrl, 'PYG') : 'R$ 0 (Em dia)'}
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-mono text-neutral-300">
                            <button
                              type="button"
                              onClick={() => setPurchasesCustomer(cust)}
                              className="text-amber-400 hover:underline cursor-pointer"
                            >
                              {formatCurrency(pStats.totalSpent, 'PYG')}
                            </button>
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {hasDebt && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPayment(cust)}
                                  className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer"
                                  title="Receber Pagamento"
                                >
                                  Receber
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenDebt(cust)}
                                className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-600 hover:text-white font-bold text-[11px] cursor-pointer"
                                title="Lançar Fiado"
                              >
                                + Fiado
                              </button>
                              <button
                                type="button"
                                onClick={() => setStatementCustomer(cust)}
                                className="px-2 py-1 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white font-medium text-[11px] cursor-pointer"
                                title="Abrir Extrato"
                              >
                                Extrato
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(cust)}
                                className="p-1 rounded-lg text-neutral-400 hover:text-white"
                                title="Editar Cliente"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Estado Vazio de Busca */}
          {filteredCustomers.length === 0 && (
            <div className="text-center py-12 bg-[#0D121E]/60 border border-dashed border-[#1E273A] rounded-2xl">
              <Users className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-neutral-300">
                Nenhum cliente encontrado
              </h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                {search ? 'Tente verificar a ortografia ou limpar os filtros de busca.' : 'Cadastre seus clientes para gerenciar contas de fiado e fidelidade com facilidade.'}
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

        </div>
      )}

      {/* VISÃO 2: ABA DE HISTÓRICO & MOVIMENTAÇÕES (TUDO ORGANIZADO AQUI SEM POLUIR A TELA PRINCIPAL) */}
      {activeViewTab === 'history' && (
        <div className="space-y-4">
          
          {/* Header e Filtros do Histórico */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-[#0D121E] border border-[#1E273A]">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                id="crm-history-search"
                name="historySearch"
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Buscar por cliente, comanda ou operador..."
                className="w-full pl-9 pr-4 py-2 bg-[#080B12] border border-[#1C2538] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
              <div className="flex items-center bg-[#080B12] border border-[#1C2538] rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    historyTypeFilter === 'all' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Todos ({customerEntries?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter('debito')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    historyTypeFilter === 'debito' ? 'bg-rose-500 text-white font-bold' : 'text-neutral-400 hover:text-rose-300'
                  }`}
                >
                  Débitos (+ Fiado)
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter('amortizacao')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    historyTypeFilter === 'amortizacao' ? 'bg-emerald-600 text-white font-bold' : 'text-neutral-400 hover:text-emerald-300'
                  }`}
                >
                  Pagamentos (- Amortizações)
                </button>
              </div>

              {currentUser?.role === 'admin' && customerEntries && customerEntries.length > 0 && (
                <button
                  type="button"
                  onClick={() => clearAllCustomerEntries()}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shrink-0"
                  title="Limpar todos os registros de fiado (Exclusivo Admin)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar Histórico</span>
                </button>
              )}
            </div>
          </div>


          {/* Lista de Registros do Histórico */}
          <div className="space-y-2">
            {filteredHistoryEntries.map(entry => {
              const isDebit = entry.type === 'debito_compra';
              const cust = customers.find(c => c.id === entry.customerId);
              return (
                <div
                  key={entry.id}
                  className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 transition-all ${
                    isDebit
                      ? 'bg-[#0D121E] border-rose-500/30 hover:border-rose-500/50'
                      : 'bg-[#0D121E] border-emerald-500/30 hover:border-emerald-500/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                      isDebit ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'
                    }`}>
                      {isDebit ? <Plus className="w-4 h-4 stroke-[3]" /> : <Check className="w-4 h-4 stroke-[3]" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                          isDebit ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {isDebit ? 'FIADO / DÉBITO' : 'PAGAMENTO / AMORTIZAÇÃO'}
                        </span>
                        <span className="font-bold text-white text-xs truncate">
                          {cust?.name || (entry as any).customerName || 'Cliente'}
                        </span>
                        {entry.comandaNumber && (
                          <span className="font-mono text-[10px] font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            #{entry.comandaNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-300 mt-1 truncate">
                        {entry.description}
                      </p>
                      <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                        {new Date(entry.date).toLocaleString('pt-BR')} {entry.recordedBy ? `• Operador: ${entry.recordedBy}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className={`text-sm font-mono font-black block ${
                        isDebit ? 'text-rose-400' : 'text-emerald-400'
                      }`}>
                        {isDebit ? '+' : '-'}{formatCurrency(entry.amountBrl, 'PYG')}
                      </span>
                      {cust && (
                        <button
                          type="button"
                          onClick={() => setStatementCustomer(cust)}
                          className="text-[10px] text-amber-400 hover:underline block cursor-pointer"
                        >
                          Ver Extrato
                        </button>
                      )}
                    </div>

                    {currentUser?.role === 'admin' && (
                      <button
                        type="button"
                        onClick={() => deleteCustomerEntry(entry.id)}
                        className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition-all cursor-pointer"
                        title="Apagar este lançamento (Exclusivo Admin)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredHistoryEntries.length === 0 && (
              <div className="text-center py-12 bg-[#0D121E]/60 border border-dashed border-[#1E273A] rounded-2xl">
                <BookOpen className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-neutral-300">
                  Nenhum lançamento encontrado
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Movimentações de fiado e pagamentos aparecerão automaticamente aqui.
                </p>
              </div>
            )}
          </div>

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
                  {language === 'es' ? 'Saldo Actual de la Cuenta (₲ Guaraní)' : 'Saldo Atual em Aberto (₲ Guaraní)'}
                </span>
                <span className="text-2xl font-black text-rose-400 font-mono-nums block mt-0.5">
                  {formatCurrency(paymentCustomer.outstandingBalanceBrl, 'PYG')}
                </span>
              </div>

              {/* Amount input with Quick Settle button */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="customer-pay-amount" className="text-xs font-semibold text-neutral-300">
                    {language === 'es' ? 'Monto a Pagar / Amortizar (₲)' : 'Valor a Pagar / Amortizar (₲)'} *
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectPayCurrency}
                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    {language === 'es' ? 'Saldar Todo' : 'Quitar Tudo'}
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-400 font-mono font-bold text-sm">
                    ₲
                  </div>
                  <input
                    id="customer-pay-amount"
                    name="payAmount"
                    type="number"
                    step="500"
                    min="500"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#080B12] border border-[#1C2538] rounded-xl pl-10 pr-4 py-2.5 text-base font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Quick bills chips in Guaranís */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[20000, 50000, 100000, 200000, 500000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPayAmount(val.toString())}
                      className="px-2.5 py-1 rounded-lg border border-[#1C2538] bg-[#080B12] hover:bg-neutral-800 text-[11px] font-mono font-medium text-amber-300 cursor-pointer active:scale-95"
                    >
                      +₲ {val.toLocaleString('es-PY')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Balance preview */}
              <div className="p-3 rounded-xl bg-[#080B12] border border-[#1C2538] space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">{language === 'es' ? 'Amortizado en cuenta:' : 'Amortizado da conta:'}</span>
                  <span className="font-bold text-emerald-400 font-mono-nums text-sm">
                    {formatCurrency(computedAmortizedBrl, 'PYG')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">{language === 'es' ? 'Nuevo saldo restante:' : 'Novo saldo restante:'}</span>
                  <span className={`font-bold font-mono-nums ${computedRemainingBrl <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(computedRemainingBrl, 'PYG')}
                  </span>
                </div>
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
      {/* MODAL 3: EXTRATO COMPLETO DE CONTA & AMORTIZAÇÕES (CUPOM NÃO-FISCAL) */}
      {/* ============================================================ */}
      {statementCustomer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 overflow-y-auto">
          <div className={`w-full ${statementViewMode === 'thermal' ? 'max-w-sm' : 'sm:max-w-3xl'} bg-neutral-900 border-t sm:border border-neutral-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200 flex flex-col max-h-[94vh] transition-all`}>
            
            {/* Mobile drag handle */}
            <div className="sm:hidden w-12 h-1 rounded-full bg-neutral-700 mx-auto mt-2.5 mb-1" />

            {/* Top actions bar - EXACTLY AS IN THE SCREENSHOT */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950/60 no-print">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-neutral-300">Cupom Não-Fiscal</span>
                <button
                  type="button"
                  onClick={() => setStatementViewMode(prev => prev === 'thermal' ? 'table' : 'thermal')}
                  className="px-2 py-0.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-[10px] font-medium transition-colors cursor-pointer"
                  title="Alternar entre Cupom Térmico e Tabela Completa"
                >
                  {statementViewMode === 'thermal' ? '📊 Ver Tabela' : '🧾 Ver Cupom'}
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                {currentUser?.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => setCustomerToDelete(statementCustomer)}
                    className="p-1.5 rounded-lg bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 text-xs font-medium flex items-center justify-center transition-colors cursor-pointer"
                    title={language === 'es' ? 'Eliminar Cliente' : 'Excluir Cliente'}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSendWhatsAppNotice(statementCustomer)}
                  className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 text-xs font-medium flex items-center justify-center transition-colors cursor-pointer"
                  title="Compartilhar pelo WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center justify-center transition-colors cursor-pointer"
                  title="Imprimir Cupom"
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setStatementCustomer(null)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* If Thermal View Mode: EXACT Thermal Paper Layout matching the user screenshot! */}
            {statementViewMode === 'thermal' ? (
              <div className="flex-1 overflow-y-auto">
                <div className="p-6 bg-white text-neutral-950 font-mono text-xs selection:bg-neutral-200" id="printable-receipt">
                  
                  {/* Header */}
                  <div className="text-center pb-3 border-b border-dashed border-neutral-300 space-y-0.5">
                    <h3 className="text-base font-extrabold tracking-tight uppercase">KORIZKO</h3>
                    <p className="text-[11px] font-bold text-neutral-800">Panificação confeitaria artesanal</p>
                    <p className="text-[10px] text-neutral-500">Extrato de Conta & Comandas • Guaraní (₲ PYG)</p>
                  </div>

                  {/* Details block */}
                  <div className="py-2.5 border-b border-dashed border-neutral-300 text-[11px] space-y-0.5">
                    <div className="flex justify-between">
                      <span>EXTRATO DE CONTA & FIADO:</span>
                      <span className="font-bold">#{statementCustomer.id.slice(-4).toUpperCase() || '25'}</span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>UNIDADE / SETOR:</span>
                      <span className="font-bold text-neutral-900">Panificação confeitaria artesanal</span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>DATA/HORA:</span>
                      <span>{new Date().toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>OPERADOR:</span>
                      <span>{currentUser?.name || 'Operador'}</span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>CLIENTE:</span>
                      <span className="font-bold text-neutral-900">{statementCustomer.name}</span>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="py-3 border-b border-dashed border-neutral-300 space-y-2">
                    <div className="text-[10px] uppercase font-bold text-neutral-500 flex justify-between">
                      <span>ITEM / COMANDA / SETOR</span>
                      <span>TOTAL</span>
                    </div>

                    <div className="space-y-2">
                      {filteredStatementEntries.length === 0 ? (
                        <div className="py-2 text-center text-neutral-500 italic text-[11px]">
                          Nenhum lançamento no extrato deste cliente.
                        </div>
                      ) : (
                        filteredStatementEntries.map((entry) => {
                          const isDebit = entry.type === 'debito_compra';
                          const entrySale = entry.saleId ? sales.find(s => s.id === entry.saleId) : null;
                          const cmdNum = entry.comandaNumber || entrySale?.comandaNumber;
                          const setor = entry.setorResponsavel || entrySale?.setorResponsavel || 'Panificação & Confeitaria Artesanal';
                          const entryDate = new Date(entry.date).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          });

                          return (
                            <div key={entry.id} className="space-y-1 border-b border-dotted border-neutral-300 pb-2 last:border-0 last:pb-0">
                              {/* Date and Operator info */}
                              <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                                <span>{entryDate}</span>
                                {entry.recordedBy && <span>Op: {entry.recordedBy}</span>}
                              </div>

                              {/* Title / Description */}
                              <div className="font-bold text-neutral-900 leading-tight">
                                {isDebit ? entry.description : (
                                  entry.description.toLowerCase().startsWith('amortização')
                                    ? entry.description
                                    : `Amortização: ${entry.description}`
                                )}
                              </div>

                              {/* Comanda Confirmada & Setor Responsável */}
                              <div className="flex flex-wrap items-center justify-between text-[10px] text-neutral-700 font-semibold bg-neutral-100 px-1.5 py-0.5 rounded">
                                <span>{cmdNum ? `Comanda Confirmada: #${cmdNum}` : 'Pedido Confirmado'}</span>
                                <span>Setor: {setor}</span>
                              </div>

                              {/* If sale items exist, list each item with quantity, unit and price */}
                              {entrySale && Array.isArray(entrySale.items) && entrySale.items.length > 0 ? (
                                <div className="pl-1 text-[10px] text-neutral-700 space-y-0.5 my-1">
                                  {entrySale.items.map((it, idx) => {
                                    const unit = it.product?.unit || (it as any).unit || 'un';
                                    const name = it.product?.name || (it as any).name || 'Produto';
                                    const subtotal = it.subtotalBrl ?? ((it.unitPriceBrl || 0) * (it.quantity || 1));
                                    return (
                                      <div key={idx} className="flex justify-between">
                                        <span className="truncate pr-1">{it.quantity} {unit} × {name}</span>
                                        <span className="font-mono shrink-0">{formatCurrency(subtotal, 'BRL')}</span>
                                      </div>
                                    );
                                  })}
                                  <div className="flex justify-between text-[11px] font-bold text-neutral-900 pt-0.5 border-t border-dotted border-neutral-300">
                                    <span>SUBTOTAL:</span>
                                    <span className="font-mono">{formatCurrency(entry.amountBrl, 'BRL')}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex justify-between text-[11px] pt-0.5">
                                  <span className="text-neutral-600">
                                    {isDebit ? 'Valor do débito:' : `Valor amortizado (${entry.paymentMethod ? entry.paymentMethod.toUpperCase() : 'PAGO'}):`}
                                  </span>
                                  <span className={`font-bold font-mono ${isDebit ? 'text-neutral-900' : 'text-emerald-700'}`}>
                                    {isDebit ? '+' : '-'}{formatCurrency(entry.amountBrl, 'BRL')}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-1 no-print">
                                {entrySale ? (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedSaleForReceipt(entrySale)}
                                    className="text-[10px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                                  >
                                    Ver Cupom da Venda #{entrySale.saleNumber} →
                                  </button>
                                ) : <span />}
                                {currentUser?.role === 'admin' && (
                                  <button
                                    type="button"
                                    onClick={() => deleteCustomerEntry(entry.id)}
                                    className="px-2 py-0.5 rounded bg-rose-100 hover:bg-rose-600 text-rose-700 hover:text-white text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Apagar este lançamento (Exclusivo Admin)"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Apagar</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="py-3 border-b border-dashed border-neutral-300 space-y-1">
                    <div className="flex justify-between text-sm font-bold pt-0.5">
                      <span>TOTAL (₲ PYG):</span>
                      <span>{formatCurrency(statementCustomer.outstandingBalanceBrl, 'PYG')}</span>
                    </div>
                  </div>

                  {/* Multi-Currency Payments breakdown - EXACTLY AS IN THE SCREENSHOT */}
                  <div className="py-3 border-b border-dashed border-neutral-300 text-[11px] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                      FORMA DE PAGAMENTO RECEBIDA:
                    </span>
                    <div className="flex justify-between">
                      <span>PYG (Fiado):</span>
                      <span className="font-bold">
                        {formatCurrency(statementCustomer.outstandingBalanceBrl, 'PYG')}
                      </span>
                    </div>
                    {statementTotals.totalAmortized > 0 && (
                      <div className="flex justify-between text-emerald-700 font-semibold pt-1 border-t border-dotted border-neutral-200">
                        <span>AMORTIZAÇÃO PAGA:</span>
                        <span>- {formatCurrency(statementTotals.totalAmortized, 'PYG')}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer message - EXACTLY AS IN THE SCREENSHOT */}
                  <div className="pt-4 text-center text-[10px] text-neutral-500 space-y-1">
                    <p>Obrigado pela preferência!</p>
                    <p>Pão quentinho a toda hora.</p>
                    <p className="text-[9px] text-neutral-400 mt-2">www.korisko.com.br</p>
                  </div>

                </div>

                {/* Bottom action buttons */}
                <div className="p-4 bg-neutral-950 border-t border-neutral-800 no-print space-y-2 safe-area-pb">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyStatement(statementCustomer)}
                      className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {statementCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{statementCopied ? 'Copiado!' : 'Copiar Texto'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppNotice(statementCustomer)}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                  </div>

                  {statementCustomer.outstandingBalanceBrl > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const cust = statementCustomer;
                        setStatementCustomer(null);
                        handleOpenPayment(cust);
                      }}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-neutral-950 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
                    >
                      <DollarSign className="w-4 h-4 stroke-[2.5]" />
                      <span>Amortizar / Abater Dívida Agora</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const cust = statementCustomer;
                      setStatementCustomer(null);
                      handleOpenDebt(cust);
                    }}
                    className="w-full py-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Lançar Novo Débito / Fiado</span>
                  </button>
                </div>
              </div>
            ) : (
              /* If Table View Mode: Full Filtered Management Dashboard! */
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
                
                {/* Financial Health Overview Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  
                  {/* 1. Saldo em Aberto */}
                  <div className="p-3.5 rounded-2xl bg-[#070A11] border border-[#1C2538] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Saldo Devedor</span>
                        <span className={`w-2 h-2 rounded-full ${statementCustomer.outstandingBalanceBrl > 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                      </div>
                      <div className={`text-xl font-black font-mono-nums mt-1 ${statementCustomer.outstandingBalanceBrl > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {formatCurrency(statementCustomer.outstandingBalanceBrl, 'PYG')}
                      </div>
                    </div>
                    <div className="text-[10px] text-neutral-400 font-mono space-y-0.5 pt-2 border-t border-[#161E30] mt-2">
                      <div className="flex items-center justify-between">
                        <span>🇵🇾 Moeda Oficial:</span>
                        <span className="font-bold text-amber-300">
                          {formatCurrency(statementCustomer.outstandingBalanceBrl, 'PYG')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Total Comprado */}
                  <div className="p-3.5 rounded-2xl bg-[#070A11] border border-[#1C2538] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Total Comprado</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                      </div>
                      <div className="text-xl font-black text-white font-mono-nums mt-1">
                        {formatCurrency(statementTotals.totalDebits, 'BRL')}
                      </div>
                    </div>
                    <div className="text-[11px] text-neutral-400 pt-2 border-t border-[#161E30] mt-2 flex items-center justify-between">
                      <span>Lançamentos:</span>
                      <span className="font-bold text-rose-400 font-mono-nums">{statementTotals.debitCount} compras</span>
                    </div>
                  </div>

                  {/* 3. Total Amortizado */}
                  <div className="p-3.5 rounded-2xl bg-[#070A11] border border-[#1C2538] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Total Amortizado</span>
                        <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="text-xl font-black text-emerald-400 font-mono-nums mt-1">
                        {formatCurrency(statementTotals.totalAmortized, 'BRL')}
                      </div>
                    </div>
                    <div className="text-[11px] text-neutral-400 pt-2 border-t border-[#161E30] mt-2 flex items-center justify-between">
                      <span>Pagamentos:</span>
                      <span className="font-bold text-emerald-400 font-mono-nums">{statementTotals.amortizedCount} recebidos</span>
                    </div>
                  </div>

                  {/* 4. Limite de Crédito */}
                  <div className="p-3.5 rounded-2xl bg-[#070A11] border border-[#1C2538] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Limite de Crédito</span>
                        <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                      </div>
                      <div className="text-xl font-black text-indigo-300 font-mono-nums mt-1">
                        {formatCurrency(statementCustomer.creditLimitBrl, 'BRL')}
                      </div>
                    </div>
                    <div className="space-y-1 pt-2 border-t border-[#161E30] mt-2">
                      {(() => {
                        const limit = statementCustomer.creditLimitBrl || 1;
                        const pct = Math.min(100, Math.round((statementCustomer.outstandingBalanceBrl / limit) * 100));
                        const available = Math.max(0, statementCustomer.creditLimitBrl - statementCustomer.outstandingBalanceBrl);
                        return (
                          <>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-neutral-400">Uso: {pct}%</span>
                              <span className="text-emerald-400 font-mono font-medium">Livre: {formatCurrency(available, 'BRL')}</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-300 ${pct > 85 ? 'bg-rose-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                </div>

                {/* Filter Controls & Search */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    
                    {/* Search Input */}
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="text"
                        value={statementSearch}
                        onChange={(e) => setStatementSearch(e.target.value)}
                        placeholder="Buscar por descrição, forma de pagamento, atendente ou valor..."
                        className="w-full bg-[#070A11] border border-[#1C2538] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                      />
                      {statementSearch && (
                        <button
                          type="button"
                          onClick={() => setStatementSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Period Filter Dropdown */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#070A11] border border-[#1C2538] text-xs">
                        <Clock className="w-3.5 h-3.5 text-neutral-400" />
                        <select
                          value={statementPeriodFilter}
                          onChange={(e) => setStatementPeriodFilter(e.target.value as any)}
                          className="bg-transparent text-neutral-200 text-xs focus:outline-none cursor-pointer"
                        >
                          <option value="all" className="bg-[#0B0F19]">Todo o Histórico</option>
                          <option value="7d" className="bg-[#0B0F19]">Últimos 7 dias</option>
                          <option value="30d" className="bg-[#0B0F19]">Últimos 30 dias</option>
                          <option value="month" className="bg-[#0B0F19]">Este Mês</option>
                        </select>
                      </div>

                      {(statementSearch || statementPeriodFilter !== 'all' || statementTypeFilter !== 'all') && (
                        <button
                          type="button"
                          onClick={() => {
                            setStatementSearch('');
                            setStatementPeriodFilter('all');
                            setStatementTypeFilter('all');
                          }}
                          className="p-1.5 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white text-xs cursor-pointer"
                          title="Limpar Filtros"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filter Tabs (Todos, Débitos, Amortizações) */}
                  <div className="flex items-center gap-2 border-b border-[#161F32] pb-2 overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => setStatementTypeFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        statementTypeFilter === 'all'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-[#070A11] text-neutral-400 hover:text-white border border-[#1C2538]'
                      }`}
                    >
                      <span>Todos os Lançamentos</span>
                      <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-bold">
                        {customerEntries.filter(e => e.customerId === statementCustomer.id).length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatementTypeFilter('debito')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        statementTypeFilter === 'debito'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-[#070A11] text-neutral-400 hover:text-rose-300 border border-[#1C2538]'
                      }`}
                    >
                      <ArrowUpRight className="w-3 h-3 text-rose-400" />
                      <span>Débitos / Compras ({statementTotals.debitCount})</span>
                      <span className="font-mono text-[10px] opacity-80">
                        {formatCurrency(statementTotals.totalDebits, 'BRL')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatementTypeFilter('amortizacao')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        statementTypeFilter === 'amortizacao'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-[#070A11] text-neutral-400 hover:text-emerald-300 border border-[#1C2538]'
                      }`}
                    >
                      <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                      <span>Amortizações / Pagos ({statementTotals.amortizedCount})</span>
                      <span className="font-mono text-[10px] opacity-80">
                        {formatCurrency(statementTotals.totalAmortized, 'BRL')}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Table of entries */}
                <div className="space-y-2">
                  {filteredStatementEntries.map((entry) => {
                    const isDebit = entry.type === 'debito_compra';
                    const entrySale = entry.saleId ? sales.find(s => s.id === entry.saleId) : null;

                    return (
                      <div 
                        key={entry.id}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isDebit 
                            ? 'bg-[#090D17] border-[#1C2538] hover:border-rose-500/30' 
                            : 'bg-[#071212] border-emerald-950/60 hover:border-emerald-500/40'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm ${
                            isDebit 
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' 
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {isDebit ? <ArrowUpRight className="w-4 h-4 stroke-[2.5]" /> : <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                isDebit 
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}>
                                {isDebit ? 'Débito / Fiado' : 'Amortização'}
                              </span>

                              {(entry.comandaNumber || entrySale?.comandaNumber) && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  Comanda #{entry.comandaNumber || entrySale?.comandaNumber} (Confirmada)
                                </span>
                              )}

                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                Setor: {entry.setorResponsavel || entrySale?.setorResponsavel || 'Panificação & Confeitaria Artesanal'}
                              </span>

                              {entry.paymentMethod && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#141C2E] text-sky-300 border border-sky-500/20 uppercase">
                                  {entry.paymentMethod}
                                </span>
                              )}
                            </div>

                            <div className="font-semibold text-neutral-100 text-xs mt-1 leading-snug break-words">
                              {entry.description}
                            </div>

                            {/* Itemized breakdown if from sale */}
                            {entrySale && Array.isArray(entrySale.items) && entrySale.items.length > 0 && (
                              <div className="mt-1 pl-2 border-l-2 border-neutral-700/60 space-y-0.5 text-[11px] text-neutral-400">
                                {entrySale.items.map((it, idx) => {
                                  const unit = it.product?.unit || (it as any).unit || 'un';
                                  const name = it.product?.name || (it as any).name || 'Produto';
                                  const subtotal = it.subtotalBrl ?? ((it.unitPriceBrl || 0) * (it.quantity || 1));
                                  return (
                                    <div key={idx} className="flex items-center gap-1.5">
                                      <span className="text-neutral-300 font-medium">
                                        {it.quantity} {unit} × {name}
                                      </span>
                                      <span className="font-mono text-neutral-400">
                                        ({formatCurrency(subtotal, 'BRL')})
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-neutral-400 mt-1">
                              <span className="font-mono text-neutral-400">
                                {new Date(entry.date).toLocaleString('pt-BR')}
                              </span>
                              {entry.recordedBy && (
                                <>
                                  <span className="text-neutral-600">·</span>
                                  <span>Atendente: <strong className="text-neutral-300 font-medium">{entry.recordedBy}</strong></span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-[#151E30] shrink-0 gap-1.5">
                          <div className={`font-mono font-black text-sm sm:text-base ${isDebit ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {isDebit ? '+' : '-'}{formatCurrency(entry.amountBrl, 'BRL')}
                          </div>

                          <div className="flex items-center gap-2">
                            {entrySale && (
                              <button
                                type="button"
                                onClick={() => setSelectedSaleForReceipt(entrySale)}
                                className="text-[10px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer hover:underline"
                              >
                                <Receipt className="w-3 h-3" />
                                <span>Cupom #{entrySale.saleNumber}</span>
                              </button>
                            )}
                            {currentUser?.role === 'admin' && (
                              <button
                                type="button"
                                onClick={() => deleteCustomerEntry(entry.id)}
                                className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                                title="Apagar este registro (Exclusivo Admin)"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Apagar</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1C2538]">
                  <button
                    type="button"
                    onClick={() => setStatementCustomer(null)}
                    className="px-5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Sale Receipt Modal (when viewing a specific sale from Extrato or CRM) */}
      {selectedSaleForReceipt && (
        <ReceiptModal
          sale={selectedSaleForReceipt}
          onClose={() => setSelectedSaleForReceipt(null)}
        />
      )}

      {/* ============================================================ */}
      {/* MODAL 3.1: COMPROVANTE INDIVIDUAL DE LANÇAMENTO */}
      {/* ============================================================ */}
      {entryForReceipt && statementCustomer && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 no-print">
          <div className="w-full max-w-sm bg-[#0E1322] border border-[#222E46] rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#1C2538] pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-white">Comprovante de Lançamento</h4>
              </div>
              <button
                type="button"
                onClick={() => setEntryForReceipt(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#070A11] border border-[#1C2538] space-y-2.5 text-xs">
              <div className="text-center pb-2 border-b border-neutral-800">
                <span className="text-xs text-white font-black uppercase tracking-wider block">KORIZKO</span>
                <span className="text-[10px] text-amber-400 font-bold tracking-wide block">Panificação confeitaria artesanal</span>
                <span className="font-bold text-neutral-200 text-xs block mt-1">
                  {entryForReceipt.type === 'debito_compra' ? 'Comprovante de Débito / Fiado' : 'Recibo de Amortização'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-neutral-400">Cliente:</span>
                <span className="font-bold text-white">{statementCustomer.name}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-neutral-400">Data/Hora:</span>
                <span className="font-mono text-neutral-300">
                  {new Date(entryForReceipt.date).toLocaleString('pt-BR')}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-neutral-400">Operador:</span>
                <span className="text-neutral-200">{entryForReceipt.recordedBy}</span>
              </div>

              {entryForReceipt.comandaNumber && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Comanda Confirmada:</span>
                  <span className="font-bold text-amber-400">#{entryForReceipt.comandaNumber}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-neutral-400">Setor Responsável:</span>
                <span className="font-bold text-indigo-300">{entryForReceipt.setorResponsavel || 'Panificação & Confeitaria Artesanal'}</span>
              </div>

              {entryForReceipt.paymentMethod && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Forma de Pagamento:</span>
                  <span className="font-bold text-sky-400 uppercase">{entryForReceipt.paymentMethod}</span>
                </div>
              )}

              <div className="pt-2 border-t border-neutral-800">
                <div className="text-neutral-400 text-[11px] mb-0.5">Descrição:</div>
                <div className="p-2 rounded bg-neutral-900/80 text-neutral-200 text-xs font-medium">
                  {entryForReceipt.description}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-center">
                <span className="text-[10px] text-neutral-400 uppercase font-bold block">Valor Lançado</span>
                <span className={`text-xl font-black font-mono-nums block mt-0.5 ${
                  entryForReceipt.type === 'debito_compra' ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {entryForReceipt.type === 'debito_compra' ? '+' : '-'}{formatCurrency(entryForReceipt.amountBrl, 'BRL')}
                </span>
                {entryForReceipt.runningBalanceBrl !== undefined && (
                  <span className="text-[11px] text-neutral-400 font-mono block mt-1">
                    Saldo após: <strong>{formatCurrency(entryForReceipt.runningBalanceBrl, 'BRL')}</strong>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Recibo</span>
              </button>
              <button
                type="button"
                onClick={() => setEntryForReceipt(null)}
                className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TEMPLATE DE IMPRESSÃO LIMPO (@media print) */}
      {/* ============================================================ */}
      {statementCustomer && (
        <div className="print-only hidden p-6 text-black bg-white max-w-2xl mx-auto font-sans">
          <div className="text-center pb-4 border-b border-black mb-4">
            <h1 className="text-xl font-extrabold uppercase tracking-wide">KORIZKO</h1>
            <p className="text-sm font-bold">Panificação confeitaria artesanal</p>
            <p className="text-xs text-neutral-600">Sistema Integrado de Gestão, Comandas & Contas a Receber</p>
            <h2 className="text-sm font-bold uppercase mt-2 border-t border-b border-black py-1">
              Extrato de Conta Corrente & Fiado
            </h2>
          </div>

          <div className="text-xs space-y-1 mb-4">
            <div className="flex justify-between">
              <span><strong>Cliente:</strong> {statementCustomer.name}</span>
              <span><strong>Data de Emissão:</strong> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex justify-between">
              <span><strong>Telefone:</strong> {statementCustomer.phone}</span>
              <span><strong>Categoria:</strong> {statementCustomer.category.toUpperCase()}</span>
            </div>
            {statementCustomer.documentCpf && (
              <div><strong>CPF/CNPJ:</strong> {statementCustomer.documentCpf}</div>
            )}
            {statementCustomer.address && (
              <div><strong>Endereço:</strong> {statementCustomer.address}</div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 border border-black p-2 text-center text-xs mb-4">
            <div>
              <div className="font-semibold text-neutral-700">Total Comprado</div>
              <div className="font-bold text-sm">{formatCurrency(statementTotals.totalDebits, 'PYG')}</div>
            </div>
            <div>
              <div className="font-semibold text-neutral-700">Total Amortizado</div>
              <div className="font-bold text-sm">{formatCurrency(statementTotals.totalAmortized, 'PYG')}</div>
            </div>
            <div>
              <div className="font-semibold text-neutral-700">Saldo Devedor Atual</div>
              <div className="font-black text-sm">{formatCurrency(statementCustomer.outstandingBalanceBrl, 'PYG')}</div>
            </div>
          </div>

          <table className="w-full text-xs border-collapse border border-black mb-6">
            <thead>
              <tr className="bg-neutral-200">
                <th className="border border-black p-1 text-left">Data</th>
                <th className="border border-black p-1 text-left">Tipo</th>
                <th className="border border-black p-1 text-left">Descrição / Forma</th>
                <th className="border border-black p-1 text-right">Valor</th>
                <th className="border border-black p-1 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {filteredStatementEntries.map((entry) => {
                const isDebit = entry.type === 'debito_compra';
                return (
                  <tr key={entry.id}>
                    <td className="border border-black p-1 whitespace-nowrap">
                      {new Date(entry.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="border border-black p-1 whitespace-nowrap font-bold">
                      {isDebit ? 'DÉBITO' : 'AMORTIZAÇÃO'}
                    </td>
                    <td className="border border-black p-1">
                      {entry.description}
                      {entry.paymentMethod && ` (${entry.paymentMethod.toUpperCase()})`}
                    </td>
                    <td className="border border-black p-1 text-right font-mono font-bold whitespace-nowrap">
                      {isDebit ? '+' : '-'}{formatCurrency(entry.amountBrl, 'BRL')}
                    </td>
                    <td className="border border-black p-1 text-right font-mono whitespace-nowrap">
                      {entry.runningBalanceBrl !== undefined ? formatCurrency(entry.runningBalanceBrl, 'BRL') : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="text-xs pt-4 border-t border-black space-y-4">
            <p className="text-[11px] text-neutral-700 italic">
              "Reconheço a exatidão dos lançamentos deste extrato e declaro estar ciente do saldo devedor atual discriminado acima."
            </p>
            
            <div className="pt-6 flex justify-between items-end">
              <div className="w-64 border-t border-black text-center pt-1 text-xs">
                Assinatura do Cliente
              </div>
              <div className="text-right text-[11px] text-neutral-600">
                Chave PIX: axxeiacompany@gmail.com
              </div>
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
                  <label htmlFor="customer-limit-field" className="text-xs font-semibold text-neutral-300 block mb-1">
                    {language === 'es' ? 'Límite de Crédito / Fiado (₲)' : 'Limite de Crédito / Fiado (₲)'}
                  </label>
                  <input
                    id="customer-limit-field"
                    name="customerCreditLimit"
                    type="number"
                    step="any"
                    placeholder={language === 'es' ? 'Ej: 500.000 ₲' : 'Ex: 500.000 ₲'}
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

      {/* Modal de Registro de Compras & Análise Financeira do Cliente */}
      <CustomerPurchasesModal
        customer={purchasesCustomer}
        onClose={() => setPurchasesCustomer(null)}
        onInspectSale={sale => setSelectedSaleForReceipt(sale)}
      />

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
