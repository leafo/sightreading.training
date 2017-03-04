import "jasmine_boot"

import SongParser from "st/song_parser"
import {SongNoteList, SongNote} from "st/song_note_list"

describe("song parser", function() {
  it("parses single note song", function() {
    expect(new SongParser().parse("a5")).toEqual([
      ["note", "A5"]
    ])
  })

  it("parses single note song with some whitespace", function() {
    expect(new SongParser().parse(`
      a5
    `)).toEqual([
      ["note", "A5"]
    ])
  })

  it("parses notes with timing information", function() {
    expect(new SongParser().parse(`
      g4 a5.1 b2 f3.1.2
    `)).toEqual([
      ["note", "G4"],
      ["note", "A5", { duration: 1 }],
      ["note", "B2"],
      ["note", "F3", { duration: 1, start: 2 }]
    ])
  })

  it("parses rests and notes", function() {
    expect(new SongParser().parse("g4.1 r2 a4.3 r b2")).toEqual([
      ["note", "G4", {duration: 1}],
      ["rest", {duration: 2}],
      ["note", "A4", {duration: 3}],
      ["rest"],
      ["note", "B2"],
    ])
  })

  it("parses key signature", function() {
    expect(new SongParser().parse("ks-4 g5 ks2 d6")).toEqual([
      ["keySignature", -4],
      ["note", "G5"],
      ["keySignature", 2],
      ["note", "D6"],
    ])
  })

  it("parses time adjustments", function() {
    expect(new SongParser().parse("ht ht dt dt m1 m2 ht")).toEqual([
      ["halfTime"],
      ["halfTime"],
      ["doubleTime"],
      ["doubleTime"],
      ["measure", 1],
      ["measure", 2],
      ["halfTime"],
    ])
  })

  it("parses accidental", function() {
    expect(new SongParser().parse(`
      a+5
      a-5
      a=5
    `)).toEqual([
      ["note", "A5", {sharp: true}],
      ["note", "A5", {flat: true}],
      ["note", "A5", {natural: true}],
    ])
  })

  it("parses a block", function() {
    expect(new SongParser().parse(`
      m1 {
        a5
      }
    `)).toEqual([
      ["measure", 1],
      ["block", [
        ["note", "A5"]
      ]],
    ])
  })

  it("ignores a comment", function() {
    expect(new SongParser().parse(`
      # this is comment
      a5 c5 # a good one

      #more comment

      b6 #a5
    `)).toEqual([
      ["note", "A5"],
      ["note", "C5"],
      ["note", "B6"],
    ])
  })

  it("parses time signature", function() {
    expect(new SongParser().parse(`
      ts4/4
      ts3/4
      ts6/8
    `)).toEqual([
      ["timeSignature", 4, 4],
      ["timeSignature", 3, 4],
      ["timeSignature", 6, 8],
    ])
  })


  it("parses macro", function() {
    expect(new SongParser().parse(`
      $hello $w $cm7
    `)).toEqual([
      ["macro", "hello"],
      ["macro", "w"],
      ["macro", "cm7"],
    ])

  })
})

