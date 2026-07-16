"use strict";
/* The reward mini-flow, as a pure state machine over the run aggregate (R4
   commit 4, Option B). It owns exactly this durable sequence:

     reward owed -> fixed committed -> choice pending -> choice committed -> next

   The fixed part (gold, free offers, relic, mote) applies exactly once per node,
   guarded by a receipt keyed on the run, node, and attempt. An owed gild or
   unique or Charm choice is serialized into run.pendingChoice so a reload reopens it; the
   choice also applies exactly once. Every function here is pure over the run
   object (no DOM, no timers), so the whole flow is unit-testable. The caller
   (ui.js, commit 4b) checkpoints AFTER each transaction and only then presents.

   Ordering the caller must honor: apply fixed -> set receipt + pendingChoice ->
   checkpoint -> open overlay or present. Nothing visible before the checkpoint. */
import {ITEMS,TRINKETS} from './data.js';
import {allocId} from './route-run.js';
import {mulberry} from './engine.js';
import {fightSeed} from './route.js';

export const MIDPOINT_FALLBACK_GOLD = 10;

/* one receipt per reward; the pendingChoice references this key */
export function rewardKey(runId, nodeId, attempt){
  return runId + ':reward:' + nodeId + ':' + (attempt || 0);
}

/* Long mode's midpoint pivot owns a separate receipt from the D3 boss reward.
   The stable key lets restore and presentation code call the ensure seam freely
   without ever re-rolling, re-offering, or re-paying it. */
export function midpointTreasureKey(runId){
  return runId + ':midpoint:d3boss';
}

function makeOffer(run, id){
  return {id: id, free: true, bought: false, offerId: allocId(run)};
}

/* eligible gild targets: non-Diamond board wares, identified by iid with the
   rarity recorded so a resumed option still means what was originally offered */
export function gildOptions(board){
  return (board || []).filter(function(it){ return it.rarity < 3; })
    .map(function(it){ return {iid: it.iid, rarity: it.rarity}; });
}

/* unique wares not already owned on the board, in the VAULT, or waiting unbought
   in the shop (the old openUniquePick missed the vault, offering a vaulted one) */
export function uniqueOptions(board, vault, shop){
  const owned = {};
  (board || []).forEach(function(it){ owned[it.id] = true; });
  (vault || []).forEach(function(it){ owned[it.id] = true; });
  (shop || []).forEach(function(w){ if(!w.bought) owned[w.id] = true; });
  return Object.keys(ITEMS).filter(function(id){ return ITEMS[id].unique && !owned[id]; });
}

/* Grant one fixed free ware after rechecking the live ownership surfaces. Map
   Treasure is rolled earlier, so a unique can become stale before the player
   reaches it. A stale unique pays the same 3 gold used by duplicate bounties
   instead of creating an illegal second copy. */
export function grantFreeOffer(run,id){
  const item=ITEMS[id],E=run&&run.economy;
  if(!item||!E)return {ok:false,reason:'unknown ware'};
  if(item.unique&&uniqueOptions(E.board,E.vault,E.shop).indexOf(id)<0){
    E.gold+=3;
    return {ok:false,reason:'duplicate unique',duplicateGold:3,id:id};
  }
  const offer=makeOffer(run,id);
  E.shop.push(offer);
  return {ok:true,offer:offer};
}

function midpointPool(run){
  return uniqueOptions(run.economy.board,run.economy.vault,run.economy.shop)
    .filter(function(id){return ITEMS[id].acquisition==='treasure';})
    .sort();
}

/* The three midpoint offers are deterministic from only the durable run seed
   and the named D3 boundary. The sorted base pool makes object declaration
   order irrelevant before the seeded shuffle. */
export function midpointTreasureOptions(run){
  const pool=midpointPool(run);
  const rng=mulberry(fightSeed(run.seed,'d3boss','midpoint'));
  for(let i=pool.length-1;i>0;i--){
    const j=Math.floor(rng()*(i+1));
    const t=pool[i];pool[i]=pool[j];pool[j]=t;
  }
  return pool.slice(0,3);
}

function atMidpointBoundary(run){
  const route=run&&run.route;
  return !!(run&&run.routeMode==='long'&&route&&route.phase==='map'&&!route.pendingId&&
    route.path&&route.path[route.path.length-1]==='d3boss');
}

/* Open Long mode's one-time midpoint Treasure choice at the exact D3 to D4
   boundary. A different owed reward choice wins and must be resolved first.
   Returns the dedicated receipt when this boundary owns one, otherwise null. */
