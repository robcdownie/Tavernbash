"use strict";
/* Phase 4: sound. Everything is synthesized with raw WebAudio, no audio
   files. The context is created and resumed on the first tap (the iOS
   standalone unlock pattern); until then every call is a silent no-op.
   The mute toggle persists in localStorage under bb-mute. */

let ctx=null, master=null, muted=false, rumbleG=null, last={};

function store(){try{return window.localStorage;}catch(e){return null;}}
export function sfxMuted(){return muted;}
export function sfxToggle(){
  muted=!muted;
  const s=store();if(s){try{s.setItem('bb-mute',muted?'1':'0');}catch(e){}}
  if(master)master.gain.value=muted?0:.22;
  return muted;
}
export function initSfx(){
  if(typeof document==='undefined')return;
  const s=store();muted=!!(s&&s.getItem('bb-mute')==='1');
  const unlock=function(){
    if(ctx)return;
    try{
      ctx=new (window.AudioContext||window.webkitAudioContext)();
      master=ctx.createGain();master.gain.value=muted?0:.22;master.connect(ctx.destination);
      if(ctx.state==='suspended')ctx.resume();
    }catch(e){ctx=null;}
  };
  document.addEventListener('pointerdown',unlock,{once:true});
  document.addEventListener('touchend',unlock,{once:true});
}

/* ---- tiny synth helpers ---- */
function ok(name,gap){
  if(!ctx||muted)return false;
  const t=ctx.currentTime;
  if(last[name]&&t-last[name]<(gap||.03))return false;
  last[name]=t;return true;
}
function env(g,t,a,peak,d){
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(peak,t+a);
  g.gain.exponentialRampToValueAtTime(.0001,t+a+d);
}
function tone(type,f0,f1,t,a,peak,d,dest){
  const o=ctx.createOscillator(),g=ctx.createGain();
  o.type=type;o.frequency.setValueAtTime(f0,t);
  if(f1&&f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,t+a+d);
  env(g,t,a,peak,d);
  o.connect(g);g.connect(dest||master);
  o.start(t);o.stop(t+a+d+.05);
}
function noiseBuf(){
  const b=ctx.createBuffer(1,ctx.sampleRate*1.2,ctx.sampleRate);
  const d=b.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  return b;
}
function noise(t,a,peak,d,fType,f0,f1){
  const src=ctx.createBufferSource();src.buffer=noiseBuf();
  const f=ctx.createBiquadFilter();f.type=fType;f.frequency.setValueAtTime(f0,t);
  if(f1&&f1!==f0)f.frequency.exponentialRampToValueAtTime(f1,t+a+d);
  const g=ctx.createGain();env(g,t,a,peak,d);
  src.connect(f);f.connect(g);g.connect(master);
  src.start(t);src.stop(t+a+d+.05);
}

/* ---- the effects ---- */
export function sHit(amt){
  if(!ok('hit'))return;
  const t=ctx.currentTime, big=amt>=25, med=amt>=10;
  noise(t,.004,big?.8:med?.55:.35,big?.16:.1,'bandpass',big?380:med?700:1200);
  tone('sine',big?150:med?190:240,big?55:med?75:95,t,.004,big?.7:.45,big?.17:.11);
}
export function sTick(){
  if(!ok('tick',.06))return;
  tone('square',1050,900,ctx.currentTime,.002,.12,.028);
}
export function sDestroy(){
  if(!ok('destroy'))return;
  const t=ctx.currentTime;
  noise(t,.005,.75,.22,'lowpass',900,200);
  tone('sawtooth',220,55,t,.005,.4,.2);
}
export function sForge(){
  if(!ok('forge',.2))return;
  const t=ctx.currentTime;
  [660,880,1320].forEach(function(f,i){tone('triangle',f,f*1.01,t+i*.07,.006,.5,.34);});
  noise(t,.004,.3,.12,'highpass',3000);
}
export function sCoin(){
  if(!ok('coin',.05))return;
  const t=ctx.currentTime;
  tone('triangle',2093,2093,t,.002,.4,.09);
  tone('triangle',2637,2637,t+.012,.002,.28,.08);
}
export function sFanfare(){
  if(!ok('fanfare',.3))return;
  const t=ctx.currentTime;
  [523,659,784].forEach(function(f,i){tone('square',f,f,t+i*.09,.008,.3,.22);});
}
export function sWin(){
  if(!ok('sting',.4))return;
  const t=ctx.currentTime;
  [392,523,659,784].forEach(function(f,i){tone('triangle',f,f,t+i*.1,.008,.45,.4);});
}
export function sLose(){
  if(!ok('sting',.4))return;
  const t=ctx.currentTime;
  tone('sawtooth',330,165,t,.02,.35,.7);
  tone('sine',110,82,t+.05,.02,.4,.8);
}
export function sCreak(){
  if(!ok('creak',.3))return;
  const t=ctx.currentTime;
  tone('sawtooth',92,68,t,.05,.3,.4);
  noise(t+.03,.03,.16,.3,'lowpass',420,240);
}
export function sStorm(on){
  if(!ctx)return;
  const t=ctx.currentTime;
  if(on&&!rumbleG){
    const src=ctx.createBufferSource();src.buffer=noiseBuf();src.loop=true;
    const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=150;
    rumbleG=ctx.createGain();rumbleG.gain.setValueAtTime(0,t);
    rumbleG.gain.linearRampToValueAtTime(muted?0:.5,t+1.2);
    src.connect(f);f.connect(rumbleG);rumbleG.connect(master);
    src.start(t);rumbleG._src=src;
  }else if(!on&&rumbleG){
    const g=rumbleG,src=g._src;rumbleG=null;
    g.gain.linearRampToValueAtTime(0,t+.9);
    setTimeout(function(){try{src.stop();}catch(e){}},1100);
  }
}
