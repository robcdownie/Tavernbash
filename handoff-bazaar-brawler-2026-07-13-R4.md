# Handoff: Tavern Bash / The Long Bazaar (2026-07-13, after R4 commit 4)

This supersedes `handoff-bazaar-brawler-2026-07-13.md` for everything about the route rework and
current status. That older file is still the source of truth for one thing only: the deploy and
infra setup (GitHub Pages / platosd.com). `CLAUDE.md` carries the long game-design history and the
hard rules; read it too, but note its Netlify deploy instructions are STALE and corrected below.

Zero em dashes and zero en dashes anywhere (the dash scan in `npm test` scans markdown, so this
file is gated). Use plain hyphens and `->` arrows only.

## 0. Orientation and read order for a new session

1. This file (current state + forward plan).
2. `CLAUDE.md` (game rules, data tables, art pipeline, hard rules). Ignore its Netlify deploy lines.
3. `src/route.js` and `src/route-run.js` to understand the route state model before touching flow.
4. The auto-memory index (loaded each session): `long-bazaar-arc-plan`, `deploy-route-is-git-push`,
   `review-big-plans-with-codex`, `preview-screenshot-times-out`.

## 1. What this is and where it stands

Mobile auto-battler set in a Persian night market, being reworked from a fake 8-player lobby into
"The Long Bazaar," a four-district branching route roguelite. Repo `robcdownie/Tavernbash`, local
`C:\Robbie\bazaar-brawler`, live at https://platosd.com (GitHub Pages). Current version 0.68.9,
deployed and green.

The route is the default game. You pick a hero, spend six gold in an opening stall, then walk a
deterministic braided map of four districts (Back Alleys, The Souk, Palace Quarter, Dragon Gate),
fighting monster doors, visiting markets and events, and facing a district boss at each gate, down
to the Grand Vizier. Resolve (starts at 40) is the run life total. The classic lobby is deleted.

The design comes from three approved docs (`Approved_run_structure_changes`, `Approved_changes_3`,
`Items_and_engine_approved`) that are NOT in the repo (their em/en dashes would break the dash
scan). They are re-uploaded session inputs. R8 (content) needs Robbie to re-upload them.

## 2. Deploy and verify workflow (READ THIS, it was learned the hard way)

DEPLOY IS `git push origin main`. GitHub Actions (`.github/workflows/deploy.yml`) runs `npm ci` +
`npm test` + `npm run build` on node 22 and publishes `dist/` to GitHub Pages at platosd.com
(`public/CNAME`). To ship: bump `package.json` + commit, then `git push origin main`. CI gates on
the test suite, so tests must be green before pushing. Watch the run with the public API (no `gh`
CLI installed): `curl -s "https://api.github.com/repos/robcdownie/Tavernbash/actions/runs?per_page=1&branch=main"`
and read `status` / `conclusion`.

NETLIFY IS RETIRED. Do not run `npx netlify deploy`. The URLs `bazaar-brawler.netlify.app` and
`bazaar-brawler-v1.netlify.app` are dead. Earlier this session several deploys went to the dead
netlify test site and never reached platosd; the fix was to push to main. `.netlify/state.json`
and CLAUDE.md's netlify prose are stale. See memory `deploy-route-is-git-push`.

After a save-format or cache-invalidating change, bump `CACHE_V` in `public/sw.js` (currently
`bb-v31`). Bump `ROUTE_SAVE_VERSION` in `src/route-save.js` (currently 2) when the save shape
changes, and add a migration.

VERIFY LIKE THIS, every meaningful change:
- `npm test` (node --test, currently 155 tests). This does NOT import `ui.js` (DOM-coupled), so it
  cannot see UI regressions. Treat green here as necessary, not sufficient.
- Playwright resume suite on a FRESH server: free port 5199, then
  `npx playwright test resume.spec.js`. `playwright.config.js` has `reuseExistingServer:false` and
  `--port 5199 --strictPort` on purpose (a reused stale dev server once hid a deleted function and
  gave a false pass, shipping the 0.68.0 live regression). There is also `e2e/layout.spec.js` via
  `npm run test:layout` for viewport regressions (run it for commits that touch layout/CSS).
