import "jasmine_boot"

import SongParser from "st/song_parser"

describe("song parser", function() {
  it("parses single note song", function() {
    let parser = new SongParser
    expect(parser.parse("a5")).toEqual([
      ["note", "A5"]
    ])
  })

  it("parses single note song with some whitespace", function() {
    let parser = new SongParser
    expect(parser.parse(`
      a5
    `)).toEqual([
      ["note", "A5"]
    ])
  })

})

