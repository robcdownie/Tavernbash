# Handoff: Launch L2 0.101.0 Resolve-attrition curve (difficulty worker)

Date: 2026-07-18. From: Claude (Launch L2 main integrator). To: the difficulty worker. Status: reserved and BLOCKED on the start gate in section 1. Written dash-free for the repo dash scan.

This is the execution package for the last Launch L2 version. The curve design is already written and sim-validated in `difficulty-worker-notes-2026-07-18.md`; that document remains the authority for what to change and why. This handoff adds only what that document could not know, because it predates the Launch L1 safety work: the start gate, the exact base, the collision-safe reservation, the approved simulator requirements, the storm-wall evidence, the trial targets, the rollback constants, the content-epoch correction, the parity and golden treatment, the interaction with the shipped 0.100.0 Aspect repair, and the Launch L2 exit-gate metrics. It does not implement any of them.

## 1. Start gate (must clear before any work)

BLOCKED. Do not begin 0.101.0 until both hold, recorded by Robbie on 2026-07-18:

1. Codex independently signs 0.100.0 (the Board Aspect repair), and
2. Codex reviews this final handoff.

The dedicated branch and worktree are pre-created by the main integrator, but they contain no 0.101.0 source work. No `src/data.js` edit, no difficulty constant, no Azhdaha change, and no simulator-harness change begins before both gates clear.

## 2. Base commit and reservation

- The reservation is anchored to canonical HEAD `5d2570b225801314d6d6e907d15c8599a8316f07` on `launch-safe-ground`, whose ancestry contains the integrated 0.100.0 product baseline `6dbf27e5c6275797a98cc351aa234481d83831c0`. This is a local integration line; Launch L2 is not deployed. 0.99.4 (Hero and Omen compatibility) is live at platosd.com; 0.100.0 (Board Aspect repair) is integrated locally and awaits Robbie's deploy approval. Build on the commit line, not on the live site.
- The dedicated branch `launch-calibrated-challenge-0.101.0` and worktree `C:/tmp/bazaar-brawler-l2-0.101.0` are pre-created from the reservation-carrying HEAD, so `scripts/ship.js` can read your approved file set by branch. Run `npm ci` in the worktree before your first test or build.
- Reservation (recorded in `coordination/state.json`, owner difficulty-worker, status reserved-blocked): version `0.101.0`, project Launch L2, token `launch-calibrated-challenge`. Only the main integrator (Claude) edits `coordination/state.json`. If your final file set differs from the anticipated list in the reservation, tell Claude to update it before you ship; `scripts/ship.js` refuses any path outside the reservation's approved set.

## 3. Sole-writer rule on src/data.js

You are the sole active writer of `src/data.js` for 0.101.0. The 0.100.0 Board Aspect repair (the previous `src/data.js` writer) is done and integrated, so there is no concurrent writer. Do not begin until the start gate clears and you are on the reserved worktree.

## 4. Approved simulator requirements

The harness already exists. Do not build a new one. Use the shipped tools:

- `node scripts/variant-verify.mjs N` is the board-Aspect difficulty trace. It fights an on-curve player board against the shipped board and each Aspect, plain and gilded, over N seeds, and holds each row to its door band: districts 1 to 3 doors plus or minus 8, Gate elites plus or minus 5, bosses plus or minus 4. It always exits 0, so parse the printed `band breaches` line and every row verdict; do not trust the exit code. The authoritative gate seed count is 2,400.
- `node scripts/route-sim.js N quick` and `node scripts/route-sim.js N long` run full routes with the real route controller and the real fight engine, driven by a competent fusion-first bot. Report by-district first-attempt win rate, adjacent drops, clear rate, gate-elite spread, and the invalid-run, guard-trip, and timeout counts. The route seed count is 1,200 per mode.
- `node scripts/route-sim.js matrix` runs the hero-by-Omen matrix (audit item 7, shipped). Use it to validate the exact power values against real heroes, because the plain route bot is hero-blind, no-Omen, no-enchant, aspects off.
- The coverage manifest (`node scripts/route-sim.js coverage`) labels each mechanic full, proxy, or blind. The simulator may not be used to approve behavior it labels proxy or blind. The sim gives shape, ordering, and delta evidence, not the cohort verdict; treat every number as directional. Standard error at 400 seeds is roughly 2 to 3 points, so the low-seed edges the 0.95.0 pass saw do not survive at 2,400.
- Determinism: the traces and sims use fixed seeds, so a before run and an after run at the same seed count are directly comparable per cell.

## 5. Baseline curve (exact values at the base)

