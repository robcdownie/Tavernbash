# Codex adversary review and road to 1.0

Date: 2026-07-18

Evidence base: `08ce9cf..2b57a82`, build 0.99.0, the named design documents, the Cloud Ledger, `route-sim`, `variant-verify`, the merged hero and Omen simulator work, the combat goldens, and the live source. The review checkout passes 494 of 494 tests. This is a ruling and sequencing document. It does not authorize a difficulty implementation outside the difficulty worker's reserved version.

## Adversary review

### Verdict

The commercial diagnosis is useful, but the audit is not safe to execute as ranked. Its Mixed launch verdict remains credible because onboarding, mobile verification, economy repetition, and Gate concentration are real. Several numerical claims and proposed remedies are wrong, however, and the process failures are causes of unreliable work rather than low-priority cleanup.

The correct response is to preserve the audit's urgency while replacing its flat priority list with a dependency sequence:

1. Stabilize ownership, canonical state, commits, and active-run compatibility.
2. Repair the validation matrix and the known Aspect edges.
3. Let the difficulty worker reshape Resolve attrition.
4. Build and measure the two economy levers.
5. Resume the surviving choice-equity chain.
6. Teach and package the stabilized game.

No more catalog expansion belongs before 1.0, apart from the already promised deterministic Daily Market. The seven-version retention sprint, including its three-version build-identity tail, is validation debt now, not a reason to roll content back.

### What the audit and adversary review got right

* Difficulty is concentrated too late. The route needs a rising attrition curve, not three nearly free districts and one isolated test.
* The market has brute-force reroll behavior and no meaningful voluntary gold sink.
* The Tutorial route is ordinary play, and the surviving coach presentation has no active flow.
* `MAP_VERSION` is coupled to the live ware pool. `src/map.js:19` declares version 12, Treasure candidates are derived from `ITEMS` at `src/map.js:79-84`, and `src/route-save.js:121-125` retires older map versions.
* All three base Azhdaha heads and both Aspect boards carry `hasteMates:0.5`. Progress can therefore make the remaining heads faster.
* `pickTarget` excludes flying wares and prioritizes the first living bulwark at `src/engine.js:183-193`.
* The content sprint skipped the required second review and displaced the reserved choice-equity lane.
* Audit item 23 should be rejected. A mid-fight input would turn autonomous combat into an input-driven system, expand replay state, and violate the settled planning-game identity even if an explicit input log kept replay deterministic.

### Corrections that change the plan

| Audit claim | Current evidence | Ruling |
|---|---|---|
| Long clears at 71.3 percent and is above target. | `node scripts/route-sim.js long 600` clears at 56.0 percent. The parser recognizes the literal `long`; `--long` silently runs Quick. Quick clears at 71.3 percent. | Long is already inside the 55 to 70 percent overall band. Reshape where Resolve is spent without lowering the route wholesale. |
| D2 and D3 loss should be 65 to 80 percent. | That contradicts the same item's 55 to 70 percent Long clear target. A failed fight spends Resolve and permits a retry; it is not a run death. | Use cohort expected Resolve at district entry as the primary specification. Keep first-attempt win as a diagnostic. |
| Diamond is globally reached 0.0 to 0.3 percent. | Current simulation reports Quick 0.3 percent and Long 78.5 percent. Cloud Ledger final boards show Diamond in 1 of 4 Quick and 3 of 6 Long reports, although only one Long report records an actual Diamond fusion. | Diamond has route and reward-path problems, not global absence. Preserve it and create a deliberate priced route. |
| Diamond needs seven Bronze copies. | `fuseNeed` is 3, then 2, then 2. Diamond requires twelve Bronze equivalents. | Item 19's cut option is both factually and operationally mispriced. |
| One bulwark walls all weapon damage. | Medium weapons already carry 50 percent overflow and large weapons 100 percent at `src/engine.js:766-773`. Bronze Brass Buckler is a data outlier at about 31 Integrity. | Do not infer an engine defect from one high-integrity ware. Test data pressure first. |
| An all-flying board hard-locks weapons. | With no grounded target, `pickTarget` returns `-1`; weapon damage then hits the merchant directly. | Flying immunity already has a severe pressure valve. Audit item 30 rests on a false premise. |
| Tier A item 7 still requires rescuing `sim-hero-omen`. | Merge commit `55313c4` has `cb94e4b` as its second parent. The stale branch and worktree are already gone. | Rescue is complete. Validate and extend the merged harness; do not schedule branch archaeology. |
| Route simulation can approve the economy levers. | Its own coverage report marks real shop offers, rerolls, freeze, selling, and several economy Omens as proxy or blind. | Use scoped live-market replay and Cloud Ledger reporting for economy acceptance. Route simulation remains a route and combat check. |

