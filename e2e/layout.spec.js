import {test, expect} from '@playwright/test';

/* drive a fresh route to the map screen through the real UI, using the
   localhost-only BBDEV-free path (plain clicks) so the test exercises what a
   player does */
async function toMap(page) {
  await page.goto('/');
  await page.evaluate(() => {
    try { localStorage.removeItem('bb-route-run'); localStorage.removeItem('bb-run'); } catch (e) {}
  });
  await page.reload();
  await page.click('#inNew');
  await page.click('#heroGo');
  await page.click('#rvGo');
  await page.click('#btnGo');
  await page.waitForSelector('.rmplot');
  await page.click('.rmnode.reach');           /* select one node so the preview populates */
  await page.waitForSelector('.rmpfoot .btn');
}

test('the page never scrolls past the viewport', async ({page}) => {
  await toMap(page);
  const vp = page.viewportSize();
  const doc = await page.evaluate(() => ({
    w: document.documentElement.scrollWidth,
    h: document.documentElement.scrollHeight
  }));
  expect(doc.w, 'no horizontal overflow').toBeLessThanOrEqual(vp.width + 1);
  expect(doc.h, 'no vertical overflow').toBeLessThanOrEqual(vp.height + 1);
});

test('every route node is at least a 44px touch target and none overlap', async ({page}) => {
  await toMap(page);
  const boxes = await page.$$eval('.rmnode', els => els.map(e => {
    const r = e.getBoundingClientRect();
    return {x: r.x, y: r.y, w: r.width, h: r.height};
  }));
  expect(boxes.length).toBeGreaterThan(0);
  for (const b of boxes) {
    expect(Math.min(b.w, b.h), 'node touch target').toBeGreaterThanOrEqual(44);
  }
  let overlaps = 0;
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) overlaps++;
  }
  expect(overlaps, 'nodes do not overlap').toBe(0);
});

test('the boss node stays inside the plot', async ({page}) => {
  await toMap(page);
  const fit = await page.evaluate(() => {
    const plot = document.querySelector('.rmplot').getBoundingClientRect();
    const boss = document.querySelector('.rmnode.boss').getBoundingClientRect();
    return boss.left >= plot.left - 1 && boss.right <= plot.right + 1 &&
           boss.top >= plot.top - 1 && boss.bottom <= plot.bottom + 1;
  });
  expect(fit, 'boss within plot bounds').toBe(true);
});

test('the preview action footer is visible without scrolling', async ({page}) => {
  await toMap(page);
  const ok = await page.evaluate(() => {
    const prev = document.querySelector('.rmprev').getBoundingClientRect();
    const foot = document.querySelector('.rmpfoot').getBoundingClientRect();
    return foot.bottom <= prev.bottom + 1 && foot.top >= prev.top - 1;
  });
  expect(ok, 'footer pinned inside preview').toBe(true);
  const btnH = await page.$$eval('.rmpfoot .btn', els => els.map(e => e.getBoundingClientRect().height));
  for (const h of btnH) expect(h, 'action button height').toBeGreaterThanOrEqual(44);
});

test('the connector layer swallows no clicks', async ({page}) => {
  await toMap(page);
  const pe = await page.$eval('.rmedges', el => getComputedStyle(el).pointerEvents);
  expect(pe).toBe('none');
});

test('the rotate curtain never covers the route', async ({page}) => {
  await toMap(page);
  const disp = await page.$eval('#rotate', el => getComputedStyle(el).display);
  expect(disp, 'rotate curtain hidden in route mode').toBe('none');
});

test('the run debrief and export controls fit the end overlay', async ({page}) => {
  await toMap(page);
  await page.evaluate(() => window.BBDEV.routeEnd('won'));
  await page.waitForSelector('#reGo');
  const fit = await page.evaluate(() => {
    const vp = {w: document.documentElement.clientWidth, h: document.documentElement.clientHeight};
    const card = document.querySelector('.ov .card').getBoundingClientRect();
    const buttons = Array.from(document.querySelectorAll('.rendbtns .btn')).map(b => b.getBoundingClientRect());
    const debrief = document.querySelector('.rdebrief');
    return {
      cardFitsWidth: card.left >= -1 && card.right <= vp.w + 1,
      overlayScrolls: document.querySelector('.ov').scrollHeight <= vp.h + 1 || getComputedStyle(document.querySelector('.ov')).overflowY === 'auto',
      buttonsTall: buttons.every(b => b.height >= 44),
      debriefVisible: !!debrief && debrief.getBoundingClientRect().width > 0
    };
  });
  expect(fit).toEqual({cardFitsWidth: true, overlayScrolls: true, buttonsTall: true, debriefVisible: true});
});
