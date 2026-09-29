import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bake } from '../../src/bake.ts';
import { getPhase } from '../../src/phase.ts';
import { viewModel } from '../../src/view.ts';
import copy from '../../src/content/copy.json' with { type: 'json' };
import data from '../../src/content/cycles.json' with { type: 'json' };

const view = (slots: Record<string, string>) => ({ phase: 'retrograde' as const, slots, vars: {} });

test('fills text-only slots and sets data-phase', () => {
  const html = '<html lang="en" data-phase="direct"><p data-slot="chip">old</p><span class="x" data-slot="sub"></span></html>';
  const out = bake(html, view({ chip: 'Retrograde now', sub: 'Tom & Jerry <3' }));
  assert.match(out, /data-phase="retrograde"/);
  assert.match(out, /<p data-slot="chip">Retrograde now<\/p>/);
  assert.match(out, /<span class="x" data-slot="sub">Tom &amp; Jerry &lt;3<\/span>/);
});

test('leaves unknown slots untouched', () => {
  const html = '<html data-phase="direct"><p data-slot="mystery">keep</p></html>';
  assert.match(bake(html, view({})), /<p data-slot="mystery">keep<\/p>/);
});

test('index.html has no empty slot after baking', () => {
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const now = new Date('2026-11-01T12:00Z');
  const out = bake(html, viewModel(now, getPhase(now, data.cycles, 'UTC'), copy, { timeZone: 'UTC', labelZone: true }));
  const empty = [...out.matchAll(/data-slot="([\w-]+)"[^>]*><\//g)].map((m) => m[1]);
  assert.deepEqual(empty, [], `empty slots: ${empty.join(', ')}`);
  assert.match(out, /data-phase="retrograde"/);
});
