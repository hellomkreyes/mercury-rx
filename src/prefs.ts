// Display toggles. A stored choice wins; otherwise the OS setting applies, live.
// The inline <head> script in index.html applies the same rules before first paint.
import { load, save } from './storage.ts';

export const PREFS_KEY = 'mrx:prefs';

export interface Prefs {
  hc?: boolean;
  still?: boolean;
}

export const resolvePrefs = (stored: Prefs, os: Required<Prefs>): Required<Prefs> => ({
  hc: stored.hc ?? os.hc,
  still: stored.still ?? os.still,
});

const PREF_FOR: Record<string, keyof Prefs> = { contrast: 'hc', motion: 'still' };

export function initPrefs(root: Document = document): void {
  const html = root.documentElement;
  const group = root.querySelector<HTMLElement>('.toggles');
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-toggle]')];
  const os = { hc: matchMedia('(prefers-contrast: more)'), still: matchMedia('(prefers-reduced-motion: reduce)') };

  const current = () => resolvePrefs(load<Prefs>(PREFS_KEY, {}), { hc: os.hc.matches, still: os.still.matches });

  const apply = () => {
    const p = current();
    if (p.hc) html.dataset.theme = 'hc';
    else delete html.dataset.theme;
    html.dataset.motion = p.still ? 'off' : 'on';
    for (const b of buttons) b.setAttribute('aria-pressed', String(p[PREF_FOR[b.dataset.toggle ?? '']!]));
  };

  for (const b of buttons) {
    b.addEventListener('click', () => {
      const key = PREF_FOR[b.dataset.toggle ?? ''];
      if (!key) return;
      save(PREFS_KEY, { ...load<Prefs>(PREFS_KEY, {}), [key]: !current()[key] });
      apply();
    });
  }
  os.hc.addEventListener('change', apply);
  os.still.addEventListener('change', apply);

  apply();
  if (group) group.hidden = false;
}
