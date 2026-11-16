import {STARTER_SHEETS} from "st/starter_sheets"
import {sheetChordDiagrams} from "st/sheet_chord_diagrams"
import ChordSheetPage from "st/components/pages/chord_sheet_page"

describe("Chord sheet practice scrolling", () => {
  let page, previousRequest, previousCancel, nextFrame
  beforeEach(() => {
    previousRequest = globalThis.requestAnimationFrame
    previousCancel = globalThis.cancelAnimationFrame
    globalThis.requestAnimationFrame = callback => { nextFrame = callback; return 1 }
    globalThis.cancelAnimationFrame = jasmine.createSpy("cancelAnimationFrame")
    page = new ChordSheetPage({})
    page.setState = (update, callback) => {
      Object.assign(page.state, typeof update === "function" ? update(page.state) : update)
      callback?.()
    }
    page.state.source = "[Am]Practice"
    page.state.practicing = true
    page.preview.current = {scrollTop: 0, scrollHeight: 1000, clientHeight: 200, focus() {}}
  })
  afterEach(() => {
    globalThis.requestAnimationFrame = previousRequest
    globalThis.cancelAnimationFrame = previousCancel
  })
  it("scrolls at the chosen speed and retains fractional progress", () => {
    page.startScroll()
    nextFrame(0)
    nextFrame(50)
    expect(page.preview.current.scrollTop).toBe(1.5)
    page.setState({scrollSpeed: 60})
    nextFrame(100)
    expect(page.preview.current.scrollTop).toBe(4.5)
  })
  it("caps background elapsed time and stops at the bottom", () => {
    page.startScroll()
    nextFrame(0)
    nextFrame(5000)
    expect(page.preview.current.scrollTop).toBe(3)
    page.scrollPosition = 799
    nextFrame(5050)
    expect(page.state.scrolling).toBe(false)
    expect(globalThis.cancelAnimationFrame).toHaveBeenCalled()
  })
  it("resumes from a manually chosen position", () => {
    page.startScroll()
    nextFrame(0)
    page.pauseScroll()
    page.preview.current.scrollTop = 400
    page.startScroll()
    nextFrame(1000)
    nextFrame(1100)
    expect(page.preview.current.scrollTop).toBe(403)
  })
  it("pauses on exit, resets changed sheets, and cancels on unmount", () => {
    page.startScroll()
    page.togglePractice()
    expect(page.state.practicing).toBe(false)
    expect(page.state.scrolling).toBe(false)
    page.preview.current.scrollTop = 50
    page.componentDidUpdate({}, {...page.state, source: "previous sheet"})
    expect(page.preview.current.scrollTop).toBe(0)
    page.componentWillUnmount()
    expect(globalThis.cancelAnimationFrame).toHaveBeenCalled()
  })
  it("does not start outside practice view or for an empty sheet", () => {
    page.state.practicing = false
    page.startScroll()
    expect(page.state.scrolling).toBe(false)
    page.state.practicing = true
    page.state.source = " "
    page.startScroll()
    expect(page.state.scrolling).toBe(false)
  })
})


describe("Starter chord songs and diagrams", () => {
  it("includes Whiskey and a three-chord beginner song", () => {
    expect(STARTER_SHEETS.map(sheet => sheet.title)).toContain("Whiskey in the Jar")
    const grace = STARTER_SHEETS.find(sheet => sheet.id === "amazing-grace")
    expect(sheetChordDiagrams(grace.source).map(chord => chord.name).sort()).toEqual(["C", "D", "G"])
    STARTER_SHEETS.forEach(sheet => {
      expect(sheetChordDiagrams(sheet.source).every(chord => chord.voicing?.frets.length === 6)).toBe(true)
    })
  })
  it("deduplicates chords in playing order and follows transposition", () => {
    expect(sheetChordDiagrams("[G]one [C]two [G]three", 2).map(chord => chord.name)).toEqual(["A", "D"])
    expect(sheetChordDiagrams("[G]one", 1, true)[0].name).toBe("Ab")
    expect(sheetChordDiagrams("[G]one", 1, true)[0].voicing).toBeDefined()
    expect(sheetChordDiagrams("[Unknown]word")[0].voicing).toBeUndefined()
    expect(sheetChordDiagrams("plain lyrics")).toEqual([])
  })
})
