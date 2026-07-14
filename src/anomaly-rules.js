"use strict";
/* Pure market and route math for the global Omen. Combat-specific rules stay
   on fight sides, while every draft call site shares these helpers so cost,
   capacity, and preview text cannot disagree. */
import {COST,SELLV,ENCH_PREMIUM} from './data.js';

export function wareSlotCost(size,anomaly){
  const overrides=anomaly&&anomaly.sizeCostOverride;
  return overrides&&overrides[size]!==undefined?overrides[size]:size;
}
export function boardUsedCells(board,anomaly){
  return (board||[]).reduce(function(sum,item){return sum+wareSlotCost(item.size,anomaly);},0);
}
export function boardSlotCount(tier,anomaly){
  return Math.max(4,4+tier+((anomaly&&anomaly.slotCountFlat)||0));
}
export function warePurchaseCost(size,enchanted,anomaly){
  return COST[size]+(enchanted?ENCH_PREMIUM:0)+((anomaly&&anomaly.shopItemCostFlat)||0);
}
export function wareSaleValue(size,anomaly){
  return anomaly&&anomaly.sellReturnsBaseCost?COST[size]:SELLV[size];
}
export function rerollPrice(anomaly,sales){
  const base=anomaly&&anomaly.rerollCost||1;
  return base+((anomaly&&anomaly.rerollCostPerSaleThisMarket)||0)*(sales||0);
}
export function adjustedStormAt(base,anomaly){
  return Math.max(6000,base+((anomaly&&anomaly.stormStartOffsetMs)||0));
}
export function adjustedVictoryIncome(base,anomaly){
  return Math.floor((base||0)*((anomaly&&anomaly.goldMul)||1));
}
export function advanceFrozenOffers(offers,legacyFrozen){
  const explicit=(offers||[]).some(function(w){return (w.hold||0)>0;});
  const kept=(offers||[]).filter(function(w){
    return !w.free&&!w.bought&&((w.hold||0)>0||(legacyFrozen&&!explicit));
  });
  kept.forEach(function(w){if(w.hold>0)w.hold--;});
  return {offers:kept,active:kept.some(function(w){return w.hold>0;})};
}
export function setFrozenOffers(offers,duration){
  (offers||[]).forEach(function(w){if(!w.free&&!w.bought)w.hold=duration;});
}
export function thawOffers(offers){(offers||[]).forEach(function(w){w.hold=0;});}
