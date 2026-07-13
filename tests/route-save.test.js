import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ROUTE_SAVE_VERSION, ROUTE_KEY, readRouteSave, writeRouteSave, clearRouteSave} from '../src/route-save.js';
import {genMap, MAP_VERSION} from '../src/map.js';
import {initRoute, transition, validRoute} from '../src/route.js';

const SEED = 1234567;

/* an in-memory Storage stand-in so the codecs run without a browser */
function fakeStorage(){
  const m = {};
  return {getItem:k=>(k in m ? m[k] : null), setItem:(k,v)=>{m[k]=String(v);}, removeItem:k=>{delete m[k];}, _map:m};
}

/* build the current v1 envelope around a route controller state */
function envelope(routeState, extra){
  return Object.assign({
    saveVersion: ROUTE_SAVE_VERSION,
    mapVersion: MAP_VERSION,
    routeState: routeState,
    phase: 'routeMap',
    run: {seed: routeState.seed, hero: 'kiln', anom: 'moon', tags: ['burn','dmg'],
      gold: 6, tier: 1, tierCost: 5, relicIncome: 0, frozen: false, freeReroll: false, fightN: 0,
      board: [{id:'torch',rarity:0,size:1,ench:null}], vault: [], shop: [], trinkets: []},
    market: null, opening: false, combat: null
  }, extra || {});
}

test('write then read round-trips the envelope', () => {
  const s = fakeStorage();
  const env = envelope(initRoute(SEED));
  writeRouteSave(s, env);
  assert.deepEqual(readRouteSave(s), env);
});

test('read rejects a stale save version, a stale map version, and garbage', () => {
  const map = genMap(SEED);
  const good = envelope(initRoute(SEED));
  let s = fakeStorage(); writeRouteSave(s, Object.assign({}, good, {saveVersion: ROUTE_SAVE_VERSION + 1}));
  assert.equal(readRouteSave(s), null, 'stale save version dropped');
  assert.equal(s.getItem(ROUTE_KEY), null, 'and removed');
  s = fakeStorage(); writeRouteSave(s, Object.assign({}, good, {mapVersion: MAP_VERSION + 1}));
  assert.equal(readRouteSave(s), null, 'stale map version dropped');
  s = fakeStorage(); s.setItem(ROUTE_KEY, '{not json');
  assert.equal(readRouteSave(s), null, 'garbage dropped');
  s = fakeStorage();
  assert.equal(readRouteSave(s), null, 'empty is null');
});

test('clear removes the save', () => {
  const s = fakeStorage();
  writeRouteSave(s, envelope(initRoute(SEED)));
  clearRouteSave(s);
  assert.equal(readRouteSave(s), null);
});

test('the codecs no-op safely without a storage object', () => {
  assert.equal(readRouteSave(null), null);
  writeRouteSave(null, {});   /* must not throw */
  clearRouteSave(null);
});

test('R1 combat context survives a save round-trip', () => {
  const s = fakeStorage();
  const combat = {nodeId: 'd1c1l0', enteredGold: 9, threat: 1, pocketed: 3};
  writeRouteSave(s, envelope(initRoute(SEED), {combat: combat, phase: 'fight'}));
  assert.deepEqual(readRouteSave(s).combat, combat, 'entered gold and pocketing are preserved');
});

test('a v1 envelope for every route phase round-trips and revalidates (migration fixtures)', () => {
  const map = genMap(SEED);
  const allNodes = [];
  for (const d of map.districts){ for (const col of d.columns) for (const n of col) allNodes.push(n); allNodes.push(d.boss); }
  const marketNode = allNodes.find(n => n.type === 'market');
  const eventNode = allNodes.find(n => ['treasure','rest','shrine','negotiation'].includes(n.type));
  const boss = map.districts[0].boss;
  const c1 = map.districts[0].columns[0][0].id;

  const base = initRoute(SEED);
  const encounter = transition(base, map, {type:'commit', nodeId:c1, choice:'challenge'}).state;
  const reward = transition(encounter, map, {type:'fightResult', winner:'a', survTier:0}).state;

  const fixtures = {
    map: base,
    encounter: encounter,
    reward: reward,
    market: Object.assign({}, base, {pendingId: marketNode.id, phase: 'market'}),
    event: Object.assign({}, base, {pendingId: eventNode.id, phase: 'event'}),
    gateCamp: Object.assign({}, base, {pendingId: boss.id, phase: 'gateCamp', attempts: {[boss.id]: 1}})
  };

  for (const [name, routeState] of Object.entries(fixtures)) {
    assert.ok(validRoute(routeState, map), name + ' fixture is a valid route state');
    const s = fakeStorage();
    writeRouteSave(s, envelope(routeState, {phase: name}));
    const loaded = readRouteSave(s);
    assert.ok(loaded, name + ' round-trips through storage');
    assert.deepEqual(loaded.routeState, routeState, name + ' route state survives the round trip');
    assert.ok(validRoute(loaded.routeState, genMap(SEED)), name + ' revalidates against a fresh map');
  }
});
