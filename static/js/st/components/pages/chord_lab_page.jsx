import * as React from "react"
import ui from "../ui.module.css"
import {tabNavigationIndex} from "st/tab_navigation"
import IconReset from "st/components/reset_icon"
import visualStyles from "../guitar_visuals.module.css"

import {Link} from "react-router-dom"
import VoicingTransfer from "st/components/voicing_transfer"
import {readLabHandoff} from "st/voicing_handoff"
import {voicingToken, validFrets} from "st/voicing_markup"
import GuitarFretboard from "st/components/guitar_fretboard"
import ChordDiagram from "st/components/chord_diagram"
import {assignFingers} from "st/guitar_chords"
import ToolOptions from "st/components/tool_options"
import PianoVisual from "st/components/piano_visual"
import ChordVoicings from "st/components/chord_voicings"
import DiagramSize from "st/components/diagram_size"
import Toast from "st/components/toast"
import {chordTones} from "st/chord_display"
import {labState, readToolState, persistToolPage} from "st/tool_preferences"
import ChordMidi from "st/chord_midi"
import {trigger} from "st/events"
import {setTitle} from "st/globals"
import {chordNote, guitarVoicing, identifyChordMatches, suggestChords} from "st/chord_lab"
import styles from "./chord_lab_page.module.css"

export default class ChordLabPage extends React.Component {
  state = {...readToolState("chord-lab", labState), midiNotes: []}

  midiChord = new ChordMidi()

  resetMidi = () => {
    this.midiChord.reset()
    this.setState({midiNotes: []})
  }

  handleInputState = () => {
    if (this.props.midiInput?.state === "disconnected") this.resetMidi()
  }

  onMidiMessage(message) {
    if (this.state.instrument !== "midi" || this.props.midiInput?.state === "disconnected") return
    this.midiChord.receive(message.data)
    this.setState({midiNotes: this.midiChord.notes})
  }

  componentDidUpdate(previous, previousState) {
    persistToolPage(this, "chord-lab", labState, previousState)
    if (previous.midiInput !== this.props.midiInput) {
      previous.midiInput?.removeEventListener("statechange", this.handleInputState)
      this.props.midiInput?.addEventListener("statechange", this.handleInputState)
      this.resetMidi()
    }
  }

  componentWillUnmount() {
    this.props.midiInput?.removeEventListener("statechange", this.handleInputState)
    this.midiChord.reset()
  }

  componentDidMount() {
    this.props.midiInput?.addEventListener("statechange", this.handleInputState)
    setTitle("Chord Lab")
    const params = new URLSearchParams(window.location.search)
    const ticket = params.get("sheetReturn")
    const context = readLabHandoff(ticket)
    if (context) this.setState({sheetReturn: ticket, sheetContext: context})
    const incoming = params.get("frets")
    if (incoming && /^(x|[0-9]|1[0-9]|2[0-4])(,(x|[0-9]|1[0-9]|2[0-4])){5}$/.test(incoming)) {
      this.setState({selectedMatch: params.get("chord") || "", instrument: "guitar", frets: incoming.split(",").map(fret => fret === "x" ? null : Number(fret))})
    }
    // Consume the initial shape, so refresh recovers subsequent experimentation.
    if (params.has("frets")) {
      const url = new URL(window.location.href)
      url.searchParams.delete("frets"); url.searchParams.delete("chord")
      window.history?.replaceState(null, "", url.pathname + url.search + url.hash)
    }
  }

  renderChordTabs(chords, selected, field, pitches) {
    return <div className={`${ui.tab_list} ${styles.match_list}`} role="tablist" aria-label={field === "selectedMatch" ? "Chord matches" : "Suggested chords"}>
      {chords.map((chord, index) => {
        const tones = chordTones(chord.name).filter(tone => !chord.omittedFifth || pitches?.some(pitch => pitch % 12 === tone.pitchClass))
        return <button key={chord.name} type="button" role="tab" aria-selected={selected === chord.name}
          tabIndex={selected === chord.name ? 0 : -1}
          onClick={() => this.setState({[field]: chord.name})}
          onKeyDown={event => {
            const move = tabNavigationIndex(event.key, index, chords.length)
            if (move === null) return
            event.preventDefault()
            this.setState({[field]: chords[move].name})
            event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[move].focus()
          }}>
          <strong>{chord.name}</strong><span>{tones.map(tone => tone.name).join(" · ")}</span>{chord.omittedFifth && <small>no 5</small>}
        </button>
      })}
    </div>
  }

