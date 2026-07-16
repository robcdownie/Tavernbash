import {test, expect} from '@playwright/test';

/* Crash-recovery matrix: reach a phase, reload the page (an iOS tab-kill leaves
   only localStorage), continue, and assert the real restoreRoute/resumeRoutePhase
   path recovers it. Drives through the localhost-only BBDEV console hooks. */

async function freshRoute(page, mode = 'quick') {
  await page.goto('/');
  await page.evaluate(() => { try { localStorage.removeItem('bb-route-run'); localStorage.removeItem('bb-run'); } catch (e) {} });
  await page.reload();
  await page.click('#inNew');
  await page.click('#heroGo');                 /* 0.89 hero-first flow */
  await page.click(mode === 'long' ? '#modeLong' : '#modeQuick');
  await page.click('#rvGo');
  await page.click('#btnGo');                 /* set out from the opening stall */
  await page.waitForSelector('.rmplot');
}
async function reloadAndContinue(page) {
  await page.reload();
  await page.waitForSelector('#ctGo');
  await expect(page.locator('#ctHistory')).toHaveText('Run History');
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

test('durable ids are stable across a reload (v5 save persistence)', async ({page}) => {
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
  expect(after.schemaV).toBe(5);
  expect(after.board).toEqual(before.board);   /* same iids, not renumbered */
  expect(after.gold).toBe(before.gold);
});

test('a legacy v1 save migrates to v5 and continues on load', async ({page}) => {
  await freshRoute(page);
  /* craft a faithful v1 save from the live v4 one (strip the durable ids and
     flatten the shape) so the migration path is exercised end to end */
  await page.evaluate(() => {
    const v4 = JSON.parse(localStorage.getItem('bb-route-run'));
    const e = v4.run.economy;
    const plainW = w => ({id: w.id, rarity: w.rarity, size: w.size, ench: w.ench});
    const v1 = {
      saveVersion: 1, mapVersion: v4.mapVersion,
      routeState: v4.run.route, phase: 'routeMap',
      run: {seed: v4.run.seed, hero: v4.setup.hero, anom: v4.setup.anom, tags: v4.setup.tags,
        gold: e.gold, tier: e.tier, tierCost: e.tierCost, relicIncome: e.relicIncome,
        frozen: e.frozen, freeReroll: e.freeReroll, fightN: v4.fightN,
        board: e.board.map(plainW), vault: e.vault.map(plainW),
        shop: e.shop.map(o => ({id: o.id, free: o.free, bought: o.bought, ench: o.ench})),
        trinkets: e.trinkets},
      market: v4.market, opening: v4.opening, combat: v4.combat
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
  expect(after.schemaV).toBe(5);           /* migrated */
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

test('an interrupted Charm checkpoint reopens and awards one Charm exactly once', async ({page}) => {
  await freshRoute(page);
  const before=await page.evaluate(()=>{
    const G=window.BBDEV.g();
    window.BBDEV.settleFixed({gold:0,drained:0,items:[],relic:false,mote:null,choice:'charm',
      choiceOptions:['quick','prince','smith','pyro']},'testcharm');
    window.BBDEV.checkpoint();
    return {pending:G.run.pendingChoice&&G.run.pendingChoice.kind,charms:G.trinkets.length};
  });
  expect(before).toEqual({pending:'charm',charms:0});
  await reloadAndContinue(page);
  await page.waitForSelector('.pick[data-c="quick"]');
  await page.click('.pick[data-c="quick"]');
  await page.waitForSelector('.rmplot');
  const chosen=await page.evaluate(()=>{const G=window.BBDEV.g();return {pending:!!G.run.pendingChoice,charms:G.trinkets.map(t=>t.id)};});
  expect(chosen).toEqual({pending:false,charms:['quick']});
  await reloadAndContinue(page);
  await page.waitForSelector('.rmplot');
  const after=await page.evaluate(()=>{const G=window.BBDEV.g();return {pending:!!G.run.pendingChoice,charms:G.trinkets.map(t=>t.id),overlay:!!document.querySelector('.pick[data-c]')};});
  expect(after).toEqual({pending:false,charms:['quick'],overlay:false});
});

test('resume at the map preserves gold, Resolve, and progress', async ({page}) => {
  await freshRoute(page);
  const snap = () => page.evaluate(() => { const G = window.BBDEV.g(); const s = window.BBDEV.routeState(); return {phase: s.phase, gold: G.gold, resolve: s.resolve, path: s.path.length}; });
  const before = await snap();
  await reloadAndContinue(page);
  await page.waitForSelector('.rmplot');
  expect(await snap()).toEqual(before);
});

test('a Long Bazaar save resumes on the seven district map', async ({page}) => {
  await freshRoute(page, 'long');
  const before=await page.evaluate(()=>{const G=window.BBDEV.g();return {seed:G.run.seed,mode:G.run.routeMode,resolve:G.run.route.resolve,districts:G.route.map.districts.length};});
  await reloadAndContinue(page);
  await page.waitForSelector('.rmplot');
  const after=await page.evaluate(()=>{const G=window.BBDEV.g();return {seed:G.run.seed,mode:G.run.routeMode,resolve:G.run.route.resolve,districts:G.route.map.districts.length};});
  expect(before).toEqual({seed:before.seed,mode:'long',resolve:60,districts:7});
  expect(after).toEqual(before);
});

test('a stored v3 Long boundary save injects and checkpoints the midpoint without replaying D3', async ({page}) => {
  await freshRoute(page,'long');
  const before=await page.evaluate(() => {
    const wire=JSON.parse(localStorage.getItem('bb-route-run'));
    const boss=window.BBDEV.g().route.map.districts[2].boss;
    wire.saveVersion=3;wire.run.schemaVersion=3;
    wire.run.route.path=[boss.id];wire.run.route.pendingId=null;wire.run.route.phase='map';
    wire.run.receipts={};wire.run.pendingChoice=null;
    localStorage.setItem('bb-route-run',JSON.stringify(wire));
    return {gold:wire.run.economy.gold,shop:wire.run.economy.shop.length};
  });
  await reloadAndContinue(page);
  await page.waitForSelector('.midpointtreasure');
  const after=await page.evaluate(() => {
    const G=window.BBDEV.g(),key=G.run.runId+':midpoint:d3boss',receipt=G.run.receipts[key];
    const saved=JSON.parse(localStorage.getItem('bb-route-run'));
    return {schema:G.run.schemaVersion,saveVersion:saved.saveVersion,gold:G.gold,shop:G.shop.length,
      pending:G.run.pendingChoice&&G.run.pendingChoice.kind,savedPending:saved.run.pendingChoice&&saved.run.pendingChoice.kind,
      offers:receipt.offeredIds.length,rewardReceipts:Object.keys(G.run.receipts).filter(k=>k.indexOf(':reward:d3boss:')>=0).length,
      offerEvents:G.run.metrics.events.filter(e=>e.type==='midpoint_treasure_offered').length,
      markerPersisted:Object.prototype.hasOwnProperty.call(saved,'midpointInjected')};
  });
  expect(after).toEqual({schema:5,saveVersion:5,gold:before.gold,shop:before.shop,pending:'midpointTreasure',
    savedPending:'midpointTreasure',offers:3,rewardReceipts:0,offerEvents:1,markerPersisted:false});
});

test('a map version 8 save receives one retirement notice', async ({page}) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('bb-route-run');
    localStorage.setItem('bb-route-run', JSON.stringify({saveVersion:3,mapVersion:8,run:{seed:17}}));
  });
  await page.reload();
  await expect(page.locator('#retiredNew')).toBeVisible();
  await page.click('#retiredNew');
  /* 0.89 hero-first flow: the hero picker opens before the road choice */
  await expect(page.locator('#heroGo')).toBeVisible();
  await page.reload();
  await expect(page.locator('#inNew')).toBeVisible();
  await expect(page.locator('#retiredNew')).toHaveCount(0);
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
  expect(after.gold).toBeGreaterThanOrEqual(before.gold + 2);   /* base monster gold (2/4/6) paid once */
});

test('duplicate unique settlement records and announces cash instead of a phantom offer', async ({page}) => {
  await freshRoute(page);
  const result=await page.evaluate(() => {
    const G=window.BBDEV.g(),nodeId=window.BBDEV.frontier()[0];
    G.board.push({id:'serpentcrown',iid:G.run.ids.nextItem++,rarity:0,size:2,ench:null});
    const gold=G.gold;
    G.route.combat={nodeId:nodeId,enteredGold:gold,pocketed:0,attempt:0};
    window.BBDEV.settleRouteReward({nodeId:nodeId,monId:'shahmaran',gold:2,gilded:false});
    const ev=G.run.metrics.events.filter(e=>e.type==='reward_settled').slice(-1)[0];
    return {data:ev&&ev.data,toast:document.querySelector('#toast').textContent,
      crownOffers:G.shop.filter(o=>o.id==='serpentcrown'&&!o.bought).length,goldDelta:G.gold-gold};
  });
  expect(result.data.items).toEqual([]);
  expect(result.data.duplicateUniqueIds).toEqual(['serpentcrown']);
  expect(result.data.duplicateUniqueGold).toBe(3);
  expect(result.crownOffers).toBe(0);
  expect(result.goldDelta).toBe(result.data.gold+result.data.duplicateUniqueGold);
  expect(result.toast).toContain('3 gold instead of duplicate Serpent Crown');
  expect(result.toast).not.toContain('waiting free');
});

test('presenting the map after a boss reward advances telemetry to the next district', async ({page}) => {
  await freshRoute(page);
  const result=await page.evaluate(() => {
    const G=window.BBDEV.g(),boss=G.route.map.districts[0].boss;
    G.run.route.path=[boss.id];G.run.route.pendingId=null;G.run.route.phase='map';
    G.run.metrics.timing.cursor.phase='reward';G.run.metrics.timing.cursor.district=1;
    G.run.metrics.timing.cursor.active=true;G.run.metrics.timing.cursor.lastAt=Date.now()-25;
    window.BBDEV.presentAfterReward();
    const t=G.run.metrics.timing;
    return {uiPhase:G.phase,phase:t.cursor.phase,district:t.cursor.district,
      priorRewardMs:t.districts['1']&&t.districts['1'].phases.reward||0};
  });
  expect(result.uiPhase).toBe('routeMap');
  expect(result.phase).toBe('map');
  expect(result.district).toBe(2);
  expect(result.priorRewardMs).toBeGreaterThanOrEqual(20);
});

test('the Long midpoint Treasure is saved before display and reopens exactly once', async ({page}) => {
  await freshRoute(page,'long');
  const before=await page.evaluate(() => {
    const G=window.BBDEV.g(),boss=G.route.map.districts[2].boss;
    G.run.route.path=[boss.id];G.run.route.pendingId=null;G.run.route.phase='map';
    G.route.combat={nodeId:boss.id,enteredGold:G.gold,pocketed:0,attempt:0};
    window.BBDEV.settleRouteReward({nodeId:boss.id,monId:boss.monId,gold:6,gilded:boss.gilded});
    const key=G.run.runId+':midpoint:d3boss',receipt=G.run.receipts[key];
    const saved=JSON.parse(localStorage.getItem('bb-route-run'));
    return {key:key,options:receipt.offeredIds.slice(),pending:G.run.pendingChoice&&G.run.pendingChoice.kind,
      savedPending:saved.run.pendingChoice&&saved.run.pendingChoice.kind,
      offerEvents:G.run.metrics.events.filter(e=>e.type==='midpoint_treasure_offered').length};
  });
  expect(before.pending).toBe('midpointTreasure');
  expect(before.savedPending).toBe('midpointTreasure');
  expect(before.options).toHaveLength(3);
  expect(before.offerEvents).toBe(1);
  await expect(page.getByText('Midpoint Treasure',{exact:true})).toBeVisible();
  await expect(page.locator('.pick[data-mt]')).toHaveCount(3);

  await reloadAndContinue(page);
  await expect(page.getByText('Midpoint Treasure',{exact:true})).toBeVisible();
  const reopened=await page.evaluate(() => {
    const G=window.BBDEV.g(),receipt=G.run.receipts[G.run.runId+':midpoint:d3boss'];
    return {options:receipt.offeredIds.slice(),offerEvents:G.run.metrics.events.filter(e=>e.type==='midpoint_treasure_offered').length};
  });
  expect(reopened).toEqual({options:before.options,offerEvents:1});

  await page.locator('.pick[data-mt="'+before.options[0]+'"]').click();
  await page.waitForSelector('.rmplot');
  const selected=await page.evaluate(() => {
    const G=window.BBDEV.g(),key=G.run.runId+':midpoint:d3boss',receipt=G.run.receipts[key];
    return {pending:!!G.run.pendingChoice,selectedId:receipt.selectedId,choiceApplied:receipt.choiceApplied,
      freeOffers:G.shop.filter(o=>o.id===receipt.selectedId&&o.free&&!o.bought).length,
      offerEvents:G.run.metrics.events.filter(e=>e.type==='midpoint_treasure_offered').length,
      selectEvents:G.run.metrics.events.filter(e=>e.type==='midpoint_treasure_selected').length};
  });
  expect(selected).toEqual({pending:false,selectedId:before.options[0],choiceApplied:true,freeOffers:1,offerEvents:1,selectEvents:1});

  await reloadAndContinue(page);
  await page.waitForSelector('.rmplot');
  const after=await page.evaluate(() => {
    const G=window.BBDEV.g(),receipt=G.run.receipts[G.run.runId+':midpoint:d3boss'];
    return {overlay:!!document.querySelector('.pick[data-mt]'),
      freeOffers:G.shop.filter(o=>o.id===receipt.selectedId&&o.free&&!o.bought).length,
      offerEvents:G.run.metrics.events.filter(e=>e.type==='midpoint_treasure_offered').length,
      selectEvents:G.run.metrics.events.filter(e=>e.type==='midpoint_treasure_selected').length};
  });
  expect(after).toEqual({overlay:false,freeOffers:1,offerEvents:1,selectEvents:1});
});

test('a finished run keeps one report and its debrief across reload', async ({page}) => {
  await freshRoute(page);
  const before = await page.evaluate(() => {
    window.BBDEV.g().run.route.phase='won';
    window.BBDEV.routeEnd('won');
    document.querySelector('[data-db="pace"][data-v="fast"]').click();
    const raw=JSON.parse(localStorage.getItem('bb-route-reports')||'[]');
    const rows=Array.isArray(raw)?raw:(raw.reports||[]);
    const active=JSON.parse(localStorage.getItem('bb-route-run'));
    return {count:rows.length,id:rows[0].reportId,pace:rows[0].debrief.pace,endId:active.run.end.endedAt};
  });
  await reloadAndContinue(page);
  await page.waitForSelector('#reGo');
  const after = await page.evaluate(() => {
    const raw=JSON.parse(localStorage.getItem('bb-route-reports')||'[]');
    const rows=Array.isArray(raw)?raw:(raw.reports||[]);
    const active=JSON.parse(localStorage.getItem('bb-route-run'));
    return {count:rows.length,id:rows[0].reportId,pace:rows[0].debrief.pace,endId:active.run.end.endedAt};
  });
  expect(after).toEqual(before);
});
