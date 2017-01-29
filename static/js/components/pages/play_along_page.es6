import * as React from "react"

import {GStaff} from "st/components/staves"
import Keyboard from "st/components/keyboard"
import StaffSongNotes from "st/components/staff_song_notes"
import Slider from "st/components/slider"

import {SongNoteList} from "st/song_note_list"
import SongTimer from "st/song_timer"
import {KeySignature} from "st/music"

export default class PlayAlongPage extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      heldNotes: {},
      bpm: 60,
      pixelsPerBeat: StaffSongNotes.defaultPixelsPerBeat,
      song: SongNoteList.newSong([
        ["C5", 0, 1],
        ["D5", 1, 1],
        ["E5", 3, 1],
        ["D5", 5, 1]
      ]),
      songTimer: new SongTimer({
        onUpdate: (beat) => this.updateBeats(beat)
      })
    }
  }

  componentDidMount() {
    this.updateBeats(0)
  }

  componentWillUnmount() {
    this.state.songTimer.reset()
  }

  componentDidUpdate(prepProps, prevState) {
    if (prevState.bpm != this.state.bpm) {
      this.state.songTimer.setBpm(this.state.bpm)
    }
  }

  updateBeats(beat) {
    if (beat > this.state.song.getStopInBeats()) {
      this.state.songTimer.restart()
    }

    this.currentBeat = beat
    this.refs.staff.setOffset(-beat * this.state.pixelsPerBeat + 100)
  }

  render() {
    let heldNotes = {}

    return <div className="play_along_page">
      <div className="staff_wrapper">
        <GStaff
          ref="staff"
          notes={this.state.song}
          heldNotes={heldNotes}
          pixelsPerBeat={this.state.pixelsPerBeat}
          keySignature={new KeySignature(0)}>
            <div className="time_bar"></div>
        </GStaff>
        {this.renderTransportControls()}
      </div>
      {this.renderKeyboard()}
    </div>
  }


  togglePlay() {
    if (this.state.songTimer.running) {
      this.state.songTimer.reset()
    } else {
      this.state.songTimer.start(this.state.bpm)
    }

    this.forceUpdate()
  }

  pressNote(note) {
    let songNote = this.state.song.matchNote(note, this.currentBeat)

    if (songNote) {
      songNote.held = true
      let accuracy = this.state.song.beatsToSeconds(this.currentBeat - songNote.start)
      console.log("hit", accuracy)
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

  renderKeyboard() {
    return <Keyboard
      lower={"C3"}
      upper={"C7"}
      heldNotes={{}}
      onKeyDown={this.pressNote.bind(this)}
      onKeyUp={this.releaseNote.bind(this)} />;
  }

  renderTransportControls() {
    return <div className="transport_controls">
      <button onClick={e => this.togglePlay()}>
        {this.state.songTimer.running ? "Stop" : "Play"}
      </button>

      <div className="spacer"></div>

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

}
