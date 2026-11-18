import * as React from "react"
import Toast from "st/components/toast"
import {advanceTimer, formatCountdown} from "st/practice_timer"
import styles from "./practice_timer.module.css"

export default class PracticeTimer extends React.Component {
  state = {open: false, minutes: "5", seconds: "0", intervals: "1", run: null}
  toggleButton = React.createRef()
  panel = React.createRef()

  componentDidMount() {
    document.addEventListener("visibilitychange", this.tick)
  }

  componentWillUnmount() {
    document.removeEventListener("visibilitychange", this.tick)
    clearInterval(this.clock)
  }

  closePanel = () => {
    this.setState({open: false}, () => this.toggleButton.current.focus())
  }

  tick = () => {
    const now = Date.now()
    this.setState(state => {
      if (state.run?.deadline == null) return null
      const {run, expired} = advanceTimer(state.run, now)
      if (!expired) return {now}
      const finished = !run.remaining
      const completed = Number(state.intervals) - run.remaining
      return {
        run,
        now,
        message: finished
          ? "Practice timer complete."
          : `Interval ${completed} of ${state.intervals} complete. Next interval started.`,
        notificationId: (state.notificationId || 0) + 1,
      }
    }, () => {
      if (this.state.run?.deadline == null) clearInterval(this.clock)
    })
  }

  start = event => {
    event.preventDefault()
    const {minutes, seconds, intervals} = this.state
    const duration = (Number(minutes) * 60 + Number(seconds)) * 1000
    if (!duration) {
      this.setState({error: "Enter a duration of at least one second."})
      return
    }
    const now = Date.now()
    this.setState({
      now,
      error: null,
      message: null,
      run: {duration, deadline: now + duration, remaining: Number(intervals), pausedMs: 0},
    })
    this.startClock()
  }

  startClock() {
    clearInterval(this.clock)
    this.clock = setInterval(this.tick, 200)
  }

  pause = () => {
    this.tick()
    this.setState(state => {
      if (state.run.deadline === null) return null
      return {run: {...state.run, pausedMs: state.run.deadline - state.now, deadline: null}}
    })
  }

  resume = () => {
    const now = Date.now()
    this.setState(state => ({now, run: {...state.run, deadline: now + state.run.pausedMs}}))
    this.startClock()
  }

  reset = () => {
    clearInterval(this.clock)
    this.setState({run: null, message: null, error: null})
  }

  render() {
    const {open, run, now, minutes, seconds, intervals, error, message, notificationId} = this.state
    const active = Boolean(run?.remaining)
    const running = run?.deadline != null
    const countdown = run
      ? (running ? run.deadline - now : run.pausedMs)
      : (Number(minutes) * 60 + Number(seconds)) * 1000

    return <>
      <button type="button" className={styles.launcher} ref={this.toggleButton}
        aria-expanded={open} aria-controls="practice-timer-panel" onClick={() => {
          if (open) this.closePanel()
          else this.setState({open: true}, () => this.panel.current.focus())
        }}>Practice timer{active ? ` · ${formatCountdown(countdown)}` : ""}</button>

      <aside id="practice-timer-panel" hidden={!open} className={styles.panel}
        aria-labelledby="practice-timer-heading" ref={this.panel} tabIndex={-1}
        onKeyDown={event => {
          if (event.key === "Escape") {
            event.stopPropagation()
            this.closePanel()
          }
        }}>
        <div className={styles.heading}>
          <h2 id="practice-timer-heading">Practice timer</h2>
          <button type="button" onClick={this.closePanel}>Close</button>
        </div>
        <p>Set the length of each interval and how many to run. The timer keeps going as you switch tools in this tab.</p>
        <form onSubmit={this.start}>
          <div className={styles.fields}>
            {[
              ["Minutes", "minutes", minutes, 0, 120],
              ["Seconds", "seconds", seconds, 0, 59],
              ["Intervals", "intervals", intervals, 1, 20],
            ].map(([label, field, value, min, max]) => <label key={field}>{label}
              <input type="number" required min={min} max={max} value={value} disabled={active}
                onChange={event => this.setState({[field]: event.target.value, run: null, error: null})} />
            </label>)}
          </div>
          {error && <p role="alert">{error}</p>}
          <div className={styles.countdown} role="timer">{formatCountdown(countdown)}</div>
          {active && <p>Interval {Number(intervals) - run.remaining + 1} of {intervals}{running ? "" : " · Paused"}</p>}
          <div className={styles.actions}>
            {!active && <button type="submit">{run ? "Start again" : "Start"}</button>}
            {active && <button type="button" onClick={running ? this.pause : this.resume}>
              {running ? "Pause" : "Resume"}
            </button>}
            {run && <button type="button" onClick={this.reset}>Reset</button>}
          </div>
        </form>
      </aside>
      <div className={styles.notification}>
        <Toast message={message} notificationId={notificationId} onDismiss={() => this.setState({message: null})} />
      </div>
    </>
  }
}
