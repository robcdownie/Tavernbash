# Launch L1 through Launch L5 roadmap

Date: 2026-07-18

Status: Draft for Claude acceptance review and Robbie approval. This document does not authorize implementation by itself.

Evidence baseline: build 0.99.0 at commit `399a3bb`, `codex-adversary-review-2026-07-18.md`, the current git history, the merged hero and Omen matrix, the Cloud Ledger, the difficulty worker notes, and the source and test surfaces cited by the baseline review.

## Naming ruling

The repository already uses bare `R8` for the completed content program that shipped from 0.69.0 through 0.78.0. Current tests, comments, handoffs, and parity ledgers still use that meaning. Reusing bare `R8` would recreate the source-of-truth ambiguity this roadmap is meant to stop.

The next five high-level projects therefore use a collision-free launch namespace:

1. Launch L1: Safe Ground
2. Launch L2: Calibrated Challenge
3. Launch L3: Market Agency
4. Launch L4: Route Choice Equity
5. Launch L5: Release Experience

Use `Launch L1` through `Launch L5` in state files and prose, and the tokens `launch-safe-ground`, `launch-calibrated-challenge`, `launch-market-agency`, `launch-route-choice-equity`, and `launch-release-experience` in reservations, branches, worktrees, handoffs, and commit subjects. Historical content R8 keeps its existing name. No code or test identifier from historical R8 is renamed.

## Program outcome

Launch L1 through Launch L5 turns the current 0.99.0 build into a commercially credible 1.0 without adding another catalog sprint.

The sequence has five outcomes:

| Project | Outcome | Version envelope | Accountable integrator |
|---|---|---|---|
| Launch L1 | Work is isolated, attributable, exact once, and safe for active runs. | 0.99.1 to 0.99.3 | Claude |
| Launch L2 | Difficulty rises through Resolve attrition, known encounter edges are repaired, and unlock pacing survives. | 0.99.4 to 0.101.0 | Claude, with the difficulty worker owning 0.101.0 |
| Launch L3 | The market gains priced build decisions, reroll heat, and a deliberate Diamond route. | 0.102.0 to 0.103.0 | Codex |
| Launch L4 | Treasure, Rest, and Shrine become state-aware choices instead of automatic answers. | 0.104.0 to 0.106.0 | Codex |
| Launch L5 | The stable game is taught, legible, offline-complete, replayable daily, packaged, and released. | 0.107.0 to 1.0.0 | Claude |

The projects are sequential. Read-only preparation may overlap. Implementation, tuning, and version reservations do not cross a project exit gate.

## Program operating contract

Every implementation version must obey all of these rules:

* One new system per version, including process, save, analytics, offline, packaging, and player-facing systems.
* The combat simulator stays pure, deterministic, and DOM-free.
* No hidden RNG draw, replay-state change, or settled engine semantic enters a data or polish version.
* The full test suite and production build pass. A failed gate reverts the version.
* Exact-once payments, rewards, receipts, pending choices, and checkpoints survive reload.
* Every balance change has before and after evidence, parity-ledger treatment where required, and a rollback constant.
* Every writer uses a dedicated branch and worktree after 0.99.1. The main checkout has one integrator.
* A version is not complete until `coordination/state.json` records its owner, reviewed base, integration commit, evidence, and next reservation.
* No push or deploy occurs without Robbie's explicit approval after local verification is summarized.
* Zero Unicode em dashes and zero Unicode en dashes apply to code, docs, comments, generated copy, and commit messages.

If a project misses an exit gate, reserve a bounded patch inside that project. Do not begin the next project and do not hide the miss inside its first version, except when the evidence collection contract below grants its explicit provisional gate. A provisional gate does not close the owning project.

## Evidence collection contract

Codex owns the instrumented cohort packet, report ingestion, quality checks, analysis, and the written gate ruling. Robbie owns supplying play sessions or approving solicitation of outside testers. Participation remains voluntary. Cloud Ledger remains optional, private, offline-first, and non-blocking; a locally exported run report counts when it carries the required versioned fields and passes the same ingestion validation.

Launch L3 collection begins only on the fully instrumented 0.103.0 build. The hard cohort is 30 Quick and 20 Long completed reports plus 30 labeled Merchant choices. Launch L4 event cohorts begin on the version that introduces each event change and require 30 relevant choices for that event. Reports from older behavior do not count. Reports from later builds may count only when the measured mechanic and its constants are byte-identical.

