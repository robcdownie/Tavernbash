"use strict";
/* Optional route telemetry. This module owns only durable observations and
   arithmetic. Callers supply the clock and combat diagnostic facts, so tests do
   not depend on Date.now and the combat engine never imports the route layer. */

export const METRICS_VERSION=1;
export const METRIC_EVENT_LIMIT=1024;

function blankTiming(startedAt){
  return {startedAt:startedAt==null?null:startedAt,endedAt:null,calendarMs:0,activeMs:0,
    sessions:0,reloads:0,phases:{},districts:{},
    cursor:{active:false,lastAt:null,phase:"setup",district:1}};
}

export function newMetrics(startedAt){
  return {version:METRICS_VERSION,partial:false,timing:blankTiming(startedAt),events:[],droppedEvents:0,
    counts:{},shops:{rolls:0,rerolls:0,freezes:0,buys:0,sells:0,goldSpent:0,goldEarned:0},
    wares:{},fights:[],snapshots:[],debrief:{pace:null,difficulty:null,agency:null,note:""}};
}

function copyMap(v){return Object.assign({},v||{});}
function reviveTiming(raw){
  const t=blankTiming(raw&&raw.startedAt);
  if(!raw)return t;
  t.endedAt=raw.endedAt==null?null:raw.endedAt;
  t.calendarMs=raw.calendarMs||0;t.activeMs=raw.activeMs||0;
  t.sessions=raw.sessions||0;t.reloads=raw.reloads||0;
  t.phases=copyMap(raw.phases);t.districts={};
  Object.keys(raw.districts||{}).forEach(function(k){const d=raw.districts[k]||{};
    t.districts[k]={activeMs:d.activeMs||0,phases:copyMap(d.phases)};
  });
  const c=raw.cursor||{};
  t.cursor={active:false,lastAt:null,phase:c.phase||"setup",district:c.district||1};
  return t;
}

export function reviveMetrics(raw){
  const m=newMetrics(null);
  if(!raw){m.partial=true;return m;}
  m.partial=!!raw.partial;
  m.timing=reviveTiming(raw.timing);
  m.events=Array.isArray(raw.events)?raw.events.slice(0,METRIC_EVENT_LIMIT):[];
  m.droppedEvents=(raw.droppedEvents||0)+Math.max(0,(raw.events||[]).length-METRIC_EVENT_LIMIT);
  m.counts=copyMap(raw.counts);
  m.shops=Object.assign(m.shops,raw.shops||{});
  m.wares=JSON.parse(JSON.stringify(raw.wares||{}));
  m.fights=Array.isArray(raw.fights)?JSON.parse(JSON.stringify(raw.fights)):[];
  m.snapshots=Array.isArray(raw.snapshots)?JSON.parse(JSON.stringify(raw.snapshots)):[];
  m.debrief=Object.assign(m.debrief,raw.debrief||{});
  return m;
}

export function serializeMetrics(metrics){
  const out=reviveMetrics(metrics);
  out.timing.cursor.active=false;out.timing.cursor.lastAt=null;
  return out;
}

function addPhase(t,phase,district,delta){
  if(!(delta>0))return;
  t.activeMs+=delta;t.phases[phase]=(t.phases[phase]||0)+delta;
  const key=String(district||1),d=t.districts[key]||(t.districts[key]={activeMs:0,phases:{}});
  d.activeMs+=delta;d.phases[phase]=(d.phases[phase]||0)+delta;
}

export function touchMetrics(metrics,now){
  if(!metrics||!metrics.timing)return 0;
  const t=metrics.timing,c=t.cursor;
  if(!c.active||c.lastAt==null){return 0;}
  const delta=Math.max(0,(now||0)-c.lastAt);c.lastAt=now;
  addPhase(t,c.phase||"setup",c.district||1,delta);
  return delta;
}

export function resumeMetrics(metrics,now,isReload){
  metrics=reviveMetrics(metrics);
  const t=metrics.timing;
  if(t.startedAt==null)t.startedAt=now;
  t.sessions++;if(isReload)t.reloads++;
  t.cursor.active=true;t.cursor.lastAt=now;
  return metrics;
}

export function activateMetrics(metrics,now){
  if(!metrics||!metrics.timing)return metrics;
  const t=metrics.timing;if(t.startedAt==null)t.startedAt=now;
  t.cursor.active=true;t.cursor.lastAt=now;return metrics;
}

export function pauseMetrics(metrics,now){
  touchMetrics(metrics,now);
  if(metrics&&metrics.timing){metrics.timing.cursor.active=false;metrics.timing.cursor.lastAt=null;}
}

export function setMetricPhase(metrics,phase,district,now){
  if(!metrics||!metrics.timing)return;
  touchMetrics(metrics,now);
  metrics.timing.cursor.phase=phase||"map";
  metrics.timing.cursor.district=district||1;
}

