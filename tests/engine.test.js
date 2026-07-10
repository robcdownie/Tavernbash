import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createFight,runHeadless,makeItem,fuseScan,genRival,playerFightItems,monsterSide,
        fightHP,stormAt,mulberry} from '../src/engine.js';
import {ANONE,PERSONAS,ITEMS,MONSTERS} from '../src/data.js';

function duel(a,b,round,seed,playerIs){
  return runHeadless(createFight({a:a,b:b,stormAt:stormAt(round),seed:seed,playerIs:playerIs||null}));
}
function refSide(ids,round,T){
  const board=ids.map(id=>makeItem(id,0));
  return {board:board,side:{nm:'You',portrait:'p-0',hp:fightHP(round,(T&&T.hpFlat)||0,ANONE),items:playerFightItems(board,T||{},ANONE,1),lifesteal:(T&&T.lifesteal)||0}};
}
function monsterDuel(mid,round,ids,gold){
  const ref=refSide(ids,round);
  const ctx={round:round,gold:gold||0,A:ANONE,gilded:false,playerBoard:ref.board,playerHp:ref.side.hp};
  const foe=monsterSide(mid,ctx);
  return duel(ref.side,foe,round,42,'a');
}

test('termination: 48 random rival matchups across rounds 1 to 12 all resolve',()=>{
  let longest=0;
  for(let round=1;round<=12;round++){
    for(let s=0;s<4;s++){
      const rng=mulberry(round*1000+s);
      const p1=PERSONAS[Math.floor(rng()*PERSONAS.length)];
      const p2=PERSONAS[Math.floor(rng()*PERSONAS.length)];
      const r1=genRival(round,p1,rng,ANONE);
      const r2=genRival(round,p2,rng,ANONE);
      const F=duel(
        {nm:p1.n,hp:fightHP(round,0,ANONE),items:r1.items,lifesteal:0},
        {nm:p2.n,hp:fightHP(round,0,ANONE),items:r2.items,lifesteal:0},
        round,round*31+s*613);
      assert.ok(F.done,'fight resolves (round '+round+' seed '+s+')');
      assert.ok(F.winner==='a'||F.winner==='b','has a winner');
      if(F.t>longest)longest=F.t;
    }
  }
  assert.ok(longest<180000,'longest fight under storm-guaranteed bound, was '+(longest/1000)+'s');
});

const BAND1=['sword','sword','dagger','dagger'];
const BAND2=['tower','mace','crossbow','bandage'];
const BAND3=['hammer','aegis','salve','fangs'];
const CURVE={imp:[2,BAND1],rats:[2,BAND1],ghul:[2,BAND1],samovar:[2,BAND1],
             lamassu:[5,BAND2],kark:[5,BAND2],collector:[5,BAND2,5],
             ifrit:[9,BAND3],qareen:[9,BAND3],shahmaran:[9,BAND3],marid:[9,BAND3]};
for(const mid of Object.keys(CURVE)){
  test('monster winnability: '+MONSTERS[mid].n+' loses to an on-curve board',()=>{
    const [round,ids,gold]=CURVE[mid];
    const F=monsterDuel(mid,round,ids,gold);
    assert.equal(F.winner,'a',MONSTERS[mid].n+' should be winnable on curve');
  });
}

test('Karkadann kills an undercooked one-dagger board',()=>{
  const F=monsterDuel('kark',5,['dagger']);
  assert.equal(F.winner,'b','one dagger should not survive the Gore Horn');
});

test('unique wares never appear in rival boards',()=>{
  for(let round=1;round<=12;round++){
    for(let s=0;s<6;s++){
      const rng=mulberry(round*777+s);
      const r=genRival(round,PERSONAS[s%PERSONAS.length],rng,ANONE);
      for(const it of r.board){
        assert.ok(!ITEMS[it.id].unique,'rival rolled unique ware '+it.id+' (round '+round+')');
      }
    }
  }
});

test('fusion: 3 daggers forge to 1 Silver Medium',()=>{
  const board=[makeItem('dagger'),makeItem('dagger'),makeItem('dagger')];
  const forged=fuseScan(board);
  assert.equal(forged.length,1);
  assert.equal(board.length,1);
  assert.equal(board[0].rarity,1,'Silver');
  assert.equal(board[0].size,2,'Medium');
});

test('fusion: 9 daggers chain to 1 Gold Large',()=>{
  const board=[];for(let i=0;i<9;i++){board.push(makeItem('dagger'));}
  fuseScan(board);
  assert.equal(board.length,1);
  assert.equal(board[0].rarity,2,'Gold');
  assert.equal(board[0].size,3,'Large');
});

test('Debt Collector gains exactly +150 HP and +20 damage at 10 held gold',()=>{
  const base=monsterSide('collector',{round:5,gold:0,A:ANONE,gilded:false});
  const rich=monsterSide('collector',{round:5,gold:10,A:ANONE,gilded:false});
  assert.equal(rich.hp-base.hp,150);
  assert.equal(rich.items[0].fx.dmg-base.items[0].fx.dmg,20);
  assert.equal(rich.hp,260);
  assert.equal(rich.items[0].fx.dmg,26);
});

test('Qareen mirrors the board at 85 percent',()=>{
  const board=[makeItem('sword'),makeItem('mace')];
  const hp=fightHP(9,0,ANONE);
  const q=monsterSide('qareen',{round:9,gold:0,A:ANONE,gilded:false,playerBoard:board,playerHp:hp});
  assert.equal(q.hp,Math.round(hp*0.85));
  assert.equal(q.items.length,2);
  assert.equal(q.items[0].fx.dmg,Math.round(ITEMS.sword.fx.dmg*0.85));
  assert.equal(q.items[1].fx.dmg,Math.round(ITEMS.mace.fx.dmg*0.85));
});

test('Qareen handles an empty board safely',()=>{
  const hp=fightHP(9,0,ANONE);
  const q=monsterSide('qareen',{round:9,gold:0,A:ANONE,gilded:false,playerBoard:[],playerHp:hp});
  assert.equal(q.items.length,0);
  const me={nm:'You',hp:hp,items:[],lifesteal:0};
  const F=duel(me,q,9,7,'a');
  assert.ok(F.done,'empty-vs-empty fight still resolves via the storm');
});
