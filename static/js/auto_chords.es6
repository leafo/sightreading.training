export default class AutoChords {
  constructor(song) {
    this.song = song
  }

  notesInRange(left, right) {
    let notes = []
    return this.map(note => note.inRange(left, right))
  }
}
