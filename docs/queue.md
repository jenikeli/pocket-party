# M10b queue: each game runs its own lobby, and the icon UI

Asked for after M10's device run (2026-11-13 and 14). One queue, run to the end without the user in a fresh chat
(`milestone-plan` skill: "Queue" and "When the user is away"), one handoff and one device run at the end. Planned
2026-11-14.

## Status

| Task | What | Model | Depends on | Status |
|---|---|---|---|---|
| 0 | Main session: engine sounds removed; the shared icon set, confirm-by-colour and their CSS | | | queued |
| A | Host shell: the game picker (no room), a room per game, the top bar, join window, settings | opus | 0 | queued |
| B | Phone: no lobby page, the game's screen at once, icons, "The game ended" | sonnet | 0 | queued |
| C | Both races' lobbies and results on the host: shared player rows, Remove, icons, trims | sonnet | 0 | queued |
| D | Input lab on the host: always open, Remove by colour | sonnet | 0 | queued |
| T | Browser tests for the new flow (a browser-test task) | sonnet | A B C D | queued |
| Z | Main session: M10's device results recorded, full browser suite, docs, handoff | | all | queued |

Order: 0 by the main session first (it fixes the names the others build on). Then A, B and C together (no shared
files; checked pair by pair below), D when a place frees. T alone when A to D are merged and nothing draws. Then
Z. At most 3 subagents at once, reviewers included. Implementers commit early.

File ownership, checked for the tasks that run together: A owns `host/*.js`, `host/*.css`, `host/index.html`,
`host/games/index.js`, `shared/protocol.js`; B owns `controller/` (not `controller/games/input-lab/`); C owns
`host/kart/`, `host/games/kart-2d/`, `host/games/kart-3d/`; D owns `host/games/input-lab/` and `host/buttons.js`.
Task 0's files (`shared/icons.js`, `shared/confirm-click.js`, the icon and armed rules in `host/ui.css` and
`controller/style.css`, the sound files) are finished before the others start and are then read-only for them:
a task that needs another icon or class reports it, and the main session adds it.

## What the user decided

Mockup, version 3: https://claude.ai/artifact/7RzKR6aeL2Jopatrhh55SQ (its source, for every task that builds a
screen: `/home/ruijia/projects/pocket-party/test-results/reference/m10b/mockup.html`, ignored by git; the main
session copies it there in task 0). `CLAUDE.md`'s "UI design" section holds the rules; every task follows it.

- **The host page only picks a game.** After Tap to start comes the game picker: the games, how many play each,
  Play. No room exists there: no code, no players, nobody can join.
- **A room per game (option A).** Play loads the game, then creates its room. The back arrow closes the room at
  any time, mid-race included (two clicks), and returns to the picker; every phone goes back to its join page
  and scans again for the next game. A room and a game are the same thing, so "End game" and "Close room" become
  the one back arrow.
- **Joining is the big QR window in every game.** It opens by itself when a game's lobby opens, and from the
  add-players icon after that. No QR code anywhere else.
- **Each game handles its lobby.** The 2D and 3D races take players on their setup and results screens and are
  closed during a race, as today; the input lab is open for as long as it runs. Each lobby lets the host remove
  a player. Remove is not offered while a race runs.
- **Icons instead of words, colour as the confirmation** (`CLAUDE.md`, "UI design"): a destructive control turns
  red on the first click and acts on the second; a click anywhere else, or 3 seconds, disarms it.
- **No name change after joining:** the phone's lobby page goes, with Change name and "Also here". The name is
  set on the join page.
- **3D class buttons keep "cc"** (50cc, 100cc, 150cc, 200cc). The settings icon is a gear.
- **Engine sounds go**, in both races ("the only annoying sound").

## Rules for every task

- Read `CLAUDE.md` first, its "UI design" section above all; its rules hold. Docs (`plan.md`, `CLAUDE.md`,
  `docs/`) are the main session's: report what should change in them.
