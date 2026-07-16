# The Lantern

A post-clear difficulty ladder for Tavern Bash. Target version 0.89. Status: revision 2, incorporating the full Codex review of 2026-07-16. Levels 8 and 9 are new designs and need a targeted second look; everything else follows the review's rulings.

## Summary

The Lantern is a ten-level cumulative ladder per route. Clearing a route unlocks Lantern 1 for it; clearing at Lantern N unlocks N+1. Each level adds exactly one named rule and every lower rule stays active. Highest cleared is tracked per hero per route.

Design principles:

- Numeric pressure lives in levels 1 through 4. Levels 5 through 10 change what the player does: what the shop offers, what can be parked, which doors get walked, and how Resolve is budgeted.
- No combat engine changes. Every rule is expressed through existing surfaces: node ctx (power, gilded), anomaly-style A fields already read per side, route-layer constants, event constants, and UI-level toggles. Golden combat traces stay byte-identical at Lantern 0.
- The Dragon Gate contract (replaces the old wording, which was false as written): the Lantern adds no direct Dragon Gate combat or loss modifiers. Gate fights retain Lantern-0 power, gilding, storm timing, charge rules, integrity, and loss damage at every level. Global market economy and starting Resolve still affect what reaches the Gate. Quick Gate elites keep their seeded 12 percent gilding roll; Long Gate elites remain force-gilded exactly as at Lantern 0.
- Settled decisions are untouched: two health layers, targeting, fusion thresholds, reward gold 2/4/6 baseline, Slip Past pricing, boss retry seeds, Gate Camp Mend.

## Revision 2 changelog

- Restated the Gate contract and added the Gate identity suite (review blocking item 1).
- Replaced L8 (charged long fuses: post-exemption coverage was only Rust Ghul and Karkadann, the Mint Golem spike claim was false, and no player ware has a 9 second base cooldown) with Gilded Streets.
- Replaced L9 (blanket integrity: stat grind, no real kill-order decision, weapon-build skew) with The Locked Shelf.
- Adopted the Qareen ruling: the mirror receives runA only, never Lantern enemy fields, and is exempt from L1 power. Without this, the old L9 would have produced 140 percent integrity mirror wares since the 0.85 mirror scaling never scaled integrity.
- Restructured progression plumbing: lantern threading (lossDamage cannot see run.lantern), hero-before-route flow, route cards as containers, monotonic idempotent profile writes, three version bumps.
- Relabelled sim baselines by sample count and marked which levels the harness can actually verify.
- L2 rewritten as a shared delta constant; L4 starts at minus 2 seconds; L7 corrected (the gold district elite is Rust Ghul, not Ghul Matron).

## Prerequisite work item: the composition layer

This is the single riskiest piece and it is priced first. No Omen-plus-Lantern merge exists today; every market and fight call site reads one anomaly object (G.A), and `monsterSide` snapshots the whole A object into `side.rules`.

Build a `LANTERN` table in `src/data.js` (level to rule fields) and a `composeLantern(omenId, omenA, level)` helper in `src/anomaly-rules.js`. Anomaly identity is passed explicitly (per the review ruling: Silent Bazaar must not be inferred from incidental fields). It produces two objects:

- `runA`: the Omen A plus Lantern market and storm deltas. Used everywhere G.A is used today for market math and storm timing.
- `enemyA`: `runA` plus any enemy-only fight fields. Handed only to the encounter builder. The player side rules keep `runA` with no enemy fields. After the L8/L9 replacement, no current level populates enemy-only fields; the seam stays because scout parity and future ladder work need it.

One pure shared encounter builder constructs the monster side for scouting, real fights, and the simulator, applying `enemyA`, the node's gilding, and the Lantern power multiplier in one place. Scout output renders from the constructed side: its regen, its display integrity, and any special state, so every Lantern effect is face-up at the door.

Per-field composition rules, each unit-tested against all 12 Omens:

| Field | Composition |
|---|---|
| `stormStartOffsetMs` | Sum of Omen and Lantern offsets carried on `runA`; the existing `adjustedStormAt` 6000 ms floor applies unchanged. No second floor. Gate fights are handed the Lantern-0 offset per the Gate contract. |
| `shopN` | Effective = max(3, (omen shopN or 4) + Lantern flat delta). Delta after Omen, never an override. |
| `directEventGoldFlat` | Lantern delta applied to direct-gold event options at grant and render time (L2). |
| `freezeDisabled` | UI boolean; forced false when the Omen id is Silent Bazaar. |
| lossChip flat, startResolve, power multiplier, door gilding, vault slots | Route-layer constants and node ctx keyed off the threaded lantern value; not A fields at all. |

