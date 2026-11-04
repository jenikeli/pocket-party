# Unused parts of the codebase

Code, assets and tools that the game itself does not use, kept on purpose. Each entry lists what to delete, so a
cleanup is quick when it is wanted. Add an entry whenever something is kept but unused; remove it once it is
deleted or used again. Last checked 2026-11-04 (end of M7e).

## The Blender pipeline (dev only; kept for a future course)

Built in M7d4c2 as a spike: a palm modelled and baked in Blender, compared with our JS palm. The race draws our JS
palm; nothing on Seaside Skyway or the Test track comes from Blender (decided after M7d4c2). Kept as the
working example of the pipeline, for a future course built in Blender.

To remove it, delete or edit all of:
- `tools/blender.js`, `tools/blender/palm.py` and `tools/blender/common.py`
- `test/unit/blender-tool.test.js`
- the `blender` script in `package.json`
- `assets/models/palm.glb` (929 KB) and its entry in `assets/manifest.json`
- `host/kit-shots/blender-palm.js`, and in `host/kit-shots/pieces.js` the pieces `palm-blender`,
  `palms-side-by-side` and `palm-blender-close` (with `BLENDER_PALM`, `PALMS_SIDE_BY_SIDE` and the import)
- `host/vendor/three-0.186.1/addons/loaders/GLTFLoader.js` and `addons/utils/SkeletonUtils.js`: only the Blender
  palm loads a `.glb` (`SkeletonUtils.js` is GLTFLoader's own helper)
- the `npm run blender` line in `CLAUDE.md`'s Commands, and the Python exception in its Conventions
- Blender Lab's MCP server, registered for Claude at local scope (not in the repo): `claude mcp remove blender`

**Deleted:** the Blender build of Blaze (M7d5) and its kart, on the branch `worktree-agent-ac20ede945a7b4b57`, was
deleted on 2026-11-04 without merging, since the JS karts were chosen. Its last commit, `94726dd`, can be
recovered from the reflog for about 90 days (`git branch blender-blaze 94726dd`).

## To go in M10 Polish

Still drawn in the race, but planned for removal when Seaside Skyway is brought down by the sea (M10's first step):
- the floating islands and the backdrop cliffs (`kit/floating-island.js`, the cliffs in `seaside-sky.js` and
  `seaside-landmarks.js`), which looked bad on the M7d4c3-d device run.

## Small things in the code

- `isOnRoad` in `host/games/kart-2d/track.js`: used only by its unit test (`test/unit/kart-track.test.js`); the
  2D race's rules use `wallContact` and `lapPosition`.
- About 30 constants and functions are exported but used only inside their own file (for example `GRAVITY` in
  `kart-physics.js`, the layout constants in `host/settings-panel.js`). They are not dead code; the `export` is
  just unneeded. Not worth a change on its own.
- About 45 exports are used only by tests (constants such as `SLIPSTREAM_SECONDS`, the 2D race's button positions).
  That is expected: tests read the same numbers as the code.

How these were found: a scan of every `export` in `host/`, `controller/`, `shared/`, `server/` and `tools/`
for its name in the other files (tests counted apart), and a check that every vendored file is imported by
something.
