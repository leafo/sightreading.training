import * as React from "react"
import {classNames} from "lib"

let {PropTypes: types} = React;
import {parseNote, letterOffset, MIDDLE_C_PITCH} from "st/music"

export default class StaffNotes extends React.Component {
  render() {
    return <div ref="notes" className="staff_notes">
      {this.renderNotes()}
      {this.renderHeldNotes()}
    </div>
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
        goal: true,
        offset: keySignatureWidth + props.noteWidth * idx,
        first: idx == 0,
      }

      if (Array.isArray(note)) {
        opts.rowOffsets = {}

        let noteEls = note.map((sub_note, col_idx) => {
          opts.key = `${idx}-${col_idx}`
          return this.renderNote(sub_note, opts)
        })

        if (note.annotation) {
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
      !this.props.notes.inHead(note) && this.renderNote(note, Object.assign(opts, {
        key: `held-${idx}`,
        classes: { held: true }
      }))
    )
  }

  renderNote(note, opts={}) {
    const props = this.props
    let key = props.keySignature
    note = key.enharmonic(note)

    let pitch = parseNote(note)

    if (props.inGrand) {
      switch (props.staffClass) {
        case "f_staff":  // lower
          if (pitch >= MIDDLE_C_PITCH) {
            return;
          }
          break;
        case "g_staff":  // upper
          if (pitch < MIDDLE_C_PITCH) {
            return;
          }
          break;
      }
    }

    let row = letterOffset(pitch, !key.isFlat())
    let fromTop = letterOffset(props.upperLine) - row;
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

    let outside = pitch > props.upperLine || pitch < props.lowerLine;
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
      <img className="primary" src="/static/svg/noteheads.s0.svg" />
    ]

    if (accidentals == 0) {
      parts.push(<img className="accidental natural" src="/static/svg/natural.svg" />)
    }

    if (accidentals == -1) {
      parts.push(<img className="accidental flat" src="/static/svg/flat.svg" />)
    }

    if (accidentals == 1) {
      parts.push(<img className="accidental sharp" src="/static/svg/sharp.svg" />)
    }

    let noteEl = <div
      key={opts.key}
      style={style}
      data-note={note}
      data-midi-note={pitch}
      className={classes}
      children={parts}></div>

    if (outside) {
      return [
        noteEl,
        this.renderLedgerLines(note, opts),
      ];
    } else {
      return noteEl;
    }
  }

  renderLedgerLines(note, opts={}) {
    const props = this.props

    let key = props.keySignature
    let pitch = parseNote(note)
    let fromLeft =  opts.offset || 0
    let letterDelta = 0
    let below = false

    let offset = letterOffset(pitch, !key.isFlat())

    // above
    if (pitch > props.upperLine) {
      letterDelta = offset - letterOffset(props.upperLine);
    }

    // below
    if (pitch < props.lowerLine) {
      letterDelta = letterOffset(props.lowerLine) - offset;
      below = true;
    }

    let numLines = Math.floor(letterDelta / 2);

    let lines = [];
    for (let i = 0; i < numLines; i++) {
      let style = {
        left: `${(opts.offset || 0) - 10}px`,
        width: `${40 + 20}px`,
      }

      if (below) {
        style.top = `${100 + 25*(i + 1)}%`;
      } else {
        style.bottom = `${100 + 25*(i + 1)}%`;
      }

      lines.push(<div
        className={classNames("ledger_line", {
          above: !below,
          below: below
        })}
        style={style} />);
    }

    return lines;
  }
}
