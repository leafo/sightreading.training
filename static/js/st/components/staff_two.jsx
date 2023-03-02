
// Read this for refresher on terminology: https://en.wikipedia.org/wiki/Staff_(music)

import * as React from "react"
import classNames from "classnames"
import * as types from "prop-types"

import Two from "two.js"

// hardcoded offset from when offsets were aranged in figma. This should
// probably be removed and everything should be specified relative to origin
const STAFF_HEIGHT_OFFSET = -100

// These dimensions are in "staff-local" coordinates
const LINE_DY = 58 // Y spacing between each ledger line, should also be the height of the note
const LINE_HALF_DY = LINE_DY / 2 // the Y spacing between half steps
const LINE_HEIGHT = 4

const CLEF_GAP = 28 // the X spacing between cleff and first note
const NOTE_GAP = 100 // the X spacing between notes

const LEDGER_EXTENT = 10 // how much ledger line extends before and past the note in x axis

const STAFF_INNER_HEIGHT = LINE_DY*4 + LINE_HEIGHT
const BAR_WIDTH = 12

import {CLEF_G, CLEF_F, CLEF_C, FLAT, SHARP, QUARTER_NOTE, WHOLE_NOTE} from "st/staff_assets"

import {parseNote, noteStaffOffset, MIDDLE_C_PITCH} from "st/music"

import NoteList from "st/note_list"

// this converts static react elements to a memoized component that can take
// ref
const createAsset = function(element, name) {
  let out = React.memo(React.forwardRef((_, ref) =>
    // NOTE: nulling out viewBox is a hack to deal with this bug: https://github.com/jonobr1/two.js/issues/561
    React.cloneElement(element, { ref, viewBox: null })
  ))

  if (name) {
    out.displayName = name
  }
  return out
}

const GClef = createAsset(CLEF_G, "GClef")
const FClef = createAsset(CLEF_F, "FClef")
const CClef = createAsset(CLEF_C, "CClef")
const Flat = createAsset(FLAT, "Flat")
const Sharp = createAsset(SHARP, "Sharp")
const QuarterNote = createAsset(QUARTER_NOTE, "QuarterNote")
const WholeNote = createAsset(WHOLE_NOTE, "WholeNote")

// manages a Two.Group for a single staff, clef and including key signature
// all cordinates are done in "staff-local" space, STAFF_HEIGHT_OFFSET
// The staff contains a "notes group" which contains all the notes rendered by the staff
class StaffGroup {
  // Terminology: A "clef" is just the symbol, the staff type (treble, bass,
  // etc.) is a combination of clef and the range of notes
  static STAFF_TYPES = {
    treble: {
      // where the F of the key signature is centered around
      keySignatureCenter: "F6",
      upperLine: "F6", // upper line is where origin (0) is for staff lines

      clefAsset: "gclef",
      assetOffset: 14,
    },
    bass: {
      keySignatureCenter: "F4",
      upperLine: "A4",

      clefAsset: "fclef",
      assetOffset: 102,
    },
    alto: {
      keySignatureCenter: "F6",
      upperLine: "G6",

      clefAsset: "cclef",
      assetOffset: 100,
    }
  }

  constructor(params={}) {
    this.getAsset = params.getAsset
    this.type = params.type || "treble"
    this.keySignature = params.keySignature || 0
    this.width = params.width || 1000
  }

  // resize the staff to a new width
  updateWidth(width) {
    this.width = width
    if (this.lines) {
      for (let line of this.lines) {
        line.vertices[1].x = this.width
        line.vertices[2].x = this.width
      }
    }
  }

  // creates a two.group for the staff, but not containing any notes. Ledger lines are inserted by the notes group
  render() {
    this.renderGroup = new Two.Group()

    // the X location where the notes can be rendered from. This will be
    // incremented by initial bar line, key signature, time signature, etc.
    this.marginX = 0

    let bar = this.makeBar(0, 0, BAR_WIDTH, STAFF_INNER_HEIGHT)
    this.renderGroup.add(bar)
    this.marginX += BAR_WIDTH

    this.lines ||= []
    for (let i = 0; i < 5; i++) {
      let line = this.makeBar(this.marginX, i*LINE_DY, this.width - this.marginX, LINE_HEIGHT)
      this.renderGroup.add(line)
      this.lines.push(line)
    }

    if (this.type) {
      const staffSettings = this.getStaffSettings()
      const clef =  this.getAsset(staffSettings.clefAsset)
      if (clef) {
        this.marginX += CLEF_GAP
        clef.translation.set(this.marginX, STAFF_HEIGHT_OFFSET + staffSettings.assetOffset)
        this.renderGroup.add(clef)
        this.marginX += clef.getBoundingClientRect().width
      }
    }

    let keySignature
    if (this.keySignature > 0) { // sharp
      keySignature = this.makeKeySignature("sharp", this.keySignature)
    } else if (this.keySignature < 0) { // flat
      keySignature = this.makeKeySignature("flat", -this.keySignature)
    }

    if (keySignature) {
      this.marginX += CLEF_GAP
      keySignature.translation.set(this.marginX, 0)
      this.renderGroup.add(keySignature)
      this.marginX += keySignature.getBoundingClientRect().width
    }

    return this.renderGroup
  }

