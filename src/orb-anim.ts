// The animated orb. Loaded on demand (a `lazy-*` chunk, see vite.config.ts) only when motion is on and the orb is on screen.
import { gsap } from 'gsap/gsap-core'; // the ticker is all we need; skips CSSPlugin
import { frameAttributes, orbitFrame, SIM_DAYS_PER_SECOND } from './orbit.ts';

const DAY = 86_400_000;

export interface OrbAnimation {
  play(): void;
  pause(): void;
  /** Playback speed: 1 is normal, negative runs the sky backward. */
  rate(r: number): void;
}

/** Plays real orbits forward from `start`, one Mercury–Earth lap every 16 s, redrawn at 12 fps like a sprite game. */
export function orbAnimation(
  svg: SVGSVGElement,
  start: number,
  caption: { date: HTMLElement; status: HTMLElement },
  labels: { forward: string; backward: string },
): OrbAnimation {
  gsap.ticker.fps(12);
  const day = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });
  const sprites = new Map([...svg.querySelectorAll<SVGElement>('[data-sprite]')].map((el) => [el.dataset.sprite!, el]));
  let sim = start;
  let speed = 1;

  const tick = (_time: number, deltaMs: number) => {
    sim += (deltaMs / 1000) * SIM_DAYS_PER_SECOND * DAY * speed;
    const frame = orbitFrame(sim);
    for (const [name, attrs] of Object.entries(frameAttributes(frame))) {
      const el = sprites.get(name);
      if (el) for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    }
    // Visual caption only (aria-hidden): it narrates the sped-up sky, not today's.
    const label = frame.backward ? labels.backward : labels.forward;
    const date = day.format(sim);
    if (caption.status.textContent !== label) caption.status.textContent = label;
    if (caption.date.textContent !== date) caption.date.textContent = date;
  };

  return {
    play: () => gsap.ticker.add(tick),
    pause: () => gsap.ticker.remove(tick),
    rate: (r) => {
      speed = r;
    },
  };
}
