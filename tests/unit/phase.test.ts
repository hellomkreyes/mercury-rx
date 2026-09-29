import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPhase, type Cycle } from '../../src/phase.ts';

// Fixture: the Oct–Nov 2026 Scorpio cycle as computed by scripts/build-cycles.ts.
const SCORPIO: Cycle = {
  preShadow: '2026-10-04T09:11Z',
  stationRx: '2026-10-24T07:16Z',
  stationDirect: '2026-11-13T15:53Z',
  postShadowEnd: '2026-11-30T06:17Z',
  rxLongitude: 230.98,
  directLongitude: 215.03,
  sign: 'Scorpio',
};
const cycles = [SCORPIO];
const at = (iso: string, tz = 'UTC') => getPhase(new Date(iso), cycles, tz);
const plusMinutes = (iso: string, m: number) => new Date(Date.parse(iso) + m * 60_000).toISOString();

test('mock dates land in the designed phases', () => {
  const direct = at('2026-09-28T12:00Z');
  assert.equal(direct.phase, 'direct');
  assert.equal(direct.day, null);
  assert.equal(direct.until.stationRx, 26);
  assert.equal(direct.until.preShadow, 6);

  assert.deepEqual(pick(at('2026-10-12T12:00Z')), { phase: 'preshadow', day: 9, total: 20, next: 12 });
  assert.deepEqual(pick(at('2026-11-01T12:00Z')), { phase: 'retrograde', day: 9, total: 20, next: 12 });
  assert.deepEqual(pick(at('2026-11-20T12:00Z')), { phase: 'postshadow', day: 8, total: 17, next: 10 });
});

// Days to the edge that ends the current phase.
function pick(s: ReturnType<typeof at>) {
  const next = { preshadow: 'stationRx', retrograde: 'stationDirect', postshadow: 'postShadowEnd' } as const;
  return { phase: s.phase, day: s.day, total: s.total, next: s.phase === 'direct' ? null : s.until[next[s.phase]] };
}

test('phase flips exactly at each instant (±1 minute)', () => {
  const edges = [
    [SCORPIO.preShadow, 'direct', 'preshadow'],
    [SCORPIO.stationRx, 'preshadow', 'retrograde'],
    [SCORPIO.stationDirect, 'retrograde', 'postshadow'],
  ] as const;
  for (const [edge, before, after] of edges) {
    assert.equal(at(plusMinutes(edge, -1)).phase, before, `1 min before ${edge}`);
    assert.equal(at(edge).phase, after, `at ${edge}`);
    assert.equal(at(plusMinutes(edge, 1)).phase, after, `1 min after ${edge}`);
  }
});

test('after the post-shadow the next cycle is used, and stale data throws', () => {
  assert.throws(() => at(SCORPIO.postShadowEnd), /run `npm run cycles`/);
  const next: Cycle = { ...SCORPIO, preShadow: '2027-01-20T00:00Z', stationRx: '2027-02-09T00:00Z', stationDirect: '2027-03-03T00:00Z', postShadowEnd: '2027-03-20T00:00Z' };
  assert.equal(getPhase(new Date(SCORPIO.postShadowEnd), [SCORPIO, next], 'UTC').phase, 'direct');
});

test('day counts follow the visitor’s local calendar', () => {
  // 2026-10-24T02:00Z is still Oct 23 in Los Angeles but already Oct 24 in Sydney.
  const la = at('2026-10-24T02:00Z', 'America/Los_Angeles');
  const syd = at('2026-10-24T02:00Z', 'Australia/Sydney');
  assert.equal(la.phase, 'preshadow');
  assert.equal(syd.phase, 'preshadow'); // the station instant (07:16Z) hasn't happened anywhere yet
  assert.equal(la.until.stationRx, 1);
  assert.equal(syd.until.stationRx, 0);
});

test('day never exceeds total on a phase’s final local date', () => {
  const s = at(plusMinutes(SCORPIO.stationDirect, -60));
  assert.equal(s.phase, 'retrograde');
  assert.equal(s.day, s.total);
});

test('progress runs 0 → 1 across the shadow window', () => {
  assert.equal(at('2026-09-01T00:00Z').progress, 0);
  assert.equal(at(SCORPIO.preShadow).progress, 0);
  const mid = at('2026-11-01T12:00Z').progress;
  assert.ok(mid > 0.45 && mid < 0.55, `mid-cycle progress ${mid}`);
  assert.ok(at(plusMinutes(SCORPIO.postShadowEnd, -1)).progress > 0.99);
});
