# 3D findings (M6 spikes and M7)

Measured results of the M6 spikes and the M7 parts, read by the M6 and M7 chats. Like `docs/spike-findings.md`, these numbers are measured facts that override general assumptions and `docs/mk8dx-reference.md`. They come from single runs on a few devices.

## M6a: performance spike

### What the spike draws

"3D spike (dev)" in the lobby's game list (`host/games/spike-3d/`, throwaway, removed in M7). It needs no phones (`minPlayers` 0). It shows a looping road about 800 units long (a kart is 2 units long) with a 12-unit hill, curbs, banks, 160 instanced trees, a gradient sky, fog, and 12 karts that follow scripted paths at about 30 units per second (no physics). Each view has a chase camera that follows its own kart. Views are scissor viewports in one WebGL context.

The panel at the top left switches each cost of the look:

| Switch | Off | On |
|---|---|---|
| Shadows | none | one 2048x2048 sun shadow map over the whole loop, drawn once per frame and shared by every view (`shadowMap.autoUpdate = false`, `needsUpdate = true` once per frame), PCF filtering |
| Glossy | Lambert materials | PBR (`MeshStandardMaterial`), karts `MeshPhysicalMaterial` with clear coat, all reflecting a `RoomEnvironment` env map (PMREM) |
| Bloom | views drawn straight to the canvas | views drawn into a 4x multisampled half-float buffer, then `UnrealBloomPass` (strength 0.4, threshold 1) and `OutputPass`, once over the whole frame, not per view |
| Particles | none | 80 additive points per kart (drift sparks and boost flame), one draw call per view, updated on the CPU |
| Detailed karts | 452 triangles per kart | 10,912 triangles per kart. Both are 4 draw calls per kart (parts merged by material), so the switch changes only the triangle count |
| Full res | pixel ratio 1 | the device's `devicePixelRatio` (2 on an iPad, so 4x the pixels) |
| Cap 30 fps | draw every animation frame | draw only when 1/30 s has passed (every other frame at 60 Hz); physics still steps at 60 Hz |

Also: views 1, 2 (stacked top and bottom) or 4 (quarters), and 4, 8 or 12 karts. The canvas is antialiased and tone-mapped with `NeutralToneMapping` in every setting.

The readout shows fps, the average, p95 and worst frame interval, the CPU time spent in `render()`, draw calls and triangles per frame (all views, shadow pass included), and the drawing buffer size.

**Run benchmark** (about 2.5 minutes) steps through 29 settings: for 1, 2 and 4 views it runs plain, each cost alone, the full look, the full look at full resolution, and plain at full resolution, then the full look with 4 views and 8 or 4 karts. Each setting gets 1 s to warm up (shaders compile), 2.5 s of frame intervals, then 1 s where every frame waits for the GPU (one pixel read back) to give **busy ms**: the whole cost of a frame, CPU and GPU. A 60 Hz screen never shows intervals under 16.7 ms, so busy ms is the number that shows headroom. The table appears in a text box (select and copy) and in the browser console.

### Measured without a device

