"use strict";
import {TICK,SPEED,RSTAT,RNAME,BASEINTEG,TIERCOST,CATN,CATC,ANONE,
        ITEMS,TRINKETS,ANOMALIES,MONSTERS,ENCH,ENCH_CHANCE,HEROES,LANTERN,
        shopTagWeight,canSpendGold,heroCreditLimit} from './data.js';
import {mulberry,fightHP,stormAt,gateOK,makeItem,integOf,fuseScan,fuseNeed,
        playerFightItems,createFight,boardRegen} from './engine.js';
import {buildFoe} from './encounter.js';
import {districtAffix,affixFightHooks} from './aspects.js';
import {wareSlotCost,boardUsedCells,boardSlotCount,warePurchaseCost,wareSaleValue,rerollPrice,
        adjustedStormAt,adjustedVictoryIncome,advanceFrozenOffers,setFrozenOffers,thawOffers,
        composeLantern,lanternRules} from './anomaly-rules.js';
import {lanternHighest,lanternMaxPick,recordLanternClear,backfillLanternFromHistory} from './lantern-profile.js';
import {readReportState} from './route-report-store.js';
import {genMap,MAP_VERSION,CONTENT_EPOCH,contentTablesFor} from './map.js';
import {frontier,currentDistrict,nodeOf,lossDamage,fightSeed,validRoute,BASE_GOLD,isGateDistrict} from './route.js';
import {ROUTE_SAVE_VERSION,readRouteSave,writeRouteSave,clearRouteSave} from './route-save.js';
import {planReward,boardVictoryIncome} from './route-rewards.js';
import {attachCharmCheckpoint,charmVictoryIncome} from './route-charms.js';
import {newRun,advance as advanceRun,serializeRun,reviveRun,bindEconomy,allocId,ensureIdFloor,
        campEnsure,campMend,campLastReserve,campExpireCredit,campClear,CAMP_MEND,CAMP_LAST_RESERVE} from './route-run.js';
import {rewardKey,settleFixed,refreshPendingChoice,nextPresentation,ensureMidpointTreasure,midpointTreasureKey} from './route-runtime.js';
import {commitRouteDecision as runtimeCommitRouteDecision} from './route-decisions.js';
import {resumeMetrics,activateMetrics,pauseMetrics,setMetricPhase,touchMetrics,serializeMetrics,recordMetric,
        captureBoardSnapshot,beginCombatTally,recordCombatDiagnostic,commitCombatTally,metricPhaseTotals} from './route-metrics.js';
import {ic} from './art.js';
import {effChips,wareDetailHTML} from './cards.js';
import {ART} from './art-manifest.js';
import {fxHit,fxDestroy,fxForge,fxStorm} from './fx.js';
import {sHit,sTick,sDestroy,sForge,sCoin,sFanfare,sWin,sLose,sCreak,sStorm,sWhoosh,sfxToggle,sfxMuted} from './sfx.js';
import {initMusic,music,musicMute,sting,musicNow} from './music.js';
import pkg from '../package.json';
import {G,setG,RM,setRM,store,$,esc,ovOpen,ovClose,toast} from './ui-core.js';
import {rollShopOffers,pullVaultForges} from './market-core.js';
import {lockedWareComplement,runWareAllowed,omenUnlocked,compatibleOmenPool,heroUnlocked,HERO_HINTS,heroChipAttrs,heroPortraitClass,heroConfirmView,WILD_FIND_EVENT,nextUnlockHint,devAllOpen} from './unlock-profile.js';
import {wireRouteUI,routeMap,routeState,renderRouteMap,combatPreview,showFightRecap,districtBgToken,
        prepareRouteDecision,routeEventCard,openRewardChoice,routeEnd,openRouteContinue,openUniquePick,
        openRunHistory} from './route-ui.js';
import {initCloudLedger} from './cloud-ledger.js';
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
function fuseStamp(board){const forged=fuseScan(board);forged.forEach(function(f){f.iid=allocId(G.run);
  metricEvent('fusion',{id:f.id,rarity:f.rarity,iid:f.iid});});return forged;}
function shuffle(a,rng){for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));const t=a[i];a[i]=a[j];a[j]=t;}return a;}
function shake(){if(RM)return;const a=$('app');a.classList.remove('shake');void a.offsetWidth;a.classList.add('shake');}
function flashScr(){if(RM)return;const f=$('flash');f.classList.remove('go');void f.offsetWidth;f.classList.add('go');}

