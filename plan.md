# plan.md

Build plan for the phone-controller party game. Work through milestones in order. Stop after each one and let me test on real devices before continuing. Each milestone is built in its own chat session (see "How to work with me" in `CLAUDE.md`). See `CLAUDE.md` for architecture and constraints.

## Goal

A Mario Party-style game for 2-6 players. A host display shows a board and minigames. Players use their own phones (iOS or Android) as controllers. The host can be any device with a browser. Start with a small, fun core (a circular stadium board plus 3 minigames that showcase tap, swipe, and tilt) and grow from there.

## Decisions already made

- Controllers: Android Chrome, and iOS Safari or Chrome (iPhone and iPad), all verified in the spike with a self-signed cert that includes `extendedKeyUsage=serverAuth` and `keyUsage` (see `docs/spike-findings.md`). Host: Windows, Mac, iOS, or Android browser.
- Host rendering and game logic: Phaser 3 (2D), 1920x1080 logical size, `FIT` scaling.
- Server: Node + `ws`, relay only. Dev on my Linux home server, production on a spare non-rooted Android phone running Node in Termux. The same code and the same `npm start` must work on both. Node is v26.3.1 on the phone; pin the same major version on the dev box via `engines` and `.nvmrc`.
- Network: the Android phone runs a hotspot and all game devices join it. Observed on my phone: the hotspot interface is `swlan0` at `10.60.55.71` and the address stayed the same after toggling the hotspot. The phone may also be on home Wi-Fi at the same time (`wlan0`), so the server answers on several addresses.
- Transport: WebSockets. HTTPS/WSS is required for tilt and Wake Lock, so it is a real milestone (M2), not an afterthought.
- Reconnection: playerId + secret token in `localStorage`. The host holds a disconnected player's slot for a generous grace period (default 2 minutes, configurable), because phones often drop their socket when the screen locks and the OS, not our code, decides that.
- Host is authoritative for game state.
- Inputs to explore first: tap, swipe, tilt.

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
- [ ] Folders: `server/`, `host/`, `controller/`, `shared/`, `assets/`
- [ ] `package.json` with `ws` as the only dependency
- [ ] Server serves static files for `/` (controller) and `/host`, bound to `0.0.0.0:3000`
- [ ] `shared/protocol.js` with initial message types
- [ ] Phaser vendored into `host/vendor/`
- [ ] `engines` and `.nvmrc` pinning the Node major version used on the phone
- [ ] Config only via env vars (`PORT`, `CERT_PATH`, `KEY_PATH`, optional `HOST_IP` override); no hardcoded paths; port 3000 or above
- [ ] On startup the server prints every non-internal IPv4 address with its interface name, e.g. `http://10.60.55.71:3000  (swlan0)`, wrapped in try/catch
- [ ] `npm run check`: verifies the Node version, binds the port, and prints the reachable URLs
- [ ] Run the M0 server on the Termux phone now (clone with git, `npm install`, `npm start`), not just on the dev box

**Done when:** the server runs from the same repo on both my Linux server and the Termux phone, and a host device and a phone (iOS and Android) both load their pages over the hotspot.

Notes (decided before M0): `HOST_IP` only picks which address the server prints first as the main URL, and later shows on the host's join screen. It never changes the bind address, which stays `0.0.0.0`. Vendor the latest Phaser 3.x as a pinned ES module build (`phaser.esm.js`), not Phaser 4. `.gitignore` must cover `node_modules/`, `*.pem`, `.env`, and any other secrets: never commit certs, keys, or tokens.

### M1: One phone moves a square
- [ ] Host creates a room and shows a room code
- [ ] Controller joins with the code; server assigns playerId + token
- [ ] Controller sends a simple drag input
- [ ] Host moves a square per player in response

**Done when:** two phones (one iOS, one Android) each control their own square on the host in real time.

### M2: HTTPS on the LAN
Goal: make controller pages a secure context on iOS and Android with as little per-device setup as possible. Try these in order and record what works:
- [ ] Server serves HTTPS/WSS when `CERT_PATH` and `KEY_PATH` are set; clients choose `wss` automatically
- [ ] Option A: a local CA (such as `mkcert`) with the root cert installed and trusted on each phone. iOS needs the profile installed and then enabled under Certificate Trust Settings. Document the exact steps.
- [ ] Option B: a domain I own, with an A record pointing to the server's private LAN IP and a Let's Encrypt cert via DNS-01. No per-device trust needed, but devices must be able to resolve the domain (internet or a hotspot with internet).
- [x] Option C: spike result in `docs/spike-findings.md`. A self-signed cert (IP in the subject alternative name) with click-through gives `isSecureContext = true`, working `wss`, Wake Lock, and tilt permission on Android Chrome and iPad Safari. iPhone Safari initially failed; adding `extendedKeyUsage=serverAuth` and `keyUsage=digitalSignature,keyEncipherment` to the cert fixed it, and Safari and Chrome now work on iPhone and iPad. Still to check: how often the warning reappears. The cost is that every player taps through a certificate warning, so A or B may be worth it.
- [ ] `npm run gen-cert`: generate the cert with openssl (Termux needs `pkg install openssl-tool`). It takes the server's IPs as arguments and puts every one in `subjectAltName` (hotspot IP, home Wi-Fi IP, dev box IP), plus `extendedKeyUsage=serverAuth` and `keyUsage=digitalSignature,keyEncipherment`. The full command is in `docs/spike-findings.md`. A cert only matches the IPs listed, so regenerate it if the hotspot IP changes or the cert expires (30 days).
- [ ] Verify `window.isSecureContext === true` on each phone, and that Wake Lock and `requestPermission` are available.

**Done when:** an iPhone and an Android phone both report a secure context on the LAN, and I know the simplest setup that works. Recommend one option and explain the tradeoffs.

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
- [ ] End screen after 8 rounds with the winner

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
