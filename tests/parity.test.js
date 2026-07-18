import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import * as engine from '../src/engine.js';
import {ANONE,PERSONAS,ITEMS,MONSTERS,TRINKETS,ANOMALIES,RSTAT,RINTEG,COST,HEROES} from '../src/data.js';

/* Load the original single-file game in a vm sandbox. Its boot is guarded on
   typeof document, so only the logic and the BB export run. */
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const html=readFileSync(join(root,'bazaar-brawler.html'),'utf8');
const m=html.match(/<script>([\s\S]*)<\/script>/);
assert.ok(m,'original script block found');
const ctx=createContext({Math:Math,Date:Date,Object:Object});
runInContext('var globalThis=this;'+m[1],ctx);
const ORIG=ctx.BB;

/* The rebalance ledger. Every deliberate deviation from the original file
   is recorded here with its approval; anything NOT in this ledger must
   stay byte-identical, so accidental drift is still caught.
   2026-07-11, approved by Robbie from the balance harness readouts:
   - poison trim (poison was 39-45% of all merchant damage at every band):
     serpent poison 3 to 2, vial cooldown 3 to 3.5, venom poison 7 to 5
   - rival curve: genRival budget 9+round*5.5 becomes 8+(round-1)*6 so
     round 1 rivals build near player parity and converge by round 10 */
const REBALANCED_ITEMS={
  serpent:{cd:3.5,fx:{dmg:6,poison:2}},
  vial:{cd:3.5,fx:{poison:2}},
  venom:{cd:4.5,fx:{poison:5}},
  /* 2026-07-12, the clean hands pass, approved by Robbie: names that
     collided with The Bazaar or Dota properties were renamed */
  crossbow:{n:"Souk Crossbow"},
};
const RENAMED_MONSTERS={
  rats:{n:"Souk Rats"},
};
/* 0.80.0 corrects the Palace Quarter boss outlier. At 340 HP Ifrit lost
   99 percent of first attempts, making D3 easier than D2. */
const REBALANCED_MONSTERS={
  ifrit:{hp:500},
  /* 0.87.0: live Long runs cleared both Debt Collector appearances in 6.8
     to 16 seconds, so his printed baseline rises without changing scaling. */
  collector:{hp:200},
};
const RENAMED_TRINKETS={
  venomancer:{n:"Poisonmonger"},
  /* 0.77.0 restores the approved route Charm checkpoints. The old round
     income modifier keeps its value and lands after each combat victory. */
  prince:{d:"After each combat victory, gain +3 gold."},
};
/* R8 ware acquisition is explicit. Tier-2 combat glue enters the shop and
   fusion economy; the higher-tier engines remain unique Treasure rewards. */
