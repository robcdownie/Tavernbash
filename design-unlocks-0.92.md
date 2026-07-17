# The Almanac

A collection and unlock pipeline for Tavern Bash. Target version 0.92. Status:
synthesis spec, revision 1, from a three-lens design pass and three adversarial
critiques (Codex unavailable this week, so the critique bar was raised: every
load-bearing line citation and the sim gate were verified empirically). Two
blocking flaws the critiques found are already resolved in this text. Ready for
build; Codex retro-reviews Thursday against the open questions at the end.

## Summary

A brand-new profile starts with 3 of 8 merchants, the 24-ware pre-R8 shop pool,
and 4 of 12 Omens. Everything else is earned by playing, with visible locked
silhouettes in the hero rail and the Almanac (the renamed Discovery tab), and a
single unlock moment on every end screen. The 29 unique wares (11 monster
bounties, 18 Treasure caches) take NO second gate: their existing in-run
acquisition already is their pipeline, and finding one in the wild records it.

Robbie's existing local history grants NOTHING; the chase is the point. A dev
flag opens everything for testing without touching real progress.

## What the numbers actually are (brief correction, needs signoff)

Counted from data.js, not assumed: 62 wares = 26 classics + 11 bounty uniques +
25 R8 (7 shop-acquisition, 18 treasure). The live route shop pool is 31 ids
(ui.js:642 already excludes the two income wares, purse and ledger, and all
uniques). So the number that governs the first hour is the SHOP pool, and 0.92
drops it from 31 to 24 by gating the 7 R8 shop wares. The brief's "roughly 40 of
62 wares" was written against a model where uniques start unlocked; they must
not, because their in-run gates are the chase. Effective starter-available count
is 50 (24 shop + 2 income + the 24 non-starter items are all earn-in-run), but
only 12 items ever produce a trigger-gated unlock moment (5 heroes, 8 omens... the
7 shop wares). Locking 22 shop wares to literally hit 40 would starve poison
(vial alone) or util (whetstone alone), a fatal flaw. DECISION FOR ROBBIE: accept
the 31 to 24 shop reduction as the real onboarding lever, or name a different
target. This is an explicit deviation, not "met in spirit."

## Starter sets

### Heroes (3 of 8): knife, kiln, apoth

The three most legible kits, one per core shop weight, and they include the only
hero with a starting ware so that path is taught early.

- kiln (The Kilnkeeper), tag burn, start torch. The tutorial hero; its start
  ware is in the starter shop pool (verified: data.js:286, torch is a starter).
- knife (The Knifegrinder), tag dmg. The cleanest weapon-overflow kit.
- apoth (The Apothecary), tag heal. Teaches the heal and shield layer.

The other 5 (lender, architect, venom, silkblade, ash) are the hero chase.

### Omens (4 of 12): bull, overstock, molasses, wildfire

CHANGED from the design pass, which unanimously proposed fortified as the fourth.
All three critiques flagged the starter omen set as too economy-heavy and noted
fortified makes fights harder (storm 5s earlier), a strange onboarding note.
Synthesis call: swap fortified out for molasses. Result: two economy teachers
(bull gold, overstock shop width), one readable tempo teacher (molasses, big
wares start charged), one combat-flavor omen matched to the Kilnkeeper starter
(wildfire, doubled burn). fortified moves to a mid unlock. This is design
reasoning: route-sim runs under ANONE and cannot score omen gentleness, so it is
an open question for on-device confirmation.

### Wares: the 24-ware pre-R8 shop pool

