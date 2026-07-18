"use strict";
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSimArgs,damageShareRows,encounterRows,encounterWin,batchValidity,simMidpointTreasure,midpointSummary,runBatch,omenA,heroOfId,coverageManifest} from '../scripts/route-sim.js';
import {ITEMS,ANONE,ANOMALIES,HEROES} from '../src/data.js';

const NOARGS={ab:false,matrix:false,coverage:false,mode:'quick',runs:600,heroId:null,omenId:null,uniques:null};
test('route sim arguments accept mode, ab, and seed count in any order',()=>{
  assert.deepEqual(parseSimArgs([]),NOARGS);
  assert.deepEqual(parseSimArgs(['120','long','ab']),Object.assign({},NOARGS,{ab:true,mode:'long',runs:120}));
  assert.deepEqual(parseSimArgs(['ab','quick','25']),Object.assign({},NOARGS,{ab:true,runs:25}));
  assert.deepEqual(parseSimArgs(['long']),Object.assign({},NOARGS,{mode:'long'}));
  assert.deepEqual(parseSimArgs(['hero=kiln','omen=moon','uniques=hold']),Object.assign({},NOARGS,{heroId:'kiln',omenId:'moon',uniques:'hold'}));
  assert.deepEqual(parseSimArgs(['matrix','40','long']),Object.assign({},NOARGS,{matrix:true,mode:'long',runs:40}));
  assert.deepEqual(parseSimArgs(['coverage']),Object.assign({},NOARGS,{coverage:true}));
});

test('omen and hero cells resolve exactly as the game builds them',()=>{
  assert.equal(omenA('none'),ANONE);
  assert.equal(omenA(null),ANONE);
  const moon=omenA('moon');
  assert.equal(moon.dmgMul,1.3);
  assert.equal(moon.healingDisabled,true);
  assert.equal(moon.hpMul,1,'sparse Omen fields fall back to the ANONE baseline');
  assert.throws(()=>omenA('nope'));
  assert.equal(heroOfId('kiln').tag,'burn');
  assert.equal(heroOfId('none'),null);
  assert.throws(()=>heroOfId('nope'));
  for(const om of ANOMALIES)assert.equal(typeof omenA(om.id).hpMul,'number',om.id);
  const runs=runBatch({heroId:'kiln',omenId:'moon'},{runs:2,mode:'quick'});
  assert.equal(runs.length,2);
  for(const r of runs){assert.equal(r.hero,'kiln');assert.equal(r.omen,'moon');}
  const plain=runBatch({},{runs:2,mode:'quick'});
  for(const r of plain){assert.equal(r.hero,'none');assert.equal(r.omen,'none');}
});

test('every hero id and omen id in data resolves through the cell helpers',()=>{
  for(const h of HEROES)assert.equal(heroOfId(h.id),h);
  for(const om of ANOMALIES)assert.equal(omenA(om.id).shopN>=1,true,om.id);
});

test('uniques=hold fights granted uniques on the board; the default melts them to budget',()=>{
  const hold=runBatch({uniques:'hold'},{runs:6,mode:'long'});
  const heldTotal=hold.reduce((s,r)=>s+r.heldUniques.length,0);
  assert.ok(heldTotal>0,'long runs reach Treasure and bounty uniques, so hold must capture some');
  for(const r of hold)for(const id of r.heldUniques)assert.equal(ITEMS[id].unique,true,id);
  const cash=runBatch({},{runs:6,mode:'long'});
  for(const r of cash)assert.equal(r.heldUniques.length,0);
});

test('the coverage manifest labels every mechanic full, proxy, or blind',()=>{
  const rows=coverageManifest();
  assert.ok(rows.length>=15);
  for(const row of rows){
    assert.ok(['full','proxy','blind'].includes(row.status),row.mechanic);
    assert.ok(row.mechanic&&row.note,row.mechanic);
  }
  /* the labels that guard against silent rot: heroes and uniques are no longer blind */
  assert.ok(rows.some(r=>r.status==='full'&&/hero fight mods/.test(r.mechanic)));
  assert.ok(rows.some(r=>r.status==='proxy'&&/uniques/.test(r.mechanic)));
});

