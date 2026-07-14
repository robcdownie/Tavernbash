import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ANONE,ITEMS} from '../src/data.js';
import {createFight,makeItem,playerFightItems} from '../src/engine.js';

let UID=930000;
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

test('R8 shield data is unique, Treasure-backed, and matches the approved base cards',()=>{
  const expected={
    coinplatedram:[3,3,'shield',5,18],
    mirrorbastion:[3,4,'shield',6,24],
    saltward:[1,2,'shield',4,8],
    breakwaterbuckler:[2,3,'shield',4.5,14]
  };
  for(const [id,row] of Object.entries(expected)){
    const def=ITEMS[id];
    assert.ok(def.unique,id+' is unique');
    assert.equal(def.acquisition,'treasure',id+' has a route acquisition path');
    assert.deepEqual([def.size,def.tier,def.cat,def.cd,def.fx.shield],row,id+' base card');
    assert.ok(Array.isArray(def.hooks)&&def.hooks.length>0,id+' rides combat hooks');
  }
});

test("Coin-Plated Ram's rider spends current shield on exactly one weapon attack",()=>{
  const ram=ware('coinplatedram');
  const weapon=combatItem({nm:'Ram blade',cd:6000,fx:{dmg:10}});
  const F=fight([ram,weapon],[]);
  F.step(5000);
  ram.alive=false;
  F.a.shield=3;
  const first=F.step(1000);
  assert.equal(F.a.shield,0);
  assert.equal(F.b.hp,87,'three available shield adds three damage');
  assert.equal(first.find(e=>e.k==='hhit').amt,13);

  const second=F.step(6000);
  assert.equal(second.find(e=>e.k==='hhit').amt,10,'the spent rider does not repeat');
  assert.equal(F.diagnostics.guardTrips,0);
});

test('Mirror Bastion charges once per one-second interval despite multiple absorptions',()=>{
  const bastion=ware('mirrorbastion');
  bastion.flying=true;
  const rightmost=combatItem({nm:'Rightmost',cd:100000,fx:{},flying:true});
  const rapid=combatItem({nm:'Rapid taps',cd:250,fx:{dmg:1}});
  const F=fight([bastion,rightmost],[rapid]);
  F.a.shield=20;
  const first=F.step(1000);
  assert.equal(first.filter(e=>e.k==='haste').length,1);
  assert.equal(rightmost.timer,1350);
  const second=F.step(1000);
  assert.equal(second.filter(e=>e.k==='haste').length,1,'a new interval opens one new charge');
  assert.equal(rightmost.timer,2700);
  assert.equal(F.diagnostics.guardTrips,0);
});

test('Salt Ward cleanses only poison and grants its conditional shield once',()=>{
  const F=fight([ware('saltward')],[]);
  F.a.pois=1;F.a.burn=3;
  const first=F.step(4000);
  assert.equal(F.a.pois,0);
  assert.equal(F.a.burn,3);
  assert.equal(F.a.shield,12);
  assert.deepEqual(first.filter(e=>e.k==='shield').map(e=>e.amt),[8,4]);

  const second=F.step(4000);
  assert.equal(F.a.shield,20);
  assert.deepEqual(second.filter(e=>e.k==='shield').map(e=>e.amt),[8]);
  assert.equal(F.diagnostics.guardTrips,0);
});

test('Breakwater Buckler converts each actually cleansed burn into shield',()=>{
  const F=fight([ware('breakwaterbuckler')],[]);
  F.a.burn=2;F.a.pois=5;
  const events=F.step(4500);
  assert.equal(F.a.burn,0);
  assert.equal(F.a.pois,5);
  assert.equal(F.a.shield,22);
  assert.deepEqual(events.filter(e=>e.k==='shield').map(e=>e.amt),[14,4,4]);
  assert.equal(F.diagnostics.guardTrips,0);
});

test('explicit poison cleanse feeds Antidote Thief through the shared cleanse hook',()=>{
  const F=fight([ware('antidotethief')],[ware('saltward')]);
  F.b.pois=2;
  F.step(4000);
  assert.equal(F.b.pois,0);
  const events=F.step(1000);
  assert.deepEqual(events.filter(e=>e.k==='pois').map(e=>e.amt),[3,2]);
  assert.equal(F.diagnostics.guardTrips,0);
});
