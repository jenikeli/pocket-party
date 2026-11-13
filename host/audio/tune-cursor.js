// Where a playing tune is up to, on the audio clock: hands the sequencer (host/audio/music.js) the events that
// fall before a horizon, the intro once and then the loop over and over. Plain logic, no Web Audio, so the
// tests can check what happens after a long pause.

// `compiled` is compileTune()'s result (host/audio/notation.js); the first note sounds at `startTime`.
// Returns { due(now, horizon) }: the events from where it left off up to `horizon`, each { event, time }.
// Events whose time is already before `now` are passed over, not returned: after the page was hidden (timers
// slowed or stopped) the tune picks up where the clock is, instead of playing everything it missed at once.
export function createTuneCursor(compiled, startTime) {
  let section = compiled.intro ?? compiled.loop;
  let sectionStart = startTime;
  let index = 0;

  // Into the next section once this one has run out. Whole loops that went by while nobody was scheduling are
  // skipped in one step, however long the pause was.
  function nextSection(now) {
    sectionStart += section.seconds;
    section = compiled.loop;
    index = 0;
    const loopsBehind = Math.floor((now - sectionStart) / section.seconds);
    if (loopsBehind > 0) {
      sectionStart += loopsBehind * section.seconds;
    }
  }

  return {
    due(now, horizon) {
      const due = [];
      for (;;) {
        if (index >= section.events.length) {
          nextSection(now);
          continue;
        }
        const event = section.events[index];
        const time = sectionStart + event.time;
        if (time >= horizon) {
          return due;
        }
        index++;
        if (time >= now) {
          due.push({ event, time });
        }
      }
    },
  };
}
