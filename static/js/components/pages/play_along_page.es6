import * as React from "react"

import Keyboard from "st/components/keyboard"
import StaffSongNotes from "st/components/staff_song_notes"
import Slider from "st/components/slider"
import PositionField from "st/components/position_field"
import Hotkeys from "st/components/hotkeys"
import Draggable from "st/components/draggable"

import Lightbox from "st/components/lightbox"
import MidiInstrumentPicker from "st/components/midi_instrument_picker"

import SongParser from "st/song_parser"
import SongTimer from "st/song_timer"
import {KeySignature, noteName, parseNote} from "st/music"
import {MidiInput} from "st/midi"

import {dispatch, trigger} from "st/events"
import {STAVES} from "st/data"
import {GStaff} from "st/components/staves"
import SongEditor from "st/components/song_editor"

import {classNames} from "lib"

let {PropTypes: types} = React

const DEFAULT_SONG = "old_dan_tucker"

import {AutoChords} from "st/auto_chords"

let {CSSTransitionGroup} = React.addons || {}

class SettingsPanel extends React.Component {
  static propTypes = {
    autoChordType: types.number.isRequired,
  }

  constructor(props) {
    super(props)
  }

  render() {
    return <section className="settings_panel">
      <div className="settings_header">
        <button onClick={this.props.close}>Close</button>
        <h3>Settings</h3>
      </div>
      <section className="settings_group">
        <h4>Song Editor</h4>
      </section>
      <section className="settings_group">
        <h4>Autochords</h4>
        {this.renderAutochords()}
      </section>
    </section>
  }

