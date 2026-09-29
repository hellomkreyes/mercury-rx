// Browser counterpart of bake(): same slots, re-filled in the visitor's own time zone.
import type { View } from './view.ts';

export function render({ phase, slots }: View, root: Document = document): void {
  root.documentElement.dataset.phase = phase;
  for (const el of root.querySelectorAll<HTMLElement>('[data-slot]')) {
    const value = slots[el.dataset.slot ?? ''];
    if (value !== undefined && el.textContent !== value) el.textContent = value;
  }
}
