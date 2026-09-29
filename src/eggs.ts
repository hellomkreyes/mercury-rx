// Easter eggs: the triggers live here (tiny); the show (GSAP + plugins) loads only when one fires.
import type { Phase } from './phase.ts';
import type { Copy } from './view.ts';

export const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];

/** Adds `key` to the last ten pressed; true when they spell the code (so ↑↑↑↓↓… still works). */
export function konami(recent: string[], key: string): boolean {
  recent.push(key.toLowerCase());
  if (recent.length > KONAMI.length) recent.shift();
  return recent.length === KONAMI.length && recent.every((k, i) => k === KONAMI[i]);
}

// Touch: swipes on the orb are the arrows, taps are B then A.
const SWIPE = 30;
function gesture(dx: number, dy: number, last: string | undefined): string {
  if (Math.hypot(dx, dy) < 10) return last === 'b' ? 'a' : 'b';
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE) return '';
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'arrowright' : 'arrowleft') : dy > 0 ? 'arrowdown' : 'arrowup';
}

const show = () => import('./egg-show.ts');

export function initEggs(phase: Phase, copy: Copy, root: Document = document): { quest(origins: Element[]): void } {
  const recent: string[] = [];
  const step = (key: string) => {
    if (!konami(recent, key)) return;
    recent.length = 0;
    void show().then((m) => m.summon(copy.eggs.konami, root));
  };

  root.addEventListener('keydown', (e) => {
    if (!e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey) step(e.key);
  });

  // Passive touch listeners, so swiping over the orb still scrolls the page.
  const orb = root.querySelector('.orb-svg');
  let start: Touch | undefined;
  orb?.addEventListener('touchstart', (e) => (start = (e as TouchEvent).changedTouches[0]), { passive: true });
  orb?.addEventListener(
    'touchend',
    (e) => {
      const end = (e as TouchEvent).changedTouches[0];
      if (!start || !end) return;
      const key = gesture(end.clientX - start.clientX, end.clientY - start.clientY, recent.at(-1));
      if (key) step(key);
    },
    { passive: true },
  );

  return {
    quest: (origins) => void show().then((m) => m.questComplete(copy.eggs.quest, phase, origins, root)),
  };
}
