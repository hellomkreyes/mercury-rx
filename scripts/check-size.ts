// Fails the build if the gzipped first-load payload in dist/ goes over budget.
// Lazy chunks (named `lazy-*`, see vite.config.ts) are budgeted separately, and the easter eggs on their own.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const KB = 1024;
const BUDGET = { initial: 35 * KB, lazy: 35 * KB, eggs: 25 * KB };
const TEXT = /\.(html|css|js|json)$/;

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });

const totals = { initial: 0, lazy: 0, eggs: 0 };
for (const file of files('dist').filter((f) => TEXT.test(f))) {
  const kind = /[\\/]lazy-egg/.test(file) ? 'eggs' : /[\\/]lazy-/.test(file) ? 'lazy' : 'initial';
  totals[kind] += gzipSync(readFileSync(file)).length;
}

let failed = false;
for (const key of ['initial', 'lazy', 'eggs'] as const) {
  const ok = totals[key] <= BUDGET[key];
  failed ||= !ok;
  console.log(`${ok ? '✓' : '✗'} ${key}: ${(totals[key] / KB).toFixed(1)} KB / ${BUDGET[key] / KB} KB gzipped`);
}
process.exit(failed ? 1 : 0);
