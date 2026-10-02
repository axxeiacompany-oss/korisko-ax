import React, { useState, useEffect, useRef } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { Product, ProductCategory } from '../../types';
import { 
  X, 
  PackagePlus, 
  Check, 
  Camera, 
  Upload, 
  Image as ImageIcon, 
  Trash2, 
  Coins, 
  Boxes, 
  Tag, 
  AlertCircle,
  HelpCircle,
  FileText,
  Calendar,
  Layers
} from 'lucide-react';

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
  const { addProduct, updateProduct, currentUser, showToast, language } = useBakery();
  
  const canEditCostPrice =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'gerente' ||
    currentUser?.role === 'padeiro' ||
    currentUser?.role === 'estoquista';

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
      setName(productToEdit.name || '');
      setCode(productToEdit.code || '');
      setCategory(productToEdit.category || 'paes');
      setPriceBrl(productToEdit.priceBrl ? productToEdit.priceBrl.toString() : '0');
      setCostPriceBrl(productToEdit.costPriceBrl ? productToEdit.costPriceBrl.toString() : '0');
      setStock(productToEdit.stock !== undefined ? productToEdit.stock.toString() : '0');
      setMinStock(productToEdit.minStock !== undefined ? productToEdit.minStock.toString() : '5');
      setUnit(productToEdit.unit || 'un');
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

  // Real-time Margin Calculation
  const numericPrice = parseFloat(priceBrl) || 0;
  const numericCost = parseFloat(costPriceBrl) || 0;
  const estimatedProfit = numericPrice - numericCost;
  const marginPercentage = numericPrice > 0 ? Math.round((estimatedProfit / numericPrice) * 100) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast(
        language === 'es' ? 'El nombre del producto es obligatorio.' : 'O nome do produto é obrigatório.',
        'error'
      );
      return;
    }

    const parsedPrice = parseFloat(priceBrl) || 0;
    const parsedCost = parseFloat(costPriceBrl) || 0;
    const parsedStock = parseFloat(stock) || 0;
    const parsedMinStock = parseFloat(minStock) || 0;

    setIsSubmitting(true);
    try {
      if (productToEdit) {
        await updateProduct({
          ...productToEdit,
          name: name.trim(),
          code: code.trim() || `PRD-${Date.now().toString().slice(-4)}`,
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
        showToast(
          language === 'es' ? '¡Producto actualizado con éxito!' : 'Produto alterado e salvo com sucesso!',
          'success'
        );
      } else {
        await addProduct({
          name: name.trim(),
          code: code.trim() || `PRD-${Date.now().toString().slice(-4)}`,
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
        showToast(
          language === 'es' ? '¡Producto registrado con éxito!' : 'Novo produto cadastrado com sucesso!',
          'success'
        );
      }
      onClose();
    } catch (err: any) {
      showToast(
        language === 'es' ? 'Error al guardar producto.' : 'Erro ao salvar o produto.',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="relative w-full max-w-xl max-h-[94vh] sm:max-h-[90vh] flex flex-col bg-neutral-900 border border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Fixed Header (Always visible at top of modal on all devices) */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-neutral-100 truncate">
                  {productToEdit ? (language === 'es' ? 'Editar Producto' : 'Editar Produto') : (language === 'es' ? 'Nuevo Producto' : 'Cadastrar Novo Item')}
                </h2>
                {productToEdit && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold truncate max-w-[130px]">
                    {productToEdit.name}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 truncate">
                {language === 'es' 
                  ? 'Ajuste precios, stock, foto y detalles del catálogo' 
                  : 'Ajuste preços, estoque, foto e dados cadastrais do item'}
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body (Glides smoothly on touch and mouse wheel) */}
        <form 
          id="product-form"
          onSubmit={handleSubmit} 
          className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          
          {/* Section 1: Identificação Básica */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Tag className="w-3.5 h-3.5" />
              <span>1. Identificação do Produto</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Name */}
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Nome do Produto <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Baguete Francesa Tradicional"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors shadow-inner"
                />
              </div>

              {/* Code */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Código / SKU
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="PAO-010"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Category */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="paes">🥖 Pães Artesanais & Tradicionais</option>
                  <option value="confeitaria">🎂 Confeitaria & Bolos</option>
                  <option value="salgados">🥐 Salgados & Lanches</option>
                  <option value="bebidas">☕ Cafeteria & Bebidas</option>
                  <option value="frios">🧀 Frios & Laticínios</option>
                  <option value="ingredientes">🌾 Ingredientes / Matéria-prima</option>
                </select>
              </div>

              {/* Unit */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Unidade de Medida
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as any)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="un">Unidade (un)</option>
                  <option value="kg">Quilograma (kg)</option>
                  <option value="g">Gramas (g)</option>
                  <option value="pct">Pacote / Fardo (pct)</option>
                  <option value="l">Litro (l)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Preços, Custos & Margem */}
          <div className="space-y-3 pt-4 border-t border-neutral-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <Coins className="w-3.5 h-3.5" />
                <span>2. Preços & Lucratividade</span>
              </div>
              {numericPrice > 0 && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  marginPercentage >= 40 
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                    : marginPercentage >= 20 
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                }`}>
                  Margem: {marginPercentage}% ({estimatedProfit > 0 ? `+₲ ${estimatedProfit.toLocaleString('es-PY')}` : `₲ ${estimatedProfit.toLocaleString('es-PY')}`})
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Sale Price Guaraní */}
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <label className="text-xs font-bold text-amber-300 flex items-center justify-between mb-1">
                  <span>Preço de Venda (₲ PYG) *</span>
                  <span className="text-[10px] text-amber-400/80 font-normal">Valor Cobrado</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-400">₲</span>
                  <input
                    type="number"
                    step="100"
                    required
                    placeholder="15000"
                    value={priceBrl}
                    onChange={(e) => setPriceBrl(e.target.value)}
                    className="w-full bg-neutral-950 border border-amber-500/40 rounded-xl pl-8 pr-3 py-2 text-sm font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 shadow-inner"
                  />
                </div>
              </div>

              {/* Cost Price */}
              <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
                <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between mb-1">
                  <span>Custo Unitário (₲ PYG)</span>
                  <span className="text-[10px] text-neutral-500">
                    {canEditCostPrice ? 'Admin/Gerente' : 'Bloqueado'}
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-500">₲</span>
                  <input
                    type="number"
                    step="100"
                    placeholder="6000"
                    disabled={!canEditCostPrice}
                    value={costPriceBrl}
                    onChange={(e) => setCostPriceBrl(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-8 pr-3 py-2 text-sm font-mono text-neutral-300 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Estoque Atual & Alerta */}
          <div className="space-y-3 pt-4 border-t border-neutral-800/80">
            <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
              <Boxes className="w-3.5 h-3.5" />
              <span>3. Controle de Estoque</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Current Stock */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Estoque Atual ({unit}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Min Stock */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Alerta Mínimo ({unit})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Foto do Produto */}
          <div className="space-y-3 pt-4 border-t border-neutral-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-200 uppercase tracking-wider">
                <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>4. Foto do Produto</span>
              </div>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remover foto</span>
                </button>
              )}
            </div>

            {/* Mobile / Desktop Action buttons */}
            <div className="grid grid-cols-2 gap-2">
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
                className="py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-750 active:scale-[0.98] text-neutral-100 text-xs font-semibold border border-neutral-700 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Camera className="w-4 h-4 text-amber-400" />
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
                className="py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-750 active:scale-[0.98] text-neutral-100 text-xs font-semibold border border-neutral-700 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Upload className="w-4 h-4 text-sky-400" />
                <span>Galeria / Arquivo</span>
              </button>
            </div>

            {/* Photo Preview Card */}
            {imageUrl ? (
              <div className="relative w-full h-36 rounded-xl overflow-hidden border border-neutral-700 bg-neutral-950 shadow-inner">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md text-[11px] text-emerald-400 font-bold flex items-center gap-1.5 shadow">
                  <Check className="w-3.5 h-3.5 stroke-[3]" /> 
                  <span>Foto pronta para salvar</span>
                </div>
              </div>
            ) : null}

            {/* URL Input fallback */}
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Ou cole a URL da imagem (ex: /images/products/cuca.jpg)..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Section 5: Informações Adicionais */}
          <div className="space-y-3 pt-4 border-t border-neutral-800/80">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5" />
              <span>5. Detalhes & Validade</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">
                Descrição do Produto (opcional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Pão artesanal de fermentação lenta (levain), crosta crocante e miolo super aerado..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              {/* Expiration Date */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Data de Validade (opcional)
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Is Raw Material / Ingredient */}
              <div className="pt-2 sm:pt-4">
                <label className="flex items-center gap-2.5 p-2 rounded-xl bg-neutral-950 border border-neutral-800 cursor-pointer hover:border-neutral-700 transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={isIngredient}
                    onChange={(e) => setIsIngredient(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-amber-500 focus:ring-0 cursor-pointer"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-neutral-200 block">
                      Matéria-prima interna
                    </span>
                    <span className="text-[10px] text-neutral-500 block">
                      Usado para produção nas receitas
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

        </form>

        {/* Fixed Sticky Footer (Always visible at bottom on all devices, phones and computers) */}
        <div className="shrink-0 flex items-center justify-between sm:justify-end gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur-md">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-neutral-800 text-xs font-semibold text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer text-center"
          >
            {language === 'es' ? 'Cancelar' : 'Cancelar'}
          </button>
          
          <button
            type="submit"
            form="product-form"
            disabled={isSubmitting || !name.trim()}
            className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-neutral-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="inline-block animate-spin w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full" />
            ) : (
              <Check className="w-4 h-4 stroke-[3]" />
            )}
            <span>
              {isSubmitting 
                ? (language === 'es' ? 'Guardando...' : 'Salvando...') 
                : productToEdit 
                ? (language === 'es' ? 'Guardar Cambios' : 'Salvar Alterações') 
                : (language === 'es' ? 'Crear Producto' : 'Cadastrar Produto')}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
