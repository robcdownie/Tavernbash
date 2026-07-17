# Monster Variance

Board Aspects and district Affixes for Tavern Bash. Target versions 0.94.0 (Aspects) and 0.95.0 (Affixes) or the next free slots after the unlock build and asset diet, one player-facing system per version. Status: drafted overnight 2026-07-16 to 17 by a design workflow (Curve Warden and Reader of Doors lenses; the Mechanist lens and the formal critique and sim-verify agents hit the session usage cap before running). The two surviving lenses converged on identical machinery down to the line cites, so the mechanics below are cross-confirmed. The difficulty numbers are NOT the lenses' self-reported figures alone: the author ran an independent headless harness (route-sim's fusion player model, shipped and gilded columns, 400 seeds) against a representative sample of the extreme variants, and that pass surfaced three band breaches the lenses under-reported, all folded in below and flagged. A full per-variant trace pass and a Codex second look (Codex out until Thursday) are the remaining gates before any number here is called final.

## Summary

Every one of the 23 monsters in MONSTERS (src/data.js:388 to 468) gains two hand-authored board Aspects beside its shipped board. An Aspect is a data-only alternative MONSTERS entry: same name, same glyph, same bounty, same signature mechanic, a different item mix, order, or timing. A deterministic seeded pick at encounter build time chooses which board stands behind a door; the pick is a pure hash of the run seed and the node id, so it is identical at scout, at fight, on boss retry, and on resume, and consumes no rng stream. Variant 0 is always the shipped board, byte-identical, reachable one time in three. Scouting already renders the real constructed side through buildFoe, so every Aspect is face-up at the door with no scout changes.

Separately, each non-Gate district draws a one-word Affix from its district boss's theme, shown on the scout panel and district header, implemented entirely as cfg.hooks rule entries using hook verbs that exist in engine.js today. Affixes apply to a district's monster and elite doors only, never the boss, never the Dragon Gate.

Design principles:

- Variance, not difficulty. Real play showed run difficulty concentrates at the Dragon Gate and fusion is the true economy; this feature exists so the road there reads differently each run. Every Aspect targets a first-attempt win-rate delta within a stated band of the shipped board on its own door; every Affix bends its district's pooled door rate by at most 4 points.
- An Aspect earns its slot only if it changes what a competent player does at the door: route around it, retime the fight, reorder the stall, buy a counter, or accept a gilded gamble. Pure stat reskins were rejected per monster.
- No engine changes for Aspects. monsterSide and monsterFightItems read MONSTERS[mid] by id (engine.js:91, engine.js:118); an Aspect is another id in that table. The pick lives in a new pure module and encounter.js. Verified: the author's harness injected each sampled Aspect into MONSTERS and fought it through the untouched monsterSide with zero engine edits.
- Affixes use only existing hook verbs. Every affix op appears in HOOK_ACTIONS (engine.js:219 to 225) and every hook point in COMBAT_HOOK_POINTS (engine.js:204 to 207); specs enter through the cfg.hooks array intake (engine.js:347 to 351) that shipped with R7.
- Identity is byte-exact. With the feature off (any run lacking the feature stamp, all resumed pre-bump runs, all direct engine calls), every fight, scout, map, and trace is byte-identical to today. Golden combat traces never pass cfg.hooks and build sides from base ids; the Quick map hash ledger is untouched because Aspects and Affixes never enter genMap.
- Settled decisions untouched: two health layers, targeting, economy, fusion thresholds, face-up scouting, the Gate contract (design-lantern-0.89.md:13).

## Hard constraints honored

- Variant 0 is the shipped board, the base MONSTERS entry itself, byte-identical, always reachable (pick index 0).
- Zero engine changes for Aspects: the resolver lives in a new module and encounter.js; monsterSide(mid, ctx) is called with a different data key and nothing else.
- Affix verbs all exist today, with line cites per affix. freeze is deliberately absent from every affix because it is not in HOOK_ACTIONS.
- Golden traces and the Quick hash ledger: Aspects add no map field and no map rng draw (the pick is a hash, not a rng() call), so genMap output is byte-identical at every setting. Traces pin fights built from base ids and an empty cfg.hooks; both unchanged.
- Monster identity: every Aspect keeps the signature mechanic, verified by a data lint (the Icebox still carries fx.freeze, the Azhdaha still has three rattle:{hasteMates} heads, the Roc still selfdestruct spawns, the Golem still runs ammo plus reload, the Collector keeps special:"gold", the Qareen keeps special:"mirror", the Monkey keeps pocket, Sandling keeps the empty board and a stormAt, the Ghul keeps targeting:"maxinteg", the Lamassu and Vizier keep bulwarks, the Auctioneer keeps disable plus pay plus flying).
- Difficulty honesty: each Aspect states a delta band and the door decision it changes. Method and independent sample below.

## The Aspect plumbing

### Data shape (src/data.js)

- Each Aspect is a full MONSTERS entry under a suffixed key: imp_v1, imp_v2, and so on. It carries the base monster's n, band, tag, glyph, hp, plus special, regen, stormAt where the base has them, plus two new fields: variantOf:"imp" (lint anchor) and vn:"Twin Wicks" (the scout tagline). It carries NO bounty: bounty is always read from the base id via node.monId at reward time (route.js:208), so the economy cannot fork. The base entry gains variants:["imp_v1","imp_v2"]. Monster-only fields (regen, stormAt, special, hp) may differ per Aspect; they flow through monsterSide untouched (engine.js:118 to 127).
- A registry: export const VARIANTS keyed by base id, or the variants array on each base; the two lenses split on this, either works. Variant keys never enter MONBAND, DISTRICTS, or LONG_DISTRICTS, so door pools, map budgets, and genMap are untouched. Nothing in rival generation reads MONSTERS (genRival filters ITEMS, engine.js:140), so rival fight parity is unaffected.

### The pick (a new pure module plus src/encounter.js)

A new pure module (aspects.js or the resolver in encounter.js) with its own copy of the FNV-1a hash32 that fightSeed already uses (route.js:27 to 31, currently file-local; export it, a one-word route-layer change):

```
export function aspectMonId(monId, seed, nodeId){
  const M = MONSTERS[monId];
  if(!M || !M.variants || !M.variants.length || seed==null || !nodeId) return monId;
  const idx = hash32((seed>>>0) + ':' + nodeId + ':aspect') % (M.variants.length + 1);
  return idx === 0 ? monId : M.variants[idx - 1];
}
```

