import {test} from 'node:test';
import assert from 'node:assert/strict';
import {genMap,isCombat} from '../src/map.js';
import {initRoute,transition,frontier,fightSeed,lossDamage,validRoute,BASE_GOLD,currentDistrict,classifyEdges} from '../src/route.js';
import {MONCHIP,DISTRICTS} from '../src/data.js';

const SEEDS=[];
for(let i=0;i<60;i++)SEEDS.push(((i*40503+7)^0x9e3779b9)>>>0);

/* drive a run with a policy. policy.map returns an action for a map-phase turn (or
   'stop'); policy.fight returns 'a'/'b'; policy.gate returns a gate-camp action. */
function run(seed,policy,mode='quick'){
  const map=genMap(seed,mode);
  let st=initRoute(seed,mode);
  const effects=[];let guard=0;
  while(st.phase!=='won'&&st.phase!=='lost'&&guard++<400){
    let act;
    if(st.phase==='map'){
      const fr=frontier(st,map);
      act=(policy.map||((s,m,f)=>({type:'commit',nodeId:f[0],choice:'challenge'})))(st,map,fr);
      if(act==='stop')return {state:st,map,effects};
    }else if(st.phase==='encounter'){
      act={type:'fightResult',winner:(policy.fight||(()=>'a'))(st,map),survTier:policy.surv||0};
    }else if(st.phase==='reward'){act={type:'settleReward'};}
    else if(st.phase==='market'){act={type:'leaveMarket'};}
    else if(st.phase==='event'){act={type:'resolveEvent'};}
    else if(st.phase==='gateCamp'){act=(policy.gate||(()=>({type:'startBossRetry'})))(st,map);}
    const r=transition(st,map,act);st=r.state;effects.push(...r.effects);
  }
  return {state:st,map,effects};
}

function stateBeforeNode(map,node,mode){
  const st=initRoute(map.seed,mode);
  if(node.col===0){
    if(node.district>1)st.path=[map.districts[node.district-2].boss.id];
    return st;
  }
  const d=map.districts[node.district-1];let pred=null;
  for(const col of d.columns)for(const n of col)if((n.next||[]).includes(node.id)){pred=n;break;}
  assert.ok(pred,'no predecessor for '+node.id);
  st.path=[pred.id];
  return st;
}

test('Quick fight effects use neutral power without changing the map payload',()=>{
  for(const s of SEEDS.slice(0,10)){
    const map=genMap(s,'quick');
    for(const d of map.districts){
      const nodes=d.columns.flat().concat([d.boss]).filter(isCombat);
      for(const node of nodes){
        assert.equal(Object.hasOwn(node,'power'),false);
        const r=transition(stateBeforeNode(map,node,'quick'),map,{type:'commit',nodeId:node.id,choice:'challenge'});
        assert.equal(r.effects[0].power,1,node.id+' Quick effect was not neutral');
      }
    }
  }
});

test('every late Long fight effect and boss retry preserves district power',()=>{
  for(const s of SEEDS.slice(0,10)){
    const map=genMap(s,'long');
    for(const d of map.districts.slice(3)){
      const nodes=d.columns.flat().concat([d.boss]).filter(isCombat);
      for(const node of nodes){
        const r=transition(stateBeforeNode(map,node,'long'),map,{type:'commit',nodeId:node.id,choice:'challenge'});
        assert.equal(r.effects[0].power,d.power,node.id+' commit lost power');
      }
      const camp=initRoute(s,'long');
      camp.phase='gateCamp';camp.pendingId=d.boss.id;camp.resolution='challenge';
      const retry=transition(camp,map,{type:'startBossRetry'}).effects[0];
      assert.equal(retry.power,d.power,d.boss.id+' retry lost power');
    }
  }
});

test('Long flawless run visits forty nodes, beats seven bosses, and keeps sixty Resolve',()=>{
  for(const s of SEEDS.slice(0,20)){
    const {state}=run(s,{fight:()=>'a'},'long');
    assert.equal(state.phase,'won','seed '+s+' did not win');
    assert.equal(state.path.length,40);
    for(let d=1;d<=7;d++)assert.ok(state.path.includes('d'+d+'boss'),'missed district '+d+' boss');
    assert.equal(state.resolve,60);
    assert.equal(state.resolveMax,60);
    assert.equal(state.path[state.path.length-1],'d7boss');
  }
});

