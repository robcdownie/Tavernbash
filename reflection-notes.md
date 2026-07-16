---
date: 2026-07-16
tags: [reflection, bazaar-brawler]
type: reflection
---

# Reconciled reflection notes: highest leverage improvements, 2026-07-16

This is the authoritative ranking from the two concurrent diagnosis passes. The Claude-side raw assessment is preserved below for auditability, but its candidates are merged and re-ranked here.

Evidence base:

- This Codex pass used three subagents: one mined 14 distinct Codex root sessions from 2026-07-12 through 2026-07-16, one mined git history and hotspots, and one inspected current scripts, tests, CI, telemetry, and existing skills.
- The concurrent Claude pass mined six Claude Code sessions and the cross-agent handoff history. Counts below do not treat pasted Claude artifacts inside a Codex session as extra sessions.
- Repo snapshot: 101 commits since 2026-07-12. During this read-only diagnosis, another agent moved HEAD from `5b36d7a` to `aed890f` and changed the dirty file set several times. The write collision on this file is itself evidence for items 1 and 2.
- Recurrence counts mean distinct sessions, not repeated messages inside one session.

## Ranked calls

| Rank | Cluster | Call | Recurrence | Build cost |
|---|---|---|---|---|
| 1 | Canonical state and cross-agent handoff | Fix | 13 of 14 Codex sessions needed long briefs; 4 direct spec-drift incidents | Small |
| 2 | Safe, complete release preparation | Automation | 4 release/concurrency sessions plus a live collision in this diagnosis | Small to medium |
| 3 | Tavern Bash adversarial review gate | New skill | 12 explicit review sessions; review behavior appeared in all 14 | Small |
| 4 | Route decisions as durable transactions | Fix | 8 sessions revisited atomicity, reload, or exactly-once behavior | Medium |
| 5 | One encounter and simulator path | Fix | 4 sessions found or worked around simulator drift | Medium |
| 6 | Run-report ingest and analysis | Automation | 3 sessions manually reduced repeated report batches | Small to medium |

## 1. Canonical state and cross-agent handoff

**Call: fix. Do not make the state itself a skill.**

This is the highest recurrence cluster. The project repeatedly makes Robbie carry approved specs, current code state, version ownership, and one agent's verdict to the other agent by hand.

Session evidence:

- `019f58be-d59f-7fa2-a552-7fde2b589f71`: the three approved design documents were attached.
- `019f599a-7b62-7d93-8cb0-17074538c1e7` and `019f59c9-0258-7471-9c8d-cc45aaf91805`: the approved documents were absent from the checkout, briefs were duplicated, and review had to fall back to partial context.
- `019f6132-8346-7282-85c6-ee52f52e740e`: the same three documents were attached again.
- `019f5bce-3cae-7b73-bf49-e328e34d686d`: the user had to warn that the checkout had changed since the prior review.
- `019f6ad9-8aac-7032-b5c2-8364758c1724`: the full project state was pasted twice, then the Lantern spec and its revision were ferried between Claude and Codex.
- The Claude-side pass found about 14 Codex verdicts pasted back and about 10 requests to prepare another Codex prompt across four of six Claude sessions.

The repo is currently contradictory:

- During the audit `package.json` was `0.88.2`, while `ROADMAP.md` said current build `0.87.0` and assigned `0.88.0` to a tutorial that did not ship under that number.
- `AGENTS.md` still directs Netlify deployment, while `CLAUDE.md` says Netlify is retired and GitHub Pages at platosd.com is canonical.
- `playthrough-checklist.md` still names the retired Netlify site and `bb-v25`.
- Catch-up or correction commits recur: `4a53570`, `ca0c494`, `766d5c7`, `8ba1beb`, and `68c7bc9`.

What this wants:

- One short, current, tracked state file with build version, deploy target, active roadmap slots, active owner or worktree, save and map schema versions, canonical simulator, and current verification counts.
- Stable rules only in `AGENTS.md` and `CLAUDE.md`; move release history to a history document.
- Commit approved source specs under a dedicated path. Exempt that source path from the prose dash scan or normalize documents on import.
- A `coordination/` convention for substantial cross-agent work: a checked-in brief generated from live git state, with a verdict file only when the review request explicitly authorizes that write. Review-only requests must remain read-only.
- Put recurring environment facts in the standing instructions: `npm.cmd` on this Windows host, strict port 5199, commit messages from a file, and DOM measurement when preview animation is throttled.

The brief generator can be a small automation later. The root call is a source-of-truth fix, not a brief-writing skill.

## 2. Safe, complete release preparation

**Call: automation. Repair or replace `scripts/ship.js`; do not add another shipping skill.**

The original script solved command noise, but its safety and verification boundaries no longer match the project.

Session and repo evidence:

