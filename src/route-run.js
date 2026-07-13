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
import {TIERCOST} from './data.js';

export const SCHEMA_VERSION = 2;

/* the ten durable economy fields. run.economy is their single truth; G exposes
   them through accessors (bindEconomy) so the old direct call sites and in-place
   array mutation keep working during the migration. */
export const ECON_FIELDS = ['gold','tier','tierCost','relicIncome','freeReroll','frozen','board','vault','shop','trinkets'];

/* fresh economy for a new run. Defaults match the old inline newRoute literal
   (starting gold 6, tier 1). Kept here so the aggregate owns economy setup. */
export function newEconomy(){
  return {gold:6, tier:1, tierCost:TIERCOST[2], relicIncome:0, freeReroll:false, frozen:false,
          board:[], vault:[], shop:[], trinkets:[]};
}

/* install compatibility accessors for the economy fields on target (the live G).
   Each resolves through this.run.economy at access time (never a closed-over
   run), so replacing G.run cannot leave a stale binding. Getters return the
   exact live value/array and setters store the exact assignment, so in-place
   push/splice and wholesale reassignment both stay canonical. Setters do NOT
   bump revision: accessors cannot observe array mutation, so revision stays a
   navigation counter (advance()) rather than a misleading partial economy log. */
export function bindEconomy(target){
  ECON_FIELDS.forEach(function(k){
    Object.defineProperty(target, k, {
      configurable:true, enumerable:true,
      get:function(){ return this.run.economy[k]; },
      set:function(v){ this.run.economy[k] = v; }
    });
  });
}

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
    economy: newEconomy(),
    /* reward settlement bookkeeping (R4 commit 4): receipts make a node's fixed
       reward and its gild/unique choice each apply exactly once across a reload;
       pendingChoice holds an owed, interrupted choice so resume reopens it. */
    receipts: {},
    pendingChoice: null,
    ids: {nextItem: 1}
  };
}

/* the single durable-id allocator. Owned wares (iid) and shop offers (offerId)
   both draw from run.ids.nextItem, so a board ware and the bought offer that
   spawned it can never share a value. Separate from the engine's session uid,
   which keeps the pure engine and its parity boundary untouched. */
export function allocId(run){
  const id = run.ids.nextItem;
  run.ids.nextItem = id + 1;
  return id;
}

/* enforce the id invariant after a revive: the counter must sit above every
   live iid/offerId so the next allocation can never collide with a restored
   one. The migration already computes this, but a hand-built or stale save
   might not, so revival calls this as a floor. */
export function ensureIdFloor(run){
  const e=run.economy||{};
  let mx=0;
  (e.board||[]).forEach(function(w){ if(w&&w.iid>mx)mx=w.iid; });
  (e.vault||[]).forEach(function(w){ if(w&&w.iid>mx)mx=w.iid; });
  (e.shop||[]).forEach(function(o){ if(o&&o.offerId>mx)mx=o.offerId; });
  if(run.ids.nextItem<=mx)run.ids.nextItem=mx+1;
  return run;
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
    economy: run.economy,
    receipts: run.receipts || {},
    pendingChoice: run.pendingChoice || null,
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
    /* economy is opaque here; the item-wire reduction (board -> {id,rarity,size,
       ench}) and v1->v2 migration land in 3c2 when the save switches to this
       codec. Callers that revive from the legacy envelope set economy after. */
    economy: d.economy || newEconomy(),
    receipts: d.receipts || {},
    pendingChoice: d.pendingChoice || null,
    ids: {nextItem: (d.ids && d.ids.nextItem) || 1}
  };
}
