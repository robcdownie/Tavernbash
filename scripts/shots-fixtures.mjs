"use strict";

/* Reusable deterministic presentation states. These helpers drive only the
   localhost build and use the same public controls and BBDEV hooks as the full
   screenshot walk. They never import game source or mutate production data. */

export const PHONE_USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const CAPTURE_SETTLE_MS = 950;

export function phoneContextOptions(viewport, reducedMotion = false) {
  const options = {
    viewport: {width: viewport.width, height: viewport.height},
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: PHONE_USER_AGENT
  };
  if (reducedMotion) options.reducedMotion = 'reduce';
  return options;
}

export async function settle(page, selector, timeout = 8000, report = null) {
  try {
    await page.waitForSelector(selector, {timeout});
    return true;
  } catch (error) {
    if (report) report('selector-missing', selector);
    return false;
  }
}

export async function tap(page, selector, timeout = 8000, report = null) {
  if (!await settle(page, selector, timeout, report)) return false;
  try {
    await page.click(selector, {timeout: 3000});
    return true;
  } catch (error) {
    if (report) report('click-failed', selector + ' ' + error.message);
    return false;
  }
}

export async function resetSeededPage(page, base, seed, report = null) {
  await page.goto(base + '/sw.js');
  await page.evaluate(() => {
    try { localStorage.clear(); } catch (error) {}
  });
  await page.goto(base + '/?seed=' + seed);
  return await settle(page, '#intro.bgready', 6000, report);
}

export async function buyAffordable(page) {
  const bought = [];
  for (let pass = 0; pass < 8; pass++) {
    const idx = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.ware[data-w]'))
        .filter((card) => !card.classList.contains('gone') && !card.classList.contains('cant'));
      if (!cards.length) return null;
      try {
        const rank = {dmg: 0, burn: 1, poison: 2, heal: 3, shield: 4};
        const shop = window.BBDEV.g().run.economy.shop;
        const items = window.BB.ITEMS;
        cards.sort((a, b) => {
          const catA = items[shop[+a.dataset.w].id].cat;
          const catB = items[shop[+b.dataset.w].id].cat;
          return (rank[catA] ?? 9) - (rank[catB] ?? 9) || (+a.dataset.w) - (+b.dataset.w);
        });
      } catch (error) {}
      return cards[0].dataset.w;
    });
    if (idx == null) break;
    try {
      await page.click('.ware[data-w="' + idx + '"]');
      await page.waitForSelector('#shopBuy', {timeout: 3000});
      const canBuy = await page.$eval('#shopBuy', (button) => !button.disabled);
      if (!canBuy) {
        await page.click('#shopClose');
        break;
      }
      const name = await page.$eval('.inspectcard .nm', (card) => card.textContent).catch(() => 'ware');
      await page.click('#shopBuy');
      bought.push(name.trim());
      await page.waitForTimeout(500);
    } catch (error) {
      break;
    }
  }
  return bought;
}

async function driveHeroPick(page, base, seed, report) {
  if (!await resetSeededPage(page, base, seed, report)) return false;
  if (!await tap(page, '#inNew', 5000, report)) return false;
  if (!await settle(page, '.heropick', 5000, report)) return false;
  await tap(page, '.herochip:not(.lockd)', 3000, report);
  await page.waitForTimeout(250);
  return true;
}

async function driveRoadPick(page, base, seed, report) {
  if (!await driveHeroPick(page, base, seed, report)) return false;
  if (!await tap(page, '#heroGo', 5000, report)) return false;
  return await settle(page, '#modeQuick', 5000, report);
}

async function driveOmen(page, base, seed, report) {
  if (!await driveRoadPick(page, base, seed, report)) return false;
  if (!await tap(page, '#modeQuick', 5000, report)) return false;
  return await settle(page, '.card.reveal', 5000, report);
}

export async function driveFirstMarket(page, base, seed, report = null, buy = true) {
  if (!await driveOmen(page, base, seed, report)) return false;
  if (!await tap(page, '#rvGo', 5000, report)) return false;
  if (!await settle(page, '#main.draft .ware', 8000, report)) return false;
  if (buy) await buyAffordable(page);
  await page.waitForFunction(() => !document.querySelector('.bark'), {timeout: 4000}).catch(() => {});
  await page.waitForTimeout(350);
  return true;
}

async function driveRouteMap(page, base, seed, report) {
  if (!await driveFirstMarket(page, base, seed, report, true)) return false;
  if (!await tap(page, '#btnGo', 5000, report)) return false;
  return await settle(page, '.rmplot', 6000, report);
}

