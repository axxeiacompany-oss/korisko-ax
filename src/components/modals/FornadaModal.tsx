import React, { useState } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { Flame, Clock, CheckCircle2, X, Plus, Sparkles, ChefHat } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const FornadaModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { products, fornadas, registerFornada } = useBakery();

  // Bakery-made items eligible for warm batches
  const bakeryProducts = products.filter(
    p => p.category === 'paes' || p.category === 'salgados' || p.category === 'confeitaria'
  );

  const [selectedProductId, setSelectedProductId] = useState<string>(
    bakeryProducts[0]?.id || products[0]?.id || ''
  );
  const [quantity, setQuantity] = useState<string>('50');
  const [batchNote, setBatchNote] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentProduct = products.find(p => p.id === selectedProductId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0 || !selectedProductId || !currentProduct) {
      alert('Informe um produto e uma quantidade válida.');
      return;
    }

    registerFornada(selectedProductId, qty, currentProduct.unit, batchNote || undefined);

    setSuccessMsg(`Fornada de ${qty} ${currentProduct.unit} de "${currentProduct.name}" registrada no estoque!`);
    setQuantity('50');
    setBatchNote('');

    setTimeout(() => {
      setSuccessMsg(null);
    }, 3500);
  };

  const handleQuickAddQty = (amount: number) => {
    const current = parseFloat(quantity) || 0;
    setQuantity((current + amount).toString());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                Fornada do Padeiro · Pão Quente
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold uppercase tracking-wider">
                  Korisko
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Entrada imediata de produção quente no estoque da loja
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Product selection */}
            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                Produto que saiu do forno
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
              >
                {bakeryProducts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Estoque atual: {p.stock} {p.unit})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick product chips */}
            <div className="flex flex-wrap gap-1.5">
              {bakeryProducts.slice(0, 5).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProductId(p.id)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                    selectedProductId === p.id
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-semibold'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {p.name.split(' ')[0]} {p.name.split(' ')[1] || ''}
                </button>
              ))}
            </div>

            {/* Quantity and unit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                  Quantidade Produzida ({currentProduct?.unit || 'un'})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Ex: 50"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm font-bold font-mono-nums text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Quick Qty Buttons */}
              <div className="flex gap-1.5">
                {[10, 25, 50, 100].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setQuantity(amt.toString())}
                    className="flex-1 py-2.5 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-xs font-mono-nums font-semibold text-neutral-300 rounded-xl transition-colors"
                  >
                    +{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Lote / Obs */}
            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                Lote / Fornada / Observações (Opcional)
              </label>
              <input
                type="text"
                value={batchNote}
                onChange={(e) => setBatchNote(e.target.value)}
                placeholder="Ex: Fornada das 16:30, pão crocante, padeiro Zé"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/10 transition-all flex items-center justify-center gap-2"
            >
              <Flame className="w-4 h-4" />
              Lançar Fornada no Estoque
            </button>
          </form>

          {/* History of recent batches */}
          <div className="pt-4 border-t border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Últimas Fornadas Registradas
              </h3>
              <span className="text-[10px] text-neutral-500">Histórico de Hoje</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {fornadas.length === 0 ? (
                <p className="text-xs text-neutral-500 py-3 text-center">Nenhuma fornada registrada ainda hoje.</p>
              ) : (
                fornadas.slice(0, 5).map(f => {
                  const dateStr = new Date(f.timestamp).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div
                      key={f.id}
                      className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-850 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-mono-nums font-bold">{dateStr}</span>
                        <div>
                          <span className="font-semibold text-neutral-200">{f.productName}</span>
                          <span className="text-[10px] text-neutral-500 block">por {f.bakerName}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold font-mono-nums text-emerald-400">
                          +{f.quantity} {f.unit}
                        </span>
                        {f.batchNumber && (
                          <span className="text-[10px] text-neutral-500 block font-mono-nums">
                            {f.batchNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
