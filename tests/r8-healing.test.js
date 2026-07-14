import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ANONE,ITEMS} from '../src/data.js';
import {createFight,makeItem,playerFightItems} from '../src/engine.js';

let UID=940000;
function combatItem(over){
  return Object.assign({
    uid:UID++,nm:'Target',g:'g-sword',size:1,rarity:0,cat:'dmg',tier:1,
    cd:0,timer:0,alive:true,integ:100,maxI:100,fx:{},bulwark:false,
    targeting:null,charge:null,pocket:0,flying:false,frozen:0,crit:0,
    rattle:null,selfdestruct:false,ammo:0,maxAmmo:0,lot:false,freezeOnce:0,
    cleanseTotal:0,hooks:null
  },over);
}
function ware(id,rarity){return playerFightItems([makeItem(id,rarity||0)],{},ANONE,1)[0];}
function side(items){return {nm:'Side',hp:100,items:items,lifesteal:0,regen:0};}
function fight(a,b){
  const F=createFight({a:side(a),b:side(b),seed:1,stormAt:999000,playerIs:'a'});
  F.secMark=100000;
  return F;
}

test('R8 healing data is unique, Treasure-backed, and matches the approved base cards',()=>{
  const expected={
    rosewaterpump:[2,2,'heal',4.5,12],
    chirurgeonsscissors:[1,2,'heal',3.5,7],
    bloodpricechalice:[3,4,'heal',6,24],
    mendersbell:[2,3,'heal',0,undefined]
  };
  for(const [id,row] of Object.entries(expected)){
    const def=ITEMS[id];
    assert.ok(def.unique,id+' is unique');
    assert.equal(def.acquisition,'treasure',id+' has a route acquisition path');
    assert.deepEqual([def.size,def.tier,def.cat,def.cd,def.fx.heal],row,id+' base card');
    assert.ok(Array.isArray(def.hooks)&&def.hooks.length>0,id+' rides combat hooks');
  }
  assert.equal(ITEMS.chirurgeonsscissors.cleanseTotal,2);
});

test('Rosewater Pump heals and charges the leftmost living weapon',()=>{
  const weapon=combatItem({nm:'Waiting blade',cd:100000,fx:{dmg:1}});
  const F=fight([ware('rosewaterpump'),weapon],[]);
  F.a.hp=80;
  const events=F.step(4500);
  assert.equal(F.a.hp,92);
  assert.equal(weapon.timer,5250,'0.75 second charge joins normal timer progress');
  assert.equal(events.filter(e=>e.k==='haste').length,1);
  assert.equal(F.diagnostics.guardTrips,0);
});

test("Chirurgeon's Scissors uses larger-stack cleanse with poison winning ties",()=>{
  const scissors=ware('chirurgeonsscissors');
  const otherHeal=combatItem({nm:'Other heal',cat:'heal',cd:4000,fx:{heal:10}});
  const F=fight([scissors,otherHeal],[]);
  F.a.hp=70;F.a.pois=2;F.a.burn=2;
  const first=F.step(3500);
  assert.equal(F.a.hp,77);
  assert.equal(F.a.pois,1);
  assert.equal(F.a.burn,1,'the second point comes from the now-larger burn stack');
  scissors.alive=false;

  const boosted=F.step(500);
  assert.equal(boosted.find(e=>e.k==='heal').amt,13);
  assert.equal(F.a.hp,90);
  const plain=F.step(4000);
  assert.equal(plain.find(e=>e.k==='heal').amt,10,'the next-heal rider is consumed and does not stack');
  assert.equal(F.diagnostics.guardTrips,0);
});

test('Blood Price Chalice converts actual overheal at 75 percent with an 18 cap',()=>{
  const F=fight([ware('bloodpricechalice')],[]);
  F.a.hp=92;
  const events=F.step(6000);
  assert.equal(F.a.hp,100);
  assert.equal(F.a.shield,12,'sixteen overheal becomes twelve shield');
  assert.deepEqual(events.filter(e=>e.k==='shield').map(e=>e.amt),[12]);
});

test("Blood Price Chalice's full-health conversion stops at its per-activation cap",()=>{
  const F=fight([ware('bloodpricechalice')],[]);
  F.step(6000);
  assert.equal(F.a.shield,18);
  assert.equal(F.diagnostics.guardTrips,0);
});

test("Mender's Bell repairs every third other heal and breaks ties to the left",()=>{
  const heals=[0,1,2].map(i=>combatItem({nm:'Heal '+i,cat:'heal',cd:1000,fx:{heal:1}}));
  const left=combatItem({nm:'Left damage',integ:5,maxI:30});
  const right=combatItem({nm:'Right damage',integ:5,maxI:30});
  const F=fight([ware('mendersbell'),...heals,left,right],[]);
  const first=F.step(1000);
  assert.equal(left.integ,15);
  assert.equal(right.integ,5);
  assert.deepEqual(first.filter(e=>e.repair).map(e=>[e.k,e.i,e.amt,e.integ]),[['chip',4,-10,15]]);

  const second=F.step(1000);
  assert.equal(left.integ,15);
  assert.equal(right.integ,15,'the now-lowest right item receives the next repair');
  assert.equal(second.filter(e=>e.repair).length,1);
  assert.equal(F.diagnostics.guardTrips,0);
});
