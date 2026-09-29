// Build-time HTML fill: writes each slot's text into index.html so the page is complete without JS.
import type { View } from './view.ts';

const escape = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Sets <html data-phase> and the text of every text-only element carrying data-slot="…". */
export function bake(html: string, { phase, slots }: View): string {
  return html
    .replace(/(<html\b[^>]*\sdata-phase=")[^"]*(")/, `$1${phase}$2`)
    .replace(/(<([a-z][\w-]*)\b[^>]*\sdata-slot="([\w-]+)"[^>]*>)[^<]*(<\/\2>)/g, (match, open: string, _tag: string, name: string, close: string) =>
      name in slots ? open + escape(slots[name]!) + close : match,
    );
}
