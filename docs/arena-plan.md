# Spirefall (`arena`): a 1v1 tower-clash duel for Pocket Party

A fifth game for the picker. 1v1 or 2v2, each player on their own phone, fighting over one shared arena shown on the host display. Any empty seat is filled by a CPU, so one person can play alone. Cards are played with elixir, troops walk the lanes by themselves, towers fall, crowns decide the winner. The structure is the same as the reference game (a real-time card-and-tower battler); every character, number, name, picture and sound here is original and made in code.

This began as a plan and is now largely built (see Build status). It follows the shape of `docs/temple-run-plan.md`: what is reused, the rules, the screens, the files, the milestones. Starting numbers are guesses to be tuned (section 17); the structure is the part to review.

Convention check: `CLAUDE.md` forbids naming the reference game, its maker or its characters in any file, so this document and all code say "the reference game". The designs we copy (lanes, river, two bridges, three towers a side, elixir, a four-card hand with a cycle, a double-elixir finish, sudden-death overtime) stay; the names go.


## Build status

Built in this repository, by section: the rules (map, 24 cards with every trait, towers, spells, elixir, deck cycle, deploy zones, overtime, tiebreak, forfeit), the host module with setup, match, result and the two team panels, the phone setup screen (team, deck presets, a deck builder) and match screen (hand, elixir bar, deploy pad, emotes, Forfeit), the CPU at three levels, 1v1 and 2v2 seats, Watch mode, `npm run balance-sim`, and unit tests for all of it. The character art (papercraft puppets from SVG parts packed into one texture, `node tools/arena-art/generate.js` regenerates them), the painted arena and the sound and music (`sound-cues.js`, `sound-voices.js`, `sounds.js`, `host/audio/tunes/arena.js`) are built. The sound has never been listened to, and the art has not been reviewed at real size on a TV. Differences from the text below are marked in place.

Not built: the best-of-three, draft and themes extras (section 15), a handicap and time setting on the host, radar on the phone, the Hound's leap arc, the Brute's pulsing cracks, and the spell pictures in `effects.js` (their props are in the atlas).

---
---

## 1. The pitch in one screen

- **Host display (1920x1080):** a vertical diorama of a twilight meadow in the middle of the screen, Dawn court at the bottom, Dusk court at the top, a river across the middle with two wooden bridges, and a panel for each team on either side. Troops are little papercraft puppets. Towers wear lanterns.
- **Phone:** your private hand of four cards, your elixir, and a square deploy pad. Drag a card onto the pad; while your thumb is down, a **ghost of the troop appears on the big screen** where it would land, so you aim by looking up at the shared arena, not down at your phone. Let go to deploy.
- **A match:** 3 minutes, last minute at double elixir, then up to 2 minutes of sudden-death overtime. Most crowns wins; ties go to the lowest tower damage, then a draw.

The one thing this game does that the reference game cannot: **hidden hands in a shared room.** Each phone knows its own deck; the opponent only learns it card by card, as troops hit the field. The engine already supports exactly this through per-player `setControllerView`.

---

## 2. What the engine gives us, and what is new

| Need | Reused from Pocket Party |
|---|---|
| Up to four phones in one room, each with a secret token | `server/` rooms and slots, `SET_PLAYER_LIMIT` = 2 for 1v1, 4 for 2v2 (the engine allows up to 9) |
| Private per-player screen | `setControllerView(playerId, view)`, `CONTROLLER_STATE` |
| Authoritative rules on the host | host owns all state, runs at fixed 1/60 s via `host/game-runner.js` and `fixed-step.js` |
| Smooth drawing between steps | `render(alpha)` interpolation, as in `kart-sprite.js` |
| 2D renderer | Phaser through `host/hand-driven-phaser.js` (1920x1080, FIT), the same as the 2D race |
| Finger aiming at 30 Hz | `controller/inputs/drag.js` pattern and `createThrottle(33, send)` |
| Reconnect and grace timer | `host/grace-periods.js`, `REJOIN`, 30 s default |
| Room open or closed | `setRoomOpen(true)` on setup and results, `false` during a match |
| Sound and music | Web Audio synth in `host/audio/` (no audio files, as in the hard constraints) |
| Icons, confirm-click, Night look | `shared/icons.js`, `shared/confirm-click.js`, `host/ui.css` tokens |
| Dev tooling and tests | Playwright (already a devDependency), Node test runner, kit-shots-style tools |

New code, all additive: a game folder `host/games/arena/`, a phone folder `controller/games/arena/`, `ARENA_CHOICES` and one new input kind `PLACE` in `shared/protocol.js`, one registry entry, an art folder `assets/arena/`, tests, and two dev tools. No server change: the server already forwards `INPUT` and stays dumb. (Verify when building that `relay.js` does not whitelist input kinds; if it does, that is one added constant, not logic.)

Registry entry:

```js
Object.freeze({
  id: 'arena', title: 'Spirefall',
  blurb: '1v1 or 2v2. Play cards, push lanes, topple towers. CPUs fill empty seats.',
  minPlayers: 1, maxPlayers: 4,   // empty seats are CPUs
  cover: '/assets/covers/arena.svg', background: '/assets/covers/arena-wide.jpg',
})
```

---

## 3. The world and the look

### 3.1 The story, in four lines

Two lantern-courts share one meadow and argue over who lights it. **Dawn** keeps the sun-lamps, **Dusk** keeps the moon-lamps. Neither will share the river. The duel is the argument, settled with whatever creatures answer a summoner's call.

### 3.2 Art direction: "paper diorama at dusk"

A toy theatre, not a cartoon battlefield.

- **Papercraft puppets.** Every character is a stack of flat cut-out parts (body, head, two arms, a prop, feet) with a thin cream cut-edge and a soft contact shadow, hinged like a shadow-puppet. They bend, squash and swing; they never "tween a sprite sheet".
- **Three tones per shape** (light, base, shade) with one fixed light from the upper left, so 24 characters drawn separately still look like one cast.
- **Silhouette first.** Each card reads in a 40 px thumbnail by outline alone: tall, wide, round, spiky, winged.
- **Warm lamp light on cool dusk.** Everything the player can act on glows slightly warm; the world is cool.
- **Team, shape and colour together.** Dawn is gold with a sun-disc crest; Dusk is violet with a crescent crest. The crest is on every unit's base ring and every banner, so the teams stay readable for colour-blind players and on a dim TV.

### 3.3 Palette tokens

One file, `host/games/arena/palette.js`, and the same hex values in `controller/games/arena/style.css`. Nothing is coloured outside the tokens, matching the UI rule in `CLAUDE.md`.

