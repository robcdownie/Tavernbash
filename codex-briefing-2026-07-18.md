# Codex re-entry briefing and adversary review request, 2026-07-18

You last engaged 2026-07-16 at build 0.91.0: you built 0.90 (run history) and
0.91 (Cloud Ledger), reviewed the Lantern spec, and delivered the choice-equity
roadmap with the agreed lane split (you own 0.91+ for the choice-equity chain:
Merchant bargains next, then scoped diagnostics). Read this in full, then the
named files, before answering.

Companion file: difficulty-worker-notes-2026-07-18.md, the paused difficulty
worker's sim-validated design, is committed beside this briefing. Read it
immediately after this briefing and treat it as input to your ruling B, not as
a decision already taken. Four things in it matter beyond ruling B:

1. It corrects the audit's own measurement: the audit's "Long clear 71.3
   percent, too easy" was a Quick run mislabeled (the sim takes the bare token
   long; a --long flag is silently ignored). Long actually clears about 55
   percent, already inside the roadmap band. The difficulty problem is SHAPE
   (flat then cliff, and a non-monotonic Long D5 bump), not overall rate.
   Weigh audit items 2 and 20 against this correction.
2. Its proposal works in per-district first-attempt win bands with district
   power as the lever (exact values: Quick D2 1.12 / D3 1.18, Long D5 2.1 /
   D6 2.15, Azhdaha hasteMates 0.5 to 0.3, optional vizier 660). The
   adversary review argued the spec currency should be Resolve attrition.
   These framings are not equivalent; ruling B should pick one or reconcile
   them explicitly.
3. It softens the Azhdaha snowball rather than inverting it (audit item 14
   asked invert or cap). Rule on whether 0.3 is enough or the mechanic should
   flip.
4. Its named blocker, "run the hero-by-Omen matrix before finalizing the
   power values," is now unblocked: item 7 shipped after the worker paused.
   Its live-telemetry signal (kiln appears in 4 of 5 recorded losses) also
   converges with the matrix's early read (kiln weakest non-util hero in
   Long). The final power values should be re-validated through hero cells
   before ship.

## What shipped while you were offline (all live on platosd.com; deploy is now
git push to main, GitHub Pages; Netlify is retired)

Current build 0.99.0 plus tooling commits, 494 tests green, CACHE_V bb-v73.
Read the git log range 08ce9cf..HEAD. Your lane was not built. Instead the
retention deep-dive's build-identity and unlock track shipped in seven versions
over two days:

- 0.93.0 asset diet: WebP shipping copies, originals in gitignored art-source/.
- 0.94.0 The Almanac: unlock system. Start with 3 heroes, partial ware pool,
  4 Omens; roughly 31 feat triggers earn the rest. See design-unlocks-0.92.md.
- 0.95.0 Board Aspects: 46 data-only per-monster board variants picked by a
  stateless seed-and-node hash. Five aspects sit past the gilded difficulty
  band and were explicitly deferred to your review: matron_v2, ghul_v2 (worst,
  about -18 gilded), collector_v1, collector_v2, golem_v2. Reproduce with
  node scripts/variant-verify.mjs 400.
- 0.96.0 District Affixes: nine one-word district rules on monster and elite
  doors, injected as engine cfg.hooks. One deviation from the design doc:
  Bellowed ships at 0.25s haste, not 0.5s, after a mandated gilded trace found
  a band breach. See design-monster-variance.md.
- 0.97.0 The Chorus: four synergy-count payoff wares, Almanac-gated (Model A).
- 0.98.0 The Guild Omens: four pool-shaping market Omens on economy feats.
- 0.99.0 The Signature Wares: sixteen hero-gated shop wares, two per hero,
  exempt from the Almanac chase (Model B). This diverges from 0.97's Model A
  and awaits Robbie's ruling. See design-build-identity.md, which has now
  shipped in full, out of order, without your second look.

