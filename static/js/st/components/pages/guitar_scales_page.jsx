import * as React from "react"
import ui from "../ui.module.css"
import {setTitle} from "st/globals"
import {guitarScale, ROOTS, SCALE_TYPES} from "st/guitar_scales"
import {scalesState, readToolState, persistToolPage} from "st/tool_preferences"
import GuitarFretboard from "st/components/guitar_fretboard"
import PianoVisual from "st/components/piano_visual"
import Toast from "st/components/toast"
import styles from "./guitar_scales_page.module.css"

const displayNote = note => note.replaceAll("#", "♯").replaceAll("b", "♭")
export default class GuitarScalesPage extends React.Component {
  state = readToolState("scales", scalesState)
  componentDidMount() { setTitle("Scales") }
  componentDidUpdate(previousProps, previousState) { persistToolPage(this, "scales", scalesState, previousState) }
  render() {
    const {root, type, instrument, labels} = this.state
    const {notes} = guitarScale(root, type, 12)
    return <main className={`${ui.tool_page} ${styles.page}`}>
      <h1>Scales</h1>
      <p>Explore a scale on guitar or piano.</p>
      <div className={styles.controls}>
        <label>Instrument<select value={instrument} onChange={event => this.setState({instrument: event.target.value})}>
          <option value="guitar">Guitar</option><option value="piano">Piano</option>
        </select></label>
        <label>Root<select value={root} onChange={event => this.setState({root: event.target.value})}>
          {ROOTS.map(note => <option key={note} value={note}>{displayNote(note)}</option>)}
        </select></label>
        <label>Scale<select value={type} onChange={event => this.setState({type: event.target.value})}>
          {Object.keys(SCALE_TYPES).map(name => <option key={name} value={name}>{name === "Melodic minor" ? "Melodic minor (ascending / jazz)" : name}</option>)}
        </select></label>
        <label>Labels<select value={labels} onChange={event => this.setState({labels: event.target.value})}>
          <option value="notes">Notes</option><option value="degrees">Intervals</option><option value="both">Notes and intervals</option>
        </select></label>
      </div>
      {instrument === "guitar" && <p aria-live="polite">{notes.map(note => `${displayNote(note.name)} (${note.interval})`).join(" · ")}</p>}
      {instrument === "piano" ? <PianoVisual tones={notes} labels={labels} /> : <GuitarFretboard tones={notes} labels={labels} quiet />}
      <Toast message={this.state.storageWarning} onDismiss={() => this.setState({storageWarning: null})} />
    </main>
  }
}
