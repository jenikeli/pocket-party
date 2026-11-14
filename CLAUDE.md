# CLAUDE.md

Project context for Claude Code. Read this first every session, then `plan.md` (what the game is, the decisions, the game module interface, where things live, open issues). Read the other docs only when the work touches them:

- `docs/spike-findings.md`, `docs/input-findings.md`: tests on my real devices (HTTPS, latency, sockets when a screen locks, tilt). Measured facts that override general assumptions; single runs on a few devices.
- `docs/3d-findings.md`: what was measured and learned building the 3D race (what the iPad carries, what costs frame time, pitfalls, the feel).
- `docs/kart-reference.md`: the reference game's numbers and how its courses and objects look. Fan-wiki data, so measured findings win.

Docs are organised by topic and kept short: they hold what the code and the commits do not say. Milestone ids live in commit messages.

## What this is

A local-network racing party game in the style of console kart racers, with two games: Kartwheel (the 3D race) and Kartwheel Mini (the 2D one). The 3D race should look, feel and play as close to the reference console kart racer as we can make it. It is for my private use and never published, so copying the reference game's designs is fine; we build every model and texture ourselves rather than extracting files from the game. Phones are controllers, a larger screen is the host display that runs the game, and a small Node server serves files and relays messages. Everything is web tech. No app store, no native code.

## Supported devices

- **Controllers:** Android Chrome, and iOS Safari and Chrome (iPhone and iPad). Tap, swipe and tilt must work on all of them.
- **Host display:** any device with a modern browser (Windows, Mac, iPad/iOS, Android), in a plain tab or fullscreen. Its HTML screens are sized in `em` inside a 16:9 `.pp-stage` (`host/ui.css`, `host/stage.js`); the Phaser games design at 1920x1080 and scale with `FIT`.
- **Server:** development on my Linux home server; the target is a spare Android phone (not rooted) running Node in Termux, serving a hotspot every device joins. The same repo and `npm start` must work on both: nothing Linux-only or Android-only.

## Architecture (fixed unless I say otherwise)

```
[Controller phones] --ws/wss--> [Server: Node] <--ws/wss-- [Host display]
        ^                          |
        +---- http(s): controller page, host page, assets ----+
```

- **Server** (`server/`): serves static files and relays WebSocket messages between host and controllers. Manages rooms and the player-slot table (id, secret token, connected flag). NO game logic.
- **Host** (`host/`): owns all authoritative game state and logic, including physics. The shell (Tap to start, game picker, top bar, join window, settings, loading screen) is plain HTML and CSS in the "Night" look (`host/ui.css`); each game module brings its own renderer (Phaser, Three.js) and puts its HTML panels in its own `div.pp-stage`.
- **Controller** (`controller/`): plain HTML/JS, mobile-first, no framework. Joins with a room code, sends inputs, shows minimal UI.
- **Shared** (`shared/`): message types and constants. Single source of truth for the protocol.

## Hard constraints