Then, 2026-07-17 to 18: the commercial readiness audit (audit-2026-07-17.md),
its adversary review, and the completion of that review's first work item,
covered below.

## The audit and its adversary review

audit-2026-07-17.md is a 100-item commercial readiness audit: seven root
causes, verdict Mixed (65 to 72 percent) if launched today. Top roots: all
difficulty lives at the Dragon Gate (D1 to D3 die 0.0/0.0/0.4 percent, D4
dies 22.8), the economy is solved (reroll 1g, free freeze, 41g total tier
cost, Diamond reached 0.0 to 0.3 percent), onboarding is absent (the Tutorial
button is newRoute('quick') with nothing else), and the shared checkout was
drifting (a feature commit landed mid-audit).

A source-verified adversary review of that audit (Claude, 2026-07-18) found:

1. Confirmed: pickTarget returns the first alive bulwark unconditionally
   (engine.js:188) and excludes flyers outright (186). All three Azhdaha heads
   and both its Aspect variants carry rattle hasteMates 0.5. MAP_VERSION 12 is
   coupled to the live ITEMS pool so every content add retires in-progress
   runs (map.js:19, route-save.js:125). The coach CSS is orphaned.
2. Audit item 2 contains a spec contradiction: "raise D2 and D3 first-attempt
   loss to the 65 to 80 percent band" is incompatible with its own 55 to 70
   percent Long clear target; it almost certainly means WIN 65 to 80. Deeper:
   a loss here costs Resolve and offers a retry, it does not end the run, so
   the difficulty spec should be a Resolve-attrition curve (expected Resolve
   entering each district, monotonically falling, Gate as peak drain), not
   death rates.
3. The audit's economy levers (freeze cost, deeper TIERCOST) contradict the
   live-play calibration that fusion, not tier, is the economy; charging for
   freeze taxes triple-completion, the one felt pull. The Auction Bell Omen
   already implements escalating reroll (rerollCostPerSaleThisMarket,
   anomaly-rules.js), so that lever can be promoted from proven content.
4. Audit items 15 (bulwark) and 30 (flying) propose breaking targeting rules
   that CLAUDE.md marks settled and not to be re-litigated. They may deserve
   re-opening, but only as an explicit decision shipped as its own engine
   version against the golden traces.
5. Audit item 23 (in-fight agency) was rejected: it attacks the pure-sim rule
   and the planning-game identity.

## Audit item 7 is DONE (2026-07-18, commit 55313c4)

The stale sim-hero-omen branch (hero and Omen modelling in route-sim, built at
0.93.0 and lost to shared-checkout drift) was rescued, merged as a true merge,
and reconciled with the 0.94 to 0.99 content: sig-aware ware pools, the affix
and forceGild knobs, the starter-pool clause. The no-hero no-Omen baseline is
verified byte-identical on 200 quick and 100 long seeds. New beyond the branch:
uniques=hold (granted Treasure and bounty uniques fight on the board with
their real hooks under a half-board cap), a test-asserted full/proxy/blind
coverage manifest (run: node scripts/route-sim.js coverage), and the
hero x Omen x route matrix with honesty labels. One recorded deviation: heroes
keep the 3.5 archetype concentration (the branch's x2.2 shop-weight rationale
was stale; real weights are 1.5 hero, 2.2 featured) so cells isolate fight
rules.

First findings, all directional (small n), queued for your review:

- apoth x moon: the heal hero under the healing-disabled Omen collapses
  (90 to 20 Quick, 100 to 10 Long at n=10). A player can roll an Omen at run
  start that deletes their hero's identity.
- uniques=hold costs Long clear 56 to 43 on 100 seeds: singleton Bronze
  uniques lose to fused gold, directly measuring your choice-equity thesis
  that competing bounties cannot compete with the fusion core.
- The fortified, molasses, bull, and deep Omen columns depress clears across
  most heroes; needs a proper-n matrix pass (150 seeds per cell).
