# Codex handoff: Launch L1, review 0.99.2 and implement 0.99.3

Date: 2026-07-18. From: Claude (Launch L1 accountable integrator). To: Codex.

Robbie approved the Launch L1 through Launch L5 namespace and the owner split.
Claude implemented 0.99.1 and 0.99.2. You own the frozen review of 0.99.2 and
the implementation of 0.99.3, then you sign the Launch L1 exit gate. You keep
lead on Launch L3 and Launch L4.

Read `coordination/state.json` first (the canonical live state), then this file.

## Frozen review target

- Branch: `launch-safe-ground` (local only, nothing pushed).
- Frozen 0.99.2 commit to review and build 0.99.3 on: `ff8fd931171bcc98bf0a7c4225a9969700fed3d6`.
- Chain: `ff8fd93` (0.99.2) on `719da50` (0.99.1) on `15e8995` (frozen roadmap).

## What 0.99.1 landed (719da50)

Coordination and release safety. `coordination/state.json` is the canonical
state (build, reviewed HEAD, deploy truth, schemas, reservations with owner,
branch, worktree, approved files, and verification, plus Robbie's recorded
rulings). `scripts/coordination.js` holds the pure reservation validator (it
rejects a duplicate active version, branch, or resolved worktree path) and the
explicit-staging planner. `scripts/ship.js` stages an approved file set and
refuses unexpected paths rather than `git add -A`. Docs reconciled: `AGENTS.md`
is tracked and reduced to a pointer with no live Netlify path, `CLAUDE.md` and
`ROADMAP.md` gained current-truth pointers, and the roadmap folded in
refinements R1 (restore the full dev tree with `npm ci`) and R2 (never
abbreviate to a bare L1 through L5; the Lantern ladder owns L1 through L10).

## What 0.99.2 landed (ff8fd93)

The content epoch, decoupling pool membership from map retirement.

- `CONTENT_EPOCH` in `src/map.js`, separate from `MAP_VERSION` (generator
  structure) and `ROUTE_SAVE_VERSION` (serialized shape). `genMap` gained an
  optional content-tables argument and threads it through `genQuick`, `genLong`,
  `genDistrict`, `genDragonGate`, `tryDistrict`, and `rollTreasure` to resolve
  treasure pools, district power, and the enchant pool. The current epoch
  computes live (tables null), so every existing map and combat golden stays
  byte-identical. `snapshotContentTables`, `contentTablesFor`, and `EPOCH_TABLES`
  are the freeze and lookup seam; `EPOCH_TABLES` is empty because epoch 1 is
  current. Power tables are mode-scoped to avoid a quick-versus-long district
  id 4 collision (Dragon Gate versus an After Midnight reprise).
- Runs stamp `contentEpoch` in `src/route-run.js` (`newRun`, `serializeRun`,
  `reviveRun`) and in the `src/ui.js` save envelope. `ROUTE_SAVE_VERSION` and the
  run `SCHEMA_VERSION` are 8; `migrateV7toV8` in `src/route-save.js` stamps the
  baseline epoch 1 on older saves. `readRouteSave` retires only on a
  `MAP_VERSION` mismatch, so a future content or balance release bumps the epoch
  and freezes the epoch it leaves, never retiring a supported active run. The
  scout preview in `src/route-ui.js` and the resume path both thread the run's
  epoch through `contentTablesFor`.
- Tests: `tests/content-epoch.test.js` is the acceptance mutation test (a frozen
  epoch is immune to a new eligible ware, the current-epoch tables are
  byte-identical to live, only a stale map version retires). The v8 bump updated
  `tests/route-run.test.js`, `tests/route-save.test.js`, and the resume literals
  in `e2e/resume.spec.js`.

Why this matters for you: the L2 aspect repair and difficulty reshape can now
change content without wiping in-progress runs. Do not undo the epoch stamp.

## Verification you can reproduce

- `npm ci` from the committed lockfile (the dev tree was absent in the fresh
  checkout; the lockfile does not change).
- `npm test`: 515 of 515. Byte-identical map and combat parity goldens hold.
- `npm run build`: green.
- `npx playwright test resume.spec.js`: 34 of 34 across both viewports. This is
  the mandated crash-recovery matrix for a save-format change.
- `npx playwright test layout.spec.js`: 26 of 28. The 2 failures are a
  pre-existing stale Omen-count assertion (the test hardcodes 12; there are 16
  Omens since the 0.98.0 Guild Omens). Unrelated to 0.99.2; owed a one-line fix
  in its own commit, not folded into the frozen 0.99.2.

## Your 0.99.3 task: the route decision transaction seam

Reserved in `coordination/state.json` as version 0.99.3, owner codex, base
`ff8fd93`. Scope from the roadmap Launch L1 section:

Centralize deterministic offer validation, generation, receipt creation,
payment or reward mutation, report emission, and checkpoint ordering behind one
behavior-preserving route decision transaction contract. It is the foundation
for Merchant, Treasure, Rest, and Shrine in L3 and L4. No player-visible choice
change in this version.

Acceptance gate:

- Crash-point tests prove each payment and reward settles exactly once before
  and after reload.
- Player-visible output and combat goldens remain unchanged.
- The content epoch, save migration, and byte-identical resume from 0.99.2 stay
  intact (do not regress the resume matrix).
- Full tests and the production build pass from a clean worktree.

Collision rule: create your own separate worktree and branch from `ff8fd93`.
Claude and Codex do not edit the route persistence files concurrently
(`src/route-save.js`, `src/route-run.js`, `src/route-runtime.js`,
`src/route-rewards.js`). Likely surfaces also include `src/route.js` and the
reward and market flow in `src/ui.js`.

## After 0.99.3

Claude integrates Launch L1 and you sign the exit gate. The exit gate still owes
Robbie's on-device production smoke. Nothing deploys without Robbie's explicit
approval; the branch is unpushed by design.
