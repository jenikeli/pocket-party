# M10c: the UI fixes after M10b (queue)

The user's review of M10b (2026-11-14): the icon UI went too far. Words come back where an icon had to be
guessed, the covers are not cropped, the old join window returns, the 3D setup sits at the bottom, and the 3D
race gets a strip of buttons under the views. The approved mockup is `test-results/reference/m10c/mockup.html`
(ignored by git; open it in a browser, or read its markup: each `.stage` is one host screen in em of an 80 x 45
stage). Where this file and the mockup disagree, this file wins.

## Status

| Task | What | Status |
|---|---|---|
| 0 | icons, registry blurbs, `--pp-strip`, `formatGap`, CLAUDE.md's UI rules (main session) | merged |
| A | host shell | merged |
| B | 3D kart race | merged |
| C | player rows, 2D race, phone | merged |
| T | browser tests (alone, after A to C) | queued |
| Z | full browser suite, docs, handoff (main session) | queued |

A, B and C share no files and build at the same time. A is merged first (B uses its `bar`).

## Rules for every task

- Read `CLAUDE.md` first (its "UI design" section was rewritten by task 0). Stay inside your task's files. If you
  need a change in a file you do not own, say so in your report instead of making it.
- Keep every element id that exists now unless your task says otherwise: the browser tests find elements by id.
  List in your report every id, class used by tests, button text and aria-label you added, removed or changed.
- Icon-only controls keep `aria-label` and `title`. A control that now has words needs neither.
- Sizes on the host are in em of the 80 x 45 stage. Colours only from the tokens in `host/ui.css` and
  `controller/style.css`.
- Unit tests: add or change the ones your task names, and fix any that your change breaks on purpose (say which
  in the report). `npm test` must pass. Do not run browser tests.
- No new dependencies, nothing in `server/`, no writes outside the worktree.
- Commit message: `m10c task <letter>: <what it does>`, lowercase.

## What task 0 provides (already on main when you start)

- `shared/icons.js`: `gear` redrawn; new `leave` (a door with an arrow out).
- `host/games/index.js`: each registry entry has `blurb` again (one line about the game).
- `host/ui.css`: `--pp-strip: calc(4 * var(--pp-em))`, the height of the 3D race's strip.
- `host/kart/race-time.js`: `formatGap(finishTime, winnerTime)` -> `'+2.49'` (both in seconds; the difference of the two times as shown).

## Task A: the host shell

Files: `host/index.html`, `host/game-picker.js`, `host/game-picker.css`, `host/game-bar.js`, `host/top-bar.css`,
`host/shell.css`, `host/join-window.js`, `host/settings.js`, `host/game-session.js`, `host/main.js`,
`host/shell-rules.js`, `host/roster.js` (only if the join window's chips need it); unit tests
`test/unit/shell-rules.test.js` or the file that tests what you change.

1. **Game picker.** The cover boxes are 4:3, the shape the covers are drawn in (`assets/covers/*.svg`, 400 x 300),
   so no cover is cropped: tiles 13em wide, the picture 9.75em high (no `aspect-ratio`: the iPad's Safari may not
   have it). Under the title a line with the game's `blurb` (`#picker-game-blurb`), then the player range as
   now (the person icon and "1 to 4").
2. **Top bar.** `#game-back-button` becomes a `.pp-button` with the back icon and the words "Back to games"
   (same id, same two-click arming with the `armed` class). `#game-add-players-button` becomes a `.pp-button
   .pp-primary` with its icon and the words "Add players". The gear stays an icon. The room code chip is unchanged.
3. **Settings.** Each row has words in place of its icon: "Music", "Sound effects", "Hold a dropped player"
   (the minus, value and plus stay). Ids unchanged.
4. **The join window as it was before M10b** (`git show 472116f:host/index.html`, `472116f:host/join-window.js`,
   `472116f:host/shell.css`, `472116f:host/lobby-players.js` for the chips): the title "Join the party", the
   line "Scan the code, or open the link and type the room code", the code, the link, the players as chips with
   "back in 0:24" for a dropped one, and the big primary `#join-done-button` "Done". `#join-close-button` (the
   cross) is removed. A click outside the panel still closes it. It still opens by itself for a new room and
   from Add players. `lobby-players.js` is gone: put the chips' code where it fits (`join-window.js` if it stays
   under about 200 lines, else a new `host/join-players.js`).
