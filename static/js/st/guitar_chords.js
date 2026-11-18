import {matchesChordTones} from "st/chord_rules"
// Frets and fingers are ordered from low E to high E. Null means muted.
export const OPEN_PITCHES = [40, 45, 50, 55, 59, 64]
export const STRING_NAMES = ["Low E", "A", "D", "G", "B", "High E"]
export function noteClass(note) {
  const normalized = note.replaceAll("♯", "#").replaceAll("♭", "b")
  const match = normalized.match(/^([A-G])([#b]*)$/)
  if (!match) return null
  const natural = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11}[match[1]]
  return (natural + [...match[2]].reduce((n, sign) => n + (sign === "#" ? 1 : -1), 0) + 24) % 12
}
export function assignFingers(frets) {
  const stopped = frets.map((fret, index) => ({fret, index})).filter(item => item.fret > 0)
    .sort((a, b) => a.fret - b.fret || a.index - b.index)
  if (stopped.length && stopped.at(-1).fret - stopped[0].fret > 3) return null
  const fingers = frets.map(() => null)
  let finger = 1
  for (const {fret, index} of stopped) {
    if (fingers[index]) continue
    if (finger > 4) return null
    const same = stopped.filter(item => item.fret === fret && !fingers[item.index])
    const first = same[0].index, last = same.at(-1).index
    const barre = same.length > 1 && frets.slice(first, last + 1).every(value => value !== null && value >= fret)
    for (const item of barre ? same : [{index}]) fingers[item.index] = finger
    finger++
  }
  return fingers
}
const COMMON = [
  // Familiar jazz grips, including shell voicings without the natural fifth.
  [[null, 3, 2, 3, 1, null], [null, 3, 2, 4, 1, null]],
  [[null, 3, 2, 0, 0, 0], [null, 3, 2, null, null, null]],
  [[null, 3, 2, 3, 3, null], [null, 2, 1, 3, 3, null]],
  [[null, 3, 2, 4, 3, null], [null, 2, 1, 4, 3, null]],
  [[null, 3, 1, 3, 3, null], [null, 2, 1, 3, 4, null]],

  [[null, 3, 2, 0, 1, 0], [null, 3, 2, null, 1, null]],
  [[3, 2, 0, 0, 0, 3], [2, 1, null, null, null, 3]],
  [[null, null, 0, 2, 3, 2], [null, null, null, 1, 3, 2]],
  [[0, 2, 2, 1, 0, 0], [null, 2, 3, 1, null, null]],
  [[null, 0, 2, 2, 2, 0], [null, null, 1, 2, 3, null]],
  [[0, 2, 2, 0, 0, 0], [null, 2, 3, null, null, null]],
  [[null, 0, 2, 2, 1, 0], [null, null, 2, 3, 1, null]],
  [[null, null, 0, 2, 3, 1], [null, null, null, 2, 3, 1]],
]
// Moveable E- and A-string forms with explicit barre fingering.
const MOVEABLE = [
  [[0, null, 0, 1, null, null], [1, null, 1, 2, null, null]],
  [[0, null, 1, 1, null, null], [1, null, 2, 3, null, null]],
  [[0, null, 0, 0, null, null], [1, null, 1, 1, null, null]],
  [[0, null, 0, 1, null, 2], [1, null, 1, 2, null, 3]],
  [[null, 0, 2, 1, 2, null], [null, 1, 3, 2, 4, null]],
  [[null, 0, 2, 0, 1, null], [null, 1, 3, 1, 2, null]],

  [[0, 2, 2, 1, 0, 0], [1, 3, 4, 2, 1, 1]],
  [[0, 2, 2, 0, 0, 0], [1, 3, 4, 1, 1, 1]],
  [[0, 2, 0, 1, 0, 0], [1, 3, 1, 2, 1, 1]],
  [[0, 2, 0, 0, 0, 0], [1, 3, 1, 1, 1, 1]],
  [[null, 0, 2, 2, 2, 0], [null, 1, 3, 3, 3, 1]],
  [[null, 0, 2, 2, 1, 0], [null, 1, 3, 4, 2, 1]],
  [[null, 0, 2, 0, 2, 0], [null, 1, 3, 1, 4, 1]],
  [[null, 0, 2, 0, 1, 0], [null, 1, 3, 1, 2, 1]],
  [[null, 0, 2, 1, 2, 0], [null, 1, 3, 2, 4, 1]],
]
const cache = new Map()
export function guitarChordVoicings(notes, limit = 4, bassNote = notes[0]) {
  const classes = [...new Set(notes.map(noteClass))]
  if (classes.includes(null) || classes.length < 3 || classes.length > 7) return []
  const bassClass = noteClass(bassNote)
  const key = `${classes.join(",")}:${bassClass}`
  if (cache.has(key)) return cache.get(key).slice(0, limit)
  const candidates = []
  const seen = new Set()
  const add = (frets, fingers, source = "Less common") => {
    const pitches = frets.flatMap((fret, index) => fret === null ? [] : [OPEN_PITCHES[index] + fret])
    const actual = new Set(pitches.map(pitch => pitch % 12))
    const match = matchesChordTones(actual, classes)
    if (!match || Math.min(...pitches) % 12 !== bassClass) return
    const signature = frets.join(",")
    if (seen.has(signature)) return
    seen.add(signature)
    candidates.push({frets, fingers, ...match, category: source === "Common" ? source : frets.every(fret => fret !== 0) ? "Moveable" : source, score: Math.max(...frets.map(f => f ?? 0)) * 2 + frets.filter(f => f === null).length})
  }
  COMMON.forEach(([frets, fingers]) => add(frets, fingers, "Common"))
  // Familiar open shapes are offered before moveable and generated forms.
  const familiar = candidates.length
  for (const [shape, fingers] of MOVEABLE) {
    for (let shift = 0; shift <= 10; shift++) {
      const frets = shape.map(fret => fret === null ? null : fret + shift)
      if (Math.max(...frets) > 12) continue
      add(frets, shift ? fingers : assignFingers(frets), shift ? "Moveable" : "Common")
    }
  }
  const curated = candidates.length
  // Four-fret windows with at most four fingers, including explicit barres.
  // Only an explicitly optional natural fifth may be omitted; no extra tones.
  for (let start = 1; start <= 12; start++) {
    const choices = OPEN_PITCHES.map(open => [null, ...[0, start, start + 1, start + 2, start + 3]
      .filter(fret => classes.includes((open + fret) % 12))])
    const visit = (frets, stopped) => {
      if (frets.length === 6) { const fingers = assignFingers(frets); if (fingers) add(frets, fingers); return }
      for (const fret of choices[frets.length]) {
        const next = stopped + Number(fret > 0)
        if (next <= 6) visit([...frets, fret], next)
      }
    }
    visit([], 0)
  }
  const ordered = [...candidates.slice(0, familiar), ...candidates.slice(familiar, curated).sort((a, b) => a.score - b.score), ...candidates.slice(curated).sort((a, b) => a.score - b.score)]
  const groups = ["Common", "Moveable", "Less common"].map(category => ordered.filter(shape => shape.category === category))
  // Round-robin keeps higher-position and moveable shapes visible even with a small limit.
  const ranked = []
  for (let index = 0; index < 8; index++) groups.forEach(group => { if (group[index]) ranked.push(group[index]) })
  cache.set(key, ranked)
  return ranked.slice(0, limit)
}
