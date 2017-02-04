
import * as React from "react"
import {classNames} from "lib"

import StaffNotes from "st/components/staff_notes"
import {parseNote, letterOffset, noteStaffOffset, MIDDLE_C_PITCH} from "st/music"

export default class StaffSongNotes extends StaffNotes {
  classNames()  {
    return "staff_notes staff_song_notes"
  }

  static defaultPixelsPerBeat = 100

  renderNote(songNote, opts) {
    const key = this.props.keySignature
    let note = songNote.note
    let pitch = parseNote(note)

    if (!this.shouldRenderPitch(pitch)) {
      return
    }

    let pixelsPerBeat = this.props.pixelsPerBeat || this.constructor.defaultPixelsPerBeat

    let row = noteStaffOffset(note)
    let fromTop = letterOffset(this.props.upperLine) - row;
    let fromLeft = songNote.start * pixelsPerBeat
    let width = songNote.getRenderStop() * pixelsPerBeat - fromLeft

    let accidentals = key.accidentalsForNote(note)

    let style = {
      top: `${Math.floor(fromTop * 25/2)}%`,
      left: `${fromLeft}px`,
      width: `${width}px`
    }

    let outside = pitch > this.props.upperLine || pitch < this.props.lowerLine;

    let noteEl = <div
      className={classNames("note_bar", {
        is_flat: accidentals == -1,
        is_sharp: accidentals == 1,
        is_natural: accidentals == 0,
        held: songNote.held
      })}
      title={songNote.note}
      style={style}
      key={opts.key}></div>

    if (outside) {
      return [
        this.renderLedgerLines(note, {
          offset: fromLeft,
          width: width,
        }),
        noteEl,
      ];
    } else {
      return noteEl;
    }

  }
}
