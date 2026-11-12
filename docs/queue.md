# M10 queue: polish

One queue for all of M10 (`plan.md`), run to the end without the user (`milestone-plan` skill: "Queue" and "When
the user is away"). The user reviews once, at the end: one handoff, one device run. Planned 2026-11-12.

## Status

| Task | What | Model | Depends on | Status |
|---|---|---|---|---|
| A | Host shell in HTML: Tap to start, lobby, join window, room settings, loading screen, game session | opus | | built, in review (branch worktree-agent-adec756ef97806779, 7ae6f2a) |
| B | Phone shell: join and lobby screens, no ready, portrait, zoom stopped | sonnet | | merged |
| C | Kart phone screens: portrait setup, driving controls drawn sideways | opus | | merged |
| D | Game covers finished from the approved drafts, and the 2D lobby background | sonnet | | building |
| E | Course pictures: the tool and the saved previews | sonnet | | building |
| M | Seaside Skyway: floating islands and backdrop cliffs removed | sonnet | | queued |
| T1 | Browser tests for the new shell (m1, m3, m4, m5a, https) and the helpers every test uses | sonnet | A B C D | queued |
| H | 2D race: setup and results as HTML in the look | sonnet | A | queued |
| I | Audio core: unlock, volumes, synth helpers | sonnet | A | queued |
| F | 3D setup screen (full picture), course built after Start race, tools drawer | opus | A E T1 | queued |
| O | Kart shadows from one stand-in mesh per kart | sonnet | | queued |
| P | Bloom's clamp folded into its first pass | sonnet | | queued |
| N | Palm Bay Airport's leftovers | sonnet | M | queued |
| G | 3D race bar, countdown, results, tuning and measure panels in the look | sonnet | F | queued |
| J | 3D race sounds | opus | F I | queued |
| K | 2D race and shell sounds | sonnet | H I | queued |
| L | Music made in code, wired to the lobby and the races | opus | I J K | queued |
| Q | Kit maps drawn once per game (Seaside's load time) | sonnet | F M N | queued |
| R | Long files split | sonnet | F G J O Q | queued |
| T2 | Browser tests for the 2D and 3D setup screens and the loading (m5b to m9) | sonnet | F G H | queued |
| Z | Main session: previews re-shot, full browser suite, docs, handoff | | all | queued |

Order: A, B, C first. D, E, M take the free places. T1 runs when A to D are merged, with only H and I building
beside it (they do not draw). Then F, with O, P, N beside it (browser tests wait while they draw). Then G, J, K,
L, Q, R as their dependencies merge, T2, and Z. At most 3 subagents at once, reviewers included.

## What the user decided (2026-11-12)

Prototypes: https://claude.ai/artifact/G76NPbXkUDFcy1LSyzv4d5. Pictures of the chosen design, for every task that
builds a screen (ignored by git, so read them by these full paths, not from the worktree):
`/home/ruijia/projects/pocket-party/test-results/reference/m10/` holds `lobby.png`, `join-window.png`,
`setup-3d.png`, `tap-to-start.png`, `loading.png`, `phones.png`, `driving-controls.png`, and `prototype/index.html`
(the page they come from; its "Night" values are the tokens below).

- **Look:** Night: today's colours, tidied. System fonts, no font file.
- **Lobby:** the showcase. The chosen game's wide picture fills the screen, title and Play bottom left, the games
  as thumbnails bottom right. The thumbnails are cover art we design ourselves, not pictures from the game: the
  drafts the user saw are in `assets/covers/` (task D finishes them).
- **Joining:** an "Add players" button opens one big window with the QR code, the room code and the link, clicked
  away when everyone is in. No join panel on the lobby itself.
- **No ready step in the lobby.** Phones join, the host picks a game, the game's setup screen is where players get
  ready. The game is picked on the host screen only.
- **Late joiners:** the room is open on setup and results screens and closed only while a race runs.
- **Room settings:** "max players" is dropped (each game's own limit applies); the hold time for a dropped player
  stays, behind "Room settings".
- **The lobby is HTML and CSS**, not a Phaser canvas. Phaser stays for the 2D race and the input lab and loads
  only with them.
- **3D setup:** the full picture layout. Saved course pictures; the course is built only after Start race, behind
  a loading bar. Look, Measure and Watch sit behind "Display and tools".
- **Phone:** every screen in portrait. Driving controls keep today's block layout, drawn sideways on the portrait
  page; the phone is held with its top end to the left, for everyone.
- **Sound effects and music** are both made in code with Web Audio. Nothing is downloaded, no audio files. If
  either does not come out workable, it is dropped and said so at the end (the user: sound is not that important).
- **A player who drops mid-race:** as today (the kart coasts with no input). Nothing to build.
- **When a task needs the user:** it is parked and the run goes on (see "Parked for the user").

## Rules for every task

- Read `CLAUDE.md` first; its rules hold. Docs (`plan.md`, `CLAUDE.md`, `docs/`) are the main session's: report
  what should change in them instead of editing them.
- Own only the files your task lists. If you need a change in another file, report it; do not make it.
- `npm test` must pass. Browser tests are run by the main session and by T1 and T2 only.
- Keep the element ids and `data-` attributes the spec names: the browser tests find the screens by them. Report
  any other id you rename or remove.
- `assets/manifest.json` is the main session's: report each new asset (path, bytes, sha256, source, licence,
  usedBy) and it is added at the merge.
- Code your change leaves unused is deleted, not kept, and named in your report.
- If you meet something only the user can decide (a new dependency, logic in the server, a hard constraint, a
  write outside the project, or a look you cannot settle from the pictures), stop that part, finish what does not
  depend on it, and say so at the top of your report. Never work around it.

### The look, shared by every screen (tokens and classes)

Host pages get them from `host/ui.css` (task A), phone pages from `controller/style.css` (task B). Same names:

```
--pp-bg: #10131c;      --pp-panel: #1c2130;   --pp-panel-2: #2a3145;   --pp-line: #343d57;
--pp-ink: #ffffff;     --pp-muted: #9aa4bf;   --pp-accent: #f39c12;    --pp-accent-ink: #1c2130;
--pp-ok: #2ecc71;      --pp-danger: #8e2b22;  --pp-radius: 0.45em;
```

Host classes (`host/ui.css`): `.pp-stage` (below), `.pp-button` (neutral; `.pp-primary` for the one main action;
`aria-pressed="true"` shows the accent; `.pp-small`, `.pp-big`; `:disabled` dimmed; `.armed` uses `--pp-danger`),
`.pp-panel`, `.pp-chip` with `.pp-dot` (a player: colour dot and name), `.pp-title` (heavy, tight), `.pp-muted`,
`.pp-segment` (a row of buttons where one is pressed), `.pp-scrim` (the dark fade over a picture that keeps text
readable). Phone pages have `.pp-button`, `.pp-primary`, `.pp-panel`, `.pp-title`, `.pp-muted`, `.pp-segment`.

**Host sizes are in `em` inside a `.pp-stage`.** A `.pp-stage` is a 16:9 box centred on the screen whose
`font-size` is the custom property `--pp-em`, which `host/stage.js` (task A) keeps at 1/80 of the box's width (24
px on a 1920 x 1080 screen), on load and on resize. So one design fits every host screen, as Phaser's FIT did. A
game puts its HTML panels in its own `div.pp-stage` inside its container; its canvas stays full screen. No
container query units: the iPad's Safari may be too old for them.

### Game module interface, as it changes (task A builds the shell's side)

```
registry entry: { id, title, blurb, minPlayers, maxPlayers, cover, background }
  blurb: one line under the title. cover: '/assets/covers/<id>.svg'. background: a wide picture's path, or null.
load(onProgress)       onProgress(fraction 0..1) is optional to call; the shell shows its loading screen meanwhile.
start({ container, players, setControllerView, removePlayer, pingPlayer, setRoomOpen })
  setRoomOpen(open): the shell closes the room when a game starts and sets the server's player limit to the
  game's maxPlayers; a game opens the room on screens where a new player can come in (setup, results) and
  closes it for a race. While it is open the shell's game bar shows "Add players" (the join window).
  A new player just appears in `players`; the shell has already sent them the GAME screen.
```

`host/loading-screen.js` exports `showLoading({ title, picture })` (picture: a path or null), which returns
`{ setProgress(fraction, label), hide() }`. The shell uses it around `load()`; the 3D race uses it for its course.

`CONTROLLER_STATE` loses `ready`; `SET_READY` is removed; a roster player has no `ready`.

## Tasks

### A. Host shell in HTML (opus)

**Goal:** the host page without Phaser: a Tap to start screen, the showcase lobby, the join window, room settings,
the loading screen and the connection-lost screen, all HTML in the Night look, and the game session without a
shell canvas to put to sleep. The lobby has no ready step: a game can be picked whenever the player count fits.

**Files:** `host/index.html`, `host/main.js`, `host/ui.css` (new), `host/stage.js` (new), `host/tap-to-start.js`
(new), `host/lobby.js` (new; split it, for example `host/lobby-players.js`, if it passes 200 lines),
`host/join-window.js` (new), `host/room-settings.js` (new), `host/loading-screen.js` (new),
`host/connection-lost.js`, `host/game-session.js`, `host/game-bar.js`, `host/room.js`, `host/roster.js`,
`host/lobby-rules.js`, `host/qr-code.js`, `host/games/index.js`, `shared/protocol.js`, `server/relay.js` (only to
drop `SET_READY` from what it passes on), their unit and server tests. Deleted: `host/scenes/`, `host/join-panel.js`,
`host/lobby-player-list.js`, `host/settings-panel.js`. `host/buttons.js` stays (the 2D race and the input lab).

**Behaviour:**
- *Tap to start* (`#tap-to-start`): the first thing on the page, "Pocket Party" and one button. The tap asks for
  full screen where the browser has it (failure is fine: log it), retries the wake lock, then creates the room.
  Task I adds the audio unlock to the same tap.
- *Lobby* (`#lobby`, see `lobby.png`): players as chips top left (`#lobby-players`, each `[data-player-id]`; a
  dropped player dimmed with "back in 0:24"; a click arms "Remove?" and a second click within 3 s removes, as the
  confirm buttons do today). Top right: `#add-players-button`, `#room-settings-button`,
  `#lobby-close-room-button` (two clicks). Bottom left: the chosen game's title, blurb and `#play-button`; under
  them `#lobby-status` says why Play is off ("Kart race 2D needs at least 2 players", "Kart race 3D takes at most
  4 players") and `#lobby-problem` why the last game stopped. Bottom right: one thumbnail per game
  (`[data-game-id]`, its cover and title); a click chooses it. The chosen game's `background` fills the screen
  under a scrim (a plain dark gradient when it is null).
- *Rules* (`host/lobby-rules.js`): `canPickGame(players, game)` returns `{ ok, reason }` from the player count
  only (a dropped player keeps their place and does not block). `stepGraceSeconds` stays; the max-players
  functions and setting go. The room takes `MAX_PLAYERS` in the lobby.
- *Join window* (`#join-window`, see `join-window.png`): the QR code large (`#join-qr`), "Join the party",
  `#join-code`, `#join-url`, the players so far, `#join-done-button`; a click outside the panel closes it too. It
  opens by itself when the lobby first shows with nobody in the room, and from "Add players" in the lobby and in
  the game bar. The LAN warning the join panel has today ("Phones cannot reach localhost") moves into it. The room
  code must fit the panel at every screen size.
- *Room settings* (`#room-settings`): a small panel: the hold time for a dropped player (`#grace-minus`,
  `#grace-value`, `#grace-plus`). Task I adds the volumes.
- *Loading* (`#loading-screen`, `#loading-title`, `#loading-bar`; see `loading.png`): shown from Play until the
  game has started; the bar follows `load(onProgress)`, and creeps when a game reports nothing.
- *Game session:* on Play, close the room, set the player limit to the game's `maxPlayers`, show the game; back
  in the lobby, open the room and set the limit to `MAX_PLAYERS`. `setRoomOpen` as in the interface above. The
  game bar gains `#game-add-players-button`, shown only while the room is open.
- *Zoom:* the host page stops double-tap and pinch zoom (`touch-action: manipulation` at least).
- Every name from a phone goes in as text, never as HTML.

**Tests:** `lobby-rules` (canPickGame at each edge), `roster`, the relay test without `SET_READY`, the QR module
test still proving the URL module by module.

### B. Phone shell (sonnet)

**Goal:** the phone's join and lobby screens in the Night look, in portrait, with no ready button, and no zoom
anywhere on the phone.

**Files:** `controller/index.html`, `controller/style.css`, `controller/main.js`, `controller/lobby-screen.js`,
`controller/games/input-lab/style.css` (tokens only), their unit tests.

**Behaviour** (see `phones.png`, the first two):
- *Join:* room code first (filled in from the QR link), then the name, then Join. The device details list moves
  behind a small "Device details" toggle.
- *Lobby:* the player's colour and name large, "You are in. The game is picked on the big screen.", a "Change
  name" button (an inline field; sends `PLAYER_NAME`, saved as today), Leave at the bottom. No ready button, no
  `SET_READY`.
- *Portrait:* the join, lobby and reconnect screens are laid out for portrait and stay usable if the page is
  turned (they scroll; nothing is cut off).
- *Zoom:* a double tap or a pinch never zooms, on iPhone Safari too: `touch-action` on every screen, and the
  `dblclick` and `gesturestart` defaults stopped where CSS is not enough. Text fields stay at 16 px or more, or
  iOS zooms into them on focus.
- Keep the ids the tests use: `#join-form`, `#player-name`, `#room-code`, `#join-button`, `#join-status`,
  `#lobby-screen`, `#player-label`, `#game-screen`, `#game-container`, `#reconnect-overlay`, `#reconnect-button`,
  `.leave-button`.

### C. Kart phone screens (opus)

**Goal:** the kart races' phone screens in the look: the setup in portrait, and the driving controls drawn
sideways on a portrait page, so a player with rotation lock on just turns the phone.

**Files:** `controller/kart/` (all), `controller/games/kart-2d/`, `controller/games/kart-3d/`,
`controller/inputs/tilt.js`, `controller/inputs/drag.js` if it must change, their unit tests.

**Behaviour** (see `phones.png`, the third, and `driving-controls.png`):
- *Setup, portrait:* the race's line (the course name when the view has `courseName`, which task F adds for the
  3D race; laps; engine class), Steering (Stick, Tilt), Accelerate (Go button, Auto), a line "Turn your phone
  sideways when the race starts", and Ready large at the bottom.
- *Driving:* today's layout (stick or tilt panel left, place and lap in the middle, Item, Drift, Brake, Go
  right). When the page is in portrait it is drawn a quarter turn round, so it reads upright with the phone's top
  end in the left hand: the stick is then at the phone's top end, the buttons at its bottom end. When the page
  itself is in landscape (rotation lock off) it is drawn as today. The old "Turn your phone sideways" block that
  hid the controls in portrait goes; a page cannot tell how the phone is held without the motion sensor.