  // convet list of notes into group of positioned note shapes
  makeNotes(notes) {
    const notesGroup = new Two.Group()
    notesGroup.translation.set(this.marginX, 0)

    let nextNoteX = CLEF_GAP * 2 // the x position of the next rendred note

    const noteAsset = this.getAsset("wholeNote")
    const noteAssetWidth = noteAsset.getBoundingClientRect().width

    // the default Y (0) location is the top-most space within the staff

    for (let noteColumn of notes) {
      if (typeof noteColumn == "string") {
        noteColumn = [noteColumn]
      }

      // Write the ledger lines for the column
      const [minRow, maxRow] = this.noteColumnRowRanges(noteColumn)
      if (minRow && minRow < 0) {
        let lines = Math.floor(Math.abs(minRow) / 2);
        for (let k=1; k <= lines; k++) {
          let ledgerLine = this.makeBar(
            nextNoteX - LEDGER_EXTENT, -k*LINE_DY,
            noteAssetWidth + LEDGER_EXTENT * 2, LINE_HEIGHT
          )
          notesGroup.add(ledgerLine)
        }
      }

      if (maxRow && maxRow > 8) {
        let lines = Math.abs(Math.floor((maxRow - 8) / 2))
        const lowerLineY = 4 * LINE_DY

        for (let k=1; k <= lines; k++) {
          let ledgerLine = this.makeBar(
            nextNoteX - LEDGER_EXTENT, lowerLineY + k*LINE_DY,
            noteAssetWidth + LEDGER_EXTENT * 2, LINE_HEIGHT
          )
          notesGroup.add(ledgerLine)
        }
      }


      // Write the notes
      for (let note of noteColumn) {
        let value = parseNote(note)
        let n = noteAsset.clone()

        let noteY = this.getNoteY(note)

        n.translation.set(nextNoteX, noteY)
        notesGroup.add(n)

        // debug indicator
        // let bar = this.makeBar(nextNoteX, noteY, 10, 10)
        // bar.fill = "red"
        // notesGroup.add(bar)
      }

      nextNoteX += noteAssetWidth + NOTE_GAP
    }

    return notesGroup
  }

  // renders new set of notes into the primary note group. Note that the staff
  // must be rendered first to have the render group available
  renderNotes(notes) {
    // remove existing notes if they are there
    if (this.notesGroup) {
      this.notesGroup.remove()
      delete this.notesGroup
    }

    this.notesGroup = this.makeNotes(notes)
    this.notesGroup.addTo(this.renderGroup)
  }

  // keep in mind held notes is not array of note names but table
  renderHeldNotes(heldNotes) {
    if (this.heldNotesGroup) {
      this.heldNotesGroup.remove()
      delete this.heldNotesGroup
    }

    const notes = new NoteList([Object.keys(heldNotes)])

    this.heldNotesGroup = this.makeNotes(notes)
    this.heldNotesGroup.opacity = 0.25
    this.heldNotesGroup.addTo(this.renderGroup)
  }

  makeKeySignature(type, count) {
    let offsets, accidentalAsset

    // these offsets are from figma layout, in STAFF_HEIGHT_OFFSET space
    if (type == "flat") {
      offsets = [133, 42, 158, 67, 191, 100, 216]
      accidentalAsset = this.getAsset("flat")
    } else if (type == "sharp") {
      offsets = [42, 129, 14, 101, 187, 71, 158]
      accidentalAsset = this.getAsset("sharp")
    } else {
      throw new Error("Unknown type for makeKeySignature: " + type)
    }

    let group = new Two.Group()

    const staffSettings = this.getStaffSettings()
    const offsetY = (noteStaffOffset(staffSettings.upperLine) - noteStaffOffset(staffSettings.keySignatureCenter)) * LINE_HALF_DY

    let offsetX = 0
    const accidentalGap = 4
    for (let k = 0; k < count; k++) {
      let a = accidentalAsset.clone()

      a.translation.set(offsetX, offsetY + offsets[k] + STAFF_HEIGHT_OFFSET)
      offsetX += a.getBoundingClientRect().width + accidentalGap
      group.add(a)
    }

    return group
  }


