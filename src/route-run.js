"use strict";
/* The route run aggregate: the durable, serializable truth for a Long Bazaar
   run. This first slice owns the run identity and the navigation controller
   state, plus the single reducer seam (the only call to route.transition).
   Later R4 commits fold the economy (gold/board/shop/vault) and the durable
   instance-id counter into this same object so G stops holding separate truths.

   What lives here is only what must survive a reload: identity, the pure
   controller state, and the id counter. The map and fights are regenerated
   from the seed; UI transients (selection, timers, DOM) never belong here. */
import {initRoute, transition, fightSeed} from './route.js';
import {TIERCOST, ITEMS} from './data.js';
import {mulberry, gateOK} from './engine.js';
import {newMetrics,reviveMetrics,serializeMetrics,recordMetric} from './route-metrics.js';

export const SCHEMA_VERSION = 7;   /* v7: the run route carries the affix stamp */

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
  const routeMode=setup.routeMode || 'quick';
  const lantern=Math.max(0,Math.min(10,setup.lantern||0));
  return {
    schemaVersion: SCHEMA_VERSION,
    runId: runIdFor(seed),
    revision: 0,
    seed: seed,
    routeMode: routeMode,
    /* fixed at run start; canonical for every Lantern rule and stored in the
       save so resume regenerates the same map and composed Omen */
    lantern: lantern,
    route: initRoute(seed,routeMode,lantern),
    economy: newEconomy(),
    metrics: newMetrics(setup.now),
    end: null,
    /* reward settlement bookkeeping (R4 commit 4): receipts make a node's fixed
       reward and its gild, unique, or Charm choice each apply exactly once across a reload;
       pendingChoice holds an owed, interrupted choice so resume reopens it. */
    receipts: {},
    pendingChoice: null,
    /* Gate Camp (R5): camp holds the current boss gate's Quartermaster stock and
       per-gate flags; lastReserveUsed is the run-wide once-only emergency. camp is
       null except while stalled at a boss gate. */
    camp: null,
    lastReserveUsed: false,
    /* the Almanac per-run shop freeze (design-unlocks-0.92.md seam 2): the locked
       ware complement at run start, so a resumed market rolls identically even if
       the unlock profile changes mid-run. null means no snapshot (a pre-0.92 run,
       grandfathered to the full pool); [] means nothing is locked (full unlock).
       Computed by the caller, which has the storage the profile lives in. */
    wareLock: (setup.wareLock && setup.wareLock.slice()) || null,
    ids: {nextItem: 1}
  };
}

/* ============ GATE CAMP ============ */
/* tuning (Codex-designed 2026-07-13): Mend trades a little gold for a small
   Resolve top-up once per gate; Last Reserve trades permanent survival buffer for
   one-time Quartermaster credit, once per run. Numbers are a starting point. */
export const CAMP_MEND = {cost:3, gain:4};
export const CAMP_LAST_RESERVE = {resolve:6, maxCut:6, credit:6};

/* the Quartermaster stock for a boss gate: three tier-gated Bronze offers (one
   offensive, one defensive/sustain, one synergy or forge-completer), rolled once
   and keyed by the run seed and the boss node so retries and reloads see the same
   three. Regenerated only when the gate changes. */
export function campEnsure(run, node, tier, heroId){
  if(run.camp && run.camp.nodeId === node.id) return run.camp;
  const rng = mulberry(fightSeed(run.seed, node.id, 'camp'));
  const board = run.economy.board || [];
  /* the Quartermaster is hero-threaded so a signature ware never rolls for a
     hero it does not belong to (heroId flows from the caller's G.hero) */
  const pool = Object.keys(ITEMS).filter(function(id){return gateOK(ITEMS[id].tier,tier)&&!ITEMS[id].unique&&(!ITEMS[id].sig||ITEMS[id].sig===heroId)&&!ITEMS[id].inc;});
  const inCats = function(cats){return pool.filter(function(id){return cats.indexOf(ITEMS[id].cat)>=0;});};
  const off = inCats(['dmg','poison','burn']);
  const def = inCats(['shield','heal']);
  /* synergy: a Bronze the player owns exactly two of (a forge-completer), else the
     player's commonest category, else anything in the pool */
  let syn = pool.filter(function(id){return board.filter(function(w){return w.id===id&&w.rarity===0;}).length===2;});
  if(!syn.length){
    const cc={}; board.forEach(function(w){const c=ITEMS[w.id]&&ITEMS[w.id].cat; if(c)cc[c]=(cc[c]||0)+1;});
    const top=Object.keys(cc).sort(function(a,b){return cc[b]-cc[a];})[0];
    syn = top?inCats([top]):pool;
  }
  const used={};
  const take = function(p){const c=p.filter(function(id){return !used[id];});const src=c.length?c:(p.length?p:pool);if(!src.length)return null;const id=src[Math.floor(rng()*src.length)];used[id]=true;return id;};
  const offers=[];
  [take(off), take(def), take(syn)].forEach(function(id,i){ if(id) offers.push({id:id, slot:i, bought:false}); });
  run.camp = {nodeId:node.id, offers:offers, mendUsed:false, credit:0};
  return run.camp;
}
/* leave the gate (boss beaten or run over): drop the stock */
export function campClear(run){ run.camp = null; }
/* unspent Quartermaster credit expires the moment a retry begins */
export function campExpireCredit(run){ if(run.camp) run.camp.credit = 0; }

