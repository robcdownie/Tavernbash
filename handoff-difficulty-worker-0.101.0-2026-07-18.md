# Handoff: Launch L2 0.101.0 Resolve-attrition curve (difficulty worker)

Date: 2026-07-18. From: Claude (Launch L2 main integrator). To: the difficulty worker. Status: reserved and BLOCKED on the start gate in section 1. Written dash-free for the repo dash scan.

This is the CORRECTED execution package. Codex independently signed 0.100.0 and then reviewed the first handoff at commit 2b933bc and REJECTED it. This revision applies Codex's corrections and returns to Codex for review. Where this handoff and the older design notes `difficulty-worker-notes-2026-07-18.md` disagree, this handoff wins. The specific overrides of those notes are called out inline: the D6 hold, the Vizier hold, hasteMates fixed at 0.30 with no further softening lever, the removal of any telegraph from this version, the new verifier requirement, and the removal of the combat-golden regeneration.

## 1. Start gate (must clear before any work)

BLOCKED. Recorded by Robbie on 2026-07-18:

1. Codex independently signs 0.100.0. STATUS: MET. Codex has signed 0.100.0.
2. Codex reviews and approves the final 0.101.0 handoff. STATUS: NOT MET. Codex reviewed the first handoff at 2b933bc and returned REJECT. This correction commit addresses the rejection and returns to Codex. The difficulty worker does not begin until Codex approves this corrected handoff.

The dedicated branch and worktree are pre-created by the main integrator and contain no 0.101.0 source work. No `src/data.js` edit, no difficulty constant, no Azhdaha change, and no verifier code begins before Codex approves this handoff.

## 2. Base commit and reservation

- The reservation is anchored to canonical HEAD `5d2570b225801314d6d6e907d15c8599a8316f07` on `launch-safe-ground`, whose ancestry contains the integrated 0.100.0 product baseline `6dbf27e5c6275797a98cc351aa234481d83831c0`. This is a local integration line; Launch L2 is not deployed. 0.99.4 (Hero and Omen compatibility) is live at platosd.com; 0.100.0 (Board Aspect repair) is integrated locally and awaits Robbie's deploy approval. Build on the commit line, not on the live site.
- The dedicated branch `launch-calibrated-challenge-0.101.0` and worktree `C:/tmp/bazaar-brawler-l2-0.101.0` are pre-created from the reservation-carrying HEAD, so `scripts/ship.js` can read your approved file set by branch. Run `npm ci` in the worktree before your first test or build.
- Anticipated approved file set (in `coordination/state.json`, owner difficulty-worker, status reserved-blocked): `package.json`, `src/data.js`, `src/map.js`, `tests/parity.test.js`, `tests/map.test.js`, `scripts/launch-l2-verify.mjs`, `tests/launch-l2-verify.test.js`, `scripts/route-sim.js`, `tests/route-sim.test.js`, `tests/aspects.test.js`, `tests/engine.test.js`. `tests/combat-traces.golden.json` is deliberately NOT in the set (section 10). Only the main integrator (Claude) edits the reservation; if your final set differs, tell Claude to update it before you ship.

## 3. Sole-writer rule on src/data.js

You are the sole active writer of `src/data.js` for 0.101.0. The 0.100.0 Board Aspect repair (the previous `src/data.js` writer) is done and integrated, so there is no concurrent writer. Do not begin until the start gate clears and you are on the reserved worktree.

## 4. Verifier requirement (implement a new pure verifier)

The current `scripts/route-sim.js` output is INSUFFICIENT for the Launch L2 exit metrics. Do not treat the existing harness as adequate and do not approve the curve on route-sim output alone. Implement a new verifier `scripts/launch-l2-verify.mjs`, with tests in `tests/launch-l2-verify.test.js`. It must be pure, deterministic, and DOM-free, and it must reuse the real engine and the real route controller (the same construction path as `route-sim.js` and `variant-verify.mjs`), never a reimplemented combat or route model. It may share code with `route-sim.js`, which is why both are in the approved set, but route-sim alone does not produce the required evidence.

The verifier specification must explicitly include, all on paired seeds (the baseline curve and the reshaped curve run on the same seeds so every delta is attributable):

