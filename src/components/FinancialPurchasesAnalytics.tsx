import React, { useState, useMemo } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Customer } from '../types';
import { formatCurrency } from '../utils/currency';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBag,
  Users,
  Database,
  ChevronDown,
  ChevronUp,
  Award,
  Clock,
  Wallet,
  Sparkles,
} from 'lucide-react';

interface FinancialPurchasesAnalyticsProps {
  onSelectCustomer?: (customer: Customer) => void;
  defaultExpanded?: boolean;
  compact?: boolean;
}

type PeriodFilter = '7d' | '15d' | '30d' | 'month' | 'all';

export const FinancialPurchasesAnalytics: React.FC<FinancialPurchasesAnalyticsProps> = ({
  onSelectCustomer,
  defaultExpanded = true,
  compact = false,
}) => {
  const {
    customers,
    customerPurchases,
    customerEntries,
    sales,
    currentSession,
    sessionHistory,
  } = useBakery();

  const [period, setPeriod] = useState<PeriodFilter>('15d');
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Consolidate all cash register transactions (current session + history)
  const allCashTransactions = useMemo(() => {
    const list = [...(currentSession?.transactions || [])];
    (sessionHistory || []).forEach(sess => {
      if (Array.isArray(sess.transactions)) {
        list.push(...sess.transactions);
      }
    });
    return list;
  }, [currentSession, sessionHistory]);

  // Filter helper by date
  const isDateInPeriod = (isoDate: string, selectedPeriod: PeriodFilter): boolean => {
    if (!isoDate) return false;
    if (selectedPeriod === 'all') return true;
    const d = new Date(isoDate);
    const now = new Date();
    const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    if (selectedPeriod === '7d') return diffDays <= 7;
    if (selectedPeriod === '15d') return diffDays <= 15;
    if (selectedPeriod === '30d') return diffDays <= 30;
    if (selectedPeriod === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    return true;
  };

  // Compute comprehensive Financial Entry vs Exit analytics + Daily Series
  const financialAnalytics = useMemo(() => {
    // 1. Vendas no período
    const periodSales = (sales || []).filter(
      s => s && s.status === 'completed' && isDateInPeriod(s.timestamp, period)
    );

    let entradasVendasAvista = 0;
    let vendasFiadoLancadas = 0;
    let custoMercadoriaVendida = 0;

    periodSales.forEach(s => {
      const fiadoPart = (s.payments || [])
        .filter(p => p.method === 'fiado')
        .reduce((acc, p) => acc + (p.equivalentBrl || p.amountReceived || 0), 0);
      const paidPart = Math.max(0, (s.totalBrl || 0) - fiadoPart);

      entradasVendasAvista += paidPart;
      vendasFiadoLancadas += fiadoPart;

      const saleCost = (s.items || []).reduce((acc, it) => {
        const unitCost = it.product?.costPriceBrl || Math.round((it.unitPriceBrl || 0) * 0.42);
        return acc + unitCost * (it.quantity || 1);
      }, 0);
      custoMercadoriaVendida += saleCost > 0 ? saleCost : Math.round((s.totalBrl || 0) * 0.42);
    });

    // 2. Compras registradas manualmente ou via comanda em registro_compras_clientes (que não duplicam vendas)
    const saleIdsInPeriod = new Set(periodSales.map(s => s.id));
    const extraCustomerPurchases = (customerPurchases || []).filter(
      p => p && (!p.saleId || !saleIdsInPeriod.has(p.saleId)) && isDateInPeriod(p.purchaseDate, period)
    );

    extraCustomerPurchases.forEach(p => {
      entradasVendasAvista += Number(p.paidAmountBrl) || 0;
      vendasFiadoLancadas += Number(p.fiadoAmountBrl) || 0;
      custoMercadoriaVendida += Number(p.estimatedCostBrl) || Math.round((Number(p.totalAmountBrl) || 0) * 0.42);
    });

    // 3. Amortizações de Fiado recebidas no período (Entradas no Caixa)
    const periodAmortizations = (customerEntries || []).filter(
      e => e && e.type === 'pagamento_amortizacao' && isDateInPeriod(e.date, period)
    );
    const entradasAmortizacoesFiado = periodAmortizations.reduce(
      (acc, e) => acc + (Number(e.amountBrl) || 0),
      0
    );

    // 4. Movimentações de Caixa (Suprimentos/Entradas vs Saídas/Sangrias)
    const periodCashTxs = allCashTransactions.filter(t => t && isDateInPeriod(t.timestamp, period));
    let entradasCaixaSuprimentos = 0;
    let saidasCaixaDespesas = 0;

    periodCashTxs.forEach(t => {
      const isEntrada = t.type === 'suprimento' || (t.type as string) === 'entrada';
      if (isEntrada) {
        entradasCaixaSuprimentos += Number(t.amount) || 0;
      } else {
        saidasCaixaDespesas += Number(t.amount) || 0;
      }
    });

    const totalEntradas = Math.round(
      entradasVendasAvista + entradasAmortizacoesFiado + entradasCaixaSuprimentos
    );
    const totalSaidas = Math.round(saidasCaixaDespesas + custoMercadoriaVendida);
    const saldoLiquido = totalEntradas - totalSaidas;
    const margemLiquidaPct =
      totalEntradas > 0 ? Math.round((saldoLiquido / totalEntradas) * 100) : 0;

    // 5. Build Daily Chart Data (last N days based on period)
    const daysCount = period === '7d' ? 7 : period === '15d' ? 12 : 14;
    const dailyMap = new Map<
      string,
      {
        dateKey: string;
        label: string;
        entradas: number;
        saidas: number;
        fiado: number;
      }
    >();

    const now = new Date();
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      dailyMap.set(key, {
        dateKey: key,
        label,
        entradas: 0,
        saidas: 0,
        fiado: 0,
      });
    }

    periodSales.forEach(s => {
      const key = (s.timestamp || '').slice(0, 10);
      const bucket = dailyMap.get(key);
      if (!bucket) return;
      const fiadoPart = (s.payments || [])
        .filter(p => p.method === 'fiado')
        .reduce((acc, p) => acc + (p.equivalentBrl || p.amountReceived || 0), 0);
      const paidPart = Math.max(0, (s.totalBrl || 0) - fiadoPart);
      const saleCost = (s.items || []).reduce((acc, it) => {
        const unitCost = it.product?.costPriceBrl || Math.round((it.unitPriceBrl || 0) * 0.42);
        return acc + unitCost * (it.quantity || 1);
      }, 0);

      bucket.entradas += paidPart;
      bucket.fiado += fiadoPart;
      bucket.saidas += saleCost > 0 ? saleCost : Math.round((s.totalBrl || 0) * 0.42);
    });

    extraCustomerPurchases.forEach(p => {
      const key = (p.purchaseDate || '').slice(0, 10);
      const bucket = dailyMap.get(key);
      if (!bucket) return;
      bucket.entradas += Number(p.paidAmountBrl) || 0;
      bucket.fiado += Number(p.fiadoAmountBrl) || 0;
      bucket.saidas += Number(p.estimatedCostBrl) || Math.round((Number(p.totalAmountBrl) || 0) * 0.42);
    });

    periodAmortizations.forEach(e => {
      const key = (e.date || '').slice(0, 10);
      const bucket = dailyMap.get(key);
      if (!bucket) return;
      bucket.entradas += Number(e.amountBrl) || 0;
    });

    periodCashTxs.forEach(t => {
      const key = (t.timestamp || '').slice(0, 10);
      const bucket = dailyMap.get(key);
      if (!bucket) return;
      const isEntrada = t.type === 'suprimento' || (t.type as string) === 'entrada';
      if (isEntrada) {
        bucket.entradas += Number(t.amount) || 0;
      } else {
        bucket.saidas += Number(t.amount) || 0;
      }
    });

    const dailySeries = Array.from(dailyMap.values());
    const maxDailyVal = Math.max(
      10000,
      ...dailySeries.map(d => Math.max(d.entradas, d.saidas, d.fiado))
    );

    return {
      totalEntradas,
      entradasVendasAvista: Math.round(entradasVendasAvista),
      entradasAmortizacoesFiado: Math.round(entradasAmortizacoesFiado),
      entradasCaixaSuprimentos: Math.round(entradasCaixaSuprimentos),
      totalSaidas,
      saidasCaixaDespesas: Math.round(saidasCaixaDespesas),
      custoMercadoriaVendida: Math.round(custoMercadoriaVendida),
      vendasFiadoLancadas: Math.round(vendasFiadoLancadas),
      saldoLiquido,
      margemLiquidaPct,
      dailySeries,
      maxDailyVal,
    };
  }, [sales, customerPurchases, customerEntries, allCashTransactions, period]);

  // Compute Customer Ranking by Total Comprado (merging customer.totalSpentBrl + customerPurchases)
  const customerRanking = useMemo(() => {
    const list = (customers || []).map(c => {
      const purchasesForCust = (customerPurchases || []).filter(p => p.customerId === c.id);
      const sumPurchases = purchasesForCust.reduce((acc, p) => acc + (Number(p.totalAmountBrl) || 0), 0);
      const totalSpent = Math.max(c.totalSpentBrl || 0, sumPurchases, c.outstandingBalanceBrl || 0);
      const count = Math.max(c.purchaseCount || 0, purchasesForCust.length, totalSpent > 0 ? 1 : 0);
      const paidTotal = Math.max(0, totalSpent - (c.outstandingBalanceBrl || 0));

      return {
        customer: {
          ...c,
          totalSpentBrl: totalSpent,
          purchaseCount: count,
        },
        totalSpent,
        count,
        paidTotal,
        debtTotal: c.outstandingBalanceBrl || 0,
      };
    });

    const sorted = list.sort((a, b) => b.totalSpent - a.totalSpent);
    const totalPurchasedAllCustomers = sorted.reduce((acc, item) => acc + item.totalSpent, 0);
    const totalPurchasesCount = sorted.reduce((acc, item) => acc + item.count, 0);
    const maxCustomerSpent = Math.max(1, sorted[0]?.totalSpent || 1);

    return {
      ranked: sorted,
      totalPurchasedAllCustomers,
      totalPurchasesCount,
      maxCustomerSpent,
    };
  }, [customers, customerPurchases]);

  return (
    <div className="rounded-2xl bg-[#0D121E] border border-[#1E273A] shadow-xl overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 bg-gradient-to-r from-[#0F172A] via-[#0D121E] to-emerald-950/20 border-b border-[#1E273A]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-white tracking-tight">
                Gráfico Financeiro: Análise de Entradas e Saídas & Total Comprado
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                <Database className="w-3 h-3" />
                SQL: registro_compras_clientes
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Comparativo em tempo real de Entradas no Caixa vs Saídas/Custos Operacionais e Histórico de Compras por Cliente
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Period Selector */}
          <div className="flex items-center bg-[#080B12] p-1 rounded-xl border border-[#1C2538]">
            {(
              [
                { id: '7d', label: '7D' },
                { id: '15d', label: '15D' },
                { id: '30d', label: '30D' },
                { id: 'month', label: 'Mês' },
                { id: 'all', label: 'Tudo' },
              ] as { id: PeriodFilter; label: string }[]
            ).map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPeriod(opt.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  period === opt.id
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl bg-[#080B12] border border-[#1C2538] text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title={isExpanded ? 'Recolher Painel Financeiro' : 'Expandir Painel Financeiro'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-5">
          {/* 4 Summary Financial Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Total Entradas */}
            <div className="p-3.5 rounded-2xl bg-[#080B12] border border-emerald-500/30 space-y-1">
              <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold">
                <span>🟢 Total Entradas (Caixa)</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-lg sm:text-2xl font-black text-emerald-400 font-mono-nums">
                +{formatCurrency(financialAnalytics.totalEntradas, 'PYG')}
              </div>
              <div className="text-[10px] text-neutral-400 font-mono-nums truncate">
                À Vista: {formatCurrency(financialAnalytics.entradasVendasAvista, 'PYG')} | Amort.: {formatCurrency(financialAnalytics.entradasAmortizacoesFiado, 'PYG')}
              </div>
            </div>

            {/* Card 2: Total Saídas & Custos */}
            <div className="p-3.5 rounded-2xl bg-[#080B12] border border-rose-500/30 space-y-1">
              <div className="flex items-center justify-between text-xs text-rose-300 font-semibold">
                <span>🔴 Total Saídas & Custos</span>
                <ArrowDownRight className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-lg sm:text-2xl font-black text-rose-400 font-mono-nums">
                -{formatCurrency(financialAnalytics.totalSaidas, 'PYG')}
              </div>
              <div className="text-[10px] text-neutral-400 font-mono-nums truncate">
                CMV: {formatCurrency(financialAnalytics.custoMercadoriaVendida, 'PYG')} | Caixa: {formatCurrency(financialAnalytics.saidasCaixaDespesas, 'PYG')}
              </div>
            </div>

            {/* Card 3: Total Comprado por Clientes */}
            <div className="p-3.5 rounded-2xl bg-[#080B12] border border-amber-500/30 space-y-1">
              <div className="flex items-center justify-between text-xs text-amber-300 font-semibold">
                <span>🛍️ Total Comprado (Clientes)</span>
                <ShoppingBag className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-lg sm:text-2xl font-black text-amber-400 font-mono-nums">
                {formatCurrency(customerRanking.totalPurchasedAllCustomers, 'PYG')}
              </div>
              <div className="text-[10px] text-neutral-400 font-mono-nums truncate">
                {customerRanking.totalPurchasesCount} compras registradas no SQL
              </div>
            </div>

            {/* Card 4: Saldo Líquido (Entradas - Saídas) */}
            <div className="p-3.5 rounded-2xl bg-[#080B12] border border-[#1E293B] space-y-1">
              <div className="flex items-center justify-between text-xs text-neutral-300 font-semibold">
                <span>💰 Saldo Líquido (E - S)</span>
                <Wallet className="w-4 h-4 text-sky-400" />
              </div>
              <div
                className={`text-lg sm:text-2xl font-black font-mono-nums ${
                  financialAnalytics.saldoLiquido >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {financialAnalytics.saldoLiquido >= 0 ? '+' : ''}
                {formatCurrency(financialAnalytics.saldoLiquido, 'PYG')}
              </div>
              <div className="text-[10px] text-neutral-400 font-mono-nums truncate">
                Margem Líquida: <strong className="text-emerald-400">{financialAnalytics.margemLiquidaPct}%</strong> • Fiado Período: {formatCurrency(financialAnalytics.vendasFiadoLancadas, 'PYG')}
              </div>
            </div>
          </div>

          {/* Main Grid: Daily Comparative Bar Chart + Top Customers by Total Comprado */}
          <div className={`grid grid-cols-1 ${compact ? '' : 'lg:grid-cols-12'} gap-5`}>
            {/* Left Column: Daily Entry vs Exit Bar Chart */}
            <div className={`${compact ? '' : 'lg:col-span-7'} p-4 rounded-2xl bg-[#080B12] border border-[#1C2538] flex flex-col justify-between space-y-4`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Evolução Diária: Entradas vs Saídas & Consumo no Fiado</span>
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Passe o mouse ou toque nas barras para inspecionar o saldo líquido de cada dia
                  </p>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                    Entradas
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-300 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                    Saídas + CMV
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
                    Fiado
                  </span>
                </div>
              </div>

              {/* Grouped Bar Chart */}
              <div className="pt-6 pb-1">
                <div className="h-48 flex items-end gap-1.5 sm:gap-2.5 border-b border-neutral-800 px-1">
                  {financialAnalytics.dailySeries.map(day => {
                    const entPct = Math.round((day.entradas / financialAnalytics.maxDailyVal) * 100);
                    const saiPct = Math.round((day.saidas / financialAnalytics.maxDailyVal) * 100);
                    const fiaPct = Math.round((day.fiado / financialAnalytics.maxDailyVal) * 100);
                    const netDay = day.entradas - day.saidas;

                    return (
                      <div
                        key={day.dateKey}
                        className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative"
                      >
                        {/* Hover Tooltip */}
                        <div className="absolute -top-24 left-1/2 -translate-x-1/2 hidden group-hover:block bg-neutral-950/95 border border-neutral-700 rounded-xl p-2.5 text-[10px] text-white shadow-2xl whitespace-nowrap z-30 pointer-events-none space-y-0.5">
                          <div className="font-bold text-neutral-200 border-b border-neutral-800 pb-1 mb-1">
                            📅 Dia {day.label}
                          </div>
                          <div className="text-emerald-400 font-mono-nums">
                            + Entradas: {formatCurrency(day.entradas, 'PYG')}
                          </div>
                          <div className="text-rose-400 font-mono-nums">
                            - Saídas/CMV: {formatCurrency(day.saidas, 'PYG')}
                          </div>
                          {day.fiado > 0 && (
                            <div className="text-amber-400 font-mono-nums">
                              • Fiado: {formatCurrency(day.fiado, 'PYG')}
                            </div>
                          )}
                          <div className={`font-bold font-mono-nums pt-0.5 border-t border-neutral-800 ${netDay >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                            = Saldo: {netDay >= 0 ? '+' : ''}{formatCurrency(netDay, 'PYG')}
                          </div>
                        </div>

                        {/* Bars container */}
                        <div className="w-full flex items-end justify-center gap-0.5 h-full">
                          {/* Entrada Bar */}
                          <div
                            style={{ height: `${day.entradas > 0 ? Math.max(8, entPct) : 3}%` }}
                            className={`flex-1 max-w-[12px] rounded-t transition-all ${
                              day.entradas > 0
                                ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 group-hover:from-emerald-500 group-hover:to-emerald-300'
                                : 'bg-neutral-800/60'
                            }`}
                          />
                          {/* Saída Bar */}
                          <div
                            style={{ height: `${day.saidas > 0 ? Math.max(8, saiPct) : 3}%` }}
                            className={`flex-1 max-w-[12px] rounded-t transition-all ${
                              day.saidas > 0
                                ? 'bg-gradient-to-t from-rose-600 to-rose-400 group-hover:from-rose-500 group-hover:to-rose-300'
                                : 'bg-neutral-800/60'
                            }`}
                          />
                          {/* Fiado Bar */}
                          {day.fiado > 0 && (
                            <div
                              style={{ height: `${Math.max(8, fiaPct)}%` }}
                              className="flex-1 max-w-[10px] rounded-t bg-gradient-to-t from-amber-600 to-amber-400 transition-all"
                            />
                          )}
                        </div>

                        <span className="text-[10px] text-neutral-500 font-mono-nums group-hover:text-white">
                          {day.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Composition Footer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-950/15 border border-emerald-500/20 space-y-1">
                  <div className="text-[11px] font-bold text-emerald-300">Composição das Entradas</div>
                  <div className="flex justify-between text-[11px] text-neutral-400 font-mono-nums">
                    <span>Vendas à Vista (PDV/Balcão):</span>
                    <strong className="text-emerald-300">{formatCurrency(financialAnalytics.entradasVendasAvista, 'PYG')}</strong>
                  </div>
                  <div className="flex justify-between text-[11px] text-neutral-400 font-mono-nums">
                    <span>Amortizações Recebidas (Clientes):</span>
                    <strong className="text-emerald-300">{formatCurrency(financialAnalytics.entradasAmortizacoesFiado, 'PYG')}</strong>
                  </div>
                  <div className="flex justify-between text-[11px] text-neutral-400 font-mono-nums">
                    <span>Suprimentos / Entradas Avulsas:</span>
                    <strong className="text-emerald-300">{formatCurrency(financialAnalytics.entradasCaixaSuprimentos, 'PYG')}</strong>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-rose-950/15 border border-rose-500/20 space-y-1">
                  <div className="text-[11px] font-bold text-rose-300">Composição das Saídas & Custos</div>
                  <div className="flex justify-between text-[11px] text-neutral-400 font-mono-nums">
                    <span>Custo Mercadoria Vendida (CMV):</span>
                    <strong className="text-rose-300">-{formatCurrency(financialAnalytics.custoMercadoriaVendida, 'PYG')}</strong>
                  </div>
                  <div className="flex justify-between text-[11px] text-neutral-400 font-mono-nums">
                    <span>Saídas / Sangrias de Caixa:</span>
                    <strong className="text-rose-300">-{formatCurrency(financialAnalytics.saidasCaixaDespesas, 'PYG')}</strong>
                  </div>
                  <div className="flex justify-between text-[11px] text-neutral-400 font-mono-nums">
                    <span>Consumo Lançado em Fiado:</span>
                    <strong className="text-amber-300">{formatCurrency(financialAnalytics.vendasFiadoLancadas, 'PYG')}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Ranking of Customers by Total Comprado */}
            {!compact && (
              <div className="lg:col-span-5 p-4 rounded-2xl bg-[#080B12] border border-[#1C2538] flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-amber-400" />
                      <span>Ranking de Clientes por Total Comprado</span>
                    </h3>
                    <p className="text-[11px] text-neutral-400">
                      Clique em qualquer cliente para abrir o registro de todas as compras feitas
                    </p>
                  </div>
                </div>

                <div className="space-y-2 max-h-[310px] overflow-y-auto pr-1">
                  {customerRanking.ranked.length === 0 ? (
                    <p className="text-xs text-neutral-500 py-8 text-center">
                      Nenhum cliente cadastrado ainda.
                    </p>
                  ) : (
                    customerRanking.ranked.slice(0, 8).map((item, idx) => {
                      const pct = Math.min(
                        100,
                        Math.round((item.totalSpent / customerRanking.maxCustomerSpent) * 100)
                      );
                      return (
                        <div
                          key={item.customer.id}
                          onClick={() => onSelectCustomer?.(item.customer)}
                          className="p-2.5 rounded-xl bg-[#0D121E] border border-[#1E273A] hover:border-amber-500/50 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-black flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate block">
                                  {item.customer.name}
                                </span>
                                <span className="text-[10px] text-neutral-400 font-mono-nums">
                                  {item.count} {item.count === 1 ? 'compra' : 'compras'} • Pago: {formatCurrency(item.paidTotal, 'PYG')}
                                </span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-xs sm:text-sm font-black text-amber-400 font-mono-nums block">
                                {formatCurrency(item.totalSpent, 'PYG')}
                              </span>
                              <span className="text-[10px] text-amber-300/80 group-hover:underline">
                                Ver Compras →
                              </span>
                            </div>
                          </div>

                          <div className="w-full h-1.5 bg-neutral-950 rounded-full mt-2 overflow-hidden">
                            <div
                              style={{ width: `${Math.max(5, pct)}%` }}
                              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full"
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
