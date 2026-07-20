---
name: presentation-audit
description: Run a presentation and game-feel audit of Tavern Bash at the real device sizes, grounded in file:line, fix the safe items, and report before/after. Use when Robbie asks for a presentation audit, a look-and-feel pass, a composition review, "why does it feel hollow", or a pre-release visual QA sweep. Also use before any deploy Robbie calls a release if he asks for a visual check.
---

# Presentation audit

A repeatable audit of how the game LOOKS and FEELS at the two real device
sizes, 844x390 landscape (primary) and 390x844 portrait. The engineering is
assumed strong; the audit hunts composition, dead space, hierarchy, and
wasted art. One run of this skill is one release-sized pass.

## Hard rules (inherited, non-negotiable)

- Never touch src/engine.js or settled combat, economy, or targeting code.
- Zero em dashes and zero en dashes in every file written, including docs.
- All fixes together are ONE system for its own version: bump package.json,
  bump CACHE_V in public/sw.js, add one reservation entry (status done, with
  scope and verification) to coordination/state.json, and keep npm test and
  the build green.
- Fixes must be safe and self-contained: spacing, sizing, hierarchy, filling
  voids, legibility, cascade bugs. Anything that reverses a recorded ruling,
  needs new art, or recomposes a screen is a RECOMMENDATION, never silently
  implemented.

## Procedure

1. Render the whole run: `npm run shots` (SHOTS_CHROMIUM env overrides the
   browser binary in sandboxes). It serves the built app, walks intro to
   run end at both viewports with a fixed seed, and writes
   shots/<viewport>/<NN-screen>.png plus shots/index.html and
   console-log.json. Zero console errors and zero selector misses is the
   baseline health bar; investigate any regression there first.
   Copy shots/ aside as the BEFORE set right away.

2. Study every frame with fresh eyes, twice: once as a senior mobile game
   designer (hierarchy, flow, 44pt targets, safe areas, orientation parity),
   once as a harsh art director (composition, dead space, island-in-void
   layouts, whether the painted art is shown or drowned). Screens: intro,
   hero pick, road pick, omen reveal, first market, route map, scout, fight
   frames, victory, market return, run end.

3. Ground EVERY finding in file:line on the real render surfaces: index.html
   CSS (grep the selector, note the line), src/ui.js, src/route-ui.js.
   While grounding, check the cascade: a rule that a later same-specificity
   rule outranks is a finding in itself (the 0.118 landscape figure block
   died exactly this way). Tag each finding P0 to P3 and which of
   {hollow-feel, clarity, robustness} it hurts.

4. Split the list: SAFE items (CSS spacing, sizing, presence, legibility,
   dead-rule repair) get fixed now, in index.html or the render modules
   only. Everything else becomes a recommendation with a proposed approach
   and its file anchors. When in doubt whether a change re-litigates a
   recorded decision, it goes in recommendations.

5. Verify: `npm test` (559+, includes the dash scan), `npm run build`,
   `npm run shots` again. Compare before and after tile by tile; any screen
   that got worse reverts. Note honestly which checks could not run in the
   current environment (the Playwright layout suite needs the font CDN and
   real browser builds; in sandboxes A/B against pristine files before
   blaming your own change).

6. Fresh-context second pass: spawn a subagent art director that has NOT
   seen the findings list, give it only the AFTER screenshots, and ask for
   ranked findings. Adopt what is safe, add the rest to recommendations,
   and say which of its findings confirmed yours.

7. Deliver: before/after tiles for every changed screen, the graded findings
   table with file:line anchors, recommendations with approaches, the top 5
   changes that most reduce the hollow feeling, and the 5 quick wins
   shippable today. Update coordination/state.json (reservation + build) and
   remind Robbie to run npm run test:layout on device before any deploy.

## Notes that keep future runs honest

- The shots harness buys offense first in the opening market; a fight that
  cannot be won reads as a broken screen, not a finding.
- The run-end capture uses the localhost BBDEV hook; it is absent on the
  deployed site and that is expected.
- Landscape fight height budget is tight: the grid must fit inside 390px,
  so figures live INSIDE the action lane (0.118 containment ruling) and any
  size increase needs the whole column re-totaled.
- Transient float text (combat numbers, barks, toasts) photographs badly;
  confirm a collision repeats across frames before filing it as P0.
