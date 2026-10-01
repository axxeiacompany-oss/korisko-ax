import { supabase } from './supabase';
import { 
  Product, 
  Customer, 
  Sale, 
  CashRegisterSession, 
  Employee,
  UserRole,
  AppFeature,
  Comanda,
  SetorResponsavel,
  ComandaStatus,
  CartItem,
  CustomerAccountEntry,
  ActiveCheckoutSession,
  PaymentMethod,
  LiveDebtorBalanceRecord,
  StockMovement,
  FornadaLog,
  CashTransaction,
  CustomerPurchaseRecord,
  CustomerPurchaseItem,
  FinancialFlowCategory
} from '../types';

// ==========================================
// HELPERS DE SETOR RESPONSÁVEL (PANIFICAÇÃO, CONFEITARIA, BALCÃO, CAIXA)
// ==========================================

export function getItemSetor(category?: string): SetorResponsavel {
  switch (category) {
    case 'confeitaria':
      return 'confeitaria';
    case 'paes':
    case 'salgados':
      return 'panificacao';
    case 'bebidas':
    case 'frios':
      return 'balcao';
    default:
      return 'panificacao';
  }
}

export function formatSetorName(setor?: SetorResponsavel | string): string {
  switch (setor) {
    case 'panificacao':
      return 'Panificação & Forno';
    case 'confeitaria':
      return 'Confeitaria Artesanal';
    case 'balcao':
      return 'Balcão & Cafeteria';
    case 'caixa':
      return 'Caixa & Expedição';
    case 'todos':
      return 'Panificação & Confeitaria Artesanal';
    default:
      return setor ? String(setor) : 'Panificação & Confeitaria Artesanal';
  }
}

export function resolveSetoresFromItems(items: CartItem[]): {
  primary: SetorResponsavel;
  all: SetorResponsavel[];
  label: string;
} {
  const set = new Set<SetorResponsavel>();
  (items || []).forEach(it => {
    const cat = it.product?.category || (it as any).category;
    set.add(getItemSetor(cat));
  });
  const all = Array.from(set);
  if (all.length === 0) {
    return {
      primary: 'panificacao',
      all: ['panificacao'],
      label: 'Panificação & Confeitaria Artesanal',
    };
  }
  const primary: SetorResponsavel = all.length === 1 ? all[0] : (
    all.includes('confeitaria') && all.includes('panificacao')
      ? 'todos'
      : all[0]
  );
  const label = all.map(s => formatSetorName(s)).join(' + ');
  return { primary, all, label };
}

// ==========================================
// ROW MAPPERS (App Model <-> Supabase DB Row)
// ==========================================

const COMBO_BROWNIES_IMG_URL = new URL('../assets/images/combo_tres_brownies_1790886603094.jpg', import.meta.url).href;
const CUCA_ALEMA_IMG_URL = new URL('../assets/images/cuca_alema_1790871174001.jpg', import.meta.url).href;
const BOLO_PUDIM_IMG_URL = new URL('../assets/images/bolo_pudim_1790871189081.jpg', import.meta.url).href;
const BROWNIE_UNIT_IMG_URL = new URL('../assets/images/brownie_cacau_1790871201216.jpg', import.meta.url).href;

export function resolveProductImageUrl(input: {
  id?: string;
  code?: string;
  name?: string;
  slug?: string;
  imageUrl?: string | null;
}): string | undefined {
  const id = (input.id || '').toLowerCase();
  const code = (input.code || '').toUpperCase();
  const name = (input.name || '').toLowerCase();
  const slug = (input.slug || '').toLowerCase();
  const rawUrl = input.imageUrl || undefined;

  if (
    id === 'prod-combo-brownies' ||
    code === 'CONF-013' ||
    slug.includes('combo-3-brownies') ||
    (name.includes('combo') && name.includes('brownie')) ||
    name.includes('3 brownies') ||
    (rawUrl && rawUrl.includes('combo-brownies')) ||
    (rawUrl && rawUrl.includes('combo_tres_brownies'))
  ) {
    return COMBO_BROWNIES_IMG_URL;
  }

  if (
    id === 'prod-cuca-alema' ||
    code === 'CONF-010' ||
    (name.includes('cuca') && name.includes('alem')) ||
    (rawUrl && rawUrl.includes('cuca-alema'))
  ) {
    return CUCA_ALEMA_IMG_URL;
  }

  if (
    id === 'prod-bolo-pudim' ||
    code === 'CONF-011' ||
    (name.includes('bolo') && name.includes('pudim')) ||
    (rawUrl && rawUrl.includes('bolo-pudim'))
  ) {
    return BOLO_PUDIM_IMG_URL;
  }

  if (
    id === 'prod-brownie-70' ||
    code === 'CONF-012' ||
    (name.includes('brownie') && !name.includes('combo')) ||
    (rawUrl && rawUrl.includes('brownie-70-cacau'))
  ) {
    return BROWNIE_UNIT_IMG_URL;
  }

  return rawUrl;
}

export function productToRow(p: Product) {
  const isComboBrownie =
    p.id === 'prod-combo-brownies' ||
    p.code === 'CONF-013' ||
    (p.name || '').toLowerCase().includes('combo');

  return {
    id: p.id,
    code: p.code || '',
    name: p.name,
    category: p.category || 'paes',
    price_brl: Number(p.priceBrl) || 0,
    cost_price_brl: Number(p.costPriceBrl) || 0,
    stock: Number(p.stock) || 0,
    min_stock: Number(p.minStock) || 0,
    unit: p.unit || 'un',
    active: p.active !== false,
    image_url: isComboBrownie ? '/images/products/combo-brownies.jpg?v=2' : (p.imageUrl || null),
    description: p.description || null,
    slug: p.slug || null,
    compare_at_price: p.compareAtPrice ? Number(p.compareAtPrice) : null,
    featured: Boolean(p.featured),
  };
}

