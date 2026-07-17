/* Board-Aspect difficulty trace for The Long Bazaar (0.95.0).

   For every monster with board Aspects, this fights an on-curve player board
   against the shipped board and against each Aspect, PLAIN and GILDED, over many
   seeds, and prints the first-attempt win-rate delta of each Aspect versus the
   shipped board on its own door. It reuses the game's real pieces: route-sim's
   fusion-aware buildBoard for the player, the shared buildFoe constructor for the
   foe (an Aspect is just another monster id, so passing its id builds that board
   directly), and the real createFight / runHeadless. No forcing machinery: the
   shipped board is buildFoe(base), the Aspect is buildFoe(aspectId).

   The independent sim pass folded into design-monster-variance.md proved the risk
   lives in the GILDED column (a swarm of 1-damage bodies barely scales under gild,
   a real board does), so every Aspect is traced plain and gilded, and both are
   held to the door's band: D1-3 doors +/-8, Gate elites +/-5, bosses +/-4.

   Run:  node scripts/variant-verify.mjs            (400 seeds, all aspects)
         node scripts/variant-verify.mjs 800        (set the seed count)
         node scripts/variant-verify.mjs matron kark rats   (only these bases)

   Caveats, stated plainly (same as route-sim): the player model is a competent
   baseline, not a skill ceiling; the storm uses each board's own stormAt or the
   per-threat default; boards are on-curve proxies, not the exact live purse. Read
   deltas as directional and band verdicts as flags, not final tuning. Standard
   error at 400 seeds is roughly 2 to 3 points. */
import {createFight, runHeadless, playerFightItems, mulberry, stormAt} from '../src/engine.js';
import {buildFoe} from '../src/encounter.js';
import {MONSTERS, VARIANTS, DISTRICTS, PERSONAS, ANONE} from '../src/data.js';
import {buildBoard} from './route-sim.js';

const A = ANONE;
const args = process.argv.slice(2);
const N = +(args.find(a => /^\d+$/.test(a)) || 400);
const only = args.filter(a => !/^\d+$/.test(a));

/* where each creature stands and the door threat it fights at */
const INFO = {};
DISTRICTS.forEach((d, i) => {
  (d.normals || []).forEach(m => { INFO[m] = { di: i, threat: d.threatLate, type: 'monster' }; });
  (d.elites || []).forEach(m => { INFO[m] = { di: i, threat: d.threatLate, type: 'elite' }; });
  INFO[d.boss] = { di: i, threat: d.threatBoss, type: 'boss' };
});

/* on-curve player arrival per district (tier, gold invested in the board),
   calibrated so the shipped baselines below reproduce the doc's independent
   sample (gilded rats ~40, gilded matron ~8, gilded azhdaha ~5, plain peri ~88) */
const CURVE = [
  { tier: 1, invest: 11 },   /* D1 Back Alleys */
  { tier: 3, invest: 28 },   /* D2 The Souk */
  { tier: 4, invest: 46 },   /* D3 Palace Quarter */
  { tier: 5, invest: 68 }    /* D4 The Dragon Gate */
];

/* the band each door is held to (win-rate points) */
function bandOf(info) {
  if (info.type === 'boss') return 4;
  if (info.di === 3) return 5;   /* Gate elites */
  return 8;                       /* districts 1 to 3 doors */
}

/* one headless fight: on-curve player vs the board behind monId, mirrors the
   route-sim fight construction exactly but forces the board by id */
