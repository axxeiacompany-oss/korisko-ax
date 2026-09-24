import React, { useState } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { Currency } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { X, ArrowDownRight, ArrowUpRight, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  type: 'sangria' | 'suprimento';
}

export const SangriaSuprimentoModal: React.FC<Props> = ({
  isOpen,
  onClose,
  type,
}) => {
  const { recordSangria, recordSuprimento } = useBakery();

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('BRL');
  const [reason, setReason] = useState(
    type === 'sangria' 
      ? 'Retirada de segurança para o cofre' 
      : 'Reforço de moedas e notas de troco'
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    if (type === 'sangria') {
      recordSangria(val, currency, reason);
    } else {
      recordSuprimento(val, currency, reason);
    }

    onClose();
  };

  const isSangria = type === 'sangria';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isSangria 
                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' 
                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            }`}>
              {isSangria ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100">
                {isSangria ? 'Sangria de Caixa (Retirada)' : 'Suprimento de Caixa (Entrada)'}
              </h2>
              <p className="text-xs text-neutral-400">
                {isSangria ? 'Transferência de valores para cofre ou despesa' : 'Reforço de dinheiro para troco na gaveta'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Currency selection */}
          <div>
            <label className="text-xs font-medium text-neutral-300 block mb-1.5">
              Moeda da Operação
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['BRL', 'PYG', 'USD'] as const).map(cur => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => setCurrency(cur)}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                    currency === cur
                      ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-semibold'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {cur === 'BRL' && 'Real (R$)'}
                  {cur === 'PYG' && 'Guaraní (₲)'}
                  {cur === 'USD' && 'Dólar ($)'}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-medium text-neutral-300 block mb-1">
              Valor da {isSangria ? 'Retirada' : 'Entrada'}
            </label>
            <input
              type="number"
              step={currency === 'PYG' ? '1000' : '0.01'}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Digite o valor em ${currency}...`}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-base font-mono-nums font-semibold text-neutral-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs font-medium text-neutral-300 block mb-1">
              Motivo / Destino do Dinheiro
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Pagamento entregador de gás ou recolhimento cofre"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-neutral-800 text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-5 py-2 rounded-xl text-white text-xs font-semibold shadow-lg transition-colors flex items-center gap-1.5 ${
                isSangria 
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20' 
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
              }`}
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              {isSangria ? 'Confirmar Sangria' : 'Confirmar Suprimento'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
