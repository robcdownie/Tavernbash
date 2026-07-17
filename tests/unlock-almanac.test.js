import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ITEMS,HEROES,ANOMALIES} from '../src/data.js';
import {
  almanacTile, almanacCounts, collectionTotal, collectionFound, nextUnlockHint,
  triggerHint, wareChannelHint,
  STARTER_HEROES, STARTER_OMENS, LOCKED_START_WARES, OMEN_HINTS, HERO_HINTS
} from '../src/unlock-profile.js';

/* an injected localStorage stand-in, same shape the other unlock tests use */
function fakeStore(seed){
  const m=new Map(Object.entries(seed||{}));
  return {getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,String(v)), removeItem:k=>m.delete(k), _m:m};
}
/* seed a profile that already holds the given descriptor lists */
function profileStore(over){
  const p=Object.assign({v:1,createdAt:'t',epoch:{runs:0,clears:0},runs:0,clears:0,clearsByHero:{},
    heroes:[],omens:[],wares:[],settled:[]},over||{});
  return fakeStore({'bb-unlocks':JSON.stringify(p)});
}

const heroIds=HEROES.map(h=>h.id);
const omenIds=ANOMALIES.map(a=>a.id);
const wareIds=Object.keys(ITEMS).filter(id=>!ITEMS[id].inc);
const uniqueIds=Object.keys(ITEMS).filter(id=>ITEMS[id].unique);
const dashRe=new RegExp('['+String.fromCharCode(0x2013)+String.fromCharCode(0x2014)+']');

/* --- tile-state resolution --- */

test('a locked trigger-gated hero shows its real name and the locked state',()=>{
  const s=fakeStore();                                 /* blank profile */
  const t=almanacTile(s,'heroes','lender',HEROES.find(h=>h.id==='lender').n,false);
  assert.equal(t.state,'locked');
  assert.equal(t.gate,'trigger');
  assert.equal(t.art,false);
  assert.equal(t.label,'The Moneylender','a chase needs a target, so the name is shown');
  assert.equal(t.hint,HERO_HINTS.lender);
  assert.ok(t.hint.length>0,'never a dead tap');
});

test('a seen-but-locked hero still shows the locked state (unlock, not history, wins the tile)',()=>{
  const s=fakeStore();                                 /* seen=true from history, but sealed */
  const t=almanacTile(s,'heroes','venom',HEROES.find(h=>h.id==='venom').n,true);
  assert.equal(t.state,'locked','history exposure does not unlock the tile');
});

test('a locked treasure unique stays ??? with a channel hint (name hidden)',()=>{
  const s=fakeStore();
  assert.equal(ITEMS.viperverdict.acquisition,'treasure','fixture: viperverdict is treasure-gated');
  const t=almanacTile(s,'wares','viperverdict',ITEMS.viperverdict.n,false);
  assert.equal(t.state,'locked');
  assert.equal(t.gate,'discovery');
  assert.equal(t.label,'???','a discovery-gated unique never reveals its name');
  assert.equal(t.art,false);
  assert.equal(t.hint,'Found in Treasure caches.');
});

test('a locked bounty unique carries the bounty channel hint',()=>{
  const s=fakeStore();
  assert.ok(!ITEMS.serpentcrown.acquisition,'fixture: serpentcrown is a bounty unique');
  const t=almanacTile(s,'wares','serpentcrown',ITEMS.serpentcrown.n,false);
  assert.equal(t.gate,'discovery');
  assert.equal(t.label,'???');
  assert.equal(t.hint,wareChannelHint('serpentcrown'));
  assert.ok(t.hint.indexOf('bounty')>=0);
});

test('a locked trigger-gated ware (one of the seven R8) shows its real name',()=>{
  const s=fakeStore();
  const t=almanacTile(s,'wares','kilnchain',ITEMS.kilnchain.n,false);
  assert.equal(t.gate,'trigger');
  assert.equal(t.label,ITEMS.kilnchain.n);
  assert.ok(t.hint.length>0);
});

test('a found (starter) ware shows art and name',()=>{
  const s=fakeStore();
  const t=almanacTile(s,'wares','dagger',ITEMS.dagger.n,false);
  assert.equal(t.state,'found');
  assert.equal(t.art,true);
  assert.equal(t.label,ITEMS.dagger.n);
  assert.equal(t.gate,null);
  assert.equal(t.hint,'');
});

test('a recorded unique reads as found (art and name)',()=>{
  const s=profileStore({wares:['viperverdict']});
  const t=almanacTile(s,'wares','viperverdict',ITEMS.viperverdict.n,false);
  assert.equal(t.state,'found');
  assert.equal(t.art,true);
  assert.equal(t.label,ITEMS.viperverdict.n);
});

