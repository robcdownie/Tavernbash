import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ANONE,ITEMS} from '../src/data.js';
import {createFight,makeItem,playerFightItems} from '../src/engine.js';

let UID=910000;
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

test('R8 poison data is unique, Treasure-backed, and matches the approved base cards',()=>{
  const expected={
    blacklotuspress:[2,3,'poison',0,undefined],
    serpentsdue:[3,4,'poison',5.5,5],
    antidotethief:[2,3,'poison',5,3],
    venomsiphon:[1,2,'poison',4,2]
  };
  for(const [id,row] of Object.entries(expected)){
    const def=ITEMS[id];
    assert.ok(def.unique,id+' is unique');
    assert.equal(def.acquisition,'treasure',id+' has a route acquisition path');
    assert.deepEqual([def.size,def.tier,def.cat,def.cd,def.fx.poison],row,id+' base card');
    assert.ok(Array.isArray(def.hooks)&&def.hooks.length>0,id+' rides combat hooks');
  }
});

test('Black Lotus Press charges a weapon on other poison activations and pays every fourth',()=>{
  const press=ware('blacklotuspress',1);
  const poisoner=combatItem({nm:'Poisoner',cat:'poison',cd:1000,fx:{poison:1}});
  const weapon=combatItem({nm:'Weapon',cat:'dmg',cd:100000,fx:{dmg:1}});
  const F=fight([press,poisoner,weapon],[]);
  const events=[];
  for(let i=0;i<4;i++)events.push(...F.step(1000));
  assert.equal(weapon.timer,5000,'four 0.25 second charges join normal timer progress');
  assert.equal(events.filter(e=>e.k==='haste').length,4);
  assert.equal(F.b.pois,6,'four base poison plus the Silver Press two-poison payoff');
  assert.equal(F.diagnostics.guardTrips,0);
});

test("Serpent's Due checks poison after applying and never spills to the merchant",()=>{
  const target=combatItem({integ:30,maxI:30});
  const F=fight([ware('serpentsdue')],[target]);
  F.b.pois=15;
  const events=F.step(5500);
  assert.equal(F.b.pois,20);
  assert.equal(target.integ,22);
  assert.equal(events.filter(e=>e.k==='chip').length,1);

  const empty=fight([ware('serpentsdue')],[]);
  empty.b.pois=15;
  empty.step(5500);
  assert.equal(empty.b.hp,100,'item-only payoff has no merchant fallback');
  assert.equal(empty.diagnostics.guardTrips,0);
});

test('Antidote Thief remembers enemy poison cleanse, caps it, and resets on activation',()=>{
  const healer=combatItem({nm:'Cleanser',cat:'heal',cd:1000,fx:{heal:1},ammo:4,maxAmmo:4});
  const F=fight([ware('antidotethief')],[healer]);
  F.b.pois=4;
  let fifth=[];
  for(let i=0;i<5;i++)fifth=F.step(1000);
  assert.deepEqual(fifth.filter(e=>e.k==='pois').map(e=>e.amt),[3,4]);
  assert.equal(F.b.pois,7);

  let tenth=[];
  for(let i=0;i<5;i++)tenth=F.step(1000);
  assert.deepEqual(tenth.filter(e=>e.k==='pois').map(e=>e.amt),[3],'no cleanses means no carried bonus');
  assert.equal(F.b.pois,10);
  assert.equal(F.diagnostics.guardTrips,0);
});

test('Venom Siphon heals from poison after its own application and respects the cap',()=>{
  const F=fight([ware('venomsiphon')],[]);
  F.a.hp=90;
  F.b.pois=31;
  const events=F.step(4000);
  assert.equal(F.b.pois,33);
  assert.equal(F.a.hp,95);
  assert.deepEqual(events.find(e=>e.k==='heal'),{k:'heal',side:'a',amt:5});
  assert.equal(F.diagnostics.guardTrips,0);
});
