import {DRUM_KITS} from "./drum_kits"

export const TRACKS = [
  ["kick", "Kick"], ["snare", "Snare"], ["closedHat", "Closed hi-hat"],
  ["openHat", "Open hi-hat"], ["clap", "Clap"], ["lowTom", "Low tom"],
  ["highTom", "High tom"], ["ride", "Ride"]
]
export const STORAGE_KEY = "drum-machine:patterns:v1"

export const TIME_SIGNATURES = {
  "4/4": {steps: 16, beatSteps: 4},
  "3/4": {steps: 12, beatSteps: 4},
  "5/4": {steps: 20, beatSteps: 4},
  "6/8": {steps: 24, beatSteps: 4, tempoSteps: 12}
}

export function meterFor(pattern) {
  const meter = TIME_SIGNATURES[pattern.timeSignature || "4/4"]
  if (pattern.subdivision !== "triplet") return meter
  return {steps: meter.steps / 4 * 3, beatSteps: 3, tempoSteps: (meter.tempoSteps || 4) / 4 * 3}
}

export function emptyPattern(bars = 1, timeSignature = "4/4", subdivision = "straight") {
  const grid = {bars, timeSignature, subdivision}
  return {...grid, kit: "classic", bpm: 100, swing: 0, tracks: Object.fromEntries(TRACKS.map(([id]) => [id, Array(bars * meterFor(grid).steps).fill(false)]))}
}

export function changeTimeSignature(pattern, timeSignature) {
  return changeGrid(pattern, {...pattern, timeSignature})
}

export function changeSubdivision(pattern, subdivision) {
  return changeGrid(pattern, {...pattern, subdivision})
}

function changeGrid(pattern, next) {
  const oldMeter = meterFor(pattern)
  const newMeter = meterFor(next)
  const tracks = {}
  for (const [id] of TRACKS) {
    tracks[id] = Array(next.bars * newMeter.steps).fill(false)
    pattern.tracks[id].forEach((hit, index) => {
      if (!hit) return
      const bar = Math.floor(index / oldMeter.steps)
      const local = index % oldMeter.steps
      const beat = Math.floor(local / oldMeter.beatSteps)
      const offset = Math.min(newMeter.beatSteps - 1,
        Math.round(local % oldMeter.beatSteps * newMeter.beatSteps / oldMeter.beatSteps))
      const step = beat * newMeter.beatSteps + offset
      if (step < newMeter.steps) tracks[id][bar * newMeter.steps + step] = true
    })
  }
  return {...next, tracks}
}

export function stepMarker(pattern, step) {
  const {steps, beatSteps} = meterFor(pattern)
  const local = step % steps
  const bar = Math.floor(step / steps) + 1
  const offset = local % beatSteps
  const subdivisions = beatSteps === 3 ? ["", "trip", "let"] : ["", "e", "&", "a"]
  return {label: offset === 0 ? `${bar}.${Math.floor(local / beatSteps) + 1}` : subdivisions[offset],
    size: offset === 0 ? "quarter" : beatSteps === 4 && offset === 2 ? "eighth" : "sixteenth"}
}

export function validatePattern(value) {
  if (!value || ![1, 2].includes(value.bars) || !Number.isFinite(value.bpm) || value.bpm < 30 || value.bpm > 240 ||
      !Number.isFinite(value.swing) || value.swing < 0 || value.swing > 0.5) throw new Error("Invalid drum pattern")
  const timeSignature = value.timeSignature === undefined ? "4/4" : value.timeSignature
  if (typeof timeSignature !== "string" || !Object.hasOwn(TIME_SIGNATURES, timeSignature)) throw new Error("Invalid time signature")
  const subdivision = value.subdivision === undefined ? "straight" : value.subdivision
  if (!["straight", "triplet"].includes(subdivision)) throw new Error("Invalid subdivision")
  const pattern = emptyPattern(value.bars, timeSignature, subdivision)
  const kit = value.kit === undefined ? "classic" : value.kit
  if (!DRUM_KITS.some(item => item.id === kit)) throw new Error("Invalid drum kit")
  pattern.kit = kit
  pattern.bpm = value.bpm
  pattern.swing = value.swing
  for (const [id] of TRACKS) {
    const steps = value.tracks?.[id]
    const legacySixEight = subdivision === "straight" && timeSignature === "6/8" && Array.isArray(steps) && steps.length === value.bars * 12
    if (!Array.isArray(steps) || (!legacySixEight && steps.length !== value.bars * meterFor(pattern).steps) || steps.some(step => typeof step !== "boolean")) {
      throw new Error("Invalid drum steps")
    }
    pattern.tracks[id] = legacySixEight ? steps.flatMap(hit => [hit, false]) : [...steps]
  }
  return pattern
}

