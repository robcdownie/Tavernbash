# Tavern Bash visual direction and production-quality audit

Date: 2026-07-18

Audited build: 0.99.4

Canonical reviewed source: `coordination/state.json`, reviewed gameplay HEAD `f4a91f609f12f1de930627ec7d6de8563ce1c5dc`, with the current integration checkout at `13bcbde`

Live target: `https://platosd.com`

Audit boundary: diagnosis, visual direction, and roadmap ruling only. No production code, gameplay, balance, roadmap, canonical state, release metadata, or deploy changes are part of this work.

Evidence status:

- Live browser inspection completed at 390 by 844 portrait, 844 by 390 landscape, and 1440 by 900 desktop.
- Live states reached: title, hero selection, route-length choice, Omen and route reveal, opening and route markets, board strip, route map, monster scout, combat opening, active combat, victory recap, defeat recap, and Merchant decision.
- Source and automated-layout review completed for Vault, Treasure, Rest, Shrine, Gate Camp, Almanac, unlock strip, run report, end screen, tutorial coach, help, and responsive rules.
- Real-phone photos and recordings: pending Robbie's upload. They must replace any contradictory emulation conclusion before this audit can become an approval record.
- Three generated concepts are disposable visual-direction studies outside all production art paths. They are not implementation specifications or usable game assets.

## 1. Hard visual-readiness verdict

**Tavern Bash is not visually ready for a public-facing 1.0 and does not yet meet the presentation bar of a premium mobile game.** It is a mechanically credible game presented through a visually decorated web interface. The painted title and hero portraits briefly promise a distinctive product, then the route, market, combat, and reward screens fall back to small type, repeated rectangular panels, thin borders, browser-like scrolling, weak focal control, and mostly uniform interaction weight.

This is not a spacing-only or mobile-clarity problem. It is a missing presentation architecture problem.

The current build contains many good ingredients: painted portraits, item and monster art, district and battle paintings, rarity frames, music loops, stingers, particles, route state, rich strategic copy, and responsive tests. The failure is that these ingredients do not behave as one authored visual system. The interface often treats the painting as wallpaper and places a dashboard over it. Paint, typography, framing, lighting, motion, and sound do not consistently agree about the current focal point or emotional beat.

The current Release Experience plan assumes that 0.108.0 can solve presentation through overlay caps, 44-point controls, fight readability, compact route comparison, and signature surfacing. Those are necessary accessibility and clarity tasks, but they are far below the work proven necessary by the live build. A single combined mobile pass would hide missed surfaces, encourage more CSS overrides, and make visual approval inseparable from unrelated tutorial and release work.

**Roadmap ruling:** accept the proposed insertion in principle. Add a dedicated project after Launch L4 and before Release Experience. Name it `Launch L5: Visual Identity and Finish`, and move the existing Release Experience project to `Launch L6`. The visual project needs multiple versions, one presentation system per version, with named phone screenshot approval at every gate. Do not compensate with gameplay, balance, or additional content.

No current green test, no-clipping result, or complete copy surface changes this verdict. The presentation gate is failed until the title, route, market, combat, reward, and return-to-route loop visibly belongs to one product on a real phone.

## 2. Ten most damaging presentation problems

### 1. The product changes identity after the title screen

The title screen is a full-bleed painted invitation with a strong creature silhouette, characters, depth, and a clear center. The next screens replace that confidence with centered modal cards, tiny chips, and brown gradients. The player experiences a branded poster followed by a website.

Failure scenario: a recording opens with the impressive title, then the hero picker reveals a floating rectangle with eight thumbnail buttons and a generic gold CTA. The perceived production value drops within one tap.

Minimum correction: carry a persistent hero identity, material construction, light direction, type hierarchy, and transition language from title through the full run.

### 2. There is no reliable visual center during play

Market cards, route nodes, resource chips, controls, board slots, and overlays use similar border weight, similar brown values, and similar brass accents. The eye receives many decorated objects but no decisive priority.

Failure scenario: at the 390 by 844 market, the player sees four equally framed cards, an exposed horizontal scrollbar, three equal controls, a Vault pill, a route CTA, ten stall cells, and a four-part resource bar. Nothing clearly owns the moment.

Minimum correction: give each screen one center of gravity, then enforce a three-level hierarchy through scale, light, depth, and motion.

### 3. Strategic text is physically too small

The source uses 7 to 10 px labels and 9 px ware descriptions in several primary surfaces. The route map shrinks visible node labels to 8 px in portrait. The desktop layout preserves small mobile-scale cards instead of using the available canvas.

Failure scenario: a player can technically tap a 44 px route button while being unable to read the 8 px label or distinguish a future node from a reachable node at arm's length.

Minimum correction: set 12 px as the absolute exception floor, 13 to 14 px for strategic rules, and 15 to 17 px for primary body copy on phone. Remove copy or reveal it progressively rather than shrinking it.

### 4. The interface uses one generic panel language for unrelated meanings

Market shelf, scout panel, event choices, recaps, history, and modal reveals are variations of dark brown rectangles with brass borders. Danger, trade, sanctuary, treasure, progression, and defeat do not have distinct construction logic.

Failure scenario: Merchant, Treasure, Rest, and Shrine choices differ mainly by heading and copy, so the emotional and strategic context arrives as text rather than through the screen.

Minimum correction: build a small family of semantic materials: trade wood and textile, danger iron and ember, sanctuary stone and smoke, reward brass and glass, record parchment and ink.

### 5. Painted illustration is framed as an icon instead of directing the scene

Hero and monster paintings are often reduced to 26 to 64 px circles. Combat gives the Kilnkeeper and Souk Rats small identity badges while a large empty log area occupies most of the phone.

Failure scenario: the strongest assets become thumbnails while generic health bars and black slots dominate the frame.

Minimum correction: use hero and enemy portraits as compositional anchors, crop them intentionally, light nearby UI from their art, and reserve tiny medallions for secondary references only.

### 6. Combat communicates state but not action

The current combat screen clearly shows two rows, health, status counters, storm time, and a log. It does not create a readable line from anticipation to activation to target to impact to aftermath. Source and target are separated by a large neutral gap, while the action often exists as a brief streak or number.

Failure scenario: five Rat Fangs tick, the player's only ware disappears, numbers change, and the log says `Oil Torch destroyed`, but the emotional read is spreadsheet attrition rather than a duel.

Minimum correction: choreograph every activation as source wind-up, directional travel, target response, number, status residue, and health settlement, with magnitude tiers.

### 7. Rewards and setbacks lack ceremony proportional to consequence

Victory and defeat use the same centered gold-framed card structure. A boss bounty, rare find, fusion, Diamond creation, unlock, or district clear can become a toast, a small burst, or a standard choice grid.

Failure scenario: a decisive Rust Ghul win ends with a recap card and then a route toast saying a Brass Buckler waits in the market. The reward is correct, durable, and emotionally flat.

Minimum correction: define reward tiers and give each anticipation, reveal, confirmation, and persistent aftermath.

### 8. Phone composition is compressed desktop logic

Portrait market keeps four full rule cards, all controls, board, CTA, and resource bar in one vertical stack. The result includes internal scrolling and, in the audited live capture, a visible browser-style horizontal scrollbar. Portrait route retains the same multi-column map and solves fit by shrinking nodes.

Failure scenario: the phone contains everything but composes nothing. Content is fitted through scale reduction and nested scroll areas rather than staged interaction.

Minimum correction: use progressive disclosure, bottom drawers, collapsible shelves, and one primary interaction zone per state. Phone layouts should be authored, not scaled.

### 9. Motion exists as isolated effects, not a hierarchy

The code has particles, card pop, buy flight, coin flight, forge burst, cooldown rings, `Dusk Falls`, combat streaks, health ghosts, shake, and stingers. These effects were added in separate passes and do not share a timing grammar. Some moments hold for fixed durations while ordinary actions do not consistently show anticipation and resolution.

Failure scenario: `Dusk Falls` blocks the simulation for 1.5 seconds, but a purchase, route transition, or Merchant bargain can resolve with far less authored staging. Duration does not match meaning.

Minimum correction: define motion tiers, shared easing, input rules, and sound sync before adding more effects.

### 10. Presentation implementation has accumulated override debt

`index.html` is about 202 KB with 1,610 lines and many version-labeled CSS passes. Core selectors such as `.label`, `.board`, `.cell`, `.ware`, `.ribbon`, `.card`, and portrait or landscape rules are repeatedly redefined. `src/ui.js` and `src/route-ui.js` build large HTML strings directly. Layout tests mainly prove fit, overflow, and touch geometry, not focal hierarchy, legibility, crop quality, or motion meaning.

Failure scenario: a new visual pass fixes portrait market but silently changes fight, Gate Camp, or end-screen rules through a later selector. Tests stay green because nothing clips.

Minimum correction: establish new component primitives and screenshot gates behind version boundaries. Do not continue by adding another late CSS layer to the same selectors.

### Cause matrix

| Cause | Current diagnosis | Production consequence |
|---|---|---|
| Art direction | The painted title and heroes promise a specific mythic bazaar, while most playable surfaces fall back to generic brown panels and gold borders. | The product loses its identity immediately after entry. |
| Information hierarchy | Primary decisions, secondary controls, status, and navigation often share similar scale and ornament. | Players must read the whole screen before knowing what matters. |
| Screen composition | Phone screens stack all desktop concepts vertically or shrink a whole graph to fit. Desktop preserves a narrow mobile rail instead of composing the wider canvas. | Portrait feels compressed and desktop feels underused. |
| Typography | Strategic rules and route labels reach 7 to 10 px, while display faces are used without a complete role system. | Important information is technically present but not comfortably readable. |
| Color and lighting | Brown midtones dominate, and brass accents do not consistently indicate priority, rarity, safety, or danger. | Screens flatten into one value band and decorated objects compete equally. |
| Material language | Wood, brass, parchment, stone, danger, rest, and reward lack distinct construction rules. | Merchant, Shrine, Treasure, recap, and system dialogs feel like reskinned copies. |
| Depth and layering | Most panels sit on the same plane with similar borders and shadows. | Play space, controls, overlays, and environmental art are not spatially separated. |
| Illustration integration | Strong paintings are reduced to small circles or isolated behind generic UI rather than shaping crop, lighting, and layout. | The best assets read as attachments instead of the product's visual foundation. |
| Iconography | Small route and status symbols carry too much meaning without a unified silhouette, stroke, fill, and state grammar. | Recognition slows and the interface leans harder on tiny text. |
| Animation and transitions | Useful effects exist, but timing and easing were added in separate passes and do not form a shared hierarchy. | Motion decorates events without consistently explaining cause, consequence, or importance. |
| Combat readability | Rows and health state are clear, but source, target, travel, impact, status, and settlement are weakly connected. | Combat reads as changing counters and log entries rather than authored action. |
| Reward drama | Victories, losses, bargains, rare finds, and progression reuse modest cards, toasts, and bursts. | Consequential outcomes do not create emotional peaks or memorable recordings. |
| Interaction feedback | Hover, press, selection, affordability, targetability, drag ownership, and completion do not share one reliable feedback grammar. | Actions can work correctly while still feeling light, uncertain, or web-like. |
| Touch ergonomics | Many targets meet the 44 px geometry gate, but readable labels, thumb reach, nested scrolling, and dense choice comparison remain weak. | Passing a tap-size test does not make the phone experience comfortable. |
| Responsive behavior | Portrait, landscape, and desktop mostly rearrange or scale common blocks instead of changing composition by task. | Each viewport exposes a different form of compromise rather than a deliberate layout. |
| Sound and visual synchronization | Synthetic cues and stingers cover many events, but visual contact frames and audio accents are not governed by one timing contract. | Sound can announce an event without reinforcing the exact visible impact. |
| Missing production assets | There are not yet enough semantic frames, district scenes, reward reveals, transition plates, state icons, masks, or magnitude-tier effects. | CSS and copy are forced to carry atmosphere and meaning that require authored assets. |
| Inconsistent or placeholder surfaces | Generic modals, native scrollbars, repeated card grids, simple status pills, and empty regions remain visible beside finished paintings. | Individual prototype tells survive in nearly every major loop. |
| Technical implementation debt | Large HTML strings and repeated late CSS overrides make surface-level polish fragile and difficult to test semantically. | Each new pass risks regressions and encourages another local patch instead of a coherent system. |

## 3. Visual north star

### North star statement

**A living lantern bazaar in which every decision is staged at the merchant's stall, every route threshold feels like crossing into a deeper district, and every fight turns painted merchants and mythic creatures into participants rather than icons.**

The identity should be nocturnal, mercantile, tactile, and mythic. It should not read as a generic medieval card tavern. The distinctive ingredients are trade objects, market architecture, hanging textiles, lamps, brass instruments, smoke, wet stone, stamped ledgers, seals, coins, and dangerous creatures half-seen between stalls.

### Pillar 1: The merchant is the player's body

Concrete implications:

- A 72 to 96 px hero portrait or cropped bust anchors every phone play screen. It may reduce to 56 px only when a full combat action needs the space.
- Resolve, Gold, Tier, signature progress, and current Omen attach to the hero frame, not to unrelated floating chips.
- Hero color and category influence one restrained accent, not the whole screen.
- Major actions can trigger a hero glance, bark, rim-light pulse, or portrait reaction, but the portrait never covers strategic state.
- Desktop expands the portrait into a 180 to 240 px side anchor with the same information anatomy rather than leaving an empty background margin.

### Pillar 2: The bazaar is built, not overlaid

Concrete implications:

- Market offers hang from rails or rest on a shelf. Board and Vault slots live in a physical stall tray. Route choices sit on a brass path instrument or district vista. Event choices occupy a material appropriate to the event.
- Panels require a construction recipe: outer silhouette, material fill, keyline, inner shadow, lit edge, attachment points, and content padding. A gradient plus one-pixel border is not a finished panel.
- Use 9-slice frames only for scalable structural edges. Do not bake text, icons, or fixed geometry into reusable frames.
- Decorative objects sit outside tap regions and never compete with a primary label.

