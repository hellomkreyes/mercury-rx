// Turns a PhaseState + copy into everything the page shows: text slots, small HTML lists and CSS values.
// Shared by the build-time bake (UTC) and the browser (visitor's local time).
import type { Cycle, Edge, Phase, PhaseState } from './phase.ts';
import type copyJson from './content/copy.json';
import { isBackward, orbMarkup } from './orbit.ts';

export type Copy = typeof copyJson;
export type Slots = Record<string, string>;

export interface ViewOptions {
  timeZone?: string;
  locale?: string;
  /** Append " UTC" to dates: used by the build-time bake so no-JS readers know which zone they're seeing. */
  labelZone?: boolean;
}

export interface View {
  phase: Phase;
  /** Text for [data-slot="…"] elements. */
  slots: Slots;
  /** Escaped markup for [data-html="…"] containers (lists that vary in length). */
  html: Record<string, string>;
  /** Position through the shadow window, 0–1, exposed to CSS as --progress. */
  progress: number;
  /** Placeholder values, for filling cards and checklist items later. */
  vars: Record<string, string | number>;
}

/** The edge each phase counts down to. */
export const COUNTDOWN_EDGE: Record<Phase, Edge> = {
  direct: 'stationRx',
  preshadow: 'stationRx',
  retrograde: 'stationDirect',
  postshadow: 'postShadowEnd',
};

/** Replaces {name} placeholders; unknown names are left in place so tests can catch them. */
export const fill = (template: string, vars: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));

export const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// 20.98 → "20°59′"
const degrees = (lon: number): string => {
  const inSign = lon % 30;
  const whole = Math.floor(inSign);
  return `${whole}°${String(Math.round((inSign - whole) * 60)).padStart(2, '0')}′`;
};

const CHECK = '<svg viewBox="0 0 7 6"><path d="M6 0h1v2H6zM5 1h1v2H5zM4 2h1v2H4zM3 3h1v2H3zM2 4h1v2H2zM1 3h1v2H1zM0 2h1v2H0z"/></svg>';

type CandleState = 'passed' | 'now' | 'next' | 'after' | 'upcoming';

// Where a cycle stands relative to the current one.
function candleState(c: Cycle, current: Cycle, phase: Phase): CandleState {
  if (c === current) return phase === 'retrograde' ? 'now' : phase === 'postshadow' ? 'after' : 'next';
  return Date.parse(c.stationRx) < Date.parse(current.stationRx) ? 'passed' : 'upcoming';
}

