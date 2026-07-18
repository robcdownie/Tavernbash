import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AFFIXES,ITEMS,DISTRICTS,LONG_DISTRICTS} from '../src/data.js';
import {districtAffix,affixFightHooks} from '../src/aspects.js';
import {isGateDistrict} from '../src/route.js';
import {createFight,validateCombatHooks,COMBAT_HOOK_POINTS} from '../src/engine.js';

/* ---- the flat list of every affix, and the raw specs the way validateCombatHooks
   reads them (on/when/actions, before the side/kind stamp the wire adds) ---- */
const ALL_AFFIXES=Object.keys(AFFIXES).flatMap(k=>AFFIXES[k]);
const ALL_SPECS=ALL_AFFIXES.flatMap(a=>a.hooks);
function affixById(id){for(const k of Object.keys(AFFIXES)){const a=AFFIXES[k].find(x=>x.id===id);if(a)return a;}return null;}

/* ---- fixture fight helpers (same shape as engine-hooks.test.js) ---- */
let UID=900000;
function item(over){
  return Object.assign({uid:UID++,nm:'Ware',g:'g-sword',size:1,rarity:0,cat:'dmg',tier:1,
    cd:0,timer:0,alive:true,integ:20,maxI:20,fx:{},bulwark:false,targeting:null,charge:null,
    pocket:0,flying:false,frozen:0,crit:0,rattle:null,selfdestruct:false,ammo:0,maxAmmo:0,lot:false,
    freezeOnce:0,hooks:null},over);
}
function side(items){return {nm:'Side',hp:100,items:items,lifesteal:0,regen:0};}
/* a fight where side b carries the affix rule hooks, exactly as startRouteFight wires them */
function fightWithAffix(a,b,affixId,extra){
  return createFight(Object.assign({a:side(a),b:side(b),seed:1,stormAt:9e9,playerIs:'a',
    hooks:affixFightHooks(affixById(affixId))},extra||{}));
}

/* ============ DATA LINT ============ */

test('AFFIXES holds exactly three one-word affixes per source district 1..3, well formed',()=>{
  assert.deepEqual(Object.keys(AFFIXES).sort(),['1','2','3'],'keyed by source district 1, 2, 3');
  const seen=new Set();
  for(const key of ['1','2','3']){
    const list=AFFIXES[key];
    assert.equal(list.length,3,'district '+key+' has three affixes');
    for(const a of list){
      assert.equal(typeof a.id,'string');assert.ok(a.id.length>0,a.id+' has an id');
      assert.ok(!seen.has(a.id),'affix id '+a.id+' is unique across districts');seen.add(a.id);
      assert.equal(typeof a.w,'string');
      assert.ok(a.w.length>0&&!/\s/.test(a.w),a.id+' word "'+a.w+'" is a single word');
      assert.equal(typeof a.d,'string');assert.ok(a.d.length>10,a.id+' has a scout sentence');
      assert.ok(Array.isArray(a.hooks)&&a.hooks.length>0,a.id+' has hook specs');
    }
  }
  assert.equal(ALL_AFFIXES.length,9,'nine affixes total');
});

test('every affix hook point is a real COMBAT_HOOK_POINT and every op passes validateCombatHooks',()=>{
  const points=new Set(COMBAT_HOOK_POINTS);
  for(const spec of ALL_SPECS)assert.ok(points.has(spec.on),spec.on+' is a real combat hook point');
  /* validateCombatHooks throws on any op not in HOOK_ACTIONS or any bad on/every/oncePerMs,
     so passing over all nine at once proves every op and point is legal engine machinery */
  assert.equal(validateCombatHooks(ALL_SPECS),true,'all nine affix specs validate together');
  for(const a of ALL_AFFIXES)assert.equal(validateCombatHooks(a.hooks),true,a.id+' validates alone');
});

test('affix hooks validate concatenated with every R8 item that carries hooks',()=>{
  /* the realistic per-fight union: the player board of hook-bearing wares plus the
     monster side stamped with a district affix. Each item union must stay acyclic. */
  let checked=0;
  for(const id of Object.keys(ITEMS)){
    const hooks=ITEMS[id].hooks;
    if(!Array.isArray(hooks)||!hooks.length)continue;
    checked++;
    assert.equal(validateCombatHooks(hooks.concat(ALL_SPECS)),true,id+' + all affixes stays acyclic');
  }
  assert.ok(checked>0,'at least one R8 item carries hooks to union against');
});

