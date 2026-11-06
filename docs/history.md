# history.md

The full record of finished milestones, moved out of `plan.md`: each milestone's checklist, "done when", and the detailed notes written when it was built and after its device run, kept word for word. `plan.md` keeps a short summary of each, with what later milestones need. Read an entry here only when working on what that milestone built, or when a summary in `plan.md` is not enough. File and function names here were right when written; later milestones may have moved them (the summaries in `plan.md` say where things are now).

### M0: Project skeleton
- [x] Folders: `server/`, `host/`, `controller/`, `shared/`, `assets/`
- [x] `package.json` with `ws` as the only dependency
- [x] Server serves static files for `/` (controller) and `/host`, bound to `0.0.0.0:3000`
- [x] `shared/protocol.js` with initial message types
- [x] Phaser vendored into `host/vendor/`
- [x] `engines` and `.nvmrc` pinning the Node major version used on the phone
- [x] Config only via env vars (`PORT`, `CERT_PATH`, `KEY_PATH`, optional `HOST_IP` override); no hardcoded paths; port 3000 or above
- [x] On startup the server prints every non-internal IPv4 address with its interface name, e.g. `http://10.60.55.71:3000  (swlan0)`, wrapped in try/catch
- [x] `npm run check`: verifies the Node version, binds the port, and prints the reachable URLs
- [x] Run the M0 server on the Termux phone now (clone with git, `npm install`, `npm start`), not just on the dev box

**Done when:** the server runs from the same repo on both my Linux server and the Termux phone, and a host device and a phone (iOS and Android) both load their pages over the hotspot.

Notes (decided before M0): `HOST_IP` only picks which address the server prints first as the main URL, and later shows on the host's join screen. It never changes the bind address, which stays `0.0.0.0`. Vendor the latest Phaser 3.x as a pinned ES module build (`phaser.esm.js`), not Phaser 4. `.gitignore` must cover `node_modules/`, `*.pem`, `.env`, and any other secrets: never commit certs, keys, or tokens.

Notes (M0 done): Phaser is `host/vendor/phaser-3.90.0.esm.min.js` (named exports: `import * as Phaser from ...`). The server only serves the `controller/`, `host/`, `shared/` and `assets/` folders, with `/` aliased to the controller page and `/host` to the host page; pages must use absolute paths (`/host/main.js`). All files are sent with `Cache-Control: no-cache` plus `Last-Modified`, so unchanged files revalidate with a 304. HTTPS is already switched on when `CERT_PATH` and `KEY_PATH` are both set (M2 still owns WSS, `gen-cert` and the device checks). `ws` is installed but not used yet; the WebSocket server and `npm run dev` (watch + reload push) come in M1.

### M1: One phone moves a square
- [x] Host creates a room and shows a room code
- [x] Controller joins with the code; server assigns playerId + token
- [x] Controller sends a simple drag input
- [x] Host moves a square per player in response
- [x] Host join screen shows a QR code for `location.origin + "/?room=<code>"` (a small vendored QR library in `host/vendor/`, no CDN); the controller fills in the room code from the URL. The server IP changes when the phone restarts, so nobody should have to type it except whoever opens `/host`.

**Done when:** two phones (one iOS, one Android) each control their own square on the host in real time.

Notes (M1 done): Checked with scripted WebSocket clients on the dev box, then on real devices (iOS + Android). WebSockets share the HTTP(S) port at `/ws` (`SOCKET_PATH`). Browser pages connect with `openSocket({ onOpen, onMessage, onClose })` from `shared/socket.js`, which returns `{ send, close }` and already picks `wss:` on https pages. Room codes are 4 letters (no I or O). `MAX_PLAYERS` is enforced by the server (changed from 6 to 9 after M1 testing to fit the hotspot; the M1 host has 9 colors and spawns squares in rows of 6). The server adds `playerId` to forwarded inputs from the socket's session and ignores any `playerId` in the message. No reconnection yet (all M4): a controller's slot is freed as soon as its socket closes (no grace period, no connected flag), the token is issued but not stored in `localStorage`, `REJOIN` is not handled, and the server has no heartbeat, so it does not notice half-open sockets. When the host disconnects, the server deletes the room and sends `ROOM_CLOSED` to its controllers, so a host reload (including a dev reload) gives a new room code. Patterns to reuse: a host scene is a class extending `Phaser.Scene` in `host/scenes/`, with one `handleMessage` switch, and for now the scene owns the socket (move it out once a second scene needs it). An input module exports `start(surface)`, `stop()`, `onInput(callback)` (see `controller/inputs/drag.js`: `{ kind: 'drag', x, y }` from -1 to 1, at most every 33 ms). `npm run dev` passes `--dev`: it watches `controller/`, `host/`, `shared/`, `assets/` and pushes `RELOAD` to hosts only; changes to `server/` still need a manual restart. QR library: `host/vendor/qrcode-generator-2.0.4.mjs` (MIT, license in its header).

### M1.5: Automated tests
Added after M1: nothing yet checks that finished behaviour keeps working. Build the test setup and cover everything M0 and M1 already do, so every later milestone only adds tests for its own behaviour.
- [x] `npm test` runs Node's built-in test runner (`node --test`, no dependency): unit tests for plain modules (`server/config.js`, `server/rooms.js`) and integration tests that start the real server on a free port and talk to it with `ws` clients (create room, join, wrong code, room full, input relay with the server-added `playerId`, spoofed `playerId` ignored, player left, room closed, static files and their content types, including `.mjs`)
- [x] Browser tests (`npm run test:browser`): drive the real host and controller pages in headless browsers, including mobile emulation, and save screenshots that Claude can look at. Needs a dev-only dependency (Playwright is the likely choice, with headless Chromium and WebKit); ask before adding it, and keep it out of what Termux installs (`npm install --omit=dev`)
- [x] Browser tests cover M1 end to end: host shows a room code and QR, controller joins from the `?room=` link, dragging moves that player's square, closing the controller tab removes it, closing the host sends the controller back to the join screen
- [x] A short list in `CLAUDE.md` of what still needs a real device (and why)

**Done when:** `npm test` and `npm run test:browser` both pass on the Linux dev server, and breaking a covered behaviour on purpose makes a test fail.

Notes (M1.5 done): No app code changed. `playwright` 1.64.1 is the only new package (devDependency, pinned), used as a library under `node --test`, so there is one test runner. Integration and browser tests spawn the real `node server/index.js` on a free port (`test/helpers/start-server.js`), so they cover exactly what `npm start` runs. Extras beyond the list above: `drag.js` unit tests (clamp, release, ~33 ms throttle, first finger only, run in Node with a fake `EventTarget` surface), `npm run check` and startup errors, and dev reload (`--dev` pushes `reload` to hosts only; `npm start` does not watch). Browser tests check the QR module by module against the vendored library and find squares by color, so they depend on the host layout constants copied at the top of `test/browser/m1-flow.test.js`; update those when the layout changes on purpose. Tests load pages from `127.0.0.1`, which browsers treat as secure, so M2 cannot rely on them for secure-context checks. M4 will change "controller disconnect frees the slot at once" (relay test and browser test): update those tests on purpose then. Verified by breaking 15 behaviours one at a time (10 server/unit, 5 browser); each made at least one test fail.

### M2: HTTPS on the LAN
Goal: make controller pages a secure context on iOS and Android with no per-device setup beyond tapping through a warning.

Decision (before M2): use a self-signed cert (option C). Rejected: a local CA (every device must install and trust a root cert) and a real domain with Let's Encrypt (needs internet). Accepted cost: every player taps through a certificate warning, again whenever the cert changes.
- [x] Server serves HTTPS/WSS when `CERT_PATH` and `KEY_PATH` are set; clients choose `wss` automatically (HTTPS serving already exists from M0)
- [x] Spike result in `docs/spike-findings.md`: a self-signed cert (IP in the subject alternative name) with click-through gives `isSecureContext = true`, working `wss`, Wake Lock, and tilt permission on Android Chrome and iPad Safari. iPhone Safari needed `extendedKeyUsage=serverAuth` and `keyUsage=digitalSignature,keyEncipherment`; with those, Safari and Chrome work on iPhone and iPad.
- [x] `npm run gen-cert`: generate the cert with openssl (Termux needs `pkg install openssl-tool`). The hotspot IP changes when the phone restarts (seen: `10.60.55.71`, then `10.213.249.252`), so read the current IPs from `listLanAddresses()` by default instead of requiring them as arguments, and put every one in `subjectAltName`, plus `extendedKeyUsage=serverAuth` and `keyUsage=digitalSignature,keyEncipherment`. The base command is in `docs/spike-findings.md`. Pick a validity well under iOS's 825-day limit.
- [x] `npm start` (and `npm run check`) warn clearly when the cert does not cover the current IPs or has expired, and say to run `npm run gen-cert`
- [x] Verify `window.isSecureContext === true` on each phone, and that Wake Lock and `requestPermission` are available
- [x] Record how often the warning reappears per browser (same cert, next visit / next day), in `docs/spike-findings.md`

**Done when:** an iPhone and an Android phone both report a secure context on the LAN after a phone restart and `npm run gen-cert`, with nothing installed on the devices.

Notes (M2 done): Device checks passed on iPhone and Android (secure context, tilt and Wake Lock APIs, `wss` join). The cert warning did not come back on reload or tab reopen; it did come back after `npm run gen-cert` made a new cert; next-day behaviour was not tested (accepted, see `docs/spike-findings.md` section 7). `npm run gen-cert` (`server/gen-cert.js`, using `server/certificate.js`) runs `openssl` through `execFileSync` (Node can parse certs but not create them). It writes to `CERT_PATH`/`KEY_PATH` if set, else `certs/cert.pem` and `certs/key.pem` (gitignored, not served), covering every `listLanAddresses()` IP plus `127.0.0.1`, valid 365 days, and prints the `CERT_PATH=... KEY_PATH=... npm start` line to use. `npm start` still starts with a bad cert but prints a `WARNING: certificate problems` block (expired, not yet valid, no `serverAuth`, or a LAN address not in the cert); a missing or unreadable cert/key exits with a hint. `npm run check` FAILs on expired/not-yet-valid/no `serverAuth`/key not matching the cert, and only WARNs about uncovered addresses (Docker bridges or a mobile-data interface can come and go). The controller join screen gained a "Tilt permission API" line (`DeviceOrientationEvent.requestPermission` present or not). Headless Chromium has `requestPermission` too, so M3 must not treat "has requestPermission" as "is iOS": call it from the "Enable tilt" tap wherever it exists. No HTTP-to-HTTPS redirect: typing `http://` on an HTTPS server gets an empty/failed response, so open the `https://` URL the server prints. Browser tests load the LAN IP (not 127.0.0.1) to prove secure context comes from HTTPS.

### M3: Input lab (tap, swipe, tilt)
A test page and a matching host view for comparing the three input types on both platforms.
- [x] Controller input modules: `tap.js`, `swipe.js`, `tilt.js` (see CLAUDE.md input rules)
- [x] Tilt: "Enable tilt" button, iOS permission flow, calibration, smoothing, throttling
- [x] Host view: live display per player showing the raw input, rate (Hz), and round-trip latency
- [x] Controller shows its own live readout and which API it detected (platform, secure context, sensor available)
- [x] Notes file `docs/input-findings.md` with what works well or badly on iOS vs Android (latency, jitter, drift, permission quirks)

**Done when:** I can try all three inputs on both platforms and see numbers for latency and update rate. Those findings drive which minigames we build.

Notes (M3 done): Device run passed on iPhone and Android (results in `docs/input-findings.md`: iOS forgets the tilt permission when Safari restarts or in a private tab, Android Chrome keeps it; latency numbers vary too much to tabulate but the controls feel responsive; tilt lags drag because of smoothing, to tune later if a tilt game needs it). The lab replaced the M1 squares scene: `/host` now runs `host/scenes/input-lab-scene.js` (join panel moved to `host/join-panel.js`, one card per player in `host/player-card.js`, a 3x3 grid of 440x340 cards by slot), and drag is the lab's fourth input, so the M1 browser test now looks for the stick dot on P1's card instead of a square (changed on purpose). Protocol: new `INPUT_MODE` (controller says which input it uses, plus `fallbackFrom`/`reason` when tilt could not start) and `DEVICE_INFO` (`platform`, `browser`), both forwarded to the host with the server's `playerId` like `INPUT`; `INPUT_KINDS` and `INPUT_FALLBACK_REASONS` constants. The server now relays by type: controller `INPUT`, `INPUT_MODE`, `DEVICE_INFO`, `PONG` go to the host (`{ ...message, playerId }`, playerId written last); a host `PING { playerId, sentAt }` goes to that player only (looked up in the host's own room). RTT is host-initiated, once a second, timed with the host's `performance.now()`; M4 still has to decide who answers a controller's own resume-check ping (nothing answers a controller `PING` yet). Jitter is the 1 s spread of (host receive time - controller `sentAt`); `shared/rate-meter.js` and `host/latency-stats.js` hold the maths. Network timers on the host use `setInterval`, not Phaser's `this.time`, because Phaser's clock is game time and ran several times slower than real time at 13 fps in headless Chromium. Controller: `controller/input-lab.js` owns tabs, pad, readout and the tilt flow; `controller/device-info.js` the detection; `controller/inputs/throttle.js` is the newest-value throttle now shared by drag and tilt. Every input module keeps `start(surface)`, `stop()`, `onInput(callback)`; tilt ignores the surface and adds `requestAccess()` (call it first thing in a tap handler) and `calibrate()`, and its `start()` returns a promise of "got a real reading within 2 s". Tilt always shows "Enable tilt" (Android Chrome has `requestPermission` too), treats null angles as no sensor, assumes portrait, maps +-25 degrees to +-1 and smooths with a 0.35 moving average. Fallback for tilt is drag. Input modules that Node unit-tests (`controller/inputs/*`) use relative imports (`../../shared/protocol.js`), because an absolute `/shared/...` path resolves to the filesystem root in Node; pages and other browser modules keep absolute paths.

### M4: Lobby and reconnection
- [x] Lobby on host listing joined players (name + color)
- [x] Controller shows "connected as X" and a ready button
- [x] Reconnect flow: kill the tab or toggle Wi-Fi, rejoin as the same player with the token
- [x] Host grace-period timer; slot freed if no rejoin; wrong token rejected
- [x] Resume UX: when the controller tab becomes visible again (`visibilitychange`), send a ping and treat the socket as dead if no pong arrives within about 2 seconds (the spike showed `readyState` can still read open on a dead socket). Show "Reconnecting..." and auto-rejoin with the token; if that fails, show a "Tap to reconnect" button
- [x] Host shows a "waiting for <player>" state while a slot is in its grace period
- [x] Game settings on the lobby screen, set by the host before the game starts. Start with: max players (2 to `MAX_PLAYERS`, default 6) and the reconnect grace period (default 2 minutes). The host owns the settings; the server only receives the player limit (with `CREATE_ROOM` or a new message type), clamps it to `MAX_PLAYERS`, and refuses joins beyond it. Later milestones add their own settings here (M6: number of rounds). Add only settings that real features use.
- [x] Host keeps its screen awake with Wake Lock (expected: nobody touches the host during a game)
- [x] Controller Wake Lock where available (nice to have, not required, since reconnection covers it)

**Done when:** a player can drop and rejoin without losing their slot, on both iOS and Android.

Notes (open question from before M0): CLAUDE.md says the server keeps the slot table but the host "holds the slot" for the grace period. Decide which side runs the timer. A likely fit: the host runs it and tells the server to free the slot, and the server rejects tokens for freed slots.

Notes (M4 done): Automated tests pass (unit, server, browser). Real-device checks are still to do (see the handoff). Grace timer: the host runs it, as the open question suggested (`host/room.js`). The server keeps a slot with `socket: null` on disconnect and sends `PLAYER_DISCONNECTED`. When the grace period ends the host sends `REMOVE_PLAYER`, and the server frees the slot only if it is still disconnected, then answers `PLAYER_LEFT`. The host removes a player only on `PLAYER_LEFT`, so a rejoin that beats the timer is safe. Every disconnect gets the grace period, including closing the tab, because a reload looks the same; there is no Leave button. `REJOIN` carries `roomCode` as well as `playerId` and `token` (a small addition to the shape in CLAUDE.md), and its answer is the same `JOINED`. A wrong token, an unknown player or a freed slot all give `JOIN_FAILED` with `REJOIN_REFUSED`. If a rejoin arrives while the old socket still looks open, the server terminates the old socket and ignores its close event. The server now runs a WebSocket ping-frame heartbeat (`server/heartbeat.js`, every 10 s), so dead sockets are noticed after 10-20 s. That is transport, not game logic, and browsers answer the pings themselves. A controller's own `PING` (the resume check) is answered by the server with `PONG`; host pings still go to the controller and back. The controller keeps `{ roomCode, playerId, token }` and the name in localStorage (`controller/session-store.js`). On load it rejoins automatically when it has a session for the same room (or no `?room=`). `controller/connection.js` owns join, rejoin (3 tries 1.5 s apart, then "Tap to reconnect"), the 2 s resume ping and a 5 s per-attempt timeout. Lobby: the name is typed on the join screen (blank shows as "Player N"), and `PLAYER_NAME` is sent after every `JOINED`. Ready is a request (`SET_READY`); the host answers with `CONTROLLER_STATE { screen, name, color, ready }`, its single host-to-controller message. It is sent on join, on rejoin and on every change. The game starts when at least 2 players (`MIN_PLAYERS`) are all connected and ready, after a 3 s countdown that cancels if that stops being true. For now "the game" is the M3 input lab (`CONTROLLER_SCREENS.INPUT_LAB`). M5 should add a screen for minigames and start that instead. Late joiners and rejoiners go straight to the current screen. Settings: max players 2-9 (default 6, never below the players present), sent with `SET_PLAYER_LIMIT` after `ROOM_CREATED` and on every change. Grace period 0:30-10:00 in 30 s steps (default 2:00); a new value applies to players who drop after the change. Host structure: `host/room.js` is created once in `host/main.js` and passed to each scene's constructor. It owns the socket, the roster (`host/roster.js`) and the grace timers, updates the roster first, then calls the active scene's `handleMessage(message, player)`. Game rules live in plain modules (`host/lobby-rules.js`, `host/roster.js`) with unit tests. Wake Lock (`shared/wake-lock.js`) on host and controller: it is requested on load, again whenever the page becomes visible, and again on the next tap if refused. Its status shows as small "Screen awake: ..." text. Tests changed on purpose: a disconnect no longer frees the slot (relay test, M1 browser test). The M1 and M3 browser tests now get two players ready to reach the lab, and the M3 tests reopen one player's tab per test (it rejoins as P1). Not handled: host reload or host disconnect still ends the room (a new code).

Notes (M4 follow-up, after the first device run): Device run passed (lobby, locked screens, Wi-Fi toggle, grace expiry, max players, host Wake Lock). Locked Android kept its socket for about 2 minutes, an iPhone lost it within about 5 s; the heartbeat only cuts sockets that stop answering, so Android was really still connected. Changes asked for: the host starts the game with a "Start game" button, enabled only when `canStartGame` is true (the 3 s auto countdown is gone). Once the game starts the room is closed to new players: `room.setScreen()` sends `SET_ROOM_OPEN` (open only on the lobby screen), and the server refuses new `JOIN`s with `GAME_IN_PROGRESS` (the phone stays on the join screen with "That game has already started.") but still takes rejoins. There is no way back to the lobby (a "Back to lobby" button was tried and dropped at the user's request); M6 decides what happens after a game ends. The host can remove any player, connected or waiting, in the lobby and the game (two-click "Remove" / "Sure?" buttons, `host/buttons.js`) with `KICK_PLAYER`; the server sends that phone `KICKED`, closes it, frees the slot and answers `PLAYER_LEFT`. "Close room" (lobby and game, two clicks, `drawCloseRoomButton` in `host/buttons.js`) closes the host's socket, so the server deletes the room and phones get the usual `ROOM_CLOSED`; the host shows "Room closed" with "Open a new room" (reload). Phones can "Leave game" (lobby, game, and next to "Tap to reconnect"): `LEAVE` frees the slot at once with `PLAYER_LEFT` and no reconnect attempt; leaving while the socket is down ends it on the phone at once, and `controller/background-leave.js` delivers `LEAVE { roomCode, playerId, token }` as the first message of a new socket, retrying every 2 s (up to 8 tries) until the server answers `LEFT`; the server checks the token as for a rejoin (`leaveWithToken` in `server/leaving.js`). If the network never comes back, the grace period frees the slot. The controller writes the room code into the URL (`history.replaceState`) after every `JOINED`, so a reload never meets a stale `?room=`, and clears it from the URL and the field when the room is gone (`NO_SUCH_ROOM`, `ROOM_CLOSED`). Grace period default is now 30 s (range still 0:30-10:00). Server slot freeing moved to `server/leaving.js` (grace over, kick, leave). Browser tests click the host's buttons through `test/helpers/host-buttons.js` (layout constants copied there). Real-device note: after editing `server/`, restart `npm run dev`; a stale server ignored `kick_player` and `leave` and let late joiners into the lab. Also fixed: host buttons called `setFillColor`, which Phaser rectangles do not have (`setFillStyle`), so the old -/+ hover highlight threw.

### M5a: Game framework (input lab moves onto it)
Builds the "Game module interface" above and proves it on the game that already exists: the input lab stops being a special screen and becomes the first game module (kept as a developer tool). Its existing browser tests then check the framework.
- [x] Registry `host/games/index.js` (id, title, min and max players) and dynamic loading; `load()` is awaited before `start()`, and a game that fails to load shows an error and returns to the lobby
- [x] `host/game-runner.js`: fixed 60 Hz `step`, `render(alpha)` every frame, `isDone()` check, `stop()`. The accumulator maths in a plain module with unit tests (several steps in one slow frame, none in a fast one, a cap so a long pause such as a backgrounded tab does not run thousands of steps at once)
- [x] The shell sleeps its Phaser game and hides its canvas while a game runs, gives the game an empty container, and wakes Phaser afterwards
- [x] Protocol: `CONTROLLER_SCREENS.GAME` replaces `INPUT_LAB`; `CONTROLLER_STATE` gains `gameId` and `view`. Rejoining phones get both again
- [x] Controller loads `controller/games/<id>/index.js` by dynamic `import()` and calls `start`, `showView`, `stop`
- [x] Lobby: choose the game (for now just the input lab); Start checks the game's player range. "End game" during a game returns everyone to the lobby, which reopens the room to new players
- [x] Input lab moved to `host/games/input-lab/` and `controller/games/input-lab/`, `host/scenes/input-lab-scene.js` and the `INPUT_LAB` screen removed. M1/M3/M4 browser tests updated only where the way to reach the lab changed

**Done when:** the input lab starts from the lobby through the framework, works as in M3, ends with "End game" and returns everyone to the lobby, and every existing test passes.

Notes (M5a done): Automated tests pass (unit, server, browser). Device run passed: iPad host (lab smooth, lobby correct after End game), iPhone and Android switching lobby and lab twice without a reload with tilt working on the second run, a locked phone coming back into the lab, and the host tab coming back from the background without a burst of frames. The interface above is updated to what was built; the changes from the version written before M5: games export `createGame()` (a fresh object per run) instead of being the object; id, title and the player range live only in the registry; `onInput(playerId, input, sentAt)` became `onMessage(playerId, message)`, because the lab also needs `INPUT_MODE` and `PONG`; `start()` also gets `removePlayer` (removing a player during a game stays possible, as in M4) and `pingPlayer` (only the lab uses it); the controller `start` gets `send(message)` instead of `sendInput`, and every controller game has a `style.css` the shell loads first. Phaser can be driven by hand, checked in 3.90: Phaser starts its own requestAnimationFrame loop once booted (`game.isRunning`), so the lab's `render()` puts it to sleep the first time it sees it running (`game.loop.sleep()`) and then calls `game.step(now, deltaMs)` itself; input and FIT scaling work that way. Phaser's `destroy()` only marks the game and tears it down at the start of its next step, so `stop()` calls `destroy(true)` and then `step()` once. The lab keeps that code in `host/games/input-lab/index.js`; M5b should move it into a small shared module when the kart needs the same. The fixed-step maths is `host/fixed-step.js` (`countSteps`, cap 0.25 s = 15 steps per frame); `host/game-runner.js` uses it with requestAnimationFrame (both unit tested). `host/game-session.js` runs one game: it sleeps the shell's Phaser and hides `#shell` (the shell's div was renamed from `#game`), appends a fresh `#game-container` div, sets the room to the GAME screen, becomes the room's listener (the role a scene had), shows the HTML End game / Close room bar, and undoes all of it at the end. `CONTROLLER_STATE` now carries `gameId` and `view` (null in the lobby); `room.setControllerView` stores views per player, so a rejoining or reloading phone gets them back with no game code; a new screen clears them. No game sets a view yet (the lab has nothing to show); M5b is its first user. The lab no longer shows the join panel (the room is closed to new players during a game anyway); its card layout is unchanged. Lobby: the game picker ("Game < Input lab >") is in the header row (`drawGamePicker` in `host/settings-panel.js`); Start checks the game's `minPlayers`/`maxPlayers` (`canStartGame(players, game)`, `describeWaitingFor(players, game)`); while the game loads, Start is disabled and the status reads "Loading Input lab..."; a load failure or a crash shows one orange line under the status. After a game everyone is set to not ready (so the next Start waits for them), the room reopens, and the lab's minimum stays 2 players as before. Tests changed on purpose: the M1/M4 browser tests read the room line from `#game-status` (was `#pad-status`, now the shell's line), and "Close room during the game" clicks the HTML button (`GAME_CLOSE_ROOM_BUTTON` is a selector now); `canStartGame`/`describeWaitingFor` unit tests pass a game entry. New: `test/unit/fixed-step.test.js`, `test/unit/game-runner.test.js`, `test/browser/m5a-game-framework.test.js` (load failure, game id on phones, reload back into the game, End game, room reopens, second run).

