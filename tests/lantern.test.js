import {test} from 'node:test';
import assert from 'node:assert/strict';
import {composeLantern,lanternRules,adjustedStormAt} from '../src/anomaly-rules.js';
import {buildFoe} from '../src/encounter.js';
import {fightHP,monsterSide} from '../src/engine.js';
import {genMap} from '../src/map.js';
import {initRoute,lossDamage,isGateDistrict} from '../src/route.js';
import {ANOMALIES,ANONE,LANTERN,MONSTERS} from '../src/data.js';

/* every Omen id to its EFFECTIVE A object, exactly as the run builds it
   (ui.js: Object.assign({},ANONE,anom.m)), plus the no-Omen baseline */
const OMENS=[['none',ANONE]].concat(ANOMALIES.map(a=>[a.id,Object.assign({},ANONE,a.m)]));
const effA=id=>OMENS.find(o=>o[0]===id)[1];

test('the LANTERN table is ten cumulative named levels',()=>{
  assert.equal(LANTERN.length,10);
  LANTERN.forEach((r,i)=>{
    assert.equal(r.lv,i+1,'levels are ordered 1 to 10');
    assert.ok(r.n&&r.d,'level '+r.lv+' has a name and a rule line');
  });
  assert.deepEqual(lanternRules(0),[]);
  assert.equal(lanternRules(3).length,3);
  assert.equal(lanternRules(10).length,10);
});

test('Lantern 0 identity: composition returns the plain Omen object untouched',()=>{
  for(const [id,A] of OMENS){
    assert.equal(composeLantern(id,A,0),A,'level 0 returns the same reference for '+id);
  }
});

test('composition never mutates the Omen and composes a copy at nonzero levels',()=>{
  for(const [id,A] of OMENS){
    const before=JSON.stringify(A);
    const c=composeLantern(id,A,10);
    assert.equal(JSON.stringify(A),before,'Omen '+id+' mutated');
    assert.notEqual(c,A,'nonzero level composes a copy for '+id);
  }
});

test('storm offsets sum on top of the Omen with no second floor',()=>{
  /* plain: L4 adds -2000 */
  assert.equal(composeLantern('none',ANONE,4).stormStartOffsetMs,-2000);
  /* Fortified: -5000 Omen plus -2000 Lantern = -7000; the single existing
     6000ms floor in adjustedStormAt still applies at the call site */
  const composed=composeLantern('fortified',effA('fortified'),4);
  assert.equal(composed.stormStartOffsetMs,-7000);
  assert.equal(adjustedStormAt(12000,composed),6000,'the floor holds');
  assert.equal(adjustedStormAt(20000,composed),13000,'above the floor the sum applies');
});

test('shopN composes as a delta after the Omen with a floor of 3',()=>{
  assert.equal(composeLantern('none',ANONE,5).shopN,3,'base 4 minus 1');
  assert.equal(composeLantern('overstock',effA('overstock'),5).shopN,5,'Overstocked 6 minus 1');
  assert.equal(composeLantern('silent',effA('silent'),5).shopN,5,'Silent Bazaar 6 minus 1');
  /* below L5 the Omen's own shopN is untouched */
  assert.equal(composeLantern('none',ANONE,4).shopN,ANONE.shopN);
  assert.equal(composeLantern('overstock',effA('overstock'),4).shopN,6);
});

test('the frost exemption keys on the Omen id, not inferred fields',()=>{
  assert.equal(composeLantern('none',ANONE,6).freezeDisabled,true);
  assert.equal(Object.hasOwn(composeLantern('silent',effA('silent'),6),'freezeDisabled'),false,
    'Silent Bazaar keeps its frost');
  /* an Omen that merely shares fields with Silent Bazaar is not exempt */
  const lookalike=Object.assign({},ANONE,{shopN:6,rerollDisabled:true,freezeDurationRounds:2});
  assert.equal(composeLantern('imposter',lookalike,6).freezeDisabled,true);
});

test('direct event gold composes as a flat delta',()=>{
  assert.equal(composeLantern('none',ANONE,2).directEventGoldFlat,-2);
  assert.equal(Object.hasOwn(composeLantern('none',ANONE,1),'directEventGoldFlat'),false);
});

