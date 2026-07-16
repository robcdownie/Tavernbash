import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ROUTE_SAVE_VERSION, ROUTE_KEY, readRouteSave, writeRouteSave, clearRouteSave,
  migrateV1toV2, migrateV2toV3, migrateV3toV4} from '../src/route-save.js';
import {genMap, districtPaths, MAP_VERSION} from '../src/map.js';
import {initRoute, transition, validRoute} from '../src/route.js';
import {ITEMS} from '../src/data.js';
import {midpointTreasureKey} from '../src/route-runtime.js';

const SEED = 1234567;

/* an in-memory Storage stand-in so the codecs run without a browser */
function fakeStorage(){
  const m = {};
  return {getItem:k=>(k in m ? m[k] : null), setItem:(k,v)=>{m[k]=String(v);}, removeItem:k=>{delete m[k];}, _map:m};
}

/* the v4 envelope the writer produces: the run aggregate is the durable truth,
   setup + session live alongside it */
function v2env(routeState, extra){
  return Object.assign({
    saveVersion: ROUTE_SAVE_VERSION,
    mapVersion: MAP_VERSION,
    run: {
      schemaVersion: 4, runId: 'r-test', revision: 3, seed: routeState.seed,routeMode:'quick',
      route: routeState,
      economy: {gold: 6, tier: 1, tierCost: 5, relicIncome: 0, freeReroll: false, frozen: false,
        board: [{id:'torch',rarity:0,size:1,ench:null,iid:1}], vault: [],
        shop: [{id:'dagger',free:false,bought:false,ench:null,offerId:2}], trinkets: []},
      ids: {nextItem: 3}
    },
    setup: {hero: 'kiln', anom: 'moon', tags: ['burn','dmg']},
    fightN: 0, market: null, opening: false, combat: null
  }, extra || {});
}

function v3env(routeState,extra){
  const env=v2env(routeState,extra);
  env.saveVersion=3;env.run.schemaVersion=3;
  return env;
}

function d3Boundary(seed=SEED){
  const map=genMap(seed,'long'),route=initRoute(seed,'long');
  route.path=map.districts.slice(0,3).flatMap(d=>districtPaths(d)[0].map(n=>n.id));
  route.phase='map';route.pendingId=null;route.resolution=null;
  return route;
}

/* the legacy v1 envelope: controller state at the top level, economy flat under
   run, hero/anom/tags/fightN under run, no durable ids */
function v1env(routeState, extra){
  return Object.assign({
    saveVersion: 1,
    mapVersion: MAP_VERSION,
    routeState: routeState,
    phase: 'routeMap',
    run: {seed: routeState.seed, runId: 'r-legacy', revision: 2, ids: {nextItem: 1},
      hero: 'kiln', anom: 'moon', tags: ['burn','dmg'],
      gold: 9, tier: 2, tierCost: 7, relicIncome: 1, frozen: false, freeReroll: true, fightN: 4,
      board: [{id:'torch',rarity:0,size:1,ench:null}, {id:'dagger',rarity:1,size:1,ench:'blazing'}],
      vault: [{id:'mace',rarity:0,size:2,ench:null}],
      shop: [{id:'sword',free:false,bought:false,ench:null}, {id:'fangs',free:true,bought:false,ench:null}],
      trinkets: []},
    market: null, opening: false, combat: null
  }, extra || {});
}

test('write then read round-trips a v4 envelope', () => {
  const s = fakeStorage();
  const env = v2env(initRoute(SEED));
  writeRouteSave(s, env);
  assert.deepEqual(readRouteSave(s), env);
});

test('read rejects a future save version, a stale map version, and garbage', () => {
  const good = v2env(initRoute(SEED));
  let s = fakeStorage(); writeRouteSave(s, Object.assign({}, good, {saveVersion: ROUTE_SAVE_VERSION + 1}));
  assert.equal(readRouteSave(s), null, 'future save version dropped');
  assert.equal(s.getItem(ROUTE_KEY), null, 'and removed');
  s = fakeStorage(); writeRouteSave(s, Object.assign({}, good, {mapVersion: MAP_VERSION + 1}));
  assert.equal(readRouteSave(s), null, 'stale map version dropped');
  s = fakeStorage(); s.setItem(ROUTE_KEY, '{not json');
  assert.equal(readRouteSave(s), null, 'garbage dropped');
  s = fakeStorage();
  assert.equal(readRouteSave(s), null, 'empty is null');
});

test('the first read of a map v8 save returns a retirement sentinel, then it is gone',()=>{
  const s=fakeStorage(),old=Object.assign({},v2env(initRoute(SEED)),{mapVersion:8});
  writeRouteSave(s,old);
  assert.deepEqual(readRouteSave(s),{retired:true,reason:'map_updated',mapVersion:8});
  assert.equal(s.getItem(ROUTE_KEY),null,'retired payload was removed');
  assert.equal(readRouteSave(s),null,'retirement is reported only once');
});