Identity requirement: at Lantern 0, `composeLantern(omenId, omenA, 0)` returns objects deep-equal to the plain Omen A, with zero added keys and zero materialized defaults. Pinned by object-comparison test alongside the golden combat traces.

Threading requirement: `run.lantern` stays canonical, and a derived lantern value is threaded to the places that cannot see the run: `genMap(seed, mode, lantern)` stamps it on the map, and route-layer functions such as `lossDamage` receive it through the map or an explicit controller argument. `lossDamage(node, survTier, map)` has no access to `run.lantern` today; this threading is part of the build, not an afterthought.

Qareen mirror ruling (from review): the mirror is built from the player's own board with `runA` semantics only. It is exempt from the L1 power multiplier and receives no Lantern enemy-only field, ever. Stated on the rule cards, verified by test.

## The ladder

### Lantern 1: Trimmed Wick

- Rule: "Every monster and elite door burns brighter, fighting at 10 percent greater strength. Bosses and the Dragon Gate hold their old fire."
- Mechanical hook: in the shared encounter builder, effective power = (node.power or 1) times 1.10 for nodes of type monster or elite, in districts 1 through 3 and all After Midnight reprise districts (their composed powers multiply; at 10 percent this is accepted and sim-checked). Bosses excluded. Both Gate districts excluded entirely. Qareen exempt per the mirror ruling.
- Decision changed: entry-level numeric pressure by design. Back Alleys doors stop being free; early Resolve chip appears at all.
- Omen interactions: Blood Moon and Fortified multiply into the same product; accepted at 1.10, watched in the matrix.
- Sim: verifiable (node.power flows through route-sim; add cfg.lantern). ANONE-only caveat until the Lantern-aware matrix exists.

### Lantern 2: Thin Oil

- Rule: "Plain coin runs thin: bargains that pay out gold on the spot pay 2 less."
- Mechanical hook: one shared constant, `directEventGoldFlat: -2`, applied wherever an event option grants direct gold, at grant time and at card-render time from the same value. No absolute values and no option names in the rule, so it survives the 0.91+ Merchant and Treasure rewrites unchanged.
- Decision changed: attacks the measured autopilot directly (Treasure Gold picked 18 of 28). The ware and enchant picks start winning the comparison.
- Omen interactions: none touch event gold. Clean across all 12.
- Sim: economy-proxy verifiable only. cfg.treasureCash and cfg.negoCash exist, but the harness policy always takes cash and cannot pivot to a ware when cash weakens, so the sim overstates this level's difficulty (the always-cash 6-to-4 probe read minus 13.5 Quick and minus 17.3 Long at 1200 seeds). Judge L2 by economy shape, not by the stairstep gate.

### Lantern 3: The Toll Lantern

- Rule: "Every lost fight in the districts costs 2 more Resolve. The Dragon Gate exacts only its usual toll."
- Mechanical hook: the flat 2 lands where `lossDamage` resolves the district chip, keyed off the lantern value threaded through the map, and only when the node's district is not a Gate district (sourceId 4 or Quick district 4). Gate loss damage is Lantern-0 at every level per the Gate contract.
- Decision changed: retry math. Throwing a body at a scouted gilded elite twice stops being cheap; Mend and From the Ashes stop being skippable.
- Omen interactions: no Omen touches lossChip. Clean.
- Sim: verifiable. Revalidate after Codex's stateful Rest and lasting Shrine land, since both move the same Resolve economy.

### Lantern 4: Oil on the Wind

- Rule: "The simoom rises 2 seconds earlier in every fight outside the Dragon Gate."
- Mechanical hook: Lantern `stormStartOffsetMs: -2000` summed with the Omen offset on `runA`; the existing 6000 ms floor applies at the existing call site. Per-monster stormAt overrides (Sandling) take the same summed offset and floor. Gate fights receive the Lantern-0 offset. Minus 2000 is the shipped value; any deeper cut must first pass a targeted Fortified outcome sweep (review ruling: no Fortified exception, tune globally).
- Decision changed: slow-hammer boards lose an activation; the player values sub-5 second wares and Swift enchants.
- Omen interactions: Fortified sums to minus 7000; measured in the sweep, not patched with a second floor.
- Sim: verifiable after the mandatory wiring fix (route-sim passes raw stormAt today and must route it through the composed helper, with a test asserting the storm time actually moves at L4).

### Lantern 5: Shadow Souk

