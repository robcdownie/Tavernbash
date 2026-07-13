import {test, expect} from '@playwright/test';

/* Crash-recovery matrix: reach a phase, reload the page (an iOS tab-kill leaves
   only localStorage), continue, and assert the real restoreRoute/resumeRoutePhase
   path recovers it. Drives through the localhost-only BBDEV console hooks. */

async function freshRoute(page) {
  await page.goto('/');
  await page.evaluate(() => { try { localStorage.removeItem('bb-route-run'); localStorage.removeItem('bb-run'); } catch (e) {} });
  await page.reload();
  await page.click('#inNew');
  await page.click('#heroGo');
  await page.click('#rvGo');
  await page.click('#btnGo');                 /* set out from the opening stall */
  await page.waitForSelector('.rmplot');
}
async function reloadAndContinue(page) {
  await page.reload();
  await page.waitForSelector('#ctGo');
  await page.click('#ctGo');
}
/* commit the first frontier node (always a column-1 Monster Door) and start its fight */
async function startFirstFight(page) {
  return page.evaluate(() => {
    const G = window.BBDEV.g();
    const mon = window.BBDEV.frontier()[0];
    window.BBDEV.dispatchRoute({type: 'commit', nodeId: mon, choice: 'challenge'});
    if (G.fiv) { clearInterval(G.fiv); G.fiv = null; }   /* the preview freezes the fight; stop the timer */
    return window.BBDEV.routeState().fightSeed;
  });
}

test('the economy accessors stay canonical with the run aggregate', async ({page}) => {
  await freshRoute(page);
  const ok = await page.evaluate(() => {
    const G = window.BBDEV.g();
    const before = G.gold;
    G.gold += 5;                                    /* setter writes through */
    const wroteThrough = G.run.economy.gold === before + 5;
    const sameBoard = G.board === G.run.economy.board;   /* getter returns the live array */
    const sameShop = G.shop === G.run.economy.shop;
    G.gold = before;                                /* restore */
    return {wroteThrough, sameBoard, sameShop, restored: G.gold === before};
  });
  expect(ok).toEqual({wroteThrough: true, sameBoard: true, sameShop: true, restored: true});
});

test('every ware and offer carries a unique durable id, disjoint across the pools', async ({page}) => {
  await freshRoute(page);
  const r = await page.evaluate(() => {
    const G = window.BBDEV.g();
    window.BBDEV.rollShop();                          /* stamp a fresh set of offers */
    const wareIds = G.board.map(w => w.iid).concat(G.vault.map(w => w.iid));
    const offerIds = G.shop.map(o => o.offerId);
    const all = wareIds.concat(offerIds);
    return {
      allInts: all.every(Number.isInteger),           /* nothing left unstamped */
      unique: new Set(all).size === all.length,        /* wares and offers never collide */
      nextAboveMax: G.run.ids.nextItem > Math.max(...all),
      shopN: offerIds.length
    };
  });
  expect(r.shopN).toBeGreaterThan(0);
  expect(r.allInts).toBe(true);
  expect(r.unique).toBe(true);
  expect(r.nextAboveMax).toBe(true);
});

test('durable ids are stable across a reload (v2 save persistence)', async ({page}) => {
  await freshRoute(page);
  const before = await page.evaluate(() => {
    const G = window.BBDEV.g();
    return {board: G.board.map(w => w.iid), gold: G.gold};
  });
  await reloadAndContinue(page);
  await page.waitForSelector('.rmplot');
  const after = await page.evaluate(() => {
    const G = window.BBDEV.g();
    return {board: G.board.map(w => w.iid), gold: G.gold, schemaV: G.run.schemaVersion};
  });
  expect(after.schemaV).toBe(2);
  expect(after.board).toEqual(before.board);   /* same iids, not renumbered */
  expect(after.gold).toBe(before.gold);
});

test('a legacy v1 save migrates to v2 and continues on load', async ({page}) => {
  await freshRoute(page);
  /* craft a faithful v1 save from the live v2 one (strip the durable ids and
     flatten the shape) so the migration path is exercised end to end */
  await page.evaluate(() => {
    const v2 = JSON.parse(localStorage.getItem('bb-route-run'));
    const e = v2.run.economy;
    const plainW = w => ({id: w.id, rarity: w.rarity, size: w.size, ench: w.ench});
    const v1 = {
      saveVersion: 1, mapVersion: v2.mapVersion,
      routeState: v2.run.route, phase: 'routeMap',
      run: {seed: v2.run.seed, hero: v2.setup.hero, anom: v2.setup.anom, tags: v2.setup.tags,
        gold: e.gold, tier: e.tier, tierCost: e.tierCost, relicIncome: e.relicIncome,
        frozen: e.frozen, freeReroll: e.freeReroll, fightN: v2.fightN,
        board: e.board.map(plainW), vault: e.vault.map(plainW),
        shop: e.shop.map(o => ({id: o.id, free: o.free, bought: o.bought, ench: o.ench})),
        trinkets: e.trinkets},
      market: v2.market, opening: v2.opening, combat: v2.combat
    };
    localStorage.setItem('bb-route-run', JSON.stringify(v1));
  });
  await reloadAndContinue(page);
  await page.waitForSelector('.rmplot');
  const after = await page.evaluate(() => {
    const G = window.BBDEV.g();
    const ids = G.board.map(w => w.iid).concat(G.shop.map(o => o.offerId));
    return {
      schemaV: G.run.schemaVersion,
      allStamped: G.board.every(w => Number.isInteger(w.iid)),
      nextAboveMax: ids.length === 0 || G.run.ids.nextItem > Math.max(...ids),
      gold: G.gold
    };
  });
  expect(after.schemaV).toBe(2);           /* migrated */
  expect(after.allStamped).toBe(true);     /* wares got ids */
  expect(after.nextAboveMax).toBe(true);
});