function metricDistrict(phase){
  if(!G||!G.run||!G.route)return 1;const st=G.run.route;
  if(phase==='map')return currentDistrict(st,G.route.map)+1;
  const id=st.pendingId||(st.path&&st.path[st.path.length-1]);const n=id&&G.route.map&&G.route.map.nodes[id];
  return n?n.district:1;
}
function metricPhase(name){if(G&&G.run&&G.run.metrics)setMetricPhase(G.run.metrics,name,metricDistrict(name),Date.now());}
function metricEvent(type,data){if(G&&G.run&&G.run.metrics)recordMetric(G.run.metrics,type,data,Date.now());}
function metricSnapshot(label,context){if(G&&G.run&&G.run.metrics)return captureBoardSnapshot(G.run.metrics,label,context,G.board,G.vault,G.run.economy,Date.now());}
let metricVisibilityBound=false;
function bindMetricVisibility(){
  if(metricVisibilityBound||typeof document==='undefined')return;metricVisibilityBound=true;
  document.addEventListener('visibilitychange',function(){if(!G||!G.run||!G.run.metrics)return;
    if(document.hidden)pauseMetrics(G.run.metrics,Date.now());else activateMetrics(G.run.metrics,Date.now());});
  if(typeof window!=='undefined')window.addEventListener('pagehide',function(){if(G&&G.run&&G.run.metrics)pauseMetrics(G.run.metrics,Date.now());});
}
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
  const footprint=slotCost(it.size);
  const pair=it.rarity<3&&G&&G.board&&G.board.filter(function(x){return x.id===it.id&&x.rarity===it.rarity;}).length===2;
  return '<div class="cell it s'+it.size+' rar'+it.rarity+(sel?' sel':'')+(pair?' pair':'')+'" style="grid-column:span '+footprint+';--cat:'+CATC[d.cat]+'" data-i="'+i+'">'
   +'<div class="glow"></div>'+ic('g-'+it.id,'gi')
   +(ps?'<span class="stat sl '+ps[0]+'">'+ps[1]+'</span>':'')
   +'<span class="stat sr">'+Math.round(integOf(it)*(G.A.itemIntegrityMul||1))+'</span>'
   +(d.bulwark?ic('e-shield','bw'):'')
   +(it.rarity>0?'<span class="fuse">'+RNAME[it.rarity].charAt(0)+'</span>':'')
   +(it.ench?'<i class="edot" style="background:'+ENCH[it.ench].c+'"></i>':'')
  +'</div>';
}
function boardHTML(board,slots,selIdx){
  let h='';
  if(!board.length){h+='<div class="bhint">Your wares fight from here</div>';}
  board.forEach(function(it,i){h+=cellHTML(it,i,i===selIdx);});
  const used=usedNow(board);
  for(let c=used;c<slots;c++){h+='<div class="cell empty'+(c===used?' nxt':'')+'"></div>';}
  for(let c=slots;c<10;c++){h+='<div class="cell lock"></div>';}
  return '<div class="board" id="bd">'+h+'</div>';
}
function fightCellHTML(fi,i,side){
  const ps=primStat(fi);const col=CATC[fi.cat]||CATC.util;
  return '<div class="cell f s'+fi.size+' rar'+fi.rarity+(fi.alive?'':' dead')+'" id="fc-'+side+'-'+i+'" style="grid-column:span '+(fi.slotSize||fi.size)+';--cat:'+col+';--fc:'+col+';--rc:'+col+'">'
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
  const debt=G.gold<0&&H&&H.mod&&H.mod.rerollBlockedInDebt?-G.gold:0;
  /* 0.107.0 dealer crest: the hero is the HUD. Portrait, name, and favored
     trade anchor the left; Resolve and Gold ride attached; Tier, Omen, and
     Charms demote to a quieter strip below. Same data, new anatomy. */
  $('ribbon').innerHTML=
    '<div class="crestrow">'
     +'<div class="heroP">'+ic(H?H.g:'p-0','hpv')+'</div>'
     +'<div class="crestwho"><span class="cnm">'+esc(H?H.n.replace(/^The /,''):'The Dealer')+'</span>'
       +'<span class="cfav">'+(H?'Favors '+H.tag:'Night trader')+'</span></div>'
     +'<div class="crestres">'
       +'<div class="chip hp"><span class="val">'+ic('g-heart','ci')+Math.max(0,st.resolve)+'</span></div>'
       +'<div class="chip gold"><span class="val">'+ic('g-coin','ci')+G.gold+'</span></div>'
     +'</div>'
    +'</div>'
   +'<div class="creststrip">'
    +(debt?'<div class="chip"><span class="lab">Debt due next reward</span><span class="val">'+debt+'g</span><span class="lab2">No rerolls. Unpaid debt costs '+H.mod.debtLobbyDamage+' Resolve per gold.</span></div>':'')
    +'<div class="chip"><span class="lab">Tier</span><span class="val">'+ic('g-gem','ci')+G.tier+'</span></div>'
    +'<button class="chip act grow" id="chipAno"><span class="lab">Omen</span><span class="lab2">'+G.anom.n+'</span></button>'
    +(G.trinkets.length?'<button class="chip act" id="chipTrk"><span class="lab">Charms</span><span class="val">'+G.trinkets.map(function(t){return ic(t.g,'ci');}).join('')+'</span></button>':'')
   +'</div>';
  const ab=$('chipAno');if(ab)ab.onclick=openAnoInfo;
  const cb=$('chipTrk');if(cb)cb.onclick=openTrkInfo;
}
function openAnoInfo(){
  /* the Lantern's active rules live under the Omen so both run modifiers read
     from one place; composed values so the text never lies at L5+ */
  const lv=(G.run&&G.run.lantern)||0;
  const lant=lv?'<div class="lantrules"><div class="kick gold" style="margin-top:8px">Lantern '+lv+'</div>'
    +lanternRules(lv).map(function(r){return '<p class="lline"><b>'+esc(r.n)+'</b> '+esc(r.d)+'</p>';}).join('')
    +(G.A0&&G.A.shopN!==G.A0.shopN?'<p class="lline lit">Markets show '+G.A.shopN+' wares tonight.</p>':'')+'</div>':'';
  /* the current district's Affix rides under the Omen, the slot the Lantern rules
     use, so both run modifiers read from one place. Absent on the Gate and pre-stamp runs. */
  let affBlock='';
  if(G.run&&G.run.route&&G.run.route.affix&&G.route&&G.route.map){
    const map=routeMap(),D=map.districts[currentDistrict(routeState(),map)];
    const aff=districtAffix(D,map.seed);
    if(aff)affBlock='<div class="lantrules"><div class="kick gold" style="margin-top:8px">District Affix</div>'
      +'<p class="lline"><b>'+esc(aff.w)+'</b> '+esc(aff.d)+'</p></div>';
  }
  const o=ovOpen('<div class="card"><div class="rays"></div><div class="kick">Tonight\'s Omen</div>'
   +ic(G.anom.g,'bigic')+'<h2 class="big" style="font-size:25px">'+G.anom.n+'</h2>'
   +'<p>'+G.anom.d+'</p><p>Featured wares: <b>'+CATN[G.tags[0]]+' + '+CATN[G.tags[1]]+'</b></p>'
   +lant+affBlock
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
  const cost=w.free?0:buyCost(d.size,!!w.ench);
  const footprint=slotCost(d.size);
  const can=!w.bought&&(w.free||canSpend(cost))&&(usedNow(G.board)+footprint<=slotsNow());
  const own=G.board.filter(function(x){return x.id===w.id&&x.rarity===0;}).length
    +G.vault.filter(function(x){return x.id===w.id&&x.rarity===0;}).length;
  const trip=own>=2&&!w.bought;
  const match=own===1&&!w.bought;
  let gems='';for(let g=0;g<d.tier;g++){gems+=ic('g-gem');}
  let pips='';for(let s=1;s<=3;s++){pips+='<i class="'+(s<=footprint?'on':'')+'"></i>';}
  const en=w.ench?ENCH[w.ench]:null;
  const anim=G._wfresh?';animation-delay:'+(i*45)+'ms':';animation:none';
  const alab=esc(d.n)+(w.bought?' (bought)':', '+(w.free?'free':cost+' gold'));
  return '<div class="ware'+(w.bought?' gone':(can?'':' cant'))+(en?' enchw':'')+(trip?' trip':'')+(match?' match':'')+(G.shopSel===i?' sel':'')+((G.frozen||w.hold>0)&&!w.bought?' icew':'')+'" data-w="'+i+'" role="button" tabindex="0" aria-label="'+alab+'" style="--cat:'+CATC[d.cat]+(en?';--ec:'+en.c:'')+anim+'">'
   +'<div class="ph">'+ic('g-'+w.id,'gi')+'<span class="cost'+(w.free?' free':'')+'">'+ic('g-coin')+'<b>'+(w.free?'FREE':cost)+'</b></span></div>'
   +'<div class="tg">'+gems+'</div>'
   +'<div class="wn">'+(en?'<span style="color:'+en.c+'">'+en.n+'</span> ':'')+d.n+'</div>'
   +'<div class="sz">'+pips+'<span class="szl">'+(footprint===1?'1 slot':footprint+' slots')+'</span></div>'
   +'<div class="chips">'+effChips(w.id,0)+(en?'<span class="eff util" style="color:'+en.c+'">'+ic('e-bolt','mi')+' '+en.d+'</span>':'')+(w.hold?'<span class="eff util">'+ic('e-frost','mi')+' Held '+w.hold+' more market'+(w.hold===1?'':'s')+'</span>':'')+(trip?'<span class="eff trip">'+ic('e-bolt','mi')+' Forges Silver</span>':(match?'<span class="eff mt">'+ic('e-bolt','mi')+' You own 1</span>':''))+'</div>'
   +'<div class="wd">'+esc(d.d)+'</div>'
   +'<div class="wr">'+(d.cd>0?ic('e-clock','mi')+' every '+d.cd+'s':'<span>passive</span>')+'<span>'+ic('e-shield','mi')+' '+Math.round(BASEINTEG[d.size]*(d.integMul||1)*(G.A.itemIntegrityMul||1))+'</span></div>'
   +(own>0?'<div class="own">'+own+'/3</div>':'')
  +'</div>';
}
function renderVaultSheet(sh){
  const it=G.vault[G.vsel];
  const room=usedNow(G.board)+slotCost(it.size)<=slotsNow();
  sh.innerHTML='<div class="sheet">'+wareDetailHTML(it,G.A)
   +'<div class="bs"><button class="btn" id="vOut"'+(room?'':' disabled')+'>To the Stall</button>'
   +'<button class="btn" id="vSwp"'+(G.board.length?'':' disabled')+'>Swap</button>'
   +'<button class="btn sell" id="vSl">Sell +'+sellValue(it.size)+'</button></div></div>';
  const O=$('vOut');if(O)O.onclick=function(){
    if(usedNow(G.board)+slotCost(it.size)>slotsNow())return;
    G.vault.splice(G.vsel,1);G.vsel=null;G.board.push(it);
    metricEvent('vault_out',{id:it.id,iid:it.iid});
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
    const value=sellValue(it.size);G.gold+=value;G.vault.splice(G.vsel,1);G.vsel=null;recordMarketSale();
    metricEvent('shop_sell',{id:it.id,iid:it.iid,value:value,from:'vault'});
    toast('Sold from the vault for '+value+' gold');renderAll();
    if(from){flyCoins(from,3+value);}
  };
}
function vaultSwap(i){
  const vi=G.swapV;const inIt=G.vault[vi];const outIt=G.board[i];
  if(!inIt||!outIt){G.swapV=null;renderDraft();return;}
  if(usedNow(G.board)-slotCost(outIt.size)+slotCost(inIt.size)>slotsNow()){toast('No room for that trade');return;}
  G.vault[vi]=outIt;G.board[i]=inIt;G.swapV=null;G.sel=null;
  metricEvent('vault_swap',{outId:outIt.id,outIid:outIt.iid,inId:inIt.id,inIid:inIt.iid});
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
  sh.innerHTML='<div class="sheet">'+wareDetailHTML(it,G.A)
   +'<div class="bs"><button class="btn" id="mvL"'+(G.sel===0?' disabled':'')+'>&#9664; Move</button>'
   +'<button class="btn" id="mvR"'+(G.sel>=G.board.length-1?' disabled':'')+'>Move &#9654;</button>'
   +'<button class="btn" id="vtI"'+(G.vault.length>=vaultSlots()?' disabled':'')+'>Vault</button>'
   +'<button class="btn sell" id="slI">Sell +'+sellValue(it.size)+'</button></div></div>';
  const L=$('mvL');if(L)L.onclick=function(){if(G.sel>0){const t=G.board[G.sel];G.board[G.sel]=G.board[G.sel-1];G.board[G.sel-1]=t;G.sel--;
    metricEvent('board_reorder',{iid:t.iid,direction:'left',index:G.sel});renderDraft();}};
  const R=$('mvR');if(R)R.onclick=function(){if(G.sel<G.board.length-1){const t=G.board[G.sel];G.board[G.sel]=G.board[G.sel+1];G.board[G.sel+1]=t;G.sel++;
    metricEvent('board_reorder',{iid:t.iid,direction:'right',index:G.sel});renderDraft();}};
  const S=$('slI');if(S)S.onclick=function(){
    const cell=document.querySelector('#bd .cell.it[data-i="'+G.sel+'"]');
    const from=cell?cell.getBoundingClientRect():null;
    const value=sellValue(it.size);G.gold+=value;G.board.splice(G.sel,1);G.sel=null;recordMarketSale();
    /* vaultFull marks a sell the player could not park instead (L9 telemetry) */
    metricEvent('shop_sell',{id:it.id,iid:it.iid,value:value,from:'board',vaultFull:G.vault.length>=vaultSlots()});
    toast('Sold for '+value+' gold');renderAll();
    if(from){flyCoins(from,3+value);}
  };
  const V=$('vtI');if(V)V.onclick=function(){
    if(G.vault.length>=vaultSlots()){metricEvent('vault_full_reject',{id:it.id,iid:it.iid,slots:vaultSlots()});return;}
    G.vault.push(it);G.board.splice(G.sel,1);G.sel=null;
    metricEvent('vault_in',{id:it.id,iid:it.iid});
    toast(ITEMS[it.id].n+' stored in the vault');renderAll();
  };
}
function renderDraft(){
  const camp=G.phase==='gateCamp';
  const slots=slotsNow(),used=usedNow(G.board);
  let h='<div class="stage" id="stage">';
  if(camp){
    h+=campTopHTML();
  }else{
    G._wfresh=G.shopFresh!==false;G.shopFresh=false;
    h+='<div class="sec secmarket"><div class="label">The Curio Stall<span class="side">'+(G.tier<2?'Tier 2 wares locked':(G.tier<4?'Tier 4 wares locked':'All wares open'))+'</span></div>';
    h+='<div class="shop">'+G.shop.map(function(w,i){return wareHTML(w,i);}).join('')+'</div>';
    h+='<div class="controls">'
      +'<button class="btn" id="btnTier"'+((G.tier>=6||!canSpend(G.tierCost))?' disabled':'')+'>'+ic('g-gem','bi')+' '+(G.tier>=6?'Tier Max':((slotsNow(G.tier+1)>slotsNow()?'+1 slot &middot; ':'')+'Tier '+(G.tier+1)+' &middot; '+G.tierCost+'g'))+'</button>'
      +'<button class="btn" id="btnRe"'+(rerollAllowed()?'':' disabled')+'>'+ic('g-coin','bi')+' '+(G.A.rerollDisabled?'Rerolls Closed':'Reroll '+currentRerollCost())+'</button>'
      +'<button class="btn frz'+(G.frozen?' iceon':'')+(G.A.freezeDisabled?' failed':'')+'" id="btnFrz"'+(G.A.freezeDisabled?' aria-disabled="true"':'')+'>'+ic('e-frost','bi')+' '+freezeButtonLabel()+'</button>'
    +'</div></div>';
  }
  h+='</div>';
  const goHTML=camp?campRetryBtnHTML():('<button class="btn gold tob" id="btnGo">'+ic('g-lantern','bi vsp')+'<span class="tbt"><span class="tbl">'+(G.route.opening?'Set out':'Leave')+'</span><span class="tbn">'+(G.route.opening?'onto the road':'back to the road')+'</span></span></button>');
  h+='<div class="dock"><div class="docktop"><div class="label" style="margin:0">'+(G.dockV?'The Vault':'Your Stall')
   +'<span class="side">'+(G.dockV?'no fights, no forging':(G.swapV!=null?'tap a ware to trade with the vault':used+' / '+slots+' slots'))+'</span></div>'
   +'<button class="btn mini" id="dockFlip">'+(G.dockV?'Stall':'Vault'+(G.vault.length?' ('+G.vault.length+')':''))+'</button>'
   +goHTML+'</div>';
  if(G.dockV){
    h+='<div class="vault" id="vlt">'+G.vault.map(function(it,i){
        const d=ITEMS[it.id];
        return '<div class="cell it s1 rar'+it.rarity+(G.vsel===i?' sel':'')+'" style="--cat:'+CATC[d.cat]+'" data-v="'+i+'">'
         +'<div class="glow"></div>'+ic('g-'+it.id,'gi')
         +'<span class="stat sr">'+integOf(it)+'</span>'
         +(it.ench?'<i class="edot" style="background:'+ENCH[it.ench].c+'"></i>':'')
         +(it.rarity>0?'<span class="fuse">'+RNAME[it.rarity].charAt(0)+'</span>':'')+'</div>';
      }).join('');
    for(let v=G.vault.length;v<vaultSlots();v++){h+='<div class="cell empty"></div>';}
    /* L9 The Locked Shelf: the missing capacity is visible, not mysterious */
    for(let v=vaultSlots();v<3;v++){h+='<div class="cell empty locked" title="The third shelf is locked for the night"><span class="lockmark">&#215;</span></div>';}
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
  if(camp){
    document.querySelectorAll('.ware[data-c]').forEach(function(w){
      w.onclick=function(){campSelectWare(+w.dataset.c);};
      w.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();campSelectWare(+w.dataset.c);}};
    });
    const bm=$('btnMend');if(bm)bm.onclick=campMendClick;
    const bl=$('btnReserve');if(bl)bl.onclick=campReserveClick;
    const ci=$('campInspect');if(ci)ci.onclick=campInspect;
    const bg=$('btnGo');if(bg)bg.onclick=function(){campExpireCredit(G.run);dispatchRoute({type:'startBossRetry'});};
  }else{
    document.querySelectorAll('.ware[data-w]').forEach(function(w){
      w.onclick=function(){selectWare(+w.dataset.w);};
      w.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();selectWare(+w.dataset.w);}};
    });
    const bt=$('btnTier');if(bt)bt.onclick=tierUp;
    const br=$('btnRe');if(br)br.onclick=reroll;
    const bf=$('btnFrz');if(bf)bf.onclick=toggleFreeze;
    const bg=$('btnGo');if(bg)bg.onclick=G.route.opening?leaveOpeningMarket:function(){dispatchRoute({type:'leaveMarket'});};
  }
  renderSheet();
  snapshotRoute();
}
/* ============ THE GATE CAMP (camp-mode draft) ============ */
/* a lost district boss holds the player at the gate. The camp reuses the draft's
   board/vault/sheet (reorder, sell, vault all free) and swaps the market top for a
   three-offer Quartermaster plus Mend and Last Reserve, and the To Battle button
   for Rally & Retry. Retry itself is free; the boss-loss chip is the real cost, so
   the loss range is shown. No boss skip. State + tuning live in route-run.js. */
