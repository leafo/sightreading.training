
let music = require("../src/music.js");
music

describe("music", function() {
  it("less than", function() {
    expect(music.notesLessThan("C5", "C#5")).toBe(true);
    expect(music.notesLessThan("B5", "D6")).toBe(true);
    expect(music.notesLessThan("B5", "B5")).toBe(false);
  });

  it("greater than", function() {
    expect(music.notesGreaterThan("G5", "C#5")).toBe(true);
    expect(music.notesGreaterThan("G5", "Fb5")).toBe(true);
    expect(music.notesGreaterThan("E#5", "F5")).toBe(false);
  });

  it("compare", function() {
    expect(music.compareNotes("E#5", "F5")).toBe(0);
  });

  it("gets music in C MajorScale", function() {
    let scale = new music.MajorScale("C");
    expect(scale.getRange(5, 8)).toEqual([
      "C5", "D5", "E5", "F5", "G5", "A5", "B5", "C6"
    ]);
  });

  it("gets notes in D MajorScale", function() {
    let scale = new music.MajorScale("D");
    expect(scale.getRange(5, 8)).toEqual([
      "D5", "E5", "F#5", "G5", "A5", "B5", "C#6", "D6"
    ]);
  });

  it("gets notes in F MajorScale", function() {
    let scale = new music.MajorScale("F");
    // TODO: should be Bb5
    expect(scale.getRange(5, 8)).toEqual([
      "F5", "G5", "A5", "A#5", "C6", "D6", "E6", "F6"
    ]);
  });


  it("filters notes by range", function() {
    let scale = new music.MajorScale("G");
    let range = music.filterNotesByRange(scale.getFullRange(), "C5", "C6");
    expect(range).toEqual([
      "C5", "D5", "E5", "F#5", "G5", "A5", "B5", "C6"
    ]);
  });


});
