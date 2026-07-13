"use strict";
import {TICK,SPEED,RSTAT,RNAME,BASEINTEG,COST,SELLV,TIERCOST,CATN,CATC,ANONE,
        ITEMS,TRINKETS,ANOMALIES,PERSONAS,MONSTERS,ENCH,ENCH_CHANCE,ENCH_PREMIUM,HEROES,DISTRICTS} from './data.js';
import {mulberry,fightHP,stormAt,gateOK,makeItem,integOf,fuseScan,fuseNeed,usedCells,
        playerFightItems,monsterSide,createFight,boardRegen} from './engine.js';
import {genMap,MAP_VERSION,isCombat} from './map.js';
import {initRoute,transition as routeTransition,frontier,currentDistrict,visitedSet,nodeOf,lossDamage,fightSeed,validRoute,BASE_GOLD,classifyEdges} from './route.js';
import {ic} from './art.js';
import {effChips,wareDetailHTML} from './cards.js';
import {ART} from './art-manifest.js';
import {fxHit,fxDestroy,fxForge,fxCoinRain,fxStorm} from './fx.js';
import {sHit,sTick,sDestroy,sForge,sCoin,sFanfare,sWin,sLose,sCreak,sStorm,sfxToggle,sfxMuted} from './sfx.js';
import {initMusic,music,musicMute,sting,musicNow} from './music.js';
import pkg from '../package.json';
/* ============ SESSION + UI PRIMITIVES ============ */
let G=null;let RM=false;
let FSPD=(function(){try{return +window.localStorage.getItem('bb-speed')||1;}catch(e){return 1;}})();
if(FSPD!==2)FSPD=1;
/* ============ SAVES ============ */
/* the route regenerates its map from the seed; only the controller state and the
   economy are stored */
const ROUTE_SAVE_VERSION=1;
const ROUTE_KEY='bb-route-run';
function store(){try{return window.localStorage;}catch(e){return null;}}
function reviveItem(b){const it=makeItem(b.id,b.rarity,b.ench||null);it.size=b.size;return it;}
function $(id){return document.getElementById(id);}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function shuffle(a,rng){for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));const t=a[i];a[i]=a[j];a[j]=t;}return a;}
function ovOpen(html){const d=document.createElement('div');d.className='ov';d.innerHTML=html;document.body.appendChild(d);return d;}
function ovClose(d){if(d&&d.parentNode){d.parentNode.removeChild(d);}}
let toastT=null;
function toast(msg){
  let t=$('toast');
  if(!t){t=document.createElement('div');t.id='toast';
    t.style.cssText='position:fixed;top:calc(env(safe-area-inset-top) + 64px);left:50%;transform:translateX(-50%);z-index:70;background:linear-gradient(180deg,#3b2c20,#2a1e15);border:1px solid rgba(216,162,74,.45);color:#f0e6d6;padding:9px 15px;border-radius:20px;font-size:12px;font-weight:700;box-shadow:0 10px 26px rgba(0,0,0,.5);transition:opacity .3s;opacity:0;max-width:82%;text-align:center;pointer-events:none;';
    document.body.appendChild(t);}
  t.textContent=msg;t.style.opacity='1';
  clearTimeout(toastT);toastT=setTimeout(function(){t.style.opacity='0';},1700);
}
function shake(){if(RM)return;const a=$('app');a.classList.remove('shake');void a.offsetWidth;a.classList.add('shake');}
function flashScr(){if(RM)return;const f=$('flash');f.classList.remove('go');void f.offsetWidth;f.classList.add('go');}
/* ============ STAT DISPLAY HELPERS ============ */
function primDraft(it){const d=ITEMS[it.id];const rs=RSTAT[it.rarity];const f=d.fx||{};
 if(f.dmg)return['',Math.round(f.dmg*rs)];
 if(f.shield)return['c-shield',Math.round(f.shield*rs)];
 if(f.heal)return['c-heal',Math.round(f.heal*rs)];
 if(f.poison)return['c-poison',Math.round(f.poison*rs)];
 if(f.burn)return['c-burn',Math.round(f.burn*rs)];
 return null;}
function primStat(fi){const f=fi.fx||{};
 if(f.dmg)return['',f.dmg];
 if(f.shield)return['c-shield',f.shield];
 if(f.heal)return['c-heal',f.heal];
 if(f.poison)return['c-poison',f.poison];
 if(f.burn)return['c-burn',f.burn];
 return null;}
/* ============ CELLS + BOARD ============ */
function cellHTML(it,i,sel){
  const d=ITEMS[it.id];const ps=primDraft(it);
  const pair=it.rarity<3&&G&&G.board&&G.board.filter(function(x){return x.id===it.id&&x.rarity===it.rarity;}).length===2;
  return '<div class="cell it s'+it.size+' rar'+it.rarity+(sel?' sel':'')+(pair?' pair':'')+'" style="grid-column:span '+it.size+';--cat:'+CATC[d.cat]+'" data-i="'+i+'">'
   +'<div class="glow"></div>'+ic('g-'+it.id,'gi')
   +(ps?'<span class="stat sl '+ps[0]+'">'+ps[1]+'</span>':'')
   +'<span class="stat sr">'+integOf(it)+'</span>'
   +(d.bulwark?ic('e-shield','bw'):'')
   +(it.rarity>0?'<span class="fuse">'+RNAME[it.rarity].charAt(0)+'</span>':'')
   +(it.ench?'<i class="edot" style="background:'+ENCH[it.ench].c+'"></i>':'')
  +'</div>';
}
function boardHTML(board,slots,selIdx){
  let h='';
  if(!board.length){h+='<div class="bhint">Your wares fight from here</div>';}
  board.forEach(function(it,i){h+=cellHTML(it,i,i===selIdx);});
  const used=usedCells(board);
  for(let c=used;c<slots;c++){h+='<div class="cell empty'+(c===used?' nxt':'')+'"></div>';}
  for(let c=slots;c<10;c++){h+='<div class="cell lock"></div>';}
  return '<div class="board" id="bd">'+h+'</div>';
}
function fightCellHTML(fi,i,side){
  const ps=primStat(fi);const col=CATC[fi.cat]||CATC.util;
  return '<div class="cell f s'+fi.size+' rar'+fi.rarity+(fi.alive?'':' dead')+'" id="fc-'+side+'-'+i+'" style="grid-column:span '+fi.size+';--cat:'+col+';--fc:'+col+';--rc:'+col+'">'
   +'<div class="ring"></div><div class="cdf" id="cdf-'+side+'-'+i+'"></div><div class="glow"></div>'+ic(fi.g,'gi')
   +(ps?'<span class="stat sl '+ps[0]+'">'+ps[1]+'</span>':'')
   +'<span class="stat sr" id="fi-'+side+'-'+i+'">'+fi.integ+'</span>'
   +(fi.bulwark?ic('e-shield','bw'):'')
   +'<div class="ash">'+ic('g-crack','','width:20px;height:20px')+'</div>'
   +(fi.ench?'<i class="edot" style="background:'+ENCH[fi.ench].c+'"></i>':'')
  +'</div>';
}
/* ============ TOP RENDERERS ============ */
/* the acts pass folded the rivals strip, anomaly bar, and trinket row
   into ribbon chips with tap drawers; the old containers stay empty */
