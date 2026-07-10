---
date: 2026-07-10
tags: [handoff, bazaar-brawler]
type: handoff
---

# Bazaar Brawler: Session Handoff, 2026-07-10

## State

The game is live at https://bazaar-brawler.netlify.app at v0.6.1: phases 0 through 4 complete, all 50 painted assets and both Suno music loops shipped, landscape-first no-scroll layout done, phase-change overlays fixed. Next session starts Phase 5, content.

## Decisions made this session

- Landscape is the primary orientation, superseding the 2026-07-09 handoff's portrait target. Recorded in CLAUDE.md hard rules. In landscape runs the app pins to viewport height; doors and market scroll internally; the stall never leaves the screen.
- Item art ships as rounded center-crop thumbnails (the ingest `--thumb` flag), chosen by Robbie over holding for isolated cutouts. Barricade set the pattern for future singles: generate on a solid magenta screen, chroma key, composite onto the rounded indigo backdrop.
- The title only appears on intro and champion screens, never during a run.
- Version cadence held: one system per version, v0.2 particles through v0.6 layout.

## Current versions

v0.6.1 on main, deployed. 27 tests green. All art, music, and layout work committed. Nothing is draft.

## Open items

1. First task: Phase 5, one JSON block per version, playtest order from the backlog: Scalded Samovar, then Shahmaran, Marid of the Cistern, Nasnas. All engine-ready, no engine changes.
2. New monsters need a sprite symbol in index.html (the symbol coverage test enforces this) plus optional painted art at `public/art/monsters/{glyph suffix}.png`.
3. Deferred: sound levels await Robbie's on-device feedback; each effect is a one-line tune in src/sfx.js. Regenerating isolated item art is optional and low priority.

## Corrections and constraints from this session

- The premium pass rule `.card>*{position:relative}` silently flips absolutely positioned card children into flow; any new decorative layer inside `.card` must be pinned back with a higher-specificity absolute rule.
- The dev preview tab reports hidden: requestAnimationFrame and screenshots freeze. Verify with preview_eval DOM measurements, never screenshots.
- Test layout at 844x390 first, then 390x844.

## Inputs needed

None. The repo is self-contained; read CLAUDE.md and both handoff files. If new art or audio is generated, drop the files in one folder and run `npm run ingest -- <folder>`.
