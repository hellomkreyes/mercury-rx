// Checklist ticks last one "season": from a pre-shadow until the next one begins.
import type { Cycle, Phase } from './phase.ts';

export const CHECKLIST_KEY = 'mrx:checklist';

export type Ticks = Partial<Record<Phase, boolean[]>>;
export interface Season {
  season: string;
  ticks: Ticks;
}

/** The pre-shadow that started the current season, or 'initial' before any in the data. */
export function seasonKey(now: Date, cycles: readonly Cycle[]): string {
  let key = 'initial';
  for (const c of cycles) if (Date.parse(c.preShadow) <= now.getTime()) key = c.preShadow;
  return key;
}

/** Stored ticks if they belong to this season; a fresh slate otherwise. */
export function ticksFor(stored: unknown, season: string): Ticks {
  const s = stored as Partial<Season> | null;
  return s && s.season === season && s.ticks && typeof s.ticks === 'object' ? s.ticks : {};
}
