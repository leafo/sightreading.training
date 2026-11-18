import * as React from "react"
import {Link} from "react-router-dom"
import {getBeginnerSong} from "st/beginner_songs"
import {transposeSong, playAlongState, displayedChords, MIN_TRANSPOSE, MAX_TRANSPOSE} from "st/play_along"
import {readToolState, persistToolPage} from "st/tool_preferences"
import Toast from "st/components/toast"

import Keyboard from "st/components/keyboard"
import StaffSongNotes from "st/components/staff_song_notes"
import staffStyles from "st/components/staff.module.css"
import Slider from "st/components/slider"
import sliderStyles from "st/components/slider.module.css"
import PositionField from "st/components/position_field"
import Hotkeys from "st/components/hotkeys"
import Draggable from "st/components/draggable"
import styles from "./play_along_page.module.css"

import Lightbox from "st/components/lightbox"
import SongEditor from "st/components/song_editor"

import SongParser from "st/song_parser"
import SongTimer from "st/song_timer"
import {KeySignature, noteName, parseNote} from "st/music"
import {MidiInput} from "st/midi"

import {dispatch, trigger} from "st/events"
import {STAVES} from "st/data"
import NoteStats from "st/note_stats"

import {setTitle} from "st/globals"
import classNames from "classnames"
import settingsPanelStyles from "st/components/settings_panel.module.css"

import {IconRewind} from "st/components/icons"

import * as types from "prop-types"

import {AutoChords} from "st/auto_chords"
import {TransitionGroup, CSSTransition} from "react-transition-group"

import {getSession} from "st/app"

import {useParams} from "react-router-dom"

const TimeBar = <div className={staffStyles.time_bar}></div>
const EmptySong = []

class SettingsPanel extends React.Component {
  static propTypes = {
    autoChordType: types.number.isRequired,
  }

  constructor(props) {
    super(props)
    this.setMinChordSpacing = (value) => trigger(this, "setMinChordSpacing", value)
    this.setAutochordsRate = (value) => trigger(this, "setAutochordsRate", value)
  }

  render() {
    let chordMinSpacing = this.props.chordMinSpacing || 0
    let autochordsRate = this.props.autochordsRate || 1

    return <section className={settingsPanelStyles.settings_panel}>
      <div className={settingsPanelStyles.settings_header}>
        <h3>Settings</h3>
        <button onClick={this.props.close}>Close</button>
      </div>

      <section className={settingsPanelStyles.settings_group}>
        <h4>Autochords</h4>
        <label className={styles.settings_label}>
          <div className={styles.input_label}>Note spacing</div>
          <div className={styles.slider_row}>
            <Slider
              min={-5}
              max={10}
              onChange={this.setMinChordSpacing}
              value={chordMinSpacing} />
            <span className={styles.current_value}>{chordMinSpacing}</span>
          </div>
        </label>

        <label className={styles.settings_label}>
          <div className={styles.input_label}>Multiplier</div>
          <div className={styles.slider_row}>
            <Slider
              min={1}
              max={4}
              onChange={this.setAutochordsRate}
              value={autochordsRate} />
            <span className={styles.current_value}>{autochordsRate}</span>
          </div>
        </label>

        {this.renderAutochords()}
      </section>
    </section>
  }

  renderAutochords() {
    return <div className={settingsPanelStyles.button_group}>
      {
        AutoChords.allGenerators.map((type, idx) => {
          let name = type.displayName

          return <button
            onClick={(e) => trigger(this, "setAutochords", idx)}
            className={classNames(settingsPanelStyles.toggle_option, {
              [settingsPanelStyles.active]: idx == this.props.autoChordType
            })}
            key={name}>
              {name}
            </button>
        })
      }
    </div>
  }
}

