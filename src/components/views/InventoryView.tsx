import React, { useState, useMemo } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { Product, ProductCategory, StockMovement } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { 
  Package, 
  AlertTriangle, 
  Plus, 
  ArrowUpDown, 
  Search, 
  Edit3, 
  Trash2, 
  History, 
  Clock, 
  CheckCircle2, 
  Layers,
  Filter
} from 'lucide-react';
import { NewProductModal } from '../modals/NewProductModal';
import { StockMovementModal } from '../modals/StockMovementModal';

export const InventoryView: React.FC = () => {
  const { products, stockMovements, deleteProduct, hasPermission } = useBakery();

  const [activeTab, setActiveTab] = useState<'catalogo' | 'historico'>('catalogo');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  // Modals state
  const [isNewProductOpen, setIsNewProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isStockMovementOpen, setIsStockMovementOpen] = useState(false);
  const [movementTargetProduct, setMovementTargetProduct] = useState<Product | null>(null);

  const canManageProducts = hasPermission(['admin', 'gerente']);

  // Inventory stats
  const totalItemsCount = products.length;
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
  const totalStockValuation = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.stock * (p.costPriceBrl || p.priceBrl * 0.6)), 0);
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (filterLowStockOnly && p.stock > p.minStock) return false;
      if (selectedCategory !== 'todos' && p.category !== selectedCategory) return false;
      const q = searchQuery.toLowerCase().trim();
      if (q && !p.name.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, filterLowStockOnly, selectedCategory, searchQuery]);

  const handleEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setIsNewProductOpen(true);
  };

  const handleQuickMovement = (prod: Product) => {
    setMovementTargetProduct(prod);
    setIsStockMovementOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Deseja realmente remover o produto "${name}" do sistema?`)) {
      deleteProduct(id);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header & Quick KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Total Products */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Itens Cadastrados</span>
            <Package className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-100 font-mono-nums">
            {totalItemsCount} <span className="text-xs font-normal text-neutral-500">produtos / insumos</span>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Estoque Baixo / Reposição</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 font-mono-nums">
            {lowStockCount} <span className="text-xs font-normal text-neutral-500">itens em alerta</span>
          </div>
        </div>

        {/* Total Inventory Value */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Valor Estimado do Estoque</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono-nums">
            {formatCurrency(totalStockValuation, 'BRL')}
          </div>
        </div>

      </div>

      {/* Main Container */}
      <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-5">
        
        {/* Actions & Tab Switcher Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-800">
          
          {/* Segmented Tab buttons */}
          <div className="flex items-center gap-1 p-1 bg-neutral-950 rounded-xl border border-neutral-800">
            <button
              type="button"
              onClick={() => setActiveTab('catalogo')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'catalogo'
                  ? 'bg-neutral-800 text-amber-400 font-semibold shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Controle de Estoque ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('historico')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'historico'
                  ? 'bg-neutral-800 text-amber-400 font-semibold shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Histórico de Movimentações ({stockMovements.length})
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMovementTargetProduct(null);
                setIsStockMovementOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-sky-400" />
              Registrar Movimentação / Fornada
            </button>
            {canManageProducts && (
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setIsNewProductOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold shadow-lg shadow-amber-500/10 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                Novo Produto
              </button>
            )}
          </div>

        </div>

        {activeTab === 'catalogo' ? (
          <>
            {/* Search & Filter Toolbar */}
            <div className="flex flex-col md:flex-row items-center gap-3">
              
              {/* Search input */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar por nome ou código..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Category selector */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full md:w-52 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
              >
                <option value="todos">Todas as Categorias</option>
                <option value="paes">Pães</option>
                <option value="confeitaria">Confeitaria</option>
                <option value="salgados">Salgados</option>
                <option value="bebidas">Bebidas</option>
                <option value="frios">Frios & Queijos</option>
                <option value="ingredientes">Ingredientes / Matéria-prima</option>
              </select>

              {/* Low stock toggle */}
              <button
                type="button"
                onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
                className={`px-3 py-2 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  filterLowStockOnly
                    ? 'border-rose-500 bg-rose-500/10 text-rose-300'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                Apenas Estoque Baixo ({lowStockCount})
              </button>

            </div>

            {/* Products Table */}
            <div className="overflow-x-auto rounded-xl border border-neutral-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400">
                  <tr>
                    <th className="py-3 px-4 font-medium">Código</th>
                    <th className="py-3 px-4 font-medium">Nome do Produto</th>
                    <th className="py-3 px-4 font-medium">Categoria</th>
                    <th className="py-3 px-4 font-medium text-right">Preço Venda</th>
                    <th className="py-3 px-4 font-medium text-right">Custo</th>
                    <th className="py-3 px-4 font-medium text-center">Estoque Atual</th>
                    <th className="py-3 px-4 font-medium text-center">Status</th>
                    <th className="py-3 px-4 font-medium">Validade</th>
                    <th className="py-3 px-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 bg-neutral-900">
                  {filteredProducts.map((p) => {
                    const isLow = p.stock <= p.minStock;
                    const isZero = p.stock <= 0;

                    return (
                      <tr key={p.id} className="hover:bg-neutral-850/50 transition-colors">
                        <td className="py-3 px-4 font-mono-nums text-neutral-400 text-[11px]">
                          {p.code}
                        </td>
                        <td className="py-3 px-4 font-semibold text-neutral-200">
                          {p.name}
                          {p.isIngredient && (
                            <span className="ml-1.5 text-[10px] text-amber-400/80 font-normal">
                              (Insumo)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-neutral-400 capitalize">
                          {p.category}
                        </td>
                        <td className="py-3 px-4 text-right font-mono-nums font-bold text-neutral-100">
                          {formatCurrency(p.priceBrl, 'BRL')}
                          <span className="text-[10px] font-normal text-neutral-500 ml-0.5">/{p.unit}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono-nums text-neutral-400">
                          {formatCurrency(p.costPriceBrl, 'BRL')}
                        </td>
                        <td className="py-3 px-4 text-center font-mono-nums font-bold text-neutral-100">
                          {p.stock} {p.unit}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isZero ? (
                            <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                              Esgotado
                            </span>
                          ) : isLow ? (
                            <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                              Baixo (Min: {p.minStock})
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                              Regular
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-neutral-400 text-[11px] font-mono-nums">
                          {p.expirationDate || '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleQuickMovement(p)}
                              title="Adicionar / Ajustar Estoque"
                              className="p-1 rounded text-neutral-400 hover:text-sky-400 hover:bg-neutral-800 transition-colors"
                            >
                              <ArrowUpDown className="w-3.5 h-3.5" />
                            </button>
                            {canManageProducts && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleEditProduct(p)}
                                  title="Editar Produto"
                                  className="p-1 rounded text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 transition-colors"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(p.id, p.name)}
                                  title="Excluir Produto"
                                  className="p-1 rounded text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* Stock Movements Audit Trail */
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-neutral-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400">
                  <tr>
                    <th className="py-3 px-4 font-medium">Data / Hora</th>
                    <th className="py-3 px-4 font-medium">Produto</th>
                    <th className="py-3 px-4 font-medium">Tipo</th>
                    <th className="py-3 px-4 font-medium text-right">Qtd</th>
                    <th className="py-3 px-4 font-medium text-center">Antes → Depois</th>
                    <th className="py-3 px-4 font-medium">Motivo</th>
                    <th className="py-3 px-4 font-medium">Responsável</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 bg-neutral-900">
                  {stockMovements.map((mov) => {
                    const dateStr = new Date(mov.timestamp).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    const isAdd = mov.type === 'entrada' || mov.type === 'producao';
                    const isLoss = mov.type === 'perda';

                    return (
                      <tr key={mov.id} className="hover:bg-neutral-850/50 transition-colors">
                        <td className="py-3 px-4 font-mono-nums text-neutral-400 text-[11px]">
                          {dateStr}
                        </td>
                        <td className="py-3 px-4 font-semibold text-neutral-200">
                          {mov.productName}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${
                            isAdd 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : isLoss 
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-neutral-800 text-neutral-300'
                          }`}>
                            {mov.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className={`py-3 px-4 text-right font-mono-nums font-bold ${
                          isAdd ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-neutral-200'
                        }`}>
                          {isAdd ? `+${mov.quantity}` : `-${mov.quantity}`} {mov.unit}
                        </td>
                        <td className="py-3 px-4 text-center font-mono-nums text-neutral-400 text-[11px]">
                          {mov.previousStock} → <strong className="text-neutral-200">{mov.newStock}</strong> {mov.unit}
                        </td>
                        <td className="py-3 px-4 text-neutral-300">
                          {mov.reason}
                        </td>
                        <td className="py-3 px-4 text-neutral-400 text-[11px]">
                          {mov.employeeName}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Modals */}
      <NewProductModal
        isOpen={isNewProductOpen}
        onClose={() => {
          setIsNewProductOpen(false);
          setEditingProduct(null);
        }}
        productToEdit={editingProduct}
      />

      <StockMovementModal
        isOpen={isStockMovementOpen}
        onClose={() => {
          setIsStockMovementOpen(false);
          setMovementTargetProduct(null);
        }}
        defaultProduct={movementTargetProduct}
      />

    </div>
  );
};
