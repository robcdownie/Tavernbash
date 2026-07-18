"use strict";
/* Route decision transactions (Launch L1 0.99.3).

   A noncombat node now owns one durable receipt from presentation through
   settlement. The receipt freezes the offered choices before the card opens.
   commitRouteDecision validates that frozen offer and the live target, applies
   its payment or reward, emits the report metric, advances the route, and marks
   the receipt in one synchronous transaction. The UI checkpoints the aggregate
   before it closes the card or presents the next screen.

   A crash before that checkpoint reloads the untouched pre-choice save. A crash
   after it reloads an applied receipt and cannot charge or grant again. */
import {ITEMS,ENCH} from './data.js';
import {mulberry,gateOK} from './engine.js';
import {fightSeed,transition} from './route.js';
import {advance} from './route-run.js';
import {grantFreeOffer} from './route-runtime.js';
import {recordMetric} from './route-metrics.js';

const FRESH_STOCK_COST=3;
const WILD_FIND_EVENT='wild_find';

function copy(v){return JSON.parse(JSON.stringify(v));}
function eventRng(run,nodeId,tag){return mulberry(fightSeed(run.seed,nodeId,tag));}

export function routeDecisionKey(runId,nodeId){return runId+':decision:'+nodeId;}

function freshStockId(run,nodeId,heroId){
  const tier=run.economy.tier;
  const ids=Object.keys(ITEMS).filter(function(id){
    const d=ITEMS[id];
    return gateOK(d.tier,tier)&&!d.unique&&(!d.sig||d.sig===heroId)&&!d.inc;
  });
  if(!ids.length)return null;
  const rng=eventRng(run,nodeId,'fresh');
  return ids[Math.floor(rng()*ids.length)];
}

function choice(id,data){return Object.assign({id:id},data||{});}
function offersFor(run,node,context){
  if(node.type==='treasure'){
    const options=node.reward&&Array.isArray(node.reward.options)?node.reward.options:[{kind:'gold'}];
    return options.map(function(option,index){return choice(String(index),{
      option:copy(option),gold:option.kind==='gold'?(context.directEventGold==null?6:context.directEventGold):null
    });});
  }
  if(node.type==='rest')return [choice('mend'),choice('temper'),choice('refit')];
  if(node.type==='shrine')return [choice('ashes'),choice('trial'),choice('castoff')];
  if(node.type==='negotiation')return [
    choice('quick_sale',{gold:context.directEventGold==null?6:context.directEventGold}),
    choice('fresh_stock',{cost:FRESH_STOCK_COST,wareId:freshStockId(run,node.id,context.heroId)}),
    choice('walk_away')
  ];
  return [choice(node.type)];
}

/* Freeze the card before display. Existing receipts win, so resume and repeated
   presenter calls never regenerate an offer. */
export function ensureRouteDecision(run,node,context){
  if(!run||!node||!run.route||run.route.phase!=='event'||run.route.pendingId!==node.id){
    return {ok:false,reason:'event not pending'};
  }
  if(!run.receipts)run.receipts={};
  const key=routeDecisionKey(run.runId,node.id),existing=run.receipts[key];
  if(existing)return {ok:true,created:false,key:key,receipt:existing};
  const receipt={kind:'routeDecision',nodeId:node.id,eventKind:node.type,
    offers:offersFor(run,node,context||{}),applied:false,selectedId:null,targetIid:null,
    payment:0,reward:null};
  run.receipts[key]=receipt;
  return {ok:true,created:true,key:key,receipt:receipt};
}

export function routeDecisionReceipt(run,nodeId){
  return run&&run.receipts&&run.receipts[routeDecisionKey(run.runId,nodeId)]||null;
}

export function routeDecisionChoice(receipt,id){
  return receipt&&receipt.offers&&receipt.offers.filter(function(o){return o.id===String(id);})[0]||null;
}

export function routeDecisionTargetOptions(run,receipt,choiceId){
  const picked=routeDecisionChoice(receipt,choiceId);
  if(!picked)return [];
  const gild=receipt.eventKind==='treasure'&&picked.option&&picked.option.kind==='silver'||
    receipt.eventKind==='shrine'&&picked.id==='trial';
  const castoff=receipt.eventKind==='shrine'&&picked.id==='castoff';
  if(!gild&&!castoff)return [];
  return (run.economy.board||[]).map(function(w){return {iid:w.iid,eligible:castoff||w.rarity<3};});
}

