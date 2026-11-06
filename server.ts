import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import pg from 'pg';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_DEFAULT_URL = 'https://lmbpvdpmrdfxfqednwxd.supabase.co';
const SUPABASE_DEFAULT_KEY = 'sb_publishable_l0-nPS9D5LQAC_AvzAyYWA_MXIFG0lm';

function normalizeSupabaseUrl(url?: string): string {
  if (!url) return SUPABASE_DEFAULT_URL;
  return url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

// Persistent Storage Paths
const DATA_DIR = path.resolve(process.cwd(), 'data');
const LOCAL_STATE_FILE = path.join(DATA_DIR, 'korisko_state.json');
const LOCAL_BACKUPS_FILE = path.join(DATA_DIR, 'korisko_backups.json');
const SUPABASE_CONFIG_FILE = path.join(DATA_DIR, 'supabase_config.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (err) {
      console.warn('[Korisko DB] Could not create data directory:', err);
    }
  }
}

// Atomic safe file write
function safeWriteJsonFile(filePath: string, data: any): void {
  ensureDataDir();
  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    console.error(`[Korisko DB] Error writing file ${filePath}:`, err);
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {}
    // Fallback direct write
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }
}

function safeReadJsonFile<T = any>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    if (!raw || raw.trim().length === 0) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[Korisko DB] Error reading file ${filePath}:`, err);
    return null;
  }
}

function getActiveServerSupabaseConfig() {
  const fileConfig = safeReadJsonFile<{ url?: string; anonKey?: string }>(SUPABASE_CONFIG_FILE);
  const customUrl = fileConfig?.url;
  const customKey = fileConfig?.anonKey;

  const url = normalizeSupabaseUrl(customUrl || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || SUPABASE_DEFAULT_URL);
  const anonKey = (customKey || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_DEFAULT_KEY).trim();
  const isCustom = Boolean(customUrl && customKey);
  return { url, anonKey, isCustom };
}

let activeSupabaseConfig = getActiveServerSupabaseConfig();
let supabaseServer: SupabaseClient | null = null;
let lastSupabasePingSuccess = false;
let lastSupabasePingTime = 0;
let lastSupabasePingError: string | null = null;

function reinitServerSupabase(url: string, key: string) {
  try {
    activeSupabaseConfig = { url: normalizeSupabaseUrl(url), anonKey: key.trim(), isCustom: true };
    supabaseServer = createClient(activeSupabaseConfig.url, activeSupabaseConfig.anonKey);
    lastSupabasePingTime = 0;
  } catch (err: any) {
    console.warn('[Korisko Server] Reinit Supabase notice:', err.message);
  }
}

try {
  supabaseServer = createClient(activeSupabaseConfig.url, activeSupabaseConfig.anonKey);
} catch (err) {
  console.warn('[Korisko Server] Supabase client init notice:', err);
}

async function checkSupabaseServerReachability(force = false): Promise<{ connected: boolean; error?: string; latencyMs?: number }> {
  const now = Date.now();
  if (!force && lastSupabasePingTime > 0 && (now - lastSupabasePingTime) < 30000) {
    return { connected: lastSupabasePingSuccess, error: lastSupabasePingError || undefined };
  }

  if (!supabaseServer) {
    lastSupabasePingSuccess = false;
    lastSupabasePingError = 'Cliente Supabase não inicializado';
    lastSupabasePingTime = now;
    return { connected: false, error: lastSupabasePingError };
  }

  const t0 = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const testRes = await supabaseServer
      .from('korisko_system_state')
      .select('id')
      .limit(1)
      .abortSignal(controller.signal);

    clearTimeout(timeout);

    if (testRes.error) {
      const errLower = testRes.error.message.toLowerCase();
      const isDnsOrNetwork =
        errLower.includes('fetch failed') ||
        errLower.includes('enotfound') ||
        errLower.includes('timeout') ||
        errLower.includes('aborted');
      if (isDnsOrNetwork) {
        lastSupabasePingSuccess = false;
        lastSupabasePingError = 'Projeto pausado ou endereço DNS não encontrado no Supabase';
      } else {
        // Table might not exist yet, but server IS reachable!
        lastSupabasePingSuccess = true;
        lastSupabasePingError = null;
      }
    } else {
      lastSupabasePingSuccess = true;
      lastSupabasePingError = null;
    }
  } catch (err: any) {
    lastSupabasePingSuccess = false;
    lastSupabasePingError = err.message || 'Falha de conexão com o Supabase';
  }

  lastSupabasePingTime = now;
  return {
    connected: lastSupabasePingSuccess,
    error: lastSupabasePingError || undefined,
    latencyMs: Date.now() - t0,
  };
}

// Initial reachability check in background
setTimeout(() => {
  checkSupabaseServerReachability(true).catch(() => {});
}, 1000);

function safeSupabaseUpsert(table: string, payload: any, onConflict: string) {
  if (!supabaseServer || !lastSupabasePingSuccess) return;
  try {
    supabaseServer
      .from(table)
      .upsert(payload, { onConflict })
      .then(
        ({ error }) => {
          if (error && error.code !== 'PGRST205') {
            console.warn(`[Korisko Server] Supabase mirror notice (${table}):`, error.message);
          }
        },
        () => {}
      );
  } catch {}
}

const { Pool } = pg;
const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

// Increase payload limit for database state and image backups
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Optional PostgreSQL setup if DATABASE_URL is provided (e.g. Railway / Supabase direct postgres)
const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_PUBLIC_URL;
const mockPool = {
  query: async () => ({ rows: [] }),
  connect: async () => ({
    query: async () => ({ rows: [] }),
    release: () => {},
  }),
} as unknown as pg.Pool;
let pool: pg.Pool = mockPool;
let isPgConnected = false;

async function initPostgres() {
  if (!dbUrl) {
    console.log('[Korisko DB] Motor de banco de dados nativo ativo (Persistência em Disco e Memória).');
    pool = mockPool;
    return;
  }

  try {
    const isLocalhost = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
    pool = new Pool({
      connectionString: dbUrl,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });
    pool.on('error', (err) => {
      console.warn('[Korisko DB] PostgreSQL client error notice:', err.message);
    });

    const client = await pool.connect();
    console.log('[Korisko DB] Conexão PostgreSQL estabelecida com sucesso!');

    await client.query(`
      CREATE TABLE IF NOT EXISTS korisko_system_state (
        id VARCHAR(64) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS korisko_backup_points (
        id VARCHAR(64) PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        role TEXT NOT NULL DEFAULT 'caixa',
        password TEXT NOT NULL,
        pin TEXT,
        avatar_color TEXT DEFAULT 'bg-indigo-600',
        allowed_features JSONB DEFAULT '["dashboard","pdv","venda_direta","crm"]'::jsonb,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS pagamentos_vendas_etapas (
        id TEXT PRIMARY KEY,
        sale_id TEXT NOT NULL,
        sale_number INTEGER,
        comanda_number TEXT,
        customer_id TEXT,
        customer_name TEXT,
        method TEXT NOT NULL,
        currency TEXT NOT NULL DEFAULT 'PYG',
        amount_received NUMERIC(14, 2) NOT NULL DEFAULT 0,
        exchange_rate_used NUMERIC(14, 4) NOT NULL DEFAULT 1,
        equivalent_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
        stage_status TEXT NOT NULL DEFAULT 'liquidado',
        destination_type TEXT NOT NULL,
        recorded_by TEXT NOT NULL DEFAULT 'Caixa',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS saldos_devedores_tempo_real (
        customer_id TEXT PRIMARY KEY,
        customer_name TEXT NOT NULL,
        customer_phone TEXT,
        previous_balance_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
        current_debt_balance_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
        open_comandas_total_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
        open_comandas_count INTEGER NOT NULL DEFAULT 0,
        credit_limit_brl NUMERIC(14, 2) NOT NULL DEFAULT 500000,
        available_credit_brl NUMERIC(14, 2) NOT NULL DEFAULT 500000,
        last_comanda_id TEXT,
        last_comanda_number TEXT,
        last_operation_type TEXT NOT NULL DEFAULT 'comanda_lancada',
        last_operation_amount_brl NUMERIC(14, 2) NOT NULL DEFAULT 0,
        last_entry_description TEXT,
        last_payment_date TIMESTAMP WITH TIME ZONE,
        last_purchase_date TIMESTAMP WITH TIME ZONE,
        status_cobranca TEXT NOT NULL DEFAULT 'em_dia',
        setor_responsavel TEXT DEFAULT 'Panificação & Confeitaria Artesanal',
        updated_by TEXT DEFAULT 'Sistema',
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    client.release();
    isPgConnected = true;
  } catch (err) {
    console.warn('[Korisko DB] PostgreSQL opcional não conectado, operando com banco nativo local:', err);
    pool = mockPool;
    isPgConnected = false;
  }
}

const dbInitPromise = initPostgres();

// ==========================================
// API ROUTES
// ==========================================

// Health & Database Status
app.get('/api/health', async (_req, res) => {
  if (dbInitPromise) await dbInitPromise;

  let currentState = safeReadJsonFile(LOCAL_STATE_FILE);
  if ((!currentState || !currentState.products || currentState.products.length === 0) && supabaseServer) {
    try {
      currentState = await assembleFullStateFromSupabase();
    } catch {}
  }

  const productsCount = currentState?.products?.length || 0;
  const salesCount = currentState?.sales?.length || 0;
  const customersCount = currentState?.customers?.length || 0;

  res.json({
    status: 'ok',
    databaseConnected: true,
    mode: isPgConnected ? 'postgresql' : (lastSupabasePingSuccess ? 'supabase_cloud' : 'banco_operacional'),
    supabaseConnected: lastSupabasePingSuccess,
    supabaseUrl: activeSupabaseConfig.url,
    totalRecords: productsCount + salesCount + customersCount,
    records: {
      products: productsCount,
      sales: salesCount,
      customers: customersCount,
    },
    persistence: 'tempo_real',
    timestamp: new Date().toISOString(),
  });
});

// Supabase Configuration & Status API
app.get('/api/supabase/config', async (_req, res) => {
  const cfg = getActiveServerSupabaseConfig();
  const ping = await checkSupabaseServerReachability(false);
  res.json({
    url: cfg.url,
    anonKey: cfg.anonKey ? (cfg.anonKey.slice(0, 15) + '...' + cfg.anonKey.slice(-4)) : '',
    fullAnonKey: cfg.anonKey,
    isCustom: cfg.isCustom,
    connected: ping.connected,
    error: ping.error,
  });
});

app.post('/api/supabase/config', async (req, res) => {
  const { url, anonKey, reset } = req.body;

  if (reset) {
    try {
      if (fs.existsSync(SUPABASE_CONFIG_FILE)) fs.unlinkSync(SUPABASE_CONFIG_FILE);
    } catch {}
    reinitServerSupabase(SUPABASE_DEFAULT_URL, SUPABASE_DEFAULT_KEY);
    const ping = await checkSupabaseServerReachability(true);
    return res.json({
      success: true,
      reset: true,
      url: SUPABASE_DEFAULT_URL,
      connected: ping.connected,
      error: ping.error,
    });
  }

  if (!url || typeof url !== 'string' || !url.includes('supabase.co')) {
    return res.status(400).json({ error: 'URL do Supabase inválida. Deve conter .supabase.co' });
  }

  if (!anonKey || typeof anonKey !== 'string') {
    return res.status(400).json({ error: 'Chave do Supabase inválida.' });
  }

  const cleanUrl = normalizeSupabaseUrl(url);
  const cleanKey = anonKey.trim();

  safeWriteJsonFile(SUPABASE_CONFIG_FILE, { url: cleanUrl, anonKey: cleanKey });
  reinitServerSupabase(cleanUrl, cleanKey);

  const ping = await checkSupabaseServerReachability(true);
  return res.json({
    success: true,
    url: cleanUrl,
    connected: ping.connected,
    error: ping.error,
    latencyMs: ping.latencyMs,
  });
});

app.get('/api/supabase/ping', async (_req, res) => {
  const ping = await checkSupabaseServerReachability(true);
  res.json({
    url: activeSupabaseConfig.url,
    connected: ping.connected,
    error: ping.error,
    latencyMs: ping.latencyMs,
  });
});

// Live Currency Exchange Rates Proxy (Server-side fetch prevents browser CORS and network failures)
let cachedRatesData: any = null;
let cachedRatesExpiry = 0;

app.get('/api/exchange-rates', async (_req, res) => {
  const now = Date.now();
  if (cachedRatesData && now < cachedRatesExpiry) {
    return res.json(cachedRatesData);
  }

  // 1. Attempt server-side fetch from AwesomeAPI
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const r = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,BRL-PYG,USD-PYG', {
      headers: { 'Accept': 'application/json', 'User-Agent': 'KoriskoPadaria/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (r.ok) {
      const data: any = await r.json();
      const usdBrl = data.USDBRL ? parseFloat(data.USDBRL.bid) : 0;
      let brlPyg = data.BRLPYG ? parseFloat(data.BRLPYG.bid) : 0;
      let usdPyg = data.USDPYG ? parseFloat(data.USDPYG.bid) : 0;

      if (usdBrl > 0 && usdPyg > 0 && (!brlPyg || brlPyg <= 0)) {
        brlPyg = Math.round(usdPyg / usdBrl);
      } else if (usdBrl > 0 && brlPyg > 0 && (!usdPyg || usdPyg <= 0)) {
        usdPyg = Math.round(usdBrl * brlPyg);
      }

      if (usdBrl > 0 && brlPyg > 0) {
        cachedRatesData = {
          success: true,
          rates: {
            USD_TO_BRL: Math.round(usdBrl * 100) / 100,
            BRL_TO_PYG: Math.round(brlPyg),
            USD_TO_PYG: Math.round(usdPyg || usdBrl * brlPyg),
          },
          provider: 'AwesomeAPI Mercados (Ao Vivo)',
          timestamp: new Date().toISOString(),
          details: {
            usdBrlVariation: data.USDBRL?.varBid,
            usdBrlPctChange: data.USDBRL?.pctChange ? `${data.USDBRL.pctChange}%` : undefined,
          },
        };
        cachedRatesExpiry = now + 60 * 1000; // cache for 1 minute
        return res.json(cachedRatesData);
      }
    }
  } catch {}

  // 2. Attempt fallback server-side fetch from Open Exchange Rates API
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const r2 = await fetch('https://open.er-api.com/v6/latest/BRL', {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (r2.ok) {
      const data: any = await r2.json();
      if (data && data.rates) {
        const usdRate = data.rates.USD;
        const pygRate = data.rates.PYG;
        const usdBrl = usdRate > 0 ? 1 / usdRate : 5.65;
        const brlPyg = pygRate > 0 ? pygRate : 1380;
        cachedRatesData = {
          success: true,
          rates: {
            USD_TO_BRL: Math.round(usdBrl * 100) / 100,
            BRL_TO_PYG: Math.round(brlPyg),
            USD_TO_PYG: Math.round(usdBrl * brlPyg),
          },
          provider: 'Open Exchange Rates (Global)',
          timestamp: new Date().toISOString(),
        };
        cachedRatesExpiry = now + 60 * 1000;
        return res.json(cachedRatesData);
      }
    }
  } catch {}

  // 3. Reliable Market Benchmark Default
  const fallback = {
    success: true,
    rates: {
      USD_TO_BRL: 5.65,
      BRL_TO_PYG: 1400,
      USD_TO_PYG: 7910,
    },
    provider: 'Cotação Comercial de Mercado (PYG/BRL/USD)',
    timestamp: new Date().toISOString(),
  };
  return res.json(fallback);
});

// Assemble complete state from live Supabase relational tables (produtos, clientes, vendas, etc.)
async function assembleFullStateFromSupabase(): Promise<any | null> {
  if (!supabaseServer) return null;
  try {
    const [prodRes, custRes, salesRes, userRes, sessRes, cmdRes, fiadoRes, debtorsRes, purchRes, extraRes] = await Promise.all([
      supabaseServer.from('produtos').select('*'),
      supabaseServer.from('clientes').select('*'),
      supabaseServer.from('vendas').select('*').order('created_at', { ascending: false }),
      supabaseServer.from('usuarios').select('*'),
      supabaseServer.from('caixa_sessoes').select('*').order('opened_at', { ascending: false }),
      supabaseServer.from('comandas').select('*'),
      supabaseServer.from('lancamentos_fiado').select('*'),
      supabaseServer.from('saldos_devedores_tempo_real').select('*'),
      supabaseServer.from('registro_compras_clientes').select('*'),
      supabaseServer.from('korisko_system_state').select('data').eq('id', 'active_state').maybeSingle()
    ]);

    const prodRows = prodRes.data || [];
    const custRows = custRes.data || [];
    const salesRows = salesRes.data || [];
    const userRows = userRes.data || [];
    const sessRows = sessRes.data || [];
    const extra = extraRes.data?.data || {};

    if (prodRows.length === 0 && custRows.length === 0 && salesRows.length === 0) {
      if (extra && Array.isArray(extra.products) && extra.products.length > 0) {
        return extra;
      }
      return null;
    }

    const products = prodRows.map((r: any) => ({
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
      isIngredient: Boolean(r.is_ingredient),
      imageUrl: r.image_url || undefined,
      description: r.description || undefined,
      slug: r.slug || undefined,
      compareAtPrice: r.compare_at_price != null ? Number(r.compare_at_price) : undefined,
      featured: Boolean(r.featured),
      expirationDate: r.expiration_date || undefined,
    }));

    const customers = custRows.map((c: any) => ({
      id: String(c.id),
      name: c.name || '',
      phone: c.phone || '',
      email: c.email || '',
      documentCpf: c.document_cpf || '',
      address: c.address || '',
      category: c.category || 'varejo',
      creditLimitBrl: Number(c.credit_limit_brl) || 0,
      outstandingBalanceBrl: Number(c.outstanding_balance_brl) || 0,
      loyaltyPoints: Number(c.loyalty_points) || 0,
      totalSpentBrl: Number(c.total_spent_brl) || 0,
      purchaseCount: Number(c.purchase_count) || 0,
      lastPurchaseDate: c.last_purchase_date || undefined,
      birthday: c.birthday || '',
      notes: c.notes || '',
      affiliateId: c.affiliate_id || undefined,
      affiliateName: c.affiliate_name || undefined,
      createdAt: c.created_at || new Date().toISOString(),
    }));

    const sales = salesRows.map((r: any) => ({
      id: String(r.id),
      saleNumber: Number(r.sale_number) || 0,
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
      comandaNumber: r.comanda_number || undefined,
      setorResponsavel: r.setor_responsavel || 'Panificação & Confeitaria Artesanal',
      confirmedByCustomer: r.confirmed_by_customer !== undefined ? Boolean(r.confirmed_by_customer) : true,
      status: 'completed',
      registerSessionId: '',
    }));

    const employees = userRows.map((r: any) => ({
      id: String(r.id),
      name: r.name || '',
      email: r.email || '',
      role: r.role || 'caixa',
      password: r.password || r.pin || '',
      pin: r.pin || r.password || '',
      avatarColor: r.avatar_color || 'bg-indigo-600',
      allowedFeatures: Array.isArray(r.allowed_features) ? r.allowed_features : ['dashboard', 'pdv', 'venda_direta', 'crm'],
      active: r.active !== false,
    }));

    const currentSession = sessRows.find((s: any) => s.status === 'aberto') || sessRows[0] || extra?.currentSession || {
      id: `sess-${Date.now()}`,
      sessionNumber: 1,
      openedAt: new Date().toISOString(),
      openedBy: 'Ax',
      status: 'aberto',
      initialFloat: { brl: 0, pyg: 0, usd: 0 },
      transactions: [],
    };

    const sessionHistory = sessRows.filter((s: any) => s.id !== currentSession.id);

    const assembledState = {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      products,
      customers,
      sales,
      employees: employees.length > 0 ? employees : (extra.employees || []),
      currentSession,
      sessionHistory,
      openComandas: (cmdRes.data || []).map((c: any) => ({
        id: String(c.id),
        number: String(c.number || ''),
        customerId: c.customer_id || undefined,
        customerName: c.customer_name || undefined,
        customerPhone: c.customer_phone || undefined,
        items: Array.isArray(c.items) ? c.items : [],
        openedAt: c.opened_at || c.created_at || new Date().toISOString(),
        openedBy: c.opened_by || 'Balcão',
        notes: c.notes || undefined,
        status: c.status || 'confirmado',
        setorResponsavel: c.setor_responsavel || 'panificacao',
        setoresEnvolvidos: Array.isArray(c.setores_envolvidos) ? c.setores_envolvidos : ['panificacao'],
        confirmedByCustomer: c.confirmed_by_customer !== undefined ? Boolean(c.confirmed_by_customer) : true,
        confirmedAt: c.confirmed_at || c.opened_at || new Date().toISOString(),
        updatedAt: c.updated_at || new Date().toISOString(),
        source: c.source || 'pdv',
        totalBrl: Number(c.total_brl) || 0,
      })),
      fornadas: extra.fornadas || [],
      fichasTecnicas: extra.fichasTecnicas || [],
      goals: extra.goals || [],
      exchangeRates: extra.exchangeRates || { BRL_TO_PYG: 1400, USD_TO_BRL: 5.65, USD_TO_PYG: 7910 },
      stockMovements: extra.stockMovements || [],
      customerEntries: (fiadoRes.data || []).map((r: any) => ({
        id: String(r.id),
        customerId: String(r.customer_id || ''),
        customerName: r.customer_name || undefined,
        date: r.date || r.created_at || new Date().toISOString(),
        type: r.type || 'debito_compra',
        amountBrl: Number(r.amount_brl) || 0,
        previousBalanceBrl: r.previous_balance_brl !== undefined ? Number(r.previous_balance_brl) : undefined,
        resultingBalanceBrl: r.resulting_balance_brl !== undefined ? Number(r.resulting_balance_brl) : undefined,
        paymentMethod: r.payment_method || 'fiado',
        description: String(r.description || ''),
        saleId: r.sale_id || undefined,
        comandaNumber: r.comanda_number || undefined,
        setorResponsavel: r.setor_responsavel || 'Panificação & Confeitaria Artesanal',
        confirmedByCustomer: r.confirmed_by_customer !== undefined ? Boolean(r.confirmed_by_customer) : true,
        recordedBy: String(r.recorded_by || 'Caixa'),
      })),
      customerPurchases: (purchRes.data || []).map((r: any) => ({
        id: String(r.id),
        customerId: String(r.customer_id || ''),
        customerName: r.customer_name || undefined,
        customerPhone: r.customer_phone || undefined,
        saleId: r.sale_id || undefined,
        saleNumber: r.sale_number || undefined,
        comandaNumber: r.comanda_number || undefined,
        items: Array.isArray(r.items) ? r.items : [],
        itemsSummary: r.items_summary || '',
        totalAmountBrl: Number(r.total_amount_brl) || 0,
        estimatedCostBrl: Number(r.estimated_cost_brl) || 0,
        paidAmountBrl: Number(r.paid_amount_brl) || 0,
        fiadoAmountBrl: Number(r.fiado_amount_brl) || 0,
        paymentMethod: r.payment_method || 'dinheiro',
        flowType: r.flow_type || 'entrada_avista',
        setorResponsavel: r.setor_responsavel || 'Panificação & Confeitaria Artesanal',
        recordedBy: r.recorded_by || 'Caixa',
        purchaseDate: r.purchase_date || r.created_at || new Date().toISOString(),
      })),
      activeCheckouts: extra.activeCheckouts || [],
      liveDebtorBalances: (debtorsRes.data || []).map((r: any) => ({
        customerId: String(r.customer_id),
        customerName: r.customer_name || '',
        customerPhone: r.customer_phone || undefined,
        previousBalanceBrl: Number(r.previous_balance_brl) || 0,
        currentDebtBalanceBrl: Number(r.current_debt_balance_brl) || 0,
        openComandasTotalBrl: Number(r.open_comandas_total_brl) || 0,
        openComandasCount: Number(r.open_comandas_count) || 0,
        creditLimitBrl: Number(r.credit_limit_brl) || 500000,
        availableCreditBrl: Number(r.available_credit_brl) || 500000,
        lastComandaId: r.last_comanda_id || undefined,
        lastComandaNumber: r.last_comanda_number || undefined,
        lastOperationType: r.last_operation_type || 'comanda_lancada',
        lastOperationAmountBrl: Number(r.last_operation_amount_brl) || 0,
        lastEntryDescription: r.last_entry_description || undefined,
        lastPaymentDate: r.last_payment_date || undefined,
        lastPurchaseDate: r.last_purchase_date || undefined,
        statusCobranca: r.status_cobranca || 'em_dia',
        lastSetorResponsavel: r.setor_responsavel || 'Panificação & Confeitaria Artesanal',
        updatedBy: r.updated_by || 'Sistema',
        updatedAt: r.updated_at || new Date().toISOString(),
      })),
    };

    // Cache locally
    safeWriteJsonFile(LOCAL_STATE_FILE, assembledState);

    // Keep korisko_system_state updated with complete assembled data
    safeSupabaseUpsert('korisko_system_state', {
      id: 'active_state',
      data: assembledState,
      updated_at: new Date().toISOString(),
    }, 'id');

    return assembledState;
  } catch (err: any) {
    console.warn('[Korisko Server] assembleFullStateFromSupabase notice:', err.message);
    return null;
  }
}

// GET System State
app.get('/api/state', async (_req, res) => {
  if (dbInitPromise) await dbInitPromise;

  try {
    // 1. Prioritize live Supabase cloud database
    if (supabaseServer) {
      try {
        const liveState = await assembleFullStateFromSupabase();
        if (liveState && Array.isArray(liveState.products) && liveState.products.length > 0) {
          return res.json({
            source: 'supabase_cloud',
            updatedAt: liveState.timestamp,
            data: liveState,
          });
        }
      } catch (err) {
        console.warn('[Korisko DB] Live Supabase read error, checking local:', err);
      }
    }

    // 2. Read from persistent local file
    const localData = safeReadJsonFile(LOCAL_STATE_FILE);
    if (localData && Array.isArray(localData.products) && localData.products.length > 0) {
      return res.json({
        source: 'banco_operacional',
        updatedAt: localData.timestamp || new Date().toISOString(),
        data: localData,
      });
    }

    // 3. Fallback: seed data
    const defaultSeed = safeReadJsonFile(path.join(DATA_DIR, 'korisko_default_seed.json'));
    if (defaultSeed && defaultSeed.products && defaultSeed.products.length > 0) {
      safeWriteJsonFile(LOCAL_STATE_FILE, defaultSeed);
      return res.json({
        source: 'seed_fallback',
        updatedAt: defaultSeed.timestamp || new Date().toISOString(),
        data: defaultSeed,
      });
    }

    return res.json({
      source: 'none',
      data: null,
    });
  } catch (err: any) {
    console.error('[Korisko DB] Error fetching state:', err);
    return res.status(500).json({ error: 'Erro ao carregar banco de dados', details: err.message });
  }
});

// POST Save System State
app.post('/api/state', async (req, res) => {
  if (dbInitPromise) await dbInitPromise;
  const { data } = req.body;

  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Dados inválidos para gravação' });
  }

  try {
    data.timestamp = new Date().toISOString();

    // Anti-loss guard: If incoming data has empty products/customers, merge with existing
    const currentState = safeReadJsonFile(LOCAL_STATE_FILE);
    if (currentState) {
      if ((!data.products || data.products.length === 0) && currentState.products?.length > 0) {
        data.products = currentState.products;
      }
      if ((!data.customers || data.customers.length === 0) && currentState.customers?.length > 0) {
        data.customers = currentState.customers;
      }
      if ((!data.sales || data.sales.length === 0) && currentState.sales?.length > 0) {
        data.sales = currentState.sales;
      }
    }

    // 1. Primary write: persistent file
    safeWriteJsonFile(LOCAL_STATE_FILE, data);

    // 2. Secondary write: PostgreSQL if connected
    if (isPgConnected && pool) {
      pool.query(
        `INSERT INTO korisko_system_state (id, data, updated_at) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
        ['active_state', JSON.stringify(data)]
      ).catch(err => console.warn('[Korisko DB] PG state mirror warning:', err));
    }

    // 3. Supabase Cloud mirror
    safeSupabaseUpsert('korisko_system_state', {
      id: 'active_state',
      data,
      updated_at: new Date().toISOString(),
    }, 'id');

    // 4. Sync products to Supabase produtos table
    if (supabaseServer && Array.isArray(data.products) && data.products.length > 0) {
      const prodRows = data.products.map((p: any) => ({
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
        updated_at: new Date().toISOString(),
      }));
      supabaseServer.from('produtos').upsert(prodRows, { onConflict: 'id' }).then(() => {}, () => {});
    }

    // 5. Sync customers to Supabase clientes table
    if (supabaseServer && Array.isArray(data.customers) && data.customers.length > 0) {
      const custRows = data.customers.map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || '',
        email: c.email || null,
        document_cpf: c.documentCpf || null,
        address: c.address || null,
        category: c.category || 'varejo',
        credit_limit_brl: Number(c.creditLimitBrl) || 0,
        outstanding_balance_brl: Number(c.outstandingBalanceBrl) || 0,
        loyalty_points: Math.round(Number(c.loyaltyPoints) || 0),
        total_spent_brl: Number(c.totalSpentBrl) || 0,
        purchase_count: Number(c.purchaseCount) || 0,
        last_purchase_date: c.lastPurchaseDate || null,
        birthday: c.birthday || null,
        notes: c.notes || null,
        affiliate_id: c.affiliateId || 'emp-afiliado-guilherme',
        affiliate_name: c.affiliateName || 'Guilherme',
        active: true,
        updated_at: new Date().toISOString(),
      }));
      supabaseServer.from('clientes').upsert(custRows, { onConflict: 'id' }).then(() => {}, () => {});
    }

    return res.json({
      success: true,
      savedTo: isPgConnected ? 'postgresql_and_local' : 'banco_operacional',
      timestamp: data.timestamp,
    });
  } catch (err: any) {
    console.error('[Korisko DB] Error saving state:', err);
    return res.status(500).json({ error: 'Falha ao gravar no banco de dados', details: err.message });
  }
});

// DELETE Single Sale (Admin Only Endpoint)
app.delete('/api/sales/:id', async (req, res) => {
  if (dbInitPromise) await dbInitPromise;
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'ID da venda é obrigatório' });
  }

  try {
    // 1. Update local state file
    const currentState = safeReadJsonFile(LOCAL_STATE_FILE);
    if (currentState && Array.isArray(currentState.sales)) {
      const prevCount = currentState.sales.length;
      currentState.sales = currentState.sales.filter((s: any) => s.id !== id);
      if (currentState.sales.length !== prevCount) {
        currentState.timestamp = new Date().toISOString();
        safeWriteJsonFile(LOCAL_STATE_FILE, currentState);
      }
    }

    // 2. Delete from PostgreSQL if connected
    if (isPgConnected && pool) {
      pool.query('DELETE FROM vendas WHERE id = $1', [id]).catch(() => {});
      if (currentState) {
        pool.query(
          `INSERT INTO korisko_system_state (id, data, updated_at) 
           VALUES ('active_state', $1, NOW()) 
           ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = NOW()`,
          [JSON.stringify(currentState)]
        ).catch(() => {});
      }
    }

    // 3. Delete from Supabase if client is ready
    if (supabaseServer) {
      supabaseServer.from('vendas').delete().eq('id', id).then(
        ({ error }) => {
          if (error && error.code !== 'PGRST205') {
            console.warn('[Korisko Server] Supabase delete sale warning:', error.message);
          }
        },
        () => {}
      );
    }

    return res.json({ success: true, deletedId: id });
  } catch (err: any) {
    console.error('[Korisko DB] Error deleting sale:', err);
    return res.status(500).json({ error: 'Falha ao excluir venda', details: err.message });
  }
});

// GET Backup Points
app.get('/api/backups', async (_req, res) => {
  if (dbInitPromise) await dbInitPromise;

  try {
    // 1. Try PostgreSQL
    if (isPgConnected && pool) {
      try {
        const result = await pool.query(
          'SELECT data FROM korisko_backup_points ORDER BY created_at DESC LIMIT 30'
        );
        if (result.rows.length > 0) {
          return res.json({
            source: 'postgresql',
            backups: result.rows.map(r => r.data),
          });
        }
      } catch {}
    }

    // 2. Read local backups
    const backups = safeReadJsonFile<any[]>(LOCAL_BACKUPS_FILE) || [];
    return res.json({
      source: 'banco_operacional',
      backups,
    });
  } catch (err: any) {
    console.error('[Korisko DB] Error loading backups:', err);
    return res.status(500).json({ error: 'Erro ao carregar pontos de backup', details: err.message });
  }
});

// POST Backup Point
app.post('/api/backups', async (req, res) => {
  if (dbInitPromise) await dbInitPromise;
  const { point } = req.body;

  if (!point || !point.id) {
    return res.status(400).json({ error: 'Ponto de backup inválido' });
  }

  try {
    const list = safeReadJsonFile<any[]>(LOCAL_BACKUPS_FILE) || [];
    const updated = [point, ...list.filter((b: any) => b.id !== point.id)].slice(0, 30);
    safeWriteJsonFile(LOCAL_BACKUPS_FILE, updated);

    if (isPgConnected && pool) {
      pool.query(
        `INSERT INTO korisko_backup_points (id, data, created_at) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (id) DO UPDATE SET data = $2`,
        [point.id, JSON.stringify(point)]
      ).catch(() => {});
    }

    safeSupabaseUpsert('korisko_backup_points', {
      id: point.id,
      data: point,
      created_at: point.timestamp || new Date().toISOString(),
    }, 'id');

    return res.json({ success: true, id: point.id });
  } catch (err: any) {
    console.error('[Korisko DB] Error saving backup:', err);
    return res.status(500).json({ error: 'Falha ao registrar backup', details: err.message });
  }
});

// Reset State to Factory Demo
app.post('/api/reset', async (_req, res) => {
  try {
    if (fs.existsSync(LOCAL_STATE_FILE)) {
      fs.unlinkSync(LOCAL_STATE_FILE);
    }
    return res.json({ success: true, message: 'Banco de dados reinicializado' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Reset State to Factory Zero (Admin Ax Permanently Preserved)
app.post('/api/factory-zero', async (_req, res) => {
  try {
    const adminUser = {
      id: 'emp-admin-ax',
      name: 'Ax',
      email: 'axxeiacompany@gmail.com',
      role: 'admin',
      password: '9APG_47z-EgF4yz',
      pin: '9APG_47z-EgF4yz',
      avatarColor: 'bg-indigo-600',
      allowedFeatures: [
        'dashboard', 'pdv', 'venda_direta', 'loja', 'estoque', 
        'fichas_tecnicas', 'crm', 'caixa', 'mais_vendidos', 
        'metas', 'cambio', 'backup', 'afiliados', 'portal_afiliado'
      ],
      active: true,
    };

    const guilhermeUser = {
      id: 'emp-afiliado-guilherme',
      name: 'Guilherme',
      email: 'guilherme@korisko.com',
      role: 'afiliado',
      password: '1234',
      pin: '1234',
      avatarColor: 'bg-purple-600',
      affiliateCode: 'GUILHERME',
      allowedFeatures: [
        'dashboard', 'crm', 'clientes', 'loja', 'portal_afiliado'
      ],
      active: true,
    };

    const zeroState = {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      employees: [adminUser, guilhermeUser],
      products: [],
      stockMovements: [],
      sales: [],
      currentSession: {
        id: `sess-${Date.now()}`,
        sessionNumber: 1,
        openedAt: new Date().toISOString(),
        closedAt: new Date().toISOString(),
        openedBy: 'Ax',
        closedBy: 'Ax',
        initialFloat: { brl: 0, pyg: 0, usd: 0 },
        status: 'fechado',
        transactions: [],
      },
      sessionHistory: [],
      openComandas: [],
      fornadas: [],
      fichasTecnicas: [],
      customers: [],
      customerEntries: [],
      customerPurchases: [],
      activeCheckouts: [],
      liveDebtorBalances: [],
    };

    safeWriteJsonFile(LOCAL_STATE_FILE, zeroState);
    safeWriteJsonFile(LOCAL_BACKUPS_FILE, []);

    if (isPgConnected && pool) {
      pool.query(`TRUNCATE TABLE produtos; TRUNCATE TABLE vendas; TRUNCATE TABLE caixa_sessoes; TRUNCATE TABLE clientes;`).catch(() => {});
      pool.query(
        `INSERT INTO korisko_system_state (id, data, updated_at) 
         VALUES ('active_state', $1, NOW()) 
         ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = NOW()`,
        [JSON.stringify(zeroState)]
      ).catch(() => {});
    }

    if (supabaseServer) {
      supabaseServer.from('produtos').delete().neq('id', 'none').then(() => {}, () => {});
      supabaseServer.from('vendas').delete().neq('id', 'none').then(() => {}, () => {});
      supabaseServer.from('caixa_sessoes').delete().neq('id', 'none').then(() => {}, () => {});
      supabaseServer.from('clientes').delete().neq('id', 'none').then(() => {}, () => {});
      supabaseServer.from('comandas').delete().neq('id', 'none').then(() => {}, () => {});
      supabaseServer.from('lancamentos_fiado').delete().neq('id', 'none').then(() => {}, () => {});
      supabaseServer.from('registro_compras_clientes').delete().neq('id', 'none').then(() => {}, () => {});
      supabaseServer.from('fluxo_cobrancas_tempo_real').delete().neq('id', 'none').then(() => {}, () => {});
      supabaseServer.from('saldos_devedores_tempo_real').delete().neq('customer_id', 'none').then(() => {}, () => {});
    }

    safeSupabaseUpsert('korisko_system_state', {
      id: 'active_state',
      data: zeroState,
      updated_at: new Date().toISOString(),
    }, 'id');

    return res.json({ success: true, message: 'Sistema zerado para padrão de fábrica com Admin Ax preservado.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Zero all financial and operational numbers for Real Testing while keeping Products, Recipes & Team
app.post('/api/zero-numbers', async (_req, res) => {
  try {
    const currentState = safeReadJsonFile(LOCAL_STATE_FILE);
    const defaultSeed = safeReadJsonFile(path.join(DATA_DIR, 'korisko_default_seed.json'));
    const products = (currentState?.products && currentState.products.length > 0)
      ? currentState.products
      : (defaultSeed?.products || []);
    const employees = (currentState?.employees && currentState.employees.length > 0)
      ? currentState.employees
      : (defaultSeed?.employees || []);
    const fichasTecnicas = currentState?.fichasTecnicas || defaultSeed?.fichasTecnicas || [];
    const goals = currentState?.goals || defaultSeed?.goals || [];
    const exchangeRates = currentState?.exchangeRates || defaultSeed?.exchangeRates || { BRL_TO_PYG: 1, USD_TO_BRL: 1, USD_TO_PYG: 1 };
    const customers = (currentState?.customers || [])
      .filter((c: any) => !['cust-1', 'cust-2', 'cust-3', 'cust-4', 'cust-5'].includes(c.id))
      .map((c: any) => ({
        ...c,
        outstandingBalanceBrl: 0,
        totalSpentBrl: 0,
        purchaseCount: 0,
        loyaltyPoints: 0,
      }));

    const zeroedTestState = {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      employees,
      products,
      stockMovements: [],
      sales: [],
      currentSession: {
        id: `sess-${Date.now()}`,
        sessionNumber: 1,
        openedAt: new Date().toISOString(),
        openedBy: 'Ax',
        initialFloat: { brl: 0, pyg: 0, usd: 0 },
        status: 'aberto',
        transactions: [],
      },
      sessionHistory: [],
      exchangeRates,
      goals,
      openComandas: [],
      fornadas: [],
      fichasTecnicas,
      customers,
      customerEntries: [],
      customerPurchases: [],
      activeCheckouts: [],
      liveDebtorBalances: [],
    };

    safeWriteJsonFile(LOCAL_STATE_FILE, zeroedTestState);

    if (supabaseServer) {
      supabaseServer.from('vendas').delete().neq('id', 'none').then(() => {}, () => {});
      supabaseServer.from('caixa_sessoes').delete().neq('id', 'none').then(() => {}, () => {});
      supabaseServer.from('comandas').delete().neq('id', 'none').then(() => {}, () => {});
      supabaseServer.from('lancamentos_fiado').delete().neq('id', 'none').then(() => {}, () => {});
      supabaseServer.from('registro_compras_clientes').delete().neq('id', 'none').then(() => {}, () => {});
      supabaseServer.from('fluxo_cobrancas_tempo_real').delete().neq('id', 'none').then(() => {}, () => {});
      supabaseServer.from('saldos_devedores_tempo_real').delete().neq('customer_id', 'none').then(() => {}, () => {});
      supabaseServer.from('clientes').delete().in('id', ['cust-1', 'cust-2', 'cust-3', 'cust-4', 'cust-5']).then(() => {}, () => {});
      supabaseServer
        .from('clientes')
        .update({ outstanding_balance_brl: 0, total_spent_brl: 0, purchase_count: 0, loyalty_points: 0 })
        .neq('id', 'none')
        .then(() => {}, () => {});
    }

    safeSupabaseUpsert('korisko_system_state', {
      id: 'active_state',
      data: zeroedTestState,
      updated_at: new Date().toISOString(),
    }, 'id');

    return res.json({ success: true, data: zeroedTestState });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// VS CODE PROJECT EXPORT (.ZIP)
// ==========================================
app.get(['/api/download-zip', '/download', '/download-project'], (_req, res) => {
  const zipPath = path.resolve(process.cwd(), 'public', 'korisko-pdv-projeto.zip');
  if (fs.existsSync(zipPath)) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="korisko-pdv-projeto.zip"');
    return res.sendFile(zipPath);
  }
  return res.status(404).json({ error: 'Arquivo zip do projeto ainda não gerado.' });
});

// ==========================================
// STATIC ASSETS & VITE INTEGRATION
// ==========================================
// Fallback for stale/cached hashed CSS bundles (e.g. index-B5XNrk3e.css):
// Serves the current compiled CSS bundle so cached pages never 404
app.get(['/assets/index-*.css', '*/index-*.css'], (_req, res, next) => {
  const assetsDir = path.resolve(process.cwd(), 'dist', 'assets');
  if (fs.existsSync(assetsDir)) {
    try {
      const files = fs.readdirSync(assetsDir);
      const cssFile = files.find(f => f.startsWith('index-') && f.endsWith('.css'));
      if (cssFile) {
        res.setHeader('Content-Type', 'text/css');
        return res.sendFile(path.join(assetsDir, cssFile));
      }
    } catch {}
  }
  res.setHeader('Content-Type', 'text/css');
  return res.send('/* CSS bundle updated */');
});

// Fallback for stale/cached hashed JS bundles
app.get(['/assets/index-*.js', '*/index-*.js'], (_req, res, next) => {
  const assetsDir = path.resolve(process.cwd(), 'dist', 'assets');
  if (fs.existsSync(assetsDir)) {
    try {
      const files = fs.readdirSync(assetsDir);
      const jsFile = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
      if (jsFile) {
        res.setHeader('Content-Type', 'application/javascript');
        return res.sendFile(path.join(assetsDir, jsFile));
      }
    } catch {}
  }
  next();
});

async function start() {
  // Ensure generated Combo 3 Brownies image is synced to public/images/products/combo-brownies.jpg and dist/
  try {
    const generatedComboImg = path.resolve(process.cwd(), 'src', 'assets', 'images', 'combo_tres_brownies_1790886603094.jpg');
    if (fs.existsSync(generatedComboImg)) {
      const publicTarget = path.resolve(process.cwd(), 'public', 'images', 'products', 'combo-brownies.jpg');
      fs.mkdirSync(path.dirname(publicTarget), { recursive: true });
      fs.copyFileSync(generatedComboImg, publicTarget);

      const distTarget = path.resolve(process.cwd(), 'dist', 'images', 'products', 'combo-brownies.jpg');
      if (fs.existsSync(path.resolve(process.cwd(), 'dist'))) {
        fs.mkdirSync(path.dirname(distTarget), { recursive: true });
        fs.copyFileSync(generatedComboImg, distTarget);
      }
    }
  } catch (imgErr) {
    console.warn('[Korisko Server] Image sync notice:', imgErr);
  }

  // Always serve /src/assets/images and /images/products directly
  const srcAssetsImagesDir = path.resolve(process.cwd(), 'src', 'assets', 'images');
  if (fs.existsSync(srcAssetsImagesDir)) {
    app.use('/src/assets/images', express.static(srcAssetsImagesDir));
  }
  const publicProductsDir = path.resolve(process.cwd(), 'public', 'images', 'products');
  if (fs.existsSync(publicProductsDir)) {
    app.use('/images/products', express.static(publicProductsDir));
  }

  if (isProduction) {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
          }
        }
      }));
      app.get('*', (_req, res, next) => {
        if (_req.path.startsWith('/api') || _req.path.startsWith('/assets')) {
          return next();
        }
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.warn('Warning: dist/ folder not found. Run npm run build first.');
    }
  } else {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // Immediately hydrate and synchronize state from Supabase Cloud on server startup
  try {
    await assembleFullStateFromSupabase();
    console.log('[Korisko Server] Estado inicial sincronizado com sucesso a partir do banco de dados na nuvem.');
  } catch (syncErr: any) {
    console.warn('[Korisko Server] Aviso na sincronização inicial do banco:', syncErr.message);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Korisko Server] Banco de dados operacional em http://0.0.0.0:${PORT}`);
  });
}

start().catch(err => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
