"use strict";
/* R7 golden combat-trace fixtures. Synthetic, fully-deterministic fights that pin
   the CURRENT 0.68.25 resolver behavior: the full ordered event stream (with F.t),
   the seeded-RNG draw sequence (tag + value), guard-trip diagnostics, and a
   final-state digest (which catches silent changes traces cannot see: cleanse,
   lifesteal, timer/cooldown mutation). These are the PRIMARY combat oracle - the
   byte-identical fight-for-fight parity test was retired in 0.57 (see
   tests/parity.test.js) - so the coming R7 action-queue refactor is provably inert
   only if every fixture below reproduces byte-for-byte.

   Regenerate the golden after an APPROVED behavior change: node scripts/capture-traces.js
   npm test only compares; it never regenerates. (Codex-designed R7, 2026-07-14.) */
import {createFight} from '../src/engine.js';

const R = v => Math.round(v * 1e8) / 1e8;

/* a fight-item with sane defaults; override any field (fx replaces wholesale) */
export function fi(o){
  return Object.assign({
    nm:'W', g:'g-sword', size:1, rarity:0, cat:'dmg', tier:1,
    cd:1000, timer:0, alive:true, integ:20, maxI:20, fx:{},
    bulwark:false, targeting:null, charge:null, pocket:0, flying:false,
    frozen:0, crit:0, rattle:null, selfdestruct:false, ammo:0, maxAmmo:0, lot:false, freezeOnce:0
  }, o);
}
function side(items, extra){ return Object.assign({nm:'S', portrait:'p-0', hp:100, items:items, lifesteal:0, regen:0}, extra); }

/* run a fight under a fixed dt sequence, capturing everything the refactor must
   preserve. `setup(F)` (optional) primes side state (poison/burn/regen) that no
   item applies, before the first step. */
const clone = x => JSON.parse(JSON.stringify(x));   /* fight-items are pure data (no functions) */
export function capture(cfg, dts, setup){
  const rng=[];
  /* fresh sides every run: fights mutate items in place, so reusing the fixture's
     objects would corrupt a second capture */
  const fresh = { seed:cfg.seed, stormAt:cfg.stormAt, playerIs:cfg.playerIs, a:clone(cfg.a), b:clone(cfg.b) };
  const F=createFight(Object.assign({}, fresh, {rngTap:(tag,v)=>rng.push({tag, v:R(v)})}));
  if(setup) setup(F);
  const events=[];
  for(const dt of dts){
    const evs=F.step(dt);
    for(const e of evs) events.push(Object.assign({t:F.t}, e));
    if(F.done) break;
  }
  const dside=S=>({hp:R(S.hp), maxHp:S.maxHp, shield:S.shield, pois:S.pois, burn:S.burn,
    items:S.items.map(it=>({nm:it.nm, alive:!!it.alive, integ:R(it.integ), rarity:it.rarity, cd:it.cd, timer:R(it.timer), frozen:it.frozen, ammo:it.ammo, lot:!!it.lot}))});
  return {done:F.done, winner:F.winner, t:F.t, guardTrips:F.diagnostics.guardTrips, rng,
    final:{a:dside(F.a), b:dside(F.b), pocketed:F.pocketed, lotPaid:F.lotPaid, stormOn:F.stormOn}, events};
}

