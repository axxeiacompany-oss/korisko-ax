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
import { PaymentMethod } from '../../types';
import { formatCurrency } from '../../utils/currency';

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
    currentUser 
  } = useBakery();

  // Sale form states
  const [amountStr, setAmountStr] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  
  // Quick Add Customer Inline Modal state
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustLimit, setNewCustLimit] = useState('200');

  // Success Feedback
  const [lastSaleReceipt, setLastSaleReceipt] = useState<{
    totalBrl: number;
    paymentMethod: string;
    customerName: string;
    timestamp: string;
    id: string;
  } | null>(null);

  // Parse amount
  const amountBrl = useMemo(() => {
    const clean = amountStr.replace(',', '.');
    const val = parseFloat(clean);
    return isNaN(val) || val <= 0 ? 0 : Math.round(val * 100) / 100;
  }, [amountStr]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // Quick preset amount additions
  const addPreset = (val: number) => {
    const current = amountBrl;
    setAmountStr((current + val).toFixed(2).replace('.', ','));
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
    if (digit === ',' || digit === '.') {
      if (!amountStr.includes(',') && !amountStr.includes('.')) {
        setAmountStr(prev => (prev ? prev + ',' : '0,'));
      }
      return;
    }
    setAmountStr(prev => prev + digit);
  };

  // Handle Quick Add Customer
  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      alert('Informe o nome do cliente.');
      return;
    }

    const created = addCustomer({
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      creditLimitBrl: parseFloat(newCustLimit) || 150,
      category: 'varejo',
    });

    setSelectedCustomerId(created.id);
    setIsAddingCustomer(false);
    setNewCustName('');
    setNewCustPhone('');
  };

  // Confirm Sale
  const handleConfirmDirectSale = () => {
    if (amountBrl <= 0) {
      alert('Digite o valor da venda.');
      return;
    }

    if (paymentMethod === 'fiado') {
      if (!selectedCustomer) {
        alert('Para registrar como Fiado / Caderneta, selecione ou adicione um cliente.');
        return;
      }
      const availableCredit = selectedCustomer.creditLimitBrl - selectedCustomer.outstandingBalanceBrl;
      if (amountBrl > availableCredit) {
        const confirmOverlimit = confirm(
          `Atenção: O limite disponível de ${selectedCustomer.name} é de ${formatCurrency(availableCredit, 'BRL')}, e o valor da compra é ${formatCurrency(amountBrl, 'BRL')}. Deseja autorizar mesmo assim?`
        );
        if (!confirmOverlimit) return;
      }
    }

    const sale = registerDirectSale(
      amountBrl,
      description.trim() || 'Venda Direta Balcão',
      paymentMethod,
      selectedCustomerId || undefined
    );

    setLastSaleReceipt({
      id: sale.id,
      totalBrl: sale.totalBrl,
      paymentMethod: paymentMethod === 'dinheiro' ? 'Dinheiro'
        : paymentMethod === 'pix' ? 'Pix'
        : paymentMethod === 'cartao_debito' ? 'Débito'
        : paymentMethod === 'cartao_credito' ? 'Crédito'
        : 'Fiado / Caderneta',
      customerName: sale.customerName || 'Cliente Avulso',
      timestamp: new Date().toLocaleTimeString('pt-BR'),
    });

    // Reset fields for next fast sale
    setAmountStr('');
    setDescription('');
    setSelectedCustomerId('');

    if (onSaleCompleted) {
      onSaleCompleted();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Top Banner */}
      <div className="p-5 rounded-2xl bg-[#0D121E] border border-[#1E273A] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-emerald-500 p-[2px] shadow-lg shadow-amber-500/10 shrink-0">
            <div className="w-full h-full bg-[#0B0F17] rounded-[14px] flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5 fill-current" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Venda Direta Rápida
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                1 Clique
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Digite apenas o valor, escolha a forma de pagamento ou cliente e confirme instantaneamente.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-[#141B2B] text-neutral-300 border border-[#222E46] font-mono-nums">
            Caixa: <b className={currentSession.status === 'aberto' ? 'text-emerald-400' : 'text-rose-400'}>
              {currentSession.status === 'aberto' ? `Aberto (#${currentSession.sessionNumber})` : 'Fechado'}
            </b>
          </span>
        </div>
      </div>

      {/* Main Fast Sale Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Big Amount & Keypad */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Big Amount Card */}
          <div className="p-6 rounded-2xl bg-[#0F1524] border border-[#1E283D] shadow-xl space-y-4">
            
            <div>
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                Valor da Venda (R$)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-amber-400">
                  R$
                </span>
                <input
                  type="text"
                  autoFocus
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-16 pr-4 py-4 bg-[#090D15] border-2 border-indigo-500/50 rounded-2xl text-3xl sm:text-4xl font-black text-white placeholder-neutral-600 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all font-mono-nums tracking-tight"
                />
              </div>
            </div>

            {/* Quick value chips */}
            <div className="flex flex-wrap gap-2">
              <span className="text-[11px] text-neutral-500 flex items-center mr-1">Atalhos:</span>
              {[2, 5, 10, 20, 50, 100].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => addPreset(val)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#141B2B] hover:bg-indigo-600/30 text-neutral-200 hover:text-white border border-[#222E46] text-xs font-mono font-bold transition-all"
                >
                  +{val}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmountStr('')}
                className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-medium ml-auto"
              >
                Limpar
              </button>
            </div>

            {/* Touch Numerical Keypad */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', ','].map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleKeypadPress(key)}
                  className={`py-3.5 rounded-xl font-mono text-base font-bold transition-all ${
                    key === 'C' 
                      ? 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30' 
                      : 'bg-[#121828] text-white hover:bg-neutral-800 border border-[#1E283D] active:scale-95'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>

            {/* Optional Description */}
            <div>
              <label className="text-[11px] font-medium text-neutral-400 block mb-1">
                Descrição ou Observação (Opcional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Lanche, pães diversos, café da manhã..."
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
                <span>Cliente (Opcional)</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddingCustomer(true)}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Cliente</span>
              </button>
            </div>

            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#090D15] border border-[#1F273A] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Cliente Avulso (Não identificado)</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''} — Saldo: {formatCurrency(c.outstandingBalanceBrl, 'BRL')}
                </option>
              ))}
            </select>

            {/* Selected customer card preview */}
            {selectedCustomer && (
              <div className="p-3 rounded-xl bg-[#0A0E18] border border-[#1E273A] text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{selectedCustomer.name}</span>
                  <span className="text-[10px] text-amber-400 font-semibold">{selectedCustomer.loyaltyPoints} Pontos</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono-nums">
                  <span>Limite: {formatCurrency(selectedCustomer.creditLimitBrl, 'BRL')}</span>
                  <span className={selectedCustomer.outstandingBalanceBrl > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                    Em aberto: {formatCurrency(selectedCustomer.outstandingBalanceBrl, 'BRL')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="p-5 rounded-2xl bg-[#0F1524] border border-[#1E283D] shadow-xl space-y-3">
            <label className="text-xs font-bold text-white block">
              Forma de Pagamento
            </label>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'dinheiro', label: 'Dinheiro', icon: Banknote, color: 'text-emerald-400' },
                { id: 'pix', label: 'Pix', icon: QrCode, color: 'text-teal-400' },
                { id: 'cartao_debito', label: 'Débito', icon: CreditCard, color: 'text-sky-400' },
                { id: 'cartao_credito', label: 'Crédito', icon: CreditCard, color: 'text-indigo-400' },
                { id: 'fiado', label: 'Caderneta (Fiado)', icon: BookOpen, color: 'text-amber-400' },
              ].map(pay => {
                const Icon = pay.icon;
                const isSelected = paymentMethod === pay.id;

                return (
                  <button
                    key={pay.id}
                    type="button"
                    onClick={() => setPaymentMethod(pay.id as PaymentMethod)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
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
            disabled={amountBrl <= 0}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 disabled:pointer-events-none text-white font-black text-sm sm:text-base shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-3 cursor-pointer group"
          >
            <Check className="w-5 h-5 stroke-[3] group-hover:scale-110 transition-transform" />
            <span>Confirmar Venda ({formatCurrency(amountBrl, 'BRL')})</span>
          </button>

          {/* Last Sale Receipt Notification */}
          {lastSaleReceipt && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-2 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Venda Registrada com Sucesso!
                </span>
                <span className="font-mono text-[10px] text-emerald-400">
                  {lastSaleReceipt.timestamp}
                </span>
              </div>
              <div className="flex items-center justify-between font-mono-nums text-sm font-black text-white">
                <span>{lastSaleReceipt.customerName}</span>
                <span>{formatCurrency(lastSaleReceipt.totalBrl, 'BRL')} ({lastSaleReceipt.paymentMethod})</span>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* MODAL: Cadastrar Cliente Instantaneamente */}
      {isAddingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#0D121E] border border-[#1E273A] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1A2234]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-400" />
                <span>Adicionar Novo Cliente Instantâneo</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingCustomer(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1">
                  Nome do Cliente *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="Nome completo ou apelido"
                  className="w-full px-3.5 py-2.5 bg-[#090D15] border border-[#1F273A] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1">
                  WhatsApp / Telefone
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
                  Limite de Crédito Fiado (R$)
                </label>
                <input
                  type="number"
                  value={newCustLimit}
                  onChange={(e) => setNewCustLimit(e.target.value)}
                  placeholder="200.00"
                  className="w-full px-3.5 py-2.5 bg-[#090D15] border border-[#1F273A] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 font-mono-nums"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingCustomer(false)}
                  className="px-4 py-2 rounded-xl border border-[#1E273A] text-xs text-neutral-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
