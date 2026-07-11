/* Balance harness: Monte Carlo readouts from the pure fight engine.
   No game code changes, no DOM. Run: node scripts/balance-sim.js
   Everything is seeded, so two runs print the same report.

   Sections:
     1. Lobby pacing: all-rival lobbies played to a champion, final
        round distribution (proxy for the 15 to 20 minute target).
     2. Monster winnability: on-curve rival boards as a player
        stand-in, winrate and fight length per monster per round.
     3. Merchant damage share: where the hurt actually comes from
        (weapons vs poison vs burn vs storm) by round band.
     4. Item survival: how fast boards die inside a fight.
     5. The rival budget curve vs the player gold curve, printed
        so the round 1 gear gap is a number instead of a feeling. */
import {createFight,runHeadless,fightHP,stormAt,mulberry,genRival,monsterSide,usedCells}
  from '../src/engine.js';
import {ITEMS,MONSTERS,PERSONAS,ANONE,COST} from '../src/data.js';

const rng=mulberry(0xBA1A9CE);
function pick(arr){return arr[Math.floor(rng()*arr.length)];}
function pct(x){return (100*x).toFixed(1)+'%';}
function med(a){const s=a.slice().sort((x,y)=>x-y);return s[Math.floor(s.length/2)]||0;}
function q(a,p){const s=a.slice().sort((x,y)=>x-y);return s[Math.floor(s.length*p)]||0;}

function rivalSide(round,persona){
  const rb=genRival(round,persona||pick(PERSONAS),rng,ANONE);
  return {nm:persona?persona.n:'rival',portrait:'p-1',hp:fightHP(round,0,ANONE),items:rb.items,lifesteal:0,board:rb.board,tier:rb.tier};
}
function fight(a,b,round,storm){
  const F=createFight({a:a,b:b,stormAt:storm||stormAt(round),seed:(rng()*4294967296)>>>0,playerIs:'a'});
  const tally={hhit:{a:0,b:0},tickp:{a:0,b:0},tickb:{a:0,b:0},storm:{a:0,b:0},deaths:[]};
  let guard=0;
  while(!F.done&&guard++<3600){
    const evs=F.step(50);
    for(const e of evs){
      if(tally[e.k]&&e.side){tally[e.k][e.side]+=e.amt||0;}
      if(e.k==='destroy'){tally.deaths.push(F.t);}
    }
  }
  tally.t=F.t/1000;tally.winner=F.winner;
  return tally;
}

/* ---------- 1. lobby pacing ---------- */
const LOBBIES=400;
const finals=[];
for(let L=0;L<LOBBIES;L++){
  const ms=PERSONAS.map((p,i)=>({p:p,hp:40,alive:true,shrine:false}));
  ms.push({p:pick(PERSONAS),hp:40,alive:true,shrine:false}); /* 8th seat */
  let round=0;
  while(ms.filter(m=>m.alive).length>1&&round<30){
    round++;
    const alive=ms.filter(m=>m.alive);
    const order=alive.slice();
    for(let i=order.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));const t=order[i];order[i]=order[j];order[j]=t;}
    for(let i=0;i+1<order.length;i+=2){
      const A=rivalSide(round,order[i].p), B=rivalSide(round,order[i+1].p);
      const r=fight(A,B,round);
      const loser=r.winner==='a'?order[i+1]:order[i];
      const winner=r.winner==='a'?order[i]:order[i+1];
      const wSide=r.winner==='a'?A:B;
      const tiers=wSide.board.reduce((s,it)=>s+ITEMS[it.id].tier,0);
      loser.hp-=round+Math.min(tiers,12);
      if(loser.hp<=0){
        if(!loser.shrine){loser.shrine=true;loser.hp=15;}
        else{loser.alive=false;}
      }
    }
  }
  finals.push(round);
}
console.log('== 1. LOBBY PACING (all-rival, '+LOBBIES+' lobbies) ==');
console.log('champion crowned at round  p10 '+q(finals,0.1)+'   median '+med(finals)+'   p90 '+q(finals,0.9));
console.log('(a round is roughly 60 to 90 s of play; 15 to 20 min wants roughly rounds 10 to 15)');