const R8_WARES={
  viperverdict:{version:"0.69.0",batch:"weapons",acquisition:"treasure"},
  cinderhook:{version:"0.69.0",batch:"weapons",acquisition:"treasure"},
  brassreclaimer:{version:"0.69.0",batch:"weapons",acquisition:"treasure"},
  surgeonhook:{version:"0.69.0",batch:"weapons",acquisition:"shop"},
  sapperspick:{version:"0.69.0",batch:"weapons",acquisition:"shop"},
  blacklotuspress:{version:"0.70.0",batch:"poison",acquisition:"treasure"},
  serpentsdue:{version:"0.70.0",batch:"poison",acquisition:"treasure"},
  antidotethief:{version:"0.70.0",batch:"poison",acquisition:"treasure"},
  venomsiphon:{version:"0.70.0",batch:"poison",acquisition:"shop"},
  funeralbrazier:{version:"0.71.0",batch:"burn",acquisition:"treasure"},
  ashencenser:{version:"0.71.0",batch:"burn",acquisition:"treasure"},
  kilnchain:{version:"0.71.0",batch:"burn",acquisition:"shop"},
  phoenixbell:{version:"0.71.0",batch:"burn",acquisition:"treasure"},
  coinplatedram:{version:"0.72.0",batch:"shield",acquisition:"treasure"},
  mirrorbastion:{version:"0.72.0",batch:"shield",acquisition:"treasure"},
  saltward:{version:"0.72.0",batch:"shield",acquisition:"shop"},
  breakwaterbuckler:{version:"0.72.0",batch:"shield",acquisition:"treasure"},
  rosewaterpump:{version:"0.73.0",batch:"healing",acquisition:"shop"},
  chirurgeonsscissors:{version:"0.73.0",batch:"healing",acquisition:"shop"},
  bloodpricechalice:{version:"0.73.0",batch:"healing",acquisition:"treasure"},
  mendersbell:{version:"0.73.0",batch:"healing",acquisition:"treasure"},
  smoketaxstamp:{version:"0.74.0",batch:"utility",acquisition:"treasure"},
  peacebinderchain:{version:"0.74.0",batch:"utility",acquisition:"treasure"},
  gravebell:{version:"0.74.0",batch:"utility",acquisition:"treasure"},
  bazaarcompass:{version:"0.74.0",batch:"utility",acquisition:"treasure"},
};
/* 0.97.0 synergy-count payoff wares. Non-unique shop wares that join the shop
   and fusion economy (and the Treasure pool); recorded here on the R8_WARES
   pattern so the new-item rule below admits them as fusible shop stock. */
const PAYOFF_WARES={
  drummer:{version:"0.97.0",batch:"payoff",acquisition:"shop"},
  procession:{version:"0.97.0",batch:"payoff",acquisition:"shop"},
  march:{version:"0.97.0",batch:"payoff",acquisition:"shop"},
  round:{version:"0.97.0",batch:"payoff",acquisition:"shop"}
};
/* 0.99.0 signature wares. Two per hero, non-unique shop wares hero-gated by the
   `sig` field at every grant pool (design-build-identity.md, Part A). Recorded
   here on the R8_WARES/PAYOFF_WARES pattern so the new-item rule admits them as
   fusible shop stock; each also pins its owning hero so a def can never drift to
   another hero's pool. They never enter the Treasure pool (map.js excludes sig). */
const SIGNATURE_WARES={
  bellowsboy:{version:"0.99.0",hero:"kiln",acquisition:"shop"},
  cindertithe:{version:"0.99.0",hero:"kiln",acquisition:"shop"},
  attar:{version:"0.99.0",hero:"apoth",acquisition:"shop"},
  quicksilver:{version:"0.99.0",hero:"apoth",acquisition:"shop"},
  oilstone:{version:"0.99.0",hero:"knife",acquisition:"shop"},
  headsmansfee:{version:"0.99.0",hero:"knife",acquisition:"shop"},
  writ:{version:"0.99.0",hero:"lender",acquisition:"shop"},
  maul:{version:"0.99.0",hero:"lender",acquisition:"shop"},
  dartcase:{version:"0.99.0",hero:"venom",acquisition:"shop"},
  alembic:{version:"0.99.0",hero:"venom",acquisition:"shop"},
  plumbline:{version:"0.99.0",hero:"architect",acquisition:"shop"},
  keystone:{version:"0.99.0",hero:"architect",acquisition:"shop"},
  stiletto:{version:"0.99.0",hero:"silkblade",acquisition:"shop"},
  loom:{version:"0.99.0",hero:"silkblade",acquisition:"shop"},
  urn:{version:"0.99.0",hero:"ash",acquisition:"shop"},
  bonechime:{version:"0.99.0",hero:"ash",acquisition:"shop"}
};
/* The 0.76.0 Omen rework is an approved replacement of all eight legacy
   anomaly modifiers plus four additions. Pin the complete rule payload here so
   no later data edit can silently turn a benefit or cost off. */
