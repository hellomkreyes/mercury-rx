import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPhase, type Cycle } from '../../src/phase.ts';
import { viewModel, fill } from '../../src/view.ts';
import copy from '../../src/content/copy.json' with { type: 'json' };

const SCORPIO: Cycle = {
  preShadow: '2026-10-04T09:11Z',
  stationRx: '2026-10-24T07:16Z',
  stationDirect: '2026-11-13T15:53Z',
  postShadowEnd: '2026-11-30T06:17Z',
  rxLongitude: 230.98,
  directLongitude: 215.03,
  sign: 'Scorpio',
};
const view = (iso: string, tz = 'UTC') => {
  const now = new Date(iso);
  return viewModel(now, getPhase(now, [SCORPIO], tz), [SCORPIO], copy, { timeZone: tz });
};

test('fill replaces known placeholders and leaves unknown ones', () => {
  assert.equal(fill('Day {day} of {total}', { day: 9, total: 20 }), 'Day 9 of 20');
  assert.equal(fill('{nope}', {}), '{nope}');
});

test('each mock date renders the designed copy', () => {
  const direct = view('2026-09-28T12:00Z').slots;
  assert.equal(direct.chip, 'Direct · clear skies');
  assert.equal(direct['chip-sub'], 'Pre-shadow in 6 days');
  assert.equal(`${direct['countdown-n']} ${direct['countdown-unit']}`, '26 days until retrograde');

  const rx = view('2026-11-01T12:00Z').slots;
  assert.equal(rx.chip, 'Retrograde now');
  assert.equal(rx['chip-sub'], 'Day 9 of 20');
  assert.equal(`${rx['countdown-n']} ${rx['countdown-unit']}`, '12 days until direct');
  assert.equal(rx.sub, 'Mercury appears to walk backward through Scorpio.');

  const pre = view('2026-10-12T12:00Z').slots;
  assert.equal(pre['checklist-title'], 'Seal these before the 24th');

  const post = view('2026-11-20T12:00Z').slots;
  assert.equal(`${post['countdown-n']} ${post['countdown-unit']}`, '10 days until clear skies');
  assert.equal(post['checklist-title'], 'Close the loop by Nov 30');
});

test('singular day counts read naturally', () => {
  const s = view('2026-10-23T12:00Z').slots;
  assert.equal(`${s['countdown-n']} ${s['countdown-unit']}`, '1 day until retrograde');
});

test('grimoire shows local dates with sign degrees', () => {
  const s = view('2026-09-28T12:00Z').slots;
  assert.equal(s['station-rx-date'], 'Oct 24 · 20°59′');
  assert.equal(s['station-direct-date'], 'Nov 13 · 5°02′');
  // Tokyo is already on Nov 30 when post-shadow ends at 06:17 UTC; LA is on Nov 29.
  assert.equal(view('2026-09-28T12:00Z', 'Asia/Tokyo').slots['post-shadow-date'], 'Nov 30');
  assert.equal(view('2026-09-28T12:00Z', 'America/Los_Angeles').slots['post-shadow-date'], 'Nov 29');
});

test('the build-time bake labels its dates as UTC', () => {
  const now = new Date('2026-09-28T12:00Z');
  const { slots } = viewModel(now, getPhase(now, [SCORPIO], 'UTC'), [SCORPIO], copy, { timeZone: 'UTC', labelZone: true });
  assert.equal(slots.today, 'Sep 28 UTC');
});

test('candles mark each of this year’s cycles', () => {
  const FEB: Cycle = { ...SCORPIO, preShadow: '2026-02-11T22:14Z', stationRx: '2026-02-26T06:48Z', stationDirect: '2026-03-20T19:34Z', postShadowEnd: '2026-04-09T11:42Z', sign: 'Pisces' };
  const now = new Date('2026-11-01T12:00Z');
  const { html, slots } = viewModel(now, getPhase(now, [FEB, SCORPIO], 'UTC'), [FEB, SCORPIO], copy, { timeZone: 'UTC' });
  assert.equal(slots['cycles-heading'], '2026 cycles');
  assert.match(html.candles!, /data-state="passed".*Feb 26 – Mar 20.*Pisces · passed/);
  assert.match(html.candles!, /data-state="now".*Oct 24 – Nov 13.*Scorpio · retrograde now/);
});