1. Ended runs contribute zero Resolve at later district boundaries (a run that already died counts as zero at every later boundary, not as a dropped sample).
2. Survivor medians reported separately from the boundary point estimates.
3. Expected Resolve bands at each district boundary, with strictly falling point estimates across boundaries.
4. District fight duration and player storm damage per district.
5. Storm evidence split by first attempt, retry, win, and loss.
6. The 12 eligible starter cells at 150 paired seeds each.
7. 1,200 paired synthetic profiles carried through three Quick runs.
8. Run-1 district-3 reach protection and run-3 Quick-clear protection.
9. Feat-event protection through run 3.
10. Lantern first-clear protection at both the median and the 90th percentile.
11. Paired base and Aspect traces (the base monster and its two Aspects measured together, plain and gilded).
12. Epoch-1 active-run preservation (an epoch-1 run keeps its epoch-1 map and is not retired by the epoch-2 power table).
13. The rollback constants for every trial (section 8), emitted so a regression is one revert.

The verifier is the evidence surface Codex's cohort packet is compared against; keep its numbers directional and paired, and label anything it cannot measure (heroes, Omens, enchants, skilled routing) as out of scope, the same honesty `route-sim.js` uses.

## 5. Baseline curve (exact values at the base)

- Quick `DISTRICTS` (`src/data.js` around line 768) carry no `power` field: D1 to D4 all resolve to power 1.0.
- Long `LONG_DISTRICTS` (`src/data.js` around line 783): D1 to D3 no power; D4 (Back Alleys After Midnight) `power:2.9`; D5 (Souk After Midnight) `power:1.6`; D6 (Palace After Midnight) `power:2.05`; D7 (Dragon Gate) `power:1.6`.
- Azhdaha `hasteMates` is `0.5` in all three places: the base `azhdaha.board` heads (around lines 595 to 597) and the `azhdaha_v1` and `azhdaha_v2` aspect boards (around 696, 697). `MONSTERS.vizier.hp` is `700` (around 601).

## 6. Storm-wall evidence (Robbie on-device smoke, run r1slbuqc)

Recorded in `coordination/state.json` launchL2Inputs as `after-midnight-storm-wall`. On the 0.99.3 production smoke, the player cleared districts 1 to 4 near full health, then lost five straight attempts to the district 6 (Palace After Midnight) Ifrit boss and never dropped it below about 247 of 1537 health. Root cause was storm timing, not board strength: `stormAt` was 16s but the late fights ran 24 to 26s, so the simoom dealt 378 to 550 unattributed damage per attempt and dominated the loss. The After Midnight power multiplier (2.05 at D6) stacked on the fixed storm arrival is the specific spike.

Consequence for this version: D6 stays a real check, and it must not become a wall. The primary trial HOLDS D6 at 2.05 (section 7). If the verifier shows the 2.05 trial is still storm-dominated at D6, test a LOWER D6 power as a separate trial; do not raise D6 and do not add a telegraph in this version.

## 7. Trial targets (primary trial, corrected)

Primary trial, all in `src/data.js`:

1. Azhdaha snowball `hasteMates` 0.5 to exactly `0.30`, on all three definitions: the base `azhdaha.board` heads, `azhdaha_v1`, and `azhdaha_v2`.
2. Quick mid-district power: `DISTRICTS[1]` The Souk (D2) add `power:1.12`; `DISTRICTS[2]` Palace Quarter (D3) add `power:1.18`.
3. Long D5 power: `LONG_DISTRICTS[4]` Souk After Midnight (id5) `power` 1.6 to `2.10`.
4. Long D6 power: `LONG_DISTRICTS[5]` Palace After Midnight (id6) HOLDS at `2.05`. Do not change it in the primary trial.
5. Vizier: `MONSTERS.vizier.hp` HOLDS at `700`. Do not change it in the primary trial.

Rejection control, not a trial: D6 `power:2.15` may appear only as a rejection control in the verifier readout (a value shown to be rejected against the 2.05 hold), never as the primary trial value. This overrides `difficulty-worker-notes-2026-07-18.md` section 3, which proposed D6 2.15 and Vizier 660 as the reshape; both are rejected here.

