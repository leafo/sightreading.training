
export default class SongTimer {
  constructor(opts={}) {
    this.beat = 0
    this.bpm = opts.bpm || 1
    this.stopped = true

    if (opts.onUpdate) {
      this.onUpdate = opts.onUpdate
    }
  }

  onUpdate(beat) {
  }

  reset() {
    this.stopped = true
    this.beat = 0
  }

  restart() {
    this.beat = 0
  }

  start() {
    if (!this.stopped) { this.reset() }

    let lastFrame = performance.now();
    this.stopped = false

    let frameUpdate = time => {
      let dt = (time - lastFrame) / 1000
      lastFrame = time

      if (this.stopped) { return }
      if (dt == 0) { return }

      this.beat += this.bpm * dt / 60
      this.onUpdate(this.beat);
      window.requestAnimationFrame(frameUpdate);
    }

    window.requestAnimationFrame(frameUpdate);
  }
}
