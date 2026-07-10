"use strict";
/* Ingests raw image generations into public/art. Point it at a folder of
   downloads; each file is matched to its target by an id token in the
   filename (dagger, ifrit, p3, frame_gold, board_wood, bg_market...), then
   resized to spec, converted to PNG with transparent padding, and filed
   into the right subfolder. Files that cannot be matched, or whose name is
   ambiguous, are reported and left untouched. Never guesses.

   Usage:
     npm run ingest -- <folder>
     npm run ingest -- <folder> --strip-bg   (also flood-fills a solid or
                                              checkerboard background to
                                              transparent, sampling the edges)
     npm run ingest -- <folder> --thumb      (items only: crop the center 62
                                              percent of a framed card scene
                                              into a rounded thumbnail; the
                                              shipped 2026-07 item batch uses
                                              this treatment)

   Specs: items, monsters, portraits 512x512 contain; frames fit inside
   1024; board_wood 1024x1024 cover; bg_market 1080x1920 cover. After a
   successful run the art manifest is regenerated automatically. */
import {readdirSync, existsSync, mkdirSync, copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join, resolve, basename, extname} from 'node:path';
import {writeManifest} from './make-art-manifest.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const ITEM_IDS = ['dagger','sword','fangs','serpent','mace','crossbow','hammer','vial','venom','torch','bomb','magma','buckler','brassbuckler','barricade','tower','aegis','bandage','salve','chalice','sanctum','purse','ledger','whetstone','hourglass','adren','serpentcrown'];
const MONSTER_IDS = ['imp','rats','ghul','lamassu','kark','debt','ifrit','qareen','samovar','shahmaran'];
const PORTRAIT_IDS = ['p0','p1','p2','p3','p4','p5','p6','p7'];
const FRAME_METALS = ['bronze','silver','gold','diamond'];

/* Tokens a generator tends to leave in a saved filename when the target id
   itself does not appear verbatim. */
const ALIASES = {warhammer:'hammer', shortsword:'sword', fang:'fangs', karkadann:'kark', collector:'debt', adrenaline:'adren', venum:'venom', merchant:'market'};

const AUDIO_EXTS = ['.mp3', '.wav', '.m4a'];

export function targetFor(filename) {
  const ext = extname(filename).toLowerCase();
  const base = basename(filename, extname(filename)).toLowerCase();
  const tokens = new Set(base.split(/[^a-z0-9]+/).filter(Boolean).map(t => ALIASES[t] || t));
  if (AUDIO_EXTS.includes(ext)) {
    const tracks = ['market', 'battle'].filter(n => tokens.has(n));
    if (tracks.length === 1) return {dir: 'music', name: tracks[0] + ext, kind: 'audio'};
    return tracks.length ? {ambiguous: tracks.map(n => n + ext)} : null;
  }
  const hits = [];
  for (const id of ITEM_IDS) if (tokens.has(id)) hits.push({dir:'items', name:id + '.png', kind:'icon'});
  for (const id of MONSTER_IDS) if (tokens.has(id)) hits.push({dir:'monsters', name:id + '.png', kind:'icon'});
  for (const id of PORTRAIT_IDS) if (tokens.has(id)) hits.push({dir:'portraits', name:id + '.png', kind:'icon'});
  if (tokens.has('frame')) for (const m of FRAME_METALS) if (tokens.has(m)) hits.push({dir:'frames', name:'frame_' + m + '.png', kind:'frame'});
  if (tokens.has('board') || tokens.has('wood')) hits.push({dir:'board', name:'board_wood.png', kind:'board'});
  if (tokens.has('bg')) hits.push({dir:'bg', name:'bg_market.png', kind:'bg'});
  /* brassbuckler prompts contain the word buckler; brass plus buckler means
     the ornate one, buckler alone means the wooden one */
  if (tokens.has('brass') && tokens.has('buckler')) {
    return {dir:'items', name:'brassbuckler.png', kind:'icon'};
  }
  /* serpent plus crown means the unique crown, serpent alone the blade */
  if (tokens.has('serpent') && tokens.has('crown')) {
    return {dir:'items', name:'serpentcrown.png', kind:'icon'};
  }
  if (hits.length === 1) return hits[0];
  return hits.length ? {ambiguous: hits.map(h => h.name)} : null;
}

