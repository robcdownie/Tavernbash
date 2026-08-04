import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {computeSourceFingerprint} from '../scripts/build-stamp.mjs';
import {FIXTURES, fixtureNames, phoneContextOptions} from '../scripts/shots-fixtures.mjs';
import {parseTargetArgs} from '../scripts/shots-target.mjs';
import {validateWorktreePath} from '../scripts/presentation-worktree.mjs';

const root = resolve('.');

test('build fingerprint covers the shipped runtime inputs', async () => {
  const fingerprint = await computeSourceFingerprint();
  assert.match(fingerprint.hash, /^[a-f0-9]{64}$/);
  assert.ok(fingerprint.files > 100);
});

test('target arguments select deterministic state, viewport, profile, and before evidence', () => {
  const parsed = parseTargetArgs([
    '--state', 'state-boss-gate',
    '--viewport=390x844',
    '--profile', 'reduced',
    '--before', 'prior-shots',
    '--selector', '.camp-shop'
  ]);
  assert.equal(parsed.state, 'state-boss-gate');
  assert.equal(parsed.viewport, '390x844');
  assert.equal(parsed.profile, 'reduced');
  assert.equal(parsed.before, 'prior-shots');
  assert.deepEqual(parsed.selectors, ['.camp-shop']);
  assert.equal(parseTargetArgs(['--list']).list, true);
});

test('fixture registry carries reusable deep presentation states', () => {
  assert.deepEqual(
    ['intro', 'market-first', 'route-map', 'scout-monster', 'state-boss-gate', 'state-empty-board-fight', 'run-end'].every((name) => fixtureNames().includes(name)),
    true
  );
  assert.equal(FIXTURES['state-boss-gate'].selector, '.campboss');
  assert.deepEqual(phoneContextOptions({width: 390, height: 844}, true).reducedMotion, 'reduce');
});

test('persistent worktree validation refuses broad paths and accepts the named workbench', () => {
  assert.throws(() => validateWorktreePath(resolve(root)), /broad worktree path/);
  const workbench = resolve(tmpdir(), 'bazaar-brawler-presentation-workbench');
  assert.equal(validateWorktreePath(workbench), workbench);
  assert.throws(() => validateWorktreePath(resolve(tmpdir(), 'other-project')), /must identify bazaar-brawler/);
});

test('full and baseline runners use current builds and concurrent viewport jobs', async () => {
  const shots = await readFile(join(root, 'scripts', 'shots.mjs'), 'utf8');
  const check = await readFile(join(root, 'scripts', 'shots-check.mjs'), 'utf8');
  assert.match(shots, /await assertBuildCurrent\(\)/);
  assert.match(shots, /Promise\.all\(VIEWPORTS\.map\(runViewport\)\)/);
  assert.match(shots, /process\.env\.SHOTS_SERIAL === '1'/);
  assert.match(shots, /writePresentationReport/);
  assert.match(check, /await assertBuildCurrent\(\)/);
  assert.match(check, /Promise\.all\(VIEWPORTS\.map/);
});

test('package and skill expose the accelerated safe path while retaining full authority', async () => {
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const skill = await readFile(join(root, '.claude', 'skills', 'presentation-audit', 'SKILL.md'), 'utf8');
  assert.equal(pkg.version, '0.173.0');
  assert.equal(pkg.scripts['shots:nobuild'], 'node scripts/shots.mjs');
  assert.equal(pkg.scripts['shots:target'], 'node scripts/shots-target.mjs');
  assert.equal(pkg.scripts['shots:check:nobuild'], 'node scripts/shots-check.mjs');
  assert.equal(pkg.scripts['presentation:worktree'], 'node scripts/presentation-worktree.mjs');
  assert.match(skill, /Start with targeted evidence/);
  assert.match(skill, /Run `npm run shots:nobuild` last/);
  assert.match(skill, /dispatch the independent art director\s+immediately/);
});
