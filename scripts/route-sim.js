/* Route balance harness for The Long Bazaar. Replaces the lobby-era balance-sim
   (which simulated the deleted 8-player lobby). Pure and headless: it drives the
   real route controller (route.js), the real fight engine (engine.js), and the
   real reward planner (route-rewards.js) across many seeds, so the readout is a
   faithful proxy for how runs actually go. No DOM, no ui.js. Everything is
   seeded, so two runs print the same numbers.

   Run:
     node scripts/route-sim.js            detailed baseline readout
     node scripts/route-sim.js ab         A/B tuning comparison table
     node scripts/route-sim.js 1200       set the seed count

   The player is modelled, not hand-played: a board is rebuilt at each market/camp
   from the gold invested so far (genRival scaled to that budget), tiering up when
   affordable. The policy is a competent-baseline "challenge everything, invest,
   retry a lost boss until Resolve runs out". It is deliberately simple; slip play,
   gild/vault micro, and enchants are not modelled, so read the numbers as a
   pacing/economy proxy, not a skill ceiling.

   Tuning knobs (cfg) let the harness A/B a candidate change WITHOUT touching the
   game: startResolve, bossLossAdj (Resolve added back per boss loss, so +2 models
   the boss-loss bonus 4 -> 2), treasureCash / negoCash (generic event gold). A
   guaranteed offensive opening offer is intentionally NOT modelled: the abstract
   genRival board already always has damage, so the sim cannot see that change. */
import {genMap} from '../src/map.js';
import {initRoute, transition, frontier, nodeOf, currentDistrict, BASE_GOLD} from '../src/route.js';
import {createFight, runHeadless, monsterSide, genRival, fightHP, stormAt, mulberry} from '../src/engine.js';
import {ITEMS, MONSTERS, DISTRICTS, PERSONAS, ANONE, COST, TIERCOST} from '../src/data.js';
import {planReward} from '../src/route-rewards.js';

const args = process.argv.slice(2);
const AB = args.includes('ab');
const RUNS = +(args.find(a => /^\d+$/.test(a)) || (AB ? 1200 : 600));
const A = ANONE;                       /* baseline: no anomaly, to isolate the route economy */

const DEFAULT_CFG = { startResolve: 40, bossLossAdj: 0, treasureCash: 6, negoCash: 6 };

