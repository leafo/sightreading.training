import * as React from "react"
import {downloadFile} from "st/browser_download"
import ui from "../ui.module.css"
import {tabNavigationIndex} from "st/tab_navigation"
import {IconVoicings, IconChordLab, ActionIcon} from "st/components/control_icons"

import {setTitle} from "st/globals"
import {STARTER_SHEETS} from "st/starter_sheets"
import SheetVoicings from "st/components/sheet_voicings"
import {readDefinitions, addDefinition, putDefinition, fretText} from "st/voicing_markup"
import {createLabHandoff, readLabHandoff, incomingVoicing} from "st/voicing_handoff"
import ChordDiagram, {DiagramAction} from "st/components/chord_diagram"
import {sheetChordDiagrams} from "st/sheet_chord_diagrams"
import {chordDiagramAscii} from "st/chord_diagram_data"
import Toast from "st/components/toast"
import {
  exportChordSheet, importChordSheet, exportSongbook, importSongbook, SONGBOOK_BACKUP_SIZE_LIMIT,
  searchSongbook, readEditorDraft, writeEditorDraft, parseChordSheet, readSongbook, SONGBOOK_STORAGE_KEY, SHEET_TITLE_LIMIT, SHEET_SOURCE_LIMIT,
} from "st/chord_sheet"
import styles from "./chord_sheet_page.module.css"

const UI_STORAGE_KEY = "chord-sheet-ui:v1"
const STARTERS = STARTER_SHEETS.map(sheet => ({...sheet, id: `starter:${sheet.id}`, shift: 0, flats: false}))

const EMPTY_SHEET = {title: "", source: "", shift: 0, flats: false}

export default class ChordSheetPage extends React.Component {
  state = {...EMPTY_SHEET, voicingsOpen: false, activeChord: "", sheets: [], songbookQuery: "", songbookSort: "saved", activeId: "", notice: "", noticeId: 0, practicing: false, scrolling: false, scrollSpeed: 30, diagramMode: "block", tab: "create", scrollTop: 0, importMode: "songbook", importFile: null, importOpen: false}

  componentDidMount() {
    setTitle("Chord Sheet Maker")
    this.loadEditor()
  }

  loadEditor() {
    let sheets = [], notice = ""
    try {
      sheets = readSongbook(localStorage)
    } catch {
      notice = "Could not load saved sheets."
    }
    let draft
    try {
      draft = readEditorDraft(localStorage, [...sheets, ...STARTERS])
      if (draft) notice = notice || "Restored your last editor draft."
    } catch {
      notice = notice || "Could not recover the last editor draft. Saved sheets are still available if they loaded successfully."
    }
    const starter = STARTER_SHEETS.find(sheet => sheet.id === new URLSearchParams(globalThis.location?.search || "").get("starter"))
    if (starter) {
      draft = {...starter, shift: 0, flats: false, activeId: `starter:${starter.id}`}
      // Consume explicit starter links so refreshing preserves subsequent edits.
      const url = new URL(globalThis.location.href)
      url.searchParams.delete("starter")
      globalThis.history?.replaceState(null, "", url.pathname + url.search + url.hash)
    }
    try {
      const mode = localStorage.getItem("chord-sheet-diagrams:v1")
      if (["block", "line", "hidden"].includes(mode)) this.setState({diagramMode: mode})
    } catch { /* Use block diagrams when storage is unavailable. */ }
    let ui = {}
    try {
      const stored = JSON.parse(localStorage.getItem(UI_STORAGE_KEY))
      if (stored?.version === 1) {
        if (typeof stored.voicingsOpen === "boolean") ui.voicingsOpen = stored.voicingsOpen
        if (["create", "practice", "info"].includes(stored.tab)) ui.tab = stored.tab
        if (["saved", "title"].includes(stored.songbookSort)) ui.songbookSort = stored.songbookSort
        if (typeof stored.songbookQuery === "string") ui.songbookQuery = stored.songbookQuery.slice(0, 1000)
        if (["block", "line", "hidden"].includes(stored.diagramMode)) ui.diagramMode = stored.diagramMode
        if (Number.isFinite(stored.scrollSpeed)) ui.scrollSpeed = Math.min(100, Math.max(5, stored.scrollSpeed))
        if (Number.isFinite(stored.scrollTop)) ui.scrollTop = Math.max(0, stored.scrollTop)
      }
    } catch { /* Recover the song even if UI preferences are corrupt. */ }
    const first = sheets[0] || STARTERS[0]
    this.restoring = true
    this.setState({sheets, ...ui, ...(draft || first),
      practicing: ui.tab === "practice", activeId: draft ? draft.activeId : first.id}, () => {
      this.restoring = false
      this.editorLoaded = true
      // Persist the initial starter and explicit starter links as well as later edits.
      this.persistEditor()
      if (notice) this.notify(notice)
      this.loadIncomingVoicing()
    })
  }

