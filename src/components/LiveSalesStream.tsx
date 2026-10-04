import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Sale } from '../types';
import { formatSetorName } from '../lib/db';
import { 
  Zap, 
  Clock, 
  ShoppingBag, 
  Eye, 
  Volume2, 
  VolumeX, 
  Radio, 
  Coins, 
  CreditCard, 
  Banknote, 
  X,
  Trash2,
  BookOpen,
  ShieldCheck,
  UserCheck,
  Landmark,
  RotateCcw,
  UtensilsCrossed
} from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import { ReceiptModal } from './modals/ReceiptModal';
import { DeleteSaleModal } from './modals/DeleteSaleModal';

interface Props {
  mode?: 'embedded' | 'drawer';
  onClose?: () => void;
  onNavigateToPdv?: () => void;
}

export const LiveSalesStream: React.FC<Props> = ({ 
  mode = 'embedded', 
  onClose,
  onNavigateToPdv 
}) => {
  const {
    sales,
    openComandas,
    activeCheckouts,
    customerEntries,
    customers,
    liveDebtorBalances,
    language,
    currentUser,
    deleteCustomerEntry,
    clearAllCustomerEntries,
    clearCheckoutSession,
    removeComanda,
    zeroAllNumbersForRealTest,
  } = useBakery();
  const isAdmin = currentUser.role === 'admin';
  
  const [inspectSale, setInspectSale] = useState<Sale | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [confirmZeroAll, setConfirmZeroAll] = useState<boolean>(false);
  const [confirmClearFiado, setConfirmClearFiado] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'all'>('all');
  const [nowTime, setNowTime] = useState<number>(Date.now());
  const prevSalesLengthRef = useRef<number>(sales.length);
  const prevEntriesLengthRef = useRef<number>((customerEntries || []).length);

  // Auto-refresh relative time display every 10 seconds when visible
  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        setNowTime(Date.now());
      }
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Web Audio API subtle cash chime for live sales & fiado updates
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  };

  // Detect incoming new sale or new fiado entry and trigger sound chime
  useEffect(() => {
    if (sales.length > prevSalesLengthRef.current || (customerEntries || []).length > prevEntriesLengthRef.current) {
      playChime();
    }
    prevSalesLengthRef.current = sales.length;
    prevEntriesLengthRef.current = (customerEntries || []).length;
  }, [sales.length, customerEntries]);

  // Helper to check if a timestamp belongs to the current local day
  const isSameLocalDay = (isoDate?: string) => {
    if (!isoDate) return false;
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return false;
    const now = new Date(nowTime);
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  // Active open comandas sorted latest first
  const activeComandasList = useMemo(() => {
    const list = (openComandas || []).filter(
      c => c.status !== 'pago' && c.status !== 'cancelado'
    );
    return list
      .slice()
      .sort((a, b) => new Date(b.updatedAt || b.openedAt).getTime() - new Date(a.updatedAt || a.openedAt).getTime());
  }, [openComandas]);

  // Filtered sales stream sorted latest first (explicit descending timestamp sort, NOT .reverse()!)
  const streamSales = useMemo(() => {
    let list = (sales || []).filter(s => s && s.status === 'completed');
    if (filterPeriod === 'today') {
      list = list.filter(s => isSameLocalDay(s.timestamp));
    }
    return list
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [sales, filterPeriod, nowTime]);

  // Recent Fiado entries sorted latest first
  const recentFiadoEntries = useMemo(() => {
    let list = (customerEntries || []).slice();
    if (filterPeriod === 'today') {
      list = list.filter(e => isSameLocalDay(e.date));
    }
    return list
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 12);
  }, [customerEntries, filterPeriod, nowTime]);

  // Stream metrics (Sales + Open Comandas + Fiado / Debtors)
  const totalSalesRevenue = useMemo(() => {
    return streamSales.reduce((acc, s) => acc + (Number(s.totalBrl) || 0), 0);
  }, [streamSales]);

  const totalOpenComandasBrl = useMemo(() => {
    return activeComandasList.reduce((acc, c) => {
      const cmdSum = c.totalBrl !== undefined && Number(c.totalBrl) > 0
        ? Number(c.totalBrl)
        : (c.items || []).reduce((s, it) => s + (Number(it.subtotalBrl) || (Number(it.unitPriceBrl || it.product?.priceBrl || 0) * Number(it.quantity || 1))), 0);
      return acc + cmdSum;
    }, 0);
  }, [activeComandasList]);

  const totalRevenue = totalSalesRevenue;

  const totalFiadoRegistered = useMemo(() => {
    // Sum from sales in period
    const fiadoFromSales = streamSales.reduce((acc, s) => {
      const fiadoPart = (s.payments || [])
        .filter(p => p && p.method === 'fiado')
        .reduce((sum, p) => sum + (Number(p.equivalentBrl ?? p.amountReceived) || 0), 0);
      return acc + fiadoPart;
    }, 0);

    // Sum from customerEntries (debito_compra) that are not already counted via saleId
    const countedSaleIds = new Set(streamSales.map(s => s.id));
    const entriesList = filterPeriod === 'today'
      ? (customerEntries || []).filter(e => isSameLocalDay(e.date))
      : (customerEntries || []);

    const extraFiadoEntries = entriesList
      .filter(e => e && e.type === 'debito_compra' && (!e.saleId || !countedSaleIds.has(e.saleId)))
      .reduce((acc, e) => acc + (Number(e.amountBrl) || 0), 0);

    const combinedFiado = fiadoFromSales + extraFiadoEntries;

    if (filterPeriod === 'all') {
      const totalOutstandingCustomers = (customers || []).reduce(
        (acc, c) => acc + (Number(c.outstandingBalanceBrl) || 0),
        0
      );
      const totalLiveDebtors = (liveDebtorBalances || []).reduce(
        (acc, d) => acc + (Number(d.currentDebtBalanceBrl) || 0),
        0
      );
      return Math.max(combinedFiado, totalOutstandingCustomers, totalLiveDebtors);
    }

    return combinedFiado;
  }, [streamSales, customerEntries, customers, liveDebtorBalances, filterPeriod, nowTime]);

  const salesCount = streamSales.length;

  // Relative time helper
  const getRelativeTime = (timestamp: string) => {
    const elapsedSeconds = Math.max(0, Math.floor((nowTime - new Date(timestamp).getTime()) / 1000));
    if (elapsedSeconds < 5) {
      return language === 'es' ? 'ahora mismo' : 'agora mesmo';
    }
    if (elapsedSeconds < 60) {
      return language === 'es' ? `hace ${elapsedSeconds}s` : `há ${elapsedSeconds}s`;
    }
    const minutes = Math.floor(elapsedSeconds / 60);
    if (minutes < 60) {
      return language === 'es' ? `hace ${minutes}m` : `há ${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return language === 'es' ? `hace ${hours}h` : `há ${hours}h`;
    }
    return new Date(timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  // Format payment method
  const getPaymentBadge = (method: string) => {
    switch (method) {
      case 'dinheiro':
        return { label: 'Dinheiro', icon: Banknote, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
      case 'pix':
        return { label: 'PIX / QR', icon: Zap, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' };
      case 'cartao_credito':
        return { label: 'Crédito', icon: CreditCard, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' };
      case 'cartao_debito':
        return { label: 'Débito', icon: CreditCard, color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' };
      case 'transferencia':
        return { label: 'Transferência', icon: Landmark, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
      case 'fiado':
        return { label: 'FIADO / CADERNETA', icon: BookOpen, color: 'text-rose-300 bg-rose-500/20 border-rose-500/40 font-black' };
      default:
        return { label: method, icon: Coins, color: 'text-neutral-400 bg-neutral-800 border-neutral-700' };
    }
  };

  return (
    <>
      <div className={`flex flex-col ${mode === 'drawer' ? 'h-full bg-[#07090E] p-5' : 'p-5 rounded-2xl bg-[#0B0F17] border border-[#C89B6E]/20 shadow-xl'}`}>
        
        {/* Stream Top Control Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#C89B6E]/15">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#C89B6E]/10 border border-[#C89B6E]/30 flex items-center justify-center shrink-0">
              <Radio className="w-4 h-4 text-[#C89B6E]" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-[#F2D6B8] tracking-tight flex items-center gap-2" style={{ fontFamily: "'Cinzel', serif" }}>
                  <span>
                    {language === 'es'
                      ? 'Movimiento de Ventas, Cobros & Caderneta'
                      : 'Movimentação do Turno: Vendas, Comandas & Caderneta'}
                  </span>
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#C89B6E]/15 border border-[#C89B6E]/30 text-[#F2D6B8] text-[10px] font-mono-nums font-bold tracking-wider uppercase">
                  Consolidado
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Korizko • Panificação confeitaria artesanal — Acompanhamento executivo de vendas, comandas e pagamentos
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
            {/* Zerar Todos os Números (Iniciar Teste Real - Exclusivo Admin) */}
            {isAdmin && (
              !confirmZeroAll ? (
                <button
                  type="button"
                  onClick={() => setConfirmZeroAll(true)}
                  className="px-2.5 py-1.5 rounded-lg border border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Zerar todos os números (vendas, fiado, saldos e caixa) para iniciar teste real (Exclusivo Admin)"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                  <span>Zerar Todos os Números</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 bg-rose-950/60 border border-rose-500/50 rounded-lg px-2 py-1">
                  <span className="text-[10px] font-bold text-rose-200">Confirmar zerar tudo?</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await zeroAllNumbersForRealTest();
                      setConfirmZeroAll(false);
                    }}
                    className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black cursor-pointer"
                  >
                    Sim, Zerar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmZeroAll(false)}
                    className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[10px] cursor-pointer"
                  >
                    Não
                  </button>
                </div>
              )
            )}

            {/* Filter today / all */}
            <div className="flex items-center bg-neutral-950 rounded-lg p-0.5 border border-neutral-800 text-[11px]">
              <button
                type="button"
                onClick={() => setFilterPeriod('today')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${filterPeriod === 'today' ? 'bg-neutral-800 text-neutral-100 font-semibold' : 'text-neutral-400 hover:text-neutral-200'}`}
              >
                {language === 'es' ? 'Hoy' : 'Hoje'}
              </button>
              <button
                type="button"
                onClick={() => setFilterPeriod('all')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${filterPeriod === 'all' ? 'bg-neutral-800 text-neutral-100 font-semibold' : 'text-neutral-400 hover:text-neutral-200'}`}
              >
                {language === 'es' ? 'Todas' : 'Todas'}
              </button>
            </div>

            {/* Sound toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${soundEnabled ? 'border-neutral-700 bg-neutral-800 text-emerald-400 hover:bg-neutral-750' : 'border-neutral-800 bg-neutral-950 text-neutral-500 hover:text-neutral-300'}`}
              title={soundEnabled ? 'Desativar som' : 'Ativar som'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {mode === 'drawer' && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Live Counters Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3.5">
          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 flex flex-col">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold tracking-wider">
              {language === 'es' ? 'Ventas en el Flujo' : 'Vendas no Fluxo'}
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-bold text-neutral-100 font-mono-nums">{salesCount}</span>
              <span className="text-[10px] text-emerald-400 font-mono-nums">
                {salesCount > 0 ? 'registradas' : 'aguardando'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 flex flex-col">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold tracking-wider">
              {language === 'es' ? 'Total Facturado' : 'Total Faturado'}
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-bold text-amber-400 font-mono-nums">{formatCurrency(totalRevenue, 'PYG')}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-neutral-950 border border-amber-500/25 flex flex-col">
            <span className="text-[10px] text-amber-300 uppercase font-bold tracking-wider flex items-center gap-1">
              <UtensilsCrossed className="w-3 h-3 text-amber-400" />
              Comandas Abertas ({activeComandasList.length})
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-amber-300 font-mono-nums">{formatCurrency(totalOpenComandasBrl, 'PYG')}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-neutral-950 border border-rose-500/30 flex flex-col">
            <span className="text-[10px] text-rose-300 uppercase font-bold tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-rose-400" />
              {filterPeriod === 'today' ? 'Fiado Hoje' : 'Fiado & Caderneta'}
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-rose-400 font-mono-nums">{formatCurrency(totalFiadoRegistered, 'PYG')}</span>
            </div>
          </div>
        </div>

        {/* Active Open Comandas in Shift */}
        {activeComandasList.length > 0 && (
          <div className="mb-3.5 p-3.5 rounded-xl bg-neutral-950/90 border border-amber-500/30 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400" />
                <span>Comandas em Andamento no Turno ({activeComandasList.length})</span>
              </span>
              {onNavigateToPdv && (
                <button
                  type="button"
                  onClick={onNavigateToPdv}
                  className="text-[10px] font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                >
                  Cobrar no PDV →
                </button>
              )}
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {activeComandasList.map(cmd => {
                const cmdTotal = cmd.totalBrl !== undefined && Number(cmd.totalBrl) > 0
                  ? Number(cmd.totalBrl)
                  : (cmd.items || []).reduce((s, it) => s + (Number(it.subtotalBrl) || (Number(it.unitPriceBrl || it.product?.priceBrl || 0) * Number(it.quantity || 1))), 0);
                return (
                  <div
                    key={cmd.id}
                    className="p-2.5 rounded-lg bg-[#080B12] border border-amber-500/25 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-black font-mono-nums">
                          Comanda #{cmd.number}
                        </span>
                        <span className="font-bold text-white">
                          {cmd.customerName || 'Cliente Balcão'}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-semibold">
                          Setor: {formatSetorName(cmd.setorResponsavel)}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono-nums">
                          {getRelativeTime(cmd.updatedAt || cmd.openedAt)}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate">
                        {(cmd.items || []).map(i => `${i.quantity}x ${i.product?.name || (i as any).name || 'Item'}`).join(', ')}
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                      <span className="font-mono-nums font-black text-amber-400">
                        {formatCurrency(cmdTotal, 'PYG')}
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => removeComanda(cmd.id)}
                          className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 text-[10px] cursor-pointer"
                          title="Cancelar Comanda"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Real-Time Fiado & Amortization Ledger Entries with Full Delete & Zero Controls */}
        <div className="mb-3.5 p-3.5 rounded-xl bg-neutral-950/90 border border-neutral-800 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-rose-400" />
              <span>Últimos Registros na Tabela de Fiado & Conta Corrente</span>
            </span>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-neutral-400 font-mono-nums">
                {recentFiadoEntries.length} {recentFiadoEntries.length === 1 ? 'lançamento' : 'lançamentos'}
              </span>

              {isAdmin && recentFiadoEntries.length > 0 && (
                !confirmClearFiado ? (
                  <button
                    type="button"
                    onClick={() => setConfirmClearFiado(true)}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Apagar todos os registros da Tabela de Fiado & Conta Corrente (Exclusivo Admin)"
                  >
                    <Trash2 className="w-3 h-3 text-rose-400" />
                    <span>Apagar Todos</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1 bg-rose-950/70 border border-rose-500/50 rounded-lg px-2 py-0.5">
                    <span className="text-[10px] font-bold text-rose-200">Confirmar?</span>
                    <button
                      type="button"
                      onClick={() => {
                        clearAllCustomerEntries();
                        setConfirmClearFiado(false);
                      }}
                      className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-black cursor-pointer"
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearFiado(false)}
                      className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[10px] cursor-pointer"
                    >
                      Não
                    </button>
                  </div>
                )
              )}
            </div>
          </div>

          {recentFiadoEntries.length === 0 ? (
            <div className="py-3 px-3 rounded-lg bg-[#080B12] border border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
              <span>Nenhum registro na Tabela de Fiado & Conta Corrente. Números zerados para teste real.</span>
              <span className="text-[10px] font-mono-nums text-emerald-400 font-bold">₲ 0</span>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {recentFiadoEntries.map(entry => {
                const isDebt = entry.type === 'debito_compra';
                return (
                  <div
                    key={entry.id}
                    className={`p-2.5 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      isDebt
                        ? 'bg-rose-950/20 border-rose-500/30'
                        : 'bg-emerald-950/20 border-emerald-500/30'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${
                          isDebt ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {isDebt ? 'NOVO FIADO LANÇADO' : `PAGAMENTO (${(entry.paymentMethod || 'CAIXA').toUpperCase()})`}
                        </span>
                        <span className="font-bold text-white">
                          {entry.customerName || 'Cliente Cadastrado'}
                        </span>
                        {entry.comandaNumber && (
                          <span className="text-[10px] font-mono-nums text-amber-300">
                            #{entry.comandaNumber}
                          </span>
                        )}
                        <span className="text-[10px] text-neutral-400 font-mono-nums">
                          {getRelativeTime(entry.date)}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-400 break-words">
                        {entry.description}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-white/5">
                      <div className="text-right font-mono-nums">
                        <div className={`font-black ${isDebt ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {isDebt ? '+' : '-'}{formatCurrency(entry.amountBrl, 'PYG')}
                        </div>
                        {entry.resultingBalanceBrl !== undefined && (
                          <div className="text-[10px] text-neutral-400">
                            Saldo: <strong className="text-amber-300">{formatCurrency(entry.resultingBalanceBrl, 'PYG')}</strong>
                          </div>
                        )}
                      </div>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => deleteCustomerEntry(entry.id)}
                          className="px-2 py-1.5 rounded-lg border border-rose-500/35 bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 hover:text-white text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Apagar este registro da Tabela de Fiado & Conta Corrente (Exclusivo Admin)"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span>Apagar</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stream List / Timeline Feed */}
        <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[480px] pr-1 scrollbar-thin scrollbar-thumb-neutral-800">
          {streamSales.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-neutral-950/60 border border-neutral-800/60 flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h4 className="text-xs font-bold text-neutral-200">
                  {language === 'es' ? 'Flujo Continuo Conectado y Esperando' : 'Fluxo Contínuo Conectado em Tempo Real'}
                </h4>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Toda venda, comanda ou cobrança em Fiado/PIX/Dinheiro aparecerá aqui instantaneamente na hora em que for selecionada ou confirmada.
                </p>
              </div>

              {onNavigateToPdv && (
                <button
                  type="button"
                  onClick={onNavigateToPdv}
                  className="mt-1 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-neutral-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer transition-transform hover:scale-[1.02]"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-neutral-950" />
                  <span>{language === 'es' ? 'Ir al PDV' : 'Abrir PDV Agora'}</span>
                </button>
              )}
            </div>
          ) : (
            streamSales.map((sale, idx) => {
              const paymentsList = Array.isArray(sale.payments) ? sale.payments : [];
              const hasFiado = paymentsList.some(p => p && p.method === 'fiado');
              const payment = hasFiado
                ? paymentsList.find(p => p && p.method === 'fiado')!
                : (paymentsList[0] || { method: 'dinheiro', currency: 'PYG', amountReceived: sale.totalBrl });
              const badge = getPaymentBadge(payment.method);
              const BadgeIcon = badge.icon;
              const relativeTime = getRelativeTime(sale.timestamp);
              const isRecent = idx === 0;
              const saleItems = Array.isArray(sale.items) ? sale.items : [];

              return (
                <div
                  key={sale.id}
                  className={`p-3.5 rounded-xl border transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    hasFiado
                      ? 'bg-rose-950/20 border-rose-500/40 shadow-sm shadow-rose-500/10'
                      : isRecent 
                        ? 'bg-neutral-950/90 border-emerald-500/40 shadow-sm shadow-emerald-500/10' 
                        : 'bg-neutral-950/50 border-neutral-850 hover:border-neutral-750'
                  }`}
                >
                  {/* Left Column: Number, Seller, Time, Items */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0 text-xs font-bold text-neutral-200 font-mono-nums">
                      #{sale.saleNumber || (sale.id || '').slice(-4)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-neutral-200">
                          {sale.employeeName || 'Operador'}
                        </span>
                        
                        <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono-nums">
                          <Clock className="w-3 h-3" />
                          <span>{relativeTime}</span>
                        </span>

                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${badge.color}`}>
                          <BadgeIcon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>

                        {sale.customerName && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                            Cliente: {sale.customerName}
                          </span>
                        )}

                        {sale.comandaNumber && (
                          <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[10px] font-mono-nums">
                            {sale.comandaNumber}
                          </span>
                        )}
                      </div>

                      {/* Items Preview */}
                      <div className="flex flex-wrap gap-1.5 text-[11px] text-neutral-400">
                        {saleItems.map((item, itemIdx) => (
                          <span 
                            key={itemIdx} 
                            className="inline-flex items-center px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-300"
                          >
                            <strong className="text-amber-400 mr-1 font-mono-nums">{item.quantity}x</strong> 
                            {item.product?.name || (item as any).productName || (item as any).name || 'Produto'}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Guaraní Total & Action */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-850">
                    <div className="text-right">
                      <div className={`text-base font-bold font-mono-nums ${hasFiado ? 'text-rose-400' : 'text-amber-400'}`}>
                        {formatCurrency(sale.totalBrl, 'PYG')}
                      </div>
                      {sale.setorResponsavel && (
                        <div className="text-[10px] text-neutral-400">
                          {sale.setorResponsavel}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setInspectSale(sale)}
                        className="p-1.5 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 transition-colors cursor-pointer"
                        title={language === 'es' ? 'Ver Comprobante' : 'Ver Cupom Fiscal'}
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setSaleToDelete(sale)}
                          className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                          title={language === 'es' ? 'Excluir Venta (Solo Admin)' : 'Excluir Venda (Somente Admin)'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Inspection Modal */}
      {inspectSale && (
        <ReceiptModal
          sale={inspectSale}
          onClose={() => setInspectSale(null)}
        />
      )}

      {/* Delete Sale Modal (Admin Exclusive) */}
      <DeleteSaleModal
        isOpen={Boolean(saleToDelete)}
        sale={saleToDelete}
        onClose={() => setSaleToDelete(null)}
      />
    </>
  );
};
