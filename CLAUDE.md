# CLAUDE.md

Project context for Claude Code. Read this first every session, then read `plan.md` for the current milestone. `docs/history.md` holds the full notes of finished milestones; `plan.md` sums each up in a few lines. Do not read `docs/history.md` at the start of a chat: open the entry for a milestone only when working on what it built and its summary is not enough.

`docs/spike-findings.md` holds the results of tests I ran on my real devices before writing any game code (a throwaway `spike.js`), to check viability and pin down parameters: HTTPS requirements, latency, socket survival when the screen locks, tilt rates. Treat its numbers as measured facts that override general assumptions, and note that they come from single runs on a few devices.

## What this is

A local-network racing party game in the style of Mario Kart (a 2D race first, then a 3D one). The 3D race should look, feel and play as close to Mario Kart 8 Deluxe (Switch) as we can make it. It is for my private use and never published, so copying MK8DX's designs (karts, drivers, track pieces, look) is fine; we build every model and texture ourselves rather than extracting files from the game. `docs/mk8dx-reference.md` holds the researched numbers; they are fan-wiki data, so measured findings win where they disagree. Phones are controllers, a larger screen is the host display that runs the game, and a small Node server serves files and relays messages. Everything is web tech. No app store, no native code.

## Supported devices

- **Controllers:** Android Chrome, and iOS Safari and Chrome (iPhone and iPad), all verified in the spike. Tap, swipe, and tilt must work on all of them.
- **Host display:** any device with a modern browser: Windows, Mac, iPad/iOS, Android. The host page must be responsive (design at a logical 1920x1080 and scale to fit with Phaser's `FIT` scale mode and centering) and must work in a plain browser tab or fullscreen.
- **Server:** development runs on my Linux home server. The target is a spare Android phone (not rooted) running Node in Termux, serving a hotspot that every device joins. The same repo and `npm start` must work on both, so avoid anything Linux-only or Android-only.

## Architecture (fixed unless I say otherwise)

```
[Controller phones] --ws/wss--> [Server: Node] <--ws/wss-- [Host display]
        ^                          |
        +---- http(s): controller page, host page, assets ----+
```

- **Server** (`server/`): Node.js. Serves static files and relays WebSocket messages between host and controllers. Manages rooms and the player-slot table (id, secret token, connected flag). It contains NO game logic.
- **Host** (`host/`): runs in the host device's browser. Owns all authoritative game state and game logic, including physics. Renders the shell (lobby) with Phaser 3; each game module brings its own renderer (Phaser, Three.js, ...).
- **Controller** (`controller/`): plain HTML/JS, mobile-first, no framework. Joins with a room code, sends inputs, shows minimal UI for the current game state.
- **Shared** (`shared/`): message type definitions and constants used by all three. Single source of truth for the protocol.

## Hard constraints

1. **Tilt and Wake Lock need a secure context (HTTPS).** Per MDN, `DeviceOrientationEvent` and `requestPermission()` are secure-context only, and reports say iOS auto-declines the permission request on plain HTTP. Wake Lock is also secure-context only. So the server must support TLS: serve HTTPS/WSS when cert files are configured (`CERT_PATH`, `KEY_PATH`), plain HTTP/WS otherwise. Plain HTTP is fine for early development of tap and swipe only. Measured on my devices (see `docs/spike-findings.md`): over plain HTTP, Android Chrome and iPad Safari expose no `DeviceOrientationEvent` and no Wake Lock API at all; over HTTPS with a self-signed cert (click-through) both worked. The cert must list the server's IPs in `subjectAltName` and include `extendedKeyUsage=serverAuth` and `keyUsage=digitalSignature,keyEncipherment`; without those extensions iPhone Safari refused the page in the spike (exact command in `docs/spike-findings.md`). In client code, pick `ws` or `wss` from `location.protocol`. Never mix an `https` page with a `ws://` connection (browsers block it).
2. **Service workers are possible once HTTPS works**, but do NOT add one unless I ask. Rely on the normal HTTP cache plus versioned asset filenames.
3. **Server binds to `0.0.0.0`**, never `localhost`, so other devices can reach it.
4. **Server must run on Android via Termux without root.** Keep dependencies minimal and pure JS (`ws` only for sockets; do not install its optional native addons). Node built-ins wherever possible (`http`, `https`, `fs`). Configure only through env vars (`PORT`, `CERT_PATH`, `KEY_PATH`, optional `HOST_IP`), never hardcoded paths, and use ports 3000 or above. No Docker or shell-specific scripts: `npm start` is the one entry point. Dev-only features (file watching, reload push) live behind `npm run dev`. On startup, print every non-internal IPv4 address with its interface name (Node's `os.networkInterfaces()` works in Termux), since the phone can be on several networks at once. Pin the Node major version in `engines` and `.nvmrc`.
5. **The server stays dumb.** No game rules in `server/`. If a feature seems to need server-side logic, stop and ask me.
6. **No build step for controller or host unless there is a clear reason.** Prefer ES modules loaded directly by the browser. Load Phaser from a local copy in `host/vendor/` (no CDN, since the LAN may have no internet). If a bundler becomes necessary, ask first.
7. **Assets are served by the server.** Use content-hashed or versioned filenames, or `Cache-Control: no-cache` in dev. In dev, the server pushes `{type: "reload"}` over WS to the host when files change.
8. **Audio formats:** use MP3 or M4A (AAC). Do not rely on Ogg, which is not safe across Safari. Browsers require a user gesture before audio plays, so the host needs a "Tap to start" screen that unlocks audio.

## Input rules (controllers)

Three input types to support and compare: **tap**, **swipe**, **tilt**. Each lives in its own module under `controller/inputs/` with the same shape: `start()`, `stop()`, and an `onInput(callback)` hook.

- **All touch surfaces:** `touch-action: none`, `user-select: none`, block pull-to-refresh and pinch zoom, use `100dvh`. Use `pointer` events, not mouse events. Note that on iOS Safari `touchstart` does not count as a user gesture for permission prompts, but `touchend`/`click` does.
- **Tilt:** on iOS, `DeviceOrientationEvent.requestPermission()` must be called from a user gesture (a visible "Enable tilt" button). On Android Chrome the method is typically undefined and you can listen right away, but verify on the real device. Always feature-detect with `typeof DeviceOrientationEvent.requestPermission === 'function'`. Include a calibration step (the current pose becomes zero), light smoothing, and throttle sending to about 30-60 Hz. Send small normalized values, not raw event objects.
- **Latency:** every input message carries a timestamp. The input lab (see `plan.md`) must measure round-trip time.
- If an input type is unsupported or permission is denied, the controller falls back to a tap/swipe equivalent and tells the host.

## Protocol rules

- All messages are JSON: `{ type: string, ...payload }`. Types live in `shared/protocol.js`. Add new types there first.
- On first join, the server issues each controller a random `playerId` and secret `token`. The controller stores both in `localStorage`.
- Reconnect: the controller sends `{type: "rejoin", roomCode, playerId, token}`. The server validates the token. The host holds the slot for a grace period (default 30 seconds, set in the lobby) before freeing it, and can also remove a player at once. A page cannot keep its own socket alive once the OS suspends it, so design for drops: when the controller tab becomes visible again it shows "Reconnecting..." and rejoins automatically, with a "Tap to reconnect" fallback. Never accept a rejoin on `playerId` alone.
- The host is the single authority on game state. Controllers send inputs, not state changes.
- Mobile browsers suspend background tabs and sockets when the screen locks. Treat disconnects as normal, not as errors. Measured: hidden pages lost their socket after about 14-30 s in two cases and kept it for 90 s+ in another. After resuming, `ws.readyState` can still read open on a dead socket, so on `visibilitychange` to visible, send a ping and reconnect if no pong arrives within about 2 seconds.

## Assets

- The host preloads everything needed for the lobby before it creates a room. The room code is not shown until loading finishes, so nobody can join a half-loaded game. Controllers need almost no assets and load instantly.
- Each game's code and assets are lazy-loaded (the chosen game can start loading while players are in the lobby). Before a game starts, the host confirms its assets are ready.
- Prefer sprite atlases, small compressed images, and short audio. Keep the total payload small (target under about 50 MB). Draw as much as possible procedurally (the stadium track is generated from math, not images).
- Keep an `assets/manifest.json` listing every asset with a version or hash.

## Conventions

- Language: JavaScript (ES modules), no TypeScript for now.
- Keep files small and single-purpose. Prefer plain functions over class hierarchies.
- Games (the 2D and 3D kart races) are self-contained modules in `host/games/<id>/` with a matching controller UI in `controller/games/<id>/`, implementing the "Game module interface" in `plan.md`. The shell never imports a game directly, only through the registry `host/games/index.js`.
- Comment the *why* for anything non-obvious, especially networking, reconnection, and sensor logic.

## Readability (I must be able to read and change any file myself)

- Plain, obvious code over clever code. If a junior developer couldn't follow a function on first read, simplify it.
- Start every file with a one- or two-line comment saying what it is for and who uses it.
- Aim for files under about 200 lines and functions under about 40. If a file grows past that, split it by responsibility, not arbitrarily.
- Descriptive names (`playerSlots`, `sendInput`), no abbreviations beyond common ones (`ws`, `id`, `dt`).
- No abstraction until it is needed in at least two real places. No speculative options, plugin systems, or "for later" hooks.
- One way to do each thing. Once a pattern exists (how a module subscribes to messages, how a scene is structured, how an input module is shaped), reuse it instead of inventing a second one.
- Keep data flow traceable: a message should be easy to follow from `shared/protocol.js` to the code that sends it and the code that handles it. Avoid global event buses and hidden side effects.
- No dead code, commented-out code, or leftover debug logging. Never swallow errors silently; log them with context.
- Don't rewrite or reformat code unrelated to the current task.

## How to work with me

- I'm building this partly to learn. When you make a non-obvious design decision (networking, state sync, reconnection, sensors), explain the mechanism briefly: what actually happens and why, not just what to type.
- Work in small steps. Finish one milestone from `plan.md`, make sure it runs, then stop and tell me exactly how to test it on real devices.
- **One milestone per chat.** Each milestone is built in its own fresh chat session. Do not start the next milestone in the same chat, even if there is time left. If a milestone is too big for one chat, say so and propose how to split it.
- **Hand off at the end of each milestone** with the `handoff` skill (`.claude/skills/handoff/SKILL.md`), because the next chat starts with no memory of this one: `plan.md` and `docs/history.md` updated, the device-run procedure, the commits, and a walkthrough of what was built.
- **Make anything to tune easy to find.** Every step of a device run where I should tune something starts with a bold **Tune:** (the `device-run` skill).
- Before adding a dependency, say what it is and why the built-ins can't do it.
- If a request conflicts with the hard constraints above, flag it instead of working around it.
- **Commit, never push.** Commit each task as it is merged, each fix, and the handoff (messages in the repo's style: the milestone id, then what it does). Check `git status` first so nothing secret goes in. I review the commits and push them myself.

## Workflow (Opus plans, subagents build in parallel)

- **Plan:** the main session (Opus) plans each milestone into tasks that own separate files, with fixed interfaces between them, and I approve the plan once (the `milestone-plan` skill).
- **Build:** each task goes to an `implementer` subagent (`.claude/agents/implementer.md`) in its own git worktree, at most 3 at a time, on Sonnet (Haiku for mechanical work, Opus where building needs judgement; Fable is not available). Implementers run `npm test` only and commit on their own branch.
- **Integrate:** the main session reviews each task's diff, squash-merges it into `main`, runs the browser tests one file at a time, fixes what breaks, then hands off.
- The skills in `.claude/skills/` and the agent in `.claude/agents/` are the workflow's single source. When we change how we work, they are edited in the same chat, like any other file.
- Be precise. If you are unsure about something (an iOS Safari quirk, a Termux limitation, an HTTPS-on-LAN trick), say so and tell me how to verify it rather than guessing.

## Commands

(Update as the project grows.)

- `npm install`: install deps (on the Termux phone use `npm install --omit=dev`, which skips Playwright)
- `npm start`: run the server on port 3000 (HTTPS if `CERT_PATH` and `KEY_PATH` are set; warns if the cert is expired or misses a current IP). Env vars: `PORT` (3000+), `CERT_PATH`, `KEY_PATH`, `HOST_IP`.
- `npm run gen-cert`: make a self-signed cert for every current LAN IP plus 127.0.0.1 (needs `openssl`; Termux: `pkg install openssl-tool`). Writes to `CERT_PATH`/`KEY_PATH` if set, else `certs/`. Rerun whenever the IP changes (phone restart), then start with `CERT_PATH=certs/cert.pem KEY_PATH=certs/key.pem npm start`
- `npm run check`: check Node version, env vars, cert files (valid, matching key, covers the current IPs) and port, then print the reachable URLs
- `npm test`: unit tests (`test/unit/`) and integration tests that start the real server on a free port (`test/server/`). No browsers, under 10 s
- `npm run test:browser`: drives the real host page (desktop Chromium) and controller page (emulated Pixel 7 in Chromium, iPhone 13 in WebKit) with Playwright; screenshots land in `test-results/screenshots/` (gitignored). About 18 minutes (one M4 test waits out the 30 s grace period, the M5b test drives a 3-lap and a 1-lap race, the M5c test a 1-lap race, each 3D file takes 35-90 s and the M7d4b test about 160 s, as it runs the Measure tool through its first look and rebuilds the course twice; since M7d4b2 every 3D start bakes shade and takes the course's light, about 10 s more: Chromium draws WebGL on the CPU with Mesa's llvmpipe, set in `test/helpers/browser.js`, about 0.3-0.55 s a frame on the kit-dressed Seaside Skyway and 0.35 s on the Test track; M6b to M7b, M7d2 and M7d4b start the host at Medium quality, M7c runs High). Run chosen files with `node --test --test-timeout=60000 --test-concurrency=1 test/browser/m7c-kart-3d-look.test.js test/browser/m7b-kart-3d-race.test.js test/browser/m7d2-kart-3d-kit.test.js test/browser/m7d4b-kart-3d-measure.test.js` (which files: see Testing below). Dev box only. One-time setup: `npx playwright install chromium webkit`, then `sudo env "PATH=$PATH" npx playwright install-deps chromium webkit` (the `env` keeps nvm's `npx` on the PATH under sudo)
- Playwright MCP (`.mcp.json`, for Claude): two browsers driven by Playwright's own MCP server (`npx playwright mcp`, from the repo's Playwright, so no extra install): `playwright` is a desktop Chromium for the host page, with the browser tests' WebGL flags (`.claude/playwright-mcp.json`), and `playwright-phone` an emulated Pixel 7 for a controller. Two browsers because tabs of one share `localStorage`, where a phone keeps its player id and token. Start the server (`npm run dev`) first; screenshots land in `test-results/playwright-mcp/`
- `npm run dev`: like `npm start`, plus it watches `controller/`, `host/`, `shared/` and `assets/` and tells host pages to reload when a file changes (restart it yourself after editing `server/`)

## Testing

Every behaviour that has been built must stay working as the code changes. Automated tests are how we know.

- Each milestone adds automated tests for the behaviour it builds, in the same chat. A milestone is not done until `npm test` and the browser tests picked by the rule below pass.
- Which tests to run, while working and before handing off:
  - Always `npm test` (unit and server tests, under 10 s).
  - Browser tests: only the files for the areas the change touched (plus any new ones), from this map:

    | Area changed | Browser test files |
    |---|---|
    | 3D look (`renderer.js`, `scenery.js` and the courses' dressings, the kit (`kit/`), kart models, effects, quality, views, the sun and cells, the Measure tool, the course light, baked shade and photo asphalt) | `m7c`, `m7b`, `m7d2`, `m7d4b` |
    | 3D rules (kart physics, techniques, boosts, race, tuning, `index.js`, panels) | `m6b`, `m6c`, `m7a`, `m7b` |
    | Shared kart phone controls and setup (`controller/kart/`, `host/kart/`) | `m5b`, `m5c`, `m6b`, `m6c`, `m7a` |
    | 2D race (`host/games/kart-2d/`, `controller/games/kart-2d/`) | `m5b`, `m5c` |
    | Input lab and input modules (`host/games/input-lab/`, `controller/inputs/`) | `m3` |

  - The full browser suite only when shared code changed: `server/`, `shared/`, the host shell (`host/*.js`, `host/index.html`), the controller shell (`controller/*.js`, `controller/index.html`), `host/games/index.js`, or `test/helpers/`. Say in the handoff which browser files ran and why.
  - If unsure which area a file belongs to, run the wider set. Correctness comes before speed.
- Browser test files run one at a time (`--test-concurrency=1`) on purpose: the dev box is old and the WebGL tests are CPU-heavy. Do not run them in parallel, and only the main session runs them (implementers run `npm test` only).
- If a change breaks an existing test, fix the code, not the test. Change a test only when the intended behaviour changed on purpose, and say so in the handoff.
- Keep game rules in plain functions that do not depend on Phaser or the DOM, so they can be unit tested in Node.
- Tests use Node's built-in runner (`node --test`) and live in `test/`. Test dependencies are dev-only and must never be needed by `npm start`.
- Automation cannot check everything (real touch screens, tilt sensors, certificate warnings, sockets dropping when a phone locks, the hotspot). The handoff lists only those checks for me to do on real devices.
- Test layout: `test/unit/` (plain modules), `test/server/` (real server + `ws` clients), `test/browser/` (Playwright), shared helpers in `test/helpers/`. The host draws on a canvas, so browser tests read the screen by decoding screenshots (`test/helpers/screenshot-pixels.js`) and watch the page's WebSocket frames for protocol messages. Start servers with `startServer()` and stop them in `t.after()` or `after()`, so a failing assertion never leaves a server running and hangs the run.

### Still needs a real device (and why)

- **Real touch:** browser tests drag with mouse-generated pointer events. Real fingers, multi-touch, and iOS edge-swipe gestures stealing the touch (`pointercancel`) only happen on a phone.
- **Closing a tab shows "waiting to reconnect" at once:** a headless page close kills the socket by itself, so it cannot prove the controller's `pagehide` handler is needed or works. Real Chrome kept the socket open after the tab closed until the handler was added. (Since M4 a closed tab keeps its slot for the grace period, because a reload looks the same.)
- **Real Safari:** WebKit in Playwright is Safari's engine, not Safari itself (no iOS UI, no real viewport bars, no `100dvh` behaviour while the address bar animates).
- **Secure context and certificates:** tests load from `127.0.0.1`, which browsers always treat as a secure context, so they say nothing about HTTPS on the LAN, cert warnings, tilt permission or Wake Lock. Those need phones on the LAN IP.
- **Sensors:** tilt and shake (M3 on) have no real source in a headless browser.
- **Network:** hotspot reach, client isolation, Wi-Fi latency and jitter, and sockets dropping when a screen locks or the app is switched.
- **Scanning the QR:** tests prove the drawn QR encodes the right URL module by module, not that a phone camera reads it from across a room.
- **Termux:** the server running on the Android phone itself (`npm start` there).
- **Real drops and resumes:** tests fake a dead socket by routing it through Playwright and fire `visibilitychange` by hand. A real screen lock, app switch or Wi-Fi toggle, and how long the OS keeps the socket, only happen on a phone.
- **Wake Lock grants:** headless browsers refuse the lock (`NotAllowedError`), so only real devices show whether the host and phones actually stay awake.

## Testing on real devices

1. Run the server on the laptop (dev) or Termux (target).
2. Find its LAN IP.
3. Host device opens `/host`. Phones open `/` and enter the room code.
4. Everything must be on the same Wi-Fi with no client isolation, or all on one phone's hotspot.
5. Test every controller feature on BOTH an iPhone and an Android phone.
