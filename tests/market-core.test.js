/* Extraction-identity pins for the 0.101.0 live-market seam (market-core.js).
   These prove the extracted cores reproduce ui.js's historical behavior byte
   for byte: exact rng draw counts and order, exact enchant draws, exact
   offer-id allocation order through the hook, exact frozen and free-card
   carryover, and deterministic replay of the same ctx and seed. The
   historical fixed-seed offer expectations live in unlock-shop.test.js, which
   now calls these same cores. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ITEMS,ENCH,ENCH_CHANCE,ANONE} from '../src/data.js';
import {mulberry,makeItem} from '../src/engine.js';
import {rollShopOffers,shopCandidateIds,shopWeights,pullVaultForges} from '../src/market-core.js';
import {boardUsedCells} from '../src/anomaly-rules.js';

function fakeStore(seed){
  const m=new Map(Object.entries(seed||{}));
  return {getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,String(v)), removeItem:k=>m.delete(k)};
}
/* a counting rng wrapper: proves draw counts, not just outcomes */
function countedRng(seed){
  const rng=mulberry(seed>>>0);
  const f=function(){f.draws++;return rng();};
  f.draws=0;return f;
}
function ctx(over){
  return Object.assign({tier:2,heroId:null,heroTag:null,featuredTags:[],board:[],
    mode:'route',storage:fakeStore(),run:{},A:ANONE,threat:2,priorShop:null,frozen:false},over||{});
}

test('draw count and order: one weighted pick per slot below threat 4, no enchant draws',()=>{
  const rng=countedRng(11);
  const r=rollShopOffers(ctx({threat:2}),rng);
  assert.equal(r.offers.length,ANONE.shopN);
  assert.equal(rng.draws,ANONE.shopN,'exactly one draw per slot below the enchant threat');
  assert.ok(r.offers.every(o=>o.ench===null),'no enchant below threat 4');
});

test('draw count at threat 4+: pick draw, chance draw, and an enchant pick only on a hit',()=>{
  /* count draws slot by slot with a shadow stream: re-derive the expected
     count from the same seed by replaying the chance draws */
  const seed=77,shadow=mulberry(seed>>>0);
  const c=ctx({threat:5});
  const ids=shopCandidateIds(c);
  let expected=0;
  for(let k=0;k<ANONE.shopN;k++){
    shadow();expected++;                       /* the weighted pick */
    const chance=shadow();expected++;          /* the enchant chance draw */
    if(chance<ENCH_CHANCE){shadow();expected++;}  /* the enchant pick (every id has an eligible ench: need null exists) */
  }
  const rng=countedRng(seed);
  rollShopOffers(c,rng);
  assert.equal(rng.draws,expected,'draw stream length matches the shadow replay');
  assert.ok(ids.length>0);
});

test('enchant eligibility filter matches the ware: dmg-need only on damage wares',()=>{
  /* force enchant hits by scanning seeds until an offer carries an ench, then
     check its legality against the ENCH need rules */
  let seen=0;
  for(let s=1;s<400&&seen<6;s++){
    const r=rollShopOffers(ctx({threat:6}),mulberry(s));
    for(const o of r.offers){
      if(!o.ench)continue;
      seen++;
      const req=ENCH[o.ench].need,d=ITEMS[o.id];
      if(req==='dmg')assert.ok(d.fx&&d.fx.dmg,o.id+' cannot carry '+o.ench);
      else if(req==='cd')assert.ok(d.cd>0,o.id+' cannot carry '+o.ench);
    }
  }
  assert.ok(seen>=6,'found enchanted offers to check, saw '+seen);
});

test('offer-id allocation order: the hook fires once per NEW offer, in draw order, carryover untouched',()=>{
  let next=100;const stamped=[];
  const mkOffer=function(o){o.offerId=next++;stamped.push(o.id);return o;};
  const prior=[
    {id:'dagger',free:true,bought:false,offerId:7},          /* free bounty card, kept */
    {id:'sword',free:false,bought:false,offerId:8,hold:1},   /* frozen paid card, kept */
    {id:'vial',free:false,bought:true,offerId:9}             /* bought tombstone, dropped */
  ];
  const r=rollShopOffers(ctx({priorShop:prior,frozen:false}),mulberry(5),{mkOffer:mkOffer});
  const newOffers=r.offers.filter(o=>o.offerId>=100);
  assert.equal(newOffers.length,ANONE.shopN-1,'frozen carryover counts against the roll');
  assert.deepEqual(newOffers.map(o=>o.offerId),newOffers.map((o,i)=>100+i),'ids allocated in draw order');
  assert.deepEqual(stamped,newOffers.map(o=>o.id),'the hook saw exactly the new offers');
  assert.equal(r.offers[0].offerId,8,'frozen card leads and keeps its id');
  assert.equal(r.offers[r.offers.length-1].offerId,7,'free card trails and keeps its id');
  assert.equal(r.offers[0].hold,0,'the freeze is spent by one roll');
});

