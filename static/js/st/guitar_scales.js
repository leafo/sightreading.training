import {
  Scale, MajorScale, MinorScale, HarmonicMinorScale,
  MajorBluesScale, MinorBluesScale, parseNote,
} from "st/music"

class MajorPentatonic extends Scale {
  steps = [2, 2, 3, 2, 3]
}

class MinorPentatonic extends Scale {
  minor = true
  steps = [3, 2, 2, 3, 2]
}

export const SCALE_TYPES = {
  "Major": MajorScale,
  "Natural minor": MinorScale,
  "Harmonic minor": HarmonicMinorScale,
  "Major pentatonic": MajorPentatonic,
  "Minor pentatonic": MinorPentatonic,
  "Major blues": MajorBluesScale,
  "Minor blues": MinorBluesScale,
}

// Rotate the parent step pattern to expose every mode.
function patternedScale(steps) {
  return class extends Scale {
    constructor(root) { super(root); this.steps = steps }
  }
}
function addModes(steps, names) {
  names.forEach((name, index) => {
    SCALE_TYPES[name] = patternedScale([...steps.slice(index), ...steps.slice(0, index)])
  })
}
addModes([2, 2, 1, 2, 2, 2, 1], [
  "Ionian (major)", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Aeolian (natural minor)", "Locrian",
])
addModes([2, 1, 2, 2, 2, 2, 1], [
  "Melodic minor", "Dorian b2", "Lydian augmented", "Lydian dominant", "Mixolydian b6", "Locrian #2", "Altered (super Locrian)",
])
addModes([2, 1, 2, 2, 1, 3, 1], [
  "Harmonic minor", "Locrian #6", "Ionian #5", "Dorian #4", "Phrygian dominant", "Lydian #2", "Ultralocrian",
])
Object.entries({
  "Whole tone": [2, 2, 2, 2, 2, 2],
  "Diminished (whole-half)": [2, 1, 2, 1, 2, 1, 2, 1],
  "Diminished (half-whole)": [1, 2, 1, 2, 1, 2, 1, 2],
  "Chromatic": Array(12).fill(1),
  "Double harmonic major": [1, 3, 1, 2, 1, 3, 1],
  "Hungarian minor": [2, 1, 3, 1, 1, 3, 1],
  "Neapolitan minor": [1, 2, 2, 2, 1, 3, 1],
  "Neapolitan major": [1, 2, 2, 2, 2, 2, 1],
  "Persian": [1, 3, 1, 1, 2, 3, 1],
  "Enigmatic": [1, 3, 2, 2, 2, 1, 1],
  "Hirajoshi": [2, 1, 4, 1, 4],
  "In sen": [1, 4, 2, 3, 2],
  "Iwato": [1, 4, 1, 4, 2],
  "Egyptian pentatonic": [2, 3, 2, 3, 2],
  "Bebop dominant": [2, 2, 1, 2, 2, 1, 1, 1],
  "Bebop major": [2, 2, 1, 2, 1, 1, 2, 1],
}).forEach(([name, steps]) => { SCALE_TYPES[name] = patternedScale(steps) })

export const ROOTS = ["C", "C#", "Db", "D", "Eb", "E", "F", "F#", "Gb", "G", "Ab", "A", "Bb", "B"]

// Display the highest string first, as in guitar tablature. The pitch
// utilities number middle C as C5, one above scientific pitch notation.
export const STANDARD_TUNING = ["E5", "B4", "G4", "D4", "A3", "E3"]

export function guitarScale(root, type, lastFret) {
  const scale = new SCALE_TYPES[type](root)
  const notes = Array.from(scale.getRange(4, scale.steps.length), (note, index) => ({
    name: index === 0 ? root : note.replace(/\d+$/, ""),
    degree: index + 1,
    pitchClass: parseNote(note) % 12,
  }))
  const rootPitch = notes[0].pitchClass
  const intervals = ["1", "♭2", "2", "♭3", "3", "4", "♭5", "5", "♭6", "6", "♭7", "7"]
  notes.forEach((note, index) => {
    const semitones = (note.pitchClass - rootPitch + 12) % 12
    if (notes.length === 7) {
      const alteration = semitones - [0, 2, 4, 5, 7, 9, 11][index]
      note.interval = (alteration < 0 ? "♭" : "♯").repeat(Math.abs(alteration)) + (index + 1)
    } else note.interval = intervals[semitones]
  })
  const byPitch = new Map(notes.map(note => [note.pitchClass, note]))
  const frets = Array.from({length: lastFret + 1}, (_, fret) => fret)
  const strings = STANDARD_TUNING.map((open, index) => ({
    number: index + 1,
    name: open[0],
    cells: frets.map(fret => byPitch.get((parseNote(open) + fret) % 12)),
  }))
  return {notes, frets, strings}
}
