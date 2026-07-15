"use strict";
import {TICK,RSTAT,RINTEG,BASEINTEG,COST,ANONE,ITEMS,MONSTERS,ENCH} from './data.js';
/* ============ RNG ============ */
export function mulberry(seed){let t=seed>>>0;return function(){t+=0x6D2B79F5;let r=Math.imul(t^t>>>15,1|t);r^=r+Math.imul(r^r>>>7,61|r);return((r^r>>>14)>>>0)/4294967296;};}
export function fightHP(round,hpFlat,A){return Math.round((90+round*8+(hpFlat||0))*((A||ANONE).hpMul));}
export function stormAt(round){return Math.max(16,34-round*1.5)*1000;}
export function gateOK(defTier,yourTier){return defTier===1||(defTier===2&&yourTier>=2)||(defTier===3&&yourTier>=4)||(defTier===4&&yourTier>=6);}
/* ============ ITEM INSTANCES + FUSION ============ */
let UID=1;
export function makeItem(id,rarity,ench){return {uid:UID++,id:id,rarity:rarity||0,size:ITEMS[id].size,ench:ench||null};}
export function integOf(it){return Math.round(BASEINTEG[it.size]*(ITEMS[it.id].integMul||1)*RINTEG[it.rarity]*(it.ench==="stout"?1.6:1));}
/* fusion counts, approved 2026-07-12: 3 bronze forge a silver, then
   2 silver a gold, 2 gold a diamond (a full diamond is 3 bronze then
   2+2, a real late-game goal). Fused wares keep their original size
   footprint (approved 2026-07-12): a Small stays Small through Diamond,
   power scaling comes from the rarity multipliers, not board space. */
export function fuseNeed(rarity){return rarity===0?3:2;}
export function fuseScan(board){
  const forged=[];
  let again=true;
  while(again){
    again=false;
    for(let i=0;i<board.length;i++){
      const a=board[i];
      const same=board.filter(x=>x.id===a.id&&x.rarity===a.rarity);
      if(same.length>=fuseNeed(a.rarity)&&a.rarity<3){
        const three=same.slice(0,fuseNeed(a.rarity));
        const idx=board.indexOf(three[0]);
        const nu={uid:UID++,id:a.id,rarity:a.rarity+1,size:a.size,
          ench:three.map(t=>t.ench).find(Boolean)||null};
        for(const t of three){board.splice(board.indexOf(t),1);}
        board.splice(Math.min(idx,board.length),0,nu);
        forged.push(nu);
        again=true;
        break;
      }
    }
  }
  return forged;
}
export function usedCells(board){return board.reduce((s,it)=>s+it.size,0);}
/* ============ FIGHT ITEM BUILDERS ============ */
export function playerFightItems(board,T,A,scale){
  T=T||{};A=A||ANONE;scale=scale||1;
  let boardCd=1,boardCrit=0;
  for(const it of board){if(ITEMS[it.id].cdMul){boardCd*=Math.pow(ITEMS[it.id].cdMul,1);}if(ITEMS[it.id].critAll){boardCrit+=ITEMS[it.id].critAll;}}
  return board.map((it,idx)=>{
    const def=ITEMS[it.id];
    const rs=RSTAT[it.rarity]*scale;
    let adj=0,fly=!!def.flying;
    [idx-1,idx+1].forEach(j=>{
      if(j>=0&&j<board.length){const nd=ITEMS[board[j].id];if(nd.adjDmg){adj+=nd.adjDmg*RSTAT[board[j].rarity];}if(nd.adjFly){fly=true;}}
    });
    const fd=(T.firstDouble&&idx===0)?2:1;
    const fx={};
    if(def.fx&&def.fx.dmg){fx.dmg=Math.max(1,Math.round(((def.fx.dmg*rs)+adj+(T.weaponFlat||0)+(idx===0?(T.firstFlat||0):0))*fd*A.dmgMul));}
    if(def.fx&&def.fx.poison){fx.poison=Math.max(1,Math.round(def.fx.poison*rs*(T.poisonMul||1)*fd*A.poisonMul));}
    if(def.fx&&def.fx.burn){fx.burn=Math.max(1,Math.round(def.fx.burn*rs*(T.burnMul||1)*fd*A.burnMul));}
    if(def.fx&&def.fx.shield){fx.shield=Math.max(1,Math.round(def.fx.shield*rs*(T.shieldMul||1)*fd));}
    if(def.fx&&def.fx.heal&&!A.healingDisabled){fx.heal=Math.max(1,Math.round(def.fx.heal*rs*(T.healMul||1)*fd));}
    /* haste is capped (stabilization 2026-07-12) so rarity can never push a
       single charge past a neighbour's cooldown, which is what let two high
       rarity Hourglasses drive each other into a supercritical loop */
    if(def.fx&&def.fx.haste){fx.haste=Math.min(1.2,def.fx.haste*rs);}
    if(def.fx&&def.fx.hasteAll){fx.hasteAll=def.fx.hasteAll;}
    if(def.fx&&def.fx.reload){fx.reload=def.fx.reload;}
    if(def.fx&&def.fx.disable){fx.disable=true;}
    /* enchant riders, all built from existing keywords */
    /* enchant riders now run their own keyword's multipliers so a Wildfire
       or Plague night affects them like any burn or poison (consistency fix
       2026-07-12); they skip the leftmost first-double to avoid the spike
       the review flagged */
    const en=it.ench;
    if(en==="fiery"&&fx.dmg){fx.burn=(fx.burn||0)+Math.max(1,Math.round((fx.dmg/3)*(T.burnMul||1)*A.burnMul));}
    if(en==="venomous"){fx.poison=(fx.poison||0)+Math.max(1,Math.round(2*rs*(T.poisonMul||1)*A.poisonMul));}
    if(en==="winged"){fly=true;}
    const cd=def.cd>0?Math.max(600,Math.round(def.cd*1000*(T.cdMul||1)*A.cdMul*boardCd*(en==="swift"?0.85:1))):0;
    const integrity=Math.round(integOf(it)*(A.itemIntegrityMul||1));
    const slotSize=A.sizeCostOverride&&A.sizeCostOverride[it.size]!==undefined?A.sizeCostOverride[it.size]:it.size;
    const charged=cd>0&&A.startFullyChargedIfBaseCdAtLeast&&def.cd*1000>=A.startFullyChargedIfBaseCdAtLeast;
    return {nm:(en?ENCH[en].n+" ":"")+def.n,g:"g-"+it.id,size:it.size,slotSize:slotSize,rarity:it.rarity,cat:def.cat,tier:def.tier,
      cd:cd,timer:charged?cd:0,alive:true,integ:integrity,maxI:integrity,
      fx:fx,printedDmg:def.fx&&def.fx.dmg?Math.round(def.fx.dmg*rs):0,bulwark:!!def.bulwark,targeting:def.targeting||null,charge:null,flying:fly,frozen:0,disarmed:0,
      pois:0,itemShield:0,nextCdFlat:0,
      crit:fx.dmg?Math.min(0.9,(def.crit||0)+boardCrit):0,rattle:def.rattle||null,selfdestruct:!!def.selfdestruct,
      ammo:def.ammo||0,maxAmmo:def.ammo||0,freezeOnce:en==="icy"?2:0,ench:en||null,
      cleanseTotal:def.cleanseTotal||0,hooks:def.hooks||null,uid:it.uid};
  });
}
export function monsterFightItems(mid,ctx){
  const M=MONSTERS[mid];const A=ctx.A||ANONE;const gild=(ctx.gilded?1.5:1)*(ctx.power||1);
  if(M.special==="mirror"){
    return playerFightItems(ctx.playerBoard,{},A,0.85*gild);
  }
  return M.board.map(b=>{
    const fx={};
    if(b.fx.dmg){let base=b.fx.dmg;if(M.special==="gold"){base+=2*(ctx.gold||0);}fx.dmg=Math.max(1,Math.round(base*gild*A.dmgMul));}
    if(b.fx.burn){fx.burn=Math.max(1,Math.round(b.fx.burn*gild*A.burnMul));}
    if(b.fx.poison){fx.poison=Math.max(1,Math.round(b.fx.poison*gild*A.poisonMul));}
    if(b.fx.shield){fx.shield=Math.round(b.fx.shield*gild);}
    if(b.fx.heal&&!A.healingDisabled){fx.heal=Math.round(b.fx.heal*gild);}
    if(b.fx.freeze){fx.freeze=b.fx.freeze;}
    if(b.fx.hasteAll){fx.hasteAll=b.fx.hasteAll;}
    if(b.fx.reload){fx.reload=b.fx.reload;}
    if(b.fx.disable){fx.disable=true;}
    const cd=b.cd>0?Math.round(b.cd*1000*A.cdMul):0;
    const integrity=Math.round(b.integ*gild*(A.itemIntegrityMul||1));
    const slotSize=A.sizeCostOverride&&A.sizeCostOverride[b.size]!==undefined?A.sizeCostOverride[b.size]:b.size;
    const charged=cd>0&&A.startFullyChargedIfBaseCdAtLeast&&b.cd*1000>=A.startFullyChargedIfBaseCdAtLeast;
    return {nm:b.nm,g:b.g,size:b.size,slotSize:slotSize,rarity:ctx.gilded?2:0,cat:"dmg",tier:M.band,
      cd:cd,timer:charged?cd:0,alive:true,
      integ:integrity,maxI:integrity,
      fx:fx,printedDmg:fx.dmg||0,bulwark:!!b.bulwark,targeting:b.targeting||null,charge:b.charge||null,pocket:b.pocket||0,flying:!!b.flying,frozen:0,disarmed:0,
      pois:0,itemShield:0,nextCdFlat:0,crit:b.crit||0,rattle:b.rattle||null,selfdestruct:!!b.selfdestruct,ammo:b.ammo||0,maxAmmo:b.ammo||0,pay:b.pay||0,cleanseTotal:b.cleanseTotal||0,hooks:b.hooks||null,uid:UID++};
  });
}
export function monsterSide(mid,ctx){
  const M=MONSTERS[mid];const A=ctx.A||ANONE;const gild=(ctx.gilded?1.5:1)*(ctx.power||1);
  let hp;
  if(M.special==="mirror"){hp=Math.round((ctx.playerHp||fightHP(ctx.round,0,A))*0.85*gild);}
  else if(M.special==="gold"){hp=Math.round((M.hp+15*(ctx.gold||0))*gild*A.hpMul);}
  else{hp=Math.round(M.hp*gild*A.hpMul);}
  return {nm:M.n,portrait:M.glyph,hp:hp,items:monsterFightItems(mid,ctx),lifesteal:0,
    regen:A.healingDisabled?0:Math.round((M.regen||0)*gild),rules:Object.assign({},A)};
}
/* ============ RIVAL GENERATION ============ */
export function genRival(round,persona,rng,A){
  A=A||ANONE;
  /* rival tier, stabilization 2026-07-12: round 1 is tier 1 (was tier 2 via
     1+ceil), so a fresh rival board is genuine parity with the player, not
     six slots of tier-2 wares while you start at five slots of tier 1 */
  const tier=Math.min(6,Math.ceil(round/2)||1);
  const slots=4+tier;
  /* rival curve, approved 2026-07-11: round 1 near player parity,
     converging on the old 9+5.5r line by the late game */
  let budget=8+(round-1)*6;
  const scale=1+Math.max(0,round-5)*0.03;
  const ids=Object.keys(ITEMS).filter(id=>gateOK(ITEMS[id].tier,tier)&&!ITEMS[id].unique);
  const board=[];
  if(persona.arch==="shield"&&budget>=COST[1]){board.push(makeItem("brassbuckler"));budget-=COST[1];}
  let guard=0;
  while(guard++<80){
    const cellsLeft=slots-usedCells(board);
    if(cellsLeft<=0||budget<COST[1]){break;}
    const cands=ids.filter(id=>ITEMS[id].size<=cellsLeft&&COST[ITEMS[id].size]<=budget);
    if(!cands.length){break;}
    let tot=0;const ws=cands.map(id=>{
      const d=ITEMS[id];
      let w=d.tier===1?8:(d.tier===2?7:6);
      if(d.cat===persona.arch){w*=3;}
      if(d.cat==="util"&&persona.arch!=="util"){w*=0.35;}
      if(d.cat==="util"&&persona.arch==="util"&&(d.inc)){w*=2;}
      tot+=w;return w;
    });
    let roll=rng()*tot,pick=cands[0];
    for(let i=0;i<cands.length;i++){roll-=ws[i];if(roll<=0){pick=cands[i];break;}}
    let r=0;const g=rng();
    if(round>=8&&g<Math.min(0.5,(round-7)*0.07)){r=2;}
    else if(round>=4&&rng()<Math.min(0.6,0.18+(round-4)*0.06)){r=1;}
    const it=makeItem(pick,r);
    /* fused wares keep their footprint now (2026-07-12), so a rival's
       upgraded ware stays its base size too */
    if(it.size>slots-usedCells(board)){it.rarity=0;}
    board.push(it);
    budget-=COST[ITEMS[pick].size];
  }
  board.sort((a,b)=>{
    const oa=ITEMS[a.id].cat==="shield"?0:1, ob=ITEMS[b.id].cat==="shield"?0:1;
    return oa-ob;
  });
  return {items:playerFightItems(board,{},A,scale),board:board,tier:tier};
}
/* Passive regen carried by board items (unique wares only, so rival
   generation and fight parity never see it). Scales with rarity. */
