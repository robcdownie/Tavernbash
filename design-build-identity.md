# Build Identity

Signature wares per hero, synergy-count payoff wares, and pool-shaping Omens for Tavern Bash. Target versions 0.94 to 0.96 (the next free player-facing slots after the 0.92 unlock build and the 0.93 asset diet). Status: drafted overnight 2026-07-16 to 17 by a three-lens design workflow (Fusion Economist, Hook Mechanist, Identity Dramaturg), each design put through a hard adversarial critique that verified every mechanical claim against the shipped engine, then synthesized here. The synthesis is spine plus fixes: the Fusion Economist design was the most rigorously cited, so it is the spine, and every confirmed critique finding across all three reviews is folded into the text below. Verification is by adversarial read, three independent critics against src/engine.js, src/data.js, src/ui.js, src/map.js, src/route-ui.js, src/route-run.js, src/anomaly-rules.js at HEAD, plus the author's own spot-checks noted inline. It was NOT executed against a live fight harness (the feasibility agent hit the session usage cap before it ran); a fixture-and-trace pass is the first build step, and Codex has not reviewed it (Codex is out until Thursday), so a Codex second look is an explicit open item. No repo file was edited to produce this doc; every proposal is executable later as data-only additions plus the small, precisely identified glue below.

## Summary

Two runs with different heroes should feel like different games because the hero pulls toward a signature build, and in this game the only pull that matters is fusion. A ware that cannot triple is a dead buy for the main line, so all sixteen signature wares and all four payoff wares here are ordinary non-unique shop wares that fuse on the standard 3 to 2 to 2 ladder (fuseNeed, src/engine.js:17). Signature wares are hero-gated by one new data field and a filter clause at every pool that grants a ware, of which there are more than the first draft assumed; the corrected list is four grant sites plus one treasure exclusion. Payoff wares are open to everyone and scale with how many wares of one category you field, expressed entirely through hook patterns the R8 set already proved. Four new Omens bend the market economy toward or away from fusion using only field vocabulary the system consumes today, plus one clearly flagged Omen that pins the featured tags through a single line of glue.

Design principles:

- Price the triple, not the card. Every signature ware is judged by what its silver costs in gold and rerolls, what the player sells to fund it, and whether it competes with or feeds the hero's default line.
- Ride proven skeletons. Every hook below is a re-instrumentation of a pattern already shipping in the R8 wares (src/data.js:62 to 270); no hook verb, condition, selector, or value source is new.
- Additive identity. Golden combat traces build explicit fixture boards and never roll the shop, so new ITEMS keys leave them byte-identical. The one deterministic surface that moves is the pinned route shop count and, in one version, the treasure pool; both are priced explicitly in the version plan as recorded ledger edits.
- One player-facing system per version: payoff wares (0.94), the signature system (0.95), the guild Omens (0.96).

## The shared economy model

All fusion math below uses these shipped constants:

- Purchase cost is by size only: 3, 5, 8 gold for size 1, 2, 3 (COST, src/data.js:7, consumed by warePurchaseCost, src/anomaly-rules.js:39). Sell value 1, 2, 3 (SELLV; src/anomaly-rules.js:42).
- Fusion: 3 bronze forge a silver, 2 silver a gold, 2 gold a diamond (fuseNeed, src/engine.js:17). A silver of a size-1 ware is 9 gold of purchases; a size-2 silver is 15; a diamond is 12 copies, 36 or 60 gold.
- Rarity scaling: stats x2, x3.8, x7 at silver, gold, diamond (RSTAT, src/data.js:4), integrity x1.7, x2.8, x4.5 (RINTEG). Hook payloads scale through from:"sourceRarity" values arrays (src/engine.js:537 to 541), which read the hook source's live or tombstoned rarity.
- Shop odds: each of the shopN slots (4 base) draws by weight = tierWeight (8, 7, 6 for tier 1, 2, 3) times shopTagWeight times ownCopyBoost. shopTagWeight is max(featured 2.2, hero tag 1.5, 1), a MAX not a product (src/data.js:277 to 282). This is a load-bearing correction: the task brief's and CLAUDE.md's "x2.2 personal weighting" is stale. The hero's personal tag weight is 1.5; a hero's category reaches 2.2 only when a run's featured tags include it, or under the Guild Charter Omen in Part C. Holding 1 or 2 bronze copies multiplies that id's weight by 1.6 (ui.js:652 to 653), the shipped triple-chase accelerator every signature ware leans on. Own-copies is the only multiplicative factor in the whole weight loop.
- Reward gold 2, 4, 6 per monster, elite, boss (BASE_GOLD, src/route.js:18); rerolls 1 gold base (src/anomaly-rules.js:45).

Worked baseline (used per ware below, stated once): for a tier-2, hero-tag signature ware in the mid-game route pool, weight is 7 times 1.5 = 10.5 against a total effective pool weight near 250 to 400 depending on player tier and featured tags. That is 2.7 to 4 percent per slot, 11 to 16 percent per 4-slot market roll. After the first copy the 1.6 own-copy boost lifts the id to roughly 17 to 25 percent per roll. A Quick run walks about 5 to 7 market visits; completing a triple after the first buy costs roughly 4 to 7 gold of rerolls plus 2 copies, so a size-1 signature silver lands near 10 to 12 total gold and a size-2 near 14 to 17. That is deliberately more expensive than 3 daggers (9 gold, always available): a signature triple must be a commitment, not an autopilot.

## Hard constraints honored

- Zero em and zero en dashes anywhere in this document.
- No engine changes and no new hook verbs. Every hook uses only the shipped trigger points, actions, conditions, selectors, and value sources (COMBAT_HOOK_POINTS, HOOK_ACTIONS, hookCondition, the selector grammar, and hookValue in src/engine.js). Anything that wanted a new verb is in Rejected ideas with the verb named. Two wares (Repossession Writ's fallback and Cinder Tithe's anti-shield niche) were found in review to need a verb that does not exist; both are corrected in place and the missing verb is parked in Open questions.
- No data.js edits during design; this is a spec for data-only additions plus glue named to the line.
- Settled rules untouched: two health layers, targeting, fusion thresholds, economy, uniques out of shop and rival generation, Gate contract.
- Golden combat traces stay byte-identical: fixtures construct explicit boards and never read the shop pool, so new ITEMS keys cannot move them; new wares get their own new fixtures and goldens instead.
- Rival parity is specced against genRival with line cites in its own section.
- One system per version; the split is at the end.

A note the reviews forced into this section: "data-only additions" is not literally true, and the doc no longer claims it. Every new item id needs an SVG sprite symbol g-{id} in index.html (tests/hygiene.test.js:31 to 56), every spawn glyph needs one, and every new Omen needs a g glyph (parity.test.js:148 asserts omen.n and omen.g and omen.d). Omens may reuse existing item glyphs, as the shipped Omens do. Each version's cost line below includes its sprite and glyph work.

---

# Part A: Signature wares

## The gating spec (this is the system; everything else is data)

Mechanism: a new optional data field on an item def, `sig:"<heroId>"`, and `acquisition:"shop"` on every signature and payoff def so the SIGNATURE_WARES parity ledger passes (parity.test.js asserts ITEMS[id].acquisition equals the ledgered value). The sig field is consumed at every pool that can hand a player a ware. The first draft named three; review found the true count is four grant sites plus one exclusion, all verified by grep:

