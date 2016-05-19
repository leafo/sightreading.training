export const MIDDLE_C_PITCH = 60
export const OCTAVE_SIZE = 12

export const NOTE_EVENTS = {
  [144]: "noteOn",
  [128]: "noteOff"
}

export const OFFSETS = {
  [0]: "C",
  [2]: "D",
  [4]: "E",
  [5]: "F",
  [7]: "G",
  [9]: "A",
  [11]: "B",

  "C": 0,
  "D": 2,
  "E": 4,
  "F": 5,
  "G": 7,
  "A": 9,
  "B": 11
}

export const LETTER_OFFSETS = {
  [0]: 0,
  [2]: 1,
  [4]: 2,
  [5]: 3,
  [7]: 4,
  [9]: 5,
  [11]: 6
}


export function noteName(pitch, sharpen=true) {
  let octave = Math.floor(pitch / OCTAVE_SIZE)
  let offset = pitch - octave * OCTAVE_SIZE

  let name = OFFSETS[offset]
  if (!name) {
    if (sharpen) {
      name = OFFSETS[offset - 1] + "#"
    } else {
      name = OFFSETS[offset + 1] + "b"
    }
  }

  return `${name}${octave}`;
}


function parseNoteAccidentals(note) {
  let [, letter, accidental] = note.match(/^([A-G])(#|b)?/);
  let n = 0;

  if (accidental == "#") {
    n += 1
  }

  if (accidental == "b") {
    n -= 1
  }

  return n;
}

// get the octave independent offset in halfsteps (from C), used for comparison
function parseNoteOffset(note) {
  let [, letter, accidental] = note.match(/^([A-G])(#|b)?/);

  if (OFFSETS[letter] == undefined) {
    throw `invalid note letter: ${letter}`
  }

  let n = OFFSETS[letter];
  if (accidental == "#") { n += 1 }
  if (accidental == "b") { n -= 1 }
  return n;
}

export function parseNote(note) {
  let [, letter, accidental, octave] = note.match(/^([A-G])(#|b)?(\d+)$/);
  if (OFFSETS[letter] == undefined) {
    throw `invalid note letter: ${letter}`
  }

  let n = OFFSETS[letter] + parseInt(octave, 10) * OCTAVE_SIZE;

  if (accidental == "#") {
    n += 1
  }

  if (accidental == "b") {
    n -= 1
  }

  return n;
}

export function letterOffset(pitch, sharp=true) {
  let offset = 0

  while (pitch >= 12) {
    offset += 7
    pitch -= 12
  }

  while (LETTER_OFFSETS[pitch] == undefined) {
    // go down sinc we assume we're sharp
    if (sharp) { pitch -= 1 }
    else { pitch += 1 }
  }

  return offset + LETTER_OFFSETS[pitch]
}

export function addInterval(note, halfSteps) {
  return noteName(parseNote(note) + halfSteps);
}


// returns 0 if notes are same
// returns < 0 if a < b
// returns > 0 if a > b
export function compareNotes(a, b) {
  a = parseNote(a);
  b = parseNote(b);
  return a - b;
}

export function notesLessThan(a, b) {
  return compareNotes(a,b) < 0;
}

export function notesGreaterThan(a, b) {
  return compareNotes(a,b) > 0;
}

export class KeySignature {
  static FIFTHS = [
    "F", "C", "G", "D", "A", "E", "B", "Gb", "Db", "Ab", "Eb", "Bb"
  ]

  static FIFTHS_TRUNCATED = [
    "F", "C", "G", "D", "A", "E", "B"
  ]

  // count: the number of accidentals in the key
  constructor(count) {
    this.count = count;
  }

  isSharp() {
    return this.count > 0
  }

  isFlat() {
    return this.count < 0
  }

  name() {
    let offset = this.count + 1
    if (offset < 0) {
      offset += KeySignature.FIFTHS.length
    }

    return KeySignature.FIFTHS[offset]
  }

  // convert note to enharmonic equivalent that fits into this key signature
  // TODO: this might have to be done at the scale level
  enharmonic(note) {
    if (this.isFlat()) {
      if (note.indexOf("#") != -1) {
        return noteName(parseNote(note), false)
      }
    }

    if (this.isSharp()) {
      if (note.indexOf("b") != -1) {
        return noteName(parseNote(note), true)
      }
    }

    return note
  }

  // which notes have accidentals in this key
  accidentalNotes() {
    let fifths = KeySignature.FIFTHS_TRUNCATED

    if (this.count > 0) {
      return fifths.slice(0, this.count)
    } else {
      return fifths.slice(fifths.length + this.count).reverse()
    }
  }

  // how many accidentals should display on note for this key
  // null: nothing
  // 0: a natural
  // 1: a sharp
  // -1: a flat
  // 2: double sharp, etc.
  accidentalsForNote(note) {
    if (typeof note == "number") {
      note = noteName(note)
    }

    let [_, name, a] = note.match(/^([A-G])(#|b)?/)
    let n = 0

    if (a == "#") { n += 1 }
    if (a == "b") { n -= 1 }

    for (let modifiedNote of this.accidentalNotes()) {
      if (modifiedNote == name) {
        if (this.isSharp()) {
          if (a == "#") { return null }
          if (a == "b") { return -1 }
        } else if (this.isFlat()) {
          if (a == "#") { return 1 }
          if (a == "b") { return null }
        }

        return 0
      }
    }

    // not modified by the key
    if (a == "#") { return 1 }
    if (a == "b") { return -1 }
    return null
  }

  // the notes to give accidentals to within the range [min, max], the returned
  // notes will not be sharp or flat
  notesInRange(min, max) {
    if (this.count == 0) {
      return []
    }

    if (typeof max == "string") {
      max = parseNote(max)
    }

    if (typeof min == "string") {
      min = parseNote(min)
    }

    let octave = 5; // TODO: pick something close to min/max

    if (this.count > 0) {
      let count = this.count
      var notes = [parseNote(`F${octave}`)]
      while (count > 1) {
        count -= 1;
        notes.push(notes[notes.length - 1] + 7)
      }
    }

    if (this.count < 0) {
      let count = -1 * this.count

      var notes = [parseNote(`B${octave}`)]
      while (count > 1) {
        count -= 1
        notes.push(notes[notes.length - 1] - 7)
      }
    }

    return notes.map(function(n) {
      while (n <= min) {
        n += 12;
      }

      while (n > max) {
        n -= 12;
      }

      return noteName(n);
    });
  }
}

export class Scale {
  constructor(root) {
    if (root instanceof KeySignature) {
      root = root.name()
    }

    if (!root.match(/^[A-G][b#]?$/)) {
      throw "scale root not properly formed"
    }
 
    this.root = root
  }

  getFullRange() {
    return this.getRange(0, (this.steps.length + 1) * 8);
  }

  getLooseRange(min, max) {
    return this.getFullRange().filterByRange(min, max);
  }

  getRange(octave, count=this.steps.length+1, offset=0) {
    let current = parseNote(`${this.root}${octave}`)
    let range = new NoteList

    let k = 0;

    while (offset < 0) {
      k--
      if (k < 0) {
        k += this.steps.length
      }

      current -= this.steps[k % this.steps.length]
      offset++
    }

    for (let i = 0; i < count + offset; i++) {
      if (i >= offset) {
        range.push(noteName(current))
      }
      current += this.steps[k++ % this.steps.length]
    }

    return range;
  }

  containsNote(note) {
    let pitch = parseNoteOffset(note)
    let rootPitch = parseNoteOffset(this.root)

    // move note within an octave of root
    while (pitch < rootPitch) {
      pitch += OCTAVE_SIZE
    }

    while (pitch >= rootPitch + OCTAVE_SIZE) {
      pitch -= OCTAVE_SIZE
    }

    let currentPitch = rootPitch
    let i = 0

    // keep incrementing until we hit it, or pass it
    while (currentPitch <= pitch) {
      if (currentPitch == pitch) {
        return true
      }
      currentPitch += this.steps[i % this.steps.length]
      i++
    }

    return false
  }

  // degrees are 1 indexed
  degreeToName(degree) {
    // truncat to reasonable range
    degree = (degree - 1) % this.steps.length + 1

    let range = this.getRange(0, degree)
    let note = range[range.length - 1]
    let m = note.match(/^[^\d]+/)
    return m[0]
  }

  // degrees are 1 indexed
  getDegree(note) {
    let pitch = parseNoteOffset(note)
    let rootPitch = parseNoteOffset(this.root)

    // move note within an octave of root
    while (pitch < rootPitch) {
      pitch += OCTAVE_SIZE
    }

    while (pitch >= rootPitch + OCTAVE_SIZE) {
      pitch -= OCTAVE_SIZE
    }

    let degree = 1
    let currentPitch = rootPitch

    if (currentPitch == pitch) {
      return degree
    }

    for (let offset of this.steps) {
      currentPitch += offset
      degree += 1

      if (currentPitch == pitch) {
        return degree
      }

      if (currentPitch > pitch) {
        break
      }
    }

    throw new Error(`${note} is not in scale ${this.root}`)
  }

  // degree is one index
  // new MajorScale().buildChordSteps(1, 2) -> major chord
  buildChordSteps(degree, count) {
    let idx = degree - 1
    let out = []

    while (count > 0) {
      let stride = 2
      let step = 0

      while (stride > 0) {
        step += this.steps[idx % this.steps.length]
        idx++
        stride--
      }

      out.push(step)
      count--
    }

    return out
  }
}

export class MajorScale extends Scale {
  constructor(root) {
    super(root)
    this.steps = [2, 2, 1, 2, 2, 2, 1]
  }
}

export class MinorScale extends Scale {
  constructor(root) {
    super(root)
    this.steps = [2, 1, 2, 2, 1, 2, 2]
  }
}

export class Chord extends Scale {
  static SHAPES = {
    "M": [4, 3],
    "m": [3, 4],

    "dim": [3,3], // diminished
    "dimM7": [3,3,5],
    "dim7": [3,3,3],

    "M6": [4, 3, 2],
    "m6": [3, 4, 2],

    "M7": [4, 3, 4],
    "7": [4, 3, 3],
    "m7": [3, 4, 3],
    "m7b5": [3, 3, 4],
  }

  // Chord.notes("C5", "M", 1) -> first inversion C major chord
  static notes(note, chordName, inversion=0, notesCount=0) {
    let [, root, octave] = note.match(/^([^\d]+)(\d+)$/);
    octave = +octave

    let intervals = Chord.SHAPES[chordName]

    if (notesCount == 0) {
      notesCount = intervals.length + 1
    }

    return new Chord(root, intervals).getRange(octave, notesCount, inversion)
  }

  constructor(root, intervals) {
    super(root)

    if (typeof(intervals) == "string") {
      intervals = Chord.SHAPES[intervals]
    }

    if (!intervals) {
      throw new Error("Missing intervals for chord")
    }

    this.steps = [...intervals]

    // add wrapping interval to get back to octave
    let sum = 0
    for (let i of this.steps) {
      sum += i
    }

    let rest = -sum
    while (rest < 0) {
      rest += OCTAVE_SIZE
    }

    this.steps.push(rest)
  }

  chordShapeName() {
    for (let shape in Chord.SHAPES) {
      let intervals = Chord.SHAPES[shape]
      if (this.steps.length - 1 != intervals.length) {
        continue
      }

      let match = true
      for (let k = 0; k < intervals.length; k++) {
        if (intervals[k] != this.steps[k]) {
          match = false
          break
        }
      }

      if (match) {
        return shape
      }
    }
  }
}


