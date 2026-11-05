# Queue: M8d, items after the device run

Asked for after the M8 device run (iPad, 4 players): big, small and bouncy go; the ramp item becomes a jump
item that lifts the kart so it can trick off it (the trick keeps MK8DX's takeoff window, the user's choice); every item
equally likely, drawn while the roulette spins, different every race; kit-shots gets a bloom option. Planned
here; folded into "M8" in `docs/history.md` at the handoff and this file deleted.

## Status

| Task | What | Model | Waits for | Status |
|---|---|---|---|---|
| M | Items' list and draws: big, small, bouncy removed; equal chances, drawn at the roulette's end, a new seed each race | sonnet | none | merged |
| N | The trick in the air (any takeoff), CPU tricks to match | sonnet | none | dropped (the user keeps MK8DX's takeoff window) |
| P | kit-shots `--bloom`: pieces drawn through the race's bloom (High quality) | sonnet | none | merged |
| O | The jump item replaces the ramp: rules, CPU use, icon, a launch puff; the kicker removed | sonnet | M merged | building |
| main | m8 browser test to seven items and the jump; CLAUDE.md's kit-shots line; docs; full browser suite; handoff | main | O, P merged | queued |

M and P share no files and nothing one decides changes the other's spec, so they run together. O waits for M
(it edits the same item files).

## Rules for every task

The same as M8's ("Rules for every task" in "M8" in `docs/history.md`), read there: own files only, rules plain
and seeded, a unit test file per task, `npm test` before committing, looks judged with kit-shots in rounds within
the M8 budgets, a complete but short report. Commit messages start `m8d:`. Behaviour that changes on purpose
changes its tests; say which in the report.

## Decisions (made with the user before the run)

- **Removed, not switched off:** big, small and bouncy are deleted everywhere (ids, icons, rules, looks,
  settings switches, tunables, CPU rules, kit-shots pieces, tests), as `CLAUDE.md` asks (no dead code). The
  effect system stays: magnet and push are effects, and the teleport's pop stays in `kart-effect-looks.js`.
- **Equal chances:** every allowed item is equally likely at every place. The odds by place and the item roles
  go (`item-odds.js` deleted, `role` out of `item-catalog.js`).
- **Drawn while the roulette spins:** the item is drawn when the roulette stops (`countDown` in `item-rules.js`),
  not at the pickup.
- **A new seed each race:** why items repeated: every race started from the same seed (`ITEM_SEED = 8`), so
  the first pickups of every race drew the same numbers, and with the odds by place the leader got blocker,
  bouncy or push three times in four (24.7% each) and almost never a teleport, magnet or ramp (0.4%).
  `createRace` gains an `itemSeed`; tests pass a fixed one, the game (`index.js`, `stand-ins.js`) a fresh
  `Math.random()`-based one at each race start. The rules themselves still only use the race's seeded random.
- **The trick stays as it is** (the user, before the run): MK8DX's window, a press of Drift up to `trickEarly`
  before a takeoff or `trickLate` after it (`kart-techniques.js`, `crossLip`). The jump item's launch is a
  takeoff, as the ramp item's was, so N is dropped.

## M: Items' list and draws (sonnet)

**Goal:** big, small and bouncy removed; every item equally likely; drawn when the roulette stops; a different
sequence every race.

**Files:** `shared/protocol.js` (`KART_ITEMS` loses `BOUNCY`, `BIG`, `SMALL`), `shared/item-icons.js`, every
file under `host/games/kart-3d/items/` except `teleport.js`, `road-objects.js` and the road objects' looks
(`road-object-*.js`, `kicker-look.js`, `sandcastle-look.js`, `sand-look.js`, `instanced-part-look.js`);
`host/games/kart-3d/race.js`, `host/games/kart-3d/index.js`, `host/games/kart-3d/stand-ins.js`, any kart rules
file that reads the three effects (find them with grep; `effect-rules.js`'s `effectSize` and friends: where the
only users were big and small, the helper goes; `road-objects.js`'s `effectSize` call is the one line you may
change there), `host/kit-shots/item-pieces.js` and `pieces.js` (their pieces), `controller/` files that name the
three, and their unit tests (`test/unit/`).

**Interfaces:** `createRace(track, playerIds, laps, engineClass, cpuLevel, allowedItems = [], itemSeed = 8)`;
`createItems(track, allowedItems, seed)`; `drawItem(allowed, random)` may live in `item-rules.js` (one line of
`Math.floor(random * allowed.length)`) once `item-odds.js` is gone. `kart.item.landing` goes (nothing is drawn
at the pickup).

**Tests:** chances equal for any allowed list and any place; a roulette's item drawn at its end (changing the
seed between pickup and landing changes it); two seeds give different first items over a field; the old odds,
big, small and bouncy tests removed. The m8 browser test is the main session's.