function renderRivals(){$('rivals').innerHTML='';}
function renderAno(){$('anobar').innerHTML='';}
function renderTrow(){$('trow').innerHTML='';}
function renderRibbon(){
  const st=G.route.state;const H=heroOf();
  $('ribbon').innerHTML=
    '<div class="heroP">'+ic(H?H.g:'p-0','hpv')+'</div>'
   +'<div class="chip hp"><span class="lab">Resolve</span><span class="val">'+ic('g-heart','ci')+Math.max(0,st.resolve)+'</span></div>'
   +'<div class="chip gold"><span class="lab">Gold</span><span class="val">'+ic('g-coin','ci')+G.gold+'</span></div>'
   +'<div class="chip"><span class="lab">Tier</span><span class="val">'+ic('g-gem','ci')+G.tier+'</span></div>'
   +'<button class="chip act grow" id="chipAno"><span class="lab">Omen</span><span class="lab2">'+G.anom.n+'</span></button>'
   +(G.trinkets.length?'<button class="chip act" id="chipTrk"><span class="lab">Charms</span><span class="val">'+G.trinkets.map(function(t){return ic(t.g,'ci');}).join('')+'</span></button>':'');
  const ab=$('chipAno');if(ab)ab.onclick=openAnoInfo;
  const cb=$('chipTrk');if(cb)cb.onclick=openTrkInfo;
}
function openAnoInfo(){
  const o=ovOpen('<div class="card"><div class="rays"></div><div class="kick">Tonight\'s Omen</div>'
   +ic(G.anom.g,'bigic')+'<h2 class="big" style="font-size:25px">'+G.anom.n+'</h2>'
   +'<p>'+G.anom.d+'</p><p>Featured wares: <b>'+CATN[G.tags[0]]+' + '+CATN[G.tags[1]]+'</b></p>'
   +'<p style="opacity:.7">Tap anywhere to close</p></div>');
  o.onclick=function(){ovClose(o);};
}
function openTrkInfo(){
  const o=ovOpen('<div class="card"><div class="kick gold">Charms</div>'
   +'<h2 class="big" style="font-size:23px">Your Charms</h2>'
   +G.trinkets.map(function(t){return '<p><b>'+t.n+'</b> '+t.d+'</p>';}).join('')
   +'<p style="opacity:.7">Tap anywhere to close</p></div>');
  o.onclick=function(){ovClose(o);};
}
/* ============ MARKET ============ */
function wareHTML(w,i){
  const d=ITEMS[w.id];
  const cost=w.free?0:COST[d.size]+(w.ench?ENCH_PREMIUM:0);
  const can=!w.bought&&(w.free||G.gold>=cost)&&(usedCells(G.board)+d.size<=4+G.tier);
  const own=G.board.filter(function(x){return x.id===w.id&&x.rarity===0;}).length
    +G.vault.filter(function(x){return x.id===w.id&&x.rarity===0;}).length;
  const trip=own>=2&&!w.bought;
  const match=own===1&&!w.bought;
  let gems='';for(let g=0;g<d.tier;g++){gems+=ic('g-gem');}
  let pips='';for(let s=1;s<=3;s++){pips+='<i class="'+(s<=d.size?'on':'')+'"></i>';}
  const en=w.ench?ENCH[w.ench]:null;
  const anim=G._wfresh?';animation-delay:'+(i*45)+'ms':';animation:none';
  const alab=esc(d.n)+(w.bought?' (bought)':', '+(w.free?'free':cost+' gold'));
  return '<div class="ware'+(w.bought?' gone':(can?'':' cant'))+(en?' enchw':'')+(trip?' trip':'')+(match?' match':'')+(G.shopSel===i?' sel':'')+(G.frozen&&!w.bought?' icew':'')+'" data-w="'+i+'" role="button" tabindex="0" aria-label="'+alab+'" style="--cat:'+CATC[d.cat]+(en?';--ec:'+en.c:'')+anim+'">'
   +'<div class="ph">'+ic('g-'+w.id,'gi')+'<span class="cost'+(w.free?' free':'')+'">'+ic('g-coin')+'<b>'+(w.free?'FREE':cost)+'</b></span></div>'
   +'<div class="tg">'+gems+'</div>'
   +'<div class="wn">'+(en?'<span style="color:'+en.c+'">'+en.n+'</span> ':'')+d.n+'</div>'
   +'<div class="sz">'+pips+'<span class="szl">'+(d.size===1?'1 slot':d.size+' slots')+'</span></div>'
   +'<div class="chips">'+effChips(w.id,0)+(en?'<span class="eff util" style="color:'+en.c+'">'+ic('e-bolt','mi')+' '+en.d+'</span>':'')+(trip?'<span class="eff trip">'+ic('e-bolt','mi')+' Forges Silver</span>':(match?'<span class="eff mt">'+ic('e-bolt','mi')+' You own 1</span>':''))+'</div>'
   +'<div class="wd">'+esc(d.d)+'</div>'
   +'<div class="wr">'+(d.cd>0?ic('e-clock','mi')+' every '+d.cd+'s':'<span>passive</span>')+'<span>'+ic('e-shield','mi')+' '+Math.round(BASEINTEG[d.size]*(d.integMul||1))+'</span></div>'
   +(own>0?'<div class="own">'+own+'/3</div>':'')
  +'</div>';
}
function renderVaultSheet(sh){
  const it=G.vault[G.vsel];
  const room=usedCells(G.board)+it.size<=4+G.tier;
  sh.innerHTML='<div class="sheet">'+wareDetailHTML(it)
   +'<div class="bs"><button class="btn" id="vOut"'+(room?'':' disabled')+'>To the Stall</button>'
   +'<button class="btn" id="vSwp"'+(G.board.length?'':' disabled')+'>Swap</button>'
   +'<button class="btn sell" id="vSl">Sell +'+SELLV[it.size]+'</button></div></div>';
  const O=$('vOut');if(O)O.onclick=function(){
    if(usedCells(G.board)+it.size>4+G.tier)return;
    G.vault.splice(G.vsel,1);G.vsel=null;G.board.push(it);
    const forged=fuseScan(G.board);
    if(forged.length){forged.forEach(function(f){toast('Forged: '+RNAME[f.rarity]+' '+ITEMS[f.id].n);});sForge();sting('forgesting');}
    else{toast(ITEMS[it.id].n+' returns to the stall');}
    fuseWithVault();
    renderAll();
  };
  const W=$('vSwp');if(W)W.onclick=function(){
    G.swapV=G.vsel;G.vsel=null;G.dockV=false;
    toast('Tap a stall ware to trade places.');
    renderDraft();
  };
  const S=$('vSl');if(S)S.onclick=function(){
    const cell=document.querySelector('#vlt .cell.it[data-v="'+G.vsel+'"]');
    const from=cell?cell.getBoundingClientRect():null;
    G.gold+=SELLV[it.size];G.vault.splice(G.vsel,1);G.vsel=null;
    toast('Sold from the vault for '+SELLV[it.size]+' gold');renderAll();
    if(from){flyCoins(from,3+SELLV[it.size]);}
  };
}
function vaultSwap(i){
  const vi=G.swapV;const inIt=G.vault[vi];const outIt=G.board[i];
  if(!inIt||!outIt){G.swapV=null;renderDraft();return;}
  if(usedCells(G.board)-outIt.size+inIt.size>4+G.tier){toast('No room for that trade');return;}
  G.vault[vi]=outIt;G.board[i]=inIt;G.swapV=null;G.sel=null;
  const forged=fuseScan(G.board);
  if(forged.length){forged.forEach(function(f){toast('Forged: '+RNAME[f.rarity]+' '+ITEMS[f.id].n);});sForge();sting('forgesting');}
  else{toast(ITEMS[outIt.id].n+' rests in the vault. '+ITEMS[inIt.id].n+' takes the stall.');}
  fuseWithVault();
  renderAll();
}
function renderSheet(){
  const sh=$('sheet');if(!sh)return;
  if(G.dockV&&G.vsel!=null&&G.vault[G.vsel]){renderVaultSheet(sh);return;}
  if(G.sel==null||!G.board[G.sel]){sh.innerHTML='';return;}
  const it=G.board[G.sel];
  sh.innerHTML='<div class="sheet">'+wareDetailHTML(it)
   +'<div class="bs"><button class="btn" id="mvL"'+(G.sel===0?' disabled':'')+'>&#9664; Move</button>'
   +'<button class="btn" id="mvR"'+(G.sel>=G.board.length-1?' disabled':'')+'>Move &#9654;</button>'
   +'<button class="btn" id="vtI"'+(G.vault.length>=3?' disabled':'')+'>Vault</button>'
   +'<button class="btn sell" id="slI">Sell +'+SELLV[it.size]+'</button></div></div>';
  const L=$('mvL');if(L)L.onclick=function(){if(G.sel>0){const t=G.board[G.sel];G.board[G.sel]=G.board[G.sel-1];G.board[G.sel-1]=t;G.sel--;renderDraft();}};
  const R=$('mvR');if(R)R.onclick=function(){if(G.sel<G.board.length-1){const t=G.board[G.sel];G.board[G.sel]=G.board[G.sel+1];G.board[G.sel+1]=t;G.sel++;renderDraft();}};
  const S=$('slI');if(S)S.onclick=function(){
    const cell=document.querySelector('#bd .cell.it[data-i="'+G.sel+'"]');
    const from=cell?cell.getBoundingClientRect():null;
    G.gold+=SELLV[it.size];G.board.splice(G.sel,1);G.sel=null;
    toast('Sold for '+SELLV[it.size]+' gold');renderAll();
    if(from){flyCoins(from,3+SELLV[it.size]);}
  };
  const V=$('vtI');if(V)V.onclick=function(){
    if(G.vault.length>=3)return;
    G.vault.push(it);G.board.splice(G.sel,1);G.sel=null;
    toast(ITEMS[it.id].n+' stored in the vault');renderAll();
  };
}
function renderDraft(){
  const slots=4+G.tier,used=usedCells(G.board);
  let h='<div class="stage" id="stage">';
  G._wfresh=G.shopFresh!==false;G.shopFresh=false;
  h+='<div class="sec secmarket"><div class="label">The Market<span class="side">'+(G.tier<2?'Tier 2 wares locked':(G.tier<4?'Tier 4 wares locked':'All wares open'))+'</span></div>';
  h+='<div class="shop">'+G.shop.map(function(w,i){return wareHTML(w,i);}).join('')+'</div>';
  h+='<div class="controls">'
    +'<button class="btn" id="btnTier"'+((G.tier>=6||G.gold<G.tierCost)?' disabled':'')+'>'+ic('g-gem','bi')+' '+(G.tier>=6?'Tier Max':'+1 slot &middot; Tier '+(G.tier+1)+' &middot; '+G.tierCost+'g')+'</button>'
    +'<button class="btn" id="btnRe"'+(G.gold<1?' disabled':'')+'>'+ic('g-coin','bi')+' Reroll 1</button>'
    +'<button class="btn frz'+(G.frozen?' iceon':'')+'" id="btnFrz">'+ic('e-frost','bi')+' '+(G.frozen?'Frozen':'Freeze')+'</button>'
  +'</div></div>';
  h+='</div>';
  h+='<div class="dock"><div class="docktop"><div class="label" style="margin:0">'+(G.dockV?'The Vault':'Your Stall')
   +'<span class="side">'+(G.dockV?'no fights, no forging':(G.swapV!=null?'tap a ware to trade with the vault':used+' / '+slots+' slots'))+'</span></div>'
   +'<button class="btn mini" id="dockFlip">'+(G.dockV?'Stall':'Vault'+(G.vault.length?' ('+G.vault.length+')':''))+'</button>'
   +'<button class="btn gold tob" id="btnGo">'+ic('g-lantern','bi vsp')+'<span class="tbt"><span class="tbl">'+(G.route.opening?'Set out':'Leave')+'</span><span class="tbn">'+(G.route.opening?'onto the road':'back to the road')+'</span></span></button></div>';
  if(G.dockV){
    h+='<div class="vault" id="vlt">'+G.vault.map(function(it,i){
        const d=ITEMS[it.id];
        return '<div class="cell it s1 rar'+it.rarity+(G.vsel===i?' sel':'')+'" style="--cat:'+CATC[d.cat]+'" data-v="'+i+'">'
         +'<div class="glow"></div>'+ic('g-'+it.id,'gi')
         +'<span class="stat sr">'+integOf(it)+'</span>'
         +(it.ench?'<i class="edot" style="background:'+ENCH[it.ench].c+'"></i>':'')
         +(it.rarity>0?'<span class="fuse">'+RNAME[it.rarity].charAt(0)+'</span>':'')+'</div>';
      }).join('');
    for(let v=G.vault.length;v<3;v++){h+='<div class="cell empty"></div>';}
    h+='</div>';
  }else{
    h+=boardHTML(G.board,slots,G.sel);
  }
  h+='<div id="sheet"></div></div>';
  $('main').className='draft';
  $('main').innerHTML=h;
  const df=$('dockFlip');if(df)df.onclick=function(){G.dockV=!G.dockV;G.sel=null;G.vsel=null;G.swapV=null;renderDraft();};
  document.querySelectorAll('#bd .cell.it').forEach(function(c){c.onclick=function(){
    const i=+c.dataset.i;
    if(G.swapV!=null){vaultSwap(i);return;}
    G.sel=(G.sel===i?null:i);G.shopSel=null;renderDraft();
  };});
  document.querySelectorAll('#vlt .cell.it').forEach(function(c){c.onclick=function(){
    const i=+c.dataset.v;if(!G.vault[i])return;
    G.vsel=(G.vsel===i?null:i);G.sel=null;G.shopSel=null;renderDraft();
  };});
  document.querySelectorAll('.ware').forEach(function(w){
    w.onclick=function(){selectWare(+w.dataset.w);};
    w.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();selectWare(+w.dataset.w);}};
  });
  const bt=$('btnTier');if(bt)bt.onclick=tierUp;
  const br=$('btnRe');if(br)br.onclick=reroll;
  const bf=$('btnFrz');if(bf)bf.onclick=toggleFreeze;
  const bg=$('btnGo');if(bg)bg.onclick=G.route.opening?leaveOpeningMarket:function(){dispatchRoute({type:'leaveMarket'});};
  renderSheet();
  snapshotRoute();
}
function renderAll(){
  document.body.classList.add('run','route');document.body.classList.toggle('fight',G.phase==='fight');
  renderRibbon();renderAno();renderTrow();
  if(G.phase==='routeMap')renderRouteMap();
  else if(G.phase==='draft')renderDraft();
  else if(G.phase==='gateCamp')renderGateCamp();
}
/* ============ THE VOICE: your hero watches you play ============ */
function bark(ev,always){
  const h=heroOf();if(!h||!h.barks||!h.barks[ev]||!h.barks[ev].length)return;
  const now=Date.now();
  if(!always&&G.lastBark&&now-G.lastBark<18000)return;
  if(!always&&Math.random()<0.45)return;
  G.lastBark=now;
  const line=h.barks[ev][Math.floor(Math.random()*h.barks[ev].length)];
  const old=document.querySelector('.bark');if(old)old.remove();
  const d=document.createElement('div');d.className='bark';
  d.innerHTML=ic(h.g,'bkp')+'<div><b>'+h.n+'</b><br>'+line+'</div>';
  document.body.appendChild(d);
  setTimeout(function(){d.classList.add('out');},2400);
  setTimeout(function(){d.remove();},2900);
}
/* ============ JUICE: objects behave like objects ============ */
function flyGhost(from,to,iconHtml,onEnd){
  if(RM||!from||!to){if(onEnd)onEnd();return;}
  const d=document.createElement('div');d.className='fly';
  d.style.left=from.left+'px';d.style.top=from.top+'px';
  d.style.width=Math.min(56,from.width)+'px';d.style.height=Math.min(56,from.height)+'px';
  d.innerHTML=iconHtml;
  document.body.appendChild(d);
  const dx=(to.left+to.width/2)-(from.left+Math.min(56,from.width)/2);
  const dy=(to.top+to.height/2)-(from.top+Math.min(56,from.height)/2);
  requestAnimationFrame(function(){requestAnimationFrame(function(){
    d.style.transform='translate('+dx+'px,'+dy+'px) scale(.72)';d.style.opacity='.9';
  });});
  setTimeout(function(){d.remove();if(onEnd)onEnd();},400);
}
function flyCoins(from,n){
  if(RM||!from)return;
  const chip=document.querySelector('#ribbon .chip.gold');
  if(!chip)return;
  const to=chip.getBoundingClientRect();
  for(let i=0;i<(n||5);i++){
    (function(i){setTimeout(function(){
      const c=document.createElement('div');c.className='flycoin';
      c.style.left=(from.left+from.width/2+(Math.random()*26-13))+'px';
      c.style.top=(from.top+from.height/2+(Math.random()*14-7))+'px';
      c.innerHTML=ic('g-coin','','width:100%;height:100%');
      document.body.appendChild(c);
      const dx=(to.left+to.width/2)-parseFloat(c.style.left);
      const dy=(to.top+to.height/2)-parseFloat(c.style.top);
      requestAnimationFrame(function(){requestAnimationFrame(function(){
        c.style.transform='translate('+dx+'px,'+dy+'px) scale(.4)';c.style.opacity='.15';
      });});
      setTimeout(function(){c.remove();},460);
    },i*45);})(i);
  }
}
/* ============ ECONOMY ACTIONS ============ */
/* a bought or returned copy can complete a forge whose other copies
   rest in the vault: pull them through and fuse automatically. If the
   pull leaves the stall over capacity, the newest piece rests in the
   vault slots the copies just freed. */
