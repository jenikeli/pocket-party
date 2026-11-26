# Historical: Saltline Split-Screen build brief

This is retained as a record of the earlier build request only. It is superseded by
the project-authored Breakwater shooter. Do not follow its instructions to load,
inspect, copy, or embed the standalone `saltline-fable-5.2` code. The current game
uses the local renderer and game modules under `host/games/fps/`; see
[`FPS-MULTIPLAYER-PROCEDURE.md`](../FPS-MULTIPLAYER-PROCEDURE.md).

## 1. Objective

Add a fifth-or-sixth game module, `fps` (title **Saltline**), to Pocket Party: a tactical 3D first-person shooter for **1 to 4 people on a shared big screen in split screen, each steering with their own phone**, with CPU bots filling teams. It combines two things:

1. **This engine** (Pocket Party): phones are controllers, the host browser runs everything, a small Node server relays messages.
2. **Saltline** (`saltline-fable-5.2/index.html`, a single-file Three.js shooter with procedural models, canvas textures, fog and rain, Web Audio sound, and "Gulls" and "Hounds" enemies). The standalone file is available in this repository. Preserve its three-relay co-op mission and look alongside the engine's existing PvP modes.

## 2. What this engine is (read before designing; these are fixed)

Read `CLAUDE.md`, `plan.md`, `docs/3d-findings.md`, `docs/input-findings.md`, `docs/arena-plan.md` (a recent game built the same way, a good template). The facts that shape everything:

- **Architecture:** `[phones] <-ws/wss-> [Node server] <-ws/wss-> [host display]`. The server only serves files and relays JSON messages (`server/relay.js`, `rooms.js`). **No game rules in `server/`**; if a feature seems to need one, stop and ask.
- **The host is the single authority.** All state, physics, hit detection and rules run in the host browser at a fixed 60 Hz step (`host/game-runner.js`, `fixed-step.js`), then `render(alpha)` draws. Phones send inputs, never state.
- **Game module interface** (`plan.md`): `host/games/fps/index.js` exports `createGame()` returning `{ load, start, onMessage, step, render, onPlayerLeft, isDone, stop }`; the phone side is `controller/games/fps/index.js` with `start(container, send)`, `showView(view)`, `stop()`. Register in `host/games/index.js` (one entry, `minPlayers: 1, maxPlayers: 4`).
- **Hard constraints:** no build step, ES modules loaded directly; libraries from local copies in `host/vendor/` (Three.js **0.186.1** is already there; no CDN, the LAN may be offline); every sound made in code with Web Audio (`host/audio/synth.js`, `instruments.js`, `music.js`), **no audio files**; assets lazy-loaded on Play, total under about 50 MB, listed in `assets/manifest.json` with sha256 and licence; HTTPS only matters for tilt and Wake Lock; Node pinned; dependencies only `ws`.
- **Conventions:** plain JavaScript, files under about 200 lines, functions under about 40, a header comment on every file, DOM-free rules in plain functions so they are unit tested in Node, no file names the reference games or their characters, protocol types added to `shared/protocol.js` first with comments, tunable numbers in one `tuning.js`.
- **Room:** at most 9 phones (`MAX_PLAYERS`), but a split screen holds 4. Each phone gets a private view from `setControllerView(playerId, view)`.
- **Measured host performance** (`docs/3d-findings.md`): the iPad host carried the kart race at 50 to 90 fps with 4 views; **pixels and passes cost, triangles barely**; bloom, shadows and pixel ratio are the expensive things; draw calls cost the laptop's CPU. Target **60 fps with 1 or 2 views and a steady 30 with 3 or 4**, the same bar the kart race set. Three quality levels like `host/games/kart-3d/quality.js`.

### Dropped from the earlier prompt, and why

