"use strict";
/* Phase 3: one transparent Pixi canvas layered over the DOM. Hit sparks
   scaled by damage, ambient ember drift, horizontal sand streaks during the
   storm, a forge burst on fusion, coin rain on victories, and a flash on
   hits of 40 or more. Layout, cards, and text stay in the DOM.

   Pixi is imported dynamically so it ships as its own chunk and loads after
   first paint. Every public function is a safe no-op until init succeeds,
   and init refuses to run under prefers-reduced-motion or without WebGL,
   in which case the DOM ember fallback stays. */

let app=null, mk=null, parts=[], stormLive=false, emberT=0, sandT=0;

const PAL={spark:0xf4cf7c, ember:0xe0863a, sand:0xd8b57a, coin:0xd8a24a, coinHi:0xffe2a0, flash:0xffd98a, forge:0xf4cf7c, forgeCore:0xffffff};

export function fxActive(){return !!app;}

export async function initFx(){
  if(typeof document==='undefined')return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let PIXI;
  try{PIXI=await import('pixi.js');}catch(err){return;}
  try{
    const a=new PIXI.Application();
    await a.init({backgroundAlpha:0,resizeTo:window,antialias:false,autoDensity:true,resolution:Math.min(2,window.devicePixelRatio||1)});
    a.canvas.style.cssText='position:fixed;inset:0;z-index:55;pointer-events:none;';
    document.body.appendChild(a.canvas);
    const dot=a.renderer.generateTexture(new PIXI.Graphics().circle(0,0,5).fill({color:0xffffff}));
    const soft=a.renderer.generateTexture(new PIXI.Graphics().circle(0,0,32).fill({color:0xffffff,alpha:.5}).circle(0,0,18).fill({color:0xffffff,alpha:.8}));
    const streak=a.renderer.generateTexture(new PIXI.Graphics().roundRect(0,0,46,2.5,1.2).fill({color:0xffffff}));
    mk=function(tex,x,y,tint){const s=new PIXI.Sprite(tex==='dot'?dot:tex==='soft'?soft:streak);s.anchor.set(.5);s.position.set(x,y);s.tint=tint;a.stage.addChild(s);return s;};
    a.ticker.add(function(t){tick(t.deltaMS);});
    app=a;
    const de=document.getElementById('embers');if(de){de.style.display='none';}
  }catch(err){app=null;}
}

function push(s,p){p.s=s;parts.push(p);}
function tick(dt){
  const d=dt/1000, H=window.innerHeight, W=window.innerWidth;
  emberT-=dt;
  if(emberT<=0){emberT=520+Math.random()*640;ember(W,H);}
  if(stormLive){sandT-=dt;if(sandT<=0){sandT=26;sand(W,H);}}
  for(let i=parts.length-1;i>=0;i--){
    const p=parts[i];
    p.life-=dt;
    if(p.life<=0){p.s.destroy();parts.splice(i,1);continue;}
    p.vy+=(p.g||0)*d;
    p.s.x+=p.vx*d;p.s.y+=p.vy*d;
    const f=p.life/p.max;
    p.s.alpha=(p.fadeIn&&f>.85)?(1-f)*6.6:Math.min(1,f*(p.aBoost||1.4));
    if(p.shrink)p.s.scale.set(p.s.scale.x*(1-1.6*d));
    if(p.grow)p.s.scale.set(p.s.scale.x+p.grow*d);
    if(p.rot)p.s.rotation+=p.rot*d;
  }
}

function ember(W,H){
  const s=mk('dot',Math.random()*W,H+8,PAL.ember);
  s.scale.set(.28+Math.random()*.4);s.alpha=0;
  push(s,{vx:(Math.random()*36-18),vy:-(26+Math.random()*34),g:-2,life:6000+Math.random()*4000,max:10000,fadeIn:true,aBoost:.55});
}
function sand(W,H){
  const y=Math.random()*H;
  const s=mk('streak',-30,y,PAL.sand);
  s.scale.set(.7+Math.random()*1.5,.7+Math.random()*.6);s.alpha=0;
  push(s,{vx:900+Math.random()*700,vy:(Math.random()*40-20),life:1400,max:1400,fadeIn:true,aBoost:.7});
}

/* sparks scaled by damage; a soft flash joins in at 40+ */
export function fxHit(x,y,amt){
  if(!app)return;
  const n=Math.min(26,4+Math.round(amt*.45));
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2, v=90+Math.random()*(150+amt*3);
    const s=mk('dot',x,y,Math.random()<.7?PAL.spark:PAL.ember);
    s.scale.set(.22+Math.random()*.34);
    push(s,{vx:Math.cos(a)*v,vy:Math.sin(a)*v-40,g:420,life:380+Math.random()*340,max:720,shrink:true});
  }
  if(amt>=40)fxFlash(x,y);
}
export function fxFlash(x,y){
  if(!app)return;
  const s=mk('soft',x,y,PAL.flash);
  s.scale.set(1.4);s.alpha=.9;s.blendMode='add';
  push(s,{vx:0,vy:0,life:300,max:300,grow:9});
}
export function fxDestroy(x,y){
  if(!app)return;
  fxHit(x,y,20);
  const s=mk('soft',x,y,PAL.ember);
  s.scale.set(.8);s.blendMode='add';
  push(s,{vx:0,vy:0,life:260,max:260,grow:5});
}
export function fxForge(x,y){
  if(!app)return;
  const c=mk('soft',x,y,PAL.forgeCore);c.scale.set(.6);c.blendMode='add';
  push(c,{vx:0,vy:0,life:340,max:340,grow:7});
  for(let i=0;i<22;i++){
    const a=(i/22)*Math.PI*2, v=170+Math.random()*130;
    const s=mk('dot',x,y,PAL.forge);
    s.scale.set(.3+Math.random()*.3);
    push(s,{vx:Math.cos(a)*v,vy:Math.sin(a)*v,g:260,life:520+Math.random()*300,max:820,shrink:true});
  }
}
export function fxCoinRain(){
  if(!app)return;
  const W=window.innerWidth;
  for(let i=0;i<34;i++){
    const s=mk('dot',Math.random()*W,-14-Math.random()*220,Math.random()<.35?PAL.coinHi:PAL.coin);
    s.scale.set(.5+Math.random()*.5,.62+Math.random()*.5);
    push(s,{vx:Math.random()*50-25,vy:240+Math.random()*260,g:340,life:2300,max:2300,rot:Math.random()*7-3.5,aBoost:3});
  }
}
export function fxStorm(on){stormLive=!!on&&!!app;}
export function fxCount(){return parts.length;}
