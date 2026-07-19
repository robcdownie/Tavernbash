/* Launch L2 exit-gate verifier (0.101.0, handoff-difficulty-worker-0.101.0-2026-07-18.md
   section 4). Pure, deterministic, DOM-free. It reuses the REAL engine and route
   controller through scripts/route-sim.js simRun (the same construction path as
   variant-verify.mjs), the REAL unlock, feat, and Lantern rules through
   src/unlock-profile.js and src/lantern-profile.js, and the REAL content-epoch
   resolution through src/map.js. It never reimplements combat, routing, shops,
   or unlock logic.

   Commands (section 4.5):
     node scripts/launch-l2-verify.mjs all --config baseline  --seeds 1200 --cell-seeds 150 --profiles 1200 --out FILE
     node scripts/launch-l2-verify.mjs all --config candidate --seeds 1200 --cell-seeds 150 --profiles 1200 --out FILE
     node scripts/launch-l2-verify.mjs compare --baseline FILE --candidate FILE --out FILE

   Exit code contract: nonzero for any failed GATING gate, invalid run, guard
   trip, timeout, route guard exit, pending action, unsupported active-run
   retirement, malformed artifact, or sample-count shortfall. Zero only for a
   clean passing configuration. Gates are config-scoped: the section 4.1 curve
   bands and the section 13 shape gates are the CANDIDATE's targets (the whole
   point of the trial is that the baseline fails them), so on the baseline
   config they are evaluated and reported but marked nonGating; constants-match,
   validity, sample-count, and epoch gates are gating on every config. Every
   gate appears in every artifact with an individual pass or fail, so the
   comparison and Codex read one complete table per config.

   Determinism: no wall clock, no Math.random, no filesystem reads outside the
   two artifact inputs of compare. The same invocation writes byte-identical
   artifacts. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {simRun, DEFAULT_CFG, coverageManifest} from './route-sim.js';
import {POLICY_VERSION, POLICY} from './market-sim.js';
import {genMap, CONTENT_EPOCH, contentTablesFor, snapshotContentTables} from '../src/map.js';
import {DISTRICTS, LONG_DISTRICTS, MONSTERS, ITEMS, HEROES} from '../src/data.js';
import {STARTER_HEROES, STARTER_OMENS, compatibleOmenPool, settleUnlocks, wareUnlocked} from '../src/unlock-profile.js';
import {recordLanternClear, lanternHighest} from '../src/lantern-profile.js';
import {ANOMALIES} from '../src/data.js';

/* ---------- expected constants per config (handoff sections 5 and 7) ---------- */
export const CONFIG_EXPECT = {
  baseline: {
    contentEpoch: 1,
    quickPower: {1: null, 2: null, 3: null, 4: null},
    longPower: {1: null, 2: null, 3: null, 4: 2.9, 5: 1.6, 6: 2.05, 7: 1.6},
    hasteMates: 0.5,
    vizierHp: 700
  },
  candidate: {
    contentEpoch: 2,
    quickPower: {1: null, 2: 1.12, 3: 1.18, 4: null},
    longPower: {1: null, 2: null, 3: null, 4: 2.9, 5: 2.10, 6: 2.05, 7: 1.6},
    hasteMates: 0.30,
    vizierHp: 700
  }
};

/* single-value rollbacks (handoff section 8), emitted in every artifact */
export const ROLLBACK = {
  azhdahaHasteMates: {from: 0.30, to: 0.5, sites: ['azhdaha.board heads', 'azhdaha_v1', 'azhdaha_v2']},
  quickD2Power: {from: 1.12, to: null, note: 'remove the field; null resolves to 1.0'},
  quickD3Power: {from: 1.18, to: null, note: 'remove the field; null resolves to 1.0'},
  longD5Power: {from: 2.10, to: 1.6},
  contentEpoch: {from: 2, to: 1, note: 'drop the epoch-2 power table from EPOCH_TABLES'},
  held: {longD6Power: 2.05, vizierHp: 700}
};

/* section 4.1 whole-cohort expected-Resolve bands, inclusive */
export const RESOLVE_BANDS = {
  quick: {1: [40, 40], 2: [38, 40], 3: [35, 39], 4: [30, 35], exit: [18, 24]},
  long: {1: [60, 60], 2: [57, 60], 3: [54, 59], 4: [50, 57], 5: [44, 51], 6: [39, 47], 7: [32, 40], exit: [18, 26]}
};

const sortNum = a => a.slice().sort((x, y) => x - y);
const med = a => { const s = sortNum(a); return s.length ? s[Math.floor(s.length / 2)] : null; };
const qtile = (a, p) => { const s = sortNum(a); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : null; };
const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
const r2 = x => x == null ? null : Math.round(x * 100) / 100;

