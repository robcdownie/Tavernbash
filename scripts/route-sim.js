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

   The player is modelled, not hand-played: a FUSION-AWARE board is rebuilt at each
   market/camp from the gold invested so far - it commits to a few ware lines and
   spends the budget the way fusing does (Silver/Gold/Diamond), matching real games
   where people win at tier 1-5 with fused boards, not by maxing tier. FRESH fight
   items are built every battle (playerFightItems), exactly as the game does, so
   combat never carries damage/ammo/timers between fights. The policy walks a
   seeded-random frontier node each step (so it samples both Dragon Gate elites
   and varied lanes), challenges everything, invests, and at a lost boss gate uses
   Mend / Last Reserve then retries until Resolve runs out. It is a competent
   baseline, not a skill ceiling: slip play, gild/vault micro, enchants, and
   matchup-aware routing are not modelled, so read it as a pacing/economy proxy.

   Tuning knobs (cfg) let the harness A/B a candidate change WITHOUT touching the
   game: startResolve, bossLossAdj (Resolve added back per boss loss, so +2 models
   the boss-loss bonus 4 -> 2), treasureCash / negoCash (generic event gold). A
   guaranteed offensive opening offer is intentionally NOT modelled: the abstract
   genRival board already always has damage, so the sim cannot see that change. */
import {genMap} from '../src/map.js';
import {initRoute, transition, frontier, nodeOf, currentDistrict, BASE_GOLD} from '../src/route.js';
import {createFight, runHeadless, monsterSide, playerFightItems, makeItem, usedCells, gateOK, fuseScan, fightHP, stormAt, mulberry} from '../src/engine.js';
import {ITEMS, MONSTERS, DISTRICTS, PERSONAS, ANONE, COST, TIERCOST, RSTAT} from '../src/data.js';
import {planReward} from '../src/route-rewards.js';

const args = process.argv.slice(2);
const AB = args.includes('ab');
const RUNS = +(args.find(a => /^\d+$/.test(a)) || (AB ? 1200 : 600));
const A = ANONE;                       /* baseline: no anomaly, to isolate the route economy */

const DEFAULT_CFG = { startResolve: 40, bossLossAdj: 0, treasureCash: 6, negoCash: 6 };
/* the district bosses and the two Dragon Gate elites, reported by name */
const KEYMONS = [['matron', 'Matron (D1)'], ['collector', 'Collector (D2)'], ['ifrit', 'Ifrit (D3)'],
                 ['azhdaha', 'Azhdaha (D4 elite)'], ['auctioneer', 'Auctioneer (D4 elite)'], ['vizier', 'Vizier (D4)']];

