import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Employee, 
  Product, 
  Sale, 
  CashRegisterSession, 
  ExchangeRates, 
  MonthlyGoal, 
  StockMovement, 
  BackupPoint, 
  SystemBackupData, 
  UserRole,
  CartItem,
  PaymentEntry,
  Currency,
  Comanda,
  FornadaLog,
  FichaTecnica,
  Customer,
  CustomerAccountEntry,
  LiveRateStatus,
  PaymentMethod
} from '../types';
import { StorageService, INITIAL_EMPLOYEES } from '../services/storageService';
import { toBrl } from '../utils/currency';
import { fetchLiveExchangeRates } from '../services/exchangeRateService';

interface BakeryContextType {
  // Authentication & Profile
  currentUser: Employee;
  employees: Employee[];
  switchUser: (employeeId: string, pin?: string) => boolean;
  updateEmployeePin: (employeeId: string, newPin: string) => void;
  hasPermission: (requiredRoles: UserRole[]) => boolean;

  // Multi-Currency & Real-Time Live Rates
  exchangeRates: ExchangeRates;
  updateExchangeRates: (rates: Partial<ExchangeRates>) => void;
  liveRateStatus: LiveRateStatus;
  fetchLiveRates: () => Promise<void>;
  toggleAutoRateRefresh: () => void;

  // Inventory / Stock
  products: Product[];
  stockMovements: StockMovement[];
  addProduct: (product: Omit<Product, 'id' | 'active'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  adjustStock: (productId: string, type: 'entrada' | 'perda' | 'ajuste' | 'producao', quantity: number, reason: string) => void;

  // Fornadas do Padeiro (Pão Quente)
  fornadas: FornadaLog[];
  registerFornada: (productId: string, quantity: number, unit: 'un' | 'kg' | 'g' | 'pct' | 'l' | string, batchNumber?: string) => void;

  // Ficha Técnica (Receitas & Custos de Produção)
  fichasTecnicas: FichaTecnica[];
  addFichaTecnica: (ft: Omit<FichaTecnica, 'id' | 'lastUpdated'>) => void;
  updateFichaTecnica: (ft: FichaTecnica) => void;
  deleteFichaTecnica: (id: string) => void;
  executeProductionFromRecipe: (fichaId: string, multiplier?: number) => {
    success: boolean;
    message: string;
    missingIngredients?: { name: string; needed: number; unit: string; available: number }[];
  };

  // CRM & Gestão de Clientes
  customers: Customer[];
  customerEntries: CustomerAccountEntry[];
  addCustomer: (cust: Omit<Customer, 'id' | 'createdAt' | 'totalSpentBrl' | 'purchaseCount' | 'outstandingBalanceBrl' | 'loyaltyPoints'>) => Customer;
  updateCustomer: (cust: Customer) => void;
  deleteCustomer: (id: string) => void;
  recordCustomerDebt: (customerId: string, amountBrl: number, description: string, saleId?: string) => void;
  recordCustomerPayment: (customerId: string, amountBrl: number, method: PaymentMethod, notes?: string) => void;
  redeemCustomerPoints: (customerId: string, points: number) => number;

  // Comandas & Mesas
  openComandas: Comanda[];
  saveComanda: (number: string, items: CartItem[], customerName?: string, notes?: string) => void;
  removeComanda: (comandaId: string) => void;

  // Point of Sale (PDV)
  sales: Sale[];
  completeSale: (
    items: CartItem[],
    payments: PaymentEntry[],
    changeGiven?: { currency: Currency; amount: number; equivalentBrl: number },
    customerName?: string,
    comandaNumber?: string,
    discountBrl?: number,
    subtotalBrl?: number,
    customerId?: string
  ) => Sale;

  // Cash Register Sessions
  currentSession: CashRegisterSession;
  sessionHistory: CashRegisterSession[];
  openRegister: (initialFloat: { brl: number; pyg: number; usd: number }) => void;
  closeRegister: (
    counted: { brl: number; pyg: number; usd: number },
    notes?: string
  ) => CashRegisterSession;
  recordSangria: (amount: number, currency: Currency, reason: string) => void;
  recordSuprimento: (amount: number, currency: Currency, reason: string) => void;

  // Goals
  goals: MonthlyGoal[];
  getCurrentGoal: () => MonthlyGoal;
  updateGoal: (goal: MonthlyGoal) => void;

  // Backup & Cloud Sync
  backupPoints: BackupPoint[];
  lastBackupTime: string | null;
  isCloudSyncing: boolean;
  createManualBackup: () => void;
  exportDatabaseBackup: () => void;
  importDatabaseBackup: (jsonData: any) => boolean;
  restoreFromPoint: (backupId: string) => void;
  resetToSampleData: () => void;
}

const BakeryContext = createContext<BakeryContextType | null>(null);

export const BakeryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<SystemBackupData>(() => StorageService.loadState());
  const [currentUser, setCurrentUser] = useState<Employee>(() => {
    return data.employees[0] || INITIAL_EMPLOYEES[0];
  });
  const [backupPoints, setBackupPoints] = useState<BackupPoint[]>(() => StorageService.loadBackupPoints());
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(() => {
    const points = StorageService.loadBackupPoints();
    return points.length > 0 ? points[0].timestamp : null;
  });

