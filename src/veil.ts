// The veil over the orb: the science of retrograde first, then "Peer into the crystal ball".
// html[data-veil] is 'on' (clouded), 'lifting' (mist clearing) or 'off'. The <head> script sets it before
// first paint from localStorage, so returning visitors go straight to the orb. Without JS the explanation
// is plain text above the orb and nothing is hidden.
import { load, save } from './storage.ts';

export const PEERED_KEY = 'mrx:peered';
const LIFT_MS = 500; // matches the stepped fade in motion.css

export function initVeil(root: Document = document): void {
  const html = root.documentElement;
  const peer = root.querySelector<HTMLButtonElement>('[data-action="peer"]');
  const unpeer = root.querySelector<HTMLButtonElement>('[data-action="unpeer"]');
  const orb = root.querySelector<SVGSVGElement>('.orb-svg');
  const heading = root.querySelector<HTMLElement>('#veil-heading');
  if (!peer || !unpeer || !orb || !heading) return;

  html.dataset.veil ??= load(PEERED_KEY, false) ? 'off' : 'on';
  const sync = () => {
    unpeer.hidden = html.dataset.veil !== 'off';
  };

  peer.addEventListener('click', () => {
    save(PEERED_KEY, true);
    const done = () => {
      html.dataset.veil = 'off';
      sync();
      orb.focus(); // screen readers hear the orb's description next
    };
    if (html.dataset.motion === 'on') {
      html.dataset.veil = 'lifting';
      setTimeout(done, LIFT_MS);
    } else done();
  });

  unpeer.addEventListener('click', () => {
    html.dataset.veil = 'on';
    sync();
    heading.focus();
  });

  peer.hidden = false;
  sync();
}
