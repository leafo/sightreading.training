import * as React from "react"
import {chordNote} from "st/chord_lab"
import styles from "./piano_visual.module.css"

export const PIANO_PITCHES = Array.from({length: 25}, (_, index) => 48 + index)
const accidental = pitch => [1, 3, 6, 8, 10].includes(pitch % 12)
export default function PianoVisual({tones, labels = "notes", onToggle, selected = [], noteLabels}) {
  let whites = 0
  return <div className={styles.scroll} tabIndex="0" role="group" aria-label="Two-octave piano, C3 to C5">
    <div className={styles.keyboard}>
      {PIANO_PITCHES.map(pitch => {
        const black = accidental(pitch)
        const position = black ? whites - .32 : whites++
        const tone = (tones || noteLabels)?.find(note => note.pitchClass === pitch % 12)
        const active = tones ? !!tone : selected.includes(pitch)
        const name = `${chordNote(pitch)}${Math.floor(pitch / 12) - 1}`
        const noteLabel = tone?.name?.replaceAll("#", "♯").replaceAll("b", "♭") || chordNote(pitch)
        const text = labels === "degrees" ? tone?.interval : labels === "both" ? `${noteLabel} ${tone?.interval || ""}` : noteLabel
        const className = `${black ? styles.black : styles.white} ${active ? styles.active : ""} ${tone?.degree === 1 ? styles.root : ""}`
        const props = {className, style: {left: `${position * 100 / 15}%`}, "aria-label": `${name}${tone ? `, degree ${tone.interval}` : ""}${active ? ", highlighted" : ""}`}
        return onToggle ? <button {...props} type="button" key={pitch} aria-pressed={active} onClick={() => onToggle(pitch)}><span>{active ? text : ""}</span></button>
          : <div {...props} role="img" key={pitch}><span>{active ? text : ""}</span></div>
      })}
    </div>
  </div>
}
