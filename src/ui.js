"use strict";
import {TICK,SPEED,RSTAT,RNAME,BASEINTEG,COST,SELLV,TIERCOST,CATN,CATC,BANDN,BANDC,ANONE,
        ITEMS,TRINKETS,ANOMALIES,PERSONAS,MONSTERS,MONBAND,MONCHIP,ENCH,ENCH_CHANCE,ENCH_PREMIUM,HEROES} from './data.js';
import {mulberry,fightHP,stormAt,gateOK,makeItem,integOf,fuseScan,usedCells,
        playerFightItems,monsterSide,genRival,createFight,runHeadless,boardRegen} from './engine.js';
import {ic} from './art.js';
import {ART} from './art-manifest.js';
import {fxHit,fxDestroy,fxForge,fxCoinRain,fxStorm} from './fx.js';
import {sHit,sTick,sDestroy,sForge,sCoin,sFanfare,sWin,sLose,sCreak,sStorm,sfxToggle,sfxMuted} from './sfx.js';
import {initMusic,music,musicMute} from './music.js';
/* ============ SESSION + UI PRIMITIVES ============ */
let G=null;let RM=false;const BEST={place:null,round:0};
let FSPD=(function(){try{return +window.localStorage.getItem('bb-speed')||1;}catch(e){return 1;}})();
if(FSPD!==2)FSPD=1;
/* ============ SAVES ============ */
const SAVE_VERSION=1;
const SAVE_KEY='bb-run', BEST_KEY='bb-best';
function store(){try{return window.localStorage;}catch(e){return null;}}
function persistBest(){const s=store();if(!s)return;try{s.setItem(BEST_KEY,JSON.stringify({v:SAVE_VERSION,place:BEST.place,round:BEST.round}));}catch(e){}}
function loadBest(){const s=store();if(!s)return;try{const d=JSON.parse(s.getItem(BEST_KEY)||'null');if(d&&d.v===SAVE_VERSION){BEST.place=d.place;BEST.round=d.round;}}catch(e){}}
function clearRun(){const s=store();if(!s)return;try{s.removeItem(SAVE_KEY);}catch(e){}}
function snapshotRun(){
  const s=store();if(!s||!G||!G.door)return;
  const item=function(it){return {id:it.id,rarity:it.rarity,size:it.size,ench:it.ench||null};};
  const d={v:SAVE_VERSION,seed:G.seed,rngSeed:(G.seed+G.round*1013904223+7)>>>0,
    round:G.round,gold:G.gold,tier:G.tier,tierCost:G.tierCost,relicIncome:G.relicIncome,spoils:G.spoils||0,frozen:!!G.frozen,fightN:G.fightN,hero:G.hero||null,
    nextOppI:G.nextOpp?G.nextOpp.i:-1,pairsI:(G.nextPairs||[]).map(function(pr){return [pr[0].i,pr[1]?pr[1].i:-1];}),
    anom:G.anom.id,tags:G.tags.slice(),usedMon:Object.assign({},G.usedMon),
    board:G.board.map(item),vault:G.vault.map(item),shop:G.shop.map(function(w){return {id:w.id,free:!!w.free,bought:!!w.bought,ench:w.ench||null};}),
    trinkets:G.trinkets.map(function(t){return t.id;}),
    door:{mid:G.door.mid,gilded:G.door.gilded,safe:G.door.safe,done:G.door.done,result:G.door.result},
    departed:G.departed?{board:G.departed.board.map(item),nm:G.departed.nm,p:G.departed.p}:null,
    players:G.players.map(function(p){return {i:p.i,hp:p.hp,alive:p.alive,shrine:p.shrine,place:p.place,persona:p.persona?p.persona.n:null};})};
  try{s.setItem(SAVE_KEY,JSON.stringify(d));}catch(e){}
}
function loadRun(){
  const s=store();if(!s)return null;
  try{
    const d=JSON.parse(s.getItem(SAVE_KEY)||'null');
    if(!d||d.v!==SAVE_VERSION){if(d)s.removeItem(SAVE_KEY);return null;}
    return d;
  }catch(e){return null;}
}
function reviveItem(b){const it=makeItem(b.id,b.rarity,b.ench||null);it.size=b.size;return it;}
function restoreRun(d){
  const anom=ANOMALIES.filter(function(a){return a.id===d.anom;})[0]||ANOMALIES[0];
  G={seed:d.seed,rng:mulberry(d.rngSeed),round:d.round,anom:anom,A:Object.assign({},ANONE,anom.m),tags:d.tags,
     players:[],board:d.board.map(reviveItem),vault:(d.vault||[]).map(reviveItem),
     shop:d.shop.slice(),trinkets:d.trinkets.map(function(id){return TRINKETS.filter(function(t){return t.id===id;})[0];}).filter(Boolean),
     T:null,hero:d.hero||null,gold:d.gold,tier:d.tier,tierCost:d.tierCost,relicIncome:d.relicIncome,spoils:d.spoils||0,frozen:!!d.frozen,
     door:d.door,sel:null,vsel:null,swapV:null,tut:null,phase:'draft',fightN:d.fightN,
     departed:d.departed?{board:d.departed.board.map(reviveItem),nm:d.departed.nm,p:d.departed.p}:null,
     feed:[],usedMon:d.usedMon||{},fiv:null,burned:0,enteredGold:0,
     otherPairs:[],pendOpp:null,pendFoe:null,F:null,you:null};
  for(let k=0;k<d.players.length;k++){
    const sp=d.players[k];
    if(sp.i===0){G.players.push({i:0,n:'You',short:'You',p:'p-0',hp:sp.hp,alive:sp.alive,shrine:sp.shrine,place:sp.place});}
    else{
      const per=PERSONAS.filter(function(x){return x.n===sp.persona;})[0]||PERSONAS[sp.i-1];
      G.players.push({i:sp.i,n:per.n,short:shortName(per.n),p:per.p,hp:sp.hp,alive:sp.alive,shrine:sp.shrine,persona:per,cur:null,lastCur:null,place:sp.place});
    }
  }
  G.you=G.players[0];
  const H=heroOf();if(H){G.players[0].p=H.g;}
  const byI=function(i){return G.players.filter(function(p){return p.i===i;})[0]||null;};
  if(d.pairsI){
    G.nextOpp=d.nextOppI>=0?byI(d.nextOppI):null;
    G.nextPairs=d.pairsI.map(function(pr){return [byI(pr[0]),pr[1]>=0?byI(pr[1]):null];}).filter(function(pr){return pr[0];});
  }else{pairRound();}
  computeT();
  renderAll();
  toast('Run resumed at round '+G.round);
}
function openContinue(d){
  const o=ovOpen('<div class="card"><div class="rays"></div>'
   +'<div class="kick gold">The Lantern Still Burns</div>'
   +ic('g-lantern','bigic')
   +'<h2 class="big">Round '+d.round+' Awaits</h2>'
   +'<p>Your stall from last time is still standing.</p>'
   +'<div style="display:flex;gap:8px;justify-content:center;margin-top:10px">'
   +'<button class="btn gold" id="ctGo">Continue Run</button>'
   +'<button class="btn" id="ctNew">New Lobby</button></div></div>');
  o.querySelector('#ctGo').onclick=function(){ovClose(o);restoreRun(d);};
  o.querySelector('#ctNew').onclick=function(){ovClose(o);clearRun();newLobby();};
}
function $(id){return document.getElementById(id);}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function ord(n){const s=["th","st","nd","rd"],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0]);}
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
function bandOf(r){return r<=3?1:(r<=6?2:(r<=9?3:4));}
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
function effChips(id,rarity){
  const d=ITEMS[id];const rs=RSTAT[rarity||0];const c=[];const f=d.fx||{};
  if(f.dmg)c.push(['dmg','e-blade',Math.round(f.dmg*rs)]);
  if(f.poison)c.push(['poison','e-skull',Math.round(f.poison*rs)]);
  if(f.burn)c.push(['burn','e-flame',Math.round(f.burn*rs)]);
  if(f.shield)c.push(['shield','e-shield',Math.round(f.shield*rs)]);
  if(f.heal)c.push(['heal','e-heart',Math.round(f.heal*rs)]);
  if(f.haste)c.push(['util','e-bolt',(Math.round(f.haste*rs*10)/10)+'s haste']);
  if(d.inc)c.push(['util','e-bolt','+'+Math.round(d.inc*rs)+'g/rd']);
  if(d.adjDmg)c.push(['util','e-blade','adj +'+Math.round(d.adjDmg*rs)]);
  if(d.cdMul)c.push(['util','e-clock','12% faster']);
  if(d.bulwark)c.push(['shield','e-shield','Bulwark']);
  return c.map(function(x){return '<span class="eff '+x[0]+'">'+ic(x[1],'mi')+' '+x[2]+'</span>';}).join('');
}
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
  board.forEach(function(it,i){h+=cellHTML(it,i,i===selIdx);});
  const used=usedCells(board);
  for(let c=used;c<slots;c++){h+='<div class="cell empty"></div>';}
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
function renderBest(){$('best').innerHTML=(BEST.place?('Best <b>'+ord(BEST.place)+'</b><br>'):'')+'Round <b>'+(G?G.round:0)+'</b>';}
function standingsInfo(){
  const ps=G.players.slice().sort(function(a,b){if(a.alive!==b.alive)return a.alive?-1:1;return b.hp-a.hp;});
  return {ps:ps,top:(ps[0]&&ps[0].alive)?ps[0]:null,place:ps.indexOf(G.you)+1,alive:ps.filter(function(p){return p.alive;}).length};
}
/* the acts pass folded the rivals strip, anomaly bar, and trinket row
   into ribbon chips with tap drawers; the old containers stay empty */
