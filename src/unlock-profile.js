"use strict";
/* The Almanac unlock profile (design-unlocks-0.92.md), under the bb-unlocks
   key. A brand-new profile starts with 3 of 8 heroes, 4 of 12 Omens, and the
   24-ware pre-R8 shop pool; everything else is earned by playing. Cloned from
   lantern-profile.js: storage-injected, monotonic, garbage-tolerant, headless-
   testable, and entirely outside the run save (zero save-surface bump).

   This module is inert on its own: it is the source of truth that rollShop,
   the omen roll, the hero rail, the Almanac, and route-sim's warePool knob
   consume in later seams. Nothing reads it yet.

   EPOCH: the guarantee is that pre-0.92 history grants nothing. It is provided
   the clean way, by forward post-epoch counters that start at zero when the
   profile is created and only advance inside settleUnlocks (guarded by a
   reportId ledger against a won-run resume re-settling). That is exactly a
   delta since the epoch, implemented as a counter rather than (current minus
   snapshot), so no report store read is needed at settle time. The epoch
   object still records the lifetime totals at creation for provenance, seeded
   by the optional initUnlockProfile call. */
import {ITEMS,HEROES,ANOMALIES} from './data.js';
import {lanternMaxPick} from './lantern-profile.js';

const KEY='bb-unlocks';
const DEV_KEY='bb-unlocks-all';
const SETTLED_CAP=32;

/* Starter sets (design-unlocks-0.92.md). The three most legible hero kits, one
   per core shop weight, including the only hero with a starting ware. Four
   Omens: two economy teachers, one tempo teacher, one combat-flavor omen
   matched to the Kilnkeeper starter (fortified was swapped out for molasses in
   synthesis; fortified is a mid unlock). */
export const STARTER_HEROES=['knife','kiln','apoth'];
export const STARTER_OMENS=['bull','overstock','molasses','wildfire'];

/* The 24-ware pre-R8 shop pool: the exact set the game shipped with and was
   tuned on for 80-plus versions, so the first hour is proven and every
   category and tier 1-2 fusion feeder is intact. This is the classic 26 minus
   the two income wares (purse, ledger), which the shop already excludes. */
export const STARTER_SHOP_WARES=[
  'dagger','sword','fangs','serpent','mace','crossbow','hammer',
  'vial','venom','torch','bomb','magma',
  'buckler','brassbuckler','barricade','tower','aegis',
  'bandage','salve','chalice','sanctum',
  'whetstone','hourglass','adren'
];

/* The sealed-merchant trigger hints for the hero rail and the replay guard
   (design-unlocks-0.92.md, Presentation): Persian night market voice, second
   person, one sentence carrying the literal trigger, no UI words. The three
   starters need no hint (they are never sealed). Zero dashes anywhere. */
export const HERO_HINTS={
  lender:"The Moneylender extends no credit to strangers; finish three nights and he will find you.",
  architect:"The Brass Architect raises no stall for the untested; reach the Palace Quarter and he will build beside you.",
  venom:"The Venom Broker deals only with proven survivors; outlast four nights and his door opens.",
  silkblade:"The Silkblade measures her steel against the worthy alone; clear a road under a lit Lantern and she takes the next stall.",
  ash:"The Ash Collector walks in only when the whole Long Bazaar lies cleared; carry a road to its end and he gathers at your side."
};

/* The sealed-omen trigger hints for the Almanac plaque and the title caption,
   same voice and grammar as the hero hints: Persian night market, second
   person, one sentence carrying the literal trigger, no UI words, zero dashes.
   The four starters (bull, overstock, molasses, wildfire) are never sealed. */
