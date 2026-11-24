/** Portafolio Manager v4.0 — Multimodal Vision ADR, Thesis Tracker, Pre-Buy Stress-Test, Copilot & Cloud Sync */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { getState, getRiskProfile, sessionUser } from './accounts.mjs';
import { getIntelligence } from './intelligence.mjs';
import { privateRoot } from './paths.mjs';

const REDIS_URL = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
export const hasRedis = () => Boolean(REDIS_URL && REDIS_TOKEN);
export const hasAnyAI = () => Boolean(
  (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim()) ||
  (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'delegated-to-multi-provider-runner') ||
  (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim())
);

let coldSynced = false;

async function redis(cmd) {
  const r = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error(d.error || `Redis HTTP ${r.status}`);
  return d.result;
}

export async function pullFromCloud() {
  if (!hasRedis() || coldSynced) return;
  try {
    const raw = await redis(['HGETALL', 'pm:v4:files']);
    if (Array.isArray(raw) && raw.length >= 2) {
      const root = privateRoot();
      for (let i = 0; i < raw.length; i += 2) {
        const rel = raw[i], content = raw[i + 1];
        if (!rel || rel.includes('..')) continue;
        const full = join(root, rel);
        await mkdir(dirname(full), { recursive: true, mode: 0o700 });
        await writeFile(full, content, { mode: 0o600 });
      }
    }
    coldSynced = true;
  } catch (e) {
    console.error('[cloud-pull]', e.message);
  }
}

export async function pushToCloud() {
  if (!hasRedis()) return;
  try {
    const root = privateRoot();
    await mkdir(root, { recursive: true, mode: 0o700 });
    async function walkDir(dir, prefix = '') {
      const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
      const pairs = [];
      for (const ent of entries) {
        if (ent.name.includes('.tmp')) continue;
        const rel = prefix ? `${prefix}/${ent.name}` : ent.name;
        const full = join(dir, ent.name);
        if (ent.isDirectory()) pairs.push(...(await walkDir(full, rel)));
        else pairs.push(rel, await readFile(full, 'utf8'));
      }
      return pairs;
    }
    const flat = await walkDir(root);
    if (flat.length) await redis(['HSET', 'pm:v4:files', ...flat]);
  } catch (e) {
    console.error('[cloud-push]', e.message);
  }
}

export async function autoVerifyIfNoMail() {
  if (process.env.RESEND_API_KEY && process.env.REPORT_FROM_EMAIL) return;
  try {
    const f = join(privateRoot(), 'accounts.json');
    const rows = JSON.parse(await readFile(f, 'utf8'));
    if (Array.isArray(rows) && rows.some((u) => !u.emailVerified)) {
      for (const u of rows) u.emailVerified = true;
      await writeFile(f, JSON.stringify(rows, null, 2), { mode: 0o600 });
    }
  } catch {}
}

// --- AI Workspace Store (Theses / Sustentos de Compra + Copilot History) ---
const aiFile = (u) => join(privateRoot(), `${u.id}.ai.json`);
export async function getAiWorkspace(u) {
  try {
    const data = JSON.parse(await readFile(aiFile(u), 'utf8'));
    return { theses: data.theses || {}, chat: Array.isArray(data.chat) ? data.chat.slice(-30) : [] };
  } catch {
    return { theses: {}, chat: [] };
  }
}

export async function saveAiWorkspace(u, next) {
  await mkdir(privateRoot(), { recursive: true, mode: 0o700 });
  const clean = {
    theses: next.theses && typeof next.theses === 'object' ? next.theses : {},
    chat: Array.isArray(next.chat) ? next.chat.slice(-30) : [],
    updatedAt: new Date().toISOString(),
  };
  await writeFile(aiFile(u), JSON.stringify(clean, null, 2), { mode: 0o600 });
  await pushToCloud();
  return clean;
}

