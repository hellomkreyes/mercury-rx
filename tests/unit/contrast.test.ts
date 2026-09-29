import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Parses hex tokens straight from the stylesheet, so the CSS stays the single source of truth.
const css = readFileSync(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8');
const block = (selector: string) => css.slice(css.indexOf(selector)).split('}')[0] ?? '';
const tokens = (text: string) => Object.fromEntries([...text.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));

const base = tokens(block(':root {'));
const hc = { ...base, ...tokens(block('[data-theme="hc"] {')) };

// WCAG 2.x relative luminance + contrast ratio.
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

// [foreground, background, minimum]: 4.5 body text, 3 large text / UI / graphics.
const PAIRS: [string, string, number][] = [
  ['text', 'bg', 4.5],
  ['text', 'panel', 4.5],
  ['muted', 'panel', 4.5],
  ['heading', 'panel', 4.5],
  ['pink', 'panel', 3],
  ['gold', 'panel-2', 4.5],
  ['blue', 'panel-2', 4.5],
  ['dialog-text', 'dialog', 4.5],
  ['pink', 'dialog', 4.5],
  ['dialog-muted', 'dialog', 4.5],
  ['gold', 'dialog', 4.5],
  ['footer', 'bg', 4.5],
  ['on-accent', 'ui-border', 4.5],
  ['on-accent', 'focus', 4.5],
  ['ui-border', 'bg', 3],
  ['track', 'panel', 3],
  ['candle-off', 'panel', 3],
  ['focus', 'bg', 3],
  ['focus', 'dialog', 3],
  ['pc-direct', 'panel', 3],
  ['pc-preshadow', 'panel', 3],
  ['pc-retrograde', 'panel', 3],
  ['pc-postshadow', 'panel', 3],
  // Orb graphics that carry meaning (WCAG 1.4.11)
  ['earth', 'orb', 3],
  ['mercury', 'orb', 3],
  ['gold', 'orb', 3],
  ['pink', 'orb', 3],
];

for (const [name, theme] of [['default', base], ['high contrast', hc]] as const) {
  test(`${name} theme meets WCAG AA`, () => {
    for (const [fg, bg, min] of PAIRS) {
      const [a, b] = [theme[fg], theme[bg]];
      assert.ok(a && b, `missing token --${fg} or --${bg}`);
      const r = ratio(a, b);
      assert.ok(r >= min, `--${fg} on --${bg}: ${r.toFixed(2)}:1 < ${min}:1`);
    }
  });
}
