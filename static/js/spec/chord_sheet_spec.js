import ChordSheetPage from "st/components/pages/chord_sheet_page"
import {searchSongbook, readEditorDraft, writeEditorDraft, SHEET_EDITOR_STORAGE_KEY, importChordSheet, exportChordSheet, exportSongbook, importSongbook, parseChordSheet, readChordSheet, SHEET_SOURCE_LIMIT, readSongbook, SHEET_STORAGE_KEY, SONGBOOK_STORAGE_KEY} from "st/chord_sheet"

describe("Chord Sheet Maker", () => {
  it("keeps lyrics before the first chord and anchors slash chords to the next lyric", () => {
    expect(parseChordSheet("Oh [Am]here [G/B]we go")).toEqual([[
      {chord: "", lyric: "Oh "},
      {chord: "Am", lyric: "here "},
      {chord: "G/B", lyric: "we go"},
    ]])
  })

  it("preserves blank lines, chord-only lines, and plain section labels", () => {
    expect(parseChordSheet("[Verse 1]\r\n\r\n[C][G]")).toEqual([
      [{chord: "", lyric: "[Verse 1]"}],
      [{chord: "", lyric: ""}],
      [{chord: "C", lyric: ""}, {chord: "G", lyric: ""}],
    ])
  })

  it("round-trips a saved draft and rejects invalid or oversized data", () => {
    const draft = {title: "Test song", source: "[Dm]Hello"}
    expect(readChordSheet(JSON.stringify(draft))).toEqual(draft)
    expect(() => readChordSheet("null")).toThrow()
    expect(() => readChordSheet(JSON.stringify({...draft, source: "a".repeat(SHEET_SOURCE_LIMIT + 1)}))).toThrow()
  })
})

describe("chord sheet", function() {
  it("keeps lyric placement, blank lines and consecutive chords", function() {
    expect(parseChordSheet("Intro [C][G]go\r\n\r\nNext")).toEqual([
      [{chord: "", lyric: "Intro "}, {chord: "C", lyric: ""}, {chord: "G", lyric: "go"}],
      [{chord: "", lyric: ""}],
      [{chord: "", lyric: "Next"}],
    ])
  })

  it("transposes chord roots and basses while preserving qualities", function() {
    expect(parseChordSheet("[B♭maj7/F][C6/9][N.C.]", -1)[0].map(cell => cell.chord))
      .toEqual(["Amaj7/E", "B6/9", "N.C."])
  })

  it("supports flat spelling and preserves original spelling at zero", function() {
    expect(parseChordSheet("[C/E]", 1, true)[0][0].chord).toBe("Db/F")
    expect(parseChordSheet("[C♯/G♯]")[0][0].chord).toBe("C♯/G♯")
  })
})

describe("saved chord sheets", () => {
  const legacy = {title: "Old song", source: "[Am]Verse"}
  const first = {...legacy, id: "one", shift: 2, flats: true}
  const second = {...first, id: "two", source: "[G]Chorus", shift: -3}
  const storage = entries => ({getItem: key => entries[key] ?? null})

  it("loads the legacy draft when there is no songbook", () => {
    expect(readSongbook(storage({[SHEET_STORAGE_KEY]: JSON.stringify(legacy)})))
      .toEqual([{...legacy, id: "legacy", shift: 0, flats: false}])
  })

  it("keeps songs with the same title distinct and restores transposition", () => {
    expect(readSongbook(storage({[SONGBOOK_STORAGE_KEY]: JSON.stringify([first, second])})))
      .toEqual([first, second])
  })

  it("does not resurrect a deleted legacy draft", () => {
    expect(readSongbook(storage({
      [SHEET_STORAGE_KEY]: JSON.stringify(legacy),
      [SONGBOOK_STORAGE_KEY]: "[]",
    }))).toEqual([])
  })

  it("rejects duplicate IDs, invalid transposition, and corrupt data", () => {
    for (const value of [JSON.stringify([first, first]), JSON.stringify([{...first, shift: 13}]), "{"]) {
      expect(() => readSongbook(storage({[SONGBOOK_STORAGE_KEY]: value}))).toThrow()
    }
  })
})

