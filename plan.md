# plan.md

What the game is, the decisions behind it, how the parts fit, and what is left open. Every planned milestone (M0 to M10c) is built and device-tested. See `CLAUDE.md` for the architecture, constraints and rules of work.

Organised by topic, not by milestone: commit messages carry the milestone ids (`git log --grep m9`). The milestone-by-milestone notes that used to be here and in `docs/history.md` are in git: `git show c091f14:plan.md`, `git show c091f14:docs/history.md`, `git show c091f14:docs/3d-findings.md`, `git show c091f14:docs/mk8dx-reference.md`.

## Goal

A Mario Kart-style racing game for a party. A host display shows the race, and players steer with their own phones (iOS or Android). Three games on the host's game picker, each a separate module:

- **Kart race 2D** (`kart-2d`, 2-9 players): top-down, a stadium track, the whole track on one screen.
- **Kart race 3D** (`kart-3d`, 1-4 players in split screen, CPU karts fill the field to 12): the main game, meant to look, feel and play as close to Mario Kart 8 Deluxe ("MK8DX") as we can make it, with our own assets.
- **Input lab** (`input-lab`): a developer tool for tap, swipe, tilt and latency.

## Decisions

- **The host does the heavy lifting:** rendering, physics and rules run on the host device. The server is a relay; phones send input and show what the host tells them.
- **Games are plug-in modules.** The shell (game picker, a game's room and roster, joining, reconnection, settings) knows nothing about any one game; it loads a module by id from the registry and runs it through one contract ("Game module interface"). A game owns everything from its setup screen, which is also its lobby, to its results.
- **A room is one game.** The host page has no room; Play loads the game, then its room is created, and Back to games closes it. A host reload ends the room (new code).
- **Server:** Node + `ws`. Dev on the Linux home server, production on a spare non-rooted Android phone in Termux (in use). Same repo, same `npm start`. Node major pinned in `engines` and `.nvmrc`.
- **Network:** the Android phone runs a hotspot that every device joins (10 clients, one of them the host display, so at most 9 phones: `MAX_PLAYERS`). Its address changes after a phone restart, so never assume a fixed IP; it may be on home Wi-Fi too, so the server answers on several addresses.
- **HTTPS with a self-signed cert** (`npm run gen-cert`, for every current LAN IP, 365 days; players tap through a warning once per cert). Rejected: a local CA, a real domain. No HTTP-to-HTTPS redirect: open the `https://` URL the server prints.
- **Reconnection:** playerId plus a secret token in `localStorage`. The host runs a grace timer per dropped player (default 30 s, a host setting) and sends `REMOVE_PLAYER` when it ends; the server frees the slot only if it is still disconnected and answers `PLAYER_LEFT`, and the host removes players only on `PLAYER_LEFT`, so a rejoin that beats the timer is safe. A kart whose phone dropped mid-race gets neutral input and drives on when the phone is back.
- **Host UI is HTML** in the "Night" look (`host/ui.css` tokens and classes, the same names on the phone in `controller/style.css`), sized in `em` inside a 16:9 `.pp-stage` whose font size is 1/80 of its width (`host/stage.js`). Phaser draws only the 2D track and the input lab.
- **Kart controls:** the phone is held sideways like a Switch controller. Each player picks a control style on their phone: steering by tilt or stick, auto-accelerate on or off.
- **Tests guard everything built** (`CLAUDE.md`, "Testing"); real-device checks are kept for what automation cannot see.

## 2D kart race

- **Track:** a stadium circuit generated from maths: the road is every point whose distance from a centre line lies between two radii. Walls, "am I on the road" and lap progress are plain functions (`track.js`). Each kart keeps the distance driven along the middle line, so reversing over the line subtracts.
- **Physics:** hand-written top-down arcade rules at 60 Hz (`kart-physics.js`), karts bump.
- **Race:** countdown, laps, places by finish order; after the first finisher the rest get a time limit. Needs 2 players.
- Not built: items, drifting, other tracks.

## 3D kart race

The target is a race an MK8DX player recognises by feel. MK8DX's numbers and our studies of its look are in `docs/mk8dx-reference.md`; what we measured and tuned is in `docs/3d-findings.md`.

- **Copy MK8DX's designs freely, build them ourselves.** Private use only, never published. Every model and texture is made in code (or CC0, like the photo asphalt); nothing is extracted from the game. The 12 drivers are an original cast.
- **Kart rules written by hand,** DOM-free and unit tested, using MK8DX's structure (a turn rate, a speed curve, boost multipliers). No physics library.
- **Track from maths:** a closed centre line with width, height and roll per piece (`track-builder.js` makes stations 1 unit apart; `track.js` finds a kart by walking from its last station). Hills, jump gaps, banks, anti-gravity walls, off-road shoulders, glide gaps and spin posts all come from the course definition. On the road a kart is stuck to the surface; gravity acts only in the air.
- **Built:** driving, hop and drift with three mini-turbo levels, rocket start, trick, dash panels, slipstream, spin boost, gliding, spin posts; countdown, laps, places, results, engine classes (50 to 200cc); CPU drivers at three levels on a racing line; six items of our own (blocker, jump, teleport, magnet, push, sticky walls); three courses (Palm Bay Airport, Seaside Skyway, Test track); the look (kit of textured pieces, baked shade, course light, bloom, three quality levels); sound and music made in code.
- **Frame rate target,** MK8DX's own: 60 fps with 1-2 views, a steady 30 with 3-4. Physics is fixed at 60 Hz.
- **Not built:** Smart Steering, underwater, Grand Prix, path splits, phone vibration, engine sounds (removed: annoying).

## Kart controller (both races, `controller/kart/`)

- **Left:** a stick, or the phone tilted like a wheel. **Right:** Go and Brake (held: press and release are separate inputs). The 3D race adds Drift (hop, drift, trick) and Item. With tilt, Drift moves to the left thumb. With auto-accelerate Go is hidden; without it a held Drift also accelerates (one thumb cannot hold both).
- **Portrait page, controls turned.** A page cannot lock orientation on iOS. So every phone page is laid out in portrait, and in portrait the driving controls are drawn a quarter turn round (`controls.css`, `turned-layout.js`), read with the phone's top end in the left hand; on a landscape page they are drawn straight. The stick's drag is turned the same way and tilt is told the phone is held at 90 degrees (`tilt.js` `setHeldAngle`); tilt is re-centred at GO.
- **Tilt** falls back to the stick when denied, unsupported or silent for 2 s (`steering.js`). 25 degrees is a full turn.
- **The phone shows** countdown, lap, place, the held item, final place.

## Settings

- **Host settings** (the gear, in the shell): music and effects volumes, hold time for a dropped player; in the host's localStorage.
- **Race settings** on the game's setup screen on the host: laps; in 3D also course, Speed (engine class), CPU level, items. They last while the game runs.
- **Control style** on each phone, sent as an `INPUT` of kind `choice`.
- **Display** (3D setup): Look (quality, saved in localStorage), Watch (a race of self-driving stand-ins, no phones), Measure (a scripted timing run whose report is pasted back to Claude).
- Rejected: game settings drawn by the shell (it would need a settings description language).

## Game module interface

A registry, `host/games/index.js`, lists each game (`{ id, title, blurb, minPlayers, maxPlayers, cover, background }`) and loads its module with a dynamic `import()`. `host/games/<id>/index.js` exports `createGame()`, which returns a fresh object per run:

```
load(onProgress)       -> Promise. Fetch and decode assets, behind the shell's loading screen. onProgress(0..1) optional.
start({ container, players, setControllerView, removePlayer, pingPlayer, setRoomOpen, bar })
                       -> Build the game in container (an empty full-screen element). players is the room's live
                          roster (empty at start, fills as phones join). setControllerView(playerId, view) sets what
                          that phone shows. removePlayer(playerId) kicks (onPlayerLeft follows). pingPlayer(playerId,
                          sentAt) sends a PING; the PONG comes to onMessage. setRoomOpen(open): close the room for a
                          race, open it on setup and results (the bar then shows the room code and Add players).
                          bar.slot: an element in the shell's bar for the game's own controls. bar.setDocked(true)
                          moves the bar into a strip along the bottom (--pp-strip, 4 stage em) and ends the
                          container above it; the strip has no Back to games, so the game gives its own way back.
                          Only the 3D race docks it, while a race is drawn.
onMessage(playerId, message) -> INPUT, INPUT_MODE or PONG from that phone.
step(dt)               -> Advance the rules by exactly 1/60 s. No DOM, no drawing.
render(alpha)          -> Draw, once per animation frame; alpha (0..1) is the time between the last two steps.
onPlayerLeft(playerId) -> A player was removed (kicked, left, grace period over).
isDone()               -> Unused: every game returns false (see docs/unused.md). Back to games is the way out.
stop()                 -> Free everything: WebGL context (renderer.forceContextLoss(): iOS allows few), listeners, timers.
```

If `start`, `step` or `render` throws, the shell stops the game, closes its room and shows the picker with a message.

Rules that keep games affordable:
- **Fixed timestep:** `host/game-runner.js` with `fixed-step.js` owns the frame loop (at most 15 steps a frame), so a game behaves the same at 30, 60 and 120 fps.
- **Rules apart from drawing:** state, `step`, input and results live in DOM-free modules that run in Node. The renderer only reads state.
- **State is plain data** (no class instances, no renderer objects), which keeps "Later ideas" open.
- **The game owns its renderer,** created in `start()`, destroyed in `stop()`.
- **Controller view is state, not events:** `setControllerView` stores a small object per player, sent in `CONTROLLER_STATE` with the game id, so a rejoining phone gets it again. Views are sent from `step()`.
- **Input stays `INPUT`** (kinds in `INPUT_KINDS`: steering, held buttons, choices). A game that steers continuously keeps the latest input per player and reads it in `step`.

Controller side, `controller/games/<id>/index.js` with `style.css`, loaded when `CONTROLLER_STATE` names the game (`controller/game-screen.js`): `start(container, send)`, `showView(view)`, `stop()`.

**Flow:** Tap to start (full screen, wake lock, audio unlock) -> game picker -> Play -> loading screen -> the room is created and the game starts on its setup screen; the join window (QR, code, link) opens by itself, later from Add players -> race (room closed) -> results (open) -> Race again, or Back to games (two clicks), which closes the room: phones show "The game ended".

## Where things live

- **`server/`:** `index.js`, `rooms.js`, `joining.js`, `leaving.js`, `relay.js`, `heartbeat.js` (ping frames every 10 s), `static-files.js` (serves `controller/`, `host/`, `shared/`, `assets/` with `no-cache`), `gen-cert.js`, `check.js`, `dev-reload.js`.
- **`shared/`:** `protocol.js` (every message type and constant), `socket.js` (`openSocket()`, `ws`/`wss` by page), `icons.js`, `confirm-click.js` (two clicks, red when armed), `item-icons.js`, `wake-lock.js`.
- **Host shell (`host/`):** `main.js`, `tap-to-start.js`, `game-picker.js`, `game-session.js` (runs one game: load, room, container, bar), `game-opening.js`, `room.js` (one game's socket and roster) with `grace-periods.js`, `game-bar.js`, `join-window.js`, `settings.js`, `loading-screen.js`, `shell-rules.js` (plain rules, unit tested), `shell-sounds.js`.
- **Sound (`host/audio/`):** `audio.js` (unlock, volumes, limiter), `synth.js`, `music.js` (a sequencer on the audio clock) with `tunes/` as note data. Each race has `sound-cues.js` (plain: cues between two snapshots) and `race-sounds.js`.
- **Shared by both races (`host/kart/`):** `setup.js` (setup rules, `startBlocker`), `player-rows.js`, `setup-rows.js`, `panel-parts.js`, `kart-controls.js`, `race-time.js`.
- **2D race (`host/games/kart-2d/`):** `track.js`, `kart-physics.js`, `race.js`, `race-views.js`, panels, drawn with Phaser by hand from `render()` (`host/hand-driven-phaser.js`).
- **3D race (`host/games/kart-3d/`):**
  - Rules: `kart-physics.js`, `kart-driving.js`, `kart-ground.js`, `kart-walls.js`, `kart-bumps.js`, `kart-techniques.js`, `kart-boosts.js`, `kart-glide.js`, `spin-posts.js`, `slipstream.js`, `rocket-start.js`, `race.js` (phases) with `race-finish.js`, `race-cpus.js`, `race-views.js`.
  - **`tuning.js`: every tuned number** (value, range, meaning), read live by the rules. The Tuning popup has a slider for each and Copy values gives `key = value` lines to paste back. Anything tunable gets an entry there. Items: `items/item-tuning.js`.
  - CPU: `cpu-driver.js` and `cpu-*.js`, `racing-line.js`, `cpu-levels.js`, `cpu-pace.js` (catch-up).
  - Items (`items/`): `item-rules.js`, `item-catalog.js` (one entry per item), looks in `*-look.js` listed in `item-drawing.js`.
  - Courses: `courses.js` lists them; each is a definition file (`palm-bay-airport.js`, `seaside-skyway.js`, `test-track.js`) naming a `scenery`. A new course is a file plus a line there, a scenery entry in `scenery.js` (`SCENERIES`: road builder, dressing, sea level), layout data (`*-layout.js`, `*-landmarks.js`), and a preview picture (`npm run course-previews`).
  - The kit (`kit/`, one module per piece, each with its own drawn maps): road, barriers (styles in `layout-rules.js`), decks, props, gate, grandstand, landmarks. A builder takes the kit and returns `[{ geometry, material }]`. Every piece has a kit-shots entry (`host/kit-shots/pieces.js`). Layout unit tests check decks, props and barriers (`test/helpers/kit-layout-checks.js`).
  - Karts (`karts/`): 12 designs in `karts/drivers/`, assigned by lobby colour slot (`kart-roster.js`); about 25,000 triangles and 10 draw calls each; shadows from a box stand-in.
  - Drawing: `renderer.js`, `scenery.js`, `course-loader.js` (nothing is built until Start race, Watch or Measure; a built course is kept), `baked-shade.js`, `course-light.js`, `bloom.js`, `sun.js`, `quality.js`, `views.js`, `effects.js`.
  - Session and panels: `index.js`, `race-session.js`, `frame-drawer.js`, `phone-link.js`, `setup-panel.js`, `race-bar.js` (the strip's buttons), `tuning-panel.js`, `results-panel.js`, `view-hud.js`, `measure-*.js`, `stand-ins.js`.
- **Phone (`controller/`):** `main.js`, `connection.js`, `session-store.js`, `game-screen.js`, `no-zoom.js`, `background-leave.js`; `inputs/` (each `start(surface)`, `stop()`, `onInput(callback)`; tilt also `requestAccess()`, `calibrate()`); `kart/` (shared controls and setup screen).
- **Tests:** `test/unit/`, `test/server/`, `test/browser/`; helpers in `test/helpers/` (`startServer`, `openHost`, `startGame`, `clickNow`, `kart-3d-host.js` for the 3D waits and the plain course, `touch.js` for real multi-touch, `lane-driver.js`).
- **Tools:** `tools/kit-shots.js`, `tools/course-previews.js`.

## Things to know

- After editing `server/`, restart `npm run dev`. A phone keeps the ES modules it loaded and dev reload reaches only hosts: after changing shared or controller code, reload the phones too.
- Modules that Node unit-tests use relative imports (`../../shared/protocol.js`); an absolute `/shared/...` resolves to the filesystem root in Node. Browser-only modules use absolute paths.
- The server adds `playerId` to what it forwards from a phone, from the socket's session, never from the message.
- Headless Chromium has `DeviceOrientationEvent.requestPermission` too, so its presence never means "this is iOS".
- Network timers on the host use `setInterval`, not a game clock.
- Input modules keep one callback each, so a game registers its callbacks in its controller `start()`.
- Phaser `Graphics` re-triangulates every frame: draw static things once into a texture.
- Headless Chromium draws WebGL in software (about 0.3 s a frame), too slow for Playwright's own clicks on a two-click confirm, so browser tests click host buttons through the DOM (`clickNow`). The 3D rules tests use the plain course (`presetPlainCourse`).
- Hide shell elements with the `hidden` attribute, not only a stylesheet rule: the iPad kept showing a button past a cached stylesheet.
- A border drawn outside a row (`outline`) is clipped by a scrolling list; use an inset `box-shadow`.
- Three.js r0.186.1 is vendored unminified in `host/vendor/three-0.186.1/` with an import map in `host/index.html`; Phaser 3.90 and the QR generator are there too.

## Open issues

- Bloom costs about 3.5 ms a frame with 4 views on the iPad (1.4 before the karts were rebuilt); the cause is not known.
- The kit's drawn maps stay for the whole game: about 100 MB once all three courses were built. If the iPad shows memory trouble, trim to the current course's maps at each build (about 15 lines in `canvas-texture.js`).
- `host/games/kart-3d/index.js` (232 lines) and `renderer.js` (212) are a little over the 200-line guideline.
- Measure keeps the bar at the top, where it covers the "View 1" label.
- Heads of karts just behind the viewed kart poke into the bottom of its view.

## Later ideas (not now)

- **Service worker** for a fully cached offline host. Loading Three.js takes about 0.3 s cold over the hotspot, so it would save little for code. Needs your go-ahead (hard constraint 2) and no build tool.
- **Resume a game after the host tab is refreshed or killed:** the host would send periodic state snapshots for the server to keep as an opaque blob. Today a host reload ends the room, so that would have to change first. Storing a blob is not game logic, but it is new server behaviour: ask before building it.
- **More screens for the 3D race,** for more than 4 players or a full view each. Both options need a new "host to many" state broadcast (today the host only sends per-player `CONTROLLER_STATE`), and both are kept open by "State is plain data":
  - *Each phone draws its own view.* The host runs the physics and sends a compact snapshot 20-30 times a second; each phone runs Three.js and smooths between snapshots. Costs: phones need the 3D assets, the hotspot carries 9 x 30 snapshots a second, phones get hot, and tilt is awkward while watching the same screen.
  - *Several host screens.* A second page (for example `/view`) on another device receives the same snapshots and draws, say, players 5-8.
- **Spectator view.**
- **Phone vibration.** A 15 ms `navigator.vibrate` on every press was built and not felt on Android; iOS Safari has no `navigator.vibrate`. Before trying again: a longer pulse, the phone's vibration settings, a test page calling `navigator.vibrate(200)` from a tap.
- **For the 2D race:** items, drifting, more tracks. **For both:** character and kart selection (MK8DX's stat system is in `docs/mk8dx-reference.md`).
- **For the 3D race:** Smart Steering, underwater sections, Grand Prix (4 races with points), path splits (needs a second route in the track model), bloom at half resolution (would make High usable on integrated graphics), hiding karts very close to the camera.
- **A new course built in Blender** was tried and dropped (every look is JS); see `docs/unused.md`.
