
export default class SongTimer {
  constructor(opts={}) {
    this.beat = 0
    this.running = false
    this.song = opts.song

    for (let cb of ["onUpdate", "onNoteStart", "onNoteStop"]) {
      if (opts[cb]) {
        this[cb] = opts[cb]
      }
    }
  }

  getSortedSongNotes() {
    if (!this.song) {
      console.warn("no song on timer")
      return
    }

    if (!this.sortedSongNotes) {
      this.sortedSongNotes = [...this.song]
      this.sortedSongNotes.sort((a,b) => a.start - b.start)
    }

    return this.sortedSongNotes
  }

  // search offset start location for the given beat in sorted notes
  findSearchOffset(beat, startAt=0) {
    let sortedNotes = this.getSortedSongNotes()
    if (!sortedNotes) return

    for (let i = startAt; i < sortedNotes.length; i++) {
      let note = sortedNotes[i]
      if (note.start >= beat) {
        return i
      }
    }

    return 0
  }

  onUpdate(beat) {
  }

  onNoteStart(note) {
  }

  onNoteStop(note) {
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

  pause() {
    this.running = false
  }

  reset() {
    this.running = false
    this.beat = 0
    this.onUpdate(this.beat);
  }

  scrub(amount) {
    this.beat += amount
    this.beat = Math.max(0, this.beat)
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

    let lastFrame = performance.now()
    let lastBeat = this.beat

    let searchOffset = this.findSearchOffset(this.beat)

    let frameUpdate = time => {
      let dt = (time - lastFrame) / 1000
      lastFrame = time

      if (!this.running) { return }
      if (dt == 0) { return }

      if (lastBeat != this.beat) {
        // there was a seek, update position
        searchOffset = this.findSearchOffset(this.beat)
      }

      this.beat += this.bpm * dt / 60
      lastBeat = this.beat

      // see if any new notes have turned on
      if (searchOffset != null) {
        let sortedNotes = this.getSortedSongNotes()
        for (let i = searchOffset; i < sortedNotes.length; i++) {
          let note = sortedNotes[i]
          if (note.start <= this.beat) {
            console.log("note started", note.toString())
            searchOffset += 1
          }
        }
      }

      this.onUpdate(this.beat);
      window.requestAnimationFrame(frameUpdate);
    }

    this.running = true
    window.requestAnimationFrame(frameUpdate);
  }
}
