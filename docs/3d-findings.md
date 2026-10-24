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