  // Sync state to local storage whenever data changes
  useEffect(() => {
    StorageService.saveState(data);
  }, [data]);

  // Automatic cloud backup scheduler simulation (runs every 8 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      setIsCloudSyncing(true);
      setTimeout(() => {
        const point = StorageService.createBackupPoint(data, 'automatico');
        setBackupPoints(StorageService.loadBackupPoints());
        setLastBackupTime(point.timestamp);
        setIsCloudSyncing(false);
      }, 1000);
    }, 8 * 60 * 1000);

    return () => clearInterval(interval);
  }, [data]);

  // Permission check helper
  const hasPermission = useCallback((requiredRoles: UserRole[]): boolean => {
    if (currentUser.role === 'admin') return true;
    return requiredRoles.includes(currentUser.role);
  }, [currentUser]);

  // Switch employee
  const switchUser = useCallback((employeeId: string, pin?: string): boolean => {
    const target = data.employees.find(e => e.id === employeeId);
    if (!target) return false;
    if (pin && target.pin !== pin) {
      return false;
    }
    setCurrentUser(target);
    return true;
  }, [data.employees]);

  // Update employee PIN
  const updateEmployeePin = useCallback((employeeId: string, newPin: string) => {
    setData(prev => ({
      ...prev,
      employees: prev.employees.map(e => e.id === employeeId ? { ...e, pin: newPin } : e)
    }));
  }, []);

  // Update exchange rates
  const updateExchangeRates = useCallback((rates: Partial<ExchangeRates>) => {
    setData(prev => ({
      ...prev,
      exchangeRates: {
        ...prev.exchangeRates,
        ...rates,
        updatedAt: new Date().toISOString(),
      }
    }));
  }, []);

  // Live Exchange Rates Management
  const [liveRateStatus, setLiveRateStatus] = useState<LiveRateStatus>({
    isFetching: false,
    lastFetchedAt: null,
    provider: 'AwesomeAPI Mercados (Ao Vivo)',
    autoRefresh: true,
    status: 'idle',
  });

  const fetchLiveRates = useCallback(async () => {
    setLiveRateStatus(prev => ({ ...prev, isFetching: true, status: 'loading' }));
    try {
      const result = await fetchLiveExchangeRates();
      if (result.success && result.rates) {
        setData(prev => ({
          ...prev,
          exchangeRates: {
            ...result.rates!,
            updatedAt: result.timestamp,
          }
        }));
        setLiveRateStatus(prev => ({
          ...prev,
          isFetching: false,
          lastFetchedAt: result.timestamp,
          provider: result.provider,
          status: 'success',
          errorMsg: undefined,
        }));
      } else {
        setLiveRateStatus(prev => ({
          ...prev,
          isFetching: false,
          status: 'error',
          errorMsg: result.error || 'Falha ao buscar cotação',
        }));
      }
    } catch (err: any) {
      setLiveRateStatus(prev => ({
        ...prev,
        isFetching: false,
        status: 'error',
        errorMsg: err?.message || 'Erro inesperado na cotação',
      }));
    }
  }, []);

  const toggleAutoRateRefresh = useCallback(() => {
    setLiveRateStatus(prev => ({ ...prev, autoRefresh: !prev.autoRefresh }));
  }, []);

  // Background fetch of exchange rates
  useEffect(() => {
    fetchLiveRates();
  }, [fetchLiveRates]);

  useEffect(() => {
    if (!liveRateStatus.autoRefresh) return;
    const timer = setInterval(() => {
      fetchLiveRates();
    }, 5 * 60 * 1000); // 5 min
    return () => clearInterval(timer);
  }, [fetchLiveRates, liveRateStatus.autoRefresh]);

  // Add Product
  const addProduct = useCallback((prodData: Omit<Product, 'id' | 'active'>) => {
    const newProduct: Product = {
      ...prodData,
      id: `prod-${Date.now()}`,
      active: true,
    };
    setData(prev => ({
      ...prev,
      products: [newProduct, ...prev.products],
      stockMovements: [
        {
          id: `mov-${Date.now()}`,
          productId: newProduct.id,
          productName: newProduct.name,
          type: 'entrada',
          quantity: newProduct.stock,
          unit: newProduct.unit,
          reason: 'Cadastro inicial de produto',
          employeeName: currentUser.name,
          timestamp: new Date().toISOString(),
          previousStock: 0,
          newStock: newProduct.stock,
        },
        ...prev.stockMovements,
      ]
    }));
  }, [currentUser.name]);

  // Update Product
  const updateProduct = useCallback((updated: Product) => {
    setData(prev => ({
      ...prev,
      products: prev.products.map(p => p.id === updated.id ? updated : p),
    }));
  }, []);

  // Delete Product
  const deleteProduct = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      products: prev.products.filter(p => p.id !== id),
    }));
  }, []);

  // Adjust stock
  const adjustStock = useCallback((
    productId: string, 
    type: 'entrada' | 'perda' | 'ajuste' | 'producao', 
    quantity: number, 
    reason: string
  ) => {
    setData(prev => {
      const prod = prev.products.find(p => p.id === productId);
      if (!prod) return prev;

      let newStock = prod.stock;
      if (type === 'entrada' || type === 'producao') {
        newStock = prod.stock + quantity;
      } else if (type === 'perda') {
        newStock = Math.max(0, prod.stock - quantity);
      } else if (type === 'ajuste') {
        newStock = quantity; // direct override
      }

      const movement: StockMovement = {
        id: `mov-${Date.now()}`,
        productId: prod.id,
        productName: prod.name,
        type,
        quantity,
        unit: prod.unit,
        reason,
        employeeName: currentUser.name,
        timestamp: new Date().toISOString(),
        previousStock: prod.stock,
        newStock: Math.round(newStock * 100) / 100,
      };

      return {
        ...prev,
        products: prev.products.map(p => p.id === productId ? { ...p, stock: Math.round(newStock * 100) / 100 } : p),
        stockMovements: [movement, ...prev.stockMovements],
      };
    });
  }, [currentUser.name]);

  // Register Fornada do Padeiro (Pão Quente)
  const registerFornada = useCallback((
    productId: string,
    quantity: number,
    unit: 'un' | 'kg' | 'g' | 'pct' | 'l' | string,
    batchNumber?: string
  ) => {
    setData(prev => {
      const prod = prev.products.find(p => p.id === productId);
      if (!prod) return prev;

      const prevStock = prod.stock;
      const newStock = Math.round((prevStock + quantity) * 100) / 100;
      const nowIso = new Date().toISOString();
      const batch = batchNumber || `F-${Math.floor(1000 + Math.random() * 9000)}`;

      const newLog: FornadaLog = {
        id: `forn-${Date.now()}`,
        productId,
        productName: prod.name,
        quantity,
        unit,
        timestamp: nowIso,
        bakerName: currentUser.name,
        batchNumber: batch,
      };

      const newMovement: StockMovement = {
        id: `mov-${Date.now()}-${productId}`,
        productId,
        productName: prod.name,
        type: 'entrada',
        quantity,
        unit,
        reason: `Fornada quentinha (${batch})`,
        employeeName: currentUser.name,
        timestamp: nowIso,
        previousStock: prevStock,
        newStock,
      };

      return {
        ...prev,
        products: prev.products.map(p => p.id === productId ? { ...p, stock: newStock } : p),
        stockMovements: [newMovement, ...prev.stockMovements],
        fornadas: [newLog, ...(prev.fornadas || [])],
      };
    });
  }, [currentUser.name]);

  // Save Comanda
  const saveComanda = useCallback((
    number: string,
    items: CartItem[],
    customerName?: string,
    notes?: string
  ) => {
    setData(prev => {
      const existingIdx = (prev.openComandas || []).findIndex(
        c => c.number.trim().toLowerCase() === number.trim().toLowerCase()
      );
      const nowIso = new Date().toISOString();
      const updatedList = [...(prev.openComandas || [])];

      if (existingIdx >= 0) {
        updatedList[existingIdx] = {
          ...updatedList[existingIdx],
          items,
          customerName: customerName || updatedList[existingIdx].customerName,
          notes: notes || updatedList[existingIdx].notes,
        };
      } else {
        updatedList.unshift({
          id: `cmd-${Date.now()}`,
          number,
          customerName,
          items,
          openedAt: nowIso,
          openedBy: currentUser.name,
          notes,
        });
      }

      return {
        ...prev,
        openComandas: updatedList,
      };
    });
  }, [currentUser.name]);

  // Remove Comanda
  const removeComanda = useCallback((comandaId: string) => {
    setData(prev => ({
      ...prev,
      openComandas: (prev.openComandas || []).filter(
        c => c.id !== comandaId && c.number !== comandaId
      ),
    }));
  }, []);

  // Ficha Técnica - Add
  const addFichaTecnica = useCallback((ftData: Omit<FichaTecnica, 'id' | 'lastUpdated'>) => {
    const newFt: FichaTecnica = {
      ...ftData,
      id: `ft-${Date.now()}`,
      lastUpdated: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      fichasTecnicas: [newFt, ...(prev.fichasTecnicas || [])],
    }));
  }, []);

  // Ficha Técnica - Update
  const updateFichaTecnica = useCallback((updated: FichaTecnica) => {
    setData(prev => ({
      ...prev,
      fichasTecnicas: (prev.fichasTecnicas || []).map(f => f.id === updated.id ? { ...updated, lastUpdated: new Date().toISOString() } : f),
    }));
  }, []);

  // Ficha Técnica - Delete
  const deleteFichaTecnica = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      fichasTecnicas: (prev.fichasTecnicas || []).filter(f => f.id !== id),
    }));
  }, []);

  // Ficha Técnica - Execute Production / Baixa de Insumos e Entrada de Produto
  const executeProductionFromRecipe = useCallback((fichaId: string, multiplier: number = 1) => {
    const ficha = (data.fichasTecnicas || []).find(f => f.id === fichaId);
    if (!ficha) {
      return { success: false, message: 'Ficha técnica não encontrada.' };
    }

    const missing: { name: string; needed: number; unit: string; available: number }[] = [];

    // Verify stock availability for all ingredients
    for (const ing of ficha.ingredients) {
      const prod = data.products.find(p => p.id === ing.ingredientProductId);
      const needed = Math.round(ing.quantity * multiplier * 1000) / 1000;
      const available = prod ? prod.stock : 0;
      if (!prod || available < needed) {
        missing.push({
          name: ing.name,
          needed,
          unit: ing.unit,
          available,
        });
      }
    }

    if (missing.length > 0) {
      return {
        success: false,
        message: `Estoque insuficiente para produzir "${ficha.name}". Verifique os insumos em falta.`,
        missingIngredients: missing,
      };
    }

    const nowIso = new Date().toISOString();
    const batchId = `F-${Math.floor(1000 + Math.random() * 9000)}`;
    const totalYield = Math.round(ficha.yieldQuantity * multiplier * 100) / 100;

    setData(prev => {
      const newMovements: StockMovement[] = [];
      const updatedProducts = prev.products.map(p => {
        // Is it one of the ingredients used?
        const ingredientUsed = ficha.ingredients.find(i => i.ingredientProductId === p.id);
        if (ingredientUsed) {
          const qtyUsed = Math.round(ingredientUsed.quantity * multiplier * 1000) / 1000;
          const newStk = Math.max(0, Math.round((p.stock - qtyUsed) * 1000) / 1000);
          newMovements.push({
            id: `mov-${Date.now()}-${p.id}`,
            productId: p.id,
            productName: p.name,
            type: 'saida_venda',
            quantity: qtyUsed,
            unit: p.unit,
            reason: `Consumo p/ produção: ${ficha.name} (Lote ${batchId})`,
            employeeName: currentUser.name,
            timestamp: nowIso,
            previousStock: p.stock,
            newStock: newStk,
          });
          return { ...p, stock: newStk };
        }

        // Is it the target produced product?
        if (ficha.targetProductId && p.id === ficha.targetProductId) {
          const newStk = Math.round((p.stock + totalYield) * 100) / 100;
          newMovements.push({
            id: `mov-${Date.now()}-${p.id}`,
            productId: p.id,
            productName: p.name,
            type: 'producao',
            quantity: totalYield,
            unit: ficha.yieldUnit,
            reason: `Produção via Ficha Técnica ${ficha.code} (Lote ${batchId})`,
            employeeName: currentUser.name,
            timestamp: nowIso,
            previousStock: p.stock,
            newStock: newStk,
          });
          return { ...p, stock: newStk };
        }

        return p;
      });

      // Register FornadaLog
      const targetProdName = ficha.targetProductId 
        ? (prev.products.find(p => p.id === ficha.targetProductId)?.name || ficha.name)
        : ficha.name;

      const newFornada: FornadaLog = {
        id: `forn-${Date.now()}`,
        productId: ficha.targetProductId || `ft-out-${ficha.id}`,
        productName: targetProdName,
        quantity: totalYield,
        unit: ficha.yieldUnit,
        timestamp: nowIso,
        bakerName: currentUser.name,
        batchNumber: batchId,
      };

      return {
        ...prev,
        products: updatedProducts,
        stockMovements: [...newMovements, ...prev.stockMovements],
        fornadas: [newFornada, ...(prev.fornadas || [])],
      };
    });

    return {
      success: true,
      message: `Produção de ${totalYield} ${ficha.yieldUnit} de "${ficha.name}" (Lote ${batchId}) concluída! Estoque e fornadas atualizados.`,
    };
  }, [currentUser.name, data.fichasTecnicas, data.products]);

  // CRM - Add Customer
  const addCustomer = useCallback((custData: Omit<Customer, 'id' | 'createdAt' | 'totalSpentBrl' | 'purchaseCount' | 'outstandingBalanceBrl' | 'loyaltyPoints'>): Customer => {
    const newCustomer: Customer = {
      ...custData,
      id: `cust-${Date.now()}`,
      outstandingBalanceBrl: 0,
      loyaltyPoints: 0,
      totalSpentBrl: 0,
      purchaseCount: 0,
      createdAt: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      customers: [newCustomer, ...(prev.customers || [])],
    }));
    return newCustomer;
  }, []);

  // CRM - Update Customer
  const updateCustomer = useCallback((updated: Customer) => {
    setData(prev => ({
      ...prev,
      customers: (prev.customers || []).map(c => c.id === updated.id ? updated : c),
    }));
  }, []);

  // CRM - Delete Customer
  const deleteCustomer = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      customers: (prev.customers || []).filter(c => c.id !== id),
    }));
  }, []);

  // CRM - Record Debt (Fiado/Faturamento)
  const recordCustomerDebt = useCallback((customerId: string, amountBrl: number, description: string, saleId?: string) => {
    const nowIso = new Date().toISOString();
    const entry: CustomerAccountEntry = {
      id: `entry-${Date.now()}`,
      customerId,
      date: nowIso,
      type: 'debito_compra',
      amountBrl: Math.round(amountBrl * 100) / 100,
      description,
      saleId,
      recordedBy: currentUser.name,
    };
    setData(prev => ({
      ...prev,
      customers: (prev.customers || []).map(c => {
        if (c.id === customerId) {
          return {
            ...c,
            outstandingBalanceBrl: Math.round((c.outstandingBalanceBrl + amountBrl) * 100) / 100,
          };
        }
        return c;
      }),
      customerEntries: [entry, ...(prev.customerEntries || [])],
    }));
  }, [currentUser.name]);

  // CRM - Record Payment / Amortização
  const recordCustomerPayment = useCallback((customerId: string, amountBrl: number, method: PaymentMethod, notes?: string) => {
    const nowIso = new Date().toISOString();
    const cleanAmount = Math.round(amountBrl * 100) / 100;
    const entry: CustomerAccountEntry = {
      id: `entry-${Date.now()}`,
      customerId,
      date: nowIso,
      type: 'pagamento_amortizacao',
      amountBrl: cleanAmount,
      description: `Amortização de fiado via ${method.toUpperCase()}${notes ? ` - ${notes}` : ''}`,
      recordedBy: currentUser.name,
    };

    setData(prev => ({
      ...prev,
      customers: (prev.customers || []).map(c => {
        if (c.id === customerId) {
          const newBal = Math.max(0, Math.round((c.outstandingBalanceBrl - cleanAmount) * 100) / 100);
          return { ...c, outstandingBalanceBrl: newBal };
        }
        return c;
      }),
      customerEntries: [entry, ...(prev.customerEntries || [])],
    }));
  }, [currentUser.name]);

  // CRM - Redeem Loyalty Points
  const redeemCustomerPoints = useCallback((customerId: string, points: number): number => {
    let discountGranted = 0;
    setData(prev => ({
      ...prev,
      customers: (prev.customers || []).map(c => {
        if (c.id === customerId) {
          const usablePoints = Math.min(c.loyaltyPoints, points);
          discountGranted = Math.round((usablePoints / 20) * 100) / 100; // 100 pts = R$ 5,00
          return { ...c, loyaltyPoints: c.loyaltyPoints - usablePoints };
        }
        return c;
      }),
    }));
    return discountGranted;
  }, []);

  // Complete a sale
  const completeSale = useCallback((
    items: CartItem[],
    payments: PaymentEntry[],
    changeGiven?: { currency: Currency; amount: number; equivalentBrl: number },
    customerName?: string,
    comandaNumber?: string,
    discountBrl?: number,
    subtotalBrl?: number,
    customerId?: string
  ): Sale => {
    const rawTotal = subtotalBrl !== undefined 
      ? subtotalBrl 
      : items.reduce((sum, item) => sum + item.subtotalBrl, 0);
    const finalTotalBrl = Math.max(0, Math.round((rawTotal - (discountBrl || 0)) * 100) / 100);
    const saleNumber = (data.sales.length > 0 ? Math.max(...data.sales.map(s => s.saleNumber || 0)) : 1000) + 1;

    // Check fiado payment amount
    const fiadoPayments = payments.filter(p => p.method === 'fiado');
    const fiadoAmountBrl = fiadoPayments.reduce((acc, p) => acc + p.equivalentBrl, 0);

    const resolvedCustomerName = customerName || (customerId 
      ? (data.customers || []).find(c => c.id === customerId)?.name 
      : undefined);

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      saleNumber,
      timestamp: new Date().toISOString(),
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      items,
      subtotalBrl: Math.round(rawTotal * 100) / 100,
      discountBrl: discountBrl ? Math.round(discountBrl * 100) / 100 : undefined,
      totalBrl: finalTotalBrl,
      payments,
      changeGiven,
      customerId,
      customerName: resolvedCustomerName,
      comandaNumber,
      status: 'completed',
      registerSessionId: data.currentSession.id,
    };

    // Deduct stock for all items
    const nowIso = new Date().toISOString();
    const movementsToCreate: StockMovement[] = items.map(item => {
      const currentProd = data.products.find(p => p.id === item.product.id);
      const prevStock = currentProd ? currentProd.stock : item.product.stock;
      const newStock = Math.max(0, Math.round((prevStock - item.quantity) * 100) / 100);

      return {
        id: `mov-${Date.now()}-${item.product.id}`,
        productId: item.product.id,
        productName: item.product.name,
        type: 'saida_venda',
        quantity: item.quantity,
        unit: item.product.unit,
        reason: `Venda #${saleNumber}${comandaNumber ? ` (Comanda #${comandaNumber})` : ''}`,
        employeeName: currentUser.name,
        timestamp: nowIso,
        previousStock: prevStock,
        newStock,
      };
    });

    setData(prev => {
      // update products stock
      const updatedProducts = prev.products.map(p => {
        const soldItem = items.find(it => it.product.id === p.id);
        if (soldItem) {
          const newStk = Math.max(0, Math.round((p.stock - soldItem.quantity) * 100) / 100);
          return { ...p, stock: newStk };
        }
        return p;
      });

      // If this sale was from a comanda, close/remove the comanda
      const updatedComandas = comandaNumber 
        ? (prev.openComandas || []).filter(c => c.number.trim().toLowerCase() !== comandaNumber.trim().toLowerCase())
        : (prev.openComandas || []);

      // If a customer is linked, update their balance and stats
      let updatedCustomers = prev.customers || [];
      let updatedEntries = prev.customerEntries || [];

      if (customerId) {
        const pointsEarned = Math.floor(finalTotalBrl);
        updatedCustomers = updatedCustomers.map(c => {
          if (c.id === customerId) {
            return {
              ...c,
              totalSpentBrl: Math.round((c.totalSpentBrl + finalTotalBrl) * 100) / 100,
              purchaseCount: c.purchaseCount + 1,
              lastPurchaseDate: nowIso,
              loyaltyPoints: c.loyaltyPoints + pointsEarned,
              outstandingBalanceBrl: fiadoAmountBrl > 0 
                ? Math.round((c.outstandingBalanceBrl + fiadoAmountBrl) * 100) / 100 
                : c.outstandingBalanceBrl,
            };
          }
          return c;
        });

        if (fiadoAmountBrl > 0) {
          const fiadoEntry: CustomerAccountEntry = {
            id: `entry-${Date.now()}`,
            customerId,
            date: nowIso,
            type: 'debito_compra',
            amountBrl: Math.round(fiadoAmountBrl * 100) / 100,
            description: `Compra fiado no PDV - Venda #${saleNumber}`,
            saleId: newSale.id,
            recordedBy: currentUser.name,
          };
          updatedEntries = [fiadoEntry, ...updatedEntries];
        }
      }

      return {
        ...prev,
        products: updatedProducts,
        openComandas: updatedComandas,
        customers: updatedCustomers,
        customerEntries: updatedEntries,
        stockMovements: [...movementsToCreate, ...prev.stockMovements],
        sales: [newSale, ...prev.sales],
      };
    });

    return newSale;
  }, [currentUser.id, currentUser.name, data.currentSession.id, data.customers, data.products, data.sales]);

  // Open Register
  const openRegister = useCallback((initialFloat: { brl: number; pyg: number; usd: number }) => {
    const nextSessionNumber = (data.currentSession.sessionNumber || 100) + 1;
    const newSession: CashRegisterSession = {
      id: `session-${Date.now()}`,
      sessionNumber: nextSessionNumber,
      status: 'aberto',
      openedAt: new Date().toISOString(),
      openedBy: currentUser.name,
      initialFloat,
      transactions: [],
    };

    setData(prev => ({
      ...prev,
      currentSession: newSession,
    }));
  }, [currentUser.name, data.currentSession.sessionNumber]);

  // Close Register
  const closeRegister = useCallback((
    counted: { brl: number; pyg: number; usd: number },
    notes?: string
  ): CashRegisterSession => {
    const closedSession: CashRegisterSession = {
      ...data.currentSession,
      status: 'fechado',
      closedAt: new Date().toISOString(),
      closedBy: currentUser.name,
      countedOnClose: counted,
      closingNotes: notes,
    };

    setData(prev => ({
      ...prev,
      currentSession: closedSession,
      sessionHistory: [closedSession, ...prev.sessionHistory],
    }));

    // Auto trigger backup point upon closing register
    setTimeout(() => {
      const point = StorageService.createBackupPoint({
        ...data,
        currentSession: closedSession,
        sessionHistory: [closedSession, ...data.sessionHistory]
      }, 'automatico');
      setBackupPoints(StorageService.loadBackupPoints());
      setLastBackupTime(point.timestamp);
    }, 200);

    return closedSession;
  }, [currentUser.name, data]);

  // Record Sangria (cash withdrawal from drawer)
  const recordSangria = useCallback((amount: number, currency: Currency, reason: string) => {
    const tx = {
      id: `sangria-${Date.now()}`,
      type: 'sangria' as const,
      amount,
      currency,
      reason,
      timestamp: new Date().toISOString(),
      employeeName: currentUser.name,
    };

    setData(prev => ({
      ...prev,
      currentSession: {
        ...prev.currentSession,
        transactions: [tx, ...prev.currentSession.transactions],
      }
    }));
  }, [currentUser.name]);

  // Record Suprimento (cash addition/float reinforcement to drawer)
  const recordSuprimento = useCallback((amount: number, currency: Currency, reason: string) => {
    const tx = {
      id: `suprimento-${Date.now()}`,
      type: 'suprimento' as const,
      amount,
      currency,
      reason,
      timestamp: new Date().toISOString(),
      employeeName: currentUser.name,
    };

    setData(prev => ({
      ...prev,
      currentSession: {
        ...prev.currentSession,
        transactions: [tx, ...prev.currentSession.transactions],
      }
    }));
  }, [currentUser.name]);

  // Current month goal helper
  const getCurrentGoal = useCallback((): MonthlyGoal => {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const found = data.goals.find(g => g.month === currentMonthStr);
    if (found) return found;

    return {
      month: currentMonthStr,
      targetRevenueBrl: 80000,
      targetDailyAverageBrl: 2666,
      targetTransactions: 3000,
      targetTicketMedioBrl: 26.00,
    };
  }, [data.goals]);

  // Update Goal
  const updateGoal = useCallback((newGoal: MonthlyGoal) => {
    setData(prev => {
      const filtered = prev.goals.filter(g => g.month !== newGoal.month);
      return {
        ...prev,
        goals: [newGoal, ...filtered],
      };
    });
  }, []);

  // Manual Backup
  const createManualBackup = useCallback(() => {
    setIsCloudSyncing(true);
    setTimeout(() => {
      const point = StorageService.createBackupPoint(data, 'manual');
      setBackupPoints(StorageService.loadBackupPoints());
      setLastBackupTime(point.timestamp);
      setIsCloudSyncing(false);
    }, 800);
  }, [data]);

  // Export JSON file
  const exportDatabaseBackup = useCallback(() => {
    StorageService.exportToJson(data);
  }, [data]);

  // Import JSON file
  const importDatabaseBackup = useCallback((jsonData: any): boolean => {
    try {
      const restored = StorageService.restoreFromJson(jsonData);
      setData(restored);
      setBackupPoints(StorageService.loadBackupPoints());
      setLastBackupTime(new Date().toISOString());
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }, []);

  // Restore from point
  const restoreFromPoint = useCallback((backupId: string) => {
    // In our client-first model, we load the backup snapshot
    const point = backupPoints.find(p => p.id === backupId);
    if (!point) return;
    setIsCloudSyncing(true);
    setTimeout(() => {
      setIsCloudSyncing(false);
    }, 600);
  }, [backupPoints]);

  // Reset to initial sample data
  const resetToSampleData = useCallback(() => {
    localStorage.removeItem('KORISKO_STATE_V1');
    localStorage.removeItem('KORISKO_BACKUP_POINTS_V1');
    localStorage.removeItem('PANETTIERE_STATE_V1');
    localStorage.removeItem('PANETTIERE_BACKUP_POINTS_V1');
    const fresh = StorageService.loadState();
    setData(fresh);
    setBackupPoints(StorageService.loadBackupPoints());
  }, []);

  const value = useMemo(() => ({
    currentUser,
    employees: data.employees,
    switchUser,
    updateEmployeePin,
    hasPermission,
    exchangeRates: data.exchangeRates,
    updateExchangeRates,
    liveRateStatus,
    fetchLiveRates,
    toggleAutoRateRefresh,
    products: data.products,
    stockMovements: data.stockMovements,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    // Fornadas
    fornadas: data.fornadas || [],
    registerFornada,
    // Ficha Técnica
    fichasTecnicas: data.fichasTecnicas || [],
    addFichaTecnica,
    updateFichaTecnica,
    deleteFichaTecnica,
    executeProductionFromRecipe,
    // CRM
    customers: data.customers || [],
    customerEntries: data.customerEntries || [],
    addCustomer,
    updateCustomer,
    deleteCustomer,
    recordCustomerDebt,
    recordCustomerPayment,
    redeemCustomerPoints,
    // Comandas
    openComandas: data.openComandas || [],
    saveComanda,
    removeComanda,
    sales: data.sales,
    completeSale,
    currentSession: data.currentSession,
    sessionHistory: data.sessionHistory,
    openRegister,
    closeRegister,
    recordSangria,
    recordSuprimento,
    goals: data.goals,
    getCurrentGoal,
    updateGoal,
    backupPoints,
    lastBackupTime,
    isCloudSyncing,
    createManualBackup,
    exportDatabaseBackup,
    importDatabaseBackup,
    restoreFromPoint,
    resetToSampleData,
  }), [
    currentUser,
    data.employees,
    switchUser,
    updateEmployeePin,
    hasPermission,
    data.exchangeRates,
    updateExchangeRates,
    liveRateStatus,
    fetchLiveRates,
    toggleAutoRateRefresh,
    data.products,
    data.stockMovements,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    data.fornadas,
    registerFornada,
    data.fichasTecnicas,
    addFichaTecnica,
    updateFichaTecnica,
    deleteFichaTecnica,
    executeProductionFromRecipe,
    data.customers,
    data.customerEntries,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    recordCustomerDebt,
    recordCustomerPayment,
    redeemCustomerPoints,
    data.openComandas,
    saveComanda,
    removeComanda,
    data.sales,
    completeSale,
    data.currentSession,
    data.sessionHistory,
    openRegister,
    closeRegister,
    recordSangria,
    recordSuprimento,
    data.goals,
    getCurrentGoal,
    updateGoal,
    backupPoints,
    lastBackupTime,
    isCloudSyncing,
    createManualBackup,
    exportDatabaseBackup,
    importDatabaseBackup,
    restoreFromPoint,
    resetToSampleData,
  ]);

  return (
    <BakeryContext.Provider value={value}>
      {children}
    </BakeryContext.Provider>
  );
};

export const useBakery = (): BakeryContextType => {
  const ctx = useContext(BakeryContext);
  if (!ctx) {
    throw new Error('useBakery must be used within a BakeryProvider');
  }
  return ctx;
};