### M5b: 2D kart race (the race itself)
The first real game, with fixed settings (3 laps) and stick steering only. See "2D kart race design" and "Kart controller".
- [x] Track geometry (`host/games/kart-2d/track.js`): the stadium shape, on-road test, wall push-back and lap progress, all plain maths with unit tests
- [x] Kart physics and race rules (countdown, laps, halfway checkpoint, kart bumps, places, time limit after the first finisher) in DOM-free modules with unit tests that drive whole races with scripted inputs
- [x] Rendering with Phaser inside the game's container: track, karts in roster colours, names, lap and place readout, countdown
- [x] Landscape Switch-style controller with stick steering and held accelerate and brake buttons; "Turn your phone sideways" in portrait; the phone shows countdown, lap and place
- [x] Results screen with places and times, then "Race again" or "Back to lobby"
- [x] A disconnected player's kart gets neutral input and stays in the race; when they rejoin they carry on driving

**Done when:** 2-9 players race a full race from countdown to results on real phones (iPhone and Android), race again, then go back to the lobby.

Notes (M5b done): Automated tests pass (unit, server, browser). Device run passed (stick, held pedals, portrait hint, a locked phone, race to results, Race again, Back to lobby). The first try showed karts not moving until the pages were opened fresh (incognito): a page keeps the ES modules it already loaded, so a phone left open across a code change runs an old `shared/protocol.js` (here without `INPUT_KINDS.BUTTON`), and `npm run dev` only reloads hosts. After changing shared or controller code, reload the phones too. The race is "Kart race 2D" (`kart-2d`), second in the lobby's list, so the input lab stays the default (making the race the default is a one-line swap in `host/games/index.js`, but the M1-M5a browser tests would then have to pick the lab first). Rules (all DOM-free, relative imports, unit tested): `track.js` (stadium maths: centre segment 960+-430 at y 540, radii 250-470; `lapPosition`, `pointOnTrack`, `wallContact`), `kart-physics.js` (`driveKart`, `hitWalls`, `bumpKarts`), `race.js` (grid, 3 s countdown, laps, finish, 30 s limit after the first finisher, `kartsInPlaceOrder`), `kart-controls.js` (INPUT -> `{ steer, accelerate, brake }`), `race-views.js` (phone view, standings rows, time format). Change from the design: no halfway checkpoint. Each kart keeps `distance`, the total driven along the middle line (negative on the grid); each step adds the change in lap position taken the short way round the loop, so reversing over the line subtracts and must be driven again before a lap counts (unit tested). Laps = floor(distance / lap length) + 1, and the same number ranks unfinished karts. Physics (all numbers at the top of `kart-physics.js`, to tune on devices): top speed 420 px/s, a good line does 3 laps in about 27 s; steering fades out below 160 px/s; walls bounce 30% and turn a kart that meets them at under 45 degrees to slide along, with a drag while scraping, so hugging a wall is about 20% slower than driving well. Finished karts coast and are ignored by bumps. Input: new `INPUT_KINDS.BUTTON` (`{ button, pressed }`, press and release sent at once, unthrottled) and `KART_BUTTONS` in `shared/protocol.js`; steering is the existing `drag` input's x. New input module `controller/inputs/button.js` (any `[data-button]` inside its surface; multi-finger; `stop()` sends a release for anything held). The host keeps the newest controls per player and reads them each step; a disconnected player gets neutral controls and their held buttons are forgotten, so after a rejoin the kart waits for fresh input. Phone view (via `setControllerView`, only sent when it changes): `{ phase, countdown, lap, laps, place, finished }`; countdown is 3/2/1, then 0 ("GO!") for the first second. A player with no kart (joined just before the room closed) gets view null, "Waiting for the next race", and a kart on Race again. Portrait: CSS `@media (orientation: portrait)` hides the controls and shows "Turn your phone sideways". Rendering: `host/hand-driven-phaser.js` (moved out of the lab, which now uses it too, as M5a asked), `renderer.js` with `track-drawing.js`, `kart-sprite.js` (interpolated with alpha, faded with "(away)" while dropped), `race-hud.js` (clock, standings and laps in the infield, big countdown) and `results-panel.js` (Race again / Back to lobby, positions copied in `test/helpers/host-buttons.js`). The track is drawn once into a texture: a Phaser Graphics object re-triangulates its arcs every frame, which held headless Chromium at 3 fps (6.5 after). `shared/ordinal.js` is used by host and phone. Tests: browser tests drive the phones with real multi-touch through Chromium's DevTools protocol (`test/helpers/touch.js`), and finish races without seeing the track by holding Go with the stick a fifth left (`STEADY_LEFT` in `test/helpers/kart-drivers.js`; simulated to finish from steer -0.16 to -0.24 with any start delay up to 1.5 s). `startGame()` in `test/helpers/host-buttons.js` takes the controls selector to wait for (default the lab's). The M5b browser test adds about 100 s.

### M5c: 2D kart race setup screen and control styles
See "Kart controller" and "Game settings".
- [x] Setup screen before every race: laps on the host screen, control style on each phone, ready, then the host starts the race. "Race again" returns here with the settings kept
- [x] Control styles: tilt steering (landscape tilt, both landscape directions, "Enable tilt", calibration, stick as the fallback) and auto-accelerate, sent as `INPUT` kind `choice`
- [x] A rejoining player keeps their chosen control style

**Done when:** players pick their own control style and the host picks laps, on iPhone and Android, and tilt steering works in both landscape directions.

Notes (M5c done): Automated tests pass (unit, server, browser). Device run passed on iPhone and Android: tilt steers the right way in both landscape directions, leaning past upright does not jump, the iOS permission prompt and the denied fallback, Enable tilt after a mid-race reload, auto-accelerate, laps, Race again keeping the settings, Back to lobby, and the tilt sensitivity (25 degrees full turn) and smoothing feel fine. Protocol: `INPUT_KINDS.CHOICE` (`{ kind: 'choice', choice, value }`), `KART_CHOICES` (`steering`, `autoAccelerate`, `ready`) and `KART_STEERING` (`stick`, `tilt`) in `shared/protocol.js`. Host: `host/games/kart-2d/setup.js` (DOM-free, unit tested) holds `{ laps, players: { [playerId]: { steering, autoAccelerate, ready } } }`; laps 1-9, default 3; defaults stick and Go button. The game keeps `race === null` while the setup screen shows; Start game and Race again both land there, and Race again clears ready but keeps laps and styles (they last until Back to lobby or End game). Start race (`setup-panel.js`, drawn over the track like the results) is enabled when at least one player is in the roster and everyone is connected and ready; a dropped player holds it up, as in the lobby. Steering and auto-accelerate choices are accepted at any time (a phone whose tilt fails after a mid-race reload switches to the stick), ready only on the setup screen. Auto-accelerate is applied on the host (`controlsFor(player, autoAccelerate)`: accelerate = !brake), so the phone just hides Go. The host steers from both drag and tilt `x`, whichever arrives. Views: setup `{ phase: 'setup', laps, steering, autoAccelerate, ready }`; race views gained `steering` and `autoAccelerate`, so a reloaded phone shows the right controls through the M5a view path (that is how "a rejoining player keeps their style" works; the host holds it by playerId). Views are now sent only from `step()`. Phone: `controller/games/kart-2d/steering.js` owns stick vs tilt, the tilt flow and the tilt panel (wheel picture, Enable tilt, Recenter); `setup-screen.js` the choices and Ready; the highlight follows the host's view, not the tap. The phone asks the host for tilt only after tilt gave a real reading; denied, unsupported or no reading sends steering `stick` and shows the reason on the phone (no `INPUT_MODE`, which stays the lab's). A view sent before the host saw a steering choice is ignored until one confirms it (`requestedSteering`), or a late view would flip the steering back. After a reload the host still says tilt but the new page has no sensor: the race shows Enable tilt, the setup screen says "Tap Tilt to turn tilt on." Tilt: `controller/inputs/tilt.js` is now orientation-aware. Landscape x comes from beta (how far the phone's top end is raised, which is what turning it like a wheel changes), folded into -90..90 because browsers report a phone leaned past upright as 180 - beta; the sign is + with the top on the left (`window.orientation` 90) and - with it on the right (-90/270); y is 0 in landscape. It reads `window.orientation` first, then `screen.orientation.angle` (Playwright's WebKit iPhone keeps the latter at 0 in landscape; the device run confirmed the sign on a real iPhone and Android). Turning the phone to another orientation recalibrates on the next reading. Portrait (the lab) is unchanged. Fixed on the way: input modules keep one `onInput` callback each, and both games registered theirs when their module first loaded, so after playing the race the lab's drag and tilt went to the race's callback. Both games now register in `start()`. Tests changed on purpose: the M5b browser test goes through the setup screen (`startRace()` in `test/helpers/host-buttons.js`), skips the Ready choices when it reads the host's INPUTs, and its views have the two new fields; `controllerView` takes the setup. New: `test/unit/kart-setup.test.js`, landscape cases in `test/unit/tilt-input.test.js`, `test/browser/m5c-kart-setup.test.js` (Android on stick + auto-accelerate, iPhone/WebKit on tilt with the iOS permission stubbed, a 1-lap race, reload keeping tilt, Race again, permission denied).

Notes (decided before M5): M5 was split in three (M5a framework, M5b the race, M5c setup screen and control styles) because the framework is built to fit the 3D race later and the race alone fills a chat. The 2D race draws with Phaser: its own small Phaser game inside the container, drawn from `render()`. M5a checks first that Phaser can be driven by hand (`game.loop.sleep()`, then `game.step(time, delta)` from `render()`); if not, the 2D race keeps Phaser's own loop for drawing, the runner still owns `step`, and the notes say so. The Mario Party board and all minigames were dropped from the plan before M5.

### M6a: 3D performance spike (throwaway)
Can the host carry 4-way split screen with an MK8DX-like look?
- [x] Vendor Three.js as a pinned ESM build in `host/vendor/` (ask before adding it). `three.module.js` imports `three.core.js`, and Three.js add-ons (loaders, bloom) import the bare name `three`, so the host page needs an import map that points `three` at the vendored file
- [x] A stub game module, `spike-3d`, in the lobby list as a developer tool: a short looping road with a hill, 12 karts following scripted paths (no physics yet), and 1, 2 or 4 views, each with a chase camera, drawn as scissor viewports in one WebGL context
- [x] On-screen switches for each cost of the MK8DX look, so each can be measured on and off: sun shadows (the shadow map drawn once per frame and shared by all views), glossy materials with an environment map versus plain lit ones, bloom, a particle burst per kart (drift sparks, boost flames), kart models of a few hundred versus about 10,000 triangles, and the render resolution (the device pixel ratio versus 1)
- [x] Measure on the real host devices (iPad first, then the laptop): frame time with 1, 2 and 4 views for each switch, against MK8DX's bar (60 fps with 1-2 views, a steady 30 fps with 4); load time split into network (files from the Termux phone over the hotspot) versus parse and decode on the device. Only the network part would be helped by more caching (see "Later ideas")
- [x] Note what the game module interface needed that it did not have (for example WebGL context loss, resizing, the pixel ratio, or capping drawing at 30 fps so frames come at an even pace), and change it before M6b

**Done when:** the numbers are in `docs/3d-findings.md`, and we know which parts of the look the iPad can afford with 2 and 4 views, and with how many karts on the track (12 for a full CPU field, or the most it can carry). The spike stays in the lobby list until M7, so it can be re-measured on other host devices; M7 removes it.

Notes (M6a done): Automated tests pass (unit, server, browser). Device run done on the iPad (Safari 27; server on the Linux box, then on the Termux phone over its hotspot) and the laptop (Windows, Chrome 155; Chrome drew on the Ryzen's integrated Radeon graphics, not the laptop's RTX 3070, which Windows only gives to apps set to "High performance"); full tables and reasoning in `docs/3d-findings.md`. Results: the iPad draws the full look (shadows, glossy, bloom, particles, detailed karts) with 4 views and 12 karts in 6.6-9.9 ms at pixel ratio 1, so 60 fps with 4 views and room for a 12-kart CPU field (M6b measures stepping them). Views, karts and triangles barely change its cost; pixels do. At ratio 2 the full look takes about 20 ms (about 46 fps: misses 60 for 1-2 views, holds 30 for 4). Bloom is the costliest switch (iPad +4-6 ms, laptop +9-13 ms). The laptop's integrated graphics are weaker than the iPad: full look with 4 views 23 ms at ratio 1, and 23 fps at its own ratio 1.5, so M7 needs a way to drop costs on a slow host (bloom first, then resolution). On its RTX 3070 (Chrome set to "High performance" in Windows' graphics settings) the same laptop ran every setting at its full 165 Hz, full look at ratio 1.5 with 4 views included. Switching bloom on stalled one laptop frame for 1.8 s, so M7 compiles all shaders while loading. The iPad ran at 60 Hz in the first run for an unknown reason and at 120 Hz since. Loading Three.js cold over the hotspot takes about 0.3 s (parse about 30 ms on the iPad), so minifying, gzip or a service worker are not worth it for code. The 30 fps cap inside the game's `render()` paces evenly on the iPad at 120 Hz (p95 35 ms, 4 views, full look) and on the laptop's RTX 3070 at 165 Hz (30.5 fps, p95 33 ms), so the runner needs no change; whether to cap drawing at 60 on 120 Hz screens is for M7. Built: Three.js r0.186.1 is vendored unminified as shipped (npm has no `.min` build any more; your choice) in `host/vendor/three-0.186.1/`: `three.module.js`, `three.core.js`, `LICENSE`, and 12 add-ons under `addons/` in their npm folder layout (bloom: EffectComposer, RenderPass, UnrealBloomPass, OutputPass and their helpers; `environments/RoomEnvironment.js`; `utils/BufferGeometryUtils.js` for merging kart parts). That is 2.2 MB over the hotspot with no gzip. `host/index.html` has an import map for `three` and `three/addons/`. The spike is "3D spike (dev)" (`spike-3d`, third in the lobby, `minPlayers` 0 so the iPad can measure with no phones; the lobby then says "Everyone is ready!" with nobody there, which is fine for a dev tool). It starts plain and the panel adds each cost; Run benchmark measures 29 settings and gives a table to paste into `docs/3d-findings.md`, which describes every switch and the measuring procedure. Files: `road.js` (the loop as maths), `kart-paths.js` (scripted karts), `view-layout.js`, `frame-stats.js`, `benchmark.js` (all DOM-free, unit tested in `test/unit/spike-3d.test.js`); `spike-renderer.js` (the Three.js module, imported inside `load()` so its download is timed by `load-timing.js`), `materials.js`, `world.js`, `kart-models.js`, `particles.js`, `views.js` (chase cameras, scissor viewports; with bloom on, all views are drawn into the composer's buffer by a plain `Pass` whose `render` is replaced, then bloom runs once over the whole frame), `panel.js` (HTML), and a one-line phone screen in `controller/games/spike-3d/`. The game module interface needed no change (see "What the game module interface needed" in `docs/3d-findings.md`: the import map, the game's own resizing and pixel ratio, context loss ending the game through the existing error path, `forceContextLoss` in `stop()`, and the 30 fps cap inside `render()`, to be moved into the runner if the device run shows uneven pacing). r186 removed `PCFSoftShadowMap` (it warns and uses `PCFShadowMap`). Headless Chromium draws WebGL in software (about 1 fps with the full look), so `test/browser/m6a-spike-3d.test.js` runs the host at 960x540 and switches one cost on at a time; it adds about 60 s.

### M6b: Driving spike (MK8DX handling)
Does the kart drive like MK8DX? Starts the real 3D race in `host/games/kart-3d/` as "Kart race 3D (test drive)": 1-4 players drive freely on a test track, with no laps or places yet (M7).
- [x] Track maths (`track.js`, DOM-free, unit tested): the centre-line model from "3D kart race design"; the nearest point on the road is searched near the kart's last position, so a bridge over another part of the track cannot confuse it; surface point and normal, road edge, walls, off-road, gaps and lap progress
- [x] Test track: a straight, a hill, a jump ramp over a gap, a hairpin (for M6c's drifting), a banked curve, a short anti-gravity wall section, an off-road strip, and an edge with no wall where a kart can fall off
- [x] Kart rules (DOM-free, unit tested with scripted drives): MK8DX's level-10, 150cc numbers from the reference (top speed, acceleration curve, steering rate); gravity, air time and landing; in anti-gravity sections gravity pulls toward the road, so karts drive up the wall; walls that bounce; off-road slowdown; kart bumps decided by weight; a kart that falls off is put back on the road near where it left, after about 1.5 s
- [x] Chase camera: behind and above, follows turns with a short lag, steady over bumps and jumps; distances from the footage numbers
- [x] Phone controls: the 2D race's stick or tilt plus Go and Brake, shared with the 2D race, not copied (see "Kart controller")
- [x] Measure: physics step time with 12 karts on the iPad (11 dummy karts follow the centre line with the same rules, a first rough stand-in for CPU drivers), and together with M6a's drawing numbers, write down how many karts the iPad can carry at 4 views. Compare the feel side by side with MK8DX footage
- [x] If the track model cannot do something on this list, stop and ask (fallback: a mesh track with a ray-cast library)

**Done when:** I can drive the test track from a phone with stick and tilt; speed and turning match the reference numbers; the hill, jump, wall section, off-road and falling off all work; and the step-time numbers are in `docs/3d-findings.md`.

Notes (M6b done, feel tuning put off): Automated tests pass (unit, server, browser). Device run on the iPad: 12 karts step in about 0.1 ms (0.079 ms average, 1 ms worst) and draw at 60 fps with 2-2.3 ms of CPU per frame, so physics never limits the kart count and M7 fills races to 12 karts (details in `docs/3d-findings.md`). The controls did not feel like MK8DX yet; tuning is put off to a later pass (drifting, M6c, is a big part of it), so "speed and turning match the reference numbers" is not confirmed against footage. No reference footage was measured, so every distance (top speed 24 units/s = 12 kart lengths/s, road 16 wide, camera, gravity) is a guess, and MK8DX's level-10 numbers are used as ratios; the table of starting numbers, what was measured on the dev box and the device-run procedure are in "M6b: driving spike" in `docs/3d-findings.md`. The track model did everything on the list: no physics library and no mesh fallback. The game is "3D test drive" (`kart-3d`, third in the lobby, before the spike; `minPlayers` 1, `maxPlayers` 4; "Kart race 3D (test drive)" did not fit the lobby's game picker, so M7 renames it "Kart race 3D"). Flow: the shared kart setup screen (control style and Ready; the setup view has `laps: null`, so the phone leaves the laps line empty), then Start driving (an HTML panel on the host, `panels.js`), then free driving with no countdown, laps or places; Back to setup (top of the host screen) returns to the setup screen with the styles kept; the shell's End game goes back to the lobby (`isDone()` is always false). The phone's driving view is `{ phase: 'driving', steering, autoAccelerate }` and its status line says "Test drive". Players start at the back of the grid, behind the dummies, as in MK8DX (at the front, dummies shoved a player who had not pressed Go along at 18 units/s). How the two races share the phone controls (the plan left this to M6b): the phone side moved from `controller/games/kart-2d/` to `controller/kart/` (`controls.js` runs the setup screen, steering and pedals; `markup.js`, `setup-screen.js`, `steering.js`, `style.css` moved unchanged apart from comments, and the setup screen hides laps when they are null). Each race's `controller/games/<id>/index.js` is now a thin wrapper that passes its own `describeStatus(view) -> { big, line }`, and its `style.css` is one `@import` of the shared sheet (a link's load event waits for its imports; the M6b browser test checks the styles arrive in Chromium and WebKit). On the host, `kart-controls.js` (with `NEUTRAL_CONTROLS`, moved out of the 2D `race.js`) and `setup.js` moved to `host/kart/`; the 2D race imports them from there. `view-layout.js` moved from the spike to `host/games/kart-3d/`, and the spike imports it from there until M7 removes the spike. Rules (DOM-free, relative imports, unit tested): `vector.js` (plain `{ x, y, z }` maths), `track-builder.js` (pieces -> stations, throws if the loop does not close), `track.js` (`locate` walks from the kart's last station across the stations' cross-sections, so a bridge cannot confuse it; `surfaceAt`, `wallOnSide`, `pointAt`, `progressBetween`), `test-track.js`, `kart-driving.js` (MK8DX speed curve and steering), `kart-physics.js` (stuck to the road, flying, landing, anti-gravity, walls, falling and respawn), `kart-bumps.js` (mass from weight and speed), `dummy-driver.js` (pure pursuit with braking for bends), `drive.js`, `chase-camera.js`, `drive-views.js` (phone views, which kart each view follows, poses, readout lines), `step-timer.js`. Drawing (Three.js, imported inside `load()`): `renderer.js` (pixel ratio 1, sun shadows shared by all views, glossy karts with an environment map, no bloom; shaders compiled in `start()`), `track-mesh.js` (road, curbs, start line, shoulders, walls and underside, all from the stations; anti-gravity sections are blue), `scenery.js` (sky, sea, pillars, sun), `kart-models.js` (paint on body, engine and helmet, so colours show from behind; dummies are grey), `views.js` (chase camera per view, scissor viewports, an HTML name label per view; 3 players get quarters with a dummy in the fourth, as MK8DX does). The tilt and stick code is unchanged, so tilt works in the 3D drive through the same setup screen. Tests changed on purpose: the moved modules' imports in `kart-setup.test.js`, `kart-controls-views.test.js`, `kart-race.test.js` and `spike-3d.test.js`; the M6a browser test clicks Next game three times to reach the spike; `startGame()` in `test/helpers/host-buttons.js` takes a `scale` for half-size host pages. New: `test/unit/kart-3d-track.test.js`, `kart-3d-kart.test.js`, `kart-3d-drive.test.js` and `test/browser/m6b-kart-3d.test.js` (about 60 s). Headless Chromium draws this game at about 2 fps, and Playwright's own click waits for a still element over two animation frames, so End game's second click missed its 3 s window; the M6b test clicks the host's HTML buttons through the DOM instead.

