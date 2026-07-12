import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {scanArt, manifestSource} from '../scripts/make-art-manifest.js';
import {ART} from '../src/art-manifest.js';
import {ic, icMarkup} from '../src/art.js';
import {ITEMS, MONSTERS, PERSONAS, HEROES} from '../src/data.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

test('art manifest is in sync with the files on disk', () => {
  const onDisk = manifestSource(scanArt(root));
  const checkedIn = readFileSync(join(root, 'src', 'art-manifest.js'), 'utf8');
  assert.equal(checkedIn, onDisk, 'src/art-manifest.js is stale; run node scripts/make-art-manifest.js');
});

test('every painted art file maps to a glyph id the game actually uses', () => {
  const known = new Set();
  for (const id of Object.keys(ITEMS)) known.add('g-' + id);
  for (const m of Object.values(MONSTERS)) known.add(m.glyph);
  for (const p of PERSONAS) known.add(p.p);
  for (const h of HEROES) known.add(h.g);
  known.add('p-0');
  for (const id of ['frame-bronze','frame-silver','frame-gold','frame-diamond','board-wood','bg-market','bg-intro',
                    'music-market','music-battle','music-title','music-boss',
                    'music-dawnsting','music-fanfarewin','music-forgesting','music-lament','music-windstorm',
                    'g-coin','g-heart','g-gem','g-crown','g-door','g-lantern','g-phoenix','g-medallion','g-btn_stone','g-door_monster','g-door_safe']) known.add(id);
  const orphans = Object.keys(scanArt(root)).filter(id => !known.has(id));
  assert.deepEqual(orphans, [], 'art files whose names match no item id, monster glyph, or portrait');
});

test('ic falls back to the SVG symbol when no painted art exists for the id', () => {
  const html = icMarkup('g-dagger', 'gi', '', undefined);
  assert.ok(html.includes('<use href="#g-dagger"/>'), 'expected SVG symbol fallback');
  assert.ok(html.includes('class="gi"'), 'expected the class to carry through');
  assert.ok(!html.includes('<image'), 'no image tag without painted art');
});

test('ic renders the painted PNG inside the svg wrapper when art exists', () => {
  const html = icMarkup('g-dagger', 'gi', 'width:26px', 'art/items/dagger.png');
  assert.ok(html.startsWith('<svg class="gi" style="width:26px"'), 'wrapper svg keeps class and style');
  assert.ok(html.includes('<image href="art/items/dagger.png"'), 'expected the painted image');
  assert.ok(!html.includes('<use'), 'no symbol reference when painted art exists');
});

test('ic consults the generated manifest', () => {
  for (const [id, src] of Object.entries(ART)) {
    assert.ok(ic(id).includes('<image href="' + src + '"'), id + ' should render its painted art');
  }
  assert.ok(ic('g-lantern').includes('<use href="#g-lantern"/>') || 'g-lantern' in ART);
});
