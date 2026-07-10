"use strict";
import {TICK,RSTAT,RINTEG,BASEINTEG,COST,ANONE,ITEMS,MONSTERS} from './data.js';
/* ============ RNG ============ */
export function mulberry(seed){let t=seed>>>0;return function(){t+=0x6D2B79F5;let r=Math.imul(t^t>>>15,1|t);r^=r+Math.imul(r^r>>>7,61|r);return((r^r>>>14)>>>0)/4294967296;};}
export function fightHP(round,hpFlat,A){return Math.round((90+round*8+(hpFlat||0))*((A||ANONE).hpMul));}
export function stormAt(round){return Math.max(16,34-round*1.5)*1000;}
export function gateOK(defTier,yourTier){return defTier===1||(defTier===2&&yourTier>=2)||(defTier===3&&yourTier>=4);}
/* ============ ITEM INSTANCES + FUSION ============ */
let UID=1;
export function makeItem(id,rarity){return {uid:UID++,id:id,rarity:rarity||0,size:ITEMS[id].size};}
export function integOf(it){return Math.round(BASEINTEG[it.size]*(ITEMS[it.id].integMul||1)*RINTEG[it.rarity]);}
export function fuseScan(board){
  const forged=[];
  let again=true;
  while(again){
    again=false;
    for(let i=0;i<board.length;i++){
      const a=board[i];
      const same=board.filter(x=>x.id===a.id&&x.rarity===a.rarity);
      if(same.length>=3&&a.rarity<3){
        const three=same.slice(0,3);
        const idx=board.indexOf(three[0]);
        const nu={uid:UID++,id:a.id,rarity:a.rarity+1,size:Math.min(3,a.size+1)};
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
  let boardCd=1;
  for(const it of board){if(ITEMS[it.id].cdMul){boardCd*=Math.pow(ITEMS[it.id].cdMul,1);}}
  return board.map((it,idx)=>{
    const def=ITEMS[it.id];
    const rs=RSTAT[it.rarity]*scale;
    let adj=0;
    [idx-1,idx+1].forEach(j=>{
      if(j>=0&&j<board.length){const nd=ITEMS[board[j].id];if(nd.adjDmg){adj+=nd.adjDmg*RSTAT[board[j].rarity];}}
    });
    const fd=(T.firstDouble&&idx===0)?2:1;
    const fx={};
    if(def.fx&&def.fx.dmg){fx.dmg=Math.max(1,Math.round(((def.fx.dmg*rs)+adj+(T.weaponFlat||0))*fd*A.dmgMul));}
    if(def.fx&&def.fx.poison){fx.poison=Math.max(1,Math.round(def.fx.poison*rs*(T.poisonMul||1)*fd*A.poisonMul));}
    if(def.fx&&def.fx.burn){fx.burn=Math.max(1,Math.round(def.fx.burn*rs*(T.burnMul||1)*fd*A.burnMul));}
    if(def.fx&&def.fx.shield){fx.shield=Math.max(1,Math.round(def.fx.shield*rs*(T.shieldMul||1)*fd));}
    if(def.fx&&def.fx.heal){fx.heal=Math.max(1,Math.round(def.fx.heal*rs*(T.healMul||1)*fd));}
    if(def.fx&&def.fx.haste){fx.haste=def.fx.haste*rs;}
    return {nm:def.n,g:"g-"+it.id,size:it.size,rarity:it.rarity,cat:def.cat,tier:def.tier,
      cd:def.cd>0?Math.max(600,Math.round(def.cd*1000*(T.cdMul||1)*A.cdMul*boardCd)):0,
      timer:0,alive:true,integ:integOf(it),maxI:integOf(it),
      fx:fx,bulwark:!!def.bulwark,targeting:def.targeting||null,charge:null,uid:it.uid};
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
    return {nm:b.nm,g:b.g,size:b.size,rarity:ctx.gilded?2:0,cat:"dmg",tier:M.band,
      cd:b.cd>0?Math.round(b.cd*1000*A.cdMul):0,timer:0,alive:true,
      integ:Math.round(b.integ*gild),maxI:Math.round(b.integ*gild),
      fx:fx,bulwark:!!b.bulwark,targeting:b.targeting||null,charge:b.charge||null,uid:UID++};
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
  const tier=Math.min(6,1+Math.ceil(round/2));
  const slots=4+tier;
  let budget=9+round*5.5;
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
    if(r>0){it.size=Math.min(3,it.size+ (r>=2?2:1));}
    if(it.size>slots-usedCells(board)){it.size=ITEMS[pick].size;it.rarity=0;}
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
  const alive=[];for(let i=0;i<items.length;i++){if(items[i].alive){alive.push(i);}}
  if(!alive.length){return -1;}
  for(const i of alive){if(items[i].bulwark){return i;}}
  if(mode==="maxinteg"){
    let best=alive[0];for(const i of alive){if(items[i].integ>items[best].integ){best=i;}}
    return best;
  }
  return alive[0];
}
export function createFight(cfg){
  const rng=mulberry(cfg.seed||1);
  const mk=(s,key)=>({key:key,nm:s.nm,portrait:s.portrait||"g-medallion",hp:s.hp,maxHp:s.hp,shield:0,pois:0,burn:0,items:s.items,ls:s.lifesteal||0,regen:s.regen||0});
  const A=mk(cfg.a,"a"), B=mk(cfg.b,"b");
  const F={t:0,done:false,winner:null,stormAt:cfg.stormAt,stormOn:false,a:A,b:B,secMark:0,stormDmg:5};
  function hHit(D,amt,ev,kind){
    const abs=Math.min(D.shield,amt);D.shield-=abs;const hpd=amt-abs;D.hp-=hpd;
    ev.push({k:kind||"hhit",side:D.key,amt:hpd,abs:abs});
  }
  function healSide(S,amt,ev,quiet){
    const before=S.hp;S.hp=Math.min(S.maxHp,S.hp+amt);
    if(!quiet){ev.push({k:"heal",side:S.key,amt:S.hp-before});}
  }
  function fire(S,D,it,idx,ev){
    ev.push({k:"fire",side:S.key,i:idx,cat:it.cat});
    const fx=it.fx;
    if(fx.dmg){
      const ti=pickTarget(D.items,it.targeting);
      if(ti>=0){
        const tgt=D.items[ti];
        tgt.integ-=fx.dmg;
        if(tgt.integ<=0){tgt.integ=0;tgt.alive=false;ev.push({k:"chip",side:D.key,i:ti,amt:fx.dmg,integ:0});ev.push({k:"destroy",side:D.key,i:ti,nm:tgt.nm});}
        else{ev.push({k:"chip",side:D.key,i:ti,amt:fx.dmg,integ:tgt.integ});}
      }else{hHit(D,fx.dmg,ev);}
      if(S.ls>0){healSide(S,Math.max(1,Math.round(fx.dmg*S.ls)),ev,true);}
    }
    if(fx.shield){S.shield+=fx.shield;ev.push({k:"shield",side:S.key,amt:fx.shield,val:S.shield});}
    if(fx.heal){healSide(S,fx.heal,ev,false);S.pois=Math.max(0,S.pois-1);S.burn=Math.max(0,S.burn-1);}
    if(fx.poison){D.pois+=fx.poison;ev.push({k:"pois",side:D.key,amt:fx.poison,val:D.pois});}
    if(fx.burn){D.burn+=fx.burn;ev.push({k:"burn",side:D.key,amt:fx.burn,val:D.burn});}
    if(fx.haste){
      [idx-1,idx+1].forEach(j=>{if(j>=0&&j<S.items.length&&S.items[j].alive&&S.items[j].cd>0){S.items[j].timer+=fx.haste*1000;ev.push({k:"haste",side:S.key,i:j});}});
    }
    if(it.charge){
      const tj=it.charge.t;
      if(S.items[tj]&&S.items[tj].alive&&S.items[tj].cd>0){S.items[tj].timer+=it.charge.s*1000;ev.push({k:"haste",side:S.key,i:tj});}
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
        it.timer+=dt;
        let g=0;
        while(it.timer>=it.cd&&g++<4){it.timer-=it.cd;fire(S,D,it,i,ev);}
      }
    }
    while(F.t>=F.secMark+1000){
      F.secMark+=1000;
      for(const S of [A,B]){
        if(S.pois>0){S.hp-=S.pois;ev.push({k:"tickp",side:S.key,amt:S.pois});}
        if(S.burn>0){
          const eff=S.burn;const abs=Math.min(S.shield,Math.floor(eff/2));S.shield-=abs;const hpd=eff-abs;S.hp-=hpd;
          ev.push({k:"tickb",side:S.key,amt:hpd});S.burn=Math.max(0,S.burn-1);
        }
        /* regen knits fight health every second, capped at the starting
           pool; it does not cleanse stacks and cannot raise the dead */
        if(S.regen>0&&S.hp>0&&S.hp<S.maxHp){healSide(S,S.regen,ev,false);}
      }
      if(F.secMark>=F.stormAt){
        if(!F.stormOn){F.stormOn=true;ev.push({k:"stormstart"});}
        hHit(A,F.stormDmg,ev,"storm");hHit(B,F.stormDmg,ev,"storm");
        F.stormDmg+=4;
      }
    }
    const ad=A.hp<=0,bd=B.hp<=0;
    if(ad||bd){
      F.done=true;
      if(ad&&bd){
        if(cfg.playerIs==="a"){F.winner="a";}
        else if(cfg.playerIs==="b"){F.winner="b";}
        else{F.winner=rng()<0.5?"a":"b";}
      }else{F.winner=ad?"b":"a";}
      ev.push({k:"end",winner:F.winner});
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