## 8. Rollback constants

Every value the primary trial changes has a single-value rollback. The verifier emits these (section 4 item 13):

- Azhdaha `hasteMates`: 0.30 back to `0.5` (base board heads, `azhdaha_v1`, `azhdaha_v2`).
- Quick `DISTRICTS[1].power` and `DISTRICTS[2].power`: remove the fields (back to no `power`, which resolves to 1.0).
- Long `LONG_DISTRICTS[4].power`: 2.10 back to `1.6`.
- `CONTENT_EPOCH`: 2 back to `1`, and drop the epoch-2 power table from `EPOCH_TABLES`.

Long D6 (`2.05`) and `vizier.hp` (`700`) are held, so they have no rollback in the primary trial.

## 9. Content-epoch correction (this supersedes design-doc section 6)

The design document predates Launch L1 0.99.2. Its section 6 says to bump `MAP_VERSION`, retire in-progress runs, and bump `CACHE_V`. Do not do that for the district `power` change. Launch L1 built the content epoch precisely to stop a balance change from retiring active runs.

District `power` is one of the epoch-resolved map inputs (see `coordination/state.json` contentEpochNote: genMap resolves treasure pools, district power, and the enchant pool through epoch tables). The primary trial changes the Quick D2, Quick D3, and Long D5 power table entries, so those are a content-epoch change, not a map-schema change:

- Bump `CONTENT_EPOCH` in `src/map.js` from 1 to 2, and freeze the outgoing epoch 1 power table into `EPOCH_TABLES` so a supported active run regenerates its own epoch-1 map instead of being retired. New runs resolve epoch 2 with the graded power. This is verifier item 12.
- Do not bump `mapSchema` or `MAP_VERSION`: the generator structure is unchanged, only the epoch-2 power values differ. `readRouteSave` retires only on a map-structure mismatch, which this is not.
- `tests/map.test.js` currently asserts Quick maps omit `power`. Make that assertion epoch-aware: an epoch-2 Quick map carries the graded D2 and D3 power; an epoch-1 Quick map still omits it. Refresh the pinned Quick map ledger for epoch 2 and keep the epoch-1 golden intact.
- Claude bumps `coordination/state.json` schemas.contentEpoch to 2 at finalize; flag it in your handoff back.

The Azhdaha `hasteMates` edit is a combat-stat change on a monster definition, not a map input, so it is not epoch-resolved. A resumed run simply fights with the new stat. It needs parity treatment (section 10) but no epoch or save handling.

## 10. Parity ledger, and NO combat golden changes

- Base `azhdaha` is an original shipped monster, so its `hasteMates` change needs a `REBALANCED_MONSTERS` entry in `tests/parity.test.js`. Supply the full replacement `board` with `hasteMates:0.30` (the ledger shallow-merges, so the whole board array is the override). Vizier is held at 700, so there is no Vizier parity entry.
- `azhdaha_v1` and `azhdaha_v2` are post-original aspect content and need no parity-ledger entry.
- Do NOT regenerate combat goldens and do NOT run `scripts/capture-traces.js`. The combat golden fixtures are synthetic constructions of `fi()` items; none references the `azhdaha` or `vizier` monster board, so changing azhdaha's data value moves no golden. In particular, the synthetic `rattle-haste-mates-order` fixture uses `hasteMates:0.5` to pin the ENGINE'S hasteMates semantics (the verb behavior), independent of any monster's data value. That fixture and `tests/combat-traces.golden.json` must remain unchanged. `tests/combat-traces.golden.json` is therefore not in your approved file set. Run `tests/combat-trace.test.js` in verification to CONFIRM the golden is unchanged.

## 11. Interaction with the shipped 0.100.0 Aspect repair

0.100.0 repaired eight Aspect boards and deliberately left `azhdaha_v1` as an unchanged high-sample control, in band at 2,400 seeds. Your `hasteMates` 0.5 to 0.30 change now touches `azhdaha_v1` and `azhdaha_v2`, so it will move their `variant-verify` rows. Re-run the full 2,400-seed trace and confirm the paired azhdaha base and aspect rows stay inside their bands (Gate elite band plus or minus 5). The other 45 aspects must remain at the 0.100.0 result: zero breaches. If any aspect breaches after your change, it joins this version before it can exit; the 2,400-seed global result controls exit, not the named target list.

