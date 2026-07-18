import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {
  STATE_SCHEMA, resolveWorktreePath, activeReservations, validateReservations,
  validateState, parsePorcelain, planStaging
} from '../scripts/coordination.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/* a clean single-writer reservation set that must always validate */
function baseReservations(){
  return [
    {version:"0.99.1", owner:"claude", branch:"launch-safe-ground", worktree:"C:/Robbie/bazaar-brawler", status:"in-progress"}
  ];
}

test('a clean single reservation set has no collisions', () => {
  assert.deepEqual(validateReservations(baseReservations()), []);
});

test('two distinct active reservations validate', () => {
  const rs = baseReservations();
  rs.push({version:"0.99.3", owner:"codex", branch:"launch-safe-ground-txn", worktree:"C:/Robbie/bb-txn", status:"in-progress"});
  assert.deepEqual(validateReservations(rs), []);
});

test('injecting a duplicate active version is rejected', () => {
  const rs = baseReservations();
  rs.push({version:"0.99.1", owner:"codex", branch:"other-branch", worktree:"C:/Robbie/other", status:"in-progress"});
  const errs = validateReservations(rs);
  assert.equal(errs.length, 1);
  assert.match(errs[0], /duplicate active version "0\.99\.1"/);
});

test('injecting a duplicate active branch is rejected', () => {
  const rs = baseReservations();
  rs.push({version:"0.99.2", owner:"codex", branch:"launch-safe-ground", worktree:"C:/Robbie/other", status:"in-progress"});
  const errs = validateReservations(rs);
  assert.equal(errs.length, 1);
  assert.match(errs[0], /duplicate active branch "launch-safe-ground"/);
});

test('injecting a duplicate resolved worktree path is rejected across spellings', () => {
  const rs = baseReservations();
  /* same location, different slashes and case: must still collide */
  rs.push({version:"0.99.2", owner:"codex", branch:"other-branch", worktree:"c:\\Robbie\\bazaar-brawler\\", status:"in-progress"});
  const errs = validateReservations(rs);
  assert.equal(errs.length, 1);
  assert.match(errs[0], /duplicate active worktree path/);
});

test('a closed reservation frees its version, branch, and worktree', () => {
  const rs = baseReservations();
  rs[0].status = "done";
  rs.push({version:"0.99.1", owner:"claude", branch:"launch-safe-ground", worktree:"C:/Robbie/bazaar-brawler", status:"in-progress"});
  assert.deepEqual(validateReservations(rs), []);
  assert.equal(activeReservations(rs).length, 1);
});

test('resolveWorktreePath normalizes slashes, trailing slash, and case', () => {
  assert.equal(resolveWorktreePath("C:\\Robbie\\bazaar-brawler\\"), "c:/robbie/bazaar-brawler");
  assert.equal(resolveWorktreePath("C:/Robbie/bazaar-brawler"), "c:/robbie/bazaar-brawler");
  assert.equal(resolveWorktreePath(""), "");
});

test('parsePorcelain reads status letters, untracked, and renames', () => {
  const text = [
    " M src/data.js",
    "?? scratch.tmp",
    "A  coordination/state.json",
    "R  old/path.js -> new/path.js"
  ].join("\n");
  const entries = parsePorcelain(text);
  assert.deepEqual(entries, [
    {xy:" M", path:"src/data.js"},
    {xy:"??", path:"scratch.tmp"},
    {xy:"A ", path:"coordination/state.json"},
    {xy:"R ", path:"new/path.js"}
  ]);
});

test('planStaging refuses an unexpected untracked file and stages tracked changes', () => {
  const entries = [
    {xy:" M", path:"src/data.js"},
    {xy:"??", path:"scratch.tmp"}
  ];
  const plan = planStaging(entries, [], {strict:false});
  assert.deepEqual(plan.stage, ["src/data.js"]);
  assert.deepEqual(plan.refuse, ["scratch.tmp"]);
});

test('planStaging stages an approved untracked file', () => {
  const entries = [{xy:"??", path:"coordination/state.json"}];
  const plan = planStaging(entries, ["coordination/state.json"], {strict:false});
  assert.deepEqual(plan.stage, ["coordination/state.json"]);
  assert.deepEqual(plan.refuse, []);
});

test('strict planStaging refuses a modified file that is not approved', () => {
  const entries = [
    {xy:" M", path:"package.json"},
    {xy:" M", path:"src/engine.js"}
  ];
  const plan = planStaging(entries, ["package.json"], {strict:true});
  assert.deepEqual(plan.stage, ["package.json"]);
  assert.deepEqual(plan.refuse, ["src/engine.js"]);
});

test('planStaging normalizes backslash paths against the approved set', () => {
  const entries = [{xy:"??", path:"coordination\\state.json"}];
  const plan = planStaging(entries, ["coordination/state.json"], {strict:true});
  assert.deepEqual(plan.stage, ["coordination\\state.json"]);
  assert.deepEqual(plan.refuse, []);
});

test('the committed coordination/state.json is present and valid', () => {
  const state = JSON.parse(readFileSync(join(root, 'coordination', 'state.json'), 'utf8'));
  assert.equal(state.stateSchema, STATE_SCHEMA);
  assert.deepEqual(validateState(state), []);
  /* the reserved rulings Robbie recorded must be present and not silent */
  assert.equal(state.decisions.targetingReopen.ruling.length > 0, true);
  assert.equal(state.decisions.signatureModel.ruling.length > 0, true);
  /* no state field may name a live Netlify deploy path */
  assert.equal(JSON.stringify(state).toLowerCase().includes('netlify.app'), false);
});
