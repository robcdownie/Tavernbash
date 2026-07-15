import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ANONE,ITEMS} from '../src/data.js';
import {createFight,makeItem,playerFightItems} from '../src/engine.js';
import {boardVictoryIncome,planReward} from '../src/route-rewards.js';

let UID=950000;
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
function side(items){return {nm:'Side',hp:100,items:items,lifesteal:0,regen:0};}
function fight(a,b){
  const F=createFight({a:side(a),b:side(b),seed:1,stormAt:999000,playerIs:'a'});
  F.secMark=100000;
  return F;
}

test('R8 utility data matches the approved base cards',()=>{
  const expected={
    smoketaxstamp:[1,2,'util',0],
    peacebinderchain:[2,3,'util',5],
    gravebell:[1,3,'util',0],
    bazaarcompass:[2,3,'util',0]
  };
  for(const [id,row] of Object.entries(expected)){
    const def=ITEMS[id];
    assert.deepEqual([def.size,def.tier,def.cat,def.cd],row,id+' base card');
    assert.ok(Array.isArray(def.hooks)&&def.hooks.length>0,id+' rides combat hooks');
  }
  assert.deepEqual(ITEMS.smoketaxstamp.incomeByRarity,[1,2,3,4]);
});

test('Smoke Tax Stamp pays its explicit victory curve and weakens healing only while alive',()=>{
  assert.equal(boardVictoryIncome([{id:'smoketaxstamp',rarity:0},{id:'smoketaxstamp',rarity:3}]),5);
  assert.equal(planReward({}, {baseGold:2,incomeGold:4}).gold,6);

  const stamp=ware('smoketaxstamp');
  const healer=combatItem({nm:'Enemy healer',cat:'heal',cd:1000,fx:{heal:10}});
  const F=fight([stamp],[healer]);
  F.b.hp=50;
  assert.equal(F.step(1000).find(e=>e.k==='heal').amt,8);
  stamp.alive=false;
  assert.equal(F.step(1000).find(e=>e.k==='heal').amt,10);
  assert.equal(F.diagnostics.guardTrips,0);
});

test('Peacebinder Chain disarms the leftmost highest printed damage ware for two seconds',()=>{
  const left=combatItem({nm:'Left tie',cd:10000,fx:{dmg:5},printedDmg:20});
  const right=combatItem({nm:'Right tie',cd:10000,fx:{dmg:50},printedDmg:20});
  const F=fight([ware('peacebinderchain')],[left,right]);
  let fifth=[];
  for(let i=0;i<5;i++)fifth=F.step(1000);
  assert.equal(fifth.filter(e=>e.k==='freeze'&&e.disarm).length,1);
  assert.equal(left.timer,4000,'left tie is paused as soon as the chain acts');
  assert.equal(right.timer,5000,'right tie keeps charging');
  F.step(1000);
  assert.equal(left.timer,4000,'the second disarmed interval is also paused');
  F.step(1000);
  assert.equal(left.timer,5000,'charging resumes after the timed disarm');
  assert.equal(F.diagnostics.guardTrips,0);
});

test('Peacebinder Chain charges both adjacent allies when no damage ware exists',()=>{
  const left=combatItem({nm:'Left ally',cat:'heal',cd:100000});
  const chain=ware('peacebinderchain');
  const right=combatItem({nm:'Right ally',cat:'shield',cd:100000});
  const passive=combatItem({nm:'Enemy passive',cat:'util',cd:0});
  const F=fight([left,chain,right],[passive]);
  let events=[];
  for(let i=0;i<5;i++)events=F.step(1000);
  assert.equal(left.timer,5500);
  assert.equal(right.timer,5500);
  assert.equal(events.filter(e=>e.k==='haste').length,2);
  assert.equal(F.diagnostics.guardTrips,0);
});

test('Grave Bell shields on an allied rattle and starts its replacement half charged',()=>{
  const egg=combatItem({nm:'Rattle shell',integ:1,maxI:1,bulwark:true,rattle:{spawn:{
    nm:'New fighter',g:'g-hatchling',cd:4,integ:20,fx:{dmg:5}
  }}});
  const killer=combatItem({nm:'Killer',cd:1000,fx:{dmg:10},printedDmg:10,ammo:1,maxAmmo:1});
  const F=fight([ware('gravebell'),egg],[killer]);
  const events=F.step(1000);
  const spawned=F.a.items[1];
  assert.equal(spawned.nm,'New fighter');
  assert.equal(spawned.timer,2000);
  assert.equal(F.a.shield,6);
  assert.equal(events.filter(e=>e.k==='shield').length,1);
  assert.equal(events.filter(e=>e.k==='spawn').length,1);
  assert.equal(events.filter(e=>e.k==='haste').length,1);
  assert.equal(F.diagnostics.guardTrips,0);
});

test('Bazaar Compass triggers once per category and charges only different categories',()=>{
  const compass=ware('bazaarcompass');
  const weapon=combatItem({nm:'Weapon',cat:'dmg',cd:1000,fx:{}});
  const poison=combatItem({nm:'Poison',cat:'poison',cd:2000,fx:{}});
  const healer=combatItem({nm:'Healer',cat:'heal',cd:100000,fx:{}});
  const F=fight([compass,weapon,poison,healer],[]);
  const first=F.step(1000);
  assert.equal(first.filter(e=>e.k==='haste').length,2);
  assert.equal(poison.timer,1200);
  assert.equal(healer.timer,1200);

  const second=F.step(1000);
  assert.equal(second.filter(e=>e.k==='haste').length,2,'first poison activation opens one new category');
  assert.equal(weapon.timer,200,'the already-visited weapon is charged by the poison category');
  assert.equal(healer.timer,2400);
  assert.equal(F.step(1000).some(e=>e.k==='haste'),false,'later weapon activations do not retrigger');
  assert.equal(F.diagnostics.guardTrips,0);
});
