import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {COMBAT_EVENT_KINDS,COMBAT_RENDER_EVENT_KINDS} from '../src/engine.js';

const root=dirname(dirname(fileURLToPath(import.meta.url)));

test('ui handleEvents consumes exactly the allowed combat renderer event kinds',()=>{
  const source=readFileSync(join(root,'src','ui.js'),'utf8');
  const start=source.indexOf('function handleEvents(F,evs)');
  const end=source.indexOf('/* tap any ware',start);
  assert.ok(start>=0&&end>start,'handleEvents block found');
  const block=source.slice(start,end);
  const consumed=[...block.matchAll(/e\.k==='([^']+)'/g)].map(match=>match[1]).sort();
  assert.deepEqual(consumed,[...COMBAT_RENDER_EVENT_KINDS]);
  assert.deepEqual([...new Set(COMBAT_EVENT_KINDS)].sort(),[...COMBAT_EVENT_KINDS].sort(),'event allowlist has no duplicates');
  assert.deepEqual(COMBAT_EVENT_KINDS.filter(kind=>!COMBAT_RENDER_EVENT_KINDS.includes(kind)),['end']);
});