const R8_OMEN_RULES={
  bull:{version:"0.76.0",m:{goldMul:1.5,shopItemCostFlat:1}},
  moon:{version:"0.76.0",m:{dmgMul:1.3,healingDisabled:true}},
  wildfire:{version:"0.76.0",m:{burnMul:2,healClearsAllBurn:true}},
  plague:{version:"0.76.0",m:{poisonMul:2,poisonDecayAfterTick:0.5}},
  molasses:{version:"0.76.0",m:{cdMul:1.2,startFullyChargedIfBaseCdAtLeast:5000}},
  overstock:{version:"0.76.0",m:{shopN:6,rerollCost:2}},
  fortified:{version:"0.76.0",m:{hpMul:1.3,stormStartOffsetMs:-5000}},
  rapid:{version:"0.76.0",m:{cdMul:0.85,activationSelfDamagePct:0.05}},
  narrow:{version:"0.76.0",m:{slotCountFlat:-2,sizeCostOverride:{3:2}}},
  glass:{version:"0.76.0",m:{itemIntegrityMul:0.6,firstDeathrattleDouble:true}},
  silent:{version:"0.76.0",m:{shopN:6,rerollDisabled:true,freezeDurationRounds:2}},
  auctionbell:{version:"0.76.0",m:{sellReturnsBaseCost:true,rerollCostPerSaleThisMarket:1}},
  deep:{version:"0.98.0",m:{shopN:6,shopItemCostFlat:1}},
  patient:{version:"0.98.0",m:{freezeDurationRounds:3,rerollCost:2}},
  lean:{version:"0.98.0",m:{shopN:3,sellReturnsBaseCost:true}},
  charter:{version:"0.98.0",m:{pinTag:"hero"}}
};

/* The byte-identical fight-for-fight parity test was retired on 2026-07-12.
   Its job was to prove the module extraction faithfully reproduced the
   original single-file game; it did that through 0.56. The stabilization
   pass then deliberately diverges the combat sim (poison decay, burn
   packets, weapon overflow, haste cap, lifesteal from damage dealt), so a
   byte-match against the original is no longer the goal. The data-table
   parity below still pins every original item/monster/trinket outside the
   rebalance ledger, and combat invariants now live in engine.test.js. */