- For anything user-visible or format-changing, smoke the PRODUCTION BUNDLE, not the dev server:
  `npm run build`, then `npx vite preview --port 4173 --strictPort` in the background, then drive
  it in the Browser pane at http://localhost:4173 (external hosts are blocked in the pane, but
  localhost works). Use the `window.BBDEV` console hooks (localhost-only) to drive: `g()`,
  `routeState()`, `frontier()`, `dispatchRoute()`, `rollShop()`, and the reward-flow hooks
  `settleFixed(plan,nodeId)`, `presentAfterReward()`, `checkpoint()`. The dev preview throttles
  rAF and CSS transitions, so fight MOTION must be eyed on-device at platosd.com; structure/logic
  can be checked in the pane. `preview_screenshot` times out in this project (memory
  `preview-screenshot-times-out`); use `read_page` / `read_console_messages` / `javascript_tool`.
- Commit messages: NO backticks in `git push`/`git commit -m` (the shell eats them and mangles the
  message). End commits with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Stage only
  touched files; never `.agents/`, `AGENTS.md`, or incidental `package-lock` churn.

## 3. Architecture: the route module stack (as of 0.68.9)

The route runtime was extracted into a serializable boundary during R4. Import direction is one
way; keep it that way.

- `src/data.js` - ITEMS, MONSTERS, HEROES, ANOMALIES, TRINKETS, ENCH, DISTRICTS, constants.
- `src/engine.js` - the pure combat sim (deterministic, DOM-free, headless). `makeItem` mints a
  session-only `uid` from a module counter (NOT persisted). `fuseScan` forges triples in place.
  Has a parity test pinning it byte-identical to `bazaar-brawler.html`. Do not add persistence or
  route concerns here.
- `src/map.js` - `genMap(runSeed)` deterministic three-lane braid, `MAP_VERSION` (1), `isCombat`.
- `src/route.js` - the PURE navigation controller. State `{seed, version, path[], pendingId,
  phase, resolve, resolveMax, attempts{}, fightSeed, ...}`. `transition(state, map, action) ->
  {state, effects}`. Derives frontier/visited/district; never stores `reach`. Phases: map,
  encounter, reward, market, event, gateCamp, won, lost. Boss retry increments `attempts[nodeId]`;
  Slip Past does NOT. Exports `initRoute, transition, frontier, currentDistrict, visitedSet,
  nodeOf, lossDamage, fightSeed, validRoute, BASE_GOLD, classifyEdges`.
- `src/route-run.js` - the DURABLE run aggregate (the single serializable truth) plus the reducer.
  `newRun({seed})` builds `{schemaVersion:2, runId, revision, seed, route(controller state),
  economy, receipts, pendingChoice, ids:{nextItem}}`. `advance(run, map, action)` is the ONLY
  caller of `route.transition`. `newEconomy()` seeds the ten economy fields (gold 6, tier 1,
  tierCost TIERCOST[2], relicIncome, freeReroll, frozen, board, vault, shop, trinkets).
  `bindEconomy(G)` installs Object.defineProperty accessors on G that resolve through
  `this.run.economy`, so the ~50 old `G.gold`/`G.board` call sites and in-place array mutation keep
  working while `run.economy` is canonical. `allocId(run)` is the single durable-id allocator.
  `ensureIdFloor(run)` guards the counter after revive. `serializeRun`/`reviveRun` codec.
- `src/route-rewards.js` - pure `planReward(bounty, ctx) -> {gold, drained, items, relic, mote,
  choice}`. No DOM.
- `src/route-save.js` - `ROUTE_SAVE_VERSION` (2), `ROUTE_KEY` (bb-route-run), `readRouteSave`
  (migrates v1->v2 inside the try so any failure falls back to null and a fresh run, never
  corrupts), `writeRouteSave` (returns true/false for durability), `clearRouteSave`,
  `migrateV1toV2` (pure wire transform, no engine import; nests routeState + economy, stamps ids
  board->vault->shop, honors existing ids, nextItem past max, deterministic).
