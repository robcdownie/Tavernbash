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

test('portrait setup rooms use lintel chamber and threshold zones',()=>{
  assert.match(html,/\.card\.setupcard\{[^}]+justify-content:flex-start/);
  assert.match(html,/\.card\.setupcard\.evroom::after\{background:linear-gradient/);
  assert.match(html,/\.card\.setupcard>\.btn\.gold\{flex:0 0 auto;margin-top:auto !important;/);
  assert.match(html,/\.card\.setupcard \.herodetail\{[^}]+background:rgba\(10,9,15,\.62\)/);
  assert.match(html,/\.card\.setupcard \.routepickgrid\{flex:1 1 auto;align-content:end;/);
});
