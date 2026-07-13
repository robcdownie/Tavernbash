import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SCHEMA_VERSION, newRun, advance, serializeRun, reviveRun, newEconomy, bindEconomy, allocId, ensureIdFloor} from '../src/route-run.js';
import {genMap} from '../src/map.js';
import {initRoute, transition, validRoute} from '../src/route.js';

const SEED = 1234567;

test('newRun builds a v2 aggregate with the controller state and an id counter', () => {
  const run = newRun({seed: SEED});
  assert.equal(run.schemaVersion, SCHEMA_VERSION);
  assert.equal(run.schemaVersion, 2);
  assert.equal(typeof run.runId, 'string');
  assert.ok(run.runId.length > 0);
  assert.equal(run.revision, 0);
  assert.equal(run.seed, SEED);
  assert.deepEqual(run.route, initRoute(SEED), 'route is a fresh controller state');
  assert.equal(run.ids.nextItem, 1);
});

test('runId is derived from the seed and is stable for the same seed', () => {
  assert.equal(newRun({seed: SEED}).runId, newRun({seed: SEED}).runId);
  assert.notEqual(newRun({seed: SEED}).runId, newRun({seed: SEED + 1}).runId);
});

test('advance is the single reducer: it mirrors transition, advances route, bumps revision', () => {
  const run = newRun({seed: SEED});
  const map = genMap(SEED);
  const c1 = map.districts[0].columns[0][0].id;
  const action = {type: 'commit', nodeId: c1, choice: 'challenge'};

  const expected = transition(initRoute(SEED), map, action);
  const effects = advance(run, map, action);

  assert.deepEqual(run.route, expected.state, 'route matches a raw transition');
  assert.deepEqual(effects, expected.effects, 'effects are passed straight through');
  assert.equal(run.revision, 1, 'revision advanced once');

  advance(run, map, {type: 'fightResult', winner: 'a', survTier: 0});
  assert.equal(run.revision, 2, 'revision advances every step');
});

test('serialize then revive round-trips the durable fields', () => {
  const run = newRun({seed: SEED});
  const map = genMap(SEED);
  const c1 = map.districts[0].columns[0][0].id;
  advance(run, map, {type: 'commit', nodeId: c1, choice: 'challenge'});
  run.ids.nextItem = 7;

  const revived = reviveRun(serializeRun(run));
  assert.deepEqual(revived, run, 'the whole durable aggregate survives');
  assert.ok(validRoute(revived.route, genMap(SEED)), 'the revived route revalidates');
});

test('serialize keeps only durable fields (no map, no transients)', () => {
  const run = newRun({seed: SEED});
  const wire = serializeRun(run);
  assert.deepEqual(Object.keys(wire).sort(), ['economy', 'ids', 'revision', 'route', 'runId', 'schemaVersion', 'seed']);
});

test('newEconomy carries the starting defaults', () => {
  const e = newEconomy();
  assert.equal(e.gold, 6);
  assert.equal(e.tier, 1);
  assert.equal(e.tierCost, 5);
  assert.equal(e.relicIncome, 0);
  assert.equal(e.freeReroll, false);
  assert.equal(e.frozen, false);
  assert.deepEqual([e.board, e.vault, e.shop, e.trinkets], [[], [], [], []]);
});

test('newRun seeds the economy', () => {
  assert.deepEqual(newRun({seed: SEED}).economy, newEconomy());
});

test('bindEconomy exposes run.economy for read and write', () => {
  const g = {run: newRun({seed: SEED})};
  bindEconomy(g);
  assert.equal(g.gold, 6, 'getter reads the aggregate');
  g.gold -= 2;
  assert.equal(g.run.economy.gold, 4, 'setter writes through');
  g.run.economy.tier = 3;
  assert.equal(g.tier, 3, 'a direct aggregate edit is visible through the getter');
});

test('economy arrays stay identical through the accessor, in place and after reassignment', () => {
  const g = {run: newRun({seed: SEED})};
  bindEconomy(g);
  assert.equal(g.board, g.run.economy.board, 'same array object, not a copy');
  g.board.push({id: 'x'});
  assert.equal(g.run.economy.board.length, 1, 'in-place push is canonical');
  const replacement = [{id: 'y'}];
  g.shop = replacement;
  assert.equal(g.run.economy.shop, replacement, 'wholesale reassignment writes the exact array');
  assert.equal(g.shop, replacement, 'and reads back the same reference');
});

test('accessors resolve through the live run, so swapping run is never stale', () => {
  const g = {run: newRun({seed: SEED})};
  bindEconomy(g);
  g.gold = 99;
  g.run = newRun({seed: SEED + 1});
  assert.equal(g.gold, 6, 'reads follow the new aggregate, not the old binding');
});

test('two targets bound to different runs stay independent', () => {
  const a = {run: newRun({seed: 1})};
  const b = {run: newRun({seed: 2})};
  bindEconomy(a);
  bindEconomy(b);
  a.gold = 1;
  b.gold = 2;
  assert.equal(a.gold, 1);
  assert.equal(b.gold, 2);
});

test('allocId hands out a fresh id every call and advances the counter', () => {
  const run = newRun({seed: SEED});
  assert.equal(run.ids.nextItem, 1);
  const a = allocId(run), b = allocId(run), c = allocId(run);
  assert.deepEqual([a, b, c], [1, 2, 3], 'strictly increasing, no repeats');
  assert.equal(run.ids.nextItem, 4, 'counter points past the last handed out');
  /* wares and offers both draw here, so an owned ware and the offer that spawned
     it can never share a value */
  assert.notEqual(a, b);
});

test('ensureIdFloor lifts the counter above every restored id', () => {
  const run = newRun({seed: SEED});
  run.economy.board = [{id:'a', iid: 3}, {id:'b', iid: 9}];
  run.economy.vault = [{id:'c', iid: 5}];
  run.economy.shop = [{id:'d', offerId: 12}];
  run.ids.nextItem = 1;                 /* a stale counter */
  ensureIdFloor(run);
  assert.equal(run.ids.nextItem, 13, 'one past the highest id across all pools');
});

test('ensureIdFloor leaves an already-correct counter alone', () => {
  const run = newRun({seed: SEED});
  run.economy.board = [{id:'a', iid: 2}];
  run.ids.nextItem = 8;
  ensureIdFloor(run);
  assert.equal(run.ids.nextItem, 8);
});

test('revive fills defaults for an older save that omits identity or the id counter', () => {
  const revived = reviveRun({seed: SEED, route: initRoute(SEED)});
  assert.equal(revived.schemaVersion, 2);
  assert.equal(revived.revision, 0);
  assert.equal(revived.ids.nextItem, 1);
  assert.equal(typeof revived.runId, 'string');
  assert.ok(revived.runId.length > 0, 'a runId is synthesized from the seed');
});
