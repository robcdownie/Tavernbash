"use strict";
import {boot} from './ui.js';
import {applyBigArt} from './art.js';
import {initFx,fxActive,fxCount} from './fx.js';
import {initSfx} from './sfx.js';
import {createFight,runHeadless,makeItem,fuseScan,genRival,playerFightItems,monsterSide,
        fightHP,stormAt,mulberry,integOf,usedCells,gateOK} from './engine.js';
import {ITEMS,MONSTERS,TRINKETS,ANOMALIES,ANONE,PERSONAS,RSTAT,RINTEG} from './data.js';
if(typeof document!=='undefined'&&typeof window!=='undefined'){
  applyBigArt();
  initSfx();
  boot();
  initFx();
  if('serviceWorker' in navigator&&!location.hostname.match(/^(localhost|127\.)/)){
    window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js');});
  }
}
if(typeof globalThis!=='undefined'){
  globalThis.BB={createFight:createFight,runHeadless:runHeadless,ITEMS:ITEMS,MONSTERS:MONSTERS,TRINKETS:TRINKETS,
   ANOMALIES:ANOMALIES,ANONE:ANONE,PERSONAS:PERSONAS,makeItem:makeItem,fuseScan:fuseScan,genRival:genRival,
   playerFightItems:playerFightItems,monsterSide:monsterSide,fightHP:fightHP,stormAt:stormAt,mulberry:mulberry,
   integOf:integOf,usedCells:usedCells,RSTAT:RSTAT,RINTEG:RINTEG,gateOK:gateOK,fxActive:fxActive,fxCount:fxCount};
}
