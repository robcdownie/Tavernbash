# Claude Code prompt: Launch R8 through Launch R12 acceptance review

You are the independent acceptance reviewer for the next five high-level Tavern Bash launch projects.

Repository: `C:\Robbie\bazaar-brawler`

Candidate roadmap: `roadmap-launch-r8-r12-2026-07-18.md`

Baseline ruling: `codex-adversary-review-2026-07-18.md`

Your task is to source-verify the candidate roadmap, attack its assumptions, and return an explicit acceptance verdict. This is a read-only review. Acceptance authorizes later reservation and implementation only after Robbie approves it. It does not authorize implementation during this review.

## Read-only constraints

Do not edit or create any file.

Do not commit, push, checkout, reset, stash, merge, rebase, create a branch, create a worktree, reserve a version, or change repository state.

Do not install packages or run generators, formatters, ship scripts, development servers, builds, or test commands that may rewrite generated artifacts.

You may run read-only source inspection and deterministic diagnostic commands when needed. Prefer current recorded outputs when they are source-verifiable.

Record `git status --short`, the current branch, `git rev-parse HEAD`, and `git worktree list --porcelain` before reviewing. Also record SHA-256 hashes for the candidate roadmap, the baseline ruling, every required-reading file, and every additional tracked file used to support a material finding. Repeat the branch, HEAD, status, worktree list, and file hashes at the end.

If the branch, HEAD, status text, worktree list, candidate-roadmap content, or any relied-on file hash changes during the review, stop and report a review-target collision. A pre-existing modified state that remains merely marked `M` is not enough: its content hash must also remain stable. Preserve and report any pre-existing untracked or modified files exactly as found.

Do not begin any Launch R8 implementation.

## Required reading

Read these files before judging the roadmap:

1. `AGENTS.md`
2. `CLAUDE.md`
3. `roadmap-launch-r8-r12-2026-07-18.md` in full
4. `codex-adversary-review-2026-07-18.md` in full
5. `codex-briefing-2026-07-18.md`
6. `audit-2026-07-17.md`
7. `handoff-bazaar-brawler-2026-07-09.md` in full
8. `handoff-bazaar-brawler-2026-07-10.md` in full
9. `handoff-bazaar-brawler-2026-07-13-R4.md`, especially sections 4, 8, and 9
10. `handoff-bazaar-brawler-2026-07-14-R7.md`
11. `difficulty-worker-notes-2026-07-18.md`
12. `sim-matrix-2026-07-18.md`
13. `design-unlocks-0.92.md`
14. `design-monster-variance.md`
15. `design-build-identity.md`
16. `reflection-notes.md`
17. `ROADMAP.md`
18. Every source module, test, and script directly relied on by a candidate project

Also inspect:

1. `git log --oneline --decorate -25`
2. `git worktree list --porcelain`
3. `git branch -vv --all`
4. The current package version and test scripts
5. Any tracked coordination, reservation, schema, map-version, or content-epoch state
6. Current save, map, route decision, simulator, market, and deployment code when a candidate premise depends on it

Treat live source, current git history, and any newer tracked coordination state as current truth. Treat stale `ROADMAP.md`, `CLAUDE.md`, and historical handoffs as evidence of prior decisions, not automatic current truth.

Cite every material finding as `path:line`. Separate verified fact from inference. Do not accept a claim merely because the candidate roadmap or Codex review states it.

## Mandatory naming ruling

Determine whether the candidate's project namespace is unambiguous.

The repository already uses bare `R8` for the completed content phase in `handoff-bazaar-brawler-2026-07-13-R4.md`, current tests, source comments, and commit history. The candidate introduces the explicit names `Launch R8` through `Launch R12` while preserving historical content R8.

Apply these rules:

1. Unqualified reuse of bare `R8` through `R12` is a source-of-truth collision.
2. Full acceptance requires an explicit namespace that cannot be confused with historical content R8 in reservations, handoffs, branches, or commits.
3. Verify that the candidate never proposes renaming current R8 code or tests.
4. If `Launch R8` is still too ambiguous for reliable project state, return `ACCEPT WITH REQUIRED CHANGES` and provide the exact replacement namespace.
5. If the duplicate meaning could cause an unsafe version reservation or implementation handoff, return `REJECT`.