function fuseWithVault(){
  let forgedAny=false,guard=0;
  while(guard++<8){
    let pulled=false;
    for(const it of G.board.slice()){
      if(it.rarity>=3)continue;
      const need=fuseNeed(it.rarity);
      const onB=G.board.filter(function(x){return x.id===it.id&&x.rarity===it.rarity;}).length;
      const inV=G.vault.filter(function(x){return x.id===it.id&&x.rarity===it.rarity;}).length;
      if(onB>=need||onB+inV<need)continue;
      for(let k=0;k<need-onB;k++){
        const vi=G.vault.findIndex(function(x){return x.id===it.id&&x.rarity===it.rarity;});
        G.board.push(G.vault.splice(vi,1)[0]);
      }
      pulled=true;
    }
    const forged=fuseScan(G.board);
    if(forged.length){
      forged.forEach(function(f){toast('Forged: '+RNAME[f.rarity]+' '+ITEMS[f.id].n);});
      sForge();sting('forgesting');forgedAny=true;
    }
    if(!pulled&&!forged.length)break;
  }
  while(usedCells(G.board)>4+G.tier&&G.vault.length<3){
    const last=G.board.pop();G.vault.push(last);
    toast(ITEMS[last.id].n+' waits in the vault: no room on the stall');
  }
  return forgedAny;
}
/* inspect then commit: tapping a ware opens a floating detail card (the same
   overlay pattern as the fight inspect) with the full rule and a prominent Buy
   button. Floats above the market so nothing scrolls, no buying on a stray tap. */
function selectWare(i){
  const w=G.shop[i];if(!w||w.bought||G.phase!=='draft')return;
  const d=ITEMS[w.id];const cost=w.free?0:COST[d.size]+(w.ench?ENCH_PREMIUM:0);
  const room=usedCells(G.board)+d.size<=4+G.tier;const afford=w.free||G.gold>=cost;const can=afford&&room;
  const why=!afford?'Not enough gold':(!room?'No room on your stall':'');
  const o=ovOpen('<div class="card inspectcard"><div class="kick gold">Market ware</div>'
   +'<div class="sheet">'+wareDetailHTML({id:w.id,rarity:0,size:d.size,ench:w.ench})
   +'<div class="bs"><button class="btn buy'+(can?'':' cant')+'" id="shopBuy"'+(can?'':' disabled')+'>'+ic('g-coin','bi')+' '+(w.free?'Take':'Buy &middot; '+cost+'g')+'</button>'
   +'<button class="btn" id="shopClose">Close</button></div>'
   +(why?'<div class="whyno">'+why+'</div>':'')+'</div></div>');
  const close=function(){ovClose(o);};
  const b=o.querySelector('#shopBuy');if(b)b.onclick=function(){ovClose(o);buyWare(i);};
  const c=o.querySelector('#shopClose');if(c)c.onclick=close;
  o.onclick=function(ev){if(ev.target===o)close();};
}
function buyWare(i){
  if(G.phase!=='draft')return;
  const w=G.shop[i];if(!w||w.bought)return;
  const d=ITEMS[w.id];const cost=w.free?0:COST[d.size]+(w.ench?ENCH_PREMIUM:0);
  if(G.gold<cost){toast('Not enough gold');return;}
  if(usedCells(G.board)+d.size>4+G.tier){toast('No room on your stall');return;}
  const wEl=document.querySelector('.ware[data-w="'+i+'"]');
  const fromRect=wEl?wEl.getBoundingClientRect():null;
  G.gold-=cost;w.bought=true;sCoin();
  G.board.push(makeItem(w.id,0,w.ench||null));
  const forged=fuseScan(G.board);
  fuseWithVault();
  renderAll();
  const cells=document.querySelectorAll('#bd .cell.it');
  const landCell=cells[cells.length-1];
  if(landCell&&fromRect){
    flyGhost(fromRect,landCell.getBoundingClientRect(),ic('g-'+w.id,'','width:100%;height:100%'),function(){
      if(landCell.isConnected){
        landCell.classList.add('land');
        if(w.ench){landCell.style.setProperty('--ec',ENCH[w.ench].c);landCell.classList.add('eland');}
        setTimeout(function(){landCell.classList.remove('land');landCell.classList.remove('eland');},720);
      }
    });
  }
  if(forged.length){
    forged.forEach(function(f){toast('Forged: '+RNAME[f.rarity]+' '+ITEMS[f.id].n);});
    sForge();sting('forgesting');
    const cells=document.querySelectorAll('#bd .cell.it');
    forged.forEach(function(f){const idx=G.board.indexOf(f);if(cells[idx]){cells[idx].classList.add('forge');const p=ctrOf(cells[idx]);if(p&&!RM)fxForge(p.x,p.y);}});
    bark('forge');
  }
  else if(G.gold===0){bark('broke');}
}
function tierUp(){
  if(G.tier>=6||G.gold<G.tierCost)return;
  G.gold-=G.tierCost;G.tier++;sFanfare();
  G.tierCost=TIERCOST[G.tier+1]||0;
  toast('Tier '+G.tier+': new slot, richer wares');
  renderAll();
  const dk=document.querySelector('.dock');
  if(dk&&!RM){dk.classList.add('flare');setTimeout(function(){dk.classList.remove('flare');},650);}
}
function reroll(){
  const free=G.mode==='route'&&G.freeReroll;
  if(free){G.freeReroll=false;toast('A free reroll, courtesy of Refit.');}
  else{if(G.gold<1)return;G.gold-=1;}
  G.frozen=false;G.shopSel=null;
  /* route markets re-seed from a keyed, serializable stream so a reload replays
     the same reroll sequence rather than the lobby rng's hidden position */
  if(G.mode==='route'&&G.route.market){G.route.market.rollIndex++;G.rng=mulberry(fightSeed(G.seed,G.route.market.nodeId,G.route.market.rollIndex));}
  rollShop();renderRibbon();renderDraft();
}
function toggleFreeze(){
  G.frozen=!G.frozen;
  toast(G.frozen?'The shop holds until dawn.':'The shop thaws.');
  renderDraft();
}
/* ============ FIGHT UI ============ */
function fighterHTML(s,side){
  return '<div class="fighter" id="fg-'+side+'"><div class="fh">'+ic(s.portrait,'fp')
   +'<span class="who">'+esc(s.nm)+'</span>'
   +'<span class="stt"><span class="sh" id="sh-'+side+'">'+ic('e-shield','mi')+' 0</span>'
   +'<span class="ps" id="ps-'+side+'">'+ic('e-skull','mi')+' 0</span>'
   +'<span class="bn" id="bn-'+side+'">'+ic('e-flame','mi')+' 0</span></span></div>'
   +'<div class="hpwrap"><div class="hpbar"><div class="ghost" id="gh-'+side+'"></div>'
   +'<div class="fill '+(side==='a'?'you':'foe')+'" id="fl-'+side+'"></div>'
   +'<div class="ht" id="ht-'+side+'"></div></div></div></div>';
}
function streakFx(fromEl,toEl){
  if(RM||!fromEl||!toEl)return;
  const a=fromEl.getBoundingClientRect(),b=toEl.getBoundingClientRect();
  const x1=a.left+a.width/2,y1=a.top+a.height/2,x2=b.left+b.width/2,y2=b.top+b.height/2;
  const len=Math.hypot(x2-x1,y2-y1);
  if(len<8)return;
  const s=document.createElement('div');s.className='streak';
  s.style.left=x1+'px';s.style.top=y1+'px';s.style.width=len+'px';
  s.style.transform='rotate('+(Math.atan2(y2-y1,x2-x1)*180/Math.PI)+'deg)';
  document.body.appendChild(s);
  setTimeout(function(){s.remove();},230);
}
function fltFx(side,txt,color,mini,big){
  const lay=$('fx-'+side);if(!lay||lay.children.length>11)return;
  const d=document.createElement('div');d.className='flt';
  d.style.color=color;
  d.style.fontSize=(typeof big==='number')?Math.min(26,Math.max(12,Math.round(11+big*0.3)))+'px':(big?'20px':'13px');
  d.style.left=(6+Math.random()*72)+'%';d.style.top='-4px';
  d.innerHTML=(mini?ic(mini,'mi'):'')+txt;
  lay.appendChild(d);setTimeout(function(){d.remove();},1000);
}
function cellFx(side,i,cls){
  const c=$('fc-'+side+'-'+i);if(!c)return;
  c.classList.remove(cls);void c.offsetWidth;c.classList.add(cls);
}
function ctrOf(el){if(!el)return null;const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};}
function hasteName(F,side,i){const S=side==='a'?F.a:F.b;const it=S&&S.items&&S.items[i];return it?it.nm:'';}
function logLine(html,mini,color){
  const l=$('log');if(!l)return;
  const d=document.createElement('div');d.className='li';
  d.innerHTML=(mini?'<svg class="lmi" style="color:'+color+'"><use href="#'+mini+'"/></svg>':'')+'<span>'+html+'</span>';
  l.prepend(d);
  while(l.children.length>5){l.lastChild.remove();}
}
function paintFight(F){
  ['a','b'].forEach(function(key){
    const S=F[key];
    const fl=$('fl-'+key);if(!fl)return;
    const frac=Math.max(0,S.hp/S.maxHp);
    fl.style.transform='scaleX('+frac+')';
    const gh=$('gh-'+key);if(gh)gh.style.transform='scaleX('+frac+')';
    const ht=$('ht-'+key);if(ht)ht.textContent=Math.max(0,Math.ceil(S.hp))+' / '+S.maxHp;
    $('sh-'+key).innerHTML=ic('e-shield','mi')+' '+S.shield;
    $('ps-'+key).innerHTML=ic('e-skull','mi')+' '+S.pois;
    $('bn-'+key).innerHTML=ic('e-flame','mi')+' '+S.burn;
    S.items.forEach(function(it,i){
      const c=$('fc-'+key+'-'+i);if(!c)return;
      if(!it.alive&&!c.classList.contains('dead')){c.classList.add('dead');}
      if(it.alive&&it.cd>0){const r=c.querySelector('.ring');if(r)r.style.setProperty('--p',Math.min(1,it.timer/it.cd));}
      const ig=$('fi-'+key+'-'+i);if(ig)ig.textContent=it.integ;
    });
  });
  const st=$('stormT');const sc=$('storm');
  if(st&&sc){
    if(F.stormOn){sc.classList.add('live');st.textContent='Storm';$('sand').classList.add('on');}
    else{st.textContent='Storm approaching '+Math.max(0,Math.ceil((F.stormAt-F.t)/1000))+'s';}
  }
}
function handleEvents(F,evs){
  let lastFire=null;
  for(let x=0;x<evs.length;x++){
    const e=evs[x];
    if(e.k==='fire'){cellFx(e.side,e.i,'fire');lastFire={side:e.side,i:e.i};}
    else if(e.k==='chip'){const ig=$('fi-'+e.side+'-'+e.i);if(ig)ig.textContent=e.integ;cellFx(e.side,e.i,'chip');
      if(lastFire&&lastFire.side!==e.side){streakFx($('fc-'+lastFire.side+'-'+lastFire.i),$('fc-'+e.side+'-'+e.i));}
      const p=ctrOf($('fc-'+e.side+'-'+e.i));if(p&&!RM)fxHit(p.x,p.y,e.amt);sHit(e.amt);}
    else if(e.k==='destroy'){if(G.recap)G.recap[e.side].dead.push(e.nm);const c=$('fc-'+e.side+'-'+e.i);if(c)c.classList.add('dead');logLine('<b class="r">'+esc(e.nm)+'</b> destroyed','e-skull','#ff8d76');const p=ctrOf(c);if(p&&!RM)fxDestroy(p.x,p.y);sDestroy();}
    else if(e.k==='hhit'){
      if(G.recap)G.recap[e.side].wpn+=e.amt;
      fltFx(e.side,'-'+e.amt,'#ff8d76','e-blade',e.amt);
      const fg=$('fg-'+e.side);if(fg){fg.classList.remove('hit');void fg.offsetWidth;fg.classList.add('hit');}
      if(lastFire&&lastFire.side!==e.side){streakFx($('fc-'+lastFire.side+'-'+lastFire.i),fg);}
      const p=ctrOf(fg);if(p&&!RM)fxHit(p.x,p.y,e.amt);sHit(e.amt);
      if(e.amt>=30)shake();if(e.amt>=46)flashScr();
      if(e.amt>=18)logLine((e.side==='a'?'You take ':'They take ')+'<b class="r">'+e.amt+'</b>','e-blade','#ff8d76');
    }
    else if(e.k==='storm'){if(G.recap)G.recap[e.side].storm+=e.amt;fltFx(e.side,'-'+e.amt,'#e8c27a','e-bolt',e.amt);}
    else if(e.k==='shield'){fltFx(e.side,'Shielded '+e.amt,'#6fe0cd','e-shield',false);}
    else if(e.k==='heal'){fltFx(e.side,'Mended '+e.amt,'#ffb3b8','e-heart',false);if(e.amt>=22)logLine((e.side==='a'?'You mend ':'They mend ')+'<b class="t">'+e.amt+'</b>','e-heart','#ffb3b8');}
    else if(e.k==='pois'){fltFx(e.side,'Spilled '+e.amt+' poison','#c0e070','e-skull',false);}
    else if(e.k==='burn'){fltFx(e.side,'Lit '+e.amt+' burn','#ffb066','e-flame',false);}
    else if(e.k==='haste'){const nm=hasteName(F,e.side,e.i);cellFx(e.side,e.i,'fire');
      if(lastFire&&lastFire.side===e.side&&lastFire.i!==e.i)streakFx($('fc-'+lastFire.side+'-'+lastFire.i),$('fc-'+e.side+'-'+e.i));
      fltFx(e.side,'Charged'+(nm?' '+nm:''),'#e8c27a','e-bolt',false);}
    else if(e.k==='tickp'){if(G.recap)G.recap[e.side].pois+=e.amt;fltFx(e.side,'-'+e.amt,'#c0e070','e-skull',false);sTick();}
    else if(e.k==='tickb'){if(G.recap)G.recap[e.side].burn+=e.amt;fltFx(e.side,'-'+e.amt,'#ffb066','e-flame',false);sTick();}
    else if(e.k==='pocket'){fltFx(e.side,'-'+e.amt,'#e8c27a','e-bolt',false);logLine('<b class="y">Sticky Paws pockets '+e.amt+' bounty gold</b>','e-bolt','#e8c27a');}
    else if(e.k==='freeze'){const c=$('fc-'+e.side+'-'+e.i);if(c)c.classList.add('frz');fltFx(e.side,'Froze '+e.amt+'s','#9ad8ef','e-clock',false);sTick();}
    else if(e.k==='thaw'){const c=$('fc-'+e.side+'-'+e.i);if(c)c.classList.remove('frz');}
    else if(e.k==='crit'){cellFx(e.side,e.i,'fire');logLine('<b class="y">Critical strike</b>','e-blade','#f4cf7c');}
    else if(e.k==='ammo'){if(e.left===0){fltFx(e.side,'empty','#8d7f6c','e-clock',false);logLine('<b class="r">The cannon clicks empty</b>','e-clock','#8d7f6c');}}
    else if(e.k==='reload'){fltFx(e.side,'Reloaded','#e8c27a','e-bolt',false);}
    else if(e.k==='enrage'){cellFx(e.side,e.i,'fire');logLine('<b class="r">The survivors rage: cooldowns cut</b>','e-flame','#ff8d76');}
    else if(e.k==='lot'){const c=$('fc-'+e.side+'-'+e.i);if(c)c.classList.add('lot');logLine('<b class="y">SOLD: '+esc(e.nm)+'</b> leaves the fight','e-clock','#e8c27a');}
    else if(e.k==='lotpay'){fltFx(e.side,'+'+e.amt+'g','#e8c27a','e-bolt',false);}
    else if(e.k==='spawn'){const c=$('fc-'+e.side+'-'+e.i);const S=e.side==='a'?F.a:F.b;if(c&&S.items[e.i]){c.outerHTML=fightCellHTML(S.items[e.i],e.i,e.side);}logLine('<b class="t">'+esc(e.nm)+'</b> emerges','e-skull','#9dbb45');sDestroy();}
    else if(e.k==='stormstart'){logLine('<b class="y">The storm arrives</b>','e-bolt','#e8c27a');if(!RM)fxStorm(true);sStorm(true);sting('windstorm');}
  }
}
/* tap any ware mid-fight to read what it is and its live state; the sim
   pauses while the panel is open so a rushing fight stays legible */