5. **The bar can dock as a strip.** `game.start()` gets one more member, `bar`:
   - `bar.slot`: an empty element (`#bar-slot`) in the bar, right after the back button, where a game puts its
     own controls. The shell empties it when the game ends.
   - `bar.setDocked(docked)`: `true` makes the bar a strip along the bottom of the window (class `docked` on
     `#top-bar`): the full window width, `var(--pp-strip)` high, background `--pp-panel`, a `--pp-line` top
     border; in a row: the back button, the slot, then pushed to the right the room code, Add players and the
     gear. The strip's controls are sized in em of the stage like the rest. While docked the settings panel
     opens upward, above the gear, and the game's `container` ends above the strip (`bottom: var(--pp-strip)`),
     so a game's canvas is resized by its own ResizeObserver. `false` puts everything back at the top. The shell
     undocks when the game ends. A game that never calls it keeps the bar at the top.
   Write it into the comment of `host/game-session.js` where `start()` is called; plan.md's interface text is
   the main session's.

## Task B: the 3D kart race

Files: everything it needs in `host/games/kart-3d/` (`setup-markup.js`, `setup-panel.js`, `setup.css`,
`course-previews.js`, `race-bar.js`, `race-panels.css`, `results-panel.js`, `tuning-panel.js`, `views.js`,
`view-hud.js`, `frame-drawer.js`, `index.js`, `race-views.js`, `items/item-settings-panel.js`), their unit tests.
Not `host/kart/` (task C) and nothing of the shell (task A).

Interfaces it uses: `shell.bar.slot` and `shell.bar.setDocked(docked)` (task A, above; build against this text),
`formatGap` (task 0), `lapsStepperMarkup` (task C changes it to put a `span.kart-laps-label` "Laps" where the
flag icon was; your card just calls it as now, and may size `.k3d-card .kart-laps-label` in `setup.css`).

1. **Setup screen at the bottom** (mockup screen 3). The course block (name, description, course pictures) is
   anchored bottom left, the card bottom right (`bottom: 2.2em`), not hung from the top. Only the shell's bar is
   at the top.
   - The course's one-line description is back under its name (`#kart-3d-course-blurb`; the `blurb` texts are in
     `git show 472116f:host/games/kart-3d/course-previews.js`).
   - The course pictures are 16:9 (the previews are 1280 x 720), not cropped, each with its course's name under
     it.
   - The card's rows, each with a word: Laps (the stepper), Speed (the cc buttons, on their own row), CPU,
     Items. Then a "Players" heading, the rows, and while nobody has joined the line "Scan the code to join" in
     place of the rows. Then the status line and Start race.
   - `#kart-3d-tools-button` becomes a `.pp-button` that says "Display" (same id, same drawer, still under the
     gear, top right).
2. **The race's strip** (mockup screens 4 to 6). When a race starts (the karts go on the grid, Watch too) call
   `bar.setDocked(true)`; back on the setup screen, and while Measure runs, `bar.setDocked(false)`. Only on a
   change, like `syncRoomOpen`.
   - The race bar's three buttons go into `bar.slot`: "Setup" (`#kart-3d-setup-button`, was "Back to setup"),
     "Restart", "Tuning" (pressed while its popup is open). Hidden over the results, as now. After them in the
     slot, pushed to the right, the race clock (`#kart-3d-clock`), so it is off the views; it must not push the
     shell's own controls out of the strip. Take the controls out of the slot in `stop()`.
   - The views fill the canvas, which the shell now ends above the strip. No view's name or item frame makes room
     for a back arrow any more: remove `BACK_ARROW_CLEARANCE_EM`, `backArrowClearance` and the `--top-inset`
     handling in `views.js` and `view-hud.js`.
   - The countdown and the results are centred in the area above the strip, and the results panel never reaches
     under it.
