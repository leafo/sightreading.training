import * as React from "react"

import {GStaff} from "st/components/staves"
import {SongNoteList} from "st/song_note_list"

export default class PlayAlongPage extends React.Component {
  render() {
    let song = SongNoteList.newSong([
      ["C5", 0, 1],
      ["D5", 1, 1],
      ["E5", 3, 1],
      ["D5", 5, 1]
    ])

    let heldNotes = {}

    return <div className="play_along_page">
      <GStaff notes={song} heldNotes={heldNotes}></GStaff>
    </div>
  }
}