export function finishMetrics(metrics,now){
  if(!metrics||!metrics.timing)return metrics;
  touchMetrics(metrics,now);
  const t=metrics.timing;t.cursor.active=false;t.cursor.lastAt=null;t.endedAt=now;
  t.calendarMs=t.startedAt==null?0:Math.max(0,now-t.startedAt);
  return metrics;
}

function newWareRow(id){
  return {id:id,exposures:0,buys:0,freeTakes:0,sells:0,fusions:0,fights:0,
    damage:{weapon:0,poison:0,burn:0,hook:0,storm:0,other:0,total:0},
    utility:{activations:0,heal:0,overheal:0,shield:0,cleanse:0,haste:0,freeze:0,
      reload:0,spawn:0,repair:0,disable:0,removeShield:0,pocket:0,selfDamage:0}};
}
function wareRow(metrics,id){return metrics.wares[id]||(metrics.wares[id]=newWareRow(id));}

export function recordMetric(metrics,type,data,now){
  if(!metrics)return;
  if(now!=null)touchMetrics(metrics,now);
  data=data||{};metrics.counts[type]=(metrics.counts[type]||0)+1;
  if(metrics.events.length<METRIC_EVENT_LIMIT){metrics.events.push({type:type,atActiveMs:metrics.timing.activeMs,data:data});}
  else{metrics.droppedEvents++;}
  if(type==="shop_roll"){
    metrics.shops.rolls++;(data.offers||[]).forEach(function(o){if(o&&o.id)wareRow(metrics,o.id).exposures++;});
  }else if(type==="shop_reroll"){metrics.shops.rerolls++;}
  else if(type==="shop_freeze"){metrics.shops.freezes++;}
  else if(type==="shop_buy"){
    metrics.shops.buys++;metrics.shops.goldSpent+=data.cost||0;
    if(data.id){const w=wareRow(metrics,data.id);w.buys++;if(data.free)w.freeTakes++;}
  }else if(type==="shop_sell"){
    metrics.shops.sells++;metrics.shops.goldEarned+=data.value||0;
    if(data.id)wareRow(metrics,data.id).sells++;
  }else if(type==="fusion"&&data.id){wareRow(metrics,data.id).fusions++;}
}

function wireWare(it){return {iid:it.iid,id:it.id,rarity:it.rarity||0,ench:it.ench||null,size:it.size};}
export function captureBoardSnapshot(metrics,label,context,board,vault,economy,now){
  if(!metrics)return null;if(now!=null)touchMetrics(metrics,now);
  const snap={label:label,atActiveMs:metrics.timing.activeMs,context:Object.assign({},context||{}),
    gold:economy&&economy.gold,tier:economy&&economy.tier,
    board:(board||[]).map(wireWare),vault:(vault||[]).map(wireWare)};
  metrics.snapshots.push(snap);return snap;
}

const UNATTRIBUTED="unattributed";
function refKey(ref){return ref?ref.side+":"+String(ref.uid):UNATTRIBUTED;}
function blankDamage(){return {weapon:0,poison:0,burn:0,hook:0,storm:0,other:0,total:0};}
function blankUtility(){return {activations:0,heal:0,overheal:0,shield:0,cleanse:0,haste:0,freeze:0,
  reload:0,spawn:0,repair:0,disable:0,removeShield:0,pocket:0,selfDamage:0};}

export function beginCombatTally(context,playerBoard,playerItems,enemyItems){
  const tally={context:Object.assign({},context||{}),sources:{},aliases:{},pools:{},rows:{},
    unattributed:{damage:blankDamage(),utility:blankUtility()},phaseBaseline:null};
  (playerItems||[]).forEach(function(fi,i){
    const w=(playerBoard||[])[i],key=refKey({side:"a",uid:fi.uid});
    if(w){tally.sources[key]={side:"a",iid:w.iid,id:w.id,rarity:w.rarity||0,ench:w.ench||null};
      tally.rows[String(w.iid)]=Object.assign({iid:w.iid,id:w.id,rarity:w.rarity||0,ench:w.ench||null},
        {damage:blankDamage(),utility:blankUtility()});}
  });
  (enemyItems||[]).forEach(function(fi){tally.sources[refKey({side:"b",uid:fi.uid})]={side:"b"};});
  return tally;
}

function originKey(tally,key){
  let cur=key,guard=0;while(tally.aliases[cur]&&guard++<32)cur=tally.aliases[cur];return cur;
}
function rowForSource(tally,source){
  const key=originKey(tally,refKey(source)),meta=tally.sources[key];
  return meta&&meta.side==="a"&&meta.iid!=null?tally.rows[String(meta.iid)]:null;
}
function creditDamage(tally,source,channel,amount){
  if(!(amount>0))return;
  const row=rowForSource(tally,source)||tally.unattributed;
  const k=row.damage[channel]===undefined?"other":channel;
  row.damage[k]+=amount;row.damage.total+=amount;
}
function creditUtility(tally,source,metric,amount){
  if(!(amount>0))return;
  const row=rowForSource(tally,source)||tally.unattributed;
  const k=row.utility[metric]===undefined?null:metric;if(k)row.utility[k]+=amount;
}

