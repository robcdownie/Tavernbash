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
import {ITEMS} from '../src/data.js';

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

  /* a replacement created on the later side is eligible when that side has not
     been visited yet: overflow lands first, then the new source activates */
  { name:'spawn-unvisited-side-acts-later',
    dts:[1000],
    cfg:{ seed:2, stormAt:9e9, playerIs:'a',
      a:side([ fi({nm:'Cleaver', cd:1000, size:3, fx:{dmg:10}}) ]),
      b:side([ fi({nm:'Egg', cd:9e9, integ:5, selfdestruct:false,
        rattle:{spawn:{nm:'Chick', g:'g-sword', cd:1, integ:40, fx:{dmg:3}}}}) ]) } },

  /* self-destruct hatch: activation is its own death, then the deathrattle spawns */
  { name:'selfdestruct-hatch',
    dts:[1000],
    cfg:{ seed:2, stormAt:9e9, playerIs:'a',
      a:side([ fi({nm:'RocEgg', cd:1000, selfdestruct:true,
        rattle:{spawn:{nm:'Roc', g:'g-sword', cd:3, integ:60, fx:{dmg:12}}}}) ]),
      b:side([ fi({nm:'Wall', cd:9e9, integ:100}) ]) } },

  /* the other deathrattle verb mutates each survivor left-to-right before the
     scheduler reaches that side, and emits one enrage per affected source */
  { name:'rattle-haste-mates-order',
    dts:[1000],
    cfg:{ seed:2, stormAt:9e9, playerIs:'a',
      a:side([ fi({nm:'Pick', cd:1000, fx:{dmg:5}}) ]),
      b:side([
        fi({nm:'Head', cd:9e9, integ:5, rattle:{hasteMates:0.5}}),
        fi({nm:'MateL', cd:4000, integ:40}),
        fi({nm:'MateR', cd:6000, integ:40})
      ]) } },

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

  /* merchant contact through shield pins hhit amt/abs plus the legacy quiet
     lifesteal accounting; no public heal event is emitted */
  { name:'merchant-shielded-lifesteal',
    dts:[1000],
    setup:(F)=>{ F.a.hp=50; F.b.shield=6; },
    cfg:{ seed:1, stormAt:9e9, playerIs:'a',
      a:side([ fi({nm:'Vamp', cd:1000, fx:{dmg:10}}) ], {hp:100, lifesteal:0.5}),
      b:side([], {hp:100}) } },

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

  /* 0.97.0 payoff wares. Each pins the count-fake proc against a constructed
     fight, riding the shipped ITEMS hooks so a retune of the ware moves its
     golden on purpose. Drummer's own beat hastes every other active blade. */
  { name:'payoff-drummer-hastes-blades',
    dts:[6000],
    cfg:{ seed:1, stormAt:9e9, playerIs:'a',
      a:side([
        fi({nm:'Drummer', cat:'util', cd:6000, fx:{}, hooks:ITEMS.drummer.hooks}),
        fi({nm:'BladeL', cat:'dmg', cd:9e9, integ:100, fx:{dmg:5}}),
        fi({nm:'BladeR', cat:'dmg', cd:9e9, integ:100, fx:{dmg:5}})
      ]),
      b:side([ fi({nm:'Wall', cd:9e9, integ:100}) ]) } },

  /* Procession: every third OTHER poison activation adds a bronze poison to the
     foe; the poison ticker carries the category but applies its own poison too */
  { name:'payoff-procession-third-poison',
    dts:[1000, 1000, 1000],
    cfg:{ seed:1, stormAt:9e9, playerIs:'a',
      a:side([
        fi({nm:'Procession', cat:'poison', cd:0, fx:{}, hooks:ITEMS.procession.hooks}),
        fi({nm:'Ticker', cat:'poison', cd:1000, fx:{poison:2}})
      ]),
      b:side([ fi({nm:'Wall', cd:9e9, integ:200}) ], {hp:200}) } },

  /* March: every second OTHER burn activation adds a bronze burn to the foe */
  { name:'payoff-march-second-burn',
    dts:[1000, 1000],
    cfg:{ seed:1, stormAt:9e9, playerIs:'a',
      a:side([
        fi({nm:'March', cat:'util', cd:0, fx:{}, hooks:ITEMS.march.hooks}),
        fi({nm:'Ember', cat:'burn', cd:1000, fx:{burn:3}})
      ]),
      b:side([ fi({nm:'Wall', cd:9e9, integ:100}) ], {hp:200}) } },

  /* Round: every OTHER shield activation raises one more shield for the owner */
  { name:'payoff-round-each-shield',
    dts:[1000],
    cfg:{ seed:1, stormAt:9e9, playerIs:'a',
      a:side([
        fi({nm:'Round', cat:'util', cd:0, fx:{}, hooks:ITEMS.round.hooks}),
        fi({nm:'Bulwarker', cat:'shield', cd:1000, fx:{shield:10}})
      ]),
      b:side([ fi({nm:'Wall', cd:9e9, integ:100}) ]) } },

  /* 0.99.0 signature wares. Each pins its signature hook (or its rattle/disable)
     against a constructed fight, riding the shipped ITEMS hooks so a retune moves
     the golden on purpose. Bronze rarity throughout, so from:sourceRarity reads
     the first value of each array. */
  /* Kilnkeeper. Bellows Boy pumps its leading OTHER burn ware on activation. */
  { name:'sig-bellowsboy-pumps-burn',
    dts:[4000],
    cfg:{ seed:1, stormAt:9e9, playerIs:'a',
      a:side([
        fi({nm:'Bellows', cat:'burn', cd:4000, fx:{burn:2}, hooks:ITEMS.bellowsboy.hooks}),
        fi({nm:'Ember', cat:'burn', cd:9e9, integ:100, fx:{burn:1}})
      ]),
      b:side([ fi({nm:'Wall', cd:9e9, integ:100}) ]) } },
  /* Cinder Tithe scorches the merchant only once the foe holds 8+ burn. */
  { name:'sig-cindertithe-scorch-at-8',
    dts:[4500],
    cfg:{ seed:1, stormAt:9e9, playerIs:'a',
      a:side([ fi({nm:'Tithe', cat:'burn', size:2, cd:4500, fx:{burn:3}, hooks:ITEMS.cindertithe.hooks}) ]),
      b:side([ fi({nm:'Wall', cd:9e9, integ:200}) ], {hp:200}) },
    setup:F=>{ F.b.burn=8; } },
  /* Apothecary. Attar turns wasted healing into shield. */
  { name:'sig-attar-overheal-to-shield',
    dts:[4000],
    cfg:{ seed:1, stormAt:9e9, playerIs:'a',
      a:side([ fi({nm:'Attar', cat:'heal', cd:4000, fx:{heal:8}, hooks:ITEMS.attar.hooks}) ], {hp:97}),
      b:side([ fi({nm:'Wall', cd:9e9, integ:100}) ]) } },
  /* Quicksilver Dose quickens the stall when it overheals by 6 or more. */
  { name:'sig-quicksilver-overheal-haste',
    dts:[5000],
    cfg:{ seed:1, stormAt:9e9, playerIs:'a',
      a:side([
        fi({nm:'Dose', cat:'heal', size:2, cd:5000, fx:{heal:16}, hooks:ITEMS.quicksilver.hooks}),
        fi({nm:'Blade', cat:'dmg', cd:9e9, integ:100, fx:{dmg:5}})
      ], {hp:95}),
      b:side([ fi({nm:'Wall', cd:9e9, integ:100}) ]) } },
  /* Knifegrinder. The Oilstone hones EVERY ready blade; each pays honed once. */
  { name:'sig-oilstone-hones-all-blades',
    dts:[2000, 2000],
    cfg:{ seed:1, stormAt:9e9, playerIs:'a',
      a:side([
        fi({nm:'Oilstone', cat:'dmg', cd:2000, fx:{dmg:5}, hooks:ITEMS.oilstone.hooks}),
        fi({nm:'BladeL', cat:'dmg', cd:4000, integ:100, fx:{dmg:5}}),
        fi({nm:'BladeR', cat:'dmg', cd:4000, integ:100, fx:{dmg:5}})
      ]),
      b:side([ fi({nm:'Wall', cd:9e9, integ:200}) ], {hp:200}) } },
  /* Headsman's Fee pays its leading weapon on a killing blow. */
  { name:'sig-headsmansfee-kill-haste',
    dts:[5000],
    cfg:{ seed:1, stormAt:9e9, playerIs:'a',
      a:side([ fi({nm:'Fee', cat:'dmg', size:2, cd:5000, fx:{dmg:14}, hooks:ITEMS.headsmansfee.hooks}) ]),
      b:side([ fi({nm:'Fragile', cd:9e9, integ:5}) ]) } },
  /* Moneylender. The Writ auctions the finest enemy weapon each activation, and
     survives to seize the next (highest fx.dmg first, excluding standing lots). */
  { name:'sig-writ-auctions-successive',
    dts:[6000, 6000],
    cfg:{ seed:1, stormAt:9e9, playerIs:'a',
      a:side([ fi({nm:'Writ', cat:'util', size:2, cd:6000, integ:100, fx:{disable:true}}) ]),
      b:side([
        fi({nm:'Big', cat:'dmg', cd:9e9, integ:100, fx:{dmg:20}}),
        fi({nm:'Small', cat:'dmg', cd:9e9, integ:100, fx:{dmg:10}})
      ], {hp:200}) } },
  /* Foreclosure Maul seizes enemy shield as collateral and lands half on the
     merchant. */
  { name:'sig-maul-collateral-to-merchant',
    dts:[5000],
    cfg:{ seed:1, stormAt:9e9, playerIs:'a',
      a:side([ fi({nm:'Maul', cat:'util', size:2, cd:5000, fx:{dmg:9}, hooks:ITEMS.maul.hooks}) ]),
      b:side([ fi({nm:'Wall', cd:9e9, integ:200}) ], {hp:100}) },
    setup:F=>{ F.b.shield=6; } },
  /* Venom Broker. The Dartcase quickens itself once the foe carries 6+ poison. */
  { name:'sig-dartcase-fast-at-6',
    dts:[2500, 2500],
    cfg:{ seed:1, stormAt:9e9, playerIs:'a',
      a:side([ fi({nm:'Dartcase', cat:'poison', cd:2500, fx:{poison:1}, hooks:ITEMS.dartcase.hooks}) ]),
      b:side([ fi({nm:'Wall', cd:9e9, integ:100}) ], {hp:100}) },
    setup:F=>{ F.b.pois=6; } },
  /* Spillwright's Alembic feeds on enemy destruction: each break adds 1 poison. */
  { name:'sig-alembic-feeds-on-break',
    dts:[2000],
    cfg:{ seed:1, stormAt:9e9, playerIs:'a',
      a:side([
        fi({nm:'Alembic', cat:'poison', size:2, cd:9e9, fx:{poison:3}, hooks:ITEMS.alembic.hooks}),
        fi({nm:'Killer', cat:'dmg', cd:2000, integ:100, fx:{dmg:50}})
      ]),
      b:side([
        fi({nm:'Fragile', cd:9e9, integ:5}),
        fi({nm:'Wall', cd:9e9, integ:200})
      ], {hp:200}) } },
  /* Brass Architect. The Plumb Line repoints the most battered OTHER ware. */
  { name:'sig-plumbline-repairs-lowest',
    dts:[4000],
    cfg:{ seed:1, stormAt:9e9, playerIs:'a',
      a:side([
        fi({nm:'PlumbLine', cat:'shield', cd:4000, fx:{shield:6}, hooks:ITEMS.plumbline.hooks}),
        fi({nm:'Wounded', cat:'shield', cd:9e9, integ:5, maxI:20, fx:{shield:1}})
      ]),
      b:side([ fi({nm:'Wall', cd:9e9, integ:100}) ]) } },
  /* Keystone Course quickens the shield wares when a blow is absorbed (flyers
     force the strike onto the shielded merchant). */
  { name:'sig-keystone-absorb-haste',
    dts:[2000],
    cfg:{ seed:1, stormAt:9e9, playerIs:'a',
      a:side([
        fi({nm:'Keystone', cat:'shield', size:2, cd:5000, flying:true, fx:{shield:12}, hooks:ITEMS.keystone.hooks}),
        fi({nm:'Guard', cat:'shield', cd:9e9, flying:true, fx:{shield:5}})
      ]),
      b:side([ fi({nm:'Hitter', cat:'dmg', cd:2000, integ:100, fx:{dmg:8}}) ]) },
    setup:F=>{ F.a.shield=20; } },
  /* Silkblade. The Stiletto carries half its overkill through to the merchant. */
  { name:'sig-stiletto-overkill-carry',
    dts:[1800],
    cfg:{ seed:1, stormAt:9e9, playerIs:'a',
      a:side([ fi({nm:'Stiletto', cat:'dmg', cd:1800, fx:{dmg:6}, hooks:ITEMS.stiletto.hooks}) ]),
      b:side([
        fi({nm:'Fragile', cd:9e9, integ:2}),
        fi({nm:'Wall', cd:9e9, integ:200})
      ], {hp:200}) } },
  /* Loom of Moments sets every OTHER blade ahead on activation. */
  { name:'sig-loom-hastes-blades',
    dts:[5500],
    cfg:{ seed:1, stormAt:9e9, playerIs:'a',
      a:side([
        fi({nm:'Loom', cat:'dmg', size:2, cd:5500, fx:{dmg:10}, hooks:ITEMS.loom.hooks}),
        fi({nm:'Blade', cat:'dmg', cd:9e9, integ:100, fx:{dmg:5}})
      ]),
      b:side([ fi({nm:'Wall', cd:9e9, integ:200}) ]) } },
  /* Ash Collector. The bulwark Urn takes the blow and, when it shatters, a Risen
     Ash walks out in its slot and strikes. */
  { name:'sig-urn-spawns-risen-ash',
    dts:[1000, 2500],
    cfg:{ seed:1, stormAt:9e9, playerIs:'a',
      a:side([ fi({nm:'Urn', cat:'util', size:2, cd:0, bulwark:true, integ:10, maxI:10, fx:{}, rattle:ITEMS.urn.rattle}) ]),
      b:side([ fi({nm:'Hitter', cat:'dmg', cd:1000, integ:100, fx:{dmg:20}}) ]) } },
  /* Bone Chime hurries the whole stall when any OTHER keepsake (a ware with a
     rattle) breaks; its own death does not fire its own hook. */
  { name:'sig-bonechime-hastes-on-keepsake-death',
    dts:[1000],
    cfg:{ seed:1, stormAt:9e9, playerIs:'a',
      a:side([
        fi({nm:'Keepsake', cat:'util', cd:0, integ:5, fx:{}, rattle:{hasteMates:0.1}}),
        fi({nm:'Chime', cat:'util', cd:0, integ:100, fx:{}, rattle:ITEMS.bonechime.rattle, hooks:ITEMS.bonechime.hooks}),
        fi({nm:'Spare', cat:'dmg', cd:9e9, integ:100, fx:{dmg:1}})
      ]),
      b:side([ fi({nm:'Hitter', cat:'dmg', cd:1000, integ:100, fx:{dmg:20}}) ]) } },
];
