
export default class SongTimer {
  constructor(opts={}) {
    this.beat = 0
    this.running = false

    if (opts.onUpdate) {
      this.onUpdate = opts.onUpdate
    }
  }

  onUpdate(beat) {
  }

  beatsToSeconds(beats) {
    return beats / this.bpm * 60
  }

  secondsToBeats(sec) {
    return sec / 60 * this.bpm
  }

  setBpm(bpm) {
    this.bpm = bpm
  }

  reset() {
    this.running = false
    this.beat = 0
    this.onUpdate(this.beat);
  }

  restart() {
    this.beat = 0
  }

  start(bpm=60) {
    if (this.running) { this.reset() }

    if (bpm) {
      this.bpm = bpm
    }

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
