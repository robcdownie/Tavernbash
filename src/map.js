"use strict";
/* The Long Bazaar route generator. Pure and deterministic: one run seed in, one
   full map out. Quick is the original four district braid. Long adds three
   explicitly labelled After Midnight reprises before the Dragon Gate. Regular
   districts each run five columns of chosen nodes plus a fixed boss; the Dragon
   Gate is a short gauntlet (an elite choice, a preparation choice, the Grand
   Vizier). The generator owns every placement and connection rule from the
   approved run-structure doc; it renders nothing and never touches the engine.

   Node types: monster, elite, boss (combats) and market, rest, treasure, shrine,
   negotiation (noncombat). A run visits one node per column plus each boss.
   Quick totals 22 selected nodes and Long totals 40. Regular map columns hold
   three nodes so the player picks a lane as they move right. */
import {mulberry, gateOK} from './engine.js';
import {DISTRICTS, LONG_DISTRICTS, PERSONAS, ITEMS, ENCH, LANTERN} from './data.js';

/* bump when the generator's output shape or rules change, so a saved run that
   regenerates its map from the seed can reject a stale layout */
export const MAP_VERSION=12;   /* v12: the 0.97.0 payoff wares enter the Treasure pool */

/* Content epoch (Launch L1 0.99.2): pool membership and resolved content, kept
   separate from MAP_VERSION (generator structure and rules) and ROUTE_SAVE_VERSION
   (serialized shape). A balance or content release that changes a map-affecting
   pool bumps CONTENT_EPOCH and freezes the epoch it leaves into EPOCH_TABLES, so a
   supported active run regenerates its own epoch's map byte-identical instead of
   being retired. genMap resolves treasure pools, district power, and the enchant
   pool through these tables; the current epoch computes live, so a run at the
   current epoch stays byte-identical to the pre-epoch generator. */
export const CONTENT_EPOCH=1;

/* frozen snapshots for supported past epochs; empty at 0.99.2 because epoch 1 is
   current and computes live. A future version that bumps CONTENT_EPOCH stores
   snapshotContentTables() under the epoch number it is leaving. */
export const EPOCH_TABLES={};

/* the live content tables the generator would use right now, ready to be frozen
   under the outgoing epoch the moment a content change bumps CONTENT_EPOCH */
export function snapshotContentTables(){
  /* treasure is a pure function of the numeric district id (the tier gate), so a
     flat map is safe. power is mode-specific: quick district 4 is the Dragon Gate
     while long district 4 is an After Midnight reprise, so power is keyed by mode. */
  const treasure={},power={quick:{},long:{}};
  for(const D of DISTRICTS){treasure[D.id]=treasureWareIds(D.id);power.quick[D.id]=D.power==null?null:D.power;}
  for(const D of LONG_DISTRICTS){treasure[D.id]=treasureWareIds(D.id);power.long[D.id]=D.power==null?null:D.power;}
  return {epoch:CONTENT_EPOCH,treasure:treasure,power:power,enchIds:Object.keys(ENCH)};
}

/* narrow a run's content tables to one route mode, so the leaf generators read a
   flat power map (content.power[districtId]) without a quick/long id collision */
function modeContent(content,mode){
  if(!content)return null;
  return {treasure:content.treasure,power:(content.power&&content.power[mode])||null,enchIds:content.enchIds};
}

/* the content tables a run of the given epoch must generate with. The current
   epoch (or a null or absent epoch) computes live; a supported past epoch reads
   its frozen snapshot; an unknown epoch falls back to live, the safe grandfather. */
export function contentTablesFor(epoch){
  if(epoch==null||epoch===CONTENT_EPOCH)return null;
  return EPOCH_TABLES[epoch]||null;
}

export const COMBAT=new Set(['monster','elite','boss']);
export function isCombat(n){return COMBAT.has(n.type);}
/* the choice events: nodes that open a pick-one card rather than a market or a
   fight. The cadence rules below keep them from repeating along a walked path. */
export const CHOICE_EVENTS=new Set(['treasure','negotiation','rest','shrine']);

const LANES=3;

function chance(rng,p){return rng()<p;}
function shuffleIn(rng,a){for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));const t=a[i];a[i]=a[j];a[j]=t;}return a;}
/* weighted pick over [ [value, weight], ... ] */
function wpick(rng,entries){
  let tot=0;for(const e of entries)tot+=e[1];
  let r=rng()*tot;
  for(const e of entries){r-=e[1];if(r<=0)return e[0];}
  return entries[entries.length-1][0];
}

