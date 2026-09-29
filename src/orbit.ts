// Where Earth and Mercury really are, from Keplerian elements, drawn into the scrying orb.
// Elements: JPL "Approximate Positions of the Planets" (Standish), valid 1800–2050. Arcminute-level for our needs,
// with no ephemeris shipped to the browser.

const DAY = 86_400_000;
const J2000 = Date.UTC(2000, 0, 1, 12);
const RAD = Math.PI / 180;

type Element = readonly [value: number, perCentury: number];
interface Orbit { a: Element; e: Element; I: Element; L: Element; peri: Element; node: Element }

const MERCURY: Orbit = {
  a: [0.38709927, 0.00000037],
  e: [0.20563593, 0.00001906],
  I: [7.00497902, -0.00594749],
  L: [252.2503235, 149472.67411175],
  peri: [77.45779628, 0.16047689],
  node: [48.33076593, -0.12534081],
};
const EARTH: Orbit = {
  a: [1.00000261, 0.00000562],
  e: [0.01671123, -0.00004392],
  I: [-0.00001531, -0.01294668],
  L: [100.46457166, 35999.37244981],
  peri: [102.93768193, 0.32327364],
  node: [0, 0],
};

export interface Point { x: number; y: number }

// Heliocentric ecliptic position (AU) at eccentric anomaly E, or at time `ms` when E is omitted.
function position(o: Orbit, ms: number, anomaly?: number): Point {
  const T = (ms - J2000) / (36_525 * DAY);
  const at = ([v, rate]: Element) => v + rate * T;
  const [a, e, I, L, peri, node] = [at(o.a), at(o.e), at(o.I) * RAD, at(o.L), at(o.peri), at(o.node) * RAD];
  let E = anomaly;
  if (E === undefined) {
    const M = ((((L - peri) % 360) + 540) % 360 - 180) * RAD;
    E = M + e * Math.sin(M);
    for (let i = 0; i < 6; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); // Kepler's equation, Newton steps
  }
  const px = a * (Math.cos(E) - e);
  const py = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const w = peri * RAD - node; // argument of perihelion
  const [cw, sw, cn, sn, ci] = [Math.cos(w), Math.sin(w), Math.cos(node), Math.sin(node), Math.cos(I)];
  return {
    x: (cw * cn - sw * sn * ci) * px + (-sw * cn - cw * sn * ci) * py,
    y: (cw * sn + sw * cn * ci) * px + (-sw * sn + cw * cn * ci) * py,
  };
}

/** Geocentric ecliptic longitude of Mercury (J2000 equinox), degrees 0–360. */
export function mercuryLongitude(ms: number): number {
  const m = position(MERCURY, ms);
  const e = position(EARTH, ms);
  return (Math.atan2(m.y - e.y, m.x - e.x) / RAD + 360) % 360;
}

/** True while Mercury appears to slide backward against the stars. */
export function isBackward(ms: number): boolean {
  const d = mercuryLongitude(ms + 3_600_000) - mercuryLongitude(ms - 3_600_000);
  return ((d + 540) % 360) - 180 < 0;
}

// Orb geometry, in SVG units (viewBox 312). 1 AU = Earth's ring.
const C = 156;
const AU = 112;
const STARS = 140;
const GRID = 3; // sprites snap to a 3px grid so they move like pixel art

/** One real Mercury–Earth lap (synodic period) plays in this many seconds. */
export const LOOP_SECONDS = 16;
export const SIM_DAYS_PER_SECOND = 115.88 / LOOP_SECONDS;

const screen = ({ x, y }: Point): Point => ({ x: C + x * AU, y: C - y * AU });
const snap = (n: number) => Math.round(n / GRID) * GRID;

// Where the Earth → Mercury sightline meets the star ring.
function sightOnStars(earth: Point, mercury: Point): Point {
  const d = { x: mercury.x - earth.x, y: mercury.y - earth.y };
  const f = { x: earth.x - C, y: earth.y - C };
  const a = d.x * d.x + d.y * d.y;
  const b = 2 * (f.x * d.x + f.y * d.y);
  const c = f.x * f.x + f.y * f.y - STARS * STARS;
  const k = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
  return { x: earth.x + k * d.x, y: earth.y + k * d.y };
}

export interface Frame {
  earth: Point;
  mercury: Point;
  spark: Point;
  /** Where the spark was about one and two and a half days earlier. */
  trail: [Point, Point];
  backward: boolean;
}

export function orbitFrame(ms: number): Frame {
  const at = (t: number) => {
    const earth = screen(position(EARTH, t));
    const mercury = screen(position(MERCURY, t));
    return { earth, mercury, spark: sightOnStars(earth, mercury) };
  };
  const now = at(ms);
  const s = (p: Point): Point => ({ x: snap(p.x), y: snap(p.y) });
  return {
    earth: s(now.earth),
    mercury: s(now.mercury),
    spark: s(now.spark),
    trail: [s(at(ms - DAY).spark), s(at(ms - 2.5 * DAY).spark)],
    backward: isBackward(ms),
  };
}

/** Mercury's real (eccentric, Sun-at-focus) orbit as an SVG path. */
export function mercuryOrbitPath(ms: number): string {
  const points = Array.from({ length: 72 }, (_, i) => screen(position(MERCURY, ms, (i / 72) * 2 * Math.PI)));
  return 'M' + points.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('L') + 'Z';
}

// Sprite sizes (px) and the attributes each frame sets. Shared by the markup and the animation.
const SIZE = { earth: 22, core: 8, mercury: 14, spark: 7, t1: 5, t2: 4 };
const box = (p: Point, size: number) => ({ x: Math.round(p.x - size / 2), y: Math.round(p.y - size / 2) });

export function frameAttributes(f: Frame): Record<string, Record<string, number>> {
  return {
    sightline: { x1: f.earth.x, y1: f.earth.y, x2: f.spark.x, y2: f.spark.y },
    't2': box(f.trail[1], SIZE.t2),
    't1': box(f.trail[0], SIZE.t1),
    spark: box(f.spark, SIZE.spark),
    earth: box(f.earth, SIZE.earth),
    'earth-core': box(f.earth, SIZE.core),
    mercury: box(f.mercury, SIZE.mercury),
  };
}

const SPRITES: Record<string, string> = {
  sightline: 'line class="sightline"',
  t2: `rect class="spark t2" width="${SIZE.t2}" height="${SIZE.t2}" opacity=".35"`,
  t1: `rect class="spark t1" width="${SIZE.t1}" height="${SIZE.t1}" opacity=".6"`,
  spark: `rect class="spark" width="${SIZE.spark}" height="${SIZE.spark}"`,
  earth: `rect class="earth" width="${SIZE.earth}" height="${SIZE.earth}"`,
  'earth-core': `rect class="earth-core" width="${SIZE.core}" height="${SIZE.core}"`,
  mercury: `rect class="mercury" width="${SIZE.mercury}" height="${SIZE.mercury}"`,
};

/** The moving part of the orb as markup, for the build-time bake and the first browser render. */
export function orbMarkup(ms: number): string {
  const attrs = frameAttributes(orbitFrame(ms));
  const sprites = Object.entries(attrs).map(([name, a]) => {
    const tag = SPRITES[name]!;
    return `<${tag} data-sprite="${name}" ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`;
  });
  return `<path class="ring ring-mercury" d="${mercuryOrbitPath(ms)}"/>` + sprites.join('');
}
