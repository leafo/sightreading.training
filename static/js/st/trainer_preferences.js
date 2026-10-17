import {STAVES, GENERATORS} from "st/data"
import {KeySignature, ChromaticKeySignature, parseNote} from "st/music"

const STORAGE_KEY = "sightreading.trainer.v1"

// Validate and serialize preferences independently of account transport.
// Only preferences belong here, never live notes, timers or session scores.
export function loadTrainerPreferences(storage) {
  let saved = {}
  try {
    storage ||= window.localStorage
    const value = JSON.parse(storage.getItem(STORAGE_KEY))
    if (value && value.version === 1) saved = value
  } catch (e) { /* Storage may be blocked or contain invalid JSON. */ }

  const currentStaff = STAVES.find(s => s.name === saved.staff) || STAVES[0]
  const currentGenerator = GENERATORS.find(g => !g.debug && g.name === saved.generator && g.mode === currentStaff.mode)
    || GENERATORS.find(g => !g.debug && g.mode === currentStaff.mode)
  const keys = KeySignature.allKeySignatures().concat([new ChromaticKeySignature()])
  const keySignature = keys.find(k => k.name() === saved.key) || new KeySignature(0)
  const currentGeneratorSettings = {}
  const settings = saved.generatorSettings || {}
  for (const input of currentGenerator.inputs || []) {
    const value = settings[input.name]
    switch (input.type) {
      case "select":
        if (input.values.some(v => v.name === value)) currentGeneratorSettings[input.name] = value
        break
      case "range":
      case "note":
        if (Number.isFinite(value)) currentGeneratorSettings[input.name] = Math.max(input.min, Math.min(input.max, value))
        break
      case "bool":
        if (typeof value === "boolean") currentGeneratorSettings[input.name] = value
        break
      case "toggles":
        if (value && typeof value === "object") {
          currentGeneratorSettings[input.name] = Object.fromEntries(input.options.map(name => [name, value[name] === true]))
        }
        break
      case "noteRange": {
        const min = Math.max(input.min, parseNote(currentStaff.range[0]))
        const max = Math.min(input.max, parseNote(currentStaff.range[1]))
        if (Array.isArray(value) && value.length === 2 && value.every(Number.isFinite)) {
          const range = value.map(n => Math.max(min, Math.min(max, n)))
          if (range[0] <= range[1]) currentGeneratorSettings[input.name] = range
        }
        break
      }
    }
  }
  return {
    currentStaff, currentGenerator, currentGeneratorSettings, keySignature,
    mode: saved.mode === "scroll" ? "scroll" : "wait",
    scrollSpeed: Number.isFinite(saved.speed) ? Math.max(50, Math.min(300, saved.speed)) : 100,
    keyboardOpen: typeof saved.keyboardOpen === "boolean" ? saved.keyboardOpen : true,
    settingsOpen: saved.settingsOpen === true,
  }
}

export function serializeTrainerPreferences(state) {
  return JSON.stringify({
    version: 1,
    staff: state.currentStaff.name,
    generator: state.currentGenerator.name,
    generatorSettings: state.currentGeneratorSettings,
    key: state.keySignature.name(),
    mode: state.mode,
    speed: state.scrollSpeed,
    keyboardOpen: state.keyboardOpen,
    settingsOpen: state.settingsOpen,
  })
}

export function saveTrainerPreferences(state, storage) {
  try {
    storage ||= window.localStorage
    const value = serializeTrainerPreferences(state)
    if (storage.getItem(STORAGE_KEY) !== value) storage.setItem(STORAGE_KEY, value)
  } catch (e) { /* Practice must still work when storage is unavailable. */ }
}
