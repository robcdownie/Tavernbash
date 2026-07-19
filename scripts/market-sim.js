/* The live-market walker (0.101.0 live-market seam, Codex-approved proposal).
   Pure, deterministic, DOM-free. It drives the REAL extracted market cores
   (market-core.js rollShopOffers and pullVaultForges, the exact functions
   ui.js wraps) and the REAL pure economy rules (anomaly-rules purchase, sale,
   reroll, freeze, and slot rules; data.js credit rules; route.js fightSeed
   keyed roll streams; route-run allocId) under a versioned deterministic
   player policy. It reimplements NOTHING: every price, pool, weight, draw,
   hold, and credit verdict is the shipped function.

   Binding seam conditions honored here (coordination/state.json):
   - Bull Market applies adjustedVictoryIncome ONLY to the income term
     (victoryIncome below, the exact ui.js expression), which flows into
     planReward as ctx.incomeGold; base bounty gold is never scaled.
   - Every run shops through its frozen run.wareLock snapshot via the real
     runWareAllowed; unlocks recorded after a run affect the next run only.
   - No difficulty constant is read or changed here.

   The policy is data (POLICY below) so its behavior is reviewable at a
   glance, and versioned (POLICY_VERSION) so evidence artifacts can prove the
   baseline and candidate ran the identical policy. */
import {ITEMS,TIERCOST,canSpendGold} from '../src/data.js';
import {makeItem,mulberry,fuseScan} from '../src/engine.js';
import {rollShopOffers,pullVaultForges} from '../src/market-core.js';
import {warePurchaseCost,wareSlotCost,wareSaleValue,boardUsedCells,boardSlotCount,rerollPrice,
        adjustedVictoryIncome,setFrozenOffers} from '../src/anomaly-rules.js';
import {boardVictoryIncome} from '../src/route-rewards.js';
import {charmVictoryIncome} from '../src/route-charms.js';
import {fightSeed} from '../src/route.js';
import {allocId} from '../src/route-run.js';

export const POLICY_VERSION='mp-1';
/* Deterministic player policy, reviewable as data. mp-1 plays the proven
   fusion-first line game: it commits to a few ware LINES (3 + tier/2, the
   same concentration the abstract policy used), buys copies that continue a
   line, opens a new line only while under the cap and only for a ware worth
   committing to, buys before it tiers, tiers behind a gold reserve, sells the
   weakest orphan bronze to make room and coin for a line copy (each sale
   feeding the real per-sale reroll escalation), parks a copy on a vault shelf
   to complete a roomless triple, rerolls a dead shelf and digs with a flush
   purse, freezes a line-completer it cannot afford, and fights shield-first
   per the shipped genRival order. */
export const POLICY={
  tierCap:'district+2',       /* the same cap the abstract policy used */
  tierReserve:2,              /* gold kept back when tiering */
  buyReserve:0,               /* gold kept back when buying */
  scoreTriple:100,            /* completes a bronze triple (2 owned) */
  scorePair:60,               /* continues a focus-trade line (1 owned) */
  scoreOffPair:25,            /* finishes an accidental off-trade pair */
  scoreNewLine:20,            /* opens a focus line, under the line cap */
  scoreHeroTag:15,            /* matches the hero trade */
  scoreFeatured:10,           /* matches a featured tag */
  scoreSmall:8,               /* size 1 fuses readily */
  buyMin:14,                  /* only strong lines open (wOf scale): the arch
                                 trade, or a size-1 fusible base; churn from
                                 opening then selling mediocre lines loses the
                                 spread every time */
  linesBase:3,                /* committed lines: linesBase + floor(tier/2) */
  offenseFloor:2,             /* offensive lines every board must reach */
  rerollCap:10,               /* rerolls per market visit: surplus gold digs */
  rerollBelow:60,             /* reroll when no offer continues a line */
  rerollReserve:4,            /* gold kept back when rerolling */
  flushGold:12,               /* a purse this deep digs past the quality gate */
  actionGuard:60              /* hard cap on actions per market visit */
};

/* the exact ui.js victory income expression (ui.js line 932): the only place
   Bull Market's goldMul may apply. In route mode income wares never enter the
   shop, so board income is zero unless a future rework changes that; relic
   income (the Debt Collector's ledger) and charm income flow when present. */
