# Design: reshape the difficulty curve into a monotonic ramp

Date: 2026-07-18. Status: sim-validated, implementation-ready, not yet coded. Audit item #2. Written dash-free for repo compatibility.

## 1. The problem, measured (800-seed route sim, current build)

The run is a flat plain into one wall. Two data-only facts drive it: `fightHP(threat) = (90 + threat*8)*hpMul` gives the player MORE health at higher threat, and monster raw HP is fixed per creature, so cross-district difficulty comes almost entirely from which monsters sit in the pool plus the Long reprises' `power`/`forceGilded`, not from a smooth ramp.

Correction to the audit: the earlier "Long clear 71.3 percent" was Quick mode. The sim reads the bare token `long`, not `--long`, so the flag was ignored. Measured correctly, Long clears at ~55 percent, already inside the target band. The difficulty problem is shape, not overall rate.

Baseline first-attempt win rate by district (800 seeds):

- Quick: D1 90.2, D2 87.5, D3 80.9, D4 55.6. Adjacent drops 3, 7, then a 25-point cliff. Deaths only at the Gate.
- Long: D1 90.2, D2 87.5, D3 80.9, D4 78.4, D5 80.2, D6 64.8, D7 41.5. Non-monotonic (D4 to D5 rises 2), with drops of 15 and 23 at the end.
- Gate elite spread: Quick azhdaha 51 vs auctioneer 61; Long azhdaha 25 vs auctioneer 61 (a 36-point choice imbalance). The Azhdaha `hasteMates:0.5` snowball (killing a head permanently speeds the survivors) is the roadmap's named Long outlier.

Roadmap acceptance targets: first-attempt generally falls by district; no adjacent drop over 15 points; Dragon Gate elite choices within 12 points; Long clear 55 to 70 percent.

## 2. The levers (why these, not others)

- `threat` is NOT a clean difficulty knob: raising it makes the player tankier while pulling the storm earlier. Rejected.
- A district-level `power` field multiplies monster HP and item stats and is fully plumbed to combat nodes (map.js:117 `n.power=D.power`, boss at 154). It is the clean, fine-grained lever for grading a district. Used for the Quick ramp and the Long bump.
- `hasteMates` on the Azhdaha heads is the snowball. Softening it raises Azhdaha's win rate and tightens the gate elite choice in both modes.
- `vizier.hp` is a small optional nudge to lift the final-boss first-attempt.

## 3. The reshape (exact changes)

All values are in `src/data.js`.

Core (essential):

1. Azhdaha snowball, `hasteMates` 0.5 to 0.3, on all three Azhdaha definitions:
   - base `azhdaha.board` heads (data.js ~595 to 597)
   - `azhdaha_v1` and `azhdaha_v2` aspect boards (data.js ~696, ~697)
2. Quick mid-district `power` (new fields on the base DISTRICTS):
   - `DISTRICTS[1]` The Souk (D2): add `power:1.12`
   - `DISTRICTS[2]` Palace Quarter (D3): add `power:1.18`
3. Long reprise `power` fix (correct the non-monotonic bump):
   - `LONG_DISTRICTS[4]` Souk After Midnight (id5): `power` 1.6 to 2.1
   - `LONG_DISTRICTS[5]` Palace After Midnight (id6): `power` 2.05 to 2.15

Optional polish:

4. `MONSTERS.vizier.hp` 700 to 660 (lifts Quick D4 first-attempt ~43 to ~47 and Long D7 boss).

## 4. Before and after (800-seed sim, both modes, invalid runs 0)

Quick first-attempt win rate:

| District | Baseline | Reshaped | Target |
|---|---|---|---|
| D1 | 90.2 | 91.1 | high |
| D2 | 87.5 | 82.2 | falling |
| D3 | 80.9 | 69.6 | falling |
| D4 (Gate) | 55.6 | 55.6 | lowest |
| Adjacent drops | 3 / 7 / 25 | 9 / 13 / 14 | all <= 15 |
| Clear | 72.6 | 70.6 | healthy |
| Gate elites | azh 51 / auc 61 | azh 63 / auc 65 | within 12 |
| Deaths appear | Gate only | D2 4.5, D3 24.8 | spread |

Long first-attempt win rate:

| District | Baseline | Reshaped |
|---|---|---|
| D1 | 90.2 | 90.2 |
| D2 | 87.5 | 87.5 |
| D3 | 80.9 | 80.9 |
| D4 | 78.4 | 78.4 |
| D5 | 80.2 (bump up) | 70.8 |
| D6 | 64.8 | 59.5 |
| D7 (Gate) | 41.5 | 50.3 |
| Adjacent drops | max 23 | max 11 |
| Clear | 54.6 | 56.1 |
| Gate elites | azh 25 / auc 61 | azh 51 / auc 64 |
| Deaths appear | D6 27 | D3 8, D5 12, D6 21 |

