import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ITEMS} from '../src/data.js';
import {gateOK} from '../src/engine.js';
import {
  STARTER_HEROES, STARTER_OMENS, STARTER_SHOP_WARES, LOCKED_START_WARES,
  starterShopIds, heroUnlocked, omenUnlocked, wareUnlocked,
  readUnlockProfile, initUnlockProfile, recordFound, settleUnlocks, devAllOpen
} from '../src/unlock-profile.js';

/* an injected localStorage stand-in */
function fakeStore(seed){
  const m=new Map(Object.entries(seed||{}));
  return {getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,String(v)), removeItem:k=>m.delete(k), _m:m};
}
/* a minimal finished run record shaped like route-report.js buildRunRecord */
function rec(over){
  return Object.assign({
    reportId:'r'+Math.random(), result:'loss', routeMode:'quick', lantern:0,
    setup:{heroId:'kiln'}, progress:{districtId:1,bossesBeaten:0},
    economy:{tier:1,board:[],vault:[]},
    metrics:{events:[],fights:[],wares:{}}
  }, over||{});
}
const fusion=(id,rarity)=>({type:'fusion',data:{id,rarity}});

test('the starter and locked lists reconcile with the real route shop pool',()=>{
  /* signature wares are hero-gated identity, not part of the starter/locked shop
     accounting (they never seal), so the reconcile pool excludes them */
  const fullPool=Object.keys(ITEMS).filter(id=>gateOK(ITEMS[id].tier,6)&&!ITEMS[id].unique&&!ITEMS[id].sig&&!ITEMS[id].inc).sort();
  const combined=STARTER_SHOP_WARES.concat(LOCKED_START_WARES).sort();
  assert.deepEqual(combined,fullPool,'starter 24 + locked 11 must equal the full non-unique non-inc shop pool');
  assert.equal(STARTER_SHOP_WARES.length,24);
  assert.equal(LOCKED_START_WARES.length,11);
  assert.equal(new Set(combined).size,combined.length,'no id appears in both lists');
  for(const id of STARTER_SHOP_WARES)assert.ok(ITEMS[id],'starter ware '+id+' exists');
  for(const id of LOCKED_START_WARES)assert.ok(ITEMS[id]&&!ITEMS[id].unique,'locked ware '+id+' exists and is non-unique');
});

test('with no profile, only starters read as unlocked',()=>{
  const s=fakeStore();
  assert.equal(STARTER_HEROES.length,3);
  assert.equal(STARTER_OMENS.length,4);
  for(const h of STARTER_HEROES)assert.ok(heroUnlocked(s,h));
  for(const h of ['lender','architect','venom','silkblade','ash'])assert.equal(heroUnlocked(s,h),false);
  for(const o of STARTER_OMENS)assert.ok(omenUnlocked(s,o));
  for(const o of ['moon','rapid','plague','fortified','narrow','silent','glass','auctionbell','deep','patient','lean','charter'])assert.equal(omenUnlocked(s,o),false);
  for(const w of STARTER_SHOP_WARES)assert.ok(wareUnlocked(s,w));
  for(const w of LOCKED_START_WARES)assert.equal(wareUnlocked(s,w),false);
  assert.deepEqual(starterShopIds(),STARTER_SHOP_WARES);
});

test('pre-0.92 history grants nothing: counters start at zero',()=>{
  const s=fakeStore();
  const p=initUnlockProfile(s,{runs:200,clears:40,createdAt:'x'});
  assert.equal(p.epoch.runs,200,'epoch snapshots lifetime totals for provenance');
  assert.equal(p.runs,0,'post-epoch counter starts at zero regardless of history');
  assert.equal(heroUnlocked(s,'lender'),false,'a rich history unlocks no count-gated hero');
});

