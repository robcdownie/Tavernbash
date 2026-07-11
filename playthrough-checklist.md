---
date: 2026-07-11
tags: [checklist, tavern-bash]
type: checklist
---

# The v1 on-device playthrough

Everything below needs real hands and a real screen; the dev preview freezes animation frames and throttles fights, so this list is the verification the desktop cannot do. Work through it in one or two runs. For anything that looks wrong, screenshot it: the debug strip in the corner labels the build, mode, viewport, fps, and overflow count, so a bare screenshot is a full bug report.

## Setup

- [ ] Open https://bazaar-brawler-v1.netlify.app/?debug in Safari
- [ ] Delete the old home screen app, then Add to Home Screen again (the icon and the Tavern Bash name bake in at install time)
- [ ] Launch from the home screen: the debug strip top right should read `bb-v25 PWA` with your landscape size, roughly 60 fps, and `ovf 0`
- [ ] If `ovf` is ever above 0, screenshot that screen: something is leaking past the viewport edge

## A. The front door

- [ ] Title screen in landscape: is the cover crop of the painting acceptable, are both stone plaques comfortably tappable
- [ ] Tutorial from the plaque: play it to round 2. Do the coach cards read at arm's length, does each step advance when it should, does Skip work mid-lesson

## B. The gate

- [ ] The two door paintings: legible stats and bounty over the crimson door, the safe door reads calm
- [ ] Flow feel: you tap Duel and a door bars the way with no way back. Right call at speed, or does it ever feel like a trap
- [ ] Win a monster fight: the spoils toast, then next dawn the gold lands and the bounty ware sits free in the shop
- [ ] Lose one on purpose: the chip, then straight into the duel

## C. The market

- [ ] Freeze: frost the shop, fight, confirm the same cards wait at dawn and a reroll thaws them
- [ ] Triple shine: with a pair held, both cells glimmer and the completing shop card wears the Forges Silver chip. Visible without hunting?
- [ ] Buy an enchanted variant of a held pair: it forges and keeps the enchant

## D. The vault

- [ ] Tap a vaulted ware: sheet with To the Stall, Swap, Sell
- [ ] Fill vault and board, then Swap a pair through: never stuck, sizes respected

## E. Fights

- [ ] Pulse rings fill live on every ware, frost when frozen
- [ ] A tight finish (both merchants low): does the half-speed last shot trigger, and does it feel like drama or like lag
- [ ] 2x toggle still feels 2x, including through a slow-mo finish
- [ ] Dusk Falls and the dawn card at 2.2 s: linger or drag?

## F. Sound (deferred since 2026-07-10)

- [ ] Speaker at mid volume: any effect that spikes or vanishes. Each one is a one-line tune in src/sfx.js, name the offender
- [ ] Music crossfade market to battle and back

## G. Pacing and balance feel

- [ ] Wall-clock a full run. The harness says champions crown at median round 13; the target is 15 to 20 minutes. Note your round and time
- [ ] Round 1: do rivals finally feel like they are playing your game
- [ ] Poison: still worth drafting after the trim, no longer the only answer
- [ ] Dragon Gate bosses: hard but readable?

## H. The verdict

- [ ] Three things that felt best
- [ ] Three things that felt worst
- [ ] Ship it or one more pass
