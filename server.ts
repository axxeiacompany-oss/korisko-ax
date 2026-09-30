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
async function start() {
  if (isProduction) {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
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
