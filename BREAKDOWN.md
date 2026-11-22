# Pocket Party: how to run it and how it fits together

Source: https://github.com/matochichap/pocket-party (678 tracked files). Read from `CLAUDE.md`, `plan.md`, `package.json` and the source. Verified on this Mac: `npm install --omit=dev` works and `node server/index.js` starts and serves `/` and `/host`.

## What it is

A local-network party racing game. A big screen (the **host**) runs the whole game. Phones (the **controllers**) are the gamepads. A tiny Node server serves the pages and relays messages. Everything is plain browser JavaScript: no build step, no framework, no app store.

Three games on the host's picker:

| id | Title | Players | Drawn with |
|---|---|---|---|
| `kart-3d` | Kartwheel | 0-4 (split screen) plus CPU karts up to 12 | Three.js |
| `kart-2d` | Kartwheel Mini | 2-9 | Phaser |
| `input-lab` | Input lab | 1-9 | Phaser |

## How to run it

Needs **Node 26** (`engines`: `>=26 <27`, `.nvmrc` = 26). This Mac has v26.5.0, so you are fine.

```bash
cd /Users/jethroheng/claude/Mario/pocket-party
npm install --omit=dev      # skips Playwright (only needed for browser tests). Already done.
npm start                   # server on 0.0.0.0:3000, prints your LAN URLs
```

- Host screen: `http://<your-ip>:3000/host` (laptop/iPad/TV browser). Click **Tap to start** (unlocks audio, goes fullscreen), pick a game, **Play**. A join window opens with a QR code and 4-letter room code.
- Phones: scan the QR or open `http://<your-ip>:3000/` and type the code. Same Wi-Fi, no client isolation.
- `npm run dev`: same as start, plus file watching. The host page auto-reloads on edits to `controller/`, `host/`, `shared/`, `assets/`. Restart it yourself after editing `server/`. Phones need a manual reload.
- `npm run check`: checks Node version, env vars, certs, port, prints URLs.

**Tilt steering and screen wake-lock only work over HTTPS** (browsers hide those APIs on plain HTTP). Over plain HTTP the phone falls back to the on-screen stick. To get tilt:

```bash
npm run gen-cert            # needs openssl; makes certs/cert.pem + certs/key.pem for every LAN IP
CERT_PATH=certs/cert.pem KEY_PATH=certs/key.pem npm start
```

Open the `https://` URL it prints and tap through the self-signed warning once per phone. Rerun `gen-cert` whenever your IP changes.

Env vars (only way to configure the server): `PORT` (3000+), `CERT_PATH`, `KEY_PATH`, `HOST_IP` (only changes which URL prints first).

Tests: `npm test` (unit plus server, no browser, ~25 s). `npm run test:browser` is Playwright and slow (~30 min); it needs `npm install` (with dev deps) and `npx playwright install chromium webkit`. I did not run tests.

For Claude-driven browser checks, `.mcp.json` registers two Playwright MCP browsers (desktop host, emulated Pixel 7 phone). Start `npm run dev` without cert vars first.

## Architecture

```
[Phones /] --ws/wss--> [Node server] <--ws/wss-- [Host /host]
    ^                       |                          |
    +---- http(s): pages and assets served by the same server ----+
```

- **Server is dumb on purpose.** It serves files, manages rooms and player slots, and forwards messages. No game rules.
- **Host is the authority.** All state, physics and rules run in the host's browser at a fixed 60 Hz step.
- **Phones send inputs, not state.** The host sends each phone a small "view" object saying what to show.
- **Protocol** lives in one file: `shared/protocol.js`. Every message is JSON `{type, ...payload}`.

### Message flow, end to end