- *Stick:* steering must follow the thumb in the turned layout (left on the drawn stick is left).
- *Tilt:* with the page in portrait and the phone held top end left, tilt steers as it does today in landscape.
  `tilt.js` works from the screen's angle, which stays 0 under rotation lock, so it needs to be told how the phone
  is held; keep the input lab's use of it unchanged. Explain the mechanism in a comment.
- The view shapes from the host do not change, except the optional `courseName`.

**Tests:** the stick's mapping in both page orientations, tilt with the held angle set and unset.

### D. Game covers and the 2D lobby background (sonnet)

**Goal:** the lobby's three cover thumbnails are in `assets/covers/` as drafts the main session drew and the user
saw (`kart-3d.svg`, `kart-2d.svg`, `input-lab.svg`: flat shapes with dark outlines, like our item icons). Finish
them, and make the 2D race's wide lobby background.

**Files:** `assets/covers/*.svg`, `assets/covers/kart-2d-wide.jpg` (new).

- Changes the user asked for when they saw the drafts: (none recorded; the main session lists them here).
- Check each cover at thumbnail size (about 290 x 220) and at 4 times that in headless Chromium and WebKit: the
  lettering uses the system font, so make sure it sits right in both, and that nothing is cut off. Keep each file
  self-contained (no outside fonts or images) and under about 20 KB. No Nintendo names, characters or marks.
  Do not redesign them.