function renderRivals(){$('rivals').innerHTML='';}
function renderAno(){$('anobar').innerHTML='';}
function renderTrow(){$('trow').innerHTML='';}
function renderRibbon(){
  const s=standingsInfo();
  $('ribbon').innerHTML=
   '<div class="chip"><span class="lab">Round</span>'+G.round+'</div>'
  +'<div class="chip gold">'+ic('g-coin','ci')+G.gold+'</div>'
  +'<div class="chip hp">'+ic('g-heart','ci')+Math.max(0,G.you.hp)+'</div>'
  +'<div class="chip"><span class="lab">Tier</span><span>'+ic('g-gem','ci')+' '+G.tier+'</span></div>'
  +'<button class="chip act" id="chipStand">'+ic('g-crown','ci')+ord(s.place)+' of '+s.alive+'</button>'
  +'<button class="chip act grow" id="chipAno">'+ic(G.anom.g,'ci')+'<span class="lab2">'+G.anom.n+'</span></button>'
  +(G.trinkets.length?'<button class="chip act" id="chipTrk">'+G.trinkets.map(function(t){return ic(t.g,'ci');}).join('')+'</button>':'');
  const a=$('chipStand');if(a)a.onclick=openStandings;
  const b=$('chipAno');if(b)b.onclick=openAnoInfo;
  const c=$('chipTrk');if(c)c.onclick=openTrkInfo;
}
function openStandings(){
  const s=standingsInfo();
  const o=ovOpen('<div class="card"><div class="kick gold">The Lobby</div>'
   +'<h2 class="big" style="font-size:23px">Standings</h2>'
   +'<div class="rivals drawer">'+s.ps.map(function(p){
      const w=Math.max(0,Math.min(100,p.hp/40*100));
      return '<div class="rv'+(p.i===0?' you':'')+(p.alive?'':' dead')+'">'
       +((p===s.top)?ic('g-crown','crn'):'')
       +ic(p.p,'pv')+'<div class="nm">'+esc(p.short)+'</div>'
       +'<div class="rh"><i style="width:'+w+'%"></i></div><b>'+Math.max(0,p.hp)+'</b>'
       +(p.alive?'':'<div class="skl">'+ic('e-skull','','width:16px;height:16px')+'</div>')
      +'</div>';}).join('')+'</div>'
   +'<p style="margin-top:10px;opacity:.7">Tap anywhere to close</p></div>');
  o.onclick=function(){ovClose(o);};
}
function openAnoInfo(){
  const o=ovOpen('<div class="card"><div class="rays"></div><div class="kick">Anomaly</div>'
   +ic(G.anom.g,'bigic')+'<h2 class="big" style="font-size:25px">'+G.anom.n+'</h2>'
   +'<p>'+G.anom.d+'</p><p>Featured wares: <b>'+CATN[G.tags[0]]+' + '+CATN[G.tags[1]]+'</b></p>'
   +'<p style="opacity:.7">Tap anywhere to close</p></div>');
  o.onclick=function(){ovClose(o);};
}
function openTrkInfo(){
  const o=ovOpen('<div class="card"><div class="kick gold">Trinkets</div>'
   +'<h2 class="big" style="font-size:23px">Your Charms</h2>'
   +G.trinkets.map(function(t){return '<p><b>'+t.n+'</b> '+t.d+'</p>';}).join('')
   +'<p style="opacity:.7">Tap anywhere to close</p></div>');
  o.onclick=function(){ovClose(o);};
}
/* ============ DOORS ============ */
function doorCtx(){return {gold:G.gold,round:G.round,A:G.A,gilded:G.door.gilded,playerBoard:G.board,playerHp:fightHP(G.round,G.T.hpFlat,G.A)};}
function bountyText(D){
  const M=MONSTERS[D.mid];const b=M.bounty;const parts=[];
  if(b.gold){parts.push((b.gold*(D.gilded?2:1))+' gold');}
  if(b.items){b.items.forEach(function(id){parts.push(ITEMS[id].n+' (free)');});}
  if(b.gild){parts.push('Gild one of your wares');}
  if(b.relic){parts.push('enter with 8+ gold for +1 income forever');}
  if(b.mote){parts.push('Fusion Mote: a free bronze copy of your commonest ware');}
  if(b.drain){parts.push('minus 1 for every Sticky Paws grab');}
  if(b.pickUnique){parts.push('Pick any unique ware from the vault');}
  return parts.join(' &middot; ');
}
function safeText(s){
  if(s.t==='gold')return '<b>3 gold</b>, no questions asked';
  if(s.t==='patch')return 'Mend <b>4 health</b>';
  return 'A free <b>'+ITEMS[s.id].n+'</b>';
}
function doorsHTML(){
  const D=G.door;const M=MONSTERS[D.mid];
  if(D.done){
    return '<div class="door mon" style="--bandc:'+BANDC[M.band]+';min-height:60px"><div class="dh"><div class="md">'+ic(M.glyph,'','width:30px;height:30px')+'</div><div><div class="dn">'+M.n+'</div><div class="db">'+BANDN[M.band]+'</div></div></div><div class="stamp">'+D.result+'</div></div>';
  }
  const side=monsterSide(D.mid,doorCtx());
  const mb=side.items.map(function(fi){
    const ps=primStat(fi);
    return '<div class="mb">'+ic(fi.g,'','width:22px;height:22px')
     +(ps?'<span class="md2">'+ps[1]+'</span>':'')
     +'<span class="ms">'+fi.integ+'</span></div>';
  }).join('');
  const mirrorNote=(M.special==='mirror')?'<div class="risk" style="color:var(--dim)">It copies your stall at 85% strength.</div>':'';
  const goldNote=(M.special==='gold')?'<div class="risk" style="color:var(--dim)">Its health and blade grow with your unspent gold.</div>':'';
  const regenNote=M.regen?'<div class="risk" style="color:var(--dim)">It knits shut: +'+side.regen+' health a second.</div>':'';
  const stormNote=M.stormAt?'<div class="risk" style="color:var(--dim)">The sand comes early: storm at '+M.stormAt+' s.</div>':'';
  const frostNote=side.items.some(function(fi){return fi.fx&&fi.fx.freeze;})?'<div class="risk" style="color:var(--dim)">It breathes cold: your leftmost ware freezes solid.</div>':'';
  const critMax=side.items.reduce(function(m,fi){return Math.max(m,fi.crit||0);},0);
  const critNote=critMax>0?'<div class="risk" style="color:var(--dim)">It strikes true: '+Math.round(critMax*100)+'% chance of double damage.</div>':'';
  const rattleNote=side.items.some(function(fi){return fi.rattle;})?'<div class="risk" style="color:var(--dim)">Break it or wait: either way, something worse gets out.</div>':'';
  const ammoNote=side.items.some(function(fi){return fi.maxAmmo>0;})?'<div class="risk" style="color:var(--dim)">It runs on ammunition: kill the reloader and it falls silent.</div>':'';
  const lotNote=side.items.some(function(fi){return fi.fx&&fi.fx.disable;})?'<div class="risk" style="color:var(--dim)">It auctions your finest weapon every few seconds, and pays you for it.</div>':'';
  return '<div class="doors">'
   +'<div class="door mon'+(D.gilded?' gild':'')+'" id="doorM" style="--bandc:'+BANDC[M.band]+'">'
    +'<div class="dh"><div class="md">'+ic(M.glyph,'','width:30px;height:30px')+'</div>'
    +'<div><div class="dn">'+M.n+'</div><div class="db">'+BANDN[M.band]+(D.gilded?' &middot; GILDED':'')+'</div></div>'
    +'<div class="dhp">HEALTH<b>'+side.hp+'</b></div></div>'
    +'<div class="mbrow">'+mb+'</div>'
    +'<div class="bounty">Bounty: <b>'+bountyText(D)+'</b></div>'
    +mirrorNote+goldNote+regenNote+stormNote+frostNote+critNote+rattleNote+ammoNote+lotNote
    +'<div class="risk">Defeat costs '+MONCHIP[M.band]+' health. Tap to fight.</div>'
   +'</div>'
   +'<div class="door safe" id="doorS">'+ic('g-door','sfi')
    +'<div class="dn">The Easy Way Out</div>'
    +'<div class="bounty">'+safeText(D.safe)+'</div>'
   +'</div>'
  +'</div>';
}
/* ============ MARKET ============ */
function wareHTML(w,i){
  const d=ITEMS[w.id];
  const cost=w.free?0:COST[d.size]+(w.ench?ENCH_PREMIUM:0);
  const can=!w.bought&&(w.free||G.gold>=cost)&&(usedCells(G.board)+d.size<=4+G.tier);
  const own=G.board.filter(function(x){return x.id===w.id&&x.rarity===0;}).length;
  const trip=own>=2&&!w.bought;
  let gems='';for(let g=0;g<d.tier;g++){gems+=ic('g-gem');}
  let pips='';for(let s=1;s<=3;s++){pips+='<i class="'+(s<=d.size?'on':'')+'"></i>';}
  const en=w.ench?ENCH[w.ench]:null;
  const anim=G._wfresh?';animation-delay:'+(i*45)+'ms':';animation:none';
  return '<div class="ware'+(w.bought?' gone':(can?'':' cant'))+(en?' enchw':'')+(trip?' trip':'')+(G.frozen&&!w.bought?' icew':'')+'" data-w="'+i+'" style="--cat:'+CATC[d.cat]+(en?';--ec:'+en.c:'')+anim+'">'
   +'<div class="ph">'+ic('g-'+w.id,'gi')+'<span class="cost'+(w.free?' free':'')+'">'+ic('g-coin')+'<b>'+(w.free?'FREE':cost)+'</b></span></div>'
   +'<div class="tg">'+gems+'</div>'
   +'<div class="wn">'+(en?'<span style="color:'+en.c+'">'+en.n+'</span> ':'')+d.n+'</div>'
   +'<div class="sz">'+pips+'</div>'
   +'<div class="chips">'+effChips(w.id,0)+(en?'<span class="eff util" style="color:'+en.c+'">'+ic('e-bolt','mi')+' '+en.d+'</span>':'')+(trip?'<span class="eff trip">'+ic('e-bolt','mi')+' Forges Silver</span>':'')+'</div>'
   +'<div class="wr">'+(d.cd>0?ic('e-clock','mi')+' '+d.cd+'s':'<span>passive</span>')+'<span>'+ic('e-shield','mi')+' '+Math.round(BASEINTEG[d.size]*(d.integMul||1))+'</span></div>'
   +(own>0?'<div class="own">'+own+'/3</div>':'')
  +'</div>';
}
function sheetInfoHTML(it){
  const d=ITEMS[it.id];const en=it.ench?ENCH[it.ench]:null;
  return '<div class="st"><span class="ico" style="width:34px;height:34px">'+ic('g-'+it.id,'','width:100%;height:100%')+'</span>'
   +'<div><div class="nm">'+RNAME[it.rarity]+' '+(en?'<span style="color:'+en.c+'">'+en.n+'</span> ':'')+d.n+'</div><div class="ds">'+(en?en.d+' ':'')+d.d+'</div>'
   +'<div style="margin-top:5px">'+effChips(it.id,it.rarity)+'<span class="eff util">'+ic('e-shield','mi')+' '+integOf(it)+'</span>'+(d.cd>0?'<span class="eff util">'+ic('e-clock','mi')+' '+d.cd+'s</span>':'')+'</div></div></div>';
}
function renderVaultSheet(sh){
  const it=G.vault[G.vsel];
  const room=usedCells(G.board)+it.size<=4+G.tier;
  sh.innerHTML='<div class="sheet">'+sheetInfoHTML(it)
   +'<div class="bs"><button class="btn" id="vOut"'+(room?'':' disabled')+'>To the Stall</button>'
   +'<button class="btn" id="vSwp"'+(G.board.length?'':' disabled')+'>Swap</button>'
   +'<button class="btn sell" id="vSl">Sell +'+SELLV[it.size]+'</button></div></div>';
  const O=$('vOut');if(O)O.onclick=function(){
    if(usedCells(G.board)+it.size>4+G.tier)return;
    G.vault.splice(G.vsel,1);G.vsel=null;G.board.push(it);
    const forged=fuseScan(G.board);
    if(forged.length){forged.forEach(function(f){toast('Forged: '+RNAME[f.rarity]+' '+ITEMS[f.id].n);});sForge();}
    else{toast(ITEMS[it.id].n+' returns to the stall');}
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
  if(forged.length){forged.forEach(function(f){toast('Forged: '+RNAME[f.rarity]+' '+ITEMS[f.id].n);});sForge();}
  else{toast(ITEMS[outIt.id].n+' rests in the vault. '+ITEMS[inIt.id].n+' takes the stall.');}
  renderAll();
}
function renderSheet(){
  const sh=$('sheet');if(!sh)return;
  if(G.dockV&&G.vsel!=null&&G.vault[G.vsel]){renderVaultSheet(sh);return;}
  if(G.sel==null||!G.board[G.sel]){sh.innerHTML='';return;}
  const it=G.board[G.sel];
  sh.innerHTML='<div class="sheet">'+sheetInfoHTML(it)
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
    +'<button class="btn" id="btnTier"'+((G.tier>=6||G.gold<G.tierCost)?' disabled':'')+'>'+ic('g-gem','bi')+' '+(G.tier>=6?'Tier Max':'Tier '+(G.tier+1)+' ('+G.tierCost+')')+'</button>'
    +'<button class="btn" id="btnRe"'+(G.gold<1?' disabled':'')+'>Reroll 1</button>'
    +'<button class="btn'+(G.frozen?' iceon':'')+'" id="btnFrz">'+(G.frozen?'Frozen':'Freeze')+'</button>'
  +'</div></div>';
  h+='</div>';
  h+='<div class="dock"><div class="docktop"><div class="label" style="margin:0">'+(G.dockV?'The Vault':'Your Stall')
   +'<span class="side">'+(G.dockV?'no fights, no forging':(G.swapV!=null?'tap a ware to trade with the vault':used+' / '+slots+' slots'))+'</span></div>'
   +'<button class="btn mini" id="dockFlip">'+(G.dockV?'Stall':'Vault'+(G.vault.length?' ('+G.vault.length+')':''))+'</button>'
   +'<button class="btn gold tob" id="btnGo">'+ic(G.nextOpp?G.nextOpp.p:'m-qareen','bi vsp')+' Duel '+esc(G.nextOpp?shortName(G.nextOpp.n):'the Departed')+'</button></div>';
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
    G.sel=(G.sel===i?null:i);renderDraft();
  };});
  document.querySelectorAll('#vlt .cell.it').forEach(function(c){c.onclick=function(){
    const i=+c.dataset.v;if(!G.vault[i])return;
    G.vsel=(G.vsel===i?null:i);G.sel=null;renderDraft();
  };});
  document.querySelectorAll('.ware').forEach(function(w){w.onclick=function(){buyWare(+w.dataset.w);};});
  const bt=$('btnTier');if(bt)bt.onclick=tierUp;
  const br=$('btnRe');if(br)br.onclick=reroll;
  const bf=$('btnFrz');if(bf)bf.onclick=toggleFreeze;
  const bg=$('btnGo');if(bg)bg.onclick=toBattle;
  renderSheet();
}
function renderAll(){document.body.classList.add('run');document.body.classList.toggle('fight',G.phase==='fight');renderBest();renderRivals();renderRibbon();renderAno();renderTrow();if(G.phase==='draft'){renderDraft();}renderCoach();}
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
  if(G.tut==='market'){G.tut='forge';}
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
    sForge();
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
  if(G.gold<1)return;G.gold-=1;G.frozen=false;rollShop();renderRibbon();renderDraft();
}
function toggleFreeze(){
  G.frozen=!G.frozen;
  toast(G.frozen?'The shop holds until dawn.':'The shop thaws.');
  renderDraft();
}
/* the gate: the doors stand between the market and the duel. Tapping
   To Battle opens this once per round; the player fights the monster
   or takes the easy way out, then the duel begins. Gold spoils would
   burn at dusk seconds after they landed, so they wait for dawn. */
