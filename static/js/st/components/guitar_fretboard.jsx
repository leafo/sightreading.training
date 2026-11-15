import * as React from "react"
import {FRET_MARKERS} from "st/chord_diagram_data"
import {chordNote} from "st/chord_lab"
import {OPEN_PITCHES, STRING_NAMES} from "st/guitar_chords"
import styles from "./guitar_visuals.module.css"

export default function GuitarFretboard({frets = Array(6).fill(null), onChange, tones, labels = "notes", showAllNotes = false, onReset, quiet = false}) {
  const select = (string, fret) => onChange?.(frets.map((value, index) => index === string ? (value === fret ? null : fret) : value))
  const Cell = onChange ? "button" : "div"
  return <section aria-label="Guitar fretboard" className={styles.instrument}>
    <div className={styles.toolbar}>
      {!quiet && <span className={styles.fretboard_hint}>Standard tuning · E A D G B E · {onChange ? "Tap a fret to place a note; tap it again to mute the string. ○ open · × muted." : "Highlighted notes belong to the scale; an outlined dot marks the root."}</span>}
      {onReset && <button type="button" className={styles.reset} aria-label="Reset fretboard" title="Reset fretboard" onClick={onReset}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 10a8 8 0 1 1 0 5M4 4v6h6" /></svg>
      </button>}
    </div>
    <div className={styles.scroll} tabIndex="0" role="group" aria-label="Scrollable fretboard, frets 0 to 12">
      <div className={styles.fretboard}>
        {[5, 4, 3, 2, 1, 0].map(string => <div className={styles.string} key={string}>
          {Array.from({length: 13}, (_, fret) => {
            const pitch = OPEN_PITCHES[string] + fret
            const tone = tones?.find(note => note.pitchClass === pitch % 12)
            const selected = onChange ? frets[string] === fret : !!tone
            const note = tone?.name?.replaceAll("#", "♯").replaceAll("b", "♭") || chordNote(pitch)
            const content = labels === "degrees" && tone ? tone.interval : labels === "both" && tone ? `${note} ${tone.interval}` : note
            const display = selected ? content : showAllNotes ? chordNote(pitch) : fret === 0 ? (onChange && frets[string] === null ? "×" : STRING_NAMES[string].replace("High ", "").replace("Low ", "")) : ""
            return <Cell key={fret} type={onChange ? "button" : undefined} role={onChange ? undefined : "img"}
              className={fret === 0 ? styles.open : undefined}
              aria-pressed={onChange ? selected : undefined}
              aria-label={`${STRING_NAMES[string]} ${fret === 0 ? "open" : `fret ${fret}`}, ${note}${tone ? `, degree ${tone.interval}` : ""}${selected ? ", highlighted" : ""}`}
              onClick={onChange ? () => select(string, fret) : undefined}>
              <span className={`${selected ? styles.selected_note : styles.note} ${selected && tone?.degree === 1 ? styles.root_note : ""}`}>{display}</span>
            </Cell>
          })}
        </div>)}
        <div className={styles.fret_numbers}>{Array.from({length: 13}, (_, fret) => <span key={fret}>
          {FRET_MARKERS.includes(fret) ? fret : ""}{FRET_MARKERS.includes(fret) && <small>{fret === 12 ? "••" : "•"}</small>}
        </span>)}</div>
      </div>
    </div>
  </section>
}