State the recommended canonical labels.

## Adversarial method

Try to falsify each project's premise before evaluating its execution plan.

For every project:

1. Identify the player or release problem it claims to solve.
2. Find direct current source evidence for that problem.
3. Search for counterevidence, already completed work, stale assumptions, and hidden coupling.
4. Identify at least one plausible failure mode.
5. Check whether the proposed evidence can detect that failure.
6. Check whether a safer or smaller dependency must land first.
7. Check whether the project collides with another project's files, version, owner, worktree, data collection, or acceptance gate.
8. Verify that its exit package is sufficient for the next project to start without rediscovery.

Do not manufacture criticism. If a project survives a serious falsification attempt, state what you tested and why it held.

Rank findings as `BLOCKER`, `HIGH`, `MEDIUM`, or `LOW`. Every blocker or high finding must include the affected project, source evidence, consequence, and exact required correction.

## Hard acceptance gates

Evaluate every gate explicitly as `PASS` or `FAIL`.

### G1. Five-project structure

The roadmap contains exactly five distinct high-level projects. Each has a coherent outcome and is not merely a renamed patch version or an unrelated bundle.

### G2. Historical and current truth

The roadmap resolves the historical R8 collision, uses the current GitHub Pages deployment path, does not schedule already completed simulator-branch rescue work, and does not rely on stale version, test-count, or Netlify claims.

### G3. Complete reconciliation

Every still-live item in the Codex road-to-1.0 plan is mapped to one project, explicitly deferred, or explicitly killed with a reason. No launch requirement disappears silently.

Check at least:

1. Coordination and version reservations
2. Content epoch and active-run compatibility
3. Route decision transaction safety
4. Hero and Omen compatibility
5. Board Aspect repair
6. Resolve difficulty reshape
7. Merchant bargains and commissions
8. Scoped diagnostics
9. Reroll heat
10. Treasure parity
11. Stateful Rest
12. Lasting Shrine
13. Tutorial and rules reference
14. Mobile clarity and signature surfacing
15. Offline install and update handling
16. Daily Market
17. Native release preparation
18. The 1.0 release gate

### G4. Dependency order

Process isolation and active-run compatibility precede churn. Measurement prerequisites precede tuning. The difficulty worker's scope remains reserved. Merchant precedes scoped diagnostics. Tutorial follows the systems it teaches. Packaging follows the display-name decision.

Any departure needs stronger current evidence than the baseline ruling.

### G5. One new system per version

A high-level project may contain several implementation versions, but its version envelope preserves one new system per version. Count process, save, analytics, offline, packaging, and player-facing systems. The roadmap cannot bundle several non-UI systems by claiming that only player-facing systems count.

### G6. Determinism and simulator purity

No project introduces hidden RNG draws, nondeterministic replay state, DOM coupling in the engine, or mid-fight player input. Any engine-semantic change receives a separate version and golden-trace gate.

### G7. Durable state

Save migrations, content epochs, choices, payments, receipts, rewards, and reload ordering have exact-once acceptance checks. A content or balance update cannot silently retire a supported active run.

### G8. Measurable acceptance

Every project defines objective exit criteria, evidence sources, relevant sample sizes, failure thresholds, and a reopen or revert rule. Route simulation is not used to approve mechanics it labels proxy or blind. Cloud Ledger remains optional, private, offline-first, and non-blocking.

### G9. Choice-equity continuity

Merchant bargains remain ahead of scoped diagnostics unless newer evidence justifies changing that order. Treasure, Rest, and Shrine remain in sequence. More catalog content does not displace pre-1.0 validation and choice work.

### G10. Decision authority

The roadmap does not silently decide Robbie's reserved calls:

1. Targeting-rule reopen
2. Signature Model A or Model B
3. Display name
4. Final push and deploy approval

Recommendations are allowed. Implementation cannot infer approval from silence.

Verify that targeting and signature rulings are recorded as 0.99.1 outputs. A later veto must receive a new reservation and renumbering. The display-name ruling remains due before native metadata.

### G11. Ownership and collision safety

Every project has one accountable integrator, version-level owners, dependency boundaries, likely hot files, and collision mitigation. No two writers share a checkout or version reservation.

