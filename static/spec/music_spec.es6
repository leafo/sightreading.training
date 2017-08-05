import "jasmine_boot"

import {
  notesLessThan, notesGreaterThan, compareNotes, noteName, parseNote,
  noteStaffOffset,
  MajorScale, MinorScale, Chord, KeySignature, ChromaticScale
} from "st/music"

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

  it("gets note names", function() {
    let pitches = [24,25,26,27,28,29,30,31,32,33,34,35,36]

    // sharpened
    expect(pitches.map((p) => noteName(p))).toEqual([
      "C2", "C#2", "D2", "D#2", "E2", "F2", "F#2", "G2", "G#2", "A2", "A#2", "B2", "C3"
    ])

    // flattened
    expect(pitches.map((p) => noteName(p, false))).toEqual([
      "C2", "Db2", "D2", "Eb2", "E2", "F2", "Gb2", "G2", "Ab2", "A2", "Bb2", "B2", "C3"
    ])

  })

  it("gets notes pitches", function() {
    let sharpNames = [
      "C2", "C#2", "D2", "D#2", "E2", "F2", "F#2", "G2", "G#2", "A2", "A#2", "B2", "C3"
    ]

    let flatNames = [
      "C2", "Db2", "D2", "Eb2", "E2", "F2", "Gb2", "G2", "Ab2", "A2", "Bb2", "B2", "C3"
    ]

    expect(sharpNames.map((n) => parseNote(n))).toEqual([
      24,25,26,27,28,29,30,31,32,33,34,35,36
    ])

    expect(flatNames.map((n) => parseNote(n))).toEqual([
      24,25,26,27,28,29,30,31,32,33,34,35,36
    ])

  })
});

describe("scales", function() {
  it("gets notes in chromatic scale", function() {
    let scale = new ChromaticScale("C")
    expect(scale.getRange(5)).toEqual([
      "C5", "C#5", "D5", "D#5", "E5", "F5", "F#5", "G5", "G#5", "A5", "A#5", "B5", "C6"
    ]);
  })

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

  it("gets scale degrees for C major", function() {
    let scale = new MajorScale("C")
    let range = scale.getLooseRange("C5", "C6")

    expect(range.map(scale.getDegree.bind(scale))).toEqual([
      1, 2, 3, 4, 5, 6, 7, 1
    ])
  })

  it("gets scale degrees for G major", function() {
    let scale = new MajorScale("G")
    let range = scale.getLooseRange("C5", "C6")

    expect(range.map(scale.getDegree.bind(scale))).toEqual([
      4, 5, 6, 7, 1, 2, 3, 4
    ])
  })

  it("converts degree to note name", function() {
    let scale = new MajorScale("G")
    expect(scale.degreeToName(1)).toEqual("G")
    expect(scale.degreeToName(2)).toEqual("A")
    expect(scale.degreeToName(3)).toEqual("B")
    expect(scale.degreeToName(4)).toEqual("C")
    expect(scale.degreeToName(5)).toEqual("D")
    expect(scale.degreeToName(6)).toEqual("E")
    expect(scale.degreeToName(7)).toEqual("F#")
    expect(scale.degreeToName(8)).toEqual("G")
    expect(scale.degreeToName(9)).toEqual("A")
  })

  it("gets notes in A MinorScale", function() {
    let scale = new MinorScale("A");
    expect(scale.getRange(5)).toEqual([
      "A5", "B5", "C6", "D6", "E6", "F6", "G6", "A6"
    ]);
  });

  it("gets notes in C MinorScale", function() {
    let scale = new MinorScale("C");
    // TODO: this should be giving flats not sharps
    expect(scale.getRange(5)).toEqual([
      "C5", "D5", "D#5", "F5", "G5", "G#5", "A#5", "C6"
    ]);
  });

  describe("buildChordSteps", function() {
    it("builds triad steps for major scale", function() {
      let scale = new MajorScale("C")
      expect(scale.buildChordSteps(1, 2)).toEqual(Chord.SHAPES.M)
      expect(scale.buildChordSteps(2, 2)).toEqual(Chord.SHAPES.m)
      expect(scale.buildChordSteps(3, 2)).toEqual(Chord.SHAPES.m)
      expect(scale.buildChordSteps(4, 2)).toEqual(Chord.SHAPES.M)
      expect(scale.buildChordSteps(5, 2)).toEqual(Chord.SHAPES.M)
      expect(scale.buildChordSteps(6, 2)).toEqual(Chord.SHAPES.m)
    })

    it("builds seventh chord steps for major scale", function() {
      let scale = new MajorScale("C")
      expect(scale.buildChordSteps(1, 3)).toEqual(Chord.SHAPES.M7)
      expect(scale.buildChordSteps(2, 3)).toEqual(Chord.SHAPES.m7)
      expect(scale.buildChordSteps(3, 3)).toEqual(Chord.SHAPES.m7)
      expect(scale.buildChordSteps(4, 3)).toEqual(Chord.SHAPES.M7)
      expect(scale.buildChordSteps(5, 3)).toEqual(Chord.SHAPES["7"])
      expect(scale.buildChordSteps(6, 3)).toEqual(Chord.SHAPES.m7)
    })


    it("builds triads chord steps for minor scale", function() {
      let scale = new MinorScale("C")
      expect(scale.buildChordSteps(1, 2)).toEqual(Chord.SHAPES.m)
      expect(scale.buildChordSteps(3, 2)).toEqual(Chord.SHAPES.M)
      expect(scale.buildChordSteps(4, 2)).toEqual(Chord.SHAPES.m)
      expect(scale.buildChordSteps(5, 2)).toEqual(Chord.SHAPES.m)
      expect(scale.buildChordSteps(6, 2)).toEqual(Chord.SHAPES.M)
      expect(scale.buildChordSteps(7, 2)).toEqual(Chord.SHAPES.M)
    })
  })

  describe("allChords", function() {
    it("gets all triads in scale", function() {
      let scale = new MajorScale("C")
      let chords = scale.allChords(3)

      expect(chords.map(chord => chord.toString())).toEqual([
        "C",
        "Dm",
        "Em",
        "F",
        "G",
        "Am",
        "Bdim",
      ])
    })

    it("gets all 7 chords in scale", function() {
      let scale = new MajorScale("C")
      let chords = scale.allChords(4)

      expect(chords.map(chord => chord.toString())).toEqual([
        "CM7",
        "Dm7",
        "Em7",
        "FM7",
        "G7",
        "Am7",
        "Bm7b5",
      ])
    })

  })
})