| Earlier requirement | Decision |
|---|---|
| Client-side prediction and server reconciliation | Not needed. The host simulates and draws; a phone only sends inputs. The phone gives instant feel with local feedback (crosshair flash, vibration on Android, button press states), not with prediction. |
| Lag-compensated hit detection on the server | Not applicable. The host resolves a shot in its own step against its own state. Input latency phone to host is tens of milliseconds (`docs/input-findings.md`; re-measure with the Input lab). Timestamp every input message (existing rule) and apply it at the next step. |
| Server-side shared map module for raycasts | The map data and rules live in DOM-free host modules (testable in Node). Only what the phone needs to draw (a minimap outline, callout names) goes in `shared/`. |
| Downloading CC0 `.glb` map kits | Procedural first (as the kart race did). A vendored model is allowed only after asking, with licence, sha256 and size in `assets/manifest.json`, under the 50 MB budget. |
| Maps named after another game's maps | Keep the genre layouts (3-lane, mid, tunnels, elevated sniper window, two bombsites) but name and design everything originally. No `de_`-style names or labels anywhere in files. |
| "60+ FPS across multiple players" with unlimited players | 4 humans in split screen, bots fill the rest (up to 5v5 or 8 in FFA); extra phones are decided in section 9. |

## 3. Phase 1: discovery (do first, report in one page, then stop for answers)

1. Read the Saltline source and identify reusable presentation and gameplay: scene and fog presets, procedural textures, the container and prop builders, viewmodel meshes, tracer, muzzle flash and rain effects, synthesized sounds, relay objectives, and Gull and Hound enemies.
2. Read these existing pieces and note what to **reuse instead of rewriting**:
   - Split screen: `host/games/kart-3d/views.js`, `host/games/temple-run/layout.js` and `split-views.js` (1, 2, 3, 4 views; one fills the screen, two side by side, three put the third across the bottom, four a grid).
   - Rendering helpers: `host/games/kart-3d/quality.js`, `bloom.js`, `baked-shade.js`, `effects.js`, `course-loader.js` (nothing built until Start).
   - Procedural figures: `host/games/temple-run/people3d.js` (capsule and sphere characters with a run cycle) as the starting point for soldier avatars.
   - CPU: `host/games/temple-run/cpu.js` and `arena/cpu-driver.js` as patterns for bots (same input door as a human, never cheating).
   - Phone input: `controller/inputs/` (`drag.js`, `tap.js`, `swipe.js`, `tilt.js`, `button.js`, `throttle.js`), `controller/kart/floating-stick.js`, `turned-layout.js`, `steering.js` (the **portrait page with controls turned a quarter turn**, because a web page cannot lock orientation on iOS).
   - Shell and UI: `host/roster.js` (colours and names), `shared/confirm-click.js`, `shared/icons.js`, `host/ui.css` tokens (the "Night" look), `host/kart/panels.css` patterns.
   - Dev tools: the pattern of `tools/kit-shots.js` and `course-previews.js` for map previews.
3. Ask these questions **once, together**, then build without stopping (`.claude/skills/milestone-plan/SKILL.md`, step 7):
   1. Where is `index.html` (Saltline)?
   2. Ready to accept 4 players max in split screen, or should phones 5 to 9 join as spectators or as teammates sharing a screen?
   3. Hitscan only, or also bullet travel time for the sniper and grenades?
   4. Which modes are in v1: Team Deathmatch and Search and Defuse first, Free-For-All and the Gull and Hound hazard toggle after?
   5. How many maps in v1: one finished map first (Harbor), the others after?
   6. Does the phone get gyro aim (needs HTTPS) as an option, or touch aim only?

## 4. Architecture (fixed unless the user says otherwise)

