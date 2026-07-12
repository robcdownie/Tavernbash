---
date: 2026-07-12
tags: [roadmap, tavern-bash]
type: roadmap
---

# Tavern Bash roadmap

Current build: 0.57.0. The full backlog bestiary, every system, art, the nine-track Suno score, the tutorial, and the landscape UI are all in. As of 0.57 the combat sim has had its structural stabilization pass; what remains is a chosen product pivot plus judgment and polish.

## The big direction, decided 2026-07-12

An adversarial code+design review (`tavern_bash_adversarial_review.md`, `tavern_bash_roadmaps_bug_ui_fixes.md`, both in the session uploads) landed two forks. Robbie's calls:

1. **Product identity: single-player roguelite, not a persistent-rival lobby.** The 8-CPU lobby with fresh random rival boards was the review's #1 flaw ("the lobby is functionally fake"). Rather than build persistent rival economies/AI, Robbie chose to lean into the Persian-market roguelite: routes through the city, handcrafted encounters, bosses that test mechanics, run health, doors as branches. This is the next structural arc (Roadmap B in the review). It means eventually: drop the fake lobby simulation, replace placement with route progress, make rival duels authored encounters, add a map. Large, multi-version.
2. **Combat sim: stabilization approved and DONE in 0.57.0.** The review's Milestone 1. Poison decays (~18%/s, no longer a forever-nuke; damage share fell from 44% dominant to a healthy 10-27% that scales with rarity), burn decays proportionally (no more quadratic packets), large weapons cleave overkill by size (Large full / Medium half / Small none, killing the chaff-tank exploit and giving big weapons identity; weapons rose to 30-41% share), haste is capped (the two-Hourglass reactor loop is dead), lifesteal heals from damage dealt not nominal, rivals start round 1 at tier 1 (real parity). The byte-identical fight-parity test retired (job done, we now deliberately diverge); five combat invariants replace it in `tests/engine.test.js`. Harness note: early-game (r1-3) now leans on the storm (~48%) because bronze boards are too weak to finish each other, which is the storm's designed timeout role but is the one thing to feel-check on device.

## Not-yet-built from the review (real, but Robbie's pace)

- **Fusion of multiplicative passives can still downgrade** (Adrenaline Draught's cdMul, stacking flat passives). Narrow (most of the review's examples were `unique` items that can't fuse). Needs a design call: don't auto-fuse passives, or make them scale hard enough. Flagged, not fixed.
- **Heroes as rules, not flat stats; anomalies as tradeoffs, not multipliers.** Real design reworks; reopen settled design.
- **Gold carry-cap vs reroll-to-zero spam.** The review wants a cap of ~3. Directly contradicts the settled "gold burns, never carries" rule, so it needs Robbie's explicit re-decision.
- **Disable (Gavel) is permanent; combat screen is log-heavy; post-fight damage breakdown.** All real, all deferred behind the roguelite pivot and on-device feel.

## Decisions owed by Robbie (blockers, not code)

1. **The name.** "Tavern Bash" sits close to Hearthstone's Tavern Brawl and Bob's Tavern. Cheap to change now (find-and-replace on the display name, ids stay), expensive after a store listing. Resolve before any App Store step.
2. **The v1 deploy home.** Top up the frozen real site's Netlify credits (r.blinkman account) or promote the test site to be the production URL. Everything funnels through this.
3. **The on-device playthrough.** Walk `playthrough-checklist.md` on the phone with `?debug` in the URL. This is the last gate before calling v1: pacing against the harness's round-13 median, boss feel, sound levels, and the look in real motion (the dev preview cannot judge fights).

## Owed content

- **Character voice tracks.** The `bark()` voice channel is wired to accept per-line audio; the prompt sheet with exact hero lines is in the session log. Suno spoken-word, sliced per line on arrival.
- **Optional art:** a landscape door-band or market-sign strip if the shelf still reads plain on device; otherwise the CSS furniture stands.

## The App Store path (discussed 2026-07-12)

- Wrap the PWA with **Capacitor** (free, open source): bundles the game offline into a native shell, passes Apple's minimum-functionality bar that rejects bare WebView wrappers. All setup is Windows-side (Capacitor config, offline bundle, full icon set, launch screens, submission checklist).
- **Hard requirements:** the $99/year Apple Developer Program, and a Mac on macOS Sonoma (14) or newer to build and submit. Robbie's 2015 Mac likely caps below that; check its macOS ceiling (About This Mac, then Software Update). Fallbacks if too old: a cloud Mac (MacStadium/MacinCloud, ~$20-30 for a session) or CI build (Codemagic/EAS free tiers).
- **Sequence:** finish the playthrough and name decision first, then wrap. Premature by a week or two.

## Standing engineering notes

- One system per version; `node scripts/ship.js <major|minor|patch> "subject" "body"` runs tests, bumps, commits with one honest exit code.
- Balance changes go through `node scripts/balance-sim.js` before and after; approved retunes get recorded in the `tests/parity.test.js` ledgers, everything else stays byte-identical to the original file.
- Art batches: drop into `public/art/`, the art-batch skill and `scripts/art-prep.js` own filing, QA, and the manifest.
- Offline (PWA): the service worker precaches only four files at install; the rest caches lazily on first fetch, so full offline needs one online visit touching each screen. Failed offline fetches degrade safely (no particles, silent audio), they do not crash.
- The dev preview throttles fights and cannot screenshot; verify flows up to fight start with instant evals, settle fight outcomes headlessly, and use Robbie's device for anything in motion.
