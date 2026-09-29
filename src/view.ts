// Turns a PhaseState + copy into the strings every [data-slot] shows.
// Shared by the build-time bake (UTC) and the browser (visitor's local time).
import type { Edge, Phase, PhaseState } from './phase.ts';
import type copyJson from './content/copy.json';

export type Copy = typeof copyJson;
export type Slots = Record<string, string>;

export interface ViewOptions {
  timeZone?: string;
  locale?: string;
  /** Append " UTC" to dates: used by the build-time bake so no-JS readers know which zone they're seeing. */
  labelZone?: boolean;
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

// 20.98 → "20°59′"
const degrees = (lon: number): string => {
  const inSign = lon % 30;
  const whole = Math.floor(inSign);
  return `${whole}°${String(Math.round((inSign - whole) * 60)).padStart(2, '0')}′`;
};

export interface View {
  phase: Phase;
  slots: Slots;
  /** Placeholder values, for filling cards and checklist items later. */
  vars: Record<string, string | number>;
}

export function viewModel(now: Date, state: PhaseState, copy: Copy, { timeZone, locale = 'en', labelZone = false }: ViewOptions = {}): View {
  const { phase, cycle, day, total, until } = state;
  const text = copy.phases[phase];
  const zone = labelZone ? ' UTC' : '';

  const date = (iso: string) => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone }).format(new Date(iso)) + zone;
  const dayOfMonth = (iso: string) => Number(new Intl.DateTimeFormat(locale, { day: 'numeric', timeZone }).format(new Date(iso)));
  const plural = new Intl.PluralRules(locale);
  const ordinal = new Intl.PluralRules(locale, { type: 'ordinal' });
  const SUFFIX = { one: 'st', two: 'nd', few: 'rd', other: 'th' } as Record<string, string>;
  const nth = (n: number) => `${n}${SUFFIX[ordinal.select(n)] ?? 'th'}`;
  const days = (n: number) => `${n} ${plural.select(n) === 'one' ? 'day' : 'days'}`;

  const countdown = until[COUNTDOWN_EDGE[phase]];
  const vars = {
    day: day ?? '',
    total: total ?? '',
    sign: cycle.sign,
    preShadowDays: days(until.preShadow),
    preShadowDate: date(cycle.preShadow),
    stationRxDate: date(cycle.stationRx),
    stationRxDay: nth(dayOfMonth(cycle.stationRx)),
    postShadowDate: date(cycle.postShadowEnd),
  };
  const f = (template: string) => fill(template, vars);

  const slots: Slots = {
    // Static copy
    'site-title': copy.site.title,
    skip: copy.site.skip,
    'status-heading': copy.status.heading,
    'grimoire-heading': copy.grimoire.heading,
    'grimoire-pre': copy.grimoire.preShadow,
    'grimoire-rx': copy.grimoire.stationRx,
    'grimoire-direct': copy.grimoire.stationDirect,
    'grimoire-post': copy.grimoire.postShadowEnd,
    'grimoire-sign': copy.grimoire.sign,
    disclaimer: copy.disclaimer.full,
    // Phase copy
    'phase-label': text.label,
    chip: text.chip,
    'chip-sub': f(text.chipSub),
    'countdown-n': String(countdown),
    'countdown-unit': plural.select(countdown) === 'one' ? text.countdown.one : text.countdown.other,
    sub: f(text.sub),
    today: date(now.toISOString()),
    'oracle-lead': text.oracle.lead,
    'oracle-em': text.oracle.em,
    'oracle-card': f(text.oracle.cards[0] ?? ''),
    'checklist-title': f(text.checklist.title),
    'pre-shadow-date': date(cycle.preShadow),
    'station-rx-date': `${date(cycle.stationRx)} · ${degrees(cycle.rxLongitude)}`,
    'station-direct-date': `${date(cycle.stationDirect)} · ${degrees(cycle.directLongitude)}`,
    'post-shadow-date': date(cycle.postShadowEnd),
    sign: cycle.sign,
  };
  return { phase, slots, vars };
}