export function rowToProduct(r: any): Product {
  const resolvedImage = resolveProductImageUrl({
    id: String(r.id || ''),
    code: r.code || '',
    name: r.name || '',
    slug: r.slug || '',
    imageUrl: r.image_url,
  });
  return {
    id: String(r.id),
    code: r.code || '',
    name: r.name || '',
    category: r.category || 'paes',
    priceBrl: Number(r.price_brl) || 0,
    costPriceBrl: Number(r.cost_price_brl) || 0,
    stock: Number(r.stock) || 0,
    minStock: Number(r.min_stock) || 0,
    unit: r.unit || 'un',
    active: r.active !== false,
    imageUrl: resolvedImage,
    description: r.description || undefined,
    slug: r.slug || undefined,
    compareAtPrice: r.compare_at_price != null ? Number(r.compare_at_price) : undefined,
    featured: Boolean(r.featured),
  };
}

export function customerToRow(c: Customer) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone || '',
    email: c.email || null,
    credit_limit_brl: Number(c.creditLimitBrl) || 0,
    outstanding_balance_brl: Number(c.outstandingBalanceBrl) || 0,
    loyalty_points: Math.round(Number(c.loyaltyPoints) || 0),
    total_spent_brl: Number(c.totalSpentBrl) || 0,
    purchase_count: Math.round(Number(c.purchaseCount) || 0),
    last_purchase_date: c.lastPurchaseDate || null,
    active: true,
  };
}

export function rowToCustomer(r: any): Customer {
  return {
    id: String(r.id),
    name: r.name || '',
    phone: r.phone || '',
    email: r.email || '',
    documentCpf: r.document_cpf || '',
    address: r.address || '',
    category: r.category || 'varejo',
    creditLimitBrl: Number(r.credit_limit_brl) || 0,
    outstandingBalanceBrl: Number(r.outstanding_balance_brl) || 0,
    loyaltyPoints: Number(r.loyalty_points) || 0,
    birthday: r.birthday || '',
    notes: r.notes || '',
    totalSpentBrl: Number(r.total_spent_brl) || 0,
    purchaseCount: Number(r.purchase_count) || 0,
    lastPurchaseDate: r.last_purchase_date || undefined,
    createdAt: r.created_at || new Date().toISOString(),
  };
}

export function saleToRow(s: Omit<Sale, 'saleNumber'> & { saleNumber?: number }) {
  // REQUIREMENT 5: The database generates sale_number automatically via trigger.
  // DO NOT send sale_number when saving a sale.
  return {
    id: s.id,
    subtotal_brl: Number(s.subtotalBrl ?? s.totalBrl) || 0,
    discount_brl: Number(s.discountBrl ?? 0) || 0,
    total_brl: Number(s.totalBrl) || 0,
    employee_id: s.employeeId || null,
    employee_name: s.employeeName || null,
    customer_id: s.customerId || null,
    customer_name: s.customerName || null,
    items: s.items || [],
    payments: s.payments || [],
    change_given: s.changeGiven || null,
    created_at: s.timestamp || new Date().toISOString(),
  };
}

export function rowToSale(r: any): Sale {
  let saleNum = 0;
  if (typeof r.sale_number === 'number') {
    saleNum = r.sale_number;
  } else if (r.sale_number) {
    const parsed = parseInt(String(r.sale_number), 10);
    saleNum = isNaN(parsed) ? 0 : parsed;
  }

  const itemsList = Array.isArray(r.items) ? r.items : [];
  const resolvedSetor = r.setor_responsavel || resolveSetoresFromItems(itemsList).label;

  return {
    id: String(r.id),
    saleNumber: saleNum,
    timestamp: r.created_at || new Date().toISOString(),
    employeeId: r.employee_id || '',
    employeeName: r.employee_name || '',
    items: itemsList,
    subtotalBrl: Number(r.subtotal_brl) || Number(r.total_brl) || 0,
    discountBrl: Number(r.discount_brl) || 0,
    totalBrl: Number(r.total_brl) || 0,
    payments: Array.isArray(r.payments) ? r.payments : [],
    changeGiven: r.change_given || undefined,
    customerId: r.customer_id || undefined,
    customerName: r.customer_name || undefined,
    comandaNumber: r.comanda_number || undefined,
    setorResponsavel: resolvedSetor,
    confirmedByCustomer: r.confirmed_by_customer !== undefined ? Boolean(r.confirmed_by_customer) : true,
    status: 'completed',
    registerSessionId: '',
  };
}

export function sessionToRow(s: CashRegisterSession) {
  return {
    id: s.id,
    opened_at: s.openedAt || new Date().toISOString(),
    closed_at: s.closedAt || null,
    opened_by_id: s.openedBy || null,
    opened_by_name: s.openedBy || 'Operador',
    initial_cash_brl: Number(s.initialFloat?.brl) || 0,
    status: s.status || 'aberto',
    total_sales_brl: 0,
  };
}