export class PlayAlongPage extends React.Component {
  constructor(props) {
    super(props)

    this.songEditorRef = React.createRef()

    this.state = {
      ...readToolState("play-along", playAlongState),
      heldNotes: {}, // notes by name, for the keyboard
      heldSongNotes: {},
      bpm: 60,
      pixelsPerBeat: StaffSongNotes.defaultPixelsPerBeat,
      loopLeft: 0,
      loopRight: 0,
      playNotes: true,
      metronomeMultiplier: 1.0,
      autoChordType: 0,
      enableEditor: this.props.editorOpen || false,
      enablePauseOnMiss: false,
      enabledTracks: {},
      metronome: props.midiOutput ? props.midiOutput.getMetronome() : null
    }

    const session = getSession()
    this.stats = new NoteStats(session.currentUser)

    this.resetHitNotes()

    this.midiInput = new MidiInput({
      sustainPedalEnabled: true,
      noteOn: (note) => this.pressNote(note),
      noteOff: (note) => this.releaseNote(note)
    })

    this.pressNote = this.pressNote.bind(this)
    this.releaseNote = this.releaseNote.bind(this)
    this.seekBpm = (pos) => this.state.songTimer.seek(pos)

    this.keyMap = {
      " ": e => this.togglePlay(),
      "esc": e => {
        if (!this.state.songTimer) return

        if (this.state.songTimer.running) {
          this.state.songTimer.pause()
        } else {
          this.state.songTimer.reset(this.state.loopLeft || 0)
        }
      },

      "left": e => {
        if (!this.state.songTimer) return
        this.state.songTimer.scrub(-1)
      },
      "right": e => {
        if (!this.state.songTimer) return
        this.state.songTimer.scrub(1)
      },
    }
  }

  resetHitNotes() {
    this.hitNotes = new Set
  }

  getSetter(name) {
    if (!this.setters) {
      this.setters = {}
    }

    if (!this.setters[name]) {
      this.setters[name] = (val) => this.setState({ [name]: val })
    }

    return this.setters[name]
  }

  getToggler(name) {
    if (!this.setters) {
      this.setters = {}
    }

    if (!this.setters[name]) {
      this.setters[name] = (e) =>
        this.setState({ [name]: e.target.checked })
    }

    return this.setters[name]
  }

  songParserParams() {
    let autoChordIdx = this.state.autoChordType % AutoChords.allGenerators.length

    return {
      autoChords: AutoChords.allGenerators[autoChordIdx],
      autoChordsSettings: {
        chordMinSpacing: this.state.chordMinSpacing,
        rate: this.state.autochordsRate,
      }
    }
  }

  // re-render the song with new autochords
  refreshSong() {
    let code = this.state.currentSongCode
    try {
      const sourceSong = SongParser.load(code, this.songParserParams())
      this.setSong(transposeSong(sourceSong, this.state.transpose), {sourceSong})
    } catch(e) {
      this.setState({
        songError: e.message
      })
      return
    }
  }

  loadSong() {
    if (this.state.loading) {
      return
    }

    if (this.props.params.preset_id) {
      const preset = getBeginnerSong(this.props.params.preset_id)
      if (!preset) {
        this.setState({songError: "Beginner song not found", loading: false})
        return
      }
      this.setState({preset, bpm: preset.bpm, currentSongCode: preset.song,
        songModel: {title: preset.title}})
      return
    }

    this.setState({loading: true})
    let request = new XMLHttpRequest()

    let songId = this.props.params.song_id

    if (!songId) {
      console.error("no song id to load")
    }

    request.open("GET", `/songs/${songId}.json`)
    request.onload = (e) => {
      try {
        let res = JSON.parse(request.responseText)
        this.setState({
          songModel: res.song,
          currentSongCode: res.song.song,
        })

        this.stats.setTimerUrl(`/songs/${res.song.id}/stats.json`)
      } catch (e) {
        this.setState({
          songError: "Failed to fetch song"
        })
      }
    }

    request.send()
  }

  changeTranspose = value => {
    const transpose = Number(value)
    try {
      const sourceSong = SongParser.load(this.state.currentSongCode, this.songParserParams())
      const song = transposeSong(sourceSong, transpose)
      this.setSong(song, {sourceSong, transpose, preserveLoop: true})
    } catch (error) {
      this.setState({transposeError: error.message})
    }
  }

