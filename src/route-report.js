"use strict";
/* Pure playtest report builders. The readable summary and exhaustive JSON are
   two views of the same immutable run record. */
import {ITEMS,ENCH,RNAME,HEROES,ANOMALIES,TRINKETS,CATN} from './data.js';
import {serializeMetrics} from './route-metrics.js';
import {districtAffix} from './aspects.js';

export const RUN_REPORT_SCHEMA='tavern-bash-run/1';

function clone(v){return JSON.parse(JSON.stringify(v));}
function wireWare(it){return {iid:it.iid,id:it.id,name:ITEMS[it.id]?ITEMS[it.id].n:it.id,
  rarity:it.rarity||0,rarityName:RNAME[it.rarity||0],ench:it.ench||null,
  enchantName:it.ench&&ENCH[it.ench]?ENCH[it.ench].n:null,size:it.size};}
function sum(obj){return Object.keys(obj||{}).reduce(function(s,k){return s+(obj[k]||0);},0);}
function gameplayMs(metrics){const t=metrics.timing||{};return Math.max(0,(t.activeMs||0)-((t.phases||{}).debrief||0));}
function bossCount(route,map){
  const bosses=new Set((map.districts||[]).map(function(d){return d.boss.id;}));
  return (route.path||[]).filter(function(id){return bosses.has(id);}).length;
}
function districtReached(route,map){
  const id=route.pendingId||(route.path&&route.path[route.path.length-1]);
  const n=id&&map.nodes[id];return n?n.district:1;
}
/* the variance the run's road wore: the board-Aspect and district-Affix stamps,
   and the one affix word each non-Gate district drew (districtAffix returns null on
   the Gate, so those drop out). Empty on a resumed pre-stamp run, which carries neither
   flag and fights byte-identically. */
function runVariance(run,map){
  const route=run.route||{};
  const affixes=(route.affix&&map&&map.districts)
    ? map.districts.map(function(d){const a=districtAffix(d,run.seed>>>0);return a?{district:d.name,word:a.w}:null;}).filter(Boolean)
    : [];
  return {variety:!!route.variety,affix:!!route.affix,affixes:affixes};
}
function midpointTreasureOutcome(run){
  const receipts=run.receipts||{};
  const key=run.runId+':midpoint:d3boss',r=receipts[key];
  if(!r||r.kind!=='midpointTreasure')return null;
  const offeredIds=(r.offeredIds||[]).slice();
  const ware=function(id){return id?{id:id,name:ITEMS[id]?ITEMS[id].n:id}:null;};
  return {receiptKey:key,offeredIds:offeredIds,offered:offeredIds.map(ware),
    selectedId:r.selectedId||null,selected:ware(r.selectedId),resolved:!!r.choiceApplied,
    fallbackApplied:!!r.fallbackApplied,fallbackGold:r.fallbackApplied?(r.fallbackGold||0):0};
}

export function buildRunRecord(input){
  const run=input.run,map=input.map,metrics=serializeMetrics(run.metrics);
  const H=HEROES.find(function(h){return h.id===input.setup.hero;});
  const A=ANOMALIES.find(function(a){return a.id===input.setup.anom;});
  const districtId=districtReached(run.route,map),district=map.districts[districtId-1]||map.districts[0];
  const endedMs=input.endedAt;
  const report={schema:RUN_REPORT_SCHEMA,reportId:run.runId+':'+String(endedMs),archive_saved:false,
    exported:!!(run.end&&run.end.exported),
    game:'Tavern Bash',version:input.version,mapVersion:map.version,routeMode:run.routeMode||'quick',
    lantern:run.lantern||0,
    startedAt:metrics.timing.startedAt,endedAt:endedMs,endedAtIso:new Date(endedMs).toISOString(),
    result:input.result,seed:run.seed>>>0,partial:!!metrics.partial,
    setup:{heroId:input.setup.hero||null,hero:H?H.n:'none',omenId:input.setup.anom,
      omen:A?A.n:input.setup.anom,featured:(input.setup.tags||[]).map(function(t){return {id:t,name:CATN[t]||t};})},
    progress:{districtId:districtId,district:district?district.name:'Unknown',bossesBeaten:bossCount(run.route,map),
      nodesVisited:(run.route.path||[]).length,bossRetries:sum(run.route.attempts),resolve:Math.max(0,run.route.resolve),
      resolveMax:run.route.resolveMax,path:(run.route.path||[]).slice()},
    economy:{gold:run.economy.gold,tier:run.economy.tier,relicIncome:run.economy.relicIncome||0,
      board:(run.economy.board||[]).map(wireWare),vault:(run.economy.vault||[]).map(wireWare),
      charms:(run.economy.trinkets||[]).map(function(t){const id=typeof t==='string'?t:t.id;
        const charm=TRINKETS.find(function(x){return x.id===id;});return {id:id,name:charm?charm.n:id};})},
    timing:{calendarMs:metrics.timing.calendarMs||0,activeMs:metrics.timing.activeMs||0,
      gameplayMs:gameplayMs(metrics),debriefMs:(metrics.timing.phases||{}).debrief||0,
      sessions:metrics.timing.sessions||0,reloads:metrics.timing.reloads||0,
      phases:clone(metrics.timing.phases||{}),districts:clone(metrics.timing.districts||{})},
    midpointTreasure:midpointTreasureOutcome(run),
    variance:runVariance(run,map),
    debrief:clone(metrics.debrief||{}),metrics:metrics};
  return report;
}