describe("load song", function() {
  it("loads empty song", function() {
    let song = SongParser.load("ks0")
    expect([...song]).toEqual([])
  })

  it("loads some notes", function() {
    let song = SongParser.load(`
      ks1
      b6 a6 g6 a6
      b6 b6 b6.2
      a6 a6 a6.2
    `)

    expect([...song]).toEqual([
      new SongNote("B6", 0, 1),
      new SongNote("A6", 1, 1),
      new SongNote("G6", 2, 1),
      new SongNote("A6", 3, 1),

      new SongNote("B6", 4, 1),
      new SongNote("B6", 5, 1),
      new SongNote("B6", 6, 2),

      new SongNote("A6", 8, 1),
      new SongNote("A6", 9, 1),
      new SongNote("A6", 10, 2),
    ])
  })

  it("loads some notes with rests", function() {
    let song = SongParser.load(`
      r1 g5 r2 a5 r3 r1.1 f6
    `)

    expect([...song]).toEqual([
      new SongNote("G5", 1, 1),
      new SongNote("A5", 4, 1),
      new SongNote("F6", 8, 1),
    ])
  })

  it("loads notes with timing", function() {
    let song = SongParser.load(`
      dt
      m0 c5 c5 c5
      m0 g5 a5 g5
      ht
      m1 c6
    `)

    expect([...song]).toEqual([
      // first measure
      new SongNote("C5", 0, 0.5),
      new SongNote("C5", 0.5, 0.5),
      new SongNote("C5", 1.0, 0.5),

      new SongNote("G5", 0, 0.5),
      new SongNote("A5", 0.5, 0.5),
      new SongNote("G5", 1.0, 0.5),

      // second measure
      new SongNote("C6", 4, 1),
    ])
  })

  it("sets position and time correctly when using half and double time", function() {
    let song = SongParser.load(`
      ht
      a5.2
      dt
      b5.2
      dt
      c5.2
      c5
      dt
      g5

      m2
      a5
    `)

    expect([...song]).toEqual([
      new SongNote("A5", 0, 4),
      new SongNote("B5", 4, 2),
      new SongNote("C5", 6, 1),
      new SongNote("C5", 7, 0.5),
      new SongNote("G5", 7.5, 0.25),
      new SongNote("A5", 8, 0.25),
    ])
  })

  it("parses keysignature into metadta", function() {
    let song = SongParser.load(`
      ks-5
      c5
    `)

    expect(song.metadata).toEqual({
      keySignature: -5
    })
  })

  it("applies key signature to notes", function() {
    let song = SongParser.load(`
      ks2
      c5
      d5
      e5
      f5
      g5
      a5
      b5
    `)

    expect([...song]).toEqual([
      new SongNote("C#5", 0, 1),
      new SongNote("D5", 1, 1),
      new SongNote("E5", 2, 1),
      new SongNote("F#5", 3, 1),
      new SongNote("G5", 4, 1),
      new SongNote("A5", 5, 1),
      new SongNote("B5", 6, 1),
    ])


    let song2 = SongParser.load(`
      ks-2
      c5
      d5
      e5
      f5
      g5
      a5
      b5
    `)

    expect([...song2]).toEqual([
      new SongNote("C5", 0, 1),
      new SongNote("D5", 1, 1),
      new SongNote("Eb5", 2, 1),
      new SongNote("F5", 3, 1),
      new SongNote("G5", 4, 1),
      new SongNote("A5", 5, 1),
      new SongNote("Bb5", 6, 1),
    ])


  })


  it("sets position when using blocks", function() {
    let song = SongParser.load(`
      {
        dt
        a5
        a5.2
      }
      g6
    `)

    expect([...song]).toEqual([
      new SongNote("A5", 0, 0.5),
      new SongNote("A5", 0.5, 1),
      new SongNote("G6", 1.5, 1),
    ])
  })

  it("renders a chord with restore position", function() {
    let song = SongParser.load(`
      c5 | e5 | g5
      a6
    `)

    expect([...song]).toEqual([
      new SongNote("C5", 0, 1),
      new SongNote("E5", 0, 1),
      new SongNote("G5", 0, 1),
      new SongNote("A6", 1, 1),
    ])
  })

  it("loads song with 3/4 time", function() {
    let song = SongParser.load(`
      ts3/4
      m0 {
        c5
        d5.2
        |
        g4.3
      }

      m1 {
        e5
        d5
        c5
      }
    `)

    expect([...song]).toEqual([
      new SongNote("C5", 0, 1),
      new SongNote("D5", 1, 2),
      new SongNote("G4", 0, 3),

      new SongNote("E5", 3, 1),
      new SongNote("D5", 4, 1),
      new SongNote("C5", 5, 1),
    ])
  })

  it("loads song with 6/8 time", function() {
    let song = SongParser.load(`
      ts6/8
      m0 {
        c5
        d5.2
        |
        g4.3
      }

      m1 {
        c6
      }
    `)

    expect([...song]).toEqual([
      new SongNote("C5", 0, 0.5),
      new SongNote("D5", 0.5, 1),
      new SongNote("G4", 0, 1.5),

      new SongNote("C6", 3, 0.5),
    ])
  })

})

