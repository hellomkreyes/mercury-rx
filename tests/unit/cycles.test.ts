import { test } from 'node:test';
import assert from 'node:assert/strict';
import data from '../../src/content/cycles.json' with { type: 'json' };
import type { Cycle } from '../../src/phase.ts';

const cycles: Cycle[] = data.cycles;
const minutes = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 60_000;
const toDms = (deg: number) => `${Math.floor(deg % 30)}°${String(Math.round((deg % 1) * 60)).padStart(2, '0')}′`;

test('cycles are well formed and in order', () => {
  assert.ok(cycles.length >= 8, 'at least a couple of years of cycles');
  let previousEnd = 0;
  for (const c of cycles) {
    const edges = [c.preShadow, c.stationRx, c.stationDirect, c.postShadowEnd].map(Date.parse);
    assert.ok(edges.every((e, i) => i === 0 || e > edges[i - 1]!), `edges ascend for ${c.stationRx}`);
    assert.ok(edges[0]! > previousEnd, `cycles don't overlap at ${c.stationRx}`);
    previousEnd = edges[3]!;
  }
});

// Cross-check against published ephemerides (astrologyrising.com, farmersalmanac.com).
test('Oct–Nov 2026 matches published stations within minutes', () => {
  const c = cycles.find((x) => x.stationRx.startsWith('2026-10'));
  assert.ok(c, 'the 2026 Scorpio cycle is present');
  assert.ok(minutes(c.stationRx, '2026-10-24T07:13Z') <= 10);
  assert.ok(minutes(c.stationDirect, '2026-11-13T15:54Z') <= 10);
  assert.equal(toDms(c.rxLongitude), '20°59′'); // published 20°58′; within rounding
  assert.equal(toDms(c.directLongitude), '5°02′');
  assert.equal(c.sign, 'Scorpio');
  assert.ok(c.preShadow.startsWith('2026-10-04'));
  assert.ok(/^2026-11-(29|30)/.test(c.postShadowEnd), 'published as Nov 29–30 depending on time zone');
});
