import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createFight,runHeadless,makeItem,fuseScan,genRival,playerFightItems,monsterSide,
        fightHP,stormAt,mulberry,boardRegen,pickTarget} from '../src/engine.js';
import {ANONE,PERSONAS,ITEMS,MONSTERS,ENCH,HEROES} from '../src/data.js';
import {integOf} from '../src/engine.js';

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
             ifrit:[9,BAND3],qareen:[9,BAND3],shahmaran:[9,BAND3],marid:[9,BAND3],roc:[9,BAND3],simurgh:[9,BAND3],golem:[9,BAND3]};
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

test('survTiers sums surviving enemy item tiers, not a flat count',()=>{
  /* the route loss-damage formula reads F.survTiers; fight items carry .tier and
     no .id, so an ITEMS[it.id] lookup would count every survivor as tier 1 */
  const board=['dagger','mace'].map(id=>makeItem(id,0));      /* tiers 1 and 2 */
  const items=playerFightItems(board,{},ANONE,1);
  const F=createFight({a:{nm:'x',hp:300,items:[],lifesteal:0},
                       b:{nm:'y',hp:300,items:items,lifesteal:0},stormAt:999999,seed:1,playerIs:null});
  const expected=ITEMS.dagger.tier+ITEMS.mace.tier;           /* 1 + 2 = 3 */
  assert.equal(F.survTiers('b'),expected,'tier-weighted sum');
  assert.notEqual(F.survTiers('b'),items.length,'not a flat item count');
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

test('omitted monster power is byte-equivalent to power 1 and preserves prior gild values',()=>{
  const stable=function(side){
    const wire=JSON.parse(JSON.stringify(side));
    wire.items.forEach(function(it){delete it.uid;});
    return wire;
  };
  for(const gilded of [false,true]){
    const ctx={round:12,gold:0,A:ANONE,gilded:gilded};
    assert.deepEqual(stable(monsterSide('vizier',ctx)),stable(monsterSide('vizier',Object.assign({},ctx,{power:1}))));
  }
  const gilded=monsterSide('vizier',{round:12,gold:0,A:ANONE,gilded:true});
  assert.equal(gilded.hp,1050);
  assert.equal(gilded.items[0].integ,135);
  assert.equal(gilded.items[1].fx.burn,18);
  assert.equal(gilded.items[3].fx.heal,30);
});

test('monster power scales health, integrity, regen, and scalable item effects',()=>{
  const base=monsterSide('vizier',{round:12,gold:0,A:ANONE,gilded:false,power:1});
  const strong=monsterSide('vizier',{round:12,gold:0,A:ANONE,gilded:false,power:2});
  assert.equal(strong.hp,base.hp*2);
  strong.items.forEach(function(it,i){assert.equal(it.integ,base.items[i].integ*2,it.nm+' integrity');});
  assert.equal(strong.items[1].fx.burn,base.items[1].fx.burn*2);
  assert.equal(strong.items[3].fx.heal,base.items[3].fx.heal*2);
  assert.equal(strong.items[2].fx.freeze,base.items[2].fx.freeze,'control duration does not scale');
  const auction=monsterSide('auctioneer',{round:10,gold:0,A:ANONE,gilded:false,power:2});
  assert.equal(auction.items[0].fx.dmg,24);
  assert.equal(auction.items[0].printedDmg,24);
  assert.equal(monsterSide('matron',{round:5,gold:0,A:ANONE,gilded:false,power:2}).regen,4);
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

function ammoItem(over){
  return Object.assign({nm:'Cannon',g:'g-coincannon',size:3,cd:3000,timer:0,alive:true,integ:900,maxI:900,
    fx:{dmg:14},bulwark:false,targeting:null,charge:null,pocket:0,flying:false,frozen:0,crit:0,
    rattle:null,selfdestruct:false,ammo:5,maxAmmo:5,uid:941},over);
}
test('fight builder: a first-flat modifier lands on the leftmost ware only',()=>{
  const items=playerFightItems([makeItem('dagger',0),makeItem('sword',0)],{firstFlat:2},ANONE,1);
  assert.equal(items[0].fx.dmg,8,'leftmost dagger 6 plus 2');
  assert.equal(items[1].fx.dmg,11,'the sword behind is untouched');
});

test('heroes: eight to choose, every tag a real shop category',()=>{
  assert.equal(HEROES.length,8);
  const cats=new Set(Object.values(ITEMS).map(d=>d.cat));
  for(const h of HEROES){
    assert.ok(cats.has(h.tag),h.n+' tag maps to a ware category');
    assert.ok(h.g&&h.n&&h.d,h.n+' carries glyph, name, and pitch');
    if(h.start)assert.ok(ITEMS[h.start],h.n+' starting ware exists');
  }
});

test('enchants: every rider does exactly what its label says',()=>{
  const one=(id,en)=>playerFightItems([makeItem(id,0,en)],{},ANONE,1)[0];
  assert.equal(one('mace','fiery').fx.burn,8,'Fiery adds a third of 24 as burn');
  assert.equal(one('mace','fiery').fx.dmg,24,'and keeps the damage');
  assert.equal(one('vial','venomous').fx.poison,4,'Venomous adds 2 poison to the 2');
  assert.equal(one('buckler','stout').integ,Math.round(14*1.6),'Stout raises Integrity 60%');
  assert.equal(integOf(makeItem('buckler',0,'stout')),Math.round(14*1.6),'and the draft board agrees');
  assert.equal(one('mace','swift').cd,Math.round(4500*0.85),'Swift trims the cooldown');
  assert.equal(one('dagger','winged').flying,true,'Winged flies');
  assert.equal(one('dagger','icy').freezeOnce,2,'Icy carries one 2 s frost');
});

test('enchants: Icy freezes exactly once, then the frost is spent',()=>{
  const me=playerFightItems([makeItem('sword',0,'icy')],{},ANONE,1);
  const tgt={nm:'Dummy',g:'g-buckler',size:1,cd:3000,timer:0,alive:true,integ:900,maxI:900,
             fx:{},bulwark:false,targeting:null,charge:null,pocket:0,flying:false,frozen:0,crit:0,rattle:null,selfdestruct:false,ammo:0,maxAmmo:0,uid:951};
  const F=createFight({a:{nm:'x',hp:900,items:me,lifesteal:0},b:{nm:'d',hp:900,items:[tgt],lifesteal:0},stormAt:999000,seed:6,playerIs:'a'});
  let freezes=0;
  while(F.t<15000){for(const e of F.step(50)){if(e.k==='freeze')freezes++;}}
  assert.equal(freezes,1,'one frost, on the first swing only');
});

test('enchants: fusion keeps the first enchanted copy',()=>{
  const board=[makeItem('dagger',0),makeItem('dagger',0,'fiery'),makeItem('dagger',0)];
  fuseScan(board);
  assert.equal(board.length,1);
  assert.equal(board[0].ench,'fiery','the forge remembers the flame');
  assert.equal(board[0].rarity,1);
});

test('The Azhdaha: each fallen head halves the survivors, and a rich board still wins',()=>{
  const foe=monsterSide('azhdaha',{round:10,gold:0,A:ANONE,gilded:false});
  assert.equal(foe.hp,550);
  assert.equal(foe.items.length,3);
  const board=[makeItem('hammer',1),makeItem('aegis',1),makeItem('salve',1),makeItem('fangs',1)];
  const me={nm:'You',portrait:'p-0',hp:fightHP(10,0,ANONE),items:playerFightItems(board,{},ANONE,1),lifesteal:0};
  const F=createFight({a:me,b:foe,stormAt:stormAt(10),seed:21,playerIs:'a'});
  let enrages=0;let minSurvCd=9999;
  let guard=0;
  while(!F.done&&guard++<3600){for(const e of F.step(50)){
    if(e.k==='enrage'){enrages++;}
    if(e.k==='destroy'&&e.side==='b'){F.b.items.filter(t=>t.alive).forEach(t=>{if(t.cd<minSurvCd)minSurvCd=t.cd;});}
  }}
  assert.equal(F.winner,'a','a silver round 10 board slays the boss');
  assert.ok(enrages>=2,'the rage triggered, got '+enrages+' enrage events');
  /* the hasteMates rattle permanently cuts survivor cooldowns below the 8 s
     base; overflow can now change which head dies first, so we assert the
     mechanic rather than a fixed kill order */
  assert.ok(minSurvCd<8000,'a surviving head was hastened below its 8 s base, saw '+minSurvCd);
});

test('Grand Vizier of Ash: the full kit boss falls to a gold round 12 board',()=>{
  const foe=monsterSide('vizier',{round:12,gold:0,A:ANONE,gilded:false});
  assert.equal(foe.hp,700);
  assert.equal(foe.items.reduce((s,i)=>s+i.size,0),10,'a full ten slot board');
  assert.ok(foe.items[0].bulwark,'the wall stands in front');
  assert.equal(MONSTERS.vizier.bounty.pickUnique,true,'the vault bounty');
  const board=[makeItem('hammer',2),makeItem('aegis',2),makeItem('salve',2),makeItem('fangs',2)];
  const me={nm:'You',portrait:'p-0',hp:fightHP(12,0,ANONE),items:playerFightItems(board,{},ANONE,1),lifesteal:0};
  const F=runHeadless(createFight({a:me,b:foe,stormAt:stormAt(12),seed:41,playerIs:'a'}));
  assert.equal(F.winner,'a','a gold board takes the palace');
});

test('Night Auctioneer: the auction disables the finest weapon and pays for it',()=>{
  const foe=monsterSide('auctioneer',{round:10,gold:0,A:ANONE,gilded:false});
  assert.equal(foe.hp,500);
  const board=[makeItem('hammer',1),makeItem('mace',1),makeItem('fangs',1),makeItem('salve',1),makeItem('buckler',1)];
  const me={nm:'You',portrait:'p-0',hp:fightHP(10,0,ANONE),items:playerFightItems(board,{},ANONE,1),lifesteal:0};
  const F=createFight({a:me,b:foe,stormAt:stormAt(10),seed:31,playerIs:'a'});
  const lots=[];let paid=0,guard=0,firesAfterLot=0,firstLotI=null,firstLotAt=null;
  while(!F.done&&guard++<3600){for(const e of F.step(50)){
    if(e.k==='lot'){lots.push(e.nm);if(firstLotI===null){firstLotI=e.i;firstLotAt=F.t;}}
    if(e.k==='lotpay'){paid+=e.amt;}
    if(e.k==='fire'&&e.side==='a'&&e.i===firstLotI&&firstLotAt!==null&&F.t>firstLotAt){firesAfterLot++;}
  }}
  assert.equal(F.winner,'a','a wide silver board outlasts the auction');
  assert.ok(lots.length>=1,'at least one lot went under the hammer');
  assert.equal(lots[0],'Warhammer','the finest weapon sells first');
  assert.equal(paid,lots.length*3,'3 gold per lot');
  assert.equal(F.lotPaid,paid,'the fight carries the payout tally');
  assert.equal(firesAfterLot,0,'a sold lot never swings again');
});

test('The Gavel ware: it auctions the enemy finest weapon',()=>{
  const items=playerFightItems([makeItem('gavel',0)],{},ANONE,1);
  assert.equal(items[0].fx.disable,true);
  assert.equal(items[0].fx.dmg,12);
});

test('Azhdaha Fang: your own board rages when it shatters',()=>{
  const items=playerFightItems([makeItem('azhfang',0),makeItem('dagger',0)],{},ANONE,1);
  assert.ok(items[0].rattle&&items[0].rattle.hasteMates===0.5);
});

test('ammo: five shots then silence, the magazine holds its swing',()=>{
  const F=createFight({a:{nm:'g',hp:9000,items:[ammoItem({})],lifesteal:0},
                       b:{nm:'d',hp:9000,items:[],lifesteal:0},stormAt:999000,seed:2,playerIs:null});
  let fires=0;const lefts=[];
  while(F.t<30000){for(const e of F.step(50)){
    if(e.k==='fire'&&e.side==='a'){fires++;}
    if(e.k==='ammo'){lefts.push(e.left);}
  }}
  assert.equal(fires,5,'exactly the magazine, no more');
  assert.deepEqual(lefts,[4,3,2,1,0],'counted down one per shot');
});

test('ammo: the hopper reloads the cannon and the shooting resumes',()=>{
  const hopper={nm:'Hopper',g:'g-coinhopper',size:1,cd:8000,timer:0,alive:true,integ:900,maxI:900,
    fx:{reload:2},bulwark:false,targeting:null,charge:null,pocket:0,flying:false,frozen:0,crit:0,
    rattle:null,selfdestruct:false,ammo:0,maxAmmo:0,uid:942};
  const F=createFight({a:{nm:'g',hp:9000,items:[ammoItem({uid:943}),hopper],lifesteal:0},
                       b:{nm:'d',hp:9000,items:[],lifesteal:0},stormAt:999000,seed:2,playerIs:null});
  let fires=0,reloads=0;
  while(F.t<30000){for(const e of F.step(50)){
    if(e.k==='fire'&&e.side==='a'&&F.a.items[e.i].maxAmmo>0){fires++;}
    if(e.k==='reload'){reloads++;assert.equal(e.i,0,'the reload lands on the cannon');}
  }}
  assert.ok(reloads>=3,'the hopper kept feeding, got '+reloads);
  assert.ok(fires>5,'more shots than one magazine, got '+fires);
});

test('the Golem pair: player cannon carries its magazine, hopper its coins',()=>{
  const items=playerFightItems([makeItem('coincannon',0),makeItem('coinhopper',0)],{},ANONE,1);
  assert.equal(items[0].maxAmmo,5);
  assert.equal(items[0].ammo,5);
  assert.equal(items[1].fx.reload,2);
});

test('haste-all: Preen quickens every other item on the board',()=>{
  const build=(withPreen)=>{
    const items=[{nm:'Tail Feather',g:'g-feather',size:1,cd:2000,timer:0,alive:true,integ:500,maxI:500,
      fx:{dmg:8},bulwark:false,targeting:null,charge:null,pocket:0,flying:false,frozen:0,crit:0,rattle:null,selfdestruct:false,uid:931}];
    if(withPreen){items.push({nm:'Preen',g:'g-hatchling',size:2,cd:6000,timer:0,alive:true,integ:500,maxI:500,
      fx:{hasteAll:2},bulwark:false,targeting:null,charge:null,pocket:0,flying:false,frozen:0,crit:0,rattle:null,selfdestruct:false,uid:932});}
    return createFight({a:{nm:'s',hp:9000,items:items,lifesteal:0},
                        b:{nm:'d',hp:9000,items:[],lifesteal:0},stormAt:999000,seed:2,playerIs:null});
  };
  const count=(F)=>{let fires=0,hastes=0;while(F.t<13000){for(const e of F.step(50)){
    if(e.k==='fire'&&e.side==='a'&&F.a.items[e.i].nm==='Tail Feather'){fires++;}
    if(e.k==='haste'){hastes++;assert.equal(e.i,0,'only the feather gets quickened, never the preener itself');}
  }}return {fires:fires,hastes:hastes};};
  const plain=count(build(false)),preened=count(build(true));
  assert.equal(plain.hastes,0);
  assert.equal(preened.hastes,2,'Preen fired at 6 s and 12 s');
  assert.ok(preened.fires>plain.fires,'the feather swings more under Preen: '+preened.fires+' vs '+plain.fires);
});

test('Simurgh Feather: a weapon that flies on its own',()=>{
  const items=playerFightItems([makeItem('feather',0)],{},ANONE,1);
  assert.equal(items[0].flying,true);
  assert.equal(items[0].fx.dmg,8);
});

test('Roc Egg: left alone, the egg hatches itself at exactly 15 s',()=>{
  const foe=monsterSide('roc',{round:9,gold:0,A:ANONE,gilded:false});
  const F=createFight({a:{nm:'x',hp:5000,items:[],lifesteal:0},b:foe,stormAt:999000,seed:4,playerIs:'a'});
  let destroyAt=null,spawnAt=null,firstPeck=null;
  while(F.t<20000){for(const e of F.step(50)){
    if(e.k==='destroy'&&e.side==='b'&&destroyAt===null){destroyAt=F.t;assert.equal(e.nm,'The Egg');}
    if(e.k==='spawn'){spawnAt=F.t;assert.equal(e.nm,'Roc Hatchling');assert.equal(e.side,'b');}
    if(e.k==='hhit'&&e.side==='a'&&firstPeck===null){firstPeck={t:F.t,amt:e.amt};}
  }}
  assert.equal(destroyAt,15000,'the shell cracks on its own fuse');
  assert.equal(spawnAt,15000,'the hatchling replaces it in place');
  assert.deepEqual(firstPeck,{t:17000,amt:22},'and pecks 2 s later for 22');
});

test('Roc Egg ware: crack it early and the hatchling fights for you',()=>{
  const eggside=playerFightItems([makeItem('rocegg',0)],{},ANONE,1);
  assert.ok(eggside[0].rattle,'the ware carries its rattle');
  const pick={nm:'Pick',g:'g-dagger',size:1,cd:1000,timer:0,alive:true,integ:400,maxI:400,
              fx:{dmg:12},bulwark:false,targeting:null,charge:null,pocket:0,flying:false,frozen:0,crit:0,rattle:null,selfdestruct:false,uid:921};
  const F=createFight({a:{nm:'you',hp:400,items:eggside,lifesteal:0},
                       b:{nm:'foe',hp:400,items:[pick],lifesteal:0},stormAt:999000,seed:5,playerIs:'a'});
  let spawned=false,pecked=false;
  while(F.t<12000){for(const e of F.step(50)){
    if(e.k==='spawn'&&e.side==='a'){spawned=true;}
    if(e.k==='fire'&&e.side==='a'){pecked=true;}
  }}
  assert.ok(spawned,'the broken egg spawned the hatchling on your side');
  assert.ok(pecked,'the hatchling fights back');
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

test('fusion: 3 daggers forge to 1 Silver, footprint kept',()=>{
  const board=[makeItem('dagger'),makeItem('dagger'),makeItem('dagger')];
  const forged=fuseScan(board);
  assert.equal(forged.length,1);
  assert.equal(board.length,1);
  assert.equal(board[0].rarity,1,'Silver');
  assert.equal(board[0].size,1,'stays Small');
});

test('fusion: 3 bronze then 2 silver then 2 gold reach Diamond, still Small',()=>{
  /* one silver from three bronze */
  const board=[];for(let i=0;i<3;i++){board.push(makeItem('dagger'));}
  fuseScan(board);
  assert.equal(board.length,1);assert.equal(board[0].rarity,1,'Silver');
  /* two silvers make a gold */
  board.push(makeItem('dagger',1));
  fuseScan(board);
  assert.equal(board.length,1);assert.equal(board[0].rarity,2,'Gold');
  /* two golds make a diamond */
  board.push(makeItem('dagger',2));
  fuseScan(board);
  assert.equal(board.length,1);
  assert.equal(board[0].rarity,3,'Diamond');
  assert.equal(board[0].size,1,'Diamond keeps the Small footprint');
});

test('fusion: two Silvers now forge a Gold (2026-07-12 counts)',()=>{
  const pair=[makeItem('dagger',1),makeItem('dagger',1)];
  const forged=fuseScan(pair);
  assert.equal(forged.length,1);
  assert.equal(pair[0].rarity,2,'Gold');
});

test('fusion: two bronze do not forge, three still do',()=>{
  const pair=[makeItem('dagger'),makeItem('dagger')];
  assert.equal(fuseScan(pair).length,0);
  const trio=[makeItem('dagger'),makeItem('dagger'),makeItem('dagger')];
  assert.equal(fuseScan(trio).length,1);
  assert.equal(trio[0].rarity,1,'Silver');
});

test('Debt Collector gains exactly +150 HP and +20 damage at 10 held gold',()=>{
  const base=monsterSide('collector',{round:5,gold:0,A:ANONE,gilded:false});
  const debt=monsterSide('collector',{round:5,gold:-3,A:ANONE,gilded:false});
  const rich=monsterSide('collector',{round:5,gold:10,A:ANONE,gilded:false});
  assert.equal(base.hp,200);
  assert.equal(debt.hp,base.hp,'negative gold cannot weaken his baseline health');
  assert.equal(debt.items[0].fx.dmg,base.items[0].fx.dmg,'negative gold cannot weaken his blade');
  assert.equal(rich.hp-base.hp,150);
  assert.equal(rich.items[0].fx.dmg-base.items[0].fx.dmg,20);
  assert.equal(rich.hp,350);
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

/* ============ STABILIZATION INVARIANTS (2026-07-12) ============ */
function side(ids,round,rarity){
  const board=ids.map(id=>makeItem(id,rarity||0));
  return {nm:'s',hp:fightHP(round,0,ANONE),items:playerFightItems(board,{},ANONE,1),lifesteal:0};
}

test('invariant: every fight terminates, even a board built to haste-loop',()=>{
  /* a wall of diamond Hourglasses used to drive each other into a
     supercritical activation loop; the haste cap must stop that */
  const hg=side(['hourglass','hourglass','hourglass','hourglass'],12,3);
  const foe=side(['hourglass','hourglass','hourglass','hourglass'],12,3);
  const F=duel(hg,foe,12,99,'a');
  assert.ok(F.done,'the haste board resolves instead of looping forever');
  assert.ok(F.t<=60000,'and ends within a minute of sim time, saw '+F.t);
});

test('invariant: poison decays without reapplication',()=>{
  /* one poison application, no source left: the merchant keeps taking
     damage but it fades round over round, never a flat forever-tick */
  const F=createFight({a:{nm:'a',hp:200,items:[],lifesteal:0},b:{nm:'b',hp:200,items:[],lifesteal:0},stormAt:99000,seed:1,playerIs:'a'});
  F.a.pois=40;
  const ticks=[];
  for(let s=0;s<12;s++){for(const e of F.step(1000)){if(e.k==='tickp')ticks.push(e.amt);}}
  assert.equal(ticks[0],40,'first tick is the full value');
  assert.ok(ticks[1]<ticks[0],'poison decays after ticking, '+ticks[1]+' < '+ticks[0]);
  assert.ok(ticks[ticks.length-1]<8,'and keeps fading toward zero, saw '+ticks[ticks.length-1]);
});

test('invariant: burn total is bounded, not quadratic in the packet',()=>{
  const F=createFight({a:{nm:'a',hp:9999,items:[],lifesteal:0},b:{nm:'b',hp:200,items:[],lifesteal:0},stormAt:99000,seed:1,playerIs:'a'});
  F.a.burn=21;let total=0;
  for(let s=0;s<12;s++){for(const e of F.step(1000)){if(e.k==='tickb')total+=e.amt;}}
  /* a 21 packet used to imply ~231 total (21+20+...+1); proportional decay
     keeps it near linear */
  assert.ok(total<70,'a 21 burn packet totals under 70, saw '+total);
});

test('invariant: a large weapon cleaves overkill into the next item',()=>{
  /* a Warhammer into a single chaff body should not lose all its excess;
     the cleave carries into the ware behind it */
  const attacker={nm:'a',hp:300,items:playerFightItems([makeItem('hammer',1)],{},ANONE,1),lifesteal:0};
  const chaff={nm:'b',hp:300,items:playerFightItems([makeItem('purse'),makeItem('purse')],{},ANONE,1),lifesteal:0};
  const F=createFight({a:attacker,b:chaff,stormAt:99000,seed:3,playerIs:'a'});
  let destroyed=0;
  for(let s=0;s<8&&!F.done;s++){for(const e of F.step(1000)){if(e.k==='destroy'&&e.side==='b')destroyed++;}}
  assert.ok(destroyed>=2,'the cleave takes down both chaff bodies, saw '+destroyed);
});

test('invariant: lifesteal heals from damage dealt, not the nominal number',()=>{
  /* a huge weapon striking a tiny body heals from what actually landed */
  const F=createFight({a:{nm:'a',hp:100,items:playerFightItems([makeItem('hammer',2)],{},ANONE,1),lifesteal:0.15},b:{nm:'b',hp:9999,items:playerFightItems([makeItem('purse')],{},ANONE,1),lifesteal:0},stormAt:99000,seed:5,playerIs:'a'});
  F.a.hp=50;
  let healed=0;
  for(let s=0;s<3&&!F.done;s++){for(const e of F.step(1000)){if(e.k==='heal'&&e.side==='a')healed+=e.amt;}}
  const nominal=F.a.items[0].fx.dmg;
  /* a gold Warhammer nominal is ~160; healing 15% of that would be ~24, but
     a 14-integrity purse only takes 14, so a correct heal is a few points */
  assert.ok(healed<Math.round(nominal*0.15),'heal came from dealt damage, not nominal, saw '+healed);
});
