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

test('portrait setup rooms use lintel chamber and threshold zones',()=>{
  assert.match(html,/\.card\.setupcard\{[^}]+justify-content:flex-start/);
  assert.match(html,/\.card\.setupcard\.evroom::after\{background:linear-gradient/);
  assert.match(html,/\.card\.setupcard>\.btn\.gold\{flex:0 0 auto;margin-top:auto !important;/);
  assert.match(html,/\.card\.setupcard \.herodetail\{[^}]+background:rgba\(10,9,15,\.62\)/);
  assert.match(html,/\.card\.setupcard \.routepickgrid\{flex:1 1 auto;align-content:end;/);
});
