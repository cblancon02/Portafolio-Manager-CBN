/* Authenticated account, professional news and weekly reporting UI. */
(function () {
  'use strict';
  const e = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  // External links (news, earnings calendar, SEC filings) only become an href through
  // Logic.safeUrl; anything else is rendered as plain text. News feeds may use http.
  const link = (url, label, allowHttp = false) => {
    const safe = window.Logic?.safeUrl?.(url, { allowHttp });
    return safe
      ? `<a href="${e(safe)}" target="_blank" rel="noopener noreferrer">${e(label)}</a>`
      : `<span>${e(label)}</span>`;
  };
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
  const commonZones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Bogota',
    'America/Lima',
    'America/Mexico_City',
    'America/Sao_Paulo',
    'America/Toronto',
    'Europe/London',
    'Europe/Madrid',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Singapore',
    'Australia/Sydney',
  ];
  const dict = {
    en: {
      register: 'Create account',
      login: 'Sign in',
      email: 'Email address',
      password: 'Password',
      language: 'Preferred language',
      zone: 'Time zone',
      submit: 'Create account',
      hasAccount: 'Already have an account?',
      needAccount: 'New to Portafolio Manager?',
      requirements: 'Minimum 12 characters. Your password is not stored in plain text.',
      intro: 'Private portfolio analytics, institutional equity research and weekly intelligence.',
      warning:
        'Accounts and scheduled reports require the Node server. The standalone HTML cannot provide secure authentication.',
    },
    es: {
      register: 'Crear cuenta',
      login: 'Iniciar sesión',
      email: 'Correo electrónico',
      password: 'Contraseña',
      language: 'Idioma preferido',
      zone: 'Zona horaria',
      submit: 'Crear cuenta',
      hasAccount: '¿Ya tienes una cuenta?',
      needAccount: '¿Necesitas registrarte?',
      requirements: 'Mínimo 12 caracteres. La contraseña no se guarda en texto plano.',
      intro: 'Análisis de cartera privado, research financiero e inteligencia semanal.',
      warning:
        'Las cuentas y los informes requieren el servidor. El HTML independiente no ofrece autenticación segura.',
    },
  };
  const api = async (url, options = {}) => {
    const response = await accountFetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(data.error || `HTTP ${response.status}`);
    return data;
  };
  const P = {
    user: null,
    mode: 'register',
    news: null,
    newsFilter: 'All',
    newsLoading: false,
    reportStatus: null,
    earningsDetails: null,
    earningsTicker: null,
    earningsLoading: false,
    onAuthenticated: null,
    onBeforeLogout: null,
    onAccountMismatch: null,
    mismatchHandled: false,
    onSettingsChange: null,
    hasServer: location.protocol !== 'file:',
    prefs: { language: 'en', timezone: tz },
  };
  // The one wrapper for server requests. Once signed in, every request names the account this
  // tab believes it holds (X-PM-Account). If the server says the session now belongs to another
  // account (409 account_mismatch), the app tears down its state and the page reloads.
  async function accountFetch(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (P.user?.id) headers['X-PM-Account'] = P.user.id;
    const response = await fetch(url, { credentials: 'same-origin', ...options, headers });
    if (response.status === 409) {
      const data = await response
        .clone()
        .json()
        .catch(() => ({}));
      if (data.error === 'account_mismatch') P.accountMismatch();
    }
    return response;
  }
  P.accountFetch = accountFetch;
  P.accountMismatch = () => {
    if (P.mismatchHandled) return;
    P.mismatchHandled = true;
    try {
      P.onAccountMismatch?.();
    } catch {}
    // Reload once. If the server still disagrees right after a reload, stop and ask the user to
    // sign in again rather than looping.
    let recent = false;
    try {
      recent = Date.now() - Number(sessionStorage.getItem('pm-account-mismatch') || 0) < 15000;
      sessionStorage.setItem('pm-account-mismatch', String(Date.now()));
    } catch {}
    if (!recent) {
      location.reload();
      return;
    }
    P.user = null;
    P.mode = 'login';
    P.showAuth();
    const err = document.querySelector('#pm-auth-error');
    if (err) {
      err.hidden = false;
      err.textContent =
        P.prefs.language === 'es'
          ? 'Tu sesión cambió de cuenta. Inicia sesión de nuevo.'
          : 'Your session changed to a different account. Please sign in again.';
    }
  };
  P.getLanguage = () => P.user?.language || P.prefs.language || 'en';
  P.init = async () => {
    if (!P.hasServer) return null;
    try {
      const health = await api('/api/health');
      if (health.auth !== 'required') throw Error('Secure server unavailable');
    } catch {
      P.hasServer = false;
      return null;
    }
    try {
      const r = await api('/api/auth/me');
      P.user = r.user;
      return r.user;
    } catch {
      return null;
    }
  };
  P.showAuth = () => {
    const lang = P.prefs.language,
      d = dict[lang] || dict.en;
    document.documentElement.lang = lang;
    const app = document.querySelector('#app');
    if (!app) return;
    app.innerHTML = `<main class="pm-auth-page"><div class="pm-auth-shell"><div class="pm-auth-brand"><span class="pm-logo-square"><svg class="pm-brand-symbol" aria-hidden="true" viewBox="0 0 48 48" fill="none"><path d="M9 34V26h7v8M20.5 34V20h7v14M32 34V13h7v21" fill="#5ECBA5" fill-opacity=".68"/><path d="M8 20.5l11-7 8 3.2L39 7" stroke="#E2FFF2" stroke-width="2.65" stroke-linecap="round" stroke-linejoin="round"/><circle cx="39" cy="7" r="2.35" fill="#E2FFF2"/><path d="M8 36h32" stroke="#93DEC0" stroke-width="1.5" stroke-linecap="round" opacity=".42"/></svg></span><div><strong class="pm-auth-wordmark">Portafolio Manager</strong><small>PRIVATE INVESTMENT INTELLIGENCE</small></div></div><section class="pm-auth-card"><div class="pm-auth-heading"><div class="eyebrow">SECURE ACCESS</div><h1>${e(P.mode === 'register' ? d.register : d.login)}</h1><p>${e(d.intro)}</p></div>${
      P.hasServer
        ? `<form id="pm-auth-form" autocomplete="on"><label>${e(d.email)}<input class="input" type="email" name="email" autocomplete="email" maxlength="240" placeholder="you@example.com" required></label><label>${e(d.password)}<input class="input" type="password" name="password" minlength="12" autocomplete="${P.mode === 'register' ? 'new-password' : 'current-password'}" required></label>${
            P.mode === 'register'
              ? `<p class="pm-form-help">${e(d.requirements)}</p><div class="pm-auth-grid"><label>${e(d.language)}<select class="input" name="language"><option value="en" ${lang === 'en' ? 'selected' : ''}>English</option><option value="es" ${lang === 'es' ? 'selected' : ''}>Español</option></select></label><label>${e(d.zone)}<input class="input" name="timezone" value="${e(P.prefs.timezone)}" list="pm-timezones" required><datalist id="pm-timezones">${[
                  tz,
                  ...commonZones,
                ]
                  .filter((x, i, a) => a.indexOf(x) === i)
                  .map((x) => `<option value="${e(x)}"></option>`)
                  .join('')}</datalist></label></div>`
              : ''
          }<p class="pm-auth-error" id="pm-auth-error" role="alert" hidden></p><button class="btn primary pm-auth-submit" type="submit">${e(P.mode === 'register' ? d.register : d.login)}</button></form><p class="pm-auth-switch">${e(P.mode === 'register' ? d.hasAccount : d.needAccount)} <button type="button" data-pm="switch-auth">${e(P.mode === 'register' ? d.login : d.register)}</button></p>`
        : `<p class="pm-auth-error" style="display:block">${e(d.warning)}</p><div class="pm-auth-help">To use this application, download the full project, run <code>npm start</code> and open <code>http://localhost:8787</code>. No client-side password mock-up is used.</div>`
    }</section><footer class="pm-auth-footer">Portafolio Manager · Authenticated access · Market data supplied separately from portfolio records</footer></div></main>`;
  };
  P.logout = async () => {
    // Let the app flush its pending save and stop its timers before the session ends.
    try {
      await P.onBeforeLogout?.();
    } catch {}
    try {
      await api('/api/auth/logout', { method: 'POST', body: '{}' });
    } catch {}
    P.user = null;
    P.news = null;
    P.reportStatus = null;
    P.mode = 'login';
    location.reload();
  };
  P.saveSettings = async () => {
    const language = document.querySelector('#pm-settings-language')?.value || 'en',
      timezone = document.querySelector('#pm-settings-timezone')?.value || tz,
      weeklyEnabled = !!document.querySelector('#pm-settings-weekly')?.checked;
    try {
      const data = await api('/api/account/settings', {
        method: 'PATCH',
        body: JSON.stringify({ language, timezone, weeklyEnabled }),
      });
      P.user = data.user;
      P.prefs.language = data.user.language;
      P.prefs.timezone = data.user.timezone;
      P.reportStatus = null;
      P.onSettingsChange?.();
    } catch (error) {
      alert(error.message);
    }
  };
  P.reportPanel = () =>
    `<section class="panel pm-weekly-panel"><div class="section-heading"><div><div class="eyebrow">REPORT DELIVERY</div><h2>Weekly Portfolio Intelligence</h2></div><span class="pill muted">Sunday 09:00</span></div><p>A detailed PDF with portfolio attribution, concentration, sector allocations, market risk, issuer and policy developments, earnings coverage and watchlist research priorities. Email contains a short executive debrief and the full PDF as an attachment.</p><div class="pm-report-grid"><div><span>Recipient</span><strong>${e(P.user?.email || '—')}</strong></div><div><span>Local schedule</span><strong>Sunday 09:00 · ${e(P.user?.timezone || tz)}</strong></div><div><span>Email verification</span><strong>${P.user?.emailVerified ? 'Verified' : 'Action required'}</strong></div><div><span>Delivery provider</span><strong>${P.reportStatus?.emailConfigured ? 'Configured' : 'Not configured'}</strong></div><div><span>Last scheduled delivery</span><strong>${e(P.user?.lastReportDate || 'No report sent')}</strong></div></div><div class="pm-actions"><button class="btn primary" type="button" data-pm="download-weekly">Download current PDF</button><button class="btn ghost" type="button" data-pm="send-weekly">Send a test email</button><button class="btn ghost" type="button" data-action="go:settings">Delivery settings</button>${!P.user?.emailVerified ? '<button class="btn ghost" type="button" data-pm="verify-email">Request email verification</button>' : ''}</div><p class="hint">Automated delivery requires a verified email, the configured server to remain running, and an active mail provider. Source data can be unavailable; the report identifies coverage gaps rather than filling them with estimates.</p></section>`;
  P.settingsPanel = () =>
    `<div class="pm-account-settings"><div class="page-header"><div><div class="eyebrow">ACCOUNT / CONFIGURATION</div><h1>Settings</h1><p>Account preferences, weekly research delivery and data controls.</p></div></div><div class="grid cols-2"><section class="panel"><h2>Profile and localization</h2><div class="pm-setting-fields"><label>Signed-in email<input class="input" type="email" value="${e(P.user?.email || '')}" disabled></label><label>Language<select id="pm-settings-language" class="input"><option value="en" ${P.user?.language === 'en' ? 'selected' : ''}>English</option><option value="es" ${P.user?.language === 'es' ? 'selected' : ''}>Español</option></select></label><label>Time zone (IANA)<input id="pm-settings-timezone" class="input" list="pm-settings-zones" value="${e(P.user?.timezone || tz)}"><datalist id="pm-settings-zones">${commonZones.map((x) => `<option value="${e(x)}"></option>`).join('')}</datalist></label><label class="pm-setting-check"><input type="checkbox" id="pm-settings-weekly" ${P.user?.weeklyEnabled ? 'checked' : ''}><span>Enable weekly email with attached PDF, Sundays at 09:00 local time</span></label><button class="btn primary" data-pm="save-settings">Save settings</button></div></section><section class="panel"><h2>Access and data</h2><p>Portfolio records are stored separately for each signed-in account on this server. Passwords are protected by a salted password derivation function. Email verification is required for scheduled delivery. Deploy behind HTTPS; configure monitored backups and account recovery before public hosting.</p><p class="hint">Email verification: <b>${P.user?.emailVerified ? 'Verified' : 'Pending'}</b>. ${P.user?.emailVerified ? 'Weekly email delivery is eligible.' : 'Select Request email verification in the report section below. The mail service must be configured.'}</p><p class="hint">Your Yahoo Finance export provides quantities and cost basis. Public market feeds provide price history. These are distinct and neither sends trading instructions.</p><button class="btn ghost" data-pm="logout">Sign out</button></section></div><div style="margin-top:18px">${P.reportPanel()}${window.PMRisk?.settingsCard?.() || ''}</div></div>`;
  P.reloadNews = async () => {
    if (P.newsLoading || !P.user) return;
    P.newsLoading = true;
    try {
      P.news = await api('/api/intelligence');
    } catch (error) {
      P.news = {
        items: [],
        earnings: [],
        calendar: [],
        status: error.message,
        coverage: { tickers: [], sectors: [], domicile: [] },
      };
    } finally {
      P.newsLoading = false;
      window.dispatchEvent(new Event('pm-news-updated'));
    }
  };
  P.loadEarnings = async (t) => {
    if (P.earningsLoading || !/^[A-Z0-9.\-]{1,12}$/.test(t)) return;
    P.earningsLoading = true;
    P.earningsTicker = t;
    P.earningsDetails = null;
    window.dispatchEvent(new Event('pm-news-updated'));
    try {
      P.earningsDetails = await api('/api/stock/' + encodeURIComponent(t));
    } catch (error) {
      P.earningsDetails = { ticker: t, error: error.message, facts: [], filings: [] };
    } finally {
      P.earningsLoading = false;
      window.dispatchEvent(new Event('pm-news-updated'));
    }
  };
  P.loadReportStatus = async () => {
    if (!P.user) return;
    try {
      P.reportStatus = await api('/api/reports/status');
    } catch {}
    window.dispatchEvent(new Event('pm-report-updated'));
  };
  P.newsPage = () => {
    const data = P.news || {
        items: [],
        earnings: [],
        calendar: [],
        status: 'News not loaded',
        coverage: { tickers: [], sectors: [], domicile: [] },
      },
      all = data.items || [];
    const filters = [
      'All',
      'Company',
      'Earnings',
      'Monetary policy',
      'Geopolitics',
      'Policy & regulation',
      'Industry disruption',
      'Sector',
      'Domicile',
    ];
    const filtered = all
      .filter(
        (x) =>
          P.newsFilter === 'All' ||
          (P.newsFilter === 'Company' && x.ticker) ||
          (P.newsFilter === 'Earnings' && x.earnings) ||
          (P.newsFilter === 'Sector' && x.category === 'Sector') ||
          (P.newsFilter === 'Domicile' && x.category === 'Domicile') ||
          x.category === P.newsFilter,
      )
      .slice(0, 65);
    return `<div class="page-header pm-news-head"><div><div class="eyebrow">PORTFOLIO / EVENT MONITORING</div><h1>News & Event Intelligence</h1><p>Issuer developments, earnings, monetary policy, geopolitical exposure, regulation and sector disruption.</p></div><div class="header-tools"><button class="btn primary" data-pm="reload-news">${P.newsLoading ? 'Refreshing…' : 'Refresh coverage'}</button></div></div><div class="pm-news-kpis"><div><span>Recent articles</span><strong>${all.length}</strong></div><div><span>Tracked issuers</span><strong>${data.coverage?.tickers?.length || 0}</strong></div><div><span>Earnings references</span><strong>${(data.earnings || []).length}</strong></div><div><span>Sector themes</span><strong>${(data.coverage?.sectors || []).length}</strong></div></div><div class="notice plain"><span><b>Source status:</b> ${e(data.status || 'Not loaded')}. Content is a screened headline feed; publication does not confirm causation or materiality. No company results or earnings dates are fabricated.</span></div><div class="pm-news-layout"><section class="panel pm-news-main"><div class="pm-news-filters">${filters.map((f) => `<button class="pm-filter ${P.newsFilter === f ? 'active' : ''}" data-pm="filter-news" data-filter="${e(f)}">${e(f)}</button>`).join('')}</div><div class="pm-news-list">${filtered.length ? filtered.map((x) => `<article class="pm-news-item"><div class="pm-news-meta"><span>${e(x.ticker || x.theme || x.category)}</span><span>${e(x.category)}</span><span data-no-i18n>${e(x.source)}</span><time>${e(x.publishedAt?.slice(0, 10) || '')}</time></div><h3 data-no-i18n>${link(x.url, x.title, true)}</h3>${x.coverage === 'headline-only' ? '<p>Headline screening · Verify with issuer, regulator or first-party disclosure before adjusting any thesis.</p>' : `<p data-no-i18n>${e(x.evidence || '')}</p>`}</article>`).join('') : `<div class="empty"><h3>No qualifying articles</h3><p>Refresh coverage once the server can reach the public news feed. No unsupported headlines will be shown.</p></div>`}</div></section><aside class="pm-news-aside"><section class="panel"><h2>Earnings calendar</h2><p>Issuer events are linked for verification. Unverified event dates are deliberately left blank.</p><div class="pm-earnings-list">${
      (data.calendar || [])
        .slice(0, 16)
        .map(
          (x) =>
            `<div><strong>${e(x.ticker)}</strong><span>${e(x.status)}</span>${link(x.url, 'Verify date')}<button class="pm-inline-link" type="button" data-pm="earnings-sec" data-ticker="${e(x.ticker)}">Latest SEC results</button></div>`,
        )
        .join('') || '<p>No companies in your portfolio.</p>'
    }</div></section>${
      P.earningsTicker
        ? `<section class="panel"><h2>${e(P.earningsTicker)} · Reported financials</h2>${
            P.earningsLoading
              ? '<p>Retrieving public filings…</p>'
              : P.earningsDetails?.error
                ? `<p class="hint">${e(P.earningsDetails.error)}</p>`
                : `<p class="hint">SEC XBRL filings · ${e(P.earningsDetails?.period || 'Period unverified')}. TTM data and official forms, not an earnings-call transcript.</p><div class="pm-filing-list">${
                    (P.earningsDetails?.facts || [])
                      .slice(0, 8)
                      .map(
                        (f) =>
                          `<div><span>${e({ 'Ingresos TTM': 'Revenue (TTM)', 'Beneficio neto TTM': 'Net income (TTM)', 'Beneficio operativo TTM': 'Operating income (TTM)', 'Efectivo de operaciones TTM': 'Operating cash flow (TTM)', 'Capex TTM': 'Capital expenditure (TTM)', 'Beneficio diluido por acción TTM': 'Diluted EPS (TTM)', Patrimonio: 'Shareholders equity', 'Deuda largo plazo': 'Long-term debt' }[f.label] || f.label)}</span><strong>${e(f.display || 'Unavailable')}</strong><small>${e(f.period || '')}</small></div>`,
                      )
                      .join('') || '<p>No verified financial metrics available. Configure SEC_USER_AGENT.</p>'
                  }</div><div class="pm-filing-links">${(P.earningsDetails?.filings || [])
                    .slice(0, 4)
                    .map((f) => link(f.url, `${f.form} · ${f.filed}`))
                    .join('')}</div>`
          }</section>`
        : ''
    }<section class="panel"><h2>Coverage model</h2><p><b>Issuers:</b> ${e((data.coverage?.tickers || []).join(', ') || 'No holdings imported')}</p><p><b>Sectors:</b> ${e((data.coverage?.sectors || []).join(', ') || 'Unclassified')}</p><p><b>Issuer domiciles:</b> ${e((data.coverage?.domicile || []).join(', ') || 'US / unclassified')}</p><p class="hint">Issuer domicile is not the same as sales, operational or supply-chain exposure. Geography-level exposure requires company disclosures.</p></section></aside></div>`;
  };
  // Explicit, delegated account actions are separate from the investment app's data-action router.
  document.addEventListener('submit', async (ev) => {
    if (ev.target?.id !== 'pm-auth-form') return;
    ev.preventDefault();
    const form = ev.target,
      submit = form.querySelector('button[type=submit]'),
      error = form.querySelector('#pm-auth-error'),
      values = Object.fromEntries(new FormData(form));
    submit.disabled = true;
    error.hidden = true;
    try {
      const r = await api(P.mode === 'register' ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      P.user = r.user;
      P.prefs.language = r.user.language;
      P.prefs.timezone = r.user.timezone;
      await P.onAuthenticated?.(r.user);
    } catch (x) {
      error.hidden = false;
      error.textContent = x.message;
    } finally {
      submit.disabled = false;
    }
  });
  document.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-pm]');
    if (!b) return;
    ev.preventDefault();
    const id = b.dataset.pm;
    if (id === 'switch-auth') {
      P.mode = P.mode === 'register' ? 'login' : 'register';
      P.showAuth();
      return;
    }
    if (!P.user) return;
    if (id === 'logout') {
      await P.logout();
      return;
    }
    if (id === 'save-settings') {
      await P.saveSettings();
      return;
    }
    if (id === 'reload-news') {
      await P.reloadNews();
      return;
    }
    if (id === 'filter-news') {
      P.newsFilter = b.dataset.filter || 'All';
      window.dispatchEvent(new Event('pm-news-updated'));
      return;
    }
    if (id === 'earnings-sec') {
      await P.loadEarnings(String(b.dataset.ticker || '').toUpperCase());
      return;
    }
    if (id === 'download-weekly') {
      // Fetched (not navigated) so the request carries the account header.
      try {
        const r = await accountFetch('/api/reports/weekly.pdf');
        if (!r.ok) throw Error(`HTTP ${r.status}`);
        const url = URL.createObjectURL(await r.blob());
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Portafolio_Manager_Weekly_Report.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      } catch (error) {
        alert('The PDF could not be downloaded: ' + error.message);
      }
      return;
    }
    if (id === 'verify-email') {
      b.disabled = true;
      try {
        const r = await api('/api/auth/verify/request', { method: 'POST', body: '{}' });
        alert(
          r.alreadyVerified
            ? 'Email address already verified.'
            : 'A verification link has been requested. Check your email.',
        );
      } catch (err) {
        alert(err.message);
      } finally {
        b.disabled = false;
      }
      return;
    }
    if (id === 'send-weekly') {
      b.disabled = true;
      b.textContent = 'Preparing email…';
      try {
        const r = await api('/api/reports/send-now', { method: 'POST', body: '{}' });
        alert(`Email accepted for delivery to ${r.to}.`);
      } catch (error) {
        alert(error.message);
      } finally {
        b.disabled = false;
        b.textContent = 'Send a test email';
      }
      return;
    }
  });
  // Guest preview build (window.__PM_GUEST_PREVIEW__): no server, local display preferences only.
  if (window.__PM_GUEST_PREVIEW__) {
    const guest = {
      email: 'Guest Preview',
      language: 'en',
      timezone: tz,
      weeklyEnabled: false,
      emailVerified: false,
    };
    try {
      const saved = localStorage.getItem('pm-guest-preferences');
      if (saved) {
        const x = JSON.parse(saved);
        if (x.language === 'es' || x.language === 'en') guest.language = x.language;
        if (typeof x.timezone === 'string' && x.timezone) guest.timezone = x.timezone;
      }
    } catch {}
    P.user = guest;
    P.prefs.language = guest.language;
    P.prefs.timezone = guest.timezone;
    P.hasServer = false;
    P.init = async () => P.user;
    P.showAuth = () => {};
    P.logout = async () => {};
    P.reloadNews = async () => {
      P.news = {
        items: [],
        earnings: [],
        calendar: [],
        status:
          'Offline guest preview. A running server is required for current publisher headlines and filings.',
        coverage: { tickers: [], sectors: [], domicile: [] },
      };
      window.dispatchEvent(new Event('pm-news-updated'));
    };
    P.loadEarnings = async () => {
      P.earningsDetails = {
        error: 'Requires the authenticated server and SEC access',
        facts: [],
        filings: [],
      };
      window.dispatchEvent(new Event('pm-news-updated'));
    };
    P.loadReportStatus = async () => {
      P.reportStatus = { emailConfigured: false };
    };
    P.reportPanel = () =>
      `<section class="panel pm-weekly-panel"><div class="eyebrow">REPORT DELIVERY</div><h2>Weekly Portfolio Intelligence</h2><p>The signed-in application prepares a structured Sunday 09:00 local-time PDF and sends an email summary. Delivery requires account registration, a running server, a verified address and an email service.</p><p class="hint">Guest preview: sending and scheduled jobs are disabled. No personal holdings or emails are connected.</p></section>`;
    P.settingsPanel = () =>
      `<div class="page-header"><div><div class="eyebrow">APPLICATION / GUEST PREVIEW</div><h1>Settings</h1><p>Local display preferences. This is not an authenticated financial account.</p></div></div><div class="grid cols-2"><section class="panel"><h2>Language and location</h2><div class="pm-setting-fields"><label>Display language<select class="input" id="pm-guest-language"><option value="en" ${P.user.language === 'en' ? 'selected' : ''}>English</option><option value="es" ${P.user.language === 'es' ? 'selected' : ''}>Español</option></select></label><label>Time zone<input class="input" id="pm-guest-timezone" value="${e(P.user.timezone)}"></label><button class="btn primary" data-pm="guest-save">Save preferences</button></div></section><section class="panel"><h2>Account access</h2><p>This file is an offline product preview. Guest data is stored only in the browser where it is opened. It is not password-protected, backed up, synchronized with Yahoo private portfolios or accessible from another device.</p><p>For a private account, start the full Node server and select Create account. You choose your own password (at least 12 characters).</p></section>${window.PMRisk?.settingsCard?.() || ''}</div>`;
    document.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-pm="guest-save"]');
      if (!b) return;
      ev.preventDefault();
      const lang = document.getElementById('pm-guest-language')?.value || 'en';
      const zone = document.getElementById('pm-guest-timezone')?.value || tz;
      P.user.language = lang;
      P.user.timezone = zone;
      P.prefs.language = lang;
      P.prefs.timezone = zone;
      try {
        localStorage.setItem('pm-guest-preferences', JSON.stringify({ language: lang, timezone: zone }));
      } catch {}
      P.onSettingsChange?.();
    });
  }
  window.PMAccount = P;
})();