describe("songbook backups", () => {
  const song = {id: "one", title: "Practice 🎸", source: "[B♭/D]Verse", shift: -2, flats: true}
  const createId = () => "new-id"

  it("round-trips saved sheets with their transposition and preserves separate IDs", () => {
    const sheets = [song, {...song, id: "two"}]
    expect(importSongbook(exportSongbook(sheets), [], createId)).toEqual(sheets)
  })

  it("keeps the local edit, avoids reserved IDs and skips a repeated import", () => {
    const local = {...song, source: "[G]Edited verse"}
    const backup = exportSongbook([song, {...song, id: "new-id", title: "Other"}])
    const ids = ["new-id", "replacement"]
    const merged = importSongbook(backup, [local], () => ids.shift())
    expect(merged).toEqual([local, {...song, id: "replacement"}, {...song, id: "new-id", title: "Other"}])
    expect(importSongbook(backup, merged, createId)).toEqual(merged)
  })

  it("rejects malformed, unsupported and partially invalid backups without changing existing sheets", () => {
    const existing = [song]
    for (const backup of ["{", '{"version":2,"sheets":[]}',
      JSON.stringify({version: 1, sheets: [song, {...song, id: "two", shift: 13}]})]) {
      expect(() => importSongbook(backup, existing, createId)).toThrow()
    }
    expect(existing).toEqual([song])
  })
})

describe("chord sheet text export", () => {
  it("preserves lyrics, section labels, Unicode and chord-only lines", () => {
    const source = "[Verse 1]\nOh [Am]héllo [G/B]world\n\n[C][G]\n"
    expect(exportChordSheet(source)).toBe(source)
  })

  it("exports the preview key with slash basses and chosen accidentals", () => {
    const source = "[C/E]Hello [B♭maj7/F]there [N.C.]\r\n[C6/9]"
    const text = exportChordSheet(source, 1, true)
    expect(text).toBe("[Db/F]Hello [Bmaj7/Gb]there [N.C.]\n[Db6/9]")
    expect(parseChordSheet(text)).toEqual(parseChordSheet(source, 1, true))
    expect(source).toContain("[C/E]")
  })

  it("handles empty sheets and downward octave transposition", () => {
    expect(exportChordSheet("")).toBe("")
    expect(exportChordSheet("[C#m7/G#]", -12)).toBe("[C#m7/G#]")
  })
})


describe("chord sheet text import", () => {
  it("round-trips exported transposed text in its written key", () => {
    const source = exportChordSheet("[C/E]Héllo\n\n[G]", 1, true)
    expect(importChordSheet(source, "Practice.txt")).toEqual({
      title: "Practice", source, shift: 0, flats: false,
    })
  })

  it("normalizes BOM and line endings without losing sections or spacing", () => {
    expect(importChordSheet("\uFEFF[Verse 1]\r\n  [Am]Hello\r\n", "Song.TXT").source)
      .toBe("[Verse 1]\n  [Am]Hello\n")
  })

  it("bounds title and content and rejects empty or binary text", () => {
    expect(importChordSheet("x".repeat(SHEET_SOURCE_LIMIT), "a".repeat(200) + ".txt").title.length).toBe(120)
    for (const source of ["", " \n", "[C]\0", "x".repeat(SHEET_SOURCE_LIMIT + 1)]) {
      expect(() => importChordSheet(source)).toThrow()
    }
  })
})


describe("chord sheet text import controls", () => {
  function page() {
    const page = new ChordSheetPage({})
    page.setState = update => Object.assign(page.state,
      typeof update === "function" ? update(page.state) : update)
    return page
  }
  function event(text, name = "Song.txt") {
    return {currentTarget: {value: name, files: [{name, size: text.length, text: async () => text}]}}
  }

  it("opens a new unsaved sheet and allows choosing the same file again", async () => {
    const editor = page()
    const input = event("[C]Hello")
    await editor.importText(input)
    expect(input.currentTarget.value).toBe("")
    expect(editor.state.activeId).toBe("")
    expect(editor.state.title).toBe("Song")
    expect(editor.state.source).toBe("[C]Hello")
    expect(editor.state.importingText).toBeFalse()
  })

  it("keeps the editor and saved sheets intact when replacement is cancelled", async () => {
    const previousWindow = globalThis.window
    if (previousWindow) spyOn(previousWindow, "confirm").and.returnValue(false)
    else globalThis.window = {confirm: () => false}
    try {
      const editor = page()
      Object.assign(editor.state, {title: "Existing", source: "[G]Draft", activeId: "one", shift: 4})
      await editor.importText(event("[C]Other"))
      expect(editor.state.source).toBe("[G]Draft")
      expect(editor.state.activeId).toBe("one")
      expect(editor.state.shift).toBe(4)
      expect(editor.state.importingText).toBeFalse()
    } finally {
      if (!previousWindow) delete globalThis.window
    }
  })

  it("preserves the draft after an invalid file or read failure and permits retry", async () => {
    const editor = page()
    await editor.importText(event("\0"))
    expect(editor.state.textImportError).toBeTruthy()
    const failed = event("[C]")
    failed.currentTarget.files[0].text = async () => { throw new Error("read failed") }
    await editor.importText(failed)
    expect(editor.state.source).toBe("")
    expect(editor.state.importingText).toBeFalse()
    await editor.importText(event("[D]Retry"))
    expect(editor.state.source).toBe("[D]Retry")
    expect(editor.state.textImportError).toBe("")
  })
})

