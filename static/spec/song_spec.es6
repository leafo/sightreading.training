describe("song", function() {
  it("creates an empty song notes", function() {
    let song = new SongNotes()
    expect(song.getStopInBeats()).toEqual(0)
  })

  it("gets duration from song with notes", function() {
    let song = new SongNotes()
    song.push(new SongNote("C5", 2, 1))
    song.push(new SongNote("D5", 0, 1))

    expect(song.getStartInBeats()).toEqual(0)
    expect(song.getStopInBeats()).toEqual(3)
  })
})
