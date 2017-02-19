import * as React from "react"

import Keyboard from "st/components/keyboard"
import StaffSongNotes from "st/components/staff_song_notes"
import Slider from "st/components/slider"
import Hotkeys from "st/components/hotkeys"
import Draggable from "st/components/draggable"

import Lightbox from "st/components/lightbox"
import MidiInstrumentPicker from "st/components/midi_instrument_picker"

import SongParser from "st/song_parser"
import SongTimer from "st/song_timer"
import {KeySignature, noteName, parseNote} from "st/music"
import {NOTE_EVENTS} from "st/midi"

import {trigger} from "st/events"
import {STAVES} from "st/data"
import {GStaff} from "st/components/staves"

let {PropTypes: types} = React

const DEFAULT_SONG = "bartok_36"

class PositionField extends React.Component {
  static propTypes = {
    min: types.number,
    max: types.number,
    value: types.number
  }

  constructor(props) {
    super(props)
    this.state = {
      value: null,
      editValue: null
    }
  }

  formattedValue() {
    let value = 0

    if (this.props.value != null) {
      value = this.props.value
    }

    if (this.state.value != null) {
      value = this.state.value
    }

    return value.toFixed(1)
  }

  confirmEdit() {
    if (!this.state.editValue) {
      return
    }

    if (this.state.editValue.match(/[^0-9\.]/)) {
      this.cancelEdit()
    }

    let value = +this.state.editValue

    if (this.props.min != null) {
      value = Math.max(this.props.min, value)
    }

    if (this.props.max != null) {
      value = Math.min(this.props.max, value)
    }

    this.setValue(value)
  }

  setValue(value) {
    this.setState({
      value: value,
      editValue: null
    })

    if (this.props.onUpdate) {
      this.props.onUpdate(value)
    }
  }

  cancelEdit() {
    this.setState({ editValue: null })
  }

  render() {
    let displayValue = this.state.editValue
    if (displayValue == null) {
      displayValue = this.formattedValue()
    }

    return <input
      className="position_field_input"
      type="text"
      readOnly={this.props.readOnly}
      value={displayValue}
      onKeyDown={e => {
        if (e.keyCode == 27)  {
          if (!this.state.editValue && this.props.resetValue != null) {
            this.setValue(this.props.resetValue)
          } else {
            this.cancelEdit()
          }
          e.stopPropagation()
          return
        }

        if (e.keyCode == 13)  {
          this.confirmEdit()
          e.stopPropagation()
          return
        }

        // todo: allow up/down keys
      }}
      onFocus={e => e.target.select()}
      onChange={e => {
        this.setState({
          editValue: e.target.value
        })
      }}
      onBlur={e => this.confirmEdit()}
      />
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
    }

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
      let song = SongParser.load(songText)

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
        currentSongName: name,

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
      <div className="staff_wrapper">
        {staff}
        {this.renderTransportControls()}
      </div>
      {this.renderKeyboard()}
      <Hotkeys keyMap={this.keyMap} />
    </div>
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
    let [raw, pitch, velocity] = message.data;

    let cmd = raw >> 4,
      channel = raw & 0xf,
      type = raw & 0xf0;

    let n = noteName(pitch)

    if (NOTE_EVENTS[type] == "noteOn") {
      if (velocity == 0) {
        this.releaseNote(n);
      } else if (!document.hidden) { // ignore when the browser tab isn't active
        this.pressNote(n);
      }
    }

    if (NOTE_EVENTS[type] == "noteOff") {
      this.releaseNote(n);
    }
  }

  renderKeyboard() {
    return <Keyboard
      lower={"C4"}
      upper={"C7"}
      heldNotes={this.state.heldNotes}
      onKeyDown={this.pressNote.bind(this)}
      onKeyUp={this.releaseNote.bind(this)}
    />
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
        onUpdate={val => {
          this.state.songTimer.seek(val)
        }}
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
          onUpdate={val => {
            this.setState({ loopLeft: val })
          }}
        />

        <PositionField ref="loopRight"
          min={this.state.loopLeft}
          max={stop}
          resetValue={stop}
          value={this.state.loopRight}
          onUpdate={val => {
            this.setState({ loopRight: val })
          }}
        />
      </span>

      <div className="spacer"></div>

      <PositionField
        min={1}
        max={10}
        value={this.state.metronomeMultiplier}
        onUpdate={val => {
          this.setState({ metronomeMultiplier: val })
        }}
      />

      <input
        checked={this.state.playNotes || false}
        onChange={(e) => this.setState({playNotes: e.target.checked}) }
        type="checkbox" />

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
          onChange={(value) => this.setState({ bpm: value })}
          value={+this.state.bpm} />
        <span className="slider_value">{ this.state.bpm }</span>
      </span>

      <span className="slider_input transport_slider">
        <span className="slider_label">PPB</span>
        <Slider
          min={50}
          max={300}
          onChange={(value) => this.setState({ pixelsPerBeat: value })}
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