/* ---- readout helpers ---- */
const sortNum = a => a.slice().sort((x, y) => x - y);
const med = a => { const s = sortNum(a); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const qtile = (a, p) => { const s = sortNum(a); return s.length ? s[Math.floor(s.length * p)] : 0; };
const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
const pct = x => (100 * x).toFixed(1) + '%';
const f1 = x => x.toFixed(1);
const pad = (s, n) => (String(s) + ' '.repeat(n)).slice(0, n);

/* ---- the player board model: genRival scaled to invested gold ---- */
function synthRound(invested) { return Math.max(1, Math.min(12, Math.round((invested - 2) / 6))); }
function buildBoard(invested, rng, persona) { return genRival(synthRound(invested), persona, rng, A); }

/* ---- one fight, headless ---- */
function simFight(board, node, gold, seed) {
  const M = MONSTERS[node.monId];
  const php = fightHP(node.threat, 0, A);
  const foe = monsterSide(node.monId, { gold: gold, round: node.threat, A: A, gilded: !!node.gilded, playerBoard: board.board, playerHp: php });
  const me = { nm: 'You', portrait: 'p-0', hp: php, items: board.items, lifesteal: 0, regen: 0 };
  const F = createFight({ a: me, b: foe, stormAt: M.stormAt ? M.stormAt * 1000 : stormAt(node.threat), seed: seed >>> 0, playerIs: 'a' });
  runHeadless(F);
  return { winner: F.winner, survTier: F.survTiers('b'), t: F.t / 1000, meHp: Math.max(0, F.a.hp), foeHp: Math.max(0, F.b.hp) };
}

/* ---- one full run under a tuning cfg ---- */
function simRun(seed, cfg) {
  const map = genMap(seed);
  const rng = mulberry((seed ^ 0x5f3759df) >>> 0);
  const persona = PERSONAS[seed % PERSONAS.length];
  let st = initRoute(seed);
  if (cfg.startResolve !== 40) { st.resolve = cfg.startResolve; st.resolveMax = cfg.startResolve; }
  let gold = 6, invested = 0, tier = 1;
  invested += 6; gold = 0;             /* opening stall: the six starting gold */
  let board = buildBoard(invested, rng, persona);
  const m = { fights: [], retries: 0, goldEarned: 0, goldSpent: 6, minResolve: st.resolveMax, tierMax: 1 };

  let guard = 0;
  while (st.phase !== 'won' && st.phase !== 'lost' && guard++ < 400) {
    if (st.resolve < m.minResolve) m.minResolve = st.resolve;
    if (st.phase === 'map') {
      const fr = frontier(st, map); if (!fr.length) break;
      const node = nodeOf(map, fr[0]);
      st = transition(st, map, { type: 'commit', nodeId: node.id, choice: 'challenge' }).state;
    } else if (st.phase === 'encounter') {
      const node = nodeOf(map, st.pendingId);
      const first = !st.attempts[node.id];
      const r = simFight(board, node, gold, st.fightSeed);
      m.fights.push({ threat: node.threat, band: node.district, type: node.type, won: r.winner === 'a', t: r.t, margin: r.winner === 'a' ? r.meHp : r.foeHp, first: first });
      const bossLoss = node.type === 'boss' && r.winner === 'b';
      st = transition(st, map, { type: 'fightResult', winner: r.winner, survTier: r.survTier }).state;
      if (cfg.bossLossAdj && bossLoss) {
        st.resolve = Math.min(st.resolveMax, st.resolve + cfg.bossLossAdj);
        if (st.phase === 'lost' && st.resolve > 0) st.phase = 'gateCamp';   /* the softer loss keeps them at the gate */
      }
    } else if (st.phase === 'reward') {
      const node = nodeOf(map, st.pendingId);
      const plan = planReward(MONSTERS[node.monId].bounty || {}, { baseGold: BASE_GOLD[node.type], gilded: !!node.gilded, enteredGold: gold, pocketed: 0, minGold: 0, board: board.board });
      gold += plan.gold; m.goldEarned += plan.gold;
      if (plan.items && plan.items.length) { plan.items.forEach(id => { invested += COST[ITEMS[id].size] || 2; }); board = buildBoard(invested, rng, persona); }
      st = transition(st, map, { type: 'settleReward' }).state;
    } else if (st.phase === 'market') {
      while (tier < 6 && gold >= TIERCOST[tier + 1]) { gold -= TIERCOST[tier + 1]; m.goldSpent += TIERCOST[tier + 1]; tier++; }
      const spend = Math.max(0, gold - 2); gold -= spend; invested += spend; m.goldSpent += spend;
      if (tier > m.tierMax) m.tierMax = tier;
      board = buildBoard(invested, rng, persona);
      st = transition(st, map, { type: 'leaveMarket' }).state;
    } else if (st.phase === 'event') {
      const node = nodeOf(map, st.pendingId); let delta = 0;
      if (node.type === 'treasure') { gold += cfg.treasureCash; m.goldEarned += cfg.treasureCash; }
      else if (node.type === 'rest') { delta = 8; }
      else if (node.type === 'shrine') { delta = 12; }
      else if (node.type === 'negotiation') { gold += cfg.negoCash; m.goldEarned += cfg.negoCash; }
      st = transition(st, map, { type: 'resolveEvent', resolveDelta: delta, outcome: node.type }).state;
    } else if (st.phase === 'gateCamp') {
      m.retries++;
      const spend = Math.max(0, gold - 1); gold -= spend; invested += spend; m.goldSpent += spend;
      board = buildBoard(invested, rng, persona);
      st = transition(st, map, { type: 'startBossRetry' }).state;
    } else break;
  }

  m.result = st.phase;
  m.district = currentDistrict(st, map);
  m.resolveEnd = st.resolve;
  m.path = st.path.length;
  m.goldHeld = gold;
  return m;
}

function runBatch(cfg) {
  const c = Object.assign({}, DEFAULT_CFG, cfg);
  const runs = [];
  for (let i = 0; i < RUNS; i++) runs.push(simRun(((i * 2654435761) ^ 0x9e3779b9) >>> 0, c));
  return runs;
}

/* first-attempt win rate for a band (optionally boss-only) */
function bandWin(runs, band, bossOnly) {
  const fs = runs.flatMap(r => r.fights).filter(f => f.band === band && f.first && (!bossOnly || f.type === 'boss'));
  return fs.length ? fs.filter(f => f.won).length / fs.length : 0;
}

/* ---- detailed single-config readout ---- */
function detailed(runs) {
  const wins = runs.filter(r => r.result === 'won');
  console.log('== ROUTE SIM (' + RUNS + ' seeds, competent-baseline policy, no anomaly) ==\n');
  console.log('COMPLETION');
  console.log('  clear rate            ' + pct(wins.length / RUNS));
  const byDist = [0, 0, 0, 0];
  runs.forEach(r => { if (r.result === 'lost') byDist[r.district]++; });
  console.log('  died in district      ' + DISTRICTS.map((d, i) => 'D' + d.id + ' ' + pct(byDist[i] / RUNS)).join('   '));
  console.log('  nodes visited         median ' + med(runs.map(r => r.path)) + '   (p10 ' + qtile(runs.map(r => r.path), 0.1) + ', p90 ' + qtile(runs.map(r => r.path), 0.9) + ')');
  console.log('  fights per run        median ' + med(runs.map(r => r.fights.length)));
  console.log('\nRESOLVE (40 start)');
  console.log('  final on a clear      median ' + med(wins.map(r => r.resolveEnd)) + '   min-ever median ' + med(wins.map(r => r.minResolve)));
  console.log('  at death              median ' + med(runs.filter(r => r.result === 'lost').map(r => r.minResolve)));
  console.log('\nGOLD');
  console.log('  earned  median ' + med(runs.map(r => r.goldEarned)) + '   spent median ' + med(runs.map(r => r.goldSpent)) + '   held-at-end median ' + med(runs.map(r => r.goldHeld)));
  console.log('  tier reached          median ' + med(runs.map(r => r.tierMax)));
  console.log('\nFIRST-ATTEMPT WIN RATE by Threat (district band)');
  for (const d of DISTRICTS) {
    const fs = runs.flatMap(r => r.fights).filter(f => f.band === d.id && f.first);
    const bosses = fs.filter(f => f.type === 'boss');
    console.log('  ' + pad(d.name, 16) + ' all ' + pad(pct(bandWin(runs, d.id)), 8) + ' boss ' + pad(bosses.length ? pct(bandWin(runs, d.id, true)) : '-', 8) + ' n=' + fs.length);
  }
  console.log('\nBOSS RETRIES + FIGHT LENGTH');
  console.log('  retries per run       median ' + med(runs.map(r => r.retries)) + '   mean ' + f1(mean(runs.map(r => r.retries))));
  const allF = runs.flatMap(r => r.fights);
  console.log('  fight seconds         median ' + med(allF.map(f => f.t)) + '   p90 ' + qtile(allF.map(f => f.t), 0.9));
  console.log('  win margin (your HP)  median ' + med(allF.filter(f => f.won).map(f => f.margin)));
}

/* ---- A/B tuning comparison ---- */
function abTable() {
  const variants = [
    { name: 'A baseline', cfg: {} },
    { name: 'B boss-loss 4->2', cfg: { bossLossAdj: 2 } },
    { name: 'C start 36 Resolve', cfg: { startResolve: 36 } },
    { name: 'D event cash 6->4', cfg: { treasureCash: 4, negoCash: 4 } },
    { name: 'E = B+D (hold 40)', cfg: { bossLossAdj: 2, treasureCash: 4, negoCash: 4 } },
    { name: 'F = B+C+D', cfg: { bossLossAdj: 2, startResolve: 36, treasureCash: 4, negoCash: 4 } }
  ];
  console.log('== ROUTE SIM A/B (' + RUNS + ' seeds each, no anomaly) ==');
  console.log('a guaranteed offensive opening offer is not modelled (see header)\n');
  console.log(pad('variant', 20) + pad('clear', 8) + pad('D4-death', 10) + pad('D1boss', 9) + pad('D4all', 8) + pad('tier', 6) + pad('earned', 8) + pad('held', 6) + pad('retries', 8));
  for (const v of variants) {
    const runs = runBatch(v.cfg);
    const clr = runs.filter(r => r.result === 'won').length / RUNS;
    const d4death = runs.filter(r => r.result === 'lost' && r.district === 3).length / RUNS;
    console.log(pad(v.name, 20)
      + pad(pct(clr), 8)
      + pad(pct(d4death), 10)
      + pad(pct(bandWin(runs, 4, true)), 9)
      + pad(pct(bandWin(runs, 4)), 8)
      + pad(med(runs.map(r => r.tierMax)), 6)
      + pad(med(runs.map(r => r.goldEarned)), 8)
      + pad(med(runs.map(r => r.goldHeld)), 6)
      + pad(f1(mean(runs.map(r => r.retries))), 8));
  }
  console.log('\nD4-death = share of runs that end in the Dragon Gate. D1boss/D4all = first-attempt');
  console.log('win rate. tier/earned/held = medians. retries = mean per run. Lower D4-death and a');
  console.log('higher, flatter boss win curve is the goal without letting clear rate run away.');
}

if (AB) abTable(); else detailed(runBatch({}));
