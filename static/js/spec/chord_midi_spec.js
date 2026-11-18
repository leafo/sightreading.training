import ChordMidi from "st/chord_midi"
import ChordLabPage from "st/components/pages/chord_lab_page"
import {identifyChords} from "st/chord_lab"

describe("Chord Lab MIDI", () => {
  it("identifies held inversions, ignores repeated note-on, and treats zero velocity as release", () => {
    const midi = new ChordMidi()
    for (const note of [64, 67, 72, 72]) midi.receive([0x92, note, 100])
    expect(identifyChords(midi.notes)).toEqual(["C/E"])
    midi.receive([0x92, 72, 0])
    expect(midi.notes).toEqual([64, 67])
    midi.receive([0x82, 64, 10])
    expect(midi.notes).toEqual([67])
  })

  it("retains sustained notes until pedal release without dropping held notes", () => {
    const midi = new ChordMidi()
    midi.receive([0x90, 60, 100])
    midi.receive([0xb0, 64, 127])
    midi.receive([0x80, 60, 0])
    midi.receive([0x90, 64, 100])
    expect(midi.notes).toEqual([60, 64])
    midi.receive([0xb0, 64, 0])
    expect(midi.notes).toEqual([64])
  })

  it("isolates channel releases and panic controls", () => {
    const midi = new ChordMidi()
    midi.receive([0x90, 60, 100])
    midi.receive([0x91, 60, 100])
    midi.receive([0xb0, 120, 0])
    expect(midi.notes).toEqual([60])
    midi.receive([0xb1, 64, 127])
    midi.receive([0xb1, 123, 0])
    expect(midi.notes).toEqual([60])
    midi.receive([0xb1, 121, 0])
    expect(midi.notes).toEqual([])
    midi.receive([0x90, 0, 100])
    midi.receive([0x90, 127, 100])
    expect(midi.notes).toEqual([0, 127])
    midi.reset()
    expect(midi.notes).toEqual([])
  })

  it("ignores malformed messages and unrelated events", () => {
    const midi = new ChordMidi()
    for (const data of [null, [], [0x90, 60], [0x90, 128, 1], [0x90, 60, -1], [0x90, 60.5, 1], [0xe0, 60, 1]]) midi.receive(data)
    expect(midi.notes).toEqual([])
  })

  it("uses the shared input and clears stale notes on disconnect, replacement, and departure", () => {
    const input = new EventTarget()
    input.state = "connected"
    const page = new ChordLabPage({midiInput: input})
    page.setState = update => Object.assign(page.state, typeof update === "function" ? update(page.state) : update)
    page.state.instrument = "midi"
    page.onMidiMessage({data: [0x90, 60, 100]})
    expect(page.state.midiNotes).toEqual([60])
    page.componentDidUpdate({midiInput: null})
    expect(page.state.midiNotes).toEqual([])
    page.onMidiMessage({data: [0x90, 64, 100]})
    input.state = "disconnected"
    input.dispatchEvent(new Event("statechange"))
    expect(page.state.midiNotes).toEqual([])
    input.state = "connected"
    page.onMidiMessage({data: [0x90, 67, 100]})
    expect(page.state.midiNotes).toEqual([67])
    page.componentWillUnmount()
    expect(page.midiChord.notes).toEqual([])
    page.state.instrument = "guitar"
    page.onMidiMessage({data: [0x90, 72, 100]})
    expect(page.midiChord.notes).toEqual([])
  })
})
