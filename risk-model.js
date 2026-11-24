/* Portafolio Manager: transparent, non-validated investor risk screening heuristic.
 * Percentages are scale scores, not loss probabilities or equity allocations.
 * Server re-runs this model on every submitted set of answers.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PMRiskModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MODEL_VERSION = 'pm-risk-1.0';
  const Q = {
    horizon: ['under2', 'two5', 'five10', 'over10'],
    goal: ['essential', 'committed', 'flexible', 'longterm'],
    runway: ['under1', 'one3', 'three6', 'six12', 'over12'],
    cashflow: ['negative', 'even', 'modest', 'strong'],
    income: ['unpredictable', 'variable', 'mostly', 'stable'],
    ageBand: ['under18', '18to29', '30to44', '45to59', '60plus', 'prefer'],
    dependents: ['none', 'one', 'twoPlus'],
    debt: ['highCost', 'high', 'manageable', 'none'],
    portfolioShare: ['over60', 'from35to60', 'from15to35', 'under15'],
    comfortLoss: ['five', 'ten', 'twenty', 'thirtyfive'],
    drawdown: ['sell', 'reduce', 'hold', 'add'],
    tradeoff: ['protect', 'steady', 'balanced', 'growth'],
    experience: ['new', 'under2', 'two5', 'over5'],
    sectors: [
      'technology',
      'financials',
      'healthcare',
      'industrials',
      'energy',
      'consumer',
      'materials',
      'realEstate',
    ],
  };
  const SCALES = {
    horizon: [8, 35, 73, 100],
    goal: [10, 36, 72, 100],
    runway: [5, 23, 48, 78, 100],
    cashflow: [4, 35, 70, 100],
    income: [10, 36, 70, 100],
    dependents: [100, 75, 50],
    debt: [5, 32, 75, 100],
    portfolioShare: [12, 39, 75, 100],
    comfortLoss: [8, 28, 60, 100],
    drawdown: [0, 23, 65, 100],
    tradeoff: [5, 30, 67, 100],
    experience: [25, 45, 75, 100],
  };
  const SCREENS = [
    { group: 'goals', questions: ['horizon'] },
    { group: 'goals', questions: ['goal'] },
    { group: 'capacity', questions: ['runway'] },
    { group: 'capacity', questions: ['cashflow', 'income'] },
    { group: 'capacity', questions: ['dependents', 'ageBand'] },
    { group: 'capacity', questions: ['debt', 'portfolioShare'] },
    { group: 'behavior', questions: ['comfortLoss'] },
    { group: 'behavior', questions: ['drawdown'] },
    { group: 'behavior', questions: ['tradeoff'] },
    { group: 'context', questions: ['experience', 'sectors'] },
  ];
  const T = {
    en: {
      groups: {
        goals: 'Your objective',
        capacity: 'Financial resilience',
        behavior: 'Investment behavior',
        context: 'Experience & expertise',
      },
      qs: {
        horizon: {
          title: 'When will you need this money?',
          hint: 'Use the earliest date when a meaningful portion may need to be withdrawn.',
          options: ['Within 2 years', 'In 2-5 years', 'In 5-10 years', 'More than 10 years'],
        },
        goal: {
          title: 'How important is this capital to your plans?',
          hint: 'Separate money with a fixed obligation from long-term, flexible capital.',
          options: [
            'Essential: housing, education or living expenses',
            'Committed: a specific important goal',
            'Flexible: would be inconvenient to lose',
            'Long-term wealth: no fixed withdrawal date',
          ],
        },
        runway: {
          title: 'How much of your essential spending is covered by cash reserves?',
          hint: 'Savings outside investments, divided by your monthly essential expenses. No exact amounts needed.',
          options: ['Less than 1 month', '1-3 months', '3-6 months', '6-12 months', 'More than 12 months'],
        },
        cashflow: {
          title: 'After monthly bills, what is usually left?',
          hint: 'Consider income after essential spending, debt payments and household obligations.',
          options: [
            'I spend more than I earn',
            'Roughly break even',
            'Some regular savings',
            'Substantial, consistent surplus',
          ],
        },
        income: {
          title: 'How dependable is your income?',
          hint: 'Think about the next 12 months, not only last month.',
          options: [
            'Highly uncertain',
            'Variable or seasonal',
            'Mostly predictable',
            'Very stable and diversified',
          ],
        },
        dependents: {
          title: 'How many people rely on your income?',
          hint: 'Exclude yourself. This affects the impact of a setback, not investment knowledge.',
          options: ['None', 'One', 'Two or more'],
        },
        ageBand: {
          title: 'Which age band describes you?',
          hint: 'Age provides context; your actual withdrawal horizon drives the score.',
          options: ['Under 18', '18-29', '30-44', '45-59', '60+', 'Prefer not to say'],
        },
        debt: {
          title: 'What best describes your current debt?',
          hint: 'Include high-interest obligations that may compete with investing.',
          options: [
            'High-interest debt is a concern',
            'Large repayments strain my budget',
            'Debt is manageable',
            'No debt or easily manageable obligations',
          ],
        },
        portfolioShare: {
          title: 'How much of your accessible savings is invested in this portfolio?',
          hint: 'Include money you may need in an emergency; exclude property you cannot readily sell.',
          options: ['More than 60%', '35-60%', '15-35%', 'Less than 15%'],
        },
        comfortLoss: {
          title: 'What one-year drawdown could you emotionally withstand?',
          hint: 'Assume a diversified long-term portfolio, with no assurance it will recover quickly.',
          options: ['About 5%', 'About 10%', 'About 20%', '35% or more'],
        },
        drawdown: {
          title: 'Your investments decline by 25% in three months. What is your likely reaction?',
          hint: 'Answer what you would actually do, rather than what sounds financially sophisticated.',
          options: [
            'Sell most to avoid further losses',
            'Reduce my exposure',
            'Hold the positions and review fundamentals',
            'Add to positions if the thesis remains intact',
          ],
        },
        tradeoff: {
          title: 'Which trade-off would you choose?',
          hint: 'Higher long-term upside comes with deeper and sometimes prolonged losses.',
          options: [
            'Preserve capital even if growth is limited',
            'Prioritize stability with modest upside',
            'Balance growth and short-term volatility',
            'Maximize long-term growth despite deep swings',
          ],
        },
        experience: {
          title: 'How much hands-on investment experience do you have?',
          hint: 'Knowledge helps interpret a strategy; experience alone does not increase your capacity for loss.',
          options: ['New to investing', 'Less than 2 years', '2-5 years', 'More than 5 years'],
        },
        sectors: {
          title: 'Which sectors do you understand well?',
          hint: 'Optional. Choose up to four. This personalizes future research; it does not raise your risk score.',
          options: [
            'Technology & AI',
            'Financial services',
            'Healthcare',
            'Industrials',
            'Energy',
            'Consumer businesses',
            'Materials',
            'Real estate',
          ],
        },
      },
      bands: ['Capital preservation', 'Cautious', 'Balanced', 'Growth-oriented', 'Aggressive'],
      flags: {
        short_horizon: 'A near-term withdrawal limits the time available to recover losses.',
        thin_reserves: 'Emergency reserves are limited relative to essential living expenses.',
        negative_cashflow: 'Monthly spending exceeds income, reducing loss-absorption capacity.',
        high_cost_debt: 'High-interest debt competes with investment risk-taking.',
        fixed_goal: 'Essential financial commitments warrant capital protection.',
        unstable_income: 'Income volatility reduces the margin for market setbacks.',
        dependents: 'Household dependents increase the consequences of a drawdown.',
        large_exposure: 'A high proportion of accessible savings is invested.',
        minor: 'For users under 18, suitability requires adult guidance.',
        gap: 'Your comfort with volatility exceeds your financial resilience.',
      },
      guidance: {
        low: 'Keep essential near-term money liquid; review emergency reserves and liabilities before adding volatility.',
        gap: 'Your ability to bear a loss is currently lower than your stated appetite. Review position sizing and diversification.',
        balanced:
          'Revisit these assumptions after a material change in income, dependents, goals or liquidity.',
      },
    },
    es: {
      groups: {
        goals: 'Objetivos',
        capacity: 'Resiliencia financiera',
        behavior: 'Comportamiento',
        context: 'Experiencia y sectores',
      },
      qs: {
        horizon: {
          title: '¿Cuándo necesitarás este dinero?',
          hint: 'Piensa en el primer momento en que podrías necesitar retirar una parte importante.',
          options: ['En menos de 2 años', 'En 2-5 años', 'En 5-10 años', 'En más de 10 años'],
        },
        goal: {
          title: '¿Qué tan esencial es este capital?',
          hint: 'Distingue obligaciones concretas de patrimonio flexible a largo plazo.',
          options: [
            'Esencial: vivienda, educación o gastos',
            'Comprometido con una meta importante',
            'Flexible: perderlo sería incómodo',
            'Patrimonio a largo plazo, sin fecha fija',
          ],
        },
        runway: {
          title: '¿Cuántos meses de gastos esenciales cubres con reservas líquidas?',
          hint: 'Ahorros fuera de inversiones divididos entre gastos esenciales mensuales.',
          options: ['Menos de 1 mes', '1-3 meses', '3-6 meses', '6-12 meses', 'Más de 12 meses'],
        },
        cashflow: {
          title: '¿Qué te queda después de pagar tus gastos mensuales?',
          hint: 'Incluye obligaciones y cuotas de deuda.',
          options: [
            'Gasto más de lo que gano',
            'Prácticamente nada',
            'Un ahorro regular moderado',
            'Un excedente amplio y estable',
          ],
        },
        income: {
          title: '¿Qué tan estables son tus ingresos?',
          hint: 'Considera los próximos 12 meses.',
          options: [
            'Muy inciertos',
            'Variables o estacionales',
            'Bastante predecibles',
            'Muy estables y diversificados',
          ],
        },
        dependents: {
          title: '¿Cuántas personas dependen económicamente de ti?',
          hint: 'Sin contarte a ti.',
          options: ['Ninguna', 'Una', 'Dos o más'],
        },
        ageBand: {
          title: '¿En qué rango de edad estás?',
          hint: 'El plazo real de retiro importa más que la edad por sí sola.',
          options: ['Menor de 18', '18-29', '30-44', '45-59', '60+', 'Prefiero no decirlo'],
        },
        debt: {
          title: '¿Cómo describirías tus deudas?',
          hint: 'Incluye intereses elevados y pagos obligatorios.',
          options: [
            'Deuda cara que me preocupa',
            'Pagos elevados que limitan mi presupuesto',
            'Deuda manejable',
            'Sin deuda o con obligaciones mínimas',
          ],
        },
        portfolioShare: {
          title: '¿Qué proporción de tus ahorros accesibles está en esta cartera?',
          hint: 'No incluyas propiedades difíciles de vender.',
          options: ['Más del 60%', '35-60%', '15-35%', 'Menos del 15%'],
        },
        comfortLoss: {
          title: '¿Qué caída anual podrías tolerar emocionalmente?',
          hint: 'Supón una cartera diversificada y sin garantía de recuperación rápida.',
          options: ['Aproximadamente 5%', 'Aproximadamente 10%', 'Aproximadamente 20%', '35% o más'],
        },
        drawdown: {
          title: 'Tus inversiones caen 25% en tres meses. ¿Cómo reaccionarías?',
          hint: 'Responde según lo que harías realmente.',
          options: [
            'Vendería casi todo',
            'Reduciría la exposición',
            'Mantendría y revisaría los fundamentos',
            'Compraría más si la tesis sigue intacta',
          ],
        },
        tradeoff: {
          title: '¿Qué equilibrio prefieres?',
          hint: 'Mayor potencial implica caídas más profundas y prolongadas.',
          options: [
            'Preservar capital aunque crezca poco',
            'Estabilidad con algo de crecimiento',
            'Equilibrio de crecimiento y volatilidad',
            'Máximo crecimiento aun con caídas fuertes',
          ],
        },
        experience: {
          title: '¿Cuánta experiencia práctica tienes invirtiendo?',
          hint: 'La experiencia no incrementa por sí sola tu capacidad financiera.',
          options: ['Estoy comenzando', 'Menos de 2 años', '2-5 años', 'Más de 5 años'],
        },
        sectors: {
          title: '¿Qué sectores entiendes mejor?',
          hint: 'Opcional. Elige hasta cuatro. No aumenta tu puntuación de riesgo.',
          options: [
            'Tecnología e IA',
            'Servicios financieros',
            'Salud',
            'Industria',
            'Energía',
            'Consumo',
            'Materiales',
            'Inmobiliario',
          ],
        },
      },
      bands: ['Preservación de capital', 'Cauteloso', 'Equilibrado', 'Orientado al crecimiento', 'Agresivo'],
      flags: {
        short_horizon: 'La necesidad de retirar pronto limita el tiempo de recuperación.',
        thin_reserves: 'Las reservas para emergencias son limitadas frente a los gastos básicos.',
        negative_cashflow: 'El gasto mensual supera los ingresos.',
        high_cost_debt: 'La deuda de interés elevado compite con la inversión.',
        fixed_goal: 'Los compromisos esenciales exigen protección del capital.',
        unstable_income: 'Los ingresos variables reducen la resiliencia.',
        dependents: 'Las personas dependientes elevan el coste de una pérdida.',
        large_exposure: 'Gran parte de los ahorros accesibles está invertida.',
        minor: 'Para menores de 18 años se requiere orientación adulta.',
        gap: 'La tolerancia emocional supera la capacidad financiera.',
      },
      guidance: {
        low: 'Mantén disponible el dinero para obligaciones próximas; revisa reservas y deudas antes de aumentar la volatilidad.',
        gap: 'Tu capacidad de absorber pérdidas es menor que tu apetito; revisa tamaño de posiciones y diversificación.',
        balanced: 'Reevalúa el perfil ante cambios relevantes de ingresos, dependientes u objetivos.',
      },
    },
  };
  const clamp = (x) => Math.round(Math.min(100, Math.max(0, x)));
  const val = (answers, key) => SCALES[key][Q[key].indexOf(answers[key])];
  function validate(answers) {
    if (!answers || typeof answers !== 'object' || Array.isArray(answers))
      throw new Error('Answers must be an object.');
    const out = {};
    for (const [key, allowed] of Object.entries(Q)) {
      if (key === 'sectors') {
        const list = answers.sectors === undefined ? [] : answers.sectors;
        if (
          !Array.isArray(list) ||
          list.length > 4 ||
          new Set(list).size !== list.length ||
          list.some((x) => !allowed.includes(x))
        )
          throw new Error('Select up to four supported sectors.');
        out.sectors = list;
      } else if (!allowed.includes(answers[key])) throw new Error('Missing or invalid answer: ' + key);
      else out[key] = answers[key];
    }
    return out;
  }
  function score(answers) {
    const a = validate(answers);
    const willingness = clamp(
      0.35 * val(a, 'comfortLoss') +
        0.38 * val(a, 'drawdown') +
        0.22 * val(a, 'tradeoff') +
        0.05 * val(a, 'experience'),
    );
    let capacity = clamp(
      0.26 * val(a, 'horizon') +
        0.27 * val(a, 'runway') +
        0.13 * val(a, 'cashflow') +
        0.1 * val(a, 'income') +
        0.07 * val(a, 'dependents') +
        0.1 * val(a, 'debt') +
        0.07 * val(a, 'portfolioShare'),
    );
    const flags = [];
    const flag = (yes, id) => {
      if (yes) flags.push(id);
    };
    flag(a.horizon === 'under2', 'short_horizon');
    flag(['under1', 'one3'].includes(a.runway), 'thin_reserves');
    flag(a.cashflow === 'negative', 'negative_cashflow');
    flag(a.debt === 'highCost', 'high_cost_debt');
    flag(['essential', 'committed'].includes(a.goal) && ['under2', 'two5'].includes(a.horizon), 'fixed_goal');
    flag(['unpredictable', 'variable'].includes(a.income), 'unstable_income');
    flag(a.dependents !== 'none', 'dependents');
    flag(a.portfolioShare === 'over60', 'large_exposure');
    flag(a.ageBand === 'under18', 'minor');
    if (a.horizon === 'under2') capacity = Math.min(capacity, 25);
    if (a.horizon === 'two5' && a.goal === 'essential') capacity = Math.min(capacity, 43);
    if (a.runway === 'under1') capacity = Math.min(capacity, 22);
    if (a.runway === 'one3') capacity = Math.min(capacity, 38);
    if (a.cashflow === 'negative') capacity = Math.min(capacity, 30);
    if (a.debt === 'highCost') capacity = Math.min(capacity, 35);
    if (a.runway === 'under1' && a.dependents === 'twoPlus') capacity = Math.min(capacity, 20);
    if (a.ageBand === 'under18') capacity = Math.min(capacity, 10);
    const suggested = Math.min(willingness, capacity);
    if (willingness > capacity + 15) flags.push('gap');
    return {
      version: MODEL_VERSION,
      willingness,
      capacity,
      suggested,
      flags,
      category: band(suggested),
      method: 'Transparent heuristic (not a validated suitability test)',
      answers: a,
    };
  }
  function band(v) {
    return v < 25 ? 0 : v < 45 ? 1 : v < 65 ? 2 : v < 80 ? 3 : 4;
  }
  return { VERSION: MODEL_VERSION, Q, SCREENS, T, validate, score, band };
});
