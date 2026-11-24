/** Account-scoped institutional research jobs and in-app inbox.
 * A successful notification is written only after the real research operation completes.
 * The server must stay running; no Yahoo private-account credentials are used.
 */
import { mkdir, readFile, writeFile, readdir, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { jobsRoot } from './paths.mjs';
const ACTIVE = new Set();
const JOB_ID = /^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i;
function directory(user) {
  if (!/^[a-f0-9]{32}$/.test(user.id)) throw new Error('Invalid account');
  return join(jobsRoot(), user.id);
}
function file(user, id) {
  if (!JOB_ID.test(id)) throw Object.assign(new Error('Invalid job identifier'), { status: 400 });
  return join(directory(user), id + '.json');
}
async function write(user, job) {
  const dir = directory(user);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const dest = file(user, job.id),
    tmp = dest + '.' + process.pid + '.tmp';
  await writeFile(tmp, JSON.stringify(job), { mode: 0o600 });
  await rename(tmp, dest);
}
export async function getInstitutionalJob(user, id) {
  try {
    const job = JSON.parse(await readFile(file(user, id), 'utf8'));
    if (job.accountId !== user.id) return null;
    if (
      ['queued', 'running'].includes(job.status) &&
      Date.now() - Date.parse(job.createdAt) > 10 * 60_000 &&
      !ACTIVE.has(job.id)
    ) {
      job.status = 'failed';
      job.error = 'Generation interrupted or timed out. You can request a new report.';
      job.finishedAt = new Date().toISOString();
      await write(user, job);
    }
    return job;
  } catch (e) {
    if (e.status) throw e;
    return null;
  }
}
export async function listInstitutionalJobs(user) {
  let files = [];
  try {
    files = (await readdir(directory(user))).filter(
      (x) => JOB_ID.test(x.slice(0, -5)) && x.endsWith('.json'),
    );
  } catch {
    return [];
  }
  const jobs = await Promise.all(files.slice(-100).map((x) => getInstitutionalJob(user, x.slice(0, -5))));
  return jobs
    .filter(Boolean)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 40)
    .map(({ text, ...metadata }) => metadata);
}
/**
 * `admit` runs only when no job for this ticker is open yet (dedupe first, so a reused job costs nothing).
 * It throws to refuse the job, or returns a release function that is called once the runner settles.
 */
const STARTING = new Map();
export function startInstitutionalJob(user, ticker, runner, admit) {
  // Two requests racing past the file-based dedupe below would otherwise both start a paid job.
  const k = user.id + ':' + ticker;
  if (STARTING.has(k)) return STARTING.get(k).then((r) => ({ job: r.job, reused: true }));
  const work = startJob(user, ticker, runner, admit).finally(() => STARTING.delete(k));
  STARTING.set(k, work);
  return work;
}
async function startJob(user, ticker, runner, admit = () => () => {}) {
  const existing = (await listInstitutionalJobs(user)).find(
    (x) => x.ticker === ticker && ['running', 'queued'].includes(x.status),
  );
  if (existing) return { job: existing, reused: true };
  const release = await admit();
  const id = randomUUID();
  const job = {
    id,
    accountId: user.id,
    ticker,
    status: 'queued',
    createdAt: new Date().toISOString(),
    finishedAt: null,
    read: false,
    error: null,
    text: null,
  };
  try {
    await write(user, job);
  } catch (e) {
    release();
    throw e;
  }
  const executeJob = async () => {
    ACTIVE.add(id);
    try {
      job.status = 'running';
      await write(user, job);
      const report = await runner(ticker, user.language);
      job.status = 'completed';
      job.text = report.text;
      job.provider = report.provider;
      job.model = report.model;
      job.generatedAt = report.generatedAt;
      job.sourceNote = report.sourceNote;
      job.finishedAt = new Date().toISOString();
    } catch (error) {
      job.status = 'failed';
      job.error = String(error.message || error).slice(0, 300);
      job.finishedAt = new Date().toISOString();
    } finally {
      try {
        await write(user, job);
      } catch (e) {
        console.error('[research job write]', e.message);
      }
      ACTIVE.delete(id);
      release();
    }
  };
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    await executeJob();
    return { job: { ...job, text: undefined }, reused: false };
  }
  setImmediate(executeJob);
  return { job: { ...job, text: undefined }, reused: false };
}
export async function markInstitutionalJobRead(user, id) {
  const job = await getInstitutionalJob(user, id);
  if (!job) return null;
  job.read = true;
  await write(user, job);
  return { ok: true, id, read: true };
}
