"use strict";
/* Small local archive for finished playtests. The active run save remains a
   separate transaction. */
export const ROUTE_REPORT_KEY='bb-route-reports';
export const ROUTE_REPORT_LIMIT=10;
export const ROUTE_REPORT_MAX_BYTES=2*1024*1024;

export function readReportArchive(storage){
  if(!storage)return [];
  try{const v=JSON.parse(storage.getItem(ROUTE_REPORT_KEY)||'[]');return Array.isArray(v)?v:[];}catch(e){return [];}
}
function fit(records){
  let out=records.slice(0,ROUTE_REPORT_LIMIT);
  while(out.length&&JSON.stringify(out).length*2>ROUTE_REPORT_MAX_BYTES)out.pop();
  return out;
}
export function saveReport(storage,record){
  if(!storage||!record)return false;
  const rows=readReportArchive(storage).filter(function(r){return r&&r.reportId!==record.reportId;});
  record.archive_saved=true;const next=fit([record].concat(rows));
  if(!next.length||next[0].reportId!==record.reportId){record.archive_saved=false;return false;}
  try{storage.setItem(ROUTE_REPORT_KEY,JSON.stringify(next));return true;}
  catch(e){record.archive_saved=false;return false;}
}
export function updateReport(storage,record){return saveReport(storage,record);}
export function unexportedReports(storage){return readReportArchive(storage).filter(function(r){return r&&!r.exported;});}
export function markReportsExported(storage,ids){
  if(!storage)return false;const wanted=new Set(ids||[]),rows=readReportArchive(storage);
  rows.forEach(function(r){if(r&&wanted.has(r.reportId))r.exported=true;});
  try{storage.setItem(ROUTE_REPORT_KEY,JSON.stringify(rows));return true;}catch(e){return false;}
}
