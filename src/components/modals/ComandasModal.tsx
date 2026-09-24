import React, { useState } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { Comanda, CartItem } from '../../types';
import { formatCurrency, fromBrl } from '../../utils/currency';
import { 
  CreditCard, 
  Trash2, 
  X, 
  Plus, 
  Check, 
  Clock, 
  User, 
  ArrowRight, 
  Receipt,
  UtensilsCrossed,
  Tag
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentCartItems: CartItem[];
  onLoadComanda: (comanda: Comanda) => void;
  onClearCart?: () => void;
}

export const ComandasModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentCartItems,
  onLoadComanda,
  onClearCart,
}) => {
  const { openComandas, saveComanda, removeComanda, exchangeRates, currentUser } = useBakery();
  
  const [comandaNumberInput, setComandaNumberInput] = useState('');
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  if (!isOpen) return null;

  const currentCartTotalBrl = currentCartItems.reduce((acc, it) => acc + it.subtotalBrl, 0);

  const handleSaveCurrentCartAsComanda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comandaNumberInput.trim()) {
      alert('Digite o número da comanda ou identificação da mesa.');
      return;
    }

    if (currentCartItems.length === 0) {
      alert('O carrinho atual está vazio. Adicione itens antes de salvar uma comanda.');
      return;
    }

    saveComanda(
      comandaNumberInput.trim(),
      currentCartItems,
      customerNameInput.trim() || undefined,
      notesInput.trim() || undefined
    );

    if (onClearCart) {
      onClearCart();
    }

    setComandaNumberInput('');
    setCustomerNameInput('');
    setNotesInput('');
    setIsCreatingNew(false);
  };

  const handleSelectToCheckout = (comanda: Comanda) => {
    onLoadComanda(comanda);
    onClose();
  };

  const calculateComandaTotal = (comanda: Comanda) => {
    return comanda.items.reduce((sum, it) => sum + it.subtotalBrl, 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-100">
                  Comandas & Contas Abertas
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold font-mono-nums">
                  {openComandas.length} Ativas
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Atendimento no balcão e salão da Padaria Korisko
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

        {/* Action Bar */}
        <div className="p-4 bg-neutral-950/30 border-b border-neutral-800 flex items-center justify-between gap-3">
          <div className="text-xs text-neutral-400">
            {currentCartItems.length > 0 ? (
              <span>
                Carrinho com <strong className="text-neutral-200">{currentCartItems.length} itens</strong> ({formatCurrency(currentCartTotalBrl, 'BRL')})
              </span>
            ) : (
              <span>Selecione uma comanda abaixo para pagar ou adicionar novos itens.</span>
            )}
          </div>

          {currentCartItems.length > 0 && !isCreatingNew && (
            <button
              type="button"
              onClick={() => setIsCreatingNew(true)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Salvar Carrinho como Comanda
            </button>
          )}
        </div>

        {/* Create new comanda panel */}
        {isCreatingNew && (
          <form onSubmit={handleSaveCurrentCartAsComanda} className="p-4 bg-amber-950/20 border-b border-amber-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                Vincular {currentCartItems.length} itens a uma Comanda / Mesa:
              </span>
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="text-[11px] text-neutral-400 hover:text-neutral-200"
              >
                Cancelar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] text-neutral-300 block mb-1">Nº Comanda / Cartão *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 07 ou Mesa 4"
                  value={comandaNumberInput}
                  onChange={(e) => setComandaNumberInput(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-neutral-300 block mb-1">Cliente (Opcional)</label>
                <input
                  type="text"
                  placeholder="Nome do cliente"
                  value={customerNameInput}
                  onChange={(e) => setCustomerNameInput(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-neutral-300 block mb-1">Obs / Detalhes</label>
                <input
                  type="text"
                  placeholder="Ex: Balcão cafeteria"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg transition-colors"
              >
                Salvar Comanda
              </button>
            </div>
          </form>
        )}

        {/* Comandas list */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {openComandas.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center text-neutral-500 mx-auto">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-neutral-300">Nenhuma comanda aberta no momento.</p>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Lance produtos no PDV e clique em "Salvar Comanda" para deixar a conta em aberto enquanto o cliente consome no salão.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {openComandas.map((cmd) => {
                const totalBrl = calculateComandaTotal(cmd);
                const totalPyg = fromBrl(totalBrl, 'PYG', exchangeRates);
                const totalUsd = fromBrl(totalBrl, 'USD', exchangeRates);
                const elapsedMin = Math.max(1, Math.round((Date.now() - new Date(cmd.openedAt).getTime()) / 60000));

                return (
                  <div
                    key={cmd.id}
                    className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-3 group"
                  >
                    <div>
                      {/* Top bar of card */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center justify-center font-mono-nums">
                            #{cmd.number}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-neutral-200 block">
                              {cmd.customerName || `Comanda #${cmd.number}`}
                            </span>
                            <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-neutral-600" />
                              Aberta há {elapsedMin} min por {cmd.openedBy}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Deseja cancelar a comanda #${cmd.number}?`)) {
                              removeComanda(cmd.id);
                            }
                          }}
                          className="text-neutral-600 hover:text-rose-400 p-1 rounded transition-colors"
                          title="Cancelar comanda"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {cmd.notes && (
                        <p className="text-[11px] text-neutral-400 bg-neutral-900/60 rounded px-2 py-1 mt-2">
                          {cmd.notes}
                        </p>
                      )}

                      {/* Items preview */}
                      <div className="mt-3 pt-2 border-t border-neutral-850 space-y-1">
                        {cmd.items.slice(0, 3).map((it, idx) => (
                          <div key={idx} className="flex justify-between text-[11px] text-neutral-400">
                            <span className="truncate max-w-[180px]">
                              {it.quantity}x {it.product.name}
                            </span>
                            <span className="font-mono-nums">{formatCurrency(it.subtotalBrl, 'BRL')}</span>
                          </div>
                        ))}
                        {cmd.items.length > 3 && (
                          <span className="text-[10px] text-neutral-500 block italic">
                            + {cmd.items.length - 3} outros itens...
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer of card */}
                    <div className="pt-2 border-t border-neutral-850 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold font-mono-nums text-neutral-100">
                          {formatCurrency(totalBrl, 'BRL')}
                        </div>
                        <div className="text-[10px] text-neutral-500 font-mono-nums flex items-center gap-1.5">
                          <span>{formatCurrency(totalPyg, 'PYG')}</span>
                          <span>·</span>
                          <span>{formatCurrency(totalUsd, 'USD')}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectToCheckout(cmd)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-amber-500/10"
                      >
                        Pagar no Caixa
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-neutral-950/80 border-t border-neutral-800 flex justify-between items-center text-xs text-neutral-500">
          <span>Korisko · Controle de Comandas e Mesas</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl transition-colors font-medium"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