/* ---- the shared encounter builder reproduces the old call sites exactly ---- */
test('buildFoe matches the direct fightHP plus monsterSide construction',()=>{
  const board=[{id:'sword',rarity:1,size:2,ench:null,iid:1},{id:'vial',rarity:0,size:1,ench:null,iid:2}];
  const cases=[
    {monId:'rats',ctx:{threat:1,hpFlat:0,A:ANONE,gold:6,gilded:false,power:undefined,board:board}},
    {monId:'ghul',ctx:{threat:2,hpFlat:30,A:ANONE,gold:0,gilded:true,power:undefined,board:board}},
    {monId:'vizier',ctx:{threat:12,hpFlat:0,A:ANONE,gold:4,gilded:false,power:1.6,board:board}},
    {monId:'qareen',ctx:{threat:5,hpFlat:0,A:ANONE,gold:9,gilded:false,power:undefined,board:board}},
    {monId:'collector',ctx:{threat:6,hpFlat:0,A:ANONE,gold:14,gilded:false,power:undefined,board:board}}
  ];
  const stable=s=>{const w=JSON.parse(JSON.stringify(s));w.items.forEach(i=>{delete i.uid;});return w;};
  for(const c of cases){
    const foe=buildFoe(c.monId,c.ctx);
    const php=fightHP(c.ctx.threat,c.ctx.hpFlat||0,c.ctx.A);
    const side=monsterSide(c.monId,{gold:c.ctx.gold||0,round:c.ctx.threat,A:c.ctx.A,gilded:!!c.ctx.gilded,
      power:c.ctx.power||1,playerBoard:c.ctx.board,playerHp:php});
    assert.equal(foe.php,php,c.monId+' player fight health');
    assert.deepEqual(stable(foe.side),stable(side),c.monId+' side');
  }
});

/* ---- L1 Trimmed Wick through the builder ---- */
test('L1: doors fight 10 percent stronger; bosses, the Gate, and the mirror are exempt',()=>{
  const base={threat:5,hpFlat:0,A:ANONE,gold:0,gilded:false,power:undefined,board:[]};
  const at=(monId,extra)=>buildFoe(monId,Object.assign({},base,extra)).side;
  /* a monster door scales */
  assert.equal(at('kark',{nodeType:'monster',lantern:1}).hp,Math.round(MONSTERS.kark.hp*1.10));
  /* level 0 does not */
  assert.equal(at('kark',{nodeType:'monster',lantern:0}).hp,MONSTERS.kark.hp);
  /* a boss never scales */
  assert.equal(at('matron',{nodeType:'boss',lantern:10}).hp,MONSTERS.matron.hp);
  /* the Gate never scales even for elite nodes */
  assert.equal(at('azhdaha',{nodeType:'elite',lantern:10,gate:true}).hp,MONSTERS.azhdaha.hp);
  /* the mirror is exempt by ruling: same items either way */
  const stable=s=>{const w=JSON.parse(JSON.stringify(s));w.items.forEach(i=>{delete i.uid;});return w;};
  const mirrorBoard=[{id:'sword',rarity:1,size:2,ench:null,iid:1}];
  assert.deepEqual(
    stable(at('qareen',{nodeType:'monster',lantern:1,board:mirrorBoard})),
    stable(at('qareen',{nodeType:'monster',lantern:0,board:mirrorBoard})));
  /* composed district power multiplies, it is not replaced */
  assert.equal(at('kark',{nodeType:'monster',lantern:1,power:2}).hp,Math.round(MONSTERS.kark.hp*2*1.10));
});

/* ---- map generation across lantern levels ---- */
test('the lantern moves gilding booleans only: same structure, ids, and rewards per seed',()=>{
  const strip=map=>{const j=JSON.parse(JSON.stringify(map));delete j.lantern;
    for(const id in j.nodes)delete j.nodes[id].gilded;
    for(const d of j.districts){delete d.boss.gilded;for(const col of d.columns)for(const n of col)delete n.gilded;}
    return j;};
  for(const seed of [3,99,40001]){
    for(const mode of ['quick','long']){
      const l0=genMap(seed,mode,0);
      for(const lv of [7,8,10]){
        assert.deepEqual(strip(genMap(seed,mode,lv)),strip(l0),mode+' seed '+seed+' lantern '+lv+' drifted');
      }
    }
  }
});

test('genMap at lantern 0 is byte-identical to the two-argument call',()=>{
  for(const seed of [0,7,1234567]){
    assert.deepEqual(genMap(seed,'quick',0),genMap(seed,'quick'));
    assert.deepEqual(genMap(seed,'long',0),genMap(seed,'long'));
  }
});

