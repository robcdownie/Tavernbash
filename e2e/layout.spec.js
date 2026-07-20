import {test, expect} from './fixtures.js';

/* drive a fresh route to the map screen through the real UI, using the
   localhost-only BBDEV-free path (plain clicks) so the test exercises what a
   player does */
async function toMap(page,mode='quick') {
  await page.goto('/');
  await page.evaluate(() => {
    try { localStorage.removeItem('bb-route-run'); localStorage.removeItem('bb-run'); } catch (e) {}
  });
  await page.reload();
  await page.click('#inNew');
  await page.click('#heroGo');                 /* 0.89 hero-first flow */
  await page.click(mode==='long'?'#modeLong':'#modeQuick');
  await page.click('#rvGo');
  await page.click('#btnGo');
  await page.waitForSelector('.rmplot');
  await page.click('.rmnode.reach');           /* select one node so the preview populates */
  await page.waitForSelector('.rmpfoot .btn');
}

test('the mode picker emphasizes Long Bazaar and both routes remain selectable', async ({page}) => {
  await page.goto('/');
  await page.evaluate(() => { localStorage.removeItem('bb-route-run'); localStorage.removeItem('bb-run'); });
  await page.reload();
  await page.click('#inNew');
  await page.click('#heroGo');                 /* 0.89 hero-first flow */
  await expect(page.locator('#modeLong')).toContainText('7 districts');
  await expect(page.locator('#modeQuick')).toContainText('4 districts');
  await expect(page.locator('#modeLong')).toHaveClass(/primary/);
  const fit=await page.evaluate(() => {
    const card=document.querySelector('.routepick').getBoundingClientRect();
    const picks=Array.from(document.querySelectorAll('.routechoice')).map(e=>e.getBoundingClientRect());
    return {card:card.left>=-1&&card.right<=innerWidth+1&&card.top>=-1&&card.bottom<=innerHeight+1,
      touch:picks.every(r=>r.height>=44),sideBySide:Math.abs(picks[0].top-picks[1].top)<2};
  });
  expect(fit.card).toBe(true);
  expect(fit.touch).toBe(true);
  expect(fit.sideBySide).toBe(page.viewportSize().width>page.viewportSize().height);
});

test('Long Bazaar starts with 60 Resolve and renders seven district pips', async ({page}) => {
  await page.goto('/');
  await page.evaluate(() => { localStorage.removeItem('bb-route-run'); localStorage.removeItem('bb-run'); });
  await page.reload();
  await page.click('#inNew');
  await page.click('#heroGo');                 /* 0.89 hero-first flow */
  await page.click('#modeLong');
  await expect(page.locator('.reveal')).toContainText('Seven districts. 60 Resolve.');
  await page.click('#rvGo');
  await page.click('#btnGo');
  await page.waitForSelector('.rmplot');
  await expect(page.locator('.rmpip')).toHaveCount(7);
  const mode=await page.evaluate(() => ({mode:window.BBDEV.g().run.routeMode,resolve:window.BBDEV.routeState().resolve,districts:window.BBDEV.g().route.map.districts.length}));
  expect(mode).toEqual({mode:'long',resolve:60,districts:7});
  await page.evaluate(() => {
    const G=window.BBDEV.g();
    G.run.route.path=[G.route.map.districts[2].boss.id];
    G.run.route.phase='map';
    window.BBDEV.renderAll();
  });
  await expect(page.locator('.rmafter')).toHaveText('After Midnight');
  const headerFits=await page.$eval('.rmhdr', e => e.scrollWidth<=e.clientWidth+1);
  expect(headerFits, 'After Midnight header stays inside the map').toBe(true);
  await page.evaluate(() => window.BBDEV.routeEnd('won'));
  await expect(page.getByText('Long Bazaar Clear',{exact:true})).toBeVisible();
  expect(await page.evaluate(() => window.BBDEV.g().run.end.result)).toBe('long_clear');
});

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
  expect(await page.evaluate(() => window.BBDEV.g().run.end.result)).toBe('quick_clear');
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
  await expect(page.locator('#reHistory')).toHaveText('Run History');
});

