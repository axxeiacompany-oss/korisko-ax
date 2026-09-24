import React, { useState, useMemo } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { CartItem, Currency, PaymentEntry, PaymentMethod, Sale } from '../../types';
import { formatCurrency, toBrl, fromBrl } from '../../utils/currency';
import { CreditCard, Banknote, QrCode, Plus, Trash2, CheckCircle2, X, Calculator, ArrowRight, UserCheck, BookOpen, Gift, AlertTriangle } from 'lucide-react';

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
  const { exchangeRates, completeSale, customers, redeemCustomerPoints } = useBakery();

  const rawSubtotalBrl = useMemo(() => {
    return cartItems.reduce((acc, it) => acc + it.subtotalBrl, 0);
  }, [cartItems]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState(initialCustomerName || '');

  // Find selected customer
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

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

  const totalBrl = Math.max(0, Math.round((rawSubtotalBrl - discountBrl) * 100) / 100);

  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  
  // Current input for adding a payment entry
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('BRL');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('dinheiro');
  const [inputAmount, setInputAmount] = useState<string>('');
  
  // Preferred currency for change
  const [changeCurrency, setChangeCurrency] = useState<Currency>('BRL');

  // Calculate total paid so far in BRL
  const totalPaidBrl = useMemo(() => {
    return payments.reduce((acc, p) => acc + p.equivalentBrl, 0);
  }, [payments]);

  // Remaining to pay in BRL
  const remainingBrl = Math.max(0, Math.round((totalBrl - totalPaidBrl) * 100) / 100);

  // Change amount in BRL
  const changeBrl = Math.max(0, Math.round((totalPaidBrl - totalBrl) * 100) / 100);

  // Change converted to customer's preferred change currency
  const changeInSelectedCurrency = fromBrl(changeBrl, changeCurrency, exchangeRates);

  // Suggested amount in selected currency for remaining balance
  const suggestedAmountForSelectedCur = useMemo(() => {
    if (remainingBrl <= 0) return 0;
    const converted = fromBrl(remainingBrl, selectedCurrency, exchangeRates);
    return selectedCurrency === 'PYG' ? Math.round(converted) : Math.round(converted * 100) / 100;
  }, [remainingBrl, selectedCurrency, exchangeRates]);

  if (!isOpen) return null;

  const handleSelectCustomer = (cid: string) => {
    setSelectedCustomerId(cid);
    const found = customers.find(c => c.id === cid);
    if (found) {
      setCustomerName(found.name);
    }
  };

  const handleApplyLoyaltyDiscount = () => {
    if (!selectedCustomer || selectedCustomer.loyaltyPoints < 20) return;
    const maxRedeemablePts = Math.min(selectedCustomer.loyaltyPoints, Math.floor(rawSubtotalBrl * 20));
    if (maxRedeemablePts < 20) {
      alert('Pontos insuficientes para resgate mínimo (mínimo 20 pontos).');
      return;
    }
    const discount = redeemCustomerPoints(selectedCustomer.id, maxRedeemablePts);
    setLoyaltyDiscountBrl(discount);
  };

  const handleAddPayment = () => {
    const val = parseFloat(inputAmount);
    if (!val || val <= 0) return;

    if (selectedMethod === 'fiado' && !selectedCustomerId && !customerName.trim()) {
      alert('Para lançar venda como Fiado, selecione ou identifique o cliente.');
      return;
    }

    let eqBrl = 0;
    let rateUsed = 1;

    if (selectedCurrency === 'BRL') {
      eqBrl = val;
      rateUsed = 1;
    } else if (selectedCurrency === 'USD') {
      eqBrl = Math.round(val * exchangeRates.USD_TO_BRL * 100) / 100;
      rateUsed = exchangeRates.USD_TO_BRL;
    } else if (selectedCurrency === 'PYG') {
      eqBrl = Math.round((val / exchangeRates.BRL_TO_PYG) * 100) / 100;
      rateUsed = 1 / exchangeRates.BRL_TO_PYG;
    }

    const newPayment: PaymentEntry = {
      id: `pay-${Date.now()}-${Math.random()}`,
      currency: selectedCurrency,
      amountReceived: val,
      exchangeRateUsed: rateUsed,
      equivalentBrl: eqBrl,
      method: selectedMethod,
    };

    setPayments(prev => [...prev, newPayment]);
    setInputAmount('');
  };

  const handleRemovePayment = (id: string) => {
    setPayments(prev => prev.filter(p => p.id !== id));
  };

  const handleSetExactRemaining = () => {
    setInputAmount(suggestedAmountForSelectedCur.toString());
  };

  const handleQuickAddBill = (val: number) => {
    setInputAmount(val.toString());
  };

  const handleFinishSale = () => {
    if (remainingBrl > 0.05) {
      alert('O valor recebido ainda é menor que o total da venda.');
      return;
    }

    const changeData = changeBrl > 0 ? {
      currency: changeCurrency,
      amount: changeInSelectedCurrency,
      equivalentBrl: changeBrl,
    } : undefined;

    const sale = completeSale(
      cartItems, 
      payments, 
      changeData, 
      customerName || undefined,
      comandaNumber || undefined,
      discountBrl > 0 ? discountBrl : undefined,
      rawSubtotalBrl,
      selectedCustomerId || undefined
    );
    onSaleCompleted(sale);
  };

  // Quick bills based on selected currency
  const quickBills = selectedCurrency === 'BRL'
    ? [10, 20, 50, 100, 200]
    : selectedCurrency === 'PYG'
    ? [20000, 50000, 100000, 200000]
    : [5, 10, 20, 50, 100];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Finalização da Venda</span>
              {comandaNumber && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold font-mono-nums">
                  Comanda #{comandaNumber}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-neutral-100">Pagamento Multi-Moeda & CRM</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* CRM / Customer Selection Box */}
          <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                Vincular Cliente (Fiado / Fidelidade)
              </span>
              {selectedCustomer && (
                <span className="text-[11px] text-amber-400 font-mono-nums">
                  {selectedCustomer.loyaltyPoints} pts de fidelidade
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={selectedCustomerId}
                onChange={(e) => handleSelectCustomer(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
              >
                <option value="">Cliente Avulso (Não cadastrado)</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.category}) — Fiado: {formatCurrency(c.outstandingBalanceBrl, 'BRL')}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nome do cliente no cupom..."
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            {selectedCustomer && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] border-t border-neutral-800/80">
                <div className="flex items-center gap-3">
                  <span className="text-neutral-400">
                    Limite: <strong className="text-neutral-200 font-mono-nums">{formatCurrency(selectedCustomer.creditLimitBrl, 'BRL')}</strong>
                  </span>
                  <span className="text-neutral-400">
                    Fiado Atual: <strong className={selectedCustomer.outstandingBalanceBrl > 0 ? 'text-rose-400 font-mono-nums' : 'text-emerald-400 font-mono-nums'}>
                      {formatCurrency(selectedCustomer.outstandingBalanceBrl, 'BRL')}
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
                    Usar Pontos Fidelidade
                  </button>
                )}
                {loyaltyDiscountBrl > 0 && (
                  <span className="text-emerald-400 font-semibold">
                    ✓ Desconto de Fidelidade Aplicado: -{formatCurrency(loyaltyDiscountBrl, 'BRL')}
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
                  onClick={() => { setDiscountType('fixed'); setDiscountValue('2'); }}
                  className={`px-2 py-1 rounded text-[11px] ${discountType === 'fixed' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                  R$ Fixo
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
                  placeholder={discountType === 'percent' ? '%' : 'R$'}
                  className="w-16 bg-neutral-900 border border-neutral-700 rounded px-2 py-0.5 text-xs text-neutral-100 font-mono-nums text-center"
                />
                <span className="text-emerald-400 font-semibold font-mono-nums text-xs">
                  - {formatCurrency(discountBrl, 'BRL')}
                </span>
              </div>
            )}
          </div>

          {/* Total Overview in 3 Currencies */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-neutral-950 border border-neutral-800">
            <div className="text-left">
              <span className="text-[11px] font-medium text-neutral-400 block">Total a Pagar (BRL)</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-neutral-100 font-mono-nums">
                  {formatCurrency(totalBrl, 'BRL')}
                </span>
                {discountBrl > 0 && (
                  <span className="text-[10px] text-neutral-500 line-through font-mono-nums">
                    {formatCurrency(rawSubtotalBrl, 'BRL')}
                  </span>
                )}
              </div>
            </div>
            <div className="text-left border-l border-neutral-800 pl-3">
              <span className="text-[11px] font-medium text-neutral-400 block">Total em Guaranis (PYG)</span>
              <span className="text-lg font-bold text-amber-400 font-mono-nums">
                {formatCurrency(fromBrl(totalBrl, 'PYG', exchangeRates), 'PYG')}
              </span>
            </div>
            <div className="text-left border-l border-neutral-800 pl-3">
              <span className="text-[11px] font-medium text-neutral-400 block">Total em Dólares (USD)</span>
              <span className="text-lg font-bold text-emerald-400 font-mono-nums">
                {formatCurrency(fromBrl(totalBrl, 'USD', exchangeRates), 'USD')}
              </span>
            </div>
          </div>

          {/* Payment Input Area */}
          <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/40 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-300">Receber Pagamento</span>
              <span className="text-xs text-neutral-400">
                Faltando: <strong className="text-amber-400 font-mono-nums">{formatCurrency(remainingBrl, 'BRL')}</strong>
              </span>
            </div>

            {/* Currency selector tabs */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedCurrency('BRL')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                  selectedCurrency === 'BRL'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-semibold'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <span>🇧🇷 Real (BRL)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCurrency('PYG')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                  selectedCurrency === 'PYG'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-semibold'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <span>🇵🇾 Guaraní (PYG)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCurrency('USD')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                  selectedCurrency === 'USD'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-semibold'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <span>🇺🇸 Dólar (USD)</span>
              </button>
            </div>

            {/* Payment Method selector with 'fiado' */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'dinheiro', label: 'Dinheiro Vivo', icon: Banknote },
                { id: 'pix', label: 'Pix Instantâneo', icon: QrCode },
                { id: 'cartao_debito', label: 'Cartão Débito', icon: CreditCard },
                { id: 'cartao_credito', label: 'Cartão Crédito', icon: CreditCard },
                { id: 'fiado', label: 'Caderneta / Fiado', icon: BookOpen },
              ].map(m => {
                const Icon = m.icon;
                const isSelected = selectedMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMethod(m.id as any)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      isSelected
                        ? m.id === 'fiado' 
                          ? 'border-rose-500 bg-rose-500/20 text-rose-300 font-bold'
                          : 'border-neutral-500 bg-neutral-800 text-neutral-100'
                        : 'border-neutral-800 text-neutral-400 hover:text-neutral-300 hover:bg-neutral-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {selectedMethod === 'fiado' && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  O valor lançado como <strong>Fiado</strong> será debitado na conta do cliente e somará ao saldo a receber.
                </span>
              </div>
            )}

            {/* Amount input & Quick buttons */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    step={selectedCurrency === 'PYG' ? '1000' : '0.01'}
                    value={inputAmount}
                    onChange={(e) => setInputAmount(e.target.value)}
                    placeholder={`Valor recebido em ${selectedCurrency}...`}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2.5 text-base font-mono-nums font-semibold text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  {selectedCurrency !== 'BRL' && inputAmount && parseFloat(inputAmount) > 0 && (
                    <span className="absolute right-3 top-3 text-xs text-neutral-400 font-mono-nums">
                      ≈ {formatCurrency(toBrl(parseFloat(inputAmount), selectedCurrency, exchangeRates), 'BRL')}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleAddPayment}
                  disabled={!inputAmount || parseFloat(inputAmount) <= 0}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-neutral-950 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  Adicionar
                </button>
              </div>

              {/* Fast quick bills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={handleSetExactRemaining}
                  className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-xs font-medium border border-neutral-700 transition-colors"
                >
                  Valor Exato Restante ({suggestedAmountForSelectedCur})
                </button>
                {quickBills.map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => handleQuickAddBill(b)}
                    className="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-mono-nums border border-neutral-800 transition-colors"
                  >
                    +{b}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Payments list (multi-tender) */}
          {payments.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider block">
                Pagamentos Registrados ({payments.length})
              </span>
              <div className="space-y-1.5">
                {payments.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-200 uppercase font-mono-nums">
                        {formatCurrency(p.amountReceived, p.currency)}
                      </span>
                      <span className="text-neutral-500 font-medium">({p.method.replace('_', ' ')})</span>
                      {p.currency !== 'BRL' && (
                        <span className="text-neutral-400 text-[11px] font-mono-nums">
                          → {formatCurrency(p.equivalentBrl, 'BRL')}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePayment(p.id)}
                      className="text-neutral-500 hover:text-rose-400 p-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Change (Troco) */}
          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-neutral-400">Troco a Devolver</span>
              <div className="flex items-center gap-1">
                {(['BRL', 'PYG', 'USD'] as const).map(cur => (
                  <button
                    key={cur}
                    type="button"
                    onClick={() => setChangeCurrency(cur)}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                      changeCurrency === cur
                        ? 'bg-amber-500 text-neutral-950'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {cur}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-base font-bold text-amber-400 font-mono-nums">
                {formatCurrency(changeInSelectedCurrency, changeCurrency)}
              </span>
              {changeCurrency !== 'BRL' && changeBrl > 0 && (
                <span className="text-xs text-neutral-500 font-mono-nums">
                  (Eqv. {formatCurrency(changeBrl, 'BRL')})
                </span>
              )}
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-950/60">
          <div>
            <span className="text-xs text-neutral-400 block">Total da Venda</span>
            <span className="text-sm font-bold text-neutral-200 font-mono-nums">
              {formatCurrency(totalBrl, 'BRL')}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-neutral-800 text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleFinishSale}
              disabled={remainingBrl > 0.05}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-colors flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Concluir Venda e Emitir Cupom
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
