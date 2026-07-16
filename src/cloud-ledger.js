"use strict";
/* Optional Supabase-backed history. Local reports remain the play-time source
   of truth. Cloud work is asynchronous, exact once by account plus report id,
   and never blocks a clear, debrief, new run, or offline session. */
import {readReportArchive,mergeReports} from './route-report-store.js';
import {cloudConfig,validCloudEmail,reportToCloudRow,reportFromCloudRow,
        cloudErrorMessage,CLOUD_REPORT_LIMIT} from './cloud-ledger-core.js';

export const CLOUD_STATE_KEY='bb-cloud-ledger';

const cfg=cloudConfig(import.meta.env||{},
  typeof globalThis!=='undefined'&&globalThis.__TAVERN_CLOUD__||{});
let storageRef=null,client=null,initPromise=null,syncPromise=null,authSub=null;
let syncQueued=false;
const listeners=new Set();
let state={
  configured:cfg.enabled,ready:!cfg.enabled,signedIn:false,userId:null,email:null,
  sharing:false,syncing:false,linkSent:false,lastSyncAt:null,cloudRunCount:0,error:null
};

function copyState(){return Object.assign({},state);}
function emit(){
  const snap=copyState();
  listeners.forEach(function(fn){try{fn(snap);}catch(e){}});
}
function patch(next){state=Object.assign({},state,next);emit();}
function readLocalState(){
  if(!storageRef)return {};
  try{return JSON.parse(storageRef.getItem(CLOUD_STATE_KEY)||'{}')||{};}catch(e){return {};}
}
function writeLocalState(next){
  if(!storageRef)return;
  try{storageRef.setItem(CLOUD_STATE_KEY,JSON.stringify(next));}catch(e){}
}
function rememberSync(at){
  const old=readLocalState();
  writeLocalState(Object.assign({},old,{lastSyncAt:at,userId:state.userId}));
}
function redirectUrl(){
  if(typeof location==='undefined')return undefined;
  return location.origin+location.pathname;
}
function sessionUser(session){return session&&session.user||null;}

async function loadProfile(user){
  const found=await client.from('player_profiles').select('share_balance_data')
    .eq('user_id',user.id).maybeSingle();
  if(found.error)throw found.error;
  if(found.data)return !!found.data.share_balance_data;
  const made=await client.from('player_profiles').upsert(
    {user_id:user.id,share_balance_data:false},{onConflict:'user_id'});
  if(made.error)throw made.error;
  return false;
}

async function acceptSession(session){
  const user=sessionUser(session);
  if(!user){
    patch({ready:true,signedIn:false,userId:null,email:null,sharing:false,
      syncing:false,linkSent:false,cloudRunCount:0,error:null});
    return;
  }
  patch({ready:true,signedIn:true,userId:user.id,email:user.email||null,error:null});
  try{
    const sharing=await loadProfile(user);
    patch({sharing:sharing});
    await syncCloudReports();
  }catch(error){
    patch({error:cloudErrorMessage(error)});
  }
}

export function cloudSnapshot(){return copyState();}
export function onCloudChange(fn){
  if(typeof fn!=='function')return function(){};
  listeners.add(fn);fn(copyState());
  return function(){listeners.delete(fn);};
}

export function initCloudLedger(storage){
  if(initPromise)return initPromise;
  storageRef=storage||null;
  if(!cfg.enabled){patch({ready:true});return Promise.resolve(copyState());}
  initPromise=(async function(){
    try{
      const mod=await import('@supabase/supabase-js');
      client=mod.createClient(cfg.url,cfg.key,{auth:{
        persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,
        storageKey:'bb-cloud-auth'
      }});
      const current=await client.auth.getSession();
      if(current.error)throw current.error;
      await acceptSession(current.data&&current.data.session);
      const sub=client.auth.onAuthStateChange(function(event,session){
        setTimeout(function(){acceptSession(session);},0);
      });
      authSub=sub&&sub.data&&sub.data.subscription||null;
      if(typeof window!=='undefined')window.addEventListener('online',function(){syncCloudReports();});
    }catch(error){
      patch({ready:true,error:cloudErrorMessage(error)});
    }
    return copyState();
  })();
  return initPromise;
}

export async function sendCloudMagicLink(email){
  email=String(email||'').trim();
  if(!validCloudEmail(email))throw new Error('Enter a valid email address.');
  if(!client)throw new Error('Cloud backup is not ready.');
  patch({error:null,linkSent:false});
  const sent=await client.auth.signInWithOtp({email:email,options:{
    emailRedirectTo:redirectUrl(),shouldCreateUser:true
  }});
  if(sent.error){patch({error:cloudErrorMessage(sent.error)});throw sent.error;}
  patch({linkSent:true});
  return true;
}

export async function syncCloudReports(){
  if(syncPromise){syncQueued=true;return syncPromise;}
  if(!client||!storageRef||!state.signedIn||!state.userId)return false;
  syncPromise=(async function(){
    patch({syncing:true,error:null});
    try{
      const local=readReportArchive(storageRef);
      const rows=local.map(function(report){return reportToCloudRow(report,state.userId);}).filter(Boolean);
      for(const row of rows){
        const saved=await client.from('run_reports').upsert(row,{onConflict:'user_id,report_id'});
        if(saved.error)throw saved.error;
      }
      const fetched=await client.from('run_reports').select('report,ended_at')
        .eq('user_id',state.userId).order('ended_at',{ascending:false}).limit(CLOUD_REPORT_LIMIT);
      if(fetched.error)throw fetched.error;
      const reports=(fetched.data||[]).map(reportFromCloudRow).filter(Boolean);
      if(reports.length&&!mergeReports(storageRef,reports))throw new Error('Local history could not accept cloud reports.');
      const at=new Date().toISOString();rememberSync(at);
      patch({syncing:false,lastSyncAt:at,cloudRunCount:reports.length,error:null});
      return true;
    }catch(error){
      patch({syncing:false,error:cloudErrorMessage(error)});
      return false;
    }finally{
      syncPromise=null;
      if(syncQueued){
        syncQueued=false;
        setTimeout(function(){syncCloudReports();},0);
      }
    }
  })();
  return syncPromise;
}

export async function setCloudSharing(enabled){
  if(!client||!state.userId)throw new Error('Sign in before changing balance sharing.');
  const saved=await client.from('player_profiles').upsert(
    {user_id:state.userId,share_balance_data:!!enabled},{onConflict:'user_id'});
  if(saved.error){patch({error:cloudErrorMessage(saved.error)});throw saved.error;}
  patch({sharing:!!enabled,error:null});
  return true;
}

export async function deleteCloudReports(){
  if(!client||!state.userId)throw new Error('Sign in before removing cloud history.');
  const removed=await client.from('run_reports').delete().eq('user_id',state.userId);
  if(removed.error){patch({error:cloudErrorMessage(removed.error)});throw removed.error;}
  patch({cloudRunCount:0,lastSyncAt:null,error:null});
  return true;
}

export async function signOutCloud(){
  if(!client)return false;
  const out=await client.auth.signOut();
  if(out.error){patch({error:cloudErrorMessage(out.error)});throw out.error;}
  if(authSub&&authSub.unsubscribe)authSub.unsubscribe();
  authSub=null;
  await acceptSession(null);
  return true;
}