function poolKey(status,target){return status+":"+(target&&target.uid!=null?refKey(target):"merchant:"+(target&&target.side||"?"));}
function totalPool(pool){return Object.keys(pool||{}).reduce(function(s,k){return s+(pool[k]||0);},0);}
function apportion(pool,target){
  const keys=Object.keys(pool||{}).sort(),total=totalPool(pool),out={};
  target=Math.max(0,Math.round(target||0));if(!keys.length||!total||!target)return out;
  let used=0;const rem=[];
  keys.forEach(function(k){const raw=pool[k]*target/total,b=Math.floor(raw);out[k]=b;used+=b;rem.push({k:k,r:raw-b});});
  rem.sort(function(a,b){return b.r-a.r||(a.k<b.k?-1:1);});
  for(let i=0;i<target-used;i++)out[rem[i%rem.length].k]++;
  return out;
}
function reconcilePool(tally,key,target){
  const old=tally.pools[key]||{},next=apportion(old,target);
  if(target>0&&totalPool(next)<target){next[UNATTRIBUTED]=(next[UNATTRIBUTED]||0)+target-totalPool(next);}
  tally.pools[key]=next;return next;
}
function sourceFromKey(tally,key){
  if(key===UNATTRIBUTED)return null;const meta=tally.sources[originKey(tally,key)];
  return meta?{side:meta.side,uid:key.split(":").slice(1).join(":")}:null;
}
function addStatus(tally,status,target,source,amount){
  const key=poolKey(status,target),pool=tally.pools[key]||(tally.pools[key]={});
  const src=originKey(tally,refKey(source));pool[src]=(pool[src]||0)+amount;
}
function tickStatus(tally,status,target,channel,actual,post){
  const key=poolKey(status,target),pool=tally.pools[key]||{};
  const shares=apportion(pool,actual);
  Object.keys(shares).forEach(function(k){const meta=tally.sources[originKey(tally,k)];
    creditDamage(tally,meta?{side:meta.side,uid:meta.iid!=null?k.split(":").slice(1).join(":"):k.split(":").slice(1).join(":")}:null,channel,shares[k]);
  });
  reconcilePool(tally,key,post);
}

export function recordCombatDiagnostic(tally,fact){
  if(!tally||!fact)return;
  if(fact.kind==="spawn"){
    const child=refKey(fact.spawned),parent=originKey(tally,refKey(fact.source));
    tally.aliases[child]=parent;tally.sources[child]=tally.sources[parent]||{side:fact.spawned&&fact.spawned.side};
    creditUtility(tally,fact.source,"spawn",1);
  }else if(fact.kind==="damage"){
    creditDamage(tally,fact.source,fact.channel||"other",fact.amount||0);
  }else if(fact.kind==="utility"){
    creditUtility(tally,fact.source,fact.metric,fact.amount||0);
  }else if(fact.kind==="status_add"){
    addStatus(tally,fact.status,fact.target,fact.source,fact.amount||0);
  }else if(fact.kind==="status_tick"){
    tickStatus(tally,fact.status,fact.target,fact.channel,fact.amount||0,fact.post||0);
  }else if(fact.kind==="status_sync"){
    reconcilePool(tally,poolKey(fact.status,fact.target),fact.value||0);
  }else if(fact.kind==="status_transfer"){
    const from=poolKey(fact.status,fact.from),to=poolKey(fact.status,fact.to),pool=tally.pools[from]||{};
    const moved=apportion(pool,fact.amount||0),dest=tally.pools[to]||(tally.pools[to]={});
    Object.keys(moved).forEach(function(k){dest[k]=(dest[k]||0)+moved[k];});
    reconcilePool(tally,from,Math.max(0,totalPool(pool)-(fact.amount||0)));
  }else if(fact.kind==="destroy"){
    for(const status of ["poison","burn"])delete tally.pools[poolKey(status,fact.target)];
  }
}

function addDamage(dst,src){Object.keys(dst).forEach(function(k){dst[k]+=src[k]||0;});}
function addUtility(dst,src){Object.keys(dst).forEach(function(k){dst[k]+=src[k]||0;});}
export function commitCombatTally(metrics,tally,result,now){
  if(!metrics||!tally)return null;if(now!=null)touchMetrics(metrics,now);
  const rows=Object.keys(tally.rows).map(function(k){return tally.rows[k];});
  const fight=Object.assign({},tally.context,result||{},
    {atActiveMs:metrics.timing.activeMs,wares:rows,unattributed:tally.unattributed});
  metrics.fights.push(fight);
  rows.forEach(function(row){const w=wareRow(metrics,row.id);w.fights++;addDamage(w.damage,row.damage);addUtility(w.utility,row.utility);});
  return fight;
}

export function metricPhaseTotals(metrics,names){
  const p=metrics&&metrics.timing&&metrics.timing.phases||{};
  return (names||[]).reduce(function(out,n){out[n]=p[n]||0;return out;},{});
}
