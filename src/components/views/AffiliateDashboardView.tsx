import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBakery } from '../../context/BakeryContext';
import { supabase } from '../../lib/supabase';
import { Affiliate, Commission, Customer, CustomerCategory, Order } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { 
  Users, 
  Link as LinkIcon, 
  Copy, 
  Check, 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ShoppingBag, 
  Wallet, 
  CreditCard,
  Share2,
  ExternalLink,
  ArrowLeft,
  LogOut,
  Sparkles,
  QrCode,
  UserPlus,
  Phone,
  Search,
  MessageSquare,
  Plus,
  Edit2,
  Trash2,
  X,
  MapPin,
  Calendar,
  ChevronRight
} from 'lucide-react';

interface Props {
  onNavigateStore?: () => void;
  onLogout?: () => void;
}

export const AffiliateDashboardView: React.FC<Props> = ({ onNavigateStore, onLogout }) => {
  const { user, profile, signOut } = useAuth();
  const { 
    customers, 
    addCustomer, 
    updateCustomer, 
    deleteCustomer, 
    currentUser, 
    language, 
    showToast,
    t 
  } = useBakery();

  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'clientes' | 'comissoes' | 'pagamento'>('clientes');

  // Customer Management State
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerCategoryFilter, setCustomerCategoryFilter] = useState<string>('todas');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientDocumentCpf, setClientDocumentCpf] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientCategory, setClientCategory] = useState<CustomerCategory>('varejo');
  const [clientNotes, setClientNotes] = useState('');
  const [copiedCustomerLink, setCopiedCustomerLink] = useState<string | null>(null);

  // Bank Info / Pix State
  const [pixKey, setPixKey] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [holderName, setHolderName] = useState('');
  const [isSavingPayout, setIsSavingPayout] = useState(false);
  const [payoutNotice, setPayoutNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load affiliate profile & commissions
  useEffect(() => {
    let isMounted = true;

    async function loadAffiliateData() {
      if (!user) return;
      setIsLoading(true);
      try {
        // 1. Fetch affiliate record
        const { data: affData, error: affErr } = await supabase
          .from('affiliates')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (affErr) {
          console.warn('[Afiliado] Aviso ao buscar afiliado:', affErr.message);
        }

        let currentAff = affData;

        // Auto-provision affiliate record if approved as affiliate role
        if (!currentAff) {
          const generatedCode = (profile?.fullName || user.email?.split('@')[0] || 'PARCEIRO')
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .slice(0, 8) + Math.floor(100 + Math.random() * 900);

          let savedLocalPayout: any = null;
          try {
            const rawLocal = localStorage.getItem(`KORISKO_AFFILIATE_PAYOUT_${user.id}`);
            if (rawLocal) savedLocalPayout = JSON.parse(rawLocal);
          } catch {}

          const { data: createdAff, error: createErr } = await supabase
            .from('affiliates')
            .insert({
              user_id: user.id,
              affiliate_code: generatedCode,
              commission_rate: 10.00,
              status: 'active',
            })
            .select()
            .maybeSingle();

          if (createErr || !createdAff) {
            currentAff = {
              id: `aff-${user.id}`,
              user_id: user.id,
              affiliate_code: savedLocalPayout?.affiliate_code || generatedCode,
              status: 'active',
              commission_rate: 10,
              clicks_count: 0,
              pix_key: savedLocalPayout?.pix_key || '',
              bank_info: savedLocalPayout?.bank_info || {},
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          } else {
            currentAff = createdAff;
          }
        }

        if (isMounted && currentAff) {
          const mappedAff: Affiliate = {
            id: currentAff.id,
            userId: currentAff.user_id,
            affiliateCode: currentAff.affiliate_code,
            status: currentAff.status || 'active',
            commissionRate: Number(currentAff.commission_rate) || 10,
            clicksCount: Number(currentAff.clicks_count) || 0,
            pixKey: currentAff.pix_key || '',
            bankInfo: currentAff.bank_info || {},
            createdAt: currentAff.created_at,
            updatedAt: currentAff.updated_at,
          };
          setAffiliate(mappedAff);
          setPixKey(mappedAff.pixKey || '');
          setBankName(mappedAff.bankInfo?.bankName || '');
          setAccountNumber(mappedAff.bankInfo?.accountNumber || '');
          setHolderName(mappedAff.bankInfo?.holderName || profile?.fullName || '');

          // 2. Fetch commissions
          try {
            const { data: comData } = await supabase
              .from('commissions')
              .select('*')
              .eq('affiliate_id', currentAff.id)
              .order('created_at', { ascending: false });

            if (isMounted && comData) {
              setCommissions(comData.map((c: any) => ({
                id: c.id,
                affiliateId: c.affiliate_id,
                orderId: c.order_id,
                amount: Number(c.amount) || 0,
                rate: Number(c.rate) || mappedAff.commissionRate,
                status: c.status || 'pending',
                createdAt: c.created_at,
                paidAt: c.paid_at,
              })));
            }
          } catch {}
        }
      } catch (err) {
        console.warn('[Afiliado] Erro geral:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadAffiliateData();
    return () => { isMounted = false; };
  }, [user, profile]);

  // Affiliate shareable link
  const affiliateCode = affiliate?.affiliateCode || 'PARCEIRO';
  const affiliateLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/?ref=${affiliateCode}` 
    : `https://seusite.com/?ref=${affiliateCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(affiliateLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Identify the affiliate's key identifiers
  const myAffiliateId = affiliate?.id || user?.id || currentUser?.id;
  const myAffiliateName = profile?.fullName || currentUser?.name || (user?.email ? user.email.split('@')[0] : 'Afiliado');

  // Filter customers that belong exclusively to this affiliate
  const myCustomers = useMemo(() => {
    return (customers || []).filter(c => {
      if (affiliate?.id && c.affiliateId === affiliate.id) return true;
      if (user?.id && c.affiliateId === user.id) return true;
      if (currentUser?.id && c.affiliateId === currentUser.id) return true;
      if (affiliateCode && c.affiliateId === affiliateCode) return true;
      if (c.affiliateName && myAffiliateName && c.affiliateName.trim().toLowerCase() === myAffiliateName.trim().toLowerCase()) return true;
      return false;
    });
  }, [customers, affiliate, user, currentUser, affiliateCode, myAffiliateName]);

  // Filtered customers for search & category
  const filteredMyCustomers = useMemo(() => {
    return myCustomers.filter(c => {
      const matchSearch = !customerSearch.trim() ||
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch) ||
        (c.email && c.email.toLowerCase().includes(customerSearch.toLowerCase())) ||
        (c.address && c.address.toLowerCase().includes(customerSearch.toLowerCase()));

      const matchCat = customerCategoryFilter === 'todas' || c.category === customerCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [myCustomers, customerSearch, customerCategoryFilter]);

  // Total amount spent by this affiliate's customers
  const myCustomersTotalSpent = useMemo(() => {
    return myCustomers.reduce((acc, c) => acc + (Number(c.totalSpentBrl) || 0), 0);
  }, [myCustomers]);

  // Calculations for earnings
  const approvedEarnings = commissions
    .filter(c => c.status === 'approved')
    .reduce((acc, c) => acc + c.amount, 0);

  const pendingEarnings = commissions
    .filter(c => c.status === 'pending')
    .reduce((acc, c) => acc + c.amount, 0);

  const paidEarnings = commissions
    .filter(c => c.status === 'paid')
    .reduce((acc, c) => acc + c.amount, 0);

  const totalSalesCount = commissions.length;

  // Open Create Customer Modal
  const handleOpenAddCustomer = () => {
    setEditingCustomer(null);
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setClientDocumentCpf('');
    setClientAddress('');
    setClientCategory('varejo');
    setClientNotes('');
    setIsCustomerModalOpen(true);
  };

  // Open Edit Customer Modal
  const handleOpenEditCustomer = (c: Customer) => {
    setEditingCustomer(c);
    setClientName(c.name);
    setClientPhone(c.phone);
    setClientEmail(c.email || '');
    setClientDocumentCpf(c.documentCpf || '');
    setClientAddress(c.address || '');
    setClientCategory(c.category);
    setClientNotes(c.notes || '');
    setIsCustomerModalOpen(true);
  };

  // Save Customer Handler (Add or Update)
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientPhone.trim()) {
      showToast(
        language === 'es' 
          ? 'Por favor, ingrese el nombre y el WhatsApp del cliente.' 
          : 'Por favor, informe pelo menos o nome e o WhatsApp do cliente.',
        'error'
      );
      return;
    }

    try {
      if (editingCustomer) {
        await updateCustomer({
          ...editingCustomer,
          name: clientName.trim(),
          phone: clientPhone.trim(),
          email: clientEmail.trim() || undefined,
          documentCpf: clientDocumentCpf.trim() || undefined,
          address: clientAddress.trim() || undefined,
          category: clientCategory,
          notes: clientNotes.trim() || undefined,
          affiliateId: editingCustomer.affiliateId || myAffiliateId,
          affiliateName: editingCustomer.affiliateName || myAffiliateName,
        });
        showToast('Cliente atualizado com sucesso!', 'success');
      } else {
        await addCustomer({
          name: clientName.trim(),
          phone: clientPhone.trim(),
          email: clientEmail.trim() || undefined,
          documentCpf: clientDocumentCpf.trim() || undefined,
          address: clientAddress.trim() || undefined,
          category: clientCategory,
          creditLimitBrl: 500000,
          notes: clientNotes.trim() || undefined,
          affiliateId: myAffiliateId,
          affiliateName: myAffiliateName,
        });
        showToast('Novo cliente adicionado com sucesso à sua carteira!', 'success');
      }
      setIsCustomerModalOpen(false);
    } catch (err: any) {
      showToast(`Erro ao salvar cliente: ${err.message}`, 'error');
    }
  };

  // Copy customized affiliate link greeting for a specific customer
  const handleCopyCustomerGreeting = (customer: Customer) => {
    const text = `Olá ${customer.name}! Sou ${myAffiliateName} da Korizko Panificação & Confeitaria Artesanal. 🥖🍰\n\nAcesse nosso cardápio exclusivo pelo meu link e faça seu pedido:\n${affiliateLink}`;
    navigator.clipboard.writeText(text);
    setCopiedCustomerLink(customer.id);
    setTimeout(() => setCopiedCustomerLink(null), 2500);
    showToast('Mensagem personalizada com seu link copiada para envio!', 'success');
  };

  // Direct WhatsApp link generator
  const getWhatsAppLink = (customer: Customer) => {
    const cleanPhone = (customer.phone || '').replace(/\D/g, '');
    const message = `Olá ${customer.name}! Sou ${myAffiliateName} da Korizko. Preparei novidades fresquinhas para você hoje! Acesse meu link para pedir: ${affiliateLink}`;
    return `https://wa.me/${cleanPhone.length <= 9 ? '55' + cleanPhone : cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  // Save payout info (Pix / Bank)
  const handleSavePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPayout(true);
    setPayoutNotice(null);

    try {
      const payload = {
        affiliate_code: affiliateCode,
        pix_key: pixKey.trim(),
        bank_info: {
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          holderName: holderName.trim(),
        },
        updated_at: new Date().toISOString(),
      };

      if (user?.id) {
        try {
          localStorage.setItem(`KORISKO_AFFILIATE_PAYOUT_${user.id}`, JSON.stringify(payload));
        } catch {}
      }

      if (affiliate?.id) {
        try {
          await supabase
            .from('affiliates')
            .update({
              pix_key: payload.pix_key,
              bank_info: payload.bank_info,
              updated_at: payload.updated_at,
            })
            .eq('id', affiliate.id);
        } catch {}
      }

      setPayoutNotice({
        type: 'success',
        message: language === 'es' ? 'Datos de pago guardados con éxito.' : 'Dados de recebimento salvos com sucesso.',
      });
      setTimeout(() => setPayoutNotice(null), 3000);
    } catch (err: any) {
      setPayoutNotice({ type: 'error', message: err.message });
    } finally {
      setIsSavingPayout(false);
    }
  };

  // Helper Initials
  const getCustomerInitials = (name: string) => {
    if (!name) return 'CL';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#080B11] text-neutral-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Top Header */}
      <header className="sticky top-0 z-30 w-full bg-[#0C101A]/90 backdrop-blur-md border-b border-[#1A2234] px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onNavigateStore && (
              <button
                type="button"
                onClick={onNavigateStore}
                className="p-2 rounded-xl bg-[#141A28] hover:bg-[#1E273A] text-neutral-300 hover:text-white transition-colors cursor-pointer"
                title="Voltar à Loja"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-2">
                <span>{language === 'es' ? 'Portal de Afiliados' : 'Portal de Afiliados'}</span>
              </h1>
              <p className="text-xs text-neutral-400">
                {profile?.fullName || user?.email} • Código: <strong className="text-amber-400 font-mono">{affiliateCode}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {onNavigateStore && (
              <button
                type="button"
                onClick={onNavigateStore}
                className="px-3 sm:px-4 py-2 rounded-xl bg-[#141B2B] hover:bg-[#1D283E] text-white font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Ver Loja</span>
              </button>
            )}
            <button
              type="button"
              onClick={async () => { await signOut(); if (onLogout) onLogout(); }}
              className="p-2 sm:px-3 sm:py-2 rounded-xl border border-[#232F47] hover:border-rose-500/40 hover:bg-rose-500/10 text-neutral-400 hover:text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        
        {/* Banner Link Exclusivo de Afiliado */}
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-indigo-950/70 via-[#0E1424] to-[#121B2F] border border-indigo-500/30 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-amber-400" /> Seu Link Oficial de Divulgação
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Compartilhe seu Link e Acompanhe Cada Pedido
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Qualquer cliente que entrar na loja através do seu link terá a compra vinculada automaticamente a você.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="px-3.5 py-2.5 rounded-xl bg-[#070A11] border border-[#232E45] font-mono text-xs text-indigo-300 truncate max-w-xs sm:max-w-sm select-all">
                {affiliateLink}
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer shrink-0"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* 1. Meus Clientes Cadastrados */}
          <div 
            onClick={() => setActiveTab('clientes')}
            className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'clientes' 
                ? 'bg-indigo-950/40 border-indigo-500/50 shadow-lg shadow-indigo-500/10' 
                : 'bg-[#0D121D] border-[#1E273A] hover:border-neutral-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block">
                Meus Clientes
              </span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-white font-mono-nums">
                {myCustomers.length}
              </span>
              <span className="text-[10px] text-indigo-400 font-bold">carteira ativa</span>
            </div>
          </div>

          {/* 2. Vendas Concluídas */}
          <div 
            onClick={() => setActiveTab('comissoes')}
            className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'comissoes' 
                ? 'bg-indigo-950/40 border-indigo-500/50 shadow-lg shadow-indigo-500/10' 
                : 'bg-[#0D121D] border-[#1E273A] hover:border-neutral-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block">
                Vendas Concluídas
              </span>
              <ShoppingBag className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-indigo-400 font-mono-nums">
                {totalSalesCount}
              </span>
              <span className="text-[10px] text-neutral-500">pedidos</span>
            </div>
          </div>

          {/* 3. Comissão Aprovada */}
          <div 
            onClick={() => setActiveTab('comissoes')}
            className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'comissoes' 
                ? 'bg-emerald-950/30 border-emerald-500/50 shadow-lg shadow-emerald-500/10' 
                : 'bg-[#0D121D] border-[#1E273A] hover:border-neutral-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block">
                Comissão Disponível
              </span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono-nums">
                {formatCurrency(approvedEarnings, 'PYG')}
              </span>
              <span className="text-[10px] text-emerald-400/80 font-bold">Aprovada</span>
            </div>
          </div>

          {/* 4. Cliques no Link */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0D121D] border border-[#1E273A] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block">
                Cliques no Link
              </span>
              <Share2 className="w-4 h-4 text-neutral-500" />
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-amber-400 font-mono-nums">
                {affiliate?.clicksCount || 0}
              </span>
              <span className="text-[10px] text-neutral-500">acessos</span>
            </div>
          </div>

        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[#1A2234] pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('clientes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'clientes'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-[#0E1422] text-neutral-400 hover:text-white hover:bg-[#161F34]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Meus Clientes Cadastrados</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/30 font-mono">
              {myCustomers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('comissoes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'comissoes'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-[#0E1422] text-neutral-400 hover:text-white hover:bg-[#161F34]'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Extrato de Comissões</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/30 font-mono">
              {commissions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pagamento')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'pagamento'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-[#0E1422] text-neutral-400 hover:text-white hover:bg-[#161F34]'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Dados de Recebimento (Pix / Banco)</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* ABA 1: CARTEIRA DE CLIENTES DO AFILIADO */}
        {/* ======================================================== */}
        {activeTab === 'clientes' && (
          <div className="space-y-4">
            
            {/* Top Bar com Busca e Botão de Novo Cliente */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#0C101A] border border-[#1A2234]">
              <div className="flex flex-1 items-center gap-3 max-w-md">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Buscar cliente por nome, telefone ou endereço..."
                    className="w-full pl-9 pr-3.5 py-2.5 bg-[#070A11] border border-[#1F273A] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                  />
                  {customerSearch && (
                    <button
                      type="button"
                      onClick={() => setCustomerSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <select
                  value={customerCategoryFilter}
                  onChange={(e) => setCustomerCategoryFilter(e.target.value)}
                  className="px-3 py-2.5 bg-[#070A11] border border-[#1F273A] rounded-xl text-xs text-neutral-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="todas">Todas Categorias</option>
                  <option value="varejo">Varejo</option>
                  <option value="mensalista">Mensalista</option>
                  <option value="empresa">Empresa</option>
                  <option value="confeitaria">Confeitaria</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenAddCustomer}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Cadastrar Novo Cliente</span>
                </button>
              </div>
            </div>

            {/* Lista de Clientes */}
            {filteredMyCustomers.length === 0 ? (
              <div className="p-12 rounded-3xl bg-[#0D121D] border border-[#1E273A] text-center space-y-4 max-w-lg mx-auto my-6">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                  <Users className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-white">
                    {myCustomers.length === 0 ? 'Sua Carteira de Clientes Está Pronta!' : 'Nenhum cliente encontrado com este filtro'}
                  </h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {myCustomers.length === 0
                      ? 'Adicione seus próprios clientes para acompanhar suas compras, enviar novidades via WhatsApp e garantir que todas as comissões sejam vinculadas a você.'
                      : 'Tente alterar os termos da busca para encontrar o cliente desejado.'}
                  </p>
                </div>
                {myCustomers.length === 0 && (
                  <button
                    type="button"
                    onClick={handleOpenAddCustomer}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 mx-auto cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Adicionar Meu Primeiro Cliente</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMyCustomers.map((cust) => {
                  const initials = getCustomerInitials(cust.name);
                  const isCopied = copiedCustomerLink === cust.id;
                  const waLink = getWhatsAppLink(cust);

                  return (
                    <div
                      key={cust.id}
                      className="p-5 rounded-2xl bg-[#0C101A] border border-[#1A2234] hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-4 group"
                    >
                      <div>
                        {/* Top Row: Initials, Name, Category */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                                {cust.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-[#161F33] text-indigo-300 border border-indigo-500/20">
                                  {cust.category || 'Varejo'}
                                </span>
                                <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(cust.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenEditCustomer(cust)}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-[#161E30] transition-colors cursor-pointer"
                            title="Editar Dados do Cliente"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Customer Info Items */}
                        <div className="mt-3.5 space-y-1.5 text-xs">
                          {cust.phone && (
                            <div className="flex items-center gap-2 text-neutral-300">
                              <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="font-mono text-emerald-300 font-semibold">{cust.phone}</span>
                            </div>
                          )}
                          {cust.email && (
                            <div className="text-[11px] text-neutral-400 truncate">
                              {cust.email}
                            </div>
                          )}
                          {cust.address && (
                            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 truncate">
                              <MapPin className="w-3 h-3 text-neutral-500 shrink-0" />
                              <span className="truncate">{cust.address}</span>
                            </div>
                          )}
                          {cust.notes && (
                            <p className="text-[11px] text-neutral-400 italic bg-[#070A11] p-2 rounded-lg border border-[#1A2234]">
                              "{cust.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Financial / Purchases Summary */}
                      <div className="pt-3 border-t border-[#182030] space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-neutral-400">Total Comprado:</span>
                          <span className="font-bold text-white font-mono-nums">
                            {formatCurrency(cust.totalSpentBrl || 0, 'PYG')}
                          </span>
                        </div>

                        {/* Direct Action Buttons for this Customer */}
                        <div className="grid grid-cols-2 gap-2">
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2 px-2.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            title="Abrir WhatsApp do Cliente com seu Link de Afiliado"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                            <span>WhatsApp</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => handleCopyCustomerGreeting(cust)}
                            className="py-2 px-2.5 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            title="Copiar mensagem personalizada com seu link"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{isCopied ? 'Copiado!' : 'Copiar Link'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 2: EXTRATO DE COMISSÕES */}
        {/* ======================================================== */}
        {activeTab === 'comissoes' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-8 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Histórico Detalhado de Vendas & Comissões</span>
                </h3>
                <span className="text-xs text-neutral-500 font-mono-nums">{commissions.length} registros</span>
              </div>

              {isLoading ? (
                <div className="p-8 text-center text-xs text-neutral-500">Carregando comissões...</div>
              ) : commissions.length === 0 ? (
                <div className="p-10 rounded-2xl bg-[#0D121D] border border-[#1E273A] text-center space-y-2">
                  <ShoppingBag className="w-8 h-8 text-neutral-500 mx-auto" />
                  <p className="text-xs font-semibold text-white">Nenhuma comissão registrada ainda</p>
                  <p className="text-[11px] text-neutral-400 max-w-sm mx-auto">
                    Envie seu link de indicação para seus clientes cadastrados. Assim que realizarem uma compra, sua comissão aparecerá aqui automaticamente.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl bg-[#0D121D] border border-[#1E273A] overflow-hidden">
                  <div className="divide-y divide-[#1A2234]">
                    {commissions.map((c) => (
                      <div key={c.id} className="p-4 flex items-center justify-between text-xs hover:bg-[#121927] transition-colors">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white font-mono">Pedido #{c.orderId.slice(0, 8)}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.status === 'paid' ? 'bg-emerald-500/20 text-emerald-300'
                              : c.status === 'approved' ? 'bg-blue-500/20 text-blue-300'
                              : c.status === 'cancelled' ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-amber-500/20 text-amber-300'
                            }`}>
                              {c.status === 'paid' ? 'Pago' : c.status === 'approved' ? 'Aprovado' : c.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                            </span>
                          </div>
                          <span className="text-[10px] text-neutral-500 font-mono-nums">
                            {new Date(c.createdAt).toLocaleString(language === 'es' ? 'es-PY' : 'pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-black text-emerald-400 font-mono-nums">
                            +{formatCurrency(c.amount, 'PYG')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Card Lateral: Resumo de Performance */}
            <section className="lg:col-span-4 space-y-4">
              <div className="p-5 rounded-2xl bg-[#0D121D] border border-[#1E273A] space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Regras de Afiliado</h4>
                <div className="space-y-2 text-xs text-neutral-400 leading-relaxed">
                  <p>• As vendas realizadas pelos seus clientes cadastrados são vinculadas diretamente a você.</p>
                  <p>• Comissões são liberadas após a confirmação e entrega do pedido.</p>
                  <p>• Repasses são efetuados via Pix diretamente na chave informada na aba de pagamento.</p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 3: DADOS DE RECEBIMENTO / PIX */}
        {/* ======================================================== */}
        {activeTab === 'pagamento' && (
          <div className="max-w-xl space-y-4">
            <div className="p-6 rounded-2xl bg-[#0D121D] border border-[#1E273A] space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-indigo-400" />
                  <span>Configuração de Chave Pix & Dados Bancários</span>
                </h3>
                <p className="text-xs text-neutral-400">
                  Informe onde deseja receber o pagamento das suas comissões acumuladas:
                </p>
              </div>

              {payoutNotice && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  payoutNotice.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                }`}>
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{payoutNotice.message}</span>
                </div>
              )}

              <form onSubmit={handleSavePayout} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-neutral-300 font-medium block mb-1">
                    Chave Pix Oficial (CPF, E-mail, Telefone ou Aleatória) *
                  </label>
                  <input
                    type="text"
                    required
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="Sua chave Pix para repasse"
                    className="w-full px-3.5 py-2.5 bg-[#090D15] border border-[#1F273A] rounded-xl text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-neutral-300 font-medium block mb-1">
                    Nome Completo do Titular
                  </label>
                  <input
                    type="text"
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value)}
                    placeholder="Nome completo do titular da conta"
                    className="w-full px-3.5 py-2.5 bg-[#090D15] border border-[#1F273A] rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-neutral-300 font-medium block mb-1">
                      Banco
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="Ex: Nubank, Itaú, Banco Inter"
                      className="w-full px-3.5 py-2.5 bg-[#090D15] border border-[#1F273A] rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-300 font-medium block mb-1">
                      Agência e Conta (Opcional)
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Agência / Conta"
                      className="w-full px-3.5 py-2.5 bg-[#090D15] border border-[#1F273A] rounded-xl text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingPayout}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSavingPayout ? 'Salvando...' : 'Salvar Dados de Recebimento'}
                </button>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* ======================================================== */}
      {/* MODAL: ADICIONAR / EDITAR CLIENTE DO AFILIADO */}
      {/* ======================================================== */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-[#0D121E] border border-indigo-500/40 p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#1A2234]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {editingCustomer ? 'Editar Dados do Cliente' : 'Cadastrar Novo Cliente na Minha Carteira'}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Este cliente será vinculado exclusivamente ao seu perfil de afiliado (<span className="text-indigo-400 font-semibold">{myAffiliateName}</span>).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#182236] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs">
              <div>
                <label className="text-neutral-300 font-medium block mb-1">
                  Nome Completo do Cliente *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo ou Maria Oliveira"
                  className="w-full px-3.5 py-2.5 bg-[#070A11] border border-[#1F273A] rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-300 font-medium block mb-1">
                    WhatsApp / Telefone *
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="(99) 99999-9999"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-[#070A11] border border-[#1F273A] rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-neutral-300 font-medium block mb-1">
                    E-mail (Opcional)
                  </label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="cliente@email.com"
                    className="w-full px-3.5 py-2.5 bg-[#070A11] border border-[#1F273A] rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-300 font-medium block mb-1">
                    CPF / Documento (Opcional)
                  </label>
                  <input
                    type="text"
                    value={clientDocumentCpf}
                    onChange={(e) => setClientDocumentCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-3.5 py-2.5 bg-[#070A11] border border-[#1F273A] rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-neutral-300 font-medium block mb-1">
                    Categoria
                  </label>
                  <select
                    value={clientCategory}
                    onChange={(e) => setClientCategory(e.target.value as CustomerCategory)}
                    className="w-full px-3.5 py-2.5 bg-[#070A11] border border-[#1F273A] rounded-xl text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="varejo">Varejo (Consumidor Comum)</option>
                    <option value="mensalista">Mensalista (Cliente Recorrente)</option>
                    <option value="empresa">Empresa / Corporativo</option>
                    <option value="confeitaria">Confeitaria / Encomendas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-neutral-300 font-medium block mb-1">
                  Endereço / Cidade (Opcional)
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="Rua, número, bairro ou cidade"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-[#070A11] border border-[#1F273A] rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-neutral-300 font-medium block mb-1">
                  Observações ou Preferências do Cliente
                </label>
                <textarea
                  rows={2}
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder="Ex: Gosta de pães quentes pela manhã, brownie 70% e café..."
                  className="w-full px-3.5 py-2.5 bg-[#070A11] border border-[#1F273A] rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1A2234]">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#1E273A] text-neutral-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingCustomer ? 'Salvar Alterações' : 'Cadastrar na Minha Carteira'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