  renderAutochords() {
    return AutoChords.allGenerators.map((type, idx) => {
      let name = type.name

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

}

export default class PlayAlongPage extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      heldNotes: {},
      bpm: 60,
      pixelsPerBeat: StaffSongNotes.defaultPixelsPerBeat,
      loopLeft: 0,
      loopRight: 0,
      playNotes: true,
      metronomeMultiplier: 1.0,
      autoChordType: 0,
      enableEditor: false,
    }

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
          this.state.songTimer.reset()
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

  getSetter(name) {
    if (!this.setters) {
      this.setters = {}
    }

    if (!this.setters[name]) {
      this.setters[name] = (val) => this.setState({ [name]: val })
    }

    return this.setters[name]
  }

  loadSong(name) {
    if (this.state.loading) {
      return
    }

    this.setState({loading: true})
    var request = new XMLHttpRequest()

    request.open("GET", `/static/music/${name}.lml?${+new Date()}`)
    request.send()
    request.onload = (e) => {
      let songText = request.responseText

      let autoChordIdx = this.state.autoChordType % AutoChords.allGenerators.length

      let song = SongParser.load(songText, {
        autoChords: AutoChords.allGenerators[autoChordIdx],
      })

      this.setState({
        currentSongName: name,
      })

      this.setSong(song)
    }
  }

  setSong(song) {
    let currentBeat = this.currentBeat

    if (this.state.songTimer) {
      this.state.songTimer.reset()
    }

    this.setState({
      loading: false,
      staffType: song.fittingStaff(),
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
    if (!this.state.playNotes) {
      return
    }

    if (this.state.midiChannel) {
      this.state.midiChannel.noteOn(parseNote(note.note), 100)
    }
  }

  onNoteStop(note) {
    if (!this.state.playNotes) {
      return
    }

    if (this.state.midiChannel) {
      this.state.midiChannel.noteOff(parseNote(note.note), 100)
    }
  }

  componentDidMount() {
    this.updateBeat(0)
    this.loadSong(DEFAULT_SONG)
    dispatch(this, {
      setAutochords: (e, t) => {
        this.setState({autoChordType: t})
      }
    })
  }

  componentWillUnmount() {
    if (this.state.songTimer) {
      this.state.songTimer.reset()
    }
  }

  componentDidUpdate(prepProps, prevState) {
    if (prevState.bpm != this.state.bpm) {
      if (this.state.songTimer) {
        this.state.songTimer.setBpm(this.state.bpm)
      }
    }
  }

  updateBeat(beat) {
    if (this.state.song) {
      if (beat > this.state.loopRight) {
        this.state.songTimer.seek(this.state.loopLeft)
      }

      this.refs.staff.setOffset(-beat * this.state.pixelsPerBeat + 100)
    }


    if (this.state.metronome) {
      let mm = this.state.metronomeMultiplier
      let beatsMeasure = this.state.song.metadata.beatsPerMeasure || 4

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

  render() {
    let heldNotes = {}
    let keySignature = new KeySignature(0)

    if (this.state.song && this.state.song.metadata) {
      keySignature = new KeySignature(this.state.song.metadata.keySignature)
    }

    let staff = null
    let staffType = STAVES.find(s => s.name == this.state.staffType)

    if (staffType) {
      let staffProps = {
        ref: "staff",
        notes: this.state.song || [],
        heldNotes,
        keySignature,
        pixelsPerBeat: this.state.pixelsPerBeat,
        children: <div className="time_bar"></div>
      }

      staff = <Draggable
        onDrag={(dx, dy) => {
          this.state.songTimer.scrub(-dx / this.state.pixelsPerBeat)
        }}
      >
        {staffType.render.call(this, staffProps)}
      </Draggable>
    }

    return <div className="play_along_page">
      <CSSTransitionGroup transitionName="slide_right" transitionEnterTimeout={200} transitionLeaveTimeout={100}>
        {this.renderSettings()}
      </CSSTransitionGroup>

      <div className={classNames("play_along_workspace", {settings_open: this.state.settingsPanelOpen})}>
        <div className="staff_wrapper">
          {staff}
          {this.renderTransportControls()}
        </div>
        {this.state.enableEditor ? this.renderEditor() : this.renderKeyboard()}
      </div>
      <Hotkeys keyMap={this.keyMap} />
    </div>
  }

  renderSettings() {
    if (!this.state.settingsPanelOpen) {
      return
    }

    return <SettingsPanel
      autoChordType={this.state.autoChordType}
      close={() => this.setState({
        settingsPanelOpen: !this.state.settingsPanelOpen
      }) } />
  }

  togglePlay() {
    if (!this.state.songTimer) { return }

    if (this.state.songTimer.running) {
      this.state.songTimer.pause()
    } else {
      this.state.songTimer.start(this.state.bpm)
    }

    this.forceUpdate()
  }

  pressNote(note) {
    if (!this.state.song) return

    if (!this.state.songTimer.running) {
      this.state.songTimer.start(this.state.bpm)
    }

    let songNote = this.state.song.matchNote(note, this.currentBeat)

    if (songNote) {
      songNote.held = true
      let accuracy = this.state.songTimer.beatsToSeconds(this.currentBeat - songNote.start)
    }

    let heldNotes = {
      ...this.state.heldNotes,
      [note]: { songNote }
    }

    this.setState({ heldNotes })
  }

  releaseNote(note) {
    let held = this.state.heldNotes[note]
    let songNote = held.songNote

    if (songNote) {
      songNote.held = false
    }

    let heldNotes = {...this.state.heldNotes}
    delete heldNotes[note]

    this.setState({ heldNotes })
  }

  onMidiMessage(message) {
    this.midiInput.onMidiMessage(message)
  }

  renderKeyboard() {
    return <Keyboard
      lower={"C4"}
      upper={"C7"}
      heldNotes={this.state.heldNotes}
      onKeyDown={this.pressNote}
      onKeyUp={this.releaseNote}
    />
  }

  renderEditor() {
    return <SongEditor onSong={
      song => {
        this.setSong(song)
      }
    } />
  }

  renderTransportControls() {
    let stop = 0
    if (this.state.song) {
      stop = this.state.song.getStopInBeats()
    }

    return <div className="transport_controls">
      {
        this.state.songTimer
        ? <button onClick={e => this.togglePlay()}>
            {this.state.songTimer.running ? "Pause" : "Play"}
          </button>
        : null
      }

      <PositionField ref="currentBeatField"
        min={0}
        max={stop}
        value={this.currentBeat}
        onUpdate={this.seekBpm}
      />

      <span className="loop_controls">
        <span className="label_text">
          Loop
        </span>

        <PositionField ref="loopLeft"
          min={0}
          max={this.state.loopRight}
          resetValue={0}
          value={this.state.loopLeft}
          onUpdate={this.getSetter("loopLeft")}
        />

        <PositionField ref="loopRight"
          min={this.state.loopLeft}
          max={stop}
          resetValue={stop}
          value={this.state.loopRight}
          onUpdate={this.getSetter("loopRight")}
        />
      </span>

      <div className="spacer"></div>

      <PositionField
        min={1}
        max={10}
        value={this.state.metronomeMultiplier}
        onUpdate={this.getSetter("metronomeMultiplier")}
      />

      <input
        checked={this.state.playNotes || false}
        onChange={(e) => this.setState({playNotes: e.target.checked}) }
        type="checkbox" />

      <button onClick={e =>
        this.setState({
          enableEditor: !this.state.enableEditor
        })
      }>Toggle</button>

      <button onClick={e =>
        this.setState({
          settingsPanelOpen: !this.state.settingsPanelOpen
        })
        // this.setState({
        //   autoChordType: this.state.autoChordType + 1
        // }, () => this.loadSong(this.state.currentSongName))
      }>Debug</button>

      <button onClick={e =>
        trigger(this, "showLightbox", this.renderSongPicker())
      }>Pick Song</button>

      <button onClick={e => {
        trigger(this, "showLightbox", <Lightbox>
          <p>Choose instrument to play song to</p>
          <MidiInstrumentPicker
            midi={this.props.midi}
            onPick={midiChannel => {
              this.setState({
                metronome: midiChannel.getMetronome(),
                midiChannel})
              trigger(this, "closeLightbox")
            }}
          />
        </Lightbox>)
      }}>
        {
          this.state.midiChannel
          ? `Channel ${this.state.midiChannel.channel + 1}`
          : "Select output"
        }
      </button>

      <span className="slider_input transport_slider">
        <span className="slider_label">BPM</span>
        <Slider
          min={10}
          max={300}
          onChange={this.getSetter("bpm")}
          value={+this.state.bpm} />
        <span className="slider_value">{ this.state.bpm }</span>
      </span>

      <span className="slider_input transport_slider">
        <span className="slider_label">PPB</span>
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

  renderSongPicker() {
    let songs = [
      "bartok_1",
      "bartok_2",
      "bartok_35",
      "bartok_36",
      "bartok_37",
      "bartok_38",
      "bartok_39",
      "bartok_40",
      "bartok_42",
      "waltz_coordination_exercise",
      "erfolg",
      "mimiga",
      "old_dan_tucker",
      "good_vibrations"

      // bossa_nova_test
      // mary_had_a_little_lamb
      // note_positioning_test
    ]

    return <Lightbox>
      <p>Select a song to load</p>
      <ul>
      {songs.map(song =>
          <li key={song}>
            <button onClick={e => {
              this.loadSong(song)
              trigger(this, "closeLightbox")
            }}>{song}</button>
            {this.state.currentSongName == song ? " Loaded" : ""}
          </li>
      )}
      </ul>
    </Lightbox>
  }
}
