# AGENTS.md

This file used to be a full, drifting duplicate of an old `CLAUDE.md` (it still
named Netlify as the live deploy path). Launch L1 0.99.1 tracked it and reduced
it to a pointer so there is one source of truth.

## Read these, in order

1. `coordination/state.json` is the canonical current state: build, reviewed
   HEAD, deploy target, save and map and content schemas, the active project,
   version reservations with owners and worktrees, the integration commit, the
   verification summary, and Robbie's recorded rulings. Treat it as live truth.
2. `CLAUDE.md` carries the game design history, data tables, art pipeline, and
   the standing hard rules. Its Commands and Hard rules sections and this file
   are current; ignore any older Netlify prose in its history paragraph.
3. `roadmap-launch-l1-l5-2026-07-18.md` is the live plan from 0.99.0 to 1.0.0.
   `ROADMAP.md` is superseded and marked as such.

## Deploy truth

Deploy is `git push origin main`. GitHub Actions runs `npm ci`, `npm test`, and
`npm run build` on node 22 and publishes `dist` to GitHub Pages at
https://platosd.com. Netlify is retired and dead: every Netlify site, URL, and
`npx netlify deploy` command in the history is out of the deploy path and must
not be used. No push or deploy happens without Robbie's explicit approval after
local verification is summarized.

## Hard rules that bind every agent

- Zero em dashes and zero en dashes anywhere, including code, docs, comments,
  and commit messages. The dash scan in `npm test` enforces it repo-wide.
- One new system per version. Tests green and the production build passes, or
  the version reverts.
- Every writer after 0.99.1 uses a dedicated branch and worktree. The main
  checkout has one integrator. Reservations live in `coordination/state.json`,
  and only the main integrator updates them.
- Shipping stages an explicit approved file set and refuses unexpected paths
  (`scripts/ship.js`, `scripts/coordination.js`); never `git add -A`.
- The combat simulator stays pure, deterministic, and DOM free. The two health
  layers, targeting rules, and economy are settled; do not re-litigate them.
- Never abbreviate a launch project to a bare `L1` through `L5`; the Lantern
  ladder already uses `L1` through `L10`. Use the full `Launch L` labels or the
  descriptive tokens.

Codex working config lives in `.codex/`; this file and the three above are the
shared truth.
