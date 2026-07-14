# Handoff: Tavern Bash / The Long Bazaar (2026-07-14, R7 to Codex)

This hands the R7 engine hook layer (and optionally R8 content) to Codex for autonomous
execution. It supersedes nothing; read `handoff-bazaar-brawler-2026-07-13-R4.md` for the
older route/infra history and `CLAUDE.md` for the game rules and hard rules. This file is
the current-state + forward-plan for the engine work.

Zero em dashes and zero en dashes anywhere (the dash scan in `npm test` scans markdown, so
this file is gated). Plain hyphens and `->` arrows only.

## 0. Current position

Version 0.68.26, on `main`, pushed, CI green, live at https://platosd.com (CACHE_V bb-v38).
`npm test` is 181 green. The whole R4-R6 arc is shipped: the route rework, the serializable
route boundary, all of R5 (event fixes, final-district rewards, face-up Treasure, node
scouting, blocking-save, the real Gate Camp), and R6 tuning (boss loss 4->2, reward gold
3/5/7 -> 2/4/6, guaranteed offensive opening offer, plus a fusion-aware balance harness at
`scripts/route-sim.js`). R7 step 1 (the golden combat-trace oracle) just landed and is the
starting point below.

## 1. Deploy and verify (READ THIS)

- DEPLOY IS `git push origin main`. GitHub Actions (`.github/workflows/deploy.yml`) runs
  `npm ci` + `npm test` + `npm run build` on node 22 and publishes `dist/` to GitHub Pages
  at platosd.com. CI gates on `npm test`, so tests must be green before pushing. Watch it:
  `curl -s "https://api.github.com/repos/robcdownie/Tavernbash/actions/runs?per_page=1&branch=main"`
  and read `status` / `conclusion`. Netlify is dead; ignore any netlify prose in CLAUDE.md.
- Bump `package.json` version every commit (one system per version). Bump `CACHE_V` in
  `public/sw.js` on any commit whose built output ships and should invalidate the PWA cache
  (currently bb-v38). Purely internal engine changes that alter combat still ship, so bump.
- `npm test` (node --test, 181 tests) does NOT import `ui.js` (DOM-coupled). For R7 that is
  fine: the engine is headless and fully covered by the golden traces + `engine.test.js` +
  the parity data-table test. You do NOT need the browser for R7. If you ever touch
  ui.js/route-ui.js behavior, there are Playwright suites (`npx playwright test resume.spec.js`
  on a fresh server, `npm run test:layout`) but that is out of scope for the engine work.
- Commit messages: NO backticks in `git commit -m` (use a heredoc/file). End every commit
  with `Co-Authored-By: <your id>`. Stage only touched files; never `.agents/`, `AGENTS.md`,
  or `dist/` (gitignored).

## 2. THE COMBAT ORACLE IS SACRED

The byte-identical fight-for-fight parity test was RETIRED in 0.57 (`tests/parity.test.js:43`
now guards data tables only; combat invariants in `engine.test.js` assert outcomes, not full
traces). So the R7 golden traces are the ONLY full-behavior safety net.

- `tests/combat-fixtures.js` - 16 synthetic deterministic fights + the `capture()` function.
- `tests/combat-traces.golden.json` - the checked-in golden.
- `tests/combat-trace.test.js` - compares each fixture to the golden and runs `capture` twice
  in-process (the module-global UID counter advances between runs, so an identical second
  result proves nothing in the trace/digest leaks raw uids). Also asserts guardTrips 0 and no
  orphan goldens.
- Regenerate ONLY for a genuinely approved behavior change: `node scripts/capture-traces.js`.
  `npm test` only compares; it never regenerates.

RULE: the R7 refactor (steps 3-4 below) must leave EVERY golden trace byte-identical. If a
trace changes, behavior moved; do not regenerate to make it pass. This is the entire proof of
inertness. If your design genuinely needs a fixture the matrix lacks, ADD a new fixture (do
not alter existing ones), get it reviewed, and only then regenerate.

Inert instrumentation already in `src/engine.js`: `createFight` accepts an optional
`cfg.rngTap(tag, value)` that observes every seeded draw without changing value or order (the
two draw sites are tagged `"crit"` and `"tiebreak"`); `F.diagnostics.guardTrips` counts the
two safety caps (4x activation catch-up at ~engine.js line 316, 12-contact cleave at ~240).
Both are inert unless observed and must stay inert.

## 3. R7 plan (your own design; recap for continuity)

Verdict from your review: a HYBRID - a small deterministic fight-owned worklist PLUS a
declarative hook registry. Not a registry alone (cannot represent cascades/deathrattles/
spawn-replacement/caps); not a global sorted queue (breaks causal ordering). The binding
constraints you set:

- Worklist is fight-owned, transient, EMPTY whenever `F.step()` returns. Never held across
  ticks, never globally sorted. `F.step()` stays the scheduler and owns the per-step budget.
  Each activation is one root transaction that drains fully (depth-first, causal children
  before the parent's continuation) before the scheduler advances.
- Damage stays ONE compound primitive: crit draws exactly once at damage start before target
  selection (as today near engine.js line 232); a destroyed target's death subtree
  (deathrattle + spawn) resolves BEFORE overflow continues, so a Large weapon can destroy an
  egg, spawn at the same slot, then cleave into that spawn in the same activation. The
  `cleave-destroy-spawn-hit-spawn` fixture pins this.
- RNG: conditions and target filtering never draw; a random hook uses an explicit roll action;
  an absent hook adds no action and no draw. Fixtures record call sites and values.
- Identity: source refs are `{side, uid, slot}` with a fight-local slot/tombstone map. A
  queued deathrattle resolves from captured data after its source dies and keeps the dead slot
  for attribution; a new same-slot spawn has a new uid and cannot inherit old queued actions.
  A spawn at the currently-executing slot does not get the old item's remaining multi-fire; a
  spawn in an unvisited slot may act later that same step; an already-visited slot is not
  revisited (the `haste-adjacent-visited-vs-later` fixture pins the visited-vs-later rule).
- Caps live in the fight runtime, not content: keep the 4x and 12-contact caps; add depth <= 32,
  <= 256 actions/root, <= 2048/step, <= 16 executions of one hook identity/root. On a trip,
  suppress only the offending descendant and bump `F.diagnostics.guardTrips`; emit NO renderer
  event. Reject unconditional immediate cycles (afterHeal -> heal) statically.
- heal compiles to ONE atomic healCleanse action: heal and emit the single existing `heal`
  event (including `amt:0` at full), then silently remove one poison and one burn, then an
  internal afterHeal trigger. Regen and lifesteal use the same heal primitive with their flags
  (regen emits a heal event, lifesteal stays silent, neither cleanses). The
  `heal-at-full-cleanse` and `lifesteal-silent` fixtures pin these.
- Events vs actions kept separate: actions use `op`, only primitive resolvers push to `ev`,
  hook collection produces actions never renderer events, R7 adds NO public event kinds. Add a
  test pinning the allowed event-kind set consumed by `ui.js` handleEvents (~line 662). Keep
  shop/map/reward hooks OUTSIDE `engine.js`.
- Likely R8 hook surface: fightStart, afterActivate, afterHit (per contact), destroyed
  (killer + victim), afterHeal, afterHaste (if used), afterSpawn. No generic before-everything.
  Do the R8 archetype inventory before freezing the hook API, and extend the ordering key for
  hero/anomaly sources (item index does not define where non-item hooks sit).

## 4. R7 step status (your sequencing)

1. DONE (0.68.26, deployed): golden trace oracle + inert instrumentation (above).
2. NEXT: this fixture-review checkpoint. Confirm the 16-fixture matrix is sufficient to
   declare the refactor inert, or name the missing cases to ADD (do not alter existing
   fixtures) before writing code.
3. Action interpreter + legacy-activation compiler. Compile the fixed `fire()` if-chain into
   the action order it already runs (fire, selfdestruct-return, ammo, first-frost, damage,
   shield, healCleanse, freeze, poison, burn, adjacent haste, hasteAll, reload, disable+pay,
   charge, pocket). EVERY golden trace must stay byte-identical. Commit as its own version.
4. Hook collection + caps + synthetic hook tests. Only the operations R8 needs become hook
   points initially (activation, damage contacts, destroy, heal, haste, spawn); freeze,
   poison, burn, shield, reload, disable, charge, pocket stay non-hookable actions until an
   approved ware needs them. Every legacy golden trace still byte-identical. Commit per step.
5. R8 content, one approved batch per version. NEEDS the three approved docs
   (`Approved_run_structure_changes`, `Approved_changes_3`, `Items_and_engine_approved`)
   re-uploaded; they are not in the repo (their dashes would break the dash scan). New wares
   are `unique:true`, each rides the hook layer, each gets a sprite symbol + art + a parity
   ledger entry if it touches shared data.

## 5. Do NOT re-litigate (settled 2026-07-13/14)

- The route economy is FUSION, not tier: real playtests show players win at tier 1-5 by fusing
  rarity, never by maxing tier. Reward gold is at 2/4/6 and the tuning is HELD; do not add
  another economy cut. The Dragon Gate difficulty is an intended scoutable player choice
  (Azhdaha = high risk, Auctioneer = safe). See the balance readouts via `npm run sim` and
  `npm run sim -- ba` if you need them, but treat the shape/ordering, not the exact clear-rate,
  as truth (the sim models one competent policy, no anomalies, and a simplified fused board).
- The two health layers, targeting rules, and the storm/poison/burn decay math are settled.
- Slip Past, boss retry seeds, and the reward idempotency (receipts) are settled.

## 6. Key files

- `src/engine.js` - the pure combat sim (fire/step/rattleOf/pickTarget). The R7 target.
- `src/data.js` - ITEMS, MONSTERS, HEROES, ANOMALIES, TRINKETS, ENCH, DISTRICTS, RSTAT
  `[1,2,3.8,7]`, constants. `fuseNeed`: 3 bronze -> silver, 2 silver -> gold, 2 gold -> diamond.
- `tests/engine.test.js` - combat outcome invariants. `tests/parity.test.js` - data-table
  parity only (fight-for-fight retired). `tests/combat-*.js` + the golden - the R7 oracle.
- `src/ui.js` / `src/route-ui.js` / `src/ui-core.js` - flow + presenters + shared kernel (NOT
  engine; out of scope for R7).
- `scripts/route-sim.js` - the fusion-aware route balance harness (`npm run sim`).
- `CLAUDE.md` - game history + hard rules (its Netlify deploy lines are stale; deploy is git
  push). `public/sw.js` (CACHE_V), `public/CNAME` (platosd.com).

## 7. Working loop back to Claude Code

Claude Code (the other assistant) built the oracle and did the browser/production verification
and playtm analysis; loop it back for: R8 design sanity per batch, art batches (it owns the
`.claude/skills/art-batch` round trip and on-device image QA), any user-visible UI/economy
change needing production-bundle + Playwright verification, and Robbie's on-device playtests.
R7 (engine-internal, test-guarded) does not need it.
