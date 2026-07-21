"use strict";
/* Device-accurate screenshot harness (0.119.0, tooling only).

   Serves the built app from dist/ on localhost, launches Chromium through
   Playwright with iPhone-faithful settings (deviceScaleFactor 3, isMobile,
   hasTouch), and walks a full seeded run at both target viewports:
   844x390 landscape (primary) and 390x844 portrait (secondary).

   The walk: intro, New Game, hero pick, road pick, omen reveal, first market
   (buying wares so the fight is honest), route map, scout a monster, the
   fight (three frames roughly 600ms apart), victory, back to a market.

   Reproducible: the run loads /?seed=N (the tooling hook in ui.js newRoute),
   so map, omen, shop rolls, and fight seeds all derive from one number.
   Override with SHOTS_SEED=12345. Default seed chosen so the first fight is
   winnable off the opening stall and a market is reachable after it.

   Resilient: every step waits briefly for its selector; on a miss it shoots
   whatever is on screen, records the miss, and keeps going. Console errors
   and page errors are collected per screen and written to
   shots/console-log.json (also echoed to stdout).

   Output: shots/<viewport>/<NN-label>.png and shots/index.html, a contact
   sheet tiling every capture with its label. Run with `npm run shots`
   (preshots builds dist first). SHOTS_CHROMIUM=/path/to/chromium overrides
   the browser binary for exotic CI hosts.

   Hard rules honored: no imports from src/, engine untouched, zero em or en
   dashes (this file and the generated index.html both pass the dash scan). */

import {createServer} from 'node:http';
import {readFile, mkdir, writeFile, rm} from 'node:fs/promises';
import {existsSync, realpathSync} from 'node:fs';
import {join, dirname, extname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(root, 'dist');
const OUT = join(root, 'shots');
export const SEED = (() => {
  const raw = process.env.SHOTS_SEED;
  const n = raw == null ? NaN : parseInt(raw, 10);
  return Number.isFinite(n) ? (n >>> 0) : 13;
})();
export const VIEWPORTS = [
  {name: '844x390', width: 844, height: 390},
  {name: '390x844', width: 390, height: 844}
];
/* structural anchors captured per screen for the coarse layout diff. Only the
   ones present on a given screen are recorded; the check compares matching
   anchors run to baseline. Chosen to be layout-driven containers (flex or grid),
   not text-width elements, so the boxes are stable run to run under a fixed seed. */
export const ANCHORS = ['#app', '#main', '#ribbon', '.stage', '.secmarket', '.shop', '#bd', '.controls', '.dock', '.rmplot', '.combat', '.recapcard', '.heropick', '#btnGo'];
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.map': 'application/json'
};

/* ---------- static server over dist/ ---------- */
export function serveDist() {
  const srv = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let p = decodeURIComponent(url.pathname);
      if (p.endsWith('/')) p += 'index.html';
      const file = join(DIST, p);
      if (!file.startsWith(DIST)) { res.writeHead(403); res.end(); return; }
      const body = await readFile(existsSync(file) ? file : join(DIST, 'index.html'));
      const ext = extname(existsSync(file) ? file : '.html');
      res.writeHead(200, {'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': 'no-store'});
      res.end(body);
    } catch (e) { res.writeHead(500); res.end(String(e && e.message)); }
  });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok(srv)));
}

/* ---------- the walk ---------- */
export const log = [];
export function note(vp, screen, kind, detail) {
  const line = {viewport: vp, screen, kind, detail};
  log.push(line);
  console.log('  [' + vp + '] ' + screen + ' ' + kind + (detail ? ': ' + String(detail).slice(0, 220) : ''));
}

/* the coarse per-screen layout fingerprint: rendered page size plus the box of
   each structural anchor present. Layout only, no pixels; the gate compares it
   to the committed baseline. */
