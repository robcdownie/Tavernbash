import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createFight,runHeadless,makeItem,fuseScan,genRival,playerFightItems,monsterSide,
        fightHP,stormAt,mulberry,boardRegen,pickTarget} from '../src/engine.js';
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
const CURVE={imp:[2,BAND1],rats:[2,BAND1],ghul:[2,BAND1],samovar:[2,BAND1],monkey:[2,BAND1],
             lamassu:[5,BAND2],kark:[5,BAND2],collector:[5,BAND2,5],nasnas:[5,BAND2],matron:[5,BAND2],icebox:[5,BAND2],peri:[5,BAND2],
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

test('regen: knits fight health each second, never past the cap, never from the grave',()=>{
  const F=createFight({a:{nm:'x',hp:60,items:[],lifesteal:0},
                       b:{nm:'r',hp:60,items:[],lifesteal:0,regen:4},
                       stormAt:5000,seed:1,playerIs:null});
  for(let t=0;t<3000;t+=50){F.step(50);}
  assert.equal(F.b.hp,60,'regen never overheals past the starting pool');
  assert.equal(F.a.hp,60,'no regen means no change before the storm');
  runHeadless(F);
  assert.ok(F.done,'storm still ends the fight');
  assert.equal(F.winner,'b','the regenerating side outlasts the storm race');
});

test('Ghul Matron knits 2 a second, 3 when gilded',()=>{
  assert.equal(monsterSide('matron',{round:5,gold:0,A:ANONE,gilded:false}).regen,2);
  assert.equal(monsterSide('matron',{round:5,gold:0,A:ANONE,gilded:true}).regen,3);
});

test('freeze: pauses the item timer for exactly the stated seconds',()=>{
  const vent={nm:'Frost Vent',g:'g-tower',size:2,cd:6000,timer:0,alive:true,integ:220,maxI:220,
              fx:{freeze:3},bulwark:false,targeting:null,charge:null,pocket:0,flying:false,frozen:0,uid:901};
  const F=createFight({a:{nm:'x',hp:400,items:playerFightItems([makeItem('sword',0)],{},ANONE,1),lifesteal:0},
                       b:{nm:'ib',hp:400,items:[vent],lifesteal:0},
                       stormAt:999000,seed:1,playerIs:'a'});
  const seen={fires:0,freezes:0,freezeAt:null,thawAt:null};
  while(F.t<14000){for(const e of F.step(50)){
    if(e.k==='fire'&&e.side==='a'){seen.fires++;}
    if(e.k==='freeze'){seen.freezes++;if(seen.freezeAt===null){seen.freezeAt=F.t;}assert.equal(e.side,'a');assert.equal(e.amt,3);}
    if(e.k==='thaw'&&seen.thawAt===null){seen.thawAt=F.t;}
  }}
  assert.equal(seen.freezeAt,6000,'vent fires at 6 s');
  assert.equal(seen.thawAt,9000,'thaw exactly 3 s later');
  assert.equal(seen.freezes,2,'the vent freezes again at 12 s');
  assert.equal(seen.fires,2,'two freezes cost the sword two swings by 14 s');
});

test('flying: weapons skip flyers, and with only flyers left they hit the merchant',()=>{
  const mk=(over)=>Object.assign({nm:'t',g:'g-dagger',size:1,cd:3000,timer:0,alive:true,integ:10,maxI:10,
    fx:{},bulwark:false,targeting:null,charge:null,pocket:0,flying:false,frozen:0,uid:++UIDT},over);
  assert.equal(pickTarget([mk({flying:true}),mk({})],null),1,'the flyer is skipped');
  assert.equal(pickTarget([mk({flying:true}),mk({flying:true})],null),-1,'all flyers means the merchant');
  assert.equal(pickTarget([mk({flying:true,bulwark:true}),mk({})],null),1,'a flying bulwark cannot taunt');
});
let UIDT=5000;

test('Flying Charm: neighbors take wing at fight start, the charm itself stays grounded',()=>{
  const items=playerFightItems([makeItem('dagger',0),makeItem('flyingcharm',0),makeItem('sword',0)],{},ANONE,1);
  assert.equal(items[0].flying,true,'left neighbor flies');
  assert.equal(items[2].flying,true,'right neighbor flies');
  assert.equal(items[1].flying,false,'the charm is the anchor');
});

test('crit: a guaranteed crit doubles the chip, and the roll is seeded',()=>{
  const shard={nm:'Shard',g:'g-fangs',size:1,cd:3000,timer:0,alive:true,integ:200,maxI:200,
               fx:{dmg:5},bulwark:false,targeting:null,charge:null,pocket:0,flying:false,frozen:0,crit:1,uid:911};
  const F=createFight({a:{nm:'x',hp:100,items:playerFightItems([makeItem('buckler',0)],{},ANONE,1),lifesteal:0},
                       b:{nm:'p',hp:100,items:[shard],lifesteal:0},
                       stormAt:999000,seed:3,playerIs:'a'});
  let firstChip=null,crits=0;
  while(F.t<3500){for(const e of F.step(50)){
    if(e.k==='chip'&&e.side==='a'&&firstChip===null){firstChip=e.amt;}
    if(e.k==='crit'){crits++;assert.equal(e.side,'b');}
  }}
  assert.equal(crits,1,'crit certainty means every swing crits');
  assert.equal(firstChip,10,'5 damage doubles to 10');
});

test('crit: Shard Wings land near their stated 35 percent over many swings',()=>{
  let fires=0,crits=0;
  for(let s=1;s<=5;s++){
    const foe=monsterSide('peri',{round:5,gold:0,A:ANONE,gilded:false});
    foe.items.forEach(it=>{it.integ=10000;it.maxI=10000;});
    const F=createFight({a:{nm:'x',hp:100000,items:playerFightItems([makeItem('buckler',0)],{},ANONE,1),lifesteal:0},
                         b:foe,stormAt:999000,seed:s*17,playerIs:'a'});
    while(F.t<60000){for(const e of F.step(50)){
      if(e.k==='fire'&&e.side==='b'){fires++;}
      if(e.k==='crit'){crits++;}
    }}
  }
  const rate=crits/fires;
  assert.ok(fires>=250,'enough swings to measure, got '+fires);
  assert.ok(rate>0.25&&rate<0.45,'crit rate near 0.35, was '+rate.toFixed(3));
});

test('Glass Prism: grants the whole board its crit aura, weapons only',()=>{
  const items=playerFightItems([makeItem('dagger',0),makeItem('prism',0),makeItem('buckler',0)],{},ANONE,1);
  assert.equal(items[0].crit,0.2,'the dagger gains the aura');
  assert.equal(items[2].crit,0,'shields have nothing to crit with');
});

test('Pilfer Monkey: every Sticky Paws activation pockets exactly 1 bounty gold',()=>{
  const ref=refSide(BAND1,2);
  const foe=monsterSide('monkey',{round:2,gold:0,A:ANONE,gilded:false});
  const F=createFight({a:ref.side,b:foe,stormAt:stormAt(2),seed:42,playerIs:'a'});
  let events=0;
  let guard=0;
  while(!F.done&&guard++<3600){for(const e of F.step(50)){if(e.k==='pocket'){assert.equal(e.amt,1);assert.equal(e.side,'a','the player side loses the gold');events++;}}}
  assert.equal(F.winner,'a');
  assert.equal(F.pocketed,events,'the tally matches the events');
  assert.ok(F.pocketed>=1,'the Paws got at least one grab in');
  assert.ok(F.pocketed<8,'but nowhere near the whole purse on curve');
});

test('Sandling: no weapons, 1 regen, falls on curve before its early storm decides',()=>{
  const foe=monsterSide('sandling',{round:2,gold:0,A:ANONE,gilded:false});
  assert.equal(foe.hp,90);
  assert.equal(foe.regen,1);
  assert.equal(foe.items.length,0,'the Sandling carries no weapons');
  const ref=refSide(BAND1,2);
  const F=runHeadless(createFight({a:ref.side,b:foe,stormAt:12000,seed:42,playerIs:'a'}));
  assert.equal(F.winner,'a','on-curve board beats the Sandling under the 12 s storm');
  assert.ok(F.t<=20000,'decided close to the early storm, was '+(F.t/1000)+'s');
});

test('Weeping Stone: passive regen for the player, scaling with rarity',()=>{
  assert.equal(boardRegen([makeItem('weepingstone',0)]),1,'bronze knits 1');
  assert.equal(boardRegen([makeItem('weepingstone',1)]),2,'silver knits 2');
  assert.equal(boardRegen([makeItem('dagger',0)]),0,'ordinary wares knit nothing');
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
