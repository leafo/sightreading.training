import * as React from "react"
import {setTitle} from "st/globals"
import {DRUM_KITS} from "st/drum_kits"
import DrumAudio from "st/drum_audio"
import Toast from "st/components/toast"
import {TRACKS, PRESETS, STORAGE_KEY, emptyPattern, validatePattern, resizePattern, readSavedPatterns, TIME_SIGNATURES, meterFor, changeTimeSignature, changeSubdivision, stepMarker} from "st/drum_patterns"
import styles from "./drum_machine_page.module.css"

const SESSION_KEY = "drum-machine:session:v1"

const TAGLINES = ["Find you groove", "Groovy", "Tss tss tssss", "Boom chucka", "Bum dum..."]

function DrumIcon({name}) {
  return <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {name === "play" && <path fill="currentColor" stroke="none" d="M7 4v16l14-8z" />}
    {name === "stop" && <rect fill="currentColor" stroke="none" x="5" y="5" width="14" height="14" rx="1" />}
    {name === "volume" && <><path d="M11 4 6 8H3v8h3l5 4zM15 8a6 6 0 0 1 0 8M18 4a11 11 0 0 1 0 16" /></>}
    {name === "save" && <><path d="M5 3h12l4 4v14H3V3zM7 3v6h10V3M7 21v-8h10v8M14 5v2" /></>}
    {name === "plus" && <path d="M12 5v14M5 12h14" />}
    {name === "trash" && <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></>}
  </svg>
}

class PatternNameDialog extends React.Component {
  dialog = React.createRef()
  input = React.createRef()

  componentDidMount() {
    this.dialog.current.showModal()
    this.input.current.focus()
    this.input.current.select()
  }

  componentWillUnmount() {
    if (this.dialog.current?.open) this.dialog.current.close()
  }

  render() {
    const {action, name, error, onChange, onSubmit, onCancel} = this.props
    return <dialog ref={this.dialog} className={styles.nameDialog} aria-labelledby="pattern-dialog-title"
      onCancel={e => { e.preventDefault(); onCancel() }}>
      <form onSubmit={e => { e.preventDefault(); onSubmit() }}>
        <h2 id="pattern-dialog-title">{action === "new" ? "New pattern" : "Save pattern"}</h2>
        <label>Pattern name<input ref={this.input} aria-label="Pattern name" aria-describedby="pattern-dialog-help" maxLength="60" required value={name} onChange={e => onChange(e.target.value)} /></label>
        <p id="pattern-dialog-help">{action === "new" ? "Save the current beat as a new named pattern." : "Saving an existing name replaces that saved pattern."}</p>
        {error && <p role="alert">{error}</p>}
        <div className={styles.dialogActions}>
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="submit">{action === "new" ? "Create" : "Save"}</button>
        </div>
      </form>
    </dialog>
  }
}

export default class DrumMachinePage extends React.Component {
  constructor(props) {
    super(props)
    let saved = [], message = ""
    try { saved = readSavedPatterns(window.localStorage) }
    catch { message = "Saved patterns could not be read. You can still create and play beats." }
    let pattern = validatePattern(PRESETS[0].pattern)
    let selectedName = "", name = "My beat", muted = {}, volume = 0.7
    try {
      const session = JSON.parse(window.localStorage.getItem(SESSION_KEY))
      if (session) {
        pattern = validatePattern(session.pattern)
        if (saved.some(item => item.name === session.selectedName)) selectedName = session.selectedName
        if (typeof session.name === "string") name = session.name
        muted = Object.fromEntries(TRACKS.map(([id]) => [id, session.muted?.[id] === true]))
        if (Number.isFinite(session.volume) && session.volume >= 0 && session.volume <= 1) volume = session.volume
      }
    } catch {
      // Start with defaults if the previous session is unavailable.
    }
    this.state = {pattern, tempoInput: String(pattern.bpm), saved, selectedName, name, dialogAction: null, dialogName: "", dialogError: "", muted, volume, playing: false, starting: false, currentStep: -1, message}
    this.tagline = TAGLINES[Math.floor(Math.random() * TAGLINES.length)]
    this.audio = new DrumAudio(currentStep => this.setState({currentStep}))
  }

