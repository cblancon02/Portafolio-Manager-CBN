/* Investor risk profile UX. All investment conclusions are labelled as heuristic screening. */
(function () {
  'use strict';
  const M = window.PMRiskModel;
  if (!M) return;
  const isGuest = () => isStandalone() || !!window.__PM_GUEST_PREVIEW__;
  const e = (x) =>
    String(x ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
    );
  const $ = (id) => document.getElementById(id);
  const UI = {
    en: {
      eye: 'INVESTOR SUITABILITY / RISK PROFILE',
      headline: 'Know the risk you want. Understand the risk you can afford.',
      sub: 'A concise assessment of investment behavior and financial resilience. Your responses remain separate from the holdings data used for market analysis.',
      start: 'Start assessment',
      startDetails: '10 short steps · Approximately 2-3 minutes',
      privacy: 'No exact income, account numbers, salary or asset values requested.',
      intro1: 'Willingness',
      intro2: 'Capacity',
      intro3: 'Suggested ceiling',
      introDetails: 'Three distinct lenses. A high appetite cannot override limited financial capacity.',
      continue: 'Continue',
      back: 'Back',
      skip: 'Skip for now',
      close: 'Close',
      done: 'Assessment completed',
      resultTitle: 'Your investor risk profile',
      willingness: 'Risk willingness',
      capacity: 'Risk capacity',
      suggested: 'Suggested risk ceiling',
      what: 'What influenced your result',
      whatEmpty: 'No critical constraints identified in your current responses.',
      interpret: 'Interpretation',
      notAlloc:
        'Scores are indices on a 0-100 screening scale. They are NOT percentages to invest in equities, loss probabilities or a regulatory suitability determination. The suggested ceiling is the lower of willingness and financial capacity, including explicit prudential constraints.',
      source:
        'Framework informed by FINRA, CFA Institute and Vanguard; scoring is an original transparent heuristic, not their questionnaire.',
      save: 'Save profile',
      saving: 'Saving profile...',
      saved: 'Saved to your private account',
      guestSaved: 'Stored locally in this browser only',
      failed: 'Could not save to your account. Your results remain available on screen.',
      edit: 'Review answers',
      again: 'Retake assessment',
      delete: 'Delete saved profile',
      none: 'No profile assessed yet',
      open: 'Start risk assessment',
      update: 'Review risk profile',
      privacyNotice:
        'Data is stored only after completing the assessment. In guest preview it stays on this browser; in an account it is stored separately on the server. You can delete it in Settings.',
      missing: 'Answer both questions to continue.',
      limited:
        'The suggested ceiling is a planning guardrail, not a recommendation of a precise portfolio allocation.',
      age: 'Age and sector preferences are used for context only, not to increase your risk score.',
      step: 'STEP',
      of: 'OF',
      guide: 'Answer based on your real circumstances, not an idealized response.',
      complete: 'Complete assessment',
      finished: 'View results',
      skipConfirm: 'You may complete the assessment later in Settings. Continue without a risk profile?',
      deleteConfirm: 'Delete your saved risk-profile responses? This does not delete holdings.',
      status: 'Assessment status',
      statusReady: 'Complete',
      statusMissing: 'Not completed',
      read: 'View profile',
      guest: 'GUEST PREVIEW',
      next: 'Next step',
      details: 'Your answers are not used to execute trades or produce automatic orders.',
      underAge: 'Under-18 profiles require guidance from a parent or qualified professional.',
    },
    es: {
      eye: 'IDONEIDAD / PERFIL DE RIESGO',
      headline: 'Conoce el riesgo que deseas y el que puedes soportar.',
      sub: 'Una evaluación breve del comportamiento inversor y la resiliencia financiera, separada de tus posiciones de mercado.',
      start: 'Comenzar evaluación',
      startDetails: '10 pasos breves · Aproximadamente 2-3 minutos',
      privacy: 'No solicitamos ingresos exactos, cuentas, salarios ni patrimonio.',
      intro1: 'Disposición',
      intro2: 'Capacidad',
      intro3: 'Límite orientativo',
      introDetails: 'Tres dimensiones distintas. Un apetito alto no elimina las restricciones financieras.',
      continue: 'Continuar',
      back: 'Atrás',
      skip: 'Omitir por ahora',
      close: 'Cerrar',
      done: 'Evaluación completada',
      resultTitle: 'Tu perfil de riesgo inversor',
      willingness: 'Disposición al riesgo',
      capacity: 'Capacidad financiera',
      suggested: 'Límite orientativo de riesgo',
      what: 'Factores determinantes',
      whatEmpty: 'Sin restricciones críticas identificadas en las respuestas.',
      interpret: 'Interpretación',
      notAlloc:
        'Son índices de una escala interna 0-100. NO representan el porcentaje a invertir en acciones, la probabilidad de pérdida ni una evaluación regulatoria de idoneidad. El límite orientativo no supera tu disposición ni tu capacidad financiera.',
      source:
        'Marco inspirado en FINRA, CFA Institute y Vanguard; el algoritmo es una heurística propia transparente, no sus cuestionarios.',
      save: 'Guardar perfil',
      saving: 'Guardando...',
      saved: 'Guardado en tu cuenta privada',
      guestSaved: 'Guardado solo en este navegador',
      failed: 'No se pudo guardar en tu cuenta. El resultado sigue visible.',
      edit: 'Revisar respuestas',
      again: 'Repetir evaluación',
      delete: 'Eliminar perfil guardado',
      none: 'Todavía no completaste la evaluación',
      open: 'Iniciar evaluación',
      update: 'Revisar perfil de riesgo',
      privacyNotice:
        'Los datos se guardan al completar. En demostración permanecen en este navegador; en una cuenta se guardan en el servidor. Puedes eliminarlos en Settings.',
      missing: 'Responde ambas preguntas para continuar.',
      limited: 'Es una guía para planificar, no una recomendación de asignación exacta.',
      age: 'La edad y los sectores sirven de contexto; no elevan la puntuación.',
      step: 'PASO',
      of: 'DE',
      guide: 'Responde según tu situación real.',
      complete: 'Completar evaluación',
      finished: 'Ver resultados',
      skipConfirm: 'Puedes completar la evaluación después en Settings. ¿Continuar sin perfil?',
      deleteConfirm: '¿Eliminar tus respuestas guardadas? No afecta tu cartera.',
      status: 'Estado de evaluación',
      statusReady: 'Completa',
      statusMissing: 'Sin completar',
      read: 'Ver perfil',
      guest: 'VISTA DE PRUEBA',
      next: 'Siguiente paso',
      details: 'Tus respuestas nunca ejecutan operaciones.',
      underAge: 'Para menores de 18 se recomienda asesoramiento de un adulto o profesional.',
    },
  };
  let current = null,
    answers = {},
    step = -1,
    profile = null,
    saveStatus = '',
    isBusy = false,
    autoOpened = false,
    fetchPromise = null;
  function lang() {
    const l =
      window.PMAccount?.user?.language ||
      window.PMAccount?.prefs?.language ||
      document.documentElement.lang ||
      'en';
    return l === 'es' ? 'es' : 'en';
  }
  function x() {
    return UI[lang()];
  }
  const selectStyles = 'pm-risk-choice';
  const arrow =
    '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>';
  function logo() {
    return `<span class="pm-risk-logo" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><path d="M9 34V26h7v8M20.5 34V20h7v14M32 34V13h7v21" fill="#60cda4" fill-opacity=".75"/><path d="M8 20.5l11-7 8 3.2L39 7" stroke="#e1faed" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
  }
  function base(content) {
    return `<div class="pm-risk-scrim" id="pm-risk-overlay" role="dialog" aria-modal="true" aria-label="${e(x().eye)}"><div class="pm-risk-frame"><header class="pm-risk-topbar"><div class="pm-risk-brand">${logo()}<strong>Portafolio Manager</strong><span class="pm-risk-divider"></span><span class="pm-risk-toplabel">${e(x().eye)}</span></div><div class="pm-risk-topright">${isGuest() ? `<span class="pm-risk-guest">${e(x().guest)}</span>` : ''}${isStandalone() ? '' : `<button type="button" class="pm-risk-dismiss" data-risk="dismiss" aria-label="${e(x().close)}">&times;</button>`}</div></header><div class="pm-risk-scroll">${content}</div></div></div>`;
  }
  // standalone is declared as a boolean; callable helper keeps templating simple.
  function isStandalone() {
    return !!window.__PM_RISK_STANDALONE__;
  }
  function intro() {
    const t = x();
    return `<div class="pm-risk-intro"><div class="pm-risk-eyebrow">${e(t.eye)}</div><h1>${e(t.headline)}</h1><p class="pm-risk-lead">${e(t.sub)}</p><div class="pm-risk-three"><div><span>01</span><strong>${e(t.intro1)}</strong><small>${lang() === 'en' ? 'Your response to uncertainty' : 'Tu actitud frente a la incertidumbre'}</small></div><div><span>02</span><strong>${e(t.intro2)}</strong><small>${lang() === 'en' ? 'Financial ability to absorb losses' : 'Capacidad de absorber pérdidas'}</small></div><div><span>03</span><strong>${e(t.intro3)}</strong><small>${lang() === 'en' ? 'A preliminary risk boundary' : 'Una guía inicial de riesgo'}</small></div></div><div class="pm-risk-intro-bottom"><button class="pm-risk-primary" type="button" data-risk="begin">${e(t.start)} ${arrow}</button>${!isStandalone() ? `<button type="button" class="pm-risk-quiet" data-risk="dismiss">${e(t.skip)}</button>` : ''}<span>${e(t.startDetails)}</span></div><div class="pm-risk-privacy"><span class="pm-risk-lock">&#9679;</span> ${e(t.privacy)}</div><div class="pm-risk-methodnote">${e(t.introDetails)}</div></div>`;
  }
  function choice(key) {
    const t = M.T[lang()].qs[key],
      selected = answers[key];
    const isMulti = key === 'sectors';
    return `<div class="pm-risk-q" data-q="${e(key)}"><h2>${e(t.title)}</h2><p>${e(t.hint)}</p><div class="pm-risk-choice-grid ${M.Q[key].length > 4 ? 'pm-risk-many' : ''}" role="${isMulti ? 'group' : 'radiogroup'}" aria-label="${e(t.title)}">${M.Q[
      key
    ]
      .map((value, i) => {
        const active = isMulti ? (answers.sectors || []).includes(value) : selected === value;
        return `<button type="button" class="${selectStyles} ${active ? 'is-selected' : ''}" data-risk="choose" data-key="${e(key)}" data-value="${e(value)}" role="${isMulti ? 'checkbox' : 'radio'}" aria-checked="${active}"><span class="pm-risk-key">${String(i + 1).padStart(2, '0')}</span><span class="pm-risk-choice-text">${e(t.options[i])}</span><span class="pm-risk-check" aria-hidden="true">${active ? '&#10003;' : ''}</span></button>`;
      })
      .join('')}</div></div>`;
  }
  function screen() {
    const t = x(),
      s = M.SCREENS[step],
      group = M.T[lang()].groups[s.group],
      ready = s.questions.every((k) => k === 'sectors' || answers[k] != null);
    const pct = (((step + 1) / M.SCREENS.length) * 100).toFixed(0);
    return `<div class="pm-risk-work"><div class="pm-risk-progress-head"><span>${e(t.step)} ${String(step + 1).padStart(2, '0')} ${e(t.of)} ${M.SCREENS.length}</span><span>${pct}%</span></div><div class="pm-risk-progress"><div style="width:${pct}%"></div></div><div class="pm-risk-section"><div class="pm-risk-group">${e(group)}</div><div class="pm-risk-stepbody">${s.questions.map(choice).join('')}</div><div class="pm-risk-step-footer"><button type="button" class="pm-risk-quiet" data-risk="back">${e(t.back)}</button><div><small>${e(t.guide)}</small><button type="button" class="pm-risk-primary" data-risk="next" ${ready ? '' : 'disabled'}>${e(step === M.SCREENS.length - 1 ? t.finished : t.continue)} ${arrow}</button></div></div></div></div>`;
  }
  function result() {
    const t = x(),
      r = M.score(answers),
      lt = M.T[lang()],
      reasons = r.flags.filter((k) => k !== 'gap').slice(0, 4),
      gap = r.willingness - r.capacity;
    function metric(label, value, css) {
      return `<div class="pm-risk-meter"><div class="pm-risk-meter-head"><span>${e(label)}</span><b>${value}<span>/100</span></b></div><div class="pm-risk-meter-track"><div class="${css}" style="width:${value}%"></div></div></div>`;
    }
    return `<div class="pm-risk-results"><div class="pm-risk-eyebrow">${e(t.done)} / ${e(t.eye)}</div><h1>${e(t.resultTitle)}</h1><div class="pm-risk-result-grid"><div class="pm-risk-final-score"><span>${e(t.suggested)}</span><strong>${r.suggested}<small>/100</small></strong><b>${e(lt.bands[r.category])}</b><p>${e(t.limited)}</p></div><div class="pm-risk-scales">${metric(t.willingness, r.willingness, 'pm-risk-fill-will')}${metric(t.capacity, r.capacity, 'pm-risk-fill-cap')}${metric(t.suggested, r.suggested, 'pm-risk-fill-rec')}<p>${e(t.age)}</p></div></div><div class="pm-risk-result-subgrid"><section><h3>${e(t.what)}</h3>${reasons.length ? `<ul class="pm-risk-reasons">${reasons.map((k) => `<li>${e(lt.flags[k])}</li>`).join('')}</ul>` : `<p>${e(t.whatEmpty)}</p>`}${r.flags.includes('gap') ? `<p class="pm-risk-gap">${e(lt.flags.gap)}</p>` : ''}</section><section><h3>${e(t.interpret)}</h3><p>${e(lt.guidance[r.flags.includes('short_horizon') || r.flags.includes('thin_reserves') || r.flags.includes('high_cost_debt') ? 'low' : gap > 15 ? 'gap' : 'balanced'])}</p><p>${e(t.notAlloc)}</p></section></div><div class="pm-risk-actions"><button class="pm-risk-quiet" data-risk="edit">${e(t.edit)}</button><button class="pm-risk-primary" data-risk="save" ${isBusy ? 'disabled' : ''}>${e(saveStatus === 'saved' ? (isGuest() ? t.guestSaved : t.saved) : isBusy ? t.saving : t.save)} ${saveStatus === 'saved' ? '&#10003;' : arrow}</button></div>${saveStatus === 'error' ? `<p class="pm-risk-error">${e(t.failed)}</p>` : ''}<div class="pm-risk-endnote">${e(t.source)}<br>${e(t.privacyNotice)}<br><a target="_blank" rel="noopener noreferrer" href="https://www.finra.org/sites/default/files/digital-investment-advice-report.pdf">FINRA</a> &nbsp; <a target="_blank" rel="noopener noreferrer" href="https://www.cfainstitute.org/sites/default/files/-/media/documents/survey/investment-risk-profiling.pdf">CFA Institute</a> &nbsp; <a target="_blank" rel="noopener noreferrer" href="https://investor.vanguard.com/tools-calculators/investor-questionnaire">Vanguard</a></div></div>`;
  }
  function mount() {
    let overlay = $('pm-risk-overlay');
    if (overlay) overlay.remove();
    if (!current) return;
    document.body.insertAdjacentHTML(
      'beforeend',
      base(step < 0 ? intro() : step < M.SCREENS.length ? screen() : result()),
    );
    document.body.classList.add('pm-risk-open');
    const foc = document.querySelector('.pm-risk-primary:not([disabled])');
    if (foc) foc.focus({ preventScroll: true });
  }
  function dismiss() {
    if (!isGuest() && !profile) {
      try {
        sessionStorage.setItem('pm-risk-skipped', '1');
      } catch {}
    }
    document.body.classList.remove('pm-risk-open');
    $('pm-risk-overlay')?.remove();
    current = null;
  }
  function open(mode = 'intro') {
    current = mode;
    step = mode === 'review' && profile ? M.SCREENS.length : -1;
    answers = mode === 'review' && profile ? { ...profile.answers } : {};
    saveStatus = mode === 'review' && profile ? 'saved' : '';
    mount();
  }
  function goNext() {
    const s = M.SCREENS[step];
    if (!s || !s.questions.every((k) => k === 'sectors' || answers[k] != null)) return;
    step = Math.min(M.SCREENS.length, step + 1);
    saveStatus = '';
    mount();
  }
  function choose(key, value) {
    if (!M.Q[key]?.includes(value)) return;
    if (key === 'sectors') {
      const old = answers.sectors || [];
      answers.sectors = old.includes(value)
        ? old.filter((x) => x !== value)
        : old.length >= 4
          ? old
          : [...old, value];
    } else answers[key] = value;
    const screenNow = step,
      multiple = M.SCREENS[step]?.questions.length > 1;
    if (!multiple && key !== 'sectors' && step >= 0) {
      const next = step + 1;
      step = next;
      saveStatus = '';
      mount();
    } else {
      mount();
    }
  }
  async function save() {
    if (isBusy) return;
    let result;
    try {
      result = M.score(answers);
    } catch {
      return;
    }
    isBusy = true;
    saveStatus = '';
    mount();
    try {
      if (isGuest()) {
        const candidate = { ...result, completedAt: new Date().toISOString() };
        localStorage.setItem('pm-risk-guest:v1', JSON.stringify(candidate));
        profile = candidate;
      } else {
        const r = await (window.PMAccount?.accountFetch || fetch)('/api/account/risk-profile', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: result.answers }),
        });
        const data = await r.json();
        if (!r.ok) throw Error(data.error || 'Unable to save');
        profile = data.profile;
      }
      saveStatus = 'saved';
      if (!isGuest()) {
        try {
          sessionStorage.removeItem('pm-risk-skipped');
        } catch {}
      }
      window.dispatchEvent(new Event('pm-risk-updated'));
    } catch (err) {
      saveStatus = 'error';
    } finally {
      isBusy = false;
      mount();
    }
  }
  async function fetchProfile() {
    if (isGuest()) {
      try {
        const p = JSON.parse(localStorage.getItem('pm-risk-guest:v1') || 'null');
        if (p?.version === M.VERSION && p.answers) {
          profile = { ...M.score(p.answers), completedAt: p.completedAt };
        }
      } catch {}
      return profile;
    }
    try {
      const r = await (window.PMAccount?.accountFetch || fetch)('/api/account/risk-profile', {
        credentials: 'same-origin',
      });
      if (!r.ok) return null;
      const json = await r.json();
      profile = json.profile || null;
      return profile;
    } catch {
      return null;
    }
  }
  async function onAccountReady() {
    if (fetchPromise) return fetchPromise;
    fetchPromise = (async () => {
      await fetchProfile();
      if (isGuest() || isStandalone()) return;
      const skip = sessionStorage.getItem('pm-risk-skipped');
      if (!profile && !skip && !autoOpened) {
        autoOpened = true;
        open('intro');
      }
    })();
    return fetchPromise.finally(() => {
      fetchPromise = null;
    });
  }
  function settingsCard() {
    const t = x();
    const r = profile;
    return `<section class="panel pm-risk-settings-card"><div class="section-heading"><div><div class="eyebrow">INVESTOR / RISK PROFILE</div><h2>${e(lang() === 'es' ? 'Evaluación de riesgo' : 'Investor Risk Assessment')}</h2></div><span class="pill ${r ? 'positive' : 'muted'}">${e(r ? t.statusReady : t.statusMissing)}</span></div>${r ? `<div class="pm-risk-settings-metrics"><div><small>${e(t.willingness)}</small><strong>${r.willingness}/100</strong></div><div><small>${e(t.capacity)}</small><strong>${r.capacity}/100</strong></div><div><small>${e(t.suggested)}</small><strong>${r.suggested}/100</strong></div></div>` : `<p>${e(t.none)}. ${e(t.startDetails)}</p>`}<p class="hint">${e(t.notAlloc)}</p><div class="pm-actions"><button type="button" class="btn primary" data-risk="open">${e(r ? t.update : t.open)}</button>${r ? `<button class="btn ghost" type="button" data-risk="delete">${e(t.delete)}</button>` : ''}</div></section>`;
  }
  async function deleteProfile() {
    if (!confirm(x().deleteConfirm)) return;
    if (isGuest()) {
      try {
        localStorage.removeItem('pm-risk-guest:v1');
      } catch {}
    } else {
      try {
        const r = await (window.PMAccount?.accountFetch || fetch)('/api/account/risk-profile', {
          method: 'DELETE',
          credentials: 'same-origin',
        });
        if (!r.ok) throw Error('Delete failed');
      } catch {
        alert('Could not delete your profile.');
        return;
      }
    }
    profile = null;
    answers = {};
    saveStatus = '';
    window.dispatchEvent(new Event('pm-risk-updated'));
    if (current) open('intro');
  }
  document.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('[data-risk]');
    if (!btn) return;
    ev.preventDefault();
    const action = btn.dataset.risk;
    if (action === 'open') {
      open(profile ? 'review' : 'intro');
      return;
    }
    if (action === 'begin') {
      step = 0;
      mount();
      return;
    }
    if (action === 'dismiss') {
      dismiss();
      return;
    }
    if (action === 'back') {
      if (step >= M.SCREENS.length) step = M.SCREENS.length - 1;
      else step = Math.max(-1, step - 1);
      mount();
      return;
    }
    if (action === 'next') {
      goNext();
      return;
    }
    if (action === 'choose') {
      choose(btn.dataset.key, btn.dataset.value);
      return;
    }
    if (action === 'save') {
      await save();
      return;
    }
    if (action === 'edit') {
      step = 0;
      saveStatus = '';
      mount();
      return;
    }
    if (action === 'delete') {
      await deleteProfile();
      return;
    }
  });
  document.addEventListener('keydown', (ev) => {
    if (!current) return;
    if (ev.key === 'Escape' && !isStandalone()) {
      dismiss();
      return;
    }
    if (step < 0 || step >= M.SCREENS.length) return;
    const questions = M.SCREENS[step].questions;
    if (
      questions.length === 1 &&
      /^[1-9]$/.test(ev.key) &&
      !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)
    ) {
      const idx = Number(ev.key) - 1,
        q = questions[0];
      if (M.Q[q][idx]) {
        ev.preventDefault();
        choose(q, M.Q[q][idx]);
      }
    }
  });
  window.PMRisk = {
    open,
    onAccountReady,
    settingsCard,
    get profile() {
      return profile;
    },
    deleteProfile,
  };
  if (isStandalone()) {
    document.addEventListener('DOMContentLoaded', async () => {
      await fetchProfile();
      open(profile ? 'review' : 'intro');
    });
  }
})();