- lender and ash rows are policy-bound (util-tag board concentration), marked
  with a printed CAUTION; do not read them as hero power.

## In flight, currently paused

A separate worker was implementing the difficulty-curve reshape (audit item
2). It has PAUSED pending your ruling B and has written up its thinking (see
the companion-file note at the top). Nothing of its work is committed. Your
review feeds its spec; do not implement difficulty changes yourself.

## What we want from you

A. The reconciliation. Three roadmaps now coexist: your choice-equity chain,
   the audit's Tier A, and the retention deep-dive ranking. The content sprint
   followed only the third. Produce ONE sequenced plan from here to 1.0, with
   version numbers, owners (you, Claude, the difficulty worker), and an
   explicit list of what from your original chain survives, moves, or dies.
   Argue with the audit's ranking where you disagree; it buries its process
   fixes at 16 to 18 and 71 to 100 while the evidence (your lane overwritten,
   the sim branch nearly lost, a mid-audit commit collision) says they go
   first.
B. The difficulty ruling. Endorse or correct the Resolve-attrition framing
   and propose the actual target bands per district for Quick and Long,
   responding to the difficulty worker's own notes where they exist. Rule
   whether the Azhdaha hasteMates inversion (audit item 14) belongs inside
   the difficulty worker's scope. Note your own prior trial suggestion was
   heads 8s to 9s. Rule on the unlock-pacing interaction: a harder D1 to D3
   slows feat unlocks and first-clear, which gates the Lantern; what is the
   acceptance check? The worker now has the validated instrument: hero cells
   and the matrix in route-sim.
C. The economy ruling. Pick the two levers (the adversary review argues
   escalating reroll plus a real gold sink, against freeze cost and TIERCOST)
   and rule on Diamond: reachable path or apex re-slope. Item 19's cut option
   is mispriced; cutting touches RSTAT, saves, Almanac, CSS, golden traces.
D. The settled-rules question. Should bulwark taunt and flying immunity be
   re-opened as one deliberate engine version? If yes, propose the minimal
   pressure valve for each.
E. The owed reviews. The five Aspect gilded edges (confirm or retune, with
   the variant-verify trace). Model A vs Model B for signature wares, as a
   recommendation Robbie can veto. A short retrospective on
   design-build-identity.md as shipped versus as written. And the new one:
   the apoth x moon collapse; rule whether Omen rolls should respect hero
   identity (exclusion, reroll protection, or a compensating rule).
F. The process fixes. Rule on sequencing for: worktree-per-agent plus a
   version-reservation state file, and decoupling MAP_VERSION into a
   content-epoch (audit items 16, 80, 95) so the coming retune churn stops
   wiping player runs. The sim branch is merged; its worktree at
   C:/Robbie/bazaar-brawler-sim is redundant and awaits removal.

## Constraints

- Zero em dashes and zero en dashes anywhere, including this kind of doc; the
  dash scan in npm test enforces it repo-wide.
- The sim stays pure and deterministic. One new system per version. Tests
  green or the change reverts.
- ROADMAP.md still says 0.87 and CLAUDE.md's top paragraph contradicts its
  own deploy section; treat the git log and this briefing as current truth
  until the state-file fix lands.
- Robbie decides: settled-rule re-opens, the signature Model A/B call, the
  display-name question. Frame those as recommendations.
- Evidence available: node scripts/route-sim.js (now with hero=, omen=,
  uniques=hold, matrix, coverage), node scripts/variant-verify.mjs, the Cloud
  Ledger for real-run data, audit-2026-07-17.md, the design docs,
  reflection-notes.md, and sim-matrix-2026-07-18.md (the completed 150-seed
  hero x Omen matrix with findings: the confirmed apoth x moon collapse, kiln
  weak in Long only, and hero and Omen variance dwarfing the proposed
  district reshape; feed it into rulings B and E).

Deliverable: the adversary review, the six rulings, and the single reconciled
plan, in that order, as one dash-free markdown file committed to the repo.
