
import * as React from "react"
import {classNames} from "lib"

import StaffNotes from "st/components/staff_notes"
import {parseNote, letterOffset, MIDDLE_C_PITCH} from "st/music"

export default class StaffSongNotes extends StaffNotes {
  classNames()  {
    return "staff_notes staff_song_notes"
  }

  static defaultPixelsPerBeat = 100

  renderNote(songNote, opts) {
    const key = this.props.keySignature

    let pitch = parseNote(songNote.note)

    let pixelsPerBeat = this.props.pixelsPerBeat || this.constructor.defaultPixelsPerBeat

    let row = letterOffset(pitch, !key.isFlat())
    let fromTop = letterOffset(this.props.upperLine) - row;
    let fromLeft = songNote.start * pixelsPerBeat
    let width = songNote.getRenderStop() * pixelsPerBeat - fromLeft

    let style = {
      top: `${Math.floor(fromTop * 25/2)}%`,
      left: `${fromLeft}px`,
      width: `${width}px`
    }

    return <div
      className={classNames("note_bar", {held: songNote.held})}
      style={style}
      key={opts.key}></div>
  }
}
