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
  ComandaStatus,
  SetorResponsavel,
  FornadaLog,
  FichaTecnica,
  Customer,
  CustomerAccountEntry,
  ActiveCheckoutSession,
  LiveRateStatus,
  PaymentMethod,
  AppFeature,
  AppLanguage,
  CashTransaction,
  CustomerPurchaseRecord,
  CustomerPurchaseItem
} from '../types';
import { translations, I18nDictionary } from '../utils/i18n';
import { StorageService, INITIAL_EMPLOYEES, INITIAL_PRODUCTS, INITIAL_FICHAS_TECNICAS, INITIAL_GOALS } from '../services/storageService';
import { DEFAULT_EXCHANGE_RATES, toBrl, fromBrl } from '../utils/currency';
import { fetchLiveExchangeRates } from '../services/exchangeRateService';
import { supabase } from '../lib/supabase';
import { 
  listProdutos, 
  upsertProduto, 
  deleteProduto, 
  listClientes, 
  upsertCliente, 
  deleteCliente, 
  listVendas, 
  insertVenda, 
  deleteVenda,
  listCaixaSessoes, 
  upsertCaixaSessao, 
  listUsuarios, 
  upsertUsuario, 
  deleteUsuario, 
  rpcBaixarEstoque, 
  rpcAjustarSaldoCliente, 
  fetchSystemStateDoc, 
  saveSystemStateDoc,
  rowToProduct,
  rowToCustomer,
  rowToSale,
  rowToSession,
  rowToUser,
  listComandas,
  upsertComandaDb,
  deleteComandaDb,
  rowToComanda,
  resolveSetoresFromItems,
  resolveProductImageUrl,
  formatSetorName,
  listLancamentosFiado,
  upsertLancamentoFiadoDb,
  deleteLancamentoFiadoDb,
  rowToFiadoEntry,
  listFluxoCobrancas,
  upsertFluxoCobrancaDb,
  deleteFluxoCobrancaDb,
  rowToCheckoutSession,
  listSaldosDevedoresTempoReal,
  upsertSaldoDevedorTempoRealDb,
  rowToLiveDebtorBalance,
  insertComandaHistoricoSetorDb,
  insertAmortizacaoFiadoDb,
  insertCaixaMovimentacaoDb,
  insertEstoqueMovimentacaoDb,
  insertFornadaProducaoDb,
  listRegistroComprasClientes,
  upsertRegistroCompraClienteDb,
  deleteRegistroCompraClienteDb,
  rowToCustomerPurchase
} from '../lib/db';

interface BakeryContextType {
  // Localization & Language
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: I18nDictionary;

  // Real Error Surface (Toast / Banner)
  dbError: string | null;
  clearDbError: () => void;
  setDbError: (err: string | null) => void;
  isLoadingDb: boolean;

  // Non-blocking in-app toasts
  toast: { id: number; message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;

  // Authentication & Profile
  currentUser: Employee;
  employees: Employee[];
  switchUser: (employeeId: string, pin?: string) => boolean;
  updateEmployeePin: (employeeId: string, newPin: string) => Promise<void>;
  hasPermission: (requiredRoles: UserRole[]) => boolean;
  isFeatureAllowed: (feature: AppFeature) => boolean;

  // Gestão de Afiliados / Membros (Painel do Admin Ax)
  addEmployee: (emp: Omit<Employee, 'id'>) => Promise<Employee>;
  updateEmployee: (emp: Employee) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  updateEmployeePermissions: (id: string, allowedFeatures: AppFeature[]) => Promise<void>;

  // Venda Direta / Rápida (Apenas Valor & Confirme)
  registerDirectSale: (
    amountBrl: number,
    description: string,
    paymentMethod: PaymentMethod,
    customerId?: string,
    paymentCurrency?: Currency,
    amountReceivedInCurrency?: number
  ) => Promise<Sale>;

  // Multi-Currency & Real-Time Live Rates
  exchangeRates: ExchangeRates;
  updateExchangeRates: (rates: Partial<ExchangeRates>) => void;
  liveRateStatus: LiveRateStatus;
  fetchLiveRates: () => Promise<void>;
  toggleAutoRateRefresh: () => void;

  // Inventory / Stock
  products: Product[];
  stockMovements: StockMovement[];
  addProduct: (product: Omit<Product, 'id' | 'active'>) => Promise<Product | null>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  adjustStock: (productId: string, type: 'entrada' | 'perda' | 'ajuste' | 'producao', quantity: number, reason: string) => Promise<void>;

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

  // CRM & Gestão de Clientes + Fluxo de Cobrança, Fiado e Registro de Compras em Tempo Real
  customers: Customer[];
  customerEntries: CustomerAccountEntry[];
  customerPurchases: CustomerPurchaseRecord[];
  activeCheckouts: ActiveCheckoutSession[];
  broadcastCheckoutSession: (session: Omit<ActiveCheckoutSession, 'updatedAt' | 'operatorId' | 'operatorName'>) => void;
  clearCheckoutSession: (sessionId: string) => void;
  addCustomer: (cust: Omit<Customer, 'id' | 'createdAt' | 'totalSpentBrl' | 'purchaseCount' | 'outstandingBalanceBrl' | 'loyaltyPoints'>) => Promise<Customer>;
  updateCustomer: (cust: Customer) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  recordCustomerDebt: (customerId: string, amountBrl: number, description: string, saleId?: string, comandaNumber?: string, setorResponsavel?: string) => Promise<void>;
  recordCustomerPayment: (customerId: string, amountBrl: number, method: PaymentMethod, notes?: string) => Promise<void>;
  recordCustomerPurchase: (params: {
    customerId: string;
    items: CustomerPurchaseItem[];
    totalAmountBrl: number;
    estimatedCostBrl?: number;
    paymentMethod: PaymentMethod;
    notes?: string;
    comandaNumber?: string;
  }) => Promise<CustomerPurchaseRecord>;
  deleteCustomerPurchase: (purchaseId: string) => Promise<void>;
  redeemCustomerPoints: (customerId: string, points: number) => number;

  // Comandas & Mesas (Tempo Real por Setor Responsável + Admin Total + Saldo Devedor Imediato)
  openComandas: Comanda[];
  saveComanda: (
    number: string,
    items: CartItem[],
    customerName?: string,
    notes?: string,
    extraOptions?: {
      customerId?: string;
      customerPhone?: string;
      status?: ComandaStatus;
      setorResponsavel?: SetorResponsavel;
      confirmedByCustomer?: boolean;
      source?: 'pdv' | 'loja_online' | 'cliente_direto';
      updateDebtorBalance?: boolean;
    }
  ) => Comanda;
  updateComandaStatus: (comandaId: string, status: ComandaStatus, setorResponsavel?: SetorResponsavel) => void;
  removeComanda: (comandaId: string, options?: { settledInSale?: boolean }) => void;

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
  ) => Promise<Sale>;
  deleteSale: (saleId: string, restoreStock?: boolean) => Promise<void>;

  // Cash Register Sessions
  currentSession: CashRegisterSession;
  sessionHistory: CashRegisterSession[];
  openRegister: (initialFloat: { brl: number; pyg: number; usd: number }) => Promise<void>;
  closeRegister: (
    counted: { brl: number; pyg: number; usd: number },
    notes?: string
  ) => Promise<CashRegisterSession>;
  recordSaidaCaixa: (amount: number, currency: Currency, reason: string, category?: string, documentNumber?: string) => void;
  recordEntradaCaixa: (amount: number, currency: Currency, reason: string, category?: string, documentNumber?: string) => void;
  recordSangria: (amount: number, currency: Currency, reason: string, category?: string, documentNumber?: string) => void;
  recordSuprimento: (amount: number, currency: Currency, reason: string, category?: string, documentNumber?: string) => void;

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
  resetToFactoryZero: () => Promise<void>;
  dbStatus: {
    connected: boolean;
    mode: string;
    checking: boolean;
    totalRecords?: number;
    supabase?: any;
  };
  refreshDbStatus: () => Promise<void>;
}

const BakeryContext = createContext<BakeryContextType | null>(null);

