"use strict";
/* Pure reward planning for a monster bounty. Given the bounty and the
   fight-scoped inputs, compute exactly what a win pays: gold (base + bounty,
   gilded doubling, Pilfer drain, a minimum floor), free ware ids, an income
   relic, a Fusion Mote target, and whether an async gild or pick-unique choice
   is still owed. The caller applies the plan and drives the choice UI; a later
   R4 commit makes that application idempotent with transaction receipts. */
import {ITEMS} from './data.js';

export function planReward(bounty, ctx){
  const b = bounty || {};
  let gold = ctx.baseGold || 0;
  let drained = 0;
  if(b.gold){
    const purse = b.gold * (ctx.gilded ? 2 : 1);
    drained = b.drain ? Math.min(ctx.pocketed || 0, purse) : 0;
    gold += purse - drained;
  }
  if(gold < (ctx.minGold || 0)) gold = ctx.minGold || 0;
  const items = b.items ? b.items.slice() : [];
  const relic = (b.relic && (ctx.enteredGold || 0) >= 8) ? 1 : 0;
  let mote = null;
  if(b.mote){
    /* the mote copies your commonest bronze, non-unique ware; with none to copy
       it pays a little gold instead */
    const counts = {};
    (ctx.board || []).forEach(function(it){
      if(it.rarity === 0 && ITEMS[it.id] && !ITEMS[it.id].unique) counts[it.id] = (counts[it.id] || 0) + 1;
    });
    let best = null;
    Object.keys(counts).forEach(function(id){ if(best === null || counts[id] > counts[best]) best = id; });
    mote = best ? {item: best} : {gold: 3};
  }
  const choice = b.gild ? 'gild' : (b.pickUnique ? 'pickUnique' : null);
  return {gold: gold, drained: drained, items: items, relic: relic, mote: mote, choice: choice};
}
