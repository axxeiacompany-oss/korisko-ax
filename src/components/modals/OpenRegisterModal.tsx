import React, { useState } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { X, Unlock, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const OpenRegisterModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { openRegister, currentUser } = useBakery();

  const [floatBrl, setFloatBrl] = useState('300.00');
  const [floatPyg, setFloatPyg] = useState('500000');
  const [floatUsd, setFloatUsd] = useState('50.00');

  if (!isOpen) return null;

  const handleOpen = (e: React.FormEvent) => {
    e.preventDefault();
    openRegister({
      brl: parseFloat(floatBrl) || 0,
      pyg: parseFloat(floatPyg) || 0,
      usd: parseFloat(floatUsd) || 0,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Unlock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100">Abrir Novo Turno de Caixa</h2>
              <p className="text-xs text-neutral-400">Defina o fundo de troco inicial para cada moeda</p>
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
        <form onSubmit={handleOpen} className="p-6 space-y-4">
          <div className="text-xs text-neutral-400 pb-1">
            Operador de abertura: <strong className="text-neutral-200">{currentUser.name}</strong>
          </div>

          {/* Initial float BRL */}
          <div>
            <label className="text-xs font-medium text-neutral-300 block mb-1">
              Fundo de Troco Inicial em Real (R$)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={floatBrl}
              onChange={(e) => setFloatBrl(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm font-mono-nums font-semibold text-neutral-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Initial float PYG */}
          <div>
            <label className="text-xs font-medium text-neutral-300 block mb-1">
              Fundo de Troco Inicial em Guaraní (₲)
            </label>
            <input
              type="number"
              step="10000"
              required
              value={floatPyg}
              onChange={(e) => setFloatPyg(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm font-mono-nums font-semibold text-amber-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Initial float USD */}
          <div>
            <label className="text-xs font-medium text-neutral-300 block mb-1">
              Fundo de Troco Inicial em Dólar ($)
            </label>
            <input
              type="number"
              step="1"
              required
              value={floatUsd}
              onChange={(e) => setFloatUsd(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm font-mono-nums font-semibold text-emerald-400 focus:outline-none focus:border-emerald-500"
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
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              Iniciar Turno / Abrir Caixa
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