// --- ETF Look-Through Decomposition ---
const ETF_LOOKTHROUGH = {
  VOO: { Information_Technology: 0.32, Financials: 0.13, Communication_Services: 0.09, Healthcare: 0.11, Consumer_Discretionary: 0.10, Industrials: 0.08, Other: 0.17, aiEcosystemShare: 0.42 },
  SPY: { Information_Technology: 0.32, Financials: 0.13, Communication_Services: 0.09, Healthcare: 0.11, Consumer_Discretionary: 0.10, Industrials: 0.08, Other: 0.17, aiEcosystemShare: 0.42 },
  IVV: { Information_Technology: 0.32, Financials: 0.13, Communication_Services: 0.09, Healthcare: 0.11, Consumer_Discretionary: 0.10, Industrials: 0.08, Other: 0.17, aiEcosystemShare: 0.42 },
  VTI: { Information_Technology: 0.30, Financials: 0.13, Communication_Services: 0.08, Healthcare: 0.12, Consumer_Discretionary: 0.10, Industrials: 0.09, Other: 0.18, aiEcosystemShare: 0.38 },
  QQQ: { Information_Technology: 0.51, Communication_Services: 0.16, Consumer_Discretionary: 0.13, Healthcare: 0.06, Consumer_Staples: 0.05, Other: 0.09, aiEcosystemShare: 0.68 },
  QQQM: { Information_Technology: 0.51, Communication_Services: 0.16, Consumer_Discretionary: 0.13, Healthcare: 0.06, Consumer_Staples: 0.05, Other: 0.09, aiEcosystemShare: 0.68 },
  SMH: { Semiconductors: 1.0, aiEcosystemShare: 0.95 },
  SOXX: { Semiconductors: 1.0, aiEcosystemShare: 0.92 },
};

export async function buildPortfolioContext(user, clientSnapshot = null) {
  const [serverState, risk, workspace] = await Promise.all([
    getState(user).catch(() => null),
    getRiskProfile(user).catch(() => null),
    getAiWorkspace(user),
  ]);
  const state = serverState?.holdings?.length ? serverState : clientSnapshot || serverState || { holdings: [] };
  const holdings = Array.isArray(state.holdings) ? state.holdings : [];
  const quotes = state.quotes || {};

  let totalValue = 0, totalCost = 0;
  const positions = holdings.map((h) => {
    const t = String(h.ticker || '').toUpperCase();
    const price = Number(quotes[t]?.price || h.price || 0);
    const shares = Number(h.shares || 0);
    const cost = h.cost !== null && h.cost !== undefined && h.cost !== '' && Number.isFinite(Number(h.cost)) ? Number(h.cost) : null;
    const value = price > 0 ? shares * price : 0;
    if (value > 0) totalValue += value;
    if (cost !== null && shares > 0) totalCost += shares * cost;
    return {
      ticker: t,
      shares,
      avgCost: cost,
      marketPrice: price || null,
      marketValueUSD: value ? Math.round(value * 100) / 100 : null,
      unrealizedPL: value && cost !== null ? Math.round((value - shares * cost) * 100) / 100 : null,
      buyThesis: workspace.theses?.[t] || null,
    };
  });

  const lookThroughSectors = {};
  let effectiveAiTechWeightPct = 0;
  for (const p of positions) {
    p.weightPct = totalValue > 0 && p.marketValueUSD ? Math.round((p.marketValueUSD / totalValue) * 1000) / 10 : 0;
    const etf = ETF_LOOKTHROUGH[p.ticker];
    if (etf) {
      for (const [sec, ratio] of Object.entries(etf)) {
        if (sec === 'aiEcosystemShare') continue;
        lookThroughSectors[sec] = Math.round(((lookThroughSectors[sec] || 0) + p.weightPct * ratio) * 10) / 10;
      }
      effectiveAiTechWeightPct += p.weightPct * (etf.aiEcosystemShare || 0);
    } else {
      lookThroughSectors['Direct_' + p.ticker] = p.weightPct;
    }
  }

  return {
    asOf: new Date().toISOString(),
    portfolioSummary: {
      totalMarketValueUSD: Math.round(totalValue * 100) / 100,
      totalCostBasisUSD: Math.round(totalCost * 100) / 100,
      positionCount: positions.length,
      policyLimits: { singlePositionAlertPct: 20, singlePositionHardCapPct: 25, strategyLayerCapPct: 40 },
      etfLookThroughExposurePct: lookThroughSectors,
      etfImpliedAiTechContributionPct: Math.round(effectiveAiTechWeightPct * 10) / 10,
    },
    investorRiskProfile: risk
      ? {
          willingnessScore0to100: risk.willingness,
          capacityScore0to100: risk.capacity,
          suggestedRiskCeiling0to100: risk.ceiling,
          band: risk.band,
          activeConstraints: risk.constraints || [],
        }
      : 'Not completed yet in Settings > Investor Risk Assessment',
    positions,
    watchlistTickers: Object.keys(state.matches || {}),
    savedBuyTheses: workspace.theses || {},
  };
}