function q(v){return JSON.stringify(v==null?'':v);}
function mins(ms){return (ms/60000).toFixed(1);}
function topDamage(record){
  return Object.keys(record.metrics.wares||{}).map(function(id){const w=record.metrics.wares[id];return {id:id,n:ITEMS[id]?ITEMS[id].n:id,d:w.damage.total||0};})
    .filter(function(x){return x.d>0;}).sort(function(a,b){return b.d-a.d;}).slice(0,5);
}

export function formatRunSummary(record){
  const L=['---','game: Tavern Bash','schema: '+RUN_REPORT_SCHEMA,'version: '+record.version,
    'mode: '+record.routeMode,'lantern: '+(record.lantern||0),'date: '+record.endedAtIso.slice(0,16).replace('T',' '),'seed: '+record.seed,
    'result: '+record.result,'hero: '+q(record.setup.hero),'omen: '+q(record.setup.omen),
    'district_reached: '+q(record.progress.district),'bosses_beaten: '+record.progress.bossesBeaten,
    'nodes_visited: '+record.progress.nodesVisited,'boss_retries: '+record.progress.bossRetries,
    'resolve: '+record.progress.resolve,'resolve_max: '+record.progress.resolveMax,'gold: '+record.economy.gold,
    'tier: '+record.economy.tier,'active_minutes: '+mins(record.timing.gameplayMs),
    'calendar_minutes: '+mins(record.timing.calendarMs),'sessions: '+record.timing.sessions,
    'partial_telemetry: '+record.partial,'archive_saved: '+record.archive_saved,'---','',
    '# Tavern Bash run','',record.result.indexOf('clear')>=0||record.result==='win'
      ?'Cleared '+record.progress.district+'.':'The caravan broke in '+record.progress.district+'.','',
    'Final board: '+(record.economy.board.length?record.economy.board.map(function(w){return w.rarityName+' '+(w.enchantName?w.enchantName+' ':'')+w.name;}).join(', '):'empty')];
  const top=topDamage(record);if(top.length){L.push('','Top attributed damage: '+top.map(function(x){return x.n+' '+Math.round(x.d);}).join(', '));}
  const va=record.variance;if(va&&(va.variety||va.affix)){
    const words=(va.affixes||[]).map(function(a){return a.word;});
    L.push('','Variety '+(va.variety?'on':'off')+'. Affixes: '+(words.length?words.join(', '):'off')+'.');
  }
  const mt=record.midpointTreasure;if(mt){
    L.push('','Midpoint Treasure offered: '+(mt.offered.length?mt.offered.map(function(w){return w.name;}).join(', '):'none'));
    if(mt.selected)L.push('Midpoint Treasure selected: '+mt.selected.name);
    else if(mt.fallbackApplied)L.push('Midpoint Treasure fallback: '+mt.fallbackGold+' gold');
    else L.push('Midpoint Treasure selected: unresolved');
  }
  const d=record.debrief||{};if(d.pace||d.difficulty||d.agency||d.note){L.push('','Debrief: pace '+(d.pace||'unset')+', difficulty '+(d.difficulty||'unset')+', build agency '+(d.agency||'unset')+(d.note?'. '+d.note:''));}
  return L.join('\n');
}

export function formatRunFullData(record){return JSON.stringify(record,null,2);}
export function formatRunBatch(records){return JSON.stringify({schema:'tavern-bash-run-batch/1',runs:records},null,2);}
