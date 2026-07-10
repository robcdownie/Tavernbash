# Bazaar Brawler

A mobile auto-battler set in a Persian night market. This repo is self-contained and independent of Robbie's second-brain vault; nothing here should be written there, and nothing there is needed here.

## Source of truth

Read `handoff-bazaar-brawler-2026-07-09.md` in full before making changes, then `handoff-bazaar-brawler-2026-07-10.md` for the decisions that supersede it. It carries the rules spec, data tables, the phased mission, the art direction, and the decisions not to re-litigate. Phases 0 through 4 are fully complete: module structure, tests, PWA, saves, Netlify deploy, the painted-art pipeline with all 50 assets live (26 items, 8 monsters, 8 portraits, rarity frames wired as 9-slice borders, board, background), Pixi particles, synthesized sound effects, and the two Suno music loops. Phase 5, content, is underway. The four engine-ready backlog monsters have shipped, one per version: Scalded Samovar 0.7.0, Shahmaran 0.8.0, Marid of the Cistern 0.9.0, Nasnas 0.10.0. Along the way: unique wares (Serpent Crown, Tide Wall; `unique:true` in `ITEMS`, filtered out of the shop roll and rival generation so fight parity holds; the parity test allows new monsters and unique wares while keeping everything the original shipped byte-identical) and the Fusion Mote bounty (a free bronze copy of your commonest ware). New monsters still await painted art; their SVG medallions show until PNGs land in `public/art/monsters/`. Regen shipped in 0.11.0 (a `regen` field on a side knits fight health each second via `healSide`, capped at the starting pool, no cleanse, never resurrects; monsters declare it in data and gild scales it) along with Ghul Matron. 0.12.0 added the per-fight storm override (`stormAt` in seconds on a monster def, wired through `startFight` opts) plus Sandling and the Weeping Stone, the first player-side regen ware (`regen` on an item def, summed by `boardRegen` in the engine, rarity-scaled, unique so rivals and parity never see it). 0.13.0 added the bounty-drain tick (a `pocket` field on a monster board item; the engine tallies grabs on `F.pocketed` and emits `pocket` events, the market settles the bounty afterward) plus Pilfer Monkey. Next in the backlog order: freeze for The Icebox, then crit for Glass Peri. Painted art batches can land any time: drop PNGs into `public/art/` per the naming rules in `scripts/make-art-manifest.js`, run `npm run art`, and the game picks them up.

## Layout

| Path | What it is |
|---|---|
| `bazaar-brawler.html` | The original single-file game. Never edit it; the parity test in `tests/parity.test.js` checks the modules against it fight for fight. |
| `index.html` | The page: CSS, SVG sprite, markup. Loads `src/main.js`. |
| `src/engine.js` | The combat sim. Pure, deterministic, DOM-free, headless-testable. Keep it that way. |
| `src/data.js` | Items, monsters, trinkets, anomalies, personas, constants. |
| `src/ui.js` | All DOM rendering and game flow, including the saves system. |
| `src/fx.js` | The Pixi particle canvas: hit sparks, ember drift, storm sand, forge burst, coin rain, 40+ flash. Pixi loads lazily as its own chunk; every effect is a no-op under reduced motion or without WebGL. |
| `src/sfx.js` | All sound, synthesized with raw WebAudio (no audio files). Unlocks on first tap for iOS; mute persists under bb-mute; every call is a no-op before unlock. |
| `src/music.js` | Crossfade-looping WebAudio player for the Suno tracks in `public/music/` (`market.mp3` for draft, `battle.mp3` for fights). Lazy-loads after first tap, obeys the mute toggle, total no-op with no files. |
| `public/music/` | Suno tracks drop here; the ingest script files any audio named with a market or battle token. |
| `src/art.js` | Sprite access point. Renders the painted PNG for an id when the manifest has one, else the SVG symbol. Same svg wrapper both ways, so CSS never changes. |
| `src/art-manifest.js` | Generated map of glyph id to painted PNG path. Never edit by hand; `npm run art` rebuilds it (also runs before dev, build, and test). |
| `public/art/` | Painted art drops here: `items/{id}.png`, `monsters/{glyph suffix}.png` (the Debt Collector is `debt.png`), `portraits/p0.png` to `p7.png`, plus `frames`, `board`, `bg`. All 50 slots are filled. Rarity frames render as 9-slice border-image overlays on cells and ware cards via the `art-frames` class that `applyBigArt` sets. |
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
- Target device is an iPhone in Safari standalone mode, landscape first: test at 844x390 (landscape is the primary orientation, per Robbie on 2026-07-10, superseding the handoff), then 390x844. Respect safe areas, no hover-dependent interactions. In landscape runs the app pins to viewport height and the doors and market columns scroll internally; nothing may push the stall off screen.
- One new system per version. Each phase ships working, tests green, with the live Netlify URL shown at the end.
- The sim stays pure and the two health layers, targeting rules, and economy in the handoff are settled; do not re-litigate them.
