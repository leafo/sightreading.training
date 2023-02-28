
// Read this for refresher on terminology: https://en.wikipedia.org/wiki/Staff_(music)

import * as React from "react"
import classNames from "classnames"
import * as types from "prop-types"

import Two from "two.js"

const STAFF_HEIGHT_OFFSET = -100
const STAFF_INNER_HEIGHT = 236

const BAR_WIDTH = 12
const LEDGER_HEIGHT = 4
const LEDGER_DY = 58
const CLEF_GAP = 28
const NOTE_GAP = 22

import {CLEF_G, CLEF_F, FLAT, SHARP, QUARTER_NOTE, WHOLE_NOTE} from "st/staff_assets"

import {parseNote} from "st/music"

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

// we wrap in components so we can fetch them by reference
const GClef = createAsset(CLEF_G, "GClef")
const FClef = createAsset(CLEF_F, "FClef")
const Flat = createAsset(FLAT, "Flat")
const Sharp = createAsset(SHARP, "Sharp")
const QuarterNote = createAsset(QUARTER_NOTE, "QuarterNote")
const WholeNote = createAsset(WHOLE_NOTE, "WholeNote")

// manages a Two.Group for a single staff, clef and including key signature
// all cordinates are done in "staff local" space, STAFF_HEIGHT_OFFSET
class StaffGroup {
  constructor(params={}) {
    this.getAsset = params.getAsset
    this.clef = params.clef || "g"
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

  // renders the two group, throwing away existing one if it already exists
  render() {
    this.renderGroup = new Two.Group()

    this.marginX = 0

    let bar = this.makeBar(0, 0, BAR_WIDTH, STAFF_INNER_HEIGHT)
    this.renderGroup.add(bar)
    this.marginX += BAR_WIDTH

    this.lines ||= []
    for (let i = 0; i < 5; i++) {
      let line = this.makeBar(this.marginX, i*LEDGER_DY, this.width - this.marginX, LEDGER_HEIGHT)
      this.renderGroup.add(line)
      this.lines.push(line)
    }

    if (this.clef == "g") {
      const clef = this.getAsset("gclef")
      this.renderGroup.add(clef)
      this.marginX += CLEF_GAP
      clef.translation.set(this.marginX, STAFF_HEIGHT_OFFSET + 14)
      this.marginX += clef.getBoundingClientRect().width
    } else if (this.clef == "f") {
      const clef = this.getAsset("fclef")

      this.renderGroup.add(clef)
      this.marginX += CLEF_GAP
      clef.translation.set(this.marginX, STAFF_HEIGHT_OFFSET + 102)
      this.marginX += clef.getBoundingClientRect().width
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

    this.notesGroup = new Two.Group()
    this.notesGroup.translation.set(this.marginX, 0)
    this.notesGroup.addTo(this.renderGroup)
    return this.renderGroup
  }

  makeKeySignature(type, count) {
    let offsets, accidentalAsset

    // these offsets apply to G clef with default staff height offset
    if (type == "flat") {
      offsets = [133, 42, 158, 67, 191, 100, 216]
      // asset = this.assets.flat.current
      accidentalAsset = this.getAsset("flat")
    } else if (type == "sharp") {
      offsets = [42, 129, 14, 101, 187, 71, 158]
      // asset = this.assets.sharp.current
      accidentalAsset = this.getAsset("sharp")
    } else {
      throw new Error("Unknown type for makeKeySignature: " + type)
    }

    let group = new Two.Group()

    let offsetX = 0
    const accidentalGap = 4
    for (var k = 0; k < count; k++) {
      let a = accidentalAsset.clone()
      a.translation.set(offsetX, offsets[k] + STAFF_HEIGHT_OFFSET)
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
}

export class NotesStaff extends React.PureComponent {
  static propTypes = {
    type: types.oneOf(["treble", "bass", "grand"])
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

  updateWidth(width) {
    if (this.two && width != this.two.width) {
      // setting dimensions is funky: https://github.com/jonobr1/two.js/issues/191
      this.two.width = width

      // scale to staff local space
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
      height: 600,
      // type: Two.Types.canvas
    }).appendTo(this.containerRef.current)

    // render group contains the final viewport transformation
    this.renderGroup = this.two.makeGroup()
    this.renderGroup.scale = 0.5

    this.refreshStaves()
    this.refreshNotes()

    this.two.update()
  }

  refreshStaves() {
    if (this.stavesGroup) {
      this.stavesGroup.remove(...this.stavesGroup.children)
    } else {
      this.stavesGroup = new Two.Group()
      this.stavesGroup.translation.set(0, -STAFF_HEIGHT_OFFSET)
      this.stavesGroup.addTo(this.renderGroup)
    }

    this.staves = []

    if (this.props.type == "treble" || this.props.type == "grand") {
      this.addStaff(new StaffGroup({
        getAsset: this.getAsset.bind(this),
        clef: "g",
        keySignature: this.props.keySignature.getCount(),
        width: this.two.width / this.renderGroup.scale
      }))
    }

    if (this.props.type == "bass" || this.props.type == "grand") {
      this.addStaff(new StaffGroup({
        getAsset: this.getAsset.bind(this),
        clef: "f",
        keySignature: this.props.keySignature.getCount(),
        width: this.two.width / this.renderGroup.scale
      }))
    }
  }

  // this will update all the visible notes
  refreshNotes() {
    if (!this.props.notes) {
      return
    }

    let col = 0

    const halfHeight = 29

    const notesGroup = this.staves[0].getNotesGroup()
    const noteMargin = 0
    let noteOffset = CLEF_GAP

    let noteY = 0

    const quarterNote = this.getAsset("quarterNote")
    const quarterNoteWidth = quarterNote.getBoundingClientRect().width

    // console.log("refresh notes", this.props.notes)
    for (let noteColumn of this.props.notes) {
      for (let note of noteColumn) {
        let value = parseNote(note)
        let n = quarterNote.clone()
        n.translation.set(noteOffset, noteY)
        notesGroup.add(n)

        noteOffset += quarterNoteWidth + NOTE_GAP
        noteY += halfHeight
      }
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

  getAsset(name) {
    const domNode = this.assets[name].current

    if (!domNode) {
      throw new Error("Failed to find asset by name: " + name)
    }

    const asset = this.two.interpret(domNode)
    asset.remove() // remove it from default scene
    return asset
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.notes != this.props.notes) {
      this.refreshNotes()
      this.two.update()
    }

    if (prevProps.keySignature != this.props.keySignature) {
      this.refreshStaves()
      this.refreshNotes()
      this.two.update()
    }
  }

  render() {
    return <div className="notes_staff" ref={this.containerRef}>
      <div ref={this.assetsRef} className="assets" style={{display: "none"}}>
        <GClef ref={this.assets.gclef ||= React.createRef()} />
        <FClef ref={this.assets.fclef ||= React.createRef()} />
        <Flat ref={this.assets.flat ||= React.createRef()} />
        <Sharp ref={this.assets.sharp ||= React.createRef()} />
        <WholeNote ref={this.assets.wholeNote ||= React.createRef()} />
        <QuarterNote ref={this.assets.quarterNote ||= React.createRef()} />
      </div>
    </div>
  }
}
