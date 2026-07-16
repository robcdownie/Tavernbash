import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ITEMS,TRINKETS} from '../src/data.js';
import {newRun, serializeRun, reviveRun} from '../src/route-run.js';
import {rewardKey, midpointTreasureKey, midpointTreasureOptions, ensureMidpointTreasure, MIDPOINT_FALLBACK_GOLD,
  gildOptions, uniqueOptions, grantFreeOffer, charmChoiceOptions, settleFixed, chooseGild, chooseUnique, chooseCharm,
  refreshPendingChoice, nextPresentation} from '../src/route-runtime.js';

const SEED = 1234567;
const someUnique = Object.keys(ITEMS).find(id => ITEMS[id].unique);
/* a plain plan in the shape route-rewards.planReward returns */
function plan(over){ return Object.assign({gold: 0, drained: 0, items: [], relic: false, mote: null, choice: null}, over); }
function midpointRun(seed=SEED){
  const run=newRun({seed:seed,routeMode:'long'});
  run.route.path=['d3boss'];run.route.pendingId=null;run.route.phase='map';
  return run;
}

test('rewardKey ties a receipt to run, node, and attempt', () => {
  assert.equal(rewardKey('rABC', 'd1c1l0', 2), 'rABC:reward:d1c1l0:2');
  assert.notEqual(rewardKey('rABC', 'n', 0), rewardKey('rABC', 'n', 1), 'a boss retry gets its own key');
});

test('gildOptions offers non-Diamond board wares by iid with their rarity', () => {
  const board = [{id:'a', iid:1, rarity:0}, {id:'b', iid:2, rarity:3}, {id:'c', iid:3, rarity:2}];
  assert.deepEqual(gildOptions(board), [{iid:1, rarity:0}, {iid:3, rarity:2}]);
});

test('uniqueOptions excludes uniques owned on board, in vault, or unbought in shop', () => {
  const all = uniqueOptions([], [], []);
  assert.ok(all.includes(someUnique));
  assert.ok(!uniqueOptions([{id:someUnique}], [], []).includes(someUnique), 'board excludes');
  assert.ok(!uniqueOptions([], [{id:someUnique}], []).includes(someUnique), 'vault excludes (the old bug)');
  assert.ok(!uniqueOptions([], [], [{id:someUnique, bought:false}]).includes(someUnique), 'unbought shop excludes');
  assert.ok(uniqueOptions([], [], [{id:someUnique, bought:true}]).includes(someUnique), 'a bought offer does not exclude');
});

test('a stale fixed Treasure unique pays 3 gold instead of granting a duplicate',()=>{
  const id=Object.keys(ITEMS).find(uid=>ITEMS[uid].unique&&ITEMS[uid].acquisition==='treasure');
  const surfaces=[
    run=>{run.economy.board.push({id:id,iid:1,rarity:0});},
    run=>{run.economy.vault.push({id:id,iid:1,rarity:0});},
    run=>{run.economy.shop.push({id:id,offerId:1,free:true,bought:false});}
  ];
  for(const own of surfaces){
    const run=newRun({seed:SEED});run.economy.gold=0;own(run);
    const before=run.economy.shop.length,next=run.ids.nextItem;
    assert.deepEqual(grantFreeOffer(run,id),{ok:false,reason:'duplicate unique',duplicateGold:3,id:id});
    assert.equal(run.economy.gold,3);
    assert.equal(run.economy.shop.length,before,'no duplicate offer is added');
    assert.equal(run.ids.nextItem,next,'a rejected grant consumes no durable id');
  }
});

test('a fixed Treasure ware grants one stamped free offer when it is available',()=>{
  const id=Object.keys(ITEMS).find(uid=>ITEMS[uid].unique&&ITEMS[uid].acquisition==='treasure');
  const run=newRun({seed:SEED}),result=grantFreeOffer(run,id);
  assert.equal(result.ok,true);
  assert.deepEqual(result.offer,{id:id,free:true,bought:false,offerId:1});
  assert.equal(run.economy.shop[0],result.offer);
  assert.equal(run.ids.nextItem,2);
});

