/** Portafolio Manager v4.0 — ESM Vercel Handler */
if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  process.env.PM_DATA_DIR = process.env.PM_DATA_DIR || '/tmp/pm-data';
}
if (!process.env.SEC_USER_AGENT) {
  process.env.SEC_USER_AGENT = 'PortafolioManager/4.0 (research@portafoliomanager.app)';
}

const { createAppServer, quote } = await import('./server.mjs');
const { sessionUser } = await import('./accounts.mjs');
const { createWeeklyData, schedulerTick } = await import('./weekly-report.mjs');
const { pullFromCloud, pushToCloud, autoVerifyIfNoMail, getAiWorkspace, buildServerlessPdf } = await import('./ai-v4.mjs');

const appServer = createAppServer();

export default async function vercelEntry(req, res) {
  await pullFromCloud();
  await autoVerifyIfNoMail();

  if (req.headers['x-forwarded-host']) {
    req.headers.host = String(req.headers['x-forwarded-host']).split(',')[0].trim();
  }
  const parsed = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`);
  const pmPath = parsed.searchParams.get('__pm_path');
  if (pmPath !== null) {
    parsed.searchParams.delete('__pm_path');
    const qs = parsed.searchParams.toString();
    req.url = '/api/' + pmPath.replace(/^\/+/, '') + (qs ? '?' + qs : '');
  }
  const pathname = new URL(req.url, 'http://localhost').pathname;

  if (pathname === '/api/cron/weekly' && req.method === 'GET') {
    try {
      const out = await schedulerTick(quote);
      await pushToCloud();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ok: true, ...out }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  if (pathname === '/api/reports/weekly.pdf' && req.method === 'GET') {
    const user = await sessionUser(req);
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Sign in required' }));
      return;
    }
    const [data, ws] = await Promise.all([createWeeklyData(user, quote), getAiWorkspace(user)]);
    const pdf = buildServerlessPdf(data, ws.theses);
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Length': pdf.length,
      'Cache-Control': 'no-store',
      'Content-Disposition': 'attachment; filename="Portafolio_Manager_Weekly.pdf"',
    });
    res.end(pdf);
    return;
  }

  res.on('finish', () => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && res.statusCode < 400) {
      autoVerifyIfNoMail().then(() => pushToCloud()).catch(() => {});
    }
  });

  appServer.emit('request', req, res);
}
