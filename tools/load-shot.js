// Opens a page of host/kit-shots/ in a headless browser and waits until it has drawn its picture. Used by the two
// dev-only picture tools, tools/kit-shots.js and tools/course-previews.js.

// A piece takes 20-60 s to build and draw in software on the dev box. A whole course takes minutes (its build and
// bake come first), and several times that while other runs share the CPU: 180 s timed out in M10's queue.
const SHOT_TIMEOUT_MS = 900000;

// Fails with the page's own message when it reports an error (an unknown piece or course, or building threw) or
// throws one. `label` names the shot in that message.
export async function loadShot(page, url, label) {
  const pageErrors = [];
  const onPageError = (error) => pageErrors.push(error.message);
  page.on('pageerror', onPageError);
  try {
    // Not waiting for "load": the page's module builds the whole course before it finishes loading.
    await page.goto(url, { waitUntil: 'commit' });
    const outcome = await page.waitForFunction(
      () => window.kitShotReady === true || window.kitShotError || null,
      null,
      { timeout: SHOT_TIMEOUT_MS },
    ).then((handle) => handle.jsonValue());
    if (outcome !== true || pageErrors.length > 0) {
      throw new Error(`${label}: ${pageErrors[0] ?? outcome}`);
    }
  } finally {
    page.off('pageerror', onPageError);
  }
}
