import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MONSTERS, VARIANTS, ANOMALIES, ANONE} from '../src/data.js';
import {buildFoe} from '../src/encounter.js';
import {aspectMonId} from '../src/aspects.js';
import {monsterSide, fightHP} from '../src/engine.js';

const BASES = Object.keys(VARIANTS);
const stable = s => { const w = JSON.parse(JSON.stringify(s)); w.items.forEach(i => { delete i.uid; }); return w; };

/* ---- IDENTITY: with the feature off (no seed/nodeId), buildFoe is byte-identical
   to a direct base construction, which is exactly what it built before the Aspect
   resolver landed. Pinned across gild, power, and every Omen for all monsters. ---- */
test('identity: no seed makes buildFoe byte-identical to base construction across gild x power x Omen', () => {
  const board = [{id:'sword',rarity:1,size:2,ench:null,iid:1},{id:'vial',rarity:0,size:1,ench:null,iid:2}];
  const As = [ANONE].concat(ANOMALIES.map(a => Object.assign({}, ANONE, a.m)));
  for (const monId of Object.keys(MONSTERS)) {
    for (const gilded of [false, true]) {
      for (const power of [1, 1.6, 2.9]) {
        for (const A of As) {
          const ctx = {threat:6, hpFlat:0, A:A, gold:7, gilded:gilded, power:power, board:board, nodeType:'monster', lantern:0};
          const foe = buildFoe(monId, ctx);
          const php = fightHP(6, 0, A);
          const side = monsterSide(monId, {gold:7, round:6, A:A, gilded:gilded, power:power, playerBoard:board, playerHp:php});
          assert.equal(foe.php, php, monId + ' player fight health');
          assert.deepEqual(stable(foe.side), stable(side), monId + ' side (gild ' + gilded + ' power ' + power + ')');
          assert.equal(foe.def, MONSTERS[monId], monId + ' def is the resolved base');
        }
      }
    }
  }
});

/* ---- the resolver's base-id fallbacks: any missing input keeps the shipped board ---- */
test('aspectMonId returns the base id with no seed, no node, or no variants', () => {
  for (const base of BASES) {
    assert.equal(aspectMonId(base, null, 'd1c1l0'), base, base + ' null seed -> base');
    assert.equal(aspectMonId(base, undefined, 'd1c1l0'), base, base + ' undefined seed -> base');
    assert.equal(aspectMonId(base, 12345, null), base, base + ' null node -> base');
    assert.equal(aspectMonId(base, 12345, ''), base, base + ' empty node -> base');
  }
  assert.equal(aspectMonId('imp_v1', 12345, 'd1c1l0'), 'imp_v1', 'an aspect has no variants of its own');
  assert.equal(aspectMonId('nope', 12345, 'd1c1l0'), 'nope', 'an unknown id is returned unchanged');
});

/* ---- determinism: the pick is a pure function of (seed, nodeId), never draws rng,
   and never leaves the base-plus-two set. The attempt counter is deliberately not an
   input, so a boss retry faces the exact board the player scouted. ---- */
test('aspectMonId is deterministic and only ever returns the base or one of its two variants', () => {
  for (const base of BASES) {
    const allowed = new Set([base].concat(VARIANTS[base]));
    for (let s = 1; s <= 60; s++) {
      const seed = (s * 2654435761) >>> 0;
      const nid = 'd' + ((s % 4) + 1) + 'c' + (s % 5) + 'l0';
      const r = aspectMonId(base, seed, nid);
      assert.ok(allowed.has(r), base + ' resolved to unexpected ' + r);
      assert.equal(aspectMonId(base, seed, nid), r, base + ' pick is stable for the same (seed, nodeId)');
    }
  }
});

/* ---- variant 0 is the shipped board and the three outcomes are roughly uniform ---- */
test('the pick reaches all three boards and is close to uniform over node ids', () => {
  const base = 'imp', counts = {}, N = 9000;
  for (let i = 0; i < N; i++) { const r = aspectMonId(base, 0x1234, 'n' + i); counts[r] = (counts[r] || 0) + 1; }
  for (const o of [base].concat(VARIANTS[base])) {
    const share = (counts[o] || 0) / N;
    assert.ok(Math.abs(share - 1 / 3) < 0.04, o + ' share ' + share.toFixed(3) + ' is not near one third');
  }
});

test('feature on: the pick actually varies the board for a node', () => {
  const seen = new Set();
  for (let i = 0; i < 300 && seen.size < 3; i++) seen.add(aspectMonId('rats', 0xabc, 'd1c' + i + 'l0'));
  assert.ok(seen.size >= 2, 'more than the shipped board is reachable across node ids');
});

/* ---- DATA LINT: every registry entry and every Aspect is well formed ---- */
test('every one of the 23 creatures has exactly two registered aspects and no orphans', () => {
  const bases = Object.keys(MONSTERS).filter(id => !MONSTERS[id].variantOf);
  assert.equal(bases.length, 23, 'the bestiary is 23 creatures');
  assert.deepEqual(bases.slice().sort(), BASES.slice().sort(), 'VARIANTS keys are exactly the base creatures');
  for (const base of bases) assert.equal((VARIANTS[base] || []).length, 2, base + ' has two aspects');
  for (const id of Object.keys(MONSTERS)) {
    const V = MONSTERS[id];
    if (!V.variantOf) continue;
    assert.ok(MONSTERS[V.variantOf], id + ' names a base that exists');
    assert.ok((VARIANTS[V.variantOf] || []).includes(id), id + ' is registered under its base');
  }
});