  setSong(song, {sourceSong = song, transpose = this.state.transpose, preserveLoop = false} = {}) {
    if (this.state.preset) {
      song.getTrack(0).trackName = "Melody"
      song.getTrack(1).trackName = "Chords"
    }
    let currentBeat = this.currentBeat

    if (this.state.songTimer) {
      this.state.songTimer.reset()
    }

    // Stop the old pitches before installing new note objects or clearing input.
    Object.keys(this.state.heldNotes).forEach(note => this.props.midiOutput?.noteOff(parseNote(note), 100))
    this.midiInput.heldNotes = {}
    this.midiInput.sustainPedalOn = false
    this.resetHitNotes()
    const stop = song.getStopInBeats()
    this.setState({
      loading: false,
      songError: null,
      transposeError: null,
      song, sourceSong, transpose,
      heldNotes: {}, heldSongNotes: {},
      loopLeft: preserveLoop ? Math.min(this.state.loopLeft, stop) : 0,
      loopRight: preserveLoop ? Math.min(this.state.loopRight, stop) : stop,

      songTimer: new SongTimer({
        onUpdate: this.updateBeat.bind(this),
        onNoteStart: this.onNoteStart.bind(this),
        onNoteStop: this.onNoteStop.bind(this),
        song
      })
    }, () => {
      // restore our position in the song (temporary while we edit)
      const beat = Math.min(currentBeat || 0, stop)
      this.state.songTimer.beat = beat
      this.updateBeat(beat)
    })
  }

  onNoteStart(note) {
    let noteStart = note.getStart()
    if (noteStart >= this.state.loopRight) {
      return
    }

    if (noteStart < this.state.loopLeft) {
      return
    }

    if (this.state.playNotes && this.props.midiOutput) {
      this.props.midiOutput.noteOn(parseNote(note.note), 100)
    }

    if (this.state.enablePauseOnMiss) {
      let currentSong = this.state.song
      if (!this.hitNotes.has(note)) {
        window.setTimeout(() => {
          if (this.state.song != currentSong) {
            return
          }

          if (!this.state.songTimer.running) {
            return
          }

          if (this.hitNotes.has(note)) {
            return
          }

          if (noteStart > this.currentBeat) {
            return
          }

          this.state.songTimer.pause()
          this.state.songTimer.seek(noteStart)
        }, 100)
      }
    }
  }

  onNoteStop(note) {
    if (this.state.playNotes && this.props.midiOutput) {
      this.props.midiOutput.noteOff(parseNote(note.note), 100)
    }
  }

  componentDidMount() {
    setTitle("Play along")
    this.updateBeat(0)
    if (!this.props.newSong) {
      this.loadSong()
    }

    dispatch(this, {
      setMinChordSpacing: (e, value) => {
        this.setState({
          chordMinSpacing: value
        }, () => this.refreshSong())
      },
      setAutochordsRate: (e, value) => {
        this.setState(
          {autochordsRate: value},
          () => this.refreshSong()
        )
      },
      setAutochords: (e, t) => {
        this.setState(
          {autoChordType: t},
          () => this.refreshSong()
        )
      }
    })
  }

  componentWillUnmount() {
    if (this.state.songTimer) {
      this.state.songTimer.reset()
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.midiOutput != this.props.midiOutput) {
      this.setState({
        metronome: nextProps.midiOutput ?
          nextProps.midiOutput.getMetronome() : null
      })
    }
  }

  componentDidUpdate(prevProps, prevState) {
    persistToolPage(this, "play-along", playAlongState, prevState)
    if (prevState.bpm != this.state.bpm) {
      if (this.state.songTimer) {
        this.state.songTimer.setBpm(this.state.bpm)
      }
    }


    if (prevState.currentSongCode != this.state.currentSongCode) {
      this.refreshSong()
    }
  }

  updateBeat(beat) {
    if (this.state.song) {
      if (beat > this.state.loopRight) {
        this.resetHitNotes()
        this.state.songTimer.seek(this.state.loopLeft)
      }

      if (this.trackRefs) {
        this.trackRefs.forEach(r => {
          if (r.current) {
            r.current.setOffset(-beat * this.state.pixelsPerBeat + 100)
          }
        })
      }

      if (this.refs.staff) {
        // if the staff isn't on the page yet then it will render with correct
        // default?
        this.refs.staff.setOffset(-beat * this.state.pixelsPerBeat + 100)
      }
    }


    if (this.state.metronome) {
      let mm = this.state.metronomeMultiplier
      let beatsMeasure = 4
      if (this.state.song && this.state.song.metadata.beatsPerMeasure) {
        beatsMeasure = this.state.song.metadata.beatsPerMeasure
      }

      if ("currentBeat" in this) {
        if (Math.floor(this.currentBeat * mm) < Math.floor(beat * mm)) {
          let m = Math.floor(beat * mm)
          if (m % beatsMeasure == 0) {
            this.state.metronome.tick()
          } else {
            this.state.metronome.tock()
          }
        }
      }
    }

    this.currentBeat = beat
    this.refs.currentBeatField?.setState({ value: beat })
  }