1. Shop roll: the candidate filter at src/ui.js:643. Today: `gateOK(ITEMS[id].tier,G.tier)&&!ITEMS[id].unique&&(G.mode!=='route'||!ITEMS[id].inc)`. Add: `&&(!ITEMS[id].sig||ITEMS[id].sig===G.hero)`. G.hero is set before any market opens.
2. Opening offense seed: the fallback pool at src/ui.js:1291 gains the same clause, so the round-1 offensive seed can never hand a hero another hero's signature.
3. Negotiation Fresh Stock: `grantFreeWare` at src/route-ui.js:185 rolls a free ware from the same unfiltered pool for the Merchant "Fresh Stock" option. Add the same clause. Without this, any Merchant node hands foreign signatures.
4. Gate Camp Quartermaster: src/route-run.js:100 rolls from the same pool at every boss camp. Add the same clause.
5. Treasure exclusion: treasureWareIds at src/map.js:83 gains `&&!ITEMS[item].sig`. This keeps the map hero-agnostic (treasure rolls at genMap time, before hero threading exists) and, critically, means the signature batch does not move the pinned Quick map hash ledger at all: the treasure pool output is unchanged because no existing item carries sig.

Sim note, not a shipping site: scripts/route-sim.js:77 draws from the same pool for the abstract draft policy; the sim-hero-omen branch already threads the hero, so a `sig` clause there keeps the sim honest but never ships to players.

Why gating instead of pure weighting: at the honest 1.5 hero weight, a signature ware shown to all eight heroes is just another tier-2 card; the pull is statistical, not felt. Hero-gating makes every signature sighting a signal, keeps the other heroes' pools clean, and lets the numbers be tuned for one owner. The 1.5 weight still applies on top (every signature ware's cat matches its hero's tag), lifting to 2.2 under Guild Charter or a lucky featured roll.

Why signature wares must not be unique: uniques are excluded from the shop and from fusion relevance by scarcity; the entire point is shop presence and tripling. The parity test's new-item rule requires non-unique new items to be explicitly shop-ledgered; the signature version therefore adds a SIGNATURE_WARES ledger table modeled on R8_WARES, with acquisition "shop" and the owning hero recorded.

Deterministic-surface pin, do not skip: tests/r8-acquisition.test.js:24 asserts `routeShop.length===31` over `gateOK(tier,6)&&!unique&&!inc`. The 4 payoff wares (0.94) and 16 signature wares (0.95) both pass that filter, so both versions break this assertion. Each version records the count edit (31 to 35 at 0.94, 35 to 51 at 0.95) the same way REBALANCED_ITEMS records retunes, or the assertion is rewritten to derive from the ledger table.

Per-hero format: Rule text is the card `d`. The field block is the data.js entry as it would ship (with `acquisition:"shop"` present in the real defs; omitted from the printed blocks below only for width, flagged here once). Hook feasibility cites the engine. Fusion economy is the triple argument.

A cross-cutting placement rule, verified in review and applied throughout: a ware whose `cat` matches a hero's centerpiece category can steal that hero's rule. prepareRules picks the leftmost alive `cat==="burn"` ware for the Kilnkeeper's Last Light (engine.js:311 to 313), the leftmost `cat==="shield"` for the Architect's Living Rampart (319 to 322), and the fastest `cat` dmg for the Silkblade (323 to 330). Where a signature or payoff ware sharing that cat could wrongly claim the role, the entry either flags it as a real placement decision (the enabler is cheap and size 1, so a misplaced claim is recoverable) or sets `cat:"util"` and accepts losing the tag weighting. Each case is called out.

---

## 1. The Kilnkeeper (id kiln, tag burn)

Hero rule recap: Last Light, the leftmost Burn ware gains Bulwark and activates once before its first destruction (mod at src/data.js:286, implemented at engine.js:311 to 313 and 735 to 739). The Kilnkeeper is the only hero with a free starting ware (start:"torch"). Default line: torch to bomb to magma, with kilnchain as existing shop glue.

### Bellows Boy (sig A)

- Rule text: "Apply 2 burn and pump 0.3 seconds into your leading burn ware."
- Fields: `bellowsboy:{n:"Bellows Boy",size:1,tier:1,cat:"burn",cd:4,fx:{burn:2},sig:"kiln",hooks:[{on:"afterActivate",when:{test:"actorIsSource"},actions:[{op:"haste",target:{side:"owner",category:"burn",active:true,excludeSelf:true},amount:{from:"sourceRarity",values:[0.3,0.45,0.7,1.0]}}]}],d:"Apply 2 burn and pump 0.3 seconds into your leading burn ware."}`
- Feasibility: afterActivate plus actorIsSource plus op haste with an object target is the rosewaterpump skeleton (src/data.js:214 to 218); the object selector returns the leftmost live match. applyHaste no-ops on cd-0 targets, so a bulwarked cd-0 ware is safely skipped. sourceRarity array covers all four rarities.
- Fusion economy: tier 1, live in the opening market at 3 gold and the round-1 identity hook. Silver costs about 10 gold all-in and doubles both the burn packet and the pump (0.45); at gold the pump (0.7) approaches a fifth of a magma cooldown per bellows cycle. It feeds, never competes with, the burn main line: its whole output is denominated in other burn wares' activations. Diamond is a real late chase that stays behind magma silver in priority, which is correct: the enabler should never outrank the payload.
- Decision changed: the opening fork. The Kilnkeeper starts every run with a free torch, so his real round-1 fork is 6 gold on top of that torch: Bellows Boy plus one more piece versus a buckler plus a piece. That is the first build-identity choice of a Kilnkeeper run.
- Interactions: cat burn means a leftmost Bellows Boy claims Last Light's bulwark role. That is a real placement decision, stated on purpose: a bulwark bellows soaks hits while pumping, but wastes the free dying activation on a small burn. Because it is size 1 and cheap, a misplaced claim is recoverable.

### Cinder Tithe (sig B)

- Rule text: "Apply 3 burn. While the foe holds 8 or more burn, each activation also scorches the merchant for 2."
- Fields: `cindertithe:{n:"Cinder Tithe",size:2,tier:2,cat:"burn",cd:4.5,fx:{burn:3},sig:"kiln",hooks:[{on:"afterActivate",when:[{test:"actorIsSource"},{test:"statusAtLeast",side:"enemy",status:"burn",value:8}],actions:[{op:"merchantHit",side:"enemy",amount:{from:"sourceRarity",values:[2,3,5,7]}}]}],d:"Apply 3 burn. While the foe holds 8 or more burn, each activation also scorches the merchant for 2."}`
- Feasibility: threshold-gated payoff is the serpentsdue skeleton with merchantHit in place of damage; merchantHit is a shipped hook action resolved by hitMerchant. statusAtLeast side enemy reads the opposing merchant's burn pool.
- Fusion economy: the burn build's victory condition once burn is already stacked. Bronze is a conditional 2; silver (15 gold all-in) reads 3 per activation once the board sustains 8 burn, which a torch plus bellows line reaches by mid-fight against band-2 boards. It competes with magma for board space (size 2 vs 3), the intended payload-versus-payload tension.
- Correction applied from review: an earlier draft sold this as beating shield-heavy courts. That is backwards. hitMerchant lets merchant shield absorb 100 percent of a merchantHit (no pierce unless a hook sets it), whereas the burn tick it converts is only half-blocked by shield (tickBurn caps absorption at floor(amount/2)). So the tithe's merchant damage is MORE shield-vulnerable per point than the burn it rides on, not less. The card is still a sound threshold payoff against health-forward boards; it is not an anti-shield tool. A genuine anti-shield rider would be a shieldPierce added via modifyContact on beforeHit (sapperspick precedent, src/data.js:89 to 90), which is lawful today but changes the design; it is offered as a variant in Open questions.
- Interactions: Wildfire Omen (burnMul 2) reaches the 8 threshold nearly twice as fast; Blood Moon does not touch it (the tithe is a merchantHit, not healing).

