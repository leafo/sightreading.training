
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

const GClef = createAsset(CLEF_G, "GClef")
const FClef = createAsset(CLEF_F, "FClef")
const CClef = createAsset(CLEF_C, "CClef")
const Flat = createAsset(FLAT, "Flat")
const Sharp = createAsset(SHARP, "Sharp")
const Natural = createAsset(NATURAL, "Natural")
const Brace = createAsset(BRACE, "Brace")
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


  // offset is real number in number of beats (or columns)
  updateNotesTranslation(x, y) {
    this.notesGroup.translation.set(x, y)
  }

  // creates a two.group for the staff, but not containing any notes. Ledger lines are inserted by the notes group
  renderToGroup() {
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

  // convet a NoteList into group of positioned note shapes
  makeNotes(noteList, callbackFn) {
    const key = new KeySignature(this.keySignature)

    const notesGroup = new Two.Group()
    notesGroup.translation.set(this.marginX, 0)

    let nextNoteX = CLEF_GAP * 2 // the x position of the next rendred note

    const noteAsset = this.getAsset("wholeNote")
    const noteAssetWidth = noteAsset.getBoundingClientRect().width

    // direct references to the note objects so we can animate them
    let noteColumnGroups = []

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


      // Write the column of notes
      let noteColumnGroup = new Two.Group()
      let added = 0

      let sortedColumn = [...noteColumn].sort((a, b) => parseNote(a) - parseNote(b))

      let lastRow = null
      let lastOffset = false
      for (let noteName of sortedColumn) {
        const noteRow = this.noteStaffOffset(noteName)

        let note = noteAsset.clone()

        let noteY = this.getNoteY(noteName)
        let noteX = nextNoteX

        // offset the note
        if (!lastOffset && lastRow && Math.abs(noteRow - lastRow) == 1) {
          noteX += Math.floor(note.getBoundingClientRect().width * 0.90)
          lastOffset = true
        } else {
          lastOffset = false
        }

        note.translation.set(noteX, noteY)

        // the rendered note will contain anything else around the note (accidentals, etc.)
        let renderedNote = note

        const accidentals = key.accidentalsForNote(noteName)

        let accidental = null
        let accidentalYOffset = 0
        if (accidentals == 0) {
          accidental = this.getAsset("natural")
          accidentalYOffset = 61
        } else if (accidentals == 1) {
          accidental = this.getAsset("sharp")
          accidentalYOffset = 58
        } else if (accidentals == -1) {
          accidental = this.getAsset("flat")
          accidentalYOffset = 85
        }

        if (accidental) {
          const accidentalGap = 15
          const {width: aWidth, height: aHeight} = accidental.getBoundingClientRect()
          accidental.translation.set(nextNoteX - Math.ceil(aWidth) - accidentalGap, noteY - accidentalYOffset + LINE_HALF_DY)

          const g = new Two.Group()
          g.add(renderedNote)
          g.add(accidental)
          renderedNote = g
        }

        noteColumnGroup.add(renderedNote)

        if (callbackFn) {
          // last arg is the column idx
          callbackFn(renderedNote, noteName, noteColumnGroups.length)
        }

        added += 1
        lastRow = noteRow

        // debug indicator
        // let bar = this.makeBar(nextNoteX, noteY, 10, 10)
        // bar.fill = "red"
        // noteColumnGroup.add(bar)
      }

      if (added > 0) {
        noteColumnGroups.push(noteColumnGroup)
        notesGroup.add(noteColumnGroup)
      } else {
        noteColumnGroups.push(null)
      }

      nextNoteX += NOTE_COLUMN_DX
    }

    return [notesGroup, noteColumnGroups]
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

    const [group, noteColumnGroups] = this.makeNotes(notes, callbackFn)

    // We wrap the returned notes group in a new group to allow easy
    // translation on the entire set of notes without affecting whatever
    // translations was set by makeNotes
    this.notesGroup = new Two.Group()

    if (existingPosition) {
      this.notesGroup.translation.set(existingPosition.x, existingPosition.y)
    }

    this.notesGroup.add(group)
    this.noteColumnGroups = noteColumnGroups
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

    const [group, notesByColumn] = this.makeNotes(heldNotes)
    group.opacity = 0.25
    this.heldNotesGroup = group
    this.renderGroup.add(group)
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
    this.updaters = [] // animation functions

    this.containerRef = React.createRef()
    this.assetsRef = React.createRef()

    this.assets = { } // this will be populated with asset refs when they are fist instantiated

    this.assetCache = {} // the parsed two.js objects
  }

  setOffset(offset) {
    for (const staff of this.staves) {
      staff.updateNotesTranslation(offset * NOTE_COLUMN_DX, 0)
    }

    // it's not necessary to trigger update if twojs's own animation loop is
    // playing
    if (!this.two.playing) {
      this.two.update()
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

  addUpdate(fn) {
    this.updaters = [...this.updaters, fn]

    if (!this.two.playing) {
      console.log("Starting playing with ", this.updaters.length, "updaters")
      this.two.play()
    }

  }

  removeUpdate(fn) {
    this.updaters = this.updaters.filter(f => f != fn)

    if (this.updaters.length == 0 && this.two.playing) {
      console.log("Stopping playing")
      this.two.pause()
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

    // call updaters when any animations are active
    this.two.bind("update", (...args) => {
      for (let updater of this.updaters) {
        updater(...args)
      }
    })

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
    this.staves = []

    let marginX = 0

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

    // add the brace. Note the bace sits in negative coordinates so we aren't changing origin of staves
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
  }

  // update the rendered set of notes from the notes props
  refreshNotes() {
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
  }

  // add StaffGroup to list of staves managed by this component
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

      const loaded = this.two.interpret(domNode)
      loaded.remove() // remove it from default scene
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
      this.flushChanges = false
      this.scaleToFit()

      // update not necesary if we are playing an animation, it will happen
      // next frame
      if (!this.two.playing) {
        this.two.update()
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
          this.two.update() // synchronize any changes from removal of update
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
      <this.RefreshNotes
        notes={this.props.notes}
        heldNotes={this.props.heldNotes}
      />

      <this.RefreshStaves
        type={this.props.type}
        keySignature={this.props.keySignature}
      />

      {this.props.noteShaking ? <this.NoteShaker /> : null}

      <div ref={this.assetsRef} className="assets" style={{display: "none"}}>
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