The primary collection window is 21 calendar days after the relevant instrumented build is deployed, with at least two scheduled cohort play sessions during that window. Codex publishes a progress readout after each session and at day 21.

If the hard cohort is not reached by day 21, a provisional gate may permit the next implementation project only when all of these hold:

* Launch L3 has at least 15 Quick reports, 10 Long reports, and 20 labeled Merchant choices.
* A Launch L4 event has at least 20 relevant choices.
* Every measured threshold passes with a 5-point safety margin, no safety guard trips, and no qualitative reload, pricing, or comprehension defect remains open.
* Codex records the missing sample, confidence limitation, and automatic reopen trigger in `coordination/state.json`.
* The constants stay frozen while collection continues.

A provisional gate is not final acceptance. Any later threshold miss automatically reopens the owning project. The 1.0 release cannot use the provisional fallback: it needs the full cohorts unless Robbie explicitly records a risk waiver after seeing the missing evidence.

## Launch L1: Safe Ground

### Purpose

Make every later change attributable, recoverable, and safe for active runs before balance and choice churn resumes.

This project exists because the previous lane was overwritten, the hero and Omen simulator branch nearly disappeared from the active plan, a feature commit landed during a read-only audit, `scripts/ship.js` still stages any unexpected file through `git add -A`, and content-linked map invalidation can retire active runs. The local, gitignored `AGENTS.md` is also an agent-loaded source of truth that still names Netlify as live, so ordinary tracked-doc review cannot see or correct its drift.

### Versions and owners

| Version | Owner | Single scope |
|---|---|---|
| 0.99.1 | Claude | Coordination and release safety: canonical state, version reservation, one worktree per writer, current deploy truth, and explicit staging. |
| 0.99.2 | Claude | Save schema, map schema, and content epoch decoupling for active-run durability. |
| 0.99.3 | Codex | Behavior-preserving route decision transaction seam. |

Claude is the accountable integrator. Codex owns the exact-once transaction slice and reviews the final project evidence.

### Scope

0.99.1 creates `coordination/state.json` as the canonical current-state record. It includes build, reviewed HEAD, GitHub Pages deploy target, save schema, map schema, content epoch, active project, version reservation, owner, branch, worktree, status, integration commit, verification summary, and Robbie's recorded targeting and signature rulings. The main integrator alone updates reservations. A narrow reservation validator rejects duplicate active versions, branches, and resolved worktree paths. `scripts/ship.js` stages an explicit approved file set and refuses any unexpected tracked or untracked path.

0.99.1 also removes `AGENTS.md` from `.gitignore`, replaces its historical duplicate with a short tracked pointer to `CLAUDE.md` and `coordination/state.json`, and keeps only Codex-specific hard rules that are not duplicated elsewhere. No tracked or agent-loaded instruction file may name Netlify as a live deploy path.

0.99.2 separates serialized-shape compatibility, generator compatibility, and content membership. Runs carry a content epoch. Supported epoch tables or resolved saved values cover Treasure candidates, district power, Aspect and Affix selection, and every other map-affecting pool. Current map version 12 runs migrate without retirement. Migration metadata may change; named gameplay state may not.

0.99.3 centralizes deterministic offer validation, generation, receipt creation, payment or reward mutation, report emission, and checkpoint ordering behind one route decision transaction contract. It is a behavior-preserving foundation for Merchant, Treasure, Rest, and Shrine.

### 0.99.1 internal checklist

The coordination system is not complete unless each subpart has its own test or review evidence:

1. State schema and reservation validator.
2. Bootstrap reservation and one-worktree-per-writer protocol.
3. `AGENTS.md`, `CLAUDE.md`, roadmap, and deploy-truth reconciliation.
4. Explicit staging and unexpected-file refusal.
5. Robbie decision ledger for targeting and signature Model B or Model A.

### Non-goals

* No balance change.
* No player-facing choice change.
* No migration pruning.
* No broad route rewrite.
* No simulator rewrite.
* No tutorial, economy, or content work.

### Likely hot files and collision rule

Likely surfaces include `scripts/ship.js`, the canonical docs, `src/map.js`, `src/route-save.js`, `src/route-run.js`, `src/route-runtime.js`, `src/route-rewards.js`, and their tests.