- Rule: "Every market shows one fewer ware."
- Mechanical hook: Lantern shopN delta of minus 1 composed after the Omen with a floor of 3 (base 4 to 3; Overstocked and Silent Bazaar 6 to 5), applied where ui.js reads the effective shopN. The Omen reveal card and drawer render the effective composed value (review ruling: the headline text must not lie; a footnote is insufficient).
- Decision changed: the commonest-fusion breaker. A 3-ware shop cannot reliably feed one line; the player pivots to what is offered and pulls Vault copies through fuseWithVault.
- Omen interactions: Overstocked and Silent Bazaar show 5; composed rendering covers both. Overstocked plus L5 plus L6 gets a dedicated acceptance row.
- Sim: sim-blind, honestly. Ship the conservative minus 1, verify with live shop telemetry, revisit after 30 instrumented Lantern reports.

### Lantern 6: No Frost Tonight

- Rule: "The market frost fails: wares left on the shelf are lost to the next roll. Under a Silent Bazaar Omen the frost holds."
- Mechanical hook: `freezeDisabled: true` on the Lantern config, forced off when the Omen id is Silent Bazaar. UI-level: the Freeze button renders greyed with `aria-disabled` and a tap still explains "the frost fails tonight" (a disabled button that eats the tap silently is not acceptable on a phone); the G.frozen carry is skipped.
- Decision changed: the third triple piece can no longer be parked in the shop. Buy-now-or-lose-it pressure lands on every roll.
- Omen interactions: Silent Bazaar exempt, the game's one justified per-Omen exception (review ruling 10: within tolerance; redesign only if a third exception ever appears).
- Sim: sim-blind. Browser checks (button state, tap explanation, no frozen carry, Silent Bazaar exemption) plus live report fusion rates.

### Lantern 7: Gilded Teeth

- Rule: "Every elite in the districts stands gilded. The Dragon Gate keeps its own counsel."
- Mechanical hook: in map.js mk(), elite nodes take gilded = true at Lantern 7+, with the chance(rng, 0.12) draw still consumed so the rng stream and map structure stay identical across levels for one seed. Both Gate districts excluded: Quick Gate elites keep the seeded 12 percent roll, Long Gate elites remain force-gilded, both exactly as at Lantern 0. genMap gains the lantern argument.
- Decision changed: elite doors become a scoutable gamble instead of a default pickup, timed after a market.
- Omen interactions: no Omen touches gilding. Bounty note, corrected: the only district elite carrying bounty gold is Rust Ghul (2 gold, doubled to 4 when gilded); accepted as the risk-reward hook and stated.
- Sim: verifiable for outcomes (per-district first-attempt deltas, elite win rates); pick-rate metrics are not gates. Includes the gold check: L7 must not raise net gold per run more than a few percent.

### Lantern 8: Gilded Streets (new in revision 2)

- Rule: "Gold runs through every alley: nearly half the monster doors stand gilded."
- Mechanical hook: in map.js mk(), the monster-door gilding chance rises from 0.12 to 0.45 at Lantern 8+ (same single rng draw consumed, so the stream and map structure stay identical across levels for one seed; only the boolean threshold moves). Elites are already forced by L7. Both Gate districts excluded as always. 0.45 is a draft number for the cumulative sim.
- Decision changed: routing under pressure. Gilding is face-up on the scout panel, so every lane choice weighs a tougher board and a doubled gold bounty against the safe door; the player charts the district around which gilded fights their board answers, and the doubled bounties turn strong boards into deliberate gold farming, a real risk-reward loop rather than a flat wall.
- Omen interactions: no Omen touches gilding. Blood Moon stacks its dmgMul onto gilded doors; watched in the matrix.
- Gold check: gilding doubles bounty gold, and the D1 pool carries real gold (Lamp Imp 3, Pilfer Monkey 8). The sim gates that L8 does not raise net gold per run more than a few percent; if it breaches, the draft chance drops before the doubling rule is ever touched.
- Sim: verifiable today. node.gilded flows into the fight ctx; read clear-rate delta, per-district first-attempt rates, and the net-gold gate.

### Lantern 9: The Locked Shelf (new in revision 2)

