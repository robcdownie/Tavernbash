import {test} from 'node:test';
import assert from 'node:assert/strict';
import {genMap} from '../src/map.js';
import {initRoute,transition,frontier,fightSeed,lossDamage,validRoute,BASE_GOLD,currentDistrict,classifyEdges} from '../src/route.js';
import {MONCHIP,DISTRICTS} from '../src/data.js';

const SEEDS=[];
for(let i=0;i<60;i++)SEEDS.push(((i*40503+7)^0x9e3779b9)>>>0);

/* drive a run with a policy. policy.map returns an action for a map-phase turn (or
   'stop'); policy.fight returns 'a'/'b'; policy.gate returns a gate-camp action. */
function run(seed,policy){
  const map=genMap(seed);
  let st=initRoute(seed);
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

test('a flawless run visits 21 nodes, beats all four bosses, keeps full Resolve',()=>{
  for(const s of SEEDS){
    const {state,map}=run(s,{fight:()=>'a'});
    assert.equal(state.phase,'won','seed '+s+' did not win');
    assert.equal(state.path.length,21,'seed '+s+' visited '+state.path.length);
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
