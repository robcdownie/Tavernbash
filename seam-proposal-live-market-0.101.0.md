# Seam proposal: pure live market simulation (0.101.0 diagnostic, read-only)

Date: 2026-07-18. From: the difficulty worker. To: Claude (integrator) and Codex. Status: PROPOSAL ONLY. No file named below has been edited. Written dash-free.

Purpose: close the verifier evidence gap Codex named in the WAIT ruling on b094ae1. The starter matrix and fresh-profile cohorts claim live shop and Omen behavior while `node scripts/route-sim.js coverage` reports, verbatim: `BLIND goldMul victory income (bull)`, `BLIND shop mechanics Omens (overstock, silent, auctionbell, patient, lean, charter)`, `PROXY fusion economy and shopping (invested-budget board policy, no shop rolls, no reroll or freeze decisions)`, and `PROXY hero shop pull (arch concentration 3.5 on the hero tag; real weights are 1.5 hero / 2.2 featured on actual rolls)`. Until those rows read FULL, the kiln plus bull 35 percent floor result stays unaccepted and Vizier 660 stays unauthorized.

## 1. The finding that makes this small: the rules are already pure, only the caller is not

The audit of the live market path shows almost every rule Codex requires is ALREADY a pure exported function consumed by ui.js:

| Requirement | Live rule | Where it lives today | Pure? |
|---|---|---|---|
| Bull Market purchase surcharge, ench premium | `warePurchaseCost(size, enchanted, A)` | `src/anomaly-rules.js:39` | YES |
| Bull Market victory income (`goldMul`) | `adjustedVictoryIncome(base, A)` applied at `ui.js:966` as `adjustedVictoryIncome(boardVictoryIncome(board)+relicIncome+charmVictoryIncome(charms), A)` | `src/anomaly-rules.js:52`, `src/route-charms.js:63` | YES (the ui.js line is one pure expression) |
| Overstocked and Deep shop count | `A.shopN` read in `rollShop` | `src/data.js` ANOMALIES | YES (data) |
| Reroll price, Silent disable, Auction Bell per-sale escalation | `rerollPrice(A, sales)` | `src/anomaly-rules.js:45` | YES |
| Freeze duration, Patient multi-roll holds, thaw | `advanceFrozenOffers` / `setFrozenOffers` / `thawOffers` | `src/anomaly-rules.js:55,63,66` | YES |
| Narrow slots and slot cost | `boardSlotCount` / `boardUsedCells` / `wareSlotCost` | `src/anomaly-rules.js:29,33,36` | YES |
| Sale value (Lean, Auction Bell) | `wareSaleValue(size, A)` | `src/anomaly-rules.js:42` | YES |
| Hero and featured tag weights (1.5 / 2.2) | `shopTagWeight(cat, featuredTags, heroTag)` | `src/data.js` | YES |
| Moneylender credit and debt reroll ban | `canSpendGold` / `heroCreditLimit` | `src/data.js` | YES |
| Unlocked ware filtering | `runWareAllowed(storage, run, id)` | `src/unlock-profile.js:307` | YES (storage-injected) |
| Fusion | `fuseScan` / `fuseNeed` / `makeItem` | `src/engine.js` | YES |
| Exact shop RNG stream | `mulberry(fightSeed(seed, nodeId, rollIndex))`, re-seeded per reroll at `ui.js:643` | `src/route.js:34`, `src/engine.js` | YES |
| Molasses and Wildfire combat rules | the Omen A object on both fight sides | already FULL in route-sim | YES |
| Multi-run unlock, feat, Lantern state | `settleUnlocks` / `recordLanternClear` with injected storage | already proven by the 0.101.0 verifier fresh-profile cohort | YES |

Exactly TWO pieces of live market logic are trapped inside ui.js with DOM, toast, sound, and metric entanglement:

1. **The offer-selection core**: `rollShop()` at `src/ui.js:646` to 688. Candidate pool (`gateOK` tier gate, `!unique`, `sig` hero gate, route `!inc` exclusion, `runWareAllowed`), per-slot weights (tier base 8/7/6, times `shopTagWeight`, times 1.6 when the board holds 1 or 2 bronze copies of the id), the weighted draw loop and its exact rng draw order, the enchant roll (only at `runThreat()>=4`, `ENCH_CHANCE`, eligible-ench filter by `need`, uniform pick), and the freeze and free-card carryover assembly against `A.shopN`.
2. **The vault-pull fusion core**: `fuseWithVault()` at `src/ui.js:537` to 565. Pull vault copies through to complete a forge, run `fuseScan`, spill overflow back to the vault, repeat to fixpoint.

Everything else the ruling requires is composition.

## 2. The seam: extract src/market-core.js, wrap it in ui.js, drive it from a new market walker

### 2a. New pure module `src/market-core.js` (extraction, not reimplementation)

Two functions, moved from ui.js verbatim with their globals turned into parameters:

- `rollShopOffers(ctx, rng)` where `ctx = {items, tier, heroId, heroTag, featuredTags, board, run, storage, A, threat, priorOffers, frozen, routeMode}`. Returns `{offers, frozenActive}`: the exact offer list `rollShop` builds today (ids, ench, free and frozen carryover), drawing from the passed `rng` in the exact current order (one weighted draw per slot, then at most two ench draws). ui.js `rollShop()` becomes a thin wrapper: build ctx from `G` and `store()`, call the core, stamp `offerId` via `allocId`, keep its `metricEvent('shop_roll', ...)` and `G` writes. ONE implementation; the wrapper adds identity and telemetry only.
- `pullVaultForges(board, vault, slots, onForge)` returning `{forged}` and mutating board and vault exactly as `fuseWithVault` does today (pull to complete, `fuseScan`, overflow spill, fixpoint). ui.js keeps toasts, sfx, and stings in its wrapper via `onForge`.

