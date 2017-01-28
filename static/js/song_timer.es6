
export default class SongTimer {
  constructor(opts={}) {
    this.beat = 0
    this.bpm = opts.bpm || 1
    this.running = false

    if (opts.onUpdate) {
      this.onUpdate = opts.onUpdate
    }
  }

  onUpdate(beat) {
  }

  reset() {
    this.running = false
    this.beat = 0
  }

  restart() {
    this.beat = 0
  }

  start() {
    if (this.running) { this.reset() }

    let lastFrame = performance.now();

    let frameUpdate = time => {
      let dt = (time - lastFrame) / 1000
      lastFrame = time

      if (!this.running) { return }
      if (dt == 0) { return }

      this.beat += this.bpm * dt / 60
      this.onUpdate(this.beat);
      window.requestAnimationFrame(frameUpdate);
    }

    this.running = true
    window.requestAnimationFrame(frameUpdate);
  }
}