export function resizePattern(pattern, bars) {
  const next = {...pattern, bars, tracks: {}}
  for (const [id] of TRACKS) {
    next.tracks[id] = Array.from({length: bars * meterFor(pattern).steps}, (_, i) => pattern.tracks[id][i % pattern.tracks[id].length])
  }
  return next
}

// Swing delays the offbeat eighth (&), keeping sixteenths evenly spaced
// within each eighth. Each quarter note retains its original duration.
export function stepDuration(bpm, swing, step, timeSignature = "4/4", subdivision = "straight") {
  if (subdivision === "triplet") return 60 / bpm / meterFor({timeSignature, subdivision}).tempoSteps
  // In 6/8 each of the six eighth-note counts has four subdivisions.
  const subdivisions = timeSignature === "6/8" ? 12 : 4
  return 60 / bpm / subdivisions * (step % 4 < 2 ? 1 + swing : 1 - swing)
}

function preset(name, bpm, hits, swing = 0, timeSignature = "4/4") {
  const pattern = emptyPattern(1, timeSignature)
  pattern.bpm = bpm
  pattern.swing = swing
  for (const [id, steps] of Object.entries(hits)) for (const step of steps) pattern.tracks[id][step] = true
  return {name, pattern}
}
const eighths = [0, 2, 4, 6, 8, 10, 12, 14]
export const PRESETS = [
  preset("Straight rock", 100, {kick: [0, 8], snare: [4, 12], closedHat: eighths}),
  preset("Four on the floor", 120, {kick: [0, 4, 8, 12], snare: [4, 12], openHat: [2, 6, 10, 14]}),
  preset("Blues shuffle", 90, {kick: [0, 8], snare: [4, 12], ride: eighths}, 0.33),
  preset("Funk pocket", 105, {kick: [0, 3, 6, 10], snare: [4, 12, 15], closedHat: eighths, openHat: [14]}),
  preset("Hip-hop", 85, {kick: [0, 7, 10], snare: [4, 12], closedHat: eighths}, 0.15),
  preset("Disco", 118, {kick: [0, 4, 8, 12], clap: [4, 12], closedHat: [0, 4, 8, 12], openHat: [2, 6, 10, 14]}),
  preset("Synthwave", 100, {kick: [0, 6, 8], snare: [4, 12], clap: [4, 12], closedHat: eighths}),
  preset("Reggae", 78, {kick: [8], snare: [8], closedHat: [2, 6, 10, 14]}),
  preset("Bossa nova", 130, {kick: [0, 6, 8, 14], snare: [0, 6, 12], closedHat: eighths}),
  preset("Half-time", 140, {kick: [0, 6, 14], snare: [8], closedHat: eighths}),
  preset("Drum and bass", 170, {kick: [0, 10], snare: [4, 12], closedHat: eighths, openHat: [7, 15]}),
  preset("Tom fill", 110, {kick: [0, 8], snare: [4, 6], highTom: [8, 9, 10, 11], lowTom: [12, 13, 14, 15]}),
  preset("Waltz", 100, {kick: [0], snare: [4, 8], closedHat: [0, 2, 4, 6, 8, 10]}, 0, "3/4"),
  preset("Jazz waltz", 135, {kick: [0], snare: [8], ride: [0, 4, 6, 8, 10]}, 0.33, "3/4"),
  preset("Five-beat rock", 110, {kick: [0, 8, 12], snare: [4, 16], closedHat: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]}, 0, "5/4"),
  preset("Five-beat jazz", 125, {kick: [0, 12], snare: [8, 16], ride: [0, 4, 6, 8, 12, 16, 18]}, 0.2, "5/4"),
  preset("Slow six", 65, {kick: [0], snare: [12], closedHat: [0, 4, 8, 12, 16, 20]}, 0, "6/8"),
  preset("Celtic jig", 110, {kick: [0, 12], snare: [8, 20], closedHat: [0, 4, 8, 12, 16, 20], lowTom: [16], highTom: [4]}, 0, "6/8")
]

export function readSavedPatterns(storage) {
  const data = JSON.parse(storage.getItem(STORAGE_KEY) || "[]")
  if (!Array.isArray(data) || data.length > 100) throw new Error("Invalid saved patterns")
  return data.map(item => {
    if (typeof item.name !== "string" || !item.name.trim() || item.name.length > 60) throw new Error("Invalid pattern name")
    return {name: item.name, pattern: validatePattern(item.pattern)}
  })
}