The most consequential audit error is ranking process work at 16 to 18 and architecture work at 71 to 100. A reserved lane was overwritten, a simulator branch almost became invisible, and a feature commit landed during an audit. `scripts/ship.js` still stages with `git add -A` while `.claude/settings.local.json` is untracked. These are direct threats to every later result. Process work therefore moves ahead of product tuning.

## Ruling A: Reconciliation

### Priority ruling

The three roadmaps become one dependency chain, not three interleaved queues.

The retention deep-dive won the last sprint and is now substantially shipped. It gets no automatic claim on the next slot. The audit contributes launch gates, but its ordering is overruled where prerequisites are buried. The original choice-equity chain resumes after process, compatibility, Aspect, and difficulty foundations, with Merchant bargains first and scoped diagnostics immediately after.

The tutorial remains launch-gating but moves behind rule stabilization. Teaching the old economy and old event options before changing both would create known rework. Mobile blockers, rules copy, offline install, and native packaging remain mandatory before 1.0.

### Original choice-equity chain

| Original item | Status | Final disposition |
|---|---|---|
| Reward-aware diagnostics | Survives, narrowed | Moves behind Merchant bargains as a patch release. The merged hero and Omen harness means a broad diagnostics platform is no longer justified. Add only Resolve, market, Merchant, fusion, Treasure, and signature evidence that cannot already be derived. |
| Persona Merchant bargains | Survives | Becomes the first new player-facing choice system after the difficulty version. It also carries the real voluntary gold sink through persona-specific commissions. |
| Treasure parity and targeted enchantments | Survives | Follows Merchant measurement. The `uniques=hold` simulation gives this stronger evidence than it had on 2026-07-16. |
| Bounded Qareen and corrected previews | Standalone version dies | The shared encounter builder, Aspect-aware scouting, and mirror tests have absorbed most of the need. Keep Qareen as a required validation row and retune only if it is an outlier. |
| Stateful Rest | Survives | Ships after Treasure. Choices must react to board, Resolve, and route state. |
| Lasting Shrine | Survives | Ships after Rest. Its options must answer different build needs rather than preserve Trial by Flame as an automatic pick. |
| Map comparison UI | Standalone version dies | Fold the compact decision aid into the mobile clarity pass. Do not create a separate map-interface system before launch. |
| First-act bounty packages | Dies before 1.0 | More content is not the current bottleneck. Reconsider from post-launch behavior only. |
| Event cadence | Complete | Shipped in 0.88.0. No new slot. |

### Audit ranking disagreements

* Items 16, 17, and 18 move to the front. Save durability, canonical state, and writer isolation are release prerequisites.
* Item 2 remains the first balance priority, after its measurement and compatibility prerequisites.
* Item 3 remains urgent, but freeze pricing and deeper `TIERCOST` are rejected. The two chosen levers are ruled below.
* Item 1 remains a launch blocker but moves after economy and event behavior stabilize.
* Item 7 is not a rescue project. The remaining work is validation of the merged simulator and filling its explicitly reported blind spots.
* Items 15 and 30 do not enter the pre-1.0 plan without Robbie reopening settled rules.
* Item 19 becomes an acceptance gate for Merchant commissions, not a Diamond-removal project.
* Item 23 dies. Combat stays deterministic and pre-fight planned.
* Items 76 through 80 are not low-value cleanup. The decision transaction seam and content epoch are foundations. Migration pruning is deferred until after the support window, because stopping map retirement makes old migrations more important.

