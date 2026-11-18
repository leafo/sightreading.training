import PianoVisual from "st/components/piano_visual"
import ChordLabPage from "st/components/pages/chord_lab_page"
import {guitarVoicing, identifyChords} from "st/chord_lab"

describe("Chord Lab", () => {
  it("identifies piano inversions independently of selection order and octave doubling", () => {
    expect(identifyChords([67, 60, 64, 72])).toEqual(["C"])
    expect(identifyChords([67, 64, 72])).toEqual(["C/E"])
    expect(identifyChords([72, 67, 76])).toEqual(["C/G"])
    expect(identifyChords([48, 60, 72])).toEqual([])
  })

  it("matches an open C voicing with doubled notes and a muted string", () => {
    const pitches = guitarVoicing([null, 3, 2, 0, 1, 0])
    expect(pitches.length).toBe(5)
    expect(identifyChords(pitches)).toEqual(["C"])
  })

  it("uses the lowest pitch even when a lower string is fretted above it", () => {
    const pitches = guitarVoicing([24, 3, 2, 0, 1, 0])
    expect(identifyChords(pitches)).toEqual(["C"])
    expect(identifyChords(guitarVoicing([0, 3, 2, 0, 1, 0]))).toEqual(["C/E"])
  })

  it("keeps alternate exact names and orders the bass-root match first", () => {
    expect(identifyChords([60, 64, 67, 69])).toEqual(["C6", "Am7/C"])
  })

  it("recognizes suspended and extended chords without accepting extra tones", () => {
    expect(identifyChords([60, 65, 67])).toContain("Csus4")
    expect(identifyChords([60, 64, 67, 70, 74])).toContain("C9")
    expect(identifyChords([60, 64, 65, 67])).toEqual([])
    expect(identifyChords([])).toEqual([])
  })
})


describe("Chord Lab instrument controls", () => {
  function elements(node) {
    if (!node || typeof node !== "object") return []
    return [node, ...[node.props?.children].flat(Infinity).flatMap(elements)]
  }

  it("toggles piano notes, clears them, and preserves each instrument selection", () => {
    const page = new ChordLabPage({})
    page.setState = update => Object.assign(page.state,
      typeof update === "function" ? update(page.state) : update)
    const controls = () => elements(page.render())
    const instrument = () => controls().find(node => node.type === "select")
    const key = label => controls().find(node => node.type === "button" && node.props.children === label)
    const frets = [null, 3, 2, 0, 1, 0]
    page.setState({frets})
    instrument().props.onChange({target: {value: "piano"}})
    const piano = () => controls().find(node => node.type === PianoVisual)
    for (const pitch of [52, 55, 60]) piano().props.onToggle(pitch)
    expect(identifyChords(page.state.pianoNotes)).toEqual(["C/E"])
    expect(piano().props.selected).toContain(52)
    piano().props.onToggle(52)
    expect(piano().props.selected).not.toContain(52)
    instrument().props.onChange({target: {value: "guitar"}})
    expect(page.state.frets).toEqual(frets)
    instrument().props.onChange({target: {value: "piano"}})
    expect(page.state.pianoNotes.length).toBe(2)
    key("Clear piano notes").props.onClick()
    expect(page.state.pianoNotes).toEqual([])
    expect(page.state.frets).toEqual(frets)
  })
})
