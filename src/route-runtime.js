"use strict";
/* The reward mini-flow, as a pure state machine over the run aggregate (R4
   commit 4, Option B). It owns exactly this durable sequence:

     reward owed -> fixed committed -> choice pending -> choice committed -> next

   The fixed part (gold, free offers, relic, mote) applies exactly once per node,
   guarded by a receipt keyed on the run, node, and attempt. An owed gild or
   unique choice is serialized into run.pendingChoice so a reload reopens it; the
   choice also applies exactly once. Every function here is pure over the run
   object (no DOM, no timers), so the whole flow is unit-testable. The caller
   (ui.js, commit 4b) checkpoints AFTER each transaction and only then presents.

   Ordering the caller must honor: apply fixed -> set receipt + pendingChoice ->
   checkpoint -> open overlay or present. Nothing visible before the checkpoint. */
import {ITEMS} from './data.js';
import {allocId} from './route-run.js';

/* one receipt per reward; the pendingChoice references this key */
export function rewardKey(runId, nodeId, attempt){
  return runId + ':reward:' + nodeId + ':' + (attempt || 0);
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

function choiceFallbackGold(kind){ return kind === 'gild' ? 5 : 10; }

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
  plan.items.forEach(function(id){ E.shop.push(makeOffer(run, id)); });
  if(plan.relic) E.relicIncome += 1;
  if(plan.mote){
    if(plan.mote.item) E.shop.push(makeOffer(run, plan.mote.item));
    else E.gold += plan.mote.gold;
  }
  const receipt = {fixedApplied: true, choiceRequired: !!plan.choice, choiceApplied: false, choiceKind: plan.choice || null,
    debtPaid:debtPaid,debtDamage:debtDamage};
  run.receipts[key] = receipt;
  if(plan.choice){
    const opts = plan.choice === 'gild'
      ? gildOptions(E.board)
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
  if(!pc || pc.kind !== 'pickUnique') return {ok: false, reason: 'no unique pending'};
  if(pc.options.indexOf(uid) < 0) return {ok: false, reason: 'not offered'};
  if(uniqueOptions(run.economy.board, run.economy.vault, run.economy.shop).indexOf(uid) < 0) return {ok: false, reason: 'no longer available'};
  run.economy.shop.push(makeOffer(run, uid));
  const receipt = run.receipts[pc.key];
  if(receipt){ receipt.choiceApplied = true; receipt.selectedId = uid; }
  run.pendingChoice = null;
  return {ok: true};
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
  }else{
    const valid = uniqueOptions(run.economy.board, run.economy.vault, run.economy.shop);
    opts = pc.options.filter(function(id){ return valid.indexOf(id) >= 0; });
  }
  if(opts.length){ pc.options = opts; return pc; }
  run.economy.gold += pc.fallbackGold;
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
