"use strict";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const script=readFileSync(fileURLToPath(new URL('../scripts/shots.mjs',import.meta.url)),'utf8');

test('numbered fight stills are captured only while the live fight is paused',()=>{
  assert.match(script,/const shootPausedFight = async \(label\)/);
  assert.match(script,/game\.phase !== 'fight' \|\| document\.querySelector\('\.recapcard'\)/);
  assert.match(script,/game\.fpaused = true/);
  assert.match(script,/game\.fpaused = false/);
  assert.ok(script.indexOf("shootPausedFight('fight-frame-3')")<script.indexOf("filmstrip('full-fight'"));
});

test('offline capture installs a controlling worker before disconnecting',()=>{
  assert.match(script,/navigator\.serviceWorker\.register\('\/sw\.js'\)/);
  assert.match(script,/!!navigator\.serviceWorker\.controller/);
  assert.match(script,/context\.setOffline\(true\);\s*await page\.reload/);
  assert.match(script,/document\.body\.innerText\.trim\(\)\.length > 0/);
  assert.match(script,/state-offline-ready/);
});
