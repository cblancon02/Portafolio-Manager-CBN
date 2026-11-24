/**
 * Portafolio Manager — no-dependency Node 22+ public-data API.
 * Privacy: browser sends ticker lookups only. No private Yahoo Finance credentials or portfolio holdings reach this server.
 * Note: Yahoo chart and Google News RSS are unofficial feeds; personal/private use.
 */
import { createServer } from 'node:http';
import {
  initAccounts,
  register,
  login,
  revoke,
  sessionUser,
  clearCookie,
  publicUser,
  updateSettings,
  getState,
  getStateRecord,
  putState,
  issueVerification,
  confirmVerification,
  getRiskProfile,
  putRiskProfile,
  deleteRiskProfile,
} from './accounts.mjs';
import { getIntelligence } from './intelligence.mjs';
import { cacheRoot } from './paths.mjs';
import { safeFetch } from './safe-fetch.mjs';
import { admitResearch } from './research-limits.mjs';
import { handleV4Routes, createMultiProviderResearchRunner, hasAnyAI, autoVerifyIfNoMail } from './ai-v4.mjs';
import {
  startInstitutionalJob,
  listInstitutionalJobs,
  getInstitutionalJob,
  markInstitutionalJobRead,
} from './institutional-jobs.mjs';
import {
  createWeeklyData,
  pdfBytes,
  sendReport,
  generateAndStore,
  startWeeklyScheduler,
  reportConfigured,
  localParts,
  sendVerificationEmail,
  withReportSlot,
} from './weekly-report.mjs';
import { readFile, writeFile, rename, mkdir, stat } from 'node:fs/promises';
import { resolve, join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const L = require('../web/logic.js');
const Advanced = require('../web/advanced-logic.js');
const here = dirname(fileURLToPath(import.meta.url));
const WEB = resolve(here, '../web');
const PORT = Number(process.env.PORT || 8787);
const SEC_UA = process.env.SEC_USER_AGENT || 'PortafolioManager/4.0 (research@portafoliomanager.app)';
const MAX_SEC_RATE = 6;
const caches = new Map(),
  ongoing = new Map(),
  concurrency = { sec: 0, yahoo: 0, news: 0 };
const queues = { sec: [], yahoo: [], news: [] };
let secLast = [];
const MAX_CONC = { sec: 3, yahoo: 2, news: 2 };
const MS_DAY = 86400000;
function validTicker(t) {
  return /^[A-Z0-9.\-]{1,12}$/.test(t);
}
function safeNum(x) {
  return Number.isFinite(x) ? x : null;
}
function round(x, n = 2) {
  return Number.isFinite(x) ? Math.round(x * 10 ** n) / 10 ** n : null;
}
const REMOTE_HOSTS = ['www.sec.gov', 'data.sec.gov', 'query1.finance.yahoo.com', 'news.google.com'];
function secClass(url) {
  const h = new URL(url).hostname;
  if (!REMOTE_HOSTS.includes(h)) throw new Error('Host not allowed');
  return h.includes('sec.gov') ? 'sec' : h.includes('yahoo.com') ? 'yahoo' : 'news';
}
async function limit(kind, job) {
  return new Promise((ok, err) => {
    queues[kind].push({ job, ok, err });
    drain(kind);
  });
}
function drain(kind) {
  if (concurrency[kind] >= MAX_CONC[kind] || !queues[kind]?.length) return;
  if (kind === 'sec') {
    const now = Date.now();
    secLast = secLast.filter((t) => t > now - 1000);
    if (secLast.length >= MAX_SEC_RATE) {
      setTimeout(() => drain(kind), Math.max(30, 1010 - (now - secLast[0])));
      return;
    }
    secLast.push(now);
  }
  concurrency[kind]++;
  const x = queues[kind].shift();
  Promise.resolve()
    .then(x.job)
    .then(x.ok, x.err)
    .finally(() => {
      concurrency[kind]--;
      drain(kind);
    });
  drain(kind);
}
function cachePath(key) {
  return join(cacheRoot(), createHash('sha256').update(key).digest('hex') + '.json');
}
async function getCached(key) {
  if (caches.has(key)) return caches.get(key);
  try {
    const obj = JSON.parse(await readFile(cachePath(key), 'utf8'));
    caches.set(key, obj);
    return obj;
  } catch {
    return null;
  }
}
async function setCached(key, value) {
  const entry = { value, storedAt: Date.now() };
  caches.set(key, entry);
  try {
    await mkdir(cacheRoot(), { recursive: true });
    const f = cachePath(key),
      temp = f + '.tmp-' + process.pid;
    await writeFile(temp, JSON.stringify(entry));
    await rename(temp, f);
  } catch {}
  return entry;
}
async function remote(url, ttlMs = 900000) {
  if (ongoing.has(url)) return ongoing.get(url);
  const work = (async () => {
    const hit = await getCached(url);
    if (hit && Date.now() - hit.storedAt < ttlMs) return { ...hit.value, stale: false };
    const kind = secClass(url);
    if (kind === 'sec' && !SEC_UA.trim())
      throw new Error('SEC_USER_AGENT no configurado (nombre y correo real requeridos por SEC).');
    for (let tries = 0; tries < 2; tries++) {
      try {
        const v = await limit(kind, async () => {
          const ctrl = new AbortController(),
            tm = setTimeout(() => ctrl.abort(), 6000);
          try {
            const hdr = {
              Accept: 'application/json, text/xml;q=0.9, */*;q=0.8',
              'Accept-Encoding': 'gzip, deflate',
              'User-Agent':
                kind === 'sec'
                  ? SEC_UA
                  : 'PortafolioManager/2.0 (personal research; contact via SEC_USER_AGENT)',
            };
            // Redirects are followed only to hosts in the same allow-list (see safe-fetch.mjs).
            const resp = await safeFetch(url, { headers: hdr, signal: ctrl.signal }, REMOTE_HOSTS);
            if (resp.status === 429 || resp.status >= 500) {
              const after = Number(resp.headers.get('Retry-After'));
              const er = new Error('HTTP ' + resp.status);
              er.retryAfter = Number.isFinite(after) ? Math.min(after * 1000, 7000) : null;
              throw er;
            }
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            const text = await resp.text();
            return url.includes('rss')
              ? { text, sourceUrl: url }
              : { data: JSON.parse(text), sourceUrl: url };
          } finally {
            clearTimeout(tm);
          }
        });
        await setCached(url, v);
        return { ...v, stale: false };
      } catch (e) {
        if (tries === 1) {
          if (hit?.value) return { ...hit.value, stale: true, error: String(e.message) };
          throw e;
        }
        await new Promise((r) => setTimeout(r, Math.min(e.retryAfter ?? 300 * 2 ** tries, 6500)));
      }
    }
  })();
  ongoing.set(url, work);
  try {
    return await work;
  } finally {
    ongoing.delete(url);
  }
}
async function bodyJSON(req, max = 1_100_000) {
  if (req.readableEnded && req.body !== undefined) {
    if (Buffer.isBuffer(req.body)) {
      if (req.body.length > max) throw Object.assign(new Error('Request exceeds size limit'), { status: 413 });
      return JSON.parse(req.body.toString('utf8'));
    }
    if (typeof req.body === 'string') {
      if (Buffer.byteLength(req.body) > max) throw Object.assign(new Error('Request exceeds size limit'), { status: 413 });
      return JSON.parse(req.body);
    }
    if (typeof req.body === 'object' && req.body !== null) return req.body;
  }
  let chunks = [],
    size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buf.length;
    if (size > max) throw Object.assign(new Error('Request exceeds size limit'), { status: 413 });
    chunks.push(buf);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Invalid JSON body'), { status: 400 });
  }
}
function sameOrigin(req) {
  if (!req.headers.origin) return true;
  try {
    const o = new URL(req.headers.origin),
      host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
    return o.host === host || o.origin === process.env.PUBLIC_ORIGIN;
  } catch {
    return false;
  }
}
function replyUser(res, body, setCookie) {
  const data = JSON.stringify(body);
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    ...(setCookie ? { 'Set-Cookie': setCookie } : {}),
  });
  res.end(data);
}
const dateNY = (epoch) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(epoch));
function ret(arr, back) {
  if (arr.length <= back) return null;
  const current = arr[arr.length - 1],
    prior = arr[arr.length - 1 - back];
  return current > 0 && prior > 0 ? (current / prior - 1) * 100 : null;
}
function volatility(arr) {
  if (arr.length < 50) return null;
  let rets = [];
  for (let i = 1; i < arr.length; i++)
    if (arr[i] > 0 && arr[i - 1] > 0) rets.push(Math.log(arr[i] / arr[i - 1]));
  const mu = rets.reduce((a, b) => a + b, 0) / rets.length;
  const dev = Math.sqrt(rets.reduce((a, b) => a + (b - mu) ** 2, 0) / (rets.length - 1));
  return round(dev * Math.sqrt(252) * 100, 1);
}
function peakDistance(arr) {
  if (!arr.length) return null;
  const high = Math.max(...arr),
    last = arr[arr.length - 1];
  return high > 0 ? round((1 - last / high) * 100, 1) : null;
}
function yahooSymbol(t) {
  return t.replace(/\./g, '-');
}
export async function quote(t, range = '1y') {
  if (!validTicker(t) && t !== '^VIX') throw new Error('Ticker inválido');
  if (!['1y', '5y', '10y'].includes(range)) throw new Error('Rango inválido');
  const query = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol(t))}?range=${range}&interval=1d&events=div%2Csplit`;
  const { data, stale } = await remote(query, range === '1y' ? 900000 : 43200000);
  const chart = data?.chart?.result?.[0];
  if (!chart) throw new Error(data?.chart?.error?.description || 'Ticker sin cotización en Yahoo');
  const meta = chart.meta || {};
  const ts = chart.timestamp || [],
    closes = chart.indicators?.quote?.[0]?.close || [],
    adj = chart.indicators?.adjclose?.[0]?.adjclose || [];
  const bars = ts
    .map((time, i) => ({
      date: dateNY(time * 1000),
      close: Number(closes[i]),
      adjClose: Number.isFinite(adj[i]) ? Number(adj[i]) : Number(closes[i]),
    }))
    .filter((x) => Number.isFinite(x.close) && x.close > 0)
    .filter((x, i, a) => i === 0 || x.date !== a[i - 1].date);
  if (bars.length < 2) throw new Error('Historial insuficiente');
  const raw = bars.map((b) => b.close),
    adjusted = bars.map((b) => b.adjClose);
  const price =
    Number.isFinite(meta.regularMarketPrice) && meta.regularMarketPrice > 0
      ? meta.regularMarketPrice
      : raw.at(-1);
  const prevClose = raw.at(-2); // two latest session closes, not chartPreviousClose (which refers to the start of range)
  const day = prevClose > 0 ? (price / prevClose - 1) * 100 : null;
  const lastTime = meta.regularMarketTime
    ? new Date(meta.regularMarketTime * 1000).toISOString()
    : new Date(ts.at(-1) * 1000).toISOString();
  const history = bars.map((x) => ({ ...x, close: round(x.close, 4), adjClose: round(x.adjClose, 4) }));
  return {
    ticker: t,
    // Yahoo quotes in the listing currency; USD totals must exclude anything else.
    // Kept as sent: 'GBp' (pence) must not become 'GBP'.
    currency: typeof meta.currency === 'string' ? meta.currency.slice(0, 8) : null,
    price: round(price, 4),
    prevClose: round(prevClose, 4),
    day: round(day, 2),
    week: round(ret(adjusted, 5), 2),
    month: round(ret(adjusted, 21), 2),
    threeMonth: round(ret(adjusted, 63), 2),
    sixMonth: round(ret(adjusted, 126), 2),
    year: round(ret(adjusted, 252), 2),
    fromHigh: peakDistance(raw.slice(-252)),
    vol: volatility(adjusted),
    asOf: lastTime,
    asOfPrice: bars.at(-1).date,
    history,
    coverageDays: bars.length,
    stale: !!stale,
    source: 'Yahoo chart v8 (unofficial)',
  };
}
// Valuation reference is separate from Yahoo prices. Never infer the index P/E from SPY price.
async function benchmarkPE() {
  const v = Number(process.env.SP500_TRAILING_PE),
    asOf = process.env.SP500_PE_ASOF || '',
    source = process.env.SP500_PE_SOURCE || '';
  const age = asOf ? Math.abs(Date.now() - Date.parse(asOf)) / 86400000 : Infinity;
  if (v > 0 && v < 250 && /^https:\/\//.test(source) && age <= 60)
    return {
      pe: round(v, 2),
      asOf,
      source,
      proxy: false,
      kind: 'S&P 500 trailing 12-month P/E (operator-sourced)',
    };
  try {
    // Some public Yahoo quote responses include trailingPE for SPY; treat it explicitly as ETF proxy.
    const { data } = await remote('https://query1.finance.yahoo.com/v7/finance/quote?symbols=SPY', 86400000);
    const q = (data?.quoteResponse?.result || []).find((x) => x.symbol === 'SPY');
    const pe = Number(q?.trailingPE);
    if (pe > 0 && pe < 250)
      return {
        pe: round(pe, 2),
        source: 'Yahoo Finance — SPY ETF trailing P/E proxy',
        proxy: true,
        asOf: new Date().toISOString().slice(0, 10),
        kind: 'SPY ETF trailing P/E proxy (not index P/E)',
      };
  } catch {}
  return null;
}
const isoNow = () => new Date().toISOString().slice(0, 10);
async function tickersSEC() {
  const { data, stale } = await remote('https://www.sec.gov/files/company_tickers.json', 7 * MS_DAY);
  const rows = Object.values(data || {}).map((x) => ({
    ticker: String(x.ticker).toUpperCase(),
    name: String(x.title),
    cik: Number(x.cik_str),
  }));
  return { rows, stale };
}
function secFilingLink(cik, accn, doc) {
  return `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${String(accn).replace(/-/g, '')}/${doc || ''}`;
}
const SEC_FORMS = new Set(['10-K', '10-K/A', '10-Q', '10-Q/A']);
function periodDays(f) {
  return f.start && f.end ? Math.round((Date.parse(f.end) - Date.parse(f.start)) / MS_DAY) : null;
}
function validFlow(f, asOf) {
  return (
    f &&
    SEC_FORMS.has(f.form) &&
    f.filed <= asOf &&
    f.end <= asOf &&
    f.start &&
    Number.isFinite(f.val) &&
    [
      [80, 100],
      [170, 190],
      [260, 285],
      [350, 380],
    ].some(([a, b]) => periodDays(f) >= a && periodDays(f) <= b)
  );
}
function uniqFacts(items, asOf) {
  const map = new Map();
  for (const f of items || []) {
    if (!validFlow(f, asOf)) continue;
    const k = [f.start, f.end].join('|');
    if (!map.has(k) || f.filed > map.get(k).filed) map.set(k, f);
  }
  return Array.from(map.values());
}
function dayGap(a, b) {
  return Math.abs((Date.parse(a) - Date.parse(b)) / MS_DAY);
}
export function chooseTTM(facts, asOf, target = asOf) {
  let valid = uniqFacts(facts, asOf)
    .filter((f) => f.end <= target)
    .sort((a, b) => b.end.localeCompare(a.end) || periodDays(b) - periodDays(a));
  if (!valid.length) return null;
  const end = valid[0].end;
  if (dayGap(target, end) > 460) return null;
  const same = valid.filter((f) => f.end === end).sort((a, b) => periodDays(b) - periodDays(a));
  const annual = same.find((f) => periodDays(f) >= 350);
  if (annual) return { value: annual.val, operands: [annual], end };
  const ytd = same[0],
    len = periodDays(ytd);
  const priorFY = valid.find(
    (f) => periodDays(f) >= 350 && Math.abs((Date.parse(ytd.start) - Date.parse(f.end)) / MS_DAY) <= 11,
  );
  const prior = valid.find(
    (f) =>
      Math.abs(periodDays(f) - len) <= 10 &&
      dayGap(f.end, new Date(Date.parse(ytd.end) - 365 * MS_DAY).toISOString().slice(0, 10)) <= 11,
  );
  if (priorFY && prior)
    return { value: priorFY.val + ytd.val - prior.val, operands: [priorFY, ytd, prior], end };
  // Four consecutive discrete quarters as fallback. Never multiply a single quarter by four.
  const quarters = valid
    .filter((f) => periodDays(f) >= 80 && periodDays(f) <= 100)
    .sort((a, b) => b.end.localeCompare(a.end));
  const seq = [quarters.find((f) => f.end === end)];
  if (!seq[0]) return null;
  for (let i = 1; i < 4; i++) {
    const prev = quarters.find((f) => !seq.includes(f) && dayGap(seq[i - 1].start, f.end) <= 10);
    if (!prev) return null;
    seq.push(prev);
  }
  return { value: seq.reduce((s, f) => s + f.val, 0), operands: seq, end };
}
function flow(facts, tags, unit, asOf, needGrowth = false) {
  for (const tag of tags) {
    const src = facts?.['us-gaap']?.[tag]?.units?.[unit];
    if (!src?.length) continue;
    const ttm = chooseTTM(src, asOf);
    if (!ttm) continue;
    let growth = null;
    if (needGrowth) {
      const prevdate = new Date(Date.parse(ttm.end) - 365 * MS_DAY).toISOString().slice(0, 10),
        old = chooseTTM(src, asOf, prevdate);
      if (old?.value > 0) growth = (ttm.value / old.value - 1) * 100;
    }
    return { ...ttm, tag, growth: round(growth, 1) };
  }
  return null;
}
function balance(facts, tags, unit, asOf) {
  for (const tag of tags) {
    const entries = facts?.['us-gaap']?.[tag]?.units?.[unit] || [];
    const fs = entries
      .filter((f) => SEC_FORMS.has(f.form) && f.filed <= asOf && f.end <= asOf && Number.isFinite(f.val))
      .sort((a, b) => b.end.localeCompare(a.end) || b.filed.localeCompare(a.filed));
    if (fs[0] && dayGap(asOf, fs[0].end) < 460)
      return { value: fs[0].val, tag, operands: [fs[0]], end: fs[0].end };
  }
  return null;
}
function sharesOutstanding(facts, asOf) {
  let all = [];
  for (const [tag, val] of Object.entries(facts?.dei || {})) {
    if (!/^EntityCommonStockSharesOutstanding$/.test(tag)) continue;
    const entries = val.units?.shares || [];
    all.push(
      ...entries
        .filter((f) => f.filed <= asOf && f.end <= asOf && Number.isFinite(f.val))
        .sort((a, b) => b.end.localeCompare(a.end)),
    );
  }
  if (!all.length) return null;
  const current = all[0];
  if (dayGap(asOf, current.end) > 365) return null;
  return {
    value: current.val,
    operands: [current],
    tag: 'dei:EntityCommonStockSharesOutstanding',
    end: current.end,
  };
}
function factURL(cik, f, filings) {
  const matched = filings.find((k) => k.accession === f.accn);
  return secFilingLink(cik, f.accn, matched?.document);
}
export function metricsSEC(data, cik, filings, asOf, price) {
  const revenue = flow(
      data,
      ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'SalesRevenueNet'],
      'USD',
      asOf,
      true,
    ),
    ni = flow(data, ['NetIncomeLoss'], 'USD', asOf),
    op = flow(data, ['OperatingIncomeLoss'], 'USD', asOf),
    cfo = flow(data, ['NetCashProvidedByUsedInOperatingActivities'], 'USD', asOf),
    capex = flow(data, ['PaymentsToAcquirePropertyPlantAndEquipment'], 'USD', asOf),
    eps = flow(data, ['EarningsPerShareDiluted'], 'USD/shares', asOf),
    eq = balance(data, ['StockholdersEquity'], 'USD', asOf),
    debt = balance(data, ['LongTermDebt'], 'USD', asOf),
    cur = balance(data, ['LongTermDebtCurrent'], 'USD', asOf),
    noncur = balance(data, ['LongTermDebtNoncurrent'], 'USD', asOf),
    shares = sharesOutstanding({ dei: data?.dei }, asOf);
  let finalDebt = debt;
  if (!finalDebt && cur && noncur)
    finalDebt = {
      value: cur.value + noncur.value,
      operands: cur.operands.concat(noncur.operands),
      tag: 'LongTermDebtNoncurrent + LongTermDebtCurrent',
      end: noncur.end,
    };
  const fcf = cfo && capex ? cfo.value - capex.value : null;
  const metrics = {
    revenueTTM: revenue?.value ?? null,
    netIncomeTTM: ni?.value ?? null,
    operatingIncomeTTM: op?.value ?? null,
    cashOperationsTTM: cfo?.value ?? null,
    capexTTM: capex?.value ?? null,
    fcfTTM: fcf,
    revenueGrowth: revenue?.growth ?? null,
    opMargin: revenue?.value > 0 && op ? round((100 * op.value) / revenue.value, 1) : null,
    fcfMargin: revenue?.value > 0 && fcf !== null ? round((100 * fcf) / revenue.value, 1) : null,
    earningsYield: price > 0 && shares && ni ? round((ni.value / (price * shares.value)) * 100, 2) : null,
    debtEquity: eq?.value > 0 && finalDebt ? round(finalDebt.value / eq.value, 3) : null,
    eps: eps?.value ?? null,
    fcfps: fcf !== null && shares?.value > 0 ? round(fcf / shares.value, 4) : null,
    cap: price > 0 && shares?.value > 0 ? round(price * shares.value, 0) : null,
    cashBalance: null,
    debt: finalDebt?.value ?? null,
    shares: shares?.value ?? null,
  };
  const entries = [
    ['Ingresos TTM', revenue, 'USD'],
    ['Beneficio neto TTM', ni, 'USD'],
    ['Beneficio operativo TTM', op, 'USD'],
    ['Efectivo de operaciones TTM', cfo, 'USD'],
    ['Capex TTM', capex, 'USD'],
    ['Beneficio diluido por acción TTM', eps, 'USD/acción'],
    ['Patrimonio', eq, 'USD'],
    ['Deuda largo plazo', finalDebt, 'USD'],
  ];
  let factRows = [];
  for (const [label, v, unit] of entries) {
    if (!v) continue;
    const first = v.operands[0];
    factRows.push({
      label,
      value: v.value,
      display: unit === 'USD' ? `US$${(v.value / 1e9).toFixed(2)} mil M` : v.value.toFixed(2) + ' ' + unit,
      unit,
      period: v.end,
      operands: v.operands.map((f) => ({
        tag: v.tag,
        start: f.start,
        end: f.end,
        val: f.val,
        form: f.form,
        filed: f.filed,
        accn: f.accn,
        url: factURL(cik, f, filings),
      })),
      source: {
        name: 'SEC EDGAR (N1)',
        url: factURL(cik, first, filings),
        filed: first.filed,
        form: first.form,
      },
    });
  }
  return {
    metrics,
    facts: factRows,
    verified: factRows.length >= 5 && !!revenue && !!ni && !!op && !!cfo,
    period: revenue?.end || null,
  };
}
function filingsFromSubmission(j, cik) {
  const recent = j?.filings?.recent || {},
    out = [];
  for (let i = 0; i < (recent.form?.length || 0); i++) {
    const form = recent.form[i];
    if (!['10-K', '10-Q', '8-K', '6-K', '20-F'].includes(form)) continue;
    out.push({
      form,
      filed: recent.filingDate[i],
      accession: recent.accessionNumber[i],
      document: recent.primaryDocument[i],
      url: secFilingLink(cik, recent.accessionNumber[i], recent.primaryDocument[i]),
    });
    if (out.length >= 15) break;
  }
  return out;
}
async function secResearch(t, price) {
  if (!SEC_UA.trim()) throw new Error('Configura SEC_USER_AGENT para usar la SEC');
  const all = await tickersSEC();
  const row = all.rows.find((r) => r.ticker === t);
  if (!row) throw new Error('Ticker no hallado en listado SEC');
  const cik = String(row.cik).padStart(10, '0');
  const [sub, company] = await Promise.all([
    remote(`https://data.sec.gov/submissions/CIK${cik}.json`, 24 * 3600000),
    remote(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, 24 * 3600000),
  ]);
  const filings = filingsFromSubmission(sub.data, row.cik);
  const facts = metricsSEC(company.data?.facts, row.cik, filings, isoNow(), price);
  if (L.BY_TICKER[t]?.sector === 'Financieras') {
    facts.metrics.fcfMargin = null;
    facts.metrics.debtEquity = null;
  }
  return {
    ticker: t,
    company: sub.data?.name || row.name,
    sector: null,
    asOf: isoNow(),
    verified: facts.verified,
    metrics: facts.metrics,
    facts: facts.facts,
    filings: filings.slice(0, 5),
    sources: facts.facts
      .map((f) => ({ label: f.label, url: f.source.url, level: 'N1', date: f.period }))
      .slice(0, 8),
    sourceStatus: {
      sec: sub.stale || company.stale ? 'cache antiguo' : 'actualizado',
      quote: 'Yahoo no oficial',
    },
    period: facts.period,
  };
}
const newsAllow =
  /\b(reuters|bloomberg|associated press|ap news|cnbc|financial times|wall street journal|wsj|nikkei|yahoo finance|bbc|marketwatch|barron's|the new york times|the economist)\b/i;
function xmlEntities(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/<[^>]+>/g, '')
    .trim();
}
function tag(s, t) {
  return (s.match(new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${t}>`, 'i')) || [])[1] || '';
}
function itemsRSS(xml, ticker) {
  const arr = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
  return arr
    .map((item) => {
      const title = xmlEntities(tag(item, 'title')),
        link = xmlEntities(tag(item, 'link')),
        source = xmlEntities(tag(item, 'source'));
      const dt = new Date(xmlEntities(tag(item, 'pubDate')));
      const publishedAt = Number.isNaN(dt.getTime()) ? null : dt.toISOString();
      if (!newsAllow.test(source) || !title || !/^https:\/\//.test(link) || !publishedAt) return null;
      const id = createHash('sha256')
        .update(title.toLowerCase().replace(/\W/g, '') + ticker)
        .digest('hex')
        .slice(0, 16);
      return { id, title, url: link, source, ticker, publishedAt };
    })
    .filter(Boolean);
}
async function publicNews(tickers) {
  let result = [];
  for (const t of tickers.slice(0, 14)) {
    try {
      const name = L.BY_TICKER[t]?.name || t;
      const term = `"${name}" ${t} when:7d`;
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(term)}&hl=en-US&gl=US&ceid=US:en`;
      const r = await remote(url, 3600000);
      result.push(...itemsRSS(r.text, t).slice(0, 4));
    } catch {}
  }
  const seen = new Set();
  return result
    .filter((x) => {
      if (seen.has(x.id)) return false;
      seen.add(x.id);
      return true;
    })
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, 60);
}
function json(res, value, status = 200) {
  const s = JSON.stringify(value);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': 'same-origin',
    'X-Content-Type-Options': 'nosniff',
    'Content-Length': Buffer.byteLength(s),
  });
  res.end(s);
}
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};
async function staticFile(req, res, path) {
  let f = resolve(WEB, '.' + path);
  if (path === '/' || path === '/index.html') f = join(WEB, 'index.html');
  if (f !== WEB && !f.startsWith(WEB + '/')) {
    res.writeHead(403);
    res.end();
    return;
  }
  try {
    const data = await readFile(f);
    res.writeHead(200, {
      'Content-Type': MIME[extname(f)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Content-Length': data.length,
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('No encontrado');
  }
}
const INSTITUTIONAL_PROMPT = `You are an independent, institutional-grade equity analyst. Write a concise but substantive report using the requested account language (default English), based on current web research and official US SEC / investor-relations documents (10-K, 10-Q, 8-K or equivalents). Do not invent figures, filing dates, technical indicator signals, insider activity or consensus forecasts. Every quantitative claim must include a period, data source and an accessible URL. GAAP earnings, adjusted earnings, guidance and consensus are distinct.
Mandatory sections:
1. Investment snapshot: business, current market price/date, qualified stance, verified catalyst, key invalidation risk and confidence rating.
2. Business and value chain: revenue streams, competitive moat, customer/supplier exposure, economic drivers and growth quality.
3. Industry, macro and geopolitics: policy, rates, inflation, export controls, demand trends and four economic regimes if defensible.
4. Financial quality: latest primary-source revenue, margin, EPS, FCF, cash, debt, share dilution, growth and trend across comparable periods; cite primary filings.
5. Competitive valuation: comparable companies and P/E, EV/EBITDA and P/FCF only when values and periods are reliable. Do not invent peer medians.
6. Valuation sensitivities: bear/base/bull DCF or appropriate company-specific method, explicit discount rates, growth, terminal method and limits; if data are insufficient, withhold price target.
7. Catalysts and thesis-breakers: events to verify, management and governance, risk matrix, dated monitoring list and investor-relevant conclusion.
8. Portfolio impact and technical context: concentration/correlation considerations and 200-week EMA if history supplied; no counterfeit proprietary Overkill dots or trade recommendations.
9. Two-minute decision summary: five evidence-based bullets, valuation uncertainties and next research step.
Sources at end with short descriptive link labels. No unsupported probability weights, Kelly sizing, option leverage or false precision. If evidence is incomplete, mark it unavailable rather than hallucinating.`;
async function runResearchReport(t, language = 'en') {
  if (!process.env.OPENAI_API_KEY)
    throw Object.assign(
      new Error('Institutional research requires OPENAI_API_KEY on the application server.'),
      { status: 503, code: 'AI_NOT_CONFIGURED' },
    );
  let source = null,
    quoteData = null;
  try {
    quoteData = await quote(t);
  } catch {}
  try {
    source = await secResearch(t, quoteData?.price || null);
  } catch {}
  const data = {
    ticker: t,
    company: source?.company || L.BY_TICKER[t]?.name || t,
    price: quoteData?.price || null,
    priceAsOf: quoteData?.asOf || null,
    secVerified: source?.verified || false,
    secMetrics: source?.metrics || {},
    secFacts: (source?.facts || []).map((x) => ({
      label: x.label,
      period: x.period,
      display: x.display,
      url: x.source?.url,
    })),
    links: (source?.filings || []).map((x) => ({ form: x.form, filed: x.filed, url: x.url })),
  };
  const ctrl = new AbortController(),
    tm = setTimeout(() => ctrl.abort(), 150000);
  let ai;
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5',
        tools: [{ type: 'web_search' }],
        instructions:
          INSTITUTIONAL_PROMPT + '\nWrite in ' + (language === 'es' ? 'Spanish' : 'English') + '.',
        input: JSON.stringify(data),
        max_output_tokens: 4800,
        store: false,
      }),
      signal: ctrl.signal,
    });
    ai = await response.json();
    if (!response.ok) throw Error(ai?.error?.message || 'AI provider HTTP ' + response.status);
  } finally {
    clearTimeout(tm);
  }
  const text =
    (ai.output || [])
      .flatMap((x) => x.content || [])
      .filter((x) => x.type === 'output_text')
      .map((x) => x.text)
      .join('\n\n') ||
    ai.output_text ||
    '';
  if (!text.trim()) throw Error('AI provider returned no report text.');
  return {
    ticker: t,
    text,
    generatedAt: new Date().toISOString(),
    provider: 'OpenAI Responses + web_search',
    model: process.env.OPENAI_MODEL || 'gpt-5',
    sourceNote:
      'AI-generated research. Verify each figure and citation. This report does not access brokerage positions or Yahoo account credentials.',
  };
}
const aiNotConfigured = (res) =>
  json(
    res,
    { error: 'Configura ANTHROPIC_API_KEY (Claude), OPENAI_API_KEY o GEMINI_API_KEY en el servidor.', code: 'AI_NOT_CONFIGURED' },
    503,
  );
