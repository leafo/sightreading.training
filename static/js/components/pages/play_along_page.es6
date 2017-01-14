// like note list but notes in time
class SongNoteList extends Array {
  constructor(bpm=100) {
    super()
    this.bpm = bpm
    Object.setPrototypeOf(this, SongNoteList.prototype)
  }

  static newSong(noteTuples, bpm=100) {
    let notes = noteTuples.map(([note, start, duration]) =>
      new SongNote(note, start, duration))

    let song = new SongNoteList(bpm)
    for (let note of notes) {
      song.push(note)
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
}

// note: C4, D#5, etc...
// start: when note begings in beats
// duration: how long note is in beats
class SongNote {
  constructor(note, start, duration) {
    this.note = note
    this.start = start
    this.duration = duration
  }

  inRange(min, max) {
    let stop = this.start + this.duration

    if (min > stop) { return false }
    if (max < this.start) { return false }

    return true
  }

  getStart() {
    return this.start
  }

  getStop() {
    return this.start + this.duration
  }

  toString() {
    return `${this.note},${this.start},${this.duration}`
  }
}

export default class PlayAlongPage extends React.Component {
  render() {
    return <div>Hello world</div>
  }
}