test('run history renders recent runs, mastery, discovery, and exact seed setup', async ({page}) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('bb-route-run');
    const records=[
      {
        schema:'tavern-bash-run/1',reportId:'seed-clear:1000',archive_saved:true,exported:false,
        version:'0.89.0',mapVersion:11,routeMode:'quick',lantern:3,startedAt:1,endedAt:1000,
        endedAtIso:'2026-07-16T10:00:00.000Z',result:'quick_clear',seed:123456,partial:false,
        setup:{heroId:'kiln',hero:'The Kilnkeeper',omenId:'wildfire',omen:'Wildfire',
          featured:[{id:'burn',name:'Burn'},{id:'dmg',name:'Weapons'}]},
        progress:{districtId:4,district:'The Dragon Gate',bossesBeaten:4,nodesVisited:22,bossRetries:1,
          resolve:18,resolveMax:40,path:['d1c1l0']},
        economy:{gold:2,tier:4,relicIncome:0,
          board:[{iid:1,id:'dagger',name:'Rusty Dagger',rarity:1,rarityName:'Silver',ench:'swift',enchantName:'Swift',size:1}],
          vault:[{iid:2,id:'torch',name:'Oil Torch',rarity:0,rarityName:'Bronze',ench:null,enchantName:null,size:1}],charms:[]},
        timing:{calendarMs:400000,activeMs:300000,gameplayMs:300000,debriefMs:0,sessions:1,reloads:0,phases:{},districts:{}},
        midpointTreasure:null,debrief:{},metrics:{wares:{dagger:{exposures:1},torch:{fights:1}},
          fights:[{monsterId:'imp'}],events:[],timing:{},debrief:{}}
      },
      {
        schema:'tavern-bash-run/1',reportId:'seed-loss:900',archive_saved:true,exported:true,
        version:'0.89.0',mapVersion:11,routeMode:'long',lantern:1,startedAt:1,endedAt:900,
        endedAtIso:'2026-07-15T10:00:00.000Z',result:'loss',seed:98765,partial:false,
        setup:{heroId:'apoth',hero:'The Apothecary',omenId:'fortified',omen:'Fortified',
          featured:[{id:'heal',name:'Healing'},{id:'shield',name:'Shields'}]},
        progress:{districtId:3,district:'Palace Quarter',bossesBeaten:2,nodesVisited:13,bossRetries:0,
          resolve:0,resolveMax:60,path:['d1c1l0']},
        economy:{gold:0,tier:3,relicIncome:0,board:[],vault:[],charms:[]},
        timing:{calendarMs:500000,activeMs:420000,gameplayMs:420000,debriefMs:0,sessions:1,reloads:0,phases:{},districts:{}},
        midpointTreasure:null,debrief:{},metrics:{wares:{salve:{exposures:1}},fights:[{monsterId:'lamassu'}],events:[],timing:{},debrief:{}}
      }
    ];
    localStorage.setItem('bb-route-reports',JSON.stringify(records));
    localStorage.setItem('bb-lantern',JSON.stringify({quick:{kiln:3},long:{apoth:1}}));
  });
  await page.reload();
  await page.click('#inHistory');
  await expect(page.locator('#historyTitle')).toHaveText('Run History');
  await expect(page.locator('.historyrow')).toHaveCount(2);
  await expect(page.locator('.historydetail')).toContainText('The Kilnkeeper');
  await expect(page.locator('.historydetail')).toContainText('Wildfire');
  await expect(page.locator('.historydetail')).toContainText('123456');
  await expect(page.locator('.historydetail')).toContainText('Silver Swift Rusty Dagger');
  const fit=await page.evaluate(() => {
    const vp={w:document.documentElement.clientWidth,h:document.documentElement.clientHeight};
    const card=document.querySelector('.historycard').getBoundingClientRect();
    const controls=Array.from(document.querySelectorAll('.historycard button')).map(b=>{
      const r=b.getBoundingClientRect();return {id:b.id||b.dataset.ht||b.dataset.hr||'',w:r.width,h:r.height};
    });
    return {card:card.left>=-1&&card.right<=vp.w+1&&card.top>=-1&&card.bottom<=vp.h+1,
      controls:controls.every(r=>r.w>=44&&r.h>=44),
      small:controls.filter(r=>r.w<44||r.h<44),
      docW:document.documentElement.scrollWidth<=vp.w+1,docH:document.documentElement.scrollHeight<=vp.h+1};
  });
  expect(fit).toEqual({card:true,controls:true,small:[],docW:true,docH:true});

  await page.click('[data-ht="cloud"]');
  /* the cloud panel copy is chosen from import.meta.env.VITE_SUPABASE_*, which
     Vite bakes in from .env.local at dev-server build time; the Node test process
     cannot see those (they are not exported to process.env), so keying the
     expectation off process.env spuriously fails whenever .env.local configures
     the build but the shell does not export the vars. Assert the panel rendered
     one of the two valid, well-formed states instead; this pre-existing
     environment split is unrelated to the Almanac and must not mask the flow. */
  await expect(page.locator('.cloudpanel')).toContainText(
    /Back up your finished runs|History stays on this device/);
  await page.click('[data-ht="mastery"]');
  await expect(page.locator('.masterygrid')).toContainText('Lantern 3');
  await expect(page.locator('.masterygrid')).toContainText('Lantern 1');
  await page.click('[data-ht="discovery"]');
  /* the Almanac (renamed Discovery tab) heads the gated categories by UNLOCK
     state now, not seen-in-history: a fresh profile holds the three starter
     heroes and the four starter Omens, so the header reads Found N of the total
     (design-unlocks-0.92.md, Presentation and The unlock table). */
  await expect(page.locator('.discoveryhead')).toContainText('Found 3');
  await expect(page.locator('.discoveryhead')).toContainText('8 in all');
  await page.click('[data-hd="omens"]');
  await expect(page.locator('.discoveryhead')).toContainText('Found 4');
  await expect(page.locator('.discoveryhead')).toContainText('12 in all');
  await page.click('[data-ht="runs"]');
  await page.click('#historyReplay');
  await expect(page.getByText('Fresh Road, Same Seed',{exact:true})).toBeVisible();
  await page.click('#replayGo');
  await page.waitForSelector('#rvGo');
  const replayed=await page.evaluate(() => {
    const G=window.BBDEV.g();
    return {seed:G.seed,mode:G.run.routeMode,hero:G.hero,lantern:G.run.lantern,omen:G.anom.id,tags:G.tags};
  });
  expect(replayed).toEqual({seed:123456,mode:'quick',hero:'kiln',lantern:3,omen:'wildfire',tags:['burn','dmg']});
});

