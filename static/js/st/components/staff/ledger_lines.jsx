import * as React from "react"
import classNames from "classnames"
import {noteStaffOffset} from "st/music"

import * as types from "prop-types"
import styles from "st/components/staff.module.css"

export default class LedgerLines extends React.PureComponent {
  static propTypes = {
    notes: types.array.isRequired,
    upperRow: types.number,
    lowerRow: types.number,
    pixelsPerBeat: types.number,
    offsetLeft: types.number,
  }

  render() {
    let out = []
    let append = line => out.push(line)

    this.props.notes.forEach((note, idx) => {
      let lines = this.renderLedgerLinesForNote(note, idx)

      if (lines != null) {
        lines.forEach(append)
      }
    })

    if (out.length) {
      return out
    }

    return null
  }

  renderLedgerLinesForNote(note, idx) {
    const props = this.props

    let offset = noteStaffOffset(note.note)
    let outside = offset > props.upperRow || offset < props.lowerRow
    if (!outside) {
      return
    }

    let letterDelta = 0
    let below = false

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

    let offsetLeft = props.offsetLeft || 0

    let left = offsetLeft + note.getStart() * props.pixelsPerBeat - 10
    let right = offsetLeft + note.getStop() * props.pixelsPerBeat + 10

    for (let i = 0; i < numLines; i++) {
      let style = {
        left: `${left}px`,
        width: `${right - left}px`,
      }

      if (below) {
        style.top = `${100 + 25*(i + 1)}%`;
      } else {
        style.bottom = `${100 + 25*(i + 1)}%`;
      }

      lines.push(<div
        key={`leger-${idx}-${i}`}
        className={classNames(styles.ledger_line, {
          [styles.above]: !below,
          [styles.below]: below
        })}
        style={style} />);
    }

    return lines;
  }
}
