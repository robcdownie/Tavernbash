import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ITEMS, shopTagWeight} from '../src/data.js';
import {gateOK, mulberry} from '../src/engine.js';
import {
  STARTER_SHOP_WARES, LOCKED_START_WARES,
  lockedWareComplement, runWareAllowed, wareUnlocked, recordFound
} from '../src/unlock-profile.js';

/* Seam 2 identity pins (design-unlocks-0.92.md, "The five seams" item 2).
   ui.js is not importable headlessly (it pulls in the DOM art/fx/sfx layers),
   so these tests exercise the real filter predicate runWareAllowed and mirror
   the exact candidate-id and opening-offense filters ui.js applies, plus the
   real weighted pick loop from rollShop. The load-bearing claim is that
   appending runWareAllowed to the filter leaves the ids array element-for-
   element identical at full unlock, which keeps the whole rng stream and every
   offer byte-identical. */

/* an injected localStorage stand-in, same shape as unlock-profile.test.js */
function fakeStore(seed){
  const m=new Map(Object.entries(seed||{}));
  return {getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,String(v)), removeItem:k=>m.delete(k), _m:m};
}
/* run the body with ?debug present so devAllOpen can see it, then restore */
function withDebug(fn){
  const realLoc=globalThis.location;
  globalThis.location={search:'?debug'};
  try{return fn();}
  finally{ if(realLoc===undefined)delete globalThis.location; else globalThis.location=realLoc; }
}

/* the exact rollShop candidate filter (ui.js), with and without the seam */
function candidateIds(tier, mode, storage, run){
  return Object.keys(ITEMS).filter(function(id){
    return gateOK(ITEMS[id].tier,tier)&&!ITEMS[id].unique&&(mode!=='route'||!ITEMS[id].inc)&&runWareAllowed(storage,run,id);
  });
}
function ungatedIds(tier, mode){
  return Object.keys(ITEMS).filter(function(id){
    return gateOK(ITEMS[id].tier,tier)&&!ITEMS[id].unique&&(mode!=='route'||!ITEMS[id].inc);
  });
}
/* the exact ensureOpeningOffense pool filter (ui.js), with and without the seam */
const OFF=['dmg','poison','burn'];
function openingPool(storage, run){
  return Object.keys(ITEMS).filter(function(id){
    return gateOK(ITEMS[id].tier,1)&&OFF.indexOf(ITEMS[id].cat)>=0&&ITEMS[id].size===1&&!ITEMS[id].unique&&!ITEMS[id].inc&&runWareAllowed(storage,run,id);
  });
}
function openingPoolUngated(){
  return Object.keys(ITEMS).filter(function(id){
    return gateOK(ITEMS[id].tier,1)&&OFF.indexOf(ITEMS[id].cat)>=0&&ITEMS[id].size===1&&!ITEMS[id].unique&&!ITEMS[id].inc;
  });
}
/* rollShop's weighted single-pick loop (board empty, tags none, no hero), the
   sequence of offered ids for a fixed seed. If the ids array is unchanged the
   pick stream is unchanged, so this is the byte-identity of the offer set. */
function rollOffers(ids, seed, n){
  const rng=mulberry(seed>>>0), out=[];
  for(let k=0;k<n;k++){
    let tot=0;
    const ws=ids.map(function(id){
      const d=ITEMS[id];
      let w=d.tier===1?8:(d.tier===2?7:6);
      w*=shopTagWeight(d.cat,[],null);
      tot+=w;return w;
    });
    let r=rng()*tot,pick=ids[0];
    for(let i=0;i<ids.length;i++){r-=ws[i];if(r<=0){pick=ids[i];break;}}
    out.push(pick);
  }
  return out;
}

test('full unlock: shop candidate ids equal the ungated ids at every tier', ()=>{
  withDebug(function(){
    const dev=fakeStore({'bb-unlocks-all':'1'});
    assert.deepEqual(lockedWareComplement(dev),[],'full unlock leaves nothing in the locked complement');
    /* a run built at full unlock carries an empty snapshot: the full pool */
    const run={wareLock:lockedWareComplement(dev)};
    for(const tier of [1,2,3,4,5,6]){
      assert.deepEqual(candidateIds(tier,'route',dev,null),ungatedIds(tier,'route'),'tier '+tier+' via live dev verdict');
      assert.deepEqual(candidateIds(tier,'route',dev,run),ungatedIds(tier,'route'),'tier '+tier+' via empty snapshot');
    }
  });
});