/* flat id to node lookup for a district (grid nodes plus the boss) */
function nodeMap(d){
  const m={};
  for(const col of d.columns)for(const n of col)m[n.id]=n;
  m[d.boss.id]=d.boss;
  return m;
}
/* every source to boss path; the graph is a small DAG so full enumeration is cheap */
export function districtPaths(d){
  const m=nodeMap(d),out=[];
  const walk=(n,p)=>{p=p.concat([n]);if(n.type==='boss'){out.push(p);return;}for(const nx of n.next)walk(m[nx],p);};
  for(const s of d.columns[0])walk(s,[]);
  return out;
}

/* planar wiring between two three-lane columns: the straight edges guarantee no
   dead ends and full column-to-column reach; at most one diagonal per adjacent
   lane pair keeps edges from crossing while giving most nodes a real branch. */
function wire(rng,colA,colB){
  for(let l=0;l<colA.length;l++){if(colB[l])colA[l].next.push(colB[l].id);}
  for(let l=0;l<colA.length-1;l++){
    if(chance(rng,0.55)){
      if(chance(rng,0.5)){if(colB[l+1])colA[l].next.push(colB[l+1].id);}
      else{if(colB[l])colA[l+1].next.push(colB[l].id);}
    }
  }
}

/* allowed noncombat/other types by column index (0 based). Column 1 is handled
   separately (always monster doors). Elites and the shrine are pre-placed. */
const COLTYPES={
  1:[['market',3],['treasure',2],['negotiation',2],['monster',2]],
  2:[['market',2],['treasure',3],['monster',2]],
  3:[['rest',3],['treasure',2],['negotiation',2],['monster',2]],
  4:[['market',3],['rest',3],['treasure',2],['monster',1]]
};

/* how high a tier a district's free treasure ware may roll, so an early Treasure
   stays district-appropriate rather than handing out a late-game ware */
const TREASURE_GATE={1:1,2:2,3:4,4:6};
export function treasureWareIds(districtId){
  const gate=TREASURE_GATE[districtId]||6;
  return Object.keys(ITEMS).filter(function(id){
    const item=ITEMS[id];
    return gateOK(item.tier,gate)&&!item.inc&&!item.sig&&(!item.unique||item.acquisition==='treasure');
  });
}
/* roll a face-up Treasure at map generation: the ware option carries a concrete
   ware id and the enchant option a concrete enchant, so the node can be scouted
   and the card shows exactly what it grants instead of a generic "Free Ware". The
   result is stored on the node and consumed as-is on arrival. */
function rollTreasure(rng,districtId,content){
  const wareIds=(content&&content.treasure&&content.treasure[districtId])||treasureWareIds(districtId);
  const enchIds=(content&&content.enchIds)||Object.keys(ENCH);
  const concrete=function(o){
    if(o.kind==='ware'&&wareIds.length)return {kind:'ware',id:wareIds[Math.floor(rng()*wareIds.length)]};
    if(o.kind==='enchant'&&enchIds.length)return {kind:'enchant',ench:enchIds[Math.floor(rng()*enchIds.length)]};
    return o;
  };
  return {options:shuffleIn(rng,[{kind:'gold'},{kind:'ware'},{kind:'enchant'}]).map(concrete)};
}

/* one attempt at a District I to III layout; returns the district or null if it
   breaks a route rule, in which case genDistrict re-rolls with fresh randomness.
   The lantern only moves gilding booleans (L7 forces elites, L8 raises the
   monster-door threshold on the SAME single draw), so one seed yields the same
   structure, ids, and draw count at every level; the Dragon Gate never sees it. */
