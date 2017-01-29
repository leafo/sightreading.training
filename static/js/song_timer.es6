
export default class SongTimer {
  constructor(opts={}) {
    this.beat = 0
    this.running = false
    this.song = opts.song
    this.playingNotes = []

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
    this.clearPlayingNotes()
  }

  reset() {
    this.running = false
    this.clearPlayingNotes()
    this.beat = 0
    this.onUpdate(this.beat);
  }

  scrub(amount) {
    this.beat += amount
    this.beat = Math.max(0, this.beat)
    this.clearPlayingNotes()
    this.onUpdate(this.beat);
  }

  restart() {
    this.beat = 0
    this.clearPlayingNotes()
  }

  // should be called whenever we stop or scrub
  clearPlayingNotes() {
    if (this.playingNotes.length) {
      for (let note of this.playingNotes) {
        this.onNoteStop(note)
      }
      this.playingNotes = []
    }
  }

  start(bpm=60) {
    // TODO: calling start on a running thing will cause double timers
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

      // see if any notes have stopped
      if (this.song && this.playingNotes.length) {
        let stopped = 0
        for (let i = 0; i < this.playingNotes.length; i++) {
          let note = this.playingNotes[i]
          if (this.beat >= note.start + note.duration) {
            this.playingNotes[i] = null
            stopped += 1
            this.onNoteStop(note)
          }
        }

        if (stopped > 0) {
          this.playingNotes = this.playingNotes.filter(n => n)
        }
      }

      // see if any new notes have turned on
      if (searchOffset != null) {
        let sortedNotes = this.getSortedSongNotes()
        for (let i = searchOffset; i < sortedNotes.length; i++) {
          let note = sortedNotes[i]
          if (note.start <= this.beat) {
            searchOffset += 1
            this.playingNotes.push(note)
            this.onNoteStart(note)
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
