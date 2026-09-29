// The oracle dialog: "Ask again" deals the phase's cards, "Heed the stars" opens its checklist.
import type { Cycle } from './phase.ts';
import { fill, type Copy, type View } from './view.ts';
import { CHECKLIST_KEY, seasonKey, ticksFor } from './checklist.ts';
import { load, save } from './storage.ts';

type ViewName = 'oracle' | 'checklist';

export function initOracle(view: View, copy: Copy, cycles: readonly Cycle[], now: Date, root: Document = document): void {
  const section = root.querySelector<HTMLElement>('#oracle');
  if (!section) return;
  const $ = <T extends HTMLElement>(sel: string) => section.querySelector<T>(sel)!;
  const text = copy.phases[view.phase];

  // Ask again: cycle through the deck; the card is a polite live region, focus stays put.
  const cards = text.oracle.cards;
  let card = 0;
  $('[data-action="ask"]').addEventListener('click', () => {
    card = (card + 1) % cards.length;
    $('[data-slot="oracle-card"]').textContent = fill(cards[card]!, view.vars);
    $('[data-slot="oracle-count"]').textContent = fill(copy.oracle.card, { n: card + 1, total: cards.length });
  });

  // Checklist ticks, restored for this season.
  const season = seasonKey(now, cycles);
  const ticks = ticksFor(load(CHECKLIST_KEY, null), season);
  const boxes = [...section.querySelectorAll<HTMLInputElement>('.chk input')];
  const count = $('[data-slot="checklist-count"]');
  const sealed = () => {
    count.textContent = fill(copy.oracle.sealed, { done: boxes.filter((b) => b.checked).length, total: boxes.length });
  };
  boxes.forEach((box, i) => {
    box.checked = ticks[view.phase]?.[i] ?? false;
    box.addEventListener('change', () => {
      ticks[view.phase] = boxes.map((b) => b.checked);
      save(CHECKLIST_KEY, { season, ticks });
      sealed();
    });
  });
  sealed();

  // Toggletip: a disclosure, so it reads the same everywhere and needs no positioning.
  const tipButton = $<HTMLButtonElement>('.tip-btn');
  const tip = $('#why-tip');
  const setTip = (open: boolean) => {
    tip.hidden = !open;
    tipButton.setAttribute('aria-expanded', String(open));
  };
  tipButton.addEventListener('click', () => setTip(tipButton.getAttribute('aria-expanded') !== 'true'));
  root.addEventListener('click', (e) => {
    if (!tip.hidden && !tipButton.contains(e.target as Node) && !tip.contains(e.target as Node)) setTip(false);
  });

  // View swap. The section's label follows the visible heading.
  const views = [...section.querySelectorAll<HTMLElement>('[data-view]')];
  const show = (name: ViewName) => {
    const swap = () => {
      for (const v of views) v.hidden = v.dataset.view !== name;
      setTip(false);
      section.setAttribute('aria-labelledby', name === 'oracle' ? 'oracle-heading' : 'checklist-heading');
      (name === 'oracle' ? $('[data-action="heed"]') : $('#checklist-heading')).focus();
    };
    const still = root.documentElement.dataset.motion === 'off';
    if (!still && root.startViewTransition) root.startViewTransition(swap);
    else swap();
  };
  $('[data-action="heed"]').addEventListener('click', () => show('checklist'));
  $('[data-action="back"]').addEventListener('click', () => show('oracle'));

  section.addEventListener('keydown', (e) => {
    // Esc closes the tip first, then the checklist.
    if (e.key === 'Escape') {
      if (!tip.hidden) {
        setTip(false);
        tipButton.focus();
      } else if (!$('[data-view="checklist"]').hidden) show('oracle');
      return;
    }
    // Arrow keys hop between choices, like a game menu; Tab still reaches each one.
    const target = e.target as HTMLElement;
    if (!target.classList.contains('choice')) return;
    const choices = [...target.parentElement!.querySelectorAll<HTMLElement>('.choice')];
    const i = choices.indexOf(target);
    const next = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: choices.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    choices[(next + choices.length) % choices.length]!.focus();
  });

  for (const el of section.querySelectorAll<HTMLElement>('.choices')) el.hidden = false;
}