- Quick `DISTRICTS` (`src/data.js` around line 768) carry no `power` field: D1 to D4 all resolve to power 1.0.
- Long `LONG_DISTRICTS` (`src/data.js` around line 783): D1 to D3 no power; D4 (Back Alleys After Midnight) `power:2.9`; D5 (Souk After Midnight) `power:1.6`; D6 (Palace After Midnight) `power:2.05`; D7 (Dragon Gate) `power:1.6`.
- Azhdaha `hasteMates` is `0.5` in all three places: the base `azhdaha.board` heads (around lines 595 to 597) and the `azhdaha_v1` and `azhdaha_v2` aspect boards (around 696, 697). `MONSTERS.vizier.hp` is `700` (around 601).
- Measured baseline first-attempt win rate by district is in `difficulty-worker-notes-2026-07-18.md` section 1 (Quick D1 90 to D4 56, a 25-point Gate cliff; Long non-monotonic with a D4-to-D5 bump and 15 and 23-point end drops; Gate elite azhdaha 25 vs auctioneer 61 in Long).

## 6. Storm-wall evidence (Robbie on-device smoke, run r1slbuqc)

Recorded in `coordination/state.json` launchL2Inputs as `after-midnight-storm-wall`. On the 0.99.3 production smoke, the player cleared districts 1 to 4 near full health, then lost five straight attempts to the district 6 (Palace After Midnight) Ifrit boss and never dropped it below about 247 of 1537 health. Root cause was storm timing, not board strength: `stormAt` was 16s but the late fights ran 24 to 26s, so the simoom dealt 378 to 550 unattributed damage per attempt and dominated the loss. The After Midnight power multiplier (2.05 at D6) stacked on the fixed storm arrival is the specific spike; the front half at power 1 gave no such pressure. This is direct field evidence that the D6 region is the real Long check and must stay a check, not become a wall. If your D6 `power:2.15` trial keeps the storm-driven loss, prefer easing to 2.10 or telegraphing the storm clock rather than adding board strength.

## 7. Trial targets (from the design doc, not final approval)

Core reshape, all in `src/data.js`:

1. Azhdaha snowball `hasteMates` 0.5 to 0.3 on all three definitions (base board heads, `azhdaha_v1`, `azhdaha_v2`).
2. Quick mid-district power: `DISTRICTS[1]` The Souk (D2) add `power:1.12`; `DISTRICTS[2]` Palace Quarter (D3) add `power:1.18`.
3. Long reprise power fix: `LONG_DISTRICTS[4]` Souk After Midnight (id5) `power` 1.6 to 2.1; `LONG_DISTRICTS[5]` Palace After Midnight (id6) `power` 2.05 to 2.15.

Optional polish: `MONSTERS.vizier.hp` 700 to 660.

The roadmap marks these trial constants, not approval in advance. The design doc's own sim showed Long D6 at 2.15 still carrying 21 percent deaths and a Long gate-elite spread of about 13 versus the 12 target; the `hasteMates` 0.25 lever closes the spread if it persists. Validate the exact values against the hero-by-Omen matrix and, ultimately, cohort Resolve evidence before finalizing.

## 8. Rollback constants

Every change above has a single-value rollback. Record these in the version so a regression is one revert:

- Azhdaha `hasteMates`: 0.3 back to `0.5` (base board heads, `azhdaha_v1`, `azhdaha_v2`).
- Quick `DISTRICTS[1].power` and `DISTRICTS[2].power`: remove the fields (back to no `power`, which resolves to 1.0).
- Long `LONG_DISTRICTS[4].power`: 2.1 back to `1.6`. `LONG_DISTRICTS[5].power`: 2.15 back to `2.05`.
- `MONSTERS.vizier.hp`: 660 back to `700`.
- `CONTENT_EPOCH`: 2 back to `1`, and drop the epoch-2 power table from `EPOCH_TABLES`.

## 9. Content-epoch correction (this supersedes design-doc section 6)

The design document was written before Launch L1 0.99.2. Its section 6 says to bump `MAP_VERSION`, retire in-progress runs, and bump `CACHE_V`. Do not do that for the district `power` change. Launch L1 built the content epoch precisely to stop a balance change from retiring active runs.

District `power` is one of the epoch-resolved map inputs (see `coordination/state.json` contentEpochNote: genMap resolves treasure pools, district power, and the enchant pool through epoch tables). So the Quick and Long `power` edits are a content-epoch change, not a map-schema change:

- Bump `CONTENT_EPOCH` in `src/map.js` from 1 to 2, and freeze the outgoing epoch 1 power table into `EPOCH_TABLES` so a supported active run regenerates its own epoch-1 map instead of being retired. New runs resolve epoch 2 with the graded power.
- Do not bump `mapSchema` or `MAP_VERSION`: the generator structure is unchanged, only the epoch-2 power values differ. `readRouteSave` retires only on a map-structure mismatch, which this is not.
- `tests/map.test.js` currently asserts Quick maps omit `power`. Make that assertion epoch-aware: an epoch-2 Quick map carries the graded D2 and D3 power; an epoch-1 Quick map still omits it. Refresh the pinned Quick map ledger for epoch 2 and keep the epoch-1 golden intact.
- Claude bumps `coordination/state.json` schemas.contentEpoch to 2 at finalize; flag it in your handoff back.

