# Mercury Rx · 🔮 The Hidden Realm 🕯️

A pixel-art Mercury retrograde tracker. Static site: Vite + vanilla TypeScript, hosted on GitHub Pages.

## Incantations for the Terminal

```sh
npm install        # install all ze tings
npm run dev        # http://localhost:5173/
npm test           # unit tests (node:test, no extra deps)
npm run build      # cycles → vite build → size budget
npm run test:e2e   # Playwright against the production build
```

### Requires Node 22.18+ 

The tracker runs TypeScript natively via type stripping.

## How the cosmic math is mathing 💫

1. `scripts/build-cycles.ts` uses [Astronomy Engine](https://github.com/cosinekitty/astronomy) to find each retrograde's stations and shadow edges, writing `src/content/cycles.json`.
2. `src/phase.ts` turns "now" plus those cycles into the current phase, counted in the visitor's local calendar.
3. Dates may differ from other almanacs by 1–2 days.
4. CI rebuilds weekly (every Monday), so the cycle data and the baked-in phase stay current.

## The Vibes Were Coded

Full Disclosure: As much as I hate the term, I did in fact 💫 vibe code 💫 this retrograde tracker with Claude(tte) in Co-work mode. Here's what I did to make sure this tracker wasn't another victim of AI slop:
1. Prompt Claudette for 3 very different initial wireframes and mockups
2. Go through 3 rounds of design revisions and choose the strongest design
4. Prompt Claudette to mock up all UI states, device screens, high contrast options, and double check colours are WCAG AA compliant
5. Prompt for a written Technical Plan and read the plan to squash any assumptions made by Claudette
6. Have Claudette break the plan into bite sized PRs
7. Tackle the build iteratively per PR (I have Claude write the code, while I review PRs and merge edits and changes)
8. Host the site on GH Pages

## CD Setup

1. Pushes to `main` test and deploy via `.github/workflows/pages.yml` to [rx.chibimuere.com](https://rx.chibimuere.com).
2. One-time setup: **Settings → Pages → Source: GitHub Actions**, custom domain `rx.chibimuere.com`.

## Website Copy

1. All copy lives in `src/content/copy.json`.
2. `{placeholders}` are filled by `src/view.ts`;
3. `npm test` fails if one doesn't resolve.

## Fonts

Jersey 10, Silkscreen and VT323 (SIL OFL 1.1, licenses in `public/fonts/`) are self-hosted as woff2, subset to Latin-1 plus typographic punctuation:

```sh
pyftsubset <font>.ttf --flavor=woff2 --layout-features=kern,liga \
  --unicodes="U+0020-007E,U+00A0-00FF,U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,U+2022,U+2026,U+2032"
```
