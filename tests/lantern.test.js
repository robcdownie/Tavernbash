import {test} from 'node:test';
import assert from 'node:assert/strict';
import {composeLantern,lanternRules,adjustedStormAt} from '../src/anomaly-rules.js';
import {buildFoe} from '../src/encounter.js';
import {fightHP,monsterSide} from '../src/engine.js';
import {ANOMALIES,ANONE,LANTERN,MONSTERS} from '../src/data.js';

/* every Omen id to its A object, plus the no-Omen baseline */
const OMENS=[['none',ANONE]].concat(ANOMALIES.map(a=>[a.id,a.m]));

test('the LANTERN table is ten cumulative named levels',()=>{
  assert.equal(LANTERN.length,10);
  LANTERN.forEach((r,i)=>{
    assert.equal(r.lv,i+1,'levels are ordered 1 to 10');
    assert.ok(r.n&&r.d,'level '+r.lv+' has a name and a rule line');
  });
  assert.deepEqual(lanternRules(0),[]);
  assert.equal(lanternRules(3).length,3);
  assert.equal(lanternRules(10).length,10);
});

test('Lantern 0 identity: composition returns the plain Omen object untouched',()=>{
  for(const [id,A] of OMENS){
    const c=composeLantern(id,A,0);
    assert.equal(c.runA,A,'level 0 runA is the same reference for '+id);
    assert.equal(c.enemyA,A,'level 0 enemyA is the same reference for '+id);
  }
});

test('composition never mutates the Omen and adds only active fields',()=>{
  for(const [id,A] of OMENS){
    const before=JSON.stringify(A);
    const c=composeLantern(id,A,10);
    assert.equal(JSON.stringify(A),before,'Omen '+id+' mutated');
    assert.notEqual(c.runA,A,'nonzero level composes a copy for '+id);
  }
});

test('storm offsets sum on top of the Omen with no second floor',()=>{
  /* plain: L4 adds -2000 */
  const plain=composeLantern('none',ANONE,4).runA;
  assert.equal(plain.stormStartOffsetMs,-2000);
  /* Fortified: -5000 Omen plus -2000 Lantern = -7000; the single existing
     6000ms floor in adjustedStormAt still applies at the call site */
  const fort=ANOMALIES.find(a=>a.id==='fortified');
  const composed=composeLantern('fortified',fort.m,4).runA;
  assert.equal(composed.stormStartOffsetMs,-7000);
  assert.equal(adjustedStormAt(12000,composed),6000,'the floor holds');
  assert.equal(adjustedStormAt(20000,composed),13000,'above the floor the sum applies');
});

test('shopN composes as a delta after the Omen with a floor of 3',()=>{
  assert.equal(composeLantern('none',ANONE,5).runA.shopN,3,'base 4 minus 1');
  const over=ANOMALIES.find(a=>a.id==='overstock');
  assert.equal(composeLantern('overstock',over.m,5).runA.shopN,5,'Overstocked 6 minus 1');
  const silent=ANOMALIES.find(a=>a.id==='silent');
  assert.equal(composeLantern('silent',silent.m,5).runA.shopN,5,'Silent Bazaar 6 minus 1');
  /* below L5 the Omen's own shopN is untouched (ANONE carries shopN:4), and a
     keyless Omen gains no materialized shopN */
  assert.equal(composeLantern('none',ANONE,4).runA.shopN,ANONE.shopN);
  assert.equal(Object.hasOwn(composeLantern('bare',{},4).runA,'shopN'),false);
});

test('the frost exemption keys on the Omen id, not inferred fields',()=>{
  assert.equal(composeLantern('none',ANONE,6).runA.freezeDisabled,true);
  const silent=ANOMALIES.find(a=>a.id==='silent');
  assert.equal(Object.hasOwn(composeLantern('silent',silent.m,6).runA,'freezeDisabled'),false,
    'Silent Bazaar keeps its frost');
  /* an Omen that merely shares fields with Silent Bazaar is not exempt */
  const lookalike={shopN:6,rerollDisabled:true,freezeDurationRounds:2};
  assert.equal(composeLantern('imposter',lookalike,6).runA.freezeDisabled,true);
});

test('direct event gold composes as a flat delta',()=>{
  assert.equal(composeLantern('none',ANONE,2).runA.directEventGoldFlat,-2);
  assert.equal(Object.hasOwn(composeLantern('none',ANONE,1).runA,'directEventGoldFlat'),false);
});

/* ---- the shared encounter builder reproduces the old call sites exactly ---- */
test('buildFoe matches the direct fightHP plus monsterSide construction',()=>{
  const board=[{id:'sword',rarity:1,size:2,ench:null,iid:1},{id:'vial',rarity:0,size:1,ench:null,iid:2}];
  const cases=[
    {monId:'rats',ctx:{threat:1,hpFlat:0,A:ANONE,gold:6,gilded:false,power:undefined,board:board}},
    {monId:'ghul',ctx:{threat:2,hpFlat:30,A:ANONE,gold:0,gilded:true,power:undefined,board:board}},
    {monId:'vizier',ctx:{threat:12,hpFlat:0,A:ANONE,gold:4,gilded:false,power:1.6,board:board}},
    {monId:'qareen',ctx:{threat:5,hpFlat:0,A:ANONE,gold:9,gilded:false,power:undefined,board:board}},
    {monId:'collector',ctx:{threat:6,hpFlat:0,A:ANONE,gold:14,gilded:false,power:undefined,board:board}}
  ];
  const stable=s=>{const w=JSON.parse(JSON.stringify(s));w.items.forEach(i=>{delete i.uid;});return w;};
  for(const c of cases){
    const foe=buildFoe(c.monId,c.ctx);
    const php=fightHP(c.ctx.threat,c.ctx.hpFlat||0,c.ctx.A);
    const side=monsterSide(c.monId,{gold:c.ctx.gold||0,round:c.ctx.threat,A:c.ctx.A,gilded:!!c.ctx.gilded,
      power:c.ctx.power||1,playerBoard:c.ctx.board,playerHp:php});
    assert.equal(foe.php,php,c.monId+' player fight health');
    assert.deepEqual(stable(foe.side),stable(side),c.monId+' side');
  }
});

test('buildFoe scout parity: two builds of one node agree',()=>{
  /* the scout preview and the fight construct from the same ctx; the builder
     guarantees they cannot drift */
  const ctx={threat:8,hpFlat:0,A:ANONE,gold:3,gilded:true,power:2.05,board:[]};
  const stable=s=>{const w=JSON.parse(JSON.stringify(s));w.items.forEach(i=>{delete i.uid;});return w;};
  for(const monId of Object.keys(MONSTERS)){
    const a=buildFoe(monId,ctx),b=buildFoe(monId,ctx);
    assert.deepEqual(stable(a.side),stable(b.side),monId);
  }
});