## Ruling B: Difficulty

### Primary specification

Endorse Resolve attrition with one correction: measure the whole starting cohort, not only survivors. At each district entry, a run that has already ended contributes zero Resolve. Report the survivor-only median alongside it for diagnosis. This prevents easy survivors from hiding excessive attrition.

The point estimate must fall at every district boundary even where target bands overlap. The Dragon Gate remains the largest single drain, but it must be the peak of a rising curve rather than the only drain.

| Quick boundary | Cohort expected Resolve target |
|---|---:|
| Enter D1 | 40 fixed |
| Enter D2 | 38 to 40 |
| Enter D3 | 35 to 39 |
| Enter D4 | 30 to 35 |
| Exit the Gate | 18 to 24 |

| Long boundary | Cohort expected Resolve target |
|---|---:|
| Enter D1 | 60 fixed |
| Enter D2 | 57 to 60 |
| Enter D3 | 54 to 59 |
| Enter D4 | 50 to 57 |
| Enter D5 | 44 to 51 |
| Enter D6 | 39 to 47 |
| Enter D7 | 32 to 40 |
| Exit the Gate | 18 to 26 |

First-attempt win remains a useful diagnostic and must also descend. It is not the primary loss specification.

| Route | District win bands |
|---|---|
| Quick | D1 88 to 94, D2 78 to 86, D3 66 to 76, D4 50 to 62 percent |
| Long | D1 88 to 94, D2 82 to 90, D3 76 to 84, D4 72 to 80, D5 65 to 74, D6 55 to 65, D7 45 to 57 percent |

No adjacent first-attempt win drop may exceed 15 points. Overall clear must remain 55 to 70 percent for Long. The current worker candidate is suitable for the final matrix, not frozen: Quick D2 and D3 powers 1.12 and 1.18, Long D5 and D6 powers 2.1 and 2.15, and `hasteMates:0.3`. At 600 seeds it placed Quick clear at 68.7 percent and Long at 55.0 percent while fitting the Resolve bands. Do not add the optional Vizier 660 adjustment unless the final matrix requires it.

### Azhdaha ruling

Azhdaha belongs inside the difficulty worker's version as a data retune. Set `hasteMates` from 0.5 to 0.3 on the base fight and both Aspects. Do not invert the mechanic in this version. An inversion changes the engine contract and the encounter identity, so it would require Robbie's explicit settled-rule reopen and its own engine version.

The prior trial suggestion of moving the heads from 8 seconds to 9 seconds is superseded. Do not stack it with the haste reduction. If a 1,200-seed paired Gate trace still has an Azhdaha-versus-Auctioneer first-attempt win spread above 12 points, test 0.25 before touching cooldowns or semantics.

### Unlock and Lantern acceptance

Difficulty cannot pass on a full-unlock profile alone. Run a paired 0.99 baseline and candidate at 150 seeds for every eligible starter hero and starter Omen cell, using the starter ware pool, on both routes. Apothecary plus Blood Moon is excluded from both aggregates after 0.99.4 and retained as a negative-control test proving that the eligibility rule remains necessary.

The gate is:

* Quick aggregate clear may fall at most 3 points, no cell may fall more than 5 points, and no cell may finish below 60 percent.
* Long aggregate clear may fall at most 3 points, no cell may fall more than 5 points, and no cell may finish below 40 percent.
* At least 90 percent of synthetic fresh profiles must reach D3 on run 1 and earn their first Quick clear by the end of completed run 3.
* Feat events earned per completed run may not fall more than 10 percent from baseline through run 3. No starter cell may lose access to an entire early feat family.
* The Lantern first-clear gate may not shift by more than one completed run at the median or 90th percentile in a fresh-profile replay.
* Cloud Ledger must add a fresh-profile cohort after shipping. If real first-clear timing misses the synthetic gate, tuning reopens before 1.0.

The current directional matrix passes narrowly. Its Long pressure cells are Kiln with Bull and Kiln with Molasses. They must remain explicit acceptance rows.

## Ruling C: Economy

### The two levers

Choose exactly these two:

1. Reroll heat within a market.
2. Persona-specific Merchant commissions as the voluntary gold sink and deliberate Diamond path.