describe("chords", function() {
  it("gets notes for major chord", function() {
    expect(Chord.notes("C5", "M")).toEqual([
      "C5", "E5", "G5"
    ])

    expect(Chord.notes("C5", "M", 1)).toEqual([
      "E5", "G5", "C6"
    ])

    expect(Chord.notes("C5", "M", -1)).toEqual([
      "G4", "C5", "E5"
    ])

    expect(Chord.notes("C5", "M", -2)).toEqual([
      "E4", "G4", "C5"
    ])

    expect(Chord.notes("C5", "M", -3)).toEqual([
      "C4", "E4", "G4"
    ])

  })

  it("gets notes for minor chord", function() {
    expect(Chord.notes("C5", "m")).toEqual([
      "C5", "D#5", "G5"
    ])

    expect(Chord.notes("C5", "m", 1)).toEqual([
      "D#5", "G5", "C6"
    ])
  })

  it("gets notes for major 7 chord", function() {
    expect(Chord.notes("C5", "M7")).toEqual([
      "C5", "E5", "G5", "B5"
    ])

    expect(Chord.notes("C5", "M7", 1)).toEqual([
      "E5", "G5", "B5", "C6"
    ])

    expect(Chord.notes("C5", "M7", -1)).toEqual([
      "B4", "C5", "E5", "G5"
    ])

    expect(Chord.notes("C5", "M7", -2)).toEqual([
      "G4", "B4", "C5", "E5"
    ])

    expect(Chord.notes("C5", "M7", -3)).toEqual([
      "E4", "G4", "B4", "C5"
    ])

  })

  it("gets notes for dominant 7 chord", function() {
    expect(Chord.notes("C5", "7")).toEqual([
      "C5", "E5", "G5", "A#5"
    ])

    expect(Chord.notes("C5", "7", 1)).toEqual([
      "E5", "G5", "A#5", "C6"
    ])
  })

  it("gets notes for minor 7 chord", function() {
    expect(Chord.notes("C5", "m7")).toEqual([
      "C5", "D#5", "G5", "A#5"
    ])
  })

  it("gets notes for minor 7 flat 5 chord", function() {
    expect(Chord.notes("C5", "m7b5")).toEqual([
      "C5", "D#5", "F#5", "A#5"
    ])
  })

  describe("chordShapeName", function() {
    it("gets the chord name of a M7 chord", function() {
      let chord = new Chord("C", "M7");
      expect(chord.chordShapeName()).toBe("M7")
    })

    it("gets the chord name of a M chord", function() {
      let chord = new Chord("D", "M");
      expect(chord.chordShapeName()).toBe("M")
    })

    it("gets the chord name of a m chord", function() {
      let chord = new Chord("E", "m");
      expect(chord.chordShapeName()).toBe("m")
    })

    it("gets the chord name of a 7 chord", function() {
      let chord = new Chord("F", "7");
      expect(chord.chordShapeName()).toBe("7")
    })

    it("gets the chord name of a m7 chord", function() {
      let chord = new Chord("G", "m7");
      expect(chord.chordShapeName()).toBe("m7")
    })

    it("gets the chord name of a m7b5 chord", function() {
      let chord = new Chord("A", "m7b5");
      expect(chord.chordShapeName()).toBe("m7b5")
    })

  })

  describe("containsNote", function() {
    it("checks notes in CM7", function () {
      let chord = new Chord("C", "M7");

      for (let octave of [4,5,6]) {
        expect(chord.containsNote(`C${octave}`)).toBe(true)
        expect(chord.containsNote(`E${octave}`)).toBe(true)
        expect(chord.containsNote(`G${octave}`)).toBe(true)
        expect(chord.containsNote(`B${octave}`)).toBe(true)

        expect(chord.containsNote(`D${octave}`)).toBe(false)
        expect(chord.containsNote(`F${octave}`)).toBe(false)
        expect(chord.containsNote(`A${octave}`)).toBe(false)
      }
    })

    it("checks notes in Cm", function () {
      let chord = new Chord("C", "m");

      for (let octave of [4,5,6]) {
        expect(chord.containsNote(`C${octave}`)).toBe(true)
        expect(chord.containsNote(`D#${octave}`)).toBe(true)
        expect(chord.containsNote(`Eb${octave}`)).toBe(true)
        expect(chord.containsNote(`G${octave}`)).toBe(true)

        expect(chord.containsNote(`B${octave}`)).toBe(false)
        expect(chord.containsNote(`D${octave}`)).toBe(false)
        expect(chord.containsNote(`F${octave}`)).toBe(false)
        expect(chord.containsNote(`A${octave}`)).toBe(false)
      }
    })

  })

  it("gets shared notes", function() {
    expect(
      new Chord("C", "M").countSharedNotes(new Chord("G", "M"))
    ).toEqual(1)

    expect(
      new Chord("C", "M").countSharedNotes(new Chord("E", "m"))
    ).toEqual(2)

    expect(
      new Chord("C", "M").countSharedNotes(new Chord("D", "m"))
    ).toEqual(0)

    expect(
      new Chord("C", "M").countSharedNotes(new Chord("C", [12, 4]))
    ).toEqual(2)
  })
})

