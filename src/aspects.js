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
import {VARIANTS,AFFIXES} from './data.js';
import {hash32,isGateDistrict} from './route.js';

export function aspectMonId(monId,seed,nodeId){
  const vs=VARIANTS[monId];
  if(!vs||!vs.length||seed==null||!nodeId)return monId;
  const idx=hash32((seed>>>0)+':'+nodeId+':aspect')%(vs.length+1);
  return idx===0?monId:vs[idx-1];
}

/* The district Affix resolver: a pure, stateless pick of one affix for a district,
   the sibling of the board Aspect pick above. The set is keyed by the district's
   theme (a Long reprise carries a sourceId pointing at its source district; a Quick
   district keys off its own id), and the pick is salted by the district's own id, so
   a reprise draws independently from the Quick district it mirrors. The Dragon Gate
   (either mode) never draws: the Gate contract extends to affixes. With no seed (the
   feature off, every resumed pre-stamp run), the resolver returns null, so no cfg.hooks
   are built and the fight stays byte-identical. No rng() is consumed; the pick is a
   hash, not a draw, so the map hash ledger and draw counts are unchanged. */
function affixTheme(district){return district.sourceId!=null?district.sourceId:district.id;}
export function districtAffix(district,seed){
  if(!district||seed==null||isGateDistrict(district))return null;
  const list=AFFIXES[affixTheme(district)];
  if(!list||!list.length)return null;
  return list[hash32((seed>>>0)+':'+district.id+':affix')%list.length];
}

/* Wire an affix into a fight: stamp each of its hook specs onto side b (the monster),
   kind rule, with a stable per-affix source id, in the exact array shape createFight's
   cfg.hooks intake reads. Rule-kind sorts before item hooks in the registry, so the
   affix applies within the settled system order. Returns null when there is no affix,
   which leaves cfg.hooks unset and the fight byte-identical. */
export function affixFightHooks(affix){
  if(!affix||!affix.hooks)return null;
  return affix.hooks.map(function(h){return Object.assign({side:"b",kind:"rule",sourceId:"affix_"+affix.id},h);});
}
