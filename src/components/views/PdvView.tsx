import React, { useState, useMemo } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { Product, ProductCategory, CartItem, Sale, Comanda } from '../../types';
import { formatCurrency, fromBrl } from '../../utils/currency';
import { 
  Search, 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight, 
  CreditCard, 
  Scale, 
  X,
  UtensilsCrossed,
  Flame,
  Tag,
  Bookmark,
  Zap
} from 'lucide-react';
import { PaymentModal } from '../modals/PaymentModal';
import { ReceiptModal } from '../modals/ReceiptModal';
import { FornadaModal } from '../modals/FornadaModal';
import { ComandasModal } from '../modals/ComandasModal';
import { DirectSaleModal } from '../modals/DirectSaleModal';

export const PdvView: React.FC = () => {
  const { products, exchangeRates, openComandas, t, language } = useBakery();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Modals state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);
  const [isComandasOpen, setIsComandasOpen] = useState(false);
  const [isFornadaOpen, setIsFornadaOpen] = useState(false);
  const [isDirectSaleOpen, setIsDirectSaleOpen] = useState(false);

  // Active comanda linked to current cart
  const [activeComandaNumber, setActiveComandaNumber] = useState<string | null>(null);
  const [activeCustomerName, setActiveCustomerName] = useState<string>('');

  // Weight entry modal state (for items sold by kg)
  const [weightProduct, setWeightProduct] = useState<Product | null>(null);
  const [customWeightInput, setCustomWeightInput] = useState('0.500');

  const categories: Array<{ id: string; label: string }> = [
    { id: 'todos', label: language === 'es' ? 'Todos los Productos' : 'Todos os Itens' },
    { id: 'paes', label: language === 'es' ? 'Panes Frescos' : 'Pães Frescos' },
    { id: 'salgados', label: language === 'es' ? 'Salados & Bocadillos' : 'Salgados & Lanches' },
    { id: 'confeitaria', label: language === 'es' ? 'Confitería & Tortas' : 'Confeitaria & Bolos' },
    { id: 'bebidas', label: language === 'es' ? 'Cafetería & Bebidas' : 'Cafeteria & Bebidas' },
    { id: 'frios', label: language === 'es' ? 'Fiambrería & Quesos' : 'Frios & Queijos' },
  ];

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Don't show pure internal ingredients in POS unless searched
      if (p.isIngredient && !searchQuery.trim()) return false;

      const matchesCat = selectedCategory === 'todos' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);

      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart total calculations
  const cartTotalBrl = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.subtotalBrl, 0);
  }, [cart]);

  const cartTotalPyg = fromBrl(cartTotalBrl, 'PYG', exchangeRates);
  const cartTotalUsd = fromBrl(cartTotalBrl, 'USD', exchangeRates);

  // Add product to cart
  const handleAddToCart = (product: Product, quantity = 1) => {
    if (product.unit === 'kg' && quantity === 1) {
      // Prompt quick weight modal
      setWeightProduct(product);
      setCustomWeightInput('0.500');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        const newQty = Math.round((existing.quantity + quantity) * 1000) / 1000;
        const subtotal = Math.round(newQty * product.priceBrl * 100) / 100;
        return prev.map(it => it.product.id === product.id ? { ...it, quantity: newQty, subtotalBrl: subtotal } : it);
      } else {
        const subtotal = Math.round(quantity * product.priceBrl * 100) / 100;
        return [...prev, {
          product,
          quantity,
          unitPriceBrl: product.priceBrl,
          subtotalBrl: subtotal,
        }];
      }
    });
  };

  const handleConfirmWeight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightProduct) return;
    const qty = parseFloat(customWeightInput);
    if (!qty || qty <= 0) return;

    setCart(prev => {
      const existing = prev.find(item => item.product.id === weightProduct.id);
      if (existing) {
        const newQty = Math.round((existing.quantity + qty) * 1000) / 1000;
        const subtotal = Math.round(newQty * weightProduct.priceBrl * 100) / 100;
        return prev.map(it => it.product.id === weightProduct.id ? { ...it, quantity: newQty, subtotalBrl: subtotal } : it);
      } else {
        const subtotal = Math.round(qty * weightProduct.priceBrl * 100) / 100;
        return [...prev, {
          product: weightProduct,
          quantity: qty,
          unitPriceBrl: weightProduct.priceBrl,
          subtotalBrl: subtotal,
        }];
      }
    });

    setWeightProduct(null);
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const step = item.product.unit === 'kg' ? 0.1 : 1;
          const newQty = Math.max(0, Math.round((item.quantity + delta * step) * 1000) / 1000);
          const subtotal = Math.round(newQty * item.unitPriceBrl * 100) / 100;
          return { ...item, quantity: newQty, subtotalBrl: subtotal };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
    setActiveComandaNumber(null);
    setActiveCustomerName('');
  };

  const handleSaleSuccess = (sale: Sale) => {
    setCart([]);
    setActiveComandaNumber(null);
    setActiveCustomerName('');
    setIsPaymentOpen(false);
    setLastCompletedSale(sale);
  };

  const handleLoadComanda = (comanda: Comanda) => {
    setCart(comanda.items);
    setActiveComandaNumber(comanda.number);
    setActiveCustomerName(comanda.customerName || '');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[640px]">
      
      {/* Left Column: Catalog & Quick Selection (8 cols) */}
      <div className="lg:col-span-8 flex flex-col h-full space-y-4">
        
        {/* Top Controls: Search & Category pills & Bakery Quick Actions */}
        <div className="space-y-3">
          
          {/* Search bar + Quick Bakery Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'es' ? 'Buscar por nombre, código SKU o código de barras...' : 'Buscar por nome, código SKU ou código de barras...'}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-neutral-500 hover:text-neutral-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Action: Comandas & Mesas */}
            <button
              type="button"
              onClick={() => setIsComandasOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 hover:bg-neutral-850 text-xs text-neutral-200 font-semibold flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer"
            >
              <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.tabCrm ? (language === 'es' ? 'Comandas' : 'Comandas') : 'Comandas'}</span>
              {openComandas.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono-nums font-bold">
                  {openComandas.length}
                </span>
              )}
            </button>

            {/* Quick Action: Venda Direta Rápida (Apenas Valor & Confirme) */}
            <button
              type="button"
              onClick={() => setIsDirectSaleOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 hover:bg-emerald-500/25 text-xs text-emerald-300 font-semibold flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-sm"
              title={t.directSaleSubtitle}
            >
              <Zap className="w-3.5 h-3.5 fill-current text-emerald-400" />
              <span>{language === 'es' ? 'Venta Directa ⚡' : 'Venda Direta ⚡'}</span>
            </button>

            {/* Quick Action: Nova Fornada de Pão */}
            <button
              type="button"
              onClick={() => setIsFornadaOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-xs text-amber-300 font-semibold flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'es' ? 'Nueva Horneada 🔥' : 'Nova Fornada 🔥'}</span>
            </button>
          </div>

          {/* Interactive filter tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-amber-500 text-neutral-950 font-semibold shadow-sm'
                      : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map((p) => {
              const isLow = p.stock <= p.minStock;
              const isOutOfStock = p.stock <= 0;

              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => handleAddToCart(p)}
                  className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all group ${
                    isOutOfStock
                      ? 'border-neutral-800/40 bg-neutral-950/40 opacity-40 cursor-not-allowed'
                      : 'border-neutral-800 bg-neutral-900 hover:border-amber-500/50 hover:bg-neutral-850 hover:shadow-lg hover:shadow-black/20'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 text-[10px] text-neutral-500 font-mono-nums mb-1">
                      <span>{p.code}</span>
                      <span className={isLow ? 'text-rose-400 font-semibold' : 'text-neutral-400'}>
                        {p.stock} {p.unit}
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-neutral-200 group-hover:text-amber-400 transition-colors line-clamp-2">
                      {p.name}
                    </h4>
                  </div>

                  <div className="mt-3 pt-2 border-t border-neutral-800/80">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-bold text-neutral-100 font-mono-nums">
                        {formatCurrency(p.priceBrl, 'BRL')}
                        <span className="text-[10px] font-normal text-neutral-500 ml-0.5">/{p.unit}</span>
                      </span>
                    </div>

                    {/* Dual currency preview for foreign customers */}
                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-mono-nums mt-0.5">
                      <span>₲ {fromBrl(p.priceBrl, 'PYG', exchangeRates).toLocaleString('es-PY')}</span>
                      <span aria-hidden="true">·</span>
                      <span>$ {fromBrl(p.priceBrl, 'USD', exchangeRates).toFixed(2)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-neutral-500 space-y-2">
              <ShoppingBag className="w-8 h-8 opacity-40" />
              <p className="text-xs">Nenhum produto encontrado nesta categoria ou pesquisa.</p>
            </div>
          )}
        </div>

      </div>

      {/* Right Column: Active Order Cart & Fast Multi-Currency Checkout (4 cols) */}
      <div className="lg:col-span-4 flex flex-col h-full bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        
        {/* Cart Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-semibold text-neutral-100 uppercase tracking-wider">
              {activeComandaNumber ? `Comanda #${activeComandaNumber}` : (language === 'es' ? 'Carrito de Venta' : 'Carrinho de Venda')} ({cart.length})
            </h3>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={handleClearCart}
              className="text-[11px] text-neutral-500 hover:text-rose-400 transition-colors cursor-pointer"
            >
              {language === 'es' ? 'Vaciar todo' : 'Limpar tudo'}
            </button>
          )}
        </div>

        {/* Active Comanda Notice Banner */}
        {activeComandaNumber && (
          <div className="px-5 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-amber-300 font-medium">
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {language === 'es' ? 'Vinculada a la' : 'Vinculada à'} <strong>Comanda #{activeComandaNumber}</strong>
                {activeCustomerName ? ` (${activeCustomerName})` : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={() => { setActiveComandaNumber(null); setActiveCustomerName(''); }}
              className="text-[11px] text-neutral-400 hover:text-neutral-200 underline cursor-pointer"
            >
              {language === 'es' ? 'Desvincular' : 'Desvincular'}
            </button>
          </div>
        )}

        {/* Cart items list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-500 space-y-2 text-center p-4">
              <ShoppingBag className="w-10 h-10 opacity-30 stroke-[1.5]" />
              <p className="text-xs text-neutral-400 font-medium">
                {language === 'es' ? 'El carrito está vacío' : 'O carrinho está vazio'}
              </p>
              <p className="text-[11px] text-neutral-600">
                {language === 'es' ? 'Seleccione los productos al lado para iniciar la venta en mostrador.' : 'Selecione os produtos ao lado para iniciar a venda no balcão.'}
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/90 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-semibold text-neutral-200 truncate">
                      {item.product.name}
                    </h5>
                    <span className="text-[11px] text-neutral-400 font-mono-nums">
                      {formatCurrency(item.unitPriceBrl, 'BRL')} / {item.product.unit}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFromCart(item.product.id)}
                    className="text-neutral-500 hover:text-rose-400 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-neutral-855">
                  {/* Quantity controls */}
                  <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(item.product.id, -1)}
                      className="w-5 h-5 rounded flex items-center justify-center text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-mono-nums font-bold px-1.5 text-neutral-200 min-w-[28px] text-center">
                      {item.quantity} {item.product.unit}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(item.product.id, 1)}
                      className="w-5 h-5 rounded flex items-center justify-center text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Subtotal */}
                  <div className="text-right">
                    <span className="text-xs font-bold text-neutral-100 font-mono-nums">
                      {formatCurrency(item.subtotalBrl, 'BRL')}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Bottom Summary & Checkout Button */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/80 space-y-3">
          
          {/* Multi-currency breakdown preview */}
          <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-neutral-400">
                {language === 'es' ? 'Total a Cobrar (BRL)' : 'Total a Pagar (BRL)'}
              </span>
              <span className="text-lg font-bold text-neutral-100 font-mono-nums">
                {formatCurrency(cartTotalBrl, 'BRL')}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono-nums pt-1 border-t border-neutral-800">
              <span>🇵🇾 PYG: <strong className="text-amber-400">{formatCurrency(cartTotalPyg, 'PYG')}</strong></span>
              <span>🇺🇸 USD: <strong className="text-emerald-400">{formatCurrency(cartTotalUsd, 'USD')}</strong></span>
            </div>
          </div>

          {/* Checkout & Comanda action buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => setIsComandasOpen(true)}
              className="py-3 px-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/40 disabled:opacity-40 text-neutral-300 hover:text-neutral-100 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              title={language === 'es' ? 'Guardar comanda para mesa o salón' : 'Salvar comanda para mesa ou balcão'}
            >
              <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'es' ? 'Comanda' : 'Comanda'}</span>
            </button>
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => setIsPaymentOpen(true)}
              className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-neutral-950 font-bold text-xs shadow-lg shadow-amber-500/10 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <CreditCard className="w-4 h-4 stroke-[2.5]" />
              {language === 'es' ? 'Cobrar Venta (Multi-Moneda)' : 'Finalizar Venda (Multi-Moeda)'}
            </button>
          </div>

        </div>

      </div>

      {/* Quick Weight Modal for products sold by kg (e.g. pão francês, queijo, presunto) */}
      {weightProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-semibold text-neutral-100">
                  {language === 'es' ? 'Pesaje de Producto' : 'Pesagem de Produto'}
                </h4>
              </div>
              <button
                onClick={() => setWeightProduct(null)}
                className="text-neutral-500 hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-xs text-neutral-300 font-medium">{weightProduct.name}</p>
              <p className="text-[11px] text-neutral-500 font-mono-nums">
                {language === 'es' ? 'Precio:' : 'Preço:'} {formatCurrency(weightProduct.priceBrl, 'BRL')} / kg
              </p>
            </div>

            <form onSubmit={handleConfirmWeight} className="space-y-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">
                  {language === 'es' ? 'Peso en Kilogramos (kg)' : 'Peso em Quilogramas (kg)'}
                </label>
                <input
                  type="number"
                  step="0.005"
                  autoFocus
                  required
                  value={customWeightInput}
                  onChange={(e) => setCustomWeightInput(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-base font-mono-nums font-bold text-neutral-100 focus:outline-none focus:border-amber-500 text-center"
                />
              </div>

              {/* Quick weight buttons */}
              <div className="grid grid-cols-4 gap-1.5">
                {['0.100', '0.250', '0.500', '1.000'].map(w => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setCustomWeightInput(w)}
                    className="py-1 px-2 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] font-mono-nums text-neutral-300 cursor-pointer"
                  >
                    {parseFloat(w) * 1000}g
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-800 font-mono-nums">
                <span className="text-neutral-400">
                  {language === 'es' ? 'Subtotal estimado:' : 'Subtotal estimado:'}
                </span>
                <strong className="text-neutral-100 font-bold">
                  {formatCurrency((parseFloat(customWeightInput) || 0) * weightProduct.priceBrl, 'BRL')}
                </strong>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWeightProduct(null)}
                  className="flex-1 py-2 rounded-xl border border-neutral-800 text-xs text-neutral-400 hover:bg-neutral-800 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold cursor-pointer"
                >
                  {language === 'es' ? 'Agregar al Carrito' : 'Adicionar ao Carrinho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment checkout modal */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        cartItems={cart}
        onSaleCompleted={handleSaleSuccess}
        comandaNumber={activeComandaNumber || undefined}
        initialCustomerName={activeCustomerName || undefined}
      />

      {/* Receipt preview modal */}
      <ReceiptModal
        sale={lastCompletedSale}
        onClose={() => setLastCompletedSale(null)}
      />

      {/* Comandas modal */}
      <ComandasModal
        isOpen={isComandasOpen}
        onClose={() => setIsComandasOpen(false)}
        currentCartItems={cart}
        onLoadComanda={handleLoadComanda}
        onClearCart={handleClearCart}
      />

      {/* Fornada modal */}
      <FornadaModal
        isOpen={isFornadaOpen}
        onClose={() => setIsFornadaOpen(false)}
      />

      {/* Direct Sale modal */}
      <DirectSaleModal
        isOpen={isDirectSaleOpen}
        onClose={() => setIsDirectSaleOpen(false)}
      />

    </div>
  );
};
