import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {FIXTURES, capture} from './combat-fixtures.js';

/* The R7 combat oracle: every fixture must reproduce its golden trace byte-for-byte
   (events + F.t, the seeded-RNG draw sequence, guard trips, and the final-state
   digest). This is what makes the coming action-queue refactor provably inert. If
   this suite fails after a resolver change, behavior moved; regenerate the golden
   with `node scripts/capture-traces.js` ONLY for an approved change. */
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const golden = JSON.parse(readFileSync(join(root, 'tests', 'combat-traces.golden.json'), 'utf8'));

for (const f of FIXTURES) {
  test('combat trace: ' + f.name, () => {
    assert.ok(golden[f.name], 'no golden for ' + f.name + ' (run node scripts/capture-traces.js)');
    const a = capture(f.cfg, f.dts, f.setup);
    assert.deepEqual(a, golden[f.name], f.name + ' diverged from its golden trace');
    /* capture again in the SAME process: the module-global UID counter has advanced,
       so an identical second result proves nothing in the trace/digest leaks raw uids */
    const b = capture(f.cfg, f.dts, f.setup);
    assert.deepEqual(b, golden[f.name], f.name + ' is not stable across a second run (uid dependence?)');
  });
}

test('no approved fixture trips a resolver guard', () => {
  for (const f of FIXTURES) assert.equal(golden[f.name].guardTrips, 0, f.name + ' trips a guard');
});

test('every golden trace name has a live fixture (no orphans)', () => {
  for (const name of Object.keys(golden)) assert.ok(FIXTURES.some(f => f.name === name), 'orphan golden ' + name);
});
