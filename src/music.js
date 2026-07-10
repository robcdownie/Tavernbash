"use strict";
/* Music player for the Suno tracks. Two loops: market (draft and lobby) and
   battle (fights). Tracks live in public/music/{market,battle}.mp3 and are
   listed in the generated art manifest under music-market and music-battle;
   with no files present every call is a no-op, so this ships before the
   tracks exist.

   Loading waits for the first tap (the same iOS unlock moment as sfx), then
   fetches and decodes lazily. Loops are crossfaded near the end of each pass
   so an imperfect Suno ending still cycles smoothly. Mute rides the same
   toggle as sfx via musicMute. */
import {ART} from './art-manifest.js';

const XFADE=2.2, VOL=0.32;
let ctx=null, out=null, muted=false, want=null, cur=null, bufs={}, loading={}, timer=null;

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

function startLoop(buf){
  /* one pass of the buffer with a fade at both ends; reschedules itself
     XFADE seconds before it ends so the next pass overlaps */
  const t=ctx.currentTime;
  const s=ctx.createBufferSource();s.buffer=buf;
  const g=ctx.createGain();
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(1,t+XFADE);
  g.gain.setValueAtTime(1,t+buf.duration-XFADE);
  g.gain.linearRampToValueAtTime(0,t+buf.duration);
  s.connect(g);g.connect(out);s.start(t);
  return {src:s,g:g,until:t+buf.duration};
}
function schedule(name,buf){
  const pass=startLoop(buf);
  cur={name:name,pass:pass};
  const waitMs=Math.max(200,(buf.duration-XFADE)*1000);
  timer=setTimeout(function(){if(cur&&cur.name===name)schedule(name,buf);},waitMs);
}
function stopCur(){
  if(timer){clearTimeout(timer);timer=null;}
  if(cur&&cur.pass){
    const p=cur.pass,t=ctx.currentTime;
    p.g.gain.cancelScheduledValues(t);
    p.g.gain.setValueAtTime(p.g.gain.value,t);
    p.g.gain.linearRampToValueAtTime(0,t+XFADE*.6);
    setTimeout(function(){try{p.src.stop();}catch(e){}},XFADE*700);
  }
  cur=null;
}
async function playTrack(name){
  if(!ctx)return;
  const buf=await load(name);
  if(!buf||want!==name)return;
  if(cur&&cur.name===name)return;
  stopCur();
  schedule(name,buf);
}
export function music(name){
  /* market, battle, or null to stop */
  want=name;
  if(!ctx){return;}
  if(!name){stopCur();return;}
  playTrack(name);
}
export function musicNow(){return cur?cur.name:null;}
