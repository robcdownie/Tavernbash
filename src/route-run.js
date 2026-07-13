"use strict";
/* The route run aggregate: the durable, serializable truth for a Long Bazaar
   run. This first slice owns the run identity and the navigation controller
   state, plus the single reducer seam (the only call to route.transition).
   Later R4 commits fold the economy (gold/board/shop/vault) and the durable
   instance-id counter into this same object so G stops holding separate truths.

   What lives here is only what must survive a reload: identity, the pure
   controller state, and the id counter. The map and fights are regenerated
   from the seed; UI transients (selection, timers, DOM) never belong here. */
import {initRoute, transition} from './route.js';

export const SCHEMA_VERSION = 2;

/* a run id that is stable across reloads: the run seed is already unique per
   run (it is minted from the clock), so it doubles as the durable identity */
function runIdFor(seed){ return 'r' + (seed >>> 0).toString(36); }

/* a fresh aggregate for a new run. setup carries the run seed; hero, anomaly,
   and tags join the aggregate in a later commit when the whole setup becomes
   canonical here rather than on G. */
export function newRun(setup){
  const seed = setup.seed >>> 0;
  return {
    schemaVersion: SCHEMA_VERSION,
    runId: runIdFor(seed),
    revision: 0,
    seed: seed,
    route: initRoute(seed),
    ids: {nextItem: 1}
  };
}

/* the ONLY place the navigation controller advances. Mutates run.route in
   place, bumps the revision, and hands the caller the effects to run. */
export function advance(run, map, action){
  const r = transition(run.route, map, action);
  run.route = r.state;
  run.revision++;
  return r.effects;
}

/* codec: serialize keeps only the durable fields; revive rebuilds the aggregate
   and fills defaults for anything an older save omitted. The map is not stored
   (it is regenerated from the seed by the caller). */
export function serializeRun(run){
  return {
    schemaVersion: SCHEMA_VERSION,
    runId: run.runId,
    revision: run.revision || 0,
    seed: run.seed >>> 0,
    route: run.route,
    ids: {nextItem: (run.ids && run.ids.nextItem) || 1}
  };
}

export function reviveRun(d){
  const seed = (d.seed >>> 0);
  return {
    schemaVersion: SCHEMA_VERSION,
    runId: d.runId || runIdFor(seed),
    revision: d.revision || 0,
    seed: seed,
    route: d.route,
    ids: {nextItem: (d.ids && d.ids.nextItem) || 1}
  };
}
