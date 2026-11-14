# Reference game notes (researched, not measured)

What the 3D kart race copies from the reference console kart racer (called "the reference game" throughout the repo). The numbers are fan-wiki data (the fan wiki's tables come from the game's own data files; the rest is guides and community timing), so our measured findings (`docs/3d-findings.md`) win where they disagree. The look studies were made by Claude from screenshots on the fan wiki's course pages (no footage, sizes by eye, good to about a third); only notes were kept, never images. The full studies with every source link are in git (`git show c091f14`, in its `docs/` folder).

## What we copy and what we do not

- **Copy:** the mechanics, numbers, feel, camera, HUD layout and the designs themselves (track pieces, signs, textures, course ideas), as closely as we can. The game is private and never published.
- **Do not:** extract files from the game. Every model and texture is built by us or CC0 (ambientCG, Poly Haven). The drivers are our own cast. We design our own course layouts.

## Race format

- 12 racers, players plus CPU drivers. Grand Prix points 15, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1.
- Engine classes: top speed is 150cc's times 0.8 (50cc), 0.9 (100cc), 1.5 (200cc). 200cc staff ghosts take about 0.7 of their 150cc time, since 200cc needs braking.
- Split screen 2-4 players; 60 fps with 1-2 players, 30 fps with 3-4, at 1080p docked. This is our bar.

## Stats

