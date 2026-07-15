"use strict";
/* The two route Charm checkpoints. Offers are derived from the run seed and
   boss node, so opening, reloading, or retrying a settled reward cannot reroll
   them. The first eligible offer follows the stall's commonest non-utility
   category, one offer is neutral, and the remainder are distinct random picks. */
import {ITEMS,TRINKETS} from './data.js';
import {mulberry} from './engine.js';
import {fightSeed} from './route.js';

function charmId(charm){return typeof charm==='string'?charm:charm&&charm.id;}

export function isCharmCheckpoint(node){
  return !!node&&node.type==='boss'&&(node.district===1||node.district===2);
}

export function commonBoardCategory(board){
  const counts={},order=[];
  for(const ware of board||[]){
    const d=ITEMS[ware.id],cat=d&&d.cat;
    if(!cat)continue;
    if(counts[cat]===undefined){counts[cat]=0;order.push(cat);}
    counts[cat]++;
  }
  let top=null,best=1;
  for(const cat of order){
    if(cat!=='util'&&counts[cat]>best){best=counts[cat];top=cat;}
  }
  return top;
}

export function charmOffers(seed,nodeId,board,owned){
  const held=new Set((owned||[]).map(charmId).filter(Boolean));
  const pool=TRINKETS.filter(function(charm){return !held.has(charm.id);});
  const rng=mulberry(fightSeed(seed,nodeId,'charm'));
  const offers=[];
  const take=function(filter){
    const candidates=pool.filter(function(charm){return offers.indexOf(charm)<0&&(!filter||filter(charm));});
    if(!candidates.length)return;
    offers.push(candidates[Math.floor(rng()*candidates.length)]);
  };
  const top=commonBoardCategory(board);
  if(top)take(function(charm){return charm.tag===top;});
  take(function(charm){return charm.tag==='neutral';});
  while(offers.length<4&&offers.length<pool.length)take(null);
  for(let i=offers.length-1;i>0;i--){
    const j=Math.floor(rng()*(i+1));
    const t=offers[i];offers[i]=offers[j];offers[j]=t;
  }
  return offers.map(function(charm){return charm.id;});
}

export function attachCharmCheckpoint(plan,node,seed,board,owned){
  if(isCharmCheckpoint(node)&&!plan.choice){
    plan.choice='charm';
    plan.choiceOptions=charmOffers(seed,node.id,board,owned);
  }
  return plan;
}

/* Merchant Prince kept its original income:3 modifier after the route removed
   rounds. In The Long Bazaar that income lands after a combat victory, beside
   charged ware and relic income. */
export function charmVictoryIncome(charms){
  return (charms||[]).reduce(function(sum,charm){
    const id=charmId(charm),d=TRINKETS.find(function(t){return t.id===id;})||charm;
    return sum+((d&&d.mod&&d.mod.income)||0);
  },0);
}
