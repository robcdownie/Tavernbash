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
- All visual fixes together are ONE system for its own version: bump
  package.json, bump CACHE_V in public/sw.js, add one reservation entry
  (status done, with scope and verification) to coordination/state.json, and
  keep npm test and the build green. A tooling-only audit version bumps the
  package but does not bump CACHE_V when no shipped runtime input changed.
- Fixes must be safe and self-contained: spacing, sizing, hierarchy, filling
  voids, legibility, cascade bugs. Anything that reverses a recorded ruling,
  needs new art, or recomposes a screen is a RECOMMENDATION, never silently
  implemented.

## Procedure

1. Read `coordination/state.json`, `CLAUDE.md`, and the live roadmap. Confirm
   the branch, worktree, version, and one-system boundary before editing. Reuse
   one clean dedicated presentation worktree and its installed dependencies
   when ownership is sequential. From the main integrator checkout:
   `npm run presentation:worktree -- --branch <reserved-branch> --base main`.
   The helper refuses a dirty worktree and never shares a writable
   node_modules directory across worktrees.

2. Start with targeted evidence, not the full matrix. Run `npm run build` once,
   then list the deterministic states with
   `npm run shots:target -- --list`. Capture the suspect state at both real
   viewports and both motion profiles with:
   `npm run shots:target -- --state <name> --before <prior-shots-path>`.
   The command runs viewport jobs concurrently and writes screenshots,
   automatic overflow and hit-target measurements, before and after pair
   metadata, and `review/review-packet.md`. Rebuild only after a shipped build
   input changes. Every no-build command verifies the dist source fingerprint
   and refuses stale output.

3. Use the most recent authoritative full matrix from the exact reviewed base
   as the BEFORE set. Regenerate a full before matrix only when that evidence
   is missing, stale, or does not contain the affected state. Preserve the
   exact before path in coordination state.

4. Study every relevant frame with fresh eyes, twice: once as a senior mobile game
   designer (hierarchy, flow, 44pt targets, safe areas, orientation parity),
   once as a harsh art director (composition, dead space, island-in-void
   layouts, whether the painted art is shown or drowned). Screens: intro,
   hero pick, road pick, omen reveal, first market, route map, scout, fight
   frames, victory, market return, run end.

5. Ground EVERY finding in file:line on the real render surfaces: index.html
   CSS (grep the selector, note the line), src/ui.js, src/route-ui.js.
   While grounding, check the cascade: a rule that a later same-specificity
   rule outranks is a finding in itself (the 0.118 landscape figure block
   died exactly this way). Tag each finding P0 to P3 and which of
   {hollow-feel, clarity, robustness} it hurts.

6. Split the list: SAFE items (CSS spacing, sizing, presence, legibility,
   dead-rule repair) get fixed now, in index.html or the render modules
   only. Everything else becomes a recommendation with a proposed approach
   and its file anchors. When in doubt whether a change re-litigates a
   recorded decision, it goes in recommendations. Preserve a screen that
   already passes even when the request named it as a prime suspect.

7. Iterate with `npm run shots:target` at both viewports. Treat its overflow
   inventory as evidence to inspect, not an automatic failure list, because
   intentional clipping exists. Keep the exact suspect screen and its direct
   preservation controls in the packet.

8. Verify the final source with `npm test`, then `npm run build` once, then
   `npm run shots:check:nobuild`. If an intended structural change exceeds the
   visual gate tolerance, inspect the exact drift, run
   `npm run shots:baseline:nobuild`, and commit
   `scripts/shots-baseline.json` in the same version. Never weaken the gate to
   make the change pass.

9. Run `npm run shots:nobuild` last. The full runner executes the two viewport
   groups concurrently, keeps motion before reduced motion within each group,
   isolates output directories, and merges logs in deterministic order. It is
   still the authoritative full-run gate. Set SHOTS_BEFORE to the prior shots
   root to populate automatic before and after pairs in
   `shots/review/index.html`. Compare every changed screen and its controls;
   any screen that got worse reverts. Note honestly which checks could not run.

10. Fresh-context second pass: dispatch the independent art director
   immediately after the final screenshots exist. Give it
   `shots/review/review-packet.md`, the named AFTER screenshots, and live render
   files, but never the findings list. Ask for ranked findings. Adopt what is
   safe, add the rest to recommendations, and say which findings confirmed
   yours.

11. Deliver: before/after tiles for every changed screen, the graded findings
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