function compatible(item,ench){
  const d=ITEMS[item.id],e=ENCH[ench];
  if(!d||!e)return false;
  return !e.need||(e.need==='dmg'?!!(d.fx&&d.fx.dmg):d.cd>0);
}

function grantEnchant(run,nodeId,fixedEnch){
  const board=run.economy.board;
  for(let i=0;i<board.length;i++){
    const item=board[i];if(item.ench)continue;
    const opts=fixedEnch?(compatible(item,fixedEnch)?[fixedEnch]:[]):Object.keys(ENCH).filter(function(e){return compatible(item,e);});
    if(opts.length){
      const rng=eventRng(run,nodeId,'temper');
      const ench=opts.length===1?opts[0]:opts[Math.floor(rng()*opts.length)];
      item.ench=ench;
      return {kind:'enchant',iid:item.iid,ench:ench,toast:ENCH[ench].n+' etched onto '+ITEMS[item.id].n};
    }
  }
  run.economy.gold+=4;
  return {kind:'gold',gold:4,toast:(fixedEnch?'No ware fits '+ENCH[fixedEnch].n+'. ':'No ware to enchant. ')+'4 gold instead.'};
}

function grantWare(run,id,source){
  if(!id){run.economy.gold+=4;return {kind:'gold',gold:4,toast:'No ware fits. 4 gold instead.'};}
  const result=grantFreeOffer(run,id);
  if(!result.ok&&result.reason==='duplicate unique'){
    recordMetric(run.metrics,'treasure_duplicate_unique',{id:id,gold:result.duplicateGold});
    return {kind:'duplicate_unique',id:id,gold:result.duplicateGold,
      toast:'You already own '+ITEMS[id].n+'. '+result.duplicateGold+' gold instead.'};
  }
  if(!result.ok)return {kind:'none',toast:null};
  recordMetric(run.metrics,WILD_FIND_EVENT,{id:id,source:source});
  return {kind:'ware',id:id,offerId:result.offer.offerId,toast:'A free '+ITEMS[id].n+' waits at the next market.'};
}

function targetWare(run,targetIid){
  return (run.economy.board||[]).filter(function(w){return w.iid===targetIid;})[0]||null;
}

function reportData(receipt,picked,resolveDelta){
  if(receipt.eventKind==='treasure')return {nodeId:receipt.nodeId,kind:'treasure',choice:copy(picked.option),
    offers:receipt.offers.map(function(o){return copy(o.option);})};
  if(receipt.eventKind==='negotiation')return {nodeId:receipt.nodeId,kind:'nego',resolveDelta:0,outcome:picked.id};
  return {nodeId:receipt.nodeId,kind:picked.id,resolveDelta:resolveDelta||0};
}

function routeOutcome(receipt,picked){
  if(receipt.eventKind==='treasure')return 'treasure';
  if(receipt.eventKind==='negotiation')return 'nego';
  return picked.id;
}

/* Commit one frozen choice. The caller supplies a target iid only for Gilding,
   Trial by Flame, or Cast Off the Old. beforeAdvance is the one ordered hook:
   the existing fusion cascade runs there after a gild mutation and before the
   controller metric, matching the historical report order. */
