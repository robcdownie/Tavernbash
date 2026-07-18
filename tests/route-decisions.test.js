import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ITEMS,ENCH} from '../src/data.js';
import {newRun,serializeRun,reviveRun} from '../src/route-run.js';
import {
  routeDecisionKey,ensureRouteDecision,routeDecisionReceipt,routeDecisionTargetOptions,
  commitRouteDecision
} from '../src/route-decisions.js';

const SEED=0x71a5cafe;

function eventFixture(type,extra){
  const run=newRun({seed:SEED,routeMode:'quick',now:0});
  const node=Object.assign({id:'event-'+type,type:type,district:1},extra||{});
  run.route.phase='event';run.route.pendingId=node.id;run.route.resolution='event';
  const map={nodes:{},districts:[{id:1}]};map.nodes[node.id]=node;
  return {run:run,node:node,map:map};
}

function prepare(f,context){
  const result=ensureRouteDecision(f.run,f.node,Object.assign({heroId:'kiln',directEventGold:6},context||{}));
  assert.equal(result.ok,true);return result;
}

function eventCount(run){return run.metrics.events.filter(function(e){return e.type==='event_choice';}).length;}
function wire(run){return JSON.parse(JSON.stringify(serializeRun(run)));}

test('a decision receipt freezes deterministic Merchant offers before display',()=>{
  const a=eventFixture('negotiation'),b=eventFixture('negotiation');
  const pa=prepare(a),pb=prepare(b);
  assert.equal(pa.created,true);assert.equal(pb.created,true);
  assert.deepEqual(pa.receipt.offers,pb.receipt.offers);
  const again=ensureRouteDecision(a.run,a.node,{heroId:'other',directEventGold:99});
  assert.equal(again.created,false);
  assert.equal(again.receipt,pa.receipt,'resume never regenerates an offer');
  assert.equal(again.receipt.offers[0].gold,6,'the original direct-gold value stays frozen');
});

test('a prepared decision rejects a different node, choice, or target without mutation',()=>{
  const f=eventFixture('shrine');prepare(f);
  f.run.economy.board=[{id:'dagger',iid:1,rarity:0}];
  const before=serializeRun(f.run);
  assert.equal(commitRouteDecision(f.run,f.map,'other','ashes',null,10).ok,false);
  assert.equal(commitRouteDecision(f.run,f.map,f.node.id,'missing',null,10).ok,false);
  assert.equal(commitRouteDecision(f.run,f.map,f.node.id,'trial',999,10).ok,false);
  assert.deepEqual(serializeRun(f.run),before);
});

test('Fresh Stock payment is exactly once before and after reload at every crash boundary',()=>{
  const f=eventFixture('negotiation'),prepared=prepare(f);
  const pendingWire=wire(f.run),fresh=prepared.receipt.offers.find(function(o){return o.id==='fresh_stock';});
  assert.ok(fresh.wareId&&ITEMS[fresh.wareId]);

  const first=commitRouteDecision(f.run,f.map,f.node.id,'fresh_stock',null,50);
  assert.equal(first.ok,true);assert.equal(first.duplicate,false);
  assert.equal(f.run.economy.gold,3);
  assert.equal(f.run.economy.shop.filter(function(o){return o.id===fresh.wareId;}).length,1);
  assert.equal(first.receipt.payment,3);assert.equal(eventCount(f.run),1);
  const committedWire=wire(f.run);

  const sameMemory=commitRouteDecision(f.run,f.map,f.node.id,'fresh_stock',null,50);
  assert.equal(sameMemory.duplicate,true);
  assert.deepEqual(serializeRun(f.run),committedWire,'a repeated click cannot charge or grant again');

  const afterReload=reviveRun(committedWire);
  const after=commitRouteDecision(afterReload,f.map,f.node.id,'fresh_stock',null,50);
  assert.equal(after.duplicate,true);
  assert.deepEqual(serializeRun(afterReload),committedWire,'a reload after checkpoint stays committed');

  const beforeReload=reviveRun(pendingWire);
  const retry=commitRouteDecision(beforeReload,f.map,f.node.id,'fresh_stock',null,50);
  assert.equal(retry.ok,true);assert.equal(retry.duplicate,false);
  assert.deepEqual(serializeRun(beforeReload),committedWire,'a crash before checkpoint replays the transaction once');
});