## N: dropped

The user kept the existing trick rule (MK8DX's takeoff window); the jump item's launch calls `crossLip` (O).

## P: kit-shots `--bloom` (sonnet)

**Goal:** `npm run kit-shots -- --bloom [--name <sheet>] <pieces>` draws the pieces through the race's bloom
(`host/games/kart-3d/bloom.js`, as High quality does), so glow can be judged on the sheet. Files:
`tools/kit-shots.js` (the flag, passed as `&bloom=1`), `host/kit-shots/viewer.js` (draws through `createBloom`
when set), and a unit test of the argument parsing if one exists (add to it). The sheet's default name gains
`-bloom` when the flag is on. Check: `npm run kit-shots -- --bloom teleport-warning sticky-walls` shows the
teleport rings and the goo; report what glows.

## O: The jump item replaces the ramp (sonnet)

**Goal:** `KART_ITEMS.RAMP` becomes `KART_ITEMS.JUMP = 'jump'`. Using it lifts the kart straight up from where
it is, keeping its speed along the road, about 1 s in the air and about 2.5
units at the top (`tuning` sliders "Jump, height" in the Items group, replacing "Ramp, launch"). The launch is a
takeoff: it calls `crossLip(kart)` (`kart-techniques.js`) as the ramp's launch did, so a press of Drift up to
`trickEarly` before the Item press or `trickLate` after it does a trick, the timing readout works, and the CPU
drivers' tricks (`cpu-trick.js`, keyed on `sinceLip`) work unchanged. Only on the
ground: a kart in the air keeps it until it lands. The kicker goes: the ramp road object, its rules in
`road-objects.js`, `kicker-look.js`, its parts in `road-object-drawing.js` and `road-object-motion.js`, its
kit-shots pieces, and its tests. The blocker stays as it is.

**Files:** `shared/protocol.js`, `shared/item-icons.js` (a jump icon: our own, a spring or an up arrow, in the
icons' style), `items/item-catalog.js`, `items/item-tuning.js`, `items/cpu-items.js`, `items/road-objects.js`,
`items/road-object-*.js`, `items/kicker-look.js` (deleted), `items/instanced-part-look.js` (if only the kicker
used it, deleted), a new `items/jump.js` (the launch, plain rules) and `items/jump-look.js` (a puff of dust and
a ring of sparkles under the kart at the launch, from the bursts `item-drawing.js` already shares; one line in
`DRAWINGS`), `host/kit-shots/road-object-pieces.js`, `pieces.js` (a `jump` piece), `kart-techniques.js` (only
its comment that names the ramp item), and the unit tests.

**CPU:** uses the jump on a straight with road ahead (no gap in the next 30 units); it tricks off it as off any
lip (`cpu-trick.js`).

**Tests:** the launch's height and time in the air from the tuning; the kart keeps its speed along the road; a
trick after it boosts on landing; held while airborne; the ramp's tests removed.

## Decisions made during the run

- **P's first bloom sheet** (`teleport-warning`, `sticky-walls`): the teleport rings get a soft cyan halo and the
  goo a faint warm one, so the rings do reach bloom, against M8's estimate. Left as they are: the user saw both
  on the iPad on High and liked the effects; the sheet goes to the user at the handoff.
