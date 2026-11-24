/* Portafolio Manager — signed-in portfolio research app. Holdings and preferences are stored on the authenticated account server; Yahoo market prices are independent. */
(() => {
  'use strict';
  const L = window.Logic,
    $ = (sel) => document.querySelector(sel);
  const STORE = 'portafolio-manager:v4',
    OWNER = 'portafolio-manager:owner';
  const app = $('#app');
  const fmt = L.money,
    pct = L.pct,
    round = L.round;
  const SVG = {
    home: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    discover: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m12 6-3 6 3 0-1 6 5-8-3 0 2-4"/>',
    radar: '<path d="m3 17 5-5 4 3 8-9"/><path d="M15 6h5v5"/>',
    watchlist: '<path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
    plan: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    news: '<path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>',
    more: '<circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
    bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    arrow: '<path d="m5 12 14 0M13 6l6 6-6 6"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="m20 6-11 11-5-5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7h.01"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>',
    trend: '<path d="m3 17 6-6 4 4 8-9M16 6h5v5"/>',
    dollar: '<path d="M12 2v20M17 5H9a4 4 0 0 0 0 8h6a4 4 0 0 1 0 8H7"/>',
    pie: '<path d="M12 2v10h10A10 10 0 1 1 12 2Z"/><path d="M14 2a10 10 0 0 1 8 8h-8z"/>',
    refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 9a7 7 0 0 1 12-2l2 5M4 12l2 5a7 7 0 0 0 12-2"/>',
    undo: '<path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 1 3 6"/>',
    heart:
      '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8z"/>',
    star: '<path d="m12 2 3 6 7 .9-5 5 1.2 7.1L12 17.8 5.8 21 7 13.9l-5-5L9 8z"/>',
    download: '<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',
    upload: '<path d="M12 21V8m-5 5 5-5 5 5M4 7V3h16v4"/>',
    printer:
      '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-4a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v4a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>',
    edit: '<path d="M12 20h9M5 17l-1 4 4-1L20 8l-4-4z"/>',
    minus: '<path d="M5 12h14"/>',
    plus: '<path d="M5 12h14M12 5v14"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
    external: '<path d="M12 5h7v7M19 5l-9 9"/><path d="M19 13v6H5V5h6"/>',
    alert: '<path d="M12 3 2 21h20L12 3zM12 10v5M12 18h.01"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    settings:
      '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>',
  };
  function ic(name, size = 18) {
    return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${SVG[name] || SVG.info}</svg>`;
  }
  function esc(s) {
    return String(s ?? '').replace(
      /[&<>"']/g,
      (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch],
    );
  }
  function attr(s) {
    return esc(s);
  }
  // New UI strings: English and Spanish side by side. The output is marked data-no-i18n where
  // it is mixed with external content, so the substring translator leaves it alone.
  function tr(en, es) {
    return (window.PMAccount?.user?.language || 'en') === 'es' ? es : en;
  }
  // External text (company names, research) that the substring translator must not rewrite.
  function ext(text) {
    return `<span data-no-i18n>${esc(text)}</span>`;
  }
  // The only way a URL becomes an href: https (http only for news) or plain text.
  function extLink(url, label, options = {}) {
    const safe = L.safeUrl(url, options);
    return safe
      ? `<a href="${attr(safe)}" target="_blank" rel="noopener noreferrer"${options.cls ? ` class="${options.cls}"` : ''}>${esc(label)}</a>`
      : `<span>${esc(label)}</span>`;
  }
  const viewMap = {
    inbox: 'Research Inbox',
    institutional: 'Institutional Research',
    transactions: 'Yahoo Finance Holdings',
    home: 'Portfolio Overview',
    discover: 'Stock Discovery',
    radar: 'Market Radar',
    watchlist: 'Watchlist',
    plan: 'Allocation Plan',
    news: 'News Intelligence',
    more: 'Tools',
    search: 'Company Search',
    taste: 'Research Preferences',
    report: 'Weekly Intelligence',
    settings: 'Settings',
    automations: 'Report Delivery',
    import: 'Import Holdings',
  };
  const nav = [
    ['home', 'Overview'],
    ['discover', 'Discovery'],
    ['radar', 'Market Radar'],
    ['watchlist', 'Watchlist'],
    ['plan', 'Allocation Plan'],
    ['news', 'Intelligence'],
  ];
  let state,
    view = 'home',
    modal = null,
    detailTab = 'overview',
    equityRange = '1Y',
    searchQuery = '',
    selectedMover = 'week',
    sortRadar = 'up',
    radarPeriod = 'week',
    newsLoading = false,
    liveLoading = false,
    ownerId = 'tab-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
    owns = true,
    storageOk = true,
    lastUndo = null,
    dealReason = {},
    modalFocus = null,
    demoDismiss = false;
  let portfolioCache = null,
    stocksCache = {};
  let institutionalJobs = [],
    selectedInstitutionalJob = null,
    jobRefreshTimer = null,
    jobSnapshotSeen = false,
    quickSearchTimer = null,
    quickSearchVersion = 0,
    csvDraft = '';
  function load() {
    try {
      const s = JSON.parse(
        localStorage.getItem(STORE) || localStorage.getItem('mauricio-portfolio-os:v4') || 'null',
      );
      return s && s.version === 4 ? { ...L.defaultState(), ...s } : L.defaultState();
    } catch (e) {
      storageOk = false;
      return L.defaultState();
    }
  }
  function claim() {
    try {
      localStorage.setItem(OWNER, ownerId);
      owns = localStorage.getItem(OWNER) === ownerId;
    } catch (e) {
      storageOk = false;
      owns = true;
    }
  }
  let pmSaveTimer = null,
    pmSaveQueue = Promise.resolve();
  function persistedState() {
    const copy = { ...state };
    copy.quotes = Object.fromEntries(
      Object.entries(state.quotes || {}).map(([t, q]) => [t, { ...q, history: [] }]),
    );
    return copy;
  }
  // The guest preview (dist/Portafolio_Manager_Guest_Preview.html) runs this same file and
  // switches behaviour here at runtime; scripts/build.mjs no longer patches the source.
  const GUEST_KEY = 'pm-guest-demo:v4',
    GUEST_LIVE_MSG = 'Live Yahoo quotes require the authenticated server.';
  const isGuest = () => Boolean(window.__PM_GUEST_PREVIEW__);
  // Every /api request goes through here: the guest preview never reaches a server, and a
  // signed-in tab names its account (X-PM-Account) so the server can refuse a stale session.
  function apiFetch(url, options = {}) {
    if (isGuest()) return Promise.reject(Error(GUEST_LIVE_MSG));
    return window.PMAccount.accountFetch(url, options);
  }
  // Which account the in-memory state belongs to, and the server revision it was loaded at.
  // Every save names both so the server can refuse a stale tab or a different signed-in account.
  let account = { id: null, revision: null },
    saveBlocked = null; // null | 'conflict' | 'load-failed' | 'mismatch'
  function save() {
    if (!state) return false;
    if (isGuest()) {
      try {
        localStorage.setItem(GUEST_KEY, JSON.stringify(persistedState()));
        return true;
      } catch (e) {
        console.warn('Guest state not saved:', e);
        return false;
      }
    }
    if (!window.PMAccount?.user || saveBlocked) return false;
    const serialized = JSON.stringify(persistedState()),
      accountId = account.id;
    clearTimeout(pmSaveTimer);
    pmSaveTimer = setTimeout(() => {
      pmSaveTimer = null;
      pmSaveQueue = pmSaveQueue
        .catch(() => {})
        .then(() => sendState(serialized, accountId))
        .catch((e) => {
          console.error('State persistence:', e.message);
          toast(
            tr(
              'Account data could not be saved. Please check server availability.',
              'No se pudieron guardar los datos de la cuenta. Comprueba que el servidor esté disponible.',
            ),
            true,
          );
        });
    }, 180);
    return true;
  }
  async function sendState(serialized, accountId) {
    // Scheduled for an account this tab no longer holds, or autosave stopped: drop it.
    if (saveBlocked || accountId !== account.id) return;
    const r = await apiFetch('/api/account/state', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: `{"state":${serialized},"accountId":${JSON.stringify(accountId)},"baseRevision":${JSON.stringify(account.revision)}}`,
    });
    const data = await r.json().catch(() => ({}));
    if (r.status === 409 && data.error === 'account_mismatch') return accountMismatch();
    if (r.status === 409 && data.error === 'revision_conflict') return revisionConflict();
    if (!r.ok) throw Error('Private account state could not be saved');
    if (data.revision !== undefined && accountId === account.id) account.revision = data.revision;
  }
  async function flushSave() {
    if (pmSaveTimer) {
      clearTimeout(pmSaveTimer);
      pmSaveTimer = null;
      if (state && !saveBlocked && !isGuest() && window.PMAccount?.user) {
        const serialized = JSON.stringify(persistedState()),
          accountId = account.id;
        pmSaveQueue = pmSaveQueue.catch(() => {}).then(() => sendState(serialized, accountId));
      }
    }
    await pmSaveQueue.catch(() => {});
  }
  // Stop every timer and forget the in-memory portfolio. Called on sign-out, before another
  // account loads, and when the server says this tab's session now belongs to someone else.
  function teardownAccount() {
    clearTimeout(pmSaveTimer);
    pmSaveTimer = null;
    clearInterval(jobRefreshTimer);
    jobRefreshTimer = null;
    clearInterval(window.pmRefreshId);
    window.pmRefreshId = null;
    clearTimeout(quickSearchTimer);
    quickSearchTimer = null;
    state = null;
    portfolioCache = null;
    stocksCache = {};
    institutionalJobs = [];
    selectedInstitutionalJob = null;
    jobSnapshotSeen = false;
    modal = null;
    lastUndo = null;
    account = { id: null, revision: null };
    saveBlocked = null;
  }
  function accountMismatch() {
    teardownAccount();
    saveBlocked = 'mismatch';
    if (app) app.innerHTML = '';
    window.PMAccount.accountMismatch();
  }
  function revisionConflict() {
    saveBlocked = 'conflict';
    clearTimeout(pmSaveTimer);
    pmSaveTimer = null;
    render();
  }
  // Holdings whose quote did not arrive in the latest refresh (or never did).
  // Only symbols that returned a fresh quote in the LAST refresh run count; a cached/stale server
  // fallback, a missing symbol or a failed batch leaves the holding stale.
  function staleHoldings() {
    const fresh = new Set(state?.lastRefresh?.fresh || []);
    return (state?.holdings || []).filter((h) => !fresh.has(h.ticker));
  }
  function saveBanner() {
    if (saveBlocked === 'conflict')
      return `<div class="inline-warn pm-save-banner" role="alert"><span>${tr('This portfolio changed in another tab. Your edits here are kept on this page but are no longer saved.', 'Esta cartera cambió en otra pestaña. Tus cambios siguen en esta página, pero ya no se guardan.')}</span><span><button class="btn tiny-btn" data-action="exportJSON">${tr('Download my changes', 'Descargar mis cambios')}</button> <button class="btn tiny-btn" data-action="reloadPage">${tr('Reload (discard my changes)', 'Recargar (descartar mis cambios)')}</button></span></div>`;
    if (saveBlocked === 'load-failed')
      return `<div class="inline-warn pm-save-banner" role="alert"><span>${tr('Your saved portfolio could not be loaded, so autosave is paused to protect it.', 'No se pudo cargar tu cartera guardada; el guardado automático está en pausa para protegerla.')}</span><button class="btn tiny-btn" data-action="reloadPage">${tr('Reload', 'Recargar')}</button></div>`;
    return '';
  }

  function toast(text, error = false) {
    const host = $('#toast-host');
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'toast' + (error ? ' error' : '');
    // Toasts live outside #app, so route them through the same translator as the page.
    el.textContent = window.PMI18n?.swap
      ? window.PMI18n.swap(String(text), window.PMAccount?.user?.language || 'en')
      : text;
    host.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 220);
    }, 3600);
  }
  function commit(msg) {
    portfolioCache = null;
    stocksCache = {};
    const ok = save();
    render();
    if (msg) toast(ok ? msg : 'Cambio temporal: navegador no permitió guardar', !ok);
  }
  function mergeQuotes(qs, asOf, fresh = null) {
    let n = 0;
    if (!state) return n;
    const receivedAt = new Date().toISOString();
    for (const [t, q] of Object.entries(qs || {})) {
      if (Number.isFinite(q?.price) && q.price > 0) {
        if (fresh && q.stale !== true && q.cached !== true) fresh.add(t);
        state.quotes[t] = {
          ...q,
          source: q.source || 'Yahoo Finance (no oficial)',
          live: true,
          asOf: q.asOf || asOf,
          receivedAt,
        };
        n++;
      }
    }
    if (n) {
      state.lastLiveUpdate = receivedAt;
      state.dataSource = state.demo ? 'demo+public' : 'public';
    }
    return n;
  }
  function stock(ticker) {
    ticker = String(ticker || '').toUpperCase();
    if (stocksCache[ticker]) return stocksCache[ticker];
    const base = L.BY_TICKER[ticker] || state.customStocks?.[ticker];
    let s = base
      ? { ...base }
      : {
          ticker,
          name: ticker,
          layer: 'diversificacion',
          sector: 'Sin clasificar',
          track: 'diversificacion',
          provenance: 'no_verificada',
        };
    if (!state.demo) {
      for (const k of [
        'price',
        'prev',
        'day',
        'week',
        'month',
        'threeMonth',
        'year',
        'cap',
        'revenueGrowth',
        'opMargin',
        'fcfMargin',
        'earningsYield',
        'debtEquity',
        'mom6',
        'mom12',
        'vol',
        'beta',
        'fromHigh',
        'eps',
        'fcfps',
      ])
        s[k] = null;
      s.provenance = 'sin datos verificados';
      s.demo = false;
    }
    const q = state.quotes[ticker];
    // A quote in another currency is never added to USD totals: the holding stays unpriced.
    // One rule (Advanced.usdPrice): only USD prices count; a live quote of unknown currency is not USD.
    if (q && Number.isFinite(q.price) && A.usdPrice(q) === null) {
      s.nonUsdQuote = q.currency
        ? String(q.currency).toUpperCase()
        : tr('currency unknown', 'moneda desconocida');
      if (!state.demo) s.price = null;
    } else if (q && Number.isFinite(q.price)) {
      s.quoteProvenance = q.live ? 'yahoo' : 'csv';
      s.price = q.price;
      s.prev = q.prevClose;
      s.day = q.day;
      s.week = q.week;
      s.month = q.month;
      s.threeMonth = q.threeMonth;
      s.year = q.year;
      s.fromHigh = q.fromHigh;
      s.vol = q.vol;
      s.mom6 = q.sixMonth;
      s.mom12 = q.year;
      s.provenance = 'mercado';
      s.priceAsOf = q.asOf;
      s.history = q.history;
    }
    const r = state.research[ticker];
    if (r) {
      s.name = r.company || s.name;
      s.sector = r.sector || s.sector;
      const m = r.metrics || {};
      for (const k of [
        'revenueGrowth',
        'opMargin',
        'fcfMargin',
        'earningsYield',
        'debtEquity',
        'eps',
        'fcfps',
        'cap',
      ])
        if (Number.isFinite(m[k])) s[k] = m[k];
      s.sources = r.sources || [];
      s.filings = r.filings || [];
      s.research = r;
      s.provenance = r.verified ? 'sec' : 'parcial';
    }
    stocksCache[ticker] = s;
    return s;
  }
  function universe() {
    return L.CATALOG.map((o) => stock(o.ticker));
  }
  function pfolio() {
    return (
      portfolioCache ||
      (portfolioCache = L.portfolio(
        state.holdings,
        Object.fromEntries(state.holdings.map((h) => [h.ticker, stock(h.ticker)])),
      ))
    );
  }
  function dated(s) {
    return s
      ? new Date(s).toLocaleDateString('es-PE', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          timeZone: 'America/Lima',
        })
      : '—';
  }
  function prettyDateTime(s) {
    return s
      ? new Date(s).toLocaleString('es-PE', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Lima',
        })
      : '—';
  }
  function statusBadge(s) {
    return s === 'bajo'
      ? '<span class="pill">▲ Aportar</span>'
      : s === 'exceso'
        ? '<span class="pill red">▼ Sobre objetivo</span>'
        : s === 'en rango'
          ? '<span class="pill muted">● En rango</span>'
          : '<span class="pill muted">Sin rango</span>';
  }
  function completeness(s) {
    return s.research?.verified ? 'Verificado N1' : s.demo ? 'Simulado' : 'No verificado';
  }
  function action(a, body, cls = '') {
    return `<button class="${cls || 'btn'}" data-action="${attr(a)}">${body}</button>`;
  }
  function change(n) {
    return `<span class="${Number(n) >= 0 ? 'positive' : 'negative'} mono">${pct(n)}</span>`;
  }
  function safeNum(n, d = 1) {
    return Number.isFinite(n) ? n.toFixed(d) : '—';
  }
  function logo(s) {
    return `<div class="token">${esc(s.ticker.slice(0, 2))}</div>`;
  }
  function unverifiedNotice() {
    if (!state.demo && state.portfolioSource !== 'yahoo-csv')
      return `<div class="notice">${ic('info')} <span>${tr('<b>Holdings not yet imported from Yahoo Finance.</b> There may be manual data or data from an earlier version. Import the current CSV from My Portfolio in Yahoo to make it your holdings source. Market prices are retrieved separately.', '<b>Posiciones todavía no importadas desde Yahoo Finance.</b> Puede haber datos manuales o de una versión anterior. Importa el CSV actual de Mi cartera en Yahoo para establecerlo como tu fuente de tenencias. Los precios de mercado se consultan aparte.')}</span>${action('go:transactions', ic('upload') + ' ' + tr('Import from Yahoo', 'Importar Yahoo'), 'btn ghost')}</div>`;
    if (state.demo)
      return `<div class="notice pm-demo-notice">${ic('info')} <span><b>DEMO DATA</b> · Illustrative portfolio and valuation figures. Import holdings to analyze actual positions.</span>${action('go:transactions', ic('upload') + ' Import', 'btn ghost')}</div>`;
    if (!state.lastLiveUpdate)
      return `<div class="notice">${ic('alert')} <span>${tr(`<b>Holdings recorded from Yahoo Finance.</b> ${state.dataSource === 'imported' ? 'Prices come from the CSV and may be out of date.' : 'No current verified quotes.'} Run the server and select “Refresh” to get Yahoo Finance prices. Your imported positions are stored in your private account on this server.`, `<b>Posiciones registradas desde Yahoo Finance.</b> ${state.dataSource === 'imported' ? 'Los precios proceden del CSV y pueden estar desactualizados.' : 'Sin cotizaciones actuales verificadas.'} Ejecuta el servidor y pulsa «Actualizar» para obtener precios de Yahoo Finance. Tus posiciones importadas se guardan en tu cuenta privada en este servidor.`)}</span>${action('refresh', ic('refresh') + ' ' + tr('Get Yahoo quotes', 'Cotizar en Yahoo'), 'btn ghost')}</div>`;
    const stale = staleHoldings();
    const staleNote = stale.length
      ? `<b>${tr(`${stale.length} of ${state.holdings.length} holdings were not updated in the last refresh.`, `${stale.length} de ${state.holdings.length} posiciones no se actualizaron en la última consulta.`)}</b> `
      : '';
    return `<div class="notice plain">${ic('info')} <span>${staleNote}${tr(`Prices available (${state.dataSource === 'imported' ? 'user-supplied CSV, unverified' : 'Yahoo Finance, unofficial feed'}), recorded ${esc(prettyDateTime(state.lastLiveUpdate))}. They are not an investment account balance and do not confirm trades or taxes. Financial information requires official SEC verification.`, `Precios disponibles (${state.dataSource === 'imported' ? 'CSV proporcionado por el usuario, no verificado' : 'Yahoo Finance, feed no oficial'}), registro ${esc(prettyDateTime(state.lastLiveUpdate))}. No equivalen al saldo de una cuenta de inversión, ni confirman operaciones o impuestos. La información financiera requiere verificación oficial SEC.`)}</span></div>`;
  }
  function sideLink(id, name) {
    return `<button class="side-link ${view === id ? 'active' : ''}" data-action="go:${id}" aria-current="${view === id ? 'page' : 'false'}">${ic(id)} ${name}</button>`;
  }
  function shell(content) {
    const user = window.PMAccount?.user;
    const day = new Date().toLocaleDateString(user?.language === 'es' ? 'es-ES' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: user?.timezone || 'America/New_York',
    });
    return `<div class="layout"><aside class="sidebar"><div class="side-brand"><div class="brand-mark"><svg class="pm-brand-symbol" aria-hidden="true" viewBox="0 0 48 48" fill="none"><path d="M9 34V26h7v8M20.5 34V20h7v14M32 34V13h7v21" fill="#5ECBA5" fill-opacity=".68"/><path d="M8 20.5l11-7 8 3.2L39 7" stroke="#E2FFF2" stroke-width="2.65" stroke-linecap="round" stroke-linejoin="round"/><circle cx="39" cy="7" r="2.35" fill="#E2FFF2"/><path d="M8 36h32" stroke="#93DEC0" stroke-width="1.5" stroke-linecap="round" opacity=".42"/></svg></div><div class="brand-type"><span class="brand-name">Portafolio Manager</span><small>INVESTMENT INTELLIGENCE</small></div></div><div class="nav-label">PORTFOLIO</div>${nav.map(([id, n]) => sideLink(id, n)).join('')}<div class="nav-label">RESEARCH & OPERATIONS</div>${sideLink('transactions', 'Yahoo Finance Holdings')}${sideLink('search', 'Company Search')}${sideLink('taste', 'Research Preferences')}${sideLink('report', 'Weekly Report')}${sideLink('settings', 'Settings')}<div class="side-footer"><div class="tiny">${esc(user?.email || '')}</div><div class="hint">${esc(user?.timezone || '')} · ${state.demo ? 'Sample data' : 'Personal account'}</div></div></aside><div class="main"><div class="mobile-header"><div class="mobile-brand"><span class="brand-mark"><svg class="pm-brand-symbol" aria-hidden="true" viewBox="0 0 48 48" fill="none"><path d="M9 34V26h7v8M20.5 34V20h7v14M32 34V13h7v21" fill="#5ECBA5" fill-opacity=".68"/><path d="M8 20.5l11-7 8 3.2L39 7" stroke="#E2FFF2" stroke-width="2.65" stroke-linecap="round" stroke-linejoin="round"/><circle cx="39" cy="7" r="2.35" fill="#E2FFF2"/><path d="M8 36h32" stroke="#93DEC0" stroke-width="1.5" stroke-linecap="round" opacity=".42"/></svg></span><span class="brand-name">Portafolio Manager</span></div><div style="display:flex;gap:8px"><button data-action="quickSearch" class="iconbtn" aria-label="Search companies">${ic('search')}</button><button data-action="go:inbox" class="iconbtn" aria-label="Research Inbox">${ic('bell')}${unreadResearchCount() ? `<span class="pm-inbox-dot"></span>` : ''}</button></div></div><header class="topbar"><div class="top-info"><span>${esc(day)}</span><span style="opacity:.3">|</span><span>${esc(user?.email || 'Private account')}</span></div><div class="topbar-actions"><div class="pm-top-search"><span class="pm-search-icon">${ic('search', 16)}</span><input id="pm-top-search" type="search" aria-label="Search stocks and companies" placeholder="Search stocks or companies" autocomplete="off"><div class="pm-top-search-results" id="pm-top-results" hidden></div></div><button class="iconbtn pm-inbox-launch" data-action="go:inbox" title="Research Inbox" aria-label="Research Inbox">${ic('bell')}<span class="pm-inbox-count" data-inbox-count>${unreadResearchCount() || ''}</span></button><span class="pill muted">${state.demo ? 'DEMO' : state.lastLiveUpdate ? 'MARKET DATA UPDATED' : 'PRICES NOT LOADED'}</span><button class="btn ghost" data-action="go:transactions">${ic('upload')} Import CSV</button><button class="iconbtn" data-action="refresh" title="Refresh market data" aria-label="Refresh market data">${ic('refresh')}</button></div></header><main class="container" id="main-content">${saveBanner()}${content}</main></div></div><nav class="mobile-nav" aria-label="Main navigation">${[
      ['home', 'Overview'],
      ['discover', 'Discover'],
      ['watchlist', 'Watchlist'],
      ['news', 'News'],
      ['more', 'More'],
    ]
      .map(
        ([id, n]) =>
          `<button class="mobile-link ${view === id ? 'active' : ''}" data-action="go:${id}">${ic(id === 'watchlist' ? 'watchlist' : id)}<span>${n}</span></button>`,
      )
      .join(
        '',
      )}</nav>${modal ? modalHTML() : ''}<div class="pm-search-overlay" id="pm-search-overlay" hidden><div class="pm-search-dialog" role="dialog" aria-modal="true" aria-label="Search stocks"><div class="pm-search-dialog-header"><div><div class="eyebrow">MARKET / COMPANY SEARCH</div><h2>Search equities</h2></div><button class="iconbtn" data-action="quickClose" aria-label="Close search">${ic('close')}</button></div><div class="pm-search-input-large">${ic('search')}<input id="pm-overlay-search" type="search" autocomplete="off" placeholder="Company name or ticker, e.g. NVDA"></div><div id="pm-overlay-results" class="pm-search-results-list"></div></div></div>`;
  }

  function pageTitle(title, desc, tag = 'TU INVERSIÓN', tools = '') {
    return `<div class="page-header"><div><div class="eyebrow">${tag}</div><h1>${title}</h1><p>${desc}</p></div>${tools ? `<div class="header-tools">${tools}</div>` : ''}</div>`;
  }
  function metricCard(label, value, sub, iconName = 'trend', accent = '') {
    return `<div class="panel"><div class="kpi-top"><span class="kpi-label">${label}</span>${ic(iconName)}</div><div class="kpi-value ${accent}">${value}</div><div class="kpi-sub">${sub}</div></div>`;
  }
  function svgChart(values, height = 140, other = null, labels = false) {
    if (!values?.length)
      return '<div class="empty" style="padding:20px">No hay una serie histórica verificada.</div>';
    let n = values.length,
      w = 800,
      h = height,
      pad = 12;
    let all = values.concat(other || []).filter(Number.isFinite),
      min = Math.min(...all),
      max = Math.max(...all),
      r = max - min || 1;
    const px = (i) => pad + ((w - 2 * pad) * i) / Math.max(n - 1, 1),
      py = (v) => pad + (h - 2 * pad) * (1 - (v - min) / r);
    const path = (arr) =>
      arr.map((v, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ');
    const fill = path(values) + ` L${px(n - 1)},${h} L${pad},${h} Z`;
    return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Evolución de valores">${[0.25, 0.5, 0.75].map((k) => `<line x1="0" y1="${h * k}" x2="${w}" y2="${h * k}" stroke="#35463a" stroke-dasharray="4 8" stroke-width=".8"/>`).join('')}<path d="${fill}" fill="url(#areaShade)"/><path d="${path(values)}" fill="none" stroke="#6ed9b5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${other ? `<path d="${path(other)}" fill="none" stroke="#d9c08b" stroke-width="2" stroke-dasharray="8 5"/>` : ''}<defs><linearGradient id="areaShade" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#6ed9b5" stop-opacity=".21"/><stop offset="1" stop-color="#6ed9b5" stop-opacity="0"/></linearGradient></defs></svg>`;
  }
  function demoCurve(seed, ln = 45) {
    seed = Number.isFinite(seed) ? seed : (L.hash(String(seed)) % 1000) / 100;
    let vals = [],
      base = 100;
    for (let i = 0; i < ln; i++) {
      base *= 1 + 0.0024 + Math.sin(i * 0.77 + seed) * 0.012 + (L.rnd(seed + ':' + i) - 0.51) * 0.038;
      vals.push(base);
    }
    return vals;
  }
  function portfolioBacktest(p) {
    if (state.demo) {
      const portfolio = demoCurve(11, 42),
        spy = demoCurve(24, 42);
      return {
        portfolio,
        spy,
        label: tr(
          'Illustrative curves (no statistical value)',
          'Curvas ilustrativas (sin valor estadístico)',
        ),
        stats: L.riskStats(portfolio, spy),
      };
    }
    if (!p.value || p.lines.some((e) => !Number.isFinite(e.stock.price) || e.stock.price <= 0)) return null;
    const lines = p.lines.filter(
      (e) => e.weight > 0 && Array.isArray(e.stock.history) && e.stock.history.length >= 230,
    );
    const coverage = lines.reduce((s, l) => s + l.weight, 0);
    if (coverage < 80 || !lines.length) return null;
    const mp = lines.map((l) => new Map(l.stock.history.map((h) => [h.date, h.adjClose || h.close])));
    let common = Array.from(mp[0].keys())
      .filter((d) => mp.every((m) => Number.isFinite(m.get(d))))
      .sort()
      .slice(-251);
    if (common.length < 230) return null;
    const spyObj = state.quotes.SPY,
      spyMap = spyObj?.history ? new Map(spyObj.history.map((h) => [h.date, h.adjClose || h.close])) : null;
    if (spyMap) {
      const aligned = common.filter((d) => Number.isFinite(spyMap.get(d)));
      if (aligned.length >= 230) common = aligned;
    }
    const hasSpy = spyMap && common.every((d) => Number.isFinite(spyMap.get(d)));
    const w = lines.map((l) => l.weight / coverage);
    const portfolio = [100],
      spy = hasSpy ? [100] : null;
    for (let i = 1; i < common.length; i++) {
      const ret = lines.reduce(
        (a, l, k) => a + w[k] * (mp[k].get(common[i]) / mp[k].get(common[i - 1]) - 1),
        0,
      );
      portfolio.push(portfolio.at(-1) * (1 + ret));
      if (hasSpy) spy.push((spy.at(-1) * spyMap.get(common[i])) / spyMap.get(common[i - 1]));
    }
    return {
      portfolio,
      spy,
      label: tr(
        `Current weights rebalanced daily · ${round(coverage, 0)}% coverage · not your actual return`,
        `Pesos actuales rebalanceados a diario · cobertura ${round(coverage, 0)}% · no es tu rentabilidad real`,
      ),
      stats: L.riskStats(portfolio, spy),
    };
  }
  function layerPanel(p) {
    if (!p.value || p.lines.some((x) => !Number.isFinite(x.stock.price) || x.stock.price <= 0))
      return '<div class="panel"><h2>Strategy allocation vs targets</h2><div class="empty" style="margin-top:15px">Live quotes are required to calculate current position weights.</div></div>';
    return `<div class="panel"><div class="section-heading" style="margin:0 0 9px"><h2>Strategy layers vs targets</h2><span class="pill muted">% of positions</span></div><p style="margin:0 0 17px">Upper bounds are indicated on each target range.</p>${Object.entries(
      L.LAYERS,
    )
      .filter(([k, v]) => k !== 'diversificacion' && k !== 'redes')
      .map(([key, layer]) => {
        const st = L.layerStatus(p, key),
          max = Math.max(35, layer.max || 35);
        const width = Math.min((st.w / max) * 100, 100);
        return `<div class="layer-row"><div><div class="layer-name">${esc(layerEnglish(key))}</div><div class="layer-detail">${layer.min === null ? 'Cap' : `${layer.min}–${layer.max}%`}: ${layer.max}%</div></div><div class="track"><div class="fill" style="width:${width}%"></div><div class="target" style="left:${(layer.max / max) * 100}%"></div></div><div class="layer-weight ${st.state === 'exceso' ? 'negative' : st.state === 'bajo' ? 'positive' : ''}">${safeNum(st.w, 1)}%</div></div>`;
      })
      .join(
        '',
      )}<div class="hint" style="margin-top:12px">Networking/optics is tracked separately without an explicit target. IA growth target 75–85%, broad index 5–10%, defensive 5–10%.</div></div>`;
  }
  const PM_LAYER_NAMES = {
    nube: 'Cloud & Platforms',
    memoria: 'Memory',
    software: 'AI Software & Cybersecurity',
    equipos: 'Semiconductor Manufacturing',
    chips: 'AI Compute & Custom Silicon',
    energiaia: 'AI Power & Infrastructure',
    redes: 'Networking & Optics',
    indice: 'Broad Market ETF',
    defensivo: 'Defensive Holdings',
    diversificacion: 'Diversifiers',
  };
  const PM_SECTOR_NAMES = {
    Tecnología: 'Information Technology',
    Semiconductores: 'Semiconductors',
    'Comunicaciones e internet': 'Communication Services',
    'Consumo discrecional': 'Consumer Discretionary',
    'Consumo básico': 'Consumer Staples',
    Salud: 'Healthcare',
    Financieras: 'Financials',
    Industria: 'Industrials',
    'Petróleo y gas': 'Energy',
    Eléctricas: 'Utilities',
    Materiales: 'Materials',
    Inmobiliario: 'Real Estate',
  };
  function layerEnglish(k) {
    return PM_LAYER_NAMES[k] || L.LAYERS[k]?.name || k;
  }
  function sectorEnglish(k) {
    return PM_SECTOR_NAMES[k] || k;
  }
  function whatToday(p) {
    if (!p.value || p.lines.some((x) => !Number.isFinite(x.stock.price) || x.stock.price <= 0))
      return [
        {
          kind: 'warn',
          title: 'Market prices not verified',
          desc: 'Current quotes are required to calculate concentration and target allocation.',
        },
        { kind: 'good', title: 'Research only', desc: 'Saving a stock idea is not a purchase order.' },
      ];
    const items = [],
      big = p.top[0];
    if (big?.weight >= 20)
      items.push({
        kind: big.weight >= 25 ? 'red' : 'warn',
        title: `Concentration: ${big.ticker} is ${safeNum(big.weight, 1)}% of holdings`,
        desc:
          big.weight >= 25
            ? 'Above the 25% position limit. Review the exposure before new allocations.'
            : 'Above the 20% review threshold. Monitor concentration.',
      });
    const above = Object.keys(L.LAYERS)
      .map((k) => ({ k, ...L.layerStatus(p, k) }))
      .filter((x) => x.state === 'exceso');
    for (const a of above.slice(0, 2))
      items.push({
        kind: 'warn',
        title: `Overweight: ${layerEnglish(a.k)}`,
        desc: `${safeNum(a.gap, 1)} percentage points above target. New allocation should prioritize a different layer.`,
      });
    const gaps = Object.keys(L.LAYERS)
      .map((k) => ({ k, ...L.layerStatus(p, k) }))
      .filter((x) => x.state === 'bajo' && L.LAYERS[x.k].kind === 'ia')
      .sort((a, b) => b.gap - a.gap);
    if (gaps[0])
      items.push({
        kind: 'good',
        title: `Underweight: ${layerEnglish(gaps[0].k)}`,
        desc: `${safeNum(gaps[0].gap, 1)} percentage points below target. Quality and valuation still govern additions.`,
      });
    if (!items.length)
      items.push({
        kind: 'good',
        title: 'No target breaches detected',
        desc: 'No excess against the defined strategy layers, based on available pricing.',
      });
    items.push({
      kind: 'good',
      title: 'Research opportunities independently',
      desc: 'Company quality, price, thesis and concentration must be assessed separately.',
    });
    return items.slice(0, 3);
  }

  // Portafolio Manager v2 · extended portfolio cockpit / equity research UX.
  const A = window.Advanced;
  let managerRange = '1Y',
    managerChartRows = [],
    managerChartInfo = null,
    managerChartPointers = new Map(),
    advancedLoading = new Set();
  const pnum = (n, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : '—');
  function moneySigned(n) {
    return Number.isFinite(n) ? `${n >= 0 ? '+' : '−'}${fmt(Math.abs(n), 2)}` : '—';
  }
  function managerSeries() {
    if (!state.demo && state.snapshots?.length >= 2) {
      const t = A.twrSnapshots(state.snapshots);
      if (t) return { rows: t.rows, kind: 'twr', label: t.label, source: 'Historial real importado · TWR' };
    }
    if (state.demo) {
      // The illustrative curve ends at the current sample Position Value, so the two figures agree.
      const vals = L.anchorSeries(demoCurve(24, 1300), pfolio().value),
        now = Date.now(),
        rows = vals.map((v, i) => ({
          date: new Date(now - (1299 - i) * 86400000).toISOString().slice(0, 10),
          value: v,
        }));
      return {
        rows,
        kind: 'demo',
        label:
          'DEMO SERIES — illustrative values scaled to end at the current sample position value; not actual account performance.',
        source: 'DEMO DATA',
      };
    }
    const data = A.portfolioSeries(state.holdings, state.quotes, 1600);
    return data
      ? {
          ...data,
          source: tr(
            `Fixed mix of current holdings · ${pnum(data.coveragePct)}% coverage`,
            `Mezcla fija de posiciones · cobertura ${pnum(data.coveragePct)}%`,
          ),
        }
      : null;
  }
  function sliceManagerSeries(rows) {
    if (!rows?.length) return [];
    const latest = rows.at(-1).date,
      ref = new Date(latest + 'T12:00:00Z');
    let threshold = null;
    const months = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12, '3Y': 36, '5Y': 60 };
    if (months[managerRange]) {
      ref.setUTCMonth(ref.getUTCMonth() - months[managerRange]);
      threshold = ref.toISOString().slice(0, 10);
    } else if (managerRange === 'YTD') threshold = latest.slice(0, 4) + '-01-01';
    const result = threshold ? rows.filter((x) => x.date >= threshold) : rows;
    return result.length >= 2 ? result : rows.slice(-Math.min(20, rows.length));
  }
  function managerChart() {
    const src = managerSeries();
    if (!src) {
      managerChartRows = [];
      return `<div class="chart-missing"><div class="eyebrow">SIN HISTÓRICO DE CUENTA</div><h3>Conecta tus datos, no tus contraseñas</h3><p>Importa tu cartera y consulta 5 años de cotizaciones. Para rendimiento real, incorpora capturas de valor de cuenta y aportes.</p>${action('go:transactions', 'Conectar mis datos →', 'btn primary')}</div>`;
    }
    const rows = sliceManagerSeries(src.rows),
      vs = rows.map((x) => x.value),
      lo = Math.min(...vs),
      hi = Math.max(...vs),
      pad = 21,
      w = 900,
      h = 282,
      y = (v) => 230 - ((v - lo) / (hi - lo || 1)) * 182,
      x = (i) => pad + (i / (rows.length - 1 || 1)) * (w - 2 * pad),
      path = vs.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(2) + ',' + y(v).toFixed(2)).join(' '),
      area = path + ` L ${x(rows.length - 1)} 257 L ${x(0)} 257 Z`,
      ret = (vs.at(-1) / vs[0] - 1) * 100;
    managerChartRows = rows;
    managerChartInfo = { lo, hi, source: src.source, kind: src.kind };
    return `<div class="pm-chart-header"><div><div class="eyebrow">${src.kind === 'twr' ? 'TIME-WEIGHTED RETURN' : 'VALUE HISTORY'}</div><div class="chart-big-value">${src.kind === 'twr' ? pnum(ret, 2) + '%' : fmt(vs.at(-1), 2)}</div><div class="${ret >= 0 ? 'positive' : 'negative'} chart-period">${ret >= 0 ? '+' : ''}${pnum(ret, 2)}% ${tr('in', 'en')} ${esc(managerRange)} <span>· ${esc(src.kind === 'twr' ? 'TWR' : tr('not adjusted for contributions', 'sin ajustar aportes'))}</span></div></div><div class="chart-range">${['1M', '3M', '6M', 'YTD', '1Y', '3Y', '5Y', 'MAX'].map((x) => `<button class="${managerRange === x ? 'on' : ''}" data-action="range:${x}">${x}</button>`).join('')}</div></div><div class="chart-stage"><svg id="pm-chart" viewBox="0 0 900 282" aria-label="Interactive portfolio performance chart with date and range inspection" role="img"><defs><linearGradient id="pm-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6dddbc" stop-opacity=".21"/><stop offset="100%" stop-color="#6dddbc" stop-opacity="0"/></linearGradient></defs>${[38, 98, 158, 218].map((v) => `<line x1="20" y1="${v}" x2="880" y2="${v}" stroke="#27372f" stroke-width="1" stroke-dasharray="2 7"/>`).join('')}<path fill="url(#pm-area)" d="${area}"/><path fill="none" stroke="#66ddbb" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" d="${path}"/><line id="pm-chart-cross" x1="0" x2="0" y1="20" y2="258" stroke="#c8e9de" stroke-dasharray="4 5" style="opacity:0"/><circle id="pm-chart-dot" cx="0" cy="0" r="6" fill="#6ee0bc" stroke="#0c1714" stroke-width="3" style="opacity:0"/><line id="pm-chart-measure" x1="0" x2="0" y1="0" y2="0" stroke="#dbb476" stroke-width="2" style="opacity:0"/><rect x="10" y="12" width="880" height="256" fill="transparent" id="pm-chart-hit"/></svg><div class="chart-touch-hint">Hover or select a range to inspect dated prices and returns</div><div class="chart-readout" id="pm-chart-readout" aria-live="polite">${esc(rows[0].date)} — ${esc(rows.at(-1).date)} · ${esc(src.source)}</div></div><div class="chart-disclaimer">${esc(src.label)} Public market quotes may be delayed. A reconstructed series is not your realized account performance.</div>`;
  }
  function bindManagerChart() {
    const svg = $('#pm-chart');
    if (!svg || !managerChartRows.length) return;
    managerChartPointers = new Map();
    const cross = $('#pm-chart-cross'),
      dot = $('#pm-chart-dot'),
      line = $('#pm-chart-measure'),
      read = $('#pm-chart-readout');
    function idxAt(clientX) {
      const r = svg.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      return Math.max(
        0,
        Math.min(managerChartRows.length - 1, Math.round(frac * (managerChartRows.length - 1))),
      );
    }
    function draw() {
      const pts = [...managerChartPointers.values()],
        idx = pts.length ? pts.at(-1) : null;
      if (idx === null) {
        cross.style.opacity = '0';
        dot.style.opacity = '0';
        line.style.opacity = '0';
        return;
      }
      const row = managerChartRows[idx],
        v = row.value,
        min = managerChartInfo.lo,
        max = managerChartInfo.hi,
        x = 21 + (idx / (managerChartRows.length - 1)) * 858,
        y = 230 - ((v - min) / (max - min || 1)) * 182;
      cross.style.opacity = '1';
      dot.style.opacity = '1';
      cross.setAttribute('x1', x);
      cross.setAttribute('x2', x);
      dot.setAttribute('cx', x);
      dot.setAttribute('cy', y);
      line.style.opacity = '0';
      if (pts.length >= 2) {
        const a = managerChartRows[pts[0]],
          b = managerChartRows[pts[1]],
          xa = 21 + (pts[0] / (managerChartRows.length - 1)) * 858,
          xb = 21 + (pts[1] / (managerChartRows.length - 1)) * 858,
          ya = 230 - ((a.value - min) / (max - min || 1)) * 182,
          yb = 230 - ((b.value - min) / (max - min || 1)) * 182;
        line.style.opacity = '1';
        line.setAttribute('x1', xa);
        line.setAttribute('x2', xb);
        line.setAttribute('y1', ya);
        line.setAttribute('y2', yb);
        const delta = (b.value / a.value - 1) * 100;
        read.textContent = `${a.date} → ${b.date}  •  ${delta >= 0 ? '+' : ''}${pnum(delta, 2)}%  •  ${moneySigned(b.value - a.value)} ${managerChartInfo.kind === 'twr' ? 'puntos de índice' : ''}`;
        return;
      }
      read.textContent = `${row.date} · ${managerChartInfo.kind === 'twr' ? pnum(v, 2) + ' puntos' : fmt(v, 2)} · ${managerChartInfo.source}`;
    }
    svg.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      managerChartPointers.set(e.pointerId, idxAt(e.clientX));
      svg.setPointerCapture?.(e.pointerId);
      draw();
    });
    svg.addEventListener('pointermove', (e) => {
      if (!managerChartPointers.has(e.pointerId)) {
        if (e.pointerType === 'mouse') {
          managerChartPointers.set(-1, idxAt(e.clientX));
          draw();
        }
        return;
      }
      managerChartPointers.set(e.pointerId, idxAt(e.clientX));
      draw();
    });
    svg.addEventListener('pointerup', (e) => {
      managerChartPointers.delete(e.pointerId);
      draw();
    });
    svg.addEventListener('pointercancel', (e) => {
      managerChartPointers.delete(e.pointerId);
      draw();
    });
    svg.addEventListener('pointerleave', (e) => {
      managerChartPointers.delete(-1);
      if (!managerChartPointers.size) {
        cross.style.opacity = '0';
        dot.style.opacity = '0';
        line.style.opacity = '0';
      }
    });
  }
  function compactHolding(l) {
    const s = l.stock,
      price = Number.isFinite(s.price)
        ? fmt(s.price, 2)
        : s.nonUsdQuote
          ? `— <small>${tr('non-USD quote', 'cotización no USD')}</small>`
          : '—';
    const own =
      Number.isFinite(s.eps) && s.eps > 0 && Number.isFinite(s.price) && s.price > 0
        ? round(s.price / s.eps, 1)
        : null;
    const peerItems =
      state.peers?.[l.ticker]?.items ||
      (state.demo ? [s, ...(A.PEERS[l.ticker] || []).map((t) => ({ ...stock(t), verified: true }))] : []);
    const cmp = peerItems.length > 1 ? A.comparePeers(peerItems[0], peerItems.slice(1)) : null;
    const median = cmp?.metrics?.pe?.peerCount >= 2 ? cmp.metrics.pe.median : null;
    const diff = Number.isFinite(own) && Number.isFinite(median) ? round((own / median - 1) * 100, 1) : null;
    const peerMsg = Number.isFinite(median)
      ? `${pnum(median, 1)}× peer median · ${diff > 0 ? '+' : ''}${pnum(diff, 1)}% ${diff > 0 ? 'premium' : 'discount'}`
      : 'Peer reference unavailable';
    return `<article class="pm-mobile-position"><div class="pm-mobile-position-head"><button data-action="stock:${attr(l.ticker)}" class="pm-mobile-position-name">${logo(s)}<span><b>${esc(l.ticker)}</b><small>${ext(s.name)}</small></span></button><div class="pm-mobile-position-price"><b>${price}</b><small class="${Number(s.day) >= 0 ? 'positive' : 'negative'}">${pct(s.day)}</small></div></div><div class="pm-mobile-position-metrics"><div><span>Weight</span><b>${pnum(l.weight, 1)}%</b></div><div><span>Shares</span><b>${pnum(l.shares, 3)}</b></div><div><span>Unrealized P/L</span><b class="${!Number.isFinite(l.gain) ? 'muted' : l.gain >= 0 ? 'positive' : 'negative'}">${moneySigned(l.gain)}</b></div><div><span>Trailing P/E</span><b>${Number.isFinite(own) ? pnum(own, 1) + '×' : '—'}</b></div></div><div class="pm-mobile-position-foot"><span>${esc(peerMsg)}${state.demo ? ' · demo' : ''}</span>${action('peers:' + l.ticker, 'Peers', 'btn tiny-btn')}</div></article>`;
  }
  function holdingsView(p) {
    const rows = [...p.lines].sort((a, b) => b.weight - a.weight),
      noPrice = !state.demo && rows.some((l) => !Number.isFinite(l.stock.price));
    return `<div class="section-heading"><div><div class="eyebrow">POSITION ANALYTICS${state.demo ? ' · SAMPLE PORTFOLIO' : ''}</div><h2>Holdings &amp; Relative Valuation</h2></div>${action('go:transactions', '+ Record transaction', 'btn ghost')}</div><div class="pm-positions"><div class="pm-holdings-mobile">${rows.map(compactHolding).join('') || '<div class="empty">No holdings available.</div>'}</div><div class="pm-table-scroll"><table class="pm-table"><thead><tr><th>Company</th><th>Shares</th><th>Market price</th><th>Weight</th><th>Unrealized P/L</th><th>From 52W high</th><th>P/E vs. peers</th><th></th></tr></thead><tbody>${
      rows
        .map((l) => {
          const s = l.stock,
            pr = state.peers?.[l.ticker],
            demoPeers = state.demo
              ? [s, ...(A.PEERS[l.ticker] || []).map((t) => ({ ...stock(t), verified: true }))]
              : null,
            peerItems = pr?.items || demoPeers,
            cmp = peerItems ? A.comparePeers(peerItems[0] || {}, peerItems.slice(1)) : null;
          const own = s.eps > 0 && s.price > 0 ? round(s.price / s.eps, 1) : null,
            median = cmp?.metrics?.pe?.peerCount >= 2 ? cmp.metrics.pe.median : null;
          const rel =
            Number.isFinite(own) && Number.isFinite(median) ? round((own / median - 1) * 100, 0) : null;
          return `<tr><td><button class="pm-row-name" data-action="stock:${attr(l.ticker)}">${logo(s)}<span><b>${esc(l.ticker)}</b><small>${ext(s.name)}</small></span></button></td><td class="mono">${pnum(l.shares, 3)}</td><td><b>${fmt(s.price, 2)}</b>${s.nonUsdQuote ? `<small class="muted">${tr('non-USD quote', 'cotización no USD')} (${esc(s.nonUsdQuote)})</small>` : ''}<small class="${Number(s.day) >= 0 ? 'positive' : 'negative'}">${pct(s.day)}</small></td><td><b>${pnum(l.weight, 1)}%</b><div class="weight-tiny"><span style="width:${Math.min(100, l.weight * 3)}%"></span></div></td><td class="${!Number.isFinite(l.gain) ? 'muted' : l.gain >= 0 ? 'positive' : 'negative'}">${Number.isFinite(l.gain) ? moneySigned(l.gain) : '—'}<small>${l.investment > 0 && Number.isFinite(l.gain) ? pct((l.gain / l.investment) * 100) : '—'}</small></td><td>${Number.isFinite(s.fromHigh) ? '<span class="negative">−' + pnum(s.fromHigh, 1) + '%</span>' : '—'}</td><td><div class="peers-compact"><b>${Number.isFinite(own) ? pnum(own, 1) + '×' : '—'}</b><small>${Number.isFinite(median) ? `Peers: ${pnum(median, 1)}× · ${rel < 0 ? 'discount' : 'premium'} ${Math.abs(rel)}%` : state.demo ? 'Demo peers pending' : 'Peer data pending'}</small></div></td><td>${action('peers:' + l.ticker, 'Compare', 'btn tiny-btn')}</td></tr>`;
        })
        .join('') || '<tr><td colspan="8">Importa posiciones para comenzar.</td></tr>'
    }</tbody></table></div><div class="table-foot">Ratios require verified company financials; losses yield no conventional P/E. Peer multiples are not proof of undervaluation.</div>${noPrice ? '<div class="inline-warn">Some market prices are missing. Partial position weights and returns may be incomplete.</div>' : ''}</div>`;
  }
  function pulseView() {
    const m = state.market || {},
      // The demo has no market feed: show a fixed, clearly labelled sample value instead of "Unavailable".
      sampleVix = state.demo && !Number.isFinite(m.vix?.value),
      v = sampleVix ? 18.6 : m.vix?.value;
    const band = sampleVix ? 'Sample value' : m.regime || 'Unavailable';
    const meaning = sampleVix
      ? 'Sample VIX for the demo portfolio — illustrative, not live market data.'
      : !Number.isFinite(v)
        ? 'Connect public market data to view the VIX.'
        : '30-day implied volatility for the S&P 500; it does not measure whether your portfolio is undervalued.';
    return `<div class="panel pulse-panel"><div class="section-heading"><h2>Market Volatility</h2><span class="pill ${sampleVix ? 'demo' : 'muted'}">${sampleVix ? 'SAMPLE DATA' : 'Risk context'}</span></div><div class="vix-main"><div><div class="eyebrow">VIX · IMPLIED VOLATILITY</div><div class="vix-number">${Number.isFinite(v) ? pnum(v, 2) : '—'}</div><span class="pill ${v >= 30 ? 'red' : v >= 20 ? 'gold' : 'muted'}">${esc(band)}</span></div><div class="vix-track"><div class="vix-gradient"></div>${Number.isFinite(v) ? `<span class="vix-marker" style="left:${Math.max(0, Math.min(100, (v / 55) * 100))}%"></span>` : ''}<div class="vix-ends"><span>Lower volatility</span><span>Higher volatility</span></div></div></div><p>${meaning}</p><div class="hint">Not CNN Fear & Greed and not an investment signal by itself. <a href="https://www.cnn.com/markets/fear-and-greed" target="_blank" rel="noreferrer">CNN Fear & Greed source ↗</a></div>${action('market', 'Refresh VIX', 'btn ghost')}${!sampleVix && m.vix?.asOf ? `<span class="tiny muted"> ${prettyDateTime(m.vix.asOf)} · ${tr('Yahoo, unofficial', 'Yahoo no oficial')}</span>` : ''}</div>`;
  }
  function sectorRisk(p) {
    const sectors = Object.entries(p.sectors || {})
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1]),
      colors = ['#6ce0b8', '#558fc6', '#a993ef', '#d4b070', '#db8b79', '#719e90', '#b8c38d', '#de80a5'];
    const stops = [];
    let sum = 0;
    sectors.forEach(([k, v], i) => {
      stops.push(`${colors[i % colors.length]} ${sum}% ${sum + v}%`);
      sum += v;
    });
    const other = Math.max(0, 100 - sum);
    if (other > 0) stops.push(`#35413a ${sum}% 100%`);
    const diag = A.portfolioDiagnostics(p, state.holdings, state.quotes);
    return `<div class="panel"><div class="section-heading"><h2>Sector Exposure</h2><span class="pill muted">Direct issuer classification</span></div><div class="risk-donut-wrap"><div class="risk-donut" style="background:conic-gradient(${stops.join(',') || '#35413a 0% 100%'})"><div><strong>${sectors.length}</strong><small>sectors</small></div></div><div class="risk-sector-list">${
      sectors
        .slice(0, 6)
        .map(
          ([k, w], i) =>
            `<div><span class="sector-dot" style="background:${colors[i % colors.length]}"></span><span>${esc(sectorEnglish(k))}</span><b>${pnum(w, 1)}%</b></div>`,
        )
        .join('') || '<span class="muted">No data</span>'
    }</div></div><div class="risk-strip"><div><small>Top 3 positions</small><b>${pnum(diag.top3)}%</b></div><div><small>Top 5</small><b>${pnum(diag.top5)}%</b></div><div><small>Effective holdings</small><b>${pnum(diag.effective)}</b></div></div><div class="hint">Direct issuer classification; ETF constituent exposure is not decomposed. Holdings may share underlying AI risk factors.</div></div>`;
  }
  function portfolioPeTile(p) {
    const bench = state.demo
      ? { pe: 25.6, source: 'Illustrative S&P 500 reference', asOf: 'demo', proxy: false }
      : state.market?.benchmark || null;
    const val = A.portfolioValuation(p.lines, bench, { allowDemo: state.demo, minCoverage: 75 });
    const value = Number.isFinite(val.pe) ? pnum(val.pe, 1) + '×' : '—';
    const coverage = val.coveragePct;
    const comparison = Number.isFinite(val.spreadPct)
      ? `<b class="${val.spreadPct > 0 ? 'pm-pe-premium' : val.spreadPct < 0 ? 'pm-pe-discount' : 'pm-pe-neutral'}">${val.spreadPct > 0 ? '+' : ''}${pnum(val.spreadPct, 1)}%</b> vs S&amp;P 500 (${pnum(val.benchmarkPE, 1)}×)${bench?.proxy ? ' (SPY proxy)' : ''}`
      : `S&amp;P 500: ${Number.isFinite(bench?.pe) ? pnum(bench.pe, 1) + '×' : 'benchmark P/E unavailable'}`;
    const unpriced = val.unpriced?.length || 0;
    const note = unpriced
      ? tr(
          `${pnum(coverage, 0)}% of priced value covered · ${unpriced} unpriced holding${unpriced > 1 ? 's' : ''} (total coverage unknown)`,
          `${pnum(coverage, 0)}% del valor con precio cubierto · ${unpriced} posición${unpriced > 1 ? 'es' : ''} sin precio (cobertura total desconocida)`,
        )
      : val.count
        ? tr(
            `${pnum(coverage, 0)}% coverage · ${val.partial ? 'partial universe' : 'earnings-weighted'}`,
            `${pnum(coverage, 0)}% de cobertura · ${val.partial ? 'universo parcial' : 'ponderado por beneficios'}`,
          )
        : tr('No verified EPS coverage', 'Sin cobertura de BPA verificado');
    return `<div class="pm-mini-kpi pm-pe-kpi"><span>Portfolio P/E</span><b>${value}</b><small class="pm-benchmark-line">${comparison}</small><small class="pm-coverage" data-no-i18n>${note}${state.demo ? ' · DEMO' : ''}</small><span class="pm-pe-risk-note">${Number.isFinite(val.spreadPct) ? (val.spreadPct > 10 ? 'Valuation premium; not a total risk score' : val.spreadPct < -10 ? 'Valuation discount; not a total risk score' : 'Similar valuation; not a total risk score') : 'No risk classification without verified benchmark'}</span></div>`;
  }
  function dashboardHome() {
    const p = pfolio(),
      tickerCount = p.lines.length,
      pricedCount = p.lines.filter((l) => Number.isFinite(l.stock.price) && l.stock.price > 0).length,
      valued = tickerCount > 0 && pricedCount === tickerCount,
      diag = A.portfolioDiagnostics(p, state.holdings, state.quotes),
      // P/L and its percentage only exist when every holding is priced; never show "(0%)".
      gainPct = Number.isFinite(p.totalGain) && p.invested > 0 ? (p.totalGain / p.invested) * 100 : null,
      gainCls = !Number.isFinite(p.totalGain) ? 'muted' : p.totalGain >= 0 ? 'positive' : 'negative',
      positionValue = pricedCount ? fmt(p.value, 2) : '—',
      partialNote =
        pricedCount < tickerCount
          ? `<div class="pm-partial-value" data-no-i18n>${tr(`Partial total · ${pricedCount} of ${tickerCount} priced`, `Total parcial · ${pricedCount} de ${tickerCount} con precio`)}</div>`
          : '';
    return `${unverifiedNotice()}<div class="pm-head pm-head-clean"><div><div class="eyebrow">PORTFOLIO / ANALYTICS</div><h1>Portfolio Overview</h1></div><div class="pm-hero-actions">${action('quickSearch', ic('search') + ' Search stocks', 'btn pm-search-cta')}${action('refresh', ic('refresh') + ' Refresh quotes', 'btn primary')}${action('go:transactions', ic('upload') + ' Import holdings', 'btn ghost')}</div></div>
 <section class="pm-kpi-row" aria-label="Portfolio summary"><div class="pm-main-value"><div class="caps">POSITION VALUE · USD${state.demo ? ' · <span class="pill demo">SAMPLE DATA</span>' : ''}${pricedCount < tickerCount ? ' · PARTIAL' : ''}</div><strong>${positionValue}</strong>${partialNote}<div><span class="${gainCls}">${valued ? moneySigned(p.totalGain) : '—'}${Number.isFinite(gainPct) ? ' (' + pct(gainPct) + ')' : ''}</span> <span class="muted">unrealized P/L against imported cost basis</span>${p.unknownCost?.length ? `<div class="pm-partial-value" data-no-i18n>${tr(`P/L withheld · ${p.unknownCost.length} holding${p.unknownCost.length > 1 ? 's' : ''} without cost basis`, `P/L no disponible · ${p.unknownCost.length} posición${p.unknownCost.length > 1 ? 'es' : ''} sin coste`)}</div>` : ''}</div></div><div class="pm-mini-kpi"><span>Daily change</span><b class="${Number(p.dayDelta) >= 0 ? 'positive' : 'negative'}">${valued ? moneySigned(p.dayDelta) : '—'}</b><small>price-based estimate · cash flows excluded</small></div><div class="pm-mini-kpi"><span>Positions</span><b>${tickerCount}</b><small>${pnum(diag.ia, 1)}% AI ecosystem classification</small></div>${portfolioPeTile(p)}</section>
 <section class="pm-chart-priority" aria-label="Portfolio value chart"><div class="panel pm-primary-chart"><div class="pm-priority-section-label">PORTFOLIO VALUE</div>${managerChart()}</div></section>
 <section class="pm-holdings-priority" aria-label="Holdings and relative valuation">${holdingsView(p)}</section>
 <div class="pm-secondary-group"><div class="pm-secondary-heading"><div class="eyebrow">EXPOSURE AND RISK</div><h2>Portfolio Diagnostics</h2></div><div class="pm-risk-grid">${sectorRisk(p)}${layerPanel(p)}</div><div class="pm-risks-row"><div class="panel"><div class="section-heading"><h2>Risk Monitor</h2><span class="pill muted">Active review</span></div>${whatToday(
   p,
 )
   .map(
     (t) =>
       `<div class="action-item"><div class="action-mark ${t.kind === 'red' ? 'red' : t.kind === 'warn' ? 'warn' : ''}">${ic(t.kind === 'red' ? 'alert' : t.kind === 'warn' ? 'info' : 'check', 16)}</div><div><b>${esc(t.title)}</b><p>${esc(t.desc)}</p></div></div>`,
   )
   .join(
     '',
   )}</div><div class="panel"><div class="section-heading"><h2>Risk Metrics</h2></div><div class="risk-metrics-list"><div><span>Observed account max drawdown</span><b>${state.snapshots?.length >= 2 ? `${pnum(A.drawdown(A.twrSnapshots(state.snapshots).rows))}%` : 'Not verifiable'}</b></div><div><span>Fixed-weight proxy max drawdown</span><b>${Number.isFinite(diag.historicalDrawdownProxy) ? pnum(diag.historicalDrawdownProxy) + '%' : '—'}</b></div><div><span>Positions exceeding 20%</span><b>${p.top.filter((x) => x.weight >= 20).length}</b></div><div><span>Recorded realized P/L</span><b>${fmt(state.ledgerStats?.realized, 0)}</b></div><div><span>Recorded dividends</span><b>${fmt(state.ledgerStats?.dividends, 0)}</b></div></div><p class="hint">The fixed-weight series assumes current holdings in prior periods. It is not actual portfolio performance; account TWR requires dated values and flows.</p></div></div><div class="pm-secondary-vix">${pulseView()}</div></div><div class="pm-bottom-cards"><button class="shortcut" data-action="go:news"><strong>${ic('news')} News & Events</strong><span>Issuer, earnings, sector, monetary policy and geopolitical monitoring.</span></button><button class="shortcut" data-action="go:discover"><strong>${ic('discover')} Equity Discovery</strong><span>Research-led candidate screening and valuation comparisons.</span></button><button class="shortcut" data-action="go:report"><strong>${ic('printer')} Weekly Intelligence</strong><span>Download a detailed PDF and manage email delivery.</span></button></div>`;
  }

  function transactionPage() {
    const trades = state.transactions || [],
      issues = state.ledgerStats?.issues || [],
      latest = trades.slice(-12).reverse();
    return `${pageTitle('Yahoo Finance · cartera', 'Usa Yahoo Finance para mantener las posiciones y Portafolio Manager para analizarlas con precios de mercado.', 'FUENTE DE POSICIONES')}${unverifiedNotice()}<div class="notice"><div>${ic('shield')}</div><span><b>Dos datos, una misma fuente: Yahoo Finance.</b> Los precios se actualizan desde Yahoo al usar el servidor. Tus posiciones privadas se actualizan con el CSV que descargas de <a href="https://finance.yahoo.com/portfolios/" target="_blank" rel="noopener noreferrer">Mi cartera en Yahoo ↗</a>. La biblioteca yfinance-MCP no permite leer automáticamente tus posiciones privadas.</span></div><div class="grid cols-2"><div class="panel"><h2>1 · Importar tu cartera de Yahoo</h2><p>En Yahoo Finance → Mi cartera → abre el portafolio → Más opciones → Descargar CSV. Selecciona el archivo aquí o pega su contenido. Se admiten <code>Symbol,Quantity,Purchase Price</code>, varias compras por ticker y <code>ticker,shares,cost</code>. Se sustituye la foto anterior.</p><label class="field" for="pm-yahoo-file">Archivo exportado de Yahoo Finance</label><input type="file" id="pm-yahoo-file" class="input" accept=".csv,text/csv,text/plain" style="margin:10px 0" /><textarea id="csv-import" class="input" rows="5" placeholder="ticker,shares,cost\nNVDA,3,115.20\nMSFT,2,405.30"></textarea><div class="pm-actions">${action('importCSV', ic('upload') + ' Importar posiciones', 'btn primary')}${action('refresh', 'Actualizar precios', 'btn ghost')}</div><p class="hint">Si el archivo solo contiene tickers/precios (una watchlist), no se inventarán cantidades ni costes. Importar una nueva foto sustituye las cantidades y el libro incremental; guarda un respaldo JSON antes.</p></div><div class="panel"><h2>2 · Compras y ventas</h2><p>Desde tu foto inicial, incorpora operaciones posteriores. Formato CSV genérico: <code>fecha,tipo,ticker,cantidad,precio,comision</code>. No depende de ningún bróker y solo actualiza tu copia local.</p><textarea id="pm-trades-csv" class="input" rows="5" placeholder="fecha,tipo,ticker,cantidad,precio,comision\n2026-11-21,compra,MSFT,1,420,0\n2026-11-22,venta,NVDA,0.5,160,0"></textarea><div class="pm-actions"><select class="input" id="ledger-import-mode" aria-label="Modo de importación"><option value="append">Añadir a la foto inicial</option><option value="full">Histórico completo desde cero</option></select>${action('importTrades', 'Aplicar operaciones', 'btn primary')}</div><p class="hint">La venta resta acciones y calcula ganancia realizada por costo promedio. No concilia FIFO fiscal ni impuestos.</p></div></div><div class="grid cols-2" style="margin-top:16px"><div class="panel"><h2>Registrar operación individual</h2><div class="pm-trade-form"><label>Tipo<select class="input" id="pm-trade-type"><option value="buy">Compra</option><option value="sell">Venta</option><option value="dividend">Dividendo</option></select></label><label>Fecha<input id="pm-trade-date" type="date" class="input" value="${L.todayLima()}"/></label><label>Ticker<input id="pm-trade-ticker" class="input" placeholder="NVDA" autocomplete="off"/></label><label>Acciones<input id="pm-trade-shares" class="input" type="number" min="0" step="any" placeholder="2.5"/></label><label>Precio (USD)<input id="pm-trade-price" class="input" type="number" min="0" step="any" placeholder="145.00"/></label><label>Comisión (USD)<input id="pm-trade-fee" class="input" type="number" min="0" step="any" value="0"/></label></div>${action('manualTrade', 'Guardar movimiento', 'btn primary')}<p class="hint">Para dividendos, pon el importe recibido en el campo Precio; la cantidad se ignora.</p></div><div class="panel"><h2>3 · Rentabilidad histórica REAL</h2><p>Para un gráfico TWR (sin aportes), importa capturas de valor de cuenta y aportes netos por fecha. El flujo de cada fila se considera al cierre del periodo.</p><textarea class="input" rows="5" id="pm-snapshots-csv" placeholder="fecha,valor,flujo\n2026-10-31,12000,0\n2026-11-07,12400,200\n2026-11-14,12250,0"></textarea><div class="pm-actions">${action('importSnapshots', 'Importar histórico TWR', 'btn primary')}${action('exportJSON', 'Respaldar todo', 'btn ghost')}</div><p class="hint">Sin valores de cuenta completos el gráfico enseña una simulación de posiciones actuales. Evitamos llamar rentabilidad a la mera variación de patrimonio.</p></div></div><div class="panel" style="margin-top:16px"><div class="section-heading"><h2>Libro de operaciones</h2><span class="pill muted">${trades.length} registros · ${state.snapshots?.length || 0} fotos</span></div>${issues.length ? `<div class="inline-warn">${issues.map(esc).join(' · ')}</div>` : ''}<div class="table-wrap"><table class="data-table"><thead><tr><th>Fecha</th><th>Acción</th><th>Ticker</th><th>Cantidad</th><th>Precio</th><th></th></tr></thead><tbody>${latest.map((x) => `<tr><td>${esc(x.date)}</td><td>${x.type === 'buy' ? 'Compra' : x.type === 'sell' ? 'Venta' : 'Dividendo'}</td><td><b>${esc(x.ticker)}</b></td><td>${pnum(x.shares, 4)}</td><td>${fmt(x.price ?? x.amount, 2)}</td><td>${action('deleteTrade:' + encodeURIComponent(x.id), 'Quitar', 'btn tiny-btn')}</td></tr>`).join('') || '<tr><td colspan="6">Sin transacciones registradas. La cartera puede partir de un CSV de Yahoo Finance.</td></tr>'}</tbody></table></div></div><div class="notice plain" style="margin-top:16px"><span><b>¿Las ventas se reflejan solas?</b> Los precios sí se actualizan desde Yahoo Finance al pulsar Actualizar; tus cantidades solo cambian cuando importas un nuevo CSV exportado de Yahoo o registras una operación aquí. No existe en esta versión una API autenticada y autorizada para leer tu cuenta privada de Yahoo Finance. No compartas tus contraseñas, cookies ni tokens.</span></div>`;
  }
  function shortFactsheet(s, p, r) {
    const confirmed = s.research?.verified,
      pr = state.peers?.[s.ticker],
      cmp = pr ? A.comparePeers(pr.items[0] || {}, pr.items.slice(1)) : null,
      v = r.zone,
      gap = L.layerStatus(p, s.layer),
      percent = p.weights[s.ticker] || 0;
    const facts = [
      ['P/E TTM · GAAP', s.eps > 0 && s.price > 0 ? pnum(s.price / s.eps, 1) + '×' : '—'],
      ['P/FCF TTM', s.fcfps > 0 && s.price > 0 ? pnum(s.price / s.fcfps, 1) + '×' : '—'],
      ['Ventas vs año anterior', pct(s.revenueGrowth)],
      ['Margen operativo', pct(s.opMargin)],
      ['Margen FCF', pct(s.fcfMargin)],
      ['Deuda / patrimonio', Number.isFinite(s.debtEquity) ? pnum(s.debtEquity, 2) + '×' : '—'],
      ['Desde máx. 52 semanas', Number.isFinite(s.fromHigh) ? '−' + pnum(s.fromHigh) + '%' : '—'],
      ['Beta histórica', '—'],
    ];
    return `<div class="pm-factsheet"><div class="factsheet-summary"><div><span class="caps">EN UNA FRASE</span><h3>${ext(s.name)} · ${esc(s.sector)}</h3><p>${esc(s.track === 'ia' ? `Pieza de la cadena de IA (${L.LAYERS[s.layer]?.name || s.layer}); hay que verificar crecimiento, generación de caja y precio antes de asignar.` : 'Posible diversificador; comprobar que su crecimiento es sostenido y que mejora realmente los riesgos de tu cartera.')}</p></div><div class="factsheet-score"><small>Score 30/25/25/15/5</small><b>${r.score ?? '—'}<em>/100</em></b><span class="pill ${r.score === null ? 'muted' : r.calificacion === 'Incorporar' ? '' : 'gold'}">${esc(r.calificacion)}</span></div></div><div class="section-heading"><h2>Los 8 números que importan</h2><span class="pill ${confirmed ? 'muted' : 'gold'}">${confirmed ? 'SEC · N1' : 'Datos no verificados'}</span></div><div class="fact-matrix">${facts.map(([k, val]) => `<div><span>${esc(k)}</span><b>${esc(val)}</b></div>`).join('')}</div><div class="pm-brief-columns"><div><h3>¿Qué hace y dónde gana?</h3><p>Sector ${esc(s.sector)}. ${esc(s.track === 'ia' ? 'Encaja en la cadena de producción, infraestructura o software de inteligencia artificial según su clasificación.' : 'Su función es aportar exposición fuera del núcleo de IA si mantiene calidad y crecimiento.')}</p><p class="hint">Para describir líneas de producto, clientes y mix de ingresos concretos es obligatorio contrastar el 10-K y resultados oficiales; no se infieren por el ticker.</p></div><div><h3>¿Le va bien?</h3><p>Ventas ${pct(s.revenueGrowth)} interanual · margen operativo ${pct(s.opMargin)} · margen de flujo libre ${pct(s.fcfMargin)}. ${!confirmed ? 'Estas cifras no deben usarse como datos reales de la compañía hasta verificar su periodo.' : 'Compara con el periodo indicado en Fuentes y revisa si la mejora se traduce en caja.'}</p></div><div><h3>¿Cara frente a pares?</h3><p>${cmp?.metrics?.pe?.peerCount >= 2 ? `P/E empresa: ${pnum(cmp.metrics.pe.value, 1)}×; mediana de ${cmp.metrics.pe.peerCount} pares: ${pnum(cmp.metrics.pe.median, 1)}×. Diferencia ${pct(cmp.metrics.pe.relative)}.` : 'Falta una muestra comparable de empresas con EPS SEC verificado. Abre «Pares» para consultar ratios lado a lado.'}</p><p>${v ? `Valor base del modelo ${fmt(v.base, 2)}, zona ${fmt(v.low, 2)}–${fmt(v.high, 2)}. Supuestos, no cotización objetivo oficial.` : 'No hay valoración base reproducible.'}</p></div><div><h3>¿Qué aporta a tu cartera?</h3><p>Peso individual ${pnum(percent, 1)}%, capa ${pnum(gap.w, 1)}% (${esc(gap.state)}), objetivo ${L.LAYERS[s.layer]?.min ?? '—'}–${L.LAYERS[s.layer]?.max ?? '—'}%. Ninguna posición debe superar el 25%.</p><p>No debes reforzar una capa llena aunque la empresa parezca atractiva.</p></div></div><div class="notice plain"><span><b>La condición que cambiaría la tesis:</b> deterioro persistente de crecimiento, márgenes o flujo libre en resultados oficiales; cuantificar por empresa antes de fijar una regla de salida. El precio por sí solo no es una tesis.</span></div><div class="pm-actions">${action('detailtab:peers', 'Ver múltiplos vs. pares →', 'btn ghost')}${action('detailtab:ldd', 'Técnica de 4 años →', 'btn ghost')}${action('detailtab:institucional', 'Dame más información →', 'btn primary')}</div></div>`;
  }
  function peersPage(s) {
    const data = state.peers?.[s.ticker];
    const candidates = A.PEERS[s.ticker] || [];
    const items = data?.items || [s, ...candidates.map((t) => stock(t))],
      cmp = A.comparePeers(items[0] || s, items.slice(1)),
      v = cmp.metrics.pe;
    let message = 'Faltan ratios SEC verificables en pares para comparar.';
    if (v.peerCount >= 2 && Number.isFinite(v.value) && Number.isFinite(v.median))
      message = `${s.ticker} cotiza a ${pnum(v.value, 1)}× beneficios, frente a una mediana de ${pnum(v.median, 1)}× entre ${v.peerCount} pares: ${v.relative < 0 ? `descuento de ${Math.abs(v.relative)}%` : `prima de ${v.relative}%`}. Un descuento NO prueba una ganga; compara márgenes, crecimiento y riesgo.`;
    return `<div class="section-heading"><h2>Comparación competitiva</h2><span class="pill ${state.demo ? 'demo' : 'gold'}">${state.demo ? 'Datos simulados' : 'SEC + Yahoo (si disponibles)'}</span></div><p>${esc(message)}</p><div class="table-wrap"><table class="data-table"><thead><tr><th>Compañía</th><th>P/E 12m</th><th>P/FCF</th><th>EV/EBITDA</th><th>Ventas a/a</th><th>Margen operativo</th></tr></thead><tbody>${items
      .map((x, i) => {
        const n = A.compVal(x);
        return `<tr class="${!i ? 'peer-highlight' : ''}"><td>${!i ? '<b>TU EMPRESA</b><br>' : ''}${esc(x.ticker)}${!state.demo && x.verified !== true && x.provenance !== 'sec' ? '<small> · sin verificar</small>' : ''}</td><td>${Number.isFinite(n.pe) ? pnum(n.pe, 1) + '×' : '—'}</td><td>${Number.isFinite(n.pFcf) ? pnum(n.pFcf, 1) + '×' : '—'}</td><td>${Number.isFinite(n.evEbitda) ? pnum(n.evEbitda, 1) + '×' : '—'}</td><td>${pct(n.revenueGrowth)}</td><td>${pct(n.operatingMargin)}</td></tr>`;
      })
      .join(
        '',
      )}</tbody></table></div><div class="notice plain" style="margin-top:16px"><span>${state.demo ? 'Datos DEMO no utilizables.' : 'Comparación incompleta si faltan cifras verificadas. '} P/E es precio dividido por beneficio GAAP de 12 meses; P/FCF es precio dividido por flujo libre por acción. EV/EBITDA se deja vacío sin EBITDA, efectivo y deuda verificados en periodos equivalentes.</span></div><div class="pm-actions">${action('peers:' + s.ticker, 'Actualizar comparables SEC', 'btn primary')}${action('detailtab:institucional', 'Investigación completa →', 'btn ghost')}</div>`;
  }
  function lddPage(s) {
    const flags = state.lddSignals?.[s.ticker] || {},
      ldd = A.lddAnalysis(s.history || [], s.price, flags);
    return `<div class="section-heading"><div><div class="eyebrow">OVERKILL LDD · RECONSTRUCCIÓN NO OFICIAL</div><h2>Precio vs. media de 4 años</h2></div><span class="pill ${ldd.decision.includes('VENTA') ? 'red' : ldd.decision.includes('COMPRA') ? '' : 'gold'}">${esc(ldd.decision)}</span></div><div class="pm-ldd-kpis"><div><span>EMA 200 semanas</span><b>${fmt(ldd.ema200, 2)}</b><small>${ldd.weeks} semanas disponibles</small></div><div><span>Distancia 4Y</span><b class="${ldd.distance <= 0 ? 'positive' : ''}">${pct(ldd.distance)}</b><small>Precio / EMA 200W − 1</small></div><div><span>EMA 50 semanal</span><b>${fmt(ldd.ema50, 2)}</b><small>Tendencia intermedia</small></div><div><span>EMA 9 semanal</span><b>${fmt(ldd.ema9, 2)}</b><small>Tendencia reciente</small></div></div><div class="panel soft"><h3>Diagnóstico mecánico</h3><p><strong>${esc(ldd.decision)}</strong> · ${esc(ldd.reason)}</p><div class="fact-matrix"><div><span>MACD 12/26/9 semanal</span><b>${ldd.macd && Number.isFinite(ldd.macd.histogram) ? pnum(ldd.macd.histogram, 3) : '—'}</b></div><div><span>Tendencia MACD</span><b>${esc(ldd.macd?.trend || '—')}</b></div><div><span>Stoch RSI estándar</span><b>${pnum(ldd.stochRSI?.value)}</b></div><div><span>Onda y puntos oficiales</span><b>No conectados</b></div></div><p class="hint">La EMA 200 SEMANAL exige al menos 200 cierres semanales; nunca se sustituye por la media de 200 días. No llamamos puntos verdes/rojos a señales aproximadas.</p></div><div class="panel soft" style="margin-top:14px"><h3>Registrar señales originales confirmadas</h3><p>Marca únicamente señales que hayas visto en el indicador propietario, en una VELA CERRADA. La app no puede comprobarlas por sí sola.</p><div class="pm-ldd-checks">${[
      ['greenMonthly', 'Punto verde mensual confirmado'],
      ['greenWeekly', 'Punto verde semanal confirmado'],
      ['waveBelow', 'Onda semanal por debajo de línea blanca'],
      ['redDaily', 'Punto rojo diario confirmado'],
      ['redDailyZone', 'Punto diario en zona roja'],
      ['redWeekly', 'Punto rojo semanal confirmado'],
      ['stochConfirmed', 'Stoch RSI tocó línea original (temporalidad verificada)'],
    ]
      .map(
        ([key, label]) =>
          `<label><input type="checkbox" data-ldd-flag="${key}" ${flags[key] ? 'checked' : ''}/><span>${label}</span></label>`,
      )
      .join(
        '',
      )}</div>${action('saveLDD:' + s.ticker, 'Guardar señales observadas', 'btn primary')}<p class="hint">Regla: verde mensual → compra potencial 1; verde semanal y onda baja → compra potencial 2; rojo diario en zona roja → venta 1; rojo semanal → venta 2. Son alertas para revisar, no órdenes.</p></div>${s.history?.length < 850 ? `<div class="notice">${ic('info')}<span>Hay ${s.history?.length || 0} cierres diarios. ${location.protocol === 'file:' ? 'Abre el servidor para consultar 5 años.' : 'Consulta el histórico de 5 años para una EMA semanal válida.'}</span>${action('history:' + s.ticker, 'Cargar 5 años', 'btn ghost')}</div>` : ''}`;
  }
  function markdownSafe(text) {
    const lines = String(text || '').split('\n');
    return lines
      .map((l) => {
        let e = esc(l);
        e = e.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        e = e.replace(/\[([^\]]{1,140})\]\((https:\/\/[^)\s]+)\)/g, (_, name, url) => {
          // url was escaped with the line; decode before validating so the href is not double-escaped.
          const safe = L.safeUrl(
            url.replace(
              /&(amp|lt|gt|quot|#39);/g,
              (m, k) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[k],
            ),
          );
          return safe
            ? `<a href="${attr(safe)}" target="_blank" rel="noopener noreferrer">${name}</a>`
            : name;
        });
        if (/^###?\s/.test(l)) return `<h3>${e.replace(/^#{2,3}\s/, '')}</h3>`;
        if (/^#\s/.test(l)) return `<h2>${e.replace(/^#\s/, '')}</h2>`;
        if (/^\s*[-*]\s/.test(l)) return `<div class="report-line">• ${e.replace(/^\s*[-*]\s/, '')}</div>`;
        if (/^\|/.test(l)) return `<div class="report-line mono">${e}</div>`;
        return e.trim() ? `<p>${e}</p>` : '';
      })
      .join('');
  }
  function institutionPage(s, p, r) {
    const data = state.aiReports?.[s.ticker],
      verified = s.research?.verified,
      ldd = A.lddAnalysis(s.history || [], s.price, state.lddSignals?.[s.ticker] || {});
    return `<div class="section-heading"><div><div class="eyebrow">EQUITY RESEARCH · 12–18M / 5A</div><h2>Informe institucional condensado</h2></div><span class="pill ${verified ? '' : 'gold'}">${verified ? 'Fundamentales SEC' : 'Verificación pendiente'}</span></div><div class="notice plain"><span>Combina modelo de negocio, resultados, calidad, valoración, peers, variant perception, catalizadores, riesgos, 3 escenarios y encaje en cartera. Los datos faltantes se marcan; no se generan pronósticos inventados.</span></div>${
      data
        ? `<div class="pm-ai-report"><div class="report-provenance">Generado: ${prettyDateTime(data.generatedAt)} · ${esc(data.provider)} · ${esc(data.model || '')}</div><div data-no-i18n>${markdownSafe(data.text)}</div></div>`
        : `<div class="pm-institutional-summary"><div class="factsheet-summary"><div><span class="caps">SNAPSHOT COMPROBABLE</span><h3>${ext(s.name)} · ${esc(s.ticker)}</h3><p>Situación preliminar: <strong>${esc(r.calificacion)}</strong>. Precio disponible ${fmt(s.price, 2)}; valor base ${r.zone ? fmt(r.zone.base, 2) : 'no calculado'}.</p></div><div class="factsheet-score"><small>Score de research</small><b>${r.score ?? '—'}</b></div></div><div class="report-grid">${[
            [
              'Calidad financiera',
              `Ingresos +${pnum(s.revenueGrowth)}% a/a; margen operativo ${pct(s.opMargin)}, caja libre ${pct(s.fcfMargin)}.`,
            ],
            [
              'Valuación',
              `P/E ${s.price > 0 && s.eps > 0 ? pnum(s.price / s.eps, 1) + '×' : 'sin dato'}; zona ${r.zone ? fmt(r.zone.low, 0) + ' a ' + fmt(r.zone.high, 0) : 'sin base rigurosa'}.`,
            ],
            [
              'Riesgo y deuda',
              `Deuda / patrimonio ${Number.isFinite(s.debtEquity) ? pnum(s.debtEquity, 2) + '×' : 'no verificado'}. Ninguna acción supera por regla el 25%.`,
            ],
            [
              'Macro y exposición',
              `${esc(s.sector)} · ${esc(L.LAYERS[s.layer]?.name || s.layer)} · sensibilidad a demanda, tipos y ciclo pendiente de revisión.`,
            ],
            [
              'Percepción alternativa',
              'El reporte ampliado debe demostrar con cifras qué espera el mercado y qué podría estar interpretando mal.',
            ],
            [
              'Catalizadores y LDD',
              `Regla técnica: ${ldd.decision}. Las señales oficiales del oscilador no son observables sin su fuente.`,
            ],
          ]
            .map(([k, v]) => `<div><h3>${k}</h3><p>${v}</p></div>`)
            .join('')}</div></div>`
    }<div class="pm-actions">${action('aiReport:' + s.ticker, data ? 'Regenerar con web y SEC' : 'Dame más información · generar informe', 'btn primary')}${action('detailtab:fuentes', 'Ver documentación SEC', 'btn ghost')}</div><p class="hint">El botón necesita servidor y OPENAI_API_KEY (facturación del proveedor). Consulta datos oficiales y búsqueda web; jamás usa credenciales de tu brokerage. En modo HTML autónomo, la ficha resumida funciona sin IA.</p>`;
  }
  async function fetchManagerMarket() {
    if (isGuest()) return;
    if (location.protocol === 'file:') return;
    try {
      const r = await apiFetch('/api/market');
      if (!r.ok) return;
      state.market = await r.json();
      if (view === 'home' && !modal) render();
    } catch {}
  }
  async function fetchManagerHistory(t) {
    if (isGuest()) return;
    if (location.protocol === 'file:') {
      toast('El histórico de 5 años requiere servidor local, no el HTML autónomo.', true);
      return;
    }
    if (advancedLoading.has('hist:' + t)) return;
    advancedLoading.add('hist:' + t);
    try {
      const r = await apiFetch('/api/stock/' + encodeURIComponent(t) + '/chart?range=5y');
      const body = await r.json();
      if (!r.ok || !body.quote?.history?.length) throw Error(body.error || 'Historial no disponible');
      // History bars only: the current price, currency, timestamp and freshness come from the
      // quote refresh and are never replaced by a chart response.
      state.quotes[t] = {
        ...(state.quotes[t] || {}),
        history: body.quote.history,
        historyCurrency: body.quote.currency || null,
        historyAt: new Date().toISOString(),
      };
      stocksCache = {};
      portfolioCache = null;
      if (modal?.ticker === t || view === 'home') render();
    } catch (e) {
      toast('Histórico no disponible: ' + e.message, true);
    } finally {
      advancedLoading.delete('hist:' + t);
    }
  }
  async function fetchManagerPeers(t) {
    if (isGuest()) return;
    if (location.protocol === 'file:') {
      toast('Ratios SEC comparables requieren servidor local.', true);
      return;
    }
    if (advancedLoading.has('peers:' + t)) return;
    advancedLoading.add('peers:' + t);
    toast('Consultando empresas comparables…');
    try {
      const r = await apiFetch('/api/peers?t=' + encodeURIComponent(t));
      const data = await r.json();
      if (!r.ok) throw Error(data.error || 'sin respuesta');
      state.peers = state.peers || {};
      state.peers[t] = { ...data, loadedAt: new Date().toISOString() };
      if (modal?.ticker === t || view === 'home') render();
      const verified = data.items.filter((x) => x.verified).length;
      toast(`${t}: ${verified} empresas con cifras oficiales SEC.`);
    } catch (e) {
      toast('Comparables no disponibles: ' + e.message, true);
    } finally {
      advancedLoading.delete('peers:' + t);
    }
  }
  async function generateManagerReport(t) {
    if (location.protocol === 'file:') {
      toast(
        'Abre la app con servidor y configura OPENAI_API_KEY para ejecutar el informe institucional.',
        true,
      );
      return;
    }
    if (advancedLoading.has('ai:' + t)) return;
    advancedLoading.add('ai:' + t);
    toast('Consultando SEC y fuentes web para el informe…');
    const ctl = new AbortController(),
      tm = setTimeout(() => ctl.abort(), 165000);
    try {
      const r = await apiFetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: t }),
        signal: ctl.signal,
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error || 'Error de proveedor');
      state.aiReports = state.aiReports || {};
      state.aiReports[t] = data;
      save();
      if (modal?.ticker === t) {
        detailTab = 'institucional';
        render();
      }
      toast('Informe generado. Revisa fechas y enlaces antes de usarlo.');
    } catch (e) {
      toast('Informe no generado: ' + e.message, true);
    } finally {
      clearTimeout(tm);
      advancedLoading.delete('ai:' + t);
    }
  }
  function applyReconciliation() {
    const wasDemo = state.demo;
    const old = state.holdings || [],
      result = A.reconcileTrades(state.baseHoldings || [], state.transactions || []);
    if (result.issues.length) {
      state.ledgerStats = { realized: result.realized, dividends: result.dividends, issues: result.issues };
      return false;
    }
    state.holdings = result.holdings;
    state.demo = wasDemo;
    state.dataSource = wasDemo ? 'demo' : 'imported';
    state.ledgerStats = { realized: result.realized, dividends: result.dividends, issues: [] };
    return true;
  }
  function saveTradesFromCSV() {
    const raw = $('#pm-trades-csv')?.value || '',
      parse = A.parseTransactions(raw, { language: window.PMAccount?.user?.language || 'en' }),
      mode = $('#ledger-import-mode')?.value || 'append';
    // Any rejected row: nothing is applied and the existing ledger is kept.
    if (parse.errors.length) {
      toast(
        tr(
          `${parse.errors.length} rows rejected; the ledger was not changed. ${parse.errors.slice(0, 2).join(' ')}`,
          `${parse.errors.length} filas rechazadas; el libro no se modificó. ${parse.errors.slice(0, 2).join(' ')}`,
        ),
        true,
      );
      return;
    }
    if (!parse.transactions.length) {
      toast(parse.errors.slice(0, 2).join('. ') || 'No hay registros válidos', true);
      return;
    }
    const previous = {
      holdings: state.holdings,
      baseHoldings: state.baseHoldings,
      transactions: state.transactions,
      ledgerStats: state.ledgerStats,
      demo: state.demo,
    };
    if (mode === 'full') {
      state.baseHoldings = [];
      state.transactions = [];
      state.demo = false;
    } else if (!state.baseHoldings) {
      state.baseHoldings = state.holdings.map((h) => ({ ...h }));
      state.transactions = [];
    }
    const have = new Set((state.transactions || []).map((x) => x.id)),
      newTx = parse.transactions.filter((x) => !have.has(x.id));
    state.transactions = [...(state.transactions || []), ...newTx];
    if (!applyReconciliation()) {
      Object.assign(state, previous);
      toast('Venta mayor que tenencia registrada. Revisa el histórico y el modo de importación.', true);
      return;
    }
    commit(
      `${newTx.length} movimientos añadidos; ${parse.errors.length} filas rechazadas. Tu cartera Yahoo Finance no se modifica.`,
    );
  }
  function saveManualTrade() {
    const t = String($('#pm-trade-ticker')?.value || '')
        .trim()
        .toUpperCase(),
      type = $('#pm-trade-type')?.value,
      date = $('#pm-trade-date')?.value,
      shares = Number($('#pm-trade-shares')?.value),
      priceRaw = String($('#pm-trade-price')?.value ?? '').trim(),
      // A blank price is missing, not zero.
      price = priceRaw === '' ? NaN : Number(priceRaw),
      fee = Number($('#pm-trade-fee')?.value) || 0;
    if (
      !/^[A-Z0-9.\-]{1,12}$/.test(t) ||
      !date ||
      !(price > 0) ||
      (type !== 'dividend' && !(shares > 0)) ||
      fee < 0
    ) {
      toast('Completa ticker, fecha, cantidad y precio correctamente', true);
      return;
    }
    const item = {
      id: 'manual-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      date,
      type,
      ticker: t,
      shares: type === 'dividend' ? 0 : shares,
      price: type === 'dividend' ? null : price,
      amount: type === 'dividend' ? price : round(shares * price, 2),
      fee,
      source: 'Registro manual',
    };
    const snapshot = {
      baseHoldings: state.baseHoldings,
      transactions: state.transactions,
      holdings: state.holdings,
      demo: state.demo,
      ledgerStats: state.ledgerStats,
    };
    if (!state.baseHoldings) state.baseHoldings = state.holdings.map((h) => ({ ...h }));
    state.transactions = [...(state.transactions || []), item];
    if (!applyReconciliation()) {
      Object.assign(state, snapshot);
      toast('La operación no puede vender más acciones de las registradas.', true);
      return;
    }
    commit('Movimiento local guardado · Yahoo Finance no se modifica');
  }
  function saveSnapshots() {
    const parsed = A.parseSnapshots($('#pm-snapshots-csv')?.value || '', {
      language: window.PMAccount?.user?.language || 'en',
    });
    if (parsed.errors.length) {
      toast(
        tr(
          `${parsed.errors.length} rows rejected; the account history was not changed. ${parsed.errors.slice(0, 2).join(' ')}`,
          `${parsed.errors.length} filas rechazadas; el historial no se modificó. ${parsed.errors.slice(0, 2).join(' ')}`,
        ),
        true,
      );
      return;
    }
    if (parsed.snapshots.length < 2) {
      toast('Importa al menos dos valores de cuenta en fechas distintas.', true);
      return;
    }
    state.snapshots = parsed.snapshots;
    commit(
      `${parsed.snapshots.length} fechas importadas; gráfico con TWR disponible (${parsed.errors.length} filas rechazadas)`,
    );
  }
  function deleteTrade(id) {
    const tx = state.transactions || [],
      newTx = tx.filter((x) => x.id !== decodeURIComponent(id));
    if (newTx.length === tx.length) return;
    const old = state.transactions;
    state.transactions = newTx;
    if (!applyReconciliation()) {
      state.transactions = old;
      applyReconciliation();
      toast('No se puede quitar: dejaría ventas sin acciones disponibles.', true);
      return;
    }
    commit('Operación eliminada del registro local');
  }

  function home() {
    return dashboardHome();
  }
  function renderDiscover() {
    const p = pfolio();
    // A deck saved before this rule (or ranked in demo) must not carry sample rankings into an account.
    if (!state.demo && state.deck?.length)
      state.deck = state.deck.filter((t) => L.isVerifiedCandidate(stock(t)));
    if (!state.deck?.length) refillDeck(false);
    const first = state.deck[0];
    const s = first ? stock(first) : null;
    if (!state.demo && !s)
      return `${unverifiedNotice()}${pageTitle('Equity Discovery', 'Research candidates are ranked only on verified prices and fundamentals.', 'EQUITY RESEARCH / CANDIDATE REVIEW')}${unrankedSamples()}`;
    const model = L.trainTaste(p, state.swipes);
    const detailed = s
      ? L.scoreItem(rankItem(s.ticker), p, model, state.mode, state.seed, null, rankFeatures())
      : null;
    const st = s ? L.researchScore(s, p) : null;
    const graph = s
      ? s.history?.length
        ? s.history.slice(-60).map((x) => x.close)
        : state.demo
          ? demoCurve(s.ticker, 45)
          : null
      : null;
    return `${unverifiedNotice()}<div class="discover-header"><div>${pageTitle('Equity Discovery', 'Research candidates ranked by portfolio fit, valuation, business quality and risk.', 'EQUITY RESEARCH / CANDIDATE REVIEW')}${state.demo ? '<span class="pill demo">SAMPLE DATA — ranking uses illustrative prices and fundamentals</span>' : ''}</div><div class="segmented" role="group" aria-label="Modo de descubrimiento">${[
      ['similar', 'Similar'],
      ['balanced', 'Equilibrado'],
      ['diversify', 'Diversificar'],
    ]
      .map(
        ([id, title]) =>
          `<button data-action="mode:${id}" class="${state.mode === id ? 'active' : ''}">${title}</button>`,
      )
      .join(
        '',
      )}</div></div><div class="discover-layout"><div class="deck-wrapper"><div class="queue-meta"><span>${state.deck.length} tarjetas en el mazo</span><span>${L.CATALOG.length} empresas en el universo</span></div><div class="deck-stack">${s ? `<div class="swipe-card ${cardFlipped ? 'flipped' : ''}" id="swipe-card" role="group" aria-label="Tarjeta de ${esc(s.name)}">${cardFlipped ? cardBack(s, detailed, st) : cardFront(s, detailed, st, graph)}<div class="stamp" id="stamp-like">GUARDAR</div><div class="stamp pass" id="stamp-pass">PASAR</div></div>` : `<div class="swipe-card" style="display:grid;place-items:center;padding:28px"><div class="empty"><div class="empty-icon">◎</div><h3>Por hoy, has visto todo</h3><p>Cambia el modo de descubrimiento o espera nuevos análisis. Nunca rellenamos el mazo con empresas ya descartadas.</p>${action('resetDeck', 'Explorar otras ideas', 'btn primary')}</div></div>`}</div><div class="deck-actions"><button class="round-action undo" data-action="undo" aria-label="Deshacer última decisión" title="Deshacer" ${!lastUndo ? 'disabled' : ''}>${ic('undo')}<small>Deshacer</small></button><button class="round-action pass" data-action="swipe:pass" aria-label="Pasar">${ic('close', 23)}<small>Pasar</small></button><button class="round-action super" data-action="swipe:super" aria-label="Súper me gusta">${ic('star')}<small>Super</small></button><button class="round-action like" data-action="swipe:like" aria-label="Añadir a watchlist">${ic('heart')}<small>Guardar</small></button><button class="round-action why" data-action="stock:${attr(s.ticker)}" aria-label="Open complete company factsheet">${ic('info')}<small>Factsheet</small></button></div><div class="queue-meta"><span>${state.swipes.length} decisiones aprendidas</span><span>← Pasar · ↑ Super · → Guardar</span></div></div><aside class="rail-panel"><div class="panel glow"><div class="eyebrow">TU PERFIL</div><div class="callout-number">${state.swipes.length}</div><div class="small" style="font-weight:750">decisiones registradas</div><p>El sistema aprende de lo que te interesa. Tu cartera influye en el punto de partida.</p><div class="divider"></div><div class="metric-bar"><span>Dentro de IA</span><strong>${safeNum(
      Object.entries(p.layers)
        .filter(([k]) => L.LAYERS[k]?.kind === 'ia')
        .reduce((a, [, v]) => a + v, 0),
      1,
    )}%</strong></div><div class="metric-bar"><span>En watchlist</span><strong>${Object.keys(state.matches).length}</strong></div><div class="metric-bar"><span>Decisiones</span><strong>${state.swipes.filter((x) => x.action === 'pass').length} pasadas</strong></div>${action('go:taste', 'Ver lo que aprende ' + ic('arrow'), 'btn ghost')}</div><div class="panel"><h2>Cómo se decide</h2><p>Primero afinidad (40%), calidad (15%) y encaje/diversificación (45%). Luego filtro aparte de valoración, calidad y riesgo con rúbrica 30/25/25/15/5.</p><div class="legend">No mezclamos la afinidad con una probabilidad de ganar. Si faltan fuentes verificadas, el análisis no se presenta como una recomendación.</div></div><div class="panel"><h2>Datos y evidencia</h2><p>Fuente primaria SEC para fundamentals. Cotizaciones públicas con fecha. Sin causa verificada no atribuimos noticias a movimientos.</p><span class="pill ${state.demo ? 'demo' : 'gold'}">${state.demo ? 'Solo ejemplos' : 'Validación requerida'}</span></div></aside></div>`;
  }
  function cardFront(s, rec, analysis, graph) {
    const layer = L.LAYERS[s.layer]?.name || s.sector;
    return `<div class="card-interior"><div class="card-header"><div class="logo-xl">${esc(s.ticker.slice(0, 2))}</div><span class="pill ${s.track === 'ia' ? '' : 'gold'}">${s.track === 'ia' ? '○ Tesis IA' : '◈ Diversificación'}</span></div><h2 class="card-name">${ext(s.name)}</h2><div class="card-ticker"><b>${esc(s.ticker)}</b><span>· ${esc(s.sector)}</span></div><div class="card-price"><div><div class="caps">Precio ${state.demo ? 'de muestra' : s.priceAsOf ? 'registrado' : 'sin verificar'}</div><div class="amount">${fmt(s.price, 2)}</div></div><div class="delta">${change(s.day)} <span class="muted tiny">hoy</span></div></div><div class="card-graph">${graph?.length ? svgChart(graph, 100) : `<div class="muted small">Sin historial de precio verificado</div>`}</div><div class="card-rule"></div><div class="reason-box"><div class="reason-caption">POR QUÉ TE LA MOSTRAMOS</div><p>${esc(cardReason(s, rec, analysis))}</p></div><div class="card-highlights"><div class="highlight"><label>Crecimiento ventas a/a</label><strong>${pct(s.revenueGrowth)}</strong><small>${esc(completeness(s))}</small></div><div class="highlight"><label>Encaje en tu cartera</label><strong>${safeNum(rec?.score * 100, 0)} <small>/100</small></strong><small>Personalización; no retorno</small></div></div><div class="card-bottom"><span>${ic('info', 12)} Toca para analizar la tesis</span><span>${esc(layer)} · ${state.demo ? 'Muestra' : 'Requiere fuentes'}</span></div></div>`;
  }
  function cardReason(s, rec, analysis) {
    const top = rec?.parts?.find((x) => x.value > 0.005);
    if (top?.name === 'Diversificación sectorial')
      return `${s.sector} representa ${safeNum(pfolio().sectors[s.sector] || 0, 1)}% de tu cartera. Merece una mirada distinta para diversificar.`;
    if (top?.name === 'Parecida a tu cartera')
      return `Tiene características cercanas a empresas que ya sigues. Ahora comprueba si su precio tiene sentido.`;
    if (top?.name === 'Afinidad aprendida' && state.swipes.length >= 2)
      return `Tus decisiones anteriores favorecen empresas con un perfil parecido. Revisa los riesgos antes de guardarla.`;
    return `Forma parte de ${L.LAYERS[s.layer]?.name || s.sector}. Explora su negocio, su valoración y sus riesgos antes de decidir.`;
  }
  function cardBack(s, rec, analysis) {
    const r = analysis,
      zone = r.zone,
      proj = L.projections(s),
      raw = rec?.parts || [];
    return `<div class="card-back"><button class="back-close" data-action="flip" aria-label="Volver a la tarjeta">${ic('close')}</button><span class="eyebrow">TU FICHA PARA DECIDIR</span><h3>${ext(s.name)}</h3><div class="stat-chips"><span class="pill ${s.demo ? 'demo' : 'muted'}">${esc(completeness(s))}</span><span class="pill ${r.calificacion === 'Incorporar' ? '' : 'gold'}">${esc(r.calificacion)}</span><span class="pill muted">${r.score}/100 financiero</span></div><h4>Qué sabemos y qué falta</h4><p>${ext(s.name)} · ${esc(s.sector)}. ${s.research?.verified ? 'Indicadores extraídos de reportes SEC. Cada dato debe contrastarse con su periodo y documento.' : 'Aún no se ha verificado el mínimo de cinco métricas de fuentes N1. Las variables mostradas son un ejemplo de cómo funcionará la evaluación.'}</p><h4>Valoración y entrada</h4>${zone ? `<div class="back-line"><span>Valor calculado</span><b>${fmt(zone.base, 2)}</b></div><div class="back-line"><span>Zona ${state.demo ? 'ilustrativa' : 'teórica'}</span><b>${fmt(zone.low, 2)}–${fmt(zone.high, 2)}</b></div><p>${esc(zone.method)}. Con un crecimiento 5 puntos inferior, el valor pasaría de ${fmt(zone.base, 0)} a ${fmt(zone.sensitivity, 0)}.</p>` : `<p>No data para una valoración responsable.</p>`}<h4>Razones para mostrártela</h4>${raw
      .slice(0, 4)
      .map(
        (x) =>
          `<div class="back-line"><span>${esc(x.name)}</span><b>${safeNum(x.metric !== null ? x.metric * 100 : null, 0)}${x.metric !== null ? '%' : '—'}</b></div>`,
      )
      .join(
        '',
      )}<h4>Preguntas de riesgo</h4><ul><li>¿Crece de forma rentable, con caja real y no solo ingresos?</li><li>¿Qué dato observable invalidaría su tesis?</li><li>¿Aumentaría una capa ya sobre su objetivo?</li></ul>${
      s.research?.sources?.length
        ? `<div class="sources">${s.research.sources
            .slice(0, 3)
            .map((x) => extLink(x.url, x.label || x.title || 'Fuente SEC'))
            .join(' · ')}</div>`
        : '<div class="hint">Sin fuentes primarias todavía · No usar para decidir inversiones.</div>'
    }<div style="margin-top:16px;display:flex;gap:8px">${action('stock:' + s.ticker, 'Abrir ficha completa', 'btn primary')}${action('flip', 'Volver', 'btn ghost')}</div></div>`;
  }
  // Demo/guest may rank the seeded sample catalog (labelled as sample). A signed-in account only
  // ranks candidates whose price and fundamentals are verified; the rest stay unranked.
  function deckOptions() {
    return state.demo ? { allowSample: true } : { allowSample: false, universe: universe() };
  }
  // Scoring reference statistics: the sample catalog in demo, verified observations otherwise.
  function rankFeatures() {
    return state.demo ? L.FEATURES : L.featureModel(universe().filter(L.isVerifiedCandidate), { minObs: 5 });
  }
  function rankItem(t) {
    return state.demo ? L.BY_TICKER[t] || stock(t) : stock(t);
  }
  function unrankedSamples() {
    const held = new Set(state.holdings.map((h) => h.ticker));
    const rows = L.CATALOG.filter((x) => !held.has(x.ticker) && !state.matches[x.ticker])
      .slice()
      .sort((a, b) => a.ticker.localeCompare(b.ticker))
      .slice(0, 24);
    return `<div class="panel"><div class="section-heading"><div><div class="eyebrow">SAMPLE DATA — UNRANKED</div><h2>No verified candidates yet</h2></div><span class="pill demo">Sample data — unranked</span></div><p>Candidates are ranked only once their market price and SEC fundamentals are verified. The universe below uses seeded sample figures, so it is listed alphabetically with no score. Open a factsheet and select <b>Refresh SEC fundamentals</b> to verify one.</p><div class="search-results">${rows.map((x) => `<button class="search-result" data-action="stock:${attr(x.ticker)}"><div style="display:flex;align-items:center;gap:10px;min-width:0">${logo(x)}<div data-no-i18n><div class="ticker">${esc(x.ticker)}</div><div class="sub">${ext(x.name)}</div></div></div><span class="pill demo">Unranked</span></button>`).join('')}</div></div>`;
  }
  function refillDeck(persist = true) {
    const p = pfolio(),
      out = L.generateDeck(p, state.swipes, state.matches, state.mode, state.seed, 12, null, deckOptions());
    state.deck = out.cards.map((c) => c.stock.ticker);
    state.seed++;
    if (persist) save();
  }
  function swipe(kind) {
    if (!state.deck.length) return;
    const t = state.deck[0],
      snapshot = {
        swipes: state.swipes.map((x) => ({ ...x })),
        matches: JSON.parse(JSON.stringify(state.matches)),
        deck: state.deck.slice(),
        seed: state.seed,
      };
    const item = rankItem(t);
    const model = L.FEATURES.enc(item);
    state.swipes.push({
      ticker: t,
      action: kind,
      x: model,
      date: new Date().toISOString(),
      mode: state.mode,
    });
    if (kind !== 'pass')
      state.matches[t] = {
        ticker: t,
        status: 'mantener',
        priority: kind === 'super',
        addedAt: new Date().toISOString(),
        priceAtLike: stock(t).price,
        reason: cardReason(
          item,
          L.scoreItem(
            item,
            pfolio(),
            L.trainTaste(pfolio(), state.swipes),
            state.mode,
            state.seed,
            null,
            rankFeatures(),
          ),
        ),
      };
    state.deck.shift();
    const trained = L.trainTaste(pfolio(), state.swipes);
    const features = rankFeatures();
    state.deck.sort(
      (a, b) =>
        L.scoreItem(rankItem(b), pfolio(), trained, state.mode, state.seed, null, features).score -
        L.scoreItem(rankItem(a), pfolio(), trained, state.mode, state.seed, null, features).score,
    );
    lastUndo = { snapshot, kind, t };
    modal = null;
    if (state.deck.length < 2) refillDeck(false);
    commit(kind === 'pass' ? `${t} archivada por 60 días` : `${t} guardada en tu watchlist`);
  }
  function undo() {
    if (!lastUndo) {
      toast('Nada que deshacer', true);
      return;
    }
    state.swipes = lastUndo.snapshot.swipes;
    state.matches = lastUndo.snapshot.matches;
    state.deck = lastUndo.snapshot.deck;
    state.seed = lastUndo.snapshot.seed;
    lastUndo = null;
    commit('Última decisión deshecha');
  }
  function radar() {
    const p = pfolio(),
      all = universe().filter(
        (s) => Number.isFinite(s.price) && Number.isFinite(s.week) && Number.isFinite(s.month),
      );
    const key = radarPeriod === 'month' ? 'month' : 'week';
    const sorted = all.slice().sort((a, b) => (sortRadar === 'up' ? b[key] - a[key] : a[key] - b[key]));
    const sectorData = L.SECTORS.map((sector) => {
      const items = all.filter(
        (s) => s.sector === sector && s.ticker !== 'SPY' && s.ticker !== 'QQQ' && s.ticker !== 'VOO',
      );
      const mean = (field) =>
        items.length ? items.reduce((a, s) => a + (Number(s[field]) || 0), 0) / items.length : null;
      return {
        sector,
        count: items.length,
        week: mean('week'),
        month: mean('month'),
        threeMonth: mean('threeMonth'),
        year: mean('year'),
      };
    })
      .filter((s) => s.count)
      .sort((a, b) => (b.month || 0) - (a.month || 0));
    return `${unverifiedNotice()}${pageTitle('Radar del mercado', 'Qué se está moviendo, dónde está el capital y qué merece un análisis de verdad. Movimiento no es señal de compra.', 'RESEARCH · PANORAMA', action('go:discover', `Ver ruleta ${ic('arrow')}`, 'btn primary'))}<div class="grid uneven"><div class="panel"><div class="section-heading" style="margin:0 0 7px"><h2>Sectores: cómo van</h2><span class="pill ${state.demo ? 'demo' : 'muted'}">${state.demo ? 'Rendimientos simulados' : 'Muestra con cobertura parcial'}</span></div><p>Media simple de las empresas disponibles (no reproduce un ETF sectorial). Tocando un sector, exploras sus líderes.</p><div class="table-wrap"><table class="data-table"><thead><tr><th>Sector</th><th>Semana</th><th>Mes</th><th>3 meses</th><th>Año</th></tr></thead><tbody>${sectorData.map((r) => `<tr class="clickable" data-action="sector:${attr(r.sector)}"><td><strong>${esc(r.sector)}</strong><div class="company">${r.count} empresas</div></td><td>${change(r.week)}</td><td>${change(r.month)}</td><td>${change(r.threeMonth)}</td><td>${change(r.year)}</td></tr>`).join('') || '<tr><td colspan="5">Actualiza cotizaciones para construir el radar.</td></tr>'}</tbody></table></div></div><div class="panel glow"><div class="eyebrow">RUIDO O CAMBIO REAL</div><h2 style="font:normal 31px Georgia;margin:15px 0">Market moves<br>versus fundamentals</h2><p>Large price changes require investigation into earnings, guidance and business fundamentals. No movement is inherently an investment recommendation.</p><div class="divider"></div><div class="action-item"><div class="action-mark">${ic('check', 16)}</div><div><div class="action-title">Primero fuentes verificadas</div><div class="action-detail">SEC / relaciones con inversores, luego Reuters, AP, FT o Bloomberg. Sin prueba, causa desconocida.</div></div></div><div class="action-item"><div class="action-mark warn">${ic('alert', 16)}</div><div><div class="action-title">Después exposición</div><div class="action-detail">Si ya tienes la empresa o su capa está saturada, la misma noticia puede significar otra cosa.</div></div></div></div></div><div class="section-heading"><h2>Radar: qué sube y qué cae</h2><div class="segmented">${[
      ['week', 'Semana'],
      ['month', 'Mes'],
    ]
      .map(
        ([k, n]) =>
          `<button class="${radarPeriod === k ? 'active' : ''}" data-action="radarperiod:${k}">${n}</button>`,
      )
      .join('')}</div></div><div class="panel"><div class="sortrow"><div class="segmented">${[
      ['up', '▲ Suben'],
      ['down', '▼ Caen'],
    ]
      .map(
        ([k, n]) =>
          `<button class="${sortRadar === k ? 'active' : ''}" data-action="radarsort:${k}">${n}</button>`,
      )
      .join(
        '',
      )}</div><div class="hint">${all.length} tickers con datos · ${state.demo ? 'cifras inventadas para demostrar la interfaz' : 'cotizaciones públicas, sin atribución causal automática'}</div></div><div class="grid cols-2">${
      sorted
        .slice(0, 10)
        .map(
          (s, i) =>
            `<div class="match-card"><div class="info">${logo(s)}<div><div class="ticker">${esc(s.ticker)} <span class="muted tiny">#${i + 1}</span></div><div class="company">${ext(s.name)}</div><div class="tiny muted" style="margin-top:4px">${esc(s.sector)} · ${p.weights[s.ticker] ? 'En cartera' : state.matches[s.ticker] ? 'En watchlist' : 'Candidata'}</div></div></div><div style="text-align:right"><div style="font-size:18px;font-weight:850">${change(s[key])}</div><button class="text-link" style="background:none;border:0;margin-top:8px" data-action="stock:${attr(s.ticker)}">Investigar ${ic('arrow', 12)}</button></div></div>`,
        )
        .join('') ||
      `<div class="empty" style="grid-column:1/-1"><h3>No hay precios comparables</h3><p>Abre la aplicación con su servidor de datos y pulsa Actualizar. No se inventan variaciones reales.</p>${action('refresh', 'Intentar actualizar', 'btn primary')}</div>`
    }</div></div><div class="section-heading"><h2>Cola de investigación</h2><span class="pill muted">Elige antes de seguir</span></div><div class="panel"><p>Desde tu buscador puedes solicitar una ficha. La solicitud se guarda localmente para integrarla después con tu rutina de Research; por sí sola no lanza una tarea externa.</p>${
      Object.keys(state.requests || {}).length
        ? Object.entries(state.requests)
            .map(
              ([t, x]) =>
                `<div class="action-item"><div class="action-mark">${ic('search', 15)}</div><div><div class="action-title">${esc(t)} · ${esc(x.status || 'pendiente')}</div><div class="action-detail">Solicitada ${esc(dated(x.date))} · ${esc(x.reason || 'Pendiente de análisis N1')}</div></div></div>`,
            )
            .join('')
        : `<div class="hint">Aún no has pedido análisis adicionales.</div>`
    }</div>`;
  }
  function watchlist() {
    const p = pfolio(),
      arr = Object.keys(state.matches)
        .map((t) => ({ ticker: t, match: state.matches[t], s: stock(t) }))
        .sort((a, b) => new Date(b.match.addedAt) - new Date(a.match.addedAt));
    const ready = arr.filter((x) => x.s.price && L.researchScore(x.s, p).calificacion === 'Incorporar');
    return `${unverifiedNotice()}${pageTitle('Tu watchlist', 'Ideas que te interesaron. Ningún algoritmo añade, descarta ni compra por ti.', 'MATCHES · DECISIONES', action('go:discover', `${ic('discover')} Descubrir más`, 'btn primary'))}<div class="grid cols-3" style="margin-bottom:18px">${metricCard('Empresas guardadas', arr.length, 'Solo tus likes y super-likes', 'heart')}${metricCard('Favoritas prioritarias', arr.filter((x) => x.match.priority).length, 'Super-like: estudiar primero', 'star')}${metricCard('En zona calculada', ready.length, `${state.demo ? 'Resultado de muestra' : 'Falta validar fundamentals'}`, 'radar')}</div><div class="panel"><div class="sortrow"><h2>Siguiendo estas empresas</h2><span class="pill muted">${arr.length} activas</span></div><p>Una ficha puede estar en zona y aun así ser un mal negocio. La valoración y la tesis se analizan por separado.</p><div style="display:grid;gap:11px;margin-top:20px">${
      arr
        .map((x) => {
          const s = x.s,
            z = L.researchScore(s, p);
          const diff =
            Number.isFinite(s.price) && Number.isFinite(x.match.priceAtLike)
              ? (s.price / x.match.priceAtLike - 1) * 100
              : null;
          return `<div class="match-card"><div class="info">${logo(s)}<div><div class="ticker">${esc(s.ticker)} ${x.match.priority ? '<span class="pill blue">Super</span>' : ''}</div><div class="company">${ext(s.name)}</div><div class="tiny muted" style="margin-top:6px">${esc(L.LAYERS[s.layer]?.name || s.sector)} · ${esc(z.calificacion)} · desde tu like ${pct(diff)}</div></div></div><div class="actions"><button class="btn" data-action="stock:${attr(x.ticker)}">${ic('eye')} Ficha</button><button class="btn warn" data-action="unmatch:${attr(x.ticker)}" aria-label="Sacar de watchlist">${ic('close')}</button></div></div>`;
        })
        .join('') ||
      `<div class="empty"><div class="empty-icon">—</div><h3>Tu lista empieza con un swipe</h3><p>En Descubrir desliza a la derecha para guardar o hacia arriba para indicar que una empresa te interesa especialmente.</p>${action('go:discover', 'Empezar a explorar', 'btn primary')}</div>`
    }</div></div><div class="section-heading"><h2>Tu criterio importa más que el algoritmo</h2></div><div class="panel glow"><p>La watchlist es una lista de seguimiento, no una orden ni una cartera virtual. El score financiero depende de valoración, calidad, aporte a cartera, riesgo y catalizadores; la puntuación de afinidad solo determina qué idea merece tu atención.</p>${action('go:taste', 'Ver mi perfil de interés', 'btn ghost')}</div>`;
  }
  function plan() {
    const p = pfolio(),
      monthly = String(state.planMonth || L.todayLima().slice(0, 7)),
      budget = Number(state.budget) || 0;
    const scenarios = L.planScenarios(
      p,
      budget,
      state.matches,
      Object.fromEntries(universe().map((s) => [s.ticker, s])),
    );
    const guide = L.LAYERS;
    const notes = Object.entries(guide)
      .filter(([k, v]) => v.min !== null && v.kind === 'ia')
      .map(([k, v]) => ({ k, ...L.layerStatus(p, k) }))
      .sort((a, b) => b.gap - a.gap);
    return `${unverifiedNotice()}${pageTitle('Plan del mes', 'Tu intención frente a lo que realmente has comprado. No mezcles presupuesto, efectivo y órdenes.', 'ASIGNACIÓN · REGLAS', action('go:report', `${ic('printer')} Informe`, 'btn ghost'))}<div class="grid uneven"><div class="panel glow"><div class="eyebrow">PRESUPUESTO</div><div class="form-row" style="margin:16px 0"><div class="field"><label for="month-input">Mes</label><input id="month-input" class="input" type="month" value="${attr(monthly)}"></div><div class="field"><label for="budget-input">Presupuesto previsto (US$)</label><input id="budget-input" class="input" type="number" min="0" step="10" value="${budget}"></div><button class="btn primary" data-action="budget">${ic('refresh')} Calcular</button></div><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><div><div class="caps">PRESUPUESTO DESEADO</div><div class="budget-number">${fmt(budget)}</div></div><div style="text-align:right"><div class="caps">COMPRADO EN EL MES</div><div class="budget-number">—</div><div class="hint">No importaste historial de operaciones</div></div></div><div class="divider"></div><div class="hint">Las asignaciones ilustrativas asumen comisión US$1 por orden (no tarifa confirmada). Mínimos: US$40 existente y US$100 nueva. La selección requiere ficha verificable, zona y espacio en la capa.</div></div><div class="panel"><h2>Reglas del capital</h2><div class="action-item"><div class="action-mark">${ic('shield', 16)}</div><div><div class="action-title">Posición individual ≤25%</div><div class="action-detail">Umbral de vigilancia desde 20%. Nunca poner más dinero en un exceso.</div></div></div><div class="action-item"><div class="action-mark">${ic('pie', 16)}</div><div><div class="action-title">Capas y bloques primero</div><div class="action-detail">IA 75–85%; VOO 5–10%; defensivo 5–10%. No amplificar una capa ya por encima de su techo.</div></div></div><div class="action-item"><div class="action-mark warn">${ic('info', 16)}</div><div><div class="action-title">Precio ≠ valor</div><div class="action-detail">Si no hay datos para una valoración reproducible, se deja fuera de una propuesta real.</div></div></div></div></div><div class="section-heading"><h2>Escenarios del presupuesto</h2><span class="pill ${state.demo ? 'demo' : 'gold'}">${state.demo ? 'Simulación didáctica' : 'Requiere ficha N1'}</span></div><div class="grid cols-3">${scenarios.map((sc, i) => `<div class="plan-card ${sc.recommended ? 'recommended' : ''}"><div style="display:flex;justify-content:space-between;align-items:center"><span class="pill ${sc.recommended ? '' : 'muted'}">${sc.recommended ? '★ Primero a revisar' : 'Escenario ' + sc.id}</span><span class="score">${sc.score || '—'}</span></div><h3>${esc(sc.title)}</h3><p>${esc(sc.description)}</p><div class="divider"></div><div class="allocation"><strong>${sc.ticker ? esc(sc.ticker) : 'Efectivo'}</strong><span>${fmt(sc.amount)}</span></div><div class="allocation"><span>Comisión asumida</span><span>${fmt(sc.fee)}</span></div><p style="min-height:36px">${sc.ticker ? 'Antes de ejecutarlo: validar tesis, precio, zona y pesos con los datos de Yahoo Finance.' : 'Condición: no invertir hasta que exista una alternativa que cumpla mínimos, valoración y límites.'}</p><button class="btn ${sc.recommended ? 'primary' : 'ghost'}" data-action="saveplan:${sc.id}" style="width:100%">${state.savedPlan?.id === sc.id && state.savedPlan?.month === monthly ? '✓ Intención guardada' : 'Guardar intención'}</button></div>`).join('')}</div>${state.savedPlan ? `<div class="notice green" style="margin-top:19px">${ic('check')} <span>Intención guardada: escenario ${esc(state.savedPlan.id)} para ${esc(state.savedPlan.month)}. <b>Esto no es una compra ni una orden.</b></span></div>` : ''}<div class="section-heading"><h2>Brechas prioritarias</h2></div><div class="panel">${notes.map((s) => `<div class="layer-row"><div><div class="layer-name">${esc(L.LAYERS[s.k].name)}</div><div class="layer-detail">Objetivo ${L.LAYERS[s.k].min}–${L.LAYERS[s.k].max}%</div></div><div>${statusBadge(s.state)}</div><div class="layer-weight">${safeNum(s.w, 1)}%</div></div>`).join('')}<p>Los excedentes de una capa no se corrigen necesariamente vendiendo: primero se evalúan aportes a capas deficitarias. Las señales son de análisis, no instrucciones de operación.</p></div>`;
  }
  function riskAlerts() {
    const p = pfolio(),
      alerts = [];
    for (const x of p.top) {
      if (x.weight >= 25)
        alerts.push({
          type: 'concentracion',
          severity: 'red',
          title: `${x.ticker} supera el 25%`,
          desc: `Pesa ${safeNum(x.weight, 1)}% de la cartera. Revisar concentración y regla de salida.`,
          ticker: x.ticker,
        });
      else if (x.weight >= 20)
        alerts.push({
          type: 'concentracion',
          severity: 'warn',
          title: `${x.ticker} supera la alarma del 20%`,
          desc: `Pesa ${safeNum(x.weight, 1)}%; no ampliar sin revisar.`,
          ticker: x.ticker,
        });
    }
    for (const [k, v] of Object.entries(L.LAYERS)) {
      const st = L.layerStatus(p, k);
      if (st.state === 'exceso')
        alerts.push({
          type: 'capa',
          severity: 'warn',
          title: `${v.name} sobre su objetivo`,
          desc: `Peso ${safeNum(st.w, 1)}%, techo ${v.max}%.`,
          ticker: null,
        });
    }
    for (const t of Object.keys(state.matches)) {
      const s = stock(t),
        v = L.valuation(s);
      if (!v || !Number.isFinite(s.price) || s.price > v.high) continue;
      const key = 'zone:' + t;
      alerts.push({
        type: 'zona',
        severity: 'green',
        title: `${t} dentro de su zona estimada`,
        desc: `Precio ${fmt(s.price, 2)}; zona ${fmt(v.low, 2)}–${fmt(v.high, 2)} (${state.demo ? 'demo' : 'modelo'}). No significa que sea buena compra.`,
        ticker: t,
      });
    }
    return alerts;
  }
  function news() {
    return window.PMAccount.newsPage();
  }

  function more() {
    const items = [
      ['news', 'News & Event Intelligence', 'Earnings, policy, sector and geopolitical feeds'],
      ['radar', 'Market Radar', 'Cross-sector market movement'],
      ['search', 'Company Search', 'Issuer research and financial statements'],
      ['report', 'Weekly Reports', 'PDF generation, local-time email distribution'],
      ['transactions', 'Yahoo Finance Holdings', 'CSV imports, transactions, account snapshots'],
      ['settings', 'Settings', 'Language, time zone, account and delivery'],
    ];
    return `<div class="page-header"><div><div class="eyebrow">RESEARCH / ACCOUNT</div><h1>Tools & Settings</h1><p>Research functions, portfolio records and account controls.</p></div></div><div class="grid cols-2">${items.map((x) => `<button class="shortcut" data-action="go:${x[0]}"><strong>${esc(x[1])}</strong><span>${esc(x[2])}</span></button>`).join('')}</div>`;
  }

  function taste() {
    const p = pfolio();
    const model = L.trainTaste(p, state.swipes);
    const sectors = L.SECTORS.map((s) => ({
      sector: s,
      like: state.swipes.filter((x) => L.BY_TICKER[x.ticker]?.sector === s && x.action !== 'pass').length,
      pass: state.swipes.filter((x) => L.BY_TICKER[x.ticker]?.sector === s && x.action === 'pass').length,
    }))
      .filter((x) => x.like + x.pass)
      .sort((a, b) => b.like - a.like);
    const traits = [
      'Capitalización',
      'Crecimiento de ventas',
      'Margen operativo',
      'Margen de caja',
      'Rendimiento de beneficios',
      'Deuda',
      'Moméntum a 6 meses',
      'Moméntum a 12 meses',
      'Volatilidad',
      'Beta',
      'Distancia al máximo anual',
    ];
    const strong = model.w
      .slice(0, 11)
      .map((w, i) => ({ trait: traits[i], w, z: Math.abs(w) / Math.sqrt(model.variance[i]) }))
      .filter((x) => x.z > 1.5)
      .sort((a, b) => b.z - a.z);
    return `${pageTitle('Lo que aprende de ti', 'La ruleta aprende de tus swipes, pero distingue preferencias del perfil de tu cartera.', 'APRENDIZAJE PERSONAL', action('resetTaste', `${ic('refresh')} Reiniciar aprendizaje`, 'btn ghost'))}<div class="grid cols-3">${metricCard('Decisiones totales', state.swipes.length, 'Las 3 acciones tienen distinto peso', 'heart')}${metricCard('Guardadas', state.swipes.filter((x) => x.action !== 'pass').length, 'Like y super-like', 'star')}${metricCard('Descartadas', state.swipes.filter((x) => x.action === 'pass').length, 'Excluidas del mazo por 60 días', 'close')}</div><div class="grid uneven" style="margin-top:18px"><div class="panel"><h2>Preferencia por sectores</h2><p>Cuenta decisiones, no predice la rentabilidad futura.</p>${sectors.map((x) => `<div style="padding:14px 0;border-bottom:1px solid var(--line)"><div style="display:flex;justify-content:space-between;font-size:12px"><strong>${esc(x.sector)}</strong><span class="muted">${x.like} me gusta · ${x.pass} pasos</span></div><div class="track" style="margin-top:8px"><div class="fill" style="width:${(100 * x.like) / Math.max(1, x.like + x.pass)}%"></div></div></div>`).join('') || '<div class="empty" style="margin-top:18px">Aún no hay elecciones para aprender de tus gustos.</div>'}</div><div class="panel glow"><h2>Rasgos de tu estilo</h2><p>Solo declaramos una inclinación cuando su señal es suficientemente clara (|peso| / incertidumbre &gt; 1,5).</p>${strong.length ? strong.map((x) => `<div class="action-item"><div class="action-mark">${ic(x.w > 0 ? 'trend' : 'minus', 16)}</div><div><div class="action-title">${x.w > 0 ? 'Prefieres mayor' : 'Prefieres menor'} ${esc(x.trait.toLowerCase())}</div><div class="action-detail">Señal estadística ${safeNum(x.z, 1)} · basada en cartera y elecciones. No constituye calidad del negocio.</div></div></div>`).join('') : '<div class="empty" style="padding:24px;margin:16px 0"><h3>Aún no hay una preferencia clara</h3><p>La aplicación no inventa rasgos a partir de dos o tres deslizamientos.</p></div>'}<div class="divider"></div><p><b>Qué viene de tu cartera:</b> el peso por acción y el sector inician el modelo con un prior suave. <b>Qué viene de ti:</b> cada pase, like y super-like lo actualiza.</p></div></div>`;
  }
  function automations() {
    return report();
  }

  function search() {
    const q = searchQuery.trim().toLowerCase();
    const all = Object.values(L.BY_TICKER);
    let rows = q
      ? all
          .filter(
            (s) =>
              s.ticker.toLowerCase().includes(q) ||
              s.name.toLowerCase().includes(q) ||
              s.sector.toLowerCase().includes(q),
          )
          .slice(0, 35)
      : all.filter((s) =>
          ['NVDA', 'MSFT', 'VRT', 'LLY', 'V', 'MU', 'TSM', 'COST', 'JPM', 'ISRG', 'AVGO', 'ASML'].includes(
            s.ticker,
          ),
        );
    const custom = Object.values(state.customStocks || {}).filter(
      (s) =>
        q &&
        (s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)) &&
        !rows.some((r) => r.ticker === s.ticker),
    );
    rows = rows.concat(custom);
    return `${pageTitle('Buscar una empresa', 'Consulta una acción por nombre o ticker. Puedes pedir su investigación, guardarla o agregar tus posiciones.', 'UNIVERSO · BÚSQUEDA')}<div class="search-input">${ic('search')}<input id="search-box" autocomplete="off" placeholder="Ej. NVIDIA, VRT, salud, NVDA…" value="${attr(searchQuery)}" aria-label="Buscar empresas"><button class="text-link" style="background:transparent;border:0" data-action="secsearch">Buscar SEC</button></div><div class="sortrow" style="margin-top:18px"><span class="pill muted">${q ? rows.length + ' coincidencias locales' : 'Explora empresas destacadas'}</span><span class="hint">Universo base: ${L.CATALOG.length} instrumentos · búsqueda SEC requiere servidor</span></div><div class="search-results">${rows.map((s) => `<button class="search-result" data-action="stock:${attr(s.ticker)}"><div style="display:flex;align-items:center;gap:10px;min-width:0">${logo(s)}<div><div class="ticker">${esc(s.ticker)}</div><div class="sub">${ext(s.name)}</div><div class="sub">${esc(s.sector)}</div></div></div>${ic('chevron')}</button>`).join('') || '<div class="empty" style="grid-column:1/-1">Sin resultados locales. Prueba la búsqueda SEC si tienes servidor conectado.</div>'}</div>`;
  }
  function imports() {
    return `${pageTitle('Importar cartera', 'Sin contraseñas, sin API keys de broker y sin enviar operaciones. La información queda en el navegador.', 'DATOS · PRIVACIDAD')}<div class="grid uneven"><div class="panel glow"><h2>1. Tus posiciones de Yahoo Finance</h2><p>Pega un CSV con tickers, número de acciones y costo medio. Descárgalos de una cartera con tenencias en Yahoo Finance o escríbelos manualmente. El precio de compra no es el valor razonable.</p><div class="notice plain" style="margin:15px 0">${ic('shield')}<span>Importación local. No enviamos órdenes ni solicitamos credenciales de Yahoo Finance.</span></div><div class="field"><label for="csv-import">CSV Yahoo: Symbol,Quantity,Purchase Price (o ticker,shares,cost). Se agregan varias compras por ticker.</label><input type="file" id="pm-yahoo-file" class="input" accept=".csv,text/csv,text/plain" style="margin:9px 0"/><textarea id="csv-import" placeholder="ticker,shares,cost,price,prevclose&#10;MSFT,5,360,470,467&#10;NVDA,10,98,185,182" spellcheck="false" style="min-height:155px;font-family:monospace"></textarea></div><div style="display:flex;gap:9px;margin-top:15px;flex-wrap:wrap"><button class="btn primary" data-action="importCSV">${ic('check')} Importar posiciones</button><button class="btn ghost" data-action="demo">Usar cartera de prueba</button><button class="btn ghost" data-action="refresh">${ic('refresh')} Obtener cotizaciones</button></div></div><div class="panel"><h2>2. Tu respaldo</h2><p>Exporta tu watchlist, swipes, presupuesto y posiciones a JSON. También puedes restaurar un respaldo anterior.</p><div class="field" style="margin:15px 0"><label for="json-import">Selecciona un archivo JSON exportado por esta aplicación</label><input type="file" id="json-import" class="input" accept=".json,application/json"></div><div style="display:grid;gap:9px"><button class="btn" data-action="exportJSON">${ic('download')} Descargar respaldo</button><button class="btn" data-action="importJSON">${ic('upload')} Restaurar JSON</button></div><div class="divider"></div><h2>3. Estado de fuentes</h2><div class="metric-bar"><span>Posiciones Yahoo Finance</span><strong>${state.portfolioSource === 'yahoo-csv' ? 'CSV · ' + dated(state.lastPortfolioImport) : 'Pendientes de importar'}</strong></div><div class="metric-bar"><span>Yahoo Finance (cotizaciones)</span><strong>${state.lastLiveUpdate ? 'Última ' + dated(state.lastLiveUpdate) : 'Pendiente'}</strong></div><div class="metric-bar"><span>SEC / IR (fundamentales)</span><strong>${Object.values(state.research).filter((x) => x.verified).length} fichas</strong></div><div class="hint">Para obtener datos públicos sin exponer tu información personal, ejecuta el servidor incluido. La SEC exige configurar un User-Agent con correo de contacto.</div></div></div><div class="section-heading"><h2>Posiciones registradas</h2><span class="pill muted">${state.holdings.length} entradas</span></div><div class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Ticker</th><th>Acciones</th><th>Coste promedio</th><th>Estado</th><th></th></tr></thead><tbody>${state.holdings.map((h) => `<tr><td class="ticker">${esc(h.ticker)}</td><td>${round(h.shares, 4)}</td><td>${fmt(h.cost, 2)}</td><td>${state.demo ? '<span class="pill demo">Muestra</span>' : '<span class="pill muted">Importada</span>'}</td><td>${action('stock:' + h.ticker, `${ic('edit')} Editar`, 'btn ghost')}</td></tr>`).join('') || '<tr><td colspan="5">No hay posiciones registradas.</td></tr>'}</tbody></table></div></div>`;
  }
  function report() {
    const p = pfolio();
    return `<div class="page-header"><div><div class="eyebrow">REPORTS / DISTRIBUTION</div><h1>Weekly Reports</h1><p>Scheduled Sunday distribution and on-demand institutional portfolio reviews.</p></div></div>${window.PMAccount.reportPanel()}<section class="panel" style="margin-top:18px"><h2>Portfolio data availability</h2><div class="pm-report-grid"><div><span>Holdings</span><strong>${state.holdings.length}</strong></div><div><span>Quoted holdings</span><strong>${state.holdings.filter((h) => Number.isFinite(stock(h.ticker).price)).length}</strong></div><div><span>Recorded transactions</span><strong>${(state.transactions || []).length}</strong></div><div><span>Account snapshots</span><strong>${(state.snapshots || []).length}</strong></div></div><p class="hint">Market data, news and projections are sourced independently. The report omits unsupported return figures and marks missing earnings-calendar dates as unverified.</p></section>`;
  }

  function settings() {
    return window.PMAccount.settingsPanel();
  }

  function modalHTML() {
    if (modal?.type === 'confirm')
      return `<div class="modal-wrap" data-action="close" role="presentation"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title" style="max-width:440px"><div class="modal-head"><h2 id="confirm-title">${esc(modal.title)}</h2><button class="iconbtn" data-action="close">${ic('close')}</button></div><div class="modal-body"><p class="muted small">${esc(modal.text)}</p><div style="display:flex;gap:9px;justify-content:flex-end;margin-top:20px">${action('close', 'Cancelar', 'btn ghost')}${action('confirm:' + modal.kind, 'Confirmar', 'btn warn')}</div></div></div></div>`;
    if (modal?.type === 'importPreview') return importPreviewHTML();
    if (modal?.type !== 'stock') return '';
    const t = modal.ticker,
      s = stock(t),
      p = pfolio(),
      r = L.researchScore(s, p);
    return `<div class="modal-wrap pm-equity-overlay" id="modal-overlay" data-action="close" role="presentation"><div class="modal pm-equity-modal" role="dialog" aria-modal="true" aria-label="Equity factsheet for ${esc(s.name)}" tabindex="-1"><header class="pm-equity-modal-nav"><div><span class="pm-fsheet-eyebrow">COMPANY ANALYSIS</span><strong>${esc(t)} · ${esc(s.name)}</strong></div><div class="pm-equity-modal-actions"><button class="btn ghost" data-action="go:inbox">${ic('bell')} Research Inbox</button><button class="iconbtn" data-action="close" aria-label="Close factsheet">${ic('close')}</button></div></header><div class="pm-equity-modal-body">${window.PMEquity.render({ s, p, r, state, L, A, range: equityRange })}</div></div></div>`;
  }

  function closeModal() {
    modal = null;
    detailTab = 'overview';
    render();
    try {
      modalFocus?.focus?.();
    } catch (e) {}
    modalFocus = null;
  }
  function openStock(t) {
    t = t.toUpperCase();
    modalFocus = document.activeElement;
    modal = { type: 'stock', ticker: t };
    detailTab = 'overview';
    equityRange = '1Y';
    closeQuickSearch();
    render();
    setTimeout(() => $('.modal')?.focus(), 0);
    if (location.protocol !== 'file:' && !window.__PM_GUEST_PREVIEW__) {
      if (!state.research[t]) fetchResearch(t);
      if (!state.peers?.[t]) fetchManagerPeers(t);
      if ((stock(t).history?.length || 0) < 850) fetchManagerHistory(t);
    }
  }
  async function fetchResearch(t) {
    if (isGuest()) return;
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 12000);
      const response = await apiFetch('/api/stock/' + encodeURIComponent(t), { signal: ctrl.signal });
      clearTimeout(timeout);
      if (!response.ok) return;
      const payload = await response.json();
      if (payload?.ticker !== t) return;
      state.research[t] = payload;
      stocksCache = {};
      if (modal?.ticker === t) render();
    } catch (e) {
      /* UI retains source limitation; no false verified claim */
    }
  }
  function download(data, name, mime) {
    const u = URL.createObjectURL(new Blob([data], { type: mime })),
      a = document.createElement('a');
    a.href = u;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 3000);
  }
  async function refreshLive(silent = false) {
    if (isGuest()) {
      if (!silent) toast(GUEST_LIVE_MSG, true);
      return;
    }
    if (liveLoading || !state) return;
    if (location.protocol === 'file:') {
      toast(
        'Abre el proyecto mediante node server/server.mjs para activar datos públicos. El HTML individual funciona en demo.',
        true,
      );
      return;
    }
    liveLoading = true;
    if (!silent) toast('Consultando cotizaciones de Yahoo Finance…');
    try {
      // Every holding is requested (in batches); only the optional extras are capped.
      const held = [...new Set(state.holdings.map((h) => h.ticker))],
        extras = [
          ...new Set([...Object.keys(state.matches), 'SPY', ...L.CATALOG.slice(0, 28).map((x) => x.ticker)]),
        ]
          .filter((t) => !held.includes(t))
          .slice(0, Math.max(0, 50 - held.length)),
        wants = [...held, ...extras],
        chunks = [];
      for (let i = 0; i < wants.length; i += 12) chunks.push(wants.slice(i, i + 12));
      let count = 0;
      const fresh = new Set();
      state.lastRefresh = { at: new Date().toISOString(), fresh: [] };
      for (const batch of chunks) {
        const ctrl = new AbortController(),
          tm = setTimeout(() => ctrl.abort(), 12000);
        const res = await apiFetch('/api/quotes?t=' + encodeURIComponent(batch.join(',')), {
          signal: ctrl.signal,
        });
        clearTimeout(tm);
        if (!res.ok) continue;
        const data = await res.json();
        count += mergeQuotes(data.quotes, data.asOf, fresh);
      }
      state.lastRefresh = { at: new Date().toISOString(), fresh: [...fresh] };
      const stale = staleHoldings();
      if (count) {
        fetchManagerMarket();
        if (!state.demo) {
          for (const h of state.holdings.slice(0, 12))
            if ((state.quotes[h.ticker]?.history?.length || 0) < 850) fetchManagerHistory(h.ticker);
          for (const h of state.holdings.slice(0, 3))
            if (!state.peers?.[h.ticker]) fetchManagerPeers(h.ticker);
        }
        if (!silent)
          toast(
            stale.length
              ? tr(
                  `${count} Yahoo quotes received · ${stale.length} of ${state.holdings.length} holdings not updated`,
                  `${count} cotizaciones Yahoo recibidas · ${stale.length} de ${state.holdings.length} posiciones sin actualizar`,
                )
              : tr(
                  `${count} Yahoo quotes received · ${state.demo ? 'still in demo until you import your portfolio' : 'all holdings updated'}`,
                  `${count} cotizaciones Yahoo recibidas · ${state.demo ? 'sigues en demo hasta importar tu cartera' : 'todas las posiciones actualizadas'}`,
                ),
            stale.length > 0,
          );
        portfolioCache = null;
        stocksCache = {};
        render();
      } else if (!silent)
        toast(
          'No se obtuvieron cotizaciones. Yahoo puede limitar peticiones; se conservaron los datos anteriores.',
          true,
        );
    } catch (err) {
      if (!silent) toast('No se pudo contactar al servidor o la fuente de mercado.', true);
    } finally {
      liveLoading = false;
    }
  }
  async function loadNews() {
    if (isGuest()) return;
    if (newsLoading) return;
    if (location.protocol === 'file:') {
      toast('Para consultar fuentes públicas, inicia el servidor local.', true);
      return;
    }
    newsLoading = true;
    try {
      const list = [
        ...new Set([...state.holdings.map((x) => x.ticker), ...Object.keys(state.matches)]),
      ].slice(0, 14);
      const res = await apiFetch('/api/news?t=' + encodeURIComponent(list.join(',')));
      const payload = await res.json();
      if (!res.ok) throw Error(payload.error || 'No data');
      let ids = new Set(state.news.map((x) => x.id));
      for (const n of payload.news || []) {
        if (!ids.has(n.id)) state.news.push(n);
      }
      state.news = state.news.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)).slice(0, 100);
      toast(`${(payload.news || []).length} titulares consultados. Verifica cada hecho en su fuente.`);
      render();
    } catch (e) {
      toast('La fuente RSS no está disponible o no hay titulares de medios reconocidos.', true);
    } finally {
      newsLoading = false;
    }
  }
  async function secSearch() {
    if (isGuest()) return;
    if (!searchQuery.trim() || location.protocol === 'file:') {
      toast('Escribe un ticker y abre mediante servidor local para consultar SEC.', true);
      return;
    }
    try {
      const res = await apiFetch('/api/search?q=' + encodeURIComponent(searchQuery.trim()));
      const body = await res.json();
      if (!res.ok) throw Error('Error SEC');
      state.customStocks = state.customStocks || {};
      for (const x of body.results || []) {
        if (!L.BY_TICKER[x.ticker])
          state.customStocks[x.ticker] = {
            ticker: x.ticker,
            name: x.name,
            sector: 'Sin clasificar',
            layer: 'diversificacion',
            track: 'diversificacion',
            provenance: 'SEC listada',
          };
      }
      save();
      toast(`${(body.results || []).length} coincidencias SEC`);
      render();
    } catch (e) {
      toast('La búsqueda SEC no está disponible; revisa SEC_USER_AGENT.', true);
    }
  }
  // Step 1: parse and show a preview. Nothing is replaced until the user confirms.
  function importCSV() {
    const raw = $('#csv-import')?.value || '',
      result = L.parseCSV(raw, { language: window.PMAccount?.user?.language || 'en' });
    if (!result.rows.length) {
      toast(
        result.errors.length
          ? result.errors.slice(0, 2).join('. ')
          : tr(
              'No positions with valid quantities and costs were found.',
              'No se encontraron posiciones con cantidades y costes válidos.',
            ),
        true,
      );
      return;
    }
    modalFocus = document.activeElement;
    csvDraft = raw;
    modal = { type: 'importPreview', result };
    render();
  }
  function importPreviewHTML() {
    const r = modal.result,
      blocked = r.errors.length > 0,
      sep = { comma: tr('comma (1,5)', 'coma (1,5)'), dot: tr('dot (1.5)', 'punto (1.5)') }[r.decimal];
    const list = (items, cls) =>
      items.length
        ? `<ul class="${cls}">${items
            .slice(0, 12)
            .map((x) => `<li>${esc(x)}</li>`)
            .join('')}${items.length > 12 ? `<li>+${items.length - 12}</li>` : ''}</ul>`
        : '';
    return `<div class="modal-wrap" data-action="close" role="presentation"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="import-preview-title" style="max-width:640px"><div class="modal-head"><h2 id="import-preview-title">${tr('Review import', 'Revisar importación')}</h2><button class="iconbtn" data-action="close" aria-label="Close">${ic('close')}</button></div><div class="modal-body"><p class="muted small">${tr(`${r.rows.length} positions from ${r.lots} lots · decimal separator: ${sep || 'not needed'} · confirming replaces your current ${state.holdings.length} holdings.`, `${r.rows.length} posiciones de ${r.lots} lotes · separador decimal: ${sep || 'no necesario'} · al confirmar se sustituyen tus ${state.holdings.length} posiciones actuales.`)}</p><div class="table-wrap"><table class="data-table"><thead><tr><th>Ticker</th><th>${tr('Quantity', 'Cantidad')}</th><th>${tr('Avg. cost', 'Coste medio')}</th><th>${tr('Cost basis', 'Coste total')}</th><th>${tr('Lots', 'Lotes')}</th><th>${tr('Notes', 'Notas')}</th></tr></thead><tbody>${r.rows
      .map(
        (x) =>
          `<tr><td class="ticker">${esc(x.ticker)}</td><td class="mono">${esc(String(x.shares))}</td><td>${fmt(x.cost, 2)}</td><td>${fmt(x.totalCost, 2)}</td><td>${x.lots}</td><td class="small">${[x.commission ? tr('incl. commission ', 'incl. comisión ') + fmt(x.commission, 2) : '', x.sourceCurrency ? `${esc(x.sourceCurrency)} → USD @ ${esc(String(x.fxRate))}` : ''].filter(Boolean).join(' · ') || '—'}</td></tr>`,
      )
      .join(
        '',
      )}</tbody><tfoot><tr><th colspan="3">${tr('Total cost basis (USD)', 'Coste total (USD)')}</th><th>${fmt(r.totalCost, 2)}</th><th colspan="2"></th></tr></tfoot></table></div>${r.warnings.length ? `<div class="inline-warn"><b>${tr('Warnings', 'Avisos')}</b>${list(r.warnings, 'pm-import-warnings')}</div>` : ''}${blocked ? `<div class="inline-warn" role="alert"><b>${tr(`${r.errors.length} rows rejected — fix the file and import again. Nothing has been replaced.`, `${r.errors.length} filas rechazadas: corrige el archivo e impórtalo de nuevo. No se ha sustituido nada.`)}</b>${list(r.errors, 'pm-import-errors')}</div>` : ''}<div style="display:flex;gap:9px;justify-content:flex-end;margin-top:20px">${action('close', tr('Cancel', 'Cancelar'), 'btn ghost')}<button class="btn primary" data-action="importConfirm" ${blocked ? 'disabled aria-disabled="true"' : ''}>${tr('Confirm and replace holdings', 'Confirmar y sustituir posiciones')}</button></div></div></div></div>`;
  }
  // Step 2: the user confirmed the preview.
  function applyImport(result) {
    if (!result?.rows?.length || result.errors.length) return;
    modal = null;
    csvDraft = '';
    state.holdings = result.rows.map(({ ticker, shares, cost }) => ({ ticker, shares, cost }));
    state.demo = false;
    state.portfolioSource = 'yahoo-csv';
    state.lastPortfolioImport = new Date().toISOString();
    state.dataSource = 'manual';
    state.quotes = {};
    state.lastLiveUpdate = null;
    state.baseHoldings = state.holdings.map((x) => ({ ...x }));
    state.transactions = [];
    state.ledgerStats = { realized: 0, dividends: 0, issues: [] };
    let imported = 0;
    for (const x of result.rows) {
      if (x.price > 0) {
        state.quotes[x.ticker] = {
          ticker: x.ticker,
          price: x.price,
          prevClose: x.prevClose || null,
          day: x.prevClose > 0 ? (x.price / x.prevClose - 1) * 100 : null,
          asOf: new Date().toISOString(),
          source: 'CSV proporcionado por usuario',
          history: [],
        };
        imported++;
      }
    }
    if (imported) {
      state.dataSource = 'imported';
    }
    lastUndo = null;
    commit(
      tr(
        `Yahoo Finance: ${result.rows.length} positions imported (${result.aggregated || 0} lots combined). CSV prices are unverified.`,
        `Yahoo Finance: ${result.rows.length} posiciones importadas (${result.aggregated || 0} lotes agrupados). Precios del CSV no verificados.`,
      ),
    );
    if (location.protocol !== 'file:' && !isGuest()) refreshLive();
  }
  function exportJSON() {
    download(
      JSON.stringify({ exportedAt: new Date().toISOString(), app: 'Portafolio Manager', ...state }, null, 2),
      'portafolio-manager-backup-' + L.todayLima() + '.json',
      'application/json',
    );
    toast('Respaldo creado en tu dispositivo');
  }
  async function importJSON() {
    const file = $('#json-import')?.files?.[0];
    if (!file) {
      toast('Selecciona un archivo JSON.', true);
      return;
    }
    try {
      const json = JSON.parse(await file.text());
      if (
        json.version !== 4 ||
        !Array.isArray(json.holdings) ||
        typeof json.matches !== 'object' ||
        !Array.isArray(json.swipes)
      )
        throw Error('Formato no compatible');
      const next = { ...L.defaultState(), ...json };
      delete next.exportedAt;
      delete next.app;
      state = next;
      lastUndo = null;
      commit('Backup restored to this account');
    } catch (e) {
      toast('Respaldo inválido; no se sobrescribieron tus datos.', true);
    }
  }
  function resetDemo() {
    // The restored sample stays flagged demo (labels, sample VIX, P/E "DEMO") even in a signed-in account.
    state = { ...L.defaultState(), demo: true, dataSource: 'demo', portfolioSource: 'demo' };
    state.onboardingSeen = true;
    lastUndo = null;
    commit('Sample portfolio restored. All sample figures are illustrative.');
    view = 'home';
    render();
  }
  function confirmAction(kind) {
    if (kind === 'deleteData') {
      state = L.defaultState();
      state.holdings = [];
      state.demo = false;
      state.quotes = {};
      state.research = {};
      state.matches = {};
      state.swipes = [];
      state.deck = [];
      state.savedPlan = null;
      state.requests = {};
      lastUndo = null;
      modal = null;
      commit('Account portfolio data cleared from this application; Yahoo Finance is unchanged');
    } else if (kind === 'resetTaste') {
      state.swipes = [];
      state.deck = [];
      state.seed = 12;
      lastUndo = null;
      modal = null;
      commit('Aprendizaje reiniciado; tus guardados permanecen');
    } else if (kind.startsWith('unmatch-')) {
      const t = kind.slice(8);
      delete state.matches[t];
      state.swipes = state.swipes.filter((x) => x.ticker !== t);
      state.deck = [];
      lastUndo = null;
      modal = null;
      commit(t + ' retirada de tu watchlist');
    } else if (kind.startsWith('removeHolding-')) {
      const t = kind.slice(14);
      state.holdings = state.holdings.filter((x) => x.ticker !== t);
      state.demo = false;
      lastUndo = null;
      modal = null;
      commit('Posición eliminada solo de la app');
    } else closeModal();
  }
  function handleAction(str) {
    if (!str) return;
    const [actionName, ...rest] = str.split(':'),
      id = rest.join(':');
    switch (actionName) {
      case 'range':
        managerRange = id;
        render();
        return;
      case 'market':
        if (isGuest()) {
          toast(GUEST_LIVE_MSG, true);
          return;
        }
        fetchManagerMarket();
        toast('Consultando VIX…');
        return;
      case 'history':
        fetchManagerHistory(id);
        return;
      case 'peers':
        fetchManagerPeers(id);
        return;
      case 'aiReport':
        requestInstitutionalReport(id);
        return;
      case 'institutionalGenerate':
        requestInstitutionalReport(id);
        return;
      case 'equityRange': {
        const pos = $('.pm-equity-modal')?.scrollTop || 0;
        equityRange = id;
        render();
        const modalNode = $('.pm-equity-modal');
        if (modalNode) modalNode.scrollTop = pos;
        return;
      }
      case 'quickSearch':
        openQuickSearch();
        return;
      case 'quickClose':
        closeQuickSearch();
        return;
      case 'inboxRefresh':
        loadInstitutionalJobs(false);
        return;
      case 'openInstitutional':
        openInstitutionalReport(id);
        return;
      case 'backInbox':
        view = 'inbox';
        render();
        return;
      case 'importTrades':
        saveTradesFromCSV();
        return;
      case 'manualTrade':
        saveManualTrade();
        return;
      case 'importSnapshots':
        saveSnapshots();
        return;
      case 'deleteTrade':
        deleteTrade(id);
        return;
      case 'saveLDD': {
        const fields = [...app.querySelectorAll('[data-ldd-flag]')];
        state.lddSignals = state.lddSignals || {};
        state.lddSignals[id] = Object.fromEntries(fields.map((x) => [x.dataset.lddFlag, x.checked]));
        commit('Señales manuales registradas; no son puntos calculados por la app.');
        return;
      }
      case 'go':
        closeQuickSearch();
        view = id;
        modal = null;
        cardFlipped = false;
        detailTab = 'overview';
        window.scrollTo(0, 0);
        render();
        if (id === 'news' && !window.PMAccount.news) window.PMAccount.reloadNews();
        if (id === 'report') window.PMAccount.loadReportStatus();
        if (id === 'inbox') loadInstitutionalJobs(false);
        return;
      case 'stock':
        openStock(id);
        return;
      case 'flip':
        cardFlipped = !cardFlipped;
        render();
        return;
      case 'swipe':
        if (!cardFlipped) swipe(id);
        return;
      case 'undo':
        undo();
        return;
      case 'resetDeck':
        state.deck = [];
        state.seed++;
        refillDeck();
        render();
        return;
      case 'mode':
        state.mode = id;
        state.deck = [];
        lastUndo = null;
        cardFlipped = false;
        refillDeck();
        commit('Modo de descubrimiento: ' + id);
        return;
      case 'radarperiod':
        radarPeriod = id;
        render();
        return;
      case 'radarsort':
        sortRadar = id;
        render();
        return;
      case 'sector':
        view = 'search';
        searchQuery = id;
        render();
        return;
      case 'detailtab':
        detailTab = id;
        render();
        return;
      case 'match': {
        const t = id;
        if (!state.matches[t]) {
          state.matches[t] = {
            ticker: t,
            status: 'mantener',
            priority: false,
            addedAt: new Date().toISOString(),
            priceAtLike: stock(t).price,
            reason: 'Guardada manualmente desde ficha',
          };
          lastUndo = null;
          commit(t + ' guardada; no se ha comprado');
        } else toast('La empresa ya está en tu watchlist');
        return;
      }
      case 'unmatch':
        modal = {
          type: 'confirm',
          title: 'Sacar ' + id + ' de tu watchlist',
          text: 'Solo se quitará de tus guardados locales. Esto no vende nada ni cambia Yahoo Finance.',
          kind: 'unmatch-' + id,
        };
        render();
        return;
      case 'request':
        state.requests = state.requests || {};
        state.requests[id] = {
          date: new Date().toISOString(),
          status: 'pendiente',
          reason: 'Solicitada manualmente',
        };
        commit('Solicitud local anotada: ' + id + '. No se ha ejecutado un agente externo.');
        return;
      case 'similar': {
        const s = rankItem(id);
        state.mode = 'similar';
        state.deck = L.generateDeck(
          pfolio(),
          state.swipes,
          state.matches,
          'similar',
          state.seed,
          12,
          s,
          deckOptions(),
        ).cards.map((x) => x.stock.ticker);
        state.seed++;
        lastUndo = null;
        modal = null;
        view = 'discover';
        commit('Buscando perfiles parecidos a ' + id);
        return;
      }
      case 'saveplan': {
        const scenario = L.planScenarios(
          pfolio(),
          state.budget,
          state.matches,
          Object.fromEntries(universe().map((s) => [s.ticker, s])),
        ).find((x) => x.id === id);
        if (!scenario) {
          toast('Escenario ya no disponible', true);
          return;
        }
        state.savedPlan = {
          ...scenario,
          month: state.planMonth,
          savedAt: new Date().toISOString(),
          executed: false,
        };
        commit('Intención guardada. No se envió ninguna orden.');
        return;
      }
      case 'budget': {
        let b = Number($('#budget-input')?.value),
          mo = $('#month-input')?.value || L.todayLima().slice(0, 7);
        if (!Number.isFinite(b) || b < 0) {
          toast('Presupuesto no válido', true);
          return;
        }
        state.budget = round(b, 2);
        state.planMonth = mo;
        state.savedPlan = null;
        commit('Presupuesto actualizado y propuestas recalculadas');
        return;
      }
      case 'saveHolding': {
        const sh = Number($('#edit-shares')?.value),
          cost = Number($('#edit-cost')?.value);
        if (!(sh > 0) || !Number.isFinite(cost) || cost < 0) {
          toast('Revisa acciones y costo medio', true);
          return;
        }
        state.holdings = state.holdings.filter((h) => h.ticker !== id);
        state.holdings.push({ ticker: id, shares: sh, cost });
        lastUndo = null;
        commit(id + ' guardada en esta aplicación. No hay operación en Yahoo Finance.');
        return;
      }
      case 'removeHolding':
        modal = {
          type: 'confirm',
          title: 'Quitar ' + id,
          text: 'Quitarás la posición del seguimiento local; no venderás acciones en tu broker.',
          kind: 'removeHolding-' + id,
        };
        render();
        return;
      case 'dismissNews':
        state.dismissedNews.push(id);
        commit('Titular ocultado');
        return;
      case 'close':
        closeModal();
        return;
      case 'confirm':
        confirmAction(id);
        return;
      case 'refresh':
        if (isGuest()) {
          toast(GUEST_LIVE_MSG, true);
          return;
        }
        refreshLive();
        return;
      case 'reloadPage':
        location.reload();
        return;
      case 'research':
        fetchResearch(id);
        toast('Consultando información oficial…');
        return;
      case 'loadNews':
        loadNews();
        return;
      case 'secsearch':
        secSearch();
        return;
      case 'importCSV':
        importCSV();
        return;
      case 'importConfirm':
        if (modal?.type === 'importPreview') applyImport(modal.result);
        return;
      case 'exportJSON':
        exportJSON();
        return;
      case 'importJSON':
        importJSON();
        return;
      case 'demo':
        modal = {
          type: 'confirm',
          title: 'Restaurar demostración',
          text: 'Se reemplazará la cartera actual, watchlist, decisiones y planes por datos de prueba. Exporta tu JSON antes si quieres conservarlos.',
          kind: 'demo',
        };
        render();
        return;
      case 'resetTaste':
        modal = {
          type: 'confirm',
          title: 'Reiniciar lo aprendido',
          text: 'Se eliminará tu historial de swipes, pero no los tickers que hayas guardado.',
          kind: 'resetTaste',
        };
        render();
        return;
      case 'deleteData':
        modal = {
          type: 'confirm',
          title: 'Borrar todo el seguimiento',
          text: 'Eliminarás posiciones, preferencias, decisiones y planes locales. Esto no toca tu cuenta de Yahoo Finance. Descarga un respaldo antes si lo deseas.',
          kind: 'deleteData',
        };
        render();
        return;
      case 'print':
        window.print();
        return;
      case 'takeover':
        claim();
        owns = true;
        render();
        return;
      default:
        return;
    }
  }

  // Global stock search. SEC results augment the built-in universe only if the authenticated
  // backend is available; a ticker without company fundamentals remains unverified.
  const quickRemoteStocks = new Map();
  function unreadResearchCount() {
    return institutionalJobs.filter((x) => x.status === 'completed' && !x.read).length;
  }
  function quickLocalResults(query) {
    const q = String(query || '')
      .trim()
      .toLowerCase();
    if (!q)
      return [
        ...L.CATALOG.filter((s) => ['NVDA', 'MSFT', 'GOOGL', 'MU', 'TSM', 'AVGO'].includes(s.ticker)),
      ].slice(0, 6);
    let candidates = [
      ...L.CATALOG,
      ...Object.values(state?.customStocks || {}),
      ...quickRemoteStocks.values(),
    ];
    const seen = new Set();
    return candidates
      .filter((s) => {
        if (!s.ticker || seen.has(s.ticker)) return false;
        seen.add(s.ticker);
        return [s.ticker, s.name, s.sector].some((v) =>
          String(v || '')
            .toLowerCase()
            .includes(q),
        );
      })
      .slice(0, 9);
  }
  function quickListHTML(query, extra = []) {
    const local = quickLocalResults(query),
      items = [...local];
    for (const entry of extra) {
      if (!items.some((x) => x.ticker === entry.ticker) && items.length < 14) items.push(entry);
    }
    const ticker = String(query || '')
        .toUpperCase()
        .trim(),
      canOpen = /^[A-Z0-9.\-]{1,12}$/.test(ticker) && !items.some((x) => x.ticker === ticker);
    return `<div class="pm-search-results-title">${query ? 'MATCHING COMPANIES' : 'POPULAR STOCKS'}</div>${items.map((x) => `<button class="pm-search-result-row" data-action="stock:${attr(x.ticker)}"><span class="pm-search-result-ticker">${esc(x.ticker)}</span><span><b>${esc(x.name || x.ticker)}</b><small>${esc(sectorEnglish(x.sector || 'Sin clasificar'))}</small></span>${ic('chevron', 14)}</button>`).join('')}${canOpen ? `<button class="pm-search-result-row pm-search-direct" data-action="stock:${attr(ticker)}"><span class="pm-search-result-ticker">${esc(ticker)}</span><span><b>Open ${esc(ticker)} factsheet</b><small>Request quote and SEC data when available</small></span>${ic('arrow', 14)}</button>` : ''}${!items.length && !canOpen ? '<p class="pm-search-no-results">No matches. Search an exchange-listed ticker or try a company name.</p>' : ''}`;
  }
  function updateQuickResults(query, kind) {
    const overlay = kind === 'overlay',
      node = $(overlay ? '#pm-overlay-results' : '#pm-top-results');
    if (!node) return;
    node.innerHTML = quickListHTML(query);
    if (!overlay) node.hidden = false;
    const version = ++quickSearchVersion;
    clearTimeout(quickSearchTimer);
    if (
      location.protocol === 'file:' ||
      window.__PM_GUEST_PREVIEW__ ||
      !String(query).trim() ||
      String(query).trim().length < 2
    )
      return;
    quickSearchTimer = setTimeout(async () => {
      try {
        const response = await apiFetch('/api/search?q=' + encodeURIComponent(query.trim()), {
          credentials: 'same-origin',
        });
        if (!response.ok) return;
        const data = await response.json();
        if (version !== quickSearchVersion || !node.isConnected) return;
        const remote = (data.results || [])
          .filter((x) => /^[A-Z0-9.\-]{1,12}$/.test(x.ticker) && x.name)
          .slice(0, 12);
        for (const x of remote)
          quickRemoteStocks.set(x.ticker, {
            ...x,
            sector: 'Sin clasificar',
            layer: 'diversificacion',
            track: 'diversificacion',
          });
        node.innerHTML = quickListHTML(query, remote);
      } catch {}
    }, 280);
  }
  function closeQuickSearch() {
    const overlay = $('#pm-search-overlay');
    if (overlay) overlay.hidden = true;
    const dropdown = $('#pm-top-results');
    if (dropdown) dropdown.hidden = true;
  }
  function openQuickSearch() {
    const overlay = $('#pm-search-overlay');
    if (!overlay) return;
    overlay.hidden = false;
    const input = $('#pm-overlay-search');
    if (input) {
      input.value = '';
      updateQuickResults('', 'overlay');
      requestAnimationFrame(() => input.focus());
    }
  }
  function renderResearchJob(job) {
    const status =
      job.status === 'completed'
        ? 'Ready'
        : job.status === 'running' || job.status === 'queued'
          ? 'Generating'
          : job.status === 'failed'
            ? 'Failed'
            : 'Unknown';
    const date = job.createdAt
      ? new Date(job.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
      : '';
    const title =
      job.status === 'completed'
        ? 'Your institutional report was generated.'
        : job.status === 'failed'
          ? 'Institutional research could not be completed.'
          : 'Institutional report is being generated.';
    return `<article class="pm-inbox-item ${job.read ? 'read' : 'unread'}"><div class="pm-inbox-item-top"><span class="pm-inbox-status ${attr(job.status)}">${esc(status)}</span><time>${esc(date)}</time></div><h3>${esc(job.ticker)} · ${title}</h3><p>${job.status === 'completed' ? 'A completed, source-linked institutional report is available for review.' : job.status === 'failed' ? esc(job.error || 'No report produced. Please retry.') : 'The research service is gathering SEC documents and public sources. Completion is not guaranteed.'}</p>${job.status === 'completed' ? `<button class="btn primary" data-action="openInstitutional:${attr(job.id)}">Open completed report ${ic('arrow', 15)}</button>` : job.status === 'failed' ? `<button class="btn ghost" data-action="institutionalGenerate:${attr(job.ticker)}">Retry generation</button>` : '<span class="pm-inbox-wait">Processing in the server</span>'}</article>`;
  }
  function inboxPage() {
    const jobs = institutionalJobs;
    return `<div class="pm-inbox-page"><div class="page-header"><div><div class="eyebrow">RESEARCH / NOTIFICATIONS</div><h1>Research Inbox</h1><p>Institutional research requests, completion notices and reports.</p></div><div class="header-tools"><button class="btn ghost" data-action="inboxRefresh">${ic('refresh')} Refresh</button></div></div><div class="pm-inbox-stats"><div><span>Reports</span><b>${jobs.length}</b></div><div><span>Ready to review</span><b>${jobs.filter((x) => x.status === 'completed').length}</b></div><div><span>In progress</span><b>${jobs.filter((x) => ['queued', 'running'].includes(x.status)).length}</b></div></div>${window.__PM_GUEST_PREVIEW__ || location.protocol === 'file:' ? '<div class="notice">Inbox notifications require the authenticated server. Guest Preview does not generate or pretend to deliver research.</div>' : ''}<div class="pm-inbox-feed">${jobs.length ? jobs.map(renderResearchJob).join('') : '<div class="pm-inbox-empty"><h3>No institutional reports yet</h3><p>Open a company factsheet and select Generate Institutional Report. Completed research will appear here.</p><button class="btn primary" data-action="quickSearch">Search companies</button></div>'}</div></div>`;
  }
  function institutionalReportPage() {
    const job = selectedInstitutionalJob;
    if (!job || job.status !== 'completed' || !job.text)
      return `<div class="panel"><h2>Report unavailable</h2><p>Choose a completed report from your Research Inbox.</p><button class="btn primary" data-action="backInbox">Back to Inbox</button></div>`;
    return `<div class="pm-institutional-page"><button class="btn ghost" data-action="backInbox">${ic('arrow', 15)} Back to Research Inbox</button><div class="pm-institutional-report-header"><div class="eyebrow">INSTITUTIONAL EQUITY RESEARCH · COMPLETED</div><h1>${esc(job.ticker)} · Institutional Research</h1><p>Generated ${esc(job.generatedAt || job.finishedAt || '')} · ${esc(job.provider || 'Research provider')} · ${esc(job.model || '')}</p></div><div class="pm-institutional-disclaimer">Generated analysis is not a brokerage execution instruction. Verify all numbers and sources before investment decisions.</div><article class="pm-ai-report pm-institutional-report-body" data-no-i18n>${markdownSafe(job.text)}</article></div>`;
  }
  async function loadInstitutionalJobs(silent = true) {
    if (location.protocol === 'file:' || window.__PM_GUEST_PREVIEW__ || !window.PMAccount?.user) return;
    try {
      const res = await apiFetch('/api/institutional/jobs', { credentials: 'same-origin' });
      if (!res.ok) return;
      const data = await res.json();
      const old = new Map(institutionalJobs.map((j) => [j.id, j.status]));
      institutionalJobs = data.jobs || [];
      const justFinished = jobSnapshotSeen
        ? institutionalJobs.find(
            (j) => j.status === 'completed' && old.has(j.id) && old.get(j.id) !== 'completed',
          )
        : null;
      jobSnapshotSeen = true;
      if (justFinished) toast('Your institutional report was generated. Open Research Inbox.');
      if (!silent || justFinished || view === 'inbox') render();
      else {
        const badge = $('[data-inbox-count]');
        if (badge) badge.textContent = unreadResearchCount() || '';
      }
    } catch (e) {
      if (!silent) toast('Research Inbox is not reachable.', true);
    }
  }
  async function requestInstitutionalReport(t) {
    if (!/^[A-Z0-9.\-]{1,12}$/.test(t)) return;
    if (location.protocol === 'file:' || window.__PM_GUEST_PREVIEW__) {
      toast(
        'Institutional reports require the authenticated server with OPENAI_API_KEY configured. No report was generated.',
        true,
      );
      return;
    }
    if (advancedLoading.has('job:' + t)) {
      toast('An institutional report has already been requested for ' + t + '.');
      return;
    }
    advancedLoading.add('job:' + t);
    try {
      const response = await apiFetch('/api/institutional/jobs', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: t }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Research request failed.');
      toast(`${t} institutional report requested. Track its status in Research Inbox.`);
      await loadInstitutionalJobs(true);
    } catch (e) {
      toast('Report was not submitted: ' + e.message, true);
    } finally {
      advancedLoading.delete('job:' + t);
    }
  }
  async function openInstitutionalReport(id) {
    if (location.protocol === 'file:' || window.__PM_GUEST_PREVIEW__) return;
    try {
      const response = await apiFetch('/api/institutional/jobs/' + encodeURIComponent(id), {
        credentials: 'same-origin',
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'completed' || !data.text)
        throw Error(data.error || 'Report not ready.');
      selectedInstitutionalJob = data;
      view = 'institutional';
      modal = null;
      closeQuickSearch();
      window.scrollTo(0, 0);
      render();
      await apiFetch('/api/institutional/jobs/' + encodeURIComponent(id), {
        method: 'PATCH',
        credentials: 'same-origin',
      });
      const job = institutionalJobs.find((x) => x.id === id);
      if (job) job.read = true;
      render();
    } catch (e) {
      toast('Report unavailable: ' + e.message, true);
    }
  }
  function render() {
    if (!state) return;
    if (!owns) {
      app.innerHTML = `<div class="empty" style="max-width:420px;margin:16vh auto"><h3>Portafolio Manager is open in another tab</h3><p>To prevent concurrent edits, this tab is read-only until you take control.</p><button class="btn primary" data-action="takeover">Take control</button></div>`;
      return;
    }
    const page =
      {
        home,
        transactions: transactionPage,
        discover: renderDiscover,
        radar,
        watchlist,
        plan,
        news,
        more,
        taste,
        automations,
        search,
        import: imports,
        report,
        settings,
        inbox: inboxPage,
        institutional: institutionalReportPage,
      }[view] || home;
    app.innerHTML = shell(page());
    const csvBox = $('#csv-import');
    if (csvBox && csvDraft && !csvBox.value) csvBox.value = csvDraft;
    window.PMI18n?.apply(app, window.PMAccount?.user?.language || 'en');
    document.title = (viewMap[view] || 'Portafolio Manager') + ' · Portafolio Manager';
    bindGestures();
    if (view === 'home' && !modal) bindManagerChart();
    if (modal?.type === 'stock') window.PMEquity.bindChart(stock(modal.ticker), equityRange, state.demo);
  }
  let cardFlipped = false;
  function bindGestures() {
    if (view !== 'discover' || modal || cardFlipped) return;
    const card = $('#swipe-card');
    if (!card) return;
    let start = null,
      dx = 0,
      dy = 0,
      didDrag = false;
    card.addEventListener('pointerdown', (ev) => {
      if (ev.target.closest('button,a,input')) return;
      start = { x: ev.clientX, y: ev.clientY, time: Date.now(), pointerId: ev.pointerId };
      dx = dy = 0;
      didDrag = false;
      card.setPointerCapture?.(ev.pointerId);
    });
    card.addEventListener('pointermove', (ev) => {
      if (!start) return;
      dx = ev.clientX - start.x;
      dy = ev.clientY - start.y;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) didDrag = true;
      if (Math.abs(dx) > 8 || dy < -12) {
        card.classList.add('dragging');
        card.style.transform = `translate(${dx}px,${Math.min(dy, 70)}px) rotate(${dx * 0.035}deg)`;
        let stamp = dx >= 0 ? $('#stamp-like') : $('#stamp-pass');
        if (stamp) stamp.style.opacity = String(Math.min(0.9, Math.abs(dx) / 120));
      }
    });
    card.addEventListener('pointerup', (ev) => {
      if (!start) return;
      const elapsed = Math.max(1, Date.now() - start.time),
        h = card.offsetHeight,
        w = card.offsetWidth;
      const choice =
        dx > w * 0.3 || dx / elapsed > 0.85
          ? 'like'
          : dx < -w * 0.3 || dx / elapsed < -0.85
            ? 'pass'
            : dy < -h * 0.25
              ? 'super'
              : null;
      start = null;
      card.classList.remove('dragging');
      card.style.transform = '';
      if (choice) swipe(choice);
      else if (!didDrag) {
        openStock(state.deck[0]);
      }
    });
    card.addEventListener('pointercancel', () => {
      start = null;
      card.style.transform = '';
      card.classList.remove('dragging');
    });
  }
  app.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-action]');
    if (!el) return;
    if (el.id === 'modal-overlay' && el !== ev.target) return;
    if (el.tagName === 'A') return;
    ev.preventDefault();
    if (el.dataset.action === 'confirm:demo') {
      modal = null;
      resetDemo();
      return;
    }
    handleAction(el.dataset.action);
  });
  app.addEventListener('change', async (ev) => {
    if (ev.target?.id !== 'pm-yahoo-file') return;
    const file = ev.target.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) {
      toast('El archivo supera 2 MB. Exporta solo tus posiciones.', true);
      return;
    }
    try {
      const raw = await file.text();
      const preview = L.parseCSV(raw);
      const box = $('#csv-import');
      if (box) box.value = raw;
      if (preview.errors.length) {
        toast(preview.errors[0], true);
        return;
      }
      toast(
        `${preview.rows.length} posiciones reconocidas (${preview.aggregated || 0} lotes agrupados). Pulsa Importar posiciones para confirmar.`,
      );
    } catch {
      toast('No se pudo leer el archivo CSV en tu dispositivo.', true);
    }
  });
  app.addEventListener('input', (ev) => {
    if (['pm-top-search', 'pm-overlay-search'].includes(ev.target?.id)) {
      updateQuickResults(ev.target.value, ev.target.id === 'pm-overlay-search' ? 'overlay' : 'top');
      return;
    }
    if (ev.target?.id !== 'search-box') return;
    const at = ev.target.selectionStart;
    searchQuery = ev.target.value;
    render();
    const next = $('#search-box');
    next?.focus();
    next?.setSelectionRange(at, at);
  });
  window.addEventListener('keydown', (ev) => {
    if (modal && ev.key === 'Tab') {
      const items = [
        ...document.querySelectorAll(
          '.modal button:not([disabled]),.modal input:not([disabled]),.modal a[href],.modal select,.modal textarea',
        ),
      ].filter((x) => x.offsetParent !== null);
      if (items.length) {
        const first = items[0],
          last = items[items.length - 1];
        if (ev.shiftKey && document.activeElement === first) {
          ev.preventDefault();
          last.focus();
        } else if (!ev.shiftKey && document.activeElement === last) {
          ev.preventDefault();
          first.focus();
        }
      }
      return;
    }
    if (ev.key === 'Escape') {
      if (
        document.getElementById('pm-search-overlay') &&
        !document.getElementById('pm-search-overlay').hidden
      ) {
        closeQuickSearch();
        return;
      }
      if (modal) {
        closeModal();
        return;
      }
      if (cardFlipped) {
        cardFlipped = false;
        render();
        return;
      }
    }
    if (
      (ev.key === '/' || ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k')) &&
      !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
    ) {
      ev.preventDefault();
      openQuickSearch();
      return;
    }
    if (
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) ||
      modal ||
      view !== 'discover'
    )
      return;
    const f = { ArrowLeft: 'pass', ArrowRight: 'like', ArrowUp: 'super' };
    if (f[ev.key]) {
      ev.preventDefault();
      swipe(f[ev.key]);
    } else if (ev.key === ' ') {
      ev.preventDefault();
      cardFlipped = !cardFlipped;
      render();
    } else if (ev.key.toLowerCase() === 'z') {
      ev.preventDefault();
      undo();
    }
  });
  // Server sessions isolate user state; cross-tab local ownership lock is disabled.

  window.addEventListener('pageshow', (ev) => {
    if (ev.persisted && window.PMAccount.user) render();
  });
  // Authentication is mandatory for a real account. The standalone HTML intentionally
  // cannot persist private holdings or pretend to validate passwords.
  async function startAccount(user) {
    // Never let the previous account's timers, pending save or portfolio leak into this one.
    teardownAccount();
    const guest = isGuest();
    let loaded = null;
    if (guest) {
      try {
        loaded = JSON.parse(localStorage.getItem(GUEST_KEY) || 'null');
      } catch {}
    } else {
      try {
        const r = await apiFetch('/api/account/state', { credentials: 'same-origin' });
        if (r.ok) {
          const data = await r.json();
          // Never adopt state that belongs to someone other than the signed-in user.
          if (user?.id && data.accountId && data.accountId !== user.id) return accountMismatch();
          loaded = data.state;
          account = { id: data.accountId ?? user?.id ?? null, revision: data.revision ?? null };
        } else saveBlocked = 'load-failed';
      } catch {
        saveBlocked = 'load-failed';
      }
    }
    state =
      loaded && loaded.version === 4
        ? { ...L.defaultState(), ...loaded }
        : guest
          ? { ...L.defaultState(), onboardingSeen: true, portfolioSource: 'demo' }
          : {
              ...L.defaultState(),
              demo: false,
              holdings: [],
              matches: {},
              swipes: [],
              deck: [],
              quotes: {},
              research: {},
              news: [],
              dataSource: 'not-imported',
              portfolioSource: 'yahoo-csv',
              createdAt: new Date().toISOString(),
            };
    state.requests = state.requests || {};
    state.customStocks = state.customStocks || {};
    state.transactions = state.transactions || [];
    state.snapshots = state.snapshots || [];
    state.peers = state.peers || {};
    state.aiReports = state.aiReports || {};
    state.lddSignals = state.lddSignals || {};
    owns = true;
    portfolioCache = null;
    stocksCache = {};
    view = 'home';
    window.PMAccount.onSettingsChange = () => {
      render();
    };
    render();
    window.PMRisk?.onAccountReady?.();
    window.PMAccount.loadReportStatus();
    window.PMAccount.onAccountMismatch = () => {
      teardownAccount();
      saveBlocked = 'mismatch';
      if (app) app.innerHTML = '';
    };
    window.PMAccount.onBeforeLogout = async () => {
      await flushSave();
      teardownAccount();
    };
    // The guest preview has no server: no job polling, no live refresh.
    if (guest) return;
    loadInstitutionalJobs(true);
    if (!jobRefreshTimer)
      jobRefreshTimer = setInterval(() => {
        if (window.PMAccount.user && state && document.visibilityState === 'visible')
          loadInstitutionalJobs(true);
      }, 9000);
    if (!state.demo && state.holdings.length) refreshLive(true);
    if (!window.pmRefreshId)
      window.pmRefreshId = setInterval(() => {
        if (
          window.PMAccount.user &&
          state &&
          document.visibilityState === 'visible' &&
          !state.demo &&
          state.holdings.length
        )
          refreshLive(true);
      }, 300000);
  }
  window.PMAccount.onAuthenticated = startAccount;
  window.addEventListener('pm-news-updated', () => {
    if (view === 'news' && window.PMAccount.user) render();
  });
  window.addEventListener('pm-report-updated', () => {
    if (view === 'report' && window.PMAccount.user) render();
  });
  window.addEventListener('pm-risk-updated', () => {
    if (view === 'settings' && window.PMAccount.user) render();
  });

  window.PMBridge = {
    getState: () => (state ? persistedState() : null),
    importSnapshotRows(rows) {
      if (!state || !Array.isArray(rows) || !rows.length) return false;
      const grouped = new Map();
      for (const r of rows) {
        const ticker = String(r.ticker || '').trim().toUpperCase();
        const shares = Number(r.shares);
        const hasCost =
          r.cost !== null &&
          r.cost !== undefined &&
          r.cost !== '' &&
          Number.isFinite(Number(r.cost)) &&
          Number(r.cost) >= 0;
        if (!/^[A-Z0-9.\-]{1,12}$/.test(ticker) || !(shares > 0)) continue;
        const prev = grouped.get(ticker) || { ticker, shares: 0, totalCost: 0, costKnown: true };
        prev.shares += shares;
        if (hasCost && prev.costKnown) prev.totalCost += shares * Number(r.cost);
        else prev.costKnown = false;
        grouped.set(ticker, prev);
      }
      const nextHoldings = [...grouped.values()].map((x) => ({
        ticker: x.ticker,
        shares: round(x.shares, 8),
        cost: x.costKnown && x.shares > 0 ? round(x.totalCost / x.shares, 8) : null,
      }));
      if (!nextHoldings.length) return false;
      state.holdings = nextHoldings;
      state.demo = false;
      state.portfolioSource = 'vision-adr';
      state.lastPortfolioImport = new Date().toISOString();
      state.dataSource = 'imported';
      state.quotes = {};
      state.lastLiveUpdate = null;
      state.baseHoldings = nextHoldings.map((x) => ({ ...x }));
      state.transactions = [];
      state.ledgerStats = { realized: 0, dividends: 0, issues: [] };
      commit(`Portafolio cargado con Vision ADR (${nextHoldings.length} posiciones). Actualizando precios…`);
      if (location.protocol !== 'file:' && !isGuest()) refreshLive();
      return true;
    },
    appendTrades(trades) {
      if (!state || !Array.isArray(trades) || !trades.length) return false;
      const previous = {
        holdings: state.holdings,
        baseHoldings: state.baseHoldings,
        transactions: state.transactions,
        ledgerStats: state.ledgerStats,
        demo: state.demo,
      };
      if (state.demo) {
        state.holdings = [];
        state.baseHoldings = [];
        state.transactions = [];
        state.demo = false;
      } else if (!state.baseHoldings) {
        state.baseHoldings = (state.holdings || []).map((h) => ({ ...h }));
        state.transactions = [];
      }
      const items = trades.map((t, idx) => ({
        id: 'adr-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).slice(2, 6),
        date: t.date || L.todayLima(),
        type: t.type === 'sell' ? 'sell' : 'buy',
        ticker: String(t.ticker || '').trim().toUpperCase(),
        shares: Number(t.shares),
        price: Number(t.price),
        amount: round(Number(t.shares) * Number(t.price), 2),
        fee: Number(t.fee) || 0,
        source: 'Vision ADR',
      }));
      state.transactions = [...(state.transactions || []), ...items];
      if (!applyReconciliation()) {
        Object.assign(state, previous);
        toast('Error: intentas vender más acciones de las registradas en cartera.', true);
        return false;
      }
      commit(`${items.length} operación(es) registrada(s) con Vision ADR.`);
      if (location.protocol !== 'file:' && !isGuest()) refreshLive();
      return true;
    },
  };

  (async () => {
    const user = await window.PMAccount.init();
    if (user) await startAccount(user);
    else window.PMAccount.showAuth();
  })();
})();
