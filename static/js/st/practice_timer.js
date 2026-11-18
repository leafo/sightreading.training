export function advanceTimer(run, now) {
  if (run.deadline === null || now < run.deadline) {
    return {run, expired: 0}
  }

  // Catch up after a background tab throttles callbacks without shifting the schedule.
  const expired = Math.min(run.remaining, 1 + Math.floor((now - run.deadline) / run.duration))
  const remaining = run.remaining - expired
  return {
    expired,
    run: {
      ...run,
      remaining,
      deadline: remaining ? run.deadline + expired * run.duration : null,
      pausedMs: 0,
    },
  }
}

export function formatCountdown(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}
