/** Portfolio-oriented public headline screening. Titles are leads, NOT verified facts. */
import { createHash } from 'node:crypto';
import { safeFetch } from './safe-fetch.mjs';
const cache = new Map();
const COMPANIES = {
  NVDA: 'Nvidia',
  AMD: 'Advanced Micro Devices',
  TSM: 'TSMC',
  ASML: 'ASML',
  MSFT: 'Microsoft',
  AMZN: 'Amazon',
  GOOGL: 'Alphabet Google',
  META: 'Meta Platforms',
  AVGO: 'Broadcom',
  MU: 'Micron',
  PLTR: 'Palantir',
  CRWD: 'CrowdStrike',
  LLY: 'Eli Lilly',
  NVO: 'Novo Nordisk',
  VOO: 'Vanguard S&P 500',
  VRT: 'Vertiv',
  JPM: 'JPMorgan',
  GEV: 'GE Vernova',
};
const SECTORS = {
  NVDA: 'Semiconductors',
  AVGO: 'Semiconductors',
  AMD: 'Semiconductors',
  TSM: 'Semiconductors',
  ASML: 'Semiconductors',
  MU: 'Semiconductors',
  MSFT: 'Cloud & software',
  AMZN: 'Cloud & software',
  GOOGL: 'Cloud & software',
  META: 'Communications & platforms',
  PLTR: 'AI software',
  CRWD: 'Cybersecurity',
  VRT: 'Data center infrastructure',
  GEV: 'Energy & power',
  NRG: 'Energy & power',
  LLY: 'Healthcare',
  NVO: 'Healthcare',
  JPM: 'Banks',
  VOO: 'US equities',
};
const DOMICILE = {
  TSM: 'Taiwan',
  ASML: 'Netherlands',
  NVO: 'Denmark',
  NVS: 'Switzerland',
  SNY: 'France',
  SAP: 'Germany',
  RIO: 'United Kingdom',
  NU: 'Brazil',
  MELI: 'Uruguay',
  BABA: 'China',
  PDD: 'Ireland',
};
const THEMES = [
  {
    id: 'rates',
    category: 'Monetary policy',
    label: 'Federal Reserve / rates / inflation',
    q: 'Federal Reserve interest rates CPI inflation US when:7d',
  },
  {
    id: 'policy',
    category: 'Policy & regulation',
    label: 'Tariffs, regulation and fiscal policy',
    q: 'US tariffs AI regulation antitrust export restrictions when:7d',
  },
  {
    id: 'geopolitics',
    category: 'Geopolitics',
    label: 'Taiwan, China and semiconductor restrictions',
    q: 'Taiwan China semiconductor export controls geopolitics when:7d',
  },
  {
    id: 'energy',
    category: 'Geopolitics',
    label: 'Strait of Hormuz, oil and shipping',
    q: 'Strait of Hormuz shipping oil prices geopolitical risk when:7d',
  },
  {
    id: 'innovation',
    category: 'Industry disruption',
    label: 'AI infrastructure and technology shifts',
    q: 'AI chips datacenter demand capex network disruption when:7d',
  },
  {
    id: 'credit',
    category: 'Markets',
    label: 'Credit spreads, recession and liquidity',
    q: 'credit spreads corporate bonds US economic slowdown liquidity when:7d',
  },
];
const allowed =
  /\b(reuters|bloomberg|associated press|ap news|cnbc|financial times|wall street journal|wsj|nikkei|yahoo finance|bbc|marketwatch|barron's|the new york times|the economist|investing\.com|ap business)\b/i;
const unxml = (s) =>
  String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/<[^>]*>/g, '')
    .trim();
