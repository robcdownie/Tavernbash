/* Route balance harness for The Long Bazaar. Replaces the lobby-era balance-sim
   (which simulated the deleted 8-player lobby). Pure and headless: it drives the
   real route controller (route.js), the real fight engine (engine.js), and the
   real reward planner (route-rewards.js) across many seeds, so the readout is a
   faithful proxy for how runs actually go. No DOM, no ui.js. Everything is
   seeded, so two runs print the same numbers.

   Run:
     node scripts/route-sim.js            detailed baseline readout
     node scripts/route-sim.js ab         A/B tuning comparison table
     node scripts/route-sim.js long       seven-district Long readout
     node scripts/route-sim.js long ab 50 Long A/B with 50 seeds per variant
     node scripts/route-sim.js 1200       set the seed count
     node scripts/route-sim.js hero=kiln omen=moon   one hero-Omen cell, detailed
     node scripts/route-sim.js matrix 150 every hero x Omen x route clear table

   HERO AND OMEN MODELLING (sim-hero-omen branch). A cell is (hero, Omen,
   route). What is modelled faithfully: fight-side rules (the Omen A object
   merged with the hero mod flags rides side.rules exactly as ui.js line 1249
   builds them), fightHP hpMul via buildFoe, storm offsets through
   composeLantern and adjustedStormAt with the Gate contract, board slots
   (slotCountFlat, sizeCostOverride), ware copy cost (shopItemCostFlat), the
   hero shop pull (tag-weighted buys, x2.2 as the real shop weighting), and
   the Kilnkeeper's free starting Torch. What is NOT modelled, honestly:
   shopN, reroll pricing and bans, the frost, and sell values (the abstract
   budget policy has no shop roll to apply them to); goldMul (it scales
   victory income from income wares, which the policy does not field);
   the Moneylender's credit ledger (no debt state in the budget model).
   Cells whose Omen lever is unmodelled read as their no-Omen baseline;
   the matrix prints which columns are fight-live vs economy-only.

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
import {initRoute, transition, frontier, nodeOf, currentDistrict, BASE_GOLD, isGateDistrict} from '../src/route.js';
import {createFight, runHeadless, monsterSide, playerFightItems, makeItem, usedCells, gateOK, fightHP, stormAt, mulberry} from '../src/engine.js';
import {buildFoe} from '../src/encounter.js';
import {adjustedStormAt, composeLantern} from '../src/anomaly-rules.js';
import {ITEMS, MONSTERS, DISTRICTS, PERSONAS, HEROES, ANOMALIES, ANONE, COST, TIERCOST} from '../src/data.js';
import {boardSlotCount, boardUsedCells, wareSlotCost, warePurchaseCost} from '../src/anomaly-rules.js';
import {planReward} from '../src/route-rewards.js';
import {beginCombatTally, recordCombatDiagnostic} from '../src/route-metrics.js';
import {midpointTreasureOptions, MIDPOINT_FALLBACK_GOLD} from '../src/route-runtime.js';
import {pathToFileURL} from 'node:url';

export function parseSimArgs(argv){
  const args=(argv||[]).map(String),ab=args.includes('ab'),matrix=args.includes('matrix');
  const kv=function(key){const hit=args.find(a=>a.startsWith(key+'='));return hit?hit.slice(key.length+1):null;};
  return {ab:ab,matrix:matrix,mode:args.includes('long')?'long':'quick',
    runs:+(args.find(a=>/^\d+$/.test(a))||(matrix?150:(ab?1200:600))),
    heroId:kv('hero'),omenId:kv('omen')};
}

/* the anomaly A object for a cell: the plain baseline, or the Omen's m
   merged over ANONE exactly as ui.js line 1145 builds the run's G.A */
export function omenA(omenId){
  if(!omenId||omenId==='none')return ANONE;
  const om=ANOMALIES.find(a=>a.id===omenId);
  if(!om)throw new Error('unknown omen: '+omenId);
  return Object.assign({},ANONE,om.m);
}
export function heroOfId(heroId){
  if(!heroId||heroId==='none')return null;
  const h=HEROES.find(x=>x.id===heroId);
  if(!h)throw new Error('unknown hero: '+heroId);
  return h;
}

const DEFAULT_CFG = { startResolve: null, bossLossAdj: 0, treasureCash: 6, negoCash: 6, rewardGoldAdj: 0,
  reprisePower:1, reprisePowers:null, lantern: 0, heroId: null, omenId: 'none' };
