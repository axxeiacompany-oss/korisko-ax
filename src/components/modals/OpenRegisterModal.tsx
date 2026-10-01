import React, { useState } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { X, Unlock, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const OpenRegisterModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { openRegister, currentUser, language } = useBakery();

  const [floatPyg, setFloatPyg] = useState('500000');

  if (!isOpen) return null;

  const handleOpen = (e: React.FormEvent) => {
    e.preventDefault();
    const pygVal = parseFloat(floatPyg) || 0;
    openRegister({
      brl: pygVal, // 1:1 internal
      pyg: pygVal,
      usd: 0,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div className="w-full sm:max-w-md bg-neutral-900 border-t sm:border border-neutral-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        
        {/* Mobile drag handle */}
        <div className="sm:hidden w-12 h-1 rounded-full bg-neutral-700 mx-auto mt-2.5 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Unlock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100">
                {language === 'es' ? 'Abrir Turno de Caja' : 'Abrir Turno de Caixa'}
              </h2>
              <p className="text-xs text-neutral-400">
                {language === 'es' ? 'Fondo de cambio inicial en Guaraníes (₲)' : 'Fundo de troco inicial em Guaranis (₲)'}
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
        <form onSubmit={handleOpen} className="p-6 space-y-4">
          <div className="text-xs text-neutral-400 pb-1">
            {language === 'es' ? 'Operador de apertura:' : 'Operador de abertura:'} <strong className="text-neutral-200">{currentUser.name}</strong>
          </div>

          {/* Initial float PYG */}
          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
              {language === 'es' ? 'Fondo de Cambio Inicial (₲ Guaraní)' : 'Fundo de Troco Inicial (₲ Guaraní)'}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-400 font-mono">
                ₲
              </span>
              <input
                type="number"
                step="10000"
                required
                value={floatPyg}
                onChange={(e) => setFloatPyg(e.target.value)}
                placeholder="500000"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-4 py-3 text-lg font-mono-nums font-bold text-amber-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            {[200000, 300000, 500000, 1000000].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => setFloatPyg(val.toString())}
                className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono font-bold transition-all cursor-pointer"
              >
                ₲ {val.toLocaleString('es-PY')}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-neutral-800 text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              {language === 'es' ? 'Cancelar' : 'Cancelar'}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{language === 'es' ? 'Abrir Caja' : 'Abrir Caixa'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