- Earlier Claude Session B `f6797e50` had 51 test runs and 43 commits, which created the pressure for the script.
- `019f6132-8346-7282-85c6-ee52f52e740e` used unit, resume, layout, build, push, and live verification as the real gate.
- `019f6308-a32d-7df1-8ab6-8f71d4d9b773` repeatedly authorized multi-version publishing.
- `019f6ad9-8aac-7032-b5c2-8364758c1724` explicitly allocated simultaneous Claude and Codex version ranges.
- In the current diagnosis session `019f6bc1-d23f-78a1-b290-a9013a094562`, HEAD advanced and the dirty set changed while all audit agents were read-only.
- `scripts/ship.js` runs only `npm test`, then `git add -A`, and hard-codes a Claude coauthor. About 98 commits carry that hard-coded trailer.
- `.claude/settings.local.json` is untracked and not ignored. A broad stage can capture local approval and path history.
- Production CI runs only unit tests and build. The 54 Playwright checks, including resume and layout coverage across two viewports, are outside the production gate. `e2e/resume.spec.js` has changed in 11 commits.

What this wants:

1. Separate worktree or branch per active implementation agent, plus a version reservation in the canonical state file.
2. A non-pushing release-preparation command that refuses unexpected pre-existing changes and stages only an explicit reviewed file set or already-staged changes.
3. Unit tests and production build always. Add a fresh Playwright smoke, resume, and layout subset when route, UI, save, map, or CSS surfaces change. Add sim and guard checks when combat, encounter, economy, or balance surfaces change.
4. Generate cache identity from the build or package version. Do not rely on a separate manual `CACHE_V` edit.
5. Make attribution caller-supplied. Keep `git push origin main` as an explicit user-authorized step.

This is ranked second because the build is small and the failure mode is silent cross-agent contamination.

## 3. Tavern Bash adversarial review gate

**Call: new skill. This is the only new skill recommended by this pass.**

The recurrence threshold is decisively met. Explicit review sessions:

- Route and architecture: `019f599a-7b62-7d93-8cb0-17074538c1e7`, `019f59c9-0258-7471-9c8d-cc45aaf91805`, `019f5a13-55c5-7983-8c33-ec29fd6f5eeb`, `019f5bce-3cae-7b73-bf49-e328e34d686d`, `019f5c0f-9551-74a2-a7b2-03077196360c`, `019f5c5a-ca4e-7f42-8c80-e079f61d4829`.
- Design, balance, content, and oracle gates: `019f5d13-d427-7603-8b9c-ba7e66262056`, `019f5d5a-25d2-7012-bf50-ea86accaf6c0`, `019f5e40-cf63-7cf0-8790-115ac24ab2d8`, `019f5e9e-2a6c-7e81-89e5-1f5b2fd044c0`, `019f6308-a32d-7df1-8ab6-8f71d4d9b773`, `019f6ad9-8aac-7032-b5c2-8364758c1724`.

The pattern already has proven value: four route defects before R1, three simulator defects before tuning, oracle gaps found by mutation checks, missing R8 acquisition paths, and blocking Lantern design corrections. `handoff-bazaar-brawler-2026-07-13-R4.md` already says when to invoke Codex and when not to.

The skill should encode procedure, not stale conclusions:

- Read the live checkout, the scoped diff or target commits, and the relevant approved spec.
- Select a mode: architecture and transactions, combat-oracle gate, balance and simulator, content fidelity, or major UI flow.
- Preserve settled decisions and review-only boundaries.
- Verify test sensitivity, not only green status. Use mutation-style checks when an oracle is the gate.
- Return a hard go or no-go, severity-ranked findings, one concrete failure scenario per finding, and the smallest adequate fix.
- Skip mechanical art filing, routine docs, and other low-risk work.

Do not create separate balance, route, combat, and content review skills. They are modes of the same recurring judgment workflow.

## 4. Route decisions as durable transactions

**Call: fix. Pair it with a reusable crash-point matrix, but do not broadly rewrite `ui.js`.**

The same seam has been revisited in eight Codex sessions:

`019f599a-7b62-7d93-8cb0-17074538c1e7`, `019f59c9-0258-7471-9c8d-cc45aaf91805`, `019f5a13-55c5-7983-8c33-ec29fd6f5eeb`, `019f5bce-3cae-7b73-bf49-e328e34d686d`, `019f5c0f-9551-74a2-a7b2-03077196360c`, `019f5c5a-ca4e-7f42-8c80-e079f61d4829`, `019f6132-8346-7282-85c6-ee52f52e740e`, and `019f6308-a32d-7df1-8ab6-8f71d4d9b773`.

Repo consequences include:

- `97b390b`: critical route correctness fixes.
- `67da4bb`: event cost-bypass and soft-lock fixes.
- `6d6f83f`: blocking retry after a failed critical save.
- `3e1339d`: missing Charm checkpoints and durable choices.
- `37502f1`: duplicate Treasure uniques.
- `8a735b8`: negotiation outcomes were not durably distinguishable.
- `242cdc2`: reward fidelity and route cadence defects.

The residual risk is direct event-callback mutation in `src/route-ui.js`: gold, wares, tier costs, rerolls, metrics, and checkpoint ordering can diverge between UI, simulator, and reload behavior.

The narrow fix is one pure route-decision transaction API. It should validate affordability and ownership before mutation, use keyed deterministic generation, write the receipt or pending choice, emit metrics, and expose one stable checkpoint boundary. UI and simulator should call the same operation.

Then generalize the existing browser coverage into a fault-injection matrix that reloads after each committed route transition and asserts exactly-once settlement, identical offers, valid migration, and no lost choice. This prevents each new event from inventing its own reload test.

## 5. One encounter and simulator path

**Call: fix the existing path. Do not build another simulator or a simulator skill.**

This recurred in four sessions:

- `019f5d5a-25d2-7012-bf50-ea86accaf6c0`: mutable fight items, the mislabeled `D1boss` metric, biased `frontier[0]` sampling, and incomplete Gate Camp modeling invalidated the first read.
- `019f5e40-cf63-7cf0-8790-115ac24ab2d8`: a fusion-aware corrected model was required before the economy verdict was defensible.
- `019f6308-a32d-7df1-8ab6-8f71d4d9b773`: live reports exposed a non-monotonic difficulty curve and missing per-ware analysis that aggregate sim output had hidden.
- `019f6ad9-8aac-7032-b5c2-8364758c1724`: scout, fight, and simulator construction drift became a blocking Lantern design concern.

`scripts/route-sim.js` changed in nine commits with about 800 lines of churn in two days. The obsolete lobby-era `scripts/balance-sim.js` still exists. The new shared `buildFoe` seam is the right direction, but the simulator still needs to use the same encounter and decision constructors as the live game.

Finish the consolidation:

- Retire or clearly quarantine the old harness.
- Route scout, live fight, and sim through the same encounter builder and composed rule objects.
- Route event choices through item 4's transaction API.
- Maintain a coverage manifest that labels each mechanic `full`, `proxy`, or `blind`.
- Extend the existing harness to the hero, Omen, and Lantern matrix, and compare its ordering and deltas against live reports rather than treating absolute clear rate as ground truth.

## 6. Run-report ingest and analysis

**Call: automation. Capture already exists; automate the receiving and aggregation side.**

Session evidence:

- `019f6132-8346-7282-85c6-ee52f52e740e`: accumulated game reports were pasted for review.
- `019f6308-a32d-7df1-8ab6-8f71d4d9b773`: review began with 15 live playtests, richer telemetry was built, and a roughly 46,000-line export was manually reduced into timing, choices, builds, and failure points.
- `019f6ad9-8aac-7032-b5c2-8364758c1724`: Lantern and choice-equity decisions added more live telemetry gates.

The structured `tavern-bash-run/1` schema, local archive, and batch exporter already exist. The missing piece is a local analyzer that:

- Ingests files or pasted batches, validates schema, and deduplicates by report id.
- Slices by version, route, hero, Omen, and Lantern level.
- Reports timing, choice share, encounter outcomes, retries, ware contribution, economy, fusion, Vault use, and debrief ratings.
- Warns on small samples and partial telemetry.
- Produces a stable markdown and machine-readable summary for roadmap and simulator comparison.

Do not add more manual telemetry fields until this analyzer demonstrates a real data gap.

## Explicit no-action calls

- **Mechanical variety and retention plan: nothing new.** `019f6308-a32d-7df1-8ab6-8f71d4d9b773` and `019f6ad9-8aac-7032-b5c2-8364758c1724` already made the right product call: Lantern plus choice equity before tutorial rebuild, voices, Daily Market, or App Store packaging.
- **Art skills: nothing new.** Art recurrence was concentrated in `019f6132-8346-7282-85c6-ee52f52e740e`, and `art-batch` plus `repair-game-art` now cover it. Single-source those skill files when the next art batch touches them.
- **Device-validation skill: nothing yet.** The phone loop recurred in earlier Claude sessions `5c4fe01a` and `f6797e50`, but post-route work relies more on Playwright and structured reports. Item 2 should generate a change-specific device checklist from the current build. Revisit a skill only if that manual loop returns.
- **Push and deploy skill: nothing.** The mechanics exist. The missing property is safe scope and explicit authorization, handled by item 2.
- **Broad `ui.js` rewrite: no.** Extract the transaction seam only.
- **Automated parity-ledger approval: no.** Manual approval is a useful safety boundary.