- `kart-2d-wide.jpg`: the 2D race's real track, 1280 x 720, quality about 80, shot from the running game with a
  scratch Playwright script (not committed). The 3D race's background is task E's airport preview; the input lab
  has none.
- Save a sheet of the three covers as `test-results/review/D-covers.png`.

### E. Course pictures (sonnet)

**Goal:** a saved picture of every 3D course, so the setup screen shows the courses without building them.

**Files:** `tools/course-previews.js` (new), `package.json` (the `course-previews` script),
`host/games/kart-3d/course-previews.js` (new), `host/kit-shots/` where the tool needs it,
`assets/kart-3d/previews/*.jpg` (new), unit tests.

- `npm run course-previews` builds each course in `COURSES` as kit-shots' `--course` does and saves
  `assets/kart-3d/previews/<course id>.jpg`: 1280 x 720, JPEG quality about 80, the near view at that course's `s`.
- `course-previews.js` exports `COURSE_PREVIEWS`, by course id: `{ picture, blurb, s }`. Blurbs: Palm Bay Airport
  "Apron, a tunnel under the runway, an anti-gravity ring, a glide over the bay"; Seaside Skyway "Bridges and
  decks high over the sea"; Test track "A plain loop for trying the handling". Pick each `s` for the picture that
  best sums up the course (try several, look at them).