  persistEditor() {
    try {
      writeEditorDraft(localStorage, this.state)
      const {tab, songbookQuery, songbookSort, scrollSpeed, scrollTop, diagramMode, voicingsOpen} = this.state
      localStorage.setItem(UI_STORAGE_KEY, JSON.stringify({version: 1, tab, songbookQuery, songbookSort, scrollSpeed, scrollTop, diagramMode, voicingsOpen}))
      this.draftWriteFailed = false
    } catch {
      if (!this.draftWriteFailed) {
        this.draftWriteFailed = true
        this.notify("Could not back up your changes. Save or download your work before leaving.")
      }
    }
  }

  editorInput = React.createRef()
  insertPosition = 0

  changeVoicingSource = source => {
    if (source.length > SHEET_SOURCE_LIMIT) { this.setState({voicingError: "Sheet is full. Shorten the text before adding a voicing."}); return }
    this.pauseScroll()
    const previous = this.state.source
    let prefix = 0, suffix = 0
    while (prefix < Math.min(previous.length, source.length) && previous[prefix] === source[prefix]) prefix++
    while (suffix < Math.min(previous.length, source.length) - prefix && previous[previous.length - suffix - 1] === source[source.length - suffix - 1]) suffix++
    if (this.insertPosition >= previous.length - suffix) this.insertPosition += source.length - previous.length
    else if (this.insertPosition > prefix) this.insertPosition = source.length - suffix
    this.insertPosition = Math.max(0, this.insertPosition)
    this.setState({source, shift: 0, voicingError: ""})
  }

  insertVoicing = (token, normalized) => {
    // Transposition can change text length: map the original cursor through the same export.
    let position = Math.min(this.insertPosition, this.state.source.length)
    if (this.state.shift) {
      try { position = exportChordSheet(this.state.source.slice(0, position), this.state.shift, this.state.flats).length } catch { position = normalized.length }
    }
    const source = normalized.slice(0, position) + token + normalized.slice(position)
    if (source.length > SHEET_SOURCE_LIMIT) { this.setState({voicingError: "Sheet is full."}); return }
    this.changeVoicingSource(source)
    this.selectTab("create")
    if (globalThis.matchMedia?.("(max-width: 900px)").matches) this.setState({voicingsOpen: false})
    this.insertPosition = position + token.length
    this.setState({}, () => { this.editorInput.current?.focus(); this.editorInput.current?.setSelectionRange(this.insertPosition, this.insertPosition) })
  }

  openVoicingLab = (name, frets, alias) => {
    this.pauseScroll()
    try {
      this.persistEditor()
      if (this.draftWriteFailed) throw new Error("Save or download your sheet before opening the Lab; draft recovery is unavailable.")
      const {source, title, activeId, shift, flats} = this.state
      const id = createLabHandoff({source, title, activeId, shift, flats, name, alias})
      window.location.assign(`/chord-lab?frets=${frets.map(f => f ?? "x").join(",")}&chord=${encodeURIComponent(name)}&sheetReturn=${id}`)
    } catch (e) { this.setState({voicingError: e.message}) }
  }

  loadIncomingVoicing() {
    const params = new URLSearchParams(globalThis.location?.search || "")
    if (!params.has("voicing")) return
    this.pauseScroll()
    try {
      const incoming = incomingVoicing(params)
      if (!incoming) throw new Error("Invalid incoming voicing.")
      const ticket = params.get("sheetReturn")
      this.setState({incoming, incomingContext: readLabHandoff(ticket), incomingTicket: ticket, incomingAction: params.get("action"), voicingError: ""})
    } catch (e) { this.setState({voicingError: e.message}); this.clearIncomingVoicing() }
  }

  clearIncomingVoicing = () => {
    const url = new URL(globalThis.location.href)
    ;["voicing", "sheetReturn", "action"].forEach(key => url.searchParams.delete(key))
    globalThis.history?.replaceState(null, "", url.pathname + url.search + url.hash)
    if (this.state.incomingTicket) { try { sessionStorage.removeItem(`sheet-lab:${this.state.incomingTicket}`) } catch { /* Optional handoff storage. */ } }
    this.setState({incoming: null, incomingContext: null, incomingTicket: null})
  }