- Own only the files your task lists. If you need a change in another file, report it; do not make it.
- `npm test` must pass. Browser tests are run by the main session and by T only. Commit early and often.
- Every icon-only control has an `aria-label` and a `title` (the tests find controls by id and read these).
  Keep the ids the spec names; report any other id you rename or remove.
- Names from phones go in as text, never as HTML.
- Code your change leaves unused is deleted, not kept, and named in your report.
- If you meet something only the user can decide (a new dependency, logic in the server, a hard constraint, a
  write outside the project, a look the mockup does not settle), stop that part, finish the rest, and say so at
  the top of your report.

### Shared by every task (task 0 builds these first)

```
shared/icons.js          icon(name) -> an SVG string (viewBox 0 0 24 24, stroke currentColor, class "pp-icon").
                         Names: back, close, gear, add-players, user, check, stick, tilt, go-button, auto,
                         flag, tools, again, music, volume, clock, minus, plus, play.
shared/confirm-click.js  confirmOnSecondClick(button, onConfirm) -> { disarm() }. First click: class "armed"
                         (red). Second click: onConfirm(). A pointerdown anywhere outside the button, or 3 s,
                         disarms. No label change. (Moved from host/confirm-click.js; the phone's Leave uses it.)
CSS, same names on host (host/ui.css) and phone (controller/style.css):
  .pp-icon          the SVG, 1.25em square
  .pp-icon-button   a square button holding one icon (.pp-primary for the accent one, .armed turns it red)
```

A button's icon is set with `button.innerHTML = icon('gear')` on our own constant names only.

### Game module interface, as it changes (task A builds the shell's side)

```
registry entry: { id, title, minPlayers, maxPlayers, cover, background }      (blurb goes)
start({ container, players, setControllerView, removePlayer, pingPlayer, setRoomOpen })    (unchanged shape)
  The room is new and empty at start(): players is empty and fills as phones join. The shell has opened the
  room and set the server's player limit to maxPlayers before start(). A game closes the room for a race with
  setRoomOpen(false) and opens it again on its setup and results screens. removePlayer(playerId) is what a
  game's Remove control calls.
isDone() -> true still means "leave this game": the shell closes the room and shows the picker.
```

The shell's top bar over every game (`host/game-bar.js`): `#game-back-button` (left; two clicks; closes the room),
and on the right `#room-code-chip`, `#game-add-players-button` (both only while the room is open) and
`#settings-button`. Games keep the top corners clear: 5 em down from the top at the left and right edges.

`CONTROLLER_STATE` loses `others`; `CONTROLLER_SCREENS.LOBBY` goes (a phone in a room is always in a game).

## Tasks

### 0. Main session, first