export function rowToSession(r: any): CashRegisterSession {
  return {
    id: String(r.id),
    sessionNumber: 1,
    status: (r.status as 'aberto' | 'fechado') || 'aberto',
    openedAt: r.opened_at || new Date().toISOString(),
    closedAt: r.closed_at || undefined,
    openedBy: r.opened_by_name || 'Operador',
    closedBy: r.closed_at ? (r.opened_by_name || 'Operador') : undefined,
    initialFloat: {
      brl: Number(r.initial_cash_brl) || 0,
      pyg: 0,
      usd: 0,
    },
    transactions: [],
  };
}

export function userToRow(u: Employee) {
  return {
    id: u.id,
    name: u.name,
    email: u.email || null,
    role: u.role || 'caixa',
    password: u.password || u.pin || '',
    pin: u.pin || u.password || '',
    avatar_color: u.avatarColor || 'bg-indigo-600',
    allowed_features: u.allowedFeatures || [],
    active: true,
  };
}

export function rowToUser(r: any): Employee {
  return {
    id: String(r.id),
    name: r.name || '',
    email: r.email || '',
    role: (r.role as UserRole) || 'caixa',
    password: r.password || '',
    pin: r.pin || r.password || '',
    avatarColor: r.avatar_color || 'bg-indigo-600',
    allowedFeatures: Array.isArray(r.allowed_features) ? (r.allowed_features as AppFeature[]) : ['dashboard', 'pdv', 'venda_direta', 'crm'],
    createdAt: r.created_at || new Date().toISOString(),
  };
}

// ==========================================
// PAGINATED FETCHING (1000 rows with .range())
// ==========================================

export async function fetchAllRowsPaged<T>(table: string): Promise<T[]> {
  const PAGE_SIZE = 1000;
  let allRows: T[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const to = from + PAGE_SIZE - 1;
    let timer: any;
    
    try {
      const queryPromise = supabase
        .from(table)
        .select('*')
        .range(from, to);

      const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => {
        timer = setTimeout(() => resolve({ data: null, error: { message: 'Timeout' } }), 4000);
      });

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
      clearTimeout(timer);

      if (error) {
        return allRows;
      }

      if (data && data.length > 0) {
        allRows = allRows.concat(data as T[]);
        if (data.length < PAGE_SIZE) {
          hasMore = false;
        } else {
          from += PAGE_SIZE;
        }
      } else {
        hasMore = false;
      }
    } catch {
      clearTimeout(timer);
      return allRows;
    }
  }

  return allRows;
}

// ==========================================
// DATA ACCESS LAYER: PRODUTOS
// ==========================================

export async function listProdutos(): Promise<Product[]> {
  const rows = await fetchAllRowsPaged<any>('produtos');
  return rows.map(rowToProduct);
}

export async function upsertProduto(p: Product): Promise<Product> {
  const row = productToRow(p);
  const { data, error } = await supabase
    .from('produtos')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    throw new Error(`[Erro ao salvar produto]: ${error.message}`);
  }
  return rowToProduct(data);
}

export async function deleteProduto(id: string): Promise<void> {
  const { error } = await supabase
    .from('produtos')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`[Erro ao excluir produto]: ${error.message}`);
  }
}

// ==========================================
// DATA ACCESS LAYER: CLIENTES
// ==========================================

export async function listClientes(): Promise<Customer[]> {
  const rows = await fetchAllRowsPaged<any>('clientes');
  return rows.map(rowToCustomer);
}

export async function upsertCliente(c: Customer): Promise<Customer> {
  const row = customerToRow(c);
  const { data, error } = await supabase
    .from('clientes')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    // Fallback if total_spent_brl / purchase_count columns were not yet added in user's DB
    const { total_spent_brl, purchase_count, last_purchase_date, ...legacyRow } = row;
    const { data: legacyData, error: legacyError } = await supabase
      .from('clientes')
      .upsert(legacyRow, { onConflict: 'id' })
      .select()
      .single();

    if (legacyError) {
      throw new Error(`[Erro ao salvar cliente]: ${legacyError.message}`);
    }
    return rowToCustomer({
      ...legacyData,
      total_spent_brl,
      purchase_count,
      last_purchase_date,
    });
  }
  return rowToCustomer(data);
}

export async function deleteCliente(id: string): Promise<void> {
  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`[Erro ao excluir cliente]: ${error.message}`);
  }
}

// ==========================================
// DATA ACCESS LAYER: VENDAS
// ==========================================

export async function listVendas(): Promise<Sale[]> {
  const rows = await fetchAllRowsPaged<any>('vendas');
  return rows.map(rowToSale);
}

async function withDbTimeout<T>(promise: Promise<T>, ms = 1500, errorMsg = 'Timeout'): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * REQUIREMENT 5:
 * The database generates sale_number via trigger.
 * Do NOT send sale_number.
 * Uses supabase.from('vendas').insert(venda).select().single()
 * Returns the sale with the generated data.sale_number.
 */
export async function insertVenda(saleData: Omit<Sale, 'saleNumber'>): Promise<Sale> {
  const row = saleToRow(saleData);
  const doInsert = (async () => {
    const { data, error } = await supabase
      .from('vendas')
      .insert(row)
      .select()
      .single();

    if (error) {
      throw new Error(`[Erro ao registrar venda no Supabase]: ${error.message}`);
    }

    return rowToSale(data);
  })();

  return await withDbTimeout(doInsert, 1500, 'Tempo limite ao registrar venda no Supabase');
}

export async function deleteVenda(id: string): Promise<void> {
  const { error } = await supabase
    .from('vendas')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`[Erro ao excluir venda no Supabase]: ${error.message}`);
  }
}