  acceptIncomingVoicing = replace => {
    const {incoming, incomingContext: context, source, title, activeId, shift, flats} = this.state
    try {
      if (replace && (!context?.alias || context.source !== source || context.title !== title || context.activeId !== activeId || context.shift !== shift || context.flats !== flats)) {
        throw new Error("The originating sheet changed. Add this as a new variation instead, or cancel.")
      }
      const normalized = exportChordSheet(source, shift, flats)
      if (replace && incoming.name !== context.name) throw new Error("The chord name changed. Add it as a variation to preserve the original chord references.")
      const next = replace ? putDefinition(normalized, incoming.name, context.alias, incoming.frets) : addDefinition(normalized, incoming.name, incoming.frets).source
      if (next.length > SHEET_SOURCE_LIMIT) throw new Error("Sheet is full. Shorten the text first.")
      this.changeVoicingSource(next)
      this.setState({voicingsOpen: true, activeChord: incoming.name})
      this.clearIncomingVoicing()
      this.notify(replace ? "Sheet voicing replaced. Save the sheet to keep it in your songbook." : "Voicing added. Insert it into lyrics from the voicing panel.")
    } catch (e) { this.setState({voicingError: e.message}) }
  }

  preview = React.createRef()

  componentDidUpdate(previousProps, previousState) {
    if (this.restoring) {
      this.restoring = false
      if (this.preview.current) this.preview.current.scrollTop = this.state.scrollTop
      return
    }
    if (this.editorLoaded && ["title", "source", "shift", "flats", "activeId", "tab", "songbookQuery", "songbookSort", "scrollSpeed", "scrollTop", "diagramMode", "voicingsOpen"].some(key => previousState[key] !== this.state[key])) {
      this.persistEditor()
    }
    if (previousState.source !== this.state.source || previousState.activeId !== this.state.activeId) {
      this.pauseScroll()
      if (this.preview.current) this.preview.current.scrollTop = 0
      if (this.state.scrollTop) this.setState({scrollTop: 0})
    }
  }

  componentWillUnmount() {
    cancelAnimationFrame(this.scrollFrame)
  }

  pauseScroll = () => {
    cancelAnimationFrame(this.scrollFrame)
    this.scrollFrame = null
    this.lastScrollTime = null
    if (this.state.scrolling) this.setState({scrolling: false})
  }

  startScroll = () => {
    if (this.state.scrolling || !this.state.practicing || !this.state.source.trim()) return
    this.lastScrollTime = null
    this.setState({scrolling: true}, () => {
      this.scrollFrame = requestAnimationFrame(this.advanceScroll)
    })
  }

  advanceScroll = time => {
    const preview = this.preview.current
    if (!preview || !this.state.scrolling) return
    if (this.lastScrollTime != null) {
      // Retain fractional pixels; cap elapsed time to avoid a jump after backgrounding.
      this.scrollPosition += this.state.scrollSpeed * Math.min(time - this.lastScrollTime, 100) / 1000
      preview.scrollTop = this.scrollPosition
    } else {
      this.scrollPosition = preview.scrollTop
    }
    this.lastScrollTime = time
    if (preview.scrollTop >= preview.scrollHeight - preview.clientHeight - 1) {
      this.pauseScroll()
      return
    }
    this.scrollFrame = requestAnimationFrame(this.advanceScroll)
  }

  togglePractice = () => {
    this.pauseScroll()
    this.selectTab(this.state.practicing ? "create" : "practice")
  }

  selectTab(tab) {
    this.pauseScroll()
    this.setState({tab, practicing: tab === "practice"}, () => {
      if (tab === "practice" && this.preview.current) {
        this.preview.current.scrollTop = this.state.scrollTop
      }
    })
  }

  importDialog = React.createRef()
  importButton = React.createRef()

  openImport = () => {
    this.pauseScroll()
    this.setState({importOpen: true, importFile: null, importError: "", textImportError: ""}, () => this.importDialog.current?.showModal())
  }

  closeImport = () => {
    if (this.state.importing || this.state.importingText) return
    this.importDialog.current?.close()
    this.setState({importOpen: false}, () => this.importButton.current?.focus())
  }

  submitImport = async () => {
    if (!this.state.importFile || this.state.importing || this.state.importingText) return
    const event = {currentTarget: {files: [this.state.importFile], value: ""}}
    if (this.state.importMode === "songbook") await this.restoreBackup(event)
    else await this.importText(event)
  }

