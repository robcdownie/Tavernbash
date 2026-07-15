import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ITEMS,TRINKETS} from '../src/data.js';
import {newRun, serializeRun, reviveRun} from '../src/route-run.js';
import {rewardKey, gildOptions, uniqueOptions, charmChoiceOptions, settleFixed, chooseGild, chooseUnique, chooseCharm, refreshPendingChoice, nextPresentation} from '../src/route-runtime.js';

const SEED = 1234567;
const someUnique = Object.keys(ITEMS).find(id => ITEMS[id].unique);
/* a plain plan in the shape route-rewards.planReward returns */
function plan(over){ return Object.assign({gold: 0, drained: 0, items: [], relic: false, mote: null, choice: null}, over); }

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