- Tests: every course has an entry, and its picture exists.

### M. Seaside Skyway without the floating islands and cliffs (sonnet)

**Goal:** the floating islands and the backdrop cliffs go (they look bad and make no sense); mountains on the
horizon stay if they are there. Nothing is added.

**Files:** Seaside's dressing (`seaside-surroundings.js`, `seaside-landmarks.js`, `seaside-layout.js`,
`seaside-scenery.js`, `seaside-sky.js` as needed), kit pieces and `host/kit-shots/pieces.js` entries that nothing
uses afterwards (deleted), their unit tests.

- Before anything changes: `npm run kit-shots -- --course seaside-skyway --name M-before 300 900`; at the end the
  same with `--name M-after`. Report the triangle count and build time before and after if the code prints them.
- `addBoats` stays where it is: task N exports it.

### T1. Browser tests for the new shell (sonnet, a browser-test task)

**Goal:** the browser tests follow the new shell. Spawned when A, B, C and D are merged.

**Files:** `test/helpers/host-buttons.js`, `test/helpers/browser.js`, `test/browser/m1-flow.test.js`,
`m3-input-lab.test.js`, `m4-lobby.test.js`, `m5a-game-framework.test.js`, `https.test.js`; in every other browser
test file only the lines that open the host page or start a game from the lobby.

