"use strict";
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ITEMS,ANONE} from '../src/data.js';
import {fuseScan,gateOK,makeItem,playerFightItems} from '../src/engine.js';
import {treasureWareIds} from '../src/map.js';
import {planReward} from '../src/route-rewards.js';

const SHOP_WARES=[
  'surgeonhook','sapperspick','venomsiphon','kilnchain','saltward',
  'rosewaterpump','chirurgeonsscissors'
];
const TREASURE_WARES=[
  'viperverdict','cinderhook','brassreclaimer','blacklotuspress','serpentsdue',
  'antidotethief','funeralbrazier','ashencenser','phoenixbell','coinplatedram',
  'mirrorbastion','breakwaterbuckler','bloodpricechalice','mendersbell',
  'smoketaxstamp','peacebinderchain','gravebell','bazaarcompass'
];

test('R8 acquisition split adds exactly seven tier-2 combat wares to the route shop',()=>{
  const routeShop=Object.keys(ITEMS).filter(function(id){
    return gateOK(ITEMS[id].tier,6)&&!ITEMS[id].unique&&!ITEMS[id].inc;
  });
  /* 31 R8-era stock + the four 0.97.0 synergy-count payoff wares (drummer,
     procession, march, round), all tier-2 non-unique shop stock */
  assert.equal(routeShop.length,35);
  for(const id of SHOP_WARES){
    assert.equal(ITEMS[id].tier,2,id+' is tier-gated');
    assert.equal(ITEMS[id].unique,undefined,id+' is non-unique');
    assert.equal(ITEMS[id].acquisition,'shop',id+' has an explicit shop path');
    assert.ok(routeShop.includes(id),id+' is in route shop stock');
  }
});

test('the other eighteen R8 wares remain unique Dragon Gate Treasure rewards',()=>{
  const dragonGate=new Set(treasureWareIds(4));
  for(const id of TREASURE_WARES){
    assert.equal(ITEMS[id].unique,true,id+' stays unique');
    assert.equal(ITEMS[id].acquisition,'treasure',id+' stays Treasure-only');
    assert.ok(dragonGate.has(id),id+' is obtainable at the Dragon Gate');
  }
});

test('every promoted ware fuses across enchants and keeps its hook payload',()=>{
  for(const id of SHOP_WARES){
    const board=[makeItem(id,0),makeItem(id,0,'swift'),makeItem(id,0)];
    const forged=fuseScan(board);
    assert.equal(forged.length,1,id+' forges once');
    assert.equal(board.length,1,id+' consumes three Bronze copies');
    assert.equal(board[0].rarity,1,id+' becomes Silver');
    assert.equal(board[0].ench,'swift',id+' carries its enchant through fusion');
    const fightWare=playerFightItems(board,{},ANONE,1)[0];
    assert.equal(fightWare.hooks,ITEMS[id].hooks,id+' keeps its combat hooks');
    assert.equal(fightWare.cd,Math.round(ITEMS[id].cd*1000*0.85),id+' applies Swift after rarity build');
  }
});

test('Fusion Mote can copy a promoted ware but still rejects Treasure uniques',()=>{
  const shopPlan=planReward({mote:true},{board:[makeItem('kilnchain',0),makeItem('kilnchain',0)]});
  assert.deepEqual(shopPlan.mote,{item:'kilnchain'});
  const treasurePlan=planReward({mote:true},{board:[makeItem('ashencenser',0),makeItem('ashencenser',0)]});
  assert.deepEqual(treasurePlan.mote,{gold:3});
});
