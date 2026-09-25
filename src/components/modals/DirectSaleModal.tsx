import React from 'react';
import { DirectSaleView } from '../views/DirectSaleView';
import { X, Zap } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const DirectSaleModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-[#090D15] border border-[#1E273A] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1A2234] bg-[#0C101A] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white">
                Venda Direta Expressa
              </h2>
              <p className="text-[11px] text-neutral-400">
                Apenas digite o valor, selecione o cliente se desejar e confirme em 1 clique
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-[#182236] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <DirectSaleView onSaleCompleted={onClose} />
        </div>

      </div>
    </div>
  );
};