export const OMEN_HINTS={
  rapid:"Rapid Trade rewards the first night survived; close a single night and dawn hands it to you.",
  moon:"The Blood Moon rises for the seasoned; finish three nights and it hangs over your road.",
  fortified:"Fortified favors a deep purse; end a night standing at Tier 4 and its walls are raised for you.",
  plague:"Plague Winds gather where venom runs thick; apply sixty poison across one night and they answer.",
  glass:"The Glass Night tests the unbroken; fell three masters in one night without clearing the road and it settles on you.",
  narrow:"The Narrow Alleys open to the proven; clear a road under Lantern 2 and they wind your way.",
  silent:"The Silent Bazaar answers many hands; clear a road with three different merchants and its hush is yours.",
  auctionbell:"The Auction Bell tolls for the bold; slay the Night Auctioneer at the Gate and it rings for you.",
  deep:"Deep Shelves stock for a deep purse; end a night standing at Tier 5 and they fill for you.",
  patient:"The Patient Merchant keeps late hours; return for a sixth night and he holds his wares through the frost for you.",
  lean:"Lean Shelves reward the unburdened; clear two roads and the thin market opens to you.",
  charter:"The Guild Charter honors a masterwork; end a night holding a Diamond ware and the guilds feature your trade."
};

/* The sealed-ware trigger hints for the eleven trigger-gated shop wares
   (LOCKED_START_WARES): the seven R8 wares and the four 0.97.0 payoff wares.
   The 29 uniques take no trigger hint: they are discovery-gated and wear a
   channel hint instead (see wareChannelHint). Same voice, zero dashes. */
export const WARE_HINTS={
  kilnchain:"The Kiln Chain links to a tempered flame; forge any Burn ware to Silver and the smith parts with it.",
  rosewaterpump:"The Rosewater Pump rewards a first joining; forge your first Silver and it is drawn up for you.",
  saltward:"The Salt Ward guards a golden hoard; end a night holding a Gold ware and its circle is scribed for you.",
  sapperspick:"The Sapper's Pick is earned in gold; forge your first Gold ware and it is set in your hand.",
  venomsiphon:"The Venom Siphon is drawn from the serpent queen; slay Shahmaran and it coils to you.",
  chirurgeonsscissors:"The Chirurgeon's Scissors are honed on the rarest work; forge your first Diamond and they are yours.",
  surgeonhook:"The Surgeon's Hook waits past a cleared road; carry any road to its end and it hangs at your belt.",
  drummer:"The Drummer of the Souk keeps time for a stall of blades; forge any weapon to Silver and his rhythm falls in beside yours.",
  procession:"The Poisoners' Procession files in behind a proven venom; forge any poison ware to Silver and the line marches for you.",
  march:"The Torchbearers' March needs a tended flame; forge any burn ware to Silver and the column lights for you.",
  round:"The Shieldwrights' Round gathers at a raised wall; forge any shield ware to Silver and the circle closes around you."
};

/* Pure render decisions for the hero picker, shared by openHeroPick in ui.js
   and pinned headlessly by tests/unlock-hero.test.js. ui.js cannot be imported
   under node:test (it pulls the DOM art/fx/sfx layers), so extracting the
   locked-versus-open decisions out of the DOM-bound draw() is what lets a test
   PROVE full-unlock byte identity instead of merely inspecting it: openHeroPick
   consumes these, so a sealed verdict cannot silently add an attribute or class
   the pre-seam markup lacked. Every field is empty or null at full unlock, so
   the chip, the detail portrait, and the confirm button all render byte for
   byte as they did before the seam. Zero dashes anywhere. */
export function heroChipAttrs(selected,locked){
  return {
    cls:'herochip'+(selected?' on':'')+(locked?' lockd':''),
    labelSeal:locked?', sealed':'',
    lockCorner:locked?'<span class="herolock" aria-hidden="true"></span>':''
  };
}
export function heroPortraitClass(locked){
  return locked?' lockd':'';
}
export function heroConfirmView(locked){
  return {cls:locked?'btn stonehint':'btn gold',aria:locked?'true':null,text:locked?'Sealed Stall':'Take the Stall'};
}

/* The trigger-gated shop wares: the seven R8 hook wares plus the four 0.97.0
   synergy-count payoff wares. Each is a stateful or conditional hook ware whose
   concept is noise before the player has met the situation it answers; they are
   variety and complexity unlocks, not power unlocks (the sim shows the starter
   pool is slightly EASIER without them). The payoff wares earn in on a forged
   category, exactly when their count synergy begins to matter, so the proven
   24-ware starter pool stays pristine. */