/* ============ RESOLVER: scope, determinism, uniformity ============ */

test('districtAffix draws for non-Gate districts only, in both modes',()=>{
  const SEED=12345;
  for(const d of DISTRICTS.concat(LONG_DISTRICTS)){
    const a=districtAffix(d,SEED);
    if(isGateDistrict(d)){assert.equal(a,null,'district '+d.id+' is a Gate and draws no affix');continue;}
    const theme=d.sourceId!=null?d.sourceId:d.id;
    assert.ok(a&&AFFIXES[theme].some(x=>x.id===a.id),'district '+d.id+' drew an affix from its theme '+theme);
  }
});

test('districtAffix returns null with no seed (feature off) and is deterministic',()=>{
  const d=DISTRICTS[0];
  assert.equal(districtAffix(d,null),null,'null seed -> no affix (byte-identical)');
  assert.equal(districtAffix(d,undefined),null,'undefined seed -> no affix');
  assert.equal(districtAffix(null,7),null,'no district -> null');
  for(let s=1;s<=40;s++){const seed=(s*2654435761)>>>0;assert.equal(districtAffix(d,seed).id,districtAffix(d,seed).id,'stable per seed');}
});

test('a Long reprise draws independently from its source district (salted by id, not sourceId)',()=>{
  /* Quick D1 (id 1, source 1) and Long After-Midnight D4 (id 4, source 1) share a
     theme but different salts, so they must be able to differ across seeds */
  const quick=DISTRICTS[0],reprise=LONG_DISTRICTS[3];
  assert.equal(reprise.sourceId,1,'reprise shares the source theme');
  let differ=false;
  for(let s=1;s<=200&&!differ;s++){const seed=(s*40503)>>>0;if(districtAffix(quick,seed).id!==districtAffix(reprise,seed).id)differ=true;}
  assert.ok(differ,'the reprise draws its affix independently of the Quick district');
});

test('the pick reaches all three affixes and is close to uniform over seeds',()=>{
  const d=DISTRICTS[1],counts={},N=9000;
  for(let i=0;i<N;i++){const a=districtAffix(d,(i*2654435761)>>>0);counts[a.id]=(counts[a.id]||0)+1;}
  for(const a of AFFIXES['2']){const share=(counts[a.id]||0)/N;assert.ok(Math.abs(share-1/3)<0.04,a.id+' share '+share.toFixed(3)+' near one third');}
});

/* ============ WIRING: the fight-hook stamp ============ */

test('affixFightHooks stamps side b, kind rule, a stable source id, and preserves the spec',()=>{
  assert.equal(affixFightHooks(null),null,'no affix -> no hooks (fight stays byte-identical)');
  const aff=affixById('mending'),wired=affixFightHooks(aff);
  assert.equal(wired.length,aff.hooks.length);
  const h=wired[0];
  assert.equal(h.side,'b','the monster owns the affix');
  assert.equal(h.kind,'rule','rule-kind sorts before item hooks');
  assert.equal(h.sourceId,'affix_mending','stable per-affix source id');
  assert.equal(h.on,aff.hooks[0].on,'the spec on survives');
  assert.deepEqual(h.actions,aff.hooks[0].actions,'the spec actions survive');
});

/* ============ IDENTITY / ZERO RNG ============ */

test('an empty hooks array is byte-identical to passing no hooks at all',()=>{
  const board=()=>[item({cd:1000,fx:{dmg:6}})];
  const none=createFight({a:side(board()),b:side(board()),seed:5,stormAt:9e9,playerIs:'a'});
  const empty=createFight({a:side(board()),b:side(board()),seed:5,stormAt:9e9,playerIs:'a',hooks:[]});
  const evA=[],evB=[];for(let i=0;i<40&&(!none.done||!empty.done);i++){evA.push(none.step(100));evB.push(empty.step(100));}
  assert.deepEqual(evB,evA,'hooks:[] draws no hook frames and changes nothing');
});

