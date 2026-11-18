import * as React from "react"
import {renderToStaticMarkup} from "react-dom/server"
import {MemoryRouter} from "react-router-dom"
import {identifyChordMatches, identifyChords, guitarVoicing, chordNote} from "st/chord_lab"
import {guitarChordVoicings, OPEN_PITCHES, noteClass} from "st/guitar_chords"
import {searchChords} from "st/chord_reference"
import {chordDiagramAscii, copyChordDiagram} from "st/chord_diagram_data"
import ChordDiagram, {DiagramAction} from "st/components/chord_diagram"
import ChordVoicings from "st/components/chord_voicings"
import Scales from "st/components/pages/guitar_scales_page"
import Lab from "st/components/pages/chord_lab_page"
import Reference from "st/components/pages/chord_reference_page"
import {normalizeDiagramSize, diagramWidth, readDiagramSize, setDiagramSize} from "st/diagram_size"
import GuitarFretboard from "st/components/guitar_fretboard"
import ToolOptions from "st/components/tool_options"

function elements(node) {
  if (!node || typeof node !== "object") return []
  return [node, ...[node.props?.children].flat(Infinity).flatMap(elements)]
}
const html = node => renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)

describe("Jazz voicing recognition", () => {
  it("recognizes the requested C7 and includes it as a common diagram", () => {
    const frets = [null, 3, 2, 3, 1, null]
    expect(identifyChordMatches(guitarVoicing(frets))).toContain({name: "C7", omittedFifth: true})
    const shape = guitarChordVoicings(searchChords("C7")[0].notes, 18).find(shape => shape.frets.join(",") === frets.join(","))
    expect(shape).toBeDefined()
    expect(shape.category).toBe("Common")
    expect(shape.omittedFifth).toBeTrue()
  })
  it("accepts transposed major/minor/dominant seventh and ninth shells with no fifth", () => {
    for (let root = 0; root < 12; root++) {
      for (const [suffix, intervals] of [["7", [0, 4, 10]], ["M7", [0, 4, 11]], ["m7", [0, 3, 10]], ["9", [0, 4, 10, 14]]]) {
        const matches = identifyChordMatches(intervals.map(interval => 48 + root + interval))
        expect(matches).toContain({name: chordNote(root) + suffix, omittedFifth: true})
      }
    }
  })
  it("does not infer a missing third, seventh, altered fifth, root, or ordinary triad fifth", () => {
    expect(identifyChords([60, 64])).not.toContain("C")
    expect(identifyChords([60, 67, 70])).not.toContain("C7")
    expect(identifyChords([60, 64, 67])).not.toContain("C7")
    expect(identifyChords([64, 67, 70])).not.toContain("C7/E")
    expect(identifyChords([60, 63, 70])).not.toContain("Cm7♭5")
    expect(identifyChords([60, 64, 70, 71])).not.toContain("C7")
  })
})