test('a Long controller and mode round-trip against its seven district map',()=>{
  const s=fakeStorage(),route=initRoute(SEED,'long');
  const env=v2env(route);env.run.routeMode='long';
  writeRouteSave(s,env);
  const loaded=readRouteSave(s);
  assert.equal(loaded.run.routeMode,'long');
  assert.equal(loaded.run.route.resolveMax,60);
  assert.ok(validRoute(loaded.run.route,genMap(SEED,'long')));
});

test('clear removes the save', () => {
  const s = fakeStorage();
  writeRouteSave(s, v2env(initRoute(SEED)));
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
  writeRouteSave(s, v2env(initRoute(SEED), {combat: combat}));
  assert.deepEqual(readRouteSave(s).combat, combat, 'entered gold and pocketing are preserved');
});

test('migrateV1toV2 nests the controller state and economy, stamps ids, keeps setup', () => {
  const v1 = v1env(initRoute(SEED));
  const v2 = migrateV1toV2(v1);
  assert.equal(v2.saveVersion, 2);
  assert.equal(v2.run.schemaVersion, 2);
  assert.deepEqual(v2.run.route, v1.routeState, 'controller state moved into run.route');
  assert.equal(v2.run.economy.gold, 9, 'economy scalars carried, including truthy/zero exactly');
  assert.equal(v2.run.economy.relicIncome, 1);
  assert.equal(v2.run.economy.freeReroll, true);
  assert.deepEqual(v2.setup, {hero: 'kiln', anom: 'moon', tags: ['burn','dmg']}, 'setup kept durable');
  assert.equal(v2.fightN, 4, 'fightN kept durable');
  /* every ware and offer stamped, in board then vault then shop order, all unique */
  const ids = v2.run.economy.board.map(w=>w.iid)
    .concat(v2.run.economy.vault.map(w=>w.iid))
    .concat(v2.run.economy.shop.map(o=>o.offerId));
  assert.deepEqual(ids, [1,2,3,4,5], 'sequential in traversal order');
  assert.equal(v2.run.ids.nextItem, 6, 'counter past the max');
});

test('migrateV1toV2 is deterministic (idempotent transform)', () => {
  const v1 = v1env(initRoute(SEED));
  assert.deepEqual(migrateV1toV2(v1), migrateV1toV2(v1en_clone(v1)));
});
function v1en_clone(v1){ return JSON.parse(JSON.stringify(v1)); }

test('migrateV1toV2 honors ids already present and never reissues one', () => {
  const v1 = v1env(initRoute(SEED));
  v1.run.board[0].iid = 40;               /* a partially-stamped save */
  v1.run.ids.nextItem = 7;
  const v2 = migrateV1toV2(v1);
  const all = v2.run.economy.board.map(w=>w.iid)
    .concat(v2.run.economy.vault.map(w=>w.iid))
    .concat(v2.run.economy.shop.map(o=>o.offerId));
  assert.equal(new Set(all).size, all.length, 'no duplicate ids');
  assert.ok(all.includes(40), 'the pre-existing id is preserved');
  assert.ok(v2.run.ids.nextItem > Math.max(...all), 'counter stays above every id');
});

test('migrateV2toV3 preserves the run and adds partial Quick telemetry',()=>{
  const v2=migrateV1toV2(v1env(initRoute(SEED)));
  const v3=migrateV2toV3(v2);
  assert.equal(v3.saveVersion,3);
  assert.equal(v3.run.schemaVersion,3);
  assert.equal(v3.run.routeMode,'quick');
  assert.equal(v3.run.metrics.partial,true);
  assert.deepEqual(v3.run.route,v2.run.route);
  assert.equal(v3.run.metrics.timing.startedAt,null,'migration does not invent elapsed time');
});

test('migrateV3toV4 injects the deterministic midpoint only at the Long D3 boundary',()=>{
  const route=d3Boundary(),v3=v3env(route);
  v3.run.routeMode='long';
  v3.run.receipts={'r-test:reward:d3boss:0':{fixedApplied:true,choiceApplied:true}};
  v3.run.metrics={version:1,partial:false,events:[{seq:1,type:'reward'}]};
  const before=JSON.parse(JSON.stringify(v3));
  const v4=migrateV3toV4(v3),key=midpointTreasureKey('r-test');
  assert.equal(v4.saveVersion,4);
  assert.equal(v4.run.schemaVersion,4);
  assert.equal(v4.run.pendingChoice.kind,'midpointTreasure');
  assert.equal(v4.midpointInjected,true,'live restore must save the migrated receipt before display');
  assert.equal(v4.run.pendingChoice.key,key);
  assert.equal(v4.run.pendingChoice.options.length,3);
  assert.deepEqual(v4.run.pendingChoice.options,v4.run.receipts[key].offeredIds);
  assert.ok(v4.run.pendingChoice.options.every(id=>ITEMS[id].unique&&ITEMS[id].acquisition==='treasure'));
  assert.deepEqual(v4.run.receipts['r-test:reward:d3boss:0'],v3.run.receipts['r-test:reward:d3boss:0'],
    'existing reward receipts survive');
  assert.deepEqual(v4.run.metrics,v3.run.metrics,'existing metrics survive byte for byte');
  assert.deepEqual(v3,before,'migration does not mutate the v3 wire object');
  assert.deepEqual(migrateV3toV4(v3).run.pendingChoice.options,v4.run.pendingChoice.options,
    'the migration is deterministic');
});

