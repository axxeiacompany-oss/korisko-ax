import React, { useState, useEffect } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { Product, ProductCategory } from '../../types';
import { X, Plus, PackagePlus, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
}

export const NewProductModal: React.FC<Props> = ({
  isOpen,
  onClose,
  productToEdit,
}) => {
  const { addProduct, updateProduct } = useBakery();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState<ProductCategory>('paes');
  const [priceBrl, setPriceBrl] = useState('15.00');
  const [costPriceBrl, setCostPriceBrl] = useState('5.00');
  const [stock, setStock] = useState('10');
  const [minStock, setMinStock] = useState('5');
  const [unit, setUnit] = useState<'un' | 'kg' | 'g' | 'pct' | 'l'>('un');
  const [isIngredient, setIsIngredient] = useState(false);
  const [expirationDate, setExpirationDate] = useState('');

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setCode(productToEdit.code);
      setCategory(productToEdit.category);
      setPriceBrl(productToEdit.priceBrl.toString());
      setCostPriceBrl(productToEdit.costPriceBrl.toString());
      setStock(productToEdit.stock.toString());
      setMinStock(productToEdit.minStock.toString());
      setUnit(productToEdit.unit);
      setIsIngredient(!!productToEdit.isIngredient);
      setExpirationDate(productToEdit.expirationDate || '');
    } else {
      setName('');
      setCode(`PAN-${Math.floor(100 + Math.random() * 900)}`);
      setCategory('paes');
      setPriceBrl('18.00');
      setCostPriceBrl('6.00');
      setStock('20');
      setMinStock('5');
      setUnit('un');
      setIsIngredient(false);
      setExpirationDate('');
    }
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedPrice = parseFloat(priceBrl) || 0;
    const parsedCost = parseFloat(costPriceBrl) || 0;
    const parsedStock = parseFloat(stock) || 0;
    const parsedMinStock = parseFloat(minStock) || 0;

    if (productToEdit) {
      updateProduct({
        ...productToEdit,
        name: name.trim(),
        code: code.trim(),
        category,
        priceBrl: parsedPrice,
        costPriceBrl: parsedCost,
        stock: parsedStock,
        minStock: parsedMinStock,
        unit,
        isIngredient,
        expirationDate: expirationDate || undefined,
      });
    } else {
      addProduct({
        name: name.trim(),
        code: code.trim(),
        category,
        priceBrl: parsedPrice,
        costPriceBrl: parsedCost,
        stock: parsedStock,
        minStock: parsedMinStock,
        unit,
        isIngredient,
        expirationDate: expirationDate || undefined,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <PackagePlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100">
                {productToEdit ? 'Editar Produto' : 'Cadastrar Novo Item'}
              </h2>
              <p className="text-xs text-neutral-400">Controle de estoque, custos e preços de venda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Name */}
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-neutral-300 block mb-1">
                Nome do Produto *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Baguete Rústica com Gergelim"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Code */}
            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1">
                Código / SKU
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="PAO-010"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs font-mono-nums text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
              >
                <option value="paes">Pães Artesanais & Tradicionais</option>
                <option value="confeitaria">Confeitaria & Bolos</option>
                <option value="salgados">Salgados & Lanches</option>
                <option value="bebidas">Cafeteria & Bebidas</option>
                <option value="frios">Frios & Laticínios</option>
                <option value="ingredientes">Ingredientes / Matéria-prima</option>
              </select>
            </div>

            {/* Unit */}
            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1">
                Unidade de Medida
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as any)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
              >
                <option value="un">Unidade (un)</option>
                <option value="kg">Quilograma (kg)</option>
                <option value="g">Gramas (g)</option>
                <option value="pct">Pacote / Fardo (pct)</option>
                <option value="l">Litro (l)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Price BRL */}
            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1">
                Preço Venda (R$)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={priceBrl}
                onChange={(e) => setPriceBrl(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono-nums font-semibold text-emerald-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Cost Price */}
            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1">
                Custo (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={costPriceBrl}
                onChange={(e) => setCostPriceBrl(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono-nums text-neutral-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Current Stock */}
            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1">
                Estoque Atual
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono-nums font-semibold text-neutral-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Min Stock */}
            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1">
                Alerta Mínimo
              </label>
              <input
                type="number"
                step="0.1"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono-nums text-amber-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Expiration Date */}
            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1">
                Data de Validade (Opcional)
              </label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Is Raw Material / Ingredient */}
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="isIngredient"
                checked={isIngredient}
                onChange={(e) => setIsIngredient(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-amber-500 focus:ring-0"
              />
              <label htmlFor="isIngredient" className="text-xs text-neutral-300 select-none">
                É matéria-prima / ingrediente interno
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-neutral-800 text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold shadow-lg shadow-amber-500/10 transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              {productToEdit ? 'Salvar Alterações' : 'Cadastrar Produto'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
