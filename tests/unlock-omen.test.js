import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ANOMALIES} from '../src/data.js';
import {mulberry} from '../src/engine.js';
import {STARTER_OMENS, omenUnlocked, settleUnlocks, readUnlockProfile} from '../src/unlock-profile.js';

/* Seam 3 pins (design-unlocks-0.92.md, "The five seams" item 3). ui.js is not
   importable headlessly (it pulls the DOM art/fx/sfx layers), so these tests
   exercise the real gate predicate omenUnlocked and mirror the exact omen roll
   ui.js performs in newRoute: ONE rng draw over the whole ANOMALIES array, then
   a modulo map into the unlocked pool, then shuffle(cats,rng). The load-bearing
   claim is that at full unlock the unlocked pool is ANOMALIES in its own order,
   so drawIndex%len equals drawIndex and both the pick and the following shuffle
   stream are byte-identical to the pre-seam roll. */

/* an injected localStorage stand-in, same shape as unlock-shop.test.js */
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

/* the exact shuffle from ui.js (a seeded Fisher-Yates) */
function shuffle(a,rng){for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));const t=a[i];a[i]=a[j];a[j]=t;}return a;}

/* the pre-seam roll: one draw over the whole array, then the cat shuffle */
function rollUngated(seed){
  const rng=mulberry(seed>>>0);
  const anom=ANOMALIES[Math.floor(rng()*ANOMALIES.length)];
  const cats=['dmg','poison','burn','shield','heal'];shuffle(cats,rng);
  return {omen:anom.id,cats:cats};
}
/* the seam roll: one draw, modulo into the unlocked pool, then the cat shuffle.
   Mirrors newRoute exactly, taking the same single rng() call. */
function rollGated(seed,storage){
  const rng=mulberry(seed>>>0);
  const drawIndex=Math.floor(rng()*ANOMALIES.length);
  const openAnoms=ANOMALIES.filter(function(a){return omenUnlocked(storage,a.id);});
  const pickPool=openAnoms.length?openAnoms:ANOMALIES;
  const anom=pickPool[drawIndex%pickPool.length];
  const cats=['dmg','poison','burn','shield','heal'];shuffle(cats,rng);
  return {omen:anom.id,cats:cats};
}

const SEEDS=[0,1,2,7,42,0xC0FFEE,0x9e3779b9,123456789,0xffffffff,314159,271828];

test('full unlock: the modulo pick equals the ungated pick and the shuffle stream is identical', ()=>{
  withDebug(function(){
    const dev=fakeStore({'bb-unlocks-all':'1'});
    /* the unlocked pool is ANOMALIES in its own order at full unlock */
    const open=ANOMALIES.filter(function(a){return omenUnlocked(dev,a.id);});
    assert.deepEqual(open.map(a=>a.id),ANOMALIES.map(a=>a.id),'full unlock leaves the pool in ANOMALIES order');
    for(const seed of SEEDS){
      assert.deepEqual(rollGated(seed,dev),rollUngated(seed),'seed '+seed+' pick and shuffle unchanged at full unlock');
    }
  });
});

test('four starters: the pick is always one of the four starter omens, and all four are reachable', ()=>{
  const s=fakeStore();                                   /* brand-new starter-only profile */
  const seen=new Set();
  for(let seed=0;seed<400;seed++){
    const {omen}=rollGated(seed,s);
    assert.ok(STARTER_OMENS.indexOf(omen)>=0,'seed '+seed+' rolled non-starter omen '+omen);
    seen.add(omen);
  }
  assert.equal(seen.size,STARTER_OMENS.length,'every starter omen is reachable');
  /* 12 anomalies modulo 4 starters is exactly uniform: no starter can be skipped */
  for(const id of STARTER_OMENS)assert.ok(seen.has(id),'starter '+id+' never rolled');
});

test('a starter-only roll never yields a locked omen', ()=>{
  const s=fakeStore();
  for(let seed=0;seed<500;seed++){
    const {omen}=rollGated(seed,s);
    assert.ok(omenUnlocked(s,omen),'seed '+seed+' rolled locked omen '+omen);
  }
});

test('a replay of a locked omen plays it but settleUnlocks does not record it as found', ()=>{
  const s=fakeStore();
  /* glass is a locked omen (its own trigger is three bosses beaten with no clear) */
  assert.equal(omenUnlocked(s,'glass'),false,'glass starts locked');

  /* the replay path pins the world: newRoute picks the recorded omen straight by
     id, so a locked pinned omen still plays. Mirror that direct-by-id lookup. */
  const pinned='glass';
  const replayAnom=ANOMALIES.filter(function(a){return a.id===pinned;})[0];
  assert.ok(replayAnom,'the pinned omen resolves and plays regardless of the gate');
  assert.equal(replayAnom.id,'glass','the replay plays the sealed omen');

  /* settling the finished replay must NOT grant that omen: no trigger keys off
     exposure, and this record does not satisfy glass' own condition (no bosses,
     not a clear). The one thing that fires here is rapid (finish first night). */
  const record={reportId:'rp-1',result:'loss',routeMode:'quick',lantern:0,
    setup:{heroId:'knife',omenId:'glass'},
    progress:{bossesBeaten:0},economy:{tier:2,board:[],vault:[]},
    metrics:{events:[],fights:[],wares:{}}};
  const newly=settleUnlocks(s,record);
  const ids=newly.map(function(x){return x.kind+':'+x.id;});
  assert.ok(ids.indexOf('omens:glass')<0,'the sealed replayed omen was not settled as found');
  assert.equal(omenUnlocked(s,'glass'),false,'glass stays locked after the replay settles');
  assert.equal(readUnlockProfile(s).omens.indexOf('glass'),-1,'glass is absent from the profile omen list');
  /* sanity: the run DID settle (rapid fires on the first finished night), so the
     non-grant of glass is the gate holding, not settlement silently no-opping */
  assert.ok(ids.indexOf('omens:rapid')>=0,'the first-night omen still settled normally');
});
