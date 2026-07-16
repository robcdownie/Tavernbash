import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newMetrics,resumeMetrics,activateMetrics,pauseMetrics,setMetricPhase,serializeMetrics,recordMetric,
  captureBoardSnapshot,beginCombatTally,recordCombatDiagnostic,commitCombatTally,METRIC_EVENT_LIMIT} from '../src/route-metrics.js';

test('route metrics reconcile phases and exclude hidden and reload gaps',()=>{
  let m=resumeMetrics(newMetrics(1000),1000,false);
  setMetricPhase(m,'map',1,1100);
  setMetricPhase(m,'market',1,1300);
  pauseMetrics(m,1500);
  activateMetrics(m,10000);
  pauseMetrics(m,10100);
  assert.equal(m.timing.activeMs,600);
  assert.deepEqual(m.timing.phases,{setup:100,map:200,market:300});
  assert.equal(m.timing.districts['1'].activeMs,600);
  const wire=serializeMetrics(m);
  m=resumeMetrics(wire,50000,true);
  pauseMetrics(m,50100);
  assert.equal(m.timing.activeMs,700,'offline reload gap did not accrue');
  assert.equal(m.timing.sessions,2);
  assert.equal(m.timing.reloads,1);
});

test('raw metric cap drops events while shop aggregates keep counting',()=>{
  const m=resumeMetrics(newMetrics(0),0,false);
  for(let i=0;i<METRIC_EVENT_LIMIT+9;i++)recordMetric(m,'shop_roll',{offers:[{id:'dagger'}]},i);
  assert.equal(m.events.length,METRIC_EVENT_LIMIT);
  assert.equal(m.droppedEvents,9);
  assert.equal(m.shops.rolls,METRIC_EVENT_LIMIT+9);
  assert.equal(m.wares.dagger.exposures,METRIC_EVENT_LIMIT+9);
});

test('event choices keep durable aggregate outcomes beyond the raw event stream',()=>{
  const m=resumeMetrics(newMetrics(0),0,false);
  recordMetric(m,'event_choice',{kind:'nego',outcome:'quick_sale'},1);
  recordMetric(m,'event_choice',{kind:'nego',outcome:'fresh_stock'},2);
  recordMetric(m,'event_choice',{kind:'nego',outcome:'walk_away'},3);
  recordMetric(m,'event_choice',{kind:'nego',outcome:'quick_sale'},4);
  recordMetric(m,'event_choice',{kind:'treasure',choice:{kind:'gold'}},5);
  assert.deepEqual(m.choices,{
    'nego:quick_sale':2,'nego:fresh_stock':1,'nego:walk_away':1,'treasure:gold':1
  });
  assert.deepEqual(serializeMetrics(m).choices,m.choices);
});

test('board snapshots keep durable ware identity and economy context',()=>{
  const m=resumeMetrics(newMetrics(0),0,false);
  const board=[{iid:7,id:'torch',rarity:2,ench:'blazing',size:1}];
  const snap=captureBoardSnapshot(m,'pre_fight',{nodeId:'d1c1l0'},board,[],{gold:4,tier:2},20);
  assert.equal(snap.board[0].iid,7);
  assert.equal(snap.board[0].ench,'blazing');
  assert.equal(snap.gold,4);
});

test('status pools apportion exact damage through decay and spawned damage keeps its root ware',()=>{
  const m=resumeMetrics(newMetrics(0),0,false);
  const board=[{iid:1,id:'vial',rarity:0,size:1},{iid:2,id:'serpent',rarity:0,size:1}];
  const tally=beginCombatTally({nodeId:'x'},board,[{uid:10},{uid:11}],[]);
  recordCombatDiagnostic(tally,{kind:'status_add',status:'poison',source:{side:'a',uid:10,slot:0},target:{side:'b'},amount:4});
  recordCombatDiagnostic(tally,{kind:'status_add',status:'poison',source:{side:'a',uid:11,slot:1},target:{side:'b'},amount:6});
  recordCombatDiagnostic(tally,{kind:'status_tick',status:'poison',channel:'poison',target:{side:'b'},amount:5,post:4});
  recordCombatDiagnostic(tally,{kind:'status_tick',status:'poison',channel:'poison',target:{side:'b'},amount:4,post:0});
  recordCombatDiagnostic(tally,{kind:'spawn',source:{side:'a',uid:10,slot:0},spawned:{side:'a',uid:99,slot:0}});
  recordCombatDiagnostic(tally,{kind:'damage',source:{side:'a',uid:99,slot:0},channel:'weapon',amount:7});
  const fight=commitCombatTally(m,tally,{winner:'a'},100);
  assert.equal(fight.wares.reduce((s,w)=>s+w.damage.total,0),16);
  assert.equal(m.wares.vial.damage.weapon,7,'spawn damage credited to the original vial slot');
  assert.equal(m.wares.vial.utility.spawn,1);
  assert.equal(m.wares.vial.damage.poison+m.wares.serpent.damage.poison,9,'integer shares reconcile exactly');
});