function openGate(){
  if(!G.door||G.door.done||G.phase!=='draft'){proceedToDuel();return;}
  const D=G.door;const M=MONSTERS[D.mid];
  if(M.band===4&&!G.barkedBoss){G.barkedBoss=true;bark('boss',true);}
  const o=ovOpen('<div class="card knock'+(D.gilded?' gild':'')+'">'
   +'<div class="rays'+(D.gilded?'':' red')+'"></div>'
   +'<div class="kick'+(D.gilded?' gold':'')+'">'+(D.gilded?'A Gilded Door Bars the Way':'A Door Bars the Way')+'</div>'
   +'<h2 class="big" style="font-size:24px">'+BANDN[bandOf(G.round)]+'</h2>'
   +doorsHTML()
   +'<p style="font-size:11px;color:var(--dim);margin-top:8px">Gold spoils arrive at dawn. Tonight, the duel.</p></div>');
  if(G.tut==='ready'){G.tut='gate';renderCoach();}
  const dm=o.querySelector('#doorM');if(dm)dm.onclick=function(){if(G.tut==='gate'){G.tut='wait';renderCoach();}ovClose(o);startMonsterFight();};
  const ds=o.querySelector('#doorS');if(ds)ds.onclick=function(){if(G.tut==='gate'){G.tut='wait';renderCoach();}ovClose(o);takeSafe();};
}
function takeSafe(){
  const D=G.door;if(D.done||G.phase!=='draft')return;const s=D.safe;
  if(s.t==='gold'){G.spoils=(G.spoils||0)+3;toast('You take the easy way out. 3 gold at dawn.');}
  else if(s.t==='patch'){G.you.hp=Math.min(40,G.you.hp+4);toast('You take the easy way out. 4 health mended.');}
  else{G.shop.push({id:s.id,free:true,bought:false});toast('You take the easy way out. A free '+ITEMS[s.id].n+' waits in tomorrow\'s market.');}
  D.done=true;D.result='SAFE PATH';
  renderAll();
  proceedToDuel();
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
function logLine(html,mini,color){
  const l=$('log');if(!l)return;
  const d=document.createElement('div');d.className='li';
  d.innerHTML=(mini?'<svg class="lmi" style="color:'+color+'"><use href="#'+mini+'"/></svg>':'')+'<span>'+html+'</span>';
  l.prepend(d);
  while(l.children.length>26){l.lastChild.remove();}
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
    if(F.stormOn){sc.classList.add('live');st.textContent='SANDSTORM';$('sand').classList.add('on');}
    else{st.textContent='Storm '+Math.max(0,Math.ceil((F.stormAt-F.t)/1000))+'s';}
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
    else if(e.k==='destroy'){const c=$('fc-'+e.side+'-'+e.i);if(c)c.classList.add('dead');logLine('<b class="r">'+esc(e.nm)+'</b> destroyed','e-skull','#ff8d76');const p=ctrOf(c);if(p&&!RM)fxDestroy(p.x,p.y);sDestroy();}
    else if(e.k==='hhit'){
      fltFx(e.side,'-'+e.amt,'#ff8d76','e-blade',e.amt);
      const fg=$('fg-'+e.side);if(fg){fg.classList.remove('hit');void fg.offsetWidth;fg.classList.add('hit');}
      if(lastFire&&lastFire.side!==e.side){streakFx($('fc-'+lastFire.side+'-'+lastFire.i),fg);}
      const p=ctrOf(fg);if(p&&!RM)fxHit(p.x,p.y,e.amt);sHit(e.amt);
      if(e.amt>=30)shake();if(e.amt>=46)flashScr();
      if(e.amt>=18)logLine((e.side==='a'?'You take ':'They take ')+'<b class="r">'+e.amt+'</b>','e-blade','#ff8d76');
    }
    else if(e.k==='storm'){fltFx(e.side,'-'+e.amt,'#e8c27a','e-bolt',e.amt);}
    else if(e.k==='shield'){fltFx(e.side,'+'+e.amt,'#6fe0cd','e-shield',false);}
    else if(e.k==='heal'){fltFx(e.side,'+'+e.amt,'#ffb3b8','e-heart',false);if(e.amt>=22)logLine((e.side==='a'?'You mend ':'They mend ')+'<b class="t">'+e.amt+'</b>','e-heart','#ffb3b8');}
    else if(e.k==='pois'){fltFx(e.side,'+'+e.amt,'#c0e070','e-skull',false);}
    else if(e.k==='burn'){fltFx(e.side,'+'+e.amt,'#ffb066','e-flame',false);}
    else if(e.k==='tickp'){fltFx(e.side,'-'+e.amt,'#c0e070','e-skull',false);sTick();}
    else if(e.k==='tickb'){fltFx(e.side,'-'+e.amt,'#ffb066','e-flame',false);sTick();}
    else if(e.k==='pocket'){fltFx(e.side,'-'+e.amt,'#e8c27a','e-bolt',false);logLine('<b class="y">Sticky Paws pockets '+e.amt+' bounty gold</b>','e-bolt','#e8c27a');}
    else if(e.k==='freeze'){const c=$('fc-'+e.side+'-'+e.i);if(c)c.classList.add('frz');fltFx(e.side,e.amt+'s','#9ad8ef','e-clock',false);sTick();}
    else if(e.k==='thaw'){const c=$('fc-'+e.side+'-'+e.i);if(c)c.classList.remove('frz');}
    else if(e.k==='crit'){cellFx(e.side,e.i,'fire');logLine('<b class="y">Critical strike</b>','e-blade','#f4cf7c');}
    else if(e.k==='ammo'){if(e.left===0){fltFx(e.side,'empty','#8d7f6c','e-clock',false);logLine('<b class="r">The cannon clicks empty</b>','e-clock','#8d7f6c');}}
    else if(e.k==='reload'){fltFx(e.side,'reload','#e8c27a','e-bolt',false);}
    else if(e.k==='enrage'){cellFx(e.side,e.i,'fire');logLine('<b class="r">The survivors rage: cooldowns cut</b>','e-flame','#ff8d76');}
    else if(e.k==='lot'){const c=$('fc-'+e.side+'-'+e.i);if(c)c.classList.add('lot');logLine('<b class="y">SOLD: '+esc(e.nm)+'</b> leaves the fight','e-clock','#e8c27a');}
    else if(e.k==='lotpay'){fltFx(e.side,'+'+e.amt+'g','#e8c27a','e-bolt',false);}
    else if(e.k==='spawn'){const c=$('fc-'+e.side+'-'+e.i);const S=e.side==='a'?F.a:F.b;if(c&&S.items[e.i]){c.outerHTML=fightCellHTML(S.items[e.i],e.i,e.side);}logLine('<b class="t">'+esc(e.nm)+'</b> emerges','e-skull','#9dbb45');sDestroy();}
    else if(e.k==='stormstart'){logLine('<b class="y">The sandstorm arrives</b>','e-bolt','#e8c27a');if(!RM)fxStorm(true);sStorm(true);}
  }
}
function startFight(me,foe,opts){
  G.phase='fight';G.sel=null;music('battle');
  document.body.classList.add('fight');
  if(!RM){
    const dk=document.createElement('div');dk.className='dusk';
    dk.innerHTML='<div class="dt">Dusk Falls</div><div class="d2">Round '+G.round+' &middot; '+esc(foe.nm)+'</div>';
    document.body.appendChild(dk);
    setTimeout(function(){dk.remove();},2250);
  }
  const F=createFight({a:me,b:foe,stormAt:(opts&&opts.stormAt)||stormAt(G.round),seed:(G.seed+G.round*7919+(++G.fightN)*104729)>>>0,playerIs:'a'});
  G.F=F;
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
        const pct=Math.min(100,it.timer/it.cd*100).toFixed(1);
        const col=it.frozen>0?'rgba(154,216,239,.65)':(it.maxAmmo>0&&it.ammo<=0?'rgba(140,127,108,.45)':(it.lot?'rgba(120,110,95,.3)':'rgba(244,207,124,.55)'));
        el.style.opacity='1';
        el.style.background='conic-gradient('+col+' '+pct+'%, rgba(0,0,0,.18) 0)';
      }
    }
  }
  paintCds();
  let acc=0;
  G.fiv=setInterval(function(){
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
}
/* ============ MONSTER FIGHTS ============ */
function startMonsterFight(){
  const D=G.door;if(!D||D.done||G.phase!=='draft')return;
  G.enteredGold=G.gold;sCreak();
  const M=MONSTERS[D.mid];
  const foe=monsterSide(D.mid,doorCtx());
  const me={nm:'You',portrait:G.you.p,hp:fightHP(G.round,G.T.hpFlat,G.A),items:playerFightItems(G.board,G.T,G.A,1),lifesteal:G.T.lifesteal||0,regen:boardRegen(G.board)};
  startFight(me,foe,{onEnd:endMonsterFight,stormAt:M.stormAt?M.stormAt*1000:0});
}
function endMonsterFight(F){
  const D=G.door;const M=MONSTERS[D.mid];D.done=true;G.phase='draft';
  if(F.lotPaid){G.spoils=(G.spoils||0)+F.lotPaid;toast('The Auctioneer owes you '+F.lotPaid+' gold, paid at dawn.');}
  if(F.winner==='a'){
    D.result='SLAIN';const b=M.bounty;
    /* every kill pays: at least 1 gold rides home even from item bounties */
    let coin=0;
    if(b.gold){
      const purse=b.gold*(D.gilded?2:1);
      const drained=b.drain?Math.min(F.pocketed||0,purse):0;
      coin=purse-drained;
      if(drained>0){toast('The monkey kept '+drained+' gold of the bounty.');}
    }
    if(coin<1)coin=1;
    G.spoils=(G.spoils||0)+coin;
    if(b.items){b.items.forEach(function(id){G.shop.push({id:id,free:true,bought:false});});}
    if(b.relic&&G.enteredGold>=8){G.relicIncome+=1;toast('Income relic: +1 gold every round');}
    if(b.mote){
      const counts={};G.board.forEach(function(it){if(it.rarity===0&&!ITEMS[it.id].unique)counts[it.id]=(counts[it.id]||0)+1;});
      let best=null;Object.keys(counts).forEach(function(id){if(!best||counts[id]>counts[best])best=id;});
      if(best){G.shop.push({id:best,free:true,bought:false});}
      else{G.spoils+=3;toast('The mote found nothing bronze to copy. 3 gold at dawn instead.');}
    }
    if(b.gild){renderAll();openGild('The mirror bows. Gild one ware.',proceedToDuel);return;}
    if(b.pickUnique){renderAll();openUniquePick('The vault opens. Take one.',proceedToDuel);return;}
    toast(M.n+' slain. '+coin+' gold at dawn'+(b.items?', bounty wares in tomorrow\'s market':'')+'.');
    renderAll();
    bark('win');
    proceedToDuel();
  }else{
    D.result='DRIVEN OFF';
    G.you.hp-=MONCHIP[M.band];
    toast('Driven off. Lost '+MONCHIP[M.band]+' health. The duel still waits.');
    if(G.you.hp<=0){handleYourDeath(function(){renderAll();});return;}
    renderAll();
    bark('loss');
    proceedToDuel();
  }
}
/* ============ GHOST DUELS ============ */
function scaleFor(round){return 1+Math.max(0,round-5)*0.03;}
function sideOf(p){return {nm:p.n,portrait:p.p,hp:p.cur.hp,items:playerFightItems(p.cur.board,{},G.A,scaleFor(G.round)),lifesteal:0};}
function departedSide(){
  if(G.departed&&G.departed.board.length){
    return {nm:G.departed.nm,portrait:G.departed.p,hp:fightHP(G.round,0,G.A),items:playerFightItems(G.departed.board,{},G.A,1),lifesteal:0};
  }
  const rb=genRival(G.round,PERSONAS[0],G.rng,G.A);
  return {nm:'A wandering ghost',portrait:'m-qareen',hp:fightHP(G.round,0,G.A),items:rb.items,lifesteal:0};
}
/* pairings roll at round start so the draft can telegraph tonight's
   duel; deaths only happen during battle resolution, so the pairing
   stays valid all round */
function pairRound(){
  const alive=G.players.filter(function(p){return p.alive;});
  const order=alive.slice();shuffle(order,G.rng);
  const pairs=[];let solo=null;
  for(let i=0;i+1<order.length;i+=2){pairs.push([order[i],order[i+1]]);}
  if(order.length%2===1){solo=order[order.length-1];}
  let opp=null;const others=[];
  for(let i=0;i<pairs.length;i++){
    const pr=pairs[i];
    if(pr[0].i===0){opp=pr[1];}
    else if(pr[1].i===0){opp=pr[0];}
    else{others.push(pr);}
  }
  if(solo&&solo.i!==0){others.push([solo,null]);}
  G.nextOpp=opp;G.nextPairs=others;
}
function toBattle(){
  if(G.phase!=='draft')return;
  if(!G.board.length){toast('Your stall is empty. Buy a ware first.');return;}
  if(G.door&&!G.door.done){openGate();return;}
  proceedToDuel();
}
function proceedToDuel(){
  if(G.phase!=='draft')return;
  if(G.nextOpp===undefined){pairRound();}
  for(let k=0;k<G.players.length;k++){
    const p=G.players[k];
    if(p.i>0&&p.alive){
      const rb=genRival(G.round,p.persona,G.rng,G.A);
      p.cur={board:rb.board,hp:fightHP(G.round,0,G.A)};
      p.lastCur=p.cur;
    }
  }
  G.otherPairs=G.nextPairs||[];
  G.pendOpp=G.nextOpp||null;
  openScout(G.pendOpp);
}
function openScout(opp){
  const foe=opp?sideOf(opp):departedSide();
  G.pendFoe=foe;
  const o=ovOpen('<div class="scout">'
   +'<div class="sh2">'+ic(foe.portrait,'fp')+'<div><div class="t">'+esc(foe.nm)+'</div>'
   +'<div class="u">'+(opp?('Lobby health '+opp.hp):'A ghost of a fallen stall')+'</div></div>'
   +'<div class="cd" id="scd">8</div></div>'
   +'<div class="lab2">Their stall</div>'
   +'<div class="board combat" style="pointer-events:none">'+foe.items.map(function(fi,i){return fightCellHTML(fi,i,'s');}).join('')+'</div>'
   +'<div class="lab2">Your stall &middot; tap to reorder, left is struck first</div>'
   +'<div id="scb"></div><div id="scm"></div>'
   +(G.gold>0?'<div class="burnnote">'+G.gold+' unspent gold burns at dusk</div>':'')
   +'<button class="btn gold" id="scGo" style="width:100%;margin-top:10px">'+ic('e-blade','bi')+' Fight</button>'
  +'</div>');
  let sel=null;let done=false;
  function draw(){
    o.querySelector('#scb').innerHTML='<div class="board">'+G.board.map(function(it,i){return cellHTML(it,i,i===sel);}).join('')+'</div>';
    o.querySelectorAll('#scb .cell.it').forEach(function(c){c.onclick=function(){const i=+c.dataset.i;sel=(sel===i?null:i);draw();};});
    o.querySelector('#scm').innerHTML=(sel==null)?'':'<div style="display:flex;gap:6px;margin-top:7px"><button class="btn" id="sml" style="flex:1"'+(sel===0?' disabled':'')+'>&#9664; Move</button><button class="btn" id="smr" style="flex:1"'+(sel>=G.board.length-1?' disabled':'')+'>Move &#9654;</button></div>';
    if(sel!=null){
      const l=o.querySelector('#sml');const r=o.querySelector('#smr');
      if(l)l.onclick=function(){if(sel>0){const t=G.board[sel];G.board[sel]=G.board[sel-1];G.board[sel-1]=t;sel--;draw();}};
      if(r)r.onclick=function(){if(sel<G.board.length-1){const t=G.board[sel];G.board[sel]=G.board[sel+1];G.board[sel+1]=t;sel++;draw();}};
    }
  }
  draw();
  let left=8;
  const tm=setInterval(function(){left--;const e=o.querySelector('#scd');if(e)e.textContent=left;if(left<=0)go();},1000);
  function go(){if(done)return;done=true;clearInterval(tm);ovClose(o);launchGhost();}
  o.querySelector('#scGo').onclick=go;
}
function launchGhost(){
  G.burned=G.gold;G.gold=0;
  const me={nm:'You',portrait:G.you.p,hp:fightHP(G.round,G.T.hpFlat,G.A),items:playerFightItems(G.board,G.T,G.A,1),lifesteal:G.T.lifesteal||0,regen:boardRegen(G.board)};
  startFight(me,G.pendFoe,{onEnd:endGhostFight});
}
function chkDeath(p,feed){
  if(p.hp>0)return;
  if(!p.shrine){p.shrine=true;p.hp=15;feed.push('<b>'+esc(p.short)+'</b> rose from the ashes');return;}
  const place=G.players.filter(function(x){return x.alive;}).length;
  p.alive=false;p.hp=0;p.place=place;
  G.departed={board:(p.cur?p.cur.board.slice():[]),nm:p.short+"'s ghost",p:p.p};
  feed.push('<span class="fk">'+esc(p.short)+' closes shop: '+ord(place)+' of 8</span>');
}
function endGhostFight(F){
  const opp=G.pendOpp;const feed=[];const iWon=(F.winner==='a');
  const dmg=G.round+F.survTiers(F.winner);
  if(iWon){
    if(opp){opp.hp-=dmg;feed.push('<b>You</b> beat '+esc(opp.short)+' <span class="fd">(-'+dmg+')</span>');chkDeath(opp,feed);}
    else{feed.push('<b>You</b> scattered the departed ghost');}
  }else{
    G.you.hp-=dmg;
    feed.push('<b>'+(opp?esc(opp.short):'The departed')+'</b> beat You <span class="fd">(-'+dmg+')</span>');
  }
  for(let i=0;i<G.otherPairs.length;i++){
    const pr=G.otherPairs[i];const p1=pr[0],p2=pr[1];
    const s1=sideOf(p1);const s2=p2?sideOf(p2):departedSide();
    const f2=runHeadless(createFight({a:s1,b:s2,stormAt:stormAt(G.round),seed:(G.seed+G.round*31+p1.i*977+(p2?p2.i:99)*613)>>>0,playerIs:null}));
    const d2=G.round+f2.survTiers(f2.winner);
    if(f2.winner==='a'){
      if(p2){p2.hp-=d2;feed.push('<b>'+esc(p1.short)+'</b> beat '+esc(p2.short)+' <span class="fd">(-'+d2+')</span>');chkDeath(p2,feed);}
      else{feed.push('<b>'+esc(p1.short)+'</b> held off the departed');}
    }else{
      p1.hp-=d2;
      feed.push('<b>'+(p2?esc(p2.short):'The departed')+'</b> beat '+esc(p1.short)+' <span class="fd">(-'+d2+')</span>');
      chkDeath(p1,feed);
    }
  }
  G.feed=feed;
  renderRivals();
  const contin=function(){
    if(!G.players.some(function(p){return p.i>0&&p.alive;})){championScreen();return;}
    banner(iWon,dmg,opp);
  };
  if(G.you.hp<=0){handleYourDeath(contin);}else{contin();}
}
function banner(iWon,dmg,opp){
  const who=opp?esc(opp.short):'the departed';
  if(iWon&&!RM)fxCoinRain();
  if(iWon)sWin();else sLose();
  const o=ovOpen('<div class="card"><div class="rays'+(iWon?'':' red')+'"></div>'
   +'<div class="kick'+(iWon?' gold':'')+'">Round '+G.round+' &middot; Dusk</div>'
   +'<h2 class="big'+(iWon?'':' bad')+'">'+(iWon?'Victory':'Defeat')+'</h2>'
   +'<p>'+(iWon?('You beat '+who+'. They lose <b style="color:#ff8d76">'+dmg+'</b> health.'):('You lost to '+who+' and take <b style="color:#ff8d76">'+dmg+'</b> health.'))+'</p>'
   +(G.burned>0?'<p style="font-size:11px;color:#e0a37a">'+G.burned+' gold burned at dusk</p>':'')
   +'<div class="feed">'+G.feed.map(function(f){return '<div>'+f+'</div>';}).join('')+'</div>'
   +'<button class="btn gold" id="bGo">Morning Comes</button></div>');
  o.querySelector('#bGo').onclick=function(){ovClose(o);nextRound();};
}
/* ============ ROUND FLOW ============ */
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
function income(){
  let inc=Math.min(10,3+G.round);
  for(let i=0;i<G.board.length;i++){
    const d=ITEMS[G.board[i].id];
    if(d.inc){inc+=Math.round(d.inc*RSTAT[G.board[i].rarity]);}
  }
  inc+=G.T.income+G.relicIncome;
  return Math.round(inc*G.A.goldMul);
}
function rollShop(){
  /* free bounty cards always carry over; a frozen shop keeps its paid
     cards too, counted against the roll, then the freeze is spent */
  const freeKeep=G.shop?G.shop.filter(function(w){return w.free&&!w.bought;}):[];
  const frozenKeep=(G.frozen&&G.shop)?G.shop.filter(function(w){return !w.free&&!w.bought;}):[];
  G.frozen=false;
  const n=Math.max(0,G.A.shopN-frozenKeep.length);
  const ids=Object.keys(ITEMS).filter(function(id){return gateOK(ITEMS[id].tier,G.tier)&&!ITEMS[id].unique;});
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
    if(G.rng()<ENCH_CHANCE){
      const d2=ITEMS[pick];
      const opts=Object.keys(ENCH).filter(function(e){
        const req=ENCH[e].need;
        return !req||(req==='dmg'?!!(d2.fx&&d2.fx.dmg):d2.cd>0);
      });
      if(opts.length){ench=opts[Math.floor(G.rng()*opts.length)];}
    }
    out.push({id:pick,free:false,bought:false,ench:ench});
  }
  G.shop=frozenKeep.concat(out).concat(freeKeep);
  G.shopFresh=true;
}
function rollDoor(){
  let b=bandOf(G.round);
  let pool=MONBAND[b].filter(function(m){return !G.usedMon[m];});
  /* every boss slain: fall back to the Palace Quarter pool instead of
     making rounds past the Dragon Gate a boss treadmill */
  if(!pool.length&&b===4){b=3;pool=MONBAND[b].filter(function(m){return !G.usedMon[m];});}
  if(!pool.length){for(let i=0;i<MONBAND[b].length;i++){delete G.usedMon[MONBAND[b][i]];}pool=MONBAND[b].slice();}
  let tot=0;
  const ws=pool.map(function(m){let w=1;if(G.tags.indexOf(MONSTERS[m].tag)>=0)w*=2;tot+=w;return w;});
  let r=G.rng()*tot,mid=pool[0];
  for(let i=0;i<pool.length;i++){r-=ws[i];if(r<=0){mid=pool[i];break;}}
  G.usedMon[mid]=1;
  const opts=[{t:'gold',v:3},{t:'patch',v:4},{t:'ware'}];
  const s=opts[Math.floor(G.rng()*3)];
  if(s.t==='ware'){
    const smalls=Object.keys(ITEMS).filter(function(id){return ITEMS[id].tier===1&&ITEMS[id].size===1;});
    s.id=smalls[Math.floor(G.rng()*smalls.length)];
  }
  G.door={mid:mid,gilded:(G.rng()<0.10),safe:s,done:false,result:''};
}
function nextRound(){
  G.round++;
  if(G.round>1&&G.tier<6){G.tierCost=Math.max(1,G.tierCost-1);}
  G.gold=income();
  if(G.spoils){G.gold+=G.spoils;toast('Spoils at dawn: +'+G.spoils+' gold');G.spoils=0;}
  rollShop();rollDoor();
  G.sel=null;G.vsel=null;G.swapV=null;G.phase='draft';G.dockV=false;
  if(G.tut&&G.round===2){G.tut='last';}
  pairRound();
  if(!RM){
    const dk=document.createElement('div');dk.className='dusk dawn';
    dk.innerHTML='<div class="dt">Round '+G.round+'</div><div class="d2">'+BANDN[bandOf(G.round)]+'</div>';
    document.body.appendChild(dk);
    setTimeout(function(){dk.remove();},2250);
  }
  if(G.round===5||G.round===8){openTrinkets(function(){snapshotRun();renderAll();});}
  else{snapshotRun();renderAll();}
  const rb=document.getElementById('ribbon');
  if(rb&&!RM){setTimeout(function(){flyCoins({left:rb.getBoundingClientRect().left+40,top:-24,width:60,height:10},6);},1100);}
}
/* ============ TRINKETS ============ */
function trinketOffers(){
  const counts={};
  for(let i=0;i<G.board.length;i++){const c=ITEMS[G.board[i].id].cat;counts[c]=(counts[c]||0)+1;}
  let top=null,tc=1;
  for(const c in counts){if(c!=='util'&&counts[c]>=2&&counts[c]>tc){tc=counts[c];top=c;}}
  const pool=TRINKETS.filter(function(t){return G.trinkets.indexOf(t)<0;});
  const offers=[];
  function take(f){
    const cs=pool.filter(function(t){return offers.indexOf(t)<0&&(!f||f(t));});
    if(!cs.length)return;
    offers.push(cs[Math.floor(G.rng()*cs.length)]);
  }
  if(top)take(function(t){return t.tag===top;});
  take(function(t){return t.tag==='neutral';});
  let guard=0;
  while(offers.length<4&&offers.length<pool.length&&guard++<20){take(null);}
  return shuffle(offers,G.rng);
}
function openTrinkets(cont){
  const offers=trinketOffers();
  if(!offers.length){cont();return;}
  const o=ovOpen('<div class="card"><div class="rays"></div>'
   +'<div class="kick gold">Round '+G.round+' Caravan</div>'
   +'<h2 class="big">Choose a Trinket</h2><p>A permanent boon for this run. Offers lean toward your stall.</p>'
   +'<div class="picks">'+offers.map(function(t,i){return '<div class="pick" data-t="'+i+'" style="animation-delay:'+(i*60)+'ms"><div class="ph2">'+ic(t.g,'','width:30px;height:30px')+'</div><div class="pn">'+t.n+'</div><div class="pd">'+t.d+'</div></div>';}).join('')+'</div></div>');
  o.querySelectorAll('.pick').forEach(function(p){
    p.onclick=function(){
      const t=offers[+p.dataset.t];
      G.trinkets.push(t);computeT();
      toast('Trinket: '+t.n);
      ovClose(o);cont();
    };
  });
}
/* ============ DEATH, SHRINE, ENDINGS ============ */
function handleYourDeath(cont){
  if(!G.you.shrine){
    G.you.shrine=true;G.you.hp=15;
    renderRivals();renderRibbon();
    openShrine(cont);
  }else{
    const place=G.players.filter(function(p){return p.alive;}).length;
    G.you.alive=false;G.you.hp=0;
    if(BEST.place===null||place<BEST.place)BEST.place=place;
    if(G.round>BEST.round)BEST.round=G.round;
    persistBest();clearRun();
    renderRivals();
    endScreen(place);
  }
}
function openShrine(cont){
  const boons=[
   {n:'Gild a Ware',d:'Raise one item a rarity',g:'g-gem',f:function(){openGild('Choose a ware to gild',cont);}},
   {n:'Coin Blessing',d:'+8 gold now, +1 income forever',g:'g-coin',f:function(){G.gold+=8;G.relicIncome+=1;cont();renderAll();}},
   {n:'Free Ascent',d:(G.tier<6?'Tier up at no cost':'+6 gold instead'),g:'g-lantern',f:function(){if(G.tier<6){G.tier++;G.tierCost=TIERCOST[G.tier+1]||0;}else{G.gold+=6;}cont();renderAll();}}
  ];
  const o=ovOpen('<div class="card"><div class="rays"></div>'
   +'<div class="kick gold">The Quqnus Rises</div>'
   +ic('g-phoenix','bigic')
   +'<h2 class="big">From the Ashes</h2>'
   +'<p>Your stall burns but you do not. Return at <b style="color:#ff9d8a">15 health</b> and take a boon. The next fall is final.</p>'
   +'<div class="picks p3">'+boons.map(function(b,i){return '<div class="pick" data-b="'+i+'"><div class="ph2">'+ic(b.g,'','width:28px;height:28px')+'</div><div class="pn">'+b.n+'</div><div class="pd">'+b.d+'</div></div>';}).join('')+'</div></div>');
  o.querySelectorAll('.pick').forEach(function(p){
    p.onclick=function(){const b=boons[+p.dataset.b];ovClose(o);b.f();};
  });
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
  if(!ids.length){G.spoils=(G.spoils||0)+10;toast('The vault is bare. 10 gold at dawn instead.');renderAll();if(cont)cont();return;}
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
function endScreen(place){
  const o=ovOpen('<div class="card"><div class="rays red"></div>'
   +'<div class="kick">The Stall Closes</div>'
   +ic('e-skull','bigic','color:#d8c9b0')
   +'<h2 class="big bad">'+ord(place)+' of 8</h2>'
   +'<div class="score">Fell on round<b>'+G.round+'</b></div>'
   +'<button class="btn gold" id="nlb">New Lobby</button></div>');
  o.querySelector('#nlb').onclick=function(){ovClose(o);newLobby();};
}
function championScreen(){
  G.you.place=1;
  if(BEST.place===null||BEST.place>1)BEST.place=1;
  if(G.round>BEST.round)BEST.round=G.round;
  persistBest();clearRun();
  const o=ovOpen('<div class="card"><div class="rays"></div><div class="coinrain" id="crn2"></div>'
   +'<div class="kick gold">Last Stall Standing</div>'
   +ic('g-crown','bigic')
   +'<h2 class="big">Champion</h2>'
   +'<p>The night market is yours. Every rival packed up or burned down.</p>'
   +'<div class="score">1st of 8 &middot; Round<b>'+G.round+'</b></div>'
   +'<button class="btn gold" id="nlb2">New Lobby</button></div>');
  coinRain(o.querySelector('#crn2'));
  if(!RM)fxCoinRain();
  sWin();
  o.querySelector('#nlb2').onclick=function(){ovClose(o);newLobby();};
}
/* ============ LOBBY ============ */
function openReveal(){
  const o=ovOpen('<div class="card reveal"><div class="rays"></div><div class="rays red"></div>'
   +'<div class="kick gold">Tonight in the Market</div>'
   +ic(G.anom.g,'bigic')
   +'<h2 class="big">'+G.anom.n+'</h2><p>'+G.anom.d+'</p>'
   +'<p>Featured wares: <b style="color:var(--brass)">'+CATN[G.tags[0]]+'</b> and <b style="color:var(--brass)">'+CATN[G.tags[1]]+'</b></p>'
   +'<p style="font-size:11px">Seven rivals wait. Last stall standing takes the night.</p>'
   +'<button class="btn gold" id="rvGo">Open the Market</button></div>');
  o.querySelector('#rvGo').onclick=function(){ovClose(o);nextRound();};
}
function shortName(n){
  const w=n.split(' ');
  return (w[0]==='Old'||w[0]==='The')?w[1]:w[0];
}
function newLobby(){
  const seed=((Date.now()>>>0)^0x9e3779b9)>>>0;
  const rng=mulberry(seed);
  const anom=ANOMALIES[Math.floor(rng()*ANOMALIES.length)];
  const cats=['dmg','poison','burn','shield','heal'];shuffle(cats,rng);
  const per=PERSONAS.slice();shuffle(per,rng);
  G={seed:seed,rng:rng,round:0,anom:anom,A:Object.assign({},ANONE,anom.m),tags:[cats[0],cats[1]],
     players:[],board:[],vault:[],shop:[],trinkets:[],T:null,hero:null,gold:0,tier:1,tierCost:TIERCOST[2],relicIncome:0,spoils:0,frozen:false,
     door:null,sel:null,vsel:null,swapV:null,tut:null,phase:'draft',fightN:0,departed:null,feed:[],usedMon:{},fiv:null,burned:0,enteredGold:0,
     otherPairs:[],pendOpp:null,pendFoe:null,F:null,you:null};
  G.players.push({i:0,n:'You',short:'You',p:'p-0',hp:40,alive:true,shrine:false,place:null});
  for(let k=0;k<per.length;k++){
    const ps=per[k];
    G.players.push({i:k+1,n:ps.n,short:shortName(ps.n),p:ps.p,hp:40,alive:true,shrine:false,persona:ps,cur:null,lastCur:null,place:null});
  }
  G.you=G.players[0];
  computeT();
  renderBest();renderRivals();renderAno();renderTrow();
  $('ribbon').innerHTML='';$('main').innerHTML='';
  openHeroPick(openReveal);
}
function openHeroPick(cont){
  const o=ovOpen('<div class="card"><div class="rays"></div>'
   +'<div class="kick gold">Choose Your Merchant</div>'
   +'<h2 class="big" style="font-size:23px">Who tends the stall tonight?</h2>'
   +'<div class="picks">'+HEROES.map(function(h){
      return '<div class="pick hero" data-h="'+h.id+'"><div class="ph2">'+ic(h.g,'','width:58px;height:58px')+'</div><div class="pn">'+h.n+'</div><div class="pd">'+h.d+'</div>'
       +'<div class="pt" style="color:'+CATC[h.tag]+'">Favors '+CATN[h.tag]+'</div></div>';
    }).join('')+'</div></div>');
  o.querySelectorAll('.pick').forEach(function(p){
    p.onclick=function(){
      const h=HEROES.filter(function(x){return x.id===p.dataset.h;})[0];
      G.hero=h.id;G.players[0].p=h.g;
      if(h.start){G.board.push(makeItem(h.start,0));}
      computeT();
      toast(h.n+' opens the stall');
      if(G.tut==='hero'){G.tut='market';renderCoach();}
      ovClose(o);cont();
    };
  });
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
/* ============ THE TUTORIAL: a guided first night ============ */
/* A coach card walks the first round of a real run: seven steps, each
   either action-advanced or Next-advanced, skippable at every stop.
   State lives on G.tut and never rides the save; finishing or skipping
   marks bb-tut in storage. Steps with ov:true float above overlays. */
const TUT={
 hero:{t:'Pick your merchant. Each favors one kind of ware, and the market listens.',ov:true},
 market:{t:'The night market. Every ware fights on its own timer. Buy your first ware.',a:'.shop'},
 forge:{t:'Own three copies of one ware and they forge into a stronger one. A held pair glimmers, and the shop card that completes it glows.',next:true},
 dusk:{t:'Gold never carries over: spend it or it burns at dusk. Reroll for 1, or Freeze to keep tonight\'s shop for tomorrow.',a:'.controls',next:true},
 ready:{t:'When you are ready, tap the Duel button. Tonight\'s opponent is already decided.',a:'#btnGo'},
 gate:{t:'Every duel waits behind a door. Fight the monster for its bounty, or take the easy way out. Gold spoils arrive at dawn.',ov:true},
 last:{t:'Lobby health only falls when you lose, and the last stall standing takes the night. You are on your own now, merchant.',next:true}
};
function tutDone(){G.tut=null;try{window.localStorage.setItem('bb-tut','1');}catch(e){}renderCoach();}
function renderCoach(){
  document.querySelectorAll('.tuthl').forEach(function(el){el.classList.remove('tuthl');});
  const old=document.querySelector('.coach');if(old)old.remove();
  if(!G||!G.tut||!TUT[G.tut])return;
  const s=TUT[G.tut];
  if(G.phase!=='draft')return;
  if(!s.ov&&document.querySelector('.ov'))return;
  const d=document.createElement('div');d.className='coach';
  d.innerHTML='<div class="ct">'+s.t+'</div><div class="cb">'
   +(s.next?'<button class="btn gold mini" id="ctN">Next</button>':'')
   +'<button class="btn mini" id="ctS">Skip the lesson</button></div>';
  document.body.appendChild(d);
  if(s.a){const el=document.querySelector(s.a);if(el)el.classList.add('tuthl');}
  const n=d.querySelector('#ctN');
  if(n)n.onclick=function(){
    if(G.tut==='forge'){G.tut='dusk';}
    else if(G.tut==='dusk'){G.tut='ready';}
    else if(G.tut==='last'){tutDone();return;}
    renderCoach();
  };
  d.querySelector('#ctS').onclick=tutDone;
}
/* the title screen: Robbie's painted intro. Two stone plaques, New Game
   and Tutorial. Falls straight through to the lobby when the painted
   art has not landed (tests, art-less checkouts). */
function openIntro(){
  if(!ART['bg-intro']){newLobby();return;}
  const o=document.createElement('div');o.id='intro';
  o.innerHTML='<div class="ibtns">'
   +'<button class="stonebtn" id="inNew">New Game</button>'
   +'<button class="stonebtn" id="inTut">Tutorial</button>'
  +'</div>';
  document.body.appendChild(o);
  o.querySelector('#inNew').onclick=function(){o.remove();newLobby();};
  o.querySelector('#inTut').onclick=function(){o.remove();newLobby();G.tut='hero';renderCoach();};
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
  music('market');
  initEmbers();
  loadBest();
  const d=loadRun();
  if(d&&d.round>=1){openContinue(d);}
  else{openIntro();}
  /* dev-only hooks for driving playtests from the console; the guard
     matches the service worker's, so the live site never carries them */
  if(typeof location!=='undefined'&&location.hostname.match(/^(localhost|127\.)/)){
    globalThis.BBDEV={g:function(){return G;},rollDoor:rollDoor,rollShop:rollShop,renderAll:renderAll,
      openUniquePick:openUniquePick,bandOf:bandOf,startMonsterFight:startMonsterFight,bark:bark};
  }
}
