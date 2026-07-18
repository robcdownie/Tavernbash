import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ANOMALIES} from '../src/data.js';
import {mulberry} from '../src/engine.js';
import {STARTER_OMENS, omenUnlocked, settleUnlocks, readUnlockProfile, compatibleOmenPool, OMEN_HERO_INCOMPAT} from '../src/unlock-profile.js';

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
/* the 0.99.4 compat roll: mirrors newRoute's new order exactly. The eligible
   pool is shaped by compatibleOmenPool BEFORE the single draw (a replay keeps
   the full unlocked pool), and the draw still spends the same single rng() call,
   so the following cat shuffle stream never moves. */
function rollCompat(seed,storage,heroId,isReplay){
  const rng=mulberry(seed>>>0);
  const openAnoms=ANOMALIES.filter(function(a){return omenUnlocked(storage,a.id);});
  const basePool=openAnoms.length?openAnoms:ANOMALIES;
  const pickPool=isReplay?basePool:compatibleOmenPool(basePool,heroId);
  const drawIndex=Math.floor(rng()*ANOMALIES.length);
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
  /* 16 anomalies modulo 4 starters is exactly uniform: no starter can be skipped */
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

/* ---- Hero and Omen compatibility (Launch L2 0.99.4) ---- */

/* the pure helper: the block is data, drops only the incompatible id, and never
   empties the pool */
test('compatibleOmenPool drops the Apothecary block, keeps every other hero, and never empties the pool', ()=>{
  assert.deepEqual(OMEN_HERO_INCOMPAT.apoth,['moon'],'the recorded block is Apothecary vs Blood Moon');
  const full=ANOMALIES.slice();
  const apothPool=compatibleOmenPool(full,'apoth');
  assert.ok(apothPool.every(a=>a.id!=='moon'),'moon is dropped from the Apothecary pool');
  assert.equal(apothPool.length,full.length-1,'exactly one Omen (moon) is removed, order otherwise preserved');
  assert.deepEqual(apothPool.map(a=>a.id),full.filter(a=>a.id!=='moon').map(a=>a.id),'the surviving order is the source order minus moon');
  /* every other hero (and no hero) keeps the full pool by identity */
  assert.equal(compatibleOmenPool(full,'knife'),full,'a non-blocked hero keeps the exact pool reference');
  assert.equal(compatibleOmenPool(full,'kiln'),full,'another non-blocked hero keeps the exact pool reference');
  assert.equal(compatibleOmenPool(full,null),full,'no hero keeps the exact pool reference');
  /* a pool that is only the blocked Omen still resolves: the block is skipped so
     the roll is never dead (this is the guard the moon-only unlock relies on) */
  const moonOnly=ANOMALIES.filter(a=>a.id==='moon');
  assert.equal(compatibleOmenPool(moonOnly,'apoth'),moonOnly,'a moon-only pool falls back so the Apothecary still resolves');
});

/* requirement 4: a fresh random Apothecary run must exclude Blood Moon. At full
   unlock moon is eligible for everyone, yet the Apothecary never draws it. */
test('a fresh Apothecary run never rolls Blood Moon at full unlock, and the rest of the pool stays reachable', ()=>{
  withDebug(function(){
    const dev=fakeStore({'bb-unlocks-all':'1'});
    assert.equal(omenUnlocked(dev,'moon'),true,'moon is unlocked in the dev profile, so the exclusion is the only reason it is skipped');
    const seen=new Set();
    for(let seed=0;seed<600;seed++){
      const {omen}=rollCompat(seed,dev,'apoth',false);
      assert.notEqual(omen,'moon','seed '+seed+' opened the Apothecary under Blood Moon');
      seen.add(omen);
    }
    /* every other Omen is still reachable for the Apothecary: only moon is gone */
    for(const a of ANOMALIES){
      if(a.id==='moon')continue;
      assert.ok(seen.has(a.id),'Apothecary Omen '+a.id+' became unreachable');
    }
    assert.ok(!seen.has('moon'),'moon never appeared for the Apothecary');
  });
});

/* requirement 6: preserve deterministic selections for other heroes and Omens.
   A non-Apothecary fresh run is byte-identical to the pre-0.99.4 gated roll,
   including the cat shuffle stream, and Blood Moon is still reachable for it. */
test('non-Apothecary fresh runs are byte-identical to the pre-0.99.4 roll and still reach Blood Moon', ()=>{
  withDebug(function(){
    const dev=fakeStore({'bb-unlocks-all':'1'});
    let sawMoon=false;
    for(const seed of SEEDS){
      assert.deepEqual(rollCompat(seed,dev,'knife',false),rollGated(seed,dev),'knife seed '+seed+' pick and shuffle unchanged');
      assert.deepEqual(rollCompat(seed,dev,null,false),rollGated(seed,dev),'no-hero seed '+seed+' pick and shuffle unchanged');
    }
    for(let seed=0;seed<600;seed++){
      if(rollCompat(seed,dev,'knife',false).omen==='moon'){sawMoon=true;break;}
    }
    assert.ok(sawMoon,'Blood Moon is still reachable for a non-Apothecary hero');
  });
});

/* the exclusion consumes no rng: the Apothecary roll draws the same drawIndex and
   leaves the same following shuffle stream as the ungated single draw (no redraw,
   no extra draw). We check the cat stream matches the ungated roll for every seed. */
test('the Apothecary exclusion consumes no rng: the cat shuffle stream is unchanged', ()=>{
  withDebug(function(){
    const dev=fakeStore({'bb-unlocks-all':'1'});
    for(const seed of SEEDS){
      assert.deepEqual(rollCompat(seed,dev,'apoth',false).cats,rollUngated(seed).cats,'apoth seed '+seed+' shuffle stream unchanged (single rng draw)');
    }
  });
});

/* requirement 7: an explicit replay override of Apothecary plus Blood Moon still
   plays Blood Moon. The replay keeps the full pool AND the recorded Omen overrides
   the roll, so the exclusion cannot touch a recorded apoth+moon run. */
test('a replay preserves an Apothecary + Blood Moon run', ()=>{
  withDebug(function(){
    const dev=fakeStore({'bb-unlocks-all':'1'});
    /* the recorded Omen is looked up by id and overrides the roll (newRoute:
       anom = replayAnom || rolledAnom). Mirror that direct lookup. */
    const replayAnom=ANOMALIES.filter(a=>a.id==='moon')[0];
    assert.ok(replayAnom&&replayAnom.id==='moon','the recorded Blood Moon resolves for the replay');
    /* and even the roll pool is not narrowed on a replay: a replay Apothecary roll
       is byte-identical to the pre-0.99.4 gated roll, so nothing about the
       apoth+moon replay path depends on the exclusion */
    for(const seed of SEEDS){
      assert.deepEqual(rollCompat(seed,dev,'apoth',true),rollGated(seed,dev),'a replay Apothecary roll keeps the full unlocked pool');
    }
    /* the replay pool genuinely reaches Blood Moon (proving it is not narrowed),
       while the fresh Apothecary pool never does */
    let replaySawMoon=false,freshSawMoon=false;
    for(let seed=0;seed<600;seed++){
      if(rollCompat(seed,dev,'apoth',true).omen==='moon')replaySawMoon=true;
      if(rollCompat(seed,dev,'apoth',false).omen==='moon')freshSawMoon=true;
    }
    assert.ok(replaySawMoon,'a replay Apothecary roll can still land on Blood Moon');
    assert.ok(!freshSawMoon,'a fresh Apothecary roll never lands on Blood Moon');
  });
});
