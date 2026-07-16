import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PLAYER_HISTORY_SCHEMA,compactRunRecord,emptyHistory,indexHistory,buildHistory,replaySetup} from '../src/route-history.js';

function record(id,endedAt,extra){
  return Object.assign({
    reportId:id,endedAt:endedAt,endedAtIso:new Date(endedAt).toISOString(),
    result:'quick_clear',version:'0.90.0',mapVersion:11,routeMode:'quick',
    lantern:3,seed:77,partial:false,
    setup:{heroId:'kiln',hero:'Kiln-Born',omenId:'wildfire',omen:'Wildfire',
      featured:[{id:'dmg',name:'Weapons'},{id:'burn',name:'Burn'}]},
    progress:{districtId:4,district:'The Dragon Gate',bossesBeaten:4,nodesVisited:12,
      bossRetries:1,resolve:8,resolveMax:40},
    economy:{gold:2,tier:5,
      board:[{id:'dagger',name:'Rusty Dagger',rarity:1,rarityName:'Silver',ench:null,enchantName:null,size:1}],
      vault:[{id:'torch',name:'Ember Torch',rarity:0,rarityName:'Bronze',ench:'swift',enchantName:'Swift',size:1}]},
    timing:{gameplayMs:600000},
    midpointTreasure:{offeredIds:['tidewall']},
    metrics:{wares:{dagger:{},purse:{}},
      snapshots:[{board:[{id:'torch'}],vault:[],context:{monsterId:'sandling'}}],
      events:[{data:{offers:[{id:'hammer'}]}}],
      fights:[{monsterId:'sandling'}]}
  },extra||{});
}

test('compact history rows retain the player-facing run and replay fields',()=>{
  const row=compactRunRecord(record('r1',2000));
  assert.equal(row.reportId,'r1');
  assert.equal(row.routeMode,'quick');
  assert.equal(row.lantern,3);
  assert.equal(row.setup.heroId,'kiln');
  assert.equal(row.setup.omenId,'wildfire');
  assert.deepEqual(row.setup.featured.map(t=>t.id),['dmg','burn']);
  assert.equal(row.timing.gameplayMs,600000);
  assert.equal(row.economy.board[0].id,'dagger');
  assert.equal(row.economy.vault[0].ench,'swift');
  assert.equal(row.metrics,undefined,'full telemetry is not copied into compact recents');
});

test('history indexing is exact once and records lifetime discoveries and best details',()=>{
  const first=record('r1',2000);
  let history=indexHistory(emptyHistory(),first);
  history=indexHistory(history,first);
  assert.equal(history.schema,PLAYER_HISTORY_SCHEMA);
  assert.deepEqual(history.indexedReportIds,['r1']);
  assert.deepEqual(history.totals,{runs:1,clears:1});
  assert.equal(history.discoveries.heroes.kiln.runCount,1);
  assert.equal(history.discoveries.omens.wildfire.runCount,1);
  for(const id of ['dagger','torch','hammer','tidewall'])assert.ok(history.discoveries.wares[id],id+' discovered');
  assert.equal(history.discoveries.wares.purse,undefined,'internal income wares are not player discoveries');
  assert.ok(history.discoveries.monsters.sandling);

  const row=history.byHeroRoute.kiln.quick;
  assert.equal(row.runs,1);
  assert.equal(row.clears,1);
  assert.equal(row.fastestClear.gameplayMs,600000);
  assert.equal(row.bestResolveClear.resolve,8);
  assert.equal(row.furthest.bossesBeaten,4);
  assert.equal(row.highestLantern,undefined,'bb-lantern remains the highest-clear authority');

  history=indexHistory(history,record('r2',3000,{seed:78,lantern:5,
    timing:{gameplayMs:700000},progress:{districtId:4,district:'The Dragon Gate',
      bossesBeaten:4,nodesVisited:13,bossRetries:0,resolve:12,resolveMax:40}}));
  assert.equal(history.byHeroRoute.kiln.quick.fastestClear.reportId,'r2',
    'a higher Lantern outranks a faster lower-level clear');
  assert.equal(history.byHeroRoute.kiln.quick.bestResolveClear.reportId,'r2');
  assert.equal(history.byHeroRoute.kiln.quick.furthest.reportId,'r2');
  history=indexHistory(history,record('r3',4000,{seed:79,lantern:5,
    timing:{gameplayMs:500000},progress:{districtId:4,district:'The Dragon Gate',
      bossesBeaten:4,nodesVisited:12,bossRetries:0,resolve:10,resolveMax:40}}));
  assert.equal(history.byHeroRoute.kiln.quick.fastestClear.reportId,'r3',
    'time breaks ties inside the highest recorded Lantern');
  assert.equal(history.byHeroRoute.kiln.quick.bestResolveClear.reportId,'r2',
    'Resolve breaks ties inside the highest recorded Lantern');
  assert.equal(history.totals.runs,3);
  assert.equal(history.totals.clears,3);
});