test('a monster tile is seen-or-unknown, never sealed',()=>{
  const s=fakeStore();
  assert.equal(almanacTile(s,'monsters','imp','Imp',true).state,'found');
  const un=almanacTile(s,'monsters','imp','Imp',false);
  assert.equal(un.state,'unseen');
  assert.equal(un.label,'???');
  assert.equal(un.gate,null);
});

/* --- header counts --- */

test('header counts split found and sealed for each gated category',()=>{
  const s=fakeStore();                                 /* blank: only starters found */
  const h=almanacCounts(s,'heroes',heroIds);
  assert.deepEqual(h,{found:STARTER_HEROES.length,sealed:heroIds.length-STARTER_HEROES.length,total:heroIds.length});
  assert.equal(h.total,8);
  const o=almanacCounts(s,'omens',omenIds);
  assert.deepEqual(o,{found:STARTER_OMENS.length,sealed:omenIds.length-STARTER_OMENS.length,total:omenIds.length});
  assert.equal(o.total,12);
  const w=almanacCounts(s,'wares',wareIds);
  assert.equal(w.total,60,'the sixty reachable wares (income wares excluded)');
  assert.equal(w.found,24,'the 24 starter shop wares');
  assert.equal(w.sealed,36);
});

test('recording a descriptor moves it from sealed to found',()=>{
  const s=profileStore({heroes:['lender']});
  const h=almanacCounts(s,'heroes',heroIds);
  assert.equal(h.found,STARTER_HEROES.length+1);
  assert.equal(h.sealed,heroIds.length-STARTER_HEROES.length-1);
});

/* --- the collection total --- */

test('the collection count is 80 (purse and ledger excluded, monsters not counted)',()=>{
  assert.equal(collectionTotal(),80);
  assert.equal(collectionTotal(),HEROES.length+ANOMALIES.length+wareIds.length);
});

test('collectionFound counts starters on a blank profile',()=>{
  const s=fakeStore();
  assert.equal(collectionFound(s),STARTER_HEROES.length+STARTER_OMENS.length+24);
});

/* --- nextUnlockHint: nearest trigger, then progress, then Lantern handoff --- */

test('nextUnlockHint on a blank profile points at the nearest unclaimed trigger',()=>{
  const s=fakeStore();
  /* TRIGGERS is ordered by expected run; Rapid Trade is first */
  assert.equal(nextUnlockHint(s),OMEN_HINTS.rapid);
});

test('nextUnlockHint advances as triggers are claimed',()=>{
  const s=profileStore({omens:['rapid']});             /* first trigger done */
  const hint=nextUnlockHint(s);
  assert.notEqual(hint,OMEN_HINTS.rapid,'the claimed trigger is skipped');
  assert.ok(hint&&hint.length>0);
});

test('with every trigger claimed but uniques incomplete, it surfaces countable progress',()=>{
  const sealedHeroes=heroIds.filter(id=>STARTER_HEROES.indexOf(id)<0);
  const sealedOmens=omenIds.filter(id=>STARTER_OMENS.indexOf(id)<0);
  const s=profileStore({heroes:sealedHeroes,omens:sealedOmens,wares:LOCKED_START_WARES.slice()});
  const hint=nextUnlockHint(s);
  assert.ok(/^Uniques found \d+ of \d+ in the wild\.$/.test(hint),'countable progress line: '+hint);
  assert.ok(hint.indexOf('of '+uniqueIds.length+' ')>=0,'denominator is the full unique count');
});

test('at full completion nextUnlockHint hands off to the Lantern',()=>{
  const sealedHeroes=heroIds.filter(id=>STARTER_HEROES.indexOf(id)<0);
  const sealedOmens=omenIds.filter(id=>STARTER_OMENS.indexOf(id)<0);
  const allWares=LOCKED_START_WARES.concat(uniqueIds);
  const s=profileStore({heroes:sealedHeroes,omens:sealedOmens,wares:allWares});
  assert.equal(collectionFound(s),collectionTotal(),'the profile now holds all 80');
  const hint=nextUnlockHint(s);
  assert.ok(hint.indexOf('Lantern')>=0,'the promise hands off to the Lantern: '+hint);
});

/* --- copy hygiene: no forbidden dashes in the new strings --- */

test('every Almanac hint string is free of en and em dashes',()=>{
  Object.keys(HERO_HINTS).forEach(id=>assert.equal(dashRe.test(HERO_HINTS[id]),false,'hero '+id));
  Object.keys(OMEN_HINTS).forEach(id=>assert.equal(dashRe.test(OMEN_HINTS[id]),false,'omen '+id));
  LOCKED_START_WARES.forEach(id=>assert.equal(dashRe.test(triggerHint('wares',id)),false,'ware '+id));
  uniqueIds.forEach(id=>assert.equal(dashRe.test(wareChannelHint(id)),false,'channel '+id));
});