Driver, body, tyres and glider add points per stat; the sum is a hidden level 0-20. Top speed barely changes between builds (about 6% from level 1 to 20); acceleration and handling change 2-3 times as much. Weight blends between a minimum and maximum mass by speed and decides who is pushed in a bump. Level 10 is our starting point (150cc, version 4.0.0; speeds in the game's units per frame at 60 fps):

| Parameter | Level 1 | Level 10 | Level 20 | Internal name |
|---|---|---|---|---|
| Ground top speed (0 coins) | 7.525 | 7.75 | 8.00 | |
| Acceleration limiter (most speed added per frame) | 0.035 | 0.08 | 0.13 | `Drive_AccLmtFwd` |
| Relative acceleration | 0.0055 | 0.01 | 0.016 | `Drive_SpdKfFwd` |
| Steering | 0.0065 | 0.011 | 0.014 | `Drive_DirRotH` |
| Steering while drifting | 0.0145 | 0.019 | 0.022 | `Drift_DirRotH` |
| Glider roll | 0.15 | 0.195 | 0.245 | `Wing_StickLR_Roll` |
| Glider sideways move | 0.4 | 0.49 | 0.59 | `Wing_StickLR_Move` |

Air speed is fixed at 8.05. Our reading, not verified: steering is radians per frame (0.011 is about 38 degrees a second, 0.019 about 65). The distance unit is not public; we only need ratios (kart lengths per second, road width in kart widths). These are hand-tuned arcade rules, not a simulated car, which is why our kart rules are written by hand.

## Drift and mini-turbo

- Drift hops the kart; steering as it lands starts a drift that way; steering during it tightens or widens it; releasing fires the boost.
- A counter rises 5 a frame with the stick well into the turn (a little over 0.5), 2 otherwise.
- Blue, orange, purple sparks. Every level boosts to the same speed; they differ in length. Purple needs Smart Steering off.

| Mini-turbo level | Thresholds | Boost frames (blue / orange / purple) | Boost speed (x top) | Jump boost (frames, x top) |
|---|---|---|---|---|
| 6 | 269 / 568 / 867 | 26 / 82 / 138 | 1.08 | 21, 1.33 |
| 10 | 256 / 542 / 828 | 30 / 90 / 150 | 1.10 | 25, 1.35 |
| 15 | 235 / 500 / 765 | 35 / 100 / 165 | 1.125 | 30, 1.375 |
| 20 | 200 / 430 / 660 | 40 / 110 / 180 | 1.15 | 35, 1.40 |

At level 10, a hard drift reaches blue after 0.85 s, orange after 1.8 s, purple after 2.8 s; a soft stick takes 2.5 times as long.

## Other boosts and course features

- **Rocket start:** press accelerate just after "2" appears. Too early stalls. No frame window is published.
- **Jump boost (trick):** press drift as the kart leaves a ramp or lip; boost on landing.
- **Dash panels, mushrooms:** a fixed boost, no numbers found.
- **Slipstream:** about 3-5 s close behind another kart, then a modest boost of about 3 s, ended by a wall, a kart or an item.
- **Coins:** up to 10, each raising top speed (about +6.5% at 10). We have none.
- **Anti-gravity:** bumping another kart or a glowing post gives both a spin boost (the kart spins and boosts forward; no bounce off a post). Wheels turn flat and their rims glow cyan.
- **Gliding** uses the glider stats. **Underwater** uses water stats. **Off-road** slows; boosts ignore it.
- **Assists:** Smart Steering (steers back onto the road, blocks purple), auto-accelerate, tilt steering.
- **Items:** boxes in rows across the road, two held, odds by place. We replaced the reference game's items with our own.
- **Camera:** behind and above, lags in turns, swings out in drifts, pulls back in boosts. **HUD:** items top left, lap bottom left, place bottom right.

## Course patterns

Proportions only; no layout was copied.

- **Lap time at 150cc:** records 31-40 s a lap, staff ghosts 38-44 s; a race is about two minutes. At our top speed (32 units/s) that is about 1200 units a lap.
- **Straights:** the start straight is the longest, 3-5 s; others 1-3 s. Rarely more than 5 s without a corner or a feature.
- **Corners:** 7-10 a lap worth a drift: one or two long sweepers (purple), several of about 90 degrees (orange), an S-bend or chicane that flips the drift (blue), one hairpin, often on a climb or drop.
- **Width:** wide at the start and in open areas, narrow on bridges and in tunnels; many courses split into parallel paths.
- **Jumps:** one to three tricks a lap, often a glide in the last third. **Dash panels:** up to about four, mostly on an alternative line or before a ramp. **Anti-gravity:** usually one section mid-lap with posts. **Off-road shortcuts:** two to five, on the inside of corners, needing a boost. **Item boxes:** two or three rows a lap on wide straight parts.
- **Pacing:** a quiet start, a technical first part, a showpiece in the middle, a calmer straight with item boxes, a flourish before the line.

## The look, part by part

What makes it read as the reference game:

- **Every surface is a textured material:** coarse asphalt with stones, paint that shows the asphalt through it, riveted plates, wood grain, layered rock. Nothing large is a flat colour.
- **The road's edge is never empty for long:** sponsor boards, cones, tyre stacks, pipes, flags, bunting, lamps, spectators.
- **Each course has a theme and dresses every piece in it,** the start gate included.
- **Bright saturated colour under a warm low sun,** soft long shadows, deep blue sky, white cumulus with blue-grey undersides, haze toward the horizon. Plastic and paint are glossy, the rest matte.
- **Chunky, rounded, toy-like shapes** with bolts and rivets big enough to see.

Details worth keeping:

- **Asphalt:** three tones (mid-grey, light stones, dark gaps) with high contrast, a stone about a tenth of a tyre's width, no visible repeat (large patches on top).
- **Markings** carry the stone texture and look worn. A solid edge line a little in from each edge (yellow, white or orange by course), about a fifth of a kart wide; dashed lane lines on wide straights.
- **Curbs:** red and white stripes inside corners, each stripe one to two kart lengths, about a kart wide; pastel at the seaside course; rounded blocks in two colours at the cape course.
- **Start line:** two or three rows of checks in the course's colours. **Grid marks:** a white bracket per place, staggered in two columns.
- **Dash panel:** a lit LED sign in a raised metal frame: fine lines, a yellow-orange-red gradient, dotted chevrons. It glows but does not light the road. **Anti-gravity panel and glide ramp:** the same in blue to cyan across the whole road.
- **Lamps are off by day;** lit only at dusk, night or indoors. Start lights, screens, panels and item boxes do glow by day.
- **Start gate:** every course has one saying the game's name, styled for the course (an arch, pipes, vines, cranes), often with a badge on top; the starter holds a box of three lamps for the countdown.
- **Seaside:** turquoise shallows turning deep blue, white foam at the shore, curved ringed palms, thatched huts on stilts, a stone lighthouse, a giant shell in the sea. **Sky:** viaducts on steel trusses, airships, huge clouds.
- **Standard Kart:** an open go-kart in the character's three colours with their emblem on the nose, two big exhausts with gold bell tips, fat tyres with gold hubs (rear bigger). The driver sits upright and high, about three heads tall; seated, the top of the head is about as high as the kart is long.

## The kit's objects up close

Six things every reference-game object has, which decide whether a piece of ours reads as a prototype:

1. **No sharp edges:** a bevel of about a tenth of the part's thickness, wide enough to catch a line of light.
2. **Two scales of parts:** a frame round every board, a cap and foot on every post, collars, bolts at corners, seams between plates, a plinth under a tower. Anything bigger than a kart carries three or more smaller parts.
3. **Layered, overlapping pieces:** tree canopies of overlapping leaf scales, thatch with a thick ragged edge, palm trunks as stacks of flared rings, grass as a thick slab with a rounded lip.
4. **Textures show relief:** joints, grain, rivets and seams are lit (a normal map from the same height field as the colour).
5. **Dark creases** where two parts meet (ambient occlusion).
6. **Fat, toy proportions:** rails are fat, posts chunky; only chain-link and railing bars are thin.

Surfaces are clean saturated colour with a little wear: lighter rubbed edges, a few stains low down, a soft gradient top to bottom.

How the reference game builds particular objects (for new pieces; the kit already follows these):

- **Padded sponsor wall:** a fat rounded pad along the top printed tone on tone, printed banners with pictures as well as words, chain-link on capped posts above.
- **Striped rail (harbour course):** two padded bars about 0.4 tall and 0.2 deep with slanted orange bands, in chunky white post blocks on a bevelled kerb.
- **Steel guardrail:** a corrugated beam about a kart tall, weathered, bolts with square washers, splice plates, posts behind.
- **Chevron guard (circuit course; not built):** fat cream padded beams with three red chevrons each, on short capped posts round the outside of corners.
- **Rail fence:** bevelled posts with pyramid tops, rails passing in front and overlapping at joints. **Block curbs:** short rounded blocks set tight, no studs.
- **Promenade railing (seaside course):** blue iron posts with big ball caps, collars and flared feet; stone pillars with a cap slab and a flower plaque, some with a lamp; a rounded seawall coping below.
- **Start gate:** posts of plinth, panels with seams and bolts, bands and a cap; a thick sign with a bevelled rim and raised letters.
- **Street lamps:** a pedestal or flared foot, collars, a finial, framed glass panes, a scroll under the arm.
- **Trees:** tiers of overlapping leaf scales on a short thick trunk. **Hedges:** loaves with a furry texture and big five-petal flowers.
- **Grandstand:** two decks of stepped seats on lattice columns, a cantilevered roof with a railing, floodlight boxes, a fascia sign, stairs.
- **Lighthouse (seaside course):** irregular stones with deep mortar, arched white window frames, a green balcony with balusters, a glossy orange dome.
- **Boats:** a white motor yacht with a raised bow, rails, a flybridge and a swim platform; a long white cruise ship on the horizon (not built).
- **Cliffs:** see "Rock study" in `docs/3d-findings.md`.

## How games look detailed and still run smoothly

- **Triangles are rarely what makes a frame slow.** What costs in a browser: draw calls, pixels times shading work, shadow passes (every caster is drawn again), post-processing such as bloom. Our own measurements agree.
- **The reference game's detail comes from simple, carefully built models with clean textures** (colour, normal, specular) and from lighting: real-time shadows mixed with pre-baked ones that darken corners. The usual way to more detail is to bake it into normal and ambient occlusion maps on a simple model.
- **With Three.js:** `normalMap`, `aoMap` and roughness maps on simple shapes, textures up to about 2048 with mipmaps and anisotropy; baked light in maps or vertex colours; `InstancedMesh` and merging for fewer draw calls (a merged mesh is drawn whole whenever any of it is in view, so cut lap-long meshes up); shadows only from pieces big enough to show, a small tightly fitted shadow map; a low pixel ratio and bloom at half resolution; an environment map plus three or fewer real lights.
- **Not used:** KTX2 texture compression (needs the Basis transcoder vendored; ask first), LOD.
