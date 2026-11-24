import { fileURLToPath as __pmFileURL } from 'node:url';
import { dirname as __pmDirname } from 'node:path';
const __pmHere = __pmDirname(__pmFileURL(import.meta.url));
/** Scheduled weekly portfolio intelligence. Real holdings required; no invented quotes or events. */
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { getState, usersForReports, markSent, claimReport, releaseReportClaim } from './accounts.mjs';
import { getIntelligence } from './intelligence.mjs';
import { reportsRoot } from './paths.mjs';
const errAt = new Map();
// Rows in the PDF holdings table. Totals, P/L and coverage always use every holding.
export const DETAIL_ROWS = 60;
const SYMBOL = /^[A-Z0-9.\-^=]{1,15}$/;
const m = (n) => (Number.isFinite(n) ? Math.round(n * 100) / 100 : null);
const cash = (n) =>
  Number.isFinite(n)
    ? '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })
    : 'Not available';
function localParts(zone, date = new Date()) {
  const a = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date),
    o = Object.fromEntries(a.map((x) => [x.type, x.value]));
  return { weekday: o.weekday, date: `${o.year}-${o.month}-${o.day}`, hour: +o.hour, minute: +o.minute };
}
function normalizeTicker(t) {
  return String(t || '')
    .trim()
    .toUpperCase();
}
const sectors = {
  NVDA: 'Semiconductors',
  AVGO: 'Semiconductors',
  AMD: 'Semiconductors',
  TSM: 'Semiconductors',
  ASML: 'Semiconductors',
  MU: 'Semiconductors',
  MSFT: 'Cloud / software',
  AMZN: 'Cloud / software',
  GOOGL: 'Cloud / software',
  META: 'Platforms / media',
  PLTR: 'Software / AI',
  CRWD: 'Cybersecurity',
  VRT: 'Datacenter infrastructure',
  NRG: 'Power',
  GEV: 'Power',
  VOO: 'Index funds',
  JPM: 'Financials',
  JNJ: 'Healthcare',
  PG: 'Consumer staples',
  LLY: 'Healthcare',
};
const groups = {
  NVDA: 'Compute & custom chips',
  AVGO: 'Compute & custom chips',
  AMD: 'Compute & custom chips',
  TSM: 'Fabrication & equipment',
  ASML: 'Fabrication & equipment',
  MU: 'Memory',
  MSFT: 'Cloud & platforms',
  AMZN: 'Cloud & platforms',
  GOOGL: 'Cloud & platforms',
  META: 'Cloud & platforms',
  PLTR: 'AI software & cybersecurity',
  CRWD: 'AI software & cybersecurity',
  VRT: 'Data-center power & infrastructure',
  GEV: 'Data-center power & infrastructure',
  NRG: 'Data-center power & infrastructure',
  VOO: 'Broad market ETF',
  JNJ: 'Defensive',
  PG: 'Defensive',
};
async function lookupSafe(quote, t, range = '1y') {
  try {
    const x = await quote(t, range);
    return x?.price > 0 ? x : null;
  } catch {
    return null;
  }
}
export async function createWeeklyData(user, quote) {
  const state = await getState(user);
  // Every open position counts. One whose symbol cannot be quoted stays in as an unpriced line,
  // so it lowers coverage instead of silently disappearing from the totals.
  const list = (x) => (Array.isArray(x) ? x.filter((y) => y && typeof y === 'object') : []);
  const holdings = list(state?.holdings).filter((h) => Number(h.shares) > 0);
  const symbols = [...new Set(holdings.map((h) => normalizeTicker(h.ticker)).filter((t) => SYMBOL.test(t)))];
  let all = {};
  for (let i = 0; i < symbols.length; i += 7) {
    const group = await Promise.all(
      symbols.slice(i, i + 7).map(async (t) => [t, await lookupSafe(quote, t)]),
    );
    for (const [t, q] of group) all[t] = q;
  }
  const [spy, qqq, vix, intelligence] = await Promise.all([
    lookupSafe(quote, 'SPY'),
    lookupSafe(quote, 'QQQ'),
    lookupSafe(quote, '^VIX'),
    getIntelligence(symbols),
  ]);
  const lines = holdings.map((h) => {
    const t = normalizeTicker(h.ticker).slice(0, 15),
      raw = all[t],
      // Totals are USD. A quote in another currency (or with none stated) is left unpriced, not mixed in.
      nonUsd = !!raw && raw.currency !== undefined && raw.currency !== 'USD',
      // A stale quote is a cached fallback after a failed fetch, not a verified current price.
      stale = !!raw && raw.stale === true,
      q = nonUsd || stale ? null : raw,
      shares = Number(h.shares),
      // A missing cost stays missing: Number(null) is 0, which would book the whole value as profit.
      cost = h.cost === null || h.cost === undefined || h.cost === '' ? NaN : Number(h.cost),
      value = q?.price ? shares * q.price : null,
      invested = Number.isFinite(cost) ? shares * cost : null;
    return {
      ticker: t,
      unpricedReason:
        value !== null
          ? null
          : nonUsd
            ? `non-USD quote (${raw.currency ?? 'unknown'})`
            : stale
              ? 'stale quote'
              : 'no quote',
      shares: m(shares),
      avgCost: Number.isFinite(cost) ? m(cost) : null,
      price: q?.price ?? null,
      value: m(value),
      invested: m(invested),
      gain: value !== null && invested !== null ? m(value - invested) : null,
      day: q?.day ?? null,
      week: q?.week ?? null,
      month: q?.month ?? null,
      fromHigh: q?.fromHigh ?? null,
      priceAt: q?.asOf ?? null,
      sector: sectors[t] || 'Other / classify',
      layer: groups[t] || 'Unclassified',
    };
  });
  const valued = lines.filter((l) => Number.isFinite(l.value));
  const total = valued.reduce((s, l) => s + l.value, 0),
    basis = valued.reduce((s, l) => s + (l.invested || 0), 0),
    riskKnown = total > 0 && valued.length === lines.length,
    // P/L needs a cost for every holding as well as a quote.
    basisKnown = riskKnown && valued.every((l) => l.invested !== null),
    unpricedLines = lines.filter((l) => !Number.isFinite(l.value)),
    unpriced = unpricedLines.map((l) => l.ticker),
    notDetailed = Math.max(0, lines.length - DETAIL_ROWS);
  for (const l of lines) l.weight = l.value !== null && total > 0 ? m((l.value / total) * 100) : null;
  const weight = (prop) => {
    const acc = {};
    for (const l of valued) acc[l[prop]] = (acc[l[prop]] || 0) + l.value;
    return Object.entries(acc)
      .map(([name, value]) => ({
        name,
        value: m(value),
        weight: total > 0 ? m((value / total) * 100) : null,
      }))
      .sort((a, b) => b.value - a.value);
  };
  const top = lines.filter((l) => l.weight !== null).sort((a, b) => b.weight - a.weight);
  // Weights of a partly priced portfolio are shares of the priced subset only, so threshold alerts are
  // withheld until every holding is valued; the data-gap entry below reports the coverage instead.
  const risk = [
    ...(riskKnown ? top : [])
      .filter((l) => l.weight >= 20)
      .map((l) => ({
        level: l.weight >= 25 ? 'Critical' : 'High',
        title: `${l.ticker} concentration ${l.weight.toFixed(1)}%`,
        detail: 'Position monitoring threshold 20%; policy cap 25%.',
      })),
  ];
  for (const c of riskKnown ? weight('layer') : [])
    if (c.weight > 40)
      risk.push({
        level: 'Critical',
        title: `Layer concentration ${c.name}: ${c.weight.toFixed(1)}%`,
        detail: 'Policy layer cap 40%.',
      });
  if (!riskKnown)
    risk.unshift({
      level: 'Data gap',
      title: 'Partial portfolio valuation',
      detail: `Concentration alerts withheld. Verified quotes available for ${valued.length}/${lines.length} positions${unpriced.length ? ` (missing: ${unpriced.slice(0, 8).join(', ')}${unpriced.length > 8 ? ` and ${unpriced.length - 8} more` : ''})` : ''}. No comprehensive portfolio return can be stated.`,
    });
  // Return proxies use only holdings that have that return, re-weighted among themselves; coverage says how many.
  const proxyCoverage = (kind) => `${valued.filter((l) => Number.isFinite(l[kind])).length}/${lines.length}`;
  const proxy = (kind) => {
    if (!(total > 0 && riskKnown)) return null;
    const known = valued.filter((l) => Number.isFinite(l[kind])),
      base = known.reduce((sum, l) => sum + l.value, 0);
    return base > 0 ? m(known.reduce((sum, l) => sum + (l.value * l[kind]) / base, 0)) : null;
  };
  const matches = state?.matches && typeof state.matches === 'object' ? state.matches : {};
  const reviews = Object.values(matches)
    .filter((x) => x && typeof x === 'object' && typeof x.ticker === 'string')
    .slice(0, 16)
    .map((x) => ({ ticker: x.ticker, priority: !!x.priority, reason: x.reason || null, validated: false }));
  const changes = list(state?.snapshots)
    .slice(-12)
    .map((x) => ({
      date: x.date || x.fecha,
      portfolioValue: x.value || x.valor,
      netFlow: x.flow || x.flujo,
    }));
  const report = {
    id: user.id,
    owner: user.email,
    timezone: user.timezone,
    language: user.language,
    generatedAt: new Date().toISOString(),
    asOfMarket:
      valued
        .map((l) => l.priceAt)
        .filter(Boolean)
        .sort()
        .at(-1) || null,
    hasPortfolio: lines.length > 0,
    // The account still holds the sample portfolio: every output must say so.
    sampleData: state?.demo === true,
    valuationComplete: riskKnown,
    summary: {
      totalValue: riskKnown ? m(total) : null,
      verifiedValue: m(total),
      costBasis: basisKnown ? m(basis) : null,
      unrealized: basisKnown ? m(total - basis) : null,
      unrealizedPct: basisKnown && basis > 0 ? m(((total - basis) / basis) * 100) : null,
      dayProxy: proxy('day'),
      weekProxy: proxy('week'),
      monthProxy: proxy('month'),
      dayProxyCoverage: proxyCoverage('day'),
      weekProxyCoverage: proxyCoverage('week'),
      monthProxyCoverage: proxyCoverage('month'),
      coverage: `${valued.length}/${lines.length}`,
      holdingCount: lines.length,
      quotedCount: valued.length,
      coveragePct: lines.length ? m((valued.length / lines.length) * 100) : null,
      unpriced,
      unpricedReasons: Object.fromEntries(unpricedLines.map((l) => [l.ticker, l.unpricedReason])),
      top3: riskKnown ? top.slice(0, 3).reduce((sum, l) => sum + (l.weight || 0), 0) : null,
    },
    lines,
    detailLimit: DETAIL_ROWS,
    holdingsNotDetailed: notDetailed,
    sectorWeights: weight('sector'),
    layerWeights: weight('layer'),
    risk: risk.slice(0, 12),
    benchmarks: {
      spy: spy && { price: spy.price, day: spy.day, week: spy.week, month: spy.month },
      qqq: qqq && { price: qqq.price, day: qqq.day, week: qqq.week },
      vix: vix && { price: vix.price, asOf: vix.asOf },
    },
    intelligence,
    earnings: intelligence.earnings.slice(0, 10),
    earningsCalendar: intelligence.calendar.slice(0, 20),
    ideas: reviews,
    snapshots: changes,
    footnotes: [
      'Valuation excludes holdings without an available quote; no account time-weighted return is inferred from market value.',
      'Daily / weekly / monthly portfolio moves are current-weight estimates and do not adjust for historical trades or cash flows.',
      'Earnings calendar dates require confirmation from issuer investor relations or an exchange.',
      'Headlines are research leads, not independently verified events. No trading instructions or guaranteed targets.',
      'All securities information is for research; account holdings were imported by the user, not obtained from an authenticated Yahoo Finance portfolio API.',
    ],
  };
  return report;
}
let generating = 0;
/** At most PM_REPORT_CONCURRENCY (default 2) on-demand report generations at once; extra requests get 429. */
export async function withReportSlot(job) {
  const n = Number(process.env.PM_REPORT_CONCURRENCY);
  if (generating >= (Number.isInteger(n) && n > 0 ? n : 2))
    throw Object.assign(new Error('Report generation is busy. Try again in a minute.'), { status: 429 });
  generating++;
  try {
    return await job();
  } finally {
    generating--;
  }
}
export async function pdfBytes(report) {
  return new Promise((resolvePromise, reject) => {
    const proc = spawn(
      process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3'),
      [resolve(__pmHere, 'weekly_pdf.py')],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    );
    const chunks = [];
    let error = '',
      length = 0;
    proc.stdout.on('data', (c) => {
      length += c.length;
      if (length < 9_000_000) chunks.push(c);
      else proc.kill();
    });
    proc.stderr.on('data', (c) => (error += c.toString().slice(0, 2000)));
    proc.once('error', reject);
    proc.once('close', (code) => {
      if (code !== 0) reject(new Error('PDF generation failed: ' + error.slice(-800)));
      else resolvePromise(Buffer.concat(chunks));
    });
    proc.stdin.end(JSON.stringify(report));
  });
}
export const reportConfigured = () => !!(process.env.RESEND_API_KEY && process.env.REPORT_FROM_EMAIL);
function debrief(r) {
  const s = r.summary,
    conc = r.risk.filter((x) => x.level === 'Critical' || x.level === 'High'),
    alerts = conc.map((x) => x.title).slice(0, 3),
    headlines = r.intelligence.items.slice(0, 3);
  const cards = [
    `Portfolio valuation: ${cash(s.totalValue)} (${s.coverage} quoted positions).`,
    `Unrealized P/L: ${cash(s.unrealized)}${s.unrealizedPct !== null ? ` (${s.unrealizedPct}%)` : ''}.`,
    `Weekly move proxy: ${s.weekProxy === null ? 'Not available' : s.weekProxy + '%'}.`,
    `Risk alerts: ${!r.valuationComplete ? `withheld until every holding is priced (coverage ${s.coverage}).` : alerts.length ? alerts.join('; ') : 'No concentration threshold breached.'}`,
    `Research coverage: ${headlines.length} priority news leads highlighted; see the attached PDF for supporting sources and the full review.`,
  ];
  return {
    plain: `Portafolio Manager | Weekly Portfolio Intelligence\n\n${cards.join('\n')}\n\nFull review attached (PDF).\nMarket data: Yahoo Finance unofficial feed; research leads require verification.`,
    html: `<div style="background:#0b1210;color:#e5efe9;padding:32px;font:14px/1.7 Arial,sans-serif;max-width:680px;margin:auto"><div style="font-size:12px;letter-spacing:.15em;color:#72c8ad">PORTAFOLIO MANAGER</div><h1 style="font-size:26px;font-weight:600;margin:16px 0">Weekly Portfolio Intelligence</h1><p style="color:#a3b4aa">Sunday research briefing · ${r.timezone}</p>${cards.map((x) => `<p style="border-top:1px solid #304239;padding:12px 0;margin:0">${x.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</p>`).join('')}<p style="padding-top:18px;color:#91a69a">The attached PDF contains holdings, risk concentrations, market comparisons, portfolio-specific headlines, earnings coverage, and watchlist candidates for further diligence. No orders have been placed.</p></div>`,
  };
}
export async function sendVerificationEmail(user, token) {
  if (!reportConfigured()) return { ok: false, reason: 'Mail provider not configured' };
  const origin = (process.env.PUBLIC_ORIGIN || 'http://localhost:8787').replace(/\/$/, '');
  const url = origin + '/api/auth/verify?token=' + encodeURIComponent(token);
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.REPORT_FROM_EMAIL,
      to: [user.email],
      subject: 'Portafolio Manager | Verify your email',
      text: `Verify the email address for your Portafolio Manager account. This link expires after 24 hours:\n\n${url}\n\nIf you did not register, ignore this message.`,
      html: `<div style="font-family:Arial;background:#0b1210;color:#e8f0ea;padding:32px"><h2>Portafolio Manager</h2><p>Verify your account email to enable weekly PDF delivery.</p><p><a style="color:#53c5a5" href="${url}">Verify email</a></p><small>Link expires in 24 hours.</small></div>`,
    }),
  });
  const out = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(out.message || 'Email verification could not be sent');
  return { ok: true };
}
export async function sendReport(user, report, pdf, { test = false, localDate } = {}) {
  // Checked on the exact report being attached, for manual and scheduled delivery alike.
  if (report?.sampleData === true)
    throw Object.assign(new Error('Sample data cannot be emailed. Import your holdings first.'), {
      status: 409,
      code: 'SAMPLE_DATA',
    });
  if (!user.emailVerified)
    throw Object.assign(new Error('Verify your account email before enabling PDF delivery.'), {
      status: 403,
    });
  if (!reportConfigured())
    throw Object.assign(new Error('Set RESEND_API_KEY and REPORT_FROM_EMAIL in the server environment.'), {
      status: 503,
    });
  const brief = debrief(report),
    date = localDate || localParts(user.timezone).date;
  const body = {
    from: process.env.REPORT_FROM_EMAIL,
    to: [user.email],
    subject: `Portafolio Manager | Weekly Intelligence | ${date}${test ? ' (manual delivery)' : ''}`,
    text: brief.plain,
    html: brief.html,
    attachments: [{ filename: `Portafolio_Manager_Weekly_${date}.pdf`, content: pdf.toString('base64') }],
    tags: [{ name: 'category', value: 'weekly-portfolio' }],
  };
  const ctl = new AbortController(),
    tm = setTimeout(() => ctl.abort(), 30000);
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `pm-${user.id}-${date}${test ? '-manual-' + Date.now() : ''}`,
      },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error('Email provider rejected delivery: ' + (data.message || response.status));
    return { ok: true, id: data.id || null, to: user.email };
  } finally {
    clearTimeout(tm);
  }
}
export async function generateAndStore(user, quote, { localDate } = {}) {
  const data = await createWeeklyData(user, quote),
    pdf = await pdfBytes(data);
  await mkdir(reportsRoot(), { recursive: true, mode: 0o700 });
  const path = join(reportsRoot(), `${user.id}-${localDate || localParts(user.timezone).date}.pdf`);
  await writeFile(path, pdf, { mode: 0o600 });
  return { data, pdf, path };
}
const claims = new Set();
// A persisted claim younger than this means another process (or a crashed send) still owns the slot.
const CLAIM_TTL = 30 * 60_000;
/**
 * One pass over the accounts. Each (account, local Sunday) is claimed in memory before the first await, so an
 * overlapping tick skips it, and persisted before generating. The claimed local date is the one used for the
 * PDF name, the email subject and idempotency key, and markSent, even if the send finishes after midnight.
 * `deps` lets tests replace generation and delivery.
 */