---

## 2. The Apothecary (id apoth, tag heal)

Hero rule recap: overheal becomes shield, healing no longer cleanses (mod src/data.js:292; overhealToShield at engine.js:692 to 694). Default line: salve and chalice, rosewaterpump glue.

### Attar of Roses (sig A)

- Rule text: "Heal 8. Any drop wasted returns as 2 extra shield."
- Fields: `attar:{n:"Attar of Roses",size:1,tier:1,cat:"heal",cd:4,fx:{heal:8},sig:"apoth",hooks:[{on:"afterHeal",when:[{test:"actorIsSource"},{test:"contextAtLeast",key:"overheal",value:1}],actions:[{op:"shield",side:"owner",amount:{from:"sourceRarity",values:[2,3,5,8]}}]}],d:"Heal 8. Any drop wasted returns as 2 extra shield."}`
- Feasibility: afterHeal exposes context.overheal (set before the afterHeal trigger); contextAtLeast reads it; the pattern is bloodpricechalice simplified. Ordering fact: her overhealToShield rule already converted the overheal before this hook fires, so the sig is a flat bonus on top, which is the design (she is the only hero who sees this card, so it never needs to work without her rule).
- Fusion economy: tier 1, opening-market live. Her deck's paradox is that healing is worthless at full health; this card makes topping off profitable from round 1. Silver (about 10 gold) heals 16 and pays 3 bonus shield per overheal proc. It feeds the heal line: every other heal ware raises overheal frequency.
- Interactions: Blood Moon (healingDisabled) turns the whole card off, as it does her hero rule; that is the shipped Omen risk for heal builds, unchanged.

### Quicksilver Dose (sig B)

- Rule text: "Heal 16. Overhealing by 6 or more quickens your whole stall 0.2 seconds."
- Fields: `quicksilver:{n:"Quicksilver Dose",size:2,tier:2,cat:"heal",cd:5,fx:{heal:16},sig:"apoth",hooks:[{on:"afterHeal",when:[{test:"actorIsSource"},{test:"contextAtLeast",key:"overheal",value:6}],actions:[{op:"haste",targets:{side:"owner",active:true,excludeSelf:true},amount:{from:"sourceRarity",values:[0.2,0.3,0.45,0.7]}}]}],d:"Heal 16. Overhealing by 6 or more quickens your whole stall 0.2 seconds."}`
- Feasibility: plural haste over an object targets selector is the bazaarcompass action shape; selectHookItems with no position returns every live match, each hasted individually. Hook budget 16 per root is untouched by a once-per-activation hook.
- Fusion economy: the payoff scales twice, with rarity and with board width, so a silver dose on a full 8-slot stall moves about 1.8 ware-seconds per proc. That is the Apothecary's answer to the storm clock without buying Quickhands. Tripling it (15 gold, size 2) competes with a sanctum purchase; the dose wins on wide boards, sanctum on tall health pools.
- Interactions: the overheal-6 threshold interlocks with Attar (procs on 1), so the two signatures want different heal timings and do not collapse into one stat.

---

## 3. The Knifegrinder (id knife, tag dmg)

Hero rule recap: Perfect Edge, leftmost weapon has full overflow, a failed kill adds 1 second (mod src/data.js:298; overflow at engine.js:825, nextCdFlat penalty at 803).

### Grinder's Oilstone (sig A)

- Rule text: "Deal 5. Hone every ready blade: its next strike hits 2 harder."
- Fields: `oilstone:{n:"Grinder's Oilstone",size:1,tier:2,cat:"dmg",cd:4,fx:{dmg:5},sig:"knife",hooks:[{on:"afterActivate",when:{test:"actorIsSource"},actions:[{op:"itemStateSet",targets:{side:"owner",category:"dmg",active:true,excludeSelf:true},key:"honed",value:{from:"sourceRarity",values:[2,3,5,8]}}]},{on:"beforeHit",allowDead:true,when:[{test:"actorSideIsOwner"},{test:"actorCategory",value:"dmg"},{test:"actorStateAtLeast",key:"honed",value:1}],actions:[{op:"modifyContact",add:{from:"actorState",key:"honed"}},{op:"itemStateReset",source:"actor",target:"actor",key:"honed"}]}],d:"Deal 5. Hone every ready blade: its next strike hits 2 harder."}`
- Correction applied from review: the card text now says "every ready blade", not "your leading blade". There is no leftmost position keyword, and a no-position plural `targets` selector writes to every match; itemStateSet with `targets` marks every active weapon, and the beforeHit rider pays honed once per weapon. The all-weapons behavior is the real one and the card and values reflect it. (If a single-blade version is wanted instead, use `target` with `position:"highestDamage"` and raise the values; that is the "hones your heaviest blade" variant.)
- Feasibility: the kilnchain two-hook skeleton with modifyContact add (viperverdict precedent) in place of burn. itemStateSet over a plural selector marks every live active weapon; the beforeHit consumer reads actorState and resets per weapon. allowDead:true keeps granted hones live if the oilstone dies, exactly as kilnchain's ignite does. Note the verified limit: allowDead only keeps the HOOK matching after the source dies; it does not revive an op that guards on a live source. modifyContact and itemStateReset act on the actor (the striking weapon), not the dead oilstone, so they resolve correctly; this is why the oilstone's grant survives its own death but a hypothetical dead-source burn would not (see the Ash Collector rule note and Rejected ideas).
- Fusion economy: the plural grant means payoff is honed damage times weapon count, so this is a soft count-payoff inside the signature system. Silver (about 11 gold) grants +3 to every weapon's next swing per cycle; on the Knifegrinder's two-or-three-big-weapons board that is 6 to 9 damage per 4 seconds, comparable to a whetstone but scaling with rarity and never adjacency-bound. It feeds Perfect Edge directly: the honed bonus rides into overflow because modifyContact raises the contact before integrity math, pushing kills over the line and dodging the 1-second miss penalty.
- Decision changed: whetstone stops being the automatic dmg-utility pick for this hero; oilstone versus whetstone is a fusion-line choice.

### Headsman's Fee (sig B)

- Rule text: "Deal 14. A killing blow on a ware pays your leading weapon 0.5 seconds."
- Fields: `headsmansfee:{n:"Headsman's Fee",size:2,tier:2,cat:"dmg",cd:5,fx:{dmg:14},sig:"knife",hooks:[{on:"afterHit",when:[{test:"actorIsSource"},{test:"contactKind",value:"item"},{test:"destroyed"}],actions:[{op:"haste",target:{side:"owner",category:"dmg",active:true},amount:{from:"sourceRarity",values:[0.5,0.7,1.0,1.5]}}]}],d:"Deal 14. A killing blow on a ware pays your leading weapon 0.5 seconds."}`
- Feasibility: afterHit plus actorIsSource plus contactKind item plus destroyed is the cinderhook trigger set; destroyed context is set in resolveDamage. The haste target with no excludeSelf may select the Fee itself if it is the leftmost active weapon; that self-pay on kill is acceptable and stated on the card as "leading weapon".
- Fusion economy: silver (15 gold, size 2) hits 28 and pays 0.7 per kill, which against multi-ware boards chains executions. It competes with hammer for the size-2-to-3 slot and beats it exactly when the enemy board is wide, giving the Knifegrinder a scouting decision at every door. Gold at 53 damage plus 1.0 haste per kill is the Dragon Gate line: the Azhdaha's three heads are three kill-payments.
- Decision changed: door routing. The Knifegrinder starts hunting wide boards the way the Kilnkeeper hunts long fights.

