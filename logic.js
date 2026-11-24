/* Portafolio Manager — deterministic, browser-first investment math.
   Source values can be demo estimates or independently sourced; UI must label them. */
(function (root) {
  'use strict';
  const LAYERS = {
    nube: { name: 'Nube y plataformas', min: 22, max: 28, cap: 40, kind: 'ia' },
    memoria: { name: 'Memoria', min: null, max: 18, cap: 40, kind: 'ia' },
    software: { name: 'Software IA y ciber', min: 12, max: 16, cap: 40, kind: 'ia' },
    equipos: { name: 'Fabricación y equipos', min: 10, max: 12, cap: 40, kind: 'ia' },
    chips: { name: 'Cómputo y chips a medida', min: 10, max: 14, cap: 40, kind: 'ia' },
    energiaia: { name: 'Energía e infraestructura IA', min: 3, max: 6, cap: 40, kind: 'ia' },
    redes: { name: 'Redes y óptica IA', min: null, max: null, cap: 40, kind: 'ia' },
    indice: { name: 'Índice amplio', min: 5, max: 10, cap: 40, kind: 'indice' },
    defensivo: { name: 'Defensivo', min: 5, max: 10, cap: 40, kind: 'defensivo' },
    diversificacion: { name: 'Otros sectores', min: null, max: null, cap: 40, kind: 'diversificacion' },
  };
  const SECTORS = [
    'Tecnología',
    'Semiconductores',
    'Comunicaciones e internet',
    'Consumo discrecional',
    'Consumo básico',
    'Salud',
    'Financieras',
    'Industria',
    'Petróleo y gas',
    'Eléctricas',
    'Materiales',
    'Inmobiliario',
  ];
  const SECTOR_WEIGHTS = {
    Tecnología: 34.5,
    Financieras: 13.2,
    'Consumo discrecional': 10.5,
    'Comunicaciones e internet': 10.1,
    Salud: 9.0,
    Industria: 8.3,
    'Consumo básico': 4.9,
    'Petróleo y gas': 2.9,
    Eléctricas: 2.4,
    Inmobiliario: 2.0,
    Materiales: 1.8,
  }; // S&P Dow Jones 2025-10-31: illustrative context, dated.
  const RAW = [
    ['NVDA', 'NVIDIA', 'Semiconductores', 'chips'],
    ['AVGO', 'Broadcom', 'Semiconductores', 'chips'],
    ['AMD', 'Advanced Micro Devices', 'Semiconductores', 'chips'],
    ['MRVL', 'Marvell Technology', 'Semiconductores', 'chips'],
    ['ARM', 'Arm Holdings', 'Semiconductores', 'chips'],
    ['QCOM', 'Qualcomm', 'Semiconductores', 'chips'],
    ['INTC', 'Intel', 'Semiconductores', 'chips'],
    ['MU', 'Micron Technology', 'Semiconductores', 'memoria'],
    ['SNDK', 'Sandisk', 'Semiconductores', 'memoria'],
    ['WDC', 'Western Digital', 'Tecnología', 'memoria'],
    ['STX', 'Seagate', 'Tecnología', 'memoria'],
    ['TSM', 'TSMC', 'Semiconductores', 'equipos'],
    ['ASML', 'ASML Holding', 'Semiconductores', 'equipos'],
    ['AMAT', 'Applied Materials', 'Semiconductores', 'equipos'],
    ['LRCX', 'Lam Research', 'Semiconductores', 'equipos'],
    ['KLAC', 'KLA Corporation', 'Semiconductores', 'equipos'],
    ['TER', 'Teradyne', 'Semiconductores', 'equipos'],
    ['ENTG', 'Entegris', 'Semiconductores', 'equipos'],
    ['ONTO', 'Onto Innovation', 'Semiconductores', 'equipos'],
    ['MKSI', 'MKS Instruments', 'Semiconductores', 'equipos'],
    ['ANET', 'Arista Networks', 'Tecnología', 'redes'],
    ['CSCO', 'Cisco Systems', 'Tecnología', 'redes'],
    ['CIEN', 'Ciena', 'Tecnología', 'redes'],
    ['COHR', 'Coherent', 'Tecnología', 'redes'],
    ['LITE', 'Lumentum', 'Tecnología', 'redes'],
    ['GLW', 'Corning', 'Tecnología', 'redes'],
    ['CRDO', 'Credo Technology', 'Tecnología', 'redes'],
    ['ALAB', 'Astera Labs', 'Tecnología', 'redes'],
    ['AAOI', 'Applied Optoelectronics', 'Tecnología', 'redes'],
    ['DELL', 'Dell Technologies', 'Tecnología', 'redes'],
    ['SMCI', 'Super Micro Computer', 'Tecnología', 'redes'],
    ['HPE', 'Hewlett Packard Enterprise', 'Tecnología', 'redes'],
    ['MSFT', 'Microsoft', 'Tecnología', 'nube'],
    ['AMZN', 'Amazon', 'Consumo discrecional', 'nube'],
    ['GOOGL', 'Alphabet', 'Comunicaciones e internet', 'nube'],
    ['META', 'Meta Platforms', 'Comunicaciones e internet', 'nube'],
    ['ORCL', 'Oracle', 'Tecnología', 'nube'],
    ['CRWV', 'CoreWeave', 'Tecnología', 'nube'],
    ['NBIS', 'Nebius', 'Tecnología', 'nube'],
    ['IREN', 'IREN', 'Tecnología', 'nube'],
    ['PLTR', 'Palantir', 'Tecnología', 'software'],
    ['NOW', 'ServiceNow', 'Tecnología', 'software'],
    ['SNOW', 'Snowflake', 'Tecnología', 'software'],
    ['DDOG', 'Datadog', 'Tecnología', 'software'],
    ['MDB', 'MongoDB', 'Tecnología', 'software'],
    ['CRM', 'Salesforce', 'Tecnología', 'software'],
    ['ADBE', 'Adobe', 'Tecnología', 'software'],
    ['INTU', 'Intuit', 'Tecnología', 'software'],
    ['APP', 'AppLovin', 'Tecnología', 'software'],
    ['SHOP', 'Shopify', 'Tecnología', 'software'],
    ['TEAM', 'Atlassian', 'Tecnología', 'software'],
    ['WDAY', 'Workday', 'Tecnología', 'software'],
    ['CRWD', 'CrowdStrike', 'Tecnología', 'software'],
    ['PANW', 'Palo Alto Networks', 'Tecnología', 'software'],
    ['ZS', 'Zscaler', 'Tecnología', 'software'],
    ['FTNT', 'Fortinet', 'Tecnología', 'software'],
    ['NET', 'Cloudflare', 'Tecnología', 'software'],
    ['S', 'SentinelOne', 'Tecnología', 'software'],
    ['OKTA', 'Okta', 'Tecnología', 'software'],
    ['CYBR', 'CyberArk', 'Tecnología', 'software'],
    ['CHKP', 'Check Point', 'Tecnología', 'software'],
    ['GEV', 'GE Vernova', 'Industria', 'energiaia'],
    ['VRT', 'Vertiv', 'Industria', 'energiaia'],
    ['NRG', 'NRG Energy', 'Eléctricas', 'energiaia'],
    ['VST', 'Vistra', 'Eléctricas', 'energiaia'],
    ['CEG', 'Constellation Energy', 'Eléctricas', 'energiaia'],
    ['ETN', 'Eaton', 'Industria', 'energiaia'],
    ['TLN', 'Talen Energy', 'Eléctricas', 'energiaia'],
    ['OKLO', 'Oklo', 'Eléctricas', 'energiaia'],
    ['SMR', 'NuScale Power', 'Industria', 'energiaia'],
    ['BE', 'Bloom Energy', 'Industria', 'energiaia'],
    ['PWR', 'Quanta Services', 'Industria', 'energiaia'],
    ['NEE', 'NextEra Energy', 'Eléctricas', 'energiaia'],
    ['CCJ', 'Cameco', 'Materiales', 'energiaia'],
    ['EME', 'EMCOR', 'Industria', 'energiaia'],
    ['MTZ', 'MasTec', 'Industria', 'energiaia'],
    ['MOD', 'Modine', 'Industria', 'energiaia'],
    ['AAPL', 'Apple', 'Tecnología', 'diversificacion'],
    ['TSLA', 'Tesla', 'Consumo discrecional', 'diversificacion'],
    ['NFLX', 'Netflix', 'Comunicaciones e internet', 'diversificacion'],
    ['UBER', 'Uber Technologies', 'Industria', 'diversificacion'],
    ['ABNB', 'Airbnb', 'Consumo discrecional', 'diversificacion'],
    ['SPOT', 'Spotify', 'Comunicaciones e internet', 'diversificacion'],
    ['RDDT', 'Reddit', 'Comunicaciones e internet', 'diversificacion'],
    ['JPM', 'JPMorgan Chase', 'Financieras', 'diversificacion'],
    ['V', 'Visa', 'Financieras', 'diversificacion'],
    ['MA', 'Mastercard', 'Financieras', 'diversificacion'],
    ['AXP', 'American Express', 'Financieras', 'diversificacion'],
    ['GS', 'Goldman Sachs', 'Financieras', 'diversificacion'],
    ['MS', 'Morgan Stanley', 'Financieras', 'diversificacion'],
    ['BLK', 'BlackRock', 'Financieras', 'diversificacion'],
    ['SOFI', 'SoFi', 'Financieras', 'diversificacion'],
    ['NU', 'Nu Holdings', 'Financieras', 'diversificacion'],
    ['HOOD', 'Robinhood', 'Financieras', 'diversificacion'],
    ['COIN', 'Coinbase', 'Financieras', 'diversificacion'],
    ['PYPL', 'PayPal', 'Financieras', 'diversificacion'],
    ['SCHW', 'Charles Schwab', 'Financieras', 'diversificacion'],
    ['SPGI', 'S&P Global', 'Financieras', 'diversificacion'],
    ['BX', 'Blackstone', 'Financieras', 'diversificacion'],
    ['KKR', 'KKR', 'Financieras', 'diversificacion'],
    ['LLY', 'Eli Lilly', 'Salud', 'diversificacion'],
    ['UNH', 'UnitedHealth', 'Salud', 'diversificacion'],
    ['JNJ', 'Johnson & Johnson', 'Salud', 'defensivo'],
    ['ABBV', 'AbbVie', 'Salud', 'diversificacion'],
    ['MRK', 'Merck', 'Salud', 'diversificacion'],
    ['NVO', 'Novo Nordisk', 'Salud', 'diversificacion'],
    ['ISRG', 'Intuitive Surgical', 'Salud', 'diversificacion'],
    ['VRTX', 'Vertex Pharmaceuticals', 'Salud', 'diversificacion'],
    ['AMGN', 'Amgen', 'Salud', 'diversificacion'],
    ['NVS', 'Novartis', 'Salud', 'diversificacion'],
    ['TMO', 'Thermo Fisher', 'Salud', 'diversificacion'],
    ['BSX', 'Boston Scientific', 'Salud', 'diversificacion'],
    ['SYK', 'Stryker', 'Salud', 'diversificacion'],
    ['PG', 'Procter & Gamble', 'Consumo básico', 'defensivo'],
    ['KO', 'Coca-Cola', 'Consumo básico', 'defensivo'],
    ['PEP', 'PepsiCo', 'Consumo básico', 'defensivo'],
    ['COST', 'Costco', 'Consumo básico', 'diversificacion'],
    ['WMT', 'Walmart', 'Consumo básico', 'diversificacion'],
    ['MCD', "McDonald's", 'Consumo discrecional', 'diversificacion'],
    ['SBUX', 'Starbucks', 'Consumo discrecional', 'diversificacion'],
    ['NKE', 'Nike', 'Consumo discrecional', 'diversificacion'],
    ['HD', 'Home Depot', 'Consumo discrecional', 'diversificacion'],
    ['CMG', 'Chipotle', 'Consumo discrecional', 'diversificacion'],
    ['BKNG', 'Booking Holdings', 'Consumo discrecional', 'diversificacion'],
    ['GE', 'GE Aerospace', 'Industria', 'diversificacion'],
    ['CAT', 'Caterpillar', 'Industria', 'diversificacion'],
    ['DE', 'Deere & Company', 'Industria', 'diversificacion'],
    ['HON', 'Honeywell', 'Industria', 'diversificacion'],
    ['RTX', 'RTX', 'Industria', 'diversificacion'],
    ['LMT', 'Lockheed Martin', 'Industria', 'diversificacion'],
    ['BA', 'Boeing', 'Industria', 'diversificacion'],
    ['UNP', 'Union Pacific', 'Industria', 'diversificacion'],
    ['XOM', 'Exxon Mobil', 'Petróleo y gas', 'diversificacion'],
    ['CVX', 'Chevron', 'Petróleo y gas', 'diversificacion'],
    ['COP', 'ConocoPhillips', 'Petróleo y gas', 'diversificacion'],
    ['FCX', 'Freeport-McMoRan', 'Materiales', 'diversificacion'],
    ['RIO', 'Rio Tinto', 'Materiales', 'diversificacion'],
    ['NEM', 'Newmont', 'Materiales', 'diversificacion'],
    ['SCCO', 'Southern Copper', 'Materiales', 'diversificacion'],
    ['LIN', 'Linde', 'Materiales', 'diversificacion'],
    ['SHW', 'Sherwin-Williams', 'Materiales', 'diversificacion'],
    ['TT', 'Trane Technologies', 'Industria', 'diversificacion'],
    ['PH', 'Parker-Hannifin', 'Industria', 'diversificacion'],
    ['WM', 'Waste Management', 'Industria', 'diversificacion'],
    ['AXON', 'Axon Enterprise', 'Industria', 'diversificacion'],
    ['HWM', 'Howmet Aerospace', 'Industria', 'diversificacion'],
    ['O', 'Realty Income', 'Inmobiliario', 'diversificacion'],
    ['EQIX', 'Equinix', 'Inmobiliario', 'diversificacion'],
    ['DLR', 'Digital Realty', 'Inmobiliario', 'diversificacion'],
    ['PLD', 'Prologis', 'Inmobiliario', 'diversificacion'],
    ['AMT', 'American Tower', 'Inmobiliario', 'diversificacion'],
    ['AWK', 'American Water Works', 'Eléctricas', 'diversificacion'],
    ['DUK', 'Duke Energy', 'Eléctricas', 'diversificacion'],
    ['WCN', 'Waste Connections', 'Industria', 'diversificacion'],
    ['T', 'AT&T', 'Comunicaciones e internet', 'diversificacion'],
    ['VZ', 'Verizon', 'Comunicaciones e internet', 'diversificacion'],
    ['TMUS', 'T-Mobile', 'Comunicaciones e internet', 'diversificacion'],
    ['DIS', 'Disney', 'Comunicaciones e internet', 'diversificacion'],
    ['VOO', 'Vanguard S&P 500 ETF', 'Tecnología', 'indice'],
    ['QQQ', 'Invesco Nasdaq 100 ETF', 'Tecnología', 'indice'],
    ['SPY', 'SPDR S&P 500 ETF', 'Tecnología', 'indice'],
  ];
  function hash(str) {
    let n = 2166136261;
    for (const c of String(str)) {
      n = Math.imul(n ^ c.charCodeAt(0), 16777619);
    }
    return n >>> 0;
  }
  function rnd(t, off = 0) {
    return (hash(t + ':' + off) % 100000) / 100000;
  }
  const CATALOG = RAW.map(([ticker, name, sector, layer], i) => {
    const r = rnd(ticker);
    const growth =
      layer === 'software' || layer === 'chips'
        ? 0.1 + r * 0.36
        : layer === 'defensivo'
          ? 0.01 + r * 0.075
          : 0.04 + r * 0.22;
    const price = Math.round((20 + 550 * rnd(ticker, 1)) * 100) / 100;
    const gp = (rnd(ticker, 4) - 0.37) * 0.38;
    return {
      ticker,
      name,
      sector,
      layer,
      track: ['diversificacion', 'defensivo', 'indice'].includes(layer) ? 'diversificacion' : 'ia',
      price,
      prev: price / (1 + gp / 15),
      day: (gp / 15) * 100,
      week: (rnd(ticker, 2) - 0.5) * 18,
      month: (rnd(ticker, 3) - 0.48) * 29,
      threeMonth: (rnd(ticker, 5) - 0.4) * 47,
      year: (rnd(ticker, 6) - 0.42) * 68,
      cap: 5e9 + Math.pow(rnd(ticker, 7), 3) * 3e12,
      revenueGrowth: growth * 100,
      opMargin: 8 + rnd(ticker, 8) * 35,
      fcfMargin: 4 + rnd(ticker, 9) * 28,
      earningsYield: 1.7 + rnd(ticker, 10) * 6,
      debtEquity: 0.05 + rnd(ticker, 11) * 1.2,
      mom6: (rnd(ticker, 12) - 0.4) * 75,
      mom12: (rnd(ticker, 13) - 0.3) * 95,
      vol: 19 + rnd(ticker, 14) * 41,
      beta: 0.7 + rnd(ticker, 15) * 1.3,
      fromHigh: 3 + rnd(ticker, 16) * 48,
      eps: price * (0.02 + rnd(ticker, 17) * 0.036),
      fcfps: price * (0.016 + rnd(ticker, 18) * 0.032),
      provenance: 'demo',
      sampleDate: '2026-11-22',
      demo: true,
      summary: '',
    };
  });
  const BY_TICKER = Object.fromEntries(CATALOG.map((s) => [s.ticker, s]));
  const SAMPLE_HOLDINGS = [
    { ticker: 'MU', shares: 23, cost: 90 },
    { ticker: 'TSM', shares: 12, cost: 117 },
    { ticker: 'NVDA', shares: 17, cost: 98 },
    { ticker: 'MSFT', shares: 5, cost: 360 },
    { ticker: 'GOOGL', shares: 8, cost: 138 },
    { ticker: 'CRWD', shares: 6, cost: 270 },
    { ticker: 'ASML', shares: 2, cost: 680 },
    { ticker: 'AVGO', shares: 8, cost: 150 },
    { ticker: 'VRT', shares: 8, cost: 86 },
    { ticker: 'VOO', shares: 3, cost: 420 },
    { ticker: 'PG', shares: 7, cost: 150 },
  ];
  const SCHEDULE = [
    {
      name: 'Radar diario',
      time: '06:17',
      cron: '17 6 * * *',
      desc: 'Top subidas y caídas · causas verificadas · solicitudes de research',
    },
    {
      name: 'Research / Ruleta',
      time: '06:47',
      cron: '47 6 * * *',
      desc: '3–6 análisis nuevos · equilibrio IA y diversificación',
    },
    {
      name: 'Noticias y precios',
      time: '07:06–21:06',
      cron: '6 7-21 * * *',
      desc: 'Cada hora · alertas materiales, zona de entrada y recalcular plan',
    },
    {
      name: 'Cierre diario',
      time: '17:31',
      cron: '31 17 * * 1-5',
      desc: 'Lunes a viernes · cartera, watchlist, causas y evolución',
    },
    {
      name: 'Fichas',
      time: 'Sáb 08:57',
      cron: '57 8 * * 6',
      desc: 'Economics N1 · valoración · zona · regla de salida',
    },
    {
      name: 'Informe semanal',
      time: 'Dom 07:58',
      cron: '58 7 * * 0',
      desc: 'Cartera · nuevos hallazgos · visión alcista y bajista',
    },
  ];
  const todayLima = () =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  function round(n, d = 2) {
    return Number.isFinite(n) ? Math.round(n * 10 ** d) / 10 ** d : null;
  }
  function clamp(n, a, b) {
    return Math.min(b, Math.max(a, n));
  }
  function money(n, dec = 0) {
    return Number.isFinite(n)
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: dec,
          maximumFractionDigits: dec,
        }).format(n)
      : '—';
  }
  function pct(n, d = 1) {
    return Number.isFinite(n) ? `${n > 0 ? '+' : ''}${n.toFixed(d)}%` : '—';
  }
  function featureVec(s) {
    return [
      Math.log(Math.max(1, s.cap || 1)),
      s.revenueGrowth,
      s.opMargin,
      s.fcfMargin,
      s.earningsYield,
      s.debtEquity,
      s.mom6,
      s.mom12,
      s.vol,
      s.beta,
      s.fromHigh,
    ];
  }
  // Reference means/SDs for scoring. options.minObs: a factor observed in fewer entries is
  // omitted (SD 0 -> neutral), so a handful of verified values never define a "normal" range.
  function featureModel(list = CATALOG, options = {}) {
    const raw = list.map(featureVec),
      means = [],
      stdev = [],
      minObs = Number.isFinite(options.minObs) ? options.minObs : 2;
    for (let j = 0; j < 11; j++) {
      const values = raw.map((row) => row[j]).filter(Number.isFinite),
        mu = values.reduce((a, b) => a + b, 0) / (values.length || 1);
      const sig =
        values.length >= minObs
          ? Math.sqrt(values.reduce((a, b) => a + (b - mu) ** 2, 0) / Math.max(values.length - 1, 1))
          : 0;
      means.push(mu);
      stdev.push(sig);
    }
    const enc = (s) => {
      const vv = featureVec(s).map((v, j) =>
        Number.isFinite(v) && stdev[j] > 1e-10 ? clamp((v - means[j]) / stdev[j], -3, 3) : 0,
      );
      return vv.concat(SECTORS.map((sec) => (sec === s.sector ? 1 : 0)));
    };
    return { enc, means, stdev };
  }
  const FEATURES = featureModel();
  function sigmoid(z) {
    if (z > 30) return 1;
    if (z < -30) return 0;
    return 1 / (1 + Math.exp(-z));
  }
  function dot(a, b) {
    let x = 0;
    for (let i = 0; i < a.length; i++) x += (a[i] || 0) * (b[i] || 0);
    return x;
  }
  function cosine(a, b) {
    let p = dot(a, b),
      aa = Math.sqrt(dot(a, a)),
      bb = Math.sqrt(dot(b, b));
    return aa > 1e-9 && bb > 1e-9 ? p / (aa * bb) : 0;
  }
  function portfolio(holdings = [], lookup = BY_TICKER) {
    const lines = holdings.map((h) => {
      const s = lookup[h.ticker] || {
        ticker: h.ticker,
        name: h.ticker,
        price: NaN,
        prev: NaN,
        layer: 'diversificacion',
        sector: 'Tecnología',
      };
      const val = h.shares * (Number(s.price) || 0);
      // A missing cost basis stays unknown (never 0, which would turn the whole value into profit).
      const costKnown =
        h.cost !== null && h.cost !== undefined && h.cost !== '' && Number.isFinite(Number(h.cost));
      return {
        ...h,
        stock: s,
        value: val,
        costKnown,
        investment: costKnown ? h.shares * Number(h.cost) : null,
        gain: Number.isFinite(s.price) && costKnown ? h.shares * (s.price - Number(h.cost)) : null,
        dayGain: Number.isFinite(s.prev) ? h.shares * (s.price - s.prev) : null,
      };
    });
    const value = lines.reduce((a, b) => a + b.value, 0);
    const invested = lines.reduce((a, b) => a + (Number.isFinite(b.investment) ? b.investment : 0), 0);
    const unknownCost = lines.filter((x) => !x.costKnown).map((x) => x.ticker);
    const priced = lines.filter((x) => x.value > 0);
    const dayDelta = lines.every((x) => Number.isFinite(x.dayGain))
      ? lines.reduce((a, b) => a + b.dayGain, 0)
      : null;
    const weights = {};
    const layers = {};
    const sectors = {};
    for (const l of lines) {
      l.weight = value ? (100 * l.value) / value : 0;
      weights[l.ticker] = l.weight;
      layers[l.stock.layer || 'diversificacion'] =
        (layers[l.stock.layer || 'diversificacion'] || 0) + l.weight;
      sectors[l.stock.sector || 'Tecnología'] = (sectors[l.stock.sector || 'Tecnología'] || 0) + l.weight;
    }
    const hhi = lines.reduce((a, l) => a + (l.weight / 100) ** 2, 0);
    return {
      lines,
      priced,
      value,
      invested,
      totalGain: lines.every((x) => x.gain !== null) ? lines.reduce((a, b) => a + b.gain, 0) : null,
      unknownCost,
      dayDelta,
      weights,
      layers,
      sectors,
      effective: hhi ? 1 / hhi : null,
      top: lines.slice().sort((a, b) => b.weight - a.weight),
      cash: 0,
    };
  }
  function portfolioPrior(p) {
    let m = Array(22).fill(0);
    if (!p.value) return m;
    for (const line of p.lines) {
      const x = FEATURES.enc(line.stock),
        w = line.weight / 100;
      for (let j = 0; j < 11; j++) m[j] += 0.5 * w * x[j];
    }
    for (let j = 0; j < SECTORS.length; j++) {
      const sec = SECTORS[j];
      m[11 + j] = 0.5 * ((p.sectors[sec] || 0) / 100 - 1 / SECTORS.length);
    }
    return m;
  }
  function objective(w, m, log) {
    let sum = 0;
    for (let j = 0; j < w.length; j++) sum += 0.5 * (w[j] - m[j]) ** 2;
    for (const t of log) {
      const z = dot(w, t.x),
        v = Math.max(z, 0) + Math.log1p(Math.exp(-Math.abs(z)));
      sum += t.a * (v - t.y * z);
    }
    return sum;
  }
  function trainTaste(p, swipes = [], evalTime = new Date().toISOString()) {
    const prior = portfolioPrior(p),
      d = prior.length,
      w = prior.slice(),
      at = new Date(evalTime).getTime(),
      logs = swipes
        .filter((e) => e.x && e.x.length === d)
        .map((e) => ({
          x: e.x,
          y: e.action === 'pass' ? 0 : 1,
          a: (e.action === 'super' ? 2 : 1) * (at - Date.parse(e.date) > 90 * 86400000 ? 0.5 : 1),
        }));
    const h = Array(d).fill(1);
    for (let it = 0; it < 50; it++) {
      const g = w.map((v, j) => v - prior[j]);
      h.fill(1);
      for (const l of logs) {
        const prob = sigmoid(dot(w, l.x));
        for (let j = 0; j < d; j++) {
          g[j] += l.a * (prob - l.y) * l.x[j];
          h[j] += l.a * prob * (1 - prob) * l.x[j] ** 2;
        }
      }
      if (Math.max(...g.map(Math.abs)) < 1e-6) break;
      const loss = objective(w, prior, logs);
      let step = 1,
        success = false;
      for (let back = 0; back < 16; back++) {
        const candidate = w.map((v, j) => v - (step * g[j]) / h[j]);
        if (objective(candidate, prior, logs) < loss) {
          for (let j = 0; j < d; j++) w[j] = candidate[j];
          success = true;
          break;
        }
        step /= 2;
      }
      if (!success) {
        for (let j = 0; j < d; j++) w[j] -= 0.003 * g[j];
      }
    }
    const variance = h.map((v) => 1 / v);
    return { w, variance, prior, swipes: logs.length };
  }
  function gaussian(seed) {
    const u = Math.max(rnd(String(seed), 'u'), 1e-7),
      v = rnd(String(seed), 'v');
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function scoreItem(s, p, model, mode = 'balanced', seed = 1, profile = null, features = FEATURES) {
    const F = features || FEATURES;
    const alpha = mode === 'similar' ? 0 : mode === 'diversify' ? 1 : 0.5,
      x = F.enc(s),
      whitened = model.w.map((v, j) => v + Math.sqrt(model.variance[j]) * gaussian(seed + ':' + j) * 0.12);
    const taste = sigmoid(dot(whitened, x) / 2.8);
    const reference = profile ? F.enc(profile) : p.value ? portfolioPrior(p).map((v) => v * 2) : null;
    const fit = reference ? clamp((1 + cosine(x, reference)) / 2, 0, 1) : 0.5;
    const sectWeight = p.sectors[s.sector] || 0;
    const bench = SECTOR_WEIGHTS[s.sector] || 3;
    const gap = p.value ? clamp((bench - sectWeight) / Math.max(bench, 3), 0, 1) : 0.5;
    // Correlation requires 230 common trading sessions. Without validated history its term stays neutral.
    const lowcorr = 0.5;
    const quality = clamp(
      ([s.revenueGrowth, s.opMargin, s.fcfMargin, s.mom6]
        .map((v, i) => {
          const ix = [1, 2, 3, 6][i];
          return Number.isFinite(v) && F.stdev[ix] ? (v - F.means[ix]) / F.stdev[ix] : 0;
        })
        .reduce((a, b) => a + b, 0) /
        4 +
        3) /
        6,
      0,
      1,
    );
    const score =
      0.4 * taste + 0.15 * quality + 0.45 * ((1 - alpha) * fit + alpha * (0.6 * gap + 0.4 * lowcorr));
    const parts = [
      {
        name: 'Afinidad aprendida',
        value: 0.4 * (taste - 0.5),
        detail: 'Basada en tus decisiones y tus posiciones',
        metric: taste,
      },
      {
        name: 'Calidad financiera',
        value: 0.15 * (quality - 0.5),
        detail: 'Crecimiento, márgenes, caja y momentum',
        metric: quality,
      },
      {
        name: 'Parecida a tu cartera',
        value: 0.45 * (1 - alpha) * (fit - 0.5),
        detail: 'Similitud de perfil con tus posiciones',
        metric: fit,
      },
      {
        name: 'Diversificación sectorial',
        value: 0.27 * alpha * gap,
        detail: `Peso ${round(sectWeight, 1)}% frente a referencia ${round(bench, 1)}% (S&P 500, oct. 2025)`,
        metric: gap,
      },
      { name: 'Correlación', value: 0, detail: 'Sin 230 sesiones verificadas; neutro', metric: null },
    ].sort((a, b) => b.value - a.value);
    return { stock: s, score, parts, taste, quality, fit, gap, lowcorr };
  }
  function generateDeck(
    p,
    swipes = [],
    matches = {},
    mode = 'balanced',
    seed = 1,
    count = 12,
    profile = null,
    options = {},
  ) {
    // options.universe: resolved stocks to rank (default: the seeded CATALOG).
    // options.allowSample === false (signed-in accounts): only verified candidates are ranked;
    // seeded synthetic prices/fundamentals never produce an order.
    const universe = Array.isArray(options.universe) ? options.universe : CATALOG,
      allowSample = options.allowSample !== false;
    const model = trainTaste(p, swipes);
    const cooldown = Date.now() - 60 * 86400000,
      passed = new Set(
        swipes.filter((e) => e.action === 'pass' && Date.parse(e.date) > cooldown).map((e) => e.ticker),
      );
    const held = new Set(p.lines.map((e) => e.ticker));
    // Signed-in ranking: reference statistics come from verified observations only.
    const features = allowSample
      ? FEATURES
      : featureModel(universe.filter(isVerifiedCandidate), { minObs: options.minObs || 5 });
    const available = universe.filter(
      (s) =>
        s.price > 0 &&
        (allowSample || isVerifiedCandidate(s)) &&
        !held.has(s.ticker) &&
        !matches[s.ticker] &&
        !passed.has(s.ticker),
    );
    const ranked = available
      .map((s) => scoreItem(s, p, model, mode, seed, profile, features))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(80, count));
    let chosen = [],
      bySector = {},
      byTrack = { ia: 0, diversificacion: 0 };
    const targetIA =
      mode === 'balanced'
        ? Math.ceil(count * 0.5)
        : mode === 'diversify'
          ? Math.ceil(count * 0.33)
          : Math.ceil(count * 0.67);
    while (ranked.length && chosen.length < count) {
      let bi = -1,
        best = -1e6;
      ranked.forEach((r, i) => {
        if ((bySector[r.stock.sector] || 0) >= 3) return;
        const track = r.stock.track === 'ia' ? 'ia' : 'diversificacion';
        if (track === 'ia' && byTrack.ia >= targetIA && byTrack.diversificacion < count - targetIA) return;
        if (
          track === 'diversificacion' &&
          byTrack.diversificacion >= count - targetIA &&
          byTrack.ia < targetIA
        )
          return;
        const maxSim = chosen.length
          ? Math.max(...chosen.map((k) => (1 + cosine(features.enc(r.stock), features.enc(k.stock))) / 2))
          : 0;
        const val = 0.7 * r.score - 0.3 * maxSim;
        if (val > best) {
          best = val;
          bi = i;
        }
      });
      if (bi < 0) {
        // If a line runs out of eligible stock, still offer verified alternatives rather than an empty deck.
        for (let i = 0; i < ranked.length; i++) {
          const r = ranked[i];
          if ((bySector[r.stock.sector] || 0) < 3) {
            bi = i;
            break;
          }
        }
        if (bi < 0) break;
      }
      const r = ranked.splice(bi, 1)[0];
      bySector[r.stock.sector] = (bySector[r.stock.sector] || 0) + 1;
      byTrack[r.stock.track === 'ia' ? 'ia' : 'diversificacion']++;
      chosen.push(r);
    }
    return { cards: chosen, model, remaining: available.length, byTrack, sample: allowSample, features };
  }
  function riskStats(series = [], bench = null) {
    if (!Array.isArray(series) || series.length < 3) return null;
    const rets = [];
    let peak = -Infinity,
      worst = 0;
    for (let i = 0; i < series.length; i++) {
      const val = series[i];
      if (!Number.isFinite(val) || val <= 0) return null;
      peak = Math.max(peak, val);
      worst = Math.min(worst, val / peak - 1);
      if (i && series[i - 1] > 0) rets.push(val / series[i - 1] - 1);
    }
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(rets.length - 1, 1);
    let beta = null;
    if (Array.isArray(bench) && bench.length === series.length) {
      const b = [];
      for (let i = 1; i < bench.length; i++) if (bench[i - 1] > 0) b.push(bench[i] / bench[i - 1] - 1);
      if (b.length === rets.length) {
        const bm = b.reduce((a, c) => a + c, 0) / b.length;
        const bv = b.reduce((a, c) => a + (c - bm) ** 2, 0) / Math.max(b.length - 1, 1);
        if (bv > 1e-14)
          beta =
            rets.reduce((a, c, i) => a + (c - mean) * (b[i] - bm), 0) / Math.max(rets.length - 1, 1) / bv;
      }
    }
    return {
      volatility: round(Math.sqrt(variance) * Math.sqrt(252) * 100, 1),
      beta: round(beta, 2),
      drawdown: round(worst * 100, 1),
      returnPct: round((series.at(-1) / series[0] - 1) * 100, 1),
      benchmarkPct:
        Array.isArray(bench) && bench.length === series.length
          ? round((bench.at(-1) / bench[0] - 1) * 100, 1)
          : null,
    };
  }
  function layerStatus(p, key) {
    const l = LAYERS[key],
      w = p.layers[key] || 0;
    if (!l) return { w, state: 'sin objetivo', gap: 0 };
    if (l.max !== null && w > l.max + 0.001) return { w, state: 'exceso', gap: round(w - l.max, 1) };
    if (l.min !== null && w < l.min - 0.001) return { w, state: 'bajo', gap: round(l.min - w, 1) };
    return { w, state: 'en rango', gap: 0 };
  }
  function dcfTwoStage(fcfps, growthPct, discount = 0.1, multiple = 22) {
    if (!Number.isFinite(fcfps) || fcfps <= 0) return null;
    let f = fcfps,
      pv = 0;
    for (let y = 1; y <= 10; y++) {
      f *= 1 + (y <= 5 ? growthPct : growthPct / 2) / 100;
      pv += f / (1 + discount) ** y;
    }
    return pv + (f * multiple) / (1 + discount) ** 10;
  }
  function reverseDCF(fcfps, price) {
    if (!(price > 0 && fcfps > 0)) return null;
    let lo = -50,
      hi = 100;
    for (let i = 0; i < 85; i++) {
      const mid = (lo + hi) / 2;
      if (dcfTwoStage(fcfps, mid) > price) hi = mid;
      else lo = mid;
    }
    return round((lo + hi) / 2, 1);
  }
  function valuation(s) {
    if (!s || !(s.price > 0)) return null;
    let method,
      base,
      sensitivity,
      implied = null;
    const growth = clamp(s.revenueGrowth || 0, 2, 35);
    if (growth >= 20 && s.fcfps > 0) {
      base = dcfTwoStage(s.fcfps, Math.min(growth, 30));
      sensitivity = dcfTwoStage(s.fcfps, Math.max(-5, Math.min(growth, 30) - 5));
      method = 'DCF 10 años · descuento 10% · salida 22× FCF';
      implied = reverseDCF(s.fcfps, s.price);
    } else if (s.eps > 0) {
      const multiple = clamp(14 + growth * 0.33, 14, 25);
      base = s.eps * multiple;
      sensitivity = base * 0.8;
      method = `EPS normalizado × ${round(multiple, 1)} · escenario de referencia`;
    } else return null;
    const margin = clamp(s.vol > 45 ? 0.25 : s.vol > 30 ? 0.2 : 0.15, 0.1, 0.25);
    const hi = base * (1 - margin),
      lo = hi * 0.88;
    return {
      base: round(base, 2),
      low: round(lo, 2),
      high: round(hi, 2),
      method,
      margin: round(margin * 100),
      sensitivity: round(sensitivity, 2),
      implied,
      growth: round(growth, 1),
      source: s.provenance === 'demo' ? 'demo' : 'modelo',
      note: 'La valoración depende de supuestos y no es garantía de rentabilidad.',
    };
  }
  function researchScore(s, p) {
    const v = valuation(s),
      st = layerStatus(p, s.layer);
    if (!s.demo && s.provenance !== 'sec')
      return { notes: {}, score: null, calificacion: 'Sin calificar', zone: null, status: st };
    let val = !v || !s.price ? 2.5 : clamp(2.5 + (2.5 * (v.high - s.price)) / s.price, 0, 5);
    let quality = clamp((s.revenueGrowth || 0) / 15 + (s.opMargin || 0) / 22 + (s.fcfMargin || 0) / 24, 0, 5);
    const external = s.track === 'diversificacion',
      contribution = external
        ? (p.sectors[s.sector] || 0) < 5
          ? 4
          : 3
        : st.state === 'bajo'
          ? 5
          : st.state === 'en rango'
            ? 3.5
            : 1;
    const risk = clamp(5 - (s.vol || 30) / 21 - (s.debtEquity || 0) * 0.4, 0, 5);
    const catalyst = clamp(2.4 + (s.mom6 || 0) / 45, 0, 5);
    const notes = {
      valoracion: round(val, 2),
      calidad: round(quality, 2),
      aporte: contribution,
      riesgo: round(risk, 2),
      catalizadores: round(catalyst, 2),
    };
    const score = round(
      20 * (0.3 * val + 0.25 * quality + 0.25 * contribution + 0.15 * risk + 0.05 * catalyst),
      0,
    );
    const inZone = v && s.price <= v.high;
    const signal = !v || quality < 1.3 ? 'No incorporar' : inZone ? 'Incorporar' : 'Esperar precio';
    return { notes, score, calificacion: signal, zone: v, status: st };
  }
  function projections(s) {
    if (!(s?.price > 0 && s?.eps > 0)) return null;
    const g = clamp(s.revenueGrowth || 10, 2, 30);
    const currPE = s.price / s.eps;
    const specs = [
      { name: 'Conservador', growth: Math.max(-3, g * 0.38), multiple: clamp(currPE * 0.6, 8, 24) },
      { name: 'Base', growth: Math.min(g * 0.72, 25), multiple: clamp(currPE * 0.83, 10, 34) },
      { name: 'Optimista', growth: Math.min(g * 1.1, 38), multiple: clamp(currPE * 1.05, 14, 49) },
    ];
    return specs.map((x) => {
      const price = s.eps * (1 + x.growth / 100) ** 5 * x.multiple;
      return { ...x, price: round(price, 2), anual: round(((price / s.price) ** (1 / 5) - 1) * 100, 1) };
    });
  }
  function planScenarios(p, budget, matches = {}, stocks = BY_TICKER) {
    let amount = Math.max(0, Math.floor(Number(budget) || 0));
    let choices = p.lines
      .filter(
        (x) =>
          x.stock &&
          x.stock.price > 0 &&
          (x.stock.demo ||
            (x.stock.provenance === 'sec' && researchScore(x.stock, p).calificacion === 'Incorporar')) &&
          x.stock.layer &&
          LAYERS[x.stock.layer]?.kind === 'ia' &&
          x.weight < 25,
      )
      .map((x) => ({ x, gap: layerStatus(p, x.stock.layer) }))
      .filter((k) => k.gap.state === 'bajo' || k.gap.state === 'en rango')
      .sort(
        (a, b) =>
          (({ bajo: 0, 'en rango': 1 })[a.gap.state] ?? 2) - ({ bajo: 0, 'en rango': 1 }[b.gap.state] ?? 2) ||
          a.x.weight - b.x.weight,
      );
    const affordable = Math.max(0, amount - 1);
    const result = [];
    const feasible = (ticker, monto, existing = true) => {
      const line = p.lines.find((x) => x.ticker === ticker),
        stock = stocks[ticker];
      if (!stock || !stock.price) return false;
      if (monto < (existing ? 40 : 100) || monto > affordable) return false;
      const val = p.value + monto;
      const newPos = (line?.value || 0) + monto;
      const layer = stock.layer;
      const newLayer = ((p.layers[layer] || 0) * p.value) / 100 + monto;
      const max = LAYERS[layer]?.max;
      if (newPos / val > 0.25 + 0.0001) return false;
      if (max !== null && max !== undefined && (newLayer / val) * 100 > max + 0.01) return false;
      return true;
    };
    const best = choices.find((k) => feasible(k.x.ticker, affordable, true));
    if (best) {
      result.push({
        id: 'A',
        title: 'Cerrar una brecha IA',
        ticker: best.x.ticker,
        amount: affordable,
        fee: 1,
        score: researchScore(best.x.stock, p).score ?? 0,
        notes: researchScore(best.x.stock, p).notes,
        description: `Refuerza ${LAYERS[best.x.stock.layer].name}, que está ${best.gap.state === 'bajo' ? 'bajo su objetivo' : 'dentro de su rango'}.`,
        recommended: true,
      });
    }
    const next = choices
      .filter((k) => k.x.ticker !== best?.x.ticker)
      .find((k) => feasible(k.x.ticker, affordable, true));
    if (next)
      result.push({
        id: 'B',
        title: 'Reforzar otra posición',
        ticker: next.x.ticker,
        amount: affordable,
        fee: 1,
        score: researchScore(next.x.stock, p).score ?? 0,
        notes: researchScore(next.x.stock, p).notes,
        description: 'Alternativa dentro de los límites de concentración.',
        recommended: false,
      });
    const newcomer = Object.keys(matches)
      .filter((t) => matches[t]?.status === 'mantener' && !(t in p.weights))
      .map((t) => stocks[t])
      .filter(Boolean)
      .find(
        (s) =>
          s.track === 'ia' &&
          s.provenance === 'sec' &&
          researchScore(s, p).calificacion === 'Incorporar' &&
          feasible(s.ticker, affordable, false),
      );
    if (newcomer) {
      result.push({
        id: 'C',
        title: 'Nueva posición de watchlist',
        ticker: newcomer.ticker,
        amount: affordable,
        fee: 1,
        score: researchScore(newcomer, p).score ?? 0,
        notes: researchScore(newcomer, p).notes,
        description: 'Solo si la ficha oficial está verificada y la tesis sigue intacta.',
        recommended: false,
        requiresVerification: true,
      });
    }
    if (result.length) {
      const top = result.reduce((best, x) => (x.score > best.score ? x : best), result[0]);
      result.forEach((x) => (x.recommended = x === top));
    }
    if (!result.length) {
      result.push({
        id: 'CASH',
        title: 'Esperar con una condición',
        ticker: null,
        amount: amount,
        fee: 0,
        score: 0,
        description:
          'No hay una propuesta que respete mínimos y límites. Revisar tras un cambio de precio, cartera o presupuesto.',
        recommended: true,
      });
    }
    return result;
  }
  // Only absolute https: URLs (and http: when allowHttp is set, e.g. news feeds) may become an href.
  // Anything else (javascript:, data:, relative paths, malformed values) returns null: render it as text.
  function safeUrl(url, options = {}) {
    const raw = String(url ?? '').trim();
    if (!raw || /[\u0000- \u007f]/.test(raw)) return null;
    let u;
    try {
      u = new URL(raw);
    } catch {
      return null;
    }
    const ok = u.protocol === 'https:' || (options.allowHttp === true && u.protocol === 'http:');
    return ok && u.hostname ? u.href : null;
  }
  // A seeded catalog entry may only be ranked for a signed-in account once its price is a live
  // Yahoo quote (not a CSV or sample price) and its fundamentals come from verified SEC research.
  function isVerifiedCandidate(s) {
    return Boolean(
      s &&
      s.demo !== true &&
      s.provenance === 'sec' &&
      s.quoteProvenance === 'yahoo' &&
      Number.isFinite(s.price) &&
      s.price > 0,
    );
  }
  // Scale an illustrative series so its last point equals the current (demo) position value.
  function anchorSeries(values = [], target) {
    const last = values.length ? Number(values[values.length - 1]) : NaN;
    if (!(Number.isFinite(target) && target > 0) || !(Number.isFinite(last) && last > 0))
      return values.slice();
    const k = target / last;
    return values.map((v) => v * k);
  }
  const CURRENCY_CODES = [
    'USD',
    'EUR',
    'GBP',
    'JPY',
    'CAD',
    'AUD',
    'CHF',
    'MXN',
    'PEN',
    'BRL',
    'CLP',
    'COP',
    'HKD',
  ];
  const CURRENCY_MARKS = [
    ['US$', 'USD'],
    ['CA$', 'CAD'],
    ['C$', 'CAD'],
    ['A$', 'AUD'],
    ['R$', 'BRL'],
    ['S/', 'PEN'],
    ['€', 'EUR'],
    ['£', 'GBP'],
    ['¥', 'JPY'],
    ['$', 'USD'],
  ];
  // Strip currency marks and sign from a cell. Returns { text, currency, negative } or { empty: true }.
  function numberToken(v) {
    let x = String(v ?? '')
      .trim()
      .replace(/[\s  ]/g, '');
    if (!x || x === '—' || x === '-' || /^n\/?a$/i.test(x)) return { empty: true };
    let currency = null;
    const code = x.match(/^([A-Za-z]{3})(?=[\d.,(+-])|(?<=[\d.,)])([A-Za-z]{3})$/);
    if (code && CURRENCY_CODES.includes((code[1] || code[2]).toUpperCase())) {
      currency = (code[1] || code[2]).toUpperCase();
      x = x.replace(code[0], '');
    }
    for (const [mark, cur] of CURRENCY_MARKS) {
      if (x.includes(mark)) {
        if (currency && currency !== cur) return { text: x, currency, conflict: true };
        currency = cur;
        x = x.split(mark).join('');
        break;
      }
    }
    let negative = false;
    if (/^\(.*\)$/.test(x)) {
      negative = true;
      x = x.slice(1, -1);
    }
    if (/^[-−]/.test(x)) {
      negative = true;
      x = x.slice(1);
    } else if (x.startsWith('+')) x = x.slice(1);
    return { text: x, currency, negative };
  }
  // What a numeric string says about the decimal separator: 'comma', 'dot', 'none' (integer),
  // 'ambiguous' (e.g. 1,234 or 1.234: thousands or decimals?) or 'invalid'.
  function separatorEvidence(t) {
    if (!/^[\d.,]+$/.test(t) || !/\d/.test(t)) return 'invalid';
    const commas = t.split(',').length - 1,
      dots = t.split('.').length - 1;
    if (!commas && !dots) return 'none';
    if (commas && dots) return t.lastIndexOf(',') > t.lastIndexOf('.') ? 'comma' : 'dot';
    const ch = commas ? ',' : '.',
      kind = commas ? 'comma' : 'dot',
      other = commas ? 'dot' : 'comma',
      parts = t.split(ch);
    if (parts.length > 2)
      return parts[0].length >= 1 && parts[0].length <= 3 && parts.slice(1).every((p) => p.length === 3)
        ? other
        : 'invalid';
    const [a, b] = parts;
    if (!b.length) return 'invalid';
    if (b.length !== 3 || !a.length || a.length > 3 || a.startsWith('0')) return kind;
    return 'ambiguous';
  }
  function toNumber(t, decimal) {
    const decCh = decimal === 'comma' ? ',' : '.',
      grpCh = decimal === 'comma' ? '.' : ',';
    const pieces = t.split(decCh);
    if (pieces.length > 2) return NaN;
    const groups = pieces[0].split(grpCh);
    if (
      groups.length > 1 &&
      !(groups[0].length >= 1 && groups[0].length <= 3 && groups.slice(1).every((g) => g.length === 3))
    )
      return NaN;
    const s = groups.join('') + (pieces.length === 2 ? '.' + pieces[1] : '');
    return /^(\d+\.?\d*|\.\d+)$/.test(s) ? Number(s) : NaN;
  }
  function detectDelimiter(header) {
    const counts = { ',': 0, ';': 0, '\t': 0 };
    let quoted = false;
    for (const c of header) {
      if (c === '"') quoted = !quoted;
      else if (!quoted && c in counts) counts[c]++;
    }
    return ['\t', ';', ','].reduce((best, d) => (counts[d] > counts[best] ? d : best), ',');
  }
  // Quotes may only wrap a whole field; anything else (a stray or unterminated quote, text
  // after a closing quote) marks the line malformed instead of being silently glued together.
  function splitLine(line, delim) {
    let cells = [],
      v = '',
      quoted = false,
      wasQuoted = false,
      bad = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quoted) {
        if (c === '"') {
          if (line[i + 1] === '"') {
            v += '"';
            i++;
          } else {
            quoted = false;
            if (i + 1 < line.length && line[i + 1] !== delim) bad = true;
          }
        } else v += c;
      } else if (c === '"') {
        if (v.trim() || wasQuoted) bad = true;
        else {
          quoted = true;
          wasQuoted = true;
          v = '';
        }
      } else if (c === delim) {
        cells.push(v.trim());
        v = '';
        wasQuoted = false;
      } else v += c;
    }
    if (quoted) bad = true;
    cells.push(v.trim());
    cells.bad = bad;
    return cells;
  }
  const normKey = (x) =>
    String(x || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  // Strict table reader shared by the ledger and snapshot imports: same delimiter, quoting,
  // field-count, decimal-separator and currency rules as the holdings import. Numeric columns
  // (options.numeric, normalized header names) come back as numbers in USD; any problem rejects
  // the row with a message, and the caller must not apply a file with rejected rows.
  function strictTable(text, options = {}) {
    const M = (en, es) => (options.language === 'es' ? es : en);
    const fxRates = options.fxRates || {},
      numericKeys = new Set((options.numeric || []).map(normKey)),
      quantityKeys = new Set((options.quantity || []).map(normKey));
    const lines = String(text || '')
      .replace(/^\uFEFF/, '')
      .replace(/\r/g, '')
      .split('\n')
      .filter((x) => x.trim());
    if (!lines.length) return { rows: [], errors: [M('Empty file.', 'Archivo vacío.')] };
    const delim = detectDelimiter(lines[0]),
      head = splitLine(lines[0], delim);
    if (head.bad)
      return {
        rows: [],
        errors: [
          M('The header row has malformed quotes.', 'La fila de encabezado tiene comillas mal formadas.'),
        ],
      };
    const keys = head.map(normKey),
      numIdx = keys.map((k, i) => (numericKeys.has(k) ? i : -1)).filter((i) => i >= 0),
      curIdx = keys.findIndex((k) => ['currency', 'currencycode', 'ccy', 'moneda', 'divisa'].includes(k));
    const body = lines.slice(1).map((l) => splitLine(l, delim)),
      errors = [],
      rows = [];
    const shapeOk = (col) => !col.bad && col.length === keys.length;
    const evidence = new Set();
    for (const col of body)
      if (shapeOk(col))
        for (const i of numIdx) {
          const tok = numberToken(col[i]);
          if (tok.empty || tok.conflict) continue;
          const ev = separatorEvidence(tok.text);
          if (ev === 'comma' || ev === 'dot') evidence.add(ev);
        }
    if (evidence.size > 1)
      return {
        rows: [],
        errors: [
          M(
            'Mixed number formats in one file (both 1,5 and 1.5 styles).',
            'Formatos numéricos mezclados en un mismo archivo (1,5 y 1.5).',
          ),
        ],
      };
    const commaInCell = body.some((col) => numIdx.some((i) => String(col[i] || '').includes(',')));
    const decimal = evidence.size ? [...evidence][0] : delim === ',' && !commaInCell ? 'dot' : null;
    body.forEach((col, li) => {
      const rowNo = li + 2;
      if (col.every((v) => !v)) return;
      if (col.bad)
        return errors.push(M(`Row ${rowNo}: malformed quotes.`, `Fila ${rowNo}: comillas mal formadas.`));
      if (col.length !== keys.length)
        return errors.push(
          M(
            `Row ${rowNo}: ${col.length} fields but the header has ${keys.length}.`,
            `Fila ${rowNo}: ${col.length} campos, pero el encabezado tiene ${keys.length}.`,
          ),
        );
      const row = { __row: rowNo };
      let currency = curIdx >= 0 && col[curIdx] ? String(col[curIdx]).trim().toUpperCase() : null,
        problem = null;
      keys.forEach((k, i) => {
        if (!numIdx.includes(i)) return void (row[k] = col[i] || '');
        const tok = numberToken(col[i]);
        if (tok.empty) return void (row[k] = NaN);
        // A quantity is a count of shares, not money: a currency mark there is an error.
        if (tok.currency && quantityKeys.has(k))
          problem =
            problem ||
            M(
              `Row ${rowNo}: quantity "${col[i]}" carries a currency.`,
              `Fila ${rowNo}: la cantidad "${col[i]}" lleva moneda.`,
            );
        else if (tok.conflict || (tok.currency && currency && tok.currency !== currency))
          problem =
            problem || M(`Row ${rowNo}: conflicting currencies.`, `Fila ${rowNo}: monedas contradictorias.`);
        if (!quantityKeys.has(k)) currency = currency || tok.currency;
        const ev = separatorEvidence(tok.text);
        const n =
          ev === 'invalid' || (ev === 'ambiguous' && !decimal) ? NaN : toNumber(tok.text, decimal || 'dot');
        if (!Number.isFinite(n))
          problem =
            problem ||
            M(
              `Row ${rowNo}: "${col[i]}" is not an unambiguous number.`,
              `Fila ${rowNo}: "${col[i]}" no es un número inequívoco.`,
            );
        row[k] = tok.negative ? -n : n;
      });
      if (!problem && currency && currency !== 'USD') {
        const rate = Number(fxRates[currency]);
        // Only monetary columns are converted; quantities are never multiplied by a rate.
        if (Number.isFinite(rate) && rate > 0) {
          for (const i of numIdx) if (!quantityKeys.has(keys[i])) row[keys[i]] *= rate;
        } else
          problem = M(
            `Row ${rowNo}: amounts in ${currency} and no ${currency}→USD rate; not imported as USD.`,
            `Fila ${rowNo}: importes en ${currency} sin tipo de cambio ${currency}→USD; no se importa como USD.`,
          );
      }
      if (problem) return errors.push(problem);
      row.__currency = 'USD';
      rows.push(row);
    });
    return { rows, errors, delimiter: delim, decimal };
  }
  function parseCSV(text, options = {}) {
    // Yahoo Finance exports can have multiple tax lots for the same symbol.
    // Snapshot imports aggregate lots; a transaction ledger must not be treated as current holdings.
    // Numbers: the delimiter is detected first, then ONE decimal separator for the whole file.
    // Values that could be read two ways (1,234 / 1.234) without file-level evidence are rejected.
    // Currency: values are only labelled USD when they are USD or converted with options.fxRates
    // ({ EUR: 1.08 } = USD per unit); other non-USD rows are rejected, never relabelled.
    const fxRates = options.fxRates || {};
    // Messages added in the review carry both languages; options.language picks one.
    const M = (en, es) => (options.language === 'es' ? es : en);
    const content = String(text || '')
      .replace(/^﻿/, '')
      .replace(/\r/g, '')
      .trim();
    const lines = content.split('\n').filter((x) => x.trim());
    if (!lines.length)
      return {
        rows: [],
        errors: ['Archivo vacío. Descarga tu cartera desde Yahoo Finance → Mi cartera → Descargar.'],
        warnings: [],
      };
    const delim = detectDelimiter(lines[0]);
    const split = (line) => splitLine(line, delim);
    const norm = (x) =>
      String(x || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]/g, '');
    const head = split(lines[0]);
    if (head.bad)
      return {
        rows: [],
        errors: [
          M(
            'The header row has malformed quotes. Export the file again.',
            'La fila de encabezado tiene comillas mal formadas. Exporta el archivo de nuevo.',
          ),
        ],
        warnings: [],
      };
    const hdr = head.map(norm);
    const idx = (...aliases) => aliases.map((x) => hdr.indexOf(norm(x))).find((i) => i >= 0);
    const tid = idx(
      'symbol',
      'ticker',
      'simbolo',
      'instrument',
      'instrumentname',
      'stock',
      'security',
      'asset',
    );
    const sid = idx(
      'quantity',
      'shares',
      'qty',
      'units',
      'cantidad',
      'unidades',
      'acciones',
      'sharesowned',
      'sharequantity',
      'holdingquantity',
      'totalshares',
    );
    const cid = idx(
      'purchaseprice',
      'averagepurchaseprice',
      'avgpurchaseprice',
      'avgcost',
      'averagecost',
      'averagecostbasis',
      'costpershare',
      'costbasisps',
      'costbasisperunit',
      'averageprice',
      'buyprice',
      'cost',
      'preciocompra',
      'preciomedio',
      'precio',
    );
    const totalIdx = idx(
      'totalcostbasis',
      'totalcost',
      'costbasis',
      'costbasisusd',
      'totalinvestment',
      'investedamount',
      'investment',
    );
    const pid = idx(
      'currentprice',
      'lastprice',
      'marketprice',
      'precioactual',
      'last',
      'price',
      'regularmarketprice',
    );
    const vid = idx('previousclose', 'prevclose', 'cierreanterior');
    const typeIdx = idx('transactiontype', 'tradetype', 'action', 'type', 'tipo', 'side');
    const feeIdx = idx('commission', 'commissions', 'fees', 'fee', 'comision', 'comisiones');
    const curIdx = idx('currency', 'currencycode', 'ccy', 'moneda', 'divisa');
    if (tid === undefined || sid === undefined)
      return {
        rows: [],
        errors: [
          'Este archivo no contiene posiciones: faltan Symbol/Ticker y Quantity/Shares. Exporta una cartera con tenencias, no una watchlist de Yahoo Finance.',
        ],
        warnings: [],
      };
    if (cid === undefined && totalIdx === undefined)
      return {
        rows: [],
        errors: [
          'El CSV no incluye Purchase Price, Average Cost o Cost Basis. Yahoo puede exportar solo datos básicos; agrega el costo por acción antes de importar para no inventar tu rentabilidad.',
        ],
        warnings: [],
      };
    const numericCols = [sid, cid, totalIdx, pid, vid, feeIdx].filter((i) => i !== undefined);
    const body = lines.slice(1).map(split);
    // A row whose field count differs from the header (e.g. an unquoted 1,234 in a comma file)
    // or whose quoting is malformed is rejected before any number is read.
    const shapeError = (col, i) =>
      col.every((v) => !v)
        ? null
        : col.bad
          ? M(`Row ${i + 1}: malformed quotes.`, `Fila ${i + 1}: comillas mal formadas.`)
          : col.length !== hdr.length
            ? M(
                `Row ${i + 1}: ${col.length} fields but the header has ${hdr.length}. Check for unquoted commas or a misplaced delimiter.`,
                `Fila ${i + 1}: ${col.length} campos, pero el encabezado tiene ${hdr.length}. Revisa comas sin comillas o un separador fuera de lugar.`,
              )
            : null;
    // Pass 1: decide the file's decimal separator from unambiguous values.
    const evidence = new Set();
    let ambiguousSeen = false,
      commaInCell = false;
    for (const col of body)
      for (const i of shapeError(col, 0) ? [] : numericCols) {
        const tok = numberToken(col[i]);
        if (tok.empty || tok.conflict) continue;
        if (tok.text.includes(',')) commaInCell = true;
        const ev = separatorEvidence(tok.text);
        if (ev === 'comma' || ev === 'dot') evidence.add(ev);
        else if (ev === 'ambiguous') ambiguousSeen = true;
      }
    if (evidence.size > 1)
      return {
        rows: [],
        errors: [
          M(
            'Mixed number formats in one file (both 1,5 and 1.5 styles). Export again with a single decimal separator.',
            'Formatos numéricos mezclados en un mismo archivo (1,5 y 1.5). Exporta de nuevo con un único separador decimal.',
          ),
        ],
        warnings: [],
        delimiter: delim,
        decimal: null,
      };
    // A comma-delimited file whose cells never contain a comma follows the dot-decimal convention.
    const decimal = evidence.size ? [...evidence][0] : delim === ',' && !commaInCell ? 'dot' : null;
    const warnings = [];
    if (!decimal && ambiguousSeen)
      warnings.push(
        M(
          'The decimal separator could not be determined; rows with values such as 1,234 or 1.234 were rejected.',
          'No se pudo determinar el separador decimal; se rechazaron las filas con valores como 1,234 o 1.234.',
        ),
      );
    const grouped = new Map(),
      errors = [],
      currencies = new Set();
    let lots = 0,
      currencyKnown = false;
    for (let li = 0; li < body.length; li++) {
      const i = li + 1,
        col = body[li],
        ticker = String(col[tid] || '')
          .toUpperCase()
          .trim();
      if (!ticker && col.every((v) => !v)) continue;
      const shape = shapeError(col, i);
      if (shape) {
        errors.push(shape);
        continue;
      }
      if (typeIdx !== undefined && /sell|venta|sold|short/i.test(col[typeIdx] || '')) {
        errors.push(
          `Fila ${i + 1}: parece historial de transacciones; exporta la vista de posiciones actuales de Yahoo, no compras y ventas mezcladas.`,
        );
        continue;
      }
      let rowError = null,
        rowCurrency = null;
      const columnCurrency =
        curIdx !== undefined
          ? String(col[curIdx] || '')
              .trim()
              .toUpperCase()
          : '';
      if (columnCurrency) {
        if (!/^[A-Z]{3}$/.test(columnCurrency))
          rowError = M(
            `Row ${i + 1}: unrecognized currency "${columnCurrency}".`,
            `Fila ${i + 1}: moneda no reconocida "${columnCurrency}".`,
          );
        rowCurrency = columnCurrency;
      }
      const read = (index) => {
        if (index === undefined) return NaN;
        const tok = numberToken(col[index]);
        if (tok.empty) return NaN;
        if (tok.conflict) {
          rowError =
            rowError ||
            M(
              `Row ${i + 1}: conflicting currency marks in "${col[index]}".`,
              `Fila ${i + 1}: símbolos de moneda contradictorios en "${col[index]}".`,
            );
          return NaN;
        }
        if (tok.currency) {
          if (rowCurrency && rowCurrency !== tok.currency)
            rowError =
              rowError ||
              M(
                `Row ${i + 1}: currency ${tok.currency} does not match ${rowCurrency}.`,
                `Fila ${i + 1}: la moneda ${tok.currency} no coincide con ${rowCurrency}.`,
              );
          rowCurrency = rowCurrency || tok.currency;
        }
        const ev = separatorEvidence(tok.text);
        if (ev === 'invalid') {
          rowError =
            rowError ||
            M(
              `Row ${i + 1}: "${col[index]}" is not a number.`,
              `Fila ${i + 1}: "${col[index]}" no es un número.`,
            );
          return NaN;
        }
        if (ev === 'ambiguous' && !decimal) {
          rowError =
            rowError ||
            M(
              `Row ${i + 1}: "${col[index]}" is ambiguous (thousands separator or decimals?). Use a file with an unambiguous number format.`,
              `Fila ${i + 1}: "${col[index]}" es ambiguo (¿separador de miles o decimales?). Usa un archivo con un formato numérico inequívoco.`,
            );
          return NaN;
        }
        const n = toNumber(tok.text, decimal || 'dot');
        if (!Number.isFinite(n)) {
          rowError =
            rowError ||
            M(
              `Row ${i + 1}: "${col[index]}" is not a number.`,
              `Fila ${i + 1}: "${col[index]}" no es un número.`,
            );
          return NaN;
        }
        return tok.negative ? -n : n;
      };
      if (sid !== undefined && numberToken(col[sid]).currency)
        rowError = M(
          `Row ${i + 1}: quantity "${col[sid]}" carries a currency.`,
          `Fila ${i + 1}: la cantidad "${col[sid]}" lleva moneda.`,
        );
      const shares = read(sid),
        total = read(totalIdx),
        perUnit = read(cid),
        fee = read(feeIdx);
      let price = read(pid),
        prevClose = read(vid);
      if (rowError) {
        errors.push(rowError);
        continue;
      }
      if (rowCurrency) currencyKnown = true;
      const currency = rowCurrency || 'USD';
      let fx = 1;
      if (currency !== 'USD') {
        const rate = Number(fxRates[currency]);
        if (!(Number.isFinite(rate) && rate > 0)) {
          errors.push(
            M(
              `Row ${i + 1}: ${ticker || 'row'} is in ${currency}; no ${currency}→USD rate was supplied, so it was not imported as USD.`,
              `Fila ${i + 1}: ${ticker || 'fila'} está en ${currency}; no hay tipo de cambio ${currency}→USD, así que no se importó como USD.`,
            ),
          );
          continue;
        }
        fx = rate;
      }
      if (Number.isFinite(fee) && fee < 0) {
        errors.push(M(`Row ${i + 1}: negative commission.`, `Fila ${i + 1}: comisión negativa.`));
        continue;
      }
      // Commission is added to per-share purchase cost. A total Cost Basis column already includes fees.
      const commission = Number.isFinite(fee) && Number.isFinite(perUnit) ? fee : 0;
      const lotCost = Number.isFinite(perUnit)
        ? shares * perUnit + commission
        : Number.isFinite(total)
          ? total
          : NaN;
      if (!/^[A-Z0-9.\-]{1,15}$/.test(ticker) || !(shares > 0) || !(lotCost >= 0)) {
        errors.push(
          `Fila ${i + 1}: revisa Symbol, Quantity y Purchase Price/Cost Basis (no se admiten cantidades negativas).`,
        );
        continue;
      }
      currencies.add(currency);
      const old = grouped.get(ticker) || { ticker, shares: 0, totalCost: 0, commission: 0, lots: 0 };
      old.totalCost += lotCost * fx;
      old.commission += commission * fx;
      old.shares += shares;
      old.lots++;
      if (currency !== 'USD') {
        old.sourceCurrency = currency;
        old.fxRate = fx;
      }
      if (price > 0) old.price = price * fx;
      if (prevClose > 0) old.prevClose = prevClose * fx;
      grouped.set(ticker, old);
      lots++;
    }
    const rows = [...grouped.values()].map((x) => ({
      ticker: x.ticker,
      shares: round(x.shares, 8),
      cost: round(x.totalCost / x.shares, 8),
      totalCost: round(x.totalCost, 2),
      currency: 'USD',
      lots: x.lots,
      ...(x.commission > 0 ? { commission: round(x.commission, 2) } : {}),
      ...(x.sourceCurrency ? { sourceCurrency: x.sourceCurrency, fxRate: x.fxRate } : {}),
      ...(x.price > 0 ? { price: x.price } : {}),
      ...(x.prevClose > 0 ? { prevClose: x.prevClose } : {}),
    }));
    if (rows.length && !currencyKnown)
      warnings.push(
        M(
          'No currency column or symbol found: amounts are treated as USD.',
          'No hay columna ni símbolo de moneda: los importes se tratan como USD.',
        ),
      );
    return {
      rows,
      errors,
      warnings,
      lots,
      aggregated: lots - rows.length,
      delimiter: delim,
      decimal,
      currencies: [...currencies],
      totalCost: round(
        rows.reduce((a, r) => a + r.totalCost, 0),
        2,
      ),
    };
  }
  function defaultState() {
    return {
      version: 4,
      createdAt: new Date().toISOString(),
      demo: true,
      holdings: SAMPLE_HOLDINGS.map((x) => ({ ...x })),
      matches: {},
      swipes: [],
      mode: 'balanced',
      seed: 12,
      deck: [],
      budget: 250,
      planMonth: todayLima().slice(0, 7),
      savedPlan: null,
      alerts: {},
      dismissedNews: [],
      dataSource: 'demo',
      lastLiveUpdate: null,
      quotes: {},
      research: {},
      news: [],
      searchTerm: '',
      onboardingSeen: false,
    };
  }
  const API = {
    LAYERS,
    SECTORS,
    SECTOR_WEIGHTS,
    CATALOG,
    BY_TICKER,
    SAMPLE_HOLDINGS,
    SCHEDULE,
    todayLima,
    round,
    clamp,
    money,
    pct,
    riskStats,
    featureVec,
    FEATURES,
    featureModel,
    sigmoid,
    dot,
    cosine,
    portfolio,
    layerStatus,
    trainTaste,
    scoreItem,
    generateDeck,
    dcfTwoStage,
    reverseDCF,
    valuation,
    researchScore,
    projections,
    planScenarios,
    parseCSV,
    safeUrl,
    strictTable,
    isVerifiedCandidate,
    anchorSeries,
    defaultState,
    hash,
    rnd,
  };
  root.Logic = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
