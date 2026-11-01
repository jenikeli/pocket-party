# Task queue: M7d4c3 to M7d4d (the kit's objects, close to MK8DX)

The four remaining look parts of M7d4 (plan.md), planned together in one chat on 2026-11-01 and built as a queue
of tasks by `implementer` subagents, at most 3 at a time (kit-shots lets 2 runs draw at once; the rest wait). Each implementer is told one task letter; everything it
needs is here. The main session keeps the Status column up to date. At the handoff this file is folded into
`docs/history.md` and deleted.

| Task | Part | What | Model | Waits for | Status |
|---|---|---|---|---|---|
| 0 | prep | Materials into each piece's own file, thatch and stone textures split out, kit-shots pieces for c4 to d | sonnet | none | merged |
| A | c3 | Promenade railing and padded sponsor wall | sonnet | none | merged |
| B | c3 | Grandstand | opus | none | merged |
| C | c3 | Floodlight, bunting, sponsor stand, MKTV van | sonnet | 0 | merged |
| D | c4 | Palm, taking the Blender palm's look into JS | opus | 0 | merged |
| E | c4 | Parasols, loungers, surfboards, lifebuoys, barrels | sonnet | 0 | merged |
| F | c4 | Street lamps | sonnet | 0 | merged |
| G | c5 | Cones, tyre stacks, warp pipes, giant mushrooms | sonnet | 0 | merged |
| H | c5 | Round trees, hedges, planters | sonnet | 0 | building |
| I | c5 | Relief on the decks' wood and paving | sonnet | 0 | merged |
| J | d | Lighthouse | sonnet | 0 | merged |
| K | d | Stilt huts | sonnet | 0 | building |
| L | d | Koopa shell | sonnet | 0 | building |
| M | d | Cliffs, floating islands and the beach islands' rocks | opus | 0 | queued |
| N | d | A motor yacht among the sailboats, sailboats detailed | sonnet | 0 | queued |
| O | d | Clouds, balloons, airship, trusses | sonnet | 0 | dropped |

## Rules for every task

- **Since Task 0:** every prop and landmark builder takes the kit and returns its parts as
  `[{ geometry, material }]` (`kit.materials` holds plastic, painted, iron and glass); the placing code only
  places. kit-shots has a piece for every object (`host/kit-shots/pieces.js`, `landmark-pieces.js`); a piece's
  `focus.eye` sets the near view's height.

- **Read first:** `CLAUDE.md`; in `docs/mk8dx-reference.md`, "The kit's objects up close (M7d4 study, to be
  reviewed)" (the six points under "What every MK8DX object has that ours lack", and your objects' notes) and
  "How games look detailed and still run smoothly"; then your files and the files that call them.
