import React from 'react';
import { Sale } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { Printer, X, Check, UtensilsCrossed } from 'lucide-react';

interface Props {
  sale: Sale | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<Props> = ({ sale, onClose }) => {
  if (!sale) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top actions bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950/60 no-print">
          <span className="text-xs font-semibold text-neutral-300">Cupom Não-Fiscal</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Thermal Receipt Paper Container */}
        <div className="p-6 bg-white text-neutral-950 font-mono text-xs selection:bg-neutral-200" id="printable-receipt">
          
          {/* Header */}
          <div className="text-center pb-3 border-b border-dashed border-neutral-300 space-y-1">
            <h3 className="text-base font-bold tracking-tight uppercase">KORISKO</h3>
            <p className="text-[11px] text-neutral-600">Padaria Artesanal & Confeitaria</p>
            <p className="text-[10px] text-neutral-500">Câmbio Multi-Moeda BRL · PYG · USD</p>
            <p className="text-[10px] text-neutral-500">CNPJ: 12.345.678/0001-90</p>
          </div>

          {/* Sale details */}
          <div className="py-2.5 border-b border-dashed border-neutral-300 text-[11px] space-y-0.5">
            <div className="flex justify-between">
              <span>VENDA NÚMERO:</span>
              <span className="font-bold">#{sale.saleNumber}</span>
            </div>
            {sale.comandaNumber && (
              <div className="flex justify-between text-neutral-800 font-bold">
                <span>COMANDA / MESA:</span>
                <span>#{sale.comandaNumber}</span>
              </div>
            )}
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
              {sale.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="font-semibold text-neutral-900 leading-tight">
                    {item.product.name}
                  </div>
                  <div className="flex justify-between text-[11px] text-neutral-600">
                    <span>
                      {item.quantity} {item.product.unit} × {formatCurrency(item.unitPriceBrl, 'BRL')}
                    </span>
                    <span className="font-bold text-neutral-900">
                      {formatCurrency(item.subtotalBrl, 'BRL')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="py-3 border-b border-dashed border-neutral-300 space-y-1">
            {sale.discountBrl && sale.discountBrl > 0 && (
              <>
                <div className="flex justify-between text-[11px] text-neutral-600">
                  <span>SUBTOTAL:</span>
                  <span>{formatCurrency(sale.subtotalBrl || sale.totalBrl + sale.discountBrl, 'BRL')}</span>
                </div>
                <div className="flex justify-between text-[11px] text-emerald-700 font-semibold">
                  <span>DESCONTO / CORTESIA:</span>
                  <span>- {formatCurrency(sale.discountBrl, 'BRL')}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-sm font-bold pt-0.5">
              <span>TOTAL (BRL):</span>
              <span>{formatCurrency(sale.totalBrl, 'BRL')}</span>
            </div>
          </div>

          {/* Multi-Currency Payments breakdown */}
          <div className="py-3 border-b border-dashed border-neutral-300 text-[11px] space-y-1">
            <span className="text-[10px] uppercase font-bold text-neutral-500 block">
              FORMA DE PAGAMENTO RECEBIDA:
            </span>
            {sale.payments.map((p, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="capitalize">
                  {p.currency} ({p.method.replace('_', ' ')}):
                </span>
                <span className="font-bold">
                  {formatCurrency(p.amountReceived, p.currency)}
                  {p.currency !== 'BRL' && (
                    <span className="text-[10px] text-neutral-500 font-normal ml-1">
                      (R$ {p.equivalentBrl.toFixed(2)})
                    </span>
                  )}
                </span>
              </div>
            ))}

            {sale.changeGiven && sale.changeGiven.amount > 0 && (
              <div className="flex justify-between pt-1 border-t border-dotted border-neutral-200 font-bold text-neutral-800">
                <span>TROCO ENTREGUE:</span>
                <span>
                  {formatCurrency(sale.changeGiven.amount, sale.changeGiven.currency)}
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
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 no-print">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Nova Venda (Concluído)
          </button>
        </div>

      </div>
    </div>
  );
};
