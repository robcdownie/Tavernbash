"use strict";
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HEROES,ITEMS,shopTagWeight,canSpendGold} from '../src/data.js';
import {createFight} from '../src/engine.js';
import {newRun} from '../src/route-run.js';
import {settleFixed} from '../src/route-runtime.js';

let uid=90000;
function fi(over){
  return Object.assign({nm:'Ware',g:'g-sword',size:1,rarity:0,cat:'dmg',tier:1,cd:1000,timer:0,
    alive:true,integ:20,maxI:20,fx:{},printedDmg:0,bulwark:false,targeting:null,charge:null,pocket:0,
    flying:false,frozen:0,disarmed:0,pois:0,itemShield:0,nextCdFlat:0,crit:0,rattle:null,
    selfdestruct:false,ammo:0,maxAmmo:0,lot:false,freezeOnce:0,cleanseTotal:0,hooks:null,uid:uid++},over);
}
function side(items,rules){return {nm:'Side',hp:100,items:items,lifesteal:0,regen:0,rules:rules||{}};}
function fight(a,b,rulesA,extra){
  return createFight(Object.assign({a:side(a,rulesA),b:side(b),seed:7,stormAt:999000,playerIs:'a'},extra||{}));
}
function hero(id){return HEROES.find(function(h){return h.id===id;});}
function reward(gold){return {gold:gold,items:[],relic:0,mote:null,choice:null};}

test('R8 heroes: all eight rules have real shop tags and no scalar legacy boosts',()=>{
  assert.equal(HEROES.length,8);
  const cats=new Set(Object.values(ITEMS).map(function(d){return d.cat;}));
  for(const h of HEROES){
    assert.ok(cats.has(h.tag),h.n+' has a live shop tag');
    assert.ok(h.mod&&Object.keys(h.mod).length,h.n+' has a rules payload');
  }
  assert.equal(hero('apoth').mod.hpFlat,undefined);
  assert.equal(hero('knife').mod.firstFlat,undefined);
  assert.equal(hero('lender').mod.income,undefined);
});

test('R8 Kilnkeeper: Last Light selects one Burn Bulwark and fires before removal without ammo',()=>{
  const chosen=fi({nm:'Chosen',cat:'burn',cd:9000,integ:5,maxI:5,fx:{burn:4},ammo:2,maxAmmo:2});
  const later=fi({nm:'Later',cat:'burn',cd:9000,fx:{burn:2}});
  const killer=fi({nm:'Killer',cd:1000,fx:{dmg:5},printedDmg:5});
  const F=fight([chosen,later],[killer],{leftmostBurnLastLight:true});
  const ev=F.step(1000);
  assert.equal(chosen.bulwark,true);
  assert.equal(later.heroLastLight,undefined);
  assert.equal(chosen.ammo,2,'death activation consumes no ammo');
  assert.equal(F.b.burn>0,true);
  const finalFire=ev.findIndex(function(e){return e.k==='fire'&&e.side==='a';});
  const destroyed=ev.findIndex(function(e){return e.k==='destroy'&&e.side==='a';});
  assert.ok(finalFire>=0&&finalFire<destroyed,'final activation resolves before destroy');
});

test('R8 Apothecary: overheal becomes Shield and automatic cleanse is disabled',()=>{
  const heal=fi({cat:'heal',cd:500,fx:{heal:12}});
  const F=fight([heal],[],{overhealToShield:true,healingCleanses:false});
  F.a.hp=95;F.a.pois=3;F.a.burn=2;
  const ev=F.step(500);
  assert.equal(F.a.hp,100);
  assert.equal(F.a.shield,7);
  assert.equal(F.a.pois,3);
  assert.equal(F.a.burn,2);
  assert.ok(ev.some(function(e){return e.k==='shield'&&e.overheal&&e.amt===7;}));
});

test('R8 Knifegrinder: Perfect Edge fully overflows and a failed kill taxes only the next cooldown',()=>{
  const carry=fi({cd:1000,size:1,fx:{dmg:30},printedDmg:30});
  const F=fight([carry],[fi({integ:10,maxI:10,cd:999000}),fi({integ:10,maxI:10,cd:999000})],{leftmostWeaponPerfectEdge:true});
  F.step(1000);
  assert.equal(F.b.items[0].alive,false);
  assert.equal(F.b.items[1].alive,false);
  assert.equal(F.b.hp,90,'full overflow reaches the merchant');

  const chipper=fi({cd:1000,fx:{dmg:5},printedDmg:5});
  const P=fight([chipper],[fi({integ:30,maxI:30,cd:999000})],{leftmostWeaponPerfectEdge:true});
  const one=P.step(1000);const two=P.step(1000);const three=P.step(1000);
  assert.equal(one.filter(function(e){return e.k==='fire'&&e.side==='a';}).length,1);
  assert.equal(two.filter(function(e){return e.k==='fire'&&e.side==='a';}).length,0);
  assert.equal(three.filter(function(e){return e.k==='fire'&&e.side==='a';}).length,1);
  assert.equal(chipper.nextCdFlat,1000,'the latest failed kill taxes the following cycle only');
});

