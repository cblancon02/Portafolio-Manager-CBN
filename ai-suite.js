/* Portafolio Manager v4.0 — Vision ADR Importer, Thesis Tracker, Pre-Buy Stress-Test & AI Copilot */
(() => {
  'use strict';

  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const isGuest = () => Boolean(window.__PM_GUEST_PREVIEW__);
  const LOCAL_WS_KEY = 'pm-v4-ai-workspace';

  const S = {
    activeView: false,
    adrMode: 'snapshot',
    images: [],
    extracting: false,
    extractedRows: null,
    extractedTrades: null,
    brokerDetected: '',
    warnings: [],
    thesisTag: 'Valoración atractiva / Caída excesiva',
    thesisNote: '',
    thesisInvalidation: '',
    workspace: { theses: {}, chat: [] },
    wsLoaded: false,
    copilotBusy: false,
    copilotWebSearch: true,
    stressBusy: {},
    stressResults: {},
    auditBusy: {},
  };

  async function api(url, options = {}) {
    const fetcher = window.PMAccount?.accountFetch || fetch;
    const res = await fetcher(url, {
      credentials: 'same-origin',
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  function readLocalState() {
    if (window.PMBridge?.getState) {
      const live = window.PMBridge.getState();
      if (live) return live;
    }
    try {
      return JSON.parse(localStorage.getItem('pm-guest-demo:v4') || localStorage.getItem('portafolio-manager:v4') || 'null');
    } catch {
      return null;
    }
  }

  let wsInFlight = null;
  async function loadWorkspace() {
    if (S.wsLoaded) return S.workspace;
    if (isGuest()) {
      try { S.workspace = JSON.parse(localStorage.getItem(LOCAL_WS_KEY) || '{"theses":{},"chat":[]}'); } catch {}
      S.wsLoaded = true;
      return S.workspace;
    }
    if (!window.PMAccount?.user) return S.workspace;
    if (wsInFlight) return wsInFlight;
    wsInFlight = (async () => {
      try {
        S.workspace = await api('/api/account/ai-workspace');
        S.wsLoaded = true;
        rerenderAdr();
      } catch {}
      return S.workspace;
    })().finally(() => { wsInFlight = null; });
    return wsInFlight;
  }

  async function persistWorkspace() {
    if (isGuest()) {
      try { localStorage.setItem(LOCAL_WS_KEY, JSON.stringify(S.workspace)); } catch {}
      return;
    }
    if (!window.PMAccount?.user) return;
    await api('/api/account/ai-workspace', { method: 'PUT', body: JSON.stringify(S.workspace) });
  }

  function notify(msg, isErr = false) {
    const host = document.querySelector('#toast-host');
    if (!host) return;
    const d = document.createElement('div');
    d.className = 'toast' + (isErr ? ' error' : '');
    d.textContent = msg;
    host.appendChild(d);
    setTimeout(() => { d.style.opacity = '0'; setTimeout(() => d.remove(), 220); }, 3800);
  }

  function mdToHtml(md) {
    return esc(md)
      .replace(/^### (.*)$/gm, '<h4>$1</h4>')
      .replace(/^## (.*)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^\- (.*)$/gm, '• $1<br>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  function fileToImageObj(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1600;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const scale = maxDim / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
          resolve({
            name: file.name || 'screenshot.jpg',
            preview: dataUrl,
            mediaType: 'image/jpeg',
            base64: dataUrl.split(',')[1],
          });
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function renderAdrPanel() {
    const thesesEntries = Object.entries(S.workspace.theses || {});
    const tags = [
      'Valoración atractiva / Caída excesiva',
      'Catalizador de resultados / Guía alcista',
      'Moat e infraestructura IA',
      'Diversificador defensivo',
    ];

    return `
      <section class="pm-v4-hero-panel" id="pm-v4-adr-root" data-no-i18n>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap">
          <div>
            <div class="eyebrow">VISION ADR · MULTIMODAL PORTFOLIO INGESTION</div>
            <h2 style="font-family:var(--serif);font-size:28px;font-weight:400;margin:6px 0">Carga inteligente por Screenshot (sin doble paso por Yahoo)</h2>
            <p class="muted small" style="margin:0;max-width:680px">Arrastra o pega con <b>Ctrl+V</b> capturas de cualquier bróker (Interactive Brokers, Hapi, Schwab, eToro, Trii o Yahoo). Claude Vision extrae tus datos y te permite verificar cada cifra antes de guardar.</p>
          </div>
          <button class="btn ghost" type="button" data-v4="open-copilot">Abrir AI Copilot →</button>
        </div>

        <div class="pm-v4-mode-tabs" role="tablist">
          <button type="button" class="${S.adrMode === 'snapshot' ? 'active' : ''}" data-v4="mode:snapshot">1 · Foto Inicial de Cartera</button>
          <button type="button" class="${S.adrMode === 'trade' ? 'active' : ''}" data-v4="mode:trade">2 · Nueva Compra / Venta + Sustento</button>
        </div>

        <div class="pm-v4-dropzone" id="pm-v4-dropzone" data-v4="pick-files">
          <input type="file" id="pm-v4-file-input" accept="image/*" multiple hidden>
          <div class="pill" style="margin-bottom:8px">${S.adrMode === 'snapshot' ? 'SNAPSHOT COMPLETO DE TENENCIAS' : 'ORDEN EJECUTADA + DIARIO DE TESIS'}</div>
          <h3>Arrastra tus screenshots aquí, haz clic o presiona Ctrl + V</h3>
          <p class="muted tiny">Soporta PNG, JPG y WebP (hasta 4 capturas simultáneas). Nunca pedimos contraseñas de tu bróker.</p>
          ${
            S.images.length
              ? `<div class="pm-v4-thumbs">${S.images
                  .map(
                    (im, idx) =>
                      `<div class="pm-v4-thumb"><img src="${im.preview}" alt="${esc(im.name)}"><button type="button" data-v4="rm-img:${idx}" style="position:absolute;top:3px;right:3px;background:#000c;color:#fff;border:0;border-radius:50%;width:20px;height:20px;font-size:11px">×</button></div>`
                  )
                  .join('')}</div>`
              : ''
          }
        </div>

        <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;align-items:center">
          <button type="button" class="btn primary" data-v4="run-adr" ${!S.images.length || S.extracting ? 'disabled' : ''}>
            ${S.extracting ? 'Analizando captura con Claude Vision…' : 'Leer Screenshot con IA'}
          </button>
          ${S.images.length ? `<button type="button" class="btn ghost" data-v4="clear-adr">Limpiar capturas</button>` : ''}
          ${S.brokerDetected ? `<span class="pill gold">Fuente detectada: ${esc(S.brokerDetected)}</span>` : ''}
        </div>

        ${S.warnings.length ? `<div class="notice plain" style="margin-top:12px"><span>${S.warnings.map(esc).join(' · ')}</span></div>` : ''}

        ${
          S.adrMode === 'snapshot' && S.extractedRows
            ? `
          <div style="margin-top:18px">
            <div class="eyebrow">VERIFICACIÓN ANTES DE IMPORTAR</div>
            <div class="table-wrap"><table class="pm-v4-review-table">
              <thead><tr><th>Ticker</th><th>Acciones (Shares)</th><th>Costo Promedio (USD)</th><th></th></tr></thead>
              <tbody>
                ${S.extractedRows
                  .map(
                    (r, i) => `
                  <tr>
                    <td><input data-v4-row="${i}" data-field="ticker" value="${esc(r.ticker)}"></td>
                    <td><input data-v4-row="${i}" data-field="shares" type="number" step="any" value="${esc(r.shares)}"></td>
                    <td><input data-v4-row="${i}" data-field="cost" type="number" step="any" placeholder="Desconocido" value="${r.cost ?? ''}"></td>
                    <td><button type="button" class="btn tiny-btn" data-v4="del-row:${i}">Quitar</button></td>
                  </tr>`
                  )
                  .join('')}
              </tbody>
            </table></div>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <button type="button" class="btn ghost" data-v4="add-row">+ Añadir fila</button>
              <button type="button" class="btn primary" data-v4="commit-snapshot">Confirmar y Reemplazar Foto Inicial</button>
            </div>
          </div>`
            : ''
        }

        ${
          S.adrMode === 'trade' && S.extractedTrades
            ? `
          <div style="margin-top:18px">
            <div class="eyebrow">OPERACIÓN DETECTADA</div>
            <div class="table-wrap"><table class="pm-v4-review-table">
              <thead><tr><th>Tipo</th><th>Fecha</th><th>Ticker</th><th>Acciones</th><th>Precio (USD)</th><th>Comisión</th></tr></thead>
              <tbody>
                ${S.extractedTrades
                  .map(
                    (t, i) => `
                  <tr>
                    <td><select data-v4-trade="${i}" data-field="type"><option value="buy" ${t.type === 'buy' ? 'selected' : ''}>Compra</option><option value="sell" ${t.type === 'sell' ? 'selected' : ''}>Venta</option></select></td>
                    <td><input data-v4-trade="${i}" data-field="date" type="date" value="${esc(t.date)}"></td>
                    <td><input data-v4-trade="${i}" data-field="ticker" value="${esc(t.ticker)}"></td>
                    <td><input data-v4-trade="${i}" data-field="shares" type="number" step="any" value="${esc(t.shares)}"></td>
                    <td><input data-v4-trade="${i}" data-field="price" type="number" step="any" value="${esc(t.price)}"></td>
                    <td><input data-v4-trade="${i}" data-field="fee" type="number" step="any" value="${esc(t.fee || 0)}"></td>
                  </tr>`
                  )
                  .join('')}
              </tbody>
            </table></div>

            ${
              S.extractedTrades.some((t) => t.type === 'buy')
                ? `
              <div class="pm-v4-thesis-box">
                <div class="eyebrow" style="color:var(--gold)">DIARIO DE TESIS VIVO · SUSTENTO DE COMPRA</div>
                <p class="small muted" style="margin:5px 0 8px">Deja un comentario rápido sobre por qué compraste hoy. El AI Copilot vigilará resultados y noticias contra esta tesis.</p>
                <div class="pm-v4-chips">
                  ${tags.map((tg) => `<button type="button" class="pm-v4-chip ${S.thesisTag === tg ? 'on' : ''}" data-v4="tag:${esc(tg)}">${esc(tg)}</button>`).join('')}
                </div>
                <input id="pm-v4-thesis-note" class="input" style="margin-top:6px" placeholder="Ej: La acción corrigió 18% pese a mantener crecimiento de caja; entro buscando expansión de margen..." value="${esc(S.thesisNote)}">
                <input id="pm-v4-thesis-inv" class="input" style="margin-top:8px" placeholder="Opcional — ¿Qué invalidaría tu tesis? (Ej: Caída de margen FCF bajo 15% en 2 trimestres)" value="${esc(S.thesisInvalidation)}">
              </div>`
                : ''
            }

            <div style="display:flex;gap:10px;margin-top:14px">
              <button type="button" class="btn primary" data-v4="commit-trades">Registrar Operación y Guardar Tesis</button>
            </div>
          </div>`
            : ''
        }

        ${
          thesesEntries.length
            ? `
          <div style="margin-top:22px;padding-top:18px;border-top:1px solid var(--line)">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div class="eyebrow">THESIS TRACKER · TUS SUSTENTOS DE COMPRA ACTIVOS</div>
              <span class="pill muted">${thesesEntries.length} activas</span>
            </div>
            <div class="pm-thesis-cards">
              ${thesesEntries
                .map(([sym, th]) => {
                  const badgeCls = th.lastAudit?.status === 'BROKEN' ? 'red' : th.lastAudit?.status === 'WATCH' ? 'gold' : '';
                  return `<div class="pm-thesis-item">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
                      <strong>${esc(sym)} · <span class="muted small">${esc(th.tag || 'Tesis')}</span></strong>
                      <span class="pill ${badgeCls}">${esc(th.lastAudit?.status || 'ACTIVA')}</span>
                    </div>
                    <p class="small" style="margin:8px 0;color:#dce8e0">“${esc(th.note)}”</p>
                    ${th.invalidation ? `<div class="tiny muted">Invalidación: ${esc(th.invalidation)}</div>` : ''}
                    ${th.entryPrice ? `<div class="tiny muted" style="margin-top:4px">Entrada registrada: $${esc(th.entryPrice)} · ${esc(th.date || '')}</div>` : ''}
                    ${th.lastAudit ? `<div class="notice plain" style="margin-top:9px;padding:9px 11px;font-size:11.5px"><span><b>${esc(th.lastAudit.headline)}</b> — ${esc(th.lastAudit.evidence)}</span></div>` : ''}
                    <div style="display:flex;gap:8px;margin-top:10px">
                      <button type="button" class="btn tiny-btn" data-v4="audit-thesis:${esc(sym)}" ${S.auditBusy[sym] ? 'disabled' : ''}>${S.auditBusy[sym] ? 'Auditando…' : 'Auditar tesis hoy con IA'}</button>
                      <button type="button" class="btn tiny-btn ghost" data-v4="del-thesis:${esc(sym)}">Borrar</button>
                    </div>
                  </div>`;
                })
                .join('')}
            </div>
          </div>`
            : ''
        }
      </section>
    `;
  }

  function mountAdrIfNeeded() {
    if (S.activeView) return;
    const container = document.querySelector('#main-content');
    if (!container) return;
    const hasCsvBox = container.querySelector('#csv-import');
    const existing = container.querySelector('#pm-v4-adr-root');
    if (hasCsvBox && !existing) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = renderAdrPanel();
      const header = container.querySelector('.page-header');
      if (header && header.nextSibling) container.insertBefore(wrapper.firstElementChild, header.nextSibling);
      else container.prepend(wrapper.firstElementChild);
    }
  }

  function rerenderAdr() {
    const existing = document.querySelector('#pm-v4-adr-root');
    if (!existing) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderAdrPanel();
    existing.replaceWith(wrapper.firstElementChild);
  }

  function renderStressTestHTML(ticker) {
    const res = S.stressResults[ticker];
    const busy = S.stressBusy[ticker];
    return `
      <section class="pm-stresstest-block" id="pm-v4-stress-${esc(ticker)}" data-no-i18n>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap">
          <div>
            <div class="eyebrow" style="color:#ffafa8">PRE-BUY STRESS-TEST · ABOGADO DEL DIABLO</div>
            <h3 style="font-family:var(--serif);font-weight:400;font-size:21px;margin:5px 0">¿Por qué NO deberías comprar ${esc(ticker)} hoy?</h3>
            <p class="small muted" style="margin:0">Cruza fundamentales SEC, tu solapamiento real (incluyendo ETFs) y tu techo de riesgo antes de meter capital.</p>
          </div>
          <button type="button" class="btn warn" data-v4="stress:${esc(ticker)}" ${busy ? 'disabled' : ''}>
            ${busy ? 'Ejecutando Stress-Test…' : res ? 'Recalcular Stress-Test' : 'Ejecutar Abogado del Diablo'}
          </button>
        </div>
        ${
          res
            ? `
          <div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:14px">
            <span class="pill red">${esc(res.verdictBadge || 'STRESS-TEST')}</span>
            <span class="pill gold">Máx. prudente sugerido: ${res.maxPrudentUSD !== null && res.maxPrudentUSD !== undefined ? '$' + Number(res.maxPrudentUSD).toLocaleString('en-US') : '—'} (${esc(res.maxPrudentWeightPct)}% de cartera)</span>
          </div>
          <div class="pm-stresstest-grid">
            ${(res.threeReasonsNotToBuy || [])
              .map((it, idx) => `<div class="pm-stresstest-card"><strong>${idx + 1}. ${esc(it.title)}</strong><p>${esc(it.detail)}</p></div>`)
              .join('')}
          </div>
          <div class="notice plain" style="margin-top:10px"><span><b>Solapamiento y correlación con tu cartera:</b> ${esc(res.portfolioOverlapWarning)}</span></div>
          <p class="tiny muted" style="margin:10px 0 0"><b>Sizing por presupuesto de riesgo:</b> ${esc(res.sizingRationale)} · <b>Condición a verificar en 10-Q/10-K:</b> ${esc(res.whatMustBeTrue)}</p>
        `
            : ''
        }
      </section>
    `;
  }

  function mountFactsheetStressTest() {
    const sheet = document.querySelector('.pm-equity-sheet[data-ticker]');
    if (!sheet) return;
    const ticker = sheet.getAttribute('data-ticker');
    if (!ticker || sheet.querySelector(`#pm-v4-stress-${ticker}`)) return;
    const finalBlock = sheet.querySelector('.pm-fsheet-final');
    const holder = document.createElement('div');
    holder.innerHTML = renderStressTestHTML(ticker);
    if (finalBlock) sheet.insertBefore(holder.firstElementChild, finalBlock);
    else sheet.appendChild(holder.firstElementChild);
  }

  function renderCopilotView() {
    const main = document.querySelector('#main-content');
    if (!main) return;
    S.activeView = true;
    document.querySelectorAll('.side-link, .mobile-link').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('[data-v4="open-copilot"]').forEach((b) => b.classList.add('active'));

    const risk = window.PMRisk?.profile;
    const thesesCount = Object.keys(S.workspace.theses || {}).length;
    const prompts = [
      'Tengo $1,500 nuevos para invertir hoy: ¿cómo los alocarías respetando mi techo de riesgo y topes de capa?',
      'Hazme una radiografía de correlación real descomponiendo mis ETFs (VOO/SPY/QQQ) junto con mis acciones individuales.',
      'Audita mis posiciones actuales: ¿cuál tiene el mayor riesgo de concentración o tesis más frágil hoy?',
      'Quiero entrar en ASML o TSM: calcula el tamaño máximo de posición prudente para mi cartera actual.',
    ];

    main.innerHTML = `
      <div data-no-i18n>
        <div class="page-header">
          <div>
            <div class="eyebrow">PORTFOLIO-AWARE INTELLIGENCE · CLAUDE</div>
            <h1>AI Portfolio Copilot</h1>
            <p>Conectado en vivo a tus posiciones, costos promedio, look-through de ETFs, perfil de riesgo y diario de tesis.</p>
          </div>
          <div class="header-tools">
            <button type="button" class="btn ghost" data-v4="toggle-web">${S.copilotWebSearch ? '✓ Búsqueda Web Activa' : 'Búsqueda Web Off'}</button>
            <button type="button" class="btn ghost" data-v4="clear-chat">Limpiar conversación</button>
          </div>
        </div>

        <div class="pm-copilot-shell">
          <div class="pm-copilot-chat">
            <div class="pm-copilot-messages" id="pm-v4-chat-scroll">
              ${
                (S.workspace.chat || []).length
                  ? S.workspace.chat
                      .map(
                        (m) => `<div class="pm-msg ${m.role === 'user' ? 'user' : 'assistant'}">${m.role === 'user' ? esc(m.content) : mdToHtml(m.content)}</div>`
                      )
                      .join('')
                  : `<div class="empty" style="margin:auto;max-width:500px">
                      <div class="eyebrow">CONTEXTO CARGADO</div>
                      <h3 style="font-family:var(--serif);font-weight:400;font-size:24px;margin:8px 0">Pregunta sobre sizing, correlaciones o tesis</h3>
                      <p class="muted small">A diferencia de un chat genérico, cada respuesta cruza tus pesos reales, exposición implícita en ETFs, límites del 20%/25%/40% y tu cuestionario de riesgo.</p>
                      <div class="pm-v4-chips" style="justify-content:center;margin-top:14px">
                        ${prompts.map((p) => `<button type="button" class="pm-v4-chip" data-v4="prompt:${esc(p)}">${esc(p.slice(0, 62))}…</button>`).join('')}
                      </div>
                    </div>`
              }
              ${S.copilotBusy ? `<div class="pm-msg assistant muted">Analizando tu cartera, límites de riesgo y fuentes de mercado…</div>` : ''}
            </div>
            <form class="pm-copilot-composer" id="pm-v4-chat-form">
              <textarea id="pm-v4-chat-input" placeholder="Ej: ¿Cuánto podría alocar en MSFT o AVGO sin exceder mi presupuesto de riesgo?" required></textarea>
              <button type="submit" class="btn primary big" ${S.copilotBusy ? 'disabled' : ''}>Consultar</button>
            </form>
          </div>

          <aside style="display:grid;gap:14px">
            <div class="pm-context-card">
              <div class="eyebrow">CONTEXTO ACTIVO EN EL COPILOTO</div>
              <h3 style="font-family:var(--serif);font-weight:400;margin:8px 0 12px">Memoria conectada</h3>
              <div class="metric-bar"><span>Techo de riesgo sugerido</span><strong>${risk ? risk.ceiling + '/100' : 'Sin completar'}</strong></div>
              <div class="metric-bar"><span>Capacidad / Disposición</span><strong>${risk ? `${risk.capacity} / ${risk.willingness}` : '—'}</strong></div>
              <div class="metric-bar"><span>Sustentos de compra vivos</span><strong>${thesesCount} tesis</strong></div>
              <div class="metric-bar"><span>Look-through de ETFs</span><strong>VOO · SPY · QQQ · SMH</strong></div>
              <p class="hint" style="margin-top:12px">Para sizing cuantitativo utiliza Presupuesto de Riesgo + Quarter-Kelly acotado por tus topes de concentración (25% máx. individual / 40% por capa).</p>
              ${!risk ? `<button type="button" class="btn ghost" style="width:100%;margin-top:8px" data-risk="open">Completar Perfil de Riesgo</button>` : ''}
            </div>
            <div class="pm-context-card">
              <div class="eyebrow">CONSULTAS RÁPIDAS</div>
              <div style="display:grid;gap:8px;margin-top:10px">
                ${prompts.map((p) => `<button type="button" class="btn ghost" style="white-space:normal;text-align:left;justify-content:flex-start;line-height:1.4" data-v4="prompt:${esc(p)}">${esc(p)}</button>`).join('')}
              </div>
            </div>
          </aside>
        </div>
      </div>
    `;
    const scroller = document.querySelector('#pm-v4-chat-scroll');
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }

  const SPARKLE_SVG = `<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.8"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/><path d="M19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16z"/></svg>`;
  function injectSidebarButton() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && !sidebar.querySelector('[data-v4="open-copilot"]')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'side-link' + (S.activeView ? ' active' : '');
      btn.setAttribute('data-v4', 'open-copilot');
      btn.setAttribute('data-no-i18n', '');
      btn.innerHTML = `${SPARKLE_SVG}<span>AI Copilot</span>`;
      const labels = sidebar.querySelectorAll('.nav-label');
      if (labels[1]) sidebar.insertBefore(btn, labels[1]);
      else sidebar.appendChild(btn);
    }
    const mobileBar = document.querySelector('.mobile-header > div:last-child');
    if (mobileBar && !mobileBar.querySelector('[data-v4="open-copilot"]')) {
      const mBtn = document.createElement('button');
      mBtn.type = 'button';
      mBtn.className = 'iconbtn';
      mBtn.setAttribute('data-v4', 'open-copilot');
      mBtn.setAttribute('aria-label', 'AI Copilot');
      mBtn.setAttribute('title', 'AI Copilot');
      mBtn.innerHTML = SPARKLE_SVG;
      mobileBar.prepend(mBtn);
    }
  }

  function syncDraftInputs() {
    document.querySelectorAll('[data-v4-row]').forEach((el) => {
      const idx = Number(el.dataset.v4Row), f = el.dataset.field;
      if (S.extractedRows?.[idx]) {
        S.extractedRows[idx][f] = f === 'ticker' ? el.value.trim().toUpperCase() : el.value === '' ? null : Number(el.value);
      }
    });
    document.querySelectorAll('[data-v4-trade]').forEach((el) => {
      const idx = Number(el.dataset.v4Trade), f = el.dataset.field;
      if (S.extractedTrades?.[idx]) {
        S.extractedTrades[idx][f] = ['ticker', 'type', 'date'].includes(f)
          ? f === 'ticker' ? el.value.trim().toUpperCase() : el.value
          : Number(el.value);
      }
    });
    const noteEl = document.querySelector('#pm-v4-thesis-note');
    const invEl = document.querySelector('#pm-v4-thesis-inv');
    if (noteEl) S.thesisNote = noteEl.value;
    if (invEl) S.thesisInvalidation = invEl.value;
  }

  document.addEventListener('click', async (ev) => {
    if (ev.target.closest('[data-action^="go:"]')) {
      S.activeView = false;
    }
    const btn = ev.target.closest('[data-v4]');
    if (!btn) return;
    ev.preventDefault();
    syncDraftInputs();
    const raw = btn.getAttribute('data-v4');
    const [cmd, ...rest] = raw.split(':');
    const arg = rest.join(':');

    if (cmd === 'open-copilot') {
      await loadWorkspace();
      renderCopilotView();
      return;
    }
    if (cmd === 'toggle-web') {
      S.copilotWebSearch = !S.copilotWebSearch;
      renderCopilotView();
      return;
    }
    if (cmd === 'clear-chat') {
      S.workspace.chat = [];
      await persistWorkspace();
      renderCopilotView();
      return;
    }
    if (cmd === 'prompt') {
      const input = document.querySelector('#pm-v4-chat-input');
      if (input) {
        input.value = arg;
        document.querySelector('#pm-v4-chat-form')?.requestSubmit();
      }
      return;
    }
    if (cmd === 'mode') {
      S.adrMode = arg;
      rerenderAdr();
      return;
    }
    if (cmd === 'pick-files') {
      if (!ev.target.closest('button[data-v4^="rm-img"]')) {
        document.querySelector('#pm-v4-file-input')?.click();
      }
      return;
    }
    if (cmd === 'rm-img') {
      S.images.splice(Number(arg), 1);
      rerenderAdr();
      return;
    }
    if (cmd === 'clear-adr') {
      S.images = [];
      S.extractedRows = null;
      S.extractedTrades = null;
      S.warnings = [];
      S.brokerDetected = '';
      rerenderAdr();
      return;
    }
    if (cmd === 'tag') {
      S.thesisTag = arg;
      rerenderAdr();
      return;
    }
    if (cmd === 'add-row') {
      S.extractedRows = S.extractedRows || [];
      S.extractedRows.push({ ticker: '', shares: 1, cost: null });
      rerenderAdr();
      return;
    }
    if (cmd === 'del-row') {
      S.extractedRows.splice(Number(arg), 1);
      rerenderAdr();
      return;
    }
    if (cmd === 'run-adr') {
      if (isGuest()) return notify('El lector de screenshots requiere desplegar el servidor con ANTHROPIC_API_KEY en Vercel.', true);
      S.extracting = true;
      rerenderAdr();
      try {
        const out = await api('/api/ai/vision-extract', {
          method: 'POST',
          body: JSON.stringify({ mode: S.adrMode, images: S.images.map(({ mediaType, base64 }) => ({ mediaType, base64 })) }),
        });
        S.brokerDetected = out.brokerDetected || '';
        S.warnings = out.warnings || [];
        if (S.adrMode === 'snapshot') S.extractedRows = out.rows || [];
        else S.extractedTrades = out.trades || [];
        notify('Captura procesada con éxito. Revisa las cifras y confirma.');
      } catch (e) {
        notify(e.message, true);
      } finally {
        S.extracting = false;
        rerenderAdr();
      }
      return;
    }
    if (cmd === 'commit-snapshot') {
      const valid = (S.extractedRows || []).filter((r) => /^[A-Z0-9.\-]{1,12}$/.test(r.ticker) && Number(r.shares) > 0);
      if (!valid.length) return notify('Revisa que haya al menos un ticker y cantidad válidos.', true);
      if (window.PMBridge?.importSnapshotRows(valid)) {
        S.images = [];
        S.extractedRows = null;
        S.warnings = [];
        S.brokerDetected = '';
        rerenderAdr();
      }
      return;
    }
    if (cmd === 'commit-trades') {
      const valid = (S.extractedTrades || []).filter((t) => /^[A-Z0-9.\-]{1,12}$/.test(t.ticker) && Number(t.shares) > 0 && Number(t.price) > 0);
      if (!valid.length) return notify('Completa ticker, cantidad y precio válidos.', true);
      await loadWorkspace();
      const applied = window.PMBridge?.appendTrades ? window.PMBridge.appendTrades(valid) : false;
      if (!applied) return;
      for (const t of valid) {
        if (t.type === 'buy' && (S.thesisNote.trim() || S.thesisTag)) {
          S.workspace.theses[t.ticker] = {
            ticker: t.ticker,
            tag: S.thesisTag,
            note: S.thesisNote.trim() || S.thesisTag,
            invalidation: S.thesisInvalidation.trim() || null,
            entryPrice: t.price,
            date: t.date,
            updatedAt: new Date().toISOString(),
          };
        }
      }
      await persistWorkspace();
      S.images = [];
      S.extractedTrades = null;
      S.thesisNote = '';
      S.thesisInvalidation = '';
      rerenderAdr();
      return;
    }
    if (cmd === 'audit-thesis') {
      if (isGuest()) return notify('Conecta el servidor en Vercel para auditar tesis en vivo.', true);
      S.auditBusy[arg] = true;
      rerenderAdr();
      try {
        const out = await api('/api/ai/thesis-audit', { method: 'POST', body: JSON.stringify({ ticker: arg }) });
        S.workspace.theses[arg].lastAudit = { ...out.audit, auditedAt: new Date().toISOString() };
        notify(`Tesis de ${arg} auditada: ${out.audit.status}`);
      } catch (e) {
        notify(e.message, true);
      } finally {
        S.auditBusy[arg] = false;
        rerenderAdr();
      }
      return;
    }
    if (cmd === 'del-thesis') {
      delete S.workspace.theses[arg];
      await persistWorkspace();
      rerenderAdr();
      return;
    }
    if (cmd === 'stress') {
      if (isGuest()) return notify('El Abogado del Diablo requiere el servidor con ANTHROPIC_API_KEY en Vercel.', true);
      S.stressBusy[arg] = true;
      const node = document.querySelector(`#pm-v4-stress-${arg}`);
      if (node) node.outerHTML = renderStressTestHTML(arg);
      try {
        const out = await api('/api/ai/stress-test', {
          method: 'POST',
          body: JSON.stringify({ ticker: arg, clientState: readLocalState() }),
        });
        S.stressResults[arg] = out.stressTest;
      } catch (e) {
        notify(e.message, true);
      } finally {
        S.stressBusy[arg] = false;
        const updated = document.querySelector(`#pm-v4-stress-${arg}`);
        if (updated) updated.outerHTML = renderStressTestHTML(arg);
      }
    }
  });

  document.addEventListener('change', async (ev) => {
    if (ev.target?.id === 'pm-v4-file-input') {
      const files = [...(ev.target.files || [])].slice(0, 4);
      for (const f of files) S.images.push(await fileToImageObj(f));
      rerenderAdr();
    }
  });

  window.addEventListener('paste', async (ev) => {
    if (!document.querySelector('#pm-v4-adr-root')) return;
    const items = [...(ev.clipboardData?.items || [])].filter((x) => x.type.startsWith('image/'));
    if (!items.length) return;
    ev.preventDefault();
    for (const it of items.slice(0, 4)) {
      const file = it.getAsFile();
      if (file) S.images.push(await fileToImageObj(file));
    }
    notify('Captura pegada desde el portapapeles.');
    rerenderAdr();
  });

  document.addEventListener('dragover', (ev) => {
    const dz = ev.target.closest('#pm-v4-dropzone');
    if (dz) { ev.preventDefault(); dz.classList.add('dragover'); }
  });
  document.addEventListener('dragleave', (ev) => {
    const dz = ev.target.closest('#pm-v4-dropzone');
    if (dz) dz.classList.remove('dragover');
  });
  document.addEventListener('drop', async (ev) => {
    const dz = ev.target.closest('#pm-v4-dropzone');
    if (!dz) return;
    ev.preventDefault();
    dz.classList.remove('dragover');
    const files = [...(ev.dataTransfer?.files || [])].filter((f) => f.type.startsWith('image/')).slice(0, 4);
    for (const f of files) S.images.push(await fileToImageObj(f));
    rerenderAdr();
  });

  document.addEventListener('submit', async (ev) => {
    if (ev.target?.id !== 'pm-v4-chat-form') return;
    ev.preventDefault();
    if (isGuest()) return notify('Despliega el proyecto en Vercel con ANTHROPIC_API_KEY para conversar con el AI Copilot.', true);
    const input = document.querySelector('#pm-v4-chat-input');
    const msg = input?.value?.trim();
    if (!msg || S.copilotBusy) return;
    input.value = '';
    S.workspace.chat = [...(S.workspace.chat || []), { role: 'user', content: msg }];
    S.copilotBusy = true;
    renderCopilotView();
    try {
      const out = await api('/api/ai/copilot', {
        method: 'POST',
        body: JSON.stringify({ message: msg, webSearch: S.copilotWebSearch, clientState: readLocalState() }),
      });
      S.workspace.chat = out.chat || [...S.workspace.chat, { role: 'assistant', content: out.reply }];
    } catch (e) {
      S.workspace.chat.push({ role: 'assistant', content: `**Error:** ${e.message}` });
    } finally {
      S.copilotBusy = false;
      renderCopilotView();
    }
  });

  const observer = new MutationObserver(() => {
    injectSidebarButton();
    if (!S.activeView) {
      mountAdrIfNeeded();
      if (!S.wsLoaded && (isGuest() || window.PMAccount?.user)) {
        loadWorkspace();
      }
    }
    mountFactsheetStressTest();
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