  render() {
    const {frets, instrument, pianoNotes, midiNotes, labels, showAllNotes} = this.state
    const pitches = instrument === "guitar" ? guitarVoicing(frets) : instrument === "midi" ? midiNotes : pianoNotes
    const notes = [...new Set([...pitches].sort((a, b) => a - b).map(chordNote))]
    const matchDetails = identifyChordMatches(pitches)
    const matches = matchDetails.map(match => match.name)
    const selected = matches.includes(this.state.selectedMatch) ? this.state.selectedMatch : matches[0]
    const tones = chordTones(selected, pitches)
    const suggestions = matches.length ? [] : suggestChords(pitches)
    const activeSuggestion = suggestions.find(item => item.name === this.state.selectedSuggestion) || suggestions[0]
    const chooseVoicing = frets => this.setState({frets: [...frets], instrument: "guitar"})
    return <main className={`${ui.tool_page} ${styles.page}`}>
      <div className={styles.page_heading}><h1>Chord Lab</h1>
        <div className={styles.heading_actions}><Link to="/chord-reference">Search chords →</Link>
        {instrument === "guitar" && <button type="button" className={styles.reset} aria-label="Reset fretboard" title="Reset fretboard"
          onClick={() => this.setState({frets: Array(6).fill(null), selectedMatch: ""})}>
          <IconReset width={20} />
        </button>}
        <ToolOptions>
          <label>Instrument<select value={instrument} onChange={event => { this.resetMidi(); this.setState({instrument: event.target.value}) }}>
            <option value="guitar">Guitar</option><option value="piano">Piano</option><option value="midi">MIDI keyboard</option>
          </select></label>
          <label><input type="checkbox" checked={showAllNotes} onChange={event => this.setState({showAllNotes: event.target.checked})} />Show all fretboard notes</label>
          <label>Fretboard labels<select value={labels} onChange={event => this.setState({labels: event.target.value})}>
            <option value="notes">Chord notes</option><option value="degrees">Chord degrees</option><option value="both">Notes and degrees</option>
          </select></label>
          {instrument === "guitar" && <label>Diagram labels<select value={this.state.diagramLabels} onChange={event => this.setState({diagramLabels: event.target.value})}>
            <option value="fingers">Fingers</option><option value="notes">Notes</option><option value="intervals">Intervals</option><option value="both">Notes and intervals</option>
          </select></label>}
        </ToolOptions></div>
      </div>
      {instrument === "guitar" ? <GuitarFretboard frets={frets} tones={tones} labels={labels} showAllNotes={showAllNotes}
        onChange={frets => this.setState({frets})} />
        : instrument === "midi" ? <>
          <p>Play and hold a chord on your MIDI keyboard. Sustain pedal notes count until you release the pedal.</p>
          <p role="status">{this.props.midiInput && this.props.midiInput.state !== "disconnected"
            ? `Input: ${this.props.midiInput.name || "MIDI keyboard"}` : "No connected MIDI input selected. Connect a keyboard and choose it below."}</p>
          <div className={styles.actions}><button type="button" onClick={() => trigger(this, "pickMidi")}>Choose MIDI device</button>
            <button type="button" onClick={this.resetMidi}>Reset MIDI notes</button></div>
        </> : <>
          <p>Select piano keys to build a chord. The lowest note sets the bass.</p>
          <PianoVisual selected={pianoNotes} labels={labels} noteLabels={tones} onToggle={pitch => this.setState(({pianoNotes}) => ({pianoNotes: pianoNotes.includes(pitch)
            ? pianoNotes.filter(note => note !== pitch) : [...pianoNotes, pitch]}))} />
          <button type="button" onClick={() => this.setState({pianoNotes: []})}>Clear piano notes</button>
        </>}
      {labels !== "notes" && <p className={styles.degree_context}>Degrees relative to {selected ? `${selected.split("/")[0]} root` : `the current bass (${notes[0] || "select a note"})`}.</p>}
      {instrument === "guitar" && <DiagramSize />}
      <section className={styles.matches} aria-labelledby="chord-matches-heading">
        <h2 id="chord-matches-heading">Chord Matches</h2>
        <div className={styles.analysis}>
          {matches.length ? this.renderChordTabs(matchDetails, selected, "selectedMatch", pitches) : <p>{notes.length < 3 ? "Select at least three different notes to identify a chord." : "No direct match."}</p>}
          <div className={styles.match_content} aria-live="polite">
            {instrument === "guitar" && <ChordDiagram frets={frets} fingers={assignFingers(frets)} name={selected || "Your voicing"} labels={this.state.diagramLabels}
              actions={selected && validFrets(frets) && <>
                <VoicingTransfer name={selected} frets={frets} />
                {this.state.sheetReturn && <>
                  <Link className={visualStyles.diagram_link} aria-label="Add variation and return" title="Add variation and return" reloadDocument to={`/chord-sheet?sheetReturn=${this.state.sheetReturn}&action=add&voicing=${encodeURIComponent(voicingToken(selected, frets))}`}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m8 5-5 5 5 5M3 10h11a5 5 0 0 1 0 10M17 2v8M13 6h8" /></svg></Link>
                  {this.state.sheetContext.alias && <Link className={visualStyles.diagram_link} aria-label="Replace this voicing and return" title="Replace this voicing and return" reloadDocument to={`/chord-sheet?sheetReturn=${this.state.sheetReturn}&action=replace&voicing=${encodeURIComponent(voicingToken(selected, frets))}`}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m8 3-5 5 5 5M3 8h11a6 6 0 0 1 0 12H9M14 5l3-3 3 3" /></svg></Link>}
                </>}
              </>} />}
            {instrument === "guitar" && selected && <div id="match-voicings" role="tabpanel" aria-label={`${selected} voicings`}>
              <ChordVoicings notes={tones.map(tone => tone.name)} bassNote={selected.split("/")[1]} name={selected} labels={this.state.diagramLabels} onChoose={chooseVoicing} />
            </div>}
          </div>
        </div>
      </section>
      {this.state.sheetReturn && <p><Link reloadDocument to="/chord-sheet">Return to sheet without changes</Link></p>}
      {suggestions.length > 0 && <section className={styles.variants}>
        <h2>Suggestions</h2>
        {this.renderChordTabs(suggestions, activeSuggestion.name, "selectedSuggestion")}
        <p>{activeSuggestion.missing.length ? `Add ${activeSuggestion.missing.join(", ")}. ` : ""}{activeSuggestion.extra.length ? `Remove ${activeSuggestion.extra.join(", ")}.` : ""}</p>
        {instrument === "guitar" && <ChordVoicings notes={chordTones(activeSuggestion.name).map(tone => tone.name)} name={activeSuggestion.name} labels={this.state.diagramLabels} onChoose={chooseVoicing} />}
      </section>}
      <Toast message={this.state.storageWarning} onDismiss={() => this.setState({storageWarning: null})} />
    </main>
  }
}
