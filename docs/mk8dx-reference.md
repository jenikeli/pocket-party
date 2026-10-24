# Mario Kart 8 Deluxe reference (researched, not measured)

What the 3D kart race copies from Mario Kart 8 Deluxe (Nintendo Switch, "MK8DX" below), with sources. Read by the M6 and M7 chats when choosing rules and starting numbers. Researched on 2026-10-24 from fan wikis and guides, not measured by us, so measured findings (`docs/spike-findings.md`, `docs/3d-findings.md`) win where they disagree. The Super Mario Wiki tables come from the game's own data files; the rest is from guides and community timing, and says so where it is uncertain.

## What we copy and what we do not

- **Copy:** the mechanics, the numbers, the feel, the camera, the HUD layout and the general look (bright, glossy, toy-like).
- **Do not copy:** Nintendo's assets or names. No ripped models, textures, sounds or music, no Mario characters, logos, item artwork or real course layouts. Mechanics and numbers are generally not covered by copyright, but those assets are, and Nintendo has had hundreds of fan games taken down for using them ([Nintendo Life, 2021](https://www.nintendolife.com/news/2021/01/nintendo_issues_mass_dmca_takedown_379_fan-made_games_forcibly_removed)). Use procedural or CC0 assets, for example [Kenney's Racing Kit](https://opengameart.org/content/racing-kit) (CC0, glTF: road pieces, barriers, flags, tents).

## Race format

- 12 racers per race, players plus CPU drivers. Grand Prix points for 1st to 12th: 15, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1 ([Mario Kart 8](https://www.mariowiki.com/Mario_Kart_8)).
- Engine classes: 50cc, 100cc, 150cc, 200cc, and Mirror (150cc on a mirrored course). Top speed is the 150cc value multiplied by 0.8 for 50cc, 0.9 for 100cc and 1.5 for 200cc ([MK8 in-game statistics](https://www.mariowiki.com/Mario_Kart_8_in-game_statistics), from game data; a community timing on a straight found the same ratios, [Gigazine](https://gigazine.net/gsc_news/en/20250603-mario-kart-cc)).
- Local split screen: 2-4 players on Switch, 2-8 on Switch 2 with version 4.0.0 ([MK8DX](https://www.mariowiki.com/Mario_Kart_8_Deluxe)).
- Frame rate on Switch: 60 fps for 1 and 2 players, 30 fps for 3 and 4 players in split screen, at 1080p docked ([Nintendo Wire on Digital Foundry](https://nintendowire.com/news/2017/04/20/digital-foundry-tackle-mario-kart-8-deluxe-praise-performance/), secondhand). This is the bar for our host devices.
- Dynamic lights (headlights, item boxes) stay on even in 4-player split screen; the renderer is probably deferred (Digital Foundry on the Wii U version, via [Nintendo Life](https://www.nintendolife.com/news/2014/05/digital_foundry_pins_down_mario_kart_8s_resolution_and_framerate), hedged by them).

## Stats

From [MK8DX in-game statistics](https://www.mariowiki.com/Mario_Kart_8_Deluxe_in-game_statistics):

- Driver, body, tyres and glider each add points per stat. The sum is a hidden level from 0 to 20, shown in the game as (level + 3) / 4, so level 1 shows 1.00 and level 20 shows 5.75.
- Stats: speed (ground, water, anti-gravity, air), acceleration, weight, handling (ground, water, anti-gravity, air), traction (off-road and slippery ground), mini-turbo, invincibility (time after being hit).
- Weight blends between a minimum and a maximum mass by the kart's speed relative to its top speed (half speed uses the midpoint). It decides who gets pushed in bumps.
- Top speed barely changes between builds: level 1 to level 20 is only about 6%. Acceleration and handling change 2-3 times as much. So builds mostly trade acceleration and handling, not top speed.

Values at 150cc (version 4.0.0). Level 10 is a middle build and is our starting point.

| Parameter | Level 1 | Level 10 | Level 20 | Game's internal name |
|---|---|---|---|---|
| Ground top speed, 0 coins | 7.525 | 7.75 | 8.00 | |
| Ground top speed, 10 coins | 8.025 | 8.25 | 8.50 | |
| Acceleration limiter | 0.035 | 0.08 | 0.13 | `Drive_AccLmtFwd` |
| Relative acceleration | 0.0055 | 0.01 | 0.016 | `Drive_SpdKfFwd` |
| Steering | 0.0065 | 0.011 | 0.014 | `Drive_DirRotH` |
| Steering while drifting | 0.0145 | 0.019 | 0.022 | `Drift_DirRotH` |
| Glider roll | 0.15 | 0.195 | 0.245 | `Wing_StickLR_Roll` |
| Glider sideways move | 0.4 | 0.49 | 0.59 | `Wing_StickLR_Move` |

Air speed is fixed at 8.05 and coins do not change it. Speeds are in the game's distance units per frame at 60 fps.

**What the values mean.** The Wii U statistics page defines the acceleration limiter as "the maximum amount of distance units/frame that can be added to the current speed in each frame". At level 10 that is 0.08, so going from 0 to 7.75 takes at least 97 frames (1.6 s). The page does not explain the relative acceleration value, and says only that handling is "proportional to the angular velocity while steering". A likely reading, not verified: steering is radians per frame (0.011 is about 38 degrees per second; 0.019 while drifting is about 65). M6b checks these readings against footage.

**The distance unit is not public.** Searched for on 2026-10-24: no wiki, datamine or developer source gives the size of a distance unit in metres or kart lengths. One fan ([crunchyfield](https://www.tumblr.com/crunchyfield/724035585251180544/how-does-mario-kart-8-deluxe-speed-translate-into)) set out to convert speeds to km/h. Their method uses the game's own odometer in the player stats, which counts distance in km: driving Excitebike Arena 100 times gave about 947 m per lap. Their final speeds are not in the published text. Our game does not need metres anyway, only ratios: top speed in kart lengths per second, road width in kart lengths and camera distance in kart lengths. Footage gives those directly (see "Reference footage" in `plan.md`).

The internal names describe a turn rate, a speed curve and boost multipliers. Those are hand-tuned arcade rules, not a simulated car with tyres and suspension. That is the reason the plan writes the kart rules by hand.

## Drift and mini-turbo

From [Mini-Turbo](https://www.mariowiki.com/Mini-Turbo) and the statistics page above:

- Pressing the drift button hops the kart. Steering left or right as it lands starts a drift that way; steering during the drift tightens or widens it. Releasing the button fires the boost.
- While drifting, a counter rises by 5 units per frame with the stick pushed well into the turn, and by 2 per frame otherwise. On the Wii U version "well into the turn" meant at least 0.5 sideways; MK8DX needs "very slightly more horizontal". Auto-drift (Smart Steering) charges at most 2 per frame.
- Three levels, shown by spark colour: blue (Mini-Turbo), orange (Super Mini-Turbo), purple (Ultra Mini-Turbo; pink in British English). Ultra is only possible with Smart Steering off.
- Every level boosts to the same speed; they differ only in how long the boost lasts.

| Mini-turbo stat level | Thresholds (counter units) | Boost lengths, frames (blue / orange / purple) | Boost speed (x top speed) | Jump boost (frames, x top speed) |
|---|---|---|---|---|
| 6 (lowest) | 269 / 568 / 867 | 26 / 82 / 138 | 1.08 | 21, 1.33 |
| 10 | 256 / 542 / 828 | 30 / 90 / 150 | 1.10 | 25, 1.35 |
| 15 | 235 / 500 / 765 | 35 / 100 / 165 | 1.125 | 30, 1.375 |
| 20 | 200 / 430 / 660 | 40 / 110 / 180 | 1.15 | 35, 1.40 |

The table also lists how fast each boost accelerates (about 0.12-0.14 for mini-turbos and 0.2 for the jump boost), with units not given.

At level 10, drifting with the stick held hard into the turn reaches blue after 51 frames (0.85 s), orange after 108 (1.8 s) and purple after 166 (2.8 s). With a soft stick it takes 2.5 times as long. Nintendo's in-game tutorial gives boost lengths of 0.621, 1.674 and 2.633 s, close to the level-15 row.

Fire hopping (hopping repeatedly during a boost to stretch it) worked on the Wii U and does not work in MK8DX.

## Other boosts and course features

- **Rocket start:** press accelerate just after the "2" appears in the countdown, with its tone. Pressing too early stalls the kart at the line; the right moment gives a mushroom-like boost. No frame window is published ([Rocket Start](https://www.mariowiki.com/Rocket_Start)).
- **Jump boost (trick):** press the drift button as the kart leaves a ramp or a lip in the road. The kart does a trick and boosts on landing ([Jump Boost](https://www.mariowiki.com/Jump_Boost); lengths in the table above).
- **Dash panels and mushrooms:** a fixed boost. No numbers found.
- **Slipstream:** after about 3-5 s close behind another kart, blue wind lines surround the kart and it gets a modest boost of about 3 s, or until it hits a wall, a kart or an item ([Drafting, wiki mirror](https://breezewiki.discard.no/mario/wiki/Drafting)).
- **Coins:** up to 10. Each gives a small boost and raises top speed, up to +0.5 units per frame at 10 coins (about +6.5%). Being hit or falling off loses some; the MK8DX number was not found, Mario Kart 7 drops 3 ([Coin](https://www.mariowiki.com/Coin)).
- **Anti-gravity:** marked sections where the road runs up walls and over ceilings. Bumping another kart or a glowing post there gives both a Spin Boost ([Mario Kart 8](https://www.mariowiki.com/Mario_Kart_8)).
- **Gliding:** a glide ramp opens a glider, steered with the glider stats above. **Underwater:** uses the water speed and handling stats.
- **Off-road:** grass, sand and similar ground slow the kart; the traction stat reduces the slowdown (the wiki notes it does not help on dirt).
- **Falling off the course:** Lakitu fishes the kart out and puts it back on the road, faster than in earlier games.

## Assists and controls

- **Smart Steering:** steers the kart back onto the road when it is about to leave it, allows tighter turns, and blocks the Ultra Mini-Turbo ([Smart Steering](https://www.mariowiki.com/Smart_Steering)).
- **Auto-accelerate:** the kart accelerates by itself (races only).
- **Tilt (motion) steering:** turned on from the pause menu; works on Joy-Con held sideways and the Pro Controller.
- Buttons: accelerate, brake and reverse, drift/hop/trick, use item, look behind.

## Items

- Item boxes sit in rows across the road. MK8DX lets a racer hold two items, and double item boxes give two at once ([MK8DX](https://www.mariowiki.com/Mario_Kart_8_Deluxe)).
- Odds depend on place and distance from the leader. Leaders get defensive items (bananas, green shells), the middle of the pack attacking ones (triple red shells, fire flower), the back catch-up items (star, bullet bill). Per-place tables: [item probability distributions](https://www.mariowiki.com/Mario_Kart_8_item_probability_distributions) (for the Wii U version; check how MK8DX differs before using them).
- Our items get our own names and art.

## Measured from a screenshot (first reading, to be reviewed)

Measured by Claude on 2026-10-24 from one in-race screenshot of Mario Kart Stadium's starting line (1280x720, the kart seen from behind by the normal chase camera, from the Super Mario Wiki's course page). Only these numbers are kept, not the image. The edges and the kart were read off zoomed crops with a pixel grid, and widths compared on the row where the rear wheels touch the road (a flat road's width in pixels shrinks evenly toward the vanishing point, so a road and a kart on the same row compare directly).

- **Kart's share of the screen width:** 186 of 1280 px, **14.5%**, measured across the rear tyres. Our camera (6.5 behind, 2.4 above, 65 degrees vertical, 16:9) gives about 12% by calculation, so ours sits a little further back; the camera felt fine on the M6c device run.
- **Road width:** **about 9 kart widths** from the yellow edge line on the left to a white dashed line on the right (reading A). Past the dashed line the asphalt continues to a yellow line by the pit wall; counting that too gives about 14 (reading B). Which one is the racing road is uncertain from one picture; reading A looks like the racing surface. Ours is 16 units, 9.6 kart widths at the tyres (1.66 wide), so it matches reading A.
- **Limits:** one screenshot, of a start straight (often wider than the rest of a course), and a JPEG. It may be from the Wii U version, whose camera and proportions are the same as MK8DX's.
- **What it is for:** a sanity check of our world's scale (road and camera against the kart), not a width to copy. Real courses vary their width all the way round, and we design our own courses (we never copy Nintendo's layouts). What makes a course feel like MK8DX is how its widths and turns compare with the kart's speed and turning, which M7a tunes by feel.

## Course patterns (M7b study, to be reviewed)

Studied by Claude on 2026-10-24 to design our own course (`host/games/kart-3d/seaside-skyway.js`). Patterns and proportions only: no layout was traced or copied. Sources: the Super Mario Wiki's course pages for [Mario Kart Stadium](https://www.mariowiki.com/Mario_Kart_Stadium), [Water Park](https://www.mariowiki.com/Water_Park), [Sweet Sweet Canyon](https://www.mariowiki.com/Sweet_Sweet_Canyon), [Thwomp Ruins](https://www.mariowiki.com/Thwomp_Ruins), [Mario Circuit](https://www.mariowiki.com/Mario_Circuit_(Mario_Kart_8)) and [Excitebike Arena](https://www.mariowiki.com/Excitebike_Arena) (layouts in words, staff ghost times), the 150cc records at [mkleaderboards.com](https://www.mkleaderboards.com/mk8dx/world_records/standard), and the fan odometer measurement cited above. The wiki pages describe layouts in words and rarely give sharpness, widths or counts, so the counts below also lean on Claude's general knowledge of the courses' maps: they are approximate, and worth checking against a course map or footage. No footage was watched for this study.

### Numbers

- **Lap time at 150cc:** the time trial records (a whole race, with three mushrooms) are 1:34 to 2:01 on 41 of the 48 courses, so **31 to 40 s a lap**. The other seven are shorter (Baby Park 1:02, SNES Donut Plains 3 1:12, N64 Rainbow Road 1:19, GBA Mario Circuit, Big Blue and Wii Moo Moo Meadows about 1:23, SNES Rainbow Road 1:25); some of them are not three laps of one loop. Nintendo's staff ghosts, closer to a good normal player, take 1:53 to 2:12: **38 to 44 s a lap** (Mario Kart Stadium 1:53.191, Excitebike Arena 1:58.808, Water Park 2:02.186, Sweet Sweet Canyon 2:07.205, Mario Circuit 2:08.501, Thwomp Ruins 2:12.125). A whole race is about two minutes.
- **200cc:** staff ghosts take about 0.7 of their 150cc time (Mario Kart Stadium 1:21.984, Water Park 1:22.799), less than the 1.5 times speed suggests, since 200cc needs braking.
- **Lap length:** one data point, Excitebike Arena at about 947 m a lap (fan odometer). Its staff ghost laps in 39.6 s, so a good lap averages about 24 m/s.
- **Our scale:** at our tuned top speed (32 units/s) a 38 to 40 s lap is about 1200 units. Our course is 1213 units.

### How the courses are put together

- **Straights:** the start/finish straight is the longest, about 3 to 5 s of driving. The others are short, 1 to 3 s; a course rarely goes more than about 5 s without a corner, a jump or some other feature.
- **Corners:** roughly 7 to 10 corners a lap worth a drift, and a good player drifts almost every one. A typical mix: one or two long sweepers where a held drift reaches purple (2.8 s or more of hard drifting), several medium corners of about 90 degrees (orange), a quick S-bend or chicane where the drift's side flips (blue at most), and one hairpin, often on a climb or a drop (Mario Kart Stadium's raised hairpin).
- **Road width:** wide at the start and in open areas, narrower on bridges and in tunnels. Many courses split into parallel paths that rejoin (Mario Kart Stadium's three lanes, Thwomp Ruins' three routes, Sweet Sweet Canyon's two anti-gravity paths).
- **Jumps:** one to three ramps or lips a lap where a trick boosts, and often a glide ramp in the last third (Mario Kart Stadium, Water Park, Mario Circuit, Thwomp Ruins).
- **Dash panels:** few, up to about four a lap, mostly on an alternative line (Mario Kart Stadium's outer red path) or before a ramp.
- **Anti-gravity:** usually one section a lap, in the middle part, twisting or banked, with posts or bumps that give spin boosts (Mario Kart Stadium after the split, Mario Circuit's Möbius loop, Water Park's loop).
- **Off-road shortcuts:** two to five a lap, almost all across grass or sand on the inside of a corner or between two paths. Nearly all need a boost; some can be done with a Super or Ultra Mini-Turbo or a trick instead (Mario Kart Stadium's final sand patch, Thwomp Ruins' rocks).
- **Item boxes:** rows across the whole road, usually two or three a lap (the wiki mentions two on Mario Kart Stadium), on wide straight parts: after the start, in the middle, before the last part.
- **Pacing:** a quiet start straight, a technical first part, a showpiece in the middle (anti-gravity, underwater, a cannon), a calmer straight with item boxes, then a flourish before the line (a glide, dash panels, a last corner with a shortcut).

### What our course takes from this, and what it leaves out

- **Taken:** a 1213-unit lap; a start straight of about 4.7 s; a long banked sweeper for purple, two 90 degree corners for orange, a chicane and an S-bend that flip the drift, and a hairpin; the road 13 to 20 units wide (about 8 to 12 kart widths), narrowest on a bridge with no walls and widest on the sweeper and the item-box straight; one jump with a trick; one anti-gravity section mid-lap; two dash panels (one before the jump, one off the middle of a grass straight); grass on the inside of the hairpin and the last corner, to clip with a mini-turbo; quiet and busy parts in turn.
- **Measured on it** with the CPU karts' driver (the middle lane, braking for every corner, never drifting, from a standing start at the back of the grid): 3 laps in 117 s at 150cc (39 s a lap), 94 s at 200cc, 129 s at 100cc and 143 s at 50cc. Nobody falls off at any class.
- **Left out for now:** gliding, underwater, path splits (our track model has one centre line; a split needs a second route), course hazards, and item boxes (items come after M7). The quiet wide straight after the hairpin is where item boxes will go.

## Look and feel

From watching the game, not from data. M6b checks the camera against footage.

- **Camera:** chase camera behind and above the kart. It lags a little in turns, swings out during drifts, and pulls back or widens during boosts.
- **Look:** bright saturated colours, glossy karts with reflections, soft shadows, glow (bloom) on lights, lots of dynamic lights.
- **Particles:** drift sparks in the level's colour, boost flames, dust when off-road, sparks along walls.
- **HUD with one player:** item slots top left, coins and lap bottom left, place bottom right ([MK8DX](https://www.mariowiki.com/Mario_Kart_8_Deluxe): the coin counter moved to the bottom left).
- **Rumble:** the Switch rumbles on bumps, hits and boosts. On phones, Android Chrome has `navigator.vibrate`; iOS Safari does not ([caniuse](https://caniuse.com/mdn-api_navigator_vibrate)), so iPhones get visual cues only.