/* ---------- live-constant extraction and the constants-match gate ---------- */
export function liveConstants() {
  const q = {}, l = {};
  for (const D of DISTRICTS) q[D.id] = D.power == null ? null : D.power;
  for (const D of LONG_DISTRICTS) l[D.id] = D.power == null ? null : D.power;
  const hm = id => (MONSTERS[id].board.map(b => b.rattle && b.rattle.hasteMates != null ? b.rattle.hasteMates : null).filter(x => x != null));
  return {
    contentEpoch: CONTENT_EPOCH,
    quickPower: q, longPower: l,
    hasteMates: {base: hm('azhdaha'), v1: hm('azhdaha_v1'), v2: hm('azhdaha_v2')},
    vizierHp: MONSTERS.vizier.hp
  };
}
export function constantsGate(configName) {
  const want = CONFIG_EXPECT[configName], live = liveConstants(), bad = [];
  if (!want) return {pass: false, detail: ['unknown config ' + configName]};
  if (live.contentEpoch !== want.contentEpoch) bad.push('CONTENT_EPOCH ' + live.contentEpoch + ' wants ' + want.contentEpoch);
  for (const id of Object.keys(want.quickPower)) {
    if ((live.quickPower[+id] == null ? null : live.quickPower[+id]) !== want.quickPower[id]) bad.push('quick D' + id + ' power ' + live.quickPower[+id] + ' wants ' + want.quickPower[id]);
  }
  for (const id of Object.keys(want.longPower)) {
    if ((live.longPower[+id] == null ? null : live.longPower[+id]) !== want.longPower[id]) bad.push('long D' + id + ' power ' + live.longPower[+id] + ' wants ' + want.longPower[id]);
  }
  for (const site of ['base', 'v1', 'v2']) {
    const vals = live.hasteMates[site];
    if (!vals.length || vals.some(v => v !== want.hasteMates)) bad.push('azhdaha ' + site + ' hasteMates ' + JSON.stringify(vals) + ' wants all ' + want.hasteMates);
  }
  if (live.vizierHp !== want.vizierHp) bad.push('vizier hp ' + live.vizierHp + ' wants ' + want.vizierHp);
  return {pass: bad.length === 0, detail: bad};
}

/* ---------- seed derivations (identical across configs, so pairs pair) ---------- */
export const curveSeed = i => ((i * 2654435761) ^ 0x9e3779b9) >>> 0;
export const cellSeed = (i, cellIdx) => ((((i * 2654435761) ^ 0x9e3779b9) + cellIdx * 0x85ebca6b) >>> 0);
export const profileSeed = (p, r) => ((((p * 2654435761) ^ 0x9e3779b9) + r * 0xc2b2ae35) >>> 0);

/* every simRun goes through this fold, the same DEFAULT_CFG merge runBatch
   applies; a bare partial cfg once leaked undefined economy knobs into a NaN
   gold stream and silently zeroed every cohort, so the fold is mandatory here */
function runOne(seed, cfgOver, mode) {
  return simRun(seed, Object.assign({}, DEFAULT_CFG, cfgOver || {}), mode);
}

/* ---------- validity accumulation (the run-health half of the exit contract) ---------- */
function foldValidity(v, m) {
  v.runs++;
  /* a run whose economy or Resolve went non-finite is an invalid run even if
     no engine guard tripped; this is the NaN-gold class of failure */
  const finite = Number.isFinite(m.goldEarned) && Number.isFinite(m.goldSpent) && Number.isFinite(m.resolveEnd) && Number.isFinite(m.tierEnd);
  if (!m.valid || !finite) v.invalidRuns++;
  v.guardTrips += m.guardTrips || 0;
  v.fightTimeouts += m.fightTimeouts || 0;
  v.routeGuardExits += m.routeGuardExits || 0;
  v.pendingActions += (m.combatPendingActions || 0) + (m.pendingActions || []).length;
  return v;
}
const newValidity = () => ({runs: 0, invalidRuns: 0, guardTrips: 0, fightTimeouts: 0, routeGuardExits: 0, pendingActions: 0});

/* ---------- curve cohort (sections 4.1, 4.2, 13) ---------- */
export function curveBoundaries(mode) {
  const dc = mode === 'long' ? 7 : 4;
  const out = [];
  for (let d = 1; d <= dc; d++) out.push(d);
  out.push('exit');
  return out;
}
/* whole-cohort expected Resolve at one boundary: an ended run contributes zero
   at every boundary it never reached (a zero sample, never a dropped sample) */
