import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Astronomy from 'astronomy-engine';
import { isBackward, mercuryLongitude, orbitFrame, orbMarkup } from '../../src/orbit.ts';
import data from '../../src/content/cycles.json' with { type: 'json' };

const DAY = 86_400_000;
const HOUR = 3_600_000;

test('Kepler positions track Astronomy Engine within half a degree', () => {
  // The gap is mostly precession: ours is J2000, theirs is of-date.
  for (let t = Date.UTC(2025, 0, 1); t < Date.UTC(2030, 0, 1); t += 5 * DAY) {
    const reference = Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Mercury, new Date(t), true)).elon;
    const off = Math.abs(((mercuryLongitude(t) - reference + 540) % 360) - 180);
    assert.ok(off < 0.5, `${new Date(t).toISOString()}: ${off.toFixed(2)}° off`);
  }
});

test('the orb turns backward within an hour of every real station', () => {
  for (const c of data.cycles) {
    const rx = Date.parse(c.stationRx);
    const direct = Date.parse(c.stationDirect);
    assert.equal(isBackward(rx - HOUR), false, `forward just before ${c.stationRx}`);
    assert.equal(isBackward(rx + HOUR), true, `backward just after ${c.stationRx}`);
    assert.equal(isBackward(direct - HOUR), true, `backward just before ${c.stationDirect}`);
    assert.equal(isBackward(direct + HOUR), false, `forward just after ${c.stationDirect}`);
  }
});

test('frames snap sprites to the 3px grid and keep the spark on the star ring', () => {
  const f = orbitFrame(Date.parse('2026-11-01T12:00Z'));
  for (const p of [f.earth, f.mercury, f.spark]) assert.ok(p.x % 3 === 0 && p.y % 3 === 0);
  const r = Math.hypot(f.spark.x - 156, f.spark.y - 156);
  assert.ok(Math.abs(r - 140) <= 3, `spark ${r.toFixed(1)} from the centre`);
  // Mercury sits between perihelion and aphelion of its drawn orbit (0.31–0.47 AU at 112 px/AU).
  const m = Math.hypot(f.mercury.x - 156, f.mercury.y - 156);
  assert.ok(m > 32 && m < 55, `Mercury ${m.toFixed(1)} from the Sun`);
});

test('orb markup has Mercury’s orbit and every sprite', () => {
  const svg = orbMarkup(Date.parse('2026-11-01T12:00Z'));
  assert.match(svg, /<path class="ring ring-mercury" d="M[\d. L]+Z"\/>/);
  for (const name of ['sightline', 't2', 't1', 'spark', 'earth', 'earth-core', 'mercury']) assert.match(svg, new RegExp(`data-sprite="${name}"`));
});
