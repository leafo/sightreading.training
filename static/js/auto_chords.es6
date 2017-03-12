
import {Chord, parseNote, noteName, MIDDLE_C_PITCH} from "st/music"
import {SongNote} from "st/song_note_list"

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
    let blocks = this.findChordBlocks()
    let notesToAdd = [] // the final set of notes added

    for (let block of blocks) {
      let [root, shape] = block.chord
      let notes = this.song.notesInRange(block.start, block.stop)

      let pitches = [
        MIDDLE_C_PITCH,
        ...notes.map(n => parseNote(n.note))
      ]

      let minPitch = Math.min(...pitches)
      let rootPitch = parseNote(root + "0")

      // find the closest root beneath the notes in range
      let chordRootPitch = Math.floor(((minPitch - 1) - rootPitch) / 12) * 12 + rootPitch
      let chordRoot = noteName(chordRootPitch)

      let chordNotes = Chord.notes(chordRoot, shape)

      for (let note of chordNotes) {
        notesToAdd.push(new SongNote(
          note, block.start, block.stop - block.start
        ))
      }

      // notesToAdd.push(new SongNote(
      //   chordRoot, block.start, block.stop - block.start
      // ))
    }

    // just mutate the song for now
    for (let note of notesToAdd) {
      this.song.push(note)
    }
  }



}
