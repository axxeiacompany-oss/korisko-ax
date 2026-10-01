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
  PaymentMethod
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
    image_url: p.imageUrl || null,
    description: p.description || null,
    slug: p.slug || null,
    compare_at_price: p.compareAtPrice ? Number(p.compareAtPrice) : null,
    featured: Boolean(p.featured),
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
    imageUrl: r.image_url || undefined,
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
    source: c.source || 'pdv',
  };
}

export function rowToComanda(r: any): Comanda {
  const items: CartItem[] = Array.isArray(r.items) ? r.items : [];
  const sectorInfo = resolveSetoresFromItems(items);
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
    totalBrl: Number(r.total_brl) || items.reduce(
      (sum, item) => sum + (Number(item.product?.priceBrl) || 0) * (Number(item.quantity) || 0),
      0
    ),
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
    if (error || !data) return null;
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


