# FLUX prompt suite for the Tavern Bash visual direction

Date: 2026-07-19

Written after a live calibration batch on fal.ai FLUX dev (six images: bazaar vista, three portrait scenes, wide arena, gold frame, oval hero frame, market medallion). Every rule below is grounded in what that batch actually did, not guesswork. This supersedes the concept section of `visual-concept-art-prompts-2026-07-18.md` for FLUX use; the production filing rules there still apply.

Nothing here files into `public/art/` until the owning visual version is open. Generated pieces land in a scratch folder first and pass the art-batch honest verdict.

## How to run

The disposable driver is `fal.py` in the session scratchpad: prompt on stdin, then model, outfile, width, height, steps. FLUX dev at 30 steps, guidance 3.5. Scenes at 1344x768 or 832x1216. Furniture at 1024x1024 or 832x1024. Record the seed fal returns; rerunning a near-identical prompt with its sibling's seed keeps a set coherent.

The loop is generate, look, tighten one clause, regenerate. Never accept the first render of a set piece until its siblings exist, because coherence is judged across the set.

## The style spine

Every prompt ends with the spine. Scenes use A, furniture uses A plus B.

Spine A, the world:

```
painted fantasy game art for a nocturnal Persian night market, warm lantern rim light, cool deep indigo ambient, rich aged brass and spice palette, violet gem accents, painterly brushwork with visible strokes, moody cinematic night lighting, no text, no writing, no calligraphy, no glyphs, no watermark
```

Spine B, the furniture rules:

```
a single object isolated on a plain very dark background, perfectly symmetrical, crisp painted edges, aged tarnished metal with worn gilding, hand-painted texture, no photorealism, no plastic sheen
```

Calibration notes the spine encodes:

* Symmetric object plus plain dark ground is the phrasing FLUX obeys best. Keep it verbatim.
* "No text" alone leaks stylized calligraphy onto banners and plaques. The full chain no writing, no calligraphy, no glyphs is required.
* Without hand-painted texture and no plastic sheen, badges and medallions drift toward clean mobile-game renders. The gold frame and oval stayed painterly because they were metal; flat-color subjects need the guard.
* Violet is the Omen accent from Robbie's references and maps to the existing violet UI token. It belongs on gems and finials only, never as a wash.

## 1. Scene backgrounds

Wide 1344x768, tall 832x1216. Every scene declares its quiet zone so the interface has a home.

District vistas, the route screens. One per district, same camera language so the run reads as one journey:

```
a sprawling nocturnal Persian bazaar city seen from high above at a three-quarter angle, winding gilded stone paths connecting rooftops and domed plazas, warm lantern constellations, drifting smoke, deep indigo night haze, clear open path surfaces where route markers could sit, plain untextured banners, no interface elements, no characters, painted fantasy game art for a nocturnal Persian night market, warm lantern rim light, cool deep indigo ambient, rich aged brass and spice palette, violet gem accents, painterly brushwork with visible strokes, moody cinematic night lighting, no text, no writing, no calligraphy, no glyphs, no watermark
```
Target: `bg_vista_back_alleys` wide, then variants by swapping the first clause only:

* Souk: `a dense covered souk district seen from high above, striped awnings and hanging textiles between the gilded paths`
* Palace: `a marble palace quarter seen from high above, pale stone terraces and gold domes along the gilded paths`
* Dragon Gate: `a fortified gate district seen from high above, a colossal dark gate looming at the far top under crimson banners, ember light in the streets`
* After Midnight: `the same bazaar city drowned in storm darkness seen from high above, violet lightning behind the clouds, most lanterns dead, the gilded paths glowing faintly`

Combat arenas, wide and tall:

```
a nocturnal Persian bazaar dueling courtyard, dark wet flagstones with a faint glowing teal rune circle in the center, flanking stalls with iron braziers and warm hanging lanterns, drifting smoke, crimson ember glow at the margins, a quiet clear center floor for combat, no figures, painted fantasy game art for a nocturnal Persian night market, warm lantern rim light, cool deep indigo ambient, rich aged brass and spice palette, violet gem accents, painterly brushwork with visible strokes, moody cinematic night lighting, no text, no writing, no calligraphy, no glyphs, no watermark
```
Target: `bg_arena` wide and tall. Boss variant: replace the crimson clause with `a wall of banked coals and kiln light behind the far edge` for Ifrit-band fights.

Market interior, tall first:

```
the interior of a nocturnal Persian market stall, hanging brass lanterns and draped indigo textiles framing the top and sides, sacks of spice and glowing wares along the edges, a darker quiet center and lower third reserved for interface, no central figures, painted fantasy game art for a nocturnal Persian night market, warm lantern rim light, cool deep indigo ambient, rich aged brass and spice palette, violet gem accents, painterly brushwork with visible strokes, moody cinematic night lighting, no text, no writing, no calligraphy, no glyphs, no watermark
```
Target: `bg_market` tall and wide.

Event scenes reuse the tall recipe with one identity clause each, quiet lower third always: merchant counter with scales and coins, rest alcove with brazier steam, Quqnus shrine with sacred flame and feathers, treasure cloth with a closed brass chest, gate camp with a barred boss gate and a narrow bench.

## 2. UI furniture

The reference language is gilded filigree, purple gem finials, engraved brass rings. The calibration frame and oval already hit it; these prompts hold the line and extend the family.

Rarity card frames, one prompt, four gem swaps. The straight-rail clause is what makes 9-slice possible:

```
an ornate empty rectangular card frame of aged gilded brass, fine Persian filigree confined to the four corners, long plain straight rails between the corner ornaments, a small diamond-cut violet gem at the top center, the center completely plain dark charcoal, no scene inside the frame, no icons inside the frame, a single object isolated on a plain very dark background, perfectly symmetrical, crisp painted edges, aged tarnished metal with worn gilding, hand-painted texture, no photorealism, no plastic sheen, painted fantasy game art, warm lantern rim light, cool deep indigo ambient, no text, no writing, no calligraphy, no glyphs, no watermark
```
Targets: gold as written; bronze swaps `aged gilded brass` to `dark oiled bronze with sparse ornament` and the gem to `a small round amber cabochon`; silver to `polished steel with brass fastenings` and `a pale moonstone`; diamond to `pale silver-white metal with faceted glass inlay` and `a prismatic white gem`.

Oval hero frame, shipped construction, two states:

```
an ornate empty circular portrait frame of engraved aged brass with a pointed finial at top holding a small violet gem, Persian filigree ring detail, the center completely plain dark charcoal, no face inside, a single object isolated on a plain very dark background, perfectly symmetrical, crisp painted edges, aged tarnished metal with worn gilding, hand-painted texture, no photorealism, no plastic sheen, no text, no writing, no calligraphy, no glyphs, no watermark
```
Foe variant: swap the gem clause to `a jagged iron thorn crest at top` and add `faint ember scorch on the lower ring`.

Route node medallions, nine subjects, one construction. The painterly guard matters most here because this is where the calibration drifted:

```
a round route medallion of aged gilded brass with a raised rim and four compass-point studs, holding a small painted miniature of SUBJECT inside on a worn indigo field, muted heraldic colors, weathered edges, a single object isolated on a plain very dark background, perfectly symmetrical, crisp painted edges, aged tarnished metal with worn gilding, hand-painted texture, no photorealism, no plastic sheen, no text, no writing, no calligraphy, no glyphs, no watermark
```
Subjects: `a striped market stall awning` market; `two hands clasped over coins` merchant; `a steaming brass tea urn` rest; `an open treasure chest` treasure; `a rising phoenix flame` shrine; `two crossed curved daggers` fight; `a snarling beast skull` elite; `a dark fortress gate` boss; `a low campfire under a lantern` camp. Done-state and locked-state come from CSS desaturation, not separate art.

Storm gauge, health housings, plaques:

```
a shallow crescent arc gauge of aged brass with fine tick marks engraved along its inner edge and a small diamond-cut violet gem hanging at its center point, open at the top, no dial face, no numbers, a single object isolated on a plain very dark background, perfectly symmetrical, crisp painted edges, aged tarnished metal with worn gilding, hand-painted texture, no photorealism, no plastic sheen, no text, no writing, no calligraphy, no glyphs, no watermark
```

```
a long horizontal empty bar housing of aged brass with engraved end caps and a thin inner channel of plain dark charcoal, built to hold a glowing liquid fill, a single object isolated on a plain very dark background, perfectly symmetrical, crisp painted edges, aged tarnished metal with worn gilding, hand-painted texture, no photorealism, no plastic sheen, no text, no writing, no calligraphy, no glyphs, no watermark
```

```
a wide horizontal button plaque of dark engraved stone bound in aged brass with a violet gem set at each end, the face plain and empty, a single object isolated on a plain very dark background, perfectly symmetrical, crisp painted edges, aged tarnished metal with worn gilding, hand-painted texture, no photorealism, no plastic sheen, no text, no writing, no calligraphy, no glyphs, no watermark
```
Danger variant of the plaque: `bound in blackened iron with ember light in the engraving` for Challenge and sacrifice actions.

Boss scout panel, the tall arched side panel from the route reference:

```
a tall empty arched stone panel bound in aged brass, a pointed Persian arch window at the top with plain dark charcoal inside, a plain recessed square below it, engraved border, built as an interface side panel, a single object isolated on a plain very dark background, perfectly symmetrical, crisp painted edges, aged tarnished metal with worn gilding, hand-painted texture, no photorealism, no plastic sheen, no text, no writing, no calligraphy, no glyphs, no watermark
```

## 3. Combat spectacle

Full-body hero lunges, the one piece the web proof could not fake. One per hero, matched to the shipped bust so the character reads as the same person. Start with the two slice heroes:

```
a full-body hooded duelist in deep violet silk mid-lunge, seen from behind at a low three-quarter angle, one narrow blade extended trailing faint violet light, dramatic silhouette composed to anchor the lower left corner of a wide frame, dark surroundings falling away to plain darkness at the edges, painted fantasy game art for a nocturnal Persian night market, warm lantern rim light, cool deep indigo ambient, rich aged brass and spice palette, painterly brushwork with visible strokes, moody cinematic night lighting, no text, no writing, no calligraphy, no glyphs, no watermark
```
Target: Silkblade lunge, wide. Kilnkeeper variant: `a broad bald forge-keeper in a scorched leather apron mid-swing, ember light crawling up his arms, a glowing chain wrapped around one fist`, same framing clauses.

Boss reveal busts at scale, for entrances and the gate camp:

```
a towering ifrit of burning coals and cracked obsidian rising from a kiln, shoulders and head filling the frame, white-hot seams glowing through black stone, embers drifting upward, composed with headroom for a name plate above, dark surroundings falling away to plain darkness, painted fantasy game art, warm ember rim light, cool deep indigo ambient, painterly brushwork with visible strokes, moody cinematic night lighting, no text, no writing, no calligraphy, no glyphs, no watermark
```

Impact and slash sprites: generate on pure black for additive screening, `a single curved slash of violet-white light with sparks at its tip, on a pure black background, no other objects`. FLUX is inconsistent here; accept a low hit rate or keep these procedural in Pixi, which the proof already showed works.

## 4. Order of work and budget

1. Rarity frame family, four images, then the oval pair. These unlock every card and portrait surface.
2. The nine medallions in one session for coherence.
3. District vistas, wide then tall.
4. Arena and market scenes, both orientations.
5. Storm gauge, housings, plaques, scout panel.
6. Hero lunges and boss busts last; they are the most iteration-hungry.

FLUX dev on fal runs a few cents per image. The whole suite with two rounds of iteration is on the order of five dollars. The key pasted in this session should be rotated in the fal dashboard when the session ends.