  // makes a rectangle with the origin on the top left
  makeBar(x,y,w,h) {
    let bar = new Two.Path([
      new Two.Anchor(x, y),
      new Two.Anchor(x + w, y),
      new Two.Anchor(x + w, y + h),
      new Two.Anchor(x, y + h)
    ], true, false)

    bar.fill = "black"
    bar.noStroke()

    return bar
  }

  // notes group pre-offset group that will contain all notes & bars on this staff
  getNotesGroup() {
    return this.notesGroup
  }

  getRenderGroup() {
    return this.renderGroup
  }

  getMarginX() {
    return this.marginX
  }

  getStaffSettings() {
    const settings = StaffGroup.STAFF_TYPES[this.type]
    if (!settings) {
      throw new Error(`Don't have staff settings for staff: ${this.type}`)
    }

    return settings
  }

  // the half-step row of the upper line of the staff
  // subtract from a note's absolute row to get staff-local row
  getNoteOffset() {
    return noteStaffOffset(this.getStaffSettings().upperLine)
  }

  // find staff-local y coordinate for a note (centered)
  getNoteY(note) {
    // NOTE: noteStaffOffset has y axis flipped (origin on bottom), rendering has origin on top
    // NOTE we subtract LINE_HALF_DY since we assume the the note_asset.height / 2 == LINE_HALF_DY
    return (-this.noteStaffOffset(note) + this.getNoteOffset()) * LINE_HALF_DY - LINE_HALF_DY
  }

  // This is a wrapper around noteStaffOffset to ensure that we have applied
  // the key signature to the incoming chromatic note
  noteStaffOffset(note) {
    // TODO: need to to convert chromatic note to keysignature relative in
    // order to calculate accurate note position
    return noteStaffOffset(note)
  }

  // find the min and max "staff-local" row numbers for a column of chromatic notes.
  // Suitable for rendering ledger lines
  noteColumnRowRanges(notes) {
    let minRow, maxRow

    for (const note of notes) {
      let row = -this.noteStaffOffset(note) + this.getNoteOffset()

      if (minRow == null || row < minRow) {
        minRow = row
      }

      if (maxRow == null || row > maxRow) {
        maxRow = row
      }
    }

    return [minRow, maxRow]
  }

}

export class StaffTwo extends React.PureComponent {
  // TODO: grand should probably be handled differently -- we want it to be a
  // controller that renders both and then feeds the correct voices to the
  // correct staves
  static propTypes = {
    type: types.oneOf(["treble", "bass", "alto", "grand"]).isRequired,
    keySignature: types.object.isRequired
  }

  static defaultProps = {
    height: 300, // pixel height of the svg element
    maxScale: 0.5, // the maximum scale size when scaling contents to fit element
  }

  constructor(props) {
    super()
    this.state = {}

    this.containerRef = React.createRef()
    this.assetsRef = React.createRef()

    this.assets = { } // this will be populated with asset refs when they are fist instantiated
  }