export function cohortResolve(runs, boundary) {
  const vals = runs.map(m => boundary === 'exit' ? (m.resolveExit != null ? m.resolveExit : 0) : (m.resolveAt && m.resolveAt[boundary] != null ? m.resolveAt[boundary] : 0));
  const survivors = runs.filter(m => boundary === 'exit' ? m.resolveExit != null : m.resolveAt && m.resolveAt[boundary] != null)
    .map(m => boundary === 'exit' ? m.resolveExit : m.resolveAt[boundary]);
  return {
    pointEstimate: r2(mean(vals)),
    survivorMedian: med(survivors),
    survivors: survivors.length,
    distribution: {p10: qtile(vals, 0.10), p25: qtile(vals, 0.25), p50: qtile(vals, 0.50), p75: qtile(vals, 0.75), p90: qtile(vals, 0.90)}
  };
}
function fightCohorts(fights) {
  const split = {firstWin: [], firstLoss: [], retryWin: [], retryLoss: []};
  for (const f of fights) split[(f.first ? 'first' : 'retry') + (f.won ? 'Win' : 'Loss')].push(f);
  const stat = fs2 => ({
    n: fs2.length,
    fightT: {p50: r2(med(fs2.map(f => f.t))), p90: r2(qtile(fs2.map(f => f.t), 0.9))},
    stormReached: fs2.length ? r2(fs2.filter(f => f.stormOn).length / fs2.length) : null,
    stormDmg: {p50: med(fs2.map(f => f.stormDmg || 0)), p90: qtile(fs2.map(f => f.stormDmg || 0), 0.9)},
    stormShare: (() => { const inc = fs2.reduce((s, f) => s + (f.incomingDmg || 0), 0); const st = fs2.reduce((s, f) => s + (f.stormDmg || 0), 0); return inc ? r2(st / inc) : null; })()
  });
  const out = {};
  for (const k of Object.keys(split)) out[k] = stat(split[k]);
  out.all = stat(fights);
  return out;
}
export function curveCohort(mode, seedsN, cfgExtra) {
  const runs = [], validity = newValidity();
  for (let i = 0; i < seedsN; i++) {
    const m = runOne(curveSeed(i), cfgExtra, mode);
    runs.push(m); foldValidity(validity, m);
  }
  const dc = mode === 'long' ? 7 : 4;
  const bounds = curveBoundaries(mode);
  const resolve = {};
  for (const b of bounds) resolve[b] = cohortResolve(runs, b);
  const firstAttempt = {}, diedIn = {}, evidence = {};
  for (let d = 1; d <= dc; d++) {
    const fa = runs.flatMap(m => m.fights).filter(f => f.band === d && f.first);
    firstAttempt[d] = fa.length ? r2(fa.filter(f => f.won).length / fa.length) : null;
    diedIn[d] = r2(runs.filter(m => m.result === 'lost' && m.district === d).length / runs.length);
    evidence[d] = fightCohorts(runs.flatMap(m => m.fights).filter(f => f.band === d));
  }
  const enc = {};
  for (const mon of ['azhdaha', 'auctioneer', 'vizier']) {
    const fa = runs.flatMap(m => m.fights).filter(f => f.band === dc && f.mon === mon && f.first);
    if (fa.length) enc[mon] = {rate: r2(fa.filter(f => f.won).length / fa.length), n: fa.length};
  }
  return {
    mode, seeds: seedsN,
    clearRate: r2(runs.filter(m => m.result === 'won').length / runs.length),
    resolve, firstAttempt, diedIn, gateEncounters: enc, districtEvidence: evidence,
    validity
  };
}
/* the section 4.1 + 13 curve gates, evaluated on a computed cohort */
export function curveGates(curve, mode) {
  const bands = RESOLVE_BANDS[mode], bounds = curveBoundaries(mode), gates = [];
  let prev = null, falling = true, inBand = true, bandDetail = [];
  for (const b of bounds) {
    const pe = curve.resolve[b].pointEstimate;
    const [lo, hi] = bands[b];
    if (pe < lo || pe > hi) { inBand = false; bandDetail.push(mode + ' ' + b + ': ' + pe + ' outside [' + lo + ',' + hi + ']'); }
    if (prev != null && !(pe < prev)) { falling = false; bandDetail.push(mode + ' ' + b + ': ' + pe + ' does not fall strictly from ' + prev); }
    prev = pe;
  }
  gates.push({id: 'resolve-bands-' + mode, pass: inBand, detail: bandDetail.filter(s => s.indexOf('outside') >= 0)});
  gates.push({id: 'resolve-strict-fall-' + mode, pass: falling, detail: bandDetail.filter(s => s.indexOf('strictly') >= 0)});
  const dc = mode === 'long' ? 7 : 4;
  let descend = true, maxDrop = 0; const dd = [];
  for (let d = 2; d <= dc; d++) {
    const a = curve.firstAttempt[d - 1], b2 = curve.firstAttempt[d];
    if (a == null || b2 == null) continue;
    const drop = (a - b2) * 100;
    maxDrop = Math.max(maxDrop, Math.abs(drop));
    if (b2 > a + 0.02) { descend = false; dd.push('D' + (d - 1) + '->' + d + ' rises ' + r2(a) + '->' + r2(b2)); }
    if (drop > 15) { descend = false; dd.push('D' + (d - 1) + '->' + d + ' drop ' + r2(drop) + ' exceeds 15'); }
  }
  gates.push({id: 'first-attempt-descends-' + mode, pass: descend, detail: dd, maxAdjacentDrop: r2(maxDrop)});
  if (mode === 'long') {
    gates.push({id: 'long-clear-band', pass: curve.clearRate >= 0.55 && curve.clearRate <= 0.70, detail: ['clear ' + curve.clearRate]});
  }
  const az = curve.gateEncounters.azhdaha, au = curve.gateEncounters.auctioneer;
  const spread = az && au ? Math.abs(az.rate - au.rate) * 100 : null;
  gates.push({id: 'gate-elite-spread-' + mode, pass: spread != null && spread <= 12, detail: ['azhdaha ' + (az && az.rate) + ' auctioneer ' + (au && au.rate) + ' spread ' + r2(spread)]});
  return gates;
}