test('R8 Moneylender: credit, non-stacking shop weight, and debt settlement are explicit and idempotent',()=>{
  const lender=hero('lender');
  assert.equal(canSpendGold(0,3,lender),true);
  assert.equal(canSpendGold(0,4,lender),false);
  assert.equal(shopTagWeight('burn',[], 'burn'),1.5);
  assert.equal(shopTagWeight('burn',['burn'],'burn'),2.2,'featured and hero weights use the larger value');

  const run=newRun({seed:41});run.economy.gold=-3;
  const receipt=settleFixed(run,reward(2),'debt',{debtLobbyDamage:2});
  assert.equal(run.economy.gold,0);
  assert.equal(run.route.resolve,38);
  assert.equal(receipt.debtPaid,2);
  assert.equal(receipt.debtDamage,2);
  settleFixed(run,reward(2),'debt',{debtLobbyDamage:2});
  assert.equal(run.route.resolve,38,'receipt prevents a second debt injury');

  const repaid=newRun({seed:42});repaid.economy.gold=-3;
  settleFixed(repaid,reward(6),'repaid',{debtLobbyDamage:2});
  assert.equal(repaid.economy.gold,3);
  assert.equal(repaid.route.resolve,40);
});

test('R8 Venom Broker: ware Poison ticks integrity and spills only when the mark breaks',()=>{
  const poisoner=fi({cat:'poison',cd:1000,fx:{poison:5}});
  const marked=fi({cd:999000,integ:20,maxI:20});
  const rules={poisonTargetsItems:true,poisonSpillsOnDestroy:true};
  const F=fight([poisoner],[marked],rules);
  const first=F.step(1000);
  assert.equal(marked.integ,15);
  assert.equal(marked.pois,4);
  assert.equal(F.b.hp,100,'marked Poison does not hit the merchant while the ware lives');
  assert.ok(first.some(function(e){return e.k==='pois'&&e.item&&e.i===0;}));
  assert.ok(first.some(function(e){return e.k==='chip'&&e.poison&&e.amt===5;}));

  const mark=fi({cat:'poison',cd:1000,fx:{poison:5}});
  const blade=fi({cd:1000,fx:{dmg:20},printedDmg:20});
  const target=fi({cd:999000,integ:10,maxI:10});
  const S=fight([mark,blade],[target],rules);
  const ev=S.step(1000);
  assert.ok(ev.some(function(e){return e.k==='pois'&&e.spill&&e.amt===5;}));
  assert.equal(S.b.hp,95,'the spill joins the same second merchant Poison tick');
});

test('R8 Brass Architect: the Rampart stores, absorbs, then transfers its own Shield',()=>{
  const rampart=fi({cat:'shield',cd:1000,integ:10,maxI:10,fx:{shield:6}});
  const breaker=fi({cd:1000,fx:{dmg:4},printedDmg:4,hooks:[
    {on:'afterActivate',when:{test:'actorSideIsOwner'},actions:[{op:'destroy',target:{side:'enemy',position:'leftmost'}}]}
  ]});
  const F=fight([rampart],[breaker],{leftmostShieldStoresOnSelf:true});
  const ev=F.step(1000);
  assert.equal(rampart.bulwark,true);
  assert.equal(rampart.integ,0);
  assert.equal(F.a.shield,2,'unspent item Shield transfers after the forced destruction');
  assert.ok(ev.some(function(e){return e.k==='shield'&&e.item&&e.absorbed&&e.amt===-4;}));
  assert.ok(ev.some(function(e){return e.k==='shield'&&e.transfer&&e.amt===2;}));
});

test('R8 Silkblade: fastest weapon starts on guaranteed crit and skips every other activation without ammo or RNG',()=>{
  const draws=[];
  const blade=fi({cd:1000,fx:{dmg:10},printedDmg:10,ammo:3,maxAmmo:3});
  const F=fight([blade],[],{fastestWeaponAlternatingCrit:true},{rngTap:function(tag,value){draws.push([tag,value]);}});
  const one=F.step(1000);assert.equal(F.b.hp,80);assert.equal(blade.ammo,2);
  const two=F.step(1000);assert.equal(F.b.hp,80);assert.equal(blade.ammo,2);
  const three=F.step(1000);assert.equal(F.b.hp,60);assert.equal(blade.ammo,1);
  assert.equal(one.filter(function(e){return e.k==='crit';}).length,1);
  assert.equal(two.filter(function(e){return e.k==='fire'&&e.side==='a';}).length,0);
  assert.equal(three.filter(function(e){return e.k==='crit';}).length,1);
  assert.deepEqual(draws,[],'guaranteed crit consumes no seeded draw');
});

test('R8 Ash Collector: the first rattle doubles, later rattles stop, and a double hatch queues a second body',()=>{
  const funeral=fi({nm:'First',cd:10000,integ:5,maxI:5,rattle:{hasteMates:0.1}});
  const suppressed=fi({nm:'Second',cd:10000,integ:5,maxI:5,rattle:{hasteMates:0.5}});
  const survivor=fi({nm:'Survivor',cd:10000,integ:100,maxI:100});
  const cleaver=fi({size:3,cd:1000,fx:{dmg:20},printedDmg:20});
  const F=fight([funeral,suppressed,survivor],[cleaver],{oneTrueFuneral:true});
  const ev=F.step(1000);
  assert.equal(survivor.cd,8100,'only the first 10 percent rattle runs, exactly twice');
  assert.equal(ev.filter(function(e){return e.k==='enrage';}).length,4,'two survivors are enraged twice');

  const egg=fi({nm:'Egg',cd:1000,integ:5,maxI:5,selfdestruct:true,
    rattle:{spawn:{nm:'Roc',g:'g-rocegg',cd:99,integ:5,fx:{dmg:1}}}});
  const hunter=fi({nm:'Hunter',cd:2000,fx:{dmg:10},printedDmg:10});
  const H=fight([egg],[hunter],{oneTrueFuneral:true});
  const hatch=H.step(1000);assert.equal(H.a.items[0].spawnQueue,1);
  const rehatch=H.step(1000);
  assert.equal(H.a.items[0].alive,true);
  assert.equal(H.a.items[0].spawnQueue,0);
  assert.equal(hatch.concat(rehatch).filter(function(e){return e.k==='spawn';}).length,2);
});