/* ---- readout helpers ---- */
const sortNum = a => a.slice().sort((x, y) => x - y);
const med = a => { const s = sortNum(a); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const qtile = (a, p) => { const s = sortNum(a); return s.length ? s[Math.floor(s.length * p)] : 0; };
const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
const pct = x => (100 * x).toFixed(1) + '%';
const f1 = x => x.toFixed(1);
const pad = (s, n) => (String(s) + ' '.repeat(n)).slice(0, n);

/* ---- the player board model: FUSION-AWARE. Slots and the item pool come from
   the simulated tier (4+tier slots, gateOK gating); the budget is gold invested in
   the board. It buys wares one at a time (weighted toward the persona's archetype
   and, crucially, toward wares it already owns so triples complete) and runs the
   real fuseScan after each buy, so budget concentrates into Silver/Gold/Diamond
   exactly as real play does, instead of spreading thin across bronze slots. Real
   games showed fusion, not tier, is the economy: people win at tier 1-5 with fused
   boards, so this replaces the old genRival stand-in that maxed tier and never
   fused. ---- */
/* bronze copies needed to hold a ware at rarity 0..3 (3 bronze -> silver, 2 silver
   -> gold, 2 gold -> diamond, per the engine's fuseNeed) */
const COPIES_FOR = [1, 3, 6, 12];
function buildBoard(tier, budget, rng, persona) {
  const slots = 4 + tier;
  const pool = Object.keys(ITEMS).filter(id => gateOK(ITEMS[id].tier, tier) && !ITEMS[id].unique && !ITEMS[id].inc);
  if (!pool.length) return { items: [], board: [] };
  /* commit to a few LINES (a real build), persona-weighted, cheap size-1 wares
     favoured because they fuse readily. Then spend the budget the way fusing spends
     it: seed each line at Bronze, then greedily buy the cheapest rarity upgrade
     (fuseNeed copies), so gold concentrates into Silver/Gold/Diamond rather than a
     wide bronze board. makeItem(id, rarity) is the fused result, so no fuseScan. */
  const wOf = id => { const d = ITEMS[id]; let w = d.tier === 1 ? 8 : (d.tier === 2 ? 7 : 6); if (d.cat === persona.arch) w *= 3.5; if (d.cat === 'util' && persona.arch !== 'util') w *= 0.3; if (d.size === 1) w *= 1.8; return w; };
  const nLines = Math.min(slots, Math.max(3, 3 + Math.floor(tier / 2)));
  const avail = pool.slice(), lines = [];
  for (let k = 0; k < nLines && avail.length; k++) {
    let tot = 0; const ws = avail.map(id => { const w = wOf(id); tot += w; return w; });
    let roll = rng() * tot, idx = 0;
    for (let i = 0; i < avail.length; i++) { roll -= ws[i]; if (roll <= 0) { idx = i; break; } }
    lines.push(avail[idx]); avail.splice(idx, 1);
  }
  const board = []; let b = budget;
  for (const id of lines) { const sz = ITEMS[id].size; if (usedCells(board) + sz <= slots && b >= COST[sz]) { board.push(makeItem(id, 0)); b -= COST[sz]; } }
  let guard = 0;
  while (guard++ < 300) {
    let best = null, bestCost = Infinity;
    for (const w of board) { if (w.rarity >= 3) continue; const c = (COPIES_FOR[w.rarity + 1] - COPIES_FOR[w.rarity]) * COST[w.size]; if (c <= b && c < bestCost) { bestCost = c; best = w; } }
    if (!best) break;
    best.rarity++; b -= bestCost;
  }
  return { items: playerFightItems(board, {}, A, 1), board: board };
}
/* the gold a tier-up costs under a cfg (T6 tunable, plus an all-tier nudge) */
function tierCost(nextTier, cfg) { return (nextTier === 6 ? (cfg.tier6Cost || TIERCOST[6]) : TIERCOST[nextTier]) + (cfg.tierCostAdj || 0); }
/* how rich a board ended up: the best rarity present (0 bronze .. 3 diamond) */
function topRarity(board) { return board.board.reduce((m, w) => Math.max(m, w.rarity), 0); }

/* ---- one fight, headless, with FRESH fight items (as the game rebuilds them) ---- */
function simFight(board, node, gold, seed) {
  const M = MONSTERS[node.monId];
  const php = fightHP(node.threat, 0, A);
  const foe = monsterSide(node.monId, { gold: gold, round: node.threat, A: A, gilded: !!node.gilded, playerBoard: board.board, playerHp: php });
  const me = { nm: 'You', portrait: 'p-0', hp: php, items: playerFightItems(board.board, {}, A, 1), lifesteal: 0, regen: 0 };
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
  let gold = 6, invested = 0, tier = 1, lastReserveUsed = false, mendGate = null, mendUsed = false;
  invested += 6; gold = 0;             /* opening stall: the six starting gold */
  let board = buildBoard(tier, invested, rng, persona);
  const m = { fights: [], retries: 0, goldEarned: 0, goldSpent: 6, minResolve: st.resolveMax, tierMax: 1 };

  let guard = 0;
  while (st.phase !== 'won' && st.phase !== 'lost' && guard++ < 400) {
    if (st.resolve < m.minResolve) m.minResolve = st.resolve;
    if (st.phase === 'map') {
      const fr = frontier(st, map); if (!fr.length) break;
      const node = nodeOf(map, fr[Math.floor(rng() * fr.length)]);   /* seeded-random path: samples both D4 elites and varied lanes */
      st = transition(st, map, { type: 'commit', nodeId: node.id, choice: 'challenge' }).state;
    } else if (st.phase === 'encounter') {
      const node = nodeOf(map, st.pendingId);
      const first = !st.attempts[node.id];
      const r = simFight(board, node, gold, st.fightSeed);
      m.fights.push({ threat: node.threat, band: node.district, type: node.type, mon: node.monId, won: r.winner === 'a', t: r.t, margin: r.winner === 'a' ? r.meHp : r.foeHp, first: first });
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
      if (plan.items && plan.items.length) { plan.items.forEach(id => { invested += COST[ITEMS[id].size] || 2; }); board = buildBoard(tier, invested, rng, persona); }
      st = transition(st, map, { type: 'settleReward' }).state;
    } else if (st.phase === 'market') {
      /* fusion-first: tier up only toward a district-appropriate cap (players win
         at tier 1-5, not by maxing), reserving gold so the board keeps fusing */
      const cap = Math.min(6, currentDistrict(st, map) + 2);
      while (tier < cap && gold >= tierCost(tier + 1, cfg) + 2) { const tc = tierCost(tier + 1, cfg); gold -= tc; m.goldSpent += tc; tier++; }
      const spend = Math.max(0, gold - 2); gold -= spend; invested += spend; m.goldSpent += spend;
      if (tier > m.tierMax) m.tierMax = tier;
      board = buildBoard(tier, invested, rng, persona);
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
      if (mendGate !== st.pendingId) { mendGate = st.pendingId; mendUsed = false; }
      /* Last Reserve when a loss could be fatal (once per run); Mend when it helps */
      if (!lastReserveUsed && st.resolve > 6 && st.resolve <= 16) { st.resolve -= 6; st.resolveMax -= 6; invested += 6; lastReserveUsed = true; }
      if (!mendUsed && gold >= 3 && st.resolve < st.resolveMax) { gold -= 3; m.goldSpent += 3; st.resolve = Math.min(st.resolveMax, st.resolve + 4); mendUsed = true; }
      const spend = Math.max(0, gold - 1); gold -= spend; invested += spend; m.goldSpent += spend;
      board = buildBoard(tier, invested, rng, persona);
      st = transition(st, map, { type: 'startBossRetry' }).state;
    } else break;
  }

  m.result = st.phase;
  m.district = currentDistrict(st, map);
  m.resolveEnd = st.resolve;
  m.path = st.path.length;
  m.goldHeld = gold;
  m.tierEnd = tier;
  m.topRarity = topRarity(board);
  return m;
}
const RARITY_NAME = ['Bronze', 'Silver', 'Gold', 'Diamond'];

function runBatch(cfg) {
  const c = Object.assign({}, DEFAULT_CFG, cfg);
  const runs = [];
  for (let i = 0; i < RUNS; i++) runs.push(simRun(((i * 2654435761) ^ 0x9e3779b9) >>> 0, c));
  return runs;
}

/* first-attempt win rate for a band, or for a named monster */
function bandWin(runs, band) {
  const fs = runs.flatMap(r => r.fights).filter(f => f.band === band && f.first);
  return fs.length ? fs.filter(f => f.won).length / fs.length : 0;
}
function keyWin(runs, mon) {
  const fs = runs.flatMap(r => r.fights).filter(f => f.mon === mon && f.first);
  return { rate: fs.length ? fs.filter(f => f.won).length / fs.length : 0, n: fs.length };
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
  console.log('  nodes visited         median ' + med(runs.map(r => r.path)) + '   fights/run median ' + med(runs.map(r => r.fights.length)));
  console.log('\nRESOLVE (' + med(runs.map(r => r.resolveEnd + 0)) + ' end on clears; 40 start)');
  console.log('  final on a clear      median ' + med(wins.map(r => r.resolveEnd)) + '   min-ever median ' + med(wins.map(r => r.minResolve)));
  console.log('  at death              median ' + med(runs.filter(r => r.result === 'lost').map(r => r.minResolve)));
  console.log('\nGOLD + TIER + FUSION');
  console.log('  earned median ' + med(runs.map(r => r.goldEarned)) + '   spent median ' + med(runs.map(r => r.goldSpent)) + '   held median ' + med(runs.map(r => r.goldHeld)));
  console.log('  end tier median ' + med(runs.map(r => r.tierEnd)) + '   distribution ' + [1, 2, 3, 4, 5, 6].map(t => 't' + t + ' ' + pct(runs.filter(r => r.tierEnd === t).length / RUNS)).join(' '));
  console.log('  best rarity on the final board ' + RARITY_NAME.map((n, r) => n + ' ' + pct(runs.filter(x => x.topRarity === r).length / RUNS)).join('  '));
  console.log('\nFIRST-ATTEMPT WIN RATE by band');
  for (const d of DISTRICTS) console.log('  ' + pad(d.name, 16) + pct(bandWin(runs, d.id)));
  console.log('\nFIRST-ATTEMPT WIN RATE by key encounter');
  for (const [mon, label] of KEYMONS) { const k = keyWin(runs, mon); console.log('  ' + pad(label, 22) + pad(pct(k.rate), 9) + 'n=' + k.n); }
  console.log('\nRETRIES + FIGHTS');
  console.log('  boss retries/run      median ' + med(runs.map(r => r.retries)) + '   mean ' + f1(mean(runs.map(r => r.retries))));
  const allF = runs.flatMap(r => r.fights);
  console.log('  fight seconds         median ' + med(allF.map(f => f.t)) + '   p90 ' + qtile(allF.map(f => f.t), 0.9) + '   win margin (HP) median ' + med(allF.filter(f => f.won).map(f => f.margin)));
}

/* ---- A/B tuning comparison ---- */
function abTable() {
  /* baseline is the current game, which already ships the boss-loss 4->2 change
     (0.68.20). bossLossAdj:2 here therefore models a FURTHER softening to 0. */
  const variants = [
    { name: 'A current (incl B)', cfg: {} },
    { name: 'boss loss 2->0 more', cfg: { bossLossAdj: 2 } },
    { name: 'C start 36 Resolve', cfg: { startResolve: 36 } },
    { name: 'D event cash 6->4', cfg: { treasureCash: 4, negoCash: 4 } }
  ];
  console.log('== ROUTE SIM A/B (' + RUNS + ' seeds each, no anomaly, fresh items, sampled paths) ==\n');
  console.log(pad('variant', 20) + pad('clear', 8) + pad('D4-death', 10) + pad('Matron', 8) + pad('Azhdaha', 9) + pad('Vizier', 8) + pad('tier', 6) + pad('retries', 8));
  for (const v of variants) {
    const runs = runBatch(v.cfg);
    const clr = runs.filter(r => r.result === 'won').length / RUNS;
    const d4death = runs.filter(r => r.result === 'lost' && r.district === 3).length / RUNS;
    console.log(pad(v.name, 20)
      + pad(pct(clr), 8) + pad(pct(d4death), 10)
      + pad(pct(keyWin(runs, 'matron').rate), 8)
      + pad(pct(keyWin(runs, 'azhdaha').rate), 9)
      + pad(pct(keyWin(runs, 'vizier').rate), 8)
      + pad(med(runs.map(r => r.tierMax)), 6)
      + pad(f1(mean(runs.map(r => r.retries))), 8));
  }
  console.log('\nD4-death = share of runs ending in the Dragon Gate. Matron/Azhdaha/Vizier = first-attempt');
  console.log('win rate. Both D4 elites are now sampled, so Azhdaha and Vizier are reported apart.');
}

if (AB) abTable(); else detailed(runBatch({}));
