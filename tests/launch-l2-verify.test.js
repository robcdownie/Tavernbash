/* Launch L2 verifier contract tests (0.101.0). Tiny sample counts: these prove
   the verifier's gate logic, record synthesis, determinism, pairing, and exit
   semantics, not the balance result. The contractual runs use the section 4.5
   sample counts from the handoff. */
import test from 'node:test';
import assert from 'node:assert';

async function load() { return import('../scripts/launch-l2-verify.mjs'); }
async function loadSim() { return import('../scripts/route-sim.js'); }
async function loadMap() { return import('../src/map.js'); }
async function loadUnlocks() { return import('../src/unlock-profile.js'); }

function memStorage() {
  const m = new Map();
  return {getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); }};
}

test('constants gate: exactly one config matches the live tree', async () => {
  const V = await load();
  const base = V.constantsGate('baseline'), cand = V.constantsGate('candidate');
  assert.notEqual(base.pass, cand.pass,
    'baseline and candidate expectations must disagree on a live tree; both=' + base.pass +
    ' baseline detail: ' + base.detail.join(' | ') + ' candidate detail: ' + cand.detail.join(' | '));
});

test('cohortResolve: an ended run is a zero sample at later boundaries, never dropped', async () => {
  const V = await load();
  const runs = [
    {resolveAt: {1: 40, 2: 38, 3: 36, 4: 33}, resolveExit: 24},   /* cleared */
    {resolveAt: {1: 40, 2: 38}, result: 'lost'}                    /* died before D3 */
  ];
  assert.equal(V.cohortResolve(runs, 2).pointEstimate, 38);
  assert.equal(V.cohortResolve(runs, 3).pointEstimate, 18, 'the dead run contributes 0 at D3, so (36+0)/2');
  assert.equal(V.cohortResolve(runs, 'exit').pointEstimate, 12, '(24+0)/2');
  assert.equal(V.cohortResolve(runs, 3).survivorMedian, 36, 'survivor median excludes the dead run');
  assert.equal(V.cohortResolve(runs, 3).survivors, 1);
});

test('curve gates: bands, strict fall, descent, and the 15-point drop cap', async () => {
  const V = await load();
  const mk = (pe) => {
    const resolve = {}; const bounds = V.curveBoundaries('quick');
    bounds.forEach((b, i) => { resolve[b] = {pointEstimate: pe[i], survivorMedian: pe[i], survivors: 1, distribution: {}}; });
    return {resolve, firstAttempt: {1: 0.91, 2: 0.82, 3: 0.70, 4: 0.56}, clearRate: 0.7,
      gateEncounters: {azhdaha: {rate: 0.63, n: 10}, auctioneer: {rate: 0.65, n: 10}}};
  };
  const good = V.curveGates(mk([40, 39, 37, 33, 20]), 'quick');
  assert.ok(good.find(g => g.id === 'resolve-bands-quick').pass);
  assert.ok(good.find(g => g.id === 'resolve-strict-fall-quick').pass);
  assert.ok(good.find(g => g.id === 'first-attempt-descends-quick').pass);
  assert.ok(good.find(g => g.id === 'gate-elite-spread-quick').pass);
  const flat = V.curveGates(mk([40, 40, 37, 33, 20]), 'quick');
  assert.ok(!flat.find(g => g.id === 'resolve-strict-fall-quick').pass, 'a non-falling boundary fails the strict-fall gate');
  const outside = V.curveGates(mk([40, 39, 34, 33, 20]), 'quick');
  assert.ok(!outside.find(g => g.id === 'resolve-bands-quick').pass, '34 is outside the D3 band 35 to 39');
  const cliff = mk([40, 39, 37, 33, 20]);
  cliff.firstAttempt = {1: 0.91, 2: 0.88, 3: 0.85, 4: 0.55};
  assert.ok(!V.curveGates(cliff, 'quick').find(g => g.id === 'first-attempt-descends-quick').pass, 'a 30-point cliff fails the drop cap');
});

test('starter matrix: exactly the 12 starter cells, Apothecary plus Blood Moon absent', async () => {
  const V = await load();
  const cells = V.starterCells();
  assert.equal(cells.length, 12, '3 starter heroes x 4 starter Omens');
  assert.ok(!cells.some(c => c.hero === 'apoth' && c.omen === 'moon'), 'moon is not a starter Omen');
  const key = new Set(cells.map(c => c.hero + '+' + c.omen));
  assert.equal(key.size, 12, 'cells are distinct');
});