Resolution lives inside buildFoe (encounter.js:30 to 35), the one shared constructor for scout, fight, and sim, so the three consumers cannot disagree. buildFoe resolves the key first, builds from it, and returns the resolved def so callers that read per-monster fields (the storm override) read built.def, not MONSTERS[base]. ctx gains seed (the map seed) and nodeId at the three call sites, all of which already hold them: ui.js startRouteFight (1242), route-ui.js combatPreview (343), route-sim.js simFight (135). The mirror and Lantern are unaffected: effectivePower's mirror exemption keys off MONSTERS[monId].special (encounter.js:24), which every Qareen Aspect preserves.

Determinism and save stability: the pick is a pure function of (map.seed, nodeId). Both persist in every save. The hash excludes the attempt counter, so a boss retry faces the exact board the player scouted (deliberately unlike fightSeed, which varies by attempt: the rng changes, the board does not). Long reprises re-roll naturally, an After Midnight door has its own node id. No rng() is consumed, so map generation draw counts are identical at every setting.

Identity requirement, stated as the Lantern doc states its own: with the feature stamp absent, aspectMonId returns the base id for all 23 monsters and buildFoe output deep-equals its current output for every combination of gild, power, and Omen, pinned by test. The stamp is run.variety = 1 at initRoute for new runs; resumed older runs lack it and are byte-identical. ROUTE_SAVE_VERSION and the route-run SCHEMA_VERSION bump; MAP_VERSION does not, because genMap gains no input.

### Two non-engine call-site fixes that ride the version

- Storm override threading: ui.js:1257 and route-sim.js:150 read MONSTERS[e.monId].stormAt from the base id. Both must read built.def.stormAt instead, or the Sandling and Qareen storm Aspects below would scout one fight and run another. Both sites already hold built.
- Scout additions (route-ui.js combatPreview, 337 to 354): one line under Health when a variant is active, from def.vn; and one line whenever the resolved def carries stormAt ("The simoom rises at 9s here."). The board needs nothing: the preview already renders the constructed side's items, hp, and regen from buildFoe, which is why Aspects are face-up for free.
- Plumbing note: the monster list at route-ui.js:844 must filter entries carrying variantOf so pickers never show Aspects as separate creatures; route-history.js:12's id validation Set is a harmless superset.

## Verification method and the independent sample

Two sources of numbers are reported below, kept separate for honesty:

1. Lens deltas: each surviving design lens ran its own scratch harness and reported first-attempt win-rate deltas. Those are the "lens" figures per entry.
2. Author's independent sample: because the formal sim-verify agent never ran, the author built a separate headless harness (variant-verify.mjs, scratchpad, not committed) that injects the candidate board into MONSTERS, builds on-curve player boards with route-sim's exact fusion model (buildBoard, tier and invested-gold per band), and runs shipped versus variant through the real createFight and runHeadless, 400 seeds each, PLAIN and GILDED. This pass covered six representative extremes across all four bands. It corroborated the lenses' direction in most cases and found three band breaches the lenses under-reported, all on the gilded or harder side. Those are flagged inline and drive open questions.

Independent sample results (delta = variant minus shipped, first-attempt win rate points):

| Aspect | plain ship to var | plain d | gilded ship to var | gilded d | verdict |
|---|---|---|---|---|---|
| rats_v2 Swarm | 100.0 to 100.0 | +0.0 | 40.0 to 78.5 | +38.5 | BREACH, trivial when gilded |
| peri_v2 One Pane | 88.0 to 80.0 | -8.0 | 59.0 to 56.3 | -2.7 | in band, swingy as intended |
| golem_v1 Stoked Hopper | 92.0 to 97.3 | +5.2 | 60.3 to 60.8 | +0.5 | in band |
| kark_v1 Pawing Charge | 92.8 to 91.8 | -1.0 | 63.0 to 52.3 | -10.8 | BREACH, gilded charge too hard |
| azhdaha_v2 Young Hydra | 56.3 to 61.8 | +5.5 | 5.0 to 3.3 | -1.8 | in band, noisy at the floor |
| matron_v1 Doting | 81.5 to 74.0 | -7.5 | 8.0 to 0.0 | -8.0 | BREACH, boss band is +/-4 |

Caveats stated plainly: the harness uses a fixed 30 s storm rather than per-band storm timing, does not gild the player board, and is a competent-baseline proxy exactly like route-sim, so read the deltas as directional and the band verdicts as flags for the build-time trace pass, not as final tuning. Standard error at 400 seeds is roughly 2 to 3 points. Baseline sanity held: gilded Azhdaha near 5 percent and gilded Matron near 8 percent match the known cliff shape.

The three breaches and their fixes are folded into the entries below. The takeaway for the build: gilding (L8 Gilded Streets) is the stress test that the lenses' plain-only harnesses missed, because a swarm of 1-damage bodies barely scales under gild while a shipped board of real weapons does, and a charge or regen Aspect compounds under gild. Every Aspect's gilded column must be traced before ship, not just its plain column.

## The Aspects, all 23 monsters

Format per monster: variant 0 is the shipped board (data.js line cite), then each Aspect with its exact data literal, the lens delta (plain / gilded where given), the door decision it changes, and interactions. Rarity frames: every Aspect item scales identically to shipped items because gild and power multiply through monsterFightItems (engine.js:96 to 116) with no per-item exceptions.

### District 1, Back Alleys (threat 1 to 3, storm 32.5s to 29.5s)

Curve note: D1 doors are near-free at Lantern 0 by design. Plain deltas mostly express as fight-length and economy texture and become real win-rate deltas only under gilding (L8 streets), which is exactly where the independent sample found the risk.

1. Lamp Imp (imp, data.js:389 to 391). Shipped: one Ember Spark, cd 3, dmg 4, integ 10. Bounty 3 gold plus a dagger.
- imp_v1 "Twin Wicks": `board:[{nm:"Ember Spark",g:"g-torch",size:1,cd:3,integ:8,fx:{dmg:3}},{nm:"Ember Spark",g:"g-torch",size:1,cd:3,integ:8,fx:{dmg:3}}]`. Lens 0.0 / 0.0. Decision changed: a single slow weapon overkills one wick and eats a swing from the other; multi-hit openers clear it clean. (The imp_v1 board literal in the source design carried an editing typo; the corrected two-spark board is above.)
- imp_v2 "Wick Thief": `board:[{nm:"Ember Spark",g:"g-torch",size:1,cd:3,integ:10,fx:{dmg:3}},{nm:"Stolen Wick",g:"g-torch",size:1,cd:4,integ:10,fx:{dmg:2,burn:1}}]`. Lens 0.0 / 0.0. Decision changed: the first burn ticks of the run; a bandage on the opening board earns its slot.