export function ensureMidpointTreasure(run){
  if(!atMidpointBoundary(run))return null;
  const key=midpointTreasureKey(run.runId);
  const existing=run.receipts&&run.receipts[key];
  if(existing)return existing;
  if(run.pendingChoice)return null;
  if(!run.receipts)run.receipts={};
  const offeredIds=midpointTreasureOptions(run);
  const receipt={kind:'midpointTreasure',fixedApplied:true,choiceRequired:offeredIds.length>0,
    choiceApplied:offeredIds.length===0,choiceKind:'midpointTreasure',offeredIds:offeredIds.slice(),
    selectedId:null,fallbackGold:MIDPOINT_FALLBACK_GOLD,fallbackApplied:offeredIds.length===0};
  run.receipts[key]=receipt;
  if(offeredIds.length){
    run.pendingChoice={key:key,kind:'midpointTreasure',options:offeredIds.slice(),fallbackGold:MIDPOINT_FALLBACK_GOLD};
  }else{
    run.economy.gold+=MIDPOINT_FALLBACK_GOLD;
    run.pendingChoice=null;
  }
  return receipt;
}

function choiceFallbackGold(kind){ return kind === 'gild' ? 5 : (kind === 'pickUnique' ? 10 : 0); }

function charmIds(charms){
  return (charms||[]).map(function(charm){return typeof charm==='string'?charm:charm&&charm.id;}).filter(Boolean);
}

export function charmChoiceOptions(charms,offered){
  const held=new Set(charmIds(charms));
  const valid=new Set(TRINKETS.map(function(charm){return charm.id;}));
  return (offered||[]).filter(function(id,i,list){return valid.has(id)&&!held.has(id)&&list.indexOf(id)===i;});
}

/* apply the fixed reward exactly once and derive any owed choice. Idempotent by
   key: a second call (after a reload that re-enters settlement) is a no-op on the
   economy. Mutates run.economy / run.receipts / run.pendingChoice; returns the
   receipt. The caller checkpoints after this, before presenting anything. */
export function settleFixed(run, plan, key, options){
  const existing = run.receipts[key];
  if(existing && existing.fixedApplied) return existing;
  const E = run.economy;
  const goldBefore=E.gold;
  E.gold += plan.gold;
  let debtPaid=0,debtDamage=0;
  if(options&&options.debtLobbyDamage&&goldBefore<0){
    debtPaid=Math.min(-goldBefore,Math.max(0,plan.gold));
    if(E.gold<0){
      const unpaid=-E.gold;debtDamage=unpaid*options.debtLobbyDamage;E.gold=0;
      run.route.resolve-=debtDamage;
      if(run.route.resolve<=0){run.route.phase='lost';}
    }
  }
  const grantedItemIds=[],duplicateUniqueIds=[];
  let duplicateUniqueGold=0;
  plan.items.forEach(function(id){
    const item=ITEMS[id];
    const available=!item||!item.unique||uniqueOptions(E.board,E.vault,E.shop).indexOf(id)>=0;
    if(available){E.shop.push(makeOffer(run,id));grantedItemIds.push(id);}
    else{E.gold+=3;duplicateUniqueGold+=3;duplicateUniqueIds.push(id);}
  });
  if(plan.relic) E.relicIncome += 1;
  if(plan.mote){
    if(plan.mote.item) E.shop.push(makeOffer(run, plan.mote.item));
    else E.gold += plan.mote.gold;
  }
  const receipt = {fixedApplied: true, choiceRequired: !!plan.choice, choiceApplied: false, choiceKind: plan.choice || null,
    debtPaid:debtPaid,debtDamage:debtDamage,grantedItemIds:grantedItemIds,
    duplicateUniqueIds:duplicateUniqueIds,duplicateUniqueGold:duplicateUniqueGold};
  run.receipts[key] = receipt;
  if(plan.choice){
    const opts = plan.choice === 'gild'
      ? gildOptions(E.board)
      : plan.choice === 'charm'
        ? charmChoiceOptions(E.trinkets,plan.choiceOptions)
        : uniqueOptions(E.board, E.vault, E.shop);
    if(opts.length){
      run.pendingChoice = {key: key, kind: plan.choice, options: opts, fallbackGold: choiceFallbackGold(plan.choice)};
    }else{
      /* nothing to choose: pay the fallback and close the choice in this same
         transaction so an empty overlay is never serialized */
      E.gold += choiceFallbackGold(plan.choice);
      receipt.choiceApplied = true;
      receipt.fallbackApplied = true;
      run.pendingChoice = null;
    }
  }else{
    receipt.choiceApplied = true;
    run.pendingChoice = null;
  }
  return receipt;
}

/* apply a gild choice (rarity++ on the chosen ware); the caller runs the fusion
   cascade and checkpoints. Rejects a target that is no longer offered or valid,
   so a stale click never gilds the wrong ware. */
export function chooseGild(run, iid){
  const pc = run.pendingChoice;
  if(!pc || pc.kind !== 'gild') return {ok: false, reason: 'no gild pending'};
  if(!pc.options.some(function(o){ return o.iid === iid; })) return {ok: false, reason: 'not offered'};
  const ware = run.economy.board.filter(function(w){ return w.iid === iid; })[0];
  if(!ware || ware.rarity >= 3) return {ok: false, reason: 'target gone or maxed'};
  ware.rarity += 1;
  const receipt = run.receipts[pc.key];
  if(receipt){ receipt.choiceApplied = true; receipt.selectedId = iid; }
  run.pendingChoice = null;
  return {ok: true, ware: ware};
}

