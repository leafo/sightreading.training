
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

  stop(val) {
    if (!this.running) {
      console.error("timer not running")
      return
    }

    if (this.onStop) {
      this.onStop()
    }

    this.promiseResolve(val || "stop")

    delete this.running
    delete this.promiseResolve
    delete this.promiseReject
  }
}

export class Song {
  constructor(metadata)  {
    this.metadata = metadata
    this.tracks = []
  }

  getTrack(idx) {
    let noteList = this.tracks[idx]
    if (!noteList) {
      noteList = new SongNoteList()
      this.tracks[idx] = noteList
    }

    return noteList
  }
}


// like note list but notes in time
export class SongNoteList extends Array {
  static bucketSize = 8 // bucket size in beats

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

  clone() {
    let song = new SongNoteList()

    this.forEach(note =>
      song.push(note.clone())
    )

    return song
  }

  clearCache() {
    delete this.buckets
  }

  play(midiOutput, opts={}) {
    // organize all notes by their start beat
    let currentIdx = 0
    let notes = [...this]
    notes.sort((a,b) => a.start - b.start)

    if (!notes.length) {
      return null
    }

    let startBeat = notes[0].start

    let playingNotes = []

    let timer = new SongNoteTimer({
      bpm: opts.bpm,
      onStop: () => {
        playingNotes.forEach(note => midiOutput.noteOff(parseNote(note.note)))
      },
      onTime: (beat) => {
        beat = beat + startBeat // start the melody immediately

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

        while (notes[currentIdx] && (beat >= notes[currentIdx].start)) {
          let note = notes[currentIdx]
          midiOutput.noteOn(parseNote(note.note), 100)
          playingNotes.push(note)
          currentIdx += 1
        }

        if (currentIdx >= notes.length && playingNotes.length == 0) {
          timer.stop("finish")
        }
      }
    })

    timer.start()
    return timer
  }

  transpose(amount=0) {
    if (amount == 0) {
      return this
    }

    let song = new SongNoteList()

    this.forEach(note =>
      song.push(note.transpose(amount))
    )

    return song
  }

  humanize(amount=1) {
    let song = this.clone()

    for (let note of song) {
      note.start += Math.random() / 100 * amount
      note.duration -= 0.2
    }

    return song
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

  getBucketRange(start, stop) {
    let bucketSize = SongNoteList.bucketSize

    let left = Math.floor(start / bucketSize)
    let right = Math.ceil(stop / bucketSize)
    return [left, right]
  }

  buildBuckets() {
    let buckets = {}
    this.forEach((songNote, idx) => {
      let [left, right] = this.getBucketRange(songNote.getStart(), songNote.getStop())
      for (let i=left; i < right; i++) {
        if (!buckets[i]) buckets[i] = []
        buckets[i].push(idx)
      }
    })

    return buckets
  }

  // get the buckets to scan to match notes for beat
  adjacentBuckets(beat) {
    return this.getBucketRange(beat - 1, beat + 1)
  }

  getBuckets() {
    if (!this.buckets) {
      this.buckets = this.buildBuckets()
    }

    return this.buckets
  }

  matchNoteFast(findNote, beat, wrapRight, wrapLeft) {
    let buckets = this.getBuckets()
    let [left, right] = this.adjacentBuckets(beat)

    let foundIdx = null

    for (let bucketIdx = left; bucketIdx < right; bucketIdx ++) {
      let bucket = buckets[bucketIdx]
      if (!bucket) continue
      for (let songNoteIdx of bucket) {
        let note = this[songNoteIdx]

        if (foundIdx == songNoteIdx) {
          continue
        }

        if (parseNote(note.note) != parseNote(findNote)) {
          continue
        }

        if (foundIdx != null) {
          let found = this[foundIdx]
          if (Math.abs(found.start - beat) > Math.abs(note.start - beat)) {
            foundIdx = songNoteIdx
          }
        } else {
          foundIdx = songNoteIdx
        }
      }
    }

    if (wrapRight) {
      let delta = wrapRight - beat
      if (delta < 2) {
        let wrapFoundIdx = this.matchNoteFast(findNote, wrapLeft - delta)
        if (wrapFoundIdx != null) {
          let found = this[wrapFoundIdx]
          if (foundIdx != null) {
            let current = this[foundIdx]
            if (Math.abs(found.start - (wrapLeft - delta)) < Math.abs(current.start - beat)) {
              foundIdx = wrapFoundIdx
            }
          } else {
            foundIdx = wrapFoundIdx
          }
        }
      }
    }

    return foundIdx
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
    this.id = Symbol()
    this.note = note
    this.start = start
    this.duration = duration
  }

  clone() {
    return new SongNote(
      this.note, this.start, this.duration
    )
  }

  inRange(min, max) {
    let stop = this.start + this.duration

    if (min >= stop) { return false }
    if (max <= this.start) { return false }

    return true
  }

  transpose(semitones) {
    return new SongNote(
      noteName(parseNote(this.note) + semitones), this.start, this.duration
    )
  }

  getStart() {
    return this.start
  }

  getStop() {
    return this.start + this.duration
  }

  getRenderStop() {
    return this.start + this.duration
  }

  toString() {
    return `${this.note},${this.start},${this.duration}`
  }
}