test('damage shares count run appearances and omit storm, unattributed, and Treasure uniques',()=>{
  const damage={weapon:8,poison:2,burn:0,hook:0,storm:90,other:0,total:100};
  const runs=[
    {fights:[{wares:[{id:'vial',damage:damage},{id:'vial',damage:{poison:5}},{id:'viperverdict',damage:{weapon:999}}]},
      {wares:[{id:'vial',damage:{weapon:0,poison:10}}]}]},
    {fights:[{wares:[{id:'torch',damage:{burn:20,storm:999}}]}]}
  ];
  const rows=damageShareRows(runs),vial=rows.find(r=>r.id==='vial'),torch=rows.find(r=>r.id==='torch');
  assert.equal(rows.some(r=>r.id==='viperverdict'),false);
  assert.equal(vial.appearances,1);
  assert.equal(vial.fights,2);
  assert.equal(vial.total,25);
  assert.equal(torch.total,20);
  assert.equal(vial.share,25/45);
  assert.equal(torch.share,20/45);
});

test('encounter grouping keeps repeated monsters separate by district',()=>{
  const runs=[{fights:[
    {first:true,type:'boss',band:1,mon:'matron',won:true},
    {first:true,type:'boss',band:4,mon:'matron',won:false},
    {first:false,type:'boss',band:4,mon:'matron',won:true}
  ]}];
  assert.deepEqual(encounterRows(runs).map(r=>[r.district,r.mon,r.fights,r.wins]),[
    [1,'matron',1,1],[4,'matron',1,0]
  ]);
  assert.deepEqual(encounterWin(runs,4,'matron'),{rate:0,n:1});
});

test('batch validity reports every safety failure',()=>{
  const runs=[
    {valid:true,guardTrips:0,fightTimeouts:0,routeGuardExits:0,pendingActions:[]},
    {valid:false,guardTrips:2,guardCounts:{depth:1,root:1},fightTimeouts:1,routeGuardExits:1,combatPendingActions:2,pendingActions:['pending_event']}
  ];
  assert.deepEqual(batchValidity(runs),{invalid:1,guardTrips:2,
    guardCounts:{contacts:0,catchup:0,depth:1,root:1,step:0,hook:0},
    fightTimeouts:1,routeGuardExits:1,pendingActions:3});
});

test('sim midpoint offers are deterministic, unowned Treasure uniques with an honest fallback',()=>{
  const first=simMidpointTreasure(123,new Set()),again=simMidpointTreasure(123,new Set());
  assert.deepEqual(again,first);
  assert.equal(first.offered.length,3);
  assert.equal(first.selected,first.offered[0]);
  first.offered.forEach(function(id){assert.equal(ITEMS[id].unique&&ITEMS[id].acquisition==='treasure',true);});
  const excluded=simMidpointTreasure(123,new Set([first.offered[0]]));
  assert.equal(excluded.offered.includes(first.offered[0]),false);
  const all=new Set(Object.keys(ITEMS).filter(function(id){return ITEMS[id].unique&&ITEMS[id].acquisition==='treasure';}));
  assert.deepEqual(simMidpointTreasure(123,all),{offered:[],selected:null,fallbackGold:10,contribution:'abstracted'});
});

test('sim reports zero Quick pivots and one abstracted Long pivot per run reaching D4',()=>{
  const quick=runBatch({},{runs:3,mode:'quick'}),long=runBatch({},{runs:3,mode:'long'});
  assert.deepEqual(midpointSummary(quick),{runs:3,reached:0,selections:0,fallbacks:0,fallbackGold:0,
    offered:[],selected:[],heldRuns:0,contribution:'abstracted'});
  const p=midpointSummary(long);
  assert.equal(p.reached,3);
  assert.equal(p.selections,3);
  assert.equal(p.fallbacks,0);
  assert.equal(p.contribution,'abstracted');
  long.forEach(function(run){
    assert.equal(run.midpointTreasure.offered.includes(run.midpointTreasure.selected),true);
    assert.equal(damageShareRows([run]).some(function(row){return row.id===run.midpointTreasure.selected;}),false);
  });
});
