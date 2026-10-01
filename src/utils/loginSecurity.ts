import { supabase } from '../lib/supabase';

export type SecurityEventType =
  | 'login_sucesso'
  | 'login_falha'
  | 'bloqueio_forca_bruta'
  | 'logout'
  | 'troca_operador'
  | 'cadastro_conta'
  | 'alteracao_credencial';

export interface LoginAuditLog {
  id: string;
  eventType: SecurityEventType;
  identifier: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  ipOrDevice: string;
  userAgent: string;
  success: boolean;
  details: string;
  createdAt: string;
}

interface LockoutRecord {
  failedAttempts: number;
  firstFailedAt: number;
  lockedUntil: number | null;
}

const LOCKOUT_STORAGE_KEY = 'KORISKO_LOGIN_LOCKOUT_V1';
const AUDIT_STORAGE_KEY = 'KORISKO_LOGIN_AUDIT_LOGS_V1';
const SESSION_META_KEY = 'KORISKO_SECURE_SESSION_META_V1';

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds lockout
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes window

// Session TTL: 8 hours for temporary session, 7 days for remembered device
const SESSION_TTL_TEMP_MS = 8 * 60 * 60 * 1000;
const SESSION_TTL_REMEMBER_MS = 7 * 24 * 60 * 60 * 1000;

function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'server';
  const nav = window.navigator;
  const raw = `${nav.platform || 'web'}|${nav.language || 'pt'}|${window.screen?.width || 0}x${window.screen?.height || 0}`;
  return raw;
}

/**
 * Deterministic SHA-256 hash using Web Crypto API (with fallback for non-HTTPS local preview)
 */