export function boardRegen(board){
  let r=0;
  for(const it of board){const d=ITEMS[it.id];if(d.regen){r+=Math.round(d.regen*RSTAT[it.rarity]);}}
  return r;
}
/* ============ THE FIGHT ENGINE ============ */
export function pickTarget(items,mode){
  /* flying items cannot be struck by weapons; with only flyers left,
     weapons go through to the merchant */
  const alive=[];for(let i=0;i<items.length;i++){if(items[i].alive&&!items[i].flying){alive.push(i);}}
  if(!alive.length){return -1;}
  for(const i of alive){if(items[i].bulwark){return i;}}
  if(mode==="maxinteg"){
    let best=alive[0];for(const i of alive){if(items[i].integ>items[best].integ){best=i;}}
    return best;
  }
  return alive[0];
}

/* Public combat events stay a renderer protocol. Hook collection creates only
   internal actions, so R7 does not add a new event kind. */
export const COMBAT_RENDER_EVENT_KINDS=Object.freeze([
  "ammo","burn","chip","crit","destroy","enrage","fire","freeze","haste",
  "heal","hhit","lot","lotpay","pocket","pois","reload","shield","spawn",
  "storm","stormstart","thaw","tickb","tickp"
]);
export const COMBAT_EVENT_KINDS=Object.freeze(COMBAT_RENDER_EVENT_KINDS.concat(["end"]));
export const COMBAT_HOOK_POINTS=Object.freeze([
  "fightStart","beforeActivate","afterActivate","beforeHit","afterHit",
  "destroyed","beforeHeal","afterHeal","afterCleanse","afterHaste","afterSpawn"
]);
const HOOK_POINT_SET=new Set(COMBAT_HOOK_POINTS);
const HOOK_ACTION_POINTS={
  activate:["beforeActivate","afterActivate"],
  damage:["beforeHit","afterHit"],
  merchantHit:["beforeHit","afterHit"],
  destroy:["destroyed"],
  heal:["beforeHeal","afterHeal"],
  cleanseStatus:["afterCleanse"],
  haste:["afterHaste"],
  spawn:["afterSpawn"]
};
const HOOK_ACTIONS=new Set([
  "activate","burn","consumeStatus","damage","destroy","haste","heal",
  "cleanseStatus","itemStateReset","itemStateSet","merchantHit","modifyContact",
  "disarm","modifyHeal","poison","removeShield","repair","setTimerFraction",
  "shield","spawn","spendShieldForDamage","stateAdd","stateReset","stateSet",
  "timedDebuff"
]);

/* Reject only unconditional immediate cycles. Conditional loops remain legal
   content, but the fight runtime caps them if their condition never opens. */
