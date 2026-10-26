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

- **Taken:** a 1213-unit lap; a start straight of about 4.7 s; a long banked sweeper for purple, two 90 degree corners for orange, a chicane and an S-bend that flip the drift, and a hairpin; the road 13 to 20 units wide (about 8 to 12 kart widths), narrowest on a bridge with no walls (walled since the M7d3 device run) and widest on the sweeper and the item-box straight; one jump with a trick; one anti-gravity section mid-lap; two dash panels (one before the jump, one off the middle of a grass straight); grass on the inside of the hairpin and the last corner, to clip with a mini-turbo; quiet and busy parts in turn.
- **Measured on it** with the CPU karts' driver (the middle lane, braking for every corner, never drifting, from a standing start at the back of the grid): 3 laps in 117 s at 150cc (39 s a lap), 94 s at 200cc, 129 s at 100cc and 143 s at 50cc. Nobody falls off at any class.
- **Left out for now:** gliding, underwater, path splits (our track model has one centre line; a split needs a second route), course hazards, and item boxes (items come after M7). The quiet wide straight after the hairpin is where item boxes will go.

## The look, part by part (M7d1 study, to be reviewed)

Studied by Claude on 2026-10-25 for the M7d kit (M7d2), the rebuilt Seaside Skyway (M7d3) and the karts (M7d5, planned as M7d4 then). Unlike the earlier studies, this one comes mostly from looking at screenshots, not from wiki text: the wiki pages say almost nothing about how things look. Claude downloaded 22 in-game screenshots and official artworks from the Super Mario Wiki's pages, looked at each one (zooming into crops for the dash panel and the asphalt), and threw the images away afterwards; only these notes are kept. Courses looked at: [Mario Kart Stadium](https://www.mariowiki.com/Mario_Kart_Stadium) (5 shots), [Mario Circuit](https://www.mariowiki.com/Mario_Circuit_(Mario_Kart_8)) (3), [Toad Harbor](https://www.mariowiki.com/Toad_Harbor), [Wii Koopa Cape](https://www.mariowiki.com/Koopa_Cape), [Wii Daisy Circuit](https://www.mariowiki.com/Daisy_Circuit), [3DS Toad Circuit](https://www.mariowiki.com/Toad_Circuit), [DS Cheep Cheep Beach](https://www.mariowiki.com/Cheep_Cheep_Beach), [Dolphin Shoals](https://www.mariowiki.com/Dolphin_Shoals) (2), [Sunshine Airport](https://www.mariowiki.com/Sunshine_Airport) (2), [Cloudtop Cruise](https://www.mariowiki.com/Cloudtop_Cruise) (2) and [Water Park](https://www.mariowiki.com/Water_Park) (one shot each where no count is given); plus the [Standard Kart](https://www.mariowiki.com/Standard_Kart) page and the Deluxe artwork of Mario in it. No footage was watched, so nothing here says how things move unless it says so. Sizes are by eye, against the kart in the same picture (our kart is 2 units long and 1.66 wide at the tyres), and are good to about a third. Some shots are from the Wii U version, which looks the same.

### What makes it read as MK8DX

What the screenshots have in common, and what M7c's look lacks most:

