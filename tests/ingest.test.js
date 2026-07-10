import {test} from 'node:test';
import assert from 'node:assert/strict';
import {targetFor} from '../scripts/ingest-art.js';

test('ingest matcher: id tokens in messy filenames map to the right target', () => {
  const cases = [
    ['painted fantasy rusty dagger (3).jpg', 'items', 'dagger.png'],
    ['warhammer massive.jpg', 'items', 'hammer.png'],
    ['iron shortsword v2.png', 'items', 'sword.png'],
    ['twin fang daggers.webp', 'items', 'fangs.png'],
    ['adrenaline draught.png', 'items', 'adren.png'],
    ['ornate brass buckler.jpg', 'items', 'brassbuckler.png'],
    ['small wooden buckler.jpg', 'items', 'buckler.png'],
    ['serpent crown jeweled.png', 'items', 'serpentcrown.png'],
    ['serpentcrown_v1.png', 'items', 'serpentcrown.png'],
    ['serpent blade curved.png', 'items', 'serpent.png'],
    ['shahmaran queen of serpents.png', 'monsters', 'shahmaran.png'],
    ['tide wall shield.png', 'items', 'tidewall.png'],
    ['marid of the cistern.png', 'monsters', 'marid.png'],
    ['nasnas hopping.png', 'monsters', 'nasnas.png'],
    ['scalded samovar angry.png', 'monsters', 'samovar.png'],
    ['karkadann charging.png', 'monsters', 'kark.png'],
    ['the debt collector.png', 'monsters', 'debt.png'],
    ['ifrit of the kiln.png', 'monsters', 'ifrit.png'],
    ['p3 mirza half price.jpg', 'portraits', 'p3.png'],
    ['P0 player portrait.PNG', 'portraits', 'p0.png'],
    ['frame gold ornate.jpg', 'frames', 'frame_gold.png'],
    ['frame_diamond.png', 'frames', 'frame_diamond.png'],
    ['board wood planks.jpg', 'board', 'board_wood.png'],
    ['bg night market alley.jpg', 'bg', 'bg_market.png'],
    ['persian night market theme.mp3', 'music', 'market.mp3'],
    ['battle loop v2.wav', 'music', 'battle.wav']
  ];
  for (const [file, dir, name] of cases) {
    const t = targetFor(file);
    assert.ok(t && !t.ambiguous, file + ' should match unambiguously');
    assert.equal(t.dir + '/' + t.name, dir + '/' + name, file);
  }
});

test('ingest matcher: unmatchable and ambiguous names are refused, never guessed', () => {
  assert.equal(targetFor('IMG_2041.jpg'), null);
  assert.equal(targetFor('persian night market.png'), null, 'market alone must not match the bg');
  const multi = targetFor('dagger and sword pair.png');
  assert.ok(multi.ambiguous, 'two item tokens must come back ambiguous');
  assert.deepEqual(multi.ambiguous.sort(), ['dagger.png', 'sword.png']);
  assert.equal(targetFor('cool song.mp3'), null, 'audio without a track token must not match');
  assert.ok(targetFor('market battle mix.mp3').ambiguous, 'audio with both track tokens must come back ambiguous');
});
