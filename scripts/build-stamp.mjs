"use strict";

import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';
import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(root, 'dist');
const STAMP = join(DIST, '.source-fingerprint.json');
const BUILD_INPUTS = [
  'index.html',
  'package.json',
  'package-lock.json',
  'src',
  'public',
  'vite.config.js',
  'vite.config.mjs',
  'vite.config.ts'
];

async function filesUnder(path) {
  if (!existsSync(path)) return [];
  const entries = await readdir(path, {withFileTypes: true});
  const out = [];
  for (const entry of entries) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) out.push(...await filesUnder(child));
    else if (entry.isFile()) out.push(child);
  }
  return out;
}

export async function buildInputFiles() {
  const files = [];
  for (const input of BUILD_INPUTS) {
    const path = join(root, input);
    if (!existsSync(path)) continue;
    const stat = await import('node:fs/promises').then((fs) => fs.stat(path));
    if (stat.isDirectory()) files.push(...await filesUnder(path));
    else files.push(path);
  }
  return files.sort((a, b) => relative(root, a).localeCompare(relative(root, b)));
}

export async function computeSourceFingerprint() {
  const hash = createHash('sha256');
  const files = await buildInputFiles();
  for (const file of files) {
    const rel = relative(root, file).replaceAll('\\', '/');
    hash.update(rel);
    hash.update('\0');
    hash.update(await readFile(file));
    hash.update('\0');
  }
  return {hash: hash.digest('hex'), files: files.length};
}

export async function writeBuildStamp() {
  if (!existsSync(join(DIST, 'index.html'))) {
    throw new Error('dist/index.html not found after build');
  }
  const fingerprint = await computeSourceFingerprint();
  await mkdir(DIST, {recursive: true});
  await writeFile(STAMP, JSON.stringify(fingerprint, null, 1) + '\n');
  console.log('build fingerprint ' + fingerprint.hash.slice(0, 12) + ' across ' + fingerprint.files + ' inputs');
  return fingerprint;
}

export async function assertBuildCurrent() {
  if (!existsSync(join(DIST, 'index.html'))) {
    throw new Error('dist/index.html not found. Run npm run build first.');
  }
  if (!existsSync(STAMP)) {
    throw new Error('dist has no source fingerprint. Run npm run build first.');
  }
  const expected = JSON.parse(await readFile(STAMP, 'utf8'));
  const current = await computeSourceFingerprint();
  if (expected.hash !== current.hash || expected.files !== current.files) {
    throw new Error('dist is stale for the current build inputs. Run npm run build first.');
  }
  return current;
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  writeBuildStamp().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
