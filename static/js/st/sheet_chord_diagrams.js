import {parseChordSheet, transposeChord} from "st/chord_sheet"
import {searchChords} from "st/chord_reference"
import {guitarChordVoicings, assignFingers} from "st/guitar_chords"
import {readDefinitions, shiftedFrets, fretText} from "st/voicing_markup"

export function sheetChordDiagrams(source, shift = 0, flats = false) {
  const {definitions} = readDefinitions(source)
  const segments = parseChordSheet(source, shift, flats).flat().filter(s => s.chord)
  const names = [...new Set([...segments.map(s => s.chord), ...definitions.map(d => transposeChord(d.name, shift, flats))])]
  const result = []
  for (const name of names) {
    const defined = definitions.filter(d => transposeChord(d.name, shift, flats) === name)
    const selected = defined.map(d => ({...d, frets: shiftedFrets(d.frets, shift),
      error: shiftedFrets(d.frets, shift) ? undefined : "This shape cannot transpose within frets 0–24. Choose another shape."}))
    for (const s of segments.filter(s => s.chord === name && s.voicing)) {
      if (!selected.some(d => d.alias === s.voicing.alias && d.alias || d.frets && s.voicing.frets && fretText(d.frets) === fretText(s.voicing.frets))) selected.push(s.voicing)
    }
    if (selected.length) {
      for (const shape of selected) result.push({name, alias: shape.alias, originalName: shape.name, key: `${name}:${shape.alias || shape.shape}`,
        error: shape.error, voicing: shape.frets ? {frets: shape.frets, fingers: assignFingers(shape.frets)} : undefined})
    } else {
      const chord = searchChords(name).find(c => c.symbol === name) || searchChords(name)[0]
      result.push({name, key: name, voicing: chord ? guitarChordVoicings(chord.notes, 1, name.split("/")[1] || chord.notes[0])[0] : undefined})
    }
  }
  return result
}
