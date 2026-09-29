// The easter egg show. Its own lazy chunk: GSAP, CSSPlugin and the bonus plugins load only when an egg fires.
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { Physics2DPlugin } from 'gsap/Physics2DPlugin';
import { CustomEase } from 'gsap/CustomEase';
import { CustomBounce } from 'gsap/CustomBounce';
import type { Phase } from './phase.ts';
import type { Copy } from './view.ts';
import { fill, escapeHtml } from './view.ts';
import { reverseOrb } from './motion.ts';

gsap.registerPlugin(SplitText, Physics2DPlugin, CustomEase, CustomBounce);
gsap.ticker.fps(12); // same sprite-game frame rate as the orb
CustomBounce.create('questBounce', { strength: 0.5, squash: 0 });

type Eggs = Copy['eggs'];

const still = (root: Document) => root.documentElement.dataset.motion !== 'on';

// Says it once, even if the same text was said before.
function announce(root: Document, text: string): void {
  const region = root.querySelector('[data-egg-announce]');
  if (!region) return;
  region.textContent = '';
  requestAnimationFrame(() => (region.textContent = text));
}

// Esc and outside taps close whatever egg is open, before the page's own Esc handling sees the key.
function dismissible(root: Document, close: () => void, { outside = false } = {}): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    close();
  };
  const onPointer = () => close();
  root.addEventListener('keydown', onKey, true);
  if (outside) root.addEventListener('pointerdown', onPointer, true);
  return () => {
    root.removeEventListener('keydown', onKey, true);
    root.removeEventListener('pointerdown', onPointer, true);
  };
}

const CONFETTI = ['var(--pink)', 'var(--gold)', 'var(--magic-teal)', 'var(--blue)', 'var(--text)'];

/** JRPG victory: letters bounce in, the XP bar fills, pixel confetti bursts from the checkboxes. */
export function questComplete(copy: Eggs['quest'], phase: Phase, origins: Element[], root: Document = document): void {
  const section = root.querySelector<HTMLElement>('#oracle');
  if (!section) return;
  section.querySelectorAll('.quest, .confetti').forEach((el) => el.remove());

  const reward = copy.reward[phase];
  announce(root, fill(copy.announce, { xp: copy.xp, reward }));

  const banner = root.createElement('div');
  banner.className = 'quest';
  banner.setAttribute('aria-hidden', 'true');
  banner.innerHTML = `<p class="quest-title">${escapeHtml(copy.title)}</p><p class="quest-xp">${escapeHtml(`${copy.xp} · ${reward}`)}</p><div class="quest-bar"><span></span></div>`;
  section.append(banner);

  let timer = 0;
  const tweens: gsap.core.Animation[] = [];
  const close = () => {
    clearTimeout(timer);
    stop();
    tweens.forEach((t) => t.kill());
    section.querySelectorAll('.quest, .confetti').forEach((el) => el.remove());
  };
  const stop = dismissible(root, close, { outside: true });
  timer = window.setTimeout(close, 5000);

  const fillBar = banner.querySelector<HTMLElement>('.quest-bar span')!;
  if (still(root)) {
    fillBar.style.transform = 'scaleX(1)';
    return;
  }

  const title = banner.querySelector('.quest-title')!;
  const split = SplitText.create(title, { type: 'chars', aria: 'none' });
  tweens.push(
    gsap
      .timeline()
      .from(banner, { y: -24, autoAlpha: 0, duration: 0.25 })
      .from(split.chars, { y: -36, autoAlpha: 0, duration: 0.9, ease: 'questBounce', stagger: 0.05 })
      .fromTo(fillBar, { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: 'steps(10)' }, '<0.3'),
  );

  // Confetti from each checkbox, in the palette.
  const layer = root.createElement('div');
  layer.className = 'confetti';
  layer.setAttribute('aria-hidden', 'true');
  section.append(layer);
  const box = section.getBoundingClientRect();
  for (const origin of origins) {
    const r = origin.getBoundingClientRect();
    for (let i = 0; i < 8; i++) {
      const bit = root.createElement('span');
      bit.style.left = `${r.left + r.width / 2 - box.left}px`;
      bit.style.top = `${r.top + r.height / 2 - box.top}px`;
      bit.style.background = CONFETTI[i % CONFETTI.length]!;
      layer.append(bit);
      tweens.push(
        gsap.to(bit, {
          duration: 1.6,
          physics2D: { velocity: gsap.utils.random(220, 460), angle: gsap.utils.random(200, 340), gravity: 900 },
          rotation: gsap.utils.random([-90, 90, 180]),
          autoAlpha: 0,
          onComplete: () => bit.remove(),
        }),
      );
    }
  }
}

