"use strict";
/* One shared constructor for a route foe. The scout preview, the real fight,
   and the balance sim must all read the same constructed side, or scouting
   misreports the fight (design-lantern-0.89.md, shared entry point
   requirement). Pure: the caller passes everything, G stays outside, so the
   sim and the tests can drive it headless.

   ctx: {threat, hpFlat, A, gold, gilded, power, board, nodeType, lantern}
   Returns {php, side}: the player fight health that fed the mirror, and the
   monster side. At lantern 0 this reproduces the exact pre-0.88.1 call sites
   byte for byte; the Lantern's L1 door power lands in effectivePower when
   0.89 ships. */
import {fightHP,monsterSide} from './engine.js';

/* L1 Trimmed Wick hook point: monster and elite doors only, never bosses,
   never the Dragon Gate, mirror exempt (the exemption lives in data: the
   mirror special ignores power by the Qareen ruling once 0.89 wires it).
   Inert until a nonzero lantern arrives. */
function effectivePower(ctx){
  return ctx.power||1;
}

export function buildFoe(monId,ctx){
  const php=fightHP(ctx.threat,ctx.hpFlat||0,ctx.A);
  const side=monsterSide(monId,{gold:ctx.gold||0,round:ctx.threat,A:ctx.A,gilded:!!ctx.gilded,
    power:effectivePower(ctx),playerBoard:ctx.board,playerHp:php});
  return {php:php,side:side};
}