0.99.1 lands first. 0.99.2 starts from that integration commit. 0.99.3 starts only after 0.99.2 is merged. Claude and Codex do not edit the route persistence files concurrently.

### Exit gate

Launch L1 passes only when:

* The reservation validator rejects duplicate active versions, branches, and resolved worktree paths, and its tests fail when each collision is injected.
* An unexpected untracked or modified file causes shipping to stop before staging.
* GitHub Pages is recorded as the only live deploy target, `AGENTS.md` is tracked as a short current pointer, and no tracked or agent-loaded instruction file names Netlify as live.
* Adding a dummy eligible ware may change a new-epoch run but does not retire a supported active run.
* Apart from explicit migration metadata, the saved map, pending choice, fight seed, Treasure result, and next action remain byte-identical in the mutation test.
* Crash-point tests prove each payment and reward settles exactly once before and after reload.
* Player-visible output and combat goldens remain unchanged.
* All tests and the production build pass from a clean worktree. The current missing local `vite` executable must be resolved without changing the lockfile before this gate can pass.
* `coordination/state.json` records the frozen Launch L2 baseline and has no unresolved reservation.

### Handoff package

Launch L2 receives a pinned integration commit, supported content epoch, route transaction contract, clean worktree reservations, verification commands, and an explicit list of any still-supported old epochs.

## Launch L2: Calibrated Challenge

### Purpose

Establish a valid starter population, repair confirmed encounter edges, and reshape the route into a rising Resolve-attrition curve without slowing early unlocks or changing settled targeting rules. The reshape is a curve-shape fix judged by monotonicity, Resolve distribution, and per-cell floors, not by aggregate clear-rate movement alone, because hero and Omen variance dominates the headline aggregate.

### Versions and owners

| Version | Owner | Single scope |
|---|---|---|
| 0.99.4 | Claude | Hero and Omen compatibility eligibility, beginning with Apothecary plus Blood Moon. |
| 0.100.0 | Claude | Board Aspect data repair for the currently confirmed high-sample breaches, with the full trace authoritative. |
| 0.101.0 | Difficulty worker | Resolve-attrition curve and Azhdaha `hasteMates:0.3` on base and both Aspects. |

Claude integrates the project. The difficulty worker owns the curve. Codex signs the final evidence gate and does not implement difficulty constants.

### Scope

0.99.4 excludes Blood Moon from every fresh random Omen roll when Apothecary is selected, regardless of unlock depth, while preserving the existing single deterministic selection draw. Pinned historical and explicit replay overrides remain exempt. The excluded pair stays as a negative-control matrix row.

0.100.0 applies the accepted `matron_v2`, `ghul_v2`, `collector_v1`, `collector_v2`, `golem_v2`, `nasnas_v2`, and `simurgh_v1` candidates from the adversary review. These seven are the currently confirmed outstanding subset, not a cap on the repair set. The 2,400-seed all-column gate is authoritative, and any other board that fails joins this existing Board Aspect repair version before it can exit.

`rats_v2` does not join the repair set on current evidence. The old design warning measured `{cd:2.5,integ:5,dmg:1}`. The shipped retune is `{cd:2,integ:7,dmg:1}`. A targeted 2,400-seed trace on 2026-07-18 measured `+0.0` plain and `-1.1` gilded against the shipped Souk Rats, inside the `+/-8` band. `lamassu_v1` and `azhdaha_v1` also remain unchanged because their 400-seed edges disappeared at higher sample.

0.101.0 fits the approved cohort expected Resolve bands. Runs already ended contribute zero at later district entries, and survivor medians are reported separately. It trials Quick D2 and D3 powers 1.12 and 1.18, Long D5 and D6 powers 2.1 and 2.15, and Azhdaha `hasteMates:0.3`. These are trial constants, not approval in advance.

### Non-goals

* No bulwark or flying semantic change.
* No Azhdaha inversion.
* No stacked 8-second to 9-second head cooldown change.
* No Vizier adjustment unless the final paired matrix proves it is necessary.
* No economy change.
* No new monster, ware, hero, or Omen.

### Likely hot files and collision rule

Likely surfaces include `src/data.js`, `src/map.js`, simulator inputs, parity ledgers, Aspect verification, map tests, and combat goldens.