async function stripBackground(img) {
  /* Flood fill from the border, treating as background anything near one of
     the sampled edge colors. Sampling a strip along all four edges captures
     both tones of a baked-in transparency checkerboard as well as a plain
     solid fill. Conservative tolerance so dark item edges survive. */
  const {data, info} = await img.raw().ensureAlpha().toBuffer({resolveWithObject: true});
  const {width: w, height: h} = info;
  const px = (x, y) => (y * w + x) * 4;
  const samples = [];
  for (let x = 0; x < w; x += Math.max(1, w >> 5)) { samples.push(px(x,0), px(x,h-1)); }
  for (let y = 0; y < h; y += Math.max(1, h >> 5)) { samples.push(px(0,y), px(w-1,y)); }
  const bgs = [];
  for (const i of samples) {
    const c = [data[i], data[i+1], data[i+2]];
    if (!bgs.some(b => Math.abs(b[0]-c[0]) + Math.abs(b[1]-c[1]) + Math.abs(b[2]-c[2]) <= 36)) bgs.push(c);
    if (bgs.length >= 4) break;
  }
  const TOL = 46;
  const near = i => bgs.some(b => Math.abs(data[i]-b[0]) + Math.abs(data[i+1]-b[1]) + Math.abs(data[i+2]-b[2]) <= TOL);
  const seen = new Uint8Array(w * h);
  const queue = [];
  for (let x = 0; x < w; x++) { queue.push([x,0],[x,h-1]); }
  for (let y = 0; y < h; y++) { queue.push([0,y],[w-1,y]); }
  while (queue.length) {
    const [x, y] = queue.pop();
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const idx = y * w + x;
    if (seen[idx]) continue;
    seen[idx] = 1;
    const i = idx * 4;
    if (!near(i)) continue;
    data[i+3] = 0;
    queue.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
  }
  const sharp = (await import('sharp')).default;
  return sharp(data, {raw: {width: w, height: h, channels: 4}});
}

async function opaqueEdgeShare(img) {
  const {data, info} = await img.clone().raw().ensureAlpha().toBuffer({resolveWithObject: true});
  const {width: w, height: h} = info;
  let edge = 0, opaque = 0;
  const check = (x, y) => { edge++; if (data[(y*w+x)*4+3] > 200) opaque++; };
  for (let x = 0; x < w; x++) { check(x, 0); check(x, h-1); }
  for (let y = 1; y < h-1; y++) { check(0, y); check(w-1, y); }
  return opaque / edge;
}

const SPECS = {
  icon:  img => img.resize(512, 512, {fit:'contain', background:{r:0,g:0,b:0,alpha:0}}),
  frame: img => img.resize(1024, 1024, {fit:'inside', withoutEnlargement:true}),
  board: img => img.resize(1024, 1024, {fit:'cover'}),
  bg:    img => img.resize(1080, 1920, {fit:'cover', withoutEnlargement:true})
};

const THUMB_MASK = Buffer.from('<svg width="512" height="512"><rect width="512" height="512" rx="88" fill="#fff"/></svg>');
async function thumbCrop(img) {
  const m = await img.metadata();
  const size = Math.round(Math.min(m.width, m.height) * 0.62);
  return img.extract({left: Math.round((m.width - size) / 2), top: Math.round((m.height - size) / 2), width: size, height: size})
    .resize(512, 512)
    .composite([{input: THUMB_MASK, blend: 'dest-in'}]);
}

async function main() {
  const args = process.argv.slice(2).filter(a => a !== '--strip-bg' && a !== '--thumb');
  const strip = process.argv.includes('--strip-bg');
  const thumb = process.argv.includes('--thumb');
  const srcDir = args[0] && resolve(args[0]);
  if (!srcDir || !existsSync(srcDir)) {
    console.log('usage: npm run ingest -- <folder-of-raw-images> [--strip-bg]');
    process.exit(1);
  }
  const sharp = (await import('sharp')).default;
  const exts = ['.png','.jpg','.jpeg','.webp','.avif','.tiff'].concat(AUDIO_EXTS);
  const files = readdirSync(srcDir).filter(f => exts.includes(extname(f).toLowerCase()));
  if (!files.length) { console.log('no image files found in ' + srcDir); process.exit(1); }

  const done = [], skipped = [], solid = [];
  for (const f of files) {
    const t = targetFor(f);
    if (!t) { skipped.push(f + '  (no id token in the name)'); continue; }
    if (t.ambiguous) { skipped.push(f + '  (matches several: ' + t.ambiguous.join(', ') + ')'); continue; }
    if (t.kind === 'audio') {
      const outDir = join(root, 'public', 'music');
      mkdirSync(outDir, {recursive: true});
      copyFileSync(join(srcDir, f), join(outDir, t.name));
      done.push(f + '  ->  music/' + t.name);
      continue;
    }
    let img = sharp(join(srcDir, f));
    if (thumb && t.dir === 'items') {
      img = await thumbCrop(img);
    } else {
      if (strip && (t.kind === 'icon' || t.kind === 'frame')) img = await stripBackground(img);
      img = SPECS[t.kind](img);
    }
    img = img.png();
    const outDir = join(root, 'public', 'art', t.dir);
    mkdirSync(outDir, {recursive: true});
    await img.toFile(join(outDir, t.name));
    if ((t.kind === 'icon' || t.kind === 'frame') && !(thumb && t.dir === 'items')) {
      const share = await opaqueEdgeShare(sharp(join(outDir, t.name)));
      if (share > 0.5) solid.push(t.dir + '/' + t.name);
    }
    done.push(f + '  ->  art/' + t.dir + '/' + t.name);
  }

  for (const d of done) console.log('  ok    ' + d);
  for (const s of skipped) console.log('  skip  ' + s);
  if (solid.length) {
    console.log('\nStill have a solid background (rerun with --strip-bg, or remove it manually):');
    for (const s of solid) console.log('  ' + s);
  }
  const r = writeManifest(root);
  console.log('\n' + done.length + ' filed, ' + skipped.length + ' skipped. Manifest: ' + r.count + ' painted assets.');
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
