import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ANONE,ITEMS} from '../src/data.js';
import {createFight,makeItem,playerFightItems} from '../src/engine.js';

/* 0.97.0 synergy-count payoff wares. The hook layer cannot count board state
   directly, so each ware fakes a count two shipped ways: a plural-target action
   whose magnitude equals the matching ware count (Drummer), or a category
   activation frequency accumulated through every:N (Procession, March, Round).
   These behavior tests pin each proc against a constructed fight, in the same
   style as the R8 suites. */

let UID=970000;
function combatItem(over){
  return Object.assign({
    uid:UID++,nm:'Target',g:'g-sword',size:1,rarity:0,cat:'dmg',tier:1,
    cd:0,timer:0,alive:true,integ:100,maxI:100,fx:{},printedDmg:0,
    bulwark:false,targeting:null,charge:null,pocket:0,flying:false,frozen:0,
    disarmed:0,crit:0,rattle:null,selfdestruct:false,ammo:0,maxAmmo:0,
    lot:false,freezeOnce:0,cleanseTotal:0,hooks:null
  },over);
}
function ware(id,rarity){return playerFightItems([makeItem(id,rarity||0)],{},ANONE,1)[0];}
function side(items){return {nm:'Side',hp:200,items:items,lifesteal:0,regen:0};}
function fight(a,b){
  const F=createFight({a:side(a),b:side(b),seed:1,stormAt:999000,playerIs:'a'});
  F.secMark=100000;   /* park the per-second tick loop so poison/burn/regen do not fire */
  return F;
}

test('the four payoff wares are tier-2 non-unique shop stock that rides combat hooks',()=>{
  const expected={
    drummer:[2,2,'util',6],
    procession:[1,2,'poison',0],
    march:[1,2,'util',0],
    round:[1,2,'util',0]
  };
  for(const [id,row] of Object.entries(expected)){
    const def=ITEMS[id];
    assert.deepEqual([def.size,def.tier,def.cat,def.cd],row,id+' base card');
    assert.equal(def.acquisition,'shop',id+' is explicit shop stock');
    assert.equal(def.unique,undefined,id+' fuses on the standard ladder');
    assert.ok(Array.isArray(def.hooks)&&def.hooks.length>0,id+' rides combat hooks');
  }
});

test('Drummer of the Souk hastes every OTHER active blade once per beat, scaling with count',()=>{
  const bladeL=combatItem({nm:'Left blade',cat:'dmg',cd:100000,fx:{dmg:5}});
  const bladeR=combatItem({nm:'Right blade',cat:'dmg',cd:100000,fx:{dmg:5}});
  const F=fight([ware('drummer'),bladeL,bladeR],[combatItem({nm:'Wall',cd:9e9})]);
  const beat=F.step(6000);
  assert.equal(beat.filter(e=>e.k==='haste').length,2,'both blades hasted, one beat');
  assert.equal(bladeL.timer,6350,'a bronze beat is 0.35s of charge');
  assert.equal(bladeR.timer,6350);
  assert.equal(F.diagnostics.guardTrips,0);

  /* count-payoff: the effect magnitude is the matching blade count */
  const solo=combatItem({nm:'Lone blade',cat:'dmg',cd:100000,fx:{dmg:5}});
  const G=fight([ware('drummer'),solo],[combatItem({nm:'Wall',cd:9e9})]);
  assert.equal(G.step(6000).filter(e=>e.k==='haste').length,1,'one blade, one beat of thunder');

  /* rarity scales the pump: a silver beat is 0.5s */
  const silverBlade=combatItem({nm:'Silvered target',cat:'dmg',cd:100000,fx:{dmg:5}});
  const H=fight([ware('drummer',1),silverBlade],[combatItem({nm:'Wall',cd:9e9})]);
  H.step(6000);
  assert.equal(silverBlade.timer,6500,'silver drummer pumps 0.5s');
});

test('Poisoners\' Procession adds a poison on every third OTHER poison activation only',()=>{
  const ticker=combatItem({nm:'Poison beat',cat:'poison',cd:1000,fx:{}});
  const decoy=combatItem({nm:'Weapon beat',cat:'dmg',cd:1000,fx:{}});
  const F=fight([ware('procession'),ticker,decoy],[combatItem({nm:'Wall',cd:9e9,integ:200})]);
  F.step(1000);F.step(1000);
  assert.equal(F.b.pois,0,'the first two poison beats do not proc; the weapon beats never count');
  const third=F.step(1000);
  assert.equal(F.b.pois,1,'the third poison activation adds a bronze poison');
  assert.equal(third.filter(e=>e.k==='pois'&&e.side==='b'&&e.amt===1).length,1);
  assert.equal(F.diagnostics.guardTrips,0);
});

test('Torchbearers\' March adds a burn on every second OTHER burn activation',()=>{
  const ticker=combatItem({nm:'Burn beat',cat:'burn',cd:1000,fx:{}});
  const F=fight([ware('march'),ticker],[combatItem({nm:'Wall',cd:9e9,integ:200})]);
  F.step(1000);
  assert.equal(F.b.burn,0,'the first burn beat does not proc');
  const second=F.step(1000);
  assert.equal(F.b.burn,1,'the second burn activation adds a bronze burn');
  assert.equal(second.filter(e=>e.k==='burn'&&e.side==='b'&&e.amt===1).length,1);
  assert.equal(F.diagnostics.guardTrips,0);
});

test('Shieldwrights\' Round raises one more shield on every OTHER shield activation',()=>{
  const ticker=combatItem({nm:'Shield beat',cat:'shield',cd:1000,fx:{}});
  const F=fight([ware('round'),ticker],[combatItem({nm:'Wall',cd:9e9})]);
  const first=F.step(1000);
  assert.equal(F.a.shield,1,'one shield activation, one raised shield');
  assert.equal(first.filter(e=>e.k==='shield'&&e.side==='a'&&e.amt===1).length,1);
  F.step(1000);
  assert.equal(F.a.shield,2,'a second shield activation raises another');
  assert.equal(F.diagnostics.guardTrips,0);
});

test('the count fake stays inert with no matching wares to count',()=>{
  /* a poison-less board never advances the Procession counter, and a bladeless
     board gives the Drummer nothing to haste, so both are silent no-ops */
  const P=fight([ware('procession'),combatItem({nm:'Healer',cat:'heal',cd:1000,fx:{}})],[combatItem({nm:'Wall',cd:9e9})]);
  P.step(1000);P.step(1000);P.step(1000);
  assert.equal(P.b.pois,0,'no poison wares, no procession');
  const D=fight([ware('drummer'),combatItem({nm:'Shield',cat:'shield',cd:100000,fx:{}})],[combatItem({nm:'Wall',cd:9e9})]);
  assert.equal(D.step(6000).filter(e=>e.k==='haste').length,0,'no blades, no thunder');
  assert.equal(P.diagnostics.guardTrips,0);
  assert.equal(D.diagnostics.guardTrips,0);
});