async function captureMetrics(page) {
  return await page.evaluate((anchors) => {
    const doc = document.documentElement;
    const out = {pageW: doc.scrollWidth, pageH: doc.scrollHeight, innerW: window.innerWidth, innerH: window.innerHeight, anchors: {}};
    for (const sel of anchors) {
      const el = document.querySelector(sel);
      if (el) { const r = el.getBoundingClientRect(); out.anchors[sel] = [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; }
    }
    return out;
  }, ANCHORS);
}

export async function walkViewport(browser, base, vp) {
  const dir = join(OUT, vp.name);
  await mkdir(dir, {recursive: true});
  const context = await browser.newContext({
    viewport: {width: vp.width, height: vp.height},
    deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });
  /* the webfonts (Rakkas, Hanken Grotesk) load from Google Fonts; sandboxed
     CI browsers often cannot reach it, which would silently swap the whole
     game into fallback type. Proxy those two hosts through Node's fetch so
     the shots stay typographically faithful anywhere; a genuinely offline
     host just falls back as the browser would have. */
  await context.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, async (route) => {
    try {
      const r = await fetch(route.request().url(), {headers: {'user-agent': route.request().headers()['user-agent'] || ''}});
      route.fulfill({status: r.status, contentType: r.headers.get('content-type') || 'text/css', body: Buffer.from(await r.arrayBuffer())});
    } catch (e) { route.abort(); }
  });
  const page = await context.newPage();
  let currentScreen = 'boot';
  const shotsTaken = [];
  const metrics = {};
  page.on('console', (msg) => { if (msg.type() === 'error') note(vp.name, currentScreen, 'console-error', msg.text()); });
  page.on('pageerror', (err) => note(vp.name, currentScreen, 'page-error', err.message));

  let shotN = 0;
  async function shoot(label) {
    shotN++;
    const name = String(shotN).padStart(2, '0') + '-' + label + '.png';
    await page.screenshot({path: join(dir, name)});
    const file = vp.name + '/' + name;
    try { metrics[label] = Object.assign({file}, await captureMetrics(page)); }
    catch (e) { note(vp.name, currentScreen, 'metrics-failed', String(e && e.message)); metrics[label] = {file}; }
    shotsTaken.push({file, label});
    return name;
  }
  /* wait that never throws: a miss is logged and the walk continues */
  async function settle(sel, ms) {
    try { await page.waitForSelector(sel, {timeout: ms || 8000}); return true; }
    catch (e) { note(vp.name, currentScreen, 'selector-missing', sel); return false; }
  }
  async function tap(sel, ms) {
    if (!(await settle(sel, ms))) return false;
    try { await page.click(sel, {timeout: 3000}); return true; }
    catch (e) { note(vp.name, currentScreen, 'click-failed', sel + ' ' + e.message); return false; }
  }

  /* 01 intro: clean profile, seeded fresh run. Clear storage from a bare
     same-origin page (the service worker file, no subresources) so the real
     load is single and clean: navigating away mid-load reads as spurious
     connection-reset console errors otherwise. */
  currentScreen = '01-intro';
  await page.goto(base + '/sw.js');
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto(base + '/?seed=' + SEED);
  await settle('#intro.bgready', 6000);
  await page.waitForTimeout(600);            /* let the threshold painting fade up */
  await shoot('intro');

  /* 02 hero pick */
  currentScreen = '02-hero-pick';
  await tap('#inNew');
  if (await settle('.heropick')) {
    await tap('.herochip:not(.lockd)', 3000); /* first open merchant, detail fills */
    await page.waitForTimeout(300);
  }
  await shoot('hero-pick');
  await tap('#heroGo');

  /* 03 road pick */
  currentScreen = '03-road-pick';
  await settle('#modeQuick');
  await page.waitForTimeout(300);
  await shoot('road-pick');
  await tap('#modeQuick');

  /* 04 omen reveal */
  currentScreen = '04-omen-reveal';
  await settle('.card.reveal');
  await page.waitForTimeout(400);            /* rays and icon settle */
  await shoot('omen-reveal');
  await tap('#rvGo');

  /* 05 first market: buy offense so the fight is honest, then shoot */
  currentScreen = '05-market-first';
  await settle('#main.draft .ware');
  await page.waitForTimeout(400);
  const bought = await buyAffordable(page);
  note(vp.name, currentScreen, 'bought', bought.join(', ') || 'nothing affordable');
  await page.waitForTimeout(400);
  await shoot('market-first');
  await tap('#btnGo');

  /* 06 route map */
  currentScreen = '06-route-map';
  await settle('.rmplot');
  await page.waitForTimeout(400);
  await shoot('route-map');

  /* 07 scout a monster: tap a reachable monster door, preview populates */
  currentScreen = '07-scout-monster';
  const scouted = await tap('.rmnode.reach.t-monster', 5000) || await tap('.rmnode.t-monster', 3000) || await tap('.rmnode.reach', 3000);
  if (scouted) { await settle('.rmprev .rmpbody', 4000); await page.waitForTimeout(300); }
  await shoot('scout-monster');

  /* 08 to 10 the fight: commit, then three frames roughly 600ms apart.
     The sim holds 1.5s behind the Dusk Falls curtain (gone at 2250ms), so the
     first frame lands just after the first swings. */
  currentScreen = '08-fight';
  const committed = await tap('.rmpfoot [data-a="challenge"]', 5000);
  if (committed && await settle('#main.fight', 6000)) {
    await page.waitForTimeout(2400);
    await shoot('fight-frame-1');
    await page.waitForTimeout(600);
    await shoot('fight-frame-2');
    await page.waitForTimeout(600);
    await shoot('fight-frame-3');
  } else {
    note(vp.name, currentScreen, 'selector-missing', 'fight never started; shooting current screen');
    await shoot('fight-missing');
  }

  /* 11 victory recap (or defeat, recorded honestly) */
  currentScreen = '11-victory';
  if (await settle('.recapcard', 45000)) {
    const won = await page.$('.recapcard.rewin');
    if (!won) note(vp.name, currentScreen, 'outcome', 'defeat instead of victory at seed ' + SEED);
    await page.waitForTimeout(400);
    await shoot(won ? 'victory' : 'defeat');
    await tap('#recapGo');
    /* a bounty choice overlay (gild, unique, charm) can follow: record and clear it */
    try {
      await page.waitForSelector('.ov .card', {timeout: 2500});
      await shoot('reward-choice');
      const b = await page.$('.ov .card button');
      if (b) await b.click();
    } catch (e) { /* no choice overlay: fixed bounty settled by toast */ }
  } else {
    await shoot('victory-missing');
  }

  /* 12 back to a market node */
  currentScreen = '12-market-return';
  if (await settle('.rmplot', 10000)) {
    const entered = (await tap('.rmnode.reach.t-market', 4000)) && (await tap('.rmpfoot [data-a="enter"]', 4000));
    if (entered && await settle('#main.draft .ware', 8000)) {
      await page.waitForTimeout(400);
      await shoot('market-return');
    } else {
      note(vp.name, currentScreen, 'selector-missing', 'no reachable market after the fight; shooting the map');
      await shoot('market-return-map-only');
    }
  } else {
    await shoot('market-return-missing');
  }

  /* 13 run end: the debrief overlay. A real clear is four districts deep, so
     this uses the localhost dev hook the layout e2e uses (BBDEV.routeEnd);
     absent (non-localhost build), the miss is logged and the walk ends. */
  currentScreen = '13-run-end';
  const ended = await page.evaluate(() => {
    try { window.BBDEV.routeEnd('won'); return true; } catch (e) { return false; }
  });
  if (ended && await settle('#reGo', 6000)) {
    await page.waitForTimeout(500);
    await shoot('run-end');
  } else {
    note(vp.name, currentScreen, 'selector-missing', 'BBDEV.routeEnd unavailable; skipping run end');
  }

  await context.close();
  return {shots: shotsTaken, metrics};
}

