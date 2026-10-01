import React, { useState, useEffect, useRef } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { Product, ProductCategory } from '../../types';
import { X, Plus, PackagePlus, Check, Camera, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';

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
  const [priceBrl, setPriceBrl] = useState('18000');
  const [costPriceBrl, setCostPriceBrl] = useState('6000');
  const [stock, setStock] = useState('20');
  const [minStock, setMinStock] = useState('5');
  const [unit, setUnit] = useState<'un' | 'kg' | 'g' | 'pct' | 'l'>('un');
  const [isIngredient, setIsIngredient] = useState(false);
  const [expirationDate, setExpirationDate] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Compress image on mobile to prevent Android memory crash & large payloads
  const handleFileProcess = (file: File) => {
    if (!file) return;
    setIsCompressing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 960;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setImageUrl(compressedDataUrl);
        } else {
          setImageUrl(e.target?.result as string);
        }
        setIsCompressing(false);
      };
      img.onerror = () => {
        setImageUrl(e.target?.result as string);
        setIsCompressing(false);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => setIsCompressing(false);
    reader.readAsDataURL(file);
  };

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
      setImageUrl(productToEdit.imageUrl || '');
      setDescription(productToEdit.description || '');
    } else {
      setName('');
      setCode(`PAN-${Math.floor(100 + Math.random() * 900)}`);
      setCategory('paes');
      setPriceBrl('18000');
      setCostPriceBrl('6000');
      setStock('20');
      setMinStock('5');
      setUnit('un');
      setIsIngredient(false);
      setExpirationDate('');
      setImageUrl('');
      setDescription('');
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
        imageUrl: imageUrl.trim() || undefined,
        description: description.trim() || undefined,
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
        imageUrl: imageUrl.trim() || undefined,
        description: description.trim() || undefined,
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
            {/* Price Guaraní */}
            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1">
                Preço Venda (₲ PYG) *
              </label>
              <input
                type="number"
                step="100"
                required
                placeholder="15000"
                value={priceBrl}
                onChange={(e) => setPriceBrl(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono-nums font-semibold text-amber-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Cost Price */}
            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1">
                Custo (₲ PYG)
              </label>
              <input
                type="number"
                step="100"
                placeholder="8000"
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

          {/* Photo & Description */}
          <div className="space-y-3 pt-2 border-t border-neutral-800/80">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                  Foto do Produto
                </label>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remover foto
                  </button>
                )}
              </div>

              {/* Mobile Quick Upload Buttons (Camera + Gallery) */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileProcess(file);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={isCompressing}
                  className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-750 active:bg-neutral-700 text-neutral-100 text-xs font-semibold border border-neutral-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isCompressing ? 'Processando...' : 'Tirar Foto'}</span>
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileProcess(file);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressing}
                  className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-750 active:bg-neutral-700 text-neutral-100 text-xs font-semibold border border-neutral-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-sky-400" />
                  <span>Galeria / Arquivo</span>
                </button>
              </div>

              {/* Photo Preview Card */}
              {imageUrl ? (
                <div className="relative w-full h-32 rounded-xl overflow-hidden border border-neutral-750 bg-neutral-950 mb-2">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Foto pronta para salvar
                  </div>
                </div>
              ) : null}

              {/* Direct URL Input fallback */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Ou cole a URL da imagem (ex: /images/products/cuca-alema.jpg)..."
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1">
                Descrição do Produto (opcional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Massa fofinha tradicional com farta cobertura de doce de leite..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 resize-none"
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
