export const NATURAL_NOTES = ["C", "D", "E", "F", "G", "A", "B"]
export const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
export const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
export const CHROMATIC_NAMES = ["C", "C#/Db", "D", "D#/Eb", "E", "F", "F#/Gb", "G", "G#/Ab", "A", "A#/Bb", "B"]
export const ACCIDENTAL_PITCHES = [1, 3, 6, 8, 10]

export const ROOT_LABELS = {
  "C#": "C#/Db",
  "D#": "D#/Eb",
  "F#": "F#/Gb",
  "G#": "G#/Ab",
  "A#": "A#/Bb",
}

// Unqualified intervals are major (2, 3, 6, 7) or perfect (4, 5).
export const STANDARD_INTERVALS = [
  {label: "2", halfSteps: 2},
  {label: "3", halfSteps: 4},
  {label: "4", halfSteps: 5},
  {label: "5", halfSteps: 7},
  {label: "6", halfSteps: 9},
  {label: "7", halfSteps: 11},
]

export const ACCIDENTAL_INTERVALS = [
  {label: "min 2", halfSteps: 1},
  {label: "aug 2", halfSteps: 3},
  {label: "min 3", halfSteps: 3},
  {label: "dim 5", halfSteps: 6},
  {label: "aug 5", halfSteps: 8},
  {label: "min 6", halfSteps: 8},
  {label: "dim 7", halfSteps: 9},
  {label: "bb7", halfSteps: 9},
  {label: "min 7", halfSteps: 10},
  {label: "#9", halfSteps: 3},
]

export const CSV_INTERVALS = [
  {label: "min 2", halfSteps: 1},
  {label: "2", halfSteps: 2},
  {label: "aug 2", halfSteps: 3},
  {label: "#9", halfSteps: 3},
  {label: "min 3", halfSteps: 3},
  {label: "3", halfSteps: 4},
  {label: "4", halfSteps: 5},
  {label: "dim 5", halfSteps: 6},
  {label: "5", halfSteps: 7},
  {label: "aug 5", halfSteps: 8},
  {label: "min 5", halfSteps: 6},
  {label: "6", halfSteps: 9},
  {label: "bb7", halfSteps: 9},
  {label: "dim 7", halfSteps: 9},
  {label: "min 7", halfSteps: 10},
  {label: "7", halfSteps: 11},
]

export function pitchClass(note) {
  let name = note.split("/")[0]
  let pitch = SHARP_NAMES.indexOf(name)
  if (pitch >= 0) return pitch

  pitch = FLAT_NAMES.indexOf(name)
  if (pitch >= 0) return pitch

  throw new Error(`Invalid note name: ${note}`)
}

export function intervalAnswerPitch(root, halfSteps) {
  return (pitchClass(root) + halfSteps) % 12
}

export function enabledRootPreset(notes) {
  return Object.fromEntries(notes.map(note => [note, true]))
}

export function noteMathCsv() {
  let rows = [["Root", ...CSV_INTERVALS.map(interval => interval.label)]]
  for (let rootPitch = 0; rootPitch < CHROMATIC_NAMES.length; rootPitch++) {
    rows.push([
      CHROMATIC_NAMES[rootPitch],
      ...CSV_INTERVALS.map(interval =>
        CHROMATIC_NAMES[(rootPitch + interval.halfSteps) % 12]
      ),
    ])
  }
  return rows.map(row => row.join(",")).join("\n")
}
