import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createFight} from '../src/engine.js';

function item(over){
  return Object.assign({
    uid:1,nm:'Ware',g:'g-sword',size:1,rarity:0,cat:'dmg',tier:1,
    cd:1000,timer:0,alive:true,integ:20,maxI:20,fx:{},bulwark:false,
    targeting:null,charge:null,pocket:0,flying:false,frozen:0,crit:0,
    rattle:null,selfdestruct:false,ammo:0,maxAmmo:0,lot:false,freezeOnce:0
  },over);
}

test('R7 action worklist drains and a replacement cannot inherit catch-up',()=>{
  const egg=item({uid:424242,nm:'Egg',selfdestruct:true,rattle:{spawn:{
    nm:'Chick',g:'g-sword',cd:1,integ:40,fx:{dmg:3}
  }}});
  const wall=item({uid:424243,nm:'Wall',cd:9e9,integ:100,maxI:100});
  const F=createFight({
    a:{nm:'A',hp:100,items:[egg],lifesteal:0},
    b:{nm:'B',hp:100,items:[wall],lifesteal:0},
    seed:1,stormAt:9e9,playerIs:'a'
  });

  const first=F.step(4000);
  assert.deepEqual(first.map(e=>e.k),['fire','destroy','spawn']);
  assert.equal(F.a.items[0].nm,'Chick');
  assert.notEqual(F.a.items[0].uid,egg.uid,'the replacement has a fresh identity');
  assert.equal(F.diagnostics.pendingActions,0,'no work survives the step boundary');

  const second=F.step(1000);
  assert.equal(second.filter(e=>e.k==='fire'&&e.side==='a').length,1,'the replacement waits for the next scheduler visit');
  assert.equal(F.diagnostics.pendingActions,0,'the next root drains too');
});
