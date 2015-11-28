const MIDDLE_C_PITCH = 60
const OCTAVE_SIZE = 12

const NOTE_EVENTS = {
  [144]: "noteOn",
  [128]: "noteOff"
}

const OFFSETS = {
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

const LETTER_OFFSETS = {
  [0]: 0,
  [2]: 1,
  [4]: 2,
  [5]: 3,
  [7]: 4,
  [9]: 5,
  [11]: 6
}

function noteName(pitch) {
  let octave = Math.floor(pitch / OCTAVE_SIZE)
  let offset = pitch - octave * OCTAVE_SIZE

  let name = OFFSETS[offset]
  if (!name) {
    name = OFFSETS[offset - 1] + "#"
  }

  return `${name}${octave}`;
}

function parseNote(note) {
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

function letterOffset(pitch) {
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

class NoteList {
  constructor(notes) {
    this.notes = notes || [];
    // this.generator = new SimpleRandomNotes();
    let scale = new MajorScale("C");
    this.generator = new StepNotes(scale.getRange(3, 24, 2));
  }

  push(column) {
    this.notes.push(column);
  }

  pushRandom() {
    return this.push(this.generator.nextNote());
  }

  shift() {
    return this.notes.shift();
  }

  map(callback) {
    return this.notes.map(callback);
  }

  // must be an array of notes
  matchesHead(notes) {
    let first = this.notes[0];
    if (Array.isArray(first)) {
      if (first.length != notes.length) {
        return false;
      }
      return first.every((n) => notes.indexOf(n) >= 0);
    } else {
      return notes.length == 1 && notes[0] == first;
    }
  }

  // if single note is in head
  inHead(note) {
    let first = this.notes[0];
    if (Array.isArray(first)) {
      return first.some((n) => n == note);
    } else {
      return note == first
    }
  }
}