const ROUTE_GUARD=400;
const DAMAGE_CHANNELS=['weapon','poison','burn','hook','other'];

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
function buildBoard(tier, budget, rng, persona, hero, A) {
  A = A || ANONE;
  const slots = boardSlotCount(tier, A);
  const pool = Object.keys(ITEMS).filter(id => gateOK(ITEMS[id].tier, tier) && !ITEMS[id].unique && !ITEMS[id].inc);
  if (!pool.length) return { items: [], board: [] };
  /* the hero's pull replaces the persona archetype: the real shop weights the
     hero tag x2.2 (ui.js), where the persona proxy used 3.5 */
  const arch = hero ? hero.tag : persona.arch;
  const archW = hero ? 2.2 : 3.5;
  /* commit to a few LINES (a real build), persona-weighted, cheap size-1 wares
     favoured because they fuse readily. Then spend the budget the way fusing spends
     it: seed each line at Bronze, then greedily buy the cheapest rarity upgrade
     (fuseNeed copies), so gold concentrates into Silver/Gold/Diamond rather than a
     wide bronze board. makeItem(id, rarity) is the fused result, so no fuseScan. */
  const wOf = id => { const d = ITEMS[id]; let w = d.tier === 1 ? 8 : (d.tier === 2 ? 7 : 6); if (d.cat === arch) w *= archW; if (d.cat === 'util' && arch !== 'util') w *= 0.3; if (d.size === 1) w *= 1.8; return w; };
  const nLines = Math.min(slots, Math.max(3, 3 + Math.floor(tier / 2)));
  const avail = pool.filter(id => !(hero && id === hero.start)), lines = [];
  for (let k = 0; k < nLines && avail.length; k++) {
    let tot = 0; const ws = avail.map(id => { const w = wOf(id); tot += w; return w; });
    let roll = rng() * tot, idx = 0;
    for (let i = 0; i < avail.length; i++) { roll -= ws[i]; if (roll <= 0) { idx = i; break; } }
    lines.push(avail[idx]); avail.splice(idx, 1);
  }
  const board = []; let b = budget;
  /* the hero's starting ware arrives free, exactly as a run opens */
  if (hero && hero.start && ITEMS[hero.start]) board.push(makeItem(hero.start, 0));
  for (const id of lines) { const sz = ITEMS[id].size; const c = warePurchaseCost(sz, false, A); if (boardUsedCells(board, A) + wareSlotCost(sz, A) <= slots && b >= c) { board.push(makeItem(id, 0)); b -= c; } }
  let guard = 0;
  while (guard++ < 300) {
    let best = null, bestCost = Infinity;
    for (const w of board) { if (w.rarity >= 3) continue; const c = (COPIES_FOR[w.rarity + 1] - COPIES_FOR[w.rarity]) * warePurchaseCost(w.size, false, A); if (c <= b && c < bestCost) { bestCost = c; best = w; } }
    if (!best) break;
    best.rarity++; b -= bestCost;
  }
  return { items: playerFightItems(board, {}, A, 1), board: board };
}
/* the gold a tier-up costs under a cfg (T6 tunable, plus an all-tier nudge) */
function tierCost(nextTier, cfg) { return (nextTier === 6 ? (cfg.tier6Cost || TIERCOST[6]) : TIERCOST[nextTier]) + (cfg.tierCostAdj || 0); }
/* how rich a board ended up: the best rarity present (0 bronze .. 3 diamond) */
function topRarity(board) { return board.board.reduce((m, w) => Math.max(m, w.rarity), 0); }

/* The policy records the real deterministic offer, then takes its first card.
   Treasure uniques stay outside buildBoard and combat attribution: until the
   harness can model their hooks faithfully, acquisition is evidence, not fake
   generic combat power. */
export function simMidpointTreasure(seed,owned){
  const held=Array.from(owned||[]).map(function(id){return {id:id};});
  const offered=midpointTreasureOptions({seed:seed>>>0,economy:{board:held,vault:[],shop:[]}});
  return {offered:offered,selected:offered[0]||null,
    fallbackGold:offered.length?0:MIDPOINT_FALLBACK_GOLD,contribution:'abstracted'};
}

