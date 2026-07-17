# Morning Report, overnight of 2026-07-16 to 17

Everything below is committed and pushed to main. All three lanes landed. One version shipped and deployed live; two build-ready design docs written and committed; the stretch sim branch built and its matrix run. No 0.92 unlock-session files were touched.

## Headline

- 0.93.0 the asset diet: SHIPPED and LIVE at platosd.com. public/art fell from 67.2 MB to 4.8 MB.
- design-build-identity.md and design-monster-variance.md: committed (docs commit 01376ed, no version bump), both at the design-lantern-0.89 rigor bar.
- Stretch: branch sim-hero-omen built and committed (never merged, never pushed to main); the full hero x Omen x route matrix ran.

## Lane 1: the asset diet (0.93.0, SHIPPED and DEPLOYED)

- Version: took 0.93.0. The 0.92 session committed 0.91.1 and the Almanac unlock spec while I worked, so I reserved 0.92.0 for them and pre-set package.json so ship.js landed 0.93.0.
- Deploy: git push to main, GitHub Actions run 29553287483 completed success. Live spot-checks returned 200 for dagger.webp, bg_intro.png, and frame_gold.webp on platosd.com. The later docs push also went green.
- Bundle sizes:
  - public/art: 67.2 MB to 4.8 MB.
  - full dist build: 78.7 MB to 16.2 MB (the remainder is the Suno music in public/music and the JS chunks, both outside this lane).
- What it does:
  - scripts/art-diet.js moves every full-resolution original into art-source/ (gitignored, never deleted, the single source of truth) and re-encodes the shipped copy per slot.
  - Shipped copies are WebP, capped at the largest 3x-device render measured from index.html's CSS (items 256, monsters 256, portraits 320, ui 384; frames, board, and bg keep their pixel dimensions because border-image-slice:135 is a source-pixel value and the bg sources are already at or below the fullscreen 3x target).
  - The five files index.html names by literal path (bg_intro, bg_intro_wide, btn_stone, door_monster, door_safe) stay PNG, palette-quantized in place, so no markup change and the service worker's URL keys still resolve.
  - scripts/make-art-manifest.js now accepts both .png and .webp; a .png wins over a .webp for the same id, so a fresh ingest drop outranks the dieted copy and re-running art-diet.js folds it in.
  - CACHE_V bumped to bb-v66. No SAVE_VERSION change (no save shape moved).
- Verified: full npm test green (355 pass), npm run build succeeds, dash scan clean. In the dev preview I confirmed the WebP loads and renders through the intro, hero picker, market shelf, board texture, rarity-frame CSS var, and route flow; every art ref on those screens resolved (no broken images, no console errors).
- CLAUDE.md updated with the art-diet round trip (part of the docs commit, since 0.93.0 had already shipped).

## Lane 2: the two design docs (committed, no version bump)

Both produced by a three-lens design workflow (three independent designs, hard adversarial critique per design that verified every claim against the shipped engine, then synthesis). The workflows hit the account session usage cap twice mid-run, so I resumed them from cache after each reset and, for the parts the cap killed (synthesis, sim-verify, write-doc), acted as the synthesizer myself in the main loop from the completed, cached lens and critique material. Both docs mark this provenance honestly.

### design-build-identity.md (ranked retention item 3)

Headline decisions:
- The hero pull is fusion. Sixteen signature wares (2 to 3 per hero, all 8 heroes) are ordinary non-unique shop wares that fuse on the standard ladder, hero-gated by a new sig field.
- The gate is bigger than the first draft thought: signatures must be filtered at FOUR grant pools (rollShop, opening-offense seed, Negotiation Fresh Stock, Gate Camp Quartermaster) plus a treasure exclusion, all verified by grep. Missing any one leaks a foreign hero's signature.
- Every hook is a re-instrumentation of a shipped R8 skeleton with line cites; three independent critics confirmed no invented verbs.
- Four synergy-count payoff wares and four pool-shaping Omens (three zero-logic, one flagged single glue line for the Guild Charter featured-tag pin).
- Version split: payoff wares, then signatures, then Omens, one player-facing system each.

Corrections folded in from the critiques (each verified against real code):
- goldMul touches only the income-ware stream (ui.js:955), never reward or bounty gold, so a victory-gold Omen was rebuilt on sellReturnsBaseCost instead.
- The Repossession Writ foreclosure fallback can never fire (auctioned lots stay alive and the selector keeps finding them); it was cut, and the lot-aware selector it would need is an open engine-change question.
- tests/r8-acquisition.test.js:24 pins routeShop.length at 31; both new-ware versions must record that count edit.
- Every new item needs an SVG sprite symbol and every new Omen a glyph, so "data-only" was corrected to name the sprite and glyph work per version.
- The featured weight composes by Math.max, not multiply; CLAUDE.md's "x2.2 personal weighting" is stale (it is 1.5 for the hero tag).

