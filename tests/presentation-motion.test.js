"use strict";
import test from 'node:test';
import assert from 'node:assert/strict';
import {ovClose,setRM} from '../src/ui-core.js';

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
