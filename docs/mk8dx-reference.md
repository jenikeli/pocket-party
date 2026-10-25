# Mario Kart 8 Deluxe reference (researched, not measured)

What the 3D kart race copies from Mario Kart 8 Deluxe (Nintendo Switch, "MK8DX" below), with sources. Read by the M6 and M7 chats when choosing rules and starting numbers. Researched on 2026-10-24 from fan wikis and guides, not measured by us, so measured findings (`docs/spike-findings.md`, `docs/3d-findings.md`) win where they disagree. The Super Mario Wiki tables come from the game's own data files; the rest is from guides and community timing, and says so where it is uncertain.

## What we copy and what we do not

- **Copy:** the mechanics, the numbers, the feel, the camera, the HUD layout and, since the M7c device run, the designs themselves: karts and drivers modelled on Mario Kart's, MK8DX's track pieces, signs, textures and course ideas, as closely as we can. The game is for private use only and is never published, so the takedown risk that made earlier milestones avoid this ([Nintendo Life, 2021](https://www.nintendolife.com/news/2021/01/nintendo_issues_mass_dmca_takedown_379_fan-made_games_forcibly_removed)) does not apply.
- **Do not:** extract files from the game (models, textures, sounds, music). We build every model and texture ourselves, procedurally where possible, or from CC0 assets such as [Kenney's Racing Kit](https://opengameart.org/content/racing-kit) (CC0, glTF: road pieces, barriers, flags, tents).

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
- Our items copy MK8DX's (names, looks and behaviour), built by us like everything else (see "What we copy and what we do not").

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

## The look, part by part (M7d1 study, to be reviewed)

Studied by Claude on 2026-10-25 for the M7d kit (M7d2), the rebuilt Seaside Skyway (M7d3) and the karts (M7d4). Unlike the earlier studies, this one comes mostly from looking at screenshots, not from wiki text: the wiki pages say almost nothing about how things look. Claude downloaded 22 in-game screenshots and official artworks from the Super Mario Wiki's pages, looked at each one (zooming into crops for the dash panel and the asphalt), and threw the images away afterwards; only these notes are kept. Courses looked at: [Mario Kart Stadium](https://www.mariowiki.com/Mario_Kart_Stadium) (5 shots), [Mario Circuit](https://www.mariowiki.com/Mario_Circuit_(Mario_Kart_8)) (3), [Toad Harbor](https://www.mariowiki.com/Toad_Harbor), [Wii Koopa Cape](https://www.mariowiki.com/Koopa_Cape), [Wii Daisy Circuit](https://www.mariowiki.com/Daisy_Circuit), [3DS Toad Circuit](https://www.mariowiki.com/Toad_Circuit), [DS Cheep Cheep Beach](https://www.mariowiki.com/Cheep_Cheep_Beach), [Dolphin Shoals](https://www.mariowiki.com/Dolphin_Shoals) (2), [Sunshine Airport](https://www.mariowiki.com/Sunshine_Airport) (2), [Cloudtop Cruise](https://www.mariowiki.com/Cloudtop_Cruise) (2) and [Water Park](https://www.mariowiki.com/Water_Park) (one shot each where no count is given); plus the [Standard Kart](https://www.mariowiki.com/Standard_Kart) page and the Deluxe artwork of Mario in it. No footage was watched, so nothing here says how things move unless it says so. Sizes are by eye, against the kart in the same picture (our kart is 2 units long and 1.66 wide at the tyres), and are good to about a third. Some shots are from the Wii U version, which looks the same.

### What makes it read as MK8DX

What the screenshots have in common, and what M7c's look lacks most:

- **Every surface has a texture made of real material.** Coarse asphalt with stones in it, paint that shows the asphalt through it, riveted metal plates, wood grain, rock in layers, grass you can see blades in. Nothing large is a flat colour. M7c's road is a flat grey with a faint grain, and its walls, posts and props are flat colours.
- **Lots of small things beside the road.** Sponsor boards, cones, tyre stacks, pipes, flags, bunting, lamp posts, spectators, trucks. Seen from the kart, the edge of the road is never empty for long.
- **Each course has a theme and dresses every piece in it,** the start gate included (a harbour town's lamps and striped rails; Koopa Cape's warp-pipe gate and block curbs; Cloudtop Cruise's wooden sign held up by beanstalk vines).
- **Bright, saturated colour under a warm sun:** soft long shadows, a deep blue sky, white cumulus clouds, haze toward the horizon, lens flare when looking at the sun. Plastic and paint are glossy (a sharp highlight on karts, characters' heads, item boxes); everything else is matte.
- **Chunky, rounded, toy-like shapes:** bevelled edges, bolts and rivets that are big enough to see, bulging pipes and blocks.

### Road surfaces and their textures

- **Asphalt** (Mario Kart Stadium, zoomed in): coarse aggregate, three tones: a mid-grey base, light grey to white stones and dark gaps between them, with high contrast (much more than our grain's "about 0.9"). Near the camera, a stone is about a tenth of a rear tyre's width, about 0.04 of our units. It stays crisp far down the road, so the texture must be filtered at grazing angles (Three.js `texture.anisotropy`; ours is not set). Other courses vary: Mario Circuit's asphalt is darker and smoother, Toad Harbor's is warm grey with lighter patches, Toad Circuit's is light. None shows an obvious repeat, so the texture needs a large-scale variation on top (patches, a darker racing line) to hide its tiling.
- **Painted markings show the asphalt through them.** The yellow edge line, white dashes, the start line and the painted checks of the pit area all carry the stone texture and look a little worn. So paint is best drawn into the road texture, or blended over the grain, not as clean flat strips.
- **Edge lines:** a solid line a little in from each edge (yellow at Mario Kart Stadium, white at Toad Harbor and Daisy Circuit, orange at Mario Circuit), white dashed lane lines on wide straights (Toad Harbor has four lanes), and at Daisy Circuit a narrow strip of small black-and-white checks between the curb and the road. Lines are about a fifth of a kart width wide.
- **Curbs:** red and white stripes on the inside of corners (Mario Circuit, Toad Circuit, Mario Kart Stadium's hairpin), each stripe about one to two kart lengths long and the curb about a kart width wide. At Toad Circuit they are cut at a slant and raised with a bevel. The pastel version (pink and white) is at Daisy Circuit. **Koopa Cape's are different:** a row of raised blocks with round studs on top, green and yellow in turn, like toy bricks, about half a kart high (see the new pieces below).
- **Start line:** a band of checks across the whole road, two rows (three at Mario Kart Stadium), about 14 to 24 squares across. Colours follow the course: black and white at Mario Kart Stadium and Mario Circuit, coral and pale teal at Toad Harbor, yellow and black at Koopa Cape. At Mario Kart Stadium the white squares are glossy.
- **Grid marks:** each starting place has a white bracket painted on the road, a bar across with short legs pointing back, open toward the kart behind it. A bracket is about two kart widths wide with legs about half a kart length. The places are staggered in two columns.
- **Other surfaces:** a riveted steel plate on ramps (Mario Kart Stadium: grey plates with seams and round bolt heads, big white chevrons painted on them); riveted, slightly blue metal panels on the track at Water Park and in anti-gravity pipes; pale concrete for an airport runway; packed tan dirt with small stones at Koopa Cape; cream sand with darker wet sand at the water's edge at Cheep Cheep Beach; grass-and-moss rock at Dolphin Shoals.
- **Grass** beside the road is bright, mown in stripes on circuits, with tall clumps of 3D grass blades at the edges at Mario Circuit.

### Dash panels, anti-gravity panels and ramps

- **Dash panel** (Cloudtop Cruise, zoomed in): a rectangle set in a raised grey metal frame. Inside it looks like a lit LED sign: fine lines across it, a gradient from yellow to orange to red, and two or three chevrons pointing forward whose edges are made of dots (the wiki calls the arrows "pixelated"). Chevrons are lighter than the panel. It is bright, but in the screenshots it does not bloom into a blur: the chevrons stay readable. The panel is drawn as glowing (it looks the same in a dark tunnel), but **is not** a light source on the road around it. Its size could not be measured well; ours (4 wide, 3 long) stays as the rules have it. By the usual Mario Kart look the chevrons scroll forward; no footage was watched to confirm it.
- **Anti-gravity panel** (Mario Circuit's panel where its anti-gravity section starts, and Water Park's glide ramp, which looks the same): a band across the whole road, glowing blue to cyan, made of the same fine lines, with white chevrons made of dots. M7c has no panel at the start of its anti-gravity section, only lines along the edges.
- **Anti-gravity road:** cyan glowing lines along the edges and dashed cyan lines down the middle at Mario Kart Stadium; the track itself is often metal there (rails on white struts). Karts' wheels turn flat and their rims glow cyan in anti-gravity (see the karts below).
- **Ramps:** a steel plate tilted up, with a bolted frame and big white chevrons (Mario Kart Stadium). Glide ramps are blue like the anti-gravity panel (we have no gliding).

### Barriers and fences

- **Padded walls with sponsor boards** (Mario Kart Stadium, Toad Circuit): low blue or purple walls, each panel a printed ad in bold colours (in-game brands: Bowser Oil in yellow and black, Lemmy's Tire Service, Golden Wheel, MKTV, Burning DK sports drink, Bullet Bill Speed Trial, Mario Motors, Super Marine World, Toad's Polar Expedition). A chain-link fence often stands on top.
- **Steel guardrail** (Mario Circuit): a silver W-shaped beam on short yellow posts, about half a kart high.
- **Striped guardrail** (Toad Harbor): two rounded rails painted in orange and white diagonal stripes, on a concrete base.
- **Seaside railings:** a grey rail fence of posts with pointed tops and two rails (Koopa Cape), and blue iron railings with round posts along a promenade (Daisy Circuit).
- **Stone walls** with moss along the edge on wild courses (Dolphin Shoals), and **tyre stacks** at Mario Kart Stadium.

### Lamps and lights (and whether they are lit by day)

- **By day, lamps are off.** Toad Harbor's iron street lamps (a dark post with a lantern of glass panes) and the lanterns hanging from Mario Circuit's start gate do not glow in daylight: they are just glass and metal in the sun. The M7c device run found the same: lit lamps in daylight look odd. **At sunset or night they are lit:** Daisy Circuit's three-headed lamps glow warm at sunset, and Mario Kart Stadium at night has floodlight towers, light beams and fireworks. So a lamp is lit only on a dusk, night or indoor course.
- **Lamp shapes:** an iron post with a curved arm and a lantern of four glass panes under a little roof (Toad Harbor, Mario Circuit); a stone or iron post with three lanterns on a crossbar (Daisy Circuit); short square post lights along the road at Mario Kart Stadium.
- **Lights that do glow by day:** the start lights (below), screens and LED signs, dash and anti-gravity panels, item boxes.

### Signs, banners and flags

- **Sponsor boards** everywhere: on walls, on A-frame stands, on fences, on the gate's posts. Bold logos with thick outlines in red, yellow, blue, white and black.
- **Turn boards:** red-and-white chevron boards round the outside of corners (Mario Circuit's last turn); ours are already like this.
- **Bunting:** strings of triangular pennants in pastel colours (purple, yellow, pink, blue, orange) across and beside the road (Mario Circuit, near its start gate).
- **Hanging banners:** tall vertical banners from the roof with cup emblems (Mario Kart Stadium), small banners on lamp posts (Toad Harbor).
- **Flags:** red pennant flags with an emblem on top of the start sign (Cloudtop Cruise); flags on poles along straights.
- **Course map screens and standings boards** in the pit at Mario Kart Stadium.

### The start gate and the start lights

- **Every course has a gate over the start line that says MARIOKART** in big letters, styled for the course: a yellow arch with white letters, a red base stripe and sponsor boards on its posts (Mario Kart Stadium); a dark green iron arch with hanging lanterns and a red board with chrome letters (Mario Circuit); two green warp pipes holding a red riveted frame with chain-link mesh and orange 3D letters (Koopa Cape); an oval wooden sign held by beanstalk vines (Cloudtop Cruise); an oval blue LED sign on yellow cranes with red-and-white checked posts (Sunshine Airport); a stone sign grown over with coral (Dolphin Shoals). A badge or emblem often sits on top (a mushroom "WELCOME" badge at Mario Kart Stadium).
- **The start lights:** Lakitu floats in front of the grid on a cloud holding a fishing rod with a black box of three round lamps, which light in turn for the countdown. We could hang a light box from our gate instead and light it with the countdown (drawing only, from the race's countdown).

### Scenery on seaside and sky courses

- **Water:** turquoise shallows over sand that turn deep blue further out, with white foam where water meets land (Cheep Cheep Beach, Koopa Cape). Ours is one blue.
- **Palms:** curved, ringed trunks and bright, many-bladed fronds that droop (Cheep Cheep Beach, Toad Harbor, Daisy Circuit).
- **Buildings:** thatched huts on stilts over the water (Cheep Cheep Beach), pastel houses with orange and yellow roofs (Toad Harbor), a stone lighthouse with a green balcony and an orange dome (Daisy Circuit).
- **Landmarks in the water:** a giant Koopa shell half sunk off Koopa Cape; a cruise ship on the horizon at Daisy Circuit.
- **Sky courses** (Mario Circuit, Cloudtop Cruise): islands floating in the sky with grass on top and cliffs in brown and orange layers below, round bushy trees made of clumps, roads on viaducts held up by steel trusses, a white lattice bridge; airships and huge cumulus clouds with blue-grey shading.
- **Plants:** hedges trimmed into rounded shapes with pink flowers (Daisy Circuit), tall grass clumps, giant flowers and vines.

### The sky and lighting

- **Day:** the sky is a deep saturated blue overhead, pale near the horizon, with big white cumulus clouds that are shaded blue-grey underneath. The sun is low enough to cast long soft shadows and is warm in colour. Looking toward it gives lens flare with ghost rings, sometimes a rainbow (Koopa Cape). Far things fade into a pale blue haze.
- **Sunset (Daisy Circuit):** orange and pink sky, the sun low on the sea, lamps lit, warm light on everything.
- **Lighting technique:** Digital Foundry praised the Wii U version's "vast array of dynamic light sources (headlights, item boxes, special effects)" and guessed it used deferred rendering ([Nintendo Life on Digital Foundry, 2014](https://www.nintendolife.com/news/2014/05/digital_foundry_pins_down_mario_kart_8s_resolution_and_framerate)). The Switch version runs at 1080p docked and 720p handheld ([Nintendo Wire](https://nintendowire.com/news/2017/04/20/digital-foundry-tackle-mario-kart-8-deluxe-praise-performance/)). No source describes its bloom or shaders; what we see is soft glow on lights, sharp highlights on glossy surfaces and soft shadows.

### The karts and drivers

- **The Standard Kart** (the Deluxe artwork and the wiki's Standard Kart page): an open go-kart.
  - The nose is a low wedge in the character's main colour, with a white band and the character's emblem in a white circle on the front.
  - A curved front fairing sweeps up from the nose to the height of the steering wheel and back round the driver's legs, white with a red edge.
  - Two flat side pods: a red top, a white stripe with a notch in it, and a blue lower half.
  - Behind the seat, two big black exhaust pipes point up and back over the rear wheels, ending in wide gold bell tips (the wiki: "black with yellow tips"). Between them sits an engine block with chrome bolts. At the back are a blue bumper and an amber rectangular tail light.
  - The steering wheel is small and black with a silver three-spoke hub, on a column from the nose, and the seat is a dark bucket.
- **Colours:** the body is in the character's three colours (the wiki: Mario's is red with white and blue, Luigi's green with white and dark blue, Peach's pink with white and yellow, Wario's yellow with white and purple). So each player can have a three-colour scheme, not one colour.
- **Standard tyres:** fat black tyres with a deep block tread and MARIOKART in white on the sidewall, with gold hubs that have three slots and a small centre cap. The rear tyres are bigger than the front ones.
- **How the driver sits:** upright and high. The driver is about three heads tall (big head, short body), the head as wide as the kart's body. Seated, the top of the head is about as high off the ground as the kart is long. The arms reach forward to the wheel, the feet go into the nose, and the gloves are white.
- **In anti-gravity** the wheels turn flat under the kart and their rims glow cyan (seen on several karts at Mario Kart Stadium and Cloudtop Cruise). We do not do this yet.
- **Character look:** soft, glossy, rounded shapes with clean colours. A cap with an emblem, big round eyes, a big nose. Our drivers are procedural, so M7d4 can only reach a clean toy version of this.

### New pieces for the kit (beyond what Seaside Skyway has)

Chosen from the courses above. Everything here is drawing only, unless it says it needs a rule. Recommended for M7d2 first, roughly in order of how much they add:

1. **The textured road:** asphalt with three-tone stones and large patches, worn paint for the edge lines, dashed lane lines and grid brackets, and textured curbs. This is the single biggest change.
2. **Start lights** that count down with the race: a box of three lamps hanging from the gate, lit red in turn and then green.
3. **A themed start gate with a MARIOKART sign** (letters drawn into a canvas texture), replacing M7c's blue posts and checkered beam.
4. **Sponsor boards** with in-game brands drawn on canvases, on the walls and on A-frame stands.
5. **Dash panel and anti-gravity panel** as lit LED-style panels: a gradient, fine lines, dotted chevrons scrolling forward, a metal frame; and a new full-width anti-gravity panel where an anti-gravity section starts.
6. **Ramp plate:** riveted steel with white chevrons, on our jump's lip.
7. **Block curbs:** Koopa Cape's raised studded blocks in green and yellow, for the edges of a seaside section.
8. **Bunting** strung across the road and along fences.
9. **Barriers:** a steel guardrail on posts, an orange-and-white striped rail, a seaside rail fence, chain-link fence on top of walls.
10. **Small trackside props:** cones, tyre stacks, warp pipes, a giant mushroom, an MKTV van.
11. **Street lamps** in two styles, unlit by day.
12. **Seaside pieces:** curved palms, huts on stilts, a stone lighthouse, turquoise shallows and foam rings round islands, a giant Koopa shell in the sea.
13. **Sky pieces:** floating islands with layered cliffs and round trees, steel truss supports under the road, an airship or blimp drifting by.
14. **A grandstand with a crowd** of small instanced spectators, and floodlight towers (lit only at night).

Not in the kit: glide ramps and spin-boost posts in anti-gravity sections (they need new rules: M9), coins and item boxes (M8), anything at night (Seaside Skyway is a day course). Approved at the review: the whole list above.

### Limits of this study

- 22 pictures, all chosen by the wiki's editors (start lines and press shots more than ordinary corners). No footage, so movement (scrolling chevrons, flags, water) is from general knowledge of the series, not seen.
- Sizes are by eye against the kart, good to about a third.
- The in-game brands (Bowser Oil and the rest) are Nintendo's designs. Copying them is fine for this private game (see "What we copy and what we do not").

## Look and feel

From watching the game, not from data. M6b checks the camera against footage.

- **Camera:** chase camera behind and above the kart. It lags a little in turns, swings out during drifts, and pulls back or widens during boosts.
- **Look:** bright saturated colours, glossy karts with reflections, soft shadows, glow (bloom) on lights, lots of dynamic lights.
- **Particles:** drift sparks in the level's colour, boost flames, dust when off-road, sparks along walls.
- **HUD with one player:** item slots top left, coins and lap bottom left, place bottom right ([MK8DX](https://www.mariowiki.com/Mario_Kart_8_Deluxe): the coin counter moved to the bottom left).
- **Rumble:** the Switch rumbles on bumps, hits and boosts. On phones, Android Chrome has `navigator.vibrate`; iOS Safari does not ([caniuse](https://caniuse.com/mdn-api_navigator_vibrate)), so iPhones get visual cues only.
