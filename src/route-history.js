"use strict";
/* Pure player-history projections. Full run reports remain the export format;
   this module derives compact recent rows, lifetime mastery, and safe seed
   replay descriptors without reading storage or active-run state. */
import {ITEMS,HEROES,ANOMALIES,MONSTERS,CATN} from './data.js';

export const PLAYER_HISTORY_SCHEMA='tavern-bash-player-history/1';

const HERO_IDS=new Set(HEROES.map(function(h){return h.id;}));
const OMEN_IDS=new Set(ANOMALIES.map(function(a){return a.id;}));
const WARE_IDS=new Set(Object.keys(ITEMS).filter(function(id){return !ITEMS[id].inc;}));
const MONSTER_IDS=new Set(Object.keys(MONSTERS));

function clone(v,fallback){
  try{return JSON.parse(JSON.stringify(v));}catch(e){return fallback;}
}
function listOf(v){return Array.isArray(v)?v:[];}
function finite(v,fallback){return Number.isFinite(v)?v:fallback;}
function clampLantern(v){return Math.max(0,Math.min(10,Math.floor(finite(v,0))));}
function endedAt(record){return Math.max(0,finite(record&&record.endedAt,0));}
function idOf(v){return v&&typeof v.id==='string'?v.id:null;}
function wareView(w){
  return {id:w&&w.id||null,name:w&&w.name||null,rarity:finite(w&&w.rarity,0),
    rarityName:w&&w.rarityName||null,ench:w&&w.ench||null,
    enchantName:w&&w.enchantName||null,size:finite(w&&w.size,0)};
}
function discoveryEntry(record){
  return {firstSeenAt:endedAt(record),firstReportId:record.reportId,runCount:1};
}
function noteDiscovery(bucket,id,record){
  if(!id)return;
  const at=endedAt(record),old=bucket[id];
  if(!old){bucket[id]=discoveryEntry(record);return;}
  old.runCount=Math.max(0,finite(old.runCount,0))+1;
  if(!old.firstSeenAt||at<old.firstSeenAt){
    old.firstSeenAt=at;old.firstReportId=record.reportId;
  }
}
function recordRef(record){
  return {reportId:record.reportId,seed:record.seed>>>0,endedAt:endedAt(record),
    result:record.result||'loss',lantern:clampLantern(record.lantern)};
}

export function isClearResult(result){
  return result==='win'||result==='quick_clear'||result==='long_clear'
    ||(typeof result==='string'&&result.indexOf('_clear')>=0);
}

export function compactRunRecord(record){
  if(!record||typeof record.reportId!=='string')return null;
  const setup=record.setup||{},progress=record.progress||{},economy=record.economy||{},timing=record.timing||{};
  return {
    reportId:record.reportId,
    endedAt:endedAt(record),
    endedAtIso:typeof record.endedAtIso==='string'?record.endedAtIso:null,
    result:record.result||'loss',
    version:record.version||null,
    mapVersion:finite(record.mapVersion,null),
    routeMode:record.routeMode==='long'?'long':'quick',
    lantern:clampLantern(record.lantern),
    seed:Number.isInteger(record.seed)?record.seed>>>0:null,
    partial:!!record.partial,
    exported:!!record.exported,
    setup:{
      heroId:setup.heroId||null,hero:setup.hero||null,
      omenId:setup.omenId||null,omen:setup.omen||null,
      featured:listOf(setup.featured).map(function(t){return {id:idOf(t),name:t&&t.name||null};})
        .filter(function(t){return !!t.id;})
    },
    progress:{
      districtId:finite(progress.districtId,1),district:progress.district||'Unknown',
      bossesBeaten:finite(progress.bossesBeaten,0),nodesVisited:finite(progress.nodesVisited,0),
      bossRetries:finite(progress.bossRetries,0),resolve:finite(progress.resolve,0),
      resolveMax:finite(progress.resolveMax,0)
    },
    economy:{
      gold:finite(economy.gold,0),tier:finite(economy.tier,1),
      board:listOf(economy.board).map(wareView),vault:listOf(economy.vault).map(wareView)
    },
    timing:{gameplayMs:Math.max(0,finite(timing.gameplayMs,0))}
  };
}

