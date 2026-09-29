// The share card (1200×630): the site's lockup and tagline beside today's phase, shadow track and real-sky orb.
// Plain HTML with inline styles, rendered to dist/og.png by scripts/og.ts.
import type { Phase } from '../src/phase.ts';
import { escapeHtml, type Copy, type View } from '../src/view.ts';
import { orbMarkup } from '../src/orbit.ts';

const BALL = 'M11 0h4v1h-4zM8 1h10v1H8zM6 2h14v1H6zM5 3h16v1H5zM4 4h18v1H4zM3 5h20v1H3zM2 6h22v2H2zM1 8h24v3H1zM0 11h26v4H0zM1 15h24v3H1zM2 18h22v2H2zM3 20h20v1H3zM4 21h18v1H4zM5 22h16v1H5zM6 23h14v1H6zM8 24h10v1H8zM11 25h4v1h-4z';
const SHINE = 'M8 2h3v1H8zM6 3h2v1H6zM5 4h2v1H5zM4 5h1v1H4zM3 6h1v2H3zM2 8h1v2H2z';
const ORDER: Phase[] = ['direct', 'preshadow', 'retrograde', 'postshadow'];

/** Phase accent colours, read from tokens.css so the card never drifts from the site. */
export function phaseColours(tokensCss: string): Record<Phase, string> {
  const hex = (name: string) => tokensCss.match(new RegExp(`--pc-${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1] ?? '#ffffff';
  return { direct: hex('direct'), preshadow: hex('preshadow'), retrograde: hex('retrograde'), postshadow: hex('postshadow') };
}

export function ogCard(view: View, now: Date, copy: Copy, colours: Record<Phase, string>, fontsHref = '../fonts'): string {
  const pc = colours[view.phase];
  const s = view.slots;
  const e = (t: string | undefined) => escapeHtml(t ?? '');
  const current = ORDER.indexOf(view.phase);
  const seg = (i: number) =>
    i === current
      ? `border:4px solid ${pc};background:repeating-linear-gradient(90deg,${pc} 0 8px,transparent 8px 13px)`
      : i < current
        ? 'border:4px solid #6f5cb8;background:#6f5cb8'
        : 'border:4px solid #6f5cb8';
  const font = (family: string, file: string, weight = 400) =>
    `@font-face{font-family:'${family}';src:url('${fontsHref}/${file}.woff2') format('woff2');font-weight:${weight}}`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${e(copy.site.title)}</title><style>
${font('Jersey 10', 'Jersey10-Regular')}${font('Silkscreen', 'Silkscreen-Regular')}${font('Silkscreen', 'Silkscreen-Bold', 700)}${font('VT323', 'VT323-Regular')}
*{box-sizing:border-box}body{margin:0;background:#06030d;color:#f3ecff;font-family:'VT323',monospace}
svg{display:block;shape-rendering:crispEdges}.label{font-family:'Silkscreen',monospace;letter-spacing:.14em;text-transform:uppercase}
.ring{fill:none;stroke-width:3;stroke-dasharray:6 6}.ring-mercury{stroke:#ff9be6}.sightline{stroke:#ffd479;stroke-width:2;stroke-dasharray:4 6}
.spark{fill:#ff9be6}.earth{fill:#7ee0b0}.earth-core{fill:#3a44e6}.mercury{fill:#fff}
</style></head><body>
<div style="width:1200px;height:630px;position:relative;overflow:hidden;padding:52px 64px;display:flex;gap:40px;align-items:center">
<div aria-hidden="true" style="position:absolute;left:0;top:0;width:4px;height:4px;box-shadow:150px 36px #ff7ae0,230px 120px #5b6bff,60px 290px #fff,610px 26px #5b6bff,650px 590px #ff7ae0,1120px 52px #fff,1160px 140px #5b6bff,1040px 18px #ff7ae0,590px 600px #5b6bff,90px 560px #ff7ae0,1150px 590px #fff,400px 22px #fff,880px 32px #5b6bff"></div>
<div style="position:absolute;inset:18px;border:6px solid ${pc}"></div>
<div style="flex-grow:1;display:flex;flex-direction:column;gap:16px;position:relative">
<div class="label" style="font-size:22px;color:#d6b8ff">${e(copy.site.kicker)}</div>
<div style="display:flex;flex-direction:column;gap:8px">
<div style="font-family:'Jersey 10',monospace;font-size:132px;line-height:.8;color:#ff9be6;text-shadow:4px 4px 0 #3434d8">${e(copy.site.titleMain)}</div>
<div class="label" style="font-weight:700;font-size:30px;letter-spacing:.17em;color:#ffd479">${e(copy.site.titleSub)}</div>
</div>
<div style="font-size:34px;line-height:1.1;max-width:560px">${e(copy.site.tagline)}</div>
<div style="display:flex;flex-direction:column;gap:10px;margin-top:6px">
<div class="label" style="align-self:flex-start;display:flex;align-items:center;gap:12px;padding:6px 14px;border:4px solid ${pc};font-size:16px;letter-spacing:.08em;white-space:nowrap;color:${pc}">
<span style="width:12px;height:12px;background:${pc}"></span><span>${e(s.chip)}</span><span style="color:#f3ecff">${e(`${s['countdown-n']} ${s['countdown-unit']}`)}</span></div>
<div style="display:grid;grid-template-columns:20fr 20fr 17fr;gap:6px;width:520px">
<div style="height:20px;${seg(1)}"></div><div style="height:20px;${seg(2)}"></div><div style="height:20px;${seg(3)}"></div>
</div></div>
<div class="label" style="font-size:18px;color:#7ee0b0">rx.chibimuere.com</div>
</div>
<div style="flex-shrink:0;position:relative;display:flex;flex-direction:column;align-items:center;gap:10px">
<svg viewBox="0 0 312 312" width="380" height="380"><g transform="scale(12)"><path fill="#3a44e6" d="${BALL}"/><path fill="#9fb0ff" d="${SHINE}"/></g>
<circle cx="156" cy="156" r="140" fill="none" stroke="#ff9be6" stroke-width="2" stroke-dasharray="2 8" opacity=".6"/>
<circle cx="156" cy="156" r="112" fill="none" stroke="#9fb0ff" stroke-width="3" stroke-dasharray="6 6"/>
<path fill="#ffd479" d="M144 144h24v24h-24zM150 138h12v36h-12zM138 150h36v12h-36z"/>
${orbMarkup(now.getTime())}</svg>
<div class="label" style="font-size:15px;color:${pc}">${e(s['orb-status'])}</div>
</div>
</div></body></html>`;
}
