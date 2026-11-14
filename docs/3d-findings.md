# 3D findings

What was measured and learned while building the 3D kart race, by topic. Measured facts, mostly single runs on a few devices; they win over general assumptions. The tuned numbers themselves live in `host/games/kart-3d/tuning.js` (each with its meaning); MK8DX's own numbers are in `docs/mk8dx-reference.md`. The full per-milestone tables are in git (`git show c091f14:docs/3d-findings.md`).

Devices: the iPad (the main host, Safari 27, canvas about 1366x892 CSS px), a Windows laptop (Ryzen 9 5900HS: integrated Radeon, or its RTX 3070), a Galaxy S24, the dev box (headless Chromium, WebGL in software).

## What the hosts can carry

- **The iPad carries the whole look with 12 karts and 4 views.** It has run between 50 and 90 fps with 4 views on High as detail was added, always above MK8DX's own bar (60 fps with 1-2 views, 30 with 3-4).
- **Pixels and passes cost, triangles barely.** On the iPad 4.7 million triangles took the same time as 2.5 million; doubling the pixel ratio doubled the frame. What costs: bloom (1.5-3.5 ms), shadows (1-2 ms), the barriers (1-2.5 ms, the dearest part of a course), the karts (3.4 ms with 4 views before their shadows came from box stand-ins). Road, sea, decks, props, gate, surroundings and sky each move the frame by under a millisecond.
- **Measure reports, iPad, ms a frame with the GPU made to finish, 1 view / 4 views:**

  | When, course | High | Medium | Low | Medium, no shadows |
  |---|---|---|---|---|
  | After the kit's textures and light (Seaside) | 11.4 / 13.3 | 7.8 / 11.9 | 7.8 / 11.6 | 7.5 / 10.5 |
  | After the 12 kart designs (Seaside, ratio 2) | 9.5 / 17.5 | 6.4 / 14.0 | 5.6 / 13.5 | 5.9 / 10.9 |
  | Palm Bay Airport | 11.4 / 17.9 | 8.9 / 14.5 | 9.1 / 13.9 | 6.9 / 12.8 |

  16.7 ms is a 60 Hz frame. These were taken before the kart shadow stand-ins; after them the device run saw 50 fps and above with 4 views.