3. **One Tuning popup** (mockup screen 5). It opens upward from the strip on the left, over the views (it does
   not shrink them), like the settings popup on the right. Its first section is "Stats": the readout's text
   (`#kart-3d-readout`), always in sight; the sliders and buttons scroll under it. The readout is no longer in
   the race bar. `#kart-3d-tuning-close` stays.
4. **Results** (mockup screen 6): a "Results" heading with, beside it, what was raced ("Seaside Skyway · 150cc ·
   3 laps", `#kart-3d-results-summary`); the winner's row larger with its place in the accent; each finished
   kart's gap to the winner (`formatGap`; none for the winner or a kart with no time); Race again across the
   panel's whole width.

## Task C: player rows, the 2D race, the phone

Files: `host/kart/player-rows.js`, `host/kart/panels.css`, `host/kart/setup-rows.js`, `host/kart/panel-parts.js`,
`host/games/kart-2d/setup-panel.js`, `results-panel.js`, its panels' CSS and `race-views.js`,
`controller/index.html`, `controller/main.js`, `controller/screens.css`, `controller/kart/markup.js`,
`controller/kart/setup-screen.js`, `controller/kart/setup.css`, their unit tests.

1. **Player rows** (both races): how a player drives is words, not two icons: "Tilt · Auto", "Stick · Go
   button" (`styleIcons` becomes a function returning the words; rename it). A ready row keeps its green edge and
   tick and adds the word "Ready". A dropped player reads "back in 0:24" (no clock icon). The remove cross is
   unchanged.
2. **`lapsStepperMarkup`**: the flag icon becomes `<span class="pp-muted kart-laps-label">Laps</span>`. The
   3D card (task B) uses it too.
3. **2D setup:** a "Players" heading over the rows, and "Scan the code to join" in place of the rows while
   nobody has joined (the same words as the 3D setup).
4. **2D results**, like the 3D ones: a "Results" heading with "3 laps" beside it, the winner's row larger with
   its place in the accent, each finished kart's gap to the winner (`formatGap`), Race again across the panel's
   whole width.
5. **Phone:** the Leave button's icon is `leave` (was `close`); same two taps. Under Ready on the setup screen
   the line "Turn your phone sideways when the race starts" is back (`#kart-turn-note`, as in
   `git show 472116f:controller/kart/markup.js`). When the phone cannot keep its screen awake (the wake lock is
   refused or missing, `shared/wake-lock.js`) the game screen shows one small muted line saying so
   (`#wake-note`: "This phone's screen may sleep"); nothing while the lock holds.

## Task T: the browser tests (spawned alone, after A to C are merged)

Files: `test/browser/*`, `test/helpers/*`. It may run browser files, one at a time.

- The join window is closed with `#join-done-button`; the cross is gone.
- The back button and Add players have words; the gear's and the leave icon's names are checked where the icons'
  names are checked now.
- The 3D race: the bar is docked during a race (the strip at the bottom, the race's buttons in `#bar-slot`,
  the views' canvas ends above it) and at the top on the setup screen; the view names sit at the top of every
  view again (the m7b tests that expected the first one below the back arrow); the readout is in the Tuning
  popup; the results have their heading, summary and gaps.
- New texts on the picker (blurb, "players"), the setup screens (Speed row, course descriptions and names,
  Players heading, "Scan the code to join"), the player rows (words, Ready, "back in"), the phone (the sideways
  line).
- Each merged task's report lists what it changed; the main session passes them on.
- Fix tests to follow behaviour that changed on purpose; where a test fails for another reason, report it
  instead of bending the test.

## Decisions made during the run

- The "Players" heading and "Scan the code to join" go on the 2D setup as well as the 3D one (flag I named the
  3D setup only), so both races' lobbies read the same.

## Parked for the user

(nothing)