export function commitRouteDecision(run,map,nodeId,choiceId,targetIid,now,beforeAdvance){
  const receipt=routeDecisionReceipt(run,nodeId);
  if(!receipt)return {ok:false,reason:'decision not prepared'};
  if(receipt.applied)return {ok:true,duplicate:true,receipt:receipt,effects:[]};
  if(!run.route||run.route.phase!=='event'||run.route.pendingId!==nodeId)return {ok:false,reason:'event not pending'};
  const picked=routeDecisionChoice(receipt,choiceId);
  if(!picked)return {ok:false,reason:'choice not offered'};

  const E=run.economy;
  const isSilver=receipt.eventKind==='treasure'&&picked.option&&picked.option.kind==='silver';
  const isTrial=receipt.eventKind==='shrine'&&picked.id==='trial';
  const isCastoff=receipt.eventKind==='shrine'&&picked.id==='castoff';
  const target=(isSilver||isTrial||isCastoff)?targetWare(run,targetIid):null;
  if((isSilver||isTrial)&&E.board.length&&(!target||target.rarity>=3))return {ok:false,reason:'gild target invalid'};
  if(isCastoff&&!target)return {ok:false,reason:'castoff target invalid'};
  if(receipt.eventKind==='negotiation'&&picked.id==='fresh_stock'&&E.gold<picked.cost){
    return {ok:false,reason:'not enough gold'};
  }

  const resolveDelta=receipt.eventKind==='rest'&&picked.id==='mend'?8:
    receipt.eventKind==='shrine'&&picked.id==='ashes'?12:isTrial?-6:0;
  const action={type:'resolveEvent',resolveDelta:resolveDelta,outcome:routeOutcome(receipt,picked)};
  transition(run.route,map,action); /* validate before any economy mutation */
  const report=reportData(receipt,picked,resolveDelta);
  if(receipt.eventKind==='treasure')recordMetric(run.metrics,'event_choice',report,now);

  let reward={kind:'none'},needsFusion=false;
  if(receipt.eventKind==='treasure'){
    const option=picked.option||{kind:'gold'};
    if(option.kind==='ware')reward=grantWare(run,option.id,'treasure');
    else if(option.kind==='enchant')reward=grantEnchant(run,nodeId,option.ench);
    else if(option.kind==='silver'){
      if(target){
        target.rarity++;needsFusion=true;
        reward={kind:'gild',iid:target.iid,id:target.id,rarity:target.rarity,
          toast:'Gilded: '+['Bronze','Silver','Gold','Diamond'][target.rarity]+' '+ITEMS[target.id].n};
      }else{E.gold+=5;reward={kind:'gold',gold:5,toast:'No wares to gild. 5 gold instead.'};}
    }else{
      const gold=picked.gold==null?6:picked.gold;E.gold+=gold;
      reward={kind:'gold',gold:gold,toast:gold+' gold.'};
    }
  }else if(receipt.eventKind==='rest'){
    if(picked.id==='mend')reward={kind:'resolve',resolve:8,toast:'You make camp. +8 Resolve.'};
    else if(picked.id==='temper')reward=grantEnchant(run,nodeId,null);
    else if(picked.id==='refit'){
      E.tierCost=Math.max(1,E.tierCost-4);E.freeReroll=true;
      reward={kind:'refit',toast:'Refit: a cheaper tier and a free reroll.'};
    }
  }else if(receipt.eventKind==='shrine'){
    if(picked.id==='ashes')reward={kind:'resolve',resolve:12,toast:'The Quqnus renews you. +12 Resolve.'};
    else if(picked.id==='trial'){
      if(target){
        target.rarity++;needsFusion=true;
        reward={kind:'gild',iid:target.iid,id:target.id,rarity:target.rarity,
          toast:'Gilded: '+['Bronze','Silver','Gold','Diamond'][target.rarity]+' '+ITEMS[target.id].n};
      }else{E.gold+=5;reward={kind:'gold',gold:5,toast:'No wares to gild. 5 gold instead.'};}
    }else if(picked.id==='castoff'){
      const index=E.board.indexOf(target);E.board.splice(index,1);E.gold+=8;E.tierCost=1;
      reward={kind:'castoff',iid:target.iid,id:target.id,gold:8,toast:'Cast off. +8 gold, next tier costs 1.'};
    }
  }else if(receipt.eventKind==='negotiation'){
    if(picked.id==='quick_sale'){
      E.gold+=picked.gold;reward={kind:'gold',gold:picked.gold,toast:'+'+picked.gold+' gold.'};
    }else if(picked.id==='fresh_stock'){
      E.gold-=picked.cost;receipt.payment=picked.cost;
      reward=grantWare(run,picked.wareId,'treasure');
    }
  }

  if(receipt.eventKind!=='treasure')recordMetric(run.metrics,'event_choice',report,now);
  if(beforeAdvance)beforeAdvance({reward:reward,needsFusion:needsFusion});
  const effects=advance(run,map,action);
  receipt.applied=true;receipt.selectedId=picked.id;receipt.targetIid=targetIid==null?null:targetIid;
  receipt.reward=reward;
  return {ok:true,duplicate:false,receipt:receipt,effects:effects,reward:reward,needsFusion:needsFusion};
}