test('settleFixed applies gold, offers, relic, and mote once, and is idempotent', () => {
  const run = newRun({seed: SEED});
  run.economy.gold = 0;   /* newEconomy starts at 6; isolate the reward math */
  const key = rewardKey(run.runId, 'n1', 0);
  const r1 = settleFixed(run, plan({gold: 5, items: ['torch'], relic: true, mote: {item: 'dagger'}}), key);
  assert.equal(run.economy.gold, 5);
  assert.equal(run.economy.relicIncome, 1);
  assert.equal(run.economy.shop.length, 2, 'the bounty ware and the mote copy');
  assert.ok(run.economy.shop.every(o => Number.isInteger(o.offerId)), 'offers got ids');
  assert.equal(r1.fixedApplied, true);
  assert.equal(r1.choiceApplied, true, 'no choice owed, so closed');
  assert.deepEqual(r1.grantedItemIds, ['torch']);
  assert.deepEqual(r1.duplicateUniqueIds, []);
  assert.equal(r1.duplicateUniqueGold, 0);
  const nextItemAfter = run.ids.nextItem;
  settleFixed(run, plan({gold: 5, items: ['torch'], relic: true, mote: {item: 'dagger'}}), key);
  assert.equal(run.economy.gold, 5, 'second call does not re-pay');
  assert.equal(run.economy.shop.length, 2, 'and does not re-add offers');
  assert.equal(run.ids.nextItem, nextItemAfter, 'and allocates no new ids');
});

test('settleFixed with a mote fallback pays gold when nothing bronze to copy', () => {
  const run = newRun({seed: SEED});
  run.economy.gold = 0;
  settleFixed(run, plan({gold: 3, mote: {gold: 3}}), rewardKey(run.runId, 'n', 0));
  assert.equal(run.economy.gold, 6);
});

test('duplicate unique bounties pay 3 gold across board, vault, and waiting shop exactly once',()=>{
  const cases=[
    run=>{run.economy.board=[{id:'serpentcrown',iid:1,rarity:0}];},
    run=>{run.economy.vault=[{id:'serpentcrown',iid:1,rarity:0}];},
    run=>{run.economy.shop=[{id:'serpentcrown',offerId:1,bought:false}];run.ids.nextItem=2;}
  ];
  for(const setup of cases){
    const run=newRun({seed:SEED});run.economy.gold=0;setup(run);
    const before=run.economy.shop.length,key=rewardKey(run.runId,'repeat',0);
    const receipt=settleFixed(run,plan({items:['serpentcrown']}),key);
    assert.equal(run.economy.gold,3);
    assert.equal(run.economy.shop.length,before,'no duplicate free offer');
    assert.deepEqual(receipt.grantedItemIds,[]);
    assert.deepEqual(receipt.duplicateUniqueIds,['serpentcrown']);
    assert.equal(receipt.duplicateUniqueGold,3);
    settleFixed(run,plan({items:['serpentcrown']}),key);
    assert.equal(run.economy.gold,3,'receipt blocks a second fallback');
  }
});

test('a mixed bounty receipt separates granted wares from duplicate unique cash',()=>{
  const run=newRun({seed:SEED});run.economy.gold=0;
  run.economy.vault=[{id:'serpentcrown',iid:1,rarity:0}];run.ids.nextItem=2;
  const receipt=settleFixed(run,plan({items:['torch','serpentcrown','vial']}),rewardKey(run.runId,'mixed',0));
  assert.deepEqual(receipt.grantedItemIds,['torch','vial']);
  assert.deepEqual(receipt.duplicateUniqueIds,['serpentcrown']);
  assert.equal(receipt.duplicateUniqueGold,3);
  assert.deepEqual(run.economy.shop.map(o=>o.id),['torch','vial']);
  assert.equal(run.economy.gold,3);
});

test('a sold unique bounty is reacquirable as a free offer',()=>{
  const run=newRun({seed:SEED});run.economy.gold=0;
  run.economy.shop=[{id:'serpentcrown',offerId:1,bought:true}];run.ids.nextItem=2;
  const receipt=settleFixed(run,plan({items:['serpentcrown']}),rewardKey(run.runId,'sold',0));
  assert.equal(run.economy.gold,0);
  assert.deepEqual(receipt.grantedItemIds,['serpentcrown']);
  assert.deepEqual(receipt.duplicateUniqueIds,[]);
  assert.equal(receipt.duplicateUniqueGold,0);
  assert.equal(run.economy.shop.filter(o=>o.id==='serpentcrown'&&!o.bought).length,1);
});

test('a gild bounty pends a choice, and chooseGild applies it exactly once', () => {
  const run = newRun({seed: SEED});
  run.economy.board = [{id:'a', iid:1, rarity:0}, {id:'b', iid:2, rarity:3}];
  const key = rewardKey(run.runId, 'n', 0);
  settleFixed(run, plan({choice: 'gild'}), key);
  assert.deepEqual(run.pendingChoice.options, [{iid:1, rarity:0}], 'only the non-Diamond ware');
  assert.equal(run.receipts[key].choiceApplied, false, 'choice still owed');

  assert.equal(chooseGild(run, 1).ok, true);
  assert.equal(run.economy.board[0].rarity, 1, 'gilded up one');
  assert.equal(run.receipts[key].choiceApplied, true);
  assert.equal(run.pendingChoice, null);
  assert.equal(chooseGild(run, 1).ok, false, 'a second choose is rejected, no double gild');
});