- Three.js r0.186.1, vendored unminified as shipped (npm no longer has a `.min` build): `three.module.js` + `three.core.js` = 2.1 MB, plus 12 add-on files (bloom, env map, geometry merging) at about 92 KB. The spike's first load fetches 20 files, 2.25 MB. The server does not gzip, so this is what crosses the hotspot.
- The load line under the readout splits loading into network (from Resource Timing: first request to last byte; an upper bound, since a module's imports are only requested once it is parsed), import including parse, building the scene (geometry, the env map), and the first frame (which compiles every shader the current settings need). A second start in the same tab shows almost no network (the files are cached or answered with 304).
- Headless Chromium on the dev box renders WebGL in software (SwiftShader). At 960x540 it ran plain 1 view at 11 fps and the full look at 1 fps, with only 1-3 ms of CPU in `render()`. Those numbers say nothing about real GPUs; they are why the browser test runs at half size with the look's costs off.

### Device results

Measured on 2026-10-24, one benchmark run per device. Procedure: open `/host` over HTTPS on the LAN IP, pick "3D spike (dev)", Start, wait 10 s, Run benchmark. **busy ms** is the frame's whole cost (CPU and GPU), measured with a GPU wait; **fps / avg** is what the screen showed, capped by its refresh rate.

#### What the numbers say

- **The iPad carries the full look with 4 views and 12 karts at 60 fps or more, at pixel ratio 1.** Busy 6.6 ms (Termux run) and 9.9 ms (first run) with every cost on. That is well inside MK8DX's bar (60 fps with 1-2 views, 30 with 3-4), and drawing leaves room for 12 karts, a full CPU field. M6b still has to measure stepping them.
- **On the iPad the number of views and karts barely matters.** Plain went from 1.9 ms (1 view) to 2.4 ms (4 views), and the full look with 4 views from 6.3 ms (4 karts) to 6.6 ms (12 karts). The cost is in the pixels (fill rate), not in draw calls or triangles: detailed karts (10,912 triangles each) added 0.3 ms.
- **Resolution is the iPad's big cost.** At pixel ratio 2 (2732x1876, 4x the pixels) the full look costs 19-20 ms and runs at about 46 fps with any number of views. That misses 60 for 1-2 views but holds a steady 30 for 4. Plain at ratio 2 costs only 3-5 ms, so the expensive part at full resolution is the look's per-pixel work, most likely bloom (its buffers grow with the pixels). That breakdown was not measured: the benchmark measures each cost alone only at ratio 1. Ratios between 1 and 2 (for example 1.5) were not measured either.
- **Bloom is the costliest switch everywhere.** On the iPad at ratio 1 it adds about 4-6 ms (shadows and glossy about 1 each, particles and detailed karts under 1). On the laptop it adds 9-13 ms. With bloom off, the laptop runs every setting at its full 165 Hz.
- **The laptop ran on its integrated graphics, which are weaker than the iPad here.** It is a hybrid laptop (Ryzen 9 5900HS with built-in Radeon graphics, plus an RTX 3070), and Chrome drew on the Radeon: Windows gives browsers the power-saving GPU unless told otherwise (Settings > System > Display > Graphics, or the NVIDIA Control Panel), and as far as we know Chrome on Windows ignores the page's `powerPreference: 'high-performance'`. Measured again on the RTX 3070 (forced with the Windows graphics setting), the same laptop ran **every** setting at its full 165 Hz, the full look with 4 views at ratio 1.5 included, with busy times of 2-6 ms. So a discrete GPU carries the whole look at full resolution; the hosts that need costs dropped are integrated-graphics ones. To get the discrete GPU, the host's browser must be set to "High performance" in Windows (Settings > System > Display > Graphics) or the NVIDIA Control Panel; worth a line in the M9 setup notes. Full look at ratio 1: 1 view 15 ms (73 fps), 2 views 19 ms (60 fps, borderline), 4 views 23 ms (47 fps: misses 60, holds 30). At its own pixel ratio 1.5, 4 views drop to 23 fps, missing even 30. So "iPad first" does not mean "the iPad is the weakest host". A host can be slower than the iPad, and M7 needs a way to drop costs on such a host, bloom first.
- **Switching on a cost can stall the first frame.** The laptop's "1 view + bloom" had one 1.8 s frame (worst column) after the 1 s warm-up: the bloom's shaders and buffers being built on first use. A race must not switch costs mid-race. M7 should build every shader during loading (Three.js `renderer.compileAsync`) so the first race frame does not stall.
- **The iPad ran at 60 Hz in the first run and at 120 Hz in the Termux run** (same iPad, same Safari 27). Its busy times were also about 1.5x higher in the first run (full look 9.3 ms against 6.3 ms). The cause is unknown (Low Power Mode, which caps Safari at 60 Hz and slows the chip, would explain both, but was not confirmed); later runs were all at 120 Hz. At 120 Hz the runner draws 120 frames a second, twice the GPU work and heat of 60, for the same 60 Hz physics.
- **The 30 fps cap paces evenly on the iPad:** with 4 views and the full look, p95 was 35 ms against an ideal 33.3. On the laptop's RTX 3070 (165 Hz screen) it gave 30.5 fps with p95 33 ms: even too, though not exactly 30, because at 165 Hz frames come every 6.06 ms, so a capped frame lands after 30.3 ms (5 frames) or 36.4 ms (6). On its integrated graphics the laptop could not reach 30 with the full look (about 24 fps, p95 about 45 ms), so the cap did nothing there.

#### Load

| Run | Files | Over the network | Network | Import with parse | Scene | First frame |
|---|---|---|---|---|---|---|
| iPad, Termux hotspot, cold | 20 | 2.25 MB | 293 ms | 321 ms | 67 ms | 16 ms |
| iPad, Linux server, private tab (already cached: 304s) | 19 | 0.01 MB | 43 ms | 59 ms | 65 ms | 16 ms |
| iPad, second start in the same tab | 0 | 0 | 0 ms | 0 ms | 75 ms | 15 ms |
| Laptop, Linux server, cold | 20 | 2.25 MB | 203 ms | 215 ms | 722 ms | 178 ms |
| Laptop, second load | 20 | 2.25 MB | 251 ms | 262 ms | 107 ms | 52 ms |

Loading Three.js takes about 0.3 s even cold over the phone's hotspot, and parsing 2.2 MB of unminified code adds only about 30 ms on the iPad. **Minifying, gzip or a service worker would save at most about 0.3 s, so none is worth doing for code** (see "Later ideas" in `plan.md`; models and textures in M7 may change that). The first frame (shader compiles for the plain look) is short. The laptop's 722 ms scene build on its first load was a one-off; its second load took 107 ms.

The private-tab iPad load was not cold (19 files answered with 304), so the cold iPad numbers come from the Termux run, which was the first load from that server.

#### Raw tables

iPad, Safari 27, 1366x938 CSS px at devicePixelRatio 2, server on the Linux box (60 Hz this run):

```
setting                                fps  avg ms  p95 ms   worst  busy ms
1 view plain                          60.0    16.7    17.0    17.0      3.0
1 view + shadows                      60.0    16.7    17.0    17.0      4.6
1 view + glossy                       60.0    16.7    17.0    17.0      4.5
1 view + bloom                        60.0    16.7    17.0    17.0      8.6
1 view + particles                    60.0    16.7    17.0    17.0      3.7
1 view + detailedKarts                60.0    16.7    17.0    17.0      3.8
1 view full look                      60.0    16.7    17.0    18.0      9.3
1 view full look, full res            46.7    21.4    22.0    23.0     19.3
1 view plain, full res                60.0    16.7    17.0    17.0      5.1
2 view plain                          60.0    16.7    17.0    18.0      3.1
2 view + shadows                      60.0    16.7    17.0    18.0      4.2
2 view + glossy                       60.0    16.7    17.0    17.0      4.3
2 view + bloom                        60.0    16.7    17.0    17.0      8.6
2 view + particles                    60.0    16.7    17.0    17.0      3.5
2 view + detailedKarts                60.0    16.7    17.0    17.0      3.7
2 view full look                      60.0    16.7    17.0    18.0      9.6
2 view full look, full res            45.6    21.9    23.0    23.0     19.6
2 view plain, full res                60.0    16.7    17.0    17.0      5.3
4 view plain                          60.0    16.7    17.0    18.0      3.7
4 view + shadows                      60.0    16.7    17.0    18.0      4.8
4 view + glossy                       60.0    16.7    17.0    18.0      5.0
4 view + bloom                        60.0    16.7    17.0    17.0      9.0
4 view + particles                    60.0    16.7    17.0    17.0      3.7
4 view + detailedKarts                60.0    16.7    17.0    17.0      3.9
4 view full look                      60.0    16.7    17.0    18.0      9.9
4 view full look, full res            45.0    22.2    23.0    23.0     20.2
4 view plain, full res                60.0    16.7    17.0    18.0      4.6
4 view full look, 8 karts             60.0    16.7    17.0    17.0     10.0
4 view full look, 4 karts             60.0    16.7    17.0    17.0      9.9
```

iPad, same device, server on the Termux phone over its hotspot (120 Hz this run):

```
setting                                fps  avg ms  p95 ms   worst  busy ms
1 view plain                         120.0     8.3     9.0     9.0      1.9
1 view + shadows                     119.9     8.3     9.0     9.0      3.0
1 view + glossy                      119.9     8.3     9.0     9.0      2.6
1 view + bloom                       120.0     8.3     9.0     9.0      6.2
1 view + particles                   120.0     8.3     9.0     9.0      2.1
1 view + detailedKarts               119.9     8.3     9.0     9.0      2.2
1 view full look                     120.0     8.3     9.0    10.0      6.3
1 view full look, full res            47.6    21.0    22.0    23.0     19.0
1 view plain, full res               120.0     8.3     9.0    14.0      3.0
2 view plain                         120.0     8.3     9.0     9.0      2.2
2 view + shadows                     120.0     8.3     9.0     9.0      3.3
2 view + glossy                      119.9     8.3     9.0     9.0      2.9
2 view + bloom                       120.0     8.3     9.0     9.0      6.3
2 view + particles                   119.9     8.3     9.0     9.0      2.1
2 view + detailedKarts               119.9     8.3     9.0     9.0      2.3
2 view full look                     120.0     8.3     9.0     9.0      6.4
2 view full look, full res            46.2    21.7    22.0    23.0     19.7
2 view plain, full res               120.0     8.3     9.0     9.0      3.1
4 view plain                         119.9     8.3     9.0     9.0      2.4
4 view + shadows                     120.0     8.3     9.0     9.0      3.5
4 view + glossy                      119.9     8.3     9.0     9.0      3.3
4 view + bloom                       119.9     8.3     9.0     9.0      6.2
4 view + particles                   120.0     8.3     9.0     9.0      2.4
4 view + detailedKarts               119.9     8.3     9.0     9.0      2.8
4 view full look                     119.9     8.3     9.0     9.0      6.6
4 view full look, full res            45.7    21.9    23.0    23.0     20.1
4 view plain, full res               119.6     8.4     9.0    19.0      3.4
4 view full look, 8 karts            120.0     8.3     9.0     9.0      6.9
4 view full look, 4 karts            120.0     8.3     9.0     9.0      6.3
```

Laptop, Windows, Chrome 155, on the Ryzen 9 5900HS's integrated Radeon graphics, not its RTX 3070 (ANGLE on Direct3D 11), 1707x791 CSS px at devicePixelRatio 1.5, 165 Hz screen, server on the Linux box:

```
setting                                fps  avg ms  p95 ms   worst  busy ms
1 view plain                         165.0     6.1     6.8     7.3      5.5
1 view + shadows                     165.0     6.1     6.2     6.6      5.7
1 view + glossy                      165.1     6.1     6.8     7.8      6.6
1 view + bloom                        26.0    38.4    22.2  1794.1     14.8
1 view + particles                   164.6     6.1     6.2     8.9      5.6
1 view + detailedKarts               165.0     6.1     6.2     7.7      5.6
1 view full look                      73.5    13.6    17.6    19.3     15.2
1 view full look, full res            37.2    26.9    33.0    60.7     31.6
1 view plain, full res               161.6     6.2     6.8    10.0      6.6
2 view plain                         164.9     6.1     6.4     8.7      6.6
2 view + shadows                     165.0     6.1     6.2     6.3      6.6
2 view + glossy                      165.0     6.1     6.2     7.1      6.4
2 view + bloom                        66.2    15.1    18.8    24.0     16.1
2 view + particles                   164.8     6.1     6.4     9.8      6.7
2 view + detailedKarts               165.0     6.1     6.2     6.3      6.4
2 view full look                      60.5    16.5    20.2    24.2     18.9
2 view full look, full res            28.4    35.2    41.8    56.9     40.0
2 view plain, full res               103.1     9.7    12.2    14.4     11.5
4 view plain                         165.0     6.1     6.2     6.5      6.6
4 view + shadows                     165.0     6.1     6.2     6.4      6.6
4 view + glossy                      165.0     6.1     6.2     6.4      6.4
4 view + bloom                        57.6    17.4    21.6    23.9     19.3
4 view + particles                   164.2     6.1     6.4    10.2      6.7
4 view + detailedKarts               165.0     6.1     6.2     8.3      6.8
4 view full look                      47.1    21.2    24.4    27.1     22.6
4 view full look, full res            22.8    43.9    49.5    78.7     47.4
4 view plain, full res                98.1    10.2    12.0    14.4     12.1
4 view full look, 8 karts             48.0    20.8    23.2    25.1     20.8
4 view full look, 4 karts             51.8    19.3    23.7    26.3     21.2
```

Same laptop, Chrome on its RTX 3070 Laptop GPU (ANGLE on Direct3D 11), same screen and server:

```
setting                                fps  avg ms  p95 ms   worst  busy ms
1 view plain                         165.0     6.1     6.4     6.8      5.7
1 view + shadows                     165.0     6.1     6.4     6.7      5.7
1 view + glossy                      165.0     6.1     6.2     6.6      1.9
1 view + bloom                       165.0     6.1     6.2     6.4      2.5
1 view + particles                   165.0     6.1     6.2     6.5      1.8
1 view + detailedKarts               165.0     6.1     6.2     6.4      1.8
1 view full look                     165.0     6.1     6.2     6.5      2.9
1 view full look, full res           165.0     6.1     6.4     6.9      5.6
1 view plain, full res               165.0     6.1     7.5     9.9      2.2
2 view plain                         165.0     6.1     6.2     6.5      1.9
2 view + shadows                     165.0     6.1     6.2     6.5      2.4
2 view + glossy                      165.0     6.1     6.2     6.6      3.6
2 view + bloom                       165.0     6.1     6.2     6.4      4.1
2 view + particles                   165.0     6.1     6.2     6.4      2.0
2 view + detailedKarts               165.0     6.1     6.2     6.3      2.0
2 view full look                     165.0     6.1     6.2     6.7      5.6
2 view full look, full res           165.0     6.1     6.4     6.8      5.7
2 view plain, full res               165.0     6.1     6.2     6.6      2.2
4 view plain                         165.0     6.1     6.2     7.0      2.0
4 view + shadows                     165.0     6.1     6.2     6.7      2.1
4 view + glossy                      165.0     6.1     6.2     6.4      2.1
4 view + bloom                       165.0     6.1     6.2     6.6      2.9
4 view + particles                   165.0     6.1     6.2     6.5      2.2
4 view + detailedKarts               165.0     6.1     6.2     6.3      2.1
4 view full look                     165.0     6.1     6.2     6.3      3.5
4 view full look, full res           165.0     6.1     6.3     6.7      5.8
4 view plain, full res               165.0     6.1     6.2     6.5      2.4
4 view full look, 8 karts            165.0     6.1     6.4     6.7      5.8
4 view full look, 4 karts            164.9     6.1     6.2     7.5      5.7
```

On the RTX 3070 the busy times jump between about 2 and 6 ms with no pattern (plain 5.7 ms, plain + glossy 1.9 ms), probably because the GPU lowers its clock under such a light load. They only say there is plenty of headroom, not what each cost adds.

On the laptop, busy ms sits close to the 6.1 ms frame interval even for plain settings, so its GPU wait has a few ms of its own overhead (reading back a pixel through ANGLE); small differences there mean little.

### What the game module interface needed

The spike ran on the M5a interface with no change to it. What it needed, and where that lives:

- **The import map.** Three.js add-ons import the bare name `three`. `host/index.html` now has an import map (before any module script) that points `three` at `/host/vendor/three-0.186.1/three.module.js` and `three/addons/` at its add-ons folder. Import maps need Safari 16.4 or later (iPadOS 16.4, March 2023).
- **Resizing and pixel ratio:** the game handles both itself. A `ResizeObserver` on its container resizes the renderer, and the pixel ratio is the game's own setting. The shell needs nothing new.
- **WebGL context loss:** the renderer notes the `webglcontextlost` event and the next `render()` throws, so the shell's existing error path ends the game and shows "stopped with an error" in the lobby (browser-tested with `WEBGL_lose_context`). M7 may want to recover instead: its state is plain data, so it could rebuild the renderer and carry on. That is a game-side choice, not an interface change.
- **Freeing the context:** `stop()` calls `renderer.dispose()` and `renderer.forceContextLoss()`, so the context is freed at once and not when the canvas is garbage collected (iOS allows a page only a few contexts). The shell's own Phaser context stays alive but idle while a game runs.
- **Capping at 30 fps** lives in the game's `render()`: it skips drawing until 1/30 s minus 4 ms has passed (the 4 ms absorbs animation-frame jitter), while the runner keeps stepping at 60 Hz. On the iPad (120 Hz) and the laptop's RTX 3070 (165 Hz) it paces evenly (p95 35 and 33 ms), so the cap can stay in the game; the runner needs no change for it. The 120 Hz iPad run raises a second question for M7: whether to cap drawing at 60 fps by default, since 120 draws a second double the GPU work for the same 60 Hz physics.
- **Load timing** needs the game's heavy code imported inside `load()` (a dynamic `import()` of the renderer module), not imported statically by the game's `index.js`, or it loads before `load()` runs.

## M6b: driving spike

### What was built

"3D test drive" in the lobby's game list (`host/games/kart-3d/`, kept for M7). 1-4 players pick a control style on the shared kart setup screen, then drive freely on a test track in split screen. 11 dummy karts fill the field to 12 (fewer when more players join), starting ahead of the players as in MK8DX. There are no countdown, laps or places yet. While driving, a readout at the top of the host screen shows the physics step time (average and worst over the last 4 s), the frame rate, the CPU time per drawn frame, and each player's speed, surface and lap position.

The test track (`test-track.js`, about 631 units, a kart is 2) floats over the sea, so leaving it means falling. In order: start straight; a hill up 8 with no walls (the edge to fall off); a flat 90 degree turn; a 14 degree ramp up 4 then a 12-unit gap; a 180 degree hairpin of radius 20; a 20 degree banked left curve at normal gravity; a straight with 6-unit off-road shoulders; and an anti-gravity half circle (radius 34) that rolls the road up to vertical and back, karts driving on the inside of the wall.

The track model from `plan.md` held up. Pieces (straights and arcs with height, roll, shoulders, walls, gap and anti-gravity) are sampled into stations 1 unit apart. Each kart is found by walking across the stations' cross-sections from the station it was at last step, which a figure-of-eight bridge test proves. **No physics library and no mesh fallback were needed.**

### Starting numbers (no footage yet)

The "Reference footage" step in `plan.md` was not done, so every distance below is a guess, to be checked against MK8DX footage on the device run. MK8DX's own per-frame numbers are used as ratios, scaled by our top speed. The physics steps at 60 Hz, MK8DX's own frame rate, so one of its frames is one of our steps. All constants are at the top of `kart-driving.js`, `kart-physics.js`, `kart-bumps.js` and `chase-camera.js`.

| Thing | Value | Source |
|---|---|---|
| Top speed | 24 units/s = 12 kart lengths/s | guess (MK8DX's unit size is not public) |
| Speed curve | each frame closes 1% of the gap to top speed, capped at 0.08/7.75 of top speed per frame: 50% after 1.15 s, 90% after 3.8 s | MK8DX level 10 (`Drive_SpdKfFwd`, `Drive_AccLmtFwd`), our reading of what they mean |
| Steering | 0.011 rad/frame = 38 degrees/s at full steer, the same at any speed above 4 units/s; at top speed a full circle takes 9.5 s, radius 36 units (18 kart lengths) | MK8DX level 10 (`Drive_DirRotH`), read as radians per frame |
| Braking, coasting, reverse | 30, 6 units/s²; reverse up to 6 units/s | guess |
| Off-road | top speed halves; above it, -30 units/s² | guess (MK8DX's traction value is not public) |
| Road width | 16 units = 8 kart lengths | guess |
| Gravity | 25 units/s², stronger than real for snappy jumps | guess |
| Jump | at top speed about 0.85 s in the air and 20 units; leaving the lip under about 15 units/s falls short | follows from the above |
| Bumps | mass = weight x (0.5 standing still to 1 at top speed); players weigh 1, dummies 0.8, 1 and 1.25 in turn | MK8DX's rule (mass blends by speed), our numbers |
| Falling off | 3 units below the road starts a 1 s wait (about 1.5 s after leaving the road), then the kart is put on the middle of the road, standing, 30 units before where it was last on the road (so a jump gets a run-up) | guess; MK8DX puts karts back closer to where they fell |
| Chase camera | 6.5 behind, 2.4 above, looking 4 ahead, field of view 65 degrees; direction trails the kart at 5/s, up at 3/s, position at 12/s | guess |

On the road a kart is stuck to the surface: each step it moves, then is put back on the road with its up along the road's normal. So slopes and banks do not change its speed (MK8DX barely slows on hills), and the anti-gravity wall works without special code. Gravity only acts in the air, toward the road in anti-gravity sections and straight down elsewhere.

### Measured without a device

- **Step time, Node on the dev box:** 0.05 ms per step for 12 karts (a 90 s simulation). **Headless Chromium on the dev box** (the browser test's readout): 0.085 ms average, 1.1 ms worst. That is under 1% of a 16.7 ms frame. Unless the iPad is many times slower, stepping 12 karts costs nothing next to drawing, so the kart count is set by drawing, which M6a measured at 12 karts and 4 views in under 10 ms.
- **The dummies** (pure pursuit 10 units ahead in their own lane, braking when a full steer could not reach a point 12 or 24 units ahead) lap in about 30 s. They brake to 10-15 units/s for the hairpin, clear the jump, drive the wall, and none fell off in 65 s with all 12 together (unit-tested).

### Device run

Measured on 2026-10-24 on the iPad (host over HTTPS on the LAN IP): "3D test drive" with 12 karts, read off the host's readout after driving for a while. 4 players in 4 incognito tabs on the laptop as controllers, so **4 views**.

| Karts (4 views) | Physics step, average / worst ms | Drawing fps | CPU ms per frame |
|---|---|---|---|
| 12, all moving | 0.079 / 1.0 | 60 | 2.3 |
| 12, player karts standing still | 0.10-0.13 (average) | 60 | 2.0 |

- **Stepping 12 karts costs about 0.1 ms, under 1% of a 16.7 ms frame**, so physics does not limit the kart count. Drawing does, and M6a measured the full look with 12 karts and 4 views at 6.6-9.9 ms on this iPad.
- **So the iPad carries a full 12-kart field with 4 views at 60 fps**, measured directly here (2-2.3 ms of CPU per frame; shadows and glossy karts, no bloom). M7 fills races to 12 karts.
- The 1 ms worst step is most likely a garbage collection pause or the browser doing other work between frames; it happened once in 4 s of steps and did not drop a frame.
- Standing player karts made the step slightly slower, not faster. The likely cause is dummies driving into them, so the bump code has overlapping pairs to resolve every step. It is a tenth of a millisecond either way, so it was not looked into.
- The readout showed 60 fps, not the 120 the iPad reached in M6a's second run, so the screen ran at 60 Hz this time (as in M6a's first run; the cause is still unknown).

**Feel against MK8DX:** on the device run it did not feel like the real game's controls. Tuning is put off to a later pass. Drifting and mini-turbos (M6c) are a big part of how MK8DX corners and were not in this build. Still unchecked against footage: kart lengths per second on a straight; time from GO to top speed; turning circle at full steer without drifting; camera distance and height; how floaty jumps are; how hard walls and bumps push.

## M6c: techniques spike

### What was built

The same "3D test drive" (`kart-3d`), now with MK8DX's techniques. Every drive starts with a countdown (3, 2, 1 a second each, then GO), and the host's **Restart** button puts everyone back on the grid for another one, so starts can be tried again and again. The phone's controls gain a **Drift** button above Go, with an empty dashed **Item** place to its left (kept for the later Item button) and Brake below that. With auto-accelerate there is no Go, so Drift takes the whole right column. The Drift button turns blue, orange or purple with the drift's spark level (the `spark` field of the phone's view).

**A held Drift also accelerates.** In MK8DX the accelerate button stays held through a drift, but a phone has one right thumb for Go and Drift and cannot press both. So without auto-accelerate, holding Drift counts as holding Go too (`host/kart/kart-controls.js`). After a drift the thumb moves from Drift back to Go; the coasting between the two is a few frames. The device run should say whether that feels right.

Rules (DOM-free, unit tested): `kart-techniques.js` (hop, drift, charge, mini-turbo, trick, and the body's lean, roll and spin for drawing), `kart-boosts.js` (every boost, the stall, dash panels), `slipstream.js`, `rocket-start.js`, plus hooks in `kart-physics.js`, `kart-bumps.js` and `drive.js`. Walls moved from `kart-physics.js` to `kart-walls.js` to keep files short. Drawing: `effects.js` (one point cloud for the field: sparks from the rear wheels in the level's colour, flames from the exhaust while boosting, grey smoke while stalled), dash panels as orange and yellow stripes on the road, the kart's body leaning into a drift (about 20 degrees), rolling once in a trick and spinning once in a spin boost, and the chase camera dropping back 2 units and widening its view by 8 degrees while the kart boosts.

### How each technique works

- **Hop and drift:** pressing Drift on the road hops (about 0.27 s in the air). On landing, if Drift is still held, the stick is at least 0.3 over and the kart goes at least 8 units/s, it drifts that way. This works after any landing, so holding Drift over a jump and landing with the stick over also starts a drift. Steering during a drift sets its turn rate: 0.019 rad/frame (MK8DX's `Drift_DirRotH`) with the stick fully into the turn, down to 35% of that with the stick fully away, always toward the drift's side. With the stick in the middle it turns at 0.0128 rad/frame, a little more than a full normal turn. A drift that slows below 8 units/s ends with no boost.
- **Mini-turbo:** MK8DX's counter (level 10), +5 a frame with the stick at least 0.55 into the turn, +2 otherwise, charged only on the road. Blue at 256, orange at 542, purple at 828: held hard that is 52, 109 and 166 frames from landing (0.87, 1.8, 2.8 s). Letting go fires a boost of 30, 90 or 150 frames at 1.1 times top speed.
- **Trick (jump boost):** a lip is where the road ends at a gap (the test track's ramp). Drift pressed up to 0.1 s before the kart crosses the lip, or up to 0.3 s after, does a trick (one barrel roll), and the kart boosts on landing: 25 frames at 1.35 times top speed. MK8DX also tricks off bumps and edges without a gap; our tracks have only gap jumps so far.
- **Rocket start:** the host judges when the Go press *arrives*. A press held from 0 to 0.6 s after "2" appeared boosts at GO (1 s at 1.35 times top speed); held from earlier stalls the kart for 1 s (grey smoke); later, or let go before GO, is a normal start. During the countdown auto-accelerate does not count as holding Go (or every auto-accelerate kart would stall), but Go or Drift pressed by hand does.
- **Dash panels:** two on the test track, one before the jump (more speed over the gap) and one on the off-road straight. Driving over one boosts 1 s at 1.35 times top speed. Every boost ignores the grass's slowdown, as in MK8DX.
- **Slipstream:** 3 s within 1.5-12 units straight behind another kart (at most 1.6 to the side), at 60% of top speed or more, gives 3 s at 1.08 times top speed. A wall or a bump ends it. There are no wind lines yet; the boost shows only as flames and the camera pull-back.
- **Spin boost:** two karts that bump while both are in the anti-gravity section each get 30 frames at 1.1 times top speed and a spin.
- **Boosts do not stack:** a new boost while boosting keeps the longer time and the faster speed of the two. While boosting, the pedals do nothing; the kart speeds up toward the boost speed whatever is held.

### Starting numbers

| Thing | Value | Source |
|---|---|---|
| Drift turn rate | 0.019 rad/frame into the turn, 0.0128 middle, 0.0067 away | MK8DX level 10 (`Drift_DirRotH`) for the tightest; the blend is a guess |
| Charge, levels, boost lengths | 5 or 2 a frame; 256, 542, 828; 30, 90, 150 frames | MK8DX level 10 |
| Hard steer for 5 a frame | 0.55 | the wiki's "slightly more than 0.5" |
| Mini-turbo speed and push | 1.1 x top speed, 24 units/s² | MK8DX level 10; the push reads its 0.13 like the acceleration limit (units per frame each frame), which the wiki does not confirm |
| Jump boost | 25 frames at 1.35 x top speed, 37 units/s² | MK8DX level 10 |
| Hop | 0.27 s in the air | guess |
| Drift start | stick 0.3 over, 8 units/s or faster | guess |
| Trick window | 0.1 s before the lip to 0.3 s after, by arrival | guess, to set from the readout |
| Countdown | 1 s per number | guess at MK8DX's pace |
| Rocket start window | 0 to 0.6 s after "2", by arrival | guess, to set from the readout |
| Rocket start, dash panel | 1 s at 1.35 x top speed | guess ("like a mushroom") |
| Stall | 1 s | guess |
| Slipstream | 3 s close behind, then 3 s at 1.08 x | the reference's "about 3-5 s" and "about 3 s"; the speed is a guess |
| Spin boost | 30 frames at 1.1 x | guess |
| Camera while boosting | 2 units further back, view 8 degrees wider | guess |

### Measured without a device

- **The hairpin can be drifted at full speed to purple.** A scripted driver that hops on the straight just before the hairpin and holds the outside lane (stick between about 0.55 and 1 into the turn) reaches purple sparks through it without touching a wall (unit-tested). The outside lane is where a hard drift's radius (about 21 units at top speed) matches the curve. On the inside lane it reaches only orange, because the stick has to be eased below 0.55 to stay off the wall and the counter drops to 2 a frame.
- **Trick timings at the ramp, at top speed:** presses from 0.1 s before the lip to 0.3 s after trick; 0.15 s before and 0.35 s after do not (unit-tested).
- **The dummies still lap twice with no falls**, now taking the dash panel before the jump (a faster jump) when their lane crosses it.
- **Headless Chromium** (the browser test): a Go press made after the phone showed "2" arrived +0.25 s after "2" and made a rocket start; its round trip read 700-1500 ms because the software-drawn host runs at 1 fps. That says nothing about real phones.

### Device run (first results)

Measured on 2026-10-24, over the phone's hotspot, read off the host's readout. Not every step below was tried yet.

- **Rocket start:** six starts, Go pressed when "2" appeared: arrivals +0.13, +0.35, +0.40, +0.45, +0.50 and +0.57 s after "2", all rocket starts. Round trips varied from 11 to 113 ms. Every press landed inside the 0-0.6 s window, the latest only 0.03 s from its end, so the window was not changed. With no misses yet, it may be more generous than MK8DX's.
- **Drift:** the Drift button's colour follows the spark level.
- **Rocket start with auto-accelerate works by holding Drift** when "2" appears (Drift counts as Go during the countdown). There is no Go button for it, which is fine for now: a phone cannot copy every Switch control.
- **Layout:** tilt was the easiest steering. Suggested instead of the built layout: Drift on the left (the left thumb is free when tilting), Go on the right, and the Item place above Go. Not built: with the stick the left thumb is on the stick, and where Brake goes is open.
- **Spin boost works:** bumping another kart on the blue section boosts. Driving into the wall itself does nothing, as built (MK8DX also has glowing spin posts; we have none).
- **The trick works:** Drift pressed going off the ramp boosts on landing. Its lip timings were not noted, so the trick window was not changed.
- **Also work:** drifting the hairpin to an orange and a purple boost, dash panels and slipstream.

#### Feel against MK8DX (second device run)

These go to the feel pass (M7a in `plan.md`):

- **Steering:** the turning circle is too wide; a full steer should turn much tighter. Wanted: a larger maximum turn, with the same sensitivity (small stick or tilt movements should not turn harder than now).
- **Walls are the fast line.** Riding the wall round a sharp turn is faster than slowing down for it, partly because the steering is too weak. Hitting a wall should cost more speed.
- **Bumps feel dead,** like an inelastic collision. In MK8DX karts bounce off each other and off walls; wanted: a visible bounce, damped (not perfectly elastic).
- **The body's changes of pose are not smooth:** leaning into a drift, the hop, and going from driving straight into the trick's spin all snap where MK8DX animates them smoothly.
- **MK8DX's hop is higher than ours.**
- **Camera:** feels fine. **Boost effects:** fine.
- **Sound:** there is none yet (planned for M8). **Look:** does not look like the real game yet (M7c).
- **Vibration:** wanted on every button press for now (Android only; iOS Safari has no `navigator.vibrate`).
- **Layout for tilt:** Drift on the left; on the right, Brake left of Go and the Item place above Go. The stick keeps the M6c layout.
- **Tuning:** every number to tune gets a slider on the host and a "Copy values" button, so the values come back to the code as pasted text.

### Device run procedure

The host's readout now has a second line per player: `Go after "2": +0.31 rocket, -0.20 stall, ... | Drift from lip: +0.12 trick | round trip 42 ms (35-60)`. It keeps the last 6 starts across Restarts, the last lip press (negative is before the lip), and the latest phone round trip with its range over the last 20 s.

1. Host on the iPad over the hotspot; an iPhone and an Android phone as players, one with auto-accelerate and one without, one on tilt.
2. **Rocket start:** on each phone, try about 10 starts (Restart after each), pressing Go when "2" appears. Note where the arrival times cluster and the round trips, for presses watched on the host screen and on the phone. Set `ROCKET_FROM` and `ROCKET_TO` in `rocket-start.js` so a good press lands inside.
3. **Trick:** jump the ramp several times pressing Drift at the lip; note the lip timings and set `TRICK_EARLY` and `TRICK_LATE` in `kart-techniques.js`.
4. **Drift:** drift the hairpin to an orange and a purple boost on both phones, with the stick and with tilt. Does the Drift button's colour help, or does nobody look at it?
5. **Layout:** is Drift above Go reachable with the right thumb, does holding Drift as accelerate feel right, and does the Item place get in the way? With auto-accelerate, is a two-row Drift better?
6. Dash panels, slipstream (follow a dummy for 3 s) and the spin boost (bump a kart on the blue wall).

## M7a: feel pass

### What was built

The same "3D test drive" (`kart-3d`), reworked from the "Feel against MK8DX" notes above, with every number to tune on a live slider.

- **Tuning panel** (host, developer only): the drive panel's **Tuning** button opens a list of sliders at the left of the screen, one per number in `host/games/kart-3d/tuning.js`, grouped (speed, steering, walls, bumps, hop and body, timing windows, camera), each showing its value. A slider changes the drive at once, mid-race. **Copy values** puts every value on the clipboard as `key = value` lines, changed ones marked `(default ...)`; paste that back to Claude, who writes them into `tuning.js` as the new defaults. If the browser refuses the clipboard, the text shows in a box, selected, to copy by hand. **Reset** brings the defaults back; **Close** (or Tuning again) hides it. Values last until the host page reloads (`npm run dev` reloads it on every file change), so copy before a reload.
- **Steering curve:** the turn rate is `steerRate x steer + (fullSteerRate - steerRate) x steer^steerCurve`. Near the middle it is the M6 straight line (MK8DX's 0.011 rad/frame), so small movements turn as before (unit-tested: within 10% up to a fifth of the stick); at full stick it turns at `fullSteerRate`.
- **Walls:** a hit (going into the wall faster than 1 unit/s) keeps `1 - wallGrazeLoss - wallHitLoss x sin(angle)` of the speed along the wall and bounces back with `wallBounce` of the speed into it, at least `wallBounceSpeed`. Slower contact (a kart steered along a curving wall) only scrapes. The nose still turns along the wall under `wallAlignDegrees`.
- **Bumps:** karts part at `bumpBounce` of the speed they met at (partly elastic), never slower than `bumpMinSpeed`, the push shared by mass as before (momentum is kept).
- **Visible bounce:** after a wall hit or a bump the kart's sideways grip is `slideGrip` instead of `grip` for `slideSeconds`, so it slides away instead of the bounce dying within a few frames (the M6 grip killed half of any sideways speed in 0.09 s).
- **Hop:** its height and air time are tuned apart: the hop gets its own pull toward the road (`8 h / t^2`) and launch speed (`4 h / t`, plus half a step of pull so the 60 Hz steps reach the full height). A hop that goes over a ramp's lip becomes a jump at normal gravity.
- **Smooth body:** the body animation moved to `kart-body.js`. The drift lean follows a critically damped spring (solved exactly each step, so it never overshoots at any stiffness): it starts gently and settles in `leanSeconds`, both ways, where the M6 lean jumped 15% of the way in its first frame. The lean starts during the hop, as far as the stick is over, so the kart lands already turned into the drift. A trick's roll now always plays out in full; before, a landing in the middle of the roll snapped the body upright.
- **Phone:** a 15 ms buzz on every button press (`navigator.vibrate`, Android only; iOS Safari has none); taken out after the device run, see below. With tilt, the 3D race's layout puts Drift under the left thumb, below the tilt panel, and on the right Brake (two rows tall) left of Go, with the Item place above Go; with auto-accelerate the right side is the Item place above Brake. The stick keeps the M6c layout.

### Starting numbers

Defaults in `tuning.js`; the slider ranges are there too. All are guesses to be tuned by feel, except where noted.

| Thing | Value | Note |
|---|---|---|
| Top speed | 24 units/s | unchanged |
| Turn near the middle | 37.8 deg/s per full stick | MK8DX's 0.011 rad/frame, the M6 steering |
| Turn at full stick | 60 deg/s | M6: 37.8. Radius at top speed 11.5 kart lengths (M6: 18). Above 69 the test track's hairpin can be taken flat out on its middle lane |
| Steering curve | 3 | 1 would be a straight line |
| Drift, stick into it | 65.3 deg/s | MK8DX's 0.019 rad/frame, unchanged, still tighter than a full normal turn. Tighter drifts get round the hairpin too soon for purple (see below) |
| Drift, stick away | 0.35 of the tightest | unchanged |
| Wall: speed lost on any hit, more on a square hit | 0.12, + 0.5 x sin(angle) | new |
| Wall: bounce, least bounce speed, scrape | 0.4, 3 units/s, 2 per s | M6: 0.3, none, 1.6 |
| Bumps: bounce, least parting speed | 0.6, 5 units/s | M6: 0.6, none |
| Grip, grip after a hit, for how long | 8, 1.5 per s, 0.35 s | the slide is new |
| Hop | 0.5 high, 0.27 s | M6: 0.23 high, 0.27 s |
| Drift lean, lean time | 20 deg, 0.3 s | M6: 20 deg, exponential at 10/s |
| Trick roll, spin | 0.5 s, 0.5 s | unchanged |
| Rocket start, trick windows, camera | as in M6c | now on sliders |

### Measured without a device

- **Riding the wall is now the slow line.** Through the hairpin from 258 to 40 past its end, starting at top speed: the dummy driver braking for it in the middle lane takes 5.8 s. Flat out with half steer (bouncing along the outside wall) takes 7.95 s, flat out without steering 9.5 s, and following the outside wall flat out 11.8 s (unit-tested: every wall line at least 0.5 s slower). With the M6 walls, half steer took 7.35 s against the dummy's 7.8 s, so the wall was faster; with the "any hit" loss set to 0, following the wall flat out still takes only 6.9 s, so that loss is what stops it.
- **Purple through the hairpin** needs about 2.8 s of hard drift. A tighter drift turns a smaller circle and is round the 180 degrees sooner: at 70 deg/s and up the hard drift lasted under 166 frames on every lane, so only orange. At 65.3 the middle lane (lanes -2 to 0) reaches purple without touching a wall; the unit test now drifts the middle lane (it used the outside lane, -4, with the M6 numbers).
- With the new steering the dummies on the hairpin's two outermost lanes no longer need to brake; the dummy test checks braking only on lanes where a full steer cannot hold top speed.

### Device run (first tuning)

Tuned on 2026-10-24 by feel against MK8DX's 150cc, then written into `tuning.js` as the defaults. Changed from the starting numbers above (the rest were kept):

| Thing | Tuned | Was |
|---|---|---|
| Top speed | 32 units/s (16 kart lengths/s) | 24 |
| Turn at full stick | 67 deg/s (radius 13.7 kart lengths at the new top speed; 80 in the first pass) | 60 |
| Drift, stick into it | 72.5 deg/s (second pass) | 65.3 (MK8DX's) |
| Wall: speed lost on a square hit, on any hit, scrape | 0.8, 0.3, 3 per s | 0.5, 0.12, 2 |
| Bumps: bounce | 0.25 | 0.6 |
| Mass standing still | 0.7 of the weight | 0.5 |
| Hop height | 0.4 | 0.5 |
| Drift lean | 23 deg | 20 |
| Rocket start window | 0.3 to 1.2 s after "2" (0.2 s past "1"; tuned in a second pass) | 0 to 0.6 |

What it means for the rest:
- **The drift turns tighter than full steering again** (72.5 against 67 deg/s, 1.08 times), as in MK8DX, whose data has the drift at 1.73 times the steering. The first pass had it the other way round (65.3 against 80); the second pass fixed that, and the unit test checks it again.
- **The test track's hairpin is too tight for a full-speed drift now.** At 32 units/s it takes about 2 s at the middle lane, and purple needs 2.8 s of hard drift; a hard drift's circle (radius about 30) is also wider than the hairpin (20). A player brakes for it. The unit test for purple now drifts a long bend sized for top speed instead. M7b's course should be designed for these numbers.
- Wall-riding stays the slow line at the tuned values (the unit test runs with whatever the defaults are).
- **Vibration was not felt** on Android or iOS (iOS has no `navigator.vibrate`; why Android did not buzz is unknown), so it was taken out and moved to "Later ideas" in `plan.md`. **The tilt layout is fine.**

After this run two things were added, both on sliders:
- **The rocket start's boost depends on timing**, as in MK8DX: a press arriving at the start of the window boosts longest ("Rocket start, best timing", 1 s), falling evenly to "Rocket start, latest timing" (0.3 s) at the window's end. M6c gave every rocket start 1 s.
- **Each boost's speed** has its own slider ("Boosts" group), as a share of top speed: mini-turbo 1.1 and trick boost 1.35 (MK8DX level 10), dash panel and rocket start 1.35, slipstream 1.08, spin boost 1.1. The device run found normal speed a little too fast next to boosted speed, so the gap is to be tuned with these together with top speed.

### Device run procedure

1. Host on the iPad over the hotspot, MK8DX running beside it. One phone on the stick, one on tilt; one with auto-accelerate.
2. Drive the test track, open **Tuning**, and move one group at a time: steering (full turn, then the curve so small movements stay gentle), top speed, walls (hit the wall at the flat turn and the hairpin square and glancing), bumps (shove the dummies; does the slide look like MK8DX's bounce?), hop and lean (hop on the straight; drift in and out), trick roll, camera.
3. **Copy values** after each group, and paste them to Claude before the host page reloads.
4. On the phones: does every press buzz on Android? With tilt, is Drift under the left thumb comfortable, and is Brake left of Go reachable?

## M7b: the race on a real track

### What was built

The test drive became the race, "Kart race 3D" (`kart-3d`), on a course of our own, and the M6a spike was removed.

- **Race rules** (`race.js`, replacing `drive.js`): the 12-kart grid as before (CPU karts in front, still M6b's lane-following driver until M7d), the countdown and rocket start, laps counted from the distance each kart drives from the start line (reversing over the line takes distance away, so no checkpoint is needed, as in the 2D race), finishing, places (finish time, then distance) updated every step and frozen at the results, and the engine class. The race ends when every player has finished, or 30 s after the first player finished (the 2D race's rule; MK8DX waits for every player, but a phone left on a table would hold the race up for ever). CPU karts never hold it up: those still driving are placed by how far round they got. A player who finishes, and at the results every player, hands their kart to the CPU driver, as MK8DX does, so it drives on instead of standing in the road.
- **Engine classes:** 50, 100, 150 and 200cc, MK8DX's 150cc top speed times 0.8, 0.9, 1 and 1.5. Each kart carries its class's share (`engineClassShare`) and every rule reads `kartTopSpeed(kart)` (the tuned 150cc top speed times that share), so acceleration, boosts, the off-road limit, bump masses and the slipstream's least speed all scale with it, and the Top speed slider still means 150cc. Steering is a turn rate, not scaled, so at 200cc the same corner needs more braking or a tighter drift, as in MK8DX.
- **Track model:** the road's width can change along the course (a piece's `halfWidth` at its end, eased like the height), and grass shoulders are set per side (`shoulderLeft`, `shoulderRight`), so a corner can have off-road on its inside only.
- **Courses,** chosen on the host's setup screen: "Seaside Skyway" (`seaside-skyway.js`), designed from the course study ("Course patterns" in `docs/mk8dx-reference.md`), its parts and why in the file's comments; and M6b's "Test track" (`test-track.js`), whose hairpin needs braking at the tuned speed.
- **Host screen:** the setup screen has the courses, laps (- and +) and the four engine classes; the flyover behind it shows the chosen course. During the race each split-screen view shows the player's name (top left), the lap (bottom left), the place (bottom right, as in MK8DX, lifted above the shell's End game and Close room buttons in that corner) and a "Final lap!" (for 3 s) or "Finish!" banner; the race clock is top right, with "Race ends in N s" once a player has finished. The readout now shows only while the tuning panel is open. The results are an HTML panel over the race (the karts drive on behind it): every kart's place, name (CPU karts as "CPU") and time, with Race again and Back to lobby.
- **Phones:** the setup screen's line reads "3 laps, 150cc". During the race the big text is the countdown, then the place; the line says "Get ready!", how the start went (for 2 s), "Lap 2/3", "Final lap!" (for 3 s), "Finished!" and "Race over". All of it is state in the view, so no one-shot cue message was needed.

### The course in numbers

| Thing | Value |
|---|---|
| Lap | 1213 units (607 kart lengths) |
| Road width | 13 (bridge) to 20 (big sweeper, item straight), 16-18 elsewhere; about 8 to 12 kart widths |
| Height | up to 10 (the big sweeper), the jump from 8 to 3 |
| Corners | a 90 degree right (radius 55), a chicane (two 40 degree bends, radius 40), the big sweeper (180 degrees right, radius 45, banked 12 degrees), a hairpin (180 left, radius 26), the anti-gravity half circle (radius 34), an S-bend (two 60 degree bends, radius 54), a last 90 degree right (radius 40) |
| Features | a bridge without walls, one jump (14 gap), one anti-gravity wall, two dash panels, grass on the inside of the hairpin and the last corner, grass on both sides of the straight before it |

### Measured without a device

- **Lap times** with the CPU karts' driver (middle lane, braking for every corner, never drifting, from a standing start at the back of the grid), three laps: 117 s at 150cc (39 s a lap), 94 s at 200cc, 129 s at 100cc, 143 s at 50cc. MK8DX's staff ghosts lap in 38 to 44 s at 150cc with drifts and mushrooms; a player drifting and boosting here should be a few seconds a lap faster than the CPU driver.
- **Nobody falls off** at any class: a field of 12 CPU karts lapped the course at all four classes in the unit test, jumping the gap, driving the vertical wall, and braking for the hairpin on every lane where a full steer cannot hold top speed.
- **Corner sizes against the tuned turns** (worked out, not felt): at 150cc a full drift into the turn holds a radius of about 25 to 30 and a hard drift reaches purple after 2.8 s. The big sweeper is about 4.4 s of driving at top speed, enough for purple with a held drift; the hairpin's middle line (radius 26) needs almost the tightest drift (radius 25), and a little outside it a hard drift that charges at full rate (radius about 30) fits, so it gives orange or purple to a kart that takes it wide; the 90 degree corners last about 2 to 2.7 s (blue to orange); each chicane bend lasts under 1 s (blue at most).

### Device run procedure

1. Host on the iPad over the hotspot, two phones (one iPhone, one Android), one on tilt and one on the stick.
2. A 3-lap race at 150cc: does the course feel like an MK8DX course (straights not too long, corners worth drifting, the hairpin and the big sweeper giving orange or purple, the jump and the wall fun)? Note any corner that feels too tight or too wide, and where.
3. Is the HUD readable from the sofa on each view (name, lap, place, the banners), and the phone's place and lap?
4. Race again at 200cc and at 50cc: is 200cc still drivable, is 50cc too slow to be fun?
5. Let one player finish and the other wait: does the "Race ends in" countdown and the results screen work, and do the places look right?
6. Lap times: note a good lap time at 150cc from the host's clock (it shows only the race time; divide by the laps).
7. Choose the Test track on the setup screen: the flyover changes to it, and a race on it works as on Seaside Skyway.

### Device run

Done: the race on Seaside Skyway felt fine, with nothing to change.

## M7c: the look

### What was built

All procedural, no image or model files: the payload grew by 12 new code files (about 46 KB) and changes to 13 others.

- **Karts** (`kart-shapes.js`, `kart-models.js`): a toy kart of our own: a rounded nose, side pods, a front wing, an engine cowl, a rear wing and bumper, two chrome exhausts, and a driver in a dark suit with white gloves on the steering wheel and a round helmet (the player's colour, a white stripe, a dark visor). Fat tyres with silver hubs, the rear ones bigger. Parts are merged by material: 4 draw calls per kart plus one per wheel (8; the M7b kart was 10). The wheels roll with the kart's speed and the front ones turn with the steering (`wheelTurn` in `kart-body.js`, drawing only, eased toward the stick).
- **Bloom** (`bloom.js`): M6a's method. All views are drawn into one 4x multisampled half-float buffer, then `UnrealBloomPass` runs once over the whole frame and `OutputPass` tone-maps onto the canvas. Bloom spreads glow into the black gaps between split-screen views, so they are cleared again afterwards (`gapRects` in `view-layout.js`). Strength 0.4, radius 0.2, threshold 1 (M6a's), with sliders in a new "Look" group of the tuning panel, and an Exposure slider.
- **What glows** (colours above 1, so only on High): drift sparks (2.5x their colour), boost flames a little (1.2x: a flame is many particles on top of each other, and at 3x they bloomed into a white blob over the kart), dash panels and the blue lines along anti-gravity sections (unlit, 2.5x, on every course), the sun in the sky, the lighthouse lamp, the start gate's and the poles' lamps, and the sun glinting on paint and sea.
- **Reflections:** the karts' paint (clear coat) and chrome now reflect our own sky (`createSkyEnvironment` in `scenery.js`: the sky dome, with sea blue below the horizon, through PMREM) instead of Three.js's `RoomEnvironment`. The studio's bright light panels showed up in the clear coat brighter than white, and bloom turned every kart into a white blur. The clear coat is also less sharp (roughness 0.25, was 0.08), so the low sun is a highlight, not a glare. `RoomEnvironment.js` was removed from `host/vendor/`.
- **Every course:** the sun sits lower (about 34 degrees up, behind the karts on the start straight and ahead of them on the way back), so shadows are longer and the sun shows in the sky, with a halo.
- **Seaside Skyway only** (`scenery: 'seaside'` in its definition; the Test track keeps its plain look): asphalt grain on the road, mown stripes in the grass, walls in blue and white panels (`track-mesh.js`); sandy islands with palms and rocks under and around the road, a red and white lighthouse with a glowing lamp ahead of the start straight, four hills on the horizon, six sailboats rocking, clouds above and below the road, ripples on the sea that drift and catch the sun (`seaside-scenery.js`, `seaside-props.js`, placed from `seaside-layout.js`); a start gate (blue posts, a checkered beam, five lamps), red arrow boards on the walls round the outside of every corner, and flag poles with lamps along the straights (`trackside.js`, placed by `trackside-spots.js`). Every set of one prop is one instanced mesh, so the dressing adds about 15 draw calls per view. Textures are drawn on canvases while the game starts (`textures.js`).
- **Quality setting** (`quality.js`), "Look" on the host's setup screen: High (bloom, pixel ratio 1), Medium (no bloom, ratio 1), Low (no bloom, ratio 0.7, about half the pixels). It belongs to the host device, so it is saved in the host's localStorage and comes back next time; High on a host that never chose.
- **Shaders compiled while loading:** at the start the renderer compiles the scene's materials (the karts included) and draws one frame through bloom, so the shadow and bloom shaders exist before the first race frame, and switching to High later does not stall (M6a saw a 1.8 s stall).

### Measured without a device

All in headless Chromium on the dev box (software WebGL, SwiftShader), at 960x540: these say nothing about real GPUs, only about what was added and about the browser tests' speed.

| Frame (2 views, Seaside Skyway unless named) | Before M7c | M7c |
|---|---|---|
| High | (no bloom then) | 1.9 s |
| Medium | 0.79 s | 1.27 s |
| Low | | 1.1 s |
| Test track, Medium-equivalent / High / Low | 0.70 s | 0.70 / 1.47 / 0.74 s |

- Of the Seaside frame at Medium, the karts cost about 0.5 s and the dressing about 0.4 s in software. Real GPUs measured in M6a barely noticed triangles or draw calls (10,912-triangle karts added 0.3 ms on the iPad); pixels and bloom were the cost, which is what the quality setting drops.
- Starting the game (building the world, compiling, one warm-up frame) takes about 4.3 s on Seaside and 1.3-2 s on the Test track in software; before M7c it took 0.3 s, but that skipped the warm-up frame (the first race frame paid instead). Two traps found on the way: drawing the asphalt grain as 540 soft circles on a canvas and reading it back took 4.1 s, and canvases kept on the GPU stalled the next WebGL resize by about 4 s. The textures are now worked out pixel by pixel into canvases kept in plain memory (`willReadFrequently`); the grain takes about 0.2 s.
- The race's clock slows with slow frames (the runner steps at most 15 times a frame), so the 3D browser tests about behaviour now start the host at Medium (`test/helpers/kart-3d-host.js`); the M7c test covers High and Low.
- **Faster headless WebGL (after the device run):** Chromium's `--use-angle=gl-egl --ignore-gpu-blocklist` makes it draw with Mesa's llvmpipe instead of SwiftShader. Both run on the CPU, but llvmpipe measured 0.23 s against 1.17 s a frame (Seaside, 2 views, Medium) and 0.28 s against 1.6 s at High. The browser suite went from 18.5 to 7.8 minutes. The dev box's Intel HD 520 is not used: the user is not in the `render` group, so Chromium cannot open `/dev/dri/renderD128` (the `iris` driver is installed; untested).

### Device run procedure

1. Host on the iPad over the hotspot, two phones. The 3D race, Seaside Skyway, Look on High (the default).
2. Look: do the karts read as toys from behind and from the side (helmet colour, wings, wheels rolling, front wheels steering)? Is the course recognisable as a seaside sky course (islands, lighthouse ahead on the start straight, boats, clouds below the road, sparkling sea)? Note anything ugly or confusing, and where.
3. Bloom: do sparks, the dash panels, the anti-gravity lines, the lamps and the sun glow without washing out the karts? If not, open Tuning during a race and move the Look sliders (strength, radius, threshold, exposure); Copy values and send them.
4. Frame rate: drive with 2 and with 4 views on High. Is it smooth (60 fps with 1-2 views, a steady 30 with 3-4 is MK8DX's bar)? Open Tuning to see the readout's frame times. If it stutters, try Medium, then Low.
5. The first race frame after Start race, and the switch from Medium to High on the setup screen: any pause?
6. The laptop on its integrated graphics (Chrome not set to High performance): which level holds 60 with 2 views?
7. Start the game again later: does the Look setting come back as chosen?

### Device run

On the iPad (the main host): the karts look okay, the frame rate is good, no pause was noticed at the first race frame or when switching to High, and the Look setting comes back after End game. The laptop was not tested. Feedback for M7d: the orange dash panel is too bright with bloom, and lamps lit in daylight look odd.

## M7d1: research and the device-run fixes

### What was built

- **Research:** "The look, part by part" in `docs/mk8dx-reference.md`, from 22 screenshots and artworks (Claude looked at each, kept only notes), with a recommended list of new kit pieces for M7d2. For review before M7d2 starts.
- **Dash panels** have their own mesh (`dashPanels` from `buildTrackMesh`), and its unlit material's colour multiplies the stripes' vertex colours, so their brightness is a live slider: "Dash panel glow" in the tuning panel's Look group (`dashPanelGlow`, default 1.2, was a fixed 2.5 shared with the anti-gravity lines). At 1.2 the yellow stripes' brightness (luminance about 0.91) stays under the bloom threshold of 1, so they no longer bloom; from about 1.3 they start to. `renderer.js` sets it every frame in the world's `update`. The anti-gravity lines keep 2.5.
- **Lamps are off by day:** the flag poles' and the start gate's lamps (`trackside.js`) and the lighthouse lamp (`seaside-scenery.js`) are warm glass lit by the sun (`MeshStandardMaterial`, roughness 0.15), no longer unlit and brighter than white. MK8DX's day courses do the same (see the study).

### Device run procedure

1. Host on the iPad, the 3D race on Seaside Skyway, Look on High.
2. Drive over both dash panels: do they read as bright orange and yellow without blooming into a blur? If not, open Tuning, move "Dash panel glow" in the Look group, Copy values and send them.
3. Look at the start gate's lamps, the flag poles' lamps and the lighthouse: no glow, just glass in the sun?
4. Read "The look, part by part" in `docs/mk8dx-reference.md` and say what to change, especially the list of new kit pieces and its order.

### Device run

On the iPad: the lamps no longer glow, as wanted. Tuned with the sliders and made the defaults: Dash panel glow 1.6 (from 1.2, so the yellow stripes glow a little), bloom strength 0.2 (from 0.4) and bloom radius 0.3 (from 0.2): a softer, wider glow on everything that blooms (sparks, flames, panels, the sun). At the review the user approved the list of new kit pieces and asked for 12 kart-and-driver designs, one for each racer.

## M7d2: the kit of building blocks

### What was built

All procedural, as before: no image or model files. Every piece is its own small module in `host/games/kart-3d/kit/` with its own texture drawn on a canvas while the game starts, and the Test track is dressed with all of them (Seaside Skyway keeps its M7c look until M7d3). The approved list's items 1-11 and 14 are built; 12 and 13 (the seaside and sky pieces) wait for M7d3, where they are used.

- **The textured road** (`road.js`, `road-paint.js`, `road-textures.js`, `road-marks.js`): asphalt in three tones (a mid-grey base, light stones about 0.04 units across, dark gaps), laid twice over the strip builder's 8 units, with large lighter and darker patches in the vertex colours (two layers of noise over the lap, repeating once a lap) and a slightly darker band down the middle, so the tile's repeat does not show. Paint in a worn paint texture that shows the stones: a yellow edge line 1 unit in from each edge (the colours are the course's theme, Mario Kart Stadium's here), red and white curbs raised 0.06 with a sloped inner edge, only on the inside of corners (turning more than 8 degrees over 10 stations, at least 8 stations long), a dashed white middle line on wide straights (clear of the grid, the ramp and the dash panels), a white bracket in front of each grid place (from the race's own `gridSpot`), and two rows of 16 checks for the start line. Anti-gravity sections get riveted metal plates in a blue tint with glowing cyan edge lines and a dashed middle line. Grass shoulders have blades in their texture and mown stripes; the road's sides and underside are concrete. Texture anisotropy was already 8 in M7c (`textures.js`); the M7d1 study's "not set" was a mistake.
- **LED panels** (`led-panels.js`): the dash panels and a new band across the whole road 1 unit into each anti-gravity section (4 long). Each is a glowing base (a gradient, yellow-orange-red or blue-cyan, with fine dark lines across), a raised metal frame lit by the sun, and a see-through layer of chevrons made of dots, added to the base's light and sliding forward at 1.6 of their lengths a second. Both follow the Dash panel glow slider.
- **Ramp plate** (`ramp-plate.js`): riveted steel plates with bolts and three white chevrons over each jump's ramp, from where the road climbs steeper than 1 in 10 up to the lip.
- **Start gate and lights** (`start-gate.js`, `start-lights.js`, `start-light-states.js`): two white posts with red bands just behind the barriers, a yellow sign reading MARIO KART on both faces (canvas text, so the font is the device's own heavy sans-serif), a red stripe and checks, a mushroom badge on top; a black box of three hooded lamps hangs under the sign's middle. The lamps light red one more with each number (3, 2, 1), all green at GO for 3 s, then off; off on the setup screen and at the results.
- **Sponsor boards** (`sponsors.js`): 12 of MK8DX's in-game brands (Bowser Oil, Lemmy's Tire Service, Golden Wheel, MKTV, Burning DK, Bullet Bill Speed Trial, Mario Motors, Super Marine World, Toad's Polar Expedition, Yoshi Cookies, Peach Castle Tours, Koopa Kar Wash; the last three are our own in the same style) on one canvas atlas and one shared material, used by the padded walls, the A-frame stands, the grandstand's front and the MKTV van.
- **Barriers** (`barriers.js`, `layout-rules.js`, one module per style, built with `extrude.js`): the course's layout picks a style for each stretch of wall; anything not picked gets a plain concrete wall in blue and white panels, or in anti-gravity sections a white metal wall with a glowing cyan line. Styles: the padded sponsor wall with a chain-link fence on posts (the wire cut out of its texture), the steel W-beam guardrail on yellow posts, the orange-and-white striped rail (stripes winding round two tubes) on a concrete base, the seaside rail fence (posts with pointed tops, two rails), and block curbs (studded green and yellow blocks a metre apart along the edge). A barrier stands from the rules' wall line outward, so none of it narrows the road.
- **Decks beside the road** (`platform.js`): the road floats over the sea, so trackside props stand on decks along the outside of a wall, at road height, following its bends, with grass or paving on top, concrete sides and end faces, and pillars to the sea. Not in the study's list; needed for anything to stand beside a floating road.
- **Props** (`props.js` places them; `small-props.js`, `mktv-van.js`, `sponsor-stand.js`, `street-lamps.js`, `floodlight.js`): cones, tyre stacks, a warp pipe, a giant mushroom, the MKTV van with a dish, A-frame sponsor stands, street lamps in both styles (a lantern on a curved arm; three lanterns on a crossbar) and floodlight towers, all off by day (glass lit by the sun). Each kind is one instanced mesh per part; sponsor stands (each its own brand) are merged instead.
- **Grandstand** (`grandstand.js`): five concrete tiers with blue and red seats, end and back walls, a white roof on posts with a red edge, sponsor boards along the front, and a crowd of about 220 small Toad-like spectators (body, face, mushroom cap; shirt and cap colours vary) who hop now and then. The crowd casts no shadow (it sits in the roof's) and has few faces each.
- **Bunting** (`bunting.js`): strings of pastel pennants across the road between two poles on the walls, sagging a little.
- **Shared helpers:** `canvas-texture.js` (moved out of `textures.js`), `noise.js` (repeating value noise, unit tested), `kit/pixel-image.js` (pixels worked out in memory and written to a canvas once), `kit/road-rects.js` (a rectangle laid on the road at any distance, cut at stations), `kit/frames.js` (a piece's frame at a station; `trackside.js` uses it too), `kit/kit.js` (what each piece is given: the world, the track, `keep`, the sponsor material and the shared concrete and grass), and `roundedBox` in `shape-utils.js` for the chunky toy shapes (gate, light box, van, seats).
- **The Test track's dressing** (`test-track-scenery.js`, `test-track-layout.js`): every barrier style and every prop shows somewhere: sponsor walls, the grid, gate and grandstand with floodlights on the start straight and a paddock (van, stands, tyres, cones, lamps) opposite; guardrails round the first turn with triple lamps and stands outside it; striped rails to the jump and on the banked curve; the rail fence after the landing; block curbs round the hairpin, with a giant mushroom between two warp pipes inside it; sponsor wall and rail fence along the off-road straight, with lamps and a pipe on a deck; plain walls at the anti-gravity curve's end.

### Measured without a device

In headless Chromium on the dev box (llvmpipe, software), so these say how much was added, not how a real GPU copes. M6a found pixels and bloom the cost on the iPad, not draw calls or triangles.

| At the back of the grid, one view, 960x540 (scratch viewer, shadows drawn each frame) | Seaside Skyway (M7c look) | Test track with the kit |
|---|---|---|
| Draw calls (with the shadow pass) | 220 | 280 |
| Triangles (with the shadow pass, 12 karts included) | 177,000 | 275,000 |
| One frame drawn | 0.16 s | 0.30 s |
| Building the course (road, scenery, karts) | 0.7 s | 1.4 s |

- In the game, the race on the Test track drew at about 0.37 s a frame (one view, Medium). The software frame is about twice Seaside's: the kit covers much more of the screen with lit, textured surfaces (walls, fences, decks, the grandstand) where there was sky before. The crowd first had 400 triangles a person; at about 130 now, and without shadows, it saved about 100,000 triangles a frame.
- The concrete and grass textures were first drawn five and two times over (each barrier style and the decks made their own); they are drawn once and shared now (19 textures in all).
- A screenshot of the Test track takes about 1.4 s in the browser tests, longer than a countdown number shows, so the M7d2 test reads the start lights from the canvas inside the frame the game drew (about 30 pixels a lamp at 960x540).

### Device run procedure

1. Host on the iPad, the 3D race, choose the Test track on the setup screen, Look on High. One or two phones.
2. On the grid: do the start lights light red one by one with 3, 2, 1 and turn green at GO, and are they easy to see from the back of the grid? Does the gate read as Mario Kart's? Look at the asphalt near the kart: stones, not noise or shimmer; far away, no visible tiling.
3. Drive a lap slowly. At each piece, note what looks wrong or plain: the curbs, edge and middle lines and grid brackets; the dash panels (do the chevrons read as arrows and scroll forward?) and the anti-gravity panel at the start of the wall; the ramp plate; every barrier (sponsor wall and fence, guardrail, striped rail, rail fence, block curbs, the plain and anti-gravity walls); the decks and their props (van, stands, tyres, cones, lamps, floodlights, pipes, mushroom); the grandstand and crowd; the bunting.
4. Frame rate with 2 and with 4 views on High (open Tuning for the readout's frame times). If the Test track stutters where Seaside Skyway did not, try Medium, then Low, and say which holds.
5. Say which pieces should change before M7d3 builds Seaside Skyway from them, and which seaside and sky pieces matter most there.

### Device run

On the iPad, the Test track on High: the start lights count down and are easy to see from the back of the grid; the road and every piece look great, much better than M7c's look; the race holds 60 fps with no stutter (the iPad sometimes caps the frame rate itself, but reaches 60 easily), so no quality level had to be lowered. The grandstand and its crowd at the start line were the favourite. For M7d3: the roads can stay like the kit's, but a course should have sections themed on its name, and its surroundings should look much less sparse: even the dressed Test track still looks sparse. Later, on a closer look: most objects plainly read as simple shapes with little detail, and some things float or make no sense, such as rails beside the road standing on nothing. That is because a barrier stands from the wall line outward, past the edge of the road, so where no deck is under it, it hangs in the air. Both are for M7d3, on the pieces Seaside Skyway uses; the Test track stays as it is.

## M7d3: Seaside Skyway rebuilt from the kit

### What was built

All procedural, as before: no image or model files. Seaside Skyway keeps its pieces and driving line (no rule changes until the device run's shoulder fix, below) and is now drawn entirely from the kit, with the approved list's last two items (12, seaside; 13, sky) built as kit pieces and placed round the course.

- **The road and gate in the course's colours:** the kit road with a white edge line, coral and pale teal start checks and coral and white curbs (Toad Harbor's), and the start gate with a sea-blue MARIO KART sign and a coral stripe on white posts banded blue (the gate takes a colour theme now; the Test track keeps Mario Kart Stadium's yellow).
- **Two halves themed on the name** (`seaside-layout.js`). The seaside, from the last straight round to the first corners (s 1076-1213 and 0-340): sponsor walls and the grandstand with its crowd on a paved square at the start line, striped harbour rails, a boardwalk of planks opposite with a row of palms, lamps, lifebuoys, parasols and loungers, wooden rail fences with beaches outside them (palms, parasols, loungers, surfboards), block curbs on the insides of corners, bunting across the road. The sky, from the climb to the anti-gravity wall and the S-bend (s 340-1076): steel guardrails, red turn boards with white chevrons round the outside of every corner, a garden deck up the climb (round trees, flowering hedges, planters, lamps), a paddock beside the quiet straight, and steel truss towers with lattice girders under the high road.
- **Round the seaside half** (`seaside-surroundings.js`): eight beach islands with sand, a grassy hill, rocks, palms, a shelf of pale sand under the water, turquoise shallows fading into the deep blue and patchy foam that comes and goes at the shore; ten huts on stilts in their shallows; a stone lighthouse on a rocky island ahead of the start straight (Daisy Circuit's: stone blocks, a green balcony, a glass lamp room off by day, an orange dome); a giant green Koopa shell half sunk off the first corner; seven sailboats with cabins and two sails, rocking.
- **Round the sky half** (`seaside-sky.js`): islands floating at the road's height and above (grass on top, cliffs in brown and orange bands stepping in to a point, round trees), one inside the sweeper and one in the hairpin's U; four big ones and four cliffs rising from the sea farther out; cumulus clouds with blue-grey undersides, some beside the high road at its height; four hot-air balloons drifting up and down; a blimp with a Super Marine World banner circling the course every 150 s.
- **The sea is nearer:** each scenery sets its sea level, and Seaside Skyway's is -14 (it was -30 for every course), so the islands, huts and boats sit close enough under the road to read. The Test track keeps -30. Falling off is measured from the road, so nothing in the rules changed.
- **Nothing floats:** every barrier on both courses stands on a concrete ledge that juts 0.95 from the road's edge, as thick as the road, with a little kerb on its inner face and end faces where walls start and stop. The supports moved into the kit (`kit/supports.js`): piers now have a footing and a wide cap under the road; a layout's truss runs get towers and girders instead.
- **More detail on the pieces Seaside uses:** wood grain and bolt heads on the rail fence, bolt heads on the guardrail's beam, capped posts with flanges on the striped rail, eyes and white cap spots on the grandstand's crowd; the new pieces were built with their parts and textures from the start (wood planks, sand, thatch, stone blocks, layered rock, palm fronds cut out of a leaf texture, the shell's scutes).
- **Sky and lighting** stayed as M7c's (a deep blue dome fading to haze, the warm low sun, the hemisphere light), which already match the study; the clouds got their shading.
- The Test track shows the new props and turn boards too, so it is still the kit's showroom.

### Measured without a device

In headless Chromium on the dev box (llvmpipe, software), so these say how much was added, not how a real GPU copes. M6a found pixels and bloom the cost on the iPad, not draw calls or triangles.

| At the back of the grid, one view, 960x540 (scratch viewer, shadows drawn each frame) | Seaside Skyway, M7c look | Seaside Skyway, M7d3 | Test track, M7d3 |
|---|---|---|---|
| Draw calls (with the shadow pass) | 220 | 331 | 272 |
| Triangles drawn (with the shadow pass, 12 karts included) | 177,000 | 817,000 | 325,000 |
| Triangles in the scene / of them casting shadows | | 534,000 / 293,000 | |
| One frame drawn | 0.16 s | 0.44-0.51 s (0.27-0.32 s round the rest of the lap) | 0.32-0.35 s |
| Building the course (road, scenery, karts) | 0.7 s | 2.3 s | 1.6 s |

- A triangle census found no single piece dominating: the detail is spread over hundreds of instances (block curbs, palms, fence posts, clouds, round trees, the crowd). Segments were cut where it did not show (stud, puff, clump and bolt rings), and nothing whose shadow could only fall on the sea casts one any more (the sea takes no shadows): the trusses, piers, floating islands, trees, clouds, balloons, airship, huts, boats, lighthouse and shell. Those two steps took about 150,000 triangles off a frame.
- The browser tests that draw Seaside Skyway got slower: M7b about 74 s and M7c about 67 s (each about 35 s before), M7d2 43 s; the full browser suite took 10 min 40 s (7.8 before). Medium and Low do not draw fewer triangles; if the iPad struggles, thinning the far dressing is the next step to try.

### Device run procedure

1. Host on the iPad, the 3D race, Seaside Skyway, Look on High. One or two phones, then four for the split screen.
2. Drive a lap slowly. Does the seaside half read as a seaside (harbour, boardwalk, beaches, islands with shallows and foam, huts, the lighthouse ahead on the start straight, the Koopa shell off the first corner, boats) and the sky half as a sky course (trusses under the road, floating islands, clouds beside the road, balloons, the airship)? Say where it still looks sparse or plain.
3. Up close: the rail fence, guardrail, striped rail, block curbs, turn boards, palms, parasols, loungers, the crowd. Anything that reads as a plain shape, floats, or stands where it makes no sense? Every barrier should stand on its ledge.
4. Frame rate with 2 and with 4 views on High (open Tuning for the readout's frame times), especially on the start straight, where the most is in view. If it stutters, try Medium and say whether it holds.
5. Start the game and switch courses on the setup screen: how long does Seaside Skyway take to appear, and is there a pause at the first race frame?

### Device run

On the iPad: the course looks good and both halves read as themed; with 4 players on High it averages 80 to 90 fps (so the extra triangles cost the iPad little); switching to the course takes about a second. One problem: where a piece's grass (shoulder) ended or began, the ground's edge and its barrier stepped sideways at once, leaving a notch to drive out of the track. Fixed in the same chat: a shoulder now eases over the first 16 units of the piece where it changes, in a smoothstep S curve, and the drawing (grass, the road's sides, barriers, decks) and the rules (the contact's shoulders are blended between stations like its width) both follow it. Afterwards the user circled blunt deck ends and asked for every other cut-off to be found: decks now taper to nothing at a free end in the same S curve and run on as one where they meet (Seaside's seaside half has one continuous deck on its left, from the last straight to the chicane), and every barrier ends itself cleanly where it starts, stops or changes style (a closed cross-section, its own post, or a whole block; a first try with a concrete end post at each junction looked wrong, with both barriers sticking through it). Turn boards were first turned to stand along the outside edge, but the user preferred them turned toward the karts coming (easier to see mid-turn): they went back to that angle, stand 1.5 out clear of the rails, on a ledge that widens to 2.7 under them in an S curve. A thin spike of sand at the start of the last straight's beach was a deck's first station (just before its start) wrapping to almost a lap in and getting full depth. The bridge before the jump got walls and guardrails like the rest of the course. General feedback for M7d4: up close, most composite objects still show the simple shapes they are made of and look far from MK8DX's; they need smaller parts covering them and more texture, with MK8DX's objects as the reference.

## M7d4a: shared tools and the barriers

### What was built

All procedural, as before. M7d4 started with a study of how MK8DX builds its objects up ("The kit's objects up close (M7d4 study)" in `docs/mk8dx-reference.md`); M7d4a takes its "How to build it" and rebuilds everything that lines the road with it. No rule changes.

- **Shared tools.** Normal maps drawn from a texture's height field (`toReliefTexture` in `kit/pixel-image.js`), so seams, pits, grain and nail heads catch the sun from the side it comes from: the concrete (pits and lumps) and the wood (sunk gaps, rounded plank edges, raised nails) now come with one, shared through `kit/kit.js` (`concreteRelief`, `woodRelief`) and used by the road's sides too. Profiles extruded along the road can have their corners rounded (`roundProfile`) and be shaded smooth where their faces turn gently (`smooth`), be pushed out of their shape for a band or a plate (`offsetProfile`), cover only part of a station segment (`span`, with `stationBetween`), and tubes have one ring (`tubeProfile`); all in `kit/extrude.js`, whose `extrudeSegment` now takes an options object. `shape-utils.js` gained `roundedCylinder` (a lathe with rounded rims), `shaded` (vertex colours darker in creases or lighter on top) and a `chamfered` form of `roundedBox` (about 60 triangles against 190) for small parts repeated hundreds of times.
- **The ledge** under every barrier: a coping with a rounded nose over a darker, weathered face.
- **Plain wall:** rounded painted top, a coping along it, a dark foot and seams between the panels. **Anti-gravity wall:** rounded, a rounded steel cap, a dark foot, seams every 3 units with rivets either side.
- **Padded sponsor wall:** boards set back in a light frame with a bolt at each corner, a dark kick strip, a fat cushion of a pad with a darker seam between boards, fence posts with a collar and a ball, a rail along the fence's top. The boards' pictures are unchanged.
- **Striped rail** (Toad Harbor's): fat oval rails (0.3 tall, 0.22 deep) on a rounded kerb, held every 4 units in chunky white post blocks with bolts; the rails' ends hide in a block.
- **Guardrail:** a deeper rounded W, a splice plate with three bolts where beams meet (every 4 units), yellow posts darker at the foot on a foot plate, an amber reflector on every fourth post.
- **Rail fence:** rounded rails and chamfered posts with the wood's relief, a low pyramid top in darker cut wood, posts leaning and standing a little uneven (seeded, the same every time).
- **Block curbs:** rounded blocks without studs, as tall as deep, a gap between them, lighter on top.
- **Promenade railing (new style, `kit/promenade-rail.js`, chosen at the split):** Daisy Circuit's blue iron posts (flared foot, collar, ball) with two round rails, a sandstone pillar every 12 units and at every end (plinth, cap slab, a brass plaque on both faces). On Seaside Skyway beside the promenade (left, s 100-150) and round the last corner (left, s 1150-1214), where the striped rails were; on the Test track s 344-384, where a guardrail was. Turn boards may stand behind it.
- **Turn boards:** a thick board with rounded edges, its picture laid on from the front with a dark line inside the white border and corner bolts, on round posts with caps and foot plates, held by clamps.
- **Start gate:** each post a dark plinth, three panels in the post's colour with seams between them and a bolt near each corner of every face, the band and a capital under the sign; the sign's letters, outline, stripe and checks raised by a normal map drawn from the sign itself (`kit/start-gate-sign.js`, which now draws the sign and the badge), inside a raised white rim with a row of bolts. **Start lights:** hoods 0.45 deep, a chrome ring round each lamp, bolts in the face's corners, a yoke (a bar over the box on brackets, rods up to plates under the sign).

Not done from the study: the sponsor boards' pictures (Toad Harbor's have characters in them; ours keep their logo and emblem), the gate's arch or frame behind the sign (the rim and capital give the sign its second scale of parts), and the chevron guard (not chosen).

### Measured without a device

In headless Chromium on the dev box (llvmpipe, software), at the back of the grid with the 12 karts on it, one view, 960x540, shadows drawn each frame (scratch viewer), against the M7d3 code measured the same way in the same session:

| | Seaside Skyway, M7d3 | Seaside Skyway, M7d4a | Test track, M7d3 | Test track, M7d4a |
|---|---|---|---|---|
| Draw calls (with the shadow pass) | 243 | 253 | 214 | 220 |
| Triangles drawn (with the shadow pass) | 812,000 | 1,305,000 | 293,000 | 520,000 |
| Triangles in the scene (karts included) | 550,000 | 831,000 | 203,000 | 353,000 |
| One frame drawn | 0.42-0.49 s | 0.51-0.52 s | 0.29-0.30 s | 0.33 s |
| Building the course (road, scenery, karts) | 2.3 s | 3.0 s | 1.5 s | 2.2 s |

- The first rebuild had 1,253,000 triangles in Seaside's scene; a census found the guardrail's posts (four rounded boxes each, 430 posts: 311,000), the turn boards' fittings and the fence posts. Small, repeated parts were then chamfered or made plain boxes, the ledge rounded only at its nose, and the bolts given fewer segments, to 831,000. The block curbs keep their full rounding: chamfered, they looked faceted rather than toy-like.
- The browser tests that draw the 3D race took a little longer: M7b 87 s, M7c 85 s, M7d2 50 s (about 74, 67 and 43 after M7d3).
- M6a and the M7d3 device run found the iPad barely notices triangles (80-90 fps with 4 players after M7d3 tripled the software frame), so the device run decides whether anything must be thinned.

### Device run procedure

1. Host on the iPad, the 3D race, Seaside Skyway, Look on High. One phone, then four for the split screen.
2. On the grid: the start gate (panelled posts with bolts, raised letters in a rimmed sign) and the start lights (rings, hoods, the yoke). Do the letters look raised when the sun catches them?
3. Drive a lap slowly and look at every barrier up close: the padded sponsor walls (framed boards, the cushion pad, fence posts), the new promenade railing with its stone pillars (after the start straight on the left, and round the last corner), the striped rails (fat, in white blocks), the wooden rail fences, the block curbs, the guardrails (splice plates, reflectors), the anti-gravity wall, the ledge under them all, the turn boards. Which still read as plain shapes, and which look closest to MK8DX's?
4. Where barriers meet another style or stop, does anything stick through or end oddly?
5. Frame rate with 1 and with 4 views on High (the Tuning readout), especially on the start straight; and how long Seaside Skyway takes to appear on the setup screen (about a second after M7d3).
6. Optional: the Test track for the plain wall (after the anti-gravity curve) and its promenade railing (the straight after the hairpin).

### Device run

On the iPad: the user found it looks fine, with nothing to change. No frame rates or load times were reported, so M7d4b's first measurement gives the iPad's numbers.

## M7d4b1: the Measure tool and the cheap wins

### What was built

M7d4b was split at the start of its chat (plan.md): this first part builds a way to measure on the iPad where a frame's time goes, and three cheap wins from the research ("How games look detailed and still run smoothly" in `docs/mk8dx-reference.md`), each a switch so the iPad can measure and see it both ways. No rule changes, no new files in `assets/`.

- **The Measure tool** (`measure-plan.js`, `measure-run.js`, `measure-panel.js`; the Measure button by Look on the setup screen). No phones needed: a race of 12 karts driving themselves, four of them standing in for players (so there are 1 and 4 views to draw), stopped at four moments (on the grid before the countdown, then 10, 20 and 30 s into the race). Each moment is drawn with 1 and 4 views in each of about 20 looks: High, Medium, Low, Medium without shadows, Medium without each part of the course in turn (road, sea, supports, barriers, decks, props, gate, surroundings, sky, karts), and Medium with each drawing switch the other way, ending with M7d4a's own drawing (no cells, one shadow map) as the baseline. Each case draws 3 frames untimed (new shaders and buffers), then 8 timed. The report is text to copy: per look and view count, the average of the moments' median frame times, the worst moment, the CPU's part, and the draw calls and triangles (shadow passes included).
- **How a frame is timed on Safari:** Safari has no GPU timer queries, and the screen's refresh rate caps the frame rate (the iPad showed 80-90 fps, which hides how much room is left). So each measured frame ends by reading back one pixel (`gpu-probe.js`), which makes the browser wait until the GPU has finished the frame. The time to there is the frame's full cost, CPU and GPU one after the other (a little more than a real frame, where the two overlap); the time to the end of `draw()` is the CPU's part.
- **Cells** (`split-meshes.js`, with the maths in `cells.js`; "Cull cell size" in the tuning panel's new "Drawing" group, 0 = off). Three.js skips a mesh outside a camera's view only by its one bounding sphere, and since M7d2 every barrier style, the ledge, the road and each prop kind were one mesh round the whole lap (the census: 76 of Seaside's 112 meshes reach over 60 units from their middle, with 687,000 of its 796,000 triangles), so all of it was drawn for every view and again for the shadow pass. Once a course is built, every mesh wider than a cell is cut into one mesh per square cell of the ground: a merged mesh's pieces share its vertex buffers, each with its own list of triangles and its own bounds; an instanced mesh becomes one per cell. Instanced meshes moved instance by instance every frame (the boats, the crowd) are marked `userData.keepWhole` and stay whole.
- **A shadow map per view** (`sun.js`, `shadow-fit.js`; "Shadow map per view"). Before, one 2048 map covered the whole course (about 0.2 units a texel on Seaside) and was drawn once a frame with every caster. Now each view can get its own 1024 map over a square 140 units across, centred 45 units ahead of its camera on level ground, drawn just before that view (0.14 units a texel: sharper, and four views fill as many shadow pixels as the one map did). With cells, its shadow pass skips the casters outside its box. The square is moved only in whole texels as the sun sees it, or every shadow's edge would crawl as the camera moves. The setup screen's overview keeps the whole-course map.
- **Small parts' shadows** ("Small parts cast shadows"): posts, post blocks and other parts under 0.6 units in radius (one instance's size) cast no shadow when off. M7d4a had already turned off the bolts' shadows; the ones left are the guardrail's and fences' posts and the striped rail's blocks, about 160,000 triangles in Seaside's shadow pass.
- **Parts by name:** the road is a group called `road`, the sea is named `sea`, and each course's dressing builds every piece into a named part (`kitPart` in `kit/kit.js`, names in `KIT_PARTS` in `kit/layout-rules.js`), so a look can hide one part at a time (`showParts` in `scenery.js`, `setLook` in `renderer.js`). A quality level is now one such look.

### Measured without a device

In headless Chromium on the dev box (llvmpipe, software), 960x540. Software frames say little about the iPad's GPU (M6a found it barely notices triangles, and draw calls cost the CPU differently), so these only show that each switch does what it should and what it trades.

One view following a kart 10 s into the race on Seaside Skyway, Medium (the scratch harness, the GPU waited for):

| | Draw calls | Triangles drawn | Frame |
|---|---|---|---|
| As M7d4a: no cells, one shadow map | 308 | 1,153,000 | 0.62 s |
| Cells of 100, one shadow map | 614 | 793,000 | 0.51 s |
| Cells of 100, a map per view | 434 | 509,000 | 0.42 s |

The whole Measure run through the real setup screen (144 cases, 19 minutes in software; it began before the "as M7d4a" look was added, so that row is missing), Medium, averaged over the four moments:

| Look (cells of 100, a map per view, unless named) | 1 view: calls / k triangles | 4 views: calls / k triangles |
|---|---|---|
| Medium | 523 / 639 | 2,078 / 2,581 |
| No shadows | 322 / 377 | 1,260 / 1,490 |
| No barriers | 410 / 270 | 1,620 / 1,076 |
| No props | 462 / 549 | 1,830 / 2,215 |
| No karts | 340 / 571 | 1,375 / 2,319 |
| Small parts' shadows off | 509 / 555 | 2,020 / 2,222 |
| One shadow map over the course | 688 / 911 | 1,626 / 2,024 |
| No cells (a map per view) | 308 / 1,195 | 1,203 / 4,770 |
| Cells of 200 | 429 / 805 | 1,697 / 3,265 |

- **The barriers are the biggest part:** without them a 1-view frame draws 270,000 triangles instead of 639,000. The karts cost the most draw calls (12 karts of 8 meshes each, plus their shadows).
- **Cells trade draw calls for triangles.** With one view they cut the triangles drawn by a third to a half. With 4 views a frame makes about 2,000 draw calls, against 1,200 without cells: whether that is cheaper on the iPad than the triangles saved is the device run's question (Safari's cost per draw call is unknown here).
- **A map per view wins with one view, not with four:** four shadow passes draw more than one pass over the whole course (2,581,000 triangles against 2,024,000 with cells). It also needs cells: without them every lap-long mesh is in every view's shadow pass (4,770,000).
- The software frame times are noisy (High measured faster than Medium in the first look); the iPad's run is what decides.
- Cutting into cells adds under 0.1 s to building a course: Seaside Skyway's 112 meshes become 635 with cells of 100 and 385 with cells of 200 (the Test track's 87 become 158 and 103).

### Device run procedure

1. Host on the iPad, the 3D race, Seaside Skyway. No phones are needed for step 2.
2. On the setup screen, tap **Measure** (next to Look). It takes a minute or two; the progress line says what it is drawing. Then tap **Copy** and paste the report back to Claude. If Copy fails, the report shows in a box: select it and copy by hand. Once more with the Test track chosen, if there is time.
3. With one phone, then four: start a race, open **Tuning**, and in the "Drawing" group flip each switch while driving: "Shadow map per view" (do shadows look sharper at 1, and does any shadow pop in or crawl as you drive?), "Small parts cast shadows" (do you miss the posts' shadows at 0?), "Cull cell size" (each change rebuilds the course, about a second: does anything vanish or flicker at the edges of the screen at 100 or 200?). Note the readout's fps for each.
4. Anything that looks broken: missing pieces, shadows cut off at the edge of a square, the crowd or the boats frozen.

### Device run

On the iPad (Safari 27, canvas 1366x846 CSS pixels drawn at pixel ratio 1), Seaside Skyway, the Measure report (ms with the GPU made to finish each frame, averaged over the four moments, worst moment in brackets):

| Look | 1 view | 4 views | 4 views: calls / k triangles |
|---|---|---|---|
| High | 7.5 (9.0) | 11.9 (14.0) | 2,051 / 2,520 |
| Medium (cells of 100, a map per view, small parts casting) | 6.1 (7.0) | 9.3 (13.0) | 2,037 / 2,520 |
| Low | 6.0 (7.5) | 8.9 (13.0) | |
| Medium, no shadows | 4.9 | 7.4 | 1,220 / 1,431 |
| Medium, no barriers | 5.1 | 6.8 | 1,590 / 1,055 |
| Medium, no props | 5.9 | 8.4 | |
| Medium, no karts | 6.0 | 8.5 | 1,344 / 2,262 |
| Medium, small parts' shadows off | 6.5 | 8.5 | |
| Medium, one shadow map over the course | 6.9 | 8.3 | 1,586 / 1,964 |
| Medium, no cells (a map per view) | 6.0 | 9.3 | 1,190 / 4,749 |
| Medium, cells of 200 | 5.6 | 8.9 | |
| Medium, as M7d4a (no cells, one map) | 5.6 (7.5) | 8.3 (10.0) | 768 / 3,234 |

The other parts (road, sea, supports, decks, gate, surroundings, sky) each changed the frame by under a millisecond either way. CPU time was 1.0-1.4 ms with one view and 2.3-3.9 ms with four.

- **The iPad has plenty of room.** Even High with 4 views takes 12 ms (14 at the worst moment), the GPU waited for, against 16.7 ms for 60 fps and the 33 ms of MK8DX's 30 fps with 3-4 players. And these times are a little pessimistic, since a real frame overlaps the CPU's and the GPU's work.
- **Triangles barely matter, as M6a found:** 4.7 million triangles with 4 views (no cells, a map per view) took the same 9.3 ms as 2.5 million with cells. Differences under about a millisecond are noise (hiding the decks measured slower than drawing them).
- **The cheap wins buy no speed on the iPad.** M7d4a's own drawing was as fast as the new defaults (5.6 against 6.1 ms with one view, 8.3 against 9.3 with four), and cells made no difference that shows above the noise. The draw calls they add cost the CPU about a millisecond with 4 views (2.3 against 3.5 ms).
- **What does cost:** shadows (1.2 ms with one view, 1.9 with four), bloom (1.4 and 2.6), and the barriers (1 and 2.5; the biggest part).
- **Seen while driving:** a shadow map per view looks nicer (sharper); small parts' shadows look nicer on; changing the cell size made no visible difference; nothing broke (no missing pieces, cut-off shadows, frozen crowd or boats). "The shadows and sun really make this look a lot nicer."

**The laptop** (Windows, Chrome 155 on its integrated AMD Radeon graphics, the discrete GPU off; canvas 1707x791 CSS pixels drawn at pixel ratio 1), the same report on Seaside Skyway:

| Look | 1 view | 4 views | 4 views: CPU, calls |
|---|---|---|---|
| High | 23.4 (29.3) | 31.6 (36.1) | 12.6 ms, 2,157 |
| Medium (cells of 100, a map per view) | 9.8 (11.9) | 15.7 (18.3) | 10.3 ms, 2,143 |
| Low | 7.3 | 13.6 | |
| Medium, no shadows | 8.7 | 14.5 | |
| Medium, no barriers | 8.2 | 12.5 | |
| Medium, small parts' shadows off | 9.3 | 14.3 | |
| Medium, one shadow map over the course | 10.3 | 14.8 | 8.9 ms, 1,691 |
| Medium, no cells (a map per view) | 9.9 | 17.4 (19.3) | 8.2 ms, 1,214 |
| Medium, cells of 200 | 9.5 | 15.1 (17.4) | 8.3 ms, 1,726 |
| Medium, as M7d4a (no cells, one map) | 10.0 | 15.8 (17.9) | 6.0 ms, 792 |

- **The laptop is the slow host, as M6a found, and bloom is what it cannot afford:** High costs 13.6 ms more than Medium with one view (23.4 against 9.8), and 16 ms more with four. On Medium it holds 60 fps with one view and stays well inside 30 fps with four (worst 18.3 ms). Bloom at a lower resolution would be the way to make High affordable there.
- **Draw calls cost its CPU** far more than the iPad's: 10.3 ms with 4 views and cells of 100, against 6.0 ms for M7d4a's 792 calls.
- **Cells pay here, with a map per view:** without them 4 views take 17.4 ms (every lap-long mesh in all four shadow passes), with cells of 200 15.1 ms, the best of the per-view choices (cells of 100 15.7, with more draw calls). With one map over the course, cells make no difference (M7d4a's 15.8).

## M7d4b2: detail in textures and light

### What was built

The second half of the techniques spike (plan.md, M7d4b). M7d4b1's choices are now fixed, and four trials try "detail in textures and light, not triangles" against M7d4a's drawing. Each trial is a switch in the tuning panel's "Drawing" group (1 on, 0 drawn as M7d4a did), on by default. A change rebuilds the course, and the Measure tool times each switch the other way and all of them off. No rule changes.

- **M7d4b1's choices, fixed:** cells of 200 (`CELL_SIZE` in `scenery.js`), a shadow map per view in races (`sun.js`; the setup screen's overview keeps one map over the course), and small parts cast shadows. The three M7d4b1 switches and the Measure looks that tried them are gone.
- **Detail in textures** (`textureDetail`), on three pieces. The bolts, seams and panel edges that M7d4a built as shapes are drawn instead in four maps on simpler shapes: colour, relief (a normal map), shade (an ambient occlusion map) and roughness. A new drawing kit, `kit/surface-maps.js`, places a panel, a groove or a bolt in all four maps at once. The relief comes from a height field (M7d4a's `toReliefTexture`), and the shade from the same height field (`toShadeTexture`, new in `kit/pixel-image.js`: darker where the surface lies lower than its surroundings).
  - *The gate's posts* (`kit/gate-post-detail.js`): one rounded shaft per post replaces the core, three panels and 48 bolt heads. The shaft carries their maps, wrapped round it by `wrapUv` (new in `shape-utils.js`). The maps add things the shapes did not have: a fine line cut round each panel, and grime toward each panel's foot. The plinth, band and capital stay shapes, since they change the outline.
  - *The striped rail* (`kit/striped-rail-detail.js`): rebuilt to the study's second look at Toad Harbor. The rails are padded bars 0.38 tall and 0.2 deep with flat faces and rounded edges, nearly filling the height, with a thin dark rod in the gap. Their slanted orange bands have chipped edges and soft dimples in the maps. The post blocks are plain rounded boxes, with their bolts, grime and the dark crease round each rail drawn in maps.
  - *The padded sponsor wall* (`kit/sponsor-wall-detail.js`): every board gets a raised light rim with a bolt in each corner, drawn over a copy of the sponsor atlas at twice the resolution, so the print is sharper too. The pad's maps add a seam between boards, the cushion bulging between seams, two rows of stitching, and MARIO KART printed tone on tone on its front slope, as at Mario Kart Stadium. M7d4a's frame strips, bolt heads and pad seams are gone.
- **Baked shade** (`bakedShade`; `baked-shade.js`, maths in `occlusion.js`): ambient occlusion baked into the vertex colours of the stretch round the start line (50 stations behind it, 70 ahead), once, while the course builds. In three pieces of the stretch, the course is drawn into a 512 depth map from each of 32 directions spread over the sphere (Three.js's depth material, packed into RGBA bytes and read back). A vertex that something stands in front of in a direction gets no sky from it. Its colour is multiplied by the share of the sky it sees (cosine-weighted), down to 0.45 where it sees none. Only meshes coloured per vertex can take it: instanced parts share one shape. Two lessons:
  - The road had a vertex only every 2 units across, and a vertex at a wall's foot cannot tell the wall from itself. So the road's outer lanes are cut again 0.5 and 1.5 units from each edge (`kit/road.js`), and the shade shows as a soft band along the walls' feet.
  - At grazing angles a surface shaded itself (the shadow-acne problem). An offset along the normal and a slack that grows with the slope, both in depth-map texels, fixed it.
- **Light from the course** (`courseLight`; `course-light.js`): an environment map taken from the course itself, as a light probe. Once the course is built, the scene is drawn in six directions from 3 units above the start line and blurred by PMREM. Every material reads its ambient light and reflections from it, at "Light from the course, strength" (a new Look slider, default 1.5). The flat sky light drops to 30% (`scenery.js`). The sea keeps the sky's reflections at M7d4a's strength: at the course light's strength it mirrored so much pale horizon that it turned whitish (seen in software screenshots).
- **Photo-scanned asphalt** (`photoAsphalt`; `photo-asphalt.js`): ambientCG's Asphalt 023 S (CC0, a 1.25 m scan with light and dark stones) as four 1K JPG maps in `assets/textures/` (colour, OpenGL normal, roughness, AO; 4.9 MB, listed with hashes in `assets/manifest.json`). They are loaded in the game's `load()` and laid on the road's asphalt in tiles of 5 units, four times larger than life (at 3 units the stones were too fine to see from the kart). No KTX2. Five sets were compared; 023 S was the one with visible stones, like MK8DX's coarse asphalt (the "clean" sets read as flat grey).
- **Simpler far dressing or LOD: not built.** M7d4b1's numbers say it would not pay. Triangles barely matter on either host (4.7 million took the iPad as long as 2.5 million). LOD swaps would add draw calls, which are what the laptop's CPU pays for. The far dressing's share of the frame (surroundings and sky) was under a millisecond on the iPad.
- **Not redone:** the guardrail (Daisy Circuit's taller three-ridge beam). That waits for the decision below, as do the trial's other pieces.


### Measured without a device

In headless Chromium on the dev box (llvmpipe, software), in a scratch viewer kept out of the repo (as in M7d4a), and in the browser tests. Software says little about the iPad's GPU; these numbers show what each trial costs to build and to draw.

| | Seaside Skyway, every trial off | Seaside Skyway, texture detail on | Test track, off | Test track, on |
|---|---|---|---|---|
| Triangles in the course (karts not counted) | 805,000 | 790,000 | 322,000 | 308,000 |
| The gate's triangles | 14,200 | 9,600 | 14,100 | 9,500 |
| The barriers' triangles | 435,000 | 424,000 | 213,000 | 203,000 |

- **Detail in textures saves few triangles** (about 15,000 on each course; the road's new edge lanes are in both columns). Its point is the look, as M7d4b1 found triangles barely matter. It adds about 1.5 s to building a course in software, for drawing the maps pixel by pixel, mostly the sponsor atlas at twice the resolution (2048x480, four maps).
- **Building a course in software:** about 3.4 s with every trial off. Then 4.0-4.5 s for the bake (96 depth maps of 512, read back), and 1.4-2.2 s for the course light (7 s the first time, when it builds every material's shaders, work the warm-up frame did before). On the iPad these are GPU renders and small readbacks, so the device run's "how long until the course appears" is the number that matters.
- **The bake:** 32 directions over three pieces of the stretch. 40 directions over four pieces took 6.5 s and looked the same. Without the edge lanes and the texel-scaled bias it showed almost nothing at the walls' feet, while open road read as half shaded.
- **The course light at 1.0** looked a little darker than M7d4a's sky light; 1.5 is the default to start from. It turns the road a little bluer (the sky in it) and makes the karts' paint shine more.
- **The browser tests:** the full suite took 17 min 55 s (113 tests), against about 14 minutes before. M7d4b's file takes 2 min 40 s, as its new test rebuilds the course twice.

### Device run procedure

1. Host on the iPad, the 3D race, Seaside Skyway, Look on High; every trial is on by default. Note how long the course takes to appear on the setup screen: since M7d3 about a second, and it now also bakes the shade, takes the light and draws the maps. Note the same when switching to the Test track and back.
2. **Measure** (no phones), then Copy and paste the report back. It now ends with each trial switched off in turn, then all four off (M7d4a's drawing).
3. With one phone, start a race, park where each piece is, open **Tuning**, and in the "Drawing" group flip each switch off and on again. Each flip rebuilds the course, for a second or two. Which way looks closer to MK8DX?
   - "Detail in textures": the gate's posts, up close from the grid (panels, seams, bolts, the line round each panel). The sponsor walls along the start straight (framed boards with corner bolts, the pad's seams and stitching, MARIO KART on the pad). The striped rails on the right after the straight (just past the promenade, s 100-150), and again in the sky (s 700-776): taller padded bars, a dark rod between them, chipped bands, blocks with bolts.
   - "Baked shade": on the grid, look for a soft darker band along the foot of the walls, on the ledges and under the gate. Does the shade stop visibly where the baked stretch ends, about 70 units past the start line?
   - "Light from the course": the whole picture (road, walls, the shade side of things, the karts' shine). Try "Light from the course, strength" in the Look group between about 0.5 and 2.5 and note the best value.
   - "Photo-scanned asphalt": the road near and far. Do the stones show? Does the tile repeat visibly? Is it better or worse than ours?
4. With four phones: the readout's fps on High with every trial on, then every trial off.
5. If there is time, the laptop: Measure only.
6. Anything that looks broken: black or missing pieces, stretched textures on the posts or blocks, a pale sea, dark blotches on the road.

### Device run

On the iPad (Safari 27, canvas 1366x892 CSS pixels drawn at pixel ratio 1 on High and Medium), Seaside Skyway, every trial on. The Measure report (ms with the GPU made to finish each frame, averaged over the four moments, worst moment in brackets):

| Look | 1 view | 4 views | 4 views: calls / k triangles |
|---|---|---|---|
| High | 11.4 (14.0) | 13.3 (15.0) | 1,680 / 3,124 |
| Medium (every trial on) | 7.8 (9.0) | 11.9 (13.0) | 1,666 / 3,124 |
| Low | 7.8 (9.0) | 11.6 (13.0) | |
| Medium, no shadows | 7.5 | 10.5 | 951 / 1,739 |
| Medium, no barriers | 7.6 | 9.5 | 1,329 / 1,213 |
| Medium, no karts | 8.6 | 11.4 | 975 / 2,867 |
| Medium, textureDetail off | 7.6 | 11.8 | 1,651 / 3,177 |
| Medium, bakedShade off | 7.4 | 11.1 | |
| Medium, courseLight off | 7.5 | 11.3 | |
| Medium, photoAsphalt off | 7.8 | 11.5 | |
| Medium, as M7d4a (every trial off) | 6.9 (8.5) | 11.3 (12.0) | 1,651 / 3,177 |

The other parts (road, sea, supports, decks, props, gate, surroundings, sky) each moved the frame by under a millisecond either way, as in M7d4b1. CPU time was 1.8-3.0 ms with one view and 3.5-4.5 ms with four.

- **The trials cost little:** all four on against all off is 0.9 ms with one view and 0.6 ms with four, about M7d4b1's noise. Alone, each costs 0.0-0.4 ms with one view and 0.1-0.8 ms with four; the bake and the course light are the dearest. Texture detail draws 15 fewer draw calls and 53,000 fewer triangles with 4 views.
- **Plenty of room still:** High with 4 views takes 13.3 ms (15 at worst), against 16.7 ms for 60 fps. Bloom cost 3.6 ms with one view (1.4 in M7d4b1, on a slightly smaller canvas). The barriers are still the biggest part (2.4 ms with 4 views).
- **The course appears in under 2 s** on the setup screen (about 1 s after M7d3), with the shade baked, the light taken and the maps drawn.
- **Seen while driving:** with every switch on, the look is closer to MK8DX than with any of them off, so all four trials stay. "Light from the course, strength" tuned to **0.7** (now the default; software suggested 1.5). Nothing looked broken.
- **The readout showed a steady 60 fps with 4 players** on High, where the M7d3 run showed 80-90. The Measure times allow about 75 fps, and a rate pinned at exactly 60 looks like a cap rather than the GPU running out. Not checked: whether Safari's "Prefer Page Rendering Updates near 60fps" feature flag (Settings, Apps, Safari, Advanced, Feature Flags) was on for this run and not for M7d3's.

## M7d4c1: cleanup and tools

### What was built

The first part of M7d4c (plan.md). No rule changes and no new look, except that the baked shade now covers the whole lap.

- **M7d4b2's trials are fixed on** (its device run kept all four): detail in textures on the gate, the striped rail and the padded sponsor wall, the baked shade, the light from the course (strength 0.7) and the photo-scanned asphalt. The "Drawing" group, M7d4a's ways for the three pieces, our drawn asphalt and the old sky-only light are gone. Measure keeps its quality and part looks, without the per-switch looks.
- **The baked shade round the whole lap** (`baked-shade.js`), in pieces of 100 stations with depth maps of 1024, and kept per course for as long as the game runs: switching courses on the setup screen bakes each course once.
- **`npm run kit-shots`**: picture sheets of single kit pieces, lit as in the race, for the review at the end of every later part (plan.md's summary has the usage).
- **A plain course** for the rules browser tests (road, sea and plain walls), set in localStorage by the tests.
- **Watch, no phones: 1 2 3 4 views** on the setup screen: a race of self-driving stand-ins with a view each, for checking the frame rate with several views without four phones.

### Measured without a device

In headless Chromium (llvmpipe, software), in a scratch page kept out of the repo:

| Bake | Seaside Skyway (1211 stations) | Test track (629) |
|---|---|---|
| M7d4b2, the start stretch (96 maps of 512) | 4.3 s | |
| Whole lap, pieces of 40, maps of 512 (992 maps) | 30.5 s | |
| Whole lap, pieces of 100, maps of 1024 (416 maps), as built | 21.5 s | 10 s |
| The same course shown again (saved shade) | 0.2 s | 0.1 s |

- In software the time is the drawing of the depth maps: the vertex loop took 0.9 s, maps of 256 took as long as maps of 512, and drawing 16 maps as tiles of one sheet read back once saved nothing. Each map draws whole 200-unit cells, so bigger pieces cost little more per map. On the iPad the maps are GPU work and readbacks, so the device run's time to appear is the number that matters (M7d4b2's 96 maps fitted in "under 2 s" with the rest of the build).
- **The browser suite:** 112 tests in 14 min 29 s (17 min 55 s after M7d4b2). The rules files on the plain course take 40-54 s each; the look files, which keep the full drawing and now bake the whole lap, 103-149 s.

### Device run procedure

1. Host on the iPad, the 3D race, Look on High. On the setup screen, time how long Seaside Skyway takes to appear the first time (M7d4b2: under 2 s; it now bakes the whole lap). Then switch to the Test track (first time: it bakes too) and back to Seaside Skyway (should be about as quick as M7d3's second: the shade is kept). Note the three times.
2. Open **Tuning**: the "Drawing" group is gone; Look still has "Light from the course, strength" at 0.7.
3. With one phone, drive a whole lap of Seaside Skyway slowly. The soft darker band at the foot of the walls, on the ledges and under things should now run round the whole lap, not stop about 70 units past the start line: look at the sky half (s 340-1076: the guardrails, the garden deck up the climb, the high road) and the seaside half's decks and fences. Look for anything wrong: dark blotches, open road that looks shaded, or a visible step in the shade every 100 units (where the bake's pieces meet).
4. The same on the Test track, one lap.
5. The gate's posts, the striped rails, the sponsor walls and the asphalt should look as on M7d4b2's run with every trial on (they are now the only way).
6. The frame rate with four views, no phones needed: on the setup screen press **Watch, no phones: 4**. Four karts drive themselves with a view each. Open **Tuning** and note the readout's fps on High (M7d4b2: a steady 60 with four players), to check nothing got slower (the bake costs nothing per frame). Back to setup ends it. Watch 1 to 3 give fewer views (3 shows a fourth view of a CPU kart, as a race with three players does).
7. Anything that looks broken: black or missing pieces, a pale sea, stretched textures.

No **Tune:** steps in this part.