/* ---------- 2. monster winnability ---------- */
console.log('\n== 2. MONSTER WINNABILITY (challenger = on-curve rival board, 150 fights each) ==');
const BANDROUNDS={1:[1,2,3],2:[4,5,6],3:[7,8,9],4:[10,11,12]};
console.log('monster                band  round->winrate (fight s median)');
for(const mid of Object.keys(MONSTERS)){
  const M=MONSTERS[mid];
  const rounds=BANDROUNDS[M.band]||[10,11,12];
  const cells=[];
  for(const round of rounds){
    let wins=0;const ts=[];
    for(let k=0;k<150;k++){
      const A=rivalSide(round);
      const ctx={gold:5,round:round,A:ANONE,gilded:false,playerBoard:A.board,playerHp:A.hp};
      const B=monsterSide(mid,ctx);
      const r=fight(A,B,round,M.stormAt?M.stormAt*1000:0);
      if(r.winner==='a')wins++;
      ts.push(r.t);
    }
    cells.push('r'+round+' '+pct(wins/150)+' ('+med(ts).toFixed(0)+'s)');
  }
  console.log((M.n+' '.repeat(22)).slice(0,22)+' b'+M.band+'   '+cells.join('   '));
}

/* ---------- 3 + 4. damage share and item survival, rival duels ---------- */
console.log('\n== 3. MERCHANT DAMAGE SHARE (rival duels, 300 per band) ==');
console.log('band(rounds)    weapons   poison    burn      storm     fight s   items dead by end');
for(const band of [[1,3],[4,6],[7,9],[10,12]]){
  const sums={hhit:0,tickp:0,tickb:0,storm:0};const ts=[];let dead=0,total=0;
  for(let k=0;k<300;k++){
    const round=band[0]+Math.floor(rng()*(band[1]-band[0]+1));
    const A=rivalSide(round),B=rivalSide(round);
    const nItems=A.items.length+B.items.length;
    const r=fight(A,B,round);
    for(const key of Object.keys(sums)){sums[key]+=r[key].a+r[key].b;}
    ts.push(r.t);dead+=r.deaths.length;total+=nItems;
  }
  const all=sums.hhit+sums.tickp+sums.tickb+sums.storm||1;
  console.log('r'+band[0]+'-'+band[1]+'          '
    +pct(sums.hhit/all).padEnd(10)+pct(sums.tickp/all).padEnd(10)
    +pct(sums.tickb/all).padEnd(10)+pct(sums.storm/all).padEnd(10)
    +med(ts).toFixed(0)+'s       '+pct(dead/total));
}

/* ---------- 5. budget curves ---------- */
console.log('\n== 5. RIVAL BUDGET vs PLAYER GOLD ==');
console.log('round   rival budget   player income   player cumulative');
let cum=0;
for(let round=1;round<=10;round++){
  const inc=Math.min(10,3+round);cum+=inc;
  console.log(String(round).padEnd(8)+String(9+round*5.5).padEnd(15)+String(inc).padEnd(16)+cum);
}
console.log('(rivals rebuild from the full budget every round; the player compounds. Round 1: 14.5 vs 4.)');

/* ---------- poison ramp table ---------- */
console.log('\n== 6. TIER 1 DAMAGE RAMP, single item alone vs a merchant (no board in the way) ==');
console.log('seconds   dagger(6/3s)   vial(2 pois/3s cumulative)');
for(const T of [10,20,30]){
  let dag=Math.floor(T/3)*6;
  let pois=0,stack=0;
  for(let s=1;s<=T;s++){if(s%3===0)stack+=2;pois+=stack;}
  console.log(String(T).padEnd(10)+String(dag).padEnd(15)+pois);
}
