// Build-time HTML fill: writes the view into index.html so the page is complete without JS.
import { escapeHtml, type View } from './view.ts';

/** Sets <html data-phase> + --progress, the text of every text-only [data-slot], and every empty [data-html] container. */
export function bake(html: string, { phase, slots, html: lists, progress }: View): string {
  return html
    .replace(/(<html\b[^>]*\sdata-phase=")[^"]*(")/, `$1${phase}$2`)
    .replace(/(<html\b[^>]*\sstyle=")[^"]*(")/, `$1--progress: ${progress.toFixed(3)}$2`)
    .replace(/(<([a-z][\w-]*)\b[^>]*\sdata-slot="([\w-]+)"[^>]*>)[^<]*(<\/\2>)/g, (match, open: string, _tag: string, name: string, close: string) =>
      name in slots ? open + escapeHtml(slots[name]!) + close : match,
    )
    .replace(/(<([a-z][\w-]*)\b[^>]*\sdata-html="([\w-]+)"[^>]*>)(<\/\2>)/g, (match, open: string, _tag: string, name: string, close: string) =>
      name in lists ? open + lists[name] + close : match,
    );
}
