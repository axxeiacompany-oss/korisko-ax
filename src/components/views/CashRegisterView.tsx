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
  FileText
} from 'lucide-react';
import { SangriaSuprimentoModal } from '../modals/SangriaSuprimentoModal';
import { CloseRegisterModal } from '../modals/CloseRegisterModal';
import { OpenRegisterModal } from '../modals/OpenRegisterModal';

export const CashRegisterView: React.FC = () => {
  const { currentSession, sessionHistory, sales, hasPermission, t, language } = useBakery();

  const [isSangriaOpen, setIsSangriaOpen] = useState(false);
  const [isSuprimentoOpen, setIsSuprimentoOpen] = useState(false);
  const [isCloseRegisterOpen, setIsCloseRegisterOpen] = useState(false);
  const [isOpenRegisterOpen, setIsOpenRegisterOpen] = useState(false);

  const canManageRegister = hasPermission(['admin', 'gerente']);

  // Filter sales completed in the current register session
  const currentSessionSales = useMemo(() => {
    return sales.filter(s => s.registerSessionId === currentSession.id && s.status === 'completed');
  }, [sales, currentSession.id]);

  // Compute live money in drawer per currency
  const drawerBalances = useMemo(() => {
    let brlCash = currentSession.initialFloat.brl;
    let pygCash = currentSession.initialFloat.pyg;
    let usdCash = currentSession.initialFloat.usd;

    let totalPix = 0;
    let totalDebito = 0;
    let totalCredito = 0;

    currentSessionSales.forEach(s => {
      s.payments.forEach(p => {
        if (p.method === 'dinheiro') {
          if (p.currency === 'BRL') brlCash += p.amountReceived;
          if (p.currency === 'PYG') pygCash += p.amountReceived;
          if (p.currency === 'USD') usdCash += p.amountReceived;
        } else if (p.method === 'pix') {
          totalPix += p.equivalentBrl;
        } else if (p.method === 'cartao_debito') {
          totalDebito += p.equivalentBrl;
        } else if (p.method === 'cartao_credito') {
          totalCredito += p.equivalentBrl;
        }
      });

      if (s.changeGiven && s.changeGiven.amount > 0) {
        if (s.changeGiven.currency === 'BRL') brlCash -= s.changeGiven.amount;
        if (s.changeGiven.currency === 'PYG') pygCash -= s.changeGiven.amount;
        if (s.changeGiven.currency === 'USD') usdCash -= s.changeGiven.amount;
      }
    });

    currentSession.transactions.forEach(t => {
      const mult = t.type === 'suprimento' ? 1 : -1;
      if (t.currency === 'BRL') brlCash += mult * t.amount;
      if (t.currency === 'PYG') pygCash += mult * t.amount;
      if (t.currency === 'USD') usdCash += mult * t.amount;
    });

    return {
      brl: Math.round(brlCash * 100) / 100,
      pyg: Math.round(pygCash),
      usd: Math.round(usdCash * 100) / 100,
      totalPix,
      totalDebito,
      totalCredito,
    };
  }, [currentSession, currentSessionSales]);

  const isRegisterOpen = currentSession.status === 'aberto';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Session Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
        <div className="flex items-center gap-3.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isRegisterOpen
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
          }`}>
            {isRegisterOpen ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-neutral-100">
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
            <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-2">
              <span>{language === 'es' ? 'Abierta por:' : 'Aberto por:'} <strong className="text-neutral-300">{currentSession.openedBy}</strong></span>
              <span aria-hidden="true">·</span>
              <span>{language === 'es' ? 'Inicio:' : 'Início:'} {new Date(currentSession.openedAt).toLocaleTimeString(language === 'es' ? 'es-PY' : 'pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {isRegisterOpen ? (
            <>
              <button
                type="button"
                onClick={() => setIsSuprimentoOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                {language === 'es' ? 'Ingreso / Suplido' : 'Suprimento (Entrada)'}
              </button>
              <button
                type="button"
                onClick={() => setIsSangriaOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowDownRight className="w-4 h-4 text-rose-400" />
                {language === 'es' ? 'Retiro / Sangría' : 'Sangria (Retirada)'}
              </button>
              {canManageRegister && (
                <button
                  type="button"
                  onClick={() => setIsCloseRegisterOpen(true)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  {language === 'es' ? 'Cerrar Caja' : 'Fechar Caixa'}
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsOpenRegisterOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              {language === 'es' ? 'Abrir Nueva Caja' : 'Abrir Novo Caixa'}
            </button>
          )}
        </div>
      </div>

      {/* 3 Physical Cash Drawer Balances */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
          {language === 'es' ? 'Dinero Físico Actual en Gaveta (Por Moneda)' : 'Dinheiro Físico Atual na Gaveta (Por Moeda)'}
        </label>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* BRL Cash */}
          <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-medium">Real Brasileño (BRL)</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                R$
              </span>
            </div>
            <div className="text-2xl font-bold text-neutral-100 font-mono-nums">
              {formatCurrency(drawerBalances.brl, 'BRL')}
            </div>
            <p className="text-[11px] text-neutral-500 font-mono-nums">
              {language === 'es' ? 'Fondo inicial:' : 'Fundo inicial:'} {formatCurrency(currentSession.initialFloat.brl, 'BRL')}
            </p>
          </div>

          {/* PYG Cash */}
          <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-medium">Guaraní Paraguayo (PYG)</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                ₲
              </span>
            </div>
            <div className="text-2xl font-bold text-amber-400 font-mono-nums">
              {formatCurrency(drawerBalances.pyg, 'PYG')}
            </div>
            <p className="text-[11px] text-neutral-500 font-mono-nums">
              {language === 'es' ? 'Fondo inicial:' : 'Fundo inicial:'} {formatCurrency(currentSession.initialFloat.pyg, 'PYG')}
            </p>
          </div>

          {/* USD Cash */}
          <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-medium">Dólar Americano (USD)</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                $
              </span>
            </div>
            <div className="text-2xl font-bold text-emerald-400 font-mono-nums">
              {formatCurrency(drawerBalances.usd, 'USD')}
            </div>
            <p className="text-[11px] text-neutral-500 font-mono-nums">
              {language === 'es' ? 'Fondo inicial:' : 'Fundo inicial:'} {formatCurrency(currentSession.initialFloat.usd, 'USD')}
            </p>
          </div>

        </div>
      </div>

      {/* Other Payment Methods (Electronic / Digital) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
          <span className="text-xs text-neutral-400">Pix / QR:</span>
          <span className="text-sm font-bold text-neutral-100 font-mono-nums">
            {formatCurrency(drawerBalances.totalPix, 'BRL')}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
          <span className="text-xs text-neutral-400">{language === 'es' ? 'Tarjeta Débito:' : 'Cartão de Débito:'}</span>
          <span className="text-sm font-bold text-neutral-100 font-mono-nums">
            {formatCurrency(drawerBalances.totalDebito, 'BRL')}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
          <span className="text-xs text-neutral-400">{language === 'es' ? 'Tarjeta Crédito:' : 'Cartão de Crédito:'}</span>
          <span className="text-sm font-bold text-neutral-100 font-mono-nums">
            {formatCurrency(drawerBalances.totalCredito, 'BRL')}
          </span>
        </div>
      </div>

      {/* 2-Column: Current Session Sangrias/Suprimentos & Historical Closures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sangrias & Suprimentos Table */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4 text-amber-400" />
              {language === 'es' ? 'Movimientos de la Caja Actual' : 'Movimentações do Caixa Atual'} ({currentSession.transactions.length})
            </h3>
            <span className="text-xs text-neutral-500">
              {language === 'es' ? 'Retiros & Ingresos' : 'Sangrias & Suprimentos'}
            </span>
          </div>

          <div className="space-y-2">
            {currentSession.transactions.length === 0 ? (
              <p className="text-xs text-neutral-500 py-6 text-center">
                {language === 'es' ? 'Ningún retiro o ingreso registrado en este turno.' : 'Nenhuma sangria ou suprimento registrado neste turno.'}
              </p>
            ) : (
              currentSession.transactions.map(t => {
                const isSup = t.type === 'suprimento';
                const timeStr = new Date(t.timestamp).toLocaleTimeString(language === 'es' ? 'es-PY' : 'pt-BR', { hour: '2-digit', minute: '2-digit' });

                return (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          isSup ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {isSup ? (language === 'es' ? 'Ingreso' : 'Suprimento') : (language === 'es' ? 'Retiro' : 'Sangria')}
                        </span>
                        <span className="font-semibold text-neutral-200">{t.reason}</span>
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-1">
                        {language === 'es' ? 'Por:' : 'Por:'} {t.employeeName} · {timeStr}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className={`text-sm font-bold font-mono-nums ${
                        isSup ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isSup ? '+' : '-'}{formatCurrency(t.amount, t.currency)}
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

      {/* Modals */}
      <SangriaSuprimentoModal
        isOpen={isSangriaOpen}
        onClose={() => setIsSangriaOpen(false)}
        type="sangria"
      />

      <SangriaSuprimentoModal
        isOpen={isSuprimentoOpen}
        onClose={() => setIsSuprimentoOpen(false)}
        type="suprimento"
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

    </div>
  );
};