describe("ChordPro import", () => {
  it("imports metadata and sections without changing the written chord key", () => {
    const sheet = importChordSheet("\uFEFF{title: My song}\r\n{artist: Player}\r\n{capo: 2}\r\n{start_of_chorus: Last chorus}\r\n[C]Hello [G/B]world\r\n{end_of_chorus}", "other.cho")
    expect(sheet.title).toBe("My song")
    expect(sheet.source).toBe("\nPlayer\nCapo: 2 (chords as written)\nLast chorus\n[C]Hello [G/B]world\n")
    expect(sheet.shift).toBe(0)
    expect(exportChordSheet(sheet.source, 2)).toContain("[D]Hello [A/C#]world")
  })

  it("supports aliases, retains unsupported content, and uses filename fallback", () => {
    expect(importChordSheet("{soc}\n[Am]Sing\n{eoc}\n{c: Softly}\n{key: Am}", "Song.chordpro"))
      .toEqual({title: "Song", source: "Chorus\n[Am]Sing\n\nSoftly\n{key: Am}", shift: 0, flats: false})
    expect(importChordSheet("{t: First}\n{title: Second}\n{sov}\n{sob}").title).toBe("First")
    expect(importChordSheet("{sov}\n{sob}").source).toBe("Verse\nBridge")
  })

  it("rejects oversized input and titles before replacing the draft", () => {
    expect(() => importChordSheet("{title: " + "x".repeat(121) + "}")).toThrow()
    expect(() => importChordSheet("{title: " + "x".repeat(SHEET_SOURCE_LIMIT) + "}")).toThrow()
  })
})


