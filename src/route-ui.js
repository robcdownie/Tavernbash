"use strict";
/* The route presenters: every DOM screen and overlay that belongs to The Long
   Bazaar route. Extracted from ui.js in R4 commit 5 so ui.js is the composition
   root plus the shared draft/fight/overlay surface, and the route's map, gate
   camp, event cards, fight recap, reward choices, and end/continue screens live
   here as a cohesive unit.

   Import direction is one way: this module NEVER imports ui.js. It pulls the pure
   modules (data, map, route, engine bits, art, route-runtime, fx, music) and the
   shared kernel (ui-core) directly, and gets the handful of flow callbacks that
   remain in ui.js through a bridge injected once at boot via wireRouteUI. DOM
   callbacks keep their current behavior exactly (the "callbacks only dispatch"
   ideal, and moving persistence out of render, stay later audited changes). */
import {G,RM,store,$,esc,ovOpen,ovClose,toast} from './ui-core.js';
import {ITEMS,RNAME,ENCH,MONSTERS,PERSONAS,CATN,TRINKETS,HEROES,ANOMALIES} from './data.js';
import {mulberry,gateOK} from './engine.js';
import {buildFoe} from './encounter.js';
import {genMap,isCombat,MAP_VERSION} from './map.js';
import {frontier,currentDistrict,visitedSet,validRoute,classifyEdges,fightSeed,isGateDistrict} from './route.js';
import {ic} from './art.js';
import {chooseGild as runtimeChooseGild,chooseUnique as runtimeChooseUnique,chooseCharm as runtimeChooseCharm,
        grantFreeOffer as runtimeGrantFreeOffer} from './route-runtime.js';
import {fxCoinRain} from './fx.js';
import {music,sting} from './music.js';
import pkg from '../package.json';
import {finishMetrics,activateMetrics,touchMetrics,serializeMetrics} from './route-metrics.js';
import {buildRunRecord,formatRunSummary,formatRunFullData,formatRunBatch} from './route-report.js';
import {readReportState,saveReport,updateReport,unexportedReports,markReportsExported} from './route-report-store.js';
import {replaySetup,isClearResult} from './route-history.js';
import {cloudSnapshot,onCloudChange,sendCloudMagicLink,syncCloudReports,
        setCloudSharing,deleteCloudReports,signOutCloud} from './cloud-ledger.js';

/* the flow bridge: functions that stay in ui.js (dispatch, render, persistence,
   economy, run lifecycle) and are wired in once at boot. */
let B=null;
export function wireRouteUI(bridge){B=bridge;}

/* the two route selectors, read straight off the shared G. Exported so ui.js
   (flow) reads the same map/state this module renders. */
export function routeMap(){return G.route.map;}
export function routeState(){return G.run.route;}

/* ============ REWARD-CHOICE PRESENTERS ============ */
export function openRewardChoice(pc){
  B.metricPhase('reward_choice');
  B.renderAll();
  if(pc.kind==='gild'){openRewardGild(pc);}
  else if(pc.kind==='charm'){openRewardCharm(pc);}
  else if(pc.kind==='midpointTreasure'){openMidpointTreasure(pc);}
  else{openRewardUnique(pc);}
}
/* gild presenter: renders the serialized board-iid options and dispatches the
   choice; the runtime applies it, then we run the fusion cascade, checkpoint,
   and move on */
function openRewardGild(pc){
  const o=ovOpen('<div class="card"><div class="rays"></div>'
   +'<div class="kick gold">Gilding</div>'
   +'<h2 class="big" style="font-size:23px">The mirror bows. Gild one ware.</h2>'
   +'<div class="picks">'+pc.options.map(function(opt){
      const it=G.board.filter(function(w){return w.iid===opt.iid;})[0];if(!it)return '';
      const d=ITEMS[it.id];
      return '<div class="pick" data-g="'+it.iid+'"><div class="ph2">'+ic('g-'+it.id,'','width:28px;height:28px')+'</div><div class="pn">'+RNAME[it.rarity]+' '+d.n+'</div><div class="pd">to '+RNAME[it.rarity+1]+'</div></div>';
    }).join('')+'</div></div>');
  o.querySelectorAll('.pick').forEach(function(p){p.onclick=function(){chooseRewardGild(o,+p.dataset.g);};});
}
function chooseRewardGild(o,iid){
  const res=runtimeChooseGild(G.run,iid);
  if(!res.ok){return;}   /* a stale click on a vanished target is rejected, not misapplied */
  toast('Gilded: '+RNAME[res.ware.rarity]+' '+ITEMS[res.ware.id].n);
  B.metricEvent('reward_choice',{kind:'gild',iid:iid,id:res.ware.id,rarity:res.ware.rarity});
  B.fuseStamp(G.board);B.fuseWithVault();
  ovClose(o);B.criticalSave(B.presentAfterReward);
}
/* unique presenter: renders the serialized uniqueId options */
function openRewardUnique(pc){
  const o=ovOpen('<div class="card"><div class="rays"></div>'
   +'<div class="kick gold">The Vault</div>'
   +'<h2 class="big" style="font-size:23px">The vault opens. Take one.</h2>'
   +'<div class="picks">'+pc.options.map(function(id){
      const d=ITEMS[id];
      return '<div class="pick" data-u="'+id+'"><div class="ph2">'+ic('g-'+id,'','width:28px;height:28px')+'</div><div class="pn">'+d.n+'</div><div class="pd">'+d.d+'</div></div>';
    }).join('')+'</div></div>');
  o.querySelectorAll('.pick').forEach(function(p){p.onclick=function(){chooseRewardUnique(o,p.dataset.u);};});
}
function chooseRewardUnique(o,id){
  const res=runtimeChooseUnique(G.run,id);
  if(!res.ok){return;}
  toast(ITEMS[id].n+' waits in the market, free.');
  B.metricEvent('reward_choice',{kind:'unique',id:id});
  ovClose(o);B.criticalSave(B.presentAfterReward);
}

/* The Long Bazaar midpoint uses the same durable unique-choice transaction as
   the Vizier vault, but presents its much smaller offer as a distinct road
   reward. The chosen ware becomes a free market offer, never an instant board
   mutation, so the player can still decide how to make room. */
function openMidpointTreasure(pc){
  const o=ovOpen('<div class="card midpointtreasure"><div class="rays"></div>'
   +'<div class="kick gold">Midpoint Treasure</div>'
   +'<h2 class="big" style="font-size:23px">Choose one for the road ahead.</h2>'
   +'<p>Your pick waits as a free ware in the next Market.</p>'
   +'<div class="picks">'+pc.options.map(function(id){
      const d=ITEMS[id];if(!d)return '';
      return '<div class="pick" data-mt="'+id+'"><div class="ph2">'+ic('g-'+id,'','width:28px;height:28px')+'</div><div class="pn">'+d.n+'</div><div class="pd">'+d.d+'</div></div>';
    }).join('')+'</div></div>');
  o.querySelectorAll('.pick[data-mt]').forEach(function(p){p.onclick=function(){chooseMidpointTreasure(o,pc,p.dataset.mt);};});
}
function chooseMidpointTreasure(o,pc,id){
  const res=runtimeChooseUnique(G.run,id);
  if(!res.ok)return;
  B.metricEvent('midpoint_treasure_selected',{receiptKey:pc.key,id:id});
  toast(ITEMS[id].n+' waits in the next Market, free.');
  ovClose(o);B.criticalSave(B.presentAfterReward);
}

