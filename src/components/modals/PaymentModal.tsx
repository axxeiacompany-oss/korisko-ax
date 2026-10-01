import React, { useState, useMemo } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { CartItem, Currency, PaymentEntry, PaymentMethod, Sale } from '../../types';
import { formatCurrency, toBrl, fromBrl } from '../../utils/currency';
import { CreditCard, Banknote, QrCode, Plus, Trash2, CheckCircle2, X, Calculator, ArrowRight, UserCheck, BookOpen, Gift, AlertTriangle, Zap } from 'lucide-react';

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
  const { exchangeRates, completeSale, customers, redeemCustomerPoints, language, t, showToast } = useBakery();

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

  const totalBrl = Math.max(0, Math.round(rawSubtotalBrl - discountBrl));

  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  
  // Current input for adding a payment entry (Moeda única oficial: Guaraní ₲)
  const selectedCurrency: Currency = 'PYG';
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('dinheiro');
  const [inputAmount, setInputAmount] = useState<string>('');
  
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
  const changeInSelectedCurrency = changeBrl;

  // Suggested amount in Guaraní
  const suggestedAmountForSelectedCur = remainingBrl;

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
        language === 'es' ? 'Para registrar venta como Cuenta Corriente, seleccione un cliente.' : 'Para lançar venda como Fiado, selecione ou identifique o cliente.',
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

  const [isFinishing, setIsFinishing] = useState(false);

  const handleFinishSale = async () => {
    let finalPayments = [...payments];

    // Se nenhum pagamento avulso foi adicionado, assume o valor exato no método selecionado (ex: Dinheiro)
    if (finalPayments.length === 0 && totalBrl > 0) {
      if (selectedMethod === 'fiado' && !selectedCustomerId && !customerName.trim()) {
        showToast(
          language === 'es' ? 'Para registrar venta como Cuenta Corriente, seleccione un cliente.' : 'Para lançar venda como Fiado, selecione ou identifique o cliente.',
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
      const sale = await completeSale(
        cartItems, 
        finalPayments, 
        changeData, 
        customerName || undefined,
        comandaNumber || undefined,
        discountBrl > 0 ? discountBrl : undefined,
        rawSubtotalBrl,
        selectedCustomerId || undefined
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-neutral-900 border-t sm:border border-neutral-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200 max-h-[94vh] sm:max-h-[92vh] flex flex-col">
        
        {/* Mobile drag handle */}
        <div className="sm:hidden w-12 h-1 rounded-full bg-neutral-700 mx-auto mt-2.5 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] sm:text-xs font-semibold text-amber-500 uppercase tracking-wider">
                {language === 'es' ? 'Finalización de la Venta' : 'Finalização da Venda'}
              </span>
              {comandaNumber && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold font-mono-nums">
                  Comanda #{comandaNumber}
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-neutral-100">
              {language === 'es' ? 'Cobro Multi-Moneda' : 'Pagamento Multi-Moeda & CRM'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">

          {/* CRM / Customer Selection Box */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-2">
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
                    {c.name} ({c.category}) — Fiado: {formatCurrency(c.outstandingBalanceBrl, 'PYG')}
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
                    Limite: <strong className="text-neutral-200 font-mono-nums">{formatCurrency(selectedCustomer.creditLimitBrl, 'PYG')}</strong>
                  </span>
                  <span className="text-neutral-400">
                    Fiado Atual: <strong className={selectedCustomer.outstandingBalanceBrl > 0 ? 'text-rose-400 font-mono-nums' : 'text-emerald-400 font-mono-nums'}>
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
                    Usar Pontos Fidelidade
                  </button>
                )}
                {loyaltyDiscountBrl > 0 && (
                  <span className="text-emerald-400 font-semibold">
                    ✓ Desconto de Fidelidade Aplicado: -{formatCurrency(loyaltyDiscountBrl, 'PYG')}
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
            {discountBrl > 0 && (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 font-mono-nums">
                - {formatCurrency(discountBrl, 'PYG')}
              </span>
            )}
          </div>

          {/* Payment Input Area */}
          <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/40 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-300">Receber Pagamento (₲)</span>
              <span className="text-xs text-neutral-400">
                Faltando: <strong className="text-amber-400 font-mono-nums">{formatCurrency(remainingBrl, 'PYG')}</strong>
              </span>
            </div>

            {/* Quick 1-click Pay Remaining Full in Guaraní */}
            {remainingBrl > 0 && (
              <button
                type="button"
                onClick={() => handlePayFullInCurrency('PYG')}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-500/15 to-emerald-500/15 border border-amber-500/30 hover:border-amber-500/50 text-amber-300 text-xs font-bold transition-all flex items-center justify-between cursor-pointer active:scale-98"
              >
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-current shrink-0" />
                  <span>
                    {language === 'es' ? 'Pagar Total en Guaraníes (₲)' : 'Pagar Total em Guaranis (₲)'}
                  </span>
                </div>
                <span className="font-mono-nums text-white font-black">
                  {formatCurrency(remainingBrl, 'PYG')}
                </span>
              </button>
            )}

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
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-400 font-mono">
                    ₲
                  </span>
                  <input
                    type="number"
                    step="1000"
                    value={inputAmount}
                    onChange={(e) => setInputAmount(e.target.value)}
                    placeholder={language === 'es' ? 'Monto recibido en Guaraníes (₲)...' : 'Valor recebido em Guaranis (₲)...'}
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
                      <span className="text-neutral-400 font-medium">({p.method.replace('_', ' ')})</span>
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
            <span className="text-[11px] sm:text-xs text-neutral-400 block">Total da Venda</span>
            <span className="text-base sm:text-sm font-bold text-neutral-100 font-mono-nums">
              {formatCurrency(totalBrl, 'PYG')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-3 sm:py-2.5 px-3.5 sm:px-4 rounded-xl border border-neutral-800 text-xs font-medium text-neutral-300 hover:bg-neutral-800 active:scale-95 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleFinishSale}
              disabled={isFinishing || (payments.length > 0 && remainingBrl > 0.05)}
              className="flex-1 py-3 sm:py-2.5 px-4 sm:px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{isFinishing ? (language === 'es' ? 'Registrando venta...' : 'Gravando venda...') : (language === 'es' ? 'Concluir Venta & Ticket' : 'Concluir Venda & Cupom')}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
