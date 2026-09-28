// Entry point. For now it only proves the phase engine end to end; the UI lands in the next PR.
import { getPhase } from './phase.ts';
import data from './content/cycles.json';

const state = getPhase(new Date(), data.cycles);
document.documentElement.dataset.phase = state.phase;

const status = document.getElementById('status');
if (status) {
  const detail = state.day ? ` (day ${state.day} of ${state.total})` : ` (retrograde in ${state.until.stationRx} days)`;
  status.textContent = `Mercury is ${state.phase}${detail}.`;
}
