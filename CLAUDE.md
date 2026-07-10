# Bazaar Brawler

A mobile auto-battler set in a Persian night market. This repo is self-contained and independent of Robbie's second-brain vault; nothing here should be written there, and nothing there is needed here.

## Source of truth

Read `handoff-bazaar-brawler-2026-07-09.md` in full before making changes. It carries the rules spec, data tables, the phased mission, the art direction, and the decisions not to re-litigate. Phases 0 and 1 (module structure, tests, PWA, saves, Netlify deploy) are complete. Next up: Phase 2, the painted-art asset pipeline.

## Layout

| Path | What it is |
|---|---|
| `bazaar-brawler.html` | The original single-file game. Never edit it; the parity test in `tests/parity.test.js` checks the modules against it fight for fight. |
| `index.html` | The page: CSS, SVG sprite, markup. Loads `src/main.js`. |
| `src/engine.js` | The combat sim. Pure, deterministic, DOM-free, headless-testable. Keep it that way. |
| `src/data.js` | Items, monsters, trinkets, anomalies, personas, constants. |
| `src/ui.js` | All DOM rendering and game flow, including the saves system. |
| `src/art.js` | Sprite access point. Phase 2 extends it: try `art/items/{id}.png` first, fall back to the SVG symbol. |
| `public/` | Manifest, service worker, generated icons. Bump `CACHE_V` in `sw.js` and `SAVE_VERSION` in `ui.js` when a deploy must invalidate old state. |
| `scripts/make-icons.js` | Regenerates the placeholder icon set. |

## Commands

- `npm test` runs the full suite: engine behavior, parity against the original file, dash scan, sprite symbol coverage. Any refactor that breaks it reverts.
- `npm run dev` serves on the port in `.claude/launch.json` (5199).
- `npm run build` then `npx netlify deploy --prod --dir dist` ships to https://bazaar-brawler.netlify.app (site already linked via `.netlify/state.json`).

## Hard rules

- Zero em dashes and zero en dashes anywhere, including docs, comments, and commit messages. The dash scan in `npm test` enforces this and it scans markdown, so this file counts.
- Approved change batches get applied in full, not piecemeal.
- Target device is an iPhone in Safari standalone mode: test at 390x844, respect safe areas, no hover-dependent interactions.
- One new system per version. Each phase ships working, tests green, with the live Netlify URL shown at the end.
- The sim stays pure and the two health layers, targeting rules, and economy in the handoff are settled; do not re-litigate them.