| Token | Hex | Use |
|---|---|---|
| `ink` | `#1d1b2e` | outlines, text on light |
| `night` | `#10131c` | host and phone background (the shell's `--pp-bg`) |
| `panel` | `#1c2130` | panels (shell `--pp-panel`) |
| `dawn` | `#ffc53d` | Dawn court, own-side highlights |
| `dawn-deep` | `#c98a12` | Dawn shade tone |
| `dusk` | `#8e6bff` | Dusk court |
| `dusk-deep` | `#5a3fc4` | Dusk shade tone |
| `meadow` | `#5ba55b` / `#3f7f4a` / `#2c5e38` | grass light, base, shade |
| `path` | `#d9c08a` | lane stone, deploy highlights |
| `river` | `#3ba3d9`, foam `#beebff` | river body and moving foam lines |
| `plank` | `#9b6b3e`, `#6e4a29` | bridges |
| `cliff` | `#6c5b7b` | arena rim and rubble |
| `elixir` | `#e24bd0`, glow `#ff9af0` | elixir bar, spell cost drop |
| `ok` / `danger` | `#2ecc71` / `#e0483a` | healing, damage numbers, low tower HP |

Faction accents on costumes (never on bases, so they cannot be confused with the team):
Cinder `#e8552f`, Brook `#35b6c9`, Thorn `#5fae3b`, Cog `#9aa6b5`.

### 3.4 Arena themes (cosmetic only, same geometry)

The host picks one on the setup screen. They are a token swap plus a few extra props and a particle type.

| Theme | Meadow | River | Mood particles |
|---|---|---|---|
| Lantern Meadow (default) | greens above | water | fireflies |
| Frostmarsh | snow white, spruce | slow ice, steaming | drifting flakes |
| Emberquarry | basalt, glowing seams | lava, bright foam | rising embers |

### 3.5 Making the characters (no raw polygons)

The old games draw with Phaser rectangles. Spirefall draws real art, still made by us, still small.

**Source:** each character is a folder of small SVG part files with one `rig.json`:

```
assets/arena/parts/<card-id>/body.svg  head.svg  bodyBack.svg  headBack.svg  armBack.svg  armFront.svg  prop.svg  footA.svg  footB.svg
assets/arena/parts/<card-id>/rig.json   // pivots, draw order, part sizes, anchor of the prop, idle height
```

SVG is vector, authored by hand or generated by a small script, so a character is 6 to 10 files of 1 to 3 KB. Twenty-four cards plus towers, props and tiles come to roughly 400 KB, far under the 50 MB budget.

**At load time (`load()` behind the loading screen):** every part SVG is drawn once into one 2048x2048 canvas with simple shelf packing and registered as a single Phaser texture with named frames (`agent/<card>/<part>`). One texture means one draw call for all characters. Phaser's own SVG loader is not used per part, because it makes one texture per file and breaks batching. The packer is about 60 lines (`atlas.js`).

**Hand-drawn feel from parts, not frames:** the rig player (`puppet.js`) animates by driving each part's rotation, offset and squash from a few curves:

| Motion | How it is made |
|---|---|
| Idle | 1.2 s breathing: body scale 1.00 to 1.03, head lag 40 ms, prop sway 2 degrees |
| Walk | foot A and B alternate on a sine tied to speed (stride = 0.55 tile), body bob 3 px, lean 6 degrees into travel, shadow squeezes with the bob |
| Run (fast units) | stride shortens, bob rises to 5 px, lean 12 degrees, small dust puff every 4th footfall |
| Wind-up | prop and front arm pull back over 35 percent of the hit time, body squashes 6 percent |
| Strike | 90 ms lunge toward target (8 px), prop snaps through its arc, squash overshoots, hit spark at contact |
| Hit | 80 ms white flash (one tint), 3 px knock, floating number if over a threshold |
| Deploy | drops in from 80 px up onto a glowing summoning circle, lands with a squash, ring pulses once |
| Death | pop of scale 1.15, parts scatter 12 px and fade over 0.4 s, puff and 3 to 6 paper confetti in the team colour |
| Stun, slow, curse | status mark above the head, tint overlay, walk speed of the cycle slowed to match |

Facing in a vertical arena: Dawn troops walk up the screen and show their **back**, Dusk troops walk down and show their **front**. Only the body and head are drawn twice (front and back sets); arms, prop and feet are shared and mirrored. A unit moving sideways flips horizontally and uses whichever set matches its team's direction. A rig that turns to fight a target on the other side switches set at the half-way point of a 120 ms head turn. Depth sorting is by `y` (a unit lower on screen draws in front).

**Fallback if the puppet look proves too fiddly:** render each SVG rig to short frame strips with a dev tool (`tools/arena-bake.js`, Playwright, same pattern as `course-previews`) and commit the PNG atlas plus `manifest.json` entries. The unit and renderer interfaces do not change. This is a decision to take at milestone A5, not now.

### 3.6 Effects, cheaply

All from three generated textures (soft dot, star, ring) and Phaser emitters, plus `Graphics` only for spell radius rings.

- Spell flare: expanding ring, 24 sparks, 120 ms screen brighten at the centre.
- Tower fall: 5 chunks with gravity, dust column, the crown pennant drops, 150 ms render hit-stop (render only, the sim keeps its clock), small camera shake.
- King wake: shutters open, a horn note, a golden ring sweeps the arena.
- Damage numbers: only for hits above 8 percent of the target's max HP or on towers, so a swarm does not spam the screen.
- Caps for old iPads: 300 live particles, 80 live units, effects drop to half density if the frame time passes 24 ms.

---

## 4. The arena

Vertical, as in the reference game, drawn in the middle of the landscape host screen with a panel for each team on either side.

```
 1920 px
 ┌────────────────┬────────────────────┬────────────────┐
 │  Dawn panel    │  y 0   Dusk Keep   │  Dusk panel    │
 │  crowns        │  Dusk Wardens y 6.5│  crowns        │
 │  seats, names  │ ═══ bridges ═══════│  seats, names  │
 │  recent plays  │  river  y 15 to 17 │  emotes        │
 │  emotes        │ ═══ bridges ═══════│  timer         │
 │  timer         │  Dawn Wardens y25.5│                │
 │                │  y 32  Dawn Keep   │                │
 └────────────────┴────────────────────┴────────────────┘
   663 px           594 px (18 tiles)     663 px
   tile = 33 px, 32 tiles = 1056 px tall, centred in 1080
```

- **Tiles are 33 px.** The field is 18 x 32 tiles, 594 x 1056 px, centred with a 12 px margin top and bottom. The two 663 px side panels hold everything that is not the board, so the arena is never covered by HUD and the TV's empty sides do useful work.
- **Coordinates:** x 0 to 18 left to right, y 0 to 32 top to bottom. **Dusk** holds the top half, **Dawn** the bottom half. Dawn troops walk up the screen, Dusk troops walk down.
- **River:** y 15 to 17. Ground troops cannot enter it. **Bridges** are 3 tiles wide at x 2 to 5 and x 13 to 16 (centres 3.5 and 14.5). Flyers and the Cinder Hound's leap ignore the river.
- **Towers**, Dawn side (Dusk is the mirror, y becomes 32 minus y): **Wardens** 3x3 centred at (3.5, 25.5) and (14.5, 25.5), so each guards a bridge approach; **Keep** 4x4 centred at (9, 29.5).
- **Lanes:** left lane is x under 9, right lane is x 9 and over. A unit's lane is set where it lands. Its default goal is the nearest standing enemy tower of that lane; if that Warden is down, the Keep.
- **Deploy zones:** your team's half (Dawn y 17 to 32, Dusk y 0 to 15), minus tower footprints. **Pocket:** once an enemy Warden has fallen, its lane's half of the enemy side opens up to 6 tiles beyond the river (Dawn deploys y 9 to 17 on that lane, Dusk y 15 to 23). **Spells** go anywhere.
- **Look:** grey-stone lane paths worn into the meadow, lanterns on posts along both long edges, a low cliff and a crowd of small silhouettes beyond the top and bottom rims. The deploy zone gets a faint path-coloured tint only while a card is being dragged, on the host as well as the phone. Towers are drawn tall (they overlap the rows behind them, a quarter-view effect), troops are drawn from a slightly raised front-on view, and everything is y-sorted.

---

## 5. Rules (the host is the authority)

Everything in this section lives in DOM-free, Phaser-free files and is unit tested in Node.

### 5.1 Match flow

```
setup (decks, ready) -> intro 3 s -> regulation 3:00 -> [overtime up to 2:00] -> result -> setup (rematch)
```

- **Regulation:** 3:00. **Overtime:** up to 2:00, sudden death: the first tower destroyed ends it.
- **Winner:** more crowns. A Warden is 1 crown, the Keep is 3 crowns and ends the match at once.
- **Tie after overtime:** the team whose most damaged tower has more HP left, as a percent, wins. Equal means a draw.
- **Elixir speed:** 1.0 elixir per 2.8 s until the last minute of regulation; x2 for that minute and the first overtime minute; x3 for the last overtime minute.
- **Start:** both players begin with 5 elixir. Max 10, no overflow banked.
- **Leaving or dropping:** the sim pauses for the grace period (default 30 s). Rejoin resumes it. If the player does not return, a CPU takes their seat (section 12). A team forfeits only when every human on it has gone. A player can tap Forfeit (two taps, `confirm-click`), which also hands the seat to a CPU unless the whole team forfeits.

### 5.2 Cards, hand and cycle

- **Deck:** exactly 8 distinct cards, chosen on the phone from 24.
- **Hand:** 4 cards, plus the **next** card shown small. Playing slot `i` puts the played card at the back of an 8-card queue and refills slot `i` from the front. This is a pure function (`deck.js`), seeded shuffle so a match can be replayed.
- **Cost:** 1 to 7 elixir. Not enough elixir means the deploy is refused and the phone shakes the card; nothing is queued.
- **Everything is symmetric.** No card levels, no collection, no matchmaking: skill and deck choice only. An optional **Handicap** setting on the host (tower HP +0, +10, +25, +50 percent for one side) lets a child play a parent.

### 5.3 Deploying

1. Phone sends `PLACE pick` when a card is pressed. The host marks the slot selected and shows the zones.
2. While the finger moves over the pad, the phone sends `PLACE aim` at about 30 Hz. The host draws a **ghost** at the snapped position (0.5-tile grid) and tints it red if the spot is illegal.
3. On release over the pad: `PLACE drop`. The host validates (slot holds a card, enough elixir, legal zone), spends the elixir, cycles the hand, and starts a **1.0 s deploy**: the summoning circle appears, the troop is untargetable and idle until it lands. Release off the pad or back in the hand sends `cancel`.
4. A spell has a 0.4 s cast instead, and its radius ring is shown on both screens the moment it is dropped.
5. Multi-unit cards (Thistle Pups, Moth Swarm) spawn in a small fixed pattern around the point.

The 1.0 s deploy hides input latency (see `docs/input-findings.md`: the controls felt responsive; re-measure the drop-to-ghost time on a real device).

### 5.4 Units: the state machine

Each unit runs this once per sim step. Time is in seconds; positions in tiles.

```
DEPLOYING -> MOVING <-> ATTACKING ; any -> DEAD
MOVING: pick target (every 0.1 s, staggered by id)
  buildings-only unit        -> nearest enemy building or tower
  otherwise, enemy in sight   -> nearest enemy troop, else nearest building
  otherwise                   -> lane goal (the Warden, then the Keep)
  move toward the target or goal: over the nearer bridge for ground units, straight for air units and the Hound's leap
ATTACKING: target in range -> face it, wind-up, damage on the strike point, then cool down (hit time)
  retarget only between attacks, never in the middle of one
```

- **Sight range** is 5.5 tiles for troops (towers use their attack range). **Range** is a unit's attack reach. Melee is 0.8 tile measured edge to edge.
- **Ground pathing:** a ground unit that must cross the river heads for the cheaper of the two bridges, then straight over it (`routeTo` in `shared/arena-map.js`); on the same side it goes straight at its goal. Nothing in the arena besides towers and the river blocks a walker, so waypoints are enough and no flow fields were built.
- **Separation:** every ground unit has a collision radius and a mass. Overlapping units push apart in proportion to mass (a Magma Brute barely moves for a Wisp). Air units collide only with air. Towers are static circles-in-boxes.
- **Projectiles:** homing, fixed speed; a splash projectile damages a circle where it lands. A homing hit cannot miss, but a splash hit lands where the target is when it arrives.
- **Status effects:** slow (a multiplier on speed and attack speed), stun (no move, no attack, resets the wind-up), curse (extra damage taken, stacks), shield (absorbs first, then regrows). All stored as timers on the unit and ticked in one place.
- **Towers:** a Warden always shoots the nearest enemy in range, preferring troops that are attacking it. The **Keep sleeps** until it is damaged or until a Warden on its side is destroyed; waking it plays the shutters-and-horn animation and takes 0.5 s before it fires. Spells deal 35 percent damage to towers.
- **Death:** `onDeath` effects (Rubble, Lava Pool, Powder Cart blast) run through the same ability table as other traits so there is one place to read them.
- **Order of work each step:** deploy timers, retarget, move, separate, attack, projectiles, status ticks, deaths, then match checks. Units are processed in id order, so the sim is deterministic for a given input log.

### 5.5 Determinism and replay

The host is authoritative, so lockstep determinism is not required. It is kept anyway because it makes the sim testable and gives the result screen a **Play of the match** reel for free: a seeded RNG (`mulberry32`) for any randomness, one fixed step, units in id order, positions kept as plain numbers. A match is `{seed, decks, [ (tick, side, slot, x, y) ... ]}`; `tools/balance-sim.js` and the replay test both rely on running that log to an identical final-state hash.

### 5.6 Seats and teams (1v1 and 2v2)

- **Seats.** 1v1 has 2 seats, 2v2 has 4. Each seat has a team (0 Dawn, 1 Dusk), an optional human, and otherwise a CPU level (`seats.js`).
- **Per seat:** its own 8-card deck, hand, cycle, next card and **elixir**. Elixir is never shared or transferred.
- **Per team:** towers, crowns, the pocket and the deploy zone. Either partner can deploy anywhere in the team's zone, and both ghosts can be on screen at once.
- **Scoring is unchanged**: crowns per team, the Keep ends the match, the tiebreak compares each team's lowest tower HP percent.
- **Handicap** applies per team, so a 2v2 can pair an adult and a child against two adults.
- **Cap on cards in play:** none per seat, only the global 80-unit render cap (section 11).
- **Assignment:** in 1v1 the first phone to join is Dawn and the second is Dusk; with one phone, the CPU takes Dusk. In 2v2 each phone picks Dawn or Dusk (a full team refuses), and the host can reassign. Seats fill in join order within a team.

---

## 6. The roster: 24 original cards

Four factions. Faction is a costume and a theme, not a rule. All cards are available to both players; a deck is any 8.

Speed: slow 0.75, medium 1.0, fast 1.5 tiles per second. Range 0.8 = melee. HP and damage are starting numbers.

### 6.1 Troops (16)

| Card | Cost | Faction | HP | Damage (hit s) | Speed | Range | Targets | Trait |
|---|---|---|---|---|---|---|---|---|
| Ember Wisp | 1 | Cinder | 85 | 50 (1.0) | fast | melee | air, ground | Flies. The cheap cycle card and the cheap anti-air. |
| Brook Sprite | 2 | Brook | 150 | 65 (1.2) | medium | 5.0 | air, ground | Drizzle: hits slow the target 15 percent for 1 s. |
| Thistle Pups x3 | 3 | Thorn | 105 each | 38 (0.9) | fast | melee | ground | Swarm. Cheap cleanup for ranged troops. |
| Bramble Knight | 3 | Thorn | 560 | 85 (1.1) | medium | melee | ground | Thorns: melee attackers take 15 damage per hit. |
| Moth Swarm x4 | 3 | Thorn | 48 each | 28 (0.8) | fast | melee | air, ground | Flies. Dies to any splash. |
| Powder Cart | 3 | Cog | 190 | none | fast | contact | ground, buildings | Detonates on contact or death: 180 in 1.8 tiles, x2.5 on buildings. |
| Kestrel | 3 | Cog | 230 | 90 (1.0) | medium | 6.0 | air only | Cannot attack ground. The dedicated flyer counter. |
| Cinder Hound | 4 | Cinder | 600 | 125 (1.3) | fast | melee | buildings only | Leaps the river, ignoring bridges. The reference game's fast tower-pusher, in our own skin. |
| Pyre Mage | 4 | Cinder | 330 | 120 splash r1.2 (1.4) | medium | 5.5 | air, ground | Splash fireball. Strong against swarms. |
| Stag Rider | 4 | Thorn | 520 | 160 (1.2) | medium | melee | ground | Charge: after 3.5 clear tiles, speed x2 and the next hit does x2. Stopping resets it. |
| Pikewarden | 4 | Cog | 540 | 105 (1.4) | slow-medium | 2.0 | ground | Reach: the thrust hits every enemy in a thin line. |
| Cogwright | 4 | Cog | 450 | none | slow | n/a | n/a | Builds a Cog Bot (70 HP, 40 damage) every 5 s, up to 4 alive. Cannot fight itself. |
| Rampart Golem | 5 | Cog | 1900 | 115 (1.5) | slow | melee | buildings only | Death: two Rubble (200 HP, 40 damage). The tank that pulls towers. |
| Tideshell Guardian | 5 | Brook | 900 + 450 shield | 95 (1.3) | medium | melee | ground | Shield absorbs the first 450 and regrows after 5 s unhurt. |
| Hexweaver | 5 | Brook | 380 | 75 (1.1) | medium | 5.5 | air, ground | Hex: each hit adds a stack of +10 percent damage taken (max 5, 3 s). A damage multiplier for the team. |
| Magma Brute | 7 | Cinder | 2900 | 180 splash r1.0 (1.6) | slow | melee | ground | Death: a Lava Pool for 3 s, 35 damage per second to ground units. |

### 6.2 Buildings (3)

Buildings deploy on the ground, never move, decay to zero HP over their lifetime, and pull buildings-only units.

| Card | Cost | HP | Role | Lifetime |
|---|---|---|---|---|
| Bolt Tower | 3 | 640 | 55 damage per 0.8 s, range 6, hits air and ground | 40 s |
| Rootspout | 4 | 720 | Sprouts 2 Saplings (60 HP, 35 damage) every 7 s | 35 s |
| Ballista Nest | 5 | 820 | 140 damage per 2.2 s, range 9.5, ground only | 30 s |

### 6.3 Spells (5)

| Card | Cost | Effect |
|---|---|---|
| Static | 2 | Radius 2.5. 90 damage and a 0.5 s stun (resets wind-ups). 35 percent to towers. |
| Rime | 2 | Radius 3.0. 40 damage and 40 percent slow for 4 s. |
| Surge | 3 | Radius 3.0. 120 damage and a 3-tile push away from the centre (not Brute or Golem). |
| Verdant Mend | 3 | Radius 3.0. Friendly units regain 200 HP over 3 s. |
| Flare | 4 | Radius 2.5. 300 damage. 35 percent to towers. |

### 6.4 Towers

| | HP | Damage (hit) | Range | Notes |
|---|---|---|---|---|
| Warden (2 per side) | 1400 | 50 (0.9 s) | 7.5 | 1 crown. Shoots a bolt of lantern-light. |
| Keep (1 per side) | 2400 | 70 (1.0 s) | 7.0 | 3 crowns, ends the match. Sleeps until hit or a Warden falls. |

### 6.5 What each one looks like and does on screen

Shape and motion first; this is the brief for the SVG parts and rig curves in section 3.5.

| Card | Silhouette and palette | Moves | Attack | Death and extras |
|---|---|---|---|---|
| Ember Wisp | A teardrop of flame with two tiny eyes, no limbs; orange to white core | Hovers with a lazy figure-8, trailing 3 ember dots | Dive-bump, flame flares at contact | Pops into 4 sparks that fall and fade |
| Brook Sprite | A thin raindrop-hatted child in a leaf cape; teal and cream | Skips on tiptoe, cape ripples | Flicks a water bead from a bent reed | Splashes into a puddle that dries in 1 s |
| Thistle Pups | Three round purple-grey hedgehog-pups with spiky tops | Scurry in a loose, bobbing triangle | Headbutt, spikes flash | Deflate with a squeak, a thistle puff |
| Bramble Knight | Squat, barrel-shaped, bark-and-moss armour, a branch sword, a berry plume; green and brown | Heavy plodding with a sway | Overhead chop, leaves burst | Splits into a leaf pile; the sword stays a moment |
| Moth Swarm | Four fat moths with eye-spots on the wings, powder-trail | Erratic flutter, each phase-shifted | Quick wing slaps | Dust cloud, wings flutter down |
| Powder Cart | A little wooden cart with a barrel, a lit fuse, and a big grin painted on | Rattles, the fuse sparks stream behind | Slams into the target | Bright round blast, shrapnel confetti, a scorch decal for 3 s |
| Kestrel | Tall, lean, hooded archer on stilt-boots with a cog-and-feather bow; grey and orange | Long, stiff strides | Draws and looses upward, a brass arrow with a spark trail | Hat flies off, feathers drift |
| Cinder Hound | Low, long, charcoal hound with an ember mane and cracked-lava flanks | Bounding gallop; a visible arc over the river | Bites and drags, sparks | Cools to ash and crumbles |
| Pyre Mage | Robed, narrow, wide pointed hat with a glowing coal in the brim; red and charcoal | Floats a hand above the ground, hem swaying | Lobs a swirling fireball, trailed glow | Robe drops, a small fire dies out |
| Stag Rider | A small antlered stag with a leaf-eared rider, lance down; green and gold | Trot; the charge lowers the antlers and leaves a dust trail | Antler gore, a ring-shaped impact | Rider tumbles off, stag runs offscreen (cosmetic) |
| Pikewarden | Tall and thin, in a tin pot-helmet, with a very long pike; steel and teal | Measured march, pike held level | Straight thrust with a bright streak | Pike clatters, helmet rolls |
| Cogwright | Round, apron-wearing tinker with a backpack workshop that fits a tiny forge; brass | Waddles, backpack clanks | Pulls a lever; a Cog Bot pops out of the pack | Backpack explodes in gears |
| Rampart Golem | A hill-sized stack of mortared stone blocks with a flag on one shoulder; grey-blue | Slow stomps with small ground shakes | Two-handed slam, dust ring | Collapses into stone blocks and releases two Rubble |
| Tideshell Guardian | A turtle-like knight with a large scalloped shell as the shield, bubbles drift off it | Steady, rocking walk | Shell bash | Shell cracks, water bursts out |
| Hexweaver | Slim, masked, with seven drifting threads and a needle staff; teal and cream | Glides, threads trail | Threads lash the target, a stitched rune appears | Threads unravel upward |
| Magma Brute | Wide, broad, cooled-lava skin with molten cracks that pulse; ember eyes | Ponderous stomps, floor tinted red | Fist slam with a shockwave ring | Crumbles to a glowing Lava Pool |
| Bolt Tower | A narrow brass tripod with a coil and a glass lamp that crackles | Folds up from the ground at deploy | Arcs of electricity | Lamp shatters, a short fizz |
| Rootspout | A knotted stump with a hollow and a wriggling bulb; Saplings peek out | Rises in a ring of roots | Spits a Sapling | Withers, roots curl |
| Ballista Nest | A wooden nest on stilts with a large crossbow and a hay stack | Unfolds at deploy | A big bolt with a long streak | Splinters |
| Static | A cartoon storm cloud that rattles | Appears overhead | Forked bolt, bright flash | |
| Rime | A swirl of snowflake petals dropping | A ring of frost grows | Ice crystals bloom, ground whitens | Melts after 4 s |
| Surge | A rising wave with a foam crest | A wave sweeps outward | Units slide, a splash ring | |
| Verdant Mend | Green spirals and tiny sprouts, a soft chime | Rising leaves | Pulses of light on each unit | |
| Flare | A falling comet of orange paper | Arcs in with a whistle | Big flash, scorch decal | |

---

## 7. Phone screens

Portrait. The phone is a hand, not a second screen. Sizes follow the UI rules: touch targets 44 px or larger, text 16 px or larger, one main action.

```
┌────────────────────────────┐
│ ●Name        2:41      ♛ 1 │  top line: dot and name, timer, team crowns
│ ▮▮▮▮▮▮▮░░░  7       ×2     │  elixir: 10 pips and number, ×2 badge when doubled
├────────────────────────────┤
│                            │
│       deploy pad           │  your team's half, 18 wide x 15 deep tiles
│   (lane guides, the river  │  your base is at the bottom, always
│    edge on top)            │
│                            │
├────────────────────────────┤
│ next  [A] [B] [C] [D]      │  4 cards 88 px tall, the next card smaller on the left
│ ⏪ emote            forfeit │  quiet row: emote, forfeit (two taps)
└────────────────────────────┘
```

- **Cards:** a faction-coloured frame with the character's head cropped from its own SVG, the cost as a magenta drop in the corner, and a thin team-coloured edge. An unaffordable card dims and shows "needs 2 more" under it; it can still be picked, so you can see where it would go.
- **Elixir bar:** ten pips filled by the host's number; it animates up on the phone between host updates so it does not step. Doubled elixir tints the bar and shows the multiplier.
- **Interaction:** press a card, drag onto the pad, release to deploy, drag back to the hand to cancel. Alternatively tap the card, then tap the pad. The ghost is on the host screen as well as a ring under your finger.
- **Pad orientation:** the pad always has your base at the bottom. Dawn seats see it as the host draws it. Dusk seats sit at the top of the host screen, so their pad is turned 180 degrees: left and right swap along with up and down. `placement.js` has one function, `padToWorld(team, x, y)` (Dusk flips both axes), so it is tested once. The ghost always shows the truth.
- **What the phone does not show:** the enemy, the board, the opponent's hand. It is a controller, with a compact tower-health strip on the top line. (An optional radar of unit dots is a version 2 idea; it costs message size and invites looking at the phone.)
- **Colour:** the team colour (Dawn or Dusk) with a small seat pip. In 2v2 the two partners share the team colour and differ by pip (one dot or two).
- **Setup screen:** a card grid (24 cards, filter by faction or cost), 8 slots at the bottom, average-cost readout, four preset decks (one per faction), a save-to-localStorage slot, and a green Ready. A Dawn or Dusk switch is always shown (in a 1v1 it picks your side against the CPU; in a 2v2 a full team sends you to the other one). Phones keep their deck in `localStorage`.
- **Result screen:** crowns, "Rematch" and "Different deck", then back to setup with the room open.

### Protocol additions (`shared/protocol.js`, added first, with comments)

```js
export const INPUT_KINDS = { ...existing, PLACE: 'place' };

// A card being played. { kind:'place', phase:'pick'|'aim'|'drop'|'cancel', slot:0..3, x:0..1, y:0..1 }
// x, y are pad coordinates, y from your base. The host converts with padToWorld.

export const ARENA_CHOICES = Object.freeze({
  READY: 'ready',      // value true/false, counts in setup
  DECK: 'deck',        // value: array of 8 card ids, setup only; the host validates it
  TEAM: 'team',        // value: 0 (Dawn) or 1 (Dusk), setup only; a full team seats you in the other one
  EMOTE: 'emote',      // value: one of EMOTES (0-5), rate limited to 1 per 2 s
  FORFEIT: 'forfeit',  // value true; the phone asks twice
});
```

Host to phone (`setControllerView`), sent when anything changes and at least 4 times a second for the clock and elixir; always under about 700 bytes:

```js
{ phase, t, mult, elixir, hand:[ids x4], next, selected, seat, mate,
  towers:{ own:[w1,keep,w2], foe:[w1,keep,w2] },   // HP percent, 0 to 100
  crowns:[own, foe], pocket:{ left:bool, right:bool }, notice, ready, result }
```

`notice` is a short machine code (`no-elixir`, `bad-spot`, `grace`, `cpu-took-over`) the phone turns into a word; there is no free text over the wire. `mate` is the partner's colour and name only, never their hand.

---

## 8. Host screens

Shell: the host docks the bar under the game like the 3D race (`bar.setDocked(true)`), which keeps the 1080 px height ours. Phaser draws the arena in the centre column; the two side panels are HTML in the Night look, sized in `em` like the other shell screens.

- **Setup:** a VS banner with a card per seat (team colour, name or "CPU level 2", the deck's faction mix as four small dots, a green tick when ready). Settings as clear words with their value: Mode (1v1, 2v2), Time (2:00, 3:00), Overtime (on, off), Elixir speed (1x, 1.5x), Handicap (off, +10, +25, +50 percent tower HP for one team), Arena (Lantern Meadow, Frostmarsh, Emberquarry), and per empty seat CPU level (1, 2, 3). Start match when every human is ready; empty seats are filled by CPUs at that moment.
- **Intro (3 s):** both Keeps visible, "Dawn vs Dusk", countdown 3, 2, 1, horn.
- **Side panels:** each team's panel shows its crowns, its seats (name, a pip, a CPU badge where it applies), the tower HP in words and bars, the last emotes, and that team's recent plays ("Dusk played Stag Rider"). The timer is large at the top of the right panel with a double-elixir ribbon sliding in at 1:00 and 2:00. Elixir is deliberately **not** shown by default: it is private. A host setting, "Show elixir bars (teaching)", turns on thin bars in the panels.
- **On the board:** tower HP bars are over each tower; troop bars appear only after damage. Banners for tower down and Keep awake appear in the middle of the river, not over the lanes.
- **Ghost:** a translucent copy of the troop (or the spell radius ring) with the team crest and a seat pip, visible only while that seat's finger is down. Red tint when the spot is illegal. In 2v2 two ghosts can be on screen at once, told apart by pip.
- **Result:** the winning Keep gets confetti; a crowns banner; stats per seat (damage dealt, towers taken, elixir spent, elixir leaked at the cap); "Play of the match": a 6 s replay of the biggest HP swing, taken from the input log; then Rematch and back to setup.
- **Emotes:** six icons (cheer, laugh, wow, cry, oops, thanks) drawn as a speech bubble beside the sender's Keep for 2 s with a small chirp.
- **Camera feel:** fixed camera; a tiny parallax on the lanterns, a render-only 2 to 3 px shake on a tower fall, and a 150 ms render hit-stop. No zoom, so the arena always fits.

---

## 9. Sound and music

All made with Web Audio in `host/audio/` (`synth.js` tones and noise, `instruments.js`, `music.js` sequencer, `notation.js`), per the hard constraint of no audio files. New cues in `host/games/arena/sounds.js`.

| Event | Sound |
|---|---|
| Drop a card | soft pop plus a rising 3-note chime in the player's team key (Dawn major, Dusk minor) |
| Troop lands | thump (low sine with a noise tick), pitched by unit mass |
| Melee hit | short noise burst with a lowpass sweep, pitched by damage |
| Ranged shot | pluck with a quick pitch-down; mage = airy whoosh; cog = tick-clack |
| Spell | Static: crackle; Rime: glassy shimmer; Surge: rising wash; Flare: whistle then boom; Mend: warm triad |
| Tower hit | wood-and-stone knock; Keep: lower |
| Tower fall | descending brass, rumble, dust hiss |
| Keep wakes | horn, two notes |
| Elixir doubles | quick upward arpeggio and a tempo tick |
| Overtime | low drone under a tense pulse |
| Result | short fanfare for the winner, a soft sigh for the loser, a draw gets a neutral chime |

Music: a calm 4-bar pastoral loop in regulation (plucked strings, soft pad); at double elixir it gains a drum pattern and drops the pad; in overtime it shifts to a minor-key variant with a pulse that speeds up. Tunes live in `host/audio/tunes/arena.js` as note data, as the kart tunes do.

---

## 10. Files

```
shared/protocol.js                     + INPUT_KINDS.PLACE, ARENA_CHOICES, EMOTES
host/games/index.js                    + registry entry
host/games/arena/
  index.js                 game module (load, start, onMessage, step, render, onPlayerLeft, stop)
  tuning.js                every match number: durations, elixir rates, tower stats, deploy time
  palette.js               colour tokens and arena themes
  (the arena geometry, `shared/arena-map.js`, and the 24 cards, `shared/arena-cards.js`, are shared with the phone)
  geometry.js              edge-to-edge distances
  rng.js  palette.js  arena-view.js  setup-panel.js  side-panels.js  result-panel.js  session.js
  abilities.js             traits and on-death effects, one table
  deck.js                  seeded shuffle, hand, next, cycle (pure)
  elixir.js                regeneration and multiplier (pure)
  placement.js             zones, pocket, snap, padToWorld, validation (pure)
  sim.js                   one step, order of work
  sim-targeting.js  sim-movement.js  sim-combat.js  sim-projectiles.js  sim-status.js
  towers.js                tower and Keep behaviour and wake
  match.js                 phases, clock, overtime, crowns, tiebreak, forfeit and CPU takeover
  views.js                 what each phone is told
  seats.js                 2 or 4 seats, team, human or CPU, takeover of a dropped seat (milestone A0)
  cpu-driver.js            the CPU player, level 1 in A3, levels 2 and 3 in A9
  atlas.js                 packs SVG parts into one texture
  puppet.js                the rig player and its animation curves
  renderer.js              Phaser scene: layers, y-sort, ghost, interpolation
  effects.js               emitters and flashes
  hud.js                   the two team side panels (HTML)
  setup-panel.js  result-panel.js
  sounds.js                cues
host/audio/tunes/arena.js
controller/games/arena/
  index.js  deck-builder.js  hand.js  pad.js  elixir-bar.js  emotes.js  style.css
assets/arena/parts/<card-id>/*.svg  rig.json       characters, our own
assets/arena/tiles/*.svg                           grass, stone, river, plank, rubble
assets/covers/arena.svg  arena-wide.jpg            picker art
assets/manifest.json                               + every file, source "our own", sha256
tools/arena-bake.js                                optional fallback bake (see 3.5)
tools/balance-sim.js                               headless CPU-vs-CPU runs, win-rate table
test/unit/arena-*.test.js
test/browser/arena-*.test.js
```

Each file stays near the repo's limits (about 200 lines, functions under 40). The sim is split by responsibility so that each piece can be read alone.

---

## 11. Efficiency

| Concern | Decision |
|---|---|
| Sim cost | Worst case about 60 units, 6 towers, 40 projectiles. Retargeting every 0.1 s staggered by id, spatial hash of 2 tile cells for range queries. Comfortably under 1 ms a step on a phone-class CPU. |
| Draw cost | One atlas texture, y-sorted display list, pooled puppet objects, no per-frame allocations in `render`. Phaser draws once per `render()` driven by the shell's runner. |
| Network | Phones send only `PLACE aim` (30 Hz while dragging) and rare choices. The host sends about 4 small views a second. Well below the 16 KB message cap and the hotspot's capacity for up to 4 phones. |
| Load | Parts are SVG and small; packing takes tens of milliseconds. Nothing is built until Play, behind the loading screen. |
| Old iPad host | Frame-time guard: if the average passes 24 ms, effects halve and shadows turn into simple ellipses. |
| Memory | Pools for puppets and particles; atlas 2048x2048 RGBA is 16 MB at worst. |

---

## 12. CPU opponent, Watch mode and balancing

The CPU is not a late extra. A single person with no friends in the room must be able to play from the first playable build, and the CPU is also how the sim gets exercised during development, so it arrives in milestone A3, straight after deploying works.

- **Seats.** A match has 2 seats (1v1) or 4 (2v2). A seat is `{ team, human: playerId | null, cpuLevel }`. Any seat without a human at Start is a CPU. Nothing else in the sim knows the difference.
- **Same door as a human.** The CPU calls the same `placement.validate` and spends the same elixir from the same hand and cycle (`cpu-driver.js` returns `{slot, x, y}`), so it cannot cheat and cannot play an illegal card. It never reads the opponent's hand.
- **Level 1:** reacts in 1 to 2.5 s; defends a lane that has enemies on its half with the biggest card that can hit them, throws a spell at a cluster of 3 or more, and pushes at 7 elixir.
- **Level 2:** reacts in 0.6 to 1.4 s; picks counters (anti-air for flyers, splash for swarms, a fast hitter for a tank), heals hurt groups with Verdant Mend, backs up a pusher with a ranged or splash troop, pushes at 6 elixir.
- **Level 3:** reacts in 0.3 to 0.8 s, pushes at 5 elixir, and finishes a weak Warden with a spell. Counting the opponent's cycle and baiting spells are not built.
- **CPU as a teammate (2v2):** it covers the lane the human is not pushing and answers the human's push with a support card behind it.
- **A dropped human:** the sim pauses for the grace period. If the phone does not return, a CPU takes that seat with its current hand and elixir (the notice `cpu-took-over`). A team only forfeits when every human of it has gone.
- **Watch:** CPU against CPU with random decks, as the kart game's Watch. An attract mode, and a first sanity pass on art and sound.
- **`tools/balance-sim.js`:** runs thousands of headless matches (Node, no browser) between random decks and prints win rate by card and pair, average match length, and how often a Keep falls. A card above 56 percent or below 44 percent in play-weighted win rate gets a number change first, a trait change second. Win rates are only meaningful once CPU level 2 or 3 exists, so the first real balance pass is in A9; until then it is a smoke test.

---

## 13. Testing

Per `CLAUDE.md`, every milestone adds tests and is not done until `npm test` and the chosen browser files pass.

Unit (`test/unit/`):

- `arena-deck`: the cycle returns each card once per 8 plays, the next card is correct, the seed repeats the order.
- `arena-elixir`: base rate, x2 and x3 windows, cap at 10, a deploy that spends exactly the cost.
- `arena-placement`: zones, pocket opens only after a Warden falls, `padToWorld` flips both axes for Dusk and round-trips, snapping, spells anywhere.
- `arena-seats`: 1 phone gives a CPU Dusk seat, 2v2 refuses a third phone on a team, a dropped seat is taken by a CPU with its hand and elixir intact, a team forfeits only when no human is left.
- `arena-cpu`: the CPU's chosen placement always passes `placement.validate`, it never reads an opponent's hand, and a CPU-vs-CPU match always ends.
- `arena-map`: the river blocks ground, bridges allow crossing, every lane cell has a path to the enemy goal.
- `arena-sim`: targeting preferences, buildings-only units, melee reach, splash, projectile arrival, status stacking, mass push order, the Hound's leap, Keep sleep and wake, tower fall adds crowns.
- `arena-match`: overtime starts only on a tie, sudden death ends on the first tower, tiebreak by lowest HP percent, a team with no human left forfeits after the grace time.
- `arena-replay`: a recorded input log run twice gives the same final-state hash.
- `arena-cards`: every card id has stats, cost between 1 and 7, a part folder in `assets/arena/parts/`, and a manifest entry.

Browser (`test/browser/`, run only for what changed): the phone deck builder flow; ready for two phones (Pixel 7 and iPhone 13 emulation); a drag from a card to the pad produces `PLACE aim` and a `drop`; the host draws a ghost and a deployed troop (read by screenshot pixels, as the existing tests do); a reconnect during a match pauses the clock and resumes it.

**Still needs a real device** (record in a handoff): real thumb dragging from the hand to the pad without the page scrolling or iOS edge swipes stealing the touch; whether the ghost aiming feels immediate over the hotspot; legibility of the host arena from across a room; frame rate on the real host; the sound mix.

---

## 14. Milestones (one per chat, as the project's workflow requires)

Two choices shape the order: the seat model (human or CPU, team 0 or 1) is built in from A0 so 2v2 never becomes a rewrite, and a CPU exists from A3 so the game is playable alone.

| Id | Goal | Done when |
|---|---|---|
| A0 | Skeleton and seats | Registry entry (1 to 4 players), empty game module, phones join, setup screen with Ready, `seats.js` (2 or 4 seats, human or CPU), `PLACE` and `ARENA_CHOICES` in the protocol, a unit test of the message shapes, `npm test` green |
| A1 | Map and sim core | `arena-map` (18 x 32), routing over the bridges, units move and fight, towers shoot, Keep wakes, match ends on a Keep; drawn with plain Phaser rectangles
| A2 | Hand, elixir, deploy | Deck, hand, elixir, placement, the phone pad and hand, the ghost on the host; six placeholder troops; a human can deploy |
| A3 | CPU level 1 and Watch | `cpu-driver` level 1 through the same validate path; one human against a CPU is a complete crude match; Watch mode; a replay test |
| A4 | Match flow | Clock, double elixir, overtime, crowns, tiebreak, result, rematch, grace pause and CPU takeover, forfeit |
| A5 | Art pipeline | Atlas packer, rig player (front and back parts), arena tiles, towers, three finished characters (one melee, one ranged, one flyer) with all animations; decision recorded on puppet versus baked frames; the picker cover |
| A6 | Full roster | All 24 cards with traits and spells, deck builder with presets, all art parts, the card-asset test |
| A7 | Feel | Effects, sound and music, side panels and HUD polish, emotes, camera feel, host and phone UI checked against the UI rules |
| A8 | 2v2 | Team seats sharing towers, Team choice on the phone, two ghosts with pips, 4-phone room, CPU teammate, tests for shared towers and the pocket per team |
| A9 | CPU levels 2 and 3, balance, device run | Counter table and cycle counting, `balance-sim` first pass, a real-device run on an iPhone, an Android phone and the host display, tuning, `docs/device-run.md` |
| A10 | Extras (optional) | Arena themes, draft mode, best-of-three |

A1 before A5 is deliberate. The reference game's feel comes from its rules; if units walking as rectangles are already fun to watch and play against a CPU, the art will make them better. If they are not, no art saves them.

---

## 15. Optional modes for later

- **Draft:** each player is offered 8 random cards and picks 4, then plays a 4-card deck; no deck-building knowledge needed, good for a party.
- **Mirror:** both teams get the same random decks.
- **Double elixir from the start:** shorter, wilder matches (2 minutes).
- **Best of three:** crowns carry into a series banner.
- **Heroes:** a champion card with a tap-to-use ability on the phone (the ability is one `PLACE`-style button).
- **Shared-deck 2v2:** partners draw from one deck and one elixir pool, a more cooperative variant of the 2v2 in A8.

---

## 16. Risks

| Risk | Why | Mitigation |
|---|---|---|
| Aiming by looking at the host feels laggy | ghost round trip includes the hotspot and the host's frame | measure with the Input lab pattern in A2; show a ring under the thumb so the phone itself always answers instantly; the 1.0 s deploy hides deploy latency |
| The phone mapping (left and right per side) confuses players | the Dusk pad is turned 180 degrees | the ghost always shows the truth; a 3-second tutorial prompt in the first match |
| Balance drift as cards are tuned | 24 cards, many interactions | `balance-sim` before every tuning pass (meaningful once CPU level 2 exists); numbers only in `cards-*.js` and `tuning.js` |
| Puppet rigs look stiff | parts-based animation can read as flat | A5 builds three characters first and decides; the baked fallback is already specified |
| An old iPad host drops frames | many units plus effects | pooling, frame-time guard, 80 unit cap, effect caps |
| Information leak | a phone's view includes data it should not | `views.js` has one function per side, unit tested to contain no opponent hand data |
| Rules accidentally copy the reference game too closely | structure is intentionally similar | names, numbers, art and the 18x32 map with its own tower layout are original; the structure (lanes, elixir, cycle) is the genre |

---

## 17. What to tune (and where)

Every number is a starting point. They live in two places so tuning is always in the same two files.

- `host/games/arena/tuning.js`: match length, overtime length, elixir rate and multipliers, start elixir, deploy time, spell cast time, sight range, tower stats, retarget interval, knock-back, status strengths.
- `host/games/arena/cards-*.js`: every card's cost, HP, damage, hit time, speed, range, targets and trait parameters.

First things to feel in A2 and A3: troop walking speed against bridge length (a crossing should take about 6 seconds for a medium unit), tower damage against a typical push, the pace of elixir, and whether one deploy second feels responsive.

---

## 18. Decisions taken and what is still open

Decided with you:

1. **Vertical arena**, 18 x 32 tiles, centred on the landscape host with a panel for each team beside it (section 4). Dusk phones turn their pad 180 degrees.
2. **CPU opponent from the start**: level 1 in A3, so one person can play alone; levels 2 and 3 in A9. Any empty seat is a CPU, and a CPU takes over a dropped seat.
3. **2v2 is designed in now and built in A8**: seats and teams exist from A0, towers and crowns are per team, each player has their own deck, hand and elixir.

4. **Name:** Spirefall is confirmed.
5. **2v2 elixir:** partners keep separate elixir and decks, as written. A shared pool stays a later variant (section 15).

Nothing is open. Next step is milestone A0 (section 14).
