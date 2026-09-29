// Starts and stops the orb animation. GSAP is fetched only when motion is on and the orb is visible.
import type { Copy } from './view.ts';
import type { OrbAnimation } from './orb-anim.ts';

let orb: Promise<OrbAnimation> | undefined;

/** Runs the orb backward at `rate` for `ms`, if it's already playing (the Konami summon). */
export async function reverseOrb(rate: number, ms: number): Promise<void> {
  const anim = await orb;
  if (!anim) return;
  anim.rate(rate);
  setTimeout(() => anim.rate(1), ms);
}

const idle = (fn: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 200));

export function initMotion(now: Date, copy: Copy, root: Document = document): void {
  const html = root.documentElement;
  const svg = root.querySelector<SVGSVGElement>('.orb-svg');
  const date = root.querySelector<HTMLElement>('[data-orb="date"]');
  const status = root.querySelector<HTMLElement>('[data-orb="status"]');
  if (!svg || !date || !status || !('IntersectionObserver' in window)) return;

  let visible = false;
  const wanted = () => visible && html.dataset.motion === 'on';

  const sync = async () => {
    if (!wanted()) return (await orb)?.pause();
    orb ??= new Promise<void>((done) => idle(done))
      .then(() => import('./orb-anim.ts'))
      .then((m) => m.orbAnimation(svg, now.getTime(), { date, status }, copy.orb));
    const anim = await orb;
    // Re-check: the visitor may have paused or scrolled away while GSAP loaded.
    if (wanted()) anim.play();
    else anim.pause();
  };

  new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false;
    void sync();
  }).observe(svg);
  new MutationObserver(() => void sync()).observe(html, { attributes: true, attributeFilter: ['data-motion'] });
}