describe("chord sheet editor recovery", () => {
  let previousStorage, previousCancel, storage, entries
  const saved = {id: "one", title: "Saved", source: "[C]Original", shift: 0, flats: false}
  const draft = {title: "Edited", source: "[Am]Unsaved", shift: -2, flats: true, activeId: "one"}
  function page() {
    const editor = new ChordSheetPage({})
    editor.setState = (update, callback) => {
      Object.assign(editor.state, typeof update === "function" ? update(editor.state) : update)
      callback?.()
    }
    return editor
  }
  beforeEach(() => {
    previousStorage = globalThis.localStorage
    previousCancel = globalThis.cancelAnimationFrame
    globalThis.cancelAnimationFrame = () => {}
    entries = {[SONGBOOK_STORAGE_KEY]: JSON.stringify([saved])}
    storage = {
      getItem: key => entries[key] ?? null,
      setItem: (key, value) => { entries[key] = value },
    }
    globalThis.localStorage = storage
  })
  afterEach(() => {
    globalThis.cancelAnimationFrame = previousCancel
    if (previousStorage === undefined) delete globalThis.localStorage
    else globalThis.localStorage = previousStorage
  })

  it("restores unsaved edits and transposition after reopening without updating saved songs", () => {
    writeEditorDraft(storage, draft)
    const editor = page()
    editor.loadEditor()
    for (const key of Object.keys(draft)) expect(editor.state[key]).toEqual(draft[key])
    expect(editor.state.sheets).toEqual([saved])
    expect(readSongbook(storage)).toEqual([saved])
    expect(editor.state.notice).toContain("Restored")
  })

  it("keeps a recovered sheet as new when its saved entry was deleted", () => {
    writeEditorDraft(storage, draft)
    expect(readEditorDraft(storage, [])).toEqual({...draft, activeId: ""})
  })

  it("records clearing the editor so an older draft cannot reappear", () => {
    writeEditorDraft(storage, draft)
    const empty = {title: "", source: "", shift: 0, flats: false, activeId: ""}
    writeEditorDraft(storage, empty)
    expect(readEditorDraft(storage, [saved])).toEqual(empty)
    const editor = page()
    editor.loadEditor()
    expect(editor.state.source).toBe("")
    expect(editor.state.activeId).toBe("")
  })

  it("rejects corrupt or unsupported drafts and falls back to the saved song", () => {
    for (const value of ["{", "null", JSON.stringify({...draft, version: 2}),
      JSON.stringify({...draft, version: 1, shift: 13}),
      JSON.stringify({...draft, version: 1, source: "x".repeat(SHEET_SOURCE_LIMIT + 1)})]) {
      entries[SHEET_EDITOR_STORAGE_KEY] = value
      expect(() => readEditorDraft(storage, [saved])).toThrow()
      const editor = page()
      editor.loadEditor()
      expect(editor.state.source).toBe(saved.source)
      expect(editor.state.notice).toContain("Could not recover")
    }
  })

  it("recovers the draft independently of a corrupt songbook", () => {
    writeEditorDraft(storage, draft)
    entries[SONGBOOK_STORAGE_KEY] = "{"
    const editor = page()
    editor.loadEditor()
    expect(editor.state.source).toBe(draft.source)
    expect(editor.state.activeId).toBe("")
    expect(editor.state.sheets).toEqual([])
  })

  it("backs up changed editor fields but ignores status and playback changes", () => {
    const editor = page()
    editor.loadEditor()
    const previous = {...editor.state}
    Object.assign(editor.state, draft)
    editor.componentDidUpdate({}, previous)
    expect(readEditorDraft(storage, [saved])).toEqual(draft)
    spyOn(storage, "setItem")
    editor.componentDidUpdate({}, {...editor.state, scrolling: true, notice: "other"})
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  it("warns once per storage failure and resumes recovery writes on retry", () => {
    const editor = page()
    editor.loadEditor()
    const previous = {...editor.state}
    Object.assign(editor.state, draft)
    const write = spyOn(storage, "setItem").and.throwError("quota")
    editor.componentDidUpdate({}, previous)
    const noticeId = editor.state.noticeId
    editor.componentDidUpdate({}, previous)
    expect(editor.state.notice).toContain("Could not back up")
    expect(editor.state.noticeId).toBe(noticeId)
    expect(editor.state.source).toBe(draft.source)
    write.and.callThrough()
    editor.componentDidUpdate({}, previous)
    expect(readEditorDraft(storage, [saved])).toEqual(draft)
    write.and.throwError("quota")
    editor.componentDidUpdate({}, previous)
    expect(editor.state.noticeId).toBe(noticeId + 1)
  })
})


describe("Songbook search", () => {
  const sheets = [
    {id: "1", title: "Song 10", source: "[Am]Café moon"},
    {id: "2", title: "Song 2", source: "[G]Sunrise"},
    {id: "3", title: "", source: "Moon river"},
  ]
  it("matches all words across titles and lyrics, ignoring case, accents and spacing", () => {
    expect(searchSongbook(sheets, "  CAFE  song ").map(sheet => sheet.id)).toEqual(["1"])
    expect(searchSongbook(sheets, "moon").map(sheet => sheet.id)).toEqual(["1", "3"])
    expect(searchSongbook(sheets, "missing")).toEqual([])
  })
  it("sorts naturally by title without changing saved order or entries", () => {
    expect(searchSongbook(sheets, "", "title").map(sheet => sheet.id)).toEqual(["2", "1", "3"])
    expect(searchSongbook(sheets, "  ").map(sheet => sheet.id)).toEqual(["1", "2", "3"])
    expect(searchSongbook(sheets)[0]).toBe(sheets[0])
    expect(searchSongbook([], "moon", "title")).toEqual([])
  })
  it("keeps the current sheet selectable outside search without changing the editor draft", () => {
    const page = new ChordSheetPage({})
    Object.assign(page.state, {sheets, activeId: "1", title: "Unsaved title", source: "Unsaved lyrics", songbookQuery: "sunrise"})
    const tree = page.render()
    const elements = []
    const visit = node => {
      if (!node || typeof node !== "object") return
      if (Array.isArray(node)) return node.forEach(visit)
      elements.push(node)
      visit(node.props?.children)
    }
    visit(tree)
    // The current sheet stays named in the trigger even when filtered out.
    expect(elements.find(node => node.props?.id === "sheet-selection").props.children).toBe("Song 10")
    const choices = elements.filter(node => node.type === "button" && node.props["aria-pressed"] !== undefined && node.props.children?.[0]?.type === "span")
    const text = choices.map(node => node.props.children[0].props.children)
    expect(text).toContain("Song 2")
    expect(text).not.toContain("Song 10")
    expect(text).not.toContain("Untitled song")
    expect(page.state.title).toBe("Unsaved title")
    expect(page.state.source).toBe("Unsaved lyrics")
    expect(page.state.activeId).toBe("1")
  })
})
