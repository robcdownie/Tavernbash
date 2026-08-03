"use strict";

import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, isAbsolute, join, parse, resolve, sep} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function run(command, args, cwd, capture = false) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    shell: false
  });
  if (result.status !== 0) {
    const detail = capture ? String(result.stderr || result.stdout || '').trim() : '';
    throw new Error(command + ' ' + args.join(' ') + ' failed' + (detail ? ': ' + detail : ''));
  }
  return capture ? String(result.stdout || '').trim() : '';
}

export function validateWorktreePath(value) {
  if (!value || !isAbsolute(value)) throw new Error('worktree path must be absolute');
  const path = resolve(value);
  const rootPath = parse(path).root;
  if (path === rootPath || path === resolve(root) || path.split(sep).filter(Boolean).length < 2) {
    throw new Error('refusing a broad worktree path: ' + path);
  }
  if (!path.toLowerCase().includes('bazaar-brawler')) {
    throw new Error('worktree path must identify bazaar-brawler');
  }
  return path;
}

async function lockHash(worktree) {
  return createHash('sha256').update(await readFile(join(worktree, 'package-lock.json'))).digest('hex');
}

export async function dependencyState(worktree) {
  const hash = await lockHash(worktree);
  const stamp = join(worktree, 'node_modules', '.bb-lock-sha256');
  let installed = null;
  if (existsSync(stamp)) installed = (await readFile(stamp, 'utf8')).trim();
  return {hash, stamp, reusable: installed === hash};
}

async function ensureDependencies(worktree) {
  let state = await dependencyState(worktree);
  if (state.reusable) {
    console.log('dependencies current: reused existing node_modules');
    return {reused: true, hash: state.hash};
  }
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  run(npm, ['ci', '--prefer-offline', '--no-audit'], worktree);
  state = await dependencyState(worktree);
  await mkdir(dirname(state.stamp), {recursive: true});
  await writeFile(state.stamp, state.hash + '\n');
  console.log('dependencies installed and stamped ' + state.hash.slice(0, 12));
  return {reused: false, hash: state.hash};
}

function branchExists(branch) {
  const result = spawnSync('git', ['show-ref', '--verify', '--quiet', 'refs/heads/' + branch], {
    cwd: root,
    stdio: 'ignore',
    shell: false
  });
  return result.status === 0;
}

function parseArgs(argv) {
  const options = {
    path: process.env.PRESENTATION_WORKTREE || join(tmpdir(), 'bazaar-brawler-presentation-workbench'),
    base: 'main'
  };
  for (let index = 0; index < argv.length; index++) {
    const raw = argv[index];
    const [flag, inline] = raw.split(/=(.*)/s, 2);
    const value = inline == null ? argv[++index] : inline;
    if (flag === '--path') options.path = value;
    else if (flag === '--branch') options.branch = value;
    else if (flag === '--base') options.base = value;
    else throw new Error('unknown argument ' + flag);
  }
  if (!options.branch) throw new Error('--branch is required');
  options.path = validateWorktreePath(options.path);
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!existsSync(options.path)) {
    const args = branchExists(options.branch) ?
      ['worktree', 'add', options.path, options.branch] :
      ['worktree', 'add', '-b', options.branch, options.path, options.base];
    run('git', args, root);
  } else {
    if (!existsSync(join(options.path, '.git'))) throw new Error('target exists but is not a git worktree: ' + options.path);
    const dirty = run('git', ['status', '--porcelain', '--untracked-files=all'], options.path, true);
    if (dirty) throw new Error('persistent worktree is dirty and will not be switched:\n' + dirty);
    const current = run('git', ['branch', '--show-current'], options.path, true);
    if (current !== options.branch) {
      if (branchExists(options.branch)) run('git', ['switch', options.branch], options.path);
      else run('git', ['switch', '-c', options.branch, options.base], options.path);
    }
  }
  const dependencies = await ensureDependencies(options.path);
  const result = {path: options.path, branch: options.branch, base: options.base, dependencies};
  console.log(JSON.stringify(result, null, 1));
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