- **Techniques** (M7d4b2's, fixed): small detail (seams, bolts, grain, stitching, creases, grime) drawn in maps
  with `kit/surface-maps.js` (colour, normal, shade (AO) and roughness from one height field; examples:
  `kit/gate-post-detail.js`, `kit/striped-rail-detail.js`, `kit/sponsor-wall-detail.js`, `kit/palm-textures.js`);
  shapes that change the outline built with bevels (`roundedBox`, `roundedCylinder` in `shape-utils.js`; the
  barriers' profiles with `kit/extrude.js`); dark creases where parts meet (`shaded` in `shape-utils.js`, or the
  shade map). The course also bakes shade and takes its light from the course: nothing to do for those.
- **Budgets:** triangles barely cost on the iPad (M7d4b1), but a part repeated hundreds of times (posts, seats,
  props in rows) is chamfered (`roundedBox(..., { chamfered: true })`) or kept to few segments. Texture memory is
  the new risk: each map at most 512x512 for a prop or barrier tile, 1024x1024 for one big object; report the
  texture pixels you add. Bloom and shadows are what cost: nothing new should glow, and parts under about 0.6 in
  size need not cast shadows.
- **Footprint:** keep each piece's size, where it stands and how far it reaches from its spot (`PROP_REACH` in
  `kit/layout-rules.js` for props, the layouts' sizes for landmarks) as now or smaller. If it truly must grow,
  stop and report it: the main session owns `kit/layout-rules.js` and the layouts.
- **Judge by eye, in rounds:** at your start, `npm run kit-shots -- --name <task letter>-before <your pieces>`;
  look at your shots (Read the PNGs in `test-results/review/shots/`), against the study's notes for them; build;
  shoot again and fix what looks wrong, at least two rounds; finish with `--name <task letter>-after`. One
  kit-shots run at a time, and only your pieces (other implementers share the machine). kit-shots is allowed;
  browser tests are not.
- **Tests:** a new unit test file, `test/unit/kart-3d-<your task's short name>.test.js`, for what a test can
  check (the builder's parts and their materials, the footprint and reach, no NaN in positions, the triangle
  count of a part repeated many times, map sizes). `npm test` passes before you commit.
- **Own files only:** edit only the files your task lists (and new files it names or that you add under
  `host/games/kart-3d/kit/` for your pieces). Never edit `plan.md`, `docs/`, the layouts or another task's files;
  report instead.
- **Report back,** short: the files and what each does now; decisions the task did not spell out; triangles before
  and after for each piece (one instance); texture pixels added; the `npm test` result; and the absolute path of
  your after sheet (`<your worktree>/test-results/review/<letter>-after.png`).

## Task 0: prep (materials into the pieces, textures split, kit-shots pieces)

**Goal:** let every later task change its pieces without touching a shared file. No visual change at all.

1. **Common materials in the kit.** `createKit` (`kit/kit.js`) adds `materials: { plastic, painted, iron, glass }`,
   made once, exactly as `kit/props.js` makes them today (move `GLASS` with them).
2. **Each piece makes its own materials.** Every prop and landmark builder takes the kit first and returns its
   parts as `[{ geometry, material }]`, making with `kit.keep` (and keeping) whatever geometry, material and
   texture it needs, or using `kit.materials`, `kit.textures`, `kit.sponsors` and `kit.palm`. The placing code keeps
   only placing:
   - Props (`kit/props.js`): `buildCone(kit)`, `buildTyreStack(kit)`, `buildWarpPipe(kit)`,
     `buildGiantMushroom(kit)`, `buildMktvVan(kit)`, `buildLanternLamp(kit)`, `buildTripleLamp(kit)`,
     `buildFloodlight(kit)`, `buildPalm(kit)`, `buildParasol(kit)`, `buildLounger(kit)`, `buildSurfboards(kit)`,
     `buildLifebuoyPost(kit)`, `buildBarrels(kit)`, `buildRoundTree(kit)`, `buildHedge(kit)`, `buildPlanter(kit)`,
     each returning parts. `propParts(kit)` in `props.js` becomes a plain table of name to builder. The sponsor
     stands' merging (`buildStands`) moves into `kit/sponsor-stand.js` as `buildSponsorStands(kit, frames)`, which
     returns the meshes to add; `props.js` passes it the stands' frames.
   - Seaside's sea (`seaside-surroundings.js`): `buildLighthouse(kit, height)`, `buildStiltHut(kit)`,
     `buildKoopaShell(kit)`, `buildSailboat(kit)` return parts; `buildBeachIslands(kit, islands, seaLevel)` returns
     `{ parts, foam, palms, huts }` (foam: the material whose opacity the course animates). Keep the meshes'
     shadow settings, `keepWhole` and placement exactly as now.
   - Seaside's sky (`seaside-sky.js`): `buildFloatingIslands(kit, islands)` and
     `buildBackdropCliffs(kit, cliffs, seaLevel)` return parts (the grass and rock materials move into
     `kit/floating-island.js`); `buildRoundTree(kit)`, `buildCloud(kit)`, `buildBalloon(kit, colors)` return parts
     (the balloons may share one material made once per kit, or each make their own: few balloons).
   - Not changed: the grandstand, bunting, barriers, start gate and lights, decks, supports and trusses (they
     already make their own), the airship (already takes the kit).
3. **Textures split.** `createThatchTexture` moves from `kit/seaside-textures.js` into a new
   `kit/thatch-texture.js`, `createStoneTexture` into a new `kit/stone-texture.js`, unchanged.
   `seaside-textures.js` keeps the wood and sand.
4. **kit-shots pieces** (`host/kit-shots/pieces.js`, and `viewer.js` if needed) for every object of tasks D to O
   that has none yet, each framed so its shots show it whole (`above`) and its detail (`near`): decks
   (`deck-boards`, `deck-paving`, `deck-grass`, `deck-sand`: a deck along the right of the straight, as a layout
   places one), `lighthouse`, `stilt-hut`, `koopa-shell`, `beach-island`, `floating-island`, `backdrop-cliff`,
   `sailboat`, `cloud`, `balloon`, `airship`, `truss` and `pier` (the supports). Pieces that stand in the sea need a
   sea: give a piece an optional `sea: true` that makes the viewer add the race's sea (`scenery.js`'s and
   `kit/sea.js`'s way) at a level a little under the road, and place the piece in it beside the road. Run every
   new piece once with kit-shots and look at the shots.
5. **Tests:** the existing unit tests must pass unchanged (the seaside and Test track layout checks, the kit
   tests); add `test/unit/kart-3d-kit-parts.test.js`: every prop builder returns parts with a geometry and a
   material, and `buildProps` adds the same number of meshes as before for the Test track's layout.

**Files it owns:** `kit/kit.js`, `kit/props.js`, `kit/sponsor-stand.js` (the move only), `seaside-surroundings.js`,
`seaside-sky.js`, `kit/seaside-textures.js`, new `kit/thatch-texture.js` and `kit/stone-texture.js`, and the
signature and material lines of `kit/small-props.js`, `kit/mktv-van.js`, `kit/street-lamps.js`,
`kit/floodlight.js`, `kit/palm.js`, `kit/beach-props.js`, `kit/garden-props.js`, `kit/lighthouse.js`,
`kit/stilt-hut.js`, `kit/koopa-shell.js`, `kit/sailboat.js`, `kit/beach-island.js`, `kit/floating-island.js`,
`kit/clouds.js`, `kit/balloon.js`; `host/kit-shots/pieces.js`, `host/kit-shots/viewer.js`; the new test file.
Tasks A and B run at the same time and own other files.

**Check before committing:** kit-shots of `cone palm lantern-lamp mktv-van sponsor-stand` look as on the
`before` sheet in the main checkout (`/home/ruijia/projects/pocket-party/test-results/review/before.png` has the
last two).

## Task A (c3): the promenade railing and the padded sponsor wall

Pieces: `promenade-rail`, `sponsor-wall` (kit-shots). Both line Seaside Skyway and the Test track
(`seaside-layout.js`, `test-track-layout.js`). Keep `createPromenadeRail(kit)` and `createSponsorWall(kit)`
returning `{ add, end, meshes }` for `kit/barriers.js`, and nothing nearer the road than now (the pillars stand
in from the road's edge by at least 0.05; move the railing's line out if they grow).

- **Promenade railing** (Daisy Circuit's, study "Promenade railing", checked again): toy proportions. Posts about
  twice as fat (radius about 0.08), each with a flared foot and a collar, and a ball cap about twice the post's
  width; rails fatter (radius about 0.05). Pillars bigger (about 0.7 square, shaft about 1.3 high) of dressed
  stone blocks with mortar joints in relief (maps, a new `kit/promenade-detail.js`), on a plinth, under an
  overhanging cap slab; a round plaque on the faces with Daisy's flower in relief, gold on brown, with a raised
  rim (maps); every other pillar carries a lantern (a short iron post, a four-sided lantern of framed panes with a
  pyramid roof and a finial; glass as `kit.materials.glass` would be, warm, not glowing; it may make its own glass
  material if Task 0 is not merged yet, matching `GLASS` in `kit/props.js`).
- **Padded sponsor wall** (study "Padded wall with sponsor boards"): already close. Fix the hatched pattern seen
  along the wall's foot on `before.png` (the kick strip or the ledge under it: find out which and why). The fence's
  posts get a foot (a plate bolted to the pad's top) as well as their collar and cap. The chain-link gets
  thickness and relief (its own normal map; galvanised, a little darker and less flat than now), and a rail along
  its bottom where it meets the pad. The boards' raised rim a little wider so it reads from a kart. In
  `kit/sponsors.js`, the Bullet Bill board's words draw as a black blob (its outline and fill are both near black):
  make it read, as the others do.

**Files:** `kit/promenade-rail.js`, new `kit/promenade-detail.js`, `kit/sponsor-wall.js`,
`kit/sponsor-wall-detail.js`, `kit/sponsors.js`, new `test/unit/kart-3d-barrier-detail.test.js`.

## Task B (c3): the grandstand

Piece: `grandstand` (kit-shots). Placed by both courses (`GRANDSTAND` in the layouts: 44 long on Seaside, 36 on
the Test track). Rebuild it to the study's "Grandstand" (Toad Circuit's): two decks of stepped seating, the
steps reading as steps (a riser and a tread with a bevelled nose, seats on them: rows of single seat shells,
chamfered, or a bench with seat backs in maps), each deck on silver lattice truss columns; a cantilevered roof
with a railing along its front edge and a MARIO KART fascia on its front; stairs at both ends, inside its length;
the sponsor boards along the front wall (`sponsorUv` from `kit/sponsors.js`, as now); the crowd of Toad-like
spectators on both decks, hopping as now (keep `userData.keepWhole` on the crowd's meshes and no crowd shadows).
No floodlights on it (the user's choice). The roof's underside should not read as a flat dark slab.

- **Interface:** `buildGrandstand(length, kit)` returns `{ object, update(dt) }` as now; standing on y = 0 with
  its front at z = 0, facing +z.
- **Footprint:** at ground level within its length and from z = 0 back to z = -7.2 (the layout checks'
  `GRANDSTAND_DEPTH`); below 4 units high nothing in front of z = 0; the roof may overhang up to 1.0 toward the
  road above that. Height up to about 9.
- Split by responsibility: `kit/grandstand.js` (assembly and boards), new `kit/grandstand-structure.js` (decks,
  trusses, roof, stairs), new `kit/grandstand-crowd.js` (the crowd and its hopping).

**Files:** `kit/grandstand.js`, new `kit/grandstand-structure.js`, new `kit/grandstand-crowd.js`, new
`test/unit/kart-3d-grandstand.test.js` (footprint, the crowd sits on seats on both decks, update moves them).

## Task C (c3): floodlight, bunting, sponsor stand, MKTV van

Pieces: `floodlight`, `bunting`, `sponsor-stand`, `mktv-van` (kit-shots). Builders as Task 0 left them.

- **Floodlight tower** (Test track): a chunkier mast (bevelled legs and braces, still a lattice), a concrete foot,
  a ladder up one side, a service platform with a railing under the head, and the head a white (light grey) box in
  a frame with a grid of round lamps, each sunk in a hood with a reflector behind its glass. Lamps are not lit by
  day (glass as now).
- **Bunting** (both courses, across the road): the pennants read pastel from the road (they draw dark and muddy on
  `before.png`: find out why, the lighting of a double-sided cloth or its normals), with a cloth weave in relief
  and a hem folded over a fatter rope; a slight curl so they are not flat cards; the poles with a foot, collars and
  a cap or finial. Same heights and spacing.
- **Sponsor stand** (study "Sponsor stand", Mario Circuit's): one board facing the road in a frame with a raised
  rim, on two bevelled legs with feet; the board's back plain painted. Each stand keeps its own brand.
- **MKTV van** (study "MKTV van"): a windscreen in a frame, a grille and headlights, side mirrors, bumpers, door
  seams and handles, hubcaps on tyres with a sidewall, a roof rack with the dish on a mount (the dish must read
  from both sides: it nearly vanishes on `before.png`), and a Toad with a TV camera on the roof (new
  `kit/mktv-toad.js` if it helps). The MKTV boards stay on both sides.

**Files:** `kit/floodlight.js`, `kit/bunting.js`, `kit/sponsor-stand.js`, `kit/mktv-van.js`, new
`kit/mktv-toad.js`, new `test/unit/kart-3d-start-props.test.js`.

## Task D (c4): the palm

Pieces: `palm`, `palm-close`, and for reference `palm-blender`, `palm-blender-close`, `palms-side-by-side`
(kit-shots). On the M7d4c2 device run the user found the palm made in Blender (`assets/models/palm.glb`, built
by `tools/blender/palm.py`) clearly better than ours, above all close up: a stack of scalloped scales with a dark
crease under each, and a fuller crown. Seaside Skyway stays all Three.js (the user's decision), so bring ours as
close to Blender's as JS allows: read `palm.py` for how its trunk and fronds are shaped (32 columns round, so a
scallop can be round; scale shells overlapping; fronds of real blades), and match its proportions, silhouette,
scale shape, crease and crown. Up to about 4,000 triangles is fine (Blender's has 4,128). Keep `buildPalm(kit)`
(Task 0 named it `buildPalmParts(kit)`; `buildPalm()` returns the bare `{ trunk, fronds }` the palm test uses) and `createPalmMaterials(keep)` (used by `kit/kit.js`); the palm's height, lean and foot stay as the study's spec
in "M7d4c2" of `docs/3d-findings.md`. The `palms-side-by-side` shot is your main check.

**Files:** `kit/palm.js`, `kit/palm-trunk.js`, `kit/palm-textures.js`, new files for the palm if needed, new
`test/unit/kart-3d-palm-look.test.js` (the existing `kart-3d-palm.test.js` may be updated where the shape
changed on purpose; say so).

## Task E (c4): the beach props

Pieces: `parasol`, `lounger`, `surfboards`, `lifebuoy-post`, `barrels`. Study "Beach props" and "Tyre stacks and
drums".

- **Parasol** (Toad Harbor): ribs under the canopy, a scalloped edge, a pole with a joint and a foot; bright
  single colours or stripes as now.
- **Lounger:** slatted (slats in maps or shapes), a frame, the towel with a fold.
- **Surfboards:** rounded rails, a stripe, a fin, a rack or sand they stand in.
- **Lifebuoy post:** the ring's red and white bands and a rope round it, on a capped post with a hook.
- **Barrels:** yellow oil drums with ribs (rolling hoops), a lid rim and a printed label (a checkered flag or a
  mushroom).

Split `kit/beach-props.js` by piece if it grows past about 200 lines.

**Files:** `kit/beach-props.js`, new files for these pieces, new `test/unit/kart-3d-beach-props.test.js`.

## Task F (c4): the street lamps

Pieces: `lantern-lamp`, `triple-lamp`. Study "Street lamps" (Toad Harbor's single lamp: dark iron post with gold
bands, a spike finial and a scrolled bracket holding a round globe; Daisy Circuit's triple: three four-sided
lanterns with pyramid roofs and finials on a crossbar, the post on a square stone pedestal with a plaque, flaring
at its foot with collar rings). Glass warm, not glowing. They stand in rows (dozens): chamfer the small parts.

**Files:** `kit/street-lamps.js`, new files for these pieces, new `test/unit/kart-3d-street-lamps.test.js`.

## Task G (c5): the circuit props

Pieces: `cone`, `tyre-stack`, `warp-pipe`, `giant-mushroom`. Study "Cones", "Tyre stacks and drums", "Warp pipes
and giant mushrooms": striped cones on a bevelled square base; tyres with a deep tread and a rounded sidewall,
four or five high; the warp pipe glossy green with a fat rim lip, a dark inside and a highlight down its side; the
mushroom's cap glossy with a soft thick rounded rim, gills under it, a cream stem widening at its foot. Cones stand
in rows of dozens: keep them light.

**Files:** `kit/small-props.js`, new files for these pieces, new `test/unit/kart-3d-circuit-props.test.js`.

## Task H (c5): the garden props

Pieces: `round-tree`, `hedge`, `planter`. Study "Trees" and "Hedges and flowers": the round tree a canopy of three
or four tiers of overlapping leaf scales (each a curved plate with a rounded tip, lighter on top, darker
underneath) on a short thick trunk flaring at the root; the hedge a loaf with a furry leaf texture in relief and
big five-petal pink flowers with yellow middles; the planter a terracotta pot with a rim, flowers in it. The round
tree also stands on every floating island (`seaside-sky.js`, scores of them): keep it under about 1,500 triangles. Since Task 0 both uses share `kit.materials.painted` (roughness 0.6), where the sky's trees had their own at 0.85: give the tree its own material, whichever looks right.

**Files:** `kit/garden-props.js`, new files for these pieces, new `test/unit/kart-3d-garden-props.test.js`.

## Task I (c5): the decks

Pieces: `deck-boards`, `deck-paving`, `deck-grass`, `deck-sand` (kit-shots, from Task 0). The decks' tops are
plain tiled textures (`GROUND` in `kit/platform.js`); give them relief: the boardwalk's planks with seams, grain
and nail heads (normal and shade maps), the paving as laid stones with joints in relief (its own texture, not the
concrete), sand with ripples. The decks' concrete sides get a coping along the top edge and a darker band low
down (the study's "ledge" note). Wood and sand are drawn in `kit/seaside-textures.js` and also used by the rail
fence and the huts: changing them changes those too, which is fine if they still look right (check `rail-fence`
with kit-shots).

**Files:** `kit/platform.js`, `kit/seaside-textures.js`, the textures section of `kit/kit.js`, new files for the
decks' maps, new `test/unit/kart-3d-decks.test.js`.

## Task J (d): the lighthouse

Piece: `lighthouse`. Study "Lighthouse" (Daisy Circuit's): irregular stones (crazy paving, not rows of blocks)
with deep mortar in relief; white arched window frames; a smooth tan plinth; a green balcony ring with a railing of
balusters; a white lamp room with orange window frames; a glossy orange dome; a green clover-shaped weathervane on
top. Keep `lighthouseTop(height)` right if anything uses it, and the tower's height and footprint.

**Files:** `kit/lighthouse.js`, `kit/stone-texture.js`, new files for it, new `test/unit/kart-3d-lighthouse.test.js`.

## Task K (d): the stilt huts

Piece: `stilt-hut`. Study "Stilt huts" (Cheep Cheep Beach's): a thick thatch roof with a ragged, layered edge and a
ridge cap; plank walls (the wood's relief); a deck with plank rails and flower boxes of red flowers; white posts
with a rope rail along the walkway. Same size and stilts.

**Files:** `kit/stilt-hut.js`, `kit/thatch-texture.js`, new files for it, new `test/unit/kart-3d-stilt-hut.test.js`.

## Task L (d): the Koopa shell

Piece: `koopa-shell`. Study "Koopa shell" (Koopa Cape's): grooved scutes on the green dome with relief, a rim of
fat rounded white lobes (each scute's edge a separate puffy pad), a dark underside. Same size; it lies half sunk.

**Files:** `kit/koopa-shell.js`, new files for it, new `test/unit/kart-3d-koopa-shell.test.js`.

## Task M (d): cliffs, floating islands and the beach islands' rocks

Pieces: `floating-island`, `backdrop-cliff`, `beach-island`. Study "Cliffs and floating islands" (Mario Circuit's,
Toad Circuit's): rock as big rounded slabs with dark seams between them, warm tan to orange (in shape and in
maps); the grass on top a thick slab with a rounded lip hanging over the rock. The beach islands' rocks to match.
Seen from far away: put the detail in maps rather than triangles. Since Task 0 the floating islands and the backdrop cliffs each draw their own rock texture: draw it once per kit and share it. Same sizes and places
(`seaside-landmarks.js`); the seaside layout tests check that nothing reaches the road.

**Files:** `kit/floating-island.js`, `kit/beach-island.js` (its rocks; the land, shallows and foam may stay), new
files for the rock's maps, new `test/unit/kart-3d-islands.test.js`.

## Task N (d): the boats

Pieces: `sailboat`, and a new `motor-yacht` piece (add it to `host/kit-shots/pieces.js`, the one task after Task 0
that edits that file). Study "Boats", checked again: a motor yacht like Daisy Circuit's (a raised bow with a curved
sheer line, a rail of posts round its foredeck, a cabin with big brown-framed windows and a lifebuoy on its side,
a flybridge on top with a rail and a frame over it, a flat transom with a swim platform); about half of
`BOATS` in `seaside-landmarks.js` become yachts (give each boat a `kind`), the rest stay sailboats, which get
rails, portholes and a fender line. They bob as now (`keepWhole`).

**Files:** `kit/sailboat.js`, new `kit/motor-yacht.js`, `BOATS` in `seaside-landmarks.js`, `addBoats` in
`seaside-surroundings.js`, `host/kit-shots/pieces.js` (the new piece), new `test/unit/kart-3d-boats.test.js`.

## Task O (d): clouds, balloons, the airship and the trusses

Dropped by the main session after Task 0's shots of them: as the study says, they look close enough already, and
they are seen only from afar.
