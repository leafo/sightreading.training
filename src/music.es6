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

export function noteName(pitch) {
  let octave = Math.floor(pitch / OCTAVE_SIZE)
  let offset = pitch - octave * OCTAVE_SIZE

  let name = OFFSETS[offset]
  if (!name) {
    name = OFFSETS[offset - 1] + "#"
  }

  return `${name}${octave}`;
}


export function parseNote(note) {
  let [, letter, accidental, octave] = note.match(/^(\w)(#|b)?(\d+)$/);
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

export function letterOffset(pitch) {
  let offset = 0

  while (pitch >= 12) {
    offset += 7
    pitch -= 12
  }

  while (LETTER_OFFSETS[pitch] == undefined) {
    pitch -= 1
  }

  return offset + LETTER_OFFSETS[pitch]
}

export function addInterval(note, halfSteps) {
  return noteName(parseNote(note) + halfSteps);
}

// F C G D A E B Gb Db Ab Eb Bb
export function keySignatureNotes(octave, count) {
  if (count == 0) {
    return [];
  }

  if (count > 0) {
    let notes = [`F${octave}`];
    while (count > 1) {
      count -= 1;
      notes.push(addInterval(notes[notes.length - 1], 7));
    }

    return notes;
  }

  if (count < 0) {
    count = -1 * count;

    let notes = [`B${octave}`];
    while (count > 1) {
      count -= 1;
      notes.push(addInterval(notes[notes.length - 1], -7));
    }

    return notes;
  }
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

export class Scale {
  // root should be letter without octave
  constructor(root) {
    if (!root.match(/^[A-G][b#]?$/)) {
      throw "scale root not properly formed"
    }

    this.root = root;
  }

  getFullRange() {
    return this.getRange(0, (this.steps.length + 1) * 8);
  }

  getLooseRange(min, max) {
    return this.getFullRange().filterByRange(min, max);
  }

  getRange(octave, count=this.steps.length+1, offset=0) {
    let current = parseNote(`${this.root}${octave}`);
    let range = new NoteList;

    let k = 0;

    for (let i = 0; i < count + offset; i++) {
      if (i >= offset) {
        range.push(noteName(current));
      }
      current += this.steps[k++ % this.steps.length];
    }

    return range;
  }
}

export class MajorScale extends Scale {
  constructor(root) {
    super(root);
    this.steps = [2, 2, 1, 2, 2, 2, 1];
  }
}

