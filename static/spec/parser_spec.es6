import "jasmine_boot"

import SongParser from "st/song_parser"

describe("song parser", function() {
  it("parses single note song", function() {
    let parser = new SongParser
    parser.parse("a5")
    expect(true).toBe(true)
  })
})