  notify(notice) {
    this.setState(({noticeId}) => ({notice, noticeId: noticeId + 1}))
  }

  open(id) {
    const {sheets, activeId, title, source, shift, flats} = this.state
    if (id && id === activeId) return
    const saved = [...sheets, ...STARTERS].find(sheet => sheet.id === activeId) || EMPTY_SHEET
    const dirty = title !== saved.title || source !== saved.source ||
      shift !== saved.shift || flats !== saved.flats
    if (dirty && !window.confirm("Discard unsaved changes to this sheet?")) return
    this.setState({...([...sheets, ...STARTERS].find(sheet => sheet.id === id) || EMPTY_SHEET), activeId: id, scrollTop: 0})
  }

  save() {
    const {activeId, title, source, shift, flats} = this.state
    try {
      const sheets = readSongbook(localStorage)
      const id = sheets.some(sheet => sheet.id === activeId) ? activeId : crypto.randomUUID()
      const sheet = {id, title, source, shift, flats}
      const updated = sheets.some(saved => saved.id === id)
        ? sheets.map(saved => saved.id === id ? sheet : saved)
        : [sheet, ...sheets]
      localStorage.setItem(SONGBOOK_STORAGE_KEY, JSON.stringify(updated))
      this.setState({sheets: updated, activeId: id})
      this.notify("Sheet saved.")
    } catch {
      this.notify("Could not save the sheet in this browser.")
    }
  }

  remove() {
    const {activeId} = this.state
    if (!this.state.sheets.some(sheet => sheet.id === activeId)) return
    if (!window.confirm("Delete this saved sheet and discard any unsaved changes?")) return
    try {
      const sheets = readSongbook(localStorage).filter(sheet => sheet.id !== activeId)
      localStorage.setItem(SONGBOOK_STORAGE_KEY, JSON.stringify(sheets))
      this.setState({...EMPTY_SHEET, sheets, activeId: ""})
      this.notify("Saved sheet deleted.")
    } catch {
      this.notify("Could not delete the saved sheet.")
    }
  }

  downloadBackup() {
    try {
      const backup = exportSongbook(readSongbook(localStorage))
      downloadFile(backup, "music-tools-songbook.json", "application/json")
    } catch {
      this.notify("Could not download the songbook backup.")
    }
  }

  downloadText() {
    const {title, source, shift, flats} = this.state
    try {
      const text = exportChordSheet(source, shift, flats)
      const filename = title.trim().replace(/[^\p{L}\p{N} _-]/gu, "").slice(0, 80).trim() || "chord-sheet"
      downloadFile(text, `${filename}.txt`, "text/plain;charset=utf-8")
    } catch {
      this.setState({voicingError: "Could not export text. Fix invalid or out-of-range transposed voicings and try again."})
    }
  }

  async importText(event) {
    const input = event.currentTarget
    const file = input.files[0]
    input.value = ""
    if (!file || this.state.importingText) return
    // UTF-8 can use up to four bytes per character; validate decoded length too.
    if (file.size > SHEET_SOURCE_LIMIT * 4 + 3) {
      this.setState({textImportError: "Choose a text sheet with no more than 16,000 characters."})
      return
    }
    this.setState({importingText: true, textImportError: ""})
    try {
      const sheet = importChordSheet(await file.text(), file.name)
      if ((this.state.title || this.state.source) &&
          !window.confirm("Replace the current editor with this text sheet? Saved sheets will be kept.")) return
      this.setState({...sheet, activeId: "", importOpen: false}, () => this.importButton.current?.focus())
      this.notify("Text sheet opened. Save it to keep it in this browser.")
    } catch {
      this.setState({textImportError: "Choose a nonempty text sheet with no more than 16,000 characters and no null characters."})
    } finally {
      this.setState({importingText: false})
    }
  }

  async restoreBackup(event) {
    const input = event.currentTarget
    const file = input.files[0]
    input.value = ""
    if (!file) return
    if (file.size > SONGBOOK_BACKUP_SIZE_LIMIT) {
      this.setState({importError: "Choose a songbook backup no larger than 32 MB."})
      return
    }

    this.setState({importing: true, importError: ""})
    try {
      const backup = await file.text()
      const existing = readSongbook(localStorage)
      let sheets
      try {
        sheets = importSongbook(backup, existing, () => crypto.randomUUID())
      } catch {
        this.setState({importError: "Choose a valid Music Tools songbook backup."})
        return
      }
      const added = sheets.length - existing.length
      if (added) localStorage.setItem(SONGBOOK_STORAGE_KEY, JSON.stringify(sheets))
      this.setState({sheets, importOpen: false}, () => this.importButton.current?.focus())
      this.notify(added ? `Imported ${added} ${added === 1 ? "sheet" : "sheets"}.` : "No new sheets to import.")
    } catch {
      this.setState({importError: "Could not read the backup or save the imported sheets in this browser."})
    } finally {
      this.setState({importing: false})
    }
  }

