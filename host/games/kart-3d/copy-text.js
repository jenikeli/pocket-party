// Copying the 3D race's developer text (the tuning values, the Measure report) to the clipboard, to paste back to
// Claude. Used by host/games/kart-3d/tuning-panel.js and measure-panel.js.

// The clipboard needs a secure context (the HTTPS host has one) and a tap, which the click calling this is. If
// the browser still refuses, the text shows in `box` (a textarea), selected, to copy by hand. `status` is a line
// that says which happened.
export async function copyText(text, status, box) {
  try {
    await navigator.clipboard.writeText(text);
    box.hidden = true;
    status.textContent = 'Copied';
  } catch (error) {
    console.error('Copying to the clipboard failed, showing the text to copy by hand', error);
    box.hidden = false;
    box.value = text;
    box.select();
    status.textContent = 'Select and copy the text below';
  }
}