/* apply a pick-unique choice (a free offer of the chosen unique). Rejects one
   that is not offered or is no longer available. */
export function chooseUnique(run, uid){
  const pc = run.pendingChoice;
  if(!pc || (pc.kind !== 'pickUnique'&&pc.kind !== 'midpointTreasure')) return {ok: false, reason: 'no unique pending'};
  if(pc.options.indexOf(uid) < 0) return {ok: false, reason: 'not offered'};
  if(pc.kind==='midpointTreasure'){
    const midpointReceipt=run.receipts&&run.receipts[pc.key];
    if(run.routeMode!=='long'||pc.key!==midpointTreasureKey(run.runId)||!midpointReceipt||
       midpointReceipt.kind!=='midpointTreasure'||midpointReceipt.choiceApplied||
       !Array.isArray(midpointReceipt.offeredIds)||midpointReceipt.offeredIds.indexOf(uid)<0||
       !ITEMS[uid]||ITEMS[uid].acquisition!=='treasure'){
      return {ok:false,reason:'not midpoint treasure'};
    }
  }
  if(uniqueOptions(run.economy.board, run.economy.vault, run.economy.shop).indexOf(uid) < 0) return {ok: false, reason: 'no longer available'};
  run.economy.shop.push(makeOffer(run, uid));
  const receipt = run.receipts[pc.key];
  if(receipt){ receipt.choiceApplied = true; receipt.selectedId = uid; }
  run.pendingChoice = null;
  return {ok: true};
}

/* apply one of the serialized Charm offers. The live economy stores the data
   object, while the save codec reduces it to its id and revives it on load. */
export function chooseCharm(run,id){
  const pc=run.pendingChoice;
  if(!pc||pc.kind!=='charm')return {ok:false,reason:'no charm pending'};
  if(pc.options.indexOf(id)<0)return {ok:false,reason:'not offered'};
  if(charmChoiceOptions(run.economy.trinkets,[id]).length===0)return {ok:false,reason:'already owned'};
  const charm=TRINKETS.find(function(t){return t.id===id;});
  if(!charm)return {ok:false,reason:'unknown charm'};
  run.economy.trinkets.push(charm);
  const receipt=run.receipts[pc.key];
  if(receipt){receipt.choiceApplied=true;receipt.selectedId=id;}
  run.pendingChoice=null;
  return {ok:true,charm:charm};
}

/* re-validate a resumed pendingChoice against the current aggregate: drop stale
   options, never add new ones, and if nothing valid remains pay the fallback and
   close the choice. Returns the still-open choice, or null once resolved. */
export function refreshPendingChoice(run){
  const pc = run.pendingChoice;
  if(!pc) return null;
  let opts;
  if(pc.kind === 'gild'){
    const live = {};
    gildOptions(run.economy.board).forEach(function(o){ live[o.iid] = true; });
    opts = pc.options.filter(function(o){ return live[o.iid]; });
  }else if(pc.kind === 'charm'){
    opts=charmChoiceOptions(run.economy.trinkets,pc.options);
  }else if(pc.kind==='pickUnique'||pc.kind==='midpointTreasure'){
    const valid = uniqueOptions(run.economy.board, run.economy.vault, run.economy.shop);
    const offered=pc.kind==='midpointTreasure'&&run.receipts&&run.receipts[pc.key]&&run.receipts[pc.key].offeredIds;
    opts = pc.options.filter(function(id){
      return valid.indexOf(id)>=0&&(pc.kind!=='midpointTreasure'||(run.routeMode==='long'&&Array.isArray(offered)&&
        offered.indexOf(id)>=0&&ITEMS[id]&&ITEMS[id].acquisition==='treasure'));
    });
  }else return pc;
  if(opts.length){ pc.options = opts; return pc; }
  run.economy.gold += pc.fallbackGold||0;
  const receipt = run.receipts[pc.key];
  if(receipt){ receipt.choiceApplied = true; receipt.fallbackApplied = true; }
  run.pendingChoice = null;
  return null;
}

/* the next screen after a reward transaction, derived from the aggregate: an owed
   choice wins over everything, then a finished run shows its end, else the map.
   This is why a final-boss choice that interrupts the 'end' effect still resolves
   correctly on reload (pendingChoice first, then route.phase 'won'). */
export function nextPresentation(run){
  if(run.pendingChoice) return {kind: 'choice', choice: run.pendingChoice};
  const phase = run.route.phase;
  if(phase === 'won') return {kind: 'end', cause: 'won'};
  if(phase === 'lost') return {kind: 'end', cause: 'lost'};
  return {kind: 'map'};
}