Only one writer touches `src/data.js` at a time. The difficulty worker rebases on the integrated 0.100.0 commit and may not merge a parallel pre-Aspect version. The Launch L1 content epoch replaces a save-retiring `MAP_VERSION` bump.

### Exit gate

Launch L2 passes only when:

* Starter and full-unlock selection remain deterministic, fresh random Apothecary rolls never select Blood Moon, and pinned historical runs replay.
* `variant-verify` at 2,400 seeds puts every plain and gilded row inside its design band. This global result, not the initial seven-name list, controls exit.
* Cohort expected Resolve point estimates fall at each district boundary and land inside the approved Quick and Long bands.
* First-attempt wins descend, no adjacent drop exceeds 15 points, and Long overall clear stays from 55 to 70 percent.
* Azhdaha and Auctioneer first-attempt win rates are within 12 points at the Gate.
* Paired base and Azhdaha Aspect traces keep plain and gilded columns inside their bands.
* Eligible starter cells meet the maximum baseline drops and the 60 percent Quick and 40 percent Long floors.
* At least 90 percent of synthetic fresh profiles reach D3 on run 1 and clear Quick by completed run 3.
* Feat events through run 3 fall no more than 10 percent, and Lantern first-clear timing moves no more than one completed run at the median or 90th percentile.
* No settled targeting rule or combat input contract changes.
* Full tests, build, route simulation, matrix, Aspect trace, and golden checks pass.

### Handoff package

Launch L3 receives frozen difficulty constants, the complete before and after matrix, Resolve distributions, the active content epoch, known simulator blind spots, and no balance worker still writing.

## Launch L3: Market Agency

### Purpose

Replace brute-force rerolling with priced, build-directed decisions while preserving fusion as the core economy and Diamond as a reachable apex.

### Versions and owners

| Version | Owner | Single scope |
|---|---|---|
| 0.102.0 | Codex | Persona Merchant bargains, ordinary commissions, and the one-per-run Masterwork commission. |
| 0.102.1 | Codex | Scoped diagnostics only. |
| 0.103.0 | Codex | Paid reroll heat. |

Codex owns and integrates Launch L3. Claude reviews browser behavior and the final evidence package.

### Scope

0.102.0 gives each persona a deterministic, state-aware paid service alongside Quick Sale and Walk Away. Ordinary prices trial at 4 to 6 gold early and 8 to 12 gold late. A D3-or-later Masterwork may gild one chosen non-Diamond ware for 12, 18, or 24 gold by size, once per run.

0.102.1 adds only evidence that cannot already be derived: Merchant choice, commission relevance, rerolls, fusion, Diamond source, Resolve context, signature exposure, and Treasure retention. Cloud Ledger stays optional, private, offline-first, and non-blocking.

0.103.0 trials paid reroll heat at `1, 1, 2, 2, 3, 3`, capped at 3 gold. Free rerolls do not consume heat. The exact cost is persisted and shown. Price composes from the Omen base, Auction Bell sale surcharge, and heat.

### Non-goals

* No freeze price.
* No deeper `TIERCOST`.
* No Diamond removal or Gold re-slope.
* No broad analytics platform.
* No Treasure, Rest, or Shrine redesign.
* No targeting change.

### Likely hot files and collision rule

Likely surfaces include Merchant and market route modules, `src/anomaly-rules.js`, route save and report code, UI price presentation, Cloud Ledger formatting, and exact-once tests.

Codex is the only implementation writer for this project. Claude's work is read-only until the frozen review commit is named.

### Exit gate

Launch L3 passes only when:

* Offer generation, payment, target, mutation, report event, and checkpoint are exact once across reload.
* No Merchant option exceeds 65 percent after at least 30 labeled choices unless Robbie approves it as a beginner default.
* Commissions are chosen in 25 to 60 percent of eligible visits and at least 40 percent still affect the final board, Vault, or next boss.
* Median paid rerolls per market are at most 2, the 90th percentile is at most 6, and recurring 12-plus markets disappear.
* Silver-or-better fusions fall no more than 10 percent.
* Quick Sale falls below 65 percent of labeled Negotiations.
* Diamond appears on 5 to 15 percent of Quick final boards and 30 to 60 percent of Long final boards.
* Neither route clear rate moves more than 5 points from the frozen Launch L2 baseline.
* The evidence collection contract reaches the 30 Quick, 20 Long, and 30 labeled Merchant hard cohorts, or records a qualifying provisional gate while collection continues.
* Route simulation is not used to approve real-market behavior it labels proxy or blind.