- `src/route-runtime.js` - the PURE reward mini-flow (R4 commit 4). `rewardKey`, `gildOptions`,
  `uniqueOptions` (excludes board, vault, and unbought shop), `settleFixed` (applies gold/offers/
  relic/mote once behind a receipt, derives an owed choice or its gold fallback), `chooseGild`,
  `chooseUnique`, `refreshPendingChoice`, `nextPresentation`. All pure over the run, unit-tested.
- `src/ui.js` (1544 lines) - all DOM rendering and game flow, still including the route presenters.
  Holds `snapshotRoute`/`restoreRoute`/`resumeRoutePhase`, `dispatchRoute`, `runEffects` (the
  closure-based effect consumer for transient steps), `settleRouteReward` + the reward-choice
  presenters (`openRewardGild`/`openRewardUnique` dispatch to the runtime), `renderRouteMap`,
  `renderDraft`, `rollShop`, the mkWare/mkOffer/fuseStamp id factories, event cards, recap.
- `src/fx.js`, `src/sfx.js`, `src/music.js`, `src/art.js`, `src/art-manifest.js` - unchanged
  subsystems (particles, sound, music, sprites).

The global `G` is mode-discriminated (`G.mode==='route'` is the only mode now). `G.run` is the
aggregate. `G.route` holds UI transients only (map cache, selectedId, market, combat, opening).
`G.phase` is a UI/screen phase (routeMap, draft, fight, gateCamp, routeEnd) and is DERIVED on
resume, never stored in the save.

## 4. The R1 to R8 roadmap and its status

The plan came from a Codex adversarial whole-project review (2026-07-13) that found the route
foundations sound but the integration not yet durable. Order matters: do not start the engine hook
layer (R7) or content (R8) until the correctness and harness work lands.

- R1 DONE (0.67.4): critical correctness. Survivor-tier loss-damage fix (use engine
  `F.survTiers('b')`, fight items carry `.tier` not `.id`); persist combat reward context; durable
  + deterministic event resume; filter dead round-income content from route (income() never runs
  in route, so Coin Purse / Merchant Ledger / Bull Market / Merchant Prince / Debt Collector relic
  / Moneylender are no-ops, filtered out until the omen/hero reworks give them route semantics).
- R2 DONE (0.67.5): hardened `validRoute` (rejects unknown phase, phase-pending contradictions,
  duplicate/missing nodes, bogus attempts) + a save-resume crash-point test matrix + the Playwright
  dev-server port fix.
- R3 DONE (0.68.0, hotfix 0.68.1): deleted the classic lobby. Removed lobby saves/HUD/doors/
  ghost-duel/pairings/placement/Departed/income/endings/reports/newLobby/tutorial. Kept
  `genRival`/`runHeadless` (future daily/balance), `PERSONAS` (Negotiation), and the shared
  fight/shop/vault/fusion/gild/unique-pick components. The 0.68.0 miss (deleted rollShop + recap,
  broke New Game on device) taught the fresh-server / production-bundle verification lesson.
- R4 DONE except commit 5: the serializable route boundary extraction (Codex-designed five modules,
  Codex-reviewed at each risky step). Commit 1 route-save.js (0.68.2), 2 route-rewards.js (0.68.3),
  3 route-run.js as 3a aggregate+reducer (0.68.4) / 3b economy canonical via accessors (0.68.5) /
  3c1 durable ids (0.68.6) / 3c2 save v1->v2 cutover + migration (0.68.7), 4 route-runtime.js as 4a
  pure reward runtime (0.68.8) / 4b wired crash-safe reward flow (0.68.9, closes the reward
  double-pay bug). REMAINING: commit 5 route-ui.js (see section 5).
