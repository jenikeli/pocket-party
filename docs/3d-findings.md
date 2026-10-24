# 3D findings (M6 spikes)

Measured results of the M6 spikes, read by M6b, M6c and M7. Like `docs/spike-findings.md`, these numbers are measured facts that override general assumptions and `docs/mk8dx-reference.md`. They come from single runs on a few devices.

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
