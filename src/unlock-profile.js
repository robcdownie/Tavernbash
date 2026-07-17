"use strict";
/* The Almanac unlock profile (design-unlocks-0.92.md), under the bb-unlocks
   key. A brand-new profile starts with 3 of 8 heroes, 4 of 12 Omens, and the
   24-ware pre-R8 shop pool; everything else is earned by playing. Cloned from
   lantern-profile.js: storage-injected, monotonic, garbage-tolerant, headless-
   testable, and entirely outside the run save (zero save-surface bump).

   This module is inert on its own: it is the source of truth that rollShop,
   the omen roll, the hero rail, the Almanac, and route-sim's warePool knob
   consume in later seams. Nothing reads it yet.

   EPOCH: the guarantee is that pre-0.92 history grants nothing. It is provided
   the clean way, by forward post-epoch counters that start at zero when the
   profile is created and only advance inside settleUnlocks (guarded by a
   reportId ledger against a won-run resume re-settling). That is exactly a
   delta since the epoch, implemented as a counter rather than (current minus
   snapshot), so no report store read is needed at settle time. The epoch
   object still records the lifetime totals at creation for provenance, seeded
   by the optional initUnlockProfile call. */
import {ITEMS} from './data.js';

const KEY='bb-unlocks';
const DEV_KEY='bb-unlocks-all';
const SETTLED_CAP=32;

/* Starter sets (design-unlocks-0.92.md). The three most legible hero kits, one
   per core shop weight, including the only hero with a starting ware. Four
   Omens: two economy teachers, one tempo teacher, one combat-flavor omen
   matched to the Kilnkeeper starter (fortified was swapped out for molasses in
   synthesis; fortified is a mid unlock). */
export const STARTER_HEROES=['knife','kiln','apoth'];
export const STARTER_OMENS=['bull','overstock','molasses','wildfire'];

/* The 24-ware pre-R8 shop pool: the exact set the game shipped with and was
   tuned on for 80-plus versions, so the first hour is proven and every
   category and tier 1-2 fusion feeder is intact. This is the classic 26 minus
   the two income wares (purse, ledger), which the shop already excludes. */
export const STARTER_SHOP_WARES=[
  'dagger','sword','fangs','serpent','mace','crossbow','hammer',
  'vial','venom','torch','bomb','magma',
  'buckler','brassbuckler','barricade','tower','aegis',
  'bandage','salve','chalice','sanctum',
  'whetstone','hourglass','adren'
];

/* The seven R8 shop wares gated behind triggers. Each is a stateful or
   conditional hook ware whose concept is noise before the player has met the
   situation it answers; they are variety and complexity unlocks, not power
   unlocks (the sim shows the starter pool is slightly EASIER without them). */
export const LOCKED_START_WARES=[
  'surgeonhook','sapperspick','venomsiphon','kilnchain',
  'saltward','rosewaterpump','chirurgeonsscissors'
];

/* The trigger table (design-unlocks-0.92.md). Each entry names the descriptor
   that unlocks and a pure predicate over (record, counters). Count and clear
   predicates read the post-epoch counters; the rest read the current record.
   Detection fields were verified against route-report.js and route-metrics.js. */
function isClear(rec){
  const r=rec&&rec.result;
  return r==='win'||r==='quick_clear'||r==='long_clear'||(typeof r==='string'&&r.indexOf('clear')>=0);
}
function isLongClear(rec){
  return isClear(rec)&&((rec&&rec.result)==='long_clear'||(rec&&rec.routeMode)==='long');
}
function fusionEvents(rec){
  const ev=(rec&&rec.metrics&&rec.metrics.events)||[];
  return ev.filter(function(e){return e&&e.type==='fusion'&&e.data&&e.data.id;});
}
function maxFusionRarity(rec,catFilter){
  return fusionEvents(rec).reduce(function(m,e){
    if(catFilter&&(!ITEMS[e.data.id]||ITEMS[e.data.id].cat!==catFilter))return m;
    return Math.max(m,e.data.rarity||0);
  },-1);
}
function boardHoldsRarity(rec,minR){
  const b=(rec&&rec.economy&&rec.economy.board)||[],v=(rec&&rec.economy&&rec.economy.vault)||[];
  return b.concat(v).some(function(w){return (w.rarity||0)>=minR;});
}
function slew(rec,monsterId){
  const f=(rec&&rec.metrics&&rec.metrics.fights)||[];
  return f.some(function(x){return x&&x.monsterId===monsterId&&x.winner==='a';});
}
function poisonApplied(rec){
  const w=(rec&&rec.metrics&&rec.metrics.wares)||{};
  return Object.keys(w).reduce(function(s,id){return s+((w[id]&&w[id].damage&&w[id].damage.poison)||0);},0);
}