### Handoff package

Launch L4 receives frozen economy constants, a stable diagnostic schema, exact commission receipts, the Diamond-source breakdown, and a comparison report that route choices can reuse.

## Launch L4: Route Choice Equity

### Purpose

Make Treasure, Rest, and Shrine answer different build and route states instead of preserving automatic Gold, Temper, and Trial by Flame choices.

### Versions and owners

| Version | Owner | Single scope |
|---|---|---|
| 0.104.0 | Codex | Treasure parity and targeted enchantment choices. |
| 0.105.0 | Codex | Stateful Rest choices. |
| 0.106.0 | Codex | Lasting Shrine choices. |

Codex owns and integrates Launch L4. Claude performs a frozen-commit user-flow review.

### Scope

Treasure addresses the measured penalty for holding singleton Bronze uniques and makes targeted enchantments answer build direction. Rest scales choices against board and Resolve state. Shrine grants differentiated lasting effects through the shared exact-once transaction seam.

Each version uses the Launch L3 diagnostics and ships one choice system only.

### Non-goals

* No first-act bounty packages.
* No standalone Qareen project.
* No new catalog content.
* No standalone map-comparison version.
* No Merchant or reroll retune unless Launch L3 reopens.
* No settled targeting change.

### Likely hot files and collision rule

Likely surfaces include route choice and reward modules, map event resolution, route save and report code, event UI, and transaction tests.

Only Codex writes during each version. If a Launch L3 metric fails, Launch L4 stops rather than adjusting economy constants inside a choice version.

### Exit gate

Launch L4 passes only when:

* No option exceeds 65 percent across at least 30 relevant choices, or the event records a qualifying provisional gate under the evidence collection contract.
* A non-gold Treasure remains on the final board or in the Vault in at least 40 percent of applicable runs.
* Singleton unique retention no longer imposes the measured Long penalty.
* At least two Rest choices lead in different board or Resolve states.
* Shrine effects survive save and reload exactly once.
* Trial by Flame is no longer a universal answer.
* Route clear, pacing, fusion, Diamond, and reroll behavior remain inside the frozen Launch L2 and Launch L3 protections.
* Qareen preview and mirror behavior pass their targeted verification row without a standalone version.

### Handoff package

Launch L5 receives a gameplay freeze, final choice copy, a rules truth table, the tutorial action inventory, current diagnostic summaries, and no unresolved balance or choice writer.

## Launch L5: Release Experience

### Purpose

Teach the stable game, make it legible and complete on iPhone, add the promised local return loop, package it, and release 1.0.

### Versions and owners

| Version | Owner | Single scope |
|---|---|---|
| 0.107.0 | Claude | Route-native tutorial and corrected reachable rules reference. |
| 0.108.0 | Claude | Mobile decision clarity, compact route comparison, and signature surfacing. |
| 0.109.0 | Claude | Complete offline install and update handling. |
| 0.110.0 | Claude | Deterministic local Daily Market. |
| 0.111.0 | Claude | Native release candidate after Robbie's display-name ruling. |
| 1.0.0 | Claude integrates | Release only, with no new system. |

Claude owns and integrates Launch L5. Codex signs the economy and choice gates. The difficulty worker signs the difficulty gate. Robbie owns the display-name decision, final device approval, and deploy approval.

### Scope

The tutorial teaches the finalized hero identity, buying, gold burn, fusion, board slots, scouting, Resolve, combat inspection, Vault, Merchant prices, and one route event through real interaction. It records completion and abandonment locally and remains skippable.

The mobile pass caps overlays, pins primary actions, enforces 44-point controls, improves fight and status readability, adds compact route comparison, and surfaces Model B signatures if Robbie accepts that recommendation.

The 0.108.0 mobile-clarity system carries an internal checklist so the combined presentation pass cannot hide a missed subpart:

1. Overlay caps and pinned primary actions.
2. 44-point controls and safe-area behavior.
3. Fight, status, and effect readability on device.
4. Compact route comparison without a standalone map system.
5. Signature panel, reveal state, and triple progress under Robbie's recorded model ruling.

Each row needs its own automated assertion where practical and a named device-check result at both target viewports.

