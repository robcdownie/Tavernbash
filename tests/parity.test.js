import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import * as engine from '../src/engine.js';
import {ANONE,PERSONAS,ITEMS,MONSTERS,TRINKETS,ANOMALIES,RSTAT,RINTEG,COST} from '../src/data.js';

/* Load the original single-file game in a vm sandbox. Its boot is guarded on
   typeof document, so only the logic and the BB export run. */
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const html=readFileSync(join(root,'bazaar-brawler.html'),'utf8');
const m=html.match(/<script>([\s\S]*)<\/script>/);
assert.ok(m,'original script block found');
const ctx=createContext({Math:Math,Date:Date,Object:Object});
runInContext('var globalThis=this;'+m[1],ctx);
const ORIG=ctx.BB;

/* The rebalance ledger. Every deliberate deviation from the original file
   is recorded here with its approval; anything NOT in this ledger must
   stay byte-identical, so accidental drift is still caught.
   2026-07-11, approved by Robbie from the balance harness readouts:
   - poison trim (poison was 39-45% of all merchant damage at every band):
     serpent poison 3 to 2, vial cooldown 3 to 3.5, venom poison 7 to 5
   - rival curve: genRival budget 9+round*5.5 becomes 8+(round-1)*6 so
     round 1 rivals build near player parity and converge by round 10 */
const REBALANCED_ITEMS={
  serpent:{cd:3.5,fx:{dmg:6,poison:2}},
  vial:{cd:3.5,fx:{poison:2}},
  venom:{cd:4.5,fx:{poison:5}},
  /* 2026-07-12, the clean hands pass, approved by Robbie: names that
     collided with The Bazaar or Dota properties were renamed */
  crossbow:{n:"Souk Crossbow"},
};
const RENAMED_MONSTERS={
  rats:{n:"Souk Rats"},
};
const RENAMED_TRINKETS={
  venomancer:{n:"Poisonmonger"},
};
/* R8 adds hook-driven unique wares without placing them in the legacy shop or
   rival pools. This ledger pins every approved addition to its version and its
   concrete route acquisition path. */
const R8_UNIQUE_WARES={
  viperverdict:{version:"0.69.0",batch:"weapons",acquisition:"treasure"},
  cinderhook:{version:"0.69.0",batch:"weapons",acquisition:"treasure"},
  brassreclaimer:{version:"0.69.0",batch:"weapons",acquisition:"treasure"},
  surgeonhook:{version:"0.69.0",batch:"weapons",acquisition:"treasure"},
  sapperspick:{version:"0.69.0",batch:"weapons",acquisition:"treasure"},
  blacklotuspress:{version:"0.70.0",batch:"poison",acquisition:"treasure"},
  serpentsdue:{version:"0.70.0",batch:"poison",acquisition:"treasure"},
  antidotethief:{version:"0.70.0",batch:"poison",acquisition:"treasure"},
  venomsiphon:{version:"0.70.0",batch:"poison",acquisition:"treasure"},
};

/* The byte-identical fight-for-fight parity test was retired on 2026-07-12.
   Its job was to prove the module extraction faithfully reproduced the
   original single-file game; it did that through 0.56. The stabilization
   pass then deliberately diverges the combat sim (poison decay, burn
   packets, weapon overflow, haste cap, lifesteal from damage dealt), so a
   byte-match against the original is no longer the goal. The data-table
   parity below still pins every original item/monster/trinket outside the
   rebalance ledger, and combat invariants now live in engine.test.js. */

test('parity: data tables identical to the original outside the rebalance ledger',()=>{
  const j=x=>JSON.parse(JSON.stringify(x));
  assert.deepEqual(j(RSTAT),j(ORIG.RSTAT));
  assert.deepEqual(j(RINTEG),j(ORIG.RINTEG));
  /* Phase 5 adds unique wares the original never sold; every item the
     original did ship must stay byte-identical unless the ledger records
     an approved retune, in which case it must match the ledger exactly */
  for(const k of Object.keys(ORIG.ITEMS)){
    const expected=Object.assign(j(ORIG.ITEMS[k]),j(REBALANCED_ITEMS[k]||{}));
    assert.deepEqual(j(ITEMS[k]),expected,'item '+k);
  }
  for(const k of Object.keys(ITEMS)){if(!(k in ORIG.ITEMS))assert.ok(ITEMS[k].unique,'new item '+k+' must be flagged unique');}
  for(const [id,entry] of Object.entries(R8_UNIQUE_WARES)){
    assert.ok(ITEMS[id],'R8 ware '+id+' exists');
    assert.equal(ITEMS[id].unique,true,'R8 ware '+id+' is unique');
    assert.equal(ITEMS[id].acquisition,entry.acquisition,'R8 ware '+id+' acquisition');
  }
  assert.deepEqual(Object.keys(ITEMS).filter(id=>ITEMS[id].acquisition==='treasure').sort(),Object.keys(R8_UNIQUE_WARES).sort(),
    'every Treasure-only R8 ware has a parity-ledger entry');
  /* Phase 5 adds monsters the original never shipped; every monster the
     original did ship must stay byte-identical outside the rename ledger */
  for(const k of Object.keys(ORIG.MONSTERS)){
    const expected=Object.assign(j(ORIG.MONSTERS[k]),j(RENAMED_MONSTERS[k]||{}));
    assert.deepEqual(j(MONSTERS[k]),expected,'monster '+k);
  }
  for(const ot of ORIG.TRINKETS){
    const now=TRINKETS.filter(function(t){return t.id===ot.id;})[0];
    const expected=Object.assign(j(ot),j(RENAMED_TRINKETS[ot.id]||{}));
    assert.deepEqual(j(now),expected,'trinket '+ot.id);
  }
  assert.deepEqual(j(ANOMALIES),j(ORIG.ANOMALIES));
  assert.deepEqual(j(PERSONAS),j(ORIG.PERSONAS));
  assert.deepEqual(j(ANONE),j(ORIG.ANONE));
});

test('rival curve: round 1 boards build from near player parity',()=>{
  for(let s=1;s<=20;s++){
    const rng=engine.mulberry(s*7);
    const rb=engine.genRival(1,PERSONAS[s%PERSONAS.length],rng,ANONE);
    const spent=rb.board.reduce((sum,it)=>sum+COST[ITEMS[it.id].size],0);
    assert.ok(spent<=8,'round 1 rival spent '+spent+' (budget 8)');
  }
});