test('affix hooks draw zero rng on crit-free boards (draw-count equality with and without)',()=>{
  const monster=()=>[item({nm:'Fang',cd:100,fx:{dmg:5}})];   /* hits the empty player merchant */
  function draws(affixId){
    const taps=[];
    const F=createFight({a:side([]),b:side(monster()),seed:9,stormAt:9e9,playerIs:'a',
      hooks:affixFightHooks(affixById(affixId)),rngTap:(tag,v)=>taps.push(tag)});
    for(let i=0;i<20&&!F.done;i++)F.step(100);
    return taps.length;
  }
  const base=(function(){const taps=[];const F=createFight({a:side([]),b:side(monster()),seed:9,stormAt:9e9,playerIs:'a',rngTap:(t)=>taps.push(t)});for(let i=0;i<20&&!F.done;i++)F.step(100);return taps.length;})();
  assert.equal(base,0,'the crit-free baseline draws no rng');
  for(const id of ['venomed','mending','clinging','hoarding','taxing','foreclosing','smoldering','bellowed','scorched']){
    assert.equal(draws(id),base,id+' adds no rng draws');
  }
});

/* ============ BEHAVIOR: every affix does exactly what its word says ============ */

test('District 1 Mending: the foe heals 2 when its ware strikes your merchant',()=>{
  const F=fightWithAffix([],[item({cd:100,fx:{dmg:10}})],'mending');
  F.b.hp=50;                                   /* below max so the mend is visible */
  F.step(120);
  assert.equal(F.a.hp,90,'the strike lands on your merchant');
  assert.equal(F.b.hp,52,'the foe knits 2 back');
});

test('District 1 Venomed: the foe merchant strike adds 1 poison to you',()=>{
  const F=fightWithAffix([],[item({cd:100,fx:{dmg:5}})],'venomed');
  F.step(150);                                 /* under 1s, so no poison tick yet */
  assert.equal(F.a.pois,1,'one poison stack applied');
});

test('District 1 Clinging: your healing is a fifth weaker, the foe heals fully',()=>{
  const player=fightWithAffix([item({cd:100,fx:{heal:10}})],[],'clinging');
  player.a.hp=50;player.step(150);
  assert.equal(player.a.hp,58,'your 10 heal is cut to 8');
  const foe=fightWithAffix([],[item({cd:100,fx:{heal:10}})],'clinging');
  foe.b.hp=50;foe.step(150);
  assert.equal(foe.b.hp,60,'the foe heals in full: Clinging only weakens your salves');
});

test('District 2 Hoarding: the foe opens the fight with 12 shield',()=>{
  const F=fightWithAffix([],[],'hoarding');
  F.step(1);
  assert.equal(F.b.shield,12,'coin stacked as armor');
  assert.equal(F.a.shield,0,'yours is untouched');
});

test('District 2 Taxing: every fourth foe activation costs your merchant 2 health',()=>{
  const F=fightWithAffix([],[item({cd:100,fx:{}})],'taxing');   /* no damage: isolate the tax */
  F.step(450);                                  /* the 4-activation catch-up cap: four fires */
  assert.equal(F.a.hp,98,'the fourth activation bills your merchant 2');
});

test('District 2 Foreclosing: when your ware is destroyed the foe heals 6',()=>{
  const F=fightWithAffix([item({integ:5})],[item({cd:100,fx:{dmg:50}})],'foreclosing');
  F.b.hp=50;F.step(120);
  assert.equal(F.a.items[0].alive,false,'your ware is repossessed');
  assert.equal(F.b.hp,56,'the foe heals 6 off the wreck');
});

test('District 3 Smoldering: the foe merchant strike adds 2 burn to you',()=>{
  const F=fightWithAffix([],[item({cd:100,fx:{dmg:5}})],'smoldering');
  F.step(150);                                  /* under 1s, no burn tick yet */
  assert.equal(F.a.burn,2,'two burn clings');
});

test('District 3 Bellowed: the foe strike quickens its leftmost working ware',()=>{
  /* slot 0 is a slow ware (the one to be hastened); slot 1 is the striker */
  const F=fightWithAffix([],[item({nm:'Anvil',cd:5000,fx:{}}),item({nm:'Striker',cd:100,fx:{dmg:5}})],'bellowed');
  const ev=F.step(100);
  assert.ok(ev.some(e=>e.k==='haste'&&e.side==='b'&&e.i===0),'the bellows hasten the leftmost working ware');
});

test('District 3 Scorched: 3 burn clings to you as the fight begins',()=>{
  const F=fightWithAffix([],[],'scorched');
  F.step(1);
  assert.equal(F.a.burn,3,'you arrive singed');
  assert.equal(F.b.burn,0,'the foe is not');
});