function fightDetailHTML(fi){
  const f=fi.fx||{};const rows=[];
  if(f.dmg)rows.push(['dmg','e-blade',f.dmg+' damage']);
  if(f.poison)rows.push(['poison','e-skull',f.poison+' poison']);
  if(f.burn)rows.push(['burn','e-flame',f.burn+' burn']);
  if(f.shield)rows.push(['shield','e-shield',f.shield+' shield']);
  if(f.heal)rows.push(['heal','e-heart',f.heal+' heal']);
  if(f.freeze)rows.push(['util','e-frost',f.freeze+'s freeze']);
  if(f.haste)rows.push(['util','e-bolt','+'+f.haste+'s to neighbors']);
  if(f.hasteAll)rows.push(['util','e-bolt','+'+f.hasteAll+'s to allies']);
  if(f.reload)rows.push(['util','e-bolt','reloads '+f.reload]);
  if(fi.bulwark)rows.push(['shield','e-shield','Bulwark: struck first']);
  if(fi.crit)rows.push(['dmg','e-blade',Math.round(fi.crit*100)+'% crit']);
  if(fi.flying)rows.push(['util','e-bolt','Flying: no weapon reaches it']);
  const chips=rows.length?rows.map(function(r){return '<span class="eff '+r[0]+'">'+ic(r[1],'mi')+' '+r[2]+'</span>';}).join(''):'<span class="eff util">no active effect</span>';
  const status=[];
  if(fi.frozen>0)status.push('Frozen '+(fi.frozen/1000).toFixed(1)+'s');
  if(fi.maxAmmo>0)status.push('Ammo '+fi.ammo+'/'+fi.maxAmmo);
  if(fi.lot)status.push('Auctioned: inert');
  if(!fi.alive)status.push('Destroyed');
  const cd=fi.cd>0?('every '+(fi.cd/1000)+'s'):'passive';
  return '<div class="st"><span class="ico" style="width:38px;height:38px">'+ic(fi.g,'','width:100%;height:100%')+'</span>'
   +'<div><div class="nm">'+esc(fi.nm)+'</div>'
   +'<div class="dchips" style="margin:6px 0">'+chips+'</div>'
   +'<div class="fstate">'+ic('e-shield','mi')+' '+Math.max(0,Math.round(fi.integ))+' / '+fi.maxI+' &middot; '+cd+(status.length?' &middot; '+status.join(' &middot; '):'')+'</div>'
   +'</div></div>';
}
function openFightInspect(side,i){
  if(!G.F)return;
  const S=side==='a'?G.F.a:G.F.b;const fi=S.items[i];if(!fi)return;
  G.fpaused=true;
  const o=ovOpen('<div class="card inspectcard"><div class="kick gold">'+(side==='a'?'Your ware':'Enemy ware')+'</div>'
   +'<div class="sheet">'+fightDetailHTML(fi)+'</div>'
   +'<button class="btn gold" id="fiResume" style="width:100%;margin-top:12px">Resume fight</button></div>');
  const done=function(){G.fpaused=false;ovClose(o);};
  const r=o.querySelector('#fiResume');if(r)r.onclick=done;
  o.onclick=function(ev){if(ev.target===o)done();};
}
function startFight(me,foe,opts){
  G.phase='fight';G.fpaused=false;G.sel=null;music((opts&&opts.boss)?'boss':'battle');
  document.body.classList.add('fight');
  if(!RM){
    const dk=document.createElement('div');dk.className='dusk';
    dk.innerHTML='<div class="dt">Dusk Falls</div><div class="d2">'+((opts&&opts.caption)||('Round '+G.round))+' &middot; '+esc(foe.nm)+'</div>';
    document.body.appendChild(dk);
    setTimeout(function(){dk.remove();},2250);
  }
  const fseed=(opts&&opts.seed!=null)?(opts.seed>>>0):((G.seed+G.round*7919+(++G.fightN)*104729)>>>0);
  const F=createFight({a:me,b:foe,stormAt:(opts&&opts.stormAt)||stormAt((opts&&opts.threat!=null)?opts.threat:runThreat()),seed:fseed,playerIs:'a'});
  G.F=F;
  G.recap={a:{wpn:0,pois:0,burn:0,storm:0,dead:[]},b:{wpn:0,pois:0,burn:0,storm:0,dead:[]}};
  function pad(items){const u=items.reduce(function(s,x){return s+x.size;},0);let h='';for(let c=u;c<10;c++){h+='<div class="cell lock"></div>';}return h;}
  $('main').className='fight';
  $('main').innerHTML=
   fighterHTML(foe,'b')
  +'<div class="fx" id="fx-b"></div>'
  +'<div class="board combat bd-b">'+foe.items.map(function(fi,i){return fightCellHTML(fi,i,'b');}).join('')+pad(foe.items)+'</div>'
  +'<div class="vsrow"><div class="vl"></div>'+ic('g-medallion','vm')
  +'<span class="stormchip" id="storm">'+ic('e-bolt','mi')+'<span id="stormT"></span></span>'
  +'<button class="spdbtn" id="spdB">'+FSPD+'x</button><div class="vl"></div></div>'
  +'<div class="board combat bd-a">'+me.items.map(function(fi,i){return fightCellHTML(fi,i,'a');}).join('')+pad(me.items)+'</div>'
  +'<div class="fx" id="fx-a"></div>'
  +fighterHTML(me,'a')
  +'<div class="log" id="log"></div>';
  const sb=$('spdB');
  if(sb)sb.onclick=function(){
    FSPD=FSPD===1?2:1;sb.textContent=FSPD+'x';
    try{window.localStorage.setItem('bb-speed',String(FSPD));}catch(e){}
  };
  paintFight(F);
  /* the pulse: every active ware shows its cooldown filling live, brass
     while charging, frost while frozen, dust while a magazine sits dry */
  function paintCds(){
    for(const S of [F.a,F.b]){
      for(let i=0;i<S.items.length;i++){
        const el=$('cdf-'+S.key+'-'+i);if(!el)continue;
        const it=S.items[i];
        if(!it.alive||it.cd<=0){el.style.opacity='0';continue;}
        const pct=Math.min(1,it.timer/it.cd);
        const col=it.frozen>0?'rgba(154,216,239,.6)':(it.maxAmmo>0&&it.ammo<=0?'rgba(140,127,108,.4)':(it.lot?'rgba(120,110,95,.3)':'rgba(244,207,124,.42)'));
        el.style.opacity='0.7';
        el.style.setProperty('--cc',col);
        el.style.setProperty('--p',pct);
      }
    }
  }
  paintCds();
  /* tap-to-inspect: delegated per board so spawned cells stay tappable */
  ['a','b'].forEach(function(sd){
    const board=document.querySelector('.bd-'+sd);
    if(board)board.onclick=function(ev){
      const cell=ev.target.closest('.cell.f');if(!cell)return;
      const m=cell.id.match(/^fc-(a|b)-(\d+)$/);if(m)openFightInspect(m[1],+m[2]);
    };
  });
  let acc=0;
  /* hold the sim while Dusk Falls owns the screen; the first swing
     lands as the curtain lifts */
  const duskHold=RM?0:1500;
  setTimeout(function(){
  if(G.F!==F)return;
  G.fiv=setInterval(function(){
    if(G.fpaused)return;
    /* the last shot: a genuine photo finish plays out at half speed */
    const tight=!F.done&&Math.min(F.a.hp,F.b.hp)<=20&&Math.max(F.a.hp,F.b.hp)<=45;
    acc+=40*SPEED*FSPD*(tight?0.45:1);let evs=[];
    while(acc>=TICK&&!F.done){acc-=TICK;const e2=F.step(TICK);for(let q=0;q<e2.length;q++){evs.push(e2[q]);}}
    if(evs.length)handleEvents(F,evs);
    paintFight(F);
    paintCds();
    if(F.done){
      clearInterval(G.fiv);G.fiv=null;
      fxStorm(false);sStorm(false);music('market');
      setTimeout(function(){$('sand').classList.remove('on');opts.onEnd(F);},850);
    }
  },40);
  },duskHold);
}
/* shared victory settlement: the win reward for both the lobby door and a route
   node. Applies base + bounty gold, item/relic/mote bounties, then finishes
   synchronously via cont() or opens an async gild/pickUnique overlay that calls
   cont() once chosen. Auctioneer pay and Resolve are fight-scoped and handled by
   the callers, not here. */