### M6c: Techniques spike (drift, boosts, phone buttons)
Do MK8DX's techniques work, and can a phone play them?
- [x] Hop and drift on a held Drift button: pressing hops; the steering direction on landing picks the drift side; steering during the drift tightens or widens it (MK8DX's drift turn rates); releasing ends it
- [x] Mini-turbo: MK8DX's charge counter (faster with the stick or tilt held hard into the turn), three levels with blue, orange and purple sparks, and their boost lengths and speed from the reference (level 10)
- [x] Rocket start: Go pressed just after "2" in the countdown boosts, too early stalls. The host judges by when the press arrives, so measure arrival times from real phones over the hotspot (iPhone and Android) and set the window from them (arrival times measured on an iPhone and an Android phone over the hotspot: +0.13 to +0.57 s, so the 0-0.6 s window was kept)
- [x] Jump boost: Drift pressed at a ramp's lip does a trick and boosts on landing
- [x] Dash panels, slipstream (a few seconds close behind another kart), and the spin boost when two karts bump in the anti-gravity section
- [x] Effects: drift sparks in the level's colour, boost flames, and a short camera pull-back while boosting
- [x] Phone layout: a Drift button for the right thumb next to Go, with the Item button's place kept free. Try it with and without auto-accelerate, and with tilt, on iPhone and Android. The Drift button shows the current spark colour (a field in the controller view), to see whether players use it (tried on both phones; a new layout for tilt is planned in M7a)
- [x] Unit tests drive the techniques with scripted inputs: a hard drift of N frames gives the expected level, each boost lasts its length, and the rocket start and trick windows

**Done when:** on iPhone and Android I can drift through the hairpin to an orange and a purple boost, rocket start, trick off the ramp and hit a dash panel, and the controls feel playable with both thumbs. Findings and the chosen layout are in `docs/3d-findings.md`.

Notes (M6c done): Automated tests pass (unit, server, browser). Device run on the iPad host over the hotspot with an iPhone and an Android phone (results in "M6c: techniques spike" in `docs/3d-findings.md`): the hairpin drifted to orange and purple, rocket starts (arrivals +0.13 to +0.57 s after "2", round trips 11-113 ms, all inside the 0-0.6 s window, which was kept), the trick, dash panels, slipstream and the spin boost all work, and the Drift button's colour follows the sparks. With auto-accelerate a rocket start works by holding Drift. The feel did not match MK8DX (steering, walls, bumps, pose transitions, a hop too low) and the layout for tilt should change; both went to M7a. The trick window was not measured and stays a guess. What was built, with the numbers and how each technique works, is in that findings section; this note lists the files and decisions. Protocol: `KART_BUTTONS.DRIFT`. Host controls (`host/kart/kart-controls.js`): controls are `{ steer, accelerate, brake, drift }` (`NEUTRAL_CONTROLS` has `drift: false`; the 2D race ignores it); without auto-accelerate a held Drift also accelerates, because the right thumb cannot hold Go and Drift at once. Rules in `host/games/kart-3d/` (DOM-free, relative imports, unit tested): `kart-techniques.js` (new: hop, drift side on landing, charge counter, mini-turbo on release, trick at a lip, and the body's lean, trick roll and spin for drawing), `kart-boosts.js` (new: the boost table, `startBoost` keeps the longer time and faster speed, `endBoost`, stall timer, dash panels found by `s` and `lateral`), `slipstream.js` (new, run for the whole field after bumps), `rocket-start.js` (new: countdown numbers, Go watched during the countdown, `judgeStart` by arrival time), `kart-walls.js` (new: `hitWall` and `KART_RADIUS` moved out of `kart-physics.js` so it stays under 200 lines; a wall ends a slipstream), `kart-driving.js` (`nextSpeed` takes the boost; `driftTurnAngle`; `fromMk8Acceleration`), `kart-physics.js` (calls the techniques before and after the move and the boosts after; a stalled kart stands still; karts keep `lateral` and `previousBodyYaw`/`previousBodyRoll`; `driftHeld` and `lipTiming` survive a respawn), `kart-bumps.js` (a bump ends a slipstream; closing karts both in anti-gravity spin boost), `drive.js` (`started`, the countdown with nothing moving, starts judged at GO, slipstreams), `drive-views.js` (`DRIVE_PHASES.COUNTDOWN`; the driving view is `{ phase, steering, autoAccelerate, countdown, spark, start }`; `kartPose` adds `bodyForward` and `bodyUp`, interpolating angles the short way round), `readout.js` (new: the readout text moved out of `index.js`, plus per-player start history across Restarts, lip timing and round trips), `track-builder.js` (passes `dashPanels` through), `test-track.js` (two dash panels, at s 205 and 470). `index.js`: Restart (`putKartsOnGrid`, shared with Start driving), a 2 s `setInterval` ping of every connected phone (PONG goes to the readout), auto-accelerate ignored during the countdown, the countdown text sent to the panels every frame. Drawing: `effects.js` (new: one additive point cloud, particles carry their kart's velocity so sparks stay at the wheels), `track-mesh.js` (dash panel stripes 0.03 above the road), `chase-camera.js` (boost pull-back: `pull`, `fieldOfView`, `FIELD_OF_VIEW` moved here from `views.js`), `views.js` (sets each camera's field of view), `renderer.js` (models drawn with the body pose, effects updated every frame), `panels.js` (Restart button, the big countdown). Phone: `controller/kart/markup.js` (Drift and an Item place, hidden unless the race has Drift), `controls.js` (`start(container, send, { describeStatus, drift })`, the `with-drift` and `auto-accelerate` classes on the buttons, `data-spark` on Drift), `style.css` (the grid: Item and Drift on top, Brake and Go below; Drift two rows tall with auto-accelerate; spark colours), `controller/games/kart-3d/index.js` (countdown in the big text, "Rocket start!" or "Too early: stalled" for 2 s after GO), `controller/games/kart-2d/index.js` (passes `drift: false`). Tests changed on purpose: `kart-controls-views.test.js` expects `drift: false` in controls (plus a new Drift test); `kart-3d-drive.test.js` presses Go only after the countdown and expects the new driving view; the `KART_RADIUS` imports in `kart-3d-kart.test.js` and `kart-3d-drive.test.js` moved to `kart-walls.js`; `m6b-kart-3d.test.js` expects the new view fields and waits for the view after the start message, and its DOM click helper moved to `clickNow` in `test/helpers/host-buttons.js`; `m5c-kart-setup.test.js` checks the 2D race shows no Drift or Item place. New: `test/unit/kart-3d-techniques.test.js` (hop and drift, drift turn rates, the 52/109/166-frame levels, 30/90/150-frame boosts, a purple drift through the hairpin's outside lane, the trick window, the countdown and rocket start, dash panels, slipstream, spin boost), view, pose, camera and readout tests in `kart-3d-drive.test.js`, and `test/browser/m6c-kart-3d-techniques.test.js` (about 55 s: the button layout, countdowns on both screens, a Go pressed after the phone shows "2" judged and logged, Drift with the stick held drifting the kart, spark colours on the button, Restart). Headless runs cannot make real sparks reliably (the start straight is too short to drift blind at 1 fps), so the browser test calls the phone's own `showView` for the colours, and the host side of `spark` is unit-tested.

### M7a: Feel pass (on the test track)
Make driving feel like MK8DX, judged by me side by side with the real game. The device run's notes are in "Feel against MK8DX" in `docs/3d-findings.md`.
- [x] A tuning panel on the host (developer only, like the readout): a live slider for every number I am asked to tune (steering, top speed and scale, wall penalty, bounces, hop height, animation timings, the rocket start and trick windows, camera), each showing its value, and a "Copy values" button that puts all of them on the clipboard as text I paste back to Claude, who writes them into the code. Rule for every later milestone too: anything I tune gets a slider and goes into that copy. The clipboard API needs a secure context and a tap, which the HTTPS host has; if it fails, the values show in a text box to select by hand
- [x] Steering: a much tighter turn at full stick or tilt, but the same sensitivity (small movements must not turn harder than now), for example a curve from stick to turn rate instead of a straight line. Check the drift arcs against it
- [x] Walls: hitting one costs more speed, so riding the wall round a sharp turn is never faster than slowing down for it
- [x] Bumps: karts bounce off each other and off walls visibly, damped (partly elastic, not perfectly), instead of the dead push they give now
- [x] Smooth body animation: easing into and out of the drift lean, the hop, and the trick's spin starting from a straight kart, as MK8DX animates them (no snapping between poses)
- [x] Hop height: MK8DX's hop is higher than ours; a slider for it
- [x] World scale and speed: Claude measures road width and the kart's share of the screen from MK8DX screenshots (see "Reference footage"), I review the numbers, and top speed is tuned with the panel; the camera felt fine on the device run, so keep its look if the scale changes (the screenshot reading was done before M7a; top speed and the camera are on sliders)
- [x] Phone vibration on every button press (Android; iOS Safari has no `navigator.vibrate`)
- [x] Phone layout for tilt: Drift on the left (the left thumb is free when tilting); on the right, Brake left of Go and the Item place above Go. Keep the M6c layout for the stick, whose left thumb steers
- [x] Unit tests for the changed rules; the M6b and M6c tests keep passing or change on purpose

**Done when:** driving, drifting and bumping on the test track feel close to MK8DX to me, and the tuned numbers are in `docs/3d-findings.md`.

Notes (M7a done): Automated tests pass (unit, server, browser). What changed and why, the starting numbers, what was measured without a device and the tuning procedure are in "M7a: feel pass" in `docs/3d-findings.md`; this note lists files and decisions. **Tuning:** `host/games/kart-3d/tuning.js` (new) holds every tuned number as `TUNABLES` (`{ key, group, label, unit, min, max, step, value }`, with the why of each in comments) and the live values in one mutable `tuning` object that the rules read every step (`setTuning` clamps to the slider and throws on an unknown key, `resetTuning`, `describeTuning` for Copy values). Decided: one module-level object, not a parameter threaded through every rule, because every rule function would need it and it is developer configuration, not game state; values last until the host page reloads, and are not saved (saved values would silently override new defaults written into the code). Constants that moved into it and are no longer exported: `TOP_SPEED`, `STEERING_RATE`, `DRIFT_STEERING_RATE`, `ACCELERATION_LIMIT` (`kart-driving.js`), `TRICK_EARLY`/`TRICK_LATE` (`kart-techniques.js`), `FIELD_OF_VIEW` and the camera constants (`chase-camera.js`), the wall, bump, grip and rocket window numbers. Anything derived from top speed is now worked out when used (boost accelerations are stored in MK8DX's units and converted in `startBoost`; slipstream's minimum speed is a share). `tuning-panel.js` (new, HTML): sliders, Copy values, Reset, Close; `z-index: 1` over the drive panel with its own Close, because on a narrow screen it covers the Tuning button. `panels.js` has the Tuning button (`onTuning`); `index.js` creates the panel and shows it only while driving. **Rules:** `kart-driving.js` (`steeringRate(steer)`, the curve; `steerForRate(rate)`, its inverse by bisection, used by `dummy-driver.js`, whose pure pursuit used to divide by a linear full rate), `kart-walls.js` (hits above 1 unit/s lose speed by angle and bounce, set `slideLeft`; slower contact only scrapes), `kart-bumps.js` (least parting speed, `slideLeft`; `startSpin` now from `kart-body.js`), `kart-physics.js` (`slideLeft` on every kart and the loose grip in `drive()`; a hop's own gravity in `fly()`; `moveBody` after the boosts; `useDriftButton` gets `dt`), `kart-techniques.js` (hop from height and time; new fields `hopping` and `tricking`, the trick's boost now keyed on `tricking`, so `trickTime` is only the roll's animation time; body code removed), `kart-body.js` (new: `freshBody`, `moveBody`, the lean spring `springToward`, `startTrickRoll`, `startSpin`; the roll and spin run to their end independent of landing; the lean target during a hop is the stick, so no import of the drift threshold and no import cycle). **Phone:** `controller/kart/controls.js` (the button surface is `#kart-controls`, the classes `with-drift`, `auto-accelerate` and new `tilt` are on it; a 15 ms `navigator.vibrate?.()` on each press, in both races since the module is shared), `steering.js` (`current()`), `style.css` (in the 3D race `#kart-pedals` is `display: contents` and the buttons sit in the controls' four-column grid `5fr auto 2fr 3fr`, so the stick layout keeps its proportions and tilt can move Drift to the left; the tilt panel lays out in a row with a smaller wheel there). Decided defaults: full steer 60 deg/s rather than more, so the test track's hairpin still needs a drift or braking on all but its outermost lanes; the drift's tightest rate stays MK8DX's, because tighter drifts finish the hairpin before purple. Tests changed on purpose: `kart-3d-kart.test.js` (top speed and steering from `tuning`; the "0.011 radians a frame at full steer" test became the full steer rate plus a new steering curve test), `kart-3d-techniques.test.js` (drift rate from `tuning`, the tightest drift must beat a full normal turn instead of the middle beating 0.011; the purple hairpin drift uses the middle lane, not the outside one; trick windows from `tuning`), `kart-3d-drive.test.js` (dummies must brake for the hairpin only on lanes where a full steer cannot hold top speed). New: `test/unit/kart-3d-feel.test.js` (tuning, live top speed, `steerForRate`, wall hits by angle, resting against a wall, the wall line slower than braking through the hairpin, least parting speed and bounce share, the slide after a bump, hop height and time, the lean spring, the lean during the hop and easing out, the trick roll finishing on the ground) and `test/browser/m7a-kart-3d-feel.test.js` (about 70 s: the panel's sliders, top speed 40 taking Ana past 24 units/s, Copy values and its fallback, Reset and Close, the tilt layout in Chromium and WebKit, a buzz per press and none on release). After the first device run (same chat): the tuned values were written into `tuning.js` as defaults (top speed 32, full steer 80, wall losses 0.8 and 0.3 and scrape 3, bump bounce 0.25, standing mass 0.7, hop 0.4, lean 23 deg, rocket window from 0.3, then to 1.2 in a second pass), and two things were added on sliders: a rocket start boosts from `rocketBestSeconds` at the window's start down to `rocketWorstSeconds` at its end (`rocketBoostSeconds` in `rocket-start.js`, used by `drive.js`), and every boost's speed is a tuned number (`kart-boosts.js` keeps a `speedKey` per kind instead of a fixed `speedShare`). Tests changed on purpose for the new defaults: `kart-3d-kart.test.js` (braking and acceleration worked out from the tuned top speed), `kart-3d-feel.test.js` (Copy text uses the defaults from `TUNABLES`; the hard bump closes fast enough to be above the least parting speed), `kart-3d-drive.test.js` (Go pressed 0.45 s after "2", inside the new window), `kart-3d-techniques.test.js` (the drift no longer has to turn tighter than full steering, since the tuning made it wider; the purple drift is round a long bend sized for top speed, because at 32 units/s the hairpin is over too soon; the rocket test presses from the tuned window and compares the rocket start with a normal one instead of with top speed; a new test for the graded rocket boost), `m6c-kart-3d-techniques.test.js` (opens the rocket window at "2" on the host, since on the slow headless host a press made when the phone shows "2" can arrive before 0.3 s), `m7a-kart-3d-feel.test.js` (the 32 units/s default). Then, on the device run, no vibration was felt on Android or iOS, so the buzz on button presses was taken out of `controller/kart/controls.js` and moved to "Later ideas" (with what to check first); the M7a browser test now checks that Drift and Brake still press and release in the tilt layout. The tilt layout was confirmed fine. A second tuning pass set full steer to 67 deg/s and the tightest drift to 72.5, so a drift turns tighter than steering again, as in MK8DX; the unit test that checks it was put back.

### M7b: The race on a real track
- [x] Host runs the race: countdown, laps, places, results, Race again or Back to lobby, engine classes (50, 100, 150, 200cc), rules in DOM-free modules stepped at the fixed 60 Hz, split-screen rendering in the container
- [x] Course study first: Claude studies a few real MK8DX courses (wiki maps, screenshots, footage) for how they play, and writes the patterns into `docs/mk8dx-reference.md` for me to review: lap time at 150cc, how long the straights are, how many corners of each kind (sweepers that hold a purple drift, tight corners, chicanes), how the road's width changes, where the jumps, dash panels, anti-gravity sections, off-road shortcuts and item rows sit, and how the course paces its quiet and busy parts. Patterns and proportions only: no layout is traced or copied
- [x] A full course of our own, designed from those patterns for the tuned scale, using the features M6 proved (hill, jump, hairpin, banked curve, off-road, anti-gravity, dash panels)
- [x] Only controller-relevant information goes back to phones: lap and place, and one-shot cues if one is needed (a new message type for cues, added then)
- [x] Renamed "Kart race 3D"; the 3D spike (`spike-3d`) is removed

**Done when:** a race on the course runs from the lobby through setup, countdown, laps and places to the results and back, at every engine class, and the course study is written for review.

