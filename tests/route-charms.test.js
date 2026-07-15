import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TRINKETS} from '../src/data.js';
import {genMap} from '../src/map.js';
import {attachCharmCheckpoint,charmOffers,charmVictoryIncome,commonBoardCategory,isCharmCheckpoint} from '../src/route-charms.js';

const SEED=4237745151;
const byId=id=>TRINKETS.find(t=>t.id===id);

test('only the first two district bosses are Charm checkpoints',()=>{
  const map=genMap(SEED);
  assert.equal(isCharmCheckpoint(map.districts[0].boss),true);
  assert.equal(isCharmCheckpoint(map.districts[1].boss),true);
  assert.equal(isCharmCheckpoint(map.districts[2].boss),false);
  assert.equal(isCharmCheckpoint(map.districts[3].boss),false);
  assert.equal(isCharmCheckpoint(map.districts[0].columns[0][0]),false);
});

test('Charm offers are deterministic, distinct, relevant, and neutral',()=>{
  const board=[{id:'vial'},{id:'venom'},{id:'dagger'}];
  assert.equal(commonBoardCategory(board),'poison');
  const a=charmOffers(SEED,'d1boss',board,[]);
  const b=charmOffers(SEED,'d1boss',board,[]);
  assert.deepEqual(a,b);
  assert.equal(a.length,4);
  assert.equal(new Set(a).size,4);
  assert.ok(a.some(id=>byId(id).tag==='poison'),'contains the commonest category');
  assert.ok(a.some(id=>byId(id).tag==='neutral'),'contains a neutral Charm');
});

test('the second checkpoint excludes the first Charm and still has a neutral offer',()=>{
  const offers=charmOffers(SEED,'d2boss',[{id:'torch'},{id:'bomb'}],[byId('quick')]);
  assert.equal(offers.includes('quick'),false);
  assert.ok(offers.some(id=>byId(id).tag==='neutral'),'Merchant Prince remains as the other neutral');
});

test('a first or second boss reward gains a Charm choice, while other rewards do not',()=>{
  const map=genMap(SEED),plain={choice:null};
  const d1=attachCharmCheckpoint({...plain},map.districts[0].boss,SEED,[{id:'vial'},{id:'venom'}],[]);
  assert.equal(d1.choice,'charm');
  assert.equal(d1.choiceOptions.length,4);
  const d3=attachCharmCheckpoint({...plain},map.districts[2].boss,SEED,[],[]);
  assert.equal(d3.choice,null);
  const existing=attachCharmCheckpoint({choice:'gild'},map.districts[0].boss,SEED,[],[]);
  assert.equal(existing.choice,'gild','an existing bounty choice is never overwritten');
});

test('Merchant Prince keeps its three gold as route victory income',()=>{
  assert.equal(charmVictoryIncome([]),0);
  assert.equal(charmVictoryIncome([byId('prince')]),3);
  assert.equal(charmVictoryIncome(['prince',byId('quick')]),3);
});
