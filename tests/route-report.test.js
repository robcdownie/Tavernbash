import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newRun} from '../src/route-run.js';
import {genMap} from '../src/map.js';
import {buildRunRecord,formatRunSummary,formatRunFullData,RUN_REPORT_SCHEMA} from '../src/route-report.js';
import {saveReport,readReportArchive,unexportedReports,markReportsExported,ROUTE_REPORT_LIMIT} from '../src/route-report-store.js';

function storage(){const m={};return {getItem:k=>m[k]||null,setItem:(k,v)=>{m[k]=String(v);},removeItem:k=>delete m[k]};}
function report(seed,endedAt){const run=newRun({seed:seed,routeMode:'quick',now:1000});run.economy.board=[{iid:1,id:'dagger',rarity:1,size:1,ench:null}];
  return buildRunRecord({run:run,map:genMap(seed),setup:{hero:'kiln',anom:'wild',tags:['dmg','burn']},result:'loss',version:'0.82.0',endedAt:endedAt});}

test('run report has one parseable full record and a readable YAML summary',()=>{
  const r=report(9,5000),full=JSON.parse(formatRunFullData(r)),summary=formatRunSummary(r);
  assert.equal(full.schema,RUN_REPORT_SCHEMA);
  assert.equal(full.economy.board[0].iid,1);
  assert.match(summary,/active_minutes:/);
  assert.match(summary,/Final board: Silver Rusty Dagger/);
});

test('midpoint Treasure report is derived from its receipt without telemetry events',()=>{
  const run=newRun({seed:27,routeMode:'long',now:1000});
  const key=run.runId+':midpoint:d3boss';
  run.receipts[key]={kind:'midpointTreasure',fixedApplied:true,choiceRequired:true,choiceApplied:true,
    choiceKind:'midpointTreasure',offeredIds:['serpentcrown','tidewall','prism'],selectedId:'tidewall',
    fallbackGold:10,fallbackApplied:false};
  const r=buildRunRecord({run:run,map:genMap(27,'long'),setup:{hero:'kiln',anom:'wild',tags:['burn']},
    result:'long_clear',version:'0.84.0',endedAt:5000});
  assert.deepEqual(r.midpointTreasure.offeredIds,['serpentcrown','tidewall','prism']);
  assert.equal(r.midpointTreasure.selected.name,'Tide Wall');
  assert.equal(r.midpointTreasure.fallbackApplied,false);
  assert.match(formatRunSummary(r),/Midpoint Treasure selected: Tide Wall/);
});

test('midpoint Treasure fallback is explicit in the full record and summary',()=>{
  const run=newRun({seed:28,routeMode:'long',now:1000});
  const key=run.runId+':midpoint:d3boss';
  run.receipts[key]={kind:'midpointTreasure',fixedApplied:true,choiceRequired:false,choiceApplied:true,
    choiceKind:'midpointTreasure',offeredIds:[],selectedId:null,fallbackGold:10,fallbackApplied:true};
  const r=buildRunRecord({run:run,map:genMap(28,'long'),setup:{hero:'kiln',anom:'wild',tags:['burn']},
    result:'loss',version:'0.84.0',endedAt:5000});
  assert.deepEqual(r.midpointTreasure.offered,[]);
  assert.equal(r.midpointTreasure.fallbackGold,10);
  assert.match(formatRunSummary(r),/Midpoint Treasure fallback: 10 gold/);
});

test('report archive upserts, keeps ten, and marks only confirmed ids exported',()=>{
  const s=storage();const first=report(1,1001);
  assert.ok(saveReport(s,first));assert.equal(first.archive_saved,true);
  first.debrief.note='updated';assert.ok(saveReport(s,first));assert.equal(readReportArchive(s).length,1,'same id upserts');
  for(let i=2;i<15;i++)saveReport(s,report(i,1000+i));
  assert.equal(readReportArchive(s).length,ROUTE_REPORT_LIMIT);
  const ids=unexportedReports(s).slice(0,2).map(r=>r.reportId);
  assert.ok(markReportsExported(s,ids));
  assert.equal(unexportedReports(s).length,ROUTE_REPORT_LIMIT-2);
});

test('archive failures return false and preserve immediate report data',()=>{
  const bad={getItem:()=>null,setItem:()=>{throw new Error('quota');}};const r=report(2,2000);
  assert.equal(saveReport(bad,r),false);assert.equal(r.archive_saved,false);
  assert.equal(JSON.parse(formatRunFullData(r)).seed,2);
});
