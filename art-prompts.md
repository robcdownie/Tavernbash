# Painted art prompt sheet

One prompt per asset, filename attached. Paste prompts into your image generator one category per session so the set stays coherent, per the handoff. After generating: crop or pad to 512x512, remove the background so it is transparent, name the file exactly as listed, drop it into the folder shown, run `npm run art`, and redeploy. Any file can land alone; everything else keeps its SVG.

## Base template

Every prompt below is this template with the subject swapped in:

> painted fantasy game item icon, SUBJECT, Persian night market setting, warm lantern rim light from lower left, cool indigo ambient, dark transparent background, rich brass and spice palette, painterly brushwork, centered composition, no text

For monsters swap "item icon" for "monster bust, composed for a circular medallion crop". For portraits swap it for "character portrait, shoulders-up merchant bust". The object should fill 78 to 85 percent of the frame.

## Items, to public/art/items/

| File | Subject line |
|---|---|
| dagger.png | a rusty iron dagger with a worn leather grip |
| sword.png | a plain sturdy iron shortsword |
| fangs.png | a pair of small curved twin fang daggers |
| serpent.png | a sinuous serpent-shaped blade with a venom-green sheen |
| mace.png | a heavy spiked bronze mace |
| crossbow.png | a compact merchant crossbow with brass fittings |
| hammer.png | a massive two-handed warhammer |
| vial.png | a small corked glass vial of glowing green toxin |
| venom.png | a carved stone idol dripping with luminous green venom |
| torch.png | an oil-soaked torch with a live flame |
| bomb.png | a round black fire bomb with a lit fuse |
| magma.png | a molten glowing magma heart, cracked obsidian shell |
| buckler.png | a small round wooden buckler with an iron boss |
| brassbuckler.png | a gleaming ornate brass buckler with engraved patterns |
| barricade.png | a stacked stone barricade segment |
| tower.png | a tall rectangular tower shield with brass rivets |
| aegis.png | a gilded ceremonial aegis shield with palace filigree |
| bandage.png | a rolled linen bandage tied with cord |
| salve.png | a clay pot of green healing salve |
| chalice.png | a jade chalice glowing softly from within |
| sanctum.png | a rose-tinted crystal fountain bottle |
| purse.png | a plump leather coin purse spilling gold coins |
| ledger.png | a leather-bound merchant ledger with brass clasps |
| whetstone.png | a worn sharpening whetstone with metal shavings |
| hourglass.png | an ornate brass hourglass with flowing amber sand |
| adren.png | a fizzing crimson adrenaline draught in a slim flask |
| viperverdict.png | a broad verdict blade wrapped by a brass viper, its edge wet with green venom |
| cinderhook.png | a hooked falchion with a charred grip and a live ember burning in the hook |
| brassreclaimer.png | a massive brass salvage cleaver with a shield-shaped counterweight and gear teeth |
| surgeonhook.png | a slim steel surgeon hook with a rose-gold handle and one loop of crimson thread |
| sapperspick.png | a compact steel sapper pick with brass collars and a scarred wooden haft |
| blacklotuspress.png | a compact brass alchemical press crushing a black lotus, vivid green venom collecting below |
| serpentsdue.png | a coiled emerald serpent formed into a heavy ceremonial poison vessel with ruby eyes |
| antidotethief.png | a nimble brass hand stealing a luminous antidote vial, trailing green droplets |
| venomsiphon.png | a curved brass siphon drawing luminous green venom into a dark glass flask |
| funeralbrazier.png | a broad blackened brass funeral brazier filled with white-hot coals and curling ash |
| ashencenser.png | an ornate pierced brass censer spilling embers and trailing bands of gray ash |
| kilnchain.png | a short iron kiln chain glowing orange at each link, with hooked brass clasps |
| phoenixbell.png | a ceremonial brass bell shaped like a phoenix, its clapper glowing with live fire |
| coinplatedram.png | a massive brass battering ram plated in overlapping gold coins with a dark wooden core |
| mirrorbastion.png | a tall polished silver mirror-shield in a heavy brass bastion frame |
| saltward.png | a small carved salt ward tablet bound in brass wire, dusted with white crystals |
| breakwaterbuckler.png | a round blue-steel buckler embossed with a breaking wave and edged in brass |
| rosewaterpump.png | an ornate brass hand pump drawing glowing rosewater through a crystal chamber |
| chirurgeonsscissors.png | fine silver surgical scissors with rose-gold hinges and a loop of clean linen |
| bloodpricechalice.png | a heavy dark jade chalice filled with luminous crimson liquid, set with brass thorns |
| mendersbell.png | a small rose-brass mending bell wrapped with linen strips and fine gold thread |

## Monsters, to public/art/monsters/

Bust composed for a circular medallion crop.

| File | Subject line |
|---|---|
| imp.png | a grinning little lamp imp wreathed in wick smoke |
| rats.png | a snarling knot of bazaar rats with bared teeth |
| ghul.png | a rust-caked ghul hunched over a corroded cleaver |
| lamassu.png | a stoic brass lamassu, winged bull with a human face |
| kark.png | a karkadann, a monstrous one-horned beast mid-charge |
| debt.png | a gaunt debt collector in dark robes clutching a ledger blade |
| ifrit.png | an ifrit of burning coals rising from a kiln |
| qareen.png | a qareen, a shadowy mirror-spirit with a half-formed face |

## Portraits, to public/art/portraits/

Shoulders-up merchant busts. p0 is the player.

| File | Subject line |
|---|---|
| p0.png | a determined young merchant in a travel-worn coat |
| p1.png | Old Farrokh, a weathered elder merchant with a heavy shield slung on his back |
| p2.png | Zubaida the Coilwright, a sharp-eyed woman with serpent-coil jewelry |
| p3.png | Mirza Half-Price, a sly grinning trader flipping a coin |
| p4.png | The Widow Anahit, a serene veiled woman holding a small rose |
| p5.png | Kasra of the Ash Quarter, a soot-streaked man with ember-lit eyes |
| p6.png | Bibi Gol, a broad cheerful arms dealer draped in blades |
| p7.png | Tariq Two-Knives, a wiry duelist with a knife over each shoulder |

## Larger pieces, when ready

These are wired through CSS rather than the manifest, so tell Claude Code when they land:

| File | To | Spec |
|---|---|---|
| frame_bronze.png, frame_silver.png, frame_gold.png, frame_diamond.png | public/art/frames/ | ornate card frames per rarity, built for 9-slice scaling |
| board_wood.png | public/art/board/ | dark planked stall timber, 1024px tileable |
| bg_market.png | public/art/bg/ | night market alley, 1080x1920, heavy vignette, low detail in the center |
