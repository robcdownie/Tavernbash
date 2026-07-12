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

/* Combat-engine parity. Rival generation is deliberately retuned, so
   fights run on fixed boards built from items the ledger does not touch:
   same ids, same rarities, same seeds through both engines, and every
   event-visible outcome must match byte for byte. This pins targeting,
   bulwarks, burn, shields, heals, adjacency, storm, and the tick loop. */
const SAFE_IDS=['dagger','sword','fangs','mace','crossbow','hammer','torch','bomb','magma',
  'buckler','brassbuckler','barricade','tower','aegis','bandage','salve','chalice','sanctum',
  'whetstone','hourglass','adren'];
function fixedBoard(bb,seed){
  const rng=bb.mulberry(seed);
  const n=3+Math.floor(rng()*4);
  const board=[];
  for(let i=0;i<n;i++){
    const id=SAFE_IDS[Math.floor(rng()*SAFE_IDS.length)];
    const r=Math.floor(rng()*3);
    board.push(bb.makeItem(id,r));
  }
  return board;
}
function fightOutcome(bb,round,seed){
  const a=fixedBoard(bb,seed*31+1),b=fixedBoard(bb,seed*31+2);
  const F=bb.runHeadless(bb.createFight({
    a:{nm:'a',hp:bb.fightHP(round,0,bb.ANONE),items:bb.playerFightItems(a,{},bb.ANONE,1),lifesteal:0},
    b:{nm:'b',hp:bb.fightHP(round,0,bb.ANONE),items:bb.playerFightItems(b,{},bb.ANONE,1),lifesteal:0},
    stormAt:bb.stormAt(round),seed:seed*2654435761>>>0,playerIs:null}));
  return {winner:F.winner,t:F.t,aHp:F.a.hp,bHp:F.b.hp,
          boards:a.map(i=>i.id+':'+i.rarity).join(',')+' vs '+b.map(i=>i.id+':'+i.rarity).join(',')};
}

const NEW={createFight:engine.createFight,runHeadless:engine.runHeadless,makeItem:engine.makeItem,
  playerFightItems:engine.playerFightItems,fightHP:engine.fightHP,stormAt:engine.stormAt,
  mulberry:engine.mulberry,ANONE:ANONE};

test('parity: the combat engine reproduces the original fight for fight on fixed boards',()=>{
  assert.ok(ORIG&&ORIG.createFight,'original BB export loaded');
  for(let round=1;round<=12;round++){
    for(let s=1;s<=3;s++){
      const seed=round*97+s;
      const a=fightOutcome(ORIG,round,seed);
      const b=fightOutcome(NEW,round,seed);
      assert.deepEqual(b,a,'round '+round+' seed '+seed);
    }
  }
});

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
