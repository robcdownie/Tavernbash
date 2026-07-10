/* Generates the PWA icon set as PNGs with no image dependencies.
   A brass medallion on the night-market base color, echoing the in-game
   g-medallion mark. Placeholder tier until Phase 2 painted art lands.
   Run: node scripts/make-icons.js */
import {writeFileSync, mkdirSync} from 'node:fs';
import {deflateSync} from 'node:zlib';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size, pixelFn) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelFn(x, y, size);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}
function mix(a, b, t) { return a.map((v, i) => Math.round(v + (b[i] - v) * t)); }
const BASE = [28, 20, 16], INDIGO = [27, 19, 47], BRASS = [216, 162, 74], HI = [244, 207, 124], DARK = [58, 42, 22];
function medallion(x, y, size) {
  const cx = size / 2, cy = size / 2;
  const dx = (x - cx) / size, dy = (y - cy) / size;
  const d = Math.sqrt(dx * dx + dy * dy);
  /* lantern key light from lower left */
  const light = Math.max(0, 0.5 - (dx * 0.7 + (-dy) * 0.7) * 0.9);
  let c = mix(BASE, INDIGO, Math.min(1, y / size * 1.1));
  c = mix(c, BRASS, light * 0.12);
  if (d < 0.36) {
    const ring = Math.abs(d - 0.30);
    if (d > 0.27 && d < 0.33) c = mix(BRASS, HI, Math.max(0, 1 - ring * 30) * (0.4 + light));
    else if (d < 0.27) {
      c = mix(DARK, BRASS, 0.25 + light * 0.5);
      /* eight-point star */
      const ang = Math.atan2(dy, dx);
      const star = Math.abs(Math.cos(ang * 4)) * 0.16 + 0.05;
      if (d < star) c = mix(BRASS, HI, 0.3 + light * 0.7);
    } else c = mix(c, BRASS, Math.max(0, 1 - ring * 18) * 0.5);
  }
  return [c[0], c[1], c[2], 255];
}
mkdirSync(join(root, 'public', 'icons'), {recursive: true});
for (const s of [512, 192, 180]) {
  writeFileSync(join(root, 'public', 'icons', `icon-${s}.png`), png(s, medallion));
  console.log(`icon-${s}.png written`);
}
