import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planReward} from '../src/route-rewards.js';

/* planReward is pure: given a bounty and the fight-scoped inputs it returns the
   settlement plan the caller applies. These lock the money math and the bounty
   branches so the R4 extraction cannot drift from the old inline settlement. */

test('base gold with no bounty gold is just the node base', () => {
  const p = planReward({}, {baseGold: 3});
  assert.equal(p.gold, 3);
  assert.equal(p.drained, 0);
  assert.deepEqual(p.items, []);
  assert.equal(p.mote, null);
  assert.equal(p.choice, null);
});

test('bounty gold adds to base', () => {
  assert.equal(planReward({gold: 5}, {baseGold: 3}).gold, 8);
});

test('gild status doubles the bounty purse but not the base', () => {
  assert.equal(planReward({gold: 5}, {baseGold: 3, gilded: true}).gold, 13);
});

test('drain skims the pocketed amount off the purse and reports it', () => {
  const p = planReward({gold: 5, drain: true}, {baseGold: 3, pocketed: 2});
  assert.equal(p.gold, 6);      /* 3 base + (5 - 2 drained) */
  assert.equal(p.drained, 2);
});

test('drain cannot exceed the purse', () => {
  const p = planReward({gold: 5, drain: true}, {baseGold: 0, pocketed: 99});
  assert.equal(p.drained, 5);
  assert.equal(p.gold, 0);
});

test('the minimum gold floor lifts a small reward', () => {
  assert.equal(planReward({}, {baseGold: 0, minGold: 1}).gold, 1);
  assert.equal(planReward({gold: 5}, {baseGold: 3, minGold: 1}).gold, 8, 'floor never lowers');
});

test('an income relic only lands when entered gold cleared the threshold', () => {
  assert.equal(planReward({relic: true}, {enteredGold: 8}).relic, 1);
  assert.equal(planReward({relic: true}, {enteredGold: 7}).relic, 0);
  assert.equal(planReward({}, {enteredGold: 99}).relic, 0, 'no relic bounty, no relic');
});

test('item bounties are copied out as free ware ids', () => {
  const p = planReward({items: ['torch', 'dagger']}, {baseGold: 0});
  assert.deepEqual(p.items, ['torch', 'dagger']);
  p.items.push('x');
  assert.deepEqual(planReward({items: ['torch']}, {}).items, ['torch'], 'source array not shared');
});

test('the mote copies the commonest bronze non-unique ware', () => {
  const board = [
    {id: 'dagger', rarity: 0}, {id: 'dagger', rarity: 0},
    {id: 'sword', rarity: 0},
    {id: 'mace', rarity: 1}   /* not bronze, ignored */
  ];
  assert.deepEqual(planReward({mote: true}, {board: board}).mote, {item: 'dagger'});
});

test('the mote pays 3 gold when there is nothing bronze to copy', () => {
  assert.deepEqual(planReward({mote: true}, {board: []}).mote, {gold: 3});
  assert.deepEqual(planReward({mote: true}, {board: [{id: 'sword', rarity: 2}]}).mote, {gold: 3}, 'gilded wares are not bronze');
});

test('gild and pickUnique surface as an owed choice', () => {
  assert.equal(planReward({gild: true}, {}).choice, 'gild');
  assert.equal(planReward({pickUnique: true}, {}).choice, 'pickUnique');
  assert.equal(planReward({gild: true, pickUnique: true}, {}).choice, 'gild', 'gild wins the tie, matching the old order');
});
