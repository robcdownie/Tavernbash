/* Live-market walker tests (0.101.0 seam): policy determinism, the binding
   Bull-income and wareLock conditions, and the live route integration. The
   walker's competence is a policy model, not a player; these tests pin its
   CONTRACT (deterministic, real rules, honest conditions), not its win rate. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ANONE, ITEMS} from '../src/data.js';
import {victoryIncome, marketVisit, newMarketState, POLICY_VERSION, POLICY} from '../scripts/market-sim.js';
import {LOCKED_START_WARES} from '../src/unlock-profile.js';

function memStorage(){
  const m=new Map();
  return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};
}
async function sim(){ return import('../scripts/route-sim.js'); }

test('policy is versioned data', ()=>{
  assert.equal(typeof POLICY_VERSION,'string');
  assert.ok(POLICY_VERSION.length>0);
  assert.ok(Object.keys(POLICY).length>=10,'the policy is reviewable as data');
});

test('victoryIncome: Bull goldMul scales the income term only, exactly the ui.js expression', ()=>{
  const bull=Object.assign({},ANONE,{goldMul:1.5});
  assert.equal(victoryIncome([],2,[],ANONE),2,'plain: relic income passes through');
  assert.equal(victoryIncome([],2,[],bull),3,'bull: floor(2 x 1.5)');
  assert.equal(victoryIncome([],0,[],bull),0,'no income, nothing to scale');
});

test('marketVisit is deterministic: identical state and ctx, identical outcome', ()=>{
  const mk=()=>{
    const st=newMarketState(20,2);
    const ctx={runSeed:12345,nodeId:'d1c3l1',run:{ids:{nextItem:1}},storage:null,
      A:ANONE,heroId:null,heroTag:null,arch:'dmg',featuredTags:[],threat:2,hero:null,districtCap:3};
    marketVisit(st,ctx);
    return st;
  };
  const a=mk(),b=mk();
  assert.deepEqual(a.board.map(w=>w.id+':'+w.rarity),b.board.map(w=>w.id+':'+w.rarity));
  assert.deepEqual(a.metrics,b.metrics);
  assert.equal(a.gold,b.gold);
  assert.ok(a.metrics.rolls>=1&&a.metrics.buys>=1,'the visit acted: '+JSON.stringify(a.metrics));
});

test('the frozen wareLock snapshot governs the live shop: a fresh profile never buys a locked ware', async ()=>{
  const S=await sim();
  const m=S.simRun(4242,Object.assign({},S.DEFAULT_CFG,{market:'live',heroId:'kiln',omenId:'bull',storage:memStorage()}),'quick');
  assert.equal(m.marketMode,'live');
  for(const w of m.board.concat(m.vault||[])){
    assert.ok(LOCKED_START_WARES.indexOf(w.id)<0,'locked ware '+w.id+' reached a fresh-profile live board');
  }
});

test('live simRun is deterministic end to end and carries the seam evidence fields', async ()=>{
  const S=await sim();
  const cfg=Object.assign({},S.DEFAULT_CFG,{market:'live',heroId:'knife',omenId:'overstock',warePool:'starter'});
  const a=S.simRun(777,cfg,'quick'),b=S.simRun(777,cfg,'quick');
  assert.deepEqual(a,b,'same seed and cfg, byte-identical run');
  assert.equal(a.marketMode,'live');
  assert.equal(a.policyVersion,POLICY_VERSION);
  assert.ok(a.marketMetrics&&typeof a.marketMetrics.rolls==='number');
  assert.ok(Array.isArray(a.fusionEvents),'real fusion events recorded');
  for(const e of a.fusionEvents){assert.equal(e.type,'fusion');assert.ok(ITEMS[e.data.id]);}
  assert.ok(a.valid,'a live run is a valid run');
});

test('the abstract default path is untouched by the seam knob', async ()=>{
  const S=await sim();
  const plain=S.simRun(999,Object.assign({},S.DEFAULT_CFG,{}),'quick');
  assert.equal(plain.marketMode,'abstract');
  assert.equal(plain.policyVersion,undefined);
  assert.equal(plain.fusionEvents,undefined);
});
