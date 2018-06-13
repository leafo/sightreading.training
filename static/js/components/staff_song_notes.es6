
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
  static bucketSize = 4 // how many beats each chunk of rendering is

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

      if (rect.width != this.state.width) {
        this.setState({
          width: rect.width
        })
        this.refreshRenderBuckets(rect.width)
      }
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

    let renderLeft = this.state.chunkLeft * MeasureLines.bucketSize
    let renderRight = this.state.chunkRight * MeasureLines.bucketSize

    let notes = this.state.filteredNotes.filter((note) => {
      let left = note.getStart()
      let right = note.getStop()

      return right > renderLeft && left <= renderRight
    })

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
        upperRow={this.props.upperRow}
        lowerRow={this.props.lowerRow}
        notes={notes}
        pixelsPerBeat={this.props.pixelsPerBeat}
      />

      <BarNotes key="bar_notes"
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

  refreshRenderBuckets(width=this.state.width) {
    if (!width) {
      return
    }

    let offset = this.offset ? -this.offset : 0

    let beatLeft = -4 + offset / this.props.pixelsPerBeat
    let beatRight = (width + offset) / this.props.pixelsPerBeat

    let chunkLeft = Math.floor(beatLeft / MeasureLines.bucketSize)
    let chunkRight = Math.floor(beatRight / MeasureLines.bucketSize) + 1

    if (this.state.chunkLeft != chunkLeft || this.state.chunkRight != chunkRight) {
      this.setState({ chunkLeft, chunkRight })
    }
  }

  setOffset(amount) {
    this.offset = amount
    let el = ReactDOM.findDOMNode(this)
    el.style.transform = `translate3d(${amount}px, 0, 0)`;

    this.refreshRenderBuckets()
  }
}