test('a gild bounty on an all-Diamond board pays the 5 gold fallback in the same transaction', () => {
  const run = newRun({seed: SEED});
  run.economy.gold = 0;
  run.economy.board = [{id:'a', iid:1, rarity:3}];
  const key = rewardKey(run.runId, 'n', 0);
  settleFixed(run, plan({choice: 'gild'}), key);
  assert.equal(run.pendingChoice, null, 'never an empty overlay');
  assert.equal(run.economy.gold, 5);
  assert.equal(run.receipts[key].choiceApplied, true);
  assert.equal(run.receipts[key].fallbackApplied, true);
});

test('a unique bounty pends the unowned uniques, and chooseUnique offers one once', () => {
  const run = newRun({seed: SEED});
  const key = rewardKey(run.runId, 'n', 0);
  settleFixed(run, plan({choice: 'pickUnique'}), key);
  assert.ok(run.pendingChoice.options.includes(someUnique));
  assert.equal(chooseUnique(run, someUnique).ok, true);
  assert.equal(run.economy.shop.filter(o => o.id === someUnique).length, 1, 'one free offer');
  assert.equal(run.pendingChoice, null);
  assert.equal(chooseUnique(run, someUnique).ok, false, 'no second grant');
});

test('a unique bounty with every unique already owned pays the 10 gold fallback', () => {
  const run = newRun({seed: SEED});
  run.economy.gold = 0;
  run.economy.board = Object.keys(ITEMS).filter(id => ITEMS[id].unique).map((id, i) => ({id, iid: i + 1, rarity: 0}));
  settleFixed(run, plan({choice: 'pickUnique'}), rewardKey(run.runId, 'n', 0));
  assert.equal(run.pendingChoice, null);
  assert.equal(run.economy.gold, 10);
});

test('Long midpoint options are deterministic Treasure uniques and exclude every owned surface',()=>{
  const treasure=Object.keys(ITEMS).filter(id=>ITEMS[id].unique&&ITEMS[id].acquisition==='treasure').sort();
  assert.ok(treasure.length>3,'fixture has a real Treasure unique pool');
  const run=midpointRun();
  run.economy.board=[{id:treasure[0],iid:1,rarity:0}];
  run.economy.vault=[{id:treasure[1],iid:2,rarity:0}];
  run.economy.shop=[{id:treasure[2],offerId:3,bought:false},{id:treasure[3],offerId:4,bought:true}];
  const options=midpointTreasureOptions(run);
  assert.equal(options.length,3);
  assert.deepEqual(midpointTreasureOptions(run),options,'same aggregate re-rolls byte-identically');
  assert.ok(options.every(id=>ITEMS[id].unique&&ITEMS[id].acquisition==='treasure'));
  assert.ok(!options.includes(treasure[0])&&!options.includes(treasure[1])&&!options.includes(treasure[2]));
  const copy=midpointRun();
  copy.economy=JSON.parse(JSON.stringify(run.economy));
  assert.deepEqual(midpointTreasureOptions(copy),options,'same seed and ownership reproduce exact options');
});

test('ensureMidpointTreasure opens only at the exact Long D3 boundary and waits behind another choice',()=>{
  const cases=[
    run=>{run.routeMode='quick';},
    run=>{run.route.path=['d2boss'];},
    run=>{run.route.path=['d3boss','d4c1l0'];},
    run=>{run.route.phase='market';run.route.pendingId='d3boss';},
    run=>{run.route.pendingId='d4c1l0';}
  ];
  for(const change of cases){
    const run=midpointRun();change(run);
    assert.equal(ensureMidpointTreasure(run),null);
    assert.equal(run.receipts[midpointTreasureKey(run.runId)],undefined);
  }
  const owed=midpointRun();
  owed.pendingChoice={key:'reward',kind:'gild',options:[{iid:1}],fallbackGold:5};
  assert.equal(ensureMidpointTreasure(owed),null,'an existing reward choice is never overwritten');
  owed.pendingChoice=null;
  assert.ok(ensureMidpointTreasure(owed),'the midpoint opens once the prior choice closes');
});