/* ---------- starter matrix (section 4.3) ---------- */
export function starterCells() {
  const cells = [];
  for (const h of STARTER_HEROES) {
    const pool = compatibleOmenPool(ANOMALIES.filter(a => STARTER_OMENS.indexOf(a.id) >= 0), h);
    for (const o of pool) cells.push({hero: h, omen: o.id});
  }
  return cells;
}
export function starterMatrix(cellSeedsN, mode) {
  const cells = starterCells(), rows = [], validity = newValidity();
  cells.forEach((cell, ci) => {
    let clears = 0;
    for (let i = 0; i < cellSeedsN; i++) {
      /* market:'live' (the Codex seam directive): real market-core shops under
         the mp-1 policy; warePool 'starter' freezes the fresh-profile
         run.wareLock snapshot inside simRun */
      const m = runOne(cellSeed(i, ci), {heroId: cell.hero, omenId: cell.omen, warePool: 'starter', market: 'live'}, mode);
      if (m.result === 'won') clears++;
      foldValidity(validity, m);
    }
    rows.push({hero: cell.hero, omen: cell.omen, mode, n: cellSeedsN, clears, rate: r2(clears / cellSeedsN)});
  });
  return {cells: rows, validity};
}
export function starterMatrixGates(matrixQ, matrixL) {
  const gates = [];
  gates.push({id: 'starter-matrix-cell-count', pass: matrixQ.cells.length === 12 && matrixL.cells.length === 12,
    detail: ['quick ' + matrixQ.cells.length + ' long ' + matrixL.cells.length + ' cells; STARTER_HEROES x STARTER_OMENS must be exactly 12']});
  const floorQ = matrixQ.cells.filter(c => c.rate < 0.60).map(c => c.hero + '+' + c.omen + ' ' + c.rate);
  const floorL = matrixL.cells.filter(c => c.rate < 0.40).map(c => c.hero + '+' + c.omen + ' ' + c.rate);
  gates.push({id: 'starter-cell-floor-quick', pass: floorQ.length === 0, detail: floorQ});
  gates.push({id: 'starter-cell-floor-long', pass: floorL.length === 0, detail: floorL});
  return gates;
}

/* ---------- fresh profiles (section 4.4) ---------- */
function memStorage() {
  const m = new Map();
  return {getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); }};
}
/* synthesize the finished-run record settleUnlocks reads, from a simRun result.
   Field contract verified against unlock-profile.js TRIGGERS: result, routeMode,
   lantern, setup.heroId, progress.districtId, progress.bossesBeaten,
   economy.tier/board/vault, metrics.events fusion rows, metrics.fights, and
   metrics.wares poison damage. The board model forges by direct rarity, so the
   fusion evidence is the final board's fused wares. */
export function recordFromRun(m, meta) {
  const bossNodes = new Set();
  for (const f of m.fights) if (f.type === 'boss' && f.won && f.node) bossNodes.add(f.node);
  const wares = {};
  for (const f of m.fights) for (const w of (f.wares || [])) {
    if (!w || !w.id) continue;
    const row = wares[w.id] || (wares[w.id] = {damage: {poison: 0}, fights: 0});
    row.damage.poison += (w.damage && w.damage.poison) || 0;
    row.fights++;
  }
  return {
    reportId: meta.reportId,
    result: m.result === 'won' ? (m.mode === 'long' ? 'long_clear' : 'quick_clear') : 'loss',
    routeMode: m.mode,
    lantern: meta.lantern || 0,
    setup: {heroId: meta.heroId || null, omenId: meta.omenId || null},
    progress: {districtId: m.district || 0, bossesBeaten: bossNodes.size},
    economy: {tier: m.tierEnd || 1, board: m.board || [], vault: []},
    metrics: {
      /* live runs carry the REAL forge events (the exact metric shape ui.js
         fuseStamp emits); the board-derived synthesis remains the abstract
         fallback */
      events: m.fusionEvents ? m.fusionEvents : (m.board || []).filter(w => (w.rarity || 0) >= 1).map(w => ({type: 'fusion', data: {id: w.id, rarity: w.rarity}})),
      fights: m.fights.map(f => ({monsterId: f.mon, winner: f.won ? 'a' : 'b'})),
      wares
    }
  };
}
export function freshProfiles(profilesN) {
  const validity = newValidity();
  let reachD3Run1 = 0, clearBy3 = 0;
  const featByKind = {heroes: 0, omens: 0, wares: 0}, featById = {}, firstClearRuns = [];
  for (let p = 0; p < profilesN; p++) {
    const storage = memStorage();
    let firstClear = null;
    for (let r = 1; r <= 3; r++) {
      const heroId = STARTER_HEROES[(p + r) % STARTER_HEROES.length];
      const omenPool = compatibleOmenPool(ANOMALIES.filter(a => STARTER_OMENS.indexOf(a.id) >= 0), heroId);
      const omenId = omenPool[(p * 3 + r) % omenPool.length].id;
      /* market:'live' with the profile storage: simRun freezes the run's
         wareLock snapshot from this storage at run start (the binding
         condition: unlocks recorded below affect the NEXT run only) */
      const m = runOne(profileSeed(p, r), {heroId, omenId, market: 'live', storage: storage}, 'quick');
      foldValidity(validity, m);
      if (r === 1 && (m.district || 0) >= 3) reachD3Run1++;
      const record = recordFromRun(m, {reportId: 'p' + p + 'r' + r, heroId, omenId, lantern: 0});
      const newly = settleUnlocks(storage, record);
      for (const u of newly) { featByKind[u.kind] = (featByKind[u.kind] || 0) + 1; featById[u.id] = (featById[u.id] || 0) + 1; }
      if (m.result === 'won') {
        recordLanternClear(storage, 'quick', heroId, 0);
        if (firstClear == null) firstClear = r;
      }
    }
    if (firstClear != null) { clearBy3++; firstClearRuns.push(firstClear); }
  }
  const total = featByKind.heroes + featByKind.omens + featByKind.wares;
  return {
    profiles: profilesN,
    reachD3Run1Rate: r2(reachD3Run1 / profilesN),
    clearBy3Rate: r2(clearBy3 / profilesN),
    featEvents: {total, byKind: featByKind, byId: featById,
      familyNote: 'family means the unlock kind (heroes, omens, wares); per-id counts are reported for the finer read'},
    lanternFirstClear: {median: med(firstClearRuns), p90: qtile(firstClearRuns, 0.9), cleared: firstClearRuns.length},
    validity
  };
}
export function freshProfileGates(fp) {
  return [
    {id: 'fresh-reach-d3-run1', pass: fp.reachD3Run1Rate >= 0.90, detail: ['rate ' + fp.reachD3Run1Rate]},
    {id: 'fresh-clear-by-run3', pass: fp.clearBy3Rate >= 0.90, detail: ['rate ' + fp.clearBy3Rate]}
  ];
}

