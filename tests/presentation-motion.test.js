"use strict";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {ovClose,setRM} from '../src/ui-core.js';

const root=fileURLToPath(new URL('..',import.meta.url));

function overlayDouble(){
  let onAnimationEnd=null;
  const state={classes:[],removed:0};
  const parent={removeChild:function(d){state.removed++;d.parentNode=null;}};
  const node={parentNode:parent,dataset:{},classList:{add:function(name){state.classes.push(name);}},
    addEventListener:function(type,fn){if(type==='animationend')onAnimationEnd=fn;}};
  return {node:node,state:state,end:function(){if(onAnimationEnd)onAnimationEnd();}};
}

test('overlay close plays one short exit while normal motion is active',()=>{
  setRM(false);
  const x=overlayDouble();
  ovClose(x.node);
  assert.equal(x.node.dataset.closing,'true');
  assert.deepEqual(x.state.classes,['closing']);
  assert.equal(x.state.removed,0);
  ovClose(x.node);
  x.end();
  assert.equal(x.state.removed,1);
});

test('overlay close is instant under reduced motion',()=>{
  setRM(true);
  const x=overlayDouble();
  ovClose(x.node);
  assert.equal(x.state.removed,1);
  assert.deepEqual(x.state.classes,[]);
  setRM(false);
});

test('route market dawn is short, skippable, and reduced-motion guarded',()=>{
  const ui=readFileSync(root+'/src/ui.js','utf8');
  const html=readFileSync(root+'/index.html','utf8');
  assert.match(ui,/function dawnHandoff\(paint\)/);
  assert.match(ui,/if\(RM\|\|typeof document===/);
  assert.match(ui,/veil\.onpointerdown=skip/);
  assert.match(ui,/checkpointActiveRun\(\);dawnHandoff\(renderAll\)/);
  assert.match(html,/@keyframes dawn\{/);
  assert.match(html,/animation:dawn \.68s/);
  assert.match(html,/@media \(prefers-reduced-motion: reduce\)\{\.dusk\{display:none;/);
});