```
host/games/fps/
  index.js            game module wiring only
  tuning.js           every number: movement, weapons, damage, timers, economy
  maps/index.js       registry; one data file per map (maps/harbor.js, ...)
  map-build.js        turns map data into collision boxes and (separately) Three.js InstancedMesh
  collision.js        capsule vs boxes, step-up, wall slide (DOM-free, tested)
  player.js           movement, stance, health, respawn (DOM-free)
  weapons.js          weapon table and firing, recoil, spread, reload (DOM-free)
  ballistics.js       hitscan, hitbox multipliers, penetration (DOM-free)
  grenades.js         frag, smoke, flash: arcs, bounces, effects (DOM-free)
  modes/tdm.js  modes/sad.js  modes/ffa.js   one file per mode (DOM-free)
  bots.js             CPU players using the same input door
  views.js            what each phone is told (private)
  renderer.js  viewport.js  viewmodel.js  avatars.js  effects.js  hud.js  scoreboard.js
  sounds.js  sound-cues.js        Web Audio, positional per viewport
controller/games/fps/
  index.js  setup-screen.js  play-screen.js  look-pad.js  buy-menu.js  style.css
shared/fps-protocol constants live in shared/protocol.js (added first, commented)
test/unit/fps-*.test.js
```

Rules for this layout: the **sim never touches Three.js or the DOM** so a whole match can run headless in Node for tests and bot-vs-bot checks (`tools/fps-sim.js`, like `tools/balance-sim.js`). **Reuse one fixed step** (60 Hz) for sim; draw interpolates. Keep each file near 200 lines, split by responsibility.

### Protocol (add to `shared/protocol.js` first)

Phones send small JSON through the existing `INPUT` message, each with `sentAt`:

- `{ kind: 'move', x, y }`: the stick, `-1..1`, sent on change at up to 30 Hz.
- `{ kind: 'look', dx, dy }`: **accumulated** aim delta since the last send, in screen-normalised units, sent at up to 60 Hz (coalesce on the phone with `createThrottle(16, ...)`; never drop the final delta).
- `{ kind: 'button', button, pressed }` (existing kind) for `fire`, `ads`, `jump`, `crouch`, `reload`, `grenade`, `use`, `swap`, `scores`, `buy`. Named in an `FPS_BUTTONS` constant.
- `{ kind: 'choice', choice, value }` (existing) for team, loadout, map vote, ready, sensitivity, handedness, gyro on or off: `FPS_CHOICES`.

The host sends each phone a **private view** (under about 700 bytes, at most 10 per second plus on change): `{ phase, hp, armor, weapon, mag, reserve, grenades, money, reloading, scoped, canUse, bombState, timers, teamScore, hitConfirm, damageDir, flashLevel, notice }`. Events a phone should feel immediately (`hitConfirm`, `damageDir`, `flashed`) carry a counter so a repeat is not missed, as `notice.n` does in `arena/views.js`.

## 5. Phone controller: layout, controls and UX (the part to get right)

The phone is held **sideways like a game controller**, but the page is laid out in portrait and the controls are drawn a quarter turn (reuse `controller/kart/turned-layout.js`; the touch maths for the turned axes is already solved in `kart/floating-stick.js` and `steering.js`). All surfaces: `touch-action: none`, `user-select: none`, block pull-to-refresh and pinch zoom, `100dvh`, pointer events with **one `pointerId` per touch zone** so two thumbs and a third finger never interfere. Targets 44 px or larger, the main ones 64 px or larger. Keep 24 px clear of the screen edges (iOS edge swipes steal touches).

### The layout (landscape view, thumbs at the bottom corners)

```
 +------------------------------------------------------------------------+
 | HP 100  Armor 50          [ M4 ]  28 / 120  [G 2]            $ 3200  ⚙ |  top strip, 40 px, read only, tap = nothing
 +------------------------------------------------------------------------+
 |                                                   [Scores]   [Buy]     |  small, top right, outside the look pad
 |   LEFT THUMB ZONE (0-38% width)         RIGHT THUMB ZONE (38-100%)     |
 |                                                                        |
 |       floating MOVE stick                  LOOK PAD: drag anywhere     |
 |       appears where the thumb lands        to aim, relative, no pointer|
 |                                                                        |
 |   [Crouch]                          [ADS]          [Reload]            |
 |   [Sprint lock]                  [Swap]                     ( FIRE )   |  FIRE 88 px, bottom right
 |                                                    [Grenade]  [Jump]   |
 +------------------------------------------------------------------------+
```

Specifics:

