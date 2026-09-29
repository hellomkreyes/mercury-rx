// Computes Mercury retrograde cycles (stations + shadow edges) → src/content/cycles.json.
// Runs in Node at build time so the browser never ships an ephemeris.
import * as Astronomy from 'astronomy-engine';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DAY = 86_400_000;
const MINUTE = 60_000;
const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

// Geocentric apparent ecliptic longitude of date, in degrees.
const lon = (ms: number): number =>
  Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Mercury, new Date(ms), true)).elon;

// Signed shortest difference a − b in degrees, in (−180, 180].
const diff = (a: number, b: number): number => ((a - b + 540) % 360) - 180;

// Degrees per day, sampled ±1 h around `ms`.
const speed = (ms: number): number => diff(lon(ms + 3_600_000), lon(ms - 3_600_000)) * 12;

// Bisect until the sign of f flips inside a one-minute window.
function bisect(f: (ms: number) => number, lo: number, hi: number): number {
  const loSign = Math.sign(f(lo));
  while (hi - lo > MINUTE) {
    const mid = (lo + hi) / 2;
    if (Math.sign(f(mid)) === loSign) lo = mid;
    else hi = mid;
  }
  return Math.round(hi / MINUTE) * MINUTE;
}

// Walk day by day from `start` (either direction) until f changes sign, then refine.
function crossing(f: (ms: number) => number, start: number, step: number): number {
  let a = start;
  let b = start + step;
  while (Math.sign(f(a)) === Math.sign(f(b))) {
    a = b;
    b += step;
  }
  return bisect(f, Math.min(a, b), Math.max(a, b));
}

const iso = (ms: number): string => new Date(ms).toISOString().replace(':00.000Z', 'Z');
const round2 = (n: number): number => Math.round(n * 100) / 100;

export function buildCycles(from: Date, to: Date) {
  const cycles = [];
  let t = from.getTime();
  while (t < to.getTime()) {
    const stationRx = crossing(speed, t, DAY);
    if (speed(stationRx - DAY) < 0) { t = stationRx + DAY; continue; } // that was a direct station
    const stationDirect = crossing(speed, stationRx + DAY, DAY);
    const rxLon = lon(stationRx);
    const directLon = lon(stationDirect);
    // Shadow edges: when Mercury first reaches the direct-station degree, and when it regains the retrograde-station degree.
    const preShadow = crossing((ms) => diff(lon(ms), directLon), stationRx - DAY, -DAY);
    const postShadowEnd = crossing((ms) => diff(lon(ms), rxLon), stationDirect + DAY, DAY);
    cycles.push({
      preShadow: iso(preShadow),
      stationRx: iso(stationRx),
      stationDirect: iso(stationDirect),
      postShadowEnd: iso(postShadowEnd),
      rxLongitude: round2(rxLon),
      directLongitude: round2(directLon),
      sign: SIGNS[Math.floor(rxLon / 30)],
    });
    t = postShadowEnd + DAY;
  }
  return cycles;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
  const to = new Date(Date.UTC(now.getUTCFullYear() + 3, 11, 31));
  const cycles = buildCycles(from, to);
  const first = cycles[0];
  const last = cycles.at(-1);
  if (!first || !last) throw new Error(`No retrograde cycles found between ${from.toISOString()} and ${to.toISOString()}.`);

  const out = { generated: now.toISOString(), source: 'astronomy-engine', cycles };
  writeFileSync(new URL('../src/content/cycles.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
  console.log(`cycles.json: ${cycles.length} cycles, ${first.stationRx} → ${last.postShadowEnd}`);
}