Offline install precaches the complete required build and presents a safe update-ready state. Daily Market is date-seeded, local, account-free, and backend-free. Native packaging waits for the display-name ruling and ends in a TestFlight device pass before 1.0.

### Non-goals

* No new combat, economy, or route-choice system.
* No late catalog expansion.
* No targeting reopen.
* No Model A migration without Robbie's explicit veto of the Model B recommendation and a newly reserved version.
* No account, backend, leaderboard, guild, season, or live-service dependency.
* No new system in 1.0.0.

### Likely hot files and collision rule

Likely surfaces include title and tutorial flow, route UI, `index.html`, styles, help copy, service worker and build tooling, report formatting, Daily Market modules, Capacitor configuration, and store assets.

Only one UI writer is active at a time. Device verification targets a frozen commit. Store metadata cannot begin until Robbie's display-name decision is recorded in `coordination/state.json`.

### Exit gate

Launch L5 passes only when:

* Fresh-device tutorial completion, skip, abandonment, and reload work at 844 by 390 and 390 by 844.
* No primary action clips, no stall moves offscreen, every required control reaches 44 points, and major fight state is readable on an actual iPhone.
* A freshly installed build completes a full route after network removal.
* An update changes content epoch without retiring a supported active run.
* Daily Market inputs, route, result, streak, best score, and share summary replay identically from the date seed.
* The final display name is recorded before native metadata.
* Capacitor packaging, privacy copy, icons, launch screens, screenshots, and TestFlight checks pass on supported hardware.
* Quick lasts 8 to 12 minutes and Long lasts 18 to 25 minutes.
* Resolve, economy, unlock, choice, save, and content-epoch gates remain green on the release candidate.
* At least 30 current-version Long reports and the Launch L3 economy cohorts support release.
* The full tests, production build, layout checks, offline pass, and device checklist pass.
* The committed release state matches the live GitHub Pages build after Robbie approves deployment.

### 1.0 handoff

The 1.0 commit contains no new system. It records accepted evidence, final metadata, build and cache versions, release notes, and the exact deployed commit.

## Decisions reserved to Robbie

| Decision | Recommendation | Deadline |
|---|---|---|
| New project namespace | Use `Launch L1` through `Launch L5`; preserve historical content R8. | Before Claude accepts this roadmap. |
| Bulwark and flying reopen | Do not reopen before 1.0. | Record Robbie's ruling in 0.99.1. A later veto requires new reservations and renumbering. |
| Signature unlock model | Keep Model B and improve surfacing. | Record Robbie's ruling in 0.99.1. A later veto requires a separate migration version and renumbering. |
| Display name | No Codex recommendation. Robbie decides. | Before 0.111.0. |
| Deploy | GitHub Pages only; Robbie approves each push. | At every deploy gate. |

Silence does not resolve a reserved decision.

## Ownership recommendation for the immediate next project

Claude should lead Launch L1, not Codex alone.

The reason is scope fit, not authorship. Two of its three versions are canonical-state, integration-policy, and save-compatibility work assigned to Claude in the baseline adversary review. Codex should own 0.99.3 because exact-once route transactions directly support the Merchant and route-choice chain Codex owns later.

Recommended working arrangement:

1. Claude independently reviews this five-project roadmap using the companion prompt.
2. Robbie approves the roadmap, namespace, and owner split.
3. Claude creates the bootstrap 0.99.1 worktree from the frozen roadmap commit, records that temporary reservation in the handoff, and makes `coordination/state.json` the first durable reservation authority.
4. Claude implements 0.99.1 and 0.99.2 in isolated worktrees.
5. Codex reviews the frozen 0.99.2 integration commit, then implements 0.99.3 in its own worktree.
6. Claude integrates the project and Codex signs the Launch L1 exit gate.

If Robbie wants one agent to execute every Launch L1 version, Claude is the cleaner single owner. Codex is the stronger single owner for Launch L3 and Launch L4.

## Start condition

No implementation begins until Claude's review returns `ACCEPT`, Robbie approves the namespace and owner split, the roadmap commit is frozen, the pre-existing worktree status is recorded, the bootstrap 0.99.1 worktree is created from that commit, and the clean worktree can run both the full tests and production build. The first 0.99.1 commit creates `coordination/state.json` and records the bootstrap reservation; later versions may not use an out-of-band reservation.
