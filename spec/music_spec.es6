
describe("notes", function() {
  it("less than", function() {
    expect(notesLessThan("C5", "C#5")).toBe(true);
    expect(notesLessThan("B5", "D6")).toBe(true);
    expect(notesLessThan("B5", "B5")).toBe(false);
  });

  it("greater than", function() {
    expect(notesGreaterThan("G5", "C#5")).toBe(true);
    expect(notesGreaterThan("G5", "Fb5")).toBe(true);
    expect(notesGreaterThan("E#5", "F5")).toBe(false);
  });

  it("compare", function() {
    expect(compareNotes("E#5", "F5")).toBe(0);
  });

});

describe("scales", function() {
  it("gets notes in C MajorScale", function() {
    let scale = new MajorScale("C");
    expect(scale.getRange(5)).toEqual([
      "C5", "D5", "E5", "F5", "G5", "A5", "B5", "C6"
    ]);
  });

  it("gets notes in D MajorScale", function() {
    let scale = new MajorScale("D");
    expect(scale.getRange(5)).toEqual([
      "D5", "E5", "F#5", "G5", "A5", "B5", "C#6", "D6"
    ]);
  });

  it("gets notes in F MajorScale", function() {
    let scale = new MajorScale("F");
    // TODO: should be Bb5
    expect(scale.getRange(5)).toEqual([
      "F5", "G5", "A5", "A#5", "C6", "D6", "E6", "F6"
    ]);
  });

  it("gets notes in loose range for scale", function() {
    let scale = new MajorScale("G");
    let range = scale.getLooseRange("C5", "C6")
    expect(range).toEqual([
      "C5", "D5", "E5", "F#5", "G5", "A5", "B5", "C6"
    ]);
  });
})

describe("key signature", function() {
  let trebleCleff = ["A4", "C7"]
  let bassCleff = ["C3", "E5"]

  it("gets key signature notes for C", function() {
    let key = new KeySignature(0)

    expect(key.isFlat()).toBe(false)
    expect(key.isSharp()).toBe(false)

    expect(key.accidentalNotes()).toEqual([])

    expect(key.notesInRange(...trebleCleff)).toEqual([])
  })

  it("gets key signature notes for D", function() {
    let key = new KeySignature(2)

    expect(key.isFlat()).toBe(false)
    expect(key.isSharp()).toBe(true)

    expect(key.accidentalNotes()).toEqual(["F", "C"])

    expect(key.notesInRange(...trebleCleff)).toEqual(["F5", "C6"])
    expect(key.notesInRange(...trebleCleff)).toEqual(["F5", "C6"])
  })

  it("gets key signature notes for Bb", function() {
    let key = new KeySignature(-2)
    expect(key.isFlat()).toBe(true)
    expect(key.isSharp()).toBe(false)

    expect(key.accidentalNotes()).toEqual(["B", "E"])

    expect(key.notesInRange(...trebleCleff)).toEqual(["B5", "E5"])
    expect(key.notesInRange(...trebleCleff)).toEqual(["B5", "E5"])
  })

  it("gets key signature notes for E", function() {
    let key = new KeySignature(4)
    expect(key.isFlat()).toBe(false)
    expect(key.isSharp()).toBe(true)

    expect(key.accidentalNotes()).toEqual(["F", "C", "G", "D"])

    expect(key.notesInRange(...trebleCleff)).toEqual(["F5", "C6", "G6", "D6"])
    expect(key.notesInRange(...trebleCleff)).toEqual(["F5", "C6", "G6", "D6"])
  })

  it("gets accidentals for note in key signature", function() {
    let key = new KeySignature(2)
    key.accidentalsForNote("C5")
  })

})