1. **Tilt and Wake Lock need a secure context (HTTPS).** Measured: over plain HTTP, Android Chrome and iPad Safari expose no `DeviceOrientationEvent` and no Wake Lock at all; over HTTPS with a self-signed cert (click-through) both work. So the server serves HTTPS/WSS when `CERT_PATH` and `KEY_PATH` are set, plain HTTP/WS otherwise. The cert must list the server's IPs in `subjectAltName` and include `extendedKeyUsage=serverAuth` and `keyUsage=digitalSignature,keyEncipherment`, or iPhone Safari refuses the page (`docs/spike-findings.md`). In client code pick `ws` or `wss` from `location.protocol`; never mix an `https` page with `ws://`.
2. **No service worker** unless I ask. Rely on the HTTP cache plus versioned asset filenames.
3. **Server binds to `0.0.0.0`**, never `localhost`.
4. **Server must run on Android via Termux without root.** Dependencies minimal and pure JS (`ws` only; no optional native addons), Node built-ins wherever possible. Configure only through env vars (`PORT`, `CERT_PATH`, `KEY_PATH`, optional `HOST_IP`), ports 3000 or above, no hardcoded paths. No Docker or shell-specific scripts: `npm start` is the one entry point; dev-only features live behind `npm run dev`. On startup print every non-internal IPv4 address with its interface name. Node major pinned in `engines` and `.nvmrc`.
5. **The server stays dumb.** No game rules in `server/`. If a feature seems to need server-side logic, stop and ask me.
6. **No build step** for controller or host. ES modules loaded directly by the browser; libraries from local copies in `host/vendor/` (no CDN: the LAN may have no internet), Phaser only with the games that draw with it. If a bundler becomes necessary, ask first.
7. **Assets are served by the server,** with versioned filenames or `Cache-Control: no-cache`. In dev the server pushes `{type: "reload"}` to the host when files change.
8. **Audio:** every sound and tune is made in code with Web Audio (`host/audio/`); there are no audio files. If one is ever needed, MP3 or M4A (AAC), not Ogg. Audio needs a user gesture, so the host's "Tap to start" unlocks it.

## Input rules (controllers)

Three input types: **tap**, **swipe**, **tilt**, each a module under `controller/inputs/` with the same shape: `start()`, `stop()`, `onInput(callback)`.

- **All touch surfaces:** `touch-action: none`, `user-select: none`, block pull-to-refresh and pinch zoom, use `100dvh`, `pointer` events. On iOS Safari `touchstart` is not a user gesture for permission prompts; `touchend`/`click` is.
- **Tilt:** on iOS `DeviceOrientationEvent.requestPermission()` must be called from a user gesture (a visible "Enable tilt" button). Feature-detect with `typeof DeviceOrientationEvent.requestPermission === 'function'`. Include calibration (the current pose becomes zero), light smoothing, and throttle sending to about 30-60 Hz. Send small normalized values.
- **Latency:** every input message carries a timestamp.
- If an input type is unsupported or denied, the controller falls back to a tap/swipe equivalent and tells the host.

## Protocol rules

- All messages are JSON: `{ type: string, ...payload }`. Types live in `shared/protocol.js`. Add new types there first.
- On first join the server issues a random `playerId` and secret `token`, which the controller keeps in `localStorage`.
- Reconnect: `{type: "rejoin", roomCode, playerId, token}`; the server validates the token. Never accept a rejoin on `playerId` alone. The host holds the slot for a grace period (default 30 s, a host setting) and can remove a player at once.
- A room is one game: the host creates it (`CREATE_ROOM`) once the game has loaded and closes it by closing its socket when the game ends; the server then sends every phone `ROOM_CLOSED` ("The game ended"). A phone in a room is always on its game's screen; there is no lobby screen and no name change after joining.
- The host is the single authority on game state. Controllers send inputs, not state changes.
- Treat disconnects as normal. Mobile browsers suspend background tabs and sockets when the screen locks (measured: lost after 14-30 s in two cases, kept 90 s+ in another). After resuming, `ws.readyState` can read open on a dead socket, so on `visibilitychange` to visible send a ping and reconnect if no pong arrives within about 2 s. The controller shows "Reconnecting..." and rejoins by itself, with a "Tap to reconnect" fallback.

## Assets

- The room code is not shown before a game has loaded, so nobody joins a half-loaded game. Controllers need almost no assets and load instantly.
- Each game's code and assets are lazy-loaded on Play, behind the loading screen.
- Draw as much as possible procedurally. Otherwise small compressed images and atlases. Total payload under about 50 MB.
- `assets/manifest.json` lists every asset with a version or hash.

## Conventions

- JavaScript (ES modules), no TypeScript. Small single-purpose files, plain functions over class hierarchies.
- A game is a self-contained module in `host/games/<id>/` with a matching controller UI in `controller/games/<id>/`, implementing the "Game module interface" in `plan.md`. The shell never imports a game directly, only through the registry `host/games/index.js`.
- Keep game rules in plain functions that do not depend on Phaser, Three.js or the DOM, so they can be unit tested in Node.
- Comment the *why* for anything non-obvious, especially networking, reconnection and sensor logic.

