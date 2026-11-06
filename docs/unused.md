# Unused parts of the codebase

Code, assets and tools that the game itself does not use, kept on purpose. Each entry lists what to delete, so a
cleanup is quick when it is wanted. Add an entry whenever something is kept but unused; remove it once it is
deleted or used again. Last checked 2026-11-06 (end of M9).

## Deleted

- **The Blender pipeline** (M7d4c2's spike: `tools/blender.js` and its Python scripts, the Blender palm
  `assets/models/palm.glb`, its kit-shots pieces, the vendored `GLTFLoader.js` and `SkeletonUtils.js`, the
  `npm run blender` command), deleted on 2026-11-06 at the user's request: every look is built in JS. Blender, Blender
  Lab's MCP server and its add-on were removed from the dev box too. Recoverable from git (the commit before
  "blender removed").
- **The Blender build of Blaze** (M7d5) and its kart, on the branch `worktree-agent-ac20ede945a7b4b57`, was deleted on
  2026-11-04 without merging, since the JS karts were chosen. Its last commit, `94726dd`, can be recovered from the
  reflog for about 90 days (`git branch blender-blaze 94726dd`).

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
