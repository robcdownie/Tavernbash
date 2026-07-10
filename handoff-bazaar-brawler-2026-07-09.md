---
date: 2026-07-09
tags: [handoff, bazaar-brawler]
type: handoff
---

# Bazaar Brawler: Claude Code Handoff Brief

## 1. State

A working, tested, single-file mobile auto-battler (v5) that meshes Hearthstone Battlegrounds with The Bazaar, set in a Persian night market. The game logic is done and verified; the visual layer tops out at "premium indie" because it is pure SVG and CSS. This project moves to Claude Code to get a real asset pipeline (painted art, WebGL particles, sound), a module structure, hosting, and saves. Target presentation tier: Balatro or Slay the Spire, not literal Blizzard.

## 2. Inputs needed in the repo

- `bazaar-brawler.html` (137 KB, downloaded from the prior chat). This is the entire game: engine, data, UI, and SVG art in one file. It is the source of truth for all logic.
- This brief. Drop both in the repo root. Optionally rename this file to `CLAUDE.md` so Claude Code loads it automatically.

## 3. What is already built and verified

### Architecture (preserve this)

- The combat sim is pure and DOM-free: `createFight(cfg)` steps on a fixed 50 ms logical tick, seeded with mulberry32, and returns an event array per step (`fire, chip, destroy, hhit, shield, heal, pois, burn, tickp, tickb, storm, haste, stormstart, end`). The renderer consumes events; a headless runner (`runHeadless`) plays fights instantly for tests and for rival-vs-rival resolution.
- Everything needed for testing is exported on `globalThis.BB`: `createFight, runHeadless, ITEMS, MONSTERS, TRINKETS, ANOMALIES, ANONE, PERSONAS, makeItem, fuseScan, genRival, playerFightItems, monsterSide, fightHP, stormAt, mulberry, integOf, usedCells, RSTAT, RINTEG, gateOK`.
- The UI is vanilla JS innerHTML rendering over an inline SVG sprite (about 55 symbols: 26 item glyphs, 8 monster marks, 8 portraits, UI marks, 7 mini icons, gradient defs).
- Boot is guarded (`typeof document`), so the whole script loads clean in Node for testing.

### Test results, all passing before handoff

- Termination: 48 random rival matchups across rounds 1 to 12 all resolve; longest fight 38 s of sim time (the storm guarantees an ending).
- Monster winnability with on-curve reference boards: Lamp Imp 12 s, Bazaar Rats 31 s, Rust Ghul 18 s, Brass Lamassu 24 s, Karkadann 21 s, Debt Collector 23 s, Ifrit 15 s, Qareen 15 s. All wins. Karkadann correctly kills an undercooked one-dagger board.
- Fusion: 3 daggers forge to 1 Silver Medium; 9 daggers chain to 1 Gold Large.
- Debt Collector gains exactly +150 HP and +20 damage at 10 held gold. Qareen mirrors the board at 85 percent and handles an empty board safely.
- Symbol coverage complete, zero em or en dashes in the file, balanced markup, `node --check` clean.

Port these into `npm test` in Phase 0 and keep them green through every change.

## 4. Rules spec as implemented

### Two health layers (the load-bearing decision)

- **Lobby health**: every merchant has 40. It only drops from duel losses, monster chips, and it decides elimination and placement. Shown in the rivals strip.
- **Fight health**: a fresh pool each battle. Player and rivals get `round((90 + round * 8 + trinketFlat) * anomalyHpMul)`. Monsters use fixed values below.

### Combat resolution

