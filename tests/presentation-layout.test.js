"use strict";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const html=readFileSync(root+'/index.html','utf8');
const route=readFileSync(root+'/src/route-ui.js','utf8');
const ui=readFileSync(root+'/src/ui.js','utf8');

test('route map channels stay subordinate and portrait labels remain legible',()=>{
  assert.match(html,/edge\.under\{stroke:[^}]+stroke-width:5\.5/);
  assert.match(html,/\.rmnode \.rmn\{font-size:9px;max-width:54px;max-height:22px;/);
});

test('run-end actions precede a collapsed optional debrief',()=>{
  assert.match(route,/const debrief='<details class="rdebrief"><summary>Optional Playtest Debrief<\/summary>/);
  assert.match(route,/unlockStrip\+endBtns\+debrief\+cloudPrompt/);
  assert.match(html,/\.rdebrief summary\{/);
});

test('opening toast waits for the Omen handoff and portrait crest protects the name',()=>{
  assert.match(ui,/G\.openingToast=h\.n\+' opens the stall'/);
  assert.match(ui,/setTimeout\(function\(\)\{toast\(msg\);\},RM\?0:180\)/);
  assert.match(html,/#ribbon \.crestres \.chip\{padding:6px 7px;/);
});

test('the duel board dresses every slot as a carved socket',()=>{
  /* the ten cells pad() emits are furniture, not absence: no slot may go back
     to fading out, each waiting socket carries its brass inlay, and a seated
     ware keeps its numbers on the plinth instead of on pills over its art */
  assert.match(html,/\.combat \.cell\.empty,\.combat \.cell\.lock\{opacity:1;\}/);
  assert.match(html,/\.combat \.cell\.empty::before,\.combat \.cell\.lock::before\{content:""/);
  assert.match(html,/\.combat \.cell \.stat\{min-width:0;height:auto;padding:0;border:0;border-radius:0;background:none;/);
  assert.match(html,/\.combat \.cell\.f\{\s*background:\s*linear-gradient\(to top,/);
  assert.match(html,/#main\.fight \.board\.combat \.cell\{--plinth:17px;height:52px;\}/);
});

test('health reads as a capped gauge and the dealer owns his nameplate',()=>{
  /* the fill stays one scaleX element (so every highlight is proportional),
     the reading is struck into a cartouche, both ends are capped and jewelled,
     the garland cannot haze the reading it hangs over, and the plate carries
     the chosen hero while the side object keeps nm:'You' for every log line */
  assert.match(html,/\.hpwrap::before,\.hpwrap::after\{content:"";position:absolute;/);
  assert.match(html,/#fg-a \.hpwrap\{--capgem:#1f7d72;/);
  assert.match(html,/\.ht\{inset:auto;left:50%;top:50%;transform:translate\(-50%,-50%\);/);
  assert.match(html,/#main\.fight::after\{z-index:0;\}/);
  assert.match(html,/#main\.fight \.fh \.who\{-webkit-text-fill-color:transparent;/);
  assert.match(ui,/const plate=H&&H\.n\?H\.n\.replace\(\/\^The \/,''\):s\.nm;/);
  assert.match(ui,/const me=\{nm:'You'/);
  assert.match(ui,/e\.classList\.toggle\('z',!n\);/);
});

test('a ware is a card: painted illustration, struck plate, parchment rules',()=>{
  assert.match(html,/\.ware \.ph \.gi image\{object-fit:cover;object-position:50% 44%;\}/);
  assert.match(html,/\.ware \.ph\{width:auto;height:var\(--artH,102px\);/);
  assert.match(html,/\.ware \.wn\{position:relative;z-index:3;margin:0;/);
  assert.match(html,/\.ware \.ph \.gi\{width:100%;height:100%;display:block;border-radius:0;/);
  /* nothing may go back to clipping the illustration into a circle */
  assert.doesNotMatch(html,/\.ware \.ph \.gi\{border-radius:50%;\}/);
});

test('every shipped item has painted art, so the card never letterboxes',async()=>{
  const {ITEMS}=await import('../src/data.js');
  const {ART}=await import('../src/art-manifest.js');
  const missing=Object.keys(ITEMS).filter(id=>!ART['g-'+id]);
  assert.deepEqual(missing,[],'items without painted art fall back to an inline symbol '
    +'that the full-bleed card window cannot place: '+missing.join(', '));
});

test('the shared ware detail is a card and wears its rarity',async()=>{
  const cards=readFileSync(root+'/src/cards.js','utf8');
  /* the four callers and the screenshot harness read .st, .ico, .nm, .ds and
     .eff, so those hooks must survive; the rarity must ride the root */
  assert.match(cards,/class="st rar'\+rar\+'"/);
  assert.match(cards,/<span class="ico">/);
  assert.doesNotMatch(cards,/class="ico" style="width:64px/);
  assert.match(cards,/class="stx"/);
  assert.match(cards,/class="stc"/);
  assert.match(html,/\.art-frames \.st\.rar2\{border-image-source:var\(--frame-gold\);\}/);
  assert.match(html,/\.st \.ico\{width:auto;height:var\(--bigart,196px\);/);
});

test('the scout reads as a bestiary leaf and node names sit on plates',()=>{
  assert.match(html,/\.art-frames \.rmprev\{border:10px solid transparent;/);
  assert.match(html,/\.rmphead \.rmpg::after\{content:"";position:absolute;/);
  assert.match(html,/\.rmpi b\{display:inline-block;min-width:50px;/);
  assert.match(html,/\.rmpi\.affix\{color:#5c2f7e;/);
  assert.match(html,/\.rmnode \.rmn\{padding:1\.5px 5px;border-radius:3px;/);
  /* the leaf is wider than the old flat box, and the portrait label rule the
     0.139.0 clarity pass pinned must survive that */
  assert.match(html,/\.rmwrap\{display:grid;grid-template-columns:minmax\(0,1fr\) 224px;/);
});

test('the scout budgets fixed facts as one strip before its exact ware list',()=>{
  assert.match(route,/const facts='<div class="rmpfacts"><div class="rmpi"><b>Health<\/b> '\+hp/);
  assert.match(route,/\+'<div class="rmpi"><b>Bounty<\/b> '\+esc\(routeBountyText\(n\)\)\+'<\/div><\/div>';/);
  assert.match(route,/return facts\+vn\+storm\s*\+\(n\.gilded\?/);
  assert.match(html,/\.rmpfacts\{display:grid;grid-template-columns:1fr 1fr;border-bottom:/);
  assert.match(html,/\.rmpfacts \.rmpi b\{display:block;min-width:0;margin-bottom:1px;\}/);
});

test('the scout marks only the unread portion of an overflowing ware ledger',()=>{
  assert.match(route,/\+\(combat\?'<div class="rmpmore" aria-hidden="true"><\/div>':''\)/);
  assert.match(route,/const scoutBody=p&&p\.querySelector\('\.rmpmore'\)&&p\.querySelector\('\.rmpbody'\);/);
  assert.match(route,/const more=body\.scrollHeight-body\.scrollTop-body\.clientHeight>2;/);
  assert.match(route,/body\.classList\.toggle\('has-more',more\);/);
  assert.match(route,/body\.addEventListener\('scroll',sync,\{passive:true\}\);/);
  assert.match(html,/\.rmpbody\.has-more\{box-shadow:inset 0 -18px 16px -18px/);
  assert.match(html,/\.rmpbody\.has-more \+ \.rmpmore\{display:block;\}/);
});

test('portrait setup rooms use lintel chamber and threshold zones',()=>{
  assert.match(html,/\.card\.setupcard\{[^}]+justify-content:flex-start/);
  assert.match(html,/\.card\.setupcard\.evroom::after\{background:linear-gradient/);
  assert.match(html,/\.card\.setupcard>\.btn\.gold\{flex:0 0 auto;margin-top:auto !important;/);
  /* 0.151.0 replaces the translucent scrim this line originally pinned with the
     shared carved plate. The intent is unchanged and stronger: the dealer's
     detail must still carry an opaque backing so its copy stays legible over the
     painted parlour, and it is now more opaque than the .62 scrim was. */
  assert.match(html,/\.card\.setupcard \.herodetail\{background:var\(--plate\);box-shadow:var\(--plate-edge\)/);
  assert.match(html,/\.card\.setupcard \.routepickgrid\{flex:1 1 auto;align-content:end;/);
});

test('the duel chrome: a burning clock, a brass switch, an engraved ledger',()=>{
  /* the clock's fill is fed one variable by paintFight; the countdown text and
     its timing are unchanged, and the pre-manor medallion stands down rather
     than sitting as a faint washer at the centre of the screen */
  assert.match(ui,/sc\.style\.setProperty\('--sp',String\(F\.stormOn\?1:/);
  assert.match(ui,/st\.textContent='Storm approaching '\+Math\.max\(0,Math\.ceil\(\(F\.stormAt-F\.t\)\/1000\)\)\+'s'/);
  assert.match(html,/\.stormchip::before\{content:"";position:absolute;left:0;/);
  assert.match(html,/width:calc\(var\(--sp,0\) \* 100%\);/);
  assert.match(html,/#main\.fight \.vsrow \.vm\{display:none;\}/);
  assert.match(html,/#main\.fight #fg-a \.fh\{flex-direction:row-reverse;\}/);
  assert.match(html,/#main\.fight \.log \.li:first-child\{color:#e8d3ab;\}/);
});

test('display type is struck metal from one shared recipe',()=>{
  /* one foil recipe, two variants, applied to every display heading; small type
     takes the shallower cut, and a child carrying its own colour opts back out
     of the clipped fill instead of inheriting transparent and vanishing */
  assert.match(html,/\.foil,h1,#intro \.ititle,\.card \.big,\.label,\.hdname,\.rmpname,\.rmdn,\.campbn,/);
  assert.match(html,/\.foil\.copper,\.card \.big\.bad,\.campbn\{/);
  assert.match(html,/\.label,#ribbon \.crestwho \.cnm,\.rmpname,\.rmdn\{\s*background:linear-gradient\(178deg,#fff8e4/);
  assert.match(html,/\.label \.side\{-webkit-text-fill-color:var\(--dim\);color:var\(--dim\);\}/);
  /* the stone plaques keep painted furniture, so their text stays a real colour */
  assert.match(html,/\.stonebtn\{color:#f8dfa6;/);
});

test('no state reads as unfinished UI: no dashed placeholders, no ghosting',()=>{
  /* a dashed rectangle is the universal mark of a placeholder; the three that
     survived on finished screens are gone, and short-of-coin and disabled now
     state their condition in the manor's materials instead of fading out */
  assert.match(html,/\.cell\.empty::before\{border:0;border-radius:2px;/);
  assert.doesNotMatch(html,/\.art-frames \.ware\.gone::before\{border-image:none;border:1px dashed/);
  assert.match(html,/\.ware\.cant\{opacity:1;cursor:not-allowed;\}/);
  assert.match(html,/\.ware\.cant \.cost b\{color:#7c1d10;\}/);
  assert.match(html,/\.btn:disabled\{opacity:\.85;cursor:not-allowed;/);
});

test('one light grade covers the house: candle low left, moon high right, one grain',()=>{
  /* STYLE.md sets one light direction for the whole game; the grade must carry
     both sides of it and one film of grain over the composed screen */
  assert.match(html,/body::after\{content:"";position:fixed;inset:0;z-index:2000;/);
  assert.match(html,/radial-gradient\(72% 52% at 16% 88%, rgba\(246,196,110,\.085\)/);
  assert.match(html,/radial-gradient\(64% 46% at 88% 8%, rgba\(159,180,216,\.07\)/);
  assert.match(html,/body::before\{content:"";position:fixed;inset:0;z-index:2001;pointer-events:none;/);
  assert.match(html,/feTurbulence[^"]*baseFrequency='0\.85'/);
  /* the grade can never intercept a tap */
  assert.match(html,/body::after\{[^}]*pointer-events:none/);
});

test('copy over a painting sits on a carved plate, never a translucent pane',()=>{
  /* one named recipe, used everywhere copy had to stay legible over painted art;
     the market panel also drops the backdrop blur, which was the single most
     browser-like effect left in the game */
  assert.match(html,/--plate:linear-gradient\(180deg,rgba\(255,238,200,\.055\)/);
  assert.match(html,/--plate-edge:inset 0 1px 0 rgba\(250,206,124,\.3\)/);
  /* plain substring, not a built regex: the parentheses in var(--plate) become a
     capture group the moment this is compiled, and the assertion silently stops
     checking what it names */
  for(const sel of ['.card.evroom .pick','.card.setupcard .herodetail',
      '.card.setupcard.reveal .setupcopy','.setupcopy']){
    assert.ok(html.includes(sel+'{background:var(--plate)'),sel+' uses the plate');
  }
  assert.match(html,/\.sec\.secmarket\{backdrop-filter:none;-webkit-backdrop-filter:none;/);
});

test('painted plates do the work the stylesheet was imitating',()=>{
  /* nine generated pieces replace CSS-drawn chrome. The CSS underneath survives
     as the no-art fallback, so a missing file degrades to drawn chrome. */
  for(const [sel,file] of [
    ['.btn','btn_wood'],['.btn.gold','btn_brass'],['.hpwrap','gauge_wide'],
    ['.ware .wn','nameplate'],['.st .nm','nameplate'],['.rmphead','nameplate'],
    ['.sec.secmarket','panel_plain'],['.label::after','rule_thin']]){
    assert.ok(html.includes("/art/ui/"+file+".png"),sel+' uses the painted '+file);
  }
  assert.ok(html.includes("url('/art/ui/socket_sq.png') 96 fill"),'sockets are a painted slot frame');
  assert.ok(html.includes("url('/art/ui/parchment.png')"),'the card body is a real parchment leaf');
  assert.ok(html.includes("url('/art/ui/cameo_oval.png')"),'fight portraits wear the painted cameo');
  /* border-image-width does not move the content box: a housing whose caps are
     drawn wider than its border-width gets painted over by its own children */
  assert.match(html,/\.hpwrap\{border-style:solid;border-color:transparent;border-width:9px 38px 10px 38px;/);
  /* the card takes its natural height now that its frame is painted */
  assert.match(html,/\.ware\{overflow:visible;\}/);
});

test('fight recaps resolve inside skippable reduced-motion-safe result rooms',()=>{
  assert.match(route,/class="card recapcard resultroom /);
  assert.match(route,/class="resultcrest"/);
  assert.match(route,/class="resultcopy"/);
  assert.match(route,/o\.classList\.add\('resultov',won\?'result-win':'result-loss'\)/);
  assert.match(route,/if\(!e\.target\.closest\('button,summary,details'\)\)o\.classList\.add\('settled'\)/);
  assert.match(html,/\.ov\.result-win\{--result-room:image-set\(url\('\/art\/bg\/bg_result_victory\.webp'\)[^}]+bg_result_victory\.png/);
  assert.match(html,/\.ov\.result-loss\{--result-room:image-set\(url\('\/art\/bg\/bg_result_defeat\.webp'\)[^}]+bg_result_defeat\.png/);
  assert.match(html,/\.resultroom \.resultcopy\{[^}]+background:var\(--plate\)/);
  assert.match(html,/\.resultroom \.resultcopy #recapGo\{width:100%;min-height:44px/);
  assert.match(html,/\.ov\.resultov:not\(\.closing\)\{animation:resultroomin/);
  assert.match(html,/@media \(prefers-reduced-motion: reduce\)\{\s*\.ov\.resultov:not\(\.closing\),[^}]+animation:none !important;/);
});

test('portrait run end gives New Run a full-width 44-point primary action',()=>{
  assert.match(route,/const endBtns='<div class="rendbtns">'\s*\+'<button class="btn gold" id="reGo"><span>New Run<\/span><\/button>'/);
  assert.match(html,/\.rendbtns #reGo\{order:4;\}/);
  assert.match(html,/\.rendbtns \.btn>span\{position:relative;z-index:1;\}/);
  assert.match(html,/@media \(orientation:portrait\)\{\s*\.rendbtns\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\);gap:7px;\}/);
  assert.match(html,/\.rendbtns \.btn\{min-width:0;min-height:44px;/);
  assert.match(html,/\.rendbtns #reGo\{order:0;grid-column:1\/-1;grid-row:1;font-size:11px;\}/);
});

test('market section headings use solid struck ink instead of flex clipped foil',()=>{
  assert.match(html,/\.sec\.secmarket \.label,#main\.draft \.dock \.label\{\s*background:linear-gradient\(180deg,#2a1c0e,#120b05 78%\);/);
  assert.match(html,/-webkit-background-clip:border-box;background-clip:border-box;/);
  assert.match(html,/-webkit-text-fill-color:#f6d693;color:#f6d693;filter:none;/);
  assert.match(html,/\.label \.side\{-webkit-text-fill-color:var\(--dim\);color:var\(--dim\);\}/);
});

test('landscape intro fills the viewport without letterbox pillars',()=>{
  assert.match(html,/@media \(orientation:landscape\)\{\s*#intro\{justify-content:flex-end;background-image:url\('\/art\/bg\/bg_intro_wide\.png'\);background-position:center 56%;background-size:cover;\}/);
  assert.doesNotMatch(html,/#intro\{justify-content:flex-end;background-image:url\('\/art\/bg\/bg_intro_wide\.png'\);[^}]*background-size:contain;/);
});

test('portrait dealer bark occupies stage heading space instead of market actions',()=>{
  assert.match(html,/@media \(orientation:portrait\)\{\s*\.bark\{left:calc\(env\(safe-area-inset-left\) \+ 10px\);right:auto;\s*top:calc\(env\(safe-area-inset-top\) \+ clamp\(104px,20vh,180px\)\);bottom:auto;/);
  assert.match(html,/\.bark\{animation:none;transition:none;\}\s*\.bark\.out\{opacity:0;transform:none;\}/);
  assert.match(ui,/setTimeout\(function\(\)\{d\.classList\.add\('out'\);\},2400\);\s*setTimeout\(function\(\)\{d\.remove\(\);\},2900\);/);
});

test('landscape dealer bark occupies the quiet hero rail instead of market actions',()=>{
  assert.match(html,/@media \(orientation:landscape\) and \(min-width:640px\)\{\s*\.bark\{left:calc\(env\(safe-area-inset-left\) \+ 7px\);right:auto;top:auto;\s*bottom:calc\(env\(safe-area-inset-bottom\) \+ 8px\);width:112px;max-width:112px;/);
  assert.match(html,/\.bark \.bkp\{display:none;\}\s*\.bark b\{display:block;margin-bottom:3px;font-size:8px;/);
  assert.match(html,/\.bark::before\{content:"";position:absolute;top:-6px;left:27px;width:11px;height:11px;/);
  assert.match(ui,/setTimeout\(function\(\)\{d\.classList\.add\('out'\);\},2400\);\s*setTimeout\(function\(\)\{d\.remove\(\);\},2900\);/);
});
