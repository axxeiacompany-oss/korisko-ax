import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBakery } from '../../context/BakeryContext';
import { supabase } from '../../lib/supabase';
import { Order, CustomerAddress } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { 
  User, 
  ShoppingBag, 
  MapPin, 
  Lock, 
  LogOut, 
  Clock, 
  CheckCircle2, 
  Package, 
  ChevronRight, 
  Plus, 
  Phone, 
  Mail, 
  ArrowLeft,
  X,
  CreditCard,
  Truck,
  AlertCircle
} from 'lucide-react';

interface Props {
  onNavigateStore?: () => void;
  onLogout?: () => void;
}

export const CustomerAccountView: React.FC<Props> = ({ onNavigateStore, onLogout }) => {
  const { user, profile, updateProfile, signOut, resetPassword } = useAuth();
  const { language, t } = useBakery();

  const [activeTab, setActiveTab] = useState<'pedidos' | 'dados' | 'enderecos' | 'seguranca'>('pedidos');

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Addresses State
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [isNewAddressModalOpen, setIsNewAddressModalOpen] = useState(false);

  // Profile Form State
  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileNotice, setProfileNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Password change State
  const [passwordNotice, setPasswordNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);

  // New Address Form
  const [newRecipient, setNewRecipient] = useState('');
  const [newStreet, setNewStreet] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newComplement, setNewComplement] = useState('');
  const [newNeighborhood, setNewNeighborhood] = useState('');
  const [newCity, setNewCity] = useState('Ciudad del Este');
  const [newState, setNewState] = useState('Alto Paraná');
  const [newPostalCode, setNewPostalCode] = useState('');
  const [newIsDefault, setNewIsDefault] = useState(true);

  // Sync profile fields
  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  // Load customer orders
  useEffect(() => {
    let isMounted = true;
    async function loadOrders() {
      if (!user) return;
      setIsLoadingOrders(true);
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            items:order_items(*)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('[MinhaConta] Aviso ao buscar pedidos:', error.message);
        }

        let remoteOrders: Order[] = [];
        if (!error && data && Array.isArray(data)) {
          remoteOrders = data.map((o: any) => ({
            id: o.id,
            orderNumber: o.order_number || `PED-${o.id.slice(0, 6)}`,
            customerId: o.customer_id,
            userId: o.user_id,
            affiliateId: o.affiliate_id,
            status: o.status || 'pending',
            subtotal: Number(o.subtotal) || 0,
            discount: Number(o.discount) || 0,
            shippingFee: Number(o.shipping_fee) || 0,
            total: Number(o.total) || 0,
            shippingAddress: o.shipping_address || {},
            notes: o.notes,
            items: (o.items || []).map((it: any) => ({
              id: it.id,
              orderId: it.order_id,
              productId: it.product_id,
              productVariantId: it.product_variant_id,
              productName: it.product_name,
              sku: it.sku,
              quantity: Number(it.quantity) || 1,
              unitPrice: Number(it.unit_price) || 0,
              total: Number(it.total) || 0,
              createdAt: it.created_at,
            })),
            createdAt: o.created_at,
            updatedAt: o.updated_at,
          }));
        }

        // Recuperar também pedidos locais salvos
        let localOrders: Order[] = [];
        try {
          const storageKey = `KORISKO_CUSTOMER_ORDERS_${user.id}`;
          const raw = localStorage.getItem(storageKey);
          if (raw) localOrders = JSON.parse(raw);
        } catch {}

        if (isMounted) {
          const merged = [
            ...remoteOrders,
            ...localOrders.filter(lo => !remoteOrders.some(ro => ro.id === lo.id)),
          ];
          setOrders(merged);
        }
      } catch (err) {
        console.warn('[MinhaConta] Erro ao carregar pedidos:', err);
      } finally {
        if (isMounted) setIsLoadingOrders(false);
      }
    }

    loadOrders();
    return () => { isMounted = false; };
  }, [user]);

  // Load customer addresses
  useEffect(() => {
    let isMounted = true;
    async function loadAddresses() {
      if (!user) return;
      setIsLoadingAddresses(true);
      try {
        const { data, error } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false });

        if (error) {
          console.warn('[MinhaConta] Aviso ao buscar endereços:', error.message);
        }

        if (isMounted && data) {
          setAddresses(data.map((a: any) => ({
            id: a.id,
            customerId: a.customer_id,
            userId: a.user_id,
            label: a.label,
            recipientName: a.recipient_name,
            street: a.street,
            number: a.number,
            complement: a.complement,
            neighborhood: a.neighborhood,
            city: a.city,
            state: a.state,
            country: a.country,
            postalCode: a.postal_code,
            isDefault: a.is_default,
            createdAt: a.created_at,
          })));
        }
      } catch (err) {
        console.warn('[MinhaConta] Erro ao carregar endereços:', err);
      } finally {
        if (isMounted) setIsLoadingAddresses(false);
      }
    }

    loadAddresses();
    return () => { isMounted = false; };
  }, [user]);

  // Handle Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileNotice(null);

    const { error } = await updateProfile({
      fullName: fullName.trim(),
      phone: phone.trim(),
    });

    setProfileSaving(false);
    if (error) {
      setProfileNotice({ type: 'error', message: error.message });
    } else {
      setProfileNotice({
        type: 'success',
        message: language === 'es' ? 'Datos actualizados con éxito.' : 'Dados cadastrais atualizados com sucesso.',
      });
      setTimeout(() => setProfileNotice(null), 3000);
    }
  };

  // Handle Send Password Reset
  const handleRequestPasswordReset = async () => {
    if (!user?.email) return;
    setIsSendingReset(true);
    setPasswordNotice(null);

    const { error } = await resetPassword(user.email);
    setIsSendingReset(false);

    if (error) {
      setPasswordNotice({ type: 'error', message: error.message });
    } else {
      setPasswordNotice({
        type: 'success',
        message: language === 'es'
          ? `Enlace de restablecimiento enviado a ${user.email}. Revise su bandeja de entrada.`
          : `Link de redefinição de senha enviado para ${user.email}. Verifique seu e-mail.`,
      });
    }
  };

  // Handle Add Address
  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const payload = {
        user_id: user.id,
        recipient_name: newRecipient.trim() || fullName,
        street: newStreet.trim(),
        number: newNumber.trim(),
        complement: newComplement.trim() || null,
        neighborhood: newNeighborhood.trim(),
        city: newCity.trim(),
        state: newState.trim(),
        country: 'Paraguai',
        postal_code: newPostalCode.trim() || '7000',
        is_default: newIsDefault,
      };

      const { data, error } = await supabase
        .from('addresses')
        .insert(payload)
        .select()
        .single();

      if (error) {
        alert(`Erro ao cadastrar endereço: ${error.message}`);
        return;
      }

      if (data) {
        setAddresses(prev => [data as CustomerAddress, ...prev]);
        setIsNewAddressModalOpen(false);
        // Reset fields
        setNewStreet('');
        setNewNumber('');
        setNewComplement('');
        setNewNeighborhood('');
      }
    } catch (err: any) {
      alert(`Falha ao salvar endereço: ${err.message}`);
    }
  };

  const handleLogoutClick = async () => {
    await signOut();
    if (onLogout) {
      onLogout();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300">Confirmado</span>;
      case 'processing':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300">Preparando</span>;
      case 'shipped':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300">A Caminho</span>;
      case 'delivered':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">Entregue</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300">Cancelado</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-700 text-neutral-300">Pendente</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#080B11] text-neutral-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Top Header */}
      <header className="sticky top-0 z-30 w-full bg-[#0C101A]/90 backdrop-blur-md border-b border-[#1A2234] px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onNavigateStore}
              className="p-2 rounded-xl bg-[#141A28] hover:bg-[#1E273A] text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title="Voltar à Loja"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-2">
                <span>{language === 'es' ? 'Mi Cuenta' : 'Minha Conta'}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300">
                  {profile?.role === 'customer' ? (language === 'es' ? 'Cliente' : 'Cliente') : profile?.role}
                </span>
              </h1>
              <p className="text-xs text-neutral-400">
                {profile?.fullName || user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {onNavigateStore && (
              <button
                type="button"
                onClick={onNavigateStore}
                className="px-3 sm:px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{language === 'es' ? 'Ir a la Tienda' : 'Ir para a Loja'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleLogoutClick}
              className="p-2 sm:px-3 sm:py-2 rounded-xl border border-[#232F47] hover:border-rose-500/40 hover:bg-rose-500/10 text-neutral-400 hover:text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{language === 'es' ? 'Salir' : 'Sair'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Navigation Sidebar (4 cols) */}
        <aside className="md:col-span-4 lg:col-span-3 space-y-2">
          <div className="p-4 rounded-2xl bg-[#0D121D] border border-[#1E273A] space-y-1">
            
            <button
              type="button"
              onClick={() => setActiveTab('pedidos')}
              className={`w-full p-3 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'pedidos'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-neutral-300 hover:bg-[#151D2C] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Package className="w-4 h-4" />
                <span>{language === 'es' ? 'Mis Pedidos' : 'Meus Pedidos'}</span>
              </div>
              <span className="text-[11px] font-mono opacity-80">{orders.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dados')}
              className={`w-full p-3 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'dados'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-neutral-300 hover:bg-[#151D2C] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <User className="w-4 h-4" />
                <span>{language === 'es' ? 'Datos Personales' : 'Dados Pessoais'}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('enderecos')}
              className={`w-full p-3 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'enderecos'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-neutral-300 hover:bg-[#151D2C] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4" />
                <span>{language === 'es' ? 'Mis Direcciones' : 'Meus Endereços'}</span>
              </div>
              <span className="text-[11px] font-mono opacity-80">{addresses.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('seguranca')}
              className={`w-full p-3 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'seguranca'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-neutral-300 hover:bg-[#151D2C] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4" />
                <span>{language === 'es' ? 'Seguridad & Clave' : 'Segurança & Senha'}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>

          </div>

          {/* Quick Help Card */}
          <div className="p-4 rounded-2xl bg-[#090D15] border border-[#1A2234] text-xs text-neutral-400 space-y-2">
            <h4 className="font-bold text-neutral-200">Precisa de Ajuda?</h4>
            <p className="text-[11px] leading-relaxed">
              Dúvidas sobre seus pedidos ou entregas? Entre em contato diretamente com o nosso atendimento no balcão.
            </p>
          </div>
        </aside>

        {/* Content Area (8 cols) */}
        <section className="md:col-span-8 lg:col-span-9 space-y-6">
          
          {/* TAB 1: MEUS PEDIDOS */}
          {activeTab === 'pedidos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {language === 'es' ? 'Historial de Pedidos' : 'Histórico de Pedidos'}
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Acompanhe o status e os detalhes das suas compras realizadas na loja
                  </p>
                </div>
              </div>

              {isLoadingOrders ? (
                <div className="p-12 text-center text-xs text-neutral-500">
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span>Carregando seus pedidos...</span>
                </div>
              ) : orders.length === 0 ? (
                <div className="p-12 rounded-2xl bg-[#0D121D] border border-[#1E273A] text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#151D2C] text-neutral-400 flex items-center justify-center mx-auto">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Nenhum pedido realizado ainda</h3>
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                    Você ainda não fez nenhum pedido em nossa loja online. Navegue pelo nosso cardápio e faça sua primeira compra!
                  </p>
                  {onNavigateStore && (
                    <button
                      type="button"
                      onClick={onNavigateStore}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Ir às Compras</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-4 sm:p-5 rounded-2xl bg-[#0D121D] border border-[#1E273A] hover:border-[#2C3852] transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1A2234] pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-sm font-bold text-white">
                            {ord.orderNumber}
                          </span>
                          {getStatusBadge(ord.status)}
                        </div>
                        <span className="text-xs text-neutral-400 font-mono-nums">
                          {new Date(ord.createdAt).toLocaleString(language === 'es' ? 'es-PY' : 'pt-BR', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                        <div className="text-xs text-neutral-300">
                          <p className="font-medium">
                            {ord.items?.length || 0} {ord.items?.length === 1 ? 'item' : 'itens'} no pedido
                          </p>
                          <p className="text-[11px] text-neutral-500 truncate max-w-md">
                            {ord.items?.map(it => `${it.quantity}x ${it.productName}`).join(', ')}
                          </p>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4">
                          <div className="text-right">
                            <span className="text-[10px] text-neutral-400 block">Total</span>
                            <span className="text-base font-black text-amber-400 font-mono-nums">
                              {formatCurrency(ord.total, 'PYG')}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedOrder(ord)}
                            className="px-3 py-2 rounded-xl bg-[#161F30] hover:bg-indigo-600 text-neutral-200 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                          >
                            Ver Detalhes
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DADOS PESSOAIS */}
          {activeTab === 'dados' && (
            <div className="p-6 rounded-2xl bg-[#0D121D] border border-[#1E273A] space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {language === 'es' ? 'Datos Personales' : 'Dados Pessoais'}
                </h2>
                <p className="text-xs text-neutral-400">
                  Mantenha suas informações de contato atualizadas para recebimento de pedidos e comunicações
                </p>
              </div>

              {profileNotice && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  profileNotice.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                }`}>
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{profileNotice.message}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300 block">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#090D15] border border-[#1F273A] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300 block">
                    E-mail (Login Principal)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={profile?.email || user?.email || ''}
                    className="w-full px-3.5 py-2.5 bg-[#07090F] border border-[#1A2234] rounded-xl text-xs text-neutral-400 cursor-not-allowed"
                  />
                  <span className="text-[10px] text-neutral-500">
                    O e-mail de acesso não pode ser alterado diretamente por questões de segurança.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300 block">
                    WhatsApp / Telefone para Notificações
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+595 981 123456"
                    className="w-full px-3.5 py-2.5 bg-[#090D15] border border-[#1F273A] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 font-mono-nums"
                  />
                </div>

                <button
                  type="submit"
                  disabled={profileSaving}
                  className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {profileSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: ENDEREÇOS */}
          {activeTab === 'enderecos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {language === 'es' ? 'Direcciones de Entrega' : 'Endereços de Entrega'}
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Gerencie os locais onde deseja receber suas encomendas da loja
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewAddressModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Endereço</span>
                </button>
              </div>

              {isLoadingAddresses ? (
                <div className="p-8 text-center text-xs text-neutral-500">Carregando endereços...</div>
              ) : addresses.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#0D121D] border border-[#1E273A] text-center space-y-3">
                  <MapPin className="w-8 h-8 text-neutral-500 mx-auto" />
                  <p className="text-xs text-neutral-400">Nenhum endereço cadastrado ainda.</p>
                  <button
                    type="button"
                    onClick={() => setIsNewAddressModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-[#1A2336] text-white font-semibold text-xs cursor-pointer"
                  >
                    Adicionar Primeiro Endereço
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="p-4 rounded-2xl bg-[#0D121D] border border-[#1E273A] space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{addr.label || 'Endereço'}</span>
                        </span>
                        {addr.isDefault && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                            Padrão
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-300 space-y-0.5">
                        <p className="font-semibold text-white">{addr.recipientName}</p>
                        <p>{addr.street}, {addr.number} {addr.complement ? `(${addr.complement})` : ''}</p>
                        <p className="text-neutral-400">{addr.neighborhood} — {addr.city}, {addr.state}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SEGURANÇA */}
          {activeTab === 'seguranca' && (
            <div className="p-6 rounded-2xl bg-[#0D121D] border border-[#1E273A] space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {language === 'es' ? 'Seguridad de la Cuenta' : 'Segurança da Conta'}
                </h2>
                <p className="text-xs text-neutral-400">
                  Gerenciamento de credenciais e alteração de senha segura
                </p>
              </div>

              {passwordNotice && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  passwordNotice.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                }`}>
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordNotice.message}</span>
                </div>
              )}

              <div className="p-4 rounded-xl bg-[#090D15] border border-[#1F273A] max-w-lg space-y-3">
                <div className="flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-bold text-white">Redefinir Senha de Acesso</h4>
                </div>
                <p className="text-xs text-neutral-400">
                  Por proteção à sua privacidade, a troca de senha é processada através de um link seguro enviado diretamente para o seu e-mail cadastrado (<strong>{user?.email}</strong>).
                </p>
                <button
                  type="button"
                  disabled={isSendingReset}
                  onClick={handleRequestPasswordReset}
                  className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSendingReset ? 'Enviando...' : 'Enviar Link de Redefinição'}
                </button>
              </div>
            </div>
          )}

        </section>

      </main>

      {/* Modal de Detalhes do Pedido */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#0E1320] border border-[#1F273A] rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#1A2234] pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Pedido {selectedOrder.orderNumber}</span>
                  {getStatusBadge(selectedOrder.status)}
                </h3>
                <span className="text-xs text-neutral-400 font-mono-nums">
                  {new Date(selectedOrder.createdAt).toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                Itens Adquiridos
              </span>
              {(selectedOrder.items || []).map((it, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-[#161E2E]">
                  <div>
                    <span className="text-neutral-200 font-medium">{it.productName}</span>
                    <span className="text-neutral-500 block text-[10px]">{it.quantity}x {formatCurrency(it.unitPrice, 'PYG')}</span>
                  </div>
                  <span className="font-bold text-white font-mono-nums">{formatCurrency(it.total, 'PYG')}</span>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="p-3 rounded-xl bg-[#090D15] border border-[#1A2234] space-y-1.5 text-xs font-mono-nums">
              <div className="flex justify-between text-neutral-400">
                <span>Subtotal:</span>
                <span>{formatCurrency(selectedOrder.subtotal, 'PYG')}</span>
              </div>
              {selectedOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Desconto:</span>
                  <span>-{formatCurrency(selectedOrder.discount, 'PYG')}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-amber-400 pt-1 border-t border-[#1F273A]">
                <span>Total:</span>
                <span>{formatCurrency(selectedOrder.total, 'PYG')}</span>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="w-full py-2.5 rounded-xl bg-[#1A2336] hover:bg-[#222E46] text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Fechar Detalhes
            </button>
          </div>
        </div>
      )}

      {/* Modal de Cadastro de Endereço */}
      {isNewAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-[#0E1320] border border-[#1F273A] rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#1A2234] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-400" />
                <span>Novo Endereço de Entrega</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsNewAddressModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddAddress} className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-300 block mb-1">Destinatário</label>
                <input
                  type="text"
                  required
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  placeholder={profile?.fullName || 'Nome de quem recebe'}
                  className="w-full px-3 py-2 bg-[#090D15] border border-[#1F273A] rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-neutral-300 block mb-1">Rua / Avenida</label>
                  <input
                    type="text"
                    required
                    value={newStreet}
                    onChange={(e) => setNewStreet(e.target.value)}
                    placeholder="Ex: Av. Adrián Jara"
                    className="w-full px-3 py-2 bg-[#090D15] border border-[#1F273A] rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-neutral-300 block mb-1">Número</label>
                  <input
                    type="text"
                    required
                    value={newNumber}
                    onChange={(e) => setNewNumber(e.target.value)}
                    placeholder="123"
                    className="w-full px-3 py-2 bg-[#090D15] border border-[#1F273A] rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-neutral-300 block mb-1">Bairro</label>
                <input
                  type="text"
                  required
                  value={newNeighborhood}
                  onChange={(e) => setNewNeighborhood(e.target.value)}
                  placeholder="Ex: Centro"
                  className="w-full px-3 py-2 bg-[#090D15] border border-[#1F273A] rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-neutral-300 block mb-1">Cidade</label>
                  <input
                    type="text"
                    required
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full px-3 py-2 bg-[#090D15] border border-[#1F273A] rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-neutral-300 block mb-1">Complemento</label>
                  <input
                    type="text"
                    value={newComplement}
                    onChange={(e) => setNewComplement(e.target.value)}
                    placeholder="Apto 102"
                    className="w-full px-3 py-2 bg-[#090D15] border border-[#1F273A] rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewAddressModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-[#1F273A] text-neutral-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  Salvar Endereço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