export async function callLLM({ system, messages, images = [], webSearch = false, maxTokens = 3200 }) {
  if (!hasAnyAI()) {
    throw Object.assign(
      new Error('Configura ANTHROPIC_API_KEY (Claude), OPENAI_API_KEY o GEMINI_API_KEY en las Environment Variables de Vercel.'),
      { status: 503, code: 'AI_NOT_CONFIGURED' }
    );
  }

  if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim()) {
    const models = process.env.ANTHROPIC_MODEL
      ? [process.env.ANTHROPIC_MODEL]
      : ['claude-sonnet-4-6', 'claude-sonnet-4-5', 'claude-sonnet-4-20250514', 'claude-3-7-sonnet-latest', 'claude-3-5-sonnet-latest'];
    let lastErr = null;
    const formattedMsgs = messages.map((m, idx) => {
      if (idx === messages.length - 1 && images.length && m.role === 'user') {
        return {
          role: 'user',
          content: [
            ...images.map((img) => ({
              type: 'image',
              source: { type: 'base64', media_type: img.mediaType, data: img.base64 },
            })),
            { type: 'text', text: m.content },
          ],
        };
      }
      return { role: m.role, content: m.content };
    });

    for (const model of models) {
      const searchModes = webSearch ? [true, false] : [false];
      for (const useTool of searchModes) {
        const ctrl = new AbortController(), tm = setTimeout(() => ctrl.abort(), 54000);
        try {
          const r = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': process.env.ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model,
              max_tokens: maxTokens,
              system,
              messages: formattedMsgs,
              ...(useTool ? { tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4 }] } : {}),
            }),
            signal: ctrl.signal,
          });
          const d = await r.json().catch(() => ({}));
          if (r.ok) {
            const text = (d.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n\n').trim();
            if (text) return { text, model, provider: useTool ? 'Anthropic Claude + Web Search' : 'Anthropic Claude' };
          }
          lastErr = new Error(d?.error?.message || `Claude HTTP ${r.status}`);
          if (r.status === 404) break;
          if (r.status === 400 && useTool) continue;
          throw lastErr;
        } finally {
          clearTimeout(tm);
        }
      }
    }
    throw lastErr || new Error('Anthropic API failed');
  }

  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'delegated-to-multi-provider-runner') {
    const model = process.env.OPENAI_MODEL || 'gpt-4o';
    const content = [
      ...images.map((img) => ({ type: 'input_image', image_url: `data:${img.mediaType};base64,${img.base64}` })),
      { type: 'input_text', text: messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n') },
    ];
    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        instructions: system,
        input: [{ role: 'user', content }],
        ...(webSearch ? { tools: [{ type: 'web_search' }] } : {}),
        max_output_tokens: maxTokens,
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d?.error?.message || `OpenAI HTTP ${r.status}`);
    const text = (d.output || []).flatMap((x) => x.content || []).filter((x) => x.type === 'output_text').map((x) => x.text).join('\n\n') || d.output_text || '';
    return { text, model, provider: 'OpenAI' };
  }

  const gModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const parts = [
    ...images.map((img) => ({ inlineData: { mimeType: img.mediaType, data: img.base64 } })),
    { text: messages.map((m) => `${m.role}: ${m.content}`).join('\n\n') },
  ];
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${gModel}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts }],
      ...(webSearch ? { tools: [{ google_search: {} }] } : {}),
    }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d?.error?.message || `Gemini HTTP ${r.status}`);
  const text = (d.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('\n\n').trim();
  return { text, model: gModel, provider: 'Google Gemini' };
}

