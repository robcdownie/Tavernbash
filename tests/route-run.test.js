import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SCHEMA_VERSION, newRun, advance, serializeRun, reviveRun} from '../src/route-run.js';
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
  assert.deepEqual(Object.keys(wire).sort(), ['ids', 'revision', 'route', 'runId', 'schemaVersion', 'seed']);
});

test('revive fills defaults for an older save that omits identity or the id counter', () => {
  const revived = reviveRun({seed: SEED, route: initRoute(SEED)});
  assert.equal(revived.schemaVersion, 2);
  assert.equal(revived.revision, 0);
  assert.equal(revived.ids.nextItem, 1);
  assert.equal(typeof revived.runId, 'string');
  assert.ok(revived.runId.length > 0, 'a runId is synthesized from the seed');
});
