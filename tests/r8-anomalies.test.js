"use strict";
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ANOMALIES,ANONE} from '../src/data.js';
import {makeItem,playerFightItems,createFight,fightHP} from '../src/engine.js';
import {wareSlotCost,boardUsedCells,boardSlotCount,warePurchaseCost,wareSaleValue,rerollPrice,
  adjustedStormAt,adjustedVictoryIncome,advanceFrozenOffers,setFrozenOffers} from '../src/anomaly-rules.js';

let uid=95000;
function omen(id){return Object.assign({},ANONE,ANOMALIES.find(function(a){return a.id===id;}).m);}
function fi(over){
  return Object.assign({nm:'Ware',g:'g-sword',size:1,rarity:0,cat:'dmg',tier:1,cd:1000,timer:0,
    alive:true,integ:20,maxI:20,fx:{},printedDmg:0,bulwark:false,targeting:null,charge:null,pocket:0,
    flying:false,frozen:0,disarmed:0,pois:0,itemShield:0,nextCdFlat:0,crit:0,rattle:null,
    selfdestruct:false,ammo:0,maxAmmo:0,lot:false,freezeOnce:0,cleanseTotal:0,hooks:null,uid:uid++},over);
}
function side(items,rules,extra){return Object.assign({nm:'Side',hp:100,items:items,lifesteal:0,regen:0,rules:rules||{}},extra||{});}
function fight(a,b,rulesA,extraA){
  return createFight({a:side(a,rulesA,extraA),b:side(b,rulesA),seed:3,stormAt:999000,playerIs:'a'});
}

test('R8 Omens: twelve complete benefit and cost payloads replace the scalar-only set',()=>{
  assert.equal(ANOMALIES.length,12);
  for(const a of ANOMALIES){assert.ok(a.id&&a.n&&a.g&&a.d&&a.m,a.id||'Omen');}
  assert.equal(ANOMALIES.find(function(a){return a.id==='moon';}).m.hpMul,undefined,'Blood Moon no longer hides a second health penalty');
});

test('R8 Bull Market: only income gains 50 percent and paid wares cost 1 more',()=>{
  const A=omen('bull');
  assert.equal(adjustedVictoryIncome(3,A),4);
  assert.equal(warePurchaseCost(1,false,A),4);
  assert.equal(warePurchaseCost(2,true,A),9);
  assert.equal(adjustedVictoryIncome(0,A),0);
});

test('R8 Blood Moon: weapons gain damage while heal, regen, and lifesteal stop but explicit cleanse works',()=>{
  const A=omen('moon');
  const built=playerFightItems([makeItem('dagger',0),makeItem('bandage',0)],{},A,1);
  assert.equal(built[0].fx.dmg,8);
  assert.equal(built[1].fx.heal,undefined);

  const cleanser=fi({cat:'heal',cd:500,fx:{heal:8},hooks:[
    {on:'afterActivate',when:{test:'actorIsSource'},actions:[{op:'cleanseStatus',side:'owner',status:'pois',amount:3}]}
  ]});
  const F=fight([cleanser],[],A,{hp:100,regen:9,lifesteal:1});
  F.a.hp=50;F.a.pois=3;F.step(500);
  assert.equal(F.a.hp,50);
  assert.equal(F.a.pois,0,'dedicated cleanse is still live');

  const blade=fi({cd:500,fx:{dmg:10},printedDmg:10});
  const L=fight([blade],[fi({cd:999000,integ:50,maxI:50})],A,{hp:100,lifesteal:1});
  L.a.hp=50;L.step(500);assert.equal(L.a.hp,50,'lifesteal is disabled');
});

test('R8 Wildfire: Burn doubles and a Heal clears all Burn before restoring health',()=>{
  const A=omen('wildfire');
  assert.equal(playerFightItems([makeItem('torch',0)],{},A,1)[0].fx.burn,6);
  const F=fight([fi({cat:'heal',cd:500,fx:{heal:5}})],[],A);
  F.a.hp=90;F.a.burn=9;F.step(500);
  assert.equal(F.a.burn,0);
  assert.equal(F.a.hp,95);
});

test('R8 Plague Winds: Poison doubles and both merchant and item stacks halve after ticking',()=>{
  const A=omen('plague');
  assert.equal(playerFightItems([makeItem('vial',0)],{},A,1)[0].fx.poison,4);
  const F=fight([],[],A);F.a.pois=9;F.step(1000);
  assert.equal(F.a.hp,91);assert.equal(F.a.pois,4);

  const marked=fi({cd:999000,integ:30,maxI:30,pois:9});
  const I=fight([],[marked],A);I.step(1000);
  assert.equal(marked.integ,21);assert.equal(marked.pois,4);
});

