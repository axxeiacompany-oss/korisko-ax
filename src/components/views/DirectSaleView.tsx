import React, { useState, useMemo } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { 
  Zap, 
  UserPlus, 
  Check, 
  DollarSign, 
  CreditCard, 
  QrCode, 
  Banknote, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle,
  X,
  User,
  ArrowRight,
  Sparkles,
  Receipt,
  RotateCcw,
  Plus
} from 'lucide-react';
import { PaymentMethod, Currency } from '../../types';
import { formatCurrency, toBrl, fromBrl } from '../../utils/currency';

interface Props {
  onSaleCompleted?: () => void;
}

export const DirectSaleView: React.FC<Props> = ({ onSaleCompleted }) => {
  const { 
    registerDirectSale, 
    customers, 
    addCustomer, 
    currentSession, 
    exchangeRates,
    currentUser,
    t,
    language 
  } = useBakery();

  // Sale form states (Moeda única oficial: Guaraní ₲)
  const selectedCurrency: Currency = 'PYG';
  const [amountStr, setAmountStr] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  
  // Quick Add Customer Inline Modal state
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustLimit, setNewCustLimit] = useState('200000');

  // Success Feedback
  const [lastSaleReceipt, setLastSaleReceipt] = useState<{
    totalBrl: number;
    amountInCurrency: number;
    currency: Currency;
    paymentMethod: string;
    customerName: string;
    timestamp: string;
    id: string;
  } | null>(null);
  const [statusNotice, setStatusNotice] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const showNotice = (message: string, type: 'error' | 'success' = 'error') => {
    setStatusNotice({ type, message });
    setTimeout(() => setStatusNotice(null), 4000);
  };

  // Parse raw number typed in Guaraní
  const rawInputNumber = useMemo(() => {
    const clean = amountStr.replace(/\./g, '').replace(',', '.');
    const val = parseFloat(clean);
    return isNaN(val) || val <= 0 ? 0 : Math.round(val);
  }, [amountStr]);

  // Monto em Guaraní
  const amountBrl = rawInputNumber;

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // Quick preset amount additions in Guaranís (₲)
  const addPreset = (val: number) => {
    const nextVal = rawInputNumber + val;
    setAmountStr(Math.round(nextVal).toString());
  };

  const handleKeypadPress = (digit: string) => {
    if (digit === 'C') {
      setAmountStr('');
      return;
    }
    if (digit === '⌫') {
      setAmountStr(prev => prev.slice(0, -1));
      return;
    }
    if (digit === '000') {
      if (!amountStr || amountStr === '0') return;
      setAmountStr(prev => prev + '000');
      return;
    }
    if (digit === ',' || digit === '.') {
      if (!amountStr || amountStr === '0') return;
      setAmountStr(prev => prev + '000');
      return;
    }
    setAmountStr(prev => prev + digit);
  };

  // Quick presets in Guaraní bills
  const quickPresets = [5000, 10000, 20000, 50000, 100000, 200000];
  const currencySymbol = '₲';

  // Handle Quick Add Customer
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      showNotice('Informe o nome do cliente.', 'error');
      return;
    }

    try {
      const created = await addCustomer({
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        creditLimitBrl: parseFloat(newCustLimit) || 150,
        category: 'varejo',
      });

      setSelectedCustomerId(created.id);
      setIsAddingCustomer(false);
      setNewCustName('');
      setNewCustPhone('');
      showNotice(`Cliente "${created.name}" cadastrado com sucesso!`, 'success');
    } catch (err: any) {
      showNotice(`Erro ao cadastrar cliente: ${err.message}`, 'error');
    }
  };

  const [isSubmittingDirect, setIsSubmittingDirect] = useState(false);

  // Confirm Sale
  const handleConfirmDirectSale = async () => {
    if (amountBrl <= 0) {
      showNotice('Digite o valor da venda.', 'error');
      return;
    }

    if (paymentMethod === 'fiado') {
      if (!selectedCustomer) {
        showNotice(language === 'es' 
          ? 'Para registrar como Crédito / Fiado, por favor seleccione o agregue un cliente.' 
          : 'Para registrar como Fiado / Caderneta, selecione ou adicione um cliente.', 'error');
        return;
      }
    }

    setIsSubmittingDirect(true);
    try {
      const sale = await registerDirectSale(
        amountBrl,
        description.trim() || (language === 'es' ? 'Venta Directa Mostrador' : 'Venda Direta Balcão'),
        paymentMethod,
        selectedCustomerId || undefined,
        selectedCurrency,
        rawInputNumber
      );

      setLastSaleReceipt({
        id: sale.id,
        totalBrl: sale.totalBrl,
        amountInCurrency: rawInputNumber,
        currency: selectedCurrency,
        paymentMethod: paymentMethod === 'dinheiro' ? (language === 'es' ? 'Efectivo' : 'Dinheiro')
          : paymentMethod === 'pix' ? 'Pix / QR'
          : paymentMethod === 'cartao_debito' ? (language === 'es' ? 'Débito' : 'Débito')
          : paymentMethod === 'cartao_credito' ? (language === 'es' ? 'Crédito' : 'Crédito')
          : (language === 'es' ? 'Crédito / Fiado' : 'Fiado / Caderneta'),
        customerName: sale.customerName || (language === 'es' ? 'Cliente Casual' : 'Cliente Avulso'),
        timestamp: new Date().toLocaleTimeString(language === 'es' ? 'es-PY' : 'pt-BR'),
      });

      // Reset fields for next fast sale
      setAmountStr('');
      setDescription('');
      setSelectedCustomerId('');

      if (onSaleCompleted) {
        onSaleCompleted();
      }
    } catch (err: any) {
      showNotice(`Falha ao registrar venda direta: ${err.message}`, 'error');
    } finally {
      setIsSubmittingDirect(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-24 lg:pb-0">
      
      {/* Notice Banner */}
      {statusNotice && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between shadow-lg animate-in fade-in ${
          statusNotice.type === 'error'
            ? 'bg-rose-500/15 border-rose-500/30 text-rose-200'
            : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
        }`}>
          <span>{statusNotice.message}</span>
          <button type="button" onClick={() => setStatusNotice(null)} className="text-neutral-400 hover:text-white p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0D121E] border border-[#1E273A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-emerald-500 p-[2px] shadow-lg shadow-amber-500/10 shrink-0">
            <div className="w-full h-full bg-[#0B0F17] rounded-[14px] flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5 fill-current" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-black text-white tracking-tight">
                {t.directSaleTitle}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                {language === 'es' ? '1 Clic' : '1 Clique'}
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              {t.directSaleSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-[#141B2B] text-neutral-300 border border-[#222E46] font-mono-nums">
            {language === 'es' ? 'Caja:' : 'Caixa:'} <b className={currentSession.status === 'aberto' ? 'text-emerald-400' : 'text-rose-400'}>
              {currentSession.status === 'aberto' ? (language === 'es' ? `Abierta (#${currentSession.sessionNumber})` : `Aberto (#${currentSession.sessionNumber})`) : (language === 'es' ? 'Cerrada' : 'Fechado')}
            </b>
          </span>
        </div>
      </div>

      {/* Main Fast Sale Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        
        {/* Left Column: Big Amount & Keypad */}
        <div className="lg:col-span-7 space-y-3 sm:space-y-4">

          {/* Big Amount Card */}
          <div className="p-4 sm:p-6 rounded-2xl bg-[#0F1524] border border-[#1E283D] shadow-xl space-y-3 sm:space-y-4">
            
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-amber-400 font-extrabold text-sm">🇵🇾 ₲</span>
                  <span>{language === 'es' ? 'Monto a Cobrar (Guaraní)' : 'Valor a Cobrar (Guaraní)'}</span>
                </label>
                <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                  PYG (₲)
                </span>
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-amber-400 font-mono">
                  ₲
                </span>
                <input
                  type="text"
                  autoFocus
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0"
                  className="w-full pl-16 pr-4 py-3.5 sm:py-4 bg-[#090D15] border-2 border-indigo-500/50 rounded-2xl text-3xl sm:text-4xl font-black text-white placeholder-neutral-600 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all font-mono-nums tracking-tight"
                />
              </div>
            </div>

            {/* Quick value chips - Smooth swipe on mobile */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              <span className="text-[11px] text-neutral-500 shrink-0 mr-0.5">
                {language === 'es' ? 'Billetes:' : 'Notas:'}
              </span>
              {quickPresets.map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => addPreset(val)}
                  className="px-3 py-1.5 rounded-lg bg-[#141B2B] hover:bg-indigo-600/30 active:scale-95 text-neutral-200 hover:text-white border border-[#222E46] text-xs font-mono font-bold transition-all shrink-0 cursor-pointer"
                >
                  +{val.toLocaleString('es-PY')}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmountStr('')}
                className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 text-rose-300 border border-rose-500/20 text-xs font-medium shrink-0 ml-auto cursor-pointer"
              >
                {language === 'es' ? 'Borrar' : 'Limpar'}
              </button>
            </div>

            {/* Touch Numerical Keypad with ergonomic thumb height and 000 */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', '⌫'].map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleKeypadPress(key)}
                  className={`h-13 sm:h-14 rounded-2xl font-mono text-xl sm:text-lg font-bold transition-all cursor-pointer shadow-sm active:scale-90 flex items-center justify-center ${
                    key === '⌫' 
                      ? 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30' 
                      : key === '000'
                      ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 text-base font-extrabold'
                      : 'bg-[#121828] text-white hover:bg-neutral-800 border border-[#1E283D]'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>

            {/* Optional Description */}
            <div>
              <label className="text-[11px] font-medium text-neutral-400 block mb-1">
                {language === 'es' ? 'Descripción u Observación (Opcional)' : 'Descrição ou Observação (Opcional)'}
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={language === 'es' ? 'Ej: Merienda, panes diversos, café...' : 'Ex: Lanche, pães diversos, café da manhã...'}
                className="w-full px-3.5 py-2.5 bg-[#090D15] border border-[#1F273A] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 font-sans"
              />
            </div>

          </div>

        </div>

        {/* Right Column: Customer & Payment Method & Confirm */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Customer Selection or Quick Add */}
          <div className="p-5 rounded-2xl bg-[#0F1524] border border-[#1E283D] shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span>{language === 'es' ? 'Cliente (Opcional)' : 'Cliente (Opcional)'}</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddingCustomer(true)}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'es' ? 'Nuevo Cliente' : 'Novo Cliente'}</span>
              </button>
            </div>

            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#090D15] border border-[#1F273A] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">{language === 'es' ? 'Cliente Ocasional (No identificado)' : 'Cliente Avulso (Não identificado)'}</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''} — {language === 'es' ? 'Saldo:' : 'Saldo:'} {formatCurrency(c.outstandingBalanceBrl, 'BRL')}
                </option>
              ))}
            </select>

            {/* Selected customer card preview */}
            {selectedCustomer && (
              <div className="p-3 rounded-xl bg-[#0A0E18] border border-[#1E273A] text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{selectedCustomer.name}</span>
                  <span className="text-[10px] text-amber-400 font-semibold">{selectedCustomer.loyaltyPoints} {language === 'es' ? 'Puntos' : 'Pontos'}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono-nums">
                  <span>{language === 'es' ? 'Límite:' : 'Limite:'} {formatCurrency(selectedCustomer.creditLimitBrl, 'BRL')}</span>
                  <span className={selectedCustomer.outstandingBalanceBrl > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                    {language === 'es' ? 'Pendiente:' : 'Em aberto:'} {formatCurrency(selectedCustomer.outstandingBalanceBrl, 'BRL')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="p-5 rounded-2xl bg-[#0F1524] border border-[#1E283D] shadow-xl space-y-3">
            <label className="text-xs font-bold text-white block">
              {t.directSalePaymentMethod}
            </label>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'dinheiro', label: language === 'es' ? 'Efectivo' : 'Dinheiro', icon: Banknote, color: 'text-emerald-400' },
                { id: 'pix', label: 'Pix / QR', icon: QrCode, color: 'text-teal-400' },
                { id: 'cartao_debito', label: language === 'es' ? 'Débito' : 'Débito', icon: CreditCard, color: 'text-sky-400' },
                { id: 'cartao_credito', label: language === 'es' ? 'Crédito' : 'Crédito', icon: CreditCard, color: 'text-indigo-400' },
                { id: 'fiado', label: language === 'es' ? 'Crédito (Fiado)' : 'Caderneta (Fiado)', icon: BookOpen, color: 'text-amber-400' },
              ].map(pay => {
                const Icon = pay.icon;
                const isSelected = paymentMethod === pay.id;

                return (
                  <button
                    key={pay.id}
                    type="button"
                    onClick={() => setPaymentMethod(pay.id as PaymentMethod)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/20 text-white shadow-md'
                        : 'border-[#1C2538] bg-[#090D15] text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${pay.color}`} />
                    <span className="text-xs font-semibold">{pay.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            onClick={handleConfirmDirectSale}
            disabled={amountBrl <= 0 || isSubmittingDirect}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 disabled:pointer-events-none text-white font-black text-sm sm:text-base shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-3 cursor-pointer group"
          >
            <Check className="w-5 h-5 stroke-[3] group-hover:scale-110 transition-transform" />
            <span>
              {isSubmittingDirect 
                ? (language === 'es' ? 'Guardando en Supabase...' : 'Gravando no Supabase...')
                : `${language === 'es' ? 'Confirmar Venta' : 'Confirmar Venda'} (${formatCurrency(rawInputNumber, 'PYG')})`
              }
            </span>
          </button>

          {/* Last Sale Receipt Notification */}
          {lastSaleReceipt && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-2 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  {language === 'es' ? '¡Venta Registrada con Éxito!' : 'Venda Registrada com Sucesso!'}
                </span>
                <span className="font-mono text-[10px] text-emerald-400">
                  {lastSaleReceipt.timestamp}
                </span>
              </div>
              <div className="flex items-center justify-between font-mono-nums text-sm font-black text-white">
                <span>{lastSaleReceipt.customerName}</span>
                <span>
                  {formatCurrency(lastSaleReceipt.amountInCurrency, 'PYG')} ({lastSaleReceipt.paymentMethod})
                </span>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Mobile Sticky Quick Confirm Bar */}
      {amountBrl > 0 && (
        <div className="lg:hidden fixed bottom-[68px] left-3 right-3 z-30 animate-in slide-in-from-bottom-2 duration-150">
          <button
            type="button"
            onClick={handleConfirmDirectSale}
            disabled={isSubmittingDirect}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-500 text-white font-black text-sm shadow-2xl flex items-center justify-between active:scale-98 transition-all cursor-pointer border border-emerald-400 ring-2 ring-emerald-500/20"
          >
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 stroke-[3]" />
              <span>
                {isSubmittingDirect 
                  ? (language === 'es' ? 'Guardando...' : 'Gravando...')
                  : (language === 'es' ? 'Confirmar Venta' : 'Confirmar Venda')
                }
              </span>
            </div>
            <div className="text-right">
              <span className="font-mono-nums text-base font-black block">
                {formatCurrency(rawInputNumber, 'PYG')}
              </span>
            </div>
          </button>
        </div>
      )}

      {/* MODAL: Cadastrar Cliente Instantaneamente */}
      {isAddingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#0D121E] border border-[#1E273A] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1A2234]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-400" />
                <span>{language === 'es' ? 'Agregar Nuevo Cliente Rápido' : 'Adicionar Novo Cliente Instantâneo'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingCustomer(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1">
                  {language === 'es' ? 'Nombre del Cliente *' : 'Nome do Cliente *'}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder={language === 'es' ? 'Nombre completo o alias' : 'Nome completo ou apelido'}
                  className="w-full px-3.5 py-2.5 bg-[#090D15] border border-[#1F273A] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1">
                  WhatsApp / {language === 'es' ? 'Teléfono' : 'Telefone'}
                </label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3.5 py-2.5 bg-[#090D15] border border-[#1F273A] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1">
                  {language === 'es' ? 'Límite de Crédito (₲)' : 'Limite de Crédito Fiado (₲)'}
                </label>
                <input
                  type="number"
                  value={newCustLimit}
                  onChange={(e) => setNewCustLimit(e.target.value)}
                  placeholder="200000"
                  className="w-full px-3.5 py-2.5 bg-[#090D15] border border-[#1F273A] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 font-mono-nums"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingCustomer(false)}
                  className="px-4 py-2 rounded-xl border border-[#1E273A] text-xs text-neutral-400 hover:text-white cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  {language === 'es' ? 'Guardar Cliente' : 'Salvar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
