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
