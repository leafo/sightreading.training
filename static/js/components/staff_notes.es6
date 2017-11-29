import * as React from "react"
import {classNames} from "lib"

import * as types from "prop-types"
import {parseNote, noteStaffOffset, MIDDLE_C_PITCH} from "st/music"

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
    return <div ref="notes" className={this.classNames()}>
      {this.renderNotes()}
      {this.renderHeldNotes()}
    </div>
  }

  classNames()  {
    return "staff_notes"
  }

  setOffset(amount) {
    this.refs.notes.style.transform = `translate3d(${amount}px, 0, 0)`;
  }

  renderNotes() {
    const props = this.props
    let keySignatureWidth = 0

    if (props.keySignature) {
      let count = Math.abs(props.keySignature.count)
      keySignatureWidth = count > 0 ? count * 20 + 20 : 0;
    }

    return props.notes.map((note, idx) => {
      let opts = {
        idx,
        goal: true,
        first: idx == 0,
      }

      if (props.noteWidth) {
        opts.offset= keySignatureWidth + props.noteWidth * idx
      }

      if (Array.isArray(note)) {
        opts.rowOffsets = {}

        let noteEls = note.map((sub_note, col_idx) => {
          opts.key = `${idx}-${col_idx}`
          return this.renderNote(sub_note, opts)
        })

        if (note.annotation && opts.offset) {
          let style = {
            top: "-66%",
            left: `${opts.offset}px`
          }

          // TODO: this is being double rendered with two staves?
          noteEls.push(<div style={style} className="annotation">
            {note.annotation}
          </div>)
        }

        return noteEls
      } else {
        opts.key = idx
        return this.renderNote(note, opts)
      }
    });
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

    if (outside) {
      return [
        ...this.renderLedgerLines(note, opts),
        noteEl,
      ]
    } else {
      return noteEl
    }
  }

  renderLedgerLines(note, opts={}) {
    const props = this.props

    let key = props.keySignature
    let fromLeft =  opts.offset || 0
    let letterDelta = 0
    let below = false

    let offset = noteStaffOffset(note)

    // above
    if (offset > props.upperRow) {
      letterDelta = offset - props.upperRow;
    }

    // below
    if (offset < props.lowerRow) {
      letterDelta = props.lowerRow - offset;
      below = true;
    }

    let numLines = Math.floor(letterDelta / 2);

    let lines = [];
    for (let i = 0; i < numLines; i++) {
      let style = {
        left: `${(opts.offset || 0) - 10}px`,
        width: `${(opts.width || 40) + 20}px`,
      }

      if (below) {
        style.top = `${100 + 25*(i + 1)}%`;
      } else {
        style.bottom = `${100 + 25*(i + 1)}%`;
      }

      lines.push(<div
        key={`${opts.key}-leger-${i}`}
        className={classNames("ledger_line", {
          above: !below,
          below: below
        })}
        style={style} />);
    }

    return lines;
  }
}