---

## 4. The Moneylender (id lender, tag util)

Hero rule recap: credit to minus 3, debt blocks rerolls, next reward repays (mod src/data.js:304). His pool problem is real: route mode strips income wares, leaving util as whetstone, hourglass, adren. Util can never be a featured tag (the featured roll draws from the five combat cats), so his signatures live on the 1.5 hero weight only, against the thinnest category competition in the game; net shop odds come out similar to the other heroes'.

### Repossession Writ (sig A)

- Rule text: "Auctions the foe's finest weapon out of the fight. Survives to seize again."
- Fields: `writ:{n:"Repossession Writ",size:2,tier:2,cat:"util",cd:6,fx:{disable:true},sig:"lender",integMul:1.4,d:"Auctions the foe's finest weapon out of the fight. Survives to seize again."}`
- Correction applied from review: the earlier draft carried a foreclosure fallback hook that fired on `itemMissing` when the enemy had no weapon left. Verified false: the disable at engine.js:916 to 927 marks the highest-damage weapon as a lot but leaves it alive with fx.dmg, and hookItemCandidates has no lot check, so the itemMissing selector keeps finding the living lots and the fallback never fires until every enemy weapon is actually dead (the fight already won). The fallback is cut. The Writ is now a pure repeatable disable whose triple value is integrity (survive to auction the next-finest weapon each activation, since the lot flag excludes already-auctioned wares) rather than a damage rider.
- Feasibility: fx.disable is a shipped fight verb carried through playerFightItems and resolved at engine.js:916 to 927; the player-side precedent is The Gavel. No hooks, so no hook-budget or validity concern. integMul is the brassbuckler shape.
- Fusion economy: honesty first, fx.disable does not scale with rarity, so the raw disable is the same at bronze and diamond. The triple buys integrity (x1.7, x2.8, x4.5) so the writ survives to fire repeatedly. Silver at 15 gold is the Moneylender's control centerpiece; it competes with tower and aegis for the defensive slot and wins against weapon-stacked boards, fizzles against burn and poison courts that carry no fx.dmg (stated on scout, an intended matchup weakness).
- Decision changed: the Moneylender gets a combat identity at all (today his identity is entirely market-side), and it is repossession.
- Open item, not shipped here: a foreclosure damage rider is desirable but needs a lot-aware selector (a one-line `!target.lot` filter in hookItemCandidates), which is an engine change. It is parked in Open questions to be scheduled and tested, not smuggled in.

### Foreclosure Maul (sig B)

- Rule text: "Deal 9, seizing up to 6 enemy shield first as collateral: half of it lands on the merchant."
- Fields: `maul:{n:"Foreclosure Maul",size:2,tier:2,cat:"util",cd:5,fx:{dmg:9},sig:"lender",hooks:[{on:"beforeActivate",when:{test:"actorIsSource"},actions:[{op:"removeShield",side:"enemy",amount:{from:"sourceRarity",values:[6,9,14,20]},store:"collateral"}]},{on:"afterActivate",when:[{test:"actorIsSource"},{test:"stateAtLeast",key:"collateral",value:2}],actions:[{op:"merchantHit",side:"enemy",amount:{from:"state",key:"collateral",divide:2,floor:true}},{op:"stateReset",key:"collateral"}]}],d:"Deal 9, seizing up to 6 enemy shield first as collateral: half of it lands on the merchant."}`
- Feasibility: the ashencenser skeleton: beforeActivate removeShield with store, afterActivate stateAtLeast reading the stored amount, value from:"state" with divide and floor, stateReset. removeShield reads side.shield only, verified: it does nothing against boards whose defense is a bulwark with no side shield (Brass Lamassu generates zero side shield). The scout-and-choose pitch is honest only against boards that actually field shield (Marid, Tide Wall, Aegis rivals); the card is dead against Lamassu, stated.
- Fusion economy: anti-shield is a gap in the whole shop pool. Silver seizes 9 shield and converts 4 to merchant damage per swing. It and the Writ are his real fusion decision: repossess weapons or repossess shields, chosen by route.

---

## 5. The Venom Broker (id venom, tag poison)

Hero rule recap: Marked for Collection, his poison lands on enemy wares, ticks their integrity, spills to the merchant on destruction (mod src/data.js:310; poisonTargetsItems at engine.js:880 to 889).

### Lacquered Dartcase (sig A)

- Rule text: "Apply 1 poison. Once the foe's wares carry 6 or more between them, the darts come faster."
- Fields: `dartcase:{n:"Lacquered Dartcase",size:1,tier:1,cat:"poison",cd:2.5,fx:{poison:1},sig:"venom",hooks:[{on:"afterActivate",when:[{test:"actorIsSource"},{test:"statusAtLeast",side:"enemy",status:"pois",value:6}],actions:[{op:"haste",target:"self",amount:{from:"sourceRarity",values:[0.3,0.4,0.6,0.9]}}]}],d:"Apply 1 poison. Once the foe's wares carry 6 or more between them, the darts come faster."}`
- Feasibility: haste target "self" is the sapperspick action. Stated honestly, and corrected from the draft: under his hero rule his poison lands on items, and statusAtLeast side enemy status pois reads the side pool, which fills only via no-target fallback and death spills. Against a single-ware board (Karkadann, Rust Ghul) the lone marked ware holds all the poison on its own integrity, so the side pool threshold stays false for most of the fight and the haste rarely arms. The threshold arms reliably only against courts, where marks spread and spill. This single-target dead zone is the same court-versus-single split the alembic states, and it is on the card face ("between them").
- Fusion economy: tier 1, 3 gold, opening-market live, the fastest poison applicator in the game (vial is cd 3.5). His rule wants application count; a silver dartcase applying 2 per 2.5 seconds outpaces a bronze venom idol for marking. It feeds the vial and venom main line: idols kill merchants, darts kill boards.

### Spillwright's Alembic (sig B)

- Rule text: "Apply 3 poison. Every enemy ware that breaks feeds the alembic: 1 more poison on the foe."
- Fields: `alembic:{n:"Spillwright's Alembic",size:2,tier:2,cat:"poison",cd:5,fx:{poison:3},sig:"venom",hooks:[{on:"destroyed",when:{test:"eventSideIsEnemy"},actions:[{op:"poison",targetSide:"enemy",amount:{from:"sourceRarity",values:[1,2,3,4]}}]}],d:"Apply 3 poison. Every enemy ware that breaks feeds the alembic: 1 more poison on the foe."}`
- Feasibility: destroyed plus eventSideIsEnemy is the funeralbrazier trigger with op poison instead of burn. The compounding loop with his hero rule is lawful and bounded: hook poison from a player-side source routes through poisonTargetsItems, lands on the next enemy ware, ticks it dead, which fires this hook again. Each destruction is a separate root from the once-per-second tick loop, so no budget guard is approached. Crucial verified caveat: this hook's `op:"poison"` requires a live source (the poison op guards on source liveness), so it works while the alembic is alive and does NOT fire from the alembic's own grave. There is no allowDead here and none would help; do not add a "from the grave" clause (see Rejected ideas).
- Fusion economy: silver (15 gold) turns every enemy death into 2 fresh marks; against wide boards the Broker's fights cascade. It competes with venom idol for the big slot; the idol is better against single fat boards, the alembic against courts.
- Interactions: Glass Night (itemIntegrityMul 0.6) makes the cascade dramatically faster; Plague Winds doubles applications but halves persistence, roughly neutral for item ticks.