## 12. Trial constants are not final approval

The roadmap marks these trial constants, not approval in advance. Validate the exact values against the hero-by-Omen matrix (`node scripts/route-sim.js matrix`, audit item 7, shipped) and, ultimately, cohort Resolve evidence, because a reshape correct for the hero-blind bot can be easier or harder for a specific hero. The D6 hold at 2.05 is the primary; if the verifier or cohort shows D6 still storm-dominated, test a lower D6 power as a separate trial (section 6). Vizier `hp` 660 may be considered ONLY if the complete paired matrix proves it necessary; it is not optional polish and is not part of the primary trial.

## 13. Launch L2 exit-gate metrics (from the roadmap)

The verifier (section 4) is the surface that measures these:

- First-attempt wins descend by district; no adjacent drop exceeds 15 points.
- Long overall clear stays 55 to 70 percent.
- Azhdaha and Auctioneer first-attempt win rates within 12 points at the Gate.
- Paired base and Azhdaha Aspect traces keep plain and gilded columns in band.
- `variant-verify` at 2,400 seeds: every plain and gilded row in band (global, not just azhdaha).
- Cohort expected-Resolve point estimates fall at each district boundary and land in the approved Quick and Long bands. This needs real cohort evidence; Codex owns the cohort packet and the gate ruling and does not implement the constants.
- Eligible starter cells meet the maximum baseline drops and the 60 percent Quick and 40 percent Long floors.
- At least 90 percent of synthetic fresh profiles reach D3 on run 1 and clear Quick by completed run 3.
- Feat events through run 3 fall no more than 10 percent; Lantern first-clear timing moves no more than one completed run at the median or 90th percentile.
- The settled Launch L2 gates already met by 0.99.4 and 0.100.0 stay green.

## 14. Constraints

- No settled targeting rule or combat-input contract change. No bulwark or flying semantic change. No Azhdaha inversion. No stacked 8-second to 9-second head cooldown change (a rejected lever). No economy change. No new monster, ware, hero, or Omen.
- No scout-card or storm-clock telegraph in 0.101.0. Player-facing difficulty legibility (surfacing district power or the storm clock) belongs to Launch L5, not this version. This is the difficulty-shape version only, one system.
- No push, deploy, or `CACHE_V` bump without Robbie's explicit approval after local verification is summarized.
- Do not modify or stage `.claude/settings.local.json`.

## 15. Verification commands

- Launch L2 verifier (primary): `node scripts/launch-l2-verify.mjs` and `node --test tests/launch-l2-verify.test.js`. This is the authoritative L2 evidence surface; parse its printed result, and treat a nonzero finding as a fail even if the process exits 0.
- Aspect trace: `node scripts/variant-verify.mjs 2400`, then parse the printed result. Require `0 band breaches across 46 aspects` and every row in band.
- Route sims (secondary shape check, not sufficient alone): `node scripts/route-sim.js 1200 quick` and `node scripts/route-sim.js 1200 long`.
- Hero-by-Omen matrix: `node scripts/route-sim.js matrix`.
- Focused: `node --test tests/parity.test.js tests/map.test.js tests/aspects.test.js tests/engine.test.js tests/route-sim.test.js tests/launch-l2-verify.test.js tests/combat-trace.test.js`. The combat-trace run must pass unchanged, proving the synthetic hasteMates 0.5 golden is untouched.
- Full suite and build: `npm test` and `npm run build`.

## 16. Integration and gate

Hand the verified source commit back to Claude (Launch L2 main integrator) for the cherry-pick onto `launch-safe-ground`, the `coordination/state.json` finalize (close the reservation, bump build to 0.101.0, set contentEpoch to 2, record before and after evidence and the rollback constants above), and the Launch L2 exit-gate record. Codex signs the final evidence gate. Launch L2 does not close until 0.101.0 is integrated, the verifier and 2,400-seed trace pass, the cohort Resolve evidence is collected, and Codex signs. Only then does Launch L3 (Market Agency, Codex) begin.