// ── The Magician ──────────────────────────────────────────────────────────────────────────────
// Pixel art as rows: g = gold, t = teal, w = text colour.
const MAGICIAN = [
  '...gg.gg.....g..',
  '..g..g..g....g..',
  '...gg.gg.....g..',
  '............tg..',
  '......ww....t...',
  '.....wwww..t....',
  '.....wwww.t.....',
  '......wwtt......',
  '....ttttttt.....',
  '...t.ttttt......',
  '..t..tgggt......',
  '.t...ttttt......',
  '.....ttttt......',
  '....ttttttt.....',
  '...ttttttttt....',
  'gggggggggggggggg',
  '.g............g.',
  '.g............g.',
];
// ☿ Mercury's glyph: horns, head, cross.
const MERCURY = ['g...g', '.ggg.', 'g...g', 'g...g', '.ggg.', '..g..', 'ggggg', '..g..'];

function pixels(rows: string[], dx = 0, dy = 0): string {
  const paths: Record<string, string> = {};
  rows.forEach((row, y) => {
    for (const m of row.matchAll(/([a-z])\1*/g)) paths[m[1]!] = (paths[m[1]!] ?? '') + `M${dx + m.index!} ${dy + y}h${m[0].length}v1h-${m[0].length}z`;
  });
  return Object.entries(paths).map(([c, d]) => `<path class="px-${c}" d="${d}"/>`).join('');
}

const cursor = '<svg class="cur" viewBox="0 0 3 5" aria-hidden="true"><path d="M0 0h1v5H0zM1 1h1v3H1zM2 2h1v1H2z"/></svg>';

let open = false;

/** Konami code: the oracle is summoned, deals The Magician, the sky runs backward and the toast calls you out. */
export function summon(copy: Eggs['konami'], root: Document = document): void {
  if (open) return;
  open = true;
  const html = root.documentElement;
  const returnTo = root.activeElement instanceof HTMLElement && root.activeElement !== root.body ? root.activeElement : root.querySelector<HTMLElement>('#oracle');

  const dialog = root.createElement('div');
  dialog.className = 'summon';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-labelledby', 'summon-name');
  dialog.setAttribute('aria-describedby', 'summon-text');
  dialog.tabIndex = -1;
  dialog.innerHTML = `
    <div class="tarot"><div class="tarot-inner">
      <div class="tarot-face tarot-back" aria-hidden="true"></div>
      <div class="tarot-face tarot-front">
        <p class="tarot-num" aria-hidden="true">${escapeHtml(copy.number)}</p>
        <svg class="tarot-art" viewBox="0 0 16 28" aria-hidden="true">${pixels(MAGICIAN, 0, 1)}${pixels(MERCURY, 5.5, 20)}</svg>
        <h2 class="tarot-name" id="summon-name">${escapeHtml(copy.name)}</h2>
      </div>
    </div></div>
    <p class="summon-text" id="summon-text">${escapeHtml(copy.text)}</p>
    <div class="choices"><button type="button" class="choice" data-action="dismiss">${cursor}<span>${escapeHtml(copy.dismiss)}</span></button></div>`;

  const toast = root.createElement('p');
  toast.className = 'toast';
  toast.setAttribute('aria-hidden', 'true'); // announced through the live region instead
  toast.textContent = copy.toast;

  root.body.append(dialog, toast);
  dialog.focus();
  announce(root, copy.toast);

  const tweens: gsap.core.Animation[] = [];
  const toastTimer = window.setTimeout(() => toast.remove(), 6000);
  const close = () => {
    stop();
    clearTimeout(toastTimer);
    tweens.forEach((t) => t.progress(1).kill());
    dialog.remove();
    toast.remove();
    open = false;
    returnTo?.focus();
  };
  const stop = dismissible(root, close);
  dialog.querySelector('[data-action="dismiss"]')!.addEventListener('click', close);

  if (still(root)) return;

  const progress = parseFloat(getComputedStyle(html).getPropertyValue('--progress')) || 0;
  tweens.push(
    gsap
      .timeline()
      .from(dialog, { scale: 0.6, opacity: 0, duration: 0.25, ease: 'steps(3)' }) // opacity, not autoAlpha: it holds focus
      .to(dialog, { keyframes: { x: [-12, 12, -9, 9, -6, 6, -3, 3, 0] }, duration: 0.75, ease: 'none' })
      .from('.summon .tarot', { y: 40, scale: 0.4, duration: 0.4, ease: 'steps(4)' })
      .fromTo('.summon .tarot-inner', { rotationY: 180 }, { rotationY: 0, duration: 0.6, ease: 'steps(6)' })
      .from('.summon .summon-text, .summon .choices', { opacity: 0, duration: 0.25, stagger: 0.15 }),
    gsap.from(toast, { yPercent: 200, duration: 0.4, ease: 'steps(4)', delay: 1.2 }),
    // Everything goes retrograde: the marker slides back to the start of the shadow, then home again.
    gsap
      .timeline({ delay: 0.8 })
      .to(html, { '--progress': 0, duration: 2.5, ease: 'steps(20)' })
      .to(html, { '--progress': progress, duration: 1, ease: 'steps(8)' }, '+=1'),
  );
  void reverseOrb(-2, 8000); // one full lap, backward, at double speed
}
