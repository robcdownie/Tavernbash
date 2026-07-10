# Bazaar Brawler

A mobile auto-battler set in a Persian night market. This repo is self-contained and independent of Robbie's second-brain vault; nothing here should be written there, and nothing there is needed here.

## Source of truth

Read `handoff-bazaar-brawler-2026-07-09.md` in full before making changes. It carries the rules spec, data tables, the phased mission, the art direction, and the decisions not to re-litigate. Phases 0 through 2 (module structure, tests, PWA, saves, Netlify deploy, painted-art pipeline) are complete. Next up: Phase 3, Pixi.js particles. Painted art batches can land any time: drop PNGs into `public/art/` per the naming rules in `scripts/make-art-manifest.js`, run `npm run art`, and the game picks them up.

## Layout

| Path | What it is |
|---|---|
| `bazaar-brawler.html` | The original single-file game. Never edit it; the parity test in `tests/parity.test.js` checks the modules against it fight for fight. |
| `index.html` | The page: CSS, SVG sprite, markup. Loads `src/main.js`. |
| `src/engine.js` | The combat sim. Pure, deterministic, DOM-free, headless-testable. Keep it that way. |
| `src/data.js` | Items, monsters, trinkets, anomalies, personas, constants. |
| `src/ui.js` | All DOM rendering and game flow, including the saves system. |
| `src/art.js` | Sprite access point. Renders the painted PNG for an id when the manifest has one, else the SVG symbol. Same svg wrapper both ways, so CSS never changes. |
| `src/art-manifest.js` | Generated map of glyph id to painted PNG path. Never edit by hand; `npm run art` rebuilds it (also runs before dev, build, and test). |
| `public/art/` | Painted art drops here: `items/{id}.png`, `monsters/{glyph suffix}.png` (the Debt Collector is `debt.png`), `portraits/p0.png` to `p7.png`, plus `frames`, `board`, `bg` for CSS art. |
| `public/` | Manifest, service worker, generated icons. Bump `CACHE_V` in `sw.js` and `SAVE_VERSION` in `ui.js` when a deploy must invalidate old state. |
| `scripts/make-icons.js` | Regenerates the placeholder icon set. |
| `scripts/make-art-manifest.js` | Scans `public/art` and writes `src/art-manifest.js`. Filename rules are documented at the top of the file. |

## Commands

- `npm test` runs the full suite: engine behavior, parity against the original file, dash scan, sprite symbol coverage, art manifest sync, ingest matcher. Any refactor that breaks it reverts.
- `npm run ingest -- <folder> [--strip-bg]` files raw image generations into `public/art`: matches each file by an id token in its name, resizes to spec, converts to PNG, optionally flood-fills a solid background to transparent, and regenerates the manifest. Unmatched or ambiguous files are reported and left alone.
- `npm run dev` serves on the port in `.claude/launch.json` (5199).
- `npm run build` then `npx netlify deploy --prod --dir dist` ships to https://bazaar-brawler.netlify.app (site already linked via `.netlify/state.json`).

## Hard rules

- Zero em dashes and zero en dashes anywhere, including docs, comments, and commit messages. The dash scan in `npm test` enforces this and it scans markdown, so this file counts.
- Approved change batches get applied in full, not piecemeal.
- Target device is an iPhone in Safari standalone mode: test at 390x844, respect safe areas, no hover-dependent interactions.
- One new system per version. Each phase ships working, tests green, with the live Netlify URL shown at the end.
- The sim stays pure and the two health layers, targeting rules, and economy in the handoff are settled; do not re-litigate them.