export function createMultiProviderResearchRunner(quoteFn) {
  return async function researchRunner(ticker, language = 'es') {
    let quoteData = null, intel = null;
    try { quoteData = await quoteFn(ticker); } catch {}
    try { intel = await getIntelligence([ticker]); } catch {}
    const sys = `You are an independent institutional equity analyst. Write a rigorous 9-section institutional initiation report in ${language === 'es' ? 'Spanish' : 'English'} using primary SEC filings (10-K, 10-Q, 8-K) and verified financial reporting:
1. Investment snapshot (price, date, stance, verified catalyst, invalidation risk)
2. Business & value chain
3. Industry, macro & geopolitics
4. Financial quality (revenue, margins, EPS, FCF, cash vs debt)
5. Competitive valuation vs peers
6. Bear / Base / Bull valuation sensitivities
7. Catalysts & thesis-breakers
8. Portfolio concentration & long-term technical context
9. Two-minute decision summary & primary source links.
Never invent figures or consensus targets.`;
    const out = await callLLM({
      system: sys,
      messages: [{ role: 'user', content: JSON.stringify({ ticker, quote: quoteData, recentHeadlines: intel?.items?.slice(0, 8) || [] }) }],
      webSearch: true,
      maxTokens: 4500,
    });
    return {
      ticker,
      text: out.text,
      generatedAt: new Date().toISOString(),
      provider: out.provider,
      model: out.model,
      sourceNote: 'AI-generated institutional research. Verify all figures against primary SEC filings.',
    };
  };
}

function sendJSON(res, obj, status = 200) {
  const s = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(s);
}