test('Long uses map loss chips and slip costs in After Midnight districts',()=>{
  const s=SEEDS[2],map=genMap(s,'long');
  let st=initRoute(s,'long'),guard=0;
  while(currentDistrict(st,map)<3&&guard++<200){
    let action;
    if(st.phase==='map'){const fr=frontier(st,map);action={type:'commit',nodeId:fr[0],choice:'challenge'};}
    else if(st.phase==='encounter')action={type:'fightResult',winner:'a'};
    else if(st.phase==='reward')action={type:'settleReward'};
    else if(st.phase==='market')action={type:'leaveMarket'};
    else if(st.phase==='event')action={type:'resolveEvent'};
    ({state:st}=transition(st,map,action));
  }
  assert.equal(currentDistrict(st,map),3,'did not reach the first reprise');
  const node=map.nodes[frontier(st,map)[0]];
  assert.equal(node.type,'monster');
  let r=transition(st,map,{type:'commit',nodeId:node.id,choice:'slip'});
  assert.equal(r.state.resolve,52,'D4 Slip Past costs 8 Resolve');

  st=Object.assign({},st,{path:st.path.slice()});
  ({state:st}=transition(st,map,{type:'commit',nodeId:node.id,choice:'challenge'}));
  r=transition(st,map,{type:'fightResult',winner:'b',survTier:0});
  assert.equal(r.effects[0].damage,6,'D4 base loss chip is 6');
  assert.equal(r.state.resolve,54);
});

test('a forced gilded reprise boss stays gilded on every retry',()=>{
  const s=SEEDS[6],map=genMap(s,'long');
  let st=initRoute(s,'long'),guard=0,firstFight=null,retry=null;
  while(!retry&&guard++<500){
    let r;
    if(st.phase==='map')r=transition(st,map,{type:'commit',nodeId:frontier(st,map)[0],choice:'challenge'});
    else if(st.phase==='encounter'){
      const n=map.nodes[st.pendingId];
      r=transition(st,map,{type:'fightResult',winner:n.id==='d4boss'?'b':'a'});
    }else if(st.phase==='reward')r=transition(st,map,{type:'settleReward'});
    else if(st.phase==='market')r=transition(st,map,{type:'leaveMarket'});
    else if(st.phase==='event')r=transition(st,map,{type:'resolveEvent'});
    else if(st.phase==='gateCamp'){
      r=transition(st,map,{type:'startBossRetry'});retry=r.effects[0];
    }
    if(!firstFight&&r.effects[0]&&r.effects[0].nodeId==='d4boss'&&r.effects[0].type==='fight')firstFight=r.effects[0];
    st=r.state;
  }
  assert.equal(firstFight.gilded,true);
  assert.equal(retry.gilded,true);
  assert.equal(firstFight.power,map.districts[3].power);
  assert.equal(retry.power,map.districts[3].power);
  assert.notEqual(firstFight.fightSeed,retry.fightSeed);
});

test('a flawless run visits 22 nodes, beats all four bosses, keeps full Resolve',()=>{
  for(const s of SEEDS){
    const {state,map}=run(s,{fight:()=>'a'});
    assert.equal(state.phase,'won','seed '+s+' did not win');
    assert.equal(state.path.length,22,'seed '+s+' visited '+state.path.length);
    for(const b of ['d1boss','d2boss','d3boss','d4boss'])assert.ok(state.path.includes(b),'seed '+s+' missed '+b);
    assert.equal(state.resolve,40,'seed '+s+' lost Resolve on a flawless run');
    assert.equal(state.path[state.path.length-1],'d4boss');
  }
});

test('a normal-door loss spends Resolve, awards nothing, and advances the route',()=>{
  const s=SEEDS[0],map=genMap(s);
  let st=initRoute(s);
  const fr=frontier(st,map);
  const node=map.nodes[fr[0]];                 /* column 1 is always a Monster Door */
  assert.equal(node.type,'monster');
  ({state:st}=transition(st,map,{type:'commit',nodeId:node.id,choice:'challenge'}));
  const r=transition(st,map,{type:'fightResult',winner:'b',survTier:0});
  st=r.state;
  assert.equal(st.resolve,40-MONCHIP[1]);       /* district 1 chip, +0 normal, +0 surviving */
  assert.ok(st.path.includes(node.id),'lost node did not complete');
  assert.equal(st.phase,'map');
  assert.ok(!r.effects.some(e=>e.type==='reward'),'a loss paid a reward');
});

test('Slip Past costs the district Resolve, gives no fight, and completes the node',()=>{
  const s=SEEDS[3],map=genMap(s);
  let st=initRoute(s);
  const node=map.nodes[frontier(st,map)[0]];
  const r=transition(st,map,{type:'commit',nodeId:node.id,choice:'slip'});
  st=r.state;
  assert.equal(st.resolve,40-DISTRICTS[0].slip);
  assert.ok(st.path.includes(node.id));
  assert.equal(st.phase,'map');
  assert.ok(r.effects.some(e=>e.type==='slip')&&!r.effects.some(e=>e.type==='fight'));
});

