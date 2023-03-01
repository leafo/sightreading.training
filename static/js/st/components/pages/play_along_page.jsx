import * as React from "react"

import Keyboard from "st/components/keyboard"
import StaffSongNotes from "st/components/staff_song_notes"
import Slider from "st/components/slider"
import PositionField from "st/components/position_field"
import Hotkeys from "st/components/hotkeys"
import Draggable from "st/components/draggable"

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

import {IconRewind} from "st/components/icons"

import * as types from "prop-types"

import {AutoChords} from "st/auto_chords"
import {TransitionGroup, CSSTransition} from "react-transition-group"

import {getSession} from "st/app"

import {useParams} from "react-router-dom"

const TimeBar = <div className="time_bar"></div>
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

    return <section className="settings_panel">
      <div className="settings_header">
        <h3>Settings</h3>
        <button onClick={this.props.close}>Close</button>
      </div>

      <section className="settings_group">
        <h4>Autochords</h4>
        <label>
          <div className="input_label">Note spacing</div>
          <div className="slider_row">
            <Slider
              min={-5}
              max={10}
              onChange={this.setMinChordSpacing}
              value={chordMinSpacing} />
            <span className="current_value">{chordMinSpacing}</span>
          </div>
        </label>

        <label>
          <div className="input_label">Multiplier</div>
          <div className="slider_row">
            <Slider
              min={1}
              max={4}
              onChange={this.setAutochordsRate}
              value={autochordsRate} />
            <span className="current_value">{autochordsRate}</span>
          </div>
        </label>

        {this.renderAutochords()}
      </section>
    </section>
  }

  renderAutochords() {
    return <div className="button_group">
      {
        AutoChords.allGenerators.map((type, idx) => {
          let name = type.displayName

          return <button
            onClick={(e) => trigger(this, "setAutochords", idx)}
            className={classNames("toggle_option", {
              active: idx == this.props.autoChordType
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
      let song = SongParser.load(code, this.songParserParams())
      this.setSong(song)
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

  setSong(song) {
    let currentBeat = this.currentBeat

    if (this.state.songTimer) {
      this.state.songTimer.reset()
    }

    this.setState({
      loading: false,
      songError: null,
      song,
      loopLeft: 0,
      loopRight: song.getStopInBeats(),

      songTimer: new SongTimer({
        onUpdate: this.updateBeat.bind(this),
        onNoteStart: this.onNoteStart.bind(this),
        onNoteStop: this.onNoteStop.bind(this),
        song
      })
    }, () => {
      // restore our position in the song (temporary while we edit)
      this.state.songTimer.beat = currentBeat || 0
      this.updateBeat(currentBeat || 0)
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
    this.refs.currentBeatField.setState({ value: beat })
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
      return <div className="empty_tracks">No tracks to display</div>
    }

    return <Draggable
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
      songError = <div className="song_error">
        <div>
          <strong>There was an error loading the song: </strong>
          {this.state.songError}
        </div>
      </div>
    }

    let renderedTracks = this.renderTracks()

    return <div className={classNames("play_along_page", { has_song: !!renderedTracks })}>
      <TransitionGroup>
        {this.renderSettings()}
      </TransitionGroup>

      <div className={classNames("play_along_workspace", {settings_open: this.state.settingsPanelOpen})}>
        {this.state.songModel ? <h2>{this.state.songModel.title}</h2> : null}
        {this.renderSongTrackTools()}
        <div className="staff_wrapper">
          {songError}
          {renderedTracks}
          {this.renderTransportControls()}
        </div>
        {this.state.enableEditor ? this.renderEditor() : this.renderKeyboard()}
      </div>
      <Hotkeys keyMap={this.keyMap} />
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

    return <ul className="song_tracks">
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
    return <Keyboard
      lower={"C4"}
      upper={"C7"}
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
      songNotes={this.state.song}
      song={this.state.songModel}
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

    return <div className="transport_controls">
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
        ? <button className="play_pause"type="button" onClick={e => this.togglePlay()}>
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

      <span className="loop_controls">
        <span className="label_text">
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

      <div className="spacer"></div>

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

      <span className="slider_input transport_slider">
        <span className="slider_label" title="Beats per minute (how fast the songs plays)">BPM</span>
        <Slider
          min={10}
          max={300}
          onChange={this.getSetter("bpm")}
          value={+this.state.bpm} />
        <span className="slider_value">{ this.state.bpm }</span>
      </span>

      <span className="slider_input transport_slider">
        <span className="slider_label" title="Pixels per beat (how spaced out the notes are)">PPB</span>
        <Slider
          min={50}
          max={300}
          onChange={this.getSetter("pixelsPerBeat")}
          value={+this.state.pixelsPerBeat} />
        <span className="slider_value">{this.state.pixelsPerBeat}</span>
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
  return <PlayAlongPage {...props} params={params} ref={ref} />
})