- **Move (left):** a floating stick in the whole left zone. Magnitude sets speed, so no sprint or walk buttons are needed: **under 45% pushed = silent walk (no footstep sound emitted), 45 to 90% = run, over 90% = sprint**; a small padlock above the stick holds sprint on (toggle). A thin ring shows the thresholds. Reuse `floating-stick.js`.
- **Look (right):** the whole right zone is a relative drag pad (finger movement rotates the view; it does not move a pointer). The **fire button is a separate element, but a thumb held on Fire can also slide to aim** (pointer capture stays on Fire and its moves are sent as `look`), so players can spray and steer with one thumb. Sensitivity (default 1.0, range 0.3 to 3), invert Y and **aim damping when scoped** live in a phone settings sheet (gear), kept in `localStorage`.
- **Fire:** hold to fire; tap for single shots on semi-auto weapons; **toggle "fire on ADS release" is off by default**. Haptic: `navigator.vibrate` on Android only; do nothing on iOS (no error).
- **ADS / scope:** a button left of Fire; tap toggles zoom (hold also works). The sniper cycles 1x, 2x, 4x on repeated taps. The scope overlay is drawn **on the host viewport**, not the phone.
- **Jump:** bottom right of Fire. **Crouch:** left, toggle on tap (a held-crouch option in settings). Both big enough to hit without looking.
- **Reload:** next to Fire; auto-reload at 0 mag. **Swap:** cycles primary, sidearm, knife; a **long press** opens a weapon wheel of the owned weapons and grenade types (one thumb, release to choose).
- **Grenade:** tap throws the selected grenade (full); **drag down then release is a short underhand lob** (the right-click behaviour of the earlier brief). A small badge shows the selected type; long press cycles frag, smoke, flash.
- **Use:** a context button that **appears over Fire's left** only when near the Uplink (plant or defuse, hold 3 s with a ring) or a door; it is hidden otherwise so nothing unused clutters the thumbs.
- **Scores and Buy:** small buttons top right, tap to show on the host viewport / open the buy sheet (below). Scores holds while pressed.
- **Gyro (optional, off by default):** `controller/inputs/tilt.js` adds fine aim on top of touch, with the existing calibration and the "Enable tilt" button rule (iOS needs a tap for the permission).
- **Left-handed:** one switch mirrors the layout (`direction: rtl` on the grid, as the kart controller does); Scores and Buy stay top right.
- **Private information lives here:** the phone shows health, ammo, money, the buy menu and the loadout; the host viewport shows the crosshair, killfeed, radar and scope. This keeps four people from reading each other's screens.

### Phone screens by phase

1. **Join and setup:** team (Vanguard or Syndicate; auto-balance), loadout (primary, sidearm, one grenade type) as three big pickers, handedness, a sensitivity slider with a **live test pad** that shows a crosshair moving, Ready. One main action per screen, in the accent colour.
2. **Buy (Search and Defuse, freeze time):** a 2-column grid of weapons with price, money at the top, tap to buy, tap again to sell back; **Rebuy last loadout** is the first button. Closes itself when the round starts.
3. **Play:** the layout above. Dead players see a **spectate card** (killer name, "Respawn in 3" or "Next round") and a button to cycle teammates; their controls are hidden so nothing pretends to work.
4. **Result and vote:** score, then three large map cards to vote on; tap one, tap again to confirm if it changes a vote (`confirm-click` rule is for irreversible actions only).
5. **Reconnect:** the existing "Reconnecting..." flow; a dropped player's soldier stands still with no input (as a dropped kart does) and a bot takes over after the grace time.

Always test on **both an iPhone and an Android phone**; list the checks only a real device can do (multi-touch with both thumbs and a third finger, edge swipes, Safari viewport bars, vibration, gyro permission, scan the QR from across the room).

## 6. The host screen (split screen) and HUD

