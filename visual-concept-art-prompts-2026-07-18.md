# Visual direction art prompts

Date: 2026-07-18

Companion to `visual-direction-audit-2026-07-18.md` and the redesign proof at the Artifact URL in the session summary.

Two kinds of prompt live here:

1. **Concept proofs** are disposable full screen studies. They are direction only. File the results to a scratch folder such as `concept-art/`, never to `public/art/`. They invent UI text, frames, and geometry that are not canonical.
2. **Production assets** follow the master template in `art-prompts.md`. Each names the exact target slot. These are for the visual project after Launch L2, not for filing today. Generate them when the visual version that consumes them is open.

Every prompt below already has the subject swapped in. Paste one category per generator session so the set stays coherent. Zero readable text in any output, and do not imitate any existing game interface.

## 1. Concept proofs (disposable, file to concept-art/, not public/art/)

These are the three exploratory phone mockups. They preserve the mythic bazaar identity, keep the painted hero as an anchor, show believable density, and leave room for controls and small text.

Assumptions baked into all three, so treat the output as mood not layout: a persistent brass hero HUD at the top, indigo textile behind ware cards, a wooden stall or path at the bottom, one warm lantern pool marking the current focus, and no real strategic text.

```
A vertical 9:19 mobile game concept for a nocturnal Persian night market shop. At the top, a painted bald forge-lit merchant bust framed in aged brass as a persistent status bar, with two small brass resource counters beside him. Below, a carved dark wood market shelf holding four ware cards on deep indigo textile, one card lit by a warm hanging lantern to pull the eye, each card carrying a single painted object, a bandage, a lit oil torch, a brass buckler, a round shield. A row of three distinct controls beneath the shelf. A continuous wooden stall tray of ten carved slots along the bottom, one slot glowing. Warm lantern rim light from lower left, cool indigo ambient, drifting smoke and hanging lamps, rich brass and spice palette, painterly brushwork, dense but readable, leave clear quiet zones for small UI text. No readable text, no logos, do not imitate any existing card game interface.
```
Target: `concept-art/concept-market-phone.png`

```
A vertical 9:19 mobile game concept for a route map through a nocturnal Persian back alley bazaar. A misty painted alley of hanging lanterns receding into fog. Near the top, a distant stone arch holding a menacing rust caked ghul boss lit red, kept small and far as a destination. In the mid foreground, three large glowing medallion choices resting on a brass path rail, a snarling knot of rats, a merchant handshake, an open treasure chest, each a painted object with a short label space beneath. A persistent brass merchant bust status bar at the very top. A bottom scouting drawer showing a large rat bust, a red threat meter, and two choices. Warm lantern light, cool indigo depth, drifting smoke, brass and spice palette, painterly, clear near and far layers, leave room for small labels. No readable text, do not copy any existing game map screen.
```
Target: `concept-art/concept-route-phone.png`

```
A vertical 9:19 mobile game concept for an auto battler duel in a nocturnal Persian bazaar arena at night. The top third holds a snarling rat swarm as a large painted bust behind a red health bar, with a row of small twin fang weapon tiles. The center is a dramatic dark action lane where a lit oil torch on the near side hurls an ember streak upward toward the rats, ending in a large glowing burst. The bottom third holds a forge lit bald merchant hero bust behind a teal health bar, with a rail of painted ware tiles, one lifted and glowing as it fires. Crimson danger light rims the screen edges, the stone floor is dim and desaturated, warm ember accents, painterly and cinematic, a clear line from source to target, leave room for small status text. No readable text, do not imitate any existing auto battler interface.
```
Target: `concept-art/concept-combat-phone.png`

## 2. Production backgrounds, portrait first (public/art/bg/, generate at Launch L5)

The current backgrounds are landscape crops. The phone north star needs portrait compositions with quiet zones for the HUD and the bottom stage. Render tall, around 1170 by 2532, opaque.

```
painted background scene, a nocturnal Persian night market alley composed vertically for a tall phone frame, heavy vignette at top and bottom, a quiet low detail center and lower third reserved for a stall and interface, warm hanging lanterns, cool indigo depth, drifting smoke, rich brass and spice palette, painterly brushwork, no text, no characters in the center
```
Target: `public/art/bg/bg_market_portrait.png`

```
painted background scene, a foggy Persian back alley bazaar at night composed vertically for a tall phone frame, strings of hanging lanterns receding into haze near the top, a quiet lower third reserved for an interface drawer, warm lantern light, cool indigo shadow, wet stone and smoke, painterly brushwork, no text, no central figures
```
Target: `public/art/bg/bg_route_back_alleys_portrait.png`

```
painted background scene, a nocturnal bazaar fighting arena floor composed vertically for a tall phone frame, dark desaturated flagstones with a faint chalk ring, a quiet central action lane, warm ember edge light from below, a crimson danger vignette at the screen edges, painterly brushwork, no text, no figures
```
Target: `public/art/bg/bg_battle_portrait.png`

## 3. Rarity frame family rebuild (public/art/frames/, 9-slice)

Codex flagged the current frames as a fixed aspect ornament rather than a modular system. Rebuild them as border only art with a fully transparent center so they scale as 9-slice. No baked text, no baked icons.