test('L7 gilds every district elite; L8 raises monster gilding; the Gate is untouched',()=>{
  for(const seed of [11,222,3333]){
    for(const mode of ['quick','long']){
      const l0=genMap(seed,mode,0),l8=genMap(seed,mode,8);
      let doors0=0,gild0=0,doors8=0,gild8=0;
      for(const id in l8.nodes){
        const n8=l8.nodes[id],n0=l0.nodes[id];
        const d8=l8.districts.find(d=>d.id===n8.district);
        if(isGateDistrict(d8)){
          assert.deepEqual(n8,n0,'Gate node '+id+' changed at lantern 8 ('+mode+')');
          continue;
        }
        if(n8.type==='elite')assert.equal(n8.gilded,true,'elite '+id+' not gilded at L8 ('+mode+')');
        if(n8.type==='monster'){doors8++;if(n8.gilded)gild8++;doors0++;if(n0.gilded)gild0++;}
        if(n8.type==='boss'){assert.equal(n8.gilded,n0.gilded,'boss gilding moved at '+id);}
      }
      assert.ok(gild8>=gild0,mode+' seed '+seed+': L8 lowered gilding');
    }
  }
  /* the 0.45 threshold lands near its rate across many seeds */
  let doors=0,gilded=0;
  for(let s=0;s<120;s++){
    const map=genMap(((s*2654435761)^0x9e3779b9)>>>0,'quick',8);
    for(const id in map.nodes){
      const n=map.nodes[id];
      const d=map.districts.find(x=>x.id===n.district);
      if(n.type==='monster'&&!isGateDistrict(d)){doors++;if(n.gilded)gilded++;}
    }
  }
  const rate=gilded/doors;
  assert.ok(rate>0.36&&rate<0.54,'L8 monster gilding rate '+rate.toFixed(3)+' strayed from 0.45');
});

/* ---- L3 the Toll and L10 the Last Drop ---- */
test('L3: losses cost 2 more in the districts, never at the Gate',()=>{
  const quick0=genMap(5,'quick',0),quick3=genMap(5,'quick',3);
  const nodeIn=(map,pred)=>{for(const id in map.nodes){const n=map.nodes[id];const d=map.districts.find(x=>x.id===n.district);if(pred(n,d))return n;}return null;};
  const door0=nodeIn(quick0,(n,d)=>n.type==='monster'&&!isGateDistrict(d));
  const door3=quick3.nodes[door0.id];
  assert.equal(lossDamage(door3,0,quick3),lossDamage(door0,0,quick0)+2,'district toll');
  const gate0=nodeIn(quick0,(n,d)=>isGateDistrict(d)&&n.type==='elite');
  const gate3=quick3.nodes[gate0.id];
  assert.equal(lossDamage(gate3,0,quick3),lossDamage(gate0,0,quick0),'the Gate exacts only its usual toll');
  const long3=genMap(5,'long',3);
  const lgate=nodeIn(long3,(n,d)=>isGateDistrict(d)&&n.type==='elite');
  const lgate0Map=genMap(5,'long',0);
  assert.equal(lossDamage(lgate,0,long3),lossDamage(lgate0Map.nodes[lgate.id],0,lgate0Map),'Long Gate too');
});

test('L10: the last drop of oil sets 34 and 50 Resolve; below it nothing moves',()=>{
  assert.equal(initRoute(1,'quick',10).resolve,34);
  assert.equal(initRoute(1,'long',10).resolve,50);
  assert.equal(initRoute(1,'quick',9).resolve,40);
  assert.equal(initRoute(1,'long',9).resolve,60);
  assert.equal(initRoute(1,'quick').resolve,40,'the default stays pre-Lantern');
  assert.equal(initRoute(1,'quick',10).resolveMax,34,'resolveMax follows');
});

test('buildFoe scout parity: two builds of one node agree',()=>{
  /* the scout preview and the fight construct from the same ctx; the builder
     guarantees they cannot drift */
  const ctx={threat:8,hpFlat:0,A:ANONE,gold:3,gilded:true,power:2.05,board:[]};
  const stable=s=>{const w=JSON.parse(JSON.stringify(s));w.items.forEach(i=>{delete i.uid;});return w;};
  for(const monId of Object.keys(MONSTERS)){
    const a=buildFoe(monId,ctx),b=buildFoe(monId,ctx);
    assert.deepEqual(stable(a.side),stable(b.side),monId);
  }
});