test('full unlock: a fixed-seed offer sequence is byte-identical to ungated', ()=>{
  withDebug(function(){
    const dev=fakeStore({'bb-unlocks-all':'1'});
    const run={wareLock:lockedWareComplement(dev)};
    for(const tier of [1,2,6]){
      const gated=candidateIds(tier,'route',dev,run);
      const ungated=ungatedIds(tier,'route');
      assert.deepEqual(gated,ungated);
      assert.deepEqual(rollOffers(gated,0xC0FFEE,16),rollOffers(ungated,0xC0FFEE,16),'tier '+tier+' offer stream unchanged');
    }
  });
});

test('opening-offense pool is identical at full unlock and never holds a locked ware', ()=>{
  withDebug(function(){
    const dev=fakeStore({'bb-unlocks-all':'1'});
    assert.deepEqual(openingPool(dev,{wareLock:lockedWareComplement(dev)}),openingPoolUngated(),'full-unlock opening pool unchanged');
    assert.deepEqual(openingPool(dev,null),openingPoolUngated());
  });
  /* the invariant that matters most: at ANY unlock state the opening pool never
     offers a locked-start ware (the ensureOpeningOffense catch in the spec) */
  const states=[
    fakeStore(),                                                       /* brand-new starter-only */
    fakeStore({'bb-unlocks':'{"wares":["kilnchain","saltward"]}'}),    /* partial unlock */
  ];
  for(const s of states){
    for(const run of [null,{wareLock:lockedWareComplement(s)}]){
      for(const id of openingPool(s,run))assert.ok(LOCKED_START_WARES.indexOf(id)<0,'opening pool leaked locked '+id);
    }
  }
  /* even the ungated full pool never holds a locked-start ware here, because all
     seven are tier 2 and the opening pool gates to tier 1: the tier and the
     filter agree, so no future starter-list edit can leak one */
  for(const id of openingPoolUngated())assert.ok(LOCKED_START_WARES.indexOf(id)<0);
});

test('a starter-only profile never rolls a locked shop id', ()=>{
  const s=fakeStore();
  for(const run of [null,{wareLock:lockedWareComplement(s)}]){
    for(const tier of [1,2,3,4,5,6]){
      const ids=candidateIds(tier,'route',s,run);
      for(const id of LOCKED_START_WARES)assert.ok(ids.indexOf(id)<0,'tier '+tier+' rolled locked '+id);
      for(const id of STARTER_SHOP_WARES){
        if(gateOK(ITEMS[id].tier,tier))assert.ok(ids.indexOf(id)>=0,'tier '+tier+' dropped starter '+id);
      }
    }
  }
  /* the filter is doing real work: the seven locked wares are tier 2, so the
     ungated pool at tier 2 DOES contain them */
  const ung=ungatedIds(2,'route');
  assert.ok(LOCKED_START_WARES.every(id=>ung.indexOf(id)>=0),'ungated tier-2 pool holds every locked R8 ware');
});

test('a resumed run replays its frozen shop even after the profile changes', ()=>{
  const s=fakeStore();
  const run={wareLock:lockedWareComplement(s)};       /* the starter-era complement */
  const before=candidateIds(6,'route',s,run);
  assert.equal(wareUnlocked(s,'kilnchain'),false,'kilnchain starts locked');
  /* the player unlocks a ware mid-life, so the LIVE verdict now differs */
  recordFound(s,'wares','kilnchain');
  assert.ok(wareUnlocked(s,'kilnchain'),'the live profile now admits kilnchain');
  const live=candidateIds(6,'route',s,null);          /* live path: admits it */
  const after=candidateIds(6,'route',s,run);          /* frozen snapshot: unchanged */
  assert.ok(live.indexOf('kilnchain')>=0,'the live pool admits the newly unlocked ware');
  assert.ok(after.indexOf('kilnchain')<0,'the frozen run still excludes it');
  assert.deepEqual(after,before,'the resumed run rolls from the exact same pool');
  assert.deepEqual(rollOffers(after,777,12),rollOffers(before,777,12),'and the seeded offer stream is unchanged');
});

test('a pre-0.92 run with no snapshot is grandfathered to the full pool', ()=>{
  const s=fakeStore();                                 /* starter-only live profile */
  const legacyRun={};                                  /* revived pre-0.92 run: no wareLock */
  assert.equal(legacyRun.wareLock,undefined);
  const grandfathered=candidateIds(6,'route',s,legacyRun);
  assert.deepEqual(grandfathered,ungatedIds(6,'route'),'no snapshot means the full pool, gate exempt');
  for(const id of LOCKED_START_WARES)assert.ok(grandfathered.indexOf(id)>=0,'a legacy run keeps its locked wares');
});
