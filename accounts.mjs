/** Private account store. Node 22+, no third-party auth dependency. */
import { readFile, writeFile, rename, mkdir, chmod, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes, createHash, createHmac, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { privateRoot } from './paths.mjs';
const riskModel = createRequire(import.meta.url)('../web/risk-model.js');
const scryptAsync = promisify(scrypt);
const ACCOUNTS = () => join(privateRoot(), 'accounts.json');
const MAX_STATE = 1_000_000;
const SESSION_AGE = 30 * 24 * 60 * 60 * 1000;
const revokedTokens = new Set();
const sessionSecret = () => process.env.SESSION_SECRET || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.KV_REST_API_TOKEN || 'pm-v4-local-session-secret';
const intEnv = (name, fallback) => {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};
const accounts = new Map(),
  sessions = new Map(),
  attempts = new Map(),
  accountAttempts = new Map(),
  signups = new Map();
let ready = null,
  writeChain = Promise.resolve();
const digest = (x) => createHash('sha256').update(x).digest('hex');
// Async scrypt runs on the libuv pool, so a burst of logins cannot stall the event loop.
// At most PM_MAX_HASHES (default 4) hashes run at once; extra signups and logins get 429 instead of queueing.
let hashing = 0;
const key = async (p) => {
  if (hashing >= intEnv('PM_MAX_HASHES', 4))
    throw Object.assign(new Error('Server busy. Try again in a moment.'), { status: 429 });
  hashing++;
  try {
    return (
      await scryptAsync(p.password, Buffer.from(p.salt, 'hex'), 64, { N: 16384, r: 8, p: 1 })
    ).toString('hex');
  } finally {
    hashing--;
  }
};
const runWrite = (job) => (writeChain = writeChain.catch(() => {}).then(job));
function validZone(z) {
  try {
    new Intl.DateTimeFormat('en', { timeZone: z }).format(new Date());
    return true;
  } catch {
    return false;
  }
}
const zone = (z) => (validZone(String(z || '')) ? String(z) : 'America/New_York');
const lang = (l) => (['en', 'es'].includes(l) ? l : 'en');
const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  language: u.language,
  timezone: u.timezone,
  weeklyEnabled: !!u.weeklyEnabled,
  createdAt: u.createdAt,
  lastReportDate: u.lastReportDate || null,
  emailVerified: !!u.emailVerified,
});
function cookie(req, token) {
  const secure = Boolean(process.env.VERCEL || req.headers?.['x-forwarded-proto'] === 'https' || process.env.PUBLIC_ORIGIN?.startsWith('https://') || req.socket?.encrypted);
  return `pm_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${SESSION_AGE / 1000}${secure ? '; Secure' : ''}`;
}
export function clearCookie(req) {
  return `pm_session=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${(process.env.VERCEL || req.headers?.['x-forwarded-proto'] === 'https' || process.env.PUBLIC_ORIGIN?.startsWith('https://') || req.socket?.encrypted) ? '; Secure' : ''}`;
}
export async function initAccounts() {
  if (ready) return ready;
  ready = (async () => {
    await mkdir(privateRoot(), { recursive: true, mode: 0o700 });
    try {
      await chmod(privateRoot(), 0o700);
    } catch {}
    try {
      const rows = JSON.parse(await readFile(ACCOUNTS(), 'utf8'));
      for (const x of rows) if (x.id && x.email && x.salt && x.hash) accounts.set(x.id, x);
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  })();
  return ready;
}
async function persist() {
  await initAccounts();
  return runWrite(async () => {
    const file = ACCOUNTS(),
      tmp = file + '.tmp-' + process.pid;
    await writeFile(tmp, JSON.stringify([...accounts.values()], null, 2), { mode: 0o600 });
    await rename(tmp, file);
    try {
      await chmod(file, 0o600);
    } catch {}
  });
}
const LOCK_MS = 15 * 60_000;
// One failure counter per IP (7 tries) and one per email address (10 tries), each locking for 15 minutes.
// The email counter also covers addresses with no account, so a lockout reveals nothing.
function throttle(map, k, failed, max) {
  const now = Date.now(),
    x = map.get(k) || { count: 0, until: 0 };
  if (x.until > now) return false;
  if (!failed) {
    map.delete(k);
    return true;
  }
  x.count++;
  if (x.count >= max) {
    x.count = 0;
    x.until = now + LOCK_MS;
  }
  map.set(k, x);
  return true;
}
const open = (map, k) => {
  const x = map.get(k);
  return !x || x.until <= Date.now();
};
export function canAttempt(ip) {
  return open(attempts, ip);
}
// Signups per IP in a rolling hour; PM_SIGNUPS_PER_IP_HOUR overrides the default of 5.
function allowSignup(ip) {
  const now = Date.now(),
    recent = (signups.get(ip) || []).filter((t) => t > now - 60 * 60_000);
  if (recent.length >= intEnv('PM_SIGNUPS_PER_IP_HOUR', 5)) {
    signups.set(ip, recent);
    return false;
  }
  recent.push(now);
  signups.set(ip, recent);
  return true;
}
const tooMany = () => Object.assign(new Error('Too many attempts. Try again later.'), { status: 429 });
function makeSession(id) {
  const until = Date.now() + SESSION_AGE;
  const u = accounts.get(id);
  const body = Buffer.from(JSON.stringify({
    id,
    until,
    email: u?.email || '',
    language: u?.language || 'es',
    timezone: u?.timezone || 'America/Lima',
    nonce: randomBytes(12).toString('base64url')
  })).toString('base64url');
  const sig = createHmac('sha256', sessionSecret()).update(body).digest('base64url');
  const token = `${body}.${sig}`;
  sessions.set(digest(token), { id, until });
  return token;
}
export async function register(req, { email, password, language, timezone }) {
  await initAccounts();
  if (!allowSignup(req.socket?.remoteAddress || 'unknown')) throw tooMany();
  const normalized = String(email || '')
    .trim()
    .toLowerCase();
  if (!/^[^\s@]{1,80}@[^\s@]{1,160}\.[^\s@]{2,}$/.test(normalized))
    throw Object.assign(new Error('Enter a valid email address.'), { status: 400 });
  if (typeof password !== 'string' || password.length < 12 || password.length > 160)
    throw Object.assign(new Error('Password must contain 12–160 characters.'), { status: 400 });
  if ([...accounts.values()].some((u) => u.email === normalized))
    throw Object.assign(new Error('Account already exists. Sign in instead.'), { status: 409 });
  const id = randomBytes(16).toString('hex'),
    salt = randomBytes(24).toString('hex'),
    hash = await key({ password, salt });
  // Re-check after the async hash: a parallel signup for the same address may have finished first.
  if ([...accounts.values()].some((u) => u.email === normalized))
    throw Object.assign(new Error('Account already exists. Sign in instead.'), { status: 409 });
  const u = {
    id,
    email: normalized,
    salt,
    hash,
    language: lang(language),
    timezone: zone(timezone),
    weeklyEnabled: true,
    emailVerified: false,
    verificationHash: null,
    verificationExpires: null,
    createdAt: new Date().toISOString(),
    lastReportDate: null,
  };
  accounts.set(id, u);
  await persist();
  const token = makeSession(id);
  return { user: publicUser(u), cookie: cookie(req, token) };
}
export async function login(req, { email, password }) {
  await initAccounts();
  const ip = req.socket.remoteAddress || 'unknown',
    normalized = String(email || '')
      .trim()
      .toLowerCase()
      .slice(0, 260);
  if (!canAttempt(ip) || !open(accountAttempts, normalized)) throw tooMany();
  // Count the attempt as a failure before hashing, so parallel guesses cannot all slip past the limit;
  // a correct password clears both counters below.
  throttle(attempts, ip, true, 7);
  throttle(accountAttempts, normalized, true, intEnv('PM_LOGIN_FAILURES_PER_ACCOUNT', 10));
  const u = [...accounts.values()].find((x) => x.email === normalized);
  const salt = u?.salt || '000000000000000000000000000000000000000000000000';
  const candidate = Buffer.from(await key({ password: String(password || '').slice(0, 200), salt }), 'hex');
  const actual = Buffer.from(u?.hash || '0'.repeat(128), 'hex');
  if (!u || !timingSafeEqual(candidate, actual))
    throw Object.assign(new Error('Incorrect email or password.'), { status: 401 });
  throttle(attempts, ip, false);
  throttle(accountAttempts, normalized, false);
  const token = makeSession(u.id);
  return { user: publicUser(u), cookie: cookie(req, token) };
}
function getCookie(req) {
  const raw = req.headers.cookie || '';
  const m = raw.match(/(?:^|;\s*)pm_session=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}
export async function sessionUser(req) {
  await initAccounts();
  const token = getCookie(req);
  if (!token) return null;
  const k = digest(token);
  if (revokedTokens.has(k)) return null;
  const session = sessions.get(k);
  if (session) {
    if (session.until < Date.now()) {
      sessions.delete(k);
      return null;
    }
    const found = accounts.get(session.id);
    if (found) return found;
  }
  if (token.includes('.')) {
    const [body, sig] = token.split('.');
    if (body && sig) {
      const exp = createHmac('sha256', sessionSecret()).update(body).digest('base64url');
      if (sig.length === exp.length && timingSafeEqual(Buffer.from(sig), Buffer.from(exp))) {
        try {
          const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
          if (parsed?.id && parsed.until > Date.now()) {
            try {
              const rows = JSON.parse(await readFile(ACCOUNTS(), 'utf8'));
              for (const x of rows) if (x.id && x.email && x.salt && x.hash) accounts.set(x.id, x);
            } catch {}
            let u = accounts.get(parsed.id);
            if (!u && parsed.email) {
              u = {
                id: parsed.id,
                email: parsed.email,
                salt: '',
                hash: '',
                language: lang(parsed.language),
                timezone: zone(parsed.timezone),
                weeklyEnabled: true,
                emailVerified: true,
                createdAt: new Date().toISOString(),
                lastReportDate: null,
              };
              accounts.set(u.id, u);
            }
            if (u) {
              sessions.set(k, { id: u.id, until: parsed.until });
              return u;
            }
          }
        } catch {}
      }
    }
  }
  return null;
}
export function revoke(req) {
  const t = getCookie(req);
  if (t) {
    const k = digest(t);
    revokedTokens.add(k);
    sessions.delete(k);
  }
}
export async function updateSettings(u, patch) {
  if (patch.language !== undefined) {
    if (!['en', 'es'].includes(patch.language))
      throw Object.assign(new Error('Unsupported language.'), { status: 400 });
    u.language = patch.language;
  }
  if (patch.timezone !== undefined) {
    if (!validZone(patch.timezone))
      throw Object.assign(new Error('Invalid IANA time zone.'), { status: 400 });
    u.timezone = patch.timezone;
  }
  if (patch.weeklyEnabled !== undefined) {
    if (typeof patch.weeklyEnabled !== 'boolean')
      throw Object.assign(new Error('Invalid delivery setting.'), { status: 400 });
    u.weeklyEnabled = patch.weeklyEnabled;
  }
  await persist();
  return publicUser(u);
}
export async function issueVerification(u) {
  const token = randomBytes(32).toString('base64url');
  u.verificationHash = digest(token);
  u.verificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  await persist();
  return token;
}
export async function confirmVerification(token) {
  await initAccounts();
  if (typeof token !== 'string' || token.length > 130 || token.length < 30) return false;
  const hashed = digest(token);
  for (const u of accounts.values()) {
    if (u.verificationHash === hashed && u.verificationExpires > Date.now()) {
      u.emailVerified = true;
      u.verificationHash = null;
      u.verificationExpires = null;
      await persist();
      return true;
    }
  }
  return false;
}
export async function markSent(u, localDate) {
  u.lastReportDate = localDate;
  if (u.reportClaim?.date === localDate) u.reportClaim = null;
  await persist();
}
/** Persist a weekly-report claim before generating, so a restart mid-send can tell a claim is open. */
export async function claimReport(u, localDate) {
  u.reportClaim = { date: localDate, at: Date.now() };
  await persist();
}
export async function releaseReportClaim(u, localDate) {
  if (u.reportClaim?.date !== localDate) return;
  u.reportClaim = null;
  await persist();
}
export async function usersForReports() {
  await initAccounts();
  return [...accounts.values()].filter((u) => u.weeklyEnabled && u.emailVerified);
}
const statePath = (u) => join(privateRoot(), u.id + '.json');
/** Stored as { format: 2, revision, savedAt, state }; a bare version-4 state is a legacy file (revision 0). */
// Only a missing file means "no state". Anything unreadable is a 500, so the client pauses autosave and
// putState (which reads first) can never overwrite it.
const unreadable = () =>
  Object.assign(new Error('Saved portfolio could not be read. Saving is paused; contact the operator.'), {
    status: 500,
    body: { error: 'state_unreadable' },
  });
async function readStateRecord(u) {
  let data;
  try {
    data = JSON.parse(await readFile(statePath(u), 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return { state: null, revision: 0 };
    throw unreadable();
  }
  if (data?.format === 2) {
    // Current format was validated when saved; if it no longer validates, the file is damaged.
    if (!Number.isInteger(data.revision) || data.revision < 0) throw unreadable();
    try {
      return { state: validateState(data.state), revision: data.revision };
    } catch {
      throw unreadable();
    }
  }
  // Only the pre-revision legacy format (a bare version-4 state) is normalized.
  if (data?.version === 4) return { state: normalizeState(data), revision: 0 };
  throw unreadable();
}
export async function getStateRecord(u) {
  return readStateRecord(u);
}
export async function getState(u) {
  return (await readStateRecord(u)).state;
}
const MAX_HOLDINGS = 500,
  MAX_ARRAY = 5000,
  MAX_DEPTH = 24;
const SYMBOL = /^[A-Za-z0-9.\-^=]{1,15}$/;
const URL_KEY = /^(url|href|link)$|(Url|URL|_url)$/;
const invalid = (why) =>
  Object.assign(new Error('Invalid portfolio state: ' + why + '.'), { status: 400, code: 'INVALID_STATE' });
const finiteNonNegative = (x) => typeof x === 'number' && Number.isFinite(x) && x >= 0;
function checkHoldings(list, name) {
  if (list === undefined || list === null) {
    if (name === 'holdings') throw invalid('holdings must be an array');
    return;
  }
  if (!Array.isArray(list)) throw invalid(name + ' must be an array');
  if (list.length > MAX_HOLDINGS) throw invalid(`${name} exceeds ${MAX_HOLDINGS} entries`);
  list.forEach((h, i) => {
    const at = `${name}[${i}]`;
    if (!h || typeof h !== 'object' || Array.isArray(h)) throw invalid(at + ' must be an object');
    if (typeof h.ticker !== 'string' || !SYMBOL.test(h.ticker))
      throw invalid(at + '.ticker is not a valid symbol');
    if (!finiteNonNegative(h.shares)) throw invalid(at + '.shares must be a non-negative number');
    for (const k of ['cost', 'price', 'prevClose'])
      if (h[k] !== undefined && h[k] !== null && !finiteNonNegative(h[k]))
        throw invalid(`${at}.${k} must be a non-negative number`);
  });
}
// Bounded walk over the whole state: array sizes, nesting depth and https-only URL fields.
function walk(value, depth, path) {
  if (depth > MAX_DEPTH) throw invalid('nesting too deep at ' + path);
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY) throw invalid(`${path} exceeds ${MAX_ARRAY} entries`);
    value.forEach((x, i) => walk(x, depth + 1, `${path}[${i}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [k, x] of Object.entries(value)) {
    if (URL_KEY.test(k) && x !== null && x !== '') {
      let ok = false;
      try {
        ok = typeof x === 'string' && new URL(x).protocol === 'https:';
      } catch {}
      if (!ok) throw invalid(`${path}.${k} must be an https URL`);
    }
    walk(x, depth + 1, `${path}.${k}`);
  }
}
// Fields the app reads as arrays of objects, as maps of objects, as plain objects, or as arrays of strings.
const OBJECT_LISTS = ['transactions', 'snapshots', 'swipes', 'news'],
  OBJECT_MAPS = ['quotes', 'matches', 'research'],
  PLAIN_OBJECTS = ['customStocks', 'peers', 'aiReports', 'lddSignals', 'requests', 'alerts'],
  STRING_LISTS = ['deck', 'dismissedNews'];
const isObject = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
function checkShapes(obj) {
  for (const k of OBJECT_LISTS) {
    if (obj[k] === undefined || obj[k] === null) continue;
    if (!Array.isArray(obj[k])) throw invalid(k + ' must be an array');
    obj[k].forEach((x, i) => {
      if (!isObject(x)) throw invalid(`${k}[${i}] must be an object`);
    });
  }
  for (const k of OBJECT_MAPS) {
    if (obj[k] === undefined && k === 'research') continue;
    if (!isObject(obj[k])) throw invalid(k + ' must be an object');
    for (const [t, x] of Object.entries(obj[k])) if (!isObject(x)) throw invalid(`${k}.${t} must be an object`);
  }
  for (const [t, x] of Object.entries(obj.matches))
    if (typeof x.ticker !== 'string' || !SYMBOL.test(x.ticker)) throw invalid(`matches.${t}.ticker is not valid`);
  for (const k of PLAIN_OBJECTS)
    if (obj[k] !== undefined && obj[k] !== null && !isObject(obj[k])) throw invalid(k + ' must be an object');
  for (const k of STRING_LISTS) {
    if (obj[k] === undefined || obj[k] === null) continue;
    if (!Array.isArray(obj[k]) || obj[k].some((x) => typeof x !== 'string'))
      throw invalid(k + ' must be a list of strings');
  }
  // lastRefresh.fresh feeds new Set(...) on the dashboard.
  if (obj.lastRefresh !== undefined && obj.lastRefresh !== null) {
    if (!isObject(obj.lastRefresh)) throw invalid('lastRefresh must be an object');
    const f = obj.lastRefresh.fresh;
    if (f !== undefined && (!Array.isArray(f) || f.some((t) => typeof t !== 'string' || !SYMBOL.test(t))))
      throw invalid('lastRefresh.fresh must be a list of ticker symbols');
    if (obj.lastRefresh.at !== undefined && obj.lastRefresh.at !== null && typeof obj.lastRefresh.at !== 'string')
      throw invalid('lastRefresh.at must be a string');
  }
  for (const [k, type] of Object.entries(SCALARS))
    if (obj[k] !== undefined && obj[k] !== null && typeof obj[k] !== type) throw invalid(`${k} must be a ${type}`);
}
// Scalars the UI formats or compares directly.
const SCALARS = {
  demo: 'boolean',
  mode: 'string',
  budget: 'number',
  seed: 'number',
  lastLiveUpdate: 'string',
  lastPortfolioImport: 'string',
  portfolioSource: 'string',
  dataSource: 'string',
  planMonth: 'string',
  createdAt: 'string',
};
/** Legacy files may hold odd shapes; drop what the app cannot use so a later save validates. */
function normalizeState(st) {
  for (const k of OBJECT_LISTS) if (k in st) st[k] = Array.isArray(st[k]) ? st[k].filter(isObject) : [];
  for (const k of [...OBJECT_MAPS, ...PLAIN_OBJECTS])
    if (k in st && !isObject(st[k])) st[k] = {};
  for (const k of OBJECT_MAPS)
    if (isObject(st[k]))
      for (const [t, x] of Object.entries(st[k])) if (!isObject(x)) delete st[k][t];
  if (isObject(st.matches))
    for (const [t, x] of Object.entries(st.matches))
      if (typeof x.ticker !== 'string' || !SYMBOL.test(x.ticker)) delete st.matches[t];
  for (const [k, type] of Object.entries(SCALARS))
    if (st[k] !== undefined && st[k] !== null && typeof st[k] !== type) delete st[k];
  if ('lastRefresh' in st && !isObject(st.lastRefresh)) st.lastRefresh = null;
  if (isObject(st.lastRefresh))
    st.lastRefresh.fresh = Array.isArray(st.lastRefresh.fresh)
      ? st.lastRefresh.fresh.filter((t) => typeof t === 'string' && SYMBOL.test(t))
      : [];
  for (const k of STRING_LISTS)
    if (k in st) st[k] = Array.isArray(st[k]) ? st[k].filter((x) => typeof x === 'string') : [];
  for (const k of ['holdings', 'baseHoldings'])
    if (k in st && st[k] !== null) st[k] = Array.isArray(st[k]) ? st[k].filter(isObject) : [];
  if (!Array.isArray(st.holdings)) st.holdings = [];
  if (!isObject(st.quotes)) st.quotes = {};
  if (!isObject(st.matches)) st.matches = {};
  return st;
}
export function validateState(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj) || obj.version !== 4)
    throw invalid('expected a version 4 state object');
  if (Buffer.byteLength(JSON.stringify(obj)) > MAX_STATE) throw invalid('state is too large');
  checkHoldings(obj.holdings, 'holdings');
  checkHoldings(obj.baseHoldings, 'baseHoldings');
  checkShapes(obj);
  walk(obj, 0, 'state');
  return obj;
}
const conflict = (body) => Object.assign(new Error(body.error), { status: 409, body });
/**
 * Body: { state, accountId, baseRevision }. A tab signed in to another account, or an old tab that still
 * sends a bare state, gets 409 account_mismatch; a tab behind the stored revision gets 409 revision_conflict.
 */
export async function putState(u, body) {
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    'version' in body ||
    body.accountId !== u.id
  )
    throw conflict({ error: 'account_mismatch' });
  const state = validateState(body.state);
  return runWrite(async () => {
    const current = await readStateRecord(u);
    const coldEmpty = current.state === null && current.revision === 0 && Number.isInteger(body.baseRevision) && body.baseRevision > 0;
    if (!coldEmpty && body.baseRevision !== current.revision)
      throw conflict({ error: 'revision_conflict', revision: current.revision });
    const revision = (coldEmpty ? body.baseRevision : current.revision) + 1,
      savedAt = new Date().toISOString(),
      path = statePath(u),
      tmp = path + '.tmp-' + process.pid;
    await writeFile(tmp, JSON.stringify({ format: 2, revision, savedAt, state }), { mode: 0o600 });
    await rename(tmp, path);
    return { ok: true, savedAt, revision };
  });
}
// Risk profiles are minimized, isolated from portfolio holdings and server-validated.
// These categories are sensitive financial context: protect account storage and backups.
const riskPath = (u) => join(privateRoot(), u.id + '.risk.json');
export async function getRiskProfile(u) {
  try {
    const p = JSON.parse(await readFile(riskPath(u), 'utf8'));
    if (p.version !== riskModel.VERSION || !p.answers) return null;
    return { ...riskModel.score(p.answers), completedAt: p.completedAt };
  } catch {
    return null;
  }
}
export async function putRiskProfile(u, input) {
  const answers = riskModel.validate(input?.answers);
  const profile = { ...riskModel.score(answers), completedAt: new Date().toISOString() };
  const path = riskPath(u),
    tmp = path + '.tmp-' + process.pid;
  await runWrite(async () => {
    await writeFile(tmp, JSON.stringify(profile), { mode: 0o600 });
    await rename(tmp, path);
    try {
      await chmod(path, 0o600);
    } catch {}
  });
  return profile;
}
export async function deleteRiskProfile(u) {
  await runWrite(async () => {
    try {
      await unlink(riskPath(u));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  });
  return { ok: true };
}
export { publicUser, validZone, zone, lang };
