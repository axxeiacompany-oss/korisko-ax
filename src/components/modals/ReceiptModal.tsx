import React, { useState } from 'react';
import { Sale } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { Printer, X, Check, Share2, Copy, Trash2 } from 'lucide-react';
import { useBakery } from '../../context/BakeryContext';
import { resolveSetoresFromItems } from '../../lib/db';
import { DeleteSaleModal } from './DeleteSaleModal';

interface Props {
  sale: Sale | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<Props> = ({ sale, onClose }) => {
  const { currentUser, language } = useBakery();
  const isAdmin = currentUser.role === 'admin';
  const [copied, setCopied] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  if (!sale) return null;

  const sectorLabel = sale.setorResponsavel || resolveSetoresFromItems(sale.items || []).label;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(sale.timestamp).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const getReceiptPlainText = () => {
    let text = `⚡ *KORIZKO*\n`;
    text += `*Panificação confeitaria artesanal*\n`;
    text += `Extrato / Cupom da Venda #${sale.saleNumber}\n`;
    if (sale.comandaNumber) text += `Comanda Confirmada: #${sale.comandaNumber}\n`;
    text += `Setor Responsável: ${sectorLabel}\n`;
    text += `Data: ${formattedDate}\n`;
    text += `Operador: ${sale.employeeName}\n`;
    if (sale.customerName) text += `Cliente: ${sale.customerName} (Pedido Confirmado)\n`;
    text += `--------------------------------\n`;
    (sale.items || []).forEach(it => {
      const name = it.product?.name || (it as any).name || 'Produto';
      const unit = it.product?.unit || (it as any).unit || 'un';
      const unitPrice = it.unitPriceBrl || 0;
      const subtotal = it.subtotalBrl || (unitPrice * (it.quantity || 1));
      text += `${name}\n${it.quantity} ${unit} x ₲ ${Math.round(unitPrice).toLocaleString('es-PY')} = ₲ ${Math.round(subtotal).toLocaleString('es-PY')}\n`;
    });
    text += `--------------------------------\n`;
    text += `*TOTAL: ₲ ${Math.round(sale.totalBrl).toLocaleString('es-PY')}*\n`;
    text += `Korizko • Panificação confeitaria artesanal`;
    return text;
  };

  const handleShare = async () => {
    const text = getReceiptPlainText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Cupom Korizko #${sale.saleNumber}`,
          text: text,
        });
        return;
      } catch {}
    }
    // Fallback WhatsApp Web/App link
    const encoded = encodeURIComponent(text);
    try {
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    } catch {
      handleCopy();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getReceiptPlainText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4 overflow-y-auto">
      <div className="w-full max-w-sm bg-neutral-900 border-t sm:border border-neutral-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        {/* Mobile Drag handle */}
        <div className="sm:hidden w-12 h-1 rounded-full bg-neutral-700 mx-auto mt-2.5 mb-1" />

        {/* Top actions bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950/60 no-print">
          <div>
            <span className="text-xs font-bold text-white block leading-none">Korizko • Extrato & Cupom</span>
            <span className="text-[10px] text-amber-400 font-medium">Panificação confeitaria artesanal</span>
          </div>
          <div className="flex items-center gap-1.5">
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="px-2.5 py-1.5 rounded-lg bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title={language === 'es' ? 'Excluir Venta (Solo Admin)' : 'Excluir Venda (Somente Admin)'}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">{language === 'es' ? 'Excluir Venta' : 'Excluir Venda'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleShare}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Compartilhar pelo WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Thermal Receipt Paper Container */}
        <div className="p-6 bg-white text-neutral-950 font-mono text-xs selection:bg-neutral-200" id="printable-receipt">
          
          {/* Header */}
          <div className="text-center pb-3 border-b border-dashed border-neutral-300 space-y-0.5">
            <h3 className="text-base font-extrabold tracking-tight uppercase">KORIZKO</h3>
            <p className="text-[11px] font-bold text-neutral-800">Panificação confeitaria artesanal</p>
            <p className="text-[10px] text-neutral-500">Extrato & Comprovante • Guaraní (₲ PYG)</p>
          </div>

          {/* Sale details */}
          <div className="py-2.5 border-b border-dashed border-neutral-300 text-[11px] space-y-0.5">
            <div className="flex justify-between">
              <span>VENDA NÚMERO:</span>
              <span className="font-bold">#{sale.saleNumber}</span>
            </div>
            {sale.comandaNumber && (
              <div className="flex justify-between text-neutral-900 font-bold">
                <span>COMANDA CONFIRMADA:</span>
                <span>#{sale.comandaNumber}</span>
              </div>
            )}
            <div className="flex justify-between text-neutral-800 font-semibold">
              <span>SETOR RESPONSÁVEL:</span>
              <span className="text-right">{sectorLabel}</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>STATUS DO PEDIDO:</span>
              <span className="font-bold text-emerald-700">CONFIRMADO PELO CLIENTE</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>DATA/HORA:</span>
              <span>{formattedDate}</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>OPERADOR:</span>
              <span>{sale.employeeName}</span>
            </div>
            {sale.customerName && (
              <div className="flex justify-between text-neutral-600">
                <span>CLIENTE:</span>
                <span>{sale.customerName}</span>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="py-3 border-b border-dashed border-neutral-300 space-y-2">
            <div className="text-[10px] uppercase font-bold text-neutral-500 flex justify-between">
              <span>ITEM / QTD × PREÇO</span>
              <span>TOTAL</span>
            </div>
            
            <div className="space-y-1.5">
              {(sale.items || []).map((item, idx) => {
                const name = item.product?.name || (item as any).name || 'Produto';
                const unit = item.product?.unit || (item as any).unit || 'un';
                const unitPrice = item.unitPriceBrl || 0;
                const subtotal = item.subtotalBrl || (unitPrice * (item.quantity || 1));
                return (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-semibold text-neutral-900 leading-tight">
                      {name}
                    </div>
                    <div className="flex justify-between text-[11px] text-neutral-600">
                      <span>
                        {item.quantity} {unit} × {formatCurrency(unitPrice, 'PYG')}
                      </span>
                      <span className="font-bold text-neutral-900">
                        {formatCurrency(subtotal, 'PYG')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Total */}
          <div className="py-3 border-b border-dashed border-neutral-300 space-y-1">
            {Boolean(sale.discountBrl && sale.discountBrl > 0) && (
              <>
                <div className="flex justify-between text-[11px] text-neutral-600">
                  <span>SUBTOTAL:</span>
                  <span>{formatCurrency(sale.subtotalBrl || (sale.totalBrl + (sale.discountBrl || 0)), 'PYG')}</span>
                </div>
                <div className="flex justify-between text-[11px] text-emerald-700 font-semibold">
                  <span>DESCONTO / CORTESIA:</span>
                  <span>- {formatCurrency(sale.discountBrl || 0, 'PYG')}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-sm font-bold pt-0.5">
              <span>TOTAL (₲):</span>
              <span>{formatCurrency(sale.totalBrl, 'PYG')}</span>
            </div>
          </div>

          {/* Payments breakdown */}
          <div className="py-3 border-b border-dashed border-neutral-300 text-[11px] space-y-1">
            <span className="text-[10px] uppercase font-bold text-neutral-500 block">
              FORMA DE PAGAMENTO RECEBIDA:
            </span>
            {sale.payments.map((p, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="capitalize">
                  {p.method.replace('_', ' ')}:
                </span>
                <span className="font-bold">
                  {formatCurrency(p.amountReceived, 'PYG')}
                </span>
              </div>
            ))}

            {sale.changeGiven && sale.changeGiven.amount > 0 && (
              <div className="flex justify-between pt-1 border-t border-dotted border-neutral-200 font-bold text-neutral-800">
                <span>TROCO ENTREGUE:</span>
                <span>
                  {formatCurrency(sale.changeGiven.amount, 'PYG')}
                </span>
              </div>
            )}
          </div>

          {/* Footer message */}
          <div className="pt-4 text-center text-[10px] text-neutral-500 space-y-1">
            <p>Obrigado pela preferência!</p>
            <p>Pão quentinho a toda hora.</p>
            <p className="text-[9px] text-neutral-400 mt-2">www.korisko.com.br</p>
          </div>

        </div>

        {/* Bottom button */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 no-print space-y-2 safe-area-pb">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/10"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            Nova Venda (Concluído)
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="w-full py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>{language === 'es' ? 'Excluir Venta Definitivamente (Admin)' : 'Excluir Venda Definitivamente (Admin)'}</span>
            </button>
          )}
        </div>

      </div>

      {/* Delete Sale Modal (Admin Exclusive) */}
      <DeleteSaleModal
        isOpen={isDeleteModalOpen}
        sale={sale}
        onClose={() => setIsDeleteModalOpen(false)}
        onDeleted={() => {
          setIsDeleteModalOpen(false);
          onClose();
        }}
      />
    </div>
  );
};
