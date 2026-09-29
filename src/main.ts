// Progressive enhancement: the build already baked today's phase in UTC; refresh it in local time.
import './styles/index.css';
import { getPhase } from './phase.ts';
import { viewModel } from './view.ts';
import { render } from './render.ts';
import cycles from './content/cycles.json';
import copy from './content/copy.json';

const now = new Date();
render(viewModel(now, getPhase(now, cycles.cycles), cycles.cycles, copy));
