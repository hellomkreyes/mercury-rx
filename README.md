# Mercury RX · The Hidden Realm

A pixel-art Mercury retrograde tracker. Static site: Vite + vanilla TypeScript, hosted on GitHub Pages.

## Develop

```sh
npm install
npm run dev        # http://localhost:5173/mercury-rx/
npm test           # unit tests (node:test, no extra deps)
npm run build      # cycles → vite build → size budget
npm run test:e2e   # Playwright against the production build
```

Requires Node 22.18+ (runs TypeScript natively via type stripping).

## How dates work

`scripts/build-cycles.ts` uses [Astronomy Engine](https://github.com/cosinekitty/astronomy) to find each retrograde's stations and shadow edges, writing `src/content/cycles.json`. `src/phase.ts` turns "now" plus those cycles into the current phase, counted in the visitor's local calendar. Dates may differ from other almanacs by 1–2 days.

CI rebuilds weekly, so the cycle data and the baked-in phase stay current.

## Deploy

Pushes to `main` test and deploy via `.github/workflows/pages.yml`. One-time setup: **Settings → Pages → Source: GitHub Actions**.
