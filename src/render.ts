// Browser counterpart of bake(): the same view, re-applied in the visitor's own time zone.
import type { View } from './view.ts';

export function render({ phase, slots, html, progress }: View, root: Document = document): void {
  const doc = root.documentElement;
  doc.dataset.phase = phase;
  doc.style.setProperty('--progress', progress.toFixed(3));

  for (const el of root.querySelectorAll<HTMLElement>('[data-slot]')) {
    const value = slots[el.dataset.slot ?? ''];
    if (value !== undefined && el.textContent !== value) el.textContent = value;
  }
  // Lists are built from escaped strings in view.ts, so innerHTML is safe here.
  for (const el of root.querySelectorAll<HTMLElement>('[data-html]')) {
    const value = html[el.dataset.html ?? ''];
    if (value !== undefined && el.innerHTML !== value) el.innerHTML = value;
  }
}
