import React, { useState, useMemo } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { formatCurrency } from '../../utils/currency';
import { X, Lock, CheckCircle, AlertTriangle, Printer } from 'lucide-react';

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
  const { currentSession, sales, closeRegister, currentUser } = useBakery();

  // Calculate expected cash in drawer for this session
  const expectedTotals = useMemo(() => {
    const sessionSales = sales.filter(s => s.registerSessionId === currentSession.id && s.status === 'completed');

    let brlCash = currentSession.initialFloat.brl;
    let pygCash = currentSession.initialFloat.pyg;
    let usdCash = currentSession.initialFloat.usd;

    // Add cash sales
    sessionSales.forEach(s => {
      s.payments.forEach(p => {
        if (p.method === 'dinheiro') {
          if (p.currency === 'BRL') brlCash += p.amountReceived;
          if (p.currency === 'PYG') pygCash += p.amountReceived;
          if (p.currency === 'USD') usdCash += p.amountReceived;
        }
      });

      // Deduct cash change given
      if (s.changeGiven && s.changeGiven.amount > 0) {
        if (s.changeGiven.currency === 'BRL') brlCash -= s.changeGiven.amount;
        if (s.changeGiven.currency === 'PYG') pygCash -= s.changeGiven.amount;
        if (s.changeGiven.currency === 'USD') usdCash -= s.changeGiven.amount;
      }
    });

    // Add suprimentos / deduct sangrias
    currentSession.transactions.forEach(t => {
      if (t.type === 'suprimento') {
        if (t.currency === 'BRL') brlCash += t.amount;
        if (t.currency === 'PYG') pygCash += t.amount;
        if (t.currency === 'USD') usdCash += t.amount;
      } else if (t.type === 'sangria') {
        if (t.currency === 'BRL') brlCash -= t.amount;
        if (t.currency === 'PYG') pygCash -= t.amount;
        if (t.currency === 'USD') usdCash -= t.amount;
      }
    });

    return {
      brl: Math.round(brlCash * 100) / 100,
      pyg: Math.round(pygCash),
      usd: Math.round(usdCash * 100) / 100,
    };
  }, [currentSession, sales]);

  // Count inputs
  const [countedBrl, setCountedBrl] = useState<string>(expectedTotals.brl.toString());
  const [countedPyg, setCountedPyg] = useState<string>(expectedTotals.pyg.toString());
  const [countedUsd, setCountedUsd] = useState<string>(expectedTotals.usd.toString());
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const numCountedBrl = parseFloat(countedBrl) || 0;
  const numCountedPyg = parseFloat(countedPyg) || 0;
  const numCountedUsd = parseFloat(countedUsd) || 0;

  const diffBrl = Math.round((numCountedBrl - expectedTotals.brl) * 100) / 100;
  const diffPyg = Math.round(numCountedPyg - expectedTotals.pyg);
  const diffUsd = Math.round((numCountedUsd - expectedTotals.usd) * 100) / 100;

  const hasDiscrepancy = Math.abs(diffBrl) > 0.05 || Math.abs(diffPyg) > 100 || Math.abs(diffUsd) > 0.05;

  const handleConfirmClose = (e: React.FormEvent) => {
    e.preventDefault();

    closeRegister(
      {
        brl: numCountedBrl,
        pyg: numCountedPyg,
        usd: numCountedUsd,
      },
      notes.trim() || undefined
    );

    onClosedSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100">
                Fechamento de Caixa #{currentSession.sessionNumber}
              </h2>
              <p className="text-xs text-neutral-400">
                Conferência de valores físicos e conciliação em Real, Guaraní e Dólar
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
        <form onSubmit={handleConfirmClose} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Info Banner */}
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-neutral-400">Operador responsável pelo fechamento:</span>
              <strong className="text-neutral-100 ml-1.5">{currentUser.name}</strong>
            </div>
            <span className="text-neutral-500 font-mono-nums">
              Aberto em {new Date(currentSession.openedAt).toLocaleDateString('pt-BR')} às {new Date(currentSession.openedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Currency Reconciliation Grid */}
          <div className="space-y-4">
            <label className="text-xs font-semibold text-neutral-300 block">
              Contagem Física dos Valores na Gaveta
            </label>

            {/* BRL Card */}
            <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                  🇧🇷 Real Brasileiro (BRL)
                </span>
                <span className="text-xs text-neutral-400">
                  Esperado no sistema: <strong className="text-neutral-200 font-mono-nums">{formatCurrency(expectedTotals.brl, 'BRL')}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={countedBrl}
                    onChange={(e) => setCountedBrl(e.target.value)}
                    placeholder="Valor contado em R$..."
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-mono-nums font-semibold text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="w-36 text-right">
                  <span className="text-[10px] text-neutral-500 block">Diferença</span>
                  <span className={`text-xs font-mono-nums font-bold ${
                    Math.abs(diffBrl) <= 0.05 
                      ? 'text-emerald-400' 
                      : diffBrl > 0 
                      ? 'text-sky-400' 
                      : 'text-rose-400'
                  }`}>
                    {diffBrl === 0 ? 'Exato (R$ 0,00)' : diffBrl > 0 ? `+${formatCurrency(diffBrl, 'BRL')} (Sobra)` : `${formatCurrency(diffBrl, 'BRL')} (Falta)`}
                  </span>
                </div>
              </div>
            </div>

            {/* PYG Card */}
            <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                  🇵🇾 Guaraní Paraguaio (PYG)
                </span>
                <span className="text-xs text-neutral-400">
                  Esperado no sistema: <strong className="text-amber-400 font-mono-nums">{formatCurrency(expectedTotals.pyg, 'PYG')}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <input
                    type="number"
                    step="1000"
                    required
                    value={countedPyg}
                    onChange={(e) => setCountedPyg(e.target.value)}
                    placeholder="Valor contado em ₲..."
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-mono-nums font-semibold text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="w-36 text-right">
                  <span className="text-[10px] text-neutral-500 block">Diferença</span>
                  <span className={`text-xs font-mono-nums font-bold ${
                    Math.abs(diffPyg) <= 100 
                      ? 'text-emerald-400' 
                      : diffPyg > 0 
                      ? 'text-sky-400' 
                      : 'text-rose-400'
                  }`}>
                    {diffPyg === 0 ? 'Exato (₲ 0)' : diffPyg > 0 ? `+${formatCurrency(diffPyg, 'PYG')} (Sobra)` : `${formatCurrency(diffPyg, 'PYG')} (Falta)`}
                  </span>
                </div>
              </div>
            </div>

            {/* USD Card */}
            <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                  🇺🇸 Dólar Comercial (USD)
                </span>
                <span className="text-xs text-neutral-400">
                  Esperado no sistema: <strong className="text-emerald-400 font-mono-nums">{formatCurrency(expectedTotals.usd, 'USD')}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={countedUsd}
                    onChange={(e) => setCountedUsd(e.target.value)}
                    placeholder="Valor contado em $..."
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-mono-nums font-semibold text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="w-36 text-right">
                  <span className="text-[10px] text-neutral-500 block">Diferença</span>
                  <span className={`text-xs font-mono-nums font-bold ${
                    Math.abs(diffUsd) <= 0.05 
                      ? 'text-emerald-400' 
                      : diffUsd > 0 
                      ? 'text-sky-400' 
                      : 'text-rose-400'
                  }`}>
                    {diffUsd === 0 ? 'Exato ($ 0.00)' : diffUsd > 0 ? `+${formatCurrency(diffUsd, 'USD')} (Sobra)` : `${formatCurrency(diffUsd, 'USD')} (Falta)`}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Discrepancy feedback alert if any */}
          {hasDiscrepancy && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block">Atenção: Houve divergência entre o sistema e o contado.</strong>
                <span>Por favor adicione uma justificativa nas observações antes de concluir.</span>
              </div>
            </div>
          )}

          {/* Closing Notes */}
          <div>
            <label className="text-xs font-medium text-neutral-300 block mb-1">
              Observações do Fechamento
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Turno matinal finalizado com sucesso. Sobra de troco conferida com a gerência."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500"
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
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 transition-colors flex items-center gap-2"
            >
              <Lock className="w-3.5 h-3.5" />
              Concluir e Lacrar Caixa
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