- 1 to 4 viewports from the existing layouts. Each viewport draws: crosshair that expands with movement and recoil, hit markers (white body, red for a head, with a crisp sound), a small damage-direction arc, the scope overlay, the flash whiteout and ringing, a per-viewport **killfeed** (top right) and **radar** (bottom left, a circular minimap built from the map outline in `shared/`, showing teammates, the Uplink, and temporary red dots when an enemy fires a loud weapon). Scoreboard shows in the holder's viewport only.
- A thin shell-style strip carries the round timer, team scores and mode, in the "Night" look; popups open upward as the 3D race does (`bar.setDocked`).
- **Audio on a shared screen:** one mix. Footsteps and gunfire are positional **per nearest viewport**; keep the number of simultaneous cues capped (a rule `arena/sound-cues.js` already follows).

## 7. Mechanics (the earlier list, tightened; every number goes in `tuning.js`)

- **Movement:** acceleration, ground friction, limited air control; walk, run, sprint set by stick magnitude; crouch lowers the capsule and tightens spread; jump with step-up for stairs and curbs; capsule against boxes with smooth wall sliding. Footsteps emit only when running or sprinting.
- **Weapons (starting values, tune with the sim):**

  | Weapon | Role | Damage | Rate | Mag / reserve | Reload | Notes |
  |---|---|---|---|---|---|---|
  | Assault rifle | strong, hard to control | 40 | 600 rpm | 30 / 90 | 2.5 s | one headshot kills (40 x 2.5 = 100 HP); a learnable spray pattern |
  | Tactical carbine | fast, steady | 30 | 750 rpm | 30 / 120 | 2.0 s | lower recoil; two head hits |
  | Combat shotgun | close range | 9 x 8 pellets | 70 rpm | 8 / 32 | 0.5 s per shell | spread cone |
  | Sniper rifle | bolt action | 100 | 45 rpm | 5 / 20 | 3.0 s | one body shot kills at full health; scope 1x, 2x, 4x; large movement inaccuracy |
  | Sidearm | fast draw | 22 | 380 rpm | 15 / 60 | 1.6 s | |
  | Knife | speed | 40 / 100 back | 150 rpm | | | fastest movement |

  Hitbox multipliers: head 2.5, torso 1.0, limbs 0.75. **Penetration:** thin wood and sheet metal let a shot through at reduced damage with a different impact effect; concrete and containers stop it. Tracers, muzzle flash and shell ejection are pooled.
- **Grenades:** HE (arc, bounce, radial falloff), smoke (billboard cloud that blocks sight lines in `ballistics.js` and hides radar dots), flash (whiteout scaled by view angle and distance, ringing). One of each carried.
- **Modes (one file each, selected on the host setup screen):** Team Deathmatch (target score, 3 s respawn with spawn protection); **Search and Defuse** (rename the spike to **Uplink** from Saltline: freeze time with buy, attackers plant at Site A or B, 40 s timer, defenders defuse or eliminate; economy rewards); Free-For-All; optional **Gull and Hound** hazard toggle or wave defense, reusing Saltline's AI.
- **Bots:** fill empty seats; same input door as a human (they call `weapons.fire`, never edit state); nav from the map's callout and node graph; three skill levels reacting within 0.8 s, 0.5 s and 0.3 s.
- **Avatars:** team-coloured soldiers with aim pitch, crouch pose, held weapon, muzzle flash; built from the procedural figure code.

## 8. Maps

Maps are **data** in `maps/<id>.js`: blocks, ramps, stairs, props, spawn zones, sites, callouts, light and weather preset, and a nav graph. `map-build.js` produces the collision boxes (Node-testable) and the render batches separately.