test('an unchosen face-up Treasure ware still becomes discovered',()=>{
  const source=record('treasure',2500,{
    metrics:{wares:{},snapshots:[],fights:[],events:[{type:'event_choice',data:{
      kind:'treasure',choice:{kind:'gold'},offers:[
        {kind:'gold'},{kind:'ware',id:'hammer'},{kind:'enchant',ench:'swift'}
      ]
    }}]}
  });
  const history=indexHistory(emptyHistory(),source);
  assert.ok(history.discoveries.wares.hammer);
});

test('partial and zero-duration reports never become speed records',()=>{
  let history=indexHistory(emptyHistory(),record('r1',1000,{partial:true,timing:{gameplayMs:1000}}));
  assert.equal(history.byHeroRoute.kiln.quick.fastestClear,null);
  history=indexHistory(history,record('r2',2000,{timing:{gameplayMs:0}}));
  assert.equal(history.byHeroRoute.kiln.quick.fastestClear,null);
  history=indexHistory(history,record('r3',3000,{timing:{gameplayMs:9000}}));
  assert.equal(history.byHeroRoute.kiln.quick.fastestClear.reportId,'r3');
});

test('building history from newest-first reports keeps the true first discovery',()=>{
  const history=buildHistory([record('new',5000),record('old',1000)]);
  assert.equal(history.totals.runs,2);
  assert.equal(history.discoveries.heroes.kiln.firstSeenAt,1000);
  assert.equal(history.discoveries.heroes.kiln.firstReportId,'old');
  assert.equal(history.byHeroRoute.kiln.quick.lastRun.reportId,'new');
});

test('replay setup validates catalogs and carries the recorded setup tuple',()=>{
  const source=record('r1',2000,{lantern:99,seed:0xffffffff});
  assert.deepEqual(replaySetup(source),{
    seed:0xffffffff,mode:'quick',lantern:10,heroId:'kiln',omenId:'wildfire',
    tags:['dmg','burn'],sourceVersion:'0.90.0',sourceMapVersion:11
  });
  assert.deepEqual(replaySetup(compactRunRecord(source)),replaySetup(source),
    'compact recent rows remain replayable');
  assert.equal(replaySetup(record('bad-mode',1,{routeMode:'other'})),null);
  assert.equal(replaySetup(record('bad-hero',1,{setup:{heroId:'gone',omenId:'wildfire',featured:[]}})),null);
  assert.equal(replaySetup(record('bad-seed',1,{seed:-1})),null);
});

test('malformed legacy collection fields fail soft during migration',()=>{
  const legacy=record('legacy',5000,{
    setup:{heroId:'kiln',hero:'Kiln-Born',omenId:'wildfire',omen:'Wildfire',featured:{}},
    economy:{gold:1,tier:2,board:'not a board',vault:{}},
    midpointTreasure:{offeredIds:'not offers'},
    metrics:{wares:{dagger:{}},snapshots:{},events:'not events',fights:null}
  });
  const row=compactRunRecord(legacy);
  assert.deepEqual(row.setup.featured,[]);
  assert.deepEqual(row.economy.board,[]);
  assert.deepEqual(row.economy.vault,[]);
  assert.deepEqual(replaySetup(legacy).tags,[]);
  const history=indexHistory(emptyHistory(),legacy);
  assert.equal(history.totals.runs,1);
  assert.ok(history.discoveries.wares.dagger);
});