// Account-scoped routes: a mutation here must name its account in X-PM-Account.
const ACCOUNT_ROUTES =
  /^\/api\/(account\/|auth\/verify\/request$|reports\/|institutional\/|report$|intelligence$)/;
const sends = new Map();
let globalSends = [];
// Manual report emails: PM_MANUAL_SENDS_PER_HOUR per account (default 3), PM_MANUAL_SENDS_GLOBAL_HOUR overall (30).
function allowManualSend(id) {
  const now = Date.now(),
    hour = (t) => t > now - 3_600_000,
    lim = (name, d) => (Number.isInteger(Number(process.env[name])) && +process.env[name] > 0 ? +process.env[name] : d),
    mine = (sends.get(id) || []).filter(hour);
  globalSends = globalSends.filter(hour);
  if (mine.length >= lim('PM_MANUAL_SENDS_PER_HOUR', 3) || globalSends.length >= lim('PM_MANUAL_SENDS_GLOBAL_HOUR', 30))
    return false;
  mine.push(now);
  globalSends.push(now);
  sends.set(id, mine);
  return true;
}
const resends = new Map();
// Verification email: one per minute and five per rolling day for each account.
function allowResend(id) {
  const now = Date.now(),
    times = (resends.get(id) || []).filter((t) => t > now - 86_400_000);
  if ((times.length && now - times.at(-1) < 60_000) || times.length >= 5) return false;
  times.push(now);
  resends.set(id, times);
  return true;
}
const refused = (res, e) => json(res, { error: e.message, code: e.code }, e.status || 429);
async function handleResearchReport(req, res, runner) {
  const input = await bodyJSON(req, 2048),
    t = String(input?.ticker || '')
      .trim()
      .toUpperCase();
  if (!validTicker(t)) {
    json(res, { error: 'Invalid ticker' }, 400);
    return;
  }
  const u = await sessionUser(req);
  if (!u) {
    json(res, { error: 'Sign in required' }, 401);
    return;
  }
  if (!hasAnyAI()) return aiNotConfigured(res);
  let release;
  try {
    release = await admitResearch(u);
  } catch (e) {
    return refused(res, e);
  }
  try {
    json(res, await runner(t, u.language));
  } catch (e) {
    json(
      res,
      { error: e.message || 'Research unavailable', code: e.code || 'RESEARCH_FAILED' },
      e.status || 503,
    );
  } finally {
    release();
  }
}
/** options.researchRunner replaces the OpenAI call (tests only; the default is runResearchReport). */
export function createAppServer({ researchRunner = createMultiProviderResearchRunner(quote) } = {}) {
  return createServer(async (req, res) => {
    let path = '';
    try {
      // Fixed base: the Host header is client-controlled and must never decide how the path parses.
      let u;
      try {
        u = new URL(req.url || '/', 'http://localhost');
      } catch {
        json(res, { error: 'Bad request' }, 400);
        return;
      }
      path = u.pathname;
      if (
        (req.method === 'POST' ||
          req.method === 'PUT' ||
          req.method === 'PATCH' ||
          req.method === 'DELETE') &&
        !sameOrigin(req)
      ) {
        json(res, { error: 'Cross-origin request blocked' }, 403);
        return;
      }
      if (path === '/api/auth/register' && req.method === 'POST') {
        const info = await register(req, await bodyJSON(req, 10000));
        if (reportConfigured()) {
          const u = await sessionUser({ headers: { cookie: info.cookie.split(';')[0] } });
          if (u)
            sendVerificationEmail(u, await issueVerification(u)).catch((e) =>
              console.error('Verification email:', e.message),
            );
        }
        replyUser(res, { user: info.user }, info.cookie);
        return;
      }
      if (path === '/api/auth/login' && req.method === 'POST') {
        const info = await login(req, await bodyJSON(req, 10000));
        replyUser(res, { user: info.user }, info.cookie);
        return;
      }
      if (path === '/api/auth/logout' && req.method === 'POST') {
        // A stale tab bound to another account must not sign out the account now in this browser.
        const who = await sessionUser(req),
          header = req.headers['x-pm-account'];
        if (who && header !== undefined && header !== who.id) {
          json(res, { error: 'account_mismatch' }, 409);
          return;
        }
        revoke(req);
        replyUser(res, { ok: true }, clearCookie(req));
        return;
      }
      if (path === '/api/auth/verify' && req.method === 'GET') {
        const good = await confirmVerification(u.searchParams.get('token') || '');
        const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Portafolio Manager · Verification</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0b1210;color:#e8f0ea;font-family:Arial"><main style="max-width:460px;padding:30px;border:1px solid #2e4a3d;border-radius:12px"><h1>${good ? 'Email verified' : 'Verification link invalid or expired'}</h1><p>${good ? 'Your account can now receive scheduled weekly research.' : 'Sign in and request a new link in Settings.'}</p><a style="color:#69dab5" href="/">Open Portafolio Manager</a></main></body></html>`;
        res.writeHead(good ? 200 : 400, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        res.end(html);
        return;
      }
      if (path === '/api/auth/me' && req.method === 'GET') {
        const who = await sessionUser(req);
        if (!who) {
          json(res, { error: 'Sign in required' }, 401);
          return;
        }
        json(res, { user: publicUser(who) });
        return;
      }
      if (path === '/api/health' && req.method === 'GET') {
        json(res, {
          ok: true,
          app: 'Portafolio Manager',
          version: '3.3',
          auth: 'required',
          emailConfigured: reportConfigured(),
          secConfigured: !!SEC_UA,
          source: 'Yahoo Finance (unofficial)',
        });
        return;
      }
      const account = await sessionUser(req);
      if (!account) {
        if (path.startsWith('/api/')) {
          json(res, { error: 'Sign in required', code: 'AUTH_REQUIRED' }, 401);
          return;
        }
        await staticFile(req, res, path);
        return;
      }
      // A tab bound to another account (stale after sign-out/sign-in) must not read or write this one.
      const bound = req.headers['x-pm-account'];
      if (
        (bound !== undefined && bound !== account.id) ||
        (bound === undefined && ACCOUNT_ROUTES.test(path))
      ) {
        json(res, { error: 'account_mismatch' }, 409);
        return;
      }
      if (path === '/api/auth/verify/request' && req.method === 'POST') {
        if (account.emailVerified) {
          json(res, { ok: true, alreadyVerified: true });
          return;
        }
        if (!reportConfigured()) {
          json(res, { error: 'Email delivery is not configured on the server.' }, 503);
          return;
        }
        if (!allowResend(account.id)) {
          json(
            res,
            { error: 'A verification email was sent recently. Wait a minute (at most 5 per day).' },
            429,
          );
          return;
        }
        await sendVerificationEmail(account, await issueVerification(account));
        json(res, { ok: true, message: 'Verification email requested.' });
        return;
      }
      if (path.startsWith('/api/ai/') || path === '/api/account/ai-workspace') {
        await autoVerifyIfNoMail();
        if (await handleV4Routes(req, res, path, quote)) return;
      }
      if (path === '/api/account/state' && req.method === 'GET') {
        const record = await getStateRecord(account);
        json(res, { state: record.state, revision: record.revision, accountId: account.id });
        return;
      }
      if (path === '/api/account/state' && req.method === 'PUT') {
        json(res, await putState(account, await bodyJSON(req)));
        return;
      }
      if (path === '/api/account/settings' && req.method === 'PATCH') {
        json(res, { user: await updateSettings(account, await bodyJSON(req, 12000)) });
        return;
      }
      if (path === '/api/account/risk-profile') {
        if (req.method === 'GET') {
          json(res, { profile: await getRiskProfile(account) });
          return;
        }
        if (req.method === 'PUT') {
          const input = await bodyJSON(req, 4096);
          try {
            const profile = await putRiskProfile(account, input);
            json(res, { profile });
          } catch (err) {
            json(res, { error: err.message || 'Invalid risk answers' }, 400);
          }
          return;
        }
        if (req.method === 'DELETE') {
          json(res, await deleteRiskProfile(account));
          return;
        }
        json(res, { error: 'Unsupported method' }, 405);
        return;
      }
      if (path === '/api/institutional/jobs' && req.method === 'GET') {
        json(res, { jobs: await listInstitutionalJobs(account) });
        return;
      }
      if (path === '/api/institutional/jobs' && req.method === 'POST') {
        const input = await bodyJSON(req, 2048),
          ticker = String(input?.ticker || '')
            .trim()
            .toUpperCase();
        if (!validTicker(ticker)) {
          json(res, { error: 'Invalid ticker' }, 400);
          return;
        }
        if (!hasAnyAI()) return aiNotConfigured(res);
        let result;
        try {
          result = await startInstitutionalJob(account, ticker, researchRunner, () =>
            admitResearch(account),
          );
        } catch (e) {
          if (e.status === 403 || e.status === 429) return refused(res, e);
          throw e;
        }
        json(res, { job: result.job, reused: result.reused }, 202);
        return;
      }
      if (path.startsWith('/api/institutional/jobs/')) {
        const tail = path.split('/').filter(Boolean),
          id = tail[3];
        if (tail.length !== 4) {
          json(res, { error: 'Not found' }, 404);
          return;
        }
        if (req.method === 'PATCH') {
          const result = await markInstitutionalJobRead(account, id);
          json(res, result || { error: 'Not found' }, result ? 200 : 404);
          return;
        }
        if (req.method === 'GET') {
          const job = await getInstitutionalJob(account, id);
          json(res, job || { error: 'Not found' }, job ? 200 : 404);
          return;
        }
      }

      if (path === '/api/intelligence' && req.method === 'GET') {
        const state = await getState(account);
        const t = [
          ...new Set([...(state?.holdings || []).map((x) => x.ticker), ...Object.keys(state?.matches || {})]),
        ];
        json(res, await getIntelligence(t));
        return;
      }
      if (path === '/api/reports/weekly.pdf' && req.method === 'GET') {
        const pdf = await withReportSlot(async () => pdfBytes(await createWeeklyData(account, quote)));
        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Content-Length': pdf.length,
          'Cache-Control': 'no-store',
          'Content-Disposition': 'attachment; filename="Portafolio_Manager_Weekly.pdf"',
          'X-Content-Type-Options': 'nosniff',
        });
        res.end(pdf);
        return;
      }
      if (path === '/api/reports/send-now' && req.method === 'POST') {
        if (!reportConfigured()) {
          json(
            res,
            { error: 'Email provider is not configured on this server.', code: 'EMAIL_NOT_CONFIGURED' },
            503,
          );
          return;
        }
        // Refuse before spending a PDF generation on an account that cannot receive it.
        if (!account.emailVerified) {
          json(
            res,
            { error: 'Verify your account email before enabling PDF delivery.', code: 'EMAIL_UNVERIFIED' },
            403,
          );
          return;
        }
        if ((await getState(account))?.demo === true) {
          json(
            res,
            { error: 'Sample data cannot be emailed. Import your holdings first.', code: 'SAMPLE_DATA' },
            409,
          );
          return;
        }
        if (!allowManualSend(account.id)) {
          json(res, { error: 'Manual report email limit reached. Try again later.', code: 'SEND_LIMIT' }, 429);
          return;
        }
        // The slot is held until the mail provider answers, not just while the PDF is built.
        const sent = await withReportSlot(async () => {
          const { data, pdf } = await generateAndStore(account, quote);
          return sendReport(account, data, pdf, { test: true });
        });
        json(res, sent);
        return;
      }
      if (path === '/api/reports/status' && req.method === 'GET') {
        json(res, {
          emailConfigured: reportConfigured(),
          emailVerified: !!account.emailVerified,
          nextSchedule: 'Sunday 09:00',
          timezone: account.timezone,
          language: account.language,
          weeklyEnabled: !!account.weeklyEnabled,
          lastReportDate: account.lastReportDate || null,
          recipient: account.email,
          serverRequired: true,
        });
        return;
      }
      if (req.method === 'POST' && path === '/api/report') {
        await handleResearchReport(req, res, researchRunner);
        return;
      }
      if (req.method !== 'GET') {
        json(res, { error: 'Sin permisos de escritura en cartera ni órdenes.' }, 405);
        return;
      }
      if (path === '/api/health') {
        json(res, {
          ok: true,
          app: 'Portafolio Manager',
          version: '1.0',
          time: new Date().toISOString(),
          secConfigured: !!SEC_UA,
          universe: L.CATALOG.length,
          feeds: [
            'SEC',
            'Yahoo chart (unofficial)',
            'Google News RSS (headlines)',
            'LDD reconstructed',
            'VIX Yahoo',
          ],
          aiConfigured: hasAnyAI(),
        });
        return;
      }
      if (path === '/api/market') {
        let vix = null,
          spy = null,
          benchmark = null,
          errors = {};
        await Promise.all([
          quote('^VIX')
            .then((x) => (vix = x))
            .catch((e) => (errors.vix = e.message)),
          quote('SPY')
            .then((x) => (spy = x))
            .catch((e) => (errors.spy = e.message)),
          benchmarkPE()
            .then((x) => (benchmark = x))
            .catch((e) => (errors.benchmark = e.message)),
        ]);
        const x = vix?.price;
        const regime = !Number.isFinite(x)
          ? null
          : x < 15
            ? 'Calma'
            : x < 20
              ? 'Normal'
              : x < 30
                ? 'Nerviosismo'
                : 'Miedo elevado';
        json(res, {
          asOf: new Date().toISOString(),
          vix: vix ? { value: vix.price, change: vix.day, asOf: vix.asOf, source: vix.source } : null,
          spy: spy ? { value: spy.price, day: spy.day, asOf: spy.asOf } : null,
          regime,
          benchmark,
          errors,
          note: 'VIX refleja volatilidad implícita esperada a ~30 días. Clasificación por bandas orientativa; NO es el índice CNN Fear & Greed ni una señal de compra.',
        });
        return;
      }
      if (path === '/api/peers') {
        const t = String(u.searchParams.get('t') || '').toUpperCase();
        if (!validTicker(t)) {
          json(res, { error: 'Ticker inválido' }, 400);
          return;
        }
        const wanted = Advanced.PEERS[t] || [];
        const items = await Promise.all(
          [t, ...wanted.slice(0, 4)].map(async (x) => {
            let q = null,
              r = null;
            try {
              q = await quote(x);
            } catch {}
            try {
              r = await secResearch(x, q?.price ?? null);
            } catch {}
            return {
              ticker: x,
              company: r?.company || L.BY_TICKER[x]?.name || x,
              price: q?.price || null,
              asOf: q?.asOf || null,
              verified: !!r?.verified,
              provenance: r?.verified ? 'sec' : 'sin verificar',
              ...(r?.metrics || {}),
              source: r?.sources?.[0]?.url || null,
              period: r?.period || null,
            };
          }),
        );
        json(res, {
          ticker: t,
          items,
          asOf: new Date().toISOString(),
          note: 'Cifras SEC solo cuando están verificadas; estimaciones y periodos no homogéneos se deben revisar. Sin datos, los ratios se omiten.',
        });
        return;
      }
      if (path === '/api/universe') {
        json(res, {
          asOf: isoNow(),
          note: 'Solo metadatos de universo. Precio y fundamentals se consultan por separado y no se inventan.',
          stocks: L.CATALOG.map((x) => ({
            ticker: x.ticker,
            name: x.name,
            sector: x.sector,
            layer: x.layer,
            track: x.track,
          })),
        });
        return;
      }
      if (path === '/api/search') {
        const q = String(u.searchParams.get('q') || '')
          .trim()
          .toLowerCase()
          .slice(0, 50);
        if (!q) {
          json(res, { results: [] });
          return;
        }
        let results;
        try {
          const all = await tickersSEC();
          results = all.rows
            .filter((x) => x.ticker.toLowerCase().includes(q) || x.name.toLowerCase().includes(q))
            .slice(0, 30);
        } catch (e) {
          results = L.CATALOG.filter(
            (x) => x.ticker.toLowerCase().includes(q) || x.name.toLowerCase().includes(q),
          )
            .slice(0, 30)
            .map((x) => ({ ticker: x.ticker, name: x.name, cik: null }));
        }
        json(res, { results });
        return;
      }
      if (path === '/api/quotes') {
        const tickers = [
          ...new Set(
            String(u.searchParams.get('t') || '')
              .toUpperCase()
              .split(',')
              .map((x) => x.trim())
              .filter(validTicker),
          ),
        ].slice(0, 100);
        if (!tickers.length) {
          json(res, { error: 'Especifica tickers válidos' }, 400);
          return;
        }
        const out = {};
        const errs = {};
        await Promise.all(
          tickers.map(async (t) => {
            try {
              out[t] = await quote(t);
            } catch (e) {
              errs[t] = e.message;
            }
          }),
        );
        json(res, { asOf: new Date().toISOString(), quotes: out, errors: errs });
        return;
      }
      if (path.startsWith('/api/stock/')) {
        const parts = path.split('/').filter(Boolean),
          t = decodeURIComponent(parts[2] || '').toUpperCase();
        if (!validTicker(t)) {
          json(res, { error: 'Ticker no válido' }, 400);
          return;
        }
        if (parts[3] === 'chart') {
          const range = ['1y', '5y', '10y'].includes(u.searchParams.get('range'))
            ? u.searchParams.get('range')
            : '1y';
          try {
            json(res, { ticker: t, range, quote: await quote(t, range) });
          } catch (e) {
            json(res, { ticker: t, error: e.message }, 503);
          }
          return;
        }
        let p = null;
        try {
          p = await quote(t);
        } catch {}
        try {
          const detail = await secResearch(t, p?.price || null);
          json(res, { ...detail, price: p?.price ?? null, priceAt: p?.asOf ?? null });
        } catch (e) {
          json(res, {
            ticker: t,
            company: L.BY_TICKER[t]?.name || t,
            verified: false,
            metrics: {},
            facts: [],
            filings: [],
            sources: [],
            price: p?.price ?? null,
            priceAt: p?.asOf ?? null,
            error: e.message,
            sourceStatus: { sec: 'No disponible', quote: p ? 'Yahoo (no oficial)' : 'Sin datos' },
          });
        }
        return;
      }
      if (path === '/api/news') {
        const tickers = [
          ...new Set(
            String(u.searchParams.get('t') || '')
              .toUpperCase()
              .split(',')
              .map((x) => x.trim())
              .filter(validTicker),
          ),
        ].slice(0, 14);
        json(res, {
          asOf: new Date().toISOString(),
          status: 'Titulares N2; hechos NO verificados independientemente',
          news: await publicNews(tickers),
        });
        return;
      }
      if (path.startsWith('/api/')) {
        json(res, { error: 'Ruta inexistente' }, 404);
        return;
      }
      await staticFile(req, res, path);
    } catch (e) {
      console.error('[API]', path, e.message);
      if (res.headersSent) {
        res.destroy();
        return;
      }
      json(res, e.body || { error: e.message || 'Server request failed' }, e.status || 503);
    }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await initAccounts();
  const server = createAppServer();
  server.listen(PORT, process.env.HOST || '127.0.0.1', () => {
    console.log(
      `Portafolio Manager: http://localhost:${PORT} | account login required | Weekly email ${reportConfigured() ? 'configured' : 'not configured'}`,
    );
    startWeeklyScheduler(quote);
  });
}
