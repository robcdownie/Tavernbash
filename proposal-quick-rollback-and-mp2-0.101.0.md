# Proposals: rollback-side Quick trial, and the mp-2 behavior-specified market policy

Date: 2026-07-18. From: the difficulty worker. To: Claude and Codex. Status: PROPOSALS ONLY, per the second WAIT ruling items 4 and 5. No constant has been changed and no policy beyond mp-1 exists in code. Written dash-free.

## Part A: the rollback-side Quick trial

### The finding it answers

The live-fidelity fresh-profile cohort showed the rejected Quick pair (D2 1.12, D3 1.18) costs run-1 fresh profiles 14 points of district-3 reach (95 to 81 percent against the frozen 90 floor), while the paired baseline passes that gate. The regression mechanism is concrete: a run-1 profile shops the starter pool with no unlocks and the weakest boards of its life, and meets the D2 doors at plus 12 percent power. The reach-D3 gate is an ONBOARDING gate: it measures the first night a fresh player ever plays.

### Proposed trials (sim-diagnosable now, without touching a constant)

Both are testable through the existing epoch content-table override (the same pure mechanism the D6 2.15 rejection control uses: `snapshotContentTables()` with `power.quick` overridden, passed as `cfg.content`), so a full paired diagnostic can run BEFORE any constants authorization.

- **T3, the D3-shifted grade (recommended primary): Quick D2 none, D3 1.18.** Reaching district 3 is gated by surviving districts 1 and 2; D3's own power does not block REACHING it. T3 therefore restores the run-1 reach floor almost entirely while keeping the whole 1.18 attrition inside D3, which is where the abstract candidate's D4-Resolve band [30,35] earned most of its correction (baseline D4 expected Resolve 36.75 sat above the band; the full pair moved it to 33.63). Predicted shape: reach-D3 back to about 93 to 95; D4 expected Resolve landing near 34 to 35, at the top of the band; adjacent drops comfortably inside 15 (the D2 step flattens, the D3 step stays).
- **T1, the halved pair (control): Quick D2 1.06, D3 1.12.** The linear midpoint toward rollback. Keeps a graded two-district ramp; predicted reach-D3 recovery is partial (the D2 door pressure only halves), so it likely lands between 81 and 95 and the diagnostic decides whether it clears 90.
- Explicitly NOT proposed: per-column or per-threat power scoping (would need a new map or encounter mechanism, not a data trial), any D6, Vizier, or storm change, and any reinterpretation of the frozen 90 floor.

### Pre-registered diagnostic protocol

1200 paired fresh profiles per arm (baseline, T3, T1), identical seam and policy, identical seeds, content-table overrides only. Decision rule, registered before running: an arm is admissible when fresh reach-D3-run-1 is at least 90 AND the abstract curve keeps first-attempt descent with no adjacent drop above 15 AND the quick Resolve point estimates land in the section 4.1 bands. Admissible arms go to Codex for the next constants authorization; if none is admissible, the Quick grade returns to rollback (no power) and the Resolve-attrition goal moves to the next design cycle with that evidence attached.

## Part B: the mp-2 behavior-specified market policy

### Why

The second ruling is exact: absolute floor-grade evidence needs a player model calibrated against observed play, not a policy tuned until numerical gates pass. mp-1 was specified from the abstract policy's structure and iterated on outcomes; that is the wrong epistemology for floor-grade absolutes, and its 10-to-20-percent live clears cannot anchor floors either way.

### Specification method (behavior-first, outcome-blind)

1. **Calibration corpus:** the Cloud Ledger run records already carry the needed behavioral events per market visit: `shop_roll`, `shop_buy` (with offer and cost), `shop_reroll`, `shop_freeze`, `tier_up`, `fusion`, sells, and per-phase timing. Extract per-market and per-run behavioral marginals from at least 30 current-version runs (the roadmap's own evidence bar): buys per market (distribution), rerolls per market, freeze rate per market, sell rate, tier-by-district curve, distinct-line count over time, vault occupancy, share of buys that continue a line versus open one, enchant-buy rate.
2. **Policy fitting:** mp-2's decision weights are chosen to match those behavioral marginals (a calibration loss over the distributions), with clear rates and every verifier gate EXCLUDED from the fitting loop. The policy stays deterministic, seeded, and reviewable as data; the fitted weights ship with the calibration report.
3. **Validation, not tuning:** on held-out runs, mp-2's predicted clear rate is compared to the human sample's (Robbie's ledger currently reads about 50 percent overall on a small mixed-version sample). Pre-registered acceptance: behavioral marginals within tolerance AND the clear-rate prediction within 10 points of the held-out human rate. Only a policy that passes both is floor-grade, and only then should the 60, 40, and 90 absolute floors be recalibrated, by Robbie's explicit amendment, against mp-2's baseline.
4. **Honest data gap:** the ledger holds about 10 runs today, mixed versions. Reaching the 30-run current-version corpus is a Robbie-play dependency and should be scheduled with him; no synthetic substitute is proposed.

### What this does not do

mp-2 does not replace the paired-delta methodology (which already separates constants at any policy strength), does not touch combat or route semantics, and does not exist in code until Codex approves this specification and the reservation names the files.
