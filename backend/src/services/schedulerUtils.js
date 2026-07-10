// Wraps a scheduler tick so a run that outlives its interval can't overlap
// the next one — overlapping sweeps compound DB load and double-fire actions.
function nonOverlapping(name, fn) {
  let running = false;
  return async (...args) => {
    if (running) {
      console.warn(`[${name}] previous run still in progress, skipping this tick`);
      return;
    }
    running = true;
    try {
      return await fn(...args);
    } finally {
      running = false;
    }
  };
}

module.exports = { nonOverlapping };