---

## 6. The Brass Architect (id architect, tag shield)

Hero rule recap: Living Rampart, leftmost shield ware gains bulwark and stores its own shield until it falls (mod src/data.js:312; prepareRules engine.js:319 to 322, self-storage 863 to 866).

### Plumb Line (sig A)

- Rule text: "Gain 6 shield and repoint the most battered ware for 3 Integrity."
- Fields: `plumbline:{n:"Plumb Line",size:1,tier:1,cat:"shield",cd:4,fx:{shield:6},sig:"architect",hooks:[{on:"afterActivate",when:{test:"actorIsSource"},actions:[{op:"repair",target:{side:"owner",position:"lowestIntegrity",excludeSelf:true},amount:{from:"sourceRarity",values:[3,4,6,9]}}]}],d:"Gain 6 shield and repoint the most battered ware for 3 Integrity."}`
- Feasibility: op repair with a lowestIntegrity position selector is mendersbell's action; repair caps at maxI.
- Fusion economy: tier 1 and 3 gold. The Architect's rampart eats every weapon hit, so integrity repair is worth more to him than to anyone; a silver plumb line is 4 Integrity per 4 seconds into the rampart. Its shield fx also stores on the rampart when the plumb line IS the leftmost shield ware, the same placement subtlety as Bellows Boy; size 1 and cheap so a misplaced claim is recoverable.
- Decision changed: the Architect keeps wounded wares instead of selling them, because he alone can repoint them.

### Keystone Course (sig B)

- Rule text: "Gain 12 shield. Once a second, absorbing a blow sets your shield wares 0.2 ahead."
- Fields: `keystone:{n:"Keystone Course",size:2,tier:2,cat:"shield",cd:5,fx:{shield:12},sig:"architect",hooks:[{on:"afterHit",oncePerMs:1000,when:[{test:"eventSideIsOwner"},{test:"contextAtLeast",key:"shieldAbsorbed",value:1}],actions:[{op:"haste",targets:{side:"owner",category:"shield",active:true},amount:{from:"sourceRarity",values:[0.2,0.3,0.45,0.7]}}]}],d:"Gain 12 shield. Once a second, absorbing a blow sets your shield wares 0.2 ahead."}`
- Feasibility: the mirrorbastion skeleton: afterHit with oncePerMs, contextAtLeast shieldAbsorbed (set for merchant hits and for item-shield absorption), plural haste over category shield. The rampart's itemShield absorption also sets shieldAbsorbed, so the rampart taking hits drives the loop.
- Fusion economy: payoff scales with rarity and with shield-ware count, the Architect's own count synergy. Silver at 0.3 per absorb per second across three shield wares approaches a permanent Quickhands for the defensive half of the board. Competes with aegis for the big-shield slot; keystone wins on shield-dense boards.
- Interactions: under Fortified (early storm) absorb frequency rises exactly when he needs it.

---

## 7. The Silkblade (id silkblade, tag dmg)

Hero rule recap: Measure Twice, Strike Once, her fastest weapon alternates a guaranteed critical activation with a skipped one (mod src/data.js:314; centerpiece by lowest cd at engine.js:323 to 330; skipped beats trigger no hooks, verified).

### Silk Stiletto (sig A)

- Rule text: "Deal 6, faster than anything in the souk. Overkill on a broken ware carries half through to the merchant."
- Fields: `stiletto:{n:"Silk Stiletto",size:1,tier:2,cat:"dmg",cd:1.8,fx:{dmg:6},sig:"silkblade",hooks:[{on:"afterHit",when:[{test:"actorIsSource"},{test:"contactKind",value:"item"},{test:"destroyed"},{test:"contextAtLeast",key:"overkill",value:1}],actions:[{op:"merchantHit",side:"enemy",amount:{from:"context",key:"overkill",multiply:0.5,round:true}}]}],d:"Deal 6, faster than anything in the souk. Overkill on a broken ware carries half through to the merchant."}`
- Feasibility: the cinderhook afterHit skeleton at multiply 0.5; overkill context set in resolveDamage. cd 1.8 undercuts fangs (2.0), so buying it claims her centerpiece role at the next fight.
- Fusion economy: this card IS the hero decision. Her rule halves activation count, so a stiletto strikes once per 3.6 seconds, every one a guaranteed crit: 12 at bronze, 24 at silver. The overkill rider matters because forced crits on small wares overkill constantly, and half carries through. Silver competes head-on with keeping fangs as the centerpiece (fangs silver hits 18 crit); the stiletto wins on the rider.
- Interactions: crit doubling lives in resolveDamage; the rider fires on the post-crit overkill, so crits feed it quadratically. Swift enchant (need:"cd") lowers cd further, tightening her claim; Winged is need:null and does not apply.

### Loom of Moments (sig B)

- Rule text: "Deal 10 and set every other blade 0.2 ahead."
- Fields: `loom:{n:"Loom of Moments",size:2,tier:2,cat:"dmg",cd:5.5,fx:{dmg:10},sig:"silkblade",hooks:[{on:"afterActivate",when:{test:"actorIsSource"},actions:[{op:"haste",targets:{side:"owner",category:"dmg",active:true,excludeSelf:true},amount:{from:"sourceRarity",values:[0.2,0.3,0.45,0.7]}}]}],d:"Deal 10 and set every other blade 0.2 ahead."}`
- Feasibility: plural haste, same shape as Quicksilver Dose. Hasting her centerpiece accelerates both its crit beats and its skipped beats equally, so the loom raises her crit frequency, never her skip ratio.
- Fusion economy: silver at 15 gold is a 0.3 board-wide pump on a 5.5 cycle, a Brass Hourglass that scales with rarity and is not adjacency-bound. A Silkblade running stiletto plus loom plus one big finisher is a distinct silhouette from the Knifegrinder's oilstone tower, which is exactly the two-dmg-heroes-feel-different goal.

---

## 8. The Ash Collector (id ash, tag util)

Hero rule recap: One True Funeral, only the first friendly rattle resolves each fight, twice; all later rattles suppressed (mod src/data.js:316; compileRattle engine.js:719 to 732). His build-identity problem is structural: the only player rattle wares today are treasure uniques, so his rule has nothing to buy. These signatures fix that with the existing rattle field, a shipped data surface (playerFightItems carries def.rattle; baseRattle resolves spawn and hasteMates).

### Funerary Urn (sig A)