test('ensureMidpointTreasure persists exact offers in a dedicated idempotent receipt',()=>{
  const run=midpointRun(),key=midpointTreasureKey(run.runId);
  const receipt=ensureMidpointTreasure(run);
  assert.equal(run.receipts[key],receipt);
  assert.deepEqual(receipt.offeredIds,midpointTreasureOptions(run));
  assert.deepEqual(run.pendingChoice,{key:key,kind:'midpointTreasure',options:receipt.offeredIds,
    fallbackGold:MIDPOINT_FALLBACK_GOLD});
  assert.equal(receipt.choiceApplied,false);
  const nextId=run.ids.nextItem,gold=run.economy.gold;
  assert.equal(ensureMidpointTreasure(run),receipt,'repeat returns the same receipt');
  assert.equal(run.ids.nextItem,nextId);
  assert.equal(run.economy.gold,gold);
});

test('chooseUnique commits a midpoint Treasure as one free unbought offer exactly once',()=>{
  const run=midpointRun(),receipt=ensureMidpointTreasure(run),id=receipt.offeredIds[0];
  assert.deepEqual(chooseUnique(run,id),{ok:true});
  const offer=run.economy.shop.find(o=>o.id===id);
  assert.ok(offer&&offer.free&&!offer.bought&&Number.isInteger(offer.offerId));
  assert.equal(receipt.choiceApplied,true);
  assert.equal(receipt.selectedId,id);
  assert.equal(receipt.fallbackApplied,false);
  assert.equal(run.pendingChoice,null);
  assert.equal(chooseUnique(run,id).ok,false,'the consumed midpoint cannot grant twice');
  assert.equal(ensureMidpointTreasure(run),receipt,'the boundary cannot reopen after selection');
});

test('an empty midpoint pool pays 10 gold once and records the fallback',()=>{
  const run=midpointRun();run.economy.gold=0;
  run.economy.board=Object.keys(ITEMS).filter(id=>ITEMS[id].unique&&ITEMS[id].acquisition==='treasure')
    .map((id,i)=>({id:id,iid:i+1,rarity:0}));
  const receipt=ensureMidpointTreasure(run);
  assert.deepEqual(receipt.offeredIds,[]);
  assert.equal(receipt.choiceRequired,false);
  assert.equal(receipt.choiceApplied,true);
  assert.equal(receipt.selectedId,null);
  assert.equal(receipt.fallbackApplied,true);
  assert.equal(receipt.fallbackGold,MIDPOINT_FALLBACK_GOLD);
  assert.equal(run.economy.gold,MIDPOINT_FALLBACK_GOLD);
  assert.equal(run.pendingChoice,null);
  ensureMidpointTreasure(run);
  assert.equal(run.economy.gold,MIDPOINT_FALLBACK_GOLD,'receipt blocks a second fallback');
});

test('refreshPendingChoice never adds midpoint options and falls back once when all offered wares go stale',()=>{
  const run=midpointRun();run.economy.gold=0;
  const receipt=ensureMidpointTreasure(run),offered=receipt.offeredIds.slice();
  run.economy.vault=offered.map((id,i)=>({id:id,iid:i+1,rarity:0}));
  assert.equal(refreshPendingChoice(run),null);
  assert.equal(run.economy.gold,MIDPOINT_FALLBACK_GOLD);
  assert.equal(receipt.choiceApplied,true);
  assert.equal(receipt.fallbackApplied,true);
  assert.equal(receipt.selectedId,null);
  assert.equal(refreshPendingChoice(run),null);
  assert.equal(run.economy.gold,MIDPOINT_FALLBACK_GOLD);
});

test('a tampered midpoint cannot grant a unique from outside the Treasure pool',()=>{
  const id=Object.keys(ITEMS).find(uid=>ITEMS[uid].unique&&ITEMS[uid].acquisition!=='treasure');
  assert.ok(id,'fixture has a non-Treasure unique');
  const run=midpointRun(),key=midpointTreasureKey(run.runId);
  run.pendingChoice={key:key,kind:'midpointTreasure',options:[id],fallbackGold:MIDPOINT_FALLBACK_GOLD};
  run.receipts[key]={choiceApplied:false,offeredIds:[id],fallbackApplied:false};
  assert.deepEqual(chooseUnique(run,id),{ok:false,reason:'not midpoint treasure'});
  assert.equal(refreshPendingChoice(run),null);
  assert.equal(run.receipts[key].fallbackApplied,true);
});

