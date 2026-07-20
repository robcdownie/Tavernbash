import {test,expect} from './fixtures.js';

async function freshRoute(page){
  await page.goto('/');
  await page.evaluate(()=>{localStorage.removeItem('bb-route-run');localStorage.removeItem('bb-run');});
  await page.reload();
  await page.click('#inNew');
  await page.click('#heroGo');
  await page.click('#modeQuick');
  await page.click('#rvGo');
  await page.click('#btnGo');
  await page.waitForSelector('.rmplot');
}

async function reloadAndContinue(page){
  await page.reload();
  await page.waitForSelector('#ctGo');
  await page.click('#ctGo');
}

test('a Merchant payment reopens before commit and stays exact once after commit',async({page})=>{
  await freshRoute(page);
  const before=await page.evaluate(()=>{
    const G=window.BBDEV.g(),node=Object.values(G.route.map.nodes).find(n=>n.type==='negotiation');
    G.run.route.phase='event';G.run.route.pendingId=node.id;G.run.route.resolution='event';
    const prepared=window.BBDEV.prepareRouteDecision(node);
    window.BBDEV.checkpoint();
    window.BBDEV.routeEventCard({node:node});
    const fresh=prepared.receipt.offers.find(o=>o.id==='fresh_stock');
    return {nodeId:node.id,gold:G.gold,wareId:fresh.wareId,offers:prepared.receipt.offers,
      shop:G.shop.filter(o=>o.id===fresh.wareId).length};
  });
  await expect(page.getByText('A Merchant Bargains',{exact:true})).toBeVisible();

  await reloadAndContinue(page);
  await expect(page.getByText('A Merchant Bargains',{exact:true})).toBeVisible();
  const reopened=await page.evaluate(()=>{
    const G=window.BBDEV.g(),receipt=G.run.receipts[G.run.runId+':decision:'+G.run.route.pendingId];
    return {gold:G.gold,offers:receipt.offers,applied:receipt.applied};
  });
  expect(reopened).toEqual({gold:before.gold,offers:before.offers,applied:false});

  await page.getByText('Fresh Stock',{exact:true}).click();
  await page.waitForSelector('.rmplot');
  const committed=await page.evaluate(({wareId,nodeId})=>{
    const G=window.BBDEV.g(),receipt=G.run.receipts[G.run.runId+':decision:'+nodeId];
    return {gold:G.gold,shop:G.shop.filter(o=>o.id===wareId).length,phase:G.run.route.phase,
      eventChoices:G.run.metrics.events.filter(e=>e.type==='event_choice').length,
      payment:receipt&&receipt.payment,applied:receipt&&receipt.applied};
  },{wareId:before.wareId,nodeId:before.nodeId});
  expect(committed).toEqual({gold:before.gold-3,shop:before.shop+1,phase:'map',eventChoices:1,payment:3,applied:true});

  await reloadAndContinue(page);
  await expect(page.getByText('A Merchant Bargains',{exact:true})).toHaveCount(0);
  const after=await page.evaluate((wareId)=>{
    const G=window.BBDEV.g();return {gold:G.gold,shop:G.shop.filter(o=>o.id===wareId).length,
      phase:G.run.route.phase,eventChoices:G.run.metrics.events.filter(e=>e.type==='event_choice').length};
  },before.wareId);
  expect(after).toEqual({gold:committed.gold,shop:committed.shop,phase:'map',eventChoices:1});
});