// ==========================================
// DATA ACCESS LAYER: CAIXA SESSOES
// ==========================================

export async function listCaixaSessoes(): Promise<CashRegisterSession[]> {
  const rows = await fetchAllRowsPaged<any>('caixa_sessoes');
  return rows.map(rowToSession);
}

export async function upsertCaixaSessao(s: CashRegisterSession): Promise<CashRegisterSession> {
  const row = sessionToRow(s);
  const { data, error } = await supabase
    .from('caixa_sessoes')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    throw new Error(`[Erro ao salvar sessão de caixa]: ${error.message}`);
  }
  return rowToSession(data);
}

// ==========================================
// DATA ACCESS LAYER: USUARIOS
// ==========================================

export async function listUsuarios(): Promise<Employee[]> {
  const rows = await fetchAllRowsPaged<any>('usuarios');
  return rows.map(rowToUser);
}

export async function upsertUsuario(u: Employee): Promise<Employee> {
  const row = userToRow(u);
  const { data, error } = await supabase
    .from('usuarios')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    throw new Error(`[Erro ao salvar usuário]: ${error.message}`);
  }
  return rowToUser(data);
}

export async function deleteUsuario(id: string): Promise<void> {
  const { error } = await supabase
    .from('usuarios')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`[Erro ao excluir usuário]: ${error.message}`);
  }
}

// ==========================================
// REQUIREMENT 6: RPC ESTOQUE E SALDO
// ==========================================

/**
 * Baixa estoque diretamente no banco de dados via RPC:
 * supabase.rpc('baixar_estoque', { p_id, p_qtd })
 * Retorna o novo estoque retornado pelo banco.
 */
export async function rpcBaixarEstoque(p_id: string, p_qtd: number): Promise<number> {
  const doRpc = (async () => {
    const { data, error } = await supabase.rpc('baixar_estoque', {
      p_id,
      p_qtd: Number(p_qtd),
    });

    if (error) {
      throw new Error(`[RPC baixar_estoque falhou]: ${error.message}`);
    }

    if (typeof data === 'number') {
      return data;
    }
    if (data && typeof data.stock === 'number') {
      return data.stock;
    }
    if (data && typeof data.novo_estoque === 'number') {
      return data.novo_estoque;
    }
    return Number(data) || 0;
  })();

  return await withDbTimeout(doRpc, 1500, 'Tempo limite no RPC baixar_estoque');
}

/**
 * Ajusta saldo do cliente diretamente no banco de dados via RPC:
 * supabase.rpc('ajustar_saldo_cliente', { p_id, p_valor })
 * Retorna o novo saldo retornado pelo banco.
 */
export async function rpcAjustarSaldoCliente(p_id: string, p_valor: number): Promise<number> {
  const doRpc = (async () => {
    const { data, error } = await supabase.rpc('ajustar_saldo_cliente', {
      p_id,
      p_valor: Number(p_valor),
    });

    if (error) {
      throw new Error(`[RPC ajustar_saldo_cliente falhou]: ${error.message}`);
    }

    if (typeof data === 'number') {
      return data;
    }
    if (data && typeof data.outstanding_balance_brl === 'number') {
      return data.outstanding_balance_brl;
    }
    if (data && typeof data.novo_saldo === 'number') {
      return data.novo_saldo;
    }
    return Number(data) || 0;
  })();

  return await withDbTimeout(doRpc, 1500, 'Tempo limite no RPC ajustar_saldo_cliente');
}

// ==========================================
// SYSTEM STATE (korisko_system_state) FOR EXTRA APP STATE
// (comandas, fornadas, fichas técnicas, metas, cotações)
// ==========================================

export async function fetchSystemStateDoc(): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('korisko_system_state')
      .select('data, updated_at')
      .eq('id', 'active_state')
      .maybeSingle();

    if (error || !data) return null;
    return data.data;
  } catch {
    return null;
  }
}

