
import * as React from "react"
import {classNames} from "lib"

import StaffNotes from "st/components/staff_notes"

let {PropTypes: types} = React;

export default class StaffSongNotes extends StaffNotes {
  renderNote(note, opts) {
    return <div key={opts.key}>{note.toString()}</div>
  }
}
