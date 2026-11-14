# M11 queue: Kartwheel names, phone colour, new kart controls

One milestone (m11), built as tasks by `implementer` agents (`.claude/skills/milestone-plan/SKILL.md`). **Approved by the user on 2026-11-15** in the planning chat; the build starts in a new chat with task P. The approved mockup: https://claude.ai/artifact/ThAg6oxxQt1CP3euo54tR9 (v3). Deleted at the handoff once its lasting decisions are in `plan.md` and the docs.

## Status

| Task | What | Model | Depends on | Status |
|---|---|---|---|---|
| P | Protocol constants (main session) | - | - | merged |
| A | Name clean-up: Kartwheel, no Mario Kart references | sonnet | P | merged |
| B | Phone: new layouts, double tap, colour, Leave | opus | P | building |
| C | Host: colour picking, left-handed, views | sonnet | P | merged |
| R | Course previews again, manifest (main session) | - | A | building |
| D | Browser test file for m11 | sonnet | A, B, C merged, suite run | queued |

## Rules for every task

- Read `CLAUDE.md` first. Commit on your branch with the message `m11 <letter>: <what it does>` (lowercase, the repo's style).
- Own only the files listed. If you need a file you do not own, stop and report.
- Never write the words Mario, Mario Kart, MK8, MK8DX, Nintendo, Switch (the console), or the original game's character, item and course names (Bowser, Koopa, Toad, Yoshi, Peach, Daisy, Lemmy, DK, Bullet Bill, Lakitu) in a file you touch; remove any you find in your own files. Say "the reference game" where the old text pointed at it.
- `npm test` must pass. Browser tests are the main session's (D excepted).

## Fixed interfaces (all tasks build against these)

1. **Protocol** (`shared/protocol.js`, task P): `KART_CHOICES.COLOR = 'color'`, value an integer colour slot 0-8; `KART_CHOICES.LEFT_HANDED = 'leftHanded'`, value true or false. Both are INPUTs of kind `choice`.
2. **Roster** (`host/roster.js`, C):
   - `PLAYER_COLOR_NAMES`: `['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Teal', 'Pink', 'Lime']`, one per `PLAYER_COLORS` entry.
   - `changeColor(players, playerId, colorIndex) -> boolean`: true when the player now holds that colour. False when there is no such player, the index is not an integer in range, or another player holds it (a disconnected player in their grace time still holds theirs).
   - `colorChoices(players, playerId) -> [{ color, name, takenBy }]`, one per slot in order: `color` CSS text ('#e74c3c'), `name` from PLAYER_COLOR_NAMES, `takenBy` the holder's display name, or null when free or held by `playerId` itself.
   - `displayName(player)` for a player with no name: their colour's name ("Red") instead of "Player 1", so it matches their dot.
3. **Shell to game** (`host/room.js`, `host/game-session.js`, C): `game.start()` also gets `pickColor(playerId, colorIndex) -> boolean`, which calls `changeColor` and, when it changed, sends that player's CONTROLLER_STATE again (its `color`, and `name` if the name came from the colour). The game decides when picking is allowed.
4. **Setup rules** (`host/kart/setup.js`, C): `applyChoice(setup, playerId, input, onSetupScreen, pickColor)`. COLOR calls `pickColor(playerId, input.value)` only while `onSetupScreen`. LEFT_HANDED (boolean) counts at any time, like steering, and is kept in `setup.players[playerId].leftHanded` (default false). `playerSetup()` returns `{ steering, autoAccelerate, leftHanded, ready }`.
5. **Views** (both races, C):
   - Setup view adds `colorIndex` (the player's slot), `colors` (`colorChoices`), `leftHanded`. The 3D setup view also adds `driverName` (the kart design whose `slot` is the player's colour: 0 Blaze, 1 Pip, 2 Fern, 3 Bolt, 4 Grimble, 5 Rusty, 6 Inky, 7 Mochi, 8 Sprout).
   - Race views (2D `controllerView`, 3D `raceView`) add `leftHanded`.
6. **Phone game modules** (`controller/game-screen.js`, B): `start(container, send, leave)` and `showView(view, player)`. `player` is `{ name, color }` from CONTROLLER_STATE. `leave()` is the shell's leave (`connection.leave()`), with no confirm of its own: the game adds the two taps. The input lab may ignore both.
7. **Phone inputs** (B): the colour swatch sends `{ kind: 'choice', choice: 'color', value }`; the Left-handed toggle sends `{ choice: 'leftHanded', value }`. The double tap on Go sends the Drift button's presses (`{ kind: 'button', button: 'drift', pressed }`), so the host rules do not change.

## P: protocol constants (main session, before spawning)

Add the two KART_CHOICES above with comments; reword the DRIFT comment ("like MK8DX's R button" -> "hop, drift and trick, one button as in console kart games").

## A: name clean-up (sonnet)

**Goal:** the 3D race is called Kartwheel and the 2D race Kartwheel Mini; no file in the repo refers to Mario Kart, Nintendo or the original game's names. Designs stay as they are; only words and names change.

**Files:** every tracked file that matches `git grep -i -E "mario|mk8|nintendo|koopa|bowser|yoshi|peach|daisy|toad|lemmy|bullet bill|burning dk|lakitu|switch controller|\(switch\)"`, except those owned by B, C or the main session: `controller/kart/*`, `host/games/kart-3d/index.js`, `host/games/kart-3d/race-views.js`, `shared/protocol.js`. Plus `host/games/index.js` (titles), the renamed files below, and the tests they break. This includes `CLAUDE.md`, `plan.md`, `docs/*`, `.claude/skills/*`, `.claude/agents/*`. Not `docs/queue.md`.

**What changes:**
- **Titles:** `host/games/index.js` titles become 'Kartwheel' (kart-3d) and 'Kartwheel Mini' (kart-2d); blurbs stay. Any other host display string "Kart race 3D/2D" follows. (The phone's titles are B's.)
- **Signs drawn into the course** (same colours, emblems, lettering):
  - 'MARIO KART' -> 'KARTWHEEL' on the start gate (`kit/start-gate-sign.js`), the grandstand banner (`kit/grandstand.js`) and the padded wall (`kit/sponsor-wall-detail.js`).
  - Sponsors (`kit/sponsors.js`): BOWSER OIL -> TORQUE OIL; LEMMY'S TIRE SERVICE -> LUGNUT TIRE SERVICE; MKTV -> KWTV; BURNING DK -> BURNING RUBBER; BULLET BILL SPEED TRIAL -> ROCKET SPEED TRIAL; MARIO MOTORS -> MAX MOTORS; SUPER MARINE WORLD -> CORAL COVE AQUARIUM; TOAD'S POLAR EXPEDITION -> SNOWCAP'S POLAR EXPEDITION; YOSHI COOKIES -> DINO COOKIES; PEACH CASTLE TOURS -> PINK CASTLE TOURS; KOOPA KAR WASH -> TURTLE CAR WASH; GOLDEN WHEEL stays. Check every text still fits its cell.
- **Files and names:** `docs/mk8dx-reference.md` -> `docs/kart-reference.md`; `kit/koopa-shell.js` -> `kit/giant-shell.js`, `kit/koopa-shell-scutes.js` -> `kit/giant-shell-scutes.js`, `KOOPA_SHELL` -> `GIANT_SHELL`, `buildKoopaShell` -> `buildGiantShell`, the kit-shots piece and drawnOnce key likewise; `test/unit/kart-3d-koopa-shell.test.js` -> `kart-3d-giant-shell.test.js`; `kit/mktv-van.js` -> `kit/tv-van.js`, `kit/mktv-toad.js` -> `kit/tv-cameraman.js` (and their exports, piece names, the MKTV constant); `fromMk8Acceleration` -> `fromReferenceAcceleration`, `MK8_*` -> `REFERENCE_*`, `mk8Acceleration` -> `referenceAcceleration`. Use `git mv`. Update every import and every doc that names them.
- **Words:** MK8DX / Mario Kart 8 Deluxe -> "the reference game" (or "console kart racers" where it reads better); course names (Daisy Circuit, Toad Circuit, Koopa Cape, ...) -> what they are ("the reference seaside course", "a circuit course"); "Switch controller" -> "game controller"; Toad (the cameraman, the crowd) -> "cameraman", "mushroom-capped fans". `CLAUDE.md`'s "What this is" names Kartwheel and Kartwheel Mini and says the 3D race aims to look, feel and play like the reference console kart racer; keep every rule's meaning. Keep the reference numbers and look notes in `docs/kart-reference.md`; only the names go.
- **Look check:** `npm run kit-shots -- --name m11-signs-before <the start gate, grandstand, padded wall, sponsor stand, TV van pieces>` before any change, and `--name m11-signs-after` at the end. Report both sheet paths.

**Tests:** rename and update the unit tests that break; `npm test` passes. Report the final `git grep` (above pattern) result, which must be empty outside the excluded files and `docs/queue.md`.

## B: phone controls, colour and Leave (opus)

**Goal:** the phone side of the approved mockup: the new driving layouts with Left-handed, the double tap on Go for drift, the floating stick, the colour on every phone screen and on the setup screen, and Leave during a race.

**Files:** `controller/kart/*` (all), new `controller/kart/go-drift.js`, `controller/games/kart-2d/index.js`, `controller/games/kart-3d/index.js`, `controller/games/kart-*/style.css` if needed, `controller/game-screen.js`, `controller/main.js`, `controller/index.html`, `controller/screens.css`, `controller/inputs/button.js` only if needed, `shared/icons.js` only if a new icon is needed. Tests: new `test/unit/go-drift.test.js`.

**Phone titles:** the kart games pass 'Kartwheel' (3D) and 'Kartwheel Mini' (2D) as their title.

**Colour everywhere:** the game top line (`#game-top`) shows a colour dot (ringed, as in the mockup) and the player's name before the room code, from CONTROLLER_STATE's `name` and `color`; it updates on every CONTROLLER_STATE. During a race the controls get a thin edge in the player's colour (an inset box-shadow, about 4 px), and the status column shows a chip (dot + name) above the place.

**Setup screen** (portrait, scrolls if short; landscape keeps its two columns): course or game line and laps as now; then rows, each with its word in small caps:
- **Colour:** the 9 swatches from the view's `colors`, 5 then 4 per row, each at least 44 px. Your own (`colorIndex`) has a white ring and a tick; one with `takenBy` is a hollow ring in its colour with the holder's initial, muted, disabled, `aria-label`/`title` "Blue, taken by Mei"; a free one is a plain disc with `aria-label` its name. Tapping a free one sends the COLOR choice; the highlight moves only when the host's view says so (as the other choices do now).
- 3D only: the line "Red: you drive Blaze" from `colors[colorIndex].name` and `driverName`.
- **Steering:** Stick | Tilt, the two existing buttons (icon and word), as now.
- **Options:** two toggle rows with a switch: Auto-accelerate, Left-handed (replacing the Go button / Auto pair). Each at least 44 px tall.
- The turn note and Ready, as now.

**Driving layouts** (drawn as seen when held sideways, right-handed; Left-handed swaps left and right, the status column stays in the middle). Grid areas:
- 3D Stick, with or without Auto-accelerate: `steer status item item` / `steer status brake go`. No Drift button. The bottom row a little taller than the top (about 1 : 1.3). Go shows a small hint "tap, then hold: drift".
- 3D Tilt without Auto-accelerate: `drift status item item` / `drift status brake go`. With Auto-accelerate: `drift status item` / `drift status brake` (no Go).
- 2D Stick: `steer status brake go` (one row); Auto-accelerate hides Go and Brake fills. 2D Tilt: the tilt panel (wheel, Enable tilt, Recenter) on the left as today, Brake and Go on the right.
- 3D Tilt: the wheel picture, Recenter, and Enable tilt (while tilt is not running) sit small in the status column under the place, away from both thumbs.
- The drift's spark colour (`view.spark`) shows on Go in 3D Stick, on Drift in 3D Tilt.
- The turned layout (portrait page) keeps working: the grids are drawn turned as now, the stick and tilt turned to match.

**Floating stick:** the whole steer area takes the thumb. The ring and knob appear centred where the thumb lands (converted into the turned frame on a portrait page) and go on release; the knob moves sideways only. A thin bar along the top edge of the steer area shows the steer amount. The drag input already measures from the touch point; only the drawing moves.

**Double tap on Go** (3D Stick only), in `go-drift.js` as plain functions with no DOM, so Node can test them: `createGoDrift({ doubleTapMs = 300, shortTapMs = 220 })` returns `{ press(now), release(now) }`, each returning the button input to send: `{ button: 'accelerate' | 'drift', pressed }`. A press counts as drift when it starts within `doubleTapMs` of the end of a press shorter than `shortTapMs`. Its release sends drift released. Every other press is accelerate. After a drift, or any press longer than `shortTapMs`, the next press is plain accelerate. Name the two numbers at the top of the file as tunables.

**Leave during a race:** a 44 px button with the `leave` icon at the top of the status column in every driving layout, `aria-label` and `title` "Leave game", wired with `shared/confirm-click.js` to the `leave` the shell passes (first tap red, second leaves, disarms after 3 s or a tap elsewhere). It must not send any driving input, and a press on a driving button must not be blocked by it.

**Tests:** `go-drift.test.js`: a plain hold is accelerate; tap then hold is drift and its release is drift released; a hold, release and quick press is accelerate; a press after the window is accelerate. `npm test` passes.

## C: host colour picking, left-handed, views (sonnet)

**Goal:** the host side of interfaces 2-5: players change colour from their phone on the setup screen, colours stay unique, the views carry what the phone draws, and the host's player rows show Left-handed.

**Files:** `host/roster.js`, `host/room.js`, `host/game-session.js`, `host/kart/setup.js`, `host/kart/setup-rows.js`, `host/kart/player-rows.js` if needed, `host/games/kart-2d/index.js`, `host/games/kart-2d/race-views.js`, `host/games/kart-3d/index.js`, `host/games/kart-3d/race-session.js`, `host/games/kart-3d/race-views.js`, `host/games/kart-3d/phone-link.js`, `host/games/kart-3d/karts/kart-roster.js` if the driver's name is looked up there. Tests: `test/unit/kart-setup.test.js`, `test/unit/kart-3d-views.test.js`, `test/unit/kart-2d-panels.test.js`, `test/unit/kart-controls-views.test.js`, `test/unit/shell-rules.test.js` as needed, and a new `test/unit/roster-colors.test.js`.

**Notes:**
- The 3D setup view's `driverName`: take it from the kart designs' `name` by `slot` if `karts/kart-designs.js` loads in Node without Three.js; otherwise keep a plain slot -> name list in `kart-roster.js` and add a unit test that it matches `KART_DESIGNS`.
- Views are sent only when their JSON changes, so a colour change reaches every phone in the room by itself (everyone's `colors` change).
- The host's player rows read the colour each refresh already; check a change shows at once. The words gain " · Left-handed" when on ("Tilt · Auto · Left-handed").
- Kart designs are handed out at race start from `colorIndex` (`kart-roster.js`), so nothing else changes there.
- Remove the two reference comments in `race-views.js` and the one in `kart-3d/index.js`.

**Tests:** `changeColor` (free, taken, taken by a dropped player, out of range, own colour), `colorChoices` (takenBy, self), `displayName` fallback; `applyChoice` with COLOR on and off the setup screen and LEFT_HANDED; both setup views carry `colorIndex`, `colors`, `leftHanded` (3D `driverName`); race views carry `leftHanded`. `npm test` passes.

## R: course previews again (main session, after A merges)

`npm run course-previews` (about 5.5 minutes), look at the three pictures (KARTWHEEL on the gate), update their versions in `assets/manifest.json`, commit.

## D: browser test file (sonnet, alone on the machine)

After A, B and C are merged and the main session has run the full browser suite and fixed what the intended changes broke. New `test/browser/m11-colour-controls.test.js` (it may run only this file):
- The phone's top line shows its colour dot and name.
- Picking a colour on the phone's setup screen changes the host's row dot and the phone's dot; a colour another phone holds is disabled and a forced COLOR choice for it is refused; a COLOR choice sent during a race changes nothing.
- 3D Stick: a tap then a held press on Go sends drift pressed then released (watch the WebSocket frames); a plain hold sends accelerate.
- Left-handed mirrors the layout: Go and the steer area swap sides (compare element boxes in the turned frame).
- Leave during a race: the first tap arms (red), the second makes the host get PLAYER_LEFT and the kart leaves.

## Decisions made with the user while planning

- Players with no name are called by their colour ("Red"), so the name always matches the dot (interface 2).
- 2D layouts: Stick is stick, then Brake, then Go on the far right; Tilt keeps the tilt panel on the left. Auto-accelerate hides Go and Brake fills. Left-handed mirrors both (task B).
- Double tap: 300 ms window after a tap shorter than 220 ms, both tunable at the top of `go-drift.js`, marked **Tune:** in the device run.
- The game picker covers keep their "3D" and "2D" badges; the 2D race's wide picture stays (no signs in it).
- Colour changes only on the setup screen. Git history is left as it is (the repo is private).
- Kept on purpose (the user: designs stay): the mushroom-capped crowd, the cameraman, the giant shell, warp pipes, spotted mushrooms, the flower plaques, the "?" item boxes.

## Decisions made during the run

- C: the setup views take the roster: 2D `setupView(setup, players, playerId)`, 3D `setupView(setup, engineClass, courseName, players, playerId)`. `driverName` comes from `DRIVER_NAMES` in `karts/kart-roster.js` (the designs need Three.js), checked against `KART_DESIGNS` by a unit test.
- C: in the 3D race a colour pick is still accepted while the course builds after Start race (the race is not yet made); the kart is chosen when the karts go on the grid, so it is right. Left as it is.
- B told: a colour held by an unnamed player has `takenBy` equal to its own name, so the label reads "Red, taken".
- For the handoff: `plan.md`'s Game module interface gains `pickColor` in `start()` and the phone's `start(container, send, leave)` / `showView(view, player)` (plan.md is A's while A builds).

## Parked for the user

(none yet)
