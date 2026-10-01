import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Sale } from '../types';
import { 
  Zap, 
  Clock, 
  ShoppingBag, 
  ArrowUpRight, 
  Eye, 
  Volume2, 
  VolumeX, 
  Radio, 
  CheckCircle2, 
  Coins, 
  CreditCard, 
  Banknote, 
  Layers, 
  Flame, 
  Filter,
  X,
  Play,
  Pause,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { formatCurrency, fromBrl } from '../utils/currency';
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
  const { sales, exchangeRates, t, language, currentUser } = useBakery();
  const isAdmin = currentUser.role === 'admin';
  
  const [inspectSale, setInspectSale] = useState<Sale | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'all'>('today');
  const [nowTime, setNowTime] = useState<number>(Date.now());
  const prevSalesLengthRef = useRef<number>(sales.length);

  // Auto-refresh relative time display every 20 seconds when visible
  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        setNowTime(Date.now());
      }
    }, 20000);
    return () => clearInterval(timer);
  }, []);

  // Web Audio API subtle cash chime for live sales updates
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

  // Detect incoming new sale and trigger sound chime
  useEffect(() => {
    if (sales.length > prevSalesLengthRef.current) {
      playChime();
    }
    prevSalesLengthRef.current = sales.length;
  }, [sales.length]);

  // Today string for filtering
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Filtered sales stream sorted latest first
  const streamSales = useMemo(() => {
    let list = sales.filter(s => s.status === 'completed');
    if (filterPeriod === 'today') {
      list = list.filter(s => s.timestamp.startsWith(todayStr));
    }
    return list.slice().reverse();
  }, [sales, filterPeriod, todayStr]);

  // Stream metrics
  const totalRevenue = useMemo(() => {
    return streamSales.reduce((acc, s) => acc + s.totalBrl, 0);
  }, [streamSales]);

  const salesCount = streamSales.length;
  const ticketMedio = salesCount > 0 ? totalRevenue / salesCount : 0;

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
        return { label: 'PIX', icon: Zap, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' };
      case 'cartao_credito':
        return { label: 'Crédito', icon: CreditCard, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' };
      case 'cartao_debito':
        return { label: 'Débito', icon: CreditCard, color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' };
      case 'fiado':
        return { label: 'Fiado', icon: Clock, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
      default:
        return { label: method, icon: Coins, color: 'text-neutral-400 bg-neutral-800 border-neutral-700' };
    }
  };

  return (
    <>
      <div className={`flex flex-col ${mode === 'drawer' ? 'h-full bg-neutral-950 p-5' : 'p-5 rounded-2xl bg-neutral-900 border border-neutral-800'}`}>
        
        {/* Stream Top Control Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping absolute" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 relative" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-100 tracking-tight flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span>{language === 'es' ? 'Flujo Continuo de Ventas en Vivo' : 'Fluxo Contínuo de Vendas ao Vivo'}</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono-nums font-bold tracking-wider uppercase">
                  Realtime
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                {language === 'es' 
                  ? 'Transmisión ininterrumpida de cada venta y comanda en tiempo real' 
                  : 'Transmissão ininterrupta de cada venda e comanda em tempo real multi-aparelhos'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Filter today / all */}
            <div className="flex items-center bg-neutral-950 rounded-lg p-0.5 border border-neutral-800 text-[11px]">
              <button
                type="button"
                onClick={() => setFilterPeriod('today')}
                className={`px-2.5 py-1 rounded-md transition-colors ${filterPeriod === 'today' ? 'bg-neutral-800 text-neutral-100 font-semibold' : 'text-neutral-400 hover:text-neutral-200'}`}
              >
                {language === 'es' ? 'Hoy' : 'Hoje'}
              </button>
              <button
                type="button"
                onClick={() => setFilterPeriod('all')}
                className={`px-2.5 py-1 rounded-md transition-colors ${filterPeriod === 'all' ? 'bg-neutral-800 text-neutral-100 font-semibold' : 'text-neutral-400 hover:text-neutral-200'}`}
              >
                {language === 'es' ? 'Todas' : 'Todas'}
              </button>
            </div>

            {/* Sound toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${soundEnabled ? 'border-neutral-700 bg-neutral-800 text-emerald-400 hover:bg-neutral-750' : 'border-neutral-800 bg-neutral-950 text-neutral-500 hover:text-neutral-300'}`}
              title={soundEnabled ? (language === 'es' ? 'Desactivar sonido' : 'Desativar som do fluxo') : (language === 'es' ? 'Activar sonido' : 'Ativar som do fluxo')}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* Close if in drawer mode */}
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
        <div className="grid grid-cols-3 gap-2.5 my-3.5">
          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 flex flex-col">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold tracking-wider">
              {language === 'es' ? 'Ventas en el Flujo' : 'Vendas no Fluxo'}
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-bold text-neutral-100 font-mono-nums">{salesCount}</span>
              <span className="text-[10px] text-emerald-400 font-mono-nums">
                {salesCount > 0 ? (language === 'es' ? 'activas' : 'registradas') : (language === 'es' ? 'aguardando' : 'aguardando')}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 flex flex-col">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold tracking-wider">
              {language === 'es' ? 'Total Facturado' : 'Total Faturado'}
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-bold text-emerald-400 font-mono-nums">{formatCurrency(totalRevenue, 'BRL')}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 flex flex-col">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold tracking-wider">
              Ticket Médio
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-bold text-neutral-200 font-mono-nums">{formatCurrency(ticketMedio, 'BRL')}</span>
            </div>
          </div>
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
                  {language === 'es' ? 'Flujo Continuo Conectado y Esperando' : 'Fluxo Contínuo Conectado e Aguardando'}
                </h4>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  {language === 'es'
                    ? 'Todas las ventas y movimientos que ocurran en cualquier dispositivo se mostrarán aquí en vivo en tiempo real.'
                    : 'Como o sistema foi zerado, cada nova venda realizada no PDV ou no celular aparecerá aqui imediatamente em tempo real.'}
                </p>
              </div>

              {onNavigateToPdv && (
                <button
                  type="button"
                  onClick={onNavigateToPdv}
                  className="mt-1 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-neutral-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer transition-transform hover:scale-[1.02]"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-neutral-950" />
                  <span>{language === 'es' ? 'Realizar Primera Venta en PDV' : 'Realizar Primeira Venda no PDV'}</span>
                </button>
              )}
            </div>
          ) : (
            streamSales.map((sale, idx) => {
              const payment = sale.payments[0] || { method: 'dinheiro', currency: 'BRL', amountReceived: sale.totalBrl };
              const badge = getPaymentBadge(payment.method);
              const BadgeIcon = badge.icon;
              const relativeTime = getRelativeTime(sale.timestamp);
              const isRecent = idx === 0;

              // Currency conversions
              const pygValue = fromBrl(sale.totalBrl, 'PYG', exchangeRates);
              const usdValue = fromBrl(sale.totalBrl, 'USD', exchangeRates);

              return (
                <div
                  key={sale.id}
                  className={`p-3.5 rounded-xl border transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isRecent 
                      ? 'bg-neutral-950/90 border-emerald-500/40 shadow-sm shadow-emerald-500/10' 
                      : 'bg-neutral-950/50 border-neutral-850 hover:border-neutral-750'
                  }`}
                >
                  {/* Left Column: Number, Seller, Time, Items */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0 text-xs font-bold text-neutral-200 font-mono-nums">
                      #{sale.saleNumber || sale.id.slice(-4)}
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
                      </div>

                      {/* Items Preview */}
                      <div className="flex flex-wrap gap-1.5 text-[11px] text-neutral-400">
                        {sale.items.map((item, itemIdx) => (
                          <span 
                            key={itemIdx} 
                            className="inline-flex items-center px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-300"
                          >
                            <strong className="text-emerald-400 mr-1 font-mono-nums">{item.quantity}x</strong> 
                            {item.product.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Multi-Currency Total & Action */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-850">
                    <div className="text-right">
                      <div className="text-sm font-bold text-neutral-100 font-mono-nums">
                        {formatCurrency(sale.totalBrl, 'BRL')}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-mono-nums justify-end">
                        <span>₲ {Math.round(pygValue).toLocaleString('es-PY')}</span>
                        <span>•</span>
                        <span>$ {usdValue.toFixed(2)}</span>
                      </div>
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
