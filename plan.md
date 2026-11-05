# plan.md

Build plan for the phone-controller party game. Work through milestones in order. Stop after each one and let me test on real devices before continuing. Each milestone is built in its own chat session (see "How to work with me" in `CLAUDE.md`). See `CLAUDE.md` for architecture and constraints.

## Goal

A Mario Kart-style racing game for 2-9 players. A host display shows the race, and players steer with their own phones (iOS or Android) as controllers. The host can be any device with a browser. Two games are planned, both chosen from the lobby: first a **2D kart race** around a stadium track (top-down, the whole track on one screen), which is the first real game and tests the framework, then a **3D kart race** with hills and jumps and split screen. They are separate games: the 3D race is not built on the 2D one. The 3D race should look, feel and play as close to Mario Kart 8 Deluxe (Switch) as we can make it, with our own assets (see "3D kart race design"). The M3 input lab stays as a developer tool in the same game list. No other games or minigames are planned.

## Decisions already made

- Controllers: Android Chrome, and iOS Safari or Chrome (iPhone and iPad), all verified in the spike with a self-signed cert that includes `extendedKeyUsage=serverAuth` and `keyUsage` (see `docs/spike-findings.md`). Host: Windows, Mac, iOS, or Android browser.
- Host rendering and game logic: Phaser 3 (2D), 1920x1080 logical size, `FIT` scaling, for the shell (lobby) and the 2D kart race. A game module may bring its own renderer (for example Three.js for a 3D kart game) inside the container the shell gives it, so the game framework never assumes Phaser (decided before M5).
- The host does the heavy lifting: rendering, physics and game rules all run on the host device. The server stays a relay; controllers send input and show what the host tells them.
- Games are plug-in modules, decoupled from the shell. The shell (room, roster, lobby, join and reconnection) knows nothing about any one game; it loads a game module by id and runs it through one contract (see "Game module interface"). Each game owns everything from its own setup screen to its own results. The contract is designed for the 3D kart race from the start, so that it does not have to be rebuilt after the 2D race (decided before M5).
- Server: Node + `ws`, relay only. Dev on my Linux home server, production on a spare non-rooted Android phone running Node in Termux. The same code and the same `npm start` must work on both. Node is v26.3.1 on the phone; pin the same major version on the dev box via `engines` and `.nvmrc`.
- Network: the Android phone runs a hotspot and all game devices join it. Observed on my phone: the hotspot interface is `swlan0` at `10.60.55.71` and the address stayed the same after toggling the hotspot, but changed after a phone restart, so never assume a fixed IP. The phone may also be on home Wi-Fi at the same time (`wlan0`), so the server answers on several addresses.
- Transport: WebSockets. HTTPS/WSS is required for tilt and Wake Lock, so it is a real milestone (M2), not an afterthought.
- Reconnection: playerId + secret token in `localStorage`. The host holds a disconnected player's slot for a grace period (default 30 seconds, configurable in the lobby; it was 2 minutes until the M4 device run), because phones often drop their socket when the screen locks and the OS, not our code, decides that.
- Host is authoritative for game state.
- Inputs to explore first: tap, swipe, tilt.
- Kart controls: the phone is held in landscape like a Nintendo Switch controller: steering on the left, buttons on the right. Each player picks their own control style on their phone, as in Mario Kart: steering by tilt or by an on-screen stick, and auto-accelerate on or off (decided before M5).
- Up to 9 players (`MAX_PLAYERS` in `shared/protocol.js` is the hard ceiling; the host's lobby setting picks the limit for each game). The phone's hotspot accepts 10 clients and the host display is one of them (see `docs/spike-findings.md`). Each game also sets its own maximum: the 2D race takes 9, the 3D race 4 (split screen; see M6).
- Automated tests guard every behaviour that has been built, so later changes cannot silently break earlier milestones (see "Testing" in `CLAUDE.md`). Real-device checks are kept for what automation cannot see.

## 2D kart race design

Decided before M5, to be refined in M5b and M5c; record changes in its notes.

- **Track:** a stadium-shaped circuit (two straights joined by two semicircular ends, like an athletics track), seen from above, the whole track on one screen, flat. It is generated from math, not images: the road is every point whose distance from a centre line segment lies between an inner and an outer radius. That one rule gives the walls, "am I on the road", and "how far round the lap am I" as plain maths that can be unit tested.
- **Karts:** up to 9, one per player in the roster colour, on a start grid behind the line. Karts bump into each other.
- **Physics:** simple hand-written top-down arcade physics, no library: speed, heading, grip, walls that slow and push back, kart-to-kart bumps. Stepped at the fixed 60 Hz. Written for this game only; the 3D race has its own.
- **Race:** a countdown, then the chosen number of laps. A lap counts only after passing a checkpoint halfway round, so driving backwards over the line does nothing. Places follow finish order; after the first kart finishes, the rest get a time limit, then are ranked by how far round they got.
- **Not in the first version:** items, drifting, other tracks.

## 3D kart race design (Mario Kart 8 Deluxe target)

Decided before M6. The aim is a race that a Mario Kart 8 Deluxe (MK8DX) player would recognise by feel: the same techniques, timings and race format, and a similar camera and look. Starting numbers and their sources are in `docs/mk8dx-reference.md`; tune them on real devices and record changes in the milestone notes.

- **Copy MK8DX's designs freely, build them ourselves** (changed after the M7c device run). The game is for private use only and is never published, so the karts, drivers, track pieces, signs, textures and course ideas may copy MK8DX's look as closely as we can (M7d). We still make every model and texture ourselves (procedurally where possible, CC0 assets otherwise) rather than extracting files from the game, within the payload target in `CLAUDE.md`.
- **Kart rules written by hand, like the 2D race.** MK8DX's own parameters are a turn rate per frame, a speed curve and boost multipliers: arcade rules, not a simulated car. So the kart rules are plain DOM-free functions that use MK8DX's structure and numbers, unit tested in Node. This replaces the earlier idea of a physics library (Rapier or cannon-es); a library is added only if the track model below cannot do something we need, and only after asking.
- **Track from maths.** The road is a closed centre line (a smooth curve through control points) with a width, height and roll at each point. Hills, jumps (a gap in the road), banked curves and anti-gravity wall sections (the road rolled up to vertical) all come from that one description, and "where am I on the road", the surface normal, walls, off-road and lap progress are maths, as in the 2D track. M6b proved it for every feature on its test track, so the fallback (a triangle-mesh track with ray casts, three-mesh-bvh or Rapier) was not needed.
- **Rendering:** Three.js, vendored in `host/vendor/` (M6a measures it).
- **Players:** 1-4 on one host screen in split screen, like MK8DX's local play (CPU karts fill the field, so one player can race alone). Frame rate target taken from MK8DX on the Switch: 60 fps with 1-2 views, a steady 30 fps with 3-4. Physics stays at the fixed 60 Hz either way.
- **CPU drivers, if the iPad can carry them:** MK8DX always races 12 karts and fills empty places with CPU drivers, and we want the same. M6a measures drawing 12 karts and M6b measures stepping them. Measured in M6a and M6b: the iPad holds 60 fps with 12 karts and 4 views (stepping 12 karts takes about 0.1 ms), so races fill up to 12.

What gets built when. M6 tests the parts that could sink the plan; M7 is split into five parts (four decided after the M6c device run, the second look pass after the M7c device run): the feel first, then the race, the look, the look made close to MK8DX, and the CPU drivers.

| Area | MK8DX features | When |
|---|---|---|
| Driving | acceleration, top speed, steering, hills, jumps and landing, walls, off-road, kart bumps decided by weight, falling off and being put back on the road | M6b |
| Camera | chase camera with lag; pull-back while boosting | M6b; boost effect M6c |
| Techniques | hop and drift, three mini-turbo levels (blue, orange, purple sparks), rocket start, jump boost (trick), dash panels, slipstream, anti-gravity spin boost | M6c |
| Feel | steering, speed and scale, bounces off karts and walls, wall penalty, smooth body animation (lean, hop, trick) | M7a |
| Phone vibration | a buzz on presses, bumps and boosts | later (see "Later ideas") |
| Race format | countdown, 3 laps, places, results, engine classes (50, 100, 150, 200cc) | M7b |
| Look | kart and driver models, a dressed track, glossy lit karts, shadows, bloom, sky, particles; a quality setting for slow hosts | cost measured in M6a, first pass in M7c, made close to MK8DX in M7d |
| CPU drivers | fill the race up to 12 karts (or the number M6 found the iPad can carry); they drive the racing line, drift and recover from falls | cost measured in M6a and M6b, built in M7e |
| Items | our own nine items replace MK8DX's (decided after M7e): item boxes, one held item, odds by place, settings to turn items off | M8 |
| Glide ramps and spin-boost posts | gliding off blue ramps; posts in anti-gravity sections that give a spin boost | M9 |
| Assists | auto-accelerate and tilt (exist), Smart Steering | Smart Steering later |
| More course types and modes | underwater, Grand Prix (4 races with points) | later |
| Sound | engine, drift, spark levels, boosts, music | M10 |

## Kart controller (both races)

- **Landscape, Switch style.** Left side: steering (an on-screen stick, or the phone itself tilted like a wheel). Right side: accelerate and brake buttons (held: press and release are separate inputs).
- **Per-player control style**, chosen on the phone in the game's setup screen and changeable there before every race: steering tilt or stick, auto-accelerate on or off. With auto-accelerate the accelerate button is hidden and the kart drives unless braking.
- **Portrait warning.** A web page cannot lock the screen orientation on iOS (the Screen Orientation lock needs fullscreen, which iPhone Safari does not support), so a phone held upright shows "Turn your phone sideways" instead of the controls.
- **Tilt in landscape** reads a different axis from M3's portrait tilt, and flips sign between the two landscape directions. M5c must handle both and check them on a real iPhone and Android (headless browsers have no sensor).
- **Phone shows:** the countdown, lap x of N, current place, final place.
- The 3D race adds a held Drift button (hop, drift and trick, like MK8DX's R button), built in M6c above Go with an empty place for a later Item button, so its controls are the 2D race's plus buttons. With tilt the left thumb is free, so Drift moves to the left, with Brake left of Go and the Item place above Go on the right (M7a). Without auto-accelerate a held Drift also accelerates, since one right thumb cannot hold Go and Drift at once (M6c; the device run checks it). Both races share one phone module, `controller/kart/` (decided in M6b; see its summary below).

## Game settings

Two kinds of settings, handled in two places:

- **Room settings** stay in the shell's lobby on the host screen: max players, grace period, and which game to play. Changing game reloads nothing; the lobby only checks the game's player range (`minPlayers`, `maxPlayers` from the registry). Start is disabled with a message if too many players are present for the chosen game (for example 5 players and the 3D race).
- **Game settings** belong to the game and are set inside it, after "Start game", on the game's own setup screen, as in Mario Kart:
  - *Race settings* (the number of laps, and in the 3D race the course and engine class) on the host screen, clicked like the lobby settings (`host/buttons.js` in the 2D race, HTML buttons in the 3D race). One set for everyone, controlled only by the host (decided before M5).
  - *Control style* on each phone, for that player only (tilt or stick, auto-accelerate). The phone sends the choice to the game as an `INPUT` of kind `choice`, so the game hears it through the same `onMessage` as steering. The game shows who has chosen and is ready.
  - The host starts the race when everyone is ready. After the results: "Race again" (back to the setup screen, settings kept) or "Back to lobby".
- *Look* (the 3D race's drawing quality, M7c) sits on the host's setup screen too, but belongs to the host device rather than the race: it is saved in the host's localStorage and comes back next time.
- So the shell never needs to know what a game's settings are. Settings last while the game runs and reset when it goes back to the lobby; saving them between games (localStorage on the host) can be added later if it gets annoying.

Rejected: putting game settings in the lobby. The lobby would have to draw settings that each game defines, which means a settings description language in the game contract; and per-player control choices do not fit a host screen anyway.

## Game module interface

Replaces the earlier minigame interface (`{ id, assets, init, onInput, update, isDone, results }`), which assumed a 2D game updated once per render frame. Written before M5 and expected to be refined while M5 builds it; record any change in the M5 notes.

"Game" means anything the shell can run: the 2D kart race, the 3D kart race, and the input lab (developer tool). Each game lives in two folders: `host/games/<id>/` and `controller/games/<id>/`. A registry, `host/games/index.js`, lists the ids and titles and loads each module with a dynamic `import()`, so a game's code is fetched only when it is needed. That is the browser's own module loading, so it needs no bundler.

Host side (`host/games/<id>/index.js`) exports `createGame()`, which returns a fresh game object (a new one for every run, so nothing is left over from the last race). As built in M5a:
```
registry entry (host/games/index.js only): { id, title, minPlayers, maxPlayers }
  so the lobby can check the player range without loading the game.
{
  load()                      -> Promise. Fetch and decode assets. The shell awaits it before start(); today it is
                                 called on "Start game" (loading early in the lobby can come later).
  start({ container, players, setControllerView, removePlayer, pingPlayer })
                              -> Build the game. container is an empty full-screen element the game renders into
                                 with whatever it likes. players is the shell's roster (read-only and live:
                                 connected, name and device change while the game runs; a player who joined just
                                 before the room closed shows up in it). setControllerView(playerId, view) changes
                                 what that phone shows. removePlayer(playerId) removes a player (the M4 kick; the
                                 game hears onPlayerLeft when the server confirms). pingPlayer(playerId, sentAt)
                                 sends that phone a PING; its PONG comes back to onMessage with the same sentAt.
  onMessage(playerId, message)
                              -> A message from that player's phone that belongs to the game: INPUT, INPUT_MODE or
                                 PONG (GAME_MESSAGE_TYPES in host/game-session.js). The shell keeps the rest.
  step(dt)                    -> Advance the rules by exactly dt (fixed, 1/60 s). No DOM, no rendering.
  render(alpha)               -> Draw. Called once per animation frame; alpha (0..1) is how far time has got
                                 between the last two steps, for smooth drawing on 120 Hz screens.
  onPlayerLeft(playerId)      -> A player was removed mid-game (kicked, left, grace period over).
  isDone()                    -> true when the game wants to go back to the lobby ("Back to lobby" after a race).
                                 The game draws its own setup, countdown and results screens; the shell has none.
  stop()                      -> Free everything: WebGL context, listeners, timers.
}
```
If `step` or `render` throws, or `start` throws, the shell stops the game and returns to the lobby with a message; the error goes to the console.

Rules that keep complex games affordable:
- **Fixed timestep.** The shell's runner (`host/game-runner.js`) owns the frame loop: each animation frame it adds the real elapsed time to an accumulator, calls `step(1/60)` as many times as fits, then calls `render(alpha)`. So a game behaves the same at 30, 60 and 120 fps, and physics stays stable. The step-counting maths is a plain module with unit tests.
- **Rules apart from drawing.** Each game keeps its rules (state, `step`, input handling, results, physics) in DOM-free modules that run in Node, unit-tested like `host/lobby-rules.js`. The renderer only reads that state.
- **State as plain data.** The game state is plain objects and numbers (no class instances, no references to renderer objects), so it can be copied, sent and compared. That costs nothing now and keeps two later ideas open: phones or a second screen drawing their own view from state the host sends, and resuming a game after the host tab reloads (see "Later ideas").
- **The game owns its renderer.** While a game runs, the shell puts its own Phaser game to sleep and hides its canvas, so an iPad never runs two render loops or holds two busy WebGL contexts, and wakes it when the game stops. The game creates its renderer in `start()` and destroys it in `stop()` (iOS limits how many WebGL contexts a page may hold).
- **Controller view is state, not events.** `setControllerView(playerId, view)` stores a small game-defined object per player and sends it in `CONTROLLER_STATE` (with the game id). Because it is state, a rejoining phone gets it again through the M4 path with no extra code. One-shot cues (a vibration when hit, "lap 2!") get their own message type when a game first needs one.
- **Input stays `INPUT`.** Controllers keep sending `INPUT` with kinds from `INPUT_KINDS`, for steering and for menu choices alike (kind `choice`, see "Game settings"); the game hears them in `onMessage`. A game that steers continuously (the kart) keeps the latest input per player and reads it in `step`, instead of acting on each message. Kinds are added to `INPUT_KINDS` when a game needs them (the kart likely needs a held button: press and release). When a player disconnects, the game must treat their input as neutral (no steering, no throttle), or their kart keeps doing whatever the last message said.

Controller side (`controller/games/<id>/index.js`), loaded by dynamic `import()` when `CONTROLLER_STATE` names a game, together with `controller/games/<id>/style.css` (every controller game has one; the shell waits for both, so controls never show unstyled). Run by `controller/game-screen.js`:
```
start(container, send)        -> Build the controls in container and start the input modules from
                                 controller/inputs/. send(message) sends one message to the server (INPUT, INPUT_MODE).
showView(view)                -> Show what the host sent with setControllerView (null until it sends one).
stop()                        -> Stop the input modules and timers; the shell empties the container afterwards.
```
The shell keeps a top line on the phone's game screen ("In room ABCD" and a Leave button) above the container.

Flow: lobby (the host picks a game) -> "Start game" -> loading (await `load()`; players stay in the lobby meanwhile) -> the game: its setup screen -> race -> results -> "Race again" or "Back to lobby" -> back to the lobby, with the same room code and players, and the room open again to new players. The shell also shows an "End game" button (two clicks, like "Close room") during any game, for the input lab, which never ends by itself, and as a way out of any game. It and "Close room" are HTML buttons at the bottom right of the host screen (`host/game-bar.js`), so games keep that corner clear.

## Pre-build spike (I run this myself before M0)

`spike.js` is a throwaway test server and page. I use it on my real devices to check: round-trip latency through the Termux hotspot, how long a WebSocket survives a locked screen on iOS and Android, tilt over plain HTTP (and over HTTPS later), Wake Lock availability, and how many devices the hotspot accepts. The first run is done and the results are in `docs/spike-findings.md`. Read that file before designing M2 to M4, and do not copy code from `spike.js` into the game.

## Milestones

Finished milestones are summed up in a few lines each: what exists now and what later milestones must know. Their full checklists and notes are in `docs/history.md`; read an entry there only when working on what that milestone built.

### M0: Project skeleton (done)
- Phaser is `host/vendor/phaser-3.90.0.esm.min.js` (`import * as Phaser from ...`).
- The server serves only `controller/`, `host/`, `shared/` and `assets/` (`/` is the controller page, `/host` the host page), so pages use absolute paths (`/host/main.js`). Every file is sent `Cache-Control: no-cache` with `Last-Modified`, so unchanged files come back as 304.
- `HOST_IP` only picks which address is printed (and shown on the join screen) first; the server always binds `0.0.0.0`.

### M1: One phone moves a square (done)
- WebSockets share the HTTP(S) port at `/ws` (`SOCKET_PATH`). Pages connect with `openSocket()` from `shared/socket.js`, which picks `wss:` on https pages.
- Room codes are 4 letters (no I or O). The server adds `playerId` to everything it forwards from a controller, from the socket's session, never from the message.
- When the host disconnects or reloads, the server deletes the room and sends `ROOM_CLOSED`, so a host reload means a new room code.
- The join QR is drawn with `host/vendor/qrcode-generator-2.0.4.mjs`.

### M1.5: Automated tests (done)
- Test layout and commands are in `CLAUDE.md`. Playwright is the only dev dependency, run under `node --test`; integration and browser tests start the real `node server/index.js` on a free port.
- Browser tests load pages from `127.0.0.1`, which browsers always treat as secure, so they cannot prove anything about HTTPS on the LAN.

### M2: HTTPS on the LAN (done)
- Self-signed cert, made by `npm run gen-cert` for every current LAN IP plus `127.0.0.1`, valid 365 days (rejected: a local CA, a real domain). Players tap through a warning, again after every new cert. Device results are in `docs/spike-findings.md`.
- `npm start` warns about a bad cert but starts; `npm run check` fails on expired or mismatched certs and warns about uncovered addresses.
- There is no HTTP-to-HTTPS redirect: open the `https://` URL the server prints.
- Headless Chromium has `DeviceOrientationEvent.requestPermission` too, so it never means "this is iOS": call it from the tap wherever it exists.

### M3: Input lab (tap, swipe, tilt) (done)
- Device findings are in `docs/input-findings.md` (iOS forgets the tilt permission when Safari restarts or in a private tab).
- Input modules (`controller/inputs/`) all have `start(surface)`, `stop()`, `onInput(callback)`. Tilt also has `requestAccess()` (call it first thing in a tap handler) and `calibrate()`, and its `start()` resolves to whether a real reading arrived within 2 s. `throttle.js` is the newest-value throttle shared by drag and tilt.
- `INPUT_MODE` and `DEVICE_INFO` are forwarded to the host like `INPUT`. Round-trip time is host-initiated (`PING`/`PONG`).
- Network timers on the host use `setInterval`, not Phaser's clock (game time, which runs slow at low fps).
- Modules that Node unit-tests use relative imports (`../../shared/protocol.js`); an absolute `/shared/...` resolves to the filesystem root in Node. Browser-only modules keep absolute paths.

### M4: Lobby and reconnection (done)
- The host runs the grace timer (default 30 s) and sends `REMOVE_PLAYER` when it ends. The server frees a slot only if it is still disconnected and answers `PLAYER_LEFT`; the host removes players only on `PLAYER_LEFT`, so a rejoin that beats the timer is safe. Every disconnect, including a closed tab, gets the grace period.
- The server runs a WebSocket ping-frame heartbeat (`server/heartbeat.js`, every 10 s) and answers a controller's own `PING` (the resume check) itself.
- `CONTROLLER_STATE` is the single host-to-controller message, sent on join, rejoin and every change. Ready is a request (`SET_READY`); the host decides.
- During a game the room is closed to new players (`SET_ROOM_OPEN`; new joins get `GAME_IN_PROGRESS`), but rejoins get in. The host can remove players (`KICK_PLAYER`) and close the room; phones can leave (`LEAVE`, delivered by `controller/background-leave.js` when the socket is down).
- `host/room.js` (created once in `host/main.js`) owns the socket, the roster and the grace timers, and passes each message to the current listener.
- After editing `server/`, restart `npm run dev`: a stale server once ignored new message types.

### M5a: Game framework (input lab moves onto it) (done)
- The "Game module interface" above is what was built. The registry is `host/games/index.js`; `host/game-session.js` runs one game (sleeps the shell's Phaser, hides `#shell`, gives the game `#game-container`, shows the HTML End game / Close room bar from `host/game-bar.js`); `host/game-runner.js` with `host/fixed-step.js` owns the 60 Hz steps (capped at 15 per frame).
- Phaser can be driven by hand from `render()`: `host/hand-driven-phaser.js` (used by the input lab and the 2D race).
- Input modules keep one callback each, so every game registers its callbacks in its controller `start()`, not when its module loads.
- After a game everyone is set to not ready and the room reopens.

### M5b: 2D kart race (the race itself) (done)
- Rules in `host/games/kart-2d/` (`track.js`, `kart-physics.js`, `race.js`, `race-views.js`), all DOM-free and unit tested. There is no halfway checkpoint: each kart keeps `distance` driven along the middle line, so reversing over the line subtracts.
- `INPUT_KINDS.BUTTON` (`{ button, pressed }`, press and release sent at once) with `KART_BUTTONS`. A disconnected player gets neutral controls and their held buttons are forgotten.
- Phaser `Graphics` re-triangulates every frame (3 fps headless), so the track is drawn once into a texture.
- **A phone keeps the ES modules it already loaded**, and `npm run dev` reloads only hosts: after changing shared or controller code, reload the phones too.
- Browser tests drive phones with real multi-touch through Chromium's DevTools protocol (`test/helpers/touch.js`) and finish races blind with `STEADY_LEFT` (`test/helpers/kart-drivers.js`).

### M5c: 2D kart race setup screen and control styles (done)
- `INPUT_KINDS.CHOICE` (`{ choice, value }`), `KART_CHOICES` and `KART_STEERING` in `shared/protocol.js`. The setup rules are `host/kart/setup.js` (moved there in M6b); control styles last until Back to lobby or End game, and ready is asked again before every race.
- Views are sent only from `step()`, and carry the control style, so a reloaded phone shows the right controls with no extra code.
- The phone asks the host for tilt only after tilt gave a real reading; denied, unsupported or no reading falls back to the stick (`controller/kart/steering.js`). A view older than the phone's own choice is ignored (`requestedSteering`).
- Landscape tilt reads beta, folded into -90..90, with the sign from `window.orientation` (then `screen.orientation.angle`); confirmed on a real iPhone and Android. 25 degrees is a full turn.

### M6: 3D spikes (in three parts)
Before building the 3D race, three spikes answer the questions that could sink it, each in its own chat: can the host draw it (M6a), does it drive like MK8DX (M6b), and do MK8DX's techniques work with phone controls (M6c). See "3D kart race design". Measured facts, not guesses, as for the first spike: results go in `docs/3d-findings.md`, and the researched MK8DX numbers are in `docs/mk8dx-reference.md`.

Notes (decided before M6): split screen, one view per player, so the 3D race takes at most 4 players for now (each view is drawn separately, so 4 views cost up to 4 times the drawing). If the spike shows the iPad cannot carry it, or more players are wanted later, see "More screens" in "Later ideas".

Notes (split decided before M6): the MK8DX target added the driving and technique spikes to the original performance spike, and the three do not fit one chat. M6a is throwaway, like `spike.js`. M6b and M6c are not: they write the track maths and kart rules to project standards (DOM-free, unit tested) in `host/games/kart-3d/`, because tuning the feel is the expensive part and M7 keeps it.

#### Reference footage (Claude measures, I review)
MK8DX's distance unit is unknown, so every distance in our race is a guess (listed in `docs/3d-findings.md`). Speeds are tuned by feel in M7a, with live sliders on the host while I play MK8DX side by side. Two numbers come from paused screenshots of the real game, which Claude finds, measures (by eye and with a small script on the pixels) and shows me to review. Only the measurements are kept, never the images. Results go in `docs/mk8dx-reference.md`.
- Road width, in kart widths: on a straight, pause with karts on the road, and count how many karts would fit side by side across it at the same distance from the camera (or measure both in pixels on the screenshot)
- How much of the screen's width the player's kart takes up, driving straight with no boost

First reading (one screenshot, in `docs/mk8dx-reference.md`): the road is about 9 kart widths (ours 9.6) and the kart takes 14.5% of the screen's width (ours about 12%). That is enough as a sanity check: our scale is close. Courses vary their width, and we design our own (M7b), so no more measuring is planned.

### M6a: 3D performance spike (throwaway) (done)
- Three.js r0.186.1 is vendored unminified in `host/vendor/three-0.186.1/` (11 add-ons under `addons/` since M7c removed `RoomEnvironment`), with an import map in `host/index.html` for `three` and `three/addons/`.
- Results (`docs/3d-findings.md`): the iPad draws the full look (shadows, glossy, bloom, particles, detailed karts) with 4 views and 12 karts in under 10 ms at pixel ratio 1; at ratio 2 it takes about 20 ms. Pixels are the cost, not views, karts or triangles. Bloom is the costliest part. A laptop on integrated graphics was slower than the iPad, so M7c needs a way to drop costs on a slow host (bloom first, then resolution).
- M7c should compile every shader while loading: switching bloom on stalled one frame for 1.8 s. A 30 fps cap inside the game's `render()` paces evenly, so the runner needs no change.
- WebGL context loss ends the game through the shell's error path; `stop()` must call `renderer.forceContextLoss()` (iOS allows a page few contexts).
- The spike ("3D spike (dev)", `spike-3d`) was removed in M7b. Headless Chromium draws WebGL in software, so WebGL browser tests run the host at 960x540.

### M6b: Driving spike (MK8DX handling) (done, feel tuning put off)
- "3D test drive" (`kart-3d`, 1-4 players): the shared setup screen, then free driving in split screen with dummy karts filling the field to 12 (players start at the back, as in MK8DX). M7b made it the race, "Kart race 3D" (a longer title does not fit the lobby's game picker).
- The track model works for every feature (hill, jump gap, hairpin, banked curve, off-road, anti-gravity wall, edges without walls); no physics library needed. Pieces become stations 1 unit apart (`track-builder.js`), and `track.js` finds a kart by walking from its last station, so a bridge cannot confuse it. On the road a kart is stuck to the surface; gravity only acts in the air (toward the road in anti-gravity sections).
- Numbers: MK8DX's level-10 speed curve and steering rate taken literally, and every distance (top speed 24 units/s = 12 kart lengths/s, road 16 wide, camera, gravity) a guess, since no footage was measured. The table is in `docs/3d-findings.md`. On the device run the controls did not feel like MK8DX yet; tuning is put off to a later pass.
- Measured on the iPad with 4 views: 12 karts step in about 0.1 ms and draw at 60 fps with 2-2.3 ms of CPU per frame, so M7e (planned as M7d until the M7c device run) fills races to 12 karts.
- Shared phone controls: `controller/kart/` (`controls.js` plus the setup screen, steering and markup); each race's `controller/games/<id>/index.js` passes its own `describeStatus(view)`, and its `style.css` imports `controller/kart/style.css`. Host side: `host/kart/kart-controls.js` and `host/kart/setup.js`.
- Headless Chromium draws the test drive at about 2 fps, too slow for Playwright's own clicks on End game's two-click confirm, so the M6b browser test clicks host HTML buttons through the DOM.

### M6c: Techniques spike (drift, boosts, phone buttons) (done)
- The test drive has MK8DX's techniques, as DOM-free rules in `host/games/kart-3d/`: hop and drift, the mini-turbo charge counter and its three levels (`kart-techniques.js`), every boost, the stall and dash panels (`kart-boosts.js`), `slipstream.js`, the spin boost in `kart-bumps.js`, and the countdown with the rocket start (`rocket-start.js`). Walls moved to `kart-walls.js`. Numbers and how each works are in "M6c: techniques spike" in `docs/3d-findings.md`; the windows for the rocket start and the trick are guesses until the device run sets them.
- Every drive starts with a countdown; the host's Restart button starts another. The readout logs, per player, when Go arrived after "2", when Drift came at the lip, and the phone's round trip (the host pings each phone every 2 s), so the device run can set the windows.
- Phone: `KART_BUTTONS.DRIFT`; the shared `controller/kart/controls.js` takes `{ describeStatus, drift }`. The 3D race's buttons are a grid: Drift above Go, an empty Item place left of Drift, Brake below it; with auto-accelerate Drift takes both rows. A held Drift also accelerates (one thumb cannot hold both). The view carries `countdown`, `spark` (the Drift button's colour) and `start`.
- Device run so far: rocket starts arrived +0.13 to +0.57 s after "2" with round trips of 11-113 ms, all inside the window (left at 0-0.6 s); with auto-accelerate a rocket start works by holding Drift; the spark colour on Drift, the trick and the spin boost work. The hairpin to orange and purple, dash panels and slipstream work too. The feel did not match MK8DX (steering, walls, bumps, pose transitions, a hop too low): those notes are M7a's starting list.
- Drawing: drift sparks, boost flames and stall smoke (`effects.js`, one point cloud), dash panels on the road, the body leaning into drifts, rolling in tricks and spinning in spin boosts (`kartPose` returns `bodyForward`/`bodyUp` apart from the camera's `forward`/`up`), and the camera pulling back while boosting.

### M7: 3D kart race (in five parts)
A second kart game in the lobby's list, 1-4 players, separate from the 2D race (its own rules and physics), with the same setup, ready and results flow as the 2D race. It builds on `host/games/kart-3d/` from M6b and M6c and adds the M7 rows of "3D kart race design". Split after the M6c device run, each part in its own chat: the feel comes first, because the track's size, the CPU drivers and the look are all built around the tuned speeds and turns.

#### M7a: Feel pass (on the test track) (done)
- Every tuned number lives in `host/games/kart-3d/tuning.js` (value, slider range and meaning); the rules read the live `tuning` object every step. The host's **Tuning** button (drive panel) opens a slider for each, and **Copy values** gives `key = value` lines (changed ones marked with their default) to paste back to Claude, who writes them into `tuning.js`. Values last until the host page reloads. Rule for every later milestone: anything tuned gets an entry there, and so a slider and a line in the copy.
- Rules changed: a steering curve (gentle near the middle as before, 60 deg/s at full stick), wall hits that cost speed by angle and bounce (riding the wall is the slow line, unit-tested), bumps with a least parting speed, a short loose-grip slide after either, a higher hop with its own height and time, and the body animation in `kart-body.js` (a spring lean that starts in the hop, a trick roll that always finishes). Numbers and measurements: "M7a: feel pass" in `docs/3d-findings.md`.
- Phone: with tilt the 3D race puts Drift on the left and Brake left of Go, the Item place above Go (confirmed on the device run). The buttons now lay out on `#kart-controls`' grid, which is also the button input's surface.
- First device run done: top speed, steering, walls, bumps, hop, lean and the rocket window (0.3-1.2 s after "2") were tuned to feel like MK8DX's 150cc and are the defaults now ("Device run (first tuning)" in `docs/3d-findings.md`). Added after it: a rocket start boosts longer the earlier it lands in its window, and every boost's speed has a slider. At 32 units/s the test track's hairpin needs braking; M7b's course is designed for the tuned numbers. Tuning stays in the game for later passes.
- The boost speeds have sliders but keep their starting values (MK8DX's where it has them); tune them against normal speed in a later pass. Steering ended at 67 deg/s at full stick and 72.5 fully into a drift (a drift must turn tighter than steering, as in MK8DX).

#### M7b: The race on a real track (done)
- "Kart race 3D" (`kart-3d`, 1-4 players; one player races the CPU karts): setup (course, laps and engine class on the host, control style and ready on the phones), countdown with the rocket start, laps, places, results with Race again or Back to lobby. Rules in `host/games/kart-3d/race.js` (replacing `drive.js`; phases countdown/racing/results), views in `race-views.js`. The race ends when every player has finished or 30 s after the first player did; a finished player's kart, and every kart at the results, is driven by the CPU driver. The 3D spike is gone.
- Engine classes are a share on each kart (`engineClassShare`); every rule reads `kartTopSpeed(kart)`, so the Top speed slider still means 150cc.
- The track model has a road width per piece (`halfWidth`, eased) and per-side grass (`shoulderLeft`, `shoulderRight`). Two courses, listed in `courses.js` (each a track definition with an `id` and a `name`) and chosen on the host's setup screen: `seaside-skyway.js` (1213 units, 39 s a lap for the CPU driver at 150cc, designed from the course study in `docs/mk8dx-reference.md`) and the M6b `test-track.js` (whose hairpin needs braking at the tuned speed). The renderer swaps a course's road and scenery in the same WebGL context (`showTrack`). A new course is a new file plus a line in `courses.js`.
- Host HUD per view (`view-hud.js`): name, lap, place (bottom right, lifted above the shell's game bar in that corner), "Final lap!" and "Finish!" banners; the race clock top right; the readout only with the tuning panel. Phones show the place and lap; no protocol change was needed.
- Device run passed: the race on Seaside Skyway felt fine, with nothing to change.
- The CPU karts still use M6b's lane-following dummy driver (no drifting, no boosts); M7e replaces it. The quiet wide straight after the hairpin is where item boxes will go.

#### M7c: The look (done)
- Toy karts of our own (`kart-models.js`; a helmeted driver in the player's colour until M7d5's designs replaced it; wheels that roll and steer from `kart.wheelTurn`, drawing only), glossy paint reflecting our own sky (`createSkyEnvironment` in `scenery.js`; `RoomEnvironment` is gone from `host/vendor/`), bloom once over all views (`bloom.js`, the gaps between views cleared again after it), a lower sun, glowing sparks, dash panels and anti-gravity lines, off-road dust. Every shader, bloom's included, is built while the game starts (a warm-up frame).
- A course is dressed when its definition names a `scenery` (`buildTrack` passes it through; `SCENERIES` in `scenery.js`, which since M7d2 names each scenery's road builder too, and since M7d3 every course must name one). M7c's own Seaside dressing was replaced by the kit in M7d3. A new course's dressing is an entry there plus its name in the course file.
- "Look" on the host's setup screen (`quality.js`): High (bloom, pixel ratio 1), Medium (no bloom), Low (no bloom, ratio 0.7). A host-device setting, saved in the host's localStorage, unlike the race settings. Bloom strength, radius and threshold and the exposure are sliders in the tuning panel's "Look" group.
- Device run on the iPad (the main host; the laptop was not tested): the karts look okay, the frame rate is good, no pause was noticed, and the Look setting comes back. Feedback for M7d: the orange dash panel is too bright with bloom, lamps lit in daylight look odd, and the whole look is too plain ("like Roblox, still a prototype") next to MK8DX.
- Browser tests draw WebGL with Mesa's llvmpipe (`--use-angle=gl-egl --ignore-gpu-blocklist` in `test/helpers/browser.js`), about 0.25 s a frame for the dressed course; with SwiftShader it was 1.2-1.9 s and the suite took 18.5 minutes (now 7.8). The 3D behaviour tests start the host at Medium (`test/helpers/kart-3d-host.js`); the M7c test covers High and Low. Which browser tests to run is now picked by area (Testing in `CLAUDE.md`). Numbers: "M7c: the look" in `docs/3d-findings.md`.

#### M7d: The look, close to MK8DX (in five parts)
Asked for after the M7c device run: M7c's look reads as a prototype, and the aim is MK8DX's polish and detail. Copying MK8DX's designs is allowed (see "Copy MK8DX's designs freely" above); the whole map need not be copied, but its ideas are borrowed. Built from small parts up: first the building blocks, then the course made from them. Split into four parts at the start of M7d, each in its own chat with its own device run; a fifth (the kit's objects made close to MK8DX's, M7d4) was added after the M7d3 device run, before the karts. Textures matter as much as shapes (decided at the split): most of MK8DX's detail is in its surfaces, so every kit piece gets its own drawn texture, not a flat colour. The kit also adds interesting pieces that the course does not have yet, not only better versions of M7c's.

##### M7d1: Research and the device-run fixes (done)
- "The look, part by part" in `docs/mk8dx-reference.md` (reviewed): how MK8DX's road, curbs, start line, panels, barriers, lamps, signs, start gates, seaside and sky scenery, sky and lighting, and the Standard Kart look, with sizes against the kart, and a recommended order of new kit pieces for M7d2 (the textured road first, then start lights, a themed gate, sponsor boards, LED-style panels). I approved the whole list of 14 for building in M7d2 and M7d3. Its main finding: MK8DX's surfaces are all textured materials, and the road's edges are never empty.
- Dash panels have their own mesh and a live "Dash panel glow" slider (Look group); lamps on Seaside Skyway are glass lit by the sun, since MK8DX lights lamps only at dusk, night or indoors.
- Device run on the iPad: lamps confirmed; tuned defaults now Dash panel glow 1.6, bloom strength 0.2 (was 0.4), bloom radius 0.3 (was 0.2).
- Decided at the review: 12 kart-and-driver designs, one for each racer (M7d5, planned as M7d4 until the M7d3 device run); items get their own milestone (M8), then glide ramps and spin-boost posts (M9), since each needs new rules.
- For M7d2: a large-scale variation to hide the road texture's repeat (done there; the anisotropy this note said was missing had been set since M7c).

##### M7d2: The kit of building blocks (done)
- The kit is `host/games/kart-3d/kit/`, one module per piece, each with its own canvas texture: the textured road (`road.js` with `road-paint.js`, `road-textures.js`; where its marks go is `road-marks.js`), LED dash panels and an anti-gravity panel (`led-panels.js`), the ramp plate, the start gate with MARIO KART and the start lights that follow the countdown (`start-light-states.js`), sponsor boards on one atlas (`sponsors.js`), barriers in six styles (`barriers.js`), decks beside the road (`platform.js`), the props (`props.js`), the grandstand with a hopping crowd, and bunting. Items 1-11 and 14 of the approved list; the seaside and sky pieces (12, 13) are M7d3's.
- How a course is dressed from it: `scenery.js`'s `SCENERIES` gives each scenery name a `buildRoad(track)` and a `buildDressing({ world, track, sea, keep })`; the dressing makes the kit context with `createKit` (`kit/kit.js`: the shared sponsor material and textures) and calls the pieces with data from a layout file: barrier runs by distance and side (`layout-rules.js`: styles, prop names and reach), decks, prop spots (`{ piece, s, side, out, turn }`), the grandstand, bunting. The road's colours are the course's theme (`buildKitRoad(track, theme)`). `test-track-scenery.js` and `test-track-layout.js` are the example; the unit tests check a layout (every deck outside a wall on level road and clear of the road, every prop on a deck and clear of the barrier).
- The road floats, so anything beside it stands on a deck outside a wall; barriers stand from the rules' wall line outward. `race.js` exports `gridSpot(track, gridIndex)`, which both the grid and its painted brackets use. Every world `update` now gets `(dt, race)` (race null on the setup screen).
- The Test track (`scenery: 'test-track'`) shows every piece (the M7d3 props and turn boards too). In software the kit doubles the Test track's frame time; on the iPad it holds 60 fps on High.
- Device run on the iPad: the pieces look great and much better than M7c; the start lights read clearly; the grandstand with its crowd at the start line is a favourite. Feedback for M7d3: even the dressed Test track still looks sparse.

##### M7d3: Seaside Skyway rebuilt from the kit (done)
- Seaside Skyway (same pieces and driving line) is drawn entirely from the kit: its own road theme (white edge line, coral and pale teal checks, coral curbs, as at Toad Harbor) and a sea-blue start gate (`buildStartGate(kit, theme)`; the Test track passes Mario Kart Stadium's yellow). Two halves themed on its name, laid out in `seaside-layout.js`: the seaside (s 1076-1213 and 0-340: sponsor walls, striped harbour rails, wooden fences and block curbs, a boardwalk and beaches with palms, parasols, loungers, surfboards and lifebuoys, the grandstand with its crowd at the start line) and the sky (s 340-1076: steel guardrails with turn boards, the bridge to the jump included, a garden deck up the climb, trusses under the high road).
- Round it (`seaside-landmarks.js`, plain data): beach islands with turquoise shallows, foam, rocks, palms and huts on stilts, a stone lighthouse ahead of the start straight, a giant Koopa shell, sailboats (`seaside-surroundings.js`); islands floating at and above the road with round trees, backdrop cliffs, shaded cumulus clouds (some at the high road's height), hot-air balloons and a circling airship (`seaside-sky.js`). The new kit pieces are listed in its notes in `docs/history.md`.
- `scenery.js` has no plain road any more: every course names a scenery (`SCENERIES`, now with its own `seaLevel`: -14 for the seaside, -30 for the Test track), whose dressing builds its own supports from the kit (`kit/supports.js`: piers, or trusses on a layout's `TRUSS_RUNS`). M7c's `track-mesh.js`, `trackside.js`, `trackside-spots.js`, `seaside-props.js` and `textures.js` are gone; `turnAhead` and `startLineIndex` moved to `track.js`.
- Every barrier now stands on a concrete ledge jutting from the road's edge (`kit/barriers.js`, both courses), so nothing hangs in the air. Turn boards stand round the outside of corners behind low barriers (`turnBoardSpots` in `kit/layout-rules.js`). The rail fence, guardrail, striped rail and crowd got more detail (wood grain and bolts, bolt heads, capped posts, eyes and cap spots).
- Layout checks shared by both courses' unit tests are in `test/helpers/kit-layout-checks.js`; `test/unit/kart-3d-seaside.test.js` checks that nothing round the course reaches the road or the room above it.
- Device run on the iPad: the seaside and sky halves read as themed and the scenery looks good; 80-90 fps with 4 players on High (the software frame tripled, but the iPad did not mind); the course appears in about a second. Fixed after it: a shoulder (grass) now eases in and out over 16 units in an S curve (`track-builder.js`, a small rule change), where it used to step sideways at a piece's end and leave a notch in the edge to drive out of; a deck's free end tapers away in the same S curve and decks that meet end to end run on as one (`deckDepthAt` in `kit/layout-rules.js`, which also counts a deck's first station, a little before its start, as at that end: it had read as a lap in and left a spike of sand; the left side of Seaside's seaside half is one deck from the last straight to the chicane); every barrier style ends itself cleanly where it starts, stops or changes style (each style's `end()` in `kit/barriers.js`: a wall's cross-section closed, a rail ending on its own post, a row of blocks on a whole block); turn boards face the karts coming into the corner, 1.5 out, posts clear of the barrier, on a ledge that widens to 2.7 under them in an S curve (`ledgeWidthAt` in `kit/layout-rules.js`, used by `kit/barriers.js`; props keep clear of them, checked by `checkTurnBoards` in `test/helpers/kit-layout-checks.js`); and the bridge before the jump has walls now (a rule change: the only road without walls is over the gap). Carried into M7d4: up close, most composite objects still show the simple shapes they are made of.

##### M7d4: The kit's objects, close to MK8DX (in four parts)
Asked for after the M7d3 device run: the scenery works, but most composite objects (barriers, props, the gate, the grandstand, lamps, huts, the lighthouse, trees and the rest) plainly show the few simple shapes they are built from, and still look far from MK8DX's. The study came first, in M7d4a's chat: "The kit's objects up close (M7d4 study, to be reviewed)" in `docs/mk8dx-reference.md`, how MK8DX builds its objects (no sharp edges, two scales of parts, layered pieces, textures with relief, dark creases, fat toy proportions) and, object by object, what ours lack. Split into three parts after it, in the order of how much each is seen, each in its own chat with its own device run; a fourth, a techniques spike (M7d4b), was put before the props after M7d4a (see there). Every part rebuilds the pieces Seaside Skyway and the Test track use to the study (more, smaller parts over each big shape, finer textures with relief) and measures the triangle census before and after (the iPad held 80-90 fps with 4 players after M7d3).

###### M7d4a: Shared tools and the barriers (done)
- The shared tools (in the study's "How to build it"): normal maps drawn from a texture's height field (`toReliefTexture` in `kit/pixel-image.js`; the kit's concrete and wood have one, `textures.concreteRelief` and `textures.woodRelief`); in `kit/extrude.js`, rounded profiles (`roundProfile`) shaded smooth (`smooth`), profiles pushed out for a band or plate (`offsetProfile`), part of a segment (`span`, `stationBetween`) and tubes (`tubeProfile`), with `extrudeSegment` taking an options object; in `shape-utils.js`, `roundedCylinder`, `shaded` (vertex colours for creases) and `roundedBox(..., { chamfered: true })` for small parts repeated hundreds of times.
- Rebuilt with them: the ledge under every barrier, all six barrier styles and the anti-gravity wall, the turn boards, the start gate (its sign and badge drawn in the new `kit/start-gate-sign.js`, the letters raised by the sign's own normal map) and the start lights. New barrier style `PROMENADE_RAIL` (`kit/promenade-rail.js`, Daisy Circuit's blue iron railing with stone pillars), on Seaside's left at s 100-150 and 1150-1214 and on the Test track at s 344-384; turn boards may stand behind it.
- Seaside's scene went from 550,000 to 831,000 triangles (the software frame at the back of the grid from about 0.45 to 0.52 s); numbers and the device run procedure are in "M7d4a" in `docs/3d-findings.md`. For the later parts: chamfer or simplify any part repeated hundreds of times, and run a census before and after.
- Device run on the iPad: looks fine, nothing to change (no frame rates noted).
- After M7d4a, on screenshots before the device run: the barriers look only slightly better and still close to M7d3's, while Seaside's triangles grew by half. That led to the research and the spike below.

###### M7d4b: Techniques spike (detail in textures and light, not triangles) (in two parts)
Asked for after M7d4a. Research in "How games look detailed and still run smoothly" in `docs/mk8dx-reference.md`: games like MK8DX keep models simple and put their detail into textures (colour, normal, specular or roughness maps, often baked from a detailed version of the model) and into baked lighting (ambient occlusion in corners, pre-baked shadows), and they keep draw calls, shadow casters and pixel cost down rather than chasing triangles. M6a measured the same on the iPad: pixels and bloom cost, triangles barely. Like M6, a spike: measured facts on the iPad, side-by-side comparisons, then a decision on which techniques M7d4c and M7d4d use. Split in two at the start of its chat: the measuring tool and the cheap wins first, so the texture and light trials are designed with the iPad's numbers in hand.

###### M7d4b1: Measure tool and cheap wins (done)
- **Measure** on the setup screen (`measure-plan.js`, `measure-run.js`, `measure-panel.js`): a scripted run with no phones (12 karts driving themselves, four standing in for players, frozen at four moments, 1 and 4 views) through about 20 looks: High, Medium, Low, no shadows, Medium without each part of the course in turn, each drawing switch the other way, and M7d4a's drawing as the baseline. Each frame ends by reading back one pixel (`gpu-probe.js`), so it is timed with the GPU finished (Safari has no GPU timers, and the refresh rate caps fps). The report is text to Copy and paste back to Claude.
- Three cheap wins, each a switch in the tuning panel's new "Drawing" group (spike only: once the iPad's numbers decide, set the defaults in `tuning.js` and remove the losing ways and the switches): `cullCellSize` (the course's big meshes cut into square cells after it is built, `split-meshes.js`, so views skip what they do not see; 0 = off, default 100; instanced meshes moved by index carry `userData.keepWhole`), `shadowPerView` (a 1024 map fitted round each view in turn instead of one 2048 map over the course, `sun.js`, snapped to whole texels; default on), `smallPartShadows` (posts and post blocks; default on).
- The road, the sea and each part of a dressing are named (`kitPart` in `kit/kit.js`, `KIT_PARTS` in `kit/layout-rules.js`): every course's dressing must build each piece into one of the parts. A quality level is one look of `renderer.js`'s `setLook({ bloom, pixelRatio, shadows, hidden })`.
- **Device run (the iPad's Measure report, in "M7d4b1" in `docs/3d-findings.md`):** plenty of room: High with 4 views 12 ms a frame (14 at worst), Medium 9.3, one view 6-7.5, the GPU waited for. Triangles barely matter (4.7 million took the same time as 2.5 million); the cheap wins buy no speed (M7d4a's drawing measured as fast); what costs is shadows (1-2 ms), bloom (1.5-2.5 ms) and the barriers (1-2.5 ms). Seen while driving: the map per view and small parts' shadows look nicer, cells change nothing visible, nothing broke.
- **The laptop** (integrated AMD graphics, Chrome): the slow host. Medium 9.8 ms with one view and 15.7 with four (worst 18.3), but High 23-32 ms: bloom costs it 14-16 ms, and draw calls cost its CPU (10 ms with 4 views). With a map per view, cells of 200 are its best choice (15.1 ms with 4 views, against 17.4 without cells).
- **So for M7d4b2:** keep the shadow map per view and small parts' shadows (for the look), and cells of 200 (they cost the iPad nothing and save the laptop 2 ms with a map per view, with fewer draw calls than cells of 100); detail can be spent on triangles as well as textures, since neither host minds them much; the choice of techniques there is about how close the look gets to MK8DX, not about speed. Bloom at a lower resolution would make High usable on the laptop (later, not in M7d4b2 unless asked).

###### M7d4b2: Detail in textures and light (done)
- M7d4b1's choices are fixed: cells of 200 (`CELL_SIZE` in `scenery.js`), a shadow map per view in races (the overview keeps one over the course), small parts cast shadows. Its switches are gone.
- Four trials, each a switch in the tuning panel's "Drawing" group (`textureDetail`, `bakedShade`, `courseLight`, `photoAsphalt`; 1 on, the default; 0 draws as M7d4a; a change rebuilds the course). Measure times each the other way and all four off. The world is built with `drawingSwitches()` (`tuning.js`), which reach the pieces as `kit.drawing`:
  - Detail in textures on the gate's posts, the striped rail (also reshaped to the study's re-check) and the padded sponsor wall. Their bolts, seams and panel edges are drawn in colour, normal, shade (AO) and roughness maps on simpler shapes, with a new drawing kit, `kit/surface-maps.js` (`toShadeTexture` in `kit/pixel-image.js`, `wrapUv` in `shape-utils.js`).
  - Shade (AO) baked into vertex colours round the start line from 96 depth maps (`baked-shade.js`, `occlusion.js`). The road's outer lanes are cut near its edges so the shade can show there.
  - Light from an environment map taken from the course (`course-light.js`), with a strength slider in the Look group (0.7, tuned on the device run). The sky light drops to 30%, and the sea keeps M7d4a's reflections.
  - A CC0 photo-scanned asphalt (ambientCG Asphalt 023 S, 1K JPG in `assets/textures/`, 4.9 MB, loaded in `load()`).
- LOD and simpler far dressing were not built: M7d4b1's numbers say triangles barely matter and the far parts cost under a millisecond.
- In software a course build now takes about 10 s more (the bake and the light), so the 3D browser tests allow 60 s to start (`test/helpers/kart-3d-host.js`).
- **Device run (iPad, in "M7d4b2" in `docs/3d-findings.md`):** with every trial on the look is closer to MK8DX, so all four stay; the course light tuned to 0.7. They cost little (0.6-0.9 ms all together; Medium with 4 views 11.9 ms, High 13.3). The course appears in under 2 s. Nothing broke. The readout showed a steady 60 fps where the frame times allow about 75: probably a cap in Safari, not checked.
- **So for M7d4c:** the techniques are detail in textures (maps drawn with `kit/surface-maps.js`), baked shade, the course's light and photo-scanned CC0 sets where they beat ours. Its first item removes M7d4a's ways and the switches.

###### M7d4c: The props on the decks (in five parts)
Split at its start (2026-11-01), with these decisions: of M7d4a's other pieces only the promenade railing and the padded sponsor wall are improved (the guardrail stays as it is); the baked shade covers the whole lap, and the 3D rules tests draw a plain course so it does not slow them; every part is reviewed on picture sheets of single pieces before its device run; and models may come from Blender, driven by Python scripts in headless mode (Claude writes and runs them; the user installs Blender and reviews the sheets), tried first on one prop against ours. Each part in its own chat with its own device run.

###### M7d4c1: Cleanup and tools (done)
- M7d4b2's four trials are fixed on: the gate, striped rail and padded sponsor wall always draw their detail in textures (`kit/surface-maps.js`), the asphalt is always the photo set, the course always bakes shade and takes its light (`courseLightStrength` 0.7 in the Look group). The Drawing switches, `drawingSwitches()`, `kit.drawing`, our drawn asphalt and M7d4a's ways for the three pieces are gone; Measure keeps its quality and part looks. `createKit({ world, track, keep })`, `buildScenery(scene, track, { photoAsphalt, plainCourse })`; `scenery.js` exports `addSkyLight(world)`, `seaside-scenery.js` its `GATE_THEME`.
- The shade is baked round the whole lap (`baked-shade.js`: pieces of 100 stations, depth maps of 1024), and the renderer keeps each course's shade (`bakeShade(renderer, world, track, saved)` returns it), so a course shown again is not baked again. In software: Seaside Skyway 21.5 s, the Test track 10 s, a course shown again 0.2 s.
- **`npm run kit-shots -- [--name <sheet>] <pieces...>`** (`tools/kit-shots.js`, the page in `host/kit-shots/`, also open by hand at `/host/kit-shots/index.html?piece=guardrail&view=near`): each barrier style, prop or `start-gate` on a short straight, lit as in the race with shade and course light, at kart height and from above, into `test-results/review/<name>.png`, about 7 s a shot. Every later part makes a `before` sheet first and an `after` sheet at the end. New pieces go in `host/kit-shots/pieces.js`.
- **Watch, no phones: 1 2 3 4 views** on the setup screen (`stand-ins.js`, shared with Measure): a race of 1 to 4 self-driving stand-ins ("View 1" to "View 4", the CPU karts' dummy driver) with a view each, the Tuning readout as in a race, the phones waiting; Back to setup or Restart as usual. Device runs check the frame rate with several views this way instead of with four phones.
- **Device run (iPad):** the course still appears in about 2 s or less with the whole lap baked, the shade looks right round both laps, Watch 4 on High holds a steady 60 fps.
- A **plain course** for the 3D rules browser tests (`plain-course.js`, `plain-scenery.js`): road, sea and plain walls, no dressing, bake or course light, set in localStorage before the page loads (`presetPlainCourse` in `test/helpers/kart-3d-host.js`), used by `m6b`, `m6c`, `m7a`, `m7b`. The full browser suite takes about 14.5 minutes.

###### M7d4c2: Blender spike (done)
- The palm was built two ways to the study and compared: **in Blender** (`npm run blender -- palm [--preview]`, `tools/blender.js` running `tools/blender/palm.py` and `common.py` in Blender 5.2.3 headless, found through the `BLENDER` env var: a detailed palm baked with Cycles (normal, shade, colour, the fronds' cut-out) onto a game palm, exported as `assets/models/palm.glb`, 929 KB, 4,128 triangles, in the manifest; 107 s a build with previews; dev only, committed) and **in our JS** (`kit/palm.js`, `kit/palm-trunk.js`, `kit/palm-textures.js`, about 2,170 triangles; `createPalmMaterials`, the kit's `palm: { trunk, fronds }` replaces `fronds`). The race draws our rebuilt palm; the `.glb` is loaded only by kit-shots (`host/kit-shots/blender-palm.js`: pieces `palm-blender`, `palms-side-by-side`, `palm-close`, `palm-blender-close`). `GLTFLoader` (with `SkeletonUtils`) is vendored from Three.js 0.186.1. A kit-shots piece's `build` may return a promise.
- On the sheets the Blender palm is clearly closer to MK8DX, above all close up (scalloped scales with dark creases, a fuller crown); the two took about as long to build. Numbers and the MCP trial: "M7d4c2" in `docs/3d-findings.md`.
- Blender Lab's MCP server is installed on the dev box (local scope, not in the repo; start Blender with `blender --background --online-mode --command blender_mcp`). A live try took 47-57 s against 107 s for a script run, but every live change must be ported back into the script. Scripts stay the source of truth either way.
- **Device run (iPad):** the Blender palm looks better; the rebuilt JS palms show on the course; Watch 4 on High holds 60 fps.
- **Decided after it (the user):** Seaside Skyway and the Test track stay all Three.js: nothing on them is replaced by Blender, so M7d4c3 to M7d4d build in JS as before. Blender is for another course in the future, built with this pipeline (then load `.glb` models in the race's `load()`, as the photo asphalt, and split `palm.py` (405 lines) and `common.py` (291) by responsibility before adding to them). Python stays in the repo for Blender's scripts (`tools/blender/`, dev only). The MCP server stays installed as an optional tool for trying changes on a live Blender; the scripts stay the source of truth. The `.glb` and the kit-shots palm pieces stay as the pipeline's example.

###### M7d4c3 to M7d4d: Every kit object rebuilt to the study (done)
Built as one queue in one chat (2026-11-01, at the user's request), 14 tasks by implementer subagents, 3 at a time; the specs and how it went are in "M7d4c3 to M7d4d" in `docs/history.md`, the numbers and the device-run procedure in `docs/3d-findings.md`.
- **Every prop and landmark builds its own parts:** a builder takes the kit and returns `[{ geometry, material }]`, making its own materials with `kit.keep` or using `kit.materials` (plastic, painted, iron, glass, made in `createKit`); `props.js`, `seaside-surroundings.js` and `seaside-sky.js` only place. Each piece is in its own file (no files of re-exports).
- **Rebuilt (c3):** the promenade railing (fat posts, stone-block pillars with Daisy's flower plaque, lanterns) and the padded sponsor wall (its z-fighting kick strip fixed, chain-link with relief); the grandstand (`grandstand*.js`: two decks of seat shells on lattice columns, a cantilevered roof, stairs, the crowd on the seats); the floodlight, bunting (pastel now: normals leaned up), sponsor stand (one framed board) and MKTV van (with a Toad and a camera). **(c4):** the palm, now close to the Blender palm in JS (4,128 triangles); parasols, loungers, surfboards, lifebuoys, barrels; the street lamps. **(c5):** cone, tyre stack, warp pipe, giant mushroom; the round tree (a ball of leaf scales), hedge, planter; relief on the decks' boards, paving and sand (`kit/deck-maps.js`). **(d):** the lighthouse, stilt huts, Koopa shell, a motor yacht among the sailboats, and the rock of the floating islands, backdrop cliffs (no longer inside-out) and beach rocks (`kit/rock-maps.js`, shared with the lighthouse stone through `kit/cell-noise.js`). Clouds, balloons, the airship and the trusses were left as they were.
- **Cost (measured in software):** Seaside Skyway's scene from 913,000 to 1,516,000 triangles, its textures from 50 to 81 MB (uncompressed), and the scenery's build from 6 s to 14 s before the bake (the maps are drawn in JS at every build). The device run times how long the course takes to appear on the iPad; if it is too slow, draw the maps once per game rather than per build.
- **kit-shots:** a piece for every kit object (`host/kit-shots/pieces.js`, `landmark-pieces.js`); props stand on a deck beside the road (`road: 'decked'`), sea pieces stand in a sea, `focus.eye` sets the near view's height. Runs share 2 machine-wide slots (`tools/machine-slots.js`).
- Carried on: the shared nearest-point code is the only helper two textures share; any later texture of stones or slabs uses `kit/cell-noise.js`.
- **Device run (iPad):** Seaside Skyway takes about 4 s to appear (was about 2 s: the maps drawn at every build; drawing them once per game would win most of it back, if wanted). All the props look a lot better, except the floating islands and backdrop cliffs, which look bad (stacked rings of round shapes, unlike real rock) and make no sense: they go in M10 Polish's first step (planned as M7f until the M7e device run), with the course brought down near the sea.

##### M7d5: Karts and drivers (done)
Built 2026-11-01/02: one kart reviewed round by round until the user approved it (JS chosen over Blender), then the other 11 drivers as a queue. The specs and how it went are in "M7d5" in `docs/history.md`, the numbers and the device-run procedure in `docs/3d-findings.md`.
- **12 designs, one per racer** (`host/games/kart-3d/karts/kart-designs.js`).
  - The cast, in slot order: Blaze (red kid racer), Pip (blue penguin), Fern (green frog), Bolt (yellow robot), Grimble (purple gnome), Rusty (orange fox), Inky (teal octopus), Mochi (pink bunny), Sprout (lime turnip kid), then Bruno (bear), Rhino and Wisp (ghost), CPU only, slots 9-11.
  - Each design is a file in `karts/drivers/`: `{ id, name, slot, palette, drawEmblem, buildDriver(seat) }`.
  - Every kart is our own go-kart (inspired by MK8DX's Standard Kart) in its design's three colours, with its emblem on the nose.
  - The cast is original: Claude does not reproduce Nintendo's characters.
- **Who drives what:** a player drives the design of their lobby colour slot, and CPU karts take the designs nobody holds, lowest slot first (`assignDesigns` in `karts/kart-roster.js`). Every kart in a race looks different.
- **Budgets:** a kart with its driver is at most about 25,000 triangles in 10 draw calls: six material kinds (glossy, matte, skin, cloth, metal, decal) plus four wheels. All 12 designs build in about 0.6 s in software.
- **The skin kind glows faintly in each part's own colour** (`kart-materials.js`), so faces, fur and hide stay bright in a kart's shade.
- **Anti-gravity:** the wheels turn flat and their rims glow cyan, eased over 0.25 s (`karts/anti-gravity.js`).
- **Helpers:** `effects.js` takes the exhaust and rear-wheel spots from `karts/kart-layout.js`; `kart-shapes.js` is gone, and the karts' curved shapes are in `karts/curved-shapes.js`.
- **kit-shots pieces** for every design: `kart-<id>`, `-side`, `-close`, `-antigravity`, and `karts-lineup` (`host/kit-shots/kart-pieces.js`).
- **References:** the style references are in `test-results/reference/m7d5/`, not committed, with Blaze's approved sheet beside them (`blaze-approved.png`).
- **Device run so far:** the flicker on High with 4 views (whole frames cyan or green) is fixed (`a48167c`, the cause in `docs/3d-findings.md`): no flicker on the Galaxy S24 or the iPad. iPad Measure: High with 4 views 17.5 ms (M7d4b2: 13.3), so Watch 4 drops from 60 to about 40 at times; the karts cost 3.4 ms with 4 views (about 900 more draw calls, shadow passes included) and bloom 3.5 ms (was 1.4, likely the flicker fix's clamp pass). Still above MK8DX's 30 fps with 3-4 players; the fix went into M10 Polish.
- **Device run finished (iPad, 2026-11-04):** the designs look good enough, the anti-gravity wheels are liked, each phone drives its lobby colour's design. Seaside Skyway now takes almost 7 s to appear (M7d4d: about 4 s).
- **Blender:** the Blender build of Blaze was never merged, and its branch was deleted after the M7e device run (its last commit is in `docs/unused.md`). Blender is still for future courses only.

#### M7e: CPU drivers (done)
Built 2026-11-03; the details are in "M7e" in `docs/history.md`, the numbers and the device-run procedure in `docs/3d-findings.md`.
- **The CPU driver** (`cpu-driver.js` with `cpu-road.js`, `cpu-aim.js`, `cpu-drift.js`, `cpu-trick.js`, `cpu-recovery.js`) drives every kart that drives itself: the CPU karts, a player's kart once finished, every kart at the results, and the Watch and Measure stand-ins. Its state is plain data on the kart, `kart.cpu` (null for a player driving), made by `createCpu(level, seed)`; `cpuControls(track, kart, karts, dt)` gives a phone's controls. It follows the racing line with its own small offset, brakes only for what the corners ahead need (from the live tuning), drifts corners for mini-turbos, tricks off ramps, passes slower karts and gets itself going again when turned round or stuck. `dummy-driver.js` is gone (the rules tests' scripted player is `test/helpers/lane-driver.js`).
- **The racing line** (`racingLineFor(track)` in `racing-line.js`, pins in `racing-line-pins.js`): out-in-out, per station, worked out once per track (about 60 ms for Seaside Skyway, when the race is set up), straight over jumps, over the dash panels.
- **CPU level** on the host's setup screen: Easy, Normal, Hard (`cpu-levels.js`, default Normal): corner speed, top-speed share, spark target, drift and trick chances, rocket-start chance, how far from the line. Passed as `createRace(track, playerIds, laps, engineClass, cpuLevel)`.
- **Race rules for CPUs** (`race-cpus.js`): CPU rocket starts at GO by level (seeded, the same every race), and a mild catch-up every step: `kart.paceShare` from `cpuPaceShare(gap)` (`cpu-pace.js`), up to ±5% top speed at 200 units from the leading player, multiplied into `kartTopSpeed`.
- **Sliders** in the tuning panel's "CPU drivers" group: catch-up share and range, look-ahead, braking.
- **Measured in Node:** a lone kart laps Seaside Skyway at 150cc in about 35.7 s (Hard), 36.2 (Normal), 37.2 (Easy), against the old dummy driver's 39; no kart fell off in 3 laps at any class; the 12 drivers cost about 0.1 ms a step.
- **Device run (iPad):** the CPUs do all of the above. Normal: winning from 12th is doable; Hard: quite challenging; Easy drives like the old default driver, which is good. The levels stay as they are, the sliders at their defaults (kept in the panel); nothing broke.
- **After it:** the 3D race starts from the lobby with no players (`minPlayers: 0` in `host/games/index.js`), for Watch; a race still needs a player.
- For M8: CPUs will need to pick up and use items; the driver's aim (`cpu-aim.js`) is where steering toward item boxes would go.

### M8: Items (our own) (built, device run pending)
Our own nine items replace MK8DX's (no coins). Everything in detail, with the queue's interfaces and decisions, is in
"M8" in `docs/history.md`; the device run in "M8" in `docs/3d-findings.md`.
- **The system:** item boxes in rows (`track.itemBoxRows`), a roulette, one held item used with the phone's Item
  button (`KART_BUTTONS.ITEM`), odds by place by each item's role (catch-up, defend, even), CPU karts using items
  (`items/cpu-items.js`), Items On/Off and one switch per item on the setup screen (Watch races too). Every number
  is in the Tuning panel's Items group (`items/item-tuning.js`).
- **The code:** all in `host/games/kart-3d/items/`: rules are plain files (`item-rules.js` steps everything once a
  race step; `item-catalog.js` has one entry per item, `{ role, use }`), drawings end in `-look.js`/`-drawing.js`
  and are listed in `item-drawing.js`'s `DRAWINGS`. Icons for phone and host in `shared/item-icons.js`.
- **The items:** bouncy, big, small (kart effects, 5 s); blocker (sandcastle) and ramp (kicker), road objects with
  a lifetime (`race.items.objects`); teleport, magnet, push, sticky walls (field items).
- **Split candidates for M10:** `renderer.js` (260 lines), `kart-physics.js` (222), `createRoadObjectDrawing` (about
  140 lines in one closure), `sticky-walls-look.js` (204).

### M9: Glide ramps and spin-boost posts
Both need new rules (gliding in the air; a post that gives a spin boost when hit), so each is designed in that chat before building.
- [ ] Glide ramps: a blue ramp launches the kart into a glide with its glider, steered in the air, as in MK8DX
- [ ] Spin-boost posts in anti-gravity sections
- [ ] Added to Seaside Skyway or a new course

### M10: Polish
The first step is Seaside Skyway down by the sea (planned as M7f until the M7e device run, when the user moved it here, after items and glide ramps). Asked for after the M7d4c3-d device run: most of the props round the course cannot be seen from a road high over open sea. Probably more than one chat: its first chat proposes a split.
- [ ] Seaside Skyway's road brought down close to the sea and run across several islands, so the decks, props and surroundings are seen from the karts; the jump, climb and anti-gravity sections kept, redesigned where the new ground needs it (designed in that chat, with a top-down sketch, before building). Item boxes (M8) and glide ramps or spin-boost posts (M9) on the course move with it
- [ ] The floating islands and the backdrop cliffs removed (they look bad and make no sense); mountains on the horizon are fine
- [ ] A study of real rock formations (and MK8DX's rock) before any new rock is built: the islands' rock was rings of round shapes, which rock is not
- [ ] Sound effects and music (MP3/M4A, small)
- [ ] The UI of the whole app improved, not just the kart race: the lobby, the controller pages, every game's phone screen and setup (asked for after the M8 device run)
- [ ] iPhone: a double tap zooms the page in and it cannot be zoomed back out; stop the zoom everywhere (very annoying for iPhone players)
- [ ] Every phone layout in portrait only, so players can lock rotation and turn the phone when they need to (simpler to design too); tilt steering checked with the phone turned but the page in portrait
- [ ] Host "Tap to start" screen (unlocks audio, requests fullscreen where supported)
- [ ] Loading screen with a progress bar (lazy loading and the ready check already exist from M5a)
- [ ] Revisit what happens when a player drops mid-race, using the device runs of M5b, M5c and M7 (M5b's choice: the kart keeps its place with neutral input)
- [ ] The 3D race back to a steady 60 fps on the iPad with 4 views on High (M7d5's Measure: 17.5 ms a frame, drops to about 40 fps): the karts' shadows from a simple one-mesh stand-in per kart (each kart's 10 draw calls are drawn again in every view's shadow pass) and bloom's clamp folded into its first pass (bloom went from 1.4 to 3.5 ms with 4 views after the flicker fix); measure each with Measure (decided after the M7e device run)
- [ ] Optional: Seaside Skyway takes almost 7 s to appear on the iPad (M7d4d: about 4 s): drawing the kit's maps once per game instead of at every build would win most of it back (M7d4d's note)

### M11: Deploy to Termux
- [ ] Soak test: server idle with the screen off for 15-20 minutes (`termux-wake-lock` held, battery optimization off for Termux), then confirm devices can still connect and rejoin
- [ ] Check the hotspot does not auto-switch off when idle
- [ ] HTTPS working on the phone using the approach chosen in M2
- [ ] Play a full 2D and a full 3D race on the real setup
- [ ] Document setup in `README.md` (Termux from F-Droid, `pkg update && pkg upgrade`, clone, `npm install`, `npm start`)

## Later ideas (not now)

- Service worker for a fully cached offline host (possible once HTTPS works). Only if M6 measurements show that downloading files from the server phone is what makes the host slow; caching does nothing for parse and decode time. Needs your go-ahead (hard constraint 2), and should not bring a build tool (hard constraint 6). Long-lived immutable caching needs content-hashed file names, which without a build step is practical for big assets (models, textures, audio, via `assets/manifest.json`) but not for code, which stays on `no-cache` with 304 revalidation
- Resume a game after the host tab is refreshed or killed: the host would send periodic state snapshots for the server to keep as an opaque blob. Today a host reload ends the room (new code), so that would have to change first. Storing a blob is not game logic, but it is new server behaviour: ask before building it
- For the 2D race: items, drifting and more tracks. For both: character and kart selection (MK8DX's stat system is in `docs/mk8dx-reference.md`). The 3D race's MK8DX features are planned in "3D kart race design"
- More screens for the 3D race, so it can take more than 4 players or give each player a full view. Two options, both needing a new "host -> many" state broadcast in the protocol (today the host only sends per-player `CONTROLLER_STATE`), and both kept open by "State as plain data":
  - *Each phone draws its own view.* The host still runs the physics and sends a compact state snapshot (positions, rotations) about 20-30 times a second; each phone runs Three.js and smooths between snapshots. The phone is then both screen and controller. Costs: phones need the 3D assets (against "controllers load instantly"), the hotspot carries 9 x 30 snapshots a second, and phones get hot. Tilt steering is awkward while watching the same screen.
  - *Several host screens.* A second page (for example `/view`) on another device receives the same snapshots and draws, say, players 5-8. Fewer devices, but each needs a big screen.
- Spectator view
- Phone vibration (on button presses, and later on bumps and boosts, like the Switch's rumble). M7a built a 15 ms `navigator.vibrate` on every button press, but on the device run nothing was felt on Android or iOS, so it was taken out. iOS Safari has no `navigator.vibrate` at all, so iPhones never buzz. Android Chrome has it, but did not buzz here; to find out why before trying again: a longer pulse (15 ms may be too short to feel), the phone's own vibration and touch-feedback settings, battery saver, and whether Chrome on that phone vibrates at all (a test page that calls `navigator.vibrate(200)` from a tap)
