/**
 * Cost controls for paid AI research, shared by POST /api/report and POST /api/institutional/jobs.
 * - a verified email is required;
 * - each account may start PM_RESEARCH_PER_ACCOUNT_DAY jobs per rolling 24 hours (default 5);
 * - all accounts together may start PM_RESEARCH_GLOBAL_DAY jobs per rolling 24 hours (default 40);
 * - at most PM_RESEARCH_CONCURRENCY jobs run at once (default 2).
 * Usage is persisted. It fails closed: if the usage file cannot be read or written, no job is admitted.
 */
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { privateRoot } from './paths.mjs';
const DAY = 24 * 60 * 60_000;
const intEnv = (name, fallback) => {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};
export const researchLimits = () => ({
  perAccount: intEnv('PM_RESEARCH_PER_ACCOUNT_DAY', 5),
  global: intEnv('PM_RESEARCH_GLOBAL_DAY', 40),
  concurrency: intEnv('PM_RESEARCH_CONCURRENCY', 2),
});
let usage = null,
  loading = null,
  loadedFrom = null,
  running = 0,
  chain = Promise.resolve();
const usagePath = () => join(privateRoot(), 'research-usage.json');
const refuse = (status, code, message) => Object.assign(new Error(message), { status, code });
const unavailable = () =>
  refuse(503, 'RESEARCH_LIMITS_UNAVAILABLE', 'Research is unavailable: usage records cannot be read or saved.');
// One shared load per data folder. A read error other than "no file yet" is not cached, and refuses the job.
function load() {
  if (loadedFrom !== usagePath()) {
    loadedFrom = usagePath();
    usage = null;
    loading = null;
  }
  if (usage) return Promise.resolve();
  if (!loading)
    loading = (async () => {
      try {
        const rows = JSON.parse(await readFile(loadedFrom, 'utf8'));
        if (!Array.isArray(rows)) throw new Error('usage file is not a list');
        usage = rows.filter((x) => typeof x?.id === 'string' && Number.isFinite(x?.at));
      } catch (e) {
        if (e.code !== 'ENOENT') {
          console.error('[research usage]', e.message);
          throw unavailable();
        }
        usage = [];
      }
    })().finally(() => (loading = null));
  return loading;
}
async function save(rows) {
  const file = usagePath();
  await mkdir(privateRoot(), { recursive: true, mode: 0o700 });
  const tmp = file + '.tmp-' + process.pid;
  await writeFile(tmp, JSON.stringify(rows), { mode: 0o600 });
  await rename(tmp, file);
}
async function admit(user) {
  await load();
  const limits = researchLimits(),
    now = Date.now(),
    recent = usage.filter((x) => x.at > now - DAY);
  if (recent.filter((x) => x.id === user.id).length >= limits.perAccount)
    throw refuse(
      429,
      'RESEARCH_ACCOUNT_QUOTA',
      `Research limit reached: ${limits.perAccount} reports per 24 hours for each account. Try again later.`,
    );
  if (recent.length >= limits.global)
    throw refuse(429, 'RESEARCH_DAILY_CAP', 'The server has reached its daily research limit. Try again tomorrow.');
  if (running >= limits.concurrency)
    throw refuse(
      429,
      'RESEARCH_BUSY',
      'Institutional research is busy with other reports. Try again in a few minutes.',
    );
  const next = [...recent, { id: user.id, at: now }];
  try {
    await save(next);
  } catch (e) {
    console.error('[research usage]', e.message);
    throw unavailable();
  }
  usage = next;
  running++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    running--;
  };
}
/** Checks every limit, records the use and takes a concurrency slot. Returns the release function. */
export async function admitResearch(user) {
  if (!user?.emailVerified)
    throw refuse(
      403,
      'EMAIL_UNVERIFIED',
      'Verify your account email in Settings before generating institutional research.',
    );
  // Reservations run one at a time, so two requests cannot both take the last slot.
  const work = chain.then(() => admit(user));
  chain = work.catch(() => {});
  return work;
}