  renderPreview() {
    const {title, source, shift, flats, diagramMode} = this.state
    const diagrams = diagramMode === "hidden" ? [] : sheetChordDiagrams(source, shift, flats)
    return <section ref={this.preview} className={styles.preview} aria-label="Chord sheet preview" tabIndex={0}
      onScroll={event => { if (this.state.tab === "practice") this.setState({scrollTop: event.currentTarget.scrollTop}) }}
      onWheel={this.pauseScroll} onTouchStart={this.pauseScroll} onPointerDown={this.pauseScroll}
      onKeyDown={event => {
        if (event.key === "Escape") this.selectTab("create")
        if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) this.pauseScroll()
      }}>
      <h2>{title.trim() || "Untitled song"}</h2>
      {diagrams.length > 0 && <div className={styles.diagrams} aria-label="Chords used in this sheet">
        {diagrams.map(({name, voicing, alias, key, error}) => <div key={key}>
          {!voicing ? <p role={error ? "alert" : undefined}>{name}{alias ? ` · ${alias}` : ""}: {error || "diagram unavailable"}</p> : diagramMode === "block"
            ? <ChordDiagram {...voicing} name={name} caption={alias ? `${name} · ${alias}` : true} actions={<>
                <DiagramAction label={`Choose voicings for ${name}`} onClick={() => { this.pauseScroll(); this.setState({voicingsOpen: true, activeChord: name}) }}><IconVoicings /></DiagramAction>
                <DiagramAction label={`Open ${name} in Chord Lab`} onClick={() => this.openVoicingLab(name, voicing.frets, alias)}><IconChordLab /></DiagramAction>
              </>} />
            : <code>{chordDiagramAscii(voicing.frets, name, "line")}{alias ? ` · ${alias}` : ""}</code>}
          {!voicing && <button type="button" onClick={() => this.setState({voicingsOpen: true, activeChord: name})}>Choose voicings for {name}</button>}
        </div>)}
      </div>}
      {source.trim() ? parseChordSheet(source, shift, flats).map((line, lineIndex) =>
        <div className={styles.line} key={lineIndex}>
          {line.map(({chord, lyric, voicing}, segmentIndex) => <span className={styles.segment} key={segmentIndex}>
            {chord && <strong><button type="button" className={styles.lyricChord} onClick={() => { this.pauseScroll(); this.setState({voicingsOpen: true, activeChord: chord}) }}>{chord}{voicing && <small>{voicing.alias || fretText(voicing.frets || [])}{voicing.error ? " ⚠" : ""}</small>}</button></strong>}{voicing?.error && <small role="alert">{voicing.error}</small>}<span>{lyric}</span>
          </span>)}
        </div>
      ) : <p>No sheet content.</p>}
    </section>
  }

  render() {
    const {title, source, notice, noticeId, shift, flats, sheets, activeId, tab} = this.state
    const allSheets = [...STARTERS, ...sheets]
    const visibleSheets = searchSongbook(allSheets, this.state.songbookQuery, this.state.songbookSort)
    const selected = allSheets.find(sheet => sheet.id === activeId)
    return <main className={`${ui.tool_page} ${styles.page}`} onPointerDown={event => {
      event.currentTarget.querySelectorAll("details[data-sheet-popover][open]").forEach(details => {
        if (!details.contains(event.target)) details.open = false
      })
    }}>
      <h1>Chord Sheet Maker</h1>
      <div className={styles.workspace}>
        <div className={styles.tabs} role="tablist" aria-label="Chord Sheet Maker">
          {["create", "practice", "info"].map((name, index, tabs) => <button key={name} type="button"
            id={`sheet-tab-${name}`} role="tab" aria-selected={tab === name} aria-controls={`sheet-panel-${name}`}
            tabIndex={tab === name ? 0 : -1}
            onClick={() => this.selectTab(name)} onKeyDown={event => {
              const nextIndex = tabNavigationIndex(event.key, index, tabs.length)
              if (nextIndex !== null) {
                event.preventDefault()
                const next = tabs[nextIndex]
                this.selectTab(next)
                document.getElementById(`sheet-tab-${next}`)?.focus()
              }
            }}>{name[0].toUpperCase() + name.slice(1)}</button>)}
        </div>
        {this.state.voicingError && <p role="alert">{this.state.voicingError}</p>}
        {readDefinitions(source).errors.map(e => <p role="alert" key={e.lineIndex}>{e.message}</p>)}
        {this.state.incoming && <section className={styles.incoming} aria-label="Incoming voicing">
          <h2>{this.state.incomingAction === "replace" ? "Review replacement voicing" : "Add voicing to sheet"}</h2>
          <p><strong>{this.state.incoming.name}</strong> · <code>{fretText(this.state.incoming.frets)}</code> · standard tuning</p>
          <ChordDiagram frets={this.state.incoming.frets} name={this.state.incoming.name} />
          <label>Destination sheet<select value={activeId} onChange={e => this.open(e.target.value)}>
            <option value="">New sheet / current draft</option>
            {allSheets.map(sheet => <option key={sheet.id} value={sheet.id}>{sheet.title || "Untitled"}</option>)}
          </select></label>
          <p>Current sheet: {title || "Untitled song"}. Adding a variation preserves existing lyrics.</p>
          <button type="button" onClick={() => this.acceptIncomingVoicing(false)}>Add variation</button>
          {this.state.incomingContext?.alias && <button type="button" onClick={() => this.acceptIncomingVoicing(true)}>Replace {this.state.incomingContext.alias}</button>}
          <button type="button" onClick={this.clearIncomingVoicing}>Cancel</button>
        </section>}
        <div className={`${styles.sheetLayout} ${this.state.voicingsOpen && tab !== "info" ? styles.withVoicings : ""}`}>
        <div className={styles.sheetMain}>
        <section id="sheet-panel-create" role="tabpanel" aria-labelledby="sheet-tab-create" hidden={tab !== "create"} className={styles.editor}>
          <div className={styles.actions}>
            <div className={styles.sheetPicker}><span id="sheets-label">Sheets</span>
              <details data-sheet-popover onToggle={event => { if (event.currentTarget.open) event.currentTarget.querySelector("input")?.focus() }}>
                <summary aria-labelledby="sheets-label sheet-selection" onKeyDown={event => { if (event.key === "Escape") event.currentTarget.parentElement.open = false }}>
                  <span id="sheet-selection">{selected?.title || "New sheet"}</span><span aria-hidden="true">⌄</span>
                </summary>
                <div className={styles.sheetMenu} onKeyDown={event => {
                  if (event.key === "Escape") { const details = event.currentTarget.closest("details"); details.open = false; details.querySelector("summary").focus() }
                }}>
                  <input aria-label="Search sheets" type="search" placeholder="Search sheets…" value={this.state.songbookQuery}
                    onChange={event => this.setState({songbookQuery: event.target.value})} />
                  <div className={styles.sheetOptions}>
                    <button type="button" onClick={event => { this.open(""); event.currentTarget.closest("details").open = false }}>+ New sheet</button>
                    {visibleSheets.map(sheet => <button type="button" key={sheet.id} aria-pressed={activeId === sheet.id}
                      onClick={event => { this.open(sheet.id); const details = event.currentTarget.closest("details"); details.open = false; details.querySelector("summary").focus() }}>
                      <span>{sheet.title.trim() || "Untitled song"}</span><small>{STARTERS.some(s => s.id === sheet.id) ? "Starter" : "Saved"}</small>
                    </button>)}
                    {!visibleSheets.length && <p>No matching sheets.</p>}
                  </div>
                </div>
              </details>
            </div>
            <label>Sort<select value={this.state.songbookSort} onChange={event => this.setState({songbookSort: event.target.value})}>
              <option value="saved">Date</option><option value="title">A–Z</option>
            </select></label>
            <div className={styles.fileActions}>
              <button ref={this.importButton} type="button" onClick={this.openImport}>Import</button>
              <details data-sheet-popover className={styles.exportMenu}><summary>Export <span aria-hidden="true">⌄</span></summary>
                <div className={styles.exportOptions} onClick={event => { event.currentTarget.closest("details").open = false }} onKeyDown={event => {
                  if (event.key === "Escape") { const details = event.currentTarget.closest("details"); details.open = false; details.querySelector("summary").focus() }
                }}>
                  <button type="button" disabled={!sheets.length} onClick={() => this.downloadBackup()}>Download JSON songbook</button>
                  <button type="button" disabled={!source.trim()} onClick={() => this.downloadText()}>Download Chord Sheet text</button>
                  <button type="button" disabled={!source.trim()} onClick={() => window.print()}>Print / Save PDF</button>
                </div>
              </details>
              <button className={styles.iconButton} type="button" title="Save sheet" aria-label="Save sheet" disabled={!title.trim() && !source.trim()} onClick={() => this.save()}><ActionIcon name="save" /></button>
              <button className={styles.iconButton} type="button" title="Delete saved sheet" aria-label="Delete saved sheet" disabled={!sheets.some(sheet => sheet.id === activeId)} onClick={() => this.remove()}><ActionIcon name="trash" /></button>
            </div>
          </div>
          <button type="button" className={styles.iconButton} aria-label="Choose voicings" title="Choose voicings" aria-controls="sheet-voicing-panel" aria-expanded={this.state.voicingsOpen} onClick={() => { this.pauseScroll(); this.setState({voicingsOpen: !this.state.voicingsOpen}) }}><IconVoicings /></button>
          <label>Song title<input value={title} maxLength={SHEET_TITLE_LIMIT} onChange={event => this.setState({title: event.target.value})} /></label>
          <label>Chords and lyrics<textarea ref={this.editorInput} onBlur={event => { this.insertPosition = event.currentTarget.selectionStart }} onSelect={event => { this.insertPosition = event.currentTarget.selectionStart }} value={source} maxLength={SHEET_SOURCE_LIMIT} rows={16} onChange={event => this.setState({source: event.target.value})} /></label>
        </section>
        <section id="sheet-panel-practice" role="tabpanel" aria-labelledby="sheet-tab-practice" hidden={tab !== "practice"} className={styles.practice}>
          <div className={styles.practiceControls}>
            <label>Transpose<select value={shift} onChange={event => this.setState({shift: Number(event.target.value)})}>
              {Array.from({length: 25}, (_, i) => i - 12).map(steps => <option key={steps} value={steps}>{steps === 0 ? "Original key" : `${steps > 0 ? "+" : ""}${steps} semitones`}</option>)}
            </select></label>
            <label>Accidentals<select value={flats ? "flats" : "sharps"} onChange={event => this.setState({flats: event.target.value === "flats"})}><option value="sharps">Sharps</option><option value="flats">Flats</option></select></label>
            <label>Diagrams<select value={this.state.diagramMode} onChange={event => this.setState({diagramMode: event.target.value})}><option value="block">Block</option><option value="line">Line</option><option value="hidden">Hidden</option></select></label>
            <button type="button" className={styles.iconButton} aria-label="Choose voicings" title="Choose voicings" aria-controls="sheet-voicing-panel" aria-expanded={this.state.voicingsOpen} onClick={() => { this.pauseScroll(); this.setState({voicingsOpen: !this.state.voicingsOpen}) }}><IconVoicings /></button>
            <button type="button" disabled={!source.trim()} aria-pressed={this.state.scrolling} onClick={this.state.scrolling ? this.pauseScroll : this.startScroll}>{this.state.scrolling ? "Pause scrolling" : "Start scrolling"}</button>
            <button className={styles.iconButton} type="button" title="Back to top" aria-label="Back to top" onClick={() => { this.pauseScroll(); this.preview.current.scrollTop = 0; this.setState({scrollTop: 0}) }}>↥</button>
            <label>Speed<input aria-label="Scroll speed" type="range" min="5" max="100" step="5" value={this.state.scrollSpeed} onChange={event => this.setState({scrollSpeed: Number(event.target.value)})} /></label>
          </div>
          {this.renderPreview()}
        </section>
        </div>
        {this.state.voicingsOpen && tab !== "info" && <SheetVoicings source={source} shift={shift} flats={flats} activeChord={this.state.activeChord}
          onActiveChord={activeChord => this.setState({activeChord})} onChange={this.changeVoicingSource} onInsert={this.insertVoicing} onLab={this.openVoicingLab}
          onClose={() => this.setState({voicingsOpen: false}, () => document.querySelector(`#sheet-panel-${this.state.tab} [aria-controls="sheet-voicing-panel"]`)?.focus())} />}
        </div>
        <section id="sheet-panel-info" role="tabpanel" aria-labelledby="sheet-tab-info" hidden={tab !== "info"} className={styles.info}>
          <h2>Create a sheet</h2>
          <p>Put chords in brackets just before the words they go with, like <code>[Am]Here comes [F]the chorus</code>. Use blank lines between sections. For an instrumental line, enter just the chords.</p>
          <p>Sheets searches titles and lyrics in both your saved sheets and starter songs. Date keeps the saved order; A–Z sorts by title. Starter originals cannot be deleted or overwritten. Saving a starter creates your own editable copy.</p>
          <h2>Save and return</h2>
          <p>The save icon updates an open saved sheet or creates a new copy. The delete icon deletes only personal saved sheets, after confirmation. Your last tab, search, sort, settings, scroll position, and unsaved edits are restored in this browser. Automatic scrolling stays paused when you return.</p>
          <h2>Import and export</h2>
          <p>Import a JSON songbook backup or a UTF-8 text / ChordPro file. Songbook import keeps existing sheets and skips unchanged copies of previously imported sheets. Text import opens a new unsaved sheet in its written key; the filename supplies a missing title.</p>
          <p>ChordPro titles, artists, comments, sections, and capo notes are imported; other directives stay visible. Capo notes do not transpose chords. Text sheets can contain up to 16,000 characters; songbook backups can be up to 32 MB.</p>
          <p>Download JSON songbook includes saved personal sheets only, so save edits before making a backup. Download Chord Sheet text includes current edits and transposition with bracketed chords. Print / Save PDF prints the rendered sheet, including the selected diagram style.</p>
          <h2>Voicings and Chord Lab</h2>
          <p>Open Voicings to select multiple guitar shapes per chord. Shapes use standard E A D G B E tuning, low string first; x means muted and 0 means open. Labels can be renamed and reordered. Selected shapes are saved as text definitions with the sheet, included in JSON backups, text exports and printed diagrams.</p>
          <p>Paste an exact shape such as <code>[C7@x-3-2-3-1-x]</code>, or define <code>{"{voicing: C7:verse = x-3-2-3-1-x}"}</code> on its own line and use <code>[C7:verse]</code> in lyrics. Insert into lyrics uses your last editor cursor. Undefined labels and invalid shapes show errors. Remove references before removing a named shape. Without selected shapes, plain chords use an automatic diagram.</p>
          <p>Copy markup or Add to sheet from Chord Reference and Chord Lab. Open in Lab sends an exact shape; return with Add variation or Replace this voicing. Replacement requires the originating sheet to be unchanged and the same chord name. Changing the shape selection after transposing writes all chords and shapes in the displayed key. Shapes that leave frets 0–24 need reselection before text export. PDF uses the rendered sheet; editor buttons and the side panel are excluded.</p>
          <h2>Practice</h2>
          <p>Practice shows chords above the lyrics. Transpose the sheet, choose sharps or flats, and display block diagrams, line diagrams, or no diagrams. Start scrolling and adjust the speed. Scroll manually to pause, or use Back to top. Escape returns to Create. Tab changes pause scrolling.</p>
        </section>
      </div>
      {this.state.importOpen && <dialog ref={this.importDialog} className={styles.importDialog} aria-labelledby="sheet-import-title" onCancel={event => { event.preventDefault(); this.closeImport() }}>
        <div className={styles.modalHeading}><h2 id="sheet-import-title">Import</h2><button type="button" aria-label="Close import" disabled={this.state.importing || this.state.importingText} onClick={this.closeImport}>×</button></div>
        <fieldset disabled={this.state.importing || this.state.importingText}>
          <legend>Format</legend>
          <label><input type="radio" name="import-format" checked={this.state.importMode === "songbook"} onChange={() => this.setState({importMode: "songbook", importFile: null, importError: "", textImportError: ""})} /> JSON songbook</label>
          <label><input type="radio" name="import-format" checked={this.state.importMode === "text"} onChange={() => this.setState({importMode: "text", importFile: null, importError: "", textImportError: ""})} /> Text / ChordPro</label>
          <input key={this.state.importMode} type="file" aria-label="Choose import file" accept={this.state.importMode === "songbook" ? ".json,application/json" : ".txt,.cho,.crd,.chordpro,.pro,text/plain"} onChange={event => this.setState({importFile: event.target.files[0], importError: "", textImportError: ""})} />
        </fieldset>
        {(this.state.importError || this.state.textImportError) && <p role="alert">{this.state.importError || this.state.textImportError}</p>}
        <div className={styles.modalActions}><button type="button" disabled={this.state.importing || this.state.importingText} onClick={this.closeImport}>Cancel</button><button type="button" disabled={!this.state.importFile || this.state.importing || this.state.importingText} onClick={this.submitImport}>{this.state.importing || this.state.importingText ? "Importing…" : "Import"}</button></div>
      </dialog>}
      <Toast message={notice} notificationId={noticeId} onDismiss={() => this.setState({notice: ""})} />
    </main>
  }
}