export function emptyHistory(){
  return {
    schema:PLAYER_HISTORY_SCHEMA,
    indexedReportIds:[],
    totals:{runs:0,clears:0},
    byHeroRoute:{},
    discoveries:{heroes:{},omens:{},wares:{},monsters:{}}
  };
}

export function normalizeHistory(raw){
  if(!raw||raw.schema!==PLAYER_HISTORY_SCHEMA)return emptyHistory();
  const out=emptyHistory();
  out.indexedReportIds=Array.from(new Set(listOf(raw.indexedReportIds)
    .filter(function(id){return typeof id==='string';})));
  out.totals={runs:Math.max(0,finite(raw.totals&&raw.totals.runs,0)),
    clears:Math.max(0,finite(raw.totals&&raw.totals.clears,0))};
  out.byHeroRoute=clone(raw.byHeroRoute,{})||{};
  const d=raw.discoveries||{};
  out.discoveries={
    heroes:clone(d.heroes,{})||{},
    omens:clone(d.omens,{})||{},
    wares:clone(d.wares,{})||{},
    monsters:clone(d.monsters,{})||{}
  };
  return out;
}

function discoveryFacts(record){
  const facts={heroes:new Set(),omens:new Set(),wares:new Set(),monsters:new Set()};
  const setup=record.setup||{},metrics=record.metrics||{},economy=record.economy||{};
  if(HERO_IDS.has(setup.heroId))facts.heroes.add(setup.heroId);
  if(OMEN_IDS.has(setup.omenId))facts.omens.add(setup.omenId);
  const ware=function(id){if(WARE_IDS.has(id))facts.wares.add(id);};
  listOf(economy.board).forEach(function(w){ware(w&&w.id);});
  listOf(economy.vault).forEach(function(w){ware(w&&w.id);});
  Object.keys(metrics.wares||{}).forEach(ware);
  listOf(metrics.snapshots).forEach(function(s){
    listOf(s&&s.board).forEach(function(w){ware(w&&w.id);});
    listOf(s&&s.vault).forEach(function(w){ware(w&&w.id);});
    const mon=s&&s.context&&s.context.monsterId;if(MONSTER_IDS.has(mon))facts.monsters.add(mon);
  });
  listOf(metrics.events).forEach(function(e){
    const data=e&&e.data||{};
    ware(data.id);
    listOf(data.offers).forEach(function(o){ware(o&&o.id);});
  });
  const midpoint=record.midpointTreasure||{};
  listOf(midpoint.offeredIds).forEach(ware);
  listOf(metrics.fights).forEach(function(f){
    if(f&&MONSTER_IDS.has(f.monsterId))facts.monsters.add(f.monsterId);
  });
  return facts;
}
function betterFast(next,old){
  if(!old)return true;
  const nl=finite(next.lantern,0),ol=finite(old.lantern,0);
  return nl>ol
    ||(nl===ol&&next.gameplayMs<old.gameplayMs)
    ||(nl===ol&&next.gameplayMs===old.gameplayMs
      &&next.endedAt<old.endedAt);
}
function betterResolve(next,old){
  if(!old)return true;
  const nl=finite(next.lantern,0),ol=finite(old.lantern,0);
  return nl>ol
    ||(nl===ol&&next.resolve>old.resolve)
    ||(nl===ol&&next.resolve===old.resolve&&next.gameplayMs>0
      &&(!old.gameplayMs||next.gameplayMs<old.gameplayMs));
}
function furthestScore(v){
  return [finite(v&&v.bossesBeaten,0),finite(v&&v.districtId,0),
    finite(v&&v.nodesVisited,0),isClearResult(v&&v.result)?1:0,finite(v&&v.resolve,0)];
}
function betterFurthest(next,old){
  if(!old)return true;
  const a=furthestScore(next),b=furthestScore(old);
  for(let i=0;i<a.length;i++){if(a[i]!==b[i])return a[i]>b[i];}
  return next.endedAt<old.endedAt;
}