function settleMonsterReward(o){
  const M=MONSTERS[o.mid];const b=M.bounty||{};
  let coin=o.baseGold||0;
  if(b.gold){
    const purse=b.gold*(o.gilded?2:1);
    const drained=b.drain?Math.min(o.pocketed||0,purse):0;
    coin+=purse-drained;
    if(drained>0){toast('The monkey kept '+drained+' gold of the bounty.');}
  }
  if(coin<(o.minGold||0))coin=o.minGold||0;
  G.gold+=coin;
  if(b.items){b.items.forEach(function(id){G.shop.push({id:id,free:true,bought:false});});}
  if(b.relic&&(o.enteredGold||0)>=8){G.relicIncome+=1;toast('Income relic: +1 gold each dawn');}
  if(b.mote){
    const counts={};G.board.forEach(function(it){if(it.rarity===0&&!ITEMS[it.id].unique)counts[it.id]=(counts[it.id]||0)+1;});
    let best=null;Object.keys(counts).forEach(function(id){if(!best||counts[id]>counts[best])best=id;});
    if(best){G.shop.push({id:best,free:true,bought:false});}
    else{G.gold+=3;toast('The mote found nothing bronze to copy. 3 gold instead.');}
  }
  if(b.gild){renderAll();openGild('The mirror bows. Gild one ware.',o.cont);return;}
  if(b.pickUnique){renderAll();openUniquePick('The vault opens. Take one.',o.cont);return;}
  toast(M.n+' slain. '+coin+' gold'+(b.items?', bounty wares in the market':'')+'.');
  bark('win');
  o.cont();
}

/* ============ THE LONG BAZAAR ROUTE ============ */
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1);}
const NODELABEL={market:'Market',rest:'Rest',treasure:'Treasure',shrine:'Quqnus Shrine',negotiation:'Merchant'};
const NODEGLYPH={market:'g-route_market',rest:'g-route_rest',treasure:'g-route_treasure',shrine:'g-route_shrine',negotiation:'g-route_negotiation'};
function nodeGlyph(n){return isCombat(n)?MONSTERS[n.monId].glyph:(NODEGLYPH[n.type]||'g-route_treasure');}
const DBG={1:'back_alleys',2:'souk',3:'palace',4:'dragon_gate'};
/* the % anchors for the positioned route plot (Codex geometry) */
function nodeAnchor(n){
  const d4=n.district===4;
  let x;
  if(n.type==='boss')x=d4?88:91;
  else if(d4)x=n.col===0?14:50;
  else x=[7,23,39,55,71][n.col];
  return {x:x,y:[17,50,83][n.lane]};
}
function nodeLabel(n){return isCombat(n)?MONSTERS[n.monId].n:(NODELABEL[n.type]||n.type);}
function routeMap(){return G.route.map;}
function routeState(){return G.route.state;}

/* ---- route saves (independent of the lobby save) ---- */
function snapshotRoute(){
  const s=store();if(!s||!G||G.mode!=='route'||!G.route)return;
  const item=function(it){return {id:it.id,rarity:it.rarity,size:it.size,ench:it.ench||null};};
  const R=G.route;
  const d={saveVersion:ROUTE_SAVE_VERSION,mapVersion:MAP_VERSION,routeState:R.state,phase:G.phase,
    run:{seed:G.seed,hero:G.hero||null,anom:G.anom.id,tags:G.tags.slice(),
      gold:G.gold,tier:G.tier,tierCost:G.tierCost,relicIncome:G.relicIncome,frozen:!!G.frozen,freeReroll:!!G.freeReroll,fightN:G.fightN,
      board:G.board.map(item),vault:G.vault.map(item),
      shop:G.shop.map(function(w){return {id:w.id,free:!!w.free,bought:!!w.bought,ench:w.ench||null};}),
      trinkets:G.trinkets.map(function(t){return t.id;})},
    market:R.market?{nodeId:R.market.nodeId,rollIndex:R.market.rollIndex}:null,opening:!!R.opening,
    /* the fight's settlement context, so a reload during a fight or victory
       recap still pays the right bounty (Debt Collector entered gold, Pilfer
       Monkey drain) rather than seeing zero */
    combat:R.combat?{nodeId:R.combat.nodeId,enteredGold:R.combat.enteredGold||0,threat:R.combat.threat||0,pocketed:R.combat.pocketed||0}:null};
  try{s.setItem(ROUTE_KEY,JSON.stringify(d));}catch(e){}
}
function loadRoute(){
  const s=store();if(!s)return null;
  try{const d=JSON.parse(s.getItem(ROUTE_KEY)||'null');
    if(!d||d.saveVersion!==ROUTE_SAVE_VERSION||d.mapVersion!==MAP_VERSION){if(d)s.removeItem(ROUTE_KEY);return null;}
    return d;
  }catch(e){return null;}
}
function clearRoute(){const s=store();if(!s)return;try{s.removeItem(ROUTE_KEY);}catch(e){}}
function checkpointActiveRun(){snapshotRoute();}

/* ---- run construction ---- */
function newRoute(){
  const seed=((Date.now()>>>0)^0x9e3779b9)>>>0;
  const rng=mulberry(seed);
  /* Bull Market only scales income, which never pays in route; skip it until
     the omen rework gives it a route-live benefit */
  const anomPool=ANOMALIES.filter(function(a){return a.id!=='bull';});
  const anom=anomPool[Math.floor(rng()*anomPool.length)];
  const cats=['dmg','poison','burn','shield','heal'];shuffle(cats,rng);
  G={mode:'route',seed:seed,rng:rng,round:0,anom:anom,A:Object.assign({},ANONE,anom.m),tags:[cats[0],cats[1]],
     board:[],vault:[],shop:[],trinkets:[],T:null,hero:null,gold:6,tier:1,tierCost:TIERCOST[2],relicIncome:0,frozen:false,
     stats:{slain:0,driven:0,safe:0},sel:null,vsel:null,swapV:null,shopSel:null,dockV:false,tut:null,freeReroll:false,
     phase:'routeMap',fightN:0,fiv:null,F:null,recap:null,you:{n:'You',p:'p-0'},
     route:{map:genMap(seed),state:initRoute(seed),selectedId:null,market:null,combat:null,opening:false}};
  computeT();
  renderAno();renderTrow();
  $('ribbon').innerHTML='';$('main').innerHTML='';
  openHeroPick(function(){openRouteReveal();});
}
function openRouteReveal(){
  const o=ovOpen('<div class="card reveal"><div class="rays"></div>'
   +'<div class="kick gold">The Road Ahead</div>'
   +ic(G.anom.g,'bigic')
   +'<h2 class="big">'+G.anom.n+'</h2><p>'+G.anom.d+'</p>'
   +'<p>Featured wares: <b style="color:var(--brass)">'+CATN[G.tags[0]]+'</b> and <b style="color:var(--brass)">'+CATN[G.tags[1]]+'</b></p>'
   +'<p style="font-size:11px">Four districts. Forty Resolve. Reach the Grand Vizier.</p>'
   +'<button class="btn gold" id="rvGo">Enter the Bazaar</button></div>');
  o.querySelector('#rvGo').onclick=function(){ovClose(o);enterOpeningMarket();};
}

/* ---- the single dispatch: only place that calls the controller ---- */
function dispatchRoute(action,ctx){
  const r=routeTransition(G.route.state,G.route.map,action);
  G.route.state=r.state;
  runEffects(r.effects,0,ctx);
}
/* consume effects in order; combat, recap, reward overlays, gate camp, and the
   end screen pause the queue and resume from their own callbacks */
function runEffects(effects,i,ctx){
  for(;i<effects.length;i++){
    const e=effects[i];
    if(e.type==='fight'){G.route.combat={nodeId:e.nodeId,enteredGold:G.gold,threat:e.threat,pocketed:0};checkpointActiveRun();startRouteFight(e);return;}
    else if(e.type==='wonFight'){const node=nodeOf(routeMap(),e.nodeId);checkpointActiveRun();
      showFightRecap(true,MONSTERS[node.monId].n,function(){dispatchRoute({type:'settleReward'},ctx);});return;}
    else if(e.type==='lostFight'){const node=nodeOf(routeMap(),e.nodeId);const rest=effects,ni=i+1;checkpointActiveRun();
      showFightRecap(false,MONSTERS[node.monId].n,function(){runEffects(rest,ni,ctx);});return;}
    else if(e.type==='reward'){const rest=effects,ni=i+1;routeReward(e,function(){runEffects(rest,ni,ctx);});return;}
    else if(e.type==='slip'){toast('You slip past. Lost '+e.cost+' Resolve.');checkpointActiveRun();}
    else if(e.type==='market'){enterRouteMarket(e.nodeId);return;}
    else if(e.type==='marketDone'){G.route.market=null;G.phase='routeMap';checkpointActiveRun();}
    else if(e.type==='event'){checkpointActiveRun();routeEventCard(e);return;}
    else if(e.type==='eventDone'){G.phase='routeMap';checkpointActiveRun();}
    else if(e.type==='gateCamp'){G.phase='gateCamp';checkpointActiveRun();renderAll();return;}
    else if(e.type==='end'){routeEnd(e.cause);return;}
  }
  /* every pausing effect returns above, so reaching here means the queue
     resolved back to the road (a slip, a settled reward, a left market, or a
     finished event); the prior screen may still be the fight, so force the map */
  G.phase='routeMap';renderAll();
}

/* ---- combat adapter: reuse startFight, feed it a route-built foe ---- */
function startRouteFight(e){
  const M=MONSTERS[e.monId];
  const php=fightHP(e.threat,G.T.hpFlat,G.A);
  const foe=monsterSide(e.monId,{gold:G.gold,round:e.threat,A:G.A,gilded:!!e.gilded,playerBoard:G.board,playerHp:php});
  const me={nm:'You',portrait:G.you.p,hp:php,items:playerFightItems(G.board,G.T,G.A,1),lifesteal:G.T.lifesteal||0,regen:boardRegen(G.board)};
  startFight(me,foe,{seed:e.fightSeed,threat:e.threat,caption:'Threat '+e.threat,boss:!!e.boss,
    stormAt:M.stormAt?M.stormAt*1000:0,onEnd:function(F){endRouteFight(F,e);}});
}
function endRouteFight(F,e){
  if(F.lotPaid){G.gold+=F.lotPaid;toast('The Auctioneer paid you '+F.lotPaid+' gold.');}
  if(G.route.combat)G.route.combat.pocketed=F.pocketed||0;
  /* the enemy's surviving item tiers, from the engine (fight items carry .tier,
     not .id, so the old ITEMS[it.id] lookup counted every survivor as tier 1) */
  dispatchRoute({type:'fightResult',winner:F.winner,survTier:F.survTiers('b')});
}
function routeReward(e,cont){
  const c=G.route.combat||{};
  settleMonsterReward({mid:e.monId,gilded:e.gilded,baseGold:e.gold,minGold:0,
    enteredGold:c.enteredGold||0,pocketed:c.pocketed||0,
    cont:function(){G.route.combat=null;checkpointActiveRun();cont();}});
}

/* ---- the opening stall: spend the six starting gold before the first forced
   Monster Door, so every hero sets out with a board. Not a route node; leaving
   it just enters District I. ---- */