export const LOCKED_START_WARES=[
  'surgeonhook','sapperspick','venomsiphon','kilnchain',
  'saltward','rosewaterpump','chirurgeonsscissors',
  'drummer','procession','march','round'
];

/* The trigger table (design-unlocks-0.92.md). Each entry names the descriptor
   that unlocks and a pure predicate over (record, counters). Count and clear
   predicates read the post-epoch counters; the rest read the current record.
   Detection fields were verified against route-report.js and route-metrics.js. */
function isClear(rec){
  const r=rec&&rec.result;
  return r==='win'||r==='quick_clear'||r==='long_clear'||(typeof r==='string'&&r.indexOf('clear')>=0);
}
function isLongClear(rec){
  return isClear(rec)&&((rec&&rec.result)==='long_clear'||(rec&&rec.routeMode)==='long');
}
function fusionEvents(rec){
  const ev=(rec&&rec.metrics&&rec.metrics.events)||[];
  return ev.filter(function(e){return e&&e.type==='fusion'&&e.data&&e.data.id;});
}
function maxFusionRarity(rec,catFilter){
  return fusionEvents(rec).reduce(function(m,e){
    if(catFilter&&(!ITEMS[e.data.id]||ITEMS[e.data.id].cat!==catFilter))return m;
    return Math.max(m,e.data.rarity||0);
  },-1);
}
function boardHoldsRarity(rec,minR){
  const b=(rec&&rec.economy&&rec.economy.board)||[],v=(rec&&rec.economy&&rec.economy.vault)||[];
  return b.concat(v).some(function(w){return (w.rarity||0)>=minR;});
}
function slew(rec,monsterId){
  const f=(rec&&rec.metrics&&rec.metrics.fights)||[];
  return f.some(function(x){return x&&x.monsterId===monsterId&&x.winner==='a';});
}
function poisonApplied(rec){
  const w=(rec&&rec.metrics&&rec.metrics.wares)||{};
  return Object.keys(w).reduce(function(s,id){return s+((w[id]&&w[id].damage&&w[id].damage.poison)||0);},0);
}

/* kind is heroes | omens | wares; id is the descriptor unlocked. cond reads the
   finished record and the post-epoch counters {runs, clears, clearsByHero}. */
