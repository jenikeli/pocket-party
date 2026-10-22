# plan.md

Build plan for the phone-controller party game. Work through milestones in order. Stop after each one and let me test on real devices before continuing. Each milestone is built in its own chat session (see "How to work with me" in `CLAUDE.md`). See `CLAUDE.md` for architecture and constraints.

## Goal

A Mario Party-style game for 2-9 players. A host display shows a board and minigames. Players use their own phones (iOS or Android) as controllers. The host can be any device with a browser. Start with a small, fun core (a circular stadium board plus 3 minigames that showcase tap, swipe, and tilt) and grow from there.

## Decisions already made

- Controllers: Android Chrome, and iOS Safari or Chrome (iPhone and iPad), all verified in the spike with a self-signed cert that includes `extendedKeyUsage=serverAuth` and `keyUsage` (see `docs/spike-findings.md`). Host: Windows, Mac, iOS, or Android browser.
- Host rendering and game logic: Phaser 3 (2D), 1920x1080 logical size, `FIT` scaling.
- Server: Node + `ws`, relay only. Dev on my Linux home server, production on a spare non-rooted Android phone running Node in Termux. The same code and the same `npm start` must work on both. Node is v26.3.1 on the phone; pin the same major version on the dev box via `engines` and `.nvmrc`.
- Network: the Android phone runs a hotspot and all game devices join it. Observed on my phone: the hotspot interface is `swlan0` at `10.60.55.71` and the address stayed the same after toggling the hotspot, but changed after a phone restart, so never assume a fixed IP. The phone may also be on home Wi-Fi at the same time (`wlan0`), so the server answers on several addresses.
- Transport: WebSockets. HTTPS/WSS is required for tilt and Wake Lock, so it is a real milestone (M2), not an afterthought.
- Reconnection: playerId + secret token in `localStorage`. The host holds a disconnected player's slot for a generous grace period (default 2 minutes, configurable), because phones often drop their socket when the screen locks and the OS, not our code, decides that.
- Host is authoritative for game state.
- Inputs to explore first: tap, swipe, tilt.
- Up to 9 players (`MAX_PLAYERS` in `shared/protocol.js` is the hard ceiling; the host's lobby setting picks the limit for each game). The phone's hotspot accepts 10 clients and the host display is one of them (see `docs/spike-findings.md`). With many players, board turns get long and the screen gets crowded, so M6 and the minigames must lay out and pace for 9, not 6.
- Automated tests guard every behaviour that has been built, so later changes cannot silently break earlier milestones (see "Testing" in `CLAUDE.md`). Real-device checks are kept for what automation cannot see.

## Board design

A generic circular **stadium track**: a closed loop made of two straights joined by two semicircular ends, like an athletics track.

- 28 spaces total: 8 on each straight, 6 on each curve. The track is generated procedurally from a function `trackPoint(index) -> {x, y}`, so it needs no art assets and scales to any screen.
- Players are colored tokens that move along the loop in one direction. Passing the start/finish line gives +5 coins.
- Space types: **coin** (+3), **penalty** (-3), **minigame trigger**, **bonus** (swap coins with a random player, or gain a mystery reward), and **start/finish**.
- Turn: the active player rolls a die from their controller (a tap, or a shake or flick once tilt works), the token animates along the track, and the space resolves.
- A round ends when all players have moved. Then everyone plays a minigame, and the result awards coins.
- The game lasts 8 rounds. Most coins wins.

## Minigame interface

Host side:
```
{ id, assets, init(players), onInput(playerId, input), update(dt), isDone(), results() }
```
Each minigame also has a controller UI module that shows the right controls and tells the controller which input type to start.

## Pre-build spike (I run this myself before M0)

`spike.js` is a throwaway test server and page. I use it on my real devices to check: round-trip latency through the Termux hotspot, how long a WebSocket survives a locked screen on iOS and Android, tilt over plain HTTP (and over HTTPS later), Wake Lock availability, and how many devices the hotspot accepts. The first run is done and the results are in `docs/spike-findings.md`. Read that file before designing M2 to M4, and do not copy code from `spike.js` into the game.

## Milestones

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

Notes (M1 done): Checked with scripted WebSocket clients on the dev box; the real-device check (iOS + Android) is still to do. WebSockets share the HTTP(S) port at `/ws` (`SOCKET_PATH`). Browser pages connect with `openSocket({ onOpen, onMessage, onClose })` from `shared/socket.js`, which returns `{ send, close }` and already picks `wss:` on https pages. Room codes are 4 letters (no I or O). `MAX_PLAYERS` is enforced by the server (changed from 6 to 9 after M1 testing to fit the hotspot; the M1 host has 9 colors and spawns squares in rows of 6). The server adds `playerId` to forwarded inputs from the socket's session and ignores any `playerId` in the message. No reconnection yet (all M4): a controller's slot is freed as soon as its socket closes (no grace period, no connected flag), the token is issued but not stored in `localStorage`, `REJOIN` is not handled, and the server has no heartbeat, so it does not notice half-open sockets. When the host disconnects, the server deletes the room and sends `ROOM_CLOSED` to its controllers, so a host reload (including a dev reload) gives a new room code. Patterns to reuse: a host scene is a class extending `Phaser.Scene` in `host/scenes/`, with one `handleMessage` switch, and for now the scene owns the socket (move it out once a second scene needs it). An input module exports `start(surface)`, `stop()`, `onInput(callback)` (see `controller/inputs/drag.js`: `{ kind: 'drag', x, y }` from -1 to 1, at most every 33 ms). `npm run dev` passes `--dev`: it watches `controller/`, `host/`, `shared/`, `assets/` and pushes `RELOAD` to hosts only; changes to `server/` still need a manual restart. QR library: `host/vendor/qrcode-generator-2.0.4.mjs` (MIT, license in its header).

### M1.5: Automated tests
Added after M1: nothing yet checks that finished behaviour keeps working. Build the test setup and cover everything M0 and M1 already do, so every later milestone only adds tests for its own behaviour.
- [ ] `npm test` runs Node's built-in test runner (`node --test`, no dependency): unit tests for plain modules (`server/config.js`, `server/rooms.js`) and integration tests that start the real server on a free port and talk to it with `ws` clients (create room, join, wrong code, room full, input relay with the server-added `playerId`, spoofed `playerId` ignored, player left, room closed, static files and their content types, including `.mjs`)
- [ ] Browser tests (`npm run test:browser`): drive the real host and controller pages in headless browsers, including mobile emulation, and save screenshots that Claude can look at. Needs a dev-only dependency (Playwright is the likely choice, with headless Chromium and WebKit); ask before adding it, and keep it out of what Termux installs (`npm install --omit=dev`)
- [ ] Browser tests cover M1 end to end: host shows a room code and QR, controller joins from the `?room=` link, dragging moves that player's square, closing the controller tab removes it, closing the host sends the controller back to the join screen
- [ ] A short list in `CLAUDE.md` of what still needs a real device (and why)

**Done when:** `npm test` and `npm run test:browser` both pass on the Linux dev server, and breaking a covered behaviour on purpose makes a test fail.

### M2: HTTPS on the LAN
Goal: make controller pages a secure context on iOS and Android with no per-device setup beyond tapping through a warning.

Decision (before M2): use a self-signed cert (option C). Rejected: a local CA (every device must install and trust a root cert) and a real domain with Let's Encrypt (needs internet). Accepted cost: every player taps through a certificate warning, again whenever the cert changes.
- [ ] Server serves HTTPS/WSS when `CERT_PATH` and `KEY_PATH` are set; clients choose `wss` automatically (HTTPS serving already exists from M0)
- [x] Spike result in `docs/spike-findings.md`: a self-signed cert (IP in the subject alternative name) with click-through gives `isSecureContext = true`, working `wss`, Wake Lock, and tilt permission on Android Chrome and iPad Safari. iPhone Safari needed `extendedKeyUsage=serverAuth` and `keyUsage=digitalSignature,keyEncipherment`; with those, Safari and Chrome work on iPhone and iPad.
- [ ] `npm run gen-cert`: generate the cert with openssl (Termux needs `pkg install openssl-tool`). The hotspot IP changes when the phone restarts (seen: `10.60.55.71`, then `10.213.249.252`), so read the current IPs from `listLanAddresses()` by default instead of requiring them as arguments, and put every one in `subjectAltName`, plus `extendedKeyUsage=serverAuth` and `keyUsage=digitalSignature,keyEncipherment`. The base command is in `docs/spike-findings.md`. Pick a validity well under iOS's 825-day limit.
- [ ] `npm start` (and `npm run check`) warn clearly when the cert does not cover the current IPs or has expired, and say to run `npm run gen-cert`
- [ ] Verify `window.isSecureContext === true` on each phone, and that Wake Lock and `requestPermission` are available
- [ ] Record how often the warning reappears per browser (same cert, next visit / next day), in `docs/spike-findings.md`

**Done when:** an iPhone and an Android phone both report a secure context on the LAN after a phone restart and `npm run gen-cert`, with nothing installed on the devices.

### M3: Input lab (tap, swipe, tilt)
A test page and a matching host view for comparing the three input types on both platforms.
- [ ] Controller input modules: `tap.js`, `swipe.js`, `tilt.js` (see CLAUDE.md input rules)
- [ ] Tilt: "Enable tilt" button, iOS permission flow, calibration, smoothing, throttling
- [ ] Host view: live display per player showing the raw input, rate (Hz), and round-trip latency
- [ ] Controller shows its own live readout and which API it detected (platform, secure context, sensor available)
- [ ] Notes file `docs/input-findings.md` with what works well or badly on iOS vs Android (latency, jitter, drift, permission quirks)

**Done when:** I can try all three inputs on both platforms and see numbers for latency and update rate. Those findings drive which minigames we build.

### M4: Lobby and reconnection
- [ ] Lobby on host listing joined players (name + color)
- [ ] Controller shows "connected as X" and a ready button
- [ ] Reconnect flow: kill the tab or toggle Wi-Fi, rejoin as the same player with the token
- [ ] Host grace-period timer; slot freed if no rejoin; wrong token rejected
- [ ] Resume UX: when the controller tab becomes visible again (`visibilitychange`), send a ping and treat the socket as dead if no pong arrives within about 2 seconds (the spike showed `readyState` can still read open on a dead socket). Show "Reconnecting..." and auto-rejoin with the token; if that fails, show a "Tap to reconnect" button
- [ ] Host shows a "waiting for <player>" state while a slot is in its grace period
- [ ] Game settings on the lobby screen, set by the host before the game starts. Start with: max players (2 to `MAX_PLAYERS`, default 6) and the reconnect grace period (default 2 minutes). The host owns the settings; the server only receives the player limit (with `CREATE_ROOM` or a new message type), clamps it to `MAX_PLAYERS`, and refuses joins beyond it. Later milestones add their own settings here (M6: number of rounds). Add only settings that real features use.
- [ ] Host keeps its screen awake with Wake Lock (expected: nobody touches the host during a game)
- [ ] Controller Wake Lock where available (nice to have, not required, since reconnection covers it)

**Done when:** a player can drop and rejoin without losing their slot, on both iOS and Android.

Notes (open question from before M0): CLAUDE.md says the server keeps the slot table but the host "holds the slot" for the grace period. Decide which side runs the timer. A likely fit: the host runs it and tells the server to free the slot, and the server rejects tokens for freed slots.

### M5: Minigame framework + first minigame
- [ ] Host loads and runs a minigame module and collects results
- [ ] Controller swaps UI when the host announces a minigame
- [ ] First minigame uses tap: a button-mash race with a countdown

**Done when:** a full minigame plays from countdown to results with all players.

### M6: Board loop
- [ ] Procedural stadium track (see Board design) with colored tokens
- [ ] Turn order, dice roll from the controller, animated movement, space effects
- [ ] After each round, run a minigame and award coins
- [ ] End screen after the configured number of rounds (default 8) with the winner, plus a rounds setting in the lobby

**Done when:** a complete short game runs from lobby to winner.

### M7: More minigames and polish
- [ ] A swipe minigame (for example flick to throw or slice)
- [ ] A tilt minigame (for example balance or steer), designed from the M3 findings
- [ ] Sound effects and music (MP3/M4A, small)
- [ ] Host "Tap to start" screen (unlocks audio, requests fullscreen where supported)
- [ ] Preload screen with a progress bar; background lazy-loading of minigame assets with a ready check before each one
- [ ] Disconnect handling during minigames (pause, bot-fill, or forfeit; recommend one)

### M8: Deploy to Termux
- [ ] Soak test: server idle with the screen off for 15-20 minutes (`termux-wake-lock` held, battery optimization off for Termux), then confirm devices can still connect and rejoin
- [ ] Check the hotspot does not auto-switch off when idle
- [ ] HTTPS working on the phone using the approach chosen in M2
- [ ] Play a full game on the real setup
- [ ] Document setup in `README.md` (Termux from F-Droid, `pkg update && pkg upgrade`, clone, `npm install`, `npm start`)

## Later ideas (not now)

- Service worker for a fully cached offline host (possible once HTTPS works)
- More boards, items, and character selection
- Spectator view or second screen