2. Souk Rats (rats, 392 to 394). Shipped: four Rat Fangs, cd 2.5, dmg 2, integ 8. Known curve fact: the gilded rats door is the hardest normal door in the game for on-curve D1 boards (independent sample: 40 percent), flagged in open questions.
- rats_v1 "The Fat One": `board:[{nm:"Rat Fangs",g:"g-fangs",size:1,cd:2.5,integ:8,fx:{dmg:2}},{nm:"Rat Fangs",g:"g-fangs",size:1,cd:2.5,integ:8,fx:{dmg:2}},{nm:"The Fat One",g:"g-mace",size:2,cd:3.5,integ:20,fx:{dmg:5}}]`. Lens +4.8. Decision changed: mixed kill order; the big weapon the shipped rats punish now earns its keep against the 20-integrity body.
- rats_v2 "The Swarm": five Rat Fangs `{size:1,cd:2.5,integ:5,fx:{dmg:1}}`. Lens +4.8. INDEPENDENT SAMPLE BREACH: plain +0.0 (ceiling), gilded +38.5. Five 1-damage bodies barely scale under gild (round(1x1.5)=2) while the shipped four-fang board does, so the gilded Swarm is trivial where the shipped rats are the hardest normal door. Needs retune before ship: raise the base to dmg 2 so gild matters (round(2x1.5)=3), or drop to four tougher rats. Do not ship the 1-damage five-body board.

3. Rust Ghul (ghul, elite, 395 to 397). Shipped: one Corroded Cleaver, size 3, cd 9, dmg 18, integ 22, targeting:"maxinteg". The only D1 gold-bounty elite (2 gold, doubled to 4 gilded, the L7 hook).
- ghul_v1 "Patient Cleaver": `board:[{nm:"Corroded Cleaver",g:"g-hammer",size:3,cd:12,integ:22,fx:{dmg:26},targeting:"maxinteg"}]`. Lens 0.0 / 0.0. Decision changed: the race window widens to 12 seconds so nearly any board wins before the first swing, but a survived swing cripples your best ware; a hard deadline instead of a grind.
- ghul_v2 "Rusted Pair": `board:[{nm:"Rusted Hatchet",g:"g-hammer",size:2,cd:8,integ:14,fx:{dmg:9},targeting:"maxinteg"},{nm:"Rusted Hatchet",g:"g-hammer",size:2,cd:8,integ:14,fx:{dmg:9},targeting:"maxinteg"}]`. Lens 0.0 / 0.0. Decision changed: the bait ware is chewed twice per cycle, so bait play weakens and killing bodies strengthens.

4. Scalded Samovar (samovar, 398 to 400). Shipped: Boiling Spout, size 2, cd 5, burn 3, integ 18.
- samovar_v1 "Double Boiler": two spouts `{g:"g-chalice",size:1,cd:6,integ:12,fx:{burn:2}}`. Lens 0.0 / 0.0. Decision changed: staggered small burn packets instead of one kettle; one cleanse no longer zeroes the pressure (burn decays, so two small packets out-damage one big one over time).
- samovar_v2 "Overboiled": one spout `{size:2,cd:8,integ:20,fx:{dmg:4,burn:5}}`. Lens 0.0 / 0.0. Decision changed: a burst kettle; shield timing (burn is half-absorbed by shield) and one well-timed heal answer it.

5. Sandling (sandling, 429 to 431). Shipped: empty board, regen 1, stormAt:12. Identity is the storm race and the empty board; both Aspects keep both and vary only regen and the threaded storm override.
- sandling_v1 "Deep Sand": `regen:2, stormAt:14`. Lens 0.0 / +5.4 (regen gilds to 3, but two extra pre-storm seconds help the player more). Decision changed: more knitting to out-race; slow boards genuinely consider Slip Past.
- sandling_v2 "Sudden Sand": `regen:1, stormAt:9`. Lens 0.0 / 0.0. Decision changed: the storm is nearly immediate; boards with a first activation before 9s clear clean, 5.5s-cd boards eat two storm ticks. L4 interaction: the Lantern offset sums (9000 minus 2000 stays above the 6000 floor).

6. Pilfer Monkey (monkey, 432 to 434). Shipped: Sticky Paws, cd 3, dmg 3, integ 14, pocket:1. Bounty 8 gold with drain (doubled to 16 gilded). The purest economy door, so its Aspects are priced in gold, not win rate.
- monkey_v1 "Two Thieves": two paws `{size:1,cd:3.5,integ:10,fx:{dmg:2},pocket:1}`. Lens 0.0 / 0.0 win; pocketed 4.5 to 7.1 plain, 5.5 to 9.2 gilded. Decision changed: the bounty melts almost twice as fast; opening burst is worth real gold, and at L8 the gilded 16-gold prize behind two thieves is the sharpest gold gamble in D1.
- monkey_v2 "Greedy Paws": one paw `{size:1,cd:2.5,integ:18,fx:{dmg:3},pocket:1}`. Lens 0.0 / minus 5.0; pocketed 5.6 / 8.2. Decision changed: tougher paw, faster pocket; you pay for the same prize in health or gold.

### District 1 boss

7. Ghul Matron (matron, boss, 426 to 428). Shipped: hp 160, regen 2, Venom Kiss cd 4 poison 3 integ 24. Boss Aspects are tighter than door Aspects (retry math and Gate Camp Mend ride on boss rates); band is plus or minus 4.
- matron_v1 "Doting": `regen:3, board:[{nm:"Venom Kiss",g:"g-serpent",size:2,cd:4,integ:24,fx:{poison:2}}]`. Lens minus 1.5 / minus 8.3. INDEPENDENT SAMPLE BREACH: plain minus 7.5, gilded minus 8.0, both outside the boss plus or minus 4 band. The extra regen turns the fight into a pure sustain race that competent burst-light boards lose. Needs retune: regen:2 (unchanged from shipped) with a smaller poison, or regen:3 with a shorter fight, retraced. The lens flagged only the gilded column; the sample shows plain is out of band too.
- matron_v2 "Spiteful": `regen:1, board:[{nm:"Venom Kiss",g:"g-serpent",size:2,cd:4,integ:24,fx:{poison:3}},{nm:"Grave Nail",g:"g-dagger",size:1,cd:4,integ:12,fx:{dmg:3}}]`. Lens 0.0 / minus 3.8. Decision changed: she trades mending for a knife; cleanse cadence and a shield answer her instead of raw dps.