- Weapons strike the leftmost intact enemy item. A Bulwark redirects all weapon targeting to itself while intact. Rust Ghul instead targets the highest-Integrity item. Excess damage is lost (no overflow). When the enemy board is fully destroyed, weapons hit the merchant through shield.
- Poison ticks the merchant every second, ignores shield, and stacks never decay.
- Burn ticks the merchant every second; shield absorbs half of each tick; the stack decays 1 per second.
- Heal restores fight health and cleanses 1 poison and 1 burn stack.
- Lifesteal (Vampiric Trade) heals 15 percent of all weapon damage dealt, chips included.
- Haste and Charge add time to item timers. Adjacency effects (Whetstone, Hourglass, Sharpshooter's leftmost double) are locked at fight start.
- Sandstorm arrives at `max(16, 34 - round * 1.5)` seconds, deals 5 then +4 per second to both merchants, shields first.
- Simultaneous death with the player involved: the player wins. Rival vs rival: seeded coin flip.
- Loss damage to lobby health: `round + sum of the winner's surviving item tiers`.

### Economy

- Sizes: Small, Medium, Large take 1, 2, 3 board slots. Cost 3, 5, 8. Sell 1, 2, 3. Reroll 1.
- Income each round: `min(10, 3 + round)` plus board income items plus trinkets plus relics, times anomaly goldMul. Unspent gold burns when the duel starts (shown in scout and the result banner). Monster bounties land mid-draft, so they are spendable that round.
- Fusion: three copies of the same item and rarity forge into one of the next rarity, one size larger (cap Large). Chains automatically. Rarity ladder Bronze, Silver, Gold, Diamond; stat multipliers `[1, 2, 3.8, 7]`, Integrity multipliers `[1, 1.7, 2.8, 4.5]`.
- Integrity base by size: 14, 24, 38 (Brass Buckler carries a 2.2x multiplier).
- One Tier stat: board slots = `4 + tier` (5 to 10). Item pools gate at Tier 1, 2, 4. Upgrade costs T2 5, T3 7, T4 8, T5 10, T6 11, each decaying 1 per round unbought, floor 1.
- Shop: 4 cards (6 under Overstocked). Weights 8/7/6 by item tier, times 2.2 on featured-tag matches, times 1.6 pity when holding 1 or 2 bronze copies of that item.

### The lobby

- Eight merchants: you plus seven named personas. Each round every living rival gets a freshly generated board: tier `min(6, 1 + ceil(round/2))`, budget `9 + round * 5.5`, archetype-weighted picks, shields sorted leftmost, pre-upgrade rolls (Silver from round 4 at `min(.6, .18 + (round-4) * .06)`, Gold from round 8 at `min(.5, (round-7) * .07)`), and a stat compensation of `1 + max(0, round-5) * .03` since rivals have no trinkets.
- Pairings: living merchants shuffle into pairs; an odd one out fights the Departed (the last eliminated board). All non-player fights resolve headlessly through the same engine and feed the results banner. Crown on the health leader, skulls on the dead, placements 1st to 8th.
- Scout phase before every duel: full view of the enemy board, free reordering of yours, 8 second auto-start.
- Quqnus Shrine: first time any merchant falls, revive at 15 lobby health (the player picks a boon: Gild a ware, +8 gold and +1 income, or a free Tier). Second fall is final.

### The Doors (one per round, full information)

Band by round: 1 to 3 Back Alleys, 4 to 6 The Souk, 7+ Palace Quarter. Loss chip 2/4/6. Gilded roll 10 percent: stats x1.5, gold bounty x2, foil. Safe door rotates: 3 gold, mend 4 health, or a free small ware. Exact bounty always shown before committing.

### Trinkets and anomalies

- Checkpoints at the start of rounds 5 and 8, four offers, guaranteed relevance: at least one matching your most common archetype (2+ items), at least one neutral, never a duplicate.
- One lobby-wide anomaly per run, revealed at start, plus two featured archetype tags that weight the shop, the monster deck, and trinket offers.

## 5. Data tables (as shipped)

### Items (26). Integrity = base by size x rarity multiplier.

| id | Name | Size | Tier | Cat | CD | Effect |
|---|---|---|---|---|---|---|
| dagger | Rusty Dagger | S | 1 | dmg | 3.0 | 6 dmg |
| sword | Iron Sword | S | 1 | dmg | 3.5 | 11 dmg |
| fangs | Twin Fangs | S | 2 | dmg | 2.0 | 9 dmg |
| serpent | Serpent Blade | S | 2 | dmg | 3.5 | 6 dmg + 3 poison |
| mace | Spiked Mace | M | 2 | dmg | 4.5 | 24 dmg |
| crossbow | Bazaar Crossbow | M | 2 | dmg | 3.0 | 15 dmg |
| hammer | Warhammer | L | 3 | dmg | 5.5 | 42 dmg |
| vial | Toxin Vial | S | 1 | poison | 3.0 | 2 poison |
| venom | Venom Idol | L | 3 | poison | 4.5 | 7 poison |
| torch | Oil Torch | S | 1 | burn | 3.0 | 3 burn |
| bomb | Fire Bomb | M | 2 | burn | 4.0 | 8 dmg + 4 burn |
| magma | Magma Heart | L | 3 | burn | 4.5 | 10 burn |
| buckler | Round Buckler | S | 1 | shield | 4.0 | 10 shield |
| brassbuckler | Brass Buckler | S | 1 | shield | passive | Bulwark, 2.2x Integrity |
| barricade | Stone Barricade | M | 2 | shield | 3.0 | 13 shield |
| tower | Tower Shield | M | 2 | shield | 5.0 | 26 shield |
| aegis | Gilded Aegis | L | 3 | shield | 5.5 | 46 shield |
| bandage | Linen Bandage | S | 1 | heal | 4.0 | 12 heal |
| salve | Healing Salve | M | 2 | heal | 4.5 | 24 heal |
| chalice | Jade Chalice | M | 2 | heal | 5.0 | 15 heal + 15 shield |
| sanctum | Rose Sanctum | L | 3 | heal | 5.5 | 40 heal |
| purse | Coin Purse | S | 1 | util | passive | +2 income |
| ledger | Merchant Ledger | M | 2 | util | passive | +3 income |
| whetstone | Whetstone | S | 2 | util | passive | adjacent +3 dmg |
| hourglass | Brass Hourglass | M | 2 | util | 4.0 | 0.8 s haste to neighbors |
| adren | Adrenaline Draught | M | 3 | util | passive | board cooldowns x0.88 |

### Monsters (the ship-order eight)

| id | Name | Band | HP | Board | Bounty | Special |
|---|---|---|---|---|---|---|
| imp | Lamp Imp | 1 | 40 | Ember Spark (S, 3 s, 4 dmg, 10 integ) | 3 gold + Rusty Dagger | |
| rats | Bazaar Rats | 1 | 45 | 4x Rat Fangs (S, 2.5 s, 2 dmg, 8 integ) | Twin Fangs + Rusty Dagger | teaches overkill |
| ghul | Rust Ghul | 1 | 60 | Corroded Cleaver (L, 9 s, 18 dmg, 22 integ) | 2 gold + Brass Buckler | targets highest Integrity |
| lamassu | Brass Lamassu | 2 | 140 | Bulwark Bull (L, 60 integ, Bulwark) + Horn Chime (S, 4 s, 9 dmg, 12 integ) | 1 gold + Tower Shield | |
| kark | Karkadann | 2 | 160 | Gore Horn (L, 11 s, 55 dmg, 30 integ) | Warhammer | the burst check |
| collector | The Debt Collector | 2 | 110 + 15/gold | Ledger Blade (M, 5 s, 6 + 2/gold dmg, 24 integ) | 10 gold; +1 income relic if entered with 8+ gold | reads gold at fight start |
| ifrit | Ifrit of the Kiln | 3 | 340 | Kiln Heart (L, 7 s, 8 burn, 34 integ) + Bellows (M, 5 s, charges Kiln 2 s, 22 integ) | Magma Heart | Charge keyword |
| qareen | Qareen | 3 | 85% of yours | your board at 85% | Gild one ware | mirror |

### Trinkets (10)

smith weapons +5, sharp leftmost item x2, venomancer poison x1.6, pyro burn x1.6, ironhide +30 fight HP, bulwarkf shields x1.5, medic healing x1.5, vamp 15% lifesteal, quick cooldowns x0.88, prince +3 income. Tags: smith/sharp weapons, venomancer poison, pyro burn, ironhide/bulwarkf shield, medic/vamp heal, quick/prince neutral.

### Anomalies (8)

Bull Market income x1.5; Blood Moon dmg x1.3 and HP x0.85; Wildfire burn x2; Plague Winds poison x2; Molasses Night cooldowns x1.2; Overstocked shop shows 6; Fortified HP x1.3; Rapid Trade cooldowns x0.85.

### Rival personas (7)

Old Farrokh (shield), Zubaida the Coilwright (poison), Mirza Half-Price (economy), The Widow Anahit (heal), Kasra of the Ash Quarter (burn), Bibi Gol (weapons wide), Tariq Two-Knives (weapons fast).

## 6. The mission, phased

Each phase ships working and keeps tests green before the next starts.

**Phase 0, structure.** Vite vanilla JS project. Extract the script into modules: `src/engine.js` (sim, pure), `src/data.js` (items, monsters, trinkets, anomalies, personas, constants), `src/ui.js`, `src/art.js` (sprite loader). Zero logic changes; diff-check behavior against the original file. Port the test suite in section 3 to `npm test`. Commit the baseline.

**Phase 1, hosting and saves.** Deploy to Netlify (account already connected). PWA manifest, service worker, add-to-home-screen fullscreen with icon. localStorage saves are allowed now that this is a real site: snapshot the full run state at the start of each round plus persistent best-placement stats, with a Continue Run button on boot and a wipe-on-version-bump guard.

**Phase 2, asset pipeline.** Create `public/art/{items,monsters,portraits,frames,board,bg}`. The loader tries `art/items/{id}.png` first and falls back to the existing SVG symbol for that id, so painted art can land one batch at a time without ever breaking the build.

**Phase 3, particles.** One transparent Pixi.js canvas layered over the DOM. Hit sparks scaled by damage, ambient ember drift, horizontal sand streaks during the storm, a forge burst on fusion, coin rain on victories, and a bloom or flash filter on hits of 40+. Keep layout, cards, and text in DOM; do not rewrite the UI in Pixi.

**Phase 4, sound.** Howler or raw WebAudio with the iOS unlock-on-first-tap pattern. Hits by weapon size, chip ticks, destroy crunch, forge sting, storm rumble loop, coin clink on purchase, tier-up fanfare, victory and defeat stings, monster door creak. Mute toggle, persisted.

**Phase 5, content.** The backlog in section 8, one JSON block or one system at a time.

## 7. Art direction spec

**Style law.** Painterly, hand-lit, warm Persian night market. Single warm key light from the lower left (lantern light), cool indigo fill from above, dark backgrounds with rim-lit silhouettes. High chroma accents on a dark base. Not flat vector, not photoreal, no text baked into images. Reference tier: The Bazaar's item cards, Arcane's lighting, Balatro's confidence.

**Palette (already in the game, keep it).** Base `#1c1410`, night indigo `#1b132f`, brass `#d8a24a`, brass highlight `#f4cf7c`, spice red `#c8402e`, ember `#e0863a`, verdigris `#35a596`, poison green `#9dbb45`, rose `#e08a8f`, ink `#f0e6d6`.

**Master prompt template.** Reuse one base prompt for every batch and only swap the subject line, so the set stays coherent: "painted fantasy game item icon, Persian night market setting, warm lantern rim light from lower left, cool indigo ambient, dark transparent background, rich brass and spice palette, painterly brushwork, centered composition, no text". Generate by category in single sessions (all weapons together, all shields together) for consistency, then a cleanup and background-removal pass.

**Asset manifest.**

| Path | Count | Size | Notes |
|---|---|---|---|
| art/items/{id}.png | 26 | 512x512 | ids from the item table; object fills 78 to 85 percent, transparent |
| art/monsters/{id}.png | 8 | 512x512 | bust composed for a circular medallion crop |
| art/portraits/p0.png to p7.png | 8 | 512x512 | shoulders-up merchant busts; p0 is the player |
| art/frames/frame_{bronze,silver,gold,diamond}.png | 4 | 9-slice | ornate card frames per rarity |
| art/board_wood.png | 1 | 1024 tileable | dark planked stall timber |
| art/bg_market.png | 1 | 1080x1920 | night market alley, heavy vignette, low detail center |

**Stays code-rendered:** cooldown arcs, stat gems, HP bars, all text and numbers, particles, foil sweeps. These read crisper as code and never need regeneration.

## 8. Content backlog (from the design docs)

### Monsters, in rough playtest order. Engine-ready means only JSON is required.

| Name | Band | HP | Board | Needs | Bounty |
|---|---|---|---|---|---|
| Scalded Samovar | 1 | 50 | Boiling Spout (M, 5 s, 3 burn) | engine-ready | small burn item |
| Shahmaran | 3 | 350 | Serpent Crown (M, 5 s, 4 poison) + Coiled Court (M, 6 s, 10 heal) | engine-ready | Serpent Crown |
| Marid of the Cistern | 3 | 280 | Tide Wall (L, 6 s, 25 shield) + Spring (M, 5 s, 12 heal) + Drip (S, 3 s, 4 dmg) | engine-ready | Tide Wall |
| Pilfer Monkey | 1 | 60 | Sticky Paws (S, 3 s, 3 dmg, pockets 1 bounty gold per activation) | bounty-drain tick | 8 gold minus pocketed |
| Sandling | 1 | 90 | no weapons, 1 regen; storm at 12 s | regen + per-fight storm override | regen item |
| Ghul Matron | 2 | 160 | Venom Kiss (M, 4 s, 3 poison), 2 regen | regen | 2 poison smalls |
| Nasnas | 2 | 180 | 5 slots, every item double stats | engine-ready | Fusion Mote (spawn a bronze copy) |
| The Icebox | 2 | 170 | Frost Vent (M, 6 s, freeze leftmost 3 s) + Cold Shank (S, 4 s, 7 dmg) | freeze | Flying charm |
| Glass Peri | 2 | 110 | 3x Shard Wings (S, 3 s, 5 dmg, 35% crit, 6 integ) | crit | crit aura |
| Simurgh Fledgling | 3 | 300 | Tail Feather (S, 2 s, 8 dmg) + Preen (M, 6 s, haste all 2 s) | haste-all | Flying enabler |
| Mint Golem | 3 | 320 | Coin Cannon (L, 3 s, 14 dmg, 5 ammo) + Coin Hopper (S, 8 s, reload 2) | ammo | the pair |
| Roc Egg | 3 | 250 | The Egg (L, 80 integ, no attack), hatches at 15 s into Roc Hatchling (L, 2 s, 22 dmg) | timed transform + on-destroy | on-destroy item |
| The Azhdaha | boss | 550 | 3x Head (L, 8 s, 20 dmg, 50 integ); survivors gain permanent 50% haste when a head dies | on-destroy trigger | unique weapon |
| Night Auctioneer | boss | 500 | Gavel (M, 5 s, 12 dmg); every 6 s disables your highest-damage item and pays you 3 gold | fight-scoped timer | unique Gavel |
| Grand Vizier of Ash | boss | 700 | full 10-slot Diamond board: bulwark, burn core, freeze, heal engine | all of the above | pick any unique |

### System order, one per version, in this order

Saves and deploy, painted art, particles, sound, engine-ready monsters, regen, freeze and flying, on-destroy (deathrattles), ammo, crit, enchantments, the Vault, heroes with personal tags. The docs' own filter applies to every addition: cut anything that does not change what the player does on turn 4.

## 9. Decisions not to re-litigate

These were argued and settled across two design documents and five builds. Verbatim where wording matters:

- Items have Integrity and die. "Weapons strike the leftmost intact enemy item; excess damage is lost."
- "Gold does not carry over: spend it or it burns at dusk."
- Two health layers, exactly as specified in section 4.
- Poison and burn skip the board and tick the merchant. Poison ignores shield; shield halves burn.
- Adjacency locks at fight start. The tie goes to the player.
- The sim stays pure, deterministic, DOM-free, and headless-testable. Any refactor that breaks `npm test` reverts.
- One new system per version, never more.

## 10. Working constraints for every Claude Code session

- Zero em dashes and zero en dashes anywhere: UI copy, docs, comments, commit messages. Add a dash scan to the test script so it is enforced, not assumed.
- Approved change batches get applied in full, not piecemeal.
- Target device is an iPhone in Safari standalone mode: test at 390x844, respect safe areas, no hover-dependent interactions, everything reachable with a thumb.
- A full lobby should run 15 to 20 minutes. Tune toward that, not away from it.
- Show a live Netlify URL at the end of every phase.

## 11. Kickoff prompt (paste as the first message in Claude Code)

```
Read handoff-bazaar-brawler-2026-07-09.md in full before touching anything.
Then execute Phase 0 and Phase 1 exactly as written: Vite vanilla JS project,
move bazaar-brawler.html in, extract the sim and data into src/ modules with
zero logic changes, port the section 3 test suite to npm test, confirm every
test passes, then deploy the unchanged game to Netlify with PWA manifest and
localStorage saves. Stop and show me the live URL and test output before
starting Phase 2.
```
