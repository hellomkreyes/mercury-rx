// Pure phase engine: (instant, cycles, time zone) → where Mercury is in its retrograde cycle.
// No DOM, no clock — callers pass `now`, which keeps it trivially testable.

export type Phase = 'direct' | 'preshadow' | 'retrograde' | 'postshadow';

/** One retrograde cycle; instants are ISO-8601 UTC strings. */
export interface Cycle {
  preShadow: string;
  stationRx: string;
  stationDirect: string;
  postShadowEnd: string;
  rxLongitude: number;
  directLongitude: number;
  sign: string;
}

export type Edge = 'preShadow' | 'stationRx' | 'stationDirect' | 'postShadowEnd';

export interface PhaseState {
  phase: Phase;
  cycle: Cycle;
  /** Day within the current phase (1-based) and the phase length, in local calendar days. Null while direct. */
  day: number | null;
  total: number | null;
  /** Local calendar days from today to each edge of the cycle (negative once passed). */
  until: Record<Edge, number>;
  /** Position through the whole shadow window, 0–1 (the track marker). */
  progress: number;
}

const DAY = 86_400_000;
const EDGES: Edge[] = ['preShadow', 'stationRx', 'stationDirect', 'postShadowEnd'];
const PHASES: Phase[] = ['direct', 'preshadow', 'retrograde', 'postshadow'];

// Local calendar date as a day number, so "days until" matches what the visitor's own calendar says.
function dayNumber(instant: Date, timeZone?: string): number {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant);
  return Date.parse(`${ymd}T00:00:00Z`) / DAY;
}

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

/** Current phase for `now`. Throws if `cycles` doesn't reach past `now` (the data needs a rebuild). */
export function getPhase(now: Date, cycles: readonly Cycle[], timeZone?: string): PhaseState {
  const t = now.getTime();
  const cycle = cycles.find((c) => t < Date.parse(c.postShadowEnd));
  if (!cycle) throw new Error('cycles.json has no cycle after ' + now.toISOString() + '; run `npm run cycles`.');

  const edges = EDGES.map((e) => Date.parse(cycle[e]));
  const index = edges.filter((edge) => t >= edge).length; // 0 = before pre-shadow … 3 = post-shadow
  const phase = PHASES[index]!;

  const today = dayNumber(now, timeZone);
  const days = EDGES.map((e) => dayNumber(new Date(cycle[e]), timeZone));
  const until = Object.fromEntries(EDGES.map((e, i) => [e, days[i]! - today])) as Record<Edge, number>;

  let day: number | null = null;
  let total: number | null = null;
  if (index > 0) {
    const start = days[index - 1]!;
    total = days[index]! - start;
    // Clamp: the final local date of a phase can precede its exact end instant.
    day = clamp(today - start + 1, 1, total);
  }

  const progress = clamp((t - edges[0]!) / (edges[3]! - edges[0]!), 0, 1);
  return { phase, cycle, day, total, until, progress };
}
