import React, { useState, useMemo } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { FichaTecnica, RecipeIngredient, ProductCategory } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { 
  ChefHat, 
  Plus, 
  Search, 
  Flame, 
  Clock, 
  Scale, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  Edit3, 
  Trash2, 
  Play, 
  Percent, 
  TrendingUp, 
  Layers, 
  FileText, 
  X,
  Package,
  ArrowRight,
  Info
} from 'lucide-react';

export const FichaTecnicaView: React.FC = () => {
  const { 
    fichasTecnicas, 
    products, 
    addFichaTecnica, 
    updateFichaTecnica, 
    deleteFichaTecnica, 
    executeProductionFromRecipe,
    hasPermission,
    exchangeRates
  } = useBakery();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [selectedFichaForDetails, setSelectedFichaForDetails] = useState<FichaTecnica | null>(null);
  
  // Production Modal state
  const [productionTarget, setProductionTarget] = useState<FichaTecnica | null>(null);
  const [batchMultiplier, setBatchMultiplier] = useState<number>(1);
  const [productionFeedback, setProductionFeedback] = useState<{
    success: boolean;
    message: string;
    missingIngredients?: { name: string; needed: number; unit: string; available: number }[];
  } | null>(null);

  // Form Modal state (Create/Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFichaId, setEditingFichaId] = useState<string | null>(null);

  // Form fields
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ProductCategory>('paes');
  const [formTargetProductId, setFormTargetProductId] = useState<string>('');
  const [formYieldQuantity, setFormYieldQuantity] = useState<string>('50');
  const [formYieldUnit, setFormYieldUnit] = useState<'un' | 'kg'>('un');
  const [formPrepTimeMinutes, setFormPrepTimeMinutes] = useState<string>('90');
  const [formBakingTempCelsius, setFormBakingTempCelsius] = useState<string>('210');
  const [formBakingTimeMinutes, setFormBakingTimeMinutes] = useState<string>('18');
  const [formAdditionalCostPercent, setFormAdditionalCostPercent] = useState<string>('15');
  const [formSuggestedMarginPercent, setFormSuggestedMarginPercent] = useState<string>('180');
  const [formInstructions, setFormInstructions] = useState('');
  const [formIngredients, setFormIngredients] = useState<RecipeIngredient[]>([]);

  // Temporary row for adding an ingredient to the form
  const [selectedIngredientProductId, setSelectedIngredientProductId] = useState('');
  const [ingredientQty, setIngredientQty] = useState('');
  const [ingredientUnit, setIngredientUnit] = useState<'kg' | 'g' | 'l' | 'ml' | 'un' | 'pct'>('kg');

  const canManage = hasPermission(['admin', 'gerente', 'padeiro']);

  // Filtered list
  const filteredFichas = useMemo(() => {
    return fichasTecnicas.filter(f => {
      const matchSearch = f.name.toLowerCase().includes(search.toLowerCase()) || 
                          f.code.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === 'todas' || f.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [fichasTecnicas, search, selectedCategory]);

  // Overall Statistics
  const stats = useMemo(() => {
    const total = fichasTecnicas.length;
    const avgMargin = total > 0 
      ? Math.round(fichasTecnicas.reduce((acc, f) => acc + f.suggestedMarginPercent, 0) / total)
      : 0;

    // Check which recipes have stock shortages for a 1x batch
    let recipesWithShortage = 0;
    fichasTecnicas.forEach(f => {
      const hasShortage = f.ingredients.some(ing => {
        const prod = products.find(p => p.id === ing.ingredientProductId);
        return !prod || prod.stock < ing.quantity;
      });
      if (hasShortage) recipesWithShortage++;
    });

    return { total, avgMargin, recipesWithShortage };
  }, [fichasTecnicas, products]);

  // Helpers to calculate costs dynamically in form
  const computedFormTotals = useMemo(() => {
    const ingredientsCost = formIngredients.reduce((sum, item) => sum + (item.totalCostBrl || 0), 0);
    const addPercent = parseFloat(formAdditionalCostPercent) || 0;
    const additionalCost = Math.round((ingredientsCost * (addPercent / 100)) * 100) / 100;
    const totalRecipeCost = Math.round((ingredientsCost + additionalCost) * 100) / 100;
    const yieldQty = Math.max(1, parseFloat(formYieldQuantity) || 1);
    const costPerUnit = Math.round((totalRecipeCost / yieldQty) * 100) / 100;
    const marginPercent = parseFloat(formSuggestedMarginPercent) || 0;
    const suggestedPrice = Math.round((costPerUnit * (1 + marginPercent / 100)) * 100) / 100;

    return {
      ingredientsCost,
      additionalCost,
      totalRecipeCost,
      costPerUnit,
      suggestedPrice
    };
  }, [formIngredients, formAdditionalCostPercent, formYieldQuantity, formSuggestedMarginPercent]);

  // Open Form for Creating New
  const handleOpenNew = () => {
    const nextNum = fichasTecnicas.length + 1;
    setEditingFichaId(null);
    setFormCode(`FT-${nextNum.toString().padStart(3, '0')}`);
    setFormName('');
    setFormCategory('paes');
    setFormTargetProductId('');
    setFormYieldQuantity('50');
    setFormYieldUnit('un');
    setFormPrepTimeMinutes('60');
    setFormBakingTempCelsius('200');
    setFormBakingTimeMinutes('20');
    setFormAdditionalCostPercent('15');
    setFormSuggestedMarginPercent('160');
    setFormInstructions('');
    setFormIngredients([]);
    setSelectedIngredientProductId('');
    setIngredientQty('');
    setIsFormOpen(true);
  };

  // Open Form for Editing
  const handleOpenEdit = (f: FichaTecnica) => {
    setEditingFichaId(f.id);
    setFormCode(f.code);
    setFormName(f.name);
    setFormCategory(f.category);
    setFormTargetProductId(f.targetProductId || '');
    setFormYieldQuantity(f.yieldQuantity.toString());
    setFormYieldUnit(f.yieldUnit);
    setFormPrepTimeMinutes(f.prepTimeMinutes.toString());
    setFormBakingTempCelsius(f.bakingTempCelsius ? f.bakingTempCelsius.toString() : '');
    setFormBakingTimeMinutes(f.bakingTimeMinutes ? f.bakingTimeMinutes.toString() : '');
    setFormAdditionalCostPercent(f.additionalCostPercent.toString());
    setFormSuggestedMarginPercent(f.suggestedMarginPercent.toString());
    setFormInstructions(f.instructions || '');
    setFormIngredients([...f.ingredients]);
    setSelectedIngredientProductId('');
    setIngredientQty('');
    setIsFormOpen(true);
  };

  // Add ingredient to form ingredients table
  const handleAddIngredientToForm = () => {
    const prod = products.find(p => p.id === selectedIngredientProductId);
    const qty = parseFloat(ingredientQty);
    if (!prod || !qty || qty <= 0) return;

    // Unit cost estimation from product costPriceBrl
    const baseUnitCost = prod.costPriceBrl || prod.priceBrl * 0.5;
    
    // Normalization factor if product unit is kg and recipe unit is g
    let multiplier = 1;
    if (prod.unit === 'kg' && ingredientUnit === 'g') multiplier = 0.001;
    else if (prod.unit === 'l' && ingredientUnit === 'ml') multiplier = 0.001;
    else if (prod.unit === 'g' && ingredientUnit === 'kg') multiplier = 1000;

    const effectiveUnitCost = baseUnitCost * multiplier;
    const totalCost = Math.round(effectiveUnitCost * qty * 100) / 100;

    const newIng: RecipeIngredient = {
      ingredientProductId: prod.id,
      name: prod.name,
      quantity: qty,
      unit: ingredientUnit,
      unitCostBrl: effectiveUnitCost,
      totalCostBrl: totalCost,
    };

    setFormIngredients(prev => [...prev, newIng]);
    setSelectedIngredientProductId('');
    setIngredientQty('');
  };

  const handleRemoveIngredientFromForm = (index: number) => {
    setFormIngredients(prev => prev.filter((_, idx) => idx !== index));
  };

  // Save form (Add or Update)
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) return;

    const yieldQty = parseFloat(formYieldQuantity) || 1;
    const addPercent = parseFloat(formAdditionalCostPercent) || 0;
    const marginPercent = parseFloat(formSuggestedMarginPercent) || 0;

    const fichaData = {
      code: formCode.trim().toUpperCase(),
      name: formName.trim(),
      category: formCategory,
      targetProductId: formTargetProductId || undefined,
      yieldQuantity: yieldQty,
      yieldUnit: formYieldUnit,
      prepTimeMinutes: parseInt(formPrepTimeMinutes) || 0,
      bakingTempCelsius: formBakingTempCelsius ? parseInt(formBakingTempCelsius) : undefined,
      bakingTimeMinutes: formBakingTimeMinutes ? parseInt(formBakingTimeMinutes) : undefined,
      ingredients: formIngredients,
      additionalCostPercent: addPercent,
      totalIngredientsCostBrl: computedFormTotals.ingredientsCost,
      additionalCostBrl: computedFormTotals.additionalCost,
      totalRecipeCostBrl: computedFormTotals.totalRecipeCost,
      costPerUnitBrl: computedFormTotals.costPerUnit,
      suggestedMarginPercent: marginPercent,
      suggestedPriceBrl: computedFormTotals.suggestedPrice,
      instructions: formInstructions.trim() || undefined,
      active: true,
    };

    if (editingFichaId) {
      const existing = fichasTecnicas.find(f => f.id === editingFichaId);
      if (existing) {
        updateFichaTecnica({
          ...existing,
          ...fichaData,
        });
      }
    } else {
      addFichaTecnica(fichaData);
    }

    setIsFormOpen(false);
  };

  // Production trigger
  const handleOpenProduction = (ficha: FichaTecnica) => {
    setProductionTarget(ficha);
    setBatchMultiplier(1);
    setProductionFeedback(null);
  };

  const handleConfirmProduction = () => {
    if (!productionTarget) return;
    const res = executeProductionFromRecipe(productionTarget.id, batchMultiplier);
    setProductionFeedback(res);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-neutral-900 border border-neutral-800">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-100">Fichas Técnicas de Produção</h1>
              <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 text-xs font-semibold">
                Receituário & Engenharia de Custos
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Padronização de receitas, cálculo de markup, custo unitário e baixa automática de insumos no estoque.
            </p>
          </div>
        </div>

        {canManage && (
          <button
            onClick={handleOpenNew}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs transition-colors shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            Nova Ficha Técnica
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Fichas Cadastradas</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-100 font-mono-nums">
            {stats.total}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">Receitas padronizadas ativas</p>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Margem Média Sugerida</span>
            <Percent className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono-nums">
            {stats.avgMargin}%
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">Markup sobre custo de produção</p>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Prontas para Produzir</span>
            <CheckCircle2 className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-sky-400 font-mono-nums">
            {stats.total - stats.recipesWithShortage}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">Com 100% dos insumos no estoque</p>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Insumos Críticos</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 font-mono-nums">
            {stats.recipesWithShortage}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">Receitas com estoque baixo de insumo</p>
        </div>

      </div>

      {/* Search & Category Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-neutral-900/60 border border-neutral-800">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar ficha por código ou receita (ex: Pão Francês, FT-001)..."
            className="w-full pl-9 pr-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'todas', label: 'Todas' },
            { id: 'padaria', label: 'Padaria' },
            { id: 'confeitaria', label: 'Confeitaria' },
            { id: 'cafeteria', label: 'Cafeteria' },
            { id: 'lanches', label: 'Lanches' },
            { id: 'mercearia', label: 'Insumos' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-neutral-950 font-semibold'
                  : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recipes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFichas.map(ficha => {
          // Check stock readiness for this ficha
          const missingInStock = ficha.ingredients.filter(ing => {
            const p = products.find(prod => prod.id === ing.ingredientProductId);
            return !p || p.stock < ing.quantity;
          });
          const isReady = missingInStock.length === 0;

          // Linked target product in inventory
          const linkedProduct = products.find(p => p.id === ficha.targetProductId);

          return (
            <div 
              key={ficha.id}
              className="flex flex-col justify-between p-5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all group"
            >
              <div className="space-y-3.5">
                
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-neutral-800 text-[11px] font-mono font-bold text-amber-400">
                        {ficha.code}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-neutral-800/60 text-[11px] text-neutral-400 capitalize">
                        {ficha.category}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-neutral-100 mt-1.5 group-hover:text-amber-300 transition-colors">
                      {ficha.name}
                    </h3>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium shrink-0 flex items-center gap-1 ${
                    isReady 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {isReady ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    {isReady ? 'Insumos OK' : `${missingInStock.length} em falta`}
                  </span>
                </div>

                {/* Recipe specs row (Rendimento, Forno, Tempo) */}
                <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-lg bg-neutral-950/60 border border-neutral-800/80 text-center">
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Rendimento</span>
                    <span className="text-xs font-bold text-neutral-200 font-mono-nums">
                      {ficha.yieldQuantity} {ficha.yieldUnit}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Preparo</span>
                    <span className="text-xs font-bold text-neutral-200 font-mono-nums">
                      {ficha.prepTimeMinutes} min
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Forno</span>
                    <span className="text-xs font-bold text-neutral-200 font-mono-nums">
                      {ficha.bakingTempCelsius ? `${ficha.bakingTempCelsius}°C` : '-'}
                    </span>
                  </div>
                </div>

                {/* Financial breakdown */}
                <div className="space-y-1.5 pt-1 text-xs">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span>Custo Total da Receita:</span>
                    <span className="font-mono-nums font-semibold text-neutral-200">
                      {formatCurrency(ficha.totalRecipeCostBrl, 'BRL')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-neutral-400">
                    <span>Custo Unitário:</span>
                    <span className="font-mono-nums font-semibold text-amber-400">
                      {formatCurrency(ficha.costPerUnitBrl, 'BRL')} / {ficha.yieldUnit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-neutral-400">
                    <span>Preço Sugerido ({ficha.suggestedMarginPercent}%):</span>
                    <span className="font-mono-nums font-semibold text-emerald-400">
                      {formatCurrency(ficha.suggestedPriceBrl, 'BRL')}
                    </span>
                  </div>
                  {linkedProduct && (
                    <div className="flex items-center justify-between text-[11px] text-sky-400 pt-1 border-t border-neutral-800">
                      <span>No Balcão Atual:</span>
                      <span className="font-mono-nums font-bold">
                        {formatCurrency(linkedProduct.priceBrl, 'BRL')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Ingredients tag preview */}
                <div className="pt-1">
                  <span className="text-[11px] text-neutral-500 block mb-1">
                    {ficha.ingredients.length} Ingredientes / Insumos:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {ficha.ingredients.slice(0, 4).map((ing, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-300">
                        {ing.name} ({ing.quantity} {ing.unit})
                      </span>
                    ))}
                    {ficha.ingredients.length > 4 && (
                      <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-400">
                        +{ficha.ingredients.length - 4} mais
                      </span>
                    )}
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setSelectedFichaForDetails(ficha)}
                  className="px-2.5 py-1.5 rounded-lg border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Detalhes
                </button>

                <div className="flex items-center gap-1.5">
                  {canManage && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(ficha)}
                        className="p-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 transition-colors"
                        title="Editar Ficha Técnica"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Excluir a ficha técnica "${ficha.name}"?`)) {
                            deleteFichaTecnica(ficha.id);
                          }
                        }}
                        className="p-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
                        title="Excluir Ficha Técnica"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenProduction(ficha)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-colors"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Produzir
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {filteredFichas.length === 0 && (
        <div className="text-center py-12 bg-neutral-900/40 border border-dashed border-neutral-800 rounded-2xl">
          <ChefHat className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-neutral-300">Nenhuma ficha técnica encontrada</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            {search ? 'Tente ajustar os termos da busca.' : 'Cadastre sua primeira receita para controlar rendimentos, custos e baixas.'}
          </p>
          {canManage && !search && (
            <button
              onClick={handleOpenNew}
              className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Ficha Técnica
            </button>
          )}
        </div>
      )}

      {/* MODAL: Produzir Lote / Fornada */}
      {productionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Play className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">Ordem de Produção / Fornada</h3>
                  <p className="text-[11px] text-neutral-400">{productionTarget.code} — {productionTarget.name}</p>
                </div>
              </div>
              <button
                onClick={() => setProductionTarget(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              
              {/* Multiplier selector */}
              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-2">
                  Quantas receitas / lotes deseja produzir?
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[0.5, 1, 2, 3].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setBatchMultiplier(m)}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                        batchMultiplier === m
                          ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-sm'
                          : 'bg-neutral-800/80 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                      }`}
                    >
                      {m}x Receita
                    </button>
                  ))}
                </div>
              </div>

              {/* Yield Output */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-center">
                <span className="text-[11px] text-neutral-400 block">Rendimento Estimado da Fornada:</span>
                <span className="text-lg font-black text-amber-400 font-mono-nums">
                  {Math.round(productionTarget.yieldQuantity * batchMultiplier * 100) / 100} {productionTarget.yieldUnit}
                </span>
                <span className="text-[10px] text-neutral-500 block mt-0.5">
                  Custo total estimado dos insumos: {formatCurrency(productionTarget.totalRecipeCostBrl * batchMultiplier, 'BRL')}
                </span>
              </div>

              {/* Insumos que serão consumidos */}
              <div>
                <span className="text-xs font-semibold text-neutral-300 block mb-1.5">
                  Insumos a serem baixados no estoque:
                </span>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 text-xs">
                  {productionTarget.ingredients.map((ing, idx) => {
                    const needed = Math.round(ing.quantity * batchMultiplier * 1000) / 1000;
                    const prod = products.find(p => p.id === ing.ingredientProductId);
                    const available = prod ? prod.stock : 0;
                    const hasEnough = available >= needed;

                    return (
                      <div 
                        key={idx} 
                        className={`flex items-center justify-between p-2 rounded-lg border text-[11px] ${
                          hasEnough 
                            ? 'bg-neutral-950 border-neutral-800 text-neutral-300' 
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-300 font-semibold'
                        }`}
                      >
                        <span>{ing.name}</span>
                        <div className="flex items-center gap-2 font-mono-nums">
                          <span>Necessário: {needed} {ing.unit}</span>
                          <span className={hasEnough ? 'text-emerald-400' : 'text-rose-400'}>
                            (Disponível: {available} {ing.unit})
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Feedback messages */}
              {productionFeedback && (
                <div className={`p-3 rounded-xl border text-xs ${
                  productionFeedback.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  <p className="font-semibold">{productionFeedback.message}</p>
                  {productionFeedback.missingIngredients && (
                    <ul className="mt-1 list-disc list-inside text-[11px] space-y-0.5">
                      {productionFeedback.missingIngredients.map((m, i) => (
                        <li key={i}>
                          {m.name}: precisa de {m.needed} {m.unit}, mas há apenas {m.available} {m.unit}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Action */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setProductionTarget(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-800 text-xs text-neutral-300 hover:bg-neutral-800"
                >
                  {productionFeedback?.success ? 'Fechar' : 'Cancelar'}
                </button>
                {!productionFeedback?.success && (
                  <button
                    type="button"
                    onClick={handleConfirmProduction}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Iniciar Produção & Baixar Estoque
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* MODAL: Detalhes Completos da Ficha Técnica */}
      {selectedFichaForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <ChefHat className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-amber-400 px-1.5 py-0.5 rounded bg-neutral-800">
                      {selectedFichaForDetails.code}
                    </span>
                    <h2 className="text-base font-bold text-neutral-100">{selectedFichaForDetails.name}</h2>
                  </div>
                  <p className="text-xs text-neutral-400 capitalize">Categoria: {selectedFichaForDetails.category}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFichaForDetails(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              
              {/* Technical specs cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-500 block">Rendimento</span>
                  <span className="text-sm font-bold text-neutral-200 font-mono-nums">
                    {selectedFichaForDetails.yieldQuantity} {selectedFichaForDetails.yieldUnit}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-500 block">Preparo/Fermentação</span>
                  <span className="text-sm font-bold text-neutral-200 font-mono-nums">
                    {selectedFichaForDetails.prepTimeMinutes} min
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-500 block">Temperatura Forno</span>
                  <span className="text-sm font-bold text-neutral-200 font-mono-nums">
                    {selectedFichaForDetails.bakingTempCelsius ? `${selectedFichaForDetails.bakingTempCelsius}°C` : '-'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-500 block">Tempo de Forno</span>
                  <span className="text-sm font-bold text-neutral-200 font-mono-nums">
                    {selectedFichaForDetails.bakingTimeMinutes ? `${selectedFichaForDetails.bakingTimeMinutes} min` : '-'}
                  </span>
                </div>
              </div>

              {/* Table of ingredients */}
              <div>
                <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                  Composição de Insumos & Custos Diretos
                </h4>
                <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-400">
                      <tr>
                        <th className="px-3 py-2 font-medium">Ingrediente</th>
                        <th className="px-3 py-2 font-medium text-right">Qtd</th>
                        <th className="px-3 py-2 font-medium text-right">Custo Unit</th>
                        <th className="px-3 py-2 font-medium text-right">Total (BRL)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60 font-mono-nums">
                      {selectedFichaForDetails.ingredients.map((ing, i) => (
                        <tr key={i} className="hover:bg-neutral-900/30">
                          <td className="px-3 py-2 font-sans font-medium text-neutral-200">{ing.name}</td>
                          <td className="px-3 py-2 text-right text-neutral-300">{ing.quantity} {ing.unit}</td>
                          <td className="px-3 py-2 text-right text-neutral-400">{formatCurrency(ing.unitCostBrl, 'BRL')}</td>
                          <td className="px-3 py-2 text-right font-bold text-neutral-200">{formatCurrency(ing.totalCostBrl, 'BRL')}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-neutral-900/80 border-t border-neutral-800 font-semibold text-neutral-200">
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-right">Subtotal Insumos:</td>
                        <td className="px-3 py-2 text-right text-amber-400 font-mono-nums">
                          {formatCurrency(selectedFichaForDetails.totalIngredientsCostBrl, 'BRL')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Costing calculation box */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
                <h4 className="font-bold text-neutral-300 uppercase tracking-wider mb-2">Formação de Preço</h4>
                
                <div className="flex justify-between text-neutral-400">
                  <span>Custos Indiretos (Energia, Gás, Mão de Obra {selectedFichaForDetails.additionalCostPercent}%):</span>
                  <span className="font-mono-nums text-neutral-200">{formatCurrency(selectedFichaForDetails.additionalCostBrl, 'BRL')}</span>
                </div>
                <div className="flex justify-between text-neutral-300 font-semibold pt-1 border-t border-neutral-800">
                  <span>Custo Total de Produção da Receita:</span>
                  <span className="font-mono-nums text-amber-400">{formatCurrency(selectedFichaForDetails.totalRecipeCostBrl, 'BRL')}</span>
                </div>
                <div className="flex justify-between text-neutral-300 font-semibold">
                  <span>Custo Unitário Final:</span>
                  <span className="font-mono-nums text-amber-400">
                    {formatCurrency(selectedFichaForDetails.costPerUnitBrl, 'BRL')} por {selectedFichaForDetails.yieldUnit}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold pt-2 border-t border-neutral-800 text-sm">
                  <span>Preço Sugerido ({selectedFichaForDetails.suggestedMarginPercent}% Markup):</span>
                  <span className="font-mono-nums">{formatCurrency(selectedFichaForDetails.suggestedPriceBrl, 'BRL')}</span>
                </div>
              </div>

              {/* Instructions */}
              {selectedFichaForDetails.instructions && (
                <div>
                  <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Modo de Preparo & Procedimentos
                  </h4>
                  <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 whitespace-pre-line leading-relaxed">
                    {selectedFichaForDetails.instructions}
                  </div>
                </div>
              )}

            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-950/60">
              <span className="text-[11px] text-neutral-500">
                Última atualização: {new Date(selectedFichaForDetails.lastUpdated).toLocaleDateString('pt-BR')}
              </span>
              <button
                type="button"
                onClick={() => setSelectedFichaForDetails(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: Formulário de Nova / Editar Ficha Técnica */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <ChefHat className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">
                    {editingFichaId ? 'Editar Ficha Técnica' : 'Cadastrar Nova Ficha Técnica'}
                  </h3>
                  <p className="text-[11px] text-neutral-400">Defina os insumos, rendimento e parâmetros de custo</p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form scroll area */}
            <form onSubmit={handleSaveForm} className="p-6 space-y-5 overflow-y-auto flex-1">
              
              {/* Row 1: Code, Name, Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-neutral-400 block mb-1">Código FT *</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500 uppercase font-mono font-bold"
                    placeholder="FT-001"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-neutral-400 block mb-1">Nome da Receita / Produto *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                    placeholder="ex: Pão Francês Tradicional Crocante"
                  />
                </div>
              </div>

              {/* Row 2: Category & Target Product link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-neutral-400 block mb-1">Categoria</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ProductCategory)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="padaria">Padaria</option>
                    <option value="confeitaria">Confeitaria</option>
                    <option value="cafeteria">Cafeteria</option>
                    <option value="lanches">Lanches</option>
                    <option value="mercearia">Mercearia / Insumo</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-400 block mb-1">
                    Vincular a Produto do Estoque (opcional)
                  </label>
                  <select
                    value={formTargetProductId}
                    onChange={(e) => setFormTargetProductId(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Nenhum (produto novo ou interno)</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.unit}) — Atual: {formatCurrency(p.priceBrl, 'BRL')}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Ao produzir a fornada, o estoque deste item aumentará</p>
                </div>
              </div>

              {/* Row 3: Yield, Time, Temp */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <div>
                  <label className="text-xs font-medium text-neutral-400 block mb-1">Rendimento *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={formYieldQuantity}
                    onChange={(e) => setFormYieldQuantity(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-neutral-200 font-mono-nums"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-400 block mb-1">Unidade Rend.</label>
                  <select
                    value={formYieldUnit}
                    onChange={(e) => setFormYieldUnit(e.target.value as 'un' | 'kg')}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-xs text-neutral-200"
                  >
                    <option value="un">Unidade (un)</option>
                    <option value="kg">Quilo (kg)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-400 block mb-1">Preparo (min)</label>
                  <input
                    type="number"
                    value={formPrepTimeMinutes}
                    onChange={(e) => setFormPrepTimeMinutes(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-neutral-200 font-mono-nums"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-400 block mb-1">Forno (°C)</label>
                  <input
                    type="number"
                    value={formBakingTempCelsius}
                    onChange={(e) => setFormBakingTempCelsius(e.target.value)}
                    placeholder="210"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-neutral-200 font-mono-nums"
                  />
                </div>
              </div>

              {/* Row 4: Ingredients List & Add Tool */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                    Insumos & Ingredientes da Receita ({formIngredients.length})
                  </label>
                  <span className="text-[11px] text-neutral-400 font-mono-nums">
                    Custo Insumos: {formatCurrency(computedFormTotals.ingredientsCost, 'BRL')}
                  </span>
                </div>

                {/* Add ingredient row */}
                <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="flex-1 min-w-[200px]">
                    <select
                      value={selectedIngredientProductId}
                      onChange={(e) => setSelectedIngredientProductId(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="">Selecione um insumo do estoque...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.unit}) — Custo: {formatCurrency(p.costPriceBrl || p.priceBrl * 0.5, 'BRL')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      step="0.001"
                      placeholder="Qtd..."
                      value={ingredientQty}
                      onChange={(e) => setIngredientQty(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 font-mono-nums"
                    />
                  </div>
                  <div className="w-24">
                    <select
                      value={ingredientUnit}
                      onChange={(e) => setIngredientUnit(e.target.value as any)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs text-neutral-200"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="l">litro</option>
                      <option value="ml">ml</option>
                      <option value="un">un</option>
                      <option value="pct">pct</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddIngredientToForm}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar
                  </button>
                </div>

                {/* Ingredients table */}
                {formIngredients.length > 0 ? (
                  <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-400">
                        <tr>
                          <th className="px-3 py-2 font-medium">Insumo</th>
                          <th className="px-3 py-2 font-medium text-right">Qtd</th>
                          <th className="px-3 py-2 font-medium text-right">Custo Total</th>
                          <th className="px-3 py-2 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/60 font-mono-nums">
                        {formIngredients.map((item, idx) => (
                          <tr key={idx} className="hover:bg-neutral-900/30">
                            <td className="px-3 py-2 font-sans font-medium text-neutral-200">{item.name}</td>
                            <td className="px-3 py-2 text-right text-neutral-300">{item.quantity} {item.unit}</td>
                            <td className="px-3 py-2 text-right text-amber-400 font-bold">{formatCurrency(item.totalCostBrl, 'BRL')}</td>
                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveIngredientFromForm(idx)}
                                className="text-neutral-500 hover:text-rose-400 p-1"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500 italic p-2 text-center">Nenhum ingrediente adicionado ainda.</p>
                )}
              </div>

              {/* Row 5: Markup & Financial Calculations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                <div>
                  <label className="text-xs font-medium text-neutral-400 block mb-1">
                    Custos Adicionais / Overhead (%)
                  </label>
                  <input
                    type="number"
                    value={formAdditionalCostPercent}
                    onChange={(e) => setFormAdditionalCostPercent(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 font-mono-nums"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">Gás, eletricidade, embalagem e mão de obra (ex: 15%)</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-400 block mb-1">
                    Margem Desejada / Markup (%)
                  </label>
                  <input
                    type="number"
                    value={formSuggestedMarginPercent}
                    onChange={(e) => setFormSuggestedMarginPercent(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 font-mono-nums"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">Margem de lucro sobre o custo unitário (ex: 180%)</p>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-neutral-800/80 grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-neutral-900">
                    <span className="text-[10px] text-neutral-500 block">Custo Total Receita</span>
                    <span className="text-xs font-bold text-neutral-200 font-mono-nums">
                      {formatCurrency(computedFormTotals.totalRecipeCost, 'BRL')}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-neutral-900">
                    <span className="text-[10px] text-neutral-500 block">Custo por {formYieldUnit}</span>
                    <span className="text-xs font-bold text-amber-400 font-mono-nums">
                      {formatCurrency(computedFormTotals.costPerUnit, 'BRL')}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-neutral-900">
                    <span className="text-[10px] text-neutral-500 block">Preço Sugerido</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono-nums">
                      {formatCurrency(computedFormTotals.suggestedPrice, 'BRL')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="text-xs font-medium text-neutral-400 block mb-1">
                  Modo de Preparo / Orientações do Mestre Padeiro
                </label>
                <textarea
                  rows={3}
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  placeholder="Descreva a hidratação, tempo de batedeira, ponto de véu, tempo de fermentação e vaporização do forno..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-800 text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-lg shadow-amber-500/20"
                >
                  {editingFichaId ? 'Salvar Alterações' : 'Criar Ficha Técnica'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
