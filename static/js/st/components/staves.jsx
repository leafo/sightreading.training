
import * as React from "react"
import classNames from "classnames"
import * as types from "prop-types"

import NoteList from "st/note_list"
import {SongNoteList} from "st/song_note_list"
import ChordList from "st/chord_list"

import {parseNote, noteStaffOffset, MIDDLE_C_PITCH} from "st/music"

import StaffNotes from "st/components/staff_notes"
import StaffSongNotes from "st/components/staff_song_notes"

const DEFAULT_HEIGHT = 120
const DEFAULT_MARGIN = 60

export class Staff extends React.Component {
  static propTypes = {
    // rendering props
    upperRow: types.number.isRequired,
    lowerRow: types.number.isRequired,
    cleffImage: types.string.isRequired,
    staffClass: types.string.isRequired,
    keySignature: types.object,

    // state props
    notes: types.array.isRequired,
    heldNotes: types.object.isRequired,
    inGrand: types.bool,
    scale: types.number,
  }

  // skips react for performance
  setOffset(amount) {
    let scale = this.props.scale || 1
    let noteWidth = this.props.noteWidth || 1
    this.refs.notes.setOffset(amount * noteWidth * scale)
  }

  // find the min/max note range in rows
  notesRowRange() {
    let min, max

    if (this.props.notes instanceof SongNoteList) {
      this.props.notes.forEach(note => {
        if (this.props.filterPitch) {
          let pitch = parseNote(note.note)
          if (!this.props.filterPitch(pitch)) {
            return
          }
        }

        let row = noteStaffOffset(note.note)

        if (min == null || row < min) {
          min = row
        }

        if (max == null || row > max) {
          max = row
        }
      })
    }

    return [min, max]
  }

  render() {
    let staffNotes = null

    if (this.props.notes instanceof NoteList) {
      let scale = this.props.scale || 1
      let noteWidth = Math.floor(this.props.noteWidth * scale)
      staffNotes = <StaffNotes ref="notes" {...this.props} noteWidth={noteWidth}></StaffNotes>
    }

    if (this.props.notes instanceof SongNoteList) {
      staffNotes = <StaffSongNotes ref="notes" {...this.props}></StaffSongNotes>
    }

    if (!staffNotes) {
      return <div data-error="Missing note list" />
    }

    let height = DEFAULT_HEIGHT * (this.props.scale || 1)

    let noteHeight = height * 0.2 // height of 1 bar

    let [minRow, maxRow] = this.notesRowRange()

    let marginTop, marginBottom

    if (minRow != null && minRow < this.props.lowerRow) {
      marginBottom = noteHeight * (this.props.lowerRow - minRow) / 2 + noteHeight

      if (marginBottom < DEFAULT_MARGIN) {
        marginBottom = null
      }
    }

    if (maxRow != null && maxRow > this.props.upperRow) {
      marginTop = noteHeight * (maxRow - this.props.upperRow) / 2 + noteHeight

      if (marginTop < DEFAULT_MARGIN) {
        marginTop = null
      }
    }

    return <div
      style={{
        height: `${height}px`,
        marginTop: marginTop ? `${marginTop}px` : null,
        marginBottom: marginBottom ? `${marginBottom}px` : null,
      }}
      className={classNames("staff", this.props.staffClass)}
    >
      <img className="cleff" src={this.props.cleffImage} />

      <div className="lines">
        <div className="line1 line"></div>
        <div className="line2 line"></div>
        <div className="line3 line"></div>
        <div className="line4 line"></div>
        <div className="line5 line"></div>
      </div>

      {this.renderKeySignature()}
      {staffNotes}
      {this.props.children}
    </div>
  }

  renderKeySignature() {
    let keySignature = this.props.keySignature

    if (!keySignature) {
      return;
    }

    if (keySignature.count == 0) {
      return;
    }

    let ksCenter = parseNote(this.props.keySignatureCenter)
    if (keySignature.isFlat()) { ksCenter -= 2 }

    let sigNotes = keySignature.notesInRange(ksCenter - 10, ksCenter + 2)

    let topOffset = this.props.upperRow

    let sigClass = keySignature.isFlat() ? "flat" : "sharp";

    let src = keySignature.isFlat() ? "/static/svg/flat.svg" : "/static/svg/sharp.svg";

    return <div className="key_signature">
      {sigNotes.map((n, i) => {
        let fromTop = topOffset - noteStaffOffset(n);
        let style = {
          top: `${Math.floor(fromTop * 25/2)}%`,
          left: `${i * 20}px`
        }

        return <img
          key={`sig-${n}`}
          data-note={n}
          style={style}
          className={classNames("accidental", sigClass)}
          src={src} />;
      })}
    </div>;
  }
}

export class GStaff extends Staff {
  static defaultProps = {
    // where the key signature is centered around
    keySignatureCenter: "F6",
    upperRow: 45,
    lowerRow: 37,
    cleffImage: "/static/svg/clefs.G.svg",
    staffClass: "g_staff",
  }
}

export class FStaff extends Staff {
  static defaultProps = {
    keySignatureCenter: "F4",
    upperRow: 33,
    lowerRow: 25,
    cleffImage: "/static/svg/clefs.F_change.svg",
    staffClass: "f_staff",
  }
}

export class GrandStaff extends React.Component {
  constructor(props) {
    super(props)
    this.gstaff = React.createRef()
    this.fstaff = React.createRef()

    this.filterGStaff = this.filterGStaff.bind(this)
    this.filterFStaff = this.filterFStaff.bind(this)
  }

  // skips react for performance
  setOffset(amount) {
    if (this.gstaff.current) {
      this.gstaff.current.setOffset(amount)
    }

    if (this.fstaff.current) {
      this.fstaff.current.setOffset(amount)
    }
  }

  filterGStaff(pitch) {
    if (pitch < MIDDLE_C_PITCH) {
      return false
    }

    return true
  }

  filterFStaff(pitch) {
    if (pitch >= MIDDLE_C_PITCH) {
      return false
    }

    return true
  }

  render() {
    return <div className="grand_staff">
      <GStaff
        ref={this.gstaff}
        filterPitch={this.filterGStaff}
        {...this.props} />
      <FStaff
        ref={this.fstaff}
        filterPitch={this.filterFStaff}
        showAnnotations={false}
        {...this.props} />
    </div>;
  }
}

export class ChordStaff extends React.Component {
  static propTypes = {
    chords: types.array,
  }

  setOffset(amount) {
    this.refs.chordScrolling.style.transform = `translate3d(${amount}px, 0, 0)`;
  }

  render() {
    if (!(this.props.chords instanceof ChordList)) {
      return <div />
    }

    let touchedNotes = Object.keys(this.props.touchedNotes)

    return <div className="chord_staff">
      <div className="chord_scrolling" ref="chordScrolling">
        {this.props.chords.map((c, i) => {
          let pressedIndicator

          if (i == 0 && touchedNotes.length) {
            pressedIndicator = <span className="touched">
              {touchedNotes.map(n => {
                if (c.containsNote(n)) {
                  return <span key={`right-${n}`} className="right">•</span>
                } else {
                  return <span key={`wrong-${n}`} className="wrong">×</span>
                }
              })}
            </span>
          }

          return <div key={`${c}-${i}`} className={classNames("chord", {
            errorshake: this.props.noteShaking && i == 0,
          })}>
            {c.toString()}
            {pressedIndicator}
          </div>
        })}
      </div>
    </div>
  }
}