The Cloud Ledger currently holds only ten opt-in reports from builds 0.82.0 through 0.98.0. Their repeated behavior is useful directional evidence, not a balance baseline: six Long runs recorded 172 paid rerolls across 50 markets, while all ten runs recorded only 21 freeze taps.

Reject freeze pricing and deeper `TIERCOST`. Freeze protects triple completion, which is the market's strongest felt pull, and it is used far less than reroll. A larger tier bill taxes access and can encourage staying low to force one cheap line. Neither remedy attacks the observed behavior as directly as reroll heat and priced, build-directed services.

### Lever 1: reroll heat

Trial the ordinary paid schedule as `1, 1, 2, 2, 3, 3`, capped at 3 gold until live-market evidence supports a higher ceiling. More generally, add one heat tier after each pair of paid rerolls.

Persist `paidRerollsThisMarket` so reload cannot reset the price. Reset it only on entry to a new market. Free rerolls neither cost gold nor consume a cheap paid reroll. Price must compose in this order:

`base Omen price + Auction Bell sale surcharge + reroll heat`

The button must show the exact current cost. Auction Bell is precedent, not a duplicate: `rerollCostPerSaleThisMarket` at `src/anomaly-rules.js:45-47` responds to sales, while this lever responds to paid rerolls.

Do not begin with `1, 2, 3` and no cap. Actual Long reports contain markets with 12, 13, 15, 16, 17, and 21 paid rerolls. An uncapped first trial would convert a diagnosis into a route collapse.

### Lever 2: Merchant commissions

Each persona offers a deterministic, state-aware paid service alongside Quick Sale and Walk Away. Use existing verbs where possible. Trial prices for ordinary commissions are 4 to 6 gold early and 8 to 12 gold late.

A rare D3-or-later Masterwork commission may gild one chosen non-Diamond ware for 12, 18, or 24 gold by size. It is limited to one accepted Masterwork per run. The offer, payment, target, receipt, mutation, report event, and checkpoint must survive reload exactly once.

This is not a third economy system. It is the already owed Merchant bargain system carrying the missing gold sink. It also attacks the current 75 percent observed Quick Sale share with a build-directed alternative.

### Diamond ruling

Keep Diamond as a reachable apex. Do not cut it and do not re-slope Gold.

Removing it touches rarity stats and names, integrity scaling, fusion, active numeric saves, Almanac and Guild triggers, Shrine and bounty paths, fallbacks, art frames, CSS, help, reports, simulator labels, tests, and golden traces. Mapping old Diamond wares to Gold destroys earned value and can create fusion cascades. Leaving rarity 3 in saves creates a hidden unsupported tier.

The target is route-specific:

* Quick final boards with Diamond: 5 to 15 percent.
* Long final boards with Diamond: 30 to 60 percent.
* Diamond should usually come from an intentional fusion or paid Masterwork, not a silent one-step gild reward.

Economy acceptance also requires median paid rerolls per market at or below 2, 90th percentile at or below 6, no recurring 12-plus markets, Silver-or-better fusions down no more than 10 percent, Quick Sale below 65 percent of labeled Negotiations, commissions chosen in 25 to 60 percent of eligible visits, and at least 40 percent of purchased commissions still affecting the final board, Vault, or next boss.

Neither route's clear rate may move more than 5 points from the fixed difficulty baseline. Require scoped market diagnostics plus at least 30 Quick and 20 Long completed reports before declaring the economy solved. `route-sim` alone cannot pass this gate because it does not model the real market loop.

## Ruling D: Settled targeting rules

Recommendation to Robbie: do not reopen bulwark taunt or flying immunity before 1.0, and do not combine them in one engine version if they are reopened later.

The evidence does not establish two engine defects:

* Bronze Brass Buckler has about 31 Integrity, while medium and large weapons already overflow. The first pressure valve is a data-only reduction to that ware's integrity, tested against matched boards.
* An all-flying board sends weapon attacks to the merchant. Flying already exchanges ware protection for direct health exposure. No general valve is currently needed.