The Azhdaha `hasteMates` and `vizier.hp` edits are combat-stat changes on monster definitions, not map inputs, so they are not epoch-resolved. A resumed run simply fights with the new stats. They need parity and golden treatment (section 10) but no epoch or save handling.

## 10. Parity ledger and combat goldens

- Base `azhdaha` and, if you take the optional nudge, `vizier` are original shipped monsters, so their combat-stat changes need a `REBALANCED_MONSTERS` entry in `tests/parity.test.js`. For azhdaha, supply the full replacement `board` with `hasteMates:0.3` (the ledger shallow-merges, so the whole board array is the override).
- `azhdaha_v1` and `azhdaha_v2` are post-original aspect content and need no parity-ledger entry, exactly as the 0.100.0 Aspect repair needed none.
- The combat golden fixtures reference azhdaha and vizier, so regenerate the affected traces with `node scripts/capture-traces.js`. This is an approved behavior change; record it in the commit. The district `power` edits touch no trace (traces are fixed-cfg fights, not route fights), so only the azhdaha and vizier stat edits move a golden.

## 11. Interaction with the shipped 0.100.0 Aspect repair

0.100.0 repaired eight Aspect boards and deliberately left `azhdaha_v1` as an unchanged high-sample control, in band at 2,400 seeds. Your `hasteMates` 0.5 to 0.3 change now touches `azhdaha_v1` and `azhdaha_v2`, so it will move their `variant-verify` rows. Re-run the full 2,400-seed trace and confirm the paired azhdaha base and aspect rows stay inside their bands (Gate elite band plus or minus 5). The other 45 aspects must remain at the 0.100.0 result: zero breaches. If any aspect breaches after your change, it joins this version before it can exit; the 2,400-seed global result controls exit, not the named target list.

## 12. Launch L2 exit-gate metrics (from the roadmap)

- First-attempt wins descend by district; no adjacent drop exceeds 15 points.
- Long overall clear stays 55 to 70 percent.
- Azhdaha and Auctioneer first-attempt win rates within 12 points at the Gate.
- Paired base and Azhdaha Aspect traces keep plain and gilded columns in band.
- `variant-verify` at 2,400 seeds: every plain and gilded row in band (global, not just azhdaha).
- Cohort expected-Resolve point estimates fall at each district boundary and land in the approved Quick and Long bands. This needs real cohort evidence; Codex owns the cohort packet and the gate ruling and does not implement the constants. The sim gives shape and ordering, not the cohort verdict.
- The other settled Launch L2 gates already met by 0.99.4 and 0.100.0 stay green: fresh random Apothecary never selects Blood Moon, deterministic selection preserved, and every Aspect row in band.

## 13. Constraints

- No settled targeting rule or combat-input contract change. No bulwark or flying semantic change. No Azhdaha inversion. No stacked 8-second to 9-second head cooldown change (a rejected lever). No economy change. No new monster, ware, hero, or Omen.
- No push, deploy, or `CACHE_V` bump without Robbie's explicit approval after local verification is summarized.
- Do not modify or stage `.claude/settings.local.json`.
- One player-facing system per version: this is the difficulty-shape version only. If you add the district-power scout telegraph, keep it inside this version only if it does not amount to a second system; otherwise leave it for Launch L5 legibility.

## 14. Verification commands

- Aspect trace: `node scripts/variant-verify.mjs 2400`, then parse the printed result. Require `0 band breaches across 46 aspects` and every row in band.
- Route sims: `node scripts/route-sim.js 1200 quick` and `node scripts/route-sim.js 1200 long`; report the by-district first-attempt curve, adjacent drops, clear rate, and gate-elite spread, before and after.
- Hero-by-Omen matrix: `node scripts/route-sim.js matrix`.
- Focused: `node --test tests/parity.test.js tests/combat-trace.test.js tests/map.test.js tests/aspects.test.js`.
- Full suite and build: `npm test` and `npm run build`.

## 15. Integration and gate

Hand the verified source commit back to Claude (Launch L2 main integrator) for the cherry-pick onto `launch-safe-ground`, the `coordination/state.json` finalize (close the reservation, bump build to 0.101.0, set contentEpoch to 2, record before and after evidence and the rollback constants above), and the Launch L2 exit-gate record. Codex signs the final evidence gate. Launch L2 does not close until 0.101.0 is integrated, the sim bands and 2,400-seed trace pass, the cohort Resolve evidence is collected, and Codex signs. Only then does Launch L3 (Market Agency, Codex) begin.