export function validateCombatHooks(specs){
  const graph=new Map();
  for(const point of COMBAT_HOOK_POINTS){graph.set(point,new Set());}
  for(const spec of specs||[]){
    if(!spec||!HOOK_POINT_SET.has(spec.on)){throw new Error("unknown combat hook point");}
    if(!Array.isArray(spec.actions)){throw new Error("combat hook actions must be an array");}
    if(spec.every!==undefined&&(!Number.isInteger(spec.every)||spec.every<1)){throw new Error("combat hook every must be a positive integer");}
    if(spec.oncePerMs!==undefined&&(!Number.isInteger(spec.oncePerMs)||spec.oncePerMs<1)){throw new Error("combat hook interval must be a positive integer");}
    if(spec.oncePerContext!==undefined&&typeof spec.oncePerContext!=="string"){throw new Error("combat hook context lock must be a string");}
    const conditions=Array.isArray(spec.when)?spec.when.length>0:!!spec.when;
    for(const action of spec.actions){
      if(!action||!HOOK_ACTIONS.has(action.op)){throw new Error("unknown combat hook action");}
      if(!conditions&&!(spec.every>1)){
        for(const point of HOOK_ACTION_POINTS[action.op]||[]){graph.get(spec.on).add(point);}
      }
    }
  }
  const visiting=new Set(),visited=new Set();
  function visit(point,path){
    if(visiting.has(point)){throw new Error("unconditional immediate hook cycle: "+path.concat([point]).join(" -> "));}
    if(visited.has(point)){return;}
    visiting.add(point);
    for(const next of graph.get(point)){visit(next,path.concat([point]));}
    visiting.delete(point);visited.add(point);
  }
  for(const point of COMBAT_HOOK_POINTS){visit(point,[]);}
  return true;
}
export function createFight(cfg){
  /* R7 diagnostics: an optional cfg.rngTap(tag, value) observes every seeded draw
     without changing its value or order (inert unless a tap is passed), and
     F.diagnostics.guardTrips counts safety-cap trips. Both exist so the golden
     combat-trace fixtures can pin RNG consumption and prove no fight hits a guard;
     they never affect fight behavior. */
  const _rng=mulberry(cfg.seed||1);
  const rng=cfg.rngTap?function(tag){const v=_rng();cfg.rngTap(tag,v);return v;}:_rng;
  const mk=(s,key)=>({key:key,nm:s.nm,portrait:s.portrait||"g-medallion",hp:s.hp,maxHp:s.hp,shield:0,pois:0,burn:0,
    items:s.items,ls:s.lifesteal||0,regen:s.regen||0,lastHealTime:null,debuffs:{},rules:Object.assign({},s.rules||{}),friendlyRattleUsed:false});
  const A=mk(cfg.a,"a"), B=mk(cfg.b,"b");
  const F={t:0,done:false,winner:null,stormAt:cfg.stormAt,stormOn:false,a:A,b:B,secMark:0,stormDmg:5,pocketed:0,lotPaid:0,
    diagnostics:{guardTrips:0,guardCounts:{contacts:0,catchup:0,depth:0,root:0,step:0,hook:0}}};
  /* Optional contribution facts are observational only. They never join the
     public event stream, never draw RNG, and a reporting callback cannot break
     combat if storage or instrumentation code throws. */
  function observe(fact){if(!cfg.diagnosticTap)return;try{cfg.diagnosticTap(fact);}catch(e){}}
  function wireRef(ref){return ref?{side:ref.side,uid:ref.uid,slot:ref.slot}:null;}
  /* R7 source identity is fight-local. A live source is found by side + uid,
     while a tombstone keeps the dead slot and captured rattle data. A same-slot
     replacement therefore cannot inherit queued work from the item it replaced. */
  const worklist=[];
  const liveSources=new Map();
  const tombstones=new Map();
  const itemRefs=new WeakMap();
  const usedSourceKeys=new Set();
  const hookRegistry=[];
  const hookPoints=new Set();
  const hookState=new Map();
  const itemState=new Map();
  let localUid=-1,eventSink=null,rootBudget=null,stepActions=0,startPending=true;
  Object.defineProperty(F.diagnostics,"pendingActions",{enumerable:true,get:function(){return worklist.length;}});
  function tripGuard(kind){F.diagnostics.guardTrips++;F.diagnostics.guardCounts[kind]++;}
  const sideOf=key=>key==="a"?A:B;
  const sourceKey=ref=>ref.side+":"+String(ref.uid);
  function registerSource(side,it,slot){
    let uid=it.uid,key=side.key+":"+String(uid);
    while(uid===undefined||uid===null||usedSourceKeys.has(key)){
      uid=localUid--;key=side.key+":"+String(uid);
    }
    it.uid=uid;
    const ref={side:side.key,uid:uid,slot:slot};
    usedSourceKeys.add(key);liveSources.set(key,{ref:ref,item:it});itemRefs.set(it,ref);
    return ref;
  }
  function sourceOf(side,it,slot){
    const ref=itemRefs.get(it);
    return ref&&ref.side===side.key&&ref.slot===slot?ref:registerSource(side,it,slot);
  }
  /* Hero rules select their single centerpiece once, from the immutable fight
     opening order. Later spawns never steal the role. These marks are ordinary
     fight-local item state, so sides without rules remain byte-identical. */
  function prepareRules(side){
    const rules=side.rules||{};
    if(rules.leftmostBurnLastLight){
      const item=side.items.find(function(it){return it.alive&&it.cat==="burn";});
      if(item){item.bulwark=true;item.heroLastLight=true;item.heroLastLightSpent=false;}
    }
    if(rules.leftmostWeaponPerfectEdge){
      const item=side.items.find(function(it){return it.alive&&it.fx&&it.fx.dmg>0;});
      if(item){item.heroPerfectEdge=true;item.nextCdFlat=item.nextCdFlat||0;}
    }
    if(rules.leftmostShieldStoresOnSelf){
      const item=side.items.find(function(it){return it.alive&&it.cat==="shield";});
      if(item){item.bulwark=true;item.heroLivingRampart=true;item.itemShield=item.itemShield||0;}
    }
    if(rules.fastestWeaponAlternatingCrit){
      let chosen=null;
      for(const item of side.items){
        if(!item.alive||!item.fx||!item.fx.dmg||item.cd<=0){continue;}
        if(!chosen||item.cd<chosen.cd){chosen=item;}
      }
      if(chosen){chosen.heroSilkblade=true;chosen.activationCount=0;}
    }
  }
  prepareRules(A);prepareRules(B);
  const initialHooks=[];
  function queueHookSpecs(out,side,kind,id,order,sourceRef,specs){
    if(!specs){return;}
    if(!Array.isArray(specs)){throw new Error("combat hooks must be an array");}
    for(let i=0;i<specs.length;i++){
      out.push({side:side.key,kind:kind,id:String(id),sourceOrder:order,declaration:i,sourceRef:sourceRef,spec:specs[i]});
    }
  }
  for(const side of [A,B]){
    for(let i=0;i<side.items.length;i++){
      const item=side.items[i],ref=registerSource(side,item,i);
      queueHookSpecs(initialHooks,side,"item",ref.uid,i,ref,item.hooks);
    }
  }
  if(Array.isArray(cfg.hooks)){
    for(let i=0;i<cfg.hooks.length;i++){
      const spec=cfg.hooks[i],side=sideOf(spec.side||"a");
      queueHookSpecs(initialHooks,side,spec.kind||"rule",spec.sourceId||("rule"+i),spec.order||0,null,[spec]);
    }
  }else if(cfg.hooks){
    for(const key of ["a","b"]){
      const specs=cfg.hooks[key]||[];
      for(let i=0;i<specs.length;i++){
        const spec=specs[i];queueHookSpecs(initialHooks,sideOf(key),spec.kind||"rule",spec.sourceId||("rule"+i),spec.order||0,null,[spec]);
      }
    }
  }
  function liveItem(ref){
    const row=liveSources.get(sourceKey(ref));
    if(!row){return null;}
    const side=sideOf(ref.side);
    return row.ref.slot===ref.slot&&side.items[ref.slot]===row.item&&row.item.alive?row.item:null;
  }
  function burySource(ref,it){
    const key=sourceKey(ref);liveSources.delete(key);tombstones.set(key,{ref:ref,item:it});
  }
  function spawnUid(side){
    let uid=UID++;
    while(usedSourceKeys.has(side.key+":"+String(uid))){uid=UID++;}
    return uid;
  }
  const hookKindOrder={hero:0,anomaly:1,rule:2,item:3};
  function installHookEntries(entries){
    if(!entries.length){return;}
    validateCombatHooks(hookRegistry.map(h=>h.spec).concat(entries.map(h=>h.spec)));
    for(const entry of entries){
      entry.stateIdentity=entry.side+"|"+entry.kind+"|"+entry.id;
      entry.identity=entry.side+"|"+entry.kind+"|"+entry.id+"|"+entry.declaration+"|"+entry.spec.on;
      hookRegistry.push(entry);hookPoints.add(entry.spec.on);
    }
    hookRegistry.sort((a,b)=>{
      if(a.side!==b.side){return a.side<b.side?-1:1;}
      const ak=hookKindOrder[a.kind]===undefined?9:hookKindOrder[a.kind];
      const bk=hookKindOrder[b.kind]===undefined?9:hookKindOrder[b.kind];
      if(ak!==bk){return ak-bk;}
      if(a.sourceOrder!==b.sourceOrder){return a.sourceOrder-b.sourceOrder;}
      if(a.declaration!==b.declaration){return a.declaration-b.declaration;}
      return a.id<b.id?-1:(a.id>b.id?1:0);
    });
  }
  installHookEntries(initialHooks);

  /* The worklist is a depth-first stack owned by this fight. Each scheduler
     activation is one root; child work drains before the parent's continuation. */
  function emit(event){eventSink.push(event);}
  function pushActions(actions,depth){
    for(let i=actions.length-1;i>=0;i--){if(actions[i]){worklist.push({action:actions[i],depth:depth});}}
  }
  function drain(stop){
    while(worklist.length){
      const frame=worklist.pop();
      if(frame.stop){if(frame.stop===stop){return;}continue;}
      if(frame.depth>32){tripGuard("depth");continue;}
      if(rootBudget.actions>=256){tripGuard("root");continue;}
      if(stepActions>=2048){tripGuard("step");continue;}
      rootBudget.actions++;stepActions++;
      resolveAction(frame.action,frame.depth);
    }
  }
  function runChildren(actions,parentDepth){
    if(!actions.length){return;}
    const stop={};worklist.push({stop:stop});pushActions(actions,parentDepth+1);drain(stop);
  }
  function runRoot(actions,ev){
    if(worklist.length){throw new Error("combat worklist leaked between roots");}
    eventSink=ev;rootBudget={actions:0,hooks:new Map(),values:new Map()};
    try{pushActions(actions,0);drain(null);}
    finally{worklist.length=0;eventSink=null;rootBudget=null;}
  }

  function sameRef(a,b){return !!a&&!!b&&a.side===b.side&&a.uid===b.uid&&a.slot===b.slot;}
  function hookStateKey(hook,key){return hook.stateIdentity+"|state|"+key;}
  function itemStateKey(ref,key){return sourceKey(ref)+"|state|"+key;}
  function hookSide(selector,hook,context){
    if(selector==="a"||selector==="b"){return selector;}
    if(!selector||selector==="owner"){return hook.side;}
    if(selector==="enemy"){return hook.side==="a"?"b":"a";}
    if(selector==="actor"){return context.source?context.source.side:hook.side;}
    if(selector==="target"){return context.targetSide||context.side||hook.side;}
    if(selector==="victim"){return context.victim?context.victim.side:(context.side||hook.side);}
    if(selector==="event"){return context.side||context.targetSide||hook.side;}
    return hook.side;
  }
  function hookCondition(condition,hook,context){
    if(!condition){return true;}
    const test=condition.test;
    if(test==="sourceAlive"){return !hook.sourceRef||!!liveItem(hook.sourceRef);}
    if(test==="actorIsSource"){return sameRef(context.source,hook.sourceRef);}
    if(test==="actorNotSource"){return !sameRef(context.source,hook.sourceRef);}
    if(test==="actorSideIsOwner"){return !!context.source&&context.source.side===hook.side;}
    if(test==="victimNotSource"){return !sameRef(context.victim,hook.sourceRef);}
    if(test==="actorCategory"){return context.actor&&context.actor.cat===condition.value;}
    if(test==="actorStateAtLeast"){
      return !!context.source&&(itemState.get(itemStateKey(context.source,condition.key))||0)>=condition.value;
    }
    if(test==="eventSideIsOwner"){return (context.side||context.targetSide)===hook.side;}
    if(test==="eventSideIsEnemy"){return (context.side||context.targetSide)!==hook.side;}
    if(test==="contactKind"){return context.kind===condition.value;}
    if(test==="destroyed"){return !!context.destroyed===(condition.value!==false);}
    if(test==="victimHasRattle"){return !!(context.victimItem&&context.victimItem.rattle);}
    if(test==="itemExists"){return !!selectHookItem(condition.selector,hook,context);}
    if(test==="itemMissing"){return !selectHookItem(condition.selector,hook,context);}
    if(test==="hpBelowMax"){
      const side=sideOf(hookSide(condition.side,hook,context));return side.hp<side.maxHp;
    }
    if(test==="hpEquals"){
      const side=sideOf(hookSide(condition.side,hook,context));return side.hp===condition.value;
    }
    if(test==="statusAtLeast"){
      const side=sideOf(hookSide(condition.side,hook,context));return (side[condition.status]||0)>=condition.value;
    }
    if(test==="stateAtLeast"){return (hookState.get(hookStateKey(hook,condition.key))||0)>=condition.value;}
    if(test==="contextAtLeast"){return (context[condition.key]||0)>=condition.value;}
    if(test==="healedWithin"){
      const side=sideOf(hookSide(condition.side,hook,context));
      return side.lastHealTime!==null&&F.t-side.lastHealTime<=condition.ms;
    }
    if(test==="cleansedPoisonAtLeast"){return (context.cleansedPoison||0)>=condition.value;}
    if(test==="cleansedBurnAtLeast"){return (context.cleansedBurn||0)>=condition.value;}
    throw new Error("unknown combat hook condition");
  }
  function hookMatches(spec,hook,context){
    const conditions=Array.isArray(spec.when)?spec.when:(spec.when?[spec.when]:[]);
    for(const condition of conditions){if(!hookCondition(condition,hook,context)){return false;}}
    return true;
  }
  function hookItemCandidates(selector,hook,context){
    if(selector==="self"||selector==="hook"){return hook.sourceRef&&liveItem(hook.sourceRef)?[hook.sourceRef]:[];}
    if(selector==="actor"){return context.source&&liveItem(context.source)?[context.source]:[];}
    if(selector==="target"){return context.target&&liveItem(context.target)?[context.target]:[];}
    if(selector==="victim"){return context.victim&&liveItem(context.victim)?[context.victim]:[];}
    if(!selector||typeof selector!=="object"){return [];}
    const side=sideOf(hookSide(selector.side,hook,context)),found=[];
    for(let i=0;i<side.items.length;i++){
      const item=side.items[i];
      if(!item.alive){continue;}
      if(selector.active&&item.cd<=0){continue;}
      if(selector.category&&item.cat!==selector.category){continue;}
      if(selector.damageOnly&&!(item.printedDmg||item.fx.dmg)){continue;}
      if(selector.differentActorCategory&&context.actor&&item.cat===context.actor.cat){continue;}
      const ref=sourceOf(side,item,i);
      if(selector.excludeSelf&&sameRef(ref,hook.sourceRef)){continue;}
      if(selector.excludeActor&&sameRef(ref,context.source)){continue;}
      if(selector.adjacentToSelf&&(!hook.sourceRef||Math.abs(ref.slot-hook.sourceRef.slot)!==1)){continue;}
      found.push(ref);
    }
    return found;
  }
  function selectHookItem(selector,hook,context){
    const found=hookItemCandidates(selector,hook,context);
    if(!found.length){return null;}
    if(selector&&selector.position==="rightmost"){return found[found.length-1];}
    if(selector.position==="lowestIntegrity"){
      let best=found[0];
      for(const ref of found){if(liveItem(ref).integ<liveItem(best).integ){best=ref;}}
      return best;
    }
    if(selector.position==="highestDamage"){
      let best=found[0];
      for(const ref of found){
        const item=liveItem(ref),current=liveItem(best);
        if((item.printedDmg||item.fx.dmg||0)>(current.printedDmg||current.fx.dmg||0)){best=ref;}
      }
      return best;
    }
    return found[0];
  }
  function selectHookItems(selector,hook,context){
    if(selector&&typeof selector==="object"&&selector.position){
      const selected=selectHookItem(selector,hook,context);return selected?[selected]:[];
    }
    return hookItemCandidates(selector,hook,context);
  }
  function hookValue(value,hook,context){
    if(typeof value==="number"){return value;}
    if(!value||typeof value!=="object"){return value;}
    let result;
    if(value.from==="context"){result=context[value.key]||0;}
    else if(value.from==="status"){
      const side=sideOf(hookSide(value.side,hook,context));result=side[value.status]||0;
    }else if(value.from==="state"){
      result=hookState.get(hookStateKey(hook,value.key))||0;
    }else if(value.from==="actorState"){
      result=context.source?(itemState.get(itemStateKey(context.source,value.key))||0):0;
    }else if(value.from==="sourceRarity"){
      const item=hook.sourceRef&&(liveItem(hook.sourceRef)||(tombstones.get(sourceKey(hook.sourceRef))||{}).item);
      const rarity=item?item.rarity||0:0;
      if(!Array.isArray(value.values)||value.values[rarity]===undefined){throw new Error("missing combat hook rarity value");}
      result=value.values[rarity];
    }else{throw new Error("unknown combat hook value");}
    if(value.multiply!==undefined){result*=value.multiply;}
    if(value.divide!==undefined){result/=value.divide;}
    if(value.floor){result=Math.floor(result);}
    if(value.round){result=Math.round(result);}
    if(value.ceil){result=Math.ceil(result);}
    if(value.min!==undefined){result=Math.max(value.min,result);}
    if(value.max!==undefined){result=Math.min(value.max,result);}
    if(value.add!==undefined){result+=value.add;}
    return result;
  }
  function materializeHookAction(template,hook,context){
    const action=Object.assign({},template);
    if(template.source==="actor"){action.source=context.source||null;}
    else if(template.source==="hook"||template.source===undefined){action.source=hook.sourceRef||context.source||null;}
    action.fromHook=true;
    if(action.side){action.side=hookSide(action.side,hook,context);}
    if(action.targetSide){action.targetSide=hookSide(action.targetSide,hook,context);}
    for(const key of ["amount","add","mul","shieldPierce","duration","capPerRoot","value"]){
      if(action[key]!==undefined){action[key]=hookValue(action[key],hook,context);}
    }
    if(action.amount!==undefined&&action.capPerRoot!==undefined){
      const capKey=hook.identity+"|cap|"+(action.capKey||action.op);
      const used=rootBudget.values.get(capKey)||0;
      action.amount=Math.max(0,Math.min(action.amount,action.capPerRoot-used));
      if(action.amount<=0){return null;}
      rootBudget.values.set(capKey,used+action.amount);
    }
    if(action.op==="heal"||action.op==="shield"||action.op==="consumeStatus"){
      action.side=hookSide(action.side||"owner",hook,context);
    }else if(action.op==="poison"||action.op==="burn"||action.op==="damage"){
      action.targetSide=hookSide(action.targetSide||"enemy",hook,context);
    }else if(action.op==="merchantHit"){
      action.side=hookSide(action.side||"enemy",hook,context);action.hookable=true;
    }else if(action.op==="haste"||action.op==="activate"||action.op==="destroy"||action.op==="disarm"){
      if(action.targets!==undefined){
        action.targetRefs=selectHookItems(action.targets,hook,context);if(!action.targetRefs.length){return null;}
      }else{
        action.targetRef=selectHookItem(action.target,hook,context);if(!action.targetRef){return null;}
      }
    }else if(action.op==="itemStateSet"||action.op==="itemStateReset"){
      action.targetRefs=selectHookItems(action.targets!==undefined?action.targets:action.target,hook,context);
      if(!action.targetRefs.length){return null;}
    }else if(action.op==="removeShield"){
      action.side=hookSide(action.side||"enemy",hook,context);
      if(action.store){action.stateKey=hookStateKey(hook,action.store);}
    }else if(action.op==="cleanseStatus"){
      action.side=hookSide(action.side||"owner",hook,context);
      if(action.store){action.stateKey=hookStateKey(hook,action.store);}
    }else if(action.op==="timedDebuff"){
      action.side=hookSide(action.side||"enemy",hook,context);
    }else if(action.op==="modifyContact"){
      action.context=context;
    }else if(action.op==="modifyHeal"){
      action.context=context;
    }else if(action.op==="spendShieldForDamage"){
      action.side=hookSide(action.side||"owner",hook,context);action.context=context;
    }else if(action.op==="repair"){
      action.targetRef=selectHookItem(action.target,hook,context);if(!action.targetRef){return null;}
    }else if(action.op==="setTimerFraction"){
      action.targetRef=selectHookItem(action.target,hook,context);if(!action.targetRef){return null;}
    }else if(action.op==="stateAdd"||action.op==="stateReset"||action.op==="stateSet"){
      action.stateKey=hookStateKey(hook,action.key);
    }
    return action;
  }
  function triggerHookPoint(point,context,depth){
    if(!hookPoints.has(point)){return;}
    const actions=[];
    for(const hook of hookRegistry){
      if(hook.spec.on!==point){continue;}
      if(hook.sourceRef&&!liveItem(hook.sourceRef)&&!hook.spec.allowDead){continue;}
      if(!hookMatches(hook.spec,hook,context)){continue;}
      if(hook.spec.every){
        const key=hook.identity+"|every",count=(hookState.get(key)||0)+1;hookState.set(key,count);
        if(count%hook.spec.every!==0){continue;}
      }
      if(hook.spec.oncePerMs){
        const key=hook.identity+"|interval",bucket=Math.floor(F.t/hook.spec.oncePerMs);
        if(hookState.get(key)===bucket){continue;}hookState.set(key,bucket);
      }
      if(hook.spec.oncePerContext){
        const value=hook.spec.oncePerContext==="actorCategory"?(context.actor&&context.actor.cat):context[hook.spec.oncePerContext];
        const key=hook.identity+"|context|"+String(value);
        if(value===undefined||hookState.get(key)){continue;}hookState.set(key,1);
      }
      const count=rootBudget.hooks.get(hook.identity)||0;
      if(count>=16){tripGuard("hook");continue;}
      rootBudget.hooks.set(hook.identity,count+1);
      for(const template of hook.spec.actions){
        const action=materializeHookAction(template,hook,context);if(action){actions.push(action);}
      }
    }
    runChildren(actions,depth);
  }

  function hitMerchant(side,amt,kind,source,depth,hookable,channel){
    const sourceItem=source&&liveItem(source);
    const context={source:source||null,sourceSide:source?source.side:null,targetSide:side.key,
      side:side.key,kind:"merchant",target:null,actor:sourceItem?{cat:sourceItem.cat,nm:sourceItem.nm,size:sourceItem.size}:null,
      originalDamage:amt,damage:amt,destroyed:false,shieldPierce:0};
    if(hookable){triggerHookPoint("beforeHit",context,depth);}
    const damage=Math.max(0,context.damage),pierce=Math.max(0,Math.min(1,context.shieldPierce||0));
    const bypass=Math.round(damage*pierce),shieldable=damage-bypass;
    const absorbed=Math.min(side.shield,shieldable);side.shield-=absorbed;
    const hpDamage=bypass+shieldable-absorbed;side.hp-=hpDamage;
    emit({k:kind||"hhit",side:side.key,amt:hpDamage,abs:absorbed});
    observe({kind:"damage",source:wireRef(source),target:{side:side.key},targetLayer:"merchant",
      channel:channel||(kind==="storm"?"storm":"weapon"),amount:hpDamage,shieldAbsorbed:absorbed});
    context.damage=damage;context.dealt=damage;context.hpDamage=hpDamage;context.shieldAbsorbed=absorbed;
    if(hookable){triggerHookPoint("afterHit",context,depth);}
    return {dealt:damage,hpDamage:hpDamage,absorbed:absorbed};
  }
  function sideModifier(side,key){
    let value=1;
    for(const id of Object.keys(side.debuffs)){
      const debuff=side.debuffs[id];
      if(debuff.until<=F.t){delete side.debuffs[id];continue;}
      if(debuff.modifiers&&debuff.modifiers[key]!==undefined){value*=debuff.modifiers[key];}
    }
    return value;
  }
  function resolveHeal(action,depth){
    const side=sideOf(action.side),context={source:action.source||null,side:side.key,
      amount:action.amount,requested:action.amount,quiet:!!action.quiet,
      cleanPoison:action.cleanPoison||0,cleanBurn:action.cleanBurn||0,cleanTotal:action.cleanTotal||0};
    if(side.rules.healingDisabled){return;}
    if(action.automaticCleanse&&side.rules.healingCleanses===false){
      context.cleanPoison=0;context.cleanBurn=0;context.cleanTotal=0;
    }
    triggerHookPoint("beforeHeal",context,depth);
    const receivedMul=sideModifier(side,"healReceivedMul");
    const amount=Math.max(0,Math.round(context.amount*receivedMul)),before=side.hp,missing=Math.max(0,side.maxHp-before);
    const poisonBefore=side.pois,burnBefore=side.burn;
    if(side.rules.healClearsAllBurn){side.burn=0;}
    side.hp=Math.min(side.maxHp,side.hp+amount);
    if(!action.quiet){emit({k:"heal",side:side.key,amt:side.hp-before});}
    if(context.cleanTotal){
      for(let i=0;i<context.cleanTotal;i++){
        if(side.pois<=0&&side.burn<=0){break;}
        if(side.pois>=side.burn&&side.pois>0){side.pois--;}
        else{side.burn--;}
      }
    }else{
      if(context.cleanPoison){side.pois=Math.max(0,side.pois-context.cleanPoison);}
      if(context.cleanBurn){side.burn=Math.max(0,side.burn-context.cleanBurn);}
    }
    context.amount=amount;context.actual=side.hp-before;context.overheal=Math.max(0,amount-missing);context.receivedMul=receivedMul;
    context.cleansedPoison=poisonBefore-side.pois;context.cleansedBurn=burnBefore-side.burn;
    context.cleansedTotal=context.cleansedPoison+context.cleansedBurn;
    if(side.rules.overhealToShield&&context.overheal>0){
      side.shield+=context.overheal;emit({k:"shield",side:side.key,amt:context.overheal,val:side.shield,overheal:true});
      observe({kind:"utility",source:wireRef(action.creditSource||action.source),metric:"shield",amount:context.overheal,targetSide:side.key});
    }
    observe({kind:"utility",source:wireRef(action.creditSource||action.source),metric:"heal",amount:context.actual,targetSide:side.key});
    observe({kind:"utility",source:wireRef(action.creditSource||action.source),metric:"overheal",amount:context.overheal,targetSide:side.key});
    if(context.cleansedTotal){observe({kind:"utility",source:wireRef(action.creditSource||action.source),metric:"cleanse",amount:context.cleansedTotal,targetSide:side.key});}
    if(poisonBefore!==side.pois){observe({kind:"status_sync",status:"poison",target:{side:side.key},value:side.pois});}
    if(burnBefore!==side.burn){observe({kind:"status_sync",status:"burn",target:{side:side.key},value:side.burn});}
    if(context.actual>0){side.lastHealTime=F.t;}
    if(context.cleansedPoison||context.cleansedBurn){triggerHookPoint("afterCleanse",context,depth);}
    triggerHookPoint("afterHeal",context,depth);
  }
  function applyHaste(source,targetRef,amount,depth){
    const target=liveItem(targetRef);if(!target||target.cd<=0){return;}
    target.timer+=amount*1000;emit({k:"haste",side:targetRef.side,i:targetRef.slot});
    observe({kind:"utility",source:wireRef(source),metric:"haste",amount:amount,target:wireRef(targetRef)});
    triggerHookPoint("afterHaste",{source:source||null,target:targetRef,side:targetRef.side,
      targetSide:targetRef.side,amount:amount},depth);
  }
  function baseRattle(side,source,dead){
    const actions=[],rattle=dead.rattle;
    if(!rattle){return actions;}
    if(rattle.hasteMates){actions.push({op:"rattleHaste",side:side.key,source:source,amount:rattle.hasteMates});}
    if(rattle.spawn){actions.push({op:"spawn",side:side.key,source:source,spec:rattle.spawn,fromRattle:true});}
    return actions;
  }
  function compileRattle(side,source,dead){
    const actions=baseRattle(side,source,dead);
    if(!actions.length){return actions;}
    let doubled=false;
    if(side.rules.oneTrueFuneral){
      if(side.friendlyRattleUsed){return [];}
      side.friendlyRattleUsed=true;doubled=true;
    }else if(side.rules.firstDeathrattleDouble&&!side.firstDeathrattleDoubled){
      side.firstDeathrattleDoubled=true;doubled=true;
    }
    if(!doubled){return actions;}
    return actions.concat(actions.map(function(action){const copy=Object.assign({},action);
      if(copy.op==="spawn"){copy.repeatSpawn=true;}return copy;}));
  }
  function destroySource(side,source,killer,depth){
    const it=liveItem(source);if(!it){return;}
    if(it.heroLastLight&&!it.heroLastLightSpent){
      it.heroLastLightSpent=true;
      const enemy=side===A?B:A;
      runChildren(compileActivation(side,enemy,it,source,{skipAmmo:true,ignoreSelfDestruct:true}),depth);
      if(!liveItem(source)){return;}
    }
    const spill=it.poisonSpillsOnDestroy?(it.pois||0):0,rampartShield=it.heroLivingRampart?(it.itemShield||0):0;
    const queuedSpawns=it.spawnQueue||0,spawnSpec=it.spawnSpec||null,spawnOrigin=it.spawnOrigin||null;
    it.alive=false;it.integ=0;
    emit({k:"destroy",side:side.key,i:source.slot,nm:it.nm});
    burySource(source,it);
    if(rampartShield>0){it.itemShield=0;side.shield+=rampartShield;emit({k:"shield",side:side.key,amt:rampartShield,val:side.shield,transfer:true});
      observe({kind:"utility",source:wireRef(source),metric:"shield",amount:rampartShield,targetSide:side.key});}
    if(spill>0){observe({kind:"status_transfer",status:"poison",from:wireRef(source),to:{side:side.key},amount:spill});
      it.pois=0;side.pois+=spill;emit({k:"pois",side:side.key,amt:spill,val:side.pois,spill:true});}
    observe({kind:"destroy",target:wireRef(source),source:wireRef(killer)});
    triggerHookPoint("destroyed",{source:killer||null,killer:killer||null,victim:source,
      victimItem:it,victimSize:it.size,side:side.key,targetSide:side.key},depth);
    runChildren(compileRattle(side,source,it),depth);
    if(queuedSpawns>0&&spawnSpec){
      runChildren([{op:"spawn",side:side.key,source:source,spec:spawnSpec,fromRattle:true,
        queue:queuedSpawns-1,origin:spawnOrigin}],depth);
    }
  }
  function resolveDamage(action,depth){
    const it=liveItem(action.source);if(!it){return;}
    const sourceSide=sideOf(action.source.side),targetSide=sideOf(action.targetSide);
    let dmg=action.amount;
    /* The one crit draw happens at damage start, before the first target lookup. */
    if(action.forceCrit){dmg*=2;emit({k:"crit",side:sourceSide.key,i:action.source.slot});}
    else if(action.crit>0&&rng("crit")<action.crit){dmg*=2;emit({k:"crit",side:sourceSide.key,i:action.source.slot});}
    const overflow=action.overflow!==undefined?action.overflow:(action.size>=3?1:(action.size===2?0.5:0));
    let remaining=dmg,dealt=0,contacts=0,hitItem=false,destroyedItem=false;
    while(remaining>0&&contacts<12){
      contacts++;
      const slot=action.merchantOnly?-1:pickTarget(targetSide.items,action.targeting);
      if(slot<0){
        if(!action.itemOnly){const result=hitMerchant(targetSide,remaining,null,action.source,depth,true,action.channel||(action.fromHook?"hook":"weapon"));dealt+=result.dealt;}
        remaining=0;break;
      }
      const target=targetSide.items[slot],targetRef=sourceOf(targetSide,target,slot);
      const context={source:action.source,sourceSide:sourceSide.key,targetSide:targetSide.key,
        side:targetSide.key,kind:"item",target:targetRef,actor:{cat:it.cat,nm:it.nm,size:it.size},originalDamage:remaining,damage:remaining,
        destroyed:false,overkill:0,shieldAbsorbed:0};
      triggerHookPoint("beforeHit",context,depth);
      const contactDamage=Math.max(0,context.damage),itemAbsorbed=Math.min(target.itemShield||0,contactDamage);
      if(itemAbsorbed>0){
        target.itemShield-=itemAbsorbed;emit({k:"shield",side:targetSide.key,i:slot,amt:-itemAbsorbed,
          val:target.itemShield,item:true,absorbed:true});
      }
      const integrityDamage=contactDamage-itemAbsorbed,hit=Math.min(target.integ,integrityDamage);
      target.integ-=hit;dealt+=hit;
      const excess=integrityDamage-hit;remaining=0;hitItem=true;context.shieldAbsorbed=itemAbsorbed;
      if(target.integ<=0){
        target.integ=0;
        emit({k:"chip",side:targetSide.key,i:slot,amt:hit,integ:0});
        destroySource(targetSide,targetRef,action.source,depth);
        context.destroyed=true;destroyedItem=true;context.overkill=excess;context.dealt=hit;context.remainingIntegrity=0;
      }else{
        if(hit>0){emit({k:"chip",side:targetSide.key,i:slot,amt:hit,integ:target.integ});}
        context.dealt=hit;context.remainingIntegrity=target.integ;
      }
      observe({kind:"damage",source:wireRef(action.source),target:wireRef(targetRef),targetLayer:"item",
        channel:action.channel||(action.fromHook?"hook":"weapon"),amount:hit,shieldAbsorbed:itemAbsorbed});
      triggerHookPoint("afterHit",context,depth);
      if(context.destroyed&&excess>0&&overflow>0){remaining=Math.round(excess*overflow);}
    }
    if(remaining>0){tripGuard("contacts");}
    if(it.heroPerfectEdge&&hitItem&&!destroyedItem){it.nextCdFlat=1000;}
    if(sourceSide.ls>0&&dealt>0&&!sourceSide.rules.healingDisabled){
      runChildren([{op:"heal",side:sourceSide.key,amount:Math.max(1,Math.round(dealt*sourceSide.ls)),quiet:true,
        cleanPoison:0,cleanBurn:0,creditSource:action.source}],depth);
    }
  }
  function compileActivation(sourceSide,targetSide,it,source,options){
    options=options||{};
    const context={source:source,sourceSide:sourceSide.key,targetSide:targetSide.key,
      side:sourceSide.key,actor:{cat:it.cat,nm:it.nm,size:it.size}};
    const actions=[];
    if(hookPoints.has("beforeActivate")){actions.push({op:"hookPoint",point:"beforeActivate",context:context});}
    actions.push({op:"fire",source:source,cat:it.cat});
    if(it.selfdestruct&&!options.ignoreSelfDestruct){
      actions.push({op:"selfDestruct",source:source});
      if(hookPoints.has("afterActivate")){actions.push({op:"hookPoint",point:"afterActivate",context:context});}
      return actions;
    }
    if(it.maxAmmo>0&&!options.skipAmmo){actions.push({op:"ammo",source:source});}
    if(it.freezeOnce>0){actions.push({op:"firstFrost",source:source,targetSide:targetSide.key,amount:it.freezeOnce});}
    const fx=it.fx||{};
    if(fx.dmg){actions.push({op:"damage",source:source,targetSide:targetSide.key,amount:fx.dmg,crit:it.crit||0,channel:"weapon",
      forceCrit:!!options.forceCrit,size:it.size,targeting:it.targeting||null,overflow:it.heroPerfectEdge?1:undefined});}
    if(fx.shield){actions.push({op:"shield",source:source,amount:fx.shield});}
    if(fx.heal){actions.push({op:"heal",source:source,side:sourceSide.key,amount:fx.heal,quiet:false,
      cleanPoison:it.cleanseTotal?0:1,cleanBurn:it.cleanseTotal?0:1,cleanTotal:it.cleanseTotal||0,automaticCleanse:!it.cleanseTotal});}
    if(fx.freeze){actions.push({op:"freeze",source:source,targetSide:targetSide.key,amount:fx.freeze});}
    if(fx.poison){actions.push({op:"poison",source:source,targetSide:targetSide.key,amount:fx.poison});}
    if(fx.burn){actions.push({op:"burn",source:source,targetSide:targetSide.key,amount:fx.burn});}
    if(fx.haste){actions.push({op:"hasteAdjacent",source:source,amount:fx.haste});}
    if(fx.hasteAll){actions.push({op:"hasteAll",source:source,amount:fx.hasteAll});}
    if(fx.reload){actions.push({op:"reload",source:source,amount:fx.reload});}
    if(fx.disable){actions.push({op:"disable",source:source,targetSide:targetSide.key,pay:it.pay||0});}
    if(it.charge){actions.push({op:"charge",source:source,target:it.charge.t,amount:it.charge.s});}
    if(it.pocket){actions.push({op:"pocket",source:source,targetSide:targetSide.key,amount:it.pocket});}
    if(hookPoints.has("afterActivate")){actions.push({op:"hookPoint",point:"afterActivate",context:context});}
    if(sourceSide.rules.activationSelfDamagePct){actions.push({op:"activationSelfDamage",source:source,pct:sourceSide.rules.activationSelfDamagePct});}
    return actions;
  }
  function resolveAction(action,depth){
    const source=action.source?liveItem(action.source):null;
    if(action.op==="fire"){
      if(source){emit({k:"fire",side:action.source.side,i:action.source.slot,cat:action.cat});
        observe({kind:"utility",source:wireRef(action.source),metric:"activations",amount:1});}
    }else if(action.op==="selfDestruct"){
      if(source){destroySource(sideOf(action.source.side),action.source,action.source,depth);}
    }else if(action.op==="ammo"){
      if(source){source.ammo--;emit({k:"ammo",side:action.source.side,i:action.source.slot,left:source.ammo});}
    }else if(action.op==="firstFrost"){
      if(!source){return;}
      const targetSide=sideOf(action.targetSide);let slot=-1;
      for(let i=0;i<targetSide.items.length;i++){if(targetSide.items[i].alive){slot=i;break;}}
      if(slot>=0){targetSide.items[slot].frozen=(targetSide.items[slot].frozen||0)+action.amount*1000;emit({k:"freeze",side:targetSide.key,i:slot,amt:action.amount});
        observe({kind:"utility",source:wireRef(action.source),metric:"freeze",amount:action.amount,target:wireRef(sourceOf(targetSide,targetSide.items[slot],slot))});}
      source.freezeOnce=0;
    }else if(action.op==="damage"){
      resolveDamage(action,depth);
    }else if(action.op==="shield"){
      if(!action.source||source){
        const side=sideOf(action.side||(action.source&&action.source.side));
        if(source&&source.heroLivingRampart){
          source.itemShield=(source.itemShield||0)+action.amount;
          emit({k:"shield",side:side.key,i:action.source.slot,amt:action.amount,val:source.itemShield,item:true});
        }else{side.shield+=action.amount;emit({k:"shield",side:side.key,amt:action.amount,val:side.shield});}
        observe({kind:"utility",source:wireRef(action.source),metric:"shield",amount:action.amount,targetSide:side.key});
      }
    }else if(action.op==="heal"){
      if(!action.source||source){resolveHeal(action,depth);}
    }else if(action.op==="freeze"){
      if(!source){return;}
      const targetSide=sideOf(action.targetSide);let slot=-1;
      for(let i=0;i<targetSide.items.length;i++){if(targetSide.items[i].alive){slot=i;break;}}
      if(slot>=0){targetSide.items[slot].frozen=(targetSide.items[slot].frozen||0)+action.amount*1000;emit({k:"freeze",side:targetSide.key,i:slot,amt:action.amount});
        observe({kind:"utility",source:wireRef(action.source),metric:"freeze",amount:action.amount,target:wireRef(sourceOf(targetSide,targetSide.items[slot],slot))});}
    }else if(action.op==="poison"){
      if(!action.source||source){
        const side=sideOf(action.targetSide),sourceSide=action.source?sideOf(action.source.side):null;
        if(source&&sourceSide.rules.poisonTargetsItems){
          const slot=pickTarget(side.items,source.targeting||null);
          if(slot>=0){
            const target=side.items[slot];target.pois=(target.pois||0)+action.amount;
            target.poisonSpillsOnDestroy=!!sourceSide.rules.poisonSpillsOnDestroy;
            target.poisonSource=action.source;
            emit({k:"pois",side:side.key,i:slot,amt:action.amount,val:target.pois,item:true});
            observe({kind:"status_add",status:"poison",source:wireRef(action.source),target:wireRef(sourceOf(side,target,slot)),amount:action.amount});
          }else{side.pois+=action.amount;emit({k:"pois",side:side.key,amt:action.amount,val:side.pois});
            observe({kind:"status_add",status:"poison",source:wireRef(action.source),target:{side:side.key},amount:action.amount});}
        }else{side.pois+=action.amount;emit({k:"pois",side:side.key,amt:action.amount,val:side.pois});
          observe({kind:"status_add",status:"poison",source:wireRef(action.source),target:{side:side.key},amount:action.amount});}
      }
    }else if(action.op==="burn"){
      if(!action.source||source){const side=sideOf(action.targetSide);side.burn+=action.amount;emit({k:"burn",side:side.key,amt:action.amount,val:side.burn});
        observe({kind:"status_add",status:"burn",source:wireRef(action.source),target:{side:side.key},amount:action.amount});}
    }else if(action.op==="hasteAdjacent"){
      if(!source){return;}
      const side=sideOf(action.source.side),slot=action.source.slot;
      for(const target of [slot-1,slot+1]){
        if(target>=0&&target<side.items.length&&side.items[target].alive&&side.items[target].cd>0){applyHaste(action.source,sourceOf(side,side.items[target],target),action.amount,depth);}
      }
    }else if(action.op==="hasteAll"){
      if(!source){return;}
      const side=sideOf(action.source.side);
      for(let i=0;i<side.items.length;i++){
        if(i!==action.source.slot&&side.items[i].alive&&side.items[i].cd>0){applyHaste(action.source,sourceOf(side,side.items[i],i),action.amount,depth);}
      }
    }else if(action.op==="reload"){
      if(!source){return;}
      const side=sideOf(action.source.side);
      for(let i=0;i<side.items.length;i++){
        const target=side.items[i];
        if(target.alive&&target.maxAmmo>0&&target.ammo<target.maxAmmo){const before=target.ammo;target.ammo=Math.min(target.maxAmmo,target.ammo+action.amount);emit({k:"reload",side:side.key,i:i,left:target.ammo});
          observe({kind:"utility",source:wireRef(action.source),metric:"reload",amount:target.ammo-before,target:wireRef(sourceOf(side,target,i))});}
      }
    }else if(action.op==="disable"){
      if(!source){return;}
      const targetSide=sideOf(action.targetSide);let slot=-1,best=-1;
      for(let i=0;i<targetSide.items.length;i++){
        const target=targetSide.items[i];
        if(target.alive&&!target.lot&&target.fx.dmg&&target.fx.dmg>best){best=target.fx.dmg;slot=i;}
      }
      if(slot>=0){
        targetSide.items[slot].lot=true;emit({k:"lot",side:targetSide.key,i:slot,nm:targetSide.items[slot].nm});
        observe({kind:"utility",source:wireRef(action.source),metric:"disable",amount:1,target:wireRef(sourceOf(targetSide,targetSide.items[slot],slot))});
        if(action.pay){F.lotPaid+=action.pay;emit({k:"lotpay",side:targetSide.key,amt:action.pay});}
      }
    }else if(action.op==="charge"){
      if(!source){return;}
      const side=sideOf(action.source.side),target=side.items[action.target];
      if(target&&target.alive&&target.cd>0){applyHaste(action.source,sourceOf(side,target,action.target),action.amount,depth);}
    }else if(action.op==="pocket"){
      if(source){F.pocketed+=action.amount;emit({k:"pocket",side:action.targetSide,amt:action.amount});
        observe({kind:"utility",source:wireRef(action.source),metric:"pocket",amount:action.amount});}
    }else if(action.op==="rattleHaste"){
      const side=sideOf(action.side);
      for(let i=0;i<side.items.length;i++){
        const target=side.items[i];
        if(target.alive&&target.cd>0){
          target.cd=Math.max(600,Math.round(target.cd*(1-action.amount)));emit({k:"enrage",side:side.key,i:i});
          triggerHookPoint("afterHaste",{source:action.source,target:sourceOf(side,target,i),side:side.key,
            targetSide:side.key,amount:action.amount,permanent:true},depth);
        }
      }
    }else if(action.op==="spawn"){
      const tomb=tombstones.get(sourceKey(action.source));if(!tomb){return;}
      const side=sideOf(action.side),dead=tomb.item,slot=action.source.slot,spec=action.spec;
      if(side.items[slot]!==dead){
        const current=side.items[slot];
        if(action.repeatSpawn&&current&&current.alive&&current.spawnOrigin===sourceKey(action.source)){
          current.spawnQueue=(current.spawnQueue||0)+1;
        }
        return;
      }
      const spawnCd=Math.round(spec.cd*1000),spawnInteg=Math.round(spec.integ*(side.rules.itemIntegrityMul||1));
      const spawnSlotSize=side.rules.sizeCostOverride&&side.rules.sizeCostOverride[dead.size]!==undefined?side.rules.sizeCostOverride[dead.size]:dead.size;
      const spawnCharged=spawnCd>0&&side.rules.startFullyChargedIfBaseCdAtLeast&&spec.cd*1000>=side.rules.startFullyChargedIfBaseCdAtLeast;
      const item={nm:spec.nm,g:spec.g,size:dead.size,slotSize:spawnSlotSize,rarity:dead.rarity,cat:spec.cat||"dmg",tier:dead.tier,
        cd:spawnCd,timer:spawnCharged?spawnCd:0,alive:true,integ:spawnInteg,maxI:spawnInteg,
        fx:Object.assign({},spec.fx),printedDmg:spec.fx&&spec.fx.dmg||0,bulwark:!!spec.bulwark,targeting:spec.targeting||null,charge:null,
        pocket:0,flying:!!spec.flying,frozen:0,disarmed:0,pois:0,itemShield:0,nextCdFlat:0,
        crit:spec.crit||0,rattle:spec.rattle||null,selfdestruct:false,ammo:0,maxAmmo:0,
        cleanseTotal:spec.cleanseTotal||0,hooks:spec.hooks||null,spawnQueue:action.queue||0,
        spawnSpec:spec,spawnOrigin:action.origin||sourceKey(action.source),uid:spawnUid(side)};
      side.items[slot]=item;const spawnedRef=registerSource(side,item,slot);
      const spawnedHooks=[];queueHookSpecs(spawnedHooks,side,"item",spawnedRef.uid,slot,spawnedRef,item.hooks);installHookEntries(spawnedHooks);
      emit({k:"spawn",side:side.key,i:slot,nm:spec.nm,g:spec.g,integ:spawnInteg});
      observe({kind:"spawn",source:wireRef(action.source),spawned:wireRef(spawnedRef)});
      triggerHookPoint("afterSpawn",{source:action.source,spawned:spawnedRef,target:spawnedRef,
        side:side.key,targetSide:side.key,fromRattle:!!action.fromRattle},depth);
    }else if(action.op==="tickPoison"){
      const side=sideOf(action.side),amount=side.pois,decay=side.rules.poisonDecayAfterTick||0.82;
      side.hp-=amount;emit({k:"tickp",side:side.key,amt:amount});side.pois=Math.floor(side.pois*decay);
      observe({kind:"status_tick",status:"poison",channel:"poison",target:{side:side.key},amount:amount,post:side.pois});
    }else if(action.op==="tickItemPoison"){
      const target=liveItem(action.targetRef);if(!target||!(target.pois>0)){return;}
      const side=sideOf(action.targetRef.side),amount=target.pois,hit=Math.min(target.integ,amount);
      target.integ-=hit;emit({k:"chip",side:side.key,i:action.targetRef.slot,amt:hit,integ:Math.max(0,target.integ),poison:true});
      if(target.integ<=0){observe({kind:"status_tick",status:"poison",channel:"poison",target:wireRef(action.targetRef),amount:hit,post:target.pois});
        target.integ=0;destroySource(side,action.targetRef,target.poisonSource||null,depth);}
      else{target.pois=Math.floor(target.pois*(side.rules.poisonDecayAfterTick||0.82));
        observe({kind:"status_tick",status:"poison",channel:"poison",target:wireRef(action.targetRef),amount:hit,post:target.pois});}
    }else if(action.op==="tickBurn"){
      const side=sideOf(action.side),amount=side.burn,absorbed=Math.min(side.shield,Math.floor(amount/2));
      side.shield-=absorbed;const hpDamage=amount-absorbed;side.hp-=hpDamage;
      emit({k:"tickb",side:side.key,amt:hpDamage});side.burn=Math.floor(side.burn*0.6);
      observe({kind:"status_tick",status:"burn",channel:"burn",target:{side:side.key},amount:hpDamage,post:side.burn,shieldAbsorbed:absorbed});
    }else if(action.op==="stormStart"){
      F.stormOn=true;emit({k:"stormstart"});
    }else if(action.op==="merchantHit"){
      hitMerchant(sideOf(action.side),action.amount,action.kind,action.source,depth,!!action.hookable,action.channel);
    }else if(action.op==="raiseStorm"){
      F.stormDmg+=action.amount;
    }else if(action.op==="thaw"){
      if(source){source.frozen=0;emit({k:"thaw",side:action.source.side,i:action.source.slot});}
    }else if(action.op==="end"){
      emit({k:"end",winner:action.winner});
    }else if(action.op==="hookPoint"){
      triggerHookPoint(action.point,action.context,depth);
    }else if(action.op==="haste"){
      if(action.targetRefs){for(const ref of action.targetRefs){applyHaste(action.source,ref,action.amount,depth);}}
      else{applyHaste(action.source,action.targetRef,action.amount,depth);}
    }else if(action.op==="activate"){
      const target=liveItem(action.targetRef);if(!target){return;}
      const side=sideOf(action.targetRef.side),enemy=side===A?B:A;
      runChildren(compileActivation(side,enemy,target,action.targetRef),depth);
    }else if(action.op==="destroy"){
      if(liveItem(action.targetRef)){destroySource(sideOf(action.targetRef.side),action.targetRef,action.source,depth);}
    }else if(action.op==="consumeStatus"){
      const side=sideOf(action.side),status=action.status;
      side[status]=Math.max(0,(side[status]||0)-action.amount);
      observe({kind:"status_sync",status:status==="pois"?"poison":"burn",target:{side:side.key},value:side[status]});
    }else if(action.op==="timedDebuff"){
      if(!action.source||source){
        const side=sideOf(action.side);
        side.debuffs[action.id]={until:F.t+action.duration*1000,modifiers:Object.assign({},action.modifiers)};
      }
    }else if(action.op==="stateAdd"){
      if(!action.source||source){
        const current=hookState.get(action.stateKey)||0;
        hookState.set(action.stateKey,Math.min(action.max===undefined?Infinity:action.max,current+action.amount));
      }
    }else if(action.op==="stateSet"){
      if(!action.source||source){hookState.set(action.stateKey,action.value);}
    }else if(action.op==="stateReset"){
      if(!action.source||source){hookState.set(action.stateKey,0);}
    }else if(action.op==="itemStateSet"){
      if(!action.source||source){for(const ref of action.targetRefs){itemState.set(itemStateKey(ref,action.key),action.value);}}
    }else if(action.op==="itemStateReset"){
      if(!action.source||source){for(const ref of action.targetRefs){itemState.delete(itemStateKey(ref,action.key));}}
    }else if(action.op==="removeShield"){
      if(!action.source||source){
        const side=sideOf(action.side),removed=Math.min(side.shield,Math.max(0,action.amount));
        side.shield-=removed;if(action.stateKey){hookState.set(action.stateKey,removed);}
        observe({kind:"utility",source:wireRef(action.source),metric:"removeShield",amount:removed,targetSide:side.key});
      }
    }else if(action.op==="cleanseStatus"){
      if(!action.source||source){
        const side=sideOf(action.side),before=side[action.status]||0,removed=Math.min(before,Math.max(0,action.amount));
        side[action.status]=before-removed;if(action.stateKey){hookState.set(action.stateKey,removed);}
        observe({kind:"status_sync",status:action.status==="pois"?"poison":"burn",target:{side:side.key},value:side[action.status]});
        observe({kind:"utility",source:wireRef(action.source),metric:"cleanse",amount:removed,targetSide:side.key});
        if(removed){
          triggerHookPoint("afterCleanse",{source:action.source||null,side:side.key,targetSide:side.key,
            cleansedPoison:action.status==="pois"?removed:0,cleansedBurn:action.status==="burn"?removed:0,
            cleansedTotal:removed},depth);
        }
      }
    }else if(action.op==="spendShieldForDamage"){
      if(source){
        const key=itemStateKey(action.source,action.key),cap=itemState.get(key)||0,side=sideOf(action.side);
        const spent=Math.min(side.shield,cap);side.shield-=spent;action.context.damage+=spent;itemState.delete(key);
      }
    }else if(action.op==="repair"){
      const target=liveItem(action.targetRef);
      if(target&&(!action.source||source)){
        const actual=Math.min(Math.max(0,target.maxI-target.integ),action.amount);
        if(actual>0){target.integ+=actual;emit({k:"chip",side:action.targetRef.side,i:action.targetRef.slot,amt:-actual,integ:target.integ,repair:true});
          observe({kind:"utility",source:wireRef(action.source),metric:"repair",amount:actual,target:wireRef(action.targetRef)});}
      }
    }else if(action.op==="disarm"){
      const target=liveItem(action.targetRef);
      if(target&&(!action.source||source)){
        target.disarmed=Math.max(target.disarmed||0,action.duration*1000);
        emit({k:"freeze",side:action.targetRef.side,i:action.targetRef.slot,amt:action.duration,disarm:true});
        observe({kind:"utility",source:wireRef(action.source),metric:"freeze",amount:action.duration,target:wireRef(action.targetRef)});
      }
    }else if(action.op==="setTimerFraction"){
      const target=liveItem(action.targetRef);
      if(target&&target.cd>0&&(!action.source||source)){
        const needed=Math.max(0,target.cd*action.value-target.timer);
        if(needed>0){applyHaste(action.source,action.targetRef,needed/1000,depth);}
      }
    }else if(action.op==="modifyContact"){
      if(action.add){action.context.damage+=action.add;}
      if(action.mul!==undefined){action.context.damage*=action.mul;}
      if(action.shieldPierce!==undefined){action.context.shieldPierce=Math.max(action.context.shieldPierce||0,action.shieldPierce);}
    }else if(action.op==="modifyHeal"){
      if(action.add){action.context.amount+=action.add;}
      if(action.mul!==undefined){action.context.amount*=action.mul;}
    }else if(action.op==="thawDisarm"){
      if(source){source.disarmed=0;emit({k:"thaw",side:action.source.side,i:action.source.slot,disarm:true});}
    }else if(action.op==="activationSelfDamage"){
      if(source){
        const hit=Math.min(source.integ,Math.max(1,Math.round(source.maxI*action.pct)));
        source.integ-=hit;emit({k:"chip",side:action.source.side,i:action.source.slot,amt:hit,integ:Math.max(0,source.integ),selfDamage:true});
        observe({kind:"utility",source:wireRef(action.source),metric:"selfDamage",amount:hit,target:wireRef(action.source)});
        if(source.integ<=0){source.integ=0;destroySource(sideOf(action.source.side),action.source,action.source,depth);}
      }
    }
  }
  F.step=function(dt){
    if(F.done){return [];}
    const ev=[];stepActions=0;
    if(startPending){
      startPending=false;
      if(hookPoints.has("fightStart")){runRoot([{op:"hookPoint",point:"fightStart",context:{side:null,source:null}}],ev);}
    }
    F.t+=dt;
    for(const pair of [[A,B],[B,A]]){
      const S=pair[0],D=pair[1];
      for(let i=0;i<S.items.length;i++){
        const it=S.items[i];
        if(!it.alive||it.cd<=0){continue;}
        const source=sourceOf(S,it,i);
        let paused=false;
        if(it.frozen>0){it.frozen-=dt;paused=true;if(it.frozen<=0){runRoot([{op:"thaw",source:source}],ev);}}
        if(it.disarmed>0){it.disarmed-=dt;paused=true;if(it.disarmed<=0){runRoot([{op:"thawDisarm",source:source}],ev);}}
        if(paused){continue;}
        /* an empty magazine holds its swing until a reload lands */
        if(it.maxAmmo>0&&it.ammo<=0){continue;}
        /* an auctioned lot never acts again */
        if(it.lot){continue;}
        it.timer+=dt;
        let g=0;
        const nextCycle=function(){return it.cd+(it.nextCdFlat||0);};
        while(liveItem(source)===it&&it.timer>=nextCycle()&&g<4){
          const cycle=nextCycle();g++;it.timer-=cycle;it.nextCdFlat=0;
          if(it.heroSilkblade){
            it.activationCount=(it.activationCount||0)+1;
            if(it.activationCount%2===1){runRoot(compileActivation(S,D,it,source,{forceCrit:true}),ev);}
          }else{runRoot(compileActivation(S,D,it,source),ev);}
        }
        if(liveItem(source)===it&&it.cd>0&&it.timer>=nextCycle()){tripGuard("catchup");}   /* the 4-activation catch-up cap held work back */
      }
    }
    while(F.t>=F.secMark+1000){
      F.secMark+=1000;
      for(const S of [A,B]){
        for(let i=0;i<S.items.length;i++){
          const item=S.items[i];
          if(item.alive&&item.pois>0){runRoot([{op:"tickItemPoison",targetRef:sourceOf(S,item,i)}],ev);}
        }
        /* poison ticks its current value, then decays ~30% (stabilization
           2026-07-12): a lone poison hit fades unless reapplied, so poison
           is sustained pressure, not a one-swing merchant nuke */
        if(S.pois>0){runRoot([{op:"tickPoison",side:S.key}],ev);}
        /* burn decays proportionally (~45%/s) instead of 1/s, so a big
           packet no longer implies quadratic total damage; shield still
           halves each tick */
        if(S.burn>0){runRoot([{op:"tickBurn",side:S.key}],ev);}
        /* regen knits fight health every second, capped at the starting
           pool; it does not cleanse stacks and cannot raise the dead */
        if(!S.rules.healingDisabled&&S.regen>0&&S.hp>0&&S.hp<S.maxHp){runRoot([{op:"heal",side:S.key,amount:S.regen,quiet:false,cleanPoison:0,cleanBurn:0}],ev);}
      }
      if(F.secMark>=F.stormAt){
        const storm=[];
        if(!F.stormOn){storm.push({op:"stormStart"});}
        storm.push({op:"merchantHit",side:"a",amount:F.stormDmg,kind:"storm"});
        storm.push({op:"merchantHit",side:"b",amount:F.stormDmg,kind:"storm"});
        storm.push({op:"raiseStorm",amount:4});runRoot(storm,ev);
      }
    }
    const ad=A.hp<=0,bd=B.hp<=0;
    if(ad||bd){
      F.done=true;
      if(ad&&bd){
        if(cfg.playerIs==="a"){F.winner="a";}
        else if(cfg.playerIs==="b"){F.winner="b";}
        else{F.winner=rng("tiebreak")<0.5?"a":"b";}
      }else{F.winner=ad?"b":"a";}
      runRoot([{op:"end",winner:F.winner}],ev);
    }
    return ev;
  };
  F.survTiers=function(key){
    const S=key==="a"?A:B;let s=0;
    for(const it of S.items){if(it.alive){s+=it.tier||1;}}
    return s;
  };
  return F;
}
export function runHeadless(F){let guard=0;while(!F.done&&guard++<3600){F.step(TICK);}return F;}
