
import * as React from "react"
import classNames from "classnames"
import * as types from "prop-types"

import Two from "two.js";

const STAFF_HEIGHT_OFFSET = -100
const STAFF_INNER_HEIGHT = 236

const BAR_WIDTH = 12
const LEDGER_HEIGHT = 4
const LEDGER_DY = 58
const CLEF_GAP = 28

import {CLEF_G, CLEF_F, FLAT, SHARP, QUARTER_NOTE, WHOLE_NOTE} from "st/staff_assets"

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

export class NotesStaff extends React.Component {
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
  }

  updateWidth(width) {
    console.log("updating width to", width, this.two && width != this.two.width)
    if (this.two && width != this.two.width) {
      // setting dimensions is funky: https://github.com/jonobr1/two.js/issues/191
      this.two.width = width

      if (this.lines) {

        console.log("unscaled width:", this.two.width / this.renderGroup.scale)
        let newWidth = (this.two.width / this.renderGroup.scale) / 2 - BAR_WIDTH

        let xx = 0
        for (let line of this.lines) {
          console.log("line " + xx++)
          for (let v of line.vertices) {
            console.log(v.x, v.y)
          }

          line.vertices[1].x = newWidth
          line.vertices[2].x = newWidth
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


    // render group contains the final transformation
    this.renderGroup = this.two.makeGroup()
    this.renderGroup.scale = 0.5

    this.makeStaff({clef: "g", width: initialWidth / this.renderGroup.scale}).addTo(this.renderGroup)

    this.two.update()
  }

  makeStaff(params={}) {
    const group = new Two.Group()

    let marginX = 0 // the left coordinate where the next item will be drawn

    let bar = this.makeBar(0, 0, BAR_WIDTH, STAFF_INNER_HEIGHT)
    group.add(bar)
    marginX += BAR_WIDTH

    this.lines ||= []


    console.log("initial width", params.width)
    for (let i = 0; i < 5; i++) {
      let line = this.makeBar(marginX, i*LEDGER_DY, params.width / 2 || 1000, LEDGER_HEIGHT)

      console.log("created line", line.vertices.map(v => [v.x, v.y].join(",") ), "from",
        marginX, i*LEDGER_DY, params.width / 2 || 1000, LEDGER_HEIGHT
      )

      // line.corner()
      group.add(line)
      this.lines.push(line)
    }

    let clef = this.two.interpret(this.assets.gclef.current).addTo(group)
    marginX += CLEF_GAP
    clef.translation.set(marginX, STAFF_HEIGHT_OFFSET + 14)

    marginX += clef.getBoundingClientRect().width

    // test sharp signature
    let keySignature = this.makeKeySignature("sharp", 7)
    marginX += CLEF_GAP
    keySignature.translation.set(marginX,  0)
    group.add(keySignature)
    marginX += keySignature.getBoundingClientRect().width

    // test flat signature
    let flatSignature = this.makeKeySignature("flat", 7)
    marginX += CLEF_GAP
    flatSignature.translation.set(marginX,  0)
    group.add(flatSignature)
    marginX += flatSignature.getBoundingClientRect().width

    group.translation.set(0, -STAFF_HEIGHT_OFFSET)

    // TODO: this should also return the offset where notes can start to be placed
    return group
  }

  makeKeySignature(type, count) {
    let offsets, asset

    // these offsets apply to G clef with default staff height offset
    if (type == "flat") {
      offsets = [133, 42, 158, 67, 191, 100, 216]
      asset = this.assets.flat.current
    } else if (type == "sharp") {
      offsets = [42, 129, 14, 101, 187, 71, 158]
      asset = this.assets.sharp.current
    } else {
      throw new Error("Unknown type for makeKeySignature: " + type)
    }

    let group = new Two.Group()

    let offsetX = 0
    const accidentalGap = 4
    for (var k = 0; k < 7; k++) {
      let a = this.two.interpret(asset)
      a.translation.set(offsetX, offsets[k] + STAFF_HEIGHT_OFFSET)
      offsetX += a.getBoundingClientRect().width + accidentalGap
      group.add(a)
    }

    return group
  }

  // render all the notes as quarter notes
  makeNotes() {
    const group = new Two.Group()
  }

  // this makes a rectangle with the origin on the top left, since the built in
  // make rectangle function uses the center for some reason
  makeBar(x,y,w,h) {
    let bar = this.two.makePath(x, y,
      x + w, y,
      x + w, y + h,
      x, y + h,
      true
    )

    bar.fill = "black"
    bar.noStroke()

    return bar
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
