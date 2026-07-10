import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join,extname} from 'node:path';
import {ITEMS,MONSTERS,TRINKETS,ANOMALIES,PERSONAS} from '../src/data.js';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const SCAN_EXT=['.js','.html','.md','.json','.css','.webmanifest','.toml'];
const SKIP=['node_modules','dist','.git','.netlify'];
function walk(dir,out){
  for(const name of readdirSync(dir)){
    if(SKIP.includes(name))continue;
    const p=join(dir,name);
    if(statSync(p).isDirectory()){walk(p,out);}
    else if(SCAN_EXT.includes(extname(name)))out.push(p);
  }
  return out;
}

test('dash scan: zero em dashes and zero en dashes in every source file',()=>{
  const bad=[];
  for(const f of walk(root,[])){
    const txt=readFileSync(f,'utf8');
    const em=txt.indexOf(String.fromCharCode(0x2014)), en=txt.indexOf(String.fromCharCode(0x2013));
    if(em>=0||en>=0)bad.push(f+(em>=0?' (em dash)':' (en dash)'));
  }
  assert.deepEqual(bad,[],'files containing forbidden dashes');
});

test('symbol coverage: every glyph the data references exists in the sprite',()=>{
  const html=readFileSync(join(root,'index.html'),'utf8');
  const defined=new Set();
  for(const m of html.matchAll(/<(?:symbol|linearGradient|radialGradient)\s+id="([^"]+)"/g)){defined.add(m[1]);}
  const needed=new Set();
  for(const id of Object.keys(ITEMS)){
    needed.add('g-'+id);
    const d=ITEMS[id];
    if(d.rattle&&d.rattle.spawn)needed.add(d.rattle.spawn.g);
  }
  for(const m of Object.values(MONSTERS)){
    needed.add(m.glyph);
    for(const b of m.board){
      needed.add(b.g);
      if(b.rattle&&b.rattle.spawn)needed.add(b.rattle.spawn.g);
    }
  }
  for(const t of TRINKETS)needed.add(t.g);
  for(const a of ANOMALIES)needed.add(a.g);
  for(const p of PERSONAS)needed.add(p.p);
  needed.add('p-0');
  for(const id of ['g-coin','g-heart','g-gem','g-crown','g-door','g-crack','g-medallion','g-phoenix','g-lantern','g-flourish',
                   'e-blade','e-skull','e-flame','e-shield','e-heart','e-bolt','e-clock']){needed.add(id);}
  const missing=[...needed].filter(id=>!defined.has(id));
  assert.deepEqual(missing,[],'sprite symbols missing');
});

test('index.html markup is balanced for the tags that matter',()=>{
  const html=readFileSync(join(root,'index.html'),'utf8');
  for(const tag of ['div','svg','symbol','details','button','span']){
    const open=(html.match(new RegExp('<'+tag+'[\\s>]','g'))||[]).length;
    const close=(html.match(new RegExp('</'+tag+'>','g'))||[]).length;
    assert.equal(open,close,'<'+tag+'> open/close mismatch');
  }
});
