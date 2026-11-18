import {advanceTimer, formatCountdown} from "st/practice_timer"

describe("practice timer", () => {
  const running = {deadline: 1000, duration: 1000, remaining: 4, pausedMs: 0}

  it("keeps the original schedule when callbacks arrive late", () => {
    const {run, expired} = advanceTimer(running, 3200)
    expect(expired).toBe(3)
    expect(run.remaining).toBe(1)
    expect(run.deadline).toBe(4000)
  })

  it("finishes at the final deadline and cannot expire twice", () => {
    const {run, expired} = advanceTimer(running, 4000)
    expect(expired).toBe(4)
    expect(run.remaining).toBe(0)
    expect(run.deadline).toBeNull()
    expect(advanceTimer(run, 5000).expired).toBe(0)
  })

  it("keeps paused and unexpired timers unchanged", () => {
    const paused = {...running, deadline: null, pausedMs: 400}
    expect(advanceTimer(paused, 5000).run).toBe(paused)
    expect(advanceTimer(running, 999).run).toBe(running)
  })

  it("rounds up until expiry and clamps negative time", () => {
    expect(formatCountdown(60001)).toBe("1:01")
    expect(formatCountdown(-1)).toBe("0:00")
  })
})