/* ---- one fight, headless, with FRESH fight items (as the game rebuilds them) ---- */
function applyEnemyPower(side,power){
  if(!(power>1))return side;
  side.hp=Math.round(side.hp*power);side.regen=Math.round((side.regen||0)*power);
  side.items.forEach(function(it){
    it.integ=Math.round(it.integ*power);it.maxI=it.integ;
    for(const k of ['dmg','poison','burn','shield','heal'])if(it.fx&&it.fx[k])it.fx[k]=Math.round(it.fx[k]*power);
    if(it.printedDmg)it.printedDmg=Math.round(it.printedDmg*power);
  });
  return side;
}
function simFight(board, node, gold, seed, cfg, mode, gate, cell) {
  const M = MONSTERS[node.monId];
  const A = cell.A, hero = cell.hero;
  /* the shared encounter builder: the sim sees the same L1 door power, the
     same gilding, and the same mirror and Gate exemptions as the game */
  const built = buildFoe(node.monId, { threat: node.threat, hpFlat: 0, A: A, gold: gold,
    gilded: node.gilded, power: node.power, board: board.board,
    nodeType: node.type, gate: gate, lantern: cfg.lantern || 0 });
  const php = built.php, foe = built.side;
  if(mode==='long'&&node.district>=4){
    const power=cfg.reprisePowers&&cfg.reprisePowers[node.district]||cfg.reprisePower||1;
    applyEnemyPower(foe,power);
  }
  const playerItems=playerFightItems(board.board, {}, A, 1);
  /* the player side carries the Omen A merged with the hero mod flags,
     byte-for-byte the ui.js construction (startRouteFight) */
  const me = { nm: 'You', portrait: 'p-0', hp: php, items: playerItems, lifesteal: 0, regen: 0,
    rules: Object.assign({}, A, hero ? hero.mod : {}) };
  const metricBoard=board.board.map(function(w){return Object.assign({iid:w.uid},w);});
  const tally=beginCombatTally({district:node.district,nodeId:node.id,monId:node.monId},metricBoard,playerItems,foe.items);
  /* L4 through the composed offsets and the single existing floor; a Gate
     fight takes the plain Omen per the Gate contract */
  const stormA = gate ? A : composeLantern(cell.omenId, A, cfg.lantern || 0);
  const F = createFight({ a: me, b: foe, stormAt: adjustedStormAt(M.stormAt ? M.stormAt * 1000 : stormAt(node.threat), stormA), seed: seed >>> 0, playerIs: 'a',
    diagnosticTap:function(fact){recordCombatDiagnostic(tally,fact);} });
  runHeadless(F);
  return { winner: F.done?F.winner:'b', survTier: F.survTiers('b'), t: F.t / 1000,
    meHp: Math.max(0, F.a.hp), foeHp: Math.max(0, F.b.hp),timeout:!F.done,
    guardTrips:F.diagnostics.guardTrips,guardCounts:Object.assign({},F.diagnostics.guardCounts),
    pendingActions:F.diagnostics.pendingActions||0,
    wares:Object.keys(tally.rows).map(function(k){return tally.rows[k];}) };
}