test('R8 Molasses Night: only base cooldowns of at least 5 seconds open fully charged',()=>{
  const A=omen('molasses');
  const items=playerFightItems([makeItem('hammer',0),makeItem('dagger',0)],{},A,1);
  assert.equal(items[0].cd,6600);assert.equal(items[0].timer,6600);
  assert.equal(items[1].cd,3600);assert.equal(items[1].timer,0);
});

test('R8 Overstocked: six offers are paired with a visible 2 gold reroll price',()=>{
  const A=omen('overstock');
  assert.equal(A.shopN,6);assert.equal(rerollPrice(A,0),2);
});

test('R8 Fortified: health rises 30 percent and the storm moves 5 seconds earlier with a floor',()=>{
  const A=omen('fortified');
  assert.equal(fightHP(4,0,A),Math.round((90+4*8)*1.3));
  assert.equal(adjustedStormAt(22000,A),17000);
  assert.equal(adjustedStormAt(9000,A),6000);
});

test('R8 Rapid Trade: activation self-damage resolves last and can trigger a rattle',()=>{
  const A=omen('rapid');
  const ware=fi({cd:500,integ:20,maxI:20,fx:{shield:3}});
  const F=fight([ware],[],A);const ev=F.step(500);
  assert.equal(F.a.shield,3);assert.equal(ware.integ,19);
  assert.ok(ev.some(function(e){return e.k==='chip'&&e.selfDamage&&e.amt===1;}));

  const doomed=fi({cd:500,integ:1,maxI:20,fx:{shield:1},rattle:{spawn:{nm:'Heir',g:'g-sword',cd:9,integ:10,fx:{dmg:1}}}});
  const D=fight([doomed],[],A);const death=D.step(500);
  assert.equal(D.a.items[0].nm,'Heir');
  assert.ok(death.some(function(e){return e.k==='destroy';}));
  assert.ok(death.some(function(e){return e.k==='spawn';}));
});

test('R8 Narrow Alleys: capacity loses two slots, never below four, and Large wares use two',()=>{
  const A=omen('narrow');
  assert.equal(boardSlotCount(1,A),4);
  assert.equal(boardSlotCount(6,A),8);
  assert.equal(wareSlotCost(3,A),2);
  assert.equal(boardUsedCells([{size:3},{size:2},{size:1}],A),5);
});

test('R8 Glass Night: integrity falls 40 percent and only the first rattle doubles',()=>{
  const A=omen('glass');
  assert.equal(playerFightItems([makeItem('dagger',0)],{},A,1)[0].integ,8);
  const first=fi({cd:10000,integ:5,maxI:5,rattle:{hasteMates:0.1}});
  const later=fi({cd:10000,integ:5,maxI:5,rattle:{hasteMates:0.5}});
  const survivor=fi({cd:10000,integ:100,maxI:100});
  const F=fight([first,later,survivor],[fi({size:3,cd:1000,fx:{dmg:20},printedDmg:20})],A);
  const ev=F.step(1000);
  assert.equal(survivor.cd,4050,'first rattle runs twice and the second still runs once');
  assert.equal(ev.filter(function(e){return e.k==='enrage';}).length,5);
});

test('R8 Silent Bazaar: rerolls close and a freeze carries paid stock through two rolls',()=>{
  const A=omen('silent');
  assert.equal(A.shopN,6);assert.equal(A.rerollDisabled,true);
  const paid={id:'dagger',free:false,bought:false,hold:0},free={id:'sword',free:true,bought:false,hold:0};
  setFrozenOffers([paid,free],A.freezeDurationRounds);
  assert.equal(paid.hold,2);assert.equal(free.hold,0);
  const first=advanceFrozenOffers([paid,free],true);
  assert.deepEqual(first.offers,[paid]);assert.equal(paid.hold,1);assert.equal(first.active,true);
  const newcomer={id:'shield',free:false,bought:false,hold:0};
  const second=advanceFrozenOffers([paid,newcomer,free],true);
  assert.deepEqual(second.offers,[paid]);assert.equal(paid.hold,0);assert.equal(second.active,false);
});

test('R8 Auction Bell: full base sale values raise only this market reroll price',()=>{
  const A=omen('auctionbell');
  assert.equal(wareSaleValue(1,A),3);assert.equal(wareSaleValue(3,A),8);
  assert.equal(rerollPrice(A,0),1);assert.equal(rerollPrice(A,3),4);
});