function enterOpeningMarket(){
  G.route.opening=true;G.route.market={nodeId:'__opening__',rollIndex:0};
  G.rng=mulberry(fightSeed(G.seed,'__opening__',0));
  G.frozen=false;G.shopSel=null;G.sel=null;G.vsel=null;G.swapV=null;G.dockV=false;
  rollShop();
  G.phase='draft';checkpointActiveRun();renderAll();
}
function leaveOpeningMarket(){
  G.route.opening=false;G.route.market=null;
  G.phase='routeMap';checkpointActiveRun();renderAll();
}
/* ---- market node: reuse the draft, deterministic keyed stock ---- */
function enterRouteMarket(nodeId){
  G.route.market={nodeId:nodeId,rollIndex:0};
  G.rng=mulberry(fightSeed(G.seed,nodeId,0));
  G.frozen=false;G.shopSel=null;G.sel=null;G.vsel=null;G.swapV=null;G.dockV=false;
  rollShop();
  G.phase='draft';checkpointActiveRun();renderAll();
}

/* ---- noncombat events. Treasure is the full three-choice node; Rest, Shrine,
   and Negotiation carry a single intentional outcome until their own versions
   land (Rest -> Mend/Temper/Refit, Shrine -> three choices, Negotiation ->
   persona offers). ---- */
function routeEventDesc(t){
  return t==='rest'?'Mend, Temper, or Refit.'
    :t==='treasure'?'Choose one of three face-up rewards.'
    :t==='shrine'?'From the Ashes, Trial by Flame, or Cast Off the Old.'
    :'A merchant offers three bargains, or walk away.';
}
const TKIND={gold:{t:'Six Gold',g:'g-coin'},ware:{t:'Free Ware',g:'g-gem'},enchant:{t:'Enchant Kit',g:'g-magma'},silver:{t:'Gild a Ware',g:'g-whetstone'}};
function treasureDesc(k){
  return k==='gold'?'Six gold, no strings.':k==='ware'?'A free ware waits at the next market.'
    :k==='enchant'?'Etch a legal enchant onto a ware.':'Raise one ware to the next rarity.';
}
/* event rolls draw from a stream keyed to the node and choice, not the mutable
   G.rng, so a reload reproduces the same reward instead of inventing a new one */
function eventRng(nodeId,tag){return mulberry(fightSeed(G.seed,nodeId,tag));}
function grantFreeWare(rng){
  rng=rng||G.rng;
  const ids=Object.keys(ITEMS).filter(function(id){return gateOK(ITEMS[id].tier,G.tier)&&!ITEMS[id].unique&&!ITEMS[id].inc;});
  if(!ids.length){G.gold+=4;toast('No ware fits. 4 gold instead.');return;}
  const id=ids[Math.floor(rng()*ids.length)];
  G.shop.push({id:id,free:true,bought:false});
  toast('A free '+ITEMS[id].n+' waits at the next market.');
}
function grantEnchantKit(rng){
  rng=rng||G.rng;
  for(let i=0;i<G.board.length;i++){
    const it=G.board[i];if(it.ench)continue;const d=ITEMS[it.id];
    const opts=Object.keys(ENCH).filter(function(e){const req=ENCH[e].need;return !req||(req==='dmg'?!!(d.fx&&d.fx.dmg):d.cd>0);});
    if(opts.length){const e=opts[Math.floor(rng()*opts.length)];it.ench=e;toast(ENCH[e].n+' etched onto '+d.n);return;}
  }
  G.gold+=4;toast('No ware to enchant. 4 gold instead.');
}
function applyTreasure(kind,cont,nodeId){
  if(kind==='ware'){grantFreeWare(eventRng(nodeId,'tware'));cont();}
  else if(kind==='enchant'){grantEnchantKit(eventRng(nodeId,'tench'));cont();}
  else if(kind==='silver'){openGild('Raise one ware a rarity step.',cont);}
  else{G.gold+=6;toast('Six gold.');cont();}
}
function routeTreasureCard(node){
  const opts=(node.reward&&node.reward.options)?node.reward.options:[{kind:'gold'}];
  const o=ovOpen('<div class="card"><div class="rays"></div><div class="kick gold">Treasure</div>'
   +'<h2 class="big">Choose Your Spoils</h2><p>Take one; the rest stay buried.</p>'
   +'<div class="picks">'+opts.map(function(op,i){const k=TKIND[op.kind]||TKIND.gold;
      return '<div class="pick" data-t="'+i+'"><div class="ph2">'+ic(k.g,'','width:28px;height:28px')+'</div><div class="pn">'+k.t+'</div><div class="pd">'+treasureDesc(op.kind)+'</div></div>';
    }).join('')+'</div></div>');
  o.querySelectorAll('.pick').forEach(function(p){p.onclick=function(){
    const kind=opts[+p.dataset.t].kind;ovClose(o);
    applyTreasure(kind,function(){dispatchRoute({type:'resolveEvent',outcome:'treasure'});},node.id);
  };});
}
/* a generic pick-one card for route events; each choice runs its own effect and
   completes the node through the controller */
function choiceCard(kick,title,sub,choices){
  const o=ovOpen('<div class="card"><div class="rays"></div><div class="kick gold">'+esc(kick)+'</div>'
   +'<h2 class="big">'+esc(title)+'</h2>'+(sub?'<p>'+esc(sub)+'</p>':'')
   +'<div class="picks">'+choices.map(function(c,i){
      return '<div class="pick" data-c="'+i+'"><div class="pn">'+esc(c.label)+'</div><div class="pd">'+esc(c.desc)+'</div></div>';
    }).join('')+'</div></div>');
  o.querySelectorAll('.pick').forEach(function(p){p.onclick=function(){const c=choices[+p.dataset.c];ovClose(o);c.onPick();};});
}
/* pick one board ware (destroy, sell, etc.) */
function pickWare(msg,onPick){
  if(!G.board.length){toast('No wares to choose.');return false;}
  const o=ovOpen('<div class="card"><div class="rays"></div><div class="kick gold">Choose a Ware</div>'
   +'<h2 class="big" style="font-size:21px">'+esc(msg)+'</h2>'
   +'<div class="picks">'+G.board.map(function(it,i){const d=ITEMS[it.id];
      return '<div class="pick" data-i="'+i+'"><div class="ph2">'+ic('g-'+it.id,'','width:28px;height:28px')+'</div><div class="pn">'+RNAME[it.rarity]+' '+d.n+'</div></div>';
    }).join('')+'</div></div>');
  o.querySelectorAll('.pick').forEach(function(p){p.onclick=function(){const i=+p.dataset.i;ovClose(o);onPick(i);};});
  return true;
}
function completeEvent(t,delta){dispatchRoute({type:'resolveEvent',resolveDelta:delta||0,outcome:t});}
function routeRestCard(node){
  choiceCard('Rest',nodeLabel(node),'Choose one.',[
    {label:'Mend',desc:'Restore 8 Resolve.',onPick:function(){toast('You make camp. +8 Resolve.');completeEvent('mend',8);}},
    {label:'Temper',desc:'Etch a legal enchant onto a ware.',onPick:function(){grantEnchantKit(eventRng(node.id,'temper'));completeEvent('temper');}},
    {label:'Refit',desc:'Next tier costs 4 less, plus a free reroll next market.',onPick:function(){G.tierCost=Math.max(1,G.tierCost-4);G.freeReroll=true;toast('Refit: a cheaper tier and a free reroll.');completeEvent('refit');}}
  ]);
}
function routeShrineCard(node){
  choiceCard('Quqnus Shrine',nodeLabel(node),'The shrine asks a price.',[
    {label:'From the Ashes',desc:'Restore 12 Resolve.',onPick:function(){toast('The Quqnus renews you. +12 Resolve.');completeEvent('ashes',12);}},
    {label:'Trial by Flame',desc:'Lose 6 Resolve, gild one ware a rarity step.',onPick:function(){
      openGild('Trial by Flame: gild one ware.',function(){completeEvent('trial',-6);});
    }},
    {label:'Cast Off the Old',desc:'Destroy a ware: gain 8 gold and drop the next tier to 1.',onPick:function(){
      const did=pickWare('Cast off which ware?',function(i){G.board.splice(i,1);G.gold+=8;G.tierCost=1;toast('Cast off. +8 gold, next tier costs 1.');completeEvent('castoff');});
      if(!did){G.gold+=8;G.tierCost=1;toast('Nothing to cast off. +8 gold, next tier costs 1.');completeEvent('castoff');}
    }}
  ]);
}
function routeNegotiationCard(node){
  const per=PERSONAS[node.persona]||PERSONAS[0];
  choiceCard(per.n,'A Merchant Bargains','Accept one offer, or walk away.',[
    {label:'Quick Sale',desc:'Take 6 gold on the spot.',onPick:function(){G.gold+=6;toast('+6 gold.');completeEvent('nego');}},
    {label:'Fresh Stock',desc:'Pay 3 gold for a free ware at the next market.',onPick:function(){if(G.gold>=3){G.gold-=3;grantFreeWare(eventRng(node.id,'fresh'));}else{toast('Not enough gold for that.');}completeEvent('nego');}},
    {label:'Walk Away',desc:'Keep your coin and your wares.',onPick:function(){completeEvent('nego');}}
  ]);
}
function routeEventCard(e){
  const node=e.node;const t=node.type;
  if(t==='treasure')return routeTreasureCard(node);
  if(t==='rest')return routeRestCard(node);
  if(t==='shrine')return routeShrineCard(node);
  if(t==='negotiation')return routeNegotiationCard(node);
  completeEvent(t);
}

/* ---- the production map screen: a positioned braid over a painted district ---- */
function routeBountyText(n){
  const b=MONSTERS[n.monId].bounty||{};const parts=[];
  if(b.gold)parts.push((b.gold*(n.gilded?2:1))+' gold');
  if(b.items)parts.push(b.items.map(function(id){return ITEMS[id]?ITEMS[id].n:id;}).join(', '));
  if(b.relic)parts.push('income relic');
  if(b.mote)parts.push('a free copy of your commonest ware');
  if(b.gild)parts.push('gild a ware');
  if(b.pickUnique)parts.push('pick any unique');
  return parts.length?parts.join(', '):'coin';
}
/* preview pane: header, scrollable body, pinned action footer */
function routeNodePreviewHTML(n){
  let acts;
  if(n.type==='monster')acts='<button class="btn gold" data-a="challenge">Challenge</button>'
    +'<button class="btn" data-a="slip">Slip Past &middot; '+DISTRICTS[n.district-1].slip+' Resolve</button>';
  else if(n.type==='elite')acts='<button class="btn gold" data-a="challenge">Challenge the Elite</button>';
  else if(n.type==='boss')acts='<button class="btn gold" data-a="challenge">Face the Boss</button>';
  else if(n.type==='market')acts='<button class="btn gold" data-a="enter">Enter the Market</button>';
  else acts='<button class="btn gold" data-a="enter">Enter</button>';
  let info;
  if(isCombat(n))info='<div class="rmpi">Fresh fight health, scaled to Threat '+n.threat+'.</div>'
    +'<div class="rmpi"><b>Bounty:</b> '+esc(routeBountyText(n))+'</div>'
    +(n.gilded?'<div class="rmpi gild">Gilded: tougher board, double gold.</div>':'')
    +(n.type==='boss'?'<div class="rmpi">The district boss. No way past but through.</div>':'');
  else if(n.type==='market')info='<div class="rmpi">Buy, sell, reroll, freeze, tier, fuse, and vault.</div>';
  else info='<div class="rmpi">'+esc(routeEventDesc(n.type))+'</div>';
  const kind=n.type==='boss'?'District Boss':cap(n.type);
  return '<div class="rmphead"><span class="rmpg">'+ic(nodeGlyph(n),'rmpgi')+'</span>'
    +'<div><div class="rmpname">'+esc(nodeLabel(n))+'</div><div class="rmptype">'+kind+' &middot; Threat '+n.threat+'</div></div></div>'
    +'<div class="rmpbody">'+info+'</div>'
    +'<div class="rmpfoot">'+acts+'</div>';
}
function renderRouteMap(){
  const map=routeMap(),st=routeState();
  const di=currentDistrict(st,map),D=map.districts[di];
  const fr=frontier(st,map),frS=new Set(fr),vis=visitedSet(st),sel=G.route.selectedId;
  const beaten=st.path.filter(function(id){return /boss$/.test(id);}).length;
  const nodeBtn=function(n){
    const state=vis.has(n.id)?'done':(frS.has(n.id)?'reach':'future');
    const a=nodeAnchor(n);
    return '<button class="rmnode t-'+n.type+' '+state+(n.id===sel?' sel':'')+(n.gilded?' gild':'')+(n.type==='boss'?' boss':'')+'"'
      +(state==='reach'?'':' disabled')+' data-n="'+n.id+'" style="left:'+a.x+'%;top:'+a.y+'%" aria-label="'+esc(nodeLabel(n))+', Threat '+n.threat+'">'
      +'<span class="rmmed">'+ic(nodeGlyph(n),'rmg')+'</span>'
      +'<span class="rmn">'+esc(nodeLabel(n))+'</span>'
      +(n.gilded?'<span class="rmstar">'+ic('g-gem','','width:11px;height:11px')+'</span>':'')+'</button>';
  };
  let nodes='';
  D.columns.forEach(function(col){col.forEach(function(n){nodes+=nodeBtn(n);});});
  nodes+=nodeBtn(D.boss);
  let pips='';for(let i=0;i<4;i++){pips+='<span class="rmpip'+(i<beaten?' on':'')+(i===di?' cur':'')+'"></span>';}
  const prev=sel?routeNodePreviewHTML(map.nodes[sel]):'<div class="rmhint">Tap a lit node to scout it.</div>';
  $('main').className='routemap';
  $('main').innerHTML='<div class="rmwrap">'
    +'<div class="rmboard" style="background-image:linear-gradient(180deg,rgba(20,14,8,.28),rgba(14,9,5,.62)),url(art/bg/bg_route_'+DBG[D.id]+'.png)">'
    +'<div class="rmhdr"><span class="rmdn">'+esc(D.name)+'</span><span class="rmpips">'+pips+'</span>'
    +'<span class="rmdest">'+esc(MONSTERS[D.boss.monId].n)+' waits at the gate</span></div>'
    +'<div class="rmplot" id="rmplot"><svg class="rmedges" id="rmedges" preserveAspectRatio="none" aria-hidden="true"></svg>'+nodes+'</div>'
    +'</div>'
    +'<div class="rmprev" id="rmprev">'+prev+'</div></div>';
  document.querySelectorAll('.rmnode:not([disabled])').forEach(function(bn){
    bn.onclick=function(){G.route.selectedId=bn.dataset.n;renderRouteMap();};});
  const p=$('rmprev');
  if(p&&sel){const n=map.nodes[sel];
    p.querySelectorAll('[data-a]').forEach(function(b){b.onclick=function(){
      const act=b.dataset.a;G.route.selectedId=null;
      dispatchRoute({type:'commit',nodeId:n.id,choice:act==='slip'?'slip':'challenge'});
    };});}
  drawConnectors();
  ensureRouteObserver();
}
/* draw the braid connectors from the real node centers, so the curves track the
   positioned plot across safe areas and resizes; the layer never takes input */