async function readBody(req, max = 12_000_000) {
  if (req.readableEnded && req.body !== undefined) {
    if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString('utf8'));
    if (typeof req.body === 'string') return JSON.parse(req.body);
    if (typeof req.body === 'object' && req.body !== null) return req.body;
  }
  const chunks = [];
  let len = 0;
  for await (const c of req) {
    const buf = Buffer.isBuffer(c) ? c : Buffer.from(c);
    len += buf.length;
    if (len > max) throw Object.assign(new Error('Payload exceeds limit (max 12MB)'), { status: 413 });
    chunks.push(buf);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function extractJSONObject(text) {
  const clean = String(text || '').replace(/```json|```/gi, '').trim();
  const first = clean.indexOf('{'), last = clean.lastIndexOf('}');
  if (first >= 0 && last > first) return JSON.parse(clean.slice(first, last + 1));
  throw new Error('Could not parse structured JSON from AI response');
}

export function buildServerlessPdf(report, theses = {}) {
  const W = 595.28, H = 841.89, PAD = 40;
  const clean = (s) => String(s ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, ' ').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const pages = [];
  let ops = [], y = H - 80;
  const newPage = (n) => {
    ops = [
      '0.043 0.071 0.063 rg', `0 0 ${W} ${H} re f`,
      '0.165 0.243 0.204 RG 0.6 w', `${PAD} ${H - 50} m ${W - PAD} ${H - 50} l S`, `${PAD} 40 m ${W - PAD} 40 l S`,
      `BT /F2 9 Tf 0.431 0.851 0.710 rg ${PAD} ${H - 35} Td (PORTAFOLIO MANAGER v4.0  |  WEEKLY INTELLIGENCE & THESIS LOG) Tj ET`,
      `BT /F1 8 Tf 0.569 0.627 0.600 rg ${W - PAD - 35} 26 Td (P.${String(n).padStart(2, '0')}) Tj ET`,
    ];
    y = H - 80;
  };
  const line = (txt, size = 9.5, bold = false, col = '0.949 0.957 0.937', gap = 14) => {
    const words = String(txt || '').split(/\s+/), maxC = Math.floor((W - PAD * 2) / (size * 0.52));
    let cur = '';
    const flush = (t) => {
      if (y < 65) { pages.push(ops.join('\n')); newPage(pages.length + 1); }
      ops.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${col} rg ${PAD} ${y.toFixed(1)} Td (${clean(t)}) Tj ET`);
      y -= gap;
    };
    for (const w of words) {
      if ((cur + ' ' + w).trim().length > maxC && cur) { flush(cur); cur = w; }
      else cur = (cur + ' ' + w).trim();
    }
    if (cur) flush(cur);
  };
  newPage(1);
  line('Weekly Portfolio & Thesis Review', 19, true, '0.949 0.957 0.937', 24);
  line(`Account: ${report.owner} | Generated: ${String(report.generatedAt || '').slice(0, 10)} | Coverage: ${report.summary?.coverage || '0/0'}`, 9, false, '0.569 0.627 0.600', 18);
  line(`Total Value: $${report.summary?.totalValue ?? 'N/A'}  |  Unrealized P/L: $${report.summary?.unrealized ?? 'N/A'}`, 11, true, '0.431 0.851 0.710', 22);
  line('1. HOLDINGS & BUY THESES', 11, true, '0.851 0.753 0.545', 16);
  for (const l of report.lines || []) {
    line(`${l.ticker.padEnd(6)} | Shares: ${l.shares} | Price: $${l.price ?? '-'} | Value: $${l.value ?? '-'} | Weight: ${l.weight ?? '-'}%`, 9, false, '0.949 0.957 0.937', 13);
    if (theses[l.ticker]?.note) line(`   Thesis: ${theses[l.ticker].note}`, 8.2, false, '0.569 0.627 0.600', 12);
  }
  y -= 8;
  line('2. CONCENTRATION & RISK MONITOR', 11, true, '0.851 0.753 0.545', 16);
  for (const r of report.risk || []) line(`[${r.level}] ${r.title} - ${r.detail}`, 8.8, false, '0.980 0.553 0.545', 13);
  y -= 8;
  line('3. PRIORITY HEADLINES', 11, true, '0.851 0.753 0.545', 16);
  for (const it of (report.intelligence?.items || []).slice(0, 10)) line(`- ${it.title} (${it.source})`, 8.5, false, '0.949 0.957 0.937', 12);
  pages.push(ops.join('\n'));

  const objs = [], add = (b) => (objs.push(b), objs.length);
  const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const pId = add('');
  const kids = pages.map((c) => {
    const sId = add(`<< /Length ${Buffer.byteLength(c, 'latin1')} >>\nstream\n${c}\nendstream`);
    return `${add(`<< /Type /Page /Parent ${pId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${sId} 0 R >>`)} 0 R`;
  });
  objs[pId - 1] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${kids.length} >>`;
  const cat = add(`<< /Type /Catalog /Pages ${pId} 0 R >>`);
  let out = '%PDF-1.4\n', offs = [0];
  objs.forEach((o, i) => { offs.push(Buffer.byteLength(out, 'latin1')); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.slice(1).map((x) => `${String(x).padStart(10, '0')} 00000 n \n`).join('') + `trailer\n<< /Size ${objs.length + 1} /Root ${cat} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, 'latin1');
}

export async function handleV4Routes(req, res, pathname, quoteFn) {
  if (pathname === '/api/account/ai-workspace') {
    const user = await sessionUser(req);
    if (!user) { sendJSON(res, { error: 'Sign in required' }, 401); return true; }
    if (req.method === 'GET') { sendJSON(res, await getAiWorkspace(user)); return true; }
    if (req.method === 'PUT') {
      const body = await readBody(req, 500_000);
      sendJSON(res, await saveAiWorkspace(user, body));
      return true;
    }
  }

  if (pathname === '/api/ai/vision-extract' && req.method === 'POST') {
    const user = await sessionUser(req);
    if (!user) { sendJSON(res, { error: 'Sign in required' }, 401); return true; }
    const body = await readBody(req, 12_000_000);
    const mode = body.mode === 'trade' ? 'trade' : 'snapshot';
    const images = (Array.isArray(body.images) ? body.images : []).slice(0, 4).map((img) => ({
      mediaType: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(img.mediaType) ? img.mediaType : 'image/jpeg',
      base64: String(img.base64 || '').replace(/^data:[^;]+;base64,/, ''),
    })).filter((x) => x.base64.length > 50);
    if (!images.length) { sendJSON(res, { error: 'Sube o pega al menos una captura de pantalla válida.' }, 400); return true; }

    const sys = mode === 'snapshot'
      ? `You are a precision financial OCR/ADR parser. Read brokerage or portfolio screenshots (Interactive Brokers, Hapi, Schwab, Robinhood, eToro, Yahoo Finance, Trii, etc.) and extract ALL equity/ETF holdings.
Rules:
- Normalize ticker symbols (uppercase, e.g. NVDA, MSFT, VOO, BRK-B).
- Extract exact share count ("shares").
- Extract average purchase price per share ("cost"). If only Total Invested / Cost Basis and Shares are shown, compute cost = totalCost / shares. If cost basis is genuinely absent on screen, set "cost": null (NEVER invent 0).
- Return ONLY valid JSON matching: {"mode":"snapshot","brokerDetected":"string","rows":[{"ticker":"NVDA","shares":10,"cost":118.5,"currentPrice":null,"confidence":"high"}],"warnings":["string"]}`
      : `You are a precision trade-confirmation OCR/ADR parser. Read the brokerage order execution screenshot and extract all executed buy/sell transactions.
Rules:
- "type" must be "buy" or "sell".
- "date" in YYYY-MM-DD (use ${new Date().toISOString().slice(0, 10)} if date is omitted on screen, and mention it in warnings).
- Extract exact "ticker", "shares", execution "price" per share in USD (if only total order amount and shares appear, compute price = total / shares), and "fee" (0 if none shown).
- Return ONLY valid JSON matching: {"mode":"trade","brokerDetected":"string","trades":[{"type":"buy","date":"YYYY-MM-DD","ticker":"NVDA","shares":2.5,"price":138.20,"fee":0}],"warnings":["string"]}`;

    const out = await callLLM({
      system: sys,
      messages: [{ role: 'user', content: 'Extract structured financial records from the attached screenshot(s). Respond with JSON only.' }],
      images,
      maxTokens: 2200,
    });
    const parsedData = extractJSONObject(out.text);
    sendJSON(res, { ok: true, provider: out.provider, model: out.model, ...parsedData });
    return true;
  }

  if (pathname === '/api/ai/copilot' && req.method === 'POST') {
    const user = await sessionUser(req);
    if (!user) { sendJSON(res, { error: 'Sign in required' }, 401); return true; }
    const body = await readBody(req, 250_000);
    const question = String(body.message || '').trim().slice(0, 3000);
    if (!question) { sendJSON(res, { error: 'Escribe una consulta.' }, 400); return true; }

    const ctx = await buildPortfolioContext(user, body.clientState || null);
    const ws = await getAiWorkspace(user);
    const history = [...(ws.chat || []).slice(-10), { role: 'user', content: question }];

    const sys = `You are the institutional Portfolio Copilot inside "Portafolio Manager".
Respond in ${user.language === 'en' ? 'English' : 'Spanish'} using clear, sharp, institutional-grade markdown (concise headers, bold key figures, bullet points, zero fluff).
You have LIVE access to the user's private portfolio context below:
${JSON.stringify(ctx)}

Core analytical mandates:
1. Anchor every answer in the user's actual holdings, weights, cost basis, ETF look-through exposure (note how VOO/SPY/QQQ add underlying Tech/AI weight!), Investor Risk Profile (willingness, capacity, suggested risk ceiling), and saved Buy Theses.
2. POSITION SIZING & ALLOCATION: Avoid naive full-Kelly equity sizing. Instead, compute Risk-Budgeted Position Sizing & Quarter-Kelly bounds respecting: (a) 20% monitoring threshold / 25% hard single-stock cap, (b) 40% strategy layer cap, and (c) the user's suggested risk ceiling. State exact USD amounts and resulting % weights.
3. Distinguish verified portfolio facts from market assumptions.`;

    const out = await callLLM({
      system: sys,
      messages: history.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
      webSearch: Boolean(body.webSearch),
      maxTokens: 2600,
    });

    ws.chat = [...history, { role: 'assistant', content: out.text, at: new Date().toISOString(), model: out.model }].slice(-24);
    await saveAiWorkspace(user, ws);
    sendJSON(res, { ok: true, reply: out.text, provider: out.provider, model: out.model, chat: ws.chat });
    return true;
  }

  if (pathname === '/api/ai/stress-test' && req.method === 'POST') {
    const user = await sessionUser(req);
    if (!user) { sendJSON(res, { error: 'Sign in required' }, 401); return true; }
    const body = await readBody(req, 150_000);
    const ticker = String(body.ticker || '').trim().toUpperCase();
    if (!/^[A-Z0-9.\-]{1,12}$/.test(ticker)) { sendJSON(res, { error: 'Ticker inválido' }, 400); return true; }

    const [ctx, qData, intel] = await Promise.all([
      buildPortfolioContext(user, body.clientState || null),
      quoteFn(ticker).catch(() => null),
      getIntelligence([ticker]).catch(() => null),
    ]);

    const sys = `You are a ruthless institutional Risk Manager & "Devil's Advocate" (Abogado del Diablo) conducting a Pre-Buy Stress-Test BEFORE the investor commits capital.
Write in ${user.language === 'en' ? 'English' : 'Spanish'}. Return ONLY valid JSON with this exact structure:
{
  "verdictBadge": "HIGH OVERLAP / CAUTION | VALUATION STRETCH | PRUDENT FIT | THESIS FRAGILE",
  "maxPrudentUSD": 1000,
  "maxPrudentWeightPct": 5.0,
  "threeReasonsNotToBuy": [
    {"title": "string", "detail": "Concrete fundamental, FCF/margin, valuation or macro/SEC risk"},
    {"title": "string", "detail": "Second concrete thesis-breaker"},
    {"title": "string", "detail": "Third concrete thesis-breaker"}
  ],
  "portfolioOverlapWarning": "Exact analysis of how ${ticker} correlates with existing positions + ETF look-through (VOO/QQQ/chips/cloud)",
  "sizingRationale": "How maxPrudentWeightPct & USD were derived from their Risk Profile ceiling and 20%/25%/40% caps",
  "whatMustBeTrue": "The single measurable metric in upcoming 10-Q/10-K filings required to justify entry"
}`;

    const out = await callLLM({
      system: sys,
      messages: [{ role: 'user', content: JSON.stringify({ candidateTicker: ticker, quote: qData, headlines: intel?.items?.slice(0, 6) || [], userPortfolioAndRisk: ctx }) }],
      webSearch: true,
      maxTokens: 2000,
    });
    sendJSON(res, { ok: true, ticker, provider: out.provider, model: out.model, stressTest: extractJSONObject(out.text) });
    return true;
  }

  if (pathname === '/api/ai/thesis-audit' && req.method === 'POST') {
    const user = await sessionUser(req);
    if (!user) { sendJSON(res, { error: 'Sign in required' }, 401); return true; }
    const body = await readBody(req, 100_000);
    const ticker = String(body.ticker || '').trim().toUpperCase();
    const ws = await getAiWorkspace(user);
    const thesis = body.thesis || ws.theses?.[ticker];
    if (!thesis?.note) { sendJSON(res, { error: 'No hay sustento registrado para este ticker.' }, 400); return true; }

    const [qData, intel] = await Promise.all([quoteFn(ticker).catch(() => null), getIntelligence([ticker]).catch(() => null)]);
    const sys = `You audit an investor's original Buy Thesis against current price action and recent news/filings. Write in ${user.language === 'en' ? 'English' : 'Spanish'}.
Return ONLY valid JSON:
{"status":"INTACT | WATCH | BROKEN","headline":"1-sentence verdict","evidence":"Concise paragraph contrasting original buy note and invalidation rule against current market reality","nextCheck":"Specific metric or event to verify next"}`;

    const out = await callLLM({
      system: sys,
      messages: [{ role: 'user', content: JSON.stringify({ ticker, originalThesis: thesis, currentQuote: qData, recentNews: intel?.items?.slice(0, 6) || [] }) }],
      webSearch: true,
      maxTokens: 1400,
    });
    const audit = extractJSONObject(out.text);
    if (ws.theses?.[ticker]) {
      ws.theses[ticker].lastAudit = { ...audit, auditedAt: new Date().toISOString() };
      await saveAiWorkspace(user, ws);
    }
    sendJSON(res, { ok: true, ticker, audit });
    return true;
  }

  return false;
}
