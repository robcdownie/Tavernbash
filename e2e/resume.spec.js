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