- R5 PENDING: finish the shallow route pieces (see section 6).
- R6 PENDING: route balance harness + richer run report, then tune (see section 7).
- R7 PENDING: engine action queue + golden event traces, the hook layer (see section 8).
- R8 PENDING: content, heroes/anomalies/wares reworks (see section 9).

## 5. IMMEDIATE NEXT: R4 commit 5 (route-ui.js)

Lowest-risk of the five: a pure code-organization move, no behavior change. Move the route DOM
presenters out of `ui.js` into a new `src/route-ui.js` so `ui.js` becomes a composition root plus
the shared draft/fight/overlay/audio surface. Candidates to move: `renderRouteMap` and its
helpers, the route event cards, the fight recap, the reward-choice presenters
(`openRewardGild`/`openRewardUnique`), the gate camp screen, the end screen, the continue overlay.
Constraints from the Codex design: `route-ui.js` must NOT import `ui.js` (avoid a cycle); it
imports selectors/map/data/art and dispatches stable actions; DOM callbacks dispatch, they do not
mutate or checkpoint. Keep the general closure `runEffects` and the render-time market/draft
checkpoint for now (moving persistence out of render is a separate audited change, deferred past
R4). Gate on `npm test` + `npx playwright test resume.spec.js` on a fresh server + the full layout
suite. Codex review is NOT needed for commit 5 (mechanical). Ship it, then R4 is complete.

## 6. R5: finish the shallow route pieces

Each is a real gap Codex flagged; several are player-facing bugs.

- Real Gate Camp: today it is a stub. Give it reorder, inspect, sell, spend, repair, and exactly
  one emergency option. Codex warning: a naive retry (fight again with less Resolve and the same
  build) makes the final-boss spike worse; design the emergency option so it does not.
- Full future-node scouting: nodes are `disabled` in the preview (ui.js), so downstream monsters
  and rewards cannot be inspected. Content density will make blind choices bad; let the player
  scout ahead. The combat preview should show monster HP/board/keywords, not just Threat + bounty.
- Concrete face-up Treasure: roll the actual ware/enchant at map generation (`map.js`), so Treasure
  is truly face-up rather than resolved on arrival.
- Final-district reward semantics: the Dragon Gate strands bounty wares, Refit, and Treasure with
  no market before the Vizier; and the Vizier's forced unique pick lands AFTER the run is already
  won (moot). Fix the ordering/economy so late rewards are usable.
- Event cost-bypass fixes: Shrine "Cast Off" pays out with no ware to destroy; Negotiation "Fresh
  Stock" consumes the node when the player cannot afford it. Both in ui.js event handlers.
- Deferred from R4, fold in here: the blocking retry UI on a failed critical save (today
  `settleRouteReward` only warns via toast; the receipt keeps rewards exactly-once regardless, so
  this is durability polish, not a correctness gap). Also consider receipt-guarding the event gild
  path (Treasure silver, Trial by Flame) the same way the monster reward now is.
- Consider the approved route timers / auto-advance if the docs still call for it.

## 7. R6: route balance harness + run report, then tune

`scripts/balance-sim.js` simulates the DELETED classic lobby and its rival budget disagrees with
the engine; replace it with a route sim. Per seed, record: path + node types, hero/anomaly/policy,
gold earned/spent/held/stranded/rerolled, board power before each fight, first-attempt win rate by
Threat tier, Resolve before/after each node, loss components + retries, claimed vs unusable bounty,
fight duration/storm share/margin, completion rate + elapsed at 1x and 2x. Add seed/path/retries/
losses/duration to the run report (the Obsidian-frontmatter Copy Run Report on the end screens) so
a result reproduces. Codex sampling found routes are 8 to 13 fights (median 9), not the assumed
~12, and rewards stack about 97 median gross gold onto fewer encounters, so the economy is likely
loose.

First balance trial, ONLY after the harness exists (the survivor-tier fix is already in): boss loss
bonus 4 -> 2 keeping the corrected tier term; hold 40 Resolve, then compare 40 vs 36; keep the 6
opening gold but guarantee one offensive opening offer or a free opening reroll; cut generic
Treasure/Negotiation cash 6 -> 4 before touching combat rewards; test 2/4/6 vs 3/5/7 reward gold
only after a route-economy pass exists. Run the new sim across many seeds before and after any
tuning, and confirm the run report reproduces. Bring Codex in to sanity-check the tuning read
before shipping numbers.

