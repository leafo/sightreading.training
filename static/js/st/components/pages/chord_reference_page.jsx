import * as React from "react"
import {Link} from "react-router-dom"
import ChordVoicings from "st/components/chord_voicings"
import DiagramSize from "st/components/diagram_size"
import Toast from "st/components/toast"
import {referenceState, readToolState, persistToolPage, CHORD_FAMILIES} from "st/tool_preferences"
import {CHORD_ROOTS} from "st/chord_lab"
import {setTitle} from "st/globals"
import {searchChords, CHORD_SEARCH_EXAMPLES} from "st/chord_reference"
import styles from "./chord_reference_page.module.css"

export default class ChordReferencePage extends React.Component {
  state = readToolState("chord-reference", referenceState)

  componentDidMount() {
    setTitle("Chord Reference")
  }

  componentDidUpdate(previousProps, previousState) { persistToolPage(this, "chord-reference", referenceState, previousState) }

  updateQuery(query) {
    const matches = searchChords(query)
    const sameRoot = matches.length && matches.every(match => match.root === matches[0].root)
    const family = matches.length === 1 && CHORD_FAMILIES.find(value => value === matches[0].quality.toLowerCase())
    this.setState({query, visible: 24, ...(sameRoot ? {root: matches[0].root} : {}), ...(family ? {family} : {})})
  }

  render() {
    const {query} = this.state
    const results = query.trim() ? searchChords(query) : []
    return <main className={styles.page}>
      <h1>Chord Reference</h1>
      <p>Find a chord by symbol, name, mood, or style to see its notes and interval formula.</p>
      <div className={styles.workspace}>
      <section className={styles.search_panel} aria-label="Find a chord">
      <div className={styles.root_picker} role="group" aria-label="Chord root">
        {CHORD_ROOTS.map(root => <button type="button" key={root} aria-pressed={query === `${root} ${this.state.family}`}
          onClick={() => this.setState({root, query: `${root} ${this.state.family}`, visible: 24})}>{root.replace("b", "♭").replace("#", "♯")}</button>)}
      </div>
      <label>Chord type<select value={this.state.family}
        onChange={event => this.setState({family: event.target.value, query: `${this.state.root} ${event.target.value}`, visible: 24})}>
        {CHORD_FAMILIES.map(family => <option key={family}>{family}</option>)}
      </select></label>
      <label>Diagram labels<select value={this.state.diagramLabels} onChange={event => this.setState({diagramLabels: event.target.value})}>
        <option value="fingers">Fingers</option><option value="notes">Notes</option><option value="intervals">Intervals</option><option value="both">Notes and intervals</option>
      </select></label>
      <label htmlFor="chord-query">Search chords</label>
      <input id="chord-query" type="search" value={query} maxLength={80}
        aria-describedby="chord-query-help" autoComplete="off"
        onChange={event => this.updateQuery(event.target.value)} />
      <p id="chord-query-help">Try Cmaj7, F sharp minor 7, or C dreamy. Combine a root, quality, and descriptive words.</p>
      <div className={styles.suggestions} role="group" aria-label="Example chord searches">
        {CHORD_SEARCH_EXAMPLES.map(example => <button key={example} type="button"
          onClick={() => this.updateQuery(example)}>{example}</button>)}
      </div>
      <p>Mood and style are starting points for exploration: voicing and musical context change how a chord feels.</p>
      </section>
      <section className={styles.chord_panel} aria-label="Chord diagrams and details">
      <DiagramSize />
      <p role="status">{query.trim()
        ? results.length ? `${results.length} ${results.length === 1 ? "match" : "matches"}` : "No chords matched. Try a chord symbol or a word such as dreamy, dark, blues, or open."
        : "Enter a chord symbol or a quality such as suspended."}</p>
      {results.length > 0 && <ul className={styles.results} aria-label="Matching chords">
        {results.slice(0, this.state.visible).map(({symbol, quality, formula, notes, descriptors}) => {
          return <li key={symbol}>
          <h2>{symbol}</h2>
          <ChordVoicings notes={notes} name={symbol} labels={this.state.diagramLabels} linkToLab />
          <p>{quality}</p>
          <dl>
            <dt>Notes</dt><dd>{notes.join(" · ")}</dd>
            <dt>Formula</dt><dd>{formula}</dd>
            <dt>Explore</dt><dd>{descriptors.join(" · ")}</dd>
          </dl>
        </li>})}
      </ul>}
      {results.length > this.state.visible && <button type="button" onClick={() => this.setState({visible: this.state.visible + 24})}>Show more chords</button>}
      </section></div>
      <Toast message={this.state.storageWarning} onDismiss={() => this.setState({storageWarning: null})} />
      <p>Have a guitar fingering or piano notes? <Link to="/chord-lab">Identify a chord in Chord Lab</Link>.</p>
    </main>
  }
}
