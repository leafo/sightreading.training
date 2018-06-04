import * as React from "react"
import {classNames} from "lib"

import * as types from "prop-types"
import {parseNote, noteStaffOffset, MIDDLE_C_PITCH} from "st/music"

import {SongNoteList, SongNote} from "st/song_note_list"
import LedgerLines from "st/components/staff/ledger_lines"
import WholeNotes from "st/components/staff/whole_notes"

export default class StaffNotes extends React.Component {
  static propTypes = {
    keySignature: types.object.isRequired,
    noteWidth: types.number.isRequired,
    notes: types.array.isRequired,

    upperRow: types.number.isRequired,
    lowerRow: types.number.isRequired,
    heldNotes: types.object.isRequired,
    inGrand: types.bool,
    staffClass: types.string,
    noteShaking: types.bool,
  }

  render() {
    let [songNotes, noteClasses] = this.convertToSongNotes()

    return <div ref="notes" className={this.classNames()}>
      <LedgerLines key="ledger_lines"
        upperRow={this.props.upperRow}
        lowerRow={this.props.lowerRow}
        notes={songNotes}
        pixelsPerBeat={this.props.noteWidth}
      />

      <WholeNotes key="notes"
        keySignature={this.props.keySignature}
        upperRow={this.props.upperRow}
        lowerRow={this.props.lowerRow}
        notes={songNotes}
        noteClasses={noteClasses}
        pixelsPerBeat={this.props.noteWidth}
      />

      {this.renderHeldNotes()}
    </div>
  }

  convertToSongNotes() {
    let notes = new SongNoteList()
    let beat = 0
    let dur = 40 / this.props.noteWidth

    let noteClasses = {}

    let toRow = n =>
      noteStaffOffset(this.props.keySignature.enharmonic(n))

    let appendClass = (note, cls) => {
      if (noteClasses[note.id]) {
        noteClasses[note.id].push(cls)
      } else {
        noteClasses[note.id] = [cls]
      }
    }

    this.props.notes.forEach((column, columnIdx) => {
      let withClasses = (note) => {
        if (columnIdx == 0) {
          if (this.props.noteShaking) {
            appendClass(note, "noteshake")
          }

          if (this.props.heldNotes[note.note]) {
            appendClass(note, "held")
          }
        }

        return note
      }

      if (Array.isArray(column)) {
        let tuples = column.map(n =>
          [toRow(n), n]
        )

        let lastRow = null
        let offset = 0
        tuples.forEach(([row, n]) => {
          if (lastRow && Math.abs(lastRow - row) == 1) {
            if (offset == 0) {
              offset = 1
            } else {
              offset = 0
            }
          } else {
            offset = 0
          }

          let sNote = new SongNote(n, beat, dur)

          if (offset == 1) {
            appendClass(sNote, "group_offset")
          }

          lastRow = row
          notes.push(withClasses(sNote))
        })

      } else {
        notes.push(withClasses(new SongNote(column, beat, dur)))
      }

      beat += 1
    })

    return [notes, noteClasses]
  }

  classNames()  {
    return "staff_notes"
  }

  setOffset(amount) {
    this.refs.notes.style.transform = `translate3d(${amount}px, 0, 0)`;
  }

  renderHeldNotes(note, opts={}) {
    if (!this.props.heldNotes) {
      return null
    }

    // notes that are held down but aren't correct
    return Object.keys(this.props.heldNotes).map((note, idx) =>
      !this.props.notes.inHead(note) && this.renderNote(note, {
        ...opts,
        key: `held-${idx}`,
        classes: { held: true }
      })
    )
  }

  shouldRenderPitch(pitch) {
    const props = this.props

    if (props.inGrand) {
      switch (props.staffClass) {
        case "f_staff":  // lower
          if (pitch >= MIDDLE_C_PITCH) {
            return false
          }
          break;
        case "g_staff":  // upper
          if (pitch < MIDDLE_C_PITCH) {
            return false
          }
          break;
      }
    }

    return true
  }

  renderNote(note, opts={}) {
    const props = this.props
    let key = props.keySignature
    note = key.enharmonic(note)

    let pitch = parseNote(note)

    if (!this.shouldRenderPitch(pitch)) {
      return
    }

    let row = noteStaffOffset(note)

    let fromTop = props.upperRow - row;
    let fromLeft = opts.offset || 0

    if (opts.rowOffsets) {
      let rowOffset = 1
      while (opts.rowOffsets[row - 1] == rowOffset || opts.rowOffsets[row + 1] == rowOffset) {
        rowOffset += 1
      }
      opts.rowOffsets[row] = rowOffset

      fromLeft += (rowOffset - 1) * 28
    }

    let style = {
      top: `${Math.floor(fromTop * 25/2)}%`,
      left: `${fromLeft}px`
    }

    let outside = row > props.upperRow || row < props.lowerRow
    let accidentals = key.accidentalsForNote(note)

    let classes = classNames("whole_note", "note", {
      is_flat: accidentals == -1,
      is_sharp: accidentals == 1,
      is_natural: accidentals == 0,
      outside: outside,
      noteshake: props.noteShaking && opts.first,
      held: opts.goal && opts.first && props.heldNotes[note],
    }, opts.classes || {})

    let parts = [
      <img key="head" className="primary" src="/static/svg/noteheads.s0.svg" />
    ]

    if (accidentals == 0) {
      parts.push(<img key="natural" className="accidental natural" src="/static/svg/natural.svg" />)
    }

    if (accidentals == -1) {
      parts.push(<img key="flat" className="accidental flat" src="/static/svg/flat.svg" />)
    }

    if (accidentals == 1) {
      parts.push(<img key="sharp" className="accidental sharp" src="/static/svg/sharp.svg" />)
    }

    let noteEl = <div
      key={opts.key}
      style={style}
      data-note={note}
      data-midi-note={pitch}
      className={classes}
      >{parts}</div>

    return noteEl
  }
}