export async function saveSystemStateDoc(extraState: any): Promise<void> {
  try {
    await supabase
      .from('korisko_system_state')
      .upsert({
        id: 'active_state',
        data: extraState,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
  } catch (err) {
    console.warn('[Supabase System State sync]:', err);
  }
}

// ==========================================
// DATA ACCESS LAYER: COMANDAS EM TEMPO REAL
// ==========================================

export function comandaToRow(c: Comanda) {
  const sectorInfo = resolveSetoresFromItems(c.items || []);
  const totalBrl = (c.items || []).reduce(
    (sum, item) => sum + (Number(item.product?.priceBrl) || 0) * (Number(item.quantity) || 0),
    0
  );
  return {
    id: c.id,
    number: c.number,
    customer_id: c.customerId || null,
    customer_name: c.customerName || null,
    customer_phone: c.customerPhone || null,
    items: c.items || [],
    notes: c.notes || null,
    status: c.status || 'confirmado',
    setor_responsavel: c.setorResponsavel || sectorInfo.primary,
    setores_envolvidos: c.setoresEnvolvidos || sectorInfo.all,
    confirmed_by_customer: c.confirmedByCustomer !== undefined ? c.confirmedByCustomer : true,
    confirmed_at: c.confirmedAt || c.openedAt || new Date().toISOString(),
    opened_by: c.openedBy || 'Balcão',
    opened_at: c.openedAt || new Date().toISOString(),
    updated_at: c.updatedAt || new Date().toISOString(),
    total_brl: c.totalBrl ?? totalBrl,
    debt_applied_brl: c.debtAppliedBrl ?? 0,
    previous_debt_brl: c.previousDebtBrl ?? 0,
    resulting_debt_brl: c.resultingDebtBrl ?? 0,
    source: c.source || 'pdv',
  };
}

export function rowToComanda(r: any): Comanda {
  const items: CartItem[] = Array.isArray(r.items) ? r.items : [];
  const sectorInfo = resolveSetoresFromItems(items);
  const computedTotal = Number(r.total_brl) || items.reduce(
    (sum, item) => sum + (Number(item.product?.priceBrl) || 0) * (Number(item.quantity) || 0),
    0
  );
  return {
    id: String(r.id),
    number: String(r.number || ''),
    customerId: r.customer_id || undefined,
    customerName: r.customer_name || undefined,
    customerPhone: r.customer_phone || undefined,
    items,
    openedAt: r.opened_at || r.created_at || new Date().toISOString(),
    openedBy: r.opened_by || 'Cliente / PDV',
    notes: r.notes || undefined,
    status: (r.status as ComandaStatus) || 'confirmado',
    setorResponsavel: (r.setor_responsavel as SetorResponsavel) || sectorInfo.primary,
    setoresEnvolvidos: Array.isArray(r.setores_envolvidos) ? r.setores_envolvidos : sectorInfo.all,
    confirmedByCustomer: r.confirmed_by_customer !== undefined ? Boolean(r.confirmed_by_customer) : true,
    confirmedAt: r.confirmed_at || r.opened_at || new Date().toISOString(),
    updatedAt: r.updated_at || new Date().toISOString(),
    source: r.source || 'pdv',
    totalBrl: computedTotal,
    debtAppliedBrl: r.debt_applied_brl !== undefined ? Number(r.debt_applied_brl) : (r.customer_id ? computedTotal : 0),
    previousDebtBrl: r.previous_debt_brl !== undefined ? Number(r.previous_debt_brl) : undefined,
    resultingDebtBrl: r.resulting_debt_brl !== undefined ? Number(r.resulting_debt_brl) : undefined,
  };
}

export async function listComandas(): Promise<Comanda[]> {
  try {
    const rows = await fetchAllRowsPaged<any>('comandas');
    return rows.map(rowToComanda);
  } catch {
    return [];
  }
}

export async function upsertComandaDb(c: Comanda): Promise<Comanda | null> {
  try {
    const row = comandaToRow(c);
    const { data, error } = await supabase
      .from('comandas')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();
    if (error) {
      // Fallback if extended columns not yet created in user's DB
      const { debt_applied_brl, previous_debt_brl, resulting_debt_brl, ...legacyRow } = row;
      const { data: legacyData } = await supabase
        .from('comandas')
        .upsert(legacyRow, { onConflict: 'id' })
        .select()
        .single();
      return legacyData ? rowToComanda({ ...legacyData, debt_applied_brl, previous_debt_brl, resulting_debt_brl }) : null;
    }
    if (!data) return null;
    return rowToComanda(data);
  } catch {
    return null;
  }
}

export async function deleteComandaDb(id: string): Promise<void> {
  try {
    await supabase.from('comandas').delete().eq('id', id);
  } catch {
    // fallback handled by korisko_system_state
  }
}

// ==========================================
// DATA ACCESS LAYER: LANCAMENTOS FIADO & CONTA CORRENTE EM TEMPO REAL
// Tabela: public.lancamentos_fiado
// ==========================================

export function fiadoEntryToRow(e: CustomerAccountEntry) {
  return {
    id: e.id,
    customer_id: e.customerId,
    customer_name: e.customerName || 'Cliente Cadastrado',
    type: e.type || 'debito_compra',
    amount_brl: Number(e.amountBrl) || 0,
    previous_balance_brl: Number(e.previousBalanceBrl ?? 0),
    resulting_balance_brl: Number(e.resultingBalanceBrl ?? e.runningBalanceBrl ?? 0),
    payment_method: e.paymentMethod || (e.type === 'debito_compra' ? 'fiado' : 'dinheiro'),
    description: e.description || 'Lançamento em Conta Corrente / Fiado',
    sale_id: e.saleId || null,
    comanda_number: e.comandaNumber || null,
    setor_responsavel: e.setorResponsavel || 'Panificação & Confeitaria Artesanal',
    confirmed_by_customer: e.confirmedByCustomer !== undefined ? e.confirmedByCustomer : true,
    recorded_by: e.recordedBy || 'Caixa',
    date: e.date || new Date().toISOString(),
  };
}

export function rowToFiadoEntry(r: any): CustomerAccountEntry {
  return {
    id: String(r.id),
    customerId: String(r.customer_id || ''),
    customerName: r.customer_name || undefined,
    date: r.date || r.created_at || new Date().toISOString(),
    type: r.type === 'pagamento_amortizacao' ? 'pagamento_amortizacao' : 'debito_compra',
    amountBrl: Number(r.amount_brl) || 0,
    previousBalanceBrl: r.previous_balance_brl !== undefined ? Number(r.previous_balance_brl) : undefined,
    resultingBalanceBrl: r.resulting_balance_brl !== undefined ? Number(r.resulting_balance_brl) : undefined,
    runningBalanceBrl: r.resulting_balance_brl !== undefined ? Number(r.resulting_balance_brl) : undefined,
    paymentMethod: r.payment_method || (r.type === 'debito_compra' ? 'fiado' : 'dinheiro'),
    description: String(r.description || ''),
    saleId: r.sale_id || undefined,
    comandaNumber: r.comanda_number || undefined,
    setorResponsavel: r.setor_responsavel || 'Panificação & Confeitaria Artesanal',
    confirmedByCustomer: r.confirmed_by_customer !== undefined ? Boolean(r.confirmed_by_customer) : true,
    recordedBy: String(r.recorded_by || 'Caixa'),
  };
}

export async function listLancamentosFiado(): Promise<CustomerAccountEntry[]> {
  try {
    const rows = await fetchAllRowsPaged<any>('lancamentos_fiado');
    return rows
      .map(rowToFiadoEntry)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch {
    return [];
  }
}

export async function upsertLancamentoFiadoDb(e: CustomerAccountEntry): Promise<CustomerAccountEntry | null> {
  try {
    const row = fiadoEntryToRow(e);
    const { data, error } = await supabase
      .from('lancamentos_fiado')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();
    if (error || !data) return null;
    return rowToFiadoEntry(data);
  } catch {
    return null;
  }
}

export async function deleteLancamentoFiadoDb(id: string): Promise<void> {
  try {
    await supabase.from('lancamentos_fiado').delete().eq('id', id);
  } catch {}
}

// ==========================================
// DATA ACCESS LAYER: FLUXO DE COBRANÇAS E PAGAMENTOS EM TEMPO REAL
// Tabela: public.fluxo_cobrancas_tempo_real
// ==========================================

export function checkoutSessionToRow(s: ActiveCheckoutSession) {
  return {
    id: s.id,
    operator_id: s.operatorId || 'emp-admin-ax',
    operator_name: s.operatorName || 'Operador',
    customer_id: s.customerId || null,
    customer_name: s.customerName || 'Cliente Balcão',
    comanda_number: s.comandaNumber || null,
    setor_responsavel: s.setorResponsavel || 'Panificação & Confeitaria Artesanal',
    payment_method: s.paymentMethod || 'dinheiro',
    amount_brl: Number(s.amountBrl) || 0,
    previous_debt_brl: Number(s.previousDebtBrl || 0),
    projected_debt_brl: Number(s.projectedDebtBrl || 0),
    status: s.status || 'em_cobranca',
    items_summary: s.itemsSummary || null,
    sale_id: s.saleId || null,
    updated_at: s.updatedAt || new Date().toISOString(),
  };
}

export function rowToCheckoutSession(r: any): ActiveCheckoutSession {
  return {
    id: String(r.id),
    operatorId: String(r.operator_id || ''),
    operatorName: String(r.operator_name || 'Operador'),
    customerId: r.customer_id || undefined,
    customerName: String(r.customer_name || 'Cliente Balcão'),
    comandaNumber: r.comanda_number || undefined,
    setorResponsavel: r.setor_responsavel || 'Panificação & Confeitaria Artesanal',
    paymentMethod: (r.payment_method as PaymentMethod) || 'dinheiro',
    amountBrl: Number(r.amount_brl) || 0,
    previousDebtBrl: r.previous_debt_brl !== undefined ? Number(r.previous_debt_brl) : undefined,
    projectedDebtBrl: r.projected_debt_brl !== undefined ? Number(r.projected_debt_brl) : undefined,
    status: r.status || 'em_cobranca',
    itemsSummary: r.items_summary || undefined,
    saleId: r.sale_id || undefined,
    updatedAt: r.updated_at || r.created_at || new Date().toISOString(),
  };
}

export async function listFluxoCobrancas(): Promise<ActiveCheckoutSession[]> {
  try {
    const rows = await fetchAllRowsPaged<any>('fluxo_cobrancas_tempo_real');
    return rows
      .map(rowToCheckoutSession)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch {
    return [];
  }
}

export async function upsertFluxoCobrancaDb(s: ActiveCheckoutSession): Promise<ActiveCheckoutSession | null> {
  try {
    const row = checkoutSessionToRow(s);
    const { data, error } = await supabase
      .from('fluxo_cobrancas_tempo_real')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();
    if (error || !data) return null;
    return rowToCheckoutSession(data);
  } catch {
    return null;
  }
}

export async function deleteFluxoCobrancaDb(id: string): Promise<void> {
  try {
    await supabase.from('fluxo_cobrancas_tempo_real').delete().eq('id', id);
  } catch {}
}

// ==========================================
// DATA ACCESS LAYER: SALDOS DEVEDORES EM FLUXO TEMPO REAL
// Tabela Separada: public.saldos_devedores_tempo_real
// ==========================================

export function liveDebtorBalanceToRow(d: LiveDebtorBalanceRecord) {
  return {
    customer_id: d.customerId,
    customer_name: d.customerName,
    customer_phone: d.customerPhone || null,
    previous_balance_brl: Number(d.previousBalanceBrl) || 0,
    last_comanda_amount_brl: Number(d.lastComandaAmountBrl) || 0,
    current_debt_balance_brl: Number(d.currentDebtBalanceBrl) || 0,
    credit_limit_brl: Number(d.creditLimitBrl) || 0,
    open_comandas_count: Number(d.openComandasCount) || 0,
    last_comanda_number: d.lastComandaNumber || null,
    last_setor_responsavel: d.lastSetorResponsavel || 'Panificação & Confeitaria Artesanal',
    last_operation_type: d.lastOperationType || 'comanda_lancada',
    updated_by: d.updatedBy || 'Sistema',
    updated_at: d.updatedAt || new Date().toISOString(),
  };
}

export function rowToLiveDebtorBalance(r: any): LiveDebtorBalanceRecord {
  return {
    customerId: String(r.customer_id || ''),
    customerName: String(r.customer_name || 'Cliente'),
    customerPhone: r.customer_phone || undefined,
    previousBalanceBrl: Number(r.previous_balance_brl) || 0,
    lastComandaAmountBrl: Number(r.last_comanda_amount_brl) || 0,
    currentDebtBalanceBrl: Number(r.current_debt_balance_brl) || 0,
    creditLimitBrl: Number(r.credit_limit_brl) || 0,
    openComandasCount: Number(r.open_comandas_count) || 0,
    lastComandaNumber: r.last_comanda_number || undefined,
    lastSetorResponsavel: r.last_setor_responsavel || undefined,
    lastOperationType: r.last_operation_type || 'comanda_lancada',
    updatedBy: String(r.updated_by || 'Sistema'),
    updatedAt: r.updated_at || new Date().toISOString(),
  };
}

export async function listSaldosDevedoresTempoReal(): Promise<LiveDebtorBalanceRecord[]> {
  try {
    const rows = await fetchAllRowsPaged<any>('saldos_devedores_tempo_real');
    return rows.map(rowToLiveDebtorBalance);
  } catch {
    return [];
  }
}

export async function upsertSaldoDevedorTempoRealDb(d: LiveDebtorBalanceRecord): Promise<LiveDebtorBalanceRecord | null> {
  try {
    const row = liveDebtorBalanceToRow(d);
    const { data, error } = await supabase
      .from('saldos_devedores_tempo_real')
      .upsert(row, { onConflict: 'customer_id' })
      .select()
      .single();
    if (error || !data) return null;
    return rowToLiveDebtorBalance(data);
  } catch {
    return null;
  }
}

// ==========================================
// DATA ACCESS LAYER: TABELAS SEPARADAS POR FUNÇÃO
// 1. public.comandas_historico_setores (Fluxo de Produção dos Setores)
// 2. public.amortizacoes_pagamentos_fiado (Quitação & Recebimento de Devedores)
// 3. public.caixa_movimentacoes (Sangria, Suprimento, Entrada e Saída de Caixa)
// 4. public.estoque_movimentacoes (Entradas, Baixas, Perdas e Ajustes de Estoque)
// 5. public.fornadas_producao (Fornadas do Padeiro em Tempo Real)
// ==========================================

export async function insertComandaHistoricoSetorDb(params: {
  comandaId: string;
  comandaNumber: string;
  customerId?: string;
  customerName?: string;
  setorResponsavel: string;
  statusAnterior?: string;
  statusNovo: string;
  totalBrl: number;
  debtBalanceAfterBrl?: number;
  operador: string;
}): Promise<void> {
  try {
    await supabase.from('comandas_historico_setores').insert({
      id: `cmd-hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      comanda_id: params.comandaId,
      comanda_number: params.comandaNumber,
      customer_id: params.customerId || null,
      customer_name: params.customerName || 'Cliente Balcão',
      setor_responsavel: params.setorResponsavel,
      status_anterior: params.statusAnterior || null,
      status_novo: params.statusNovo,
      total_brl: Number(params.totalBrl) || 0,
      debt_balance_after_brl: params.debtBalanceAfterBrl !== undefined ? Number(params.debtBalanceAfterBrl) : null,
      operador: params.operador || 'Sistema',
      created_at: new Date().toISOString(),
    });
  } catch {}
}

export async function insertAmortizacaoFiadoDb(params: {
  id?: string;
  customerId: string;
  customerName: string;
  valorPagoBrl: number;
  saldoAntesBrl: number;
  saldoDepoisBrl: number;
  metodoPagamento: string;
  comandaNumber?: string;
  observacoes?: string;
  recebidoPor: string;
}): Promise<void> {
  try {
    await supabase.from('amortizacoes_pagamentos_fiado').insert({
      id: params.id || `amort-${Date.now()}`,
      customer_id: params.customerId,
      customer_name: params.customerName,
      valor_pago_brl: Number(params.valorPagoBrl) || 0,
      saldo_antes_brl: Number(params.saldoAntesBrl) || 0,
      saldo_depois_brl: Number(params.saldoDepoisBrl) || 0,
      metodo_pagamento: params.metodoPagamento,
      comanda_number: params.comandaNumber || null,
      observacoes: params.observacoes || null,
      recebido_por: params.recebidoPor || 'Caixa',
      created_at: new Date().toISOString(),
    });
  } catch {}
}

export async function insertCaixaMovimentacaoDb(sessionId: string, tx: CashTransaction): Promise<void> {
  try {
    await supabase.from('caixa_movimentacoes').insert({
      id: tx.id,
      session_id: sessionId,
      type: tx.type,
      amount: Number(tx.amount) || 0,
      currency: tx.currency || 'PYG',
      reason: tx.reason,
      category: tx.category || null,
      document_number: tx.documentNumber || null,
      employee_name: tx.employeeName || 'Operador',
      created_at: tx.timestamp || new Date().toISOString(),
    });
  } catch {}
}

export async function insertEstoqueMovimentacaoDb(m: StockMovement): Promise<void> {
  try {
    await supabase.from('estoque_movimentacoes').insert({
      id: m.id,
      product_id: m.productId,
      product_name: m.productName,
      type: m.type,
      quantity: Number(m.quantity) || 0,
      unit: m.unit || 'un',
      reason: m.reason,
      employee_name: m.employeeName || 'Operador',
      previous_stock: Number(m.previousStock) || 0,
      new_stock: Number(m.newStock) || 0,
      created_at: m.timestamp || new Date().toISOString(),
    });
  } catch {}
}

export async function insertFornadaProducaoDb(f: FornadaLog): Promise<void> {
  try {
    await supabase.from('fornadas_producao').insert({
      id: f.id,
      product_id: f.productId,
      product_name: f.productName,
      quantity: Number(f.quantity) || 0,
      unit: f.unit || 'un',
      baker_name: f.bakerName || 'Padeiro',
      batch_number: f.batchNumber || null,
      created_at: f.timestamp || new Date().toISOString(),
    });
  } catch {}
}

// ==========================================
// DATA ACCESS LAYER: REGISTRO DE COMPRAS DE CADA CLIENTE & ANÁLISE FINANCEIRA
// Tabela SQL: public.registro_compras_clientes
// ==========================================

export function customerPurchaseToRow(p: CustomerPurchaseRecord) {
  return {
    id: p.id,
    customer_id: p.customerId,
    customer_name: p.customerName || 'Cliente Cadastrado',
    customer_phone: p.customerPhone || null,
    sale_id: p.saleId || null,
    sale_number: p.saleNumber ?? null,
    comanda_number: p.comandaNumber || null,
    items: p.items || [],
    items_summary: p.itemsSummary || '',
    total_amount_brl: Number(p.totalAmountBrl) || 0,
    estimated_cost_brl: Number(p.estimatedCostBrl) || 0,
    paid_amount_brl: Number(p.paidAmountBrl) || 0,
    fiado_amount_brl: Number(p.fiadoAmountBrl) || 0,
    payment_method: p.paymentMethod || 'dinheiro',
    flow_type: p.flowType || 'entrada_avista',
    setor_responsavel: p.setorResponsavel || 'Panificação & Confeitaria Artesanal',
    recorded_by: p.recordedBy || 'Operador',
    notes: p.notes || null,
    purchase_date: p.purchaseDate || new Date().toISOString(),
  };
}

export function rowToCustomerPurchase(r: any): CustomerPurchaseRecord {
  const rawItems: any[] = Array.isArray(r.items) ? r.items : [];
  const items: CustomerPurchaseItem[] = rawItems.map((it: any) => ({
    productId: String(it.productId || it.product?.id || ''),
    productName: String(it.productName || it.product?.name || it.name || 'Produto'),
    category: it.category || it.product?.category || 'paes',
    quantity: Number(it.quantity) || 1,
    unit: String(it.unit || it.product?.unit || 'un'),
    unitPriceBrl: Number(it.unitPriceBrl ?? it.product?.priceBrl ?? 0),
    costPriceBrl: Number(it.costPriceBrl ?? it.product?.costPriceBrl ?? 0),
    subtotalBrl: Number(it.subtotalBrl ?? (Number(it.unitPriceBrl || 0) * Number(it.quantity || 1))),
  }));

  const summary = r.items_summary || items.map(i => `${i.quantity}x ${i.productName}`).join(', ');
  const totalAmount = Number(r.total_amount_brl) || 0;
  const fiadoAmount = Number(r.fiado_amount_brl) || 0;
  const paidAmount = r.paid_amount_brl !== undefined ? Number(r.paid_amount_brl) : Math.max(0, totalAmount - fiadoAmount);

  return {
    id: String(r.id),
    customerId: String(r.customer_id || ''),
    customerName: String(r.customer_name || 'Cliente'),
    customerPhone: r.customer_phone || undefined,
    saleId: r.sale_id || undefined,
    saleNumber: r.sale_number !== null && r.sale_number !== undefined ? Number(r.sale_number) : undefined,
    comandaNumber: r.comanda_number || undefined,
    items,
    itemsSummary: String(summary || 'Compra Registrada'),
    totalAmountBrl: totalAmount,
    estimatedCostBrl: Number(r.estimated_cost_brl) || 0,
    paidAmountBrl: paidAmount,
    fiadoAmountBrl: fiadoAmount,
    paymentMethod: String(r.payment_method || 'dinheiro'),
    flowType: (r.flow_type as FinancialFlowCategory) || (fiadoAmount > 0 ? 'fiado_pendente' : 'entrada_avista'),
    setorResponsavel: r.setor_responsavel || 'Panificação & Confeitaria Artesanal',
    recordedBy: String(r.recorded_by || 'Operador'),
    notes: r.notes || undefined,
    purchaseDate: r.purchase_date || r.created_at || new Date().toISOString(),
  };
}

export async function listRegistroComprasClientes(): Promise<CustomerPurchaseRecord[]> {
  try {
    const rows = await fetchAllRowsPaged<any>('registro_compras_clientes');
    return rows
      .map(rowToCustomerPurchase)
      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  } catch {
    return [];
  }
}

export async function upsertRegistroCompraClienteDb(p: CustomerPurchaseRecord): Promise<CustomerPurchaseRecord | null> {
  try {
    const row = customerPurchaseToRow(p);
    const { data, error } = await supabase
      .from('registro_compras_clientes')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();
    if (error || !data) return null;
    return rowToCustomerPurchase(data);
  } catch {
    return null;
  }
}

export async function deleteRegistroCompraClienteDb(id: string): Promise<void> {
  try {
    await supabase.from('registro_compras_clientes').delete().eq('id', id);
  } catch {}
}