test('configured cloud backup offers account linking without hiding local history', async ({page}) => {
  test.skip(!process.env.VITE_SUPABASE_URL||!process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    'requires public Supabase browser configuration');
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('bb-route-run');
    localStorage.removeItem('bb-cloud-auth');
  });
  await page.reload();
  await page.click('#inHistory');
  await page.click('[data-ht="cloud"]');
  await expect(page.locator('.cloudpanel')).toContainText('Back up your finished runs');
  await expect(page.locator('#cloudLink')).toHaveText('Email Sign-in Link');
  const fit=await page.evaluate(() => {
    const vp={w:document.documentElement.clientWidth,h:document.documentElement.clientHeight};
    const card=document.querySelector('.historycard').getBoundingClientRect();
    const email=document.querySelector('#cloudEmail').getBoundingClientRect();
    const link=document.querySelector('#cloudLink').getBoundingClientRect();
    return {card:card.left>=-1&&card.right<=vp.w+1&&card.top>=-1&&card.bottom<=vp.h+1,
      email:email.width>=44&&email.height>=44,link:link.width>=44&&link.height>=44,
      docW:document.documentElement.scrollWidth<=vp.w+1,docH:document.documentElement.scrollHeight<=vp.h+1};
  });
  expect(fit).toEqual({card:true,email:true,link:true,docW:true,docH:true});
});