/* the matrix. keep every board minimal and its intent in a comment. */
export const FIXTURES = [
  /* every keyword in one activation, to pin the fire() action order */
  { name:'mixed-keyword-order',
    dts:[1000],
    cfg:{ seed:1, stormAt:9e9, playerIs:'a',
      a:side([
        fi({nm:'Mixed', cd:1000, size:2, charge:{t:2,s:1}, pocket:2,
            fx:{dmg:5, shield:3, heal:4, freeze:2, poison:3, burn:2, haste:1, hasteAll:1, reload:1, disable:true}}),
        fi({nm:'Ammo', cd:2000, maxAmmo:2, ammo:1}),
        fi({nm:'ChargeTgt', cd:3000})
      ], {hp:90}),
      b:side([ fi({nm:'Foe', cd:9e9, integ:20, fx:{dmg:2}}) ], {hp:100}) } },

  /* crit ALWAYS: one 'crit' draw, damage doubled */
  { name:'crit-always',
    dts:[1000],
    cfg:{ seed:7, stormAt:9e9, playerIs:'a',
      a:side([ fi({nm:'Crit', cd:1000, crit:1, fx:{dmg:10}}) ]),
      b:side([ fi({nm:'Wall', cd:9e9, integ:100}) ]) } },

  /* crit NEVER (crit:0): zero draws, proving an absent roll consumes no rng */
  { name:'crit-never',
    dts:[1000],
    cfg:{ seed:7, stormAt:9e9, playerIs:'a',
      a:side([ fi({nm:'Plain', cd:1000, crit:0, fx:{dmg:10}}) ]),
      b:side([ fi({nm:'Wall', cd:9e9, integ:100}) ]) } },

  /* both merchants die the same step (flying attackers hit through); player-side
     tiebreak resolves with NO draw */
  { name:'simul-death-player-tiebreak',
    dts:[1000],
    cfg:{ seed:3, stormAt:9e9, playerIs:'a',
      a:side([ fi({nm:'FlyA', cd:1000, flying:true, fx:{dmg:10}}) ], {hp:5}),
      b:side([ fi({nm:'FlyB', cd:1000, flying:true, fx:{dmg:10}}) ], {hp:5}) } },

  /* same, but neutral (no playerIs): the tiebreak draws once */
  { name:'simul-death-neutral-draw',
    dts:[1000],
    cfg:{ seed:3, stormAt:9e9, playerIs:null,
      a:side([ fi({nm:'FlyA', cd:1000, flying:true, fx:{dmg:10}}) ], {hp:5}),
      b:side([ fi({nm:'FlyB', cd:1000, flying:true, fx:{dmg:10}}) ], {hp:5}) } },

  /* a Large weapon destroys an egg, spawns its replacement at the same slot, then
     cleaves into the spawn during the same activation (deathrattle-before-overflow) */
  { name:'cleave-destroy-spawn-hit-spawn',
    dts:[1000],
    cfg:{ seed:2, stormAt:9e9, playerIs:'a',
      a:side([ fi({nm:'Cleaver', cd:1000, size:3, fx:{dmg:25}}) ]),
      b:side([ fi({nm:'Egg', cd:9e9, integ:5, selfdestruct:false,
        rattle:{spawn:{nm:'Chick', g:'g-sword', cd:2, integ:40, fx:{dmg:3}}}}) ]) } },

  /* self-destruct hatch: activation is its own death, then the deathrattle spawns */
  { name:'selfdestruct-hatch',
    dts:[1000],
    cfg:{ seed:2, stormAt:9e9, playerIs:'a',
      a:side([ fi({nm:'RocEgg', cd:1000, selfdestruct:true,
        rattle:{spawn:{nm:'Roc', g:'g-sword', cd:3, integ:60, fx:{dmg:12}}}}) ]),
      b:side([ fi({nm:'Wall', cd:9e9, integ:100}) ]) } },

  /* adjacent haste hits idx-1 (already visited this step: hasted but does NOT
     re-fire this step) and idx+1 (not yet visited: the boost makes it fire now) */
  { name:'haste-adjacent-visited-vs-later',
    dts:[1000],
    cfg:{ seed:1, stormAt:9e9, playerIs:'a',
      a:side([
        fi({nm:'L', cd:1500, fx:{dmg:5}}),
        fi({nm:'Haster', cd:1000, fx:{haste:1}}),
        fi({nm:'R', cd:1500, fx:{dmg:5}})
      ]),
      b:side([ fi({nm:'Wall', cd:9e9, integ:100}) ]) } },

  /* small cd under a big dt: multiple activations in one step, and the 4x catch-up
     cap (guardTrips should stay 0 here: exactly 4 fit) */
  { name:'multi-fire-catchup',
    dts:[4000],
    cfg:{ seed:1, stormAt:9e9, playerIs:'a',
      a:side([ fi({nm:'Fast', cd:1000, fx:{dmg:3}}) ]),
      b:side([ fi({nm:'Wall', cd:9e9, integ:100}) ]) } },

  /* heal at full health still emits heal (amt 0) and still cleanses one poison and
     one burn from the healing side */
  { name:'heal-at-full-cleanse',
    dts:[1000],
    setup:(F)=>{ F.a.pois=4; F.a.burn=3; },
    cfg:{ seed:1, stormAt:9e9, playerIs:'a',
      a:side([ fi({nm:'Salve', cd:1000, cat:'heal', fx:{heal:8}}) ], {hp:100}),
      b:side([ fi({nm:'Wall', cd:9e9, integ:100}) ]) } },

  /* lifesteal is a silent state change (no heal event); only the digest shows it */
  { name:'lifesteal-silent',
    dts:[1000],
    cfg:{ seed:1, stormAt:9e9, playerIs:'a',
      a:side([ fi({nm:'Vamp', cd:1000, fx:{dmg:20}}) ], {hp:50, lifesteal:0.5}),
      b:side([ fi({nm:'Wall', cd:9e9, integ:100}) ]) } },

  /* icy first-use frost fires before damage and only once */
  { name:'icy-frost-once',
    dts:[1000, 1000],
    cfg:{ seed:1, stormAt:9e9, playerIs:'a',
      a:side([ fi({nm:'IcyBlade', cd:1000, freezeOnce:2, fx:{dmg:5}}) ]),
      b:side([ fi({nm:'Foe', cd:9e9, integ:100, fx:{dmg:1}}) ]) } },

  /* ammo: one round per activation, an empty magazine holds, reload tops it up */
  { name:'ammo-empty-then-reload',
    dts:[1000, 1000, 1000],
    cfg:{ seed:1, stormAt:9e9, playerIs:'a',
      a:side([
        fi({nm:'Cannon', cd:1000, maxAmmo:1, ammo:1, fx:{dmg:4}}),
        fi({nm:'Hopper', cd:2000, fx:{reload:1}})
      ]),
      b:side([ fi({nm:'Wall', cd:9e9, integ:100}) ]) } },

  /* auction: the finest enemy weapon is put on the block (inert but hittable), and
     a pay field compensates the victim */
  { name:'disable-auction-pay',
    dts:[1000],
    cfg:{ seed:1, stormAt:9e9, playerIs:'a',
      a:side([ fi({nm:'Gavel', cd:1000, pay:5, fx:{disable:true}}) ]),
      b:side([
        fi({nm:'Weak', cd:9e9, integ:100, fx:{dmg:3}}),
        fi({nm:'Finest', cd:9e9, integ:100, fx:{dmg:9}})
      ]) } },

  /* the per-second tick order at one boundary: poison, burn, regen (per side), then
     the storm hits both */
  { name:'combined-ticks-and-storm',
    dts:[1000],
    setup:(F)=>{ F.b.pois=8; F.b.burn=10; F.b.regen=3; },
    cfg:{ seed:1, stormAt:1000, playerIs:'a',
      a:side([], {hp:80}),
      b:side([], {hp:80}) } },

  /* no-op conditions: with no living enemy item and no reloadable/charge target,
     freeze/reload/disable/charge emit nothing; only the activation's fire event */
  { name:'noop-conditions',
    dts:[1000],
    cfg:{ seed:1, stormAt:9e9, playerIs:'a',
      a:side([ fi({nm:'Fizzle', cd:1000, charge:{t:5,s:1}, fx:{freeze:2, reload:1, disable:true}}) ], {hp:100}),
      b:side([], {hp:100}) } },
];