function tryDistrict(rng,D,allowShrine,lantern,content){
  const cols=[[],[],[],[],[]];
  const norm=shuffleIn(rng,D.normals.slice());
  const elite=shuffleIn(rng,D.elites.slice());
  let budget=D.normals.length-LANES;      /* monster doors beyond column 1 */
  let ni=0,ei=0;
  const gildP=lantern>=8?LANTERN.find(function(r){return r.lv===8;}).monsterGildChance:0.12;

  const mk=(col,lane,type)=>{
    const n={id:'d'+D.id+'c'+(col+1)+'l'+lane,type:type,district:D.id,col:col,lane:lane,
      threat:col<=1?D.threatEarly:D.threatLate,next:[]};
    if(D.power!=null&&COMBAT.has(type))n.power=D.power;
    if(type==='monster'){n.monId=norm[ni++];}
    else if(type==='elite'){n.monId=elite[ei++];n.gilded=D.forceGilded?true:(chance(rng,0.12)||lantern>=7);}
    else if(type==='treasure'){n.reward=rollTreasure(rng,D.id,content);}
    else if(type==='negotiation'){n.persona=Math.floor(rng()*PERSONAS.length);}
    if(type==='monster'){n.gilded=D.forceGilded?true:chance(rng,gildP);}
    cols[col][lane]=n;
    return n;
  };

  /* column 1: three monster doors */
  for(let l=0;l<LANES;l++)mk(0,l,'monster');

  /* pre-place at most one elite (columns 3 or 4) and the shrine (column 3) */
  const eliteCol=chance(rng,0.6)?(chance(rng,0.5)?2:3):-1;
  const eliteLane=Math.floor(rng()*LANES);
  const shrineLane=Math.floor(rng()*LANES);
  if(eliteCol>=0&&D.elites.length)mk(eliteCol,eliteLane,'elite');
  if(allowShrine)mk(2,shrineLane,'shrine');

  /* fill the rest of columns 2 to 5 from their allowed sets */
  for(let c=1;c<5;c++){
    for(let l=0;l<LANES;l++){
      if(cols[c][l])continue;
      const allowed=COLTYPES[c].filter(e=>e[0]!=='monster'||budget>0);
      const t=wpick(rng,allowed);
      if(t==='monster')budget--;
      mk(c,l,t);
    }
  }

  /* monster ids must not have run dry */
  if(ni>norm.length)return null;

  /* wire columns, then every last-column node into the boss */
  for(let c=0;c<4;c++)wire(rng,cols[c],cols[c+1]);
  const boss={id:'d'+D.id+'boss',type:'boss',district:D.id,col:5,lane:1,threat:D.threatBoss,monId:D.boss,gilded:!!D.forceGilded,next:[]};
  if(D.power!=null)boss.power=D.power;
  for(const n of cols[4])n.next.push(boss.id);

  const d={id:D.id,name:D.name,slip:D.slip,threatBoss:D.threatBoss,columns:cols,boss:boss};
  if(D.sourceId!=null)d.sourceId=D.sourceId;
  if(D.lossChip!=null)d.lossChip=D.lossChip;
  if(D.reprise)d.reprise=true;
  if(D.forceGilded)d.forceGilded=true;
  if(D.power!=null)d.power=D.power;
  return validate(d,allowShrine)?d:null;
}

/* every route rule that depends on the finished graph */
function validate(d,allowShrine){
  const m=nodeMap(d);
  const paths=districtPaths(d);
  for(const p of paths){
    if(p.length!==6)return false;                          /* five columns plus boss */
    for(let i=0;i+3<=p.length;i++){                         /* never three combats in a row */
      if(isCombat(p[i])&&isCombat(p[i+1])&&isCombat(p[i+2]))return false;
    }
    /* event cadence (map version 10): the same choice event never twice running,
       and never more than twice on one walked path, so a road cannot read as
       three Treasures in a row or Treasure at every other step */
    const evCount={};
    for(let i=0;i<p.length;i++){
      const t=p[i].type;
      if(!CHOICE_EVENTS.has(t))continue;
      if(i+1<p.length&&p[i+1].type===t)return false;
      evCount[t]=(evCount[t]||0)+1;
      if(evCount[t]>2)return false;
    }
  }
  /* boss preparation: every column 4 node can reach a Market or Rest in column 5 */
  for(const n of d.columns[3]){
    let ok=false;
    for(const nx of n.next){const t=m[nx].type;if(t==='market'||t==='rest'){ok=true;break;}}
    if(!ok)return false;
  }
  /* a Market must be reachable from every district entrance */
  for(const s of d.columns[0]){
    const seen=new Set(),stack=[s];let market=false;
    while(stack.length){
      const n=stack.pop();if(seen.has(n.id))continue;seen.add(n.id);
      if(n.type==='market')market=true;
      for(const nx of n.next)stack.push(m[nx]);
    }
    if(!market)return false;
  }
  /* exactly one shrine when this district owns it, none otherwise */
  let shrines=0;for(const col of d.columns)for(const n of col)if(n.type==='shrine')shrines++;
  if(allowShrine?shrines!==1:shrines!==0)return false;
  /* at most one elite node keeps every path under one elite per district */
  let elites=0;for(const col of d.columns)for(const n of col)if(n.type==='elite')elites++;
  if(elites>1)return false;
  return true;
}

/* apply a run's content-epoch power to a district def, if it differs from live */
function withEpochPower(D,content){
  if(!content||!content.power||!(D.id in content.power))return D;
  const p=content.power[D.id];
  if(p===(D.power==null?null:D.power))return D;
  return Object.assign({},D,{power:p});
}
function genDistrict(rng,D,allowShrine,lantern,content){
  const Dp=withEpochPower(D,content);
  for(let a=0;a<6000;a++){
    const d=tryDistrict(rng,Dp,allowShrine,lantern,content);
    if(d)return d;
  }
  throw new Error('map: district '+D.id+' failed to generate');
}

/* the Dragon Gate: choose one of two elites, then one preparation node (Rest or
   Treasure), then a guaranteed Market, then the Grand Vizier. The market is
   always on the road so the elite bounty wares, the Treasure reward, and a Rest
   Refit all have somewhere to land before the boss (without it, taking Rest or
   Treasure stranded every late reward with no shop before the Vizier). No monster
   doors, no shrine, no slipping past. */