- A helper opens the host page and taps Tap to start; `startGame` picks a game by `[data-game-id]` and Play. The
  lobby is read from the page (ids in task A), not from screenshot pixels.
- Tests of the ready step are replaced by tests of what is there now: Play off with the reason shown when the
  count does not fit, the join window opening by itself and closing, a late joiner refused during a race and let
  in on a setup screen, the phone's lobby without a ready button, Change name. Everything else the old tests
  proved (grace period, remove, reconnect, close room, QR encodes the URL, game load failure) stays proved.
- May run the five files it owns, one at a time. Reports which other files it touched; the main session runs those.

### H. 2D race in the look (sonnet)

**Goal:** the 2D race's setup and results as HTML panels in the Night look (the track and karts stay Phaser).

**Files:** `host/games/kart-2d/setup-panel.js`, `results-panel.js`, `race-hud.js`, `index.js`, `renderer.js` as
needed, the 2D entries of `test/helpers/host-buttons.js` (selectors in place of coordinates), unit tests.

- Panels in a `div.pp-stage`. Setup: laps, the players with their control style and ready state, Start race
  (`#kart-2d-start-button`, `#kart-2d-laps-minus`, `#kart-2d-laps-plus`). Results: the standings, Race again
  (`#kart-2d-race-again-button`), Back to lobby (`#kart-2d-lobby-button`).