- Rule text: "Bulwark. It guards everything, and when it shatters, something walks out of the ash."
- Fields: `urn:{n:"Funerary Urn",size:2,tier:2,cat:"util",cd:0,bulwark:true,integMul:1.6,fx:{},sig:"ash",rattle:{spawn:{nm:"Risen Ash",g:"g-risenash",cd:2.5,integ:18,fx:{dmg:8}}},d:"Bulwark. It guards everything, and when it shatters, something walks out of the ash."}`
- Correction applied from review: the flavor line no longer says "it sells nothing". wareSaleValue returns SELLV by size with no per-item override, so a size-2 urn sells for 2 gold; there is no zero-sale mechanism and none is proposed. The line was rewritten.
- Feasibility: bulwark plus integMul is the brassbuckler shape; rattle spawn replaces in place with fresh timers, and under One True Funeral the first urn's spawn resolves twice (the repeatSpawn queue), landing two Risen Ash bodies from one death, sequentially in the same slot. Spawn glyph g-risenash needs a sprite symbol (test plan).
- Fusion economy: the cleanest fusion story in the doc because his hero rule makes duplicate copies actively bad, a second unfused urn's rattle is suppressed dead weight, while fusing three into a silver produces one body with x1.7 integrity whose single funeral still double-spawns. Fusion is rule-compliance, not just value. Honest limit: spawn payloads do not scale with rarity (the spawn spec's fx and integ are used raw), so a diamond urn spawns the same 8-damage Risen Ash; the diamond buys soak time, not spawn power. The rarity-scaled-spawn idea is in Rejected with the change it would need.
- Placement note: Funerary Urn is a bulwark, and bulwark preempts position in targeting, so it forces enemy weapons onto itself while it stands. That is the intended staging (it protects the Bone Chime), and the "leftmost target" language from an earlier draft is dropped because a bulwark is the target regardless of slot.

### Bone Chime (sig B)

- Rule text: "When it breaks, the survivors rage a little. When any other keepsake breaks, the whole stall hurries 0.2."
- Fields: `bonechime:{n:"Bone Chime",size:1,tier:2,cat:"util",cd:0,fx:{},sig:"ash",rattle:{hasteMates:0.2},hooks:[{on:"destroyed",when:[{test:"eventSideIsOwner"},{test:"victimNotSource"},{test:"victimHasRattle"}],actions:[{op:"haste",targets:{side:"owner",active:true},amount:{from:"sourceRarity",values:[0.2,0.3,0.5,0.8]}}]}],d:"When it breaks, the survivors rage a little. When any other keepsake breaks, the whole stall hurries 0.2."}`
- Feasibility: rattle hasteMates is the azhfang verb (permanently cuts survivor cooldowns). The hook is gravebell's trigger set with plural haste. Its own death does not fire its own hook (burySource precedes the destroyed trigger, and there is no allowDead), so the card's two halves never double-dip. Note this haste op resolves correctly from a dead source because haste acts on the surviving targets, not on the chime; contrast the burn and poison ops, which guard on a live source and would fizzle from the grave.
- Fusion economy: bronze is 3 gold of glue; the decision is that chime and urn compete for the one funeral. If the chime dies first, its hasteMates rattle IS the true funeral, resolved twice, and the urn's spawn is suppressed. Board order and the urn's bulwark decide which funeral the run honors, and the player controls it: the urn's bulwark forces weapons onto the urn, protecting the chime, so the default is urn-first, chime-as-insurance.

---

# Part B: Synergy-count payoff wares

Feasibility ruling first: the hook layer cannot count board state directly. There is no board-count condition and no count value source; a countAtLeast test or from:"count" source would be new verbs, in Rejected ideas. Counting is faked two lawful ways, both shipped:

1. Plural-target actions: an action with a `targets` object selector applies to every live match. Effect magnitude equals matching ware count. Precedent: bazaarcompass, phoenixbell's plural haste.
2. Category activation frequency: afterActivate with actorSideIsOwner plus actorNotSource plus actorCategory, accumulated through every:N or stateAdd. Trigger rate scales with how many wares of the category you field and how fast they cycle. Precedent: blacklotuspress.

All four payoff wares are hero-agnostic, non-unique, acquisition shop, and fuse normally. They enter the treasure pool (treasureWareIds passes non-unique wares), which changes rollTreasure picks for fixed seeds, so 0.94 carries a MAP_VERSION bump and an approved regeneration of the Quick map hash ledger. R8 set this precedent; it is a recorded step, not drift. They also break the routeShop.length pin (31 to 35), recorded the same way.

Centerpiece-claim correction applied from review: a count ware with `cat` matching a hero centerpiece (burn, shield) can steal that hero's rule because prepareRules reads the ware's own cat. Torchbearers' March (burn) and Shieldwrights' Round (shield) are set to `cat:"util"` so they cannot claim Last Light or Living Rampart under those heroes; they still count the target category through their trigger's actorCategory test, which reads the ACTOR's category, not the payoff ware's. The cost is that these two lose their category's shop weighting (they weight as util). Poisoners' Procession keeps `cat:"poison"` because the Venom Broker has no leftmost-poison centerpiece to steal, and Drummer keeps `cat:"util"`. This is a real tradeoff; Open question 6 asks whether Robbie prefers the flag-and-keep-cat alternative.

### Drummer of the Souk (weapon count)

- Rule text: "Each beat sets every blade you field 0.35 ahead. More blades, more thunder."
- Fields: `drummer:{n:"Drummer of the Souk",size:2,tier:2,cat:"util",cd:6,fx:{},hooks:[{on:"afterActivate",when:{test:"actorIsSource"},actions:[{op:"haste",targets:{side:"owner",category:"dmg",active:true,excludeSelf:true},amount:{from:"sourceRarity",values:[0.35,0.5,0.75,1.1]}}]}],d:"Each beat sets every blade you field 0.35 ahead. More blades, more thunder."}`
- Count math: payoff per 6-second cycle equals amount times weapon count. At bronze with 2 weapons it is a weak hourglass; at 4 weapons it is 1.4 ware-seconds per beat. A silver drummer on a 2-weapon board is strictly worse than a second weapon, which keeps the generic tempo line honest.
- Feasibility: identical cites to Loom of Moments; a cd-6 ware with empty fx compiles a fire event plus the afterActivate hook.

### Poisoners' Procession (poison count)

- Rule text: "Every third poison activation in your stall adds 1 more to the foe."
- Fields: `procession:{n:"Poisoners' Procession",size:1,tier:2,cat:"poison",cd:0,fx:{},hooks:[{on:"afterActivate",every:3,when:[{test:"actorSideIsOwner"},{test:"actorNotSource"},{test:"actorCategory",value:"poison"}],actions:[{op:"poison",targetSide:"enemy",amount:{from:"sourceRarity",values:[1,2,3,4]}}]}],d:"Every third poison activation in your stall adds 1 more to the foe."}`
- Count math: proc rate equals poison activations per second over 3, scaling with count and speed. Two vials proc it every 5.25 s; four poison wares every 2.6 s.
- Feasibility: the blacklotuspress second hook with every:3; cd-0 passive body precedent is blacklotuspress. op poison requires a live source, and this ware is a live passive, so it resolves.

### Torchbearers' March (burn count)

- Rule text: "Every second burn activation in your stall adds 1 burn."
- Fields: `march:{n:"Torchbearers' March",size:1,tier:2,cat:"util",cd:0,fx:{},hooks:[{on:"afterActivate",every:2,when:[{test:"actorSideIsOwner"},{test:"actorNotSource"},{test:"actorCategory",value:"burn"}],actions:[{op:"burn",targetSide:"enemy",amount:{from:"sourceRarity",values:[1,2,3,4]}}]}],d:"Every second burn activation in your stall adds 1 burn."}`
- Count math and feasibility: as Procession, op burn. cat:"util" so it never claims the Kilnkeeper's Last Light. Under the proportional burn decay, sustained application frequency is what burn builds buy, so this is the correct count currency. Kilnkeeper synergy is intentional but not gated: everyone can march, only kiln owns the bellows.

### Shieldwrights' Round (shield count)