/* kind is heroes | omens | wares; id is the descriptor unlocked. cond reads the
   finished record and the post-epoch counters {runs, clears, clearsByHero}. */
const TRIGGERS=[
  {kind:'omens', id:'rapid',      cond:function(r,c){return c.runs>=1;}},
  {kind:'wares', id:'kilnchain',  cond:function(r){return maxFusionRarity(r,'burn')>=1;}},
  {kind:'wares', id:'rosewaterpump', cond:function(r){return maxFusionRarity(r)>=1;}},
  {kind:'heroes',id:'lender',     cond:function(r,c){return c.runs>=3;}},
  {kind:'wares', id:'saltward',   cond:function(r){return boardHoldsRarity(r,2);}},
  {kind:'omens', id:'moon',       cond:function(r,c){return c.runs>=3;}},
  {kind:'wares', id:'sapperspick',cond:function(r){return maxFusionRarity(r)>=2;}},
  {kind:'heroes',id:'architect',  cond:function(r){return ((r.progress&&r.progress.districtId)||0)>=3;}},
  {kind:'wares', id:'venomsiphon',cond:function(r){return slew(r,'shahmaran');}},
  {kind:'omens', id:'fortified',  cond:function(r){return ((r.economy&&r.economy.tier)||0)>=4;}},
  {kind:'heroes',id:'venom',      cond:function(r,c){return c.runs>=4;}},
  {kind:'omens', id:'plague',     cond:function(r){return poisonApplied(r)>=60;}},
  {kind:'wares', id:'chirurgeonsscissors', cond:function(r){return maxFusionRarity(r)>=3;}},
  {kind:'omens', id:'glass',      cond:function(r){return ((r.progress&&r.progress.bossesBeaten)||0)>=3&&!isClear(r);}},
  {kind:'wares', id:'surgeonhook',cond:function(r){return isClear(r);}},
  {kind:'heroes',id:'silkblade',  cond:function(r){return isClear(r)&&((r.lantern||0)>=1);}},
  {kind:'omens', id:'narrow',     cond:function(r){return isClear(r)&&((r.lantern||0)>=2);}},
  {kind:'omens', id:'silent',     cond:function(r,c){return Object.keys(c.clearsByHero).length>=3;}},
  {kind:'omens', id:'auctionbell',cond:function(r){return slew(r,'auctioneer');}},
  {kind:'heroes',id:'ash',        cond:function(r){return isLongClear(r);}}
];

function blankProfile(){
  return {v:1,createdAt:null,epoch:{runs:0,clears:0},
    runs:0,clears:0,clearsByHero:{},
    heroes:[],omens:[],wares:[],settled:[]};
}
function normalize(p){
  const b=blankProfile();
  if(!p||typeof p!=='object')return b;
  b.createdAt=typeof p.createdAt==='string'?p.createdAt:null;
  if(p.epoch&&typeof p.epoch==='object'){b.epoch.runs=+p.epoch.runs||0;b.epoch.clears=+p.epoch.clears||0;}
  b.runs=+p.runs||0;b.clears=+p.clears||0;
  if(p.clearsByHero&&typeof p.clearsByHero==='object'){
    Object.keys(p.clearsByHero).forEach(function(k){if(p.clearsByHero[k])b.clearsByHero[k]=1;});
  }
  ['heroes','omens','wares','settled'].forEach(function(f){
    if(Array.isArray(p[f]))b[f]=p[f].filter(function(x){return typeof x==='string';});
  });
  if(b.settled.length>SETTLED_CAP)b.settled=b.settled.slice(-SETTLED_CAP);
  return b;
}

export function readUnlockProfile(storage){
  if(!storage)return blankProfile();
  try{return normalize(JSON.parse(storage.getItem(KEY)||'null'));}
  catch(e){return blankProfile();}
}
function writeUnlockProfile(storage,p){
  try{storage.setItem(KEY,JSON.stringify(p));return true;}catch(e){return false;}
}

/* Seed the epoch once, from the caller's lifetime totals (computed from the
   local history at startup). A no-op if a profile already exists, so it never
   overwrites progress. Correctness of "history grants nothing" does not depend
   on this: the post-epoch counters start at zero regardless. */
export function initUnlockProfile(storage,priorTotals){
  if(!storage)return blankProfile();
  const raw=(function(){try{return JSON.parse(storage.getItem(KEY)||'null');}catch(e){return null;}})();
  if(raw)return normalize(raw);
  const p=blankProfile();
  p.createdAt=(priorTotals&&priorTotals.createdAt)||'seeded';
  p.epoch.runs=(priorTotals&&+priorTotals.runs)||0;
  p.epoch.clears=(priorTotals&&+priorTotals.clears)||0;
  writeUnlockProfile(storage,p);
  return p;
}

