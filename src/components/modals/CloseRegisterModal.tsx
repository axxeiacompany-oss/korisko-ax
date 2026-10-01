import React, { useState, useMemo } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { formatCurrency } from '../../utils/currency';
import { X, Lock, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onClosedSuccess: () => void;
}

export const CloseRegisterModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onClosedSuccess,
}) => {
  const { currentSession, sales, closeRegister, currentUser, language } = useBakery();

  // Calculate expected cash in drawer for this session in Guaraní
  const expectedPyg = useMemo(() => {
    const sessionSales = sales.filter(s => s.registerSessionId === currentSession.id && s.status === 'completed');

    let pygCash = currentSession.initialFloat.pyg || currentSession.initialFloat.brl || 0;

    // Add cash sales
    sessionSales.forEach(s => {
      s.payments.forEach(p => {
        if (p.method === 'dinheiro') {
          pygCash += p.amountReceived || p.equivalentBrl || 0;
        }
      });

      // Deduct cash change given
      if (s.changeGiven && s.changeGiven.amount > 0) {
        pygCash -= s.changeGiven.amount;
      }
    });

    // Add entradas / deduct saidas
    currentSession.transactions.forEach(t => {
      const isEntrada = t.type === 'suprimento' || (t.type as string) === 'entrada';
      const mult = isEntrada ? 1 : -1;
      pygCash += mult * (t.amount || 0);
    });

    return Math.round(pygCash);
  }, [currentSession, sales]);

  // Count inputs
  const [countedPyg, setCountedPyg] = useState<string>(expectedPyg.toString());
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const numCountedPyg = parseFloat(countedPyg) || 0;
  const diffPyg = Math.round(numCountedPyg - expectedPyg);
  const hasDiscrepancy = Math.abs(diffPyg) > 500;

  const handleConfirmClose = (e: React.FormEvent) => {
    e.preventDefault();

    closeRegister(
      {
        brl: numCountedPyg,
        pyg: numCountedPyg,
        usd: 0,
      },
      notes.trim() || undefined
    );

    onClosedSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div className="w-full sm:max-w-lg bg-neutral-900 border-t sm:border border-neutral-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        
        {/* Mobile drag handle */}
        <div className="sm:hidden w-12 h-1 rounded-full bg-neutral-700 mx-auto mt-2.5 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100">
                {language === 'es' ? 'Cierre de Caja' : 'Fechamento de Caixa'} #{currentSession.sessionNumber}
              </h2>
              <p className="text-xs text-neutral-400">
                {language === 'es' ? 'Conteo físico en Guaraníes (₲)' : 'Conferência física na gaveta em Guaranis (₲)'}
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
        <form onSubmit={handleConfirmClose} className="p-6 space-y-4">
          <div className="flex items-center justify-between text-xs pb-1">
            <div>
              <span className="text-neutral-400">{language === 'es' ? 'Operador responsable:' : 'Operador responsável:'}</span>
              <strong className="text-neutral-100 ml-1.5">{currentUser.name}</strong>
            </div>
            <span className="text-neutral-500 font-mono-nums">
              {new Date(currentSession.openedAt).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Guaraní Reconciliation Card */}
          <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                <span className="text-amber-400">🇵🇾 ₲</span>
                <span>{language === 'es' ? 'Dinero Físico en Gaveta' : 'Dinheiro Físico na Gaveta'}</span>
              </span>
              <span className="text-xs text-neutral-400">
                {language === 'es' ? 'Esperado:' : 'Esperado:'} <strong className="text-amber-400 font-mono-nums">{formatCurrency(expectedPyg, 'PYG')}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-400 font-mono">
                  ₲
                </span>
                <input
                  type="number"
                  step="1000"
                  required
                  value={countedPyg}
                  onChange={(e) => setCountedPyg(e.target.value)}
                  placeholder="Valor contado em ₲..."
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl pl-9 pr-3 py-2.5 text-base font-mono-nums font-bold text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="w-36 text-right">
                <span className="text-[10px] text-neutral-500 block">{language === 'es' ? 'Diferencia' : 'Diferença'}</span>
                <span className={`text-xs font-mono-nums font-bold ${
                  Math.abs(diffPyg) <= 500 
                    ? 'text-emerald-400' 
                    : diffPyg > 0 
                    ? 'text-sky-400' 
                    : 'text-rose-400'
                }`}>
                  {diffPyg === 0 
                    ? 'Exato (₲ 0)' 
                    : diffPyg > 0 
                    ? `+${formatCurrency(diffPyg, 'PYG')} (Sobra)` 
                    : `${formatCurrency(diffPyg, 'PYG')} (Falta)`
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Discrepancy feedback alert if any */}
          {hasDiscrepancy && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block">
                  {language === 'es' ? 'Atención: Diferencia detectada en el conteo.' : 'Atenção: Houve divergência entre o sistema e o contado.'}
                </strong>
                <span>{language === 'es' ? 'Agregue una nota u observación abajo.' : 'Por favor adicione uma justificativa nas observações antes de concluir.'}</span>
              </div>
            </div>
          )}

          {/* Closing Notes */}
          <div>
            <label className="text-xs font-medium text-neutral-300 block mb-1">
              {language === 'es' ? 'Observaciones del Cierre' : 'Observações do Fechamento'}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={language === 'es' ? 'Ej: Turno finalizado con éxito...' : 'Ex: Turno finalizado com sucesso...'}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-neutral-800 text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              {language === 'es' ? 'Cancelar' : 'Cancelar'}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              {language === 'es' ? 'Cerrar y Lacrar Caja' : 'Concluir e Lacrar Caixa'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