function drawConnectors(){
  if(G.mode!=='route'||G.phase!=='routeMap')return;
  const plot=$('rmplot'),svg=$('rmedges');if(!plot||!svg)return;
  const map=routeMap(),st=routeState();
  const D=map.districts[currentDistrict(st,map)];
  const pr=plot.getBoundingClientRect();if(!pr.width)return;
  svg.setAttribute('viewBox','0 0 '+pr.width+' '+pr.height);
  const center=function(id){const el=plot.querySelector('[data-n="'+id+'"]');if(!el)return null;const r=el.getBoundingClientRect();return {x:r.left-pr.left+r.width/2,y:r.top-pr.top+r.height/2};};
  let out='';
  classifyEdges(st,D).forEach(function(e){
    const a=center(e.from),b=center(e.to);if(!a||!b)return;
    const mx=(a.x+b.x)/2;
    const d='M'+a.x+' '+a.y+' C'+mx+' '+a.y+' '+mx+' '+b.y+' '+b.x+' '+b.y;
    out+='<path d="'+d+'" class="edge under"/><path d="'+d+'" class="edge '+e.state+'"/>';
  });
  svg.innerHTML=out;
}
let _rmObs=null;
function ensureRouteObserver(){
  if(_rmObs||typeof ResizeObserver==='undefined')return;
  const plot=$('rmplot');if(!plot)return;
  _rmObs=new ResizeObserver(function(){drawConnectors();});
  _rmObs.observe(plot);
}
function renderGateCamp(){
  const st=routeState();const node=nodeOf(routeMap(),st.pendingId);
  $('main').className='routemap';
  $('main').innerHTML='<div class="rmwrap"><div class="rmboard gate">'
    +ic(MONSTERS[node.monId].glyph,'bigic')
    +'<div class="rmdname">Gate Camp</div>'
    +'<p style="text-align:center;margin:6px 0">'+esc(MONSTERS[node.monId].n)+' holds the gate. Resolve '+Math.max(0,st.resolve)+'.</p>'
    +'<div class="rmpacts"><button class="btn gold" id="gcRetry">Rally and Retry</button></div></div>'
    +'<div class="rmprev"><div class="rmhint">Rearranging the stall and emergency options arrive with the full Gate Camp.</div></div></div>';
  const r=$('gcRetry');if(r)r.onclick=function(){dispatchRoute({type:'startBossRetry'});};
}
function routeEnd(cause){
  G.phase='routeEnd';clearRoute();music(null);
  const result=cause==='won'?'win':'loss';
  const endBtns='<div style="display:flex;gap:8px;justify-content:center;margin-top:10px">'
   +'<button class="btn" id="reRpt">Copy Run Report</button>'
   +'<button class="btn gold" id="reGo">New Run</button></div>';
  let o;
  if(cause==='won'){
    sting('fanfarewin');if(!RM)fxCoinRain();
    o=ovOpen('<div class="card"><div class="rays"></div><div class="kick gold">The Long Bazaar</div>'
     +ic('g-crown','bigic')+'<h2 class="big">The Vizier Falls</h2>'
     +'<p>You walked the whole road. The night market is yours.</p>'+endBtns+'</div>');
  }else{
    sting('lament');
    const st=routeState();const D=DISTRICTS[currentDistrict(st,routeMap())];
    o=ovOpen('<div class="card"><div class="rays red"></div><div class="kick">The Road Ends</div>'
     +ic('g-skull','bigic skullic')+'<h2 class="big bad">Resolve Spent</h2>'
     +'<p>Your caravan broke in '+esc(D.name)+' after '+st.path.length+' encounter'+(st.path.length===1?'':'s')+'.</p>'+endBtns+'</div>');
  }
  o.querySelector('#reRpt').onclick=function(){copyText(routeRunReport(result),o.querySelector('#reRpt'));};
  o.querySelector('#reGo').onclick=function(){ovClose(o);newRoute();};
}
/* resume a saved route at whatever phase it stopped */
function restoreRoute(d){
  const anom=ANOMALIES.filter(function(a){return a.id===d.run.anom;})[0]||ANOMALIES[0];
  const map=genMap(d.run.seed);
  if(!validRoute(d.routeState,map)){clearRoute();openIntro();return;}
  G={mode:'route',seed:d.run.seed,rng:mulberry((d.run.seed+(d.run.fightN||0)*2654435761+7)>>>0),round:0,
     anom:anom,A:Object.assign({},ANONE,anom.m),tags:d.run.tags,
     board:d.run.board.map(reviveItem),vault:(d.run.vault||[]).map(reviveItem),
     shop:d.run.shop.slice(),trinkets:d.run.trinkets.map(function(id){return TRINKETS.filter(function(t){return t.id===id;})[0];}).filter(Boolean),
     T:null,hero:d.run.hero||null,gold:d.run.gold,tier:d.run.tier,tierCost:d.run.tierCost,relicIncome:d.run.relicIncome,frozen:!!d.run.frozen,freeReroll:!!d.run.freeReroll,
     stats:{slain:0,driven:0,safe:0},sel:null,vsel:null,swapV:null,shopSel:null,dockV:false,tut:null,
     phase:'routeMap',fightN:d.run.fightN||0,fiv:null,F:null,recap:null,you:{n:'You',p:'p-0'},
     route:{map:map,state:d.routeState,selectedId:null,market:d.market||null,combat:d.combat||null,opening:!!d.opening}};
  const H=heroOf();if(H)G.you.p=H.g;
  computeT();
  resumeRoutePhase();
  toast('Run resumed');
}
function resumeRoutePhase(){
  const st=routeState();
  if(G.route.opening){G.phase='draft';renderAll();return;}   /* the opening stall */
  if(st.phase==='encounter'&&st.pendingId){
    const n=nodeOf(routeMap(),st.pendingId);
    startRouteFight({nodeId:n.id,monId:n.monId,threat:n.threat,gilded:n.gilded,boss:n.type==='boss',fightSeed:st.fightSeed});
  }else if(st.phase==='reward'){dispatchRoute({type:'settleReward'});}
  else if(st.phase==='market'){G.phase='draft';renderAll();}
  else if(st.phase==='event'){const n=nodeOf(routeMap(),st.pendingId);routeEventCard({node:n});}
  else if(st.phase==='gateCamp'){G.phase='gateCamp';renderAll();}
  else{G.phase='routeMap';renderAll();}
}
function openRouteContinue(d){
  const map=genMap(d.run.seed);
  const di=validRoute(d.routeState,map)?currentDistrict(d.routeState,map):0;
  const o=ovOpen('<div class="card"><div class="rays"></div>'
   +'<div class="kick gold">The Lantern Still Burns</div>'+ic('g-lantern','bigic')
   +'<h2 class="big">The Road Waits</h2>'
   +'<p>Your caravan rests in <b>'+esc(DISTRICTS[di].name)+'</b> with <b>'+Math.max(0,d.routeState.resolve)+'</b> Resolve.</p>'
   +'<div style="display:flex;gap:8px;justify-content:center;margin-top:10px">'
   +'<button class="btn gold" id="ctGo">Continue Run</button>'
   +'<button class="btn" id="ctNew">New Run</button></div></div>');
  o.querySelector('#ctGo').onclick=function(){ovClose(o);restoreRoute(d);};
  o.querySelector('#ctNew').onclick=function(){ovClose(o);clearRoute();newRoute();};
}
function heroOf(){return G&&G.hero?HEROES.filter(function(h){return h.id===G.hero;})[0]:null;}
function computeT(){
  G.T={weaponFlat:0,poisonMul:1,burnMul:1,shieldMul:1,healMul:1,cdMul:1,hpFlat:0,income:0,lifesteal:0,firstDouble:false,firstFlat:0};
  const H=heroOf();
  const mods=(H?[H.mod]:[]).concat(G.trinkets.map(function(t){return t.mod;}));
  for(let i=0;i<mods.length;i++){
    const m=mods[i];
    if(m.firstFlat)G.T.firstFlat+=m.firstFlat;
    if(m.weaponFlat)G.T.weaponFlat+=m.weaponFlat;
    if(m.poisonMul)G.T.poisonMul*=m.poisonMul;
    if(m.burnMul)G.T.burnMul*=m.burnMul;
    if(m.shieldMul)G.T.shieldMul*=m.shieldMul;
    if(m.healMul)G.T.healMul*=m.healMul;
    if(m.cdMul)G.T.cdMul*=m.cdMul;
    if(m.hpFlat)G.T.hpFlat+=m.hpFlat;
    if(m.income)G.T.income+=m.income;
    if(m.lifesteal)G.T.lifesteal+=m.lifesteal;
    if(m.firstDouble)G.T.firstDouble=true;
  }
}
/* Threat is the combat difficulty dial. Today it tracks the round one to one;
   the route layer will map map-node depth to Threat so noncombat nodes do not
   inflate fight health or storm timing. Fed to fightHP and stormAt everywhere. */
