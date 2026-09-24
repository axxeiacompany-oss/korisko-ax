import React, { useState, useMemo } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { formatCurrency, fromBrl } from '../../utils/currency';
import { 
  Trophy, 
  Calendar, 
  Filter, 
  Printer, 
  TrendingUp, 
  Package, 
  DollarSign, 
  ShoppingBag,
  Download
} from 'lucide-react';

export const MonthlyTopProductsView: React.FC = () => {
  const { sales, products, exchangeRates } = useBakery();

  // Selected Month (default to current month YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<'quantity' | 'revenue'>('revenue');

  // Month options (last 6 months)
  const monthOptions = useMemo(() => {
    const list: Array<{ value: string; label: string }> = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      list.push({ value: val, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return list;
  }, []);

  // Filter sales within selected month
  const monthSales = useMemo(() => {
    return sales.filter(s => s.status === 'completed' && s.timestamp.startsWith(selectedMonth));
  }, [sales, selectedMonth]);

  // Aggregate sales per product
  const productStats = useMemo(() => {
    const map = new Map<string, {
      product: typeof products[0];
      quantity: number;
      revenueBrl: number;
      ordersCount: number;
    }>();

    // Initialize with all active products
    products.forEach(p => {
      map.set(p.id, {
        product: p,
        quantity: 0,
        revenueBrl: 0,
        ordersCount: 0,
      });
    });

    monthSales.forEach(sale => {
      sale.items.forEach(it => {
        const entry = map.get(it.product.id);
        if (entry) {
          entry.quantity += it.quantity;
          entry.revenueBrl += it.subtotalBrl;
          entry.ordersCount += 1;
        } else {
          map.set(it.product.id, {
            product: it.product,
            quantity: it.quantity,
            revenueBrl: it.subtotalBrl,
            ordersCount: 1,
          });
        }
      });
    });

    const totalMonthRevenue = Array.from(map.values()).reduce((acc, el) => acc + el.revenueBrl, 0);

    let list = Array.from(map.values()).filter(el => {
      if (selectedCategory !== 'todos' && el.product.category !== selectedCategory) return false;
      return el.quantity > 0; // show products that had sales
    });

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'revenue') {
        return b.revenueBrl - a.revenueBrl;
      } else {
        return b.quantity - a.quantity;
      }
    });

    return {
      items: list.map((item, idx) => ({
        ...item,
        rank: idx + 1,
        sharePercent: totalMonthRevenue > 0 ? Math.round((item.revenueBrl / totalMonthRevenue) * 100) : 0,
      })),
      totalMonthRevenue,
      totalUnitsSold: list.reduce((acc, el) => acc + el.quantity, 0),
    };
  }, [monthSales, products, selectedCategory, sortBy]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const headers = ["Ranking", "Código", "Produto", "Categoria", "Unidade", "Quantidade Vendida", "Faturamento (BRL)", "Participação (%)"];
    const rows = productStats.items.map(it => [
      it.rank,
      it.product.code,
      `"${it.product.name}"`,
      it.product.category,
      it.product.unit,
      it.quantity,
      it.revenueBrl.toFixed(2),
      `${it.sharePercent}%`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `produtos-mais-vendidos-${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner & Selectors */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold uppercase tracking-wider mb-1">
            <Trophy className="w-4 h-4" />
            <span>Relatório Mensal de Performance</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-100">
            Produtos Mais Vendidos
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Análise de curva ABC, volume de saída por peso/unidade e receita gerada por item.
          </p>
        </div>

        {/* Filter selectors */}
        <div className="flex items-center gap-2.5 flex-wrap">
          
          {/* Month selector */}
          <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-neutral-500" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs text-neutral-200 font-medium focus:outline-none cursor-pointer"
            >
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-neutral-900 text-neutral-100">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Print & Export buttons */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-xl border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-xl border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-neutral-400" />
            Imprimir
          </button>

        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
          <span className="text-xs text-neutral-400 font-medium block">Faturamento do Mês</span>
          <div className="text-2xl font-bold text-neutral-100 font-mono-nums">
            {formatCurrency(productStats.totalMonthRevenue, 'BRL')}
          </div>
          <p className="text-[11px] text-neutral-500 font-mono-nums">
            Em vendas de balcão e padaria
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
          <span className="text-xs text-neutral-400 font-medium block">Volume Total Comercializado</span>
          <div className="text-2xl font-bold text-amber-400 font-mono-nums">
            {productStats.totalUnitsSold.toFixed(1)} <span className="text-xs font-normal text-neutral-400">un/kg</span>
          </div>
          <p className="text-[11px] text-neutral-500">
            {productStats.items.length} itens com giro no período
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
          <span className="text-xs text-neutral-400 font-medium block">Produto Campeão de Vendas</span>
          <div className="text-lg font-bold text-emerald-400 truncate">
            {productStats.items[0]?.product.name || 'Nenhum'}
          </div>
          <p className="text-[11px] text-neutral-500 font-mono-nums">
            {productStats.items[0] ? `${formatCurrency(productStats.items[0].revenueBrl, 'BRL')} (${productStats.items[0].sharePercent}% do total)` : '—'}
          </p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-neutral-900 border border-neutral-800">
        
        {/* Category filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'todos', label: 'Todas as Categorias' },
            { id: 'paes', label: 'Pães' },
            { id: 'confeitaria', label: 'Confeitaria' },
            { id: 'salgados', label: 'Salgados' },
            { id: 'bebidas', label: 'Bebidas' },
            { id: 'frios', label: 'Frios' },
          ].map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-neutral-950 font-semibold'
                  : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sort by */}
        <div className="flex items-center gap-1.5 self-end sm:self-center">
          <span className="text-xs text-neutral-500">Ordenar por:</span>
          <button
            type="button"
            onClick={() => setSortBy('revenue')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
              sortBy === 'revenue'
                ? 'bg-neutral-800 text-neutral-100 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Faturamento (R$)
          </button>
          <button
            type="button"
            onClick={() => setSortBy('quantity')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
              sortBy === 'quantity'
                ? 'bg-neutral-800 text-neutral-100 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Quantidade
          </button>
        </div>

      </div>

      {/* Top Products Table */}
      <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-900">
        <table className="w-full text-left text-xs">
          <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400">
            <tr>
              <th className="py-3.5 px-4 font-medium w-12 text-center">Posição</th>
              <th className="py-3.5 px-4 font-medium">Produto</th>
              <th className="py-3.5 px-4 font-medium">Categoria</th>
              <th className="py-3.5 px-4 font-medium text-right">Qtd. Vendida</th>
              <th className="py-3.5 px-4 font-medium text-right">Faturamento (R$)</th>
              <th className="py-3.5 px-4 font-medium text-right">Equiv. ₲ / $</th>
              <th className="py-3.5 px-4 font-medium w-48">Participação no Mês</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60">
            {productStats.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-neutral-500">
                  Nenhuma venda registrada para os filtros selecionados neste mês.
                </td>
              </tr>
            ) : (
              productStats.items.map((it) => {
                const isTop3 = it.rank <= 3;

                return (
                  <tr key={it.product.id} className="hover:bg-neutral-850/50 transition-colors">
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-mono-nums font-bold text-xs ${
                        it.rank === 1 
                          ? 'bg-amber-500 text-neutral-950 shadow-sm' 
                          : it.rank === 2 
                          ? 'bg-neutral-700 text-neutral-200' 
                          : it.rank === 3 
                          ? 'bg-amber-900/60 text-amber-300' 
                          : 'text-neutral-500'
                      }`}>
                        {it.rank}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-neutral-200">
                      <div>
                        {it.product.name}
                        <span className="block text-[11px] text-neutral-500 font-normal font-mono-nums">
                          SKU: {it.product.code}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-400 capitalize">
                      {it.product.category}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-nums font-bold text-neutral-200">
                      {it.quantity} {it.product.unit}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-nums font-bold text-emerald-400">
                      {formatCurrency(it.revenueBrl, 'BRL')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-nums text-[11px] text-neutral-400">
                      <span>₲ {fromBrl(it.revenueBrl, 'PYG', exchangeRates).toLocaleString('es-PY')}</span>
                      <span className="block text-[10px] text-neutral-500">
                        $ {fromBrl(it.revenueBrl, 'USD', exchangeRates).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono-nums">
                          <span className="text-neutral-400">{it.sharePercent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                          <div
                            style={{ width: `${it.sharePercent}%` }}
                            className={`h-full rounded-full ${
                              isTop3 ? 'bg-amber-500' : 'bg-neutral-600'
                            }`}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