export async function schedulerTick(quote, { now = new Date(), deps = {} } = {}) {
  if (!reportConfigured()) return { checked: 0, status: 'mail-not-configured' };
  const generate = deps.generateAndStore || generateAndStore,
    send = deps.sendReport || sendReport;
  let checked = 0;
  for (const u of await usersForReports()) {
    const local = localParts(u.timezone, now),
      slot = u.id + ':' + local.date;
    if (local.weekday !== 'Sunday' || local.hour < 9 || u.lastReportDate === local.date) continue;
    if (claims.has(slot)) continue;
    if (u.reportClaim?.date === local.date && now.getTime() - u.reportClaim.at < CLAIM_TTL) continue;
    const failure = errAt.get(u.id);
    if (failure && now.getTime() - failure < 30 * 60_000) continue;
    claims.add(slot);
    checked++;
    try {
      await claimReport(u, local.date);
      // Sample portfolios are never mailed as if they were the account's holdings.
      if ((await getState(u))?.demo === true) {
        await releaseReportClaim(u, local.date);
        continue;
      }
      const { data, pdf } = await generate(u, quote, { localDate: local.date });
      // Settings may have changed while the PDF was being built.
      if (!u.weeklyEnabled || !u.emailVerified) {
        await releaseReportClaim(u, local.date);
        continue;
      }
      await send(u, data, pdf, { localDate: local.date });
      await markSent(u, local.date);
      errAt.delete(u.id);
      console.log('[Weekly]', u.id, local.date, 'sent');
    } catch (e) {
      errAt.set(u.id, now.getTime());
      await releaseReportClaim(u, local.date).catch(() => {});
      console.error('[Weekly]', u.id, local.date, String(e.message).slice(0, 180));
    } finally {
      claims.delete(slot);
    }
  }
  return { checked, status: 'complete' };
}
export function startWeeklyScheduler(quote) {
  setTimeout(() => schedulerTick(quote).catch((e) => console.error('Scheduler startup:', e.message)), 5000);
  const interval = setInterval(
    () => schedulerTick(quote).catch((e) => console.error('Scheduler:', e.message)),
    60_000,
  );
  interval.unref();
  return interval;
}
export { localParts };