const TRIGGERS=[
  {kind:'omens', id:'rapid',      cond:function(r,c){return c.runs>=1;}},
  {kind:'wares', id:'kilnchain',  cond:function(r){return maxFusionRarity(r,'burn')>=1;}},
  {kind:'wares', id:'rosewaterpump', cond:function(r){return maxFusionRarity(r)>=1;}},
  {kind:'heroes',id:'lender',     cond:function(r,c){return c.runs>=3;}},
  {kind:'wares', id:'saltward',   cond:function(r){return boardHoldsRarity(r,2);}},
  {kind:'omens', id:'moon',       cond:function(r,c){return c.runs>=3;}},
  {kind:'wares', id:'sapperspick',cond:function(r){return maxFusionRarity(r)>=2;}},
  {kind:'heroes',id:'architect',  cond:function(r){return ((r.progress&&r.progress.districtId)||0)>=3;}},
  {kind:'wares', id:'venomsiphon',cond:function(r){return slew(r,'shahmaran');}},
  {kind:'omens', id:'fortified',  cond:function(r){return ((r.economy&&r.economy.tier)||0)>=4;}},
  {kind:'heroes',id:'venom',      cond:function(r,c){return c.runs>=4;}},
  {kind:'omens', id:'plague',     cond:function(r){return poisonApplied(r)>=60;}},
  {kind:'wares', id:'chirurgeonsscissors', cond:function(r){return maxFusionRarity(r)>=3;}},
  {kind:'omens', id:'glass',      cond:function(r){return ((r.progress&&r.progress.bossesBeaten)||0)>=3&&!isClear(r);}},
  {kind:'wares', id:'surgeonhook',cond:function(r){return isClear(r);}},
  {kind:'heroes',id:'silkblade',  cond:function(r){return isClear(r)&&((r.lantern||0)>=1);}},
  {kind:'omens', id:'narrow',     cond:function(r){return isClear(r)&&((r.lantern||0)>=2);}},
  {kind:'omens', id:'silent',     cond:function(r,c){return Object.keys(c.clearsByHero).length>=3;}},
  {kind:'omens', id:'auctionbell',cond:function(r){return slew(r,'auctioneer');}},
  {kind:'heroes',id:'ash',        cond:function(r){return isLongClear(r);}},
  /* The 0.97.0 payoff wares: each earns in on a forged category, mirroring the
     Kiln Chain's burn-Silver trigger. A forged category is exactly when the
     count synergy the ware pays off on starts to be a build the player has. */
  {kind:'wares', id:'drummer',    cond:function(r){return maxFusionRarity(r,'dmg')>=1;}},
  {kind:'wares', id:'procession', cond:function(r){return maxFusionRarity(r,'poison')>=1;}},
  {kind:'wares', id:'march',      cond:function(r){return maxFusionRarity(r,'burn')>=1;}},
  {kind:'wares', id:'round',      cond:function(r){return maxFusionRarity(r,'shield')>=1;}},
  /* The 0.98.0 pool-shaping guild Omens: each earns on the economy feat it
     teaches. Deep Shelves on a deep purse (end at Tier 5), the Patient Merchant
     on sustained play (a sixth night), Lean Shelves on discipline (two cleared
     roads), the Guild Charter on a masterwork held (a Diamond at night's end). */
  {kind:'omens', id:'deep',       cond:function(r){return ((r.economy&&r.economy.tier)||0)>=5;}},
  {kind:'omens', id:'patient',    cond:function(r,c){return c.runs>=6;}},
  {kind:'omens', id:'lean',       cond:function(r,c){return c.clears>=2;}},
  {kind:'omens', id:'charter',    cond:function(r){return boardHoldsRarity(r,3);}}
];

function blankProfile(){
  return {v:1,createdAt:null,epoch:{runs:0,clears:0},
    runs:0,clears:0,clearsByHero:{},
    heroes:[],omens:[],wares:[],settled:[]};
}
function normalize(p){
  const b=blankProfile();
  if(!p||typeof p!=='object')return b;
  b.createdAt=typeof p.createdAt==='string'?p.createdAt:null;
  if(p.epoch&&typeof p.epoch==='object'){b.epoch.runs=+p.epoch.runs||0;b.epoch.clears=+p.epoch.clears||0;}
  b.runs=+p.runs||0;b.clears=+p.clears||0;
  if(p.clearsByHero&&typeof p.clearsByHero==='object'){
    Object.keys(p.clearsByHero).forEach(function(k){if(p.clearsByHero[k])b.clearsByHero[k]=1;});
  }
  ['heroes','omens','wares','settled'].forEach(function(f){
    if(Array.isArray(p[f]))b[f]=p[f].filter(function(x){return typeof x==='string';});
  });
  if(b.settled.length>SETTLED_CAP)b.settled=b.settled.slice(-SETTLED_CAP);
  return b;
}

export function readUnlockProfile(storage){
  if(!storage)return blankProfile();
  try{return normalize(JSON.parse(storage.getItem(KEY)||'null'));}
  catch(e){return blankProfile();}
}
function writeUnlockProfile(storage,p){
  try{storage.setItem(KEY,JSON.stringify(p));return true;}catch(e){return false;}
}

/* Seed the epoch once, from the caller's lifetime totals (computed from the
   local history at startup). A no-op if a profile already exists, so it never
   overwrites progress. Correctness of "history grants nothing" does not depend
   on this: the post-epoch counters start at zero regardless. */
export function initUnlockProfile(storage,priorTotals){
  if(!storage)return blankProfile();
  const raw=(function(){try{return JSON.parse(storage.getItem(KEY)||'null');}catch(e){return null;}})();
  if(raw)return normalize(raw);
  const p=blankProfile();
  p.createdAt=(priorTotals&&priorTotals.createdAt)||'seeded';
  p.epoch.runs=(priorTotals&&+priorTotals.runs)||0;
  p.epoch.clears=(priorTotals&&+priorTotals.clears)||0;
  writeUnlockProfile(storage,p);
  return p;
}