test('data lint: aspects carry variantOf and vn, match the base identity, hold no bounty, and are legal boards', () => {
  for (const base of BASES) {
    const M = MONSTERS[base];
    assert.ok(!M.variantOf, base + ' is a base, not itself an aspect');
    for (const vid of VARIANTS[base]) {
      const V = MONSTERS[vid];
      assert.ok(V, 'aspect ' + vid + ' exists in MONSTERS');
      assert.equal(V.variantOf, base, vid + ' points back at its base');
      assert.equal(typeof V.vn, 'string', vid + ' has a scout tagline');
      assert.ok(V.vn.length > 0, vid + ' scout tagline is nonempty');
      for (const k of ['n', 'band', 'tag', 'glyph', 'hp']) assert.equal(V[k], M[k], vid + ' keeps the base ' + k);
      assert.equal(V.bounty, undefined, vid + ' carries no bounty; rewards read the base id');
      assert.ok(Array.isArray(V.board), vid + ' has a board array');
      let cells = 0;
      for (const b of V.board) {
        for (const f of ['nm', 'g', 'size', 'cd', 'integ', 'fx']) assert.notEqual(b[f], undefined, vid + ' board item missing ' + f);
        assert.equal(typeof b.fx, 'object', vid + ' board item fx is an object');
        cells += b.size;
      }
      assert.ok(cells <= 10, vid + ' board uses ' + cells + ' cells (max 10)');
    }
  }
});

/* ---- SIGNATURE INVARIANTS: an Aspect may change the fight, never the creature ---- */
test('signature invariants: every aspect keeps its base creature mechanic', () => {
  const has = (b, p) => b.some(p);
  for (const v of VARIANTS.icebox) assert.ok(has(MONSTERS[v].board, x => x.fx.freeze), v + ' still freezes');
  for (const v of VARIANTS.azhdaha) {
    const b = MONSTERS[v].board;
    assert.equal(b.length, 3, v + ' has exactly three heads');
    assert.ok(b.every(h => h.rattle && h.rattle.hasteMates), v + ' every head has a hasteMates rattle');
  }
  for (const v of VARIANTS.roc) assert.ok(has(MONSTERS[v].board, x => x.selfdestruct && x.rattle && x.rattle.spawn), v + ' egg selfdestruct-spawns');
  for (const v of VARIANTS.golem) {
    const b = MONSTERS[v].board;
    assert.ok(has(b, x => x.ammo > 0), v + ' runs ammo');
    assert.ok(has(b, x => x.fx.reload), v + ' runs reload');
  }
  for (const v of VARIANTS.collector) assert.equal(MONSTERS[v].special, 'gold', v + ' keeps special gold');
  for (const v of VARIANTS.qareen) {
    assert.equal(MONSTERS[v].special, 'mirror', v + ' keeps special mirror');
    assert.equal(MONSTERS[v].board.length, 0, v + ' keeps the empty board');
  }
  for (const v of VARIANTS.monkey) assert.ok(has(MONSTERS[v].board, x => x.pocket), v + ' still pockets bounty');
  for (const v of VARIANTS.sandling) {
    assert.equal(MONSTERS[v].board.length, 0, v + ' keeps the empty board');
    assert.ok(MONSTERS[v].stormAt, v + ' still races a simoom');
  }
  for (const v of VARIANTS.ghul) assert.ok(has(MONSTERS[v].board, x => x.targeting === 'maxinteg'), v + ' keeps maxinteg targeting');
  for (const v of VARIANTS.lamassu) assert.ok(has(MONSTERS[v].board, x => x.bulwark), v + ' keeps a bulwark');
  for (const v of VARIANTS.vizier) assert.ok(has(MONSTERS[v].board, x => x.bulwark), v + ' keeps a bulwark');
  for (const v of VARIANTS.auctioneer) assert.ok(has(MONSTERS[v].board, x => x.fx.disable && x.pay > 0 && x.flying), v + ' keeps disable, pay, and flying');
});

/* ---- SCOUT / STORM WIRING: scout and fight cannot disagree, and the resolved def
   carries the storm the override now reads (built.def.stormAt in ui.js and route-sim) ---- */
test('scout and fight resolve the same board: buildFoe.def is exactly aspectMonId', () => {
  for (const base of BASES) {
    for (let s = 1; s <= 6; s++) {
      const seed = (s * 99991) >>> 0, nid = 'd1c' + s + 'l0';
      const rid = aspectMonId(base, seed, nid);
      const foe = buildFoe(base, {threat:5, hpFlat:0, A:ANONE, gold:3, gilded:false, power:1, board:[], nodeType:'monster', lantern:0, seed:seed, nodeId:nid});
      assert.equal(foe.def, MONSTERS[rid], base + ' scout and fight build the same board');
    }
  }
});

test('storm override: buildFoe exposes the resolved board stormAt for every sandling board', () => {
  const board = [{id:'sword',rarity:0,size:2,ench:null,iid:1}];
  const seed = 7, byId = {};
  for (let i = 0; i < 400 && Object.keys(byId).length < 3; i++) { const nid = 'n' + i; byId[aspectMonId('sandling', seed, nid)] = nid; }
  assert.deepEqual(Object.keys(byId).sort(), ['sandling', 'sandling_v1', 'sandling_v2'], 'all three sandling boards are reachable');
  const stormOf = nid => buildFoe('sandling', {threat:1, hpFlat:0, A:ANONE, gold:0, gilded:false, power:1, board:board, nodeType:'monster', lantern:0, seed:seed, nodeId:nid}).def.stormAt;
  assert.equal(stormOf(byId['sandling']), 12, 'the shipped board storms at 12s');
  assert.equal(stormOf(byId['sandling_v1']), 14, 'Deep Sand storms at 14s');
  assert.equal(stormOf(byId['sandling_v2']), 9, 'Sudden Sand storms at 9s');
});
