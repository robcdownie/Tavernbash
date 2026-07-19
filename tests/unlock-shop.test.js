import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ITEMS} from '../src/data.js';
import {gateOK, mulberry} from '../src/engine.js';
import {shopCandidateIds, rollShopOffers} from '../src/market-core.js';
import {
  STARTER_SHOP_WARES, LOCKED_START_WARES,
  lockedWareComplement, runWareAllowed, wareUnlocked, recordFound
} from '../src/unlock-profile.js';

/* Seam 2 identity pins (design-unlocks-0.92.md, "The five seams" item 2).
   0.101.0: the candidate filter and the weighted pick loop now come from the
   REAL extracted core (market-core.js shopCandidateIds and rollShopOffers,
   the same functions ui.js rollShop wraps), so these pins hold the live shop
   itself rather than a hand-kept mirror. Every expectation below is unchanged
   from the pre-seam file: the load-bearing claim is still that appending
   runWareAllowed to the filter leaves the ids array element-for-element
   identical at full unlock, which keeps the whole rng stream and every offer
   byte-identical. The ungated comparator mirrors the core's own filter minus
   only the runWareAllowed clause (including the signature-hero clause the
   core applies, null hero here, so signatures cancel on both sides exactly as
   they do in the live shop). */

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

/* the REAL rollShop candidate filter (market-core.js), with and without the
   unlock seam. heroId null matches the lobby-shape call these pins have
   always exercised. */
function candidateIds(tier, mode, storage, run){
  return shopCandidateIds({tier:tier,heroId:null,mode:mode,storage:storage,run:run});
}
function ungatedIds(tier, mode){
  return Object.keys(ITEMS).filter(function(id){
    return gateOK(ITEMS[id].tier,tier)&&!ITEMS[id].unique&&!ITEMS[id].sig&&(mode!=='route'||!ITEMS[id].inc);
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
/* the REAL weighted pick loop (market-core.js rollShopOffers, the exact code
   ui.js rollShop wraps), board empty, tags none, no hero, threat below the
   enchant gate so the draw stream is the pick stream. The n-slot shop rides
   ctx.A.shopN. If the ids array is unchanged the pick stream is unchanged, so
   this is the byte-identity of the offer set. */
function rollOffers(storage, run, tier, seed, n){
  const r=rollShopOffers({tier:tier,heroId:null,heroTag:null,featuredTags:[],board:[],
    mode:'route',storage:storage,run:run,A:{shopN:n},threat:2,priorShop:null,frozen:false},
    mulberry(seed>>>0));
  return r.offers.map(function(o){return o.id;});
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
      /* the ungated stream rides a legacy run ({}): no wareLock snapshot
         grandfathers to the full pool through the same real core */
      assert.deepEqual(rollOffers(dev,run,tier,0xC0FFEE,16),rollOffers(dev,{},tier,0xC0FFEE,16),'tier '+tier+' offer stream unchanged');
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
  const streamBefore=rollOffers(s,run,6,777,12);
  assert.equal(wareUnlocked(s,'kilnchain'),false,'kilnchain starts locked');
  /* the player unlocks a ware mid-life, so the LIVE verdict now differs */
  recordFound(s,'wares','kilnchain');
  assert.ok(wareUnlocked(s,'kilnchain'),'the live profile now admits kilnchain');
  const live=candidateIds(6,'route',s,null);          /* live path: admits it */
  const after=candidateIds(6,'route',s,run);          /* frozen snapshot: unchanged */
  assert.ok(live.indexOf('kilnchain')>=0,'the live pool admits the newly unlocked ware');
  assert.ok(after.indexOf('kilnchain')<0,'the frozen run still excludes it');
  assert.deepEqual(after,before,'the resumed run rolls from the exact same pool');
  assert.deepEqual(rollOffers(s,run,6,777,12),streamBefore,'and the seeded offer stream is unchanged');
});

test('a pre-0.92 run with no snapshot is grandfathered to the full pool', ()=>{
  const s=fakeStore();                                 /* starter-only live profile */
  const legacyRun={};                                  /* revived pre-0.92 run: no wareLock */
  assert.equal(legacyRun.wareLock,undefined);
  const grandfathered=candidateIds(6,'route',s,legacyRun);
  assert.deepEqual(grandfathered,ungatedIds(6,'route'),'no snapshot means the full pool, gate exempt');
  for(const id of LOCKED_START_WARES)assert.ok(grandfathered.indexOf(id)>=0,'a legacy run keeps its locked wares');
});
