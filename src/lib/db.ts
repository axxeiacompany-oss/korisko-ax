import { supabase } from './supabase';
import { 
  Product, 
  Customer, 
  Sale, 
  CashRegisterSession, 
  Employee,
  UserRole,
  AppFeature
} from '../types';

// ==========================================
// ROW MAPPERS (App Model <-> Supabase DB Row)
// ==========================================

export function productToRow(p: Product) {
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
  };
}

export function rowToProduct(r: any): Product {
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

  return {
    id: String(r.id),
    saleNumber: saleNum,
    timestamp: r.created_at || new Date().toISOString(),
    employeeId: r.employee_id || '',
    employeeName: r.employee_name || '',
    items: Array.isArray(r.items) ? r.items : [],
    subtotalBrl: Number(r.subtotal_brl) || Number(r.total_brl) || 0,
    discountBrl: Number(r.discount_brl) || 0,
    totalBrl: Number(r.total_brl) || 0,
    payments: Array.isArray(r.payments) ? r.payments : [],
    changeGiven: r.change_given || undefined,
    customerId: r.customer_id || undefined,
    customerName: r.customer_name || undefined,
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
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, to);

    if (error) {
      throw new Error(`[Supabase ${table}] Falha ao carregar registros: ${error.message}`);
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
    throw new Error(`[Erro ao salvar cliente]: ${error.message}`);
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

/**
 * REQUIREMENT 5:
 * The database generates sale_number via trigger.
 * Do NOT send sale_number.
 * Uses supabase.from('vendas').insert(venda).select().single()
 * Returns the sale with the generated data.sale_number.
 */
export async function insertVenda(saleData: Omit<Sale, 'saleNumber'>): Promise<Sale> {
  const row = saleToRow(saleData);
  const { data, error } = await supabase
    .from('vendas')
    .insert(row)
    .select()
    .single();

  if (error) {
    throw new Error(`[Erro ao registrar venda no Supabase]: ${error.message}`);
  }

  return rowToSale(data);
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
}

/**
 * Ajusta saldo do cliente diretamente no banco de dados via RPC:
 * supabase.rpc('ajustar_saldo_cliente', { p_id, p_valor })
 * Retorna o novo saldo retornado pelo banco.
 */
export async function rpcAjustarSaldoCliente(p_id: string, p_valor: number): Promise<number> {
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