/* ---- one full run under a tuning cfg ---- */
export function simRun(seed, cfg, mode) {
  mode=mode||'quick';
  const lantern = cfg.lantern || 0;
  const cell = { omenId: cfg.omenId || 'none', A: omenA(cfg.omenId), hero: heroOfId(cfg.heroId) };
  const map = genMap(seed,mode,lantern);
  const rng = mulberry((seed ^ 0x5f3759df) >>> 0);
  const persona = PERSONAS[seed % PERSONAS.length];
  let st = initRoute(seed,mode,lantern);
  if (cfg.startResolve!=null&&cfg.startResolve!==st.resolveMax) { st.resolve = cfg.startResolve; st.resolveMax = cfg.startResolve; }
  /* L2: the same shared delta the event cards read */
  const evFlat = (composeLantern(cell.omenId, cell.A, lantern).directEventGoldFlat) || 0;
  const gateOf = function(node){ return isGateDistrict(map.districts.filter(function(d){return d.id===node.district;})[0]); };
  let gold = 6, invested = 0, tier = 1, lastReserveUsed = false, mendGate = null, mendUsed = false;
  const ownedUniques=new Set();
  invested += 6; gold = 0;             /* opening stall: the six starting gold */
  const rebuild = function(){ return buildBoard(tier, invested, rng, persona, cell.hero, cell.A); };
  let board = rebuild();
  const m = { mode:mode,hero:cell.hero?cell.hero.id:'none',omen:cell.omenId,
    districtCount:map.districts.length,fights: [], retries: 0, goldEarned: 0, goldSpent: 6,
    resolveStart:st.resolveMax,minResolve: st.resolveMax, tierMax: 1,guardTrips:0,guardCounts:{},fightTimeouts:0,
    combatPendingActions:0,routeGuardExits:0,pendingActions:[],duplicateUniqueCash:0,
    midpointTreasure:{reached:false,offered:[],selected:null,fallbackGold:0,contribution:'abstracted'} };

  let guard = 0;
  while (st.phase !== 'won' && st.phase !== 'lost' && guard<ROUTE_GUARD) {
    guard++;
    if (st.resolve < m.minResolve) m.minResolve = st.resolve;
    if (st.phase === 'map') {
      const fr = frontier(st, map); if (!fr.length) {m.pendingActions.push('empty_frontier');break;}
      const node = nodeOf(map, fr[Math.floor(rng() * fr.length)]);   /* seeded-random path: samples both D4 elites and varied lanes */
      st = transition(st, map, { type: 'commit', nodeId: node.id, choice: 'challenge' }).state;
    } else if (st.phase === 'encounter') {
      const node = nodeOf(map, st.pendingId);
      const first = !st.attempts[node.id];
      const r = simFight(board, node, gold, st.fightSeed,cfg,mode,gateOf(node),cell);
      m.fights.push({ threat: node.threat, band: node.district, type: node.type, mon: node.monId,
        won: r.winner === 'a', t: r.t, margin: r.winner === 'a' ? r.meHp : r.foeHp, first: first,
        wares:r.wares,guardTrips:r.guardTrips,timeout:r.timeout });
      m.guardTrips+=r.guardTrips;if(r.timeout)m.fightTimeouts++;
      m.combatPendingActions+=r.pendingActions;
      Object.keys(r.guardCounts).forEach(function(k){m.guardCounts[k]=(m.guardCounts[k]||0)+r.guardCounts[k];});
      const bossLoss = node.type === 'boss' && r.winner === 'b';
      st = transition(st, map, { type: 'fightResult', winner: r.winner, survTier: r.survTier }).state;
      if (cfg.bossLossAdj && bossLoss) {
        st.resolve = Math.min(st.resolveMax, st.resolve + cfg.bossLossAdj);
        if (st.phase === 'lost' && st.resolve > 0) st.phase = 'gateCamp';   /* the softer loss keeps them at the gate */
      }
    } else if (st.phase === 'reward') {
      const node = nodeOf(map, st.pendingId);
      const plan = planReward(MONSTERS[node.monId].bounty || {}, { baseGold: Math.max(0, BASE_GOLD[node.type] + cfg.rewardGoldAdj), gilded: !!node.gilded, enteredGold: gold, pocketed: 0, minGold: 0, board: board.board });
      gold += plan.gold; m.goldEarned += plan.gold;
      if (plan.items && plan.items.length) {
        plan.items.forEach(function(id){
          if(ITEMS[id]&&ITEMS[id].unique&&ownedUniques.has(id)){
            gold+=3;m.goldEarned+=3;m.duplicateUniqueCash+=3;
          }else{
            if(ITEMS[id]&&ITEMS[id].unique)ownedUniques.add(id);
            invested += ITEMS[id]?(COST[ITEMS[id].size]||2):2;
          }
        });
        board = rebuild();
      }
      st = transition(st, map, { type: 'settleReward' }).state;
      if(mode==='long'&&node.id==='d3boss'){
        const pivot=simMidpointTreasure(seed,ownedUniques);
        m.midpointTreasure=Object.assign({reached:true},pivot);
        if(pivot.selected)ownedUniques.add(pivot.selected);
        else if(pivot.fallbackGold){gold+=pivot.fallbackGold;m.goldEarned+=pivot.fallbackGold;}
      }
    } else if (st.phase === 'market') {
      /* fusion-first: tier up only toward a district-appropriate cap (players win
         at tier 1-5, not by maxing), reserving gold so the board keeps fusing */
      const cap = Math.min(6, currentDistrict(st, map) + 2);
      while (tier < cap && gold >= tierCost(tier + 1, cfg) + 2) { const tc = tierCost(tier + 1, cfg); gold -= tc; m.goldSpent += tc; tier++; }
      const spend = Math.max(0, gold - 2); gold -= spend; invested += spend; m.goldSpent += spend;
      if (tier > m.tierMax) m.tierMax = tier;
      board = rebuild();
      st = transition(st, map, { type: 'leaveMarket' }).state;
    } else if (st.phase === 'event') {
      const node = nodeOf(map, st.pendingId); let delta = 0;
      if (node.type === 'treasure') { const c=cfg.treasureCash+evFlat; gold += c; m.goldEarned += c; }
      else if (node.type === 'rest') { delta = 8; }
      else if (node.type === 'shrine') { delta = 12; }
      else if (node.type === 'negotiation') { const c=cfg.negoCash+evFlat; gold += c; m.goldEarned += c; }
      st = transition(st, map, { type: 'resolveEvent', resolveDelta: delta, outcome: node.type }).state;
    } else if (st.phase === 'gateCamp') {
      m.retries++;
      if (mendGate !== st.pendingId) { mendGate = st.pendingId; mendUsed = false; }
      /* Last Reserve when a loss could be fatal (once per run); Mend when it helps */
      if (!lastReserveUsed && st.resolve > 6 && st.resolve <= 16) { st.resolve -= 6; st.resolveMax -= 6; invested += 6; lastReserveUsed = true; }
      if (!mendUsed && gold >= 3 && st.resolve < st.resolveMax) { gold -= 3; m.goldSpent += 3; st.resolve = Math.min(st.resolveMax, st.resolve + 4); mendUsed = true; }
      const spend = Math.max(0, gold - 1); gold -= spend; invested += spend; m.goldSpent += spend;
      board = rebuild();
      st = transition(st, map, { type: 'startBossRetry' }).state;
    } else {m.pendingActions.push('unhandled_'+st.phase);break;}
  }

  if(st.phase!=='won'&&st.phase!=='lost'){
    m.routeGuardExits++;
    if(guard>=ROUTE_GUARD)m.pendingActions.push('route_guard');
    if(st.pendingId)m.pendingActions.push('pending_'+st.phase);
  }

  m.result = st.phase;
  m.district = currentDistrict(st, map);
  m.resolveEnd = st.resolve;
  m.path = st.path.length;
  m.goldHeld = gold;
  m.tierEnd = tier;
  m.topRarity = topRarity(board);
  m.valid=m.fightTimeouts===0&&m.routeGuardExits===0&&m.guardTrips===0&&m.combatPendingActions===0;
  return m;
}
const RARITY_NAME = ['Bronze', 'Silver', 'Gold', 'Diamond'];