- Rule text: "Every shield activation in your stall raises 1 more."
- Fields: `round:{n:"Shieldwrights' Round",size:1,tier:2,cat:"util",cd:0,fx:{},hooks:[{on:"afterActivate",when:[{test:"actorSideIsOwner"},{test:"actorNotSource"},{test:"actorCategory",value:"shield"}],actions:[{op:"shield",side:"owner",amount:{from:"sourceRarity",values:[1,2,3,4]}}]}],d:"Every shield activation in your stall raises 1 more."}`
- Count math: plus amount per shield activation; three shield wares on 4-to-5 second cycles yield roughly 0.65 times amount shield per second. cat:"util" so it never claims the Architect's Living Rampart.
- Feasibility: op shield side owner from a hook (materialize default owner). No every gate; the base rate is the gate.

---

# Part C: Pool-shaping Omens

Ground rules honored: an Omen is an ANOMALIES row whose `m` payload is read at fixed sites; the parity ledger pins every payload, so each new Omen adds a ledger row. Each new Omen also needs a `g` glyph (parity.test.js:148 asserts omen.n and omen.g and omen.d); Omens reuse existing item glyphs as the shipped Omens do. The first three below use only fields with shipped consumption sites, cited per field, and need zero logic code beyond the ledger row and glyph. The fourth uses the featured-tag channel and needs exactly one glue line, flagged.

Fusion-rate model: completion rate for a chased id is driven by (rolls seen) times (slots per roll) times (per-slot odds) plus parking capacity (freeze, vault). shopN moves slots; rerollCost moves rolls per gold; freezeDurationRounds moves parking; sellReturnsBaseCost moves the funding side.

### Omen: Deep Shelves

- Card: "Every stall shows six wares, but each costs 1 more gold."
- Payload: `m:{shopN:6,shopItemCostFlat:1}` with a `g` glyph (reuse g-ledger).
- Consumption: shopN at rollShop (composed through composeLantern at L5); shopItemCostFlat at warePurchaseCost.
- Economy: plus 50 percent sightings per roll raises triple completion for every chased line, while plus 1 per copy adds exactly plus 3 gold to a triple and plus 12 to a diamond. Net: fusion-friendly for focused buyers, punishing for buy-everything boards. Both fields ship today (Overstocked shopN 6, Bull Market shopItemCostFlat 1), recombined.

### Omen: The Patient Merchant

- Card: "The frost holds wares through three market rolls, but rerolls cost 2."
- Payload: `m:{freezeDurationRounds:3,rerollCost:2}` with a `g` glyph (reuse g-hourglass).
- Consumption: freezeDurationRounds at the freeze toggle and label (offer holds via setFrozenOffers and advanceFrozenOffers); rerollCost at rerollPrice.
- Card wording is verified honest: advanceFrozenOffers decrements a hold on every rollShop, and a reroll calls rollShop, so a hold is spent per roll including rerolls. The card says "market rolls", the game's own vocabulary (the freeze label prints "N rolls"), so the headline does not lie.
- Economy: shifts triple completion from reroll-hunting to freeze-parking. Interaction stated: at Lantern 6+ composeLantern forces freezeDisabled for every Omen except Silent Bazaar, which guts this Omen's benefit while its reroll tax stays; the reveal card must render the composed truth (the L5+ and L6+ composed-value rendering already exists). Acceptable and face-up.

### Omen: Lean Shelves

- Card: "Markets show only three wares. Sell your wares back for full price."
- Payload: `m:{shopN:3,sellReturnsBaseCost:true}` with a `g` glyph (reuse g-purse).
- Consumption: shopN at rollShop (composeLantern L5 delta floors at 3, no conflict); sellReturnsBaseCost at wareSaleValue.
- Correction applied from review: an earlier draft here (Thin Shelves, Fat Purses) paired shopN 3 with goldMul 1.5, claiming victory gold rose 50 percent. Verified false: goldMul is consumed only at adjustedVictoryIncome (ui.js:955), which wraps the income-ware stream, and route mode filters income wares out of shops, so goldMul multiplies approximately zero fight reward. Bull Market's card honestly says "Income" for exactly this reason. The Omen is rebuilt on sellReturnsBaseCost (a shipped, ledger-pinned field consumed at wareSaleValue) so it genuinely reshapes the economy: a thin 3-ware market pushes the player to churn and re-sell into fusion, and full sell-back funds the reroll hunt the thin shop forces. It is the anti-hoard night, and it needs no logic code. (If a true victory-gold Omen is wanted later, it needs a rewardGoldMul field consumed in planReward, an engine change, parked in Open questions.)
- Economy: per-roll sighting odds drop 25 percent while sell-back funds more rerolls, teaching the reroll-and-recycle-as-fusion-tool lesson the retention study wanted, and making tier-ups relatively cheaper than chasing, a deliberate diversity lever.

### Omen: Guild Charter (the one glue line)

- Card: "The guilds honor your craft: your own trade is featured tonight."
- Payload: `m:{}` plus a new field carried inside `m` so the parity ledger pins it: `m:{pinTag:"hero"}`, with a `g` glyph (reuse g-crown). Putting pinTag inside `m` (not top-level) is a correction from review: the omen ledger pins only `omen.m`, so a top-level field would be unguarded.
- Glue, identified precisely: in newRoute where tags are rolled, one added branch reads the composed Omen's `m.pinTag`; if it is "hero", set tags to [hero.tag, first rolled cat that differs]. heroId is already in scope. Everything downstream is untouched: shopTagWeight consumes the featured array at 2.2, the reveal card already prints featured tags, and the run record already stores them.
- Economy: this is the lever that lifts a hero's category, signature wares included, from 1.5 to 2.2, raising signature per-slot odds by about 45 percent for the night, without touching the settled HERO_SHOP_WEIGHT. Util-tag heroes (lender, ash) get their only possible featured night through it. Because the replay path carries recorded tags, history replays reproduce it for free.

---

# Rival generation, the mirror, and parity

- genRival filters candidates by `!ITEMS[id].unique` (engine.js:140), so every non-unique ware here technically enters its candidate pool. But in the shipping route game genRival is never called: route fights build monsters through buildFoe (encounter.js), and genRival's only live reference is a legacy export in main.js. So no rival can roll a signature ware in any fight the game currently stages. The parity ledger sanctions non-unique new wares when explicitly shop-ledgered; the SIGNATURE_WARES ledger extends that pattern. If a rival-based mode ever returns, genRival needs a `&&!ITEMS[id].sig` clause, which IS an engine edit and is parked in Open questions, not smuggled in.
- The Qareen mirror copies the player's own board through playerFightItems, which carries hooks, rattle, and crit. Signature and payoff wares appear in the mirror exactly when the player fields them, at 0.85 strength, and hero mods do NOT ride (the mirror's side rules come from the encounter builder, not the player rules merge), so an Ash Collector's mirrored urn rattles every time while his own honors one funeral. Lawful and worth a fixture.
- Golden combat traces: fixtures assemble explicit boards and pinned cfgs; adding ITEMS keys changes neither their item builds nor their rng streams (crit draws only occur for items with crit greater than 0, and no new ware joins any existing fixture). Additive-identity requirement: all existing goldens pass untouched in all three versions; every new hooked ware ships with its own new fixture and golden.
- Map determinism: 0.94 (payoff wares) moves treasure picks and requires the MAP_VERSION bump plus ledger regeneration. 0.95 (signatures) does not, because of the treasure sig exclusion. 0.96 (Omens) does not touch the map, but adding rows to ANOMALIES changes the Omen roll for a fixed seed; that is run-setup rng, not map rng, and the run-record replay path replays Omens by id, so history replays survive.