/* buy affordable wares, offense first (dmg, burn, poison, then the rest) so
   the first fight is armed the way a real player would arm it; deterministic
   under a fixed seed. Category order reads the localhost dev globals when
   present and falls back to left to right. Tap the card, then Buy in its
   inspect overlay; a disabled Buy just closes. */
export async function buyAffordable(page) {
  const bought = [];
  for (let pass = 0; pass < 8; pass++) {
    const idx = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.ware[data-w]'))
        .filter((c) => !c.classList.contains('gone') && !c.classList.contains('cant'));
      if (!cards.length) return null;
      try {
        const rank = {dmg: 0, burn: 1, poison: 2, heal: 3, shield: 4};
        const shop = window.BBDEV.g().run.economy.shop, ITEMS = window.BB.ITEMS;
        cards.sort((a, b) => {
          const ca = ITEMS[shop[+a.dataset.w].id].cat, cb = ITEMS[shop[+b.dataset.w].id].cat;
          return (rank[ca] ?? 9) - (rank[cb] ?? 9) || (+a.dataset.w) - (+b.dataset.w);
        });
      } catch (e) { /* dev globals absent: keep DOM order */ }
      return cards[0].dataset.w;
    });
    if (idx == null) break;
    try {
      await page.click('.ware[data-w="' + idx + '"]');
      await page.waitForSelector('#shopBuy', {timeout: 3000});
      const can = await page.$eval('#shopBuy', (b) => !b.disabled);
      if (can) {
        const name = await page.$eval('.inspectcard .nm', (c) => c.textContent).catch(() => 'ware');
        await page.click('#shopBuy');
        bought.push(name.trim());
        await page.waitForTimeout(500);      /* buy flight lands, market rerenders */
      } else {
        await page.click('#shopClose');
        break;
      }
    } catch (e) { break; }
  }
  return bought;
}