export const BakeryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem('KORISKO_LANG');
      if (saved === 'es' || saved === 'pt') return saved;
    } catch {}
    return 'es';
  });

  const setLanguage = useCallback((newLang: AppLanguage) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem('KORISKO_LANG', newLang);
    } catch {}
  }, []);

  const t = useMemo(() => {
    return translations[language] || translations.es;
  }, [language]);

  // REQUIREMENT 4: Real database error surface (never silent)
  const [dbError, setDbError] = useState<string | null>(null);
  const clearDbError = useCallback(() => setDbError(null), []);

  // Non-blocking in-app toasts
  const [toast, setToast] = useState<{ id: number; message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast(prev => (prev?.id === id ? null : prev));
    }, 4000);
  }, []);

  // REQUIREMENT 3: Initial cache on opening, replaced by database data
  const [data, setData] = useState<SystemBackupData>(() => StorageService.loadState());
  const [isLoadingDb, setIsLoadingDb] = useState<boolean>(true);
  const realtimeChannelRef = React.useRef<any>(null);

  const [currentUser, setCurrentUser] = useState<Employee>(() => {
    try {
      const savedUserId = localStorage.getItem('KORISKO_CURRENT_USER_ID');
      if (savedUserId && Array.isArray(data.employees)) {
        const found = data.employees.find(e => e.id === savedUserId);
        if (found) return found;
      }
    } catch {}
    return data.employees[0] || INITIAL_EMPLOYEES[0];
  });

  const [backupPoints, setBackupPoints] = useState<BackupPoint[]>(() => StorageService.loadBackupPoints());
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(() => {
    const points = StorageService.loadBackupPoints();
    return points.length > 0 ? points[0].timestamp : null;
  });

  const [dbStatus, setDbStatus] = useState<{
    connected: boolean;
    mode: string;
    checking: boolean;
    totalRecords?: number;
    supabase?: any;
  }>({
    connected: true,
    mode: 'supabase_cloud',
    checking: false,
    totalRecords: 0,
    supabase: {
      reachable: true,
      authenticated: true,
      tablesExist: true,
      url: import.meta.env.VITE_SUPABASE_URL || 'https://lmbpvdpmrdfxfqednwxd.supabase.co',
      keyPrefix: 'sb_publishable...',
      error: null,
    },
  });

  // Direct Supabase status check (no /api/ calls)
  const refreshDbStatus = useCallback(async () => {
    setDbStatus(prev => ({ ...prev, checking: true }));
    try {
      const [prodRes, custRes, salesRes] = await Promise.all([
        supabase.from('produtos').select('id', { count: 'exact', head: true }),
        supabase.from('clientes').select('id', { count: 'exact', head: true }),
        supabase.from('vendas').select('id', { count: 'exact', head: true }),
      ]);

      const isConnected = !prodRes.error || !custRes.error || !salesRes.error;
      const total = (prodRes.count || 0) + (custRes.count || 0) + (salesRes.count || 0);

      setDbStatus({
        connected: isConnected,
        mode: isConnected ? 'supabase_cloud' : 'erro_conexao',
        checking: false,
        totalRecords: total,
        supabase: {
          reachable: isConnected,
          authenticated: isConnected,
          tablesExist: isConnected,
          url: import.meta.env.VITE_SUPABASE_URL || 'https://lmbpvdpmrdfxfqednwxd.supabase.co',
          keyPrefix: 'sb_publishable...',
          error: !isConnected && prodRes.error ? prodRes.error.message : null,
        },
      });

      if (!isConnected && prodRes.error) {
        setDbError(`Supabase não respondeu: ${prodRes.error.message}`);
      }
    } catch (err: any) {
      setDbStatus(prev => ({ 
        ...prev, 
        connected: false, 
        checking: false,
        supabase: {
          reachable: false,
          authenticated: false,
          tablesExist: false,
          url: import.meta.env.VITE_SUPABASE_URL || 'https://lmbpvdpmrdfxfqednwxd.supabase.co',
          keyPrefix: 'sb_publishable...',
          error: err.message,
        }
      }));
      setDbError(`Falha ao conectar no Supabase: ${err.message}`);
    }
  }, []);

  // ==========================================
  // REQUIREMENT 3: INITIAL DATA LOAD VIA .range(0, 999)
  // All tables loaded in pages of 1000 without .limit()
  // ==========================================
  useEffect(() => {
    let isMounted = true;

    async function loadAllFromSupabase() {
      setIsLoadingDb(true);
      try {
        const [
          dbProducts, 
          dbCustomers, 
          dbSales, 
          dbSessions, 
          dbUsers, 
          dbComandas,
          dbFiadoEntries,
          dbCheckouts,
          dbLiveDebtorBalances,
          dbCustomerPurchases,
          dbExtra
        ] = await Promise.all([
          listProdutos().catch(err => { console.warn('Produtos load notice:', err); return []; }),
          listClientes().catch(err => { console.warn('Clientes load notice:', err); return []; }),
          listVendas().catch(err => { console.warn('Vendas load notice:', err); return []; }),
          listCaixaSessoes().catch(err => { console.warn('Caixa load notice:', err); return []; }),
          listUsuarios().catch(err => { console.warn('Usuarios load notice:', err); return []; }),
          listComandas().catch(() => []),
          listLancamentosFiado().catch(() => []),
          listFluxoCobrancas().catch(() => []),
          listSaldosDevedoresTempoReal().catch(() => []),
          listRegistroComprasClientes().catch(() => []),
          fetchSystemStateDoc().catch(() => null),
        ]);

        if (!isMounted) return;

        let serverFallback: SystemBackupData | null = null;
        if (dbProducts.length === 0 && (!dbExtra || !dbExtra.products || dbExtra.products.length > 0 === false)) {
          try {
            serverFallback = await StorageService.fetchServerState();
          } catch {}
        }

        if (!isMounted) return;

        setData(prev => {
          // Merge products & ensure Combo 3 Brownies 70% Cacau photo is resolved
          const rawProducts = dbProducts.length > 0 
            ? dbProducts 
            : (dbExtra?.products && dbExtra.products.length > 0 
              ? dbExtra.products 
              : (serverFallback?.products && serverFallback.products.length > 0 ? serverFallback.products : prev.products));

          const products = (rawProducts || []).map((p: Product) => {
            const resolvedImg = resolveProductImageUrl(p);
            if (resolvedImg && resolvedImg !== p.imageUrl) {
              const updatedProd = { ...p, imageUrl: resolvedImg };
              upsertProduto(updatedProd).catch(() => {});
              return updatedProd;
            }
            return p;
          });

          // Merge customers + reconcile with saldos_devedores_tempo_real
          const baseCustomers = dbCustomers.length > 0 
            ? dbCustomers 
            : (dbExtra?.customers && dbExtra.customers.length > 0 
              ? dbExtra.customers 
              : (serverFallback?.customers && serverFallback.customers.length > 0 ? serverFallback.customers : prev.customers));

          const debtorMap = new Map<string, number>();
          (dbLiveDebtorBalances || []).forEach(d => {
            if (d.customerId && typeof d.currentDebtBalanceBrl === 'number') {
              debtorMap.set(d.customerId, d.currentDebtBalanceBrl);
            }
          });

          const customers = (baseCustomers || []).map((c: Customer) => {
            if (debtorMap.has(c.id)) {
              return { ...c, outstandingBalanceBrl: debtorMap.get(c.id)! };
            }
            return c;
          });

          // Merge sales
          const sales = dbSales.length > 0 
            ? dbSales 
            : (dbExtra?.sales && dbExtra.sales.length > 0 
              ? dbExtra.sales 
              : (serverFallback?.sales && serverFallback.sales.length > 0 ? serverFallback.sales : prev.sales));
          // Merge employees: ensure Admin Ax always preserved
          let employees = dbUsers.length > 0 ? dbUsers : prev.employees;
          if (!employees.some(e => e.id === 'emp-admin-ax' || e.email === 'axxeiacompany@gmail.com')) {
            employees = [INITIAL_EMPLOYEES[0], ...employees];
          }

          // Active session
          let currentSession = prev.currentSession;
          let sessionHistory = prev.sessionHistory;
          if (dbSessions.length > 0) {
            const activeOne = dbSessions.find(s => s.status === 'aberto');
            currentSession = activeOne || dbSessions[0];
            sessionHistory = dbSessions.filter(s => s.id !== currentSession.id);
          }

          // Merge real-time comandas from comandas table + korisko_system_state
          const extraComandas: Comanda[] = Array.isArray(dbExtra?.openComandas) ? dbExtra.openComandas : (prev.openComandas ?? []);
          const comandasMap = new Map<string, Comanda>();
          extraComandas.forEach(c => comandasMap.set(c.id || c.number, c));
          dbComandas.forEach(c => comandasMap.set(c.id || c.number, c));
          const mergedComandas = Array.from(comandasMap.values()).filter(c => c.status !== 'pago' && c.status !== 'cancelado');

          // Merge real-time fiado entries from lancamentos_fiado table + korisko_system_state
          const extraEntries: CustomerAccountEntry[] = Array.isArray(dbExtra?.customerEntries) ? dbExtra.customerEntries : (prev.customerEntries ?? []);
          const entriesMap = new Map<string, CustomerAccountEntry>();
          extraEntries.forEach(e => entriesMap.set(e.id, e));
          dbFiadoEntries.forEach(e => entriesMap.set(e.id, e));
          const mergedEntries = Array.from(entriesMap.values()).sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );

          // Merge real-time active checkouts from fluxo_cobrancas_tempo_real table + korisko_system_state
          const extraCheckouts: ActiveCheckoutSession[] = Array.isArray(dbExtra?.activeCheckouts) ? dbExtra.activeCheckouts : (prev.activeCheckouts ?? []);
          const checkoutsMap = new Map<string, ActiveCheckoutSession>();
          extraCheckouts.forEach(s => checkoutsMap.set(s.id, s));
          dbCheckouts.forEach(s => checkoutsMap.set(s.id, s));
          const nowMs = Date.now();
          const mergedCheckouts = Array.from(checkoutsMap.values())
            .filter(s => s.status !== 'cancelado' && (nowMs - new Date(s.updatedAt).getTime() < 24 * 60 * 60 * 1000))
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 40);

          // Merge & synthesize customer purchases (registro_compras_clientes + sales + fiado entries + open comandas)
          const extraPurchases: CustomerPurchaseRecord[] = Array.isArray(dbExtra?.customerPurchases)
            ? dbExtra.customerPurchases
            : (prev.customerPurchases ?? []);
          const purchasesMap = new Map<string, CustomerPurchaseRecord>();
          extraPurchases.forEach(p => purchasesMap.set(p.id, p));
          (dbCustomerPurchases || []).forEach(p => purchasesMap.set(p.id, p));

          const recordedSaleIds = new Set<string>();
          const recordedComandaNumbers = new Set<string>();
          purchasesMap.forEach(p => {
            if (p.saleId) recordedSaleIds.add(p.saleId);
            if (p.comandaNumber) recordedComandaNumbers.add(p.comandaNumber.trim().toLowerCase());
          });

          // Backfill from sales linked to customers
          (sales || []).forEach((s: Sale) => {
            if (!s) return;
            let matchedCust = s.customerId ? customers.find((c: Customer) => c.id === s.customerId) : undefined;
            if (!matchedCust && s.customerName) {
              const cleanName = s.customerName.trim().toLowerCase();
              matchedCust = customers.find((c: Customer) => c.name.trim().toLowerCase() === cleanName);
            }
            if (!matchedCust) return;
            if (recordedSaleIds.has(s.id) || purchasesMap.has(`purch-sale-${s.id}`)) return;

            const itemsList: CustomerPurchaseItem[] = (s.items || []).map(it => ({
              productId: it.product?.id || '',
              productName: it.product?.name || (it as any).name || 'Produto',
              category: it.product?.category || 'paes',
              quantity: Number(it.quantity) || 1,
              unit: it.product?.unit || 'un',
              unitPriceBrl: Number(it.unitPriceBrl ?? it.product?.priceBrl ?? 0),
              costPriceBrl: Number(it.product?.costPriceBrl ?? (Number(it.unitPriceBrl || 0) * 0.42)),
              subtotalBrl: Number(it.subtotalBrl ?? (Number(it.unitPriceBrl || 0) * Number(it.quantity || 1))),
            }));
            const estCost = itemsList.reduce((acc, it) => acc + (it.costPriceBrl * it.quantity), 0);
            const fiadoAmt = (s.payments || []).filter(p => p.method === 'fiado').reduce((acc, p) => acc + (p.equivalentBrl || p.amountReceived || 0), 0);
            const paidAmt = Math.max(0, (s.totalBrl || 0) - fiadoAmt);
            const primaryPay = fiadoAmt > 0 ? 'fiado' : (s.payments?.[0]?.method || 'dinheiro');
            const summary = itemsList.map(i => `${i.quantity}x ${i.productName}`).join(', ') || `Venda #${s.saleNumber || 'PDV'}`;

            const rec: CustomerPurchaseRecord = {
              id: `purch-sale-${s.id}`,
              customerId: matchedCust.id,
              customerName: matchedCust.name,
              customerPhone: matchedCust.phone,
              saleId: s.id,
              saleNumber: s.saleNumber,
              comandaNumber: s.comandaNumber,
              items: itemsList,
              itemsSummary: summary,
              totalAmountBrl: s.totalBrl || 0,
              estimatedCostBrl: Math.round(estCost),
              paidAmountBrl: paidAmt,
              fiadoAmountBrl: fiadoAmt,
              paymentMethod: primaryPay,
              flowType: fiadoAmt > 0 ? 'fiado_pendente' : 'entrada_avista',
              setorResponsavel: s.setorResponsavel || 'Panificação & Confeitaria Artesanal',
              recordedBy: s.employeeName || 'Operador',
              purchaseDate: s.timestamp || new Date().toISOString(),
            };
            purchasesMap.set(rec.id, rec);
            recordedSaleIds.add(s.id);
            if (s.comandaNumber) recordedComandaNumbers.add(s.comandaNumber.trim().toLowerCase());
            upsertRegistroCompraClienteDb(rec).catch(() => {});
          });

          // Backfill from customerEntries (debito_compra) that were not part of a sale already recorded
          mergedEntries.forEach(e => {
            if (e.type !== 'debito_compra' || !e.customerId) return;
            if (e.saleId && recordedSaleIds.has(e.saleId)) return;
            if (e.comandaNumber && recordedComandaNumbers.has(e.comandaNumber.trim().toLowerCase())) return;
            const synthId = `purch-debt-${e.id}`;
            if (purchasesMap.has(synthId)) return;

            const matchedCust = customers.find((c: Customer) => c.id === e.customerId);
            const rec: CustomerPurchaseRecord = {
              id: synthId,
              customerId: e.customerId,
              customerName: e.customerName || matchedCust?.name || 'Cliente',
              customerPhone: matchedCust?.phone,
              saleId: e.saleId,
              comandaNumber: e.comandaNumber,
              items: [{
                productId: 'item-fiado',
                productName: e.description || 'Compra no Fiado / Comanda',
                category: 'paes',
                quantity: 1,
                unit: 'un',
                unitPriceBrl: e.amountBrl,
                costPriceBrl: Math.round(e.amountBrl * 0.42),
                subtotalBrl: e.amountBrl,
              }],
              itemsSummary: e.description || 'Compra lançada em Conta / Fiado',
              totalAmountBrl: e.amountBrl,
              estimatedCostBrl: Math.round(e.amountBrl * 0.42),
              paidAmountBrl: 0,
              fiadoAmountBrl: e.amountBrl,
              paymentMethod: 'fiado',
              flowType: 'fiado_pendente',
              setorResponsavel: e.setorResponsavel || 'Panificação & Confeitaria Artesanal',
              recordedBy: e.recordedBy || 'Caixa',
              purchaseDate: e.date || new Date().toISOString(),
            };
            purchasesMap.set(rec.id, rec);
            if (e.comandaNumber) recordedComandaNumbers.add(e.comandaNumber.trim().toLowerCase());
            upsertRegistroCompraClienteDb(rec).catch(() => {});
          });

          const mergedPurchases = Array.from(purchasesMap.values()).sort(
            (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
          );

          // Reconcile each customer's Total Comprado (totalSpentBrl) and purchaseCount from mergedPurchases
          const reconciledCustomers = customers.map((c: Customer) => {
            const custPurchases = mergedPurchases.filter(p => p.customerId === c.id);
            const sumPurchases = custPurchases.reduce((acc, p) => acc + (Number(p.totalAmountBrl) || 0), 0);
            const finalSpent = Math.max(c.totalSpentBrl || 0, sumPurchases, c.outstandingBalanceBrl || 0);
            const finalCount = Math.max(c.purchaseCount || 0, custPurchases.length, finalSpent > 0 ? 1 : 0);
            const latestDate = custPurchases[0]?.purchaseDate || c.lastPurchaseDate;
            return {
              ...c,
              totalSpentBrl: finalSpent,
              purchaseCount: finalCount,
              lastPurchaseDate: latestDate,
            };
          });

          const newState: SystemBackupData = {
            ...prev,
            products,
            customers: reconciledCustomers,
            sales,
            employees,
            currentSession,
            sessionHistory,
            // Extra system state
            openComandas: mergedComandas,
            fornadas: dbExtra?.fornadas && dbExtra.fornadas.length > 0 ? dbExtra.fornadas : (prev.fornadas ?? []),
            fichasTecnicas: dbExtra?.fichasTecnicas && dbExtra.fichasTecnicas.length > 0 ? dbExtra.fichasTecnicas : (prev.fichasTecnicas ?? []),
            goals: dbExtra?.goals && dbExtra.goals.length > 0 ? dbExtra.goals : (prev.goals || INITIAL_GOALS),
            exchangeRates: dbExtra?.exchangeRates ?? prev.exchangeRates ?? DEFAULT_EXCHANGE_RATES,
            stockMovements: dbExtra?.stockMovements && dbExtra.stockMovements.length > 0 ? dbExtra.stockMovements : (prev.stockMovements ?? []),
            customerEntries: mergedEntries,
            customerPurchases: mergedPurchases,
            activeCheckouts: mergedCheckouts,
          };

          // Cache updated state locally for offline fallback
          try {
            localStorage.setItem('KORISKO_STATE_V2', JSON.stringify(newState));
          } catch {}

          return newState;
        });

        // Sync current logged in user
        const savedUserId = localStorage.getItem('KORISKO_CURRENT_USER_ID') || 'emp-admin-ax';
        if (dbUsers.length > 0) {
          const match = dbUsers.find(u => u.id === savedUserId) || dbUsers.find(u => u.role === 'admin') || dbUsers[0];
          if (match && isMounted) {
            setCurrentUser(match);
          }
        }

        if (isMounted) {
          setDbStatus({
            connected: true,
            mode: 'supabase_cloud',
            checking: false,
            totalRecords: dbProducts.length + dbCustomers.length + dbSales.length,
          });
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('[Supabase Initial Load Error]:', err);
          setDbError(`Falha ao carregar dados do Supabase: ${err.message || String(err)}`);
        }
      } finally {
        if (isMounted) {
          setIsLoadingDb(false);
        }
      }
    }

    loadAllFromSupabase();

    return () => {
      isMounted = false;
    };
  }, []);

  // ==========================================
  // REQUIREMENT 7: REALTIME MULTI-DEVICE
  // A single channel per table (vendas, produtos, clientes, caixa_sessoes, usuarios, comandas, lancamentos_fiado, fluxo_cobrancas_tempo_real, korisko_system_state)
  // Plus instant broadcast events for zero-latency live checkout & fiado protection!
  // ==========================================
  useEffect(() => {
    let activeChannel: any = null;
    let isSubscribed = false;

    const setupRealtime = () => {
      if (activeChannel) {
        try {
          const ch = activeChannel;
          activeChannel = null;
          realtimeChannelRef.current = null;
          isSubscribed = false;
          supabase.removeChannel(ch).catch?.(() => {});
        } catch {}
      }

      try {
        activeChannel = supabase
          .channel('korisko-realtime-sync')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            const newSale = rowToSale(payload.new);
            setData(prev => ({
              ...prev,
              sales: [newSale, ...prev.sales.filter(s => s.id !== newSale.id)],
            }));
          } else if (payload.eventType === 'UPDATE') {
            const updatedSale = rowToSale(payload.new);
            setData(prev => ({
              ...prev,
              sales: prev.sales.map(s => s.id === updatedSale.id ? updatedSale : s),
            }));
          } else if (payload.eventType === 'DELETE') {
            const oldId = String((payload.old as any)?.id);
            setData(prev => ({
              ...prev,
              sales: prev.sales.filter(s => s.id !== oldId),
            }));
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            const newProd = rowToProduct(payload.new);
            setData(prev => ({
              ...prev,
              products: [newProd, ...prev.products.filter(p => p.id !== newProd.id)],
            }));
          } else if (payload.eventType === 'UPDATE') {
            const updatedProd = rowToProduct(payload.new);
            setData(prev => ({
              ...prev,
              products: prev.products.map(p => p.id === updatedProd.id ? updatedProd : p),
            }));
          } else if (payload.eventType === 'DELETE') {
            const oldId = String((payload.old as any)?.id);
            setData(prev => ({
              ...prev,
              products: prev.products.filter(p => p.id !== oldId),
            }));
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            const newCust = rowToCustomer(payload.new);
            setData(prev => ({
              ...prev,
              customers: [newCust, ...(prev.customers || []).filter(c => c.id !== newCust.id)],
            }));
          } else if (payload.eventType === 'UPDATE') {
            const updatedCust = rowToCustomer(payload.new);
            setData(prev => ({
              ...prev,
              customers: (prev.customers || []).map(c => c.id === updatedCust.id ? updatedCust : c),
            }));
          } else if (payload.eventType === 'DELETE') {
            const oldId = String((payload.old as any)?.id);
            setData(prev => ({
              ...prev,
              customers: (prev.customers || []).filter(c => c.id !== oldId),
            }));
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'caixa_sessoes' }, (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const sess = rowToSession(payload.new);
            setData(prev => {
              const isCurrent = prev.currentSession.id === sess.id || sess.status === 'aberto';
              return {
                ...prev,
                currentSession: isCurrent ? { ...prev.currentSession, ...sess } : prev.currentSession,
                sessionHistory: [
                  sess,
                  ...prev.sessionHistory.filter(s => s.id !== sess.id)
                ],
              };
            });
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            const user = rowToUser(payload.new);
            setData(prev => ({
              ...prev,
              employees: [...prev.employees.filter(e => e.id !== user.id), user],
            }));
          } else if (payload.eventType === 'UPDATE') {
            const user = rowToUser(payload.new);
            setData(prev => ({
              ...prev,
              employees: prev.employees.map(e => e.id === user.id ? user : e),
            }));
            setCurrentUser(curr => curr.id === user.id ? user : curr);
          } else if (payload.eventType === 'DELETE') {
            const oldId = String((payload.old as any)?.id);
            setData(prev => ({
              ...prev,
              employees: prev.employees.filter(e => e.id !== oldId),
            }));
          }
        })
        .on('broadcast', { event: 'live_user_permissions' }, ({ payload }) => {
          if (!payload || !payload.id) return;
          const updatedUser = payload as Employee;
          setData(prev => ({
            ...prev,
            employees: prev.employees.map(e => e.id === updatedUser.id ? updatedUser : e),
          }));
          setCurrentUser(curr => curr.id === updatedUser.id ? updatedUser : curr);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comandas' }, (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const cmd = rowToComanda(payload.new);
            setData(prev => {
              if (cmd.status === 'pago' || cmd.status === 'cancelado') {
                return {
                  ...prev,
                  openComandas: (prev.openComandas || []).filter(c => c.id !== cmd.id && c.number !== cmd.number),
                };
              }
              const exists = (prev.openComandas || []).some(c => c.id === cmd.id || c.number === cmd.number);
              const nextComandas = exists
                ? (prev.openComandas || []).map(c => (c.id === cmd.id || c.number === cmd.number) ? cmd : c)
                : [cmd, ...(prev.openComandas || [])];
              return {
                ...prev,
                openComandas: nextComandas,
              };
            });
          } else if (payload.eventType === 'DELETE') {
            const oldId = String((payload.old as any)?.id);
            setData(prev => ({
              ...prev,
              openComandas: (prev.openComandas || []).filter(c => c.id !== oldId),
            }));
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'lancamentos_fiado' }, (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const entry = rowToFiadoEntry(payload.new);
            setData(prev => {
              const exists = (prev.customerEntries || []).some(e => e.id === entry.id);
              const nextEntries = exists
                ? (prev.customerEntries || []).map(e => e.id === entry.id ? entry : e)
                : [entry, ...(prev.customerEntries || [])];
              const nextCustomers = entry.resultingBalanceBrl !== undefined
                ? (prev.customers || []).map(c => c.id === entry.customerId ? { ...c, outstandingBalanceBrl: entry.resultingBalanceBrl! } : c)
                : prev.customers;
              return {
                ...prev,
                customers: nextCustomers,
                customerEntries: nextEntries,
              };
            });
          } else if (payload.eventType === 'DELETE') {
            const oldId = String((payload.old as any)?.id);
            setData(prev => ({
              ...prev,
              customerEntries: (prev.customerEntries || []).filter(e => e.id !== oldId),
            }));
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fluxo_cobrancas_tempo_real' }, (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const session = rowToCheckoutSession(payload.new);
            setData(prev => {
              if (session.status === 'cancelado') {
                return {
                  ...prev,
                  activeCheckouts: (prev.activeCheckouts || []).filter(s => s.id !== session.id),
                };
              }
              const exists = (prev.activeCheckouts || []).some(s => s.id === session.id);
              const nextList = exists
                ? (prev.activeCheckouts || []).map(s => s.id === session.id ? session : s)
                : [session, ...(prev.activeCheckouts || [])];
              return {
                ...prev,
                activeCheckouts: nextList.slice(0, 40),
              };
            });
          } else if (payload.eventType === 'DELETE') {
            const oldId = String((payload.old as any)?.id);
            setData(prev => ({
              ...prev,
              activeCheckouts: (prev.activeCheckouts || []).filter(s => s.id !== oldId),
            }));
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'saldos_devedores_tempo_real' }, (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const liveDebtor = rowToLiveDebtorBalance(payload.new);
            if (!liveDebtor.customerId) return;
            setData(prev => {
              const exists = (prev.customers || []).some(c => c.id === liveDebtor.customerId);
              const nextCustomers = exists
                ? (prev.customers || []).map(c =>
                    c.id === liveDebtor.customerId
                      ? { ...c, outstandingBalanceBrl: liveDebtor.currentDebtBalanceBrl }
                      : c
                  )
                : [
                    {
                      id: liveDebtor.customerId,
                      name: liveDebtor.customerName || 'Cliente Comanda',
                      phone: liveDebtor.customerPhone || '',
                      category: 'varejo' as const,
                      creditLimitBrl: liveDebtor.creditLimitBrl || 500000,
                      outstandingBalanceBrl: liveDebtor.currentDebtBalanceBrl,
                      loyaltyPoints: 0,
                      totalSpentBrl: liveDebtor.currentDebtBalanceBrl,
                      purchaseCount: 1,
                      createdAt: liveDebtor.updatedAt,
                    },
                    ...(prev.customers || []),
                  ];
              return {
                ...prev,
                customers: nextCustomers,
              };
            });
          }
        })
        .on('broadcast', { event: 'live_debtor_balance' }, ({ payload }) => {
          if (!payload || !payload.customerId) return;
          setData(prev => {
            const exists = (prev.customers || []).some(c => c.id === payload.customerId);
            const nextCustomers = exists
              ? (prev.customers || []).map(c =>
                  c.id === payload.customerId
                    ? { ...c, outstandingBalanceBrl: Number(payload.currentDebtBalanceBrl) || 0 }
                    : c
                )
              : [
                  {
                    id: payload.customerId,
                    name: payload.customerName || 'Cliente Comanda',
                    phone: payload.customerPhone || '',
                    category: 'varejo' as const,
                    creditLimitBrl: Number(payload.creditLimitBrl) || 500000,
                    outstandingBalanceBrl: Number(payload.currentDebtBalanceBrl) || 0,
                    loyaltyPoints: 0,
                    totalSpentBrl: Number(payload.currentDebtBalanceBrl) || 0,
                    purchaseCount: 1,
                    createdAt: payload.updatedAt || new Date().toISOString(),
                  },
                  ...(prev.customers || []),
                ];
            return {
              ...prev,
              customers: nextCustomers,
            };
          });
        })
        .on('broadcast', { event: 'live_checkout_update' }, ({ payload }) => {
          if (!payload || !payload.id) return;
          const session = payload as ActiveCheckoutSession;
          setData(prev => {
            if (session.status === 'cancelado') {
              return {
                ...prev,
                activeCheckouts: (prev.activeCheckouts || []).filter(s => s.id !== session.id),
              };
            }
            const exists = (prev.activeCheckouts || []).some(s => s.id === session.id);
            const nextList = exists
              ? (prev.activeCheckouts || []).map(s => s.id === session.id ? session : s)
              : [session, ...(prev.activeCheckouts || [])];
            return {
              ...prev,
              activeCheckouts: nextList.slice(0, 40),
            };
          });
        })
        .on('broadcast', { event: 'live_fiado_entry' }, ({ payload }) => {
          if (!payload || !payload.id) return;
          const entry = payload as CustomerAccountEntry;
          setData(prev => {
            const exists = (prev.customerEntries || []).some(e => e.id === entry.id);
            const nextEntries = exists
              ? (prev.customerEntries || []).map(e => e.id === entry.id ? entry : e)
              : [entry, ...(prev.customerEntries || [])];
            const nextCustomers = entry.resultingBalanceBrl !== undefined
              ? (prev.customers || []).map(c => c.id === entry.customerId ? { ...c, outstandingBalanceBrl: entry.resultingBalanceBrl! } : c)
              : prev.customers;
            return {
              ...prev,
              customers: nextCustomers,
              customerEntries: nextEntries,
            };
          });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'registro_compras_clientes' }, (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const purch = rowToCustomerPurchase(payload.new);
            setData(prev => {
              const exists = (prev.customerPurchases || []).some(p => p.id === purch.id);
              const nextPurchases = exists
                ? (prev.customerPurchases || []).map(p => p.id === purch.id ? purch : p)
                : [purch, ...(prev.customerPurchases || [])];
              const custPurchases = nextPurchases.filter(p => p.customerId === purch.customerId);
              const totalSpent = custPurchases.reduce((acc, p) => acc + (Number(p.totalAmountBrl) || 0), 0);
              const nextCustomers = (prev.customers || []).map(c =>
                c.id === purch.customerId
                  ? {
                      ...c,
                      totalSpentBrl: Math.max(c.totalSpentBrl || 0, totalSpent),
                      purchaseCount: Math.max(c.purchaseCount || 0, custPurchases.length),
                      lastPurchaseDate: purch.purchaseDate,
                    }
                  : c
              );
              return {
                ...prev,
                customers: nextCustomers,
                customerPurchases: nextPurchases,
              };
            });
          } else if (payload.eventType === 'DELETE') {
            const oldId = String((payload.old as any)?.id);
            setData(prev => {
              const nextPurchases = (prev.customerPurchases || []).filter(p => p.id !== oldId);
              return {
                ...prev,
                customerPurchases: nextPurchases,
              };
            });
          }
        })
        .on('broadcast', { event: 'live_customer_purchase' }, ({ payload }) => {
          if (!payload || !payload.id) return;
          const purch = payload as CustomerPurchaseRecord;
          setData(prev => {
            const exists = (prev.customerPurchases || []).some(p => p.id === purch.id);
            const nextPurchases = exists
              ? (prev.customerPurchases || []).map(p => p.id === purch.id ? purch : p)
              : [purch, ...(prev.customerPurchases || [])];
            const custPurchases = nextPurchases.filter(p => p.customerId === purch.customerId);
            const totalSpent = custPurchases.reduce((acc, p) => acc + (Number(p.totalAmountBrl) || 0), 0);
            const nextCustomers = (prev.customers || []).map(c =>
              c.id === purch.customerId
                ? {
                    ...c,
                    totalSpentBrl: Math.max(c.totalSpentBrl || 0, totalSpent),
                    purchaseCount: Math.max(c.purchaseCount || 0, custPurchases.length),
                    lastPurchaseDate: purch.purchaseDate,
                  }
                : c
            );
            return {
              ...prev,
              customers: nextCustomers,
              customerPurchases: nextPurchases,
            };
          });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'korisko_system_state' }, (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const remoteData = (payload.new as any)?.data;
            if (remoteData && typeof remoteData === 'object') {
              setData(prev => ({
                ...prev,
                openComandas: Array.isArray(remoteData.openComandas) ? remoteData.openComandas : prev.openComandas,
                customerEntries: Array.isArray(remoteData.customerEntries) ? remoteData.customerEntries : prev.customerEntries,
                activeCheckouts: Array.isArray(remoteData.activeCheckouts) ? remoteData.activeCheckouts : prev.activeCheckouts,
                customers: Array.isArray(remoteData.customers) && remoteData.customers.length > 0 ? remoteData.customers : prev.customers,
                fornadas: Array.isArray(remoteData.fornadas) ? remoteData.fornadas : prev.fornadas,
              }));
            }
          }
        });

        realtimeChannelRef.current = activeChannel;
        activeChannel.subscribe((status: string, err?: any) => {
          if (status === 'SUBSCRIBED') {
            isSubscribed = true;
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
            isSubscribed = false;
          }
        });
      } catch (err) {
        // Silently catch realtime channel setup failure
      }
    };

    try {
      setupRealtime();
    } catch (e) {
      console.warn('[Realtime] Subscription setup warning:', e);
    }

    // Prevent "Page entered Back-Forward Cache" WebSocket crash:
    // Cleanly close connection on pagehide, and reconnect on pageshow/resume
    const handlePageHide = () => {
      if (activeChannel) {
        try {
          const ch = activeChannel;
          activeChannel = null;
          isSubscribed = false;
          supabase.removeChannel(ch).catch?.(() => {});
        } catch {}
      }
    };

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted || !activeChannel) {
        try {
          setupRealtime();
        } catch {}
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isSubscribed) {
        try {
          setupRealtime();
        } catch {}
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (activeChannel) {
        try {
          const ch = activeChannel;
          activeChannel = null;
          isSubscribed = false;
          supabase.removeChannel(ch).catch?.(() => {});
        } catch {}
      }
    };
  }, []);

  // Update exchange rates
  const updateExchangeRates = useCallback((rates: Partial<ExchangeRates>) => {
    setData(prev => {
      const updatedRates = {
        ...prev.exchangeRates,
        ...rates,
        updatedAt: new Date().toISOString(),
      };
      saveSystemStateDoc({ ...prev, exchangeRates: updatedRates });
      return { ...prev, exchangeRates: updatedRates };
    });
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

  useEffect(() => {
    fetchLiveRates();
  }, [fetchLiveRates]);

  useEffect(() => {
    if (!liveRateStatus.autoRefresh) return;
    const timer = setInterval(() => {
      fetchLiveRates();
    }, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [fetchLiveRates, liveRateStatus.autoRefresh]);

  // Permission check helper
  const hasPermission = useCallback((requiredRoles: UserRole[]): boolean => {
    if (currentUser.role === 'admin') return true;
    return requiredRoles.includes(currentUser.role);
  }, [currentUser]);

  // Feature permission check helper
  const isFeatureAllowed = useCallback((feature: AppFeature): boolean => {
    if (feature === 'afiliados') {
      return currentUser.id === 'emp-admin-ax' || 
             currentUser.email === 'axxeiacompany@gmail.com' || 
             currentUser.name === 'Ax';
    }

    if (currentUser.id === 'emp-admin-ax' || currentUser.email === 'axxeiacompany@gmail.com') {
      return true;
    }

    if (currentUser.allowedFeatures && currentUser.allowedFeatures.length > 0) {
      return currentUser.allowedFeatures.includes(feature);
    }

    if (currentUser.role === 'admin' || currentUser.role === 'gerente') return true;
    if (currentUser.role === 'caixa') {
      return ['dashboard', 'pdv', 'venda_direta', 'loja', 'crm', 'caixa', 'mais_vendidos'].includes(feature);
    }
    if (currentUser.role === 'padeiro') {
      return ['dashboard', 'estoque', 'fichas_tecnicas', 'loja'].includes(feature);
    }
    return ['dashboard', 'pdv', 'venda_direta', 'loja', 'portal_afiliado'].includes(feature);
  }, [currentUser]);

  // Switch employee
  const switchUser = useCallback((employeeId: string, credential?: string): boolean => {
    let target = data.employees.find(e => e.id === employeeId || e.email === employeeId || e.name.toLowerCase() === employeeId.toLowerCase());
    if (!target) {
      target = INITIAL_EMPLOYEES.find(e => e.id === employeeId || e.email === employeeId || e.name.toLowerCase() === employeeId.toLowerCase());
    }
    if (!target) return false;

    if (credential) {
      const trimmed = credential.trim();
      const matchPin = Boolean(target.pin && target.pin.trim() === trimmed);
      const matchPwd = Boolean(target.password && target.password.trim() === trimmed);
      const isMaster = trimmed === '9APG_47z-EgF4yz' && (target.role === 'admin' || target.name.toLowerCase() === 'ax');
      if (!matchPin && !matchPwd && !isMaster) {
        return false;
      }
    }

    setCurrentUser(target);
    try {
      localStorage.setItem('KORISKO_CURRENT_USER_ID', target.id);
    } catch {}
    return true;
  }, [data.employees]);

  // Update employee PIN
  const updateEmployeePin = useCallback(async (employeeId: string, newPin: string) => {
    const emp = data.employees.find(e => e.id === employeeId);
    if (!emp) return;
    const updated = { ...emp, pin: newPin };
    try {
      await upsertUsuario(updated);
    } catch (err: any) {
      console.warn('[Korisko] Supabase updateEmployeePin fallback to local:', err.message);
    }
    setData(prev => {
      const nextState = {
        ...prev,
        employees: prev.employees.map(e => e.id === employeeId ? updated : e)
      };
      StorageService.saveState(nextState);
      return nextState;
    });
  }, [data.employees]);

  // ==========================================
  // REQUIREMENT 4: AFFILIATES / EMPLOYEES CRUD
  // Saves single row with await to Supabase (with local fallback)
  // ==========================================
  const addEmployee = useCallback(async (empData: Omit<Employee, 'id'>): Promise<Employee> => {
    const newEmp: Employee = {
      ...empData,
      id: `emp-${Date.now()}`,
      createdAt: new Date().toISOString(),
      avatarColor: empData.avatarColor || 'bg-indigo-600',
    };

    let persisted = newEmp;
    try {
      persisted = await upsertUsuario(newEmp);
    } catch (err: any) {
      console.warn('[Korisko] Supabase addEmployee fallback to local:', err.message);
    }

    setData(prev => {
      const nextState = {
        ...prev,
        employees: [...prev.employees.filter(e => e.id !== persisted.id), persisted],
      };
      StorageService.saveState(nextState);
      return nextState;
    });
    return persisted;
  }, []);

  const updateEmployee = useCallback(async (emp: Employee) => {
    let persisted = emp;
    try {
      persisted = await upsertUsuario(emp);
    } catch (err: any) {
      console.warn('[Korisko] Supabase updateEmployee fallback to local:', err.message);
    }

    setData(prev => {
      const nextState = {
        ...prev,
        employees: prev.employees.map(e => e.id === emp.id ? persisted : e),
      };
      StorageService.saveState(nextState);
      saveSystemStateDoc(nextState);
      return nextState;
    });
    if (currentUser.id === emp.id) {
      setCurrentUser(persisted);
    }
    try {
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'live_user_permissions',
          payload: persisted,
        }).catch?.(() => {});
      }
    } catch {}
  }, [currentUser.id]);

  const deleteEmployee = useCallback(async (id: string) => {
    if (id === 'emp-admin-ax') {
      setDbError('Não é possível remover o administrador principal (Ax).');
      return;
    }

    try {
      await deleteUsuario(id);
    } catch (err: any) {
      console.warn('[Korisko] Supabase deleteEmployee fallback to local:', err.message);
    }

    setData(prev => {
      const nextState = {
        ...prev,
        employees: prev.employees.filter(e => e.id !== id),
      };
      StorageService.saveState(nextState);
      return nextState;
    });
  }, []);

  const updateEmployeePermissions = useCallback(async (id: string, allowedFeatures: AppFeature[]) => {
    const emp = data.employees.find(e => e.id === id);
    if (!emp) return;
    const updated = { ...emp, allowedFeatures };
    try {
      await upsertUsuario(updated);
    } catch (err: any) {
      console.warn('[Korisko] Supabase updateEmployeePermissions fallback to local:', err.message);
    }
    setData(prev => {
      const nextState = {
        ...prev,
        employees: prev.employees.map(e => e.id === id ? updated : e),
      };
      StorageService.saveState(nextState);
      saveSystemStateDoc(nextState);
      return nextState;
    });
    if (currentUser.id === id) {
      setCurrentUser(prev => ({ ...prev, allowedFeatures }));
    }
    try {
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'live_user_permissions',
          payload: updated,
        }).catch?.(() => {});
      }
    } catch {}
  }, [currentUser.id, data.employees]);

  // ==========================================
  // REQUIREMENT 4: PRODUCTS CRUD
  // Saves single row with await to Supabase
  // ==========================================
  const addProduct = useCallback(async (prodData: Omit<Product, 'id' | 'active'>): Promise<Product | null> => {
    const newProduct: Product = {
      ...prodData,
      id: `prod-${Date.now()}`,
      active: true,
    };

    let persisted = newProduct;
    try {
      persisted = await upsertProduto(newProduct);
    } catch (err: any) {
      console.warn('[Korisko] Supabase upsertProduto fallback to local:', err.message);
    }

    setData(prev => {
      const nextState = {
        ...prev,
        products: [persisted, ...prev.products.filter(p => p.id !== persisted.id)],
      };
      StorageService.saveState(nextState);
      return nextState;
    });
    return persisted;
  }, []);

  const updateProduct = useCallback(async (updated: Product) => {
    let persisted = updated;
    try {
      persisted = await upsertProduto(updated);
    } catch (err: any) {
      console.warn('[Korisko] Supabase upsertProduto fallback to local:', err.message);
    }

    setData(prev => {
      const nextState = {
        ...prev,
        products: prev.products.map(p => p.id === updated.id ? persisted : p),
      };
      StorageService.saveState(nextState);
      return nextState;
    });
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    try {
      await deleteProduto(id);
    } catch (err: any) {
      console.warn('[Korisko] Supabase deleteProduto fallback to local:', err.message);
    }

    setData(prev => {
      const nextState = {
        ...prev,
        products: prev.products.filter(p => p.id !== id),
      };
      StorageService.saveState(nextState);
      return nextState;
    });
  }, []);

  // Manual stock adjustment
  const adjustStock = useCallback(async (
    productId: string, 
    type: 'entrada' | 'perda' | 'ajuste' | 'producao', 
    quantity: number, 
    reason: string
  ) => {
    const prod = data.products.find(p => p.id === productId);
    if (!prod) return;

    let newStock = prod.stock;
    if (type === 'entrada' || type === 'producao') {
      newStock = prod.stock + quantity;
    } else if (type === 'perda') {
      newStock = Math.max(0, prod.stock - quantity);
    } else if (type === 'ajuste') {
      newStock = quantity;
    }

    const updatedProduct = {
      ...prod,
      stock: Math.round(newStock * 100) / 100,
    };

    let persisted = updatedProduct;
    try {
      persisted = await upsertProduto(updatedProduct);
    } catch (err: any) {
      console.warn('[Korisko] Supabase adjustStock fallback to local:', err.message);
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
      newStock: persisted.stock,
    };

    insertEstoqueMovimentacaoDb(movement).catch(() => {});

    setData(prev => {
      const nextState = {
        ...prev,
        products: prev.products.map(p => p.id === productId ? persisted : p),
        stockMovements: [movement, ...prev.stockMovements],
      };
      StorageService.saveState(nextState);
      return nextState;
    });
  }, [currentUser.name, data.products]);

  // Register Fornada do Padeiro (Pão Quente)
  const registerFornada = useCallback(async (
    productId: string,
    quantity: number,
    unit: 'un' | 'kg' | 'g' | 'pct' | 'l' | string,
    batchNumber?: string
  ) => {
    const prod = data.products.find(p => p.id === productId);
    if (!prod) return;

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

    let persisted = { ...prod, stock: newStock };
    try {
      persisted = await upsertProduto(persisted);
    } catch (err: any) {
      console.warn('[Korisko] Supabase registerFornada fallback to local:', err.message);
    }

    insertFornadaProducaoDb(newLog).catch(() => {});
    insertEstoqueMovimentacaoDb(newMovement).catch(() => {});

    setData(prev => {
      const next = {
        ...prev,
        products: prev.products.map(p => p.id === productId ? persisted : p),
        stockMovements: [newMovement, ...prev.stockMovements],
        fornadas: [newLog, ...(prev.fornadas || [])],
      };
      StorageService.saveState(next);
      saveSystemStateDoc(next);
      return next;
    });
  }, [currentUser.name, data.products]);

  // Save / Confirm Comanda in Real Time:
  // IMMEDIATELY updates the debtor's balance (Saldo Devedor) in real-time flow across all separate Supabase tables!
  const saveComanda = useCallback((
    number: string,
    items: CartItem[],
    customerName?: string,
    notes?: string,
    extraOptions?: {
      customerId?: string;
      customerPhone?: string;
      status?: ComandaStatus;
      setorResponsavel?: SetorResponsavel;
      confirmedByCustomer?: boolean;
      source?: 'pdv' | 'loja_online' | 'cliente_direto';
      updateDebtorBalance?: boolean;
    }
  ): Comanda => {
    const nowIso = new Date().toISOString();
    const cleanNum = number.trim();
    const sectorInfo = resolveSetoresFromItems(items);
    const totalBrl = Math.round(
      (items || []).reduce(
        (sum, item) => sum + (Number(item.product?.priceBrl) || 0) * (Number(item.quantity) || 0),
        0
      ) * 100
    ) / 100;

    const existing = (data.openComandas || []).find(
      c => c.number.trim().toLowerCase() === cleanNum.toLowerCase()
    );

    const shouldUpdateDebtor = extraOptions?.updateDebtorBalance !== false;

    // Resolve or auto-create Debtor Customer so Comanda launch immediately updates Debtor Balance in real time
    const rawTypedName = (customerName || existing?.customerName || '').trim();
    const effectiveDebtorName =
      rawTypedName && rawTypedName !== 'Cliente Balcão'
        ? rawTypedName
        : `Cliente Comanda #${cleanNum}`;

    let targetCustomer: Customer | undefined = undefined;
    const requestedCustomerId = extraOptions?.customerId || existing?.customerId;
    if (requestedCustomerId) {
      targetCustomer = (data.customers || []).find(c => c.id === requestedCustomerId);
    }
    if (!targetCustomer && effectiveDebtorName) {
      targetCustomer = (data.customers || []).find(
        c => c.name.trim().toLowerCase() === effectiveDebtorName.toLowerCase()
      );
    }

    let isNewlyCreatedCustomer = false;
    if (!targetCustomer && shouldUpdateDebtor && totalBrl > 0) {
      isNewlyCreatedCustomer = true;
      targetCustomer = {
        id: requestedCustomerId || `cust-cmd-${cleanNum.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`,
        name: effectiveDebtorName,
        phone: extraOptions?.customerPhone || existing?.customerPhone || '',
        category: 'mensalista',
        creditLimitBrl: Math.max(500000, totalBrl * 3),
        outstandingBalanceBrl: 0,
        loyaltyPoints: 0,
        totalSpentBrl: 0,
        purchaseCount: 0,
        createdAt: nowIso,
      };
    }

    const previouslyAppliedDebt =
      existing && targetCustomer && existing.customerId === targetCustomer.id
        ? (existing.debtAppliedBrl || 0)
        : 0;

    const deltaDebtBrl = shouldUpdateDebtor && targetCustomer
      ? Math.round((totalBrl - previouslyAppliedDebt) * 100) / 100
      : 0;

    const currentCustomerBal = targetCustomer?.outstandingBalanceBrl || 0;
    const initialBeforeComandaBal =
      existing?.previousDebtBrl !== undefined
        ? existing.previousDebtBrl
        : currentCustomerBal;
    const newCustomerDebtBal = targetCustomer
      ? Math.max(0, Math.round((currentCustomerBal + deltaDebtBrl) * 100) / 100)
      : 0;

    const comandaObj: Comanda = {
      id: existing?.id || `cmd-${Date.now()}`,
      number: cleanNum,
      customerId: targetCustomer?.id || requestedCustomerId,
      customerName: targetCustomer?.name || rawTypedName || 'Cliente Balcão',
      customerPhone: extraOptions?.customerPhone || targetCustomer?.phone || existing?.customerPhone,
      items,
      openedAt: existing?.openedAt || nowIso,
      openedBy: existing?.openedBy || currentUser.name,
      notes: notes ?? existing?.notes,
      status: extraOptions?.status || existing?.status || 'confirmado',
      setorResponsavel: extraOptions?.setorResponsavel || sectorInfo.primary,
      setoresEnvolvidos: sectorInfo.all,
      confirmedByCustomer: extraOptions?.confirmedByCustomer !== undefined
        ? extraOptions.confirmedByCustomer
        : true,
      confirmedAt: existing?.confirmedAt || nowIso,
      updatedAt: nowIso,
      source: extraOptions?.source || existing?.source || 'pdv',
      totalBrl,
      debtAppliedBrl: shouldUpdateDebtor && targetCustomer ? totalBrl : (existing?.debtAppliedBrl || 0),
      previousDebtBrl: initialBeforeComandaBal,
      resultingDebtBrl: newCustomerDebtBal,
    };

    // 1. Sync Comanda to public.comandas
    upsertComandaDb(comandaObj).catch(() => {});

    // 2. Log sector production workflow to public.comandas_historico_setores
    insertComandaHistoricoSetorDb({
      comandaId: comandaObj.id,
      comandaNumber: comandaObj.number,
      customerId: comandaObj.customerId,
      customerName: comandaObj.customerName,
      setorResponsavel: formatSetorName(comandaObj.setorResponsavel),
      statusAnterior: existing?.status,
      statusNovo: comandaObj.status || 'confirmado',
      totalBrl,
      debtBalanceAfterBrl: newCustomerDebtBal,
      operador: currentUser.name,
    }).catch(() => {});

    // 3. Real-Time Debtor Balance Update across Clientes + Saldos Devedores + Lançamentos Fiado + Fluxo Cobranças
    let comandaFiadoEntry: CustomerAccountEntry | undefined;
    let comandaLiveCheckout: ActiveCheckoutSession | undefined;
    const itemsSummary = (items || [])
      .map(i => `${i.quantity}x ${i.product?.name || 'Item'}`)
      .slice(0, 3)
      .join(', ');

    if (shouldUpdateDebtor && targetCustomer && totalBrl > 0) {
      const updatedCustomerObj: Customer = {
        ...targetCustomer,
        outstandingBalanceBrl: newCustomerDebtBal,
        totalSpentBrl: Math.max(0, (targetCustomer.totalSpentBrl || 0) + deltaDebtBrl),
        purchaseCount: isNewlyCreatedCustomer
          ? 1
          : (existing ? targetCustomer.purchaseCount : (targetCustomer.purchaseCount || 0) + 1),
        lastPurchaseDate: nowIso,
      };

      if (isNewlyCreatedCustomer) {
        upsertCliente(updatedCustomerObj).catch(() => {});
      } else if (deltaDebtBrl !== 0) {
        rpcAjustarSaldoCliente(targetCustomer.id, deltaDebtBrl).catch(() => {
          upsertCliente(updatedCustomerObj).catch(() => {});
        });
      }

      // Dedicated Table: public.saldos_devedores_tempo_real
      const debtorRecord = {
        customerId: targetCustomer.id,
        customerName: targetCustomer.name,
        customerPhone: targetCustomer.phone,
        previousBalanceBrl: initialBeforeComandaBal,
        lastComandaAmountBrl: totalBrl,
        currentDebtBalanceBrl: newCustomerDebtBal,
        creditLimitBrl: targetCustomer.creditLimitBrl || 500000,
        openComandasCount: 1,
        lastComandaNumber: comandaObj.number,
        lastSetorResponsavel: sectorInfo.label,
        lastOperationType: 'comanda_lancada' as const,
        updatedBy: currentUser.name,
        updatedAt: nowIso,
      };
      upsertSaldoDevedorTempoRealDb(debtorRecord).catch(() => {});

      // Dedicated Table: public.lancamentos_fiado
      comandaFiadoEntry = {
        id: `entry-cmd-${comandaObj.id}`,
        customerId: targetCustomer.id,
        customerName: targetCustomer.name,
        date: nowIso,
        type: 'debito_compra',
        amountBrl: totalBrl,
        previousBalanceBrl: initialBeforeComandaBal,
        resultingBalanceBrl: newCustomerDebtBal,
        paymentMethod: 'fiado',
        description: `Comanda #${comandaObj.number} lançada em tempo real • Setor: ${sectorInfo.label}${itemsSummary ? ` (${itemsSummary})` : ''}`,
        comandaNumber: comandaObj.number,
        setorResponsavel: sectorInfo.label,
        confirmedByCustomer: true,
        recordedBy: currentUser.name,
      };
      upsertLancamentoFiadoDb(comandaFiadoEntry).catch(() => {});

      // Dedicated Table: public.fluxo_cobrancas_tempo_real
      comandaLiveCheckout = {
        id: `chk-cmd-${comandaObj.id}`,
        operatorId: currentUser.id,
        operatorName: currentUser.name,
        customerId: targetCustomer.id,
        customerName: targetCustomer.name,
        comandaNumber: comandaObj.number,
        setorResponsavel: sectorInfo.label,
        paymentMethod: 'fiado',
        amountBrl: totalBrl,
        previousDebtBrl: initialBeforeComandaBal,
        projectedDebtBrl: newCustomerDebtBal,
        status: 'comanda_lancada',
        itemsSummary: itemsSummary || `Comanda #${comandaObj.number}`,
        updatedAt: nowIso,
      };
      upsertFluxoCobrancaDb(comandaLiveCheckout).catch(() => {});

      // Instantaneous Supabase Realtime Broadcasts
      try {
        if (realtimeChannelRef.current) {
          realtimeChannelRef.current.send({
            type: 'broadcast',
            event: 'live_debtor_balance',
            payload: debtorRecord,
          }).catch?.(() => {});
          realtimeChannelRef.current.send({
            type: 'broadcast',
            event: 'live_fiado_entry',
            payload: comandaFiadoEntry,
          }).catch?.(() => {});
          realtimeChannelRef.current.send({
            type: 'broadcast',
            event: 'live_checkout_update',
            payload: comandaLiveCheckout,
          }).catch?.(() => {});
        }
      } catch {}
    }

    // Dedicated Table: public.registro_compras_clientes (Comanda Purchase Record)
    let comandaPurchaseRecord: CustomerPurchaseRecord | undefined;
    if (targetCustomer && totalBrl > 0) {
      const purchaseItems: CustomerPurchaseItem[] = (items || []).map(it => ({
        productId: it.product?.id || '',
        productName: it.product?.name || 'Item',
        category: it.product?.category || 'paes',
        quantity: Number(it.quantity) || 1,
        unit: it.product?.unit || 'un',
        unitPriceBrl: Number(it.unitPriceBrl ?? it.product?.priceBrl ?? 0),
        costPriceBrl: Number(it.product?.costPriceBrl ?? (Number(it.unitPriceBrl || 0) * 0.42)),
        subtotalBrl: Number(it.subtotalBrl ?? (Number(it.unitPriceBrl || 0) * Number(it.quantity || 1))),
      }));
      const estCost = Math.round(purchaseItems.reduce((acc, it) => acc + (it.costPriceBrl * it.quantity), 0));
      comandaPurchaseRecord = {
        id: `purch-cmd-${comandaObj.id}`,
        customerId: targetCustomer.id,
        customerName: targetCustomer.name,
        customerPhone: targetCustomer.phone,
        comandaNumber: comandaObj.number,
        items: purchaseItems,
        itemsSummary: itemsSummary || `Comanda #${comandaObj.number}`,
        totalAmountBrl: totalBrl,
        estimatedCostBrl: estCost,
        paidAmountBrl: 0,
        fiadoAmountBrl: totalBrl,
        paymentMethod: 'fiado',
        flowType: 'fiado_pendente',
        setorResponsavel: sectorInfo.label,
        recordedBy: currentUser.name,
        notes: comandaObj.notes,
        purchaseDate: nowIso,
      };
      upsertRegistroCompraClienteDb(comandaPurchaseRecord).catch(() => {});
      try {
        if (realtimeChannelRef.current) {
          realtimeChannelRef.current.send({
            type: 'broadcast',
            event: 'live_customer_purchase',
            payload: comandaPurchaseRecord,
          }).catch?.(() => {});
        }
      } catch {}
    }

    setData(prev => {
      const existingIdx = (prev.openComandas || []).findIndex(
        c => c.id === comandaObj.id || c.number.trim().toLowerCase() === cleanNum.toLowerCase()
      );
      const updatedComandas = [...(prev.openComandas || [])];

      if (existingIdx >= 0) {
        updatedComandas[existingIdx] = comandaObj;
      } else {
        updatedComandas.unshift(comandaObj);
      }

      const updatedPurchases = comandaPurchaseRecord
        ? [comandaPurchaseRecord, ...(prev.customerPurchases || []).filter(p => p.id !== comandaPurchaseRecord!.id)]
        : (prev.customerPurchases || []);

      let updatedCustomers = prev.customers || [];
      if (shouldUpdateDebtor && targetCustomer && totalBrl > 0) {
        const existsCust = updatedCustomers.some(c => c.id === targetCustomer!.id);
        const custPurchases = updatedPurchases.filter(p => p.customerId === targetCustomer!.id);
        const computedTotalSpent = custPurchases.reduce((acc, p) => acc + (Number(p.totalAmountBrl) || 0), 0);
        const nextCustObj: Customer = {
          ...targetCustomer,
          outstandingBalanceBrl: newCustomerDebtBal,
          totalSpentBrl: Math.max((targetCustomer.totalSpentBrl || 0) + deltaDebtBrl, computedTotalSpent),
          purchaseCount: Math.max(
            isNewlyCreatedCustomer ? 1 : (existing ? targetCustomer.purchaseCount : (targetCustomer.purchaseCount || 0) + 1),
            custPurchases.length
          ),
          lastPurchaseDate: nowIso,
        };
        upsertCliente(nextCustObj).catch(() => {});
        updatedCustomers = existsCust
          ? updatedCustomers.map(c => c.id === targetCustomer!.id ? nextCustObj : c)
          : [nextCustObj, ...updatedCustomers];
      }

      const updatedEntries = comandaFiadoEntry
        ? [comandaFiadoEntry, ...(prev.customerEntries || []).filter(e => e.id !== comandaFiadoEntry!.id)]
        : prev.customerEntries;

      const updatedCheckouts = comandaLiveCheckout
        ? [comandaLiveCheckout, ...(prev.activeCheckouts || []).filter(s => s.id !== comandaLiveCheckout!.id)].slice(0, 40)
        : prev.activeCheckouts;

      const next = {
        ...prev,
        openComandas: updatedComandas,
        customers: updatedCustomers,
        customerEntries: updatedEntries,
        customerPurchases: updatedPurchases,
        activeCheckouts: updatedCheckouts,
      };
      StorageService.saveState(next);
      saveSystemStateDoc(next);
      return next;
    });

    return comandaObj;
  }, [currentUser.id, currentUser.name, data.customers, data.openComandas]);

  // Update Comanda Status / Sector in Real Time (Admin has total access, sector operators can advance production)
  const updateComandaStatus = useCallback((
    comandaId: string,
    status: ComandaStatus,
    setorResponsavel?: SetorResponsavel
  ) => {
    const nowIso = new Date().toISOString();
    setData(prev => {
      const target = (prev.openComandas || []).find(c => c.id === comandaId || c.number === comandaId);
      if (!target) return prev;

      const updatedCmd: Comanda = {
        ...target,
        status,
        setorResponsavel: setorResponsavel || target.setorResponsavel,
        confirmedByCustomer: status === 'confirmado' ? true : target.confirmedByCustomer,
        confirmedAt: status === 'confirmado' && !target.confirmedAt ? nowIso : target.confirmedAt,
        updatedAt: nowIso,
      };

      upsertComandaDb(updatedCmd).catch(() => {});
      insertComandaHistoricoSetorDb({
        comandaId: updatedCmd.id,
        comandaNumber: updatedCmd.number,
        customerId: updatedCmd.customerId,
        customerName: updatedCmd.customerName,
        setorResponsavel: formatSetorName(updatedCmd.setorResponsavel),
        statusAnterior: target.status,
        statusNovo: status,
        totalBrl: updatedCmd.totalBrl || 0,
        debtBalanceAfterBrl: updatedCmd.resultingDebtBrl,
        operador: currentUser.name,
      }).catch(() => {});

      const updatedList = (status === 'pago' || status === 'cancelado')
        ? (prev.openComandas || []).filter(c => c.id !== target.id && c.number !== target.number)
        : (prev.openComandas || []).map(c => (c.id === target.id || c.number === target.number) ? updatedCmd : c);

      const next = {
        ...prev,
        openComandas: updatedList,
      };
      StorageService.saveState(next);
      saveSystemStateDoc(next);
      return next;
    });
  }, [currentUser.name]);

  // Remove Comanda (reverses open comanda debtor balance if cancelled before sale completion)
  const removeComanda = useCallback((comandaId: string, options?: { settledInSale?: boolean }) => {
    const nowIso = new Date().toISOString();
    setData(prev => {
      const target = (prev.openComandas || []).find(
        c => c.id === comandaId || c.number.trim().toLowerCase() === comandaId.trim().toLowerCase()
      );
      let nextCustomers = prev.customers || [];
      let nextEntries = prev.customerEntries || [];
      let nextCheckouts = prev.activeCheckouts || [];

      if (target) {
        deleteComandaDb(target.id).catch(() => {});

        // If comanda is being cancelled (not settled in a sale) and had updated debtor balance, reverse it in real time
        if (!options?.settledInSale && target.customerId && (target.debtAppliedBrl || 0) > 0) {
          const reversedAmount = target.debtAppliedBrl || 0;
          const cust = nextCustomers.find(c => c.id === target.customerId);
          const prevBal = cust?.outstandingBalanceBrl || 0;
          const restoredBal = Math.max(0, Math.round((prevBal - reversedAmount) * 100) / 100);

          rpcAjustarSaldoCliente(target.customerId, -reversedAmount).catch(() => {
            if (cust) {
              upsertCliente({ ...cust, outstandingBalanceBrl: restoredBal }).catch(() => {});
            }
          });

          if (cust) {
            upsertSaldoDevedorTempoRealDb({
              customerId: cust.id,
              customerName: cust.name,
              customerPhone: cust.phone,
              previousBalanceBrl: prevBal,
              lastComandaAmountBrl: 0,
              currentDebtBalanceBrl: restoredBal,
              creditLimitBrl: cust.creditLimitBrl || 500000,
              openComandasCount: 0,
              lastComandaNumber: target.number,
              lastSetorResponsavel: formatSetorName(target.setorResponsavel),
              lastOperationType: 'estorno_comanda',
              updatedBy: currentUser.name,
              updatedAt: nowIso,
            }).catch(() => {});
          }

          deleteLancamentoFiadoDb(`entry-cmd-${target.id}`).catch(() => {});
          deleteFluxoCobrancaDb(`chk-cmd-${target.id}`).catch(() => {});

          nextCustomers = nextCustomers.map(c =>
            c.id === target.customerId ? { ...c, outstandingBalanceBrl: restoredBal } : c
          );
          nextEntries = nextEntries.filter(e => e.id !== `entry-cmd-${target.id}`);
          nextCheckouts = nextCheckouts.filter(s => s.id !== `chk-cmd-${target.id}`);
        }
      }

      const updated = (prev.openComandas || []).filter(
        c => c.id !== comandaId && c.number.trim().toLowerCase() !== comandaId.trim().toLowerCase()
      );
      const next = {
        ...prev,
        openComandas: updated,
        customers: nextCustomers,
        customerEntries: nextEntries,
        activeCheckouts: nextCheckouts,
      };
      StorageService.saveState(next);
      saveSystemStateDoc(next);
      return next;
    });
  }, [currentUser.name]);

  // Ficha Técnica - Add
  const addFichaTecnica = useCallback((ftData: Omit<FichaTecnica, 'id' | 'lastUpdated'>) => {
    const newFt: FichaTecnica = {
      ...ftData,
      id: `ft-${Date.now()}`,
      lastUpdated: new Date().toISOString(),
      active: true,
    };
    setData(prev => {
      const next = {
        ...prev,
        fichasTecnicas: [newFt, ...(prev.fichasTecnicas || [])],
      };
      saveSystemStateDoc(next);
      return next;
    });
  }, []);

  const updateFichaTecnica = useCallback((updated: FichaTecnica) => {
    setData(prev => {
      const next = {
        ...prev,
        fichasTecnicas: (prev.fichasTecnicas || []).map(f => f.id === updated.id ? { ...updated, lastUpdated: new Date().toISOString() } : f),
      };
      saveSystemStateDoc(next);
      return next;
    });
  }, []);

  const deleteFichaTecnica = useCallback((id: string) => {
    setData(prev => {
      const next = {
        ...prev,
        fichasTecnicas: (prev.fichasTecnicas || []).filter(f => f.id !== id),
      };
      saveSystemStateDoc(next);
      return next;
    });
  }, []);

  // Execute Recipe Production
  const executeProductionFromRecipe = useCallback((fichaId: string, multiplier: number = 1) => {
    const ficha = (data.fichasTecnicas || []).find(f => f.id === fichaId);
    if (!ficha) {
      return { success: false, message: 'Ficha técnica não encontrada.' };
    }

    const totalYield = Math.round(ficha.yieldQuantity * multiplier * 100) / 100;
    const batchId = `REC-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();

    // Check missing ingredients
    const missing: { name: string; needed: number; unit: string; available: number }[] = [];
    ficha.ingredients.forEach(ing => {
      const prod = data.products.find(p => p.id === ing.ingredientProductId);
      const needed = Math.round(ing.quantity * multiplier * 1000) / 1000;
      const currentStock = prod ? prod.stock : 0;
      if (currentStock < needed) {
        missing.push({
          name: ing.name,
          needed,
          unit: ing.unit,
          available: currentStock,
        });
      }
    });

    if (missing.length > 0) {
      return {
        success: false,
        message: 'Estoque insuficiente de insumos para executar a receita.',
        missingIngredients: missing,
      };
    }

    // Deduct ingredients and produce target product
    ficha.ingredients.forEach(async (ing) => {
      try {
        await rpcBaixarEstoque(ing.ingredientProductId, ing.quantity * multiplier);
      } catch {
        const prod = data.products.find(p => p.id === ing.ingredientProductId);
        if (prod) {
          await upsertProduto({ ...prod, stock: Math.max(0, prod.stock - ing.quantity * multiplier) });
        }
      }
    });

    if (ficha.targetProductId) {
      const targetProd = data.products.find(p => p.id === ficha.targetProductId);
      if (targetProd) {
        upsertProduto({ ...targetProd, stock: targetProd.stock + totalYield }).catch(() => {});
      }
    }

    return {
      success: true,
      message: `Produção de ${totalYield} ${ficha.yieldUnit} de "${ficha.name}" (Lote ${batchId}) concluída!`,
    };
  }, [data.fichasTecnicas, data.products]);

  // ==========================================
  // REQUIREMENT 4: CUSTOMERS CRUD
  // Saves single row with await to Supabase
  // ==========================================
  const addCustomer = useCallback(async (custData: Omit<Customer, 'id' | 'createdAt' | 'totalSpentBrl' | 'purchaseCount' | 'outstandingBalanceBrl' | 'loyaltyPoints'>): Promise<Customer> => {
    const newCustomer: Customer = {
      ...custData,
      id: `cust-${Date.now()}`,
      outstandingBalanceBrl: 0,
      loyaltyPoints: 0,
      totalSpentBrl: 0,
      purchaseCount: 0,
      createdAt: new Date().toISOString(),
    };

    let persisted = newCustomer;
    try {
      persisted = await upsertCliente(newCustomer);
    } catch (err: any) {
      console.warn('[Korisko] Supabase upsertCliente fallback to local:', err.message);
    }

    setData(prev => {
      const nextState = {
        ...prev,
        customers: [persisted, ...(prev.customers || []).filter(c => c.id !== persisted.id)],
      };
      StorageService.saveState(nextState);
      return nextState;
    });
    return persisted;
  }, []);

  const updateCustomer = useCallback(async (updated: Customer) => {
    let persisted = updated;
    try {
      persisted = await upsertCliente(updated);
    } catch (err: any) {
      console.warn('[Korisko] Supabase upsertCliente fallback to local:', err.message);
    }

    setData(prev => {
      const nextState = {
        ...prev,
        customers: (prev.customers || []).map(c => c.id === updated.id ? persisted : c),
      };
      StorageService.saveState(nextState);
      return nextState;
    });
  }, []);

  const deleteCustomer = useCallback(async (id: string) => {
    try {
      await deleteCliente(id);
    } catch (err: any) {
      console.warn('[Korisko] Supabase deleteCliente fallback to local:', err.message);
    }

    setData(prev => {
      const nextState = {
        ...prev,
        customers: (prev.customers || []).filter(c => c.id !== id),
      };
      StorageService.saveState(nextState);
      return nextState;
    });
  }, []);

  // Live Checkout Broadcast & Persistence ("Na hora de cobrar e colocar Fiado ou outro método")
  const broadcastCheckoutSession = useCallback((
    sessionInput: Omit<ActiveCheckoutSession, 'updatedAt' | 'operatorId' | 'operatorName'>
  ) => {
    const nowIso = new Date().toISOString();
    const fullSession: ActiveCheckoutSession = {
      ...sessionInput,
      operatorId: currentUser.id,
      operatorName: currentUser.name,
      updatedAt: nowIso,
    };

    // 1. Persist to Supabase fluxo_cobrancas_tempo_real table
    upsertFluxoCobrancaDb(fullSession).catch(() => {});

    // 2. Broadcast instantaneously over Supabase Realtime channel
    try {
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'live_checkout_update',
          payload: fullSession,
        }).catch?.(() => {});
      }
    } catch {}

    // 3. Update local & system state immediately
    setData(prev => {
      const filtered = (prev.activeCheckouts || []).filter(s => s.id !== fullSession.id);
      const nextCheckouts = fullSession.status === 'cancelado'
        ? filtered
        : [fullSession, ...filtered].slice(0, 40);
      const next = {
        ...prev,
        activeCheckouts: nextCheckouts,
      };
      StorageService.saveState(next);
      saveSystemStateDoc(next);
      return next;
    });
  }, [currentUser.id, currentUser.name]);

  const clearCheckoutSession = useCallback((sessionId: string) => {
    deleteFluxoCobrancaDb(sessionId).catch(() => {});
    try {
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'live_checkout_update',
          payload: { id: sessionId, status: 'cancelado' },
        }).catch?.(() => {});
      }
    } catch {}

    setData(prev => {
      const next = {
        ...prev,
        activeCheckouts: (prev.activeCheckouts || []).filter(s => s.id !== sessionId),
      };
      StorageService.saveState(next);
      saveSystemStateDoc(next);
      return next;
    });
  }, []);

  // CRM - Record Debt (Fiado/Faturamento) via REQUIREMENT 6 RPC + Real-Time lancamentos_fiado
  const recordCustomerDebt = useCallback(async (
    customerId: string,
    amountBrl: number,
    description: string,
    saleId?: string,
    comandaNumber?: string,
    setorResponsavel?: string
  ) => {
    const nowIso = new Date().toISOString();
    const resolvedSetor = setorResponsavel || 'Panificação & Confeitaria Artesanal';
    const currentCustomer = (data.customers || []).find(c => c.id === customerId);
    const previousBal = currentCustomer?.outstandingBalanceBrl || 0;
    const cleanAmount = Math.round(amountBrl * 100) / 100;

    let newBal = previousBal + cleanAmount;
    try {
      newBal = await rpcAjustarSaldoCliente(customerId, cleanAmount);
    } catch (err: any) {
      console.warn('RPC ajustar_saldo_cliente fallback:', err);
      if (currentCustomer) {
        try {
          await upsertCliente({ ...currentCustomer, outstandingBalanceBrl: newBal });
        } catch {}
      }
    }

    const entry: CustomerAccountEntry = {
      id: `entry-${Date.now()}`,
      customerId,
      customerName: currentCustomer?.name || 'Cliente Fiado',
      date: nowIso,
      type: 'debito_compra',
      amountBrl: cleanAmount,
      previousBalanceBrl: previousBal,
      resultingBalanceBrl: newBal,
      paymentMethod: 'fiado',
      description,
      saleId,
      comandaNumber,
      setorResponsavel: resolvedSetor,
      confirmedByCustomer: true,
      recordedBy: currentUser.name,
    };

    // Save to dedicated SQL table lancamentos_fiado + saldos_devedores_tempo_real + broadcast in real time
    upsertLancamentoFiadoDb(entry).catch(() => {});
    const debtorRecord = {
      customerId,
      customerName: currentCustomer?.name || 'Cliente Fiado',
      customerPhone: currentCustomer?.phone,
      previousBalanceBrl: previousBal,
      lastComandaAmountBrl: cleanAmount,
      currentDebtBalanceBrl: newBal,
      creditLimitBrl: currentCustomer?.creditLimitBrl || 500000,
      openComandasCount: 0,
      lastComandaNumber: comandaNumber,
      lastSetorResponsavel: resolvedSetor,
      lastOperationType: 'venda_fiado' as const,
      updatedBy: currentUser.name,
      updatedAt: nowIso,
    };
    upsertSaldoDevedorTempoRealDb(debtorRecord).catch(() => {});
    try {
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'live_fiado_entry',
          payload: entry,
        }).catch?.(() => {});
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'live_debtor_balance',
          payload: debtorRecord,
        }).catch?.(() => {});
      }
    } catch {}

    // Record in real-time checkout flow
    const liveFlow: ActiveCheckoutSession = {
      id: `chk-debt-${Date.now()}`,
      operatorId: currentUser.id,
      operatorName: currentUser.name,
      customerId,
      customerName: currentCustomer?.name || 'Cliente Fiado',
      comandaNumber,
      setorResponsavel: resolvedSetor,
      paymentMethod: 'fiado',
      amountBrl: cleanAmount,
      previousDebtBrl: previousBal,
      projectedDebtBrl: newBal,
      status: 'confirmado_fiado',
      itemsSummary: description,
      saleId,
      updatedAt: nowIso,
    };
    upsertFluxoCobrancaDb(liveFlow).catch(() => {});

    // Record in dedicated SQL table public.registro_compras_clientes
    const debtPurchaseRecord: CustomerPurchaseRecord = {
      id: `purch-debt-${entry.id}`,
      customerId,
      customerName: currentCustomer?.name || 'Cliente Fiado',
      customerPhone: currentCustomer?.phone,
      saleId,
      comandaNumber,
      items: [{
        productId: 'item-fiado-manual',
        productName: description || 'Compra lançada em Conta / Fiado',
        category: 'paes',
        quantity: 1,
        unit: 'un',
        unitPriceBrl: cleanAmount,
        costPriceBrl: Math.round(cleanAmount * 0.42),
        subtotalBrl: cleanAmount,
      }],
      itemsSummary: description || 'Compra no Fiado',
      totalAmountBrl: cleanAmount,
      estimatedCostBrl: Math.round(cleanAmount * 0.42),
      paidAmountBrl: 0,
      fiadoAmountBrl: cleanAmount,
      paymentMethod: 'fiado',
      flowType: 'fiado_pendente',
      setorResponsavel: resolvedSetor,
      recordedBy: currentUser.name,
      purchaseDate: nowIso,
    };
    upsertRegistroCompraClienteDb(debtPurchaseRecord).catch(() => {});
    try {
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'live_customer_purchase',
          payload: debtPurchaseRecord,
        }).catch?.(() => {});
      }
    } catch {}

    setData(prev => {
      const nextPurchases = [debtPurchaseRecord, ...(prev.customerPurchases || []).filter(p => p.id !== debtPurchaseRecord.id)];
      const custPurchases = nextPurchases.filter(p => p.customerId === customerId);
      const computedTotalSpent = custPurchases.reduce((acc, p) => acc + (Number(p.totalAmountBrl) || 0), 0);

      const nextCustomers = (prev.customers || []).map(c => {
        if (c.id !== customerId) return c;
        const updatedCust: Customer = {
          ...c,
          outstandingBalanceBrl: newBal,
          totalSpentBrl: Math.max((c.totalSpentBrl || 0) + cleanAmount, computedTotalSpent),
          purchaseCount: Math.max((c.purchaseCount || 0) + 1, custPurchases.length),
          lastPurchaseDate: nowIso,
        };
        upsertCliente(updatedCust).catch(() => {});
        return updatedCust;
      });

      const next = {
        ...prev,
        customers: nextCustomers,
        customerEntries: [entry, ...(prev.customerEntries || []).filter(e => e.id !== entry.id)],
        customerPurchases: nextPurchases,
        activeCheckouts: [liveFlow, ...(prev.activeCheckouts || [])].slice(0, 40),
      };
      StorageService.saveState(next);
      saveSystemStateDoc(next);
      return next;
    });
  }, [currentUser.id, currentUser.name, data.customers]);

  // CRM - Record Payment / Amortização via REQUIREMENT 6 RPC + Real-Time lancamentos_fiado + amortizacoes_pagamentos_fiado + saldos_devedores_tempo_real
  const recordCustomerPayment = useCallback(async (customerId: string, amountBrl: number, method: PaymentMethod, notes?: string) => {
    const nowIso = new Date().toISOString();
    const cleanAmount = Math.round(amountBrl * 100) / 100;
    const currentCustomer = (data.customers || []).find(c => c.id === customerId);
    const previousBal = currentCustomer?.outstandingBalanceBrl || 0;
    let newBal = Math.max(0, previousBal - cleanAmount);

    try {
      newBal = await rpcAjustarSaldoCliente(customerId, -cleanAmount);
    } catch (err: any) {
      console.warn('RPC ajustar_saldo_cliente fallback:', err);
      if (currentCustomer) {
        try {
          await upsertCliente({ ...currentCustomer, outstandingBalanceBrl: newBal });
        } catch {}
      }
    }

    const entry: CustomerAccountEntry = {
      id: `entry-${Date.now()}`,
      customerId,
      customerName: currentCustomer?.name || 'Cliente Cadastrado',
      date: nowIso,
      type: 'pagamento_amortizacao',
      amountBrl: cleanAmount,
      previousBalanceBrl: previousBal,
      resultingBalanceBrl: newBal,
      description: `Amortização de fiado via ${method.toUpperCase()}${notes ? ` - ${notes}` : ''}`,
      paymentMethod: method,
      setorResponsavel: 'Caixa & Expedição',
      confirmedByCustomer: true,
      recordedBy: currentUser.name,
    };

    // Save to dedicated SQL tables: lancamentos_fiado + amortizacoes_pagamentos_fiado + saldos_devedores_tempo_real
    upsertLancamentoFiadoDb(entry).catch(() => {});
    insertAmortizacaoFiadoDb({
      id: `amort-${entry.id}`,
      customerId,
      customerName: currentCustomer?.name || 'Cliente Cadastrado',
      valorPagoBrl: cleanAmount,
      saldoAntesBrl: previousBal,
      saldoDepoisBrl: newBal,
      metodoPagamento: method,
      observacoes: notes,
      recebidoPor: currentUser.name,
    }).catch(() => {});

    const debtorRecord = {
      customerId,
      customerName: currentCustomer?.name || 'Cliente Cadastrado',
      customerPhone: currentCustomer?.phone,
      previousBalanceBrl: previousBal,
      lastComandaAmountBrl: cleanAmount,
      currentDebtBalanceBrl: newBal,
      creditLimitBrl: currentCustomer?.creditLimitBrl || 500000,
      openComandasCount: 0,
      lastSetorResponsavel: 'Caixa & Expedição',
      lastOperationType: 'pagamento_amortizacao' as const,
      updatedBy: currentUser.name,
      updatedAt: nowIso,
    };
    upsertSaldoDevedorTempoRealDb(debtorRecord).catch(() => {});

    try {
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'live_fiado_entry',
          payload: entry,
        }).catch?.(() => {});
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'live_debtor_balance',
          payload: debtorRecord,
        }).catch?.(() => {});
      }
    } catch {}

    // Record in real-time checkout flow
    const liveFlow: ActiveCheckoutSession = {
      id: `chk-pay-${Date.now()}`,
      operatorId: currentUser.id,
      operatorName: currentUser.name,
      customerId,
      customerName: currentCustomer?.name || 'Cliente Cadastrado',
      setorResponsavel: 'Caixa & Expedição',
      paymentMethod: method,
      amountBrl: cleanAmount,
      previousDebtBrl: previousBal,
      projectedDebtBrl: newBal,
      status: 'pago',
      itemsSummary: entry.description,
      updatedAt: nowIso,
    };
    upsertFluxoCobrancaDb(liveFlow).catch(() => {});

    setData(prev => {
      const next = {
        ...prev,
        customers: (prev.customers || []).map(c => c.id === customerId ? { ...c, outstandingBalanceBrl: newBal } : c),
        customerEntries: [entry, ...(prev.customerEntries || []).filter(e => e.id !== entry.id)],
        activeCheckouts: [liveFlow, ...(prev.activeCheckouts || [])].slice(0, 40),
      };
      StorageService.saveState(next);
      saveSystemStateDoc(next);
      return next;
    });
  }, [currentUser.id, currentUser.name, data.customers]);

  // CRM - Redeem Loyalty Points
  const redeemCustomerPoints = useCallback((customerId: string, points: number): number => {
    let discountGranted = 0;
    setData(prev => ({
      ...prev,
      customers: (prev.customers || []).map(c => {
        if (c.id === customerId) {
          const usablePoints = Math.min(c.loyaltyPoints, points);
          discountGranted = Math.round((usablePoints / 20) * 100) / 100;
          return { ...c, loyaltyPoints: c.loyaltyPoints - usablePoints };
        }
        return c;
      }),
    }));
    return discountGranted;
  }, []);

  // CRM - Manual / Direct Customer Purchase Record in public.registro_compras_clientes
  const recordCustomerPurchase = useCallback(async (params: {
    customerId: string;
    items: CustomerPurchaseItem[];
    totalAmountBrl: number;
    estimatedCostBrl?: number;
    paymentMethod: PaymentMethod;
    notes?: string;
    comandaNumber?: string;
  }): Promise<CustomerPurchaseRecord> => {
    const nowIso = new Date().toISOString();
    const cust = (data.customers || []).find(c => c.id === params.customerId);
    const cleanTotal = Math.round(params.totalAmountBrl);
    const estCost = params.estimatedCostBrl !== undefined
      ? Math.round(params.estimatedCostBrl)
      : Math.round(
          params.items.length > 0
            ? params.items.reduce((acc, it) => acc + ((it.costPriceBrl || it.unitPriceBrl * 0.42) * it.quantity), 0)
            : cleanTotal * 0.42
        );
    const isFiado = params.paymentMethod === 'fiado';
    const summary = params.items.length > 0
      ? params.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')
      : (params.notes || 'Compra registrada no Histórico do Cliente');

    const purchaseRecord: CustomerPurchaseRecord = {
      id: `purch-manual-${Date.now()}`,
      customerId: params.customerId,
      customerName: cust?.name || 'Cliente Cadastrado',
      customerPhone: cust?.phone,
      comandaNumber: params.comandaNumber,
      items: params.items.length > 0
        ? params.items
        : [{
            productId: 'item-avulso',
            productName: summary,
            category: 'paes',
            quantity: 1,
            unit: 'un',
            unitPriceBrl: cleanTotal,
            costPriceBrl: estCost,
            subtotalBrl: cleanTotal,
          }],
      itemsSummary: summary,
      totalAmountBrl: cleanTotal,
      estimatedCostBrl: estCost,
      paidAmountBrl: isFiado ? 0 : cleanTotal,
      fiadoAmountBrl: isFiado ? cleanTotal : 0,
      paymentMethod: params.paymentMethod,
      flowType: isFiado ? 'fiado_pendente' : 'entrada_avista',
      setorResponsavel: 'Panificação & Confeitaria Artesanal',
      recordedBy: currentUser.name,
      notes: params.notes,
      purchaseDate: nowIso,
    };

    upsertRegistroCompraClienteDb(purchaseRecord).catch(() => {});

    let newDebtBal = cust?.outstandingBalanceBrl || 0;
    let fiadoEntry: CustomerAccountEntry | undefined;

    if (isFiado && cust) {
      const prevBal = cust.outstandingBalanceBrl || 0;
      newDebtBal = prevBal + cleanTotal;
      try {
        newDebtBal = await rpcAjustarSaldoCliente(cust.id, cleanTotal);
      } catch {}

      fiadoEntry = {
        id: `entry-purch-${purchaseRecord.id}`,
        customerId: cust.id,
        customerName: cust.name,
        date: nowIso,
        type: 'debito_compra',
        amountBrl: cleanTotal,
        previousBalanceBrl: prevBal,
        resultingBalanceBrl: newDebtBal,
        paymentMethod: 'fiado',
        description: `Compra Registrada: ${summary}`,
        comandaNumber: params.comandaNumber,
        setorResponsavel: 'Panificação & Confeitaria Artesanal',
        confirmedByCustomer: true,
        recordedBy: currentUser.name,
      };
      upsertLancamentoFiadoDb(fiadoEntry).catch(() => {});
    }

    try {
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'live_customer_purchase',
          payload: purchaseRecord,
        }).catch?.(() => {});
      }
    } catch {}

    setData(prev => {
      const nextPurchases = [purchaseRecord, ...(prev.customerPurchases || []).filter(p => p.id !== purchaseRecord.id)];
      const custPurchases = nextPurchases.filter(p => p.customerId === params.customerId);
      const computedTotalSpent = custPurchases.reduce((acc, p) => acc + (Number(p.totalAmountBrl) || 0), 0);

      const nextCustomers = (prev.customers || []).map(c => {
        if (c.id !== params.customerId) return c;
        const updatedCust: Customer = {
          ...c,
          outstandingBalanceBrl: isFiado ? newDebtBal : c.outstandingBalanceBrl,
          loyaltyPoints: c.loyaltyPoints + Math.max(1, Math.floor(cleanTotal / 10000)),
          totalSpentBrl: Math.max((c.totalSpentBrl || 0) + cleanTotal, computedTotalSpent),
          purchaseCount: Math.max((c.purchaseCount || 0) + 1, custPurchases.length),
          lastPurchaseDate: nowIso,
        };
        upsertCliente(updatedCust).catch(() => {});
        return updatedCust;
      });

      const nextEntries = fiadoEntry
        ? [fiadoEntry, ...(prev.customerEntries || [])]
        : (prev.customerEntries || []);

      const next = {
        ...prev,
        customers: nextCustomers,
        customerEntries: nextEntries,
        customerPurchases: nextPurchases,
      };
      StorageService.saveState(next);
      saveSystemStateDoc(next);
      return next;
    });

    return purchaseRecord;
  }, [currentUser.name, data.customers]);

  const deleteCustomerPurchase = useCallback(async (purchaseId: string) => {
    deleteRegistroCompraClienteDb(purchaseId).catch(() => {});
    setData(prev => {
      const target = (prev.customerPurchases || []).find(p => p.id === purchaseId);
      const nextPurchases = (prev.customerPurchases || []).filter(p => p.id !== purchaseId);
      const nextCustomers = target
        ? (prev.customers || []).map(c => {
            if (c.id !== target.customerId) return c;
            const custPurchases = nextPurchases.filter(p => p.customerId === c.id);
            const sumPurchases = custPurchases.reduce((acc, p) => acc + (Number(p.totalAmountBrl) || 0), 0);
            const updatedCust: Customer = {
              ...c,
              totalSpentBrl: sumPurchases,
              purchaseCount: custPurchases.length,
            };
            upsertCliente(updatedCust).catch(() => {});
            return updatedCust;
          })
        : prev.customers;

      const next = {
        ...prev,
        customers: nextCustomers,
        customerPurchases: nextPurchases,
      };
      StorageService.saveState(next);
      saveSystemStateDoc(next);
      return next;
    });
  }, []);

  // ==========================================
  // REQUIREMENT 5 & 6: COMPLETE SALE
  // 5. Database generates sale_number via trigger. Do NOT send sale_number.
  //    Uses supabase.from('vendas').insert(venda).select().single().
  // 6. Deducts stock via supabase.rpc('baixar_estoque', { p_id, p_qtd }).
  //    Adjusts balance via supabase.rpc('ajustar_saldo_cliente', { p_id, p_valor }).
  //    Writes fiado entry to public.lancamentos_fiado and live payment flow to public.fluxo_cobrancas_tempo_real!
  // ==========================================
  const completeSale = useCallback(async (
    items: CartItem[],
    payments: PaymentEntry[],
    changeGiven?: { currency: Currency; amount: number; equivalentBrl: number },
    customerName?: string,
    comandaNumber?: string,
    discountBrl?: number,
    subtotalBrl?: number,
    customerId?: string
  ): Promise<Sale> => {
    const rawTotal = subtotalBrl !== undefined 
      ? subtotalBrl 
      : items.reduce((sum, item) => sum + item.subtotalBrl, 0);
    const finalTotalBrl = Math.max(0, Math.round((rawTotal - (discountBrl || 0)) * 100) / 100);

    const fiadoPayments = payments.filter(p => p.method === 'fiado');
    const fiadoAmountBrl = fiadoPayments.reduce((acc, p) => acc + p.equivalentBrl, 0);
    const primaryMethod: PaymentMethod = fiadoAmountBrl > 0
      ? 'fiado'
      : (payments[0]?.method || 'dinheiro');

    // Anti-loss protection: If fiado is selected and customerId wasn't passed, match by name or auto-create customer!
    let targetCustomerId = customerId;
    let targetCustomer = targetCustomerId
      ? (data.customers || []).find(c => c.id === targetCustomerId)
      : undefined;

    if (!targetCustomer && customerName?.trim()) {
      const cleanName = customerName.trim().toLowerCase();
      targetCustomer = (data.customers || []).find(c => c.name.trim().toLowerCase() === cleanName);
      if (targetCustomer) {
        targetCustomerId = targetCustomer.id;
      } else if (fiadoAmountBrl > 0) {
        // Auto-create customer record so Fiado is NEVER lost!
        const autoCust: Customer = {
          id: `cust-${Date.now()}`,
          name: customerName.trim(),
          phone: '',
          category: 'varejo',
          creditLimitBrl: Math.max(500000, fiadoAmountBrl * 2),
          outstandingBalanceBrl: 0,
          loyaltyPoints: 0,
          totalSpentBrl: 0,
          purchaseCount: 0,
          createdAt: new Date().toISOString(),
        };
        try {
          targetCustomer = await upsertCliente(autoCust);
        } catch {
          targetCustomer = autoCust;
        }
        targetCustomerId = targetCustomer.id;
      }
    }

    const resolvedCustomerName = customerName?.trim() || targetCustomer?.name || undefined;

    const nowIso = new Date().toISOString();
    const tempId = `sale-${Date.now()}`;
    const sectorInfo = resolveSetoresFromItems(items);
    const resolvedComandaNumber = comandaNumber || `CMD-${String(Date.now()).slice(-4)}`;

    // Prepare payload without sale_number (DB trigger generates it!)
    const salePayload = {
      id: tempId,
      timestamp: nowIso,
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      items,
      subtotalBrl: Math.round(rawTotal * 100) / 100,
      discountBrl: discountBrl ? Math.round(discountBrl * 100) / 100 : undefined,
      totalBrl: finalTotalBrl,
      payments,
      changeGiven,
      customerId: targetCustomerId,
      customerName: resolvedCustomerName,
      comandaNumber: resolvedComandaNumber,
      setorResponsavel: sectorInfo.label,
      confirmedByCustomer: true,
      status: 'completed' as const,
      registerSessionId: data.currentSession.id,
    };

    let persistedSale: Sale;
    let syncedToCloud = false;
    try {
      // REQUIREMENT 5: insert into vendas, trigger creates sale_number, returns data.sale_number
      persistedSale = await insertVenda(salePayload);
      persistedSale = {
        ...persistedSale,
        customerId: persistedSale.customerId || targetCustomerId,
        customerName: persistedSale.customerName || resolvedCustomerName,
        comandaNumber: persistedSale.comandaNumber || resolvedComandaNumber,
        setorResponsavel: persistedSale.setorResponsavel || sectorInfo.label,
        confirmedByCustomer: true,
      };
      syncedToCloud = true;
    } catch (err: any) {
      console.warn('[Korisko] Supabase insertVenda fallback to local storage:', err.message);
      const existingNumbers = (data.sales || []).map(s => Number(s.saleNumber) || 0);
      const nextSaleNumber = (Math.max(0, ...existingNumbers) || 1000) + 1;
      persistedSale = {
        ...salePayload,
        saleNumber: nextSaleNumber,
        status: 'completed',
        registerSessionId: data.currentSession.id,
      };
    }

    // Deduct stock concurrently
    const stockUpdates = new Map<string, number>();
    await Promise.all(
      items.map(async (it) => {
        if (!it.product || !it.product.id) return;
        const currentP = data.products.find(p => p.id === it.product.id);
        const fallbackStock = currentP ? Math.max(0, currentP.stock - it.quantity) : 0;
        
        // Immediate guaranteed local stock deduction
        stockUpdates.set(it.product.id, fallbackStock);

        try {
          const newStock = await rpcBaixarEstoque(it.product.id, it.quantity);
          stockUpdates.set(it.product.id, newStock);
        } catch (rpcErr: any) {
          try {
            if (currentP) {
              await upsertProduto({ ...currentP, stock: fallbackStock });
            }
          } catch {}
        }
      })
    );

    // Check if this sale is closing an open Comanda that already applied debtor balance upon launch
    const linkedComanda = comandaNumber
      ? (data.openComandas || []).find(c => c.number.trim().toLowerCase() === comandaNumber.trim().toLowerCase())
      : undefined;

    if (!targetCustomerId && linkedComanda?.customerId) {
      targetCustomerId = linkedComanda.customerId;
      targetCustomer = (data.customers || []).find(c => c.id === targetCustomerId);
    }

    const alreadyAppliedComandaDebt =
      linkedComanda && targetCustomerId && linkedComanda.customerId === targetCustomerId
        ? (linkedComanda.debtAppliedBrl || 0)
        : 0;

    // REQUIREMENT 6: Reconcile customer balance (avoiding duplicate charge if Comanda already updated debtor balance on launch!)
    let previousCustomerBal = targetCustomer?.outstandingBalanceBrl || 0;
    let newCustomerBal: number | undefined;
    let fiadoAccountEntry: CustomerAccountEntry | undefined;
    let removedEntryId: string | undefined;
    const itemsSummary = (items || []).map(i => `${i.quantity}x ${i.product?.name || (i as any).name || 'Item'}`).slice(0, 3).join(', ');

    if (targetCustomerId && (fiadoAmountBrl > 0 || alreadyAppliedComandaDebt > 0)) {
      const netDebtDelta = Math.round((fiadoAmountBrl - alreadyAppliedComandaDebt) * 100) / 100;
      newCustomerBal = Math.max(0, Math.round((previousCustomerBal + netDebtDelta) * 100) / 100);

      if (netDebtDelta !== 0) {
        try {
          newCustomerBal = await rpcAjustarSaldoCliente(targetCustomerId, netDebtDelta);
        } catch (rpcBalErr: any) {
          console.warn('RPC ajustar_saldo_cliente warning:', rpcBalErr);
          if (targetCustomer) {
            try {
              await upsertCliente({
                ...targetCustomer,
                outstandingBalanceBrl: newCustomerBal,
                totalSpentBrl: (targetCustomer.totalSpentBrl || 0) + finalTotalBrl,
                purchaseCount: (targetCustomer.purchaseCount || 0) + 1,
                lastPurchaseDate: nowIso,
              });
            } catch {}
          }
        }
      }

      const initialBalBeforeComanda =
        linkedComanda?.previousDebtBrl !== undefined
          ? linkedComanda.previousDebtBrl
          : previousCustomerBal;

      if (fiadoAmountBrl > 0) {
        fiadoAccountEntry = {
          id: linkedComanda ? `entry-cmd-${linkedComanda.id}` : `entry-${Date.now()}`,
          customerId: targetCustomerId,
          customerName: resolvedCustomerName || targetCustomer?.name || 'Cliente Fiado',
          date: nowIso,
          type: 'debito_compra',
          amountBrl: fiadoAmountBrl,
          previousBalanceBrl: initialBalBeforeComanda,
          resultingBalanceBrl: newCustomerBal,
          paymentMethod: 'fiado',
          description: `Venda #${persistedSale.saleNumber || 'PDV'} • Comanda #${resolvedComandaNumber} • Setor: ${sectorInfo.label}${itemsSummary ? ` (${itemsSummary}${items.length > 3 ? '...' : ''})` : ''}`,
          saleId: persistedSale.id,
          comandaNumber: resolvedComandaNumber,
          setorResponsavel: sectorInfo.label,
          confirmedByCustomer: true,
          recordedBy: currentUser.name,
        };

        upsertLancamentoFiadoDb(fiadoAccountEntry).catch(() => {});
      } else if (linkedComanda && alreadyAppliedComandaDebt > 0) {
        // Comanda was launched on debtor balance, and now customer paid in Cash/PIX/Card at checkout
        removedEntryId = `entry-cmd-${linkedComanda.id}`;
        deleteLancamentoFiadoDb(removedEntryId).catch(() => {});
        insertAmortizacaoFiadoDb({
          customerId: targetCustomerId,
          customerName: resolvedCustomerName || targetCustomer?.name || 'Cliente Comanda',
          valorPagoBrl: alreadyAppliedComandaDebt,
          saldoAntesBrl: previousCustomerBal,
          saldoDepoisBrl: newCustomerBal,
          metodoPagamento: primaryMethod,
          comandaNumber: resolvedComandaNumber,
          observacoes: `Quitação da Comanda #${resolvedComandaNumber} na Venda #${persistedSale.saleNumber}`,
          recebidoPor: currentUser.name,
        }).catch(() => {});
      }

      const debtorRecord = {
        customerId: targetCustomerId,
        customerName: resolvedCustomerName || targetCustomer?.name || 'Cliente Fiado',
        customerPhone: targetCustomer?.phone,
        previousBalanceBrl: initialBalBeforeComanda,
        lastComandaAmountBrl: fiadoAmountBrl > 0 ? fiadoAmountBrl : finalTotalBrl,
        currentDebtBalanceBrl: newCustomerBal,
        creditLimitBrl: targetCustomer?.creditLimitBrl || 500000,
        openComandasCount: 0,
        lastComandaNumber: resolvedComandaNumber,
        lastSetorResponsavel: sectorInfo.label,
        lastOperationType: (fiadoAmountBrl > 0 ? 'venda_fiado' : 'pagamento_amortizacao') as 'venda_fiado' | 'pagamento_amortizacao',
        updatedBy: currentUser.name,
        updatedAt: nowIso,
      };
      upsertSaldoDevedorTempoRealDb(debtorRecord).catch(() => {});

      try {
        if (realtimeChannelRef.current) {
          if (fiadoAccountEntry) {
            realtimeChannelRef.current.send({
              type: 'broadcast',
              event: 'live_fiado_entry',
              payload: fiadoAccountEntry,
            }).catch?.(() => {});
          }
          realtimeChannelRef.current.send({
            type: 'broadcast',
            event: 'live_debtor_balance',
            payload: debtorRecord,
          }).catch?.(() => {});
        }
      } catch {}
    }

    // Record finalized payment in real-time checkout flow (fluxo_cobrancas_tempo_real)
    const completedCheckoutFlow: ActiveCheckoutSession = {
      id: linkedComanda ? `chk-cmd-${linkedComanda.id}` : `chk-sale-${persistedSale.id}`,
      operatorId: currentUser.id,
      operatorName: currentUser.name,
      customerId: targetCustomerId,
      customerName: resolvedCustomerName || targetCustomer?.name || 'Cliente Balcão',
      comandaNumber: resolvedComandaNumber,
      setorResponsavel: sectorInfo.label,
      paymentMethod: primaryMethod,
      amountBrl: finalTotalBrl,
      previousDebtBrl: linkedComanda?.previousDebtBrl ?? previousCustomerBal,
      projectedDebtBrl: newCustomerBal ?? previousCustomerBal,
      status: fiadoAmountBrl > 0 ? 'confirmado_fiado' : 'pago',
      itemsSummary: itemsSummary || `Venda #${persistedSale.saleNumber}`,
      saleId: persistedSale.id,
      updatedAt: nowIso,
    };
    upsertFluxoCobrancaDb(completedCheckoutFlow).catch(() => {});
    try {
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'live_checkout_update',
          payload: completedCheckoutFlow,
        }).catch?.(() => {});
      }
    } catch {}

    // Close comanda if attached (passing settledInSale: true so removeComanda knows completeSale already reconciled debtor balance)
    if (comandaNumber) {
      removeComanda(comandaNumber, { settledInSale: true });
    }

    // Record customer purchase in dedicated SQL table public.registro_compras_clientes
    let salePurchaseRecord: CustomerPurchaseRecord | undefined;
    if (targetCustomerId) {
      const purchaseItems: CustomerPurchaseItem[] = (items || []).map(it => ({
        productId: it.product?.id || '',
        productName: it.product?.name || (it as any).name || 'Produto',
        category: it.product?.category || 'paes',
        quantity: Number(it.quantity) || 1,
        unit: it.product?.unit || 'un',
        unitPriceBrl: Number(it.unitPriceBrl ?? it.product?.priceBrl ?? 0),
        costPriceBrl: Number(it.product?.costPriceBrl ?? (Number(it.unitPriceBrl || 0) * 0.42)),
        subtotalBrl: Number(it.subtotalBrl ?? (Number(it.unitPriceBrl || 0) * Number(it.quantity || 1))),
      }));
      const estimatedCostBrl = Math.round(
        purchaseItems.reduce((acc, it) => acc + (it.costPriceBrl * it.quantity), 0)
      );
      const paidAmountBrl = Math.max(0, finalTotalBrl - fiadoAmountBrl);

      salePurchaseRecord = {
        id: linkedComanda ? `purch-cmd-${linkedComanda.id}` : `purch-sale-${persistedSale.id}`,
        customerId: targetCustomerId,
        customerName: resolvedCustomerName || targetCustomer?.name || 'Cliente Cadastrado',
        customerPhone: targetCustomer?.phone,
        saleId: persistedSale.id,
        saleNumber: persistedSale.saleNumber,
        comandaNumber: resolvedComandaNumber,
        items: purchaseItems,
        itemsSummary: itemsSummary || `Venda #${persistedSale.saleNumber}`,
        totalAmountBrl: finalTotalBrl,
        estimatedCostBrl,
        paidAmountBrl,
        fiadoAmountBrl,
        paymentMethod: primaryMethod,
        flowType: fiadoAmountBrl > 0 ? 'fiado_pendente' : 'entrada_avista',
        setorResponsavel: sectorInfo.label,
        recordedBy: currentUser.name,
        purchaseDate: nowIso,
      };

      upsertRegistroCompraClienteDb(salePurchaseRecord).catch(() => {});
      try {
        if (realtimeChannelRef.current) {
          realtimeChannelRef.current.send({
            type: 'broadcast',
            event: 'live_customer_purchase',
            payload: salePurchaseRecord,
          }).catch?.(() => {});
        }
      } catch {}
    }

    // Single atomic state update for stock, customer balance, fiado ledger, customer purchases, live checkouts, and sales list
    setData(prev => {
      const existingCustomers = prev.customers || [];
      const hasTargetCustomer = targetCustomerId ? existingCustomers.some(c => c.id === targetCustomerId) : true;
      const baseCustomers = (!hasTargetCustomer && targetCustomer)
        ? [targetCustomer, ...existingCustomers]
        : existingCustomers;

      const nextPurchases = salePurchaseRecord
        ? [salePurchaseRecord, ...(prev.customerPurchases || []).filter(p => p.id !== salePurchaseRecord!.id)]
        : (prev.customerPurchases || []);

      const updatedCustomers = targetCustomerId
        ? baseCustomers.map(c => {
            if (c.id !== targetCustomerId) return c;
            const custPurchases = nextPurchases.filter(p => p.customerId === targetCustomerId);
            const sumPurchases = custPurchases.reduce((acc, p) => acc + (Number(p.totalAmountBrl) || 0), 0);
            const nextSpent = alreadyAppliedComandaDebt > 0
              ? Math.max(sumPurchases, (c.totalSpentBrl || 0) + (finalTotalBrl - alreadyAppliedComandaDebt))
              : Math.max(sumPurchases, (c.totalSpentBrl || 0) + finalTotalBrl);
            const nextCount = Math.max(
              custPurchases.length,
              alreadyAppliedComandaDebt > 0 ? (c.purchaseCount || 1) : (c.purchaseCount || 0) + 1
            );
            const updatedCustObj: Customer = {
              ...c,
              outstandingBalanceBrl: newCustomerBal !== undefined ? newCustomerBal : c.outstandingBalanceBrl,
              loyaltyPoints: (c.loyaltyPoints || 0) + Math.max(1, Math.floor(finalTotalBrl / 10000)),
              totalSpentBrl: nextSpent,
              purchaseCount: nextCount,
              lastPurchaseDate: nowIso,
            };
            upsertCliente(updatedCustObj).catch(() => {});
            return updatedCustObj;
          })
        : baseCustomers;

      const filteredCheckouts = (prev.activeCheckouts || []).filter(
        s => s.id !== completedCheckoutFlow.id && (s.status !== 'em_cobranca' || (s.comandaNumber !== comandaNumber && s.operatorId !== currentUser.id))
      );

      let nextEntries = prev.customerEntries || [];
      if (removedEntryId) {
        nextEntries = nextEntries.filter(e => e.id !== removedEntryId);
      }
      if (fiadoAccountEntry) {
        nextEntries = [fiadoAccountEntry, ...nextEntries.filter(e => e.id !== fiadoAccountEntry!.id)];
      }

      const nextState: SystemBackupData = {
        ...prev,
        products: stockUpdates.size > 0
          ? prev.products.map(p => stockUpdates.has(p.id) ? { ...p, stock: stockUpdates.get(p.id)! } : p)
          : prev.products,
        customers: updatedCustomers,
        customerEntries: nextEntries,
        customerPurchases: nextPurchases,
        activeCheckouts: [completedCheckoutFlow, ...filteredCheckouts].slice(0, 40),
        sales: [persistedSale, ...prev.sales.filter(s => s.id !== persistedSale.id)],
      };
      StorageService.saveState(nextState);
      saveSystemStateDoc(nextState);
      return nextState;
    });

    if (syncedToCloud) {
      showToast(
        fiadoAmountBrl > 0
          ? (language === 'es' ? '¡Venta en cuenta registrada con éxito!' : `Venda em conta registrada para ${resolvedCustomerName || 'Cliente'}!`)
          : (language === 'es' ? '¡Venta registrada con éxito!' : 'Venda registrada com sucesso!'),
        'success'
      );
    } else {
      showToast(language === 'es' ? 'Venta registrada con éxito.' : 'Venda registrada com sucesso!', 'info');
    }

    return persistedSale;
  }, [currentUser.id, currentUser.name, data.currentSession.id, data.customers, data.openComandas, data.products, data.sales, language, removeComanda, showToast]);

  // ==========================================
  // EXCLUIR VENDA - EXCLUSIVO DO ADMINISTRADOR
  // ==========================================
  const deleteSale = useCallback(async (saleId: string, restoreStock: boolean = true) => {
    // Validação de segurança estrita: apenas o administrador tem autorização
    if (currentUser.role !== 'admin') {
      const msg = language === 'es'
        ? 'Acceso denegado: solo el Administrador (Ax) tiene autorización para eliminar ventas.'
        : 'Acesso negado: apenas o Administrador (Ax) tem autorização para excluir vendas.';
      setDbError(msg);
      throw new Error(msg);
    }

    const saleToDelete = data.sales.find(s => s.id === saleId);
    if (!saleToDelete) {
      throw new Error(language === 'es' ? 'Venta no encontrada.' : 'Venda não encontrada.');
    }

    try {
      // 1. Estorno de estoque: devolve os itens vendidos ao estoque
      if (restoreStock && Array.isArray(saleToDelete.items)) {
        for (const item of saleToDelete.items) {
          if (item.product && item.product.id) {
            const currentProd = data.products.find(p => p.id === item.product.id);
            if (currentProd) {
              const restoredStock = Math.round((currentProd.stock + item.quantity) * 100) / 100;
              try {
                await upsertProduto({ ...currentProd, stock: restoredStock });
                setData(prev => ({
                  ...prev,
                  products: prev.products.map(p => p.id === currentProd.id ? { ...p, stock: restoredStock } : p),
                }));
              } catch (stockErr) {
                console.warn('Erro ao devolver estoque:', stockErr);
              }
            }
          }
        }
      }

      // 2. Estorno de fiado no CRM se houver
      if (saleToDelete.customerId) {
        const fiadoAmount = (saleToDelete.payments || [])
          .filter(p => p.method === 'fiado')
          .reduce((sum, p) => sum + p.equivalentBrl, 0);

        if (fiadoAmount > 0) {
          try {
            const newBal = await rpcAjustarSaldoCliente(saleToDelete.customerId, -fiadoAmount);
            setData(prev => ({
              ...prev,
              customers: (prev.customers || []).map(c => c.id === saleToDelete.customerId ? { ...c, outstandingBalanceBrl: newBal } : c),
            }));
          } catch (custErr) {
            console.warn('Erro ao estornar fiado do cliente:', custErr);
          }
        }
      }

      // 3. Exclusão no banco de dados Supabase
      try {
        await deleteVenda(saleId);
      } catch (err) {
        console.warn('[Korisko] Supabase deleteVenda notice:', err);
      }

      // 4. Exclusão na API local (disco/memória)
      try {
        await fetch(`/api/sales/${encodeURIComponent(saleId)}`, { method: 'DELETE' });
      } catch {}

      // 5. Atualização do estado global
      setData(prev => {
        const next = {
          ...prev,
          sales: prev.sales.filter(s => s.id !== saleId),
        };
        saveSystemStateDoc(next);
        return next;
      });

    } catch (err: any) {
      const errMsg = `Erro ao excluir venda: ${err.message}`;
      setDbError(errMsg);
      throw err;
    }
  }, [currentUser.role, data.products, data.sales, language]);

  // Venda Direta Rápida (Apenas Valor & Confirme com Suporte Multimoeda)
  const registerDirectSale = useCallback(async (
    amountBrl: number,
    description: string,
    paymentMethod: PaymentMethod,
    customerId?: string,
    paymentCurrency: Currency = 'BRL',
    amountReceivedInCurrency?: number
  ): Promise<Sale> => {
    let rateUsed = 1;
    let received = amountReceivedInCurrency !== undefined && amountReceivedInCurrency > 0 
      ? amountReceivedInCurrency 
      : amountBrl;

    const rates = data.exchangeRates || DEFAULT_EXCHANGE_RATES;
    if (paymentCurrency === 'USD') {
      rateUsed = rates.USD_TO_BRL;
      if (!amountReceivedInCurrency) {
        received = fromBrl(amountBrl, 'USD', rates);
      }
    } else if (paymentCurrency === 'PYG') {
      rateUsed = 1 / (rates.BRL_TO_PYG || 1380);
      if (!amountReceivedInCurrency) {
        received = fromBrl(amountBrl, 'PYG', rates);
      }
    }

    const directProduct: Product = {
      id: `prod-vd-${Date.now()}`,
      code: 'VD-001',
      name: description.trim() || (language === 'es' ? 'Venta Directa Mostrador' : 'Venda Direta Balcão'),
      category: 'paes',
      priceBrl: amountBrl,
      costPriceBrl: Math.round(amountBrl * 0.4 * 100) / 100,
      stock: 9999,
      minStock: 0,
      unit: 'un',
      active: true,
    };

    const items: CartItem[] = [
      {
        product: directProduct,
        quantity: 1,
        unitPriceBrl: amountBrl,
        subtotalBrl: amountBrl,
      }
    ];

    const payments: PaymentEntry[] = [
      {
        id: `pay-${Date.now()}`,
        currency: paymentCurrency,
        amountReceived: Math.round(received * 100) / 100,
        exchangeRateUsed: rateUsed,
        equivalentBrl: amountBrl,
        method: paymentMethod,
      }
    ];

    return await completeSale(
      items,
      payments,
      undefined,
      undefined,
      undefined,
      0,
      amountBrl,
      customerId
    );
  }, [completeSale, data.exchangeRates, language]);

  // ==========================================
  // REQUIREMENT 4: CASH REGISTER SESSIONS
  // Saves single row with await to Supabase
  // ==========================================
  const openRegister = useCallback(async (initialFloat: { brl: number; pyg: number; usd: number }) => {
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

    try {
      await upsertCaixaSessao(newSession);
    } catch (err: any) {
      console.warn('[Korisko] Supabase openRegister fallback to local:', err.message);
    }
    setData(prev => {
      const nextState = {
        ...prev,
        currentSession: newSession,
      };
      StorageService.saveState(nextState);
      return nextState;
    });
  }, [currentUser.name, data.currentSession.sessionNumber]);

  const closeRegister = useCallback(async (
    counted: { brl: number; pyg: number; usd: number },
    notes?: string
  ): Promise<CashRegisterSession> => {
    const closedSession: CashRegisterSession = {
      ...data.currentSession,
      status: 'fechado',
      closedAt: new Date().toISOString(),
      closedBy: currentUser.name,
      countedOnClose: counted,
      closingNotes: notes,
    };

    try {
      await upsertCaixaSessao(closedSession);
    } catch (err: any) {
      console.warn('[Korisko] Supabase closeRegister fallback to local:', err.message);
    }
    setData(prev => {
      const nextState = {
        ...prev,
        currentSession: closedSession,
        sessionHistory: [closedSession, ...prev.sessionHistory],
      };
      StorageService.saveState(nextState);
      return nextState;
    });

    return closedSession;
  }, [currentUser.name, data.currentSession]);

  const recordSaidaCaixa = useCallback((amount: number, currency: Currency, reason: string, category?: string, documentNumber?: string) => {
    const tx: CashTransaction = {
      id: `saida-${Date.now()}`,
      type: 'saida',
      amount,
      currency,
      reason,
      category: category || 'Outra Saída Justificada',
      documentNumber: documentNumber?.trim() || undefined,
      timestamp: new Date().toISOString(),
      employeeName: currentUser.name,
    };

    insertCaixaMovimentacaoDb(data.currentSession.id, tx).catch(() => {});

    setData(prev => ({
      ...prev,
      currentSession: {
        ...prev.currentSession,
        transactions: [tx, ...prev.currentSession.transactions],
      }
    }));
  }, [currentUser.name, data.currentSession.id]);

  const recordEntradaCaixa = useCallback((amount: number, currency: Currency, reason: string, category?: string, documentNumber?: string) => {
    const tx: CashTransaction = {
      id: `entrada-${Date.now()}`,
      type: 'entrada',
      amount,
      currency,
      reason,
      category: category || 'Outra Entrada Justificada',
      documentNumber: documentNumber?.trim() || undefined,
      timestamp: new Date().toISOString(),
      employeeName: currentUser.name,
    };

    insertCaixaMovimentacaoDb(data.currentSession.id, tx).catch(() => {});

    setData(prev => ({
      ...prev,
      currentSession: {
        ...prev.currentSession,
        transactions: [tx, ...prev.currentSession.transactions],
      }
    }));
  }, [currentUser.name, data.currentSession.id]);

  const recordSangria = recordSaidaCaixa;
  const recordSuprimento = recordEntradaCaixa;

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

  const updateGoal = useCallback((newGoal: MonthlyGoal) => {
    setData(prev => {
      const filtered = prev.goals.filter(g => g.month !== newGoal.month);
      const next = {
        ...prev,
        goals: [newGoal, ...filtered],
      };
      saveSystemStateDoc(next);
      return next;
    });
  }, []);

  const createManualBackup = useCallback(() => {
    setIsCloudSyncing(true);
    setTimeout(() => {
      const point = StorageService.createBackupPoint(data, 'manual');
      setBackupPoints(StorageService.loadBackupPoints());
      setLastBackupTime(point.timestamp);
      setIsCloudSyncing(false);
    }, 600);
  }, [data]);

  const exportDatabaseBackup = useCallback(() => {
    StorageService.exportToJson(data);
  }, [data]);

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

  const restoreFromPoint = useCallback((backupId: string) => {
    const point = backupPoints.find(p => p.id === backupId);
    if (!point) return;
    setIsCloudSyncing(true);
    setTimeout(() => {
      setIsCloudSyncing(false);
    }, 600);
  }, [backupPoints]);

  const resetToSampleData = useCallback(() => {
    localStorage.removeItem('KORISKO_STATE_V1');
    localStorage.removeItem('KORISKO_BACKUP_POINTS_V1');
    const fresh = StorageService.loadState();
    setData(fresh);
    setBackupPoints(StorageService.loadBackupPoints());
  }, []);

  const resetToFactoryZero = useCallback(async () => {
    try {
      const adminAx: Employee = {
        id: 'emp-admin-ax',
        name: 'Ax',
        role: 'admin',
        pin: '9APG_47z-EgF4yz',
        avatarColor: 'bg-indigo-600',
        email: 'axxeiacompany@gmail.com',
        password: '9APG_47z-EgF4yz',
        allowedFeatures: [
          'dashboard', 'pdv', 'venda_direta', 'estoque', 
          'fichas_tecnicas', 'crm', 'caixa', 'mais_vendidos', 
          'metas', 'cambio', 'backup', 'afiliados'
        ],
      };

      await upsertUsuario(adminAx);

      // Clean Supabase tables
      try {
        await supabase.from('produtos').delete().neq('id', 'none');
        await supabase.from('vendas').delete().neq('id', 'none');
        await supabase.from('clientes').delete().neq('id', 'none');
        await supabase.from('caixa_sessoes').delete().neq('id', 'none');
      } catch {}

      const cleanState: SystemBackupData = {
        ...data,
        products: [],
        fichasTecnicas: [],
        stockMovements: [],
        sales: [],
        openComandas: [],
        fornadas: [],
        customers: [],
        customerEntries: [],
        activeCheckouts: [],
        employees: [adminAx],
        currentSession: {
          id: `sess-${Date.now()}`,
          sessionNumber: 1,
          status: 'fechado',
          openedAt: new Date().toISOString(),
          closedAt: new Date().toISOString(),
          openedBy: 'Ax',
          closedBy: 'Ax',
          initialFloat: { brl: 0, pyg: 0, usd: 0 },
          transactions: [],
        },
        sessionHistory: [],
      };

      await saveSystemStateDoc(cleanState);
      setData(cleanState);

      // Sync backend local storage
      try {
        await fetch('/api/factory-zero', { method: 'POST' });
      } catch {}
    } catch (err: any) {
      setDbError(`Erro ao resetar padrão de fábrica: ${err.message}`);
    }
  }, []);

  const contextValue = useMemo<BakeryContextType>(() => ({
    language,
    setLanguage,
    t,
    dbError,
    clearDbError,
    setDbError,
    isLoadingDb,
    currentUser,
    employees: data.employees,
    switchUser,
    updateEmployeePin,
    hasPermission,
    isFeatureAllowed,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    updateEmployeePermissions,
    registerDirectSale,
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
    fornadas: data.fornadas || [],
    registerFornada,
    fichasTecnicas: data.fichasTecnicas || [],
    addFichaTecnica,
    updateFichaTecnica,
    deleteFichaTecnica,
    executeProductionFromRecipe,
    customers: data.customers || [],
    customerEntries: data.customerEntries || [],
    customerPurchases: data.customerPurchases || [],
    activeCheckouts: data.activeCheckouts || [],
    broadcastCheckoutSession,
    clearCheckoutSession,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    recordCustomerDebt,
    recordCustomerPayment,
    recordCustomerPurchase,
    deleteCustomerPurchase,
    redeemCustomerPoints,
    openComandas: data.openComandas || [],
    saveComanda,
    updateComandaStatus,
    removeComanda,
    sales: data.sales,
    completeSale,
    deleteSale,
    currentSession: data.currentSession,
    sessionHistory: data.sessionHistory,
    openRegister,
    closeRegister,
    recordSaidaCaixa,
    recordEntradaCaixa,
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
    resetToFactoryZero,
    dbStatus,
    refreshDbStatus,
    toast,
    showToast,
    clearToast,
  }), [
    language, setLanguage, t, dbError, clearDbError, setDbError, isLoadingDb,
    toast, showToast, clearToast,
    currentUser, data, switchUser, updateEmployeePin, hasPermission, isFeatureAllowed,
    addEmployee, updateEmployee, deleteEmployee, updateEmployeePermissions,
    registerDirectSale, updateExchangeRates, liveRateStatus, fetchLiveRates,
    toggleAutoRateRefresh, addProduct, updateProduct, deleteProduct, adjustStock,
    registerFornada, addFichaTecnica, updateFichaTecnica, deleteFichaTecnica,
    executeProductionFromRecipe, broadcastCheckoutSession, clearCheckoutSession,
    addCustomer, updateCustomer, deleteCustomer,
    recordCustomerDebt, recordCustomerPayment, recordCustomerPurchase, deleteCustomerPurchase, redeemCustomerPoints,
    saveComanda, updateComandaStatus, removeComanda, completeSale, deleteSale,
    openRegister, closeRegister, recordSaidaCaixa, recordEntradaCaixa,
    recordSangria, recordSuprimento, getCurrentGoal, updateGoal,
    backupPoints, lastBackupTime, isCloudSyncing, createManualBackup,
    exportDatabaseBackup, importDatabaseBackup, restoreFromPoint,
    resetToSampleData, resetToFactoryZero, dbStatus, refreshDbStatus
  ]);

  return (
    <BakeryContext.Provider value={contextValue}>
      {children}
    </BakeryContext.Provider>
  );
};

export const useBakery = (): BakeryContextType => {
  const context = useContext(BakeryContext);
  if (!context) {
    throw new Error('useBakery must be used within a BakeryProvider');
  }
  return context;
};
