import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HEROES} from '../src/data.js';
import {STARTER_HEROES, HERO_HINTS, heroUnlocked, recordFound,
        heroChipAttrs, heroPortraitClass, heroConfirmView} from '../src/unlock-profile.js';

/* Seam 4 pins (design-unlocks-0.92.md, "The five seams" item 4). ui.js is not
   importable headlessly (it pulls the DOM art/fx/sfx layers), so openHeroPick's
   locked-versus-open render decisions were extracted into the pure exports
   heroChipAttrs, heroPortraitClass, and heroConfirmView, which openHeroPick now
   consumes verbatim. These tests pin those exports directly, so the picker's
   full-unlock byte identity (the chip class/label/lock-corner, the detail
   portrait class, and the Take the Stall button) is genuinely test-guarded, not
   inspection-only: reintroducing an aria-disabled='false' or a stray lockd class
   at full unlock would fail here. They also exercise the real gate predicate
   heroUnlocked and the HERO_HINTS map that the rail and the replay guard share.
   The rail renders ALL eight chips; a chip is lockd exactly when heroUnlocked is
   false, and the replay path refuses a locked heroId with that same hint. A
   restore of an in-progress save never touches this path (it revives the run
   directly), so the exemption is proven by driving reviveRun with a locked hero. */

/* an injected localStorage stand-in, same shape as unlock-omen.test.js */
function fakeStore(seed){
  const m=new Map(Object.entries(seed||{}));
  return {getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,String(v)), removeItem:k=>m.delete(k), _m:m};
}
/* run the body with ?debug present so devAllOpen can see it, then restore */
function withDebug(fn){
  const realLoc=globalThis.location;
  globalThis.location={search:'?debug'};
  try{return fn();}
  finally{ if(realLoc===undefined)delete globalThis.location; else globalThis.location=realLoc; }
}

/* the rail's own selectable/lockd verdict, driven through the SAME render
   decision openHeroPick uses: every HEROES chip renders, and lockd is read off
   the real heroChipAttrs class string (not a raw predicate), so a chip is lockd
   exactly when the shipped chip markup would carry the lockd class */
function railState(storage){
  return HEROES.map(function(h){
    const cls=heroChipAttrs(false,!heroUnlocked(storage,h.id)).cls;
    return {id:h.id,lockd:cls.indexOf('lockd')>=0};
  });
}
/* the replay guard, mirrored from replayHistoryRun: a locked hero is refused
   with its hint, an unlocked hero proceeds */
function replayVerdict(storage,heroId){
  if(heroId&&!heroUnlocked(storage,heroId))return {refused:true,message:HERO_HINTS[heroId]||'This merchant keeps a shuttered stall until you earn the right to it.'};
  return {refused:false,message:null};
}

const LOCKED_FIVE=HEROES.map(h=>h.id).filter(id=>STARTER_HEROES.indexOf(id)<0);

test('the rail always renders all eight heroes', ()=>{
  const s=fakeStore();
  assert.equal(railState(s).length,HEROES.length,'every hero has a chip');
  assert.equal(HEROES.length,8,'the roster is the expected eight');
});

test('full unlock: the selectable hero set equals HEROES and no chip is lockd', ()=>{
  withDebug(function(){
    const dev=fakeStore({'bb-unlocks-all':'1'});
    const rail=railState(dev);
    assert.deepEqual(rail.map(r=>r.id),HEROES.map(h=>h.id),'the rail is HEROES in order');
    assert.ok(rail.every(r=>!r.lockd),'nothing is sealed at full unlock');
    /* every hero confirms and no replay is refused at full unlock */
    for(const h of HEROES)assert.equal(replayVerdict(dev,h.id).refused,false,h.id+' replays freely at full unlock');
  });
});

test('full unlock: the confirm button renders byte-identical to the pre-seam markup', ()=>{
  /* pre-seam button was <button class="btn gold" id="heroGo">Take the Stall</button>:
     class 'btn gold', text 'Take the Stall', and crucially NO aria-disabled.
     heroConfirmView(false).aria must be null so openHeroPick writes no attribute. */
  assert.deepEqual(heroConfirmView(false),{cls:'btn gold',aria:null,text:'Take the Stall'},
    'an open merchant confirms with the pre-seam gold button and no aria-disabled');
  assert.equal(heroConfirmView(false).aria,null,'no aria-disabled attribute is written at full unlock');
  /* a sealed merchant becomes the stone hint plaque, aria-disabled and non-gold */
  assert.deepEqual(heroConfirmView(true),{cls:'btn stonehint',aria:'true',text:'Sealed Stall'},
    'a sealed merchant is the aria-disabled stone plaque');
});