/* ?debug plus bb-unlocks-all==='1' opens everything, read in one place so
   every surface honors it with no per-callsite checks. While on, settleUnlocks
   writes nothing, so a test run never contaminates the chase. */
export function devAllOpen(storage){
  if(!storage)return false;
  try{
    if(storage.getItem(DEV_KEY)!=='1')return false;
    const q=(typeof location!=='undefined'&&location.search)||'';
    return q.indexOf('debug')>=0;
  }catch(e){return false;}
}

export function heroUnlocked(storage,id){
  if(STARTER_HEROES.indexOf(id)>=0)return true;
  if(devAllOpen(storage))return true;
  return readUnlockProfile(storage).heroes.indexOf(id)>=0;
}
export function omenUnlocked(storage,id){
  if(STARTER_OMENS.indexOf(id)>=0)return true;
  if(devAllOpen(storage))return true;
  return readUnlockProfile(storage).omens.indexOf(id)>=0;
}
export function wareUnlocked(storage,id){
  if(STARTER_SHOP_WARES.indexOf(id)>=0)return true;
  /* signature wares are hero identity, not Almanac chase: they never seal and
     never count toward the collection (see collectionTotal). The hero gate at
     every grant pool is their sole visibility control, so a foreign hero never
     sees one and the owning hero sees it from round one. */
  if(ITEMS[id]&&ITEMS[id].sig)return true;
  if(devAllOpen(storage))return true;
  return readUnlockProfile(storage).wares.indexOf(id)>=0;
}

/* the 24 starter shop ids, the single source of truth shared by rollShop,
   ensureOpeningOffense, and route-sim's warePool knob so tuning cannot drift */
export function starterShopIds(){return STARTER_SHOP_WARES.slice();}

/* The locked complement of the ware catalogue at this instant: every id the
   live profile does NOT read as unlocked. A run snapshots this at construction
   so its shop rolls stay frozen even if the profile later changes, and it is
   stored as the complement (a blocklist), not a whitelist: a ware added in a
   later version is absent from the blocklist, so a resumed run rolls it rather
   than silently filtering it out. At full unlock (dev flag) the complement is
   empty, which is why a full-unlock run's shop is byte-identical to today. */
export function lockedWareComplement(storage){
  if(devAllOpen(storage))return [];
  return Object.keys(ITEMS).filter(function(id){return !wareUnlocked(storage,id);});
}

/* The per-run shop verdict for one id. A run built under 0.92+ carries a frozen
   locked complement (run.wareLock), so a resumed market rolls identically; a
   pre-0.92 run has no snapshot and is grandfathered to the full pool (exempt
   from the gate for the rest of its life); with no run context at all (the
   lobby shop) the live unlock verdict applies. An empty snapshot ([]) means
   nothing is locked, i.e. the full pool, which is the full-unlock case. */
export function runWareAllowed(storage,run,id){
  if(run){
    const lock=run.wareLock;
    if(lock)return lock.indexOf(id)<0;
    return true;
  }
  return wareUnlocked(storage,id);
}

/* the full unlocked lists for the hero picker, omen reveal, and Almanac */
export function unlockedHeroes(storage){
  if(devAllOpen(storage))return null;   /* null means everything, per caller */
  return STARTER_HEROES.concat(readUnlockProfile(storage).heroes);
}
export function unlockedOmens(storage){
  if(devAllOpen(storage))return null;
  return STARTER_OMENS.concat(readUnlockProfile(storage).omens);
}

/* Hero and Omen compatibility (Launch L2 0.99.4). A fresh random run must not
   hand the player an Omen whose whole effect cancels their hero's identity. The
   Apothecary is a heal hero; Blood Moon (moon) disables all healing,
   regeneration, and lifesteal, so the pairing deletes the kit for the night (the
   sim measured the cliff: Apothecary clears fall from ~98% to ~32% Quick and
   ~96% to ~7% Long under moon). This is a pool shape, not an unlock: the blocked
   Omen may be fully unlocked and freely reachable for every other hero. */