export function victoryIncome(board,relicIncome,charms,A){
  return adjustedVictoryIncome(boardVictoryIncome(board)+(relicIncome||0)+charmVictoryIncome(charms||[]),A);
}

/* count owned copies at bronze across board and vault (the fusion pull) */
function ownedBronze(st,id){
  return st.board.filter(w=>w.id===id&&w.rarity===0).length
       + st.vault.filter(w=>w.id===id&&w.rarity===0).length;
}
/* the run's committed lines: ids held in the focus archetype, plus any id
   already paired (a pair is worth finishing whatever its trade). Free bounty
   singles outside the focus never count, so shop luck and bounty drops cannot
   steer the build the way an aimless junk drawer would. */
function commitLines(st,arch){
  const count={};
  for(const w of st.board)count[w.id]=(count[w.id]||0)+1;
  for(const w of st.vault)count[w.id]=(count[w.id]||0)+1;
  const ids=new Set();
  for(const id of Object.keys(count)){
    const d=ITEMS[id];if(!d)continue;
    if((d.cat===arch&&count[id]>=1)||count[id]>=2)ids.add(id);
  }
  return ids;
}
const OFFENSE=['dmg','poison','burn'];
function offenseLines(st){
  const ids=new Set();
  for(const w of st.board.concat(st.vault)){
    const d=ITEMS[w.id];
    if(d&&OFFENSE.indexOf(d.cat)>=0)ids.add(w.id);
  }
  return ids.size;
}
function scoreOffer(st,ctx,o){
  if(o.bought)return -1;
  const d=ITEMS[o.id];if(!d)return -1;
  const arch=ctx.arch||ctx.heroTag||'dmg';
  const own=ownedBronze(st,o.id);
  if(own>=2)return POLICY.scoreTriple;
  if(own===1)return POLICY.scorePair+(d.cat===arch?POLICY.scoreHeroTag:0);
  /* a new line, under the concentration cap: scored by the EXACT wOf weight
     ladder the abstract buildBoard used (tier base, arch times 3.5, the util
     discount, the size-1 fusion lean), so the walker leans where the proven
     policy leaned without ever excluding a trade outright. The offense floor:
     until two offensive lines exist, weapons and DoT wares score as the arch,
     because a board that cannot kill loses to the storm whatever its trade. */
  if(commitLines(st,arch).size>=POLICY.linesBase+Math.floor(st.tier/2))return -1;
  const needOffense=offenseLines(st)<POLICY.offenseFloor&&OFFENSE.indexOf(d.cat)>=0;
  let w=d.tier===1?8:(d.tier===2?7:6);
  if(d.cat===arch||needOffense)w*=3.5;
  if(d.cat==='util'&&arch!=='util')w*=0.3;
  if(d.size===1)w*=1.8;
  if((ctx.featuredTags||[]).indexOf(d.cat)>=0)w*=1.5;
  return w;
}
function fuseAll(st,ctx){
  const forged=fuseScan(st.board);
  forged.forEach(f=>{f.iid=allocId(ctx.run);st.events.push({type:'fusion',data:{id:f.id,rarity:f.rarity,iid:f.iid}});});
  pullVaultForges(st.board,st.vault,{slots:boardSlotCount(st.tier,ctx.A),usedCells:b=>boardUsedCells(b,ctx.A)},{
    stampForged:fs=>fs.forEach(f=>{f.iid=allocId(ctx.run);st.events.push({type:'fusion',data:{id:f.id,rarity:f.rarity,iid:f.iid}});})
  });
}

/* one market visit: roll from the keyed stream, act to a fixpoint under the
   policy, leave (optionally freezing). Mutates st {gold, tier, tierCost,
   board, vault, shop, frozen, events, metrics}. ctx: {runSeed, nodeId, run,
   storage, A, heroId, heroTag, featuredTags, threat, districtCap, hero}. */