export function runBatch(cfg, options) {
  options=options||{};const runsN=options.runs||600,mode=options.mode||'quick';
  const c = Object.assign({}, DEFAULT_CFG, cfg);
  const runs = [];
  for (let i = 0; i < runsN; i++) runs.push(simRun(((i * 2654435761) ^ 0x9e3779b9) >>> 0, c,mode));
  return runs;
}

/* first-attempt win rate for a band, or for a named monster */
function bandWin(runs, band) {
  const fs = runs.flatMap(r => r.fights).filter(f => f.band === band && f.first);
  return fs.length ? fs.filter(f => f.won).length / fs.length : 0;
}
export function encounterWin(runs, district, mon) {
  const fs = runs.flatMap(r => r.fights).filter(f => f.band === district && f.mon === mon && f.first);
  return { rate: fs.length ? fs.filter(f => f.won).length / fs.length : 0, n: fs.length };
}

export function encounterRows(runs){
  const rows={};
  runs.flatMap(r=>r.fights).filter(f=>f.first&&(f.type==='elite'||f.type==='boss')).forEach(function(f){
    const key=f.band+':'+f.mon,row=rows[key]||(rows[key]={district:f.band,mon:f.mon,type:f.type,wins:0,fights:0});
    row.fights++;if(f.won)row.wins++;
  });
  return Object.values(rows).sort(function(a,b){return a.district-b.district||a.type.localeCompare(b.type)||a.mon.localeCompare(b.mon);});
}

function shopWare(id){const d=ITEMS[id];return !!(d&&!d.unique&&!d.inc&&d.acquisition!=='treasure');}
export function damageShareRows(runs){
  const rows={};let total=0;
  runs.forEach(function(run){
    const seen=new Set();
    (run.fights||[]).forEach(function(f){
      const fightSeen=new Set();
      (f.wares||[]).forEach(function(w){
        if(!shopWare(w.id))return;
        const row=rows[w.id]||(rows[w.id]={id:w.id,name:ITEMS[w.id].n,appearances:0,fights:0,damage:{weapon:0,poison:0,burn:0,hook:0,other:0},total:0,share:0});
        fightSeen.add(w.id);seen.add(w.id);
        DAMAGE_CHANNELS.forEach(function(ch){const n=w.damage&&w.damage[ch]||0;row.damage[ch]+=n;row.total+=n;total+=n;});
      });
      fightSeen.forEach(function(id){rows[id].fights++;});
    });
    seen.forEach(function(id){rows[id].appearances++;});
  });
  return Object.values(rows).map(function(row){row.share=total?row.total/total:0;return row;})
    .sort(function(a,b){return b.share-a.share||b.fights-a.fights||a.id.localeCompare(b.id);});
}

export function batchValidity(runs){
  const guardCounts={contacts:0,catchup:0,depth:0,root:0,step:0,hook:0};
  runs.forEach(function(r){Object.keys(guardCounts).forEach(function(k){guardCounts[k]+=r.guardCounts&&r.guardCounts[k]||0;});});
  return {invalid:runs.filter(r=>!r.valid).length,guardTrips:runs.reduce((s,r)=>s+(r.guardTrips||0),0),guardCounts:guardCounts,
    fightTimeouts:runs.reduce((s,r)=>s+(r.fightTimeouts||0),0),
    routeGuardExits:runs.reduce((s,r)=>s+(r.routeGuardExits||0),0),
    pendingActions:runs.reduce((s,r)=>s+(r.combatPendingActions||0)+(r.pendingActions||[]).length,0)};
}

