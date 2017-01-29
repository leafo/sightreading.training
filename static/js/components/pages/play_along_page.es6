import * as React from "react"

import {GStaff} from "st/components/staves"
import Keyboard from "st/components/keyboard"
import StaffSongNotes from "st/components/staff_song_notes"
import Slider from "st/components/slider"
import Hotkeys from "st/components/hotkeys"

import Lightbox from "st/components/lightbox"
import MidiInstrumentPicker from "st/components/midi_instrument_picker"

import SongParser from "st/song_parser"
import SongTimer from "st/song_timer"
import {KeySignature, noteName, parseNote} from "st/music"
import {NOTE_EVENTS} from "st/midi"

import {trigger} from "st/events"

export default class PlayAlongPage extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      heldNotes: {},
      bpm: 60,
      pixelsPerBeat: StaffSongNotes.defaultPixelsPerBeat,

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

    request.open("GET", `/static/music/${name}.lml`)
    request.send()
    request.onload = (e) => {
      let songText = request.responseText
      let song = SongParser.load(songText)

      if (this.state.songTimer) {
        this.state.songTimer.reset()
      }

      this.setState({
        loading: false,
        song,

        songTimer: new SongTimer({
          onUpdate: this.updateBeats.bind(this),
          onNoteStart: this.onNoteStart.bind(this),
          onNoteStop: this.onNoteStop.bind(this),
          song
        })
      })
    }
  }

  onNoteStart(note) {
    if (this.state.midiChannel) {
      this.state.midiChannel.noteOn(parseNote(note.note), 100)
    }
  }

  onNoteStop(note) {
    if (this.state.midiChannel) {
      this.state.midiChannel.noteOff(parseNote(note.note), 100)
    }
  }

  componentDidMount() {
    this.updateBeats(0)
    this.loadSong("bossa_nova_test")
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

  updateBeats(beat) {
    if (this.state.song) {
      if (beat > this.state.song.getStopInBeats()) {
        this.state.songTimer.restart()
      }

      this.refs.staff.setOffset(-beat * this.state.pixelsPerBeat + 100)
    }

    this.currentBeat = beat
    this.refs.currentBeat.innerText = `${this.currentBeat.toFixed(1)}`
  }

  render() {
    let heldNotes = {}

    return <div className="play_along_page">
      <div className="staff_wrapper">
        <GStaff
          ref="staff"
          notes={this.state.song || []}
          heldNotes={heldNotes}
          pixelsPerBeat={this.state.pixelsPerBeat}
          keySignature={new KeySignature(0)}>
            <div className="time_bar"></div>
        </GStaff>
        {this.renderTransportControls()}
      </div>
      {this.renderKeyboard()}
      <Hotkeys keyMap={this.keyMap} />
    </div>
  }

  togglePlay() {
    if (!this.state.songTimer) return

    if (this.state.songTimer.running) {
      this.state.songTimer.pause()
    } else {
      this.state.songTimer.start(this.state.bpm)
    }

    this.forceUpdate()
  }

  pressNote(note) {
    if (!this.state.song) return

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
      onKeyUp={this.releaseNote.bind(this)} />;
  }

  renderTransportControls() {
    return <div className="transport_controls">
      {
        this.state.songTimer
        ? <button onClick={e => this.togglePlay()}>
            {this.state.songTimer.running ? "Pause" : "Play"}
          </button>
        : null
      }

      <span ref="currentBeat">-</span>

      <div className="spacer"></div>

      <button onClick={e => {
        trigger(this, "showLightbox", <Lightbox>
          <p>Choose instrument to play song to</p>
          <MidiInstrumentPicker
            midi={this.props.midi}
            onPick={midiChannel => {
              console.log("choosing channel", midiChannel)
              this.setState({ midiChannel })
              trigger(this, "closeLightbox")
            }}
          />
        </Lightbox>)
      }}>
        {
          this.state.midiChannel ?
          `Channel ${this.state.midiChannel.channel + 1}` :
          "Select output"
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
}