- **Every surface has a texture made of real material.** Coarse asphalt with stones in it, paint that shows the asphalt through it, riveted metal plates, wood grain, rock in layers, grass you can see blades in. Nothing large is a flat colour. M7c's road is a flat grey with a faint grain, and its walls, posts and props are flat colours.
- **Lots of small things beside the road.** Sponsor boards, cones, tyre stacks, pipes, flags, bunting, lamp posts, spectators, trucks. Seen from the kart, the edge of the road is never empty for long.
- **Each course has a theme and dresses every piece in it,** the start gate included (a harbour town's lamps and striped rails; Koopa Cape's warp-pipe gate and block curbs; Cloudtop Cruise's wooden sign held up by beanstalk vines).
- **Bright, saturated colour under a warm sun:** soft long shadows, a deep blue sky, white cumulus clouds, haze toward the horizon, lens flare when looking at the sun. Plastic and paint are glossy (a sharp highlight on karts, characters' heads, item boxes); everything else is matte.
- **Chunky, rounded, toy-like shapes:** bevelled edges, bolts and rivets that are big enough to see, bulging pipes and blocks.

### Road surfaces and their textures

- **Asphalt** (Mario Kart Stadium, zoomed in): coarse aggregate, three tones: a mid-grey base, light grey to white stones and dark gaps between them, with high contrast (much more than our grain's "about 0.9"). Near the camera, a stone is about a tenth of a rear tyre's width, about 0.04 of our units. It stays crisp far down the road, so the texture must be filtered at grazing angles (Three.js `texture.anisotropy`; ours was in fact already 8 since M7c, which this study missed). Other courses vary: Mario Circuit's asphalt is darker and smoother, Toad Harbor's is warm grey with lighter patches, Toad Circuit's is light. None shows an obvious repeat, so the texture needs a large-scale variation on top (patches, a darker racing line) to hide its tiling.
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
- **Character look:** soft, glossy, rounded shapes with clean colours. A cap with an emblem, big round eyes, a big nose. Our drivers are procedural, so M7d5 can only reach a clean toy version of this.

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

Not in the kit: glide ramps and spin-boost posts in anti-gravity sections (they need new rules: M9), coins and item boxes (M8), anything at night (Seaside Skyway is a day course). Approved at the review: the whole list above. Built in M7d2: 1-11 and 14, plus decks beside the road for props to stand on (the road floats). Built in M7d3, for Seaside Skyway: 12 and 13 (the lighthouse in Daisy Circuit's stone with a green balcony and orange dome; a blimp for the airship), plus turn boards, hot-air balloons, beach and garden props, and backdrop cliffs.

### Limits of this study

- 22 pictures, all chosen by the wiki's editors (start lines and press shots more than ordinary corners). No footage, so movement (scrolling chevrons, flags, water) is from general knowledge of the series, not seen.
- Sizes are by eye against the kart, good to about a third.
- The in-game brands (Bowser Oil and the rest) are Nintendo's designs. Copying them is fine for this private game (see "What we copy and what we do not").

## The kit's objects up close (M7d4 study, to be reviewed)

Studied by Claude on 2026-10-26 for M7d4, after the M7d3 device run found that, up close, most of the kit's composite objects plainly show the few simple shapes they are built from. This study looks at how MK8DX builds the same objects up: the smaller parts that cover and break up each big shape, and the texture on each part. Claude downloaded 33 screenshots from the Super Mario Wiki ([Toad Harbor](https://www.mariowiki.com/Toad_Harbor) (6), [Mario Kart Stadium](https://www.mariowiki.com/Mario_Kart_Stadium) (3), [Wii Daisy Circuit](https://www.mariowiki.com/Daisy_Circuit) (10, the Deluxe "View" shots, most at 1280 or 2560 wide), [Wii Koopa Cape](https://www.mariowiki.com/Koopa_Cape) (3), [DS Cheep Cheep Beach](https://www.mariowiki.com/Cheep_Cheep_Beach) (4), [Mario Circuit](https://www.mariowiki.com/Mario_Circuit_(Mario_Kart_8)) (3), [3DS Toad Circuit](https://www.mariowiki.com/Toad_Circuit) (one 2880-wide shot) and [3DS Wuhu Town](https://www.mariowiki.com/Wuhu_Town) (3)), enlarged crops of the objects in them, and rendered our own pieces at kart height on Seaside Skyway in a scratch viewer to compare side by side. The images were deleted afterwards; only these notes are kept. Sizes are by eye against the kart, good to about a third, as before. At the split (plan.md, M7d4) the user chose the promenade railing of the two new styles below (not the chevron guard), and asked for M7d4a to be built from the study as written; what it built is in "M7d4a" in `docs/3d-findings.md`.

### What every MK8DX object has that ours lack

Six things, true of almost every object in the shots, and missing from most of ours:

1. **No sharp edges.** Every block, post, board, slab and pipe has a rounded or bevelled edge, wide enough to catch a line of light (a bevel of about a tenth of the part's thickness: a 0.5-thick block has a bevel of about 0.05). Ours are mostly sharp boxes and cylinders, which read as flat colour cut-outs. `roundedBox` in `shape-utils.js` exists since M7d2 but few pieces use it.
2. **Two scales of parts.** A big shape always carries smaller parts on it: a frame round every board, a cap and a foot on every post, collars and bands round poles, bolts at corners, seams between plates, a trim along the top and bottom of a wall, a plinth under a tower. Rule of thumb from the shots: any part bigger than about a kart has three or more smaller parts on it, and any part as big as a kart's wheel has at least a bevel and one detail (a bolt, a band, a cap).
3. **Layered, overlapping pieces instead of one surface.** Tree canopies are tiers of overlapping leaf "scales" (Toad Circuit, Mario Circuit), not one round blob; thatch has a thick ragged edge in layers (Cheep Cheep Beach); a palm trunk is a stack of rings, each a little cone flaring over the one below (Daisy Circuit); cliffs are big rounded slabs of rock stacked with dark seams between them (Mario Circuit, Toad Circuit), not thin flat bands; a grassy top is a thick slab with a rounded lip that overhangs the rock.
4. **Textures show relief.** Stone joints, wood grain, rivets, plate seams and roof tiles are lit as relief: light on the edge toward the sun, a dark line in the crease. Ours paint the pattern in colour only, so it vanishes when the light is flat. In Three.js this is a bump map (or normal map) drawn from the same height field as the colour texture: cheap, since our textures are already drawn on canvases.
5. **Dark creases.** Where two parts meet (a post into its foot, a board into its frame, a rock under its grass) the meeting line is darker, as if lit less (ambient occlusion). Ours are evenly lit, which flattens them. A darker vertex colour or texture edge along such lines gives most of it.
6. **Fat, toy proportions.** Rails are fat, posts are chunky, blocks are big; nothing is thin or wiry except chain-link mesh and the bars of railings, and those still have thick posts. Our striped rail, lamp posts and fence posts are thin by comparison.

Surfaces are clean, saturated colour with a little wear: lighter edges where paint is rubbed, a few stains low down, a soft gradient from top to bottom. Mostly matte, with glossy parts that are plastic, paint or glazed (mushroom caps, warp pipes, the lighthouse dome, the striped rail's paint).

### Barriers

- **Padded wall with sponsor boards** (Mario Kart Stadium, Toad Harbor, Daisy Circuit). At Mario Kart Stadium the wall's top is a fat, rounded purple pad (like a cushion, its cross-section half a circle) with MARIOKART printed tone on tone along it, and a blue painted strip with white lettering on the road in front of it. At Toad Harbor each ad is a printed banner stretched over a low wall, in bold pictures, not only words: Donkey Kong's face on Burning DK, a dolphin on Super Marine World. At Daisy Circuit the boards are framed signs (a raised rim round each, two short legs) standing in front of a fence of corrugated steel sheets (horizontal ribs) between capped posts. **Ours:** flat boards with logos of words only, set straight into a plain box with a flat blue strip on top, a chain-link fence above on bare poles. **To do:** a rounded pad along the top with a seam between pads; every board a framed panel (a raised rim, a bolt in each corner) with a little picture beside the brand's name; a darker foot along the bottom; the fence's posts with caps and feet and a top rail.
- **Striped rail** (Toad Harbor, seen closest of all the barriers): two fat rails, oval rather than round (about 0.35 tall and 0.25 deep), in wide diagonal orange bands on white with worn edges; at each end and every few metres the rails sit in a chunky white post block with rounded edges and two bolt heads, on a wide concrete kerb with a bevelled top edge. **Checked again** (an enlarged crop of the Deluxe race start): each rail is taller and flatter than an oval, a padded bar with a flat face and well rounded top and bottom, about 0.4 tall and 0.2 deep, so the two rails nearly fill the height between the kerb and the top, with only a narrow dark gap and a thin dark rod between them; the stripes are slanted bands, not a spiral, and the white has a soft, padded, slightly dimpled look. **Ours:** two thin round tubes on thin posts with a ball on top: from the kart it reads as a wire fence. **To do:** fatter oval rails, chunky rounded post blocks with bolts in place of the thin posts, a thicker kerb with a bevelled edge.
- **Chevron guard** (Toad Circuit; a new style, optional): fat cream padded beams with rounded ends, three red chevrons printed on each, bolted to short round posts with caps, on the outside of corners. It does the job of our turn boards in one piece and looks more like MK8DX's circuits than our boards on posts.
- **Steel guardrail** (Mario Circuit, seen only from afar; **checked again** on Daisy Circuit, where the Deluxe views show it close): a tall corrugated steel beam with three ridges (like a road thrie-beam rather than a two-ridge W), about as tall as a kart, weathered warm grey with darker grime low down, bolts with square washers in its valleys, on posts behind it; framed sign boards on two legs stand in front of it, and a grey and white kerb runs along its foot. **Ours** is a W-beam about half a kart high: close for Mario Circuit's; **to do:** a deeper W, splice plates where beams join (one every 4 units, with a row of bolts), a cap on each post and a small reflector on some.
- **Rail fence** (Koopa Cape: posts and two flat rails painted pale grey-blue, posts with low pyramid tops; Cheep Cheep Beach: dark stained wood, square posts with bevelled tops and two thick round rails). **Ours:** plank rails and pointed posts with grain and bolts, already close. **To do:** bevel the posts and rails, a darker cut end on each post top, rails that pass in front of the posts and overlap at joints, a little unevenness in post height and lean.
- **Block curbs** (Koopa Cape; blue and white at Toad Circuit): a row of chunky blocks about as tall as they are deep, each with well rounded edges, set tight together so the row bends round corners like a chain, green and yellow in turn. No studs show in the MK8DX shots (the M7d1 note said studs from a Wii-era picture). **Ours:** long sharp-edged bricks with flat studs, reading as toy bricks. **To do:** shorter, rounded blocks without studs, a slight gap between blocks, each with a soft gradient (lighter on top).
- **Promenade railing** (Daisy Circuit; a new style, optional, for the seaside): blue iron round posts, each with a ball cap, a collar and a flared foot, two round rails between them; every few posts a square stone pillar with a cap slab and a carved round plaque on its face, some carrying a lamp. **Checked again** (two more Deluxe views): the plaque is Daisy's flower in relief, gold on brown, not a plain disc; the posts' ball caps are big, about twice the post's width. The road's edge below it is a thick seawall coping with a rounded edge.
- **Plain wall and anti-gravity wall** (no close MK8DX reference): a seam between panels every few units, a cap along the top and a darker foot.
- **The ledge under every barrier:** Daisy Circuit's seawall has a coping stone along its edge with a rounded nose, and darker wet stone lower down. **Ours:** a plain concrete strip. **To do:** a rounded nose along the outer edge and a darker band at the bottom.

### The start gate and start lights

- **Gate** (Mario Circuit, Mario Kart Stadium, Toad Harbor): never a sign on two smooth posts. Mario Circuit's posts are brick pillars on a stone plinth, with gold bands, a stone cap and an emblem on top; a thick dark green iron arch springs from them with collars at its joints, and the sign hangs under it: a red board with a raised rim and chrome letters standing out from it. Mario Kart Stadium's is a huge riveted capsule with red and blue stripes and screens. Toad Harbor's posts are panels in yellow and orange, a bolt in each corner and a seam between panels, on a black base with a carbon-fibre weave and bolts. **Ours:** a flat sign with a printed rim on two smooth white boxes. **To do:** posts made of a plinth, panels with seams and bolts, bands and a cap; the sign a thick board with a bevelled rim and its letters raised from it; a frame or arch behind the sign; the mushroom badge given a rim.
- **Start lights** (Lakitu's): a black box with three round lamps sunk in deep round hoods, held by a frame. **Ours** is close; **to do:** a bevelled box, deeper hoods, the hanging frame with brackets.

### Props beside the road

- **Street lamps** (Toad Harbor: dark iron posts with gold bands, a spike finial and scrolled brackets holding round globes; Daisy Circuit: three four-sided lanterns with pyramid roofs and finials on a crossbar, the post rising from a square stone pedestal with a plaque, flaring at its foot with collar rings). **Ours:** a thin black post with a curved arm and a box lantern; a post with three lanterns. **To do:** a pedestal or flared foot, collars and bands, a finial, framed glass panes, a scroll under the arm.
- **Palms:** Daisy Circuit's trunk is a stack of rings, each a cone flaring out over the one below with a zigzag lower edge, orange-brown with darker lines between rings; its fronds are few and broad. Toad Harbor's and Cheep Cheep Beach's are tall and slender with a scaly ringed trunk and many-bladed fronds. **Ours:** a trunk of flat rings and many-bladed fronds, close to Toad Harbor's. **To do:** rings as overlapping flared scales with bark texture, a darker crease under each; fronds with a lighter midrib and two greens.
- **Trees:** Toad Circuit's round tree is a canopy of three or four tiers of overlapping leaf scales (each a curved plate with a rounded tip, lighter on top, darker underneath), on a short thick trunk flaring at the root. Mario Circuit's are lumpy clumps with a leafy texture. **Ours:** spheres of clumps with flat colour. **To do:** tiers of scales, or clumps with a leaf texture and a darker underside.
- **Hedges and flowers** (Daisy Circuit): long hedges shaped like loaves with a fuzzy, mossy texture of short blades, with big five-petal pink flowers (a yellow middle) stuck on them; flowers in terracotta pots. **Ours:** rounded hedges with small pink dots. **To do:** a furry leaf texture with relief, bigger flowers with petals.
- **Cones** (Daisy Circuit, Toad Harbor): striped (red and white, or blue and white) on a square base with bevelled corners. **Ours:** a plain cone on a base. **To do:** the base bevelled, stripes.
- **Tyre stacks and drums** (Mario Kart Stadium): tyres with a deep tread and a rounded sidewall, four or five high; yellow oil drums with ribs and a printed label (a checkered flag, a mushroom). **To do:** tread and sidewall on the tyres, ribs and labels on our barrels.
- **MKTV van** (Mario Kart Stadium): a windscreen in a frame, a grille and headlights, side mirrors, a bumper, a roof rack with the dish on a mount and a Toad with a camera on top. **Ours:** a box with a stripe, dark windows and a dish. **To do:** most of those parts.
- **Warp pipes and giant mushrooms** (Toad Circuit): the pipe glossy green with a fat rim lip, a dark inside and a highlight down its side; the mushroom's cap glossy with a soft, thick rounded rim, gills under the cap, a cream stem that widens at the foot. **Ours:** similar shapes with sharper rims. **To do:** fatter rims, gills, a foot.
- **Grandstand** (Toad Circuit): two decks of stepped seating, each deck on silver lattice truss columns, a cantilevered roof with a railing along its edge, floodlight boxes on poles above (a white box with a grid of round lamps), a MARIOKART board along the front, stairs at the side; the crowd sits in rows on the steps. **Ours:** one box with sloped seats, a flat roof on posts and boards along its front. **To do:** steps that show as steps, truss columns, a roof edge with railing, a fascia with a sign, stairs.
- **Sponsor stand:** Mario Circuit's "Nintendo" board is a white board in a frame on two feet. **Ours:** an A-frame of two boards. **To do:** a frame round each board, bevelled legs and feet.
- **Beach props** (Daisy Circuit and Toad Harbor, seen only from afar): parasols in bright single colours or stripes with ribs and a scalloped edge; loungers. **Checked again** (Daisy Circuit's grandstand terraces, seen close in a Deluxe view): its parasols are shaped like flowers, a canopy of eight to ten rounded petals in one bright colour each (yellow, orange, magenta, blue) on a thin pole, standing among the crowd; Toad Harbor's market awnings also end in a scalloped edge. **To do:** ribs and a scalloped (or, for a Daisy-style course, petal) edge on the parasol, a slatted lounger.

### The surroundings

- **Stilt huts** (Cheep Cheep Beach): a thick thatch roof with a ragged, layered edge and a ridge cap; plank walls; a deck with plank rails and flower boxes of red flowers; white posts with a rope rail along the walkway. **Ours:** a plank hut with a smooth thatched pyramid roof. **To do:** the thatch's thick layered edge and ridge, flower boxes, rope rails.
- **Lighthouse** (Daisy Circuit): irregular stones (crazy paving, not rows of blocks) with deep mortar; white arched window frames; a smooth tan plinth; a green balcony ring with a railing of balusters; a white lamp room with orange window frames; a glossy orange dome and a green clover-shaped weathervane on top. **Ours:** stone in regular rows, small windows, plain railing. **To do:** irregular stones with relief, arched framed windows, balusters, the weathervane.
- **Koopa shell** (Koopa Cape): grooved scutes on a green dome, a rim made of a ring of fat rounded white lobes (each scute's edge a separate puffy pad), a dark underside. **Ours:** scutes drawn on the dome, a smooth cream rim. **To do:** a rim of lobes, grooves with relief.
- **Cliffs and floating islands** (Mario Circuit, Toad Circuit): rock as big rounded slabs with dark seams between them, warm tan to orange; the grass on top a thick slab with a rounded lip hanging over the rock. **Ours:** smooth banded lathes. **To do:** slabs and seams in the rock (shape and bump), a thick grass lip.
- **Boats** (Daisy Circuit): a white motor yacht with two decks, rails, windows and a lifebuoy; a cruise ship on the horizon. **Checked again** (three Deluxe views): the yacht has a raised bow with a curved sheer line, a thin rail of posts round its foredeck, a cabin with big brown-framed windows and a lifebuoy on its side, and a flybridge on top with a rail and a frame over it; its stern is a flat transom with a swim platform. The cruise ship is long and white with an orange stripe at the waterline, two rows of small windows, a two-level superstructure, a funnel and a mast at each end. **Ours:** sailboats with a cabin. **To do:** rails, portholes, a fender line; a motor yacht like Daisy Circuit's would suit a harbour better than more sailboats.
- **Clouds, balloons, the airship and the trusses** are seen only from afar in MK8DX as in our race; they look close enough already and come last.

### How to build it, and what it costs

- **Shared tools first:** bevelled shapes for every part (`roundedBox` and a bevelled cylinder), a bump map drawn from each texture's height field (stone joints, plank seams, rivets, grain), and darker creases where parts meet (vertex colour). Each piece then gets its smaller parts.
- **Triangles:** the M7d3 census found the dressing's triangles spread over hundreds of instances, and the iPad held 80-90 fps with 4 players on High. Bevels multiply the triangles of instanced parts (a box's 12 becomes about 100), so bevel only what is seen near the road and keep the far surroundings' detail in textures and bump maps rather than geometry. Each part of M7d4 measures its census before and after.
- **Order by how much is seen:** the barriers line every metre of the lap and the gate and start lights are seen at every start, so they come first; then the props on the decks; then the surroundings, seen from far away.

### Limits of this study

- 33 pictures, mostly the wiki's press shots and Deluxe "View" shots, a few at 2560 wide; the barriers and props near the road were seen close, the surroundings only from afar. No footage.
- Checked again after M7d4a, as asked at the review, from 20 more pictures (Nintendo's trailer stills and the Deluxe views in the Mario Wiki's game galleries; the Mario Kart fandom wiki refused downloads): the guardrail, the parasols, the boats and the striped rail are now seen close on Daisy Circuit and Toad Harbor, and their notes above say what changed. Mario Circuit's own guardrail still appears only small.
- The striped rail's and the guardrail's sizes and the bevels are by eye from crops, good to about a third.
- No footage was watched, so nothing here says how things move (scrolling chevrons, flags, water): a written description of motion would be general knowledge of the series, not a source. Checking it needs gameplay video, which Claude cannot watch.

## How games look detailed and still run smoothly (research, after M7d4a)

Asked after M7d4a, whose rebuilt barriers looked only slightly better while Seaside Skyway's triangles grew by half: how do games like MK8DX look so detailed and run smoothly, and what do people do with Three.js? Researched by Claude on 2026-10-26 from web sources (listed below); no footage or captures of the game were analysed, so what is said of MK8DX's own pipeline is what others report or infer.

### Triangles are rarely what makes a frame slow

- **Our own measurements say the same.** M6a found the iPad's cost is pixels and bloom: 12 detailed karts (10,912 triangles each) added 0.3 ms, while doubling the pixel ratio doubled the frame. After M7d3 tripled the software frame, the iPad still held 80-90 fps with 4 players. So the triangles M7d4a added are unlikely to be the iPad's problem; its device run will say.
- **What does cost, in a browser:** draw calls (each mesh and material is a separate request from the CPU; guides aim for about 100 a frame on mobile), pixels times shading work (every pixel of a lit, textured, shadowed material runs a costly shader, more than once where see-through things overlap), shadow passes (every shadow caster is drawn a second time into the shadow map), and post-processing such as bloom. Mobile GPUs draw the screen in small tiles; Arm's guidance is to keep triangles big enough to cover at least 10-20 pixels each, since many tiny triangles waste work, and to use simpler models for distant objects (level of detail).
- **Where triangles do matter:** tiny, many-times-repeated parts far away (bolts, posts) that cover a pixel or two each, and anything in the shadow pass. Our census counted 831,000 in Seaside's scene but 1,305,000 drawn, because the shadow pass draws casters again.

### Where MK8DX's detail comes from

- **Simple, carefully built models with clean textures.** A modeller on Polycount who reviewed the models says the designs are "responsible for 99% of the look": tight UVs and "simple and clean" material maps. Another poster found Nintendo's Captain Toad model uses only three maps: colour (albedo), normal and specular.
- **Lighting more than geometry.** On MK8DX's Leaf Cup trophy, the Tanooki Mario design is only light moving across a smooth surface, through its normal and specular maps; the model itself is plain. Digital Foundry noted "a convincing combination of real-time and pre-baked shadows that even take occluded edges into account" (soft darkening in corners, baked ahead of time) and many dynamic lights, which it guessed came from deferred rendering. Mario Kart World still bakes much of its lighting, with real-time shadows only for things that move.
- **The game way of "more detail":** sculpt or model a detailed version, then bake its fine detail (bolts, seams, panel edges, grain) into a normal map and an ambient occlusion map laid on a simple model. The simple model keeps the silhouette; the maps make light behave as if the detail were there. That is exactly the detail M7d4a added as geometry.
- **Performance budget:** MK8 ran at 720p on the Wii U, 1080p docked on the Switch, without anti-aliasing, at 60 fps for 1-2 players and 30 fps for 3-4.

### What people do with Three.js to look good and run well

- **Detail in textures, not triangles:** normal maps (`normalMap`), ambient occlusion maps (`aoMap`) and roughness maps on simple shapes; textures up to about 2048 with mipmaps and anisotropy rather than larger. GPU-compressed textures (KTX2, loaded by `KTX2Loader` with the Basis transcoder, a WebAssembly file) take about 4-8 times less GPU memory than PNG or JPEG.
- **Baked lighting:** light and ambient occlusion baked into textures (`lightMap`, `aoMap`) or vertex colours ahead of time, usually in Blender, cost nothing per frame. In-browser bakers exist (react-three-lightmap renders the bake on a hidden canvas) but are slow for big scenes.
- **Fewer draw calls:** `InstancedMesh` (we use it) and `BatchedMesh` (different shapes sharing one material in one call, each still culled on its own); merging is fine for static scenery, but a merged mesh is drawn whole whenever any of it is in view.
- **Culling and LOD:** objects outside the camera's view are skipped only if they are separate objects with tight bounds; `LOD` swaps in simpler models with distance.
- **Cheaper shadows:** cast shadows only from pieces big enough for the shadow to show; keep the shadow map small on mobile (512-1024); fit the shadow camera tightly; draw static shadows once (`shadow.autoUpdate = false`) when nothing moves.
- **Pixel cost:** keep the pixel ratio low, run post-processing such as bloom at half resolution, lower quality automatically when the frame rate drops, and use cheaper materials (Lambert, unlit with baked light) for distant or small things.
- **Lighting:** an environment map (`scene.environment`) lights and reflects everything for one cost; three or fewer real lights.

### What this means for us

- **Our merged meshes are never culled.** Each barrier style, the ledge and the decks are one mesh running round the whole lap, so all of it is drawn (twice, with shadows) even when it is behind the camera. Splitting them into stretches of the lap lets Three.js skip what is out of view.
- **Small parts cast shadows they do not need**, and they are drawn again in the shadow pass.
- **Our detail is in geometry and simple procedural textures,** where MK8DX puts it in textures and baked light. Normal maps drawn from a detailed version of a piece (rendered once while the game loads, or drawn on canvases as M7d4a's sign letters are), ambient occlusion baked into vertex colours or maps, and roughness maps would give more of the MK8DX look for fewer triangles.
- **CC0 texture sets** (ambientCG and Poly Haven publish colour, normal, roughness and ambient occlusion maps under CC0) are allowed by "Copy MK8DX's designs freely, build them ourselves" and would beat our procedural textures on material quality. KTX2 compression would need the Basis transcoder vendored into `host/vendor/`, a new kind of file to ask about first.
- **The biggest step would be hand-made models** (Blender, glTF, with baked maps), which is how MK8DX is built; that is the "bigger decision" M7d5 already notes, and would bring a Blender workflow outside the repo's code.
- Planned as a spike, M7d4b in `plan.md`, before more pieces are rebuilt.

Sources: [Nintendo Life on Digital Foundry's MK8 analysis (2014)](https://www.nintendolife.com/news/2014/05/digital_foundry_pins_down_mario_kart_8s_resolution_and_framerate); [Nintendo Wire on Digital Foundry's MK8 Deluxe analysis](https://nintendowire.com/news/2017/04/20/digital-foundry-tackle-mario-kart-8-deluxe-praise-performance/); [Nintendo Life on Digital Foundry's Mario Kart World analysis (2025)](https://www.nintendolife.com/news/2025/04/digital-foundry-digs-deep-into-mario-kart-worlds-tech-and-specs); [Nintenderos on the Leaf Cup trophy's lighting trick (2025)](https://www.nintenderos.com/2025/04/mario-kart-8-deluxe-usa-este-truco-en-uno-de-sus-trofeos/); Polycount threads on MK8's models and the Nintendo look ([one](https://polycount.com/discussion/comment/2654783), [two](https://polycount.com/discussion/comment/2655062)); Polycount and Blender Artists on baking normal maps from high to low poly ([one](https://polycount.com/discussion/206872/new-to-baking-normal-maps-for-games-objects), [two](https://blenderartists.org/t/normal-maps-and-it-usage-particularly-in-games/651814)); [Arm mobile graphics optimisation guide (2018 slides)](https://www.slideshare.net/OwenWu/mobile-graphics-optimization-guides); [Utsubo, 100 Three.js tips (2026)](https://www.utsubo.com/blog/threejs-best-practices-100-tips); [Three.js forum on BatchedMesh, merging and culling](https://discourse.threejs.org/t/when-is-it-actually-beneficial-to-use-lod-in-three-js-for-performance/87697/11); [Three.js forum on baking AO into vertex colours](https://discourse.threejs.org/t/how-would-i-begin-to-bake-lighting-ao-into-vertex-color-data/48689); [react-three-lightmap](https://github.com/pmndrs/react-three-lightmap); [Three.js KTX2Loader docs](https://threejs.org/docs/pages/KTX2Loader.html). The guides and forum posts are community advice, not official Three.js documentation.

## Look and feel

From watching the game, not from data. M6b checks the camera against footage.

- **Camera:** chase camera behind and above the kart. It lags a little in turns, swings out during drifts, and pulls back or widens during boosts.
- **Look:** bright saturated colours, glossy karts with reflections, soft shadows, glow (bloom) on lights, lots of dynamic lights.
- **Particles:** drift sparks in the level's colour, boost flames, dust when off-road, sparks along walls.
- **HUD with one player:** item slots top left, coins and lap bottom left, place bottom right ([MK8DX](https://www.mariowiki.com/Mario_Kart_8_Deluxe): the coin counter moved to the bottom left).
- **Rumble:** the Switch rumbles on bumps, hits and boosts. On phones, Android Chrome has `navigator.vibrate`; iOS Safari does not ([caniuse](https://caniuse.com/mdn-api_navigator_vibrate)), so iPhones get visual cues only.
