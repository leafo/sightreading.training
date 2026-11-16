import * as React from "react"

import {setTitle} from "st/globals"
import {STARTER_SHEETS} from "st/starter_sheets"
import ChordDiagram from "st/components/chord_diagram"
import {sheetChordDiagrams} from "st/sheet_chord_diagrams"
import {chordDiagramAscii} from "st/chord_diagram_data"
import Toast from "st/components/toast"
import {
  exportChordSheet, importChordSheet, exportSongbook, importSongbook, SONGBOOK_BACKUP_SIZE_LIMIT,
  searchSongbook, readEditorDraft, writeEditorDraft, parseChordSheet, readSongbook, SONGBOOK_STORAGE_KEY, SHEET_TITLE_LIMIT, SHEET_SOURCE_LIMIT,
} from "st/chord_sheet"
import styles from "./chord_sheet_page.module.css"

const EMPTY_SHEET = {title: "", source: "", shift: 0, flats: false}

export default class ChordSheetPage extends React.Component {
  state = {...EMPTY_SHEET, sheets: [], songbookQuery: "", songbookSort: "saved", activeId: "", notice: "", noticeId: 0, practicing: false, scrolling: false, scrollSpeed: 30, diagramMode: "block"}

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
      draft = readEditorDraft(localStorage, sheets)
      if (draft) notice = notice || "Restored your last editor draft."
    } catch {
      notice = notice || "Could not recover the last editor draft. Saved sheets are still available if they loaded successfully."
    }
    const starter = STARTER_SHEETS.find(sheet => sheet.id === new URLSearchParams(globalThis.location?.search || "").get("starter"))
    if (starter) draft = {...starter, shift: 0, flats: false, activeId: ""}
    try {
      const mode = localStorage.getItem("chord-sheet-diagrams:v1")
      if (["block", "line", "hidden"].includes(mode)) this.setState({diagramMode: mode})
    } catch { /* Use block diagrams when storage is unavailable. */ }
    const first = sheets[0]
    this.setState({sheets, ...(draft || first || EMPTY_SHEET),
      activeId: draft ? draft.activeId : first?.id || ""}, () => {
      this.editorLoaded = true
      if (notice && !starter) this.notify(notice)
    })
  }

  preview = React.createRef()

  componentDidUpdate(previousProps, previousState) {
    if (this.editorLoaded && ["title", "source", "shift", "flats", "activeId"].some(key => previousState[key] !== this.state[key])) {
      try {
        writeEditorDraft(localStorage, this.state)
        this.draftWriteFailed = false
      } catch {
        if (!this.draftWriteFailed) {
          this.draftWriteFailed = true
          this.notify("Could not back up your editor draft. Save or download your work before leaving.")
        }
      }
    }
    if (previousState.source !== this.state.source || previousState.activeId !== this.state.activeId) {
      this.pauseScroll()
      if (this.preview.current) this.preview.current.scrollTop = 0
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
    this.setState(({practicing}) => ({practicing: !practicing}), () => this.preview.current?.focus())
  }

  notify(notice) {
    this.setState(({noticeId}) => ({notice, noticeId: noticeId + 1}))
  }

  open(id) {
    const {sheets, activeId, title, source, shift, flats} = this.state
    if (id === activeId) return
    const saved = sheets.find(sheet => sheet.id === activeId) || EMPTY_SHEET
    const dirty = title !== saved.title || source !== saved.source ||
      shift !== saved.shift || flats !== saved.flats
    if (dirty && !window.confirm("Discard unsaved changes to this sheet?")) return
    this.setState({...(sheets.find(sheet => sheet.id === id) || EMPTY_SHEET), activeId: id})
  }

  save() {
    const {activeId, title, source, shift, flats} = this.state
    try {
      const sheets = readSongbook(localStorage)
      const id = activeId || crypto.randomUUID()
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
      const url = URL.createObjectURL(new Blob([backup], {type: "application/json"}))
      const link = document.createElement("a")
      link.href = url
      link.download = "music-tools-songbook.json"
      try {
        link.click()
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    } catch {
      this.notify("Could not download the songbook backup.")
    }
  }

  downloadText() {
    const {title, source, shift, flats} = this.state
    let url
    try {
      url = URL.createObjectURL(new Blob([exportChordSheet(source, shift, flats)], {type: "text/plain;charset=utf-8"}))
      const link = document.createElement("a")
      link.href = url
      const filename = title.trim().replace(/[^\p{L}\p{N} _-]/gu, "").slice(0, 80).trim() || "chord-sheet"
      link.download = `${filename}.txt`
      link.click()
    } catch {
      this.notify("Could not download the chord sheet text.")
    } finally {
      if (url) setTimeout(() => URL.revokeObjectURL(url), 1000)
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
      this.setState({...sheet, activeId: ""})
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
      this.setState({sheets})
      this.notify(added ? `Imported ${added} ${added === 1 ? "sheet" : "sheets"}.` : "No new sheets to import.")
    } catch {
      this.setState({importError: "Could not read the backup or save the imported sheets in this browser."})
    } finally {
      this.setState({importing: false})
    }
  }

  render() {
    const {title, source, notice, noticeId, shift, flats, sheets, activeId} = this.state

    const diagrams = this.state.diagramMode === "hidden" ? [] : sheetChordDiagrams(source, shift, flats)
    const visibleSheets = searchSongbook(sheets, this.state.songbookQuery, this.state.songbookSort)
    const hiddenActive = sheets.find(sheet => sheet.id === activeId && !visibleSheets.includes(sheet))

    return <main className={`${styles.page} ${this.state.practicing ? styles.practicing : ""}`}>
      <div className={styles.editor}>
        <h1>Chord Sheet Maker</h1>
        <p>Put chords in brackets just before the words they go with, like <code>[Am]Here comes [F]the chorus</code>.
          Use blank lines between sections. For an instrumental line, enter just the chords.</p>

        <div className={styles.actions}>
          <label>Search saved sheets
            <input type="search" value={this.state.songbookQuery} placeholder="Title or lyrics"
              onChange={event => this.setState({songbookQuery: event.target.value})} />
          </label>
          <label>Sort saved sheets
            <select value={this.state.songbookSort} onChange={event => this.setState({songbookSort: event.target.value})}>
              <option value="saved">Saved order</option>
              <option value="title">Title (A–Z)</option>
            </select>
          </label>
          {this.state.songbookQuery && <button type="button" onClick={() => this.setState({songbookQuery: ""})}>Clear search</button>}
        </div>
        <p role="status">{visibleSheets.length} of {sheets.length} saved sheets{this.state.songbookQuery.trim() && !visibleSheets.length ? " — no matches. Try another title or lyric." : "."}</p>
        <div className={styles.actions}>
          <label>Saved sheets
            <select value={activeId} onChange={event => this.open(event.target.value)}>
              <option value="">New sheet</option>
              {hiddenActive && <option value={hiddenActive.id}>{hiddenActive.title.trim() || "Untitled song"} (current; outside search)</option>}
              {visibleSheets.map((sheet, index) => <option key={sheet.id} value={sheet.id}>
                {index + 1}. {sheet.title.trim() || "Untitled song"}
              </option>)}
            </select>
          </label>
          <button type="button" disabled={!activeId} onClick={() => this.remove()}>
            Delete saved sheet
          </button>
        </div>
        <div className={styles.actions}>
          <button type="button" disabled={!sheets.length} onClick={() => this.downloadBackup()}>
            Download saved sheets
          </button>
          <label>Import songbook backup
            <input type="file" accept=".json,application/json" disabled={this.state.importing}
              onChange={event => this.restoreBackup(event)} />
          </label>
        </div>
        <p>Backups include saved sheets only. Import keeps existing sheets and skips unchanged copies of previously imported sheets.</p>
        {this.state.importError && <p role="alert">{this.state.importError}</p>}
        <label>Open text / ChordPro sheet
          <input type="file" accept=".txt,.cho,.crd,.chordpro,.pro,text/plain" disabled={this.state.importingText}
            onChange={event => this.importText(event)} />
        </label>
        <p>Open UTF-8 text or ChordPro with bracketed chords. ChordPro titles, artists, comments, sections, and capo notes are imported; other directives stay visible. Capo notes do not transpose chords. The filename supplies a missing title.
          Imported text starts in its written key as a new, unsaved sheet.</p>
        {this.state.textImportError && <p role="alert">{this.state.textImportError}</p>}
        <label>Starter songs
          <select value="" onChange={event => {
            const starter = STARTER_SHEETS.find(sheet => sheet.id === event.target.value)
            if (!starter) return
            if ((title || source) && !window.confirm("Open a starter song and replace the current editor? Saved sheets are kept.")) return
            this.setState({title: starter.title, source: starter.source, shift: 0, flats: false, activeId: ""})
          }}>
            <option value="">Choose a beginner song…</option>
            {STARTER_SHEETS.map(sheet => <option key={sheet.id} value={sheet.id}>{sheet.title} ({sheet.chords})</option>)}
          </select>
        </label>
        <label>Song title
          <input value={title} maxLength={SHEET_TITLE_LIMIT}
            onChange={event => this.setState({title: event.target.value})} />
        </label>
        <label>Chords and lyrics
          <textarea value={source} maxLength={SHEET_SOURCE_LIMIT} rows={12}
            onChange={event => this.setState({source: event.target.value})} />
        </label>
        <p>Your current editor draft is recovered automatically in this browser. Use Save sheet to update your songbook; drafts are not included in songbook backups. Saving an open sheet updates that sheet.</p>
        <div className={styles.actions}>
          <label>Transpose
            <select value={shift} onChange={event => this.setState({shift: Number(event.target.value)})}>
              {Array.from({length: 25}, (_, index) => index - 12).map(steps =>
                <option key={steps} value={steps}>{steps === 0 ? "Original key" :
                  `${steps > 0 ? "+" : ""}${steps} semitones`}</option>)}
            </select>
          </label>
          <label>Accidentals when transposed
            <select value={flats ? "flats" : "sharps"} onChange={event => this.setState({flats: event.target.value === "flats"})}>
              <option value="sharps">Sharps</option>
              <option value="flats">Flats</option>
            </select>
          </label>
          <button type="button" disabled={!title.trim() && !source.trim()} onClick={() => this.save()}>Save sheet</button>
          <button type="button" disabled={!source.trim()} onClick={() => this.downloadText()}>
            Download chord sheet text
          </button>
          <button type="button" disabled={!source.trim()} onClick={() => window.print()}>
            Print / Save PDF
          </button>
        </div>
        <p>Text downloads include the current edits and transposition, with chords in brackets. Downloading does not change your saved sheet.</p>
      </div>

      <div className={styles.practiceControls}>
        <label>Chord diagrams
          <select value={this.state.diagramMode} onChange={event => {
            const diagramMode = event.target.value
            this.setState({diagramMode})
            try { localStorage.setItem("chord-sheet-diagrams:v1", diagramMode) } catch { /* Keep the session choice. */ }
          }}>
            <option value="block">Block diagrams</option>
            <option value="line">Line diagrams</option>
            <option value="hidden">Hidden</option>
          </select>
        </label>
        <button type="button" disabled={!source.trim()} aria-pressed={this.state.practicing} onClick={this.togglePractice}>
          {this.state.practicing ? "Exit practice view" : "Practice this sheet"}
        </button>
        {this.state.practicing && <>
          <button type="button" aria-pressed={this.state.scrolling} onClick={this.state.scrolling ? this.pauseScroll : this.startScroll}>
            {this.state.scrolling ? "Pause scrolling" : "Start scrolling"}
          </button>
          <button type="button" onClick={() => { this.pauseScroll(); this.preview.current.scrollTop = 0 }}>Back to top</button>
          <label>Scroll speed: {this.state.scrollSpeed} px/s
            <input type="range" min="5" max="100" step="5" value={this.state.scrollSpeed}
              onChange={event => this.setState({scrollSpeed: Number(event.target.value)})} />
          </label>
          <p>Scroll manually to pause. Use Escape to leave practice view.</p>
        </>}
      </div>
      <section ref={this.preview} className={styles.preview} aria-label="Chord sheet preview"
        tabIndex={this.state.practicing ? 0 : undefined}
        onWheel={this.pauseScroll} onTouchStart={this.pauseScroll} onPointerDown={this.pauseScroll}
        onKeyDown={event => {
          if (event.key === "Escape" && this.state.practicing) this.togglePractice()
          if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) this.pauseScroll()
        }}>
        <h2>{title.trim() || "Untitled song"}</h2>
        {diagrams.length > 0 && <div className={styles.diagrams} aria-label="Chords used in this sheet">
          {diagrams.map(({name, voicing}) => <div key={name}>
            {!voicing ? <p>{name}: diagram unavailable</p> : this.state.diagramMode === "block"
              ? <ChordDiagram {...voicing} name={name} caption />
              : <code>{chordDiagramAscii(voicing.frets, name, "line")}</code>}
          </div>)}
        </div>}
        {source.trim() ? parseChordSheet(source, shift, flats).map((line, lineIndex) =>
          <div className={styles.line} key={lineIndex}>
            {line.map(({chord, lyric}, segmentIndex) => <span className={styles.segment} key={segmentIndex}>
              {chord && <strong>{chord}</strong>}
              <span>{lyric}</span>
            </span>)}
          </div>
        ) : <p>Add chords or lyrics to preview your sheet.</p>}
      </section>
      <Toast message={notice} notificationId={noticeId}
        onDismiss={() => this.setState({notice: ""})} />
    </main>
  }
}
