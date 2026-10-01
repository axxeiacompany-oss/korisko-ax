import React, { useState, useMemo } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { formatCurrency, fromBrl } from '../../utils/currency';
import { 
  Lock, 
  Unlock, 
  ArrowDownRight, 
  ArrowUpRight, 
  Clock, 
  User, 
  DollarSign, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Trash2,
  Eye,
  ShoppingBag
} from 'lucide-react';
import { SangriaSuprimentoModal } from '../modals/SangriaSuprimentoModal';
import { CloseRegisterModal } from '../modals/CloseRegisterModal';
import { OpenRegisterModal } from '../modals/OpenRegisterModal';
import { ReceiptModal } from '../modals/ReceiptModal';
import { DeleteSaleModal } from '../modals/DeleteSaleModal';
import { Sale } from '../../types';

export const CashRegisterView: React.FC = () => {
  const { currentSession, sessionHistory, sales, hasPermission, t, language, currentUser, exchangeRates } = useBakery();
  const isAdmin = currentUser.role === 'admin';

  const [isSaidaOpen, setIsSaidaOpen] = useState(false);
  const [isEntradaOpen, setIsEntradaOpen] = useState(false);
  const [isCloseRegisterOpen, setIsCloseRegisterOpen] = useState(false);
  const [isOpenRegisterOpen, setIsOpenRegisterOpen] = useState(false);
  const [inspectSale, setInspectSale] = useState<Sale | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);

  const canManageRegister = hasPermission(['admin', 'gerente']);

  // Filter sales completed in the current register session
  const currentSessionSales = useMemo(() => {
    return sales.filter(s => s.registerSessionId === currentSession.id && s.status === 'completed');
  }, [sales, currentSession.id]);

  // Compute live money in drawer in Guaraní
  const drawerBalances = useMemo(() => {
    let pygCash = currentSession.initialFloat.pyg || currentSession.initialFloat.brl || 0;

    let totalPix = 0;
    let totalDebito = 0;
    let totalCredito = 0;

    currentSessionSales.forEach(s => {
      s.payments.forEach(p => {
        const val = p.amountReceived || p.equivalentBrl || 0;
        if (p.method === 'dinheiro') {
          pygCash += val;
        } else if (p.method === 'pix') {
          totalPix += val;
        } else if (p.method === 'cartao_debito') {
          totalDebito += val;
        } else if (p.method === 'cartao_credito') {
          totalCredito += val;
        }
      });

      if (s.changeGiven && s.changeGiven.amount > 0) {
        pygCash -= s.changeGiven.amount;
      }
    });

    currentSession.transactions.forEach(t => {
      const isEntrada = t.type === 'suprimento' || (t.type as string) === 'entrada';
      const mult = isEntrada ? 1 : -1;
      pygCash += mult * (t.amount || 0);
    });

    return {
      brl: Math.round(pygCash),
      pyg: Math.round(pygCash),
      usd: 0,
      totalPix,
      totalDebito,
      totalCredito,
    };
  }, [currentSession, currentSessionSales]);

  // Compute total entradas and saidas in current session
  const transactionTotals = useMemo(() => {
    let entradasBrl = 0;
    let saidasBrl = 0;
    currentSession.transactions.forEach(t => {
      const isEntrada = t.type === 'suprimento' || (t.type as string) === 'entrada';
      const val = t.amount || 0;
      if (isEntrada) {
        entradasBrl += val;
      } else {
        saidasBrl += val;
      }
    });
    return {
      entradasBrl,
      saidasBrl,
    };
  }, [currentSession.transactions]);

  const isRegisterOpen = currentSession.status === 'aberto';

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300 pb-24 lg:pb-0">
      
      {/* Session Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isRegisterOpen
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
          }`}>
            {isRegisterOpen ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-neutral-100">
                {language === 'es' ? 'Caja' : 'Caixa'} #{currentSession.sessionNumber}
              </h2>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                isRegisterOpen 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {isRegisterOpen 
                  ? (language === 'es' ? 'ABIERTA' : 'ABERTO') 
                  : (language === 'es' ? 'CERRADA' : 'FECHADO')}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>{language === 'es' ? 'Abierta por:' : 'Aberto por:'} <strong className="text-neutral-300">{currentSession.openedBy}</strong></span>
              <span aria-hidden="true" className="hidden sm:inline">·</span>
              <span>{language === 'es' ? 'Inicio:' : 'Início:'} {new Date(currentSession.openedAt).toLocaleTimeString(language === 'es' ? 'es-PY' : 'pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </p>
          </div>
        </div>

        {/* Action buttons - 2 columns on mobile for easy tapping */}
        <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
          {isRegisterOpen ? (
            <>
              <button
                type="button"
                onClick={() => setIsEntradaOpen(true)}
                className="px-3.5 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/25 hover:bg-emerald-900/35 active:scale-95 text-emerald-300 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                <span>{language === 'es' ? '+ Entrada' : '+ Entrada'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSaidaOpen(true)}
                className="px-3.5 py-2.5 rounded-xl border border-rose-500/30 bg-rose-950/25 hover:bg-rose-900/35 active:scale-95 text-rose-300 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <ArrowDownRight className="w-4 h-4 text-rose-400 stroke-[2.5]" />
                <span>{language === 'es' ? '- Salida' : '- Saída'}</span>
              </button>
              {canManageRegister && (
                <button
                  type="button"
                  onClick={() => setIsCloseRegisterOpen(true)}
                  className="col-span-2 sm:col-span-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>{language === 'es' ? 'Cerrar Caja' : 'Fechar Caixa'}</span>
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsOpenRegisterOpen(true)}
              className="col-span-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>{language === 'es' ? 'Abrir Nueva Caja' : 'Abrir Novo Caixa'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Physical Cash Drawer Balance (Guaraní) */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
          {language === 'es' ? 'Dinero Físico en Gaveta (₲ Guaraní)' : 'Dinheiro Físico na Gaveta (₲ Guaraní)'}
        </label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Main Guaraní Cash Card */}
          <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-300 font-bold flex items-center gap-1.5">
                <span className="text-amber-400 font-black">🇵🇾 ₲</span>
                <span>{language === 'es' ? 'Efectivo en Guaraníes' : 'Dinheiro Físico em Guaranis'}</span>
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                PYG (₲)
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-amber-400 font-mono-nums">
              {formatCurrency(drawerBalances.pyg, 'PYG')}
            </div>
            <div className="flex items-center justify-between text-xs text-neutral-400 pt-2 border-t border-neutral-800 font-mono-nums">
              <span>{language === 'es' ? 'Fondo inicial:' : 'Fundo inicial:'}</span>
              <strong className="text-neutral-200">{formatCurrency(currentSession.initialFloat.pyg, 'PYG')}</strong>
            </div>
          </div>

          {/* Quick Cash Flow Summary */}
          <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between space-y-3">
            <span className="text-xs font-bold text-neutral-300">
              {language === 'es' ? 'Flujo de Caja del Turno' : 'Fluxo de Caixa do Turno'}
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
                <span className="text-[11px] text-emerald-400 block font-medium">+ Entradas</span>
                <span className="text-base font-bold text-emerald-300 font-mono-nums">
                  {formatCurrency(transactionTotals.entradasBrl, 'PYG')}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20">
                <span className="text-[11px] text-rose-400 block font-medium">- Salidas</span>
                <span className="text-base font-bold text-rose-300 font-mono-nums">
                  {formatCurrency(transactionTotals.saidasBrl, 'PYG')}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Other Payment Methods (Electronic / Digital) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
          <span className="text-xs text-neutral-400">Transferencia / QR:</span>
          <span className="text-sm font-bold text-neutral-100 font-mono-nums">
            {formatCurrency(drawerBalances.totalPix, 'PYG')}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
          <span className="text-xs text-neutral-400">{language === 'es' ? 'Tarjeta Débito:' : 'Cartão de Débito:'}</span>
          <span className="text-sm font-bold text-neutral-100 font-mono-nums">
            {formatCurrency(drawerBalances.totalDebito, 'PYG')}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
          <span className="text-xs text-neutral-400">{language === 'es' ? 'Tarjeta Crédito:' : 'Cartão de Crédito:'}</span>
          <span className="text-sm font-bold text-neutral-100 font-mono-nums">
            {formatCurrency(drawerBalances.totalCredito, 'PYG')}
          </span>
        </div>
      </div>

      {/* 2-Column: Current Session Sangrias/Suprimentos & Historical Closures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Entradas & Saídas Table */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4 text-amber-400" />
              {language === 'es' ? 'Movimientos de Caja: Entradas & Salidas' : 'Movimentações de Caixa: Entradas & Saídas'} ({currentSession.transactions.length})
            </h3>
            <span className="text-xs text-neutral-400 font-medium">
              {language === 'es' ? 'Auditoría del Turno' : 'Auditoria do Turno'}
            </span>
          </div>

          {/* Quick totals bar */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-900/30 flex items-center justify-between">
              <span className="text-emerald-400/80 font-medium">{language === 'es' ? 'Total Entradas:' : 'Total Entradas:'}</span>
              <span className="font-bold text-emerald-300 font-mono-nums">+{formatCurrency(transactionTotals.entradasBrl, 'BRL')}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-900/30 flex items-center justify-between">
              <span className="text-rose-400/80 font-medium">{language === 'es' ? 'Total Salidas:' : 'Total Saídas:'}</span>
              <span className="font-bold text-rose-300 font-mono-nums">-{formatCurrency(transactionTotals.saidasBrl, 'BRL')}</span>
            </div>
          </div>

          <div className="space-y-2">
            {currentSession.transactions.length === 0 ? (
              <p className="text-xs text-neutral-500 py-6 text-center">
                {language === 'es' ? 'Ninguna entrada o salida registrada en este turno.' : 'Nenhuma entrada ou saída registrada neste turno.'}
              </p>
            ) : (
              currentSession.transactions.map(t => {
                const isEntrada = t.type === 'suprimento' || (t.type as string) === 'entrada';
                const timeStr = new Date(t.timestamp).toLocaleTimeString(language === 'es' ? 'es-PY' : 'pt-BR', { hour: '2-digit', minute: '2-digit' });

                return (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-[#0A0E18] border border-[#1F273A] hover:border-neutral-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                          isEntrada ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25' : 'bg-rose-500/15 text-rose-300 border border-rose-500/25'
                        }`}>
                          {isEntrada ? (language === 'es' ? '+ Entrada' : '+ Entrada') : (language === 'es' ? '- Salida' : '- Saída')}
                        </span>
                        {t.category && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#161D2E] text-neutral-300 border border-[#242F47]">
                            {t.category}
                          </span>
                        )}
                        <span className="font-semibold text-neutral-200">{t.reason}</span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-neutral-500">
                        <span>{language === 'es' ? 'Responsable:' : 'Responsável:'} <strong className="text-neutral-300 font-medium">{t.employeeName}</strong> · {timeStr}</span>
                        {t.documentNumber && (
                          <>
                            <span>·</span>
                            <span className="text-neutral-400 font-mono">Doc: {t.documentNumber}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <span className={`text-sm font-bold font-mono-nums ${
                        isEntrada ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isEntrada ? '+' : '-'}{formatCurrency(t.amount, t.currency)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Historical Closed Sessions Archive */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              {language === 'es' ? 'Historial de Cajas Cerradas' : 'Histórico de Caixas Fechados'} ({sessionHistory.length})
            </h3>
            <span className="text-xs text-neutral-500">{language === 'es' ? 'Auditoría' : 'Auditoria'}</span>
          </div>

          <div className="space-y-2.5">
            {sessionHistory.length === 0 ? (
              <p className="text-xs text-neutral-500 py-6 text-center">
                {language === 'es' ? 'Aún no hay cajas cerradas en el historial reciente.' : 'Ainda não há caixas fechados no histórico recente.'}
              </p>
            ) : (
              sessionHistory.map(s => {
                const locale = language === 'es' ? 'es-PY' : 'pt-BR';
                const closedDate = s.closedAt ? new Date(s.closedAt).toLocaleDateString(locale) : '—';
                const closedTime = s.closedAt ? new Date(s.closedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '—';

                return (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-200">{language === 'es' ? 'Caja' : 'Caixa'} #{s.sessionNumber}</span>
                      <span className="text-neutral-500 text-[11px] font-mono-nums">
                        {closedDate} {language === 'es' ? 'a las' : 'às'} {closedTime}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-neutral-850">
                      <div>
                        <span className="text-[10px] text-neutral-500 block">{language === 'es' ? 'Contado R$' : 'Contado R$'}</span>
                        <span className="font-mono-nums font-semibold text-neutral-200">
                          {formatCurrency(s.countedOnClose?.brl || 0, 'BRL')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 block">{language === 'es' ? 'Contado ₲' : 'Contado ₲'}</span>
                        <span className="font-mono-nums font-semibold text-amber-400">
                          {formatCurrency(s.countedOnClose?.pyg || 0, 'PYG')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 block">{language === 'es' ? 'Contado $' : 'Contado $'}</span>
                        <span className="font-mono-nums font-semibold text-emerald-400">
                          {formatCurrency(s.countedOnClose?.usd || 0, 'USD')}
                        </span>
                      </div>
                    </div>

                    {s.closingNotes && (
                      <p className="text-[11px] text-neutral-400 italic pt-1">
                        "{s.closingNotes}"
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Sales Completed in Current Register Session */}
      <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-neutral-100">
              {language === 'es' ? 'Ventas Registradas en este Turno' : 'Vendas Registradas neste Turno'} ({currentSessionSales.length})
            </h3>
          </div>
          <span className="text-xs text-neutral-400 font-mono-nums">
            {formatCurrency(currentSessionSales.reduce((acc, s) => acc + s.totalBrl, 0), 'BRL')}
          </span>
        </div>

        <div className="space-y-2">
          {currentSessionSales.length === 0 ? (
            <p className="text-xs text-neutral-500 py-6 text-center">
              {language === 'es' ? 'Ninguna venta registrada aún en este turno.' : 'Nenhuma venda registrada ainda neste turno.'}
            </p>
          ) : (
            currentSessionSales.map(s => {
              const timeStr = new Date(s.timestamp).toLocaleTimeString(
                language === 'es' ? 'es-PY' : 'pt-BR',
                { hour: '2-digit', minute: '2-digit' }
              );
              const pygVal = fromBrl(s.totalBrl, 'PYG', exchangeRates);
              const usdVal = fromBrl(s.totalBrl, 'USD', exchangeRates);

              return (
                <div
                  key={s.id}
                  className="p-3 rounded-xl bg-neutral-950 border border-neutral-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0 font-bold text-neutral-200 font-mono-nums">
                      #{s.saleNumber || s.id.slice(-4)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-200">{s.employeeName || 'Operador'}</span>
                        <span className="text-[11px] text-neutral-500 font-mono-nums">· {timeStr}</span>
                        {s.customerName && (
                          <span className="text-[11px] text-amber-400 font-medium">({s.customerName})</span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        {s.items.length} {language === 'es' ? 'artículos' : 'itens'}: {s.items.map(it => `${it.quantity}x ${it.product.name}`).join(', ').slice(0, 50)}...
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-850">
                    <div className="text-right">
                      <span className="text-sm font-bold text-neutral-100 font-mono-nums block">
                        {formatCurrency(s.totalBrl, 'BRL')}
                      </span>
                      <span className="text-[10px] text-neutral-500 font-mono-nums">
                        ₲ {Math.round(pygVal).toLocaleString('es-PY')} · $ {usdVal.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setInspectSale(s)}
                        className="p-1.5 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 transition-colors cursor-pointer"
                        title={language === 'es' ? 'Ver Comprobante' : 'Ver Cupom'}
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setSaleToDelete(s)}
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

      {/* Modals */}
      <SangriaSuprimentoModal
        isOpen={isSaidaOpen}
        onClose={() => setIsSaidaOpen(false)}
        type="saida"
      />

      <SangriaSuprimentoModal
        isOpen={isEntradaOpen}
        onClose={() => setIsEntradaOpen(false)}
        type="entrada"
      />

      <CloseRegisterModal
        isOpen={isCloseRegisterOpen}
        onClose={() => setIsCloseRegisterOpen(false)}
        onClosedSuccess={() => {}}
      />

      <OpenRegisterModal
        isOpen={isOpenRegisterOpen}
        onClose={() => setIsOpenRegisterOpen(false)}
      />

      {/* Receipt Inspection Modal */}
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

    </div>
  );
};