function openRewardCharm(pc){
  const o=ovOpen('<div class="card"><div class="rays"></div>'
   +'<div class="kick gold">Boss Caravan</div>'
   +'<h2 class="big" style="font-size:23px">Choose a Charm</h2>'
   +'<p>A permanent boon. These offers lean toward your stall.</p>'
   +'<div class="picks">'+pc.options.map(function(id){
      const charm=TRINKETS.find(function(t){return t.id===id;});if(!charm)return '';
      return '<div class="pick" data-c="'+id+'"><div class="ph2">'+ic(charm.g,'','width:30px;height:30px')+'</div><div class="pn">'+charm.n+'</div><div class="pd">'+charm.d+'</div></div>';
    }).join('')+'</div></div>');
  o.querySelectorAll('.pick').forEach(function(p){p.onclick=function(){chooseRewardCharm(o,p.dataset.c);};});
}
function chooseRewardCharm(o,id){
  const res=runtimeChooseCharm(G.run,id);
  if(!res.ok)return;
  B.computeT();
  B.metricEvent('reward_choice',{kind:'charm',id:id});
  toast('Charm: '+res.charm.n);
  ovClose(o);B.criticalSave(B.presentAfterReward);
}

/* ============ THE LONG BAZAAR ROUTE ============ */
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1);}
const NODELABEL={market:'Market',rest:'Rest',treasure:'Treasure',shrine:'Quqnus Shrine',negotiation:'Merchant'};
const NODEGLYPH={market:'g-route_market',rest:'g-route_rest',treasure:'g-route_treasure',shrine:'g-route_shrine',negotiation:'g-route_negotiation'};
function nodeGlyph(n){return isCombat(n)?MONSTERS[n.monId].glyph:(NODEGLYPH[n.type]||'g-route_treasure');}
const DBG={1:'back_alleys',2:'souk',3:'palace',4:'dragon_gate'};
const DISTRICT_SOURCE_NAME={1:'Back Alleys',2:'The Souk',3:'Palace Quarter',4:'The Dragon Gate'};
function districtSource(D){return D&&((D.sourceId!=null?D.sourceId:D.id));}
function districtForNode(n){return routeMap().districts[n.district-1];}
/* the % anchors for the positioned route plot (Codex geometry) */
function nodeAnchor(n,D){
  const gate=districtSource(D)===4;
  let x;
  if(n.type==='boss')x=gate?88:91;
  else if(gate)x=[14,42,70][n.col];   /* elite, prep, market columns before the Vizier */
  else x=[7,23,39,55,71][n.col];
  return {x:x,y:[17,50,83][n.lane]};
}
function nodeLabel(n){return isCombat(n)?MONSTERS[n.monId].n:(NODELABEL[n.type]||n.type);}

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
/* face-up Treasure: the option carries a concrete ware id or enchant (rolled at
   map generation), so the card names exactly what it grants */
function treasureView(op){
  if(op.kind==='ware'&&op.id&&ITEMS[op.id])return {g:'g-'+op.id,t:'Free '+ITEMS[op.id].n,d:'This ware, free at the next market.'};
  if(op.kind==='enchant'&&op.ench&&ENCH[op.ench])return {g:'g-magma',t:ENCH[op.ench].n+' Kit',d:ENCH[op.ench].d};
  if(op.kind==='silver')return {g:'g-whetstone',t:'Gild a Ware',d:'Raise one ware to the next rarity.'};
  const cash=6+((G.A&&G.A.directEventGoldFlat)||0);
  const word={4:'Four',5:'Five',6:'Six'}[cash]||String(cash);
  return {g:'g-coin',t:word+' Gold',d:word+' gold, no strings.'};
}
/* event rolls draw from a stream keyed to the node and choice, not the mutable
   G.rng, so a reload reproduces the same reward instead of inventing a new one */
function eventRng(nodeId,tag){return mulberry(fightSeed(G.seed,nodeId,tag));}
/* grant a free ware. A fixedId (from a face-up Treasure) is used as-is; without
   one the ware is rolled from the tier-gated pool (the Negotiation Fresh Stock). */
function grantFreeWare(rng,fixedId){
  rng=rng||G.rng;
  let id=fixedId;
  if(!id){
    const ids=Object.keys(ITEMS).filter(function(x){return gateOK(ITEMS[x].tier,G.tier)&&!ITEMS[x].unique&&!ITEMS[x].inc;});
    if(!ids.length){G.gold+=4;toast('No ware fits. 4 gold instead.');return;}
    id=ids[Math.floor(rng()*ids.length)];
  }
  const result=runtimeGrantFreeOffer(G.run,id);
  if(!result.ok&&result.reason==='duplicate unique'){
    B.metricEvent('treasure_duplicate_unique',{id:id,gold:result.duplicateGold});
    toast('You already own '+ITEMS[id].n+'. '+result.duplicateGold+' gold instead.');
    return result;
  }
  if(!result.ok)return result;
  toast('A free '+ITEMS[id].n+' waits at the next market.');
  return result;
}
/* etch an enchant onto the first compatible unenchanted ware. A fixedEnch (from a
   face-up Treasure) only lands on a ware that satisfies its keyword need, else the
   gold fallback; without one a legal enchant is rolled (Rest Temper). */
function grantEnchantKit(rng,fixedEnch){
  rng=rng||G.rng;
  const compat=function(d,e){const req=ENCH[e].need;return !req||(req==='dmg'?!!(d.fx&&d.fx.dmg):d.cd>0);};
  for(let i=0;i<G.board.length;i++){
    const it=G.board[i];if(it.ench)continue;const d=ITEMS[it.id];
    const opts=fixedEnch?(compat(d,fixedEnch)?[fixedEnch]:[]):Object.keys(ENCH).filter(function(e){return compat(d,e);});
    if(opts.length){const e=opts.length===1?opts[0]:opts[Math.floor(rng()*opts.length)];it.ench=e;toast(ENCH[e].n+' etched onto '+d.n);return;}
  }
  G.gold+=4;toast((fixedEnch?'No ware fits '+ENCH[fixedEnch].n+'. ':'No ware to enchant. ')+'4 gold instead.');
}
function applyTreasure(opt,cont,nodeId,offers){
  B.metricEvent('event_choice',{nodeId:nodeId,kind:'treasure',choice:Object.assign({},opt),
    offers:(offers||[]).map(function(o){return Object.assign({},o);})});
  if(opt.kind==='ware'){grantFreeWare(eventRng(nodeId,'tware'),opt.id);cont();}
  else if(opt.kind==='enchant'){grantEnchantKit(eventRng(nodeId,'tench'),opt.ench);cont();}
  else if(opt.kind==='silver'){openGild('Raise one ware a rarity step.',cont);}
  else{const cash=6+((G.A&&G.A.directEventGoldFlat)||0);G.gold+=cash;toast(cash+' gold.');cont();}
}
function routeTreasureCard(node){
  const opts=(node.reward&&node.reward.options)?node.reward.options:[{kind:'gold'}];
  const o=ovOpen('<div class="card"><div class="rays"></div><div class="kick gold">Treasure</div>'
   +'<h2 class="big">Choose Your Spoils</h2><p>Take one; the rest stay buried.</p>'
   +'<div class="picks">'+opts.map(function(op,i){const v=treasureView(op);
      return '<div class="pick" data-t="'+i+'"><div class="ph2">'+ic(v.g,'','width:28px;height:28px')+'</div><div class="pn">'+esc(v.t)+'</div><div class="pd">'+esc(v.d)+'</div></div>';
    }).join('')+'</div></div>');
  o.querySelectorAll('.pick').forEach(function(p){p.onclick=function(){
    const opt=opts[+p.dataset.t];ovClose(o);
    applyTreasure(opt,function(){B.dispatchRoute({type:'resolveEvent',outcome:'treasure'});},node.id,opts);
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
function completeEvent(t,delta,outcome){
  const data={nodeId:routeState().pendingId,kind:t,resolveDelta:delta||0};
  if(outcome)data.outcome=outcome;
  B.metricEvent('event_choice',data);
  B.dispatchRoute({type:'resolveEvent',resolveDelta:delta||0,outcome:t});}
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
      /* no ware means nothing to cast off: pay nothing, do not consume the shrine
         (a committed event node cannot be re-entered), re-show so a real option can
         be taken instead of banking free gold for an empty board */
      if(!G.board.length){toast('You have no ware to cast off.');routeShrineCard(node);return;}
      pickWare('Cast off which ware?',function(i){G.board.splice(i,1);G.gold+=8;G.tierCost=1;toast('Cast off. +8 gold, next tier costs 1.');completeEvent('castoff');});
    }}
  ]);
}
/* L2 Thin Oil: every event option that pays gold on the spot reads this one
   shared value, at grant time and in the card text, so they cannot disagree */
