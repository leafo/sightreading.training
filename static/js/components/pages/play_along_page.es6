import * as React from "react"

import {GStaff} from "st/components/staves"
import Keyboard from "st/components/keyboard"
import StaffSongNotes from "st/components/staff_song_notes"

import {SongNoteList} from "st/song_note_list"
import SongTimer from "st/song_timer"
import {KeySignature} from "st/music"

export default class PlayAlongPage extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      song: SongNoteList.newSong([
        ["C5", 0, 1],
        ["D5", 1, 1],
        ["E5", 3, 1],
        ["D5", 5, 1]
      ]),
      songTimer: new SongTimer({
        bpm: 60,
        onUpdate: (beat) => this.updateBeats(beat)
      })
    }
  }

  componentDidMount() {
    this.updateBeats(0)
  }

  updateBeats(beat) {
    if (beat > this.state.song.getStopInBeats()) {
      this.state.songTimer.restart()
    }

    this.refs.staff.setOffset(-beat * StaffSongNotes.pixelsPerBeat + 100)
  }

  render() {
    let heldNotes = {}

    return <div className="play_along_page">
      <GStaff ref="staff" notes={this.state.song} heldNotes={heldNotes} keySignature={new KeySignature(0)}>
        <div className="time_bar"></div>
      </GStaff>
      <button onClick={e => {
        if (this.state.songTimer.running) {
          this.state.songTimer.reset()
        } else {
          this.state.songTimer.start()
        }
      }}>
       Toggle timer
      </button>
      {this.renderKeyboard()}
    </div>
  }

  pressNote() {
    console.log("press", arguments);
  }

  releaseNote() {
    console.log("release", arguments);
  }

  renderKeyboard() {
    return <Keyboard
      lower={"C3"}
      upper={"C7"}
      heldNotes={{}}
      onKeyDown={this.pressNote.bind(this)}
      onKeyUp={this.releaseNote.bind(this)} />;
  }
}