/* pay a little gold for a small Resolve top-up, once per gate */
export function campMend(run,creditLimit){
  const c=run.camp; if(!c||c.mendUsed) return {ok:false, reason:'used'};
  if(run.economy.gold-CAMP_MEND.cost < -(creditLimit||0)) return {ok:false, reason:'gold'};
  run.economy.gold -= CAMP_MEND.cost;
  run.route.resolve = Math.min(run.route.resolveMax, run.route.resolve + CAMP_MEND.gain);
  c.mendUsed = true;
  recordMetric(run.metrics,'camp_mend',{nodeId:c.nodeId,gold:-CAMP_MEND.cost,resolve:CAMP_MEND.gain});
  return {ok:true};
}
/* spend permanent survival buffer for one-time camp credit, once per run. Refused
   if it would not leave the player alive, so it can never be a self-KO. */
export function campLastReserve(run){
  if(run.lastReserveUsed) return {ok:false, reason:'used'};
  if(!run.camp) return {ok:false, reason:'no camp'};
  if(run.route.resolve <= CAMP_LAST_RESERVE.resolve) return {ok:false, reason:'resolve'};
  run.route.resolve -= CAMP_LAST_RESERVE.resolve;
  run.route.resolveMax -= CAMP_LAST_RESERVE.maxCut;
  run.camp.credit += CAMP_LAST_RESERVE.credit;
  run.lastReserveUsed = true;
  recordMetric(run.metrics,'camp_last_reserve',{nodeId:run.camp.nodeId,resolve:-CAMP_LAST_RESERVE.resolve,
    resolveMax:-CAMP_LAST_RESERVE.maxCut,credit:CAMP_LAST_RESERVE.credit});
  return {ok:true};
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
  const beforeResolve=run.route.resolve,beforePath=run.route.path.length;
  const r = transition(run.route, map, action);
  run.route = r.state;
  run.revision++;
  const nodeId=action.nodeId||run.route.pendingId||null;
  recordMetric(run.metrics,'route_'+action.type,{nodeId:nodeId,choice:action.choice||null,winner:action.winner||null,
    resolveDelta:run.route.resolve-beforeResolve,pathDelta:run.route.path.length-beforePath,phase:run.route.phase});
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
    routeMode: run.routeMode || 'quick',
    lantern: run.lantern || 0,
    route: run.route,
    economy: run.economy,
    metrics: serializeMetrics(run.metrics),
    end: run.end || null,
    receipts: run.receipts || {},
    pendingChoice: run.pendingChoice || null,
    camp: run.camp || null,
    lastReserveUsed: !!run.lastReserveUsed,
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
    routeMode: d.routeMode || 'quick',
    lantern: d.lantern || 0,
    route: d.route,
    /* economy is opaque here; the item-wire reduction (board -> {id,rarity,size,
       ench}) and v1->v2 migration land in 3c2 when the save switches to this
       codec. Callers that revive from the legacy envelope set economy after. */
    economy: d.economy || newEconomy(),
    metrics: reviveMetrics(d.metrics),
    end: d.end || null,
    receipts: d.receipts || {},
    pendingChoice: d.pendingChoice || null,
    camp: d.camp || null,
    lastReserveUsed: !!d.lastReserveUsed,
    /* the Almanac per-run shop freeze: additive optional field, tolerated when
       absent. A pre-0.92 save has no snapshot (null), which runWareAllowed reads
       as the grandfathered full pool for the rest of the run. */
    wareLock: (d.wareLock && d.wareLock.slice()) || null,
    ids: {nextItem: (d.ids && d.ids.nextItem) || 1}
  };
}