export function viewModel(
  now: Date,
  state: PhaseState,
  cycles: readonly Cycle[],
  copy: Copy,
  { timeZone, locale = 'en', labelZone = false }: ViewOptions = {},
): View {
  const { phase, cycle, day, total, until, progress } = state;
  const text = copy.phases[phase];
  const zone = labelZone ? ' UTC' : '';

  const format = (iso: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(new Date(iso));
  const date = (iso: string) => format(iso, { month: 'short', day: 'numeric' }) + zone;
  const plural = new Intl.PluralRules(locale);
  const ordinal = new Intl.PluralRules(locale, { type: 'ordinal' });
  const SUFFIX: Record<string, string> = { one: 'st', two: 'nd', few: 'rd', other: 'th' };
  const nth = (n: number) => `${n}${SUFFIX[ordinal.select(n)] ?? 'th'}`;
  const days = (n: number) => `${n} ${plural.select(n) === 'one' ? 'day' : 'days'}`;

  const year = format(now.toISOString(), { year: 'numeric' });
  const countdown = until[COUNTDOWN_EDGE[phase]];
  const vars = {
    day: day ?? '',
    total: total ?? '',
    sign: cycle.sign,
    year,
    preShadowDays: days(until.preShadow),
    preShadowDate: date(cycle.preShadow),
    stationRxDate: date(cycle.stationRx),
    stationRxDay: nth(Number(format(cycle.stationRx, { day: 'numeric' }))),
    postShadowDate: date(cycle.postShadowEnd),
  };
  const f = (template: string) => fill(template, vars);

  const slots: Slots = {
    // Static copy
    'site-title-main': copy.site.titleMain,
    'site-title-sub': copy.site.titleSub,
    skip: copy.site.skip,
    'toggles-group': copy.toggles.group,
    'toggle-motion': copy.toggles.motion,
    'toggle-contrast': copy.toggles.contrast,
    'status-heading': copy.status.heading,
    'orb-heading': copy.orb.heading,
    'veil-title': copy.veil.title,
    'veil-why': copy.veil.why,
    'veil-inside': copy.veil.inside,
    'veil-sun': copy.veil.sun,
    'veil-mercury': copy.veil.mercury,
    'veil-earth': copy.veil.earth,
    'veil-sight': copy.veil.sight,
    'veil-spark': copy.veil.spark,
    'veil-cta': copy.veil.cta,
    'veil-close': copy.veil.close,
    'veil-reopen': copy.veil.reopen,
    'grimoire-heading': copy.grimoire.heading,
    'grimoire-pre': copy.grimoire.preShadow,
    'grimoire-rx': copy.grimoire.stationRx,
    'grimoire-direct': copy.grimoire.stationDirect,
    'grimoire-post': copy.grimoire.postShadowEnd,
    'grimoire-sign': copy.grimoire.sign,
    'track-pre': copy.track.preshadow,
    'track-rx': copy.track.retrograde,
    'track-post': copy.track.postshadow,
    heed: copy.oracle.heed,
    'ask-again': copy.oracle.askAgain,
    return: copy.oracle.back,
    'why-label': copy.oracle.whyNoResetLabel,
    'why-no-reset': copy.oracle.whyNoReset,
    'quest-badge': copy.eggs.quest.badge,
    disclaimer: copy.disclaimer.full,
    'footer-year': copy.footer.year,
    'footer-name': copy.footer.name,
    'footer-collab': copy.footer.collab,
    'not-found-title': copy.notFound.title,
    'not-found-lead': copy.notFound.lead,
    'not-found-body': copy.notFound.body,
    'not-found-back': copy.notFound.back,
    // Phase copy
    'phase-label': text.label,
    chip: text.chip,
    'chip-sub': f(text.chipSub),
    'countdown-n': String(countdown),
    'countdown-unit': plural.select(countdown) === 'one' ? text.countdown.one : text.countdown.other,
    sub: f(text.sub),
    today: date(now.toISOString()),
    // What Mercury is really doing right now; the animation takes over when motion is on.
    'orb-date': date(now.toISOString()),
    'orb-status': isBackward(now.getTime()) ? copy.orb.backward : copy.orb.forward,
    'oracle-lead': text.oracle.lead,
    'oracle-em': text.oracle.em,
    'oracle-card': f(text.oracle.cards[0] ?? ''),
    'oracle-count': fill(copy.oracle.card, { n: 1, total: text.oracle.cards.length }),
    'checklist-title': f(text.checklist.title),
    'checklist-count': fill(copy.oracle.sealed, { done: 0, total: text.checklist.items.length }),
    'pre-shadow-date': date(cycle.preShadow),
    'station-rx-date': `${date(cycle.stationRx)} · ${degrees(cycle.rxLongitude)}`,
    'station-direct-date': `${date(cycle.stationDirect)} · ${degrees(cycle.directLongitude)}`,
    'post-shadow-date': date(cycle.postShadowEnd),
    'track-pre-date': date(cycle.preShadow),
    'track-rx-date': date(cycle.stationRx),
    'track-post-date': `${date(cycle.stationDirect)}–${date(cycle.postShadowEnd)}`,
    sign: cycle.sign,
    'cycles-heading': fill(copy.cycles.heading, { year }),
  };

  // This calendar year's retrogrades, one candle each.
  const candles = cycles
    .filter((c) => format(c.stationRx, { year: 'numeric' }) === year)
    .map((c) => {
      const s = candleState(c, cycle, phase);
      const range = `${date(c.stationRx)} – ${date(c.stationDirect)}`;
      return `<li class="candle" data-state="${s}"><span class="candle-range">${escapeHtml(range)}</span><span class="candle-meta">${escapeHtml(`${c.sign} · ${copy.cycles[s]}`)}</span></li>`;
    });

  // The phase's checklist; ticks are restored in the browser (oracle.ts).
  const checklist = text.checklist.items.map(
    (item, i) =>
      `<li><label class="chk"><input type="checkbox" data-index="${i}"><span class="box" aria-hidden="true">${CHECK}</span><span class="txt">${escapeHtml(f(item))}</span></label></li>`,
  );

  return { phase, slots, html: { candles: candles.join(''), checklist: checklist.join(''), 'orb-sky': orbMarkup(now.getTime()) }, progress, vars };
}