/* ---------- content-epoch evidence (handoff section 9) ---------- */
const EPOCH_CHECK_SEEDS = [11, 173, 4021, 90001, 424243, 777001, 31337, 260201];
function mapHash(map) {
  return crypto.createHash('sha1').update(JSON.stringify(map)).digest('hex');
}
export function epochEvidence(configName) {
  const out = {contentEpoch: CONTENT_EPOCH, epoch1MapHashes: {}, epoch2MapHashes: null, checks: []};
  const epoch1Content = CONTENT_EPOCH === 1 ? null : contentTablesFor(1);
  if (CONTENT_EPOCH !== 1 && !epoch1Content) {
    out.checks.push({id: 'epoch1-tables-present', pass: false, detail: ['CONTENT_EPOCH is ' + CONTENT_EPOCH + ' but EPOCH_TABLES has no epoch 1 snapshot']});
    return out;
  }
  for (const mode of ['quick', 'long']) {
    for (const s of EPOCH_CHECK_SEEDS) {
      const m1 = genMap(s, mode, 0, epoch1Content);
      out.epoch1MapHashes[mode + ':' + s] = mapHash(m1);
      if (mode === 'quick') {
        const powered = [];
        for (const d of m1.districts) for (const col of d.columns) for (const n of col) if (n.power != null) powered.push(n.id);
        out.checks.push({id: 'epoch1-quick-no-power:' + s, pass: powered.length === 0, detail: powered.slice(0, 4)});
      }
    }
  }
  if (configName === 'candidate') {
    out.epoch2MapHashes = {};
    for (const mode of ['quick', 'long']) {
      for (const s of EPOCH_CHECK_SEEDS) {
        const m2 = genMap(s, mode, 0);
        out.epoch2MapHashes[mode + ':' + s] = mapHash(m2);
        if (mode === 'quick') {
          const want = CONFIG_EXPECT.candidate.quickPower;
          const bad = [];
          for (const d of m2.districts) {
            const expect = want[d.id];
            for (const col of d.columns) for (const n of col) {
              if (n.type !== 'monster' && n.type !== 'elite' && n.type !== 'boss') continue;
              const has = n.power == null ? null : n.power;
              if (has !== (expect == null ? null : expect)) bad.push(n.id + ' power ' + has + ' wants ' + expect);
            }
          }
          out.checks.push({id: 'epoch2-quick-graded-power:' + s, pass: bad.length === 0, detail: bad.slice(0, 4)});
        }
      }
    }
  }
  return out;
}

/* ---------- rejection control (handoff section 7): D6 2.15 shown rejected ---------- */
export function rejectionControl(seedsN) {
  const content = snapshotContentTables();
  content.power.long['6'] = 2.15; content.power.long[6] = 2.15;
  const runs = [], validity = newValidity();
  for (let i = 0; i < seedsN; i++) {
    const m = runOne(curveSeed(i), {content}, 'long');
    runs.push(m); foldValidity(validity, m);
  }
  const fa = runs.flatMap(m => m.fights).filter(f => f.band === 6 && f.first);
  const d6 = runs.flatMap(m => m.fights).filter(f => f.band === 6);
  const inc = d6.reduce((s, f) => s + (f.incomingDmg || 0), 0), st = d6.reduce((s, f) => s + (f.stormDmg || 0), 0);
  return {
    label: 'rejection control: Long D6 power 2.15 against the held 2.05 (never a trial value)',
    seeds: seedsN,
    d6FirstAttempt: fa.length ? r2(fa.filter(f => f.won).length / fa.length) : null,
    diedInD6: r2(runs.filter(m => m.result === 'lost' && m.district === 6).length / runs.length),
    d6StormShare: inc ? r2(st / inc) : null,
    clearRate: r2(runs.filter(m => m.result === 'won').length / runs.length),
    validity
  };
}