### Pillar 3: Lantern light is the hierarchy engine

Concrete implications:

- One warm light pool identifies the current decision or active combat source. Secondary information falls into cool indigo ambient light.
- Reachable route nodes, affordable wares, active attacks, and chosen rewards receive light before they receive extra borders.
- Danger uses hot ember and deep negative value; sanctuary uses cool smoke and pale stone; rarity changes spectral response and material detail, not only border color.
- Every screen is checked in grayscale. If the hierarchy disappears without color, the value structure is not finished.

### Pillar 4: Decisions open like objects

Concrete implications:

- Scout, Vault, Merchant, Treasure, Rest, Shrine, and help surfaces use drawers, ledgers, curtains, trays, seals, or shutters with a consistent open and close grammar.
- Phone screens reveal detail progressively. A node or ware tap opens a bottom drawer occupying no more than 42 percent of the viewport, with the primary action pinned above the safe area.
- Selection changes the object itself through lift, light, and attachment, not only a bright outline.
- No primary path depends on a nested browser scrollbar.

### Pillar 5: Consequence has a visible waveform

Concrete implications:

- Major events always have anticipation, impact, resolution, and persistent aftermath.
- Combat uses an activation lane and magnitude tiers. Fusion, Gilding, Diamond creation, boss escalation, district entry, rare rewards, and route completion each have a distinct peak.
- Sound and visuals share the same impact frame. A stinger never arrives after the visual result has already settled.
- Reduced motion preserves the three information states through cuts, light changes, and short opacity transitions.

## 4. Competitive principle comparison

The references below are used for principles, not for layouts, motifs, assets, frames, terminology, or iconography.

### Hearthstone and Battlegrounds

