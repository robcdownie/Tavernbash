import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ITEMS} from '../src/data.js';
import {
  wareUnlocked, readUnlockProfile, settleUnlocks, settleWildFinds,
  WILD_FIND_EVENT, omenUnlocked
} from '../src/unlock-profile.js';

/* an injected localStorage stand-in */
function fakeStore(seed){
  const m=new Map(Object.entries(seed||{}));
  return {getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,String(v)), removeItem:k=>m.delete(k), _m:m};
}
/* a minimal finished run record shaped like route-report.js buildRunRecord */
function rec(over){
  return Object.assign({
    reportId:'r'+Math.random(), result:'loss', routeMode:'quick', lantern:0,
    setup:{heroId:'kiln'}, progress:{districtId:1,bossesBeaten:0},
    economy:{tier:1,board:[],vault:[]},
    metrics:{events:[],fights:[],wares:{}}
  }, over||{});
}
const grant=id=>({type:WILD_FIND_EVENT,data:{id}});

/* sanity: the ids the possession tests lean on really are uniques */
for(const id of ['serpentcrown','tidewall','viperverdict','cinderhook','brassreclaimer']){
  test('fixture unique exists: '+id,()=>{assert.ok(ITEMS[id]&&ITEMS[id].unique,id+' must be a unique ware');});
}

test('an offered-but-untaken treasure ware does NOT unlock',()=>{
  const s=fakeStore();
  const r=rec({metrics:{events:[
    {type:'event_choice',data:{kind:'treasure',offers:[{kind:'ware',id:'viperverdict'},{kind:'ware',id:'cinderhook'}],choice:{kind:'gold'}}},
    {type:'midpoint_treasure_offered',data:{options:['brassreclaimer','viperverdict']}}
  ],fights:[],wares:{}}});
  const got=settleWildFinds(s,r);
  assert.deepEqual(got,[],'a face-up option merely offered records nothing');
  assert.equal(wareUnlocked(s,'viperverdict'),false);
  assert.equal(wareUnlocked(s,'cinderhook'),false);
  assert.equal(wareUnlocked(s,'brassreclaimer'),false);
});

test('a free shelf card left unbought does NOT unlock',()=>{
  const s=fakeStore();
  /* an exposure with no buy, free take, or fight is not possession */
  const r=rec({metrics:{events:[],fights:[],wares:{cinderhook:{exposures:3,buys:0,freeTakes:0,fights:0}}}});
  assert.deepEqual(settleWildFinds(s,r),[]);
  assert.equal(wareUnlocked(s,'cinderhook'),false);
});

test('a chosen treasure ware parked as a free offer at run end DOES unlock via the grant event',()=>{
  const s=fakeStore();
  /* never bought (no board/vault, no buys), only the grant-time wild_find event */
  const r=rec({metrics:{events:[grant('viperverdict')],fights:[],wares:{viperverdict:{exposures:1,buys:0,freeTakes:0,fights:0}}}});
  const got=settleWildFinds(s,r);
  assert.deepEqual(got,[{kind:'wares',id:'viperverdict'}],'the grant event credits the parked pick');
  assert.ok(wareUnlocked(s,'viperverdict'));
});

test('board, vault, and fought wares unlock',()=>{
  const s=fakeStore();
  const r=rec({
    economy:{tier:1,board:[{id:'serpentcrown'}],vault:[{id:'tidewall'}]},
    metrics:{events:[],fights:[],wares:{viperverdict:{exposures:0,buys:0,freeTakes:0,fights:1}}}
  });
  const got=settleWildFinds(s,r).map(u=>u.id).sort();
  assert.deepEqual(got,['serpentcrown','tidewall','viperverdict'].sort());
  assert.ok(wareUnlocked(s,'serpentcrown')&&wareUnlocked(s,'tidewall')&&wareUnlocked(s,'viperverdict'));
});

test('a bought free take unlocks; a non-unique granted id never records',()=>{
  const s=fakeStore();
  /* a bounty grant of a starter dagger fires a wild_find event too, but only
     uniques are extracted, so the starter is never pushed into the profile */
  const r=rec({metrics:{events:[grant('dagger'),grant('serpentcrown')],fights:[],wares:{serpentcrown:{buys:1}}}});
  const got=settleWildFinds(s,r);
  assert.deepEqual(got,[{kind:'wares',id:'serpentcrown'}]);
  assert.equal(readUnlockProfile(s).wares.indexOf('dagger'),-1,'a non-unique grant is not catalogued');
});

test('wild-find settlement is monotonic across a won-run resume',()=>{
  const s=fakeStore();
  const r=rec({metrics:{events:[grant('cinderhook')],fights:[],wares:{}}});
  assert.deepEqual(settleWildFinds(s,r),[{kind:'wares',id:'cinderhook'}]);
  assert.deepEqual(settleWildFinds(s,r),[],'re-settling the same find unlocks nothing again');
  assert.equal(readUnlockProfile(s).wares.filter(x=>x==='cinderhook').length,1,'no duplicate');
});

test('the third-merchant clear settles in-run, after the lantern write ordering',()=>{
  /* settleUnlocks increments its own clearsByHero from this record first, so the
     run whose own clear is the third distinct merchant fires Silent Bazaar in the
     same settle call. The seam runs this AFTER the Lantern write, but the trigger
     reads only the settlement-internal counter, so it needs no lantern read. */
  const s=fakeStore();
  settleUnlocks(s,rec({reportId:'m1',result:'quick_clear',setup:{heroId:'kiln'}}));
  settleUnlocks(s,rec({reportId:'m2',result:'quick_clear',setup:{heroId:'knife'}}));
  assert.equal(omenUnlocked(s,'silent'),false,'two merchants is not enough');
  const got=settleUnlocks(s,rec({reportId:'m3',result:'quick_clear',setup:{heroId:'apoth'}}));
  assert.ok(got.some(u=>u.id==='silent'),'the third distinct-merchant clear unlocks Silent Bazaar in-run');
});

test('settlement runs even when the report archive write throws',()=>{
  /* the run report and bb-unlocks are separate keys. A storage that refuses every
     write except bb-unlocks stands in for a full or blocked report archive: both
     settlement paths must still record into bb-unlocks. */
  const backing=new Map();
  const s={
    getItem:k=>backing.has(k)?backing.get(k):null,
    setItem:(k,v)=>{if(k!=='bb-unlocks')throw new Error('archive full');backing.set(k,String(v));},
    removeItem:k=>backing.delete(k)
  };
  const r=rec({reportId:'x1',metrics:{events:[grant('serpentcrown')],fights:[],wares:{}}});
  const trig=settleUnlocks(s,r);
  const wild=settleWildFinds(s,r);
  assert.ok(trig.some(u=>u.id==='rapid'),'first night still unlocks Rapid Trade');
  assert.deepEqual(wild,[{kind:'wares',id:'serpentcrown'}],'the wild find still records');
  assert.ok(omenUnlocked(s,'rapid')&&wareUnlocked(s,'serpentcrown'));
});