## 8. R7: engine action queue + golden event traces (the hook layer)

`fire()` in `engine.js` is a long fixed-order resolver. Do NOT weave callbacks through it. Build an
internal action queue: stable order (side, source index, hook declaration order); preserve the
public event shapes (keep internal actions separate from renderer events); bind queued sources by
`uid` then emit the current stable index (so a same-index deathrattle spawn cannot inherit an old
action); never splice fight-item arrays (destroy in place, replace spawns at the same index);
legacy fights must consume identical RNG draws (conditions never draw; absent hooks add zero
draws); add queue-depth / per-trigger / per-tick caps for heal/destroy/haste/spawn loops; compile
the legacy `heal` keyword into "heal then cleanse one poison and one burn" without changing
existing heal events; keep shop/map/reward hooks OUTSIDE `engine.js`. Add golden event-trace
fixtures (order, fields, indices, RNG, deathrattle replacement, simultaneous triggers) BEFORE
changing behavior, since current tests assert outcomes, not full traces. This is subtle and touches
the parity boundary; get a Codex design review before starting and after the trace fixtures land.

## 9. R8: content (only after R1 to R7)

Heroes rework (shop weight 2.2 -> about 1.5, rework 4 and add 4 as rules), Anomalies rework (8 and
4 as benefit/cost), 25 interaction-dense wares. Each rides the R7 hook layer, each is its own
version with a parity-ledger entry + sprite symbol + art. New wares are `unique:true`. Needs the
three approved docs re-uploaded (not in the repo). Codex is worth a design pass per batch.

## 10. When to bring in Codex

The pattern this session (it worked well): I draft an approach plus specific pointed questions,
Robbie pastes it to Codex, pastes the reply back, I reconcile into the plan and execute. Codex
reads the repo directly and is good at catching our misses, so prompts can cite file:line.

Bring Codex in for:
- Architecture decisions and big plan passes (it designed the map braid and the R4 five-module
  boundary).
- Adversarial whole-project reviews at phase boundaries (it produced the R1-R8 roadmap).
- Implementation-approach reviews BEFORE risky or subtle work: it validated the 3b accessor bridge,
  the 3c durable-id scheme and shop-tombstone trap, and the commit-4 reward idempotency ordering,
  each time sharpening the plan.
- Upcoming specifically: R6 tuning reads (before shipping numbers), R7 engine-hook design (RNG /
  ordering / parity are exactly where a second brain pays), and R8 content design per batch.

Do NOT bother Codex for mechanical low-risk work (commit 5 route-ui, art batches, doc edits). See
memory `review-big-plans-with-codex`.

## 11. Testing: what covers what, and the ui.js gap

- `npm test` (155 tests, node --test): engine behavior, parity vs `bazaar-brawler.html`, dash scan,
  sprite coverage, art-manifest sync, map structure, the pure route controller, and the pure route
  modules (route-run, route-rewards, route-save, route-runtime). This is the strong net, but it
  CANNOT import `ui.js` (DOM). Every pure function you can put in a route-*.js module gets real
  coverage there; prefer that over logic in ui.js.
- `e2e/resume.spec.js` (Playwright, 9 tests x 2 viewports = 18): the crash-recovery matrix. Drives
  the real app through `BBDEV` hooks: map resume, mid-fight restart from seed, victory-recap settle
  once, economy accessor identity, durable-id uniqueness/stability, v1->v2 migration on load,
  interrupted-gild reopen without double-pay, choose-then-reload once. This is the ONLY automated
  coverage of the ui.js flow; extend it when you touch the flow.
- `e2e/layout.spec.js` (`npm run test:layout`): viewport regressions at 844x390 and 390x844.
- Production-bundle smoke via `vite preview` + Browser pane for anything user-visible or
  format-changing. This is not optional for save/format changes; it is what would have caught the
  0.68.0 regression.