### District 2, The Souk (threat 4 to 6, storm 28s to 25s)

8. Brass Lamassu (lamassu, 401 to 403). Shipped: Bulwark Bull integ 60 bulwark, Horn Chime cd 4 dmg 9.
- lamassu_v1 "Thick Wall": `board:[{nm:"Bulwark Bull",g:"g-brassbuckler",size:3,cd:0,integ:80,fx:{},bulwark:true},{nm:"Horn Chime",g:"g-mace",size:1,cd:4,integ:12,fx:{dmg:8}}]`. Lens 0.0 / +4.2. Decision changed: the wall costs one more weapon cycle to breach but the chime bites softer; anti-bulwark burst shopping matters more, racing less.
- lamassu_v2 "Twin Chimes": `board:[{nm:"Bulwark Bull",g:"g-brassbuckler",size:3,cd:0,integ:45,fx:{},bulwark:true},{nm:"Horn Chime",g:"g-mace",size:1,cd:5,integ:10,fx:{dmg:7}},{nm:"Horn Chime",g:"g-mace",size:1,cd:5,integ:10,fx:{dmg:7}}]`. Lens 0.0 / +2.5. Decision changed: thinner wall, more behind it; breach fast and the chimes never stack.

9. Karkadann (kark, elite, 404 to 406). Shipped: one Gore Horn, cd 11, dmg 55, integ 30.
- kark_v1 "Pawing Charge": `board:[{nm:"Pawing Hooves",g:"g-hourglass",size:1,cd:5,integ:12,fx:{},charge:{t:1,s:2}},{nm:"Gore Horn",g:"g-hammer",size:3,cd:13,integ:30,fx:{dmg:55}}]`. The hooves use the existing charge verb (Ifrit Bellows mechanism) aimed at slot 1, leftmost so player weapons chew them first. Lens minus 1.7 / minus 6.3. INDEPENDENT SAMPLE: plain minus 1.0 (matches), gilded minus 10.8 (BREACH, outside plus or minus 8). The charge compounds under gild: a gilded horn that starts accelerated is brutal. Needs retune: reduce the charge (s:1 not s:2) or the gilded case only, retraced. A genuinely good kill-order fight when tuned; the mechanic is worth keeping.
- kark_v2 "Second Answer": `board:[{nm:"Gore Horn",g:"g-hammer",size:3,cd:9,integ:34,fx:{dmg:38}}]`. Lens +0.3 / +2.7. Decision changed: the one-shot threshold drops from 55 to 38; shield and heal sizing against the swing is different arithmetic.

10. The Debt Collector (collector, boss, 407 to 409). Shipped: hp 200 plus 15 per held gold, Ledger Blade cd 5 dmg 6 plus 2 per held gold (special:"gold"). Both Aspects copy special:"gold". Measured at 5 held gold, the sim's typical arrival purse.
- collector_v1 "Two Ledgers": `board:[{nm:"Ledger Blade",g:"g-sword",size:2,cd:8,integ:20,fx:{dmg:4}},{nm:"Ledger Blade",g:"g-sword",size:2,cd:8,integ:20,fx:{dmg:4}}]`. Lens minus 0.7 / minus 0.6 at 5 gold. Decision changed: each blade gains 2 per held gold, so arriving rich is punished twice; the spend-before-the-boss rule becomes the whole fight.
- collector_v2 "The Counting Frame": `board:[{nm:"Ledger Blade",g:"g-sword",size:2,cd:5,integ:24,fx:{dmg:6}},{nm:"Counting Frame",g:"g-ledger",size:1,cd:6,integ:14,fx:{shield:8}}]`. Lens minus 1.3 / minus 7.0. Watch the gilded column against the boss band; the shield lengthens the fight and every extra second is another gold-scaled swing. Poison (ignores shield) and burst answer, stalling does not.

11. The Icebox (icebox, 435 to 437). Shipped: Cold Shank cd 4 dmg 7, Frost Vent cd 6 freeze 3 integ 45.
- icebox_v1 "Double Glazed": two Frost Vents `{g:"g-tower",size:2,cd:5,integ:30,fx:{freeze:2}}`. Lens 0.0 / +0.7. Decision changed: no knife; the only damage is the storm, and freeze always lands on your leftmost intact ware, so wide boards shrug it and one-weapon boards can be locked into a pure storm race.
- icebox_v2 "Cold Cellar": `board:[{nm:"Cold Shank",g:"g-dagger",size:1,cd:4,integ:14,fx:{dmg:6}},{nm:"Frost Vent",g:"g-tower",size:2,cd:7,integ:45,fx:{freeze:4}}]`. Lens 0.0 / minus 1.0. Decision changed: rarer, longer locks; your leftmost-slot choice is the read.

12. Glass Peri (peri, 438 to 440). Shipped: three Shard Wings cd 3 dmg 5 integ 6 crit 0.35.
- peri_v1 "Mirror Shards": four wings `{cd:3,integ:5,fx:{dmg:4},crit:0.35}`. Lens minus 4.7 / minus 4.2. Decision changed: more bodies, same glass; splash-less boards spend four cycles clearing.
- peri_v2 "One Perfect Pane": two wings `{g:"g-crossbow",cd:2.5,integ:12,fx:{dmg:7},crit:0.5}`. Lens minus 7.7 / minus 5.0. INDEPENDENT SAMPLE CONFIRMS: plain minus 8.0, gilded minus 2.7. The swingiest door in the Souk by design; crit variance doubles 7s into 14s half the time, so the honest play is extra shield rather than expecting the mean. On the plain band edge; keep but watch.

13. Qareen (qareen, 413 to 414). Shipped: mirror, hp 0.85 of yours, board mirrors yours at 0.85. The 0.85 is engine-fixed, so Aspects vary only the def fields the mirror path still reads: regen and the storm override. Both keep special:"mirror" and the empty board.
- qareen_v1 "Fevered Reflection": `regen:1`. Lens 0.0 / minus 7.2 (regen gilds to 2). Decision changed: the mirror knits and you do not; pure stat-parity boards lose the long game, so you want overkill or poison. Lantern note: the mirror stays exempt from L1 power (the Qareen ruling); regen is a def field, not a power multiplier, and gilding already scales shipped monster regen the same way, so no new exemption. Flagged for the Codex look in open questions regardless.
- qareen_v2 "Restless Glass": `stormAt:20`. Lens 0.0 / minus 6.7. Decision changed: the storm arrives 7 to 8 seconds early into a fight where the gilded mirror out-pools you, so turtling favors the reflection; you race it instead.

