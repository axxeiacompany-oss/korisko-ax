import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBakery } from '../../context/BakeryContext';
import { supabase } from '../../lib/supabase';
import { Affiliate, Commission, Order } from '../../types';
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
  QrCode
} from 'lucide-react';

interface Props {
  onNavigateStore?: () => void;
  onLogout?: () => void;
}

export const AffiliateDashboardView: React.FC<Props> = ({ onNavigateStore, onLogout }) => {
  const { user, profile, signOut } = useAuth();
  const { language, t } = useBakery();

  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

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

          if (createErr) {
            console.warn('[Afiliado] Falha ao criar registro de afiliado:', createErr.message);
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

  // Calculations
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

  // Save payout info (Pix / Bank)
  const handleSavePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!affiliate) return;
    setIsSavingPayout(true);
    setPayoutNotice(null);

    try {
      const payload = {
        pix_key: pixKey.trim(),
        bank_info: {
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          holderName: holderName.trim(),
        },
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('affiliates')
        .update(payload)
        .eq('id', affiliate.id);

      if (error) {
        setPayoutNotice({ type: 'error', message: error.message });
      } else {
        setPayoutNotice({
          type: 'success',
          message: language === 'es' ? 'Datos de pago guardados con éxito.' : 'Dados de recebimento salvos com sucesso.',
        });
        setTimeout(() => setPayoutNotice(null), 3000);
      }
    } catch (err: any) {
      setPayoutNotice({ type: 'error', message: err.message });
    } finally {
      setIsSavingPayout(false);
    }
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
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300">
                  {affiliate?.commissionRate || 10}% Comissão
                </span>
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
                Compartilhe e Ganhe {affiliate?.commissionRate || 10}% em Cada Pedido
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
          
          {/* 1. Cliques */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0D121D] border border-[#1E273A] space-y-1">
            <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block">
              Cliques no Link
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-white font-mono-nums">
                {affiliate?.clicksCount || 0}
              </span>
              <span className="text-[10px] text-neutral-500">acessos</span>
            </div>
          </div>

          {/* 2. Pedidos Atribuídos */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0D121D] border border-[#1E273A] space-y-1">
            <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block">
              Vendas Concluídas
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-indigo-400 font-mono-nums">
                {totalSalesCount}
              </span>
              <span className="text-[10px] text-neutral-500">pedidos</span>
            </div>
          </div>

          {/* 3. Comissão Aprovada */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0D121D] border border-[#1E273A] space-y-1">
            <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block">
              Comissão Disponível
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono-nums">
                {formatCurrency(approvedEarnings, 'PYG')}
              </span>
              <span className="text-[10px] text-emerald-400/80 font-bold">Aprovada</span>
            </div>
          </div>

          {/* 4. Comissão Pendente */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0D121D] border border-[#1E273A] space-y-1">
            <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block">
              Comissão Pendente
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono-nums">
                {formatCurrency(pendingEarnings, 'PYG')}
              </span>
              <span className="text-[10px] text-amber-400/80">Em análise</span>
            </div>
          </div>

        </div>

        {/* Duas Colunas: Extrato de Comissões (8 cols) & Dados de Recebimento (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Extrato de Comissões */}
          <section className="lg:col-span-8 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Extrato de Comissões</span>
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
                  Envie seu link de indicação para amigos e clientes. Assim que realizarem uma compra, sua comissão aparecerá aqui automaticamente.
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
                          {new Date(c.createdAt).toLocaleString(language === 'es' ? 'es-PY' : 'pt-BR', { dateStyle: 'short', timeStyle: 'short' })} • Taxa: {c.rate}%
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

          {/* Dados para Recebimento (Pix / Banco) */}
          <section className="lg:col-span-4 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Wallet className="w-4 h-4 text-indigo-400" />
              <span>Dados para Pagamento</span>
            </h3>

            <div className="p-5 rounded-2xl bg-[#0D121D] border border-[#1E273A] space-y-4">
              <p className="text-xs text-neutral-400">
                Informe sua chave Pix ou conta para repasse das suas comissões acumuladas:
              </p>

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

              <form onSubmit={handleSavePayout} className="space-y-3 text-xs">
                <div>
                  <label className="text-neutral-300 font-medium block mb-1">
                    Chave Pix (E-mail, CPF, Telefone ou Aleatória)
                  </label>
                  <input
                    type="text"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="Sua chave Pix"
                    className="w-full px-3 py-2 bg-[#090D15] border border-[#1F273A] rounded-xl text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-neutral-300 font-medium block mb-1">
                    Nome do Titular
                  </label>
                  <input
                    type="text"
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value)}
                    placeholder="Nome completo titular"
                    className="w-full px-3 py-2 bg-[#090D15] border border-[#1F273A] rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-neutral-300 font-medium block mb-1">
                      Banco
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="Ex: Nubank / Itaú"
                      className="w-full px-3 py-2 bg-[#090D15] border border-[#1F273A] rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-300 font-medium block mb-1">
                      Conta / Agência
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Ag e Conta"
                      className="w-full px-3 py-2 bg-[#090D15] border border-[#1F273A] rounded-xl text-white focus:outline-none focus:border-indigo-500 font-mono"
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
          </section>

        </div>

      </main>

    </div>
  );
};
