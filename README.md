# Mercury Rx · 🔮 The Hidden Realm 🕯️

A pixel-art Mercury retrograde tracker. Static site: Vite + vanilla TypeScript, hosted on GitHub Pages.

## Develop

```sh
npm install
npm run dev        # http://localhost:5173/
npm test           # unit tests (node:test, no extra deps)
npm run build      # cycles → vite build → size budget
npm run test:e2e   # Playwright against the production build
```

Requires Node 22.18+ (runs TypeScript natively via type stripping).

## How the cosmic math is mathing 💫

`scripts/build-cycles.ts` uses [Astronomy Engine](https://github.com/cosinekitty/astronomy) to find each retrograde's stations and shadow edges, writing `src/content/cycles.json`. `src/phase.ts` turns "now" plus those cycles into the current phase, counted in the visitor's local calendar. Dates may differ from other almanacs by 1–2 days.

CI rebuilds weekly, so the cycle data and the baked-in phase stay current.

## Deploy

Pushes to `main` test and deploy via `.github/workflows/pages.yml` to [rx.chibimuere.com](https://rx.chibimuere.com). One-time setup: **Settings → Pages → Source: GitHub Actions**, custom domain `rx.chibimuere.com`.

## Fonts

Jersey 10, Silkscreen and VT323 (SIL OFL 1.1, licenses in `public/fonts/`) are self-hosted as woff2, subset to Latin-1 plus typographic punctuation:

```sh
pyftsubset <font>.ttf --flavor=woff2 --layout-features=kern,liga \
  --unicodes="U+0020-007E,U+00A0-00FF,U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,U+2022,U+2026,U+2032"
```

## Content

All copy lives in `src/content/copy.json`. `{placeholders}` are filled by `src/view.ts`; `npm test` fails if one doesn't resolve.
