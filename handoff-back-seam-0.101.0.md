# Hand-back: 0.101.0 live-market seam implementation (difficulty worker to Claude and Codex)

## 00. Quick-arms diagnostic result (third ruling execution, 2026-07-18)

Artifact: `C:/tmp/launch-l2-0.101.0-quick-arms.json`, diagnostic commit `5c5a1b6`, integrity PASS (constants, epoch, validity, samples all clean across 28,800 runs; src/data.js untouched, proven by test and by the artifact's liveConstants). Contractual counts per arm, identical seeds, seam hash `7214657...1006`, mp-1.

VERDICT UNDER THE PRE-REGISTERED RULE: NEITHER ARM IS ADMISSIBLE. The registered consequence applies: Quick power returns to baseline with no replacement trial in this version. The physical `src/data.js` rollback edit awaits Codex's review of these artifacts, since gameplay source is frozen until that review.

The numbers, and the finding that matters:

| arm | quick power | fresh reach-D3 run 1 | quick D4 Resolve PE | quick clear |
|---|---|---|---|---|
| baseline | none | 0.95 (passes 90) | 36.75 (FAILS [30,35]) | 0.72 |
| T3 | D3 1.18 only | 0.81 (FAILS) | 34.15 (passes) | 0.70 |
| T1 | D2 1.06, D3 1.12 | 0.85 (FAILS) | 35.06 (FAILS, high) | 0.70 |

1. THE T3 HYPOTHESIS IS FALSIFIED: D3 1.18 alone reproduces the full rejected pair's 0.81 reach exactly. The reach metric counts advancing into district 3's interior, so the run-1 harm was always the D3 door power itself, not D2. The proposal's mechanism reasoning was wrong and the diagnostic did its job.
2. THE STRUCTURAL FINDING: the two frozen requirements are in measured tension under door-power levers. T3 is the ONLY arm that lands the quick D4 Resolve band, and it pays exactly the reach floor to do it; the baseline keeps the reach floor and misses the band by 1.75 points. Every intermediate (T1) fails both. With district door power as the only lever, [30,35] D4 Resolve and 90 percent run-1 reach appear mutually exclusive.
3. WHAT THIS POINTS AT (for Codex and Robbie, not implemented): the Resolve-attrition goal likely needs a lever class that prices Resolve without hardening run-1 door fights (loss-chip or event-Resolve shaping in the L2/L3 style, which are existing non-storm, non-combat levers), or an explicit gate amendment by Robbie, or a profile-aware design that is a larger project. Storm levers remain forbidden and none is proposed.
4. Constant failures common to ALL arms (the constants-independent noise floor at mp-1 fidelity): descends-long D6 to D7 at 20, both starter floors, clear-by-3. These reproduce the prior packet and do not move with quick power, consistent with the accepted structural analysis.

## 0. Second-WAIT response addendum (2026-07-18, supersedes conflicting details below)

The three blocking findings are corrected; the ruling's holds are all honored (no cherry-pick, no constant change, no Vizier or D6 or storm touch, no gate reinterpretation).

1. LITERAL EXIT CONTRACT RESTORED, commit `0e63e1a4ed86279a755257bb46a73507f2be3cae`: every gate is gating on every configuration, no nonGating scope exists, ok is the all-gates-pass conjunction, and tests prove the all-gating property, the failed-baseline-gate-exits-nonzero path deterministically, and the hash-tamper rejection. The compare command no longer inherits either side's own gate outcomes as gates (reported as data) and REQUIRES seam-content-hash equality.
2. DURABLE EVIDENCE TREE: branch `evidence-baseline-0.101.0`, commit `521e4cbeb44fae1f57b812ce65119083c8dd14dc` (960e124 constants plus the five seam code files committed byte-identical from the worker commit). The artifact's tree identity is the COMPUTED seamContentHash (sha1 over the five seam files from disk, line endings normalized): `721465789eeacd7df219f21a6e765c69d1371006`, byte-identical across both evidence trees; commit flags are labels only.
3. REGENERATED ARTIFACTS at the contractual sample counts: baseline EXIT 1 with its 8 failed gates enumerated (the pre-trial state failing the trial targets, as the literal contract requires), candidate EXIT 1 with 5 (unchanged findings, including the reach-D3 95 to 81 regression that rejected the Quick pair), compare EXIT 0 with all 12 gates passing including `seam-content-hash-equal`. The pair is a valid comparison; the constants verdicts ride the individual artifacts.
4. PROPOSALS delivered in `proposal-quick-rollback-and-mp2-0.101.0.md`: the rollback-side Quick arms were executed and both rejected. Contrary to the original prediction, T3 reduced run-1 reach-D3 to 0.81. The registered rollback is authoritative. mp-2 remains unimplemented and blocked on its eligible 30-run corpus.
5. Full `npm test` 556 green after the contract fix; the 2,400-seed trace and browser results below stand (the seam files hashed are unchanged in behavior; the verifier change is harness-only).

Date: 2026-07-18. From: the difficulty worker. Status: implemented on branch `launch-calibrated-challenge-0.101.0`. Not pushed, not deployed, reservation open, no Vizier trial. Written dash-free.

## 1. Commits

- Implementation: `bf4f97697e06ddfb4c51309f49abc1916742886d` (the seam, inside the expanded reservation).
- Prior state mirror: `18ad654` (canonical reservation state), on top of `12e6d24` (approved proposal), `475fdea` (WAIT record), `b094ae1` (the WAIT-ed constants commit).

## 2. What was built, in the directive's order

1. `src/market-core.js`: rollShop's offer selection (`shopCandidateIds`, `shopWeights`, `rollShopOffers`) and fuseWithVault's pull-and-forge (`pullVaultForges`) extracted verbatim; hooks fire at the exact former call sites (offer-id allocation, forged-iid stamping with the fusion metric, overflow toasts).
2. `src/ui.js`: `rollShop` and `fuseWithVault` are thin wrappers binding G, the storage, `mkOffer`, and the metric emitters. No selection, RNG, offer-id, freeze, metric, or replay behavior change.
3. Extraction identity proven BEFORE the simulator, all six axes: fixed-seed offer sequences (the historical unlock-shop pins now run through the real core, expectations unchanged), rng draw counts and order (counting-rng plus shadow replay), enchant draws, offer-id allocation order, frozen and free-card carryover, and replay determinism. `tests/market-core.test.js` (10 tests) plus the refactored `tests/unlock-shop.test.js` (6 tests).
4. `scripts/market-sim.js`: the versioned deterministic policy (`POLICY_VERSION` mp-1, constants exported as reviewable data). Real keyed streams (`mulberry(fightSeed(seed, nodeId, rollIndex))`), real `warePurchaseCost` buys under `canSpendGold` credit, real `wareSaleValue` sells feeding the real per-sale reroll escalation, vault park-to-buy, real freeze holds, the shipped genRival shield-first fight order, and the exact ui.js victory-income expression.
5. `scripts/route-sim.js`: `market:'live'` behind an unchanged `market:'abstract'` default (route-sim tests green unchanged).
6. Coverage is mode-specific: the abstract manifest keeps every proxy and blind row; the live manifest reads FULL only for what the walker executes, and names what it does not (Charter pin proxy, opening-offense proxy, deliberate vault parking beyond park-to-buy proxy, Treasure acquisition policy proxy).
7. `scripts/launch-l2-verify.mjs`: starter matrix and fresh profiles run `market:'live'`; the curve cohort stays abstract (its 4.1 bands were authored against the abstract pacing policy and remain comparable); rejection control abstract; all modes stamped per cohort in the artifact identity.
8. Bull Market: `victoryIncome` (the ui.js line 932 expression) is computed at each victory and flows into `planReward` as `ctx.incomeGold`; base bounty gold is never scaled. Unit-pinned in `tests/market-sim.test.js`.
9. Every live run freezes `run.wareLock` from its profile storage at run start; `settleUnlocks` runs after the run, so unlocks affect the next run only. Pinned by the fresh-profile-never-buys-locked test.
10. No difficulty constant, Vizier, Azhdaha, storm lever, targeting rule, combat input, or golden changed. `tests/combat-trace.test.js` passes untouched.

## 3. DEVIATION REQUIRING RATIFICATION: tests/signature.test.js

`tests/signature.test.js` (outside the 21-file set) pinned the rollShop sig clause by grepping ui.js source for two occurrences. The approved extraction moved that clause into market-core's candidate filter, so the pin found one. The minimal seam-following edit now pins all three joints: the opening-offense clause still in ui.js, the wrapper's `heroId:G.hero` binding, and the `ctx.heroId` clause in market-core. Identical in character to the `tests/route.test.js` ratification Codex granted. Please ratify or direct otherwise.

## 4. Evidence protocol

Fresh paired artifacts, identical seam code and policy version both sides, only the authorized constants differing:

- Baseline: clean evidence worktree `C:/tmp/bb-l2-evidence-baseline` at `960e124` (0.100.0 constants, CONTENT_EPOCH 1) with the seam code files overlaid from `bf4f976` (`src/market-core.js`, `src/ui.js`, `scripts/market-sim.js`, `scripts/route-sim.js`, `scripts/launch-l2-verify.mjs`); constants files stayed at 960e124. The verifier's own constants gate proves the separation (baseline pass, candidate fail on that tree).
- Candidate: the reservation worktree at `bf4f976` (b094ae1 constants).
- Identity flags recorded in each artifact: `--source-commit bf4f976...`, `--constants-commit 960e124...` or `b094ae1...`; plus seamPolicyVersion, the full policy object, per-cohort market modes, and both coverage manifests. The compare command gates on seam-policy identity.
- The old abstract artifacts were overwritten only after the new runs completed.

### Results

- Baseline (`--constants-commit 960e124`): EXIT 0. 9,600 runs, zero invalid, zero guard trips or timeouts. Abstract curve: Quick clear 71 percent, Long 56 (the known pre-trial shape). LIVE starter matrix at 0.100.0 constants: quick cells 0.00 to 0.37, long cells 0.00 to 0.01, every cell far below the 60 and 40 floors. LIVE fresh profiles: reach-D3-on-run-1 95 percent (passes), clear-by-run-3 30 percent (fails 90), feats 18,872 with all three families alive, Lantern first-clear median 2 p90 3.
- Candidate (`--constants-commit b094ae1`): EXIT 1 with five gating failures: `first-attempt-descends-long` (the D6 to D7 drop 20 against 15, the same constants verdict as the abstract pass, unchanged), `starter-cell-floor-quick` and `-long` (structural, failing at BOTH configs), `fresh-clear-by-run3` (structural: 0.30 baseline to 0.31 candidate, no regression), and ONE NEW LIVE-FIDELITY CONSTANTS SIGNAL: `fresh-reach-d3-run1` falls 0.95 to 0.81. The Quick D2 1.12 and D3 1.18 powers measurably harden the first run of a fresh starter-pool profile, which the abstract model never surfaced. 9,900 runs, zero invalid.
- Comparison: EXIT 1 solely from inheriting the candidate's absolute-floor failures. Every PAIRED gate passes: `seam-policy-identical` (mp-1 both sides, byte-equal policy), starter aggregate regression under 3 points, worst cell delta minus 2 points (well inside the 5-point cap), feat totals within 1 percent, no family dies, Lantern medians unchanged, and `epoch1-active-run-preservation` exact on map hashes.
- Kiln ordering: kiln reads weakest of the three starter heroes in the live matrix at BOTH constant sets (kiln plus molasses 0.00, kiln plus bull 0.01), consistent with the abstract matrix and the real Cloud Ledger sample. The ordering is robust; the absolute floor scale is not.
- Long live cells sit at about zero everywhere, so Long cell deltas carry no signal at 150 seeds; Long constants evidence continues to rest on the abstract curve and the Cloud Ledger.

## 5. The honest finding the live market surfaced (read this first)

The mp-1 walker at live-market fidelity clears far below the abstract policy at BOTH constant sets (order of 10 to 20 percent Quick against the abstract's about 70). Six policy iterations (line concentration, buy-before-tier, sell-to-upgrade, park-to-buy, flush digging, shipped fight order) moved board quality (Silver and Gold boards form correctly) but not the ceiling. The reason is structural, and it is the diagnostic answer the WAIT asked for:

- The abstract model converts every earned coin into an idealized fused board with ZERO shop friction: it implicitly assumes the market always offers exactly the needed copies. The live path prices the real friction of finding copies in 4-card shops, and that friction is the dominant term in board power.
- Consequence 1: the abstract 60 percent Quick and 40 percent Long starter floors are calibrated to abstract optimism. Under live markets every cell sits far below them at BOTH baselines, so the floors cannot separate the constants and fail at baseline and candidate alike. The floor SCALE is a property of the player model, not of the constants.
- Consequence 2: the kiln plus bull question. The ORDERING evidence survives the modality change: kiln reads weakest of the starter heroes in the abstract matrix, in the live matrix, and in the real Cloud Ledger sample. The live evidence therefore supports "kiln is the weak starter hero" as a robust finding while confirming Codex's suspicion that the 0.35-versus-0.40 absolute reading was not floor-grade evidence.
- Consequence 3: what separates the constants is the PAIRED DELTA per cell under identical seam and policy, which the comparison artifact reports with its regression gates. Real-player validation of absolute levels stays where it always was: the Cloud Ledger.

Recommended rulings to consider (Codex's call, not implemented): recalibrate the starter floors against a live-policy baseline or a strengthened policy version; treat cell deltas, not absolute floors, as the constants gate; commission mp-2 only if a stronger bot is genuinely needed for floor-grade absolute evidence.

## 6. Verification record

- Focused: market-core, market-sim, unlock-shop, route-sim, launch-l2-verify, route, map, parity, engine, combat-trace, signature: 209 pass, 0 fail. Combat goldens untouched and passing.
- Full `npm test`: 556 pass, 0 fail. `npm run build`: green.
- Browser: `e2e/resume.spec.js` plus `e2e/layout.spec.js` on a fresh Playwright server: 56 passed, 2 skipped, 0 failed. The resume spec drives the rollIndex market replay through the real reloaded UI against the seam-wrapped rollShop.
- Coverage manifests: `node scripts/route-sim.js coverage` (abstract, unchanged rows) and `node scripts/route-sim.js coverage live` (the live rows with the unexercised remainder named). Both embedded in every artifact.
- The three verifier commands ran with identity flags; exits 0, 1, 1 as recorded in section 4, each artifact carrying source commit, constants commit, seam and policy version, per-cohort market modes, coverage, seed counts, and the full gate table.
- 2,400-seed Aspect trace: ZERO band breaches across 46 aspects, reproducing the pre-seam result exactly; the seam moved no combat behavior.

## 7. Honest gate verdict

The Launch L2 exit gates do NOT clear on this evidence, and the evidence now says precisely why, in two separable parts:

1. Constants verdicts (real, unchanged by the seam): the Long D6 to D7 first-attempt drop of 20 points against the 15-point contract stands, with the Vizier-at-700 D7 the only lawful lever and its 660 trial still unauthorized. NEW at live fidelity: the Quick D2 and D3 powers cost fresh starter-pool profiles 14 points of reach-D3-on-run-1 (95 to 81), a first-run harshness signal the abstract model could not see. Both verdicts are about the AUTHORIZED constants and belong to Codex's ruling, not to more implementation.
2. Player-model verdicts (structural): the abstract starter floors (60 Quick, 40 Long) and the 90 percent clear-by-run-3 floor are calibrated to a frictionless-shop player model and fail at BOTH constant sets under live markets, so they cannot separate the constants. The paired-delta gates, which CAN, all pass (no regression anywhere, worst cell minus 2 points). The kiln-weakest ordering is confirmed across abstract, live, and the Cloud Ledger; the 0.35-versus-0.40 absolute reading was model-scale, exactly as Codex suspected.

Recommended next rulings (not implemented, not assumed): treat paired deltas as the constants gate and recalibrate the absolute floors against a live-policy baseline or a to-be-commissioned stronger policy; rule on the Vizier 660 trial with the D6-to-D7 evidence now carrying live-fidelity context; weigh the new fresh-profile reach-D3 signal when judging the Quick D2/D3 powers, since the first run of a fresh profile is the onboarding surface.
