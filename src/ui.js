"use strict";
import {TICK,SPEED,RSTAT,RNAME,BASEINTEG,COST,SELLV,TIERCOST,CATN,CATC,ANONE,
        ITEMS,TRINKETS,ANOMALIES,MONSTERS,ENCH,ENCH_CHANCE,ENCH_PREMIUM,HEROES} from './data.js';
import {mulberry,fightHP,stormAt,gateOK,makeItem,integOf,fuseScan,fuseNeed,usedCells,
        playerFightItems,monsterSide,createFight,boardRegen} from './engine.js';
import {genMap,MAP_VERSION} from './map.js';
import {frontier,nodeOf,lossDamage,fightSeed,validRoute,BASE_GOLD} from './route.js';
import {ROUTE_SAVE_VERSION,readRouteSave,writeRouteSave,clearRouteSave} from './route-save.js';
import {planReward} from './route-rewards.js';
import {newRun,advance as advanceRun,serializeRun,reviveRun,bindEconomy,allocId,ensureIdFloor} from './route-run.js';
import {rewardKey,settleFixed,refreshPendingChoice,nextPresentation} from './route-runtime.js';
import {ic} from './art.js';
import {effChips,wareDetailHTML} from './cards.js';
import {ART} from './art-manifest.js';
import {fxHit,fxDestroy,fxForge,fxStorm} from './fx.js';
import {sHit,sTick,sDestroy,sForge,sCoin,sFanfare,sWin,sLose,sCreak,sStorm,sfxToggle,sfxMuted} from './sfx.js';
import {initMusic,music,musicMute,sting,musicNow} from './music.js';
import pkg from '../package.json';
import {G,setG,RM,setRM,store,$,esc,ovOpen,ovClose,toast} from './ui-core.js';
import {wireRouteUI,routeMap,routeState,renderRouteMap,renderGateCamp,showFightRecap,
        routeEventCard,openRewardChoice,routeEnd,openRouteContinue,openUniquePick} from './route-ui.js';
/* ============ SESSION + UI PRIMITIVES ============ */
/* G (the game aggregate) and RM (reduced-motion) are the shared live singletons
   from ui-core; ui.js is the only writer, via setG/setRM below. */
let FSPD=(function(){try{return +window.localStorage.getItem('bb-speed')||1;}catch(e){return 1;}})();
if(FSPD!==2)FSPD=1;
/* ============ SAVES ============ */
/* the envelope shape, version gate, and storage IO live in route-save.js;
   snapshotRoute below still gathers the payload from the live G */
function reviveItem(b){const it=makeItem(b.id,b.rarity,b.ench||null);it.size=b.size;it.iid=(b.iid!=null?b.iid:allocId(G.run));return it;}
/* durable-identity factories: every owned ware gets an iid, every shop offer an
   offerId, both from the run's single counter (allocId). A bought offer keeps
   its offerId as a tombstone while its board ware carries a different iid, so
   the two never collide. Fusion outputs are freshly stamped; consumed ids are
   never reused. All wrap the engine's makeItem/fuseScan without touching them. */
function mkWare(id,rarity,ench){const it=makeItem(id,rarity,ench||null);it.iid=allocId(G.run);return it;}
function mkOffer(o){o.offerId=allocId(G.run);return o;}
/* revive a saved shop offer: copy an existing offerId (a future v2 save) or
   stamp a fresh one (a pre-id save), keeping the offer's other fields */