- The room is open on the setup and results screens (`setRoomOpen`), closed from Start race to the results.

### I. Audio core (sonnet)

**Goal:** one place for sound on the host: unlocked by Tap to start, two volumes, and small synth helpers the
games and the music share.

**Files:** `host/audio/audio.js`, `host/audio/synth.js` (new), `host/tap-to-start.js` and `host/room-settings.js`
(A's, after A is merged), unit tests.

- `audio.js`: `unlockAudio()` (from the Tap to start tap: creates and resumes the AudioContext),
  `audioContext()` (null before the unlock or where there is none), `effectsOutput()` and `musicOutput()` (the
  nodes that game sounds and the music connect to), `setVolume(kind, value)` and `getVolume(kind)` for `'music'`
  and `'effects'` (0 to 1, saved in the host's localStorage).
- `synth.js`: `tone(options)` and `noise(options)` (frequency or filter, length, envelope, slide), enough for
  beeps, sweeps and bursts. Only what tasks J, K and L need between them.
- Room settings: two volume sliders (`#music-volume`, `#effects-volume`).
- Everything is a no-op without Web Audio. Tests: the volume storage and clamping, as plain functions.

### F. 3D setup screen, and the course built after Start race (opus)

**Goal:** the 3D race's setup as in `setup-3d.png`: the chosen course's saved picture fills the screen, the
courses as small pictures, one card with the race's settings and the players; nothing is built until the race
starts, and then a loading bar shows the build.

**Files:** `host/games/kart-3d/index.js`, `panels.js` (split: `setup-panel.js` for the setup, `race-bar.js` for
what shows during a race), `renderer.js`, `overview-camera.js` (deleted if nothing else uses it),
`race-views.js` (`courseName` in the setup view), `items/item-settings-panel.js`, `test/helpers/kart-3d-host.js`,
unit tests.

- *Setup:* the picture and blurb from `COURSE_PREVIEWS` (task E). Left: "Kart race 3D", the course's name large,
  its blurb, the course pictures (`[data-course-id]`). Right, one card: Laps, Class, CPU, Items, then the players
  with control style and ready state, the status line, Start race. Top: Back to lobby, "Display and tools"
  (`#kart-3d-tools-button`), which opens a drawer (`#kart-3d-tools`) with Look, Measure and Watch. Ids kept:
  `#kart-3d-setup`, `#kart-3d-laps-minus`, `#kart-3d-laps-plus`, `#kart-3d-laps`, `[data-engine-class]`,
  `[data-cpu-level]`, `[data-quality]`, `#kart-3d-measure-button`, `[data-watch-views]`, `#kart-3d-rows`,
  `#kart-3d-status`, `#kart-3d-start-button`.
- *Building:* the renderer starts with no course. Start race, Watch and Measure build the chosen course if it is
  not the one already built, behind `showLoading` (title: the course's name; picture: its preview), in stages
  with a frame between them so the bar moves (scenery, baked shade, course light, shaders). A course built once
  is kept until another is chosen. The setup screen's slow flight round the course goes; nothing is drawn in 3D
  while the setup shows.
- The room is open on the setup and results screens, closed from Start race (or Watch) until the results.
- `plainCourse` and the quality preset keep working as the tests use them.

### O. Kart shadows from a stand-in (sonnet)

**Goal:** each kart's shadow comes from one simple mesh instead of the kart's 10 draw calls drawn again in every
view's shadow pass (M7d5's Measure: 17.5 ms a frame on the iPad with 4 views on High).

**Files:** `host/games/kart-3d/kart-models.js`, `karts/` as needed, unit tests. Not `renderer.js`.

- The kart's own meshes stop casting; one low-polygon stand-in per kart (body and driver in one geometry) casts
  and is not drawn in the colour pass. The shadow on the road should look as it does now from the chase camera.
- Measure before and after with the Measure tool's counts (draw calls and triangles for 4 views on High on
  Seaside Skyway); the frame times in software are only relative. Kit-shots or a scratch shot of a kart's shadow
  before and after.

### P. Bloom's clamp in its first pass (sonnet)

**Goal:** bloom went from 1.4 to 3.5 ms with 4 views after the flicker fix (M7d5); fold the clamp into bloom's
first pass so the extra pass goes. The look must not change.

**Files:** `host/games/kart-3d/bloom.js`, unit tests.

- `npm run kit-shots -- --bloom` on two glowing pieces before and after; report the pass count before and after.

### N. Palm Bay Airport's leftovers (sonnet)

**Goal:** M9's list: the plain grass south of the runway and in the start lobe's middle is dressed with pieces the
kit already has; the islands read larger from the glide; the boats rock through one `addBoats`, exported from
Seaside's file and used by both courses. The runway's west number stays as built.

**Files:** `airport-layout.js`, `airport-props.js`, `airport-landmarks.js`, `airport-scenery.js`,
`airport-ground.js`, the Seaside file that holds `addBoats`, unit tests (the kit layout checks).

- Course shots before and after: the runway's south side, the start lobe, and the view from the glide.
- No new kit pieces. Stay within M9's budgets (1.22 million triangles, 8.4 s to build in software): report both.

### G. The 3D race's other panels in the look (sonnet)

**Files:** `host/games/kart-3d/race-bar.js`, `results-panel.js`, `tuning-panel.js`, `measure-panel.js`, unit tests.

- The race bar, clock, countdown, results, tuning and measure panels use the tokens and classes, inside a
  `div.pp-stage` where they are panels (the per-view HUD stays as it is). Ids kept. The bottom right stays clear
  for the shell's game bar.

### J. 3D race sounds (opus)

**Goal:** the 3D race sounds like a kart race, all made in code.

**Files:** `host/games/kart-3d/sound-cues.js`, `race-sounds.js` (new), `index.js` (the calls), unit tests.

- `sound-cues.js`, plain functions: from the race state before and after a step, the cues that happened
  (countdown beeps and GO, rocket start or stall, drift start, each mini-turbo level reached, boost, hop, trick,
  glide start and landing, item picked up, each item used and hit, bump, wall, spin post, lap, final lap,
  finish), each with the kart it belongs to. Unit tested.
- `race-sounds.js` plays them through `effectsOutput()` and runs one engine voice per human kart (at most 4):
  pitch and loudness follow speed, with a different colour while boosting and while drifting. CPU karts make no
  engine sound. With several humans, each one's sounds are a little quieter so four do not clip.
- Nobody can listen during the run: describe each sound in a table in the report (what it is made of, how long),
  so the user can judge and name the ones to change. If the sounds cannot be made to work, say so plainly: they
  are then dropped, not replaced with files.

### K. 2D race and shell sounds (sonnet)

**Files:** `host/games/kart-2d/race-sounds.js` (new), `host/games/kart-2d/index.js`, `host/lobby.js` and
`host/join-window.js` (the calls), unit tests.

- 2D: countdown, engines (quieter, up to 9), finish. Shell: a blip when a player joins, another when one leaves,
  a click on choosing a game, a short rise on Play. The same table of sounds in the report.

### L. Music made in code (opus)

**Goal:** music for the lobby, the 2D race, each 3D course and the results, played by a small sequencer on Web
Audio. No audio files, nothing downloaded.

**Files:** `host/audio/music.js` (the sequencer), `host/audio/tunes/*.js` (one tune per file, as note data),
the calls in `host/lobby.js`, `host/games/kart-2d/index.js`, `host/games/kart-3d/index.js`, unit tests.

- `music.js`: `playTune(name)` loops that tune through `musicOutput()`, scheduled ahead on the audio clock so it
  keeps time when frames are slow; a new name fades over about half a second; `playTune(null)` stops. A few
  voices are enough: a lead, a bass, chords or an arpeggio, and drums from noise.
- Tunes, our own (no melodies from Mario Kart or any other game): `lobby` (light, unhurried), `kart-2d` (quick,
  arcade), one per 3D course by its id (the airport sunny and bouncy, Seaside breezy, the test track plain),
  `results` (a short fanfare, then a calm loop). Each loop 16 to 32 bars.
- The lobby plays `lobby`; a race plays its tune from GO, a little quieter than the effects, and the results play
  `results`.
- Nobody can listen during the run. Check what can be checked without ears: the notes stay in the tune's key and
  the bars add up (unit tests on the note data), and a scratch offline render (OfflineAudioContext in headless
  Chromium) shows no clipping and no silence. Describe each tune in the report (key, tempo, voices, mood).
- If it cannot be made to work, say so plainly in the report: music is then dropped, not replaced with files.

### Q. Kit maps drawn once per game (sonnet)

**Goal:** Seaside Skyway takes almost 7 s to appear on the iPad; M7d4d's note says drawing the kit's canvas maps
once per game instead of at every build would win most of it back. Read that note in `docs/history.md` first.

**Files:** `host/games/kart-3d/canvas-texture.js`, `kit/` where pieces make their maps, `scenery.js` (what a
world frees), unit tests.

- A second build of a course in the same game reuses the maps; they are freed when the game stops. Report the
  build time of Seaside before and after, first and second build.

### R. Long files split (sonnet)

**Files:** `kart-physics.js` (231 lines), `renderer.js`, `createRoadObjectDrawing` (one long closure),
`sticky-walls-look.js` (204), and any file this queue left over 200 lines.

- By responsibility, no behaviour change, exports and their users kept in step, every test still passing.

### T2. Browser tests for the setup screens (sonnet, a browser-test task)

**Files:** `test/browser/m5b` to `m9`, `test/helpers/kart-3d-host.js`, `test/helpers/host-buttons.js`.

- The tests follow the new 2D and 3D setup screens, the tools drawer and the loading. New checks: the setup
  shows a course's picture and builds nothing until Start race; the loading bar shows and goes; a phone that
  joins on the setup screen gets a kart, one that tries during the race is refused.
- Runs the files it changes, one at a time, when nothing draws.

### Z. The end (main session)

`npm run course-previews` again (M and N changed the courses), the manifest, the full browser suite, `plan.md`,
`CLAUDE.md` (the shell is HTML, the lobby flow, portrait phones, the commands and the test map),
`docs/unused.md`, `docs/history.md`, the device run, and this file folded into the history and deleted.

## Decisions made during the run

(The main session logs here what it decided without the user, for the review at the end.)

- D: no changes to the cover drafts were recorded when the user saw them, so D finishes them as drawn.
- B: the phone lobby's "Also here: ..." line in `phones.png` needs the other players' names in `CONTROLLER_STATE`
  (A's protocol). The main session adds it after A merges (`others: [names]`, sent by `host/room.js`, shown by
  `controller/lobby-screen.js`), as a small fix.
- B: `controller/no-zoom.js` added beside the spec's files (main.js was at 191 lines); accepted.
- C: tilt is recentred when the phase leaves the countdown (the phone is turned during it, so the first reading
  after the turn would be mid-turn). In portrait the turned controls cover the whole page, the shell's Leave
  included (reachable on the setup screen). `controller/kart/style.css` split into `setup.css`, `controls.css`,
  `buttons.css` (plan.md names the old file). Breaks `m5b`'s "Turn your phone sideways" test and `m6c`'s Drift
  colour check (now `--pp-panel-2`): T1/T2 fix them and add a portrait (turned) driving test.
- A: the registry's order is now kart-3d, kart-2d, input-lab (the 3D race is the lobby's default, as in
  `lobby.png`). `#join-url` shows the origin only (the QR holds the full link with the code). The room closes at
  Play, before the load, and reopens if the load fails. The join window closes when a game closes the room. The
  wake lock is first asked for in the Tap to start tap. The room is created only when the lobby's pictures are
  in (or failed). Host zoom: `touch-action: pan-x pan-y`, `user-scalable=no`, `gesturestart` stopped.
  `.pp-dot` takes its colour from `--pp-dot-color` (F and H need the name). Extra files beside the spec's:
  `host/shell.css`, `host/lobby.css`, `host/pictures.js`, `host/confirm-click.js`.
- Interrupted 2026-11-12 by the usage limit; resumed 2026-11-13: A's and D's implementers and C's reviewer were
  sent on from where they stopped (their worktrees held the work, nothing lost).

## Parked for the user

(Tasks or parts stopped because only the user can decide. Each: what, why, what is needed to go on.)
