"use strict";
/* The board Aspect resolver. A pure, stateless pick: given a base monster id, the
   run's map seed, and the node id, it returns which board stands behind that door.

   Variant 0 (index 0) is always the shipped board, so a monster with no variants,
   or any call without a seed or node id (the feature off, every resumed pre-bump
   run, every direct engine, trace, and sim call), returns the base id and stays
   byte-identical to today. No rng() is consumed: the pick is a hash, not a draw,
   so map generation draw counts and the Quick map hash ledger are unchanged at
   every setting. The hash excludes the attempt counter on purpose, so a boss
   retry faces the exact board the player scouted (deliberately unlike fightSeed,
   which varies by attempt: the rng changes, the board does not). */
import {VARIANTS} from './data.js';
import {hash32} from './route.js';

export function aspectMonId(monId,seed,nodeId){
  const vs=VARIANTS[monId];
  if(!vs||!vs.length||seed==null||!nodeId)return monId;
  const idx=hash32((seed>>>0)+':'+nodeId+':aspect')%(vs.length+1);
  return idx===0?monId:vs[idx-1];
}