  createResizeObserver() {
    this.resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        this.updateWidth(entry.contentRect.width)
      }
    })

    this.resizeObserver.observe(this.containerRef.current)
  }

  componentWillUnmount() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      delete this.resizeObserver
    }

    // clean up the the two.js instance
    this.two.unbind("update")
    this.two.pause()
    this.containerRef.current.removeChild(this.two.renderer.domElement)
    delete this.two
  }

  updateWidth(width, force=false) {
    if (force || (this.two && width != this.two.width)) {
      // setting dimensions is funky: https://github.com/jonobr1/two.js/issues/191
      this.two.width = width

      // scale to staff-local space
      let scaledWidth = this.two.width / this.renderGroup.scale

      if (this.staves) {
        for (let staff of this.staves) {
          staff.updateWidth(scaledWidth)
        }
      }

      this.two.renderer.setSize(this.two.width, this.two.height)
      this.two.update()
    }
  }

  componentDidMount() {
    this.createResizeObserver()
    let initialWidth = this.containerRef.current.getBoundingClientRect().width

    this.two = new Two({
      width: initialWidth,
      height: this.props.height,
      // type: Two.Types.canvas
    }).appendTo(this.containerRef.current)

    // render group contains the final viewport transformation
    this.renderGroup = this.two.makeGroup()
    this.renderGroup.scale = 0.5

    this.refreshStaves()
    this.refreshNotes()

    this.scaleToFit()
    this.two.update()
  }

  // this is a quick hack for development: we should really be using the note
  // range to control the scale to prevent jumping around in size as new notes
  // are generated
  scaleToFit(maxScale=this.props.maxScale) {
    const targetHeight = this.two.height
    const origScale = this.renderGroup.scale

    this.renderGroup.scale = 1
    this.renderGroup.translation.set(0,0)

    // we want to map these coordinates to the output height
    let {top, bottom} = this.renderGroup.getBoundingClientRect()

    // add some padding
    top = Math.min(top, -1)
    bottom += 10

    const sourceHeight = bottom - top
    const scale = Math.min(maxScale, targetHeight / sourceHeight)

    this.renderGroup.scale = scale
    this.renderGroup.translation.set(0, Math.floor(-(top * scale)))

    if (scale != origScale) {
      // force update call to width since scale has changed
      this.updateWidth(this.two.width, true)
      return true
    }

    return false
  }

  refreshStaves() {
    if (this.stavesGroup) {
      this.stavesGroup.remove()
    }

    this.stavesGroup = new Two.Group()
    this.stavesGroup.translation.set(0, -STAFF_HEIGHT_OFFSET)
    this.stavesGroup.addTo(this.renderGroup)

    this.staves = []

    if (this.props.type == "treble" || this.props.type == "grand") {
      this.addStaff(new StaffGroup({
        getAsset: this.getAsset.bind(this),
        type: "treble",
        keySignature: this.props.keySignature.getCount(),
        width: this.two.width / this.renderGroup.scale
      }))
    }

    if (this.props.type == "alto") {
      this.addStaff(new StaffGroup({
        getAsset: this.getAsset.bind(this),
        type: "alto",
        keySignature: this.props.keySignature.getCount(),
        width: this.two.width / this.renderGroup.scale
      }))
    }

    if (this.props.type == "bass" || this.props.type == "grand") {
      this.addStaff(new StaffGroup({
        getAsset: this.getAsset.bind(this),
        type: "bass",
        keySignature: this.props.keySignature.getCount(),
        width: this.two.width / this.renderGroup.scale
      }))
    }
  }

  // this will update all the visible notes
  refreshNotes() {
    if (this.props.notes) {
      this.staves[0].renderNotes(this.props.notes)
    }

    if (this.props.heldNotes) {
      this.staves[0].renderHeldNotes(this.props.heldNotes)
    }
  }

  // add StaffGroup to list of staves managed by this component
  addStaff(staffGroup) {
    const STAFF_ALIGN = 500

    this.staves ||= []
    this.staves.push(staffGroup)

    staffGroup.render()
      .addTo(this.stavesGroup)
      .translation.set(0, (this.staves.length - 1) * STAFF_ALIGN)
  }

  // this will return a fresh copy of the asset that can be mutated
  getAsset(name) {
    const domNode = this.assets[name].current

    if (!domNode) {
      throw new Error("Failed to find asset by name: " + name)
    }

    const asset = this.two.interpret(domNode)
    asset.remove() // remove it from default scene
    return asset
  }

  // NOTE: flushChanges is set by the prop watchers in the rendered contents of
  // this widget. componentDidUpdate is called after all children have
  // rendered, so we can use it to apply the updates to the scene graph to the
  // output
  componentDidUpdate(prevProps, prevState) {
    if (this.flushChanges) {
      this.flushChanges = false
      this.scaleToFit()
      this.two.update()
    }
  }

  render() {
    this.RefreshNotes ||= Object.assign(React.memo((props) => {
      if (this.renderGroup) {
        this.refreshNotes()
        this.flushChanges = true
      }
      return null
    }), {
      displayName: "RefreshNotes"
    })

    this.RefreshStaves ||= Object.assign(React.memo((props) => {
      if (this.renderGroup) {
        this.refreshStaves()
        this.flushChanges = true
      }
      return null
    }), { displayName: "RefreshStaves" })

    return <div className="notes_staff" ref={this.containerRef}>
      <this.RefreshNotes
        notes={this.props.notes}
        heldNotes={this.props.heldNotes}
      />

      <this.RefreshStaves
        type={this.props.type}
        keySignature={this.props.keySignature}
      />

      <div ref={this.assetsRef} className="assets" style={{display: "none"}}>
        <GClef ref={this.assets.gclef ||= React.createRef()} />
        <FClef ref={this.assets.fclef ||= React.createRef()} />
        <CClef ref={this.assets.cclef ||= React.createRef()} />
        <Flat ref={this.assets.flat ||= React.createRef()} />
        <Sharp ref={this.assets.sharp ||= React.createRef()} />
        <WholeNote ref={this.assets.wholeNote ||= React.createRef()} />
        <QuarterNote ref={this.assets.quarterNote ||= React.createRef()} />
      </div>
    </div>
  }
}