describe("key signature", function() {
  let trebleCleff = ["A4", "C7"]
  let bassCleff = ["C3", "E5"]

  it("gets name for key signature", function() {

    expect(new KeySignature(0).name()).toBe("C")

    expect(new KeySignature(1).name()).toBe("G")
    expect(new KeySignature(2).name()).toBe("D")
    expect(new KeySignature(3).name()).toBe("A")
    expect(new KeySignature(4).name()).toBe("E")
    expect(new KeySignature(5).name()).toBe("B")

    expect(new KeySignature(-1).name()).toBe("F")
    expect(new KeySignature(-2).name()).toBe("Bb")
    expect(new KeySignature(-3).name()).toBe("Eb")
    expect(new KeySignature(-4).name()).toBe("Ab")
    expect(new KeySignature(-5).name()).toBe("Db")
    expect(new KeySignature(-6).name()).toBe("Gb")
  })

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

  it("gets accidentals for notes in D", function() {
    let key = new KeySignature(2) // f c
    let examples = [
      ["C5", 0],
      ["C#5", null],
      ["Cb5", -1],

      ["D5", null],
      ["D#5", 1],
      ["Db5", -1],

      ["E5", null],
      ["E#5", 1],
      ["Eb5", -1],

      ["F5", 0],
      ["F#5", null],
      ["Fb5", -1],

      ["G5", null],
      ["G#5", 1],
      ["Gb5", -1],

      ["A5", null],
      ["A#5", 1],
      ["Ab5", -1],

      ["B5", null],
      ["B#5", 1],
      ["Bb5", -1],
    ]

    for (let [note, accidentals] of examples) {
      expect(key.accidentalsForNote(note)).toBe(accidentals)
    }
  })

  it("gets accidentals for notes in Eb", function() {
    let key = new KeySignature(-3) // b e a

    let examples = [
      ["C5", null],
      ["C#5", 1],
      ["Cb5", -1],

      ["D5", null],
      ["D#5", 1],
      ["Db5", -1],

      ["E5", 0],
      ["E#5", 1],
      ["Eb5", null],

      ["F5", null],
      ["F#5", 1],
      ["Fb5", -1],

      ["G5", null],
      ["G#5", 1],
      ["Gb5", -1],

      ["A5", 0],
      ["A#5", 1],
      ["Ab5", null],

      ["B5", 0],
      ["B#5", 1],
      ["Bb5", null],
    ]

    for (let [note, accidentals] of examples) {
      expect(key.accidentalsForNote(note)).toBe(accidentals)
    }
  })

  it("gets enharmonic spelling of notes for key", function() {
    let key = new KeySignature(-3) // b e a
    let notes = new MajorScale(key.name()).getRange(4).map((n) => key.enharmonic(n))

    expect(notes).toEqual([
      "Eb4", "F4", "G4", "Ab4", "Bb4", "C5", "D5", "Eb5"
    ])
  })
})


describe("noteStaffOffset", function() {
  it("gets offsets for notes", function() {
    let notes = [
      "A#3",
      "B#3",
      "C#4",

      "Ab3",
      "Bb3",
      "Cb4",

      "A3",
      "B3",
      "C4",
    ]

    expect(notes.map(noteStaffOffset)).toEqual([
      26,27,28,
      26,27,28,
      26,27,28,
    ])
  })
})