export const OMEN_HERO_INCOMPAT={apoth:['moon']};

/* Drop a hero's incompatible Omens from an already-eligible pool, in place order,
   without consuming any rng. newRoute calls this on the eligible pool BEFORE its
   single deterministic draw, so the draw still spends exactly one rng() call and
   every unaffected hero and Omen selection stays byte-identical. The block is
   skipped whenever it would empty the pool, so a pool that is only the blocked
   Omen still resolves (no dead roll) and the guarantee never depends on unlock
   state. Only the fresh run-start random draw calls this: explicit replay
   overrides, restored active runs, and the simulator's explicit Apothecary plus
   Blood Moon negative-control cell all pass their Omen straight through and are
   untouched. `pool` is an array of Omen (ANOMALIES) objects. */
export function compatibleOmenPool(pool,heroId){
  const blocked=OMEN_HERO_INCOMPAT[heroId];
  if(!blocked||!blocked.length)return pool;
  const kept=(pool||[]).filter(function(a){return blocked.indexOf(a.id)<0;});
  return kept.length?kept:pool;
}

/* Monotonic set-add for a wild find (a unique taken from a bounty, the Vault,
   a Treasure cache, or the midpoint pivot). Returns whether the id is now
   held. Dev mode records nothing, per the no-contamination rule. */
export function recordFound(storage,kind,id){
  if(!storage||!id||['heroes','omens','wares'].indexOf(kind)<0)return false;
  if(devAllOpen(storage))return true;
  const p=readUnlockProfile(storage);
  if(p[kind].indexOf(id)>=0)return true;
  p[kind].push(id);
  return writeUnlockProfile(storage,p)&&readUnlockProfile(storage)[kind].indexOf(id)>=0;
}

/* Evaluate every trigger against the finished record ONCE. Increments the
   post-epoch counters using this record first (so "finish your first night"
   fires on run 1), guards against a won-run resume re-settling via the
   reportId ledger, and returns the list of newly unlocked descriptors
   {kind, id} for the end-screen strip. Never writes in dev mode. */
export function settleUnlocks(storage,record){
  if(!storage||!record)return [];
  if(devAllOpen(storage))return [];
  const reportId=record.reportId||null;
  const p=readUnlockProfile(storage);
  if(p.createdAt===null)p.createdAt='settled';
  if(reportId&&p.settled.indexOf(reportId)>=0)return [];   /* already settled */

  p.runs+=1;
  if(isClear(record)){
    p.clears+=1;
    const hero=(record.setup&&record.setup.heroId)||null;
    if(hero)p.clearsByHero[hero]=1;
  }
  const counters={runs:p.runs,clears:p.clears,clearsByHero:p.clearsByHero};

  const newly=[];
  for(const t of TRIGGERS){
    if(p[t.kind].indexOf(t.id)>=0)continue;            /* already held */
    if(STARTER_HEROES.indexOf(t.id)>=0&&t.kind==='heroes')continue;
    if(STARTER_OMENS.indexOf(t.id)>=0&&t.kind==='omens')continue;
    if(STARTER_SHOP_WARES.indexOf(t.id)>=0&&t.kind==='wares')continue;
    let hit=false;
    try{hit=!!t.cond(record,counters);}catch(e){hit=false;}
    if(hit){p[t.kind].push(t.id);newly.push({kind:t.kind,id:t.id});}
  }

  if(reportId){p.settled.push(reportId);if(p.settled.length>SETTLED_CAP)p.settled=p.settled.slice(-SETTLED_CAP);}
  writeUnlockProfile(storage,p);
  return newly;
}

/* The grant-time event a treasure-buy or bounty-take site emits, carrying
   data.id, so possession settlement can credit a chosen unique that is still
   parked as a free market offer at run end (never on the board, never bought).
   Both the emitter (route-ui, ui.js) and the consumer read this one constant. */
