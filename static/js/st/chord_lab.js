import {Chord, noteName, OCTAVE_SIZE, parseNote} from "st/music"
import {matchesChordTones} from "st/chord_rules"
import {STANDARD_TUNING} from "st/guitar_scales"

const GUITAR_STRINGS = [...STANDARD_TUNING].reverse()
export const CHORD_ROOTS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
const CHORD_SUFFIXES = {M: "", M6: "6"}
export const CHORD_SHAPES = {
  ...Chord.SHAPES,
  sus2: [2, 5],
  sus4: [5, 2],
  add9: [4, 3, 7],
  madd9: [3, 4, 7],
  "9": [4, 3, 3, 4],
  m9: [3, 4, 3, 4],
  M9: [4, 3, 4, 3],
}

function pitchClass(pitch) {
  return pitch % OCTAVE_SIZE
}

const CHORDS = CHORD_ROOTS.flatMap((root, rootPitch) =>
  Object.entries(CHORD_SHAPES).map(([shape, steps]) => {
    let pitch = rootPitch
    const classes = [rootPitch, ...steps.map(step => {
      pitch += step
      return pitchClass(pitch)
    })]
    return {name: root + (CHORD_SUFFIXES[shape] ?? shape), rootPitch, classes}
  }))

export function guitarVoicing(frets) {
  return GUITAR_STRINGS.flatMap((open, index) =>
    frets[index] === null ? [] : [parseNote(open) + frets[index]])
}

export function chordNote(pitch) {
  return noteName(pitch, CHORD_ROOTS[pitchClass(pitch)].includes("#"))
    .replace(/\d+$/, "").replaceAll("#", "♯").replaceAll("b", "♭")
}

export function identifyChordMatches(pitches) {
  const classes = new Set(pitches.map(pitchClass))
  const bass = pitchClass(Math.min(...pitches))
  return CHORDS.flatMap(chord => {
    const match = matchesChordTones(classes, chord.classes, chord.rootPitch)
    return match ? [{...chord, ...match}] : []
  }).sort((a, b) => Number(a.omittedFifth) - Number(b.omittedFifth) || Number(b.rootPitch === bass) - Number(a.rootPitch === bass))
    .map(({name, rootPitch, omittedFifth}) => {
      const symbol = name.replaceAll("#", "♯").replaceAll("b", "♭")
      return {name: rootPitch === bass ? symbol : `${symbol}/${chordNote(bass)}`, omittedFifth}
    })
}
export function identifyChords(pitches) {
  return identifyChordMatches(pitches).map(match => match.name)
}

export function suggestChords(pitches, limit = 5) {
  const actual = new Set(pitches.map(pitchClass))
  if (actual.size < 2 || identifyChords(pitches).length) return []
  const bass = pitchClass(Math.min(...pitches))
  return CHORDS.map(chord => {
    const missing = chord.classes.filter(note => !actual.has(note))
    const extra = [...actual].filter(note => !chord.classes.includes(note))
    return {...chord, missing, extra, distance: missing.length + extra.length,
      overlap: chord.classes.length - missing.length}
  }).filter(chord => chord.distance > 0 && chord.distance <= 2 && chord.overlap >= 2)
    .sort((a, b) => a.distance - b.distance || b.overlap - a.overlap || Number(b.rootPitch === bass) - Number(a.rootPitch === bass))
    .slice(0, limit).map(chord => ({name: chord.name.replaceAll("#", "♯").replaceAll("b", "♭"),
      missing: chord.missing.map(chordNote), extra: chord.extra.map(chordNote)}))
}