1. Host picks a game, it loads, host sends `CREATE_ROOM`. Server replies `ROOM_CREATED {roomCode}`.
2. Host sends `SET_PLAYER_LIMIT` (the game's max). It opens or closes the room with `SET_ROOM_OPEN` (closed during a race).
3. Phone sends `JOIN {roomCode}`. Server allocates a slot, replies `JOINED {playerId, token}` (token saved in the phone's `localStorage`) and tells the host `PLAYER_JOINED`.
4. Host sends `CONTROLLER_STATE {gameId, view, player}` per phone. The phone loads that game's controller UI and renders the view.
5. Phone sends `INPUT` (steering, buttons, choices like colour/ready) plus `INPUT_MODE`, `DEVICE_INFO`, `PONG`. Server adds the real `playerId` from the socket and forwards to the host.
6. Dropped phone: server sends the host `PLAYER_DISCONNECTED`. Host runs a grace timer (default 30 s) and sends `REMOVE_PLAYER`. Phone rejoins with `REJOIN {roomCode, playerId, token}`. The token is checked; `playerId` alone is never enough.
7. Host closes its socket at game end. Server sends every phone `ROOM_CLOSED`.

Server pings every 10 s (`heartbeat.js`). Phones ping on tab resume and reconnect if no pong in 2 s.

## File breakdown

### Root
| File | Purpose |
|---|---|
| `package.json` | Only runtime dependency is `ws`. Dev dep is Playwright. ES modules (`"type": "module"`). Scripts: start, dev, check, gen-cert, kit-shots, course-previews, test, test:browser. |
| `CLAUDE.md` | Rules for working with Claude on this repo: hard constraints, input/protocol rules, readability rules, testing matrix. Read this first. |
| `plan.md` | Design decisions, game module interface, "where things live", open issues. The best single design doc. |
| `.mcp.json`, `.nvmrc`, `.gitignore` | Playwright MCP config, Node pin, ignores. |
| `.claude/` | Agents (`implementer`, `reviewer`), skills (`milestone-plan`, `handoff`, `device-run`), Playwright MCP configs, settings. This is the author's Claude workflow: plan a milestone, subagents build in worktrees, reviewer checks, hand off. |
| `docs/` | Measured findings: `spike-findings.md` (HTTPS, latency, screen lock), `input-findings.md` (tilt etc.), `3d-findings.md` (perf, iPad limits), `kart-reference.md` (reference game numbers), `device-run.md`. |
| `assets/` | `manifest.json` (every asset with sha256, source, licence), `covers/` (picker thumbnails), `kart-3d/previews/` (course pictures, generated by `npm run course-previews`), `textures/` (CC0 asphalt photo). Everything else is drawn in code. |

### `server/` (Node, no game logic)
| File | Purpose |
|---|---|
| `index.js` | Entry. Builds an http or https server, attaches the relay, prints addresses, starts dev reload with `--dev`. |
| `config.js` | Reads `PORT`, `CERT_PATH`, `KEY_PATH`, `HOST_IP`. Binds `0.0.0.0`. |
| `static-files.js` | Serves only `controller/ host/ shared/ assets/`. `/` maps to the controller page, `/host` to the host page. `no-cache`. |
| `relay.js` | WebSocket server on `/ws`. Routes messages by role: host messages (create room, limits, kick, controller state, ping) and controller messages (join, rejoin, input...). Has the allow-lists of which message types are forwarded each way. 16 KB message cap. |
| `rooms.js` | Room table: 4-letter code (no I/O), host socket, open flag, player limit, player slots (`playerId`, secret `token`, socket or null). |
| `joining.js` | `JOIN` and `REJOIN` handling and refusal reasons (no such room, full, game in progress, rejoin refused). |
| `leaving.js` | `REMOVE_PLAYER`, `KICK_PLAYER`, `LEAVE`, host closing a room. |
| `messages.js` | `parseMessage`, `send` helpers. |
| `heartbeat.js` | Ping frames every 10 s to detect dead sockets. |
| `addresses.js`, `check.js` | List LAN IPs, startup diagnostics. |
| `certificate.js`, `gen-cert.js` | Self-signed cert generation (via openssl) and validity/IP-coverage checks. |
| `dev-reload.js` | File watcher that sends `RELOAD` to hosts in `--dev`. |

### `shared/` (used by server and both pages)
| File | Purpose |
|---|---|
| `protocol.js` | Single source of truth: `MESSAGE_TYPES`, `JOIN_FAILURE_REASONS`, `INPUT_KINDS`, `KART_BUTTONS`, `KART_ITEMS`, `KART_CHOICES`, `KART_STEERING`, `MAX_PLAYERS = 9`. |
| `socket.js` | `openSocket()`; picks `ws` or `wss` from the page protocol. |
| `wake-lock.js` | Keep screen on (HTTPS only). |
| `confirm-click.js` | Two-click confirm (first click arms red, 3 s timeout). Used for destructive actions. |
| `icons.js`, `item-icons.js` | Inline SVG icon sets. |
| `rate-meter.js`, `ordinal.js` | Hz counter for input lab; "1st/2nd". |

### `host/` (the big screen)
Shell (plain HTML/CSS, "Night" look):
| File | Purpose |
|---|---|
| `index.html` | Host page. Holds Tap to start, picker, top bar, join window, loading screen, settings, and the import map for Three.js. |
| `main.js` | Entry: fit stage, show Tap to start, then the picker. |
| `stage.js`, `ui.css`, `shell.css`, `top-bar.css`, `game-picker.css` | 16:9 stage sized in `em`; design tokens and classes. |
| `game-picker.js`, `pictures.js` | Game list from the registry; preloads covers. |
| `game-session.js` | Runs one game from Play to back: loading screen, create room, container, bar, join window, runner, cleanup. If `start/step/render` throws it stops the game, closes the room, shows the picker with a message. |
| `game-opening.js` | Load game then create room (no code shown before the game is loaded). |
| `room.js`, `roster.js`, `grace-periods.js` | The host's socket to the server, roster of players (colour slots, names), per-player grace timers. |
| `game-runner.js`, `fixed-step.js` | Frame loop: runs fixed 1/60 s `step()` calls (max 15 per frame), then `render(alpha)`. |
| `game-bar.js`, `join-window.js`, `qr-code.js`, `settings.js`, `loading-screen.js`, `tap-to-start.js`, `shell-rules.js`, `shell-sounds.js`, `buttons.js`, `hand-driven-phaser.js` | Top bar, QR join window, host settings (volumes, grace time) in `localStorage`, etc. |
| `games/index.js` | **Registry.** Lists games and lazy-loads each with dynamic `import()`. The shell never imports a game directly. |
| `kart/` | Code shared by both races: setup rules, player rows, panels, phone control tables, race time. |
| `audio/` | All sound is synthesised with Web Audio (`synth.js`, `instruments.js`, `music.js` sequencer, `tunes/` note data). No audio files. |
| `vendor/` | Local copies: Three.js 0.186.1, Phaser 3.90, qrcode-generator. No CDN (LAN may be offline). |
| `kit-shots/` | Dev tool pages to render single 3D pieces and courses for review (`npm run kit-shots`). |

Game module interface (every game in `host/games/<id>/index.js` exports `createGame()`):
`load(onProgress)`, `start({container, players, setControllerView, removePlayer, pingPlayer, pickColor, setRoomOpen, bar})`, `onMessage(playerId, msg)`, `step(dt)`, `render(alpha)`, `onPlayerLeft(id)`, `isDone()` (unused), `stop()`.

**`host/games/kart-2d/`**: top-down. `track.js` (stadium from maths), `kart-physics.js`, `race.js` (rules), `race-views.js` (what phones see), `renderer.js` (Phaser), panels and sounds.

**`host/games/kart-3d/`** (about 250 files):
- Rules (DOM-free, unit tested): `kart-physics.js`, `kart-driving.js`, `kart-ground.js`, `kart-walls.js`, `kart-bumps.js`, `kart-techniques.js` (drift, mini-turbo), `kart-boosts.js`, `kart-glide.js`, `race.js` plus finish/CPU/views parts.
- `tuning.js`: every tunable number, with a live slider popup in-game.
- CPU drivers: `cpu-driver.js`, `cpu-aim/drift/pace/recovery/road/trick`, `cpu-levels.js`, racing line.
- `items/`: six items (blocker, jump, teleport, magnet, push, sticky walls). Rules plus a `*-look.js` per item.
- Courses: `courses.js` lists three (Palm Bay Airport, Seaside Skyway, Test track), each a definition file plus layout data. Track is a centre line with width/height/roll per piece.
- `kit/` (163 files): procedural textured pieces (road, barriers, decks, props, grandstand, landmarks).
- `karts/` (+ `drivers/`): 12 original drivers, about 25k triangles each.
- Rendering: `renderer.js`, `scenery.js`, `course-loader.js` (nothing built until Start race), `baked-shade.js`, `bloom.js`, `course-light.js`, `quality.js` (3 levels), `views.js` (split screen), `effects.js`.
- Session and UI: `index.js` (wires parts to the shell), `race-session.js`, `frame-drawer.js`, `phone-link.js`, `setup-panel.js`, `race-bar.js`, `tuning-panel.js`, `results-panel.js`, Watch (CPU-only demo) and Measure (timing tool).

**`host/games/input-lab/`**: latency stats and a per-player card; for testing tap/swipe/tilt.

### `controller/` (the phone, plain HTML/JS, no framework)
| File | Purpose |
|---|---|
| `index.html`, `style.css`, `screens.css` | Phone page: join form, game screen, "game ended", reconnect overlay. |
| `main.js` | Entry: join screen, handles host state, leave button, reconnect UI. |
| `connection.js` | Join, rejoin with saved token (3 tries, 1.5 s apart), ping-on-resume liveness check. |
| `session-store.js` | `localStorage` for roomCode/playerId/token/name. |
| `game-screen.js` | On `CONTROLLER_STATE` names a game, dynamically loads `controller/games/<id>/` (JS and CSS), then calls `showView` for each update. |
| `device-info.js`, `no-zoom.js`, `background-leave.js` | Platform detection, zoom blocking, leave signal when the tab is closed. |
| `inputs/` | Input modules with the same shape `start/stop/onInput`: `tap`, `swipe`, `tilt` (with calibration and iOS permission), `drag`, `button`, `throttle`. |
| `kart/` | Shared kart controller: `controls.js` + `markup.js`, `setup-screen.js`, `color-picker.js`, `steering.js` (tilt falls back to stick), `floating-stick.js`, `go-drift.js` (tap-then-hold on Go = drift), `turned-layout.js` (controls drawn rotated in portrait because iOS cannot lock orientation), `item-slot.js`, `phone-screen.js`. |
| `games/kart-3d`, `kart-2d`, `input-lab` | Per-game phone UI. Each exports `start(container, send, leave)`, `showView(view, player)`, `stop()`. |

### `test/` and `tools/`
- `test/unit/` (96 files): Node's built-in test runner on the DOM-free rules (physics, tracks, CPU, items, kit layout, input modules, rooms...).
- `test/server/`: integration tests against the real server (relay, reconnect, https, static files).
- `test/browser/`: Playwright tests on real host and phone pages, named by milestone (`m5b`, `m7c`...). The host draws on a canvas, so they read screenshots.
- `test/helpers/`: `startServer`, socket client, touch simulation, 3D host waits.
- `tools/`: `kit-shots.js`, `course-previews.js`, `load-shot.js`, `machine-slots.js`.

## Design rules to respect when building on it

These come from `CLAUDE.md`; breaking them tends to break the Termux/Android deployment target or the tests.

1. No build step or bundler. ES modules directly; libraries vendored under `host/vendor/`.
2. Keep the server dumb. New game logic goes on the host.
3. Add new message types in `shared/protocol.js` first, with a comment on sender and payload.
4. Browser code uses absolute imports (`/shared/...`). Anything unit-tested in Node uses relative imports.
5. A new game is `host/games/<id>/` plus `controller/games/<id>/` plus one entry in `host/games/index.js`. Keep rules DOM-free and put them in `step()`.
6. Server dependencies: `ws` only, pure JS. No sound files (synth it). No service worker.
7. Small files (<~200 lines), a header comment on every file saying what it is for and who uses it.
8. Commit, never push (the author's rule); tests must keep passing.

## Notes and gotchas

- The code names the "reference game" generically on purpose (the 3D race copies a well-known console kart racer's feel). It is the author's private project; the repo has no licence file, so check before you publish or redistribute anything built from it.
- The `.claude/` workflow expects Claude to plan then spawn worktree subagents. You can ignore it or delete it if you want a different workflow.
- Easiest first extension: copy `host/games/input-lab` or `kart-2d` as a template for a new game; the module interface in `plan.md` is the contract.