function runThreat(){
  if(G&&G.mode==='route'&&G.route){const st=G.route.state;if(st.pendingId)return nodeOf(G.route.map,st.pendingId).threat;}
  return G.round;
}
function openGild(msg,cont){
  if(!G.board.length){G.gold+=5;toast('No wares to gild. 5 gold instead.');if(cont)cont();renderAll();return;}
  const o=ovOpen('<div class="card"><div class="rays"></div>'
   +'<div class="kick gold">Gilding</div>'
   +'<h2 class="big" style="font-size:23px">'+msg+'</h2>'
   +'<div class="picks">'+G.board.map(function(it,i){
      const d=ITEMS[it.id];
      return '<div class="pick" data-g="'+i+'"'+(it.rarity>=3?' style="opacity:.4"':'')+'><div class="ph2">'+ic('g-'+it.id,'','width:28px;height:28px')+'</div><div class="pn">'+RNAME[it.rarity]+' '+d.n+'</div><div class="pd">'+(it.rarity>=3?'Already Diamond':('to '+RNAME[it.rarity+1]))+'</div></div>';
    }).join('')+'</div></div>');
  o.querySelectorAll('.pick').forEach(function(p){
    p.onclick=function(){
      const it=G.board[+p.dataset.g];
      if(it.rarity>=3)return;
      it.rarity++;
      toast('Gilded: '+RNAME[it.rarity]+' '+ITEMS[it.id].n);
      fuseScan(G.board);fuseWithVault();
      ovClose(o);if(cont)cont();renderAll();
    };
  });
}
function openUniquePick(msg,cont){
  /* never offer a unique the player already holds, on the board or
     waiting unbought in the market */
  const ids=Object.keys(ITEMS).filter(function(id){
    return ITEMS[id].unique
      &&!G.board.some(function(b){return b.id===id;})
      &&!G.shop.some(function(w){return w.id===id&&!w.bought;});
  });
  if(!ids.length){G.gold+=10;toast('The vault is bare. 10 gold instead.');renderAll();if(cont)cont();return;}
  const o=ovOpen('<div class="card"><div class="rays"></div>'
   +'<div class="kick gold">The Vault</div>'
   +'<h2 class="big" style="font-size:23px">'+msg+'</h2>'
   +'<div class="picks">'+ids.map(function(id){
      const d=ITEMS[id];
      return '<div class="pick" data-u="'+id+'"><div class="ph2">'+ic('g-'+id,'','width:28px;height:28px')+'</div><div class="pn">'+d.n+'</div><div class="pd">'+d.d+'</div></div>';
    }).join('')+'</div></div>');
  o.querySelectorAll('.pick').forEach(function(p){
    p.onclick=function(){
      G.shop.push({id:p.dataset.u,free:true,bought:false});
      toast(ITEMS[p.dataset.u].n+' waits in the market, free.');
      ovClose(o);renderAll();if(cont)cont();
    };
  });
}
function coinRain(box){
  if(RM||!box)return;
  for(let i=0;i<24;i++){
    const s=document.createElementNS('http://www.w3.org/2000/svg','svg');
    s.innerHTML='<use href="#g-coin"/>';
    s.style.left=(Math.random()*100)+'%';
    s.style.animationDuration=(1.1+Math.random()*1.4)+'s';
    s.style.animationDelay=(Math.random()*1.2)+'s';
    box.appendChild(s);
  }
}
/* the run report: one tap turns a finished run into an Obsidian
   callout with dataview inline fields, ready to paste into the
   standing playtest note */
function showReport(txt){
  const o=ovOpen('<div class="card"><div class="kick gold">Run Report</div>'
   +'<textarea class="rpt" readonly></textarea>'
   +'<p style="font-size:10px;color:var(--dim)">Tap the text to select it, copy, then tap outside to close</p></div>');
  const ta=o.querySelector('.rpt');ta.value=txt;
  ta.onclick=function(){ta.focus();ta.select();ta.setSelectionRange(0,txt.length);};
  o.onclick=function(e){if(e.target===o)ovClose(o);};
}
/* copy any report text to the clipboard, falling back to execCommand and then
   to a selectable panel when the clipboard is refused (iOS standalone) */
function copyText(txt,btn){
  const done=function(ok){if(ok){if(btn)btn.textContent='Copied';}else{showReport(txt);}};
  const fallback=function(){
    const ta=document.createElement('textarea');ta.value=txt;ta.style.position='fixed';ta.style.opacity='0';
    document.body.appendChild(ta);ta.focus();ta.select();
    let ok=false;try{ok=document.execCommand('copy');}catch(e){}
    ta.remove();done(ok);
  };
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(function(){done(true);},fallback);}
    else{fallback();}
  }catch(e){fallback();}
}
/* the route run report: real Obsidian YAML frontmatter so a pasted note is
   queryable in a vault, for tracking balance results across runs */
function routeRunReport(result){
  const st=routeState(),map=routeMap(),H=heroOf();
  const di=currentDistrict(st,map);
  const bosses=st.path.filter(function(id){return /boss$/.test(id);}).length;
  const item=function(it){return RNAME[it.rarity]+' '+(it.ench?ENCH[it.ench].n+' ':'')+ITEMS[it.id].n;};
  const yList=function(arr,fn){return arr.length?arr.map(function(x){return '\n  - '+fn(x);}).join(''):' []';};
  const L=[
   '---',
   'game: Tavern Bash',
   'mode: The Long Bazaar',
   'version: '+pkg.version,
   'date: '+new Date().toISOString().slice(0,16).replace('T',' '),
   'result: '+result,
   'hero: '+(H?H.n:'none'),
   'omen: '+G.anom.n,
   'featured: '+CATN[G.tags[0]]+', '+CATN[G.tags[1]],
   'district_reached: '+DISTRICTS[di].name,
   'bosses_beaten: '+bosses,
   'nodes_visited: '+st.path.length,
   'resolve: '+Math.max(0,st.resolve),
   'resolve_max: '+st.resolveMax,
   'gold: '+G.gold,
   'tier: '+G.tier,
   'board:'+yList(G.board,item),
   'vault:'+yList(G.vault,item),
   'charms:'+yList(G.trinkets,function(t){return t.n;}),
   '---',
   '',
   (result==='win'
     ?'Cleared the Long Bazaar and felled the Grand Vizier.'
     :'The caravan broke in '+DISTRICTS[di].name+' after '+st.path.length+' encounter'+(st.path.length===1?'':'s')+'.')
  ];
  return L.join('\n');
}
function openHeroPick(cont){
  /* selected-hero layout: a portrait rail up top, one large hero with its
     rule below, and a Confirm. Scales to eight heroes where the old grid
     clipped at four on a short landscape screen. */
  /* the Moneylender's whole identity is income, which is dead in route; hold it
     out of the picker until the hero rework */
  const pool=HEROES.filter(function(h){return h.id!=='lender';});
  let sel=pool[0].id;
  const o=ovOpen('<div class="card heropick"><div class="rays"></div>'
   +'<div class="kick gold">Choose Your Merchant</div>'
   +'<div class="herorail" id="herorail"></div>'
   +'<div class="herodetail" id="herodetail"></div>'
   +'<button class="btn gold" id="heroGo" style="width:100%;margin-top:11px">Take the Stall</button></div>');
  function draw(){
    const h=pool.filter(function(x){return x.id===sel;})[0];
    o.querySelector('#herorail').innerHTML=pool.map(function(x){
      return '<button class="herochip'+(x.id===sel?' on':'')+'" data-h="'+x.id+'" aria-label="'+esc(x.n)+'" style="--cat:'+CATC[x.tag]+'">'+ic(x.g,'hpr')+'</button>';
    }).join('');
    o.querySelector('#herodetail').innerHTML=
      '<div class="hdportrait" style="--cat:'+CATC[h.tag]+'">'+ic(h.g,'hpbig')+'</div>'
      +'<div class="hdbody"><div class="hdname">'+esc(h.n)+'</div>'
      +'<div class="hdtag" style="color:'+CATC[h.tag]+'">Favors '+CATN[h.tag]+'</div>'
      +'<div class="hddesc">'+h.d+'</div>'
      +(h.start?'<div class="hdstart">'+ic('g-'+h.start,'mi')+' Starts with '+ITEMS[h.start].n+'</div>':'')+'</div>';
    o.querySelectorAll('.herochip').forEach(function(c){c.onclick=function(){sel=c.dataset.h;draw();};});
  }
  draw();
  o.querySelector('#heroGo').onclick=function(){
    const h=HEROES.filter(function(x){return x.id===sel;})[0];
    G.hero=h.id;G.you.p=h.g;
    if(h.start){G.board.push(makeItem(h.start,0));}
    computeT();
    toast(h.n+' opens the stall');
    ovClose(o);cont();
  };
}
/* ============ BOOT ============ */
function initEmbers(){
  if(RM)return;
  const box=$('embers');
  for(let i=0;i<14;i++){
    const e=document.createElement('div');e.className='ember';
    e.style.left=(Math.random()*100)+'%';
    e.style.animationDuration=(7+Math.random()*8)+'s';
    e.style.animationDelay=(Math.random()*9)+'s';
    e.style.setProperty('--dx',(((Math.random()*60-30)|0))+'px');
    const sz=(2.5+Math.random()*3)+'px';
    e.style.width=sz;e.style.height=sz;
    box.appendChild(e);
  }
}
/* the title screen: Robbie's painted intro. Two stone plaques, New Game
   and Tutorial. Falls straight through to the lobby when the painted
   art has not landed (tests, art-less checkouts). */
function openIntro(){
  /* The Long Bazaar is the only game now. Both painted plaques start a route;
     a route-native tutorial is owed (the old lobby coach was deleted in 0.68). */
  if(!ART['bg-intro']){newRoute();return;}
  const o=document.createElement('div');o.id='intro';
  o.innerHTML='<div class="ititle">Tavern Bash</div>'
   +'<div class="ibtns">'
   +'<button class="stonebtn" id="inNew">New Game</button>'
   +'<button class="stonebtn" id="inTut">Tutorial</button>'
  +'</div>';
  document.body.appendChild(o);
  o.querySelector('#inNew').onclick=function(){o.remove();newRoute();};
  o.querySelector('#inTut').onclick=function(){o.remove();newRoute();};
}
/* the debug strip: ?debug in the URL (or bb-debug=1 in storage) pins a
   tiny readout to the corner: build tag, PWA vs browser tab, viewport,
   fps, and a count of elements leaking past the viewport edge. Exists
   so phone screenshots label themselves. */
function initDebug(){
  let on=false;
  try{on=/(^|[?&])debug/.test(location.search)||window.localStorage.getItem('bb-debug')==='1';}catch(e){}
  if(!on)return;
  const d=document.createElement('div');d.id='dbg';d.textContent='debug';
  document.body.appendChild(d);
  let tag='?';
  fetch('/sw.js').then(function(r){return r.text();}).then(function(t){const m=t.match(/CACHE_V\s*=\s*'([^']+)'/);if(m)tag=m[1];}).catch(function(){});
  let frames=0,fps=0,last=performance.now();
  function raf(){frames++;const now=performance.now();if(now-last>=1000){fps=frames;frames=0;last=now;}requestAnimationFrame(raf);}
  requestAnimationFrame(raf);
  setInterval(function(){
    let over=0;const dw=document.documentElement.clientWidth;
    document.querySelectorAll('#app *').forEach(function(el){const r=el.getBoundingClientRect();if(r.width&&(r.right>dw+1||r.left<-1))over++;});
    const standalone=(typeof matchMedia!=='undefined'&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;
    d.textContent=tag+' '+(standalone?'PWA':'TAB')+' '+window.innerWidth+'x'+window.innerHeight+' '+fps+'fps ovf '+over;
  },1000);
}
export function boot(){
  RM=(typeof matchMedia!=='undefined')&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  initDebug();
  const mb=$('muteBtn');
  if(mb){
    if(sfxMuted())mb.classList.add('off');
    mb.onclick=function(){const m=sfxToggle();mb.classList.toggle('off',m);musicMute(m);};
  }
  initMusic(sfxMuted());
  initEmbers();
  const dr=loadRoute();
  /* a saved route resumes; otherwise the title */
  if(dr){music('market');openRouteContinue(dr);}
  else{music('title');openIntro();}
  /* dev-only hooks for driving playtests from the console; the guard
     matches the service worker's, so the live site never carries them */
  if(typeof location!=='undefined'&&location.hostname.match(/^(localhost|127\.)/)){
    globalThis.BBDEV={g:function(){return G;},rollShop:rollShop,renderAll:renderAll,
      openUniquePick:openUniquePick,bark:bark,music:music,musicNow:musicNow,
      newRoute:newRoute,dispatchRoute:dispatchRoute,frontier:function(){return frontier(G.route.state,G.route.map);},
      routeState:function(){return G.route.state;}};
  }
}
