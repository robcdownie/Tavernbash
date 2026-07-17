"use strict";
/* The Lantern mastery profile: highest cleared level per hero per route,
   under the bb-lantern key. Monotonic and idempotent per the Codex ruling:
   a missing entry reads -1, a clear writes max(previous, N), the maximum
   selectable level is min(10, highest + 1), and the write is retried
   whenever a won run resumes to its ending, so a dropped write can never
   cost progression. Storage is injected so the codecs are testable without
   a browser. */
const KEY='bb-lantern';

export function readLanternProfile(storage){
  if(!storage)return {};
  try{
    const p=JSON.parse(storage.getItem(KEY)||'{}');
    return (p&&typeof p==='object')?p:{};
  }catch(e){return {};}
}
export function lanternHighest(storage,mode,heroId){
  const p=readLanternProfile(storage);
  const m=p[mode];
  return (m&&typeof m[heroId]==='number'&&m[heroId]>=0)?Math.min(10,Math.floor(m[heroId])):-1;
}
export function lanternMaxPick(storage,mode,heroId){
  return Math.min(10,lanternHighest(storage,mode,heroId)+1);
}
/* returns whether the profile now durably holds at least `level` for this
   hero and route; a failed write returns false and the caller may retry */
export function recordLanternClear(storage,mode,heroId,level){
  if(!storage||!heroId||(mode!=='quick'&&mode!=='long'))return false;
  const lv=Math.max(0,Math.min(10,Math.floor(level||0)));
  try{
    const p=readLanternProfile(storage);
    const prev=lanternHighest(storage,mode,heroId);
    if(prev>=lv)return true;                 /* idempotent: nothing to raise */
    if(!p[mode])p[mode]={};
    p[mode][heroId]=lv;
    storage.setItem(KEY,JSON.stringify(p));
    return lanternHighest(storage,mode,heroId)===lv;
  }catch(e){return false;}
}
/* One-time reconciliation for players who cleared roads BEFORE the Lantern
   shipped (0.89): those clears predate bb-lantern, so their steppers never
   lit. Scan the local run archive once and seed each cleared hero-and-road at
   the level it was played (Plain reads 0, which unlocks Lantern 1). Idempotent
   by recordLanternClear and guarded by a stored flag so it runs at most once;
   records are passed in so this stays storage-injected and headless-testable. */
const BACKFILL_KEY='bb-lantern-backfill';
export function backfillLanternFromHistory(storage,records){
  if(!storage)return 0;
  try{if(storage.getItem(BACKFILL_KEY)==='1')return 0;}catch(e){return 0;}
  let seeded=0;
  for(const r of (Array.isArray(records)?records:[])){
    if(!r||!r.setup&&!r.result)continue;
    const result=r.result,mode=r.routeMode==='long'?'long':'quick';
    const heroId=(r.setup&&r.setup.heroId)||r.heroId||null;
    const cleared=result==='win'||result==='quick_clear'||result==='long_clear'
      ||(typeof result==='string'&&result.indexOf('_clear')>=0);
    if(cleared&&heroId){
      const lv=(typeof r.lantern==='number'&&r.lantern>=0)?r.lantern:0;
      if(recordLanternClear(storage,mode,heroId,lv))seeded++;
    }
  }
  try{storage.setItem(BACKFILL_KEY,'1');}catch(e){}
  return seeded;
}
