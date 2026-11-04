# Task queue: M8 (our own items), M8a to M8c in one session

M8 (`plan.md`) planned on 2026-11-04 as one queue, built in one session by `implementer` subagents, at most 3 subagents at a
time (reviewers included), with one review and one device run at the end (the user's choice: no stops between M8a, M8b and M8c). Each
implementer is told one task letter; everything it needs is here. The main session keeps the Status column up to
date at every spawn and merge, so a summarised conversation picks up from this file. At the handoff this file is
folded into `docs/history.md` and deleted.

**Running it** (in a fresh chat, the user's choice): the main session reads `CLAUDE.md`, "M8: Items (our own)" in
`plan.md`, this file and the `milestone-plan` skill (its sections on reviewing, the main session's context, queues
and runs while the user is away), then starts at the first task whose Status is not merged. Every question the
plan could foresee was answered while planning (2026-11-04); the answers are written into the tasks below.

| Task | Part | What | Model | Waits for | Status |
|---|---|---|---|---|---|
| 0 | M8a | Prep (main session): item ids, the Item button's name, M8a's tunables | main | none | queued |
| A | M8a | Item rules: boxes, roulette, odds by place, holding and using, effect timers, settings rules, CPU use, views | opus | 0 | queued |
| B | M8a | Phone: the Item button with the held item, the roulette and running effects | sonnet | 0 (merges after C) | queued |
| C | M8a | Host: item icons, the HUD's item frame and effect rings, the Items settings, wiring in index.js | sonnet | 0 (merges after A) | queued |
| D | M8a | Looks: the item box (spin, break, return) and the kart effects (big, small, bouncy) | opus | 0 (merges after A) | queued |
| E | M8a | Rules of the kart effects: big, small, bouncy in speed, steering, bumps and walls | sonnet | 0 | queued |
| F | M8a | Browser test `m8-kart-3d-items` (M8a's items), spawned alone | sonnet | A-E merged | queued |
| G | M8b | Road objects' rules: the model, the blocker, the ramp, CPU use and avoiding | sonnet | F | queued |
| H | M8b | Road objects' looks: sandcastle blocker, kicker ramp | opus | F | queued |
| I | M8c | Field rules: teleport, magnet, push, sticky walls, CPU use | opus | G, H merged | queued |
| J | M8c | Looks: teleport (warning, sparkles, pop) and sticky walls (goo) | sonnet | G, H merged | queued |
| K | M8c | Looks: magnet field and push shockwave | sonnet | G, H merged | queued |
| L | M8c | Browser test extended to all nine items, spawned alone | sonnet | I, J, K merged | queued |

## Rules for every task

- **Read first:** `CLAUDE.md`; "M8: Items (our own)" in `plan.md`; "Shared design" below (the fixed interfaces);
  your task's section; then the files you own and the files that call them.
- **Own files only.** Edit or create only the files your task lists, plus new files under
  `host/games/kart-3d/items/` that your task's section allows. If you need a change outside them, stop and
  report it. Where a section allows "one line" in a shared file (`items/item-drawing.js`,
  `host/kit-shots/pieces.js`), add only that: the main session merges those lines.
- **Build to the interfaces** in "Shared design" exactly (names, arguments, shapes): other tasks are built
  against them at the same time. If one cannot work, stop and report rather than change it.
- **Rules stay plain:** item rules are DOM-free plain functions on plain data (no classes, no Three.js), unit
  tested in Node, read the live `tuning` object, and use the race's seeded random (never `Math.random`).
- **Tests:** a unit test file per task as named in its section; `npm test` passes before you commit. No browser
  tests, except tasks F and L, which run their one file only.
- **Looks** (D, H, J, K): our own designs ("be creative", `plan.md`), built with the kit's techniques (rounded
  shapes from `shape-utils.js`, detail in drawn maps with `kit/surface-maps.js`, dark creases). Judge by eye in
  rounds with kit-shots: `npm run kit-shots -- --name <letter>-r1 <your pieces>`, look at the sheet, improve, at
  least two rounds, finish with `--name <letter>-after`. One kit-shots run at a time, in the foreground.
  Budgets: anything repeated (boxes, goo strips) is one geometry and one material, instanced or merged; at most
  about 2,000 triangles per object; maps at most 512x512; transparent pieces cast no shadows; nothing glows into
  bloom except sparkles and the box's shimmer; a look's update allocates nothing per frame (reuse vectors).
- **Report back** everything the main session needs to review, merge and hand off without reading your whole
  diff, and nothing more: the files and what each does; decisions the task did not spell out, and why; the
  `npm test` result; for looks, the absolute path of your after sheet and what you would still improve; anything
  the main session must do at merge (a line in a shared file, a question).
- **Questions:** the user is not reachable during the run. If the spec leaves something open, make the choice
  that best fits `plan.md` and MK8DX, and say so in your report; stop only if it would break a hard constraint in
  `CLAUDE.md` (a new dependency, logic in the server).

## Shared design (fixed interfaces)

### Files

Every item module is in a new folder, `host/games/kart-3d/items/` (as `kit/` and `karts/`). Rules files have
plain names (`item-rules.js`); drawing files end in `-look.js` or `-drawing.js` and are the only ones that import
Three.js.

### Ids, the button, the controls (task 0)

- `shared/protocol.js`: `KART_BUTTONS.ITEM = 'item'` (a held button, sent on press and release like Drift), and
  `KART_ITEMS = { BLOCKER: 'blocker', RAMP: 'ramp', BOUNCY: 'bouncy', TELEPORT: 'teleport', BIG: 'big',
  SMALL: 'small', MAGNET: 'magnet', PUSH: 'push', STICKY: 'sticky' }`, the ids the phone and the host share.
- The kart's controls gain `item` (true while the Item button is held; `host/kart/kart-controls.js`, task A).
  One press uses one item: the rules use it on the step the button goes down.

### Tunables

`host/games/kart-3d/items/item-tuning.js` exports `ITEM_TUNABLES` (the same entry shape as `tuning.js`'s), spread
into `TUNABLES` by `tuning.js`, all in the group `Items`; rules read them from `tuning` as every other number.
M8a's (task 0): `itemEffectSeconds` 5, `itemRouletteSeconds` 2, `itemBoxReturnSeconds` 3, `bigSize` 1.6,
`bigSpeedShare` 0.8, `bigMassShare` 4, `smallSize` 0.6, `smallTurnShare` 1.6, `smallMassShare` 0.5,
`bouncyBounceShare` 3. M8b's and M8c's rules tasks (G, I) add theirs to the same file.

### The catalog

`items/item-catalog.js` (task A; G and I add their items): `ITEM_CATALOG`, one entry per built item, keyed by
id: `{ role, use(race, track, kart) }`. `role` is `'catch-up'` (teleport, magnet, ramp), `'defend'` (blocker,
bouncy, push) or `'even'` (big, small, sticky), which the odds read; `use` does what the item does when used.
Adding an item is its entry here (and its icon, already drawn in M8a). `BUILT_ITEMS` is `Object.keys(ITEM_CATALOG)`.

### State (plain data)

- **The race:** `createRace(track, playerIds, laps, engineClass, cpuLevel, allowedItems = [])`. `allowedItems` is
  a list of item ids; empty means items are off (no boxes, as before M8), which is also what every existing
  caller and test gets. The race gains `race.items = { allowed, random, boxes }`: `random` the seeded random's
  state (a number, stepped by a pure function, so the race stays plain data; fixed seed, so races repeat in
  tests), `boxes` `[{ s, lateral, returnLeft }]` (`returnLeft` 0 while the box stands, else the seconds until it
  is back). G adds `objects`, I adds `stickyLeft` and `teleport` (below).
- **Each kart in a race:** `kart.item = { held, rollLeft, effect, ... }`, made by `createRace`: `held` the item
  ready to use or null; `rollLeft` the roulette's seconds left (0 when not rolling; the landing item is drawn at
  pickup); `effect` the kart's running effect `{ item, left }` or null. Task A may add private fields (the
  button last step). Karts made by `createKart` alone (the physics tests) have no `item`.
- **Steps:** `stepRace` reads each kart's controls once, steps the kart, and, while racing, calls
  `stepItems(race, track, dt)` (`items/item-rules.js`) once after bumps. It picks up, rolls, uses and counts the
  effects down. No pickups or uses in the countdown, at the results, or by a kart that has finished; running
  effects still run out.
- **Using:** `ITEM_CATALOG[held].use(race, track, kart)`, then `held` is null. A kart's own effect is
  `startEffect(kart, item)` (exported by `item-rules.js`): `effect = { item, left: tuning.itemEffectSeconds }`,
  replacing any running effect (one running effect per kart: big, small, bouncy, magnet, push).
- **CPU karts:** `cpuWantsItem(race, track, kart)` (`items/cpu-items.js`) says when a CPU kart with a held item
  uses it, by a simple rule per item and a short random wait after the item lands, the same for every CPU level
  (the user's choice: the level changes only the driving). `cpu-driver.js` is untouched.

### What the views read

- `itemHud(race, kart)` and `itemPhoneView(race, kart)` in `items/item-views.js` (task A): null when items are
  off, else `{ held, rolling, effects }`, `effects` a list of `{ item, share }` for the HUD (share 1 to 0 of the
  effect's time left, every frame) and `{ item, secondsLeft }` for the phone (rounded up, so the phone's view
  changes once a second, not every step). M8a's effects: the kart's own; I adds sticky walls (race-wide).
- `raceView` (the phone) gains `item: itemPhoneView(race, kart)`; `viewHud` gains `item: itemHud(race, kart)`
  (null for a view that follows a CPU kart).
- **Icons:** `shared/item-icons.js` (task C) exports `ITEM_ICONS`: `{ [id]: { name, svg } }` for all nine ids,
  `svg` an SVG string (our own flat, bold icons, one main colour each, readable at 32 px). The phone and the host
  HUD and settings all draw items from here.

### Settings

`items/item-settings.js` (task A): `createItemSettings()` gives `{ on: true, items: { [id]: true } }` for every
built item; `toggleItems(settings)`, `toggleItem(settings, id)`, and `allowedItems(settings)`, the ids to pass to
`createRace` (empty when off). The host keeps one in `index.js` from race to race (a new game starts afresh, so
it resets on going back to the lobby). Watch races (`createStandInRace(track, count, laps, engineClass,
cpuLevel, allowedItems = [])`) use the same settings, so items can be watched with no phones; Measure races stay
without items.

### Drawing

- `items/item-drawing.js` (task D): `createItemDrawing(scene)` returns `{ update(race, track, poses, dt),
  dispose() }`; `race` is null on the setup screen (hide everything), `poses` the karts' poses this frame in the
  order of `race.karts` (`race-views.js` kartPose). It makes one drawing per kind of thing, each of the same shape
  (`createBoxDrawing(scene)` and so on), and calls them in turn; later look tasks add one import and one entry
  each. `renderer.js` makes it, updates it every frame after placing the karts, and disposes it.
- `kartLookScale(race, kart)` in `items/kart-effect-looks.js` (task D): the model's scale this frame,
  `{ x, y, z }` (1, 1, 1 with no effect), passed to `kartModels.show(...)`, which applies it. J adds the
  teleport's pop to it.
- Road objects (G, H) and field effects (I, J, K) are read from the state above and the fields G and I define.

## Task 0: prep (main session)

Before spawning: `KART_BUTTONS.ITEM` and `KART_ITEMS` in `shared/protocol.js`; `items/item-tuning.js` with M8a's
tunables and its spread into `tuning.js`; `npm test`; commit (`m8a prep: item ids, the item button, item
tunables`).

## Task A: item rules (M8a, opus)

**Goal:** the whole item system as rules, with M8a's three items (bouncy, big, small) using `startEffect`.

**Files:** new in `items/`: `item-catalog.js`, `item-odds.js`, `item-boxes.js`, `item-rules.js`,
`item-views.js`, `item-settings.js`, `cpu-items.js` (split further by responsibility if one grows past about 200
lines); edits: `race.js` (the `allowedItems` parameter, `kart.item`, reading the Item button, the `stepItems`
call: a few lines, the rest lives in `items/`), `track-builder.js` (passes a definition's `itemBoxRows` through
to the track), `seaside-skyway.js` and `test-track.js` (their rows), `race-views.js` (the `item` fields),
`host/kart/kart-controls.js` (the `item` control; `NEUTRAL_CONTROLS` gets `item: false`). Tests:
`test/unit/kart-3d-items.test.js`, and existing tests updated only where a shape grew.

**Behaviour:**
- **Boxes:** a course lists `itemBoxRows`, distances along the lap; `itemBoxSpots(track)` gives each row's boxes
  across the whole road, about 4 units apart and at least 1.5 inside each edge, so a kart anywhere across the
  road meets one unless it aims between two (MK8DX's rows). Seaside Skyway: two rows (the user's choice), about
  s 120 (start straight, past the grid) and 805 (the quiet straight after the hairpin). Test track: two rows,
  about s 50 and 455. Rows stand on straight, level road, clear of dash panels and
  the grid.
- **Pickup:** a kart within about 1.8 of a standing box's centre (any kart, CPUs too) breaks it
  (`returnLeft = itemBoxReturnSeconds`). If it holds nothing and is not rolling, its roulette starts
  (`rollLeft = itemRouletteSeconds`) and the item it will land on is drawn now, by its place. A box breaks either
  way, as in MK8DX.
- **Odds by place** (`item-odds.js`, a table that reads as data): `drawItem(allowed, place, fieldSize, random)`
  always returns one of `allowed`. Weights by role: catch-up items from almost none for the leader to most for
  last place, defend items the reverse, even items the same everywhere.
- **Use:** players on the step the Item button goes down (holding it does nothing more); CPU karts when
  `cpuWantsItem` says so. Bouncy, big and small: `startEffect`.
- **Effects** count down in `stepItems` and end at 0; a kart that falls keeps its held item and its effect.
- **CPU rules** for M8a's items: bouncy when a kart is close behind or alongside; big when a kart is close ahead,
  or after a few seconds anyway; small before a run of corners. Each waits a short random time (0.5 to 2 s) after
  its item lands.
- **Views and settings** as in "Shared design".

**Tests:** boxes across the road on both courses and none off it; pickup, break and return; the roulette then
held; one press uses one item and holding does not use another; effects last `itemEffectSeconds` and replace each
other; odds (the leader never gets more catch-up items than last place, every draw is allowed, one allowed item
always comes up); items off gives no boxes and null views; CPU karts use items; the race is still plain data
(a JSON round trip) and repeats exactly.

## Task B: the phone's Item button (M8a, sonnet)

**Goal:** the Item button in the place kept for it since M6c, showing what the player holds, the roulette and
their running effects.

**Files:** `controller/kart/markup.js`, `controller/kart/controls.js`, `controller/kart/style.css`, new
`controller/kart/item-slot.js` (shows a view's `item`), `controller/games/kart-3d/index.js` (passes
`items: true` to the shared controls, as it passes `drift: true`). Tests: `test/unit/kart-item-slot.test.js`.

**Interfaces it takes:** the race view's `item` (A), `ITEM_ICONS` from `/shared/item-icons.js` (C, merged before
this task), `KART_BUTTONS.ITEM` (task 0).

**Behaviour:** `#kart-item-slot` becomes the Item button (a `kart-pedal` with `data-button="item"`, so the
button input sends it with no new code) in every layout (stick, tilt, auto-accelerate); hidden in the 2D race and
while the view's `item` is null. It shows the held item's icon, large; while rolling it cycles through the
icons on a local timer until the item lands; with nothing held it is dim with "Item". The running effects show as
small icons, each in a ring (a CSS conic gradient) that empties over the effect, eased locally between the
once-a-second updates. A DOM-free helper, `describeItemSlot(item)` (what the button shows: empty, rolling, held,
and the effects), is what the unit test checks.

## Task C: host item UI and icons (M8a, sonnet)

**Goal:** the nine icons; on each view's HUD, MK8DX's item frame and the running effects; the Items settings on
the setup screen; the wiring in `index.js`.

**Files:** new `shared/item-icons.js`; new `host/games/kart-3d/items/item-settings-panel.js` (the settings row);
`view-hud.js`; `panels.js` (mounts the row and passes the settings to it, a few lines); `index.js` (the settings
state, its handlers, `allowedItems(settings)` into `createRace` and `createStandInRace`); `stand-ins.js` (the
`allowedItems` parameter). Tests: `test/unit/kart-3d-item-icons.test.js` (every id in `KART_ITEMS` has a name
and an SVG with a viewBox and no script or event attributes), `test/unit/kart-3d-stand-ins.test.js` updated.

**Interfaces it takes:** `itemHud`'s shape in `viewHud(...).item` (A), the settings functions and `BUILT_ITEMS`
(A, merged before this task).

**Behaviour:**
- **Icons:** blocker (a sandcastle), ramp (an orange kicker with an up arrow), bouncy (a pink rubber ball with
  squash lines), teleport (a cyan swirl with sparkles), big (a kart with outward arrows, or a growing star; your
  call), small (inward arrows), magnet (a red horseshoe with silver tips), push (a burst of rings), sticky (a
  honey drip). Each has its own main colour and a dark outline, readable on sky and road.
- **HUD:** the item frame top left, under the name label: a rounded square with a light rim (MK8DX's frame)
  holding the held item's icon or, while rolling, icons cycling every 80 ms; empty when nothing is held. Beside
  it, each running effect's icon in a ring that empties with `share`. Sizes in `em` (they follow the view's
  height, as the other lines). Writes to the page only on change, as now.
- **Settings:** a row on the setup screen, "Items" with On/Off, then one toggle per built item showing its icon
  (pressed when allowed), greyed while Items is off.

## Task D: the item box and the kart effects' looks (M8a, opus)

**Goal:** item boxes that read as MK8DX's at a glance, and big, small and bouncy karts everyone can recognise.

**Files:** new `items/item-drawing.js`, `items/item-box-look.js` (more `items/*-look.js` files if needed),
`items/kart-effect-looks.js`; `renderer.js` (make, update and dispose the item drawing; pass `kartLookScale` to
the kart models and the views); `kart-models.js` (`show(...)` takes a scale `{ x, y, z }` and applies it about the
kart's base, so a big kart still stands on the road); `views.js` and `chase-camera.js` (the camera pulls back and
up with a big kart's size, eased, as MK8DX's does under a Mega Mushroom; the user's choice); new `host/kit-shots/item-pieces.js` and its two lines in
`host/kit-shots/pieces.js`. Tests: `test/unit/kart-3d-item-looks.test.js` (`kartLookScale` over an effect's
time, the drawing builds and disposes, the box's triangle count).

**References:** find pictures of MK8DX's item box (fan wiki galleries, Mario Wiki) and save them under
`test-results/reference/m8/`; look at them before building.

**Behaviour:**
- **Item box:** a rounded translucent cube with a rainbow shimmer over its faces and edges, a "?" floating and
  turning inside, the box turning slowly and bobbing; all boxes one instanced mesh (or two: shell and "?").
  When broken (`returnLeft` went above 0), it bursts into a few shards and sparkles; it grows back with a small
  pop in the last half second before it returns.
- **Big:** grows to `bigSize` over about 0.6 s in a wobble like MK8DX's Mega Mushroom (overshoot and settle),
  shrinks back at the end. **Small:** shrinks to `smallSize` with a puff of smoke, pops back at the end.
  **Bouncy:** a steady squash-and-stretch wobble and a glossy pink rubber sheen (a shell over the kart, not a
  change to the shared kart materials). In each effect's last second the look blinks, to warn it is ending.
- **kit-shots pieces:** `item-box`, `item-box-row` (a row across the road), `item-box-broken` (mid-burst),
  `kart-big`, `kart-small`, `kart-bouncy`. They draw from a made-up race state; write that helper so J and K can
  reuse it for their pieces.

## Task E: the kart effects' rules (M8a, sonnet)

**Goal:** big, small and bouncy change how the kart drives and bumps.

**Files:** new `items/effect-rules.js`; `kart-driving.js` (`kartTopSpeed` times the effect's share),
`kart-physics.js` (the turn, driving and drifting and in the air, times the effect's share), `kart-bumps.js`
(mass, size and bounce), `kart-walls.js` (size). Tests: `test/unit/kart-3d-item-effects.test.js`.

**Interfaces:** `runningEffect(kart)` (the effect's item, or null, also for a kart with no `item`),
`effectTopSpeedShare(kart)`, `effectTurnShare(kart)`, `effectMassShare(kart)`, `effectBounceShare(kart)`,
`effectSize(kart)`, all 1 with no effect, reading `tuning`.

**Behaviour:** big: top speed times `bigSpeedShare`, mass times `bigMassShare` (it wins every bump: a big kart hit
at full speed by a normal one barely moves), size `bigSize` for bumps and walls. Small: turning times
`smallTurnShare` (steering and drift), mass times `smallMassShare`, size `smallSize`. Bouncy: a kart bumping it
parts at `bouncyBounceShare` times the usual parting speed, the extra going to the other kart, so the bouncy one
keeps its line. Bumps use the sum of the two karts' radii, each `KART_RADIUS` times its size.

## Task F: browser test for M8a (sonnet, spawned alone)

**Goal:** `test/browser/m8-kart-3d-items.test.js`: M8a working end to end in real browsers. You are spawned when
nothing else draws on the machine: you may run this one file (`node --test --test-timeout=600000
--test-concurrency=1 test/browser/m8-kart-3d-items.test.js`), never any other browser file. Follow the existing
3D tests (`m7b`, `m6c`) and `test/helpers/kart-3d-host.js`; the plain course and Medium quality; put any helper
in the test file itself (a change to `test/helpers/` would make the main session run the whole suite).

**Checks:** one phone (Pixel 7 in Chromium), 1 lap, items on with only one item allowed; the kart drives through
the first row; the phone's views (CONTROLLER_STATE frames) show `item.rolling`, then `item.held`; a press of the
Item button gives `item.effects` with that item; the host's HUD shows the item frame and an effect ring (DOM);
the game keeps running (no return to the lobby). With Items off the view's `item` is null. One screenshot of the
host with an effect running, into `test-results/screenshots/`. Report the run time.

## Task G: road objects' rules (M8b, sonnet)

**Goal:** objects placed on the road by distance and lane with a lifetime, and the blocker and the ramp.

**Files:** new `items/road-objects.js`; edits: `items/item-catalog.js` (blocker, ramp), `items/item-rules.js`
(`race.items.objects`, stepping them), `items/cpu-items.js` (when to use them), `cpu-aim.js` (a standing blocker
in its way is passed as a slow kart is), `kart-techniques.js` (a ramp's launch counts as a lip, for the trick
window: export what is needed), `items/item-tuning.js` (their tunables). Tests:
`test/unit/kart-3d-road-objects.test.js`.

**Interfaces (for H):** `race.items.objects`: `[{ id, item, s, lateral, left }]`, `id` a running number, solid
while `left > 0`, kept until `left <= -OBJECT_VANISH_SECONDS` so the drawing can play the vanishing; exported
`OBJECT_VANISH_SECONDS` (about 0.6), `BLOCKER_SIZE` `{ radius, height }`, `RAMP_SIZE` `{ length, width, height }`
and `objectFrame(track, object)` `{ position, forward, up, right }` (from `pointAt`).

**Behaviour:** blocker: dropped just behind the kart, at its lane, kept on the road and off gaps; lasts
`itemEffectSeconds`; karts bump off it as off a wall (the wall's tuned losses and bounce), karts flying above its
height pass over. Ramp: appears about 15 units ahead of the kart at its lane; a kart driving onto it on the
ground is launched (up and forward, clearing about the course jump's gap at top speed) and can trick with Drift,
getting the trick boost on landing, as off the course's ramp; lasts `itemEffectSeconds`. CPU rules: blocker when
a kart is close behind; ramp on a straight with no corner in the next stretch. CPUs pass blockers ahead.

## Task H: road objects' looks (M8b, opus)

**Goal:** the blocker as a sandcastle and the ramp as a kicker, with their appearing and vanishing.

**Files:** new `items/road-object-drawing.js`, `items/sandcastle-look.js`, `items/kicker-look.js` (and their maps
in `items/`); one import and one entry in `items/item-drawing.js`; new `host/kit-shots/road-object-pieces.js`
and its lines in `host/kit-shots/pieces.js`. Tests: `test/unit/kart-3d-road-object-looks.test.js`.

**Interfaces it takes:** G's object shape, sizes and `objectFrame` (built at the same time: import them by
name; the main session merges G first).

**Behaviour:** sandcastle: towers with crenellations, a little flag, sand with relief and wet darker sand at its
foot, the size of `BLOCKER_SIZE`; it drops in with a bounce and, at its end, slumps into a pile of sand that sinks
away. Kicker: an orange-and-white plate with chevrons pointing up it, matching `RAMP_SIZE`; it flips up out of the
road on a hinge in about 0.25 s, and at its end folds back down and sinks. kit-shots pieces: `sandcastle`,
`sandcastle-crumbling`, `kicker`, `kicker-flipping`.

## Task I: field rules (M8c, opus)

**Goal:** teleport, magnet, push and sticky walls as rules, with CPU use.

**Files:** new `items/teleport.js`, `items/field-forces.js`, `items/sticky-walls.js`; edits:
`items/item-catalog.js`, `items/item-rules.js`, `items/item-views.js` (sticky walls in every kart's effects),
`items/cpu-items.js`, `items/item-tuning.js`, `kart-walls.js` and `kart-physics.js` (a kart held on a sticky
wall), `cpu-recovery.js` (a held CPU kart is not stuck), `race-views.js` (a "Teleport!" banner). Tests:
`test/unit/kart-3d-field-items.test.js`.

**Interfaces (for J and K):** `race.items.teleport`: null, or `{ warningLeft, afterLeft, hops }`, `hops` empty
during the warning and `[{ from, to }]` (positions) after the hop, `afterLeft` counting down the sparkles' show;
exported `TELEPORT_WARNING_SECONDS` (about 1) and `TELEPORT_AFTER_SECONDS` (about 0.6). `race.items.stickyLeft`
(0 when off). `kart.item.stuckLeft` (seconds still held on a sticky wall, 0 when free). `fieldTargets(race,
kart)`: the karts its running magnet or push acts on this step (for the lines).

**Behaviour:**
- **Teleport (everyone):** a warning (`TELEPORT_WARNING_SECONDS`), then every kart still racing and not falling
  hops a random distance along the road, up to `teleportReach` (40) forward or back, onto a random lane, never
  onto a gap or within 3 of another kart (retry, else stay). It keeps its speed along the new heading; its
  previous pose is set to the new one so nothing is drawn sweeping across; `kart.distance` moves by the hop, so
  laps stay right.
- **Magnet:** for the effect's time, karts ahead of the kart (further round the race, by `distance`) and within
  `magnetReach` (30) are pulled back toward it, more strongly when nearer, less the heavier they are
  (`effectMassShare`). Karts behind are left alone: a pull would speed them up (the user's choice). Feel to aim
  for: a kart 10 ahead loses about a quarter of its speed while in the pull, one at the reach's edge hardly any.
- **Push:** for the effect's time, karts within `pushReach` (about 12) are pushed away, more strongly when nearer,
  with a loose slide. Feel to aim for: a kart alongside is shoved about a lane (4 units) aside in half a second.
- **Sticky walls (everyone):** for `itemEffectSeconds` every wall is sticky: a kart touching one is held still
  for `stickyHoldSeconds` (1.5), then let go with a small push off the wall, and cannot stick again for half a
  second.
- **CPU rules:** teleport from the back half of the field; magnet with karts ahead in reach; push with a kart close; sticky
  walls after a few seconds.

## Task J: teleport and sticky walls' looks (M8c, sonnet)

**Files:** new `items/teleport-look.js`, `items/sticky-walls-look.js`; edits: `items/kart-effect-looks.js` (the
teleport's pop in `kartLookScale`), one import and one entry in `items/item-drawing.js`; new
`host/kit-shots/teleport-sticky-pieces.js` and its lines in `host/kit-shots/pieces.js`. Tests:
`test/unit/kart-3d-field-looks.test.js` (your half; K adds its own file).

**Behaviour:** teleport: during the warning every kart flickers with a cyan glow ring on the road under it; at
the hop a burst of sparkles at each `from` and `to`, and each kart pops in from small at its new spot. Sticky
walls: honey-gold goo along every wall (strips built once per course from the track's wall lines, both sides,
where walls are), oozing in over about 0.4 s, glistening, drying away at the end; a held kart has goo blobs on it.
kit-shots pieces: `sticky-walls`, `sticky-kart`, `teleport-warning`, `teleport-hop`.

## Task K: magnet and push looks (M8c, sonnet)

**Files:** new `items/magnet-look.js`, `items/push-look.js`; one import and one entry in `items/item-drawing.js`;
new `host/kit-shots/magnet-push-pieces.js` and its lines in `host/kit-shots/pieces.js`. Tests:
`test/unit/kart-3d-magnet-push-looks.test.js`.

**Behaviour:** magnet: a red horseshoe magnet with silver tips floating and bobbing over the kart, rings pulsing
inward at its reach on the road, and curving field lines to each kart in `fieldTargets`. Push: a translucent
bubble round the kart and a shockwave ring expanding outward along the road every half second. kit-shots pieces:
`magnet`, `push`.

## Task L: browser test for all nine items (sonnet, spawned alone)

**Goal:** extend `test/browser/m8-kart-3d-items.test.js` so every item is picked up and used once in a real
browser (only that item allowed each time), the game keeps running, and where the item has a timed effect the
HUD shows it; one screenshot per item into `test-results/screenshots/` for the review. Same rules as task F (run
only this file; you are spawned alone). Keep the file's run time down (one race per item at most, or several
items per race by switching items between races); report it.

## Integration (main session)

- **Review:** before merging, a `reviewer` subagent (`.claude/agents/reviewer.md`) reads the task's diff against its
  section here and `CLAUDE.md`; the main session reads its findings and the diff's stat, and opens the code where
  the findings point or where the task meets another's interface.
- **Order:** task 0; spawn A, D, E; when one finishes, C, then B. Merge A, E, C, B, D in that order (each
  depends only on the ones before it). Then F alone. While F runs, nothing else builds; after it, the full
  browser suite (task 0 changed `shared/`) in the background while G builds (rules, no drawing); H after the
  suite. Then the 3D rules and look browser files and `m8` while I builds; J and K after them. L alone at the
  end, then the full suite again.
- **Old browser tests and items:** items are On by default. If an existing browser test fails only because item
  boxes and CPU items now change its race, that test clicks Items Off on the setup screen and tests what it
  tested before (a test changed on purpose, the user's choice; list it in the handoff). Any other failure is a bug
  in the code.
- **Merging J and K:** both add a line to `items/item-drawing.js` and `host/kit-shots/pieces.js`; keep both.
- **Review sheets for the user at the end:** each look task's after sheet, and one sheet of every item piece
  (`npm run kit-shots -- --name m8-items <every item piece>`), sent with the handoff.
- **Then** the handoff (one for M8) and one device run: Watch with items on (every item by CPUs, no phones), a
  race with phones (the Item button on an iPhone and an Android), the settings, each item's look, the frame rate
  with items.

## Decisions made during the run

Choices the main session or an implementer made while the user was away, for the review at the end (what, why,
and where to change it).

(none yet)
