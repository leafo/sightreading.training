
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
const NOTE_COLUMN_DX = 300 // the X spacing between note columns (note this doesn't take into account the width of column) to enssure consistent spacing between column

const LEDGER_EXTENT = 15 // how much ledger line extends before and past the note in x axis

const STAFF_INNER_HEIGHT = LINE_DY*4 + LINE_HEIGHT
const BAR_WIDTH = 12
const MIN_STAFF_DY = 500

import {CLEF_G, CLEF_F, CLEF_C, FLAT, SHARP, NATURAL, QUARTER_NOTE, WHOLE_NOTE, BRACE} from "st/staff_assets"

import {parseNote, noteStaffOffset, KeySignature, MIDDLE_C_PITCH} from "st/music"

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


const makeBox = function(x,y,w,h) {
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

const GClef = createAsset(CLEF_G, "GClef")
const FClef = createAsset(CLEF_F, "FClef")
const CClef = createAsset(CLEF_C, "CClef")
const Flat = createAsset(FLAT, "Flat")
const Sharp = createAsset(SHARP, "Sharp")
const Natural = createAsset(NATURAL, "Natural")
const Brace = createAsset(BRACE, "Brace")
const QuarterNote = createAsset(QUARTER_NOTE, "QuarterNote")
const WholeNote = createAsset(WHOLE_NOTE, "WholeNote")

class NoteGroup extends React.PureComponent {
  static defaultProps = {
    type: "whole"
  }

  constructor(props) {
    super(props)
    this.noteGroup = props.getAsset("wholeNote")
    props.renderGroup.add(this.noteGroup)
    this.refreshPosition()
  }

  refreshPosition() {
    this.noteGroup.translation.set(this.props.x, this.props.y)
  }

  componentDidUpdate() {
    this.refreshPosition()
  }

  componentWillUnmount() {
    if (this.noteGroup) {
      this.noteGroup.remove()
    }
  }

  render() {
    return null
  }
}

// manages a Two.Group for a single staff, clef and including key signature
// all cordinates are done in "staff-local" space, STAFF_HEIGHT_OFFSET
// The staff contains a "notes group" which contains all the notes rendered by the staff
// this should be a react component
class StaffGroup extends React.PureComponent {
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

  static defaultProps = {
    type: "treble",
    keySignature: 0,
    width: 100,
    row: 0,
  }

  constructor(props={}) {
    super(props)
    this.state = {}
    this.width = props.width // TODO: normalize this

    this.getAsset = props.getAsset
    // this will hold all the notes for this staff
    this.notesGroup = new Two.Group()
    this.notesGroup.className = "notesGroup"
  }

  render() {
    this.RefreshStaff ||= Object.assign(React.memo((props) => {
      this.refreshStaff()
      return null
    }), { displayName: "RefreshStaff" })

    const [notes, ledgerLines] = this.makeNotes(this.props.notes || [])

    return React.createElement(React.Fragment, {},
      <this.RefreshStaff
        keySignature={this.props.keySignature}
        type={this.props.type}
        row={this.props.row}
      />,
      ...notes.map(n=> <NoteGroup renderGroup={this.notesGroup} getAsset={this.getAsset} {...n}/>)
    )
  }

  // resize the staff to a new width. Note that this width should be in "staff
  // local" dimensions, with scale unaplied to dom element
  updateWidth(width) {
    this.width = width
    // TODO: test to make sure this works
    if (this.staffGroup) {
      for (const line of this.staffGroup.getByClassName("staffLine")) {
        line.vertices[1].x = this.width
        line.vertices[2].x = this.width
      }
    }
  }

  // offset is real number in number of beats (or columns)
  // TODO: fix this
  updateNotesTranslation(x, y) {
    // TODO: this is not compatible with how margin is currently set on notes
    this.notesGroup.translation.set(x, y)
  }

  componentWillUnmount() {
    if (this.staffGroup) {
      this.staffGroup.remove()
    }
  }

  refreshStaff() {
    if (this.staffGroup) {
      this.staffGroup.remove()
    }

    this.staffGroup = this.makeStaff(this.notesGroup)
    this.props.targetRenderGroup.add(this.staffGroup)
  }


  // creates staff lines, cleff, and key signature, refreshing into render group
  makeStaff(notesGroup) {
    const staffGroup = new Two.Group()

    staffGroup.translation.set(0, MIN_STAFF_DY * this.props.row)

    // the X location where the notes can be rendered from. This will be
    // incremented by initial bar line, key signature, time signature, etc.
    let marginX = 0

    let bar = makeBox(0, 0, BAR_WIDTH, STAFF_INNER_HEIGHT)
    staffGroup.add(bar)
    marginX += BAR_WIDTH

    for (let i = 0; i < 5; i++) {
      let line = makeBox(marginX, i*LINE_DY, this.width - marginX, LINE_HEIGHT)
      line.className = "staffLine"
      staffGroup.add(line)
    }

    if (this.props.type) {
      const staffSettings = this.getStaffSettings()
      const clef =  this.getAsset(staffSettings.clefAsset)
      if (clef) {
        marginX += CLEF_GAP
        clef.translation.set(marginX, STAFF_HEIGHT_OFFSET + staffSettings.assetOffset)
        staffGroup.add(clef)
        marginX += clef.getBoundingClientRect().width
      }
    }

    let keySignature
    if (this.props.keySignature > 0) { // sharp
      keySignature = this.makeKeySignature("sharp", this.props.keySignature)
    } else if (this.props.keySignature < 0) { // flat
      keySignature = this.makeKeySignature("flat", -this.props.keySignature)
    }

    if (keySignature) {
      marginX += CLEF_GAP
      keySignature.translation.set(marginX, 0)
      staffGroup.add(keySignature)
      marginX += keySignature.getBoundingClientRect().width
    }

    const noteOffsetGroup = new Two.Group()
    noteOffsetGroup.translation.set(marginX, 0)
    staffGroup.add(noteOffsetGroup)

    if (notesGroup) {
      noteOffsetGroup.add(notesGroup)
    }

    return staffGroup
  }

  // convert a NoteList into group of positioned note shapes
  makeNotes(noteList, callbackFn) {
    const startTime = performance.now()
    const key = new KeySignature(this.props.keySignature)

    // const notesGroup = new Two.Group()
    // notesGroup.translation.set(this.marginX, 0)

    const outputNotes = []
    const outputLedgerLines = []

    let nextNoteX = CLEF_GAP * 2 // the x position of the next rendred note

    // const noteAsset = this.getAsset("wholeNote")
    // const noteAssetWidth = noteAsset.getBoundingClientRect().width // 106
    const noteAssetWidth = 106

    // column references for shaking notes
    // let noteColumnGroups = []
    //
    let currentNoteColumn = 0

    // the default Y (0) location is the top-most space within the staff
    for (let noteColumn of noteList) {
      if (typeof noteColumn == "string") {
        noteColumn = [noteColumn]
      }

      // TODO: filter the column of notes to not include ones that don't belong on the staff

      // Write the ledger lines for the column
      const [minRow, maxRow] = this.noteColumnRowRanges(noteColumn)
      if (minRow && minRow < 0) {
        let lines = Math.floor(Math.abs(minRow) / 2);
        for (let k=1; k <= lines; k++) {
          // let ledgerLine = makeBox(
          //   nextNoteX - LEDGER_EXTENT, -k*LINE_DY,
          //   noteAssetWidth + LEDGER_EXTENT * 2, LINE_HEIGHT
          // )
          // notesGroup.add(ledgerLine)
          outputLedgerLines.push({
            x: nextNoteX - LEDGER_EXTENT, y: -k*LINE_DY,
            w: noteAssetWidth + LEDGER_EXTENT * 2, h: LINE_HEIGHT
          })
        }
      }

      if (maxRow && maxRow > 8) {
        let lines = Math.abs(Math.floor((maxRow - 8) / 2))
        const lowerLineY = 4 * LINE_DY

        for (let k=1; k <= lines; k++) {
          // let ledgerLine = makeBox(
          //   nextNoteX - LEDGER_EXTENT, lowerLineY + k*LINE_DY,
          //   noteAssetWidth + LEDGER_EXTENT * 2, LINE_HEIGHT
          // )
          // notesGroup.add(ledgerLine)

          outputLedgerLines.push({
            x: nextNoteX - LEDGER_EXTENT, y: lowerLineY + k*LINE_DY,
            w: noteAssetWidth + LEDGER_EXTENT * 2, h: LINE_HEIGHT
          })
        }
      }


      // Write the column of notes
      // let noteColumnGroup = new Two.Group()
      let added = 0

      let sortedColumn = [...noteColumn].sort((a, b) => parseNote(a) - parseNote(b))

      let lastRow = null
      let lastOffset = false
      for (let noteName of sortedColumn) {
        const noteRow = this.noteStaffOffset(noteName)

        // let note = noteAsset.clone()
        // let note = makeBox(0, 0, 10, 10)
        const note = {
          column: currentNoteColumn,
          x: nextNoteX,
          y: this.getNoteY(noteName),
        }

        // let noteY = this.getNoteY(noteName)
        // let noteX = nextNoteX

        // offset the note
        if (!lastOffset && lastRow && Math.abs(noteRow - lastRow) == 1) {
          note.x += Math.floor(noteAssetWidth * 0.90)
          lastOffset = true
        } else {
          lastOffset = false
        }

        // the rendered note will contain anything else around the note (accidentals, etc.)
        let renderedNote = note

        const accidentals = key.accidentalsForNote(noteName)

        let accidental = null
        let accidentalYOffset = 0
        if (accidentals == 0) {
          // accidental = this.getAsset("natural")
          accidental = "natural"
          accidentalYOffset = 61
        } else if (accidentals == 1) {
          // accidental = this.getAsset("sharp")
          accidental = "sharp"
          accidentalYOffset = 58
        } else if (accidentals == -1) {
          // accidental = this.getAsset("flat")
          accidental = "flat"
          accidentalYOffset = 85
        }

        if (accidental) {
          const accidentalGap = 15
          const aWidth = 10 // PLACEHOLDER
          // const {width: aWidth, height: aHeight} = accidental.getBoundingClientRect()
          // accidental.translation.set(nextNoteX - Math.ceil(aWidth) - accidentalGap, noteY - accidentalYOffset + LINE_HALF_DY)
          // TODO: since this is a new object, it will break memoized rendering, just store directly on note object
          // note.accidental = {
          //   type: accidental,
          //   x: nextNoteX - Math.ceil(aWidth) - accidentalGap,
          //   y: note.y - accidentalYOffset + LINE_HALF_DY
          // }

          note.accidental = accidental

          // const g = new Two.Group()
          // g.add(renderedNote)
          // g.add(accidental)
          // renderedNote = g
        }

        // noteColumnGroup.add(renderedNote)

        if (callbackFn) {
          // last arg is the column idx
          // ignore for now
          // callbackFn(renderedNote, noteName, noteColumnGroups.length)
        }

        added += 1
        outputNotes.push(note)
        lastRow = noteRow

        // debug indicator
        // let bar = makeBox(nextNoteX, noteY, 10, 10)
        // bar.fill = "red"
        // noteColumnGroup.add(bar)
      }

      // if (added > 0) {
      //   noteColumnGroups.push(noteColumnGroup)
      //   notesGroup.add(noteColumnGroup)
      // } else {
      //   noteColumnGroups.push(null)
      // }
      currentNoteColumn += 1
      nextNoteX += NOTE_COLUMN_DX
    }

    console.log("makeNotes", performance.now() - startTime)

    // return [notesGroup, noteColumnGroups]
    return [outputNotes, outputLedgerLines]
  }

  // renders new set of notes into the primary note group. Note that the staff
  // must be rendered first to have the render group available
  // callback is called for every note asset after it has been added to
  // thegroup, with positioning information
  renderNotes(notes, callbackFn) {
    let existingPosition

    // remove existing notes if they are there
    if (this.notesGroup) {
      existingPosition = this.notesGroup.translation
      this.notesGroup.remove()
      delete this.notesGroup
      delete this.notesByColumn
    }

    const [renderedNotes, renderedLedgerLines] = this.makeNotes(notes, callbackFn)
    console.log("notes", renderedNotes)

    // We wrap the returned notes group in a new group to allow easy
    // translation on the entire set of notes without affecting whatever
    // translations was set by makeNotes
    this.notesGroup = new Two.Group()

    if (existingPosition) {
      this.notesGroup.translation.set(existingPosition.x, existingPosition.y)
    }

    // this.notesGroup.add(group)
    this.noteColumnGroups = []
    this.renderGroup.add(this.notesGroup)
  }


  // these are the notes to be animated when they press the wrong thing
  getFirstColumnGroup() {
    if (this.noteColumnGroups) {
      return this.noteColumnGroups[0]
    }
  }

  // held note should be a NoteList
  renderHeldNotes(heldNotes) {
    if (this.heldNotesGroup) {
      this.heldNotesGroup.remove()
      delete this.heldNotesGroup
    }

    const [renderedNotes, renderedLedgerLines] = this.makeNotes(heldNotes)

    // group.opacity = 0.25
    // this.heldNotesGroup = group
    // this.renderGroup.add(group)
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
    const settings = StaffGroup.STAFF_TYPES[this.props.type]
    if (!settings) {
      throw new Error(`Don't have staff settings for staff: ${this.props.type}`)
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
    super(props)
    this.state = {}
    this.updaters = [] // animation functions

    this.containerRef = React.createRef()

    this.assets = { } // this will be populated with asset refs when they are fist instantiated
    this.assetCache = {} // the parsed two.js objects
  }

  setOffset(offset) {
    for (const staff of this.getRenderedStaves()) {
      staff.updateNotesTranslation(offset * NOTE_COLUMN_DX, 0)
    }

    // it's not necessary to trigger update if twojs's own animation loop is
    // playing
    if (!this.state.two.playing) {
      this.state.two.update()
    }
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
    this.state.two.unbind("update")
    this.state.two.pause()
    this.containerRef.current.removeChild(this.state.two.renderer.domElement)
  }

  updateWidth(width, force=false) {
    const {two} = this.state
    if (!two) return

    if (force || (two && width != two.width)) {
      // setting dimensions is funky: https://github.com/jonobr1/two.js/issues/191
      two.width = width

      // scale to staff-local space
      let scaledWidth = two.width / this.renderGroup.scale

      for (const staff of this.getRenderedStaves()) {
        staff.updateWidth(scaledWidth)
      }

      two.renderer.setSize(two.width, two.height)
      two.update()
    }
  }

  addUpdate(fn) {
    this.updaters = [...this.updaters, fn]

    if (!this.state.two.playing) {
      // console.log("Starting playing with ", this.updaters.length, "updaters")
      this.state.two.play()
    }

  }

  removeUpdate(fn) {
    this.updaters = this.updaters.filter(f => f != fn)

    if (this.updaters.length == 0 && this.state.two.playing) {
      // console.log("Stopping playing")
      this.state.two.pause()
    }
  }

  componentDidMount() {
    this.createResizeObserver()
    let initialWidth = this.containerRef.current.getBoundingClientRect().width

    const two = new Two({
      width: initialWidth,
      height: this.props.height,
      // type: Two.Types.canvas
    }).appendTo(this.containerRef.current)

    // call updaters when any animations are active
    two.bind("update", (...args) => {
      for (let updater of this.updaters) {
        updater(...args)
      }
    })

    // render group contains the final viewport transformation
    this.renderGroup = two.makeGroup()
    this.renderGroup.scale = 0.5

    // this.refreshStaves()
    // this.refreshNotes()
    // this.scaleToFit()
    
    two.update()
    this.setState({ two })
  }

  // this is a quick hack for development: we should really be using the note
  // range to control the scale to prevent jumping around in size as new notes
  // are generated
  scaleToFit(maxScale=this.props.maxScale) {
    const targetHeight = this.state.two.height
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
      this.updateWidth(this.state.two.width, true)
      return true
    }

    return false
  }

  getRenderedStaves() {
    const out = []

    if (this.trebleStaffRef && this.trebleStaffRef.current) {
      out.push(this.trebleStaffRef.current)
    }

    if (this.bassStaffRef && this.bassStaffRef.current) {
      out.push(this.bassStaffRef.current)
    }

    if (this.altoStaffRef && this.altoStaffRef.current) {
      out.push(this.altoStaffRef.current)
    }

    return out
  }

  renderStaves() {
    if (!this.state.two) {
      // canvas isn't ready yet
      return
    }

    const startTime = performance.now()

    let marginX = 0

    const getAsset = this._getAsset || this.getAsset.bind(this)

    const staffProps = {
      // two: this.state.two,
      targetRenderGroup: this.renderGroup,
      getAsset,
      keySignature: this.props.keySignature.getCount(), // TODO: just pass key signature to avoid additional work
      width: Math.floor(this.state.two.width / this.renderGroup.scale)
    }

    switch (this.props.type) {
      case "grand": {
        let trebleNotes, bassNotes

        if (this.props.notes) {
          [trebleNotes, bassNotes] = this.props.notes.splitForGrandStaff()
        }

        return <>
          <StaffGroup
            row={0}
            ref={this.trebleStaffRef ||= React.createRef()}
            type="treble"
            notes={trebleNotes}
            {...staffProps}
          />
          <StaffGroup
            row={1}
            ref={this.bassStaffRef ||= React.createRef()}
            type="bass"
            notes={bassNotes}
            {...staffProps}
          />
        </>
      }
      case "treble": {
        return <StaffGroup
          ref={this.trebleStaffRef ||= React.createRef()}
          type="treble"
          notes={this.props.notes}
          {...staffProps}
        />
      }
      case "bass": {
        return <StaffGroup
          type="bass"
          ref={this.bassStaffRef ||= React.createRef()}
          notes={this.props.notes}
          {...staffProps}
        />
      }
      case "alto": {
        return <StaffGroup
          type="alto"
          ref={this.altoStaffRef ||= React.createRef()}
          notes={this.props.notes}
          {...staffProps}
        />
      }
    }

    throw new Error("Unhandled staff type in renderStaves")

    // add the brace. Note the bace sits in negative coordinates so we aren't changing origin of staves
    // TODO: make work as a component
    if (this.props.type == "grand") {
      const braceMargin = CLEF_GAP / 2
      const brace = this.getAsset("brace")
      const {width: braceWidth, height: braceHeight} = brace.getBoundingClientRect()

      const staffHeight = LINE_DY * 4 + LINE_HEIGHT

      let targetHeight = STAFF_INNER_HEIGHT + (this.staves.length - 1)  * MIN_STAFF_DY

      brace.translation.set(-braceWidth - braceMargin, 0)
      brace.scale = new Two.Vector(1, targetHeight / braceHeight)

      marginX = braceWidth + braceMargin
      this.stavesGroup.add(brace)
    }

    this.stavesGroup.translation.set(marginX, -STAFF_HEIGHT_OFFSET)
    this.stavesGroup.addTo(this.renderGroup)

    console.log("Refresh staves", performance.now() - startTime)
  }

  // calculate positions of all rendered notes
  refreshNotes() {
    const startTime = performance.now()

    if (this.props.notes) {
      const heldPitches = {}

      if (this.props.heldNotes) {
        for (const k of Object.keys(this.props.heldNotes)) {
          heldPitches[parseNote(k)] =  true
        }
      }

      // this will make the rendereed notes that match held notes invisible, to
      // allow the pressed status to be seen
      const filterHeld = (g, noteName, column) => {
        if (column == 0 && heldPitches[parseNote(noteName)]) {
          g.opacity = 0
        }
      }

      if (this.props.type == "grand") {
        // split incoming notes into two NoteLists
        const [trebleNotes, bassNotes] = this.props.notes.splitForGrandStaff()


        this.staves[0].renderNotes(trebleNotes, filterHeld)
        if (this.staves[1]) {
          this.staves[1].renderNotes(bassNotes, filterHeld)
        }
      } else {
        // render everything into the first staff
        this.staves[0].renderNotes(this.props.notes, filterHeld)
      }
    }

    if (this.props.heldNotes) {
      const heldNotes = new NoteList([Object.keys(this.props.heldNotes)])

      if (this.props.type == "grand") {
        if (this.props.notes) {
          heldNotes.unshift(this.props.notes.currentColumn())
        }

        const [heldTreble, heldBass] = heldNotes.splitForGrandStaff()
        heldTreble.shift()
        heldBass.shift()

        this.staves[0].renderHeldNotes(heldTreble)

        if (this.staves[1]) {
          this.staves[1].renderHeldNotes(heldBass)
        }
      } else {
        this.staves[0].renderHeldNotes(heldNotes)
      }
    }

    console.log("Refresh notes", performance.now() - startTime)
  }

  // add StaffGroup to list of staves managed by this component
  // TODO: remove me, now managed by react
  addStaff(staffGroup) {
    // TODO: the DY of each staff should be dynamically calculated to make
    // space for ledger lines

    this.staves ||= []
    this.staves.push(staffGroup)

    const g = staffGroup.renderToGroup()
    g.translation.set(0, (this.staves.length - 1) * MIN_STAFF_DY)
    g.addTo(this.stavesGroup)
  }

  // this will return a fresh copy of the asset that can be mutated
  getAsset(name) {
    const startTime = performance.now()

    this.assetCache ||= {}

    if (!this.assetCache[name]) {
      const domNode = this.assets[name].current

      if (!domNode) {
        throw new Error("Failed to find asset by name: " + name)
      }

      const loaded = this.state.two.interpret(domNode, false, false)
      this.assetCache[name] = loaded
    }

    const asset = this.assetCache[name].clone()

    console.log("Load Asset", name, performance.now() - startTime)
    return asset
  }

  // NOTE: flushChanges is set by the prop watchers in the rendered contents of
  // this widget. componentDidUpdate is called after all children have
  // rendered, so we can use it to apply the updates to the scene graph to the
  // output
  componentDidUpdate(prevProps, prevState) {
    if (this.flushChanges) {
      console.log("flushing changes...")
      this.flushChanges = false
      this.scaleToFit()

      // update not necesary if we are playing an animation, it will happen
      // next frame
      if (!this.state.two.playing) {
        const startTime = performance.now()
        this.state.two.update()
        console.log("Single update", performance.now() - startTime)
      }
    }
  }

  // makes a react component for enabling and disabling an animation
  makeAnimator(displayName, makeFunction) {
    return Object.assign(React.memo(props => {
      React.useEffect(() => {
        const updater = makeFunction()
        this.addUpdate(updater)
        return () => {
          this.removeUpdate(updater)
          updater(-1, 0) // signal removal of animator
          this.state.two.update() // synchronize any changes from removal of update
        }
      })
    }), { displayName })
  }

  getFirstColumnGroups() {
    const out = []

    if (this.staves) {
      for (const staff of this.staves) {
        const group = staff.getFirstColumnGroup()
        if (group) {
          out.push(group)
        }
      }
    }
    return out
  }

  render() {
    this.RefreshNotes ||= Object.assign(React.memo((props) => {
      if (this.renderGroup) {
        // this.refreshNotes()
        this.flushChanges = true
      }
      return null
    }), {
      displayName: "RefreshNotes"
    })

    this.RefreshStaves ||= Object.assign(React.memo((props) => {
      if (this.renderGroup) {
        // this.refreshStaves()
        this.flushChanges = true
      }
      return null
    }), { displayName: "RefreshStaves" })


    this.NoteShaker ||= this.makeAnimator("NoteShaker", () => {
      let elapsed = 0
      return (frame, dt) => {
        const scale = (1 - Math.max(0, elapsed - 250) / 250)
        for (const group of this.getFirstColumnGroups()) {
          if (frame > 0) {
            group.translation.set(Math.sin(elapsed/3)*10*scale, 0)
          } else {
            group.translation.set(0,0)
          }
        }

        elapsed += dt
      }
    })

    return <div className="notes_staff" ref={this.containerRef}>
      {this.renderStaves()}

      <this.RefreshNotes
        notes={this.props.notes}
        heldNotes={this.props.heldNotes}
      />

      <this.RefreshStaves
        type={this.props.type}
        keySignature={this.props.keySignature}
      />

      {this.props.noteShaking ? <this.NoteShaker /> : null}

      <div className="assets" style={{display: "none"}}>
        <GClef ref={this.assets.gclef ||= React.createRef()} />
        <FClef ref={this.assets.fclef ||= React.createRef()} />
        <CClef ref={this.assets.cclef ||= React.createRef()} />
        <Brace ref={this.assets.brace ||= React.createRef()} />
        <Flat ref={this.assets.flat ||= React.createRef()} />
        <Sharp ref={this.assets.sharp ||= React.createRef()} />
        <Natural ref={this.assets.natural ||= React.createRef()} />
        <WholeNote ref={this.assets.wholeNote ||= React.createRef()} />
        <QuarterNote ref={this.assets.quarterNote ||= React.createRef()} />
      </div>
    </div>
  }
}
