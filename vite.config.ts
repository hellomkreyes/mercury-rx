import { defineConfig, type Plugin } from 'vite';
import { getPhase } from './src/phase.ts';
import { viewModel } from './src/view.ts';
import { bake } from './src/bake.ts';
import cycles from './src/content/cycles.json';
import copy from './src/content/copy.json';

// Bakes the build day's phase + copy into index.html (in UTC) so the page is complete without JS.
// The weekly CI rebuild keeps it current.
function bakePhase(): Plugin {
  return {
    name: 'bake-phase',
    transformIndexHtml(html) {
      const now = new Date();
      return bake(html, viewModel(now, getPhase(now, cycles.cycles, 'UTC'), copy, { timeZone: 'UTC', labelZone: true }));
    },
  };
}

// Served from rx.chibimuere.com (custom domain on GitHub Pages), so assets live at the root.
export default defineConfig({
  base: '/',
  plugins: [bakePhase()],
});