### District 3, Palace Quarter (threat 7 to 9, storm 23.5s to 20.5s)

14. Nasnas (nasnas, 421 to 425). Shipped: five halves, one per category, order buckler, dagger, torch, vial, bandage.
- nasnas_v1 "The Other Half": same five slots rebalanced toward blade and status: `[{nm:"Half Buckler",g:"g-buckler",size:1,cd:4,integ:14,fx:{shield:14}},{nm:"Half Dagger",g:"g-dagger",size:1,cd:3,integ:14,fx:{dmg:14}},{nm:"Half Torch",g:"g-torch",size:1,cd:3,integ:14,fx:{burn:4}},{nm:"Half Vial",g:"g-vial",size:1,cd:3,integ:14,fx:{poison:4}},{nm:"Half Bandage",g:"g-bandage",size:1,cd:4,integ:14,fx:{heal:16}}]`. Lens +3.0 / minus 0.7. Decision changed: weight moves from shield-and-heal to blade-and-status; cleanse capacity is the read instead of burst.
- nasnas_v2 "Reordered": the shipped five stats exactly, order reversed (bandage, vial, torch, dagger, buckler). Lens 0.0 / minus 4.0. Decision changed: pure kill-order variance at zero stat cost; your weapons eat the bandage first and the buckler last, so the fight curve inverts. The template reorder Aspect: identical budget, different fight.

15. Roc Egg (roc, 441 to 444). Shipped: The Egg, cd 15, integ 80, selfdestruct, hatches a dmg 22 Hatchling.
- roc_v1 "Thin Shell": `board:[{nm:"The Egg",g:"g-rocegg",size:3,cd:12,integ:60,fx:{},selfdestruct:true,rattle:{spawn:{nm:"Roc Hatchling",g:"g-hatchling",cd:2,integ:30,fx:{dmg:18}}}}]`. Lens +0.3 / +0.3. Decision changed: the crack-it-first threshold drops (60 in 12s), and failing is gentler.
- roc_v2 "Watched Nest": `board:[{nm:"Broodwatcher",g:"g-fangs",size:1,cd:3,integ:12,fx:{dmg:4}},{nm:"The Egg",g:"g-rocegg",size:3,cd:15,integ:70,fx:{},selfdestruct:true,rattle:{spawn:{nm:"Roc Hatchling",g:"g-hatchling",cd:2,integ:30,fx:{dmg:22}}}}]`. Lens minus 0.4 / minus 3.0. Decision changed: a guard stands leftmost, so your weapons chew it while the shell timer runs; the egg hatches far more often, and the fight becomes hatchling-handling. selfdestruct plus rattle.spawn untouched.

16. Simurgh Fledgling (simurgh, 445 to 447). Shipped: Tail Feather cd 2 dmg 8, Preen cd 6 hasteAll 2.
- simurgh_v1 "Molting": `board:[{nm:"Tail Feather",g:"g-feather",size:1,cd:2,integ:10,fx:{dmg:6}},{nm:"Tail Feather",g:"g-feather",size:1,cd:2,integ:10,fx:{dmg:6}},{nm:"Preen",g:"g-hatchling",size:2,cd:8,integ:24,fx:{hasteAll:2}}]`. Lens minus 2.2 / minus 5.5. Decision changed: Preen feeds two feathers, so killing the preener before its cd 8 window is the fight.
- simurgh_v2 "Preening Twice": `board:[{nm:"Tail Feather",g:"g-feather",size:1,cd:2.5,integ:14,fx:{dmg:9}},{nm:"Preen",g:"g-hatchling",size:2,cd:5,integ:20,fx:{hasteAll:1.5}}]`. Lens +0.8 / +1.0. Decision changed: smaller, faster tempo pulses; freeze and disarm devalue slightly, raw race improves.

17. Shahmaran (shahmaran, elite, 415 to 417). Shipped: Serpent Crown poison 4 cd 5, Coiled Court heal 10 cd 6.
- shahmaran_v1 "The Court Convenes": `board:[{nm:"Serpent Crown",g:"g-serpentcrown",size:2,cd:6,integ:24,fx:{poison:3}},{nm:"Coiled Court",g:"g-sanctum",size:2,cd:6,integ:18,fx:{heal:7}},{nm:"Court Adder",g:"g-serpent",size:1,cd:4,integ:12,fx:{dmg:5}}]`. Lens +0.3 / minus 0.5. Decision changed: three bodies dilute your target stream; the adder is chip that makes the outlast plan leak.
- shahmaran_v2 "Crowned Twice": two Serpent Crowns `{g:"g-serpentcrown",size:2,cd:7,integ:20,fx:{poison:5}}`. Lens +0.5 / minus 0.5. Decision changed: no sustain, double venom; cleanse throughput is the whole fight, racing is a trap.

18. Marid of the Cistern (marid, elite, 418 to 420). Shipped: Tide Wall shield 25 cd 6, Spring heal 12 cd 5, Drip dmg 4 cd 3.
- marid_v1 "High Tide": `board:[{nm:"Tide Wall",g:"g-tidewall",size:2,cd:6,integ:30,fx:{shield:15}},{nm:"Tide Wall",g:"g-tidewall",size:2,cd:6,integ:30,fx:{shield:15}},{nm:"Drip",g:"g-vial",size:1,cd:3,integ:10,fx:{dmg:4}}]`. Lens +0.7 / +2.3. Decision changed: no heal, all shield; poison lines walk through it, weapon lines grind.
- marid_v2 "Undertow": `board:[{nm:"Tide Wall",g:"g-tidewall",size:3,cd:7,integ:36,fx:{shield:25}},{nm:"Spring",g:"g-chalice",size:2,cd:5,integ:22,fx:{heal:10}},{nm:"Undertow",g:"g-vial",size:1,cd:4,integ:12,fx:{poison:2}}]`. Lens +0.7 / +3.3. Decision changed: the cistern poisons back; your own cleanse budget joins the fight.

