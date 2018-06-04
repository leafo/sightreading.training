
import * as React from "react"
import {classNames} from "lib"

import StaffNotes from "st/components/staff_notes"
import {parseNote, noteName, noteStaffOffset, MIDDLE_C_PITCH} from "st/music"
import * as types from "prop-types"

import LedgerLines from "st/components/staff/ledger_lines"
import BarNotes from "st/components/staff/bar_notes"

export default class StaffSongNotes extends React.PureComponent {
  static propTypes = {
    loopLeft: types.number,
    loopRight: types.number,
  }

  classNames()  {
    return "staff_notes staff_song_notes"
  }

  static defaultPixelsPerBeat = 100

  render() {
    let count = Math.abs(this.props.keySignature.count)
    let keySignatureWidth = count > 0 ? count * 20 + 20 : 0;

    return <div ref="notes" className={this.classNames()}>
      {this.renderMeasureLines()}

      <LedgerLines key="ledger_lines"
        offsetLeft={keySignatureWidth}
        upperRow={this.props.upperRow}
        lowerRow={this.props.lowerRow}
        notes={this.props.notes}
        pixelsPerBeat={this.props.pixelsPerBeat}
      />

      <BarNotes
        offsetLeft={keySignatureWidth}
        keySignature={this.props.keySignature}
        upperRow={this.props.upperRow}
        lowerRow={this.props.lowerRow}
        notes={this.props.notes}
        pixelsPerBeat={this.props.pixelsPerBeat}
      />
    </div>
  }

  setOffset(amount) {
    this.refs.notes.style.transform = `translate3d(${amount}px, 0, 0)`;
  }

  renderMeasureLines() {
    let beatsPerMeasure = 4

    if (this.props.notes.metadata) {
      beatsPerMeasure = this.props.notes.metadata.beatsPerMeasure || beatsPerMeasure
    }

    let stop = this.props.notes.getStopInBeats()
    let measures = Math.ceil(stop / beatsPerMeasure)

    let lines = []

    let pixelsPerBeat = this.props.pixelsPerBeat

    for (let m = 0; m <= measures; m++) {
      let fromLeft = m * beatsPerMeasure * pixelsPerBeat

      lines.push(<div
        style={{ left: `${fromLeft - 2}px`}}
        data-label={m + 1}
        key={`measure-${m}`}
        className="measure_line"></div>)
    }

    return lines
  }
}