function reviveOffer(o){const c=Object.assign({},o);if(c.offerId==null)c.offerId=allocId(G.run);return c;}
function fuseStamp(board){const forged=fuseScan(board);forged.forEach(function(f){f.iid=allocId(G.run);});return forged;}
function shuffle(a,rng){for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));const t=a[i];a[i]=a[j];a[j]=t;}return a;}
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
  const st=routeState();const H=heroOf();
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
    const forged=fuseStamp(G.board);
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
  const forged=fuseStamp(G.board);
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
    const forged=fuseStamp(G.board);
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
  G.board.push(mkWare(w.id,0,w.ench));
  const forged=fuseStamp(G.board);
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
function rollShop(){
  /* free bounty cards always carry over; a frozen shop keeps its paid
     cards too, counted against the roll, then the freeze is spent */
  const freeKeep=G.shop?G.shop.filter(function(w){return w.free&&!w.bought;}):[];
  const frozenKeep=(G.frozen&&G.shop)?G.shop.filter(function(w){return !w.free&&!w.bought;}):[];
  G.frozen=false;
  const n=Math.max(0,G.A.shopN-frozenKeep.length);
  /* income wares are dead in route mode (income() never runs), so keep them out
     of route shops until the approved rework gives them route semantics */
  const ids=Object.keys(ITEMS).filter(function(id){return gateOK(ITEMS[id].tier,G.tier)&&!ITEMS[id].unique&&(G.mode!=='route'||!ITEMS[id].inc);});
  const hTag=heroOf()?heroOf().tag:null;
  const out=[];
  for(let k=0;k<n;k++){
    let tot=0;
    const ws=ids.map(function(id){
      const d=ITEMS[id];
      let w=d.tier===1?8:(d.tier===2?7:6);
      if(G.tags.indexOf(d.cat)>=0)w*=2.2;
      if(hTag===d.cat)w*=2.2;
      const own=G.board.filter(function(x){return x.id===id&&x.rarity===0;}).length;
      if(own===1||own===2)w*=1.6;
      tot+=w;return w;
    });
    let r=G.rng()*tot,pick=ids[0];
    for(let i=0;i<ids.length;i++){r-=ws[i];if(r<=0){pick=ids[i];break;}}
    let ench=null;
    /* no enchanted wares in the Back Alleys (early Threat): early gold is
       too tight to ever afford the premium */
    if(runThreat()>=4&&G.rng()<ENCH_CHANCE){
      const d2=ITEMS[pick];
      const opts=Object.keys(ENCH).filter(function(e){
        const req=ENCH[e].need;
        return !req||(req==='dmg'?!!(d2.fx&&d2.fx.dmg):d2.cd>0);
      });
      if(opts.length){ench=opts[Math.floor(G.rng()*opts.length)];}
    }
    out.push(mkOffer({id:pick,free:false,bought:false,ench:ench}));
  }
  G.shop=frozenKeep.concat(out).concat(freeKeep);
  G.shopFresh=true;
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
/* monster reward settlement (R4 commit 4b). The fixed payout (gold, bounty
   offers, relic, mote) applies exactly once behind a receipt keyed on run, node,
   and attempt; an owed gild/unique choice is serialized into run.pendingChoice.
   Ordering is crash-safe: apply fixed -> set receipt + pendingChoice -> one
   checkpoint -> only then open the overlay or present the map. A reload reopens
   an interrupted choice rather than re-paying. The event gild path (Treasure,
   Trial) is separate and keeps its own simpler overlay. */
function settleRouteReward(e){
  const c=G.route.combat||{};
  const M=MONSTERS[e.monId];
  const key=rewardKey(G.run.runId,e.nodeId,c.attempt||0);
  const already=!!(G.run.receipts[key]&&G.run.receipts[key].fixedApplied);
  const plan=planReward(M.bounty||{},{baseGold:e.gold,gilded:e.gilded,enteredGold:c.enteredGold||0,pocketed:c.pocketed||0,minGold:0,board:G.board});
  settleFixed(G.run,plan,key);
  if(!already){
    if(plan.drained>0){toast('The monkey kept '+plan.drained+' gold of the bounty.');}
    if(plan.relic){toast('Income relic: +1 gold each dawn');}
    if(plan.mote&&plan.mote.gold){toast('The mote found nothing bronze to copy. '+plan.mote.gold+' gold instead.');}
    toast(M.n+' slain. '+plan.gold+' gold'+(plan.items.length?', bounty wares in the market':'')+'.');
    bark('win');
  }
  G.route.combat=null;
  /* write-ahead: economy + receipt + pendingChoice saved before any overlay. If
     the save fails the reward stays correct (a later crash re-settles from the
     clean pre-reward snapshot, and the receipt keeps it exactly once), so we warn
     rather than strand the player. A blocking retry UI is owed as R5 polish. */
  if(!checkpointActiveRun()){toast('Heads up: progress could not be saved.');}
  presentAfterReward();
}
/* present the screen a reward transaction leaves us on: an owed choice reopens,
   a finished run ends (so a final-boss choice resolves before the win screen),
   otherwise back to the map */
function presentAfterReward(){
  const np=nextPresentation(G.run);
  if(np.kind==='choice'){openRewardChoice(np.choice);}
  else if(np.kind==='end'){routeEnd(np.cause);}
  else{G.phase='routeMap';renderAll();}
}
/* ============ THE LONG BAZAAR ROUTE ============ */
/* The route presenters (map, gate camp, event cards, fight recap, reward
   choices, end/continue, run report) and the routeMap/routeState selectors were
   extracted to route-ui.js (R4 commit 5). ui.js keeps the flow, persistence, and
   the shared fight/draft/overlay surface, and imports what it drives from there. */

/* ---- route saves (independent of the lobby save) ---- */
function snapshotRoute(){
  const s=store();if(!s||!G||G.mode!=='route'||!G.run)return;
  /* v2 envelope: the run aggregate is the durable truth (controller state +
     economy + ids all nested), read straight from G.run rather than through the
     G accessors. Wares keep their iid, offers their offerId, so ids are stable
     across a reload. setup and the route session (fightN, market/opening/combat)
     stay durable outside the ten economy fields. G.phase is derived on resume,
     never stored. */
  const item=function(it){return {id:it.id,rarity:it.rarity,size:it.size,ench:it.ench||null,iid:it.iid};};
  const R=G.route,E=G.run.economy;
  const d={saveVersion:ROUTE_SAVE_VERSION,mapVersion:MAP_VERSION,
    run:{schemaVersion:G.run.schemaVersion,runId:G.run.runId,revision:G.run.revision,seed:G.run.seed,
      route:G.run.route,
      economy:{gold:E.gold,tier:E.tier,tierCost:E.tierCost,relicIncome:E.relicIncome,freeReroll:!!E.freeReroll,frozen:!!E.frozen,
        board:E.board.map(item),vault:E.vault.map(item),
        shop:E.shop.map(function(w){return {id:w.id,free:!!w.free,bought:!!w.bought,ench:w.ench||null,offerId:w.offerId};}),
        trinkets:E.trinkets.map(function(t){return t.id;})},
      receipts:G.run.receipts||{},pendingChoice:G.run.pendingChoice||null,
      ids:{nextItem:G.run.ids.nextItem}},
    setup:{hero:G.hero||null,anom:G.anom.id,tags:G.tags.slice()},
    fightN:G.fightN,
    market:R.market?{nodeId:R.market.nodeId,rollIndex:R.market.rollIndex}:null,opening:!!R.opening,
    /* the fight's settlement context, so a reload during a fight or victory
       recap still pays the right bounty (Debt Collector entered gold, Pilfer
       Monkey drain) rather than seeing zero */
    combat:R.combat?{nodeId:R.combat.nodeId,enteredGold:R.combat.enteredGold||0,threat:R.combat.threat||0,pocketed:R.combat.pocketed||0,attempt:R.combat.attempt||0}:null};
  return writeRouteSave(s,d);
}
function loadRoute(){return readRouteSave(store());}
function clearRoute(){clearRouteSave(store());}
/* returns whether the checkpoint was durably written; the reward flow blocks its
   overlay on a false so a crash cannot present an unsaved reward */
function checkpointActiveRun(){return snapshotRoute();}

/* ---- run construction ---- */
function newRoute(){
  const seed=((Date.now()>>>0)^0x9e3779b9)>>>0;
  const rng=mulberry(seed);
  /* Bull Market only scales income, which never pays in route; skip it until
     the omen rework gives it a route-live benefit */
  const anomPool=ANOMALIES.filter(function(a){return a.id!=='bull';});
  const anom=anomPool[Math.floor(rng()*anomPool.length)];
  const cats=['dmg','poison','burn','shield','heal'];shuffle(cats,rng);
  setG({mode:'route',seed:seed,rng:rng,round:0,anom:anom,A:Object.assign({},ANONE,anom.m),tags:[cats[0],cats[1]],
     T:null,hero:null,
     stats:{slain:0,driven:0,safe:0},sel:null,vsel:null,swapV:null,shopSel:null,dockV:false,tut:null,
     phase:'routeMap',fightN:0,fiv:null,F:null,recap:null,you:{n:'You',p:'p-0'},
     run:newRun({seed:seed}),
     route:{map:genMap(seed),selectedId:null,market:null,combat:null,opening:false}});
  bindEconomy(G);   /* gold/tier/board/shop/... now delegate to G.run.economy */
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
  const effects=advanceRun(G.run,routeMap(),action);
  runEffects(effects,0,ctx);
}
/* consume effects in order; combat, recap, reward overlays, gate camp, and the
   end screen pause the queue and resume from their own callbacks */
function runEffects(effects,i,ctx){
  for(;i<effects.length;i++){
    const e=effects[i];
    if(e.type==='fight'){G.route.combat={nodeId:e.nodeId,enteredGold:G.gold,threat:e.threat,pocketed:0,attempt:(routeState().attempts[e.nodeId]||0)};checkpointActiveRun();startRouteFight(e);return;}
    else if(e.type==='wonFight'){const node=nodeOf(routeMap(),e.nodeId);checkpointActiveRun();
      showFightRecap(true,MONSTERS[node.monId].n,function(){dispatchRoute({type:'settleReward'},ctx);});return;}
    else if(e.type==='lostFight'){const node=nodeOf(routeMap(),e.nodeId);const rest=effects,ni=i+1;checkpointActiveRun();
      showFightRecap(false,MONSTERS[node.monId].n,function(){runEffects(rest,ni,ctx);});return;}
    else if(e.type==='reward'){settleRouteReward(e);return;}
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

/* resume a saved route at whatever phase it stopped */
function restoreRoute(d){
  const anom=ANOMALIES.filter(function(a){return a.id===d.setup.anom;})[0]||ANOMALIES[0];
  const map=genMap(d.run.seed);
  if(!validRoute(d.run.route,map)){clearRoute();openIntro();return;}
  setG({mode:'route',seed:d.run.seed,rng:mulberry((d.run.seed+(d.fightN||0)*2654435761+7)>>>0),round:0,
     anom:anom,A:Object.assign({},ANONE,anom.m),tags:d.setup.tags,
     T:null,hero:d.setup.hero||null,
     stats:{slain:0,driven:0,safe:0},sel:null,vsel:null,swapV:null,shopSel:null,dockV:false,tut:null,
     phase:'routeMap',fightN:d.fightN||0,fiv:null,F:null,recap:null,you:{n:'You',p:'p-0'},
     run:reviveRun(d.run),
     route:{map:map,selectedId:null,market:d.market||null,combat:d.combat||null,opening:!!d.opening}});
  /* revive the economy into live objects. Presence checks, not `||`: tierCost 0,
     frozen false, and empty arrays are all valid saved values. reviveItem/
     reviveOffer copy the saved iid/offerId (stable across reload); the id floor
     guards the counter against a stale save. */
  const E=d.run.economy;
  G.run.economy={gold:E.gold,tier:E.tier,tierCost:E.tierCost,relicIncome:E.relicIncome,
     freeReroll:!!E.freeReroll,frozen:!!E.frozen,
     board:E.board.map(reviveItem),vault:(E.vault||[]).map(reviveItem),
     shop:E.shop.map(reviveOffer),trinkets:E.trinkets.map(function(id){return TRINKETS.filter(function(t){return t.id===id;})[0];}).filter(Boolean)};
  ensureIdFloor(G.run);
  bindEconomy(G);
  const H=heroOf();if(H)G.you.p=H.g;
  computeT();
  resumeRoutePhase();
  toast('Run resumed');
}
function resumeRoutePhase(){
  const st=routeState();
  if(G.route.opening){G.phase='draft';renderAll();return;}   /* the opening stall */
  /* an owed reward choice wins over the controller phase: its fixed part is
     already applied (receipt), so reopen the choice rather than re-settle. If
     the choice's targets are gone, the fallback resolves it and we present on. */
  if(G.run.pendingChoice){
    if(refreshPendingChoice(G.run)){openRewardChoice(G.run.pendingChoice);return;}
    checkpointActiveRun();presentAfterReward();return;
  }
  if(st.phase==='encounter'&&st.pendingId){
    const n=nodeOf(routeMap(),st.pendingId);
    startRouteFight({nodeId:n.id,monId:n.monId,threat:n.threat,gilded:n.gilded,boss:n.type==='boss',fightSeed:st.fightSeed});
  }else if(st.phase==='reward'){dispatchRoute({type:'settleReward'});}   /* fixed not saved: re-settle, receipt makes it once */
  else if(st.phase==='market'){G.phase='draft';renderAll();}
  else if(st.phase==='event'){const n=nodeOf(routeMap(),st.pendingId);routeEventCard({node:n});}
  else if(st.phase==='gateCamp'){G.phase='gateCamp';renderAll();}
  else if(st.phase==='won'){routeEnd('won');}   /* a finished run resumes to its end screen, not the map */
  else if(st.phase==='lost'){routeEnd('resolve');}
  else{G.phase='routeMap';renderAll();}
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
  if(G&&G.mode==='route'&&G.run&&G.route){const st=G.run.route;if(st.pendingId)return nodeOf(G.route.map,st.pendingId).threat;}
  return G.round;
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
    if(h.start){G.board.push(mkWare(h.start,0));}
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
  setRM((typeof matchMedia!=='undefined')&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  /* hand the route presenters the flow callbacks that stay in ui.js (dispatch,
     render, persistence, economy, run lifecycle). route-ui never imports ui.js;
     this is the one-way bridge. All targets are hoisted function declarations. */
  wireRouteUI({dispatchRoute:dispatchRoute,renderAll:renderAll,checkpointActiveRun:checkpointActiveRun,
    presentAfterReward:presentAfterReward,fuseStamp:fuseStamp,fuseWithVault:fuseWithVault,
    mkOffer:mkOffer,heroOf:heroOf,newRoute:newRoute,restoreRoute:restoreRoute,clearRoute:clearRoute});
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
      newRoute:newRoute,dispatchRoute:dispatchRoute,frontier:function(){return frontier(G.run.route,G.route.map);},
      routeState:function(){return G.run.route;},
      /* reward-flow hooks so the resume e2e can exercise the gild/unique choice
         branch without walking deep into the route to a choice-bounty monster */
      settleFixed:function(plan,nodeId){var key=rewardKey(G.run.runId,nodeId||'test',0);settleFixed(G.run,plan,key);return key;},
      presentAfterReward:presentAfterReward,checkpoint:checkpointActiveRun};
  }
}