19. Mint Golem (golem, elite, 448 to 450). Shipped: Coin Cannon cd 3 dmg 14 ammo 5, Coin Hopper cd 8 reload 2.
- golem_v1 "Stoked Hopper": `board:[{nm:"Coin Hopper",g:"g-coinhopper",size:1,cd:6,integ:20,fx:{reload:2}},{nm:"Coin Cannon",g:"g-coincannon",size:3,cd:3,integ:38,fx:{dmg:12},ammo:3}]`. Hopper leftmost. Lens +0.7 / +6.0. INDEPENDENT SAMPLE: plain +5.2, gilded +0.5, both in band, corroborates the direction. Decision changed: your weapons hit the hopper first, and once it falls the cannon holds an empty magazine after three shots; the fight is a supply raid.
- golem_v2 "Double Barrels": `board:[{nm:"Coin Cannon",g:"g-coincannon",size:3,cd:4,integ:30,fx:{dmg:10},ammo:4},{nm:"Coin Hopper",g:"g-coinhopper",size:1,cd:8,integ:14,fx:{reload:2}},{nm:"Coin Cannon",g:"g-coincannon",size:3,cd:4,integ:30,fx:{dmg:10},ammo:4}]`. Lens 0.0 / minus 0.7. Decision changed: heavy opening volley, then both barrels beg the hopper; survive the first eight shots and the fight halves.

### District 3 boss

20. Ifrit of the Kiln (ifrit, boss, 410 to 412). Shipped: Kiln Heart cd 7 burn 8, Bellows cd 5 charging slot 0 by 2s.
- ifrit_v1 "Backdraft": `board:[{nm:"Bellows",g:"g-hourglass",size:2,cd:5,integ:22,fx:{},charge:{t:1,s:2}},{nm:"Kiln Heart",g:"g-magma",size:3,cd:6,integ:34,fx:{burn:8}}]`. Bellows leftmost, charging slot 1. Lens 0.0 / minus 1.4. Decision changed: the accelerant is in front of your knives; kill it and the kiln slows, leave it and the kiln runs near cd 4.3. Same kill-order grammar as Pawing Charge, so it reads across the run. NOTE: given the Pawing Charge gilded breach, trace this charge boss's gilded and Long-reprise columns with the same suspicion.
- ifrit_v2 "Twin Kilns": two Kiln Hearts `{g:"g-magma",size:2,cd:9,integ:28,fx:{burn:6}}`. Lens minus 0.7 / +2.3. Decision changed: no bellows, staggered burn packets; cleanse cadence sizing replaces the kill-order puzzle.

### District 4, The Dragon Gate (threat 10 to 12, storm 19s to 16s)

Gate note: difficulty already concentrates here, so Gate Aspects are priced at half the door band (target plus or minus 5) and none may raise the gilded rate more than a point beyond shipped. The Lantern Gate contract is untouched: Aspects are not a Lantern rule and change no power, gilding, chip, or storm math; they are alternate data of the same weight class, present at Lantern 0.

21. The Azhdaha (azhdaha, Gate elite, 451 to 455). Shipped: three heads, cd 12, dmg 20, integ 50, each rattle:{hasteMates:0.5}. Both Aspects keep exactly three heads and all three rattles.
- azhdaha_v1 "Elder Heads": three heads `{cd:14,integ:45,fx:{dmg:26},rattle:{hasteMates:0.5}}`. Lens +1.4 / minus 2.3. Decision changed: bigger, slower bites; shield sizing against 26 per head, and each kill buys a longer quiet window.
- azhdaha_v2 "Young Hydra": three heads `{g:"g-fangs",size:2,cd:10,integ:55,fx:{dmg:16},rattle:{hasteMates:0.5}}`. Lens minus 0.6 / minus 7.0. INDEPENDENT SAMPLE: plain +5.5, gilded minus 1.8; both in the Gate band, but note the plain sign differs from the lens (the gilded Azhdaha near 5 percent makes deltas noisy at the floor). Decision changed: tougher heads that compound faster; killing heads becomes a cost as well as a win.

22. Night Auctioneer (auctioneer, Gate elite, 456 to 458). Shipped: The Gavel cd 5 dmg 12, Lot Caller cd 6 disable pay 3 flying. Pay lands win or lose, so these Aspects are also economy Aspects.
- auctioneer_v1 "Eager Gavel": `board:[{nm:"The Gavel",g:"g-gavel",size:2,cd:4,integ:40,fx:{dmg:11}},{nm:"Lot Caller",g:"g-ledger",size:2,cd:7,integ:14,fx:{disable:true},pay:4,flying:true}]`. Lens +0.7 / +5.8. Decision changed: fewer auctions at a higher fee; your best weapon survives longer. Gold gate: watched in the sim's net-gold check.
- auctioneer_v2 "Double Lots": `board:[{nm:"The Gavel",g:"g-gavel",size:2,cd:5,integ:40,fx:{dmg:11}},{nm:"Lot Caller",g:"g-ledger",size:2,cd:5.5,integ:14,fx:{disable:true},pay:2,flying:true}]`. Lens minus 1.0 / minus 4.5. Decision changed: the hammer falls often and pays little; wide boards of interchangeable weapons lose less per lot than one crowned diamond, a genuine anti-monoculture read at the exact door where monocultures arrive.

23. Grand Vizier of Ash (vizier, Gate boss, 459 to 467). Shipped: Ash Bulwark integ 90, Cinder Core dmg 6 burn 10, Frost Scepter freeze 3, Ash Chalice heal 20. Final boss, tightest band (plus or minus 4), because the Vizier's rate is the run's clear rate.
- vizier_v1 "The Receipts": shipped board with Ash Bulwark integ:110 and Ash Chalice fx:{heal:16}. Lens minus 1.0 / minus 2.4. Decision changed: a longer breach, a softer engine behind it; burst sizing against the wall.
- vizier_v2 "Cold Accounting": shipped board with Frost Scepter cd:8, fx:{freeze:4} and Cinder Core fx:{dmg:6,burn:9}. Lens minus 0.3 / minus 0.7. Decision changed: rarer, longer locks; the leftmost-slot question decides the fight. All four signature pieces present in both, and the Gavel's auction still has its lawful fx.dmg target (the 0.88.0 note is preserved).

## The district Affix system

### Shape