export const WILD_FIND_EVENT='wild_find';

/* Possession-grade extraction of the uniques a finished run actually FOUND
   (design-unlocks-0.92.md, The wild-find detection). A unique is possessed when
   the record proves the player held or took it: on the board, in the vault, a
   metrics.wares row with a real buy, free take, or fight, or a grant-time
   wild_find event. Offered-but-untaken treasure (a face-up option not chosen)
   and free shelf exposures (an offer left unbought) are deliberately NOT
   possession, so they never leak an unlock. Only uniques are extracted here; the
   trigger-gated shop wares unlock through their own forge and feat triggers, not
   by being handed to the player. */
function foundUniqueIds(record){
  const out={};
  const add=function(id){if(id&&ITEMS[id]&&ITEMS[id].unique)out[id]=1;};
  const eco=(record&&record.economy)||{};
  (eco.board||[]).forEach(function(w){add(w&&w.id);});
  (eco.vault||[]).forEach(function(w){add(w&&w.id);});
  const wares=(record&&record.metrics&&record.metrics.wares)||{};
  Object.keys(wares).forEach(function(id){
    const w=wares[id];
    if(w&&((w.buys||0)+(w.freeTakes||0)+(w.fights||0))>0)add(id);
  });
  const ev=(record&&record.metrics&&record.metrics.events)||[];
  ev.forEach(function(e){if(e&&e.type===WILD_FIND_EVENT&&e.data&&e.data.id)add(e.data.id);});
  return Object.keys(out);
}

/* Record every newly possessed unique and return the {kind:'wares',id}
   descriptors that were not already held, for the end-screen strip. Monotonic
   (recordFound), idempotent across a won-run resume (an already-found unique
   reads unlocked and is skipped), and a total no-op in dev mode. */
export function settleWildFinds(storage,record){
  if(!storage||!record)return [];
  if(devAllOpen(storage))return [];
  const newly=[];
  foundUniqueIds(record).forEach(function(id){
    if(wareUnlocked(storage,id))return;
    if(recordFound(storage,'wares',id))newly.push({kind:'wares',id:id});
  });
  return newly;
}

/* ============ THE ALMANAC (presentation, design-unlocks-0.92.md) ============
   Pure resolvers for the Almanac tab (the renamed Discovery tab) and the title
   caption. Storage is injected so tests pin every tile state, header count, and
   the next-hint walk headlessly; route-ui renders exactly what these return, so
   a tile can never drift from the unlock truth. Zero dashes in every string. */

/* whether a gated-category descriptor reads unlocked (starter, dev, or found) */
function kindUnlocked(storage,kind,id){
  if(kind==='heroes')return heroUnlocked(storage,id);
  if(kind==='omens')return omenUnlocked(storage,id);
  return wareUnlocked(storage,id);
}
/* whether a locked ware is trigger-gated (one of the eleven LOCKED_START_WARES)
   as opposed to a discovery-gated unique. Heroes and omens are always trigger-gated. */
function wareTriggerGated(id){return LOCKED_START_WARES.indexOf(id)>=0;}

/* the plaque hint for a locked trigger-gated descriptor (hero, omen, or one of
   the locked wares). Empty string only if a descriptor somehow lacks copy. */
export function triggerHint(kind,id){
  if(kind==='heroes')return HERO_HINTS[id]||'';
  if(kind==='omens')return OMEN_HINTS[id]||'';
  if(kind==='wares')return WARE_HINTS[id]||'';
  return '';
}
/* the channel hint for a discovery-gated unique ware, told by where it is found:
   the eighteen Treasure uniques carry acquisition 'treasure', the eleven bounty
   uniques carry none and are taken from a slain master's spoils or the Vault. */
export function wareChannelHint(id){
  const it=ITEMS[id];
  if(it&&it.acquisition==='treasure')return "Found in Treasure caches.";
  return "Taken from a master's bounty or the Vault.";
}

