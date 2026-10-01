import React, { useState } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { Sale } from '../../types';
import { formatCurrency, fromBrl } from '../../utils/currency';
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  ShieldAlert, 
  CheckCircle2, 
  RotateCcw, 
  Package, 
  User, 
  Clock 
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  sale: Sale | null;
  onClose: () => void;
  onDeleted?: () => void;
}

export const DeleteSaleModal: React.FC<Props> = ({
  isOpen,
  sale,
  onClose,
  onDeleted,
}) => {
  const { currentUser, deleteSale, exchangeRates, language } = useBakery();
  const [restoreStock, setRestoreStock] = useState<boolean>(true);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !sale) return null;

  const isAdmin = currentUser.role === 'admin';

  const handleDelete = async () => {
    if (!isAdmin) {
      setErrorMsg(
        language === 'es'
          ? 'Operación denegada. Solo los administradores pueden eliminar ventas.'
          : 'Operação negada. Apenas o administrador pode excluir vendas.'
      );
      return;
    }

    try {
      setIsDeleting(true);
      setErrorMsg(null);
      await deleteSale(sale.id, restoreStock);
      setIsDeleting(false);
      onClose();
      if (onDeleted) onDeleted();
    } catch (err: any) {
      setIsDeleting(false);
      setErrorMsg(err.message || 'Erro ao excluir venda.');
    }
  };

  const formattedDate = new Date(sale.timestamp).toLocaleString(
    language === 'es' ? 'es-PY' : 'pt-BR',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-1.5">
                <span>{language === 'es' ? 'Excluir Venta' : 'Excluir Venda'}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono-nums">
                  #{sale.saleNumber || sale.id.slice(-4)}
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                {language === 'es' ? 'Función exclusiva para Administrador' : 'Função exclusiva para Administrador'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          
          {/* Admin Validation Check */}
          {!isAdmin ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-2 text-center">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 mx-auto flex items-center justify-center text-amber-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                {language === 'es' ? 'Permiso Insuficiente' : 'Permissão Insuficiente'}
              </h4>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {language === 'es'
                  ? `Su perfil atual (${currentUser.name}) es "${currentUser.role}". Solamente usuarios con rol de Administrador pueden cancelar y borrar ventas registradas.`
                  : `Seu usuário atual (${currentUser.name}) possui perfil "${currentUser.role}". Apenas usuários Administradores podem cancelar e excluir vendas registradas.`}
              </p>
            </div>
          ) : (
            <>
              {/* Warning Banner */}
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-rose-300">
                    {language === 'es' 
                      ? '¿Está seguro de que desea eliminar esta venta?' 
                      : 'Tem certeza de que deseja excluir esta venda?'}
                  </p>
                  <p className="text-[11px] text-rose-200/80 leading-relaxed">
                    {language === 'es'
                      ? 'Esta acción eliminará el registro de la venta en la base de datos, descontará el total de la caja y revertirá los datos financieros.'
                      : 'Esta ação removerá o registro da venda no banco de dados, descontará o valor do caixa e recalculará os totais operacionais.'}
                  </p>
                </div>
              </div>

              {/* Sale Summary Card */}
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-850">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{language === 'es' ? 'Operador:' : 'Operador:'}</span>
                  </span>
                  <span className="font-semibold text-neutral-200">{sale.employeeName || '—'}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-neutral-850">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{language === 'es' ? 'Fecha / Hora:' : 'Data / Hora:'}</span>
                  </span>
                  <span className="font-mono-nums text-neutral-300">{formattedDate}</span>
                </div>

                {sale.customerName && (
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-850">
                    <span className="text-neutral-400">{language === 'es' ? 'Cliente:' : 'Cliente:'}</span>
                    <span className="font-semibold text-amber-400">{sale.customerName}</span>
                  </div>
                )}

                {/* Items preview */}
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 flex items-center gap-1">
                    <Package className="w-3 h-3 text-neutral-500" />
                    <span>{language === 'es' ? 'Ítems de la venta:' : 'Itens da venda:'}</span>
                  </span>
                  <div className="max-h-24 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                    {sale.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-[11px] text-neutral-300">
                        <span>
                          <strong className="text-amber-400 font-mono-nums mr-1">{it.quantity}x</strong>
                          {it.product.name}
                        </span>
                        <span className="font-mono-nums text-neutral-400">
                          {formatCurrency(it.subtotalBrl, 'PYG')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total amount highlight */}
                <div className="pt-2 border-t border-neutral-800 flex items-baseline justify-between">
                  <span className="font-bold text-neutral-300 uppercase tracking-wider text-[11px]">
                    {language === 'es' ? 'Total de la Venta:' : 'Total da Venda:'}
                  </span>
                  <div className="text-right">
                    <div className="text-base font-bold text-amber-400 font-mono-nums">
                      {formatCurrency(sale.totalBrl, 'PYG')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Restore Stock Checkbox */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-neutral-950/80 border border-neutral-850 cursor-pointer hover:border-neutral-750 transition-colors">
                <input
                  type="checkbox"
                  checked={restoreStock}
                  onChange={(e) => setRestoreStock(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-neutral-700 bg-neutral-800 cursor-pointer"
                />
                <div className="text-xs space-y-0.5">
                  <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{language === 'es' ? 'Estornar ítems al stock' : 'Estornar itens ao estoque'}</span>
                  </span>
                  <p className="text-[11px] text-neutral-400">
                    {language === 'es'
                      ? 'Devuelve automáticamente las cantidades de cada producto al inventario.'
                      : 'Devolve automaticamente as quantidades de cada produto ao estoque.'}
                  </p>
                </div>
              </label>

              {/* Error notice if any */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {errorMsg}
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {language === 'es' ? 'Cancelar' : 'Cancelar'}
          </button>
          
          {isAdmin && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-600/20 active:scale-95 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>
                {isDeleting
                  ? (language === 'es' ? 'Eliminando...' : 'Excluindo...')
                  : (language === 'es' ? 'Confirmar Exclusión' : 'Confirmar Exclusão')}
              </span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
