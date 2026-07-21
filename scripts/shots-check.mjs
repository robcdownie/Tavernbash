"use strict";
/* The presentation gate (0.132.0, tooling only), the visual counterpart to the
   balance sim. Runs the one shots walk (imported from shots.mjs, so there is a
   single walk, never a drifting copy) at both target viewports and FAILS if:
     - any screen the baseline captured is missing this run,
     - any screen fell back because it never rendered (a *-missing shot),
     - any console error or page error fired during the walk,
     - any captured screen is blank (a near-solid image) or unreadable,
     - any screen's rendered size or a structural anchor box drifts beyond a
       coarse threshold from scripts/shots-baseline.json (gross breakage, not
       pixels: a collapsed, moved, or vanished region).

   Deterministic under the seed hook (SHOTS_SEED, default 13), so the same build
   yields the same fingerprint. The baseline is the small diffable layout metric
   (page size plus anchor boxes), not the PNGs: the contact-sheet images
   regenerate on demand via npm run shots, so the repo carries a deterministic
   reference, not binary churn.

     npm run shots:check        enforce the gate (exit 1 on any failure)
     npm run shots:baseline     rewrite the baseline from the current build

   Hard rules honored: no imports from src/, engine untouched, zero em or en
   dashes. */

import {readFile, writeFile, rm, mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {chromium} from '@playwright/test';
import {SEED, VIEWPORTS, serveDist, walkViewport, log} from './shots.mjs';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(root, 'dist');
const OUT = join(root, 'shots');
const BASELINE = join(root, 'scripts', 'shots-baseline.json');
const UPDATE = process.argv.includes('--update-baseline');

/* coarse tolerances: catching gross breakage, not pixels. A structural anchor
   is flagged only when a box edge or size moves more than BOX_TOL, the rendered
   page more than PAGE_TOL, and a screen is blank only when even its busiest
   colour channel varies less than BLANK_STDEV (a real screen is far above it). */
const BOX_TOL = 56;
const PAGE_TOL = 56;
const BLANK_STDEV = 4;

async function blankness(file) {
  try {
    const stats = await sharp(file).stats();
    return Math.max.apply(null, stats.channels.map((c) => c.stdev));
  } catch (e) { return -1; }   /* unreadable: treated as blank / throw */
}

async function runWalk() {
  if (!existsSync(join(DIST, 'index.html'))) {
    console.error('dist/index.html not found. Run npm run build first (npm run shots:check does this for you locally).');
    process.exit(1);
  }
  await rm(OUT, {recursive: true, force: true});
  await mkdir(OUT, {recursive: true});
  const srv = await serveDist();
  const base = 'http://localhost:' + srv.address().port;
  console.log((UPDATE ? 'baseline' : 'check') + ': serving dist/ at ' + base + ', seed ' + SEED);
  const browser = await chromium.launch({executablePath: process.env.SHOTS_CHROMIUM || undefined});
  const metricsAll = {};
  try {
    for (const vp of VIEWPORTS) {
      console.log('viewport ' + vp.name);
      const res = await walkViewport(browser, base, vp);
      metricsAll[vp.name] = res.metrics;
    }
  } finally {
    await browser.close();
    srv.close();
  }
  /* blankness read from the written PNGs, keeps sharp out of the shared walk */
  for (const vp of VIEWPORTS) {
    for (const label of Object.keys(metricsAll[vp.name] || {})) {
      const m = metricsAll[vp.name][label];
      m.stdev = m.file ? await blankness(join(OUT, m.file)) : -1;
    }
  }
  return metricsAll;
}

function writeBaseline(metricsAll) {
  const baseline = {seed: SEED, generatedBy: process.env.BASELINE_TAG || 'manual', tolerances: {box: BOX_TOL, page: PAGE_TOL, blankStdev: BLANK_STDEV}, viewports: {}};
  let lo = Infinity;
  for (const vp of VIEWPORTS) {
    baseline.viewports[vp.name] = {};
    for (const label of Object.keys(metricsAll[vp.name] || {})) {
      const m = metricsAll[vp.name][label];
      if (m.stdev >= 0) lo = Math.min(lo, m.stdev);
      baseline.viewports[vp.name][label] = {pageW: m.pageW, pageH: m.pageH, innerW: m.innerW, innerH: m.innerH, anchors: m.anchors || {}};
    }
  }
  return {baseline, lowestStdev: lo};
}

function gate(metricsAll, baseline) {
  const fail = [];
  for (const l of log) {
    if (l.kind === 'console-error' || l.kind === 'page-error') fail.push('[' + l.viewport + '] ' + l.screen + ' ' + l.kind + ': ' + String(l.detail).slice(0, 160));
  }
  for (const vp of VIEWPORTS) {
    const cur = metricsAll[vp.name] || {};
    const baseVp = (baseline.viewports && baseline.viewports[vp.name]) || {};
    for (const label of Object.keys(baseVp)) {
      if (!cur[label]) fail.push('[' + vp.name + '] screen MISSING vs baseline: ' + label);
    }
    for (const label of Object.keys(cur)) {
      const m = cur[label];
      if (/-missing$/.test(label)) fail.push('[' + vp.name + '] screen fell back (never rendered): ' + label);
      if (m.stdev >= 0 && m.stdev < BLANK_STDEV) fail.push('[' + vp.name + '] screen BLANK (stdev ' + m.stdev.toFixed(1) + '): ' + label);
      if (m.stdev < 0) fail.push('[' + vp.name + '] screenshot unreadable: ' + label);
    }
    for (const label of Object.keys(baseVp)) {
      const b = baseVp[label], c = cur[label];
      if (!c) continue;
      if (Math.abs((c.pageW || 0) - b.pageW) > PAGE_TOL) fail.push('[' + vp.name + '] ' + label + ' page width drift ' + b.pageW + ' to ' + c.pageW);
      if (Math.abs((c.pageH || 0) - b.pageH) > PAGE_TOL) fail.push('[' + vp.name + '] ' + label + ' page height drift ' + b.pageH + ' to ' + c.pageH);
      const dims = ['x', 'y', 'w', 'h'];
      for (const sel of Object.keys(b.anchors || {})) {
        const bb = b.anchors[sel], cc = (c.anchors || {})[sel];
        if (!cc) { fail.push('[' + vp.name + '] ' + label + ' anchor VANISHED: ' + sel); continue; }
        for (let i = 0; i < 4; i++) {
          if (Math.abs(cc[i] - bb[i]) > BOX_TOL) fail.push('[' + vp.name + '] ' + label + ' ' + sel + ' ' + dims[i] + ' drift ' + bb[i] + ' to ' + cc[i]);
        }
      }
    }
  }
  return fail;
}

async function main() {
  const metricsAll = await runWalk();
  const scanned = VIEWPORTS.reduce((s, vp) => s + Object.keys(metricsAll[vp.name] || {}).length, 0);

  if (UPDATE) {
    const {baseline, lowestStdev} = writeBaseline(metricsAll);
    await writeFile(BASELINE, JSON.stringify(baseline, null, 1) + '\n');
    console.log('\nbaseline written: scripts/shots-baseline.json');
    console.log('  ' + VIEWPORTS.map((v) => Object.keys(baseline.viewports[v.name]).length + ' screens ' + v.name).join(', ') + ', ' + scanned + ' total');
    console.log('  lowest screen stdev ' + (Number.isFinite(lowestStdev) ? lowestStdev.toFixed(1) : 'n/a') + ' (blank floor ' + BLANK_STDEV + ')');
    return;
  }

  if (!existsSync(BASELINE)) {
    console.error('no baseline at scripts/shots-baseline.json. Create it with npm run shots:baseline and commit it.');
    process.exit(1);
  }
  const baseline = JSON.parse(await readFile(BASELINE, 'utf8'));
  const fail = gate(metricsAll, baseline);
  if (fail.length) {
    console.error('\nVISUAL GATE FAILED: ' + fail.length + ' issue(s) across ' + scanned + ' screens');
    for (const f of fail) console.error('  x ' + f);
    console.error('\nIf this is an intended layout change, re-baseline with npm run shots:baseline and commit scripts/shots-baseline.json.');
    process.exit(1);
  }
  console.log('\nVISUAL GATE PASSED: ' + scanned + ' screens, 0 missing, 0 blank, 0 console errors, 0 layout drift beyond tolerance.');
}

main().catch((e) => { console.error(e); process.exit(1); });
