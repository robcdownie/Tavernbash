---
date: 2026-07-13
tags: [handoff, tavern-bash]
type: handoff
---

# Handoff: Tavern Bash / The Long Bazaar rework

## First order of business (do this before the map)
Finish the two remaining **combat-visual** slices of the combat rework:
1. **Bigger, clearer fight cells.** The fight screen wastes most of its vertical space on an empty painted floor below the boards. Enlarge the fight cells and use that room. Persistent ware names on the 10-slot strip are layout-hostile, so tap-to-inspect (already shipped) is the name answer; do not force tiny name labels.
2. **Causal source-to-target streaks with verbs.** Build on the existing `streakFx` and `fltFx` in `src/ui.js` (`handleEvents`). Add short verbs near the target ("Cleansed 2", "Spilled 11 poison", "Charged Sword"), trim the log to a few causal lines.

Both are DEVICE-EYED: the headless preview throttles the fight `setInterval`, so fights never run to completion in the browser tool. Verify on `platosd.com` on the phone, not the dev preview. Structure/layout (cell size, DOM) can be checked in the preview; motion cannot.

## State
Mobile auto-battler being reworked into "The Long Bazaar," a route roguelite. Live at `https://platosd.com` (GitHub Pages, auto-deploys on every push to main). Current version **0.61.0**, all 74 tests green. Repo is `robcdownie/Tavernbash` (public). The 8-player lobby/duel still exists and is the loop that runs today; the map arc replaces it.

## Deploy / infra (all set up this session)
- `.github/workflows/deploy.yml` builds on **node 22** (`node --test "tests/*.test.js"` needs node 21+ for the glob), runs `npm test` + `npm run build`, deploys `dist/` to Pages. `public/CNAME` = `platosd.com`. HTTPS enforced.
- To ship: `node scripts/ship.js <major|minor|patch> "subject"` (or bump `package.json` + commit manually), then `git push origin main`. Auth is cached (GCM), push just works. Netlify is OUT of the deploy path; do not reintroduce it.

## Decisions this session (keep the wording)
- Storm chip reads **"Storm approaching Ns"** then **"Storm"** (Robbie dropped "simoom" in player-facing text; plain "storm" carries no naming collision).
- Post-fight recap says **"Destroyed this fight:"**, never "Wares lost" (fight health is fresh every battle, so wares are not gone for good).
- Shop-ware and fight-ware inspect both use a **floating overlay** (Robbie likes the overlay; disliked the tall inline market panel that forced scrolling).
- Cooldown borders were calmed (eased `.cdf` via a registered `--p` property, lower opacity, softer fire flash). Robbie read the raw snap as "looks like a bug."
- Node timers: **auto-advance at zero + a continue-early button**. Exact durations in the plan below.
- Build order was REORDERED after Codex's full-scope UI review (Robbie endorsed): UI foundation and combat come before the map and before pouring in new content; architecture refactor is INCREMENTAL (extract one module + component per screen), not a big-bang split.

## Current versions / what shipped this session
0.58.0 persistent gold + `runThreat()` + inspect-then-buy market + new `src/cards.js` (shared `effChips`/`wareDetailHTML`, first extracted component). 0.59.0-0.59.2 tap-to-inspect wares mid-fight, market overlay, NaN integrity fix. 0.60.0-0.60.2 post-fight recap, storm wording, calmer cooldown ring. 0.61.0 hero picker rebuilt as a portrait rail + one large selected hero (fits 844x390, scales to 8). Touched: `src/ui.js`, `index.html`, `src/cards.js`, `package.json`, workflow, CNAME.

## Corrections / constraints from this session
- Preview throttles the fight sim; verify fight motion on device.
- `index.html` CSS has chronological source-order overrides; scope new rules defensively (bit me with `.eff`; also `.st/.nm/.ds` are scoped to `.sheet`).
- Fight cells hide `.ring`; their cooldown indicator is `.cdf` (painted in `paintCds`).
- `.agents/` and `AGENTS.md` are untracked Codex scratch; left out of commits on purpose.
- Zero em/en dashes anywhere (hygiene test scans `.md`, so this file counts too).

## Inputs to re-upload (only for the map/content phases, not the combat visuals)
The three approved design docs: `Approved_run_structure_changes.md`, `Approved_changes_3.md`, `Items_and_engine_approved.md`.

