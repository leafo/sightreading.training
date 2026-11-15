import {CHORD_ROOTS, CHORD_SHAPES} from "st/chord_lab"

const QUALITIES = {
  "7b5": ["Dominant seventh flat fifth", "7b5", "1 3 b5 b7", "7(b5)"],
  "7#5": ["Dominant seventh sharp fifth", "7#5", "1 3 #5 b7", "7(#5) aug7 +7"],
  "7b9": ["Dominant seventh flat ninth", "7b9", "1 3 5 b7 b9", "7(b9)"],
  "7#9": ["Dominant seventh sharp ninth", "7#9", "1 3 5 b7 #9", "7(#9)"],
  "11": ["Dominant eleventh", "11", "1 3 5 b7 9 11", "dom11"],
  "m11": ["Minor eleventh", "m11", "1 b3 5 b7 9 11", "min11"],
  "M11": ["Major eleventh", "maj11", "1 3 5 7 9 11", "M11 Δ11"],
  "13": ["Dominant thirteenth", "13", "1 3 5 b7 9 11 13", "dom13"],
  "m13": ["Minor thirteenth", "m13", "1 b3 5 b7 9 11 13", "min13"],
  "M13": ["Major thirteenth", "maj13", "1 3 5 7 9 11 13", "M13 Δ13"],

  M: ["Major", "", "1 3 5", "maj M"],
  m: ["Minor", "m", "1 b3 5", "min -"],
  dim: ["Diminished", "dim", "1 b3 b5", "o °"],
  dimM7: ["Diminished major seventh", "dimM7", "1 b3 b5 7", "dimmaj7"],
  dim7: ["Diminished seventh", "dim7", "1 b3 b5 bb7", "o7 °7"],
  aug: ["Augmented", "aug", "1 3 #5", "+"],
  augM7: ["Augmented major seventh", "augM7", "1 3 #5 7", "augmaj7"],
  M6: ["Major sixth", "6", "1 3 5 6", "maj6 M6"],
  m6: ["Minor sixth", "m6", "1 b3 5 6", "min6"],
  M7: ["Major seventh", "maj7", "1 3 5 7", "M7 Δ7"],
  7: ["Dominant seventh", "7", "1 3 5 b7", "dom7"],
  m7: ["Minor seventh", "m7", "1 b3 5 b7", "min7 -7"],
  m7b5: ["Half diminished seventh", "m7b5", "1 b3 b5 b7", "ø ø7 min7b5"],
  mM7: ["Minor major seventh", "mMaj7", "1 b3 5 7", "mM7 minmaj7"],
  Q: ["Quartal", "Q", "1 4 b7", "quartal"],
  Qb4: ["Altered quartal", "Qb4", "1 b4 bb7", "alteredquartal"],
  sus2: ["Suspended second", "sus2", "1 2 5", ""],
  sus4: ["Suspended fourth", "sus4", "1 4 5", "sus"],
  add9: ["Added ninth", "add9", "1 3 5 9", "add9"],
  madd9: ["Minor added ninth", "madd9", "1 b3 5 9", "minadd9"],
  9: ["Dominant ninth", "9", "1 3 5 b7 9", "dom9"],
  m9: ["Minor ninth", "m9", "1 b3 5 b7 9", "min9"],
  M9: ["Major ninth", "maj9", "1 3 5 7 9", "M9 Δ9"],
}

// Descriptors are discovery hints, not fixed emotional meanings. Context and
// voicing change how a chord sounds. Each term must match explicitly.
const DESCRIPTORS = {
  M: ["bright", "happy", "stable"],
  m: ["dark", "sad"],
  dim: ["tense", "unstable"],
  dimM7: ["tense", "mysterious"],
  dim7: ["tense", "dramatic", "unstable"],
  aug: ["dreamy", "unstable"],
  augM7: ["dreamy", "mysterious"],
  M6: ["warm", "jazzy"],
  m6: ["dark", "jazzy"],
  M7: ["dreamy", "warm", "jazzy"],
  7: ["blues", "tense"],
  m7: ["mellow", "jazzy"],
  m7b5: ["dark", "tense", "jazzy"],
  mM7: ["mysterious", "tense"],
  Q: ["open", "jazzy"],
  Qb4: ["tense", "jazzy"],
  sus2: ["open", "airy"],
  sus4: ["open", "unresolved"],
  add9: ["bright", "airy"],
  madd9: ["sad", "airy"],
  9: ["blues", "funk", "jazzy"],
  m9: ["mellow", "jazzy"],
  M9: ["dreamy", "warm", "jazzy"],
}
const DESCRIPTOR_ALIASES = {jazz: "jazzy", bluesy: "blues", funky: "funk"}
export const CHORD_SEARCH_EXAMPLES = ["dreamy", "C jazzy", "A dark", "blues", "open", "tense"]