## 5. Acceptance-criteria check

- First-attempt falls monotonically by district: YES both modes (baseline Long had a D4 to D5 bump; fixed).
- No adjacent drop over 15: YES. Quick max 14, Long max 11 (baseline Long was 23).
- Gate elite choices within 12: Quick within 2 (was 10); Long within ~13, just over target and inside Monte Carlo noise at n~310. Lever to close it: Azhdaha `hasteMates` 0.3 to 0.25, or a small Auctioneer nerf.
- Long clear 55 to 70: YES (56.1).
- Deaths distributed instead of Gate-only: YES in both modes.
- Combat safety: invalid runs 0, no guard trips or timeouts at the higher power values.

## 6. Implementation plan and surfaces

- Data: the four core edits plus optional vizier, all in `src/data.js`.
- Parity ledger: add `azhdaha` (and optional `vizier`) to `REBALANCED_MONSTERS` in `tests/parity.test.js`. For azhdaha, supply the full replacement `board` with `hasteMates:0.3` (the ledger shallow-merges, so the whole board array is the override). `azhdaha_v1/v2` are post-original aspect content and need no ledger entry.
- Golden traces: the fixtures reference azhdaha and vizier, so regenerate the affected traces via `scripts/capture-traces.js`. This is an approved behavior change; record it. The district `power` edits do NOT touch any trace (traces are fixed-cfg fights, not route fights).
- Map: `tests/map.test.js:45` currently asserts Quick maps omit `power`. The reshape deliberately introduces graded Quick power, so update that test to assert Quick node/district power matches the DISTRICTS table, refresh the pinned Quick map ledger, and bump `MAP_VERSION` in `src/map.js`.
- Saves: the MAP_VERSION bump retires in-progress route runs (the known cost from audit #16). Bump `CACHE_V` in `public/sw.js`. This is acceptable for a deliberate balance patch; it is also the case that motivates audit #16 (a content-epoch so future adds stop doing this).
- Sim: none required; `route-sim.js` reads the tables and picks up all four levers directly.

## 7. Risks and what the sim cannot see

- The sim runs a competent fusion-first bot with no hero mods, no Omens, no enchants, aspects off, and no skilled routing or slip play. It is a pacing and shape proxy, not a skill ceiling. Treat these numbers as ordering and delta evidence, not absolute truth, and confirm on live telemetry (the roadmap's own standard).
- Heroes and treasure uniques are still unmeasured (audit #7). A reshape that is correct for the bot could be easier or harder for a specific hero. Run the hero-by-Omen matrix (audit #7) before finalizing the exact power values.
- Long D6 (Palace After Midnight) at `power:2.15` still carries 21 percent deaths. If live play finds it spiky, ease to 2.10.
- The one borderline is the Long gate elite spread (~13 vs a 12 target). It is within sim noise; the `hasteMates` 0.25 lever closes it if it persists live.

## 8. Options

- Minimal (three edits, hits nearly all targets): Azhdaha 0.3, Quick D2 1.12 / D3 1.18, Long D5 2.1. Leaves Long D6 slightly spiky and the final boss unchanged.
- Recommended (this doc): the four core edits plus vizier 660.

## 9. Live telemetry check (Cloud Ledger, 10 real runs)

Small and version-mixed (0.82 to 0.98), so anecdote not verdict, but it corroborates the design and adds one nuance.

- 10 runs, 5 clears, 50 percent. Losses ended at D1 (1), D3 (1), D6 (2), D7 (1).
- Both Long losses that were not at the Gate ended at D6 Palace Quarter After Midnight, with 3 boss retries and 5 of 7 bosses beaten. This matches the sim's Long death peak at D6 and confirms the reshape targets the right region (smooth D5 to D6, keep D6 a real check).
- The Dragon Gate is a real wall (a Long loss ended at D7 after 3 retries), but it is not the only one: a Quick run stalled at the D1 boss for 6 retries (kiln plus plague, 3.4 minutes, zero bosses beaten). A bad hero and Omen pairing walled a run at the first district, which a hero-blind sim cannot show.
- kiln (the Kilnkeeper) appears in 4 of the 5 losses and only 4 of 10 runs. Tiny sample, but it points the same way as audit item #7: the Kilnkeeper is the likely weak hero, and hero and Omen combos create spikes the sim misses.

Consequence: the reshape's shape is validated, but the exact `power` values must be confirmed against the hero-by-Omen matrix (audit #7) before ship, and the Kilnkeeper deserves its own look. Do not treat the sim's power values as final without that pass.

## 10. Sequencing

Ship as one difficulty-shape version (one player-facing system per version). Do it after or alongside the hero-by-Omen sim extension (audit #7) so the final `power` values are validated against real heroes, not just the bot. Pair the player-facing telegraph: the scout card already shows gilding and the affix; add the district `power` to the same face-up read so the rising difficulty is legible, not a surprise.
