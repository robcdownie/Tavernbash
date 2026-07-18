"use strict";
/* 0.99.0 signature wares (design-build-identity.md, Part A). The golden combat
   traces in combat-fixtures.js pin each ware's hook behavior byte for byte; this
   file pins the two things a golden cannot: the hero gate at every grant pool (no
   foreign signature ever leaks), and the four correctness claims the design
   review flagged as the wares' bug classes. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {ITEMS,HEROES} from '../src/data.js';
import {validateCombatHooks,gateOK} from '../src/engine.js';
import {treasureWareIds} from '../src/map.js';
import {campEnsure,newRun} from '../src/route-run.js';
import {fi,capture} from './combat-fixtures.js';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const SIG=Object.keys(ITEMS).filter(id=>ITEMS[id].sig);
const HERO_IDS=HEROES.map(h=>h.id);
const mkside=(items,extra)=>Object.assign({nm:'S',portrait:'p-0',hp:100,items:items,lifesteal:0,regen:0},extra);

/* ---- structure and hook validity ---- */

test('sixteen signature wares, two per hero, every hook valid',()=>{
  assert.equal(SIG.length,16);
  const byHero={};
  for(const id of SIG){
    const it=ITEMS[id];
    assert.ok(HERO_IDS.indexOf(it.sig)>=0,id+' names a real hero');
    assert.equal(it.unique,undefined,id+' is non-unique');
    assert.equal(it.acquisition,'shop',id+' is shop-acquired');
    if(it.hooks)validateCombatHooks(it.hooks);
    byHero[it.sig]=(byHero[it.sig]||0)+1;
  }
  for(const h of HERO_IDS)assert.equal(byHero[h],2,h+' owns exactly two signatures');
});

/* ---- the gate at every grant pool ---- */

test('the shop grant filter shows a hero its own signatures and no others',()=>{
  /* the exact predicate rollShop, the opening offense seed, and Fresh Stock all
     apply (tier gate aside): a ware passes for a hero when it carries no sig or
     the sig is that hero. Proven across all eight heroes and all sixteen sigs. */
  const grantPool=hero=>new Set(Object.keys(ITEMS).filter(id=>
    gateOK(ITEMS[id].tier,6)&&!ITEMS[id].unique&&!ITEMS[id].inc&&(!ITEMS[id].sig||ITEMS[id].sig===hero)));
  for(const hero of HERO_IDS){
    const pool=grantPool(hero);
    for(const id of SIG){
      if(ITEMS[id].sig===hero)assert.ok(pool.has(id),hero+' can roll its own signature '+id);
      else assert.ok(!pool.has(id),hero+' must never roll foreign signature '+id);
    }
  }
});

test('no signature ware ever enters the Treasure pool at any district',()=>{
  for(const district of [1,2,3,4]){
    const pool=new Set(treasureWareIds(district));
    for(const id of SIG)assert.ok(!pool.has(id),'district '+district+' Treasure must exclude signature '+id);
  }
});

test('the Gate Camp Quartermaster never offers a foreign signature',()=>{
  for(const hero of HERO_IDS){
    for(let n=0;n<40;n++){
      const run=newRun({seed:5000+n,routeMode:'quick'});
      const camp=campEnsure(run,{id:'gate-'+n},6,hero);
      for(const offer of camp.offers){
        const sig=ITEMS[offer.id]&&ITEMS[offer.id].sig;
        if(sig)assert.equal(sig,hero,hero+' Quartermaster leaked '+offer.id);
      }
    }
  }
});

test('the sig gate is wired at every grant pool and the treasure exclusion holds',()=>{
  const ui=readFileSync(join(root,'src','ui.js'),'utf8');
  const routeDecisions=readFileSync(join(root,'src','route-decisions.js'),'utf8');
  const routeRun=readFileSync(join(root,'src','route-run.js'),'utf8');
  const map=readFileSync(join(root,'src','map.js'),'utf8');
  /* rollShop and the opening offense seed both carry the hero clause in ui.js */
  const uiGates=(ui.match(/ITEMS\[id\]\.sig===G\.hero/g)||[]).length;
  assert.ok(uiGates>=2,'ui.js gates both rollShop and the opening offense seed (found '+uiGates+')');
  assert.ok(/!d\.sig\|\|d\.sig===heroId/.test(routeDecisions),'route-decisions.js gates Fresh Stock');
  assert.ok(/ITEMS\[id\]\.sig===heroId/.test(routeRun),'route-run.js gates the Quartermaster');
  assert.ok(/!item\.sig/.test(map),'map.js excludes signatures from Treasure');
});

/* ---- the four flagged correctness claims ---- */