export function midpointSummary(runs){
  const offered={},selected={};let reached=0,fallbacks=0,fallbackGold=0;
  (runs||[]).forEach(function(run){
    const p=run.midpointTreasure||{};if(!p.reached)return;reached++;
    (p.offered||[]).forEach(function(id){offered[id]=(offered[id]||0)+1;});
    if(p.selected)selected[p.selected]=(selected[p.selected]||0)+1;
    if(p.fallbackGold){fallbacks++;fallbackGold+=p.fallbackGold;}
  });
  const rows=function(counts){return Object.keys(counts).map(function(id){return {id:id,name:ITEMS[id]?ITEMS[id].n:id,count:counts[id]};})
    .sort(function(a,b){return b.count-a.count||a.id.localeCompare(b.id);});};
  return {runs:(runs||[]).length,reached:reached,selections:Object.values(selected).reduce(function(s,n){return s+n;},0),
    fallbacks:fallbacks,fallbackGold:fallbackGold,offered:rows(offered),selected:rows(selected),contribution:'abstracted'};
}

function modeDistricts(runs){
  const count=runs[0]&&runs[0].districtCount||DISTRICTS.length;
  if(count===DISTRICTS.length)return DISTRICTS;
  const names={1:'Back Alleys',2:'The Souk',3:'Palace Quarter',4:'Back Alleys After Midnight',
    5:'The Souk After Midnight',6:'Palace Quarter After Midnight',7:'The Dragon Gate'};
  return Array.from({length:count},function(_,i){return {id:i+1,name:names[i+1]||('District '+(i+1))};});
}

function printDamageShares(runs){
  const rows=damageShareRows(runs),core=rows.filter(r=>r.id==='vial'||r.id==='torch').reduce((s,r)=>s+r.share,0);
  console.log('\nSHOP WARE ATTRIBUTED DAMAGE SHARE');
  console.log('  excludes storm and unattributed damage; appearances = runs, fights = fight boards');
  console.log('  Toxin Vial + Oil Torch combined  '+pct(core));
  console.log('  '+pad('ware',24)+pad('share',8)+pad('runs',8)+pad('fights',8)+'weapon  poison  burn  hook  other');
  rows.slice(0,16).forEach(function(r){
    console.log('  '+pad(r.name,24)+pad(pct(r.share),8)+pad(r.appearances,8)+pad(r.fights,8)
      +DAMAGE_CHANNELS.map(ch=>pad(Math.round(r.damage[ch]),8)).join(''));
  });
  const treasureN=Object.keys(ITEMS).filter(id=>ITEMS[id].unique&&ITEMS[id].acquisition==='treasure').length;
  console.log('  Treasure uniques abstracted: '+treasureN+' are outside the fusion-board policy and have no contribution estimate.');
}

function printValidity(runs){
  const v=batchValidity(runs);
  console.log('\nSAFETY VALIDITY');
  console.log('  invalid runs '+v.invalid+'   combat guard trips '+v.guardTrips+'   fight timeouts '+v.fightTimeouts);
  console.log('  guard counts contacts '+v.guardCounts.contacts+'   catchup '+v.guardCounts.catchup+'   depth '+v.guardCounts.depth
    +'   root '+v.guardCounts.root+'   step '+v.guardCounts.step+'   hook '+v.guardCounts.hook);
  console.log('  route guard exits '+v.routeGuardExits+'   pending actions '+v.pendingActions);
  return v;
}

function printMidpointTreasure(runs){
  const p=midpointSummary(runs);
  console.log('\nMIDPOINT TREASURE');
  console.log('  reached '+p.reached+'/'+p.runs+'   selections '+p.selections+'   fallbacks '+p.fallbacks+' ('+p.fallbackGold+' gold)');
  if(p.reached){
    console.log('  selected '+p.selected.slice(0,8).map(function(r){return r.name+' '+r.count;}).join('   '));
    console.log('  offered  '+p.offered.slice(0,8).map(function(r){return r.name+' '+r.count;}).join('   '));
  }else console.log('  Quick mode has no midpoint pivot.');
  console.log('  combat contribution is abstracted; selected Treasure hooks are not credited to shop wares.');
}

