
import {Chord} from "st/music"

export default class AutoChords {
  // attempt to parse chord from macro name
  static coerceChord(macro) {
    let m = macro.match(/([a-gA-G][#b]?)(.*)/)
    if (!m) { return }
    let [, root, shape] =  m

    root = root.substr(0,1).toUpperCase() + root.substr(1)

    if (shape == "") {
      shape = "M"
    }

    if (!Chord.SHAPES[shape]) {
      return
    }

    return [root, shape]
  }

  constructor(song) {
    this.song = song
  }

  findChordBlocks() {
    let beatsPerMeasure = this.song.metadata.beatsPerMeasure

    if (!beatsPerMeasure) {
      throw "Missing beats per measure for autochords"
    }

    if (!this.song.autoChords) {
      throw "Song missing autochords"
    }

    let chords = [...this.song.autoChords]
    chords.reverse()
    let chordBlocks = []

    let chordsUntil = null

    for (let [position, chord] of chords) {
      let start = position
      let stop = (Math.floor((position / beatsPerMeasure)) + 1) * beatsPerMeasure

      if (chordsUntil) {
        stop = Math.min(stop, chordsUntil)
      }

      if (start >= stop) {
        console.warn("rejecting chord", chord, start, stop)
        continue
      }

      chordBlocks.push({
        start, stop, chord
      })
      chordsUntil = start
    }

    chordBlocks.reverse()
    return chordBlocks
  }

  addChords() {
    this.findChordBlocks()
  }

  notesInRange(left, right) {
    return this.map(note => note.inRange(left, right))
  }
}
