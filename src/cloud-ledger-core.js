"use strict";
/* Pure Cloud Ledger codecs. Browser auth and network IO stay in
   cloud-ledger.js; these transforms are shared by tests and query tooling. */

export const CLOUD_REPORT_LIMIT=50;

function finite(v,fallback){return Number.isFinite(v)?v:fallback;}
function text(v,fallback){return typeof v==='string'&&v?v:fallback;}
function iso(record){
  if(record&&typeof record.endedAtIso==='string')return record.endedAtIso;
  const n=finite(record&&record.endedAt,0);
  return n?new Date(n).toISOString():new Date(0).toISOString();
}
function clone(v){return JSON.parse(JSON.stringify(v));}

export function cloudConfig(env,injected){
  env=env||{};injected=injected||{};
  const url=text(injected.url,text(env.VITE_SUPABASE_URL,'')).trim();
  const key=text(injected.key,text(env.VITE_SUPABASE_PUBLISHABLE_KEY,'')).trim();
  return {url:url,key:key,enabled:!!(url&&key)};
}

export function validCloudEmail(value){
  const s=String(value||'').trim();
  return s.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export function reportToCloudRow(record,userId){
  if(!record||typeof record.reportId!=='string'||!record.reportId||!userId)return null;
  const setup=record.setup||{},progress=record.progress||{},timing=record.timing||{};
  return {
    user_id:userId,
    report_id:record.reportId,
    game_version:text(record.version,'unknown'),
    map_version:finite(record.mapVersion,null),
    route_mode:record.routeMode==='long'?'long':'quick',
    lantern:Math.max(0,Math.min(10,Math.floor(finite(record.lantern,0)))),
    result:text(record.result,'loss'),
    hero_id:text(setup.heroId,null),
    omen_id:text(setup.omenId,null),
    seed:Number.isInteger(record.seed)?record.seed>>>0:null,
    ended_at:iso(record),
    gameplay_ms:Math.max(0,finite(timing.gameplayMs,0)),
    resolve_end:Math.max(0,finite(progress.resolve,0)),
    bosses_beaten:Math.max(0,finite(progress.bossesBeaten,0)),
    report:clone(record)
  };
}

export function reportFromCloudRow(row){
  const report=row&&row.report;
  if(!report||typeof report.reportId!=='string')return null;
  return clone(report);
}

export function cloudErrorMessage(error){
  const raw=error&&(error.message||error.error_description||error.details);
  if(!raw)return 'Cloud backup could not connect.';
  const s=String(raw).replace(/\s+/g,' ').trim();
  if(/invalid login credentials/i.test(s))return 'The private analytics login was refused.';
  if(/email rate limit/i.test(s))return 'Too many sign-in emails were requested. Try again shortly.';
  if(/failed to fetch|network|load failed/i.test(s))return 'Cloud backup is offline. Local history is safe.';
  return s.slice(0,180);
}