async function driveScout(page, base, seed, report) {
  if (!await driveRouteMap(page, base, seed, report)) return false;
  const selected = await tap(page, '.rmnode.reach.t-monster', 5000, report) ||
    await tap(page, '.rmnode.t-monster', 3000, report) ||
    await tap(page, '.rmnode.reach', 3000, report);
  if (!selected) return false;
  return await settle(page, '.rmprev .rmpbody', 5000, report);
}

async function driveGateCamp(page, base, seed, report) {
  if (!await driveFirstMarket(page, base, seed, report, true)) return false;
  const opened = await page.evaluate(() => {
    try {
      if (!window.BBDEV || !window.BBDEV.openGateCamp) return false;
      window.BBDEV.openGateCamp();
      return true;
    } catch (error) {
      return false;
    }
  });
  if (!opened) {
    if (report) report('state-unreachable', 'BBDEV.openGateCamp unavailable');
    return false;
  }
  return await settle(page, '.campboss', 5000, report);
}

async function driveEmptyBoardFight(page, base, seed, report) {
  if (!await driveFirstMarket(page, base, seed, report, false)) return false;
  if (!await tap(page, '#btnGo', 5000, report)) return false;
  if (!await settle(page, '.rmplot', 6000, report)) return false;
  const selected = await tap(page, '.rmnode.reach.t-monster', 5000, report) ||
    await tap(page, '.rmnode.t-monster', 3000, report) ||
    await tap(page, '.rmnode.reach', 3000, report);
  if (!selected) return false;
  await page.evaluate(() => {
    try {
      clearInterval(window.__shotsFixtureFightPause);
      window.__shotsFixtureFightPause = setInterval(() => {
        try {
          const game = window.BBDEV && window.BBDEV.g();
          if (game && game.phase === 'fight') {
            game.fpaused = true;
            clearInterval(window.__shotsFixtureFightPause);
          }
        } catch (error) {}
      }, 8);
      setTimeout(() => clearInterval(window.__shotsFixtureFightPause), 5000);
    } catch (error) {}
  });
  if (!await tap(page, '.rmpfoot [data-a="challenge"]', 5000, report)) return false;
  return await settle(page, '#main.fight', 6000, report);
}

async function driveRunEnd(page, base, seed, report) {
  if (!await driveFirstMarket(page, base, seed, report, true)) return false;
  const opened = await page.evaluate(() => {
    try {
      window.BBDEV.routeEnd('won');
      return true;
    } catch (error) {
      return false;
    }
  });
  if (!opened) {
    if (report) report('state-unreachable', 'BBDEV.routeEnd unavailable');
    return false;
  }
  return await settle(page, '#reGo', 6000, report);
}

export const FIXTURES = {
  intro: {
    selector: '#intro.bgready',
    sources: ['index.html', 'src/ui.js'],
    open: (page, base, seed, report) => resetSeededPage(page, base, seed, report)
  },
  'hero-pick': {
    selector: '.heropick',
    sources: ['index.html', 'src/ui.js'],
    open: driveHeroPick
  },
  'road-pick': {
    selector: '#modeQuick',
    sources: ['index.html', 'src/ui.js'],
    open: driveRoadPick
  },
  'omen-reveal': {
    selector: '.card.reveal',
    sources: ['index.html', 'src/ui.js'],
    open: driveOmen
  },
  'market-first': {
    selector: '#main.draft .ware',
    sources: ['index.html', 'src/ui.js'],
    open: (page, base, seed, report) => driveFirstMarket(page, base, seed, report, true)
  },
  'route-map': {
    selector: '.rmplot',
    sources: ['index.html', 'src/route-ui.js'],
    open: driveRouteMap
  },
  'scout-monster': {
    selector: '.rmprev .rmpbody',
    sources: ['index.html', 'src/route-ui.js'],
    open: driveScout
  },
  'state-boss-gate': {
    selector: '.campboss',
    sources: ['index.html', 'src/ui.js'],
    open: driveGateCamp
  },
  'state-empty-board-fight': {
    selector: '#main.fight',
    sources: ['index.html', 'src/ui.js'],
    open: driveEmptyBoardFight
  },
  'run-end': {
    selector: '#reGo',
    sources: ['index.html', 'src/ui.js'],
    open: driveRunEnd
  }
};

export function fixtureNames() {
  return Object.keys(FIXTURES);
}

export async function openFixture(page, base, seed, name, report = null) {
  const fixture = FIXTURES[name];
  if (!fixture) throw new Error('unknown fixture ' + name + '. Choose: ' + fixtureNames().join(', '));
  const opened = await fixture.open(page, base, seed, report);
  if (!opened) throw new Error('fixture did not reach ' + name);
  await page.waitForTimeout(CAPTURE_SETTLE_MS);
  return fixture;
}
