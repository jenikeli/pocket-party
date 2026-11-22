# Temple Chase (`temple-run`): plan

A fourth game for the picker. 2-9 phones: **one chaser, everyone else runs**. Endless corridor, three lanes, speed climbs until every runner is out. Additive only: new folders plus one line in the registry and one constant in `shared/protocol.js`. Nothing existing is changed.

## What gets reused (no new mechanics)

| Need | Reused |
|---|---|
| Swipe up / down / left / right | `controller/inputs/swipe.js` as is (`{kind:'swipe', direction}`) |
| Ready, revive buttons | `INPUT_KINDS.CHOICE` (new names only: `TEMPLE_CHOICES`) |
| Phone screen follows host | `setControllerView` / `CONTROLLER_STATE`, loaded by `controller/game-screen.js` |
| Roster, colours, names, reconnect grace | `host/roster.js`, `host/room.js` (shell does it) |
| Frame loop, fixed 1/60 step | `host/game-runner.js` calls `step(dt)` / `render()` |
| Drawing | Phaser via `host/hand-driven-phaser.js` (same as 2D race) |
| Room open/closed | `setRoomOpen`: open in lobby, closed while running (rejoins still work) |

## Rules (host is the authority; all in DOM-free files, unit tested)

- **Lanes:** 0,1,2. Left/right moves one lane instantly (the screen eases it).
- **Jump** (swipe up, 0.7 s) clears *low* obstacles. **Slide** (swipe down, 0.6 s) clears *high* beams. A *wall* needs a lane change. Slide in the air cancels the jump.
- **Track:** rows every 14 units from a seeded hash of the row number, so it is infinite, identical on every call, and needs no stored state. Each row has at most one wall, so a passable lane always exists.
- **Hit:** stumble 1 s at 40% speed, then 1.2 s of immunity.
- **Speed:** base 14 u/s, +0.12 per second, cap 26. Chaser runs 5% faster, +25% when more than 25 units behind the front runner. A runner more than 45 ahead of the chaser is slowed 20%, so the pack stays on screen.
- **Catch:** chaser in the same lane within 1.2 units puts a runner **down** and pauses the chaser 0.7 s.
- **Revive:** a down runner has 10 s. Any living runner taps "Revive <name>": the target returns 14 units ahead of the chaser with a 2.5 s shield, the reviver stumbles (costs them speed). No revive in time = **out**.
- **Round ends** when no runner is alive. Score is the farthest distance and time. It then returns to the lobby with the result shown; everyone taps Ready for the next round (new random chaser).
- **Leaving:** if the chaser leaves, a living runner is promoted. If no runners are left the round ends.

## Flow

```
lobby (Ready buttons, last result) -> all connected ready, 2+ players -> countdown 3 s -> run -> over -> lobby
```

## Screens

- **Host** (Phaser, 1920x1080): pseudo-3D three-lane road, obstacles, player figures with name labels, HUD (metres, runners left), big text for countdown and lobby. Camera follows the chaser. Lobby shows the player list with ready ticks and the previous result.
- **Phone:** full-height swipe pad (role tint: red chaser, gold runner), top line role and metres, centre message, one button strip below the pad (outside it, so a tap is never swallowed by the swipe capture): **Ready** in the lobby, **Revive <name>** during a run. A down runner sees the **revive screen**: "You're down", seconds left, a teammate can revive. Out players see "You're out".

## Files

```
shared/protocol.js                     + TEMPLE_CHOICES { READY, REVIVE }
host/games/index.js                    + registry entry
host/games/temple-run/track.js         endless obstacle rows
host/games/temple-run/rules.js         round state, step, actions, revive, catch
host/games/temple-run/views.js         what each phone is told
host/games/temple-run/renderer.js      Phaser drawing
host/games/temple-run/index.js         game module wiring
controller/games/temple-run/index.js   phone UI
controller/games/temple-run/style.css
assets/covers/temple-run.svg
test/unit/temple-run.test.js
```

## Known limits, deliberately left

- Swipe fires on finger lift (existing module), so it lags a flick by a few tens of ms. Trigger-on-move is a small change in `swipe.js` if it feels slow; it would affect the Input lab too.
- No sound, no tilt lanes, no coins or powerups, no server change.

## Version 2: 3D, corners, coins, powerups

- **3D with Three.js** (`renderer.js`, `world3d.js`, `people3d.js`): a curved stone corridor built in chunks, smooth capsule-and-sphere explorers with a run cycle, and a demon monkey chaser. All models and textures are drawn in code; nothing is loaded or extracted from any game. HUD, name labels and lobby text are HTML over the canvas.
- **Corners** (`track.js` corners, `path.js` geometry): every 110-170 units the corridor turns 90 degrees. Swipe toward the turn inside the window (16 before to 3 after) or crash (1.6 s stumble). Left/right outside a window changes lane. The phone shows a pulsing arrow.
- **Coins** are shared by the team. A revive costs 10 team coins.
- **Powerups:** magnet (8 s, pulls coins), shield (8 s, immune to hits, catches and crashes), boost (4 s, 1.5x speed and immune).
- **The monkey never overtakes a living runner** (it is held 1 unit behind the rearmost) and must rest 0.3 s between lane changes.
- Tune: numbers at the top of `rules.js`; corner window and spacing in `track.js`; camera in `renderer.js`.

## Version 3: settings page, lives, hazards, CPUs

- **Settings page** (the host lobby, `settings.js`, panel in `renderer.js`): runner lives (1/2/3/5), immune to obstacles, fire/gaps/falling tiles on or off, solo role, extra CPU runners, CPU skill. Click a button to step through its options; Start now, or everyone taps Ready. Phones do not change settings.
- **Lives:** a hit on an obstacle or a missed corner costs a runner a life; at zero the runner is out (game over for them). The monkey is never hurt. Immunity stops obstacle hits and life loss.
- **Hazards** (`track.js`, drawn in `world3d.js`): fire jets that flare on a cycle (red flicker warns), missing tiles (jump the gap), and falling tiles (shake when anyone is within 11 units, drop 0.5 s later, leaving a hole). Jumping clears all three.
- **CPUs** (`cpu.js`): alone, a CPU takes the other side (runner or monkey); extra CPU runners are optional. A CPU dodges, jumps, slides, turns, and the monkey hunts the rearmost runner. Skill sets how often it ignores an obstacle. CPU runners revive teammates. The round ends when every person running is out.

## Version 4: split screen, causeway, icons

- **Split screen** (`layout.js`, `split-views.js`): each person (up to 4, the room limit) gets their own view and camera, like the kart race: one fills the screen, two sit side by side, three put the third across the bottom, four make a grid. Each view has its own HUD (lives, team coins, metres, powerup, who is left, countdown or state, turn prompt) and name labels. A downed or finished runner's camera follows the monkey.
- **Causeway** (`world3d.js`, `path.js` `straightSegments`): you run on top of a stone wall with no walls beside it, only low curbs and posts, rising out of a jungle (canopy plane, instanced trees) under a sunset sky and haze. Corners are sharp right angles drawn as a square of stone; players still cut round a rounded arc inside it. Pulsing gold arrows on the ground say which way to turn.
- **Turns:** a swipe up to 9 units before the window opens is remembered and made when it opens; a turn in time gives 0.6 s of speed.
- **Icons** (`shared/temple-icons.js`, separate from `shared/icons.js` whose list a test pins): hearts, coin, magnet, shield, bolt, monkey, runner, cpu, arrows, turn arrows, skull. Used on the settings page, HUDs and phone.
- **Settings page:** a card per setting, one pill per option.