test('a midpoint pending choice cannot grant an id absent from its dedicated receipt',()=>{
  const run=midpointRun(),receipt=ensureMidpointTreasure(run);
  const other=Object.keys(ITEMS).find(id=>ITEMS[id].unique&&ITEMS[id].acquisition==='treasure'&&!receipt.offeredIds.includes(id));
  assert.ok(other);
  run.pendingChoice.options.push(other);
  assert.deepEqual(chooseUnique(run,other),{ok:false,reason:'not midpoint treasure'});
  assert.deepEqual(refreshPendingChoice(run).options,receipt.offeredIds,'refresh restores the receipt intersection');
});

test('a Charm checkpoint pends four offers and awards one exactly once', () => {
  const run=newRun({seed:SEED});
  const key=rewardKey(run.runId,'d1boss',0);
  const offers=['quick','prince','smith','pyro'];
  settleFixed(run,plan({choice:'charm',choiceOptions:offers}),key);
  assert.deepEqual(run.pendingChoice.options,offers);
  assert.equal(run.receipts[key].choiceApplied,false);
  const chosen=chooseCharm(run,'quick');
  assert.equal(chosen.ok,true);
  assert.equal(chosen.charm.id,'quick');
  assert.deepEqual(run.economy.trinkets.map(t=>t.id),['quick']);
  assert.equal(run.receipts[key].selectedId,'quick');
  assert.equal(run.pendingChoice,null);
  assert.equal(chooseCharm(run,'quick').ok,false,'the consumed choice cannot award twice');
});

test('Charm choice options reject unknown, duplicate, and already-owned ids', () => {
  const quick=TRINKETS.find(t=>t.id==='quick');
  assert.deepEqual(charmChoiceOptions([quick],['quick','smith','smith','missing']),['smith']);
});

test('refreshPendingChoice drops stale gild targets and falls back when none remain', () => {
  const run = newRun({seed: SEED});
  run.economy.gold = 0;
  run.economy.board = [{id:'a', iid:1, rarity:0}];
  run.pendingChoice = {key: rewardKey(run.runId, 'n', 0), kind: 'gild', options: [{iid:1, rarity:0}, {iid:9, rarity:0}], fallbackGold: 5};
  run.receipts[run.pendingChoice.key] = {fixedApplied: true, choiceRequired: true, choiceApplied: false, choiceKind: 'gild'};
  const still = refreshPendingChoice(run);
  assert.deepEqual(still.options, [{iid:1, rarity:0}], 'the gone target is dropped, none added');

  const key = run.pendingChoice.key;
  run.economy.board = [];
  const gone = refreshPendingChoice(run);
  assert.equal(gone, null);
  assert.equal(run.economy.gold, 5, 'fallback paid');
  assert.equal(run.receipts[key].choiceApplied, true, 'receipt closed by the fallback');
  assert.equal(run.receipts[key].fallbackApplied, true);
});

test('refreshPendingChoice preserves only unowned Charm offers and closes without gold when empty', () => {
  const run=newRun({seed:SEED});
  const key=rewardKey(run.runId,'d1boss',0);
  settleFixed(run,plan({choice:'charm',choiceOptions:['quick','prince']}),key);
  run.economy.trinkets.push(TRINKETS.find(t=>t.id==='quick'));
  assert.deepEqual(refreshPendingChoice(run).options,['prince']);
  run.economy.trinkets.push(TRINKETS.find(t=>t.id==='prince'));
  const gold=run.economy.gold;
  assert.equal(refreshPendingChoice(run),null);
  assert.equal(run.economy.gold,gold,'a missing Charm has no economy fallback');
  assert.equal(run.receipts[key].choiceApplied,true);
});

test('nextPresentation puts an owed choice first, then a finished run, else the map', () => {
  const run = newRun({seed: SEED});
  run.pendingChoice = {key: 'k', kind: 'gild', options: [{iid:1}], fallbackGold: 5};
  assert.equal(nextPresentation(run).kind, 'choice');
  run.pendingChoice = null;
  run.route.phase = 'won';
  assert.deepEqual(nextPresentation(run), {kind: 'end', cause: 'won'});
  run.route.phase = 'map';
  assert.deepEqual(nextPresentation(run), {kind: 'map'});
});

test('receipts and pendingChoice survive a serialize/revive round trip', () => {
  const run = newRun({seed: SEED});
  run.receipts['k'] = {fixedApplied: true, choiceRequired: true, choiceApplied: false, choiceKind: 'gild'};
  run.pendingChoice = {key: 'k', kind: 'gild', options: [{iid:1, rarity:0}], fallbackGold: 5};
  const back = reviveRun(serializeRun(run));
  assert.deepEqual(back.receipts, run.receipts);
  assert.deepEqual(back.pendingChoice, run.pendingChoice);
});
