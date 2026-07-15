"use strict";
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSimArgs,damageShareRows,encounterRows,encounterWin,batchValidity,simMidpointTreasure,midpointSummary,runBatch} from '../scripts/route-sim.js';
import {ITEMS} from '../src/data.js';

test('route sim arguments accept mode, ab, and seed count in any order',()=>{
  assert.deepEqual(parseSimArgs([]),{ab:false,mode:'quick',runs:600});
  assert.deepEqual(parseSimArgs(['120','long','ab']),{ab:true,mode:'long',runs:120});
  assert.deepEqual(parseSimArgs(['ab','quick','25']),{ab:true,mode:'quick',runs:25});
  assert.deepEqual(parseSimArgs(['long']),{ab:false,mode:'long',runs:600});
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
    offered:[],selected:[],contribution:'abstracted'});
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