/* Resolve one Almanac tile to its render decision. Monsters keep the 0.90
   seen-or-unknown behavior (they carry no unlock gate); the three gated
   categories resolve on the unlock truth alone, so a tile seen in pre-0.92 or
   cloud-merged history but still sealed shows the locked state (unlocked wins
   the tile only when bb-unlocks says so). Fields:
     state : 'found' | 'unseen' | 'locked'
     art   : true to paint the glyph, false for the veil or silhouette
     label : the real name or '???'
     gate  : 'trigger' | 'discovery' | null (only set when locked)
     hint  : the plaque copy for a locked tile, else '' */
export function almanacTile(storage,kind,id,name,seen){
  if(kind==='monsters'){
    return seen
      ?{state:'found',art:true,label:name,gate:null,hint:''}
      :{state:'unseen',art:false,label:'???',gate:null,hint:''};
  }
  if(kindUnlocked(storage,kind,id))return {state:'found',art:true,label:name,gate:null,hint:''};
  if(kind!=='wares'||wareTriggerGated(id)){
    return {state:'locked',art:false,label:name,gate:'trigger',hint:triggerHint(kind,id)};
  }
  return {state:'locked',art:false,label:'???',gate:'discovery',hint:wareChannelHint(id)};
}

/* Header counts for one gated category: {found, sealed, total}. ids is the
   category catalogue (heroes, omens, or the reachable non-income wares). Monsters
   are seen-counted by the caller, not sealed, so they do not pass through here. */
export function almanacCounts(storage,kind,ids){
  let found=0;
  ids.forEach(function(id){if(kindUnlocked(storage,kind,id))found++;});
  return {found:found,sealed:ids.length-found,total:ids.length};
}

/* The collection is heroes plus omens plus the reachable wares. The two income
   wares (purse, ledger) are excluded and unreachable, and the signature wares are
   excluded too (they ride in with their hero, not the Almanac chase), so the
   catalogue is derived from data and cannot drift when a descriptor is added. */
export function collectionTotal(){
  const wares=Object.keys(ITEMS).filter(function(id){return !ITEMS[id].inc&&!ITEMS[id].sig;}).length;
  return HEROES.length+ANOMALIES.length+wares;
}
/* how many of the catalogue the player holds right now (starters always count) */
export function collectionFound(storage){
  let n=0;
  HEROES.forEach(function(h){if(heroUnlocked(storage,h.id))n++;});
  ANOMALIES.forEach(function(a){if(omenUnlocked(storage,a.id))n++;});
  Object.keys(ITEMS).forEach(function(id){if(!ITEMS[id].inc&&!ITEMS[id].sig&&wareUnlocked(storage,id))n++;});
  return n;
}

/* The title-screen caption: the nearest unclaimed trigger, then countable
   unique progress once every trigger is claimed, then a Lantern handoff at full
   completion so the second-reward promise survives the whole life of the game.
   Returns null under the dev flag (the caption is hidden at that full unlock).
   TRIGGERS is ordered by expected run, so its first unclaimed entry is nearest. */
export function nextUnlockHint(storage){
  if(devAllOpen(storage))return null;
  const prof=readUnlockProfile(storage);
  const held={heroes:prof.heroes||[],omens:prof.omens||[],wares:prof.wares||[]};
  for(const t of TRIGGERS){
    if(t.kind==='heroes'&&STARTER_HEROES.indexOf(t.id)>=0)continue;
    if(t.kind==='omens'&&STARTER_OMENS.indexOf(t.id)>=0)continue;
    if(t.kind==='wares'&&STARTER_SHOP_WARES.indexOf(t.id)>=0)continue;
    if(held[t.kind].indexOf(t.id)>=0)continue;
    return triggerHint(t.kind,t.id);
  }
  const uniqIds=Object.keys(ITEMS).filter(function(id){return ITEMS[id].unique;});
  const found=uniqIds.filter(function(id){return held.wares.indexOf(id)>=0;}).length;
  if(found<uniqIds.length)return 'Uniques found '+found+' of '+uniqIds.length+' in the wild.';
  return 'The Almanac is full. Lantern '+lanternMaxPick(storage,'quick','kiln')+' with the Kilnkeeper waits unlit.';
}
