// What the Measure tool (measure-run.js) asks of the 3D race's WebGL renderer: wait for the GPU to finish a
// frame, how much the frame drew, and the GPU's name. Plain functions of a Three.js WebGLRenderer whose
// info.autoReset is off (renderer.js counts each whole frame). Used by host/games/kart-3d/renderer.js.

// Blocks until the GPU has finished everything asked of it so far. Reading back one pixel needs the finished
// picture, so the browser has to wait for the GPU: the only way to time a frame's GPU work that works on Safari
// too (it has no GPU timer queries).
export function waitForGpu(renderer) {
  const gl = renderer.getContext();
  renderer.setRenderTarget(null);
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
}

// What the last frame drew: { drawCalls, triangles }, shadow passes included.
export function frameStats(renderer) {
  return { drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
}

// The GPU's name where the browser tells it (Safari says only "Apple GPU").
export function describeGpu(renderer) {
  const gl = renderer.getContext();
  const extension = gl.getExtension('WEBGL_debug_renderer_info');
  return extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
}
