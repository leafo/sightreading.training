import "jasmine_boot"

import SongParser from "st/song_parser"

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

})

