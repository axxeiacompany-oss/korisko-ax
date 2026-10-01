import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBakery } from '../../context/BakeryContext';
import { supabase } from '../../lib/supabase';
import { Product, StoreCartItem, StoreCategory, CustomerAddress, Order } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { 
  ShoppingBag, 
  Search, 
  Sparkles, 
  Check, 
  Plus, 
  Minus, 
  Trash2, 
  X, 
  ArrowRight, 
  MapPin, 
  Phone, 
  User, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ShieldCheck,
  Star,
  Layers,
  ChevronRight,
  Store
} from 'lucide-react';
import { LanguageSwitcher } from '../LanguageSwitcher';

interface Props {
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onNavigateAccount?: () => void;
}

export const StoreView: React.FC<Props> = ({ onOpenAuth, onNavigateAccount }) => {
  const { user, profile, isAuthenticated, role } = useAuth();
  const { products, language, t, completeSale } = useBakery();

  // Search & Categories
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');

  // Cart
  const [cart, setCart] = useState<StoreCartItem[]>(() => {
    try {
      const saved = localStorage.getItem('KORISKO_STORE_CART');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Checkout Form
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('Ciudad del Este');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao_credito' | 'dinheiro_entrega'>('dinheiro_entrega');
  const [notes, setNotes] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // Auto-fill checkout fields if user is authenticated
  useEffect(() => {
    if (profile) {
      if (profile.fullName) setCustomerName(profile.fullName);
      if (profile.email) setCustomerEmail(profile.email);
      if (profile.phone) setCustomerPhone(profile.phone);
    } else if (user) {
      if (user.email) setCustomerEmail(user.email);
    }
  }, [profile, user]);

  // Persist cart
  useEffect(() => {
    try {
      localStorage.setItem('KORISKO_STORE_CART', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  // Active public products (filter out ingredients if non-search)
  const activeProducts = useMemo(() => {
    return (products || []).filter(p => p.active !== false && !p.isIngredient);
  }, [products]);

  // Categories list
  const categories = useMemo(() => {
    const list = [
      { id: 'todos', label: 'Todos os Produtos' },
      { id: 'paes', label: 'Pães Artesanais' },
      { id: 'confeitaria', label: 'Confeitaria & Doces' },
      { id: 'salgados', label: 'Salgados & Lanches' },
      { id: 'bebidas', label: 'Bebidas & Cafés' },
      { id: 'frios', label: 'Frios & Queijos' },
    ];
    return list;
  }, []);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return activeProducts.filter(p => {
      const matchCat = selectedCategory === 'todos' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [activeProducts, selectedCategory, searchQuery]);

  // Add to cart
  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existingIdx = prev.findIndex(item => item.product.id === product.id);
      if (existingIdx >= 0) {
        const copy = [...prev];
        const updatedQty = copy[existingIdx].quantity + 1;
        copy[existingIdx] = {
          ...copy[existingIdx],
          quantity: updatedQty,
          subtotal: Math.round(updatedQty * product.priceBrl),
        };
        return copy;
      }
      return [...prev, {
        product,
        quantity: 1,
        unitPrice: product.priceBrl,
        subtotal: product.priceBrl,
      }];
    });
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id !== productId) return item;
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null as any;
        return {
          ...item,
          quantity: newQty,
          subtotal: Math.round(newQty * item.unitPrice),
        };
      }).filter(Boolean);
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const totalCartCount = useMemo(() => {
    return cart.reduce((acc, it) => acc + it.quantity, 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, it) => acc + it.subtotal, 0);
  }, [cart]);

  const shippingFee = cartSubtotal > 150000 ? 0 : (cart.length > 0 ? 15000 : 0);
  const cartTotal = cartSubtotal + shippingFee;

  // Track affiliate click if present in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      const cleanRef = refCode.trim().toUpperCase();
      sessionStorage.setItem('KORISKO_AFFILIATE_REF', cleanRef);
      localStorage.setItem('KORISKO_AFFILIATE_REF', cleanRef);

      // Increment click count quietly in Supabase
      supabase
        .from('affiliates')
        .select('id, clicks_count')
        .eq('affiliate_code', cleanRef)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            supabase
              .from('affiliates')
              .update({ clicks_count: (data.clicks_count || 0) + 1 })
              .eq('id', data.id)
              .then(() => {});
          }
        });
    }
  }, []);

  // Handle Checkout submission
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setIsSubmittingOrder(true);
    try {
      const affiliateCode = localStorage.getItem('KORISKO_AFFILIATE_REF') || sessionStorage.getItem('KORISKO_AFFILIATE_REF');
      let resolvedAffiliateId: string | null = null;

      if (affiliateCode) {
        const { data: aff } = await supabase
          .from('affiliates')
          .select('id')
          .eq('affiliate_code', affiliateCode)
          .maybeSingle();
        if (aff) {
          resolvedAffiliateId = aff.id;
        }
      }

      const shippingAddress: CustomerAddress = {
        id: `addr-${Date.now()}`,
        recipientName: customerName.trim(),
        street: street.trim(),
        number: number.trim(),
        complement: complement.trim() || undefined,
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: 'Alto Paraná',
        country: 'Paraguai',
        postalCode: '7000',
        isDefault: true,
      };

      const orderPayload = {
        user_id: user?.id || null,
        affiliate_id: resolvedAffiliateId,
        status: 'confirmed',
        subtotal: cartSubtotal,
        discount: 0,
        shipping_fee: shippingFee,
        total: cartTotal,
        shipping_address: shippingAddress,
        notes: notes.trim() || null,
      };

      let orderId = `ord-${Date.now()}`;
      let orderNumber = `PED-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Integrar pedido diretamente ao sistema de vendas (PDV / Caixa / Live Sales)
      try {
        const saleItems = cart.map(it => ({
          product: it.product,
          quantity: it.quantity,
          unitPriceBrl: it.unitPrice,
          subtotalBrl: it.subtotal,
          discountBrl: 0,
          totalBrl: it.subtotal,
        }));

        const paymentMap: Record<string, 'dinheiro' | 'cartao_credito' | 'pix'> = {
          pix: 'pix',
          cartao_credito: 'cartao_credito',
          dinheiro_entrega: 'dinheiro',
        };

        await completeSale(
          saleItems,
          [{
            id: `pay-${Date.now()}`,
            currency: 'PYG',
            amountReceived: cartTotal,
            exchangeRateUsed: 1,
            equivalentBrl: cartTotal,
            method: paymentMap[paymentMethod] || 'dinheiro',
          }],
          undefined,
          customerName.trim() || profile?.fullName || 'Cliente Loja Online',
          undefined,
          0,
          cartSubtotal,
          user?.id
        );
      } catch (saleErr) {
        console.warn('[StoreView] Aviso ao registrar venda local:', saleErr);
      }

      // 2. Tentar salvar nas tabelas remotas do Supabase (orders, order_items, payments)
      try {
        const { data: orderData, error: orderErr } = await supabase
          .from('orders')
          .insert(orderPayload)
          .select()
          .single();

        if (!orderErr && orderData) {
          orderId = orderData.id;
          orderNumber = orderData.order_number || `PED-${orderData.id.slice(0, 6)}`;

          const itemsPayload = cart.map(it => ({
            order_id: orderData.id,
            product_id: it.product.id,
            product_name: it.product.name,
            sku: it.product.code || 'PRD',
            quantity: it.quantity,
            unit_price: it.unitPrice,
            total: it.subtotal,
          }));

          try {
            await supabase.from('order_items').insert(itemsPayload);
          } catch {}

          try {
            await supabase.from('payments').insert({
              order_id: orderData.id,
              method: paymentMethod,
              status: paymentMethod === 'dinheiro_entrega' ? 'pending' : 'approved',
              amount: cartTotal,
              paid_at: paymentMethod !== 'dinheiro_entrega' ? new Date().toISOString() : null,
            });
          } catch {}
        }
      } catch (dbErr) {
        console.warn('[StoreView] Supabase orders sync notice:', dbErr);
      }

      // 3. Salvar pedido no histórico do cliente no localStorage para acesso offline imediato
      const completedOrderObj: Order = {
        id: orderId,
        orderNumber,
        customerId: user?.id,
        userId: user?.id,
        affiliateId: resolvedAffiliateId || undefined,
        status: 'confirmed',
        subtotal: cartSubtotal,
        discount: 0,
        shippingFee,
        total: cartTotal,
        shippingAddress,
        notes: notes.trim() || undefined,
        items: cart.map(c => ({
          id: `item-${c.product.id}-${Date.now()}`,
          orderId,
          productId: c.product.id,
          productName: c.product.name,
          sku: c.product.code || 'PRD',
          quantity: c.quantity,
          unitPrice: c.unitPrice,
          total: c.subtotal,
          createdAt: new Date().toISOString(),
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        const storageKey = `KORISKO_CUSTOMER_ORDERS_${user?.id || 'guest'}`;
        const existingList = JSON.parse(localStorage.getItem(storageKey) || '[]');
        localStorage.setItem(storageKey, JSON.stringify([completedOrderObj, ...existingList]));
      } catch {}

      // Limpar carrinho e fechar checkout
      setCart([]);
      try {
        localStorage.removeItem('KORISKO_STORE_CART');
      } catch {}
      setIsCheckoutOpen(false);
      setIsCartOpen(false);

      setCompletedOrder(completedOrderObj);
    } catch (err: any) {
      console.warn('[StoreView] Exceção no checkout:', err);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080B11] text-neutral-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full bg-[#0B0F17]/95 backdrop-blur-md border-b border-[#1A2234] px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-indigo-600 p-[1.5px] shadow-lg shadow-amber-500/10 shrink-0">
              <div className="w-full h-full bg-[#0B0F17] rounded-[10px] flex items-center justify-center">
                <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-amber-200 text-base">
                  K
                </span>
              </div>
            </div>
            <div>
              <span className="font-black text-base tracking-tight text-white block leading-tight">
                {t.appName}
              </span>
              <span className="text-[10px] text-amber-400 font-medium tracking-wide">
                Padaria & Loja Online
              </span>
            </div>
          </div>

          {/* Search bar (desktop) */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar pães, tortas, salgados, cafés..."
                className="w-full pl-9 pr-4 py-2 bg-[#0E1422] border border-[#1E293E] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/60 transition-all font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            
            {/* User / Login Button */}
            {isAuthenticated ? (
              <button
                type="button"
                onClick={onNavigateAccount}
                className="px-3 py-2 rounded-xl bg-[#141B2B] hover:bg-[#1E283F] border border-[#232F47] text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
                  {profile?.fullName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </div>
                <span className="hidden sm:inline max-w-[120px] truncate">
                  {profile?.fullName || (role === 'customer' ? 'Minha Conta' : 'Painel')}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="px-3.5 py-2 rounded-xl bg-[#121826] hover:bg-[#1C263B] border border-[#222E45] text-neutral-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'es' ? 'Entrar / Registrarse' : 'Entrar / Criar Conta'}</span>
              </button>
            )}

            {/* Cart Button */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline font-mono-nums font-bold">
                {formatCurrency(cartSubtotal, 'PYG')}
              </span>
              {totalCartCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-neutral-950 text-amber-400 text-[10px] font-black flex items-center justify-center font-mono">
                  {totalCartCount}
                </span>
              )}
            </button>

            <LanguageSwitcher />

          </div>

        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        
        {/* Hero Section */}
        <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-r from-[#111624] via-[#0E1422] to-[#161B2E] border border-[#1E293E] shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl text-center md:text-left z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 border border-amber-500/30 text-amber-300">
              <Sparkles className="w-3.5 h-3.5 fill-current" /> Pães Quentes & Produtos Artesanais
            </span>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Sabor Tradicional & Entrega Rápida
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
              Faça seu pedido online e receba pães fresquinhos, bolos caseiros, salgados gourmet e lanches direto na sua mesa.
            </p>
          </div>

          <div className="flex items-center gap-3 z-10">
            <div className="p-4 rounded-2xl bg-[#080B12]/80 border border-[#1E283E] text-center space-y-1">
              <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono-nums">🇵🇾 ₲</span>
              <span className="text-[10px] text-neutral-400 block uppercase font-bold">Guaraní Oficial</span>
            </div>
            <div className="p-4 rounded-2xl bg-[#080B12]/80 border border-[#1E283E] text-center space-y-1">
              <Clock className="w-5 h-5 text-emerald-400 mx-auto" />
              <span className="text-[10px] text-neutral-400 block uppercase font-bold">Pronta Entrega</span>
            </div>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar produtos..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#0E1422] border border-[#1E293E] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/60 font-sans"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`py-2 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                    : 'bg-[#0E1320] border border-[#1E273A] text-neutral-400 hover:text-white hover:border-neutral-600'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Product Catalog Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredProducts.map((p) => {
            const inCart = cart.find(it => it.product.id === p.id);
            const inCartQty = inCart?.quantity || 0;

            return (
              <div
                key={p.id}
                className="p-3 sm:p-4 rounded-2xl bg-[#0D121D] border border-[#1E273A] hover:border-amber-500/50 hover:shadow-xl hover:shadow-black/40 transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  {/* Product Image Banner */}
                  {p.imageUrl ? (
                    <div className="relative w-full aspect-square sm:aspect-[4/3] rounded-xl overflow-hidden bg-neutral-950 mb-3 border border-neutral-800/80">
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      {p.featured && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-500 text-neutral-950 shadow-md">
                          Destaque
                        </span>
                      )}
                    </div>
                  ) : null}

                  {/* Category & Code Tag */}
                  <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono mb-2">
                    <span className="uppercase">{p.category}</span>
                    <span>{p.code}</span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xs sm:text-sm font-bold text-neutral-200 group-hover:text-amber-400 transition-colors line-clamp-2 leading-snug">
                    {p.name}
                  </h3>

                  {p.description && (
                    <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2">
                      {p.description}
                    </p>
                  )}
                </div>

                {/* Price & Action */}
                <div className="mt-4 pt-3 border-t border-[#192234] flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-neutral-500 block leading-none">Preço</span>
                    <span className="text-sm sm:text-base font-black text-amber-400 font-mono-nums">
                      {formatCurrency(p.priceBrl, 'PYG')}
                    </span>
                  </div>

                  {inCartQty > 0 ? (
                    <div className="flex items-center gap-1.5 bg-[#141B2B] border border-[#232F47] rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(p.id, -1)}
                        className="w-6 h-6 rounded-lg bg-[#1B2438] text-white flex items-center justify-center hover:bg-neutral-700 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-white font-mono px-1">
                        {inCartQty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(p.id, 1)}
                        className="w-6 h-6 rounded-lg bg-amber-500 text-neutral-950 flex items-center justify-center hover:bg-amber-400 font-bold cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAddToCart(p)}
                      className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Comprar</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>

      </main>

      {/* Cart Drawer Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0D121D] border-l border-[#1F273A] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[#1A2234] flex items-center justify-between bg-[#0A0E17]">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-white">Meu Carrinho ({totalCartCount})</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="p-1 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center text-neutral-500 space-y-2">
                  <ShoppingBag className="w-10 h-10 opacity-30" />
                  <p className="text-xs">Seu carrinho está vazio.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="p-3 rounded-xl bg-[#090D15] border border-[#1A2234] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white truncate">{item.product.name}</h4>
                      <span className="text-amber-400 font-mono-nums block text-[11px]">
                        {formatCurrency(item.unitPrice, 'PYG')} / {item.product.unit}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 bg-[#141B2B] rounded-lg p-0.5 border border-[#1F2A3F]">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.product.id, -1)}
                          className="w-5 h-5 rounded flex items-center justify-center text-neutral-300 hover:text-white"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-mono font-bold text-white px-1.5">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.product.id, 1)}
                          className="w-5 h-5 rounded flex items-center justify-center text-neutral-300 hover:text-white"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(item.product.id)}
                        className="p-1 text-neutral-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Checkout Action */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-[#1A2234] bg-[#0A0E17] space-y-3">
                <div className="space-y-1.5 text-xs font-mono-nums">
                  <div className="flex justify-between text-neutral-400">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(cartSubtotal, 'PYG')}</span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Taxa de Entrega:</span>
                    <span>{shippingFee === 0 ? 'Grátis' : formatCurrency(shippingFee, 'PYG')}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-amber-400 pt-1 border-t border-[#1F273A]">
                    <span>Total a Pagar:</span>
                    <span>{formatCurrency(cartTotal, 'PYG')}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(true)}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98 transition-all cursor-pointer"
                >
                  <span>Finalizar Compra</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-[#0D121D] border border-[#1F273A] rounded-2xl shadow-2xl p-6 space-y-4 my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-[#1A2234] pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">Dados de Entrega & Pagamento</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              
              {/* Cliente */}
              <div className="space-y-2">
                <span className="font-bold text-neutral-300 uppercase tracking-wider text-[10px] block">
                  Identificação do Comprador
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-neutral-400 block mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nome de quem recebe"
                      className="w-full px-3 py-2 bg-[#090D15] border border-[#1E273A] rounded-xl text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-400 block mb-1">WhatsApp / Telefone *</label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+595 981 123456"
                      className="w-full px-3 py-2 bg-[#090D15] border border-[#1E273A] rounded-xl text-white focus:outline-none focus:border-amber-500 font-mono-nums"
                    />
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-2">
                <span className="font-bold text-neutral-300 uppercase tracking-wider text-[10px] block">
                  Endereço para Recebimento
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-neutral-400 block mb-1">Rua / Logradouro *</label>
                    <input
                      type="text"
                      required
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Ex: Av. Adrián Jara"
                      className="w-full px-3 py-2 bg-[#090D15] border border-[#1E273A] rounded-xl text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-400 block mb-1">Número *</label>
                    <input
                      type="text"
                      required
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="123"
                      className="w-full px-3 py-2 bg-[#090D15] border border-[#1E273A] rounded-xl text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-neutral-400 block mb-1">Bairro *</label>
                    <input
                      type="text"
                      required
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Ex: Centro"
                      className="w-full px-3 py-2 bg-[#090D15] border border-[#1E273A] rounded-xl text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-400 block mb-1">Cidade</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 bg-[#090D15] border border-[#1E273A] rounded-xl text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Forma de Pagamento */}
              <div className="space-y-2">
                <span className="font-bold text-neutral-300 uppercase tracking-wider text-[10px] block">
                  Forma de Pagamento
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'dinheiro_entrega', label: 'Dinheiro na Entrega' },
                    { id: 'pix', label: 'Pix / QR Code' },
                    { id: 'cartao_credito', label: 'Cartão de Crédito' },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`p-2.5 rounded-xl border text-center font-semibold transition-all cursor-pointer ${
                        paymentMethod === m.id
                          ? 'border-amber-500 bg-amber-500/15 text-white'
                          : 'border-[#1E273A] bg-[#090D15] text-neutral-400 hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total & Submit */}
              <div className="pt-2 border-t border-[#1A2234] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-neutral-400 block">Total do Pedido</span>
                  <span className="text-lg font-black text-amber-400 font-mono-nums">
                    {formatCurrency(cartTotal, 'PYG')}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCheckoutOpen(false)}
                    className="py-2.5 px-4 rounded-xl border border-[#1E273A] text-neutral-300 hover:text-white"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingOrder}
                    className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingOrder ? 'Gravando Pedido...' : 'Confirmar Pedido'}
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Modal de Pedido Concluído com Sucesso */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0D121D] border border-emerald-500/30 rounded-2xl p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">Pedido Realizado com Sucesso!</h3>
              <p className="text-xs text-neutral-400">
                O seu pedido foi recebido pela nossa equipe de produção e está sendo preparado.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#090D15] border border-[#1A2234] text-xs font-mono space-y-1">
              <p className="text-neutral-400">Número do Pedido:</p>
              <p className="text-base font-bold text-amber-400">{completedOrder.orderNumber}</p>
              <p className="text-neutral-300 font-mono-nums pt-1">
                Total: {formatCurrency(completedOrder.total, 'PYG')}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setCompletedOrder(null);
                if (onNavigateAccount) onNavigateAccount();
              }}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition-colors cursor-pointer"
            >
              Acompanhar em Minha Conta
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
