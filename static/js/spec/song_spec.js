import {SongNoteList, SongNote} from "st/song_note_list"
import {AutoChords} from "st/auto_chords"

let stripIds = notes =>
  notes.map(n => Object.assign({}, n, {id: undefined}))

let matchNotes = (have, expected) =>
  expect(stripIds(have)).toEqual(stripIds(expected))

describe("song", function() {
  it("creates an empty song notes", function() {
    let song = new SongNoteList()
    expect(song.getStopInBeats()).toEqual(0)
  })

  it("gets duration from song with notes", function() {
    let song = new SongNoteList()
    song.push(new SongNote("C5", 2, 1))
    song.push(new SongNote("D5", 0, 1))

    expect(song.getStartInBeats()).toEqual(0)
    expect(song.getStopInBeats()).toEqual(3)
  })

  it("gets notes in time range", function() {
    let song = SongNoteList.newSong([
      ["C5", 0, 1],
      ["D5", 1, 1],
      ["E5", 3, 1],
      ["D5", 5, 1],

      ["F5", 1, 5], // overlap (1 - 6)
      ["F5", 1, 3], // overlap start (1 - 4)
      ["F5", 4, 2], // overlap end (4 - 6)
    ])

    let range = song.notesInRange(3,5)
    matchNotes(range, [
      new SongNote("E5", 3, 1),
      new SongNote("F5", 1, 5),
      new SongNote("F5", 1, 3),
      new SongNote("F5", 4, 2),
    ])
  })
})

describe("autochords", function() {
  describe("coerceChord", function() {
    [
      [undefined, () => AutoChords.coerceChord("hello world")],
      [["G", "M"], () => AutoChords.coerceChord("g")],
      [["A", "M"], () => AutoChords.coerceChord("aM")],
      [["B", "m"], () => AutoChords.coerceChord("bm")],
      [["Fb", "M"], () => AutoChords.coerceChord("fbM")],
      [["G#", "m"], () => AutoChords.coerceChord("g#m")],
      [["Cb", "dimM7"], () => AutoChords.coerceChord("cbdimM7")],
    ].map(function([expected, fn]) {
      let name = (expected && expected.join) ? expected.join("") : "non-chord"
      it(`coerces chord ${name}`, function() {
        expect(fn()).toEqual(expected)
      })
    })
  })

  it("finds chord blocks for basic song", function() {
    let song = SongNoteList.newSong([
      ["C5", 0, 1],
      ["D5", 1, 1],
      ["E5", 3, 1],
      ["D5", 5, 1]
    ])

    song.metadata = {
      beatsPerMeasure: 2,
    }

    song.autoChords = [
      [0, "g"],
      [1, "d"],
      [2, "c"],
      [4, "d"]
    ]

    let chordBlocks = new AutoChords(song).findChordBlocks()
    expect(chordBlocks).toEqual([
      {chord: "g", start: 0, stop: 1},
      {chord: "d", start: 1, stop: 2},
      {chord: "c", start: 2, stop: 4},
      {chord: "d", start: 4, stop: 6},
    ])
  })
})
