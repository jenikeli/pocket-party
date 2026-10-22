// Controller entry point. For M0 it only shows what the browser supports, to confirm the page loads on each phone.
// Loaded by controller/index.html.

function listDeviceInfo() {
  return {
    'Page URL': location.href,
    'Secure context': String(window.isSecureContext),
    // Both are missing entirely over plain HTTP (measured in the spike); they appear once we serve HTTPS (M2).
    'Tilt API': 'DeviceOrientationEvent' in window ? 'present' : 'missing',
    'Wake Lock API': 'wakeLock' in navigator ? 'present' : 'missing',
  };
}

function showDeviceInfo() {
  const list = document.getElementById('device-info');
  for (const [label, value] of Object.entries(listDeviceInfo())) {
    const term = document.createElement('dt');
    term.textContent = label;
    const detail = document.createElement('dd');
    detail.textContent = value;
    list.append(term, detail);
  }
}

showDeviceInfo();