test('finishing nights fires the count triggers on the right night',()=>{
  const s=fakeStore();
  let got=settleUnlocks(s,rec({reportId:'n1'}));
  assert.ok(got.some(u=>u.id==='rapid'),'first night unlocks Rapid Trade');
  assert.equal(heroUnlocked(s,'lender'),false,'Moneylender needs 3 nights');
  settleUnlocks(s,rec({reportId:'n2'}));
  got=settleUnlocks(s,rec({reportId:'n3'}));
  assert.ok(got.some(u=>u.id==='lender'),'third night unlocks the Moneylender');
  assert.ok(got.some(u=>u.id==='moon'),'third night unlocks Blood Moon');
  assert.ok(heroUnlocked(s,'lender'));
});

test('forge triggers read fusion events and cat, gild does not count',()=>{
  const s=fakeStore();
  settleUnlocks(s,rec({reportId:'f1',metrics:{events:[fusion('torch',1)],fights:[],wares:{}}}));
  assert.ok(wareUnlocked(s,'kilnchain'),'a burn silver forges Kiln Chain');
  assert.ok(wareUnlocked(s,'rosewaterpump'),'any silver forges Rosewater Pump');
  assert.equal(wareUnlocked(s,'sapperspick'),false,'gold needs rarity 2');
  settleUnlocks(s,rec({reportId:'f2',metrics:{events:[fusion('sword',2)],fights:[],wares:{}}}));
  assert.ok(wareUnlocked(s,'sapperspick'),'a gold forges Sapper’s Pick');
  const s2=fakeStore();
  settleUnlocks(s2,rec({reportId:'d1',metrics:{events:[fusion('dagger',1)],fights:[],wares:{}}}));
  assert.equal(wareUnlocked(s2,'kilnchain'),false,'a non-burn silver does not fire the burn-cat trigger');
  assert.ok(wareUnlocked(s2,'rosewaterpump'),'but any silver still forges Rosewater Pump');
});

test('record-field triggers: board rarity, district, tier, kills, poison, clears',()=>{
  const s=fakeStore();
  settleUnlocks(s,rec({reportId:'a',economy:{tier:4,board:[{rarity:2}],vault:[]},progress:{districtId:3,bossesBeaten:1}}));
  assert.ok(wareUnlocked(s,'saltward'),'a held Gold ware unlocks Salt Ward');
  assert.ok(heroUnlocked(s,'architect'),'reaching the Palace Quarter unlocks the Architect');
  assert.ok(omenUnlocked(s,'fortified'),'ending at Tier 4 unlocks Fortified');
  const s2=fakeStore();
  settleUnlocks(s2,rec({reportId:'k',metrics:{events:[],fights:[{monsterId:'shahmaran',winner:'a'}],wares:{}}}));
  assert.ok(wareUnlocked(s2,'venomsiphon'),'slaying Shahmaran unlocks Venom Siphon');
  const s3=fakeStore();
  settleUnlocks(s3,rec({reportId:'p',metrics:{events:[],fights:[],wares:{v:{damage:{poison:60}}}}}));
  assert.ok(omenUnlocked(s3,'plague'),'60 poison applied unlocks Plague Winds');
});

test('Glass Night wants a deep loss, not a clear',()=>{
  const s=fakeStore();
  settleUnlocks(s,rec({reportId:'g',result:'win',progress:{districtId:4,bossesBeaten:3}}));
  assert.equal(omenUnlocked(s,'glass'),false,'a clear that beat 3 masters does not fire Glass Night');
  const s2=fakeStore();
  settleUnlocks(s2,rec({reportId:'g2',result:'loss',progress:{districtId:4,bossesBeaten:3}}));
  assert.ok(omenUnlocked(s2,'glass'),'3 masters felled without a clear fires Glass Night');
});

