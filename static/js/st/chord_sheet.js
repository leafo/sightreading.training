import {noteName, parseNote} from "st/music"
import {chordToken, readDefinitions, shiftedFrets, fretText} from "st/voicing_markup"

function transposeNote(note, shift, flats) {
  const ascii = note.replace("♯", "#").replace("♭", "b")
  return noteName(parseNote(ascii + "4") + shift, !flats).replace(/\d+$/, "")
}

export function transposeChord(symbol, shift, flats) {
  const chord = symbol.match(/^([A-G][#b♯♭]?)([\w+°øΔ#♯♭(),-]*(?:\/\d+)?)(?:\/([A-G][#b♯♭]?))?$/)
  if (!chord || shift === 0) return symbol

  const [, root, quality, bass] = chord
  return transposeNote(root, shift, flats) + quality +
    (bass ? "/" + transposeNote(bass, shift, flats) : "")
}

export const SHEET_STORAGE_KEY = "chord-sheet:v1"
export const SONGBOOK_STORAGE_KEY = "chord-sheet-songbook:v1"
export const SHEET_TITLE_LIMIT = 120
export const SHEET_SOURCE_LIMIT = 16000

export function readChordSheet(value) {
  return validateSheet(JSON.parse(value))
}

function validateSheet(sheet) {
  if (typeof sheet?.title !== "string" || sheet.title.length > SHEET_TITLE_LIMIT ||
      typeof sheet.source !== "string" || sheet.source.length > SHEET_SOURCE_LIMIT) {
    throw new Error("Invalid chord sheet")
  }
  return {title: sheet.title, source: sheet.source}
}

export function readSongbook(storage) {
  const saved = storage.getItem(SONGBOOK_STORAGE_KEY)
  if (saved === null) {
    const draft = storage.getItem(SHEET_STORAGE_KEY)
    return draft === null ? [] : [{...readChordSheet(draft), id: "legacy", shift: 0, flats: false}]
  }

  return validateSongbook(JSON.parse(saved))
}

function validateSongbook(sheets) {
  if (!Array.isArray(sheets)) throw new Error("Invalid songbook")
  const ids = new Set()
  return sheets.map(sheet => {
    const draft = validateSheet(sheet)
    const {id, shift, flats} = sheet
    if (typeof id !== "string" || !id || ids.has(id) ||
        !Number.isInteger(shift) || Math.abs(shift) > 12 || typeof flats !== "boolean") {
      throw new Error("Invalid saved song")
    }
    ids.add(id)
    return {...draft, id, shift, flats}
  })
}

export const SONGBOOK_BACKUP_SIZE_LIMIT = 32 * 1024 * 1024

export function exportSongbook(sheets) {
  return JSON.stringify({version: 1, sheets: validateSongbook(sheets)})
}

export function importSongbook(value, existing, createId) {
  const backup = JSON.parse(value)
  if (backup?.version !== 1) throw new Error("Unsupported songbook backup")
  const incoming = validateSongbook(backup.sheets)
  const sheets = [...existing]
  const usedIds = new Set([...existing, ...incoming].map(sheet => sheet.id))
  const contentKey = ({title, source, shift, flats}) => JSON.stringify([title, source, shift, flats])
  const savedContent = new Set(existing.map(contentKey))
  const existingIds = new Set(existing.map(sheet => sheet.id))

  for (const sheet of incoming) {
    const key = contentKey(sheet)
    let {id} = sheet
    if (existingIds.has(id)) {
      if (savedContent.has(key)) continue
      do {
        id = createId()
      } while (usedIds.has(id))
      usedIds.add(id)
    }
    sheets.push({...sheet, id})
  }
  return sheets
}

export function parseChordSheet(source, shift = 0, flats = false) {
  const {definitions} = readDefinitions(source)
  const definitionLines = new Set(definitions.map(d => d.lineIndex))
  return source.split(/\r\n?|\n/).flatMap((line, lineIndex) => {
    if (definitionLines.has(lineIndex)) return []
    const segments = []
    let chord = "", voicing, end = 0
    const segment = lyric => ({chord, lyric, ...(voicing ? {voicing} : {})})
    for (const match of line.matchAll(/\[([^[\]\s]{1,160})\]/g)) {
      const lyric = line.slice(end, match.index)
      if (lyric || chord) segments.push(segment(lyric))
      const token = chordToken(match[1])
      chord = transposeChord(token?.name || match[1], shift, flats)
      voicing = undefined
      if (token?.shape || token?.alias) {
        const definition = definitions.find(d => d.name === token.name && d.alias === token.alias)
        const original = token.frets || definition?.frets
        const frets = original && shiftedFrets(original, shift)
        voicing = {...token, frets, error: token.error || (!original ? `Undefined voicing ${token.alias}.` : !frets ? "This shape cannot transpose within frets 0–24. Choose another shape." : undefined)}
      }
      end = match.index + match[0].length
    }
    segments.push(segment(line.slice(end)))
    return [segments]
  })
}

// Keep portable voicing definitions and references when exporting transposed text.
export function exportChordSheet(source, shift = 0, flats = false) {
  const {definitions} = readDefinitions(source)
  return source.split(/\r\n?|\n/).map((line, lineIndex) => {
    const definition = definitions.find(d => d.lineIndex === lineIndex)
    if (definition) {
      const frets = shiftedFrets(definition.frets, shift)
      if (!frets) throw new Error("A voicing cannot be transposed. Choose another shape before exporting.")
      return `{voicing: ${transposeChord(definition.name, shift, flats)}:${definition.alias} = ${fretText(frets)}}`
    }
    return line.replace(/\[([^[\]\s]{1,160})\]/g, (raw, text) => {
      const token = chordToken(text)
      if (!token) return `[${transposeChord(text, shift, flats)}]`
      let suffix = token.alias ? `:${token.alias}` : ""
      if (token.shape) {
        const frets = token.frets && shiftedFrets(token.frets, shift)
        if (!frets) throw new Error("Fix the voicing before exporting.")
        suffix = `@${fretText(frets)}`
      }
      return `[${transposeChord(token.name, shift, flats)}${suffix}]`
    })
  }).join("\n")
}

// Import bracketed text and common ChordPro metadata/section directives.
export function importChordSheet(source, filename = "chord-sheet.txt") {
  source = source.replace(/^\uFEFF/, "").replace(/\r\n?|\n/g, "\n")
  if (!source.trim() || source.includes("\0")) throw new Error("Choose a nonempty text chord sheet.")
  // Validate before conversion too: directives must not bypass the input limit.
  validateSheet({title: "", source})
  let title = filename.replace(/\.(txt|cho|crd|chordpro|pro)$/i, "").slice(0, SHEET_TITLE_LIMIT)
  let hasTitle = false
  source = source.split("\n").map(line => {
    const directive = line.match(/^\s*\{([a-z_]+)(?::\s*(.*?))?\}\s*$/i)
    if (!directive) return line
    const command = directive[1].toLowerCase()
    const value = directive[2] || ""
    if (["title", "t"].includes(command)) {
      if (!hasTitle && value.trim()) { title = value.trim(); hasTitle = true }
      return ""
    }
    if (["artist", "subtitle", "st"].includes(command)) return value
    if (["comment", "c", "comment_italic", "ci", "comment_box", "cb"].includes(command)) return value
    if (command === "capo") return `Capo: ${value} (chords as written)`
    if (["start_of_chorus", "soc", "start_of_verse", "sov", "start_of_bridge", "sob"].includes(command)) {
      const section = {soc: "Chorus", sov: "Verse", sob: "Bridge"}[command] ||
        command.slice(9).replace(/^./, letter => letter.toUpperCase())
      return value || section
    }
    if (["end_of_chorus", "eoc", "end_of_verse", "eov", "end_of_bridge", "eob"].includes(command)) return ""
    // Keep unsupported directives visible instead of silently losing information.
    return line
  }).join("\n")
  return {...validateSheet({title, source}), shift: 0, flats: false}
}


// Separate from saved songs: recovery never overwrites a saved sheet.
export const SHEET_EDITOR_STORAGE_KEY = "chord-sheet-editor:v1"

function validateEditorDraft(draft) {
  if (draft?.version !== 1 || typeof draft.activeId !== "string" || draft.activeId.length > 200) {
    throw new Error("Invalid editor draft")
  }
  const [sheet] = validateSongbook([{...draft, id: "draft"}])
  const {title, source, shift, flats} = sheet
  return {version: 1, title, source, shift, flats, activeId: draft.activeId}
}

export function readEditorDraft(storage, sheets) {
  const value = storage.getItem(SHEET_EDITOR_STORAGE_KEY)
  if (value === null) return null
  const draft = validateEditorDraft(JSON.parse(value))
  delete draft.version
  // A saved sheet may have been deleted in another tab. Keep the recovered text
  // as a new sheet instead of silently recreating or replacing a saved entry.
  if (!sheets.some(sheet => sheet.id === draft.activeId)) draft.activeId = ""
  return draft
}

export function writeEditorDraft(storage, state) {
  const {title, source, shift, flats, activeId} = state
  storage.setItem(SHEET_EDITOR_STORAGE_KEY,
    JSON.stringify(validateEditorDraft({version: 1, title, source, shift, flats, activeId})))
}

// Return a view of the songbook without reordering or changing saved entries.
export function searchSongbook(sheets, query = "", sort = "saved") {
  const normalize = value => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean)
  const matches = sheets.filter(sheet => {
    const text = normalize(`${sheet.title} ${sheet.source}`)
    return terms.every(term => text.includes(term))
  })
  if (sort === "title") {
    matches.sort((a, b) => (a.title.trim() || "Untitled song").localeCompare(
      b.title.trim() || "Untitled song", undefined, {sensitivity: "base", numeric: true}))
  }
  return matches
}
