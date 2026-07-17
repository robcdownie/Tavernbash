"use strict";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {boardPool} from '../scripts/route-sim.js';
import {starterShopIds, LOCKED_START_WARES} from '../src/unlock-profile.js';
import {ITEMS} from '../src/data.js';

/* SEAM 7: the route-sim warePool knob. The starter pool must be exactly the
   set unlock-profile.js declares (the single source of truth), and 'full' or
   unset must leave the full pool untouched, so the gate readout and the game's
   starter shop can never drift apart. */

test("cfg.warePool='starter' restricts the pool to exactly starterShopIds()",()=>{
  /* at tier 6 gateOK admits every classic (max starter tier is 3, which gates
     in at tier 4), so the whole 24-ware starter set is eligible: the starter
     pool is then the full starter list, nothing added, nothing dropped. */
  const starter=boardPool(6,{warePool:'starter'});
  assert.deepEqual(starter.slice().sort(),starterShopIds().slice().sort());
});

test("the starter pool is the full pool intersected with starterShopIds() at every tier",()=>{
  /* tier-agnostic invariant: whatever the gate admits under 'full', the starter
     knob keeps exactly the members that are starter ids, so the restriction is a
     pure appended filter clause against unlock-profile's list. */
  for(const tier of [1,2,3,4,5,6]){
    const full=boardPool(tier,{warePool:'full'});
    const starter=boardPool(tier,{warePool:'starter'});
    const expected=full.filter(id=>starterShopIds().indexOf(id)>=0);
    assert.deepEqual(starter,expected,'tier '+tier);
    starter.forEach(id=>assert.ok(starterShopIds().indexOf(id)>=0,'starter pool leaked non-starter '+id+' at tier '+tier));
  }
});

test("cfg.warePool='full' and unset do NOT restrict the pool",()=>{
  const full=boardPool(6,{warePool:'full'});
  const unset=boardPool(6);
  const legacy=boardPool(6,{});
  /* unset and 'full' are the same pool, and it is strictly wider than starter */
  assert.deepEqual(unset,full);
  assert.deepEqual(legacy,full);
  const starter=boardPool(6,{warePool:'starter'});
  assert.ok(full.length>starter.length,'full pool must be wider than the starter pool');
  /* the seven R8 hook wares are non-unique non-income, so they ride the full
     pool at tier 6 but are absent from the starter pool */
  LOCKED_START_WARES.forEach(id=>{
    if(!(ITEMS[id]&&!ITEMS[id].unique&&!ITEMS[id].inc))return;
    assert.ok(full.indexOf(id)>=0,'full pool should hold R8 ware '+id);
    assert.ok(starter.indexOf(id)<0,'starter pool must exclude R8 ware '+id);
  });
});

test("the warePool knob reads from unlock-profile.js, not a hard-coded id list",()=>{
  const src=readFileSync(fileURLToPath(new URL('../scripts/route-sim.js',import.meta.url)),'utf8');
  assert.ok(/from '\.\.\/src\/unlock-profile\.js'/.test(src),'route-sim must import from unlock-profile.js');
  assert.ok(/starterShopIds\(\)/.test(src),'route-sim must call starterShopIds()');
  /* guard against a re-introduced literal copy of the starter set. A couple of
     starter ids legitimately appear as quoted literals in the damage-share
     readout (vial, torch); a copied 24-id array would put nearly all of them in
     the source, so a low count proves the knob still leans on starterShopIds(). */
  const literalCount=starterShopIds().filter(id=>src.indexOf("'"+id+"'")>=0||src.indexOf('"'+id+'"')>=0).length;
  assert.ok(literalCount<=2,'route-sim looks like it hard-codes the starter set ('+literalCount+' starter ids as literals)');
});
