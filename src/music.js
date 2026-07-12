"use strict";
/* Music player for the Suno tracks. Four loops: title (intro), market
   (draft and lobby), battle (fights), boss (band 4 gates), plus one-shot
   stingers (dawnsting, fanfarewin, forgesting, lament, windstorm). Files
   live in public/music/{name}.mp3, listed in the generated art manifest
   under music-{name}; with no file present every call is a no-op, so this
   ships before any track exists.

   Loading waits for the first tap (the same iOS unlock moment as sfx), then
   fetches and decodes lazily. Loops are crossfaded near the end of each pass
   so an imperfect Suno ending still cycles smoothly. Mute rides the same
   toggle as sfx via musicMute. */
import {ART} from './art-manifest.js';

const XFADE=1.2, VOL=0.32;
let ctx=null, out=null, muted=false, want=null, cur=null, bufs={}, loading={};

export function initMusic(startMuted){
  if(typeof document==='undefined')return;
  muted=!!startMuted;
  const unlock=function(){
    if(ctx)return;
    if(!ART['music-market']&&!ART['music-battle'])return;
    try{
      ctx=new (window.AudioContext||window.webkitAudioContext)();
      out=ctx.createGain();out.gain.value=muted?0:VOL;out.connect(ctx.destination);
      if(ctx.state==='suspended')ctx.resume();
      if(want)playTrack(want);
    }catch(e){ctx=null;}
  };
  document.addEventListener('pointerdown',unlock,{once:true});
  document.addEventListener('touchend',unlock,{once:true});
}

export function musicMute(on){
  muted=!!on;
  if(out)out.gain.linearRampToValueAtTime(muted?0:VOL,ctx.currentTime+.25);
}

async function load(name){
  if(bufs[name])return bufs[name];
  if(loading[name])return loading[name];
  const src=ART['music-'+name];if(!src||!ctx)return null;
  loading[name]=fetch(src).then(function(r){return r.arrayBuffer();})
    .then(function(a){return ctx.decodeAudioData(a);})
    .then(function(b){bufs[name]=b;return b;})
    .catch(function(){return null;});
  return loading[name];
}

/* one looping source per track, faded in. Only one plays at a time, so
   switching tracks can hard-stop the outgoing one and nothing bleeds
   through (the old overlapping-crossfade design leaked market audio into
   fights on iOS, where orphaned sources would not stop). */
function startLoop(buf){
  const t=ctx.currentTime;
  const s=ctx.createBufferSource();s.buffer=buf;s.loop=true;
  const g=ctx.createGain();
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(1,t+XFADE);
  s.connect(g);g.connect(out);s.start(t);
  return {src:s,g:g};
}
function stopCur(){
  if(cur&&cur.pass){
    const p=cur.pass,t=ctx.currentTime;
    p.g.gain.cancelScheduledValues(t);
    p.g.gain.setValueAtTime(p.g.gain.value,t);
    p.g.gain.linearRampToValueAtTime(0,t+XFADE);
    /* hard stop after the fade, and again as a belt-and-braces guard */
    setTimeout(function(){try{p.src.stop();}catch(e){}try{p.src.disconnect();}catch(e){}},XFADE*1000+80);
  }
  cur=null;
}
async function playTrack(name){
  if(!ctx)return;
  const buf=await load(name);
  if(!buf||want!==name)return;
  if(cur&&cur.name===name)return;
  stopCur();
  cur={name:name,pass:startLoop(buf)};
}
export function music(name){
  /* market, battle, title, boss, or null to stop */
  want=name;
  if(!ctx){return;}
  if(!name){stopCur();return;}
  playTrack(name);
}
export function musicNow(){return cur?cur.name:null;}

/* one-shot stingers over the loop: dawnsting, fanfarewin, forgesting,
   lament, windstorm. Fire and forget, a touch louder than the bed, a
   no-op before unlock or with no file. */
const STING_VOL=0.5;
export function sting(name){
  if(!ctx||muted)return;
  load(name).then(function(buf){
    if(!buf||!ctx)return;
    const t=ctx.currentTime;
    const s=ctx.createBufferSource();s.buffer=buf;
    const g=ctx.createGain();
    g.gain.setValueAtTime(STING_VOL,t);
    g.gain.setValueAtTime(STING_VOL,t+buf.duration-0.3);
    g.gain.linearRampToValueAtTime(0,t+buf.duration);
    s.connect(g);g.connect(ctx.destination);s.start(t);
  });
}