export function indexHistory(history,record){
  const out=normalizeHistory(history);
  if(!record||typeof record.reportId!=='string'||out.indexedReportIds.indexOf(record.reportId)>=0)return out;
  out.indexedReportIds.push(record.reportId);
  out.totals.runs++;
  const clear=isClearResult(record.result);if(clear)out.totals.clears++;

  const setup=record.setup||{},mode=record.routeMode;
  if(HERO_IDS.has(setup.heroId)&&(mode==='quick'||mode==='long')){
    const hero=out.byHeroRoute[setup.heroId]||(out.byHeroRoute[setup.heroId]={});
    const row=hero[mode]||(hero[mode]={runs:0,clears:0,lastRun:null,
      fastestClear:null,bestResolveClear:null,furthest:null});
    row.runs=Math.max(0,finite(row.runs,0))+1;
    if(clear)row.clears=Math.max(0,finite(row.clears,0))+1;
    const ref=recordRef(record);
    if(!row.lastRun||ref.endedAt>=finite(row.lastRun.endedAt,0))row.lastRun=ref;
    const timing=record.timing||{},progress=record.progress||{};
    const ms=Math.max(0,finite(timing.gameplayMs,0));
    if(clear&&!record.partial&&ms>0){
      const fast=Object.assign({},ref,{gameplayMs:ms});
      if(betterFast(fast,row.fastestClear))row.fastestClear=fast;
    }
    if(clear&&Number.isFinite(progress.resolve)){
      const best=Object.assign({},ref,{resolve:Math.max(0,progress.resolve),
        resolveMax:Math.max(0,finite(progress.resolveMax,0)),gameplayMs:ms});
      if(betterResolve(best,row.bestResolveClear))row.bestResolveClear=best;
    }
    const far=Object.assign({},ref,{bossesBeaten:Math.max(0,finite(progress.bossesBeaten,0)),
      districtId:Math.max(0,finite(progress.districtId,0)),
      nodesVisited:Math.max(0,finite(progress.nodesVisited,0)),
      resolve:Math.max(0,finite(progress.resolve,0))});
    if(betterFurthest(far,row.furthest))row.furthest=far;
  }

  const facts=discoveryFacts(record);
  facts.heroes.forEach(function(id){noteDiscovery(out.discoveries.heroes,id,record);});
  facts.omens.forEach(function(id){noteDiscovery(out.discoveries.omens,id,record);});
  facts.wares.forEach(function(id){noteDiscovery(out.discoveries.wares,id,record);});
  facts.monsters.forEach(function(id){noteDiscovery(out.discoveries.monsters,id,record);});
  return out;
}

export function buildHistory(records){
  const rows=listOf(records).filter(function(r){return r&&typeof r.reportId==='string';}).slice()
    .sort(function(a,b){return endedAt(a)-endedAt(b)||(a.reportId<b.reportId?-1:1);});
  return rows.reduce(function(history,record){return indexHistory(history,record);},emptyHistory());
}

export function replaySetup(record){
  if(!record||!Number.isInteger(record.seed)||record.seed<0||record.seed>0xffffffff)return null;
  if(record.routeMode!=='quick'&&record.routeMode!=='long')return null;
  const setup=record.setup||{},heroId=setup.heroId,omenId=setup.omenId;
  if(!HERO_IDS.has(heroId)||!OMEN_IDS.has(omenId))return null;
  const tags=Array.from(new Set(listOf(setup.featured).map(idOf)
    .filter(function(id){return !!CATN[id];}))).slice(0,2);
  return {seed:record.seed>>>0,mode:record.routeMode,lantern:clampLantern(record.lantern),
    heroId:heroId,omenId:omenId,tags:tags,sourceVersion:record.version||null,
    sourceMapVersion:finite(record.mapVersion,null)};
}
