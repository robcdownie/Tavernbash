---
name: query-runs
description: Query Robbie's real Tavern Bash play data from the Supabase Cloud Ledger to answer questions about his own runs or the game's balance. Use whenever Robbie asks things like "how am I doing", "check my last runs", "what's my clear rate", "how did I do at Lantern N", "compare version X to Y", "which hero am I winning most with", or any question about actual play history rather than the design/spec of the game. Also use when reviewing a balance change he just shipped and live evidence would settle the question.
---

# Querying the Cloud Ledger

Robbie's finished runs sync to a private Supabase project (0.91.0). A read-only
analytics account can query them, but only for players who opted into
Share balance data, which is on for Robbie's own account. This is real play
data, not the sim: use it when the question is about what actually happened,
not what the balance harness predicts.

## Running a query

```
npm run reports -- --last 20
```

This reads `.env.analytics` (repo root, gitignored) automatically. No setup, no
prompting Robbie for anything: if that file exists, the command just works.

Useful flags, all combinable:

| Flag | Effect |
|---|---|
| `--last N` | most recent N runs (default 20, max 500) |
| `--version 0.91.0` | filter to one game version |
| `--route quick` or `--route long` | filter by route mode |
| `--lantern N` | filter by Lantern level |
| `--hero <id>` | filter by hero id (e.g. `kiln`, `venom`, `silkblade`) |
| `--omen <id>` | filter by Omen id |
| `--result <value>` | filter by exact result string (`win`, `loss`, `quick_clear`, `long_clear`) |
| `--since <date>` | only runs ended on or after this date |
| `--json` | machine-readable output instead of the table |
| `--full` | include the complete nested report JSON (board, vault, charms, full metrics) per row, implies `--json`-style output |

Examples:

```
npm run reports -- --last 10
npm run reports -- --version 0.91.0 --route long --last 100
npm run reports -- --hero silkblade --full
npm run reports -- --lantern 3 --result loss
```

## Reading the default table output

Columns: `ended` (date), `version`, `road` (quick/long), `L` (Lantern level),
`result`, `hero`, `omen`, `min` (gameplay minutes), `resolve` (Resolve
remaining at the end, 0 on a loss). The header line also reports total runs,
clears, and clear rate for whatever filter was applied.

For anything needing the actual board, damage attribution, or timing
breakdown, add `--full` and read the JSON: each row's `report` field is the
same shape `buildRunRecord` produces (see `src/route-report.js`), so it has
`economy.board`, `economy.vault`, `metrics.wares`, `progress`, `timing`, etc.

## What this can and cannot tell you

It has exactly what Robbie has actually played, nothing more. A handful of
runs is anecdote, not a balance verdict: for population-level claims (win
rates by hero, whether a change moved the needle broadly), the seeded
`scripts/route-sim.js` / `scripts/lantern-ladder.js` harnesses are the
correct tool, not this. Use Cloud Ledger data to spot-check a real run, sanity
against a sim readout, or answer "what actually happened when I played this."

## If it fails

`Cloud Ledger query failed: Invalid login credentials` or a missing-env error
means `.env.analytics` is absent or the analytics reader account changed.
Do not try to recreate it from scratch; tell Robbie the reader credentials
need attention and point him at `cloud-ledger-setup.md` in the repo root,
which documents how the reader account and `.env.analytics` are set up. Never
ask him to paste a password into chat; if a new one is needed, have him
generate it and paste it once, then write it straight to `.env.analytics`.