test('surviving enemy tiers raise the loss, capped at four',()=>{
  const n={district:2,type:'elite'};
  assert.equal(lossDamage(n,0),MONCHIP[2]+2);
  assert.equal(lossDamage(n,9),MONCHIP[2]+2+3);
  assert.equal(lossDamage(n,99),MONCHIP[2]+2+4);   /* capped */
});

test('a boss loss holds at the gate; retry re-seeds and can win through',()=>{
  const s=SEEDS[5];
  let lostOnce=false;
  const {state,effects}=run(s,{
    fight:(st,map)=>{const n=map.nodes[st.pendingId];if(n.type==='boss'&&!lostOnce){lostOnce=true;return 'b';}return 'a';}
  });
  assert.ok(lostOnce,'never reached a boss to lose');
  assert.ok(effects.some(e=>e.type==='gateCamp'),'no Gate Camp on the boss loss');
  assert.equal(state.phase,'won','could not recover after the boss loss');
});

test('boss retry uses a fresh deterministic fight seed per attempt',()=>{
  const s=SEEDS[7];
  const a0=fightSeed(s,'d1boss',0),a1=fightSeed(s,'d1boss',1);
  assert.notEqual(a0,a1);
  assert.equal(fightSeed(s,'d1boss',0),a0);                 /* stable per attempt */
  assert.notEqual(fightSeed(s,'d1boss',0),fightSeed(s,'d2boss',0));
});

test('Resolve reaching zero ends the run as a loss',()=>{
  const s=SEEDS[9];
  const {state,effects}=run(s,{fight:()=>'b'});            /* lose every fight */
  assert.equal(state.phase,'lost');
  assert.ok(state.resolve<=0);
  assert.ok(effects.some(e=>e.type==='end'&&e.cause==='resolve'));
});

test('a win pays exactly once, and only after the reward is settled',()=>{
  const s=SEEDS[11],map=genMap(s);
  let st=initRoute(s);
  const node=map.nodes[frontier(st,map)[0]];
  ({state:st}=transition(st,map,{type:'commit',nodeId:node.id,choice:'challenge'}));
  let r=transition(st,map,{type:'fightResult',winner:'a',survTier:0});
  st=r.state;
  assert.equal(st.phase,'reward');
  assert.ok(!st.path.includes(node.id),'node completed before reward settled');
  assert.ok(!r.effects.some(e=>e.type==='reward'),'reward paid at fight end, not at settle');
  r=transition(st,map,{type:'settleReward'});
  st=r.state;
  const reward=r.effects.find(e=>e.type==='reward');
  assert.ok(reward&&reward.gold===BASE_GOLD.monster);
  assert.ok(st.path.includes(node.id));
  assert.equal(st.phase,'map');
});

test('state serializes and restores mid-run, then continues identically',()=>{
  const s=SEEDS[13],map=genMap(s);
  /* take a few winning steps */
  let st=initRoute(s);
  for(let k=0;k<5;k++){
    if(st.phase==='map'){const fr=frontier(st,map);({state:st}=transition(st,map,{type:'commit',nodeId:fr[0],choice:'challenge'}));}
    else if(st.phase==='encounter'){({state:st}=transition(st,map,{type:'fightResult',winner:'a'}));}
    else if(st.phase==='reward'){({state:st}=transition(st,map,{type:'settleReward'}));}
    else if(st.phase==='market'){({state:st}=transition(st,map,{type:'leaveMarket'}));}
    else if(st.phase==='event'){({state:st}=transition(st,map,{type:'resolveEvent'}));}
  }
  const saved=JSON.parse(JSON.stringify(st));
  const map2=genMap(saved.seed);                    /* map regenerates from the seed */
  assert.ok(validRoute(saved,map2),'restored route rejected against a fresh map');
  assert.deepEqual(saved,st);
  /* frontier is identical after a save round-trip */
  assert.deepEqual(frontier(saved,map2),frontier(st,map));
});

test('committing a node that is not on the frontier is refused',()=>{
  const s=SEEDS[15],map=genMap(s);
  const st=initRoute(s);
  const notReachable=map.districts[0].boss.id;      /* boss is not a column-1 choice */
  assert.throws(()=>transition(st,map,{type:'commit',nodeId:notReachable,choice:'challenge'}));
});