- Engine sounds removed: the engine voices and `engineLevels` in `host/games/kart-2d/` and `kart-3d/`
  (`race-sounds.js`, `sound-cues.js`, the calls' `engines` option), `voice` in `host/audio/synth.js` if nothing
  else uses it, their unit tests.
- `shared/icons.js`, `shared/confirm-click.js` (with unit tests) and the CSS classes above; the host's users of
  the old `host/confirm-click.js` moved to the shared one without changing what they do yet.
- The mockup's source saved to `test-results/reference/m10b/mockup.html`.

### A. Host shell (opus)

**Goal:** the host page picks a game and nothing else; a game's room is created when the game has loaded and
closed when the host goes back.

**Files:** `host/index.html`, `host/main.js`, `host/lobby.js` (becomes `host/game-picker.js`), `host/lobby.css`
(becomes `host/game-picker.css`), `host/shell.css`, `host/ui.css` (only if a shell class is missing), `host/room.js`,
`host/roster.js`, `host/grace-periods.js`, `host/game-session.js`, `host/game-bar.js`, `host/join-window.js`,
`host/room-settings.js` (becomes `host/settings.js`), `host/lobby-players.js` (deleted, or kept only as the join
window's list), `host/lobby-rules.js`, `host/shell-sounds.js`, `host/connection-lost.js`, `host/tap-to-start.js`,
`host/games/index.js`, `shared/protocol.js`, their unit tests.

**Behaviour** (mockup screens 1, 2 and the top bars of 3 to 6):
- *Picker* (`#game-picker`): the chosen game's background and title, a player icon with its range ("1 to 4",
  from `minPlayers` and `maxPlayers`; a minimum of 0 reads as 1), `#play-button`; thumbnails `[data-game-id]`;
  `#settings-button` (gear) top right; `#picker-problem` says why the last game stopped (a load failure, a lost
  connection). The lobby tune plays. No socket is open.
- *Play:* the loading screen; `load(onProgress)`; then the room: a new `createRoom()` connects and sends
  `CREATE_ROOM`; on `ROOM_CREATED` the player limit is set to the game's `maxPlayers`, the game starts, and the
  join window opens. A failed load or a refused connection returns to the picker with the problem shown and no
  room left behind. One room object per game: nothing of the last game's roster survives.
- *Back* (`#game-back-button`, two clicks): the game stops, the room closes (the host's socket closes, so the
  server tells every phone `ROOM_CLOSED`), the picker shows. The same when `isDone()` turns true, when a game
  throws, and when the connection drops (then with the problem line).
- *Top bar:* as in the interface above; the room code chip and add players hide while a game has the room
  closed. The old bottom-right bar (`#end-game-button`, `#close-room-button`) goes.
- *Join window* (`#join-window`): the QR code, `#join-code`, `#join-url`, the players so far (dot and name), a
  close icon (`#join-close-button`); a click outside closes it too. No heading, no Done button. The LAN warning
  stays.
- *Settings* (`#settings`): three rows, each an icon and its control: music (`#music-volume`), effects
  (`#effects-volume`), the hold time for a dropped player (`#grace-minus`, `#grace-value`, `#grace-plus`; kept in
  the host's localStorage now, since no room outlives a game). Opened by the gear on the picker and in the top
  bar; a click outside closes it.
- *Sounds:* the join and leave blips play while a game's room is open; the picker keeps its click and Play sounds.
- Deleted: the lobby's player chips, its Add players and Close room buttons, `canPickGame`, the lobby's status
  line.

**Tests:** the picker's range text; the room is created only after the load (order of calls, with fakes); the
settings' stored hold time; the relay and protocol tests without `others`.

### B. Phone (sonnet)

**Goal:** a phone that joins lands on the game's screen; the lobby page goes; icons and colour as on the host.

**Files:** `controller/index.html`, `controller/style.css`, `controller/screens.css`, `controller/main.js`,
`controller/game-screen.js`, `controller/connection.js`, `controller/lobby-screen.js` (deleted),
`controller/kart/markup.js`, `controller/kart/setup-screen.js`, `controller/kart/setup.css`, their unit tests.

**Behaviour** (mockup section 7):
- *Join:* unchanged, with one new refusal shown plainly: a code for a room that does not exist reads "No game is
  open right now." (the server's `NO_SUCH_ROOM`).
- *After joining:* "Connected" until the first `CONTROLLER_STATE`, then the game's screen. The game screen's top
  line is the room code and a leave icon (`.leave-button`, two taps, turns red on the first).
- *When the room closes* (`ROOM_CLOSED`): "The game ended" and a button back to the join page, with the name
  kept and the room code cleared.
- *Kart setup:* the four choices as icons with a word under each (Stick, Tilt, Go button, Auto); the chosen one
  in the accent colour; Ready turns green with a tick once ready; "Turn your phone sideways when the race
  starts" goes. The ids and `data-value` attributes stay.
- No ready page, no Change name, no "Also here": their code and ids are deleted (`#lobby-screen`,
  `#player-label`, `#change-name-*`, `#lobby-others`).

### C. Both races' lobbies and results on the host (sonnet)

**Goal:** the races' setup and results screens as in mockup screens 3, 4 and 6: shared player rows with Remove,
icons, fewer words.

**Files:** `host/kart/player-rows.js` (new, shared by both races), `host/kart/panel-parts.js`,
`host/kart/setup.js` (the start rule), `host/games/kart-2d/` (`setup-panel.js`, `results-panel.js`,
`panel-parts.js`, `kart-2d.css`, `index.js`), `host/games/kart-3d/` (`setup-panel.js`, `setup-markup.js`,
`setup.css`, `results-panel.js`, `race-panels.css`, `items/item-settings-panel.js`, `index.js` for the calls),
their unit tests.

**Behaviour:**
- *Player rows* (`createPlayerRows(list, { onRemove })` -> `{ show(rows) }`, rows from `setupRows`): colour dot,
  name, the steering and accelerate icons, a green edge and tick when ready, dimmed with a clock and the time
  left when away, and a close icon that removes on the second click (`[data-remove-player]`; calls the shell's
  `removePlayer`). Rows are updated in place.
- *2D setup:* the title, laps as a flag icon with minus and plus (`#kart-2d-laps-minus`, `-plus`), the rows, the
  line that says why Start race is off, `#kart-2d-start-button`. The race needs 2 players: the rule moves from
  the lobby into the race's own start rule ("Needs 2 players").
- *3D setup:* the course's name large and the three course pictures without captions; the card: laps (flag, minus,
  plus), class (`50cc` to `200cc`), CPU, the items as one on/off icon each (the separate On switch goes; all off
  is items off), the rows, Start race. `#kart-3d-tools-button` becomes the tools icon. Gone: the "Kart race 3D"
  line, the blurb, the "Race" and "Players" headings, the setup's own Back to lobby button (the shell's back
  arrow does it). The top corners stay clear for the shell's bar.
