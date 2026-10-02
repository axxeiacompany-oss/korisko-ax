import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBakery } from '../../context/BakeryContext';
import { supabase } from '../../lib/supabase';
import { Product, StoreCartItem, CustomerAddress, Order } from '../../types';
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
  Clock,
  ShieldCheck,
  Star,
  Store,
  Edit3,
  Eye,
  LayoutDashboard,
  ClipboardList,
  Award,
  ChefHat
} from 'lucide-react';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { KorizkoEmblem } from '../KorizkoLogo';
import { resolveSetoresFromItems, resolveProductImageUrl } from '../../lib/db';
import { TabType } from '../Header';

interface Props {
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onNavigateAccount?: () => void;
  embeddedInAdmin?: boolean;
  onNavigateAdmin?: (tab: TabType) => void;
  onOpenStandaloneStore?: () => void;
}

export const StoreView: React.FC<Props> = ({
  onOpenAuth,
  onNavigateAccount,
  embeddedInAdmin = false,
  onNavigateAdmin,
  onOpenStandaloneStore,
}) => {
  const { user, profile, isAuthenticated, role } = useAuth();
  const {
    products,
    language,
    t,
    completeSale,
    saveComanda,
    updateProduct,
    openComandas,
    currentUser,
    isFeatureAllowed,
    hasStorePermission,
    validateStoreAccess,
    showToast,
  } = useBakery();

  const isCollaboratorLogged = isAuthenticated && role !== 'customer';
  const canCollaboratorAccessStore = !isCollaboratorLogged || validateStoreAccess(currentUser);

  useEffect(() => {
    if (isCollaboratorLogged && !canCollaboratorAccessStore) {
      if (onNavigateAdmin) {
        onNavigateAdmin('dashboard');
      } else if (onNavigateAccount) {
        onNavigateAccount();
      }
    }
  }, [isCollaboratorLogged, canCollaboratorAccessStore, onNavigateAdmin, onNavigateAccount]);

  const isAdminOrManager =
    role === 'admin' ||
    currentUser?.role === 'admin' ||
    currentUser?.id === 'emp-admin-ax' ||
    (isCollaboratorLogged && canCollaboratorAccessStore);

  // Search & Categories
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');

  // Quick Admin Edit Product Modal inside Store
  const [editingStoreProduct, setEditingStoreProduct] = useState<Product | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');
  const [editDesc, setEditDesc] = useState<string>('');
  const [editFeatured, setEditFeatured] = useState<boolean>(false);

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

  // Active public products (filter out raw ingredients)
  const activeProducts = useMemo(() => {
    return (products || []).filter(p => p.active !== false && !p.isIngredient);
  }, [products]);

  // Store online orders / comandas count
  const storeComandasCount = useMemo(() => {
    return (openComandas || []).filter(c => c.source === 'loja_online').length;
  }, [openComandas]);

  // Categories list
  const categories = useMemo(() => {
    return [
      { id: 'todos', label: 'Todos os Produtos' },
      { id: 'paes', label: 'Pães Artesanais' },
      { id: 'confeitaria', label: 'Confeitaria & Doces' },
      { id: 'salgados', label: 'Salgados & Lanches' },
      { id: 'bebidas', label: 'Bebidas & Cafés' },
      { id: 'frios', label: 'Frios & Empório' },
    ];
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
      return [
        ...prev,
        {
          product,
          quantity: 1,
          unitPrice: product.priceBrl,
          subtotal: product.priceBrl,
        },
      ];
    });
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.product.id !== productId) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null as any;
          return {
            ...item,
            quantity: newQty,
            subtotal: Math.round(newQty * item.unitPrice),
          };
        })
        .filter(Boolean);
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

  const shippingFee = 0;
  const cartTotal = cartSubtotal;

  // Track affiliate click if present in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      const cleanRef = refCode.trim().toUpperCase();
      sessionStorage.setItem('KORISKO_AFFILIATE_REF', cleanRef);
      localStorage.setItem('KORISKO_AFFILIATE_REF', cleanRef);

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

  // Quick Save Product Edit by Admin
  const handleSaveProductEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStoreProduct) return;
    const parsedPrice = Math.max(0, parseFloat(editPrice.replace(',', '.')) || editingStoreProduct.priceBrl);
    await updateProduct({
      ...editingStoreProduct,
      priceBrl: parsedPrice,
      description: editDesc.trim() || undefined,
      featured: editFeatured,
    });
    showToast(`Produto "${editingStoreProduct.name}" atualizado na Loja!`, 'success');
    setEditingStoreProduct(null);
  };

  // Handle Checkout submission
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setIsSubmittingOrder(true);
    try {
      const affiliateCode =
        localStorage.getItem('KORISKO_AFFILIATE_REF') || sessionStorage.getItem('KORISKO_AFFILIATE_REF');
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
      const comandaNumber = `CMD-${orderNumber.replace('PED-', '')}`;

      const saleItems = cart.map(it => ({
        product: it.product,
        quantity: it.quantity,
        unitPriceBrl: it.unitPrice,
        subtotalBrl: it.subtotal,
        discountBrl: 0,
        totalBrl: it.subtotal,
      }));

      const sectorInfo = resolveSetoresFromItems(saleItems);

      // 1. Integrar pedido diretamente ao sistema de vendas (PDV / Caixa)
      try {
        const paymentMap: Record<string, 'dinheiro' | 'cartao_credito' | 'pix'> = {
          pix: 'pix',
          cartao_credito: 'cartao_credito',
          dinheiro_entrega: 'dinheiro',
        };

        await completeSale(
          saleItems,
          [
            {
              id: `pay-${Date.now()}`,
              currency: 'PYG',
              amountReceived: cartTotal,
              exchangeRateUsed: 1,
              equivalentBrl: cartTotal,
              method: paymentMap[paymentMethod] || 'dinheiro',
            },
          ],
          undefined,
          customerName.trim() || profile?.fullName || 'Cliente Loja Online',
          comandaNumber,
          0,
          cartSubtotal,
          user?.id
        );
      } catch (saleErr) {
        console.warn('[StoreView] Aviso ao registrar venda local:', saleErr);
      }

      // 1.5. Gerar Comanda Confirmada para o Setor Responsável e Administração (sem duplicar saldo devedor pois a venda já foi registrada acima)
      try {
        saveComanda(
          comandaNumber,
          saleItems,
          customerName.trim() || profile?.fullName || 'Cliente Loja Online',
          notes.trim()
            ? `${notes.trim()} • Endereço: ${street.trim()}, ${number.trim()} (${neighborhood.trim()})`
            : `Pedido Online ${orderNumber} • Entrega: ${street.trim()}, ${number.trim()} (${neighborhood.trim()})`,
          {
            customerId: user?.id,
            customerPhone: customerPhone.trim() || undefined,
            status: 'confirmado',
            setorResponsavel: sectorInfo.primary,
            confirmedByCustomer: true,
            source: 'loja_online',
            updateDebtorBalance: false,
          }
        );
      } catch (cmdErr) {
        console.warn('[StoreView] Aviso ao gerar comanda:', cmdErr);
      }

      // 2. Salvar nas tabelas remotas do Supabase
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

      // 3. Salvar pedido no histórico do cliente
      const completedOrderObj: Order = {
        id: orderId,
        orderNumber,
        comandaNumber,
        setorResponsavel: sectorInfo.label,
        confirmedByCustomer: true,
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

  // Block rendering of the store interface if the logged-in collaborator does not have explicit 'loja' permission
  if (isCollaboratorLogged && !canCollaboratorAccessStore) {
    return null;
  }

  return (
    <div
      className={`${
        embeddedInAdmin
          ? 'space-y-5 pb-24 lg:pb-6'
          : 'min-h-screen bg-[#07090E] text-neutral-100 flex flex-col selection:bg-[#C89B6E]/30 selection:text-[#F2D6B8]'
      }`}
    >
      {/* Top Navbar (only rendered when viewing as standalone public store) */}
      {!embeddedInAdmin && (
        <header className="sticky top-0 z-40 w-full bg-[#090C14]/95 backdrop-blur-xl border-b border-[#C89B6E]/20 px-3 sm:px-8 py-3 safe-area-pt">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            {/* Logo & Brand */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#06070A] border border-[#C89B6E]/50 flex items-center justify-center shadow-lg shadow-black/80 shrink-0">
                <KorizkoEmblem size={32} />
              </div>
              <div className="min-w-0">
                <span
                  className="font-semibold text-sm sm:text-base tracking-[0.2em] text-[#F2D6B8] uppercase block leading-tight truncate"
                  style={{ fontFamily: "'Cinzel', serif" }}
                >
                  {t.appName}
                </span>
                <span className="text-[10px] sm:text-[11px] text-[#C89B6E] font-medium tracking-wide block truncate">
                  Panificação confeitaria artesanal
                </span>
              </div>
            </div>

            {/* Search bar (desktop) */}
            <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-[#C89B6E]/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar pães artesanais, doces finos, cafés..."
                  className="w-full pl-10 pr-4 py-2 bg-[#0E131F] border border-[#C89B6E]/25 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#C89B6E] transition-all font-sans"
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
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* If Admin/Operator is logged in, show direct button to enter Management Panel */}
              {isAuthenticated && role !== 'customer' && onNavigateAccount && (
                <button
                  type="button"
                  onClick={onNavigateAccount}
                  className="px-3 py-2 rounded-xl bg-[#C89B6E]/15 hover:bg-[#C89B6E]/25 border border-[#C89B6E]/40 text-[#F2D6B8] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-[#C89B6E]" />
                  <span className="hidden sm:inline">Painel de Gestão</span>
                </button>
              )}

              {/* User / Login Button */}
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={onNavigateAccount}
                  className="px-3 py-2 rounded-xl bg-[#111726] hover:bg-[#192236] border border-[#C89B6E]/25 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#C89B6E] to-[#9A6F44] text-neutral-950 flex items-center justify-center font-black text-[10px]">
                    {profile?.fullName?.charAt(0) || user?.email?.charAt(0) || 'K'}
                  </div>
                  <span className="hidden sm:inline max-w-[110px] truncate">
                    {profile?.fullName || (role === 'customer' ? 'Minha Conta' : 'Meu Painel')}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="px-3 sm:px-3.5 py-2 rounded-xl bg-[#111726] hover:bg-[#192236] border border-[#C89B6E]/30 text-[#F2D6B8] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-[#C89B6E]" />
                  <span>{language === 'es' ? 'Entrar' : 'Entrar'}</span>
                </button>
              )}

              {/* Cart Button */}
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="relative px-3 py-2 rounded-xl bg-gradient-to-r from-[#C89B6E] to-[#DFB78C] hover:from-[#D8AB7E] hover:to-[#E8C59E] text-neutral-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-[#C89B6E]/20 active:scale-95 transition-all cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden sm:inline font-mono-nums font-black">
                  {formatCurrency(cartSubtotal, 'PYG')}
                </span>
                {totalCartCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-neutral-950 text-[#F2D6B8] text-[10px] font-black flex items-center justify-center font-mono">
                    {totalCartCount}
                  </span>
                )}
              </button>

              <LanguageSwitcher compact />
            </div>
          </div>
        </header>
      )}

      {/* Admin Control Header when embedded inside the Management Shell */}
      {embeddedInAdmin && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0C101A] via-[#101624] to-[#191410] border border-[#C89B6E]/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#C89B6E]/15 border border-[#C89B6E]/40 flex items-center justify-center text-[#F2D6B8] shrink-0">
              <Store className="w-5 h-5 text-[#C89B6E]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  className="text-base sm:text-lg font-bold text-[#F2D6B8] tracking-wide uppercase"
                  style={{ fontFamily: "'Cinzel', serif" }}
                >
                  Boutique & Loja Online Korizko
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  Acesso Autorizado
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Gerencie o catálogo de luxo, realize pedidos diretos pela vitrine e acompanhe as comandas da loja.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isFeatureAllowed('afiliados') && onNavigateAdmin && (
              <button
                type="button"
                onClick={() => onNavigateAdmin('afiliados')}
                className="px-3 py-2 rounded-xl bg-[#111726] hover:bg-[#192236] border border-[#C89B6E]/30 text-[#F2D6B8] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#C89B6E]" />
                <span>Permissões da Loja</span>
              </button>
            )}

            {isFeatureAllowed('estoque') && onNavigateAdmin && (
              <button
                type="button"
                onClick={() => onNavigateAdmin('estoque')}
                className="px-3 py-2 rounded-xl bg-[#111726] hover:bg-[#192236] border border-[#1E293E] text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ChefHat className="w-3.5 h-3.5 text-amber-400" />
                <span>Gerenciar Produtos ({activeProducts.length})</span>
              </button>
            )}

            {onOpenStandaloneStore && (
              <button
                type="button"
                onClick={onOpenStandaloneStore}
                className="px-3 py-2 rounded-xl bg-[#111726] hover:bg-[#192236] border border-[#1E293E] text-neutral-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-[#C89B6E]" />
                <span>Modo Vitrine Tela Cheia</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#C89B6E] to-[#DFB78C] text-neutral-950 font-black text-xs flex items-center gap-2 shadow-md cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Sacola ({totalCartCount})</span>
              <span className="font-mono-nums">{formatCurrency(cartSubtotal, 'PYG')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main
        className={`${
          embeddedInAdmin ? 'w-full space-y-5' : 'flex-1 max-w-7xl w-full mx-auto px-3 sm:px-8 py-4 sm:py-6 space-y-5 pb-28 sm:pb-12'
        }`}
      >

        {/* Category Navigation Bar - Responsive swipeable on mobile, centered pills on desktop */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          {categories.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`py-2.5 px-4 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#C89B6E] to-[#DFB78C] text-neutral-950 font-bold shadow-lg shadow-[#C89B6E]/20'
                    : 'bg-[#0C101A] border border-[#C89B6E]/20 text-neutral-300 hover:text-[#F2D6B8] hover:border-[#C89B6E]/50'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Product Catalog Grid - Adaptive for Mobile (2 cols), Tablet (3 cols), Desktop (4 cols) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {filteredProducts.map(p => {
            const inCart = cart.find(it => it.product.id === p.id);
            const inCartQty = inCart?.quantity || 0;
            const imgUrl = resolveProductImageUrl(p);

            return (
              <div
                key={p.id}
                className="p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-[#101624] to-[#0B0F19] border border-[#C89B6E]/20 hover:border-[#C89B6E]/60 hover:shadow-2xl hover:shadow-black/60 transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  {/* Product Image Banner */}
                  {imgUrl ? (
                    <div className="relative w-full aspect-square sm:aspect-[4/3] rounded-xl overflow-hidden bg-[#07090E] mb-3 border border-[#C89B6E]/20">
                      <img
                        src={imgUrl}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        onError={e => {
                          const target = e.target as HTMLImageElement;
                          if (!target.dataset.fallbackTried) {
                            target.dataset.fallbackTried = 'true';
                            if ((p.name || '').toLowerCase().includes('combo') || p.id === 'prod-combo-brownies') {
                              target.src = '/images/products/combo-brownies.jpg?v=2';
                              return;
                            }
                          }
                          target.style.display = 'none';
                        }}
                      />
                      {p.featured && (
                        <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#C89B6E] text-neutral-950 shadow-md">
                          Seleção do Chef
                        </span>
                      )}
                      {isAdminOrManager && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setEditingStoreProduct(p);
                            setEditPrice(String(p.priceBrl));
                            setEditDesc(p.description || '');
                            setEditFeatured(Boolean(p.featured));
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/75 hover:bg-[#C89B6E] text-[#F2D6B8] hover:text-neutral-950 border border-[#C89B6E]/40 transition-colors cursor-pointer"
                          title="Editar produto na Loja (Admin)"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="relative w-full aspect-[4/3] rounded-xl bg-gradient-to-br from-[#141A29] to-[#0B0E17] mb-3 border border-[#C89B6E]/15 flex flex-col items-center justify-center p-3 text-center">
                      <KorizkoEmblem size={36} />
                      <span className="text-[10px] text-[#C89B6E] uppercase tracking-widest mt-2 font-semibold">
                        Korizko Artesanal
                      </span>
                      {p.featured && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#C89B6E] text-neutral-950">
                          Destaque
                        </span>
                      )}
                      {isAdminOrManager && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setEditingStoreProduct(p);
                            setEditPrice(String(p.priceBrl));
                            setEditDesc(p.description || '');
                            setEditFeatured(Boolean(p.featured));
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/75 hover:bg-[#C89B6E] text-[#F2D6B8] hover:text-neutral-950 border border-[#C89B6E]/40 transition-colors cursor-pointer"
                          title="Editar produto na Loja (Admin)"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Category & Code Tag */}
                  <div className="flex items-center justify-between text-[10px] text-[#C89B6E]/80 font-mono mb-1.5">
                    <span className="uppercase tracking-wider">{p.category}</span>
                    <span>{p.unit.toUpperCase()}</span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xs sm:text-sm font-bold text-[#F5E6D3] group-hover:text-[#C89B6E] transition-colors line-clamp-2 leading-snug">
                    {p.name}
                  </h3>

                  {p.description && (
                    <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  )}
                </div>

                {/* Price & Action */}
                <div className="mt-4 pt-3 border-t border-[#C89B6E]/15 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 block leading-none">
                      Valor
                    </span>
                    <span className="text-sm sm:text-base font-black text-[#F2D6B8] font-mono-nums truncate block mt-0.5">
                      {formatCurrency(p.priceBrl, 'PYG')}
                    </span>
                  </div>

                  {inCartQty > 0 ? (
                    <div className="flex items-center gap-1 bg-[#141B2B] border border-[#C89B6E]/40 rounded-xl p-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(p.id, -1)}
                        className="w-6 h-6 rounded-lg bg-[#1B2438] text-white flex items-center justify-center hover:bg-neutral-700 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-[#F2D6B8] font-mono px-1.5">
                        {inCartQty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(p.id, 1)}
                        className="w-6 h-6 rounded-lg bg-[#C89B6E] text-neutral-950 flex items-center justify-center hover:bg-[#DFB78C] font-bold cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAddToCart(p)}
                      className="py-2 px-3 rounded-xl bg-gradient-to-r from-[#C89B6E] to-[#DFB78C] hover:from-[#D8AB7E] hover:to-[#E8C59E] text-neutral-950 font-bold text-xs flex items-center gap-1 shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Adicionar</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Mobile Floating Cart Bar for seamless smartphone experience */}
      {totalCartCount > 0 && !isCartOpen && !isCheckoutOpen && (
        <div className="fixed bottom-16 lg:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-40 animate-in slide-in-from-bottom-4">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-[#C89B6E] via-[#DFB78C] to-[#C89B6E] text-neutral-950 shadow-2xl shadow-black/80 flex items-center justify-between font-bold text-xs cursor-pointer active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-neutral-950 text-[#F2D6B8] font-mono font-black flex items-center justify-center text-xs">
                {totalCartCount}
              </span>
              <div className="text-left">
                <span className="block font-black text-neutral-950 leading-none">Ver Sacola de Compras</span>
                <span className="text-[10px] text-neutral-800 font-medium">Korizko Confeitaria & Panificação</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 font-mono-nums font-black text-sm">
              <span>{formatCurrency(cartSubtotal, 'PYG')}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Admin Quick Edit Product Modal */}
      {editingStoreProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0C101A] border border-[#C89B6E]/40 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1A2234] pb-3">
              <h3 className="text-sm font-bold text-[#F2D6B8] flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#C89B6E]" />
                <span>Editar Item na Loja: {editingStoreProduct.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingStoreProduct(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProductEdit} className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-300 font-semibold block mb-1">Preço de Venda (₲ PYG)</label>
                <input
                  type="number"
                  required
                  value={editPrice}
                  onChange={e => setEditPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080B12] border border-[#1E273A] rounded-xl text-white font-mono focus:outline-none focus:border-[#C89B6E]"
                />
              </div>

              <div>
                <label className="text-neutral-300 font-semibold block mb-1">Descrição Gourmet na Vitrine</label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  placeholder="Ex: Fermentação natural com manteiga francesa..."
                  className="w-full px-3 py-2 bg-[#080B12] border border-[#1E273A] rounded-xl text-white focus:outline-none focus:border-[#C89B6E]"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={editFeatured}
                  onChange={e => setEditFeatured(e.target.checked)}
                  className="rounded accent-[#C89B6E]"
                />
                <span className="text-neutral-200 font-medium">Destacar como "Seleção do Chef" na vitrine</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1A2234]">
                <button
                  type="button"
                  onClick={() => setEditingStoreProduct(null)}
                  className="px-4 py-2 rounded-xl border border-[#1E273A] text-neutral-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#C89B6E] hover:bg-[#DFB78C] text-neutral-950 font-bold cursor-pointer"
                >
                  Salvar na Vitrine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cart Drawer Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0B0F18] border-l border-[#C89B6E]/30 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[#C89B6E]/20 flex items-center justify-between bg-[#080B11]">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-5 h-5 text-[#C89B6E]" />
                <h3 className="font-bold text-sm text-[#F2D6B8]">Sacola de Compras ({totalCartCount})</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center text-neutral-500 space-y-2">
                  <ShoppingBag className="w-10 h-10 opacity-30 text-[#C89B6E]" />
                  <p className="text-xs">Sua sacola está vazia.</p>
                </div>
              ) : (
                cart.map(item => (
                  <div
                    key={item.product.id}
                    className="p-3.5 rounded-xl bg-[#0F1522] border border-[#C89B6E]/20 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-[#F5E6D3] truncate">{item.product.name}</h4>
                      <span className="text-[#C89B6E] font-mono-nums block text-[11px] mt-0.5">
                        {formatCurrency(item.unitPrice, 'PYG')} / {item.product.unit}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 bg-[#090D15] rounded-lg p-0.5 border border-[#C89B6E]/30">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.product.id, -1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-neutral-300 hover:text-white"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-mono font-bold text-white px-1.5">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.product.id, 1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-neutral-300 hover:text-white"
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
              <div className="p-4 sm:p-5 border-t border-[#C89B6E]/20 bg-[#080B11] space-y-3 safe-area-pb">
                <div className="space-y-1.5 text-xs font-mono-nums">
                  <div className="flex justify-between text-neutral-400">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(cartSubtotal, 'PYG')}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-[#F2D6B8] pt-1.5 border-t border-[#1F273A]">
                    <span>Total do Pedido:</span>
                    <span>{formatCurrency(cartTotal, 'PYG')}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(true)}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#C89B6E] to-[#DFB78C] hover:from-[#D8AB7E] hover:to-[#E8C59E] text-neutral-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#C89B6E]/20 active:scale-98 transition-all cursor-pointer"
                >
                  <span>Finalizar Pedido</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
          <div className="w-full sm:max-w-xl bg-[#0C101A] border-t sm:border border-[#C89B6E]/35 rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 my-auto max-h-[94vh] flex flex-col animate-in slide-in-from-bottom-5 sm:zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#1A2234] pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#C89B6E]" />
                <h3 className="font-bold text-base text-[#F2D6B8]">Dados de Entrega & Pagamento</h3>
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
                <span className="font-bold text-[#C89B6E] uppercase tracking-wider text-[10px] block">
                  Identificação do Cliente
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-neutral-400 block mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="Nome de quem recebe"
                      className="w-full px-3 py-2.5 bg-[#080B12] border border-[#1E273A] rounded-xl text-white focus:outline-none focus:border-[#C89B6E]"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-400 block mb-1">WhatsApp / Telefone *</label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="+595 981 123456"
                      className="w-full px-3 py-2.5 bg-[#080B12] border border-[#1E273A] rounded-xl text-white focus:outline-none focus:border-[#C89B6E] font-mono-nums"
                    />
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-2">
                <span className="font-bold text-[#C89B6E] uppercase tracking-wider text-[10px] block">
                  Endereço de Entrega
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-neutral-400 block mb-1">Rua / Avenida *</label>
                    <input
                      type="text"
                      required
                      value={street}
                      onChange={e => setStreet(e.target.value)}
                      placeholder="Ex: Av. Adrián Jara"
                      className="w-full px-3 py-2.5 bg-[#080B12] border border-[#1E273A] rounded-xl text-white focus:outline-none focus:border-[#C89B6E]"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-400 block mb-1">Número *</label>
                    <input
                      type="text"
                      required
                      value={number}
                      onChange={e => setNumber(e.target.value)}
                      placeholder="123"
                      className="w-full px-3 py-2.5 bg-[#080B12] border border-[#1E273A] rounded-xl text-white focus:outline-none focus:border-[#C89B6E]"
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
                      onChange={e => setNeighborhood(e.target.value)}
                      placeholder="Ex: Centro"
                      className="w-full px-3 py-2.5 bg-[#080B12] border border-[#1E273A] rounded-xl text-white focus:outline-none focus:border-[#C89B6E]"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-400 block mb-1">Cidade</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#080B12] border border-[#1E273A] rounded-xl text-white focus:outline-none focus:border-[#C89B6E]"
                    />
                  </div>
                </div>
              </div>

              {/* Forma de Pagamento */}
              <div className="space-y-2">
                <span className="font-bold text-[#C89B6E] uppercase tracking-wider text-[10px] block">
                  Forma de Pagamento
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'dinheiro_entrega', label: 'Efectivo / Entrega' },
                    { id: 'pix', label: 'PIX / QR Code' },
                    { id: 'cartao_credito', label: 'Cartão' },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`p-2.5 rounded-xl border text-center font-semibold transition-all cursor-pointer ${
                        paymentMethod === m.id
                          ? 'border-[#C89B6E] bg-[#C89B6E]/20 text-[#F2D6B8]'
                          : 'border-[#1E273A] bg-[#080B12] text-neutral-400 hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total & Submit */}
              <div className="pt-3 border-t border-[#1A2234] flex items-center justify-between safe-area-pb">
                <div>
                  <span className="text-[10px] text-neutral-400 block">Total a Pagar</span>
                  <span className="text-lg font-black text-[#F2D6B8] font-mono-nums">
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
                    className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#C89B6E] to-[#DFB78C] hover:from-[#D8AB7E] hover:to-[#E8C59E] text-neutral-950 font-black transition-all shadow-lg shadow-[#C89B6E]/20 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingOrder ? 'Processando...' : 'Confirmar Pedido'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Pedido Concluído com Sucesso */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0C101A] border border-[#C89B6E]/40 rounded-2xl p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#C89B6E]">
                Korizko • Panificação confeitaria artesanal
              </p>
              <h3 className="text-lg font-black text-white">Pedido Confirmado com Sucesso!</h3>
              <p className="text-xs text-neutral-400">
                Sua comanda foi encaminhada diretamente para nossa equipe de preparo.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#080B12] border border-[#C89B6E]/20 text-xs font-mono space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Pedido:</span>
                <span className="text-sm font-bold text-[#F2D6B8]">{completedOrder.orderNumber}</span>
              </div>
              {completedOrder.comandaNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Comanda:</span>
                  <span className="text-sm font-bold text-emerald-400">#{completedOrder.comandaNumber}</span>
                </div>
              )}
              {completedOrder.setorResponsavel && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Setor:</span>
                  <span className="text-xs font-bold text-[#C89B6E]">{completedOrder.setorResponsavel}</span>
                </div>
              )}
              <div className="pt-1.5 border-t border-[#1A2234] flex items-center justify-between">
                <span className="text-neutral-400">Total Confirmado:</span>
                <span className="text-base font-extrabold text-white font-mono-nums">
                  {formatCurrency(completedOrder.total, 'PYG')}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setCompletedOrder(null);
                if (embeddedInAdmin) return;
                if (onNavigateAccount) onNavigateAccount();
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C89B6E] to-[#DFB78C] text-neutral-950 font-black text-xs transition-colors cursor-pointer"
            >
              {embeddedInAdmin ? 'Continuar na Loja' : 'Acompanhar Pedido'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
