import React, { useState } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { formatCurrency } from '../../utils/currency';
import { RefreshCw, Coins, ArrowRightLeft, Check, X, ShieldAlert, Globe, Zap, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ExchangeRatesModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { 
    exchangeRates, 
    updateExchangeRates, 
    hasPermission, 
    liveRateStatus, 
    fetchLiveRates, 
    toggleAutoRateRefresh 
  } = useBakery();
  
  const [usdBrl, setUsdBrl] = useState(exchangeRates.USD_TO_BRL.toString());
  const [brlPyg, setBrlPyg] = useState(exchangeRates.BRL_TO_PYG.toString());
  const [usdPyg, setUsdPyg] = useState(exchangeRates.USD_TO_PYG.toString());

  // Quick live calculator state
  const [calcAmount, setCalcAmount] = useState('100');
  const [calcFrom, setCalcFrom] = useState<'BRL' | 'PYG' | 'USD'>('BRL');

  const canEdit = hasPermission(['admin', 'gerente']);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const numUsdBrl = parseFloat(usdBrl);
    const numBrlPyg = parseFloat(brlPyg);
    const numUsdPyg = parseFloat(usdPyg);

    if (numUsdBrl > 0 && numBrlPyg > 0 && numUsdPyg > 0) {
      updateExchangeRates({
        USD_TO_BRL: numUsdBrl,
        BRL_TO_PYG: numBrlPyg,
        USD_TO_PYG: numUsdPyg,
      });
      onClose();
    }
  };

  const handleAutoRecalculateUsdPyg = () => {
    const numUsdBrl = parseFloat(usdBrl) || 0;
    const numBrlPyg = parseFloat(brlPyg) || 0;
    if (numUsdBrl > 0 && numBrlPyg > 0) {
      const computed = Math.round(numUsdBrl * numBrlPyg);
      setUsdPyg(computed.toString());
    }
  };

  const handleApplyLiveRates = () => {
    setUsdBrl(exchangeRates.USD_TO_BRL.toString());
    setBrlPyg(exchangeRates.BRL_TO_PYG.toString());
    setUsdPyg(exchangeRates.USD_TO_PYG.toString());
  };

  // Compute calculator conversions
  const parsedCalc = parseFloat(calcAmount) || 0;
  const currentRates = {
    BRL_TO_PYG: parseFloat(brlPyg) || exchangeRates.BRL_TO_PYG,
    USD_TO_BRL: parseFloat(usdBrl) || exchangeRates.USD_TO_BRL,
    USD_TO_PYG: parseFloat(usdPyg) || exchangeRates.USD_TO_PYG,
    updatedAt: exchangeRates.updatedAt,
  };

  let brlVal = 0;
  let pygVal = 0;
  let usdVal = 0;

  if (calcFrom === 'BRL') {
    brlVal = parsedCalc;
    pygVal = Math.round(parsedCalc * currentRates.BRL_TO_PYG);
    usdVal = currentRates.USD_TO_BRL > 0 ? parsedCalc / currentRates.USD_TO_BRL : 0;
  } else if (calcFrom === 'USD') {
    usdVal = parsedCalc;
    brlVal = parsedCalc * currentRates.USD_TO_BRL;
    pygVal = Math.round(parsedCalc * currentRates.USD_TO_PYG);
  } else {
    pygVal = parsedCalc;
    brlVal = currentRates.BRL_TO_PYG > 0 ? parsedCalc / currentRates.BRL_TO_PYG : 0;
    usdVal = currentRates.USD_TO_PYG > 0 ? parsedCalc / currentRates.USD_TO_PYG : 0;
  }

  const lastFetchFormatted = liveRateStatus.lastFetchedAt 
    ? new Date(liveRateStatus.lastFetchedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Nunca';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-neutral-100">Cotação & Câmbio em Tempo Real</h2>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-medium text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Ao Vivo
                </span>
              </div>
              <p className="text-xs text-neutral-400">Taxas oficiais e balcão comercial: BRL, PYG (Guaraní) e USD</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">

          {/* Live API Feed Card */}
          <div className="p-4 rounded-xl border border-emerald-900/40 bg-emerald-950/20 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                    Fonte de Mercado: {liveRateStatus.provider}
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Última sincronização: <span className="text-neutral-200 font-mono-nums">{lastFetchFormatted}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchLiveRates()}
                  disabled={liveRateStatus.isFetching}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-200 text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-50"
                  title="Buscar cotação em tempo real na API"
                >
                  <RefreshCw className={`w-3 h-3 ${liveRateStatus.isFetching ? 'animate-spin' : ''}`} />
                  {liveRateStatus.isFetching ? 'Buscando...' : 'Buscar Agora'}
                </button>

                <button
                  type="button"
                  onClick={toggleAutoRateRefresh}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    liveRateStatus.autoRefresh
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-neutral-800/60 border-neutral-700 text-neutral-400'
                  }`}
                  title="Auto-atualizar cotação a cada 5 minutos"
                >
                  Auto: {liveRateStatus.autoRefresh ? 'ON (5min)' : 'OFF'}
                </button>
              </div>
            </div>

            {liveRateStatus.errorMsg && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{liveRateStatus.errorMsg}</span>
              </div>
            )}

            {/* Quick Live Preview Tags */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="p-2 rounded-lg bg-neutral-900/80 border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block">USD Comercial</span>
                <span className="text-xs font-bold text-emerald-400 font-mono-nums">
                  R$ {exchangeRates.USD_TO_BRL.toFixed(2)}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-neutral-900/80 border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block">PYG por Real</span>
                <span className="text-xs font-bold text-amber-400 font-mono-nums">
                  ₲ {exchangeRates.BRL_TO_PYG.toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-neutral-900/80 border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block">USD em Guaranis</span>
                <span className="text-xs font-bold text-sky-400 font-mono-nums">
                  ₲ {exchangeRates.USD_TO_PYG.toLocaleString('pt-BR')}
                </span>
              </div>
            </div>

            {canEdit && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleApplyLiveRates}
                  className="text-xs text-emerald-400 hover:text-emerald-300 underline font-medium flex items-center gap-1"
                >
                  <Zap className="w-3 h-3" />
                  Preencher campos com esta cotação ao vivo
                </button>
              </div>
            )}
          </div>

          {!canEdit && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Apenas Gerentes ou Administradores podem alterar a cotação oficial do dia. Modo somente leitura.</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* USD to BRL */}
              <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-950/60">
                <label className="text-xs font-medium text-neutral-400 block mb-1">
                  1 Dólar Americano (USD) vale:
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-emerald-400 font-mono-nums">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!canEdit}
                    value={usdBrl}
                    onChange={(e) => setUsdBrl(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm font-mono-nums font-semibold text-neutral-100 focus:outline-none focus:border-emerald-500 disabled:opacity-60"
                  />
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">Cotação do balcão para 1 USD</p>
              </div>

              {/* BRL to PYG */}
              <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-950/60">
                <label className="text-xs font-medium text-neutral-400 block mb-1">
                  1 Real Brasileiro (BRL) vale:
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-amber-400 font-mono-nums">₲</span>
                  <input
                    type="number"
                    step="10"
                    disabled={!canEdit}
                    value={brlPyg}
                    onChange={(e) => setBrlPyg(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm font-mono-nums font-semibold text-neutral-100 focus:outline-none focus:border-amber-500 disabled:opacity-60"
                  />
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">1 Real em Guaranis (ex: 1.380)</p>
              </div>

              {/* USD to PYG */}
              <div className="sm:col-span-2 p-3.5 rounded-xl border border-neutral-800 bg-neutral-950/60">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-neutral-400 block">
                    1 Dólar Americano (USD) em Guaranis:
                  </label>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={handleAutoRecalculateUsdPyg}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Auto-calcular (USD × BRL/PYG)
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-sky-400 font-mono-nums">₲</span>
                  <input
                    type="number"
                    step="50"
                    disabled={!canEdit}
                    value={usdPyg}
                    onChange={(e) => setUsdPyg(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm font-mono-nums font-semibold text-neutral-100 focus:outline-none focus:border-sky-500 disabled:opacity-60"
                  />
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">Cotação cruzada para receber em Dólar direto para Guaranis</p>
              </div>

            </div>

            {/* Quick staff converter widget */}
            <div className="pt-2 border-t border-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                  Simulador Rápido de Conversão no Caixa
                </span>
                <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
                  {(['BRL', 'PYG', 'USD'] as const).map((curr) => (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => setCalcFrom(curr)}
                      className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                        calcFrom === curr
                          ? 'bg-neutral-800 text-amber-400 font-semibold'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(e.target.value)}
                  className="w-32 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-mono-nums font-semibold text-neutral-100"
                  placeholder="Valor..."
                />
                <div className="flex-1 grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800/80">
                    <span className="text-[10px] text-neutral-500 block">Real (BRL)</span>
                    <span className="text-xs font-bold text-neutral-200 font-mono-nums">
                      {formatCurrency(brlVal, 'BRL')}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800/80">
                    <span className="text-[10px] text-neutral-500 block">Guaraní (PYG)</span>
                    <span className="text-xs font-bold text-neutral-200 font-mono-nums">
                      {formatCurrency(pygVal, 'PYG')}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800/80">
                    <span className="text-[10px] text-neutral-500 block">Dólar (USD)</span>
                    <span className="text-xs font-bold text-neutral-200 font-mono-nums">
                      {formatCurrency(usdVal, 'USD')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-neutral-800 text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition-colors"
              >
                Fechar
              </button>
              {canEdit && (
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Salvar Novas Taxas
                </button>
              )}
            </div>

          </form>

        </div>
      </div>
    </div>
  );
};
