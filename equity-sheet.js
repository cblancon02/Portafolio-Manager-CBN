/* Unified equity factsheet. The same entry point is used by global search, Discovery,
 * portfolio holdings and watchlist. Quotes are sourced independently of holdings.
 * No fabricated market data are shown outside the explicitly labeled demo mode.
 */
(function (root) {
  'use strict';
  const PERIODS = ['1M', '3M', '6M', '1Y', '3Y', '5Y', 'MAX'];
  const esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const val = (n, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : '—');
  const money = (n, d = 2) =>
    Number.isFinite(n)
      ? '$' + n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
      : '—';
  const perc = (n, d = 1) => (Number.isFinite(n) ? (n > 0 ? '+' : '') + val(n, d) + '%' : '—');
  const num = (x) => typeof x === 'number' && Number.isFinite(x);
  // Every external href goes through Logic.safeUrl (https only); anything else is plain text.
  const extLink = (url, label) => {
    const safe = root.Logic?.safeUrl?.(url);
    return safe
      ? `<a target="_blank" rel="noopener noreferrer" href="${esc(safe)}">${esc(label)}</a>`
      : `<span>${esc(label)}</span>`;
  };
  const sectorNames = {
    Tecnología: 'Information Technology',
    Semiconductores: 'Semiconductors',
    'Comunicaciones e internet': 'Communication Services',
    'Consumo discrecional': 'Consumer Discretionary',
    'Consumo básico': 'Consumer Staples',
    Salud: 'Health Care',
    Financieras: 'Financials',
    Industria: 'Industrials',
    'Petróleo y gas': 'Energy',
    Eléctricas: 'Utilities',
    Materiales: 'Materials',
    Inmobiliario: 'Real Estate',
    'Sin clasificar': 'Unclassified',
  };
  const layerNames = {
    nube: 'Cloud & Platforms',
    memoria: 'Memory',
    software: 'AI Software & Cybersecurity',
    equipos: 'Semiconductor Manufacturing',
    chips: 'AI Compute & Custom Silicon',
    energiaia: 'AI Power & Infrastructure',
    redes: 'Networking & Optics',
    indice: 'Broad-market ETF',
    defensivo: 'Defensive',
    diversificacion: 'Diversification',
  };
  const ratingNames = {
    Incorporar: 'In price range',
    'Esperar precio': 'Watch valuation',
    'No incorporar': 'Not suitable',
    'Sin calificar': 'Not rated',
    Reforzar: 'Review addition',
    Mantener: 'Hold / monitor',
    'Revisar tesis': 'Review thesis',
  };
  function normalizedPriceBars(s, demonstration = false) {
    let bars = Array.isArray(s.history)
      ? s.history
          .filter((b) => b && typeof b.date === 'string' && num(Number(b.close)) && Number(b.close) > 0)
          .map((x) => ({ date: x.date, close: Number(x.close) }))
          .sort((a, b) => a.date.localeCompare(b.date))
      : [];
    if (bars.length >= 2) return { rows: bars, illustrative: demonstration && s.demo === true };
    if (!demonstration) return { rows: [], illustrative: false };
    let current = 100;
    const base = new Date('2026-11-20T12:00:00Z'),
      tick = [...String(s.ticker)].reduce((a, c) => a * 31 + c.charCodeAt(0), 17) % 300;
    bars = Array.from({ length: 300 }, (_, i) => {
      const t = i / 299;
      current *= 1 + 0.0011 + 0.018 * Math.sin(i * 0.19 + tick) + Math.sin(i * 13.321 + tick) * 0.008;
      return {
        date: new Date(base.getTime() - (299 - i) * 86400000).toISOString().slice(0, 10),
        close: current,
      };
    });
    const scale = (Number(s.price) || 100) / bars.at(-1).close;
    return { rows: bars.map((b) => ({ ...b, close: b.close * scale })), illustrative: true };
  }
  function filterBars(rows, period) {
    if (!rows.length) return [];
    const latest = new Date(rows.at(-1).date + 'T12:00:00Z'),
      cutoff = new Date(latest),
      months = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12, '3Y': 36, '5Y': 60 };
    if (!months[period]) return rows;
    cutoff.setUTCMonth(cutoff.getUTCMonth() - months[period]);
    let slice = rows.filter((x) => x.date >= cutoff.toISOString().slice(0, 10));
    return slice.length >= 2 ? slice : rows;
  }
  function priceChartHTML(s, range, demo) {
    const data = normalizedPriceBars(s, demo),
      rows = filterBars(data.rows, range);
    if (rows.length < 2)
      return `<section class="pm-equity-chart pm-fsheet-block"><div class="pm-section-head"><div><div class="pm-fsheet-eyebrow">PRICE HISTORY</div><h3>Price performance</h3></div></div><div class="pm-chart-no-data">Historical prices have not been loaded. Charts use Yahoo Finance public market data, not brokerage positions.</div><button data-action="history:${esc(s.ticker)}" class="btn ghost">Load 5-year price history</button></section>`;
    const prices = rows.map((b) => b.close),
      min = Math.min(...prices),
      max = Math.max(...prices),
      delta = (prices.at(-1) / prices[0]) * 100 - 100;
    const y = (n) => 206 - ((n - min) / (max - min || 1)) * 171,
      x = (i) => 20 + (i / (rows.length - 1)) * 760;
    const path = rows
        .map((b, i) => (i ? 'L' : 'M') + x(i).toFixed(2) + ',' + y(b.close).toFixed(2))
        .join(' '),
      area = path + ' L780,238 L20,238 Z';
    return `<section class="pm-equity-chart pm-fsheet-block" aria-label="Price history chart"><div class="pm-section-head pm-equity-chart-header"><div><div class="pm-fsheet-eyebrow">PRICE HISTORY · USD</div><div class="pm-chart-period-gain ${delta >= 0 ? 'positive' : 'negative'}">${perc(delta, 2)} <span>in ${esc(range)}</span></div></div><div class="pm-stock-ranges" role="group" aria-label="Chart time range">${PERIODS.map((t) => `<button data-action="equityRange:${t}" class="${t === range ? 'on' : ''}" aria-pressed="${t === range}">${t}</button>`).join('')}</div></div><svg id="pm-equity-svg" viewBox="0 0 800 245" class="pm-equity-svg" role="img" aria-label="Interactive company price history"><defs><linearGradient id="pm-eq-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#78e0ba" stop-opacity=".19"/><stop offset="1" stop-color="#78e0ba" stop-opacity="0"/></linearGradient></defs>${[35, 90, 145, 200].map((v) => `<line x1="16" y1="${v}" x2="785" y2="${v}" stroke="#30463a" stroke-dasharray="3 8"/>`).join('')}<path d="${area}" fill="url(#pm-eq-grad)"/><path d="${path}" fill="none" stroke="#70dfb6" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"/><line id="pm-equity-cross" x1="0" x2="0" y1="15" y2="236" stroke="#d4f4e3" stroke-dasharray="4 5" opacity="0"/><circle id="pm-equity-dot" cx="0" cy="0" r="5" stroke="#0e1e18" stroke-width="2.5" fill="#c9f9df" opacity="0"/><rect x="8" y="6" width="780" height="234" fill="transparent" id="pm-equity-hit"/></svg><div id="pm-equity-readout" class="pm-equity-chart-readout">${esc(rows[0].date)} — ${esc(rows.at(-1).date)} · ${rows.length} observed closes</div><div class="pm-equity-source">${data.illustrative ? 'DEMONSTRATION · synthetic price history, not market data' : `Yahoo Finance historical prices · ${esc(s.priceAsOf || 'Market-data timestamp unavailable')} · prices may be delayed`}</div></section>`;
  }
  function bindChart(s, range, demo) {
    const svg = document.getElementById('pm-equity-svg'),
      hit = document.getElementById('pm-equity-hit');
    if (!svg || !hit) return;
    const rows = filterBars(normalizedPriceBars(s, demo).rows, range),
      prices = rows.map((r) => r.close),
      min = Math.min(...prices),
      max = Math.max(...prices);
    const cross = document.getElementById('pm-equity-cross'),
      dot = document.getElementById('pm-equity-dot'),
      label = document.getElementById('pm-equity-readout');
    const at = (x) => Math.max(0, Math.min(rows.length - 1, Math.round((x / 800) * (rows.length - 1))));
    function display(e) {
      const rect = svg.getBoundingClientRect(),
        x = ((e.clientX - rect.left) / rect.width) * 800,
        index = at(x),
        row = rows[index],
        cx = 20 + (index / (rows.length - 1)) * 760,
        cy = 206 - ((row.close - min) / (max - min || 1)) * 171;
      cross.setAttribute('x1', cx);
      cross.setAttribute('x2', cx);
      cross.setAttribute('opacity', '1');
      dot.setAttribute('cx', cx);
      dot.setAttribute('cy', cy);
      dot.setAttribute('opacity', '1');
      label.textContent =
        row.date +
        ' · ' +
        money(row.close, 2) +
        ' · ' +
        perc((row.close / rows[0].close - 1) * 100, 2) +
        ' from range start';
    }
    hit.addEventListener('pointerdown', (e) => {
      hit.setPointerCapture?.(e.pointerId);
      display(e);
    });
    hit.addEventListener('pointermove', display);
    hit.addEventListener('pointerleave', () => {
      cross.setAttribute('opacity', '0');
      dot.setAttribute('opacity', '0');
    });
  }
  function ratingLabel(r) {
    return ratingNames[r] || r || 'Not rated';
  }
  function metric(label, value, note) {
    return `<div class="pm-fsheet-metric"><span>${esc(label)}</span><b>${esc(value)}</b>${note ? `<small>${esc(note)}</small>` : ''}</div>`;
  }
  function render({ s, p, r, state, L, A, range }) {
    const demo = state.demo === true || s.demo === true,
      verified = s.research?.verified === true,
      hasQuote = num(s.price) && s.price > 0,
      pe = s.eps > 0 && hasQuote ? s.price / s.eps : null,
      pfcf = s.fcfps > 0 && hasQuote ? s.price / s.fcfps : null;
    const holdings = p.lines.find((x) => x.ticker === s.ticker),
      zone = r.zone || null,
      peers = state.peers?.[s.ticker]?.items || [],
      peerData = peers.length >= 2 ? A.comparePeers(peers[0], peers.slice(1)) : null,
      peerPE = peerData?.metrics?.pe,
      ldd = A.lddAnalysis(s.history || [], s.price, state.lddSignals?.[s.ticker] || {}),
      projections = L.projections(s);
    const sourceStatus = demo
      ? 'DEMONSTRATION'
      : verified
        ? 'SEC fundamentals available'
        : 'Fundamentals pending verification';
    const quality = verified || demo,
      valuation = quality && zone,
      score = quality ? r.score : null;
    const metrics = [
      metric(
        'P/E · trailing 12 months',
        quality && num(pe) ? val(pe, 1) + '×' : '—',
        'GAAP only where documented',
      ),
      metric('Price / free cash flow', quality && num(pfcf) ? val(pfcf, 1) + '×' : '—'),
      metric('Revenue growth YoY', quality ? perc(s.revenueGrowth) : '—'),
      metric('Operating margin', quality ? perc(s.opMargin) : '—'),
      metric('FCF margin', quality ? perc(s.fcfMargin) : '—'),
      metric('Debt / equity', quality && num(s.debtEquity) ? val(s.debtEquity, 2) + '×' : '—'),
      metric('52-week high distance', num(s.fromHigh) ? '−' + val(s.fromHigh, 1) + '%' : '—'),
      metric(
        'Institutional research score',
        num(score) ? score + '/100' : 'Not rated',
        'Quality / valuation / fit / risk',
      ),
    ].join('');
    const growthDesc = verified
      ? `Reported operating metrics are available from official filings. Confirm the exact period for each item before making a decision.`
      : demo
        ? `Illustrative operating figures are used to demonstrate the screening framework.`
        : `No verified primary-source fundamentals have been loaded. Financial ratios will not be inferred from share price alone.`;
    const peerSummary =
      peerPE?.peerCount >= 2 && num(peerPE.value) && num(peerPE.median)
        ? `${esc(s.ticker)}: ${val(peerPE.value, 1)}× earnings versus ${val(peerPE.median, 1)}× peer median (${peerPE.relative < 0 ? 'discount' : 'premium'} ${val(Math.abs(peerPE.relative), 1)}%).`
        : 'A reliable peer median has not been established.';
    const sourceItems = (s.research?.facts || [])
      .slice(0, 5)
      .filter((f) => Boolean(root.Logic?.safeUrl?.(f.source?.url)));
    const layer = layerNames[s.layer] || sectorNames[s.sector] || s.sector || 'Unclassified';
    return `<div class="pm-equity-sheet" data-ticker="${esc(s.ticker)}">
 <div class="pm-equity-hero"><div><div class="pm-fsheet-eyebrow">EQUITY RESEARCH / COMPANY FACTSHEET</div><h1 data-no-i18n>${esc(s.name)}</h1><div class="pm-equity-tags"><span class="pm-equity-symbol">${esc(s.ticker)}</span><span>${esc(sectorNames[s.sector] || s.sector)}</span><span>${esc(layer)}</span><span class="${demo ? 'pm-demo-chip' : 'pm-muted-chip'}">${sourceStatus}</span></div></div><div class="pm-equity-quote"><span>MARKET PRICE · USD</span><strong>${hasQuote ? money(s.price) : '—'}</strong><small class="${Number(s.day) >= 0 ? 'positive' : 'negative'}">${num(s.day) ? perc(s.day, 2) + ' session change' : 'Quote not available'}</small></div></div>
 ${priceChartHTML(s, range, demo)}
 <section class="pm-fsheet-block"><div class="pm-section-head"><div><div class="pm-fsheet-eyebrow">INVESTMENT OVERVIEW</div><h3>Business, valuation and portfolio fit</h3></div><span class="pm-fsheet-rating">${esc(ratingLabel(r.calificacion))}</span></div><div class="pm-fsheet-summary-grid"><div><h4>Investment thesis</h4><p><span data-no-i18n>${esc(s.name)}</span> operates in ${esc(sectorNames[s.sector] || s.sector)}. ${esc(layer)} exposure. ${growthDesc}</p></div><div><h4>Valuation & entry discipline</h4><p>${valuation ? `Illustrative model base ${money(zone.base)}, with a watch range of ${money(zone.low)}–${money(zone.high)}. These are assumptions, not quoted analyst targets.` : 'An evidence-backed entry range is not available. Do not treat the price as automatically attractive after a decline.'}</p></div><div><h4>Portfolio allocation</h4><p>${holdings ? `Current position weight ${val(holdings.weight, 1)}% of marked holdings. ` : 'Not currently recorded as a position. '}${esc(layer)} contributes to the current strategy exposure. Monitor issuer and factor concentration independently.</p></div><div><h4>Thesis risks</h4><p>Monitor durable sales growth, operating margins, free cash flow, capital intensity, debt and customer concentration. An adverse business change matters more than a short-term price move.</p></div></div></section>
 <section class="pm-fsheet-block"><div class="pm-section-head"><div><div class="pm-fsheet-eyebrow">FINANCIAL QUALITY</div><h3>Key financial indicators</h3></div><small>${demo ? 'Sample figures' : verified ? 'Primary-source filings' : 'Verification pending'}</small></div><div class="pm-fsheet-metrics">${metrics}</div></section>
 <section class="pm-fsheet-block"><div class="pm-section-head"><div><div class="pm-fsheet-eyebrow">RELATIVE VALUATION</div><h3>Company vs. peers</h3></div>${peers.length < 2 ? `<button class="btn ghost" data-action="peers:${esc(s.ticker)}">Load comparable data</button>` : ''}</div><p class="pm-fsheet-explainer">${peerSummary} A lower multiple may reflect slower growth, weaker margins or greater risk, not necessarily mispricing.</p>${
   peers.length >= 2
     ? `<div class="pm-fsheet-scroll"><table class="pm-fsheet-table"><thead><tr><th>Company</th><th>P/E</th><th>P/FCF</th><th>Sales YoY</th><th>Operating margin</th></tr></thead><tbody>${peers
         .slice(0, 6)
         .map((x) => {
           const n = A.compVal(x);
           return `<tr><td><strong>${esc(x.ticker)}</strong>${x.verified !== true && !demo ? ' · unverified' : ''}</td><td>${num(n.pe) ? val(n.pe) + '×' : '—'}</td><td>${num(n.pFcf) ? val(n.pFcf) + '×' : '—'}</td><td>${num(n.revenueGrowth) ? perc(n.revenueGrowth) : '—'}</td><td>${num(n.operatingMargin) ? perc(n.operatingMargin) : '—'}</td></tr>`;
         })
         .join('')}</tbody></table></div>`
     : `<div class="pm-fsheet-muted">Comparable ratios will appear when SEC and market data are available.</div>`
 }</section>
 <section class="pm-fsheet-block"><div class="pm-section-head"><div><div class="pm-fsheet-eyebrow">4-YEAR TREND / LDD CONTEXT</div><h3>EMA 200-week and momentum</h3></div><span class="pm-fsheet-rating">${esc(ldd.decision || 'Data insufficient')}</span></div><div class="pm-fsheet-mini-metrics">${metric('EMA 200-week', money(ldd.ema200))}${metric('Price / EMA distance', perc(ldd.distance))}${metric('Weekly MACD histogram', val(ldd.macd?.histogram, 3))}${metric('Stochastic RSI', val(ldd.stochRSI?.value, 1))}</div><p class="pm-fsheet-explainer">${esc(ldd.reason || '200 weekly closes are required.')} Proprietary Overkill buy/sell markers are not reconstructed from public data.</p>${s.history?.length < 850 ? `<button class="btn ghost" data-action="history:${esc(s.ticker)}">Retrieve 5-year history</button>` : ''}</section>
 <section class="pm-fsheet-block"><div class="pm-section-head"><div><div class="pm-fsheet-eyebrow">VALUATION / SCENARIOS</div><h3>5-year outcome framework</h3></div></div>${projections && quality ? `<div class="pm-fsheet-scenarios">${projections.map((x) => `<div><span>${esc(x.name)}</span><b>${money(x.price, 0)}</b><small class="${x.anual >= 0 ? 'positive' : 'negative'}">${perc(x.anual)} annualized</small><small>Growth ${perc(x.growth)} · Exit ${val(x.multiple)}×</small></div>`).join('')}</div>` : '<p class="pm-fsheet-muted">No defensible forecast is available without verified earnings or free cash flow per share.</p>'}<p class="pm-fsheet-explainer">Scenario outcomes depend on assumptions and are not guarantees. Price-to-earnings, FCF and earnings growth must refer to comparable periods.</p></section>
 <section class="pm-fsheet-block pm-fsheet-sources"><div class="pm-section-head"><div><div class="pm-fsheet-eyebrow">RESEARCH PROVENANCE</div><h3>Sources & evidence</h3></div><button class="btn ghost" data-action="research:${esc(s.ticker)}">Refresh SEC fundamentals</button></div>${sourceItems.length ? sourceItems.map((f) => `<div class="pm-fsheet-source-item">${extLink(f.source.url, f.label || 'SEC financial filing')}<span>${esc(f.period || 'Period not supplied')} · ${esc(f.display || '')}</span></div>`).join('') : `<p class="pm-fsheet-muted">No verified filings are attached to this factsheet yet.</p>`}</section>
 <section class="pm-fsheet-final"><div><div class="pm-fsheet-eyebrow">EXTENDED INVESTMENT RESEARCH</div><h3>Institutional equity initiation report</h3><p>Commission a longer source-linked report covering industry structure, financial quality, relative valuation, bear/base/bull cases, governance, catalysts and portfolio risks. Delivery appears in your in-app Inbox after successful generation.</p></div><button class="btn primary" data-action="institutionalGenerate:${esc(s.ticker)}">Generate Institutional Report <span aria-hidden="true">↗</span></button></section>
 <div class="pm-fsheet-bottom-actions"><button class="btn ghost" data-action="match:${esc(s.ticker)}">${state.matches[s.ticker] ? 'In watchlist' : 'Add to watchlist'}</button><button class="btn ghost" data-action="similar:${esc(s.ticker)}">Find similar companies</button></div>
 </div>`;
  }
  root.PMEquity = { PERIODS, normalizedPriceBars, filterBars, render, bindChart };
})(window);