Open questions worth Robbie's eye: signature tier placement, whether to nudge HERO_SHOP_WEIGHT off 1.5, the Writ lot-selector engine change, and the count-ware cat choice (util-safe vs flag-and-keep).

### design-monster-variance.md (ranked retention item 5)

Headline decisions:
- Two board Aspects per monster for all 23, data-only alternative MONSTERS entries picked by a stateless hash of (seed, nodeId), so they are face-up at scout, stable across retries and resume, and consume no rng (the Quick map hash ledger cannot move).
- Variant 0 is always the shipped board, one time in three.
- A nine-entry district affix system (three per district, one word each, drawn from the district boss theme) on existing hook verbs through the cfg.hooks seam, never at bosses or the Gate.
- The machinery is cross-confirmed by two independent design lenses that agreed down to the line cites, and by my own engine injection test.

The important finding, and the reason this doc is more than a transcription: the formal sim-verify agent never ran (killed by the cap), so I built my own headless harness (route-sim's fusion player model, 400 seeds, PLAIN AND GILDED columns) and checked the claimed extremes. It corroborated the lenses' direction but found THREE band breaches the lenses' plain-only harnesses missed, all on the gilded or harder side:
- rats_v2 "Swarm" gilded: +38.5 (a swarm of 1-damage bodies barely scales under gild while the shipped board of real weapons does, so the gilded Swarm is trivial where the shipped rats are the hardest normal door). Needs the base raised to dmg 2.
- kark_v1 "Pawing Charge" gilded: minus 10.8 (the charge compounds under gild). Needs a softer charge.
- matron_v1 "Doting": minus 7.5 plain and minus 8.0 gilded, both outside the boss plus or minus 4 band. Needs regen back toward 2.

The lesson for the build, written into the doc's test plan: gilding (L8 Gilded Streets) is the stress test, and every Aspect's gilded column must be traced, not just its plain column.

Open questions: Aspect weighting (uniform vs shipped-weighted), the Qareen regen ruling for the mirror, whether the three flagged retunes go the proposed direction, and the fact that the shipped gilded Souk Rats door already measures 40 percent (the sharpest normal-door cliff, worth flagging to the defect pass independent of this feature).

## Lane 3: the sim-hero-omen branch (branch only, never merged or pushed to main)

- Extended scripts/route-sim.js to model hero mods and Omen rules. A cell is (hero, Omen, route). Fight-side rules ride side.rules exactly as ui.js:1249 builds them (the Omen A merged over ANONE, hero mod flags on top); board slots and copy costs run through the shared anomaly-rules helpers; the hero shop pull weights the tag; the Kilnkeeper opens with his free Torch. New matrix mode prints every hero x Omen x both routes and labels each Omen column fight, econ, or UNMODELLED so nobody reads a baseline number as evidence.
- Branch tests green (357 pass, added the new behavior tests). Committed to sim-hero-omen. NOT merged, NOT pushed.

### The full matrix (150 seeds per cell, competent-baseline policy)

Cell = clear rate. Column lever: "fight" = combat rules modelled; "econ" = board cost and slots modelled; "UNMODELLED" = the Omen only touches shop mechanics the abstract policy cannot exercise, so that column reads as the baseline and says nothing about that Omen. Two heroes, lender and ash, print identical numbers because their signature mods (the credit ledger and the funeral) are not in the abstract model; that is a known limit, not a bug.

Quick Night:

```
hero        base   bull   moon   wild   plague mola   over*  fort   rapid  narrow glass  sil*   auc*
none        83.3   39.3   84.7   84.0   84.7   53.3   83.3   46.7   92.7   84.7   86.0   83.3   83.3
kiln        89.3   43.3   94.0   96.7   90.0   56.0   89.3   43.3   98.0   88.0   94.7   89.3   89.3
apoth       98.7   77.3   71.3   98.7   98.7   83.3   98.7   82.0   98.0   97.3   95.3   98.7   98.7
knife       95.3   54.0   98.7   93.3   96.0   71.3   95.3   62.7   98.7   94.0   98.0   95.3   95.3
lender      77.3   28.7   84.0   80.0   74.7   40.0   77.3   27.3   92.0   70.7   80.0   77.3   77.3
venom       92.0   40.0   92.0   92.0   91.3   56.7   92.0   46.7   97.3   89.3   92.0   92.0   92.0
architect   70.0   17.3   75.3   68.7   70.0   22.7   70.0   12.0   84.7   64.7   77.3   70.0   70.0
silkblade   96.0   58.7   98.0   97.3   96.0   71.3   96.0   61.3   99.3   96.7   96.0   96.0   96.0
ash         77.3   28.7   84.0   80.0   74.7   40.0   77.3   27.3   92.0   70.7   80.0   77.3   77.3
```

The Long Bazaar:

```
hero        base   bull   moon   wild   plague mola   over*  fort   rapid  narrow glass  sil*   auc*
none        72.0   24.0   78.0   77.3   72.0   32.0   72.0   16.0   88.7   70.7   76.7   72.0   72.0
kiln        76.7   21.3   87.3   90.0   74.7   31.3   76.7   19.3   95.3   73.3   90.7   76.7   76.7
apoth       98.0   70.0   58.7   98.7   96.7   89.3   98.0   78.7   99.3   98.7   98.7   98.0   98.0
knife       94.7   38.0   98.7   94.0   92.7   54.7   94.7   39.3  100.0   94.7   97.3   94.7   94.7
lender      56.0    6.7   68.7   60.7   54.7   15.3   56.0    6.7   90.0   48.7   71.3   56.0   56.0
venom       86.7   24.0   90.7   88.0   86.7   38.0   86.7   22.7   97.3   82.7   92.0   86.7   86.7
architect   46.7    2.0   60.0   48.0   43.3    7.3   46.7    2.0   79.3   35.3   57.3   46.7   46.7
silkblade   93.3   44.7   98.7   92.7   93.3   52.0   93.3   38.0  100.0   94.7   97.3   93.3   93.3
ash         56.0    6.7   68.7   60.7   54.7   15.3   56.0    6.7   90.0   48.7   71.3   56.0   56.0
```

(* over = Overstocked, sil = Silent Bazaar, auc = Auction Bell; all three are UNMODELLED, so their columns equal the baseline and prove nothing about those Omens.)

Findings, with the model's honest caveats attached:

- Rapid Trade is the easy night for everyone (up to 100 percent on Long), because the model sees its cdMul 0.85 speed and undervalues the per-activation self-damage. Suspect the real Omen is milder; worth a live check.
- Bull Market is the harshest column in the model (architect Long 2.0, lender and ash Long 6.7), but the model does NOT credit its goldMul 1.5 income (income wares are filtered from route shops), so it sees only the +1 cost downside. Bull is OVERSTATED here. This is the single biggest place the model and reality diverge.
- Fortified and Molasses are the two genuinely hard fight-Omens (architect Long 2.0 and 7.3), and those are fully modelled, so treat them as real pressure.
- Blood Moon is a clean identity signal: it helps most heroes (healingDisabled barely stings a weapon board) but CRUSHES the Apothecary (Long 58.7 vs 98.0 baseline), exactly the heal hero punished. Wildfire is the mirror image for the Kilnkeeper (Long 90.0 vs 76.7). These are the kind of hero-Omen interactions the build-identity Omens should lean into.
- Architect, Lender, and Ash are the weakest heroes on Long (46.7, 56.0, 56.0), but the model under-represents shields and does not model the Moneylender's ledger or the Ash funeral at all, so read those three as understated, not as a balance verdict.

## Deliberately left for on-device review (preview throttles motion; screenshots time out in this project)

- 3x sharpness of the 256px item art in fight cells (worst case 60 CSS px on the board).
- Banding on the two quantized intro paintings (bg_intro, bg_intro_wide) and the two door portraits after palette quantization.
- Fight visuals generally (the dev preview freezes rAF and CSS transitions).

## Ranked suggestions for today

1. Give the three flagged monster-variance retunes a look and confirm direction (rats_v2 dmg 2, kark_v1 softer charge, matron_v1 regen 2), so the Aspect version can tune from a good base. Cheapest high-value item.
2. Pick a home for art-source/ outside git. It is 67.2 MB, local-only, and the whole diet pipeline re-derives from it; losing it means future recompression works from lossy copies. I saved a memory note to flag this whenever machines or cleanups come up.
3. Route both design docs to Codex on Thursday for the second look each explicitly owes. The build-identity doc had three full critiques; the monster-variance doc lost its formal critique and third lens to the usage cap, so it leans harder on my own engine checks and most wants Codex eyes.
4. On-device pass on the asset diet at platosd.com with ?debug: confirm the WebP art looks right in real Safari, especially fight cells and the two quantized intro paintings.
5. If the Fortified and Molasses matrix numbers hold on a live check, consider whether the hardest fight-Omens want a small mercy at high Lantern, or an Omen-reroll token, since they stack onto the Dragon Gate cliff the roadmap wants flattened.
6. When build-identity ships, lean the pool-shaping Omens into the Blood-Moon-vs-Apothecary style identity interactions the matrix made visible; that is where Omens create the "different game per hero" retention pull.

## Housekeeping

- Branch sim-hero-omen exists in a worktree at C:\Robbie\bazaar-brawler-sim, committed, unmerged, unpushed, exactly as instructed. Remove the worktree with `git worktree remove ../bazaar-brawler-sim` when you no longer need it; the branch stays.
- The 0.92 unlock session's files were never touched. The tree was clean of its work at both of my push times.
- env files confirmed gitignored at the start of the session and never read, printed, moved, or committed.
