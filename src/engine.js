"use strict";
import {TICK,RSTAT,RINTEG,BASEINTEG,COST,ANONE,ITEMS,MONSTERS,ENCH} from './data.js';
/* ============ RNG ============ */
export function mulberry(seed){let t=seed>>>0;return function(){t+=0x6D2B79F5;let r=Math.imul(t^t>>>15,1|t);r^=r+Math.imul(r^r>>>7,61|r);return((r^r>>>14)>>>0)/4294967296;};}
export function fightHP(round,hpFlat,A){return Math.round((90+round*8+(hpFlat||0))*((A||ANONE).hpMul));}
export function stormAt(round){return Math.max(16,34-round*1.5)*1000;}
export function gateOK(defTier,yourTier){return defTier===1||(defTier===2&&yourTier>=2)||(defTier===3&&yourTier>=4);}
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
    if(def.fx&&def.fx.heal){fx.heal=Math.max(1,Math.round(def.fx.heal*rs*(T.healMul||1)*fd));}
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
    return {nm:(en?ENCH[en].n+" ":"")+def.n,g:"g-"+it.id,size:it.size,rarity:it.rarity,cat:def.cat,tier:def.tier,
      cd:def.cd>0?Math.max(600,Math.round(def.cd*1000*(T.cdMul||1)*A.cdMul*boardCd*(en==="swift"?0.85:1))):0,
      timer:0,alive:true,integ:integOf(it),maxI:integOf(it),
      fx:fx,bulwark:!!def.bulwark,targeting:def.targeting||null,charge:null,flying:fly,frozen:0,
      crit:fx.dmg?Math.min(0.9,(def.crit||0)+boardCrit):0,rattle:def.rattle||null,selfdestruct:!!def.selfdestruct,
      ammo:def.ammo||0,maxAmmo:def.ammo||0,freezeOnce:en==="icy"?2:0,ench:en||null,uid:it.uid};
  });
}
export function monsterFightItems(mid,ctx){
  const M=MONSTERS[mid];const A=ctx.A||ANONE;const gild=ctx.gilded?1.5:1;
  if(M.special==="mirror"){
    return playerFightItems(ctx.playerBoard,{},A,0.85*gild);
  }
  return M.board.map(b=>{
    const fx={};
    if(b.fx.dmg){let base=b.fx.dmg;if(M.special==="gold"){base+=2*(ctx.gold||0);}fx.dmg=Math.max(1,Math.round(base*gild*A.dmgMul));}
    if(b.fx.burn){fx.burn=Math.max(1,Math.round(b.fx.burn*gild*A.burnMul));}
    if(b.fx.poison){fx.poison=Math.max(1,Math.round(b.fx.poison*gild*A.poisonMul));}
    if(b.fx.shield){fx.shield=Math.round(b.fx.shield*gild);}
    if(b.fx.heal){fx.heal=Math.round(b.fx.heal*gild);}
    if(b.fx.freeze){fx.freeze=b.fx.freeze;}
    if(b.fx.hasteAll){fx.hasteAll=b.fx.hasteAll;}
    if(b.fx.reload){fx.reload=b.fx.reload;}
    if(b.fx.disable){fx.disable=true;}
    return {nm:b.nm,g:b.g,size:b.size,rarity:ctx.gilded?2:0,cat:"dmg",tier:M.band,
      cd:b.cd>0?Math.round(b.cd*1000*A.cdMul):0,timer:0,alive:true,
      integ:Math.round(b.integ*gild),maxI:Math.round(b.integ*gild),
      fx:fx,bulwark:!!b.bulwark,targeting:b.targeting||null,charge:b.charge||null,pocket:b.pocket||0,flying:!!b.flying,frozen:0,crit:b.crit||0,rattle:b.rattle||null,selfdestruct:!!b.selfdestruct,ammo:b.ammo||0,maxAmmo:b.ammo||0,pay:b.pay||0,uid:UID++};
  });
}
export function monsterSide(mid,ctx){
  const M=MONSTERS[mid];const A=ctx.A||ANONE;const gild=ctx.gilded?1.5:1;
  let hp;
  if(M.special==="mirror"){hp=Math.round((ctx.playerHp||fightHP(ctx.round,0,A))*0.85*gild);}
  else if(M.special==="gold"){hp=Math.round((M.hp+15*(ctx.gold||0))*gild*A.hpMul);}
  else{hp=Math.round(M.hp*gild*A.hpMul);}
  return {nm:M.n,portrait:M.glyph,hp:hp,items:monsterFightItems(mid,ctx),lifesteal:0,regen:Math.round((M.regen||0)*gild)};
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
export function createFight(cfg){
  /* R7 diagnostics: an optional cfg.rngTap(tag, value) observes every seeded draw
     without changing its value or order (inert unless a tap is passed), and
     F.diagnostics.guardTrips counts safety-cap trips. Both exist so the golden
     combat-trace fixtures can pin RNG consumption and prove no fight hits a guard;
     they never affect fight behavior. */
  const _rng=mulberry(cfg.seed||1);
  const rng=cfg.rngTap?function(tag){const v=_rng();cfg.rngTap(tag,v);return v;}:_rng;
  const mk=(s,key)=>({key:key,nm:s.nm,portrait:s.portrait||"g-medallion",hp:s.hp,maxHp:s.hp,shield:0,pois:0,burn:0,items:s.items,ls:s.lifesteal||0,regen:s.regen||0});
  const A=mk(cfg.a,"a"), B=mk(cfg.b,"b");
  const F={t:0,done:false,winner:null,stormAt:cfg.stormAt,stormOn:false,a:A,b:B,secMark:0,stormDmg:5,pocketed:0,lotPaid:0,diagnostics:{guardTrips:0}};
  /* R7 source identity is fight-local. A live source is found by side + uid,
     while a tombstone keeps the dead slot and captured rattle data. A same-slot
     replacement therefore cannot inherit queued work from the item it replaced. */
  const worklist=[];
  const liveSources=new Map();
  const tombstones=new Map();
  const itemRefs=new WeakMap();
  const usedSourceKeys=new Set();
  let localUid=-1,eventSink=null;
  Object.defineProperty(F.diagnostics,"pendingActions",{enumerable:true,get:function(){return worklist.length;}});
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
  for(const side of [A,B]){for(let i=0;i<side.items.length;i++){registerSource(side,side.items[i],i);}}
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
      resolveAction(frame.action,frame.depth);
    }
  }
  function runChildren(actions,parentDepth){
    if(!actions.length){return;}
    const stop={};worklist.push({stop:stop});pushActions(actions,parentDepth+1);drain(stop);
  }
  function runRoot(actions,ev){
    if(worklist.length){throw new Error("combat worklist leaked between roots");}
    eventSink=ev;
    try{pushActions(actions,0);drain(null);}
    finally{worklist.length=0;eventSink=null;}
  }

  function hitMerchant(side,amt,kind){
    const absorbed=Math.min(side.shield,amt);side.shield-=absorbed;
    const hpDamage=amt-absorbed;side.hp-=hpDamage;
    emit({k:kind||"hhit",side:side.key,amt:hpDamage,abs:absorbed});
    return {dealt:amt,hpDamage:hpDamage,absorbed:absorbed};
  }
  function resolveHeal(action){
    const side=sideOf(action.side),before=side.hp;
    side.hp=Math.min(side.maxHp,side.hp+action.amount);
    if(!action.quiet){emit({k:"heal",side:side.key,amt:side.hp-before});}
    if(action.cleanPoison){side.pois=Math.max(0,side.pois-action.cleanPoison);}
    if(action.cleanBurn){side.burn=Math.max(0,side.burn-action.cleanBurn);}
  }
  function compileRattle(side,source,dead){
    const actions=[],rattle=dead.rattle;
    if(!rattle){return actions;}
    if(rattle.hasteMates){actions.push({op:"rattleHaste",side:side.key,source:source,amount:rattle.hasteMates});}
    if(rattle.spawn){actions.push({op:"spawn",side:side.key,source:source,spec:rattle.spawn});}
    return actions;
  }
  function destroySource(side,source,killer,depth){
    const it=liveItem(source);if(!it){return;}
    it.alive=false;it.integ=0;
    emit({k:"destroy",side:side.key,i:source.slot,nm:it.nm});
    burySource(source,it);
    runChildren(compileRattle(side,source,it),depth);
  }
  function resolveDamage(action,depth){
    const it=liveItem(action.source);if(!it){return;}
    const sourceSide=sideOf(action.source.side),targetSide=sideOf(action.targetSide);
    let dmg=action.amount;
    /* The one crit draw happens at damage start, before the first target lookup. */
    if(action.crit>0&&rng("crit")<action.crit){dmg*=2;emit({k:"crit",side:sourceSide.key,i:action.source.slot});}
    const overflow=action.size>=3?1:(action.size===2?0.5:0);
    let remaining=dmg,dealt=0,contacts=0;
    while(remaining>0&&contacts<12){
      contacts++;
      const slot=pickTarget(targetSide.items,action.targeting);
      if(slot<0){hitMerchant(targetSide,remaining);dealt+=remaining;remaining=0;break;}
      const target=targetSide.items[slot],targetRef=sourceOf(targetSide,target,slot);
      const hit=Math.min(target.integ,remaining);
      target.integ-=hit;dealt+=hit;
      const excess=remaining-hit;remaining=0;
      if(target.integ<=0){
        target.integ=0;
        emit({k:"chip",side:targetSide.key,i:slot,amt:hit,integ:0});
        destroySource(targetSide,targetRef,action.source,depth);
        if(excess>0&&overflow>0){remaining=Math.round(excess*overflow);}
      }else{
        emit({k:"chip",side:targetSide.key,i:slot,amt:hit,integ:target.integ});
      }
    }
    if(remaining>0){F.diagnostics.guardTrips++;}
    if(sourceSide.ls>0&&dealt>0){
      runChildren([{op:"heal",side:sourceSide.key,amount:Math.max(1,Math.round(dealt*sourceSide.ls)),quiet:true,cleanPoison:0,cleanBurn:0}],depth);
    }
  }
  function compileActivation(sourceSide,targetSide,it,source){
    const actions=[{op:"fire",source:source,cat:it.cat}];
    if(it.selfdestruct){actions.push({op:"selfDestruct",source:source});return actions;}
    if(it.maxAmmo>0){actions.push({op:"ammo",source:source});}
    if(it.freezeOnce>0){actions.push({op:"firstFrost",source:source,targetSide:targetSide.key,amount:it.freezeOnce});}
    const fx=it.fx||{};
    if(fx.dmg){actions.push({op:"damage",source:source,targetSide:targetSide.key,amount:fx.dmg,crit:it.crit||0,size:it.size,targeting:it.targeting||null});}
    if(fx.shield){actions.push({op:"shield",source:source,amount:fx.shield});}
    if(fx.heal){actions.push({op:"heal",source:source,side:sourceSide.key,amount:fx.heal,quiet:false,cleanPoison:1,cleanBurn:1});}
    if(fx.freeze){actions.push({op:"freeze",source:source,targetSide:targetSide.key,amount:fx.freeze});}
    if(fx.poison){actions.push({op:"poison",source:source,targetSide:targetSide.key,amount:fx.poison});}
    if(fx.burn){actions.push({op:"burn",source:source,targetSide:targetSide.key,amount:fx.burn});}
    if(fx.haste){actions.push({op:"hasteAdjacent",source:source,amount:fx.haste});}
    if(fx.hasteAll){actions.push({op:"hasteAll",source:source,amount:fx.hasteAll});}
    if(fx.reload){actions.push({op:"reload",source:source,amount:fx.reload});}
    if(fx.disable){actions.push({op:"disable",source:source,targetSide:targetSide.key,pay:it.pay||0});}
    if(it.charge){actions.push({op:"charge",source:source,target:it.charge.t,amount:it.charge.s});}
    if(it.pocket){actions.push({op:"pocket",source:source,targetSide:targetSide.key,amount:it.pocket});}
    return actions;
  }
  function resolveAction(action,depth){
    const source=action.source?liveItem(action.source):null;
    if(action.op==="fire"){
      if(source){emit({k:"fire",side:action.source.side,i:action.source.slot,cat:action.cat});}
    }else if(action.op==="selfDestruct"){
      if(source){destroySource(sideOf(action.source.side),action.source,action.source,depth);}
    }else if(action.op==="ammo"){
      if(source){source.ammo--;emit({k:"ammo",side:action.source.side,i:action.source.slot,left:source.ammo});}
    }else if(action.op==="firstFrost"){
      if(!source){return;}
      const targetSide=sideOf(action.targetSide);let slot=-1;
      for(let i=0;i<targetSide.items.length;i++){if(targetSide.items[i].alive){slot=i;break;}}
      if(slot>=0){targetSide.items[slot].frozen=(targetSide.items[slot].frozen||0)+action.amount*1000;emit({k:"freeze",side:targetSide.key,i:slot,amt:action.amount});}
      source.freezeOnce=0;
    }else if(action.op==="damage"){
      resolveDamage(action,depth);
    }else if(action.op==="shield"){
      if(source){const side=sideOf(action.source.side);side.shield+=action.amount;emit({k:"shield",side:side.key,amt:action.amount,val:side.shield});}
    }else if(action.op==="heal"){
      if(!action.source||source){resolveHeal(action);}
    }else if(action.op==="freeze"){
      if(!source){return;}
      const targetSide=sideOf(action.targetSide);let slot=-1;
      for(let i=0;i<targetSide.items.length;i++){if(targetSide.items[i].alive){slot=i;break;}}
      if(slot>=0){targetSide.items[slot].frozen=(targetSide.items[slot].frozen||0)+action.amount*1000;emit({k:"freeze",side:targetSide.key,i:slot,amt:action.amount});}
    }else if(action.op==="poison"){
      if(source){const side=sideOf(action.targetSide);side.pois+=action.amount;emit({k:"pois",side:side.key,amt:action.amount,val:side.pois});}
    }else if(action.op==="burn"){
      if(source){const side=sideOf(action.targetSide);side.burn+=action.amount;emit({k:"burn",side:side.key,amt:action.amount,val:side.burn});}
    }else if(action.op==="hasteAdjacent"){
      if(!source){return;}
      const side=sideOf(action.source.side),slot=action.source.slot;
      for(const target of [slot-1,slot+1]){
        if(target>=0&&target<side.items.length&&side.items[target].alive&&side.items[target].cd>0){side.items[target].timer+=action.amount*1000;emit({k:"haste",side:side.key,i:target});}
      }
    }else if(action.op==="hasteAll"){
      if(!source){return;}
      const side=sideOf(action.source.side);
      for(let i=0;i<side.items.length;i++){
        if(i!==action.source.slot&&side.items[i].alive&&side.items[i].cd>0){side.items[i].timer+=action.amount*1000;emit({k:"haste",side:side.key,i:i});}
      }
    }else if(action.op==="reload"){
      if(!source){return;}
      const side=sideOf(action.source.side);
      for(let i=0;i<side.items.length;i++){
        const target=side.items[i];
        if(target.alive&&target.maxAmmo>0&&target.ammo<target.maxAmmo){target.ammo=Math.min(target.maxAmmo,target.ammo+action.amount);emit({k:"reload",side:side.key,i:i,left:target.ammo});}
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
        if(action.pay){F.lotPaid+=action.pay;emit({k:"lotpay",side:targetSide.key,amt:action.pay});}
      }
    }else if(action.op==="charge"){
      if(!source){return;}
      const side=sideOf(action.source.side),target=side.items[action.target];
      if(target&&target.alive&&target.cd>0){target.timer+=action.amount*1000;emit({k:"haste",side:side.key,i:action.target});}
    }else if(action.op==="pocket"){
      if(source){F.pocketed+=action.amount;emit({k:"pocket",side:action.targetSide,amt:action.amount});}
    }else if(action.op==="rattleHaste"){
      const side=sideOf(action.side);
      for(let i=0;i<side.items.length;i++){
        const target=side.items[i];
        if(target.alive&&target.cd>0){target.cd=Math.max(600,Math.round(target.cd*(1-action.amount)));emit({k:"enrage",side:side.key,i:i});}
      }
    }else if(action.op==="spawn"){
      const tomb=tombstones.get(sourceKey(action.source));if(!tomb){return;}
      const side=sideOf(action.side),dead=tomb.item,slot=action.source.slot,spec=action.spec;
      if(side.items[slot]!==dead){return;}
      const item={nm:spec.nm,g:spec.g,size:dead.size,rarity:dead.rarity,cat:spec.cat||"dmg",tier:dead.tier,
        cd:Math.round(spec.cd*1000),timer:0,alive:true,integ:spec.integ,maxI:spec.integ,
        fx:Object.assign({},spec.fx),bulwark:!!spec.bulwark,targeting:spec.targeting||null,charge:null,
        pocket:0,flying:!!spec.flying,frozen:0,crit:spec.crit||0,rattle:spec.rattle||null,selfdestruct:false,ammo:0,maxAmmo:0,uid:spawnUid(side)};
      side.items[slot]=item;registerSource(side,item,slot);
      emit({k:"spawn",side:side.key,i:slot,nm:spec.nm,g:spec.g,integ:spec.integ});
    }else if(action.op==="tickPoison"){
      const side=sideOf(action.side),amount=side.pois;side.hp-=amount;emit({k:"tickp",side:side.key,amt:amount});side.pois=Math.floor(side.pois*0.82);
    }else if(action.op==="tickBurn"){
      const side=sideOf(action.side),amount=side.burn,absorbed=Math.min(side.shield,Math.floor(amount/2));
      side.shield-=absorbed;const hpDamage=amount-absorbed;side.hp-=hpDamage;
      emit({k:"tickb",side:side.key,amt:hpDamage});side.burn=Math.floor(side.burn*0.6);
    }else if(action.op==="stormStart"){
      F.stormOn=true;emit({k:"stormstart"});
    }else if(action.op==="merchantHit"){
      hitMerchant(sideOf(action.side),action.amount,action.kind);
    }else if(action.op==="raiseStorm"){
      F.stormDmg+=action.amount;
    }else if(action.op==="thaw"){
      if(source){source.frozen=0;emit({k:"thaw",side:action.source.side,i:action.source.slot});}
    }else if(action.op==="end"){
      emit({k:"end",winner:action.winner});
    }
  }
  F.step=function(dt){
    if(F.done){return [];}
    const ev=[];
    F.t+=dt;
    for(const pair of [[A,B],[B,A]]){
      const S=pair[0],D=pair[1];
      for(let i=0;i<S.items.length;i++){
        const it=S.items[i];
        if(!it.alive||it.cd<=0){continue;}
        const source=sourceOf(S,it,i);
        if(it.frozen>0){it.frozen-=dt;if(it.frozen<=0){runRoot([{op:"thaw",source:source}],ev);}continue;}
        /* an empty magazine holds its swing until a reload lands */
        if(it.maxAmmo>0&&it.ammo<=0){continue;}
        /* an auctioned lot never acts again */
        if(it.lot){continue;}
        it.timer+=dt;
        let g=0;
        while(liveItem(source)===it&&it.timer>=it.cd&&g<4){
          g++;it.timer-=it.cd;runRoot(compileActivation(S,D,it,source),ev);
        }
        if(liveItem(source)===it&&it.cd>0&&it.timer>=it.cd){F.diagnostics.guardTrips++;}   /* the 4-activation catch-up cap held work back */
      }
    }
    while(F.t>=F.secMark+1000){
      F.secMark+=1000;
      for(const S of [A,B]){
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
        if(S.regen>0&&S.hp>0&&S.hp<S.maxHp){runRoot([{op:"heal",side:S.key,amount:S.regen,quiet:false,cleanPoison:0,cleanBurn:0}],ev);}
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
