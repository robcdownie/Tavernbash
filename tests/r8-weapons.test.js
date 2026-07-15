import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ANONE,ITEMS} from '../src/data.js';
import {createFight,makeItem,playerFightItems} from '../src/engine.js';

let UID=900000;
function combatItem(over){
  return Object.assign({
    uid:UID++,nm:'Target',g:'g-sword',size:1,rarity:0,cat:'dmg',tier:1,
    cd:0,timer:0,alive:true,integ:100,maxI:100,fx:{},bulwark:false,
    targeting:null,charge:null,pocket:0,flying:false,frozen:0,crit:0,
    rattle:null,selfdestruct:false,ammo:0,maxAmmo:0,lot:false,freezeOnce:0,
    hooks:null
  },over);
}
function ware(id,rarity){
  return playerFightItems([makeItem(id,rarity||0)],{},ANONE,1)[0];
}
function side(items){return {nm:'Side',hp:100,items:items,lifesteal:0,regen:0};}
function fight(a,b){
  return createFight({a:side(a),b:side(b),seed:1,stormAt:999000,playerIs:'a'});
}

test('R8 weapon bridge data matches the approved base cards',()=>{
  const expected={
    viperverdict:[2,3,'dmg',4.5,16],
    cinderhook:[2,3,'dmg',4,14],
    brassreclaimer:[3,3,'dmg',5.5,30],
    surgeonhook:[1,2,'dmg',3.5,7],
    sapperspick:[1,2,'dmg',3,6]
  };
  for(const [id,row] of Object.entries(expected)){
    const def=ITEMS[id];
    assert.deepEqual([def.size,def.tier,def.cat,def.cd,def.fx.dmg],row,id+' base card');
    assert.ok(Array.isArray(def.hooks)&&def.hooks.length>0,id+' rides combat hooks');
  }
});

test("Viper's Verdict gains capped poison damage only against items",()=>{
  const target=combatItem({integ:50,maxI:50});
  const F=fight([ware('viperverdict')],[target]);F.b.pois=39;F.secMark=4500;
  const events=F.step(4500);
  assert.equal(events.find(e=>e.k==='chip').amt,24,'16 base plus the capped 8 bonus');
  assert.equal(target.integ,26);

  const merchant=fight([ware('viperverdict')],[]);merchant.b.pois=39;merchant.secMark=4500;
  merchant.step(4500);
  assert.equal(merchant.b.hp,84,'merchant damage stays at the printed value');
  assert.equal(merchant.diagnostics.guardTrips,0);
});

test('Cinderhook converts actual overkill and consumes one enemy burn',()=>{
  const first=combatItem({integ:8,maxI:8});
  const second=combatItem({integ:100,maxI:100});
  const F=fight([ware('cinderhook',1)],[first,second]);F.b.burn=2;F.secMark=4000;
  const events=F.step(4000);
  assert.equal(first.alive,false);
  assert.equal(second.integ,90,'normal Medium overflow continues after the hook subtree');
  assert.deepEqual(events.filter(e=>e.k==='hhit').map(e=>e.amt),[7]);
  assert.equal(F.b.hp,93,'35 percent of 20 overkill reaches the merchant');
  assert.equal(F.b.burn,1);
  assert.equal(F.diagnostics.guardTrips,0);
});

test('Brass Reclaimer caps shield per activation and resets that cap next activation',()=>{
  const targets=[5,5,5,35].map(integ=>combatItem({integ:integ,maxI:integ}));
  const F=fight([ware('brassreclaimer')],targets);
  const first=F.step(5500);
  assert.deepEqual(first.filter(e=>e.k==='shield').map(e=>e.amt),[13,2]);
  assert.equal(F.a.shield,15);
  assert.equal(targets[3].integ,20);

  const second=F.step(5500);
  assert.deepEqual(second.filter(e=>e.k==='shield').map(e=>e.amt),[5]);
  assert.equal(F.a.shield,20,'the new activation owns a fresh 15 shield allowance');
  assert.equal(F.diagnostics.guardTrips,0);
});

test("Surgeon's Hook refreshes one Wound and Wound reduces received healing",()=>{
  const firstHeal=combatItem({nm:'First dose',cat:'heal',cd:1000,fx:{heal:12},ammo:1,maxAmmo:1});
  const secondHeal=combatItem({nm:'Second dose',cat:'heal',cd:4000,fx:{heal:12},ammo:1,maxAmmo:1});
  const F=fight([ware('surgeonhook')],[firstHeal,secondHeal]);F.b.hp=20;

  assert.equal(F.step(1000).find(e=>e.k==='heal').amt,12);
  F.step(2500);
  assert.equal(F.b.debuffs.wound.until,7500);
  assert.equal(F.b.debuffs.wound.modifiers.healReceivedMul,0.75);

  assert.equal(F.step(500).find(e=>e.k==='heal').amt,9);
  F.step(3000);
  assert.equal(F.b.debuffs.wound.until,11000,'a later application refreshes from the current fight time');
  assert.equal(Object.keys(F.b.debuffs).length,1,'Wound refreshes instead of stacking');
  assert.equal(F.b.debuffs.wound.modifiers.healReceivedMul,0.75);
  assert.equal(F.diagnostics.guardTrips,0);
});

test("Sapper's Pick pierces merchant shield and charges only after shield damage",()=>{
  const F=fight([ware('sapperspick')],[]);F.b.shield=10;
  const events=F.step(3000);
  assert.deepEqual(events.find(e=>e.k==='hhit'),{k:'hhit',side:'b',amt:3,abs:3});
  assert.equal(F.b.shield,7);
  assert.equal(F.b.hp,97);
  assert.equal(F.a.items[0].timer,400);
  assert.equal(events.filter(e=>e.k==='haste').length,1);

  const target=combatItem({integ:20,maxI:20});
  const itemFight=fight([ware('sapperspick')],[target]);itemFight.b.shield=10;
  const itemEvents=itemFight.step(3000);
  assert.equal(target.integ,14);
  assert.equal(itemFight.b.shield,10);
  assert.equal(itemFight.a.items[0].timer,0);
  assert.equal(itemEvents.some(e=>e.k==='haste'),false);
  assert.equal(itemFight.diagnostics.guardTrips,0);
});