A future reopen requires at least 30 relevant live fights and a controlled matchup distortion of 10 to 15 points after accounting for board quality, threat, overflow, and direct merchant damage.

If Robbie nevertheless reopens semantics, use separate versions and separate goldens:

1. For bulwark, preserve taunt and first trial lower Brass Buckler integrity. Only if the category remains distorted should a small weapon receive a narrow overkill valve against the destroyed bulwark. Do not remove taunt.
2. For flying, preserve immunity. If a real coverage lock appears despite merchant fallback, add one explicit low-tier `reach` counter rather than letting every weapon hit flyers or capping all flying boards globally.

Each change needs a before-and-after matchup matrix, behavioral goldens, and a mutation check proving that the test fails when the valve is removed. This recommendation is subject to Robbie's veto.

## Ruling E: Owed reviews

### Board Aspect edges

`node scripts/variant-verify.mjs 400` reproduced the five deferred edges. All five should be retuned. The same complete run found additional candidates, so high-sample traces were used to separate noise from real breaches.

| Aspect | 400-seed plain and gild delta | Ruling | Candidate high-sample result |
|---|---:|---|---:|
| `matron_v2` | +8.0, -6.5 | Set regen 2, Venom Kiss poison 2, and Grave Nail damage 2. | +2.69, -1.19 at 1,600 |
| `ghul_v2` | 0.0, -18.5 | Move both Rusted Hatchets from cd 8 to cd 9 only. | 0.00, -4.75 at 1,600 |
| `collector_v1` | -4.0, +3.3 | Move both Ledger Blades from cd 8 to 8.5 and Integrity 20 to 22. | -3.38, +2.71 at 2,400 |
| `collector_v2` | -5.3, -7.5 | Set Counting Frame shield 3, cd 7, and Integrity 6. | -2.31, -2.81 at 1,600 |
| `golem_v2` | -1.5, -11.5 | Move both Coin Cannons from cd 4 to cd 5 only. | +2.00, -3.25 at 1,600 |

The complete trace also requires two more repairs in the same Board Aspect data version:

* `nasnas_v2` confirms at -2.31 plain and -11.50 gild. Preserve every shipped stat and change only board order to Bandage, Dagger, Vial, Torch, Buckler. The result is -0.13 and -5.56 at 1,600.
* `simurgh_v1` confirms at -7.06 plain and -8.31 gild. Move Preen from cd 8 to cd 9. The result is -6.81 and -7.94 at 1,600. Because the gild margin is only 0.06, require 2,400 seeds. If it crosses, move Tail Feather cd 2 to 2.2, already measured at -4.69 and -7.56.

`lamassu_v1` and `azhdaha_v1` were 400-seed noise. At 1,600 they are back inside their bands and should remain unchanged. `azhdaha_v2` is also in band. This Aspect repair is separate from the later route difficulty version so the worker receives a clean board baseline.

### Signature wares: Model A or Model B

Recommendation to Robbie: keep Model B.

Chorus and signature wares serve different jobs. Chorus wares are generic complexity, so Almanac gating is coherent. Signatures define the hero. Unlocking a hero should atomically unlock both signature wares so that choosing the hero immediately changes the shop and starting possibilities.

Changing signatures to Model A would create partially unlocked heroes, revoke content already seen by existing profiles, add sixteen independent feat obligations, and require a progression migration. Model B avoids those costs and better expresses build identity.

Fix its presentation debt instead:

* Add a two-ware signature panel to each hero page.
* Reveal both wares when the hero unlocks.
* Show signature triple progress during a run.
* Keep signatures outside the global Almanac chase count.

Robbie may veto this call. A veto requires a separately reserved progression-migration version; it must not be slipped into a polish pass.

### Build identity retrospective

Verdict: mechanically successful, procedurally undisciplined, and not rollback-worthy.

What shipped faithfully:

* Sixteen non-unique signatures fuse normally and remain hero-gated.
* The player grant sites are wired, and Treasure excludes signatures.
* The unsafe Writ fallback was cut.
* Cinder Tithe kept its corrected health-forward behavior.
* Dedicated fixtures cover the subtle signature interactions.
* Chorus and Guild Omen mechanics closely match their written behavior.

