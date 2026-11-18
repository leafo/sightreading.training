import {searchChords} from "st/chord_reference"
import {chordNote} from "st/chord_lab"
import {noteClass} from "st/guitar_chords"

export function chordTones(symbol, pitches = []) {
  const chord = symbol && searchChords(symbol.split("/")[0])[0]
  if (chord) return chord.notes.map((name, index) => ({name, pitchClass: noteClass(name),
    interval: chord.formula.split(" ")[index], degree: index === 0 ? 1 : null}))
  const root = pitches.length ? Math.min(...pitches) % 12 : 0
  const intervals = ["1", "♭2", "2", "♭3", "3", "4", "♭5", "5", "♭6", "6", "♭7", "7"]
  return [...new Set(pitches.map(pitch => pitch % 12))].map(pitch => ({name: chordNote(pitch), pitchClass: pitch,
    interval: intervals[(pitch - root + 12) % 12], degree: pitch === root ? 1 : null}))
}