function fightOnce(monId, info, gilded, seed) {
  const rng = mulberry((seed ^ 0x5f3759df) >>> 0);
  const persona = PERSONAS[seed % PERSONAS.length];
  const curve = CURVE[info.di];
  const player = buildBoard(curve.tier, curve.invest, rng, persona, {});
  /* the Debt Collector and both its aspects scale with held gold; measure at the
     sim's typical arrival purse of 5, as the doc's sample did */
  const gold = MONSTERS[monId].special === 'gold' ? 5 : 0;
  const built = buildFoe(monId, { threat: info.threat, hpFlat: 0, A: A, gold: gold, gilded: gilded,
    power: 1, board: player.board, nodeType: info.type, gate: info.di === 3, lantern: 0 });
  const playerItems = playerFightItems(player.board, {}, A, 1);
  const me = { nm: 'You', portrait: 'p-0', hp: built.php, items: playerItems, lifesteal: 0, regen: 0 };
  const F = createFight({ a: me, b: built.side, playerIs: 'a', seed: seed >>> 0,
    stormAt: built.def.stormAt ? built.def.stormAt * 1000 : stormAt(info.threat) });
  runHeadless(F);
  return (F.done ? F.winner : 'b') === 'a';
}

/* first-attempt win rate of a board over N seeds */
function winRate(monId, info, gilded) {
  let wins = 0;
  for (let i = 0; i < N; i++) {
    const seed = ((i * 2654435761) ^ 0x9e3779b9) >>> 0;
    if (fightOnce(monId, info, gilded, seed)) wins++;
  }
  return 100 * wins / N;
}

const pad = (s, n) => (String(s) + ' '.repeat(n)).slice(0, n);
const f1 = x => (x >= 0 ? '+' : '') + x.toFixed(1);
/* the three retuned aspects, called out in the readout */
const RETUNED = new Set(['rats_v2', 'kark_v1', 'matron_v1']);

console.log('== BOARD ASPECT DIFFICULTY TRACE (' + N + ' seeds each, competent-baseline policy) ==');
console.log('delta = aspect minus shipped, first-attempt win-rate points. BAND: doors +/-8, Gate elites +/-5, bosses +/-4.');
console.log('both PLAIN and GILDED are held to band; the gilded column is where the doc found the risk.\n');
console.log(pad('door', 24) + pad('band', 6) + pad('ship P', 8) + pad('ship G', 8) + pad('aspect', 22)
  + pad('var P', 8) + pad('var G', 8) + pad('dP', 8) + pad('dG', 8) + 'verdict');

let breaches = 0;
const bases = Object.keys(VARIANTS).filter(b => !only.length || only.includes(b));
/* order the readout by district then type for a readable pass */
bases.sort((a, b) => INFO[a].di - INFO[b].di || INFO[a].type.localeCompare(INFO[b].type) || a.localeCompare(b));

for (const base of bases) {
  const info = INFO[base];
  const band = bandOf(info);
  const shipP = winRate(base, info, false);
  const shipG = winRate(base, info, true);
  VARIANTS[base].forEach((vid, k) => {
    const varP = winRate(vid, info, false);
    const varG = winRate(vid, info, true);
    const dP = varP - shipP, dG = varG - shipG;
    const outP = Math.abs(dP) > band, outG = Math.abs(dG) > band;
    const breach = outP || outG;
    if (breach) breaches++;
    const tag = (RETUNED.has(vid) ? 'RETUNED ' : '') + (breach ? 'BREACH' + (outP ? ' P' : '') + (outG ? ' G' : '') : 'in band');
    console.log(pad(k === 0 ? (MONSTERS[base].n + ' (D' + (info.di + 1) + ' ' + info.type + ')') : '', 24)
      + pad(k === 0 ? ('+/-' + band) : '', 6)
      + pad(k === 0 ? shipP.toFixed(1) : '', 8) + pad(k === 0 ? shipG.toFixed(1) : '', 8)
      + pad(vid + ' ' + MONSTERS[vid].vn, 22)
      + pad(varP.toFixed(1), 8) + pad(varG.toFixed(1), 8) + pad(f1(dP), 8) + pad(f1(dG), 8) + tag);
  });
}

console.log('\n' + breaches + ' band breach' + (breaches === 1 ? '' : 'es') + ' across ' + (bases.length * 2) + ' aspects.');
console.log('The three retuned aspects (rats_v2, kark_v1, matron_v1) must read `in band` in both columns.');
process.exitCode = 0;
