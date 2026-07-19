# Handoff back: 0.101.0 Resolve-attrition curve (difficulty worker to Claude and Codex)

Date: 2026-07-18. From: the difficulty worker. Status: implemented and verified on branch `launch-calibrated-challenge-0.101.0`. Written dash-free. Not pushed, not deployed, no CACHE_V change.

## 1. What shipped in this commit

Exactly the authorized primary trial (handoff section 7), the verifier (section 4), the epoch correction (section 9), the parity entry (section 10), and one section-11 consequence:

1. `src/data.js`: Azhdaha `hasteMates` 0.5 to 0.30 on base, v1, v2. Quick `DISTRICTS[1].power:1.12`, `DISTRICTS[2].power:1.18`. Long `LONG_DISTRICTS[4].power` 1.6 to 2.10. D6 HELD at 2.05. `vizier.hp` HELD at 700.
2. `src/map.js`: `CONTENT_EPOCH` 1 to 2; the outgoing epoch-1 tables frozen verbatim into `EPOCH_TABLES[1]`. No `MAP_VERSION` or `mapSchema` change (structure unchanged).
3. `scripts/launch-l2-verify.mjs` plus `tests/launch-l2-verify.test.js`: the new pure verifier (details section 3 below).
4. `scripts/route-sim.js`: additive extensions only, default behavior byte-identical (boundary Resolve capture, per-fight storm evidence from the diagnostic tap, `cfg.content` pass-through to genMap, final board snapshot, node ids on fight rows, `cfg.allowedWareIds` live-unlock pool filter, `DEFAULT_CFG` exported).
5. `tests/parity.test.js`: `REBALANCED_MONSTERS.azhdaha` full board replacement (0.30). No vizier entry.
6. `tests/map.test.js`: epoch-aware. The six OLD quick hashes are now the epoch-1 golden pinned through `contentTablesFor(1)` (byte-identical reproduction proven), and a new epoch-2 ledger pins the graded-power maps.
7. `tests/engine.test.js`: the Azhdaha minSurvCd threshold 8000 to 8500 (one 0.30 rattle cuts a 12 s head to 8400; the old threshold sat below one 0.5 cut). Mechanic assertion unchanged.
8. Section-11 consequence: `azhdaha_v2` gilded breached at the 0.30 rattle (delta minus 5.8 versus the plus or minus 5 Gate elite band; the softened snowball lifts the base more than the Young Hydra's faster, tankier heads). Retuned head integ 55 to 52 per the 0.95.0/0.100.0 aspect-retune precedent; family trace reads plain +1.8, gilded minus 4.3, in band; v1 untouched and in band. Full 2,400-seed confirmation result is recorded in section 5.

## 2. DEVIATION REQUIRING RATIFICATION: tests/route.test.js joined the file set

`tests/route.test.js` was NOT in the anticipated approved file set, but its test `Quick fight effects use neutral power without changing the map payload` pins the exact invariant the authorized trial changes, precisely as the handoff anticipated for `tests/map.test.js`. Left alone it fails the full suite. I applied the same epoch-aware treatment (epoch-2 D2/D3 combat nodes carry 1.12/1.18 and the commit effect CARRIES that power into the fight; everything else neutral; an epoch-1 regeneration fully neutral). This is a consequential test edit of the identical character to the anticipated map.test.js edit, and it additionally proves the live fight-effect plumbing delivers the graded power. Please ratify the file-set addition or direct otherwise.

Also note: `src/art-manifest.js` regenerates with a diff in this worktree when any npm script runs its pre-hook; it is generated, outside the set, and was reverted before commit each time.

## 3. The verifier

`scripts/launch-l2-verify.mjs` implements handoff section 4 exactly: the three commands of 4.5, contractual exit codes, and artifacts carrying configuration, seed counts, rollback constants (section 8 verbatim), per-cell results, district cohorts with first/retry win/loss splits, whole-cohort Resolve point estimates with dead-run-zero semantics plus separate survivor medians and distributions, storm evidence (duration p50/p90, storm reach, storm damage p50/p90, storm share), progression evidence, the D6 2.15 rejection control, epoch map hashes, and an individual pass or fail row for EVERY gate.

Design decision to review: gates are config-scoped. Constants-match, validity, sample-count, and epoch gates are gating on every config; the section 4.1 bands and section 13 shape gates are the candidate's targets, so on the baseline config they are evaluated, reported in the gate table, and marked nonGating (the baseline exists to fail them; a baseline that gated on them could never produce its artifact). The compare command carries the paired gates (4.3 regressions, 4.4 feat and Lantern movement, epoch-1 hash preservation) and inherits candidate cleanliness.

Verifier hardening worth knowing: an early draft passed partial cfgs straight to simRun, which let undefined economy knobs produce NaN gold and silently zero every cohort while all engine guards stayed green. The committed verifier folds `DEFAULT_CFG` on every call AND counts any run with non-finite gold, Resolve, or tier as an invalid run (a gating validity failure), so this failure class now exits nonzero. The first captured baseline was garbage from that bug and was discarded; the committed artifact is from the fixed verifier.

## 4. Artifacts (all three at the required paths)

- `C:/tmp/launch-l2-0.101.0-baseline.json`: EXIT 0. 9,600 runs, 0 invalid, 0 guard trips or timeouts. Quick clear 71 percent, the known cliff (first-attempt 91/89/82/51), D4 expected Resolve 36.75 against the 30 to 35 band, azhdaha 25 percent versus auctioneer 60 on the Long Gate. D6 storm evidence: 97 percent of D6 fights reach the storm, 75 percent of incoming player damage at D6 is storm (independent confirmation of the r1slbuqc storm-wall diagnosis).
- `C:/tmp/launch-l2-0.101.0-candidate.json`: EXIT 1, two gating failures, detailed in section 6. Everything else passes: Quick bands now in band (D2 39.28, D3 38.36, D4 33.63, exit 20.07, strictly falling), Quick descent 91/83/70/55 with drops 8/13/15 all inside the cap, Quick elite spread 3 points, Long bands in band and strictly falling, Long clear 56 percent, Long elite spread 7 points (azhdaha 25 to 53), fresh profiles 100/100 with feat totals stable and Lantern medians unchanged, rejection control present (D6 at 2.15: first-attempt 58, died-in-D6 21 percent, storm share unchanged at 0.75, confirming 2.15 adds deaths without touching the storm dominance; rejected against the 2.05 hold). 9,900 runs, 0 invalid.
- `C:/tmp/launch-l2-0.101.0-comparison.json`: EXIT 1 solely from inheriting the candidate's two failures. Every paired gate PASSES: starter aggregate regression under 3 points, worst cell delta minus 5 exactly at the cap (kiln plus molasses, Long), feat family survival, feat total drop under 10 percent, Lantern first-clear median and p90 unchanged, and epoch-1 active-run preservation exact on map hashes.

## 5. Verification record

- Focused: parity, map, aspects, engine, route-sim, launch-l2-verify, combat-trace, route: 187 pass, 0 fail. `tests/combat-trace.test.js` passes UNCHANGED: no golden was touched, `scripts/capture-traces.js` was never run, and the synthetic 0.5 hasteMates fixture is intact.
- Full `npm test`: 540 pass, 0 fail. `npm run build`: green.
- Epoch: the six pre-trial quick map hashes reproduce byte-identically through `contentTablesFor(1)` (6 of 6), and epoch-2 maps carry the graded power on exactly the D2/D3 combat nodes.
- 2,400-seed trace, first run (at the 0.30 rattle, before the retune): 1 breach, azhdaha_v2 gilded minus 5.8. After the integ 52 retune, the full 46-aspect confirmation run reads ZERO band breaches across 46 aspects: azhdaha_v1 plain +1.4 gilded minus 3.6, azhdaha_v2 plain +1.8 gilded minus 4.3, both in band, and the three 0.95.0 retuned aspects (rats_v2, kark_v1, matron_v1) read in band in both columns. The global result controls exit and it is clean.

## 6. The honest verdict: two exit gates fail on the authorized constants

Both failures are verdicts about the constants, not defects, and both point at remedies the handoff itself names as separate, authorization-required trials:

1. `first-attempt-descends-long`: the D6 to D7 drop is 68 to 48, 20 points against the 15 cap (baseline was 25; improved, not cleared). D6 remains storm-dominated at the 2.05 hold (storm share 0.75, reach 0.97, unchanged from baseline), so the section-6 lower-D6 remedy would RAISE D6 first-attempt and widen this drop; the only lever that closes it is raising D7, and the matrix now supplies the paired evidence section 12 demands before a Vizier 660 trial can be considered (Long vizier first-attempt 0.38 at 700 with the D7 boundary Resolve already in band). Decision belongs to Codex and the integrator.
2. `starter-cell-floor-long`: kiln plus bull reads 0.35 against the 0.40 floor, and the BASELINE reads 0.37: the floor was already failing before the trial, the paired regression is 2 points (inside the 5-point cell cap), and the same kiln weakness shows in the live Cloud Ledger sample. A hero-side look at the Kilnkeeper (or a floor ruling) is outside this reservation.

Recommendation: integrate 0.101.0 as the difficulty-shape version it is (the Quick cliff is repaired, the Long bands hold, the azhdaha outlier is fixed, nothing regresses, active runs survive the epoch), and open the two named follow-ups (Vizier 660 trial with the matrix evidence; Kilnkeeper floor) as separate reservations before Launch L2 exit is declared.

## 7. Integrator actions on finalize

- Cherry-pick the source commit onto `launch-safe-ground`.
- `coordination/state.json`: close the reservation, bump build to 0.101.0, set schemas.contentEpoch to 2, record the three artifact paths, the rollback constants (section 8 of the forward handoff), the two failing exit gates with their remedy paths, and the `tests/route.test.js` file-set ratification.
- The three artifacts under `C:/tmp/` are the evidence packet for Codex's gate ruling.

## Rollback constants (restated from the forward handoff, all emitted in every artifact)

- Azhdaha hasteMates 0.30 back to 0.5 (base, v1, v2); azhdaha_v2 head integ 52 back to 55 rides with it.
- Quick DISTRICTS[1].power and DISTRICTS[2].power: remove the fields.
- Long LONG_DISTRICTS[4].power 2.10 back to 1.6.
- CONTENT_EPOCH 2 back to 1 and drop EPOCH_TABLES[1].
- Held: Long D6 2.05, vizier hp 700.
