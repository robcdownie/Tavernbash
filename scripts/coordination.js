"use strict";
/* Launch L1 coordination and release safety (0.99.1).

   Pure, dependency-free helpers for the canonical state file, the reservation
   validator, and the explicit-staging plan. No git or filesystem side effects
   live here: callers read the state file and run git, then pass the data in.
   Everything is deterministic and covered by tests/coordination.test.js.

   The three jobs:
   1. resolveWorktreePath / validateReservations: reject a version, branch, or
      resolved worktree path that is booked by two active reservations at once.
   2. parsePorcelain: read `git status --porcelain` into typed entries.
   3. planStaging: turn those entries plus an approved file set into an explicit
      stage list, refusing any unexpected path so shipping never runs git add -A. */

export const STATE_SCHEMA = 1;

/* Normalize a worktree path so two spellings of one location collide: forward
   slashes, no trailing slash, lower case (the target host is Windows, whose
   paths are case-insensitive). */
export function resolveWorktreePath(p){
  if(!p) return "";
  return String(p).replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

/* A reservation is closed (no longer holding its slot) once its status says so.
   Anything else counts as active and competes for its version, branch, and
   worktree. */
const CLOSED = new Set(["done","complete","completed","superseded","abandoned","cancelled","closed"]);
export function activeReservations(reservations){
  return (reservations || []).filter(function(r){
    return !CLOSED.has(String((r && r.status) || "").toLowerCase());
  });
}

/* Collision check across the active reservations. Returns a list of plain
   error strings; an empty list means the set is safe. Two active reservations
   may not share a version, a branch, or a resolved worktree path. */
export function validateReservations(reservations){
  const errs = [];
  const active = activeReservations(reservations);
  const seen = {version:new Map(), branch:new Map(), worktree:new Map()};
  const labels = {version:"version", branch:"branch", worktree:"worktree path"};
  function check(key, raw, r){
    if(raw == null || raw === "") return;
    const norm = key === "worktree" ? resolveWorktreePath(raw) : String(raw);
    const prior = seen[key].get(norm);
    const owner = (r && r.owner) || "unknown owner";
    if(prior !== undefined){
      errs.push("duplicate active " + labels[key] + " " + JSON.stringify(raw) +
        " reserved by both " + prior + " and " + owner);
    } else {
      seen[key].set(norm, owner);
    }
  }
  for(const r of active){
    check("version", r.version, r);
    check("branch", r.branch, r);
    check("worktree", r.worktree, r);
  }
  return errs;
}

/* Minimal structural sanity for the state file. Returns error strings. */
export function validateState(state){
  const errs = [];
  if(!state || typeof state !== "object"){ return ["state is not an object"]; }
  if(state.stateSchema !== STATE_SCHEMA){
    errs.push("stateSchema " + JSON.stringify(state.stateSchema) + " is not " + STATE_SCHEMA);
  }
  if(!Array.isArray(state.reservations)){
    errs.push("reservations must be an array");
  } else {
    for(const e of validateReservations(state.reservations)) errs.push(e);
  }
  return errs;
}

/* Parse `git status --porcelain` (v1, newline separated). Each line is two
   status letters, a space, then the path. Untracked paths carry "??". A rename
   line "old -> new" resolves to the new path. */
export function parsePorcelain(text){
  const out = [];
  if(!text) return out;
  for(const line of text.split(/\r?\n/)){
    if(!line) continue;
    const xy = line.slice(0, 2);
    let path = line.slice(3).trim();
    const arrow = path.indexOf(" -> ");
    if(arrow >= 0) path = path.slice(arrow + 4);
    if(path.length >= 2 && path[0] === '"' && path[path.length - 1] === '"'){
      path = path.slice(1, -1);
    }
    out.push({xy:xy, path:path});
  }
  return out;
}

/* Turn porcelain entries plus an approved file set into {stage, refuse}.

   An untracked path ("??") must be in `approved` or it is refused: this is the
   real hole that git add -A left open, where a stray new file rode into a
   commit. In strict mode a tracked change must also be approved, so an
   unexpected modified file stops the ship too. Shipping proceeds only when
   refuse is empty. */
export function planStaging(entries, approved, opts){
  const strict = !!(opts && opts.strict);
  const set = new Set((approved || []).map(function(p){ return String(p).replace(/\\/g, "/"); }));
  const stage = [], refuse = [];
  for(const e of (entries || [])){
    const p = String(e.path).replace(/\\/g, "/");
    const ok = set.has(p);
    const untracked = e.xy === "??";
    if(untracked){
      if(ok) stage.push(e.path); else refuse.push(e.path);
    } else if(strict && !ok){
      refuse.push(e.path);
    } else {
      stage.push(e.path);
    }
  }
  return {stage:stage, refuse:refuse};
}
