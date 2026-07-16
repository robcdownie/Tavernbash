"use strict";
/* Read-only Cloud Ledger client for Codex balance reviews.
   The analytics account is authenticated, but database policy grants it only
   SELECT access to reports whose owners opted into balance sharing. */
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createClient} from '@supabase/supabase-js';

function loadEnvFile(path){
  if(!existsSync(path))return;
  readFileSync(path,'utf8').split(/\r?\n/).forEach(function(line){
    const clean=line.trim();
    if(!clean||clean.startsWith('#'))return;
    const i=clean.indexOf('=');if(i<1)return;
    const key=clean.slice(0,i).trim();
    let value=clean.slice(i+1).trim();
    if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'"))){
      value=value.slice(1,-1);
    }
    if(process.env[key]==null)process.env[key]=value;
  });
}
loadEnvFile(resolve(process.cwd(),'.env.analytics'));

function argsOf(list){
  const out={last:20,json:false,full:false};
  for(let i=0;i<list.length;i++){
    const a=list[i];
    if(a==='--json')out.json=true;
    else if(a==='--full')out.full=true;
    else if(a.startsWith('--')){
      const key=a.slice(2);const value=list[i+1];
      if(value==null||value.startsWith('--'))throw new Error('Missing value for '+a);
      out[key]=value;i++;
    }
  }
  out.last=Math.max(1,Math.min(500,parseInt(out.last,10)||20));
  return out;
}
function need(name){
  const value=process.env[name];
  if(!value)throw new Error('Missing '+name+' in .env.analytics');
  return value;
}
function clearResult(result){
  return result==='win'||result==='quick_clear'||result==='long_clear'
    ||(typeof result==='string'&&result.includes('_clear'));
}
function pct(n,d){return d?((n/d)*100).toFixed(1)+'%':'n/a';}
function minutes(ms){return Number.isFinite(ms)?(ms/60000).toFixed(1):'?';}
function table(rows){
  const clears=rows.filter(function(r){return clearResult(r.result);}).length;
  console.log('Cloud Ledger: '+rows.length+' runs, '+clears+' clears, '+pct(clears,rows.length)+' clear rate');
  console.log('ended       version  road   L  result       hero         omen         min  resolve');
  rows.forEach(function(r){
    const fields=[
      String(r.ended_at||'').slice(0,10).padEnd(11),
      String(r.game_version||'?').padEnd(8),
      String(r.route_mode||'?').padEnd(6),
      String(r.lantern??0).padEnd(2),
      String(r.result||'?').padEnd(12),
      String(r.hero_id||'?').padEnd(12),
      String(r.omen_id||'?').padEnd(12),
      minutes(r.gameplay_ms).padStart(5),
      String(r.resolve_end??'?').padStart(7)
    ];
    console.log(fields.join(' '));
  });
}

async function main(){
  const opt=argsOf(process.argv.slice(2));
  const supabase=createClient(need('SUPABASE_URL'),need('SUPABASE_PUBLISHABLE_KEY'),{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
  });
  const login=await supabase.auth.signInWithPassword({
    email:need('TAVERN_ANALYTICS_EMAIL'),
    password:need('TAVERN_ANALYTICS_PASSWORD')
  });
  if(login.error)throw login.error;

  const fields=opt.full
    ?'user_id,report_id,game_version,map_version,route_mode,lantern,result,hero_id,omen_id,seed,ended_at,gameplay_ms,resolve_end,bosses_beaten,report'
    :'user_id,report_id,game_version,map_version,route_mode,lantern,result,hero_id,omen_id,seed,ended_at,gameplay_ms,resolve_end,bosses_beaten';
  let query=supabase.from('run_reports').select(fields).order('ended_at',{ascending:false}).limit(opt.last);
  if(opt.version)query=query.eq('game_version',opt.version);
  if(opt.route)query=query.eq('route_mode',opt.route);
  if(opt.lantern!=null)query=query.eq('lantern',parseInt(opt.lantern,10));
  if(opt.hero)query=query.eq('hero_id',opt.hero);
  if(opt.omen)query=query.eq('omen_id',opt.omen);
  if(opt.result)query=query.eq('result',opt.result);
  if(opt.since)query=query.gte('ended_at',new Date(opt.since).toISOString());
  const response=await query;
  if(response.error)throw response.error;
  const rows=response.data||[];
  if(opt.json||opt.full)console.log(JSON.stringify(rows,null,2));
  else table(rows);
  await supabase.auth.signOut();
}

main().catch(function(error){
  console.error('Cloud Ledger query failed: '+(error&&error.message||error));
  process.exitCode=1;
});