/* ---------- the all command ---------- */
export function runAll(opts) {
  const configName = opts.config;
  const gates = [];
  const gate = (id, gating, pass, detail, extra) => { gates.push(Object.assign({id, gating: !!gating, pass: !!pass, detail: detail || []}, extra || {})); };

  const cg = constantsGate(configName);
  gate('constants-match-' + configName, true, cg.pass, cg.detail);
  /* a wrong-config tree invalidates every downstream number; stop here */
  if (!cg.pass) {
    return {ok: false, artifact: baseArtifact(opts, gates, {aborted: 'constants mismatch; no cohorts were run'})};
  }

  const curveQ = curveCohort('quick', opts.seeds);
  const curveL = curveCohort('long', opts.seeds);
  const isCandidate = configName === 'candidate';
  for (const g of curveGates(curveQ, 'quick')) gate(g.id, isCandidate, g.pass, g.detail, g.maxAdjacentDrop != null ? {maxAdjacentDrop: g.maxAdjacentDrop} : null);
  for (const g of curveGates(curveL, 'long')) gate(g.id, isCandidate, g.pass, g.detail, g.maxAdjacentDrop != null ? {maxAdjacentDrop: g.maxAdjacentDrop} : null);

  const matrixQ = starterMatrix(opts.cellSeeds, 'quick');
  const matrixL = starterMatrix(opts.cellSeeds, 'long');
  for (const g of starterMatrixGates(matrixQ, matrixL)) gate(g.id, g.id === 'starter-matrix-cell-count' ? true : isCandidate, g.pass, g.detail);

  const fp = freshProfiles(opts.profiles);
  for (const g of freshProfileGates(fp)) gate(g.id, isCandidate, g.pass, g.detail);

  const epoch = epochEvidence(configName);
  for (const c of epoch.checks) gate(c.id, true, c.pass, c.detail);

  const rc = isCandidate ? rejectionControl(Math.min(300, opts.seeds)) : null;

  /* validity roll-up: gating on every config */
  const validity = [curveQ.validity, curveL.validity, matrixQ.validity, matrixL.validity, fp.validity]
    .concat(rc ? [rc.validity] : [])
    .reduce((a, v) => { for (const k of Object.keys(a)) a[k] += v[k]; return a; }, newValidity());
  gate('validity-clean', true, validity.invalidRuns === 0 && validity.guardTrips === 0 && validity.fightTimeouts === 0 && validity.routeGuardExits === 0 && validity.pendingActions === 0,
    ['invalid ' + validity.invalidRuns + ' guardTrips ' + validity.guardTrips + ' timeouts ' + validity.fightTimeouts + ' routeGuardExits ' + validity.routeGuardExits + ' pendingActions ' + validity.pendingActions]);
  const expectRuns = opts.seeds * 2 + opts.cellSeeds * 24 + opts.profiles * 3 + (rc ? rc.seeds : 0);
  gate('sample-counts', true, validity.runs === expectRuns, ['ran ' + validity.runs + ' expected ' + expectRuns]);

  const artifact = baseArtifact(opts, gates, {
    curve: {quick: curveQ, long: curveL},
    starterMatrix: {quick: matrixQ.cells, long: matrixL.cells},
    freshProfiles: fp,
    rejectionControl: rc,
    epochEvidence: epoch,
    validity
  });
  const ok = gates.every(g => !g.gating || g.pass);
  return {ok, artifact};
}
function baseArtifact(opts, gates, body) {
  return Object.assign({
    tool: 'launch-l2-verify', forVersion: '0.101.0', command: opts.command,
    /* artifact identity (the seam evidence contract): the exact source and
       constants commits (caller-supplied at invocation), the seam and policy
       versions baked into this build, the per-cohort market modes, and both
       mode-specific coverage manifests */
    identity: {
      sourceCommit: opts.sourceCommit || null,
      constantsCommit: opts.constantsCommit || null,
      seamPolicyVersion: POLICY_VERSION,
      policy: POLICY,
      cohortMarketModes: {curve: 'abstract', starterMatrix: 'live', freshProfiles: 'live', rejectionControl: 'abstract'}
    },
    coverage: {abstract: coverageManifest('abstract'), live: coverageManifest('live')},
    configuration: {
      name: opts.config || null,
      expectedConstants: opts.config ? CONFIG_EXPECT[opts.config] : null,
      liveConstants: liveConstants(),
      seedCounts: {seeds: opts.seeds, cellSeeds: opts.cellSeeds, profiles: opts.profiles}
    },
    rollback: ROLLBACK,
    gates
  }, body);
}