test('paired seeds: identical derivations across configs, distinct across cells and profiles', async () => {
  const V = await load();
  assert.equal(V.curveSeed(7), V.curveSeed(7));
  assert.notEqual(V.cellSeed(3, 0), V.cellSeed(3, 1), 'cell salt separates cells');
  assert.notEqual(V.profileSeed(3, 1), V.profileSeed(3, 2), 'run salt separates a profile\'s runs');
});

test('recordFromRun feeds the REAL settleUnlocks: clear, forge, and counter triggers fire', async () => {
  const V = await load();
  const U = await loadUnlocks();
  const m = {
    mode: 'quick', result: 'won', district: 4, tierEnd: 4,
    board: [{id: 'torch', rarity: 1}, {id: 'sword', rarity: 1}, {id: 'dagger', rarity: 0}],
    fights: [
      {mon: 'matron', type: 'boss', node: 'd1boss', won: true, wares: [{id: 'vial', damage: {poison: 70}}]},
      {mon: 'vizier', type: 'boss', node: 'd4boss', won: true, wares: []}
    ]
  };
  const record = V.recordFromRun(m, {reportId: 'r1', heroId: 'kiln', omenId: 'bull', lantern: 0});
  assert.equal(record.result, 'quick_clear');
  assert.equal(record.progress.bossesBeaten, 2);
  const storage = memStorage();
  const newly = U.settleUnlocks(storage, record);
  const ids = newly.map(u => u.id);
  assert.ok(ids.includes('surgeonhook'), 'any clear unlocks surgeonhook, got ' + ids.join(','));
  assert.ok(ids.includes('kilnchain'), 'a burn Silver (torch rarity 1) unlocks kilnchain');
  assert.ok(ids.includes('march'), 'the burn forge also unlocks march');
  assert.ok(ids.includes('drummer'), 'a dmg Silver (sword rarity 1) unlocks drummer');
  assert.ok(ids.includes('rapid'), 'the first finished night unlocks rapid');
  assert.ok(ids.includes('plague'), '70 poison applied unlocks plague');
  assert.ok(U.wareUnlocked(storage, 'kilnchain'), 'the profile now holds the ware, so the next run\'s live pool includes it');
  assert.ok(!U.wareUnlocked(memStorage(), 'kilnchain'), 'a fresh profile does not');
});

test('rejection-control content override reaches genMap: D6 nodes carry power 2.15', async () => {
  const M = await loadMap();
  const content = M.snapshotContentTables();
  content.power.long[6] = 2.15;
  const map = M.genMap(11, 'long', 0, content);
  const d6 = map.districts.find(d => d.id === 6);
  const combat = [];
  for (const col of d6.columns) for (const n of col) if (n.monId) combat.push(n);
  combat.push(d6.boss);
  assert.ok(combat.length > 0);
  for (const n of combat) assert.equal(n.power, 2.15, n.id + ' carries the override');
  const live = M.genMap(11, 'long', 0);
  const liveD6 = live.districts.find(d => d.id === 6);
  assert.notEqual(liveD6.boss.power, 2.15, 'the live tree is untouched by the override');
});

test('simRun boundary capture: resolveAt starts at entry and only reached districts have keys', async () => {
  const S = await loadSim();
  const m = S.simRun(1234, {}, 'quick');
  assert.equal(m.resolveAt[1], m.resolveStart, 'entry boundary is the start Resolve');
  for (const k of Object.keys(m.resolveAt)) assert.ok(+k >= 1 && +k <= 4);
  if (m.result === 'won') assert.ok(m.resolveExit != null); else assert.ok(m.resolveExit == null);
  assert.ok(Array.isArray(m.board) && m.board.every(w => typeof w.id === 'string'), 'final board snapshot present');
  const f = m.fights[0];
  assert.ok(typeof f.stormDmg === 'number' && typeof f.incomingDmg === 'number' && typeof f.stormOn === 'boolean', 'storm evidence on fight rows');
});