The exact pool the game shipped with and was tuned on for 80-plus versions, so
the first hour is proven and every category and tier 1-2 fusion feeder is intact
by construction. Category spread of the 24 (verified against data.js, correcting
the design pass's miscount: serpent is cat dmg, not poison): dmg 7, poison 2
(vial t1, venom t3), burn 3, shield 5, heal 4, util 3, with 7 tier-1 and 11
tier-2 wares. Poison is the thinnest line at two wares; that is the historical
shape and it fuses, but the Plague Winds trigger below must respect it.

### The 7 gated R8 shop wares

surgeonhook, sapperspick, venomsiphon, kilnchain, saltward, rosewaterpump,
chirurgeonsscissors. Each is a stateful or conditional hook ware whose concept is
noise before the player has met the situation it answers. IMPORTANT FINDING
(critique, verified empirically): restricting the sim to the starter 24 RAISES
the clear rate (see the gate section). These seven are variety and complexity
unlocks, not power unlocks; unlocking them slightly dilutes the fusion pool. That
is acceptable and even correct for onboarding, but the gate math below is stated
as a one-sided floor, not a symmetric band, because the design pass got this
backwards.

## The unlock table

Every trigger is computed once at routeEnd against the finished record plus the
bb-unlocks profile. Count and clear triggers are DELTAS since the profile epoch
(see the epoch fix), so pre-0.92 history grants nothing. Detection fields were
verified against route-report.js and route-metrics.js by the critiques; the
corrected citations are used here.

| Item | Kind | Trigger (player-facing) | Detection (post-epoch) | Exp. run |
|---|---|---|---|---|
| Rapid Trade | omen | Finish your first night | settled-run counter >= 1 | 1 |
| Kiln Chain | ware | Forge any Burn ware to Silver | metrics.events fusion, cat burn, rarity>=1 | 1-2 |
| Rosewater Pump | ware | Forge your first Silver | metrics.events fusion rarity>=1 | 1-2 |
| The Moneylender | hero | Finish 3 nights | settled-run counter >= 3 | 3 |
| Salt Ward | ware | End a night holding a Gold ware | record.economy.board any rarity>=2 | 3 |
| Molasses is a starter now; Blood Moon | omen | Finish 3 nights | settled-run counter >= 3 | 3 |
| Sapper's Pick | ware | Forge your first Gold | metrics.events fusion rarity>=2 | 3 |
| The Brass Architect | hero | Reach the Palace Quarter | record.progress.districtId >= 3 | 3 |
| Venom Siphon | ware | Slay Shahmaran | metrics.fights monsterId shahmaran, winner a | 4-7 |
| Fortified | omen | End a night at Tier 4 or higher | record.economy.tier >= 4 | 4 |
| The Venom Broker | hero | Finish 4 nights | settled-run counter >= 4 | 4 |
| Plague Winds | omen | Apply 60 poison across one night | metrics.wares poison tally sum (not a 3-ware stall) | 5-8 |
| Chirurgeon's Scissors | ware | Forge your first Diamond | metrics.events fusion rarity===3 | 7 |
| Glass Night | omen | Beat 3 masters in one night, no clear | record.progress.bossesBeaten>=3 and not a clear | 5 |
| Surgeon's Hook | ware | Clear any road | record.result is a clear | 6 |
| The Silkblade | hero | Clear a road at Lantern 1+ | record.result clear and record.lantern>=1 | 7 |
| Narrow Alleys | omen | Clear a road at Lantern 2+ | record.result clear and record.lantern>=2 | 9 |
| Molasses is starter; Silent Bazaar | omen | Clear a road with 3 different merchants | post-epoch clears-by-hero count >= 3 | 10-12 |
| The Auction Bell | omen | Slay the Night Auctioneer at the Gate | metrics.fights monsterId auctioneer, winner a | 8+ |
| The Ash Collector | hero | Clear The Long Bazaar | record.result long_clear | 12-15 |
| 11 bounty uniques | ware | Take from a monster bounty or the Vault | possession extraction (see below) | 2+ |
| 18 treasure uniques | ware | Take from a Treasure chest or midpoint pivot | possession extraction | 2-18 |

Notes: Glass Night is decorrelated from the first clear (the critiques showed a
Quick clear fires bossesBeaten>=3 anyway) by adding "no clear" so it wants a
deliberate deep loss or a second run. Plague Winds keys off total poison applied
(metrics.wares tally), not a 3-poison stall, because poison holds only two shop
wares and a 3-poison board is anti-fusion. Blood Moon and molasses are noted
inline where the design pass had them; molasses is now a starter.

## The five seams

### 1. bb-unlocks profile module (new: src/unlock-profile.js)

Cloned from lantern-profile.js: storage-injected, monotonic, garbage-tolerant,
headless-testable, zero save-surface bump (unlock state lives entirely outside
the run save). Schema:

```
{ v:1, createdAt:<iso>, epoch:{ runs:<n>, clears:<n> },
  heroes:[...], omens:[...], wares:[...], settled:[...reportIds, cap 32] }
```

EPOCH FIX (blocking flaw 1, found by all three critiques): on first read with no
stored profile, the module writes createdAt and snapshots the CURRENT lifetime
run and clear totals from the report store into epoch. Every count and clear
trigger is then computed as (current total - epoch total), so Robbie's months of
pre-0.92 history contribute zero. bb-lantern is NOT read for triggers; Silent
Bazaar and the Lantern-gated heroes read the CURRENT record's own result and
lantern fields instead (strictly cleaner, drops the ctx dependency). A
settlement-internal clears-by-hero map, incremented only inside settleUnlocks,
backs the "3 different merchants" trigger so it too counts only post-epoch runs.

Exports: STARTER_HEROES, STARTER_OMENS, STARTER_SHOP_WARES (the 24 ids),
LOCKED_START_WARES (the 7), starterShopIds(), heroUnlocked/omenUnlocked/
wareUnlocked(storage,id) (missing profile returns the starter truth),
recordFound(storage,kind,id) (monotonic set-add), settleUnlocks(storage,record)
(evaluates every trigger against the finished record once, increments the
settled-run counter, returns the newly unlocked descriptor list), and
devAllOpen(storage) (reads ?debug plus bb-unlocks-all==='1'; while on, reads
report everything open AND settleUnlocks writes nothing, so test runs never
contaminate the chase). Idempotency: a settled-reportId ledger (cap 32, pruned
newest-first) guards against routeEnd re-running on a won-run resume; the resume
path gets an explicit unit test.

### 2. The shop pool filter (src/ui.js:642, rollShop) AND the opening offense (ui.js:1286)

Append `&& wareUnlocked(store(),id)` to the existing ids filter. Array.filter
preserves Object.keys insertion order, so at full unlock the ids array is
element-for-element identical, the weight loop makes the same draws, the single
pick draw (ui.js:655), the ench-chance draw (660, pool-independent), and the
ench-pick draw (666, depends only on the picked ware) are all unchanged: shop
offers are byte-identical, pinned by an identity test.

SECOND SITE (critique catch): ensureOpeningOffense (ui.js:1286-1296) is a second
live draw from Object.keys(ITEMS) that injects one opening-market ware. It leaks
no locked id TODAY only by accident (its pool resolves to dagger/sword/vial/torch,
all starters), but any future starter-list edit could put a locked id there. It
gets the same wareUnlocked filter (identity-safe: at full unlock the pool and its
single rng draw are unchanged) and a test asserting the opening-offense pool never
intersects LOCKED_START_WARES.

Per-run freeze: the unlocked-ware set is snapshotted onto the run at construction
as the LOCKED complement (not a whitelist, per critique: a whitelist would
silently filter any future-added ware out of every resumed run's shop). A pre-0.92
save with no snapshot falls back to the full pool. Threaded through snapshotRoute
and revive at ROUTE_SAVE_VERSION 5 with NO bump (additive optional field,
tolerated when absent), so no active run is wiped on update.

### 3. The Omen roll (src/ui.js:1137-1142)

Keep the single rng draw over the full ANOMALIES array, then map to the unlocked
pool by MODULO: `unlocked[drawIndex % unlocked.length]`. At full unlock this
equals the original pick exactly (identity preserved, one rng call, the following
shuffle(cats,rng) stream undisturbed); with 4 starters it is exactly uniform,
fixing the forward-walk skew the design pass shipped (which made run 1 fifty
percent Bull Market and runs 2-4 forty-two percent Rapid Trade). The 0.90 replay
path is untouched and OVERRIDES the gate: a replayed seed whose pinned omenId is
locked still plays it, because the record pins the world, not the player's tools.

REPLAY FIX (blocking flaw 2, critique 3): a replay containing locked content
plays under override but does NOT settle that content as found, and the Play Seed
Again button labels what is locked. Without this, the 50-record replayable
archive (cloud-restorable) is a menu for unlocking every omen on day one. The
dead run.omenPinned persistence the design pass added is deleted: no trigger
grants an omen by exposure, so the guard is vacuous.

### 4. The hero picker (src/ui.js:1418-1450) and the replay hero path

All 8 chips render. Locked chips carry class lockd (portrait at low brightness,
small brass lock corner, cat ring suppressed) and stay SELECTABLE to preview: the
detail panel shows the darkened portrait, the real name, no Favors line, and the
trigger hint where the rule text sits. Take the Stall re-renders as a stone hint
plaque (same element, aria-disabled, non-gold) whose tap toasts the trigger.
Never a dead tap; zero new controls.

HERO GATE HOLE FIX (critique 3): replayHistoryRun passes spec.heroId straight
into newRoute with no picker (ui.js:1167). Guard the replay path so a replay of a
locked hero is refused with the trigger message (the button already labels locked
content per fix 3). Restores of an in-progress save are EXEMT from all gates
(the resumed hero may be locked; that transitional run settles unlocks normally,
and its pool invariant is grandfathered to the full pool).

### 5. Settlement and the end-screen moment (src/route-ui.js:457-544, routeEnd)

Call settleUnlocks after saveReport AND after the Lantern clear write
(route-ui.js:501), so a run whose own clear is the third-merchant clear settles
correctly (critique: the design pass settled before the lantern write and
silently deferred that unlock a run). Settlement runs REGARDLESS of saveReport
success, since bb-unlocks is its own key (critique: a failed 2MB archive write
must not eat the unlock).

One unlock strip inside the existing end card: on a win under the lampLine/
nextLine sentence, on a loss under the broke-in line, always above the debrief.
Each row: glyph cross-fading silhouette to painted art over 600ms (instant under
reduced motion), name in brass, one flavor clause. SURFACE CAP 3, then "and N
more recorded in the Almanac" (critique: an experienced player's first clear can
fire 8-11 triggers at once; cap the celebration, do not drop the unlocks). Reuse
the existing fanfarewin sting on a win; add no second sting (the design pass's
dawnsting doubled it). On a loss with unlocks, one dawnsting is fine.

When nothing unlocks, the strip is one quiet "Still Sealed" progress line for the
nearest target (e.g. "two masters felled of the three the Glass Night asks"), so
every run ends with a second reward. POST-COMPLETION (critique): once the gated
set and the unique collection are complete, the line hands off to the Lantern:
"Lantern 3 with the Kilnkeeper is unlit," read from lanternMaxPick, so the
second-reward promise survives the whole life of the game.

## The wild-find detection (possession-grade, corrected)

The design pass pointed settlement at the discoveryFacts extraction, which the
critiques proved unsound: it over-credits offered-but-untaken treasure wares
(midpointTreasure.offeredIds) and free shelf exposures (shop_roll lists free
unbought cards), and under-credits a chosen treasure ware still parked as a free
shop offer at run end. Settlement instead uses a POSSESSION extraction: a ware is
found if it appears in record.economy.board, record.economy.vault, or a
metrics.wares row with (buys + freeTakes + fights) > 0, PLUS an explicit
grant-time event carrying data.id fired when a treasure ware is actually bought
or a bounty is taken. genMap and rollTreasure stay byte-identical (map.js
untouched); face-up Treasure keeps rolling the full pool at generation, so
finding a locked ware in the wild is the unlock, and it wears an "Unfamiliar
Ware" brass pip on the scout panel (additive rendering only). The Vizier vault
still lists all 18 treasure uniques by name on a first clear; accepted as a minor
veil leak and noted, not patched (it touches a settled overlay).

## Presentation

- Hero rail: locked silhouette chips, selectable to preview, trigger hint in the
  detail panel, stone hint plaque in place of Take the Stall. One example:
  "THE MONEYLENDER / A shuttered stall. / The Moneylender extends no credit to
  strangers; finish three nights and he will find you."
- The Almanac (renamed Discovery tab): three tile states. Found (art plus name),
  available-unseen (??? as in 0.90), locked (silhouette plus lock mark). Trigger-
  gated items (heroes, omens, the 7 wares) show their real NAME while locked (a
  chase needs a target); discovery-gated treasure uniques stay ??? with a channel
  hint ("Found in Treasure caches"). Header per category: "Found X, Sealed Y, Z in
  all." SEEN-BUT-LOCKED (critique): a tile discovered from pre-0.92 or cloud-merged
  history but still locked shows the locked state; unlocked wins the tile only when
  bb-unlocks says so. Collection count uses 80, not 82 (purse and ledger are
  excluded from the catalog and unreachable). Tapping a locked tile opens a gold-
  framed hint plaque, same grammar as the Lantern rules plaque.
- Title screen: one non-interactive caption under the plaques, hidden at full
  unlock, fed by nextUnlockHint; in the late game it surfaces countable progress
  ("uniques found 12 of 18") rather than going vague.
- Hint copy voice: Persian night market, second person, one sentence carrying the
  literal trigger, no UI words like "unlock" inside the flavor.

## The dev toggle

?debug plus localStorage bb-unlocks-all='1' opens everything; read inside
unlock-profile.js so every surface honors it with no per-callsite checks. While
on, settlement writes nothing (a real milestone hit during a debug session is a
known, stated loss, since backfill is forbidden). The debug strip appends "ALL"
and the end screen shows an "UNLOCKS OPEN" marker where the strip would be, so a
missing strip never looks broken.

## Forge versus gild ruling

"Forge" triggers (first Silver, Gold, Diamond) count only fusion events
(metrics.events type fusion). openGild raises rarity with NO fusion event
(route-ui.js:575), so a gilded Silver does not fire the forge trigger. Stated in
the trigger copy ("Forge", not "raise"), and the end-screen progress pip counts
fusions only.

## The sim gate (rewritten as a one-sided floor)

The design pass demanded the starter pool land "within 4 points of baseline"; a
critique RAN it and found the starter 24 lands Quick 89.7 (+6.8) and Long 86.3
(+14.7) at 1200 seeds, with district death shares dropping 6.8 and 10.6 points.
The starter pool is EASIER, because the 7 R8 hook wares dilute triple completion.
That is the gentler first hour the brief wanted, so the gate is a FLOOR, not a
band:

- Required before ship: node scripts/route-sim.js at 1200 seeds, both routes,
  with cfg.warePool = 'starter' (the 24 ids from starterShopIds()) versus 'full'.
  buildBoard must be threaded with cfg through all four call sites (route-sim.js
  175, 218, 234, 250); it currently takes no cfg.
- Gate: starter clear rate must be at or above baseline minus 3 on both routes
  (protect against a starter pool that is accidentally too weak). An increase is
  expected and accepted; record the actual delta.
- Design acknowledgement, not a footnote: the 7 ware unlocks are net-slightly-
  negative in the balance oracle. They are earned for VARIETY and new stateful
  toys, not power. State this in the spec so nobody reads a clear-rate rise on
  unlock as a bug.

One source of truth: unlock-profile.js exports starterShopIds() and
LOCKED_START_WARES, consumed by rollShop, ensureOpeningOffense, AND route-sim's
warePool, so the tuning knob cannot drift.

## Test plan

- Full-unlock identity: with bb-unlocks-all set, the rollShop ids array
  deep-equals today's, a pinned rng stream produces identical offers, the opening-
  offense pool is identical, the omen modulo pick equals the ungated pick for a
  fixed seed, and the hero list equals HEROES. Golden combat traces and the Quick
  map hash ledger byte-identical (map.js is untouched, so this is by construction).
- Epoch: a profile created against a populated history unlocks nothing on a
  synthetic first post-epoch run; count triggers fire only on post-epoch deltas;
  the clears-by-hero map counts only settled runs.
- Possession extraction: an offered-but-untaken treasure ware does NOT unlock; a
  free shelf card left unbought does NOT unlock; a chosen treasure ware parked as
  a free offer at run end DOES unlock via the grant-time event; board, vault, and
  fought wares unlock.
- Settlement: each trigger fires on a synthetic finished record; idempotent across
  a won-run resume (settled-reportId ledger); survives garbage in bb-unlocks;
  runs even when saveReport throws; the third-merchant-clear run settles in-run
  (settle after the lantern write).
- Replay: a replay of a locked omen plays it but does not settle it; a replay of a
  locked hero is refused; a restore of an in-progress save is exempt from all
  gates and grandfathers the full pool.
- Determinism: a locked profile's shop never rolls a locked id; the opening-offense
  pool never intersects LOCKED_START_WARES; the per-run locked-complement snapshot
  makes a resumed market replay identically.
- Sim gate: the 1200-seed both-routes readout at or above the floor.
- Layout (Playwright): locked hero chips render and preview at 844x390; the end-
  screen unlock strip fits under the lamp line with the 3-row cap; the Almanac
  locked tiles and hint plaque scroll inside their panel; nothing pushed off screen.
- Dash scan covers every new hint string.

## Open questions for the Thursday retro-review

1. Starter omen swap (fortified out, molasses in): confirm on device that the
   4-omen first hour feels gentle and varied, since the sim is omen-blind.
2. The 31 to 24 shop reduction as the real reading of the brief's "40": signoff.
3. The 7 R8 wares being net-negative in the oracle: accept as variety unlocks, or
   reconsider whether any of them should be always-available instead.
4. Run-1 firehose for an expert: is the 3-row cap plus "N more recorded" enough,
   or should more clear-adjacent triggers be decorrelated onto distinct feats?
5. Cloud sync of bb-unlocks is out of scope for 0.92 (local only); two devices
   diverge until a later version takes it. Confirm that is acceptable for now.
6. Vizier vault naming all 18 treasure uniques: accept the minor veil leak, or
   veil the vault overlay in a later pass.

## Build order (one version, 0.92.0)

1. unlock-profile.js with the epoch and dev flag, plus its headless test suite.
   Inert: nothing reads it yet. Ship as 0.91.x if desired, like the Lantern layers.
2. Thread starterShopIds/LOCKED_START_WARES into rollShop, ensureOpeningOffense,
   and the per-run locked-complement snapshot; identity tests green.
3. The omen modulo map and the replay non-settle ruling; identity test green.
4. The hero rail silhouettes and the replay hero guard.
5. settleUnlocks at routeEnd with the possession extraction, the surface-capped
   strip, and the Still Sealed and post-completion fallbacks.
6. The Almanac tile states, hint plaques, header counts, and the title caption.
7. The route-sim warePool cfg and the 1200-seed floor readout.
8. Playwright additions, dash scan, ship.
