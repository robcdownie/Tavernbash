/* Route balance harness for The Long Bazaar. Replaces the lobby-era balance-sim
   (which simulated the deleted 8-player lobby). Pure and headless: it drives the
   real route controller (route.js), the real fight engine (engine.js), and the
   real reward planner (route-rewards.js) across many seeds, so the readout is a
   faithful proxy for how runs actually go. No DOM, no ui.js. Everything is
   seeded, so two runs print the same numbers.

   Run: node scripts/route-sim.js  [runs]

   The player is modelled, not hand-played: a board is rebuilt at each market/camp
   from the gold invested so far (genRival scaled to that budget), tiering up when
   affordable. The policy is a competent-baseline "challenge everything, invest,
   retry a lost boss until Resolve runs out". It is deliberately simple; slip play,
   gild/vault micro, and enchants are not modelled, so read the numbers as a
   pacing/economy proxy, not a skill ceiling. */
import {genMap} from '../src/map.js';
import {initRoute, transition, frontier, nodeOf, lossDamage, currentDistrict, BASE_GOLD} from '../src/route.js';
import {createFight, runHeadless, monsterSide, genRival, fightHP, stormAt, mulberry} from '../src/engine.js';
import {ITEMS, MONSTERS, DISTRICTS, PERSONAS, ANONE, COST, TIERCOST} from '../src/data.js';
import {planReward} from '../src/route-rewards.js';

const RUNS = +(process.argv[2] || 600);
const A = ANONE;                       /* baseline: no anomaly, to isolate the route economy */

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

/* ---- one full run ---- */
function simRun(seed) {
  const map = genMap(seed);
  const rng = mulberry((seed ^ 0x5f3759df) >>> 0);
  const persona = PERSONAS[seed % PERSONAS.length];
  let st = initRoute(seed);
  let gold = 6, invested = 0, tier = 1;
  /* opening stall: spend the six starting gold before the first door */
  invested += 6; gold = 0;
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
      st = transition(st, map, { type: 'fightResult', winner: r.winner, survTier: r.survTier }).state;
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
      if (node.type === 'treasure') { gold += 6; m.goldEarned += 6; }
      else if (node.type === 'rest') { delta = 8; }
      else if (node.type === 'shrine') { delta = 12; }
      else if (node.type === 'negotiation') { gold += 6; m.goldEarned += 6; }
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
  m.resolveMax = st.resolveMax;
  m.path = st.path.length;
  m.goldHeld = gold;
  m.invested = invested;
  return m;
}

/* ---- run the batch ---- */
const runs = [];
for (let i = 0; i < RUNS; i++) runs.push(simRun(((i * 2654435761) ^ 0x9e3779b9) >>> 0));

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
  const w = fs.filter(f => f.won).length;
  const bosses = fs.filter(f => f.type === 'boss');
  const bw = bosses.filter(f => f.won).length;
  console.log('  ' + pad(d.name, 16) + ' all ' + pad(pct(fs.length ? w / fs.length : 0), 8) + ' boss ' + pad(bosses.length ? pct(bw / bosses.length) : '-', 8) + ' n=' + fs.length);
}

console.log('\nBOSS RETRIES + FIGHT LENGTH');
console.log('  retries per run       median ' + med(runs.map(r => r.retries)) + '   mean ' + f1(mean(runs.map(r => r.retries))));
const allF = runs.flatMap(r => r.fights);
console.log('  fight seconds         median ' + med(allF.map(f => f.t)) + '   p90 ' + qtile(allF.map(f => f.t), 0.9));
console.log('  win margin (your HP)  median ' + med(allF.filter(f => f.won).map(f => f.margin)));