/* ?debug plus bb-unlocks-all==='1' opens everything, read in one place so
   every surface honors it with no per-callsite checks. While on, settleUnlocks
   writes nothing, so a test run never contaminates the chase. */
export function devAllOpen(storage){
  if(!storage)return false;
  try{
    if(storage.getItem(DEV_KEY)!=='1')return false;
    const q=(typeof location!=='undefined'&&location.search)||'';
    return q.indexOf('debug')>=0;
  }catch(e){return false;}
}

export function heroUnlocked(storage,id){
  if(STARTER_HEROES.indexOf(id)>=0)return true;
  if(devAllOpen(storage))return true;
  return readUnlockProfile(storage).heroes.indexOf(id)>=0;
}
export function omenUnlocked(storage,id){
  if(STARTER_OMENS.indexOf(id)>=0)return true;
  if(devAllOpen(storage))return true;
  return readUnlockProfile(storage).omens.indexOf(id)>=0;
}
export function wareUnlocked(storage,id){
  if(STARTER_SHOP_WARES.indexOf(id)>=0)return true;
  if(devAllOpen(storage))return true;
  return readUnlockProfile(storage).wares.indexOf(id)>=0;
}

/* the 24 starter shop ids, the single source of truth shared by rollShop,
   ensureOpeningOffense, and route-sim's warePool knob so tuning cannot drift */
export function starterShopIds(){return STARTER_SHOP_WARES.slice();}

/* the full unlocked lists for the hero picker, omen reveal, and Almanac */
export function unlockedHeroes(storage){
  if(devAllOpen(storage))return null;   /* null means everything, per caller */
  return STARTER_HEROES.concat(readUnlockProfile(storage).heroes);
}
export function unlockedOmens(storage){
  if(devAllOpen(storage))return null;
  return STARTER_OMENS.concat(readUnlockProfile(storage).omens);
}

/* Monotonic set-add for a wild find (a unique taken from a bounty, the Vault,
   a Treasure cache, or the midpoint pivot). Returns whether the id is now
   held. Dev mode records nothing, per the no-contamination rule. */
export function recordFound(storage,kind,id){
  if(!storage||!id||['heroes','omens','wares'].indexOf(kind)<0)return false;
  if(devAllOpen(storage))return true;
  const p=readUnlockProfile(storage);
  if(p[kind].indexOf(id)>=0)return true;
  p[kind].push(id);
  return writeUnlockProfile(storage,p)&&readUnlockProfile(storage)[kind].indexOf(id)>=0;
}

/* Evaluate every trigger against the finished record ONCE. Increments the
   post-epoch counters using this record first (so "finish your first night"
   fires on run 1), guards against a won-run resume re-settling via the
   reportId ledger, and returns the list of newly unlocked descriptors
   {kind, id} for the end-screen strip. Never writes in dev mode. */
export function settleUnlocks(storage,record){
  if(!storage||!record)return [];
  if(devAllOpen(storage))return [];
  const reportId=record.reportId||null;
  const p=readUnlockProfile(storage);
  if(p.createdAt===null)p.createdAt='settled';
  if(reportId&&p.settled.indexOf(reportId)>=0)return [];   /* already settled */

  p.runs+=1;
  if(isClear(record)){
    p.clears+=1;
    const hero=(record.setup&&record.setup.heroId)||null;
    if(hero)p.clearsByHero[hero]=1;
  }
  const counters={runs:p.runs,clears:p.clears,clearsByHero:p.clearsByHero};

  const newly=[];
  for(const t of TRIGGERS){
    if(p[t.kind].indexOf(t.id)>=0)continue;            /* already held */
    if(STARTER_HEROES.indexOf(t.id)>=0&&t.kind==='heroes')continue;
    if(STARTER_OMENS.indexOf(t.id)>=0&&t.kind==='omens')continue;
    if(STARTER_SHOP_WARES.indexOf(t.id)>=0&&t.kind==='wares')continue;
    let hit=false;
    try{hit=!!t.cond(record,counters);}catch(e){hit=false;}
    if(hit){p[t.kind].push(t.id);newly.push({kind:t.kind,id:t.id});}
  }

  if(reportId){p.settled.push(reportId);if(p.settled.length>SETTLED_CAP)p.settled=p.settled.slice(-SETTLED_CAP);}
  writeUnlockProfile(storage,p);
  return newly;
}