describe("Shared chord diagram presentation and export", () => {
  const frets = [null, 3, 2, 0, 1, 0]
  it("renders all label modes with the same caption and diagram width", () => {
    for (const labels of ["fingers", "notes", "intervals", "both"]) {
      const text = html(<ChordDiagram frets={frets} fingers={[null, 3, 2, null, 1, null]} name="C" labels={labels} />)
      expect(text).toContain('aria-label="Copy chord diagram"')
      expect(text).toContain('aria-label="Copy as"')
      expect(text).toContain("<figcaption>C</figcaption>")
      expect(text).toContain(`style="width:${diagramWidth(readDiagramSize())}px"`)
      expect(text).toContain(">Block</button>")
      expect(text).toContain(">Line</button>")
      if (labels === "notes" || labels === "both") expect(text).toContain(">C</text>")
      if (labels === "intervals" || labels === "both") expect(text).toContain(">3</text>")
    }
  })
  it("keeps named icon actions and copy above the diagram inside its figure", () => {
    const text = html(<ChordDiagram frets={frets} name="C" actions={<DiagramAction label="Choose C voicing"><svg aria-hidden="true" /></DiagramAction>} />)
    expect(text.indexOf('aria-label="Choose C voicing"')).toBeLessThan(text.indexOf('<svg viewBox='))
    expect(text.indexOf('aria-label="Copy chord diagram"')).toBeLessThan(text.indexOf('<svg viewBox='))
    expect(text).toContain('title="Choose C voicing"')
  })
  it("places catalog actions inside each figure without detached action labels", () => {
    const text = html(<ChordVoicings notes={["C", "E", "G"]} name="C" linkToLab />)
    expect(text).not.toContain('>Analyze</a>')
    expect(text).not.toContain('>Copy markup</button>')
    expect(text).not.toContain('>Add to sheet</a>')
    for (const figure of text.match(/<figure[\s\S]*?<\/figure>/g) || []) {
      expect(figure).toContain('aria-label="Open C in Chord Lab"')
      expect(figure).toContain('aria-label="Add C to Chord Sheet"')
      expect(figure).toContain('aria-label="Copy chord diagram"')
    }
  })
  it("exports exact single-line tabs and five-fret blocks with open/muted/high positions", () => {
    expect(chordDiagramAscii(frets, "C", "line")).toBe("C = x-3-2-0-1-0")
    expect(chordDiagramAscii(frets, "D♭7", "line")).toBe("Db7 = x-3-2-0-1-0")
    const block = chordDiagramAscii(frets, "C", "block")
    expect(block).not.toContain("Frets")
    expect(block).not.toContain("C =")
    expect(block.split("\n").filter(line => /^\s*\d+\s/.test(line)).length).toBe(2)
    expect(block).toContain("x           o       o")
    expect(chordDiagramAscii([null, 10, 12, 12, 12, 10], "G", "block")).toContain("12  |")
    const wide = chordDiagramAscii([0, 1, 3, 7, 9, 12], "Wide", "block")
    expect(wide.split("\n").filter(line => /^\s*\d+\s/.test(line)).length).toBe(5)
    expect(wide).toContain("12  |")
  })
  it("copies the selected format and reports clipboard rejection for retry", async () => {
    let copied
    await copyChordDiagram(frets, "C", "line", {writeText: async text => {copied = text}})
    expect(copied).toBe("C = x-3-2-0-1-0")
    await expectAsync(copyChordDiagram(frets, "C", "block", {writeText: async () => {throw new Error("denied")}})).toBeRejected()
    await copyChordDiagram(frets, "C", "block", {writeText: async text => {copied = text}})
    expect(copied).toBe(chordDiagramAscii(frets, "C", "block"))
  })
  it("shows all returned voicings without details foldouts or indexed captions", () => {
    const text = html(<ChordVoicings notes={searchChords("C7")[0].notes} name="C7" />)
    expect(text).not.toContain("More moveable")
    expect(text).not.toContain("C7 ·")
    expect(text).toContain("Common voicings")
    expect(text).toContain("Moveable voicings")
    expect((text.match(/Copy chord diagram/g) || []).length).toBe(guitarChordVoicings(searchChords("C7")[0].notes, 24).length)
  })
})

describe("Trimmed tool UI", () => {
  it("keeps guitar scale notes/degrees while removing tuning/help/storage text and piano summary", () => {
    const page = new Scales({})
    page.state.instrument = "guitar"
    let text = html(page.render())
    expect(text).toContain("A (1) · C (♭3)")
    expect(text).not.toContain("Standard tuning")
    expect(text).not.toContain("Highlighted notes belong")
    expect(text).not.toContain("minor pentatonic</strong>")
    expect(text).not.toContain("saved on this browser")
    page.state.instrument = "piano"
    text = html(page.render())
    expect(text).not.toContain("A (1) · C (♭3)")
    expect(text).toContain("Two-octave piano")
  })
  it("places the matches label outside the box and tabs before its content", () => {
    const page = new Lab({})
    page.state.frets = [null, 3, 2, 3, 1, null]
    const section = elements(page.render()).find(node => node.props?.["aria-labelledby"] === "chord-matches-heading")
    const children = React.Children.toArray(section.props.children)
    expect(children[0].type).toBe("h2")
    expect(children[0].props.children).toBe("Chord Matches")
    expect(React.Children.toArray(children[1].props.children)[0].props.role).toBe("tablist")
    const text = html(section)
    expect(text.indexOf('role="tablist"')).toBeLessThan(text.indexOf('<figure'))
  })
  it("shows note-letter chord tabs and keeps guitar diagrams out of piano mode", () => {
    const page = new Lab({})
    page.state.frets = [null, 3, 2, 3, 1, null]
    let nodes = elements(page.render())
    const tab = nodes.find(node => node.props?.role === "tab" && node.props["aria-selected"])
    expect(html(tab)).toContain("C7")
    expect(html(tab)).toContain("C · E · B♭")
    expect(html(tab)).toContain("no 5")
    expect(html(page.render())).not.toContain("Notes from the bass up:")
    page.state.instrument = "piano"
    page.state.pianoNotes = [48, 52, 58]
    nodes = elements(page.render())
    expect(nodes.some(node => node.type === ChordDiagram || node.type === ChordVoicings)).toBeFalse()
    const ref = new Reference({})
    expect(html(ref.render())).not.toContain("without account sync")
    expect(html(<ToolOptions />)).not.toContain("saved on this browser")
  })
})