- export const AFFIXES in data.js, keyed by district sourceId 1 to 3. Three affixes per district, each {id, w, d, hooks}: w the one player-facing word, d the scout sentence, hooks an array of hook specs in the exact R8-item format.
- The draw: `hash32((seed>>>0)+':'+district.id+':affix') % 3`, computed where the run initializes and whenever the map renders (pure, needs no storage). Salted by district.id, not sourceId, so a Long reprise district draws independently. No rng stream is consumed; the map hash ledger is untouched.
- Scope: nodes with type monster or elite, in districts where isGateDistrict is false. Never bosses (the boss prices the district; the affix must not double-charge the cliff), never either Gate (the Gate contract extends to affixes by rule).
- Wiring: startRouteFight (ui.js:1237) appends the district affix's hook specs, each stamped {side:"b", kind:"rule", sourceId:"affix_"+id}, to a hooks array passed through startFight opts into createFight cfg.hooks (array intake, engine.js:347 to 351; rule-kind ordering before item hooks per the registry sort). route-sim.js simFight passes the identical array. Affix hooks scale with nothing: gilding and L1 power multiply item fx at compile time and never touch hook amounts, so the affix prices the district floor while gilding prices its ceiling. Stated on the scout line by keeping every amount literal.
- Feature stamp: run.affix = 1 at initRoute from the affix version; absent on older runs, so resumed runs and all traces are byte-identical (no cfg.hooks means hookPoints stays empty and compileActivation emits no hookPoint frames). Affix hooks draw zero rng (no affix action carries crit, and the only hook-path rng is the crit draw guarded by action.crit greater than 0). Storm ticks never proc affixes (storm merchantHit actions carry no hookable flag and hitMerchant gates hit hooks on it).

### Scout panel wording, exact

- District header: after the district name span, a chip `<span class="rmaffix">Mending</span>`. Landscape 844x390: the chip shares the header row and never truncates; the word is the whole content.
- Node preview (combatPreview): for affected nodes, above the board list, a bold word and sentence from the affix d, e.g. "Mending. Wounds close in these alleys: this foe heals 2 whenever its wares strike you, at most once a second."
- The Omen drawer lists the current district's affix word and sentence under the Omen, in the slot the Lantern rules use.

### The nine affixes

Every op cited against HOOK_ACTIONS (engine.js:219 to 225) and its resolver; every test against hookCondition (439 to 472); throttles every (615 to 617) and oncePerMs (619 to 621). All nine pass validateCombatHooks (229 to 256). Measured delta is the pooled first-attempt win rate across that district's doors, plain, from the lens harness.

District 1, from Ghul Matron (she mends as fast as you can cut; poison tag, regen 2):
- Mending (lens minus 1.3): "Wounds close in these alleys: foes heal 2 whenever their wares strike you, at most once a second." `{on:"afterHit", oncePerMs:1000, when:[{test:"actorSideIsOwner"},{test:"contactKind",value:"merchant"}], actions:[{op:"heal", side:"owner", amount:2}]}`. heal resolves via resolveHeal; contactKind merchant afterHit fires from hitMerchant. Boss interaction: trains burst, the Matron answer.
- Venomed (lens minus 0.9): "The Matron's kiss rides every blade: foes' merchant strikes add 1 poison, at most once every 2 seconds." `{on:"afterHit", oncePerMs:2000, when:[{test:"actorSideIsOwner"},{test:"contactKind",value:"merchant"}], actions:[{op:"poison", targetSide:"enemy", amount:1}]}`. With the 0.82 decay, a lone stack ticks once for 1, so this is roughly 5 to 8 extra damage per D1 fight; texture, not a wall.
- Clinging (lens 0.0 pooled, build-dependent): "Grave-dust clings to your salves: your healing is a fifth weaker behind these doors." `{on:"beforeHeal", when:[{test:"eventSideIsEnemy"}], actions:[{op:"modifyHeal", mul:0.8}]}`. The measured zero is the weapon-heavy policy; heal-line boards and the Apothecary feel it, stated on the card by the word.

District 2, from The Debt Collector (gold, ledgers, the long count):
- Hoarding (lens minus 0.8): "Coin stands stacked as armor: foes begin the fight with 12 shield." `{on:"fightStart", actions:[{op:"shield", side:"owner", amount:12}]}`. Poison walks through it. Trains the poison pivot; neutral at the Collector, who never shields.
- Taxing (lens minus 0.3): "Interest accrues: every fourth activation by a foe's wares costs your merchant 2 health." `{on:"afterActivate", every:4, when:[{test:"actorSideIsOwner"}], actions:[{op:"merchantHit", side:"enemy", amount:2}]}`. Teaches racing, which also caps the Collector's gold-scaled blade.
- Foreclosing (lens minus 0.9): "Broken stock is repossessed: when one of your wares is destroyed, the foe heals 6." `{on:"destroyed", when:[{test:"eventSideIsEnemy"}], actions:[{op:"heal", side:"owner", amount:6}]}`. The destroyed context side is the victim's, so eventSideIsEnemy from side b means a player ware died. Trains integrity care.

District 3, from Ifrit of the Kiln (the kiln, the bellows):
- Smoldering (lens 0.0 pooled, concentrated on slow boards): "Kiln-heat rides every blow: foes' merchant strikes add 2 burn, at most once every 2 seconds." `{on:"afterHit", oncePerMs:2000, when:[{test:"actorSideIsOwner"},{test:"contactKind",value:"merchant"}], actions:[{op:"burn", targetSide:"enemy", amount:2}]}`. Hook burn is a literal amount and does not ride Omen burnMul (that applies at fx compile), stated so Wildfire nights do not surprise.
- Bellowed (lens minus 0.6): "The bellows breathe down every alley: a foe's strike quickens its leftmost working ware half a second, at most once every 2 seconds." `{on:"afterHit", oncePerMs:2000, when:[{test:"actorSideIsOwner"}], actions:[{op:"haste", target:{side:"owner", active:true}, amount:0.5}]}`. The selector's first candidate is the leftmost live cooldown ware.
- Scorched (lens minus 0.1): "You arrive singed: 3 burn clings to you as each fight begins." `{on:"fightStart", actions:[{op:"burn", targetSide:"enemy", amount:3}]}`. Decays in three ticks; the lightest affix by design.

### Affix pricing summary