## Recommended order

1. Items 1 and 2 before the next concurrent implementation cycle.
2. Item 3 immediately after, because it is cheap and already invoked on nearly every risky phase.
3. Item 4 before the Merchant, Treasure, Rest, and Shrine choice-equity chain expands event mutation.
4. Item 5 before Lantern tuning or the hero and Omen balance matrix is treated as authoritative.
5. Item 6 before asking for the next large playtest batch.

---

# Concurrent Claude-side raw assessment, 2026-07-16

This section is preserved as raw evidence from the concurrent pass. Where it conflicts with the reconciled ranking above, the reconciled ranking wins.

Diagnosis only, second pass. Four subagents mined everything new since the 2026-07-11 reflection below: six Claude Code sessions (07-11 through 07-16), roughly 40 Codex CLI rollouts across 07/12 to 07/16, and 120 commits (0.38.1 to 0.88.2). I clustered the signals and judged each cluster against build cost. Session citations use the Claude session id prefix or the Codex date and local start time.

> Collision warning: on 07-16 at 09:28 Codex was given this same reflection assignment in parallel, authorized to write this same file. If a Codex section appears here, merge the two, do not treat them as independent confirmations; they mined the same transcripts.

## Scorecard on the 07-11 reflection

What last week's builds actually did is evidence for this week's calls:

- **Balance harness: the win.** Rebuilt as `route-sim.js` after the lobby died, cited in commit bodies (0.88.0: "Quick clear 81.3 to 82.5"), used by both agents. Build things the rituals already consume.
- **Ship script: drifted dead.** One commit ever. It never bumped CACHE_V and never pushed, so the handoffs went back to instructing manual bumps. A tool that covers 60 percent of a ritual loses to doing the ritual by hand.
- **Device checklist: dead.** Never checked off, still points at the dead Netlify URL and the deleted lobby game. The 0.82.0 telemetry took its role, and took it better.
- **Debug overlay: shipped, quietly superseded** by telemetry as the feedback channel.
- **Art-batch skill: alive** (0.66.4, 0.76.1), but the pattern re-grew one layer up (see item 7).
- **Onboarding: regressed to debt.** The lobby tutorial shipped 0.48.0, then the lobby was deleted at 0.68.0. Route-native tutorial is owed on ROADMAP; that is game work, not process work.

## 1. The Codex seam: replace Robbie's clipboard with repo files (convention plus a brief-writer skill)

**Verdict: build. This is the dominant cost of the whole window.**

Since 07-12 this project runs a real two-agent cadence: Claude implements, Codex reviews and arbitrates architecture, and every single message between them flows through Robbie's hands, both directions.

Evidence:
- Claude side: about 14 Codex verdicts pasted in and about 10 "give me the prompt for codex" requests across 4 of 6 sessions. Session 0f40035f alone had six round-trips (03:54, 04:19, 06:40, 14:30, 15:29, 16:55), each changing the build plan.
- Codex side: 9 hand-authored state briefs of 2,300 to 6,800 characters across 07/12 to 07/13, each retyping the same facts (repo, 844x390 viewport, version state, "commits 1-3a are landed"). A standard "CODEX BRIEF:" header emerged organically on 07/13 because Robbie was already templating by hand.
- Failure modes of the manual channel: the same handoff message pasted twice 97 seconds apart (Codex 07/16 05:14); the Lantern spec transmitted twice, once pasted in chat and once as the repo file; briefs citing underscore filenames that never existed on disk, costing 6 failed reads (Codex 07/12 20:52 and its fork); one handoff state mismatch where R4 was described as committed but was not (ad33b5fc, 07-13 18:05).
- Codex never writes a verdict to disk. Sessions end with a chat verdict Robbie carries back by hand. Meanwhile Codex already reads the repo on every session start (AGENTS.md mandates the handoff docs, read 100 plus times across rollouts).

What to build: a `coordination/` directory convention. Claude writes `coordination/brief-NN.md` (generated by a small skill from git state plus the standing template, so the boilerplate facts are never retyped); Robbie's message to Codex shrinks to "read coordination/brief-NN.md"; Codex is instructed, in AGENTS.md, to write its verdict to `coordination/verdict-NN.md` before replying; Claude reads it from disk. Robbie stays the trigger and the approver, and stops being the transport.

Cost: small. A directory, a template, one AGENTS.md rule, one skill. Recurs more than anything else measured, roughly daily since 07-12, and it also softens the usage-limit problem: cheap handoffs are what made the Codex solo sprint work.

## 2. The ship ritual: make ship.js cover the whole ritual or delete it (automation)

**Verdict: fix the existing script; it died for a diagnosable reason.**

Every ship is a manual triple: bump `package.json`, bump `CACHE_V` in `public/sw.js`, sometimes bump the save version, then test, commit with the hygiene rules (no backticks, trailer, no `.agents/`), then push.