export function marketVisit(st,ctx){
  let rollIndex=0,rerolls=0;
  let sales=0;   /* per-market sale count: rerollPrice reads it, so the Auction
                    Bell per-sale escalation is exercised for real */
  const roll=()=>{
    const rng=mulberry(fightSeed(ctx.runSeed,ctx.nodeId,rollIndex));
    const r=rollShopOffers({tier:st.tier,heroId:ctx.heroId,heroTag:ctx.heroTag,
      featuredTags:ctx.featuredTags||[],board:st.board,mode:'route',storage:ctx.storage,
      run:ctx.run,A:ctx.A,threat:ctx.threat,priorShop:st.shop,frozen:st.frozen},rng,
      {mkOffer:o=>{o.offerId=allocId(ctx.run);return o;}});
    st.shop=r.offers;st.frozen=r.frozenActive;
    st.metrics.rolls++;
  };
  roll();
  let guard=0;
  while(guard++<POLICY.actionGuard){
    fuseAll(st,ctx);
    /* best affordable buy above the bar: copies before slots, the fusion-first
       order real play showed (buys drain the shelf before tier gold moves) */
    let best=null,bestScore=-1;
    for(const o of st.shop){
      const s=scoreOffer(st,ctx,o);
      if(s<=bestScore)continue;
      const d=ITEMS[o.id];
      const cost=o.free?0:warePurchaseCost(d.size,!!o.ench,ctx.A);
      const room=boardUsedCells(st.board,ctx.A)+wareSlotCost(d.size,ctx.A)<=boardSlotCount(st.tier,ctx.A);
      if(!room)continue;
      if(!o.free&&!canSpendGold(st.gold,cost+POLICY.buyReserve,ctx.hero))continue;
      best=o;bestScore=s;
    }
    if(best&&bestScore>=POLICY.buyMin){
      const d=ITEMS[best.id];
      const cost=best.free?0:warePurchaseCost(d.size,!!best.ench,ctx.A);
      st.gold-=cost;best.bought=true;
      const it=makeItem(best.id,0,best.ench||null);it.iid=allocId(ctx.run);
      st.board.push(it);
      st.metrics.buys++;if(best.ench)st.metrics.enchBuys++;
      continue;
    }
    /* sell-to-upgrade: when a line copy (a pair-continuer or better) is on the
       shelf but the stall is full of junk, sell the weakest orphan bronze (not
       part of any line, lowest wOf lean) at the real wareSaleValue and buy the
       copy. The other real player move mp-1 was missing, and every sale feeds
       the per-sale reroll escalation. */
    {
      let want=null,wantScore=-1;
      for(const o of st.shop){
        const s=scoreOffer(st,ctx,o);
        if(s<POLICY.scorePair||s<=wantScore)continue;
        const d=ITEMS[o.id];
        const cost=o.free?0:warePurchaseCost(d.size,!!o.ench,ctx.A);
        const room=boardUsedCells(st.board,ctx.A)+wareSlotCost(d.size,ctx.A)<=boardSlotCount(st.tier,ctx.A);
        if(room)continue;   /* roomy buys were taken above */
        if(!o.free&&!canSpendGold(st.gold,cost+POLICY.buyReserve,ctx.hero))continue;
        want=o;wantScore=s;
      }
      if(want){
        const arch=ctx.arch||ctx.heroTag||'dmg';
        let junk=null,junkW=1e9;
        for(const w of st.board){
          if(w.rarity!==0)continue;
          if(w.id===want.id)continue;
          if(ownedBronze(st,w.id)>=2)continue;          /* never break a pair */
          const d=ITEMS[w.id];if(!d||d.unique)continue; /* uniques stay */
          let ww=d.tier===1?8:(d.tier===2?7:6);
          if(d.cat===arch)ww*=3.5;
          if(d.cat==='util'&&arch!=='util')ww*=0.3;
          if(ww<junkW){junkW=ww;junk=w;}
        }
        if(junk){
          const bi=st.board.indexOf(junk);
          st.board.splice(bi,1);
          st.gold+=wareSaleValue(ITEMS[junk.id].size,ctx.A);
          sales++;st.metrics.sells=(st.metrics.sells||0)+1;
          continue;   /* the freed room and coin retry the buy next pass */
        }
      }
    }
    /* park-to-buy: a triple-completer with no board room parks one owned copy
       on a vault shelf first (the real player move); the pull-forge then
       completes the triple through the vault on the next fuse pass */
    if(st.vault.length<3){
      let parkBuy=null;
      for(const o of st.shop){
        if(o.bought)continue;
        if(st.board.filter(w=>w.id===o.id&&w.rarity===0).length<2)continue;
        const d=ITEMS[o.id];
        const cost=o.free?0:warePurchaseCost(d.size,!!o.ench,ctx.A);
        if(!o.free&&!canSpendGold(st.gold,cost+POLICY.buyReserve,ctx.hero))continue;
        parkBuy=o;break;
      }
      if(parkBuy){
        const bi=st.board.findIndex(w=>w.id===parkBuy.id&&w.rarity===0);
        st.vault.push(st.board.splice(bi,1)[0]);
        st.metrics.parks=(st.metrics.parks||0)+1;
        const d=ITEMS[parkBuy.id];
        const cost=parkBuy.free?0:warePurchaseCost(d.size,!!parkBuy.ench,ctx.A);
        st.gold-=cost;parkBuy.bought=true;
        const it=makeItem(parkBuy.id,0,parkBuy.ench||null);it.iid=allocId(ctx.run);
        st.board.push(it);
        st.metrics.buys++;if(parkBuy.ench)st.metrics.enchBuys++;
        continue;
      }
    }
    /* tier up behind the reserve, to the district cap, once the shelf is dry */
    if(st.tier<ctx.districtCap){
      const tc=TIERCOST[st.tier+1]||0;
      if(tc>0&&canSpendGold(st.gold,tc+POLICY.tierReserve,ctx.hero)){
        st.gold-=tc;st.tier++;st.metrics.tiers++;continue;
      }
    }
    /* no buy worth taking: reroll into fresh looks, honoring Silent, debt,
       and the reserve. A flush purse digs past the quality gate: markets are
       the only place gold becomes board power, so surplus coin hunts copies. */
    if(rerolls<POLICY.rerollCap&&!ctx.A.rerollDisabled
       &&(bestScore<POLICY.rerollBelow||st.gold>=POLICY.flushGold)){
      const debtBanned=ctx.hero&&ctx.hero.mod&&ctx.hero.mod.rerollBlockedInDebt&&st.gold<0;
      const price=rerollPrice(ctx.A,sales);
      if(!debtBanned&&st.gold>=price+POLICY.rerollReserve){
        st.gold-=price;rollIndex++;rerolls++;st.metrics.rerolls++;
        roll();continue;
      }
    }
    break;
  }
  fuseAll(st,ctx);
  /* fight order: the shipped genRival sort (engine.js), shield category first
     so the tank soaks the leftmost-target rule; stable within categories, so
     ware identity and ids never move relative to their own kind */
  st.board.sort(function(a,b){
    const oa=ITEMS[a.id].cat==='shield'?0:1, ob=ITEMS[b.id].cat==='shield'?0:1;
    return oa-ob;
  });
  /* on leaving: freeze a pair-completing offer the purse cannot reach, so the
     next market keeps it (the real setFrozenOffers hold semantics) */
  if(!ctx.A.freezeDisabled&&!st.frozen){
    const completer=st.shop.some(o=>{
      if(o.bought||o.free)return false;
      return ownedBronze(st,o.id)>=1;
    });
    if(completer){
      setFrozenOffers(st.shop,ctx.A.freezeDurationRounds||1);
      st.frozen=true;st.metrics.freezes++;
    }
  }
}

/* a fresh live-market state for one run */
export function newMarketState(gold,tier){
  return {gold:gold,tier:tier,board:[],vault:[],shop:null,frozen:false,
    events:[],metrics:{rolls:0,rerolls:0,buys:0,enchBuys:0,freezes:0,tiers:0,frees:0}};
}

/* grant a free ware (a bounty or reward item) into the live state exactly as
   the game lands one: board if it fits, vault if a shelf is open, else its
   sale value in gold. Fusion settles afterward. */
export function grantFreeWare(st,ctx,id,saleValue){
  const d=ITEMS[id];if(!d)return;
  const room=boardUsedCells(st.board,ctx.A)+wareSlotCost(d.size,ctx.A)<=boardSlotCount(st.tier,ctx.A);
  const it=makeItem(id,0,null);it.iid=allocId(ctx.run);
  if(room)st.board.push(it);
  else if(st.vault.length<3)st.vault.push(it);
  else{st.gold+=saleValue;return;}
  st.metrics.frees++;
  fuseAll(st,ctx);
}
