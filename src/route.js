"use strict";
/* The Long Bazaar route controller. A pure state machine over the run's position
   on the generated map: no DOM, no engine, no economy. The UI renders this state
   and dispatches actions; combat and rewards arrive as effects the caller applies.

   Canonical position is an ordered list of completed node ids (path) plus an
   optional committed encounter (pendingId) and a phase. The frontier of choosable
   nodes, the visited set, and the current district are DERIVED, never stored, so a
   save can never carry a contradictory route. The map regenerates from the seed. */
import {MONSTERS, MONCHIP, DISTRICTS} from './data.js';
import {MAP_VERSION} from './map.js';

/* victory gold by encounter; a monster bounty is added by the caller */
export const BASE_GOLD={monster:3,elite:5,boss:7};
/* extra Resolve lost on a loss, by encounter kind */
const LOSS_BONUS={monster:0,elite:2,boss:4};

/* deterministic per-fight seed, independent of shop or animation rng so a boss
   retry replays the same on restart but differs on the next authorized attempt */
function hash32(str){
  let h=0x811c9dc5;
  for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,0x01000193);}
  return h>>>0;
}
export function fightSeed(seed,nodeId,attempt){return hash32((seed>>>0)+':'+nodeId+':'+attempt);}

export function nodeOf(map,id){return map.nodes[id];}
export function visitedSet(state){return new Set(state.path);}

/* the Resolve a loss costs: district chip, encounter bonus, and a capped share of
   the enemy's surviving item tiers (passed in from the finished fight) */
export function lossDamage(node,survTier){
  return MONCHIP[node.district]+LOSS_BONUS[node.type]+Math.min(4,Math.ceil((survTier||0)/3));
}

/* the choosable nodes right now: nothing mid-encounter, the district entrance at a
   boundary, the next district's entrance after a boss, else the last node's exits */
export function frontier(state,map){
  if(state.pendingId)return [];
  if(state.path.length===0)return map.districts[0].columns[0].map(n=>n.id);
  const last=nodeOf(map,state.path[state.path.length-1]);
  if(last.type==='boss'){
    if(last.district>=4)return [];
    return map.districts[last.district].columns[0].map(n=>n.id);
  }
  return last.next.slice();
}
/* classify the edges of one district for the map's connector layer: a done edge
   is a consecutive pair already walked in the path, an avail edge leaves the node
   the player currently stands on, everything else is future */
export function classifyEdges(state,district){
  const path=state.path;
  const done=new Set();
  for(let i=0;i+1<path.length;i++)done.add(path[i]+'>'+path[i+1]);
  const last=path.length?path[path.length-1]:null;
  const inDist=new Set();
  for(const col of district.columns)for(const n of col)inDist.add(n.id);
  inDist.add(district.boss.id);
  const edges=[];
  const nodes=[];
  for(const col of district.columns)for(const n of col)nodes.push(n);
  for(const a of nodes){
    for(const to of (a.next||[])){
      if(!inDist.has(to))continue;
      const key=a.id+'>'+to;
      edges.push({from:a.id,to:to,state:done.has(key)?'done':(a.id===last?'avail':'future')});
    }
  }
  return edges;
}
export function currentDistrict(state,map){
  if(state.pendingId)return nodeOf(map,state.pendingId).district-1;
  if(state.path.length===0)return 0;
  const last=nodeOf(map,state.path[state.path.length-1]);
  if(last.type==='boss')return Math.min(3,last.district);
  return last.district-1;
}

export function initRoute(seed){
  return {seed:seed>>>0,version:MAP_VERSION,path:[],pendingId:null,resolution:null,
    phase:'map',resolve:40,resolveMax:40,attempts:{},fightSeed:null};
}

/* a saved route is trustworthy only if the generator version matches and every
   remembered node id still exists in the regenerated map */
export function validRoute(state,map){
  if(!state||state.version!==MAP_VERSION||map.version!==MAP_VERSION)return false;
  for(const id of state.path)if(!map.nodes[id])return false;
  if(state.pendingId&&!map.nodes[state.pendingId])return false;
  return true;
}

function clone(state){
  return {seed:state.seed,version:state.version,path:state.path.slice(),pendingId:state.pendingId,
    resolution:state.resolution,phase:state.phase,resolve:state.resolve,resolveMax:state.resolveMax,
    attempts:Object.assign({},state.attempts),fightSeed:state.fightSeed};
}
function complete(ns,node){ns.path.push(node.id);ns.pendingId=null;ns.resolution=null;}

/* commit a frontier node. choice is challenge or slip for monsters, challenge for
   elites and bosses, and implied for market and event nodes. */
