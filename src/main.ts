import './styles/index.css';
import { getPhase } from './phase.ts';
import { viewModel } from './view.ts';
import { render } from './render.ts';
import { initPrefs } from './prefs.ts';
import { initOracle } from './oracle.ts';
import cycles from './content/cycles.json';
import copy from './content/copy.json';

const now = new Date();
const view = viewModel(now, getPhase(now, cycles.cycles), cycles.cycles, copy);
render(view);
initPrefs();
initOracle(view, copy, cycles.cycles, now);
