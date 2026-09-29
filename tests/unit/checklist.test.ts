import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seasonKey, ticksFor } from '../../src/checklist.ts';
import data from '../../src/content/cycles.json' with { type: 'json' };

const oct = data.cycles.find((c) => c.stationRx.startsWith('2026-10'))!;
const next = data.cycles[data.cycles.indexOf(oct) + 1]!;
const at = (iso: string, ms = 0) => new Date(Date.parse(iso) + ms);

test('a season runs from one pre-shadow to the next', () => {
  const season = seasonKey(at(oct.preShadow), data.cycles);
  assert.equal(season, oct.preShadow);
  // Retrograde, post-shadow and the direct stretch after it all share the season.
  for (const iso of [oct.stationRx, oct.stationDirect, oct.postShadowEnd]) assert.equal(seasonKey(at(iso), data.cycles), season);
  assert.equal(seasonKey(at(next.preShadow, -1), data.cycles), season);
  assert.equal(seasonKey(at(next.preShadow), data.cycles), next.preShadow);
});

test('before the first cycle in the data, the season is "initial"', () => {
  assert.equal(seasonKey(at(data.cycles[0]!.preShadow, -1), data.cycles), 'initial');
});

test('ticks from another season are dropped', () => {
  const stored = { season: 'a', ticks: { retrograde: [true, false, false, false] } };
  assert.deepEqual(ticksFor(stored, 'a'), stored.ticks);
  assert.deepEqual(ticksFor(stored, 'b'), {});
  assert.deepEqual(ticksFor(null, 'a'), {});
  assert.deepEqual(ticksFor('junk', 'a'), {});
});
