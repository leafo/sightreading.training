import {KeySignature, parseNote, noteName} from "st/music"
import {MultiTrackSong} from "st/song_note_list"
import {transposeChord} from "st/chord_sheet"

export const MIN_TRANSPOSE = -24
export const MAX_TRANSPOSE = 24
export function playAlongState(value = {}) {
  return {transpose: Number.isInteger(value.transpose) && value.transpose >= MIN_TRANSPOSE && value.transpose <= MAX_TRANSPOSE ? value.transpose : 0}
}

// Rebuild from the parsed source on every change: offsets never accumulate.
// Track notes and the flattened timer/matching list must reference the same objects.
export function transposeSong(source, semitones) {
  if (!Number.isInteger(semitones) || semitones < MIN_TRANSPOSE || semitones > MAX_TRANSPOSE) throw new Error("Choose a whole number from −24 to +24 semitones.")
  if (!semitones) return source
  const signature = KeySignature.forCount(source.metadata?.keySignature || 0)
  const root = parseNote(signature.name() + "5") + semitones
  const choices = KeySignature.allKeySignatures().filter(key => parseNote(key.name() + "5") % 12 === root % 12)
  const target = choices.sort((a, b) => Math.abs(a.count) - Math.abs(b.count))[0]
  const song = new MultiTrackSong(), notes = new Map()
  for (const note of source) {
    const pitch = parseNote(note.note) + semitones
    if (pitch < 0 || pitch > 127) throw new Error("This transpose would put notes outside the MIDI range. Choose a smaller shift.")
    const shifted = note.transpose(semitones)
    shifted.note = target.enharmonic(shifted.note)
    notes.set(note, shifted)
    song.push(shifted)
  }
  source.tracks.forEach((track, index) => {
    const shifted = song.getTrack(index)
    track.forEach(note => shifted.push(notes.get(note)))
    shifted.trackName = track.trackName
    if (track.cleffs) shifted.cleffs = track.cleffs.map(clef => [...clef])
  })
  song.metadata = {...source.metadata, keySignature: target.count}
  if (source.autoChords) song.autoChords = source.autoChords.map(([beat, [root, shape]]) =>
    [beat, [transposeChord(root, semitones, target.isFlat()), shape]])
  return song
}

export function displayedChords(chords, semitones, keySignature) {
  return chords.map(chord => transposeChord(chord === "Fsm" ? "F#m" : chord, semitones, keySignature < 0))
}
