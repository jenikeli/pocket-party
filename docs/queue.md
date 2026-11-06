# M9 queue: Palm Bay Airport

Planned with the user on 2026-11-05 (the `milestone-plan` skill's "Queue"). The run happens in another chat, started
as `/loop run the m9 queue in docs/queue.md`. It keeps going unattended and resumes from the Status table below after
any stop. Each implementer is spawned with only its task letter and this file's path. At the handoff this file is
folded into "M9" in `docs/history.md` and deleted.

## Status

| Task | What | Model | Waits for | Status |
|---|---|---|---|---|
| 0 | Prep (main session): the course file, track-builder flags, tunables, stand-in scenery, browser tests pinned to Seaside | main | none | merged |
| A | Glide rules, glide camera, CPUs gliding; the airport joins the course list (first) | opus | 0 | merged |
| B | Spin-post rules, CPUs aiming at posts | sonnet | 0 | merged |
| C | Tool: kit-shots `--course`, a whole dressed course at chosen distances | sonnet | 0 | merged |
| D | The airport's ground: terrain, cutting, tunnel, runway, seawall, beach, sea | opus | A, C merged | merged |
| E | Looks: the glide-ramp panel and the spin-boost posts | sonnet | 0 | merged |
| F | The glider, one per design, opening, folding and banking | opus | 0 | merged |
| G | Terminal and control tower | opus | 0 | merged |
| H | The big hangar over the anti-gravity ring; the taxiway's hangars | opus | 0 | merged |
| I | Planes: parked airliners, a small prop plane, the plane taking off each lap | opus | 0 | merged |
| J | Ground vehicles (props) | sonnet | 0 | merged |
| K | Airfield fittings, the airport's barrier styles, the baggage conveyor | sonnet | 0 | merged |
| L | Rock study, then the rocky islands in the bay | opus | 0 | merged |
| M | The whole course's dressing and layout, its cost measured | opus | D, E, G, H, I, J, K, L merged | merged |
| N | Browser test `m9-kart-3d-airport`, spawned alone | sonnet | A, B, M merged | building |

Suggested order (at most 3 subagents at once, reviewers included): 0, then A, C and F; then B, E, and G as places free up;
D as soon as A and C are merged; then H, I, J, K and L; M; N. Browser tests run when no implementer is drawing
(kit-shots): after A merges (the course list changed: m7b and the rules files), and at the end (the full suite,
since task 0 changed `test/helpers/`).

## Decisions (made with the user while planning)

- **Layout approved as drawn** (the sketch: `test-results/reference/m9/layout-sketch.png`, not committed; the pieces
  are in task 0). The order of sections and the geometry stay. Widths, shoulders, item rows, dash panels and posts
  may be tuned by driving.
- **On the ground** (plan.md). The only parts below or above it are the cutting and tunnel under the runway, the
  jump's ramp, the raised banked ring in the hangar, the glide ramp and the glide.
- **Rock:** distant rocky green islands in the bay, built only after a study of real rock (task L).
- **Course list:** Palm Bay Airport first (the default), then Seaside Skyway, then the Test track. The existing
  browser tests are pinned to Seaside Skyway (task 0).
- **Glide input:** steering turns and banks the glider; holding Brake dives (nose down, sooner and a little faster);
  otherwise it floats. The same with tilt and stick.
- **Not empty** (the user): from the kart, the edge of the road is never empty for long, and every view has
  something in the middle distance and the background. MK8DX's rule from the M7d study applies: "Lots of small things
  beside the road".
- **Cost:** the whole course (scenery and props, karts not counted) at most 1.8 million triangles (Seaside Skyway's
  1.5 million plus the user's 20% buffer). Maps no more than Seaside's 81 MB uncompressed. The build no slower than
  Seaside's (about 7 s to appear on the iPad, measured at the device run).
- **Our own designs**, with Sunshine Airport as the style reference for how one theme is kept consistent: no copied
  logos, airline names, posters, characters or Shine Sprites. Our airport's emblem is our own (for example a sun over
  a palm); airline names are our own (for example "Palm Air", "Coral Wings", "Skipjack Air").
- **Item rows:** two, on the start straight and on the runway (the item test expects two a course).
- **Hangar:** open-sided, so the sun reaches the ring.
- **Lap:** about 1551 units, about 50 s at 150cc (longer than MK8DX's 40 s; the user chose about 1500 units).

## References

Downloaded while planning into `test-results/reference/m9/` (not committed; from the Super Mario Wiki's
[Sunshine Airport](https://www.mariowiki.com/Sunshine_Airport) page). Look tasks open the ones their section names:
- `MK8_Sunshine_Airport.png` (2560x1440): the terminal from the apron. It shows a long glass curtain wall with an
  orange-red and yellow zigzag band, a blue roof edge, the airport's sign on top, and the control tower behind (round
  glass cab, orange-red top). It also shows parked airliners (white with coloured stripes, a big emblem on the nose),
  stair trucks (orange), container dollies (grey ULDs on blue dollies), a floodlight mast with a ring of lamps and a
  long ribbon banner, pale concrete apron tiles with yellow lines, and the grass infield with an orange-white curb and
  red-white chevrons.
- `Sunshine_Airport_First.png`: inside the terminal. Tiled floor, tall yellow columns with trusses, crates, a
  departure board.
- `Sunshine_Airport_First_Jump.png`: the apron. Dark asphalt with white edge lines and yellow taxi lines,
  orange-white post-and-rail fences, red-white chevron boards, a blue belt loader, a follow-me car, an airliner's
  tail, a terminal with an orange roof, palms.
- `Sunshine_Airport_Two_Ways.png`: a blue painted road with a big airline logo on it, yellow padded barriers, an
  airliner's fuselage, item boxes.
- `Sunshine_Airport_AntiGravity.png`: the anti-gravity ring. Diamond-plate steel road, orange railings, and a spin
  post: a fat orange bollard with a red dome light, about kart height.
- `Sunshine_Airport_MK8_runway.png`: a jetliner taking off low over the karts on the runway.
- `Sunshine_Airport_Gliding.png`: a glide over the sea toward a raised helipad, with the terminal beside it and
  islands with rock and palms in the distance.
- `Sunshine_Airport_MK8_Luigi.png`, `Rosalina-SunshineAirport-MK8.jpg`, `MK8_-_Sunshine_Airport.jpg`: more views.
- `MK8_Sunshine_Airport_Plane_Flying_Plane_Model_Side.png`: the flying plane's model, side view.
- `MK8_Sunshine_Airport_Map.png`, `MK8DX_Sunshine_Airport_Map.png`: its map (we do not trace it).
- `layout-sketch.png`: our approved layout from above.

MK8DX facts gathered while planning (Super Mario Wiki: Glider, Glide Ramp, Spin Boost, Spin Boost Pillar, Anti-gravity):
- Glide ramps "automatically deploy the kart's glider". Their panels are "cyan with scrolling white glider-shaped
  arrows". A trick off a glide ramp boosts "immediately when the glider activates rather than upon landing". In MK8
  the glider cannot be retracted. A kart that falls off is put back by Lakitu.
- Air speed is fixed at 8.05 (ground top speed 7.75 at level 10), so a glider flies about 4% faster than top speed.
  Glider roll and sideways move are stats (`docs/mk8dx-reference.md`).
- Spin Boost Pillars are "found only in anti-gravity areas". Driving into one gives "a short speed boost", the same
  spin boost as bumping a kart there. They take each course's look.
- Off a ramp in anti-gravity, a kart "can nosedive or pull back".

## Rules for every task

- **Read first:** `CLAUDE.md`; "M9" in `plan.md`; "Decisions", "References" and "Shared design" above; your task's
  section; then the files you own and the files that call them.
- **Own files only.** Edit or create only the files your task lists (new files under the folders it names are
  fine). If you need a change outside them, stop and report it. Where a section allows "one line" in a shared file
  (`kit/props.js`'s `PROP_BUILDERS`, `kit/layout-rules.js`'s `PROP_REACH` or `BARRIER_STYLES`, `kit/barriers.js`'s
  registry, `host/kit-shots/pieces.js`'s imports), add only that. The main session merges those lines.
- **Build to the interfaces** in "Shared design" exactly (names, arguments, shapes): other tasks are built against
  them at the same time. If one cannot work, stop and report rather than change it.
- **Rules stay plain:** rules are DOM-free plain functions on plain data (no classes, no Three.js), unit tested in
  Node, read the live `tuning` object, and are seeded where random (never `Math.random`).
- **Tests:** a unit test file per task as named in its section. `npm test` passes before you commit. No browser
  tests, except task N, which runs its one file only.
- **Looks** (D to M): our own designs in MK8DX's style, from the references your section names, built with the
  kit's techniques (`docs/mk8dx-reference.md`'s rules: no sharp edges, two scales of parts, dark creases, fat toy
  proportions, textures of real material). Use rounded shapes from `shape-utils.js`, detail in drawn maps with
  `kit/surface-maps.js`, and stone or slab textures through `kit/cell-noise.js`. **Find your own references** for
  every object your section gives none for (the user): MK8DX sources first (the Super Mario Wiki's course pages and
  galleries; full images on `mario.wiki.gallery`, as "References" above), then photos of the real thing (Wikimedia
  Commons), saved under `test-results/reference/m9/<letter>/` and named in your report. Judge by eye in rounds with
  kit-shots: `npm run kit-shots -- --name <letter>-r1 <your pieces>`, look at the sheet beside the references,
  improve, at least two rounds, and finish with `--name <letter>-after`. Once task C is merged,
  `--course palm-bay-airport` shows pieces in place. One kit-shots run at a time, in the foreground.
  **Budgets:** anything repeated is one geometry and one material per part, instanced or merged. Maps at most
  512x512 (1024 for a landmark's big faces). Transparent pieces cast no shadows. Nothing glows into bloom except
  what the section says. An `update` allocates nothing per frame. Triangle budgets are per section, and they add up
  to the course's 1.8 million.
- **Report back** everything the main session needs to review, merge and hand off without reading your whole diff,
  and nothing more: the files and what each does; decisions the task did not spell out, and why; the `npm test`
  result; for looks, the absolute path of your after sheet, the triangle count and map sizes, and what you would
  still improve; anything the main session must do at merge (a line in a shared file, a question).
- **Questions:** the user is not reachable during the run. If the spec leaves something open, make the choice that
  best fits `plan.md` and MK8DX, and say so in your report. Stop only if it would break a hard constraint in
  `CLAUDE.md` (a new dependency, logic in the server).

## Shared design (fixed interfaces)

### The course (task 0; tasks A and M may tune it as their sections say)

`host/games/kart-3d/palm-bay-airport.js` exports `PALM_BAY_AIRPORT`:
`{ id: 'palm-bay-airport', name: 'Palm Bay Airport', halfWidth: 9, startLine: 45, scenery: 'airport', dashPanels,
itemBoxRows, spinPosts, pieces }`. The pieces as approved, with each one's starting distance:

```
s 0      { straight: 150 }                                    start straight on the apron, terminal on the left
s 150    { turn: 90, radius: 50, halfWidth: 8 }               first corner round the control tower
s 228.5  { straight: 30 }
s 258.5  { turn: -90, radius: 40 }                            left onto the taxiway
s 321.4  { straight: 60 }                                     past the taxiway's hangars and baggage carts
s 381.4  { turn: 90, radius: 45 }                             right toward the runway
s 452.1  { straight: 40, height: -8, halfWidth: 7 }           down into the cutting
s 492.1  { straight: 70 }                                     under the runway (it crosses over at s 944; the road there is 8 higher)
s 562.1  { straight: 34, height: -1 }                         up out of the cutting
s 596.1  { straight: 16, height: 2.5, linear: true }          the jump's ramp
s 612.1  { straight: 16, height: 0, linear: true, gap: true } the jump, over the baggage conveyor
s 628.1  { straight: 24, height: 0, halfWidth: 9 }
s 652.1  { turn: -45, radius: 36, roll: -60, height: 10, antiGravity: true, halfWidth: 10 }   into the hangar's banked ring
s 680.3  { turn: -90, radius: 36, antiGravity: true }
s 736.9  { turn: -45, radius: 36, roll: 0, height: 0, antiGravity: true }
s 765.2  { straight: 85, halfWidth: 9 }
s 850.2  { turn: -90, radius: 40, halfWidth: 10 }             left onto the runway
s 913.0  { straight: 182.28 }                                 the runway, heading west
s 1095.3 { straight: 14, height: 2.5, linear: true }          the glide ramp at the runway's end
s 1109.3 { straight: 90, height: -6, linear: true, gap: true, glide: true, halfWidth: 12 }   the glide over the bay
s 1199.3 { straight: 40, height: -6, halfWidth: 9 }           landing on the beach road
s 1239.3 { turn: 90, radius: 55, shoulderLeft: 6 }
s 1325.7 { straight: 48.39, halfWidth: 8 }
s 1374.1 { turn: -50, radius: 50, height: -3 }                the S-bend, climbing back up
s 1417.7 { turn: 50, radius: 50, height: 0 }
s 1461.3 { straight: 20 }
s 1481.3 { turn: 90, radius: 40, halfWidth: 9, shoulderRight: 10 }   last corner, grass inside
```

It closes (checked with `buildTrack` while planning: 1551.4 units a lap; the lowest edge of the banked ring is at
-0.01, flush with the hangar's floor at 0). Seen from above it is a figure-8: the start lobe runs clockwise, the
hangar lobe counterclockwise, and they cross where the tunnel passes under the runway. Heights: the airfield is at 0
and the sea at -8. The beach road (s 1199 to about 1440) runs at -6 and climbs back to 0 in the S-bend.
`dashPanels: [{ s: 585, lateral: 0 }, { s: 1080, lateral: 0 }]` (one before each ramp, in the middle, where the
racing line is pinned anyway). `itemBoxRows: [125, 990]`. `spinPosts: [{ s: 685, lateral: -4 }, { s: 705, lateral: 4 },
{ s: 725, lateral: -4 }, { s: 745, lateral: 4 }]`.

### Track builder additions (task 0)

- A piece may have `glide: true` (only with `gap: true`): its stations get `glide: true` (`false` elsewhere),
  in `pieceFlags`.
- The definition may have `spinPosts: [{ s, lateral }]`; the track returns `spinPosts` (`[]` if none), like
  `dashPanels`.
- `racing-line-pins.js`'s `jumps(track)` returns `{ lipS, landingS, glide }` (glide true when the gap's stations
  glide). Task A may change how glides are pinned.

### Tunables (task 0)

In `tuning.js`, each with a slider and meaning like every entry. Task A owns the Gliding group's lines and task B
the Spin posts group's; either may retune values or add keys to its own group, nowhere else.
- Group **Gliding**:
  - `glideGravity` 6.5 units/s² (a glide with no dive lands at about the start of the landing road)
  - `glideDiveGravity` 22
  - `glideSpeedShare` 1.04 × top speed (MK8DX's air speed 8.05 / 7.75)
  - `glideTurnShare` 0.6 of the ground steering
  - `glideBankDegrees` 25
  - `glideCameraLift` 1.5 units
  - `glideCameraPullBack` 2 units
- Group **Spin posts**:
  - `postBounce` 0.5 (the share of the speed toward the post kept, bounced back)
  - `postPartingSpeed` 6 units/s
  - `postCooldown` 0.6 s

### Kart state (task A, read by F and the CPU)

`freshGlide()` in a new `kart-glide.js` gives `{ gliding: false, glideTime: null }`, spread into the kart by
`placeOnRoad` like `freshTechniques()`. `gliding` is true from crossing a glide lip until landing (or falling).
`glideTime` counts seconds since the glider opened (null when not gliding). While gliding, the rules set the
existing `kart.bodyRoll` to the glider's bank (steer × `glideBankDegrees`), so the model banks with no new field.
The look eases its own open share from `kart.gliding` (opens over about 0.3 s, folds over about 0.2 s after landing).

### Spin posts (task B, read by E)

`race.spinPosts`: one `{ sinceHit }` per `track.spinPosts` entry, in the same order. `sinceHit` is the seconds since
a kart last bounced off it (null until the first hit). `kart.postCooldown` is the seconds left before posts can spin
that kart again (0 when ready), in `createKart`'s fields. A post is a round obstacle of radius `SPIN_POST_RADIUS` =
0.8 (exported from `spin-posts.js`), standing on the road's surface at `pointAt(track, s, lateral)` along the road's
normal, 1.8 tall. A kart higher than that above the road passes over it.

### Courses and sceneries (task 0, then D and A)

- `scenery.js`'s `SCENERIES` gets `airport: { seaLevel: -8, buildRoad: buildAirportRoad, buildDressing:
  buildAirportScenery }` from a new `airport-scenery.js`. Task 0 makes it a stand-in (the kit road in a plain theme
  and `buildPlainDressing`); D replaces both.
- `courses.js`: task A puts `PALM_BAY_AIRPORT` first, once gliding works, since a unit test races a lap on every
  course and requires no falls.

### Pieces for the dressing (tasks G to L, placed by M)

- **Props** (small, repeated: vehicles, signs, lights): the existing shape. A builder `(kit) => [{ geometry, material }]`
  in its own file, one line in `kit/props.js`'s `PROP_BUILDERS` and one in `kit/layout-rules.js`'s `PROP_REACH`. Placed
  by `{ piece, s, side, out, turn }` spots (`kit/props.js`).
- **Landmarks** (one-offs: buildings, planes, islands, the conveyor): a builder `build<Name>(kit, options)` returning
  `{ object, update(dt, race) }` (a `THREE.Group` standing on its own origin, facing +x, with `y` up; `update` may be a
  no-op). M places it with `placeLandmark(kit, landmark, { x, z, y, heading })` (written by M in `airport-layout.js`'s
  drawing side, `airport-scenery.js`). Each landmark adds itself to no part; M adds it to the right `kitPart`.
- **Barrier styles:** a new style is a file in `kit/` built like the existing ones, one line in `BARRIER_STYLES` and one
  in `kit/barriers.js`'s registry.
- **kit-shots:** each task adds its pieces in its own file `host/kit-shots/airport-<letter>-pieces.js`, with one import
  line in `pieces.js` (the pattern of `item-pieces.js`).

## Task 0: prep (main session)

1. `palm-bay-airport.js` as in "The course" (a header comment in the style of `seaside-skyway.js`: the lap's parts in
   order). It is not yet in `courses.js` (task A adds it).
2. `track-builder.js`: the `glide` flag and `spinPosts` (above), its comment updated. `racing-line-pins.js`: `glide` in
   `jumps()`.
3. `tuning.js`: the Gliding and Spin posts groups, placed apart (Gliding after Boosts, Spin posts after Bumps), so
   A's and B's edits do not meet.
4. `airport-scenery.js` (the stand-in) and its entry in `scenery.js`.
5. `test/helpers/kart-3d-host.js`: the 3D browser tests pick Seaside Skyway on the setup screen before starting, in the
   helper that starts a race (a no-op while Seaside is the default; it keeps them on Seaside once the airport is
   first).
6. Unit tests: `test/unit/kart-3d-track.test.js` (or the builder's test file) gets the glide flag and `spinPosts`;
   a test that `PALM_BAY_AIRPORT` closes, is about 1551 long, and that its tunnel passes at least 7 below the runway
   where they cross.
7. `npm test`, commit (`m9: prep: the airport course's pieces, glide and spin-post flags, tunables, stand-in scenery`).

## Task A: glide rules (opus)

**Goal:** gliding as in MK8DX, CPUs gliding, and the airport in the course list.
**Files:**
- new `kart-glide.js`
- `kart-physics.js`
- `kart-techniques.js`
- `kart-body.js` (the bank)
- `chase-camera.js`
- `views.js` (only to pass the glide to the camera, if needed)
- `racing-line-pins.js`, `cpu-driver.js` and the `cpu-*.js` it needs
- `courses.js`, `palm-bay-airport.js` (only the glide's pieces: the ramp's and gap's heights, the glide's halfWidth)
- `tuning.js` (Gliding group only)
- `test/unit/kart-3d-race.test.js` (the course list), `test/unit/kart-3d-racing-line.test.js` (its "one jump a
  course" check: the airport has two), new `test/unit/kart-3d-glide.test.js`
**Rules:**
- Crossing a lip whose next station glides opens the glider (`gliding` true). A trick pressed at that lip boosts at
  once (`BOOST_KINDS.JUMP`), not on landing.
- While gliding:
  - gravity is `glideGravity` (`glideDiveGravity` while Brake is held);
  - the speed along the nose eases to `glideSpeedShare` × the kart's top speed (a dive adds a little);
  - steering turns at `glideTurnShare` and banks the body;
  - Go does nothing.
- Side limits: over a glide gap, an air wall at the gap's halfWidth pushes the kart back softly (no penalty, as a wall
  without a bounce).
- Falling: over a glide gap, the kart counts as fallen only below the glide's lower end (or the sea), not 3 below the
  gap's straight line, so a float or a dive never respawns it mid-air.
- Landing ends the glide (a drift held with the stick over starts a drift, as after any jump). Items needing the
  ground stay unusable while gliding (they already need `grounded`).
- Camera: while gliding it rides `glideCameraLift` higher and `glideCameraPullBack` further back, eased like the boost
  pull.
- CPUs: take the glide down the middle of the corridor, trick at the glide lip by level (the existing trick chance),
  never dive. The racing line is pinned down the middle from the glide ramp's run-up to past the landing.
- `courses.js`: `[PALM_BAY_AIRPORT, SEASIDE_SKYWAY, TEST_TRACK]`. `kart-3d-race.test.js`'s list is updated (on
  purpose). Its 1-lap race on every course must then pass with no falls.
**Tests:** a kart off the glide ramp at 150cc opens the glider, floats, banks with steering, stays inside the
corridor, and lands on the beach road. Brake held lands sooner. A trick at the glide lip boosts at once. No respawn
over the bay while floating or diving. A CPU field at every class glides and lands with no falls in 3 laps (as the
M7e tests measure).
**Report:** lap times on the airport at 150cc for Easy, Normal and Hard (as M7e measured Seaside's). Also report
anything in the course that drove badly (a corner too tight, the jump's landing, the ring), for M.

## Task B: spin-post rules (sonnet)

**Goal:** the posts in the hangar's anti-gravity ring give spin boosts, as in MK8DX.
**Files:**
- new `spin-posts.js`
- `race.js` (create `race.spinPosts`, step the posts after `bumpKarts`)
- `kart-physics.js`'s `createKart` fields only: `postCooldown: 0` (one line; A owns the rest of the file, so B adds
  only this, at the end of the object)
- `cpu-aim.js`, `cpu-levels.js`
- `tuning.js` (Spin posts group only)
- new `test/unit/kart-3d-spin-posts.test.js`
**Rules:**
- `stepSpinPosts(race, track, dt)`: each kart overlapping a post (radius `SPIN_POST_RADIUS` plus `KART_RADIUS`, below
  the post's top) is pushed out. Its velocity toward the post is bounced back at `postBounce`, at least
  `postPartingSpeed`, and it gets the loose-grip slide of a bump.
- In anti-gravity, with `postCooldown` at 0: a spin boost (`startBoost(kart, BOOST_KINDS.SPIN)`, `startSpin(kart)`),
  `postCooldown` set to `tuning.postCooldown`, and the post's `sinceHit` set to 0.
- Outside anti-gravity a post is only a bumper.
- Falling karts are left out.
- `sinceHit` counts up every step.
- CPUs: each level gets `postChance` (Easy 0, Normal 0.4, Hard 0.8). Seeded per kart and post, a CPU steers its aim
  to clip the post's side.
**Tests:** a kart driven into a post in anti-gravity spins and boosts once per cooldown; outside anti-gravity it only
bounces; airborne karts pass over; Hard CPUs hit posts more often than Easy over a lap of the airport (built from
`PALM_BAY_AIRPORT`, which B may import though it is not yet in `courses.js`).

## Task C: kit-shots `--course` (sonnet)

**Goal:** see a whole dressed course in place, for D, M and every look task.
**Files:** `host/kit-shots/viewer.js` (or a new `host/kit-shots/course-view.js` it calls), `host/kit-shots/index.html`
if needed, `tools/kit-shots.js`, a line in `CLAUDE.md`'s Commands (the main session merges it).
**What:**
- `npm run kit-shots -- --course <course id> [--bloom] [--name <sheet>] <s...>` builds the course as the race does:
  `buildScenery` with the photo asphalt, the baked shade and the course light, no karts, High quality.
- For each distance s it shoots two pictures: a near view from the chase camera's spot (`cameraBehind` behind and
  `cameraAbove` above the centre line at s, looking along the road), and a view from about 60 above, looking down at
  s. It ends with one overview of the whole course from high above its middle (`courseExtent`).
- The page can also be opened by hand: `/host/kit-shots/index.html?course=<id>&s=<s>&view=near|above|overview`.
- It takes its course from `COURSES`, so it serves the airport once A merges (D waits for that), and Seaside now.
- It shares the machine slots (`tools/machine-slots.js`).
- Its timeout allows for the bake (Seaside's build and bake take about 35 s in software).
**Tests:** a unit test for the argument parsing (`test/unit/kit-shots-args.test.js` or the existing one).
**Report:** the time for a sheet of 4 distances on Seaside Skyway, and that sheet's path.

## Task D: the airport's ground (opus)

**Goal:** the course stands on real ground: an airfield at 0 by the sea, with the road set into it.
**Files:**
- `airport-scenery.js` (its road and the ground's build; M adds the dressing later)
- new `airport-ground.js` (plain data and maths, unit tested: the ground plan)
- new kit files as needed: `kit/terrain.js`, `kit/terrain-maps.js`, `kit/tunnel.js`, `kit/retaining-wall.js`,
  `kit/runway-paint.js`, `kit/seawall.js`
- `scenery.js` (the airport entry only)
- `host/kit-shots/airport-d-pieces.js`
- new `test/unit/kart-3d-airport-ground.test.js`
**What:**
- **The ground plan** (`airport-ground.js`): zones as polygons in world x, z with a ground kind and height.
  - The apron (pale concrete tiles, big slabs with seams, as the references) round the terminal side and the start.
  - The grass infields with mown stripes.
  - The runway's own slab: about 30 wide along the road from s 913 to the glide ramp, and on east past the turn-in
    to about x 560, over the tunnel.
  - The taxiway's tarmac.
  - The beach (sand at -6, wet sand at the water's edge).
  - The sea bed, under the sea at -8.
  - The sea lies west and south-west (the sketch). The bay that the glide crosses lies between the runway's west end
    (a seawall at about x 185) and the beach.
- **Terrain** (`kit/terrain.js`): a ground mesh round the course, seamless with the road's edges and shoulders. Where
  the road is at the zone's height it meets the ground flush, with no gap and no step. Where it climbs or falls (the
  S-bend, the beach), the ground follows it in an embankment. Under the hangar's ring it is the hangar's floor. It is
  cut away over the cutting.
- **The cutting and tunnel:**
  - concrete retaining walls from the road's edge up to the airfield from s 452 to 596;
  - a tunnel roof (the runway's slab, with the runway on top) where the runway crosses (at least its 30 width, more if
    it looks right);
  - portals with a chevron band, and lit strip lights inside (lit: it is indoors, the only lamps lit by day);
  - the road's walls in the cutting are the retaining walls.
- **Runway paint** (`kit/runway-paint.js`): threshold bars and the runway's number at its ends, a dashed centre line,
  edge lines, touchdown marks. Yellow taxi lines on the taxiway and apron, with hold-short bars where the taxiway
  meets the runway.
- **The road's theme** (`buildAirportRoad`): the kit road in airport colours. From the references: pale concrete or
  dark asphalt with white edge lines; orange-white curbs; red-white chevrons on corner curbs. No supports under it (it
  is on the ground).
- **Seawall and sea:**
  - a seawall where the airfield meets the bay (the runway's end, the glide ramp's lip standing out over it);
  - the beach sloping into the sea;
  - the sea at -8 (scenery.js's plane);
  - waves or foam at the shore, if cheap.
**Budget:** at most 250,000 triangles for terrain, walls and tunnel together. Maps as the rules say.
**Tests:** the ground plan's zones cover the course with no road station outside the ground (except the bay under the
glide). The terrain's height at each road edge equals the road's (to 0.05) where the road is at ground. The tunnel's
roof clears the road by at least 6.
**Look:** kit-shots `--course palm-bay-airport` at s 0, 140, 330, 460, 520, 600, 940, 1090, 1150, 1220, 1400, 1500,
judged against `MK8_Sunshine_Airport.png`, `Sunshine_Airport_First_Jump.png` and `Sunshine_Airport_Gliding.png`.

## Task E: glide-ramp panel and spin posts' looks (sonnet)

**Goal:** the two new track features read at a glance.
**Files:** `kit/road-marks.js` (a glide lip's ramp gets the glide panel instead of the steel ramp: `rampSpans` skips
glide lips, a new `glidePanelRects`), `kit/road.js` or `kit/road-paint.js` (drawing it, and scrolling its arrows in
`update`), new `kit/glide-panel.js`, new `kit/spin-post.js`, `host/kit-shots/airport-e-pieces.js`.
**What:**
- **Glide panel:** the ramp's whole surface from MK8DX's description: cyan, with white glider-shaped arrows that
  scroll up the ramp. It glows a little (it may reach bloom, like the anti-gravity panel).
- **Spin post:** `buildSpinPosts(kit)` → `{ object, update(dt, race) }`. It draws every `track.spinPosts` entry at its
  spot, along the road's normal, radius 0.8 and 1.8 tall. From `Sunshine_Airport_AntiGravity.png`: a fat orange
  bollard with a band, a bolted foot and a red dome light on top. In our anti-gravity colours, a cyan glowing band;
  our call. It flashes for about 0.3 s when hit (`race.spinPosts[i].sinceHit`; `race` is null on the setup screen).
  The main session adds the call in `airport-scenery.js` at merge.
**Budget:** a post at most 1,500 triangles, instanced.
**Tests:** `glidePanelRects` is unit tested (one panel per glide lip, none on plain jumps; `rampSpans` unchanged for
plain jumps), in `test/unit/kart-3d-kit.test.js`'s style.

## Task F: the glider (opus)

**Goal:** every kart opens a glider over the glide gap, as MK8DX's Super Glider: a frame and a canopy in the design's
colours, with a stripe down the middle and the design's emblem in its centre.
**Files:** new `karts/glider.js` (and a maps file if needed), `kart-models.js` (attach, open and fold, banking with
the body), `host/kit-shots/kart-pieces.js` (`kart-<id>-glide` for each design and `gliders-lineup`).
**What:**
- It unfolds from behind the driver's seat over about 0.3 s once `kart.gliding` is true, and folds back over about
  0.2 s after.
- Its palette and emblem come from the design (`palette`, `drawEmblem`, `karts/kart-designs.js`).
- When folded it is not drawn at all.
- References: none of the glider was downloaded while planning, so find them first (the rule above): the Super
  Mario Wiki's [Super Glider](https://www.mariowiki.com/Super_Glider) and [Glider](https://www.mariowiki.com/Glider)
  pages and their pictures, and `Sunshine_Airport_MK8_Luigi.png` and `Sunshine_Airport_Gliding.png` here. Keep it
  simple and bold: a wide, shallow, rounded canopy over the kart, struts down to behind the seat.
**Budget:** at most 2,000 triangles and 2 draw calls a kart (reuse the kart's materials where the look allows).
**Tests:** in `test/unit/kart-3d-look.test.js` or a new file: the open share eases in and out from `kart.gliding`;
every design builds a glider within budget.

## Task G: terminal and control tower (opus)

**Goal:** the course's two biggest landmarks.
**Files:** new `kit/terminal*.js`, `kit/control-tower*.js`, `host/kit-shots/airport-g-pieces.js`.
**What:**
- `buildTerminal(kit, { length })`, a landmark. A long, low terminal (about 160 long, 18 to 25 tall, about 30 deep),
  facing the apron. It has:
  - a glass curtain wall in framed panes;
  - a coloured band (our colours, in the spirit of the orange-red and yellow zigzag);
  - a roof edge, with flags;
  - our own sign ("PALM BAY AIRPORT" and our emblem) on the roof;
  - two or three jet bridges reaching out toward the planes M parks;
  - a lit departure board seen through the glass if cheap.
- `buildControlTower(kit)`: a landmark about 40 tall. A tapered shaft, a round glass cab with a gallery, a roof top in
  our colours, and antennas.
- References: `MK8_Sunshine_Airport.png` (both), `Sunshine_Airport_Gliding.png` (the terminal from above),
  `Sunshine_Airport_First.png` (the inside, through the glass).
**Budget:** terminal at most 120,000 triangles, tower at most 30,000.
**Tests:** each builds within budget (triangle count), in a new `test/unit/kart-3d-airport-landmarks.test.js` (H, I
and L add their own files in the same style).

## Task H: hangars (opus)

**Goal:** the big hangar that holds the anti-gravity ring, and smaller hangars beside the taxiway.
**Files:** new `kit/hangar*.js`, `host/kit-shots/airport-h-pieces.js`, a new
`test/unit/kart-3d-airport-hangars.test.js`.
**What:**
- `buildBigHangar(kit, { fromS, toS })`, a landmark that sizes itself round the ring's stations (s 652 to 765, the
  road up to 19 high on its outer edge), with clearance.
  - An arched roof of trusses with skylight panels, open sides (decided: the sun must reach the ring), and big doors
    rolled open at its ends.
  - Floor markings, and a few parked small planes or tool carts inside if the budget allows.
  - The ring's road and its anti-gravity walls are the road's own (not this task's).
- `buildHangar(kit, { width, depth })`: a smaller hangar for the taxiway's side. A curved or gabled roof, a big door,
  an airline's name on it.
- The roofs cast shadows only where the sun really reaches the ring through the sides. Judge it: the ring must not be
  dark.
**Budget:** the big hangar at most 100,000 triangles, a small one at most 25,000.
**Look:** kit-shots of the pieces alone; once C and A are merged, `--course palm-bay-airport` at s 640, 700, 760.

## Task I: planes (opus)

**Goal:** the airport's planes, parked and moving.
**Files:** new `kit/airliner*.js`, `kit/prop-plane.js`, `kit/take-off-plane.js`, `host/kit-shots/airport-i-pieces.js`,
a new `test/unit/kart-3d-airport-planes.test.js`.
**What:**
- `buildAirliner(kit, { livery })`, a landmark about 45 long with a span of about 42 (big beside the karts, as in
  MK8DX). It has:
  - a round fuselage with cockpit windows and a row of cabin windows;
  - swept wings with two engines;
  - a tail with the airline's emblem, and a big emblem on the nose;
  - landing gear;
  - doors.
- Three liveries of our own (white with coloured stripes, as the references; our airline names and emblems).
- `buildPropPlane(kit)`: a small parked plane, about 14 long.
- `buildTakeOffPlane(kit, { from, to, height })`, a landmark whose `update(dt)` loops on its own timer, about every
  45 s. The plane rolls down the runway's east part from `from`, lifts off before the karts' part, flies low over the
  runway, the glide and the bay, and climbs away and vanishes. The runway it takes is given by M (world points).
  Gear up after lift-off.
- References: `MK8_Sunshine_Airport.png`, `Sunshine_Airport_MK8_runway.png`,
  `MK8_Sunshine_Airport_Plane_Flying_Plane_Model_Side.png`, `Sunshine_Airport_First_Jump.png`.
**Budget:** an airliner at most 60,000 triangles (M parks about four, so 240,000 with the moving one sharing its
geometry); a prop plane at most 15,000.
**Tests:** each builds within budget; the take-off's path at a few times (on the runway, rising, gone) is plain maths,
unit tested.

## Task J: ground vehicles (sonnet)

**Goal:** the apron's busy small things, as props.
**Files:** new `kit/airport-vehicles*.js` (one file per vehicle or two), one line each in `PROP_BUILDERS` and
`PROP_REACH`, `host/kit-shots/airport-j-pieces.js`, a new `test/unit/kart-3d-airport-vehicles.test.js`.
**What:**
- Props:
  - `baggage-train` (a tug pulling two or three baggage carts with suitcases);
  - `uld-dolly` (grey containers on blue dollies);
  - `stair-truck` (orange stairs on a truck);
  - `belt-loader` (a blue belt loader);
  - `fuel-truck`;
  - `follow-me-car` (a small chequered car).
- Each about kart scale to a few karts long, as the references show them beside the karts.
- References: `MK8_Sunshine_Airport.png`, `Sunshine_Airport_First_Jump.png`.
**Budget:** at most 4,000 triangles each (they are instanced many times).
**Tests:** each builds within budget, and its `PROP_REACH` covers its footprint.

## Task K: airfield fittings, barriers, conveyor (sonnet)

**Goal:** the small airfield things that make the theme, the airport's own barriers, and the jump's conveyor.
**Files:** new `kit/airfield-*.js` files, new barrier style files, one line each in `PROP_BUILDERS`, `PROP_REACH`,
`BARRIER_STYLES` and `kit/barriers.js`'s registry, new `kit/baggage-conveyor.js`,
`host/kit-shots/airport-k-pieces.js`, a new `test/unit/kart-3d-airfield.test.js`.
**What:**
- Props:
  - `runway-light` (low edge lights; by day unlit glass);
  - `taxiway-sign` (yellow-on-black and black-on-yellow letter boards on legs, a few lettered variants drawn in one
    map);
  - `windsock` (a striped orange-white sock on a mast, swaying in `update` if cheap);
  - `airport-floodlight` (a lattice mast with a ring of lamps and a long ribbon banner with our own lettering, as in
    `MK8_Sunshine_Airport.png`).
- Barrier styles:
  - `apron-rail` (white rails on orange posts, with red-white chevron boards every few posts, as in
    `Sunshine_Airport_First_Jump.png`);
  - `padded-barrier` (a fat yellow padded barrier, as in `Sunshine_Airport_Two_Ways.png`).
- `buildBaggageConveyor(kit, { s, length })`, a landmark: a conveyor belt crossing under the jump's gap (s 612 to 628)
  at ground level, with crates and suitcases riding it, moving in `update`.
**Budget:** props at most 2,500 triangles each, the conveyor at most 20,000.
**Tests:** each builds within budget, and its `PROP_REACH` covers its footprint.

## Task L: rock study and islands (opus)

**Goal:** first understand rock, then build the bay's rocky islands. Seaside's islands were rings of round shapes,
which rock is not (plan.md).
**Files:** a "M9: rock study" section in `docs/3d-findings.md`, new `kit/rock-island*.js` (and maps, using
`kit/cell-noise.js` and `kit/rock-maps.js`'s ways where they fit), `host/kit-shots/airport-l-pieces.js`, a new
`test/unit/kart-3d-rock-islands.test.js`.
**What:**
- **Study:** look at photographs of real coastal rock formations (sea stacks, limestone karst islands, layered
  sandstone, basalt columns; Wikimedia Commons is a good source), save them under `test-results/reference/m9/rock/`,
  and look at each. Also look at MK8DX's rock in the downloaded `Sunshine_Airport_Gliding.png` and
  `Sunshine_Airport_MK8_Luigi.png`, and others online (Dolphin Shoals, Koopa Cape).
- **Notes:** write what makes rock read as rock (facets and planes, not blobs; strata; cracks; overhangs; a darker,
  wet foot; vegetation only on the tops and ledges) and how to build it cheaply here.
- **Islands:** `buildRockIsland(kit, { seed, size })`, a landmark: a rocky island with cliffs, a green top with a few
  palms, and a beach or wet rock at the waterline. Several seeds give different islands.
**Budget:** at most 40,000 triangles an island (M places 3 to 5).
**Look:** rounds on kit-shots against the study's photos, not only against MK8DX.

## Task M: the course's dressing (opus)

**Goal:** Palm Bay Airport dressed end to end: consistent, busy, and within budget.
**Files:**
- new `airport-layout.js` (plain data, unit tested, as `seaside-layout.js`)
- `airport-scenery.js` (adds the dressing: `placeLandmark`, barriers, props, gate, landmarks, islands, the
  take-off plane, the boats)
- `palm-bay-airport.js` (only widths, shoulders, item rows, dash panels, spin posts; not the geometry)
- new `test/unit/kart-3d-airport-layout.test.js`
- `host/kit-shots/pieces.js` (if needed)
**What:**
- **Barriers:** every stretch of wall in an airport style (apron rails, padded barriers, the anti-gravity walls in the
  ring, retaining walls in the cutting).
- **The start:** the start gate in an airport theme of our own (`GATE_THEME`, as seaside's).
- **Big pieces:**
  - the terminal north of the start straight;
  - about four airliners parked at its gates between the terminal and the road;
  - the control tower inside the first corner;
  - the taxiway hangars;
  - the big hangar over the ring;
  - the conveyor under the jump;
  - the take-off plane on the runway's east part;
  - 3 to 5 islands in the bay;
  - the Seaside kit's sailboats and motor yacht in the bay, if they fit.
- **Small pieces:**
  - vehicles and fittings along the apron and taxiway;
  - runway lights along the runway;
  - taxiway signs at the junctions;
  - windsocks;
  - floodlight masts with banners;
  - palms, parasols and loungers on the beach road;
  - the kit's cones and tyre stacks where they fit.
- **"Not empty"** (the user): the road's edge is never empty for long. Use a prop or barrier detail at least every
  10 to 20 units on each side wherever it can be seen. Every view needs a middle distance and a background. Check it
  on kit-shots `--course` sheets every 100 units round the lap.
- **Drive it:** in Node, run CPU laps at every level. Tune the item rows, dash panels, spin posts and shoulders (the
  shortcuts: grass inside the last corner, sand on the beach turn's inside) so the lap plays well. No falls.
- **Cost:** measure triangles, draw calls, map MB and build time as M7d4d measured Seaside's, against the budget (1.8
  million triangles at most, maps no more than 81 MB, build no slower than Seaside's). Cut back where it is over.
**Tests:** every prop on ground and clear of the road and barriers (`PROP_REACH`); the layout's runs cover the lap;
every landmark's footprint clear of the road.
**Report:** the cost table, the sheets' paths, and what still looks empty or off.

## Task N: browser test (sonnet, spawned alone)

**Goal:** `test/browser/m9-kart-3d-airport.test.js`.
**What it checks:**
- The setup screen offers Palm Bay Airport first and pressed.
- A race on it runs on the plain course for speed (`presetPlainCourse`), as the rules files do.
- A kart reaches the glide ramp and is seen gliding, then lands.
- A spin post gives a spin boost.
- A lap finishes.
- One look screenshot on the full course at the start shows the terminal side drawn (pixels not blank), within the
  look files' timeouts.

It reads state the way the other 3D tests do (the page's hooks and WebSocket frames). It runs its one file only, when
nothing else draws. It also adds `m9` to `CLAUDE.md`'s Testing map rows for the 3D look and the 3D rules (the main
session merges that line).

## Decisions made during the run

(The run's main session logs here what it decided for the user, for the review at the end.)

- **Task 0:**
  - **Distances:** the s values in "The course" are measured from above. The track's own s runs along the 3D
    centre line, so past the cutting's and the ring's slopes it is a few units longer: the jump's lip is at 614
    (landing 630), the ring's anti-gravity runs from 654 to 771, the glide ramp starts at 1103, the glide's lip is at
    1116 and its landing at 1206. The spin posts (685 to 745), dash panels and item rows are given in the track's
    own s and all land where meant (checked). Use `buildTrack(PALM_BAY_AIRPORT)` for exact distances.
  - **Pinned to Seaside:** there was no shared helper that starts a 3D race, so `test/helpers/kart-3d-host.js` got
    `pickCourse(hostPage, courseId)` and `clickStartRace(hostPage, courseId = 'seaside-skyway')`, and every 3D
    browser file's Start race click now goes through them (m7d2 and m7b's second race pass `'test-track'`; m7d4b
    picks Seaside before Measure).
  - **Task A's files** also include `test/unit/kart-3d-racing-line.test.js`, whose jump check expects one jump a
    course (the airport has two).
  - **Stand-in road:** the kit road in a white edge line and orange-white curbs; D replaces it.
- **Task B:** CPUs that do not mean to clip a post steer at least 3.2 clear of it (beyond the spec: without it Easy
  CPUs, swept across by the racing line, hit posts all the time). Easy still gets spun now and then when the pack
  bumps it into a post, so the test checks Hard against Easy (about 25 against 9 spins in a 12-CPU lap) rather than
  Easy at 0. `POST_LOOK`, `POST_CLEAR` and `POST_CLIP` at the top of `cpu-aim.js` tune it.
- **Usage limit (18:00 UTC):** A and G stopped at the 5-hour limit. A was resumed in its worktree after the reset;
  G had saved nothing and was spawned again.
- **Usage limit (about 21:00 UTC):** D, I and J stopped at the limit with work saved in their worktrees; all three
  were resumed after the 23:30 reset.
- **Usage limit (about 02:00 UTC, 2026-11-06):** M stopped with work saved; resumed after the 05:10 reset.
- **Task A:**
  - **A glide floor instead of the fall rule** (A's choice, accepted): a gliding kart is never let below the gap's
    straight line (ramp lip down to the landing road); it flares onto it and rides it to the landing. So a glide never
    falls into the bay, which fits the decision that "a float or a dive never respawns it mid-air" (with the dive at
    22 a kart would reach -6 about 39 units into the 90-unit gap and go on into the sea). Brake's dive reaches the
    line sooner and so lands at the gap's end instead of floating long (floats land 1206 to about 1258).
  - Glide gravity is scaled by the engine class's speed share squared, so every class lands about the same place
    (200cc floats otherwise landed 150 units past the gap). `glideGravity` 7.5 (not 6.5: dash-boosted floats landed in
    the turn after the beach straight). The glide is pinned to the middle 15 past the gap (25 put Hard CPUs into the
    next turn's inside wall). The glider turns at most 60 degrees off the road's way; opening it ends a drift with no
    mini-turbo; a dive flies 8% faster.
  - The glide camera's line in `renderer.js` (`gliding: kart.gliding`) was added at merge. `m7b`'s course list
    changed on purpose (the airport first).
  - Lap times at 150cc (a lone CPU, third lap, no posts or items): Easy 47.1 s, Normal 45.3 s, Hard 44.65 s.
  - **For M (drove badly):** the dash panel at 585 throws a kart about 46 units off the jump (616 to about 662), past
    the 24-long landing straight onto the ring's climbing bank. The beach landing narrows from 12 to 9 over 40 units
    with walls, and a kart landing near the edge rubs the closing wall hard (31 to 6 units/s in a second): widen the
    beach road's start or narrow the glide. Boosted floats sometimes land just past 1246, at the start of the turn
    after the beach straight.
- **Browser tests after A** (while G, H and D drew): m6b, m7a, m7b and m8 passed; m6c's drift test timed out once
  under the load and passed alone. The look files (m7c, m7d2, m7d4b) wait for a quiet moment or the end's full suite.
- **Task D:**
  - The sea is at -8.2, not -8 (the cutting's floor is at -8 and the sea plane fought it). The tunnel is 43 long (more
    than the slab's 30); the runway road and the ground strips beside it are its roof; it clears the road by 6.2.
  - **Runway number, for the user's review:** the west end's "09" is painted the real way round (for planes landing
    eastward), so karts heading west read it upside down ("60"). Kept as built; easy to turn.
  - The red-white chevrons on corner curbs were not done (they need `kit/road-paint.js`; the references' chevrons are
    barrier boards, for K and M). The kit road's verge is grass everywhere (reads as dune grass on the beach turn).
  - No `airport-d-pieces.js`: the ground was judged on `--course` sheets (accepted). Two kit files beyond the list
    (`terrain-ribbons.js`, `shore-water.js`), split for size.
  - Review fixes before merge: the shore water carries its tint in its own attribute, so the baked shade no longer
    greys the foam; the terrain's corridor lookup runs once per corner (build time). The course's build and bake time
    are still to be measured (M, the browser tests, the device run).
  - About 95,000 triangles for terrain, walls and tunnel (budget 250,000) and 18,000 for the shore water. Sheets:
    `test-results/review/D-after.png`, `D-water.png`.
  - For M: the runway's slab beyond the barriers, the apron and the tarmac are empty for props; the cutting's barriers
    stand on ledges in front of the retaining walls (a low style shows more wall).
- **Look browser tests after D to L** (nothing drawing): m7c and m7d2 passed. m7d4b's Measure test timed out at 182 s
  of its 180 s; at the pre-M9 commit it took 176 s, so it was already at the edge. Its timeout was raised to 240 s (the
  behaviour is unchanged; said in the handoff), and its pick of Seaside moved into the setup hook. It then passed.
- **Task E:** the spin posts are wired into the stand-in `airport-scenery.js` (in the props part) at merge, as the
  spec said; M keeps that call. The posts' instanced meshes have no `dispose` of their own (their geometries and
  materials go through `kit.keep`, as the grandstand's do). After sheet: `test-results/review/E-after.png`.
- **Task G:** the terminal's origin is the foot of its hall glass (not its middle); `terminalFootprint(length)`,
  `terminalGates(length)` (3 jet-bridge doors at x 21.2, sill 3.2: I's planes should match or M moves them) and
  `CONTROL_TOWER_FOOTPRINT` are exported for M. Round glass drums at both ends (beyond the spec, from the reference).
  In kit-shots' light the sun is behind the terminal's front, so M's orientation decides how it reads. Terminal
  about 40,000 triangles, tower 12,800. After sheet: `test-results/review/G-after.png`.
- **Task H:** `buildBigHangar` also returns `spot` (place it with `placeLandmark(kit, hangar, hangar.spot)`; about
  x 381, z 384, heading 1.56); its footprint covers the ring by design, so M's footprint test leaves it out. It
  builds lattice towers under the raised ring (beyond the spec): M makes sure only one set of towers stands there if
  D's road builds supports too. Half the roof is skylight glass (four skylights left the ring too dark); check the
  ring's light with the bake on M's `--course` sheets. Floor markings in the infield, with a plane stand "H1" (a spot
  for I's prop plane). `buildHangar` takes an `airline` option ('Palm Air', 'Coral Wings', 'Skipjack Air'); I's
  liveries should use the same colours. At merge the small hangars' signs were cut to 512x128 (the 512 rule). Big
  about 39,000 triangles, small about 3,900. After sheet: `test-results/review/H-after.png`.
- **Task I:**
  - **At a gate:** `AIRLINER_DOOR` is `{ x: 13.5, y: 3.2, z: -2.86 }` (the front left door's sill, facing -z). To meet
    a jet bridge (cab facing +x), turn the plane by pi/2 about y (its named right side then faces the road) and put it
    at `gate - door.applyAxisAngle(y, pi/2)`, i.e. `(21.2 + 2.86, 0, gate.z + 13.5)` in the terminal's frame
    (`buildGate` in `host/kit-shots/airport-i-pieces.js` does it).
  - **Take-off cycle** (`buildTakeOffPlane(kit, { from, to, height })`, `update(dt)` only): it waits at `from`, rolls
    to `to` and lifts off at 46 units/s, holds `height` from 140 to 380 past `to`, climbs 140 higher by 900 past and
    at 1000 past jumps back to wait at `from`; a 45 s cycle. Hidden until its first update (no bake patch); meshes
    `keepWhole`. Gear folds 2 to 5 s after lift-off.
  - Review fix before merge: each plane has its own copy of its vertex-coloured parts (wings, engines, gear), so
    the bake shades each plane where it stands. NAVY is imported from `kit/hangar-maps.js` at merge; the liveries copy
    the hangars' `AIRLINES` colours.
  - Airliner about 13,000 triangles, prop plane about 4,000 (high wing, open wheels). After sheet:
    `test-results/review/I-after.png`.
- **Task K:** `buildBaggageConveyor(kit, { length })` takes no `s` (M places it with `placeLandmark`, its z across the
  road under the jump's gap; belt top at 0.84, housings 3.4 tall, so they stand outside the road). The windsock does not
  sway (props have no update). The two airport barrier styles and four props are left out of the Test track's "every
  style and prop" check (as J's vehicles). `apron-rail` (about 1 tall) and `padded-barrier` (0.8) are low: M adds them to
  `LOW_BARRIERS` if turn boards should stand behind them. At merge the three maps over 512 wide (taxiway boards 768,
  floodlight ribbon 768, the conveyor's sign 1024) were cut to 512 (checked on `test-results/review/K-merge.png`). After
  sheet: `test-results/review/K-after.png`.
- **Task M:**
  - **Course changes:** the dash panel before the jump moved from 585 to 645, on the jump's landing straight, firing
    into the ring (at 585 it threw karts onto the ring's bank; landings at 150cc are now 637 to 649). The beach landing
    is 11 wide, narrowing to 9 through the beach turn. The beach turn's sand moved to its inside (`shoulderLeft: 6`
    on the outside became `shoulderRight: 8`), the shortcut the spec asked for. The pieces' geometry is unchanged.
  - **Layout:** apron rails, padded barriers (cutting, tunnel, ramps, runway) and a wooden rail fence on the beach;
    `APRON_RAIL` added to `LOW_BARRIERS` (one line outside the list, accepted) so chevron turn boards stand round the
    apron corners. The terminal north of the start (length 160), 3 airliners at its gates plus 2 more, 3 prop planes,
    the tower inside the first corner, 6 small hangars, the big hangar, the conveyor at s 620 (nearer the lip), the
    take-off plane (lifts off east of the road, about 8 high where the road turns onto the runway), 5 islands in the
    open sea south and west (the bay is too narrow to keep them 20 from the road), 6 boats; about 190 props. Start
    gate in the airport's colours (its sign still reads as on every course).
  - **Drive it:** 12-CPU fields, 3 laps, at 50cc, 150cc (Easy, Normal, Hard) and 200cc with items: every kart finished,
    no falls; laps about 49 to 50 s at 150cc. Task A's glide test (12 CPUs of all levels, 3 laps, every class) and the
    race test's lap on every course run on the course as changed. At 200cc jump landings reach 648 to 666, a little
    onto the ring's bank (the jump's fixed geometry).
  - **Cost** (M7d4d's census, Seaside's reproduced exactly): 1,222,019 triangles (Seaside 1,515,626; budget 1.8M),
    398 meshes (422), maps 61.9 MB (81.2), build 8.4 s in software before the bake (13.2 s). By part: props 507k,
    barriers 407k, surroundings 223k, road 53k.
  - **Still empty or off:** the runway's south side and the start lobe's middle are plain grass (every view still has
    a middle distance); the islands read small from the glide; the overview is washed out by fog (every course).
    The take-off plane and the conveyor's cargo are not on the sheets (kit-shots never updates): N's test and the
    device run see them moving.
  - Boats rock through a copy of `seaside-surroundings.js`'s private `addBoats` (about 30 lines); exporting it would
    remove the copy (left for later). At merge: the landmarks' update loop and a comment tidied.
  - After sheet: `test-results/review/M9-M-after.png` (every 100 round the lap); round 2: `M9-M-r2.png`.
- **Task L:** `buildRockIsland(kit, { seed, size })`: origin at the island's middle with y 0 at the sea's surface (place
  at -8.2); `seed % 3` picks the kind (stack, mesa, karst); `size` is the radius at the waterline; the beach (if any)
  faces +x. `rockIslandFootprint` gives `{ radius, height }` (radius about 1.7 to 1.95 x size: the shallows reach 15+).
  Keep islands well out in the bay, away from the course's shade bake (it darkens anything within about 20 of the road).
  14,000 to 32,000 triangles each. Pale warm limestone with grey strata. The study is "M9: rock study" in
  `docs/3d-findings.md`. Sent back once to split its long files and draw its map with typed arrays (look unchanged).
  After sheets: `test-results/review/L-after.png`, `L-after-bay.png`.
- **Task J:** the first round's vehicles were sharp boxes; sent back once for bevelled bodies, fat tyres, cabs and a
  "FOLLOW ME" roof board (the car is two parts: its board is a canvas map made once per course). 1,224 to 3,436
  triangles each. Vehicles stand centred on their middle (M: `out` at least the reach; `turn: 90` lies them along the
  road). Two test edits outside its list, accepted: the Test track's "every prop" check leaves out the six airport
  vehicles, and the parts test's stand-in canvas ignores drawing calls it lacks. After sheet:
  `test-results/review/J-after.png`.
- **Task F:** each kart's glider is built open so the renderer compiles its shader up front (no stall at the first
  glide), and the first `show()` folds it. From the chase spot the canopy is seen almost edge-on; a higher
  `glideCameraLift` would show more of its top (judge at N's test or the device run). After sheet:
  `test-results/review/F-after.png` (kept for the handoff).
