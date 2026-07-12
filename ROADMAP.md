---
date: 2026-07-12
tags: [roadmap, tavern-bash]
type: roadmap
---

# Tavern Bash roadmap

Current build: 0.54.3, live on the test site (https://bazaar-brawler-v1.netlify.app, CACHE_V bb-v28). Tests green at 70. The full backlog bestiary, every system, art, the nine-track Suno score, the tutorial, and the landscape UI are all in. What remains is judgment and polish, not new systems.

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
