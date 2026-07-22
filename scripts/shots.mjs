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
import {readFile, mkdir, writeFile, rm, readdir, rename} from 'node:fs/promises';
import {existsSync, realpathSync} from 'node:fs';
import {join, dirname, extname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {chromium} from '@playwright/test';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

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

/* stitch a rapid frame sequence into one wide labeled PNG an agent can read in a
   single glance: frames downscaled to a readable width, laid left to right
   (before to during to after) under a caption band with per-frame indices. This
   is the key motion deliverable, since single stills cannot show a transition. */
async function stitchFilmstrip(frameBuffers, caption, outPath) {
  const FW = 300, GAP = 6, LABEL_H = 30, PAD = 6;
  const tiles = [];
  let fh = 0;
  for (const buf of frameBuffers) {
    const r = await sharp(buf).resize({width: FW}).png().toBuffer({resolveWithObject: true});
    tiles.push(r.data); fh = r.info.height;
  }
  const n = tiles.length;
  if (!n) throw new Error('no frames');
  const stripW = PAD * 2 + n * FW + (n - 1) * GAP;
  const totalH = LABEL_H + fh + PAD;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let ticks = '';
  for (let i = 0; i < n; i++) {
    const x = PAD + i * (FW + GAP);
    ticks += '<rect x="' + x + '" y="' + LABEL_H + '" width="20" height="17" fill="#0d0a06" opacity="0.72"/>' +
      '<text x="' + (x + 4) + '" y="' + (LABEL_H + 13) + '" font-family="sans-serif" font-size="12" font-weight="bold" fill="#ffd98a">' + (i + 1) + '</text>';
  }
  const overlay = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="' + stripW + '" height="' + totalH + '">' +
    '<text x="' + PAD + '" y="20" font-family="sans-serif" font-size="15" fill="#e8dcc4">' + esc(caption) + '</text>' + ticks + '</svg>');
  const composites = [];
  for (let i = 0; i < n; i++) composites.push({input: tiles[i], left: PAD + i * (FW + GAP), top: LABEL_H});
  composites.push({input: overlay, left: 0, top: 0});
  await sharp({create: {width: stripW, height: totalH, channels: 4, background: {r: 13, g: 10, b: 6, alpha: 1}}})
    .composite(composites).png().toFile(outPath);
}