  getTrackRef(idx) {
    if (!this.trackRefs) {
      this.trackRefs = []
    }

    if (!this.trackRefs[idx]) {
      this.trackRefs[idx] = React.createRef()
    }

    return this.trackRefs[idx]
  }

  renderTracks() {
    if (!this.state.song) {
      return null
    }

    let keySignature = KeySignature.forCount(0)

    if (this.state.song && this.state.song.metadata) {
      keySignature = KeySignature.forCount(this.state.song.metadata.keySignature)
    }

    let renderedTracks = this.state.song.tracks.filter(t => !!t).map((track, idx) => {
      let staff = track.fittingStaff()
      let staffType = STAVES.find(s => s.name == staff)

      if (!staffType) {
        return
      }

      if (this.state.enabledTracks[idx] == false) {
        return
      }

      let staffProps = {
        ref: this.getTrackRef(idx),
        key: `track-${idx}`,
        metadata: this.state.song.metadata,
        notes: track,
        heldNotes: this.state.heldSongNotes,
        keySignature,
        pixelsPerBeat: this.state.pixelsPerBeat,
        children: TimeBar,
        loopLeft: this.state.loopLeft,
        loopRight: this.state.loopRight,
      }

      return staffType.render.call(this, staffProps)
    })

    if (!renderedTracks.find(t => !!t)) {
      return <div className={styles.empty_tracks}>No tracks to display</div>
    }

    return <Draggable
      className={styles.draggable}
      onDrag={(dx, dy) => {
        this.state.songTimer.scrub(-dx / this.state.pixelsPerBeat)
      }}
    >
      {renderedTracks}
    </Draggable>
  }

  render() {
    let keySignature = KeySignature.forCount(0)

    if (this.state.song && this.state.song.metadata) {
      keySignature = KeySignature.forCount(this.state.song.metadata.keySignature)
    }

    let songError = null

    if (this.state.songError) {
      songError = <div className={styles.song_error}>
        <div>
          <strong>There was an error loading the song: </strong>
          {this.state.songError}
        </div>
      </div>
    }

    let renderedTracks = this.renderTracks()

    return <div className={classNames(styles.play_along_page, { [styles.has_song]: !!renderedTracks })}>
      <TransitionGroup>
        {this.renderSettings()}
      </TransitionGroup>

      <div className={classNames(styles.play_along_workspace, { [styles.settings_open]: this.state.settingsPanelOpen })}>
        {this.state.songModel ? <h2>{this.state.songModel.title}</h2> : null}
        {this.state.preset ? <section>
          <Link to="/play-along">Back to songs</Link>
          <p>{this.state.preset.description}</p>
          <p>Chords (one per measure): {displayedChords(this.state.preset.chords, this.state.transpose, this.state.song?.metadata.keySignature || 0).join(" · ")}</p>
        </section> : null}
        {this.state.currentSongCode && <div className={styles.pitch_controls}>
          <label>Transpose (half steps)
            <select value={this.state.transpose} onChange={event => this.changeTranspose(event.target.value)}>
              {Array.from({length: MAX_TRANSPOSE - MIN_TRANSPOSE + 1}, (_, index) => index + MIN_TRANSPOSE).map(value =>
                <option key={value} value={value}>{value === 0 ? "0 · Original pitch" : `${value > 0 ? "+" : ""}${value}`}</option>)}
            </select>
          </label>
          {this.state.song && <span>Key signature: {keySignature.name()}</span>}
          <small>Changing pitch pauses playback. The editor keeps the original notes.</small>
          {this.state.transposeError && <span role="alert">{this.state.transposeError}</span>}
        </div>}
        {this.renderSongTrackTools()}
        <div className={classNames(staffStyles.staff_wrapper, styles.staff_wrapper)}>
          {songError}
          {renderedTracks}
          {this.renderTransportControls()}
        </div>
        {this.state.enableEditor ? this.renderEditor() : this.renderKeyboard()}
      </div>
      <Hotkeys keyMap={this.keyMap} />
      <Toast message={this.state.storageWarning} onDismiss={() => this.setState({storageWarning: null})} />
    </div>
  }

