"use strict";
/* The two live market cores, extracted verbatim from ui.js for 0.101.0 (the
   Codex-approved live-market seam, seam-proposal-live-market-0.101.0.md).
   Pure and DOM-free: every former G read is a ctx parameter, every side effect
   (offer-id allocation, forged-iid stamping and its fusion metric, toasts,
   sounds) stays in the caller through the hooks object, invoked at EXACTLY the
   original call sites so allocation order, rng draw order and count, enchant
   draws, freeze carryover, and rollIndex replay are unchanged byte for byte.
   ui.js rollShop and fuseWithVault are thin wrappers around these; the market
   simulator drives the same functions headless. One implementation, two
   callers, zero reimplementation. */
import {ITEMS,ENCH,ENCH_CHANCE,shopTagWeight} from './data.js';
import {gateOK,fuseNeed,fuseScan} from './engine.js';
import {advanceFrozenOffers} from './anomaly-rules.js';
import {runWareAllowed} from './unlock-profile.js';

/* The exact rollShop candidate filter (formerly inline in ui.js rollShop):
   tier gate, no uniques, signature wares only for their own hero, income wares
   excluded from route shops, and the per-run frozen unlock verdict through the
   REAL runWareAllowed (run.wareLock snapshot when the run carries one, live
   profile verdict otherwise, full pool for a legacy run). */
export function shopCandidateIds(ctx){
  return Object.keys(ITEMS).filter(function(id){
    return gateOK(ITEMS[id].tier,ctx.tier)&&!ITEMS[id].unique
      &&(!ITEMS[id].sig||ITEMS[id].sig===ctx.heroId)
      &&(ctx.mode!=='route'||!ITEMS[id].inc)
      &&runWareAllowed(ctx.storage,ctx.run,id);
  });
}

/* The exact per-slot weight ladder: tier base 8/7/6, times the real
   shopTagWeight (featured 2.2, hero 1.5), times 1.6 when the board holds one
   or two bronze copies of the id (the triple-completion pull). */
export function shopWeights(ids,ctx){
  let tot=0;
  const ws=ids.map(function(id){
    const d=ITEMS[id];
    let w=d.tier===1?8:(d.tier===2?7:6);
    w*=shopTagWeight(d.cat,ctx.featuredTags,ctx.heroTag);
    const own=(ctx.board||[]).filter(function(x){return x.id===id&&x.rarity===0;}).length;
    if(own===1||own===2)w*=1.6;
    tot+=w;return w;
  });
  return {ws:ws,tot:tot};
}

/* The extracted rollShop body. ctx: {tier, heroId, heroTag, featuredTags,
   board, mode, storage, run, A, threat, priorShop, frozen}. rng: the caller's
   stream (ui.js passes G.rng, seeded per market roll from
   mulberry(fightSeed(seed, nodeId, rollIndex))). hooks.mkOffer is called once
   per NEW offer at the exact point ui.js called mkOffer, so offer-id
   allocation order is unchanged; carryover offers keep their existing ids.
   Draw order per slot, unchanged: one weighted pick; then, only when
   threat>=4, one enchant-chance draw; then, only when the chance hits and an
   eligible enchant exists, one enchant pick. Returns the assembled shop
   (frozen carryover, then the new offers, then the free bounty cards) and the
   advanced freeze state. */
export function rollShopOffers(ctx,rng,hooks){
  const mk=(hooks&&hooks.mkOffer)||function(o){return o;};
  const freeKeep=ctx.priorShop?ctx.priorShop.filter(function(w){return w.free&&!w.bought;}):[];
  const frozen=advanceFrozenOffers(ctx.priorShop,ctx.frozen),frozenKeep=frozen.offers;
  const n=Math.max(0,ctx.A.shopN-frozenKeep.length);
  const ids=shopCandidateIds(ctx);
  const out=[];
  for(let k=0;k<n;k++){
    const weighted=shopWeights(ids,ctx),ws=weighted.ws,tot=weighted.tot;
    let r=rng()*tot,pick=ids[0];
    for(let i=0;i<ids.length;i++){r-=ws[i];if(r<=0){pick=ids[i];break;}}
    let ench=null;
    /* no enchanted wares in the Back Alleys (early Threat): early gold is
       too tight to ever afford the premium */
    if(ctx.threat>=4&&rng()<ENCH_CHANCE){
      const d2=ITEMS[pick];
      const opts=Object.keys(ENCH).filter(function(e){
        const req=ENCH[e].need;
        return !req||(req==='dmg'?!!(d2.fx&&d2.fx.dmg):d2.cd>0);
      });
      if(opts.length){ench=opts[Math.floor(rng()*opts.length)];}
    }
    out.push(mk({id:pick,free:false,bought:false,ench:ench}));
  }
  return {offers:frozenKeep.concat(out).concat(freeKeep),frozenActive:frozen.active};
}

/* The extracted fuseWithVault body: pull vault copies through to complete a
   forge, fuse, spill overflow back to the vault, repeat to fixpoint. Mutates
   board and vault exactly as ui.js did. hooks.stampForged(forged) is called
   right after every fuse pass at the exact former fuseStamp site (ui.js
   stamps iids, emits the fusion metric, toasts, and plays the forge sting
   there; the simulator records fusion events); hooks.onOverflow(item) is the
   former vault-wait toast site. The vault cap is the literal 3 the original
   carried (the L9 locked shelf constrains vault UI actions, not this spill,
   and the extraction changes no behavior). */
export function pullVaultForges(board,vault,opts,hooks){
  const usedCells=opts.usedCells,slots=opts.slots;
  let forgedAny=false,guard=0;
  while(guard++<8){
    let pulled=false;
    for(const it of board.slice()){
      if(it.rarity>=3)continue;
      const need=fuseNeed(it.rarity);
      const onB=board.filter(function(x){return x.id===it.id&&x.rarity===it.rarity;}).length;
      const inV=vault.filter(function(x){return x.id===it.id&&x.rarity===it.rarity;}).length;
      if(onB>=need||onB+inV<need)continue;
      for(let k=0;k<need-onB;k++){
        const vi=vault.findIndex(function(x){return x.id===it.id&&x.rarity===it.rarity;});
        board.push(vault.splice(vi,1)[0]);
      }
      pulled=true;
    }
    const forged=fuseScan(board);
    if(hooks&&hooks.stampForged)hooks.stampForged(forged);
    if(forged.length)forgedAny=true;
    if(!pulled&&!forged.length)break;
  }
  while(usedCells(board)>slots&&vault.length<3){
    const last=board.pop();vault.push(last);
    if(hooks&&hooks.onOverflow)hooks.onOverflow(last);
  }
  return forgedAny;
}
