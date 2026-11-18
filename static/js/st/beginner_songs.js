// Original beginner arrangements of public-domain melodies. One block chord per bar.
// Internal octave names use MIDI / 12: C5 = MIDI 60 (scientific middle C4).
const voicings = {
  C: ["C4", "E4", "G4"], F: ["C4", "F4", "A4"], G: ["B3", "D4", "G4"],
  D: ["D4", "F+4", "A4"], A: ["C+4", "E4", "A4"],
  Bm: ["D4", "F+4", "B4"], Fsm: ["C+4", "F+4", "A4"]
}

function arrangement(id, title, key, bpm, melody, chords, description) {
  const song = `ks${key === "D" ? 2 : 0} ts4/4 t0 /g m0\n${melody.join("\n")}\nt1 /f\n` +
    chords.map((chord, bar) => `m${bar} { ${voicings[chord].map(note => `${note}.4`).join(" | ")} }`).join("\n")
  return {id, title, key, bpm, song, chords, description,
    url: `/play-along/beginner/${id}`}
}

export const BEGINNER_SONGS = [
  arrangement("twinkle-twinkle", "Twinkle Twinkle Little Star", "C", 60, [
    "c5 c5 g5 g5", "a5 a5 g5.2", "f5 f5 e5 e5", "d5 d5 c5.2",
    "g5 g5 f5 f5", "e5 e5 d5.2", "g5 g5 f5 f5", "e5 e5 d5.2",
    "c5 c5 g5 g5", "a5 a5 g5.2", "f5 f5 e5 e5", "d5 d5 c5.2"
  ], ["C", "F", "C", "G", "C", "G", "C", "G", "C", "F", "C", "C"],
  "Complete melody in C major with slow quarter notes and half notes."),
  arrangement("mary-little-lamb", "Mary Had a Little Lamb", "C", 60, [
    "e5 d5 c5 d5", "e5 e5 e5.2", "d5 d5 d5.2", "e5 g5 g5.2",
    "e5 d5 c5 d5", "e5 e5 e5 e5", "d5 d5 e5 d5", "c5.4"
  ], ["C", "C", "G", "C", "C", "C", "G", "C"],
  "Complete melody using just C and G chords."),
  arrangement("little-brown-jug", "Little Brown Jug", "C", 60, [
    "g5 e5 e5.2", "f5 d5 d5.2", "c5 d5 e5 f5", "g5 g5 g5.2",
    "g5 e5 e5.2", "f5 d5 d5.2", "g5 g5 a5 b5", "c6.4",
    "g5 e5 g5 e5", "g5 g5 g5.2", "a5 f5 a5 f5", "a5 a5 a5.2",
    "g5 g5 a5 g5", "f5 e5 d5.2", "g5 g5 a5 b5", "c6.4"
  ], ["C", "G", "C", "C", "C", "G", "G", "C", "C", "C", "F", "F", "C", "G", "G", "C"],
  "Simplified verse and chorus with a straight rhythm and three chords."),
  arrangement("canon-in-d", "Canon in D", "D", 60, [
    // An original broken-chord piano introduction over the eight-chord ground.
    "{ dt d5 f5 a5 d6 a5 f5 d5 a4 }", "{ dt a4 c5 e5 a5 e5 c5 a4 e5 }",
    "{ dt b4 d5 f5 b5 f5 d5 b4 f5 }", "{ dt f4 a4 c5 f5 c5 a4 f4 c5 }",
    "{ dt g4 b4 d5 g5 d5 b4 g4 d5 }", "{ dt d5 f5 a5 d6 a5 f5 d5 a4 }",
    "{ dt g4 b4 d5 g5 d5 b4 g4 d5 }", "{ dt a4 c5 e5 a5 e5 c5 a4 e5 }",
    // Recognizable descending theme, then a more active repeat.
    "f5.4", "e5.4", "d5.4", "c5.4", "b4.4", "a4.4", "b4.4", "c5.4",
    "d5.2 f5.2", "a5.2 g5.2", "f5.2 d5.2", "f5.2 e5.2",
    "d5.2 b4.2", "d5.2 a4.2", "g5.2 b5.2", "a5.4",
    "f5 a5 d6 a5", "e5 a5 c6 a5", "d5 f5 b5 f5", "c5 f5 a5 f5",
    "b4 d5 g5 d5", "a4 d5 f5 d5", "b4 d5 g5 b5", "c5 e5 a5 c6", "d6.4"
  ], ["D", "A", "Bm", "Fsm", "G", "D", "G", "A",
      "D", "A", "Bm", "Fsm", "G", "D", "G", "A",
      "D", "A", "Bm", "Fsm", "G", "D", "G", "A",
      "D", "A", "Bm", "Fsm", "G", "D", "G", "A", "D"],
  "Beginner piano arrangement: eight bars of broken-chord introduction, the descending theme, a flowing variation, and a final D cadence. A simplified excerpt, not the complete three-violin canon.")
]

export function getBeginnerSong(id) {
  return BEGINNER_SONGS.find(song => song.id === id)
}