  renderSongTrackTools() {
    if (!this.state.song || !this.state.song.tracks) {
      return
    }

    let tracks = this.state.song.tracks.filter(t => !!t)

    if (tracks.length <= 1) {
      return
    }

    return <ul className={styles.song_tracks}>
      {tracks.map((t, idx) => {
        let title = `Track ${idx + 1}`
        if (t.trackName) {
          title = t.trackName
        }

        let trackEnabled = this.state.enabledTracks[idx]
        if (trackEnabled == undefined) {
          trackEnabled = true
        }

        return <li key={idx}>
          <label>
            <input checked={trackEnabled} type="checkbox" onChange={e => {
              this.setState({
                enabledTracks: Object.assign({}, this.state.enabledTracks, {
                  [idx]: e.target.checked
                })
              })
            }}/>
            {" "}
            {title}
          </label>
        </li>
      })}
    </ul>
  }

  renderSettings() {
    if (!this.state.settingsPanelOpen) {
      return
    }

    return <CSSTransition classNames="slide_right" timeout={{ enter: 200, exit: 100 }}>
      <SettingsPanel
        autoChordType={this.state.autoChordType}
        chordMinSpacing={this.state.chordMinSpacing}
        autochordsRate={this.state.autochordsRate}
        close={() => this.setState({
          settingsPanelOpen: !this.state.settingsPanelOpen
        }) } />
    </CSSTransition>
  }

  togglePlay() {
    if (!this.state.songTimer) { return }

    if (this.state.songTimer.running) {
      this.state.songTimer.pause()
    } else {
      this.resetHitNotes()
      this.state.songTimer.start(this.state.bpm)
    }

    this.forceUpdate()
  }

  pressNote(note) {
    if (!this.state.song) return

    if (this.songEditorRef.current) {
      this.songEditorRef.current.pressNote(note)
      return
    }

    if (!this.state.songTimer.running) {
      this.resetHitNotes()
      this.state.songTimer.start(this.state.bpm)
    }

    let songNoteIdx = this.state.song.matchNoteFast(note, this.currentBeat, this.state.loopRight, this.state.loopLeft)
    let songNote = this.state.song[songNoteIdx]

    let recordHit = false

    if (songNote) {
      let accuracy = this.state.songTimer.beatsToSeconds(this.currentBeat - songNote.start)
      if (Math.abs(accuracy) < 1 && !this.hitNotes.has(songNote)) {
        this.hitNotes.add(songNote)
        recordHit = true
      }
    }

    if (recordHit) {
      this.stats.hitNotes([songNote.note])
    } else {
      if (songNote) {
        this.stats.missNotes([songNote.note])
      } else {
        this.stats.missNotes([])
      }
    }

    let heldNotes = { ...this.state.heldNotes, [note]: { songNote } }
    let heldSongNotes = this.state.heldSongNotes

    if (songNote) {
      heldSongNotes = {...heldSongNotes, [songNote.id]: songNote}
    }

    this.setState({ heldNotes, heldSongNotes })
  }

  releaseNote(note) {
    let held = this.state.heldNotes[note]
    if (!held) return // song changed between press/relese

    let heldNotes = {...this.state.heldNotes}
    delete heldNotes[note]

    let heldSongNotes = this.state.heldSongNotes
    if (held.songNote) {
      heldSongNotes = {...heldSongNotes}
      delete heldSongNotes[held.songNote.id]
    }

    this.setState({ heldNotes, heldSongNotes })
  }

  onMidiMessage(message) {
    this.midiInput.onMidiMessage(message)
  }

  renderKeyboard() {
    const range = this.state.song?.noteRange()
    const lower = range ? Math.floor(parseNote(range[0]) / 12) * 12 : 48
    const upper = range ? Math.min(127, Math.max(lower + 35, Math.ceil((parseNote(range[1]) + 1) / 12) * 12 - 1)) : 84
    return <Keyboard
      key={this.state.transpose}
      lower={lower}
      upper={upper}
      className={styles.keyboard}
      midiOutput={this.props.midiOutput}
      heldNotes={this.state.heldNotes}
      onKeyDown={this.pressNote}
      onKeyUp={this.releaseNote}
    />
  }