function directEventGold(){return 6+((G.A&&G.A.directEventGoldFlat)||0);}
function routeNegotiationCard(node){
  const per=PERSONAS[node.persona]||PERSONAS[0];
  const cash=directEventGold();
  choiceCard(per.n,'A Merchant Bargains','Accept one offer, or walk away.',[
    {label:'Quick Sale',desc:'Take '+cash+' gold on the spot.',onPick:function(){G.gold+=cash;toast('+'+cash+' gold.');completeEvent('nego',0,'quick_sale');}},
    {label:'Fresh Stock',desc:'Pay 3 gold for a free ware at the next market.',onPick:function(){
      /* cannot afford: do not consume the merchant node, re-show so Quick Sale or
         Walk Away stay reachable instead of burning the node for nothing */
      if(G.gold<3){toast('Not enough gold for that.');routeNegotiationCard(node);return;}
      G.gold-=3;grantFreeWare(eventRng(node.id,'fresh'));completeEvent('nego',0,'fresh_stock');}},
    {label:'Walk Away',desc:'Keep your coin and your wares.',onPick:function(){completeEvent('nego',0,'walk_away');}}
  ]);
}
export function routeEventCard(e){
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
  if(b.mote)parts.push('a free copy of your commonest bronze ware');
  if(b.gild)parts.push('gild a ware');
  if(b.pickUnique)parts.push('pick any unique');
  return parts.length?parts.join(', '):'coin';
}
/* one line of a scouted monster board: its live effect(s), keywords, and cadence */
function fightItemBrief(fi){
  const f=fi.fx||{};const parts=[];
  if(f.dmg)parts.push(f.dmg+' dmg');
  if(f.poison)parts.push(f.poison+' poison');
  if(f.burn)parts.push(f.burn+' burn');
  if(f.shield)parts.push(f.shield+' shield');
  if(f.heal)parts.push(f.heal+' heal');
  if(f.freeze)parts.push('freezes a ware');
  if(f.hasteAll)parts.push('hastes allies');
  if(f.disable)parts.push('auctions your best');
  if(fi.bulwark)parts.push('Bulwark');
  if(fi.flying)parts.push('Flying');
  if(fi.crit)parts.push(Math.round(fi.crit*100)+'% crit');
  if(fi.pocket)parts.push('pockets bounty');
  if(fi.rattle)parts.push('deathrattle');
  const cd=fi.cd>0?(' &middot; '+(fi.cd/1000)+'s'):'';
  return (parts.join(', ')||'passive')+cd;
}
/* the scoutable combat read: real health and the exact board (fixed per monster,
   scaled by gild/omen, so the preview matches the fight) plus keywords and bounty */
export function combatPreview(n){
  const M=MONSTERS[n.monId];
  /* the fallback line mirrors monsterSide's math for the M.hp path only; the
     built side's own regen is authoritative (Codex note: recomputing drifts) */
  let hp=M.hp,items=[],regen=Math.round((M.regen||0)*(n.gilded?1.5:1)*(n.power||1));
  try{
    const foe=buildFoe(n.monId,{threat:n.threat,hpFlat:(G.T&&G.T.hpFlat)||0,A:G.A,gold:G.gold,
      gilded:n.gilded,power:n.power,board:G.board,nodeType:n.type,
      gate:isGateDistrict(districtForNode(n)),lantern:(G.run&&G.run.lantern)||0});
    hp=foe.side.hp;items=foe.side.items;regen=foe.side.regen||0;
  }catch(e){}
  const board=items.map(function(fi){return '<div class="rmpw"><b>'+esc(fi.nm)+'</b> '+fightItemBrief(fi)+'</div>';}).join('');
  return '<div class="rmpi"><b>Health</b> '+hp+(M.special==='mirror'?' (mirrors your stall)':'')+(regen?' &middot; regen '+regen+'/s':'')+'</div>'
    +'<div class="rmpi"><b>Bounty</b> '+esc(routeBountyText(n))+'</div>'
    +(n.gilded?'<div class="rmpi gild">Gilded: tougher board; bonus gold bounties are doubled.</div>':'')
    +(board?'<div class="rmpboard">'+board+'</div>':'')
    +(n.type==='boss'?'<div class="rmpi">The district boss. No way past but through.</div>':'');
}
/* Treasure is face-up (rolled at map gen), so scouting shows the exact spoils */
function treasurePreview(n){
  const opts=(n.reward&&n.reward.options)?n.reward.options:[{kind:'gold'}];
  return '<div class="rmpi">Choose one of three, face up:</div>'
    +'<div class="rmpboard">'+opts.map(function(op){const v=treasureView(op);return '<div class="rmpw"><b>'+esc(v.t)+'</b> '+esc(v.d)+'</div>';}).join('')+'</div>';
}
/* preview pane: header, scrollable body, pinned action footer. `state` is the
   node's map state: only a reachable node offers commit actions; a future node is
   scoutable (its info shows, but no action) and a cleared one just reads Cleared. */
