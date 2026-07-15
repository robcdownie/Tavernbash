import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createFight} from '../src/engine.js';

function side(nm,hp,items){return {nm:nm,hp:hp,items:items.map(x=>Object.assign({alive:true,timer:0,frozen:0,disarmed:0,
  lot:false,ammo:0,maxAmmo:0,nextCdFlat:0,itemShield:0,pois:0},x))};}
function fixture(){return {a:side('A',60,[{uid:1,nm:'Blade',cat:'dmg',size:1,slotSize:1,tier:1,rarity:0,cd:1000,
  integ:10,maxI:10,fx:{dmg:7},crit:0}]),b:side('B',35,[])};}
function drive(tap){const s=fixture(),F=createFight({a:s.a,b:s.b,stormAt:999999,seed:77,playerIs:'a',diagnosticTap:tap});
  const events=[];let guard=0;while(!F.done&&guard++<100){events.push(...F.step(50));}
  return {events:events,winner:F.winner,t:F.t,a:F.a.hp,b:F.b.hp,guards:F.diagnostics.guardTrips};}

test('diagnosticTap is inert, uses no RNG, and cannot break combat when it throws',()=>{
  const facts=[];
  const plain=drive(null),tapped=drive(f=>facts.push(f)),throwing=drive(()=>{throw new Error('observer failed');});
  assert.deepEqual(tapped,plain);
  assert.deepEqual(throwing,plain);
  assert.ok(facts.some(f=>f.kind==='damage'&&f.source.uid===1&&f.amount===7));
});

test('diagnostic damage reports finalized merchant HP loss',()=>{
  const s=fixture();s.b.shield=5;
  const facts=[],F=createFight({a:s.a,b:s.b,stormAt:999999,seed:9,playerIs:'a',diagnosticTap:f=>facts.push(f)});
  F.b.shield=5;
  for(let i=0;i<21;i++)F.step(50);
  const hit=facts.find(f=>f.kind==='damage');
  assert.equal(hit.amount,2);
  assert.equal(hit.shieldAbsorbed,5);
  assert.equal(hit.targetLayer,'merchant');
});

test('Rapid Trade self-damage is utility, never attributed outgoing damage',()=>{
  const s=fixture();const facts=[];
  s.a.rules={activationSelfDamagePct:0.25};
  const F=createFight({a:s.a,b:s.b,stormAt:999999,seed:9,playerIs:'a',diagnosticTap:f=>facts.push(f)});
  for(let i=0;i<21;i++)F.step(50);
  assert.ok(facts.some(f=>f.kind==='utility'&&f.metric==='selfDamage'&&f.amount===3));
  assert.equal(facts.filter(f=>f.kind==='damage'&&f.target&&f.target.side==='a').length,0);
});
