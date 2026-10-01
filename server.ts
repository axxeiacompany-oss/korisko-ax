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

function normalizeSupabaseUrl(url: string): string {
  if (!url) return SUPABASE_DEFAULT_URL;
  return url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || SUPABASE_DEFAULT_URL);
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_DEFAULT_KEY;

let supabaseServer: SupabaseClient | null = null;
try {
  supabaseServer = createClient(supabaseUrl, supabaseAnonKey);
} catch (err) {
  console.warn('[Korisko Server] Supabase client init notice:', err);
}

function safeSupabaseUpsert(table: string, payload: any, onConflict: string) {
  if (!supabaseServer) return;
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
        err => {
          console.warn(`[Korisko Server] Supabase mirror exception (${table}):`, err);
        }
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

// Persistent Storage Paths
const DATA_DIR = path.resolve(process.cwd(), 'data');
const LOCAL_STATE_FILE = path.join(DATA_DIR, 'korisko_state.json');
const LOCAL_BACKUPS_FILE = path.join(DATA_DIR, 'korisko_backups.json');

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

// Optional PostgreSQL setup if DATABASE_URL is provided (e.g. Railway / Supabase direct postgres)
const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_PUBLIC_URL;
let pool: pg.Pool | null = null;
let isPgConnected = false;

async function initPostgres() {
  if (!dbUrl) {
    console.log('[Korisko DB] Motor de banco de dados nativo ativo (Persistência em Disco e Memória).');
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

    client.release();
    isPgConnected = true;
  } catch (err) {
    console.warn('[Korisko DB] PostgreSQL opcional não conectado, operando com banco nativo local:', err);
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

  const currentState = safeReadJsonFile(LOCAL_STATE_FILE);
  const productsCount = currentState?.products?.length || 0;
  const salesCount = currentState?.sales?.length || 0;
  const customersCount = currentState?.customers?.length || 0;

  res.json({
    status: 'ok',
    databaseConnected: true,
    mode: isPgConnected ? 'postgresql' : (supabaseServer ? 'supabase_cloud' : 'banco_operacional'),
    supabaseConnected: Boolean(supabaseServer),
    supabaseUrl,
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

// GET System State
app.get('/api/state', async (_req, res) => {
  if (dbInitPromise) await dbInitPromise;

  try {
    // 1. Try PostgreSQL if active
    if (isPgConnected && pool) {
      try {
        const result = await pool.query(
          'SELECT data, updated_at FROM korisko_system_state WHERE id = $1',
          ['active_state']
        );
        if (result.rows.length > 0 && result.rows[0].data) {
          return res.json({
            source: 'postgresql',
            updatedAt: result.rows[0].updated_at,
            data: result.rows[0].data,
          });
        }
      } catch (err) {
        console.warn('[Korisko DB] Read PG fallback to local:', err);
      }
    }

    // 2. Try Supabase Cloud
    if (supabaseServer) {
      try {
        const { data: supaRow, error } = await supabaseServer
          .from('korisko_system_state')
          .select('data, updated_at')
          .eq('id', 'active_state')
          .maybeSingle();
        if (!error && supaRow && supaRow.data && supaRow.data.products?.length > 0) {
          safeWriteJsonFile(LOCAL_STATE_FILE, supaRow.data);
          return res.json({
            source: 'supabase_cloud',
            updatedAt: supaRow.updated_at,
            data: supaRow.data,
          });
        }
      } catch (err) {
        console.warn('[Korisko DB] Read Supabase fallback to local:', err);
      }
    }

    // 3. Read from persistent local file
    let localData = safeReadJsonFile(LOCAL_STATE_FILE);
    if (!localData || !localData.products || localData.products.length === 0) {
      const defaultSeed = safeReadJsonFile(path.join(DATA_DIR, 'korisko_default_seed.json'));
      if (defaultSeed && defaultSeed.products && defaultSeed.products.length > 0) {
        safeWriteJsonFile(LOCAL_STATE_FILE, defaultSeed);
        localData = defaultSeed;
      }
    }

    if (localData && localData.products && localData.products.length > 0) {
      return res.json({
        source: 'banco_operacional',
        updatedAt: localData.timestamp || new Date().toISOString(),
        data: localData,
      });
    }

    // No valid state saved yet
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
    const defaultSeed = safeReadJsonFile(path.join(DATA_DIR, 'korisko_default_seed.json'));
    const adminUser = {
      id: 'emp-admin-ax',
      name: 'Ax',
      email: 'axxeiacompany@gmail.com',
      role: 'admin',
      password: '9APG_47z-EgF4yz',
      pin: '9APG_47z-EgF4yz',
      avatarColor: 'bg-indigo-600',
      allowedFeatures: [
        'dashboard', 'pdv', 'venda_direta', 'estoque', 
        'fichas_tecnicas', 'crm', 'caixa', 'mais_vendidos', 
        'metas', 'cambio', 'backup', 'afiliados'
      ],
      active: true,
    };

    const zeroState = {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      employees: [adminUser],
      products: [],
      stockMovements: [],
      sales: [],
      currentSession: {
        id: `sess-${Date.now()}`,
        openedAt: new Date().toISOString(),
        closedAt: new Date().toISOString(),
        openedById: 'emp-admin-ax',
        openedByName: 'Ax',
        initialCashBrl: 0,
        status: 'fechado',
        movements: [],
        totalSalesBrl: 0,
        differenceBrl: 0,
      },
      sessionHistory: [],
      openComandas: [],
      fornadas: [],
      fichasTecnicas: [],
      customers: [],
      customerEntries: [],
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
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Korisko Server] Banco de dados operacional em http://0.0.0.0:${PORT}`);
  });
}

start().catch(err => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