- Rule: "The Vault's third shelf is locked for the night: it holds two wares, not three."
- Mechanical hook: vault capacity is hoisted from the three hard-coded `3` literals in ui.js into one `vaultSlots()` helper that reads the run's lantern level; at L9+ it returns 2. The third cell renders as a locked shelf (dark plaque, not hidden), so the capacity loss is visible rather than mysterious. Route-layer and UI only; saves are safe because lantern is fixed at run start, so an L9 run can never hold three vaulted wares.
- Decision changed: capacity triage. With No Frost active, the Vault is the only holding pen, and at two slots the player can no longer simultaneously park a triple piece, stage a second fusion line, and hold a situational unique; something real gets sold. This is the offer-management rule the review asked for in place of the integrity grind.
- Omen interactions: no Omen touches the Vault. Clean across all 12.
- Sim: sim-blind (the harness does not model the Vault). Browser checks (locked cell render, swap and sell flows at capacity 2, fuseWithVault pulling from two slots) plus live telemetry on vault occupancy and fusion rates.

### Lantern 10: The Last Drop of Oil

- Rule: "You begin the night with the last of the oil: 34 Resolve on Quick Night, 50 on The Long Bazaar."
- Mechanical hook: initRoute startResolve keyed off lantern. Draft numbers, tuned last, per route (review ruling: competent-baseline targets Quick 35 to 40 percent, Long 25 to 35 percent), and only after stateful Rest, lasting Shrine, and the full cumulative stack are represented in the numbers.
- Decision changed: with the Toll active this is a closed economy: Resolve is a fixed budget of allowed losses, so routing minimizes total combat exposure and boss retries are rationed like gold. Gate Camp Mend is explicitly untouched.
- Omen interactions: none touch Resolve totals.
- Sim: fully verifiable today (cfg.startResolve exists).

## Rules considered and rejected

Recorded so they are not re-pitched without new evidence.

