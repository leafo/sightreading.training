import * as React from "react"
import PracticeTimer from "st/components/practice_timer"
import SightReadingPage from "st/components/pages/sight_reading_page"
import {IconTimer, IconEye} from "st/components/control_icons"
import {renderToStaticMarkup} from "react-dom/server"
import ScalesPage from "st/components/pages/guitar_scales_page"
import ChordLabPage from "st/components/pages/chord_lab_page"
import ChordReferencePage from "st/components/pages/chord_reference_page"
import PianoVisual from "st/components/piano_visual"
import GuitarFretboard from "st/components/guitar_fretboard"
import ToolOptions from "st/components/tool_options"
import {guitarScale} from "st/guitar_scales"
import {searchChords} from "st/chord_reference"
import {CHORD_SHAPES, chordNote, suggestChords} from "st/chord_lab"
import {chordTones} from "st/chord_display"
import {guitarChordVoicings, noteClass} from "st/guitar_chords"
import {readToolState, writeToolState, scalesState, labState, referenceState, persistToolPage} from "st/tool_preferences"

function elements(node) {
  if (!node || typeof node !== "object") return []
  return [node, ...[node.props?.children].flat(Infinity).flatMap(elements)]
}
function pageState(page) {
  page.setState = update => Object.assign(page.state, typeof update === "function" ? update(page.state) : update)
  return page
}

describe("Saved tool selections", () => {
  let original, data, storage
  beforeEach(() => {
    original = Object.getOwnPropertyDescriptor(globalThis, "localStorage")
    data = new Map()
    storage = {getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value)}
    Object.defineProperty(globalThis, "localStorage", {value: storage, configurable: true})
  })
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, "localStorage", original)
    else delete globalThis.localStorage
  })
  it("restores Scales, Lab and Reference selections in new page instances", () => {
    const scales = pageState(new ScalesPage({}))
    const previous = {...scales.state}
    scales.setState({root: "Db", type: "Major", instrument: "piano", labels: "both"})
    scales.componentDidUpdate({}, previous)
    expect(new ScalesPage({}).state).toEqual(scalesState(scales.state))
    const lab = pageState(new ChordLabPage({}))
    const oldLab = {...lab.state}
    lab.setState({instrument: "piano", frets: [null, 3, 2, 0, 1, 0], pianoNotes: [52, 55, 60], labels: "degrees", showAllNotes: true, midiNotes: [60, 64, 67]})
    lab.componentDidUpdate({}, oldLab)
    const restored = new ChordLabPage({})
    expect(restored.state.frets).toEqual(lab.state.frets)
    expect(restored.state.pianoNotes).toEqual([52, 55, 60])
    expect(restored.state.labels).toBe("degrees")
    expect(restored.state.showAllNotes).toBeTrue()
    expect(restored.state.midiNotes).toEqual([])
    const ref = pageState(new ChordReferencePage({}))
    const oldRef = {...ref.state}
    ref.setState({query: "D dreamy", root: "D", family: "minor", visible: 48})
    ref.componentDidUpdate({}, oldRef)
    expect(new ChordReferencePage({}).state).toEqual(referenceState(ref.state))
  })
  it("bounds and validates corrupt, old-version and malformed state", () => {
    data.set("napland:scales:v1", "not JSON")
    expect(readToolState("scales", scalesState)).toEqual(scalesState())
    data.set("napland:scales:v1", JSON.stringify({version: 20, state: {instrument: "piano"}}))
    expect(readToolState("scales", scalesState).instrument).toBe("guitar")
    writeToolState("chord-lab", {frets: [1, 2], instrument: "unknown", pianoNotes: [48, 48, 200, -1, "60"], labels: "unknown"}, labState)
    expect(readToolState("chord-lab", labState)).toEqual(labState({pianoNotes: [48]}))
    expect(referenceState({query: "x".repeat(1000), visible: 100000}).query.length).toBe(80)
    expect(referenceState({visible: 100000}).visible).toBe(24)
  })
  it("keeps tools usable with denied storage and retries on the next real change", () => {
    storage.setItem = () => {throw new Error("quota")}
    const page = pageState(new ScalesPage({}))
    const previous = {...page.state}
    page.setState({instrument: "piano"})
    persistToolPage(page, "scales", scalesState, previous)
    expect(page.state.instrument).toBe("piano")
    expect(page.state.storageWarning).toContain("could not be saved")
    storage.setItem = (key, value) => data.set(key, value)
    const last = {...page.state}
    page.setState({labels: "both"})
    persistToolPage(page, "scales", scalesState, last)
    expect(readToolState("scales", scalesState).labels).toBe("both")
  })
})