## 12. Deferred / owed (the debt list)

- R4 commit 5 (route-ui extraction) - the only remaining R4 piece.
- Blocking retry UI on a failed critical save (R5) - today it warns via toast only.
- Event gild path (Treasure silver, Trial by Flame) is not receipt-guarded like the monster reward
  now is (R5 candidate).
- Render-time checkpoint still lives in `renderDraft` (accidental persistence for buy/forge/tier/
  reroll/stock/freeze/sell/transfers/swaps/reorder/id-alloc). Moving persistence fully out of
  render is a separate audited change, intentionally NOT done in R4.
- Route-native tutorial: the intro Tutorial plaque currently just starts a route in guided mode
  logic left over from the lobby; verify it still teaches the route, or rebuild it.
- Doors panel art; Robbie's on-device pacing playthrough (`playthrough-checklist.md`, add ?debug).
- Voice tracks (the `bark()` channel accepts them; prompt sheet with exact hero lines in a prior
  session log).
- App Store path: wrap the PWA with Capacitor (needs the $99/yr Apple Developer Program and a Mac
  on macOS Sonoma+; Robbie's 2015 Mac may cap too low, cloud Mac or CI is the fallback). The name
  decision (Tavern Bash sits close to Hearthstone's Tavern Brawl and Bob's Tavern) should land
  before any store submission.

## 13. Gotchas and hard rules

- Zero em/en dashes anywhere (docs, comments, commit messages). The dash scan enforces it.
- One new system per version, tests green, deployed via git push. Bump `package.json` per commit.
- Target device: iPhone Safari standalone, LANDSCAPE first (844x390), then 390x844. Respect safe
  areas, no hover. In landscape the app pins to viewport; nothing may push the stall off screen.
- The sim stays pure; the two health layers, targeting rules, and economy are settled, do not
  re-litigate them.
- ui.js is not unit-testable; verify its changes on a fresh Playwright server AND a production
  bundle, never a reused dev server or the Browser pane HMR (HMR hides deletions).
- No backticks in `git commit -m`. Co-author trailer required. Stage only touched files.
- Approved change batches get applied in full, not piecemeal.

## 14. Key file map

- `handoff-bazaar-brawler-2026-07-13-R4.md` - this file (current).
- `handoff-bazaar-brawler-2026-07-13.md` - infra/deploy setup + 0.61.0-era design; older.
- `CLAUDE.md` - game history, data, rules; Netlify deploy lines are stale (see section 2).
- `src/route.js` / `src/map.js` - pure controller + map generator.
- `src/route-run.js` / `src/route-rewards.js` / `src/route-save.js` / `src/route-runtime.js` - the
  serializable route boundary (aggregate/reducer, reward planner, save+migration, reward runtime).
- `src/ui.js` - flow + presenters (route-ui.js extraction pending as R4 commit 5).
- `src/engine.js` / `src/data.js` - pure sim + data; the parity test pins engine to
  `bazaar-brawler.html`.
- `tests/*.test.js` - the node suite. `e2e/resume.spec.js` + `e2e/layout.spec.js` - Playwright.
- `.github/workflows/deploy.yml` - CI (test + build + Pages deploy).
- `public/sw.js` (CACHE_V bb-v31), `public/CNAME` (platosd.com).
- `scripts/balance-sim.js` - simulates the DELETED lobby; to be replaced in R6.
- `scripts/ship.js`, `scripts/make-art-manifest.js`, `scripts/ingest-art.js` - tooling.

## 15. Exact current position

Version 0.68.9, on `main`, pushed, CI green, live on platosd.com. R4 is 4 of 5 commits done; the
reward double-pay bug is fixed and verified on the production bundle. The next action is R4 commit
5 (route-ui.js extraction), then R5. The working plan lives in the user's plan file
`dynamic-inventing-wozniak.md` and the memory `long-bazaar-arc-plan`; this handoff is the repo-side
copy.
