"use strict";

import {existsSync} from 'node:fs';
import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function filesUnder(path) {
  const entries = await readdir(path, {withFileTypes: true});
  const out = [];
  for (const entry of entries) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) out.push(...await filesUnder(child));
    else if (entry.isFile()) out.push(child);
  }
  return out;
}

function eventCounts(payload) {
  const log = payload && payload.log || [];
  return {
    errors: log.filter((event) => event.kind === 'console-error' || event.kind === 'page-error').length,
    selectorMisses: log.filter((event) => event.kind === 'selector-missing').length,
    unreachable: log.filter((event) => event.kind === 'state-unreachable').length
  };
}

function structuralMetrics(payload) {
  const out = {};
  for (const [viewport, screens] of Object.entries(payload && payload.viewports || {})) {
    out[viewport] = {};
    for (const [label, metric] of Object.entries(screens || {})) {
      out[viewport][label] = {
        pageW: metric.pageW,
        pageH: metric.pageH,
        innerW: metric.innerW,
        innerH: metric.innerH,
        anchors: metric.anchors || {}
      };
    }
  }
  return out;
}

export async function summarizeShotRoot(path) {
  if (!existsSync(path)) throw new Error('shot root not found: ' + path);
  const files = await filesUnder(path);
  const rels = files.map((file) => relative(path, file).replaceAll('\\', '/')).sort();
  const stills = rels.filter((file) => /^(844x390|390x844)\/[^/]+\.png$/.test(file));
  const filmstrips = rels.filter((file) => /^(844x390|390x844)\/films\/[^/]+\.png$/.test(file));
  const reduced = stills.filter((file) => /-rm\.png$/.test(file) && !/fight-frame/.test(file));
  const consolePayload = JSON.parse(await readFile(join(path, 'console-log.json'), 'utf8'));
  const metricsPayload = JSON.parse(await readFile(join(path, 'metrics.json'), 'utf8'));
  return {
    stills,
    filmstrips,
    reduced,
    events: eventCounts(consolePayload),
    metrics: structuralMetrics(metricsPayload),
    hasReviewPacket: existsSync(join(path, 'review', 'review-packet.json'))
  };
}

function ignoredDynamicPixel(file, width, height, x, y) {
  /* Hero barks are deliberately stochastic and can land in a reduced-motion
     still without changing the underlying screen. Ignore only their known
     responsive plaque bounds, never the rest of the frame. */
  const portrait = /[\\/]390x844[\\/]/.test(file);
  if (portrait) return x <= width * .86 && y >= height * .17 && y <= height * .33;
  return x <= width * .18 && y >= height * .74;
}

async function pixelDifference(beforeFile, afterFile) {
  const [before, after] = await Promise.all([
    sharp(beforeFile).removeAlpha().raw().toBuffer({resolveWithObject: true}),
    sharp(afterFile).removeAlpha().raw().toBuffer({resolveWithObject: true})
  ]);
  if (before.info.width !== after.info.width || before.info.height !== after.info.height || before.data.length !== after.data.length) {
    return {sizeMismatch: true, meanAbs: Infinity, percentOver12: 100};
  }
  let total = 0;
  let over12 = 0;
  let rawTotal = 0;
  let rawOver12 = 0;
  let ignored = 0;
  for (let index = 0; index < before.data.length; index++) {
    const delta = Math.abs(before.data[index] - after.data[index]);
    rawTotal += delta;
    if (delta > 12) rawOver12++;
    const pixel = Math.floor(index / before.info.channels);
    const x = pixel % before.info.width;
    const y = Math.floor(pixel / before.info.width);
    if (ignoredDynamicPixel(beforeFile, before.info.width, before.info.height, x, y)) {
      ignored++;
      continue;
    }
    total += delta;
    if (delta > 12) over12++;
  }
  const compared = before.data.length - ignored;
  return {
    sizeMismatch: false,
    meanAbs: total / compared,
    percentOver12: 100 * over12 / compared,
    rawMeanAbs: rawTotal / before.data.length,
    rawPercentOver12: 100 * rawOver12 / before.data.length,
    ignoredPixels: ignored
  };
}

async function differences(before, after, beforePath, afterPath) {
  const failures = [];
  const reducedPixelDiffs = {};
  if (JSON.stringify(before.stills) !== JSON.stringify(after.stills)) failures.push('still inventory differs');
  if (JSON.stringify(before.filmstrips) !== JSON.stringify(after.filmstrips)) failures.push('filmstrip inventory differs');
  if (JSON.stringify(before.events) !== JSON.stringify(after.events)) failures.push('error, miss, or unreachable accounting differs');
  if (JSON.stringify(before.metrics) !== JSON.stringify(after.metrics)) failures.push('structural metrics differ');
  for (const file of before.reduced) {
    if (!after.reduced.includes(file)) {
      failures.push('stable reduced-motion frame missing: ' + file);
      continue;
    }
    const diff = await pixelDifference(join(beforePath, file), join(afterPath, file));
    reducedPixelDiffs[file] = diff;
    if (diff.sizeMismatch || diff.meanAbs > 1.25 || diff.percentOver12 > 2.5) {
      failures.push('stable reduced-motion pixels differ beyond tolerance: ' + file +
        ' mean ' + diff.meanAbs.toFixed(3) + ', over12 ' + diff.percentOver12.toFixed(3) + '%');
    }
  }
  if (!after.hasReviewPacket) failures.push('accelerated output has no review packet');
  return {failures, reducedPixelDiffs};
}

export async function compareShotRoots(beforePath, afterPath) {
  const before = await summarizeShotRoot(beforePath);
  const after = await summarizeShotRoot(afterPath);
  const {failures, reducedPixelDiffs} = await differences(before, after, beforePath, afterPath);
  return {
    schema: 1,
    before: beforePath,
    after: afterPath,
    counts: {
      beforeStills: before.stills.length,
      afterStills: after.stills.length,
      beforeFilmstrips: before.filmstrips.length,
      afterFilmstrips: after.filmstrips.length,
      reducedFramesCompared: before.reduced.length
    },
    events: {before: before.events, after: after.events},
    reducedPixelDiffs,
    reviewPacket: after.hasReviewPacket,
    failures,
    equivalent: failures.length === 0
  };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index++) {
    const raw = argv[index];
    const [flag, inline] = raw.split(/=(.*)/s, 2);
    const value = inline == null ? argv[++index] : inline;
    if (flag === '--before') options.before = resolve(value);
    else if (flag === '--after') options.after = resolve(value);
    else if (flag === '--out') options.out = resolve(value);
    else throw new Error('unknown argument ' + flag);
  }
  if (!options.before || !options.after) throw new Error('usage: --before <serial shots> --after <accelerated shots>');
  options.out ||= join(root, 'shots-equivalence.json');
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = await compareShotRoots(options.before, options.after);
  await mkdir(dirname(options.out), {recursive: true});
  await writeFile(options.out, JSON.stringify(report, null, 1) + '\n');
  console.log(report.counts.afterStills + ' stills, ' + report.counts.afterFilmstrips + ' filmstrips, ' + report.counts.reducedFramesCompared + ' reduced-motion frames compared');
  console.log(report.equivalent ? 'SHOT RUNS EQUIVALENT' : 'SHOT RUNS DIFFER');
  for (const failure of report.failures) console.error('  x ' + failure);
  if (!report.equivalent) process.exitCode = 1;
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