All nine bend the pooled district door rate by 0.0 to minus 1.3 points plain in the lens harness, comfortably inside the 4-point gate, and none touches boss, Gate, loss chips, Resolve, or gold directly (Taxing's 2-health tick is the sharpest, and it is combat health, not Resolve). Under gilding and Lantern levels the flat amounts shrink relative to the fight, so affixes never compound the ceiling. The build-time trace pass must confirm the gilded and Long-reprise columns, since the Aspect sample proved plain-only harnesses miss the gilded stress.

## Rules considered and rejected

- Storing the variant index on map nodes at genMap: adds a field and rng draws, breaking the Quick hash ledger and the identical-draw-count invariant. The stateless hash gives the same determinism free.
- Weighted variant draws (50/25/25 toward shipped): defensible, but the retention brief wants repeat runs to differ; uniform ships first, weighting is an open question.
- Re-rolling the variant per boss attempt: scout dishonesty; the player scouted one board and Gate Camp math is priced on learning it.
- New monster ids in the door pools: changes DISTRICTS pool sizes, which the map generator's monster budget consumes exactly (the Palace Quarter column-consumption crash). Aspects never enter pools.
- Qareen mirror-scale Aspects (0.9 or 0.8 of the player): the 0.85 is hard-coded in monsterFightItems; changing it per Aspect is an engine change. Qareen varies by regen and storm only.
- Sandling board-item Aspects: the empty board is the identity.
- A freeze affix: freeze is not a hook action; disarm exists but renders as a freeze event and would bleed the Icebox's identity into a district word.
- Affixes at the Dragon Gate or on boss fights: the Gate contract and the boss-prices-the-district rule.
- Scaling affix amounts by gild or power: no existing surface carries a multiplier into hook values; flat amounts are the honest scout read.
- Variant-specific bounties: rewards read the base id and touching that couples economy to variance; gold stays identical across Aspects of a door except where the mechanic itself is economic (Monkey pocket, Auctioneer pay), which flows through existing fields.

## Test plan

Identity (build first):
- Resolver identity: with the stamp absent, aspectMonId returns the base id for all 23 monsters and buildFoe deep-equals current output across gild x power x all 12 Omens. Golden combat traces byte-identical. genMap output byte-equal regardless of feature state, asserted directly; the 0.88.0 Quick hash ledger passes unmodified.
- Affix identity: with the stamp absent no hooks are passed; a fixture fight asserts hookPoints remains empty and the event stream is byte-identical.
- Zero-rng proof: cfg.rngTap draw-count equality with and without each affix on crit-free fixture boards; and draw-count equality between two different Aspects of a crit-free monster (crit-bearing boards excluded by construction and covered by outcome tests instead).

Data lint (runs in npm test):
- Every VARIANTS key is a MONSTERS id; every listed Aspect exists, carries variantOf and vn, matches its base on n, band, tag, glyph.
- Signature invariants per monster as enumerated in the constraints section.
- Board legality: sizes sum at most 10; every item carries nm, g, size, cd, integ, fx. This lint would have caught the imp_v1 source typo.
- Affix lint: every hook op in HOOK_ACTIONS, every on in COMBAT_HOOK_POINTS, validateCombatHooks passes over all nine concatenated with every R8 item's hooks.

Determinism and parity:
- Same (seed, nodeId) resolves the same Aspect at scout, fight, boss retry (attempt 0 and 2), and after save-resume; a distribution sweep over 10k synthetic node ids lands each variant within a few points of uniform.
- Scout parity: combatPreview and startRouteFight assert equal resolved key for the same node; the storm scout line renders whenever the resolved def carries stormAt, and the fight uses built.def.stormAt in ui and sim (the two threaded call sites each get a wiring assertion like the Lantern's L4 storm assertion).

route-sim gates (cfg gains variety and affix toggles; per-variant selection forced through a debug ctx override):
- Per-Aspect: at least 400 seeds per Aspect per door, PLAIN AND GILDED (the gilded column is mandatory, not optional; the independent sample proved the risk lives there). Gate is within plus or minus 8 for districts 1 to 3 doors, plus or minus 5 for Gate elites, plus or minus 4 for bosses. Known breaches to fix before ship: rats_v2 gilded (+38.5), kark_v1 gilded (minus 10.8), matron_v1 plain and gilded (minus 7.5 / minus 8.0). Watched edges: peri_v2 plain (minus 8.0), collector_v2 gilded, the two charge bosses under gild.
- Per-affix: pooled district doors within 4 points, plain and gilded.
- Whole-run: feature-on clear rate within 2 points of baseline (both routes, 1200 seeds), net gold per run within a few percent (Monkey pocket, Auctioneer pay, gilded bounty doubling tabulated), and the Lantern cumulative ladder re-run at L1, L7, L8 with variety plus affix on.

Save and layout:
- ROUTE_SAVE_VERSION and SCHEMA_VERSION bumps with clean pre-bump rejection; resume keeps both stamps; Copy Run Report gains a line ("Variety on. Affixes: Mending, Taxing, Bellowed."); archived pre-feature reports default to off.
- 844x390 and 390x844: affix chip in the header never wraps, the Aspect line and storm line fit the preview scroll, nothing pushes the commit buttons off screen.

## Open questions

1. Aspect weighting: uniform thirds, or shipped-weighted (50/25/25) for the first release so the learned boards stay the plurality read? Uniform is specced; the resolver makes either a one-line change.
2. Qareen Fevered gives the mirror regen through the existing def field. The mirror ruling (Lantern doc:51) forbids Lantern enemy fields and L1 power on the mirror; a data regen is neither, but it is the first time the mirror differs from a pure reflection. Bless or strike?
3. Should the Daily Market, when it ships, pin variety and affixes off entirely (matching its Lantern 0 pin), or pin them to the daily seed so everyone sees the same Aspect behind the same door?
4. Do the After Midnight reprises draw affixes at all? Draft says yes with their own salt, but forceGilded plus power plus affix is three stacked modifiers on one door; the cumulative sim row decides.
5. The three sim breaches (rats_v2, kark_v1, matron_v1) need retuned literals and a re-trace. The proposed fixes are: rats_v2 raise the base to dmg 2 (fewer, meatier bodies) so gild bites; kark_v1 charge s:1 not s:2, or a gilded-only softening; matron_v1 regen back to 2 with a smaller poison. Confirm the direction before the build tunes them.
6. The gilded Souk Rats door measures 40 percent for on-curve D1 boards at the shipped board, the sharpest normal-door cliff in the game and untouched by this design. Flag to the 0.91+ defect pass rather than patching it through a variant.
7. Affix count per district: three ships 27 district-affix combinations per run shape; is a fourth per district worth the rule-text budget?
8. Codex second look (out until Thursday): the machinery is cross-confirmed by two lenses and the author's own engine injection, and the difficulty is spot-checked by an independent harness, but the third design lens, the formal critique, and the formal sim-verify never ran. Robbie should route the full per-Aspect gilded trace pass and a Codex review before any version is called build-ready.