- Charged long fuses (revision 1's L8): post-exemption coverage was two monsters, the Mint Golem spike claim was false, and no player ware has a 9 second base cooldown, so the mirror clause was vacuous. Replaced by Gilded Streets.
- Blanket enemy integrity times 1.4 (revision 1's L9): stat grind with no genuine kill-order decision (targeting is automatic), severe weapon-build skew while poison and burn bypass integrity, and a 140 percent integrity mirror through the unscaled Qareen path. Replaced by The Locked Shelf.
- Ware cost +1 and reroll cost 2: strengthened the committed-line autopilot; Overstocked became strictly free. Dropped.
- Extra monster door per district: crashes as specced (Palace Quarter's three normals are fully consumed by column 1). Deferred pending a declared pool change.
- Boss and Gate power staircases: stat pressure on the exact cliff the roadmap wants flattened. Dropped.
- Slip Past repricing: settled by name in the R7 handoff. Dropped without Robbie's explicit sign-off.
- Rest Mend removal: pushes Temper past the 0.95 diversity ceiling; the Gate Camp valve made the claim false. Dropped.
- Buried Spoils (Treasure offers 2 of 3): revisit only after the 0.91+ Treasure retuning and telemetry.
- Veiled Lanes (adjacency-only scouting): rejected unless the face-up scouting principle is explicitly reversed by Robbie.

## Run setup flow and progression plumbing

The current flow chooses route before hero, and the stepper depends on the selected hero, so the setup flow restructures (review blocking item 3):

1. Select hero without constructing a run.
2. Select route and Lantern level for that hero (route cards become containers, not buttons, holding separate accessible controls: the stepper arrows and the lamp glyph each get their own focusable element).
3. Construct the run and map with genMap(seed, mode, lantern).
4. Apply the hero's starting ware.
5. Reveal the Omen.

Save and profile shape:

- Run field: `run.lantern`, integer 0 to 10, stored beside seed and mode. Resume regenerates the map with the stored lantern or the layout silently reverts to Lantern 0.
- Profile: localStorage key `bb-lantern`, `{quick:{heroId:N}, long:{heroId:N}}`. Monotonic and idempotent: a missing hero-route entry reads as highest cleared minus 1 selectable at 0; clearing N writes max(previous, N); maximum selectable is min(10, highestCleared + 1); the write retries whenever a won run resumes to its ending; a failed persistence never clears the active run.
- Version bumps, all three: MAP_VERSION (lantern is a genMap input), ROUTE_SAVE_VERSION (new run field), and the route-run SCHEMA_VERSION, each with clean rejection of pre-bump mid-run saves.
- Run record: the lantern level joins the immutable run record, metricEvent, and Copy Run Report ("Lantern N"); archived pre-0.89 reports default to Lantern 0.

## Title screen picker UI

Landscape 844x390 first. One extra control cluster on each route card, no more:

- A small brass lantern stepper: lamp glyph plus numeral, stepping 0 to the selected hero's highest unlocked level for that route, defaulting to that maximum.
- Tapping the lamp glyph opens a rules plaque overlay in the Omen-reveal card style: one named line per level, active rules lit, locked rules dark, scrollable, painted gold frame.
- In-run, the ribbon's Omen drawer lists active Lantern rules under the Omen. At L6+ the Freeze button is greyed with aria-disabled and a tap explanation. At L5+ the Omen card and drawer render composed effective values.
- End screens name the level ("cleared at Lantern 7"). Portrait keeps the stepper below the route name; nothing may push the route cards off the 390x844 viewport.

## Unlock flow

- Clearing a route plain (Lantern 0) lights Lantern 1 for that route for that hero.
- Clearing at Lantern N with hero H on route R unlocks N+1 for H on R. Per hero per route, no skips, no global unlock.
- Any level at or below the unlocked maximum is freely selectable. Losing or abandoning unlocks nothing and costs nothing.
- The Daily Market, when it ships, pins Lantern 0 and is identical for everyone regardless of personal progression.

## Test plan

Composition and identity (build first, everything else depends on it):

- Lantern-0 identity: composeLantern deep-equals the plain Omen object for all 12 Omens, zero added keys. Golden combat traces byte-identical at Lantern 0. genMap(seed, mode, 0) reproduces the existing 0.88.0 Quick hash ledger exactly; the identity comparison already ignores the version stamp (the ledger test deletes map.version before hashing), so a MAP_VERSION bump alone must not regenerate hashes.
- Per-field composition tests across all 12 Omens: shopN floor at 3 under Overstocked and Silent Bazaar; storm offsets sum with the single 6000 floor (Fortified plus L4, Sandling case included); freeze exemption keyed on Omen id, not inferred fields.
- Gate identity suite, new: across L0 through L10 at a fixed seed, both routes, the Gate district's fight sides are byte-identical (power, gilding, storm timing, charge rules, integrity) and Gate lossDamage is unchanged. Quick Gate retains seeded 12 percent gilding; Long Gate remains force-gilded.
- Mirror fixture: Qareen built from runA at every level, exempt from L1 power, carrying no Lantern enemy field.
- Scout parity: the shared encounter builder gives scouting, fights, and the sim the same constructed side at every level, and the scout panel renders the constructed side's regen and display integrity.
- Map determinism: identical rng draw counts across all lantern levels for one seed; L7 and L8 flip booleans only.

route-sim (after the two wiring fixes: route stormAt through the composed helper, and drive gilding and power from the shared encounter builder):

- Ten cumulative configs L1 through L10, both routes, 1200 seeds each, tuned as one ladder. The stairstep gate (no level more than about 12 points below its predecessor) applies only to the sim-visible levels: L1, L3, L4, L7, L8, L10. L2 is judged as an economy proxy (the always-cash policy overstates it); L5, L6, and L9 are sim-blind and gated by browser checks plus live telemetry after 30 instrumented Lantern reports.
- Wiring assertions: storm time measurably moves at L4; gilded-door share moves at L8; neither L7 nor L8 raises net gold per run more than a few percent.
- A targeted Fortified outcome sweep before any storm value deeper than minus 2000 ships.
- A 12-Omen sweep at fixed lantern levels plus targeted hero-sensitive fixtures ships with 0.89; the full Lantern-aware hero and Omen matrix is required before L5 through L9 numbers are called tuned.
- Baselines, labelled by sample count: 600 seeds, Quick 82.5 and Long 73.7; 1200 seeds, Quick 82.9 and Long 71.6. Report both bands in future readouts.

Save and layout:

- Migration: pre-bump mid-run save rejects cleanly; resume regenerates the identical map from (seed, mode, lantern); bb-lantern writes are monotonic, idempotent, and retried on won-run resume.
- Layout at 844x390 and 390x844: hero-first flow, route card containers with accessible controls, plaque overlay scrolls internally, locked third vault cell, greyed Freeze with tap explanation, Omen drawer with Lantern lines and composed values, nothing pushed off screen.

## Remaining questions for Codex (targeted second look)

1. L8 Gilded Streets: is 0.45 the right draft chance, and is the net-gold gate (a few percent) the right guard for the Imp and Monkey doubled bounties, or should the gold doubling be capped at L8+ instead?
2. L9 The Locked Shelf: two slots, or one? Two preserves fuseWithVault staging; one turns the Vault into a single-ware lifeboat and may be the better L9-to-L10 cliff. The review asked for capacity pressure; how sharp?
3. With enemy-only A fields now unused by any shipped level, should enemyA still ship in 0.89 (a tested seam waiting for content) or be deferred to the version that first needs it? Scout parity argues for shipping the builder either way.