Both moves are mechanical. The candidate pool clause and the weight ladder are copied bytes; the existing `tests/unlock-shop.test.js` fixed-seed offer-sequence pins and the layout tests then prove the wrapper is behavior-identical (any drift breaks a pinned sequence).

### 2b. New pure driver `scripts/market-sim.js` (the deterministic player policy)

A DOM-free market walker that replaces the invested-budget `buildBoard` abstraction wherever live evidence is required:

- Per market node: seed `mulberry(fightSeed(runSeed, nodeId, rollIndex))` exactly as `ui.js:643` does, call `rollShopOffers`, then run a deterministic policy over real actions: buy (`warePurchaseCost`, `canSpendGold` for Moneylender credit, slot room via `boardSlotCount` and `wareSlotCost`), fuse (`fuseScan` plus `pullVaultForges`), sell (`wareSaleValue`), reroll (`rerollPrice` with the per-sale escalation, `rerollDisabled`, debt ban, rollIndex increment re-seeding the stream), freeze (`setFrozenOffers` and `advanceFrozenOffers` under `freezeDurationRounds`), tier up (`TIERCOST`).
- The policy is versioned, pure, and seeded: greedy toward triples with a hero-tag preference, freezing a held pair when the third copy is affordable next market, rerolling when expected triple completion beats the reroll price. Policy constants live in one exported object so Codex can review the policy as data.
- Victory income: after each won fight the walker applies `adjustedVictoryIncome(boardVictoryIncome(board)+relicIncome+charmVictoryIncome(charms), A)`, the exact `ui.js:966` expression, making Bull Market victory income LIVE evidence (income wares stay out of route shops per the `rollShop` route exclusion, so the scaled base is relic and charm income, exactly as the game).
- Multi-run: takes the injected unlock storage so run 2 pools grow through `runWareAllowed` from run 1 feats, as the verifier fresh-profile cohort already does.

`scripts/route-sim.js` gains one knob (`market:'live'`) that routes its market and gateCamp phases through the walker instead of `buildBoard`, and its coverage manifest flips the four named rows: shopping and fusion FULL, hero shop pull FULL (real 1.5 and 2.2 weights on real rolls), Bull victory income FULL, shop mechanics Omens FULL for overstock, patient, lean, silent, and auctionbell reroll escalation (charter stays a pool-shaping data row). The abstract path remains the default so every existing baseline stays reproducible.

### 2c. Verifier integration

`scripts/launch-l2-verify.mjs` runs its starter matrix and fresh-profile cohorts under `market:'live'`, which makes the section 4.3 and 4.4 evidence claims true, and re-runs the kiln plus bull cell on live shops before any floor verdict is re-argued.

## 3. Exact minimal file additions requested for the reservation

Not in the set today, needed for implementation:

1. `src/market-core.js` (NEW: the two extracted cores)
2. `src/ui.js` (MODIFIED: `rollShop` and `fuseWithVault` become thin wrappers around the cores; no other ui.js surface)
3. `scripts/market-sim.js` (NEW: the deterministic market walker and policy)
4. `tests/market-core.test.js` (NEW: fixed-seed offer sequences, weight ladder, ench eligibility, freeze carryover, vault-pull fixpoint)
5. `tests/market-sim.test.js` (NEW: policy determinism, Omen matrix behavior on live shops, multi-run pool growth)
6. `tests/unlock-shop.test.js` (MODIFIED only if its internal helpers are refactored to call the core; its pinned expectations must NOT change)

Already in the ratified set and sufficient for their part: `scripts/route-sim.js`, `tests/route-sim.test.js`, `scripts/launch-l2-verify.mjs`, `tests/launch-l2-verify.test.js`.

Explicitly NOT requested: `src/engine.js`, `src/data.js` (no constant changes), `src/anomaly-rules.js`, `src/unlock-profile.js`, `src/route*.js` (all consumed as-is; that is the point of the seam).

## 4. Risks and mitigations

- The ui.js extraction is the only risky move. Mitigation: mechanical move with parameters replacing globals, the wrapper keeps every side effect, and the existing fixed-seed shop pins in `tests/unlock-shop.test.js` plus the Playwright market checks stand guard. The 0.68.0 lesson applies: verify on a fresh server and a production build.
- rng draw-order fidelity is contractual: the core must draw exactly as today (per-slot weighted draw, then ench chance, then ench pick), or resumed-market replays diverge. The test file pins the draw sequence via `rngTap`-style counting on fixed seeds.
- The policy is a model of a player, not a player. Its constants are data for review, its results ride the same coverage-manifest honesty rule, and live Cloud Ledger runs remain the reality check.
- `boardVictoryIncome` is a small ui.js helper; if it is not already pure it moves into market-core with the same treatment.

## 5. Sequencing after approval

1. Claude expands the canonical reservation with the six files above.
2. Extract cores, wrap ui.js, pin behavior identity (fixed-seed offer sequences unchanged).
3. Build the walker and policy, flip the coverage rows honestly.
4. Re-run the 0.101.0 verifier with live-market cohorts, paired baseline and candidate, and re-present the kiln plus bull floor and the D6 to D7 descent evidence for the Vizier 660 ruling.
