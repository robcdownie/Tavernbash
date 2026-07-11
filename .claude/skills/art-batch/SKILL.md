---
name: art-batch
description: Run the painted-art round trip with Robbie. Use whenever Robbie asks for art generation prompts, says he is about to generate images, or uploads image files or zips meant for the game (items, monsters, portraits, UI, backgrounds, icons). Covers prompt emission, filing uploads, honest per-asset QA, and the manifest and test pass.
---

# The art batch round trip

Robbie generates art on his phone in roughly 10 minute batches. This skill is the whole loop: prompts out, files in, honest verdicts, tests green.

## 1. Emitting prompts

- Build every prompt from the master template in `art-prompts.md` (repo root), swapping only the subject line. Category batches stay coherent: all weapons in one session, all doors in one session.
- Deliver each prompt in its own fenced code block, one per asset, so they copy cleanly on a phone. Never inline them in prose.
- Name the exact target filename next to each prompt (see filing table below) so the upload can be matched without guessing.
- After handing over prompts, propose one concrete backlog task to work during the wait. Robbie will be back in about 10 minutes; do not sit idle and do not wait to be asked.

## 2. Filing uploads

Uploads arrive as single images or zips at `C:\Users\sidzb\.claude\uploads\<session>\`.

- Zips: expand to the scratchpad, then delete `__MACOSX` and `._*` junk before anything else.
- Standard glyph slots (items, monsters, portraits) go through the ingest matcher: `npm run ingest -- <folder> [--thumb|--strip-bg]`. It matches by id token in the filename, resizes to spec, and refuses ambiguous names rather than guessing. Report every file it refused.
- Everything else (backgrounds, UI pieces, icons, one-off crops) goes through `node scripts/art-prep.js <src> <dest-under-public> [--w N] [--h N] [--flatten #hex] [--crop l,t,w,h]`. It files the image, prints final dimensions and alpha, and regenerates the manifest when the destination is under `art/`.

Filing map:

| Asset | Destination | Notes |
|---|---|---|
| Item art | `art/items/{id}.png` | via ingest, 512x512, transparent |
| Monster medallion | `art/monsters/{glyph suffix}.png` | via ingest |
| Portrait | `art/portraits/p{n}.png` or `h-*.png` | via ingest |
| UI piece | `art/ui/{name}.png` | via art-prep, whitelist the id in `tests/art.test.js` |
| Background | `art/bg/bg_{name}.png` | via art-prep, referenced from CSS |
| Home screen icon | `icons/icon-{512,192,180}.png` | via art-prep with `--flatten #0d0805`, then bump `CACHE_V` in `public/sw.js` |

## 3. The verdict

Robbie's standing instruction: if it does not work, say no. For each filed asset check and report honestly:

- Dimensions match the slot spec; alpha present where the slot needs transparency (items, monsters) and absent where it must be opaque (icons).
- The subject is an isolated object, not a framed card scene. Framed scenes were the historical failure mode; the rescue is a rounded thumbnail crop, but say so rather than silently accepting.
- Show the filed result (Read the PNG) when there is any doubt.

## 4. Closing the batch

1. `npm run art` if anything bypassed the auto-regeneration.
2. `npm test`; the manifest sync and orphan tests will catch unfiled or unmapped art. New non-glyph ids must be whitelisted in `tests/art.test.js`.
3. Ship with `node scripts/ship.js <minor|patch> "subject" "body"`, or fold into the current version batch if one is open.
4. If icons or the manifest-precached files changed, confirm `CACHE_V` was bumped.
