import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ANONE,ITEMS} from '../src/data.js';
import {createFight,makeItem,playerFightItems} from '../src/engine.js';

let UID=920000;
function combatItem(over){
  return Object.assign({
    uid:UID++,nm:'Target',g:'g-sword',size:1,rarity:0,cat:'dmg',tier:1,
    cd:0,timer:0,alive:true,integ:100,maxI:100,fx:{},bulwark:false,
    targeting:null,charge:null,pocket:0,flying:false,frozen:0,crit:0,
    rattle:null,selfdestruct:false,ammo:0,maxAmmo:0,lot:false,freezeOnce:0,
    hooks:null
  },over);
}
function ware(id,rarity){return playerFightItems([makeItem(id,rarity||0)],{},ANONE,1)[0];}
function side(items){return {nm:'Side',hp:100,items:items,lifesteal:0,regen:0};}
function fight(a,b){
  const F=createFight({a:side(a),b:side(b),seed:1,stormAt:999000,playerIs:'a'});
  F.secMark=100000;
  return F;
}

test('R8 burn data is unique, Treasure-backed, and matches the approved base cards',()=>{
  const expected={
    funeralbrazier:[3,4,'burn',0,undefined],
    ashencenser:[2,3,'burn',4.5,3],
    kilnchain:[1,2,'burn',3.5,2],
    phoenixbell:[2,3,'burn',5.5,3]
  };
  for(const [id,row] of Object.entries(expected)){
    const def=ITEMS[id];
    assert.ok(def.unique,id+' is unique');
    assert.equal(def.acquisition,'treasure',id+' has a route acquisition path');
    assert.deepEqual([def.size,def.tier,def.cat,def.cd,def.fx.burn],row,id+' base card');
    assert.ok(Array.isArray(def.hooks)&&def.hooks.length>0,id+' rides combat hooks');
  }
});

test('Funeral Brazier converts destroyed size and checks the prior burn threshold',()=>{
  const weapon=combatItem({nm:'Crusher',cd:1000,fx:{dmg:10}});
  const large=combatItem({nm:'Large target',size:3,integ:1,maxI:1});
  const F=fight([ware('funeralbrazier',1),weapon],[large]);
  F.b.burn=10;
  const events=F.step(1000);
  assert.equal(large.alive,false);
  assert.equal(F.b.burn,13,'destroyed Large item adds three burn');
  assert.equal(F.b.hp,97,'Silver threshold rider deals three direct damage');
  assert.deepEqual(events.filter(e=>e.k==='burn').map(e=>e.amt),[3]);

  const low=fight([ware('funeralbrazier'),combatItem({cd:1000,fx:{dmg:10}})],
    [combatItem({integ:1,maxI:1})]);
  low.b.burn=9;
  low.step(1000);
  assert.equal(low.b.burn,10);
  assert.equal(low.b.hp,100,'the rider reads burn before the destruction gain');
  assert.equal(low.diagnostics.guardTrips,0);
});

test('Ashen Censer removes actual shield before applying its capped burn conversion',()=>{
  const F=fight([ware('ashencenser')],[]);
  F.b.shield=7;
  const events=F.step(4500);
  assert.equal(F.b.shield,0);
  assert.equal(F.b.burn,4,'seven removed shield grants one bonus burn');
  assert.deepEqual(events.filter(e=>e.k==='burn').map(e=>e.amt),[3,1]);

  const capped=fight([ware('ashencenser')],[]);
  capped.b.shield=20;
  capped.step(4500);
  assert.equal(capped.b.shield,12);
  assert.equal(capped.b.burn,5,'eight removed shield grants the capped two bonus');
  assert.equal(capped.diagnostics.guardTrips,0);
});

test('Kiln Chain refreshes a nonstacking Ignited rider consumed by one weapon activation',()=>{
  const chain=ware('kilnchain');
  const weapon=combatItem({nm:'Slow blade',cd:4000,fx:{dmg:1}});
  const F=fight([chain,weapon],[]);
  F.step(3500);
  chain.alive=false;
  const first=F.step(500);
  assert.deepEqual(first.filter(e=>e.k==='burn').map(e=>e.amt),[1],
    'Ignited survives its source and fires from the weapon');
  const second=F.step(4000);
  assert.equal(second.some(e=>e.k==='burn'),false,'Ignited is consumed instead of stacking');
  assert.equal(F.diagnostics.guardTrips,0);
});

test('Phoenix Bell remembers one allied death, pays once, and charges other burn wares',()=>{
  const bell=ware('phoenixbell');
  const sacrifice=combatItem({nm:'Sacrifice',integ:1,maxI:1,bulwark:true});
  const otherBurn=combatItem({nm:'Other flame',cat:'burn',cd:100000,fx:{burn:1}});
  const killer=combatItem({nm:'Killer',cd:1000,fx:{dmg:10},ammo:1,maxAmmo:1});
  const F=fight([bell,sacrifice,otherBurn],[killer]);
  F.step(1000);
  assert.equal(sacrifice.alive,false);
  const paid=F.step(4500);
  assert.deepEqual(paid.filter(e=>e.k==='burn').map(e=>e.amt),[3,3]);
  assert.equal(otherBurn.timer,6000,'the other burn ware receives its 0.5 second charge');
  assert.equal(paid.filter(e=>e.k==='haste').length,1);

  const reset=F.step(5500);
  assert.deepEqual(reset.filter(e=>e.k==='burn').map(e=>e.amt),[3]);
  assert.equal(reset.some(e=>e.k==='haste'),false);
  assert.equal(F.diagnostics.guardTrips,0);
});
