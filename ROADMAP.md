---
date: 2026-07-16
tags: [roadmap, tavern-bash]
type: roadmap
---

# Tavern Bash roadmap

Current build: 0.87.0.

## Product verdict

Tavern Bash is now a strong, distinctive vertical slice of a premium solo mobile roguelite. It is not yet a complete phone product at the standard set by Blizzard mobile games or by The Bazaar's run depth.

The engine is not the problem. The current build has:

- 318 unit and integration tests.
- 19 byte-stable golden combat traces.
- 54 browser checks across 844x390 and 390x844 for layout, touch targets, saves, migration, and crash recovery.
- Deterministic maps and fights.
- Resume-safe rewards, markets, boss retries, choices, and run reports.
- 8 heroes, 62 wares, 23 monsters, 12 Omens, 10 Charms, and 6 enchants.
- A coherent painted visual identity, music, sound, particles, and two complete route lengths.

The product gaps are onboarding, content variety, return motivation, mobile delivery, and difficulty shape.

## Evidence from the first seven instrumented reports

- Quick Night active play: 8.3 to 9.8 minutes, median 8.8.
- Long Bazaar active play: 12.8 to 21.9 minutes, median 15.0.
- Market decisions consume 50.8 percent of active play. Combat consumes 18.8 percent.
- Treasure Gold was selected 18 of 28 times.
- Temper was selected 18 of 24 Rest visits.
- Trial by Flame was selected on all 7 Shrine visits.
- All 3 recorded midpoint Treasure wares were later sold and absent from the final board and Vault.
- The old Debt Collector won no fights in 11 appearances and lasted a median 9 seconds. Version 0.87 raises his baseline and prevents Moneylender debt from weakening him.
- Live attributed damage was concentrated in Souk Crossbow, Iron Sword, Oil Torch, Sapper's Pick, and Toxin Vial. The 600-seed baseline sim does not show Toxin Vial or Oil Torch as global outliers, so Souk Crossbow and Silkblade remain a watch item rather than a confirmed balance bug.

## Current balance read

Version 0.87 baseline sim:

- Quick clear rate: 81.3 percent.
- Quick first-attempt bands: 91.2, 88.6, 86.3, 56.8 percent.
- Long clear rate: 73.2 percent.
- Long first-attempt bands: 91.4, 87.9, 86.3, 83.7, 81.4, 72.6, 47.4 percent.
- Long Azhdaha first-attempt win rate: 30.7 percent.
- Long Grand Vizier first-attempt win rate: 45.9 percent.
- No combat or route safety guard tripped.

The route is reliable, but most jeopardy still arrives at the final Gate. Earlier districts are preparation, not survival tests. Long mode then repeats the same three encounter pools and bosses After Midnight with gilding and power multipliers. Adding another district now would extend repetition rather than replayability.

## Product direction

Keep the chosen identity: a premium, single-player, route-based mobile roguelite.

Do not build asynchronous PvP, accounts, guilds, a season pass, or a live-service backend before 1.0. Those are the expensive parts of the Blizzard and Bazaar models, and they are not needed to prove this game.

Do build the smaller systems that create the same player outcomes:

- A real first-run teaching experience.
- Distinct decisions from run to run.
- A visible personal history and mastery loop.
- A daily reason to return.
- Fast, complete mobile installation.
- A difficulty ramp that creates tension before the last district.

Quick Night should remain an 8 to 12 minute route. Long Bazaar should target an 18 to 25 minute median. Do not add an eighth district until the existing seven contain enough mechanical variety to justify it.

## Road to 1.0

### 0.88.0: Route-native tutorial

Replace the current Tutorial button behavior, which simply starts Quick Night.

- Use a fixed seed and a short scripted route.
- Teach one action at a time through real interaction.
- Cover hero identity, buying, gold burn, board slots, scouting, Resolve, combat inspection, fusion, the Vault, and one route event.
- Keep every step optional and skippable.
- Replace the stale lobby help text with route rules.
- Make How to Play reachable from the title and during a run.

Acceptance:

- A first-time player can explain Resolve, route nodes, fusion, and combat targeting after one tutorial.
- The tutorial records completion and abandonment.
- The normal Quick and Long routes remain unchanged.

### 0.89.0: Mobile asset pass

Right-size and modernize the existing art without changing its appearance.

- Convert production PNG art to transparent WebP where safe.
- Cap item, monster, and portrait sources at the resolution actually needed on a Retina phone.
- Preserve source art outside the shipped bundle.
- Keep the manifest and art QA automatic.

Measured opportunity from an in-memory trial:

- Current PNG art: 67.23 MB.
- Same-quality, right-sized WebP estimate: 3.62 MB.
- Estimated art reduction: 94.6 percent.

Acceptance:

- No visible regression at 844x390 or 390x844.
- Transparent edges and rarity frames pass the existing art gate.
- The complete shipped app, including music, stays under 20 MB if practical.

### 0.90.0: Complete offline install

- Self-host the two fonts.
- Generate a precache list from the production build.
- Make a fresh installed build playable offline from title through a complete run.
- Show a clear update-ready state when a new version is available.

Acceptance:

- Airplane-mode test passes immediately after installation.
- Missing network access never changes typography or removes required art, code, or audio.

