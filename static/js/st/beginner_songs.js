// Original beginner arrangements of public-domain melodies. One block chord per bar.
const voicings = {
  C: ["C3", "E3", "G3"], F: ["C3", "F3", "A3"], G: ["B2", "D3", "G3"],
  D: ["D3", "F+3", "A3"], A: ["C+3", "E3", "A3"],
  Bm: ["D3", "F+3", "B3"], Fsm: ["C+3", "F+3", "A3"]
}

function arrangement(id, title, key, bpm, melody, chords, description) {
  const song = `ks${key === "D" ? 2 : 0} ts4/4 t0 /g m0\n${melody.join("\n")}\nt1 /f\n` +
    chords.map((chord, bar) => `m${bar} { ${voicings[chord].map(note => `${note}.4`).join(" | ")} }`).join("\n")
  return {id, title, key, bpm, song, chords, description,
    url: `/play-along/beginner/${id}`}
}

export const BEGINNER_SONGS = [
  arrangement("twinkle-twinkle", "Twinkle Twinkle Little Star", "C", 60, [
    "c4 c4 g4 g4", "a4 a4 g4.2", "f4 f4 e4 e4", "d4 d4 c4.2",
    "g4 g4 f4 f4", "e4 e4 d4.2", "g4 g4 f4 f4", "e4 e4 d4.2",
    "c4 c4 g4 g4", "a4 a4 g4.2", "f4 f4 e4 e4", "d4 d4 c4.2"
  ], ["C", "F", "C", "G", "C", "G", "C", "G", "C", "F", "C", "C"],
  "Complete melody in C major with slow quarter notes and half notes."),
  arrangement("mary-little-lamb", "Mary Had a Little Lamb", "C", 60, [
    "e4 d4 c4 d4", "e4 e4 e4.2", "d4 d4 d4.2", "e4 g4 g4.2",
    "e4 d4 c4 d4", "e4 e4 e4 e4", "d4 d4 e4 d4", "c4.4"
  ], ["C", "C", "G", "C", "C", "C", "G", "C"],
  "Complete melody using just C and G chords."),
  arrangement("little-brown-jug", "Little Brown Jug", "C", 60, [
    "g4 e4 e4.2", "f4 d4 d4.2", "c4 d4 e4 f4", "g4 g4 g4.2",
    "g4 e4 e4.2", "f4 d4 d4.2", "g4 g4 a4 b4", "c5.4",
    "g4 e4 g4 e4", "g4 g4 g4.2", "a4 f4 a4 f4", "a4 a4 a4.2",
    "g4 g4 a4 g4", "f4 e4 d4.2", "g4 g4 a4 b4", "c5.4"
  ], ["C", "G", "C", "C", "C", "G", "G", "C", "C", "C", "F", "F", "C", "G", "G", "C"],
  "Simplified verse and chorus with a straight rhythm and three chords."),
  arrangement("canon-in-d", "Canon in D", "D", 50, [
    "f4.4", "e4.4", "d4.4", "c4.4", "b3.4", "a3.4", "b3.4", "c4.4",
    "d4.2 f4.2", "a4.2 g4.2", "f4.2 d4.2", "f4.2 e4.2",
    "d4.2 b3.2", "d4.2 a3.2", "g4.2 b4.2", "a4.4", "d4.4"
  ], ["D", "A", "Bm", "Fsm", "G", "D", "G", "A", "D", "A", "Bm", "Fsm", "G", "D", "G", "A", "D"],
  "Short Pachelbel excerpt in D major, simplified to whole and half notes with a final D chord. F♯m is shown as F#m below.")
]

export function getBeginnerSong(id) {
  return BEGINNER_SONGS.find(song => song.id === id)
}
