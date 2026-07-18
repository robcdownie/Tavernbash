import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  genMap, snapshotContentTables, contentTablesFor, treasureWareIds,
  CONTENT_EPOCH, MAP_VERSION
} from '../src/map.js';
import {newRun, serializeRun, reviveRun} from '../src/route-run.js';
import {readRouteSave, ROUTE_SAVE_VERSION, migrateV7toV8} from '../src/route-save.js';
import {ITEMS} from '../src/data.js';

const SEED = 0x1234abcd;

/* an in-memory Storage stub matching the browser API readRouteSave expects */
function memStore(initial){
  const m = new Map();
  if(initial) m.set('bb-route-run', JSON.stringify(initial));
  return {
    getItem(k){ return m.has(k) ? m.get(k) : null; },
    setItem(k, v){ m.set(k, String(v)); },
    removeItem(k){ m.delete(k); }
  };
}

test('threading the current epoch tables is byte-identical to the live generator', () => {
  const live = genMap(SEED, 'quick', 0);
  const withTables = genMap(SEED, 'quick', 0, snapshotContentTables());
  assert.deepEqual(withTables, live, 'current-epoch tables must reproduce the live map');
  const liveLong = genMap(SEED, 'long', 0);
  const withTablesLong = genMap(SEED, 'long', 0, snapshotContentTables());
  assert.deepEqual(withTablesLong, liveLong);
});

test('contentTablesFor the current epoch is live (null), so a fresh run is unchanged', () => {
  assert.equal(contentTablesFor(CONTENT_EPOCH), null);
  assert.equal(contentTablesFor(null), null);
  const viaHelper = genMap(SEED, 'quick', 0, contentTablesFor(CONTENT_EPOCH));
  assert.deepEqual(viaHelper, genMap(SEED, 'quick', 0));
});

test('a frozen epoch is immune to a new eligible ware; a new-epoch run sees it', () => {
  const frozen = snapshotContentTables();               /* freeze epoch 1 before the change */
  const before = genMap(SEED, 'quick', 0, frozen);
  const DUMMY = 'dummyepoch';
  assert.equal(ITEMS[DUMMY], undefined, 'test ware id must be unused');
  try {
    ITEMS[DUMMY] = {n:'Dummy Epoch Ware', g:'g-'+DUMMY, tier:1, cat:'dmg', size:1, dmg:1, cd:3};
    /* the live pool now carries the dummy; the frozen epoch-1 pool does not */
    assert.equal(treasureWareIds(1).includes(DUMMY), true, 'live pool gains the ware');
    assert.equal(frozen.treasure[1].includes(DUMMY), false, 'frozen epoch is immune');
    /* regenerating the epoch-1 run with its frozen tables is byte-identical */
    const after = genMap(SEED, 'quick', 0, frozen);
    assert.deepEqual(after, before, 'the frozen-epoch map must not move when content changes');
  } finally {
    delete ITEMS[DUMMY];
  }
  assert.equal(treasureWareIds(1).includes(DUMMY), false, 'cleanup restored the pool');
});

test('a run stamps its content epoch through serialize and revive', () => {
  const run = newRun({seed: SEED, routeMode: 'quick', lantern: 0, now: 0});
  assert.equal(run.contentEpoch, CONTENT_EPOCH);
  const wire = serializeRun(run);
  assert.equal(wire.contentEpoch, CONTENT_EPOCH);
  const back = reviveRun(wire);
  assert.equal(back.contentEpoch, CONTENT_EPOCH);
});

test('migrateV7toV8 stamps the baseline epoch and never retires', () => {
  const v7 = {saveVersion:7, mapVersion:MAP_VERSION, run:{schemaVersion:7, seed:SEED, routeMode:'quick', route:{}}};
  const v8 = migrateV7toV8(v7);
  assert.equal(v8.saveVersion, 8);
  assert.equal(v8.run.contentEpoch, 1);
  assert.equal(v8.mapVersion, MAP_VERSION, 'migration does not touch the map version');
});

test('readRouteSave keeps a current-map run and never retires on content epoch', () => {
  const save = {saveVersion:ROUTE_SAVE_VERSION, mapVersion:MAP_VERSION,
    run:{schemaVersion:8, seed:SEED, routeMode:'quick', route:{}, economy:{}, contentEpoch:1, ids:{nextItem:1}}};
  const got = readRouteSave(memStore(save));
  assert.notEqual(got, null);
  assert.equal(got.retired, undefined, 'a current-map run is not retired');
  assert.equal(got.run.contentEpoch, 1);
});

test('a v7 save migrates in place to a v8 content-epoch run without retiring', () => {
  const v7 = {saveVersion:7, mapVersion:MAP_VERSION,
    run:{schemaVersion:7, seed:SEED, routeMode:'quick', route:{}, economy:{}, ids:{nextItem:1}}};
  const got = readRouteSave(memStore(v7));
  assert.notEqual(got, null);
  assert.equal(got.retired, undefined);
  assert.equal(got.saveVersion, 8);
  assert.equal(got.run.contentEpoch, 1, 'the baseline epoch is stamped on migration');
});

test('only a stale map version retires a run, not a content change', () => {
  const stale = {saveVersion:ROUTE_SAVE_VERSION, mapVersion:MAP_VERSION - 1,
    run:{schemaVersion:8, seed:SEED, routeMode:'quick', route:{}, contentEpoch:1}};
  const got = readRouteSave(memStore(stale));
  assert.notEqual(got, null);
  assert.equal(got.retired, true);
  assert.equal(got.reason, 'map_updated');
});