export async function walkViewport(browser, base, vp, opts = {}) {
  /* opts: {motion} captures a filmstrip across every transition boundary plus
     the extra states; {reducedMotion} emulates prefers-reduced-motion and tags
     every artifact with -rm; {videoDir} records a webm of the whole walk. The
     gate calls walkViewport with no opts, so its path stays still-only, fast,
     and metric-identical to before. */
  const MOTION = !!opts.motion;
  const REDUCED = !!opts.reducedMotion;
  const suf = REDUCED ? '-rm' : '';
  const dir = join(OUT, vp.name);
  const filmsDir = join(dir, 'films');
  await mkdir(dir, {recursive: true});
  if (MOTION) await mkdir(filmsDir, {recursive: true});
  const ctxOpts = {
    viewport: {width: vp.width, height: vp.height},
    deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  };
  if (REDUCED) ctxOpts.reducedMotion = 'reduce';
  if (opts.videoDir) ctxOpts.recordVideo = {dir: opts.videoDir, size: {width: vp.width, height: vp.height}};
  const context = await browser.newContext(ctxOpts);
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
  const filmsTaken = [];
  const metrics = {};
  page.on('console', (msg) => { if (msg.type() === 'error') note(vp.name, currentScreen, 'console-error', msg.text()); });
  page.on('pageerror', (err) => note(vp.name, currentScreen, 'page-error', err.message));

  let shotN = 0, filmN = 0;
  async function shoot(label) {
    shotN++;
    const name = String(shotN).padStart(2, '0') + '-' + label + suf + '.png';
    await page.screenshot({path: join(dir, name)});
    const file = vp.name + '/' + name;
    try { metrics[label] = Object.assign({file}, await captureMetrics(page)); }
    catch (e) { note(vp.name, currentScreen, 'metrics-failed', String(e && e.message)); metrics[label] = {file}; }
    shotsTaken.push({file, label, screen: currentScreen});
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
  async function writeFilm(label, bufs) {
    if (!bufs.length) { note(vp.name, currentScreen, 'filmstrip-empty', label); return; }
    filmN++;
    const name = String(filmN).padStart(2, '0') + '-' + label + suf + '.png';
    try {
      await stitchFilmstrip(bufs, vp.name + suf + '  ' + label + '  (before to after, ~' + bufs.length + ' frames)', join(filmsDir, name));
      filmsTaken.push({file: vp.name + '/films/' + name, label, screen: currentScreen});
    } catch (e) { note(vp.name, currentScreen, 'filmstrip-failed', label + ' ' + (e && e.message)); }
  }
  /* filmstrip across a triggered transition: one resting frame, fire the action,
     then a rapid burst. In the still-only (gate) path the trigger just runs. */
  async function filmstrip(label, trigger, o) {
    o = o || {};
    if (!MOTION) { if (trigger) await trigger(); return; }
    const frames = REDUCED ? (o.reducedFrames || 5) : (o.frames || 9);
    const interval = o.interval || 120;
    const bufs = [await page.screenshot()];
    if (trigger) { try { await trigger(); } catch (e) { note(vp.name, currentScreen, 'filmstrip-trigger', label + ' ' + (e && e.message)); } }
    for (let i = 1; i < frames; i++) { await page.waitForTimeout(interval); bufs.push(await page.screenshot()); }
    await writeFilm(label, bufs);
  }
  /* filmstrip that captures until a selector appears (a time based transition
     with no click to fire, e.g. the fight resolving into the recap). In the
     still-only path it just settles the selector. */
  async function filmstripUntil(label, sel, o) {
    o = o || {};
    if (!MOTION) { await settle(sel, o.settleMs || 45000); return; }
    const maxFrames = o.maxFrames || 16, interval = o.interval || 150;
    const bufs = [];
    let seen = false, after = 0;
    for (let i = 0; i < maxFrames; i++) {
      bufs.push(await page.screenshot());
      if (!seen) seen = !!(await page.$(sel));
      else if (++after >= 2) break;
      await page.waitForTimeout(interval);
    }
    await settle(sel, o.settleMs || 20000);
    await writeFilm(label, bufs);
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

  /* 02 hero pick (boundary: intro to hero) */
  currentScreen = '02-hero-pick';
  await filmstrip('intro-hero', () => tap('#inNew'));
  if (await settle('.heropick')) {
    await tap('.herochip:not(.lockd)', 3000); /* first open merchant, detail fills */
    await page.waitForTimeout(300);
  }
  await shoot('hero-pick');

  /* 03 road pick (boundary: hero to road) */
  currentScreen = '03-road-pick';
  await filmstrip('hero-road', () => tap('#heroGo'));
  await settle('#modeQuick');
  await page.waitForTimeout(300);
  await shoot('road-pick');

  /* 04 omen reveal (boundary: road to omen) */
  currentScreen = '04-omen-reveal';
  await filmstrip('road-omen', () => tap('#modeQuick'));
  await settle('.card.reveal');
  await page.waitForTimeout(400);            /* rays and icon settle */
  await shoot('omen-reveal');

  /* 05 first market (boundary: omen to market), buy offense, then shoot */
  currentScreen = '05-market-first';
  await filmstrip('omen-market', () => tap('#rvGo'));
  await settle('#main.draft .ware');
  await page.waitForTimeout(400);
  const bought = await buyAffordable(page);
  note(vp.name, currentScreen, 'bought', bought.join(', ') || 'nothing affordable');
  await page.waitForTimeout(400);
  await shoot('market-first');

  /* 06 route map (boundary: market to map) */
  currentScreen = '06-route-map';
  await filmstrip('market-map', () => tap('#btnGo'));
  await settle('.rmplot');
  await page.waitForTimeout(400);
  await shoot('route-map');

  /* 07 scout a monster (boundary: map to scout): tap a reachable monster door */
  currentScreen = '07-scout-monster';
  let scouted = false;
  await filmstrip('map-scout', async () => {
    scouted = await tap('.rmnode.reach.t-monster', 5000) || await tap('.rmnode.t-monster', 3000) || await tap('.rmnode.reach', 3000);
  });
  if (scouted) { await settle('.rmprev .rmpbody', 4000); await page.waitForTimeout(300); }
  await shoot('scout-monster');

  /* 08 to 10 the fight: commit (boundary: scout to fight), then photograph
     three real combat states before the opener can resolve. The harness pauses
     only while each screenshot is encoded; between stills the seeded sim runs
     normally. This keeps numbered fight evidence out of the victory recap. */
  currentScreen = '08-fight';
  let committed = false;
  await filmstrip('scout-fight', async () => { committed = await tap('.rmpfoot [data-a="challenge"]', 5000); }, {frames: 4, interval: 90, reducedFrames: 3});
  if (committed && await settle('#main.fight', 6000)) {
    const dusk = await page.$('.dusk.skippable');
    if (dusk) await dusk.click();
    const shootLiveFight = async (label) => {
      await page.waitForTimeout(150);
      const live = await page.evaluate(() => {
        try {
          const g = window.BBDEV && window.BBDEV.g();
          if (!g || g.phase !== 'fight' || document.querySelector('.recapcard')) return false;
          g.fpaused = true;
          return true;
        } catch (e) { return false; }
      });
      if (!live) { note(vp.name, currentScreen, 'fight-still-missed', label + ' reached the recap'); return false; }
      await shoot(label);
      await page.evaluate(() => { try { const g = window.BBDEV && window.BBDEV.g(); if (g) g.fpaused = false; } catch (e) {} });
      return true;
    };
    await shootLiveFight('fight-frame-1');
    await shootLiveFight('fight-frame-2');
    await shootLiveFight('fight-frame-3');
    /* full-fight now begins on the active boards and follows them into recap */
    await filmstrip('full-fight', null, {frames: 16, interval: 110, reducedFrames: 6});
  } else {
    note(vp.name, currentScreen, 'selector-missing', 'fight never started; shooting current screen');
    await shoot('fight-missing');
  }

  /* 11 victory recap (boundary: fight to victory), or defeat, recorded honestly */
  currentScreen = '11-victory';
  await filmstripUntil('fight-victory', '.recapcard', {maxFrames: 20, interval: 150, settleMs: 45000});
  if (await page.$('.recapcard')) {
    const won = await page.$('.recapcard.rewin');
    if (!won) note(vp.name, currentScreen, 'outcome', 'defeat instead of victory at seed ' + SEED);
    await page.waitForTimeout(400);
    await shoot(won ? 'victory' : 'defeat');
    await filmstrip('victory-market', () => tap('#recapGo'));
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

  /* 12 back to a market node, capturing the round-rollover dawn on entry */
  currentScreen = '12-market-return';
  if (await settle('.rmplot', 10000)) {
    const reached = await tap('.rmnode.reach.t-market', 4000);
    let entered = false;
    if (reached) { await filmstrip('dawn-rollover', () => tap('.rmpfoot [data-a="enter"]', 4000), {frames: 12, interval: 160, reducedFrames: 6}); entered = true; }
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

  /* extra states, motion pass only, each best effort: a full shelf, an
     empty-board fight and its defeat, a boss fight if reachable, an offline
     load. Unreachable states are logged and skipped, never fatal. */
  if (MOTION && opts.extraStates) {
    const driveToFirstMarket = async () => {
      await page.goto(base + '/sw.js');
      await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
      await page.goto(base + '/?seed=' + SEED);
      if (!await settle('#intro.bgready', 6000)) return false;
      await tap('#inNew');
      if (!await settle('.heropick')) return false;
      await tap('.herochip:not(.lockd)', 3000); await page.waitForTimeout(200);
      await tap('#heroGo');
      if (!await settle('#modeQuick')) return false;
      await tap('#modeQuick');
      if (!await settle('.card.reveal')) return false;
      await tap('#rvGo');
      return await settle('#main.draft .ware', 8000);
    };

    /* full shop shelf: raise gold and the shelf count through the dev hook, then
       buy until the board fills */
    currentScreen = 'S1-shop-full';
    try {
      if (await driveToFirstMarket()) {
        await page.evaluate(() => { try { const G = window.BBDEV.g(); G.gold = 999; if (G.A) G.A.shopN = 6; window.BBDEV.rollShop(); window.BBDEV.renderAll(); } catch (e) {} });
        await settle('#main.draft .ware', 4000); await page.waitForTimeout(300);
        await buyAffordable(page); await page.waitForTimeout(400);
        await shoot('state-shop-full');
      } else note(vp.name, currentScreen, 'state-unreachable', 'full shop: could not reach market');
    } catch (e) { note(vp.name, currentScreen, 'state-error', String(e && e.message)); }

    /* empty-board fight and the defeat it usually produces */
    currentScreen = 'S2-empty-board-fight';
    try {
      if (await driveToFirstMarket()) {
        await tap('#btnGo');
        if (await settle('.rmplot', 6000)) {
          const s = await tap('.rmnode.reach.t-monster', 5000) || await tap('.rmnode.t-monster', 3000) || await tap('.rmnode.reach', 3000);
          if (s && await tap('.rmpfoot [data-a="challenge"]', 5000) && await settle('#main.fight', 6000)) {
            await filmstrip('state-empty-board-fight', null, {frames: 10, interval: 220, reducedFrames: 5});
            await shoot('state-empty-board-fight');
            currentScreen = 'S3-defeat';
            await filmstripUntil('state-fight-end', '.recapcard', {maxFrames: 26, interval: 200, settleMs: 45000});
            if (await page.$('.recapcard')) await shoot(await page.$('.recapcard.rewin') ? 'state-fight-result' : 'defeat');
            else note(vp.name, currentScreen, 'state-unreachable', 'empty-board fight did not resolve to a recap');
          } else note(vp.name, currentScreen, 'state-unreachable', 'empty-board fight: could not commit');
        }
      } else note(vp.name, currentScreen, 'state-unreachable', 'empty-board fight: could not reach market');
    } catch (e) { note(vp.name, currentScreen, 'state-error', String(e && e.message)); }

    /* boss or gate fight: the dev hook opens the gate camp so the boss inspect
       is reachable without a four-district run; the fight itself needs a deep
       run, so if the camp is absent the state is logged and skipped */
    currentScreen = 'S4-boss';
    try {
      const camp = await page.evaluate(() => { try { return window.BBDEV.openGateCamp ? (window.BBDEV.openGateCamp(), true) : false; } catch (e) { return false; } });
      if (camp && await settle('.campboss', 5000)) { await page.waitForTimeout(400); await shoot('state-boss-gate'); }
      else note(vp.name, currentScreen, 'state-unreachable', 'boss or gate fight not reachable from the opener (needs a deep run)');
    } catch (e) { note(vp.name, currentScreen, 'state-error', String(e && e.message)); }

    /* offline load: production skips automatic service-worker registration on
       localhost. Register it explicitly, reload once under its control so the
       current build assets enter the cache, then disconnect and reload again. */
    currentScreen = 'S5-offline';
    try {
      await context.setOffline(false);
      await page.goto(base + '/?seed=' + SEED, {waitUntil: 'domcontentloaded', timeout: 8000});
      const registered = await page.evaluate(async () => {
        try {
          if (!('serviceWorker' in navigator)) return false;
          await navigator.serviceWorker.register('/sw.js');
          await navigator.serviceWorker.ready;
          return true;
        } catch (e) { return false; }
      });
      if (!registered) note(vp.name, currentScreen, 'state-unreachable', 'offline service worker registration failed');
      await page.reload({waitUntil: 'domcontentloaded', timeout: 8000});
      await page.waitForTimeout(700);
      const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
      if (!controlled) note(vp.name, currentScreen, 'state-unreachable', 'offline page never became service-worker controlled');
      await context.setOffline(true);
      await page.reload({waitUntil: 'domcontentloaded', timeout: 8000});
      await settle('#app', 5000);
      await page.waitForTimeout(700);
      const readable = await page.evaluate(() => !!document.body && document.body.innerText.trim().length > 0);
      if (!readable) note(vp.name, currentScreen, 'blank-offline', 'service-worker reload had no readable UI');
      await shoot(readable ? 'state-offline-ready' : 'state-offline-blank');
      await context.setOffline(false);
    } catch (e) { note(vp.name, currentScreen, 'state-error', String(e && e.message)); await context.setOffline(false).catch(() => {}); }
  }

  let videoRel = null;
  const video = opts.videoDir ? page.video() : null;
  await context.close();
  if (video) { try { videoRel = await video.path(); } catch (e) { note(vp.name, 'video', 'video-failed', String(e && e.message)); } }
  return {shots: shotsTaken, films: filmsTaken, metrics, video: videoRel};
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
/* all[vp.name] = {shots:[{file,label,screen}], films:[...], video} (with motion)
   or a bare shots array (the legacy still-only shape). Grouped by screen so each
   screen shows its stills, filmstrips, and reduced-motion variants together. */
export function contactSheetHTML(all) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const isRm = (x) => /-rm$/.test(x.label || '');
  const stillTile = (s) => '<figure class="' + (isRm(s) ? 'rm' : '') + '"><a href="' + s.file + '"><img loading="lazy" src="' + s.file + '" alt="' + esc(s.label) + '"></a>' +
    '<figcaption>' + esc(s.label) + (isRm(s) ? ' (reduced motion)' : '') + '</figcaption></figure>';
  const filmTile = (s) => '<figure class="film ' + (isRm(s) ? 'rm' : '') + '"><a href="' + s.file + '"><img loading="lazy" src="' + s.file + '" alt="' + esc(s.label) + '"></a>' +
    '<figcaption>filmstrip &middot; ' + esc(s.label) + (isRm(s) ? ' (reduced motion)' : '') + '</figcaption></figure>';
  const groups = VIEWPORTS.map((vp) => {
    const d = all[vp.name] || {};
    const shots = Array.isArray(d) ? d : (d.shots || []);
    const films = Array.isArray(d) ? [] : (d.films || []);
    const video = Array.isArray(d) ? null : d.video;
    const order = [], seen = new Set();
    for (const s of shots.concat(films)) { const k = s.screen || 'misc'; if (!seen.has(k)) { seen.add(k); order.push(k); } }
    const blocks = order.map((k) => {
      const st = shots.filter((s) => (s.screen || 'misc') === k);
      const fm = films.filter((s) => (s.screen || 'misc') === k);
      return '<h3>' + esc(k) + '</h3>' +
        (st.length ? '<div class="grid ' + (vp.width > vp.height ? 'wide' : 'tall') + '">' + st.map(stillTile).join('') + '</div>' : '') +
        (fm.length ? '<div class="films">' + fm.map(filmTile).join('') + '</div>' : '');
    }).join('\n');
    const vid = video ? '<p class="meta">walk video: <a href="' + video + '">' + esc(video) + '</a></p>' : '';
    return '<h2>' + vp.name + (vp.width > vp.height ? ' (landscape, primary)' : ' (portrait)') + '</h2>' + vid + '\n' + blocks;
  }).join('\n');
  const errs = log.filter((l) => l.kind === 'console-error' || l.kind === 'page-error').length;
  const misses = log.filter((l) => l.kind === 'selector-missing').length;
  const unreach = log.filter((l) => l.kind === 'state-unreachable').length;
  return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Tavern Bash shots &middot; seed ' + SEED + '</title>\n<style>' +
    'body{background:#14100b;color:#e8dcc4;font:14px/1.5 system-ui,sans-serif;margin:24px}' +
    'h1{font-size:20px}h2{margin-top:30px;border-bottom:1px solid #4a3b26;padding-bottom:6px}' +
    'h3{margin:22px 0 8px;font-size:14px;color:#ffd98a;letter-spacing:.3px}' +
    '.meta{color:#a08f6f}' +
    '.grid{display:grid;gap:14px}.grid.wide{grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}' +
    '.grid.tall{grid-template-columns:repeat(auto-fill,minmax(160px,1fr))}' +
    '.films{display:flex;flex-direction:column;gap:14px;margin-top:12px}' +
    '.films figure{overflow-x:auto;border:1px solid #5a4a2e;border-radius:6px;background:#0d0a06;padding:0}' +
    '.films img{width:auto;max-width:none;height:150px;border:0;border-radius:0}' +
    'figure{margin:0}img{width:100%;height:auto;border:1px solid #4a3b26;border-radius:6px;background:#000}' +
    'figure.rm figcaption{color:#9fb4d8}figure.rm{outline:1px dashed rgba(159,180,216,.4);outline-offset:2px;border-radius:7px}' +
    'figcaption{color:#c9b891;font-size:12px;margin-top:4px;text-align:center}' +
    '.films figcaption{text-align:left;padding:4px 8px}' +
    '</style></head><body>\n<h1>Tavern Bash contact sheet: stills, filmstrips, and states</h1>' +
    '<p class="meta">seed ' + SEED + ' &middot; deviceScaleFactor 3 &middot; isMobile &middot; hasTouch &middot; ' +
    errs + ' console error(s) &middot; ' + misses + ' selector miss(es) &middot; ' + unreach + ' state(s) unreachable &middot; details in console-log.json</p>\n' +
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
  let filmCount = 0;
  try {
    for (const vp of VIEWPORTS) {
      /* normal motion pass: filmstrips at every boundary, the extra states, and
         a webm of the whole walk */
      console.log('viewport ' + vp.name + ' (motion)');
      const videoDir = join(OUT, vp.name, 'video');
      await mkdir(videoDir, {recursive: true});
      const normal = await walkViewport(browser, base, vp, {motion: true, extraStates: true, videoDir});
      /* reduced-motion pass: the whole walk again with prefers-reduced-motion */
      console.log('viewport ' + vp.name + ' (reduced motion)');
      const reduced = await walkViewport(browser, base, vp, {motion: true, reducedMotion: true});
      /* rename the recorded video to a stable name */
      let videoRel = null;
      if (normal.video) {
        try { await rename(normal.video, join(OUT, vp.name, 'walk.webm')); videoRel = vp.name + '/walk.webm'; await rm(videoDir, {recursive: true, force: true}); }
        catch (e) { videoRel = null; }
      }
      all[vp.name] = {
        shots: normal.shots.concat(reduced.shots),
        films: normal.films.concat(reduced.films),
        video: videoRel
      };
      metricsAll[vp.name] = normal.metrics;
      filmCount += normal.films.length + reduced.films.length;
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
  const unreach = log.filter((l) => l.kind === 'state-unreachable');
  const total = Object.values(all).reduce((s, a) => s + (a.shots ? a.shots.length : a.length), 0);
  console.log(total + ' stills, ' + filmCount + ' filmstrips, ' + errs.length + ' console error(s), ' + misses.length + ' selector miss(es), ' + unreach.length + ' state(s) unreachable');
  console.log('contact sheet: shots/index.html');
  if (errs.length) process.exitCode = 2;    /* artifacts still written; CI can gate on errors */
}

/* run the walk only when invoked directly (npm run shots); when shots-check.mjs
   imports the walk, the guard keeps main() from firing a second time. */
const invokedDirectly = process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
