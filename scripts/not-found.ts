// Builds dist/404.html from src/not-found.html after `vite build`: same stylesheet and prefs script as the
// built index page, same build-time bake. No JS bundle of its own.
import { readFileSync, writeFileSync } from 'node:fs';
import { bake } from '../src/bake.ts';
import { getPhase } from '../src/phase.ts';
import { viewModel } from '../src/view.ts';
import copy from '../src/content/copy.json' with { type: 'json' };
import data from '../src/content/cycles.json' with { type: 'json' };

const built = readFileSync('dist/index.html', 'utf8');
const prefs = built.match(/<script>\(function\(\)\{[\s\S]*?<\/script>/)?.[0];
const styles = built.match(/<link rel="stylesheet"[^>]*>/g) ?? [];
if (!prefs || !styles.length) throw new Error('dist/index.html is missing its prefs script or stylesheet; run vite build first.');

const now = new Date();
const view = viewModel(now, getPhase(now, data.cycles, 'UTC'), data.cycles, copy, { timeZone: 'UTC', labelZone: true });
const template = readFileSync('src/not-found.html', 'utf8').replace(/<!-- head:.*-->/, [prefs, ...styles].join('\n    '));
writeFileSync('dist/404.html', bake(template, view));
console.log('✓ 404.html');
