import React, { useState } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { MonthlyGoal } from '../../types';
import { X, Target, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const GoalSettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { getCurrentGoal, updateGoal } = useBakery();
  const currentGoal = getCurrentGoal();

  const [targetRev, setTargetRev] = useState(currentGoal.targetRevenueBrl.toString());
  const [targetDaily, setTargetDaily] = useState(currentGoal.targetDailyAverageBrl.toString());
  const [targetTrans, setTargetTrans] = useState(currentGoal.targetTransactions.toString());
  const [targetTicket, setTargetTicket] = useState(currentGoal.targetTicketMedioBrl.toString());

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: MonthlyGoal = {
      month: currentGoal.month,
      targetRevenueBrl: parseFloat(targetRev) || 80000,
      targetDailyAverageBrl: parseFloat(targetDaily) || 2666,
      targetTransactions: parseInt(targetTrans, 10) || 3000,
      targetTicketMedioBrl: parseFloat(targetTicket) || 26.00,
    };
    updateGoal(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100">Configurar Metas do Mês</h2>
              <p className="text-xs text-neutral-400">Defina objetivos de receita, volume e ticket médio</p>
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
          
          {/* Target Revenue */}
          <div>
            <label className="text-xs font-medium text-neutral-300 block mb-1">
              Meta de Faturamento Mensal (R$)
            </label>
            <input
              type="number"
              step="1000"
              required
              value={targetRev}
              onChange={(e) => {
                const val = e.target.value;
                setTargetRev(val);
                const num = parseFloat(val) || 0;
                setTargetDaily(Math.round(num / 30).toString());
              }}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm font-mono-nums font-semibold text-neutral-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Daily average target */}
          <div>
            <label className="text-xs font-medium text-neutral-300 block mb-1">
              Meta Diária Média (R$)
            </label>
            <input
              type="number"
              step="100"
              required
              value={targetDaily}
              onChange={(e) => setTargetDaily(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm font-mono-nums font-semibold text-neutral-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Target Transactions */}
            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1">
                Clientes / Vendas
              </label>
              <input
                type="number"
                step="50"
                required
                value={targetTrans}
                onChange={(e) => setTargetTrans(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs font-mono-nums font-semibold text-neutral-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Target Ticket */}
            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1">
                Ticket Médio (R$)
              </label>
              <input
                type="number"
                step="0.50"
                required
                value={targetTicket}
                onChange={(e) => setTargetTicket(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs font-mono-nums font-semibold text-neutral-100 focus:outline-none focus:border-amber-500"
              />
            </div>
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
              Atualizar Metas
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
