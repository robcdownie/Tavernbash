import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SCHEMA_VERSION, newRun, advance, serializeRun, reviveRun, newEconomy, bindEconomy, allocId, ensureIdFloor,
        campEnsure, campMend, campLastReserve, campClear, campExpireCredit, CAMP_MEND, CAMP_LAST_RESERVE} from '../src/route-run.js';
import {genMap} from '../src/map.js';
import {initRoute, transition, validRoute} from '../src/route.js';
import {ITEMS} from '../src/data.js';

const SEED = 1234567;

test('newRun builds a v5 Quick aggregate with metrics and an id counter', () => {
  const run = newRun({seed: SEED, now:1000});
  assert.equal(run.schemaVersion, SCHEMA_VERSION);
  assert.equal(run.schemaVersion, 8);
  assert.equal(typeof run.runId, 'string');
  assert.ok(run.runId.length > 0);
  assert.equal(run.revision, 0);
  assert.equal(run.seed, SEED);
  assert.equal(run.routeMode, 'quick');
  assert.equal(run.metrics.timing.startedAt,1000);
  assert.deepEqual(run.route, initRoute(SEED), 'route is a fresh controller state');
  assert.equal(run.ids.nextItem, 1);
});

test('newRun binds Long mode to a sixty Resolve controller',()=>{
  const run=newRun({seed:SEED,routeMode:'long'});
  assert.equal(run.routeMode,'long');
  assert.deepEqual(run.route,initRoute(SEED,'long'));
  assert.equal(run.route.resolve,60);
  assert.equal(run.route.resolveMax,60);
  assert.ok(validRoute(run.route,genMap(SEED,'long')));
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
  run.end = {cause:'won',result:'win',endedAt:1234,exported:false};

  const revived = reviveRun(serializeRun(run));
  assert.deepEqual(revived, run, 'the whole durable aggregate survives');
  assert.ok(validRoute(revived.route, genMap(SEED)), 'the revived route revalidates');
});

test('serialize keeps only durable fields (no map, no transients)', () => {
  const run = newRun({seed: SEED});
  const wire = serializeRun(run);
  assert.deepEqual(Object.keys(wire).sort(), ['camp', 'contentEpoch', 'economy', 'end', 'ids', 'lantern', 'lastReserveUsed', 'metrics', 'pendingChoice', 'receipts', 'revision', 'route', 'routeMode', 'runId', 'schemaVersion', 'seed']);
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
  assert.equal(revived.schemaVersion, 8);
  assert.equal(revived.routeMode,'quick');
  assert.equal(revived.metrics.partial,true);
  assert.equal(revived.revision, 0);
  assert.equal(revived.ids.nextItem, 1);
  assert.equal(typeof revived.runId, 'string');
  assert.ok(revived.runId.length > 0, 'a runId is synthesized from the seed');
});

/* ============ GATE CAMP ============ */
const bossNode = (seed) => genMap(seed).districts[0].boss;

test('campEnsure rolls three tier-gated Bronze offers, keyed by seed and node', () => {
  const run = newRun({seed: SEED});
  const node = bossNode(SEED);
  const camp = campEnsure(run, node, 1);
  assert.equal(camp.nodeId, node.id);
  assert.equal(camp.offers.length, 3);
  for (const o of camp.offers) {
    assert.ok(ITEMS[o.id], 'offer is a real ware');
    assert.equal(ITEMS[o.id].tier, 1, 'tier-gated to tier 1 at tier 1');
    assert.ok(!ITEMS[o.id].unique && !ITEMS[o.id].inc);
    assert.equal(o.bought, false);
  }
  assert.equal(camp.mendUsed, false);
  assert.equal(camp.credit, 0);
});

test('campEnsure is stable across retries and reloads, regenerates only on a new gate', () => {
  const run = newRun({seed: SEED});
  const node = bossNode(SEED);
  const a = campEnsure(run, node, 1);
  const b = campEnsure(run, node, 1);
  assert.equal(a, b, 'same object kept while at the same gate');
  assert.deepEqual(a.offers.map(o => o.id), b.offers.map(o => o.id));
  /* a fresh run at the same node gives the same three (deterministic) */
  const run2 = newRun({seed: SEED});
  assert.deepEqual(campEnsure(run2, node, 1).offers.map(o => o.id), a.offers.map(o => o.id));
  /* a different node regenerates */
  const other = genMap(SEED).districts[1].boss;
  const c = campEnsure(run, other, 1);
  assert.equal(c.nodeId, other.id);
});

test('campMend pays gold for Resolve once per gate, capped at max', () => {
  const run = newRun({seed: SEED});
  campEnsure(run, bossNode(SEED), 1);
  run.economy.gold = 10; run.route.resolve = 20; run.route.resolveMax = 40;
  const r = campMend(run);
  assert.ok(r.ok);
  assert.equal(run.economy.gold, 10 - CAMP_MEND.cost);
  assert.equal(run.route.resolve, 20 + CAMP_MEND.gain);
  assert.equal(campMend(run).ok, false, 'once per gate');
});

test('campMend refuses when gold is short and never exceeds max Resolve', () => {
  const run = newRun({seed: SEED});
  campEnsure(run, bossNode(SEED), 1);
  run.economy.gold = 0;
  assert.equal(campMend(run).ok, false);
  run.economy.gold = 5; run.route.resolve = 39; run.route.resolveMax = 40;
  assert.ok(campMend(run).ok);
  assert.equal(run.route.resolve, 40, 'capped at max, not 43');
});

test('campLastReserve trades Resolve and max for credit, once per run, never a self-KO', () => {
  const run = newRun({seed: SEED});
  campEnsure(run, bossNode(SEED), 1);
  run.route.resolve = 30; run.route.resolveMax = 40;
  const r = campLastReserve(run);
  assert.ok(r.ok);
  assert.equal(run.route.resolve, 30 - CAMP_LAST_RESERVE.resolve);
  assert.equal(run.route.resolveMax, 40 - CAMP_LAST_RESERVE.maxCut);
  assert.equal(run.camp.credit, CAMP_LAST_RESERVE.credit);
  assert.equal(run.lastReserveUsed, true);
  assert.equal(campLastReserve(run).ok, false, 'once per run');
});

test('campLastReserve is refused when it would not leave the player alive', () => {
  const run = newRun({seed: SEED});
  campEnsure(run, bossNode(SEED), 1);
  run.route.resolve = CAMP_LAST_RESERVE.resolve;   /* exactly the cost */
  assert.equal(campLastReserve(run).ok, false);
  assert.equal(run.lastReserveUsed, false, 'a refused use is not spent');
});

test('campExpireCredit zeroes unspent credit; campClear drops the stock', () => {
  const run = newRun({seed: SEED});
  campEnsure(run, bossNode(SEED), 1);
  run.camp.credit = 5;
  campExpireCredit(run);
  assert.equal(run.camp.credit, 0);
  campClear(run);
  assert.equal(run.camp, null);
});

test('camp and lastReserveUsed round-trip through the run codec', () => {
  const run = newRun({seed: SEED});
  campEnsure(run, bossNode(SEED), 1);
  run.camp.mendUsed = true; run.camp.credit = 4; run.lastReserveUsed = true;
  const revived = reviveRun(serializeRun(run));
  assert.deepEqual(revived.camp, run.camp);
  assert.equal(revived.lastReserveUsed, true);
  /* an older save without the fields revives to clean defaults */
  const legacy = reviveRun({seed: SEED, route: initRoute(SEED), economy: newEconomy()});
  assert.equal(legacy.camp, null);
  assert.equal(legacy.lastReserveUsed, false);
});