/* ---- detailed single-config readout ---- */
export function detailed(runs) {
  const runN=runs.length,districts=modeDistricts(runs),mode=runs[0]&&runs[0].mode||'quick';
  const hero=runs[0]&&runs[0].hero||'none',omen=runs[0]&&runs[0].omen||'none';
  const wins = runs.filter(r => r.result === 'won');
  console.log('== ROUTE SIM (' + runN + ' seeds, '+mode+' mode, competent-baseline policy, hero '+hero+', omen '+omen+') ==\n');
  console.log('COMPLETION');
  console.log('  clear rate            ' + pct(wins.length / runN));
  const byDist = Array(districts.length).fill(0);
  runs.forEach(r => { if (r.result === 'lost') byDist[r.district]++; });
  console.log('  died in district      ' + districts.map((d, i) => 'D' + d.id + ' ' + pct(byDist[i] / runN)).join('   '));
  console.log('  nodes visited         median ' + med(runs.map(r => r.path)) + '   fights/run median ' + med(runs.map(r => r.fights.length)));
  console.log('\nRESOLVE (' + med(runs.map(r => r.resolveEnd + 0)) + ' end on clears; '+med(runs.map(r=>r.resolveStart))+' start)');
  console.log('  final on a clear      median ' + med(wins.map(r => r.resolveEnd)) + '   min-ever median ' + med(wins.map(r => r.minResolve)));
  console.log('  at death              median ' + med(runs.filter(r => r.result === 'lost').map(r => r.minResolve)));
  console.log('\nGOLD + TIER + FUSION');
  console.log('  earned median ' + med(runs.map(r => r.goldEarned)) + '   spent median ' + med(runs.map(r => r.goldSpent)) + '   held median ' + med(runs.map(r => r.goldHeld)));
  console.log('  end tier median ' + med(runs.map(r => r.tierEnd)) + '   distribution ' + [1, 2, 3, 4, 5, 6].map(t => 't' + t + ' ' + pct(runs.filter(r => r.tierEnd === t).length / runN)).join(' '));
  console.log('  best rarity on the final board ' + RARITY_NAME.map((n, r) => n + ' ' + pct(runs.filter(x => x.topRarity === r).length / runN)).join('  '));
  console.log('\nFIRST-ATTEMPT WIN RATE by band');
  for (const d of districts) console.log('  ' + pad(d.name, 30) + pct(bandWin(runs, d.id)));
  console.log('\nFIRST-ATTEMPT WIN RATE by key encounter');
  for (const row of encounterRows(runs)) {
    const k=encounterWin(runs,row.district,row.mon),label=(MONSTERS[row.mon]&&MONSTERS[row.mon].n||row.mon)+' (D'+row.district+' '+row.type+')';
    console.log('  ' + pad(label, 34) + pad(pct(k.rate), 9) + 'n=' + k.n);
  }
  console.log('\nRETRIES + FIGHTS');
  console.log('  boss retries/run      median ' + med(runs.map(r => r.retries)) + '   mean ' + f1(mean(runs.map(r => r.retries))));
  const allF = runs.flatMap(r => r.fights);
  console.log('  fight seconds         median ' + med(allF.map(f => f.t)) + '   p90 ' + qtile(allF.map(f => f.t), 0.9) + '   win margin (HP) median ' + med(allF.filter(f => f.won).map(f => f.margin)));
  console.log('  duplicate unique fallback gold '+runs.reduce((s,r)=>s+(r.duplicateUniqueCash||0),0));
  printMidpointTreasure(runs);
  printDamageShares(runs);
  return printValidity(runs);
}