function commit(state,map,a){
  if(state.phase!=='map')throw new Error('route: commit outside map phase');
  if(frontier(state,map).indexOf(a.nodeId)<0)throw new Error('route: node not on the frontier');
  const node=nodeOf(map,a.nodeId);
  const ns=clone(state);
  if(node.type==='monster'&&a.choice==='slip'){
    const cost=DISTRICTS[node.district-1].slip;
    ns.resolve-=cost;complete(ns,node);
    const eff=[{type:'slip',nodeId:node.id,cost:cost}];
    if(ns.resolve<=0){ns.phase='lost';eff.push({type:'end',cause:'resolve'});}
    return {state:ns,effects:eff};
  }
  if(node.type==='monster'||node.type==='elite'||node.type==='boss'){
    const attempt=state.attempts[node.id]||0;
    ns.pendingId=node.id;ns.resolution='challenge';ns.phase='encounter';
    ns.fightSeed=fightSeed(state.seed,node.id,attempt);
    return {state:ns,effects:[{type:'fight',nodeId:node.id,monId:node.monId,threat:node.threat,
      gilded:!!node.gilded,boss:node.type==='boss',fightSeed:ns.fightSeed}]};
  }
  if(node.type==='market'){
    ns.pendingId=node.id;ns.resolution='market';ns.phase='market';
    return {state:ns,effects:[{type:'market',nodeId:node.id}]};
  }
  /* rest, treasure, shrine, negotiation */
  ns.pendingId=node.id;ns.resolution='event';ns.phase='event';
  return {state:ns,effects:[{type:'event',nodeId:node.id,kind:node.type,node:node}]};
}

/* consume a finished fight. A win moves to the reward phase (settled separately so a
   reload cannot double-pay); a loss spends Resolve and either advances (normal or
   elite) or holds the player at the gate (boss). */
function fightResult(state,map,a){
  if(state.phase!=='encounter'||!state.pendingId)throw new Error('route: no fight to resolve');
  const node=nodeOf(map,state.pendingId);
  const ns=clone(state);
  if(a.winner==='a'){
    ns.phase='reward';
    return {state:ns,effects:[{type:'wonFight',nodeId:node.id}]};
  }
  const dmg=lossDamage(node,a.survTier||0);
  ns.resolve-=dmg;
  const eff=[{type:'lostFight',nodeId:node.id,damage:dmg}];
  if(node.type==='boss'){
    if(ns.resolve<=0){ns.phase='lost';eff.push({type:'end',cause:'resolve'});}
    else{ns.phase='gateCamp';eff.push({type:'gateCamp',nodeId:node.id});}
    return {state:ns,effects:eff};        /* pendingId stays: the boss is still owed */
  }
  complete(ns,node);
  if(ns.resolve<=0){ns.phase='lost';eff.push({type:'end',cause:'resolve'});}
  else ns.phase='map';
  return {state:ns,effects:eff};
}

/* apply the win reward exactly once, then complete the node */
function settleReward(state,map){
  if(state.phase!=='reward'||!state.pendingId)throw new Error('route: no reward to settle');
  const node=nodeOf(map,state.pendingId);
  const ns=clone(state);
  const won=node.type==='boss'&&node.district>=4;
  complete(ns,node);
  ns.phase=won?'won':'map';
  const eff=[{type:'reward',nodeId:node.id,gold:BASE_GOLD[node.type],monId:node.monId,
    bounty:(MONSTERS[node.monId]&&MONSTERS[node.monId].bounty)||null,gilded:!!node.gilded,encounter:node.type}];
  if(won)eff.push({type:'end',cause:'won'});
  return {state:ns,effects:eff};
}

function leaveMarket(state,map){
  if(state.phase!=='market'||!state.pendingId)throw new Error('route: not in a market');
  const node=nodeOf(map,state.pendingId);
  const ns=clone(state);complete(ns,node);ns.phase='map';
  return {state:ns,effects:[{type:'marketDone',nodeId:node.id}]};
}

/* complete a noncombat event node; outcome is applied by the caller */
function resolveEvent(state,map,a){
  if(state.phase!=='event'||!state.pendingId)throw new Error('route: no event to resolve');
  const node=nodeOf(map,state.pendingId);
  const ns=clone(state);
  if(a&&typeof a.resolveDelta==='number')ns.resolve=Math.min(ns.resolveMax,ns.resolve+a.resolveDelta);
  complete(ns,node);ns.phase='map';
  const eff=[{type:'eventDone',nodeId:node.id,outcome:(a&&a.outcome)||null}];
  if(ns.resolve<=0){ns.phase='lost';eff.push({type:'end',cause:'resolve'});}
  return {state:ns,effects:eff};
}

/* re-enter a lost boss from the Gate Camp; the attempt increments now, so the fight
   seed changes only when the next authorized attempt actually begins */
function startBossRetry(state,map){
  if(state.phase!=='gateCamp'||!state.pendingId)throw new Error('route: no gate camp');
  const node=nodeOf(map,state.pendingId);
  const ns=clone(state);
  const attempt=(state.attempts[node.id]||0)+1;
  ns.attempts[node.id]=attempt;ns.phase='encounter';ns.fightSeed=fightSeed(state.seed,node.id,attempt);
  return {state:ns,effects:[{type:'fight',nodeId:node.id,monId:node.monId,threat:node.threat,
    gilded:false,boss:true,fightSeed:ns.fightSeed}]};
}

/* single dispatch entry: transition(state, map, action) -> {state, effects} */
export function transition(state,map,action){
  switch(action.type){
    case 'commit':return commit(state,map,action);
    case 'fightResult':return fightResult(state,map,action);
    case 'settleReward':return settleReward(state,map);
    case 'leaveMarket':return leaveMarket(state,map);
    case 'resolveEvent':return resolveEvent(state,map,action);
    case 'startBossRetry':return startBossRetry(state,map);
    default:throw new Error('route: unknown action '+action.type);
  }
}