function routeNodePreviewHTML(n,state){
  const D=districtForNode(n);
  let acts;
  if(state==='reach'){
    if(n.type==='monster')acts='<button class="btn gold" data-a="challenge">Challenge</button>'
      +'<button class="btn" data-a="slip">Slip Past &middot; '+D.slip+' Resolve</button>';
    else if(n.type==='elite')acts='<button class="btn gold" data-a="challenge">Challenge the Elite</button>';
    else if(n.type==='boss')acts='<button class="btn gold" data-a="challenge">Face the Boss</button>';
    else if(n.type==='market')acts='<button class="btn gold" data-a="enter">Enter the Market</button>';
    else acts='<button class="btn gold" data-a="enter">Enter</button>';
  }else{
    acts='<div class="rmpscout">'+(state==='done'?'Cleared.':'Scouting ahead. Reach it from a lit node to act.')+'</div>';
  }
  let info;
  if(isCombat(n))info=combatPreview(n);
  else if(n.type==='market')info='<div class="rmpi">Buy, sell, reroll, freeze, tier, fuse, and vault.</div>';
  else if(n.type==='treasure')info=treasurePreview(n);
  else info='<div class="rmpi">'+esc(routeEventDesc(n.type))+'</div>';
  const kind=n.type==='boss'?'District Boss':cap(n.type);
  return '<div class="rmphead"><span class="rmpg">'+ic(nodeGlyph(n),'rmpgi')+'</span>'
    +'<div><div class="rmpname">'+esc(nodeLabel(n))+'</div><div class="rmptype">'+kind+' &middot; Threat '+n.threat+'</div></div></div>'
    +'<div class="rmpbody">'+info+'</div>'
    +'<div class="rmpfoot">'+acts+'</div>';
}
export function renderRouteMap(){
  const map=routeMap(),st=routeState();
  const di=currentDistrict(st,map),D=map.districts[di];
  const fr=frontier(st,map),frS=new Set(fr),vis=visitedSet(st),sel=G.route.selectedId;
  const beaten=st.path.filter(function(id){return /boss$/.test(id);}).length;
  const stateOf=function(id){return vis.has(id)?'done':(frS.has(id)?'reach':'future');};
  const nodeBtn=function(n){
    /* every node is tappable to scout its preview; only a reachable node's preview
       offers commit actions. The state class still dims future/done nodes. */
    const state=stateOf(n.id);
    const a=nodeAnchor(n,D);
    return '<button class="rmnode t-'+n.type+' '+state+(n.id===sel?' sel':'')+(n.gilded?' gild':'')+(n.type==='boss'?' boss':'')+'"'
      +' data-n="'+n.id+'" style="left:'+a.x+'%;top:'+a.y+'%" aria-label="'+esc(nodeLabel(n))+', Threat '+n.threat+'">'
      +'<span class="rmmed">'+ic(nodeGlyph(n),'rmg')+'</span>'
      +'<span class="rmn">'+esc(nodeLabel(n))+'</span>'
      +(n.gilded?'<span class="rmstar">'+ic('g-gem','','width:11px;height:11px')+'</span>':'')+'</button>';
  };
  let nodes='';
  D.columns.forEach(function(col){col.forEach(function(n){nodes+=nodeBtn(n);});});
  nodes+=nodeBtn(D.boss);
  let pips='';for(let i=0;i<map.districts.length;i++){pips+='<span class="rmpip'+(i<beaten?' on':'')+(i===di?' cur':'')+'"></span>';}
  const prev=sel?routeNodePreviewHTML(map.nodes[sel],stateOf(sel)):'<div class="rmhint">Tap any node to scout it.</div>';
  const source=districtSource(D);
  const displayName=D.reprise?DISTRICT_SOURCE_NAME[source]:D.name;
  $('main').className='routemap';
  $('main').innerHTML='<div class="rmwrap">'
    +'<div class="rmboard source-'+source+'" style="background-image:linear-gradient(180deg,rgba(20,14,8,.28),rgba(14,9,5,.62)),url(art/bg/bg_route_'+DBG[source]+'.png)">'
    +'<div class="rmhdr"><span class="rmdn">'+esc(displayName)+'</span>'+(D.reprise?'<span class="rmafter">After Midnight</span>':'')+'<span class="rmpips">'+pips+'</span>'
    +'<span class="rmdest">'+esc(MONSTERS[D.boss.monId].n)+' waits at the gate</span></div>'
    +'<div class="rmplot" id="rmplot"><svg class="rmedges" id="rmedges" preserveAspectRatio="none" aria-hidden="true"></svg>'+nodes+'</div>'
    +'</div>'
    +'<div class="rmprev" id="rmprev">'+prev+'</div></div>';
  document.querySelectorAll('.rmnode').forEach(function(bn){
    bn.onclick=function(){G.route.selectedId=bn.dataset.n;renderRouteMap();};});
  const p=$('rmprev');
  if(p&&sel&&frS.has(sel)){const n=map.nodes[sel];   /* only a reachable node commits */
    p.querySelectorAll('[data-a]').forEach(function(b){b.onclick=function(){
      const act=b.dataset.a;G.route.selectedId=null;
      B.dispatchRoute({type:'commit',nodeId:n.id,choice:act==='slip'?'slip':'challenge'});
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
export function routeEnd(cause){
  G.phase='routeEnd';music(null);
  const longRun=G.run.routeMode==='long';
  const result=cause==='won'?(longRun?'long_clear':'quick_clear'):'loss';
  const now=Date.now(),resumed=!!G.run.end;
  if(!resumed){
    B.metricSnapshot('end',{cause:cause,result:result});
    finishMetrics(G.run.metrics,now);
    G.run.end={cause:cause,result:result,endedAt:now,exported:false};
  }
  G.run.end.result=result;
  const endedAt=G.run.end.endedAt||now;
  G.run.metrics.timing.cursor.phase='debrief';G.run.metrics.timing.cursor.district=currentDistrict(routeState(),routeMap())+1;
  activateMetrics(G.run.metrics,now);
  let report=buildRunRecord({run:G.run,map:routeMap(),setup:{hero:G.hero,anom:G.anom.id,tags:G.tags},
    result:result,version:pkg.version,endedAt:endedAt});
  const archived=saveReport(store(),report);
  if(archived)syncCloudReports();
  B.checkpointActiveRun();
  let archiveWarned=false;
  function archiveWarning(){if(archiveWarned)return;archiveWarned=true;toast('Report archive could not update. Copy Full Data before leaving.');}
  if(!archived)archiveWarning();
  const endBtns='<div class="rendbtns">'
   +'<button class="btn" id="reSummary">Copy Summary</button>'
   +'<button class="btn" id="reFull">Copy Full Data</button>'
   +'<button class="btn" id="reHistory">Run History</button>'
   +'<button class="btn gold" id="reGo">New Run</button></div>';
  const debrief='<div class="rdebrief"><div class="kick gold">Optional Playtest Debrief</div>'
   +'<div class="dbq"><span>Pace</span><button data-db="pace" data-v="slow">Slow</button><button data-db="pace" data-v="right">Right</button><button data-db="pace" data-v="fast">Fast</button></div>'
   +'<div class="dbq"><span>Difficulty</span><button data-db="difficulty" data-v="easy">Easy</button><button data-db="difficulty" data-v="right">Right</button><button data-db="difficulty" data-v="hard">Hard</button></div>'
   +'<div class="dbq"><span>Build agency</span><button data-db="agency" data-v="low">Low</button><button data-db="agency" data-v="right">Right</button><button data-db="agency" data-v="high">High</button></div>'
   +'<textarea id="reNote" maxlength="500" placeholder="Optional note"></textarea></div>';
  const cloud=cloudSnapshot();
  const cloudPrompt=cloud.configured
    ?'<div class="cloudprompt '+(cloud.signedIn?'on':'')+'">'+ic('g-ledger','mi')
      +'<div><b>'+(cloud.signedIn?'Cloud history connected':'Keep this history across devices')+'</b>'
      +'<span>'+(cloud.signedIn?'This finished run will sync in the background.':'Sign in only when you want backup. Play never requires an account.')+'</span></div>'
      +(cloud.signedIn?'':'<button class="btn" id="reCloud">Back Up History</button>')+'</div>'
    :'';
  let o;
  if(cause==='won'){
    /* the Lantern mastery write: monotonic and idempotent, and routeEnd runs
       again when a won run resumes to its ending, so this IS the retry */
    const lv=G.run.lantern||0;
    const lit=B.recordLanternClear?B.recordLanternClear():false;
    const lampLine=lv>0?'You cleared it at Lantern '+lv+'.':'';
    const nextLine=(lit&&lv<10)?' Lantern '+(lv+1)+' is lit for this road.':'';
    sting('fanfarewin');if(!RM)fxCoinRain();
    o=ovOpen('<div class="card"><div class="rays"></div><div class="kick gold">'+(longRun?'Long Bazaar Clear':'Quick Night Clear')+(lv>0?' &middot; Lantern '+lv:'')+'</div>'
     +ic('g-crown','bigic')+'<h2 class="big">The Vizier Falls</h2>'
     +'<p>'+(longRun?'You survived the full road and its After Midnight reprises. The night market is yours.':'You cleared the original road. This Quick Night stands as a complete victory.')+' '+lampLine+nextLine+'</p>'+debrief+cloudPrompt+endBtns+'</div>');
  }else{
    sting('lament');
    const st=routeState();const D=routeMap().districts[currentDistrict(st,routeMap())];
    o=ovOpen('<div class="card"><div class="rays red"></div><div class="kick">The Road Ends</div>'
     +ic('g-skull','bigic skullic')+'<h2 class="big bad">Resolve Spent</h2>'
     +'<p>Your caravan broke in '+esc(D.name)+' after '+st.path.length+' encounter'+(st.path.length===1?'':'s')+'.</p>'+debrief+cloudPrompt+endBtns+'</div>');
  }
  function syncReport(){
    const now=Date.now();touchMetrics(G.run.metrics,now);
    G.run.metrics.timing.calendarMs=G.run.metrics.timing.startedAt==null?0:Math.max(0,now-G.run.metrics.timing.startedAt);
    const m=serializeMetrics(G.run.metrics),debrief=m.debrief||{};
    report.exported=!!(G.run.end&&G.run.end.exported);
    report.metrics=m;report.debrief=JSON.parse(JSON.stringify(debrief));
    report.timing.activeMs=m.timing.activeMs;report.timing.debriefMs=(m.timing.phases||{}).debrief||0;
    report.timing.gameplayMs=Math.max(0,report.timing.activeMs-report.timing.debriefMs);
    report.timing.calendarMs=m.timing.calendarMs;report.timing.phases=m.timing.phases;report.timing.districts=m.timing.districts;
    const ok=updateReport(store(),report);B.checkpointActiveRun();
    if(ok)syncCloudReports();
    if(ok)archiveWarned=false;else archiveWarning();
    return ok;
  }
  function drawDebrief(){o.querySelectorAll('[data-db]').forEach(function(b){b.classList.toggle('on',G.run.metrics.debrief[b.dataset.db]===b.dataset.v);});}
  o.querySelectorAll('[data-db]').forEach(function(b){b.onclick=function(){G.run.metrics.debrief[b.dataset.db]=b.dataset.v;drawDebrief();syncReport();};});
  const note=o.querySelector('#reNote');note.value=G.run.metrics.debrief.note||'';
  note.onchange=function(){G.run.metrics.debrief.note=note.value.trim();syncReport();};
  drawDebrief();
  o.querySelector('#reSummary').onclick=function(){syncReport();copyText(formatRunSummary(report),o.querySelector('#reSummary'));};
  o.querySelector('#reFull').onclick=function(){syncReport();copyText(formatRunFullData(report),o.querySelector('#reFull'),function(){
    report.exported=true;G.run.end.exported=true;
    if(!updateReport(store(),report))archiveWarning();B.checkpointActiveRun();});};
  o.querySelector('#reHistory').onclick=function(){syncReport();openRunHistory();};
  const reCloud=o.querySelector('#reCloud');if(reCloud)reCloud.onclick=function(){syncReport();openRunHistory('cloud');};
  o.querySelector('#reGo').onclick=function(){G.run.metrics.debrief.note=note.value.trim();finishMetrics(G.run.metrics,Date.now());
    const saved=syncReport();
    if(!saved&&!G.run.end.exported){activateMetrics(G.run.metrics,Date.now());return;}
    B.clearRoute();ovClose(o);B.newRoute();};
}
export function openRouteContinue(d){
  const mode=d.run.routeMode||'quick';
  const map=genMap(d.run.seed,mode,(d.run&&d.run.lantern)||0);
  const di=validRoute(d.run.route,map)?currentDistrict(d.run.route,map):0;
  const o=ovOpen('<div class="card"><div class="rays"></div>'
   +'<div class="kick gold">The Lantern Still Burns</div>'+ic('g-lantern','bigic')
   +'<h2 class="big">The Road Waits</h2>'
   +'<p>Your '+(mode==='long'?'Long Bazaar':'Quick Night')+' caravan rests in <b>'+esc(map.districts[di].name)+'</b> with <b>'+Math.max(0,d.run.route.resolve)+'</b> Resolve.</p>'
   +'<div style="display:flex;gap:8px;justify-content:center;margin-top:10px">'
   +'<button class="btn gold" id="ctGo">Continue Run</button>'
   +'<button class="btn" id="ctHistory">Run History</button>'
   +'<button class="btn" id="ctNew">New Run</button></div></div>');
  o.querySelector('#ctGo').onclick=function(){ovClose(o);B.restoreRoute(d);};
  o.querySelector('#ctHistory').onclick=function(){openRunHistory();};
  o.querySelector('#ctNew').onclick=function(){ovClose(o);B.clearRoute();B.newRoute();};
}

/* ============ GILD / UNIQUE PICK (event + bounty overlays) ============ */
export function openGild(msg,cont){
  if(!G.board.length){G.gold+=5;toast('No wares to gild. 5 gold instead.');if(cont)cont();B.renderAll();return;}
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
      B.fuseStamp(G.board);B.fuseWithVault();
      ovClose(o);if(cont)cont();B.renderAll();
    };
  });
}
export function openUniquePick(msg,cont){
  /* never offer a unique the player already holds, on the board or
     waiting unbought in the market */
  const ids=Object.keys(ITEMS).filter(function(id){
    return ITEMS[id].unique
      &&!G.board.some(function(b){return b.id===id;})
      &&!G.shop.some(function(w){return w.id===id&&!w.bought;});
  });
  if(!ids.length){G.gold+=10;toast('The vault is bare. 10 gold instead.');B.renderAll();if(cont)cont();return;}
  const o=ovOpen('<div class="card"><div class="rays"></div>'
   +'<div class="kick gold">The Vault</div>'
   +'<h2 class="big" style="font-size:23px">'+msg+'</h2>'
   +'<div class="picks">'+ids.map(function(id){
      const d=ITEMS[id];
      return '<div class="pick" data-u="'+id+'"><div class="ph2">'+ic('g-'+id,'','width:28px;height:28px')+'</div><div class="pn">'+d.n+'</div><div class="pd">'+d.d+'</div></div>';
    }).join('')+'</div></div>');
  o.querySelectorAll('.pick').forEach(function(p){
    p.onclick=function(){
      G.shop.push(B.mkOffer({id:p.dataset.u,free:true,bought:false}));
      toast(ITEMS[p.dataset.u].n+' waits in the market, free.');
      ovClose(o);B.renderAll();if(cont)cont();
    };
  });
}

/* ============ FIGHT RECAP ============ */
/* post-fight recap: a plain readout of what happened after the wares stop
   moving. Damage is tallied by type from the fight's event stream. Shared by
   every route fight (runEffects wonFight/lostFight). */
function dmgBreakdown(t){
  const parts=[];
  if(t.wpn>0)parts.push(['dmg','e-blade',Math.round(t.wpn)]);
  if(t.pois>0)parts.push(['poison','e-skull',Math.round(t.pois)]);
  if(t.burn>0)parts.push(['burn','e-flame',Math.round(t.burn)]);
  if(t.storm>0)parts.push(['util','e-bolt',Math.round(t.storm)]);
  return parts.map(function(p){return '<span class="eff '+p[0]+'">'+ic(p[1],'mi')+' '+p[2]+'</span>';}).join('')||'<span class="eff util">nothing</span>';
}
function fightRecapHTML(won,foeName){
  const R=G.recap||{a:{wpn:0,pois:0,burn:0,storm:0,dead:[]},b:{wpn:0,pois:0,burn:0,storm:0,dead:[]}};
  const dealt=R.b.wpn+R.b.pois+R.b.burn+R.b.storm;
  const took=R.a.wpn+R.a.pois+R.a.burn+R.a.storm;
  return '<div class="card recapcard"><div class="rays'+(won?'':' red')+'"></div>'
   +'<div class="kick'+(won?' gold':'')+'">'+(won?'Victory':'Defeat')+'</div>'
   +'<h2 class="big'+(won?'':' bad')+'">'+(won?esc(foeName)+' slain':'Driven off')+'</h2>'
   +'<div class="recaprow"><div class="rlab">You dealt <b>'+Math.round(dealt)+'</b></div><div class="rchips">'+dmgBreakdown(R.b)+'</div></div>'
   +'<div class="recaprow"><div class="rlab">You took <b>'+Math.round(took)+'</b></div><div class="rchips">'+dmgBreakdown(R.a)+'</div></div>'
   +(R.a.dead.length?'<div class="recaplost">Destroyed this fight: '+R.a.dead.map(esc).join(', ')+'</div>':'')
   +'<button class="btn gold" id="recapGo" style="width:100%;margin-top:12px">Continue</button></div>';
}
export function showFightRecap(won,foeName,onDone){
  const o=ovOpen(fightRecapHTML(won,foeName));
  const b=o.querySelector('#recapGo');if(b)b.onclick=function(){ovClose(o);onDone();};
}

/* ============ RUN REPORT ============ */
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
function copyText(txt,btn,onSuccess){
  const done=function(ok){if(ok){if(btn)btn.textContent='Copied';if(onSuccess)onSuccess();}else{showReport(txt);}};
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

export function unexportedRunCount(){return unexportedReports(store()).length;}
export function copyUnexportedRuns(btn){
  const rows=unexportedReports(store());if(!rows.length){if(btn)btn.textContent='No Unexported Runs';return;}
  const ids=rows.map(function(r){return r.reportId;});
  copyText(formatRunBatch(rows),btn,function(){
    if(!markReportsExported(store(),ids))return;
    const current=G&&G.run&&G.run.end?G.run.runId+':'+String(G.run.end.endedAt):null;
    if(current&&ids.indexOf(current)>=0){
      G.run.end.exported=true;
      if(B&&B.checkpointActiveRun)B.checkpointActiveRun();
    }
  });
}

/* ============ PLAYER HISTORY ============ */
function historyMode(r){return r&&((r.routeMode||r.mode)==='long'?'long':'quick');}
function historyHero(r){return r&&r.setup&&(r.setup.hero||r.setup.heroId)||'Unknown merchant';}
function historyOmen(r){return r&&r.setup&&(r.setup.omen||r.setup.omenId)||'Unknown Omen';}
function historyDate(r){
  const iso=r&&r.endedAtIso;
  if(iso)return iso.slice(0,10);
  const n=r&&r.endedAt;
  if(!n)return 'Unknown date';
  try{return new Date(n).toISOString().slice(0,10);}catch(e){return 'Unknown date';}
}
function historyMinutes(ms){
  if(!(ms>0))return 'Time unavailable';
  return (ms/60000).toFixed(ms<600000?1:0)+' min';
}
function historyResult(r){
  if(isClearResult(r&&r.result))return historyMode(r)==='long'?'Long Clear':'Quick Clear';
  const d=r&&r.progress&&r.progress.district;
  return d?'Loss in '+d:'Loss';
}
function historyRoute(r){return (historyMode(r)==='long'?'Long Bazaar':'Quick Night')+' · '+((r&&r.lantern)>0?'Lantern '+r.lantern:'Plain');}
function historyBoard(r,key){return r&&r.economy&&Array.isArray(r.economy[key])?r.economy[key]:[];}
function historyWare(w){
  const d=w&&ITEMS[w.id],name=(w&&w.name)||(d&&d.n)||'Unknown ware';
  const rarity=RNAME[(w&&w.rarity)||0]||RNAME[0];
  const ench=w&&w.ench&&ENCH[w.ench]?ENCH[w.ench].n+' ':'';
  return '<span class="historyware" title="'+esc(rarity+' '+ench+name)+'">'+(d?ic('g-'+w.id):'')
    +'<span>'+esc(rarity+' '+ench+name)+'</span></span>';
}
function historyBuild(r,key){
  const rows=historyBoard(r,key);
  return rows.length?rows.map(historyWare).join(''):'<span style="color:var(--dim);font-size:10px">None</span>';
}
function historyLookupFull(state,id){
  return (state.reports||[]).filter(function(r){return r&&r.reportId===id;})[0]||null;
}
function historySeen(history,kind,id){
  const rows=history&&history.discoveries&&history.discoveries[kind];
  if(Array.isArray(rows))return rows.indexOf(id)>=0;
  return !!(rows&&rows[id]);
}
function historyTotal(history,key){
  if(!history)return 0;
  if(typeof history[key]==='number')return history[key];
  return history.totals&&typeof history.totals[key]==='number'?history.totals[key]:0;
}
function historyFactValue(v,key){
  if(v==null)return null;
  if(typeof v==='number')return v;
  if(v[key]!=null)return v[key];
  if(v.timing&&v.timing[key]!=null)return v.timing[key];
  if(v.progress&&v.progress[key]!=null)return v.progress[key];
  return null;
}
function historyFactLantern(v){
  return v&&typeof v==='object'&&v.lantern!=null?v.lantern:null;
}

export function openRunHistory(startTab){
  const opener=document.activeElement;
  let state=readReportState(store()),history=state.history||{},recent=state.recent||[];
  let tab=startTab==='cloud'?'cloud':'runs',discovery='heroes',selected=recent[0]&&recent[0].reportId;
  const o=ovOpen('<div class="card historycard"><div class="rays"></div>'
   +'<div class="historyhead"><div class="historytitle"><div class="kick gold" id="historyKicker">Saved on This Device</div>'
   +'<h2 class="big" id="historyTitle">Run History</h2></div>'
   +'<button class="historyclose" id="historyClose" aria-label="Close run history">&times;</button></div>'
   +'<div class="historystats"><span><b id="historyRuns">0</b> recorded runs</span>'
   +'<span><b id="historyClears">0</b> clears</span><span><b id="historyFound">0</b> discoveries</span></div>'
   +'<div class="historytabs" role="tablist" aria-label="Run history sections">'
   +'<button data-ht="runs" role="tab">Runs</button><button data-ht="mastery" role="tab">Mastery</button>'
   +'<button data-ht="discovery" role="tab">Discovery</button><button data-ht="cloud" role="tab">Cloud</button></div>'
   +'<div class="historybody" id="historyBody"></div></div>');
  o.classList.add('historyov');o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');
  o.setAttribute('aria-labelledby','historyTitle');
  const body=o.querySelector('#historyBody');
  let unsubscribeCloud=function(){};

  function refreshState(){
    state=readReportState(store());history=state.history||{};recent=state.recent||[];
    const seenCount=['heroes','omens','wares','monsters'].reduce(function(n,k){
      const rows=history.discoveries&&history.discoveries[k];
      return n+(Array.isArray(rows)?rows.length:Object.keys(rows||{}).length);
    },0);
    o.querySelector('#historyRuns').textContent=historyTotal(history,'runs');
    o.querySelector('#historyClears').textContent=historyTotal(history,'clears');
    o.querySelector('#historyFound').textContent=seenCount;
    const cloud=cloudSnapshot();
    o.querySelector('#historyKicker').textContent=cloud.signedIn?'Cloud Backup Connected':'Saved on This Device';
  }

  function closeHistory(restore){
    unsubscribeCloud();
    ovClose(o);
    if(restore!==false&&opener&&opener.isConnected&&opener.focus)opener.focus();
  }
  function tabState(){
    o.querySelectorAll('[data-ht]').forEach(function(b){
      const on=b.dataset.ht===tab;b.classList.toggle('on',on);b.setAttribute('aria-selected',String(on));
    });
  }
  function runRows(){
    if(!recent.length){
      body.innerHTML='<div class="historyempty">No finished runs yet. Clear a road or spend your Resolve to record one.</div>';
      return;
    }
    if(!recent.some(function(r){return r.reportId===selected;}))selected=recent[0].reportId;
    const picked=recent.filter(function(r){return r.reportId===selected;})[0]||recent[0];
    const full=historyLookupFull(state,picked.reportId);
    const replay=replaySetup(picked);
    const isWin=isClearResult(picked.result);
    const list=recent.map(function(r){
      const on=r.reportId===picked.reportId;
      return '<button class="historyrow'+(on?' on':'')+'" data-hr="'+esc(r.reportId)+'" aria-selected="'+String(on)+'">'
       +'<span class="historyrowtop"><span class="'+(isClearResult(r.result)?'win':'loss')+'">'+esc(historyResult(r))+'</span>'
       +'<time>'+historyDate(r)+'</time></span>'
       +'<span class="historyrowmeta">'+esc(historyHero(r))+' · '+esc(historyRoute(r))+'<br>'+esc(historyOmen(r))
       +' · '+esc(historyMinutes(r.timing&&r.timing.gameplayMs))+'</span></button>';
    }).join('');
    const actions=(full?'<button class="btn" id="historyCopy">Copy Summary</button>':'')
      +(replay?'<button class="btn gold" id="historyReplay">Play Seed Again</button>':'');
    const unexported=unexportedReports(store()).length;
    body.innerHTML='<div class="historyruns"><div class="historylist">'+list+'</div>'
     +'<div class="historydetail"><h3 class="'+(isWin?'':'bad')+'">'+esc(historyResult(picked))+'</h3>'
     +'<div class="historymeta"><span>Merchant<b>'+esc(historyHero(picked))+'</b></span>'
     +'<span>Road<b>'+esc(historyRoute(picked))+'</b></span><span>Omen<b>'+esc(historyOmen(picked))+'</b></span>'
     +'<span>Active time<b>'+esc(historyMinutes(picked.timing&&picked.timing.gameplayMs))+'</b></span>'
     +'<span>Seed<b>'+esc(picked.seed==null?'Unavailable':picked.seed)+'</b></span>'
     +'<span>Resolve<b>'+esc(picked.progress&&picked.progress.resolve!=null?picked.progress.resolve:'Unavailable')+'</b></span>'
     +'<span>Bosses beaten<b>'+esc(picked.progress&&picked.progress.bossesBeaten!=null?picked.progress.bossesBeaten:'Unavailable')+'</b></span>'
     +'<span>Build<b>v'+esc(picked.version||'?')+' · map '+esc(picked.mapVersion==null?'?':picked.mapVersion)+'</b></span></div>'
     +'<div class="historylabel">Final Stall</div><div class="historybuild">'+historyBuild(picked,'board')+'</div>'
     +'<div class="historylabel">Vault</div><div class="historybuild">'+historyBuild(picked,'vault')+'</div>'
     +(actions?'<div class="historyactions">'+actions+'</div>':'')
     +'<button class="btn historyexport" id="historyExport"'+(unexported?'':' disabled')+'>'
     +(unexported?'Copy Unexported Runs ('+unexported+')':'No Unexported Runs')+'</button></div></div>';
    body.querySelectorAll('[data-hr]').forEach(function(b){b.onclick=function(){selected=b.dataset.hr;draw();};});
    const cp=body.querySelector('#historyCopy');if(cp)cp.onclick=function(){copyText(formatRunSummary(full),cp);};
    const rp=body.querySelector('#historyReplay');if(rp)rp.onclick=function(){confirmReplay(picked);};
    const ex=body.querySelector('#historyExport');if(ex&&unexported)ex.onclick=function(){copyUnexportedRuns(ex);};
  }
  function masteryCell(hero,mode){
    const highest=B.lanternHighest?B.lanternHighest(mode,hero.id):-1;
    const row=history.byHeroRoute&&history.byHeroRoute[hero.id]&&history.byHeroRoute[hero.id][mode];
    if(highest<0)return '<div class="masterycell empty"><b>Unplayed</b>Clear this road to set a best.</div>';
    const title=highest===0?'Plain Clear':'Lantern '+highest;
    const fast=row&&row.fastestClear,best=row&&row.bestResolveClear;
    const fastMs=historyFactValue(fast,'gameplayMs'),bestResolve=historyFactValue(best,'resolve');
    let detail='';
    if(historyFactLantern(fast)===highest&&fastMs>0)detail+='Fastest '+historyMinutes(fastMs);
    if(historyFactLantern(best)===highest&&bestResolve!=null)detail+=(detail?' · ':'')+'Best '+bestResolve+' Resolve';
    if(!detail)detail='Details unavailable';
    if(row&&row.clears)detail+=(detail?' · ':'')+row.clears+' clear'+(row.clears===1?'':'s');
    return '<div class="masterycell"><b>'+title+'</b>'+esc(detail||'Clear recorded')+'</div>';
  }
  function masteryRows(){
    body.innerHTML='<div class="masterygrid"><div></div><div class="mh">Quick Night</div><div class="mh">Long Bazaar</div>'
     +HEROES.map(function(h){
       return '<div class="masteryhero">'+ic(h.g)+'<span>'+esc(h.n)+'</span></div>'+masteryCell(h,'quick')+masteryCell(h,'long');
     }).join('')+'</div>';
  }
  function discoveryCatalog(){
    if(discovery==='heroes')return HEROES.map(function(x){return {id:x.id,n:x.n,g:x.g};});
    if(discovery==='omens')return ANOMALIES.map(function(x){return {id:x.id,n:x.n,g:x.g};});
    if(discovery==='wares')return Object.keys(ITEMS).filter(function(id){return !ITEMS[id].inc;})
      .map(function(id){return {id:id,n:ITEMS[id].n,g:'g-'+id};});
    return Object.keys(MONSTERS).map(function(id){return {id:id,n:MONSTERS[id].n,g:MONSTERS[id].glyph};});
  }
  function discoveryRows(){
    const labels={heroes:'Heroes',omens:'Omens',wares:'Wares',monsters:'Monsters'};
    const rows=discoveryCatalog(),found=rows.filter(function(x){return historySeen(history,discovery,x.id);}).length;
    body.innerHTML='<div class="historysubtabs" role="tablist" aria-label="Discovery category">'
     +Object.keys(labels).map(function(k){return '<button data-hd="'+k+'" role="tab" class="'+(k===discovery?'on':'')
       +'" aria-selected="'+String(k===discovery)+'">'+labels[k]+'</button>';}).join('')+'</div>'
     +'<div class="discoveryhead"><b>'+found+' of '+rows.length+'</b> discovered in finished runs</div>'
     +'<div class="discoverygrid">'+rows.map(function(x){
       const seen=historySeen(history,discovery,x.id);
       return '<div class="discoverytile'+(seen?'':' locked')+'" data-discovery="'+x.id+'">'
        +(seen?ic(x.g):'<span class="unknown">?</span>')+'<span>'+(seen?esc(x.n):'???')+'</span></div>';
     }).join('')+'</div>';
    body.querySelectorAll('[data-hd]').forEach(function(b){b.onclick=function(){discovery=b.dataset.hd;draw();};});
  }
  function cloudRows(){
    const cloud=cloudSnapshot();
    if(!cloud.configured){
      body.innerHTML='<div class="cloudpanel"><div class="cloudmark">'+ic('g-ledger','bigic')+'</div>'
       +'<h3>History stays on this device</h3><p>Cloud backup is not connected in this build. Runs, mastery, and discovery still work offline.</p></div>';
      return;
    }
    if(!cloud.ready){
      body.innerHTML='<div class="cloudpanel"><div class="cloudspinner"></div><h3>Connecting the ledger</h3>'
       +'<p>Your local history remains available while the cloud account is checked.</p></div>';
      return;
    }
    if(!cloud.signedIn){
      body.innerHTML='<div class="cloudpanel"><div class="cloudmark">'+ic('g-ledger','bigic')+'</div>'
       +'<h3>Back up your finished runs</h3>'
       +'<p>Enter an email to receive a secure sign-in link. New games and offline play never require an account.</p>'
       +'<label class="cloudemail"><span>Email</span><input id="cloudEmail" type="email" inputmode="email" autocomplete="email" maxlength="254" placeholder="you@example.com"></label>'
       +'<button class="btn gold cloudprimary" id="cloudLink">Email Sign-in Link</button>'
       +(cloud.linkSent?'<div class="cloudnotice good">Link sent. Open it on this device to connect the ledger.</div>':'')
       +(cloud.error?'<div class="cloudnotice bad">'+esc(cloud.error)+'</div>':'')
       +'<p class="cloudfine">Signing in uploads the full reports currently saved on this device. Personal backup is private unless you later enable balance sharing.</p></div>';
      const link=body.querySelector('#cloudLink');
      link.onclick=async function(){
        const email=body.querySelector('#cloudEmail').value.trim();
        link.disabled=true;link.textContent='Sending';
        try{await sendCloudMagicLink(email);}
        catch(e){link.disabled=false;link.textContent='Email Sign-in Link';}
      };
      return;
    }
    const syncText=cloud.syncing?'Syncing now':(cloud.lastSyncAt?'Last synced '+historyDate({endedAtIso:cloud.lastSyncAt}):'Ready to sync');
    body.innerHTML='<div class="cloudpanel signed"><div class="cloudaccount"><div class="cloudmark">'+ic('g-ledger','bigic')+'</div>'
     +'<div><span>Connected account</span><b>'+esc(cloud.email||'Signed in')+'</b><small>'+esc(syncText)+'</small></div></div>'
     +'<div class="cloudfacts"><span><b>'+cloud.cloudRunCount+(cloud.cloudRunCount>=50?'+':'')+'</b> cloud runs loaded</span>'
     +'<span><b>'+historyTotal(history,'runs')+'</b> runs indexed here</span></div>'
     +'<button class="cloudshare '+(cloud.sharing?'on':'')+'" id="cloudShare" aria-pressed="'+String(cloud.sharing)+'">'
     +'<span><b>Share balance data</b><small>Let the developer inspect full runs. Your email is never included.</small></span>'
     +'<i>'+(cloud.sharing?'On':'Off')+'</i></button>'
     +(cloud.error?'<div class="cloudnotice bad">'+esc(cloud.error)+'</div>':'')
     +'<div class="cloudactions"><button class="btn gold" id="cloudSync"'+(cloud.syncing?' disabled':'')+'>'
     +(cloud.syncing?'Syncing':'Sync Now')+'</button><button class="btn" id="cloudSignOut">Sign Out</button>'
     +'<button class="btn badbtn" id="cloudDelete">Remove Cloud Runs</button></div>'
     +'<p class="cloudfine">Signing out does not erase local history. Removing cloud runs signs this device out so they do not immediately upload again.</p></div>';
    body.querySelector('#cloudShare').onclick=async function(){try{await setCloudSharing(!cloud.sharing);}catch(e){}};
    body.querySelector('#cloudSync').onclick=function(){syncCloudReports();};
    body.querySelector('#cloudSignOut').onclick=async function(){try{await signOutCloud();}catch(e){}};
    body.querySelector('#cloudDelete').onclick=function(){
      const c=ovOpen('<div class="card"><div class="rays red"></div><div class="kick">Remove Cloud Runs</div>'
       +ic('g-ledger','bigic')+'<h2 class="big bad" style="font-size:24px">Erase the online copies?</h2>'
       +'<p>Your runs stay on this device, and the cloud account signs out. Signing in again will upload the local copies.</p>'
       +'<div class="historyactions"><button class="btn" id="cloudDeleteCancel">Cancel</button>'
       +'<button class="btn badbtn" id="cloudDeleteGo">Remove Cloud Copies</button></div></div>');
      c.classList.add('replayov');
      c.querySelector('#cloudDeleteCancel').onclick=function(){ovClose(c);};
      c.querySelector('#cloudDeleteGo').onclick=async function(){
        try{await deleteCloudReports();await signOutCloud();ovClose(c);}catch(e){}
      };
    };
  }
  function confirmReplay(record){
    const spec=replaySetup(record);if(!spec){toast('This old report has no replayable setup.');return;}
    const active=B.hasActiveRoute&&B.hasActiveRoute();
    const changed=(spec.sourceMapVersion!=null&&spec.sourceMapVersion!==MAP_VERSION)
      ||(spec.sourceVersion&&spec.sourceVersion!==pkg.version);
    const c=ovOpen('<div class="card"><div class="rays"></div><div class="kick gold">Play Seed Again</div>'
     +ic('g-ledger','bigic')+'<h2 class="big" style="font-size:25px">Fresh Road, Same Seed</h2>'
     +'<p>Start a fresh '+(spec.mode==='long'?'Long Bazaar':'Quick Night')+' run as '+esc(historyHero(record))
     +' at '+(spec.lantern?'Lantern '+spec.lantern:'Lantern 0')+' under '+esc(historyOmen(record))+'.</p>'
     +'<div class="replaynote">The old build is not restored. The seed and recorded setup return under current rules.'
     +(changed?' This report came from an older build or map, so the road may differ.':'')+'</div>'
     +(active?'<p style="color:#ffab61;margin-top:9px">Starting it will replace the saved run waiting beneath this ledger.</p>':'')
     +'<div class="historyactions"><button class="btn" id="replayCancel">Cancel</button>'
     +'<button class="btn gold" id="replayGo">Start Fresh Run</button></div></div>');
    c.classList.add('replayov');
    c.querySelector('#replayCancel').onclick=function(){ovClose(c);};
    c.querySelector('#replayGo').onclick=function(){ovClose(c);closeHistory(false);B.replayHistoryRun(spec);};
  }
  function draw(){
    refreshState();
    tabState();
    if(tab==='runs')runRows();
    else if(tab==='mastery')masteryRows();
    else if(tab==='discovery')discoveryRows();
    else cloudRows();
  }
  o.querySelectorAll('[data-ht]').forEach(function(b){b.onclick=function(){tab=b.dataset.ht;draw();};});
  o.querySelector('#historyClose').onclick=function(){closeHistory(true);};
  o.onkeydown=function(e){if(e.key==='Escape'){e.preventDefault();closeHistory(true);}};
  unsubscribeCloud=onCloudChange(function(){if(o.isConnected)draw();});
  draw();o.querySelector('#historyClose').focus();
}
