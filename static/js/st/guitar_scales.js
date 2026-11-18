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

export const ROOTS = ["C", "C#", "Db", "D", "Eb", "E", "F", "F#", "Gb", "G", "Ab", "A", "Bb", "B"]

// Display the highest string first, as in guitar tablature. The pitch
// utilities number middle C as C5, one above scientific pitch notation.
const STANDARD_TUNING = ["E5", "B4", "G4", "D4", "A3", "E3"]

export function guitarScale(root, type, lastFret) {
  const scale = new SCALE_TYPES[type](root)
  const notes = Array.from(scale.getRange(4, scale.steps.length), (note, index) => ({
    name: index === 0 ? root : note.replace(/\d+$/, ""),
    degree: index + 1,
    pitchClass: parseNote(note) % 12,
  }))
  const byPitch = new Map(notes.map(note => [note.pitchClass, note]))
  const frets = Array.from({length: lastFret + 1}, (_, fret) => fret)
  const strings = STANDARD_TUNING.map((open, index) => ({
    number: index + 1,
    name: open[0],
    cells: frets.map(fret => byPitch.get((parseNote(open) + fret) % 12)),
  }))
  return {notes, frets, strings}
}