test('the Midpoint Treasure offer fits and states where the free ware goes', async ({page}) => {
  await toMap(page,'long');
  await page.evaluate(() => {
    const G=window.BBDEV.g(),boss=G.route.map.districts[2].boss;
    G.run.route.path=[boss.id];G.run.route.pendingId=null;G.run.route.phase='map';
    window.BBDEV.presentAfterReward();
  });
  await page.waitForSelector('.midpointtreasure');
  await expect(page.getByText('Midpoint Treasure',{exact:true})).toBeVisible();
  await expect(page.getByText('Your pick waits as a free ware in the next Market.',{exact:true})).toBeVisible();
  const fit=await page.evaluate(() => {
    const vp={w:document.documentElement.clientWidth,h:document.documentElement.clientHeight};
    const overlay=document.querySelector('.ov'),card=document.querySelector('.midpointtreasure').getBoundingClientRect();
    const picks=Array.from(document.querySelectorAll('.pick[data-mt]')).map(p=>p.getBoundingClientRect());
    return {count:picks.length,cardFitsWidth:card.left>=-1&&card.right<=vp.w+1,
      overlayScrolls:overlay.scrollHeight<=vp.h+1||getComputedStyle(overlay).overflowY==='auto',
      touch:picks.every(p=>p.width>=44&&p.height>=44)};
  });
  expect(fit).toEqual({count:3,cardFitsWidth:true,overlayScrolls:true,touch:true});
});

/* ===== The Almanac unlock feature (design-unlocks-0.92.md, Layout test plan) ===== */

/* locked hero chips render and preview: the five non-starter merchants show as
   sealed chips in the rail yet stay selectable, the detail panel swaps the rule
   for the trigger hint, and the confirm becomes a non-proceeding stone plaque */
test('the hero rail seals the five non-starter merchants and previews a locked one', async ({page}) => {
  await page.goto('/');
  await page.evaluate(() => { try{localStorage.removeItem('bb-route-run');localStorage.removeItem('bb-run');localStorage.removeItem('bb-unlocks');}catch(e){} });
  await page.reload();
  await page.click('#inNew');                       /* 0.89 hero-first flow opens the picker */
  await page.waitForSelector('.heropick');
  /* three starters open (kiln, apoth, knife), the other five sealed */
  await expect(page.locator('.herochip.lockd')).toHaveCount(5);
  await expect(page.locator('.herochip:not(.lockd)')).toHaveCount(3);
  /* preview a sealed merchant: its chip stays selectable */
  await page.locator('.herochip.lockd').first().click();
  await expect(page.locator('.hddesc.hdhint')).toBeVisible();          /* trigger hint replaces the rule */
  await expect(page.locator('#heroGo')).toHaveText('Sealed Stall');    /* confirm is the stone plaque */
  await expect(page.locator('#heroGo')).toHaveAttribute('aria-disabled','true');
  /* tapping the sealed confirm must not start a run: the picker stays open.
     aria-disabled is advisory (a real tap still fires the onclick, which toasts
     and returns), so force past Playwright's actionability gate to simulate it. */
  await page.click('#heroGo',{force:true});
  await expect(page.locator('.heropick')).toBeVisible();
  /* nothing pushed off screen */
  const fit=await page.evaluate(() => {
    const vp={w:document.documentElement.clientWidth,h:document.documentElement.clientHeight};
    const card=document.querySelector('.heropick').getBoundingClientRect();
    const overlay=document.querySelector('.ov');
    return {cardFitsWidth:card.left>=-1&&card.right<=vp.w+1,
      lockCorners:document.querySelectorAll('.herochip.lockd .herolock').length,
      overlayScrolls:overlay.scrollHeight<=vp.h+1||getComputedStyle(overlay).overflowY==='auto',
      docW:document.documentElement.scrollWidth<=vp.w+1};
  });
  expect(fit.cardFitsWidth).toBe(true);
  expect(fit.lockCorners).toBe(5);                                     /* every sealed chip wears a brass lock */
  expect(fit.overlayScrolls).toBe(true);
  expect(fit.docW).toBe(true);
});

