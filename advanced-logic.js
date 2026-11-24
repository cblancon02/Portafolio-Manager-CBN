/* Portafolio Manager · quantitative helpers. Deterministic and browser compatible.
   Reconstructed Overkill / LDD context is NOT the proprietary oscillator or its dots. */
(function (root) {
  'use strict';
  const valid = (x) => typeof x === 'number' && Number.isFinite(x),
    round = (n, d = 2) => (valid(n) ? Math.round(n * 10 ** d) / 10 ** d : null);
  const PEERS = {
    NVDA: ['AMD', 'AVGO', 'QCOM', 'INTC'],
    AMD: ['NVDA', 'AVGO', 'QCOM'],
    AVGO: ['NVDA', 'AMD', 'QCOM'],
    MU: ['WDC', 'SNDK', 'STX'],
    TSM: ['ASML', 'AMAT', 'LRCX'],
    ASML: ['AMAT', 'LRCX', 'KLAC'],
    MSFT: ['GOOGL', 'AMZN', 'ORCL'],
    GOOGL: ['META', 'MSFT', 'AMZN'],
    META: ['GOOGL', 'SNAP', 'PINS'],
    AMZN: ['MSFT', 'GOOGL', 'ORCL'],
    PLTR: ['SNOW', 'CRM', 'NOW'],
    CRWD: ['PANW', 'FTNT', 'ZS'],
    VRT: ['ETN', 'GEV', 'PWR'],
    GEV: ['ETN', 'VRT', 'PWR'],
    NRG: ['VST', 'CEG', 'NEE'],
    AAPL: ['MSFT', 'GOOGL', 'DELL'],
    TSLA: ['GM', 'F', 'RIVN'],
    JPM: ['BAC', 'WFC', 'C'],
    V: ['MA', 'AXP', 'PYPL'],
    LLY: ['NVO', 'MRK', 'ABBV'],
    VOO: ['SPY', 'IVV', 'QQQ'],
  };
  // The strict CSV reader lives in logic.js (loaded first in the browser).
  const Strict = () => root.Logic || (typeof require === 'function' ? require('./logic.js') : null);
  const TX_NUMERIC = [
    'cantidad',
    'quantity',
    'qty',
    'shares',
    'units',
    'unidades',
    'acciones',
    'size',
    'precio',
    'price',
    'unitprice',
    'executionprice',
    'precioaccion',
    'averageprice',
    'importe',
    'amount',
    'total',
    'grossamount',
    'netamount',
    'monto',
    'cashamount',
    'comision',
    'commission',
    'fee',
    'fees',
    'tarifa',
  ];
  const TX_QUANTITY = ['cantidad', 'quantity', 'qty', 'shares', 'units', 'unidades', 'acciones', 'size'];
  const SNAP_NUMERIC = [
    'valor',
    'value',
    'equity',
    'portfolioequity',
    'accountvalue',
    'flujo',
    'netflow',
    'aporteneto',
    'netcontribution',
    'cashflow',
  ];
  // Only USD prices count in totals: a quote with another currency, or a live quote whose
  // currency is unknown, is not assumed to be USD.
  function usdPrice(q) {
    if (!q || !(valid(q.price) && q.price > 0)) return null;
    const cur = q.currency ? String(q.currency).toUpperCase() : null;
    if (cur ? cur !== 'USD' : q.live === true) return null;
    return q.price;
  }
  const normT = (t) =>
    String(t || '')
      .toUpperCase()
      .trim();
  function numeric(x) {
    if (typeof x === 'number') return x;
    let v = String(x ?? '')
      .replace(/[$€£%\s]/g, '')
      .replace(/[()]/g, '')
      .trim();
    if (!v) return NaN;
    if (v.includes('.') && v.includes(',')) {
      v =
        v.lastIndexOf(',') > v.lastIndexOf('.')
          ? v.replace(/\./g, '').replace(',', '.')
          : v.replace(/,/g, '');
    } else if (v.includes(',') && /\d,\d{1,4}$/.test(v)) v = v.replace(',', '.');
    else v = v.replace(/,/g, '');
    let out = Number(v);
    return /\(.*\)/.test(String(x)) ? -out : out;
  }
  // Calendar dates only: 2026-02-30 or 31/04/2026 are rejected, not rolled over.
  function isoDate(x) {
    const s = String(x || '').trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/),
      y,
      mo,
      d;
    if (m) [y, mo, d] = [m[1], m[2], m[3]].map(Number);
    else if ((m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/)))
      [d, mo, y] = [m[1], m[2], m[3]].map(Number);
    else if ((m = s.match(/^(\d{4})(\d{2})(\d{2})$/))) [y, mo, d] = [m[1], m[2], m[3]].map(Number);
    else return null;
    const dt = new Date(Date.UTC(y, mo - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d
      ? dt.toISOString().slice(0, 10)
      : null;
  }
  // Execution time when the file gives one (a datetime column, or date + time columns).
  function execTime(date, raw, time) {
    const t =
      String(time || '').trim() || (String(raw || '').match(/[T\s](\d{1,2}:\d{2}(?::\d{2})?)/) || [])[1];
    if (!date || !t || !/^\d{1,2}:\d{2}(:\d{2})?$/.test(t)) return null;
    const [h, mi, se = '0'] = t.split(':');
    return `${date}T${h.padStart(2, '0')}:${mi}:${se.padStart(2, '0')}`;
  }
  function parseTransactions(text, options = {}) {
    const table = Strict().strictTable(text, { ...options, numeric: TX_NUMERIC, quantity: TX_QUANTITY });
    const rows = table.rows,
      errors = [...table.errors],
      transactions = [],
      seenIds = new Map();
    const get = (r, ...keys) =>
      keys
        .map((k) => r[k])
        .find((v) => v !== undefined && !(typeof v === 'number' && !valid(v)) && String(v).trim() !== '');
    for (const r of rows) {
      const raw = String(
        get(
          r,
          'tipo',
          'type',
          'action',
          'transactiontype',
          'transaccion',
          'operation',
          'operacion',
          'side',
          'activity',
        ) || '',
      )
        .toLowerCase()
        .trim();
      let type = /^buy$|^compra$|^comprar$|^bought$/.test(raw)
        ? 'buy'
        : /^sell$|^venta$|^vender$|^sold$/.test(raw)
          ? 'sell'
          : /^dividend$|^dividendo$/.test(raw)
            ? 'dividend'
            : null;
      if (!type) {
        errors.push(`Fila ${r.__row}: tipo no reconocido (${raw || 'vacío'})`);
        continue;
      }
      const ticker = normT(
        get(r, 'ticker', 'symbol', 'simbolo', 'instrument', 'instrumento', 'asset', 'activo'),
      );
      const rawDate = get(
        r,
        'fecha',
        'date',
        'datetime',
        'timestamp',
        'trade date',
        'tradedate',
        'executiondate',
        'settlementdate',
      );
      const date = isoDate(rawDate),
        executedAt = execTime(date, rawDate, get(r, 'time', 'hora', 'executiontime', 'tradetime'));
      const shares = numeric(
        get(r, 'cantidad', 'quantity', 'qty', 'shares', 'units', 'unidades', 'acciones', 'size'),
      );
      const price = numeric(
        get(r, 'precio', 'price', 'unitprice', 'executionprice', 'precioaccion', 'averageprice'),
      );
      const amount = numeric(
        get(r, 'importe', 'amount', 'total', 'grossamount', 'netamount', 'monto', 'cashamount'),
      );
      const fee = numeric(get(r, 'comision', 'commission', 'fee', 'fees', 'tarifa'));
      if (
        !/^[A-Z0-9.\-]{1,12}$/.test(ticker) ||
        !date ||
        (type !== 'dividend' && (!(shares > 0) || !(price >= 0))) ||
        (type === 'dividend' && !valid(amount))
      ) {
        errors.push(`Fila ${r.__row}: falta fecha, ticker, cantidad/precio o importe válido.`);
        continue;
      }
      const item = {
        type,
        date,
        ticker,
        shares: type === 'dividend' ? 0 : round(shares, 8),
        price: type === 'dividend' ? null : round(price, 8),
        amount: valid(amount) ? round(Math.abs(amount), 2) : round(shares * price, 2),
        fee: valid(fee) ? round(Math.abs(fee), 2) : 0,
        source: 'CSV local',
        ...(executedAt ? { executedAt } : {}),
        sourceRow: r.__row,
        importedAt: new Date().toISOString(),
      };
      const id = String(
        get(r, 'transactionid', 'tradeid', 'orderid', 'id', 'referencia', 'reference') || '',
      ).trim();
      item.id =
        id ||
        [
          item.date, // time deliberately excluded: IDs must match imports made before times were kept
          item.type,
          item.ticker,
          item.shares,
          item.price,
          item.amount,
          item.fee,
        ].join('|');
      // Two rows with the same ID (explicit, or identical generated) cannot both be booked.
      if (seenIds.has(item.id)) {
        errors.push(
          `Row ${r.__row}: duplicate transaction ID "${item.id}" (also row ${seenIds.get(item.id)}). Add a unique transaction ID or remove the duplicate.`,
        );
        continue;
      }
      seenIds.set(item.id, r.__row);
      transactions.push(item);
    }
    return { transactions, errors, rows: rows.length };
  }
  function reconcileTrades(initialHoldings, trades) {
    const map = new Map(
      (initialHoldings || []).map((h) => [
        normT(h.ticker),
        {
          ticker: normT(h.ticker),
          shares: Number(h.shares) || 0,
          // Unknown basis stays null; it never becomes 0.
          cost:
            h.cost === null || h.cost === undefined || h.cost === '' || !valid(Number(h.cost))
              ? null
              : Number(h.cost),
        },
      ]),
    );
    let realized = 0,
      realizedUnknown = false,
      dividends = 0,
      issues = [];
    // Same-day order (a consistent total order): trades keep the order they were recorded (file
    // row order, then import order); timed trades are then reordered by time among their own
    // positions only, so an untimed row never breaks the chronology of the timed ones.
    // Never the ID, which says nothing about time.
    const byDate = (trades || [])
      .map((t, i) => ({ t, i }))
      .sort((a, b) => a.t.date.localeCompare(b.t.date) || a.i - b.i);
    const sorted = [];
    for (let start = 0; start < byDate.length;) {
      let end = start;
      while (end < byDate.length && byDate[end].t.date === byDate[start].t.date) end++;
      const day = byDate.slice(start, end),
        slots = day.map((x, k) => (x.t.executedAt ? k : -1)).filter((k) => k >= 0),
        timed = slots
          .map((k) => day[k])
          .sort((a, b) => a.t.executedAt.localeCompare(b.t.executedAt) || a.i - b.i);
      slots.forEach((k, j) => (day[k] = timed[j]));
      sorted.push(...day.map((x) => x.t));
      start = end;
    }
    for (const t of sorted) {
      const old = map.get(t.ticker) || { ticker: t.ticker, shares: 0, cost: 0 };
      if (t.type === 'dividend') {
        dividends += Number(t.amount) || 0;
        continue;
      }
      if (t.type === 'buy') {
        const qty = Number(t.shares),
          fee = Number(t.fee) || 0,
          newShares = old.shares + qty;
        old.cost =
          old.shares > 0 && old.cost === null
            ? null
            : newShares > 0
              ? (old.shares * (old.cost || 0) + qty * Number(t.price) + fee) / newShares
              : null;
        old.shares = newShares;
        map.set(t.ticker, old);
      } else if (t.type === 'sell') {
        const qty = Number(t.shares);
        if (qty > old.shares + 1e-7) {
          issues.push(
            `${t.date} ${t.ticker}: venta ${qty} excede posición registrada ${round(old.shares, 6)}.`,
          );
          continue;
        }
        if (old.cost === null) {
          realizedUnknown = true; // reported as realizedPartial; the sale itself is valid
        } else realized += (Number(t.price) - old.cost) * qty - (Number(t.fee) || 0);
        old.shares = Math.max(0, old.shares - qty);
        if (old.shares < 1e-8) map.delete(t.ticker);
        else map.set(t.ticker, old);
      }
    }
    return {
      holdings: [...map.values()]
        .filter((x) => x.shares > 1e-8)
        .map((x) => ({ ...x, shares: round(x.shares, 8), cost: round(x.cost, 8) })),
      realized: realizedUnknown ? null : round(realized, 2),
      realizedPartial: realizedUnknown,
      dividends: round(dividends, 2),
      issues,
    };
  }
  function ema(values, period) {
    const output = Array(values.length).fill(null),
      k = 2 / (period + 1);
    if (values.length < period) return output;
    const nums = values.map(Number);
    for (let i = 0; i < nums.length; i++) {
      if (!valid(nums[i])) return output;
      if (i === period - 1) output[i] = nums.slice(0, period).reduce((a, b) => a + b, 0) / period;
      else if (i >= period) output[i] = nums[i] * k + output[i - 1] * (1 - k);
    }
    return output;
  }
  function weeklyBars(history) {
    const bars = (history || [])
        .filter((h) => h && typeof h.date === 'string' && valid(Number(h.adjClose ?? h.close)))
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date)),
      out = [];
    for (const b of bars) {
      const d = new Date(b.date + 'T12:00:00Z'),
        monday = new Date(d);
      monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
      const key = monday.toISOString().slice(0, 10),
        price = Number(b.adjClose ?? b.close);
      if (!out.length || out.at(-1).week !== key) out.push({ week: key, date: b.date, close: price });
      else Object.assign(out[out.length - 1], { date: b.date, close: price });
    }
    return out;
  }
  function macd(closes) {
    const f = ema(closes, 12),
      s = ema(closes, 26),
      line = closes.map((_, i) => (valid(f[i]) && valid(s[i]) ? f[i] - s[i] : null)),
      first = line.findIndex(valid);
    if (first < 0) return null;
    const signal = ema(line.slice(first), 9),
      hist = line.map((v, i) => (valid(v) && valid(signal[i - first]) ? v - signal[i - first] : null));
    const at = hist.length - 1;
    return {
      line: round(line[at], 4),
      signal: round(signal[at - first], 4),
      histogram: round(hist[at], 4),
      trend:
        valid(hist[at]) && valid(hist[at - 1])
          ? hist[at] >= hist[at - 1]
            ? 'mejorando'
            : 'debilitándose'
          : 'sin confirmar',
    };
  }
  function stochasticRSI(closes) {
    if (closes.length < 35) return null;
    const rsi = Array(closes.length).fill(null);
    let gain = 0,
      loss = 0;
    for (let i = 1; i <= 14; i++) {
      const d = closes[i] - closes[i - 1];
      gain += Math.max(d, 0);
      loss += Math.max(-d, 0);
    }
    gain /= 14;
    loss /= 14;
    rsi[14] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
    for (let i = 15; i < closes.length; i++) {
      const d = closes[i] - closes[i - 1];
      gain = (gain * 13 + Math.max(d, 0)) / 14;
      loss = (loss * 13 + Math.max(-d, 0)) / 14;
      rsi[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
    }
    const v = rsi.slice(-14);
    const min = Math.min(...v),
      max = Math.max(...v),
      cur = rsi.at(-1);
    return {
      value: round(max === min ? 50 : ((cur - min) / (max - min)) * 100, 1),
      note: 'Stoch RSI estándar 14/14 (aproximación, sin umbral blanco propietario)',
    };
  }
  function lddAnalysis(history, price = null, signals = {}) {
    const bars = weeklyBars(history),
      closes = bars.map((x) => x.close),
      w200 = ema(closes, 200),
      w50 = ema(closes, 50),
      w9 = ema(closes, 9),
      last = closes.length - 1,
      now = valid(price) && price > 0 ? price : closes.at(-1);
    const a = valid(w200[last]) ? w200[last] : null;
    const dist = valid(a) && valid(now) ? (now / a - 1) * 100 : null;
    const verifiedSignals = Object.entries(signals || {})
      .filter(([, v]) => v === true)
      .map(([k]) => k);
    let decision = 'DATOS INSUFICIENTES',
      reason =
        'No se dispone de la onda y los puntos del indicador propietario; la EMA no es una entrada automática.';
    if (signals.redDaily && signals.redDailyZone) {
      decision = 'VENTA POTENCIAL TIPO 1';
      reason = 'Punto rojo diario confirmado en zona roja (señal declarada por el usuario).';
    } else if (signals.redWeekly || signals.stochConfirmed) {
      decision = 'VENTA POTENCIAL TIPO 2';
      reason = 'Punto rojo semanal o contacto Stochastic RSI original confirmado (señal declarada).';
    } else if (signals.greenMonthly) {
      decision = 'COMPRA POTENCIAL TIPO 1';
      reason = 'Punto verde mensual confirmado (señal declarada).';
    } else if (signals.greenWeekly && signals.waveBelow) {
      decision = 'COMPRA POTENCIAL TIPO 2';
      reason = 'Verde semanal y onda bajo línea blanca inferior (ambos declarados).';
    } else if (signals.greenWeekly && !signals.waveBelow) {
      decision = 'ESPERAR CONFIRMACIÓN';
      reason = 'Verde semanal sin onda confirmada bajo la línea: NO es compra tipo 2.';
    } else if (bars.length >= 200) {
      decision = 'ESPERAR CONFIRMACIÓN';
      reason = 'Medias disponibles, pero no existe señal propietaria de entrada/salida confirmada.';
    }
    return {
      weeks: bars.length,
      asOf: bars.at(-1)?.date || null,
      close: round(now, 2),
      ema200: round(a, 2),
      ema50: round(w50[last], 2),
      ema9: round(w9[last], 2),
      distance: round(dist, 1),
      emaSlope:
        valid(w200[last]) && valid(w200[last - 4]) ? round((w200[last] / w200[last - 4] - 1) * 100, 2) : null,
      macd: macd(closes),
      stochRSI: stochasticRSI(closes),
      decision,
      reason,
      verifiedSignals,
      proprietaryOscillator: 'no conectado',
      source: 'Cierres semanales ajustados / cálculo local (aproximación analítica)',
    };
  }
  function portfolioSeries(holdings, quotes, days = 260) {
    const items = (holdings || [])
      .filter(
        (h) =>
          h.shares > 0 &&
          usdPrice(quotes[h.ticker]) !== null &&
          Array.isArray(quotes[h.ticker]?.history) &&
          quotes[h.ticker].history.length > 20,
      )
      .map((h) => ({ h, map: new Map(quotes[h.ticker].history.map((b) => [b.date, Number(b.close)])) }));
    if (!items.length) return null;
    const candidate = [...items[0].map.keys()].sort().slice(-days);
    const common = candidate.filter((d) => items.every((x) => x.map.has(d)));
    if (common.length < 15) return null;
    const rows = common.map((date) => ({
      date,
      value: items.reduce((sum, x) => sum + x.h.shares * x.map.get(date), 0),
    }));
    const covered = items.reduce((s, x) => s + x.h.shares * usdPrice(quotes[x.h.ticker]), 0),
      total = holdings.reduce((s, h) => s + h.shares * (usdPrice(quotes[h.ticker]) || 0), 0),
      unpriced = holdings.filter((h) => usdPrice(quotes[h.ticker]) === null).map((h) => h.ticker);
    return {
      rows,
      unpriced,
      // Share of USD-priced value; unpriced (or non-USD) holdings are listed, not counted as covered.
      coveragePct: total > 0 && !unpriced.length ? Math.floor((covered / total) * 1000) / 10 : null,
      kind: 'static_mix',
      label:
        'Evolución hipotética de las cantidades ACTUALES. No es la rentabilidad histórica real ni incluye operaciones anteriores.',
    };
  }
  function drawdown(rows) {
    let top = -Infinity,
      worst = 0;
    for (const x of rows || []) {
      const v = Number(x.value);
      if (!(v > 0)) continue;
      top = Math.max(top, v);
      worst = Math.min(worst, (v / top - 1) * 100);
    }
    return round(worst, 1);
  }
  function corr(a, b) {
    if (a.length !== b.length || a.length < 25) return null;
    const am = a.reduce((s, x) => s + x, 0) / a.length,
      bm = b.reduce((s, x) => s + x, 0) / b.length;
    let top = 0,
      aa = 0,
      bb = 0;
    for (let i = 0; i < a.length; i++) {
      top += (a[i] - am) * (b[i] - bm);
      aa += (a[i] - am) ** 2;
      bb += (b[i] - bm) ** 2;
    }
    return aa > 0 && bb > 0 ? round(top / Math.sqrt(aa * bb), 2) : null;
  }
  function portfolioDiagnostics(p, holdings, quotes) {
    const weights = p?.lines || [],
      validLines = weights.filter((x) => valid(x.weight) && x.weight > 0),
      top3 = validLines
        .slice()
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 3)
        .reduce((s, x) => s + x.weight, 0),
      top5 = validLines
        .slice()
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 5)
        .reduce((s, x) => s + x.weight, 0),
      sectorNames = Object.entries(p?.sectors || {}).sort((a, b) => b[1] - a[1]),
      ia = Object.entries(p?.layers || {})
        .filter(([k]) => root.Logic?.LAYERS[k]?.kind === 'ia')
        .reduce((s, [, w]) => s + w, 0);
    const hist = portfolioSeries(holdings, quotes, 300);
    return {
      top3: round(top3, 1),
      top5: round(top5, 1),
      mainSector: sectorNames[0] || null,
      sectors: sectorNames,
      ia: round(ia, 1),
      effective: round(p?.effective, 1),
      historicalDrawdownProxy: hist ? drawdown(hist.rows) : null,
      historicalCoverage: hist?.coveragePct ?? null,
    };
  }

  function parseSnapshots(text, options = {}) {
    const table = Strict().strictTable(text, { ...options, numeric: SNAP_NUMERIC });
    const rows = table.rows,
      errors = [...table.errors],
      snapshots = [],
      seen = new Map();
    for (const r of rows) {
      const rawDate = r.fecha || r.date || r.day,
        date = isoDate(rawDate),
        value = [r.valor, r.value, r.equity, r.portfolioequity, r.accountvalue].find((x) => valid(x)),
        // The flow must be stated (0 included); a blank is not assumed to be zero.
        flow = [r.flujo, r.netflow, r.aporteneto, r.netcontribution, r.cashflow].find((x) => valid(x));
      if (!date) errors.push(`Row ${r.__row}: "${rawDate || ''}" is not a valid calendar date.`);
      else if (!(value > 0)) errors.push(`Row ${r.__row}: account value missing or not positive.`);
      else if (!valid(flow)) errors.push(`Row ${r.__row}: net flow missing (write 0 if there was none).`);
      else if (seen.has(date))
        errors.push(`Row ${r.__row}: duplicate date ${date} (also row ${seen.get(date)}).`);
      else {
        seen.set(date, r.__row);
        snapshots.push({ date, value, flow });
      }
    }
    // All or nothing: a file with any rejected row yields no snapshots.
    return {
      snapshots: errors.length ? [] : snapshots.sort((a, b) => a.date.localeCompare(b.date)),
      errors,
    };
  }
  function twrSnapshots(snapshots) {
    const rows = (snapshots || []).slice().sort((a, b) => a.date.localeCompare(b.date));
    if (rows.length < 2) return null;
    const series = [{ date: rows[0].date, value: 100 }],
      returns = [];
    let index = 100;
    for (let i = 1; i < rows.length; i++) {
      const prior = rows[i - 1].value,
        cur = rows[i].value,
        flow = rows[i].flow || 0;
      if (prior <= 0) continue;
      const ret = (cur - flow) / prior - 1;
      index *= 1 + ret;
      returns.push(ret);
      series.push({ date: rows[i].date, value: round(index, 6) });
    }
    return {
      rows: series,
      returnPct: round((index / 100 - 1) * 100, 2),
      kind: 'twr',
      label:
        'Rentabilidad ponderada por tiempo (TWR) de valores y aportes netos declarados; presupone flujos al cierre del periodo.',
      periods: returns.length,
    };
  }
  function compVal(s) {
    const price = Number(s?.price),
      eps = Number(s?.eps),
      fcfps = Number(s?.fcfps),
      op = Number(s?.opMargin),
      grow = Number(s?.revenueGrowth);
    return {
      pe: price > 0 && eps > 0 ? round(price / eps, 1) : null,
      pFcf: price > 0 && fcfps > 0 ? round(price / fcfps, 1) : null,
      operatingMargin: valid(op) ? round(op, 1) : null,
      revenueGrowth: valid(grow) ? round(grow, 1) : null,
      evEbitda: valid(s?.evEbitda) ? round(s.evEbitda, 1) : null,
    };
  }
  function comparePeers(own, peers) {
    const metrics = ['pe', 'pFcf', 'evEbitda', 'operatingMargin', 'revenueGrowth'],
      self = compVal(own),
      rows = peers.map((x) => ({
        ...compVal(x),
        ticker: x.ticker,
        verified: x.provenance === 'sec' || x.verified === true,
      })),
      out = {};
    for (const m of metrics) {
      const values = rows
        .filter((x) => x.verified && valid(x[m]))
        .map((x) => x[m])
        .sort((a, b) => a - b);
      const n = values.length;
      const med = n ? (n % 2 ? values[(n - 1) / 2] : (values[n / 2 - 1] + values[n / 2]) / 2) : null;
      out[m] = {
        value: self[m],
        median: round(med, 1),
        peerCount: n,
        relative: valid(self[m]) && med && med > 0 ? round((self[m] / med - 1) * 100, 1) : null,
      };
    }
    return {
      self,
      rows,
      metrics: out,
      asOf: new Date().toISOString(),
      note: 'P/E y P/FCF son múltiplos; menor no significa automáticamente mejor. Requiere pares sectoriales y datos del mismo periodo.',
    };
  }
  function portfolioValuation(lines = [], benchmark = null, options = {}) {
    const allowDemo = options.allowDemo === true,
      minCoverage = Number.isFinite(options.minCoverage) ? options.minCoverage : 75;
    // Coverage is the share of KNOWN (priced) market value with usable earnings. Unpriced holdings
    // have no market value, so nothing is substituted for them: they are listed in `unpriced`,
    // the result is `partial`, and the UI must say how many holdings are missing.
    const priced = (l) => valid(l?.value) && l.value > 0;
    let total = 0;
    const unpriced = [];
    for (const l of lines || []) {
      if (priced(l)) total += l.value;
      else unpriced.push(l?.ticker);
    }
    let covered = 0,
      earnings = 0,
      count = 0,
      excluded = [...unpriced];
    for (const l of lines || []) {
      const v = l?.value,
        s = l?.stock || {};
      if (!priced(l)) continue;
      const isETF = s.layer === 'indice' || /^(VOO|SPY|IVV|QQQ|VTI)$/.test(String(l.ticker || ''));
      const verified = s?.research?.verified === true || s.verified === true;
      const permitted = verified || (allowDemo && s.demo === true);
      const pe = valid(s.price) && s.price > 0 && valid(s.eps) && s.eps > 0 ? s.price / s.eps : null;
      if (isETF || !permitted || !valid(pe) || pe <= 0) {
        excluded.push(l.ticker);
        continue;
      }
      covered += v;
      earnings += v / pe;
      count++;
    }
    // Gate on the raw ratio; the displayed figure is floored so 74.96% never reads as 75%.
    const rawCoverage = total > 0 ? (100 * covered) / total : 0;
    const coveragePct = Math.floor(rawCoverage * 10) / 10;
    const partial = unpriced.length > 0 || rawCoverage < 100 - 1e-9;
    const pe = count > 0 && earnings > 0 && rawCoverage >= minCoverage ? round(covered / earnings, 2) : null;
    const goodBenchmark =
      benchmark &&
      valid(benchmark.pe) &&
      benchmark.pe > 0 &&
      typeof benchmark.source === 'string' &&
      benchmark.source.length > 3;
    const benchPE = goodBenchmark ? benchmark.pe : null;
    const spreadPct = valid(pe) && valid(benchPE) ? round((pe / benchPE - 1) * 100, 1) : null;
    return {
      pe,
      coveredValue: round(covered, 2),
      coveragePct,
      partial,
      excluded,
      unpriced,
      count,
      benchmarkPE: benchPE,
      spreadPct,
      benchmarkSource: goodBenchmark ? benchmark.source : null,
    };
  }
  const API = {
    portfolioValuation,
    usdPrice,
    PEERS,
    round,
    parseTransactions,
    reconcileTrades,
    parseSnapshots,
    twrSnapshots,
    ema,
    weeklyBars,
    macd,
    stochasticRSI,
    lddAnalysis,
    portfolioSeries,
    portfolioDiagnostics,
    drawdown,
    comparePeers,
    compVal,
  };
  root.Advanced = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
