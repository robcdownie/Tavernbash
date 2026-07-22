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

test('portrait setup rooms use lintel chamber and threshold zones',()=>{
  assert.match(html,/\.card\.setupcard\{[^}]+justify-content:flex-start/);
  assert.match(html,/\.card\.setupcard\.evroom::after\{background:linear-gradient/);
  assert.match(html,/\.card\.setupcard>\.btn\.gold\{flex:0 0 auto;margin-top:auto !important;/);
  assert.match(html,/\.card\.setupcard \.herodetail\{[^}]+background:rgba\(10,9,15,\.62\)/);
  assert.match(html,/\.card\.setupcard \.routepickgrid\{flex:1 1 auto;align-content:end;/);
});
