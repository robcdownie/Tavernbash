import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import * as engine from '../src/engine.js';
import {ANONE,PERSONAS,ITEMS,MONSTERS,TRINKETS,ANOMALIES,RSTAT,RINTEG} from '../src/data.js';

/* Load the original single-file game in a vm sandbox. Its boot is guarded on
   typeof document, so only the logic and the BB export run. */
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const html=readFileSync(join(root,'bazaar-brawler.html'),'utf8');
const m=html.match(/<script>([\s\S]*)<\/script>/);
assert.ok(m,'original script block found');
const ctx=createContext({Math:Math,Date:Date,Object:Object});
runInContext('var globalThis=this;'+m[1],ctx);
const ORIG=ctx.BB;

function fightOutcome(bb,round,seed){
  const rng=bb.mulberry(seed);
  const p1=bb.PERSONAS[Math.floor(rng()*bb.PERSONAS.length)];
  const p2=bb.PERSONAS[Math.floor(rng()*bb.PERSONAS.length)];
  const r1=bb.genRival(round,p1,rng,bb.ANONE);
  const r2=bb.genRival(round,p2,rng,bb.ANONE);
  const F=bb.runHeadless(bb.createFight({
    a:{nm:'a',hp:bb.fightHP(round,0,bb.ANONE),items:r1.items,lifesteal:0},
    b:{nm:'b',hp:bb.fightHP(round,0,bb.ANONE),items:r2.items,lifesteal:0},
    stormAt:bb.stormAt(round),seed:seed*2654435761>>>0,playerIs:null}));
  return {winner:F.winner,t:F.t,aHp:F.a.hp,bHp:F.b.hp,
          boards:r1.board.map(i=>i.id+':'+i.rarity).join(',')+' vs '+r2.board.map(i=>i.id+':'+i.rarity).join(',')};
}

const NEW={createFight:engine.createFight,runHeadless:engine.runHeadless,genRival:engine.genRival,
  fightHP:engine.fightHP,stormAt:engine.stormAt,mulberry:engine.mulberry,PERSONAS:PERSONAS,ANONE:ANONE};

test('parity: modules reproduce the original file fight for fight',()=>{
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

test('parity: data tables identical to the original',()=>{
  const j=x=>JSON.parse(JSON.stringify(x));
  assert.deepEqual(j(RSTAT),j(ORIG.RSTAT));
  assert.deepEqual(j(RINTEG),j(ORIG.RINTEG));
  assert.deepEqual(j(ITEMS),j(ORIG.ITEMS));
  /* Phase 5 adds monsters the original never shipped; every monster the
     original did ship must stay byte-identical */
  for(const k of Object.keys(ORIG.MONSTERS)){assert.deepEqual(j(MONSTERS[k]),j(ORIG.MONSTERS[k]),'monster '+k);}
  assert.deepEqual(j(TRINKETS),j(ORIG.TRINKETS));
  assert.deepEqual(j(ANOMALIES),j(ORIG.ANOMALIES));
  assert.deepEqual(j(PERSONAS),j(ORIG.PERSONAS));
  assert.deepEqual(j(ANONE),j(ORIG.ANONE));
});