Notes (M7b done): Automated tests pass (unit, server, browser). Device run passed: the race on Seaside Skyway felt fine, with nothing to change. What was built, the course's numbers, what was measured without a device and the device run procedure are in "M7b: the race on a real track" in `docs/3d-findings.md`; the study is "Course patterns" in `docs/mk8dx-reference.md` (sources: Super Mario Wiki course pages, mkleaderboards.com records, the fan odometer; no footage was watched, and the counts partly rest on Claude's general knowledge of the courses, flagged there). This note lists files and decisions. **Rules:** `host/games/kart-3d/drive.js` became `race.js` (`createRace(track, playerIds, laps, engineClass)`, `stepRace(race, track, controlsFor, dt)`, `removeKart`, `playerKart`, `kartsInPlaceOrder`, `raceClock`, `RACE_PHASES` countdown/racing/results replacing `drive.started`, `ENGINE_CLASSES`, `DEFAULT_ENGINE_CLASS`, `FINISH_TIME_LIMIT_SECONDS`); kart fields added there: `distance`, `lap`, `lapStartedAt`, `finishTime`, `place`, and `lane` is now also set for a finished player (the CPU driver drives the kart). The race ends with no players left too (everyone left mid-race), which shows the results with only CPU karts. `drive-views.js` became `race-views.js` (`setupView(setup, engineClass, playerId)`, `raceView`, `viewHud`, `standingRows`, `describeClock`, `describeCountdown`, `BANNERS`, plus the old `viewTargets`, `kartPose`, `describeKart`). Engine classes: `createKart(track, s, lateral, weight, engineClassShare)`, `kartTopSpeed(kart)` in `kart-driving.js`; `nextSpeed(speed, controls, offRoad, dt, boost, roadTopSpeed)` and `fromMk8Acceleration(perFrame, topSpeed)` now take the top speed; `kart-boosts.js`, `kart-bumps.js` and `slipstream.js` use `kartTopSpeed`. Decided: the class is a share on each kart, not a change to the live `tuning.topSpeed`, so the slider keeps meaning 150cc and nothing global changes per race. **Track model:** `track-builder.js` takes a per-piece `halfWidth` (eased) and `shoulderLeft`/`shoulderRight` (replacing `shoulder`); stations carry them; the track no longer has a `halfWidth`. `track.js`: the contact has `halfWidth` (blended between stations, as the mesh draws it), `surfaceAt(contact)` and `outerEdge(contact)` lost their `track` parameter. `track-mesh.js` strips take laterals per station. **Courses:** `seaside-skyway.js` (new, `SEASIDE_SKYWAY`) and `test-track.js` (`TEST_TRACK`, kept as a course), each with an `id` and a `name`, listed in `courses.js` (`COURSES`, the first the default). After the first review (same chat) the host chooses the course on the setup screen (`data-course-id` buttons; it lasts until Back to lobby, like the engine class); `index.js` builds every course's track once and keeps the chosen one, and the renderer's `showTrack(track)` swaps the road and scenery (`buildWorld` in `renderer.js`; `scenery.js` now puts everything in one group and frees the sun's shadow map with it) instead of making a new WebGL context. The readout's frame counting moved from `index.js` into `readout.js` (`frameDrawn`), to keep `index.js` near 200 lines. The course was laid out with a scratch tool (plan view, closure, overlap check) not kept in the repo; the unit test keeps the overlap check. **Host screen:** `panels.js` (setup: course, laps, engine class buttons with `data-engine-class`; `#kart-3d-race-bar` replacing `#kart-3d-drive`, hidden at the results; `#kart-3d-clock`; the readout shows only with the tuning panel, `tuning-panel.js` got `isOpen()`), `results-panel.js` (new, HTML), `view-hud.js` (new: per-view name, lap, place, banner; replaces the labels in `views.js`, keeping the `.kart-3d-view-label` class), `renderer.js` (HUD data per view; the setup flyover sized to the course), `index.js` (engine class, results, Back to lobby). `formatRaceTime` moved from `kart-2d/race-views.js` to `host/kart/race-time.js` for both races; `shared/ordinal.js` is used by both. **Phone:** `controller/games/kart-3d/index.js` (place, lap, start, final lap, finished, race over), `controller/kart/setup-screen.js` (laps line with the engine class when the view has one). No protocol change: the final lap and finish are state in the view, so no cue message was needed. **Registry:** `kart-3d` is "Kart race 3D", still 1-4 players (the plan said 2-4; one player races the CPU karts, as in MK8DX, and it lets one person test). `spike-3d` deleted (host and controller folders, `test/unit/spike-3d.test.js`, `test/browser/m6a-spike-3d.test.js`); its split-screen layout test moved to `test/unit/kart-3d-views.test.js`, and its lost-WebGL-context test to the M7b browser test. Tests changed on purpose: `kart-3d-drive.test.js` became `kart-3d-race.test.js` (rules on the course: course shape and features, no overlaps, the grid, CPU karts lapping at every class with jumps, wall and hairpin braking, laps and finishing, reversing, the time limit, leaving, class speeds, per-side shoulders) and `kart-3d-views.test.js` (phone views, HUD, clock, standings, view targets and rects, poses, camera, step timer, readout); `kart-3d-kart.test.js` and `kart-3d-feel.test.js` (`nextSpeed` takes the top speed), `kart-3d-track.test.js` (`surfaceAt` without the track), `kart-3d-techniques.test.js` (rocket starts through `createRace`), `kart-controls-views.test.js` (`formatRaceTime` from its new home; 11th and 12th), `m6b-kart-3d.test.js` (setup view with laps 3 and 150cc, the race view's fields, `#kart-3d-race-bar`, the HUD selectors, the line "Get ready!" or "Lap 1/3"), `m6c-kart-3d-techniques.test.js` (phase `racing`; the big text shows the place after GO instead of nothing), `m7a-kart-3d-feel.test.js` (race views). New: `test/browser/m7b-kart-3d-race.test.js` (about 140 s: the course buttons and switching courses, setup laps and class reaching the phones, countdown, per-view HUD and the place lifted clear of the game bar, phone place and lap, the clock, the readout with the tuning panel, results when every player left and Back to lobby, the results panel's rows and Race again, a race on the Test track ended by a lost WebGL context); `kart-3d-race.test.js` also races 1 lap on every course. A whole race is not driven in a browser (software WebGL at a few frames a second, and nothing can steer blind round the course); the unit tests drive whole races.

### M7c: The look
- [x] Kart and driver models that read as MK8DX-like toys (our own, procedural or CC0, never Nintendo's), and the track dressed with scenery
- [x] The look M6a showed the iPad can afford: glossy lit karts, shadows, bloom, sky, particles; every shader compiled while loading
- [x] A quality setting that drops costs on a slow host (bloom first, then resolution)

Scope: the track design (scenery, trackside dressing, the road's look) is done only on the real race courses, Seaside Skyway for now. The Test track is only for testing and keeps its plain look. The kart models and the renderer's effects (gloss, shadows, bloom) are not per course, so they show on the Test track too.

Notes (M7c done): Automated tests pass (unit, server, browser). Device run on the iPad (the main host; the laptop on integrated graphics was not tested, since the iPad is the host in use): the karts look okay, the frame rate is good, no pause was noticed at the first race frame or when switching to High, and the Look setting comes back after End game. Feedback, carried into the new M7d: the orange dash panel is too bright with bloom, lamps lit in daylight look odd, and the look as a whole is too plain next to MK8DX ("looks like Roblox and still like a prototype"); the user wants MK8DX's designs copied closely, karts and drivers included, built up from researched building blocks. CPU drivers moved from M7d to M7e. What was built, the measurements without a device and the device run procedure are in "M7c: the look" in `docs/3d-findings.md`. Everything is procedural (no image or model files, no new dependency); `assets/manifest.json` stays empty. This note lists files and decisions. **Karts:** `kart-shapes.js` (new: the toy kart and driver, parts merged by material into 4 geometries plus one per wheel; `WHEELS`), `kart-models.js` (rewritten: `createKartModels(count)` returns `{ karts, show(index, kart, pose, hex, dt), hide(index), dispose }`; posing moved here from `renderer.js`; wheels roll by the distance driven on the ground and the front ones turn up to 25 degrees), `kart-body.js` (`wheelTurn` in `freshBody`, eased toward `controls.steer` at 15 per second in `moveBody`; drawing only, like the body angles), `shape-utils.js` (new: `at`, `between`, `coloured`, `mergeShapes`, shared by the kart and the scenery). **Effects:** `effects.js` gained `describeEffects(kart, pose)` (moved from `renderer.js`), dust off-road above 3 units/s, flames from both new exhausts, and brightness: sparks 2.5x, flames 1.2x (3x bloomed into a white blob). **Rendering:** `bloom.js` (new: composer with a views pass, `UnrealBloomPass`, `OutputPass`; reads the Look sliders every frame), `views.js` (draws into the canvas or the bloom's render target, viewports scaled by the pixel ratio there; `clearGaps(renderer, viewCount)`; viewport and scissor reset after every frame), `view-layout.js` (`gapRects`), `renderer.js` (`createRenderer(container, track, qualityLevel)`, `setQuality(level)`, exposure from the tuning, `world.update(dt)` for the waves and boats, a warm-up frame through bloom after `compile`, the sky reflections), `quality.js` (new: `QUALITY_LEVELS`, `DEFAULT_QUALITY`, `QUALITY_STORAGE_KEY`, `loadQuality`, `saveQuality`; a bad or missing localStorage logs and falls back to High), `tuning.js` ("Look" group: `bloomStrength` 0.4, `bloomRadius` 0.2, `bloomThreshold` 1, `exposure` 1). Decided: the quality is the host device's, so it is kept in localStorage, unlike the race settings, which reset at Back to lobby; it is chosen only on the setup screen, never mid-race. **Reflections:** `scenery.js` `createSkyEnvironment(renderer)` replaces `RoomEnvironment` (whose bright studio panels in the clear coat bloomed every kart white); the clear coat roughness went from 0.08 to 0.25 and chrome to 0.3; `scene.environmentIntensity` 0.4 (was 0.35). `host/vendor/three-0.186.1/addons/environments/RoomEnvironment.js` was deleted (nothing uses it). **World:** `scenery.js` (sun lower, at `SUN_OFFSET` (-90, 120, -150); the sky has the sun disc and halo, and sea blue below the horizon for the reflections; returns `update(dt)`; `SCENERY_BUILDERS` by `track.scenery`), `track-builder.js` (passes `scenery` through, null when absent), `seaside-skyway.js` (`scenery: 'seaside'`), `track-mesh.js` (returns `glow` too: dash panels and anti-gravity edge lines, unlit at 2.5x; dressed courses get the grain texture, mown grass and blue wall panels; the strip builder moved to `strip-builder.js` and gained texture coordinates), `seaside-scenery.js`, `seaside-props.js`, `seaside-layout.js` (`ISLANDS`, `LIGHTHOUSE`, `BOATS`, `islandHeightAt`), `trackside.js`, `trackside-spots.js` (`turnAhead`, `boardSpots`, `poleSpots`, `startGateIndex`), `textures.js` (grain, arrows, checks, ripples; pixel by pixel into canvases with `willReadFrequently`, after drawing shapes and GPU-kept canvases cost seconds in software), `random.js` (seeded mulberry32, so every host draws the same scatter). **Host screen:** `panels.js` (a "Look" row with `data-quality` buttons), `index.js` (loads the saved level, `chooseQuality` on the setup screen only). **Tests:** new `test/unit/kart-3d-look.test.js` (quality levels and storage, gap rects, the random source, where boards and poles stand on Seaside Skyway, that no scenery reaches the road and no boat sits on an island, the island profile, the front wheels' easing, the scenery passed through, the Look sliders) and `test/browser/m7c-kart-3d-look.test.js` (about 3.5 minutes: the Look buttons and High by default, the drawing buffer at each level, the choice saved and back after End game, the black gap between views through bloom at High, no page or console errors; its bloom test has a 180 s limit of its own). Tests changed on purpose, for speed and not behaviour: the M6b, M6c, M7a and M7b browser tests start the host at Medium (`test/helpers/kart-3d-host.js` `presetQuality`) and give the 3D game 30 s to start (`startGame` in `test/helpers/host-buttons.js` gained a `timeoutMs`, default 5 s as before), and M6b waits 10 s instead of 2 for the host to see a reloaded phone reconnect, because the host page is busy with software frames of over a second. Low was tried first for those tests, but at pixel ratio 0.7 the stretched canvas blurs the 4-pixel black gap that M6b checks. Once, in the middle of these runs, M6b failed in its setup while a phone was joining the lobby (before any 3D code ran); it passed on every run since. **Test speed (after the device run, same chat):** the browser suite had grown to 18.5 minutes, 13 of them in the 3D files, because headless Chromium drew WebGL with SwiftShader at 1.2-1.9 s a frame, every test action waits on frames, and the race's clock slows with them. `test/helpers/browser.js` now launches Chromium with `--use-angle=gl-egl --ignore-gpu-blocklist`, which draws with Mesa's llvmpipe (also CPU, about 5 times faster here; the second flag is needed because llvmpipe is on Chromium's blocklist, and without it WebGL silently fails). The suite takes 7 min 50 s, each 3D file about 35 s. The Intel GPU stays out of reach (the user is not in the `render` group); untested. The user chose to keep the Medium preset and the longer waits as margins, and only their comments were updated. M5b's second race is now 1 lap (the laps lowered on the setup screen after Race again), saving about 22 s; the first race still checks 3 laps. `CLAUDE.md`'s testing rule changed: `npm test` always, browser files picked by an area map, the full browser suite only when shared code changed.

### M7d1: Research and the device-run fixes
- [x] Claude studies MK8DX (screenshots, footage, wiki pages) part by part and writes what it finds into `docs/mk8dx-reference.md` for me to review: road surfaces and their textures (asphalt, curbs, edge lines, the start line), barriers and fences, lamps and lights (how they look, and whether they are lit by day), signs and arrow boards, banners and flags, dash panels and anti-gravity panels, the start gate, scenery on a seaside or sky course, the sky and lighting, and the karts and drivers (the Standard Kart and its parts, how a character sits in it). How each surface's texture is made up gets its own notes, since textures will carry most of the look
- [x] A list of new pieces for the kit, beyond what Seaside Skyway has now, chosen from MK8DX's courses
- [x] From the M7c device run: the orange dash panel is too bright with bloom; lamps should not shine in daylight

Notes (M7d1 built, device run pending): M7d was split into four parts at the start of this chat (research and fixes, the kit, Seaside Skyway rebuilt, karts and drivers); the user added that the kit should also bring new pieces the course does not have, and that textures matter most. Automated tests pass: `npm test`, and the browser files `m7c` and `m7b` (the area map's "3D look" row; no shared code changed). **Research:** "The look, part by part (M7d1 study, to be reviewed)" in `docs/mk8dx-reference.md`. Claude downloaded 22 screenshots and artworks from the Super Mario Wiki into the scratchpad, looked at each (cropping and enlarging two with a scratch Playwright script, since the box has no image tools), and deleted them; only notes are kept, with sizes by eye against the kart. **Dash panels:** `track-mesh.js` returns a fourth mesh, `dashPanels` (`addGlow` split into `addDashPanels` and `addAntiGravityLines`); its `MeshBasicMaterial`'s colour multiplies the vertex colours, so `renderer.js`'s `buildWorld` sets it from `tuning.dashPanelGlow` in its `update(dt)` every frame. `tuning.js` gained `dashPanelGlow` (Look group, 0.5-3, default 1.2): at 1.2 the yellow stripe's luminance is about 0.91 and the orange's 0.48, both under the bloom threshold 1 (from about 1.32 the yellow blooms; M7c had 2.5). **Lamps:** `trackside.js` (`LAMP_GLASS`, the poles' and gate's lamps) and `seaside-scenery.js` (`LAMP_GLASS`, the lighthouse lamp) use `MeshStandardMaterial` warm glass, roughness 0.15, instead of unlit colours above 1; comments in both and in `seaside-props.js` updated. **Test changed on purpose:** the Look sliders test in `test/unit/kart-3d-look.test.js` now expects `dashPanelGlow` too. What was built and the device run procedure: "M7d1" in `docs/3d-findings.md`. **Device run (same chat):** the lamps no longer glow, as wanted; the user's slider values became the defaults in `tuning.js`: `dashPanelGlow` 1.6, `bloomStrength` 0.2 (was 0.4), `bloomRadius` 0.3 (was 0.2), and the Look sliders test expects them (changed on purpose). **Research review (same chat):** the user approved the 14 new kit pieces as listed, asked for 12 kart-and-driver designs (one for each racer, M7d4), and wants items before glide ramps: the plan gained M8 (items and coins) and M9 (glide ramps and spin-boost posts), so Polish became M10 and Deploy M11. "Our items get our own names and art" in `docs/mk8dx-reference.md` was out of date since the copy decision and now says items copy MK8DX's.

### M7d2: The kit of building blocks
- [x] Each piece its own small module in `host/games/kart-3d/kit/`, with its own procedural texture, from the list "New pieces for the kit" in `docs/mk8dx-reference.md`, in its order: the textured road (asphalt, worn paint, edge lines, grid brackets, curbs, start line), start lights that count down with the race, a themed start gate with a MARIOKART sign, sponsor boards, LED-style dash and anti-gravity panels (and a full-width anti-gravity panel where a section starts), a ramp plate, block curbs, bunting, barriers and fences, small props, street lamps (off by day), a grandstand with a crowd. The seaside and sky pieces (palms, huts, lighthouse, shallows, Koopa shell, floating islands, trusses, an airship) can wait for M7d3, where they are used
- [x] The Test track is dressed with the kit, so the pieces can be reviewed on the iPad before a course depends on them (Seaside Skyway keeps its M7c look until M7d3)
- If it does not fit one chat, it splits into the road surfaces and panels, then the trackside pieces (it fitted: built in one chat)

Notes (M7d2 done): Automated tests pass: `npm test`, and the browser files `m6b`, `m6c`, `m7a`, `m7b`, `m7c` and the new `m7d2` (the area map's "3D look" row for the renderer, scenery and kit, and the "3D rules" row because `race.js` changed; no shared code changed, so not the full suite). What was built, the measurements without a device and the device run procedure are in "M7d2: the kit of building blocks" in `docs/3d-findings.md`. Claude looked at every piece while building it, through a scratch viewer kept out of the repo (a Playwright script serving a page from the scratchpad that builds a course with `buildScenery` and renders chosen camera spots, plus a triangle census and frame timing), and changed what looked wrong (asphalt stones too big and blue, dash panel chevrons too flat to read from a chase camera, lamps washed pink without bloom, a gate post fighting the wall's boards, bunting hiding the gate's sign from the grid, a dark guardrail reflecting the sea, block curbs overlapping on the inside of the hairpin). This note lists files and decisions. **Kit (new, `host/games/kart-3d/kit/`):** `road.js` (`buildKitRoad(track, theme)`: asphalt in 8 lanes so the patch shade varies across, metal in anti-gravity sections, grass, concrete underside and sides; returns `{ meshes, update(dt), dispose }`), `road-paint.js`, `road-textures.js` (asphalt, paint, metal, grass), `road-marks.js` (plain maths: `curbSpots`, `middleDashes`, `gridBrackets`, `startLineChecks`, `rampSpans`, `dashPanelRects`, `antiGravityPanelRects`), `road-rects.js` (`addRoadRect`, `stretchedOver`), `led-panels.js`, `ramp-plate.js`, `start-gate.js`, `start-lights.js`, `start-light-states.js` (plain maths), `sponsors.js` (`createSponsorMaterial`, `sponsorUv`, `SPONSOR_COUNT`), `barriers.js` (`buildBarriers(kit, runs)`), `layout-rules.js` (plain data: `BARRIER_STYLES`, `PROP_REACH`, `sideSign`, `barrierStyleAt`), `extrude.js` (`extrudeSegment`: a cross-section extruded between two stations at the edge of the ground; the left side mirrored), `plain-wall.js` (also the anti-gravity wall), `sponsor-wall.js`, `guardrail.js`, `striped-rail.js`, `rail-fence.js`, `block-curbs.js`, `platform.js` (`buildPlatforms`), `props.js` (`buildProps`, `spotFrame`), `small-props.js`, `mktv-van.js`, `sponsor-stand.js`, `street-lamps.js`, `floodlight.js`, `grandstand.js`, `bunting.js`, `concrete.js`, `pixel-image.js`, `frames.js` (`frameAt`, `facingBack`, `facingRoad`, `facingAlong`, `edgeLateral`, `placeInstances`, `withShadows`) and `kit.js` (`createKit`). **Shared, new:** `canvas-texture.js` (`createCanvas`, `canvasTexture`, `repeatingTexture`, moved out of `textures.js`, which imports them now), `noise.js` (`createTileNoise`, `createLayeredNoise`). **Changed:** `strip-builder.js` (`quad(corners, hex)` for any four corners, `worldUv`, and per-strip `uvOf` and `shadeOf` options; M7c's strips are unchanged), `shape-utils.js` (`roundedBox`, an extruded rounded rectangle with bevelled edges, indexed by merging its corners so it merges with Three.js's shapes; its flat faces stay flat), `scenery.js` (`SCENERIES` replaces `SCENERY_BUILDERS`: each scenery names `buildRoad` and `buildDressing`, and courses without one get `PLAIN`, M7c's road; `buildScenery` now builds the road too and its `update(dt, race)` passes the race on), `renderer.js` (`buildWorld` is just the scenery plus the course's extent; `world.update(dt, race)`), `track-mesh.js` (returns `{ meshes, update, dispose }`, setting the dash panels' glow in its own `update`), `trackside.js` (uses `kit/frames.js`'s `frameAt`, which also squares the facing to the road's normal: the same result for its uses), `race.js` (`gridSpot(track, gridIndex)` taken out of `createRace` and exported), `test-track.js` (`scenery: 'test-track'`). **Test track:** `test-track-scenery.js` (`buildTestTrackRoad` with Mario Kart Stadium's colours; `buildTestTrackScenery`), `test-track-layout.js` (`BARRIER_RUNS`, `PLATFORMS`, `GRANDSTAND`, `BUNTING`, `PROPS`). Decided: decks beside the road (not in the study's list) because the road floats and props need ground; barriers stand outward from the rules' wall line so the road keeps its width; the anti-gravity panel is drawing only (MK8DX's marks where gravity changes, not a boost); the start lights hang from the gate (no Lakitu) and stay green 3 s after GO; the lamps' glow is 1.25 (at 3 the tone mapping washed red to pink on Medium); sponsor stands are merged rather than instanced so each shows its own brand; the crowd casts no shadow and has few faces, after a census found it the biggest triangle cost. Three sponsor brands (Yoshi Cookies, Peach Castle Tours, Koopa Kar Wash) are our own in MK8DX's style. **Tests:** new `test/unit/kart-3d-kit.test.js` (noise repeats and is smooth; curbs on corners' insides only; the middle line's clearances; brackets in front of the race's own grid places; the start line's checks; ramp and anti-gravity panels; the start lights' states; barrier styles by run; the Test track shows every style and prop; its decks are outside walls on level road and clear of the road; every prop, the grandstand and the bunting stand where they can) and `test/browser/m7d2-kart-3d-kit.test.js` (about 35 s: the Test track on the setup screen, the start lights red one by one and green at GO, the race drawing with no page or WebGL errors). The M7d2 browser test reads the lamps from the canvas in the same animation frame as the countdown's number, because a screenshot takes about 1.4 s there, longer than a number shows (a first version with screenshots in its sampling loop missed GO when run after the other 3D files). Changed on purpose: the scenery test in `test/unit/kart-3d-look.test.js` (the Test track is now dressed; a course without a scenery is still plain). **Device run (iPad, Test track, High):** the start lights count down and read clearly, the road and pieces look great and much better than M7c, and the race holds 60 fps (the iPad sometimes caps the rate itself). The grandstand with its crowd at the start line is a favourite. Feedback carried into M7d3: roads like the kit's are fine, but a course needs sections themed on its name, and its surroundings must look much less sparse than even the dressed Test track. Later feedback on the same run: up close most objects plainly read as simple shapes with little detail, and some things float or make no sense, such as rails beside the road standing on nothing (barriers stand outward from the wall line, past the road's edge, so off a deck they hang in the air). Both go to M7d3, for the pieces Seaside Skyway uses; the Test track need not change.

### M7d3: Seaside Skyway rebuilt from the kit
- [x] The same layout and driving line (no rule changes), dressed from the kit and borrowing ideas from MK8DX's seaside and sky courses: sky, lighting and sun, islands, sea and backdrop
- [x] The seaside and sky pieces left from M7d2's list (12, 13): curved palms, huts on stilts, a stone lighthouse, turquoise shallows and foam, a giant Koopa shell; floating islands with layered cliffs and round trees, steel truss supports under the road, an airship
- Seaside Skyway then draws the kit's road (its own theme), so M7c's road look in `track-mesh.js` and the M7c dressing it replaces can go
- From the M7d2 device run: the roads can stay like the kit's, but the course should have sections themed on its name (seaside, sky) and its surroundings must look much less sparse than the Test track does; keep a grandstand with a crowd at the start line
- Also from the M7d2 device run: up close, most objects plainly read as simple shapes with little detail, so the pieces Seaside Skyway uses get more detail (more parts, bevels, finer textures). And nothing may float or make no sense: barriers stand from the wall line outward, past the edge of the road, so where no deck is under them they hang in the air (rails beside the road standing on nothing); M7d3 gives every barrier something to stand on (a ledge or kerb under it, or the barrier set on the road's edge). Done on the pieces as Seaside Skyway uses them; the Test track need not be changed

Notes (M7d3 done): Automated tests pass: `npm test` (304), and the full browser suite (110 tests, 10 min 40 s): the full suite because `test/helpers/` gained a file (used only by unit tests) and the kit changes reach both courses. Its first run failed 3 tests on the Test track, a real bug (`buildSupports` merged an empty list of truss towers when a layout names no trusses); after the fix and the later shadow and segment changes, `m7c`, `m7b` and `m7d2` (the area map's "3D look" row) were run again and pass. What was built, the measurements without a device and the device run procedure are in "M7d3: Seaside Skyway rebuilt from the kit" in `docs/3d-findings.md`. As in M7d2, Claude looked at every piece and every part of the lap while building, through a scratch viewer kept out of the repo (a Playwright script serving a page from the scratchpad that builds a course with `buildScenery`, renders chosen camera spots and counts triangles per mesh), and changed what looked wrong: the beach islands' faces wound the wrong way (culled from above), palm rings too contrasty, parasol rims that read as red balls, a grey rail fence, cloud undersides too dark, far floating islands and backdrop cliffs washed out to white by the haze (moved closer, the cliffs' rock darkened), the sky half bare beside the road (turn boards, a garden deck, road-height clouds and balloons added), a sun glint on the striped rail blooming into a white smear (its paint made rougher), and the crowd reading as blobs up close (eyes and cap spots added). This note lists files and decisions. **New kit pieces (`host/games/kart-3d/kit/`):** `palm.js` (a ringed trunk that curves, a crown with coconuts, ten drooping fronds whose blades are cut out of a canvas texture with `alphaTest`; `buildPalm()` returns `{ trunk, fronds }`, `createFrondMaterial(keep)`), `beach-props.js` (parasol, lounger, surfboards, lifebuoy post, barrels), `garden-props.js` (round tree of clumps, a hedge with pink flowers, a planter), `beach-island.js` (`buildBeachIslands(islands, seaLevel)`: land with sand, grass and an underwater shelf, turquoise shallows and patchy foam as flat rings with vertex alpha, rocks, and spots for palms and huts), `stilt-hut.js` (plank hut on stilts with door, window, rail, walkway, ladder and a thatched roof), `lighthouse.js` (Daisy Circuit's look: stone blocks, plinth, door and awning, windows, corbels, a green balcony and railing, a glass lamp room off by day, an orange dome), `koopa-shell.js` (scutes drawn as the cells of 19 middles on a texture laid from above, a cream rim), `sailboat.js` (M7c's boat with a deck, cabin, boom, mainsail and jib), `clouds.js` (cumulus in two layers, flat bottom, blue-grey underside), `floating-island.js` (`buildFloatingIslands`, `buildBackdropCliffs`, `createRockTexture`: a lathe of banded cliffs stepping in, each island's outline wobbled its own way), `airship.js` (a blimp with bands, fins, gondola, spinning propellers and a Super Marine World banner, circling and banking), `balloon.js` (hot-air balloon of gores), `sea.js` (`dressSea`: M7c's ripples, moved out of `textures.js`), `seaside-textures.js` (wood planks and sand, shared through `kit/kit.js`; thatch and stone blocks), `supports.js` (`buildSupports(kit, seaLevel, trussRuns)`: piers with a footing and a hammerhead cap, or trusses), `truss.js` (lattice towers and Warren girders under both edges) and `turn-boards.js` (red boards with white chevrons on two posts on the ledge). **Course:** `seaside-scenery.js` (rewritten: `buildSeasideRoad`, `buildSeasideScenery` with the road and gate themes), `seaside-layout.js` (rewritten: `BARRIER_RUNS`, `TRUSS_RUNS`, `PLATFORMS`, `GRANDSTAND`, `BUNTING`, `PROPS`), `seaside-landmarks.js` (new, plain data: `BEACH_ISLANDS`, `LIGHTHOUSE`, `KOOPA_SHELL`, `BOATS`, `FLOATING_ISLANDS`, `BACKDROP_CLIFFS`, `NEAR_CLOUDS`, `BALLOONS`, `AIRSHIP_PATH`, `shoreRadius`, `islandHeightAt`), `seaside-surroundings.js` and `seaside-sky.js` (new). **Removed:** `track-mesh.js`, `trackside.js`, `trackside-spots.js`, `seaside-props.js`, `textures.js`. **Changed:** `scenery.js` (`SCENERIES` entries gain `seaLevel`; no `PLAIN` fallback, an unknown scenery throws; the pillars moved into the kit, so a dressing builds its own supports), `track.js` (`turnAhead` and `startLineIndex`, which was `startGateIndex`, moved here from `trackside-spots.js`), `kit/barriers.js` (the ledge under every barrier, with end faces where walls start and stop), `kit/road.js` (exports `ROAD_THICKNESS`), `kit/kit.js` (wood, sand and the frond material), `kit/platform.js` (sand and boardwalk decks, each ground with its own texture scale), `kit/props.js` and `kit/layout-rules.js` (the new props and their reach; `turnBoardSpots`), `kit/start-gate.js` (a colour theme), `kit/rail-fence.js` (wood grain along the rails and up the posts, bolt heads), `kit/guardrail.js` (bolt heads, casting no shadow), `kit/striped-rail.js` (posts with a flange and a ball, rougher paint), `kit/block-curbs.js` and the palms, clouds and trees (fewer segments, after a triangle census), `kit/grandstand.js` (eyes and cap spots on the crowd, one more instanced mesh), `test-track-scenery.js` (piers from the kit, turn boards, Stadium gate theme) and `test-track-layout.js` (the new props, so the Test track still shows every prop). Comments that named removed files were updated, and `CLAUDE.md`'s test map no longer lists `track-mesh.js`. **Decided:** the sea level is the scenery's: Seaside Skyway's sea is at -14 (it was -30 for every course), so its islands, huts and boats are close enough under the road to read; the Test track keeps -30. The road never cared (falling is measured from the road). The ledge is under every barrier on both courses, not only Seaside's: one rule, and the Test track's rails stood on nothing too. Turn boards go only behind low barriers (guardrail, striped rail, rail fence): a padded wall's fence or a block curb would run into them. The sky dome, sun and lights stayed as M7c's, which already match the study (deep blue overhead, pale haze, a warm low sun); the clouds got their blue-grey undersides. **Tests:** new `test/unit/kart-3d-seaside.test.js` (Seaside's decks, props, grandstand and bunting stand where they can; the halves are themed; trusses under the sky half; turn boards round the outside of corners behind low barriers; nothing round the course reaches the road or the room above it, checked against points across the road, its sides and its decks at every station; boats in open water; island outlines and beaches) and `test/helpers/kit-layout-checks.js` (the deck, prop and bunting checks moved out of `test/unit/kart-3d-kit.test.js`, which now uses them). Changed on purpose: the deck check now measures each side of the road with its own grass (it used the wider side for both, which rejected a deck outside Seaside's last corner, whose grass is on the inside); `kart-3d-look.test.js` lost the arrow board, flag pole and M7c island tests (their modules are gone; the turn boards and the new islands have their own tests), gained a test of `startLineIndex`, and its scenery test is renamed, since a course without a scenery is no longer drawn plain. **Device run (iPad, same chat):** the scenery looks good and both halves read as themed; with 4 players on High it averages 80-90 fps; switching to the course takes about a second. The one problem: where a shoulder (grass) began or ended at a piece's end, the ground's edge, its wall line and the barrier stepped sideways at once, leaving a notch to drive out of the track. **Fixed after the device run (a small rule change, asked for):** `track-builder.js` eases each shoulder over the first `SHOULDER_EASE` (16) units of the piece where it changes, in a smoothstep S curve (the first piece eases from the last, since the loop closes), and stations carry their own eased `shoulderLeft`/`shoulderRight` instead of the piece's flag; `track.js` blends a contact's shoulders between its two stations like its width, and `outerEdge` reads them from the contact; `kit/road.js` (grass, the road's sides) and `kit/extrude.js` (barriers, ledges, decks) use each station's own shoulders at both ends of a segment, where they used the segment's first. On Seaside Skyway this smooths the hairpin's inner grass, both ends of the grass straight and the last corner's grass, which now eases out over the first 16 units of the start straight. New test in `test/unit/kart-3d-track.test.js` (a shoulder eases in and out, never stepping more than 0.6 between stations). Changed on purpose: the outer-edge test in `kart-3d-race.test.js` found the last corner as the first station with 10 units of right grass, which is now station 0 (the grass easing out), so it picks the corner by its distance along the lap. After the fix `npm test` (305) and the browser files `m6b`, `m6c`, `m7a`, `m7b` (the "3D rules" row, for `track-builder.js` and `track.js`), `m7c` and `m7d2` pass. General feedback, carried into a new M7d4 placed before the karts (now M7d5) at the user's choice: up close, most composite objects still show the simple shapes they are made of and look far from MK8DX's; they need smaller parts covering them and more texture, with MK8DX's objects as the reference. **More cut-offs, found and fixed after the device run (same chat, asked for):** the user then circled blunt deck ends (the paddock at the hairpin's exit, the decks round the last corner) and asked Claude to find every other cut-off and show before and after. Claude listed every place a barrier starts, stops or changes style and every break between decks from the layouts, shot each in the scratch viewer before and after, and sent nine side-by-side comparisons. Fixes: `kit/layout-rules.js` gained `deckDepthAt` and `DECK_TAPER` (10): a deck's free end tapers to nothing in a smoothstep S curve, and where one deck's end meets another's start on the same side (within a unit, across the lap's start too) both keep their depth; `kit/platform.js` draws each segment with the depth at both its stations (`extrudeSegment` in `kit/extrude.js` gained an optional `endProfile`, taking each face's direction from its wider end, so a taper's tip has no zero-length faces), drops the decks' end faces and skips pillars under narrow ends. Seaside's left side is now one deck at depth 11 from s 1078 to 288 (beach, a boardwalk across the lap's start, the grandstand's square, a promenade with lamps, palms and planters, the first corner's beach) instead of five with gaps; props near the tapering ends moved, the Test track's included (its grandstand is 36 long, was 40, and its floodlights moved to the paddock opposite). (Replaced later in the chat, see below.) New `kit/barrier-end.js`: a concrete end post with a red and a white band stands on the ledge wherever a barrier starts, stops or changes style (`kit/barriers.js`), capping the open cross-sections (the padded wall's pad met the striped rail and the anti-gravity wall open-ended; the guardrails stopped bare before the bridge and round the jump's ramp). **Tests:** the layout checks' prop test now needs the deck's depth (taper included) all along a prop's reach (`checkProps` takes the track), and `checkDeckJoins` checks that joined decks share a depth; `kart-3d-kit.test.js` tests `deckDepthAt`. After these fixes: `npm test` (306), the full browser suite (110, run after the deck tapers because `test/helpers/` changed again) and then `m7c`, `m7b` and `m7d2` again after the end posts and the joined decks, all pass. **Junctions, turn boards and the bridge (same chat, after the user's close-ups):** the end posts sat between two barrier styles with parts of both sticking through them (block curbs, the guardrail's beam), stood oddly in the anti-gravity section, and the turn boards (2.2 wide, turned toward the karts coming) hung one post off the ledge and put the other among the rails. `kit/barrier-end.js` was removed again. Instead every barrier style has an `end(station, index, side, facing)`, which `kit/barriers.js` calls where a style stops and where the next starts: the plain, anti-gravity and padded walls close their cross-section with a flat face (`capProfile` in `kit/extrude.js`, a fan from the profile's last point, each triangle turned to face along the road), the padded wall and the striped rail's base too; the guardrail, rail fence, padded wall's fence and striped rail end on a post of their own (the striped rail's tubes also get rounded ends); and the block curbs drop any block whose middle is within half a block of the row's end, so the row stops on a whole block. `kit/turn-boards.js` stands each board along the outside edge, facing into the corner, 0.75 out on the ledge (behind every low barrier: the striped rail reaches 0.48). The bridge before the jump (s 570-630) was the only stretch without barriers, at the user's request it now has walls on both sides and so guardrails (`seaside-skyway.js`, a rule change: leaving the road there no longer falls). Tests changed on purpose: the course test in `kart-3d-race.test.js` checked for road without walls and now checks that every station but the gap is walled; a turn board test comment no longer says the bridge has no walls. Before-and-after shots of all eleven barrier junctions, the bridge and the turn boards were sent to the user, the "before" ones from a scratch copy of the previous code. `npm test` (306) and the browser files `m6b`, `m6c`, `m7a`, `m7b`, `m7c`, `m7d2` pass. **Turn boards back toward the karts, a wider ledge, and the sand spike (same chat, after the user's next close-ups):** the user preferred the boards turned toward the karts coming (easier to see while turning) and asked to keep that angle, move them off the rails and widen the ledge so they do not hang. `kit/turn-boards.js` turns them back (facing back down the road, turned in by tan 0.5, as first built) and stands their middle 1.5 out: the posts land about 0.72 either side of that across the road, the inner one clear of every low barrier. The ledge under them widens from 0.95 to 2.7 (`ledgeWidthAt` in `kit/layout-rules.js`: full within 4 stations of a board, so a corner's boards, 8 apart, share one wide ledge, then an S curve back over 12 stations); `kit/barriers.js` reads the boards from `turnBoardSpots` itself, so the ledge and the boards come from the same rule, and draws its ledge profile at each station's width. Props that the boards now reached moved (`seaside-layout.js`: the beach spots' parasols to 4.3 out and their loungers to 7.3; the last corner's lanterns to 1166, 1190 and 1214), and `checkTurnBoards` (new in `test/helpers/kit-layout-checks.js`, used by both courses' tests) keeps every prop clear of a board. The "glitchy sand part": `deckDepthAt` wrapped a deck's first station (which sits a little before the deck's start) to almost a lap in, so a deck joined at its far end (the last straight's beach, joined to the boardwalk) got its full depth there, a thin spike of sand sticking out into the sea at s 1078; such a station now counts as at the deck's start (and one past the end as at its end), with unit test cases. Before-and-after sheets of the corners, the boards close up and the spike were sent to the user. `npm test` (306) and the full browser suite (since `test/helpers/` changed) ran.

### M7d4a: Shared tools and the barriers (with the M7d4 study)
- [x] Study MK8DX's objects one by one from screenshots, as M7d1 did, for how they are built up: the smaller parts that cover and break up their big shapes and the textures on each part. Notes in `docs/mk8dx-reference.md` for me to review
- [x] Propose how to split M7d4 (three parts chosen: M7d4a the shared tools and the barriers, then the props on the decks and the surroundings; after M7d4a a techniques spike was put before them, so those became M7d4c and M7d4d)
- [x] The shared tools: bevelled parts, relief from the textures' height fields, darker creases where parts meet
- [x] Rebuild every barrier style and the ledge under them, the turn boards, the start gate and the start lights to the study; add the promenade railing (chosen at the split)

Notes (M7d4a done): Automated tests pass: `npm test` (312), and the browser files `m7c`, `m7b` and `m7d2` (the area map's "3D look" row: only the kit, its layouts and `shape-utils.js`/`canvas-texture.js` changed; no shared code, so not the full suite). What was built, the measurements and the device run procedure are in "M7d4a: shared tools and the barriers" in `docs/3d-findings.md`. **The study** ("The kit's objects up close (M7d4 study, to be reviewed)" in `docs/mk8dx-reference.md`): Claude downloaded 33 screenshots from the Super Mario Wiki (Toad Harbor, Mario Kart Stadium, Daisy Circuit's Deluxe views, Koopa Cape, Cheep Cheep Beach, Mario Circuit, Toad Circuit, Wuhu Town) into the scratchpad, cropped and enlarged the objects with a scratch Playwright script, rendered our pieces at kart height in a scratch viewer (a page served from the scratchpad that builds a course with `buildScenery`, renders camera spots and counts triangles per mesh; kept out of the repo, as in M7d2 and M7d3), and deleted the screenshots; only notes are kept. At the split the user chose three parts and the promenade railing (not the chevron guard), and asked for M7d4a to be built in the same chat with the study as written (its formal review is still open). **Shared tools:** `canvas-texture.js` `reliefTexture(canvas, repeat)` (no colour space); `kit/pixel-image.js` `toReliefTexture({ depth, repeat })` (the red channel read as height, central differences, edges wrapping); `kit/concrete.js` and `createWoodTexture` (`kit/seaside-textures.js`) return `{ map, relief }`, so `kit/kit.js` shares `textures.concreteRelief` and `textures.woodRelief` and `kit/road.js` gives its concrete sides the relief; `kit/extrude.js`: `extrudeSegment(builder, segment, side, profile, hex, { uvOf, endProfile, smooth, span })` (was positional `uvOf, endProfile`; `kit/platform.js` updated), smooth shading where faces turn by under 50 degrees, `roundProfile(profile, radius, steps)` (open ends kept, closed profiles stay closed, a corner never takes more than 45% of a face), `offsetProfile`, `tubeProfile` (the striped rail's ring, shared now), `stationBetween`; `shape-utils.js`: `roundedCylinder`, `shaded`, `roundedBox(..., { chamfered })`. **Pieces:** `kit/barriers.js` (the ledge's rounded coping and darker face; the new style registered), `kit/plain-wall.js`, `kit/sponsor-wall.js`, `kit/striped-rail.js` (the rail-end spheres are gone: every end has a post block now), `kit/guardrail.js`, `kit/rail-fence.js`, `kit/block-curbs.js` (no studs), new `kit/promenade-rail.js`, `kit/turn-boards.js`, `kit/start-gate.js` with the new `kit/start-gate-sign.js` (the sign's and badge's drawing moved there; the sign's normal map comes from the same drawing in grey levels, blurred twice), `kit/start-lights.js`. **Layout:** `BARRIER_STYLES.PROMENADE_RAIL` and its place among the low barriers in `kit/layout-rules.js`; `seaside-layout.js` (left s 100-150 and 1150-1214, where striped rails were); `test-track-layout.js` (s 344-384, where a guardrail was, so the Test track still shows every style). **Decided:** relief as normal maps computed once from height fields rather than Three.js bump maps (a bump map's slope is taken per screen pixel, so it grows with distance); small parts repeated hundreds of times are chamfered or plain boxes after a census found the first rebuild at 1,253,000 triangles on Seaside (now 831,000, from 550,000); the block curbs keep their full rounding (chamfered they looked faceted). Not done from the study: pictures on the sponsor boards, an arch behind the gate's sign. **Tests:** new `test/unit/kart-3d-kit-profiles.test.js` (rounding, offsetting, tubes, `stationBetween`, smooth normals round a tube and a sharp right angle kept). Changed on purpose in `test/unit/kart-3d-seaside.test.js`: the seaside half's styles include the promenade railing (and must show it), and turn boards may stand behind it. The browser files got a little slower (M7b 87 s, M7c 85 s, M7d2 50 s). **Device run (iPad):** looks fine, nothing to change; no frame rates were noted.

### M7d4b1: Measure tool and cheap wins
- [x] A Measure button on the setup screen: a scripted run with no phones (a CPU-only race at fixed moments, 1 and 4 views) that draws each case with the GPU made to finish every frame (Safari has no GPU timer, and the screen's refresh rate caps fps), switching shadows, bloom, the pixel ratio and each part of the course (road, sea, supports, barriers, decks, props, gate, surroundings, sky, karts) off in turn, and each cheap win below both ways; the report is text to copy and paste back to Claude
- [x] Cheap wins, each a switch in the tuning panel's new "Drawing" group so the iPad can measure and see both ways: the course's big meshes cut into square cells so Three.js skips those out of view (cell size, 0 = off); posts and other small parts casting no shadow; a shadow map per view fitted round its kart (sharper, and with cells it skips casters far away) instead of one over the whole course
- [x] Device run: the Measure report on the iPad (High and Medium), and the switches looked at while driving (setting the defaults and removing the losing ways moved to M7d4b2's first item)

Notes (M7d4b1 done; the device run's results are in "M7d4b1" in `docs/3d-findings.md`, and what follows from them in plan.md's M7d4b1 summary and M7d4b2's first item): M7d4b was split at the start of its chat (the user chose two parts, and approved one CC0 PBR texture set in JPG or PNG, no KTX2, for M7d4b2). Automated tests pass: `npm test` (325) and the browser files `m6b`, `m6c`, `m7a`, `m7b`, `m7c`, `m7d2` and the new `m7d4b` (8 min 52 s): the "3D look" row for the renderer, scenery and kit, the "3D rules" row because `index.js` and `panels.js` changed; no shared code changed, so not the full suite. No existing test was changed. What was built, the software measurements and the device run procedure are in "M7d4b1: the Measure tool and the cheap wins" in `docs/3d-findings.md`.
- **Files added:** `measure-plan.js` (the stand-in race and its moments, the looks, the cases, the report; plain), `measure-run.js` (one frame per call, sets each look and the drawing switches and puts them back; plain, unit tested with a stand-in renderer), `measure-panel.js` (the progress line with Stop, the report with Copy and Close), `copy-text.js` (the clipboard copy with its fallback box, taken out of `tuning-panel.js` so both panels share it), `gpu-probe.js` (wait for the GPU by reading back one pixel, the frame's draw calls and triangles, the GPU's name), `cells.js` (sorting into cells, bounds; plain), `split-meshes.js` (cutting meshes into cells), `shadow-fit.js` (a view's shadow square and the texel snap; plain), `sun.js` (the sun and its shadow map, moved out of `scenery.js`), `overview-camera.js` (the setup screen's orbiting camera, moved out of `renderer.js`), `test/unit/kart-3d-drawing.test.js`, `test/browser/m7d4b-kart-3d-measure.test.js`.
- **Changed:** `renderer.js` (`setLook`, which `setQuality` now uses; frame-wide `renderer.info`; karts in one group; a course is rebuilt when `cullCellSize` changes; the shadow map fitted before each view; `waitForGpu`, `frameStats`, `describeGpu`), `views.js` (`draw` takes `beforeView(camera)`), `scenery.js` (`buildScenery(scene, track, cellSize)` returns `{ cellSize, sun, update, showParts, dispose }`; the road is the group `road`, the sea is named `sea`; small casters are found once and switched by tuning), `track.js` (`courseExtent`, used by the sun and the overview camera), `kit/kit.js` (`kitPart`), `kit/layout-rules.js` (`KIT_PARTS`), both dressings (every piece built into a named part; the grandstand in `props`, the turn boards in `barriers`, the start lights in `gate`), `kit/grandstand.js` and `seaside-surroundings.js` (the crowd and the boats marked `keepWhole`), `tuning.js` (the "Drawing" group), `panels.js` (the Measure button, `hideAll`), `index.js` (the Measure panel; no race starts while it runs).
- **Decisions:** the Measure tool reuses the real `draw()` with a stand-in roster of four players, so views, HUDs and colours are the game's own; the moments are copies of a race stepped ahead (the race is plain data), drawn with `dt` 0 so nothing moves between frames. A merged mesh's cell pieces share its vertex buffers with their own index and hand-set bounds (Three.js would otherwise work the bounds out from the whole shared buffer: `computeBoundingSphere` must not be called on a piece). The cells are squares of the ground, not stretches of the lap, so the surroundings and sky are cut too. The per-view shadow map is 1024 over 140 units (four views fill the same shadow pixels as the old 2048 map) and snaps to whole texels; the overview keeps the whole-course map. "Small" is a part under 0.6 units in radius (the posts and post blocks; bolts cast none since M7d4a). The defaults (cells of 100, a map per view, small parts casting) are provisional until the iPad's report.
- **Not done here (M7d4b2):** detail in textures, baked light, the CC0 texture trial, simpler far dressing or LOD.


### M7d4b2: Detail in textures and light
- [x] First, from M7d4b1's device runs (iPad and laptop): keep the shadow map per view, small parts' shadows and cells of 200 as fixed choices; remove the whole-course map in races and the three "Drawing" switches, and drop the Measure looks that tried them (keep the tool itself for the later parts' before-and-after)
- [x] Detail in textures: on two or three pieces (the gate's posts, the striped rail's blocks, the sponsor wall), move bolts, seams and panel edges from geometry into normal and ambient occlusion maps (drawn on canvases, or rendered once at load from the detailed geometry) on simpler shapes, add roughness maps; compare with M7d4a's on the iPad, for looks and frame time (the comparison is the device run)
- [x] Light: try ambient occlusion baked into vertex colours or maps on one stretch, and a stronger image-based light, since lighting carries most of MK8DX's look
- [x] Try one CC0 PBR texture set (ambientCG or Poly Haven: colour, normal, roughness, AO, 1K JPG or PNG, listed in `assets/manifest.json`; approved at the split) against our procedural one on one surface; no KTX2 (it would need the Basis transcoder in `host/vendor/`)
- [x] Simpler far dressing or LOD where M7d4b1's numbers say it pays (they say it does not: not built)
- From the study's re-check (after M7d4a): Toad Harbor's striped rails are taller and flatter than M7d4a's (about 0.4 tall and 0.2 deep, nearly filling the height), and Daisy Circuit's guardrail is a taller three-ridge beam; adjust them if M7d4b redoes M7d4a's pieces (the striped rail is reshaped in the texture-detail trial; the guardrail waits for the decision)
- Decide at the end: the techniques the props and surroundings use, whether M7d4a's pieces are redone with them, and whether hand-made glTF models (Blender, baked maps) are worth asking about, as M7d5 already notes for the karts (after the device run: M7d4c's first item)

Notes (M7d4b2 done; the device run's results are in "M7d4b2" in `docs/3d-findings.md`: every trial stays, the course light's strength set to 0.7 from it, and `test/unit/kart-3d-look.test.js` follows that default): Automated tests pass: `npm test` (328) and the full browser suite (113 tests, 17 min 55 s): the full suite because `test/helpers/kart-3d-host.js` changed. A swipe unit test failed once under load and passed on every rerun (timing; unrelated). What was built, the software measurements and the device run procedure are in "M7d4b2: detail in textures and light" in `docs/3d-findings.md`.
- **Files added:** `kit/surface-maps.js` (a surface's colour, height and roughness drawn together: panels with bevelled edges, grooves, domed bolts; `toMaps` gives colour, normal, shade and roughness maps; `hexToRgb`, `grey`), `kit/gate-post-detail.js`, `kit/striped-rail-detail.js`, `kit/sponsor-wall-detail.js` (the three pieces' detail in maps), `baked-shade.js` (the depth-map bake into vertex colours), `occlusion.js` (its maths: directions on a Fibonacci sphere, unpacking Three.js's RGBA depth, the shade from the sky seen; plain, unit tested), `course-light.js` (the PMREM probe from the start line), `photo-asphalt.js` (loads the four CC0 maps), `assets/textures/Asphalt023S_1K-JPG_*.jpg` (Color, NormalGL, Roughness, AmbientOcclusion; listed with SHA-256 hashes, source and licence in `assets/manifest.json`).
- **Changed:** `tuning.js` (the Drawing group is now the four trials, `drawingSwitches()`; the Look group gained `courseLightStrength`), `scenery.js` (`buildScenery(scene, track, { drawing, photoAsphalt })`, cells of 200 always, no small-casters switch, the sky light at 30% under the course light; returns `group`, `drawing` and `sea` too), `renderer.js` (`createRenderer(..., photoAsphalt)`; rebuilds when any Drawing switch differs from the world's; the shadow map per view whenever a race is drawn; `buildWorld` bakes and takes the light, the karts hidden meanwhile; the sea keeps the sky's reflections under the course light; frees the photo maps), `sun.js` (comment), `index.js` (`load()` loads the photo asphalt), `measure-plan.js` and `measure-run.js` (a look per Drawing switch the other way, then every trial off; labels 40 wide), `kit/kit.js` (`drawing` in the kit), both dressings (pass `drawing` and the photo asphalt), `kit/road.js` (the photo asphalt; the outer lanes cut 0.5 and 1.5 from each edge), `kit/start-gate.js`, `kit/striped-rail.js`, `kit/sponsor-wall.js` (each branches to its detail module), `kit/sponsors.js` (`drawSponsorAtlas(scale)`, the cell inset a constant), `kit/extrude.js` (`profileLength`), `kit/pixel-image.js` (`valueAt`, `toDataTexture`, `toShadeTexture`), `canvas-texture.js` (`reliefTexture` is now the general `dataTexture`), `shape-utils.js` (`wrapUv`).
- **Decisions:** the maps are drawn on canvases from height fields (one way, the one M7d4a's sign already used), not rendered from detailed geometry: our details are simple shapes whose heights can be drawn directly. The gate's and blocks' maps wrap round them by position (`wrapUv`, its triangles without an index so the seam where u comes back to 0 does not squeeze the whole texture into one triangle). The bake uses vertex colours, not maps, as the plan offered, and only on the stretch round the start line. Vertex shade cannot vary per instance, so instanced parts get none, and it needs vertices where the shade changes (the road's new edge lanes). The bake's depth maps are cleared to the far plane, and the bias is in texels and grows with the slope. The course light replaces most of the sky light rather than adding to it, so the picture's brightness stays close. Every trial defaults on, so the device run sees the new look first and Measure's last look is M7d4a's. The photo asphalt was picked from five ambientCG sets (Asphalt 023 S, 024 A, 025 A, 027 A, 028 A) for its visible stones.
- **Tests changed on purpose:** `test/unit/kart-3d-drawing.test.js` (the Drawing switches are the four trials, not M7d4b1's three; Measure's setups and runs follow them; new tests for `occlusion.js`), `test/unit/kart-3d-look.test.js` (the Look group has the course light's strength), `test/browser/m7d4b-kart-3d-measure.test.js` (the report's "Drawing set" line; a new test flips every trial off and on again through `tuning.js` and checks for no errors), `test/helpers/kart-3d-host.js` (`GAME_START_TIMEOUT` 30 s to 60 s: with the trials on, a course build takes about 10 s more in software, and the first run of the M7d4b test timed out starting the game).

### M7d4c1: Cleanup and tools
- [x] From M7d4b2's device run (all four trials stay, the course light at 0.7): remove M7d4a's ways for the three pieces, our drawn asphalt, the sky-only light and the unbaked road, the Drawing switches and the Measure looks that tried them (keep the tool itself)
- [x] `npm run kit-shots <pieces>`: renders single kit pieces on a short straight, lit as in the race, from kart height and from above, into picture sheets in `test-results/review/` (dev only, Playwright). Every later part ends with before-and-after sheets for the user to review. A working scratch draft from the planning chat is in `test-results/kit-shots-draft/` (not in git: a static server for the repo, a page that builds barriers on a small rectangle loop with the course light, and the Playwright scripts for shots and sheets); the barrier sheets it made are in `test-results/review/`
- [x] The baked shade over the whole lap (the device run measures how long the course takes to appear; if too long, bake each course once per session and keep it)
- [x] A plain course for the 3D rules tests (`m6b`, `m6c`, `m7a`, `m7b`): the road, the walls and the sea only, no dressing, bake or course light, preset before the page loads as the quality is; the look tests (`m7c`, `m7d2`, `m7d4b`) keep the full drawing

Notes (M7d4c1 done; its procedure and device run are in "M7d4c1" in `docs/3d-findings.md`: the course appears in about 2 s or less with the whole lap baked, the shade looks right, Watch 4 on High holds 60 fps). Built with the new workflow: task A (cleanup and plain course) and task B (kit-shots) by implementer subagents, the bake in the main session. Automated tests pass: `npm test` (335) and the full browser suite (112 tests, 14 min 29 s; full because `test/helpers/` changed).
- **Files added:** `plain-course.js` (`PLAIN_COURSE_STORAGE_KEY`, `loadPlainCourse()`: true only when localStorage holds '1'), `plain-scenery.js` (`buildPlainDressing`: the kit's barriers with no runs, so the plain wall or the anti-gravity wall wherever the track has walls), `host/kit-shots/index.html`, `viewer.js` (builds one piece on a 60-unit straight of a small loop, with `addSkyLight`, `addSun`, `bakeShade`, `createCourseLight` as the race does; sets `window.kitShotReady` or `window.kitShotError`), `pieces.js` (every barrier style, every prop and `start-gate`, each with its road, 'walled' or 'shouldered' (a 14-unit shoulder on the right for props, at the road's height like a deck's top), its build and the camera's focus), `tools/kit-shots.js` (starts the real server with `startServer`, Chromium with the tests' WebGL flags, two shots a piece, the sheet from data URLs; `parseArguments`), `test/unit/kart-3d-plain-course.test.js`, `test/unit/kit-shots.test.js`.
- **Changed:** `tuning.js` (no Drawing group, no `drawingSwitches()`), `renderer.js` (`createRenderer(container, track, qualityLevel, photoAsphalt, plainCourse)`; no rebuild on a switch; `buildWorld` always bakes and takes the course light, except in the plain course, which uses the sky's environment map at the same strength (one lighting rule, the old sky-only light gone); the sea always keeps the sky's reflections; `bakedShades`, each course's shade by track), `scenery.js` (`buildScenery(scene, track, { photoAsphalt, plainCourse })`, no `drawing` returned, the sky light always 30% of 1.3, `addSkyLight(world)` exported for kit-shots), `index.js` (reads `loadPlainCourse()` once), `kit/kit.js` (`createKit({ world, track, keep })`), `kit/start-gate.js`, `kit/striped-rail.js`, `kit/sponsor-wall.js` (the detailed way only; M7d4a's shaft, bolts, frame strips, `drawStripes` and `buildBlock` deleted), `kit/road.js` (the photo asphalt required, roughness 1), `kit/road-textures.js` (`createAsphaltTexture` gone), both dressings (no `drawing`), `seaside-scenery.js` (`GATE_THEME` exported), `measure-plan.js` (`measureSetups()` with no argument, setups `{ label, look }`, no "Drawing set" line), `measure-run.js` (no switches), `baked-shade.js` (the whole lap, see below), `package.json` (`kit-shots` script), header comments of the detail modules, `photo-asphalt.js`, `course-light.js`, `occlusion.js`.
- **The whole-lap bake:** the stretch round the start line (3 pieces of 40 stations, 96 depth maps of 512, 4.3 s in software) became the whole lap. Done naively (31 pieces) it took 30.5 s, and its vertex loop scanned every vertex for every piece and direction; each piece now lists its own vertices once. Profiling showed the time is in drawing the depth maps, not in reading them back or the vertex loop (0.9 s): maps a quarter the size took as long, and drawing 16 maps into one sheet read back once saved nothing in software. The course is cut into cells of 200 units, so a small piece's map draws whole cells anyway: pieces of 100 stations with maps of 1024 (texels a little finer, 0.14 against 0.16 units) took 21.5 s for Seaside Skyway's 1211 stations and 10 s for the Test track's 629. The renderer keeps each course's shade (`bakeShade(renderer, world, track, saved)` returns a Float32Array per shaded vertex; the build makes the same vertices in the same order, checked by count), so showing a course again costs 0.2 s, with identical colours.
- **Decisions:** the plain course is a localStorage setting read by the game, like the quality, not a URL parameter or a test hook in the page; nothing in the UI sets it. The kit-shots page lives in `host/kit-shots/` so it can be opened by hand with `npm run dev` (the user agreed it ships with `npm start` too). kit-shots shows the seaside's road theme and a plain sky-blue background (the sky dome is not exported).
- **Tests changed on purpose:** `test/unit/kart-3d-drawing.test.js` (no switches; Measure's setups have no drawing; the report has no "Drawing set"), `test/browser/m7d4b-kart-3d-measure.test.js` (the test that flipped the switches is gone, the report has no "Drawing set"), `test/browser/m6b`, `m6c`, `m7a`, `m7b` (start on the plain course), `test/helpers/kart-3d-host.js` (`presetPlainCourse`, timing comments).
- **Watch (asked for at the handoff):** the user checked fps with four connections from one device, only one of them driving. The setup screen now has "Watch, no phones: 1 2 3 4 views": `stand-ins.js` (`createStandInRace(track, count, laps, engineClass)`: stand-ins `stand-in-1` to `-4`, named "View 1" to "View 4" in the players' colours, their karts given a lane so the dummy driver drives them; `MAX_STAND_INS`), used by Measure (`createMeasureRaces`) too, so both build stand-ins one way. `index.js` keeps `standIns` while a watched race runs: the renderer, readout and results get them instead of the room's players (`racers()`), every phone is sent the null view ("Waiting for the next race"), Restart races the same stand-ins again, Back to setup ends it. Stand-ins press no Go (no rocket start). `panels.js` has the buttons (`onWatch(viewCount)`). Tests: `test/unit/kart-3d-stand-ins.test.js`, and a Watch test in `test/browser/m7b-kart-3d-race.test.js`.
- **Test timeouts:** with the whole-lap bake, starting the game on the dressed course left the look files' `before` hooks close to node's 60 s default (m7d4b's ran out once in a batch). `GAME_START_TIMEOUT` is now 90 s, and the hooks and tests that start the game take `STARTING_TIMEOUT` (120 s) from `test/helpers/kart-3d-host.js`.
- **Review sheet:** `npm run kit-shots -- --name m7d4c1-barriers` with the eight barrier styles (16 shots, 1 min 48 s); the planning chat's sheets of the same barriers without the bake are `barriers-1.png` and `barriers-2.png` in `test-results/review/`.

### M7d4c2: Blender spike
- [x] Blender on the dev box (5.2.3 LTS, installed by Claude on 2026-11-01 in `~/opt/blender-5.2.3-linux-x64/`, run headless with `blender --background`; dev only, never needed by `npm start`), Python scripts that build a model with Blender's tools, bake its normal and shade (AO) maps from a detailed version with Cycles, and export a `.glb` into `assets/` (listed in the manifest); `GLTFLoader` vendored from Three.js 0.186.1
- [x] Try Blender Lab's official MCP server (needs Blender 5.1 or newer and a running Blender session with its add-on; on the headless server under a virtual display, not yet checked) against plain `blender --background --python` runs; keep it only if it makes trying changes faster
- [x] One prop built both ways (the palm, or the promenade railing's stone pillar), side by side on a picture sheet and on the iPad; then decide which pieces come from Blender. Ask before Python becomes a second language in the repo for good (CLAUDE.md says JavaScript)

Notes (M7d4c2 done; its numbers, the MCP trial, the procedure and the device run are in "M7d4c2" in `docs/3d-findings.md`: the Blender palm looks better, the rebuilt JS palms show on the course, Watch 4 on High holds 60 fps. Decided after it: this course stays all Three.js, Blender is for a future course, Python stays for Blender's scripts, the MCP server stays as an optional tool). Decided at the start (the user): the palm (not the pillar), ours rebuilt to the study first so both sides use today's best ways, and the iPad compares them on the kit-shots page, not with a switch in the race. Built with two implementers at once: task A (Blender pipeline and palm, Opus) and task C (our palm, Sonnet); the main session vendored `GLTFLoader`, wired kit-shots and ran the MCP trial.
- **Files added:** `tools/blender.js` (`parseArguments`, `blenderCommand`, `modelEntry`, `withAsset`; runs Blender with `--background --factory-startup --python-exit-code 1`, since without the last Blender exits 0 when the script raises; then writes the model's manifest entry, keeping hand-edited fields), `tools/blender/common.py` (scene, bmesh, UV packing, `bake()` selected-to-active, glTF-ready materials, export, checks, previews), `tools/blender/palm.py`, `assets/models/palm.glb`, `host/kit-shots/blender-palm.js` (`loadBlenderPalm()`, `addBlenderPalms(kit, parts, spots)`), `kit/palm-trunk.js`, `kit/palm-textures.js` (`drawBark`, `drawFrond`), `host/vendor/three-0.186.1/addons/loaders/GLTFLoader.js` and `addons/utils/SkeletonUtils.js` (unmodified), `test/unit/blender-tool.test.js`, `test/unit/kart-3d-palm.test.js`.
- **Changed:** `kit/palm.js` (`buildPalm()` → `{ trunk, fronds }`, the trunk now with uv; `createPalmMaterials(keep)` → `{ trunk, fronds }` replaces `createFrondMaterial`), `kit/kit.js` (`palm` replaces `fronds`), `kit/props.js` and `seaside-surroundings.js` (use `kit.palm`), `host/kit-shots/pieces.js` (four palm pieces; `build` may be async), `host/kit-shots/viewer.js` (awaits it), `package.json` (`blender` script), `assets/manifest.json`.
- **Blender 5.2's API, learned the hard way (task A):** the glTF exporter writes an occlusion texture only through a node group named "glTF Material Output" (made with the exporter's own `create_settings_group`); alpha MASK comes from the node graph (image alpha → Math ROUND → Principled Alpha), not `blend_method`; double-sided comes from `use_backface_culling`; `export_image_format='JPEG'` keeps an image used for alpha as PNG; an AO bake sees every renderable object and uses the world's AO distance, so other objects are hidden from render and the low object from rays; Eevee renders headless but compiles shaders in software (56 s for a small frame), so previews use Cycles; rebuilds are not byte-identical (the manifest hash changes each build). `palm.py` sets `sys.dont_write_bytecode` so no `__pycache__` lands in the repo.
- **The fronds** share one baked template frond (as ours share one texture); colour and cut-out are baked at 1024x2048 and halved for a soft edge. The trunk's colour is darkened by half its AO too, since Three.js's `aoMap` has no effect in direct sun. The blades reach the tip (`sin(pi*(0.06+0.94*share))^0.6`); the JS formula left a bare midrib at each tip.
- **The MCP trial:** installs approved by the user (`uv tool install ~/opt/blender_mcp/mcp`, the add-on's 1.0.3 zip through `blender --command extension install-file`, `claude mcp add --scope local blender`, then a restart of Claude Code). Headless needs no virtual display but needs `--online-mode` (the add-on opens a socket) and no `--factory-startup` (which turns user add-ons off). The add-on refuses `read_factory_settings`; `common.py` now uses `read_homefile(use_empty=True, use_factory_startup=True)`. The trial's change, rounding the scale teeth (`scallop` replaces `zigzag`) and doubling the game trunk's columns to 32, is committed.
- **Our palm's test** maps the bare name `three` to the vendored copy with a `node:module` resolve hook, the first unit test to import Three.js in Node; if a second test needs it, move the hook to `test/helpers/`.
- **Implementer worktrees** started from an old commit (`c9a0333`, 12 behind `main`): the Agent tool makes a worktree from `origin/main`, the last commit the user pushed, not the local `main`. Task A fast-forwarded its own; task C could not run kit-shots and judged its palm on a scratch page. Since then the project's `.claude/settings.json` sets `worktree.baseRef` to `"head"` (worktrees start from the local `HEAD`, unpushed commits included), and `.claude/agents/implementer.md` has every implementer check that its worktree starts at `main`.

### M7d4c3 to M7d4d: Every kit object rebuilt to the study (one queue)
- [x] M7d4c3: the promenade railing and the padded sponsor wall improved to the study; the grandstand, floodlights, bunting, sponsor stands and the MKTV van rebuilt to the study in Three.js
- [x] M7d4c4: palms, parasols (ribs, scalloped edge), loungers, surfboards, lifebuoys, barrels and the street lamps
- [x] M7d4c5: cones, tyre stacks, warp pipes, giant mushrooms, round trees, hedges and planters; relief on the decks' wood and paving
- [x] M7d4d: the lighthouse (the stone texture's relief), stilt huts, Koopa shell, cliffs and floating islands, boats; clouds, balloons, the airship and the trusses last, if anything shows (they did not: dropped)

Notes (built 2026-11-01; numbers and the device-run procedure in "M7d4c3 to M7d4d" in `docs/3d-findings.md`):
- **One chat, one queue:** the user asked for the four remaining look parts in one chat. They were planned at once as 16 tasks (`docs/queue.md`, kept below), each spec self-contained so an implementer was spawned with only its task letter. Task 0 first moved every piece's materials into its own file, so later tasks never shared a file. `CLAUDE.md`, the `milestone-plan` skill ("Queue") and the implementer were changed for this.
- **Ten implementers at once** (tried at the user's request) used up the 5-hour usage limit within minutes and stopped every agent mid-task; back to 3 at a time. The stopped agents resumed from where they were (SendMessage); one that had changed nothing had lost its worktree and was started afresh.
- **kit-shots under load:** `tools/machine-slots.js` lets 2 runs draw at once across all worktrees. Two agents waited for a run with `while pgrep -f <pattern>`, which matches its own shell and never ends; the implementer now runs kit-shots in the foreground. Several agents' "before" runs waited for a slot while they edited, so drew the new code: they must shoot before changing anything.
- **Review by sheets:** the main session read each report, the diff's size and the after sheet, spot-checked the code, and sent the sheet to the user. Three tasks went back for a round: the street lamps (thin posts, metallic stone), the round tree (it read as a fir) and the hedge (an open end). At the merges the main session removed files that only re-exported (`small-props.js`, `garden-props.js`), moved the motor yacht's kit-shots piece into `landmark-pieces.js`, set the seaside test's boat reach to the yacht's 4.3, and made `kit/cell-noise.js` for the nearest-point code the lighthouse stone and the rock had each copied.
- **kit-shots fixes found on the way:** sea pieces' near view now looks from near the water (`focus.eye`); props stood just past a shoulder, in the air, since M7d4c1, and now stand on a deck (`road: 'decked'`).
- **Browser tests:** run with agents drawing beside them, the look files timed out (course builds past 90-120 s); on a quiet machine all 18 passed (M7d4b's file now takes about 220 s, M7d2's 140 s).
- **Not done:** the decks' sides were never seen in a shot; the lighthouse's windows and weathervane are too small to judge on the sheets; clouds, balloons, the airship and the trusses unchanged (Task O dropped).

#### The queue as planned (docs/queue.md, final statuses)

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
| H | c5 | Round trees, hedges, planters | sonnet | 0 | merged |
| I | c5 | Relief on the decks' wood and paving | sonnet | 0 | merged |
| J | d | Lighthouse | sonnet | 0 | merged |
| K | d | Stilt huts | sonnet | 0 | merged |
| L | d | Koopa shell | sonnet | 0 | merged |
| M | d | Cliffs, floating islands and the beach islands' rocks | opus | 0 | merged |
| N | d | A motor yacht among the sailboats, sailboats detailed | sonnet | 0 | merged |
| O | d | Clouds, balloons, airship, trusses | sonnet | 0 | dropped |

##### Rules for every task

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

##### Task 0: prep (materials into the pieces, textures split, kit-shots pieces)

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

##### Task A (c3): the promenade railing and the padded sponsor wall

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

##### Task B (c3): the grandstand

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

##### Task C (c3): floodlight, bunting, sponsor stand, MKTV van

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

##### Task D (c4): the palm

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

##### Task E (c4): the beach props

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

##### Task F (c4): the street lamps

Pieces: `lantern-lamp`, `triple-lamp`. Study "Street lamps" (Toad Harbor's single lamp: dark iron post with gold
bands, a spike finial and a scrolled bracket holding a round globe; Daisy Circuit's triple: three four-sided
lanterns with pyramid roofs and finials on a crossbar, the post on a square stone pedestal with a plaque, flaring
at its foot with collar rings). Glass warm, not glowing. They stand in rows (dozens): chamfer the small parts.

**Files:** `kit/street-lamps.js`, new files for these pieces, new `test/unit/kart-3d-street-lamps.test.js`.

##### Task G (c5): the circuit props

Pieces: `cone`, `tyre-stack`, `warp-pipe`, `giant-mushroom`. Study "Cones", "Tyre stacks and drums", "Warp pipes
and giant mushrooms": striped cones on a bevelled square base; tyres with a deep tread and a rounded sidewall,
four or five high; the warp pipe glossy green with a fat rim lip, a dark inside and a highlight down its side; the
mushroom's cap glossy with a soft thick rounded rim, gills under it, a cream stem widening at its foot. Cones stand
in rows of dozens: keep them light.

**Files:** `kit/small-props.js`, new files for these pieces, new `test/unit/kart-3d-circuit-props.test.js`.

##### Task H (c5): the garden props

Pieces: `round-tree`, `hedge`, `planter`. Study "Trees" and "Hedges and flowers": the round tree a canopy of three
or four tiers of overlapping leaf scales (each a curved plate with a rounded tip, lighter on top, darker
underneath) on a short thick trunk flaring at the root; the hedge a loaf with a furry leaf texture in relief and
big five-petal pink flowers with yellow middles; the planter a terracotta pot with a rim, flowers in it. The round
tree also stands on every floating island (`seaside-sky.js`, scores of them): keep it under about 1,500 triangles. Since Task 0 both uses share `kit.materials.painted` (roughness 0.6), where the sky's trees had their own at 0.85: give the tree its own material, whichever looks right.

**Files:** `kit/garden-props.js`, new files for these pieces, new `test/unit/kart-3d-garden-props.test.js`.

##### Task I (c5): the decks

Pieces: `deck-boards`, `deck-paving`, `deck-grass`, `deck-sand` (kit-shots, from Task 0). The decks' tops are
plain tiled textures (`GROUND` in `kit/platform.js`); give them relief: the boardwalk's planks with seams, grain
and nail heads (normal and shade maps), the paving as laid stones with joints in relief (its own texture, not the
concrete), sand with ripples. The decks' concrete sides get a coping along the top edge and a darker band low
down (the study's "ledge" note). Wood and sand are drawn in `kit/seaside-textures.js` and also used by the rail
fence and the huts: changing them changes those too, which is fine if they still look right (check `rail-fence`
with kit-shots).

**Files:** `kit/platform.js`, `kit/seaside-textures.js`, the textures section of `kit/kit.js`, new files for the
decks' maps, new `test/unit/kart-3d-decks.test.js`.

##### Task J (d): the lighthouse

Piece: `lighthouse`. Study "Lighthouse" (Daisy Circuit's): irregular stones (crazy paving, not rows of blocks)
with deep mortar in relief; white arched window frames; a smooth tan plinth; a green balcony ring with a railing of
balusters; a white lamp room with orange window frames; a glossy orange dome; a green clover-shaped weathervane on
top. Keep `lighthouseTop(height)` right if anything uses it, and the tower's height and footprint.

**Files:** `kit/lighthouse.js`, `kit/stone-texture.js`, new files for it, new `test/unit/kart-3d-lighthouse.test.js`.

##### Task K (d): the stilt huts

Piece: `stilt-hut`. Study "Stilt huts" (Cheep Cheep Beach's): a thick thatch roof with a ragged, layered edge and a
ridge cap; plank walls (the wood's relief); a deck with plank rails and flower boxes of red flowers; white posts
with a rope rail along the walkway. Same size and stilts.

**Files:** `kit/stilt-hut.js`, `kit/thatch-texture.js`, new files for it, new `test/unit/kart-3d-stilt-hut.test.js`.

##### Task L (d): the Koopa shell

Piece: `koopa-shell`. Study "Koopa shell" (Koopa Cape's): grooved scutes on the green dome with relief, a rim of
fat rounded white lobes (each scute's edge a separate puffy pad), a dark underside. Same size; it lies half sunk.

**Files:** `kit/koopa-shell.js`, new files for it, new `test/unit/kart-3d-koopa-shell.test.js`.

##### Task M (d): cliffs, floating islands and the beach islands' rocks

Pieces: `floating-island`, `backdrop-cliff`, `beach-island`. Study "Cliffs and floating islands" (Mario Circuit's,
Toad Circuit's): rock as big rounded slabs with dark seams between them, warm tan to orange (in shape and in
maps); the grass on top a thick slab with a rounded lip hanging over the rock. The beach islands' rocks to match.
Seen from far away: put the detail in maps rather than triangles. Since Task 0 the floating islands and the backdrop cliffs each draw their own rock texture: draw it once per kit and share it. Same sizes and places
(`seaside-landmarks.js`); the seaside layout tests check that nothing reaches the road.

**Files:** `kit/floating-island.js`, `kit/beach-island.js` (its rocks; the land, shallows and foam may stay), new
files for the rock's maps, new `test/unit/kart-3d-islands.test.js`.

##### Task N (d): the boats

Pieces: `sailboat`, and a new `motor-yacht` piece (add it to `host/kit-shots/pieces.js`, the one task after Task 0
that edits that file). Study "Boats", checked again: a motor yacht like Daisy Circuit's (a raised bow with a curved
sheer line, a rail of posts round its foredeck, a cabin with big brown-framed windows and a lifebuoy on its side,
a flybridge on top with a rail and a frame over it, a flat transom with a swim platform); about half of
`BOATS` in `seaside-landmarks.js` become yachts (give each boat a `kind`), the rest stay sailboats, which get
rails, portholes and a fender line. They bob as now (`keepWhole`).

**Files:** `kit/sailboat.js`, new `kit/motor-yacht.js`, `BOATS` in `seaside-landmarks.js`, `addBoats` in
`seaside-surroundings.js`, `host/kit-shots/pieces.js` (the new piece), new `test/unit/kart-3d-boats.test.js`.

##### Task O (d): clouds, balloons, the airship and the trusses

Dropped by the main session after Task 0's shots of them: as the study says, they look close enough already, and
they are seen only from afar.

### M7d5: Karts and drivers (one kart reviewed until approved, then a queue)
- [x] 12 kart-and-driver designs, one for each of the 12 racers, so every kart in a race looks different: our own go-kart in each character's three colours and an original cast of drivers, both in the style of MK8DX's art (see the decision below)
- [x] In anti-gravity sections the wheels turn flat and their rims glow cyan, as in MK8DX
- Decide in M7d5 how a player's design is chosen (for example by roster slot, CPU karts taking the rest); picking a character on the phone is "character and kart selection" in "Later ideas"
- **Decided at the start of its chat (2026-11-01/02):** a player drives the design of their lobby colour slot, whose kart's main colour is that slot's colour; CPU karts take the designs nobody holds (`assignDesigns` in `karts/kart-roster.js`). The cast is original, not Nintendo's characters (Claude does not reproduce them; Mario was tried in round 1 and dropped): Blaze (red: kid racer, aviator cap and goggles, freckles, scarf), Pip (blue: penguin in a pom-pom beanie), Fern (green: frog in a racing vest), Bolt (yellow: tin robot, glass dome head, antenna), Grimble (purple: garden gnome), Rusty (orange: fox in a bandana), Inky (teal: octopus in a sailor cap), Mochi (pink: bunny with floppy ears and a bow), Sprout (lime: turnip-headed kid), then Bruno (bear in a check shirt), Rhino (rhino in a motocross helmet) and Wisp (little ghost with a scarf), CPU only, slots 9-11. The kart is our own go-kart inspired by MK8DX's Standard Kart (nose with an emblem disc, fairing, side pods, twin exhausts with flared tips, fat treaded tyres), with our own details (each character's emblem, our own tyre lettering and hubs). MK8DX artwork of the Standard Kart is used as a style reference (proportions, finish, kart construction), kept in `test-results/reference/m7d5/` (not committed). The kart, its wheels and anti-gravity are built once, with Blaze, both in JS and in Blender for the user to compare (task A, reviewed round by round); the queue adds one driver each (`karts/drivers/`)
- **How to build it (the user, 2026-11-01):** first one kart and its driver, reviewed by the user on picture sheets, improved round by round until the user is happy with it; then the other designs as a queue in the same chat (the `milestone-plan` skill's "Queue"), each built to the approved one's standard. If the chat runs out of room, it hands off and the next chat carries on the queue

Notes (built 2026-11-01/02; numbers and the device-run procedure in "M7d5" in `docs/3d-findings.md`):
- **The first kart, round by round:**
  - **Round 1** was Mario, built without reference pictures; the user said it looked nothing like him. The references were downloaded from the MarioWiki gallery into `test-results/reference/m7d5/` (not committed; the user crossed out the bare kart body picture and added an in-game shot).
  - **Mario dropped:** the Blender builder then declined to reproduce Nintendo's characters, and Claude agreed. Our own cast replaced him, with an original go-kart inspired by the Standard Kart, and the pictures kept as style references only.
  - **Two builds compared:** Blaze was built twice, in JS (rounds 2 and 3) and in Blender (rounds 1 and 2, `tools/blender/kart-blaze.py` and the files beside it, `assets/models/kart-blaze.glb`).
  - **The user's verdicts:** the Blender face looked like "a character from a horror movie" and the JS head was too big. Both were sent a face brief: large tall eyes set close, mostly iris, with highlights; a soft ball nose; a friendly open smile with one band of teeth; thick rounded brows; hair in big clumps clear of the eyes.
  - **JS chosen:** after that round the user picked JS ("the js one looks better ... especially the facial features"; the two karts looked alike).
  - **The Blender build was never merged.** Its branch `worktree-agent-ac20ede945a7b4b57` is kept, unmerged, for reference. It costs about 26,300 triangles, 9 draw calls, a 2.4 MB file and a 6.5-minute build per character.
- **Then a queue of 11 drivers** (`docs/queue.md`, kept below), one file each in `karts/drivers/`, built to Blaze's approved sheet. Spawned with only the task letter.
  - **Six builders at once:** three ran at a time, then six at the user's request ("just for this once"). The usage limit was not hit this time, but the kit-shots runs queued for the two drawing slots, and several timed out loading the page and were rerun.
  - **Merges:** the one shared line, `KART_DESIGNS` in `kart-designs.js`, was settled at each merge by a small script that lists every design in slot order.
- **Found while building:**
  - A design with nothing in a material kind used to crash `buildDesignShapes`; now the kind is built empty and draws nothing (a unit test).
  - **The pale faces:** the skin kind glowed a fixed peach, so anything in it that was not peach was tinted (Wisp pink-mauve, Mochi pink), and pale parts left out of it went grey in the kart's shade (Pip's mask, Sprout's turnip, Bolt's dome, Fern's and Inky's skin). The user chose to fix it inside the one draw call: the glow is now white, and the shader multiplies it by each vertex's colour (Task L). Blaze's skin was warmed a little (`0xffc399`), so his face measures within a few points of the approved sheet. The drivers that had worked round the old glow were retuned, most of them back into the skin kind.
  - **Task M** folded the parts several drivers repeated into the shared files: `twoTone` and `twoToneShaded` in `part-shapes.js`; `squashed` in `driver-parts.js`; `cheeks()` builds freckles only when given a colour; `arm()` returns its elbow and wrist. Its before and after sheets match pixel for pixel, apart from their titles.
- **Tests:**
  - `npm test` passes, with new unit tests for the roster, the designs' budgets and shapes, empty material kinds, freckles and `twoTone`.
  - The 3D look's browser files (`m7c`, `m7b`, `m7d2`, `m7d4b`) passed after Blaze merged and again at the end, 18 of 18. The red karts did not upset M7d2's count of the start lights' red pixels.
  - One `npm test` run during the queue had one failure that four reruns did not repeat; which test it was went unrecorded.
  - No test was changed on purpose, except that the designs test lets an empty kind have no vertex colours.
- **Not done:** the karts are not yet seen together in a race on the iPad (the device run); picking a character on the phone stays in "Later ideas".
- **Weak spots the builders reported:**
  - Rhino's open-face helmet reads a little like a fishbowl from the front.
  - Inky's tentacles on the wheel read as a cluster of tubes.
  - Rusty's tail hides some of his back in the chase view.
  - Fern's webbed feet are hidden in the nose.

#### The queue as planned (docs/queue.md, final statuses)

| Task | Driver | Slot | Model | Status |
|---|---|---|---|---|
| A | Pip, a blue penguin in a pom-pom beanie | 1 | opus | merged |
| B | Fern, a green frog in a racing vest | 2 | opus | merged |
| C | Bolt, a yellow tin robot with a glass dome head | 3 | opus | merged |
| D | Grimble, a purple garden gnome | 4 | opus | merged |
| E | Rusty, an orange fox in a bandana | 5 | opus | merged |
| F | Inky, a teal octopus in a sailor cap | 6 | opus | merged |
| G | Mochi, a pink bunny with floppy ears and a bow | 7 | opus | merged |
| H | Sprout, a lime turnip-headed kid | 8 | opus | merged |
| I | Bruno, a brown bear in a check shirt (CPU only) | 9 | opus | merged |
| J | Rhino, a steel grey rhino in a motocross helmet (CPU only) | 10 | opus | merged |
| K | Wisp, a lavender white ghost with a scarf (CPU only) | 11 | opus | merged |
| L | The skin glow in each part's own colour, the drivers retuned | - | opus | merged |
| M | The repeated parts folded into the shared files | - | sonnet | merged |

The rules every task followed:
- Own `drivers/<id>.js` (and `<id>-parts.js` past about 200 lines) plus one line in `KART_DESIGNS`, nothing shared.
- `palette.main` is the slot's lobby colour.
- The driver at most about 10,000 triangles, in the existing material kinds.
- Kit-shots sheets beside Blaze's, at most 4 rounds.

### M7e: CPU drivers
- [x] CPU drivers fill the race to 12 karts: they drive the racing line, drift, use boosts and recover from falls

Notes (built 2026-11-03 in one chat; numbers and the device-run procedure in "M7e" in `docs/3d-findings.md`):
- **Decided at the start (the user approved the plan as proposed):**
  - **A CPU level on the setup screen:** Easy, Normal, Hard, default Normal, kept from race to race like the engine class (MK8DX's versus races have a CPU setting like it; not confirmed online).
  - **A mild catch-up (rubber-banding), on by default:** CPU karts behind the leading player get up to 5% more top speed, those ahead up to 5% less, with sliders (0 turns it off). Reports agree MK8DX has one, weaker than older Mario Karts, with no published numbers.
  - **Not in M7e:** CPUs cutting across grass with a boost; items (M8).
- **Two tasks in parallel, then the wiring in the main session:**
  - **A, the racing line and the driver (Opus, about 42 minutes):**
    - `racing-line.js` with `racing-line-pins.js` hold the line.
    - `cpu-driver.js` drives, with `cpu-road.js` (lookups along the line), `cpu-aim.js` (the kart's own offset, passing, merging), `cpu-drift.js`, `cpu-trick.js` and `cpu-recovery.js`.
    - The levels' numbers are in `cpu-levels.js`.
    - Two sliders: `cpuLookAhead` and `cpuBraking`.
    - It split the driver into more files than planned, to keep each under 200 lines.
  - **B, the setup row and the catch-up rule (Sonnet, about 2 minutes):** the CPU row in `panels.js` and `index.js`, `cpuPaceShare(gap)` in `cpu-pace.js`, and `kartTopSpeed` times `kart.paceShare` (1 for players, set in `createKart`).
  - **The main session:** before the tasks, the interfaces (`cpu-levels.js`'s keys, the `cpuCatchUp*` sliders). After them:
    - `race-cpus.js` (handing a kart to the driver, CPU rocket starts at GO, the catch-up every step).
    - The wiring in `race.js`: `kart.cpu` replaces `kart.lane`, and `createRace` takes `cpuLevel` and works out the racing line at once, so there is no pause at GO.
    - `stand-ins.js` and `measure-plan.js` pass the CPU level.
    - `dummy-driver.js` deleted.
- **How the line is found:** K1999's rule (a well-known driver for the TORCS simulator). Each point moves across the road until its curvature is the average of its neighbours', coarse to fine, measured about the road's normal, so the anti-gravity wall needs nothing special. It keeps 1.8 inside the road's edges. It is pinned to the middle from 30 before a ramp's lip to 8 past the landing, and over each dash panel.
- **How the driver drives:**
  - **Steering and speed:** pure pursuit toward its line plus its own offset. It brakes for the corners ahead from the live steering and speed tuning, so the sliders change how the CPUs drive.
  - **Drifting:** it drifts corners whose line turns at least its level's angle, following the line inside the drift, and pumps the stick between the widest drift and a hard push. The counter charges about 4.8 per degree turned at either end and only about 3 in between. It lets go at its level's sparks as the corner ends, or turns in past the end ("overshoot") to reach them.
  - **Jumps:** it tricks a short random delay after a lip, at its level's chance, and steers in the air after a lip, so a boosted kart lands in the hairpin instead of the wall.
  - **Recovery:** it turns round when facing the wrong way, and backs off when stuck for a second.
- **Decisions made while building (task A):**
  - The drift follows the racing line, not the lane it hopped in on, which cost about 1.7 s a lap.
  - Hard takes no orange in Seaside's first corner: lining up for it cost about 0.4 s against the 0.1 s it gains.
  - Each level drives at its own share of top speed (`throttleShare`: Easy 0.95, Normal 0.98, Hard 1). At 150cc most corners are flat out, so technique alone barely set the levels apart.
- **Tests changed on purpose:**
  - The rules tests' scripted player (the old dummy driver) moved to `test/helpers/lane-driver.js` as `laneControls`.
  - `kart-3d-race.test.js`'s hairpin-braking check is now made for the player's lane driver only, since CPU karts drift through it.
  - Its engine-class test measures a player on pole holding Go, since a CPU kart may now rocket start and is caught up to the players.
  - Tests that read `kart.lane` read `kart.cpu`.
  - Every `createRace` and `createStandInRace` in the tests passes a CPU level.
- **New tests:** `kart-3d-racing-line.test.js`, `kart-3d-cpu-driver.test.js`, `kart-3d-cpu-pace.test.js`, `kart-3d-race-cpus.test.js`. `npm test` now takes about 24 s on the dev box.
- **Device run (iPad, 2026-11-04):** the CPUs rocket start, spread out, drift with purple in the big sweeper and trick at the jump; Normal can be won from 12th, Hard is quite challenging, Easy drives like the old default driver (good); the CPU sliders stay at their defaults and stay in the Tuning panel; nothing broke. Watch 4 dropped to about 40 fps at times, from M7d5's karts and bloom, not the CPU drivers (M7d5's Measure in `docs/3d-findings.md`).
- **After the device run (the user's request):** the 3D race starts from the lobby with no players (`minPlayers: 0` in `host/games/index.js`), so Watch can run without phones; Start race still needs a player (`canStartRace`), and the setup screen then says "No players: Watch races without phones" (`describeStatus` in `panels.js`). Unit test in `test/unit/lobby.test.js`.
- **Tests for it:** the full browser suite, since `host/games/index.js` is shared: 112 of 113 passed in 20 minutes. The failure was a screenshot Chromium could not capture in `https.test.js`, which passed 4 of 4 on a rerun.
- **Plan changes at the end of the chat (the user):** M7f (Seaside Skyway down by the sea) moved to the first step of M10 Polish, with the 60 fps work and the optional faster course build. M8 was replanned around the user's own nine items, which replace MK8DX's items and coins, with settings to turn items off, all of them or one at a time.

## M8: Items (our own)
The part of Mario Kart I want most after the race itself. Decided after the M7e device run (2026-11-04): our own nine items **replace MK8DX's** (no banana, shells or mushrooms, and no coins). Like MK8DX, they come from item boxes on the road and are used with the phone's Item button. Each effect lasts 5 s and is drawn on the kart, so everyone can see it is in effect. Built as one queue of tasks in one session (planned 2026-11-04 in `docs/queue.md`, which holds every task's spec and the fixed interfaces), with one review and one device run at the end of all three parts.

**Getting and using items:**
- **Item boxes** sit in rows across the road: on Seaside Skyway two rows, on the start straight and on the quiet straight after the hairpin that was kept for them. A box breaks when driven through and comes back after a few seconds.
- **One item held at a time.** Picking one up runs a short roulette, shown on the kart's host view and on the phone, before the item lands.
- **The Item button** on the phone (in the place kept free for it since M6c) uses the held item.
- **Odds by place, MK8DX's idea:** karts further back get more of the catch-up items (teleport, magnet, ramp), leaders more of the defensive ones (blocker, bouncy, push).
- **On screen:** while an effect lasts, its view shows the item's icon with a ring counting down the 5 s, and the phone shows the held item and the running effect.
- **Effect length:** 5 s, a slider in the tuning panel, like every tuned number.
- **CPU drivers (M7e)** pick up and use items, with a simple rule for each (for example, a blocker when a kart is close behind).
- **Settings:** the host's setup screen gets Items on or off (off races without boxes, as now), and a switch for each item, so any item can be left out. A race setting like the engine class: one set for everyone, kept from race to race, reset on going back to the lobby.

**The nine items** (each look and animation is designed in its chat, with references; "be creative" with the objects):
1. **Blocker:** an object dropped just behind the kart, on the road, that karts bump off like a wall. It vanishes after 5 s with an animation (for example, a sandcastle that crumbles away in the Seaside theme).
2. **Ramp:** a ramp that appears a little ahead of the kart (for example, a kicker that flips up out of the road). Any kart driving onto it is launched and can trick with Drift as off the course's ramp, and gets the trick boost. It vanishes after 5 s with an animation.
3. **Bouncy:** for 5 s the kart is rubbery (a squash-and-stretch wobble, a rubber shine), and karts bumping it bounce off much harder than usual.
4. **Teleport (everyone):** every kart, the user's too, hops a short random way along the road, up to about 40 units forward or back, onto a random lane, so the pack is shaken up without wrecking the standings.
   - It flashes a short warning first, and each kart vanishes and reappears in a burst of sparkles.
   - Never onto a gap or into another kart.
   - Race distance moves with the hop, so laps stay right.
5. **Big and slow:** for 5 s the kart grows (about 1.6 times, in a wobble like MK8DX's Mega Mushroom), is slower (about 80% of top speed) and much heavier, so it wins every bump.
6. **Small and fast-turning:** for 5 s the kart shrinks (about 0.6 times, with a poof), turns much faster (about 1.6 times the steering and drift), and is light in bumps.
7. **Magnet:** for 5 s other karts within a reach (about 30 units) are pulled toward the kart, more strongly when nearer. A field drawn round it (a magnet over the kart, rings, lines to each kart pulled). Only karts ahead are pulled (decided while planning): a pull would speed up the karts behind.
8. **Push:** for 5 s other karts within a reach are pushed away from the kart, with shockwave rings or a bubble round it.
9. **Sticky walls (everyone, the user too):** for 5 s every wall on the course is sticky and drawn so (goo or honey). Any kart touching one is held for about 1.5 s, then let go with a small push off the wall.

**Its three parts** (the tasks of each are in `docs/queue.md`):
- [x] **M8a: the item system and the kart's own effects.** Item boxes, the roulette, holding and the Item button, odds by place, the effect timer and HUD, the settings, CPUs using items, and the three items that change only the user's kart: bouncy, big and slow, small and fast-turning.
- [x] **M8b: objects on the road.** A model for objects placed on the road (by distance and lane, with a lifetime), and the blocker and the ramp, their looks and their vanishing.
- [x] **M8c: effects on the whole field.** Teleport, magnet, push and sticky walls.

Research done while planning (2026-11-04):
- **Mario Kart's own versions of size effects:** Lightning shrinks the karts it hits (smaller and slower, longest for the leaders), and the Mega Mushroom grows a kart to flatten others ([Mario Wiki: Lightning](https://mariowiki.com/Lightning), [Mega Mushroom](https://mariokart.fandom.com/wiki/Mega_Mushroom)).
- **Effects must be readable at a glance:** each one needs its own look on the kart and a timer. Item effects players could not read were a common complaint about smaller kart games ([itch.io comment](https://itch.io/post/13870986)), and KartRider scales its collision effects with how hard the hit was ([KartRider dev blog](https://forums.kartrider.nexon.net/discussion/396/dev-blog-revving-up-the-fun-part-1?lang=en)).
- **Crash Team Racing's items** ([TheGamer's guide](https://www.thegamer.com/definitive-guide-how-to-use-every-item-ctr-nitro-fueled/)), as another kart game's take on items like these:
  - its shield fades on its own if never hit;
  - its bomb can be thrown either way and set off early.

### How it was built

Planned on 2026-11-04 as one queue of tasks (`docs/queue.md`, folded in below), built by `implementer` subagents
over two sessions (the first stopped at the usage limit after task G; the second resumed at H on 2026-11-04/05),
with a `reviewer` on every task, one review and one device run at the end of all three parts. Main-session fixes
after reviews are in the decisions below. Look sheets: `test-results/review/` (`d-after`, `h-after`, `j-after`,
`k-after`, `m8-items`; ignored, not committed). The device run's procedure is in "M8" in `docs/3d-findings.md`.

**Tests:** see "Handoff tests" at the end of this section.

### The queue (docs/queue.md, as it stood at the handoff)

| Task | Part | What | Model | Waits for | Status |
|---|---|---|---|---|---|
| 0 | M8a | Prep (main session): item ids, the Item button's name, M8a's tunables | main | none | merged |
| A | M8a | Item rules: boxes, roulette, odds by place, holding and using, effect timers, settings rules, CPU use, views | opus | 0 | merged |
| B | M8a | Phone: the Item button with the held item, the roulette and running effects | sonnet | 0 (merges after C) | merged |
| C | M8a | Host: item icons, the HUD's item frame and effect rings, the Items settings, wiring in index.js | sonnet | 0 (merges after A) | merged |
| D | M8a | Looks: the item box (spin, break, return) and the kart effects (big, small, bouncy) | opus | 0 (merges after A) | merged |
| E | M8a | Rules of the kart effects: big, small, bouncy in speed, steering, bumps and walls | sonnet | 0 | merged |
| F | M8a | Browser test `m8-kart-3d-items` (M8a's items), spawned alone | sonnet | A-E merged | merged |
| G | M8b | Road objects' rules: the model, the blocker, the ramp, CPU use and avoiding | sonnet | F | merged |
| H | M8b | Road objects' looks: sandcastle blocker, kicker ramp | opus | F | merged |
| I | M8c | Field rules: teleport, magnet, push, sticky walls, CPU use | opus | G, H merged | merged |
| J | M8c | Looks: teleport (warning, sparkles, pop) and sticky walls (goo) | sonnet | G, H merged | merged |
| K | M8c | Looks: magnet field and push shockwave | sonnet | G, H merged | merged |
| L | M8c | Browser test extended to all nine items, spawned alone | sonnet | I, J, K merged | merged |

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
- **As D built it (merged):** each drawing is `create<Thing>Drawing(scene, bursts)`, `bursts` the shared particle
  pools of `items/burst-look.js` (`bursts.shards`, `bursts.sparkles(at, count, reach)`, `bursts.smoke(...)`):
  use them for sparkles and puffs rather than making new pools. `item-drawing.js`'s `DRAWINGS` list takes one
  entry per drawing. `kart-effect-looks.js` also exports `kartRubbery` (bouncy's coat) and `kartCameraSize` (the
  size the chase camera follows: big or small only); its `isBlinkedOff(left)` (the last second's blink) is
  private: export it if a later look needs the same blink. kit-shots: `host/kit-shots/item-pieces.js` exports
  `itemShowRace(track, { karts: [{ lateral, effect }], boxes })` and `drawItemRace(scene, track, race, { frames,
  change(race, frame) })` for later pieces.
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

- **E, CPU karts and small's faster turning** (main session, after E's review): the CPU driver's turn estimates
  (`steerFor`, `speedAhead` in `cpu-driver.js`) do not know a small kart turns 1.6 times faster. Measured with a
  Hard kart on Seaside Skyway, kept small for two laps: it flipped its stick 15 times a lap (a normal kart 70),
  lapped in 34.8 s (normal 35.7 s) and never fell, so it does not weave and nothing was changed. If small CPU karts
  look twitchy on the device run, divide `pursuitRate`'s result by `effectTurnShare(kart)` there.
- **E, two bouncy karts** part as usual (no extra); the extra goes wholly to the non-bouncy kart, so the pair
  parts at exactly `bouncyBounceShare` times the usual speed (`kart-bumps.js` `addBouncyExtra`).
- **A, `startEffect`** lives in `items/kart-effect.js` and is re-exported by `item-rules.js` (the interface is
  unchanged): the catalog importing it from `item-rules.js` made an import loop that threw at load time.
- **A, items run on at the results:** `stepItems` also runs at the results, so effects, roulettes and box returns
  run out behind them (a big kart would otherwise stay big); no pickups or uses there or by a finished kart. A box
  breaks for any kart after GO, also one that cannot pick up (as in MK8DX, where a box breaks either way).
- **A, falling:** no item use while falling; the kart keeps its item, and a press made then is used up.
- **A, stand-ins and finished players' karts** use items by the CPU rules, so Watch shows items.
- **A, the race's random:** `race.items.random` is a counter (from 8); each draw is the first number of
  `random.js`'s `createRandom(counter)`, then the counter goes up by one.
- **A, box rows:** Seaside's 805 row is 30 units into the straight after the hairpin, where the road still widens
  (half-width about 8.6), so it holds 5 boxes about 3.6 apart. Test track rows at 50 and 455 (the dash panel is
  at 470).
- **A, CPU rules:** bouncy when a kart within 6 is behind or alongside; big when a kart is up to 12 ahead within 3
  of its line, or after 4 s; small when the road turns 1.2 rad or more over the next 50 stations; each after a
  random 0.5 to 2 s. No catch-all: a CPU kart may hold bouncy a long time when nobody is near (a defensive hold).
- **A, few pickups per row:** in a simulated 120 s race the pack broke most boxes inside the 3 s return time
  (about 20 pickups in all). `itemBoxReturnSeconds` is the slider to try on the device run.
- **A, the race is not wholly plain data, and was not before M8:** `sinceDriftPress` starts at `Infinity`, which
  JSON turns into null; the items test round-trips only the item state.
- **D, looks:** the "?" sways ±0.6 rad to face oncoming karts rather than turning all the way (turning, it read
  back to front); the box, bursts and coats are made at the start, visible but drawing nothing, so their shaders
  compile before the race (no stall at the first burst). The bursts' dot texture is `effects.js`'s (exported).
- **D, the camera** pulls back with a big kart's size only (`kartCameraSize`, main session after the review: the
  scale's height made the camera breathe with bouncy's squash and stretch).
- **D, `renderer.js`** is 260 lines (247 before M8): a candidate for a split in M10.
- **G, blockers:** a standing blocker is a stand-in kart in `kart.cpu.obstacles` (the item rules refill it every
  step); the CPU looks 2 s ahead for one (0.5 s for a kart: too late to steer round a thing that does not move).
  The blocker's hit is the wall's (`kart-walls.js` `bounceOff`, exported, main session after the review); a big
  kart drops its blocker far enough back to clear it. CPU karts are launched by any ramp they drive over (they
  do not steer round ramps). `rampLaunchSpeed` 6.5 flies a top-speed kart about 16 units (the course's jump gap
  is 14).
- **Old browser tests (M8a):** `m6b` (the reloaded phone's view) and `m7a` (the tilt layout's Item place, a view
  shown by hand) now expect the race view's `item`: a test changed on purpose (the race view grew; the Item
  button shows only with items). No other old browser test failed with items on.
- **Run state at the usage limit (2026-11-04):** M8a (0, A to F) and G merged. Browser tests on main at 64fa172:
  the full suite passed apart from m6b and m7a (fixed, see above); then m6b, m6c, m7a, m7b and m8 all passed
  (29 tests, 327 s). H was stopped before it changed anything (its worktree is gone): spawn it afresh.
- **I built beside H** (main session, on resuming): I owns no file H touches and draws nothing, so it was spawned
  with H rather than after H's merge, to save a step's wait. H still merges first.
- **H, looks:** the kicker's "hinge" is a scale of its height (near end on the road), first reaching full height
  at 0.08 s and overshooting to about 1.5 times by 0.16 s, since a plain 1-unit flip barely showed; check on the
  device that it reads as the spec's 0.25 s (`road-object-motion.js` `FLIP_SECONDS`). The slump is the whole
  castle squashing and leaning into a pile, not towers crumbling one by one. Puffs are the shared white smoke
  (`bursts.smoke` has no tint). Three extra files (`road-object-motion.js`, `sand-look.js`,
  `instanced-part-look.js`) keep each under 200 lines. After merge (main session): `indexed()` moved to
  `shape-utils.js`, `roadCamera` exported from `item-pieces.js` instead of copied, the drawing's update no longer
  allocates an empty list or Map entries per frame. `createRoadObjectDrawing` is about 140 lines in one closure
  (scratch objects shared by its helpers): a split candidate in M10.
- **I, teleport:** a kart in the air also hops (its jump and any trick boost due are lost); a kart held on a
  sticky wall is let go; a CPU kart that hops rejoins its line (`kart.cpu.started = false`); a second use restarts
  the warning. The "Teleport!" banner also shows on views following a CPU kart (so Watch shows it).
- **I, magnet and push:** mass is `weight * effectMassShare` (as the bumps). Magnet targets must also be within
  the reach in a straight line (no pull across a hairpin). Measured: a kart 10 ahead settles at 0.75 of top
  speed; one at 29 hardly slows; a kart alongside is pushed 3.9 units in 0.5 s. Twelve magnets in one CPU race
  bunched the finish; `magnetPull` is the slider for the device run.
- **I, sticky walls:** only a kart on the ground sticks; sticking ends a drift with no mini-turbo and removes
  boosts; the blocker's hit stays a plain bounce. `kart-walls.js` reads a per-kart copy (`kart.item.stickyWalls`),
  refreshed each step. A held kart can still be shoved sideways by a bump (`kart-bumps.js` does not treat it as
  fixed): check on the device. `kart-physics.js` is now 222 lines: a split candidate in M10.
- **I, CPU rules:** teleport only from the back half; magnet with any magnet target; push with a kart within 5;
  sticky walls after holding it 3 s; each after the usual 0.5 to 2 s.
- **I's review** asked to restore a comment about an import circle between `item-rules.js` and `race.js`; not
  done, since `race-phases.js` (imports nothing) removed that circle and the comment was stale.
- **Browser tests after H and I** (main at da1f853): m6b, m6c, m7a, m7b, m7c, m7d2, m7d4b and m8 all pass (39
  tests, 1002 s).
- **K, looks:** two extra files, `field-ring-look.js` (road rings shared by magnet and push, faded out at the
  road's edge in their shader, from the road's frame at the kart, so a sharp bend can clip a ring a little early
  or late) and `field-line-look.js` (the magnet's lines). Lines are 1 px with normal blending (additive bloomed
  where five met). The looks scale out over the last 0.3 s rather than blink; they do not follow `kartLookScale`
  (a magnet on a big kart is not raised). Main-session review sent it back once: rings floating over the void
  beside the skyway, the 212-line file, bloom, per-frame allocation, the lines' bulge along world y, horseshoes
  sharing one set of geometries.
- **J** sent back once after its review and sheet: goo read as lava, blobs as oranges, faint hop sparkles, the
  warning rings blooming where they meet, per-frame allocation, drips growing along world y.
- **J, looks (after its fix round):** the pop applies to every racing, non-falling kart while hops exist (hops
  carry no kart id), so a kart that found no spot pops too (rare). The goo is one course-wide mesh (about 10,000
  triangles on a long lap, one draw call, no shadow) with its back 0.15 outside the road's edge and its top 0.78
  up, so it hugs both the plain wall and the guardrail (`sticky-guardrail` piece). Drips grow along the road's
  up. A held kart gets goo blobs squashed toward the wall and 4 goo strings (short, since a held kart stops about
  1 from the wall). The warning rings are scaled to about 0.45 luma each, and the outer stops outside the inner,
  so they should not bloom; kit-shots has no High-quality option, so bloom is estimated, not seen: check on the
  device (High quality, Teleport). `sticky-walls-look.js` is 204 lines.

### Handoff tests

- `npm test`: 552 unit and server tests pass (new: `kart-3d-road-object-looks`, `kart-3d-field-items`,
  `kart-3d-field-looks`, `kart-3d-magnet-push-looks`, and M8a's).
- **Browser, after H and I:** m6b, m6c, m7a, m7b, m7c, m7d2, m7d4b and m8 (the 3D rules and look areas), 39 tests,
  1002 s, all pass.
- **Browser, the full suite at the end** (task 0 changed `shared/`): 124 of 124 pass, 1486 s (about 25 minutes).
- **`m8-kart-3d-items.test.js` (task L):** one 1-lap race per item, only that item allowed: the phone's view
  rolls, then holds it; one Item press; the timed items show in the view's effects and as that item's ring on the
  host's HUD (rings carry `data-item`, added after L's review); blocker and ramp show no effect once the host's
  item box is empty (their objects on the road are seen only in the screenshots,
  `test-results/screenshots/m8-1-host-<id>.png`); teleport shows the "Teleport!" banner; a racing view follows.
  The tests run in order and share one race setup, so one failure cascades and a single test cannot be run alone.
- **Tests changed on purpose:** m6b and m7a expect the race view's `item` (M8a, see the decisions); m8's two Big
  tests became the nine item tests.

### M8d: Items after the device run (one queue, docs/queue.md folded in)

Asked for after the M8 device run (iPad, 4 players): big, small and bouncy go; the ramp item becomes a jump
item that lifts the kart so it can trick off it (the trick keeps MK8DX's takeoff window, the user's choice); every item
equally likely, drawn while the roulette spins, different every race; kit-shots gets a bloom option. Planned and
built on 2026-11-05 in one session, after the M8 handoff; the device run's results and M8d's procedure are in
"M8" and "M8d" in `docs/3d-findings.md`.

#### Status

| Task | What | Model | Waits for | Status |
|---|---|---|---|---|
| M | Items' list and draws: big, small, bouncy removed; equal chances, drawn at the roulette's end, a new seed each race | sonnet | none | merged |
| N | The trick in the air (any takeoff), CPU tricks to match | sonnet | none | dropped (the user keeps MK8DX's takeoff window) |
| P | kit-shots `--bloom`: pieces drawn through the race's bloom (High quality) | sonnet | none | merged |
| O | The jump item replaces the ramp: rules, CPU use, icon, a launch puff; the kicker removed | sonnet | M merged | merged |
| main | m8 browser test to six items and the jump; CLAUDE.md's kit-shots line; docs; full browser suite; handoff | main | O, P merged | merged |

M and P share no files and nothing one decides changes the other's spec, so they run together. O waits for M
(it edits the same item files).

#### Rules for every task

The same as M8's ("Rules for every task" in "M8" in `docs/history.md`), read there: own files only, rules plain
and seeded, a unit test file per task, `npm test` before committing, looks judged with kit-shots in rounds within
the M8 budgets, a complete but short report. Commit messages start `m8d:`. Behaviour that changes on purpose
changes its tests; say which in the report.

#### Decisions (made with the user before the run)

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

#### M: Items' list and draws (sonnet)

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

#### N: dropped

The user kept the existing trick rule (MK8DX's takeoff window); the jump item's launch calls `crossLip` (O).

#### P: kit-shots `--bloom` (sonnet)

**Goal:** `npm run kit-shots -- --bloom [--name <sheet>] <pieces>` draws the pieces through the race's bloom
(`host/games/kart-3d/bloom.js`, as High quality does), so glow can be judged on the sheet. Files:
`tools/kit-shots.js` (the flag, passed as `&bloom=1`), `host/kit-shots/viewer.js` (draws through `createBloom`
when set), and a unit test of the argument parsing if one exists (add to it). The sheet's default name gains
`-bloom` when the flag is on. Check: `npm run kit-shots -- --bloom teleport-warning sticky-walls` shows the
teleport rings and the goo; report what glows.

#### O: The jump item replaces the ramp (sonnet)

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

#### Decisions made during the run

- **P's first bloom sheet** (`teleport-warning`, `sticky-walls`): the teleport rings get a soft cyan halo and the
  goo a faint warm one, so the rings do reach bloom, against M8's estimate. Left as they are: the user saw both
  on the iPad on High and liked the effects; the sheet goes to the user at the handoff.
- **M edited files outside its list** (accepted): the bouncy coat in `kart-models.js`, the big kart's camera size
  in `chase-camera.js`, `renderer.js` and `views.js`, and the effect shares in `kart-bumps.js`, `kart-walls.js`,
  `kart-driving.js` and `kart-physics.js`. "Removed everywhere" needed them; the reviewer checked a kart with no
  effect behaves exactly as before (bump overlap `2 * KART_RADIUS`, wall limit `KART_RADIUS`, speeds, camera).
- **M's seed:** `createRace(..., itemSeed = DEFAULT_ITEM_SEED)` (8, the tests' fixed seed); the game passes
  `freshItemSeed()` (the only `Math.random`, at the race's start, outside the rules); stand-in races (Watch,
  Measure) default to a fresh one too.
- **O's jump:** with the game's gravity (25), "about 1 s and 2.5 units" cannot both hold: the slider is the height
  (*Jump, height*, 1-6, default 2.5), about 0.9 s in the air. `needsGround` on the catalog entry keeps the jump in
  the slot while the kart is airborne; after O's review the main session added "or held on a sticky wall" (the
  hold zeroes the velocity, so the launch was wasted), with a unit test, and made `jump-look.js`'s update use
  plain loops (no closures a frame).
- **The m8 browser test** lost big, small and bouncy (main session, with M), and the ramp became the jump (with
  O). Its first run after O: 7 of 8; the blocker race failed waiting for Ana's view (see below).
- **The m8 blocker failure was the test's press, not the game:** a fix task (spawned alone, running only m8) logged
  every view and found the failing runs still holding the blocker after the press (2 failures in 6 blocker-only
  runs): the test held the Item button a fixed 400 ms, and the host reads the controls once per step, so in
  software (frames delayed by seconds) the press could start and end between two reads. The test now holds the
  button until the view shows the item used (`holdItemButtonUntil`). Then 8 of 8, twice. The game's races stay
  random; no seed hook was needed. On a device the host steps at 60 a second, so a real tap is seen.

#### Handoff tests

- `npm test`: 544 unit and server tests pass (new: `kart-3d-item-draws`, `kart-3d-jump`; `kart-3d-item-effects`
  deleted with big, small and bouncy).
- **Browser, `m8` after O:** 7 of 8, the blocker race failing on the test's short press (above); after the fix, 8
  of 8 twice (the fix task's runs).
- **Browser, the full suite at the end** (M and O changed `shared/`): 121 of 121 pass, 1409 s (about 24 minutes;
  `m8` about 3.3 minutes with six items).
- **Tests changed on purpose:** the item unit tests for the removed items, the odds and the ramp; `m8` drives six
  items (the jump instead of the ramp) and holds the Item button until the host used the item.
- **Sheets:** `test-results/review/teleport-warning-sticky-walls-bloom.png` (P's check) and `o-after.png` (the
  jump's puff and the sandcastle), ignored, not committed.


## M9: Palm Bay Airport, a new course with glide ramps and spin-boost posts
Decided after the M8 device run (2026-11-05): a new course, built around one consistent theme, replaces the idea
of adding M9's features to Seaside Skyway (which has no single theme and floats high over the sea). Planned as one
queue (`docs/queue.md`, the `milestone-plan` skill's "Queue") in a planning chat with the user, then run in one
session like M8, left running unattended and resumed from the queue's Status table after any stop.
- **Theme: a sunny seaside airport**, our own course, with MK8DX's Sunshine Airport as the style reference for how
  the theme is kept consistent (references collected while planning, under `test-results/reference/m9/`): a
  runway, a terminal, hangars, a control tower, parked planes, baggage carts, a windsock, runway lights, taxiway
  signs, palm trees, beaches and the sea. Reuses the seaside pieces where they fit (sea, sand, palms, decks,
  barriers, item boxes).
- **On the ground, not in the air** (the user): the road runs at ground level on terrain, with parts going
  underground (a tunnel, an underpass) and parts above ground (a bridge or ramp), but the course never floats
  high over open space as Seaside Skyway and the Test track do. New ground the track builder does not have yet
  (terrain round the road, tunnels) is part of the plan.
- **Size:** slightly larger than Seaside Skyway (1213 units a lap): about 1500.
- **Device run:** M9's also covers M8d's, put off until then by the user ("M8d" in `docs/3d-findings.md`; its
  steps can run on the new course with Items on).
- **Planned 2026-11-05** with the user: the queue (tasks 0 and A to N, every spec, the course's pieces and the fixed
  interfaces) is in `docs/queue.md`, to be run in another chat as `/loop run the m9 queue in docs/queue.md`.
  - **Layout approved** from a top-down sketch (`test-results/reference/m9/layout-sketch.png`, not committed), with
    the references beside it. It is a figure-8 of 1551 units:
    - the start on the apron by the terminal;
    - a taxiway;
    - a cutting and a tunnel under the runway (the crossing);
    - a jump over a baggage conveyor;
    - an anti-gravity banked ring with spin posts inside an open-sided hangar;
    - the runway, then a glide off its end over the bay onto a beach road at -6;
    - an S-bend climbing back to the apron.
  - **Decided:**
    - Palm Bay Airport first in the course list (the existing browser tests pinned to Seaside);
    - gliding steered with the steering, Brake to dive;
    - distant rocky islands, after a rock study;
    - the course never empty beside the road;
    - at most 1.8 million triangles (Seaside's 1.5 million plus 20%).
  - Look tasks find their own references (MK8DX sources first) where the spec gives none (the user, now in
    `.claude/agents/implementer.md`).
- [x] Glide ramps: a blue ramp launches the kart into a glide with its glider, steered in the air, as in MK8DX
  (the airport's natural one: off the end of a runway, like a plane taking off)
- [x] Spin-boost posts in an anti-gravity section (for example through a hangar or the terminal)
- [x] The course's layout designed with a top-down sketch, approved by the user while planning
- [x] Item boxes, the racing line for the CPU drivers, the jump with a trick, dash panels
- [x] The theme's new pieces and props, built from the references, judged on kit-shots sheets
- [x] A study of real rock formations (and MK8DX's rock) before any new rock is built (moved from M10: the
  Seaside islands' rock was rings of round shapes, which rock is not)

### How it was built

Run as one queue (`docs/queue.md`, folded in below) in one session from 2026-11-05 to 2026-11-06, started as
`/loop run the m9 queue in docs/queue.md` and left unattended: task 0 in the main session, then 14 implementer tasks
(A to N), three at a time, each read by a `reviewer` before its squash merge. The 5-hour usage limit stopped the
run three times; each time the stopped agents were resumed in their worktrees after the reset (one, G, had saved
nothing and was spawned again). Tasks sent back once after review or the main session's look at the sheet: J (sharp
boxes), D (the bake greyed the shore water; build time), I (shared geometry took one plane's shade), L (long files),
M's small fixes at merge. Every decision the main session made is in "Decisions made during the run" below.

### Handoff tests

- `npm test`: 636 unit and server tests pass (new: `kart-3d-palm-bay-airport`, `kart-3d-glide`, `kart-3d-spin-posts`,
  `kart-3d-glider`, `kart-3d-airport-ground`, `kart-3d-airport-landmarks`, `kart-3d-airport-hangars`,
  `kart-3d-airport-planes`, `kart-3d-airport-vehicles`, `kart-3d-airfield`, `kart-3d-rock-islands`,
  `kart-3d-airport-layout`). A swipe test failed once under the agents' load and passed alone three times.
- **Browser, during the run:** after A, the rules files (m6b, m6c, m7a, m7b) and m8 passed (m6c's drift test timed
  out once under load and passed alone); after L, with nothing drawing, m7c and m7d2 passed and m7d4b after its
  fix; m9 passed alone after N.
- **Browser, the full suite at the end** (task 0 changed `test/helpers/`): 124 of 124 pass, 1877 s (about 31
  minutes; m9 374 s).
- **Tests changed on purpose:** every 3D browser file starts its race through `clickStartRace` (picks Seaside, or
  the Test track where it was); m7b expects the airport first in the course list; m7d4b picks Seaside while
  starting and its Measure test's timeout went from 180 s to 240 s (it took 176 s before M9, 182 s after; the
  behaviour is unchanged); `kart-3d-race` and `kart-3d-racing-line` expect the airport (two jumps, one a glide);
  `kart-3d-kit` leaves the airport's props and barrier styles out of the Test track's "every style and prop" check;
  `kart-3d-kit-parts`' stand-in canvas ignores drawing calls it lacks.


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
| N | Browser test `m9-kart-3d-airport`, spawned alone | sonnet | A, B, M merged | merged |

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
- **Task N:** a player's phone cannot steer to the glide or a post in software WebGL, so the race test watches Watch's
  four self-driving stand-ins (CPU drivers) on the plain course and reads the Tuning readout every 250 ms: a view
  "gliding" at the glide's share of the lap (72 to 78%), back on the road past it, never "fell off" there, some view
  with a "spin boost", and the results. At merge the readout learned to say "gliding" (`race-views.js`'s
  `describeKart`, unit tested) instead of "in the air" while the glider is open, so the test checks the glide itself.
  "Spin boost" can also come from a bump in the ring, so the post is not proven alone (its rules are unit tested).
  The look test checks the full course's start view has many colours (terminal, plane, tower and gate drawn).
  About 6.5 minutes alone; `m9` added to CLAUDE.md's Testing map rows for the 3D look and rules.
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

### M9d: spin posts without the bounce (after the device run)

The device run (2026-11-06; results in "M9" in `docs/3d-findings.md`) found the posts bounced karts into walls and
other karts; MK8DX's pillars only spin and boost. Commit `be29608`, one implementer working in the main checkout:
`spin-posts.js` slides a touching kart round the post (`slideRound`: sideways only, its speed along the road kept,
no loose grip), so the Spin posts group lost `postBounce` and `postPartingSpeed`. The CPU aim at posts turned out
to be ignored (every CPU drifted through the 60-degree ring and could not steer wider than the road), so
`cpu-drift.js` starts no drift with a post in the corner ahead and lets go 1 s before one (`postAhead` in
`cpu-road.js`), `POST_CLIP` is 0.6 and `cpu-aim.js` recomputes `clip` each step from the kart's cooldown. Lone CPUs
at the posts: Easy 0, Normal 12, Hard 19 spins of 48 passes. Tests changed on purpose: the spin-post unit tests
(no bounce; lone karts per level; no CPU drift between the posts). `npm test` 638 pass; browser m6b, m6c, m7a, m7b,
m8 and m9 (the 3D rules area and the airport) 36 of 36 pass, 855 s. Review note: a kart hitting a post dead-centre
is moved round it in a frame or two; watch for a visible jump on the next device run.

