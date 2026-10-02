import React, { useState } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { Currency } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { 
  X, 
  ArrowDownRight, 
  ArrowUpRight, 
  Check, 
  FileText, 
  Tag, 
  DollarSign, 
  UserCheck, 
  AlertCircle 
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  type: 'entrada' | 'saida' | 'sangria' | 'suprimento';
}

const ENTRADA_CATEGORIES = [
  'Reforço de Troco / Gaveta',
  'Aporte de Capital / Proprietário',
  'Devolução de Troco / Adiantamento',
  'Recebimento Avulso',
  'Outra Entrada Justificada',
];

const SAIDA_CATEGORIES = [
  'Transferência para Cofre / Malote',
  'Pagamento de Fornecedor / Insumos',
  'Despesas Operacionais / Limpeza',
  'Vale / Adiantamento de Funcionário',
  'Compras Emergenciais de Balcão',
  'Outra Saída Justificada',
];

export const SangriaSuprimentoModal: React.FC<Props> = ({
  isOpen,
  onClose,
  type,
}) => {
  const { recordEntradaCaixa, recordSaidaCaixa, currentUser, language } = useBakery();

  const isSaida = type === 'saida' || type === 'sangria';
  const categories = isSaida ? SAIDA_CATEGORIES : ENTRADA_CATEGORIES;

  const [amount, setAmount] = useState('');
  const currency: Currency = 'PYG';
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [reason, setReason] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount.replace(',', '.'));
    if (isNaN(val) || val <= 0) return;

    const finalReason = reason.trim() ? reason.trim() : selectedCategory;

    if (isSaida) {
      recordSaidaCaixa(val, 'PYG', finalReason, selectedCategory, documentNumber);
    } else {
      recordEntradaCaixa(val, 'PYG', finalReason, selectedCategory, documentNumber);
    }

    // Reset and close
    setAmount('');
    setReason('');
    setDocumentNumber('');
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="w-full max-w-lg max-h-[92vh] flex flex-col bg-[#0F1420] border border-[#1F273A] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className={`shrink-0 flex items-center justify-between px-5 sm:px-6 py-4 border-b ${
          isSaida 
            ? 'border-rose-950/40 bg-gradient-to-r from-rose-950/30 to-[#0F1420]' 
            : 'border-emerald-950/40 bg-gradient-to-r from-emerald-950/30 to-[#0F1420]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${
              isSaida 
                ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400' 
                : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
            }`}>
              {isSaida ? <ArrowDownRight className="w-5 h-5 stroke-[2.5]" /> : <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  {isSaida 
                    ? (language === 'es' ? 'Salida de Caja' : 'Saída de Caixa') 
                    : (language === 'es' ? 'Entrada de Caja' : 'Entrada de Caixa')}
                </h2>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  isSaida 
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {isSaida ? (language === 'es' ? 'Retiro / Pago' : 'Retirada / Despesa') : (language === 'es' ? 'Aporte / Ingreso' : 'Aporte / Reforço')}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {isSaida 
                  ? (language === 'es' ? 'Registro auditable de retiro de dinero de la gaveta' : 'Registro auditável de saída ou retirada de dinheiro da gaveta') 
                  : (language === 'es' ? 'Registro auditable de ingreso de cambio o aporte' : 'Registro auditável de entrada ou reforço de troco na gaveta')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-5">
          
          {/* Amount in Guaraní */}
          <div className="space-y-1.5">
            <label htmlFor="cash-movement-amount" className="text-xs font-semibold text-neutral-300 block">
              {language === 'es' 
                ? `Monto de la ${isSaida ? 'Salida' : 'Entrada'} (₲ Guaraní)` 
                : `Valor da ${isSaida ? 'Saída' : 'Entrada'} (₲ Guaraní)`} <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-400 font-mono font-bold text-sm">
                ₲
              </div>
              <input
                id="cash-movement-amount"
                name="amount"
                type="number"
                step="1000"
                min="1000"
                required
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50000"
                className="w-full bg-[#0A0E18] border border-[#1F273A] rounded-xl pl-10 pr-4 py-3 text-lg font-mono-nums font-bold text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 placeholder-neutral-600 transition-all"
              />
            </div>

            {/* Quick chips in Guaraní */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {[20000, 50000, 100000, 200000, 500000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val.toString())}
                  className="px-2.5 py-1 rounded-lg bg-[#141B2B] hover:bg-neutral-800 text-neutral-300 text-xs font-mono font-semibold border border-[#222E46] transition-all cursor-pointer"
                >
                  +{val.toLocaleString('es-PY')}
                </button>
              ))}
            </div>
          </div>

          {/* Category Quick Chips */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-neutral-400" />
              {language === 'es' ? 'Categoria do Lançamento' : 'Categoria do Lançamento'}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    if (!reason || categories.includes(reason)) {
                      setReason(cat);
                    }
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? isSaida 
                        ? 'border-rose-500/50 bg-rose-500/20 text-rose-200' 
                        : 'border-emerald-500/50 bg-emerald-500/20 text-emerald-200'
                      : 'border-[#1F273A] bg-[#0A0E18] text-neutral-400 hover:text-neutral-200 hover:bg-[#141B2D]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Detailed Reason / Justification */}
          <div className="space-y-1.5">
            <label htmlFor="cash-movement-reason" className="text-xs font-semibold text-neutral-300 block">
              {language === 'es' ? 'Detalhe / Justificativa da Operação' : 'Detalhe / Justificativa da Operação'} <span className="text-rose-400">*</span>
            </label>
            <input
              id="cash-movement-reason"
              name="reason"
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isSaida ? 'Ex: Pagamento entregador de gás, recolhimento cofre às 15h...' : 'Ex: Reforço de cédulas de R$ 2 e R$ 5 para a gaveta...'}
              className="w-full bg-[#0A0E18] border border-[#1F273A] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 placeholder-neutral-500 transition-all font-sans"
            />
          </div>

          {/* Document / Receipt Number (Optional) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="cash-movement-doc" className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-neutral-400" />
                {language === 'es' ? 'Nº Comprovante / Recibo' : 'Nº Comprovante / Recibo / Nota'}
              </label>
              <span className="text-[10px] text-neutral-500 font-medium">Opcional</span>
            </div>
            <input
              id="cash-movement-doc"
              name="documentNumber"
              type="text"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              placeholder="Ex: NF-e 4890, Recibo nº 12, Comprovante Pix..."
              className="w-full bg-[#0A0E18] border border-[#1F273A] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 placeholder-neutral-500 transition-all font-mono"
            />
          </div>

          {/* Operator Audit Info */}
          <div className="p-3 rounded-xl bg-[#0A0E18] border border-[#1F273A] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-neutral-400">
              <UserCheck className="w-4 h-4 text-indigo-400" />
              <span>Operador Responsável: <strong className="text-white font-medium">{currentUser.name}</strong></span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-neutral-500">
              <AlertCircle className="w-3.5 h-3.5 text-neutral-400" />
              <span>Lançamento auditável</span>
            </div>
          </div>

          {/* Actions */}
          <div className="shrink-0 flex items-center justify-end gap-3 pt-4 border-t border-[#1F273A] bg-[#0F1420] sticky bottom-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#1F273A] text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800/50 transition-colors cursor-pointer"
            >
              {language === 'es' ? 'Cancelar' : 'Cancelar'}
            </button>
            <button
              type="submit"
              className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
                isSaida 
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/30' 
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30'
              }`}
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isSaida ? (language === 'es' ? 'Confirmar Salida de Caja' : 'Confirmar Saída de Caixa') : (language === 'es' ? 'Confirmar Entrada de Caja' : 'Confirmar Entrada de Caixa')}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
