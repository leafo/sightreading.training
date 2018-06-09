
import * as React from "react"
import * as ReactDOM from "react-dom"
import {classNames} from "lib"

import StaffNotes from "st/components/staff_notes"
import {parseNote, noteName, noteStaffOffset, MIDDLE_C_PITCH} from "st/music"
import * as types from "prop-types"

import LedgerLines from "st/components/staff/ledger_lines"
import BarNotes from "st/components/staff/bar_notes"
import {SongNoteList} from "st/song_note_list"

class MeasureLines extends React.PureComponent {
  static propTypes = {
    pixelsPerBeat: types.number.isRequired,
    notes: types.array.isRequired,
  }

  render() {
    const props = this.props
    let beatsPerMeasure = 4

    if (props.notes.metadata) {
      beatsPerMeasure = props.notes.metadata.beatsPerMeasure || beatsPerMeasure
    }

    let stop = props.notes.getStopInBeats()
    let measures = Math.ceil(stop / beatsPerMeasure)

    let lines = []

    let pixelsPerBeat = props.pixelsPerBeat

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

export default class StaffSongNotes extends React.PureComponent {
  static defaultPixelsPerBeat = 100

  static propTypes = {
    keySignature: types.object.isRequired,
    notes: types.array.isRequired,
    loopLeft: types.number,
    loopRight: types.number,
    pixelsPerBeat: types.number.isRequired,
    heldNotes: types.object.isRequired,
  }

  constructor(props) {
    super(props)
    this.state = {}
    this.notesRef = React.createRef()
  }

  classNames()  {
    return "staff_notes staff_song_notes"
  }

  static filterNotes(notes, filter) {
    if (notes.length == 0) {
      return notes
    }

    if (!filter) {
      return notes
    }

    let out = new SongNoteList()
    notes.forEach(n => {
      let pitch = parseNote(n.note)
      if (filter(pitch)) {
        out.push(n)
      }
    })

    return out
  }

  static getDerivedStateFromProps(props, state) {
    if (props.notes != state.notes || props.filterPitch != state.filterPitch) {
      return {
        notes: props.notes,
        filterPitch: props.filterPitch,
        filteredNotes: StaffSongNotes.filterNotes(props.notes, props.filterPitch),
      }
    }

    return null
  }

  componentDidMount() {
    this.resizeHandler = () => {
      let el = ReactDOM.findDOMNode(this)
      let rect = el.getBoundingClientRect()

      this.setState({
        width: rect.width
      })
    }

    this.resizeHandler()
    window.addEventListener("resize", this.resizeHandler);
  }

  componentWillUnmount() {
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler)
    }
  }

  render() {
    if (!this.state.width) {
      return <div></div>
    }

    let count = Math.abs(this.props.keySignature.count)
    let keySignatureWidth = count > 0 ? count * 20 + 20 : 0;
    let notes = this.state.filteredNotes

    let style = {}
    if (this.offset) {
      style.transform = `translate3d(${this.offset}px, 0, 0)`;
    }

    return <div style={style} className={this.classNames()}>
      <MeasureLines
        notes={this.props.notes}
        pixelsPerBeat={this.props.pixelsPerBeat}
        />

      <LedgerLines key="ledger_lines"
        offsetLeft={keySignatureWidth}
        upperRow={this.props.upperRow}
        lowerRow={this.props.lowerRow}
        notes={notes}
        pixelsPerBeat={this.props.pixelsPerBeat}
      />

      <BarNotes key="bar_notes"
        offsetLeft={keySignatureWidth}
        heldNotes={this.props.heldNotes}
        keySignature={this.props.keySignature}
        upperRow={this.props.upperRow}
        lowerRow={this.props.lowerRow}
        loopLeft={this.props.loopLeft}
        loopRight={this.props.loopRight}
        notes={notes}
        pixelsPerBeat={this.props.pixelsPerBeat}
      />
    </div>
  }

  setOffset(amount) {
    this.offset = amount
    let el = ReactDOM.findDOMNode(this)
    el.style.transform = `translate3d(${amount}px, 0, 0)`;
  }
}