/* ---- A/B tuning comparison ---- */
export function abTable(options) {
  options=options||{};const runN=options.runs||1200,mode=options.mode||'quick';
  /* baseline is the current game, which already ships the boss-loss 4->2 change
     (0.68.20). bossLossAdj:2 here therefore models a FURTHER softening to 0. */
  /* economy levers. The baseline now SHIPS reward gold 2/4/6 (0.68.24), so
     rewardGoldAdj here models a FURTHER cut; the remaining candidates are event
     cash, held pending a real playtest of the reward-gold trial. */
  const variants = [
    { name: 'A current (2/4/6)', cfg: {} },
    { name: 'event cash 6->5', cfg: { treasureCash: 5, negoCash: 5 } },
    { name: 'event cash 6->4', cfg: { treasureCash: 4, negoCash: 4 } },
    { name: 'reward gold -1 more', cfg: { rewardGoldAdj: -1 } }
  ];
  const finalDistrict=mode==='long'?7:4,allRuns=[];let baseline=null;
  console.log('== ROUTE SIM A/B (' + runN + ' seeds each, '+mode+' mode, no anomaly, fresh items, sampled paths) ==\n');
  console.log(pad('variant', 20) + pad('clear', 8) + pad('D'+finalDistrict+'-death', 10) + pad('Matron', 8) + pad('Azhdaha', 9) + pad('Vizier', 8) + pad('tier', 6) + pad('retries', 8));
  for (const v of variants) {
    const runs = runBatch(v.cfg,{runs:runN,mode:mode});allRuns.push.apply(allRuns,runs);if(!baseline)baseline=runs;
    const clr = runs.filter(r => r.result === 'won').length / runN;
    const finalDeath = runs.filter(r => r.result === 'lost' && r.district === finalDistrict-1).length / runN;
    console.log(pad(v.name, 20)
      + pad(pct(clr), 8) + pad(pct(finalDeath), 10)
      + pad(pct(encounterWin(runs,1,'matron').rate), 8)
      + pad(pct(encounterWin(runs,finalDistrict,'azhdaha').rate), 9)
      + pad(pct(encounterWin(runs,finalDistrict,'vizier').rate), 8)
      + pad(med(runs.map(r => r.tierMax)), 6)
      + pad(f1(mean(runs.map(r => r.retries))), 8));
  }
  console.log('\nD'+finalDistrict+'-death = share of runs ending in the Dragon Gate. Matron/Azhdaha/Vizier = first-attempt');
  console.log('win rate. Dragon Gate elites are sampled and reported apart.');
  printMidpointTreasure(baseline);
  printDamageShares(baseline);
  return printValidity(allRuns);
}

/* ---- the hero x Omen x route matrix ---- */
const FIGHT_KEYS=['dmgMul','hpMul','burnMul','poisonMul','cdMul','itemIntegrityMul','healingDisabled',
  'stormStartOffsetMs','activationSelfDamagePct','startFullyChargedIfBaseCdAtLeast','firstDeathrattleDouble',
  'healClearsAllBurn','poisonDecayAfterTick'];
const ECON_KEYS=['shopItemCostFlat','slotCountFlat','sizeCostOverride'];
function omenLever(om){
  if(om.id==='none')return 'baseline';
  const keys=Object.keys(om.m||{});
  const fight=keys.some(k=>FIGHT_KEYS.includes(k)&&(om.m[k]!==ANONE[k]));
  const econ=keys.some(k=>ECON_KEYS.includes(k));
  if(fight&&econ)return 'fight+econ';
  if(fight)return 'fight';
  if(econ)return 'econ';
  return 'UNMODELLED';
}

export function matrixTable(options){
  options=options||{};
  const runsN=options.runs||150;
  const heroes=[{id:'none',n:'(no hero)'}].concat(HEROES);
  const omens=[{id:'none',n:'No Omen',m:{}}].concat(ANOMALIES);
  const out={};
  console.log('== HERO x OMEN x ROUTE MATRIX ('+runsN+' seeds per cell, competent-baseline policy) ==');
  console.log('Cell = clear rate. Column levers: fight = combat rules modelled; econ = board cost/slots');
  console.log('modelled; UNMODELLED = the Omen only touches shop mechanics the policy abstracts away,');
  console.log('so its column reads as the baseline and says nothing about that Omen.\n');
  const label=om=>pad(om.id,10);
  for(const mode of ['quick','long']){
    console.log('ROUTE: '+(mode==='long'?'The Long Bazaar':'Quick Night'));
    console.log('  '+pad('lever',12)+omens.map(om=>pad(omenLever(om),10)).join(''));
    console.log('  '+pad('hero',12)+omens.map(label).join(''));
    for(const h of heroes){
      const cells=[];
      for(const om of omens){
        const runs=runBatch({heroId:h.id==='none'?null:h.id,omenId:om.id},{runs:runsN,mode:mode});
        const clr=runs.filter(r=>r.result==='won').length/runs.length;
        const bad=batchValidity(runs);
        out[mode+':'+h.id+':'+om.id]={clear:clr,invalid:bad.invalid};
        cells.push(pad(pct(clr)+(bad.invalid?'!':''),10));
      }
      console.log('  '+pad(h.id,12)+cells.join(''));
    }
    console.log('');
  }
  console.log('! marks a cell with invalid runs (guard trips or timeouts); treat that number as suspect.');
  return out;
}

export function main(argv){
  const o=parseSimArgs(argv);
  if(o.matrix){matrixTable(o);return {invalid:0};}
  const cfg={heroId:o.heroId,omenId:o.omenId||'none'};
  const validity=o.ab?abTable(o):detailed(runBatch(cfg,{runs:o.runs,mode:o.mode}));
  if(validity.invalid)process.exitCode=1;
  return validity;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main(process.argv.slice(2));
