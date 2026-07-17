"use strict";
/* The asset diet. Moves every full-resolution painted original into
   art-source/ (gitignored, never deleted, the single source of truth) and
   re-encodes the shipped copy in public/art at the resolution its slot
   actually renders on a 3x iPhone:

     - Files the manifest serves become WebP at a per-category cap.
     - Files index.html references by literal path (the intro paintings,
       the stone button, the two door portraits) stay PNG at their exact
       names, palette-quantized in place, because index.html cannot be
       edited without a markup pass and the service worker keys on URL.
     - Frames keep their exact pixel dimensions: index.html slices them
       with border-image-slice:135, a source-pixel value, so any resize
       would shift the 9-slice. WebP re-encode only.

   Idempotent: outputs always derive from the art-source original, so
   rerunning never compounds loss. A fresh PNG dropped by a future ingest
   wins over an old WebP in the manifest (see make-art-manifest.js); run
   this script again to bring the new drop onto the diet.

   Run: node scripts/art-diet.js [--dry] */
import {readdirSync, existsSync, mkdirSync, copyFileSync, unlinkSync, statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join, resolve} from 'node:path';
import {writeManifest} from './make-art-manifest.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(root, 'art-source');

/* Per-category output spec. cap is the longest-edge bound in pixels,
   derived from the largest CSS render of the category times 3 for the
   3x device, with headroom. null cap means dimensions stay untouched.
   Measured maxima (index.html, 2026-07-16): items 60 CSS px (fight cell
   s3, line 1233), monsters 58 plus a latent 82 knock card (633),
   portraits 96 picker and 106 rail box (286, 1254), ui 124 skull (900),
   board tiles at 320 (49), frames slice at source pixels so dimensions
   are pinned (141), full-screen bgs want 844 CSS px and every current
   source is already below that, so bgs keep their dimensions. */
const CATS = {
  items:     {cap: 256, quality: 82},
  monsters:  {cap: 256, quality: 82},
  portraits: {cap: 320, quality: 82},
  frames:    {cap: null, quality: 90},
  board:     {cap: null, quality: 78},
  bg:        {cap: null, quality: 80},
  ui:        {cap: 384, quality: 82}
};

/* Referenced by literal path from index.html CSS; must keep name and
   format. Re-encoded as palette PNG from the original instead. */
const KEEP_PNG = new Set([
  'ui/btn_stone.png',
  'ui/door_monster.png',
  'ui/door_safe.png',
  'bg/bg_intro.png',
  'bg/bg_intro_wide.png'
]);

function kb(n) { return (n / 1024).toFixed(0) + ' KB'; }

async function main() {
  const dry = process.argv.includes('--dry');
  const sharp = (await import('sharp')).default;
  let before = 0, after = 0;
  const rows = [];

  for (const [cat, spec] of Object.entries(CATS)) {
    const dir = join(root, 'public', 'art', cat);
    if (!existsSync(dir)) continue;
    const srcDir = join(SRC, cat);
    if (!dry) mkdirSync(srcDir, {recursive: true});

    for (const f of readdirSync(dir).sort()) {
      if (!f.endsWith('.png')) continue;
      const shipped = join(dir, f);
      const original = join(srcDir, f);
      const sizeIn = statSync(shipped).size;
      before += sizeIn;

      /* archive the original once; later runs re-derive from it */
      if (!dry && !existsSync(original)) copyFileSync(shipped, original);
      const from = existsSync(original) ? original : shipped;

      const key = cat + '/' + f;
      let img = sharp(from);
      const meta = await img.metadata();
      /* literal-path files keep their exact dimensions as well as their
         name: the door portraits and intro paintings render cover or
         stretched over layout-sized boxes and are already at or below
         the resolution those boxes want on a 3x device */
      const cap = KEEP_PNG.has(key) ? null : spec.cap;
      if (cap && Math.max(meta.width, meta.height) > cap) {
        img = img.resize(cap, cap, {fit: 'inside', withoutEnlargement: true});
      }

      let out, sizeOut;
      if (KEEP_PNG.has(key)) {
        out = shipped;
        if (!dry) {
          const buf = await img.png({palette: true, quality: 80, compressionLevel: 9}).toBuffer();
          const {writeFileSync} = await import('node:fs');
          writeFileSync(out, buf);
          sizeOut = buf.length;
        } else { sizeOut = sizeIn; }
      } else {
        out = shipped.replace(/\.png$/, '.webp');
        if (!dry) {
          await img.webp({quality: spec.quality, alphaQuality: 90, effort: 6}).toFile(out);
          sizeOut = statSync(out).size;
          unlinkSync(shipped);
        } else { sizeOut = sizeIn; }
      }
      after += sizeOut;
      rows.push('  ' + key.padEnd(34) + kb(sizeIn).padStart(9) + ' -> ' + kb(sizeOut).padStart(9));
    }
  }

  for (const r of rows) console.log(r);
  console.log('\ntotal ' + kb(before) + ' -> ' + kb(after) + (dry ? '  (dry run, nothing written)' : ''));
  if (!dry) {
    const r = writeManifest(root);
    console.log('manifest: ' + r.count + ' painted assets' + (r.changed ? ' (rewritten)' : ' (unchanged)'));
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