test('parity: data tables identical to the original outside the rebalance ledger',()=>{
  const j=x=>JSON.parse(JSON.stringify(x));
  assert.deepEqual(j(RSTAT),j(ORIG.RSTAT));
  assert.deepEqual(j(RINTEG),j(ORIG.RINTEG));
  /* Every original item stays byte-identical unless the ledger records an
     approved retune. Only the exact R8 shop allowlist may be non-unique. */
  for(const k of Object.keys(ORIG.ITEMS)){
    const expected=Object.assign(j(ORIG.ITEMS[k]),j(REBALANCED_ITEMS[k]||{}));
    assert.deepEqual(j(ITEMS[k]),expected,'item '+k);
  }
  for(const k of Object.keys(ITEMS)){
    if(k in ORIG.ITEMS)continue;
    const shopLedgered=(R8_WARES[k]&&R8_WARES[k].acquisition==='shop')||PAYOFF_WARES[k]||SIGNATURE_WARES[k];
    if(shopLedgered)assert.equal(ITEMS[k].unique,undefined,'shop ware '+k+' must fuse');
    else assert.ok(ITEMS[k].unique,'new item '+k+' must be flagged unique or explicitly shop-ledgered');
  }
  for(const [id,entry] of Object.entries(PAYOFF_WARES)){
    assert.ok(ITEMS[id],'payoff ware '+id+' exists');
    assert.equal(ITEMS[id].acquisition,entry.acquisition,'payoff ware '+id+' acquisition');
    assert.equal(ITEMS[id].unique,undefined,'payoff ware '+id+' is non-unique');
    assert.ok(Array.isArray(ITEMS[id].hooks)&&ITEMS[id].hooks.length>0,'payoff ware '+id+' rides combat hooks');
  }
  /* every signature ware is ledgered, non-unique, shop-acquired, gated to a real
     hero, and every hero owns exactly two; a missing or extra sig id fails here */
  const sigInItems=Object.keys(ITEMS).filter(function(id){return ITEMS[id].sig;});
  assert.deepEqual(sigInItems.sort(),Object.keys(SIGNATURE_WARES).sort(),
    'every ITEMS sig ware has a SIGNATURE_WARES ledger entry and vice versa');
  const sigByHero={};
  for(const [id,entry] of Object.entries(SIGNATURE_WARES)){
    assert.ok(ITEMS[id],'signature ware '+id+' exists');
    assert.equal(ITEMS[id].acquisition,entry.acquisition,'signature ware '+id+' acquisition');
    assert.equal(ITEMS[id].unique,undefined,'signature ware '+id+' is non-unique');
    assert.equal(ITEMS[id].sig,entry.hero,'signature ware '+id+' is gated to '+entry.hero);
    assert.ok(HEROES.some(function(h){return h.id===entry.hero;}),'signature ware '+id+' names a real hero');
    sigByHero[entry.hero]=(sigByHero[entry.hero]||0)+1;
  }
  for(const h of HEROES)assert.equal(sigByHero[h.id],2,'hero '+h.id+' owns exactly two signature wares');
  for(const [id,entry] of Object.entries(R8_WARES)){
    assert.ok(ITEMS[id],'R8 ware '+id+' exists');
    assert.equal(ITEMS[id].acquisition,entry.acquisition,'R8 ware '+id+' acquisition');
    if(entry.acquisition==='treasure')assert.equal(ITEMS[id].unique,true,'Treasure ware '+id+' is unique');
    else assert.equal(ITEMS[id].unique,undefined,'shop ware '+id+' is non-unique');
  }
  assert.deepEqual(Object.keys(ITEMS).filter(id=>ITEMS[id].acquisition==='treasure').sort(),
    Object.keys(R8_WARES).filter(id=>R8_WARES[id].acquisition==='treasure').sort(),
    'every Treasure-only R8 ware has a parity-ledger entry');
  /* Phase 5 adds monsters the original never shipped; every monster the
     original did ship must stay byte-identical outside the rename ledger */
  for(const k of Object.keys(ORIG.MONSTERS)){
    const expected=Object.assign(j(ORIG.MONSTERS[k]),j(RENAMED_MONSTERS[k]||{}),j(REBALANCED_MONSTERS[k]||{}));
    assert.deepEqual(j(MONSTERS[k]),expected,'monster '+k);
  }
  for(const ot of ORIG.TRINKETS){
    const now=TRINKETS.filter(function(t){return t.id===ot.id;})[0];
    const expected=Object.assign(j(ot),j(RENAMED_TRINKETS[ot.id]||{}));
    assert.deepEqual(j(now),expected,'trinket '+ot.id);
  }
  assert.deepEqual(ANOMALIES.map(function(a){return a.id;}).sort(),Object.keys(R8_OMEN_RULES).sort(),
    'every R8 Omen has a parity-ledger entry');
  for(const omen of ANOMALIES){
    assert.deepEqual(j(omen.m),j(R8_OMEN_RULES[omen.id].m),'Omen '+omen.id+' rule payload');
    assert.ok(omen.n&&omen.g&&omen.d,'Omen '+omen.id+' has presentation data');
  }
  assert.deepEqual(j(PERSONAS),j(ORIG.PERSONAS));
  assert.deepEqual(j(ANONE),j(ORIG.ANONE));
});

test('rival curve: round 1 boards build from near player parity',()=>{
  for(let s=1;s<=20;s++){
    const rng=engine.mulberry(s*7);
    const rb=engine.genRival(1,PERSONAS[s%PERSONAS.length],rng,ANONE);
    const spent=rb.board.reduce((sum,it)=>sum+COST[ITEMS[it.id].size],0);
    assert.ok(spent<=8,'round 1 rival spent '+spent+' (budget 8)');
  }
});