What diverged from the written process and order:

* The design order was Chorus, Signatures, then Guild Omens. Shipping put Guild Omens before Signatures.
* That defeated the stated reason for placing Omens last: tuning two of them against measured signature completion.
* Chorus became Almanac-gated even though the original build-identity document described it as open. This is a defensible onboarding adaptation, not a literal implementation.
* Signatures stayed Model B, which is the stronger design recommendation but was not explicitly ruled before shipping.
* The complete track shipped without the required second Codex review or the prescribed live harness pass.
* The open signature tier-placement question was silently accepted.

The repair is validation and surfacing, not reimplementation. Measure signature exposure, purchase, triple, final-board presence, and hero win shape. Retune from evidence only.

## Ruling F: Process fixes

### Required order

1. Worktree isolation, canonical state, and version reservation.
2. Map schema and content epoch decoupling.
3. Behavior-preserving decision transaction seam.
4. Product versions.

The first tracked state file must contain current build, reviewed HEAD, deploy target, save schema, map schema, content epoch, active version reservation, owner, branch, worktree, status, and integration commit. Git history and this file remain current truth until it lands.

Only the main integrator may update reservations or commit to main. Every implementation agent writes in a separate worktree and branch. Reviews name a frozen commit. The ship path stages an explicit approved file set and refuses unexpected changes; it must not use `git add -A`. This directly prevents the currently untracked local settings file from contaminating a release.

### Simulator branch ruling

Rescue and merge are complete. Commit `55313c4` is a true merge of `cb94e4b`; the stale branch and worktree are already removed. Delete this task from every forward roadmap.

The remaining simulator work is to run higher-sample hero and Omen matrices and fill declared blind spots. In particular, Apothecary plus Blood Moon must be excluded from the starter eligibility matrix before difficulty calibration: Blood Moon disables the hero's healing identity, and current 150-seed checks collapse to 32.0 percent Quick and 6.7 percent Long clear. Preserve determinism by filtering the eligible pool before the existing single draw and modulo selection, while pinned replay overrides continue to reproduce historical runs.

### Content epoch ruling

Separate three concepts:

* Save schema for serialized shape and migration.
* Map schema for genuinely incompatible generator semantics.
* Content epoch for pool membership and resolved content.

Stamp the content epoch into each run. Freeze every map-affecting input for each supported epoch, including Treasure candidates, district power, Aspect and Affix selection, and other content-pool membership, or store the resolved values in the run. Preserve old epoch tables for the active-run support window. A balance release may start a new epoch without declaring the generator schema incompatible. Migrate current map version 12 saves to the current epoch without retirement.

Acceptance requires this mutation test: add a dummy eligible ware, generate a new-epoch run, then reload a saved current run. The new run may change. Apart from the explicit schema and epoch metadata added by migration, the saved run's map, pending choice, fight seed, Treasure result, and next action must remain byte-identical, and it must not retire.

This combines the compatible parts of audit items 16 and 95. Do not prune the migration chain in this version. Once content churn stops masking old saves through retirement, those migrations matter more. Audit item 80 waits until a published support window has elapsed and telemetry shows that no supported saves depend on the old path.

## Single reconciled plan

This is the only execution order from 0.99.0 to 1.0.0. One new system per version remains binding. Every version must preserve simulator purity and determinism, pass the full test suite and production build, and revert on failure. Data balance and behavior-preserving foundation versions still receive their own reservations. If Robbie vetoes the settled-rule or signature recommendations, the state file must reserve new versions and renumber later work before implementation starts.

