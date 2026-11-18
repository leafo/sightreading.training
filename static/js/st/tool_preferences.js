import {ROOTS, SCALE_TYPES} from "st/guitar_scales"

const choose = (value, choices, fallback) => choices.includes(value) ? value : fallback
const diagramLabels = ["fingers", "notes", "intervals", "both"]
const labels = ["notes", "degrees", "both"]
const frets = value => Array.isArray(value) && value.length === 6 && value.every(fret => fret === null || Number.isInteger(fret) && fret >= 0 && fret <= 24) ? [...value] : Array(6).fill(null)
export function scalesState(value = {}) {
  return {root: choose(value.root, ROOTS, "A"), type: choose(value.type, Object.keys(SCALE_TYPES), "Minor pentatonic"),
    instrument: choose(value.instrument, ["guitar", "piano"], "guitar"), labels: choose(value.labels, labels, "notes")}
}
export function labState(value = {}) {
  return {frets: frets(value.frets), instrument: choose(value.instrument, ["guitar", "piano", "midi"], "guitar"),
    pianoNotes: Array.isArray(value.pianoNotes) ? [...new Set(value.pianoNotes.filter(pitch => Number.isInteger(pitch) && pitch >= 48 && pitch <= 72))] : [],
    selectedMatch: typeof value.selectedMatch === "string" ? value.selectedMatch.slice(0, 40) : "",
    diagramLabels: choose(value.diagramLabels, diagramLabels, "fingers"),
    selectedSuggestion: typeof value.selectedSuggestion === "string" ? value.selectedSuggestion.slice(0, 40) : "",
    showAllNotes: value.showAllNotes === true, labels: choose(value.labels, labels, "notes")}
}
export const CHORD_FAMILIES = ["major", "minor", "dominant seventh", "major seventh", "minor seventh", "suspended second", "suspended fourth", "diminished", "diminished seventh", "half diminished seventh", "augmented", "dominant seventh flat fifth", "dominant seventh sharp fifth", "dominant seventh flat ninth", "dominant seventh sharp ninth", "dominant ninth", "minor ninth", "major ninth", "dominant eleventh", "minor eleventh", "major eleventh", "dominant thirteenth", "minor thirteenth", "major thirteenth"]
export function referenceState(value = {}) {
  return {diagramLabels: choose(value.diagramLabels, diagramLabels, "fingers"), query: typeof value.query === "string" ? value.query.slice(0, 80) : "C major",
    root: choose(value.root, ROOTS, "C"), family: choose(value.family, CHORD_FAMILIES, "major"),
    visible: Number.isInteger(value.visible) && value.visible >= 24 && value.visible <= 600 ? value.visible : 24}
}
export function readToolState(tool, normalize, storage) {
  try {
    const raw = (storage ?? globalThis.localStorage).getItem(`napland:${tool}:v1`)
    if (raw?.length > 10000) return normalize({})
    const data = JSON.parse(raw)
    return normalize(data?.version === 1 && data.state && typeof data.state === "object" ? data.state : {})
  } catch { return normalize({}) }
}
export function writeToolState(tool, state, normalize, storage) {
  try {
    (storage ?? globalThis.localStorage).setItem(`napland:${tool}:v1`, JSON.stringify({version: 1, state: normalize(state)}))
    return true
  } catch { return false }
}
export function persistToolPage(page, tool, normalize, previous) {
  if (!previous || JSON.stringify(normalize(previous)) === JSON.stringify(normalize(page.state))) return
  if (writeToolState(tool, page.state, normalize)) {
    page.storageWarningShown = false
    if (page.state.storageWarning) page.setState({storageWarning: null})
  }
  else if (!page.storageWarningShown) {
    page.storageWarningShown = true
    page.setState({storageWarning: "Your changes could not be saved. You can keep using the tool; saving will retry on your next change."})
  }
}
