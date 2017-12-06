
import {parseNote, noteName, MIDDLE_C_PITCH} from "st/music"

export class SongNoteTimer {
  constructor(opts={}) {
    this.bpm = opts.bpm || 60
    this.onTime = opts.onTime

    this.onStop = opts.onStop
    this.onStart = opts.onStart
  }

  getPromise() {
    return this.running
  }

  start() {
    if (this.running) {
      console.error("timer already running")
      return
    }

    this.running = new Promise((resolve, reject) => {
      this.promiseResolve = resolve
      this.promiseReject = reject
    })

    if (this.onStart) {
      this.onStart()
    }

    let startTime = performance.now()

    let frameUpdate = time => {
      let beat = (performance.now() - startTime) / 1000 / 60 * this.bpm

      if (this.onTime) {
        this.onTime(beat)
      }

      if (this.running) {
        window.requestAnimationFrame(frameUpdate);
      }
    }

    window.requestAnimationFrame(frameUpdate);
  }

  stop() {
    if (!this.running) {
      console.error("timer not running")
      return
    }

    if (this.onStop) {
      this.onStop()
    }

    this.promiseResolve()

    delete this.running
    delete this.promiseResolve
    delete this.promiseReject
  }
}

// like note list but notes in time
export class SongNoteList extends Array {
  constructor() {
    super()
    Object.setPrototypeOf(this, SongNoteList.prototype)
  }

  static newSong(noteTuples) {
    let notes = noteTuples.map(([note, start, duration]) =>
      new SongNote(note, start, duration))

    let song = new SongNoteList()
    for (let note of notes) {
      song.push(note)
    }

    return song
  }


  play(midiOutput) {
    // organize all notes by their start beat
    let currentIdx = 0
    let notes = [...this]
    notes.sort((a,b) => a.start - b.start)

    if (!notes.length) {
      return resolve()
    }

    let startBeat = notes[0].start

    let playingNotes = []

    let timer = new SongNoteTimer({
      bpm: 60,
      onStop: () => {
        playingNotes.forEach(note => midiOutput.noteOff(parseNote(note.note)))
      },
      onTime: (beat) => {
        beat = beat + startBeat // start the melody immediately
        while (notes[currentIdx] && (beat >= notes[currentIdx].start)) {
          let note = notes[currentIdx]
          midiOutput.noteOn(parseNote(note.note), 100)
          playingNotes.push(note)
          currentIdx += 1
        }

        let haveFinished = false
        for (let note of playingNotes) {
          if (beat >= note.start + note.duration) {
            haveFinished = true
            break
          }
        }

        if (haveFinished) {
          playingNotes = playingNotes.filter(note => {
            let finished = beat >= note.start + note.duration
            if (finished) {
              midiOutput.noteOff(parseNote(note.note))
            }

            return !finished
          })
        }

        if (currentIdx >= notes.length && playingNotes.length == 0) {
          timer.stop()
        }
      }
    })

    timer.start()
    return timer
  }

  humanize(amount=1) {
    for (let note of this) {
      note.start += Math.random() / 100 * amount
      note.duration -= 0.2
    }
  }

  // find the notes that fall in the time range
  notesInRange(start, stop) {
    // TODO: this is slow
    return [...this.filter((n) => n.inRange(start, stop))]
  }

  getStopInBeats() {
    if (this.length == 0) { return 0 }
    return Math.max.apply(null, this.map((n) => n.getStop()))
  }

  getStartInBeats() {
    if (this.length == 0) { return 0 }
    return Math.min.apply(null, this.map((n) => n.getStart()))
  }

  noteRange() {
    if (!this.length) { return }

    let min = parseNote(this[0].note)
    let max = min

    for (let songNote of this) {
      let pitch = parseNote(songNote.note)
      if (pitch < min) {
        min = pitch
      }

      if (pitch > max) {
        max = pitch
      }
    }

    return [noteName(min), noteName(max)]
  }

  fittingStaff() {
    let [min, max] = this.noteRange()
    let useBase = false
    let useTreble = false

    if (parseNote(max) > MIDDLE_C_PITCH + 4) {
      useTreble = true
    }

    if (parseNote(min) < MIDDLE_C_PITCH - 4) {
      useBase = true
    }

    if (useTreble && useBase) {
      return "grand"
    } else if (useBase) {
      return "bass"
    } else {
      return "treble"
    }
  }


  // see if we're hitting a valid note
  // TODO: this is very slow
  matchNote(findNote, beat) {
    let foundIdx = null

    for (let idx=0; idx < this.length; idx++) {
      let note = this[idx]

      if (parseNote(note.note) != parseNote(findNote)) {
        continue
      }

      if (foundIdx != null) {
        let found = this[foundIdx]
        if (Math.abs(found.start - beat) > Math.abs(note.start - beat)) {
          foundIdx = idx
        }
      } else {
        foundIdx = idx
      }
    }

    return foundIdx
  }
}

// note: C4, D#5, etc...
// start: when note begings in beats
// duration: how long note is in beats
export class SongNote {
  constructor(note, start, duration) {
    this.note = note
    this.start = start
    this.duration = duration
  }

  inRange(min, max) {
    let stop = this.start + this.duration

    if (min >= stop) { return false }
    if (max <= this.start) { return false }

    return true
  }

  getStart() {
    return this.start
  }

  getStop() {
    return this.start + this.duration
  }

  getRenderStop() {
    // make it slightly shorter so it's easier to read
    return this.start + this.duration
  }

  toString() {
    return `${this.note},${this.start},${this.duration}`
  }
}