test('runAll is deterministic, carries every contract section, and the economy is sane', async () => {
  const V = await load();
  const opts = {command: 'all', config: V.constantsGate('baseline').pass ? 'baseline' : 'candidate', seeds: 8, cellSeeds: 1, profiles: 2};
  const one = V.runAll(opts), two = V.runAll(opts);
  assert.deepEqual(one.artifact, two.artifact, 'same invocation, byte-identical artifact');
  const a = one.artifact;
  for (const k of ['configuration', 'rollback', 'gates', 'curve', 'starterMatrix', 'freshProfiles', 'epochEvidence', 'validity']) {
    assert.ok(a[k] != null, 'artifact carries ' + k);
  }
  assert.equal(a.starterMatrix.quick.length, 12);
  assert.ok(a.gates.every(g => typeof g.pass === 'boolean' && typeof g.gating === 'boolean'), 'every gate reports pass and gating');
  assert.ok(a.gates.find(g => g.id === 'sample-counts').pass, 'sample accounting matches the request');
  const d1 = a.curve.quick.districtEvidence[1];
  assert.ok(d1 && d1.all && d1.firstWin, 'district evidence carries the split cohorts');
  /* the NaN-gold regression guard: a broken economy zeroes every clear rate
     while tripping no engine guard. The DEFAULT_CFG fold plus the finiteness
     validity check must keep the curve cohort alive at any sample size. */
  assert.equal(a.validity.invalidRuns, 0, 'no invalid runs (finiteness included)');
  assert.ok(a.curve.quick.clearRate > 0.2, 'quick curve clears at a plausible rate, got ' + a.curve.quick.clearRate);
  assert.ok(a.curve.quick.firstAttempt[1] > 0.6, 'D1 first-attempt is plausible, got ' + a.curve.quick.firstAttempt[1]);
});

test('runAll on the WRONG config fails the constants gate and aborts nonzero', async () => {
  const V = await load();
  const wrong = V.constantsGate('baseline').pass ? 'candidate' : 'baseline';
  const res = V.runAll({command: 'all', config: wrong, seeds: 2, cellSeeds: 1, profiles: 1});
  assert.equal(res.ok, false);
  assert.ok(res.artifact.aborted, 'no cohorts run on a constants mismatch');
  const g = res.artifact.gates.find(x => x.id.indexOf('constants-match') === 0);
  assert.ok(g && g.gating && !g.pass);
});

test('compare: malformed artifacts and unpaired cells fail; a self-compare shape-checks', async () => {
  const V = await load();
  const bad = V.runCompare({}, {}, {});
  assert.equal(bad.ok, false);
  assert.ok(bad.artifact.gates.find(g => g.id === 'artifact-baseline-wellformed' && !g.pass));
  /* a tiny live artifact vs itself relabeled: well-formed, fully paired */
  const cfg = V.constantsGate('baseline').pass ? 'baseline' : 'candidate';
  const a = V.runAll({command: 'all', config: cfg, seeds: 3, cellSeeds: 1, profiles: 2}).artifact;
  const asBase = JSON.parse(JSON.stringify(a)); asBase.configuration.name = 'baseline';
  const asCand = JSON.parse(JSON.stringify(a)); asCand.configuration.name = 'candidate';
  const cmp = V.runCompare(asBase, asCand, {});
  for (const id of ['seam-policy-identical', 'starter-cells-paired', 'starter-aggregate-regression', 'starter-cell-regression',
    'feat-total-drop', 'feat-family-survives', 'epoch1-active-run-preservation']) {
    const g = cmp.artifact.gates.find(x => x.id === id);
    assert.ok(g, 'compare carries ' + id);
    assert.ok(g.pass, id + ' passes on identical inputs: ' + (g.detail || []).join('; '));
  }
});

test('artifacts carry the seam identity and both mode-specific coverage manifests', async () => {
  const V = await load();
  const cfg = V.constantsGate('baseline').pass ? 'baseline' : 'candidate';
  const a = V.runAll({command: 'all', config: cfg, seeds: 2, cellSeeds: 1, profiles: 1, sourceCommit: 'testsrc', constantsCommit: 'testconst'}).artifact;
  assert.equal(a.identity.sourceCommit, 'testsrc');
  assert.equal(a.identity.constantsCommit, 'testconst');
  assert.ok(typeof a.identity.seamPolicyVersion === 'string' && a.identity.seamPolicyVersion.length > 0);
  assert.equal(a.identity.cohortMarketModes.starterMatrix, 'live');
  assert.equal(a.identity.cohortMarketModes.curve, 'abstract');
  assert.ok(Array.isArray(a.coverage.abstract) && Array.isArray(a.coverage.live));
  const liveShop = a.coverage.live.find(r => r.mechanic.indexOf('fusion economy and shopping') >= 0);
  const absShop = a.coverage.abstract.find(r => r.mechanic.indexOf('fusion economy and shopping') >= 0);
  assert.equal(liveShop.status, 'full', 'live shopping reads FULL');
  assert.equal(absShop.status, 'proxy', 'abstract shopping stays proxy: coverage is mode-specific');
  const bell = a.coverage.live.find(r => r.mechanic.indexOf('Auction Bell') >= 0);
  assert.ok(bell, 'the unexercised mechanic is named in the live manifest');
});