describe("Scale and chord instrument displays", () => {
  it("labels minor pentatonic intervals correctly and highlights a two-octave piano", () => {
    const {notes} = guitarScale("A", "Minor pentatonic", 12)
    expect(notes.map(note => note.interval)).toEqual(["1", "♭3", "4", "5", "♭7"])
    const markup = renderToStaticMarkup(<PianoVisual tones={notes} labels="both" />)
    expect((markup.match(/role="img"/g) || []).length).toBe(25)
    expect(markup).toContain("C3, degree ♭3, highlighted")
    expect(markup).toContain("C5, degree ♭3, highlighted")
    expect(markup).toContain("A3, degree 1, highlighted")
    expect(markup).not.toContain("F3, highlighted")
    expect(markup).toContain("C ♭3")
    const flats = renderToStaticMarkup(<PianoVisual tones={guitarScale("Db", "Major", 12).notes} labels="degrees" />)
    expect(flats).toContain("D♭3, degree 1, highlighted")
  })
  it("uses the same 0–12 fretboard for scale notes and chord input", () => {
    const scale = renderToStaticMarkup(<GuitarFretboard tones={guitarScale("A", "Minor pentatonic", 12).notes} labels="degrees" />)
    expect((scale.match(/role="img"/g) || []).length).toBe(78)
    expect(scale).toContain("Low E fret 12")
    expect(scale).toContain("Low E fret 5, A, degree 1, highlighted")
    const chord = renderToStaticMarkup(<GuitarFretboard frets={[null, 3, 2, 0, 1, 0]} tones={chordTones("C")} labels="both" onChange={() => {}} onReset={() => {}} />)
    expect(chord).toContain('aria-label="Reset fretboard"')
    expect(chord).toContain("C 1")
    expect(chord).not.toContain("Note names</button>")
  })
  it("puts instrument and label controls in options and removes obsolete sections", () => {
    const page = new ChordLabPage({})
    const nodes = elements(page.render())
    const options = nodes.find(node => node.type === ToolOptions)
    expect(elements(options).filter(node => node.type === "select").length).toBe(3)
    expect(elements(options).some(node => node.type === "input" && node.props.type === "checkbox")).toBeTrue()
    expect(nodes.some(node => node.props?.children === "Try an example")).toBeFalse()
    expect(nodes.some(node => node.props?.children === "Enter frets by string")).toBeFalse()
  })
  it("shows chord degrees with extensions and uses the chord root for inversions", () => {
    expect(chordTones("C9").map(tone => tone.interval)).toEqual(["1", "3", "5", "♭7", "9"])
    expect(chordTones("C/E").find(tone => tone.name === "E").interval).toBe("3")
  })
})

describe("Chord exploration", () => {
  it("suggests exact note changes for near matches while preserving the input", () => {
    const pitches = [60, 64, 65, 67]
    const suggestions = suggestChords(pitches)
    expect(suggestions.find(chord => chord.name === "C")).toEqual({name: "C", missing: [], extra: ["F"]})
    expect(pitches).toEqual([60, 64, 65, 67])
    expect(suggestChords([60, 64, 67])).toEqual([])
    expect(suggestChords([60])).toEqual([])
    for (const suggestion of suggestions) {
      const changed = new Set(pitches.map(pitch => pitch % 12))
      suggestion.extra.forEach(note => changed.delete(noteClass(note)))
      suggestion.missing.forEach(note => changed.add(noteClass(note)))
      expect([...changed].sort()).toEqual(searchChords(suggestion.name)[0].notes.map(noteClass).sort())
    }
  })
  it("retains moveable and less-common alternatives alongside familiar shapes", () => {
    for (const name of ["C", "G", "F", "Am", "Cmaj7", "Bdim7"]) {
      const shapes = guitarChordVoicings(searchChords(name)[0].notes, 18)
      const moveable = shapes.filter(shape => shape.category === "Moveable")
      expect(moveable.length).withContext(name).toBeGreaterThan(0)
      expect(moveable.every(shape => shape.frets.every(fret => fret !== 0))).toBeTrue()
      expect(new Set(shapes.map(shape => shape.frets.join(","))).size).toBe(shapes.length)
    }
    for (let root = 0; root < 12; root++) {
      for (const [shape, steps] of Object.entries(CHORD_SHAPES)) {
        let pitch = root
        const tones = [chordNote(root), ...steps.map(step => chordNote(pitch += step))]
        expect(guitarChordVoicings(tones, 18).some(voicing => voicing.category === "Moveable"))
          .withContext(`${chordNote(root)} ${shape}`).toBeTrue()
      }
    }
    const inversion = guitarChordVoicings(["C", "E", "G"], 18, "E")
    expect(inversion.length).toBeGreaterThan(0)
    expect(inversion[0].frets.some(fret => fret !== null)).toBeTrue()
  })
})


describe("Icon-only practice controls", () => {
  it("keeps timer text and countdown in accessible labels rather than button content", () => {
    const timer = new PracticeTimer({})
    let button = elements(timer.render()).find(node => node.type === "button")
    expect(button.props["aria-label"]).toBe("Practice timer")
    expect(button.props.children.type).toBe(IconTimer)
    timer.state = {...timer.state, now: 0, run: {remaining: 1, deadline: 60000}}
    button = elements(timer.render()).find(node => node.type === "button")
    expect(button.props["aria-label"]).toContain("1:00")
    expect(button.props.children.type).toBe(IconTimer)
  })
  it("switches the keyboard eye icon and screen-reader action without visible text", () => {
    const page = {state: {currentStaff: {mode: "notes"}, keyboardOpen: true}, toggleKeyboard() {}}
    let button = SightReadingPage.prototype.renderKeyboardToggle.call(page)
    expect(button.props["aria-label"]).toBe("Hide keyboard")
    expect(button.props.children.type).toBe(IconEye)
    expect(button.props.children.props.hidden).toBe(true)
    page.state.keyboardOpen = false
    button = SightReadingPage.prototype.renderKeyboardToggle.call(page)
    expect(button.props["aria-label"]).toBe("Show keyboard")
    expect(button.props.children.props.hidden).toBe(false)
  })
})
