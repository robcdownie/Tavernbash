"use strict";
/* The route save envelope and its storage IO. Owns the localStorage key, the
   version gate, and the read/write/clear codecs; storage is injected so the
   codecs are testable without a browser. The envelope shape (routeState + run +
   market/opening/combat) is the v1 payload; R4's later commits add the v2
   aggregate and a v1 to v2 migration behind this same module. */
import {MAP_VERSION} from './map.js';
import {newMetrics,serializeMetrics} from './route-metrics.js';
import {ensureMidpointTreasure,midpointTreasureKey} from './route-runtime.js';

export const ROUTE_SAVE_VERSION = 6;   /* v6: the run route carries the variety stamp */
export const ROUTE_KEY = 'bb-route-run';

function highestId(list,key){
  let mx=0;
  (list||[]).forEach(function(x){ if(x&&x[key]!=null&&x[key]>mx)mx=x[key]; });
  return mx;
}

/* pure v1 -> v2 migration. v1 kept the controller state at the top level
   (routeState), the economy flat under run, hero/anom/tags/fightN under run,
   and no durable instance ids. v2 nests the controller state and the economy
   inside the run aggregate, moves setup out, and stamps every ware/offer with
   an id. No engine import: this transforms wire objects only. Deterministic
   (board then vault then shop order) and idempotent, and it honors any ids
   already present so a partially migrated save never reissues one. */
export function migrateV1toV2(d){
  const r=d.run||{};
  const seed=(r.seed>>>0);
  let next=(r.ids&&r.ids.nextItem)||1;
  const hi=Math.max(highestId(r.board,'iid'),highestId(r.vault,'iid'),highestId(r.shop,'offerId'));
  if(next<hi+1)next=hi+1;
  const stampWare=function(w){ return (w&&w.iid!=null)?w:Object.assign({},w,{iid:next++}); };
  const stampOffer=function(o){ return (o&&o.offerId!=null)?o:Object.assign({},o,{offerId:next++}); };
  const board=(r.board||[]).map(stampWare);
  const vault=(r.vault||[]).map(stampWare);
  const shop=(r.shop||[]).map(stampOffer);
  return {
    saveVersion:2,mapVersion:d.mapVersion,
    run:{schemaVersion:2,runId:r.runId||('r'+seed.toString(36)),revision:r.revision||0,seed:seed,
      route:d.routeState,
      economy:{gold:r.gold,tier:r.tier,tierCost:r.tierCost,relicIncome:r.relicIncome,
        freeReroll:!!r.freeReroll,frozen:!!r.frozen,
        board:board,vault:vault,shop:shop,trinkets:r.trinkets||[]},
      receipts:{},pendingChoice:null,
      ids:{nextItem:next}},
    setup:{hero:r.hero||null,anom:r.anom,tags:r.tags||[]},
    fightN:r.fightN||0,
    market:d.market||null,opening:!!d.opening,combat:d.combat||null
  };
}

/* v2 -> v3 adds the explicit route mode and observational telemetry. Existing
   runs are Quick because v2 had only the original four-district route. Their
   metrics are marked partial since elapsed play before this version is unknowable. */
export function migrateV2toV3(d){
  const legacy=newMetrics(null);legacy.partial=true;
  return Object.assign({},d,{saveVersion:3,run:Object.assign({},d.run||{},
    {schemaVersion:3,routeMode:(d.run&&d.run.routeMode)||'quick',
      metrics:(d.run&&d.run.metrics)||serializeMetrics(legacy)})});
}

/* v3 -> v4 adds the one-time Long midpoint pivot. Only a 0.83 save parked at
   the exact D3 to D4 boundary is eligible for immediate injection. The shared
   ensure seam owns all guards and receipt creation, so migration and live play
   cannot disagree or double-pay. Copy the mutable aggregate branches first so
   this remains a pure wire transform. */
export function migrateV3toV4(d){
  const old=d.run||{};
  const economy=Object.assign({},old.economy||{});
  const run=Object.assign({},old,{schemaVersion:4,economy:economy,
    receipts:Object.assign({},old.receipts||{}),
    pendingChoice:old.pendingChoice?Object.assign({},old.pendingChoice,{options:(old.pendingChoice.options||[]).slice()}):null});
  const v4=Object.assign({},d,{saveVersion:4,run:run});
  const key=midpointTreasureKey(run.runId),existed=Object.prototype.hasOwnProperty.call(run.receipts,key);
  const receipt=ensureMidpointTreasure(run);
  /* This transient envelope marker tells the live restore flow that migration
     created an unsaved transaction. The next v4 snapshot omits the marker. */
  if(receipt&&!existed)v4.midpointInjected=true;
  return v4;
}

/* v4 -> v5 stamps a Lantern level of 0 on the run. In practice a v4 save
   carries map version 10 and retires at the gate above before this runs; the
   transform exists so the chain stays complete and testable. */
export function migrateV4toV5(d){
  return Object.assign({},d,{saveVersion:5,run:Object.assign({},d.run||{},
    {schemaVersion:5,lantern:(d.run&&d.run.lantern)||0})});
}

/* v5 -> v6 marks the board-variety epoch. It adds no field: a resumed pre-v6 run
   deliberately lacks run.route.variety, so buildFoe threads no seed and every
   fight stays byte-identical to what that run scouted. The bump exists so the
   save schema tracks the new run.route stamp and stale shapes reject cleanly.
   Like map version 11, a live v5 save retires at the map-version gate above
   before this runs; the transform keeps the chain complete and testable. */
export function migrateV5toV6(d){
  return Object.assign({},d,{saveVersion:6,run:Object.assign({},d.run||{},{schemaVersion:6})});
}

/* read, migrate, then version-gate. A save from a stale generator (mapVersion)
   is dropped regardless of format. A v1 save is migrated to v2 in memory. Any
   failure (bad JSON, a migration throw) falls back to null so restore starts a
   fresh run rather than trusting a broken shape; it never corrupts. */
export function readRouteSave(storage){
  if(!storage)return null;
  try{
    let d=JSON.parse(storage.getItem(ROUTE_KEY)||'null');
    if(!d)return null;
    if(d.mapVersion!==MAP_VERSION){
      storage.removeItem(ROUTE_KEY);
      /* an older map version retires the run with a notice; anything else
         (missing, corrupt, or from the future) just clears */
      if(typeof d.mapVersion==='number'&&d.mapVersion<MAP_VERSION)return {retired:true,reason:'map_updated',mapVersion:d.mapVersion};
      return null;
    }
    if(d.saveVersion===1){d=migrateV1toV2(d);}
    if(d.saveVersion===2){d=migrateV2toV3(d);}
    if(d.saveVersion===3){d=migrateV3toV4(d);}
    if(d.saveVersion===4){d=migrateV4toV5(d);}
    if(d.saveVersion===5){d=migrateV5toV6(d);}
    if(!d||d.saveVersion!==ROUTE_SAVE_VERSION){storage.removeItem(ROUTE_KEY);return null;}
    return d;
  }catch(e){return null;}
}
/* returns true when the write is durable, false on any failure (no storage, a
   quota/serialization throw). A critical checkpoint (reward settlement) checks
   this and blocks the overlay rather than presenting an unsaved reward. */
export function writeRouteSave(storage,envelope){
  if(!storage)return false;
  try{storage.setItem(ROUTE_KEY,JSON.stringify(envelope));return true;}catch(e){return false;}
}
export function clearRouteSave(storage){
  if(!storage)return;
  try{storage.removeItem(ROUTE_KEY);}catch(e){}
}