```
an ornate card frame border only, aged bronze and dark wood with restrained Persian bazaar motifs, painted for 9-slice scaling, fully transparent center window, separable corners and edges, dark transparent background, no text, no icons, no inner scene
```
Target: `public/art/frames/frame_bronze.png`

```
an ornate card frame border only, polished steel and brass with restrained Persian bazaar motifs, a single clean inset line, painted for 9-slice scaling, fully transparent center window, separable corners and edges, dark transparent background, no text, no icons, no inner scene
```
Target: `public/art/frames/frame_silver.png`

```
an ornate card frame border only, lit brass and warm enamel with richer corner filigree, painted for 9-slice scaling, fully transparent center window, separable corners and edges, dark transparent background, no text, no icons, no inner scene
```
Target: `public/art/frames/frame_gold.png`

```
an ornate card frame border only, pale metal and faceted glass with sparse prismatic accents, painted for 9-slice scaling, fully transparent center window, separable corners and edges, dark transparent background, no text, no icons, no inner scene
```
Target: `public/art/frames/frame_diamond.png`

## 4. Decision and event scene backgrounds (public/art/bg/, P1)

Each event needs its own material world so Merchant, Rest, Shrine, Treasure, and the Gate Camp stop sharing one brown modal. Portrait, around 1170 by 1800, opaque, with a quiet lower zone for choices.

```
painted background scene, a Persian bazaar trading counter at night for a merchant bargain, a carved wood counter with scales, coins, and a hanging lamp, warm lantern rim light, cool indigo shadow, a quiet lower zone for interface choices, painterly, no text, no central figure
```
Target: `public/art/bg/bg_event_merchant.png`

```
painted background scene, a quiet Persian bazaar rest alcove at night, cool stone walls, a low brazier with rising tea steam, folded textiles, soft warm glow, a quiet lower zone for choices, painterly, no text, no central figure
```
Target: `public/art/bg/bg_event_rest.png`

```
painted background scene, a Quqnus phoenix shrine at night, a tall central stone niche with a low sacred flame and curling smoke, scattered feathers and ash, cool indigo surroundings with a warm core, a quiet lower zone for offerings, painterly, no text, no central figure
```
Target: `public/art/bg/bg_event_shrine.png`

```
painted background scene, a Persian bazaar treasure cache at night, a draped cloth over a low table with a closed brass bound chest, warm lantern glow, cool indigo surroundings, a quiet lower zone for reward choices, painterly, no text, no central figure
```
Target: `public/art/bg/bg_event_treasure.png`

```
painted background scene, a fortified bazaar gate camp at night before a boss threshold, a heavy closed stone and iron gate glowing with menace, a narrow quartermaster bench to one side, smoke and low lantern light, a quiet lower zone for the retry action, painterly, no text, no central figure
```
Target: `public/art/bg/bg_event_gatecamp.png`

## 5. Decorative and lighting kit (public/art/ui/, P1)

Small painted pieces that break rectangular panels and give the lantern light real sources. Isolated objects, transparent background.

```
painted fantasy game prop, a single ornate brass and glass hanging bazaar lantern with a warm glowing flame, dark transparent background, warm rim light, brass and spice palette, painterly, centered, no text
```
Target: `public/art/ui/lantern_hanging.png`

```
painted fantasy game prop, a folded Persian textile valance edge with tassels for the top of a panel, dark transparent background, deep indigo with brass thread, painterly, no text
```
Target: `public/art/ui/textile_valance.png`

```
painted fantasy game prop, a set of four ornate brass corner fittings and rivets for joining panel edges, dark transparent background, aged brass, painterly, no text, arranged as separate corners
```
Target: `public/art/ui/brass_corners.png`

```
painted fantasy game prop, a wax and brass merchant seal stamp pressed into red wax, dark transparent background, warm light, painterly, centered, no text
```
Target: `public/art/ui/seal_merchant.png`

## 6. Hero and boss combat crops (public/art/portraits/ and monsters/, P1)

The combat anchors want a slightly wider bust than the 320 portrait. Regenerate the two slice heroes and the two Back Alleys bosses at higher resolution if the 96 px combat crop looks soft on device. Same subjects as the shipped art, so keep them faithful.

```
character portrait, shoulders up bust of the Kilnkeeper, a bald forge lit merchant with ember lit eyes and a burn scarred apron, Persian night market setting, warm lantern rim light from lower left, cool indigo ambient, dark transparent background, rich brass and spice palette, painterly, composed for a tall combat crop with headroom, no text
```
Target: `public/art/portraits/h-kiln.png` (only if a larger source is needed)

```
monster bust composed for a circular medallion crop, a snarling knot of bazaar rats with bared teeth, Persian night market setting, warm lantern rim light from lower left, cool indigo ambient, dark transparent background, rich brass and spice palette, painterly, larger source for a combat anchor, no text
```
Target: `public/art/monsters/rats.png` (only if a larger source is needed)

## Order of work

1. The three concept proofs, if you want more painted studies alongside the built HTML proof.
2. Portrait backgrounds for market, route, and battle. These unlock the phone first compositions in the proof.
3. The 9-slice frame family rebuild.
4. Event scene backgrounds, decorative kit, and combat crops during the visual project.

Nothing here is filed until the owning visual version is open, so the manifest and tests stay untouched today.