/* ---------- the compare command ---------- */
const REQUIRED_KEYS = ['tool', 'identity', 'coverage', 'configuration', 'rollback', 'gates', 'curve', 'starterMatrix', 'freshProfiles', 'epochEvidence', 'validity'];
export function validateArtifact(a, wantConfig) {
  const bad = [];
  if (!a || typeof a !== 'object') return ['artifact is not an object'];
  for (const k of REQUIRED_KEYS) if (!(k in a) || a[k] == null) bad.push('missing ' + k);
  if (wantConfig && a.configuration && a.configuration.name !== wantConfig) bad.push('configuration ' + (a.configuration && a.configuration.name) + ' wants ' + wantConfig);
  return bad;
}
export function runCompare(baseline, candidate, opts) {
  const gates = [];
  const gate = (id, pass, detail) => gates.push({id, gating: true, pass: !!pass, detail: detail || []});

  const mb = validateArtifact(baseline, 'baseline'), mc = validateArtifact(candidate, 'candidate');
  gate('artifact-baseline-wellformed', mb.length === 0, mb);
  gate('artifact-candidate-wellformed', mc.length === 0, mc);
  if (mb.length || mc.length) {
    return {ok: false, artifact: {tool: 'launch-l2-verify', forVersion: '0.101.0', command: 'compare', rollback: ROLLBACK, gates}};
  }

  /* the seam evidence requirement: identical seam code and policy version on
     both sides, so the ONLY difference between the artifacts is the
     authorized constants */
  const sp = baseline.identity && candidate.identity
    && baseline.identity.seamPolicyVersion === candidate.identity.seamPolicyVersion
    && JSON.stringify(baseline.identity.policy) === JSON.stringify(candidate.identity.policy)
    && JSON.stringify(baseline.identity.cohortMarketModes) === JSON.stringify(candidate.identity.cohortMarketModes);
  gate('seam-policy-identical', !!sp, sp ? [] : ['baseline ' + (baseline.identity && baseline.identity.seamPolicyVersion) + ' candidate ' + (candidate.identity && candidate.identity.seamPolicyVersion)]);

  /* candidate gating gates must all have passed in its own artifact */
  const failedCand = candidate.gates.filter(g => g.gating && !g.pass).map(g => g.id);
  gate('candidate-gates-clean', failedCand.length === 0, failedCand);
  const failedBase = baseline.gates.filter(g => g.gating && !g.pass).map(g => g.id);
  gate('baseline-gates-clean', failedBase.length === 0, failedBase);

  /* starter matrix regressions (section 4.3): aggregate <= 3 points, cell <= 5 */
  const cellRows = [];
  for (const mode of ['quick', 'long']) {
    const bRows = baseline.starterMatrix[mode], cRows = candidate.starterMatrix[mode];
    for (const b of bRows) {
      const c = cRows.find(x => x.hero === b.hero && x.omen === b.omen);
      if (!c) { cellRows.push({mode, hero: b.hero, omen: b.omen, missing: true}); continue; }
      cellRows.push({mode, hero: b.hero, omen: b.omen, baseline: b.rate, candidate: c.rate, delta: r2(c.rate - b.rate)});
    }
  }
  const missing = cellRows.filter(r => r.missing);
  gate('starter-cells-paired', missing.length === 0, missing.map(r => r.mode + ' ' + r.hero + '+' + r.omen));
  const aggB = {}, aggC = {};
  for (const mode of ['quick', 'long']) {
    aggB[mode] = mean(baseline.starterMatrix[mode].map(r => r.rate));
    aggC[mode] = mean(candidate.starterMatrix[mode].map(r => r.rate));
  }
  const aggBad = ['quick', 'long'].filter(m2 => (aggB[m2] - aggC[m2]) * 100 > 3);
  gate('starter-aggregate-regression', aggBad.length === 0, aggBad.map(m2 => m2 + ' ' + r2(aggB[m2]) + ' -> ' + r2(aggC[m2])));
  const cellBad = cellRows.filter(r => !r.missing && (r.baseline - r.candidate) * 100 > 5);
  gate('starter-cell-regression', cellBad.length === 0, cellBad.map(r => r.mode + ' ' + r.hero + '+' + r.omen + ' ' + r.baseline + ' -> ' + r.candidate));

  /* fresh profiles (section 4.4): feat totals fall <= 10 percent, no family dies,
     Lantern first-clear median and p90 move <= 1 completed run */
  const fb = baseline.freshProfiles.featEvents, fc = candidate.freshProfiles.featEvents;
  gate('feat-total-drop', fc.total >= 0.9 * fb.total, ['baseline ' + fb.total + ' candidate ' + fc.total]);
  const dead = Object.keys(fb.byKind).filter(k => (fb.byKind[k] || 0) > 0 && (fc.byKind[k] || 0) === 0);
  gate('feat-family-survives', dead.length === 0, dead);
  const lb = baseline.freshProfiles.lanternFirstClear, lc = candidate.freshProfiles.lanternFirstClear;
  gate('lantern-first-clear-median', lb.median != null && lc.median != null && Math.abs(lc.median - lb.median) <= 1, ['baseline ' + lb.median + ' candidate ' + lc.median]);
  gate('lantern-first-clear-p90', lb.p90 != null && lc.p90 != null && Math.abs(lc.p90 - lb.p90) <= 1, ['baseline ' + lb.p90 + ' candidate ' + lc.p90]);

  /* epoch-1 active-run preservation: the candidate must regenerate the exact
     epoch-1 maps the baseline generated live (unsupported retirement is a fail) */
  const b1 = baseline.epochEvidence.epoch1MapHashes, c1 = candidate.epochEvidence.epoch1MapHashes;
  const hashBad = Object.keys(b1).filter(k => b1[k] !== c1[k]).concat(Object.keys(c1).filter(k => !(k in b1)));
  gate('epoch1-active-run-preservation', hashBad.length === 0, hashBad.slice(0, 6));

  /* headline movement, informational */
  const headline = {
    quickClear: {baseline: baseline.curve.quick.clearRate, candidate: candidate.curve.quick.clearRate},
    longClear: {baseline: baseline.curve.long.clearRate, candidate: candidate.curve.long.clearRate},
    quickFirstAttempt: {baseline: baseline.curve.quick.firstAttempt, candidate: candidate.curve.quick.firstAttempt},
    longFirstAttempt: {baseline: baseline.curve.long.firstAttempt, candidate: candidate.curve.long.firstAttempt},
    rejectionControl: candidate.rejectionControl
  };
  const ok = gates.every(g => !g.gating || g.pass);
  return {ok, artifact: {tool: 'launch-l2-verify', forVersion: '0.101.0', command: 'compare',
    inputs: {baselineConfig: baseline.configuration.name, candidateConfig: candidate.configuration.name,
      baselineIdentity: baseline.identity, candidateIdentity: candidate.identity,
      seedCounts: {baseline: baseline.configuration.seedCounts, candidate: candidate.configuration.seedCounts}},
    rollback: ROLLBACK, cells: cellRows, headline, gates}};
}