/* the end-screen unlock strip sits under the lamp line, caps at three rows with
   an overflow line, stays above the debrief, and never overflows the viewport.
   Seeding a post-epoch profile two nights deep makes a single win trip four
   trigger unlocks at once (rapid, lender, moon, surgeonhook), engaging the cap. */
test('the end-screen unlock strip caps at three rows under the lamp line', async ({page}) => {
  await toMap(page);
  await page.evaluate(() => {
    localStorage.setItem('bb-unlocks',JSON.stringify({v:1,createdAt:'seed',epoch:{runs:0,clears:0},
      runs:2,clears:0,clearsByHero:{},heroes:[],omens:[],wares:[],settled:[]}));
  });
  await page.evaluate(() => window.BBDEV.routeEnd('won'));
  await page.waitForSelector('.uwstrip');
  const view=await page.evaluate(() => {
    const card=document.querySelector('.ov .card');
    const strip=document.querySelector('.uwstrip').getBoundingClientRect();
    const rows=document.querySelectorAll('.uwstrip .uwrow');
    const more=document.querySelector('.uwmore');
    const para=card.querySelector('p').getBoundingClientRect();      /* the lamp/clear line */
    const debrief=card.querySelector('.rdebrief');
    const vp={w:document.documentElement.clientWidth,h:document.documentElement.clientHeight};
    const overlay=document.querySelector('.ov');
    return {rows:rows.length,more:more?more.textContent:null,
      underLamp:strip.top>=para.bottom-1,
      aboveDebrief:debrief?strip.bottom<=debrief.getBoundingClientRect().top+1:true,
      fitsWidth:strip.left>=-1&&strip.right<=vp.w+1,
      overlayScrolls:overlay.scrollHeight<=vp.h+1||getComputedStyle(overlay).overflowY==='auto'};
  });
  expect(view.rows).toBe(3);                                          /* surface cap of three */
  expect(view.more).toMatch(/more recorded in the Almanac/);         /* the rest are still recorded */
  expect(view.underLamp).toBe(true);
  expect(view.aboveDebrief).toBe(true);
  expect(view.fitsWidth).toBe(true);
  expect(view.overlayScrolls).toBe(true);
});

/* the Almanac locked tiles scroll inside their panel (not the document) and a
   sealed tile opens the gold-framed hint plaque */
test('the Almanac locked tiles scroll in their panel and open a hint plaque', async ({page}) => {
  await page.goto('/');
  await page.evaluate(() => { try{localStorage.removeItem('bb-route-run');localStorage.removeItem('bb-unlocks');}catch(e){} });
  await page.reload();
  await page.click('#inHistory');
  await page.click('[data-ht="discovery"]');        /* the Almanac tab (data attr unchanged) */
  await page.click('[data-hd="wares"]');            /* wares carries the most sealed tiles */
  await page.waitForSelector('.discoverytile.sealed');
  const contained=await page.evaluate(() => {
    const vp={w:document.documentElement.clientWidth,h:document.documentElement.clientHeight};
    const card=document.querySelector('.historycard').getBoundingClientRect();
    const body=document.querySelector('.historybody');
    return {docW:document.documentElement.scrollWidth<=vp.w+1,docH:document.documentElement.scrollHeight<=vp.h+1,
      cardFits:card.left>=-1&&card.right<=vp.w+1&&card.top>=-1&&card.bottom<=vp.h+1,
      bodyScrolls:getComputedStyle(body).overflowY==='auto'||getComputedStyle(body).overflowY==='scroll'};
  });
  expect(contained.docW).toBe(true);                /* the grid never pushes the page sideways */
  expect(contained.docH).toBe(true);                /* nor down past the viewport */
  expect(contained.cardFits).toBe(true);
  expect(contained.bodyScrolls).toBe(true);         /* the tiles scroll inside the panel */
  /* tapping a sealed tile opens the gold-framed hint plaque */
  await page.locator('.discoverytile.sealed').first().click();
  await expect(page.locator('.lplaque')).toBeVisible();
  await expect(page.locator('.lplaque .kick')).toHaveText('The Almanac');
});
