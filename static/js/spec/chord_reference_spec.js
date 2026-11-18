import ChordReferencePage from "st/components/pages/chord_reference_page"
import {searchChords} from "st/chord_reference"

describe("Chord Reference", () => {
  it("distinguishes case-sensitive major and minor symbols", () => {
    expect(searchChords("CM7").map(chord => chord.symbol)).toEqual(["Cmaj7"])
    expect(searchChords("Cm7").map(chord => chord.symbol)).toEqual(["Cm7"])
  })

  it("understands accidentals and natural-language chord qualities", () => {
    expect(searchChords("F sharp minor 7").map(chord => chord.symbol)).toEqual(["F♯m7"])
    expect(searchChords("B♭ half-diminished seventh").map(chord => chord.symbol)).toEqual(["B♭m7♭5"])
    expect(searchChords("suspended").some(chord => chord.symbol === "Csus2")).toBe(true)
  })

  it("spells notes by degree, including double accidentals", () => {
    expect(searchChords("C#maj7")[0].notes).toEqual(["C♯", "E♯", "G♯", "B♯"])
    expect(searchChords("Ebdim7")[0].notes).toEqual(["E♭", "G♭", "B♭♭", "D♭♭"])
  })

  it("accepts named suffixes regardless of case", () => {
    expect(searchChords("cMAJ7").map(chord => chord.symbol)).toEqual(["Cmaj7"])
    expect(searchChords("CMin7").map(chord => chord.symbol)).toEqual(["Cm7"])
  })

  it("preserves less common enharmonic roots", () => {
    expect(searchChords("C flat major")[0].notes).toEqual(["C♭", "E♭", "G♭"])
    expect(searchChords("E#")[0].notes).toEqual(["E♯", "G♯♯", "B♯"])
  })

  it("returns no results for blank or unknown queries", () => {
    expect(searchChords("  ")).toEqual([])
    expect(searchChords("unknown chord")).toEqual([])
  })
  it("finds descriptive moods and styles with visible matching hints", () => {
    const dreamy = searchChords("dreamy")
    expect(dreamy.some(chord => chord.symbol === "Cmaj7")).toBe(true)
    expect(dreamy.every(chord => chord.descriptors.includes("dreamy"))).toBe(true)
    expect(searchChords("bluesy").map(chord => chord.symbol))
      .toEqual(searchChords("blues").map(chord => chord.symbol))
    expect(searchChords("jazz").map(chord => chord.symbol))
      .toEqual(searchChords("jazzy").map(chord => chord.symbol))
  })

  it("combines root, quality, and descriptors without favoring short quality names", () => {
    const jazzy = searchChords("C jazzy").map(chord => chord.symbol)
    expect(jazzy).toContain("Cmaj7")
    expect(jazzy).toContain("CQ")
    expect(jazzy).not.toContain("Dmaj7")
    expect(searchChords("F sharp minor jazzy").map(chord => chord.symbol))
      .toEqual(jasmine.arrayContaining(["F♯m6", "F♯m7", "F♯m9"]))
    expect(searchChords("C dreamy warm").map(chord => chord.symbol)).toEqual(["Cmaj7", "Cmaj9"])
  })

  it("requires every search term and keeps quality-only search precise", () => {
    expect(searchChords("C dreamy nonsense")).toEqual([])
    expect(searchChords("C happy sad")).toEqual([])
    expect(searchChords("C major").map(chord => chord.symbol)).toEqual(["C"])
    expect(searchChords("  C   DREAMY  ").every(chord => chord.root === "C")).toBe(true)
  })

})


describe("Chord Reference search controls", () => {
  function elements(node) {
    if (!node || typeof node !== "object") return []
    return [node, ...[node.props?.children].flat(Infinity).flatMap(elements)]
  }

  it("updates results from suggestions and typed queries, including empty results", () => {
    const page = new ChordReferencePage({})
    page.setState = update => Object.assign(page.state, update)
    const controls = () => elements(page.render())
    const symbols = () => controls().filter(node => node.type === "h2").map(node => node.props.children)
    controls().find(node => node.type === "button" && node.props.children === "C jazzy").props.onClick()
    expect(page.state.query).toBe("C jazzy")
    expect(symbols()).toContain("Cmaj7")
    expect(symbols()).not.toContain("Dmaj7")
    const input = () => controls().find(node => node.type === "input")
    input().props.onChange({target: {value: "C happy sad"}})
    expect(symbols()).toEqual([])
    expect(controls().some(node => node.props?.role === "status")).toBeTrue()
    input().props.onChange({target: {value: ""}})
    expect(symbols()).toEqual([])
    input().props.onChange({target: {value: "Cm7"}})
    expect(symbols()).toEqual(["Cm7"])
  })
})
