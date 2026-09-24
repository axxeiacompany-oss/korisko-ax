import React, { useState, useMemo } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { formatCurrency } from '../../utils/currency';
import { 
  Target, 
  TrendingUp, 
  Calendar, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Zap, 
  Users 
} from 'lucide-react';
import { GoalSettingsModal } from '../modals/GoalSettingsModal';

export const GoalsView: React.FC = () => {
  const { sales, getCurrentGoal, employees, hasPermission } = useBakery();
  const currentGoal = getCurrentGoal();
  const [isEditGoalOpen, setIsEditGoalOpen] = useState(false);

  const canEditGoals = hasPermission(['admin', 'gerente']);

  // Filter sales in current month
  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const monthSales = useMemo(() => {
    return sales.filter(s => s.status === 'completed' && s.timestamp.startsWith(currentMonthPrefix));
  }, [sales, currentMonthPrefix]);

  const monthRevenueBrl = useMemo(() => {
    return monthSales.reduce((acc, s) => acc + s.totalBrl, 0);
  }, [monthSales]);

  // Days in month calculation
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(1, daysInMonth - dayOfMonth);

  // Daily average so far
  const currentDailyAverage = dayOfMonth > 0 ? monthRevenueBrl / dayOfMonth : 0;

  // Run-rate projection to end of month
  const projectedRevenue = currentDailyAverage * daysInMonth;

  // Required daily average for the remaining days to hit the target
  const remainingToGoal = Math.max(0, currentGoal.targetRevenueBrl - monthRevenueBrl);
  const requiredDailyToHit = remainingToGoal / remainingDays;

  // Goal completion %
  const revenuePercent = Math.min(100, Math.round((monthRevenueBrl / currentGoal.targetRevenueBrl) * 100));

  // Transactions metrics
  const transactionsCount = monthSales.length;
  const transactionsPercent = Math.min(100, Math.round((transactionsCount / currentGoal.targetTransactions) * 100));

  // Ticket Médio
  const actualTicketMedio = transactionsCount > 0 ? monthRevenueBrl / transactionsCount : 0;
  const ticketPercent = Math.min(100, Math.round((actualTicketMedio / currentGoal.targetTicketMedioBrl) * 100));

  // Performance by employee
  const employeePerformance = useMemo(() => {
    const map = new Map<string, { employee: typeof employees[0]; count: number; totalBrl: number }>();
    
    employees.forEach(emp => {
      map.set(emp.id, { employee: emp, count: 0, totalBrl: 0 });
    });

    monthSales.forEach(s => {
      const entry = map.get(s.employeeId);
      if (entry) {
        entry.count += 1;
        entry.totalBrl += s.totalBrl;
      }
    });

    return Array.from(map.values())
      .filter(e => e.count > 0)
      .sort((a, b) => b.totalBrl - a.totalBrl);
  }, [employees, monthSales]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold uppercase tracking-wider mb-1">
            <Target className="w-4 h-4" />
            <span>Planejamento Estratégico</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-100">
            Metas Comerciais & Desempenho
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Acompanhe o ritmo diário para atingir os objetivos financeiros da padaria no mês.
          </p>
        </div>

        {canEditGoals && (
          <button
            type="button"
            onClick={() => setIsEditGoalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs shadow-lg shadow-amber-500/10 transition-colors flex items-center gap-2"
          >
            <Edit3 className="w-4 h-4 stroke-[2.5]" />
            Ajustar Metas do Mês
          </button>
        )}
      </div>

      {/* Main Revenue Goal Big Card */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs text-neutral-400 font-medium block">
              Progresso do Faturamento ({now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})
            </span>
            <div className="text-3xl font-bold text-neutral-100 font-mono-nums mt-1">
              {formatCurrency(monthRevenueBrl, 'BRL')}
              <span className="text-sm font-normal text-neutral-500 ml-2">
                de {formatCurrency(currentGoal.targetRevenueBrl, 'BRL')}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-3xl font-bold text-amber-400 font-mono-nums">
              {revenuePercent}%
            </span>
            <span className="text-xs text-neutral-400 block">da meta atingida</span>
          </div>
        </div>

        {/* Big Progress bar */}
        <div className="space-y-2">
          <div className="w-full h-3.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
            <div
              style={{ width: `${revenuePercent}%` }}
              className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500 rounded-full transition-all duration-700"
            />
          </div>
          
          <div className="flex justify-between text-xs text-neutral-500 font-mono-nums">
            <span>Dia {dayOfMonth} de {daysInMonth}</span>
            <span>Faltam {formatCurrency(remainingToGoal, 'BRL')}</span>
          </div>
        </div>

        {/* Projection diagnostics grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-neutral-800">
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-850 space-y-1">
            <span className="text-xs text-neutral-500">Média Diária Realizada</span>
            <div className="text-base font-bold text-neutral-200 font-mono-nums">
              {formatCurrency(currentDailyAverage, 'BRL')}
            </div>
            <span className="text-[11px] text-neutral-500 font-mono-nums">
              Meta diária: {formatCurrency(currentGoal.targetDailyAverageBrl, 'BRL')}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-850 space-y-1">
            <span className="text-xs text-neutral-500">Projeção até o Fim do Mês</span>
            <div className="text-base font-bold text-emerald-400 font-mono-nums">
              {formatCurrency(projectedRevenue, 'BRL')}
            </div>
            <span className="text-[11px] text-neutral-500">
              {projectedRevenue >= currentGoal.targetRevenueBrl ? '🎯 Meta será superada!' : '⚠️ Necessário acelerar'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-850 space-y-1">
            <span className="text-xs text-neutral-500">Meta Diária Restante</span>
            <div className="text-base font-bold text-amber-400 font-mono-nums">
              {formatCurrency(requiredDailyToHit, 'BRL')}/dia
            </div>
            <span className="text-[11px] text-neutral-500">
              Nos {remainingDays} dias restantes
            </span>
          </div>
        </div>

      </div>

      {/* Secondary Goals Grid (Transactions & Ticket Médio) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Atendimentos / Transações */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-neutral-100">
                Atendimentos Realizados no Mês
              </h3>
            </div>
            <span className="text-xs font-mono-nums font-bold text-sky-400">
              {transactionsPercent}%
            </span>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-neutral-100 font-mono-nums">
                {transactionsCount}
              </span>
              <span className="text-xs text-neutral-400 font-mono-nums">
                Meta: {currentGoal.targetTransactions} clientes
              </span>
            </div>

            <div className="w-full h-2 bg-neutral-950 rounded-full mt-2 overflow-hidden border border-neutral-800">
              <div
                style={{ width: `${transactionsPercent}%` }}
                className="h-full bg-sky-500 rounded-full transition-all"
              />
            </div>
          </div>

          <p className="text-xs text-neutral-400">
            Média de {(transactionsCount / Math.max(1, dayOfMonth)).toFixed(1)} atendimentos por dia neste mês.
          </p>
        </div>

        {/* Ticket Médio */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-neutral-100">
                Meta de Ticket Médio por Venda
              </h3>
            </div>
            <span className="text-xs font-mono-nums font-bold text-purple-400">
              {ticketPercent}%
            </span>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-neutral-100 font-mono-nums">
                {formatCurrency(actualTicketMedio, 'BRL')}
              </span>
              <span className="text-xs text-neutral-400 font-mono-nums">
                Meta: {formatCurrency(currentGoal.targetTicketMedioBrl, 'BRL')}
              </span>
            </div>

            <div className="w-full h-2 bg-neutral-950 rounded-full mt-2 overflow-hidden border border-neutral-800">
              <div
                style={{ width: `${ticketPercent}%` }}
                className="h-full bg-purple-500 rounded-full transition-all"
              />
            </div>
          </div>

          <p className="text-xs text-neutral-400">
            {actualTicketMedio >= currentGoal.targetTicketMedioBrl 
              ? '✅ Clientes estão comprando acima do valor médio planejado.' 
              : 'Dica: Oferecer produtos agregados no balcão como cafés especiais e confeitos.'}
          </p>
        </div>

      </div>

      {/* Employee Sales Leaderboard */}
      <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-neutral-100">
              Desempenho por Atendente / Caixa no Mês
            </h3>
          </div>
          <span className="text-xs text-neutral-500">Equipe</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {employeePerformance.map((item, idx) => (
            <div
              key={item.employee.id}
              className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between space-y-2"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white ${item.employee.avatarColor}`}>
                  {item.employee.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-neutral-200 truncate">{item.employee.name}</h4>
                  <span className="text-[10px] text-neutral-500 capitalize">{item.employee.role}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-850 flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] text-neutral-500 block">Faturamento</span>
                  <span className="text-sm font-bold text-neutral-100 font-mono-nums">
                    {formatCurrency(item.totalBrl, 'BRL')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-neutral-500 block">Vendas</span>
                  <span className="text-xs font-bold text-neutral-300 font-mono-nums">
                    {item.count}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Goal Settings Modal */}
      <GoalSettingsModal
        isOpen={isEditGoalOpen}
        onClose={() => setIsEditGoalOpen(false)}
      />

    </div>
  );
};
