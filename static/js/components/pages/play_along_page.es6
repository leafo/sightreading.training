import * as React from "react"

import {GStaff} from "st/components/staves"
import {SongNoteList} from "st/song_note_list"
import SongTimer from "st/song_timer"
import StaffSongNotes from "st/components/staff_song_notes"

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
    this.state.songTimer.start()
  }

  updateBeats(beat) {
    if (beat > this.state.song.getStopInBeats()) {
      this.state.songTimer.reset()
    }

    this.refs.staff.setOffset(-beat * StaffSongNotes.pixelsPerBeat)
  }

  render() {
    let heldNotes = {}

    return <div className="play_along_page">
      <GStaff ref="staff" notes={this.state.song} heldNotes={heldNotes} keySignature={new KeySignature(0)}></GStaff>
      <button onClick={e => this.state.songTimer.start() }>
        Start Timer
      </button>
    </div>
  }
}