export async function hashPasswordSha256(plainText: string, salt = 'korizko-artesanal-salt-v1'): Promise<string> {
  const input = `${salt}:${plainText}`;
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return 'sha256:' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {}
  // Fallback deterministic hash if SubtleCrypto is unavailable
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0, ch; i < input.length; i++) {
    ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `fnv:${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
}

export async function verifyStoredPassword(inputPassword: string, storedSecret?: string): Promise<boolean> {
  if (!storedSecret || !inputPassword) return false;
  const cleanInput = inputPassword.trim();
  const cleanStored = storedSecret.trim();

  if (cleanStored.startsWith('sha256:') || cleanStored.startsWith('fnv:')) {
    const hashed = await hashPasswordSha256(cleanInput);
    return hashed === cleanStored;
  }

  // Constant-time-like comparison for plain credentials
  if (cleanInput.length !== cleanStored.length) return false;
  let diff = 0;
  for (let i = 0; i < cleanInput.length; i++) {
    diff |= cleanInput.charCodeAt(i) ^ cleanStored.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Password strength evaluation
 */
export function evaluatePasswordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4;
  labelPt: string;
  labelEs: string;
  isValid: boolean;
} {
  const pwd = password.trim();
  if (!pwd) {
    return { score: 0, labelPt: 'Muito curta', labelEs: 'Muy corta', isValid: false };
  }
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score++;

  const clamped = Math.min(4, Math.max(1, score)) as 1 | 2 | 3 | 4;
  const labelsPt: Record<number, string> = {
    1: 'Fraca',
    2: 'Razoável',
    3: 'Forte',
    4: 'Muito Forte',
  };
  const labelsEs: Record<number, string> = {
    1: 'Débil',
    2: 'Regular',
    3: 'Fuerte',
    4: 'Muy Fuerte',
  };

  return {
    score: pwd.length < 6 ? 0 : clamped,
    labelPt: pwd.length < 6 ? 'Mínimo 6 caracteres' : labelsPt[clamped],
    labelEs: pwd.length < 6 ? 'Mínimo 6 caracteres' : labelsEs[clamped],
    isValid: pwd.length >= 6,
  };
}

/**
 * Brute-force lockout state management
 */
function loadLockoutMap(): Record<string, LockoutRecord> {
  try {
    const raw = localStorage.getItem(LOCKOUT_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) || {};
    }
  } catch {}
  return {};
}

function saveLockoutMap(map: Record<string, LockoutRecord>): void {
  try {
    localStorage.setItem(LOCKOUT_STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

export function checkLoginLockout(identifier?: string): {
  isLocked: boolean;
  remainingSeconds: number;
  failedAttempts: number;
  remainingAttempts: number;
} {
  const map = loadLockoutMap();
  const now = Date.now();
  const key = (identifier || 'global').trim().toLowerCase() || 'global';
  const globalRec = map['__device_global__'];
  const userRec = map[key];

  // Check both device-wide and identifier-specific lockouts
  const activeLockUntil = Math.max(globalRec?.lockedUntil || 0, userRec?.lockedUntil || 0);
  if (activeLockUntil > now) {
    return {
      isLocked: true,
      remainingSeconds: Math.ceil((activeLockUntil - now) / 1000),
      failedAttempts: Math.max(globalRec?.failedAttempts || 0, userRec?.failedAttempts || 0),
      remainingAttempts: 0,
    };
  }

  // Reset expired lockouts
  const attempts = userRec && now - userRec.firstFailedAt < ATTEMPT_WINDOW_MS ? userRec.failedAttempts : 0;
  return {
    isLocked: false,
    remainingSeconds: 0,
    failedAttempts: attempts,
    remainingAttempts: Math.max(0, MAX_FAILED_LOGIN_ATTEMPTS - attempts),
  };
}

export function recordFailedLoginAttempt(identifier: string): {
  isLocked: boolean;
  remainingSeconds: number;
  failedAttempts: number;
  remainingAttempts: number;
} {
  const map = loadLockoutMap();
  const now = Date.now();
  const key = (identifier || 'global').trim().toLowerCase() || 'global';

  const updateRecord = (rec?: LockoutRecord): LockoutRecord => {
    if (!rec || (rec.lockedUntil && rec.lockedUntil <= now) || now - rec.firstFailedAt > ATTEMPT_WINDOW_MS) {
      return {
        failedAttempts: 1,
        firstFailedAt: now,
        lockedUntil: null,
      };
    }
    const nextAttempts = rec.failedAttempts + 1;
    const lockedUntil = nextAttempts >= MAX_FAILED_LOGIN_ATTEMPTS ? now + LOCKOUT_DURATION_MS : null;
    return {
      failedAttempts: nextAttempts,
      firstFailedAt: rec.firstFailedAt,
      lockedUntil,
    };
  };

  map[key] = updateRecord(map[key]);
  map['__device_global__'] = updateRecord(map['__device_global__']);
  saveLockoutMap(map);

  return checkLoginLockout(key);
}

export function clearLoginAttempts(identifier?: string): void {
  const map = loadLockoutMap();
  if (identifier) {
    delete map[identifier.trim().toLowerCase()];
  }
  delete map['__device_global__'];
  saveLockoutMap(map);
}

/**
 * Session Integrity & Expiration Management
 */
export interface SecureSessionMeta {
  userId: string;
  email: string;
  role: string;
  issuedAt: number;
  expiresAt: number;
  rememberDevice: boolean;
  fingerprint: string;
}

export function createSecureSessionMeta(params: {
  userId: string;
  email: string;
  role: string;
  rememberDevice: boolean;
}): SecureSessionMeta {
  const now = Date.now();
  const ttl = params.rememberDevice ? SESSION_TTL_REMEMBER_MS : SESSION_TTL_TEMP_MS;
  const meta: SecureSessionMeta = {
    userId: params.userId,
    email: params.email,
    role: params.role,
    issuedAt: now,
    expiresAt: now + ttl,
    rememberDevice: params.rememberDevice,
    fingerprint: getDeviceFingerprint(),
  };
  try {
    localStorage.setItem(SESSION_META_KEY, JSON.stringify(meta));
    sessionStorage.setItem('KORISKO_ACTIVE_TAB_SESSION', 'true');
  } catch {}
  return meta;
}

export function isSessionMetaValid(): { valid: boolean; reason?: string; meta?: SecureSessionMeta } {
  try {
    const raw = localStorage.getItem(SESSION_META_KEY);
    if (!raw) return { valid: false, reason: 'missing_meta' };
    const meta: SecureSessionMeta = JSON.parse(raw);
    const now = Date.now();

    if (!meta.expiresAt || now > meta.expiresAt) {
      clearSecureSessionMeta();
      return { valid: false, reason: 'expired' };
    }

    // If user chose NOT to remember device, require active browser session tab
    if (!meta.rememberDevice) {
      const hasTabSession = sessionStorage.getItem('KORISKO_ACTIVE_TAB_SESSION') === 'true';
      if (!hasTabSession) {
        clearSecureSessionMeta();
        return { valid: false, reason: 'tab_closed' };
      }
    }

    return { valid: true, meta };
  } catch {
    return { valid: false, reason: 'corrupted' };
  }
}

export function clearSecureSessionMeta(): void {
  try {
    localStorage.removeItem(SESSION_META_KEY);
    localStorage.removeItem('KORISKO_SAVED_PROFILE');
    localStorage.removeItem('KORISKO_SAVED_USER');
    localStorage.removeItem('KORISKO_AUTH_SESSION');
    localStorage.removeItem('KORISKO_REMEMBER_DEVICE');
    sessionStorage.removeItem('KORISKO_AUTH_SESSION');
    sessionStorage.removeItem('KORISKO_ACTIVE_TAB_SESSION');
  } catch {}
}

/**
 * Security Audit Log (Local + Supabase `auditoria_acessos_logins`)
 */
export function getLoginAuditLogs(): LoginAuditLog[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export async function recordLoginAuditEvent(params: {
  eventType: SecurityEventType;
  identifier: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  success: boolean;
  details: string;
}): Promise<LoginAuditLog> {
  const entry: LoginAuditLog = {
    id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    eventType: params.eventType,
    identifier: params.identifier.trim().toLowerCase(),
    userId: params.userId,
    userName: params.userName,
    userRole: params.userRole,
    ipOrDevice: getDeviceFingerprint(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 140) : 'system',
    success: params.success,
    details: params.details,
    createdAt: new Date().toISOString(),
  };

  try {
    const existing = getLoginAuditLogs();
    const updated = [entry, ...existing].slice(0, 100);
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  // Persist asynchronously to Supabase dedicated table `auditoria_acessos_logins`
  try {
    await supabase.from('auditoria_acessos_logins').insert({
      id: entry.id,
      event_type: entry.eventType,
      identifier: entry.identifier,
      user_id: entry.userId || null,
      user_name: entry.userName || null,
      user_role: entry.userRole || null,
      device_fingerprint: entry.ipOrDevice,
      user_agent: entry.userAgent,
      success: entry.success,
      details: entry.details,
      created_at: entry.createdAt,
    });
  } catch {}

  return entry;
}