test('a Treasure reward is exactly once before and after reload at every crash boundary',()=>{
  const f=eventFixture('treasure',{reward:{options:[{kind:'ware',id:'dagger'},{kind:'gold'}]}});
  prepare(f,{directEventGold:8});
  const pendingWire=wire(f.run);
  const first=commitRouteDecision(f.run,f.map,f.node.id,'0',null,75);
  assert.equal(first.ok,true);
  assert.equal(f.run.economy.shop.filter(function(o){return o.id==='dagger'&&o.free;}).length,1);
  assert.equal(eventCount(f.run),1);
  const committedWire=wire(f.run);

  const afterReload=reviveRun(committedWire);
  assert.equal(commitRouteDecision(afterReload,f.map,f.node.id,'0',null,75).duplicate,true);
  assert.deepEqual(serializeRun(afterReload),committedWire);

  const beforeReload=reviveRun(pendingWire);
  commitRouteDecision(beforeReload,f.map,f.node.id,'0',null,75);
  assert.deepEqual(serializeRun(beforeReload),committedWire);
});

test('every shipped event option creates one receipt, one report row, and one route completion',()=>{
  const ench=Object.keys(ENCH)[0];
  const cases=[
    {type:'treasure',extra:{reward:{options:[{kind:'ware',id:'dagger'}]}},pick:'0'},
    {type:'treasure',extra:{reward:{options:[{kind:'enchant',ench:ench}]}},pick:'0',board:true},
    {type:'treasure',extra:{reward:{options:[{kind:'silver'}]}},pick:'0',board:true,target:true},
    {type:'treasure',extra:{reward:{options:[{kind:'gold'}]}},pick:'0'},
    {type:'rest',pick:'mend'},
    {type:'rest',pick:'temper',board:true},
    {type:'rest',pick:'refit'},
    {type:'shrine',pick:'ashes'},
    {type:'shrine',pick:'trial',board:true,target:true},
    {type:'shrine',pick:'castoff',board:true,target:true},
    {type:'negotiation',pick:'quick_sale'},
    {type:'negotiation',pick:'fresh_stock'},
    {type:'negotiation',pick:'walk_away'}
  ];
  cases.forEach(function(c,index){
    const f=eventFixture(c.type,c.extra);f.node.id+='-'+index;f.map.nodes={};f.map.nodes[f.node.id]=f.node;
    f.run.route.pendingId=f.node.id;
    if(c.board)f.run.economy.board=[{id:'dagger',iid:1,rarity:0}];
    const prepared=prepare(f),target=c.target?1:null;
    if(c.target)assert.ok(routeDecisionTargetOptions(f.run,prepared.receipt,c.pick).some(function(o){return o.iid===1;}));
    const result=commitRouteDecision(f.run,f.map,f.node.id,c.pick,target,100+index);
    assert.equal(result.ok,true,c.type+':'+c.pick);
    assert.equal(result.receipt.applied,true);
    assert.equal(eventCount(f.run),1);
    assert.equal(f.run.route.phase==='map'||f.run.route.phase==='lost',true);
    assert.deepEqual(f.run.route.path,[f.node.id]);
    const once=serializeRun(f.run);
    assert.equal(commitRouteDecision(f.run,f.map,f.node.id,c.pick,target,100+index).duplicate,true);
    assert.deepEqual(serializeRun(f.run),once,c.type+':'+c.pick+' is idempotent');
  });
});

test('unaffordable Fresh Stock leaves the event and receipt open without charging',()=>{
  const f=eventFixture('negotiation');f.run.economy.gold=2;prepare(f);
  const before=serializeRun(f.run),result=commitRouteDecision(f.run,f.map,f.node.id,'fresh_stock',null,10);
  assert.deepEqual(result,{ok:false,reason:'not enough gold'});
  assert.deepEqual(serializeRun(f.run),before);
  assert.equal(routeDecisionReceipt(f.run,f.node.id).applied,false);
});

test('the ordered hook keeps the historical event, fusion, route metric sequence',()=>{
  const f=eventFixture('treasure',{reward:{options:[{kind:'silver'}]}});
  f.run.economy.board=[{id:'dagger',iid:1,rarity:0}];prepare(f);
  let hookSeen=false;
  const result=commitRouteDecision(f.run,f.map,f.node.id,'0',1,20,function(tx){
    hookSeen=true;
    assert.equal(tx.needsFusion,true);
    assert.equal(f.run.economy.board[0].rarity,1,'the reward mutation precedes fusion');
    assert.equal(f.run.route.phase,'event','the controller waits behind fusion');
    assert.deepEqual(f.run.metrics.events.map(function(e){return e.type;}),['event_choice']);
  });
  assert.equal(result.ok,true);assert.equal(hookSeen,true);
  assert.deepEqual(f.run.metrics.events.map(function(e){return e.type;}),['event_choice','route_resolveEvent']);
});

test('receipt keys cannot collide with monster reward receipts',()=>{
  const f=eventFixture('rest'),key=routeDecisionKey(f.run.runId,f.node.id);prepare(f);
  assert.equal(key.includes(':decision:'),true);
  assert.equal(Object.keys(f.run.receipts).length,1);
  assert.equal(f.run.receipts[key].kind,'routeDecision');
});
