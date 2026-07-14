/* Regenerate the golden combat traces (tests/combat-traces.golden.json). Run ONLY
   after an APPROVED combat behavior change, and review the diff:
     node scripts/capture-traces.js
   npm test compares against the checked-in golden and never regenerates, so an
   accidental resolver change fails the suite instead of silently rewriting truth.
   (R7 combat oracle, Codex-designed 2026-07-14.) */
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {FIXTURES, capture} from '../tests/combat-fixtures.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const out = {};
for (const f of FIXTURES) out[f.name] = capture(f.cfg, f.dts, f.setup);
writeFileSync(join(root, 'tests', 'combat-traces.golden.json'), JSON.stringify(out, null, 1) + '\n');
console.log('wrote ' + FIXTURES.length + ' golden combat traces');