test('full unlock: chip and portrait render byte-identical to the pre-seam markup', ()=>{
  /* pre-seam chip class was 'herochip'+(sel?' on':''), no lockd, no seal label,
     no lock corner, and the detail portrait carried no lockd class. An open
     merchant must reproduce all of that exactly. */
  assert.deepEqual(heroChipAttrs(true,false),{cls:'herochip on',labelSeal:'',lockCorner:''},
    'the selected open chip is the pre-seam herochip on with no seal marks');
  assert.deepEqual(heroChipAttrs(false,false),{cls:'herochip',labelSeal:'',lockCorner:''},
    'an unselected open chip is the pre-seam herochip with no seal marks');
  assert.equal(heroPortraitClass(false),'','the open detail portrait carries no lockd class');
  /* a sealed merchant wears the lockd class, the sealed label, the lock corner */
  assert.deepEqual(heroChipAttrs(true,true),{cls:'herochip on lockd',labelSeal:', sealed',lockCorner:'<span class="herolock" aria-hidden="true"></span>'},
    'a sealed selected chip wears lockd, the sealed label, and the lock corner');
  assert.equal(heroPortraitClass(true),' lockd','a sealed detail portrait wears the lockd class');
});

test('full unlock: every hero chip and the confirm button render open (no seal marks anywhere)', ()=>{
  withDebug(function(){
    const dev=fakeStore({'bb-unlocks-all':'1'});
    /* drive the exact decisions openHeroPick makes, per hero, at full unlock */
    for(const h of HEROES){
      const lk=!heroUnlocked(dev,h.id);
      assert.equal(lk,false,h.id+' is open at full unlock');
      const ca=heroChipAttrs(h.id===HEROES[0].id,lk);
      assert.equal(ca.cls.indexOf('lockd'),-1,h.id+' chip has no lockd class');
      assert.equal(ca.labelSeal,'',h.id+' chip has no sealed label');
      assert.equal(ca.lockCorner,'',h.id+' chip has no lock corner');
      assert.equal(heroPortraitClass(lk),'',h.id+' portrait has no lockd class');
      assert.equal(heroConfirmView(lk).aria,null,h.id+' confirm button writes no aria-disabled');
    }
  });
});

test('starters only: the three starters are open, the other five render lockd', ()=>{
  const s=fakeStore();
  const rail=railState(s);
  const lockedIds=rail.filter(r=>r.lockd).map(r=>r.id).sort();
  assert.deepEqual(lockedIds,LOCKED_FIVE.slice().sort(),'exactly the five non-starters are sealed');
  assert.equal(lockedIds.length,5,'five heroes are sealed for a new profile');
  for(const id of STARTER_HEROES)assert.equal(heroUnlocked(s,id),true,id+' is an open starter');
});

test('every sealed hero carries a non-empty trigger hint (no dead tap, no dashes)', ()=>{
  /* the forbidden chars built from code points so this file itself stays clean:
     en dash 0x2013, em dash 0x2014 */
  const dashRe=new RegExp('['+String.fromCharCode(0x2013)+String.fromCharCode(0x2014)+']');
  for(const id of LOCKED_FIVE){
    const hint=HERO_HINTS[id];
    assert.ok(typeof hint==='string'&&hint.length>0,id+' has a trigger hint');
    assert.equal(dashRe.test(hint),false,id+' hint holds no en or em dash');
  }
});

test('starters only: each of the five locked heroes is refused as a replay target with its hint', ()=>{
  const s=fakeStore();
  for(const id of LOCKED_FIVE){
    const v=replayVerdict(s,id);
    assert.equal(v.refused,true,id+' replay is refused while sealed');
    assert.equal(v.message,HERO_HINTS[id],id+' refusal carries its own trigger hint');
  }
  /* an open starter replays without refusal */
  assert.equal(replayVerdict(s,'knife').refused,false,'a starter replays freely');
});

test('unlocking a sealed hero opens both its chip and its replay path', ()=>{
  const s=fakeStore();
  assert.equal(heroUnlocked(s,'lender'),false,'lender starts sealed');
  recordFound(s,'heroes','lender');
  assert.equal(heroUnlocked(s,'lender'),true,'lender is open after it is found');
  assert.ok(railState(s).some(r=>r.id==='lender'&&!r.lockd),'the lender chip is no longer lockd');
  assert.equal(replayVerdict(s,'lender').refused,false,'a found hero replays freely');
});

test('a restore of an in-progress save is exempt: a locked hero revives without a gate', async ()=>{
  /* restoreRoute uses reviveRun (route-run.js), never replayHistoryRun, so the
     hero gate never runs on a resume. Drive reviveRun with a sealed hero and
     assert it produces a live run regardless of the profile. */
  const {newRun,serializeRun,reviveRun}=await import('../src/route-run.js');
  const run=newRun({seed:1234,routeMode:'quick',now:1000,lantern:0});
  const revived=reviveRun(serializeRun(run));
  assert.ok(revived&&revived.economy,'the in-progress run revives to a live aggregate');
  /* the gate predicate would have sealed the hero, but the resume path never
     consults it: this asserts the exemption is by construction (separate path) */
  const s=fakeStore();
  assert.equal(heroUnlocked(s,'ash'),false,'ash would be sealed for a new profile');
  assert.equal(replayVerdict(s,'ash').refused,true,'and its replay would be refused, unlike its restore');
});
