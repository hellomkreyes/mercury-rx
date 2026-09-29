import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPhase, type Phase } from '../../src/phase.ts';
import { viewModel, fill } from '../../src/view.ts';
import copy from '../../src/content/copy.json' with { type: 'json' };
import data from '../../src/content/cycles.json' with { type: 'json' };

const PHASES: Phase[] = ['direct', 'preshadow', 'retrograde', 'postshadow'];
// One real date per phase, taken from the generated cycles.
const c = data.cycles.find((x) => x.stationRx.startsWith('2026-10'))!;
const mid = (a: string, b: string) => new Date((Date.parse(a) + Date.parse(b)) / 2);
const DATES: Record<Phase, Date> = {
  direct: new Date(Date.parse(c.preShadow) - 7 * 86_400_000),
  preshadow: mid(c.preShadow, c.stationRx),
  retrograde: mid(c.stationRx, c.stationDirect),
  postshadow: mid(c.stationDirect, c.postShadowEnd),
};

test('every phase has the same shape of copy', () => {
  const shape = (o: unknown): unknown =>
    Array.isArray(o) ? 'array' : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, shape(v)])) : typeof o;
  const reference = shape(copy.phases.direct);
  for (const phase of PHASES) assert.deepEqual(shape(copy.phases[phase]), reference, `${phase} matches direct`);
});

test('every placeholder in every phase resolves', () => {
  for (const phase of PHASES) {
    const now = DATES[phase];
    const view = viewModel(now, getPhase(now, data.cycles, 'UTC'), data.cycles, copy, { timeZone: 'UTC' });
    assert.equal(view.phase, phase);
    const p = copy.phases[phase];
    const strings = [p.chipSub, p.sub, p.checklist.title, ...p.oracle.cards, ...p.checklist.items].map((t) => fill(t, view.vars));
    for (const s of [...strings, ...Object.values(view.slots)]) assert.doesNotMatch(s, /\{\w+\}/, `${phase}: unresolved placeholder in "${s}"`);
  }
});

test('decks and checklists are the designed sizes', () => {
  for (const phase of PHASES) {
    assert.ok(copy.phases[phase].oracle.cards.length >= 3, `${phase} has at least 3 cards`);
    assert.equal(copy.phases[phase].checklist.items.length, 4, `${phase} has 4 checklist items`);
  }
});

test('the footer credit and the 404 page have their copy', () => {
  assert.equal(copy.footer.year, '© 3005'); // a Childish Gambino nod, and a prophecy: never "fix" it
  for (const value of [copy.footer.name, copy.footer.collab, ...Object.values(copy.notFound), copy.site.titleMain, copy.site.titleSub]) assert.ok(value.trim());
  assert.equal(`${copy.site.titleMain} · ${copy.site.titleSub}`, copy.site.title);
});
