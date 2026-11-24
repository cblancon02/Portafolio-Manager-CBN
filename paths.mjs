/** Data locations. PM_DATA_DIR moves every writable store (accounts, jobs, reports, cache) at once. */
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(here, '../data');
export const dataRoot = () => (process.env.PM_DATA_DIR ? resolve(process.env.PM_DATA_DIR) : DEFAULT_ROOT);
export const privateRoot = () => join(dataRoot(), 'private');
export const jobsRoot = () => join(privateRoot(), 'institutional-jobs');
export const reportsRoot = () => join(dataRoot(), 'reports');
export const cacheRoot = () => join(dataRoot(), 'cache');
