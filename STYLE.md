# Tavern Bash visual style guide: the Haunted Manor

Date: 2026-07-19. Robbie's recorded creative ruling from the theme bake-off: the game re-themes to a haunted Victorian manor, cozy-spooky, never bloody or gory. The ghost-market and hybrid directions were considered and declined. This file is the Phase 1 style contract; `flux-prompt-suite-2026-07-19.md` prompt mechanics still apply but its bazaar subjects are superseded.

## Style sentence

A vast candlelit haunted manor painted in warm oils: carved dark wood and blackened iron furniture with dusty parchment fields, cobwebs and small spiders as ornament, amber candlelight against cold moonlight, weathered and hand-painted, spooky and inviting, never gory.

## World mapping

The mechanics, ids, saves, and tests do not change. This is a display and art layer pivot, using the established rename-ledger pattern from the 0.53.0 clean-hands pass. The player is a traveling dealer in cursed curios working the wings of one vast estate, trading with its living and dead residents.

* Districts become wings of the house. Working names for Robbie: the Servants' Passages, the Grand Gallery, the Master's Wing, the Cellar Gate. After Midnight keeps its name.
* The market becomes the curio stall the dealer sets up in each wing.
* The storm becomes the Haunting, the house turning against you.
* Monsters largely survive conceptually; several are already spirits. Full bestiary redress happens per set.
* The display name decision stays Robbie's, recorded before native metadata. Candidates to consider later, not now.

## Light rules

* One light direction: warm candlelight from the lower left, cold blue moonlight fill from the upper right through windows. Every sprite carries an amber lit plane low-left and a crisp cool moon shadow opposite, with a thin warm rim.
* Real value range: distinct shadow and highlight shapes on every object. Flat mid-tone renders are rejected.
* Code light grade: a low-opacity warm candle wash anchored to the focal object plus a gentle cold vignette, drawn over every composed screen. This fuses separately generated sprites into one lit house.

## Palette anchors

| Role | Value |
|---|---|
| Night ground | #0b0c14, colder and bluer than the bazaar's |
| Carved wood | #2a1c14 to #4a3322 |
| Blackened iron | #33363f, lit edge #6a707c |
| Candle amber | #e8a54a, lit #f6d488, deep #6f471f |
| Dusty parchment | #d8cbb0, shadowed #a99b85 |
| Moonlight | #9fb4d8 |
| Omen violet | #c9a2f0, unchanged |
| Ember danger | #e58a3c and #d84a34, unchanged |
| Resolve verdigris | #42c1ad, unchanged |
| Healing rose, poison, frost, gold numerics | unchanged mechanics colors |

Semantic rules survive the pivot: violet marks Omen and the arcane; ember marks danger and burn; verdigris marks Resolve and shield; rose heals; frost freezes. Rarity is material: common carved wood, silver adds silver inlay, gold adds gilt candle-brass, diamond adds moonstone and crystal. Quiet tiers stay quieter than loud tiers.

Ornament vocabulary: cobwebs, small spiders, moths, keyholes, candle stubs, wrought iron scrollwork, cameo frames, dead ivy. Never blood, wounds, or gore.

## Anchors and manifest

Anchor lineage: the manor fight medallion is the medallion anchor; the manor estate vista is the scene anchor; the manor card frame, generated first, is the furniture anchor. Every set member generates as an edit of its set anchor.

Furniture, cutout, shared canvas per set: frame family of four rarities, oval hero and foe frames, nine medallions, two plaques, bar housing, hanging candelabra, ivy or web valance.

Scenes, opaque: estate vista and its wing variants including After Midnight, great hall arena in both orientations, curio stall scene, and the five event scenes as manor rooms: the parlor bargain, the rest nook by a fireplace, the seance altar, the locked treasure room, the cellar gate camp.

Existing painted art: heroes and monsters get a wardrobe and dress pass per set via edit chain, faces and identities preserved. Items restyle where the object fights the manor world; many survive. Nothing files into `public/art/` until the owning visual version is reserved.