Evidence:
- 103 commits touch package.json and 38 touch sw.js in five days; CACHE_V went bb-v25 to bb-v61. Commit f2b84af exists solely because a CACHE_V bump was forgotten.
- ship.js shipped 07-11 and was used once, because it neither bumps CACHE_V nor pushes; the R4 and R7 handoffs explicitly route around it back to manual bumps.
- Commit messages are being staged through `.tmp/*.txt` files to dodge PowerShell mangling (r8-art-commit-message.txt, charm-checkpoint-commit-message.txt). That workaround is good; it should be the scripted path, not a trick rediscovered per session.
- Parallel Codex agents sharing the one checkout hit `.git/index.lock` 21 times on 07/14.

What to build: ship.js v2 = test, bump package.json and CACHE_V together (prompt about SAVE_VERSION), commit from a message file, push. Point CLAUDE.md, AGENTS.md, and the next handoff at it as the only ship path. Add the single-writer rule: only the orchestrating session commits; parallel workers hand back patches.

Cost: tiny. Fires about 25 times a day at current pace.

## 3. Playtest telemetry: automate the ingest half (automation)

**Verdict: build the receiving end; playtest bandwidth is the named bottleneck.**

The 0.82.0 telemetry is the best system built this window and its transport is a human pasting JSON.

Evidence:
- `raw/Tavern bash game reports/7-15 gameplay notes.md` in the vault is 1.47 MB of run JSON hand-pasted from the phone.
- Run reports were pasted into Claude four times in ad33b5fc (01:29, 03:04, 03:19, 23:48) and into Codex twice (07/14 23:42, 07/16 09:28).
- Robbie, ad33b5fc: "How many do you need? I cant play a ton right now." And to Codex: make "that copy paste end part" record the most data "so we can keep maximizing the runs I'm already doing." Runs are the scarce resource; each one should land once and feed everything.
- ROADMAP.md already synthesizes "the first seven instrumented reports," so the demand side exists.

What to build: `scripts/ingest-reports.js`. Input: the raw pasted export (file or clipboard dump). Output: one file per run in a `reports/` directory plus a regenerated aggregate summary that route-sim can calibrate against (Codex already calibrated the sim against "Robbie's own sample was ~43%" by hand on 07/13). Then any session, either agent, reads `reports/summary.md` instead of asking him to paste.

Cost: small. The export format already exists and is versioned (`tavern-bash-run/1`).

## 4. Persist the environment lessons both agents keep relearning (fix)

**Verdict: one instructions section, no tooling.**

The same Windows traps were rediscovered live, repeatedly, on both sides:
- `npm.ps1 cannot be loaded` (execution policy) hit Codex in 4 separate sessions across 07/12 to 07/13; the npm.cmd fallback was relearned each time and persisted nowhere.
- PowerShell quoting: 17 ParserErrors and 35 "is not recognized" failures across 12 Codex rollouts (rg regexes and `$var:` drive references), plus Claude's garbled commit (`pathspec 'the'`) in c24fe666.
- The CRLF exit-255 false-failure class disappeared from Claude sessions after the switch to bash heredoc commits (ad33b5fc had 5 errors vs 35 in c24fe666), but that lesson lives only in transcript history.
- The 07-13 preview root-cause (Pixi/WebGL screenshot timeouts are environmental; measure the DOM instead; pin the dev server with `--port 5199 --strictPort`) is in a handoff, not in the standing docs.

What to do: an "environment traps" section in the shared agent instructions: npm.cmd not npm, commits via message file or bash heredoc, rg patterns via file or bash, DOM measurement not screenshots, strictPort 5199. Both agents read instructions at session start; transcripts they do not.

Cost: an hour of writing. Removes on the order of 50 failed tool calls per heavy day.

## 5. Single-source the agent docs and pay the docs debt (fix)

**Verdict: one cleanup session.**

- AGENTS.md is a hand-synced near-duplicate of CLAUDE.md, already divergent, and now gitignored, so its drift is invisible to review. The second brain vault solved this exact problem with a pointer file; do the same here (AGENTS.md says "read CLAUDE.md" plus the Codex-only deltas).
- CLAUDE.md carries a 9,000-word history paragraph whose stale parts (the Netlify saga) get patched with disclaimers in each handoff instead of edited. Claude redeployed to dead Netlify in 0f40035f because of exactly this ("Wait its deployed on netlify"). Move history to HISTORY.md, keep CLAUDE.md current-state.
- Retire the dead weight: balance-sim.js (simulates the deleted lobby), playthrough-checklist.md (points at the dead URL and deleted game), netlify.toml and .netlify/, make-icons.js.
- settings.local.json holds 125 allow entries including whole frozen commit messages and Netlify fossils; prune to patterns in the tracked settings.json.

