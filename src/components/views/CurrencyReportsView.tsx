import React, { useState, useMemo } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { formatCurrency, fromBrl, toBrl } from '../../utils/currency';
import { Currency } from '../../types';
import { 
  Coins, 
  ArrowRightLeft, 
  TrendingUp, 
  Globe, 
  Settings, 
  Calculator, 
  Search,
  CheckCircle2
} from 'lucide-react';
import { ExchangeRatesModal } from '../modals/ExchangeRatesModal';

export const CurrencyReportsView: React.FC = () => {
  const { sales, exchangeRates, hasPermission } = useBakery();
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<'hoje' | 'mes' | 'tudo'>('mes');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Currency Converter Simulator State
  const [simAmount, setSimAmount] = useState('100');
  const [simFrom, setSimFrom] = useState<Currency>('BRL');
  const [simTo, setSimTo] = useState<Currency>('PYG');

  const canEditRates = hasPermission(['admin', 'gerente']);

  // Filter sales based on period
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayPrefix = now.toISOString().slice(0, 10);
    const monthPrefix = now.toISOString().slice(0, 7);

    return sales.filter(s => {
      if (s.status !== 'completed') return false;
      if (periodFilter === 'hoje') return s.timestamp.startsWith(todayPrefix);
      if (periodFilter === 'mes') return s.timestamp.startsWith(monthPrefix);
      return true;
    });
  }, [sales, periodFilter]);

  // Aggregate detailed stats for each currency
  const currencyReports = useMemo(() => {
    let brlTotal = 0;
    let brlTxCount = 0;

    let pygTotal = 0;
    let pygEqBrl = 0;
    let pygTxCount = 0;

    let usdTotal = 0;
    let usdEqBrl = 0;
    let usdTxCount = 0;

    let totalConsolidatedBrl = 0;

    filteredSales.forEach(s => {
      totalConsolidatedBrl += s.totalBrl;

      s.payments.forEach(p => {
        if (p.currency === 'BRL') {
          brlTotal += p.amountReceived;
          brlTxCount += 1;
        } else if (p.currency === 'PYG') {
          pygTotal += p.amountReceived;
          pygEqBrl += p.equivalentBrl;
          pygTxCount += 1;
        } else if (p.currency === 'USD') {
          usdTotal += p.amountReceived;
          usdEqBrl += p.equivalentBrl;
          usdTxCount += 1;
        }
      });
    });

    const foreignSharePercent = totalConsolidatedBrl > 0 
      ? Math.round(((pygEqBrl + usdEqBrl) / totalConsolidatedBrl) * 100) 
      : 0;

    return {
      brl: {
        total: brlTotal,
        txCount: brlTxCount,
        share: totalConsolidatedBrl > 0 ? Math.round((brlTotal / totalConsolidatedBrl) * 100) : 0,
      },
      pyg: {
        total: pygTotal,
        eqBrl: pygEqBrl,
        txCount: pygTxCount,
        share: totalConsolidatedBrl > 0 ? Math.round((pygEqBrl / totalConsolidatedBrl) * 100) : 0,
      },
      usd: {
        total: usdTotal,
        eqBrl: usdEqBrl,
        txCount: usdTxCount,
        share: totalConsolidatedBrl > 0 ? Math.round((usdEqBrl / totalConsolidatedBrl) * 100) : 0,
      },
      totalConsolidatedBrl,
      foreignSharePercent,
    };
  }, [filteredSales]);

  // Converter simulation output
  const simulatedResult = useMemo(() => {
    const val = parseFloat(simAmount) || 0;
    if (simFrom === simTo) return val;
    // convert from -> brl -> to
    const inBrl = toBrl(val, simFrom, exchangeRates);
    return fromBrl(inBrl, simTo, exchangeRates);
  }, [simAmount, simFrom, simTo, exchangeRates]);

  // List of multi-currency transactions for detailed audit
  const foreignTransactions = useMemo(() => {
    const list: Array<{
      saleNumber: number;
      timestamp: string;
      customerName?: string;
      currency: Currency;
      amountReceived: number;
      rateUsed: number;
      equivalentBrl: number;
      method: string;
    }> = [];

    filteredSales.forEach(s => {
      s.payments.forEach(p => {
        if (p.currency !== 'BRL') {
          list.push({
            saleNumber: s.saleNumber,
            timestamp: s.timestamp,
            customerName: s.customerName,
            currency: p.currency,
            amountReceived: p.amountReceived,
            rateUsed: p.exchangeRateUsed,
            equivalentBrl: p.equivalentBrl,
            method: p.method,
          });
        }
      });
    });

    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;

    return list.filter(t => 
      t.saleNumber.toString().includes(q) || 
      t.currency.toLowerCase().includes(q) ||
      (t.customerName && t.customerName.toLowerCase().includes(q))
    );
  }, [filteredSales, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold uppercase tracking-wider mb-1">
            <Globe className="w-4 h-4" />
            <span>Operações Comerciais da Fronteira</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-100">
            Relatórios Detalhados por Moeda
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Demonstrativo financeiro separado em Real (BRL), Guaraní (PYG) e Dólar Americano (USD).
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Period selector */}
          <div className="flex items-center gap-1 p-1 bg-neutral-950 rounded-xl border border-neutral-800 text-xs">
            {(['hoje', 'mes', 'tudo'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriodFilter(p)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                  periodFilter === p
                    ? 'bg-neutral-800 text-amber-400 font-semibold shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {p === 'hoje' ? 'Hoje' : p === 'mes' ? 'Este Mês' : 'Todo Período'}
              </button>
            ))}
          </div>

          {canEditRates && (
            <button
              type="button"
              onClick={() => setIsRatesModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition-colors flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              Configurar Cotações
            </button>
          )}
        </div>
      </div>

      {/* 3 Detailed Currency Pillar Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Pillar 1: REAL BRASILEIRO (BRL) */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🇧🇷</span>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">Real Brasileiro</h3>
                <span className="text-[10px] text-neutral-400 font-mono-nums">Moeda Base (BRL)</span>
              </div>
            </div>
            <span className="text-xs font-bold text-neutral-300 font-mono-nums px-2 py-0.5 rounded bg-neutral-800">
              {currencyReports.brl.share}% das vendas
            </span>
          </div>

          <div className="pt-2">
            <span className="text-xs text-neutral-500 block">Total Recebido na Moeda</span>
            <div className="text-2xl font-bold text-neutral-100 font-mono-nums">
              {formatCurrency(currencyReports.brl.total, 'BRL')}
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-neutral-800/80 text-xs">
            <div className="flex justify-between text-neutral-400">
              <span>Pagamentos processados:</span>
              <strong className="text-neutral-200 font-mono-nums">{currencyReports.brl.txCount} transações</strong>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Cotação base:</span>
              <span className="text-neutral-200 font-mono-nums">1.00 (Padrão contábil)</span>
            </div>
          </div>
        </div>

        {/* Pillar 2: GUARANÍ PARAGUAIO (PYG) */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🇵🇾</span>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">Guaraní Paraguaio</h3>
                <span className="text-[10px] text-amber-400 font-mono-nums">Moeda Estrangeira (PYG)</span>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-400 font-mono-nums px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
              {currencyReports.pyg.share}% das vendas
            </span>
          </div>

          <div className="pt-2">
            <span className="text-xs text-neutral-500 block">Total Recebido na Moeda</span>
            <div className="text-2xl font-bold text-amber-400 font-mono-nums">
              {formatCurrency(currencyReports.pyg.total, 'PYG')}
            </div>
            <span className="text-[11px] text-neutral-400 font-mono-nums mt-0.5 block">
              Equivalente em R$: <strong className="text-neutral-200 font-semibold">{formatCurrency(currencyReports.pyg.eqBrl, 'BRL')}</strong>
            </span>
          </div>

          <div className="space-y-2 pt-3 border-t border-neutral-800/80 text-xs">
            <div className="flex justify-between text-neutral-400">
              <span>Pagamentos processados:</span>
              <strong className="text-neutral-200 font-mono-nums">{currencyReports.pyg.txCount} transações</strong>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Cotação atual do caixa:</span>
              <span className="text-amber-400 font-mono-nums">R$ 1 = ₲ {exchangeRates.BRL_TO_PYG.toLocaleString('es-PY')}</span>
            </div>
          </div>
        </div>

        {/* Pillar 3: DÓLAR AMERICANO (USD) */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🇺🇸</span>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">Dólar Americano</h3>
                <span className="text-[10px] text-emerald-400 font-mono-nums">Moeda Forte (USD)</span>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-400 font-mono-nums px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              {currencyReports.usd.share}% das vendas
            </span>
          </div>

          <div className="pt-2">
            <span className="text-xs text-neutral-500 block">Total Recebido na Moeda</span>
            <div className="text-2xl font-bold text-emerald-400 font-mono-nums">
              {formatCurrency(currencyReports.usd.total, 'USD')}
            </div>
            <span className="text-[11px] text-neutral-400 font-mono-nums mt-0.5 block">
              Equivalente em R$: <strong className="text-neutral-200 font-semibold">{formatCurrency(currencyReports.usd.eqBrl, 'BRL')}</strong>
            </span>
          </div>

          <div className="space-y-2 pt-3 border-t border-neutral-800/80 text-xs">
            <div className="flex justify-between text-neutral-400">
              <span>Pagamentos processados:</span>
              <strong className="text-neutral-200 font-mono-nums">{currencyReports.usd.txCount} transações</strong>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Cotação atual do caixa:</span>
              <span className="text-emerald-400 font-mono-nums">$ 1 = R$ {exchangeRates.USD_TO_BRL.toFixed(2)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Simulator Section for Cashiers & Balcão */}
      <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-neutral-100">
              Simulador Rápido de Conversão de Balcão
            </h3>
          </div>
          <span className="text-xs text-neutral-500">Câmbio em tempo real</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
          <div>
            <label className="text-xs text-neutral-400 block mb-1">Valor a Converter</label>
            <input
              type="number"
              value={simAmount}
              onChange={(e) => setSimAmount(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm font-mono-nums font-bold text-neutral-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-xs text-neutral-400 block mb-1">De Moeda</label>
            <select
              value={simFrom}
              onChange={(e) => setSimFrom(e.target.value as Currency)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
            >
              <option value="BRL">🇧🇷 Real Brasileiro (BRL)</option>
              <option value="PYG">🇵🇾 Guaraní Paraguaio (PYG)</option>
              <option value="USD">🇺🇸 Dólar Americano (USD)</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-neutral-400 block mb-1">Para Moeda</label>
            <select
              value={simTo}
              onChange={(e) => setSimTo(e.target.value as Currency)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
            >
              <option value="PYG">🇵🇾 Guaraní Paraguaio (PYG)</option>
              <option value="USD">🇺🇸 Dólar Americano (USD)</option>
              <option value="BRL">🇧🇷 Real Brasileiro (BRL)</option>
            </select>
          </div>

          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-center">
            <span className="text-[10px] text-neutral-500 block uppercase">Resultado Calculado</span>
            <span className="text-base font-bold text-amber-400 font-mono-nums">
              {formatCurrency(simulatedResult, simTo)}
            </span>
          </div>
        </div>
      </div>

      {/* Foreign Transactions Table */}
      <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-400" />
              Auditoria de Recebimentos em Guaraní e Dólar ({foreignTransactions.length})
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Registro histórico com cotação congelada de cada cupom
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por cupom ou moeda..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400">
              <tr>
                <th className="py-3 px-4 font-medium">Cupom #</th>
                <th className="py-3 px-4 font-medium">Data / Hora</th>
                <th className="py-3 px-4 font-medium">Moeda</th>
                <th className="py-3 px-4 font-medium text-right">Valor Recebido</th>
                <th className="py-3 px-4 font-medium text-right">Cotação do Caixa</th>
                <th className="py-3 px-4 font-medium text-right">Equiv. em Real (R$)</th>
                <th className="py-3 px-4 font-medium">Forma</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 bg-neutral-900">
              {foreignTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-500">
                    Nenhum recebimento em moeda estrangeira neste período.
                  </td>
                </tr>
              ) : (
                foreignTransactions.map((tx, idx) => {
                  const dateStr = new Date(tx.timestamp).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr key={idx} className="hover:bg-neutral-850/50 transition-colors">
                      <td className="py-3 px-4 font-mono-nums font-semibold text-neutral-200">
                        #{tx.saleNumber}
                      </td>
                      <td className="py-3 px-4 font-mono-nums text-neutral-400 text-[11px]">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          tx.currency === 'PYG' 
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' 
                            : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                        }`}>
                          {tx.currency}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono-nums font-bold text-neutral-100">
                        {formatCurrency(tx.amountReceived, tx.currency)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-nums text-neutral-400 text-[11px]">
                        {tx.currency === 'USD' 
                          ? `$ 1 = R$ ${tx.rateUsed.toFixed(2)}` 
                          : `R$ 1 = ₲ ${tx.rateUsed.toLocaleString('es-PY')}`}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-nums font-bold text-emerald-400">
                        {formatCurrency(tx.equivalentBrl, 'BRL')}
                      </td>
                      <td className="py-3 px-4 text-neutral-400 capitalize">
                        {tx.method.replace('_', ' ')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <ExchangeRatesModal
        isOpen={isRatesModalOpen}
        onClose={() => setIsRatesModalOpen(false)}
      />

    </div>
  );
};