- **Stepping 12 karts costs about 0.1 ms** (iPad and Node alike), so physics never limits the field.
- **The laptop on integrated graphics is the slow host.** Medium: 9.8 ms with one view, 15.7 with four. High: 23-32 ms, because bloom costs it 14-16 ms; draw calls cost its CPU (10 ms with 4 views). On its RTX 3070 everything runs at 165 Hz. Windows gives browsers the power-saving GPU unless told otherwise (Settings > System > Display > Graphics).
- **The Galaxy S24 as a host** is limited by its pixel count: 28 ms with one view, 55 with four.
- **Course build time on the iPad:** about 5 s for Palm Bay Airport and Seaside Skyway, under 2 s for the Test track. In software 18 to 31 s for the plain Test track, nearly all shader compile and the first frame through bloom, the page blocked meanwhile.
- **Loading Three.js** (2.25 MB unminified, no gzip) takes about 0.3 s cold over the hotspot and 30 ms to parse on the iPad, so minifying, gzip or a service worker would save almost nothing for code.
- **The iPad sometimes runs at 60 Hz and sometimes at 120 Hz**, cause unknown (Low Power Mode or Safari's "Prefer Page Rendering Updates near 60fps" flag are candidates). A steady 60 on the readout may be a cap, not the GPU running out.

## Drawing choices that were measured

- **Kept:** the course's big meshes cut into cells of 200 so views skip what they do not see (free on the iPad, 2 ms saved on the laptop); a 1024 shadow map fitted round each view (sharper); small parts cast shadows (nicer); detail drawn into colour, normal, shade and roughness maps on simple shapes (`kit/surface-maps.js`); shade baked into vertex colours round the whole lap (`baked-shade.js`); light from an environment map of the course itself, strength 0.7 (`course-light.js`); a CC0 photo-scanned asphalt. The four look techniques together cost 0.6-0.9 ms.
- **Not built, since the numbers say they would not pay:** LOD and simpler far dressing.
- **Kart shadows from one box stand-in per kart:** the shadow passes went from 480 draw calls and 1.17 million triangles to 48 and 17,000 (12 karts, 4 views).
- **The kit's drawn maps made once per game:** a course's second build takes a fraction (Seaside 16 s to 2 s in software). The cost is memory: see "Open issues" in `plan.md`.
- **Every shader is compiled while the course loads** (a warm-up frame): switching bloom on mid-race once stalled a frame for 1.8 s.
- **A 30 fps cap inside the game's `render()`** paces evenly (p95 35 ms on the iPad) if it is ever wanted; the runner needs no change.
- **Triangle budgets that held:** a kart with its driver about 25,000 triangles in 10 draw calls; a rocky island 14,000-34,000; Palm Bay Airport 1.31 million and 64 MB of maps, Seaside Skyway about 1.5 million and 77 MB.

## Pitfalls

- **Whole frames flashing green or cyan on the iPad (High, 4 views).** One NaN or infinite pixel in bloom's half-float buffer spreads over the frame as bloom blurs it. It came from triangles whose corner normals point more than a right angle apart or are near zero: the iPad's GPU does that maths in half precision, the dev box never showed it. Fixed by flat normals on such triangles (`karts/safe-normals.js`) and by bloom reading only values between 0 and 16 (`guardBloomInput` in `bloom.js`). Any new smooth-shaded shape with sharp folds can bring it back.
- **Dash panels bloom into a blur** if their glow is too strong: tuned to glow 1.6, bloom strength 0.2, radius 0.3.
- **Lamps lit in daylight look wrong;** MK8DX lights lamps only at dusk, night or indoors.
- **A shoulder (grass) that starts at a piece's end** leaves a notch to drive out of: shoulders ease in and out over 16 units. A deck's free end tapers the same way.
- **The road floats,** so everything beside it stands on a deck or a ledge; barriers stand on a concrete ledge from the rules' wall line outward.
- **Rock** built as stacked rings of round shapes reads as blobs, and seams on every band read as wooden planks: see "Rock study" below.
- **On a road banked 60 degrees** a corner bends only half as much in the road's own surface, so CPU drivers do not drift in the airport's ring.
- **WebGL context loss** ends the game through the shell's error path; `stop()` must call `renderer.forceContextLoss()`.
- **Headless WebGL:** SwiftShader took 1.2-1.9 s a frame; Mesa's llvmpipe (`--use-angle=gl-egl --ignore-gpu-blocklist`, `test/helpers/browser.js`) about 0.3 s. Software numbers say nothing about real GPUs except relative cost.

## The feel

- **MK8DX's distance unit is not public,** so every distance is ours: a kart is about 2 units long, the road 13-20 wide (MK8DX's start straight measured about 9 kart widths; ours 9.6), the camera 6.5 behind and 2.4 above at 65 degrees.
- **Tuned by feel against MK8DX's 150cc on the device:** top speed 32 units/s (16 kart lengths a second), 67 deg/s at full stick, 72.5 fully into a drift (a drift must turn tighter than steering, as in MK8DX), a wall hit that costs speed by angle so that riding the wall is the slow line (unit tested), bumps that bounce a little (0.25), a hop of 0.4.
- **Taken from MK8DX's level-10 data as they are:** the speed curve, the mini-turbo counter (5 or 2 a frame; blue, orange, purple at 256, 542, 828; boosts of 30, 90, 150 frames at 1.1 times top speed), the trick boost (1.35 times). Guesses that stayed: dash panel and rocket start 1.35, slipstream 1.08, spin boost 1.1. Boosts do not stack: the longer time and faster speed win.
- **Rocket start:** the host judges when the Go press arrives. The window is 0.3 to 1.2 s after "2" appears, and the boost is longer the earlier in it (1 s down to 0.3 s). Measured arrivals were +0.13 to +0.57 s after "2" with round trips of 11-113 ms. With auto-accelerate, holding Drift counts.
- **Engine classes** are a share of 150cc's top speed on each kart (0.8, 0.9, 1, 1.5), so the Top speed slider always means 150cc. Glide gravity scales with the class so every class lands in about the same place.
- **Laps:** a lone CPU kart laps Seaside Skyway (1213 units) in about 36 s at 150cc and Palm Bay Airport (1551 units) in about 50 s. MK8DX's laps are 31 to 44 s.
- **CPU levels as judged on the device:** Normal, winning from 12th is doable; Hard, quite challenging; Easy, like a beginner. A mild catch-up, up to 5% of top speed at 200 units from the leading player.
- **Spin posts** slide a kart round them with no bounce (the bounce threw karts into walls); in anti-gravity the kart spins and boosts, once per 0.6 s.
- **Items:** every allowed item is equally likely (place-based odds made the same few come up). Removed after the device run: big, small, bouncy, and the ramp. The push acts only on karts beside and behind, never the one in front (pushing it on stops the overtake).
- **Tilt was the easiest steering** on the device; the camera and boost effects felt right from the first build.

## Rock study

Done before the bay's rocky islands (`kit/rock-island*.js`), after rock made of rings of round shapes looked wrong. From photographs of sea stacks and karst islands and from MK8DX's Dolphin Shoals, Koopa Cape and Sunshine Airport.

- **Planes and edges, not blobs.** Rock breaks along bedding planes and joints: flat faces meeting at fairly sharp edges, near-upright walls, flat or humped tops, an angular stepped outline.
- **Strata:** level bands of differing tone; a hard band stands out as a ledge, a soft one is worn back.
- **Joints:** upright cracks cut the bands into blocks, so a wall is several upright faces turned different ways.
- **Two scales:** the big shape reads from afar, the texture (laminae, cracks, stains) up close.
- **The foot:** a dark wet band at the waterline, a wave-cut notch with the rock overhanging, fallen angular blocks.
- **Vegetation only where it can hold:** on tops and ledges, hanging over the lip in tongues; walls are bare.
- **Colour:** paler on weathered upper faces, dark streaks below ledges, each facet a little lighter or darker.
- **MK8DX keeps rock planar and blocky** and puts the fine detail in the texture; only grass and bushes are rounded.
- **What worked:** flat facets stacked in strata, seams on a third of the band edges with short blocks between joints, one drawn limestone tile for the detail. Two rings where strata meet must differ only by a uniform step, or the faces between them twist and the inward half is culled (a unit test checks the winding).

## Tools for looking and measuring

- **Measure** (3D setup, Display): a scripted run with no phones through each quality level and with each part of the course hidden in turn, 1 and 4 views; every frame ends by reading back one pixel so the GPU has finished (Safari has no GPU timers). The report is text to copy and paste back.
- **Watch** (same place): a race of 1 to 4 self-driving stand-ins with a view each, to check the frame rate without four phones. The Tuning popup's Stats show fps, step time and draw calls.
- **`npm run kit-shots`:** picture sheets of single kit pieces or a whole course, lit as in the race (`CLAUDE.md`, "Commands"). Make a before sheet and an after sheet when changing a piece.
