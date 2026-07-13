"use strict";
/* The shared UI kernel. ui.js (the composition root + flow) and route-ui.js (the
   route presenters) both import from here, so neither owns the other and there is
   no import cycle. Two live singletons and a handful of DOM primitives live here.

   G is the game aggregate. It is REASSIGNED only by ui.js (newRoute/restoreRoute)
   through setG; every reader across both modules sees the current value through
   the exported live binding. RM is the reduced-motion flag, set once at boot via
   setRM. Reading a bare `G`/`RM` in either module works; only the owner may set. */
export let G=null;
export function setG(v){G=v;}
export let RM=false;
export function setRM(v){RM=v;}

export function store(){try{return window.localStorage;}catch(e){return null;}}
export function $(id){return document.getElementById(id);}
export function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
export function ovOpen(html){const d=document.createElement('div');d.className='ov';d.innerHTML=html;document.body.appendChild(d);return d;}
export function ovClose(d){if(d&&d.parentNode){d.parentNode.removeChild(d);}}
let toastT=null;
export function toast(msg){
  let t=$('toast');
  if(!t){t=document.createElement('div');t.id='toast';
    t.style.cssText='position:fixed;top:calc(env(safe-area-inset-top) + 64px);left:50%;transform:translateX(-50%);z-index:70;background:linear-gradient(180deg,#3b2c20,#2a1e15);border:1px solid rgba(216,162,74,.45);color:#f0e6d6;padding:9px 15px;border-radius:20px;font-size:12px;font-weight:700;box-shadow:0 10px 26px rgba(0,0,0,.5);transition:opacity .3s;opacity:0;max-width:82%;text-align:center;pointer-events:none;';
    document.body.appendChild(t);}
  t.textContent=msg;t.style.opacity='1';
  clearTimeout(toastT);toastT=setTimeout(function(){t.style.opacity='0';},1700);
}