test('an interrupted gild reward reopens on reload and its fixed gold is not re-paid', async ({page}) => {
  await freshRoute(page);
  const before = await page.evaluate(() => {
    const G = window.BBDEV.g();
    const gold0 = G.gold;
    /* apply a fixed gold reward that also owes a gild choice, then checkpoint as
       the real settlement does, leaving the choice pending */
    window.BBDEV.settleFixed({gold: 5, drained: 0, items: [], relic: false, mote: null, choice: 'gild'}, 'testgild');
    window.BBDEV.checkpoint();
    return {gold: G.gold, gold0, pending: !!G.run.pendingChoice};
  });
  expect(before.pending).toBe(true);
  expect(before.gold).toBe(before.gold0 + 5);
  await reloadAndContinue(page);
  const after = await page.evaluate(() => {
    const G = window.BBDEV.g();
    return {gold: G.gold, pending: !!G.run.pendingChoice, overlay: !!document.querySelector('.picks')};
  });
  expect(after.pending).toBe(true);       /* the choice reopened */
  expect(after.overlay).toBe(true);       /* its overlay is showing */
  expect(after.gold).toBe(before.gold);   /* fixed gold was NOT applied a second time */
});

test('choosing a gild reward then reloading does not re-offer or double-apply it', async ({page}) => {
  await freshRoute(page);
  const setup = await page.evaluate(() => {
    const G = window.BBDEV.g();
    const iid = G.board[0] && G.board[0].iid;
    const rarity0 = G.board[0] && G.board[0].rarity;
    window.BBDEV.settleFixed({gold: 0, drained: 0, items: [], relic: false, mote: null, choice: 'gild'}, 'testgild2');
    window.BBDEV.checkpoint();
    window.BBDEV.presentAfterReward();               /* open the overlay */
    const pick = document.querySelector('.pick[data-g="' + iid + '"]');
    if (pick) pick.click();                          /* choose the gild */
    const w = G.board.filter(x => x.iid === iid)[0] || {};
    return {iid, rarity0, rarityAfter: w.rarity, pending: !!G.run.pendingChoice};
  });
  expect(setup.rarityAfter).toBe(setup.rarity0 + 1);  /* gilded exactly once */
  expect(setup.pending).toBe(false);                  /* choice consumed */
  await reloadAndContinue(page);
  await page.waitForSelector('.rmplot');
  const after = await page.evaluate(() => {
    const G = window.BBDEV.g();
    return {pending: !!G.run.pendingChoice, overlay: !!document.querySelector('.picks')};
  });
  expect(after.pending).toBe(false);   /* not re-offered after reload */
  expect(after.overlay).toBe(false);
});

test('resume at the map preserves gold, Resolve, and progress', async ({page}) => {
  await freshRoute(page);
  const snap = () => page.evaluate(() => { const G = window.BBDEV.g(); const s = window.BBDEV.routeState(); return {phase: s.phase, gold: G.gold, resolve: s.resolve, path: s.path.length}; });
  const before = await snap();
  await reloadAndContinue(page);
  await page.waitForSelector('.rmplot');
  expect(await snap()).toEqual(before);
});

test('resume mid-fight restarts the same fight from the same seed', async ({page}) => {
  await freshRoute(page);
  const seed = await startFirstFight(page);
  await reloadAndContinue(page);
  const after = await page.evaluate(() => {
    const G = window.BBDEV.g();
    if (G.fiv) { clearInterval(G.fiv); G.fiv = null; }
    return {uiPhase: G.phase, hasFight: !!G.F, seed: window.BBDEV.routeState().fightSeed, statePhase: window.BBDEV.routeState().phase};
  });
  expect(after.hasFight).toBe(true);
  expect(after.statePhase).toBe('encounter');
  expect(after.seed).toBe(seed);
});

test('resume during the victory recap settles the reward exactly once', async ({page}) => {
  await freshRoute(page);
  await startFirstFight(page);
  const before = await page.evaluate(() => {
    const G = window.BBDEV.g();
    window.BBDEV.dispatchRoute({type: 'fightResult', winner: 'a', survTier: 0});   /* -> reward phase, recap shown */
    return {gold: G.gold, path: window.BBDEV.routeState().path.length, phase: window.BBDEV.routeState().phase};
  });
  expect(before.phase).toBe('reward');
  await reloadAndContinue(page);                 /* resumeRoutePhase dispatches settleReward */
  await page.waitForSelector('.rmplot');
  const after = await page.evaluate(() => { const G = window.BBDEV.g(); const s = window.BBDEV.routeState(); return {gold: G.gold, path: s.path.length, phase: s.phase}; });
  expect(after.phase).toBe('map');
  expect(after.path).toBe(before.path + 1);      /* the node completed once, not zero or twice */
  expect(after.gold).toBeGreaterThanOrEqual(before.gold + 3);   /* base monster gold paid once */
});
