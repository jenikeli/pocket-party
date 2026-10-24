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

To fill in from the device run. On each device: open `/host` over HTTPS on the LAN IP, pick "3D spike (dev)", Start, wait 10 s, Run benchmark, then copy the table here. For a cold load, open the host page in a private tab (so nothing is cached) and copy the load line before anything else.

**iPad** (model, iPadOS version):

```
(benchmark table)
```

Cold load line:

**Laptop** (model, OS, browser):

```
(benchmark table)
```

Cold load line:

**Decisions to draw from the tables:** which costs fit MK8DX's bar (60 fps, busy under about 14 ms, with 1-2 views; a steady 30 fps, busy under about 30 ms, with 4 views), at what resolution, and with how many karts (12 for a full CPU field, or fewer).

### What the game module interface needed

The spike ran on the M5a interface with no change to it. What it needed, and where that lives:

- **The import map.** Three.js add-ons import the bare name `three`. `host/index.html` now has an import map (before any module script) that points `three` at `/host/vendor/three-0.186.1/three.module.js` and `three/addons/` at its add-ons folder. Import maps need Safari 16.4 or later (iPadOS 16.4, March 2023).
- **Resizing and pixel ratio:** the game handles both itself. A `ResizeObserver` on its container resizes the renderer, and the pixel ratio is the game's own setting. The shell needs nothing new.
- **WebGL context loss:** the renderer notes the `webglcontextlost` event and the next `render()` throws, so the shell's existing error path ends the game and shows "stopped with an error" in the lobby (browser-tested with `WEBGL_lose_context`). M7 may want to recover instead: its state is plain data, so it could rebuild the renderer and carry on. That is a game-side choice, not an interface change.
- **Freeing the context:** `stop()` calls `renderer.dispose()` and `renderer.forceContextLoss()`, so the context is freed at once and not when the canvas is garbage collected (iOS allows a page only a few contexts). The shell's own Phaser context stays alive but idle while a game runs.
- **Capping at 30 fps** lives in the game's `render()`: it skips drawing until 1/30 s minus 4 ms has passed (the 4 ms absorbs animation-frame jitter), while the runner keeps stepping at 60 Hz. Open question for the device run: does that give an even 30 fps (p95 close to 33 ms)? If not, M7 should move the cap into `host/game-runner.js`.
- **Load timing** needs the game's heavy code imported inside `load()` (a dynamic `import()` of the renderer module), not imported statically by the game's `index.js`, or it loads before `load()` runs.
