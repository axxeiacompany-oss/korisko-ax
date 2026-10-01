import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { CartItem, Currency, PaymentEntry, PaymentMethod, Sale } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { resolveSetoresFromItems } from '../../lib/db';
import {
  CreditCard,
  Banknote,
  QrCode,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  UserCheck,
  UserPlus,
  BookOpen,
  Gift,
  AlertTriangle,
  Zap,
  Radio,
  ShieldCheck,
  ArrowRight,
  Landmark
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onSaleCompleted: (sale: Sale) => void;
  comandaNumber?: string;
  initialCustomerName?: string;
}

export const PaymentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  cartItems,
  onSaleCompleted,
  comandaNumber,
  initialCustomerName,
}) => {
  const {
    completeSale,
    customers,
    addCustomer,
    redeemCustomerPoints,
    broadcastCheckoutSession,
    clearCheckoutSession,
    language,
    showToast
  } = useBakery();

  const checkoutSessionIdRef = useRef<string>(`chk-pdv-${Date.now()}`);

  const rawSubtotalBrl = useMemo(() => {
    return cartItems.reduce((acc, it) => acc + it.subtotalBrl, 0);
  }, [cartItems]);

  const sectorInfo = useMemo(() => {
    return resolveSetoresFromItems(cartItems);
  }, [cartItems]);

  const itemsSummary = useMemo(() => {
    return (cartItems || [])
      .map(i => `${i.quantity}x ${i.product?.name || 'Item'}`)
      .slice(0, 3)
      .join(', ');
  }, [cartItems]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState(initialCustomerName || '');

  // Quick Add Customer Inline Form
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  const [quickCustName, setQuickCustName] = useState('');
  const [quickCustPhone, setQuickCustPhone] = useState('');
  const [quickCustLimit, setQuickCustLimit] = useState('500000');
  const [isSavingQuickCust, setIsSavingQuickCust] = useState(false);

  // Find selected customer
  const selectedCustomer = useMemo(() => {
    if (selectedCustomerId) {
      return customers.find(c => c.id === selectedCustomerId) || null;
    }
    if (customerName.trim()) {
      const clean = customerName.trim().toLowerCase();
      return customers.find(c => c.name.trim().toLowerCase() === clean) || null;
    }
    return null;
  }, [customers, selectedCustomerId, customerName]);

  const [discountType, setDiscountType] = useState<'none' | 'percent' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [loyaltyDiscountBrl, setLoyaltyDiscountBrl] = useState<number>(0);

  const discountBrl = useMemo(() => {
    let baseDiscount = 0;
    const val = parseFloat(discountValue) || 0;
    if (val > 0 && discountType !== 'none') {
      if (discountType === 'percent') {
        baseDiscount = Math.round(((rawSubtotalBrl * Math.min(100, val)) / 100) * 100) / 100;
      } else if (discountType === 'fixed') {
        baseDiscount = Math.min(rawSubtotalBrl, Math.round(val * 100) / 100);
      }
    }
    return Math.min(rawSubtotalBrl, Math.round((baseDiscount + loyaltyDiscountBrl) * 100) / 100);
  }, [discountType, discountValue, loyaltyDiscountBrl, rawSubtotalBrl]);

  const totalBrl = Math.max(0, Math.round(rawSubtotalBrl - discountBrl));

  const [payments, setPayments] = useState<PaymentEntry[]>([]);

  // Current input for adding a payment entry (Moeda única oficial: Guaraní ₲)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('dinheiro');
  const [inputAmount, setInputAmount] = useState<string>('');
  const [isFinishing, setIsFinishing] = useState<boolean>(false);

  // Reset modal state whenever opened
  useEffect(() => {
    if (isOpen) {
      checkoutSessionIdRef.current = `chk-pdv-${Date.now()}`;
      setPayments([]);
      setInputAmount('');
      setDiscountType('none');
      setDiscountValue('');
      setLoyaltyDiscountBrl(0);
      setCustomerName(initialCustomerName || '');
      if (initialCustomerName) {
        const match = customers.find(
          c => c.name.trim().toLowerCase() === initialCustomerName.trim().toLowerCase()
        );
        setSelectedCustomerId(match ? match.id : '');
      } else {
        setSelectedCustomerId('');
      }
      setShowQuickAddCustomer(false);
      setIsFinishing(false);
    }
  }, [isOpen, initialCustomerName, customers]);

  // Preferred currency for change (Guaraní ₲)
  const changeCurrency: Currency = 'PYG';

  // Calculate total paid so far in Guaraní
  const totalPaidBrl = useMemo(() => {
    return payments.reduce((acc, p) => acc + p.equivalentBrl, 0);
  }, [payments]);

  // Remaining to pay in Guaraní
  const remainingBrl = Math.max(0, Math.round(totalBrl - totalPaidBrl));

  // Change amount in Guaraní
  const changeBrl = Math.max(0, Math.round(totalPaidBrl - totalBrl));

  // Active Fiado amount (either already added to payments or currently selected as method for remainingBrl)
  const activeFiadoAmount = useMemo(() => {
    const addedFiado = payments
      .filter(p => p.method === 'fiado')
      .reduce((acc, p) => acc + p.equivalentBrl, 0);
    if (selectedMethod === 'fiado' && remainingBrl > 0) {
      return addedFiado + remainingBrl;
    }
    return addedFiado;
  }, [payments, selectedMethod, remainingBrl]);

  const previousDebtBrl = selectedCustomer?.outstandingBalanceBrl || 0;
  const projectedDebtBrl = previousDebtBrl + activeFiadoAmount;
  const isFiadoActive = selectedMethod === 'fiado' || activeFiadoAmount > 0;

  // REAL-TIME BROADCAST AT THE MOMENT OF CHARGING ("na hora de cobrar e colocar fiado ou outro método")
  useEffect(() => {
    if (!isOpen || totalBrl <= 0) return;

    const effectiveMethod: PaymentMethod = isFiadoActive
      ? 'fiado'
      : (payments[0]?.method || selectedMethod);

    broadcastCheckoutSession({
      id: checkoutSessionIdRef.current,
      customerId: selectedCustomer?.id || selectedCustomerId || undefined,
      customerName: selectedCustomer?.name || customerName.trim() || (isFiadoActive ? 'Selecionando Cliente Fiado...' : 'Cliente Balcão'),
      comandaNumber: comandaNumber || undefined,
      setorResponsavel: sectorInfo.label,
      paymentMethod: effectiveMethod,
      amountBrl: totalBrl,
      previousDebtBrl,
      projectedDebtBrl: isFiadoActive ? projectedDebtBrl : previousDebtBrl,
      status: 'em_cobranca',
      itemsSummary: itemsSummary || 'Cobrança PDV',
    });
  }, [
    isOpen,
    totalBrl,
    selectedMethod,
    isFiadoActive,
    selectedCustomer,
    selectedCustomerId,
    customerName,
    comandaNumber,
    sectorInfo.label,
    previousDebtBrl,
    projectedDebtBrl,
    itemsSummary,
    payments,
    broadcastCheckoutSession
  ]);

  const handleCloseModal = () => {
    clearCheckoutSession(checkoutSessionIdRef.current);
    onClose();
  };

  const handleSelectCustomer = (cid: string) => {
    setSelectedCustomerId(cid);
    const found = customers.find(c => c.id === cid);
    if (found) {
      setCustomerName(found.name);
    }
  };

  const handleQuickCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustName.trim()) {
      showToast('Digite o nome do cliente para o Fiado.', 'error');
      return;
    }
    setIsSavingQuickCust(true);
    try {
      const created = await addCustomer({
        name: quickCustName.trim(),
        phone: quickCustPhone.trim(),
        creditLimitBrl: parseFloat(quickCustLimit) || 500000,
        category: 'varejo',
      });
      setSelectedCustomerId(created.id);
      setCustomerName(created.name);
      setShowQuickAddCustomer(false);
      setQuickCustName('');
      setQuickCustPhone('');
      showToast(`Cliente "${created.name}" cadastrado e vinculado em tempo real!`, 'success');
    } catch (err: any) {
      showToast(`Erro ao cadastrar cliente: ${err.message}`, 'error');
    } finally {
      setIsSavingQuickCust(false);
    }
  };

  const handleApplyLoyaltyDiscount = () => {
    if (!selectedCustomer || selectedCustomer.loyaltyPoints < 20) return;
    const maxRedeemablePts = Math.min(selectedCustomer.loyaltyPoints, Math.floor(rawSubtotalBrl * 20));
    if (maxRedeemablePts < 20) {
      showToast(
        language === 'es' ? 'Puntos insuficientes para canje mínimo (mínimo 20 puntos).' : 'Pontos insuficientes para resgate mínimo (mínimo 20 pontos).',
        'error'
      );
      return;
    }
    const discount = redeemCustomerPoints(selectedCustomer.id, maxRedeemablePts);
    setLoyaltyDiscountBrl(discount);
  };

  const handleAddPayment = () => {
    const val = parseFloat(inputAmount);
    if (!val || val <= 0) return;

    if (selectedMethod === 'fiado' && !selectedCustomerId && !customerName.trim()) {
      showToast(
        language === 'es'
          ? 'Para registrar en Fiado, seleccione o escriba el nombre del cliente arriba.'
          : 'Para lançar no Fiado sem perdas, selecione ou digite o nome do cliente acima.',
        'error'
      );
      return;
    }

    const newPayment: PaymentEntry = {
      id: `pay-${Date.now()}-${Math.random()}`,
      currency: 'PYG',
      amountReceived: val,
      exchangeRateUsed: 1,
      equivalentBrl: val,
      method: selectedMethod,
    };

    setPayments(prev => [...prev, newPayment]);
    setInputAmount('');
  };

  const handleRemovePayment = (id: string) => {
    setPayments(prev => prev.filter(p => p.id !== id));
  };

  const handleSetExactRemaining = () => {
    setInputAmount(remainingBrl.toString());
  };

  const handlePayFullInCurrency = (_cur?: Currency) => {
    if (remainingBrl <= 0) return;

    if (selectedMethod === 'fiado' && !selectedCustomerId && !customerName.trim()) {
      showToast(
        language === 'es'
          ? 'Para registrar en Fiado, seleccione o escriba el nombre del cliente arriba.'
          : 'Para lançar no Fiado sem perdas, selecione ou digite o nome do cliente acima.',
        'error'
      );
      return;
    }

    const newPayment: PaymentEntry = {
      id: `pay-${Date.now()}-${Math.random()}`,
      currency: 'PYG',
      amountReceived: remainingBrl,
      exchangeRateUsed: 1,
      equivalentBrl: remainingBrl,
      method: selectedMethod,
    };

    setPayments(prev => [...prev, newPayment]);
    setInputAmount('');
  };

  const handleQuickAddBill = (val: number) => {
    setInputAmount(val.toString());
  };

  const handleFinishSale = async () => {
    let finalPayments = [...payments];

    // Se nenhum pagamento avulso foi adicionado, assume o valor exato no método selecionado
    if (finalPayments.length === 0 && totalBrl > 0) {
      if (selectedMethod === 'fiado' && !selectedCustomerId && !customerName.trim()) {
        showToast(
          language === 'es'
            ? 'Para registrar venta como Fiado, seleccione o escriba el nombre del cliente.'
            : 'Para lançar venda como Fiado sem perdas, selecione ou digite o nome do cliente.',
          'error'
        );
        return;
      }
      finalPayments = [{
        id: `pay-${Date.now()}`,
        currency: 'PYG',
        amountReceived: totalBrl,
        exchangeRateUsed: 1,
        equivalentBrl: totalBrl,
        method: selectedMethod,
      }];
    } else if (remainingBrl > 0.05) {
      showToast(
        language === 'es' ? 'El valor recibido aún es menor que el total de la venta.' : 'O valor recebido ainda é menor que o total da venda.',
        'error'
      );
      return;
    }

    const currentTotalPaid = finalPayments.reduce((acc, p) => acc + p.equivalentBrl, 0);
    const calculatedChange = Math.max(0, Math.round(currentTotalPaid - totalBrl));

    const changeData = calculatedChange > 0 ? {
      currency: changeCurrency,
      amount: calculatedChange,
      equivalentBrl: calculatedChange,
    } : undefined;

    setIsFinishing(true);
    try {
      clearCheckoutSession(checkoutSessionIdRef.current);
      const sale = await completeSale(
        cartItems,
        finalPayments,
        changeData,
        customerName || selectedCustomer?.name || undefined,
        comandaNumber || undefined,
        discountBrl > 0 ? discountBrl : undefined,
        rawSubtotalBrl,
        selectedCustomer?.id || selectedCustomerId || undefined
      );
      onSaleCompleted(sale);
    } catch (err: any) {
      showToast(
        language === 'es' ? `Error al registrar venta: ${err.message || String(err)}` : `Falha ao registrar venda: ${err.message || String(err)}`,
        'error'
      );
    } finally {
      setIsFinishing(false);
    }
  };

  // Quick bills in Guaraní (₲)
  const quickBills = [5000, 10000, 20000, 50000, 100000, 200000];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-neutral-900 border-t sm:border border-neutral-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200 max-h-[94vh] sm:max-h-[92vh] flex flex-col">
        
        {/* Mobile drag handle */}
        <div className="sm:hidden w-12 h-1 rounded-full bg-neutral-700 mx-auto mt-2.5 mb-1" />

        {/* Header with Real-Time Broadcast Indicator */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-800 bg-neutral-950/80">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] sm:text-xs font-black text-amber-400 uppercase tracking-wider">
                KORIZKO • Panificação confeitaria artesanal
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                <Radio className="w-3 h-3 animate-pulse" />
                Cobrança em Tempo Real
              </span>
              {comandaNumber && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold font-mono-nums">
                  Comanda #{comandaNumber}
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-neutral-100 mt-0.5">
              {language === 'es' ? 'Cobro en Tiempo Real & Registro Fiado Anti-Pérdida' : 'Cobrança em Tempo Real & Proteção de Fiado'}
            </h2>
          </div>
          <button
            onClick={handleCloseModal}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">

          {/* CRM / Customer Selection Box */}
          <div className={`p-3.5 rounded-xl border space-y-2.5 transition-all ${
            isFiadoActive
              ? 'bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-950/20'
              : 'bg-neutral-950/80 border-neutral-800'
          }`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                <UserCheck className={`w-4 h-4 ${isFiadoActive ? 'text-rose-400' : 'text-amber-400'}`} />
                <span>
                  {isFiadoActive
                    ? 'Cliente Obrigatório para Fiado / Caderneta (Sem Perdas)'
                    : 'Vincular Cliente (Fiado / Extrato / Fidelidade)'}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setShowQuickAddCustomer(!showQuickAddCustomer)}
                className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <UserPlus className="w-3 h-3" />
                <span>{showQuickAddCustomer ? 'Fechar Cadastro' : '+ Novo Cliente na Hora'}</span>
              </button>
            </div>

            {showQuickAddCustomer && (
              <form onSubmit={handleQuickCreateCustomer} className="p-3 rounded-xl bg-neutral-900/90 border border-amber-500/30 space-y-2.5 animate-in fade-in">
                <div className="text-[11px] font-bold text-amber-300">
                  Cadastro Instantâneo de Cliente para Fiado / Extrato
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={quickCustName}
                    onChange={(e) => setQuickCustName(e.target.value)}
                    placeholder="Nome completo do cliente *"
                    className="bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                  <input
                    type="text"
                    value={quickCustPhone}
                    onChange={(e) => setQuickCustPhone(e.target.value)}
                    placeholder="WhatsApp / Telefone"
                    className="bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      value={quickCustLimit}
                      onChange={(e) => setQuickCustLimit(e.target.value)}
                      placeholder="Limite ₲"
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono-nums focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={isSavingQuickCust}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 cursor-pointer"
                    >
                      {isSavingQuickCust ? '...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={selectedCustomerId}
                onChange={(e) => handleSelectCustomer(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
              >
                <option value="">Selecionar cliente cadastrado...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.category}) — Fiado: {formatCurrency(c.outstandingBalanceBrl, 'PYG')}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={isFiadoActive ? 'Ou digite o nome para criar ficha automática...' : 'Nome do cliente no cupom...'}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            {selectedCustomer && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 text-[11px] border-t border-neutral-800/80">
                <div className="flex items-center gap-3">
                  <span className="text-neutral-400">
                    Limite: <strong className="text-neutral-200 font-mono-nums">{formatCurrency(selectedCustomer.creditLimitBrl, 'PYG')}</strong>
                  </span>
                  <span className="text-neutral-400">
                    Dívida Atual: <strong className={selectedCustomer.outstandingBalanceBrl > 0 ? 'text-rose-400 font-mono-nums' : 'text-emerald-400 font-mono-nums'}>
                      {formatCurrency(selectedCustomer.outstandingBalanceBrl, 'PYG')}
                    </strong>
                  </span>
                </div>

                {selectedCustomer.loyaltyPoints >= 20 && loyaltyDiscountBrl === 0 && (
                  <button
                    type="button"
                    onClick={handleApplyLoyaltyDiscount}
                    className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium"
                  >
                    <Gift className="w-3 h-3" />
                    Usar Pontos ({selectedCustomer.loyaltyPoints} pts)
                  </button>
                )}
                {loyaltyDiscountBrl > 0 && (
                  <span className="text-emerald-400 font-semibold">
                    ✓ Desconto de Fidelidade: -{formatCurrency(loyaltyDiscountBrl, 'PYG')}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Discount / Cortesia Bar */}
          <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-neutral-400 font-medium">Desconto / Cortesia:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => { setDiscountType('none'); setDiscountValue(''); }}
                  className={`px-2 py-1 rounded text-[11px] ${discountType === 'none' ? 'bg-neutral-800 text-neutral-200 font-semibold' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                  Nenhum
                </button>
                <button
                  type="button"
                  onClick={() => { setDiscountType('percent'); setDiscountValue('5'); }}
                  className={`px-2 py-1 rounded text-[11px] ${discountType === 'percent' && discountValue === '5' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                  5%
                </button>
                <button
                  type="button"
                  onClick={() => { setDiscountType('percent'); setDiscountValue('10'); }}
                  className={`px-2 py-1 rounded text-[11px] ${discountType === 'percent' && discountValue === '10' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                  10%
                </button>
                <button
                  type="button"
                  onClick={() => { setDiscountType('fixed'); setDiscountValue('5000'); }}
                  className={`px-2 py-1 rounded text-[11px] ${discountType === 'fixed' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                  ₲ Fixo
                </button>
              </div>
            </div>

            {discountType !== 'none' && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === 'percent' ? '%' : '₲'}
                  className="w-20 bg-neutral-900 border border-neutral-700 rounded px-2 py-0.5 text-xs text-neutral-100 font-mono-nums text-center"
                />
                <span className="text-emerald-400 font-semibold font-mono-nums text-xs">
                  - {formatCurrency(discountBrl, 'PYG')}
                </span>
              </div>
            )}
          </div>

          {/* Total Overview in Guaraní */}
          <div className="p-3 sm:p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
            <div className="text-left min-w-0">
              <span className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
                <span className="text-amber-400 font-bold">🇵🇾 ₲</span>
                <span>{language === 'es' ? 'Total a Pagar (Guaraníes)' : 'Total a Pagar (Guaranis)'}</span>
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono-nums">
                  {formatCurrency(totalBrl, 'PYG')}
                </span>
                {discountBrl > 0 && (
                  <span className="text-xs text-neutral-500 line-through font-mono-nums">
                    {formatCurrency(rawSubtotalBrl, 'PYG')}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                Setor Responsável
              </span>
              <span className="text-xs font-bold text-amber-300">
                {sectorInfo.label}
              </span>
            </div>
          </div>

          {/* Payment Input Area */}
          <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/40 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-300">
                Método de Pagamento (Sincronizado na Hora)
              </span>
              <span className="text-xs text-neutral-400">
                Faltando: <strong className="text-amber-400 font-mono-nums">{formatCurrency(remainingBrl, 'PYG')}</strong>
              </span>
            </div>

            {/* Payment Method selector with 'fiado' and 'transferencia' */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'dinheiro', label: 'Dinheiro Vivo', icon: Banknote },
                { id: 'pix', label: 'Pix / QR', icon: QrCode },
                { id: 'cartao_debito', label: 'Cartão Débito', icon: CreditCard },
                { id: 'cartao_credito', label: 'Cartão Crédito', icon: CreditCard },
                { id: 'transferencia', label: 'Transferência', icon: Landmark },
                { id: 'fiado', label: 'Caderneta / Fiado', icon: BookOpen },
              ].map(m => {
                const Icon = m.icon;
                const isSelected = selectedMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMethod(m.id as PaymentMethod)}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? m.id === 'fiado' 
                          ? 'border-rose-500 bg-rose-500/20 text-rose-200 font-black shadow-md shadow-rose-500/10'
                          : 'border-amber-500 bg-amber-500/15 text-amber-300 font-bold'
                        : 'border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* REAL-TIME FIADO ANTI-LOSS PANEL ("principalmente se for em fiado para nao ter percas") */}
            {isFiadoActive && (
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-rose-950/60 via-neutral-950 to-amber-950/40 border border-rose-500/40 space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-rose-300 text-xs font-black uppercase tracking-wide">
                    <ShieldCheck className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Proteção Anti-Perda de Fiado em Tempo Real</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-200 text-[10px] font-bold flex items-center gap-1">
                    <Radio className="w-2.5 h-2.5 animate-pulse" />
                    Ao Vivo no Admin & Extrato
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-black/40 border border-white/5 text-center">
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase block">Dívida Anterior</span>
                    <span className="text-xs sm:text-sm font-bold text-neutral-200 font-mono-nums">
                      {formatCurrency(previousDebtBrl, 'PYG')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-rose-300 uppercase block">+ Este Fiado</span>
                    <span className="text-xs sm:text-sm font-black text-rose-400 font-mono-nums">
                      + {formatCurrency(activeFiadoAmount, 'PYG')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-300 uppercase block">= Novo Saldo Extrato</span>
                    <span className="text-xs sm:text-sm font-black text-amber-400 font-mono-nums">
                      {formatCurrency(projectedDebtBrl, 'PYG')}
                    </span>
                  </div>
                </div>

                {!selectedCustomer && !customerName.trim() ? (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Selecione o cliente acima ou digite o nome para gravar na tabela SQL de Fiado sem perdas.</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[11px] text-emerald-300 font-medium">
                    <span>
                      ✓ Cliente: <strong>{selectedCustomer?.name || customerName}</strong> — Será gravado imediatamente em <code className="text-amber-300">lancamentos_fiado</code>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Quick 1-click Pay Remaining Full in Guaraní */}
            {remainingBrl > 0 && (
              <button
                type="button"
                onClick={() => handlePayFullInCurrency('PYG')}
                className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer active:scale-98 ${
                  selectedMethod === 'fiado'
                    ? 'bg-gradient-to-r from-rose-500/25 via-amber-500/15 to-rose-500/20 border-rose-500/40 hover:border-rose-400 text-rose-200'
                    : 'bg-gradient-to-r from-amber-500/20 via-amber-500/15 to-emerald-500/15 border-amber-500/30 hover:border-amber-500/50 text-amber-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-current shrink-0" />
                  <span>
                    {selectedMethod === 'fiado'
                      ? `Lançar Total no Fiado / Caderneta (${selectedCustomer?.name || customerName || 'Cliente'})`
                      : `Lançar Total em ${selectedMethod.toUpperCase()} (₲)`}
                  </span>
                </div>
                <span className="font-mono-nums text-white font-black">
                  {formatCurrency(remainingBrl, 'PYG')}
                </span>
              </button>
            )}

            {/* Amount input & Quick buttons */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-400 font-mono">
                    ₲
                  </span>
                  <input
                    type="number"
                    step="1000"
                    value={inputAmount}
                    onChange={(e) => setInputAmount(e.target.value)}
                    placeholder={language === 'es' ? 'Monto recibido en Guaraníes (₲)...' : 'Valor parcial ou recebido em Guaranis (₲)...'}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl pl-9 pr-4 py-2.5 text-base font-mono-nums font-semibold text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddPayment}
                  disabled={!inputAmount || parseFloat(inputAmount) <= 0}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-neutral-950 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  {language === 'es' ? 'Agregar' : 'Adicionar'}
                </button>
              </div>

              {/* Fast quick bills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={handleSetExactRemaining}
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-xs font-medium border border-neutral-700 transition-colors cursor-pointer"
                >
                  {language === 'es' ? 'Valor Exacto' : 'Valor Exato'} ({formatCurrency(remainingBrl, 'PYG')})
                </button>
                {quickBills.map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => handleQuickAddBill(b)}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-mono-nums font-semibold border border-neutral-800 transition-colors cursor-pointer"
                  >
                    +{b.toLocaleString('es-PY')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Payments list (multi-tender) */}
          {payments.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider block">
                {language === 'es' ? `Pagos Registrados (${payments.length})` : `Pagamentos Registrados (${payments.length})`}
              </span>
              <div className="space-y-1.5">
                {payments.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-400 uppercase font-mono-nums">
                        {formatCurrency(p.amountReceived, 'PYG')}
                      </span>
                      <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                        p.method === 'fiado'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-neutral-800 text-neutral-300'
                      }`}>
                        {p.method.replace('_', ' ')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePayment(p.id)}
                      className="text-neutral-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Change (Troco) */}
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">
              {language === 'es' ? 'Vuelto a Entregar (₲)' : 'Troco a Devolver (₲)'}
            </span>
            <span className="text-lg font-black text-amber-400 font-mono-nums">
              {formatCurrency(changeBrl, 'PYG')}
            </span>
          </div>

        </div>

        {/* Footer actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-t border-neutral-800 bg-neutral-950/80 safe-area-pb">
          <div className="flex items-center justify-between sm:block">
            <span className="text-[11px] sm:text-xs text-neutral-400 block">
              {isFiadoActive ? 'Total a Lançar em Fiado / Venda' : 'Total da Venda'}
            </span>
            <span className="text-base sm:text-sm font-bold text-neutral-100 font-mono-nums">
              {formatCurrency(totalBrl, 'PYG')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCloseModal}
              className="py-3 sm:py-2.5 px-3.5 sm:px-4 rounded-xl border border-neutral-800 text-xs font-medium text-neutral-300 hover:bg-neutral-800 active:scale-95 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleFinishSale}
              disabled={isFinishing || (payments.length > 0 && remainingBrl > 0.05)}
              className={`flex-1 py-3 sm:py-2.5 px-4 sm:px-5 rounded-xl text-white text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isFiadoActive
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                {isFinishing
                  ? (language === 'es' ? 'Registrando en tiempo real...' : 'Gravando em tempo real...')
                  : isFiadoActive
                    ? 'Confirmar Fiado em Tempo Real & Cupom'
                    : (language === 'es' ? 'Concluir Venta & Ticket' : 'Confirmar Pagamento na Hora & Cupom')}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
