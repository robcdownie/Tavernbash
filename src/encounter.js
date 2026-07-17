"use strict";
/* One shared constructor for a route foe. The scout preview, the real fight,
   and the balance sim must all read the same constructed side, or scouting
   misreports the fight (design-lantern-0.89.md, shared entry point
   requirement). Pure: the caller passes everything, G stays outside, so the
   sim and the tests can drive it headless.

   ctx: {threat, hpFlat, A, gold, gilded, power, board, nodeType, gate, lantern}
   Returns {php, side}: the player fight health that fed the mirror, and the
   monster side. At lantern 0 this reproduces the exact pre-0.88.1 call sites
   byte for byte. */
import {fightHP,monsterSide} from './engine.js';
import {MONSTERS} from './data.js';
import {aspectMonId} from './aspects.js';

/* L1 Trimmed Wick: monster and elite doors fight 10 percent stronger. Never
   bosses, never the Dragon Gate (ctx.gate), and the Qareen mirror is exempt
   by ruling: it already scales off the player's own board, so multiplying it
   is a pure stat check. */
function effectivePower(monId,ctx){
  const base=ctx.power||1;
  if((ctx.lantern||0)>=1
     &&(ctx.nodeType==='monster'||ctx.nodeType==='elite')
     &&!ctx.gate
     &&MONSTERS[monId].special!=='mirror'){
    return base*1.10;
  }
  return base;
}

export function buildFoe(monId,ctx){
  /* resolve the board Aspect first, then build from the resolved id, so scout,
     fight, and sim (the three callers) cannot disagree. With no seed/nodeId the
     resolver returns monId and everything below is byte-identical to before. The
     resolved def is returned so callers reading per-monster fields (the storm
     override) read the board actually behind the door, not MONSTERS[base]. */
  const rid=aspectMonId(monId,ctx.seed,ctx.nodeId);
  const php=fightHP(ctx.threat,ctx.hpFlat||0,ctx.A);
  const side=monsterSide(rid,{gold:ctx.gold||0,round:ctx.threat,A:ctx.A,gilded:!!ctx.gilded,
    power:effectivePower(rid,ctx),playerBoard:ctx.board,playerHp:php});
  return {php:php,side:side,def:MONSTERS[rid]};
}