test('lantern and long-clear triggers',()=>{
  const s=fakeStore();
  settleUnlocks(s,rec({reportId:'c1',result:'win',lantern:1}));
  assert.ok(wareUnlocked(s,'surgeonhook'),'any clear unlocks Surgeon’s Hook');
  assert.ok(heroUnlocked(s,'silkblade'),'a Lantern 1 clear unlocks the Silkblade');
  assert.equal(omenUnlocked(s,'narrow'),false,'Narrow Alleys needs Lantern 2');
  const s2=fakeStore();
  settleUnlocks(s2,rec({reportId:'l',result:'long_clear',routeMode:'long'}));
  assert.ok(heroUnlocked(s2,'ash'),'a Long Bazaar clear unlocks the Ash Collector');
});

test('three different merchants clear unlocks Silent Bazaar',()=>{
  const s=fakeStore();
  settleUnlocks(s,rec({reportId:'m1',result:'win',setup:{heroId:'kiln'}}));
  settleUnlocks(s,rec({reportId:'m2',result:'win',setup:{heroId:'knife'}}));
  assert.equal(omenUnlocked(s,'silent'),false,'two merchants is not enough');
  settleUnlocks(s,rec({reportId:'m3',result:'win',setup:{heroId:'apoth'}}));
  assert.ok(omenUnlocked(s,'silent'),'three distinct clearing merchants unlocks Silent Bazaar');
});

test('settlement is idempotent across a won-run resume',()=>{
  const s=fakeStore();
  const r=rec({reportId:'once'});
  const a=settleUnlocks(s,r);
  assert.ok(a.some(u=>u.id==='rapid'));
  const b=settleUnlocks(s,r);
  assert.deepEqual(b,[],'re-settling the same reportId unlocks nothing again');
  assert.equal(readUnlockProfile(s).runs,1,'the run counter did not double');
});

test('the settled ledger is capped and pruned newest-first',()=>{
  const s=fakeStore();
  for(let i=0;i<40;i++)settleUnlocks(s,rec({reportId:'run'+i,result:'loss'}));
  const p=readUnlockProfile(s);
  assert.equal(p.settled.length,32,'ledger caps at 32');
  assert.equal(p.settled[p.settled.length-1],'run39','newest reportId retained');
  assert.equal(p.runs,40,'the run counter still counts every settled run');
});

test('garbage in bb-unlocks is tolerated',()=>{
  assert.doesNotThrow(()=>readUnlockProfile(fakeStore({'bb-unlocks':'not json'})));
  assert.deepEqual(readUnlockProfile(fakeStore({'bb-unlocks':'null'})).heroes,[]);
  const s=fakeStore({'bb-unlocks':'{"heroes":[1,2,"lender"],"runs":"5"}'});
  assert.deepEqual(readUnlockProfile(s).heroes,['lender'],'non-string entries dropped');
  assert.equal(readUnlockProfile(s).runs,5,'a numeric string count is coerced');
});

test('recordFound is monotonic for wild-found uniques',()=>{
  const s=fakeStore();
  assert.equal(wareUnlocked(s,'serpentcrown'),false);
  assert.ok(recordFound(s,'wares','serpentcrown'));
  assert.ok(wareUnlocked(s,'serpentcrown'),'a found unique reads unlocked');
  assert.ok(recordFound(s,'wares','serpentcrown'),'re-finding is a monotonic no-op');
  assert.equal(readUnlockProfile(s).wares.filter(x=>x==='serpentcrown').length,1,'no duplicate');
  assert.equal(recordFound(s,'bogus','x'),false,'unknown kind refused');
});

test('dev mode opens everything and writes nothing',()=>{
  const s=fakeStore({'bb-unlocks-all':'1'});
  const realLoc=globalThis.location;
  globalThis.location={search:'?debug'};
  try{
    assert.ok(devAllOpen(s));
    assert.ok(heroUnlocked(s,'ash')&&omenUnlocked(s,'silent')&&wareUnlocked(s,'saltward'));
    assert.deepEqual(settleUnlocks(s,rec({reportId:'dev',result:'win'})),[],'dev settle unlocks nothing');
    assert.equal(readUnlockProfile(s).runs,0,'dev settle wrote nothing');
  }finally{ if(realLoc===undefined)delete globalThis.location; else globalThis.location=realLoc; }
});