# Version split (one player-facing system per version)

- 0.94.0, the chorus: the four synergy-count payoff wares. Data plus 4 sprite symbols, parity ledger rows, routeShop count pin 31 to 35, new fixtures and goldens, MAP_VERSION bump with regenerated map hash ledger. No logic glue.
- 0.95.0, the signature: the sig and acquisition fields, all sixteen signature wares, the four gating clauses (ui.js:643, ui.js:1291, route-ui.js:185, route-run.js:100) and the treasure exclusion (map.js:83), plus 16 sprite symbols and g-risenash. SIGNATURE_WARES parity table, routeShop count pin 35 to 51. One system: hero signature wares; shipping all eight heroes at once is what makes it one system rather than eight balance patches.
- 0.96.0, the guild omens: four ANOMALIES rows with glyphs, omen parity ledger rows, and the single pinTag branch in newRoute. Reveal card and drawer already render everything needed. Extend the composeLantern per-field composition tests to the new Omens (the Lantern doc pins them against all 12; this makes it 16).

Order rationale, economy-first: payoff wares first because they thicken every category before signatures start pulling; signatures second so their odds compute against the final pool; Omens last because two are tuned against measured signature completion rates from the first two versions' Cloud Ledger telemetry.

# Rejected ideas

Recorded so they are not re-pitched without new evidence, each with the missing verb named.

- A countAtLeast hook condition or from:"count" value source (literal board counting). Needs new entries in hookCondition and hookValue. The plural-targets and activation-frequency fakes cover the design space.
- A lot-aware selector for Repossession Writ's foreclosure fallback. hookItemCandidates has no lot check, so the fallback selector finds living auctioned lots and never fires. Needs a one-line `!target.lot` filter in hookItemCandidates, an engine change; scheduled in Open questions, not shipped.
- A rewardGoldMul field for a victory-gold Omen. goldMul touches only the income stream (ui.js:955), never BASE_GOLD or bounty. A reward multiplier needs a new field consumed in planReward.
- A from-the-grave burn or poison burst (a dead ware that keeps applying status on later ally deaths). The burn and poison ops guard on a live source; allowDead only keeps the hook matching, not the op resolving. Needs a status op that resolves from a tombstoned source, an engine change. Haste-from-grave works (haste acts on survivors), which is why Bone Chime is lawful and a from-grave Cinder ware is not.
- An onCrit hook point for Silkblade support. COMBAT_HOOK_POINTS has no crit trigger. Overkill-carry is the lawful proxy.
- A "fastest" or "leftmost" position selector. Positions are rightmost, lowestIntegrity, highestDamage only; no-position plural targets hit every match.
- Gold-earning combat hooks for the Moneylender (a pocket or pay ware). pay routes F.lotPaid to the player at fight end, so a player-side pay ware would pay the player for auctioning the enemy, and pocket tallies theft FROM the player. Both fields have monster-side semantics only.
- Rarity-scaled rattle spawns (a diamond urn spawning a bigger Risen Ash). The spawn uses the spec's raw fx and integ; scaling by the dead ware's rarity is an engine change.
- Hero-specific enchant prefixes. Enchant riders are hard-coded in playerFightItems; a new prefix is an engine change.
- Signature wares as uniques. Excluded from the shop and from fusion by scarcity; defeats the brief.
- An Omen field that directly reweights shop categories (catWeightMul). Would need a new consumption site inside rollShop's weight loop; the featured-tag pin reaches the same 2.2 through an existing one.

# Test plan

- Hook validity: one unit test per new hooked ware asserting validateCombatHooks accepts its specs, and one behavior test per ware in the r8-test style pinning the proc against a constructed fight. The fixtures that most deserve a trace, because review flagged their class of bug: the oilstone all-weapons hone (confirm every active weapon is honed, not one), the alembic cascade under poisonTargetsItems (confirm it fires while alive and does NOT fire from its grave), the urn double-spawn under oneTrueFuneral, chime-versus-urn funeral ordering, keystone under oncePerMs, and the Writ auctioning successive weapons across activations. Assert zero guard trips on every new fixture.
- Golden traces: all existing goldens byte-identical in 0.94, 0.95, 0.96 (additive identity); new fixtures per hooked ware.
- Gating: across seeded runs, none of the four grant pools (rollShop, opening offense, Fresh Stock, Gate Camp) offers a foreign sig; treasureWareIds output contains no sig ware; the Qareen mirror fixture carries the player's sig hooks. Add a route-sim `sig` clause so the branch harness matches.
- Deterministic-surface pins: routeShop.length assertion updated to 35 (0.94) then 51 (0.95), recorded; 0.94 MAP_VERSION bump with regenerated Quick hash ledger, one approved commit; 0.95 and 0.96 leave the map ledger untouched (asserted by running the existing map tests unmodified).
- Parity ledger: SIGNATURE_WARES and payoff rows added on the R8_WARES pattern with acquisition "shop"; new Omens added to the omen ledger with n, g, d present; pinTag pinned inside m.
- Sprites and glyphs: sprite symbol coverage for all 20 new item ids plus g-risenash, and a g glyph for each of the four Omens (hygiene and omen ledger tests).
- Composition: extend the composeLantern per-field tests to the four new Omens (shopN floors under Deep Shelves and Lean Shelves at L5; the Patient Merchant freeze under L6).
- Sims: node scripts/route-sim.js before and after each version; the sim-hero-omen branch matrix for the two haste-dense heroes and the Broker's poison share; the payoff wares' pick-versus-win deltas in Cloud Ledger telemetry after 30 instrumented reports.
- Layout: 844x390 first, shop cards render hook `d` text without truncation in the inspect sheet.

# Open questions

1. Signature tier placement: four heroes got a tier-1 sig A (kiln, apoth, venom, architect) for round-1 identity; the other four start at tier 2. Should all eight have a tier-1 opener, at the cost of crowding the 6-gold opening market?
2. HERO_SHOP_WEIGHT 1.5: leave settled and let Guild Charter carry the spike nights, or open a recorded rebalance to 1.7 once signature completion telemetry lands?
3. Repossession Writ's foreclosure rider needs a lot-aware selector (a one-line `!target.lot` filter in hookItemCandidates), an engine edit. Schedule it with a pinned test, or ship the Writ as disable-plus-integrity only and never add the rider?
4. Cinder Tithe's anti-shield variant: add a shieldPierce rider via modifyContact on beforeHit (sapperspick precedent) so the burn build has a real answer to shield courts, or leave the tithe as a health-forward payoff and let the Foreclosure Maul own anti-shield?
5. If a rival-based mode returns, genRival needs the `!sig` clause, an engine edit to schedule then, with a pinned rival-board test.
6. Count-payoff cat choice: Torchbearers' March and Shieldwrights' Round are set to cat:"util" so they cannot steal the Kilnkeeper's Last Light or the Architect's Living Rampart, at the cost of their category's shop weighting. Prefer that, or keep them cat-matched and flag the centerpiece-claim as a placement decision (the Bellows Boy pattern)?
7. Ash's Risen Ash and the four cd-0 passives are new paint targets; do they join the next art batch or ship on SVG medallions per the standing rule?
8. Guild Charter features the hero's own tag; should a contrarian Omen exist that features AGAINST the hero, or is that anti-fun on its face?
9. Codex second look (Codex is out until Thursday): this doc's mechanics were verified by three independent adversarial reads against the shipped engine but never executed against a live fight harness. Robbie should route the fixture-and-trace pass and a Codex review before any of the three versions is called build-ready.