---

# THE FULL PLAN (roadmap)

## Build order (revised after Codex UI review; supersedes the original polish->route->hooks->content order)
1. DONE: Phase 1 legibility polish; persistent gold + Threat.
2. UI foundation: inspect-then-commit detail pattern (DONE for market + hero picker), typography floor (>=11px strategic text), 44px touch targets, semantic buttons, one shared card/action component per screen. Remaining: omen reveal benefit/cost (waits on anomaly rework data).
3. Combat rework: tap-to-inspect DONE, post-fight recap DONE. Remaining: bigger labeled cells, causal verb streaks, trimmed log (FIRST ORDER OF BUSINESS above).
4. The Long Bazaar map + run HUD (the big arc; details below).
5. Engine hook layer + heal/cleanse split (invisible; before content).
6. Heroes rework + 4 new, Anomalies rework + 4 new, 25 new wares (each on the hook layer).
7. Tuning + offline packaging + replay features; viewport tests added incrementally.

## Node timers (Robbie's exact numbers; each auto-advances at zero with a continue-early button)
Route choice 15s. Normal preview+fight 60s. Elite preview+fight 90s. Boss prep+fight 150s. Market 120s. Rest/Treasure/Shrine 45s. Negotiation 60s.

## The map arc (Phase 4), from Approved_run_structure_changes.md
Replace the 8-player lobby with a four-district branching route: 21 selected nodes, ~12 fights, persistent gold, 40 run health ("Resolve"), fixed district bosses (Ghul Matron, Debt Collector, Ifrit, Grand Vizier), Threat replacing round number (map node depth -> engine threat, fed through `runThreat()` which is already stubbed). Node types: Monster Door (Challenge vs Slip Past for a Resolve cost), Elite, Boss Gate (with Gate Camp on loss, `fightSeed = hash(runSeed,nodeId,attempt)`), Market, Rest (Mend/Temper/Refit), Treasure (three face-up, previewable), Quqnus Shrine (chosen event, no auto-resurrection), Merchant Negotiation (repurpose the 7 personas). Three-lane braided map, whole district visible, landscape-first. Cut: pairings, placement, The Departed, genRival-as-primary (keep genRival dormant for a future daily/endless), round-based income, dusk gold burn (done), tier-price decay, the rival duel. Robbie's door note: bounties stay visible, Slip Past is always strictly worse than winning, add an optional mystery/hint reward variant. Bump `SAVE_VERSION`. The route layer builds combat inputs, clones them, feeds the engine, consumes the result; the engine never learns a map exists.

## Test guardrails (tests/)
`parity.test.js` pins data tables to `bazaar-brawler.html`: original ITEMS/MONSTERS/TRINKETS byte-identical outside the `REBALANCED_ITEMS`/`RENAMED_*` ledgers; `ANOMALIES`/`PERSONAS`/`ANONE`/`RSTAT`/`RINTEG` deep-equal with NO ledger (reworking anomalies needs a test edit + new ledger). New items must be `unique:true`. New monsters/heroes are free. `engine.test.js` holds combat invariants; the hook refactor must preserve `ev` event shapes and item indices. `hygiene.test.js` bans em/en dashes and needs a sprite symbol for every new glyph. `art.test.js`/`ingest.test.js` need manifest + matcher updates for new content ids.

## Cross-cutting rules
Zero em/en dashes. One system per version, `scripts/ship.js` then `git push`. Bump `SAVE_VERSION` when the run shape changes and `CACHE_V` in `public/sw.js` when a deploy must invalidate cached state (note: iterative deploys have relied on Vite asset hashing; if a change does not show on device, hard-refresh, and consider making the service worker network-first for HTML). Landscape-first iPhone: 844x390 then 390x844; no hover; stall never leaves the screen. New glyphs need `index.html` symbols; new art needs `npm run art`.

## Verification
`npm test` after every change. `npm run dev` (port 5199) + browser for STATIC screens (map, pickers, market, overlays). Fights/animations: on device at `platosd.com`. Before shipping the map, simulate complete seeded runs headlessly for pacing (~30 min median) and loss-damage tuning via `scripts/balance-sim.js`.
