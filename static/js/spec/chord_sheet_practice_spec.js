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

describe("Chord Sheet Maker workspace recovery", () => {
  let page, previousStorage, previousWindow, previousCancel, data
  beforeEach(() => {
    data = new Map()
    previousStorage = globalThis.localStorage
    previousWindow = globalThis.window
    previousCancel = globalThis.cancelAnimationFrame
    globalThis.localStorage = {
      getItem: key => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, value)
    }
    globalThis.window = {confirm: () => true}
    globalThis.cancelAnimationFrame = () => {}
    page = new ChordSheetPage({})
    page.setState = (update, callback) => {
      Object.assign(page.state, typeof update === "function" ? update(page.state) : update)
      callback?.()
    }
  })
  afterEach(() => {
    globalThis.localStorage = previousStorage
    globalThis.window = previousWindow
    globalThis.cancelAnimationFrame = previousCancel
  })
  it("opens Whiskey on first visit and recovers unsaved starter edits and preferences", () => {
    page.loadEditor()
    expect(page.state.title).toBe("Whiskey in the Jar")
    expect(page.state.activeId).toBe("starter:whiskey-in-the-jar")
    Object.assign(page.state, {source: "[C]An unsaved edit", tab: "practice", songbookQuery: "grace", songbookSort: "title", diagramMode: "line", scrollSpeed: 65, scrollTop: 100})
    page.persistEditor()
    page.state = {...page.state, source: "lost", tab: "create", scrolling: false}
    page.loadEditor()
    expect(page.state.source).toBe("[C]An unsaved edit")
    expect(page.state.activeId).toBe("starter:whiskey-in-the-jar")
    expect(page.state.tab).toBe("practice")
    expect(page.state.practicing).toBe(true)
    expect(page.state.scrolling).toBe(false)
    expect(page.state.scrollTop).toBe(100)
    expect(page.state.diagramMode).toBe("line")
    expect(page.state.scrollSpeed).toBe(65)
    expect(page.state.songbookQuery).toBe("grace")
    expect(page.state.songbookSort).toBe("title")
  })
  it("saves a personal copy of a starter and never deletes its original", () => {
    page.loadEditor()
    page.remove()
    expect(page.state.title).toBe("Whiskey in the Jar")
    page.save()
    expect(page.state.sheets.length).toBe(1)
    expect(page.state.activeId.startsWith("starter:")).toBe(false)
    const id = page.state.activeId
    page.setState({source: "[G]Personal changes"})
    page.save()
    expect(page.state.sheets.length).toBe(1)
    expect(page.state.activeId).toBe(id)
    page.remove()
    expect(page.state.sheets.length).toBe(0)
    page.open("starter:whiskey-in-the-jar")
    expect(page.state.source).toBe(STARTER_SHEETS[0].source)
  })
  it("can reset a new unsaved sheet and preserves an intentionally blank draft", () => {
    page.loadEditor()
    page.open("")
    page.setState({title: "Unsaved", source: "[C]Draft"})
    page.open("")
    expect(page.state.source).toBe("")
    page.persistEditor()
    page.loadEditor()
    expect(page.state.title).toBe("")
    expect(page.state.source).toBe("")
    expect(page.state.activeId).toBe("")
  })
  it("pauses when changing tabs and keeps the practice position", () => {
    page.setState({tab: "practice", practicing: true, scrolling: true, scrollTop: 200})
    page.preview.current = {scrollTop: 200, focus() {}}
    page.selectTab("info")
    expect(page.state.scrolling).toBe(false)
    expect(page.state.practicing).toBe(false)
    page.selectTab("practice")
    expect(page.preview.current.scrollTop).toBe(200)
    expect(page.state.practicing).toBe(true)
  })
  it("recovers songs independently of corrupt UI preferences and bounds numeric preferences", () => {
    page.loadEditor()
    page.setState({source: "[G]Recovered"})
    page.persistEditor()
    data.set("chord-sheet-ui:v1", "broken")
    page.loadEditor()
    expect(page.state.source).toBe("[G]Recovered")
    data.set("chord-sheet-ui:v1", JSON.stringify({version: 1, scrollSpeed: 10000, scrollTop: -9, tab: "invalid"}))
    page.loadEditor()
    expect(page.state.scrollSpeed).toBe(100)
    expect(page.state.scrollTop).toBe(0)
  })
  it("keeps an invalid import in the dialog and imports ChordPro as a new sheet", async () => {
    page.loadEditor()
    page.setState({importOpen: true, importMode: "text", importFile: {size: 2, name: "empty.txt", text: async () => ""}})
    await page.submitImport()
    expect(page.state.importOpen).toBe(true)
    expect(page.state.textImportError).toBeTruthy()
    page.setState({importFile: {size: 40, name: "test.cho", text: async () => "{title: Imported}\n[C]Hello"}})
    await page.submitImport()
    expect(page.state.importOpen).toBe(false)
    expect(page.state.title).toBe("Imported")
    expect(page.state.source).toContain("[C]Hello")
    expect(page.state.activeId).toBe("")
    expect(page.state.importingText).toBe(false)
  })
})