Cost: medium-small, and it compounds: every future session of both agents onboards from these files.

## 6. Let the approved design docs live in the repo (fix)

**Verdict: exempt them from the dash scan.**

The approved design docs are barred from the repo because their em dashes fail the dash scan, so Robbie re-uploads them every content session (attachments on 07/12 16:52 and 07/14 08:15; the R4 and R7 handoffs both call out the re-upload as a required manual step). The underscore-filename misses in item 1 were this same gap. Fix: a `design/approved/` directory that the dash scan skips (the scan exists to police generated content, not Robbie's source docs), or convert on import. One decision, trivial cost, removes a per-session manual step and a whole class of missing-file errors.

## 7. One art skill, one tool home (small fix)

**Verdict: consolidate, do not rebuild.**

The art pipeline works, but it forked: Claude has `.claude/skills/art-batch`, Codex built its own `repair-game-art` skill live on 07/14 ("Are you able to create a skill to fix them?" / "Yeah, make it repo local") into `.agents/skills/`, and `.tmp/` shows the scratch-tooling pattern regrowing one layer above where art-prep.js fixed it (three mask-test rounds plus a one-off contact-sheet script). Merge to one skill source both agents read, promote the contact-sheet and mask helpers into scripts/. Cost: small.

## Explicit no-action calls

- **Usage limits: nothing to build.** 3 of 6 Claude sessions were interrupted and the R7/R8 sprint moved to Codex until the Friday reset. The mitigation is item 1, cheap handoffs; the sprint itself proved the fallback works ("it got all of this done in 44 minutes").
- **Preview and WebGL screenshot flakiness: nothing new.** Root-caused 07-13, the fixable half (Playwright port) is fixed, the environmental half has a standing workaround. Item 4 persists the lesson; no tooling.
- **Obsidian copy-paste delivery: one line, no skill.** "Single md copy-paste box, phone-first" was requested in 4 sessions; add it as a delivery rule in the instructions and stop re-deriving it.
- **A reflection skill: no.** This is the second run of this exact prompt, and on 07-16 it was given to both Claude and Codex simultaneously, which produced a write collision risk on this very file. The recurrence signal here is coordination, not reflection; item 1 covers it.
- **Route-native tutorial: real debt, wrong list.** It regressed when the lobby died at 0.68.0 and ROADMAP already owns it. Game work, not process work.

## Order of operations

1. Item 2 (ship.js v2) and item 6 (dash-scan exemption): under an hour combined, fire immediately.
2. Item 1 (coordination/ convention plus brief skill): before the next Codex round-trip.
3. Item 3 (report ingest): before the next playtest batch, so no more runs land as pasted blobs.
4. Items 4 and 5 (environment traps, docs single-sourcing) as one cleanup session.
5. Item 7 in passing during the next art batch.

---

# Reflection notes: highest leverage improvements, 2026-07-11

> Status as of 2026-07-12: every buildable item below shipped. Debug overlay, balance harness plus tuning, ship script, art-batch skill, device checklist, and onboarding are all in. The three remaining items are Robbie's, not builds: the on-device playthrough (checklist ready at `playthrough-checklist.md`), the name decision, and the v1 deploy decision. See `ROADMAP.md` for the current forward plan.

Diagnosis only. Two subagents mined the two substantial Claude Code transcripts for this project; I clustered the signals and judged each cluster against build cost. Sources:

- Session A, 2026-07-10 (5c4fe01a): the art pipeline day. 20 human messages, 364 tool calls, 8 hard tool errors. Phases 2 to 4, art and music ingest, no-scroll layout.
- Session B, 2026-07-11 (f6797e50): Phase 5 through 0.37. 34 human messages, 653 tool calls, 24 tool errors, 43 commits, 21 deploy attempts.
- Repo evidence: both handoff briefs, CLAUDE.md, git log (61 commits), .claude/settings.local.json (the approval trail), the memory file preview-screenshot-times-out.md.

Ranked most leverage first. Every skill call cites recurrence; anything that appeared once gets a fix or nothing, not a skill.

## 1. The on-device verification loop (skill plus a small game improvement)

**Verdict: build a device-check skill and a ?debug overlay in the game.**

The single biggest tax in both sessions is that Claude cannot see the thing the work is about. The dev preview freezes requestAnimationFrame and CSS transitions and screenshots time out, so every visual verdict round-trips through Robbie's phone.

Evidence:
- Session A: 3 preview_screenshot timeouts, the workaround memory file written twice, 58 preview_eval calls, 12 preview_resize calls, 4 phone screenshots reviewed by hand.
- Session A msgs 16 to 19: a full false-alarm cycle. Robbie reported scrolling from a browser tab, interrupted a fix in flight, then found the installed PWA was fine. Nothing on screen says which mode or which version is running.
- Session B: zero screenshots attempted, 81 preview_eval calls as the substitute, 9 preview server restarts. Two bugs arrived as phone screenshots ("The battle is overlapping", the reshowing shop card).
- The one item still owed before v1 in CLAUDE.md is Robbie's on-device playthrough, and the deferred list that rides on it keeps growing: sound levels (deferred since the 2026-07-10 handoff), pacing, Dragon Gate difficulty, pulse rings, streaks, enchant temptation.

What to build:
- A debug overlay in the game behind a ?debug query flag or a 5-tap on the version stamp: version number, display mode (standalone vs browser tab), viewport size, fps, and a layout overflow detector that flags any element wider than the viewport. This kills the PWA-vs-browser confusion class outright and turns every phone screenshot into a labeled data point. Small build, pure additive.
- A short device-check skill that structures the round-trip: deploy to the test site, hand Robbie a checklist of exactly what to look at (per the deferred list), and file his screenshots against it. The checklist for the v1 playthrough already exists in fragments across CLAUDE.md; it needs one home.

Cost: small. Recurs in 100 percent of sessions and gates the one owed v1 item.

## 2. A headless balance and pacing harness (automation, then game tuning)

**Verdict: build it. This is the cheapest path to standing next to Battlegrounds and The Bazaar.**

The competitive gap is no longer presentation. Sessions 0.26 through 0.37 closed the visual distance with three research passes. What no session has ever touched: balance, difficulty curve, and run pacing measured with data. The words balance, winrate, and replayability appear zero times across both transcripts. Meanwhile pacing and difficulty questions were raised 10 plus times in Session B and always parked as "only a human run can judge."

That is only half true, and the engine already disproves the other half: the sim is pure, deterministic, seeded, and runHeadless already resolves rival-vs-rival fights instantly. A Monte Carlo harness on top of it can answer, before Robbie ever picks up his phone:

- Run length in rounds (proxy for the 15 to 20 minute target the design doc sets and no one has ever measured).
- Win and loss rates per monster and door band at on-curve boards (is the Dragon Gate a wall or a speed bump; Karkadann-style burst checks at every band).
- Item pick winrates and dead wares (which of the 26 plus uniques never earn their slot; the design doc's own filter is "cut anything that does not change what the player does on turn 4").
- Hero winrate spread across the four heroes (a 10 point spread here is the kind of thing Battlegrounds patches weekly).
- Enchant value at the plus 3 gold premium.

Evidence this is the real gap: Robbie's own research doc in Session B (msg 27) was about visual orchestration because that was the visible gap then. The autobattlers he benchmarks against differentiate on balance depth and are tuned by telemetry. A game with painted art and untuned numbers reads as a demo; a tuned one reads as a game.

Cost: medium-small. One script in scripts/, no engine changes, reuses exports already on globalThis.BB. Output feeds directly into the v1 tuning pass and gives Robbie's device run a hypothesis list instead of an open field.

## 3. The art batch skill (skill, plus promote the scratch scripts)

**Verdict: build a skill. Highest raw recurrence of anything measured.**

The art-drop loop ran constantly in both sessions and rebuilt its tooling from scratch each time.

Evidence:
- Session A: 9 ingest runs while ingest-art.js itself was edited 15 times, 5 zips filed, and the prompt delivery had to be re-asked phone-friendly ("Im on my phone can you give it to me here in a copy paste code box").
- Session A: a whole art batch came back unusable ("framed card scenes, not isolated objects"); the rescue (rounded thumbnail crops) was invented live.
- Session B: 6 ingest runs, 3 manifest rebuilds, and 8 one-off scratchpad scripts (medallion-cut.mjs, circle-cut2.mjs, precrop-charm.mjs, despeckle.mjs) that live nowhere and got individually re-approved; settings.local.json is a fossil record of them.
- Session B: "Wait I dont see the prompts did we not need them?" (a chased deliverable) and "Does this work? If no please say no" (Robbie guarding against polite acceptance of marginal assets).

What the skill does: given a list of new asset ids, emit the prompt blocks phone-first (one copy-paste box each, built from the master template in art-prompts.md); on upload, unzip, strip macOS junk, ingest with the right flags, run the post-processing passes that today live in scratchpad scripts, then QA each asset honestly (transparency, fill percent, dimensions, pass or fail per file) before manifest and test. Also: move medallion-cut, precrop, circle-cut, and despeckle into scripts/ so they stop being reinvented.

The Session A "keep busy" pattern folds in here: four consecutive messages ("do something while i do that", "got like 10 more mins") were Robbie manually re-prompting Claude to use art-generation downtime. The skill should end its prompt-emitting step by proposing the next backlog item to work during the wait. That costs a paragraph, not a system.

Cost: small. The pipeline exists; this is consolidation plus a checklist.

## 4. The ship loop and the deploy decision (automation plus one process decision)

**Verdict: one npm run ship script, one shell-noise fix, and a decision Robbie has to make before v1.**

Evidence:
- Session B: npm test ran 51 times, 43 commits, 21 deploy attempts of which 5 hit the Netlify credit wall ("Account credit usage exceeded"), a second Netlify account was created mid-session as a workaround, and the real site is frozen at 0.15.0. Twelve separate credit mentions. Robbie: "Yes only do a final deployment i dont have a ton of credits."
- Session B: 7 of the 24 recorded tool errors were false failures, PowerShell 5.1 treating git CRLF stderr and the netlify banner as exit 255 on commands that actually passed. Pure noise, and it recurs every session on this machine.
- Session A: 12 builds, 2 deploys (pre credit wall).

What to do:
- scripts/ship: test, version bump, commit, in one command with stderr handled so green runs report green. Add the common invocations to the project allowlist while at it (the fewer-permission-prompts pass).
- The decision: v1 needs a production home. Options are add credits to r.blinkman and deploy the frozen real site, or promote bazaar-brawler-v1 (robcdownie, free, current) to be the real URL. The repo rule "never relink away from the real site" was written before the wall; it should be re-decided consciously, once, by Robbie. Everything else in this document eventually funnels through this gate.

Cost: tiny. This is the cheapest item on the list relative to how often it fires.

## 5. Finish the open visual thread, then onboarding (game improvements)

**Verdict: game work, in this order. No skill; none of it recurs as workflow.**

Session B ended mid-conversation with unresolved visual complaints, so they are the current open thread, not history:
- "these boxes need better backgrounds than just brown" (the ribbon drawers).
- "the circle spinning for the bull market image could either be better or just a different background" (the anomaly reveal).
- Both arrived with three phone screenshots (IMG_2048 to 2050) that are already in the transcript record.

After that, the one competitor table stake with zero coverage in any session or any shipped version: a first-run experience. Battlegrounds, The Bazaar, and Underlords all teach their first fight. Bazaar Brawler drops a new player into hero pick, two health layers, doors, fusion, and burning gold with no guidance. This was never discussed, so it is not a recurrence call; it is a competitive-framing call, and it is the last system-shaped gap between "personal project" and "legitimate autobattler." Scope it as one version: a guided round 1 with four or five contextual callouts, skippable, flagged done in the save.

Cost: the visual fixes are small; onboarding is one honest version of work. Both change what a new player does on turn 4, which is the design doc's own bar.

## 6. Small fixes (do in passing, no ceremony)

- CLAUDE.md still says "Enchantments, the Vault, and heroes stay post-v1" in the layout section even though they shipped as 0.23 to 0.25 and the same paragraph says so. Stale line, one edit.
- The scope-drift incident (the premature 1.0.0 bump, walked back in Session B) had a root cause that is already fixed: the design brief was not in the repo and Robbie had to re-paste it. Both handoffs are now committed. The remaining protection is a v1 definition-of-done checklist, which item 4's deploy decision plus this document's roadmap effectively provide. No new mechanism needed.

## Explicit no-action calls

- **Idle-time orchestration as its own skill: no.** Real pattern (4 re-prompts in Session A) but it folds into the art skill's last step for free. A standing automation would be over-machinery.
- **Replayability and meta systems (more anomalies, cosmetic boards, Vault economy depth): no, stays post-v1.** The transcripts show these were consciously deferred, and the settled-decisions rule says do not re-litigate. Revisit after v1 ships and real humans replay it.
- **Portrait-mode investment: no.** Landscape-first is a recorded 2026-07-10 decision; nothing in either transcript pushes against it.
- **A skill for the premature-version-bump class: no.** One occurrence, root cause already fixed by committing the briefs. Skills are for recurrence; this was an incident.

## The roadmap to a legitimate v1, in order

1. Close the open visual thread from Session B (drawer backgrounds, anomaly reveal) - small, already specified by Robbie's screenshots.
2. Build the balance harness and run it; apply one tuning pass to monsters, doors, heroes, and dead wares with the numbers in hand.
3. Add the ?debug overlay, then run the structured on-device playthrough against a written checklist: pacing (target 15 to 20 minutes, now with the harness's round-count prediction to compare against), sound levels, fight visuals, boss feel.
4. Ship the first-run onboarding version.
5. Make the deploy decision (credits vs promote the test site), bump CACHE_V and SAVE_VERSION, and ship v1 to the production URL.

Steps 1 and 2 can start immediately and neither needs Robbie's phone. Step 3 is the gate everything else waits behind, and items 1 through 4 exist to make that single playthrough count.