Official reference: [Introducing Hearthstone Battlegrounds](https://news.blizzard.com/en-us/article/23156373/introducing-hearthstone-battlegrounds)

- **Hierarchy in less than one second:** the board is a stage, the hero is a persistent identity, and cards or minions are large objects with clear ownership. Tavern, combat, and result phases have unmistakable scene changes.
- **Player identity:** hero portrait, power, health, and voice form one character package.
- **Ordinary reward:** buying, placing, freezing, upgrading, and tripling have object motion, sound, and readable state change.
- **Play space versus controls:** the board remains the visual center while economy controls attach to its edge.
- **Depth, scale, light, motion, sound:** objects lift, collide, glow, crack, and settle within a layered diorama.
- **Dense information:** text lives on large inspectable game objects; secondary details are disclosed through hover, tap, or dedicated panels.
- **Visual center:** the current object or attack is enlarged and lit, while the board stays stable.
- **Transitions:** tavern entry, combat pairing, and reward discovery become authored beats.
- **Rarity, danger, reward, progression:** material detail, animation amplitude, audio, and framing scale together.
- **Brand continuity:** warm, playful physicality survives across menus, board, cards, rewards, and results.

What Tavern Bash should learn: give actions physical cause and effect, bind the hero to the HUD, and treat phase changes as scene direction. Do not copy card silhouettes, tavern architecture, hero frames, board geometry, or signature sound vocabulary.

### Teamfight Tactics

Official references: [TFT Interface Update](https://teamfighttactics.leagueoflegends.com/en-gb/news/game-updates/tft-interface-update/) and [Teamfight Tactics Mobile Update](https://teamfighttactics.leagueoflegends.com/en-gb/news/riot-games/teamfight-tactics-mobile-update/)

- **Hierarchy in less than one second:** the battlefield remains dominant; economy, stage, bench, shop, and player health occupy stable zones.
- **Player identity:** the Tactician, arena, and cosmetic expression place the player in the scene without displacing the strategy.
- **Ordinary reward:** shop refresh, purchase, placement, item combination, and round resolution have fast, consistent feedback.
- **Play space versus controls:** mobile uses purpose-built inventory and a shop that can open and close so it does not permanently compromise the battlefield. Riot explicitly described this as a mobile-specific clarity decision.
- **Depth, scale, light, motion, sound:** units and attacks live in the world, while HUD elements stay restrained.
- **Dense information:** state is spatially stable and category-specific. The player learns where to look.
- **Visual center:** combat is centered on the board; planning is centered on shop plus board, never on an all-purpose modal.
- **Transitions:** round start, carousel, combat, overtime, and result have clear timing and camera emphasis.
- **Rarity, danger, reward, progression:** star level, item composition, trait thresholds, opponent strength, and round stakes use distinct channels.
- **Brand continuity:** arena, units, effects, HUD, and menus share color and shape logic even when layout changes between mobile and desktop.

What Tavern Bash should learn: preserve the play space, keep state in stable zones, and author phone-specific disclosure. Do not copy hex boards, shop construction, trait panels, stage trackers, Little Legend framing, or esports HUD conventions.

### The Bazaar

Official reference: [The Bazaar game overview](https://playthebazaar.com/game)

- **Hierarchy in less than one second:** hero, board of items, current opponent, and action timing are the product's visual premise.
- **Player identity:** the game presents itself as a hero-builder. Hero character and wares share the same presentation universe.
- **Ordinary reward:** an item is a large collectible object, so acquisition and improvement feel valuable before extra effects are added.
- **Play space versus controls:** items occupy a dedicated board, with surrounding information supporting rather than replacing it.
- **Depth, scale, light, motion, sound:** large illustrations, pronounced cooldown and activation feedback, and strong combat focus turn asynchronous systems into spectacle.
- **Dense information:** each item has an illustration, readable timing, clear state, and inspectable detail. Density is absorbed by stable repeated anatomy.
- **Visual center:** the board and hero relationship stays primary.
- **Transitions:** encounters and rewards are treated as new scenes rather than text swaps.
- **Rarity, danger, reward, progression:** item scale and polish, hero framing, opponent staging, and collectible presentation communicate value.
- **Brand continuity:** character art, item art, board, and reward surfaces reinforce the hero-builder premise.

What Tavern Bash should learn: make its painted merchants and wares the main event, not content inside generic cards. Tavern Bash must remain a nocturnal route-based merchant myth with Resolve, district travel, and tactile bazaar materials. It must not copy The Bazaar's board geometry, item frames, hero layouts, timing UI, naming, or signature visual motifs.

### Tavern Bash gap summary

Tavern Bash currently supplies more text labels and borders where these references use stable spatial zones, scale, authored light, object motion, and character presence. Its strategic density is not inherently the problem. The problem is that density is compressed into uniformly framed UI rather than organized into a stage.

## 5. Screen-by-screen redlines

### Global measurement rules for all screens

- Phone content width: viewport minus 16 to 20 px side insets, plus `env(safe-area-inset-left)` and `env(safe-area-inset-right)`.
- Primary action height: 52 to 60 px. Secondary action: at least 48 px. Absolute touch minimum: 44 by 44 px with 8 px separation where actions are adjacent.
- Phone display type: 34 to 42 px. Screen title: 26 to 32 px. Section title: 18 to 22 px. Body: 15 to 17 px. Strategic rules: 13 to 15 px. Microcopy: 11 to 12 px only when nonessential.
- Overlay limit: 86dvh maximum including safe areas. Overlay header and primary action remain fixed; only the content body scrolls. Never nest horizontal scrolling inside a primary vertical screen.
- Persistent phone HUD: 64 to 88 px tall depending on state, with hero identity attached. It may collapse during combat but never disappears without an equivalent identity anchor.
- Desktop play frame: use 1180 to 1280 px of the 1440 px viewport, not a phone-scale strip centered over empty art. Preserve one main stage and one contextual rail.

### 5.1 Title screen

Inspection: live at 390 by 844; source and assets reviewed for portrait and wide variants.

- **What works:** strongest screen in the product. Full-bleed painting, clear title, central creature, two large actions, and immediate setting.
- **Unfinished read:** Run History is a small web-style button detached from the painted plaque system. The bottom unlock hint becomes a translucent text box. The title painting has a stronger finish than every following surface, creating an expectation cliff.
- **Focal point and hierarchy:** title and dragon first; New Game second; Tutorial third; return or history affordance last.
- **Remove or demote:** reduce the persistent hint to a small sealed-ledger cue. Do not place paragraph copy over the final art unless it is a deliberate parchment strip.
- **Layout and components:** keep the two 58 to 64 px stone actions. Move History into a 48 px circular or ledger-shaped secondary control with a consistent material. Add a short hero or lantern transition after New Game so the next screen inherits the scene.
- **New art and motion:** one title-to-stall smoke or curtain transition mask; optional animated lantern and smoke layers. No new title painting is required unless real-phone crops fail.
- **Phone:** buttons sit 12 to 20 px above the bottom safe area. The painted nameplate must remain fully visible on the named primary phone.
- **Desktop:** use `bg_intro_wide.png` without aggressive cover crop. Keep controls aligned to the painted composition, not merely centered.
- **Acceptance check:** an independent reviewer identifies title, primary action, and secondary action in one second; no overlaid copy crosses a character face or the title plaque at any target viewport.

### 5.2 Hero selection

Inspection: live at 390 by 844.

- **What works:** painted portraits are appealing, the selected hero has a larger crop, and the rule and starting ware are present.
- **Unfinished read:** the eight portrait chips form a generic thumbnail grid. Locked heroes become dark squares. The selected portrait is only about 96 px and competes with a dense text block. The modal sits in empty darkness instead of becoming a merchant introduction.
- **Focal point and hierarchy:** selected hero portrait first; name and trade identity second; signature rule third; locked roster and confirm last.
- **Remove or demote:** show three or four roster choices at once in a horizontal rail. Move long rule copy behind `How this merchant plays` if it exceeds four lines.
- **Layout and components:** selected portrait 132 to 160 px on phone, cropped shoulders-up with a material nameplate. Roster chips 56 px minimum. Confirm 56 px high. Use a signature-ware strip with one 40 px icon and one sentence.
- **New art and motion:** hero-specific portrait backing or textile color wash; selection uses a 180 to 240 ms light handoff and slight 1.02 scale, not a generic outline.
- **Phone:** horizontal snap rail with no more than 70 percent width occupied by unselected portraits. Locked heroes remain readable silhouettes with a visible seal and trigger hint.
- **Desktop:** selected hero and rule occupy the left two-thirds; roster becomes a right rail. Do not simply widen the modal.
- **Acceptance check:** name, favored trade, and starting ware are readable at arm's length; no strategic copy is below 13 px; the selected hero occupies at least 18 percent of the phone's visible area.

### 5.3 Omen and route reveal

Inspection: live at 390 by 844.

- **What works:** the reveal has a distinct title, Omen illustration, concise rule, featured wares, route length, and a clear entry action.
- **Unfinished read:** it is another centered gold frame. The Omen icon is small and the rule arrives as paragraph copy. Route length, featured wares, and Omen importance have similar visual weight.
- **Focal point and hierarchy:** Omen name and visual first; one-sentence rules consequence second; featured ware pair third; route length and entry action fourth.
- **Remove or demote:** remove repeated framing around the entire modal. Keep route length as a small journey strip.
- **Layout and components:** 104 to 128 px Omen illustration or emblem, 30 to 36 px title, one highlighted rules line, two 48 px featured-ware medallions, 56 px CTA. If Lantern modifies the Omen, show the effective value inline, not as a footnote.
- **New art and motion:** reusable Omen reveal halo, smoke mask, and category color refraction. Omen card enters in 420 to 520 ms, then rule text settles within 160 ms.
- **Phone:** one screen, no scroll at 390 by 844. Long rules collapse to a tap-for-detail plaque.
- **Desktop:** place hero on one side and Omen on the other, with the route destination between them.
- **Acceptance check:** after a one-second exposure, five of five reviewers can state the Omen's name and whether it changes speed, economy, or combat.

### 5.4 Route map and district presentation

Inspection: live at 390 by 844; source reviewed at all breakpoints.

- **What works:** district art is atmospheric, reachable and future paths differ, node types have art, and the player can scout before committing.
- **Unfinished read:** the map is a desktop graph compressed onto a phone. Portrait mode shrinks visible medallions to 34 px and labels to 8 px. Paths cross dark painting with weak separation. The bottom half can become unused darkness. The selected preview becomes another brown panel with its own scrollbar.
- **Focal point and hierarchy:** current position and reachable next choices first; district identity and boss destination second; completed and future network third.
- **Remove or demote:** do not show every future node at full label detail. Hide two or more future rows in haze or a compact preview.
- **Layout and components:** phone shows current node plus the next three to five choices, each with a 48 to 56 px visible medallion and 12 to 14 px label. A selected node opens a bottom drawer capped at 42dvh. Boss remains a large distant anchor. Use a camera or chapter shift as the player advances rather than retaining the whole district graph at once.
- **New art and motion:** portrait district compositions, a reusable brass path rail, fog and light masks, district entrance plates, boss gate silhouette, and node-state halos. Entering a district takes 650 to 900 ms and may be skipped after 250 ms.
- **Phone:** no label below 12 px. No internal horizontal scroll. Reachable choices must fit above the drawer.
- **Desktop:** show the full network in a wide vista, with a 280 to 320 px scout rail. Use available width to separate paths rather than enlarging empty background.
- **Acceptance check:** from a static screenshot, reviewers identify current position, all reachable choices, and district boss in one second; no path line crosses a label; every visible target and label survives 200 percent zoom without overlap.

### 5.5 Market

Inspection: live at all three required viewports.

- **What works:** four offers are compareable, prices and effects exist, controls are reachable, board remains visible, and painted item art is consistently present.
- **Unfinished read:** this is the clearest prototype screen. Every ware has a full ornate frame, repeated dense copy, tiny 9 px descriptions, and equal weight. The phone capture exposed a browser-style horizontal scrollbar. On desktop, the entire game occupies a narrow centered strip while most of the painted market is unused. On landscape, cards and copy shrink to fit a shallow band.
- **Focal point and hierarchy:** current offers first; affordable and synergy-relevant state second; selected ware detail and purchase third; tier, reroll, freeze, board, and departure after that.
- **Remove or demote:** remove full rules paragraphs from every unselected card. Remove equal-weight rarity frames from common wares. Hide ownership and fusion detail until relevant.
- **Layout and components:** phone uses a 2 by 2 shelf of 148 to 170 px cards with illustration, name, price, primary effect, cooldown, and one state badge. Tapping opens a stable detail drawer with full rules and Buy. Put Tier, Reroll, and Freeze in a 52 px control rail. Board remains a tactile bottom tray. No exposed scrollbar.
- **New art and motion:** market shelf 9-slice, hanging offer card or tray frame, purchase detail drawer, control rail, affordability light, sold slot treatment, and freeze frost mask. Purchase uses a 280 to 360 ms object flight and a synchronized coin sound. Reroll turns or shutters the whole shelf in 320 to 420 ms.
- **Phone:** keep the departure action visible but subordinate until the player has inspected the market. Board tray may collapse to 96 to 132 px and expand on tap.
- **Desktop:** use an 1180 to 1280 px stage with hero rail, four or five larger offers, board tray, and detail rail. Do not preserve phone card dimensions.
- **Acceptance check:** no scrollbar chrome is visible; unselected card rules are at least 13 px; the player can identify price, effect family, cooldown, owned count, and fusion opportunity for all offers in two seconds.

### 5.6 Board and Vault management

Inspection: board live; Vault source and layout-test reviewed.

- **What works:** ten-slot board truth is spatial, size is represented, the next empty slot glows, and Vault has dedicated management actions.
- **Unfinished read:** empty slots are black holes with faint dashed marks. A ware becomes a tiny icon with overlaid numbers. Board and Vault feel like grids from a tool rather than merchant storage. The Vault is a sheet variation, not a distinct place.
- **Focal point and hierarchy:** selected ware and destination first; available capacity second; swap, sell, and return actions third.
- **Remove or demote:** hide empty locked cells beyond current capacity behind a single shuttered section. Do not show every slot border at full contrast.
- **Layout and components:** visible board slots 48 to 58 px on phone, with one continuous wood or textile tray. Multi-slot wares occupy a visibly wider object. Vault opens as a lower drawer with three 64 px shelf positions and a clearly separated action row. Drag is optional; tap-select plus destination remains required.
- **New art and motion:** board tray, Vault drawer, locked shelf shutter, selected-ware lift shadow, swap path, sell coin chute. Move animation 240 to 320 ms and never delays the state commit.
- **Phone:** selected detail replaces nonessential market copy. Board and Vault cannot both require vertical page scrolling.
- **Desktop:** board remains bottom center; Vault can open as a side cabinet without covering market offers.
- **Acceptance check:** a new player identifies occupied capacity and the selected move destination without reading instructions; all actions remain usable one-handed; swap never moves the primary action under the home indicator.

### 5.7 Monster scout and door selection

Inspection: live route scout; older door assets and scout source reviewed.

- **What works:** foe art, health, threat, bounty, district rule, board list, challenge, and slip choice are present. Scout-before-commit is strategically strong.
- **Unfinished read:** the phone stacks the full map over a second scrollable brown panel. The foe portrait is a small medallion, board lines resemble form rows, and Challenge and Slip Past share similar construction. Danger is expressed mostly by words and red borders.
- **Focal point and hierarchy:** foe portrait and threat first; special rule and bounty second; expected board third; Challenge versus Slip consequence fourth.
- **Remove or demote:** replace repeated ware text rows with a visual mini-board plus tap detail. Demote flavor and secondary tags.
- **Layout and components:** bottom drawer with 88 to 112 px foe bust, large health and threat, one 14 px special-rule line, 5 to 10 mini ware slots, bounty object, and separated challenge and slip actions. Challenge uses danger material; Slip explicitly shows Resolve loss adjacent to the action.
- **New art and motion:** foe portrait backplates by band, danger crest, bounty tray, door threshold foreground, door-open smoke and light.
- **Phone:** drawer max 42dvh; actions pinned above safe area. Map remains visible enough to preserve route context.
- **Desktop:** scout is a fixed 300 px side rail while the route stays interactive.
- **Acceptance check:** one-second read identifies foe, threat, special rule, bounty, and primary consequence; no scroll is needed to reach Challenge or Slip.

### 5.8 Combat opening

Inspection: live at 390 by 844.

- **What works:** `Dusk Falls` clearly declares the phase and foe. Background changes and music switches.
- **Unfinished read:** the title overlays an already rendered combat dashboard. The board and health bars are visible dimly behind it, so the transition is a text curtain rather than an entrance. The simulation is held for 1.5 seconds even though the visual does not use the time to introduce source, enemy, or stakes.
- **Focal point and hierarchy:** enemy entrance first; player versus enemy identity second; storm or boss rule third; combat board reveal last.
- **Remove or demote:** do not show the fully built combat UI under the title card. Avoid a 2.25-second fixed overlay for routine fights.
- **Layout and components:** 500 to 700 ms routine opening, 900 to 1,300 ms boss opening. Reveal enemy portrait, then health, then ware rows. Allow tap to skip after 250 ms. Begin cooldowns only when the board is visible.
- **New art and motion:** reusable smoke shutter, enemy band crest, versus light sweep, optional boss gate layer.
- **Phone:** hero and enemy faces must both be readable before the first activation.
- **Desktop:** use horizontal separation and a wider central action lane, not a stretched phone stack.
- **Acceptance check:** opening establishes foe, relative danger, and player identity before action starts; routine opening never delays control or inspection by more than 700 ms.

### 5.9 Active combat

Inspection: live at 390 by 844 through storm and ware destruction.

- **What works:** both health pools, ten slots, cooldown rings, status totals, storm time, speed toggle, destruction state, numbers, and a log exist. Combat can be inspected and paused.
- **Unfinished read:** enemy and hero portraits are tiny; empty slots dominate; the center is an unstructured divider; action traces are brief; the large lower log region can be mostly empty; health bars and slot frames carry more visual weight than attacks.
- **Focal point and hierarchy:** current activating ware and target first; both health pools second; urgent statuses and storm third; other cooldowns fourth; log only on demand.
- **Remove or demote:** remove the permanently open log from the main phone composition. Collapse empty slots. Hide zero-value status counters.
- **Layout and components:** use a 120 to 180 px central action lane. Source ware lifts 4 to 8 px and brightens for 120 to 180 ms; travel takes 100 to 220 ms; target recoils 4 to 10 px for 120 ms; number holds 380 to 650 ms; health settles after impact. Destruction leaves a readable broken silhouette for 500 to 800 ms. Magnitude tiers: minor, strong, lethal or phase-changing.
- **New art and motion:** hero and monster combat crops, activation arcs by effect family, impact decals, status residue, break masks, boss escalation overlays, and reduced-motion static equivalents.
- **Phone:** portraits 72 to 96 px, rows 56 to 72 px, action lane centered. Tap a ware to inspect without losing the action history.
- **Desktop:** wider lane permits directional travel and larger portraits; do not fill width with empty slots.
- **Acceptance check:** observers can name source, target, result, and remaining health from a 0.8-second recording segment; health changes never precede visible impact; no critical number is below 13 px.

### 5.10 Victory and defeat recap

Inspection: both live at 390 by 844.

- **What works:** result, damage dealt, damage taken, destroyed ware, and continue action are concise. Victory and defeat use different color and sound direction.
- **Unfinished read:** both outcomes are the same framed modal with swapped heading. No hero reaction, enemy aftermath, reward anticipation, or route consequence appears. The strongest emotional beat is a spreadsheet summary.
- **Focal point and hierarchy:** result and hero or foe reaction first; route consequence or reward second; performance detail third; continue last.
- **Remove or demote:** move detailed damage breakdown behind `Fight details`. Do not lead with four small damage chips.
- **Layout and components:** use a full-width result band with 120 to 180 px character art, a one-line consequence, and a reward silhouette if applicable. Continue 56 px. Defeat shows Resolve loss before the action. Victory shows bounty anticipation before returning to route.
- **New art and motion:** victory and defeat light states, hero reaction crops, foe defeat mask, reward pedestal, Resolve-loss animation. Victory 900 to 1,400 ms, defeat 700 to 1,100 ms, both skippable after result readability.
- **Phone:** result and consequence fit without scrolling. Details open separately.
- **Desktop:** use a wide tableau rather than a narrow centered phone card.
- **Acceptance check:** a screenshot alone communicates win or loss, route consequence, and whether a reward is pending; continue is reachable with one thumb.

### 5.11 Merchant decision

Inspection: live at 390 by 844.

- **What works:** persona name, decision title, three outcomes, and short consequences are clear. The choice is exact-once durable in source.
- **Unfinished read:** Tariq is text only. Three generic rectangles occupy a two-column grid with an accidental empty quadrant. All options have equal material and emotional weight.
- **Focal point and hierarchy:** merchant face and proposition first; cost or gain second; three choices third.
- **Remove or demote:** remove the empty grid cell. Do not make `Walk Away` visually equivalent to a paid bargain.
- **Layout and components:** 104 to 132 px merchant portrait, one speech line, then three full-width 52 to 64 px bargain plaques with cost or gain in a fixed numeric column. Walk Away is a low-emphasis textile action.
- **New art and motion:** persona portrait crop or bust, trade counter, coin or ware handoff, seal stamp on selection.
- **Phone:** choices stack vertically; no more than four lines of copy per choice.
- **Desktop:** merchant occupies one side of a counter and choices the other.
- **Acceptance check:** cost, benefit, and safe exit are distinguishable without opening detail; a paid option cannot be mistaken for a gain.

### 5.12 Treasure decision

Inspection: source and layout-test reviewed, not reached in the live seeded path.

- **What works:** three face-up deterministic rewards and exact destination language support meaningful choice.
- **Unfinished read:** shared `.card`, `.picks`, and `.pick` structures make Treasure resemble any modal selection. Value is carried by text and a small icon.
- **Focal point and hierarchy:** treasure reveal first; three reward objects second; destination or use constraint third.
- **Remove or demote:** do not show full descriptions before the reveal settles. Avoid identical frames for cash, ware, enchant, and gild.
- **Layout and components:** reveal one closed chest or wrapped bundle, open into three 96 to 128 px objects, then expose concise detail. Selected object rises to a 160 px hero object before confirm.
- **New art and motion:** reusable treasure cloth, chest or parcel silhouette, gold, ware, enchant, and gild reveal families, selection pedestal.
- **Phone:** horizontal three-choice carousel is allowed only if all three names and values remain visible. Prefer three stacked or fan-spread objects with a pinned confirm.
- **Desktop:** three rewards occupy a centered stage with the district visible behind them.
- **Acceptance check:** players rank all three rewards by type and value in two seconds; the chosen reward's destination is visible before confirmation.

### 5.13 Rest decision

Inspection: source reviewed, not reached live.

- **What works:** Mend, Temper, and Refit are concise, state-aware route choices.
- **Unfinished read:** without a distinct sanctuary scene they are three more brown buttons.
- **Focal point and hierarchy:** current wound or board need first; three interventions second; predicted result third.
- **Remove or demote:** do not repeat generic explanatory prose. Show before and after numbers.
- **Layout and components:** cool stone or textile shelter, visible Resolve vessel, three 56 px actions with preview values. Temper and Refit show eligible ware count before selection.
- **New art and motion:** rest alcove foreground, brazier or tea steam, Resolve refill liquid or lamp animation, repair sparks.
- **Phone:** no nested target picker until an action requiring a ware is chosen.
- **Desktop:** preserve the route behind a side shelter rather than full-screen modal isolation.
- **Acceptance check:** every option states its affected resource and exact delta before tap; no unavailable option appears enabled.

### 5.14 Shrine decision

Inspection: source reviewed, not reached live.

- **What works:** named Quqnus Shrine choices and explicit prices can create a strong mythic beat.
- **Unfinished read:** shared choice-card construction underplays sacrifice and transformation.
- **Focal point and hierarchy:** shrine image and demanded price first; selected transformation second; alternatives third.
- **Remove or demote:** avoid generic gold framing. Reduce explanatory text once the price is visualized.
- **Layout and components:** vertical shrine composition with a central flame or bird emblem, three offering trays, and a before and after preview. Destructive choice requires a second confirm tied to the object being lost.
- **New art and motion:** shrine foreground, smoke mask, offering bowl, ash or feather particles, sacrifice seal, safe reduced-motion cut.
- **Phone:** keep the sacrificed ware and resulting benefit on the same screen. Confirm remains above safe area.
- **Desktop:** use a taller central shrine with choices around its base.
- **Acceptance check:** no player can confirm a sacrifice without seeing the exact lost object and gained effect in the same view.

### 5.15 Gate Camp

Inspection: source and CSS reviewed, not reached live.

- **What works:** camp has a boss inspect strip, Quartermaster offers, durable stock, and a distinct retry purpose.
- **Unfinished read:** it reuses draft and market construction, so the pre-boss emergency state risks looking like another shop.
- **Focal point and hierarchy:** blocking boss and remaining Resolve first; emergency preparation second; retry action third.
- **Remove or demote:** hide routine market chrome that does not apply. Do not let optional purchases compete with Retry.
- **Layout and components:** boss gate occupies the upper third; camp offers sit on a narrow quartermaster bench; retry is a 56 to 64 px gate action. Emergency resource and usage limit remain attached to the action.
- **New art and motion:** boss gate foreground, quartermaster counter, last-lantern state, retry gate opening, escalation pulse.
- **Phone:** one boss summary, no full scout scroll. Camp offers max three visible objects.
- **Desktop:** gate and camp can coexist horizontally, with boss art at scale.
- **Acceptance check:** first glance communicates `blocked by boss`, `what can still change`, and `how to retry`; Retry is never below the fold.

### 5.16 Almanac and unlock presentation

Inspection: source and layout-test reviewed, not reached live.

- **What works:** discovered and sealed states, trigger hints, category tabs, end-screen unlock strip, and persistent local progression are structurally complete.
- **Unfinished read:** History and Almanac share a utility panel. Discovery tiles and tabs resemble an admin collection grid. Unlocks are rows in the result card rather than a genuine reveal.
- **Focal point and hierarchy:** newly unlocked object first; category collection second; trigger progress third.
- **Remove or demote:** move Cloud and run export away from the visual collection center. Avoid showing large walls of identical sealed squares.
- **Layout and components:** Almanac becomes a ledger or collector's cabinet. Use 96 to 128 px feature tiles, 52 px category tabs, and progressive chapter sections. Unlock reveal isolates one object at 160 to 220 px before filing it into the collection.
- **New art and motion:** ledger spread, category seals, discovered shelf, sealed vellum, reveal light, stamp or ink filing motion.
- **Phone:** one category per screen, two-column tiles at 144 to 168 px. Detail opens as a full-height sheet with a fixed close.
- **Desktop:** use a wide ledger spread or cabinet with persistent category navigation.
- **Acceptance check:** an independent reviewer distinguishes found, seen, sealed, and newly unlocked without reading a legend; unlock reveal is visually stronger than routine reward pickup.

### 5.17 Run report and end screen

Inspection: source and layout-test reviewed, not reached live.

- **What works:** result, run facts, debrief, export, history, unlocks, and local or Cloud Ledger handoff are comprehensive.
- **Unfinished read:** the end screen is overloaded with report utility. Small buttons, tiny debrief controls, text areas, Cloud prompt, and unlock rows compete with completion. A successful route can end as a form.
- **Focal point and hierarchy:** route completion tableau first; hero, road, Lantern, and defining build second; unlocks and score third; debrief and export last.
- **Remove or demote:** collapse report text, Cloud prompt, and detailed debrief behind secondary actions. Never show a text area in the initial completion view.
- **Layout and components:** first page is a shareable result card with 160 px hero, district path, three defining wares, result, duration, and unlocks. `Details`, `Copy Report`, `History`, and `New Road` follow in a stable action row.
- **New art and motion:** route-completion panorama, lantern progression rail, merchant seal, share-card mask, win and loss variants.
- **Phone:** initial result fits one viewport. Details may scroll in a separate sheet.
- **Desktop:** use a wider route chronicle with board summary, not a narrow modal.
- **Acceptance check:** Robbie can take one named screenshot that proudly communicates the completed run without opening any details; export utility is no more than one tap away.

### 5.18 Tutorial and help surfaces

Inspection: source reviewed; tutorial was not restarted during the active live route.

- **What works:** tutorial uses real interaction, is skippable, tracks progress, and highlights live elements. Help copy exists at title.
- **Unfinished read:** the coach is a fixed brown rectangle at the top of the screen. It can cover the hero or current focus and visually belongs to the generic panel system. Help is a web `<details>` disclosure.
- **Focal point and hierarchy:** the actual game object being taught first; one instruction and one success condition second; Skip last.
- **Remove or demote:** remove long coach paragraphs and permanent chrome. Do not teach through detached narration when an object can demonstrate the action.
- **Layout and components:** 60 to 100 word maximum per tutorial step is still too high. Use one sentence under 18 words, a pointer or spotlight, and a `Try it` state. Coach moves to avoid the target. Help becomes a searchable rules ledger after the route-native tutorial is complete.
- **New art and motion:** tutorial hand or lantern pointer, spotlight mask, success stamp, rules ledger material.
- **Phone:** coach max 28 percent of viewport and never overlaps the active target or primary action. It respects all safe areas.
- **Desktop:** coach attaches to the taught object with a short leader line.
- **Acceptance check:** every step can be completed without reading more than one short sentence; coach and target bounding boxes never overlap; reduced motion uses static spotlight and state change.

## 6. Design system

### 6.1 Type system

The current two-family approach can survive if it is disciplined and self-hosted.

| Role | Family | Phone size and line height | Desktop size and line height | Rules |
|---|---|---:|---:|---|
| Brand display | Rakkas, with a commissioned alternate tested later | 34 to 42 / 0.95 | 48 to 64 / 0.95 | Title, district entry, result, boss, major reward only. Never rules copy. |
| Screen heading | Rakkas | 26 to 32 / 1.0 | 32 to 40 / 1.0 | One per screen. Keep to two lines maximum. |
| Section heading | Rakkas or Hanken Grotesk 800 | 18 to 22 / 1.1 | 20 to 26 / 1.1 | Rakkas for places, Hanken for functional labels. |
| Body | Hanken Grotesk 500 or 600 | 15 to 17 / 1.4 to 1.5 | 15 to 18 / 1.45 | Default readable prose. |
| Strategic rules | Hanken Grotesk 600 | 13 to 15 / 1.35 | 14 to 16 / 1.4 | Never clamp essential rules without a visible detail affordance. |
| Numeric primary | Hanken Grotesk 800 with tabular numerals | 18 to 26 / 1.0 | 20 to 30 / 1.0 | Resolve, Gold, health, price, damage. |
| Numeric secondary | Hanken Grotesk 700 with tabular numerals | 13 to 16 / 1.1 | 14 to 18 / 1.1 | Cooldown, owned count, capacity. |
| Microcopy | Hanken Grotesk 700 | 11 to 12 / 1.25 | 11 to 13 / 1.25 | Nonessential labels only. Never 7 to 10 px primary state. |

Production requirements:

- Self-host the required WOFF2 files and include them in the complete offline install. External Google Fonts cannot be a production dependency for an offline-capable packaged game.
- Use uppercase tracking only for short labels under 14 characters. Current wide tracking on tiny text reduces legibility.
- Cap line length at 34 to 42 characters on phone overlays and 52 to 66 on desktop detail panels.
- Test Rakkas at every required accented or localized character before committing it to native release art.

### 6.2 Color and lighting roles

Current brass, ember, verdigris, poison, rose, steel, and warm ink hues are a viable base. They need semantic roles and value separation.

| Role | Direction | Contrast and use rule |
|---|---|---|
| Night ground | Near-black indigo brown, around `#100d12` to `#17131b` | Background only. Avoid warm brown everywhere. |
| Stall wood | `#24180f` to `#4a2e18` with warm grain | Structural market and board surfaces. Text never sits directly on busy grain without a quiet inset. |
| Aged brass | `#8a5a2b` base, `#d8a24a` lit, `#f4cf7c` highlight | Structural edge and selection. Do not outline every object in bright brass. |
| Textile indigo | `#171b35` to `#2a3158` | Secondary surface, route depth, market backing, selected hero identity. |
| Parchment | `#d8c7a8` to `#f0e6d6` | Rules, ledger, and record surfaces. Use dark ink above 4.5 to 1. |
| Verdigris | `#35a596` | Resolve, shield, safe confirmation. Never the only signal. |
| Ember | `#e0863a` and `#c8402e` | Burn, danger, impact, boss escalation. Reserve saturated red-orange for consequence. |
| Poison | `#9dbb45` | Poison only. Pair with skull or droplet shape. |
| Frost | `#9ad8ef` | Freeze and cooldown interruption. Pair with crystalline mask. |
| Healing rose | `#e08a8f` | Healing only. Do not reuse for ordinary rarity. |
| Locked | Desaturated indigo-gray plus wax seal | Preserve subject silhouette and readable title. Never use opacity alone. |

Contrast rules:

- Body and strategic copy: minimum 4.5 to 1 against its actual composite background.
- Large display and primary numerics: minimum 3 to 1.
- Interactive boundaries: minimum 3 to 1 against adjacent material.
- Status never relies on hue alone. Pair color with shape, short label, animation pattern, and sound where appropriate.
- A grayscale capture must retain the order: current action, primary health or reward, identity, supporting state, background.

### 6.3 Material language

| Material | Meaning | Construction recipe | Do not use for |
|---|---|---|---|
| Brass | importance, mechanism, trade value, selection | Dark base, 1 to 2 px lit upper edge, narrow warm highlight, tarnished corners, cast shadow | Every border, every common card, long text backgrounds |
| Wood | stall, board, market, ordinary trade | Directional grain, carved recess, dark slot shadow, brass fasteners at structural joins | Shrine, magical reward, health bars |
| Stone | threshold, shrine, title, permanence | Chipped silhouette, cool face, warm grazing edge, shallow engraved marks | Routine market controls |
| Textile | identity, district, secondary backing | Indigo or category-dyed cloth, woven noise, folded edge, restrained tassel attachment | Critical numeric state without an inset |
| Glass | status, magic, rare resource | Dark colored fill, one reflected edge, inner glow limited to the active state | Large body-copy panels |
| Parchment | rules, ledger, report, discovery | Warm quiet field, ink, fold or stitched edge, seal or tab | Combat action lane |
| Smoke | transition, danger, depth separation | Alpha mask and slow parallax, never a flat gray overlay | Permanent text backdrop |
| Magical light | current action, rarity peak, Omen | Local light source with falloff and color spill onto nearby material | Constant ambient glow on every object |

### 6.4 Panel and overlay construction

Use four panel primitives only:

1. **Stage frame:** full-screen structural edge for route, market, combat, and major reward. It defines the scene, not a floating box.
2. **Context drawer:** bottom or side surface for scout, ware detail, Vault, and help. Phone cap 42dvh for routine context and 72dvh for deep detail.
3. **Decision tray:** semantic choice surface for Merchant, Treasure, Rest, and Shrine. Choices share anatomy but change material, light, and object staging by event.
4. **Ledger sheet:** history, Almanac, run report, rules, and Cloud Ledger. Functional, readable, and intentionally quieter than play.

Construction rules:

- Outer corner radius: 14 to 20 px for drawers and trays, 8 to 14 px for internal controls. Avoid applying the same 14 px radius to everything.
- Keyline: 1 px dark separator plus at most one 1 px lit edge. Large bright outlines indicate selection only.
- Shadow: one near shadow for attachment and one soft scene shadow. Avoid stacking glow and shadow on every object.
- Inner depth: 1 to 3 px inset shadow with a top-edge highlight. Slot recesses may use 6 to 10 px depth.
- Default content padding: 16 px phone, 20 to 24 px desktop. Dense card internal spacing: 10 to 12 px.
- Overlay backdrop: 55 to 72 percent darkening, with 4 to 10 px blur only when performance budget permits. Preserve enough scene to maintain context.
- Only the drawer body scrolls. Scrollbars are visually themed on desktop and hidden behind direct touch scrolling on phone. A visible native horizontal scrollbar is a failed build.

### 6.5 Button hierarchy

| Tier | Use | Phone geometry | Treatment |
|---|---|---|---|
| Primary | Confirm route, buy, challenge, take reward, retry, continue | 52 to 60 px high, full or near-full width | Lit brass or semantic material, strongest label, one icon maximum |
| Dangerous primary | Sacrifice, boss challenge, destructive sell | 52 to 60 px | Ember or iron construction, explicit cost, optional hold only for irreversible choices |
| Secondary | Reroll, freeze, Vault, details | 48 to 52 px | Dark material with lit edge, clear icon and label |
| Tertiary | Back, close, walk away, skip | 44 to 48 px | Textile or unfilled brass tab, never visually equal to primary |
| Icon-only | Sound, close, compact inspect | 44 to 48 px square | Tooltip or accessible name required, strong hit target, 20 to 24 px icon |

Buttons use pressed depth of 1 to 2 px, light reduction, and a 70 to 110 ms response. No routine button waits for animation before committing game state.

### 6.6 Card and ware hierarchy

Unselected market ware anatomy:

1. 72 to 88 px illustration port.
2. 15 to 17 px name.
3. 18 to 22 px price.
4. One 13 to 15 px primary effect line or numeric chip.
5. 12 to 14 px cooldown or passive label.
6. At most one state badge: owned, fusion-ready, free, frozen, or signature.

Full rules, size explanation, enchant detail, and flavor move into the selected detail drawer. Common ware frames remain restrained. Silver, Gold, and Diamond add material, silhouette, and motion in increasing tiers. They do not merely replace a border image.

### 6.7 Tabs, navigation, chips, and counters

- Tabs: 48 px minimum height, 14 to 16 px labels, selected state changes material depth and position, not only color.
- Status chips: 28 to 36 px high, icon plus short value. Hide zero-value chips in combat.
- Resource counters: stable anatomy with 20 to 24 px icon and 18 to 26 px tabular number. Labels may be 11 to 12 px.
- Route pips: at least 10 px visible with 6 px gap. They supplement, never replace, a district name or progress statement.
- Capacity: show filled and total through both slot geometry and text, such as `4 of 7`.

### 6.8 Rarity, locked, and discovered states

| State | Silhouette | Material | Light and motion | Text treatment |
|---|---|---|---|---|
| Bronze | Plain, practical | Wood and dark brass | No ambient animation | Full name and rules |
| Silver | Cleaner edge and one inset | Steel with brass fastener | One selection glint only | Full name and rules |
| Gold | Richer corner detail | Lit brass and enamel | Slow restrained highlight, event burst on creation | Gold rarity label on inspect |
| Diamond | Faceted inner edge | Pale metal, glass, spectral enamel | Sparse prismatic response and unique creation peak | Never rainbow body copy |
| Locked | Preserved silhouette plus seal | Desaturated textile or parchment | No pulsing | Trigger hint, not hidden title |
| Seen | Full art with muted frame | Standard material | None | Source or encounter record |
| Discovered | Full art and normal material | Category material | Filing stamp on first discovery | Full details |
| Newly unlocked | Isolated hero object | Highest local light | 700 to 1,200 ms reveal, skippable after recognition | Name, source, one-line use |

### 6.9 Combat feedback language

| Effect | Shape and direction | Color and residue | Number behavior | Sound family |
|---|---|---|---|---|
| Damage | Directional slash, bolt, ram, or impact based on source | Ember-white impact, short scorch or crack | Rises 8 to 16 px, 450 to 650 ms | Transient plus low body scaled by magnitude |
| Healing | Inward breath or liquid lift | Rose and warm white, settles into health | Positive number moves toward health bar | Soft glass and breath, no combat hit transient |
| Poison | Droplet or coil enters target | Acid green stain with ticking rim | Stack number remains near poison status | Wet glass tick, throttled |
| Burn | Ember line and licking edge | Orange residue that visibly decays | Stack change near burn status | Dry ignition and low crackle |
| Frost | Crystalline snap around timer | Cyan desaturation and slowed ring | Duration or freeze mark, not a damage number | Glass snap and damped high end |
| Shield | Outward plate or dome | Verdigris glass edge | Shield value attaches to health layer | Brass plate plus glass ring |
| Haste | Clockwise light sweep | Warm gold trail on cooldown ring | No floating number unless value changes | Short rising mechanism click |
| Destruction | Fracture, collapse, ash | Dark silhouette plus ember fragments | Optional `Destroyed`, never competing with lethal damage | Material-specific break plus low stop |

### 6.10 Illustration integration

- Portraits: crop shoulders-up with eyes in the upper 40 percent. Preserve hands or signature object only when the crop can remain readable.
- Merchant and monster art must cast color and value onto its frame. A warm painted face inside a neutral black circle is not integrated.
- Item art remains isolated with transparent background. Use 72 to 96 px on market cards and 40 to 64 px on board slots.
- Do not place rectangular opaque art into a circular port without an authored crop and matte.
- Backgrounds require quiet text zones, separate foreground and haze layers where motion is planned, and portrait plus landscape compositions when cover cropping would remove the focal subject.

### 6.11 Empty, disabled, loading, and transition states

- Empty board: a continuous tray with one lit next slot and a short prompt. Hide unavailable future slots behind a shutter or darker extension.
- Empty Vault: show shelf depth and one invitation, not three identical black cells.
- Disabled: preserve label contrast, reduce light and depth, add reason on tap. Do not use opacity below 60 percent for essential copy.
- Loading: lantern wick, closing curtain, or turning ledger page. Show progress only when delay exceeds 500 ms.
- Network-independent local state must never present a spinner for core play.
- Transition state always names the destination or consequence within 300 ms.

### 6.12 Reduced motion

- Replace travel with 80 to 140 ms crossfades and immediate source or target highlights.
- Keep anticipation, impact, and resolution as three static visual states even when movement is removed.
- Disable shake, parallax, particle drift, large scale changes, and repeated foil loops.
- Preserve cooldown progress through a static ring or segmented fill.
- Audio remains available independently of motion preference.
- Every motion feature requires a reduced-motion acceptance screenshot or short capture.

### 6.13 Existing tokens and components ruling

**Can survive with discipline:**

- Painted hero, monster, and item assets.
- `--brass`, `--brass-hi`, `--ember`, `--verd`, `--poison`, `--rose`, and `--steel` as seed colors, after contrast validation.
- `--e-out` as the default settle easing.
- Rakkas for display and Hanken Grotesk for body and numerics, after self-hosting and size correction.
- The 9-slice technique, Pixi overlay, WebAudio separation, and local mute or reduced-motion behavior.

**Require redesign:**

- `.card`, `.ware`, `.cell`, `.board`, `.vault`, `.ribbon`, `.btn`, `.pick`, `.scout`, `.rmprev`, `.historycard`, `.coach`, rarity frames, status chips, combat health and action presentation.
- Market, route, combat, reward, progression, and event layouts at both orientations.
- Background crop and layer strategy.

**Retire:**

- Primary or strategic copy below 12 px.
- A bright gold frame around every card and modal.
- Native horizontal scrollbar exposure.
- Repeated late overrides of the same global selector as the main styling method.
- The permanent empty combat log region on phone.
- Generic dark-brown gradient panels as the default material for every context.
- Phone layouts that preserve all desktop information by shrinking it.

## 7. Motion and game-feel system

### Motion tiers

- **Tier A, touch response:** 70 to 140 ms. Press, focus, select, slot target. Never blocks input.
- **Tier B, object action:** 180 to 420 ms. Buy, sell, move, reroll, freeze, ordinary activation. State commits immediately; animation may finish asynchronously.
- **Tier C, consequence:** 450 to 900 ms. Fusion, Gild, district entry, strong hit, ware destruction, reward reveal. May temporarily own focus but is skippable after 250 ms.
- **Tier D, milestone:** 900 to 1,600 ms. Diamond, boss escalation, victory, defeat, unlock, route completion. Skippable after the result is readable and never delays durable settlement.

Default easing:

- Lift or reveal: cubic-bezier 0.16, 1, 0.3, 1.
- Travel: cubic-bezier 0.22, 1, 0.36, 1.
- Impact: fast ease-out with 60 to 90 ms compression and 120 to 180 ms settle.
- Mechanical shutters and rails: cubic-bezier 0.4, 0, 0.2, 1 with one short overshoot only when mass is implied.

| Event | Player meaning and animation purpose | Duration, scale, and easing | Sound relationship | Reduced-motion fallback | Input rule |
|---|---|---|---|---|---|
| Screen entry | Establish location and focal object | 280 to 420 ms, 8 to 16 px settle, reveal easing | Room tone or loop crossfade begins before settle | 120 ms crossfade | Never blocks back or close |
| District entry | Crossing a meaningful threshold | 650 to 900 ms, parallax depth and lantern light sweep | District sting on light peak | Two-step cut: district plate, then map | Skippable after 250 ms |
| Market reveal | Present tonight's choices as objects | 320 to 460 ms, shelf shutter plus 40 ms stagger | Wood or brass mechanism, final soft chime | Instant shelf plus affordability light | Cards tappable by 220 ms |
| Buying | Confirm object ownership and destination | 280 to 360 ms, ware lifts 1.04 and travels to board or queue | Coin at commit, soft land at destination | Source dims, destination flashes | State commits immediately |
| Selling | Confirm loss and value return | 240 to 320 ms, ware falls to coin chute, 0.96 scale | Material drop then coin pair | Ware cuts out, Gold pulses | Undo or next input available immediately if supported |
| Rerolling | Replace the whole offer set | 320 to 420 ms, shelf shutters or rotates as one system | Mechanism sweep, four quiet land ticks maximum | 120 ms crossfade | Button locks only until new offers are committed, target under 250 ms |
| Freezing | Preserve current offers | 240 to 360 ms, frost grows from control to shelf edges | Glass frost snap on completion | Static cyan edge plus snowflake | Never blocks card inspect |
| Fusion | Three copies become one stronger object | 620 to 820 ms, copies arc inward, core compresses, result expands to 1.08 | Existing forge sting aligned to core flash | Copies cut to result with 160 ms light pulse | Settlement occurs first; skip after 250 ms |
| Gilding | Rarity elevation | 700 to 900 ms, frame plates replace in sequence | Rising brass and glass triad | Before and after frame cut | Other navigation available after result appears |
| Diamond creation | Highest crafting milestone | 1,100 to 1,500 ms, controlled prismatic refraction and silhouette reveal | Unique Diamond sting, lower noise floor before peak | Three still states with one white flash under 80 ms | Skippable after 500 ms; never delays save |
| Dragging or moving wares | Clarify source, path, destination, and capacity | 220 to 320 ms, 1.02 lift and direct path | Soft material lift and dock | Destination highlight then immediate cut | All nonconflicting slots remain tappable |
| Merchant bargains | Make exchange and persona response tangible | 420 to 700 ms, seal stamp, coin or ware handoff, portrait reaction | Persona cue plus trade sound | Choice locks, result line appears | Only selected option locks after commit |
| Treasure selection | Turn value into a reveal | 700 to 1,100 ms, wrapped object opens, selected item rises | Cloth, chest, or magic family plus reward sting | Closed and open stills | Skippable after all values are readable |
| Shrine decisions | Communicate price and transformation | 800 to 1,200 ms, offering descends, flame or smoke resolves | Low shrine tone, sacrifice transient, result breath | Before and after cut with confirmation | Destructive confirm remains explicit |
| Combat start | Establish foe, identity, and stakes | 500 to 700 ms routine, 900 to 1,300 ms boss | Music switch begins first, foe sting at reveal | Foe and board cut in two stages | Inspect and speed control available when board appears |
| Weapon activation | Show source wind-up and target intent | 120 to 220 ms wind-up, 100 to 220 ms travel | Source transient starts on release | Source highlight plus target line | Simulation continues; inspect may pause intentionally |
| Damage and status application | Make effect magnitude and family readable | 180 to 650 ms depending on magnitude | Impact sound on exact contact frame | Target flash, number, residue | Never blocks simulation |
| Ware destruction | Explain removal and leave aftermath | 500 to 800 ms, fracture and collapse | Material break plus low stop | Broken silhouette then ash | Empty slot becomes targetable only after engine state permits |
| Boss phase or escalation | Announce a rules or danger change | 900 to 1,400 ms, environment light shift and boss scale change | Music layer or sting aligned to phase title | Static danger plate plus color shift | Skippable after rule is readable |
| Victory | Release tension and preview reward | 900 to 1,400 ms, warm light, foe recedes, reward silhouette | Fanfare on result, reward cue later | Result cut then reward cut | Continue available by 700 ms |
| Defeat | Clarify consequence without punishing delay | 700 to 1,100 ms, light drains, Resolve consequence appears | Lament starts at result, low impact on loss | Result cut and Resolve delta | Continue available by 600 ms |
| Unlocks | Isolate and file a new collectible | 800 to 1,200 ms per first unlock, batch summary after one | Reveal sting, then ledger stamp | Silhouette to art crossfade | Skip files all results instantly |
| Lantern progression | Show permanent challenge advance | 900 to 1,300 ms, next lamp lights and rule appears | Wick, glass ring, low ascending tone | Lamp changes from dark to lit | Rule can be dismissed after 500 ms |
| Route completion | Conclude the journey and create a shareable peak | 1,200 to 1,600 ms, path lights to final gate then hero tableau | Route theme resolves into fanfare | Completed path still then result card | Report actions available by 1,000 ms |

### Sound and visual synchronization rules

- The audible transient lands within 16 ms of the visible impact frame under normal playback.
- Music crossfades may begin 300 to 600 ms before a scene transition, but a stinger does not precede an unknown result.
- Repeated combat ticks use throttling and magnitude grouping so five simultaneous small hits do not become five equal full-volume sounds.
- Buy, sell, reroll, freeze, route selection, district entry, event choice, and reward reveal need distinct cues. Current synthesized hit, tick, destroy, forge, coin, fanfare, win, lose, creak, and storm sounds are a useful prototype layer but do not cover the full interaction vocabulary.
- Hero voice or barks remain subordinate to strategic information and never overlap critical result speech or rule presentation.

## 8. Asset production inventory

### 8.1 Reusable current assets

| Asset group | Current evidence | Ruling | Priority action |
|---|---|---|---|
| Eight rules-based hero portraits | 320 by 320 WebP with alpha | Strongest reusable identity set. Good for 56 to 160 px use. Full-screen combat crops need source-resolution review. | P0 crop tests on named phone |
| Eight rival merchant portraits | 320 by 320 WebP with alpha | Reusable for route reports, history, and opponent identity if art direction remains coherent. | P1 integration plan |
| Monster portraits | 256 by 256 WebP with alpha | Reusable at medallion and scout sizes. Boss-scale use may need larger source renders. | P0 band and crop QA |
| Item and ware art | 256 by 256 WebP with alpha | Reusable at board and market sizes. Maintain isolated-object rule. | P0 contrast and crop QA |
| Title paintings | 853 by 1376 portrait and 1376 by 768 wide opaque PNG | Strong and reusable. Real-phone crop decides whether revisions are needed. | P0 phone approval |
| Market background | 1080 by 768 opaque WebP | Reusable for landscape and desktop with new quiet-zone masks. Not a portrait composition. | Repair and variant work |
| Battle background | 1536 by 864 opaque WebP | Reusable as desktop or landscape base. Needs portrait composition or layered crop. | Repair and variant work |
| Four route backgrounds | 1024 by 768 opaque WebP | Useful district palette and setting source. Need authored portrait and desktop variants. | Repair and variant work |
| Board wood | 1024 square opaque WebP | Reusable texture source, not a complete board component. | P0 derive tray textures |
| Rarity frames | 1024 by 572 WebP with alpha | Technique and painted detail are reusable references. Current aspect and ornament density are not a complete responsive system. | P0 rebuild as modular 9-slice family |
| Route event icons | 384 square WebP with alpha | Reusable if normalized for weight, crop, and material port. | P1 icon QA |
| Door paintings | 512 by 917 opaque PNG | Strong threshold source. Need frame and crop variants, not direct card backgrounds everywhere. | P1 threshold system |
| Music loops and five stingers | Nine MP3 files | Reusable subject to mix, loop, loudness, and rights confirmation. | P0 audio audit |
| Current Pixi particle primitives | Dots, soft flashes, streaks | Reusable engine base. Needs art-directed emitters and deterministic event contracts. | P1 motion pass |

### 8.2 Assets needing repair, recrop, or re-derivation

| Asset | Purpose and screen | Target dimensions | Alpha and layers | Method and variants | Priority |
|---|---|---:|---|---|---|
| Hero combat crops | Larger identity in combat and result | 768 square source, crops at 96, 160, and 256 | Alpha preferred; face, shoulders, signature object separable if possible | Painted source recrop, portrait and landscape framing guides | P0 |
| Boss portrait crops | Scout, combat entrance, Gate Camp, result | 768 square source for bosses, 512 square minimum for elites | Alpha | Painted source recrop or regeneration only when source lacks detail | P0 |
| Market portrait background | Phone market scene with quiet center and lower stall zone | 1170 by 2532 or 1080 by 2340 | Opaque base plus optional foreground lamps and smoke alpha layers | Painted or generated, portrait-specific | P0 |
| Market desktop background | Fill 1440 by 900 stage without dead center | 2880 by 1800 | Opaque base, optional foreground layer | Painted or generated, desktop and landscape may share | P1 |
| Battle portrait background | Phone action lane and portrait anchors | 1170 by 2532 or 1080 by 2340 | Opaque base plus foreground smoke and impact mask | Painted or generated, portrait-specific | P0 |
| Route district portrait variants | Phone route composition and boss destination | 1170 by 2532 each district | Opaque base plus fog and foreground alpha layers | Painted or generated, four base districts plus After Midnight treatment | P0 |
| Route desktop variants | Wide route network | 2880 by 1800 each district | Opaque base plus fog | Painted or generated, desktop-specific | P1 |
| Current rarity frames | Responsive common through Diamond hierarchy | 512 square master plus 96 px corners and edges for 9-slice | Alpha required, corners and edges separable | Painted then 9-slice prepared; no text | P0 |
| Door art | Threshold crop and opening layers | 1170 by 1600 portrait, 1920 by 1080 landscape crop guides | Opaque door plus alpha foreground or smoke mask | Recrop current paintings, generate only missing outside scene | P1 |
| Stone title button | Reusable title control without baked visual mismatch | 768 by 192 master | Alpha preferred | Repair current 353 by 128 into clean 9-slice or CSS and texture hybrid | P1 |

### 8.3 New reusable UI frames and components

| Asset | Purpose and screen | Dimensions or ratio | Alpha and layering | Recommended production method | Orientation variants | Priority |
|---|---|---|---|---|---|---|
| Hero identity crest | Attach portrait, Resolve, Gold, Tier, Omen | 9-slice source around 512 by 256 | Alpha, portrait port separate | Painted edge plus SVG or CSS layout | Phone compact, desktop rail | P0 |
| Market shelf frame | Make offers live on furniture | 9-slice 1024 by 768 master | Alpha edge, wood fill tile separate | Painted structure plus CSS and 9-slice | Portrait 2 by 2, landscape row | P0 |
| Ware offer frame family | Common through Diamond, restrained hierarchy | 512 square master per tier | Alpha | Painted 9-slice plus CSS state layers | One responsive family | P0 |
| Board tray | Continuous ten-slot stall surface | 1170 by 220 portrait source, scalable center | Alpha edge, wood fill, slot mask separate | Painted and 9-slice, slot geometry CSS-native | Phone and desktop | P0 |
| Vault drawer | Three-shelf storage and actions | 1170 by 900 portrait master | Alpha drawer lip and shadow | Painted shell plus CSS content | Phone bottom, desktop side | P0 |
| Context drawer | Scout, detail, help | 1170 by 1000 scalable | Alpha outer edge and attachment shadow | Painted or texture edge plus CSS | Bottom and side recipes | P0 |
| Decision tray family | Merchant, Treasure, Rest, Shrine | 1170 by 1200 master silhouette per semantic material | Alpha foreground and choice slots | Painted shells plus CSS | Phone stack, desktop tableau | P1 |
| Combat health rail | Hero and foe health with status sockets | 1024 by 160 scalable | Alpha | SVG or CSS geometry with painted texture overlays | Compact phone and wide desktop | P0 |
| Combat ware rail | Ten slots without ten equal bright boxes | 1170 by 180 | Alpha edge and slot mask | Painted shell plus CSS-native slots | Phone and desktop | P0 |
| Reward pedestal | Rare find, fusion, unlock | 768 square | Alpha, base and light cone separate | Painted plus procedural light | Universal | P1 |
| Ledger frame | Almanac, report, rules, history | 1536 by 1024 master | Opaque paper, alpha tabs and seals | Painted paper plus CSS text layout | Portrait sheet, desktop spread | P1 |

### 8.4 New backgrounds

| Asset | Purpose and screen | Dimensions | Alpha and layers | Method | Variants | Priority |
|---|---|---:|---|---|---|---|
| Hero selection stall | Introduce the merchant as a person | 1170 by 2532 portrait, 2560 by 1440 landscape | Opaque base, lamp and smoke layers optional | Painted or generated concept refined by artist | Portrait and landscape | P0 |
| Merchant counter | Bargain persona and exchange | 1170 by 1600 | Opaque base, hands or goods alpha foreground optional | Painted | Phone and desktop crop guides | P1 |
| Rest alcove | Sanctuary event identity | 1170 by 1600 | Opaque plus steam and flame alpha | Painted | Portrait primary | P1 |
| Quqnus Shrine | Sacrifice and rebirth event | 1170 by 1800 | Opaque plus smoke, flame, feather layers | Painted | Portrait and landscape | P1 |
| Treasure cloth or cache | Reward selection stage | 1170 by 1600 | Opaque base plus foreground cloth alpha | Painted | Portrait and landscape crop | P1 |
| Gate Camp threshold | Boss block and emergency bench | 1170 by 2532 and 2560 by 1440 | Opaque gate, foreground quartermaster bench, smoke mask | Painted | Portrait and landscape | P1 |

### 8.5 New transition art

| Asset | Purpose and screen | Dimensions | Alpha and layers | Method | Variants | Priority |
|---|---|---:|---|---|---|---|
| Smoke shutter mask | Scene transition | 1024 square tile or full-screen alpha sequence | Alpha required | Generated texture refined, or procedural shader | Universal | P0 |
| Textile curtain mask | Market, district, and result transition | 1170 by 2532 alpha edges | Alpha required | Painted or generated, animated through CSS or Pixi | Portrait and landscape edges | P1 |
| Lantern light cookie set | Local hierarchy and reveal | 512 and 1024 soft alpha masks | Alpha required | Procedural or painted mask | Universal | P0 |
| District threshold plate | Name, danger, and route condition at entry | 1170 by 420 and 1920 by 300 | Alpha frame, district seal, and text-safe center separate | Painted frame plus live text | Portrait and landscape | P0 |
| Combat versus wipe | Join hero and foe without copying a bracket screen | 1170 by 2532 full-screen mask sequence | Alpha smoke, sparks, and identity apertures | Pixi masks plus painted textures | Routine and boss | P0 |
| Result-to-route dissolve | Preserve consequence while returning to the map | Full-screen scalable | Alpha light trail and route aperture | Pixi or CSS mask with route coordinates | Victory, defeat, and event | P1 |

### 8.6 New icons

All icons should be built as a coherent SVG set on 24, 32, and 48 px grids, with 2 to 2.5 px optical stroke at 24 px, rounded but tool-like terminals, a dark inset, and one material highlight. Painted raster icons are reserved for collectible objects, not utility symbols.

| Icon group | Purpose and screens | Count | Transparency | Method | Variants | Priority |
|---|---|---:|---|---|---|---|
| Core resources | Resolve, Gold, Tier, Omen, capacity, route length | 6 to 8 | Yes | SVG | Filled active and quiet secondary | P0 |
| Combat status | Damage, heal, poison, burn, frost, shield, haste, crit, flying, disable, ammo, storm | 12 to 16 | Yes | SVG | 24 and 32 px | P0 |
| Market actions | Buy, sell, reroll, freeze, upgrade, Vault, swap, return | 8 | Yes | SVG | Active and disabled | P0 |
| Route nodes | Market, Merchant, Rest, Treasure, Shrine, fight, elite, boss, camp | 9 | Yes | SVG utility under painted medallion or normalized current art | Reachable, future, done masks | P0 |
| Navigation | Back, close, help, history, Almanac, report, audio, speed | 8 to 10 | Yes | SVG | 24 and 32 px | P0 |
| Rarity and progression | Bronze, Silver, Gold, Diamond, locked, discovered, new, Lantern | 8 | Yes | SVG plus material state | Small and hero versions | P1 |

### 8.7 New particles and effects

| Asset or effect | Purpose | Dimensions | Alpha and layers | Method | Variants | Priority |
|---|---|---:|---|---|---|---|
| Activation trails | Source-to-target clarity | Runtime vector or 256 by 64 texture strips | Alpha, additive and normal variants | Pixi procedural with 3 to 5 textures | Weapon, poison, burn, heal, shield, haste | P0 |
| Impact decals | Damage magnitude and material | 256 square atlases | Alpha | Painted sprites plus Pixi | Minor, strong, lethal | P0 |
| Status residues | Persist effect family on target | 256 square atlas | Alpha | Painted sprites and CSS masks | Poison, burn, frost, shield | P0 |
| Fusion core | Copies compress and reveal result | 512 square | Alpha, core and ring separate | Pixi procedural plus painted glyph | Bronze-to-Silver, Silver-to-Gold, Gold-to-Diamond | P0 |
| Reward rays | Rare reveal without generic sunburst | 1024 square or procedural | Alpha | Procedural light cookie | Gold, Diamond, unlock | P1 |
| Material landing motes | Give moved wares a restrained sense of weight | 128 square atlas | Alpha | Pixi sprites | Wood dust, brass glint, frost fleck | P1 |
| Defeat drain | Pull warmth from the scene without obscuring the result | Full-screen procedural | No bitmap required | Pixi color and vignette tween | Routine and route-ending | P1 |

### 8.8 New overlays and masks

| Asset or effect | Purpose | Dimensions | Alpha and layers | Method | Variants | Priority |
|---|---|---:|---|---|---|---|
| Destruction masks | Break ware art without bespoke animation | 256 square grayscale masks | Alpha or luminance | Shader or Pixi mask | 4 to 6 crack patterns | P1 |
| Route fog | Hide future detail and create depth | 1024 square seamless | Alpha | Procedural shader or soft painted tile | Normal and After Midnight | P0 |
| Safe-area vignette | Protect phone text over art | Full-screen scalable | Alpha | CSS gradient and mask | Portrait and landscape | P0 |
| Focus scrim family | Suppress secondary detail under inspect, choice, and result layers | Full-screen scalable | Alpha, center aperture optional | CSS gradient and mask | Neutral, danger, sanctuary, reward | P0 |
| Portrait crop masks | Integrate hero and foe art into crests, rails, and tableaux | 512 square masters | Alpha | SVG masks with painted edge overlays | Hero, monster, boss | P0 |
| Board capacity mask | Make open, filled, targetable, and locked slots legible | 1170 by 220 scalable | Alpha and live-state sockets | SVG or CSS masks | Board and Vault | P0 |

### 8.9 New decorative elements

| Asset | Purpose and screen | Dimensions | Alpha and layers | Method | Variants | Priority |
|---|---|---:|---|---|---|---|
| Hanging lantern set | Frame focal zones and establish light sources | 256 to 768 px masters | Alpha, fixture and glow separate | Painted or generated then refined | Brass, glass, damaged, shrine | P0 |
| Textile edge set | Break rectangular panel repetition | 512 by 256 tileable edges | Alpha | Painted | Market, route, reward, defeat | P1 |
| Brass corner and fastener kit | Join 9-slice frames without generic gold outlines | 128 and 256 px atlas | Alpha | Painted or SVG with texture | Quiet, primary, dangerous | P0 |
| Merchant seals and stamps | Give decisions and records authored provenance | 256 square masters | Alpha | Painted or vector with texture | Accept, refuse, debt, reward, completed | P1 |
| Stall clutter silhouettes | Add foreground depth without reducing legibility | 512 to 1024 px strips | Alpha | Painted | Bottles, ledgers, scales, bundled textiles | P1 |
| District wayfinding ornaments | Reinforce place around route nodes | 256 to 512 px atlas | Alpha | Painted | Four district families and After Midnight | P1 |

### 8.10 New sound and stinger needs

| Sound | Purpose and screen | Length | Layering | Method | Variants | Priority |
|---|---|---:|---|---|---|---|
| UI press family | Tactile material response | 60 to 140 ms | Dry transient, no tail | Designed samples or synth plus foley | Wood, brass, textile, stone | P0 |
| Buy and sell | Commit economy movement | 180 to 350 ms | Object plus coin | Designed sample | Buy, sell, free pickup | P0 |
| Reroll and freeze | Whole shelf state change | 250 to 500 ms | Mechanism plus finish | Foley and tonal accent | Reroll, freeze, thaw | P0 |
| Route node and district | Travel and threshold | 250 ms node, 700 to 1,100 ms district | Mechanism, ambience, tonal identity | Designed stinger | Four district families | P0 |
| Merchant bargain | Persona exchange | 350 to 700 ms | Coin, seal, or object handoff | Foley plus short motif | Gain, pay, walk away | P1 |
| Rest, Treasure, Shrine | Event identity | 500 to 1,200 ms | Environment plus consequence | Designed stingers | One family per event | P1 |
| Fusion tiers | Crafting consequence | 600 to 1,500 ms | Existing forge motif expanded | Music or sound design | Silver, Gold, Diamond | P0 |
| Boss escalation | Phase or storm danger | 800 to 1,400 ms | Low body, metal, music layer | Designed stinger and loop stem | Boss families optional | P1 |
| Unlock and Lantern | Permanent progression | 800 to 1,300 ms | Reveal plus filing or wick | Designed stinger | Unlock, Lantern | P1 |
| Route completion | Final resolution | 1,200 to 2,000 ms | Theme cadence plus result | Music edit | Win and loss | P0 |

### 8.11 Optional premium assets

| Asset | Purpose | Format and size | Method | Variants | Priority |
|---|---|---|---|---|---|
| Hero reaction crops | Buy, forge, victory, defeat, boss sight | 768 square alpha | Painted extensions of approved portraits | 3 to 5 reactions per hero | P2 |
| Boss entrance tableaux | Unique boss spectacle | 2560 by 1440 and 1170 by 2532 | Painted | Major bosses only | P2 |
| District parallax packs | Living route scenes | 3 to 5 layered 2K planes | Painted layers plus Pixi or CSS parallax | Four districts and After Midnight | P2 |
| Signature ware hero moments | Tie hero and signatures together | 1170 by 1600 | Painted or generated then refined | Two per hero at most | P2 |
| Voice barks | Character ownership and consequence | 48 kHz lossless masters | Recorded performance | Hero-specific, throttled | P2 |
| Haptic design map | Native material and consequence | Native patterns | Platform implementation | Light, medium, heavy, success, warning | P2 after native shell |

## 9. Concept mockup findings

These three images were generated from live 390 by 844 captures as exploratory direction only. They deliberately exaggerate material depth and illustration scale to test the north star. They contain generated text and visual inventions that are not canonical. None is a production asset, layout contract, or authorization to change gameplay.

Saved outside production paths:

- Market and board: `C:\Users\sidzb\.codex\visualizations\2026\07\18\019f7769-4b7d-7423-862e-3226dea71f25\concept-market-phone.png`
- Route and district: `C:\Users\sidzb\.codex\visualizations\2026\07\18\019f7769-4b7d-7423-862e-3226dea71f25\concept-route-phone.png`
- Active combat: `C:\Users\sidzb\.codex\visualizations\2026\07\18\019f7769-4b7d-7423-862e-3226dea71f25\concept-combat-phone.png`

### 9.1 Market and board concept

**Assumptions:** the hero identity can occupy a persistent top crest; unselected ware cards can show short rules; the board tray may sit at the bottom; the market can use a physical shelf metaphor without changing buying rules.

**What improves over current:**

- The hero becomes a visual participant rather than a tiny rail portrait.
- Resolve, Gold, Tier, and Omen share one attached identity structure.
- Offer cards hang from a market shelf and use quieter textile backing. The interface no longer reads as four website cards over wallpaper.
- Tier, Reroll, Freeze, Vault, board, and Set Out occupy distinct physical zones.
- The board is a continuous tray with readable capacity.

**What must not survive literally:**

- The generated hero is not the approved Kilnkeeper portrait and cannot replace it.
- The concept is taller and more ornate than a practical 390 by 844 implementation. Decorative density must be cut by at least 30 percent.
- Four large full-copy cards still consume too much height. Production needs progressive detail disclosure.
- The generated item art, labels, iconography, frames, and exact geometry are disposable.

**Principles to carry forward:** attached hero HUD, market shelf, continuous board tray, grouped control rail, one lit offer zone, and stronger indigo textile contrast.

### 9.2 Route and district concept

**Assumptions:** phone route can show fewer future nodes at once; the district can be a painted vista; the selected node can own a bottom scout drawer; a distant boss gate may remain visible as a destination.

**What improves over current:**

- The district has an immediate center and destination.
- Reachable choices are large objects with labels rather than 34 px medallions on a compressed graph.
- The route recedes into world depth. Future choices are visible without equal visual weight.
- The selected foe gets a large portrait and a dedicated scout drawer while route context remains visible.

**What must not survive literally:**

- Generated names, rewards, numbers, boss identity, node count, and choice labels are wrong and noncanonical.
- The concept invents a `Scout` cost and compresses the actual route graph. Production must preserve every real branch and route rule.
- The large illustrated map would require authored district compositions and careful performance budgeting.

**Principles to carry forward:** current-plus-next route camera, boss as distant anchor, larger route targets, quiet future state, and bottom scout drawer.

### 9.3 Active combat concept

**Assumptions:** hero and enemy can occupy large compositional anchors; empty slots can recede; action can cross a dedicated central lane; ordinary fights may use existing portraits while bosses receive more spectacle.

**What improves over current:**

- Source, target, impact point, number, and status residue form one readable action sentence.
- The enemy feels present and threatening.
- The Kilnkeeper anchors the player's side and health.
- Empty ware slots are still legible but no longer dominate.
- The central lane creates room for readable projectiles, strikes, and status effects.

**What must not survive literally:**

- The giant full-body rat and Kilnkeeper paintings do not exist as production assets. Routine fights cannot require bespoke tableaux.
- The generated item forms and effect values are noncanonical.
- The composition devotes too much height to character illustration for dense late-run boards unless portrait crops collapse dynamically.
- The exact health rails, slots, and impact motif are generated inventions.

**Principles to carry forward:** large identity anchors, central action lane, magnitude-scaled impact, hidden zero statuses, receding empty slots, and health settlement after impact.

### Concept conclusion

The concepts prove the direction at a principle level: painting and UI can belong to one scene, strategic density can remain believable, and phone hierarchy improves when objects have place, material, and light. They do not prove production feasibility, text fit, accessibility, performance, responsive behavior, or exact game-state coverage. The vertical slice must prove those with current art and live data before a full rebuild.

## 10. P0, P1, and P2 priorities

### P0: required before further public-facing playtests

1. Approve the named visual north star and one representative phone composition for each of market, route, and combat.
2. Establish self-hosted type, minimum sizes, semantic colors, material recipes, panel primitives, button tiers, card anatomy, status language, and safe-area rules.
3. Build the vertical slice defined in section 11 without changing gameplay or balance.
4. Replace the phone market's browser-like scrolling and sub-12 px strategic text.
5. Replace the compressed full-district portrait map with a current-plus-next composition and readable scout drawer.
6. Recompose combat around hero, foe, action lane, magnitude, and consequence. Remove the permanent empty log from the primary phone view.
7. Give victory, defeat, and the first reward a visible consequence chain.
8. Produce portrait market, route, and battle scene variants plus core reusable frames and icon set.
9. Add motion tokens, event timelines, sound sync checks, and reduced-motion equivalents for the slice.
10. Add named 390 by 844, 844 by 390, and actual-phone screenshot gates. A green fit test is not approval.
11. Keep public-facing recording paused until Robbie approves the slice screenshot set.

### P1: required before 1.0

1. Extend the system across hero selection, Omen reveal, every district, Market, board, Vault, scout, all fights, Merchant, Treasure, Rest, Shrine, Gate Camp, reward flows, Almanac, unlocks, run report, and end screen.
2. Complete all portrait and landscape scene variants and boss-scale source art.
3. Add buy, sell, reroll, freeze, route, district, event, reward, fusion-tier, boss, and completion sound vocabulary.
4. Implement the full motion hierarchy with input and skip rules.
5. Rebuild History, Almanac, report, and rules as a coherent ledger system.
6. Finish responsive desktop composition at 1440 by 900 and validate intermediate tablet widths.
7. Self-host all production fonts and include the complete visual and audio asset set in offline install.
8. Add screenshot, crop, contrast, safe-area, and reduced-motion automated checks.
9. Complete actual-device performance profiling and memory audits.
10. Resume and visually integrate the route-native tutorial only after the presentation primitives and screen anatomy are frozen.

### P2: premium finish that may follow 1.0

1. Hero reaction variants and recorded voice barks.
2. Bespoke boss entrance tableaux and phase art.
3. Layered district parallax and weather treatments.
4. Hero-signature ware moments.
5. Native haptic design beyond basic confirmation and warning patterns.
6. Additional cosmetic or collection presentation that does not obscure play.
7. Accessibility expansion beyond the 1.0 gate, including optional large-type and high-contrast modes if user testing shows need.

## 11. Recommended vertical slice

### Slice name

**The First Lantern Loop**

### Goal

Prove one complete presentation loop on a real phone before rebuilding every screen: hero identity, route decision, market, combat, reward, and return to route. The slice must use live mechanics and canonical state, not a click-through mockup.

### Included path

1. Title to Kilnkeeper hero selection.
2. Omen and Back Alleys district entry.
3. One route node scout and commitment.
4. One market with four offers, one purchase, one board move, one Vault open, one reroll, and Set Out.
5. One Souk Rats fight with at least two activations, one status application, one ware destruction, and storm warning.
6. Victory or defeat recap with route consequence.
7. One reward reveal or bounty anticipation.
8. Return to the route with current position and next choices clearly shown.

### Systems proven

- Hero-attached HUD.
- Type scale and semantic color roles.
- Market shelf, card anatomy, detail drawer, control rail, board tray, and Vault drawer.
- Route current-plus-next camera, district hierarchy, scout drawer, and boss destination.
- Combat identity anchors, health rails, action lane, activation grammar, status grammar, and destruction aftermath.
- Victory or defeat consequence and reward tier.
- Screen transitions, sound sync, reduced motion, safe areas, and responsive desktop expansion.

### Slice exclusions

- No balance or gameplay changes.
- No full Almanac, Daily Market, native packaging, Cloud Ledger redesign, or tutorial rewrite.
- No bespoke art for every hero, ware, monster, or boss.
- No attempt to finish all event screens before the core loop is approved.

### Slice asset limit

- One portrait market scene.
- One portrait Back Alleys scene.
- One portrait battle scene.
- One hero identity crest.
- One market shelf, one board tray, one Vault drawer, one scout drawer, one health rail, one combat rail.
- Core status and resource SVG icons.
- Existing Kilnkeeper, Souk Rats, and ware art.
- One buy, reroll, freeze, route, combat, destruction, result, and reward sound family.

### Slice acceptance

- Robbie approves a named actual-phone set: `slice-title`, `slice-hero`, `slice-route`, `slice-market`, `slice-combat-open`, `slice-combat-impact`, `slice-result`, `slice-reward`, and `slice-return`.
- An independent reviewer sees the same visual system in all nine captures.
- Every primary state is understandable within one second.
- Strategic copy is 13 px or larger and body copy is 15 px or larger on the named phone.
- Primary actions are 52 px or taller, secondary actions 48 px or taller, and all hit targets at least 44 by 44 px.
- No native scrollbar chrome, clipped art focal point, unsafe home-indicator overlap, or hidden primary action.
- P95 animation frame time remains under 20 ms on the named phone, with no sustained sequence below 50 frames per second and no input delay above 100 ms for routine actions.
- Reduced motion preserves source, target, result, and route consequence.

## 12. Roadmap insertion and version plan

### Recommendation

Insert `Launch L5: Visual Identity and Finish` after Launch L4. Renumber the current `Launch L5: Release Experience` to `Launch L6: Release Experience` without blending their scopes.

The evidence supports Robbie's starting recommendation. A smaller alternative, expanding only 0.108.0, would create a combined version containing type, materials, market, route, combat, rewards, responsive layout, signatures, and mobile clarity. That violates the spirit of one system per version and makes rollback or approval ambiguous.

### Launch L5 purpose

Create one coherent presentation system that joins painted art, hero identity, phone composition, strategic hierarchy, material depth, combat readability, reward drama, motion, and sound across the full core loop. Preserve mechanics, balance, exact-once transactions, route state, offline-local truth, and content.

### Proposed versions

Current numbering after Launch L4 ends at 0.106.0. The visual project should occupy 0.107.0 through 0.112.0. The existing Release Experience versions then move to 0.113.0 through 0.117.0, with 1.0.0 remaining a release-only version.

| Version | Single visual system | Scope and rollback boundary | Owner and gate |
|---|---|---|---|
| 0.107.0 | Presentation foundation | Self-hosted type, semantic tokens, material recipes, panel primitives, hero crest, safe areas, motion tokens, reduced motion. No screen-wide redesign beyond proof fixtures. Revert as one foundation layer if gates fail. | Claude recommended as sole UI writer and integrator; Robbie approves foundation boards; Codex reviews frozen commit. |
| 0.108.0 | Market and inventory stage | Market shelf, ware anatomy, detail drawer, action rail, board tray, Vault drawer, buying, selling, reroll, freeze, move, fusion and rarity presentation. Rollback does not touch route or combat. | Same UI owner; Robbie approves phone market set. |
| 0.109.0 | Route and threshold stage | District entry, current-plus-next route camera, node states, scout drawer, doors, Merchant, Treasure, Rest, Shrine, and Gate Camp structural presentation. No choice logic changes. | Same UI owner; Codex verifies route and exact-once boundaries remain untouched; Robbie approves district set. |
| 0.110.0 | Combat language | Hero and foe composition, health and status rails, action lane, activation timeline, magnitude tiers, destruction, storm, boss escalation, combat inspect, sound sync. Engine remains pure and unchanged. | Same UI owner; difficulty owner confirms no timing or balance change; Robbie approves combat clips. |
| 0.111.0 | Reward and progression drama | Victory, defeat, bounty, fusion tiers, Diamond, unlock, Lantern, Almanac reveal, route completion, and report-first-view hierarchy. No unlock or reward semantics change. | Same UI owner; Codex reviews durable settlement and report integrity; Robbie approves peak set. |
| 0.112.0 | Cross-screen integration and responsive finish | Title-to-run continuity, hero and Omen integration, transitions, desktop scaling, intermediate widths, accessibility, performance, asset diet, full device screenshot set. No new visual system added. | Claude integrates; Robbie performs named phone approval; Codex performs frozen-commit visual and source review. |

### Launch L6 renumbered Release Experience

| New version | Former version | Scope |
|---|---|---|
| 0.113.0 | 0.107.0 | Route-native tutorial and corrected reachable rules reference, built only with frozen Launch L5 components. |
| 0.114.0 | 0.108.0 | Residual mobile decision clarity, compact comparison, and signature surfacing that was intentionally excluded or deferred by Launch L5. This must not reopen visual identity. |
| 0.115.0 | 0.109.0 | Complete offline install and update handling, including self-hosted fonts and all required visual or audio assets. |
| 0.116.0 | 0.110.0 | Deterministic local Daily Market. |
| 0.117.0 | 0.111.0 | Native release candidate after Robbie's display-name ruling. |
| 1.0.0 | 1.0.0 | Release only, no new system. |

### Owners

- **Robbie:** creative director, art-selection authority, named actual-phone screenshot approval, display-name decision, final deploy approval.
- **Claude:** recommended single Launch L5 UI implementation owner and integrator because current canonical planning already assigns the presentation and Release Experience track to Claude. This recommendation does not reserve or modify canonical state.
- **Codex:** frozen-commit source-aware visual reviewer, exact-once and responsive audit, and independent exit-gate report. Codex should not write concurrently with the visual integrator.
- **Difficulty owner:** confirms combat presentation has not changed simulation timing, balance, or outcome.
- **Asset production:** Robbie generates or commissions painted art; the single implementation owner prepares files, maintains originals, runs art manifest and diet checks, and rejects unsuitable assets under the existing art pipeline.

### Dependencies

1. Launch L4 gameplay and choice copy freeze.
2. No unresolved economy, route-choice, save, map, content-epoch, or exact-once writer.
3. Robbie approves the visual north star and the vertical-slice asset list.
4. Named primary phone and real-device capture protocol are recorded.
5. Display-name decision is not required to start visual production, but must land before final title or native store art.
6. Production rights and source files for fonts, music, generated art, and painted art are confirmed.

### Device gates

- 390 by 844 portrait browser baseline.
- 844 by 390 landscape browser baseline.
- 1440 by 900 desktop browser baseline.
- Robbie's named primary iPhone in Safari and installed PWA modes.
- One lower-performance supported phone before 0.112.0 exit.
- Safe areas tested with top notch or island, bottom home indicator, and landscape side insets.
- Text-size accessibility checked at default and one enlarged OS setting where the web view respects it.

### Human-review gates

- Foundation board approval before 0.107.0 implementation expands.
- Named screenshot set per version, shot from the same representative run states.
- Five-second and one-second hierarchy tests with at least one independent reviewer.
- Side-by-side current versus candidate captures for every changed screen.
- Motion clips at normal and reduced motion.
- Audio-on and muted clips for every new consequence tier.
- Robbie explicitly says `approved` for the named phone set. Silence, green tests, or general encouragement do not pass the gate.

### Automated layout and visual checks

- Existing overflow and 44 px tests remain.
- Add minimum computed font-size assertions for strategic, body, microcopy, and primary numeric roles.
- Add overlay max-height, fixed header, fixed action, and single-scroll-container assertions.
- Add safe-area inset fixtures and bounding-box checks.
- Add screenshot comparisons for the named slice states at all three browser viewports. Use narrow tolerances on geometry and masks, wider tolerances on nondeterministic particles.
- Add asset focal-point crop metadata and tests so portrait and landscape do not rely on blind `cover`.
- Add hidden-zero-status, no-native-horizontal-scrollbar, no-primary-action-below-fold, and no-label-path-overlap checks.
- Add reduced-motion screenshots and assert no continuous ambient animation is required to communicate state.
- Add event-to-sound instrumentation tests that assert cue selection and order without decoding audio in unit tests.

### Performance budgets

- Initial compressed transfer for core shell, required phone backgrounds, core UI, and fonts: target under 2.5 MB before audio; hard gate 4 MB. Audio remains lazy by scene.
- Largest Contentful Paint on a warm installed run: under 1.5 seconds on the named phone. Fresh network target under 2.5 seconds on a representative 4G profile.
- Interaction response: visual response under 100 ms; routine state commit under 200 ms when no persistence failure occurs.
- P95 animation frame time: under 20 ms on the named phone. No sustained motion sequence below 50 frames per second.
- Pixi particle count: routine impact under 40 live sprites, boss peak under 120, with automatic quality reduction.
- GPU texture budget: target under 64 MB routine phone scene, hard gate under 96 MB. Do not keep every district and boss texture resident.
- DOM budget: under 500 live elements on routine market and route, under 650 in dense combat. Hidden historical screens are removed, not only visually hidden.
- Layout shifts after first interactive paint: none above 0.02 cumulative score in a stable screen.
- Audio transition: no overlapping orphan loop; stinger starts within 50 ms of scheduled cue after unlock.

### Rollback boundaries

- Each version owns only its new presentation system and its tests or assets.
- Game controller, engine, economy, route graph, save schema, receipts, reward keys, and report IDs remain outside visual rollback unless a separately approved bug fix is reserved.
- The prior production presentation remains buildable until each version passes its named device gate.
- A failed market version reverts market presentation without reverting foundation. A failed combat version reverts combat presentation without touching engine or route.
- No version ships a half-converted component family. If a primitive is introduced, every in-scope surface uses it or the version remains unshipped.

### Exact point where tutorial and native packaging may resume

- **Tutorial may resume at 0.113.0 only after 0.112.0 passes and the title, hero, route, market, combat, reward, and return-to-route component anatomy is frozen.** Building the tutorial earlier would teach moving targets and create duplicate coach layout work.
- **Native packaging may resume at 0.117.0 only after the tutorial, residual mobile clarity, complete offline asset install, Daily Market, final display name, and full Launch L5 phone set have passed.** Capacitor proof-of-concept work may remain in a separate nonrelease spike, but store metadata, screenshots, and TestFlight candidate work must wait.

## 13. Acceptance gates

### Visual identity gate

- The title, hero picker, route, market, combat, reward, and end screen share the same type, material, light, icon, and motion grammar.
- Painted hero art looks native to every screen on which it appears.
- An independent reviewer can identify Tavern Bash from a cropped interface screenshot without seeing the title.
- The interface does not resemble a generic medieval card game or a website over a painting.

### One-second hierarchy gate

For each named screenshot, five of five internal reviewers identify within one second:

- the screen or phase;
- the current focal object;
- the primary resource or danger;
- the available primary action;
- any irreversible cost.

### Phone composition gate

- 390 by 844 and the named actual iPhone feel authored in portrait, not compressed.
- No essential strategic text below 13 px, body below 15 px, or touch target below 44 by 44 px.
- No primary action under a safe area, keyboard, or nested scroll container.
- No native scrollbar chrome in play.
- No more than one routine overlay or drawer occupies the screen at once.
- The selected object remains visible with its detail and primary action.

### Combat and reward gate

- Every activation has readable source, target, impact, and resolution.
- Health and status changes occur visually after impact, not before.
- Minor, strong, lethal, destruction, boss escalation, victory, defeat, rare reward, fusion, Gild, Diamond, unlock, and route completion have distinguishable amplitude.
- Reward and result peaks remain readable with sound muted and with reduced motion.

### Responsive desktop gate

- 1440 by 900 uses the available stage and does not center a phone-scale dashboard in empty background.
- Desktop preserves the same component anatomy while using a contextual side rail or wider action lane.
- Portrait and landscape background focal points are authored, not accidental `cover` crops.

### Technical and regression gate

- All existing tests, production build, route resume, exact-once decision, report, unlock, and content-epoch gates remain green.
- Screenshot, typography, safe-area, contrast, reduced-motion, and performance gates pass.
- The combat engine remains pure, deterministic, and DOM-free.
- Visual effects do not change fight timing, target choice, RNG, outcome, or save order.
- Complete offline install includes self-hosted fonts and all required visual or audio assets.

### Human approval gate

- Robbie approves the exact named actual-phone screenshot and motion set.
- One independent reviewer confirms a consistent visual system across title, route, market, combat, and reward.
- Any disagreement between emulation and real-phone evidence is resolved in favor of the real phone and recorded.
- No deploy or push occurs until Robbie receives local verification and gives explicit approval.

## 14. Risks and open Robbie decisions

### Blocking decisions

1. **Display name:** the current title remains close to Hearthstone's Tavern Brawl and tavern vocabulary. Canonical state already records this as pending before native metadata. Visual identity can begin, but final title art, store assets, and native package metadata cannot.
2. **Primary phone:** name the exact iPhone model, OS version, Safari or PWA mode, display zoom, and text-size setting that owns visual approval.
3. **Portrait-first commitment:** current manifest declares landscape orientation while the requested north star is phone-first portrait. Robbie must approve portrait as the primary authored play orientation, with landscape and desktop as coherent expansions.
4. **Rakkas decision:** approve retaining Rakkas as the display face or commission or license a more ownable alternative. Do not change it casually after frame and title layout production begins.
5. **Ornament ceiling:** approve a target closer to the restrained lower half of the generated concepts, not their maximum decorative density.
6. **Hero scale:** approve whether routine combat uses 72 to 96 px portrait anchors or larger busts that may require new source art.
7. **Audio rights and direction:** confirm rights and production status of all Suno tracks, and decide whether premium sound design is required before 1.0 or can be partly P2.

### Production risks

- **CSS override risk:** continuing inside the current layered selector stack can produce regressions and inconsistent components. Mitigation: new primitives and one writer per version.
- **Asset-volume risk:** producing unique paintings for every screen will overwhelm schedule and memory. Mitigation: semantic reusable frames, layered backgrounds, and bespoke art only for high-value peaks.
- **Generated-concept literalism:** concepts contain impossible density, noncanonical text, invented imagery, and excessive ornament. Mitigation: treat them as principle evidence only and rebuild with live data.
- **Readability versus atmosphere:** dark indigo and smoke can bury type. Mitigation: quiet text zones, contrast tests on actual composites, and grayscale review.
- **Combat spectacle versus clarity:** particles and large portraits can cover timing state. Mitigation: central action lane, magnitude caps, hidden zero state, and performance budgets.
- **Phone memory:** layered 2K art, Pixi, and audio can exceed safe texture or memory limits. Mitigation: lazy scene loading, texture eviction, WebP or AVIF evaluation, and live device profiling.
- **Offline completeness:** external fonts and lazily fetched art or audio can break presentation offline. Mitigation: self-host, precache the complete required shell, and test fresh install in airplane mode.
- **Tutorial rework:** building tutorial before screen anatomy freezes will duplicate work. Mitigation: resume only after 0.112.0 exit.
- **One-system discipline:** broad visual ambition may tempt gameplay or copy changes. Mitigation: freeze mechanics and review diffs for presentation-only scope.
- **False approval from tests:** fit and touch tests can pass unreadable or emotionally flat screens. Mitigation: named screenshots, one-second review, and motion clips as first-class gates.

### Evidence still required before final art approval

- Robbie's real-phone title, market, route, scout, combat, result, event, and end-state captures.
- At least one recording with sound on, including purchase, reroll, combat activation, destruction, victory or defeat, and route return.
- Real-phone screenshots with any debug readout Robbie already uses, but the approved presentation set must also include clean captures without debug chrome.
- A fresh-install offline run after the visual asset plan is implemented.

## 15. Exact next handoff prompt for the implementation owner

```text
You are the sole implementation owner for the proposed Launch L5: Visual Identity and Finish vertical slice in C:\Robbie\bazaar-brawler.

Read, in order:
1. coordination/state.json
2. AGENTS.md
3. CLAUDE.md hard rules and commands
4. roadmap-launch-l1-l5-2026-07-18.md
5. visual-direction-audit-2026-07-18.md
6. the named Robbie-approved phone captures and vertical-slice screenshot list

Current boundary:
- Implement only the approved First Lantern Loop vertical slice.
- Do not change gameplay, balance, economy, targeting, map generation, save schemas, content epoch, reward semantics, receipts, report IDs, unlock rules, or route-choice outcomes.
- Keep the combat engine pure, deterministic, and DOM-free.
- Do not edit the roadmap or coordination state unless the main integrator separately reserves and authorizes that metadata change.
- Zero Unicode em dash and zero Unicode en dash in all changed files.
- Use a dedicated branch and worktree after a canonical reservation. Stage an explicit approved file set. Never use git add -A.
- Do not push or deploy without Robbie's explicit approval after local verification is summarized.

Objective:
Prove one cohesive, phone-first Tavern Bash presentation loop using current mechanics and current approved painted art:
title or hero identity -> Omen and route decision -> market -> board and Vault interaction -> Souk Rats combat -> victory or defeat -> reward or consequence -> return to route.

Required visual systems for the slice:
1. Self-hosted type roles and minimum sizes.
2. Semantic color, material, spacing, safe-area, shadow, and motion tokens.
3. Hero-attached phone HUD.
4. Market shelf, concise ware cards, selected detail drawer, action rail, continuous board tray, and Vault drawer.
5. Back Alleys current-plus-next route composition with readable nodes and bottom scout drawer.
6. Combat hero and foe anchors, health and status rails, central action lane, source-to-target activation, magnitude-scaled impact, destruction aftermath, and on-demand log.
7. Victory or defeat consequence, one reward reveal, and authored return to route.
8. Reduced-motion equivalents and sound synchronization.
9. Coherent 844 by 390 landscape and 1440 by 900 desktop expansion using the same anatomy.

Asset limit:
- Reuse the approved Kilnkeeper, Souk Rats, ware, title, and existing music assets.
- Add only the approved portrait market, Back Alleys, and battle scenes; hero crest; market shelf; board tray; Vault drawer; scout drawer; health and combat rails; core SVG status and resource icons; and the approved slice sound cues.
- Keep generated concept mockups outside production paths. They are direction references, not assets.

Implementation rules:
- Introduce new scoped primitives instead of adding another late global override layer to .card, .ware, .cell, .board, .ribbon, and .btn.
- Preserve current DOM or controller boundaries where safe. If component extraction is needed, keep rendering separate from game-state mutation.
- Routine actions commit state immediately and never wait for animation.
- Every milestone animation is skippable after its result is readable.
- No strategic copy below 13 px, body below 15 px, primary action below 52 px, secondary action below 48 px, or hit target below 44 by 44 px.
- No native scrollbar chrome in play. Only a drawer body may scroll.
- Phone overlays respect 86dvh and all safe-area insets.

Required verification:
- Existing npm test and production build.
- Existing route resume and layout suites.
- New computed type-size, safe-area, overlay, single-scroll, hidden-zero-status, route-label, and primary-action assertions.
- Named screenshots at 390 by 844, 844 by 390, and 1440 by 900 for slice-title, slice-hero, slice-route, slice-market, slice-combat-open, slice-combat-impact, slice-result, slice-reward, and slice-return.
- Actual-phone captures of the same named set, normal motion and reduced motion.
- Performance evidence against the audit budgets.
- A diff statement proving no engine, balance, route-choice, save, receipt, reward, report, or unlock semantics changed.

Stop after the vertical slice and present:
1. the exact file set,
2. screenshots and motion clips,
3. local verification,
4. performance evidence,
5. known deviations from the audit,
6. a direct pass or fail recommendation.

Do not broaden into the full visual project until Robbie approves the named actual-phone slice set.
```
