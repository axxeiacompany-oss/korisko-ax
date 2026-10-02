import React, { useState, useMemo } from 'react';
import { useBakery } from '../../context/BakeryContext';
import {
  Customer,
  CustomerPurchaseRecord,
  CustomerPurchaseItem,
  PaymentMethod,
  Sale,
} from '../../types';
import { formatCurrency } from '../../utils/currency';
import {
  ShoppingBag,
  X,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Trash2,
  Copy,
  Check,
  MessageSquare,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Database,
  Sparkles,
} from 'lucide-react';

interface CustomerPurchasesModalProps {
  customer: Customer | null;
  onClose: () => void;
  onInspectSale?: (sale: Sale) => void;
}

export const CustomerPurchasesModal: React.FC<CustomerPurchasesModalProps> = ({
  customer,
  onClose,
  onInspectSale,
}) => {
  const {
    customerPurchases,
    customerEntries,
    sales,
    products,
    currentUser,
    recordCustomerPurchase,
    deleteCustomerPurchase,
    language,
    showToast,
  } = useBakery();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'paid' | 'fiado'>('all');
  const [isAddingPurchase, setIsAddingPurchase] = useState(false);
  const [copied, setCopied] = useState(false);

  // New purchase form state
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [itemQuantity, setItemQuantity] = useState<string>('1');
  const [customItemName, setCustomItemName] = useState<string>('');
  const [customUnitPrice, setCustomUnitPrice] = useState<string>('');
  const [draftItems, setDraftItems] = useState<CustomerPurchaseItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [comandaNumber, setComandaNumber] = useState<string>('');
  const [purchaseNotes, setPurchaseNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  // Build complete list of purchases for this customer (merging SQL table registro_compras_clientes + sales + fiado entries)
  const allCustomerPurchases = useMemo<CustomerPurchaseRecord[]>(() => {
    if (!customer) return [];

    const map = new Map<string, CustomerPurchaseRecord>();
    const recordedSaleIds = new Set<string>();
    const recordedComandas = new Set<string>();

    (customerPurchases || [])
      .filter(p => p.customerId === customer.id)
      .forEach(p => {
        map.set(p.id, p);
        if (p.saleId) recordedSaleIds.add(p.saleId);
        if (p.comandaNumber) recordedComandas.add(p.comandaNumber.trim().toLowerCase());
      });

    // Also include any sales for this customer not yet in map
    (sales || [])
      .filter(
        s =>
          s &&
          (s.customerId === customer.id ||
            (s.customerName && s.customerName.trim().toLowerCase() === customer.name.trim().toLowerCase()))
      )
      .forEach(s => {
        if (recordedSaleIds.has(s.id) || map.has(`purch-sale-${s.id}`)) return;
        const itemsList: CustomerPurchaseItem[] = (s.items || []).map(it => ({
          productId: it.product?.id || '',
          productName: it.product?.name || (it as any).name || 'Produto',
          category: it.product?.category || 'paes',
          quantity: Number(it.quantity) || 1,
          unit: it.product?.unit || 'un',
          unitPriceBrl: Number(it.unitPriceBrl ?? it.product?.priceBrl ?? 0),
          costPriceBrl: Number(it.product?.costPriceBrl ?? Number(it.unitPriceBrl || 0) * 0.42),
          subtotalBrl: Number(it.subtotalBrl ?? Number(it.unitPriceBrl || 0) * Number(it.quantity || 1)),
        }));
        const estCost = Math.round(itemsList.reduce((acc, it) => acc + it.costPriceBrl * it.quantity, 0));
        const fiadoAmt = (s.payments || [])
          .filter(p => p.method === 'fiado')
          .reduce((acc, p) => acc + (p.equivalentBrl || p.amountReceived || 0), 0);
        const paidAmt = Math.max(0, (s.totalBrl || 0) - fiadoAmt);
        const primaryPay = fiadoAmt > 0 ? 'fiado' : (s.payments?.[0]?.method || 'dinheiro');

        map.set(`purch-sale-${s.id}`, {
          id: `purch-sale-${s.id}`,
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          saleId: s.id,
          saleNumber: s.saleNumber,
          comandaNumber: s.comandaNumber,
          items: itemsList,
          itemsSummary: itemsList.map(i => `${i.quantity}x ${i.productName}`).join(', ') || `Venda #${s.saleNumber}`,
          totalAmountBrl: s.totalBrl || 0,
          estimatedCostBrl: estCost,
          paidAmountBrl: paidAmt,
          fiadoAmountBrl: fiadoAmt,
          paymentMethod: primaryPay,
          flowType: fiadoAmt > 0 ? 'fiado_pendente' : 'entrada_avista',
          setorResponsavel: s.setorResponsavel || 'Panificação & Confeitaria Artesanal',
          recordedBy: s.employeeName || 'Operador',
          purchaseDate: s.timestamp || new Date().toISOString(),
        });
        recordedSaleIds.add(s.id);
      });

    // Also include any fiado debit entries not yet in map
    (customerEntries || [])
      .filter(e => e.customerId === customer.id && e.type === 'debito_compra')
      .forEach(e => {
        if (e.saleId && recordedSaleIds.has(e.saleId)) return;
        if (e.comandaNumber && recordedComandas.has(e.comandaNumber.trim().toLowerCase())) return;
        const synthId = `purch-debt-${e.id}`;
        if (map.has(synthId)) return;

        map.set(synthId, {
          id: synthId,
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          saleId: e.saleId,
          comandaNumber: e.comandaNumber,
          items: [
            {
              productId: 'item-fiado',
              productName: e.description || 'Compra no Fiado',
              category: 'paes',
              quantity: 1,
              unit: 'un',
              unitPriceBrl: e.amountBrl,
              costPriceBrl: Math.round(e.amountBrl * 0.42),
              subtotalBrl: e.amountBrl,
            },
          ],
          itemsSummary: e.description || 'Compra no Fiado',
          totalAmountBrl: e.amountBrl,
          estimatedCostBrl: Math.round(e.amountBrl * 0.42),
          paidAmountBrl: 0,
          fiadoAmountBrl: e.amountBrl,
          paymentMethod: 'fiado',
          flowType: 'fiado_pendente',
          setorResponsavel: e.setorResponsavel || 'Panificação & Confeitaria Artesanal',
          recordedBy: e.recordedBy || 'Caixa',
          purchaseDate: e.date || new Date().toISOString(),
        });
      });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
    );
  }, [customer, customerPurchases, sales, customerEntries]);

  // Customer Amortizations (Pagamentos de Fiado que entraram no Caixa)
  const customerAmortizationsTotal = useMemo(() => {
    if (!customer) return 0;
    return (customerEntries || [])
      .filter(e => e.customerId === customer.id && e.type === 'pagamento_amortizacao')
      .reduce((acc, e) => acc + (Number(e.amountBrl) || 0), 0);
  }, [customer, customerEntries]);

  // Financial Metrics for this Customer
  const metrics = useMemo(() => {
    if (!customer) {
      return {
        totalPurchased: 0,
        purchaseCount: 0,
        paidAtCheckout: 0,
        totalEnteredCash: 0,
        totalEstimatedCost: 0,
        estimatedNetProfit: 0,
        ticketMedio: 0,
      };
    }

    const sumPurchases = allCustomerPurchases.reduce((acc, p) => acc + (Number(p.totalAmountBrl) || 0), 0);
    const totalPurchased = Math.max(customer.totalSpentBrl || 0, sumPurchases, customer.outstandingBalanceBrl || 0);
    const purchaseCount = Math.max(allCustomerPurchases.length, customer.purchaseCount || 0, totalPurchased > 0 ? 1 : 0);

    const paidAtCheckout = allCustomerPurchases.reduce((acc, p) => acc + (Number(p.paidAmountBrl) || 0), 0);
    const totalEnteredCash = Math.min(
      totalPurchased,
      paidAtCheckout + customerAmortizationsTotal + Math.max(0, totalPurchased - sumPurchases)
    );

    const rawCost = allCustomerPurchases.reduce((acc, p) => acc + (Number(p.estimatedCostBrl) || 0), 0);
    const totalEstimatedCost = rawCost > 0 ? rawCost : Math.round(totalPurchased * 0.42);
    const estimatedNetProfit = Math.max(0, totalPurchased - totalEstimatedCost);
    const ticketMedio = purchaseCount > 0 ? Math.round(totalPurchased / purchaseCount) : 0;

    return {
      totalPurchased,
      purchaseCount,
      paidAtCheckout,
      totalEnteredCash,
      totalEstimatedCost,
      estimatedNetProfit,
      ticketMedio,
    };
  }, [customer, allCustomerPurchases, customerAmortizationsTotal]);

  // Filtered purchases list
  const filteredPurchases = useMemo(() => {
    return allCustomerPurchases.filter(p => {
      if (filterType === 'paid' && p.fiadoAmountBrl > 0 && p.paidAmountBrl === 0) return false;
      if (filterType === 'fiado' && p.fiadoAmountBrl <= 0) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchSummary = p.itemsSummary.toLowerCase().includes(q);
        const matchCmd = p.comandaNumber?.toLowerCase().includes(q);
        const matchMethod = p.paymentMethod.toLowerCase().includes(q);
        const matchItems = p.items.some(i => i.productName.toLowerCase().includes(q));
        return Boolean(matchSummary || matchCmd || matchMethod || matchItems);
      }
      return true;
    });
  }, [allCustomerPurchases, filterType, searchTerm]);

  if (!customer) return null;

  // Add item to draft purchase
  const handleAddDraftItem = () => {
    const qty = Math.max(0.1, parseFloat(itemQuantity.replace(',', '.')) || 1);

    if (selectedProductId) {
      const prod = products.find(p => p.id === selectedProductId);
      if (!prod) return;
      const newItem: CustomerPurchaseItem = {
        productId: prod.id,
        productName: prod.name,
        category: prod.category,
        quantity: qty,
        unit: prod.unit,
        unitPriceBrl: prod.priceBrl,
        costPriceBrl: prod.costPriceBrl || Math.round(prod.priceBrl * 0.42),
        subtotalBrl: Math.round(prod.priceBrl * qty),
      };
      setDraftItems(prev => [...prev, newItem]);
      setSelectedProductId('');
      setItemQuantity('1');
      return;
    }

    if (customItemName.trim() && customUnitPrice) {
      const price = Math.max(0, parseFloat(customUnitPrice.replace(',', '.')) || 0);
      if (price <= 0) return;
      const newItem: CustomerPurchaseItem = {
        productId: `custom-${Date.now()}`,
        productName: customItemName.trim(),
        category: 'paes',
        quantity: qty,
        unit: 'un',
        unitPriceBrl: price,
        costPriceBrl: Math.round(price * 0.42),
        subtotalBrl: Math.round(price * qty),
      };
      setDraftItems(prev => [...prev, newItem]);
      setCustomItemName('');
      setCustomUnitPrice('');
      setItemQuantity('1');
    }
  };

  const draftTotalBrl = draftItems.reduce((acc, it) => acc + it.subtotalBrl, 0);

  const handleSaveNewPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalItems = [...draftItems];

    // If user typed custom item or selected a product without clicking "+ Adicionar Item", include it automatically
    if (finalItems.length === 0) {
      const qty = Math.max(0.1, parseFloat(itemQuantity.replace(',', '.')) || 1);
      if (selectedProductId) {
        const prod = products.find(p => p.id === selectedProductId);
        if (prod) {
          finalItems.push({
            productId: prod.id,
            productName: prod.name,
            category: prod.category,
            quantity: qty,
            unit: prod.unit,
            unitPriceBrl: prod.priceBrl,
            costPriceBrl: prod.costPriceBrl || Math.round(prod.priceBrl * 0.42),
            subtotalBrl: Math.round(prod.priceBrl * qty),
          });
        }
      } else if (customItemName.trim() && customUnitPrice) {
        const price = Math.max(0, parseFloat(customUnitPrice.replace(',', '.')) || 0);
        if (price > 0) {
          finalItems.push({
            productId: `custom-${Date.now()}`,
            productName: customItemName.trim(),
            category: 'paes',
            quantity: qty,
            unit: 'un',
            unitPriceBrl: price,
            costPriceBrl: Math.round(price * 0.42),
            subtotalBrl: Math.round(price * qty),
          });
        }
      }
    }

    const total = finalItems.reduce((acc, it) => acc + it.subtotalBrl, 0);
    if (total <= 0) {
      showToast('Adicione pelo menos 1 item ou valor válido para registrar a compra.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await recordCustomerPurchase({
        customerId: customer.id,
        items: finalItems,
        totalAmountBrl: total,
        paymentMethod,
        comandaNumber: comandaNumber.trim() || undefined,
        notes: purchaseNotes.trim() || undefined,
      });
      showToast(`Compra de ${formatCurrency(total, 'PYG')} registrada para ${customer.name}!`, 'success');
      setDraftItems([]);
      setSelectedProductId('');
      setCustomItemName('');
      setCustomUnitPrice('');
      setComandaNumber('');
      setPurchaseNotes('');
      setIsAddingPurchase(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildCustomerPurchasesText = () => {
    let txt = `🥖 *KORIZKO*\n`;
    txt += `*Panificação confeitaria artesanal*\n`;
    txt += `🛍️ *REGISTRO DE COMPRAS DO CLIENTE*\n`;
    txt += `--------------------------------\n`;
    txt += `👤 *Cliente:* ${customer.name}\n`;
    if (customer.phone) txt += `📱 *WhatsApp:* ${customer.phone}\n`;
    txt += `📊 *Total Comprado:* ${formatCurrency(metrics.totalPurchased, 'PYG')} (${metrics.purchaseCount} compras)\n`;
    txt += `🟢 *Total Pago (Entrada):* ${formatCurrency(metrics.totalEnteredCash, 'PYG')}\n`;
    txt += `🟠 *Saldo em Aberto (Fiado):* ${formatCurrency(customer.outstandingBalanceBrl, 'PYG')}\n`;
    txt += `--------------------------------\n`;
    txt += `📋 *HISTÓRICO DE COMPRAS:*\n`;

    if (allCustomerPurchases.length === 0) {
      txt += `Nenhuma compra detalhada registrada.\n`;
    } else {
      allCustomerPurchases.slice(0, 25).forEach((p, idx) => {
        const d = new Date(p.purchaseDate).toLocaleDateString('pt-BR');
        const statusLabel = p.fiadoAmountBrl > 0 ? 'FIADO' : `PAGO (${p.paymentMethod.toUpperCase()})`;
        txt += `${idx + 1}. [${d}] ${formatCurrency(p.totalAmountBrl, 'PYG')} - ${statusLabel}\n`;
        txt += `   ↳ ${p.itemsSummary}\n`;
      });
    }
    txt += `--------------------------------\n`;
    txt += `*Korizko • Panificação confeitaria artesanal* ☕`;
    return txt;
  };

  const handleCopyHistory = () => {
    try {
      navigator.clipboard.writeText(buildCustomerPurchasesText());
      setCopied(true);
      showToast('Histórico de compras copiado!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleWhatsAppShare = () => {
    const cleanPhone = (customer.phone || '').replace(/\D/g, '');
    const phoneWithDdi =
      cleanPhone.startsWith('55') || cleanPhone.startsWith('595') ? cleanPhone : `55${cleanPhone}`;
    const text = encodeURIComponent(buildCustomerPurchasesText());
    window.open(`https://wa.me/${phoneWithDdi}?text=${text}`, '_blank');
  };

  // Percentages for customer's Entry vs Exit/Cost vs Fiado bar
  const maxBarRef = Math.max(metrics.totalPurchased, 1);
  const entryPct = Math.min(100, Math.round((metrics.totalEnteredCash / maxBarRef) * 100));
  const costPct = Math.min(100, Math.round((metrics.totalEstimatedCost / maxBarRef) * 100));
  const fiadoPct = Math.min(100, Math.round(((customer.outstandingBalanceBrl || 0) / maxBarRef) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 overflow-y-auto">
      <div className="w-full sm:max-w-4xl bg-[#090C14] border-t sm:border border-[#C89B6E]/25 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200 flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-[#C89B6E]/20 bg-gradient-to-r from-[#0F1523] via-[#090C14] to-[#1A140E]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#C89B6E]/15 border border-[#C89B6E]/35 flex items-center justify-center text-[#C89B6E] shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-[#F2D6B8] truncate" style={{ fontFamily: "'Cinzel', serif" }}>
                  Total Comprado & Histórico de Compras — {customer.name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#C89B6E]/15 text-[#F2D6B8] border border-[#C89B6E]/30 text-[10px] font-bold uppercase tracking-wider">
                  Extrato de Compras
                </span>
              </div>
              <p className="text-xs text-neutral-400 truncate mt-0.5">
                Histórico individual de compras, produtos consumidos e análise financeira de entrada e saída
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setIsAddingPurchase(!isAddingPurchase)}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-500/20"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isAddingPurchase ? 'Fechar Novo Registro' : '+ Registrar Compra'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyHistory}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title="Copiar Registro de Compras"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            {customer.phone && (
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="p-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 transition-colors cursor-pointer"
                title="Enviar Histórico via WhatsApp"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* 4 Financial KPIs for this Customer */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#111827] border border-amber-500/30">
              <div className="flex items-center justify-between text-[11px] text-amber-300 font-semibold">
                <span>Total Comprado</span>
                <ShoppingBag className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-lg sm:text-xl font-black text-amber-400 font-mono-nums mt-1">
                {formatCurrency(metrics.totalPurchased, 'PYG')}
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5 font-mono-nums">
                {metrics.purchaseCount} {metrics.purchaseCount === 1 ? 'compra registrada' : 'compras registradas'} • Ticket: {formatCurrency(metrics.ticketMedio, 'PYG')}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#111827] border border-emerald-500/30">
              <div className="flex items-center justify-between text-[11px] text-emerald-300 font-semibold">
                <span>Entrada Efetiva (Pago)</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-lg sm:text-xl font-black text-emerald-400 font-mono-nums mt-1">
                {formatCurrency(metrics.totalEnteredCash, 'PYG')}
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">
                Compras à vista + amortizações pagas
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#111827] border border-rose-500/30">
              <div className="flex items-center justify-between text-[11px] text-rose-300 font-semibold">
                <span>Saída / Custo Estimado (CMV)</span>
                <ArrowDownRight className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-lg sm:text-xl font-black text-rose-400 font-mono-nums mt-1">
                {formatCurrency(metrics.totalEstimatedCost, 'PYG')}
              </div>
              <div className="text-[10px] text-emerald-400 mt-0.5 font-mono-nums">
                Margem Bruta: +{formatCurrency(metrics.estimatedNetProfit, 'PYG')}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#111827] border border-[#1E293B]">
              <div className="flex items-center justify-between text-[11px] text-neutral-300 font-semibold">
                <span>Pendente no Fiado</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className={`text-lg sm:text-xl font-black font-mono-nums mt-1 ${customer.outstandingBalanceBrl > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {formatCurrency(customer.outstandingBalanceBrl, 'PYG')}
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">
                Limite: {formatCurrency(customer.creditLimitBrl, 'PYG')}
              </div>
            </div>
          </div>

          {/* Individual Customer Financial Flow Chart (Entrada vs Saída/Custo vs Fiado) */}
          <div className="p-4 rounded-2xl bg-[#0F1626] border border-[#1E293B] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Gráfico Financeiro do Cliente: Entrada (Recebido) vs Saída (Custo CMV) & Fiado</span>
              </h3>
              <span className="text-[11px] font-mono-nums text-emerald-400 font-bold">
                Resultado Líquido do Cliente: +{formatCurrency(Math.max(0, metrics.totalEnteredCash - metrics.totalEstimatedCost), 'PYG')}
              </span>
            </div>

            <div className="space-y-2.5 pt-1">
              {/* Bar 1: Entrada Paga */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                    Entrada no Caixa (Compras Pagas + Amortizações)
                  </span>
                  <span className="font-mono-nums font-bold text-emerald-400">
                    {formatCurrency(metrics.totalEnteredCash, 'PYG')} ({entryPct}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                  <div
                    style={{ width: `${Math.max(4, entryPct)}%` }}
                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
                  />
                </div>
              </div>

              {/* Bar 2: Saída / Custo de Produção */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-rose-300 font-semibold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                    Saída Operacional / Custo dos Produtos Vendidos (CMV)
                  </span>
                  <span className="font-mono-nums font-bold text-rose-400">
                    -{formatCurrency(metrics.totalEstimatedCost, 'PYG')} ({costPct}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                  <div
                    style={{ width: `${Math.max(4, costPct)}%` }}
                    className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-full transition-all duration-500"
                  />
                </div>
              </div>

              {/* Bar 3: Saldo em Fiado */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-amber-300 font-semibold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
                    Em Aberto no Fiado (A Receber)
                  </span>
                  <span className="font-mono-nums font-bold text-amber-400">
                    {formatCurrency(customer.outstandingBalanceBrl, 'PYG')} ({fiadoPct}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                  <div
                    style={{ width: `${customer.outstandingBalanceBrl > 0 ? Math.max(4, fiadoPct) : 0}%` }}
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form to Manually Register a New Customer Purchase */}
          {isAddingPurchase && (
            <form
              onSubmit={handleSaveNewPurchase}
              className="p-4 rounded-2xl bg-[#131B2E] border border-amber-500/40 space-y-4 animate-in fade-in"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  <span>Registrar Nova Compra para {customer.name} (SQL: registro_compras_clientes)</span>
                </h4>
                <span className="text-[10px] text-neutral-400">Atualiza Total Comprado automaticamente</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
                <div className="md:col-span-5">
                  <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                    Escolher Produto do Catálogo
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={e => {
                      setSelectedProductId(e.target.value);
                      if (e.target.value) {
                        setCustomItemName('');
                        setCustomUnitPrice('');
                      }
                    }}
                    className="w-full bg-[#080B12] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Ou digite um item avulso abaixo --</option>
                    {products
                      .filter(p => !p.isIngredient)
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {formatCurrency(p.priceBrl, 'PYG')}/{p.unit}
                        </option>
                      ))}
                  </select>
                </div>

                {!selectedProductId && (
                  <>
                    <div className="md:col-span-3">
                      <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                        Descrição / Produto Avulso
                      </label>
                      <input
                        type="text"
                        value={customItemName}
                        onChange={e => setCustomItemName(e.target.value)}
                        placeholder="Ex: Pães + Confeitaria"
                        className="w-full bg-[#080B12] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                        Valor Unit. (₲)
                      </label>
                      <input
                        type="number"
                        min="100"
                        step="500"
                        value={customUnitPrice}
                        onChange={e => setCustomUnitPrice(e.target.value)}
                        placeholder="15000"
                        className="w-full bg-[#080B12] border border-[#1E293B] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </>
                )}

                <div className={selectedProductId ? 'md:col-span-3' : 'md:col-span-1'}>
                  <label className="text-[11px] font-semibold text-neutral-300 block mb-1">Qtd</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={itemQuantity}
                    onChange={e => setItemQuantity(e.target.value)}
                    className="w-full bg-[#080B12] border border-[#1E293B] rounded-xl px-2.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className={selectedProductId ? 'md:col-span-4' : 'md:col-span-1'}>
                  <button
                    type="button"
                    onClick={handleAddDraftItem}
                    className="w-full py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    + Item
                  </button>
                </div>
              </div>

              {/* Draft Items List */}
              {draftItems.length > 0 && (
                <div className="p-3 rounded-xl bg-[#080B12] border border-[#1E293B] space-y-1.5">
                  <div className="text-[10px] font-bold text-neutral-400 uppercase">
                    Itens da Compra ({draftItems.length})
                  </div>
                  {draftItems.map((it, i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-neutral-200 py-1 border-b border-neutral-800/60 last:border-0">
                      <span>
                        <strong>{it.quantity} {it.unit}</strong> × {it.productName} ({formatCurrency(it.unitPriceBrl, 'PYG')})
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-nums font-bold text-amber-400">
                          {formatCurrency(it.subtotalBrl, 'PYG')}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDraftItems(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-rose-400 hover:text-rose-300 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between pt-1 text-xs font-black text-amber-400 font-mono-nums">
                    <span>Total da Compra:</span>
                    <span>{formatCurrency(draftTotalBrl, 'PYG')}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                    Forma de Pagamento (Entrada ou Fiado)
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-[#080B12] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="dinheiro">🟢 Dinheiro (Entrada Imediata)</option>
                    <option value="pix">🟢 PIX / QR (Entrada Imediata)</option>
                    <option value="cartao_debito">🟢 Cartão de Débito (Entrada)</option>
                    <option value="cartao_credito">🟢 Cartão de Crédito (Entrada)</option>
                    <option value="transferencia">🟢 Transferência (Entrada)</option>
                    <option value="fiado">🟠 Fiado / Conta do Cliente</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                    Nº Comanda (opcional)
                  </label>
                  <input
                    type="text"
                    value={comandaNumber}
                    onChange={e => setComandaNumber(e.target.value)}
                    placeholder="Ex: 12"
                    className="w-full bg-[#080B12] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                    Observações (opcional)
                  </label>
                  <input
                    type="text"
                    value={purchaseNotes}
                    onChange={e => setPurchaseNotes(e.target.value)}
                    placeholder="Ex: Retirada no balcão"
                    className="w-full bg-[#080B12] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingPurchase(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-700 text-xs text-neutral-300 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Compra no Registro SQL'}
                </button>
              </div>
            </form>
          )}

          {/* Filter & Search Bar for Customer Purchases */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Pesquisar item comprado, comanda, forma de pagamento..."
                className="w-full bg-[#0F1626] border border-[#1E293B] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-amber-500 text-neutral-950'
                    : 'bg-[#0F1626] border border-[#1E293B] text-neutral-400 hover:text-white'
                }`}
              >
                Todas ({allCustomerPurchases.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('paid')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  filterType === 'paid'
                    ? 'bg-emerald-500 text-neutral-950'
                    : 'bg-[#0F1626] border border-[#1E293B] text-neutral-400 hover:text-white'
                }`}
              >
                Pagas / Entrada
              </button>
              <button
                type="button"
                onClick={() => setFilterType('fiado')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  filterType === 'fiado'
                    ? 'bg-rose-500 text-white'
                    : 'bg-[#0F1626] border border-[#1E293B] text-neutral-400 hover:text-white'
                }`}
              >
                No Fiado
              </button>
            </div>
          </div>

          {/* Purchases List */}
          <div className="space-y-3">
            {filteredPurchases.length === 0 ? (
              <div className="text-center py-10 rounded-2xl bg-[#0F1626]/60 border border-dashed border-[#1E293B]">
                <ShoppingBag className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-neutral-300">
                  Nenhuma compra encontrada com os filtros selecionados.
                </p>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Todas as vendas no PDV, Comandas e lançamentos para {customer.name} aparecem automaticamente aqui.
                </p>
              </div>
            ) : (
              filteredPurchases.map(purch => {
                const isFiado = purch.fiadoAmountBrl > 0;
                const dateObj = new Date(purch.purchaseDate);
                const dateStr = dateObj.toLocaleDateString('pt-BR');
                const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const linkedSale = purch.saleId ? sales.find(s => s.id === purch.saleId) : undefined;
                const profit = Math.max(0, purch.totalAmountBrl - purch.estimatedCostBrl);

                return (
                  <div
                    key={purch.id}
                    className="p-4 rounded-2xl bg-[#0F1626] border border-[#1E293B] hover:border-neutral-700 transition-all space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase ${
                            isFiado
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {isFiado
                            ? '🟠 COMPRA EM FIADO'
                            : `🟢 ENTRADA PAGA (${purch.paymentMethod.toUpperCase()})`}
                        </span>

                        {purch.saleNumber && (
                          <span className="text-xs font-mono font-bold text-neutral-300 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                            Venda #{purch.saleNumber}
                          </span>
                        )}
                        {purch.comandaNumber && (
                          <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/30 px-2 py-0.5 rounded border border-amber-500/30">
                            Comanda #{purch.comandaNumber}
                          </span>
                        )}

                        <span className="text-xs text-neutral-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                          {dateStr} às {timeStr}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-base sm:text-lg font-black text-amber-400 font-mono-nums">
                          {formatCurrency(purch.totalAmountBrl, 'PYG')}
                        </span>

                        {linkedSale && onInspectSale && (
                          <button
                            type="button"
                            onClick={() => onInspectSale(linkedSale)}
                            className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                            title="Ver Cupom Não-Fiscal"
                          >
                            <Receipt className="w-3.5 h-3.5 text-amber-400" />
                            <span>Cupom</span>
                          </button>
                        )}

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => deleteCustomerPurchase(purch.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                            title="Excluir registro de compra (Exclusivo Admin)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Items breakdown */}
                    {purch.items && purch.items.length > 0 ? (
                      <div className="rounded-xl bg-[#080B12] border border-[#182235] divide-y divide-[#182235]">
                        {purch.items.map((it, idx) => (
                          <div
                            key={idx}
                            className="px-3 py-2 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Package className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                              <span className="text-neutral-200 font-medium truncate">
                                <strong>{it.quantity} {it.unit}</strong> × {it.productName}
                              </span>
                              <span className="text-[11px] text-neutral-500 font-mono-nums hidden sm:inline">
                                ({formatCurrency(it.unitPriceBrl, 'PYG')}/{it.unit})
                              </span>
                            </div>
                            <span className="font-mono-nums font-bold text-neutral-200 shrink-0">
                              {formatCurrency(it.subtotalBrl, 'PYG')}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-300 bg-[#080B12] px-3 py-2 rounded-xl border border-[#182235]">
                        {purch.itemsSummary}
                      </p>
                    )}

                    {/* Financial Flow Footer for this Purchase */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-neutral-400">
                      <div className="flex flex-wrap items-center gap-3">
                        <span>
                          Operador: <strong className="text-neutral-300">{purch.recordedBy}</strong>
                        </span>
                        {purch.setorResponsavel && (
                          <span>
                            Setor: <strong className="text-neutral-300">{purch.setorResponsavel}</strong>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 font-mono-nums">
                        <span className="text-rose-400">
                          Custo/Saída Est.: -{formatCurrency(purch.estimatedCostBrl, 'PYG')}
                        </span>
                        <span className="text-emerald-400 font-semibold">
                          Margem: +{formatCurrency(profit, 'PYG')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