### 0.91.0: Mobile legibility and control pass

- Give every control at least a 44 by 44 point hit area.
- Raise the smallest map and card labels from their current 8 to 10 pixel range.
- Add a visible hint that fight wares can be tapped to pause and inspect.
- Improve status and activation readability without changing combat timing.
- Replace the letterboxed landscape title treatment with an iPhone-wide composition or painted edge extension.

Acceptance:

- Automated touch-target coverage includes market, Vault, sound, and combat speed controls, not only route nodes.
- No overflow in either tested orientation.
- Device playtest can identify the source and result of major combat effects without reading the event log.

### 0.92.0: Player history and mastery

Turn the existing local report archive into a player-facing screen.

- Recent runs with result, hero, Omen, duration, seed, and final build.
- Personal bests by hero and route.
- Hero, Omen, ware, and monster discovery pages.
- Replay a recorded seed.
- Keep it local and account-free.

This is the first retention layer. It uses data the game already records and gives every run a lasting result.

### 0.93.0: Daily Market

- One date-seeded challenge per day.
- Shared hero, Omen, map, and offered content for every player.
- Score from route result, remaining Resolve, bosses, and active time.
- Shareable summary from the existing report formatter.
- Local streak and best score first. No backend is required for the initial version.

This creates a Blizzard-like return reason without introducing a live-service dependency.

### 0.94.0: Hero and Omen simulation matrix

The current route sim uses no hero and no Omen. Extend it before the next balance pass.

- Run all 8 heroes across all 12 Omens.
- Report clear rate, district curve, fight duration, choice rates, fusion rate, and per-ware contribution.
- Flag hero and Omen spreads, plus interaction outliers.
- Keep guard and timeout reporting mandatory.

Acceptance:

- Silkblade plus Souk Crossbow, Venom Broker, Moneylender, Fortified, and Last Reserve can be judged from seeded evidence instead of tiny live samples.

### 0.95.0: Route choice diversity

Use the new choice telemetry to remove automatic event answers.

- Give each Negotiation persona its own bargains.
- Scale gold, healing, and upgrade offers by district and current state.
- Make Treasure, Rest, and Shrine options answer different build needs.
- Preserve face-up information and deterministic reloads.

Acceptance:

- No single option exceeds 65 percent across at least 30 relevant live choices unless it is intentionally a beginner default.
- A non-gold Treasure choice remains on the final board or Vault in at least 40 percent of applicable runs.

### 0.96.0: After Midnight encounter variants

Make the second half of Long Bazaar mechanically new instead of only gilded and multiplied.

- Give each reprise district a distinct rule or altered monster kit.
- Add one new elite or boss variant per reprise district.
- Reuse existing art where possible with a clear After Midnight treatment.
- Keep the same seven-district map and save shape.

Acceptance:

- A player can name a mechanical difference between each original district and its reprise.
- Long mode gains new decisions without adding more map columns.

### 0.97.0: Progressive difficulty pass

Redistribute risk instead of changing total run length.

- Strengthen underperforming D3 and D6 checks where the matrix supports it.
- Soften the Long Azhdaha outlier if it remains far below the Auctioneer.
- Preserve overall clear rate while reducing the final-district cliff.

Acceptance:

- First-attempt win rate generally falls by district.
- No adjacent district drops by more than 15 percentage points.
- Dragon Gate elite choices sit within 12 percentage points.
- Long clear rate lands in the chosen 55 to 70 percent target band for the competent baseline.

### 0.98.0: Final identity pass

- Choose the final display name before store metadata exists.
- Replace Tavern Bash if the Hearthstone Tavern Brawl and Bob's Tavern proximity remains uncomfortable.
- Keep repo, URL, save, and internal ids stable where practical.
- Finish character voice assets only if they improve clarity and personality on device.

### 0.99.0: Native release candidate

- Wrap the production build with Capacitor.
- Bundle all assets.
- Add App Store icons, launch screens, privacy details, and review notes.
- Validate on a supported Mac and current iPhone.
- Ship through TestFlight first.

### 1.0.0: Premium mobile launch

Release only when:

- The route tutorial is real.
- Quick and Long pacing meet their targets.
- The final Gate is not the only meaningful danger.
- A fresh install works fully offline.
- The history and Daily Market give players a reason to return.
- The final name is settled.
- At least 30 current-version Long reports support the balance call.

## Post-1.0 growth

Only after the premium solo game is proven:

1. Add a Contract node with visible optional combat objectives and rewards.
2. Add new hero and ware archetypes as complete packages, not isolated cards.
3. Rotate weekly Omens or curated challenge rules.
4. Consider an Endless road only after After Midnight has its own content.
5. Consider online leaderboards or asynchronous player boards only if the local Daily Market earns sustained use.

## Standing engineering rules

- One player-facing system per version.
- Run `npm test`, `npm run test:layout`, `npm run sim`, and `npm run sim -- long` in proportion to the change.
- Preserve the golden combat traces unless an engine change is explicitly approved.
- Record every approved balance change in the parity ledgers.
- Keep route rewards, choices, retries, and reports durable and exactly once.
- Use the existing telemetry before adding new manual note fields.
- Validate motion, audio, safe areas, and touch feel on an actual iPhone before release.