test('the Oilstone hones EVERY ready blade, not just the leading one',()=>{
  /* both blades strike for 5 base + 2 honed = 7 after the oilstone activates */
  const cfg={seed:1,stormAt:9e9,playerIs:'a',
    a:mkside([
      fi({nm:'Oilstone',cat:'dmg',cd:2000,fx:{dmg:5},hooks:ITEMS.oilstone.hooks}),
      fi({nm:'BladeL',cat:'dmg',cd:4000,integ:100,fx:{dmg:5}}),
      fi({nm:'BladeR',cat:'dmg',cd:4000,integ:100,fx:{dmg:5}})
    ]),
    b:mkside([fi({nm:'Wall',cd:9e9,integ:400})],{hp:400})};
  const r=capture(cfg,[2000,2000]);
  const honed=r.events.filter(e=>e.k==='chip'&&e.amt===7).length;
  assert.equal(honed,2,'both blades pay the honed bonus once');
});

test('the Alembic feeds while alive but never from its grave',()=>{
  /* the alembic dies at t=1000; the enemy ware it would poison dies at t=2000,
     after the source is gone. op poison guards on a live source and there is no
     allowDead, so no poison lands from the grave. */
  const cfg={seed:1,stormAt:9e9,playerIs:'a',
    a:mkside([
      fi({nm:'Alembic',cat:'poison',size:2,cd:9e9,integ:5,fx:{poison:3},hooks:ITEMS.alembic.hooks}),
      fi({nm:'Killer',cat:'dmg',cd:2000,integ:100,fx:{dmg:50}})
    ]),
    b:mkside([
      fi({nm:'Hitter',cat:'dmg',cd:1000,integ:100,fx:{dmg:20}}),
      fi({nm:'Fragile',cd:9e9,integ:5})
    ],{hp:200})};
  const r=capture(cfg,[1000,1000]);
  const poisAdds=r.events.filter(e=>e.k==='pois').length;
  assert.equal(poisAdds,0,'a dead alembic applies no poison when an enemy ware breaks');
});

test('the Alembic does feed while it is alive (control for the grave test)',()=>{
  const cfg={seed:1,stormAt:9e9,playerIs:'a',
    a:mkside([
      fi({nm:'Alembic',cat:'poison',size:2,cd:9e9,integ:100,fx:{poison:3},hooks:ITEMS.alembic.hooks}),
      fi({nm:'Killer',cat:'dmg',cd:2000,integ:100,fx:{dmg:50}})
    ]),
    b:mkside([
      fi({nm:'Fragile',cd:9e9,integ:5}),
      fi({nm:'Wall',cd:9e9,integ:200})
    ],{hp:200})};
  const r=capture(cfg,[2000]);
  const poisAdds=r.events.filter(e=>e.k==='pois').length;
  assert.ok(poisAdds>=1,'a live alembic poisons on an enemy break');
});

test('the Funerary Urn double-spawns under One True Funeral',()=>{
  /* the urn is the hero rule s first (and only) rattle; oneTrueFuneral resolves
     it twice, so one urn death lands two Risen Ash bodies */
  const cfg={seed:1,stormAt:9e9,playerIs:'a',
    a:mkside([fi({nm:'Urn',cat:'util',size:2,cd:0,bulwark:true,integ:10,maxI:10,fx:{},rattle:ITEMS.urn.rattle})],
      {rules:{oneTrueFuneral:true}}),
    b:mkside([fi({nm:'Hitter',cat:'dmg',cd:1000,integ:100,fx:{dmg:20}})])};
  const r=capture(cfg,[1000,1000]);
  const spawns=r.events.filter(e=>e.k==='spawn').length;
  assert.equal(spawns,2,'one urn funeral resolves twice');
});

test('the Repossession Writ auctions successive enemy weapons and survives',()=>{
  /* the finest weapon (higher fx.dmg) is auctioned first; the writ survives to
     auction the next on its following activation, skipping the standing lot */
  const cfg={seed:1,stormAt:9e9,playerIs:'a',
    a:mkside([fi({nm:'Writ',cat:'util',size:2,cd:6000,integ:100,fx:{disable:true}})]),
    b:mkside([
      fi({nm:'Big',cat:'dmg',cd:9e9,integ:100,fx:{dmg:20}}),
      fi({nm:'Small',cat:'dmg',cd:9e9,integ:100,fx:{dmg:10}})
    ],{hp:200})};
  const r=capture(cfg,[6000,6000]);
  const lots=r.events.filter(e=>e.k==='lot');
  assert.equal(lots.length,2,'two distinct weapons are auctioned');
  assert.notEqual(lots[0].i,lots[1].i,'the second activation seizes a different weapon');
  assert.equal(lots[0].i,0,'the finest weapon (slot 0) goes first');
});
