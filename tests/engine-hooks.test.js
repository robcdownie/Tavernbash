import {test} from 'node:test';
import assert from 'node:assert/strict';
import {COMBAT_EVENT_KINDS,createFight,validateCombatHooks} from '../src/engine.js';

let UID=800000;
function item(over){
  return Object.assign({
    uid:UID++,nm:'Ware',g:'g-sword',size:1,rarity:0,cat:'dmg',tier:1,
    cd:0,timer:0,alive:true,integ:20,maxI:20,fx:{},bulwark:false,
    targeting:null,charge:null,pocket:0,flying:false,frozen:0,crit:0,
    rattle:null,selfdestruct:false,ammo:0,maxAmmo:0,lot:false,freezeOnce:0,
    hooks:null
  },over);
}
function side(items){return {nm:'Side',hp:100,items:items,lifesteal:0,regen:0};}
function fight(a,b,extra){
  return createFight(Object.assign({a:side(a),b:side(b),seed:1,stormAt:9e9,playerIs:'a'},extra));
}

test('R7 hook points drain in causal order and emit only legacy event kinds',()=>{
  const hook=(on,amount)=>({on:on,actions:[{op:'shield',side:'owner',amount:amount}]});
  const observer=item({nm:'Observer',hooks:[
    hook('fightStart',512),hook('beforeActivate',1),hook('beforeHit',2),
    hook('destroyed',4),hook('afterSpawn',8),hook('afterHit',16),
    hook('beforeHeal',32),hook('afterHeal',64),hook('afterHaste',128),
    hook('afterActivate',256)
  ]});
  const actor=item({nm:'Actor',cd:1000,fx:{dmg:5,heal:1,haste:1}});
  const mate=item({nm:'Mate',cd:4000});
  const egg=item({nm:'Egg',cd:9e9,integ:5,maxI:5,rattle:{spawn:{
    nm:'Chick',g:'g-sword',cd:10,integ:40,fx:{dmg:3}
  }}});
  const F=fight([observer,actor,mate],[egg]);
  const events=F.step(1000);

  assert.deepEqual(events.filter(e=>e.k==='shield').map(e=>e.amt),
    [512,1,2,4,8,16,32,64,128,256]);
  assert.equal(F.a.shield,1023);
  assert.equal(F.diagnostics.guardTrips,0);
  assert.equal(F.diagnostics.pendingActions,0);
  for(const event of events){assert.ok(COMBAT_EVENT_KINDS.includes(event.k),'known renderer event '+event.k);}
});

test('R7 hook ordering covers side, non-item source kind, slot, and declaration',()=>{
  const actor=item({cd:1000,hooks:[{on:'afterActivate',actions:[{op:'shield',side:'owner',amount:3}]}]});
  const hooks=[
    {side:'b',kind:'hero',sourceId:'b-hero',on:'afterActivate',actions:[{op:'shield',side:'owner',amount:4}]},
    {side:'a',kind:'anomaly',sourceId:'a-omen',on:'afterActivate',actions:[{op:'shield',side:'owner',amount:2}]},
    {side:'a',kind:'hero',sourceId:'a-hero',on:'afterActivate',actions:[{op:'shield',side:'owner',amount:1}]}
  ];
  const F=fight([actor],[],{hooks:hooks});
  const events=F.step(1000);
  assert.deepEqual(events.filter(e=>e.k==='shield').map(e=>[e.side,e.amt]),
    [['a',1],['a',2],['a',3],['b',4]]);
});

test('R7 rejects an unconditional immediate hook cycle statically',()=>{
  const cycle=[{on:'afterHeal',actions:[{op:'heal',side:'owner',amount:1}]}];
  assert.throws(()=>validateCombatHooks(cycle),/unconditional immediate hook cycle/);
  assert.throws(()=>validateCombatHooks([{...cycle[0],every:1}]),/unconditional immediate hook cycle/);
  const healer=item({cd:1000,fx:{heal:1},hooks:cycle});
  assert.throws(()=>fight([healer],[]),/unconditional immediate hook cycle/);
});

test('R7 hook identity cap suppresses only the looping descendant',()=>{
  const healer=item({cd:1000,fx:{heal:1},hooks:[{
    on:'afterHeal',when:{test:'hpBelowMax',side:'owner'},
    actions:[{op:'heal',side:'owner',amount:1}]
  }]});
  const F=fight([healer],[]);F.a.hp=1;
  const events=F.step(1000);
  assert.equal(F.diagnostics.guardCounts.hook,1);
  assert.equal(F.diagnostics.guardCounts.depth,0);
  assert.equal(events.filter(e=>e.k==='heal').length,17);
  assert.equal(F.diagnostics.pendingActions,0);
});

test('R7 depth cap stops a long conditional hook chain at 32',()=>{
  const rules=[];
  for(let hp=1;hp<=40;hp++){
    rules.push({sourceId:'depth'+hp,on:'afterHeal',when:{test:'hpEquals',side:'owner',value:hp},
      actions:[{op:'heal',side:'owner',amount:1}]});
  }
  const F=fight([item({cd:1000,fx:{heal:1}})],[],{hooks:{a:rules}});F.a.hp=0;
  F.step(1000);
  assert.equal(F.diagnostics.guardCounts.depth,1);
  assert.equal(F.diagnostics.guardCounts.hook,0);
  assert.equal(F.a.hp,33);
  assert.equal(F.diagnostics.pendingActions,0);
});

test('R7 root action cap holds one activation at 256 actions',()=>{
  const actions=Array.from({length:300},()=>({op:'shield',side:'owner',amount:1}));
  const source=item({cd:1000,hooks:[{on:'afterActivate',when:{test:'actorIsSource'},actions:actions}]});
  const F=fight([source],[]);
  const events=F.step(1000);
  assert.equal(F.diagnostics.guardCounts.root,46);
  assert.equal(F.diagnostics.guardCounts.step,0);
  assert.equal(events.filter(e=>e.k==='shield').length,254);
  assert.equal(F.diagnostics.pendingActions,0);
});

test('R7 step action cap holds aggregate roots at 2048 actions',()=>{
  const many=()=>Array.from({length:250},()=>({op:'shield',side:'owner',amount:1}));
  const sources=[0,1,2].map(i=>item({nm:'Source'+i,cd:1000,
    hooks:[{on:'afterActivate',when:{test:'actorIsSource'},actions:many()}]}));
  const F=fight(sources,[]);
  F.step(4000);
  assert.equal(F.diagnostics.guardCounts.root,0);
  assert.ok(F.diagnostics.guardCounts.step>0,'the aggregate step guard tripped');
  assert.equal(F.a.shield,2030);
  assert.equal(F.diagnostics.pendingActions,0);
});
