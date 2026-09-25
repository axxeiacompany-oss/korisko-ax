import React, { useMemo, useState } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Receipt, 
  AlertTriangle, 
  Clock, 
  Coins, 
  ArrowUpRight, 
  Target, 
  Calendar,
  Sparkles,
  Eye,
  Flame,
  UtensilsCrossed,
  ChefHat,
  Users,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { formatCurrency, fromBrl } from '../../utils/currency';
import { Sale } from '../../types';
import { ReceiptModal } from '../modals/ReceiptModal';
import { TabType } from '../Header';

interface Props {
  onNavigate: (tab: TabType) => void;
}

export const DashboardView: React.FC<Props> = ({ onNavigate }) => {
  const { 
    currentUser,
    sales, 
    products, 
    exchangeRates, 
    currentSession, 
    getCurrentGoal,
    fornadas,
    openComandas,
    fichasTecnicas,
    customers
  } = useBakery();

  const isAx = currentUser.id === 'emp-admin-ax' || currentUser.email === 'axxeiacompany@gmail.com' || currentUser.name === 'Ax';

  const [inspectSale, setInspectSale] = useState<Sale | null>(null);

  // Filter today's sales
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySales = useMemo(() => {
    return sales.filter(s => s.status === 'completed' && s.timestamp.startsWith(todayStr));
  }, [sales, todayStr]);

  // Operational stats
  const openComandasTotalBrl = useMemo(() => {
    return openComandas.reduce((sum, cmd) => {
      return sum + cmd.items.reduce((acc, it) => acc + it.subtotalBrl, 0);
    }, 0);
  }, [openComandas]);

  // Financial stats for today
  const todayRevenueBrl = useMemo(() => {
    return todaySales.reduce((sum, s) => sum + s.totalBrl, 0);
  }, [todaySales]);

  // Breakdown of today's payments by currency
  const currencyBreakdown = useMemo(() => {
    let brlTotal = 0;
    let pygTotal = 0;
    let usdTotal = 0;

    todaySales.forEach(s => {
      s.payments.forEach(p => {
        if (p.currency === 'BRL') brlTotal += p.amountReceived;
        if (p.currency === 'PYG') pygTotal += p.amountReceived;
        if (p.currency === 'USD') usdTotal += p.amountReceived;
      });
    });

    return { brlTotal, pygTotal, usdTotal };
  }, [todaySales]);

  const ticketMedio = todaySales.length > 0 ? todayRevenueBrl / todaySales.length : 0;

  // Estimated gross profit margin for today
  const todayGrossProfit = useMemo(() => {
    let totalCost = 0;
    todaySales.forEach(s => {
      s.items.forEach(it => {
        totalCost += (it.product.costPriceBrl || 0) * it.quantity;
      });
    });
    return Math.max(0, todayRevenueBrl - totalCost);
  }, [todaySales, todayRevenueBrl]);

  const profitMarginPercent = todayRevenueBrl > 0 
    ? Math.round((todayGrossProfit / todayRevenueBrl) * 100) 
    : 0;

  // Hourly distribution for today (06:00 to 21:00)
  const hourlyData = useMemo(() => {
    const hours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    const map = new Map<number, number>();
    hours.forEach(h => map.set(h, 0));

    todaySales.forEach(s => {
      const h = new Date(s.timestamp).getHours();
      if (map.has(h)) {
        map.set(h, (map.get(h) || 0) + s.totalBrl);
      }
    });

    const maxVal = Math.max(...Array.from(map.values()), 50);

    return hours.map(h => ({
      hour: `${String(h).padStart(2, '0')}h`,
      total: map.get(h) || 0,
      percentage: Math.round(((map.get(h) || 0) / maxVal) * 100),
    }));
  }, [todaySales]);

  // Goal calculation
  const currentGoal = getCurrentGoal();
  const currentMonthSales = useMemo(() => {
    const monthPrefix = new Date().toISOString().slice(0, 7);
    return sales.filter(s => s.status === 'completed' && s.timestamp.startsWith(monthPrefix));
  }, [sales]);

  const monthRevenueBrl = useMemo(() => {
    return currentMonthSales.reduce((sum, s) => sum + s.totalBrl, 0);
  }, [currentMonthSales]);

  const goalPercent = Math.min(100, Math.round((monthRevenueBrl / currentGoal.targetRevenueBrl) * 100));

  // Low stock products alert (stock <= minStock)
  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock <= p.minStock);
  }, [products]);

  // Expiring soon products (next 5 days)
  const expiringProducts = useMemo(() => {
    const now = new Date();
    const threshold = new Date(now.getTime() + 5 * 86400000);
    return products.filter(p => {
      if (!p.expirationDate) return false;
      const exp = new Date(p.expirationDate);
      return exp >= now && exp <= threshold;
    });
  }, [products]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner / Welcome & Quick Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-amber-950/30 border border-neutral-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <span aria-hidden="true">·</span>
            <span>Caixa #{currentSession.sessionNumber} ({currentSession.status === 'aberto' ? 'Aberto' : 'Fechado'})</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-100">
            Painel Financeiro em Tempo Real
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Monitoramento das vendas diárias, fluxo em 3 moedas e desempenho de metas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('venda_direta')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-current text-white" />
            Venda Direta (1-Clique)
          </button>
          <button
            type="button"
            onClick={() => onNavigate('pdv')}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs shadow-lg shadow-amber-500/10 transition-colors flex items-center gap-1.5"
          >
            <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            Abrir PDV
          </button>
          {isAx && (
            <button
              type="button"
              onClick={() => onNavigate('afiliados')}
              className="px-3.5 py-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              Afiliados & Funções
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate('caixa')}
            className="px-3.5 py-2.5 rounded-xl border border-neutral-700 bg-neutral-800/80 hover:bg-neutral-800 text-neutral-200 text-xs font-medium transition-colors"
          >
            Ver Caixa
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Faturamento Hoje (Consolidado) */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Faturamento Hoje</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-neutral-100 font-mono-nums">
              {formatCurrency(todayRevenueBrl, 'BRL')}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-1 font-mono-nums">
              <span>≈ {formatCurrency(fromBrl(todayRevenueBrl, 'PYG', exchangeRates), 'PYG')}</span>
              <span aria-hidden="true">·</span>
              <span>≈ {formatCurrency(fromBrl(todayRevenueBrl, 'USD', exchangeRates), 'USD')}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Clientes & Atendimentos */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Atendimentos Hoje</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-neutral-100 font-mono-nums">
              {todaySales.length} <span className="text-sm font-normal text-neutral-400">vendas</span>
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">
              Ritmo de {todaySales.length > 0 ? (todaySales.length / 8).toFixed(1) : 0} clientes por hora
            </div>
          </div>
        </div>

        {/* Card 3: Ticket Médio */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Ticket Médio</span>
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-neutral-100 font-mono-nums">
              {formatCurrency(ticketMedio, 'BRL')}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">
              Meta estipulada: {formatCurrency(currentGoal.targetTicketMedioBrl, 'BRL')}
            </div>
          </div>
        </div>

        {/* Card 4: Lucro Bruto Estimado */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Lucro Bruto Estimado</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-300 font-mono-nums">
              {formatCurrency(todayGrossProfit, 'BRL')}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">
              Margem de contribuição: <strong className="text-emerald-400">{profitMarginPercent}%</strong>
            </div>
          </div>
        </div>

      </div>

      {/* Multi-Currency Cash Drawer Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Real */}
        <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-neutral-400 block font-medium">Recebido Hoje em Real</span>
            <span className="text-lg font-bold text-neutral-100 font-mono-nums">
              {formatCurrency(currencyBreakdown.brlTotal, 'BRL')}
            </span>
          </div>
          <span className="text-xs font-semibold px-2 py-1 rounded bg-neutral-800 text-neutral-300">
            🇧🇷 BRL
          </span>
        </div>

        {/* Guaraní */}
        <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-neutral-400 block font-medium">Recebido Hoje em Guaraní</span>
            <span className="text-lg font-bold text-amber-400 font-mono-nums">
              {formatCurrency(currencyBreakdown.pygTotal, 'PYG')}
            </span>
          </div>
          <span className="text-xs font-semibold px-2 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
            🇵🇾 PYG
          </span>
        </div>

        {/* Dólar */}
        <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-neutral-400 block font-medium">Recebido Hoje em Dólar</span>
            <span className="text-lg font-bold text-emerald-400 font-mono-nums">
              {formatCurrency(currencyBreakdown.usdTotal, 'USD')}
            </span>
          </div>
          <span className="text-xs font-semibold px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            🇺🇸 USD
          </span>
        </div>

      </div>

      {/* Operational Highlights: Fornadas, Comandas, Fichas Técnicas & CRM */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Fornadas Card */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-200">Fornadas Hoje</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono-nums font-bold">
                  {fornadas.length}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1">
                {fornadas.length > 0
                  ? `Última: ${fornadas[0].quantity} ${fornadas[0].unit} ${fornadas[0].productName}`
                  : 'Nenhuma fornada ainda'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('pdv')}
            className="w-full py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-xl transition-colors text-center"
          >
            Lançar no PDV
          </button>
        </div>

        {/* Comandas Abertas Card */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-200">Comandas Salão</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono-nums font-bold">
                  {openComandas.length}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 font-mono-nums">
                Consumo: {formatCurrency(openComandasTotalBrl, 'BRL')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('pdv')}
            className="w-full py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-xl transition-colors text-center"
          >
            Ver Comandas
          </button>
        </div>

        {/* Fichas Técnicas Card */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-200">Fichas Técnicas</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono-nums font-bold">
                  {fichasTecnicas.length}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Custos, receitas & lotes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('fichas_tecnicas')}
            className="w-full py-1.5 bg-neutral-800 hover:bg-neutral-700 text-sky-300 text-xs font-medium rounded-xl transition-colors text-center"
          >
            Acessar Receituário
          </button>
        </div>

        {/* CRM / Fiado Card */}
        {(() => {
          const totalDebt = customers.reduce((sum, c) => sum + c.outstandingBalanceBrl, 0);
          return (
            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-200">CRM & Fiado</span>
                    {totalDebt > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono-nums font-bold">
                        A Receber
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5 font-mono-nums">
                    {totalDebt > 0 ? formatCurrency(totalDebt, 'BRL') : `${customers.length} clientes em dia`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('crm')}
                className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold rounded-xl transition-colors text-center"
              >
                Gerenciar Clientes
              </button>
            </div>
          );
        })()}

      </div>

      {/* 2-Column Section: Hourly Sales Chart + Monthly Goal Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Hourly distribution chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Vendas por Horário (Picos da Padaria)
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Picos típicos: café matinal (06h-09h) e pão da tarde (16h-19h)
              </p>
            </div>
            <span className="text-xs font-mono-nums text-neutral-400">Hoje</span>
          </div>

          {/* Clean CSS/SVG Bar Chart */}
          <div className="pt-4">
            <div className="h-44 flex items-end gap-2 pt-6 border-b border-neutral-800">
              {hourlyData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <div className="w-full flex items-end justify-center h-full">
                    <div
                      style={{ height: `${Math.max(8, d.percentage)}%` }}
                      className="w-full max-w-[28px] rounded-t-md bg-gradient-to-t from-amber-600/60 to-amber-400 transition-all group-hover:from-amber-500 group-hover:to-amber-300 relative"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-neutral-950 border border-neutral-800 text-[10px] text-white px-1.5 py-0.5 rounded font-mono-nums whitespace-nowrap z-10">
                        {formatCurrency(d.total, 'BRL')}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono-nums group-hover:text-neutral-300">
                    {d.hour}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Monthly Goal Progress Widget */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-400" />
                Meta Mensal de Vendas
              </span>
              <button
                type="button"
                onClick={() => onNavigate('metas')}
                className="text-xs text-amber-400 hover:text-amber-300 font-medium"
              >
                Detalhes
              </button>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold text-neutral-100 font-mono-nums">
                  {formatCurrency(monthRevenueBrl, 'BRL')}
                </span>
                <span className="text-xs text-neutral-400 font-mono-nums">
                  de {formatCurrency(currentGoal.targetRevenueBrl, 'BRL')}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 bg-neutral-950 rounded-full mt-2 overflow-hidden border border-neutral-800">
                <div
                  style={{ width: `${goalPercent}%` }}
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-neutral-400 mt-2 font-mono-nums">
                <span>{goalPercent}% alcançado</span>
                <span>Faltam {formatCurrency(Math.max(0, currentGoal.targetRevenueBrl - monthRevenueBrl), 'BRL')}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-800/80 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Média diária esperada:</span>
                <strong className="text-neutral-200 font-mono-nums">
                  {formatCurrency(currentGoal.targetDailyAverageBrl, 'BRL')}
                </strong>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Atendimentos no mês:</span>
                <strong className="text-neutral-200 font-mono-nums">
                  {currentMonthSales.length} / {currentGoal.targetTransactions}
                </strong>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
            <span>Diagnóstico do mês</span>
            <strong className="font-semibold">{goalPercent >= 50 ? 'Em ritmo excelente!' : 'Acelerando vendas'}</strong>
          </div>
        </div>

      </div>

      {/* 2-Column Section: Low Stock & Expiring Alerts + Recent Sales Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Inventory alerts */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Alertas de Estoque & Validade
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('estoque')}
              className="text-xs text-amber-400 hover:text-amber-300"
            >
              Gerenciar
            </button>
          </div>

          <div className="space-y-2">
            {lowStockProducts.length === 0 && expiringProducts.length === 0 ? (
              <p className="text-xs text-neutral-500 py-4 text-center">
                Todos os produtos estão com estoque regularizado.
              </p>
            ) : (
              <>
                {lowStockProducts.slice(0, 3).map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs"
                  >
                    <div>
                      <span className="font-medium text-neutral-200 block">{p.name}</span>
                      <span className="text-[11px] text-rose-400 font-mono-nums">
                        Estoque: {p.stock} {p.unit} (Mínimo: {p.minStock} {p.unit})
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                      Baixo
                    </span>
                  </div>
                ))}

                {expiringProducts.slice(0, 2).map(p => (
                  <div
                    key={`exp-${p.id}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs"
                  >
                    <div>
                      <span className="font-medium text-neutral-200 block">{p.name}</span>
                      <span className="text-[11px] text-amber-400 font-mono-nums">
                        Vence em: {p.expirationDate}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                      Validade
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Recent sales feed */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              Últimas Vendas Realizadas
            </h3>
            <span className="text-xs text-neutral-500">Feed ao vivo</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-500 text-[11px]">
                  <th className="pb-2 font-medium">Venda #</th>
                  <th className="pb-2 font-medium">Horário</th>
                  <th className="pb-2 font-medium">Operador</th>
                  <th className="pb-2 font-medium">Itens</th>
                  <th className="pb-2 font-medium">Moeda / Forma</th>
                  <th className="pb-2 font-medium text-right">Total (BRL)</th>
                  <th className="pb-2 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {sales.slice(0, 5).map(s => {
                  const timeStr = new Date(s.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  const primaryPayment = s.payments[0];

                  return (
                    <tr key={s.id} className="hover:bg-neutral-850/40 transition-colors">
                      <td className="py-2.5 font-mono-nums font-semibold text-neutral-200">
                        #{s.saleNumber}
                      </td>
                      <td className="py-2.5 text-neutral-400 font-mono-nums">
                        {timeStr}
                      </td>
                      <td className="py-2.5 text-neutral-300">
                        {s.employeeName}
                      </td>
                      <td className="py-2.5 text-neutral-400">
                        {s.items.length} {s.items.length === 1 ? 'item' : 'itens'}
                      </td>
                      <td className="py-2.5">
                        {primaryPayment && (
                          <span className="inline-flex items-center gap-1 font-mono-nums">
                            <strong className="text-neutral-200">{primaryPayment.currency}</strong>
                            <span className="text-neutral-500 text-[10px]">({primaryPayment.method.replace('_', ' ')})</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 font-mono-nums font-bold text-right text-neutral-100">
                        {formatCurrency(s.totalBrl, 'BRL')}
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setInspectSale(s)}
                          className="p-1 rounded text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 transition-colors"
                          title="Ver Cupom / Detalhes"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Inspect receipt modal */}
      <ReceiptModal
        sale={inspectSale}
        onClose={() => setInspectSale(null)}
      />

    </div>
  );
};