describe("Diagram size and fretboard polish", () => {
  it("defaults to the current diagram width at twenty percent and validates limits", () => {
    expect(normalizeDiagramSize(undefined)).toBe(20)
    expect(normalizeDiagramSize(101)).toBe(20)
    expect(normalizeDiagramSize(-1)).toBe(20)
    expect(diagramWidth(20)).toBe(140)
    expect(diagramWidth(100)).toBe(280)
    setDiagramSize(60)
    expect(readDiagramSize()).toBe(60)
    setDiagramSize(20)
  })
  it("exports the requested C7 block without headings or extra fret numbers", () => {
    const block = chordDiagramAscii([null, 3, 2, 3, 1, null], "C7", "block")
    expect(block.split("\n")[0]).toBe("    E   A   D   G   B   e")
    expect(block.split("\n").filter(line => /^\s*\d/.test(line)).map(line => line.trim().split(" ")[0])).toEqual(["3", "5"])
    expect(block).not.toContain("C7")
    expect(block).not.toContain("Frets")
  })
  it("only numbers marker frets and keeps the tuning and instructions together", () => {
    const text = html(<GuitarFretboard onChange={() => {}} />)
    expect(text).toContain("E A D G B E · Tap a fret")
    expect(text).not.toContain(">1<")
    expect(text).not.toContain(">2<")
    expect(text).toContain(">12<")
  })
})

describe("Extended chord database", () => {
  it("searches, spells and identifies altered and extended chords in every root", () => {
    for (const root of ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]) {
      for (const suffix of ["dim7", "m7b5", "7b5", "7#5", "7b9", "7#9", "11", "m11", "maj11", "13", "m13", "maj13"]) {
        const chord = searchChords(root + suffix)[0]
        expect(chord).toBeDefined()
        const tones = chordTonesForTest(chord)
        expect(identifyChords(tones)).toContain(chord.symbol.replace("maj", "M"))
      }
    }
  })
  it("offers valid guitar diagrams for diminished, half diminished and altered fifth chords", () => {
    for (const symbol of ["Cdim7", "Cm7b5", "C7b5", "C7#5", "C11", "C13"]) {
      const chord = searchChords(symbol)[0]
      expect(guitarChordVoicings(chord.notes).length).toBeGreaterThan(0)
    }
  })
})
function chordTonesForTest(chord) {
  const root = noteClass(chord.notes[0])
  return chord.notes.map(note => 48 + root + (noteClass(note) - root + 12) % 12)
}


describe("Dominant seventh root spelling", () => {
  it("keeps D natural with a flat seventh and flat ninth", () => {
    // D F# A C Eb: the C is b7, not an alteration of the root.
    const matches = identifyChords([50, 54, 57, 60, 63])
    expect(matches).toContain("D7♭9")
    expect(matches.some(name => name.startsWith("D♭7"))).toBeFalse()
    expect(searchChords("D7b9")[0].notes).toEqual(["D", "F♯", "A", "C", "E♭"])
    // A genuinely flat root must retain its accidental.
    expect(identifyChords([49, 53, 56, 59, 62])).toContain("D♭7♭9")
  })
  it("shows status only for unsuccessful nonempty reference searches", () => {
    const page = new Reference({})
    for (const query of ["Cmaj7", "C dreamy", ""]) {
      page.state = {...page.state, query}
      expect(elements(page.render()).some(node => node.type === "p" && node.props.role === "status")).toBeFalse()
    }
    page.state = {...page.state, query: "not-a-chord"}
    expect(html(page.render())).toContain("No chords matched.")
  })
})