/* ---------- CLI ---------- */
export function parseArgs(argv) {
  const out = {command: argv[0] || null, config: null, seeds: 1200, cellSeeds: 150, profiles: 1200, out: null, baseline: null, candidate: null,
    sourceCommit: null, constantsCommit: null};
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i], v = argv[i + 1];
    if (a === '--config') { out.config = v; i++; }
    else if (a === '--seeds') { out.seeds = +v; i++; }
    else if (a === '--cell-seeds') { out.cellSeeds = +v; i++; }
    else if (a === '--profiles') { out.profiles = +v; i++; }
    else if (a === '--out') { out.out = v; i++; }
    else if (a === '--baseline') { out.baseline = v; i++; }
    else if (a === '--candidate') { out.candidate = v; i++; }
    else if (a === '--source-commit') { out.sourceCommit = v; i++; }
    else if (a === '--constants-commit') { out.constantsCommit = v; i++; }
  }
  return out;
}
export function main(argv) {
  const opts = parseArgs(argv);
  if (opts.command === 'all') {
    if (!opts.config || !CONFIG_EXPECT[opts.config]) { console.error('all requires --config baseline|candidate'); return 2; }
    if (!(opts.seeds > 0 && opts.cellSeeds > 0 && opts.profiles > 0)) { console.error('sample counts must be positive'); return 2; }
    const {ok, artifact} = runAll(opts);
    if (opts.out) fs.writeFileSync(opts.out, JSON.stringify(artifact, null, 1));
    const failed = artifact.gates.filter(g => g.gating && !g.pass);
    console.log('launch-l2-verify all --config ' + opts.config + ': ' + (ok ? 'PASS' : 'FAIL') +
      ' (' + artifact.gates.length + ' gates, ' + failed.length + ' gating failures' + (opts.out ? ', artifact ' + opts.out : '') + ')');
    for (const g of failed) console.log('  FAIL ' + g.id + ': ' + (g.detail || []).slice(0, 3).join('; '));
    return ok ? 0 : 1;
  }
  if (opts.command === 'compare') {
    let b, c;
    try { b = JSON.parse(fs.readFileSync(opts.baseline, 'utf8')); } catch (e) { console.error('malformed baseline artifact: ' + e.message); return 1; }
    try { c = JSON.parse(fs.readFileSync(opts.candidate, 'utf8')); } catch (e) { console.error('malformed candidate artifact: ' + e.message); return 1; }
    const {ok, artifact} = runCompare(b, c, opts);
    if (opts.out) fs.writeFileSync(opts.out, JSON.stringify(artifact, null, 1));
    const failed = artifact.gates.filter(g => g.gating && !g.pass);
    console.log('launch-l2-verify compare: ' + (ok ? 'PASS' : 'FAIL') +
      ' (' + artifact.gates.length + ' gates, ' + failed.length + ' failures' + (opts.out ? ', artifact ' + opts.out : '') + ')');
    for (const g of failed) console.log('  FAIL ' + g.id + ': ' + (g.detail || []).slice(0, 3).join('; '));
    return ok ? 0 : 1;
  }
  console.error('usage: launch-l2-verify.mjs all|compare ...');
  return 2;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
