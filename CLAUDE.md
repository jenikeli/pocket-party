# CLAUDE.md

Project context for Claude Code. Read this first every session, then read `plan.md` for the current milestone.

`docs/spike-findings.md` holds the results of tests I ran on my real devices before writing any game code (a throwaway `spike.js`), to check viability and pin down parameters: HTTPS requirements, latency, socket survival when the screen locks, tilt rates. Treat its numbers as measured facts that override general assumptions, and note that they come from single runs on a few devices.

## What this is

A local-network party game in the style of Mario Party. Phones are controllers, a larger screen is the host display that runs the game, and a small Node server serves files and relays messages. Everything is web tech. No app store, no native code.

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
- **Host** (`host/`): runs in the host device's browser. Owns all authoritative game state and game logic. Renders the game with Phaser 3.
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
- Reconnect: the controller sends `{type: "rejoin", playerId, token}`. The server validates the token. The host holds the slot for a generous grace period (default 2 minutes, configurable) before freeing it. A page cannot keep its own socket alive once the OS suspends it, so design for drops: when the controller tab becomes visible again it shows "Reconnecting..." and rejoins automatically, with a "Tap to reconnect" fallback. Never accept a rejoin on `playerId` alone.
- The host is the single authority on game state. Controllers send inputs, not state changes.
- Mobile browsers suspend background tabs and sockets when the screen locks. Treat disconnects as normal, not as errors. Measured: hidden pages lost their socket after about 14-30 s in two cases and kept it for 90 s+ in another. After resuming, `ws.readyState` can still read open on a dead socket, so on `visibilitychange` to visible, send a ping and reconnect if no pong arrives within about 2 seconds.

## Assets

- The host preloads everything needed for the lobby and the board before it creates a room. The room code is not shown until loading finishes, so nobody can join a half-loaded game. Controllers need almost no assets and load instantly.
- Minigame assets are lazy-loaded in the background while players are on the board. Before a minigame starts, the host confirms its assets are ready.
- Prefer sprite atlases, small compressed images, and short audio. Keep the total payload small (target under about 50 MB). Draw as much as possible procedurally (the board track is generated from math, not images).
- Keep an `assets/manifest.json` listing every asset with a version or hash.

## Conventions

- Language: JavaScript (ES modules), no TypeScript for now.
- Keep files small and single-purpose. Prefer plain functions over class hierarchies.
- Minigames are self-contained modules in `host/minigames/<name>/` with a matching controller UI in `controller/minigames/<name>/`, implementing the interface documented in `plan.md`.
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
- **Hand off at the end of each milestone,** because the next chat starts with no memory of this one: tick the finished checkboxes in `plan.md`, add a short "Notes" line under the milestone for any decision or deviation the next milestone needs to know, and update the Commands section below. Then give me a short walkthrough of what was built: the files added, what each does, and how one message flows through the system end to end.
- Before adding a dependency, say what it is and why the built-ins can't do it.
- If a request conflicts with the hard constraints above, flag it instead of working around it.
- Be precise. If you are unsure about something (an iOS Safari quirk, a Termux limitation, an HTTPS-on-LAN trick), say so and tell me how to verify it rather than guessing.

## Commands

(Update as the project grows.)

- `npm install`: install deps
- `npm start`: run the server on port 3000 (HTTPS if `CERT_PATH` and `KEY_PATH` are set). Env vars: `PORT` (3000+), `CERT_PATH`, `KEY_PATH`, `HOST_IP`.
- `npm run check`: check Node version, env vars, cert files and port, then print the reachable URLs
- `npm run dev`: like `npm start`, plus it watches `controller/`, `host/`, `shared/` and `assets/` and tells host pages to reload when a file changes (restart it yourself after editing `server/`)

## Testing on real devices

1. Run the server on the laptop (dev) or Termux (target).
2. Find its LAN IP.
3. Host device opens `/host`. Phones open `/` and enter the room code.
4. Everything must be on the same Wi-Fi with no client isolation, or all on one phone's hotspot.
5. Test every controller feature on BOTH an iPhone and an Android phone.