- *Results, both races:* the standings and Race again (the again icon and its words); the Back to lobby buttons
  go.
- Ids kept as the browser tests use them, except the ones named above as gone; list every one removed.

### D. Input lab on the host (sonnet)

**Files:** `host/games/input-lab/`, `host/buttons.js`.

- The lab opens the room at start and never closes it; a phone that joins gets a card at once.
- A card's Remove is a close mark that turns red on the first click and removes on the second, disarmed by a
  click elsewhere or 3 s (the canvas version of the shared rule; no "Sure?" text). Its own End or Close buttons,
  if any remain in the canvas, go: the shell's back arrow is the way out. The readouts keep their words.

### T. Browser tests (sonnet, a browser-test task, spawned alone)

**Files:** `test/helpers/browser.js`, `test/helpers/host-buttons.js`, `test/helpers/kart-3d-host.js`, every file in
`test/browser/`.

- Helpers: `openHost` taps Tap to start and waits for the picker; `startGame(hostPage, { gameId })` picks the
  game, clicks Play and returns the room code once the join window shows; phones join after that. Every file's
  opening lines follow.
- Replaced on purpose: the lobby's tests (chips, Play off with the reason, the join window on the lobby, Close
  room, Change name, "Also here") by: the picker has no room (no `CREATE_ROOM` before Play; a phone's join is
  refused with "No game is open right now."); Play creates the room after the load; the join window opens by
  itself in each game and closes on a click outside; the back arrow needs two clicks, disarms on a click
  elsewhere, and sends the phones to "The game ended"; a second game gets a new code; Remove on a setup row
  (2D and 3D) and on a lab card; the 2D race refuses to start with one player; every icon-only control has an
  `aria-label`.
- Still proved: grace period and rejoin within a game, a late joiner refused during a race and let in on setup
  and results, the fifth phone refused in 3D, the QR encodes the URL module by module, a game load failure, the
  turned controls.
- Runs the files it changes, one at a time, when nothing draws. Reports each file's counts and times.

### Z. The end (main session)

M10's device results into its notes (course load about 5 s for the airport and Seaside and under 2 s for the
test track, 50 fps and above with 4 views, the look, controls, shadows, music and courses fine, engines removed,
no zoom confirmed on Android; the iPhone still to check); the full browser suite; `plan.md` (the flow, the game
module interface, "Game settings", the M4 and M5a summaries), `CLAUDE.md` (protocol rules, the test map),
`docs/history.md`, `docs/unused.md`, the device run, and this file folded into the history and deleted.

## Decisions made during the run

(The main session logs here what it decided without the user, for the review at the end.)

## Parked for the user

(Tasks or parts stopped because only the user can decide. Each: what, why, what is needed to go on.)
