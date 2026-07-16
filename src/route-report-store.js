"use strict";
/* Local archive for finished runs. Full telemetry, compact player-facing
   recents, and lifetime mastery share one versioned storage transaction. The
   active run save remains separate. */
import {PLAYER_HISTORY_SCHEMA,compactRunRecord,buildHistory,indexHistory,normalizeHistory} from './route-history.js';

export const ROUTE_REPORT_KEY='bb-route-reports';
export const ROUTE_REPORT_LIMIT=10;
export const ROUTE_HISTORY_RECENT_LIMIT=50;
export const ROUTE_REPORT_MAX_BYTES=2*1024*1024;
export const ROUTE_REPORT_ARCHIVE_SCHEMA='tavern-bash-report-archive/2';

function validRows(rows){
  return (Array.isArray(rows)?rows:[]).filter(function(r){return r&&typeof r.reportId==='string';});
}
function dedupe(rows){
  const seen=new Set();
  return validRows(rows).filter(function(r){
    if(seen.has(r.reportId))return false;seen.add(r.reportId);return true;
  });
}
function newest(rows){
  return dedupe(rows).sort(function(a,b){
    const ae=Number.isFinite(a.endedAt)?a.endedAt:0,be=Number.isFinite(b.endedAt)?b.endedAt:0;
    return be-ae||(a.reportId<b.reportId?1:-1);
  });
}
function stateFromRaw(raw){
  if(Array.isArray(raw)){
    const all=newest(raw);
    return {reports:all.slice(0,ROUTE_REPORT_LIMIT),
      recent:all.map(compactRunRecord).filter(Boolean).slice(0,ROUTE_HISTORY_RECENT_LIMIT),
      history:buildHistory(all)};
  }
  if(!raw||raw.schema!==ROUTE_REPORT_ARCHIVE_SCHEMA)return {reports:[],recent:[],history:buildHistory([])};
  const reports=newest(raw.reports).slice(0,ROUTE_REPORT_LIMIT);
  let recent=newest(raw.recent).slice(0,ROUTE_HISTORY_RECENT_LIMIT);
  if(!recent.length)recent=reports.map(compactRunRecord).filter(Boolean);
  let history=raw.history&&raw.history.schema===PLAYER_HISTORY_SCHEMA
    ?normalizeHistory(raw.history):buildHistory(reports);
  reports.slice().reverse().forEach(function(record){history=indexHistory(history,record);});
  return {reports:reports,recent:recent,history:history};
}
function envelope(state){
  return {schema:ROUTE_REPORT_ARCHIVE_SCHEMA,
    reports:newest(state.reports).slice(0,ROUTE_REPORT_LIMIT),
    recent:newest(state.recent).slice(0,ROUTE_HISTORY_RECENT_LIMIT),
    history:normalizeHistory(state.history)};
}
function fitEnvelope(state){
  const out=envelope(state);
  const bytes=function(){return JSON.stringify(out).length*2;};
  while(bytes()>ROUTE_REPORT_MAX_BYTES&&out.reports.length>1)out.reports.pop();
  while(bytes()>ROUTE_REPORT_MAX_BYTES&&out.recent.length>1)out.recent.pop();
  return bytes()<=ROUTE_REPORT_MAX_BYTES?out:null;
}
function readRaw(storage){
  if(!storage)return null;
  try{return JSON.parse(storage.getItem(ROUTE_REPORT_KEY)||'null');}catch(e){return null;}
}
function writeState(storage,state){
  if(!storage)return false;
  const out=fitEnvelope(state);if(!out)return false;
  try{storage.setItem(ROUTE_REPORT_KEY,JSON.stringify(out));return true;}catch(e){return false;}
}

export function readReportState(storage){
  return stateFromRaw(readRaw(storage));
}
export function readReportArchive(storage){
  return readReportState(storage).reports;
}
export function saveReport(storage,record){
  if(!storage||!record||typeof record.reportId!=='string')return false;
  const state=readReportState(storage),compact=compactRunRecord(record);
  if(!compact)return false;
  record.archive_saved=true;
  state.reports=[record].concat(state.reports.filter(function(r){return r.reportId!==record.reportId;}));
  state.recent=[compact].concat(state.recent.filter(function(r){return r.reportId!==record.reportId;}));
  state.history=indexHistory(state.history,record);
  if(writeState(storage,state))return true;
  record.archive_saved=false;return false;
}
export function updateReport(storage,record){return saveReport(storage,record);}
export function unexportedReports(storage){
  return readReportArchive(storage).filter(function(r){return r&&!r.exported;});
}
export function markReportsExported(storage,ids){
  if(!storage)return false;
  const wanted=new Set(ids||[]),state=readReportState(storage);
  state.reports.forEach(function(r){if(wanted.has(r.reportId))r.exported=true;});
  state.recent.forEach(function(r){if(wanted.has(r.reportId))r.exported=true;});
  return writeState(storage,state);
}