test('migrateV3toV4 does not inject before, past, or outside Long midpoint',()=>{
  const boundary=d3Boundary();
  const cases=[
    {name:'Quick',routeMode:'quick',route:boundary},
    {name:'before',routeMode:'long',route:Object.assign({},boundary,{path:boundary.path.slice(0,-1)})},
    {name:'past',routeMode:'long',route:Object.assign({},boundary,{path:boundary.path.concat(['d4c1l0'])})},
    {name:'committed',routeMode:'long',route:Object.assign({},boundary,{phase:'encounter',pendingId:'d4c1l0'})}
  ];
  for(const c of cases){
    const v3=v3env(c.route);v3.run.routeMode=c.routeMode;
    const v4=migrateV3toV4(v3);
    assert.equal(v4.run.pendingChoice,null,c.name+' does not inject');
    assert.equal(v4.midpointInjected,undefined,c.name+' needs no migration checkpoint');
    assert.equal(v4.run.receipts[midpointTreasureKey('r-test')],undefined,c.name+' has no midpoint receipt');
  }
});

test('migrateV3toV4 never overwrites an owed reward choice at the boundary',()=>{
  const v3=v3env(d3Boundary());v3.run.routeMode='long';
  v3.run.pendingChoice={key:'reward',kind:'gild',options:[{iid:1,rarity:0}],fallbackGold:5};
  const v4=migrateV3toV4(v3);
  assert.deepEqual(v4.run.pendingChoice,v3.run.pendingChoice);
  assert.equal(v4.run.receipts[midpointTreasureKey('r-test')],undefined);
  assert.equal(v4.midpointInjected,undefined);
});

test('readRouteSave upgrades a stored 0.83 Long boundary save and preserves its exact offers',()=>{
  const s=fakeStorage(),v3=v3env(d3Boundary());v3.run.routeMode='long';
  writeRouteSave(s,v3);
  const loaded=readRouteSave(s),key=midpointTreasureKey('r-test');
  assert.equal(loaded.saveVersion,5);
  assert.equal(loaded.run.schemaVersion,5);
  assert.equal(loaded.run.lantern,0,'a migrated save is a Lantern 0 run');
  assert.deepEqual(loaded.run.pendingChoice.options,loaded.run.receipts[key].offeredIds);
  assert.deepEqual(readRouteSave(s),loaded,'repeated reads reproduce the exact migrated offer set');
});

test('readRouteSave chains a stored v1 save through v5 on load', () => {
  const s = fakeStorage();
  writeRouteSave(s, v1env(initRoute(SEED)));
  const loaded = readRouteSave(s);
  assert.ok(loaded, 'a v1 save loads');
  assert.equal(loaded.saveVersion, 5, 'as v5');
  assert.equal(loaded.run.schemaVersion,5);
  assert.equal(loaded.run.lantern,0);
  assert.equal(loaded.run.routeMode,'quick');
  assert.equal(loaded.run.metrics.partial,true);
  assert.ok(validRoute(loaded.run.route, genMap(SEED)), 'the migrated route revalidates');
  assert.equal(loaded.run.economy.board.length, 2);
  assert.ok(loaded.run.economy.board.every(w => Number.isInteger(w.iid)), 'wares stamped');
});

test('a v1 save from a stale generator is dropped, not migrated', () => {
  const s = fakeStorage();
  writeRouteSave(s, v1env(initRoute(SEED), {mapVersion: MAP_VERSION + 1}));
  assert.equal(readRouteSave(s), null);
  assert.equal(s.getItem(ROUTE_KEY), null, 'and removed');
});

test('a v4 envelope for every route phase round-trips and revalidates', () => {
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
    writeRouteSave(s, v2env(routeState));
    const loaded = readRouteSave(s);
    assert.ok(loaded, name + ' round-trips through storage');
    assert.deepEqual(loaded.run.route, routeState, name + ' route state survives the round trip');
    assert.ok(validRoute(loaded.run.route, genMap(SEED)), name + ' revalidates against a fresh map');
  }
});