| Version | Owner | One scope | Acceptance gate |
|---|---|---|---|
| 0.99.1 | Claude | Coordination and release safety: canonical state file, one worktree per writer, version reservations, current deploy truth, explicit staging, and reconciled pointers from stale docs. | A concurrent dry run cannot share a writable checkout or reserve one version twice. Shipping refuses unexpected files. GitHub Pages is the sole live deploy target. |
| 0.99.2 | Claude | Content epoch and map-schema decoupling. | Current version 12 saves migrate without retirement. Apart from explicit migration metadata, the dummy-ware mutation leaves the named active-run gameplay state byte-identical. |
| 0.99.3 | Codex | Behavior-preserving route decision transaction seam for validation, deterministic generation, receipt, mutation, metrics, and checkpoint. | Crash-point tests prove each reward and payment settles exactly once across reload. No player-visible choice changes. |
| 0.99.4 | Claude | Starter hero and Omen compatibility eligibility, beginning with Apothecary plus Blood Moon. | One deterministic draw remains; pinned historical overrides replay; every starter matrix cell clears the pre-difficulty floor. |
| 0.100.0 | Claude | Board Aspect edge repair for the seven confirmed high-sample breaches. | `variant-verify` at 2,400 seeds places every plain and gild column inside its design band, including the narrow Simurgh row. |
| 0.101.0 | Difficulty worker | Resolve-attrition curve, including Azhdaha `hasteMates:0.3` on base and both Aspects. No inversion and no stacked head-cooldown change. | Both Resolve tables, first-attempt monotonicity, overall clear, Gate spread, starter matrix, and unlock-pacing gates pass. Paired base and Azhdaha Aspect traces keep plain and gild columns in band. |
| 0.102.0 | Codex | Persona Merchant bargains, including deterministic paid commissions and the one-per-run Masterwork path. | Exact-once reload matrix passes. No option exceeds 65 percent after 30 labeled choices unless explicitly approved as a beginner default. |
| 0.102.1 | Codex | Scoped diagnostics for Merchant choices, commissions, Resolve, rerolls, fusion, Diamond source, signatures, and Treasure retention. No balance changes. | Cloud Ledger comparison is reproducible and distinguishes route, hero, Omen, unlock profile, and content epoch without blocking offline play. |
| 0.103.0 | Codex | Reroll heat. | Price composition and reload tests pass. Market replay meets reroll and fusion protections without moving route clear over 5 points. |
| 0.104.0 | Codex | Treasure parity and targeted enchantment choices. | Non-gold Treasure retention and final-board usefulness improve; singleton uniques no longer impose the measured Long penalty; no option exceeds 65 percent after 30 choices. |
| 0.105.0 | Codex | Stateful Rest choices. | At least two options lead by board or Resolve state, with no universal choice above 65 percent after 30 relevant visits. |
| 0.106.0 | Codex | Lasting Shrine choices. | Effects persist through save and reload exactly once, answer distinct build needs, and break the current Trial by Flame default. |
| 0.107.0 | Claude | Route-native tutorial and corrected reachable rules reference, teaching the now-stable economy and choices. | Fresh-device completion and abandonment are recorded locally; every required action works at 844 by 390 and 390 by 844; skip and reload are safe. |
| 0.108.0 | Claude | Mobile decision-clarity pass: capped overlays, pinned actions, 44-point controls, fight readability, build strip, compact route comparison, and signature surfacing. | On-device Safari pass shows no clipped primary action, no stall displacement, readable fight state, and no overflow at both target viewports. |
| 0.109.0 | Claude | Complete offline install and update handling. | A fresh installed build completes a full route after network removal, then accepts a newer content epoch without losing the active run. |
| 0.110.0 | Claude | Deterministic local Daily Market as the final retention promise. | Date seed, hero, Omen, map, local streak, best score, and share summary replay identically without a backend. |
| 0.111.0 | Claude | Native release candidate after Robbie supplies the display-name ruling. | Capacitor package, privacy copy, app metadata, TestFlight device pass, offline assets, update path, and store screenshots are complete. |
| 1.0.0 | Claude integrates; Codex and difficulty worker sign their gates | Release only. No new system. | Current-version device playthroughs pass, at least 30 Long reports and the economy cohorts meet their gates, Quick lasts 8 to 12 minutes, Long lasts 18 to 25, no active run retires on content change, the full test and build suites pass, and the live GitHub Pages build matches the committed state. |

Robbie has three explicit decision points. The recommendation is no targeting reopen, Model B signatures, and no Codex recommendation on the display name. The first two must be recorded in 0.99.1. The display name must be decided before 0.111.0. No worker should infer any of them from silence.
