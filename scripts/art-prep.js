/* Files one image into the art tree: optional crop, resize, flatten,
   then regenerates the manifest. Replaces the one-off scratchpad crop
   scripts that got rebuilt every session (medallion cuts, icon cuts,
   intro cuts, door cuts).
   Run: node scripts/art-prep.js <src> <dest-under-public> [flags]
     dest examples: art/ui/door_monster.png   art/bg/bg_intro.png
                    icons/icon-192.png
   Flags: --w N        resize width (height follows aspect)
          --h N        resize height (with --w, exact box)
          --flatten X  remove alpha onto hex color X, e.g. #0d0805
          --crop l,t,w,h  extract a region first (source pixels)
   Prints the written file's final dimensions and alpha so the QA
   verdict is a read, not a guess. */
import sharp from 'sharp';
import {existsSync, mkdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {writeManifest} from './make-art-manifest.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const flags = {};
const pos = [];
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) { flags[args[i].slice(2)] = args[i + 1]; i++; }
  else pos.push(args[i]);
}
const [src, dest] = pos;
if (!src || !dest || !existsSync(src)) {
  console.error('usage: node scripts/art-prep.js <src> <dest-under-public> [--w N] [--h N] [--flatten #hex] [--crop l,t,w,h]');
  process.exit(2);
}
const out = join(root, 'public', dest);
mkdirSync(dirname(out), {recursive: true});

let img = sharp(src);
if (flags.crop) {
  const [left, top, width, height] = flags.crop.split(',').map(Number);
  img = img.extract({left, top, width, height});
}
if (flags.w || flags.h) img = img.resize(flags.w ? Number(flags.w) : null, flags.h ? Number(flags.h) : null);
if (flags.flatten) img = img.flatten({background: flags.flatten});
await img.png().toFile(out);

const meta = await sharp(out).metadata();
console.log('wrote public/' + dest.replace(/\\/g, '/') + '  ' + meta.width + 'x' + meta.height + '  alpha: ' + (meta.hasAlpha ? 'yes' : 'no'));
if (dest.replace(/\\/g, '/').startsWith('art/')) {
  writeManifest(root);
  console.log('art manifest regenerated');
}
