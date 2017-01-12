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
      ["D5", 5, 1]
    ])

    let range = song.notesInRange(3,5)
    expect(range).toEqual([
      new SongNote("E5", 3, 1),
      new SongNote("D5", 5, 1),
    ])
  })
})