/* ---------- contact sheet ---------- */
export function contactSheetHTML(all) {
  const groups = VIEWPORTS.map((vp) => {
    const shots = all[vp.name] || [];
    const tiles = shots.map((s) =>
      '<figure><a href="' + s.file + '"><img loading="lazy" src="' + s.file + '" alt="' + s.label + '"></a>' +
      '<figcaption>' + s.label + '</figcaption></figure>').join('\n');
    return '<h2>' + vp.name + (vp.width > vp.height ? ' (landscape, primary)' : ' (portrait)') + '</h2>\n<div class="grid ' + (vp.width > vp.height ? 'wide' : 'tall') + '">\n' + tiles + '\n</div>';
  }).join('\n');
  const errs = log.filter((l) => l.kind === 'console-error' || l.kind === 'page-error').length;
  const misses = log.filter((l) => l.kind === 'selector-missing').length;
  return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Tavern Bash shots &middot; seed ' + SEED + '</title>\n<style>' +
    'body{background:#14100b;color:#e8dcc4;font:14px/1.5 system-ui,sans-serif;margin:24px}' +
    'h1{font-size:20px}h2{margin-top:28px;border-bottom:1px solid #4a3b26;padding-bottom:6px}' +
    '.meta{color:#a08f6f}' +
    '.grid{display:grid;gap:14px}.grid.wide{grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}' +
    '.grid.tall{grid-template-columns:repeat(auto-fill,minmax(160px,1fr))}' +
    'figure{margin:0}img{width:100%;height:auto;border:1px solid #4a3b26;border-radius:6px;background:#000}' +
    'figcaption{color:#c9b891;font-size:12px;margin-top:4px;text-align:center}' +
    '</style></head><body>\n<h1>Tavern Bash screenshot contact sheet</h1>' +
    '<p class="meta">seed ' + SEED + ' &middot; deviceScaleFactor 3 &middot; isMobile &middot; hasTouch &middot; ' +
    errs + ' console error(s) &middot; ' + misses + ' selector miss(es) &middot; details in console-log.json</p>\n' +
    groups + '\n</body></html>\n';
}

/* ---------- main ---------- */
async function main() {
  if (!existsSync(join(DIST, 'index.html'))) {
    console.error('dist/index.html not found. Run `npm run build` first (npm run shots does this via preshots).');
    process.exit(1);
  }
  await rm(OUT, {recursive: true, force: true});
  await mkdir(OUT, {recursive: true});
  const srv = await serveDist();
  const base = 'http://localhost:' + srv.address().port;
  console.log('serving dist/ at ' + base + ', seed ' + SEED);
  const browser = await chromium.launch({executablePath: process.env.SHOTS_CHROMIUM || undefined});
  const all = {};
  const metricsAll = {};
  try {
    for (const vp of VIEWPORTS) {
      console.log('viewport ' + vp.name);
      const res = await walkViewport(browser, base, vp);
      all[vp.name] = res.shots;
      metricsAll[vp.name] = res.metrics;
    }
  } finally {
    await browser.close();
    srv.close();
  }
  await writeFile(join(OUT, 'index.html'), contactSheetHTML(all));
  await writeFile(join(OUT, 'console-log.json'), JSON.stringify({seed: SEED, log}, null, 1) + '\n');
  await writeFile(join(OUT, 'metrics.json'), JSON.stringify({seed: SEED, viewports: metricsAll}, null, 1) + '\n');
  const errs = log.filter((l) => l.kind === 'console-error' || l.kind === 'page-error');
  const misses = log.filter((l) => l.kind === 'selector-missing');
  const total = Object.values(all).reduce((s, a) => s + a.length, 0);
  console.log(total + ' shots, ' + errs.length + ' console error(s), ' + misses.length + ' selector miss(es)');
  console.log('contact sheet: shots/index.html');
  if (errs.length) process.exitCode = 2;    /* shots still written; CI can gate on errors */
}

/* run the walk only when invoked directly (npm run shots); when shots-check.mjs
   imports the walk, the guard keeps main() from firing a second time. */
const invokedDirectly = process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
