"use strict";

import {mkdir, rm} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';
import {assertBuildCurrent} from './build-stamp.mjs';
import {FIXTURES, fixtureNames, openFixture, phoneContextOptions} from './shots-fixtures.mjs';
import {measurePresentation, writePresentationReport} from './presentation-report.mjs';
import {SEED, VIEWPORTS, serveDist} from './shots.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function parseTargetArgs(argv) {
  const options = {
    state: 'state-boss-gate',
    out: null,
    before: null,
    profile: 'both',
    viewport: 'both',
    selectors: []
  };
  for (let index = 0; index < argv.length; index++) {
    const raw = argv[index];
    const [flag, inline] = raw.split(/=(.*)/s, 2);
    if (flag === '--list') {
      options.list = true;
      continue;
    }
    const value = inline == null ? argv[++index] : inline;
    if (flag === '--state') options.state = value;
    else if (flag === '--out') options.out = value;
    else if (flag === '--before') options.before = value;
    else if (flag === '--profile') options.profile = value;
    else if (flag === '--viewport') options.viewport = value;
    else if (flag === '--selector') options.selectors.push(value);
    else throw new Error('unknown argument ' + flag);
  }
  if (!['both', 'normal', 'reduced'].includes(options.profile)) {
    throw new Error('--profile must be both, normal, or reduced');
  }
  if (options.viewport !== 'both' && !VIEWPORTS.some((viewport) => viewport.name === options.viewport)) {
    throw new Error('--viewport must be both, 844x390, or 390x844');
  }
  return options;
}

function selectedViewports(value) {
  return value === 'both' ? VIEWPORTS : VIEWPORTS.filter((viewport) => viewport.name === value);
}

function selectedProfiles(value) {
  if (value === 'normal') return [{name: 'normal', reduced: false}];
  if (value === 'reduced') return [{name: 'reduced', reduced: true}];
  return [{name: 'normal', reduced: false}, {name: 'reduced', reduced: true}];
}

async function proxyFonts(context) {
  await context.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, async (route) => {
    try {
      const response = await fetch(route.request().url(), {headers: {'user-agent': route.request().headers()['user-agent'] || ''}});
      await route.fulfill({
        status: response.status,
        contentType: response.headers.get('content-type') || 'text/css',
        body: Buffer.from(await response.arrayBuffer())
      });
    } catch (error) {
      await route.abort();
    }
  });
}

async function main() {
  const options = parseTargetArgs(process.argv.slice(2));
  if (options.list) {
    console.log(fixtureNames().join('\n'));
    return;
  }
  if (!FIXTURES[options.state]) {
    throw new Error('unknown fixture ' + options.state + '. Choose: ' + fixtureNames().join(', '));
  }
  const fingerprint = await assertBuildCurrent();
  const out = resolve(options.out || join(root, 'shots-target', options.state));
  await rm(out, {recursive: true, force: true});
  await mkdir(out, {recursive: true});
  const server = await serveDist();
  const base = 'http://localhost:' + server.address().port;
  const browser = await chromium.launch({executablePath: process.env.SHOTS_CHROMIUM || undefined});
  const started = Date.now();
  const profiles = selectedProfiles(options.profile);
  let results;
  try {
    results = await Promise.all(selectedViewports(options.viewport).map(async (viewport) => {
      const viewportResults = [];
      for (const profile of profiles) {
        const events = [];
        const context = await browser.newContext(phoneContextOptions(viewport, profile.reduced));
        await proxyFonts(context);
        const page = await context.newPage();
        page.on('console', (message) => {
          if (message.type() === 'error') events.push({kind: 'console-error', detail: message.text()});
        });
        page.on('pageerror', (error) => events.push({kind: 'page-error', detail: error.message}));
        const report = (kind, detail) => events.push({kind, detail});
        try {
          const fixture = await openFixture(page, base, SEED, options.state, report);
          const suffix = profile.reduced ? '-rm' : '';
          const dir = join(out, viewport.name);
          await mkdir(dir, {recursive: true});
          const file = join(dir, options.state + suffix + '.png');
          await page.screenshot({path: file});
          const named = Array.from(new Set([
            fixture.selector,
            '#main',
            '.stage',
            '.dock',
            '.shop',
            '.campboss',
            '.camp-shop',
            '.combat',
            '.recapcard',
            ...options.selectors
          ]));
          const measurements = await measurePresentation(page, named);
          viewportResults.push({
            ok: true,
            viewport: viewport.name,
            profile: profile.name,
            label: options.state,
            file,
            measurements,
            events
          });
        } catch (error) {
          events.push({kind: 'fixture-failed', detail: error.message});
          viewportResults.push({
            ok: false,
            viewport: viewport.name,
            profile: profile.name,
            label: options.state,
            error: error.message,
            events
          });
        } finally {
          await context.close();
        }
      }
      return viewportResults;
    }));
  } finally {
    await browser.close();
    server.close();
  }
  const flattened = results.flat();
  const artifacts = flattened.filter((result) => result.ok);
  const failures = flattened.filter((result) => !result.ok);
  artifacts.sort((a, b) => {
    const viewportOrder = VIEWPORTS.findIndex((viewport) => viewport.name === a.viewport) - VIEWPORTS.findIndex((viewport) => viewport.name === b.viewport);
    return viewportOrder || a.profile.localeCompare(b.profile);
  });
  const log = flattened.flatMap((result) => result.events.map((event) => ({
    viewport: result.viewport,
    profile: result.profile,
    state: options.state,
    ...event
  })));
  const errors = log.filter((event) => event.kind === 'console-error' || event.kind === 'page-error');
  const report = await writePresentationReport({
    out,
    state: options.state,
    seed: SEED,
    fingerprint,
    artifacts,
    log,
    sources: FIXTURES[options.state].sources,
    beforeRoot: options.before ? resolve(options.before) : null,
    summary: {
      durationMs: Date.now() - started,
      artifacts: artifacts.length,
      errors: errors.length,
      selectorMisses: log.filter((event) => event.kind === 'selector-missing').length,
      fixtureFailures: failures.length
    }
  });
  console.log('target ' + options.state + ': ' + artifacts.length + ' artifacts in ' + report.summary.durationMs + 'ms');
  console.log('review packet: ' + join(out, 'review', 'index.html'));
  for (const failure of failures) console.error('  x [' + failure.viewport + ' ' + failure.profile + '] ' + failure.error);
  if (failures.length) process.exitCode = 1;
  if (errors.length) process.exitCode = 2;
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