const tag = (s, t) => (s.match(new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${t}>`, 'i')) || [])[1] || '';
function classify(text) {
  const t = text.toLowerCase();
  if (/earnings|quarterly|revenue|profit|guidance|results|q[1-4]|annual report|conference call/.test(t))
    return 'Earnings & guidance';
  if (/war|iran|taiwan|china|hormuz|sanction|tariff|conflict|missile/.test(t)) return 'Geopolitics';
  if (/fed|central bank|rate cut|rate hike|inflation|cpi|jobs report|bond yield/.test(t))
    return 'Monetary policy';
  if (/regulat|antitrust|lawsuit|restriction|policy|congress|election/.test(t)) return 'Policy & regulation';
  if (/chip|ai |artificial intelligence|breakthrough|technology|launch|product/.test(t))
    return 'Industry disruption';
  return 'Market development';
}
function rows(xml, topic) {
  const parts = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
  return parts
    .map((raw) => {
      const title = unxml(tag(raw, 'title')),
        url = unxml(tag(raw, 'link')),
        source = unxml(tag(raw, 'source')) || String(title.split(' - ').at(-1) || '');
      const d = new Date(unxml(tag(raw, 'pubDate')));
      if (
        !title ||
        !url ||
        !/^https:\/\//.test(url) ||
        !Number.isFinite(d.getTime()) ||
        !allowed.test(source)
      )
        return null;
      const id = createHash('sha256')
        .update(title.toLowerCase().replace(/\W/g, ''))
        .digest('hex')
        .slice(0, 18);
      const category = topic.category === 'Company' ? classify(title) : topic.category;
      const earnings = /earnings|results|quarter|guidance|conference call|profit|revenue/i.test(title);
      const relevance =
        topic.category === 'Company'
          ? 4
          : topic.category === 'Sector'
            ? 3
            : topic.category === 'Domicile'
              ? 2
              : 3;
      return {
        id,
        title,
        url,
        source,
        publishedAt: d.toISOString(),
        ticker: topic.ticker || null,
        category,
        theme: topic.label,
        relevance,
        earnings,
        coverage: 'headline-only',
        evidence: 'Unverified article lead; read primary company or regulator source before acting.',
      };
    })
    .filter(Boolean);
}
async function query(t) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(t.q)}&hl=en-US&gl=US&ceid=US:en`;
  const k = t.id;
  const cached = cache.get(k);
  if (cached && Date.now() - cached.at < 25 * 60_000) return cached.value;
  const ctl = new AbortController(),
    tm = setTimeout(() => ctl.abort(), 8500);
  try {
    const res = await safeFetch(
      url,
      { headers: { 'User-Agent': 'PortafolioManager/3.0 research dashboard' }, signal: ctl.signal },
      ['news.google.com'],
    );
    if (!res.ok) throw Error('RSS HTTP ' + res.status);
    const value = rows(await res.text(), t).slice(0, t.category === 'Company' ? 4 : 3);
    cache.set(k, { at: Date.now(), value });
    return value;
  } catch {
    if (cached) return cached.value;
    return [];
  } finally {
    clearTimeout(tm);
  }
}
export function buildCoverage(tickers) {
  const list = [
    ...new Set(
      (tickers || []).map((s) => String(s).toUpperCase()).filter((t) => /^[A-Z0-9.\-]{1,12}$/.test(t)),
    ),
  ].slice(0, 25);
  const sectors = [...new Set(list.map((t) => SECTORS[t]).filter(Boolean))].slice(0, 4);
  const domicile = [...new Set(list.map((t) => DOMICILE[t]).filter(Boolean))].slice(0, 3);
  const topics = [
    ...list
      .slice(0, 10)
      .map((t) => ({
        id: 'company-' + t,
        category: 'Company',
        ticker: t,
        label: t,
        q: `"${COMPANIES[t] || t}" ${t} earnings stock when:7d`,
      })),
    ...sectors.map((s) => ({
      id: 'sector-' + s,
      category: 'Sector',
      label: s,
      q: `${s} sector outlook disruption demand results when:7d`,
    })),
    ...domicile.map((s) => ({
      id: 'domicile-' + s,
      category: 'Domicile',
      label: s,
      q: `${s} economy tariffs geopolitical corporate risk when:7d`,
    })),
    ...THEMES,
  ];
  return { tickers: list, sectors, domicile, topics };
}
export async function getIntelligence(tickers) {
  const coverage = buildCoverage(tickers);
  const work = coverage.topics.slice(0, 23);
  let items = [];
  for (let i = 0; i < work.length; i += 6) {
    const group = await Promise.all(work.slice(i, i + 6).map(query));
    items.push(...group.flat());
  }
  const seen = new Map();
  for (const it of items) {
    const prev = seen.get(it.id);
    if (!prev || it.relevance > prev.relevance) seen.set(it.id, it);
  }
  const cut = Date.now() - 9 * 86400_000;
  items = [...seen.values()]
    .filter((it) => Date.parse(it.publishedAt) >= cut)
    .sort((a, b) => b.relevance - a.relevance || b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 80);
  return {
    generatedAt: new Date().toISOString(),
    status: items.length
      ? 'Public headlines; primary verification required'
      : 'Source unavailable or no qualifying recent headlines',
    coverage: {
      tickers: coverage.tickers,
      sectors: coverage.sectors,
      domicile: coverage.domicile,
      dosage: 'Geographic labels are issuer domiciles, NOT verified revenue exposures.',
    },
    items,
    earnings: items.filter((x) => x.earnings).slice(0, 20),
    calendar: coverage.tickers.map((t) => ({
      ticker: t,
      date: null,
      status: 'Not verified',
      url: `https://finance.yahoo.com/quote/${encodeURIComponent(t)}/calendar/`,
      note: 'Upcoming earnings date must be confirmed in company IR or an exchange calendar.',
    })),
    method:
      'Public RSS screening. Ranking is heuristic; headlines may describe rumors or estimates, not confirmed events.',
  };
}
