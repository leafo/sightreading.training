import {parseChordSheet} from "st/chord_sheet"
import {searchChords} from "st/chord_reference"
import {guitarChordVoicings} from "st/guitar_chords"

export function sheetChordDiagrams(source, shift = 0, flats = false) {
  const names = [...new Set(parseChordSheet(source, shift, flats).flat().map(segment => segment.chord).filter(Boolean))]
  return names.map(name => {
    const chord = searchChords(name)[0]
    return {name, voicing: chord ? guitarChordVoicings(chord.notes, 1)[0] : undefined}
  })
}