test('validRoute rejects corrupt or contradictory saves',()=>{
  const map=genMap(SEEDS[0]);
  const a=map.districts[0].columns[0][0].id;   /* an entrance node */
  const b=map.districts[0].columns[0][1].id;
  const boss=map.districts[0].boss.id;
  const base=initRoute(SEEDS[0]);
  const ok=(s)=>validRoute(Object.assign({},base,s),map);
  /* accepted: a clean map-phase state, and a legitimate gate-camp state */
  assert.ok(ok({path:[a]}),'clean map state');
  assert.ok(ok({path:[a],pendingId:boss,phase:'gateCamp',attempts:{[boss]:1}}),'gate camp');
  /* rejected */
  assert.ok(!validRoute(Object.assign({},base,{path:[a]}),{version:map.version+1,nodes:map.nodes,districts:map.districts}),'map version mismatch');
  assert.ok(!ok({version:base.version+1}),'state version mismatch');
  assert.ok(!ok({path:['nope']}),'path id not in map');
  assert.ok(!ok({path:[a,a]}),'duplicate path node');
  assert.ok(!ok({pendingId:'nope',phase:'encounter'}),'pending id not in map');
  assert.ok(!ok({path:[a],pendingId:a,phase:'encounter'}),'pending equals a completed node');
  assert.ok(!ok({phase:'bogus'}),'unknown phase');
  assert.ok(!ok({phase:'encounter',pendingId:null}),'encounter without a pending node');
  assert.ok(!ok({phase:'map',pendingId:b}),'map phase must not hold a pending node');
  assert.ok(!ok({attempts:{[a]:1}}),'attempts on a non-boss node');
});

test('a driven save survives a full serialize -> restore -> revalidate at each phase',()=>{
  const map=genMap(SEEDS[4]);
  let st=initRoute(SEEDS[4]);
  const seenPhases=new Set();
  let guard=0;
  while(st.phase!=='won'&&st.phase!=='lost'&&guard++<400){
    /* at every phase, a JSON round-trip must revalidate and preserve the state */
    const saved=JSON.parse(JSON.stringify(st));
    assert.ok(validRoute(saved,map),'phase '+st.phase+' revalidates after a round trip');
    assert.deepEqual(saved,st,'phase '+st.phase+' survives the round trip byte for byte');
    seenPhases.add(st.phase);
    if(st.phase==='map'){const fr=frontier(st,map);({state:st}=transition(st,map,{type:'commit',nodeId:fr[0],choice:'challenge'}));}
    else if(st.phase==='encounter'){({state:st}=transition(st,map,{type:'fightResult',winner:'a',survTier:0}));}
    else if(st.phase==='reward'){({state:st}=transition(st,map,{type:'settleReward'}));}
    else if(st.phase==='market'){({state:st}=transition(st,map,{type:'leaveMarket'}));}
    else if(st.phase==='event'){({state:st}=transition(st,map,{type:'resolveEvent'}));}
  }
  assert.equal(st.phase,'won');
  for(const p of ['map','encounter','reward'])assert.ok(seenPhases.has(p),'exercised '+p);
});

test('edge classifier marks walked pairs done, current exits avail, rest future',()=>{
  const map=genMap(SEEDS[0]);
  const D=map.districts[0];
  const a=D.columns[0][0];        /* an entrance node */
  const b=a.next[0];              /* one of its successors */
  /* classifyEdges reads only state.path, so drive it with synthetic paths */
  assert.ok(classifyEdges({path:[]},D).every(e=>e.state==='future'),'fresh district is all future');
  const atA=classifyEdges({path:[a.id]},D).filter(e=>e.from===a.id);
  assert.ok(atA.length>0&&atA.every(e=>e.state==='avail'),'exits of the current node are avail');
  const walked=classifyEdges({path:[a.id,b]},D);
  const pair=walked.find(e=>e.from===a.id&&e.to===b);
  assert.ok(pair&&pair.state==='done','the walked pair is done');
});

test('the current district advances only after each boss falls',()=>{
  const s=SEEDS[17],map=genMap(s);
  let st=initRoute(s),seenDistricts=new Set();
  let guard=0;
  while(st.phase!=='won'&&guard++<400){
    seenDistricts.add(currentDistrict(st,map));
    if(st.phase==='map'){const fr=frontier(st,map);({state:st}=transition(st,map,{type:'commit',nodeId:fr[0],choice:'challenge'}));}
    else if(st.phase==='encounter'){({state:st}=transition(st,map,{type:'fightResult',winner:'a'}));}
    else if(st.phase==='reward'){({state:st}=transition(st,map,{type:'settleReward'}));}
    else if(st.phase==='market'){({state:st}=transition(st,map,{type:'leaveMarket'}));}
    else if(st.phase==='event'){({state:st}=transition(st,map,{type:'resolveEvent'}));}
  }
  assert.deepEqual([...seenDistricts].sort(),[0,1,2,3]);
});