function genDragonGate(rng,D,content){
  const Dp=withEpochPower(D,content);
  const id=Dp.id;
  const elites=[
    {id:'d'+id+'c1l0',type:'elite',district:id,col:0,lane:0,threat:Dp.threatEarly,monId:Dp.elites[0],gilded:Dp.forceGilded?true:chance(rng,0.12),next:[]},
    {id:'d'+id+'c1l2',type:'elite',district:id,col:0,lane:2,threat:Dp.threatLate,monId:Dp.elites[1],gilded:Dp.forceGilded?true:chance(rng,0.12),next:[]}
  ];
  if(Dp.power!=null)for(const e of elites)e.power=Dp.power;
  const prep=[
    {id:'d'+id+'c2l0',type:'rest',district:id,col:1,lane:0,threat:Dp.threatLate,next:[]},
    {id:'d'+id+'c2l2',type:'treasure',district:id,col:1,lane:2,threat:Dp.threatLate,reward:rollTreasure(rng,Dp.id,content),next:[]}
  ];
  const market={id:'d'+id+'c3l1',type:'market',district:id,col:2,lane:1,threat:Dp.threatLate,next:[]};
  const boss={id:'d'+id+'boss',type:'boss',district:id,col:3,lane:1,threat:Dp.threatBoss,monId:Dp.boss,gilded:!!Dp.forceGilded,next:[]};
  if(Dp.power!=null)boss.power=Dp.power;
  for(const e of elites)for(const p of prep)e.next.push(p.id);
  for(const p of prep)p.next.push(market.id);
  market.next.push(boss.id);
  const d={id:id,name:Dp.name,slip:Dp.slip,threatBoss:Dp.threatBoss,columns:[elites,prep,[market]],boss:boss};
  if(Dp.sourceId!=null)d.sourceId=Dp.sourceId;
  if(Dp.lossChip!=null)d.lossChip=Dp.lossChip;
  if(Dp.forceGilded)d.forceGilded=true;
  if(Dp.power!=null)d.power=Dp.power;
  return d;
}

/* the rare bronze to silver treasure upgrade: at most once per run. Fold it into
   one random treasure node's face-up options after the whole map exists. */
function injectSilver(rng,districts){
  if(!chance(rng,0.5))return;
  const treas=[];
  for(const d of districts)for(const col of d.columns)for(const n of col)if(n.type==='treasure')treas.push(n);
  if(!treas.length)return;
  const t=treas[Math.floor(rng()*treas.length)];
  t.reward.options[Math.floor(rng()*t.reward.options.length)]={kind:'silver'};
}

function finishMap(runSeed,shrineDistrict,districts,extra){
  const nodes={};
  for(const d of districts){for(const col of d.columns)for(const n of col)nodes[n.id]=n;nodes[d.boss.id]=d.boss;}
  return Object.assign({version:MAP_VERSION,seed:runSeed>>>0,shrineDistrict:shrineDistrict,
    districts:districts,nodes:nodes,start:districts[0].columns[0].map(n=>n.id)},extra||{});
}

function genQuick(runSeed,lantern,content){
  content=modeContent(content,'quick');
  const rng=mulberry(runSeed>>>0);
  const shrineDistrict=chance(rng,0.5)?2:3;
  const districts=[];
  for(const D of DISTRICTS){
    if(D.id===4)districts.push(genDragonGate(rng,D,content));
    else districts.push(genDistrict(rng,D,D.id===shrineDistrict,lantern,content));
  }
  injectSilver(rng,districts);
  return finishMap(runSeed,shrineDistrict,districts,lantern?{lantern:lantern}:null);
}

function genLong(runSeed,lantern,content){
  content=modeContent(content,'long');
  const rng=mulberry(runSeed>>>0);
  const firstShrine=chance(rng,0.5)?2:3;
  const secondShrine=chance(rng,0.5)?5:6;
  const districts=[];
  for(const D of LONG_DISTRICTS){
    if(D.sourceId===4)districts.push(genDragonGate(rng,D,content));
    else districts.push(genDistrict(rng,D,D.id===firstShrine||D.id===secondShrine,lantern,content));
  }
  injectSilver(rng,districts.slice(0,3));
  injectSilver(rng,districts.slice(3,6));
  return finishMap(runSeed,firstShrine,districts,Object.assign({mode:'long',shrineDistricts:[firstShrine,secondShrine]},lantern?{lantern:lantern}:null));
}

/* lantern 0 (or absent) is byte-identical to the pre-Lantern generator: no
   stamp, no threshold change, so the pinned Quick hash ledger holds */
export function genMap(runSeed,mode='quick',lantern=0,content){
  return mode==='long'?genLong(runSeed,lantern,content):genQuick(runSeed,lantern,content);
}