  renderEditor() {
    return <SongEditor
      parserParams={this.songParserParams()}
      ref={this.songEditorRef}
      songNotes={this.state.sourceSong || this.state.song}
      song={this.state.preset ? null : this.state.songModel}
      code={this.state.currentSongCode}
      onCode={code => this.setState({
        currentSongCode: code
      }) } />
  }

  renderTransportControls() {
    let stop = 0
    if (this.state.song) {
      stop = this.state.song.getStopInBeats()
    }

    return <div className={styles.transport_controls}>
      {
        this.state.songTimer ?
        <button
          type="button"
          title="Rewind to beginning"
          onClick={e => {
            if (this.state.songTimer.running) {
              this.state.songTimer.pause()
            } else {
              this.state.songTimer.reset(this.state.loopLeft || 0)
            }
          }}
        ><IconRewind width={15} /></button> :
        null
      }

      {
        this.state.songTimer
        ? <button className={styles.play_pause} type="button" onClick={e => this.togglePlay()}>
            {this.state.songTimer.running ? "Pause" : "Play"}
          </button>
        : null
      }

      <PositionField ref="currentBeatField"
        min={0}
        max={stop}
        value={this.currentBeat}
        onUpdate={this.seekBpm}
        title="Play position (in beats)"
      />

      <input
        checked={this.state.enablePauseOnMiss || false}
        onChange={this.getToggler("enablePauseOnMiss")}
        title="Automatically pause on miss"
        type="checkbox" />

      <span className={styles.loop_controls}>
        <span className={styles.label_text}>
          Loop
        </span>

        <PositionField ref="loopLeft"
          min={0}
          max={this.state.loopRight}
          resetValue={0}
          value={this.state.loopLeft}
          title="Loop left"
          onUpdate={this.getSetter("loopLeft")}
        />

        <PositionField ref="loopRight"
          min={this.state.loopLeft}
          max={stop}
          resetValue={stop}
          value={this.state.loopRight}
          title="Loop right"
          onUpdate={this.getSetter("loopRight")}
        />
      </span>

      <div className={styles.spacer}></div>

      <PositionField
        min={1}
        max={10}
        title="Metronome multiplier"
        value={this.state.metronomeMultiplier}
        onUpdate={this.getSetter("metronomeMultiplier")}
      />

      <input
        checked={this.state.playNotes || false}
        onChange={(e) => {
          this.state.songTimer.clearPlayingNotes()
          this.getToggler("playNotes")(e)
        }}
        title="Play notes to MIDI output"
        type="checkbox" />

      <button onClick={e =>
        this.setState({
          enableEditor: !this.state.enableEditor
        })
      }>Editor</button>

      <button onClick={e =>
        this.setState({
          settingsPanelOpen: !this.state.settingsPanelOpen
        })
      }>Settings</button>

      <span className={classNames(sliderStyles.slider_input, styles.transport_slider)}>
        <span className={sliderStyles.slider_label} title="Beats per minute (how fast the songs plays)">BPM</span>
        <Slider
          min={10}
          max={300}
          onChange={this.getSetter("bpm")}
          value={+this.state.bpm} />
        <span className={sliderStyles.slider_value}>{ this.state.bpm }</span>
      </span>

      <span className={classNames(sliderStyles.slider_input, styles.transport_slider)}>
        <span className={sliderStyles.slider_label} title="Pixels per beat (how spaced out the notes are)">PPB</span>
        <Slider
          min={50}
          max={300}
          onChange={this.getSetter("pixelsPerBeat")}
          value={+this.state.pixelsPerBeat} />
        <span className={sliderStyles.slider_value}>{this.state.pixelsPerBeat}</span>
      </span>
    </div>
  }

  midiOutputs() {
    if (!this.props.midi) return []
    return [...this.props.midi.outputs.values()]
  }
}

export const PlayAlongPageWithParams = React.forwardRef((props, ref) => {
  const params = useParams()
  return <PlayAlongPage key={params.preset_id || params.song_id || "new"} {...props} params={params} ref={ref} />
})