## Readability (I must be able to read and change any file myself)

- Plain, obvious code over clever code. If a junior developer couldn't follow a function on first read, simplify it.
- Start every file with a one- or two-line comment saying what it is for and who uses it.
- Files under about 200 lines, functions under about 40. Split by responsibility, not arbitrarily.
- Descriptive names (`playerSlots`, `sendInput`); no abbreviations beyond common ones (`ws`, `id`, `dt`).
- No abstraction until it is needed in at least two real places. No speculative options or "for later" hooks.
- One way to do each thing: once a pattern exists, reuse it.
- Keep data flow traceable from `shared/protocol.js` to the code that sends and handles a message. No global event buses or hidden side effects.
- No dead code, commented-out code or leftover debug logging. Never swallow errors silently; log them with context.
- Don't rewrite or reformat code unrelated to the current task.

## UI design (every screen, host and phone)

Check every new or changed screen against these, and show me a mockup first when the change is more than a detail.

- **Clear before minimal.** A screen shows what is needed for the decision made on it, and says enough that nobody has to guess: a row of options has its word (Laps, Speed, CPU, Items), a list has its heading, a course or game has its one-line description. One main action per screen, in the accent colour; everything else is quiet. When unsure whether a word is needed, keep the word and flag it to me.
- **Hierarchy does the talking.** Size, weight, colour and position say what matters; the most important thing is the biggest.
- **Icons only where nobody would guess.** An icon alone is for the few controls everyone knows: the gear, the cross (remove a player), plus and minus, the phone's leave door. Everything else is words, or an icon with its words. Every icon-only control has an `aria-label` and a `title`. Icons are our own inline SVG in one set (`shared/icons.js`), drawn in `currentColor`; no emoji, icon font or image files.
- **Pictures are shown whole:** a cover or preview sits in a box of its own shape, never cropped.
- **Colour carries state,** with one meaning everywhere: accent = chosen or the main action, green = ready or fine, red = armed or destructive, muted = off or away. No colours outside the tokens (`host/ui.css`, `controller/style.css`).
- **A game's buttons do not lie on the game** where it can be helped: the 3D race docks the shell's bar as a strip under its views (`bar.setDocked`), and its popups open upward from the strip. Each game decides this for itself.
- **Confirming is a colour, not a question.** Anything that cannot be undone takes two clicks: the first arms the control (red), the second does it. A click elsewhere, or 3 seconds, disarms it (`shared/confirm-click.js`). No "Sure?" text, no dialogs.
- **Joining looks the same everywhere:** the join window ("Join the party", the big QR code, the room code, the link, the players so far, Done), opened by Add players.
- **Sizes for where it is read:** the host from across a room (big type, few things), the phone under a thumb (targets of 44 px or more, text fields at 16 px or more).

## How to work with me

