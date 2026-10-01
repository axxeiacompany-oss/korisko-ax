import React, { useState, useMemo } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { formatBrl, fromBrl, formatCurrency } from '../../utils/currency';
import { CartItem, Comanda, ComandaStatus, SetorResponsavel } from '../../types';
import { formatSetorName, getItemSetor, resolveSetoresFromItems } from '../../lib/db';
import { 
  ClipboardList, 
  Plus, 
  Trash2, 
  ArrowRight, 
  X, 
  User, 
  Clock, 
  FileText,
  ShoppingBag,
  CheckCircle2,
  ChefHat,
  Flame,
  Coffee,
  ShieldCheck,
  Sparkles,
  Check,
  Radio,
  Layers
} from 'lucide-react';

interface ComandasModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCart?: CartItem[];
  onLoadComanda?: (comanda: Comanda) => void;
  onClearCart?: () => void;
}

export const ComandasModal: React.FC<ComandasModalProps> = ({
  isOpen,
  onClose,
  currentCart = [],
  onLoadComanda,
  onClearCart,
}) => {
  const { 
    openComandas, 
    saveComanda, 
    updateComandaStatus, 
    removeComanda, 
    exchangeRates, 
    currentUser,
    customers,
    showToast
  } = useBakery();

  const [comandaNumber, setComandaNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedSetor, setSelectedSetor] = useState<SetorResponsavel | 'auto'>('auto');
  const [activeSectorFilter, setActiveSectorFilter] = useState<SetorResponsavel | 'todas'>('todas');

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'gerente' || currentUser.id === 'emp-admin-ax';

  const autoDetectedSector = useMemo(() => {
    return resolveSetoresFromItems(currentCart);
  }, [currentCart]);

  const filteredComandas = useMemo(() => {
    if (activeSectorFilter === 'todas') return openComandas;
    return openComandas.filter(c => {
      const sectorInfo = resolveSetoresFromItems(c.items || []);
      const primary = c.setorResponsavel || sectorInfo.primary;
      const involved = c.setoresEnvolvidos || sectorInfo.all;
      if (activeSectorFilter === 'caixa') {
        return c.status === 'pronto' || primary === 'caixa';
      }
      return primary === activeSectorFilter || involved.includes(activeSectorFilter) || primary === 'todos';
    });
  }, [openComandas, activeSectorFilter]);

  if (!isOpen) return null;

  const cartTotalBrl = currentCart.reduce((acc, i) => acc + i.subtotalBrl, 0);
  const cartTotalPyg = fromBrl(cartTotalBrl, 'PYG', exchangeRates);

  const handleSaveCurrentCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comandaNumber.trim() || currentCart.length === 0) return;

    const chosenCustomer = customers.find(c => c.id === selectedCustomerId);
    const finalCustomerName = chosenCustomer ? chosenCustomer.name : (customerName.trim() || 'Cliente Balcão');
    const targetSetor: SetorResponsavel = selectedSetor === 'auto'
      ? autoDetectedSector.primary
      : selectedSetor;

    const saved = saveComanda(
      comandaNumber.trim(),
      currentCart,
      finalCustomerName,
      notes.trim() || undefined,
      {
        customerId: chosenCustomer?.id,
        customerPhone: chosenCustomer?.phone,
        status: 'confirmado',
        setorResponsavel: targetSetor,
        confirmedByCustomer: true,
        source: 'pdv',
      }
    );

    showToast(
      `Comanda #${saved.number} confirmada e enviada em tempo real para ${formatSetorName(saved.setorResponsavel)}!`,
      'success'
    );

    setComandaNumber('');
    setCustomerName('');
    setSelectedCustomerId('');
    setNotes('');
    setSelectedSetor('auto');
    if (onClearCart) onClearCart();
    onClose();
  };

  const getStatusBadge = (status?: ComandaStatus) => {
    switch (status) {
      case 'aguardando_confirmacao':
        return {
          label: 'Aguardando Confirmação',
          cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        };
      case 'em_preparo':
        return {
          label: 'Em Preparo no Setor',
          cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
        };
      case 'pronto':
        return {
          label: 'Pronto • Liberado p/ Caixa',
          cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        };
      case 'entregue':
        return {
          label: 'Entregue ao Cliente',
          cls: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
        };
      case 'confirmado':
      default:
        return {
          label: 'Confirmado pelo Cliente',
          cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        };
    }
  };

  const getSetorBadgeStyle = (setor?: SetorResponsavel | string) => {
    switch (setor) {
      case 'confeitaria':
        return 'bg-pink-500/15 text-pink-300 border-pink-500/30';
      case 'panificacao':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'balcao':
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
      case 'caixa':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header with Korizko + Panificação confeitaria artesanal + Real-Time Sector & Admin Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 bg-neutral-950 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                  Korizko • Comandas & Setores em Tempo Real
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <Radio className="w-3 h-3 animate-pulse" />
                  TEMPO REAL ATIVO
                </span>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    <ShieldCheck className="w-3 h-3" />
                    ADMIN: ACESSO TOTAL A TODOS OS SETORES
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-amber-400/90">
                Panificação confeitaria artesanal — Pedidos confirmados pelo cliente enviados direto ao setor responsável
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors self-end sm:self-auto cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sector Filter Bar */}
        <div className="px-6 py-3 bg-neutral-950/60 border-b border-neutral-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveSectorFilter('todas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSectorFilter === 'todas'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20'
                : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Todos os Setores ({openComandas.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSectorFilter('panificacao')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSectorFilter === 'panificacao'
                ? 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-600/20'
                : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-amber-300'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Setor Panificação & Forno
          </button>

          <button
            type="button"
            onClick={() => setActiveSectorFilter('confeitaria')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSectorFilter === 'confeitaria'
                ? 'bg-pink-600 text-white border-pink-500 shadow-lg shadow-pink-600/20'
                : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-pink-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Setor Confeitaria Artesanal
          </button>

          <button
            type="button"
            onClick={() => setActiveSectorFilter('balcao')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSectorFilter === 'balcao'
                ? 'bg-cyan-600 text-white border-cyan-500 shadow-lg shadow-cyan-600/20'
                : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-cyan-300'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            Setor Balcão & Cafeteria
          </button>

          <button
            type="button"
            onClick={() => setActiveSectorFilter('caixa')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSectorFilter === 'caixa'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/20'
                : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-emerald-300'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Prontos / Caixa
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Save & Confirm Current Cart to Comanda */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-5">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Confirmar Pedido em Comanda
                </h4>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Envio Imediato ao Setor
                </span>
              </div>

              {currentCart.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-neutral-800 rounded-xl p-4">
                  <ShoppingBag className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                  <p className="text-xs text-neutral-400 font-medium">
                    Adicione itens no PDV ou na Loja Online para confirmar uma nova comanda para o setor responsável.
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-2">
                    Assim que o cliente confirma o pedido, a comanda aparece aqui em tempo real para o setor responsável e para o Admin.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSaveCurrentCart} className="space-y-3.5">
                  <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1.5">
                    <div className="flex justify-between items-center text-xs text-neutral-400">
                      <span>Itens confirmados no pedido:</span>
                      <span className="font-bold text-white">{currentCart.reduce((a, b) => a + b.quantity, 0)} un</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-neutral-400">Total da Comanda:</span>
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-amber-400 font-mono block">
                          {formatCurrency(cartTotalPyg, 'PYG')}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {formatBrl(cartTotalBrl)}
                        </span>
                      </div>
                    </div>
                    <div className="pt-1.5 border-t border-neutral-800 flex items-center justify-between text-[11px]">
                      <span className="text-neutral-400">Setor detectado:</span>
                      <span className="font-bold text-emerald-400">{autoDetectedSector.label}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">
                      Número da Comanda / Mesa *
                    </label>
                    <input
                      type="text"
                      required
                      value={comandaNumber}
                      onChange={(e) => setComandaNumber(e.target.value)}
                      placeholder="Ex: Mesa 04, Comanda 12..."
                      className="w-full px-3.5 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">
                      Vincular Cliente Cadastrado (Para Extrato / Conta)
                    </label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => {
                        setSelectedCustomerId(e.target.value);
                        const found = customers.find(c => c.id === e.target.value);
                        if (found) setCustomerName(found.name);
                      }}
                      className="w-full px-3.5 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- Selecionar Cliente ou Digitar Abaixo --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">
                      Nome do Cliente
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ex: Dona Maria / Mesa 04"
                      className="w-full px-3.5 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">
                      Setor Responsável pelo Preparo
                    </label>
                    <select
                      value={selectedSetor}
                      onChange={(e) => setSelectedSetor(e.target.value as SetorResponsavel | 'auto')}
                      className="w-full px-3.5 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-semibold"
                    >
                      <option value="auto">Automático ({autoDetectedSector.label})</option>
                      <option value="panificacao">Panificação & Forno</option>
                      <option value="confeitaria">Confeitaria Artesanal</option>
                      <option value="balcao">Balcão & Cafeteria</option>
                      <option value="todos">Panificação & Confeitaria Artesanal (Todos)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">
                      Observações do Cliente / Preparo
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ex: Pão bem quentinho, embalar para viagem..."
                      className="w-full px-3.5 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar Pedido & Enviar ao Setor
                  </button>
                </form>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-800/80 text-[11px] text-neutral-500 flex items-center justify-between">
              <span>Korizko • Panificação confeitaria artesanal</span>
              <span className="text-emerald-400 font-semibold">Sincronização Supabase Realtime</span>
            </div>
          </div>

          {/* Right Column: Active Confirmed Comandas by Sector */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-amber-400" />
                Comandas Confirmadas para os Setores ({filteredComandas.length})
              </h4>
              {isAdmin && (
                <span className="text-[11px] text-indigo-400 font-semibold">
                  Visão Geral do Administrador (Controle Total)
                </span>
              )}
            </div>

            {filteredComandas.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center border border-dashed border-neutral-800 rounded-2xl p-6">
                <ClipboardList className="w-10 h-10 text-neutral-700 mb-2" />
                <p className="text-sm font-medium text-neutral-400">
                  Nenhuma comanda pendente neste setor no momento
                </p>
                <p className="text-xs text-neutral-600 mt-1 max-w-md">
                  Assim que o cliente confirmar um pedido na Loja Online ou no PDV, a comanda aparecerá instantaneamente aqui com alerta para o setor responsável.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
                {filteredComandas.map((cmd) => {
                  const cmdTotalBrl = cmd.items.reduce((acc, i) => acc + (i.subtotalBrl || (i.product?.priceBrl || 0) * i.quantity), 0);
                  const cmdTotalPyg = fromBrl(cmdTotalBrl, 'PYG', exchangeRates);
                  const sectorInfo = resolveSetoresFromItems(cmd.items || []);
                  const activeSetor = cmd.setorResponsavel || sectorInfo.primary;
                  const statusBadge = getStatusBadge(cmd.status);

                  return (
                    <div
                      key={cmd.id}
                      className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-amber-500/40 transition-all flex flex-col gap-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-extrabold text-xs">
                              #{cmd.number}
                            </span>
                            {cmd.customerName && (
                              <span className="text-sm font-bold text-white flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-neutral-400" />
                                {cmd.customerName}
                              </span>
                            )}
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.cls}`}>
                              ✓ {statusBadge.label}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getSetorBadgeStyle(activeSetor)}`}>
                              Setor: {formatSetorName(activeSetor)}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-neutral-500 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Confirmado às {new Date(cmd.confirmedAt || cmd.openedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span>por {cmd.openedBy}</span>
                            {cmd.source === 'loja_online' && (
                              <span className="text-emerald-400 font-semibold">• Pedido Online Confirmado pelo Cliente</span>
                            )}
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-base font-extrabold text-emerald-400 font-mono block">
                            {formatCurrency(cmdTotalPyg, 'PYG')}
                          </span>
                          <span className="text-[11px] text-neutral-400 font-mono">
                            {formatBrl(cmdTotalBrl)}
                          </span>
                        </div>
                      </div>

                      {cmd.notes && (
                        <p className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          {cmd.notes}
                        </p>
                      )}

                      {/* Itemized list with individual sector badge */}
                      <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-xl p-2.5 space-y-1.5">
                        {cmd.items.map((item, idx) => {
                          const itemSetor = getItemSetor(item.product?.category);
                          return (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-extrabold text-amber-400 font-mono">{item.quantity}x</span>
                                <span className="text-neutral-200 font-medium truncate">{item.product?.name || 'Produto'}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${getSetorBadgeStyle(itemSetor)}`}>
                                  {formatSetorName(itemSetor)}
                                </span>
                              </div>
                              <span className="text-neutral-400 font-mono shrink-0 ml-2">
                                {formatCurrency(fromBrl((item.product?.priceBrl || 0) * item.quantity, 'PYG', exchangeRates), 'PYG')}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Real-Time Sector Workflow Controls + Admin Full Access */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800/80">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              updateComandaStatus(cmd.id, 'em_preparo');
                              showToast(`Comanda #${cmd.number} em preparo no setor ${formatSetorName(activeSetor)}!`, 'info');
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                              cmd.status === 'em_preparo'
                                ? 'bg-sky-600 text-white border-sky-500'
                                : 'bg-neutral-900 text-sky-400 border-sky-500/30 hover:bg-sky-500/15'
                            }`}
                          >
                            Em Preparo
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              updateComandaStatus(cmd.id, 'pronto');
                              showToast(`Comanda #${cmd.number} pronta e liberada para o Caixa/Entrega!`, 'success');
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                              cmd.status === 'pronto'
                                ? 'bg-emerald-600 text-white border-emerald-500'
                                : 'bg-neutral-900 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/15'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                            Pronto p/ Caixa
                          </button>

                          {isAdmin && (
                            <select
                              value={activeSetor}
                              onChange={(e) => {
                                const newSetor = e.target.value as SetorResponsavel;
                                updateComandaStatus(cmd.id, cmd.status || 'confirmado', newSetor);
                                showToast(`Setor da Comanda #${cmd.number} alterado para ${formatSetorName(newSetor)}`, 'info');
                              }}
                              className="px-2 py-1.5 rounded-lg bg-neutral-900 border border-indigo-500/30 text-[11px] text-indigo-300 font-semibold focus:outline-none"
                              title="Admin: Redirecionar Comanda para outro Setor"
                            >
                              <option value="panificacao">→ Panificação</option>
                              <option value="confeitaria">→ Confeitaria</option>
                              <option value="balcao">→ Balcão</option>
                              <option value="caixa">→ Caixa</option>
                              <option value="todos">→ Todos Setores</option>
                            </select>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => removeComanda(cmd.id)}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Excluir / Cancelar Comanda"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          {onLoadComanda && (
                            <button
                              type="button"
                              onClick={() => {
                                onLoadComanda(cmd);
                                onClose();
                              }}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-indigo-600/30"
                            >
                              Carregar no PDV / Caixa
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