function campTopHTML(){
  const st=routeState();const node=nodeOf(routeMap(),st.pendingId);
  const M=MONSTERS[node.monId];
  const camp=campEnsure(G.run,node,G.tier,G.hero);
  const credit=camp.credit||0;
  return '<div class="sec secmarket"><div class="label">Gate Camp<span class="side">'+esc(M.n)+' bars the gate</span></div>'
    +'<button class="campboss" id="campInspect">'+ic(M.glyph,'campbi')
      +'<span class="campbt"><span class="campbn">'+esc(M.n)+'</span><span class="campbs">Threat '+node.threat+' &middot; tap to scout the board</span></span></button>'
    +'<div class="label" style="margin-top:9px">Quartermaster'+(credit?'<span class="side">'+credit+' credit</span>':'<span class="side">shore up your board</span>')+'</div>'
    +'<div class="shop">'+camp.offers.map(function(o,i){return campWareHTML(o,i,credit);}).join('')+'</div>'
    +'<div class="controls">'
      +'<button class="btn" id="btnMend"'+((camp.mendUsed||!canSpend(CAMP_MEND.cost))?' disabled':'')+'>'+ic('g-heart','bi')+' Mend &middot; '+CAMP_MEND.cost+'g, +'+CAMP_MEND.gain+'</button>'
      +'<button class="btn" id="btnReserve"'+((G.run.lastReserveUsed||st.resolve<=CAMP_LAST_RESERVE.resolve)?' disabled':'')+'>'+ic('g-skull','bi')+' Last Reserve</button>'
    +'</div></div>';
}
function campRetryBtnHTML(){
  const st=routeState();const node=nodeOf(routeMap(),st.pendingId);
  const lo=lossDamage(node,0,routeMap()),hi=lossDamage(node,12,routeMap());
  return '<button class="btn gold tob" id="btnGo">'+ic('g-medallion','bi vsp')
    +'<span class="tbt"><span class="tbl">Rally &amp; Retry</span><span class="tbn">defeat costs '+lo+' to '+hi+' Resolve</span></span></button>';
}
function campWareHTML(o,i,credit){
  const d=ITEMS[o.id];const cost=buyCost(d.size,false),footprint=slotCost(d.size);
  const fromGold=cost-Math.min(credit,cost);
  const can=!o.bought&&(usedNow(G.board)+footprint<=slotsNow())&&canSpend(fromGold);
  let gems='';for(let g=0;g<d.tier;g++){gems+=ic('g-gem');}
  let pips='';for(let s=1;s<=3;s++){pips+='<i class="'+(s<=footprint?'on':'')+'"></i>';}
  return '<div class="ware'+(o.bought?' gone':(can?'':' cant'))+'" data-c="'+i+'" role="button" tabindex="0" aria-label="'+esc(d.n)+(o.bought?' (bought)':', '+cost+' gold')+'" style="--cat:'+CATC[d.cat]+'">'
   +'<div class="ph">'+ic('g-'+o.id,'gi')+'<span class="cost">'+ic('g-coin')+'<b>'+(o.bought?'&mdash;':cost)+'</b></span></div>'
   +'<div class="tg">'+gems+'</div>'
   +'<div class="wn">'+d.n+'</div>'
   +'<div class="sz">'+pips+'<span class="szl">'+(footprint===1?'1 slot':footprint+' slots')+'</span></div>'
   +'<div class="chips">'+effChips(o.id,0)+'</div>'
   +'<div class="wd">'+esc(d.d)+'</div>'
  +'</div>';
}
function campSelectWare(i){
  const camp=G.run.camp;if(!camp||G.phase!=='gateCamp')return;
  const o=camp.offers[i];if(!o||o.bought)return;
  const d=ITEMS[o.id];const cost=buyCost(d.size,false);const credit=camp.credit||0;const fromGold=cost-Math.min(credit,cost);
  const room=usedNow(G.board)+slotCost(d.size)<=slotsNow();const afford=canSpend(fromGold);const can=afford&&room;
  const why=!afford?'Not enough gold':(!room?'No room on your stall':'');
  const payLbl=(fromGold<cost)?('Buy &middot; '+(cost-fromGold)+' credit'+(fromGold?' + '+fromGold+'g':'')):'Buy &middot; '+cost+'g';
  const ov=ovOpen('<div class="card inspectcard"><div class="kick gold">Quartermaster</div>'
   +'<div class="sheet">'+wareDetailHTML({id:o.id,rarity:0,size:d.size,ench:null},G.A)
   +'<div class="bs"><button class="btn buy'+(can?'':' cant')+'" id="cBuy"'+(can?'':' disabled')+'>'+ic('g-coin','bi')+' '+payLbl+'</button>'
   +'<button class="btn" id="cClose">Close</button></div>'
   +(why?'<div class="whyno">'+why+'</div>':'')+'</div></div>');
  const b=ov.querySelector('#cBuy');if(b)b.onclick=function(){ovClose(ov);campBuy(i);};
  const c=ov.querySelector('#cClose');if(c)c.onclick=function(){ovClose(ov);};
  ov.onclick=function(ev){if(ev.target===ov)ovClose(ov);};
}
function campBuy(i){
  if(G.phase!=='gateCamp')return;
  const camp=G.run.camp;if(!camp)return;
  const o=camp.offers[i];if(!o||o.bought)return;
  const d=ITEMS[o.id];const cost=buyCost(d.size,false);
  if(usedNow(G.board)+slotCost(d.size)>slotsNow()){toast('No room on your stall');return;}
  const credit=camp.credit||0;const fromCredit=Math.min(credit,cost);const fromGold=cost-fromCredit;
  if(!canSpend(fromGold)){toast('Not enough gold');return;}
  camp.credit=credit-fromCredit;G.gold-=fromGold;o.bought=true;sCoin();
  const bought=mkWare(o.id,0);G.board.push(bought);
  metricEvent('shop_buy',{id:o.id,iid:bought.iid,cost:fromGold,credit:fromCredit,free:false,source:'gate_camp'});
  const forged=fuseStamp(G.board);fuseWithVault();
  if(forged.length){forged.forEach(function(f){toast('Forged: '+RNAME[f.rarity]+' '+ITEMS[f.id].n);});sForge();sting('forgesting');}
  else{toast(d.n+' joins your stall.');}
  renderDraft();
}
function campMendClick(){
  const r=campMend(G.run,heroCreditLimit(heroOf()));
  if(!r.ok){toast(r.reason==='gold'?'Not enough gold to Mend.':'Already mended at this gate.');return;}
  toast('Mended. +'+CAMP_MEND.gain+' Resolve.');
  renderRibbon();renderDraft();
}
function campReserveClick(){
  const st=routeState();
  if(G.run.lastReserveUsed){toast('The Last Reserve is spent for this run.');return;}
  if(st.resolve<=CAMP_LAST_RESERVE.resolve){toast('Too little Resolve to risk the Last Reserve.');return;}
  const ov=ovOpen('<div class="card"><div class="rays red"></div><div class="kick">Last Reserve</div>'
   +ic('g-skull','bigic skullic')+'<h2 class="big" style="font-size:21px">Spend the Reserve?</h2>'
   +'<p>Lose '+CAMP_LAST_RESERVE.resolve+' Resolve now and '+CAMP_LAST_RESERVE.maxCut+' maximum Resolve for the rest of the run, for '+CAMP_LAST_RESERVE.credit+' Quartermaster credit. Once per run. The boss must still fall.</p>'
   +'<div style="display:flex;gap:8px;justify-content:center;margin-top:10px">'
   +'<button class="btn gold" id="lrGo">Spend it</button><button class="btn" id="lrNo">Keep it</button></div></div>');
  ov.querySelector('#lrGo').onclick=function(){const r=campLastReserve(G.run);ovClose(ov);if(r.ok){toast(CAMP_LAST_RESERVE.credit+' credit at the Quartermaster.');renderRibbon();renderDraft();}};
  ov.querySelector('#lrNo').onclick=function(){ovClose(ov);};
}
function campInspect(){
  const st=routeState();const node=nodeOf(routeMap(),st.pendingId);
  const ov=ovOpen('<div class="card inspectcard"><div class="kick gold">'+esc(MONSTERS[node.monId].n)+'</div>'
   +'<div class="sheet">'+combatPreview(node)+'</div>'
   +'<button class="btn gold" id="ciClose" style="width:100%;margin-top:12px">Back to camp</button></div>');
  ov.querySelector('#ciClose').onclick=function(){ovClose(ov);};
  ov.onclick=function(ev){if(ev.target===ov)ovClose(ov);};
}
function renderAll(){
  document.body.classList.add('run','route');document.body.classList.toggle('fight',G.phase==='fight');
  renderRibbon();renderAno();renderTrow();
  if(G.phase==='routeMap')renderRouteMap();
  else if(G.phase==='draft'||G.phase==='gateCamp')renderDraft();   /* the Gate Camp is a camp-mode draft */
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
function slotCost(size){return wareSlotCost(size,G.A);}
function usedNow(board){return boardUsedCells(board,G.A);}
function slotsNow(tier){return boardSlotCount(tier===undefined?G.tier:tier,G.A);}
function buyCost(size,enchanted){return warePurchaseCost(size,enchanted,G.A);}
function sellValue(size){return wareSaleValue(size,G.A);}
function currentMarketSales(){return G.route&&G.route.market?G.route.market.sales||0:0;}
function currentRerollCost(){return rerollPrice(G.A,currentMarketSales());}
function recordMarketSale(){
  if(G.phase==='draft'&&G.route&&G.route.market&&G.A.rerollCostPerSaleThisMarket){G.route.market.sales=(G.route.market.sales||0)+1;}
}
/* L9 The Locked Shelf: two vault slots instead of three; lantern is fixed at
   run start, so an L9 run can never hold a third ware */
function vaultSlots(){return (G.run&&G.run.lantern>=9)?2:3;}
function freezeButtonLabel(){
  const held=(G.shop||[]).reduce(function(max,w){return Math.max(max,w.hold||0);},0);
  if(G.frozen||held)return 'Frozen: '+Math.max(held,1)+' roll'+(Math.max(held,1)===1?'':'s');
  const duration=G.A.freezeDurationRounds||1;return duration>1?'Freeze '+duration+' markets':'Freeze';
}
function canSpend(cost){return canSpendGold(G.gold,cost,heroOf());}
function rerollAllowed(){
  const H=heroOf();
  if(G.A.rerollDisabled)return false;
  if(H&&H.mod&&H.mod.rerollBlockedInDebt&&G.gold<0)return false;
  return !!(G.mode==='route'&&G.freeReroll)||G.gold>=currentRerollCost();
}
/* a bought or returned copy can complete a forge whose other copies
   rest in the vault: pull them through and fuse automatically. If the
   pull leaves the stall over capacity, the newest piece rests in the
   vault slots the copies just freed. */
function fuseWithVault(){
  /* 0.101.0 live-market seam: the pull-and-forge body lives in market-core.js
     (pullVaultForges). The stampForged hook runs at the exact former
     fuseStamp site, so forged-iid allocation order and the fusion metric are
     unchanged; toasts and the forge sting stay here in the wrapper. */
  return pullVaultForges(G.board,G.vault,{slots:slotsNow(),usedCells:usedNow},{
    stampForged:function(forged){
      forged.forEach(function(f){f.iid=allocId(G.run);
        metricEvent('fusion',{id:f.id,rarity:f.rarity,iid:f.iid});});
      if(forged.length){
        forged.forEach(function(f){toast('Forged: '+RNAME[f.rarity]+' '+ITEMS[f.id].n);});
        sForge();sting('forgesting');
      }
    },
    onOverflow:function(last){toast(ITEMS[last.id].n+' waits in the vault: no room on the stall');}
  });
}
/* inspect then commit: tapping a ware opens a floating detail card (the same
   overlay pattern as the fight inspect) with the full rule and a prominent Buy
   button. Floats above the market so nothing scrolls, no buying on a stray tap. */
function selectWare(i){
  const w=G.shop[i];if(!w||w.bought||G.phase!=='draft')return;
  const d=ITEMS[w.id];const cost=w.free?0:buyCost(d.size,!!w.ench);
  const room=usedNow(G.board)+slotCost(d.size)<=slotsNow();const afford=w.free||canSpend(cost);const can=afford&&room;
  const why=!afford?'Not enough gold':(!room?'No room on your stall':'');
  const o=ovOpen('<div class="card inspectcard"><div class="kick gold">Market ware</div>'
   +'<div class="sheet">'+wareDetailHTML({id:w.id,rarity:0,size:d.size,ench:w.ench},G.A)
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
  const d=ITEMS[w.id];const cost=w.free?0:buyCost(d.size,!!w.ench);
  if(!canSpend(cost)){toast('Not enough gold');return;}
  if(usedNow(G.board)+slotCost(d.size)>slotsNow()){toast('No room on your stall');return;}
  const wEl=document.querySelector('.ware[data-w="'+i+'"]');
  const fromRect=wEl?wEl.getBoundingClientRect():null;
  G.gold-=cost;w.bought=true;sCoin();
  const bought=mkWare(w.id,0,w.ench);G.board.push(bought);
  metricEvent('shop_buy',{id:w.id,iid:bought.iid,offerId:w.offerId,cost:cost,free:!!w.free,ench:w.ench||null,
    source:G.route&&G.route.opening?'opening':(G.route&&G.route.market&&G.route.market.nodeId)});
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
  if(G.tier>=6||!canSpend(G.tierCost))return;
  const beforeSlots=slotsNow();
  const paid=G.tierCost;G.gold-=paid;G.tier++;sFanfare();
  G.tierCost=TIERCOST[G.tier+1]||0;
  metricEvent('tier_up',{tier:G.tier,cost:paid});
  toast('Tier '+G.tier+': '+(slotsNow()>beforeSlots?'new slot and ':'')+'richer wares');
  renderAll();
  const dk=document.querySelector('.dock');
  if(dk&&!RM){dk.classList.add('flare');setTimeout(function(){dk.classList.remove('flare');},650);}
}
function reroll(){
  if(!rerollAllowed()){
    if(G.A.rerollDisabled)toast('The Silent Bazaar forbids rerolls.');
    else if(G.gold<0)toast('Debt blocks rerolls until the next reward.');
    return;
  }
  const free=G.mode==='route'&&G.freeReroll;
  if(free){G.freeReroll=false;toast('A free reroll, courtesy of Refit.');}
  else{const price=currentRerollCost();if(G.gold<price)return;G.gold-=price;}
  metricEvent('shop_reroll',{free:free,cost:free?0:currentRerollCost(),nodeId:G.route&&G.route.market&&G.route.market.nodeId});
  G.shopSel=null;
  /* route markets re-seed from a keyed, serializable stream so a reload replays
     the same reroll sequence rather than the lobby rng's hidden position */
  if(G.mode==='route'&&G.route.market){G.route.market.rollIndex++;G.rng=mulberry(fightSeed(G.seed,G.route.market.nodeId,G.route.market.rollIndex));}
  rollShop();renderRibbon();renderDraft();
}
function rollShop(){
  /* 0.101.0 live-market seam: the selection body lives in market-core.js
     (rollShopOffers), extracted verbatim so the simulator and this wrapper
     share ONE implementation. The wrapper binds G, the storage, and the
     mkOffer id allocator (called by the core per new offer at the exact old
     site, so offer-id order is unchanged), then keeps the G writes and the
     shop_roll metric exactly as before. Free bounty cards always carry over;
     a frozen shop keeps its paid cards too, counted against the roll, then
     the freeze is spent; income wares stay out of route shops until the
     approved rework gives them route semantics. */
  const rolled=rollShopOffers({tier:G.tier,heroId:G.hero,heroTag:heroOf()?heroOf().tag:null,
    featuredTags:G.tags,board:G.board,mode:G.mode,storage:store(),run:G.run,A:G.A,
    threat:runThreat(),priorShop:G.shop,frozen:G.frozen},G.rng,{mkOffer:mkOffer});
  G.frozen=rolled.frozenActive;
  G.shop=rolled.offers;
  G.shopFresh=true;
  metricEvent('shop_roll',{nodeId:G.route&&G.route.market&&G.route.market.nodeId,
    rollIndex:G.route&&G.route.market?G.route.market.rollIndex:0,gold:G.gold,
    offers:G.shop.filter(function(w){return !w.bought;}).map(function(w){return {offerId:w.offerId,id:w.id,ench:w.ench||null,free:!!w.free,hold:w.hold||0};})});
}
function toggleFreeze(){
  /* L6 No Frost Tonight: the tap still lands and still explains itself (a
     silent dead button is not acceptable on a phone), it just never freezes */
  if(G.A.freezeDisabled){toast('The frost fails tonight. Wares left on the shelf are lost to the next roll.');return;}
  const held=(G.shop||[]).some(function(w){return (w.hold||0)>0;});
  if(G.frozen||held){
    G.frozen=false;thawOffers(G.shop);toast('The shop thaws.');
  }else{
    const duration=G.A.freezeDurationRounds||1;G.frozen=true;
    setFrozenOffers(G.shop,duration);
    toast('The shop holds through '+duration+' market roll'+(duration===1?'':'s')+'.');
  }
  metricEvent('shop_freeze',{active:!!G.frozen,nodeId:G.route&&G.route.market&&G.route.market.nodeId});
  renderDraft();
}
/* ============ FIGHT UI ============ */
function fighterHTML(s,side){
  /* 0.113.0: the portrait sits inside a painted frame ring (span wrapper so
     the frame can overlay the replaced element) */
  return '<div class="fighter" id="fg-'+side+'"><div class="fh"><span class="fpw">'+ic(s.portrait,'fp')+'</span>'
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
  sWhoosh();
  const s=document.createElement('div');s.className='streak';
  s.style.left=x1+'px';s.style.top=y1+'px';s.style.width=len+'px';
  s.style.transform='rotate('+(Math.atan2(y2-y1,x2-x1)*180/Math.PI)+'deg)';
  /* 0.114.2: the landing flashes at the target, purely decorative */
  const im=document.createElement('div');im.className='impactfx';
  im.style.left=x2+'px';im.style.top=y2+'px';
  document.body.appendChild(im);setTimeout(function(){im.remove();},360);
  document.body.appendChild(s);
  setTimeout(function(){s.remove();},230);
}
function fltFx(side,txt,color,mini,big){
  const lay=$('fx-'+side);if(!lay||lay.children.length>11)return;
  const d=document.createElement('div');d.className='flt';
  d.style.color=color;
  d.style.fontSize=(typeof big==='number')?Math.min(26,Math.max(12,Math.round(11+big*0.3)))+'px':(big?'20px':'13px');
  /* 0.121.0 recommendations pass: floats walk five lanes instead of rolling
     random x, and each concurrent float starts a step higher, so simultaneous
     readouts ("Lit 4 burn" over "-11") no longer overprint into garble. The
     jitter stays cosmetic; the sim never reads any of this. */
  lay._ln=((lay._ln||0)+1)%5;
  d.style.left=(7+lay._ln*16+Math.random()*5)+'%';
  d.style.top=(-4-lay.children.length*13)+'px';
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
    else if(e.k==='chip'){const ig=$('fi-'+e.side+'-'+e.i);if(ig)ig.textContent=e.integ;
      if(e.repair){cellFx(e.side,e.i,'fire');}
      else{cellFx(e.side,e.i,'chip');
        if(lastFire&&lastFire.side!==e.side){streakFx($('fc-'+lastFire.side+'-'+lastFire.i),$('fc-'+e.side+'-'+e.i));}
        const p=ctrOf($('fc-'+e.side+'-'+e.i));if(p&&!RM)fxHit(p.x,p.y,e.amt);sHit(e.amt);}}
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
    else if(e.k==='shield'){
      if(e.item){cellFx(e.side,e.i,'fire');fltFx(e.side,e.absorbed?'Rampart blocked '+(-e.amt):'Rampart +'+e.amt+' Shield','#6fe0cd','e-shield',false);}
      else{fltFx(e.side,(e.transfer?'Rampart transferred ':'Shielded ')+e.amt,'#6fe0cd','e-shield',false);}
    }
    else if(e.k==='heal'){fltFx(e.side,'Mended '+e.amt,'#ffb3b8','e-heart',false);if(e.amt>=22)logLine((e.side==='a'?'You mend ':'They mend ')+'<b class="t">'+e.amt+'</b>','e-heart','#ffb3b8');}
    else if(e.k==='pois'){
      if(e.item){cellFx(e.side,e.i,'fire');fltFx(e.side,'Ware marked +'+e.amt+' poison','#c0e070','e-skull',false);}
      else{fltFx(e.side,'Spilled '+e.amt+' poison','#c0e070','e-skull',false);}
    }
    else if(e.k==='burn'){fltFx(e.side,'Lit '+e.amt+' burn','#ffb066','e-flame',false);}
    else if(e.k==='haste'){const nm=hasteName(F,e.side,e.i);cellFx(e.side,e.i,'fire');
      if(lastFire&&lastFire.side===e.side&&lastFire.i!==e.i)streakFx($('fc-'+lastFire.side+'-'+lastFire.i),$('fc-'+e.side+'-'+e.i));
      fltFx(e.side,'Charged'+(nm?' '+nm:''),'#e8c27a','e-bolt',false);}
    else if(e.k==='tickp'){if(G.recap)G.recap[e.side].pois+=e.amt;fltFx(e.side,'-'+e.amt,'#c0e070','e-skull',false);sTick();}
    else if(e.k==='tickb'){if(G.recap)G.recap[e.side].burn+=e.amt;fltFx(e.side,'-'+e.amt,'#ffb066','e-flame',false);sTick();}
    else if(e.k==='pocket'){fltFx(e.side,'-'+e.amt,'#e8c27a','e-bolt',false);logLine('<b class="y">Sticky Paws pockets '+e.amt+' bounty gold</b>','e-bolt','#e8c27a');}
    else if(e.k==='freeze'){const c=$('fc-'+e.side+'-'+e.i);if(c)c.classList.add('frz');
      fltFx(e.side,(e.disarm?'Disarmed ':'Froze ')+e.amt+'s',e.disarm?'#e8c27a':'#9ad8ef','e-clock',false);sTick();}
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
  if(fi.itemShield)rows.push(['shield','e-shield',fi.itemShield+' stored Shield']);
  if(fi.pois)rows.push(['poison','e-skull',fi.pois+' item Poison']);
  if(fi.nextCdFlat)rows.push(['util','e-clock','next cooldown +'+(fi.nextCdFlat/1000)+'s']);
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
  metricPhase('combat_inspect');
  const o=ovOpen('<div class="card inspectcard"><div class="kick gold">'+(side==='a'?'Your ware':'Enemy ware')+'</div>'
   +'<div class="sheet">'+fightDetailHTML(fi)+'</div>'
   +'<button class="btn gold" id="fiResume" style="width:100%;margin-top:12px">Resume fight</button></div>');
  const done=function(){G.fpaused=false;ovClose(o);metricPhase('combat_'+FSPD+'x');};
  const r=o.querySelector('#fiResume');if(r)r.onclick=done;
  o.onclick=function(ev){if(ev.target===o)done();};
}
function startFight(me,foe,opts){
  G.phase='fight';G.fpaused=false;G.sel=null;music((opts&&opts.boss)?'boss':'battle');
  metricPhase('combat_'+FSPD+'x');
  document.body.classList.add('fight');
  if(!RM){
    const dk=document.createElement('div');dk.className='dusk';
    dk.innerHTML='<div class="dt">Dusk Falls</div><div class="d2">'+((opts&&opts.caption)||('Round '+G.round))+' &middot; '+esc(foe.nm)+'</div>';
    document.body.appendChild(dk);
    setTimeout(function(){dk.remove();},2250);
  }
  const fseed=(opts&&opts.seed!=null)?(opts.seed>>>0):((G.seed+G.round*7919+(++G.fightN)*104729)>>>0);
  const baseStorm=(opts&&opts.stormAt)||stormAt((opts&&opts.threat!=null)?opts.threat:runThreat());
  /* the Gate contract: a Dragon Gate fight takes the Lantern-0 storm offset
     (the plain Omen, G.A0); every other fight takes the composed value */
  const stormA=(opts&&opts.gate&&G.A0)?G.A0:G.A;
  const F=createFight({a:me,b:foe,stormAt:adjustedStormAt(baseStorm,stormA),seed:fseed,playerIs:'a',
    hooks:(opts&&opts.hooks)||undefined,diagnosticTap:opts&&opts.diagnosticTap});
  G.F=F;
  G.recap={a:{wpn:0,pois:0,burn:0,storm:0,dead:[]},b:{wpn:0,pois:0,burn:0,storm:0,dead:[]}};
  function pad(items){const u=items.reduce(function(s,x){return s+(x.slotSize||x.size);},0);let h='';for(let c=u;c<10;c++){h+='<div class="cell lock"></div>';}return h;}
  $('main').className='fight';
  /* 0.113.0: stamp the hero id so heroes with painted full-body art step
     into the duel as a fixed spectacle layer, purely decorative */
  try{document.documentElement.dataset.hero=G.hero||'';
    /* bosses with painted full bodies loom on the foe side, keyed by glyph */
    document.documentElement.dataset.foe=(foe&&foe.portrait)||'';}catch(e){}
  /* 0.122.0 duel recomposition: two scenery layers stand BEHIND the boards
     (hero low left, foe high right), so the combat band owns the center and
     the figures inhabit the negative space instead of a lane owning it.
     Purely decorative, painted from the same data-hero / data-foe stamps. */
  $('main').innerHTML=
   '<div class="duelfig fig-b" aria-hidden="true"></div>'
  +'<div class="duelfig fig-a" aria-hidden="true"></div>'
  +fighterHTML(foe,'b')
  +'<div class="fx" id="fx-b"></div>'
  +'<div class="board combat bd-b">'+foe.items.map(function(fi,i){return fightCellHTML(fi,i,'b');}).join('')+pad(foe.items)+'</div>'
  +'<div class="vsrow"><div class="lanelife" aria-hidden="true"><i class="flick"></i><i class="mote m1"></i><i class="mote m2"></i><i class="mote m3"></i><i class="mote m4"></i><i class="mote m5"></i></div><div class="vl"></div>'+ic('g-medallion','vm')
  +'<span class="stormchip" id="storm">'+ic('e-bolt','mi')+'<span id="stormT"></span></span>'
  +'<button class="spdbtn" id="spdB">'+FSPD+'x</button><div class="vl"></div></div>'
  +'<div class="board combat bd-a">'+me.items.map(function(fi,i){return fightCellHTML(fi,i,'a');}).join('')+pad(me.items)+'</div>'
  +'<div class="fx" id="fx-a"></div>'
  +fighterHTML(me,'a')
  +'<div class="log" id="log"></div>';
  const sb=$('spdB');
  if(sb)sb.onclick=function(){
    FSPD=FSPD===1?2:1;sb.textContent=FSPD+'x';
    metricPhase('combat_'+FSPD+'x');
    try{window.localStorage.setItem('bb-speed',String(FSPD));}catch(e){}
  };
  /* 0.108.0: on the phone the log opens on demand instead of owning the
     lower screen; purely a viewing toggle, the feed itself is unchanged */
  const lg=$('log');
  if(lg)lg.onclick=function(){lg.classList.toggle('open');};
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
   and attempt; an owed gild, unique, or Charm choice is serialized into run.pendingChoice.
   Ordering is crash-safe: apply fixed -> set receipt + pendingChoice -> one
   checkpoint -> only then open the overlay or present the map. A reload reopens
   an interrupted choice rather than re-paying. The event gild path (Treasure,
   Trial) is separate and keeps its own simpler overlay. */
function settleRouteReward(e){
  const c=G.route.combat||{};
  const M=MONSTERS[e.monId];
  const H=heroOf();
  const key=rewardKey(G.run.runId,e.nodeId,c.attempt||0);
  const already=!!(G.run.receipts[key]&&G.run.receipts[key].fixedApplied);
  const income=adjustedVictoryIncome(boardVictoryIncome(G.board)+(G.relicIncome||0)+charmVictoryIncome(G.trinkets),G.A);
  const plan=planReward(M.bounty||{},{baseGold:e.gold,incomeGold:income,gilded:e.gilded,
    enteredGold:c.enteredGold||0,pocketed:c.pocketed||0,minGold:0,board:G.board});
  const node=nodeOf(routeMap(),e.nodeId);
  attachCharmCheckpoint(plan,node,G.run.seed,G.board,G.trinkets);
  /* the final boss dies as the run is won (settleReward sets phase 'won' before this
     reward), so its choice reward (the Vizier's pick-any-unique) would drop a ware
     into a market that never opens and stall the victory behind a moot overlay. Drop
     the choice so the win screen follows the recap directly; the fixed gold is
     harmless and the pickUnique stays in the data for a future post-win use. */
  if(routeState().phase==='won')plan.choice=null;
  const receipt=settleFixed(G.run,plan,key,H&&H.mod&&H.mod.debtLobbyDamage?{debtLobbyDamage:H.mod.debtLobbyDamage}:null);
  if(!already){
    const granted=(receipt.grantedItemIds||[]).slice(),duplicates=(receipt.duplicateUniqueIds||[]).slice();
    metricEvent('reward_settled',{nodeId:e.nodeId,monsterId:e.monId,gold:plan.gold,items:granted,
      duplicateUniqueIds:duplicates,duplicateUniqueGold:receipt.duplicateUniqueGold||0,
      relic:!!plan.relic,mote:plan.mote||null,choice:plan.choice||null,drained:plan.drained||0});
    /* the wild-find grant signal: a bounty ware becomes a free market offer that
       the player may clear without ever buying, so possession settlement needs an
       explicit grant event to credit it (consumed by settleWildFinds) */
    granted.forEach(function(id){metricEvent(WILD_FIND_EVENT,{id:id,source:'bounty'});});
    if(receipt.debtPaid){toast(receipt.debtPaid+' gold repaid your debt before the reward landed.');}
    if(receipt.debtDamage){toast('Unpaid debt cost '+receipt.debtDamage+' Resolve and was cleared.');}
    if(plan.drained>0){toast('The monkey kept '+plan.drained+' gold of the bounty.');}
    if(plan.relic){toast('Income relic: +1 gold after each victory');}
    if(plan.mote&&plan.mote.gold){toast('The mote found nothing bronze to copy. '+plan.mote.gold+' gold instead.');}
    const loot=[plan.gold+' gold'];
    if(granted.length)loot.push(granted.map(function(id){return ITEMS[id]?ITEMS[id].n:id;}).join(', ')+' waiting free in the market');
    if(receipt.duplicateUniqueGold)loot.push(receipt.duplicateUniqueGold+' gold instead of duplicate '+duplicates.map(function(id){return ITEMS[id]?ITEMS[id].n:id;}).join(', '));
    toast(M.n+' slain. '+loot.join('; ')+'.');
    bark('win');
  }
  G.route.combat=null;
  if(G.run.camp&&G.run.camp.nodeId===e.nodeId)campClear(G.run);   /* boss felled: strike the gate camp */
  ensureMidpointTransaction();
  /* write-ahead: economy + receipt + pendingChoice saved before any overlay. If
     the save fails the reward stays correct (a later crash re-settles from the
     clean pre-reward snapshot, and the receipt keeps it exactly once), so we block
     on an explicit retry rather than a missable toast, then present. */
  criticalSave(presentAfterReward);
}
/* Create the Long midpoint choice once, with its offer telemetry in the same
   transaction. Callers checkpoint after a true return before showing anything.
   A receipt that already exists means a retry or reload and emits no duplicate. */
function ensureMidpointTransaction(){
  if(!G||!G.run)return false;
  const key=midpointTreasureKey(G.run.runId);
  const existed=Object.prototype.hasOwnProperty.call(G.run.receipts||{},key);
  const receipt=ensureMidpointTreasure(G.run);
  if(!receipt||existed)return false;
  recordMidpointOffer(receipt,key);
  return true;
}
function recordMidpointOffer(receipt,key){
  metricEvent('midpoint_treasure_offered',{receiptKey:key,options:(receipt.offeredIds||[]).slice(),
    fallbackGold:receipt.fallbackApplied?(receipt.fallbackGold||0):0});
}
/* a checkpoint that must land because the reward economy just changed. On success
   proceed at once. On failure (storage full or blocked) the receipt still keeps
   the reward exactly once, so continuing is safe, but a crash now would rewind to
   the last good save, so hold a blocking overlay: retry the write or accept it. */
function criticalSave(onProceed){
  if(checkpointActiveRun()){onProceed();return;}
  const o=ovOpen('<div class="card"><div class="rays red"></div>'
   +'<div class="kick">Progress Not Saved</div>'+ic('g-lantern','bigic')
   +'<h2 class="big" style="font-size:22px">The Lantern Gutters</h2>'
   +'<p>Your run could not be saved. Storage may be full or blocked. Free some space, then retry. Your rewards are safe either way.</p>'
   +'<div style="display:flex;gap:8px;justify-content:center;margin-top:10px">'
   +'<button class="btn gold" id="csRetry">Retry Save</button>'
   +'<button class="btn" id="csGo">Continue Anyway</button></div></div>');
  o.querySelector('#csRetry').onclick=function(){
    if(checkpointActiveRun()){ovClose(o);onProceed();}
    else{toast('Still could not save. Free space and retry.');}
  };
  o.querySelector('#csGo').onclick=function(){ovClose(o);onProceed();};
}
/* The only UI entry for a prepared route decision. The pure transaction owns
   validation, payment or reward mutation, metrics, receipt, and route advance.
   This adapter runs the existing fusion cascade at its ordered hook, then makes
   the aggregate durable before closing the card or consuming controller effects. */
function commitPreparedRouteDecision(nodeId,choiceId,targetIid,afterSaved){
  const result=runtimeCommitRouteDecision(G.run,routeMap(),nodeId,choiceId,targetIid,Date.now(),function(tx){
    if(tx.needsFusion){fuseStamp(G.board);fuseWithVault();}
  });
  if(!result.ok||result.duplicate)return result;
  criticalSave(function(){
    if(afterSaved)afterSaved(result);
    runEffects(result.effects,0);
  });
  return result;
}
/* present the screen a reward transaction leaves us on: an owed choice reopens,
   a finished run ends (so a final-boss choice resolves before the win screen),
   otherwise back to the map */
function presentAfterReward(){
  /* A reward with its own choice may have delayed the midpoint. Create it only
     after that choice resolves, then save the new receipt before its overlay. */
  if(ensureMidpointTransaction()){criticalSave(presentAfterReward);return;}
  const np=nextPresentation(G.run);
  if(np.kind==='choice'){openRewardChoice(np.choice);}
  else if(np.kind==='end'){routeEnd(np.cause);}
  else{G.phase='routeMap';metricPhase('map');renderAll();}
}
/* ============ THE LONG BAZAAR ROUTE ============ */
/* The route presenters (map, gate camp, event cards, fight recap, reward
   choices, end/continue, run report) and the routeMap/routeState selectors were
   extracted to route-ui.js (R4 commit 5). ui.js keeps the flow, persistence, and
   the shared fight/draft/overlay surface, and imports what it drives from there. */

/* ---- route saves (independent of the lobby save) ---- */
function snapshotRoute(){
  const s=store();if(!s||!G||G.mode!=='route'||!G.run)return;
  touchMetrics(G.run.metrics,Date.now());
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
      routeMode:G.run.routeMode||'quick',
      lantern:G.run.lantern||0,
      contentEpoch:G.run.contentEpoch==null?CONTENT_EPOCH:G.run.contentEpoch,
      route:G.run.route,
      economy:{gold:E.gold,tier:E.tier,tierCost:E.tierCost,relicIncome:E.relicIncome,freeReroll:!!E.freeReroll,frozen:!!E.frozen,
        board:E.board.map(item),vault:E.vault.map(item),
        shop:E.shop.map(function(w){return {id:w.id,free:!!w.free,bought:!!w.bought,ench:w.ench||null,offerId:w.offerId,hold:w.hold||0};}),
        trinkets:E.trinkets.map(function(t){return t.id;})},
      metrics:serializeMetrics(G.run.metrics),end:G.run.end||null,
      receipts:G.run.receipts||{},pendingChoice:G.run.pendingChoice||null,
      camp:G.run.camp||null,lastReserveUsed:!!G.run.lastReserveUsed,
      /* the per-run frozen locked complement (Almanac 0.92): additive optional
         field, no ROUTE_SAVE_VERSION bump, so a resumed market rolls identically
         and a pre-0.92 save (absent here) grandfathers to the full pool */
      wareLock:G.run.wareLock||null,
      ids:{nextItem:G.run.ids.nextItem}},
    setup:{hero:G.hero||null,anom:G.anom.id,tags:G.tags.slice()},
    fightN:G.fightN,
    market:R.market?{nodeId:R.market.nodeId,rollIndex:R.market.rollIndex,sales:R.market.sales||0}:null,opening:!!R.opening,
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
/* the approved 0.89 setup order (Codex review): hero first without a run,
   then route plus Lantern for that hero, then the run and map, then the
   hero's starting ware, then the Omen reveal */
function openRouteModePick(heroId){
  const maxQ=lanternMaxPick(store(),'quick',heroId);
  const maxL=lanternMaxPick(store(),'long',heroId);
  const pick={long:maxL,quick:maxQ};   /* default: highest unlocked */
  const stepper=function(mode,max){
    if(max<1)return '';
    return '<div class="lantstep" data-m="'+mode+'">'
     +'<button class="lstep" data-m="'+mode+'" data-d="-1" aria-label="Dim the lantern">&minus;</button>'
     +'<button class="lamp" data-m="'+mode+'" aria-label="Lantern rules">'+ic('g-lantern','li')+'<b id="lampn-'+mode+'">'+pick[mode]+'</b></button>'
     +'<button class="lstep" data-m="'+mode+'" data-d="1" aria-label="Raise the lantern">+</button></div>';
  };
  const o=ovOpen('<div class="card routepick"><div class="rays"></div>'
   +'<div class="kick gold">Choose Your Road</div>'
   +'<h2 class="big">How Long Will You Roam?</h2>'
   +'<div class="routepickgrid">'
   +'<div class="routewrap"><button class="routechoice primary" id="modeLong"><span class="rct">Long Bazaar</span><span class="rcsub">7 districts &middot; 60 Resolve</span><span class="rcdesc">The full night, with After Midnight reprises and a final Dragon Gate.</span></button>'+stepper('long',maxL)+'</div>'
   +'<div class="routewrap"><button class="routechoice" id="modeQuick"><span class="rct">Quick Night</span><span class="rcsub">4 districts &middot; 40 Resolve</span><span class="rcdesc">The original road to the Grand Vizier.</span></button>'+stepper('quick',maxQ)+'</div>'
   +'</div></div>');
  o.querySelectorAll('.lstep').forEach(function(b){b.onclick=function(){
    const m=b.dataset.m,max=m==='long'?maxL:maxQ;
    pick[m]=Math.max(0,Math.min(max,pick[m]+(+b.dataset.d)));
    o.querySelector('#lampn-'+m).textContent=pick[m];
  };});
  o.querySelectorAll('.lamp').forEach(function(b){b.onclick=function(){
    openLanternPlaque(pick[b.dataset.m],b.dataset.m==='long'?maxL:maxQ);
  };});
  o.querySelector('#modeLong').onclick=function(){ovClose(o);newRoute('long',heroId,pick.long);};
  o.querySelector('#modeQuick').onclick=function(){ovClose(o);newRoute('quick',heroId,pick.quick);};
}
/* the rules plaque: every level named, active rules lit, locked rules dark */
function openLanternPlaque(level,maxSel){
  const rows=LANTERN.map(function(r){
    const cls=r.lv<=level?'lit':(r.lv<=maxSel?'':'lockd');
    return '<div class="ldrow '+cls+'"><b>'+r.lv+' &middot; '+esc(r.n)+'</b><span>'+esc(r.d)+'</span></div>';
  }).join('');
  const o=ovOpen('<div class="card lplaque"><div class="rays"></div><div class="kick gold">The Lantern</div>'
   +'<h2 class="big" style="font-size:22px">'+(level>0?'Burning at '+level:'Unlit')+'</h2>'
   +'<p style="font-size:11px">Clear a road at a level to light the next. Rules stack.</p>'
   +'<div class="ldrows">'+rows+'</div>'
   +'<p style="opacity:.7">Tap anywhere to close</p></div>');
  o.onclick=function(){ovClose(o);};
}
function newRoute(mode,heroId,lantern,replay){
  if(mode!=='quick'&&mode!=='long'){openHeroPick(function(hid){openRouteModePick(hid);});return;}
  if(!heroId){openHeroPick(function(hid){newRoute(mode,hid,lantern||0);});return;}
  lantern=Math.max(0,Math.min(10,lantern||0));
  const now=Date.now();
  /* tooling hook (0.119.0): ?seed=N pins a fresh run's seed so the screenshot
     harness (scripts/shots.mjs) reproduces byte-identical runs. A replay's
     recorded seed still wins; without the param nothing changes. */
  let urlSeed=null;
  try{const m=/[?&]seed=(\d+)/.exec(location.search);if(m)urlSeed=(parseInt(m[1],10)>>>0);}catch(e){}
  const seed=replay&&replay.seed!=null?(replay.seed>>>0):(urlSeed!=null?urlSeed:(((Date.now()>>>0)^0x9e3779b9)>>>0));
  const rng=mulberry(seed);
  const anomPool=ANOMALIES;
  /* One rng draw over the whole Omen catalogue, then map into the player's
     unlocked pool by modulo. At full unlock the unlocked pool is ANOMALIES in
     its own order, so drawIndex%len equals drawIndex and the pick is identical
     (the following shuffle stream is untouched, one rng call either way); with
     the four starters the modulo is exactly uniform.

     Hero and Omen compatibility (0.99.4): shape the eligible pool BEFORE the
     single draw so a fresh Apothecary run never opens under Blood Moon, whose
     healing lockout nullifies the heal kit. A replay keeps the full unlocked
     pool because its recorded Omen (replayAnom below) overrides the roll and
     must reproduce exactly. The draw still takes one rng() call, so the pick for
     every other hero and Omen, and the following shuffle stream, are unchanged. */
  const openAnoms=anomPool.filter(function(a){return omenUnlocked(store(),a.id);});
  const basePool=openAnoms.length?openAnoms:anomPool;
  const pickPool=replay?basePool:compatibleOmenPool(basePool,heroId);
  const drawIndex=Math.floor(rng()*anomPool.length);
  const rolledAnom=pickPool[drawIndex%pickPool.length];
  const cats=['dmg','poison','burn','shield','heal'];shuffle(cats,rng);
  const replayAnom=replay&&anomPool.filter(function(a){return a.id===replay.omenId;})[0];
  const replayTags=replay&&Array.isArray(replay.tags)?replay.tags.filter(function(t){return CATN[t];}).slice(0,2):[];
  const anom=replayAnom||rolledAnom;
  let tags=replayTags.length===2?replayTags:[cats[0],cats[1]];
  /* Guild Charter (m.pinTag "hero") features the hero's own trade tonight: its
     tag plus the first rolled cat that differs. A replay carries recorded tags,
     so this only shapes the fresh roll and history reproduces the feature free. */
  if(replayTags.length!==2&&anom.m&&anom.m.pinTag==='hero'&&heroId){
    const ht=(HEROES.filter(function(x){return x.id===heroId;})[0]||{}).tag;
    if(ht)tags=[ht,cats.filter(function(c){return c!==ht;})[0]];
  }
  const omenA=Object.assign({},ANONE,anom.m);
  setG({mode:'route',seed:seed,rng:rng,round:0,anom:anom,A:composeLantern(anom.id,omenA,lantern),A0:omenA,tags:tags,
     T:null,hero:null,
     stats:{slain:0,driven:0,safe:0},sel:null,vsel:null,swapV:null,shopSel:null,dockV:false,tut:null,
     phase:'routeMap',fightN:0,fiv:null,F:null,recap:null,you:{n:'You',p:'p-0'},
      run:newRun({seed:seed,routeMode:mode,now:now,lantern:lantern,wareLock:lockedWareComplement(store())}),
      route:{map:genMap(seed,mode,lantern,contentTablesFor(CONTENT_EPOCH)),selectedId:null,market:null,combat:null,opening:false}});
  G.run.metrics=resumeMetrics(G.run.metrics,now,false);
  bindEconomy(G);   /* gold/tier/board/shop/... now delegate to G.run.economy */
  /* the hero applies after construction (setup step 4) */
  const h=HEROES.filter(function(x){return x.id===heroId;})[0];
  if(h){
    G.hero=h.id;G.you.p=h.g;
    if(h.start){G.board.push(mkWare(h.start,0));}
    toast(h.n+' opens the stall'+(lantern?' under Lantern '+lantern:''));
  }
  computeT();
  renderAno();renderTrow();
  $('ribbon').innerHTML='';$('main').innerHTML='';
  openRouteReveal();
}
/* A history replay is a fresh run under current rules. It carries only the
   recorded setup tuple, never the old board, route state, rewards, or metrics. */
function replayHistoryRun(spec){
  if(!spec)return;
  /* the replay hero gate: a history replay hands spec.heroId straight to
     newRoute with no picker, so a sealed merchant would slip the rail's gate.
     Refuse it with the trigger hint. Restores of an in-progress save go through
     restoreRoute (reviveRun), never this path, so they stay exempt. */
  if(spec.heroId&&!heroUnlocked(store(),spec.heroId)){toast(heroHint(spec.heroId));return;}
  clearRoute();
  document.querySelectorAll('.ov').forEach(function(o){o.remove();});
  const intro=$('intro');if(intro)intro.remove();
  newRoute(spec.mode,spec.heroId,spec.lantern,spec);
}
function hasActiveRoute(){
  const d=loadRoute();
  return !!(d&&!d.retired);
}
/* the composed truth line: when the Lantern moves a value the Omen card
   printed, say the effective number so the headline never lies (Codex ruling
   2: composed values, not a footnote) */
function lanternRevealLines(){
  const lv=G.run.lantern||0;
  if(!lv)return '';
  const rules=lanternRules(lv);
  const names=rules.map(function(r){return r.n;}).join(' &middot; ');
  let composed='';
  if(G.A0&&G.A.shopN!==G.A0.shopN)composed+='<br>Markets show '+G.A.shopN+' wares tonight.';
  if(G.A.freezeDisabled)composed+='<br>The market frost fails tonight.';
  if(G.A0&&(G.A.stormStartOffsetMs||0)!==(G.A0.stormStartOffsetMs||0))composed+='<br>The simoom rises '+(Math.abs((G.A.stormStartOffsetMs||0)-(G.A0.stormStartOffsetMs||0))/1000)+'s earlier outside the Gate.';
  return '<p class="lantline">'+ic('g-lantern','mi')+' <b>Lantern '+lv+'</b>: '+names+composed+'</p>';
}
function openRouteReveal(){
  const isLong=G.run.routeMode==='long';
  const startRes=routeState().resolveMax;
  const o=ovOpen('<div class="card reveal"><div class="rays"></div>'
   +'<div class="kick gold">The Road Ahead</div>'
   +ic(G.anom.g,'bigic')
   +'<h2 class="big">'+G.anom.n+'</h2><p>'+G.anom.d+'</p>'
   +'<p>Featured wares: <b style="color:var(--brass)">'+CATN[G.tags[0]]+'</b> and <b style="color:var(--brass)">'+CATN[G.tags[1]]+'</b></p>'
   +lanternRevealLines()
   +'<p style="font-size:11px">'+(isLong?'Seven districts. ':'Four districts. ')+startRes+' Resolve. '+(isLong?'Survive After Midnight and reach the Grand Vizier.':'Reach the Grand Vizier.')+'</p>'
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
      metricPhase('recap');showFightRecap(true,MONSTERS[node.monId].n,function(){dispatchRoute({type:'settleReward'},ctx);},MONSTERS[node.monId].glyph);return;}
    else if(e.type==='lostFight'){const node=nodeOf(routeMap(),e.nodeId);const rest=effects,ni=i+1;checkpointActiveRun();
      metricPhase('recap');showFightRecap(false,MONSTERS[node.monId].n,function(){runEffects(rest,ni,ctx);},MONSTERS[node.monId].glyph);return;}
    else if(e.type==='reward'){metricPhase('reward');settleRouteReward(e);return;}
    else if(e.type==='slip'){toast('You slip past. Lost '+e.cost+' Resolve.');checkpointActiveRun();}
    else if(e.type==='market'){enterRouteMarket(e.nodeId);return;}
    else if(e.type==='marketDone'){G.route.market=null;G.phase='routeMap';metricPhase('map');checkpointActiveRun();}
    else if(e.type==='event'){
      metricPhase('event');
      const prepared=prepareRouteDecision(e.node);
      if(!prepared.ok)throw new Error('route decision: '+prepared.reason);
      criticalSave(function(){routeEventCard(e);});return;
    }
    else if(e.type==='eventDone'){G.phase='routeMap';metricPhase('map');checkpointActiveRun();}
    else if(e.type==='gateCamp'){G.phase='gateCamp';metricPhase('gate_camp');checkpointActiveRun();renderAll();return;}
    else if(e.type==='end'){routeEnd(e.cause);return;}
  }
  /* every pausing effect returns above, so reaching here means the queue
     resolved back to the road (a slip, a settled reward, a left market, or a
     finished event); the prior screen may still be the fight, so force the map */
  G.phase='routeMap';metricPhase('map');renderAll();
}

/* ---- combat adapter: reuse startFight, feed it a route-built foe ---- */
function startRouteFight(e){
  const H=heroOf();
  const node=nodeOf(routeMap(),e.nodeId);
  const dist=routeMap().districts.filter(function(x){return x.id===node.district;})[0];
  const gate=isGateDistrict(dist);
  /* 0.121.0 recommendations pass: stamp the district so the fight lane wears
     its painted backdrop (Robbie's call: the environment is the presence).
     Purely decorative; cleared implicitly by the next fight's stamp. */
  try{document.documentElement.dataset.fightbg=districtBgToken(dist)||'';}catch(e){}
  /* the district Affix, injected as engine cfg.hooks, applies to monster and elite
     doors only, never bosses (the boss prices the district) nor the Dragon Gate (the
     Gate contract). It rides the affix stamp, so pre-stamp runs pass no hooks and
     fight byte-identically; districtAffix returns null for the Gate as a second guard. */
  const affOn=routeState().affix?1:0;
  const affix=(affOn&&(node.type==='monster'||node.type==='elite'))?districtAffix(dist,routeMap().seed):null;
  /* the board Aspect pick threads the map seed and node id only when the run
     carries the variety stamp; older runs pass neither and face the shipped board */
  const vary=routeState().variety?1:0;
  const built=buildFoe(e.monId,{threat:e.threat,hpFlat:G.T.hpFlat,A:G.A,gold:G.gold,
    gilded:e.gilded,power:e.power,board:G.board,nodeType:node.type,gate:gate,lantern:G.run.lantern||0,
    seed:vary?routeMap().seed:null,nodeId:vary?e.nodeId:null});
  const php=built.php,foe=built.side;
  const playerItems=playerFightItems(G.board,G.T,G.A,1);
  const me={nm:'You',portrait:G.you.p,hp:php,items:playerItems,
    lifesteal:G.A.healingDisabled?0:(G.T.lifesteal||0),regen:G.A.healingDisabled?0:boardRegen(G.board),
    rules:Object.assign({},G.A,H?H.mod:{})};
  metricSnapshot(node.type==='boss'?'boss_pre_fight':'pre_fight',{nodeId:e.nodeId,district:node.district,
    monsterId:e.monId,threat:e.threat,attempt:(routeState().attempts[e.nodeId]||0)});
  const tally=beginCombatTally({nodeId:e.nodeId,district:node.district,encounter:node.type,monsterId:e.monId,
    threat:e.threat,attempt:(routeState().attempts[e.nodeId]||0),gilded:!!e.gilded,power:e.power||1,playerStartHp:php,enemyStartHp:foe.hp},
    G.board,playerItems,foe.items);
  tally.phaseBaseline=metricPhaseTotals(G.run.metrics,['combat_1x','combat_2x','combat_inspect']);
  G.route.fightTelemetry=tally;
  startFight(me,foe,{seed:e.fightSeed,threat:e.threat,caption:'Threat '+e.threat,boss:!!e.boss,gate:gate,
    hooks:affixFightHooks(affix),
    stormAt:built.def.stormAt?built.def.stormAt*1000:stormAt(e.threat),diagnosticTap:function(fact){recordCombatDiagnostic(tally,fact);},
    onEnd:function(F){endRouteFight(F,e);}});
}
function endRouteFight(F,e){
  if(F.lotPaid){G.gold+=F.lotPaid;metricEvent('auction_payout',{gold:F.lotPaid,nodeId:e.nodeId});toast('The Auctioneer paid you '+F.lotPaid+' gold.');}
  if(G.route.combat)G.route.combat.pocketed=F.pocketed||0;
  const tally=G.route.fightTelemetry;
  if(tally){touchMetrics(G.run.metrics,Date.now());const totals=metricPhaseTotals(G.run.metrics,['combat_1x','combat_2x','combat_inspect']);
    const base=tally.phaseBaseline||{};
    commitCombatTally(G.run.metrics,tally,{winner:F.winner,simMs:F.t,stormAt:F.stormAt,
      playerEndHp:F.a.hp,enemyEndHp:F.b.hp,playerShield:F.a.shield,enemyShield:F.b.shield,
      speedMs:{x1:(totals.combat_1x||0)-(base.combat_1x||0),x2:(totals.combat_2x||0)-(base.combat_2x||0),
        inspect:(totals.combat_inspect||0)-(base.combat_inspect||0)},
      guardTrips:F.diagnostics.guardTrips,guardCounts:Object.assign({},F.diagnostics.guardCounts)},Date.now());
    G.route.fightTelemetry=null;}
  /* the enemy's surviving item tiers, from the engine (fight items carry .tier,
     not .id, so the old ITEMS[it.id] lookup counted every survivor as tier 1) */
  dispatchRoute({type:'fightResult',winner:F.winner,survTier:F.survTiers('b')});
}

/* ---- the opening stall: spend the six starting gold before the first forced
   Monster Door, so every hero sets out with a board. Not a route node; leaving
   it just enters District I. ---- */
/* the offensive opening offer (R6, real-playtest driven): the six-gold opening
   stall must let every hero assemble damage. Real games showed a defence-only
   opening board (bandages, no weapon) dying in Back Alleys, so if the roll left no
   affordable weapon/poison/burn ware, seed one size-1 offensive ware in its place.
   Opening market only; keyed to the opening rng, so it is deterministic and rides
   the save (the shop is restored, not re-rolled, on resume). */
function ensureOpeningOffense(){
  const OFF=['dmg','poison','burn'];
  const has=G.shop.some(function(w){return !w.bought&&OFF.indexOf(ITEMS[w.id].cat)>=0&&buyCost(ITEMS[w.id].size,!!w.ench)<=6;});
  if(has)return;
  const pool=Object.keys(ITEMS).filter(function(id){return gateOK(ITEMS[id].tier,1)&&OFF.indexOf(ITEMS[id].cat)>=0&&ITEMS[id].size===1&&!ITEMS[id].unique&&(!ITEMS[id].sig||ITEMS[id].sig===G.hero)&&!ITEMS[id].inc&&runWareAllowed(store(),G.run,id);});
  if(!pool.length)return;
  const id=pool[Math.floor(G.rng()*pool.length)];
  let idx=G.shop.findIndex(function(w){return !w.free&&!w.bought&&OFF.indexOf(ITEMS[w.id].cat)<0;});
  if(idx<0)idx=G.shop.findIndex(function(w){return !w.free&&!w.bought;});
  if(idx>=0)G.shop[idx]=mkOffer({id:id,free:false,bought:false,ench:null});
}
function enterOpeningMarket(){
  G.route.opening=true;G.route.market={nodeId:'__opening__',rollIndex:0,sales:0};
  G.rng=mulberry(fightSeed(G.seed,'__opening__',0));
  G.frozen=false;G.shopSel=null;G.sel=null;G.vsel=null;G.swapV=null;G.dockV=false;
  rollShop();ensureOpeningOffense();
  G.phase='draft';metricPhase('market');checkpointActiveRun();renderAll();
}
function leaveOpeningMarket(){
  G.route.opening=false;G.route.market=null;
  G.phase='routeMap';metricPhase('map');checkpointActiveRun();renderAll();
}
/* ---- market node: reuse the draft, deterministic keyed stock ---- */
function enterRouteMarket(nodeId){
  G.route.market={nodeId:nodeId,rollIndex:0,sales:0};
  G.rng=mulberry(fightSeed(G.seed,nodeId,0));
  G.shopSel=null;G.sel=null;G.vsel=null;G.swapV=null;G.dockV=false;
  rollShop();
  G.phase='draft';metricPhase('market');checkpointActiveRun();renderAll();
}

/* resume a saved route at whatever phase it stopped */
function restoreRoute(d){
  const anom=ANOMALIES.filter(function(a){return a.id===d.setup.anom;})[0]||ANOMALIES[0];
  const mode=d.run.routeMode||'quick';
  const lantern=(d.run&&d.run.lantern)||0;
  const map=genMap(d.run.seed,mode,lantern,contentTablesFor((d.run&&d.run.contentEpoch)||1));
  if(!validRoute(d.run.route,map)){clearRoute();openIntro();return;}
  const omenA=Object.assign({},ANONE,anom.m);
  setG({mode:'route',seed:d.run.seed,rng:mulberry((d.run.seed+(d.fightN||0)*2654435761+7)>>>0),round:0,
     anom:anom,A:composeLantern(anom.id,omenA,lantern),A0:omenA,tags:d.setup.tags,
     T:null,hero:d.setup.hero||null,
     stats:{slain:0,driven:0,safe:0},sel:null,vsel:null,swapV:null,shopSel:null,dockV:false,tut:null,
     phase:'routeMap',fightN:d.fightN||0,fiv:null,F:null,recap:null,you:{n:'You',p:'p-0'},
     run:reviveRun(d.run),
      route:{map:map,selectedId:null,market:d.market||null,combat:d.combat||null,opening:!!d.opening,
        midpointNeedsSave:!!d.midpointInjected}});
  G.run.metrics=resumeMetrics(G.run.metrics,Date.now(),true);
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
  /* A v3 save can gain its midpoint receipt during read-time migration. Persist
     that injected receipt and its single offer event before reopening the choice. */
  if(G.route.midpointNeedsSave){
    G.route.midpointNeedsSave=false;
    const key=midpointTreasureKey(G.run.runId),receipt=G.run.receipts[key];
    if(receipt)recordMidpointOffer(receipt,key);
    criticalSave(resumeRoutePhase);return;
  }
  if(G.route.opening){G.phase='draft';metricPhase('market');renderAll();return;}   /* the opening stall */
  /* an owed reward choice wins over the controller phase: its fixed part is
     already applied (receipt), so reopen the choice rather than re-settle. If
     the choice's targets are gone, the fallback resolves it and we present on. */
  if(G.run.pendingChoice){
    if(refreshPendingChoice(G.run)){openRewardChoice(G.run.pendingChoice);return;}
    checkpointActiveRun();presentAfterReward();return;
  }
  if(ensureMidpointTransaction()){criticalSave(resumeRoutePhase);return;}
  if(st.phase==='encounter'&&st.pendingId){
    const n=nodeOf(routeMap(),st.pendingId);
    startRouteFight({nodeId:n.id,monId:n.monId,threat:n.threat,gilded:n.gilded,power:n.power||1,boss:n.type==='boss',fightSeed:st.fightSeed});
  }else if(st.phase==='reward'){metricPhase('reward');dispatchRoute({type:'settleReward'});}   /* fixed not saved: re-settle, receipt makes it once */
  else if(st.phase==='market'){G.phase='draft';metricPhase('market');renderAll();}
  else if(st.phase==='event'){
    metricPhase('event');const n=nodeOf(routeMap(),st.pendingId),prepared=prepareRouteDecision(n);
    if(!prepared.ok){clearRoute();openIntro();return;}
    if(prepared.created){criticalSave(resumeRoutePhase);return;}
    routeEventCard({node:n});
  }
  else if(st.phase==='gateCamp'){G.phase='gateCamp';metricPhase('gate_camp');renderAll();}
  else if(st.phase==='won'){routeEnd('won');}   /* a finished run resumes to its end screen, not the map */
  else if(st.phase==='lost'){routeEnd('resolve');}
  else{G.phase='routeMap';metricPhase('map');renderAll();}
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
/* the sealed-merchant trigger line, never empty so a locked tap always toasts */
function heroHint(id){return HERO_HINTS[id]||'This merchant keeps a shuttered stall until you earn the right to it.';}
function openHeroPick(cont){
  /* selected-hero layout: a portrait rail up top, one large hero with its
     rule below, and a Confirm. Scales to eight heroes where the old grid
     clipped at four on a short landscape screen. */
  /* All eight rules-based heroes fit the portrait rail without shrinking the
     selected rule card on short landscape screens. */
  const pool=HEROES;
  let sel=pool[0].id;
  const o=ovOpen('<div class="card heropick evroom ev-parlor"><div class="rays"></div>'
   +'<div class="kick gold">Choose Your Dealer</div>'
   +'<div class="herorail" id="herorail"></div>'
   +'<div class="herodetail" id="herodetail"></div>'
   +'<button class="btn gold" id="heroGo" style="width:100%;margin-top:11px">Take the Stall</button></div>');
  function draw(){
    const h=pool.filter(function(x){return x.id===sel;})[0];
    const locked=!heroUnlocked(store(),h.id);
    /* all eight chips render; a sealed merchant wears the lockd class (dim
       portrait, neutral ring, brass lock corner) yet stays selectable to preview */
    o.querySelector('#herorail').innerHTML=pool.map(function(x){
      const lk=!heroUnlocked(store(),x.id);
      const ca=heroChipAttrs(x.id===sel,lk);
      return '<button class="'+ca.cls+'" data-h="'+x.id+'" aria-label="'+esc(x.n)+ca.labelSeal+'" style="--cat:'+CATC[x.tag]+'">'+ic(x.g,'hpr')+ca.lockCorner+'</button>';
    }).join('');
    /* the detail panel: a sealed merchant shows the darkened portrait, the real
       name, no Favors line, and the trigger hint where the rule text sits */
    o.querySelector('#herodetail').innerHTML=
      '<div class="hdportrait'+heroPortraitClass(locked)+'" style="--cat:'+CATC[h.tag]+'">'+ic(h.g,'hpbig')+'</div>'
      +'<div class="hdbody"><div class="hdname">'+esc(h.n)+'</div>'
      +(locked
        ? '<div class="hddesc hdhint">'+esc(heroHint(h.id))+'</div>'
        : '<div class="hdtag" style="color:'+CATC[h.tag]+'">Favors '+CATN[h.tag]+'</div>'
          +'<div class="hddesc">'+h.d+'</div>'
          +(h.start?'<div class="hdstart">'+ic('g-'+h.start,'mi')+' Starts with '+ITEMS[h.start].n+'</div>':''))
      +'</div>';
    o.querySelectorAll('.herochip').forEach(function(c){c.onclick=function(){sel=c.dataset.h;draw();};});
    /* Take the Stall re-renders as a sealed stone plaque for a locked hero:
       same element, aria-disabled and non-gold, never a dead tap */
    const go=o.querySelector('#heroGo');
    const gv=heroConfirmView(locked);
    go.className=gv.cls;
    /* only touch aria-disabled when sealed: at full unlock gv.aria is null so
       the button matches the pre-seam markup, which carried no aria-disabled */
    if(gv.aria)go.setAttribute('aria-disabled',gv.aria);else go.removeAttribute('aria-disabled');
    go.textContent=gv.text;
  }
  draw();
  o.querySelector('#heroGo').onclick=function(){
    /* hand back the choice only; the run does not exist yet (0.89 hero-first
       flow), so the hero and starting ware apply during construction. A sealed
       merchant never confirms: the tap toasts its trigger hint instead. */
    if(!heroUnlocked(store(),sel)){toast(heroHint(sel));return;}
    ovClose(o);cont(sel);
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
  /* New Game opens the two route lengths. Tutorial stays on the established
     Quick road until the longer route receives its own guided pass. */
  if(!ART['bg-intro']){newRoute();return;}
  /* the non-interactive Almanac caption: the nearest unclaimed trigger, or late
     progress, or a Lantern handoff. nextUnlockHint returns null under the dev
     flag, so the caption is hidden at that full unlock. */
  const hint=nextUnlockHint(store());
  const o=document.createElement('div');o.id='intro';
  /* 0.115.0: fade the threshold up once the gates painting is decoded, with a
     timeout fallback so a failed fetch never strands a blank screen */
  (function(){
    const im=new Image();let done=false;
    const ready=function(){if(done)return;done=true;o.classList.add('bgready');};
    im.onload=ready;im.onerror=ready;im.src='/art/bg/bg_intro.png';
    setTimeout(ready,1400);
  })();
  o.innerHTML='<div class="ititle">Tavern Bash</div>'
    +'<button class="btn introhistory" id="inHistory">'+ic('g-ledger','mi')+' Run History</button>'
    +'<div class="ibtns">'
    +'<button class="stonebtn" id="inNew">New Game</button>'
    +'<button class="stonebtn" id="inTut">Tutorial</button>'
   +'</div>'
   +(hint?'<div class="introhint" aria-live="polite">'+esc(hint)+'</div>':'');
  document.body.appendChild(o);
  o.querySelector('#inNew').onclick=function(){o.remove();newRoute();};
  o.querySelector('#inTut').onclick=function(){o.remove();newRoute('quick');};
  o.querySelector('#inHistory').onclick=function(){openRunHistory();};
}
function openRetiredRouteNotice(d){
  const oldVersion=d.fromMapVersion||d.mapVersion||8;
  const o=ovOpen('<div class="card"><div class="rays"></div><div class="kick gold">The Road Changed</div>'
   +ic('g-lantern','bigic')+'<h2 class="big">A New Map Awaits</h2>'
   +'<p>Your earlier route used map version '+esc(oldVersion)+'. Quick Night and Long Bazaar now use a new map, so that run cannot continue.</p>'
   +'<button class="btn gold" id="retiredNew" style="width:100%">Choose a New Road</button></div>');
  o.querySelector('#retiredNew').onclick=function(){ovClose(o);newRoute();};
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
    const allOpen=devAllOpen(store())?' ALL':'';
    d.textContent=tag+' '+(standalone?'PWA':'TAB')+' '+window.innerWidth+'x'+window.innerHeight+' '+fps+'fps ovf '+over+allOpen;
  },1000);
}
export function boot(){
  setRM((typeof matchMedia!=='undefined')&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  initCloudLedger(store());
  /* light the Lantern stepper for roads a returning player cleared before 0.89;
     runs at most once, seeds each cleared hero-and-road from the local archive */
  try{backfillLanternFromHistory(store(),readReportState(store()).recent);}catch(e){}
  /* hand the route presenters the flow callbacks that stay in ui.js (dispatch,
     render, persistence, economy, run lifecycle). route-ui never imports ui.js;
     this is the one-way bridge. All targets are hoisted function declarations. */
  wireRouteUI({dispatchRoute:dispatchRoute,renderAll:renderAll,checkpointActiveRun:checkpointActiveRun,
    criticalSave:criticalSave,presentAfterReward:presentAfterReward,fuseStamp:fuseStamp,fuseWithVault:fuseWithVault,
    commitRouteDecision:commitPreparedRouteDecision,
    computeT:computeT,mkOffer:mkOffer,heroOf:heroOf,newRoute:newRoute,restoreRoute:restoreRoute,clearRoute:clearRoute,
    replayHistoryRun:replayHistoryRun,hasActiveRoute:hasActiveRoute,
    lanternHighest:function(mode,heroId){return lanternHighest(store(),mode,heroId);},
    metricPhase:metricPhase,metricEvent:metricEvent,metricSnapshot:metricSnapshot,
    recordLanternClear:function(){return recordLanternClear(store(),G.run.routeMode||'quick',G.hero,G.run.lantern||0);}});
  bindMetricVisibility();
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
  if(dr&&dr.retired){music('title');openRetiredRouteNotice(dr);}
  else if(dr){music('market');openRouteContinue(dr);}
  else{music('title');openIntro();}
  /* dev-only hooks for driving playtests from the console; the guard
     matches the service worker's, so the live site never carries them */
  if(typeof location!=='undefined'&&location.hostname.match(/^(localhost|127\.)/)){
    globalThis.BBDEV={g:function(){return G;},rollShop:rollShop,renderAll:renderAll,
      openUniquePick:openUniquePick,bark:bark,music:music,musicNow:musicNow,
      newRoute:newRoute,dispatchRoute:dispatchRoute,frontier:function(){return frontier(G.run.route,G.route.map);},
      routeState:function(){return G.run.route;},
      prepareRouteDecision:prepareRouteDecision,routeEventCard:routeEventCard,
      /* reward-flow hooks so the resume e2e can exercise the gild/unique choice
         branch without walking deep into the route to a choice-bounty monster */
      settleFixed:function(plan,nodeId){var key=rewardKey(G.run.runId,nodeId||'test',0);settleFixed(G.run,plan,key);return key;},
      settleRouteReward:settleRouteReward,presentAfterReward:presentAfterReward,
      checkpoint:checkpointActiveRun,routeEnd:routeEnd};
  }
}
