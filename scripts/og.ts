// Renders the share card for today's sky into dist/og.png (1200×630) with Playwright's Chromium, then stamps
// the og:image URL with the build date so link previews refetch after the weekly rebuild.
// Locally, a missing browser only warns; in CI it fails the build.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { getPhase } from '../src/phase.ts';
import { viewModel } from '../src/view.ts';
import { ogCard, phaseColours } from './og-card.ts';
import copy from '../src/content/copy.json' with { type: 'json' };
import data from '../src/content/cycles.json' with { type: 'json' };

const DIST = process.env.OG_DIST ?? 'dist';
const now = new Date();
const view = viewModel(now, getPhase(now, data.cycles, 'UTC'), data.cycles, copy, { timeZone: 'UTC' });
const html = ogCard(view, now, copy, phaseColours(readFileSync('src/styles/tokens.css', 'utf8')));

const tmp = resolve(DIST, '.og');
mkdirSync(tmp, { recursive: true });
writeFileSync(resolve(tmp, 'index.html'), html);
try {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(pathToFileURL(resolve(tmp, 'index.html')).href);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: resolve(DIST, 'og.png') });
  await browser.close();
  const index = resolve(DIST, 'index.html');
  writeFileSync(index, readFileSync(index, 'utf8').replace('/og.png"', `/og.png?v=${now.toISOString().slice(0, 10)}"`));
  console.log(`✓ og.png (${view.phase})`);
} catch (error) {
  if (process.env.CI) throw error;
  console.warn('⚠ og.png skipped: no Playwright browser here (npx playwright install chromium).');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
