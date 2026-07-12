---
date: 2026-07-11
tags: [reflection, bazaar-brawler]
type: reflection
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
