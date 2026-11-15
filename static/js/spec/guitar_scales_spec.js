import {guitarScale, ROOTS, SCALE_TYPES} from "st/guitar_scales"

describe("Guitar scales", () => {
  it("shows A minor pentatonic in fifth position on all six strings", () => {
    const {notes, strings, frets} = guitarScale("A", "Minor pentatonic", 12)
    expect(notes.map(note => note.name)).toEqual(["A", "C", "D", "E", "G"])
    expect(frets.slice(5, 11)).toEqual([5, 6, 7, 8, 9, 10])
    expect(strings.map(string => string.cells[5]?.name)).toEqual(["A", "E", "C", "G", "D", "A"])
    expect(strings[0].cells[6]).toBeUndefined()
  })

  it("preserves flat key spellings and identifies roots across octaves", () => {
    const {notes, strings} = guitarScale("Db", "Major", 12)
    expect(notes.map(note => note.name)).toEqual(["Db", "Eb", "F", "Gb", "Ab", "Bb", "C"])
    expect(strings[0].cells[9]).toEqual(notes[0])
    expect(guitarScale("Db", "Major", 24).strings[0].cells[21]).toEqual(notes[0])
  })

  it("includes the correct open strings for E minor blues", () => {
    const {notes, strings} = guitarScale("E", "Minor blues", 0)
    expect(notes.map(note => note.pitchClass)).toEqual([4, 7, 9, 10, 11, 2])
    expect(strings.map(string => string.cells[0]?.degree)).toEqual([1, 5, 2, 6, 3, 1])
  })

  it("includes every fret from the open strings through the selected limit", () => {
    for (const limit of [12, 18, 24]) {
      const {frets, strings} = guitarScale("E", "Major", limit)
      expect(frets).toEqual(Array.from({length: limit + 1}, (_, fret) => fret))
      expect(strings.every(string => string.cells.length === frets.length)).toBeTrue()
    }
  })

  it("has a unique pitch per degree in every supported scale and key", () => {
    for (const root of ROOTS) {
      for (const type of Object.keys(SCALE_TYPES)) {
        const {notes} = guitarScale(root, type, 0)
        expect(notes[0].name).toBe(root)
        expect(new Set(notes.map(note => note.pitchClass)).size).toBe(notes.length)
      }
    }
  })
})

describe("Expanded scale catalog", () => {
  it("uses ascending melodic minor and correctly labels altered mode degrees", () => {
    expect(guitarScale("C", "Melodic minor", 0).notes.map(n => n.pitchClass)).toEqual([0, 2, 3, 5, 7, 9, 11])
    expect(guitarScale("C", "Lydian dominant", 0).notes.map(n => n.interval)).toEqual(["1", "2", "3", "♯4", "5", "6", "♭7"])
    expect(guitarScale("C", "Lydian augmented", 0).notes.map(n => n.interval)).toContain("♯5")
  })
  it("closes every scale at exactly one octave", () => {
    for (const Type of Object.values(SCALE_TYPES)) {
      expect(new Type("C").steps.reduce((sum, step) => sum + step, 0)).toBe(12)
    }
    expect(guitarScale("C", "Chromatic", 0).notes.length).toBe(12)
    expect(guitarScale("C", "Diminished (half-whole)", 0).notes.length).toBe(8)
  })
})
