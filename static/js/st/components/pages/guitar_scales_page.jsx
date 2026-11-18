import * as React from "react"

import {setTitle} from "st/globals"
import {guitarScale, ROOTS, SCALE_TYPES} from "st/guitar_scales"
import styles from "./guitar_scales_page.module.css"

function displayNote(note) {
  return note.replace("#", "♯").replace("b", "♭")
}

export default class GuitarScalesPage extends React.Component {
  state = {root: "A", type: "Minor pentatonic", lastFret: 12}

  componentDidMount() {
    setTitle("Guitar Scales")
  }

  render() {
    const {root, type, lastFret} = this.state
    const {notes, frets, strings} = guitarScale(root, type, lastFret)
    const scaleName = `${displayNote(root)} ${type.toLowerCase()}`

    const sections = [frets.slice(0, 7)]
    for (let start = 7; start <= lastFret; start += 6) {
      sections.push(frets.slice(start, start + 6))
    }

    return <main className={styles.page}>
      <h1>Guitar Scales</h1>
      <p>Find scale notes in standard tuning (E A D G B E).</p>
      <div className={styles.controls}>
        <label>Root
          <select value={root} onChange={event => this.setState({root: event.target.value})}>
            {ROOTS.map(note => <option key={note} value={note}>{displayNote(note)}</option>)}
          </select>
        </label>
        <label>Scale
          <select value={type} onChange={event => this.setState({type: event.target.value})}>
            {Object.keys(SCALE_TYPES).map(name => <option key={name}>{name}</option>)}
          </select>
        </label>
        <label>Show frets
          <select value={lastFret} onChange={event => this.setState({lastFret: Number(event.target.value)})}>
            {[12, 18, 24].map(fret =>
              <option key={fret} value={fret}>0–{fret}</option>)}
          </select>
        </label>
      </div>
      <p aria-live="polite"><strong>{scaleName}</strong> · {notes.map(note => displayNote(note.name)).join(" · ")}</p>
      <p>★ marks the root. Fret 0 is the open string.</p>
      {sections.map(section => <table key={section[0]} className={styles.fretboard}>
        <caption>Frets {section[0]}–{section.at(-1)}</caption>
        <thead>
          <tr>
            <th scope="col">String</th>
            {section.map(fret => <th scope="col" key={fret}>{fret}</th>)}
          </tr>
        </thead>
        <tbody>
          {strings.map(string => <tr key={string.number}>
            <th scope="row">{string.number} · {string.name}</th>
            {section.map(fret => {
              const note = string.cells[fret]
              return <td key={fret}>
                {note && (note.degree === 1
                  ? <strong className={styles.root}>{displayNote(note.name)} ★</strong>
                  : displayNote(note.name))}
              </td>
            })}
          </tr>)}
        </tbody>
      </table>)}
    </main>
  }
}