- I'm building this partly to learn. When you make a non-obvious design decision (networking, state sync, reconnection, sensors), explain the mechanism briefly.
- Work in small steps. Finish one piece of work (a milestone), make sure it runs, then stop and tell me exactly how to test it on real devices.
- **One milestone per chat,** unless I ask for a queue (several milestones planned together as tasks in `docs/queue.md`, handed off once at the end). If a milestone is too big for one chat, say so and propose a split.
- **Hand off at the end of each milestone** with the `handoff` skill, because the next chat starts with no memory of this one.
- **Make anything to tune easy to find.** Every device-run step where I should tune something starts with a bold **Tune:** (the `device-run` skill).
- Before adding a dependency, say what it is and why the built-ins can't do it.
- **Never write outside the project directory without telling me and getting my approval first.** That covers installing anything (tools, a Node version, Playwright's browsers or system packages), registering MCP servers, and editing anything under `~`. Say what will be written and the exact paths, wait for my yes, and record what was approved in the handoff. What is already installed (nvm and Node, the Playwright browsers) is fine to keep. No asking needed for writes that happen by themselves: the session's scratchpad, the OS temp folder the project's tools and tests use, Claude Code's own memory and settings, and the caches npm, Playwright and the browsers fill while running the project's own commands.
- If a request conflicts with the hard constraints, flag it instead of working around it.
- **Commit, never push.** Commit each task as it is merged, each fix, and the handoff (messages in the repo's style: the milestone id, then what it does). Check `git status` first so nothing secret goes in.

## Workflow (Opus plans, subagents build in parallel)

The main session plans a milestone into tasks with fixed interfaces and I approve the plan once; `implementer` subagents build the tasks in their own git worktrees; a `reviewer` subagent reads each task's diff; the main session merges, runs the browser tests and hands off. The details live only in these files, which are edited in the same chat when we change how we work:
- `.claude/skills/milestone-plan/SKILL.md`: planning, building, reviewing, merging, queues
- `.claude/agents/implementer.md`, `.claude/agents/reviewer.md`: the rules each subagent follows
- `.claude/skills/handoff/SKILL.md`, `.claude/skills/device-run/SKILL.md`: the end of a milestone

## Commands

- `npm install` (on the Termux phone: `npm install --omit=dev`, which skips Playwright)
- `npm start`: the server on port 3000 (HTTPS if `CERT_PATH` and `KEY_PATH` are set; warns if the cert is expired or misses a current IP). Env vars: `PORT` (3000+), `CERT_PATH`, `KEY_PATH`, `HOST_IP`.
- `npm run dev`: like `npm start`, plus it watches `controller/`, `host/`, `shared/` and `assets/` and tells host pages to reload (restart it yourself after editing `server/`).
- `npm run gen-cert`: a self-signed cert for every current LAN IP plus 127.0.0.1 (needs `openssl`; Termux: `pkg install openssl-tool`), written to `CERT_PATH`/`KEY_PATH` or `certs/`. Rerun whenever the IP changes, then `CERT_PATH=certs/cert.pem KEY_PATH=certs/key.pem npm start`.
- `npm run check`: checks the Node version, env vars, cert files and port, then prints the reachable URLs.
- `npm test`: unit tests (`test/unit/`) and integration tests on the real server (`test/server/`). No browsers, about 25 s.
- `npm run test:browser`: the real host page (desktop Chromium) and controller page (emulated Pixel 7 in Chromium, iPhone 13 in WebKit) with Playwright; about 30 minutes with nothing else running. Chosen files: `node --test --test-timeout=60000 --test-concurrency=1 test/browser/<file>.test.js ...`. Screenshots land in `test-results/screenshots/`. Dev box only. One-time setup: `npx playwright install chromium webkit`, then `sudo env "PATH=$PATH" npx playwright install-deps chromium webkit`.
- Playwright MCP (`.mcp.json`, for Claude): `playwright` is a desktop Chromium for the host page, `playwright-phone` an emulated Pixel 7 for a controller (two browsers, because tabs of one share `localStorage`). Start `npm run dev` first, without the cert env vars (the MCP browser refuses a self-signed cert); screenshots land in `test-results/playwright-mcp/`.
- `npm run kit-shots -- [--bloom] [--name <sheet>] <pieces...>`: picture sheets of single kit pieces (the list is `host/kit-shots/pieces.js`), lit as in the race, at kart height and from above, into `test-results/review/<name>.png`. About 7 s a shot. By hand under `npm run dev`: `/host/kit-shots/index.html?piece=guardrail&view=near`.
- `npm run kit-shots -- --course <course id> [<s> ...]`: the whole dressed course, a near view and a view from above at each distance s, then an overview. About 2.5 minutes for four distances.
- `npm run course-previews`: saves each course's picture as `assets/kart-3d/previews/<course id>.jpg` for the 3D setup screen (about 5.5 minutes). Run it when a course's look changes, then update `assets/manifest.json`.

## Testing

Every behaviour that has been built must stay working. Automated tests are how we know.

- Each milestone adds tests for what it builds, in the same chat. It is not done until `npm test` and the browser tests picked below pass.
- Always `npm test`. Browser tests: only the files for the areas the change touched (plus new ones):

  | Area changed | Browser test files |
  |---|---|
  | 3D look (renderer, scenery and dressings, the kit, kart models, effects, quality, views, sun, Measure, course light, baked shade, items' looks) | `m7c`, `m7b`, `m7d2`, `m7d4b`, `m8`, `m9` |
  | 3D rules (kart physics, techniques, boosts, race, CPU drivers, tuning, `index.js` and its parts, setup screen, course loading, panels, sounds, item rules) | `m6b`, `m6c`, `m7a`, `m7b`, `m8`, `m9` |
  | Shared kart phone controls and setup (`controller/kart/`, `host/kart/`, `shared/item-icons.js`) | `m5b`, `m5c`, `m6b`, `m6c`, `m7a`, `m8`, `m10-turned-controls` |
  | 2D race | `m5b`, `m5c` |
  | Input lab and input modules | `m3`, `m10-turned-controls` (tilt.js) |
  | Sound and music | `m10-shell`, `m5b`, `m6b` (they only prove nothing throws) |

- The full browser suite only when shared code changed: `server/`, `shared/`, the host shell (`host/*.js`, `host/*.css`, `host/index.html`), the controller shell, `host/games/index.js`, or `test/helpers/`. Say in the handoff which browser files ran and why. If unsure which area a file belongs to, run the wider set.
- Browser test files run one at a time (`--test-concurrency=1`): the dev box is old and headless WebGL is drawn on the CPU. Only the main session runs them (implementers run `npm test` only), except a browser-test task spawned alone. They time out when kit-shots runs share the CPU.
- The 3D tests wait for the course to build after Start race, Watch or Measure (20-30 s, the page blocked): such a hook or test needs a timeout of `STARTING_TIMEOUT` or more (`test/helpers/kart-3d-host.js`). The 3D rules files use the plain course (`presetPlainCourse`); the look files draw everything and take 2-4 minutes each.
- `kit-shots` has no browser test: run it on a piece instead.
- If a change breaks an existing test, fix the code, not the test. Change a test only when the intended behaviour changed on purpose, and say so in the handoff.
- Tests use Node's built-in runner and live in `test/` (`unit/`, `server/`, `browser/`, `helpers/`). Test dependencies are dev-only and never needed by `npm start`. Start servers with `startServer()` and stop them in `t.after()` or `after()`. The host draws on a canvas, so browser tests read the screen by decoding screenshots (`test/helpers/screenshot-pixels.js`) and watch WebSocket frames.

### Still needs a real device

Automation cannot check these; a handoff lists only such checks for me:

- **Real touch:** multi-touch and iOS edge swipes stealing the touch (`pointercancel`).
- **Real Safari:** WebKit in Playwright has no iOS UI, viewport bars or real `100dvh` behaviour.
- **Secure context:** tests load from `127.0.0.1`, always secure, so they say nothing about HTTPS on the LAN, cert warnings, tilt permission or Wake Lock (headless browsers refuse the lock).
- **Sensors:** tilt has no source in a headless browser.
- **Network:** the hotspot, client isolation, Wi-Fi latency, and sockets dropping on a real screen lock, app switch or closed tab.
- **Scanning the QR** from across a room, and **how screens read** from there.
- **Frame rates and sound** on the real host, and **Termux** (`npm start` on the Android phone).

To test: run the server (laptop or Termux), open `/host` on the host device and `/` on the phones, all on the same Wi-Fi with no client isolation or on the phone's hotspot. Test every controller feature on BOTH an iPhone and an Android phone.
