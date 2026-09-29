import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getPhase, type Phase } from '../../src/phase.ts';
import { viewModel } from '../../src/view.ts';
import { ogCard, phaseColours } from '../../scripts/og-card.ts';
import copy from '../../src/content/copy.json' with { type: 'json' };
import data from '../../src/content/cycles.json' with { type: 'json' };

const colours = phaseColours(readFileSync(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8'));
const DATES: Record<Phase, string> = { direct: '2026-09-28T12:00Z', preshadow: '2026-10-12T12:00Z', retrograde: '2026-11-01T12:00Z', postshadow: '2026-11-20T12:00Z' };

test('phase colours come from the tokens', () => {
  assert.deepEqual(colours, { direct: '#7ee0b0', preshadow: '#ffd479', retrograde: '#ff5fa8', postshadow: '#b58cff' });
});

for (const [phase, iso] of Object.entries(DATES) as [Phase, string][]) {
  test(`the ${phase} card shows the lockup, the phase and its countdown`, () => {
    const now = new Date(iso);
    const view = viewModel(now, getPhase(now, data.cycles, 'UTC'), data.cycles, copy, { timeZone: 'UTC' });
    const html = ogCard(view, now, copy, colours);
    for (const text of [copy.site.titleMain, copy.site.titleSub, copy.site.kicker, view.slots.chip!, view.slots['orb-status']!]) assert.ok(html.includes(text), text);
    assert.ok(html.includes(`border:6px solid ${colours[phase]}`), 'frame in the phase colour');
    assert.doesNotMatch(html, /\{\w+\}|undefined/);
  });
}
