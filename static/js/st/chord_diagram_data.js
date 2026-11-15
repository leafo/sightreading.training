import {OPEN_PITCHES} from "st/guitar_chords"
import {chordTones} from "st/chord_display"
import {chordNote} from "st/chord_lab"

export const DIAGRAM_LABELS = ["fingers", "notes", "intervals", "both"]
export function diagramNote(fret, string, tones) {
  const pitch = OPEN_PITCHES[string] + fret
  const tone = tones.find(note => note.pitchClass === pitch % 12)
  return {note: tone?.name || chordNote(pitch), interval: tone?.interval || ""}
}
export function diagramRange(frets) {
  const stopped = frets.filter(fret => fret > 0)
  const start = stopped.length && Math.max(...stopped) > 5 ? Math.min(...stopped) : 1
  return {start, rows: Math.max(5, ...stopped.map(fret => fret - start + 1))}
}
export function chordDiagramAscii(frets, name = "Chord", format = "line") {
  const asciiName = name.replaceAll("♯", "#").replaceAll("♭", "b")
  const line = `${asciiName} = ${frets.map(fret => fret === null ? "x" : fret).join("-")}`
  if (format === "line") return line
  const {start, rows} = diagramRange(frets)
  const blocks = []
  for (let first = start; first < start + rows; first += 5) {
    const lines = ["    E   A   D   G   B   e",
      "    " + frets.map(fret => fret === null ? "x" : fret === 0 ? "o" : " ").join("   "),
      "    +---+---+---+---+---+"]
    for (let fret = first; fret < first + 5; fret++) {
      lines.push(`${([3, 5, 7, 9, 12].includes(fret) ? String(fret) : "").padStart(2)}  ` + frets.map(value => value === fret ? "o" : "|").join("---"))
      lines.push("    +---+---+---+---+---+")
    }
    blocks.push(lines.join("\n"))
  }
  return blocks.join("\n\n")
}
export async function copyChordDiagram(frets, name, format, clipboard = globalThis.navigator?.clipboard) {
  if (!clipboard?.writeText) throw new Error("Clipboard unavailable")
  await clipboard.writeText(chordDiagramAscii(frets, name, format))
}
export function diagramTones(name, frets) {
  return chordTones(name, frets.flatMap((fret, index) => fret === null ? [] : [OPEN_PITCHES[index] + fret]))
}

export const FRET_MARKERS = [3, 5, 7, 9, 12, 15, 17, 19, 22, 24]