const LETTERS = "CDEFGAB"
const NATURAL_PITCHES = [0, 2, 4, 5, 7, 9, 11]
const ROOTS = [...CHORD_ROOTS, "Cb", "C#", "D#", "E#", "Fb", "Gb", "G#", "A#", "B#"]
const ORDINALS = {second: "2", fourth: "4", sixth: "6", seventh: "7", ninth: "9", eleventh: "11", thirteenth: "13"}

function display(value) {
  return value.replaceAll("#", "♯").replaceAll("b", "♭")
}

function buildChord(root, shape, steps) {
  const [quality, suffix, formula, aliases] = QUALITIES[shape]
  const rootLetter = LETTERS.indexOf(root[0])
  let pitch = NATURAL_PITCHES[rootLetter] + (root[1] === "#" ? 1 : root[1] === "b" ? -1 : 0)
  const notes = formula.split(" ").map((degree, index) => {
    const offset = rootLetter + Number(degree.match(/\d+/)[0]) - 1
    const letter = offset % LETTERS.length
    const naturalPitch = NATURAL_PITCHES[letter] + 12 * Math.floor(offset / LETTERS.length)
    pitch += steps[index - 1] ?? 0
    const accidental = pitch - naturalPitch
    return display(LETTERS[letter] + (accidental < 0 ? "b" : "#").repeat(Math.abs(accidental)))
  })
  return {
    symbol: display(root + suffix), quality, formula: display(formula), notes, root,
    descriptors: DESCRIPTORS[shape] || [],
    symbols: new Set([suffix, ...aliases.split(" ").filter(Boolean)]),
  }
}

const CATALOG = ROOTS.flatMap(root =>
  Object.entries(CHORD_SHAPES).map(([shape, steps]) => buildChord(root, shape, steps))
)

export function searchChords(query) {
  const normalized = query.trim().replaceAll("♯", "#").replaceAll("♭", "b")
    .replace(/\bsharp\b/gi, "#").replace(/\bflat\b/gi, "b")
  if (!normalized) return []

  const compact = normalized.replace(/\s+/g, "")
  const symbol = compact.match(/^([A-Ga-g])([#b]?)(.*)$/)
  if (symbol) {
    const [, letter, accidental, suffix] = symbol
    const exact = CATALOG.filter(chord =>
      chord.root === letter.toUpperCase() + accidental && chord.symbols.has(suffix)
    )
    if (exact.length) return exact

    // Keep M and m distinct while accepting case-insensitive named suffixes.
    if (suffix.length >= 3) {
      const named = CATALOG.filter(chord =>
        chord.root === letter.toUpperCase() + accidental &&
        [...chord.symbols].some(alias => /^[a-z]{3}/i.test(alias) &&
          alias.toLowerCase() === suffix.toLowerCase())
      )
      if (named.length) return named
    }
  }

  const root = normalized.match(/^([A-Ga-g])\s*([#b])?(?:\s+|$)/)
  const terms = (root ? normalized.slice(root[0].length) : normalized)
    .toLowerCase().split(/[\s-]+/).filter(Boolean)
  const candidates = CATALOG.filter(chord => {
    if (root && chord.root !== root[1].toUpperCase() + (root[2] ?? "")) return false
    const quality = chord.quality.toLowerCase().split(" ")
    return terms.every(term => quality.some(word => word === term || ORDINALS[word] === term) ||
      chord.descriptors.includes(DESCRIPTOR_ALIASES[term] || term))
  })
  const descriptive = terms.some(term => Object.values(DESCRIPTORS).some(words =>
    words.includes(DESCRIPTOR_ALIASES[term] || term)))
  if (descriptive) return candidates

  const exactQuality = candidates.filter(chord => chord.quality.split(" ").length === terms.length)
  return exactQuality.length ? exactQuality : candidates
}