  handlePlaybackKey = event => {
    if ((event.code !== "Space" && event.key !== " ") || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || this.state.dialogAction) return
    if (event.target?.isContentEditable || event.target?.closest?.("input, textarea, select, button, a, dialog, [role=button], [role=textbox]")) return
    event.preventDefault()
    if (!event.repeat) this.togglePlayback()
  }

  componentDidMount() {
    setTitle("Drum Machine")
    window.addEventListener("keydown", this.handlePlaybackKey)
  }
  componentDidUpdate(_previousProps, previous) {
    const {pattern, selectedName, name, muted, volume} = this.state
    if (pattern === previous.pattern && selectedName === previous.selectedName &&
        name === previous.name && muted === previous.muted && volume === previous.volume) return
    try {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify({pattern, selectedName, name, muted, volume}))
    } catch {
      // The editor remains usable when browser storage is unavailable.
    }
  }

  componentWillUnmount() {
    this.unmounted = true
    window.removeEventListener("keydown", this.handlePlaybackKey)
    this.audio.dispose()
  }

  notify(message, state = {}) {
    this.setState(previous => ({...state, message, notificationId: (previous.notificationId || 0) + 1}))
  }

  changePattern(pattern) {
    const restart = (this.state.playing || this.state.starting) &&
      (pattern.timeSignature !== this.state.pattern.timeSignature || pattern.bars !== this.state.pattern.bars ||
        pattern.subdivision !== this.state.pattern.subdivision)
    if (restart) this.audio.stop()
    this.setState({pattern, tempoInput: String(pattern.bpm), ...(restart ? {playing: false, starting: false, currentStep: -1} : {})},
      () => { if (restart && !this.unmounted) this.togglePlayback() })
  }

  changeTempo(tempoInput) {
    this.setState(({pattern}) => {
      const bpm = Number(tempoInput)
      return {tempoInput, pattern: tempoInput.trim() && Number.isFinite(bpm) && bpm >= 30 && bpm <= 240 ? {...pattern, bpm} : pattern}
    })
  }

  commitTempo() {
    this.setState(({pattern, tempoInput}) => {
      const value = Number(tempoInput)
      const bpm = tempoInput.trim() && Number.isFinite(value) ? Math.max(30, Math.min(240, value)) : pattern.bpm
      return {pattern: {...pattern, bpm}, tempoInput: String(bpm)}
    })
  }

  async togglePlayback() {
    if (this.state.playing || this.state.starting) {
      this.audio.stop()
      this.setState({playing: false, starting: false, currentStep: -1})
      return
    }
    this.setState({starting: true, message: ""})
    try {
      const started = await this.audio.start(() => this.state.pattern, () => this.state.muted, this.state.volume)
      if (started && !this.unmounted) this.setState({playing: true, starting: false})
    } catch {
      this.audio.stop()
      if (!this.unmounted) this.notify("Audio could not start. Check browser audio permissions and try again.", {starting: false})
    }
  }

  newPattern() {
    const {saved} = this.state
    let name = "My beat", suffix = 2
    while (saved.some(item => item.name === name)) name = `My beat ${suffix++}`
    this.setState({dialogAction: "new", dialogName: name, dialogError: ""})
  }

  loadSaved(name) {
    const item = this.state.saved.find(item => item.name === name)
    if (!item) return
    this.changePattern(validatePattern(item.pattern))
    this.setState({selectedName: name, name, message: ""})
  }

  openSaveDialog() {
    this.setState({dialogAction: "save", dialogName: this.state.name, dialogError: ""})
  }

  submitPatternName() {
    const {pattern, saved, dialogAction, dialogName} = this.state
    if (dialogAction === "new" && saved.some(item => item.name === dialogName.trim())) {
      this.setState({dialogError: "A pattern with this name already exists. Choose another name."})
      return
    }
    this.save(dialogName, pattern, {dialogAction: null, dialogError: ""})
  }

  save(rawName = this.state.name, pattern = this.state.pattern, state = {}) {
    const name = rawName.trim()
    const fail = message => {
      this.notify(message, this.state.dialogAction ? {dialogError: message} : {})
      return false
    }
    if (!name) return fail("Enter a name before saving.")
    if (name.length > 60) return fail("Use a name of 60 characters or fewer.")
    if (this.state.saved.length >= 100 && !this.state.saved.some(item => item.name === name)) {
      return fail("You can save up to 100 patterns. Delete one to make room.")
    }
    const saved = [...this.state.saved.filter(item => item.name !== name), {name, pattern: validatePattern(pattern)}]
    return this.persist(saved, `Saved “${name}” on this browser.`, {selectedName: name, name, ...state})
  }

  deleteSelected() {
    const {selectedName, saved} = this.state
    if (!selectedName) return
    this.persist(saved.filter(item => item.name !== selectedName), `Deleted “${selectedName}”. The current beat is still available to edit.`, {selectedName: ""})
  }

  persist(saved, message, state = {}) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
      this.notify(message, {saved, ...state})
      return true
    } catch {
      const message = "Could not save changes. Browser storage may be full or unavailable."
      this.notify(message, this.state.dialogAction ? {dialogError: message} : {})
      return false
    }
  }

  render() {
    const {pattern, tempoInput, saved, selectedName, dialogAction, dialogName, dialogError, muted, volume, playing, starting, currentStep, message, notificationId} = this.state
    const meter = meterFor(pattern)
    const compound = pattern.timeSignature === "6/8"
    const triplet = pattern.subdivision === "triplet"
    const steps = Array.from({length: pattern.bars * meter.steps}, (_, i) => i)
    return <main className={styles.page}>
      {dialogAction && <PatternNameDialog action={dialogAction} name={dialogName} error={dialogError}
        onChange={dialogName => this.setState({dialogName, dialogError: ""})} onSubmit={() => this.submitPatternName()}
        onCancel={() => this.setState({dialogAction: null, dialogError: ""})} />}
      <header className={styles.heading}>
        <div><h1>Drum Machine</h1><p>{this.tagline}</p></div>
        <section className={styles.patternManager} aria-label="Saved patterns">
          <div className={styles.patternTools}>
            <label className={styles.patternPicker}>Your patterns
              <select aria-label="Your patterns" value={selectedName} onChange={e => this.loadSaved(e.target.value)}>
                <option value="" disabled>{saved.length ? "Unsaved pattern" : "No saved patterns yet"}</option>
                {saved.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}
              </select>
            </label>
            <button type="button" className={styles.iconButton} aria-label="Save pattern" title="Save pattern" onClick={() => this.openSaveDialog()}><DrumIcon name="save" /></button>
            <button type="button" className={styles.iconButton} aria-label="New pattern" title="Save current beat as a new pattern" onClick={() => this.newPattern()}><DrumIcon name="plus" /></button>
            <button type="button" className={styles.iconButton} aria-label="Delete saved pattern" title="Delete selected saved pattern" disabled={!selectedName} onClick={() => this.deleteSelected()}><DrumIcon name="trash" /></button>
          </div>
          <small title="Patterns currently save on this browser; account syncing is not available yet."><a href="/login">Login</a>/<a href="/register">Register</a> to cloud save</small>
        </section>
      </header>
      <Toast message={message} notificationId={notificationId} onDismiss={() => this.setState({message: ""})} />
      <section className={styles.panel} aria-label="Playback controls">
        <div className={styles.controls}>
          <button className={`${styles.play} ${styles.iconButton}`} aria-label={playing || starting ? "Stop" : "Play"} aria-keyshortcuts="Space" title={playing || starting ? "Stop (Space)" : "Play (Space)"} onClick={() => this.togglePlayback()}><DrumIcon name={playing || starting ? "stop" : "play"} /></button>
          <label>Tempo <input aria-label="Tempo BPM" type="number" min="30" max="240" step="any" value={tempoInput}
            onChange={e => this.changeTempo(e.target.value)} onBlur={() => this.commitTempo()}
            onKeyDown={e => {
              if (e.key === "Enter") { e.preventDefault(); this.commitTempo() }
              if (e.key === "Escape") this.setState({tempoInput: String(pattern.bpm)})
            }} /> {compound ? "BPM (♩.)" : "BPM (♩)"}</label>
          <label>Drum set <select aria-label="Drum set" value={pattern.kit} onChange={e => this.changePattern({...pattern, kit: e.target.value})}>
            {DRUM_KITS.map(kit => <option key={kit.id} value={kit.id}>{kit.name}</option>)}
          </select></label>
          <label>Time signature <select value={pattern.timeSignature} onChange={e => this.changePattern(changeTimeSignature(pattern, e.target.value))}>
            {Object.keys(TIME_SIGNATURES).map(signature => <option key={signature} value={signature}>{signature}</option>)}
          </select></label>
          <label>Subdivision <select value={pattern.subdivision} onChange={e => this.changePattern(changeSubdivision(pattern, e.target.value))}>
            <option value="straight">Straight</option><option value="triplet">Triplets</option>
          </select></label>
          <label>Length <select value={pattern.bars} onChange={e => this.changePattern(resizePattern(pattern, Number(e.target.value)))}>
            <option value="1">1 bar</option><option value="2">2 bars</option>
          </select></label>
          <label>Swing {Math.round(pattern.swing * 100)}%<input aria-label="Swing" disabled={triplet} title="Delays offbeat eighth notes (&). 0% is straight; 33% is a triplet shuffle." type="range" min="0" max="50" value={Math.round(pattern.swing * 100)}
            onChange={e => this.changePattern({...pattern, swing: Number(e.target.value) / 100})} /></label>
          <label title="Volume"><DrumIcon name="volume" /><input aria-label="Volume" type="range" min="0" max="100" value={Math.round(volume * 100)} onChange={e => {
            const value = Number(e.target.value) / 100
            this.setState({volume: value}); this.audio.setVolume(value)
          }} /></label>
        </div>
      </section>
      <section className={styles.panel} aria-label="Pattern editor">
        <div className={styles.sectionHeader}><h2>Just beat it</h2>
          <button className={styles.iconButton} aria-label="Clear pattern" title="Clear pattern" onClick={() => this.changePattern({...emptyPattern(pattern.bars, pattern.timeSignature, pattern.subdivision), kit: pattern.kit, bpm: pattern.bpm, swing: pattern.swing})}><DrumIcon name="trash" /></button>
        </div>
        <p className={styles.help}>Toggle steps to add hits. Mute individual tracks with their names. Two bars repeat the first bar when extended. {compound && "6/8: six numbered eighth notes per bar. BPM counts dotted quarters."} {triplet && "Triplets are evenly spaced. Swing applies to straight steps."}</p>
        <div className={styles.scroll} tabIndex="0" aria-label="Scrollable drum steps">
          <table className={styles.grid}>
            <thead><tr><th scope="col">Instrument / mute</th>{steps.map(step => <th key={step} scope="col"
              className={`${styles[stepMarker(pattern, step).size]} ${currentStep === step ? styles.playhead : ""}`}>
              {stepMarker(pattern, step).label}
            </th>)}</tr></thead>
            <tbody>{TRACKS.map(([id, defaultLabel]) => {
              const label = DRUM_KITS.find(kit => kit.id === pattern.kit)?.labels?.[id] || defaultLabel
              return <tr key={id}>
              <th scope="row"><button aria-pressed={!!muted[id]} aria-label={`Mute ${label}`} className={muted[id] ? styles.muted : ""}
                onClick={() => this.setState({muted: {...muted, [id]: !muted[id]}})}>{label}{muted[id] ? " (muted)" : ""}</button></th>
              {steps.map(step => <td key={step} className={`${step % meter.beatSteps === 0 ? styles.beat : ""} ${currentStep === step ? styles.playhead : ""}`}>
                <button className={`${styles.step} ${pattern.tracks[id][step] ? styles.active : ""}`}
                  aria-label={`${label}, bar ${Math.floor(step / meter.steps) + 1}, beat ${Math.floor(step % meter.steps / meter.beatSteps) + 1}, subdivision ${step % meter.beatSteps + 1}`}
                  aria-pressed={pattern.tracks[id][step]} onClick={() => {
                    const row = [...pattern.tracks[id]]; row[step] = !row[step]
                    this.changePattern({...pattern, tracks: {...pattern.tracks, [id]: row}})
                  }}>{pattern.tracks[id][step] ? "●" : "·"}</button>
              </td>)}
            </tr>})}</tbody>
          </table>
        </div>
      </section>
      <section className={styles.panel} aria-label="Preset patterns"><h2>Start with a groove</h2>
        <p>Load a preset, then edit any step. Presets also set time signature, tempo, and swing.</p>
        <div className={styles.presets}>{PRESETS.map(preset => <button key={preset.name} onClick={() => {
          this.changePattern(validatePattern({...preset.pattern, kit: pattern.kit})); this.setState({selectedName: "", name: `${preset.name} variation`, message: ""})
        }}>{preset.name}<small>{preset.pattern.timeSignature} · {preset.pattern.bpm} BPM</small></button>)}</div>
      </section>
    </main>
  }
}