- **Rendering efficiency:** `InstancedMesh` for repeated blocks and props; one merged mesh per static material; **cut the big meshes into cells of about 200 so a viewport skips what it cannot see** (measured free on the iPad, 2 ms saved on the laptop); one baked light and shade pass like `baked-shade.js`; **no per-viewport shadow maps for more than 2 views**; pool tracers, decals and particles; texture atlas of procedural canvas textures built once at load.
- **Build order:** one finished map first (Harbor), proven end to end on a phone, then the others reuse the same kit. Each map needs a picture for the setup screen made by a tool in the style of `course-previews.js`.
- The four maps (keep the layouts' intent, design them originally; sightlines, cover spacing, flank routes, verticality, a distinct atmosphere each):
  1. **Saltline Harbor:** rainy container terminal, stacked containers forming corridors and walk-through interiors, steel catwalks, two gantry cranes as sniper perches, forklift and crate clusters; Site A at the crane, Site B at the docked hull.
  2. **Dustline:** sandstone fortress; long lane with double doors and a sunken pit; mid doors with a cross-angle and an elevated catwalk; enclosed upper and lower tunnels into an asymmetric Site B.
  3. **Terracotta Plaza:** courtyards and colonnades; an elevated sniper window over mid, a connector staircase, a palace balcony over a ramp onto Site A; an apartment corridor over Site B and an underpass flank to mid.
  4. **Vertical Foundry:** three floors joined by wide stairwells, an atrium with bridges, skylight drop shafts, shootable wooden barricades and explosive barrels.

## 9. Open decision to settle in the question round

Phones 5 to 9 cannot have their own viewport (split screen holds 4). The recommended default: **4 playable seats; extra phones join as spectators with a free-cam on the big screen's corner picture**, or the room is capped at 4 by `maxPlayers: 4` in the registry (the server then refuses a fifth with ROOM_FULL). Say which.

## 10. Milestones (one per chat, each ends with tests green and a device-run list)

Each milestone owns its own files, so independent ones can run in parallel agents in separate worktrees (at most 3 at a time). The sim milestones are DOM-free and come first so the rules are proven before any 3D.

| Id | Goal | Done when |
|---|---|---|
| F0 | Skeleton | registry entry, empty module, phones join, setup screen (team, loadout, Ready), protocol constants, unit test of message shapes |
| F1 | Movement and collision | `collision.js`, `player.js`, stances, step-up, tests; flat test map; drawn with boxes |
| F2 | Phone controls | `look-pad`, floating stick, buttons, settings sheet, left-handed, throttled `look` and `move`; **a device run is the gate** because feel decides the game |
| F3 | Weapons and ballistics | `weapons.js`, `ballistics.js`, hitboxes, penetration, recoil patterns, tests; headless fire-fight in Node |
| F4 | Split-screen render | viewport layouts, first-person viewmodels, crosshair, hit markers, avatars, tracers and flashes |
| F5 | Harbor map | map data, builder, instancing and culling, light and weather, minimap outline, map picture |
| F6 | Modes and match flow | TDM, Search and Defuse with Uplink and economy, FFA, respawn, scoreboard, killfeed, radar |
| F7 | Grenades and utility | frag, smoke, flash with their effects and sounds |
| F8 | Bots and hazards | bot levels, Gulls and Hounds, bot-vs-bot match as a test |
| F9 | Sound and music | positional cues per viewport, capped, synthesized; tunes by phase |
| F10 | Other three maps and map vote | maps 2 to 4, vote screen on phones, seamless switch |
| F11 | Device run and tuning | iPad or laptop host, iPhone and Android phones, quality levels, frame times, `tuning.js` pass |

## 11. Verification (definition of done)

- `npm test` passes, with unit tests for collision, movement, every weapon, hitbox multipliers, penetration, grenades, each mode's win conditions, Uplink plant and defuse, bots always legal, and a replay of a fixed-seed match giving the same result.
- With the dev server running, **two or more browsers** (a host, phones emulated with the Playwright MCP, `.mcp.json`) join, pick teams and loadouts, move, crouch, jump, throw grenades, shoot each other with correct damage and killfeed, plant and defuse, and switch maps, with **zero console errors**.
- A recorded host frame-time report (Measure-style) at 1, 2 and 4 views on the iPad or laptop, against the 60 and 30 fps targets.
- A `docs/device-run.md` list of only the checks that need real devices.

## 12. How to work (from `CLAUDE.md`)

Explain non-obvious networking and input decisions briefly; small steps; one milestone per chat with a handoff; before adding any dependency say what and why; never write outside the project without approval; commit, never push; if a request conflicts with a hard constraint, flag it rather than working around it.