### G12. Launch closure

The five-project sequence has a credible route to 1.0, including tutorial, device validation, offline behavior, Daily Market, packaging, report cohorts, and explicit release gates. It does not treat content completion as commercial readiness.

### G13. Execution start safety

The roadmap states an exact condition under which Launch R8 may begin. Current missing tooling, dirty state, undecided authority, or an in-flight worker cannot be waved away.

## Ownership ruling

For each project, recommend one accountable integrator from:

1. Codex
2. Claude
3. Difficulty worker

A project may have version-level implementers and a separate reviewer, but it must have one accountable integrator. Do not assign ownership based only on who authored the roadmap.

Base the recommendation on:

1. Existing lane ownership
2. Architecture and exact-once risk
3. Balance and simulation specialization
4. Current reservations and collision risk
5. Whether independent adversarial review is needed

For Launch R8, answer directly:

1. Should Claude lead and integrate it as proposed?
2. Should Codex implement 0.99.3 as proposed?
3. Would Codex be safer as the single Launch R8 owner?
4. Is a prerequisite or Robbie decision required before either starts?
5. What exact commit, worktree, tooling, and state condition makes it safe to begin?

## Verdict definitions

Use exactly one verdict for each project and one for the whole roadmap.

`ACCEPT`

All hard gates pass. No required correction remains. The project is ready for Robbie's approval, reservation, and later implementation.

`ACCEPT WITH REQUIRED CHANGES`

The direction is sound, but exact bounded corrections are required. This is not permission to implement. Give replacement wording or structural changes precise enough to apply without interpretation.

`REJECT`

A premise, sequence, dependency, ownership assignment, acceptance method, settled rule, or source-of-truth assumption is materially unsafe. State what must be redesigned before resubmission.

Aggregation rule:

1. Any project marked `REJECT` makes the roadmap `REJECT`.
2. Otherwise, any project marked `ACCEPT WITH REQUIRED CHANGES` makes the roadmap `ACCEPT WITH REQUIRED CHANGES`.
3. The roadmap is `ACCEPT` only if all five projects are `ACCEPT`.

Do not hedge between verdicts.

Only an overall `ACCEPT` may authorize a reservation or implementation handoff. If the overall verdict is `ACCEPT WITH REQUIRED CHANGES`, the final implementation ruling must say not to begin until the tracked roadmap is corrected, committed, and accepted in a new frozen-target review. `REJECT` also requires a do-not-begin ruling.

## Required output

Return the review in this order:

1. `# Launch R8 through Launch R12 acceptance review`
2. `## Overall verdict`
3. `## Frozen review target`
4. `## Critical adversarial findings`
5. `## Naming and history ruling`
6. `## Source verification table`
7. `## Reconciliation table`
8. `## Launch R8 review`
9. `## Launch R9 review`
10. `## Launch R10 review`
11. `## Launch R11 review`
12. `## Launch R12 review`
13. `## Cross-project collision matrix`
14. `## Hard-gate scorecard`
15. `## Exact required roadmap changes`
16. `## Implementation handoff ruling`

The frozen target section includes branch, initial HEAD, final HEAD, initial status, final status, worktrees, and whether the review target stayed unchanged.

For each project section include:

1. Premise verdict
2. Scope verdict
3. Dependency verdict
4. Acceptance-gate verdict
5. Failure mode tested
6. Collision risks
7. Recommended accountable integrator
8. Recommended version owners
9. Recommended reviewer
10. Exact required changes
11. Final project verdict

The reconciliation table maps every live road-to-1.0 version and killed or deferred original choice-equity item.

End with exactly one of these forms:

`IMPLEMENTATION RULING: Claude may begin Launch R8 after <specific condition>.`

`IMPLEMENTATION RULING: Codex should implement Launch R8; Claude should review at <specific gate>.`

`IMPLEMENTATION RULING: Do not begin Launch R8 until <specific blocker> is resolved.`

## Writing constraints

Use zero Unicode em dashes and zero Unicode en dashes. Use ASCII hyphens, commas, colons, or parentheses instead.

Keep the review direct and evidence-backed. Do not soften a rejection to preserve consensus. Do not make code changes.
