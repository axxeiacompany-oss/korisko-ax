import React, { useState } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { Product } from '../../types';
import { X, ArrowUpDown, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultProduct?: Product | null;
}

export const StockMovementModal: React.FC<Props> = ({
  isOpen,
  onClose,
  defaultProduct,
}) => {
  const { products, adjustStock } = useBakery();

  const [selectedProductId, setSelectedProductId] = useState<string>(
    defaultProduct ? defaultProduct.id : products[0]?.id || ''
  );
  const [movementType, setMovementType] = useState<'entrada' | 'producao' | 'perda' | 'ajuste'>('entrada');
  const [quantity, setQuantity] = useState('10');
  const [reason, setReason] = useState('Entrada de mercadoria com nota fiscal');

  if (!isOpen) return null;

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(quantity);
    if (!selectedProductId || isNaN(qty) || qty < 0) return;

    adjustStock(selectedProductId, movementType, qty, reason.trim() || 'Movimentação manual');
    onClose();
  };

  const getTypeLabel = (t: string) => {
    switch (t) {
      case 'entrada': return 'Entrada de Compras / Fornecedor';
      case 'producao': return 'Produção da Padaria / Fornada';
      case 'perda': return 'Perda / Descarte / Vencimento';
      case 'ajuste': return 'Ajuste de Balanço / Inventário Físico';
      default: return t;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <ArrowUpDown className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100">Movimentar Estoque</h2>
              <p className="text-xs text-neutral-400">Registre entradas, fornadas, perdas ou ajustes</p>
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
          
          {/* Product selector */}
          <div>
            <label className="text-xs font-medium text-neutral-300 block mb-1">
              Selecionar Produto / Insumo
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} (Atual: {p.stock} {p.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Movement Type */}
          <div>
            <label className="text-xs font-medium text-neutral-300 block mb-1.5">
              Tipo de Movimentação
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['entrada', 'producao', 'perda', 'ajuste'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setMovementType(t);
                    if (t === 'producao') setReason('Fornada matinal da padaria');
                    else if (t === 'perda') setReason('Produto danificado ou passou da validade');
                    else if (t === 'ajuste') setReason('Contagem de conferência de estoque');
                    else setReason('Entrada de mercadoria com nota fiscal');
                  }}
                  className={`p-2 rounded-xl border text-xs font-medium text-left transition-all ${
                    movementType === t
                      ? 'border-amber-500 bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {getTypeLabel(t)}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-neutral-300">
                {movementType === 'ajuste' ? 'Novo Estoque Total Contado' : 'Quantidade da Movimentação'}
              </label>
              {selectedProduct && (
                <span className="text-xs text-neutral-400">
                  Unidade: <strong className="text-amber-400">{selectedProduct.unit}</strong>
                </span>
              )}
            </div>
            <input
              type="number"
              step="0.1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm font-mono-nums font-semibold text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs font-medium text-neutral-300 block mb-1">
              Motivo / Justificativa
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Fornada extra das 16:30 para horário de pico"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
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
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold shadow-lg shadow-amber-500/10 transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              Confirmar Movimentação
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
