import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;
const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

// Increase payload limit for database state and image backups
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Database connection setup (PostgreSQL - Native to Railway)
const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_PUBLIC_URL;
let pool: pg.Pool | null = null;
let isDbConnected = false;
let dbInitPromise: Promise<void> | null = null;

// Local fallback file storage
const DATA_DIR = path.resolve(process.cwd(), 'data');
const LOCAL_STATE_FILE = path.join(DATA_DIR, 'korisko_state.json');
const LOCAL_BACKUPS_FILE = path.join(DATA_DIR, 'korisko_backups.json');

function ensureLocalDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (err) {
      console.warn('Could not create local data directory:', err);
    }
  }
}

async function initDatabase() {
  if (!dbUrl) {
    console.log('[Korisko DB] No DATABASE_URL provided. Operating in high-speed local storage mode.');
    return;
  }

  try {
    const isLocalhost = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
    pool = new Pool({
      connectionString: dbUrl,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });

    // Test connection
    const client = await pool.connect();
    console.log('[Korisko DB] Successfully connected to Railway PostgreSQL database!');
    
    // Create necessary tables if they do not exist
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
    isDbConnected = true;
  } catch (err) {
    console.error('[Korisko DB] Error connecting to PostgreSQL database:', err);
    isDbConnected = false;
  }
}

dbInitPromise = initDatabase();

// ==========================================
// API ROUTES
// ==========================================

// Health & System Status endpoint
app.get('/api/health', async (_req, res) => {
  if (dbInitPromise) await dbInitPromise;

  res.json({
    status: 'ok',
    mode: isDbConnected ? 'railway_postgres' : 'local_storage',
    databaseConnected: isDbConnected,
    hasDatabaseUrl: Boolean(dbUrl),
    railwayDetected: Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_STATIC_URL),
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// GET System State
app.get('/api/state', async (_req, res) => {
  if (dbInitPromise) await dbInitPromise;

  try {
    if (isDbConnected && pool) {
      const result = await pool.query(
        'SELECT data, updated_at FROM korisko_system_state WHERE id = $1',
        ['active_state']
      );

      if (result.rows.length > 0) {
        return res.json({
          source: 'railway_postgres',
          updatedAt: result.rows[0].updated_at,
          data: result.rows[0].data,
        });
      }
    }

    // Fallback: Check local filesystem
    if (fs.existsSync(LOCAL_STATE_FILE)) {
      try {
        const raw = fs.readFileSync(LOCAL_STATE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return res.json({
          source: 'local_storage',
          updatedAt: new Date().toISOString(),
          data: parsed,
        });
      } catch (err) {
        console.warn('Error reading local state file:', err);
      }
    }

    // No saved state yet on server
    return res.json({
      source: 'none',
      data: null,
    });
  } catch (err: any) {
    console.error('Error fetching state:', err);
    return res.status(500).json({ error: 'Failed to fetch state', details: err.message });
  }
});

// POST / Save System State
app.post('/api/state', async (req, res) => {
  if (dbInitPromise) await dbInitPromise;
  const { data } = req.body;

  if (!data) {
    return res.status(400).json({ error: 'Missing state data in request body' });
  }

  let savedTo = 'none';

  try {
    if (isDbConnected && pool) {
      await pool.query(
        `INSERT INTO korisko_system_state (id, data, updated_at) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
        ['active_state', JSON.stringify(data)]
      );
      savedTo = 'railway_postgres';
    }

    // Always mirror to local file as immediate redundant backup
    try {
      ensureLocalDir();
      fs.writeFileSync(LOCAL_STATE_FILE, JSON.stringify(data, null, 2), 'utf-8');
      if (savedTo === 'none') savedTo = 'local_file';
    } catch (err) {
      console.warn('Local state write warning:', err);
    }

    return res.json({
      success: true,
      savedTo,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error saving state:', err);
    return res.status(500).json({ error: 'Failed to save state', details: err.message });
  }
});

// GET Backup Points
app.get('/api/backups', async (_req, res) => {
  if (dbInitPromise) await dbInitPromise;

  try {
    if (isDbConnected && pool) {
      const result = await pool.query(
        'SELECT data FROM korisko_backup_points ORDER BY created_at DESC LIMIT 30'
      );
      if (result.rows.length > 0) {
        return res.json({
          source: 'railway_postgres',
          backups: result.rows.map(r => r.data),
        });
      }
    }

    // Fallback: local file
    if (fs.existsSync(LOCAL_BACKUPS_FILE)) {
      const raw = fs.readFileSync(LOCAL_BACKUPS_FILE, 'utf-8');
      const backups = JSON.parse(raw);
      return res.json({
        source: 'local_file',
        backups,
      });
    }

    return res.json({ source: 'none', backups: [] });
  } catch (err: any) {
    console.error('Error loading backups:', err);
    return res.status(500).json({ error: 'Failed to load backups', details: err.message });
  }
});

// POST Backup Point
app.post('/api/backups', async (req, res) => {
  if (dbInitPromise) await dbInitPromise;
  const { point } = req.body;

  if (!point || !point.id) {
    return res.status(400).json({ error: 'Invalid backup point' });
  }

  try {
    if (isDbConnected && pool) {
      await pool.query(
        `INSERT INTO korisko_backup_points (id, data, created_at) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (id) DO UPDATE SET data = $2`,
        [point.id, JSON.stringify(point)]
      );
    }

    // Mirror to local file
    try {
      ensureLocalDir();
      let list = [];
      if (fs.existsSync(LOCAL_BACKUPS_FILE)) {
        list = JSON.parse(fs.readFileSync(LOCAL_BACKUPS_FILE, 'utf-8'));
      }
      list = [point, ...list.filter((b: any) => b.id !== point.id)].slice(0, 30);
      fs.writeFileSync(LOCAL_BACKUPS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Local backup write warning:', err);
    }

    return res.json({ success: true, id: point.id });
  } catch (err: any) {
    console.error('Error saving backup:', err);
    return res.status(500).json({ error: 'Failed to save backup', details: err.message });
  }
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
    console.log(`[Korisko Server] Running on http://0.0.0.0:${PORT} (env: ${process.env.NODE_ENV || 'development'})`);
  });
}

start().catch(err => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