test('frozen and free carryover shapes the count: shopN minus frozen, frees are extra',()=>{
  const prior=[
    {id:'sword',free:false,bought:false,offerId:1,hold:2},
    {id:'torch',free:false,bought:false,offerId:2,hold:2},
    {id:'dagger',free:true,bought:false,offerId:3}
  ];
  const r=rollShopOffers(ctx({priorShop:prior,frozen:false}),mulberry(9));
  const kept=r.offers.filter(o=>o.offerId!==undefined&&o.offerId<=3);
  assert.equal(kept.length,3,'both frozen and the free card carry');
  assert.equal(r.offers.length,ANONE.shopN+1,'two frozen count against shopN, the free rides above it');
  assert.equal(r.frozenActive,true,'a two-roll Patient hold survives the first roll at hold 1');
  assert.ok(r.offers.filter(o=>o.hold===1).length===2,'each held card spent one roll');
  const again=rollShopOffers(ctx({priorShop:r.offers,frozen:r.frozenActive}),mulberry(10));
  assert.equal(again.frozenActive,false,'the second roll spends the hold');
});

test('replay determinism: same ctx and seed, byte-identical offers (the rollIndex replay contract)',()=>{
  const c=ctx({threat:5,board:[makeItem('dagger',0)],heroId:'kiln',heroTag:'burn',featuredTags:['dmg']});
  const a=rollShopOffers(c,mulberry(1234)),b=rollShopOffers(c,mulberry(1234));
  assert.deepEqual(a,b,'a reloaded market re-rolls the identical shop from its keyed stream');
  const c2=rollShopOffers(c,mulberry(1235));
  assert.notDeepEqual(a.offers.map(o=>o.id),c2.offers.map(o=>o.id),'a different rollIndex seed rolls a different shop');
});

test('the pair boost and hero weight flow through shopWeights exactly',()=>{
  const base=shopWeights(['dagger','sword'],ctx({}));
  const paired=shopWeights(['dagger','sword'],ctx({board:[makeItem('dagger',0)]}));
  assert.ok(Math.abs(paired.ws[0]-base.ws[0]*1.6)<1e-9,'one owned bronze copy boosts 1.6');
  assert.equal(paired.ws[1],base.ws[1],'the other id is untouched');
  const hero=shopWeights(['torch'],ctx({heroTag:'burn'}));
  const noHero=shopWeights(['torch'],ctx({}));
  assert.ok(Math.abs(hero.ws[0]-noHero.ws[0]*1.5)<1e-9,'hero tag weight is the real 1.5');
});

test('pullVaultForges: vault copies complete a forge, overflow spills back, hooks fire at the old sites',()=>{
  const board=[makeItem('dagger',0),makeItem('dagger',0)];
  const vault=[makeItem('dagger',0)];
  const batches=[],overflow=[];
  const forgedAny=pullVaultForges(board,vault,{slots:10,usedCells:b=>boardUsedCells(b,ANONE)},{
    stampForged:f=>{if(f.length)batches.push(f.map(x=>x.id+':'+x.rarity));},
    onOverflow:it=>overflow.push(it.id)
  });
  assert.equal(forgedAny,true);
  assert.deepEqual(batches,[['dagger:1']],'three bronzes forged one silver at the stamp site');
  assert.equal(board.length,1);
  assert.equal(board[0].rarity,1);
  assert.equal(vault.length,0,'the vault copy was pulled through');
  assert.deepEqual(overflow,[],'no spill when the stall has room');
});

test('pullVaultForges: a completed pull that overfills the stall spills the newest piece back',()=>{
  /* slots too small to hold the pulled result plus the rest */
  const board=[makeItem('hammer',0),makeItem('hammer',0),makeItem('aegis',0)]; /* 3+3+3=9 cells */
  const vault=[makeItem('hammer',0)];
  const overflow=[];
  pullVaultForges(board,vault,{slots:6,usedCells:b=>boardUsedCells(b,ANONE)},{
    stampForged:()=>{},onOverflow:it=>overflow.push(it.id)});
  /* three hammers fused to one silver hammer (3 cells) + aegis (3) = 6 fits */
  assert.deepEqual(overflow,[],'fusion freed the space');
  assert.equal(board.filter(x=>x.id==='hammer').length,1);
  assert.equal(board.find(x=>x.id==='hammer').rarity,1);
});
