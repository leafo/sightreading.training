
import {notesLessThan, notesSame, parseNote, noteStaffOffset, MajorScale} from "st/music"

const minimumDifference = (note, col) =>
  col.reduce((k, cNote) => {
    const diff = Math.abs(noteStaffOffset(cNote) - noteStaffOffset(note))
    if (k != null) {
      return Math.min(k, diff)
    } else {
      return diff
    }
  }, null)

export default class NoteList extends Array {
  constructor(notes, opts={}) {
    super();
    Object.setPrototypeOf(this, NoteList.prototype);

    if (opts.generator) {
      this.generator = opts.generator
    }

    if (notes && notes.length) {
      this.push.apply(this, notes);
    }

    // let scale = new MajorScale("C");
    // // this.generator = new StepNotes(scale.getRange(3, 24, 2));
    // // this.generator = new RandomNotes(scale.getRange(3, 24, 2));
    // // this.generator = new MiniSteps(scale.getRange(3, 24, 2));
    // this.generator = new Double(scale.getRange(3, 10, 2), scale.getRange(5, 12));
  }

  clone() {
    // this assumes that the individual note/columns are immutable
    let list = new NoteList(this, {
      generator: this.generator
    })

    return list
  }

  filterByRange(min, max) {
    return new NoteList(this.filter(function(n) {
      if (notesLessThan(n, min)) {
        return false;
      }

      if (notesLessThan(max, n)) {
        return false;
      }

      return true;
    }));
  }


  // splits into two note lists suitable for rendering into grand
  // staff. Attempts to prioritize ledger lines for notes that appear
  // to be related voices
  splitForGrandStaff() {
    const trebleNotes = new NoteList()
    const bassNotes = new NoteList()

    const maxLedger = 4 // note must be within this many rows of middle C to be eligible for sticking to the same staff
    const maxJump = 4

    // the center between the treble and bass cleffs
    const middleC = noteStaffOffset("C5")

    this.forEach((column, idx) => {
      if (typeof column == "string") {
        column = [column]
      }

      const tCol = []
      const bCol = []

      for (const note of column) {
        const noteRow = noteStaffOffset(note)

        if (idx > 0 && Math.abs(middleC - noteRow) <= maxLedger) {
          // find out how close we are to the previous column's treble and bass
          // assignments
          const tDist = minimumDifference(note, trebleNotes[idx - 1])
          const bDist = minimumDifference(note, bassNotes[idx - 1])

          if (tDist != null && tDist <= maxJump && (bDist == null || tDist < bDist)) {
            tCol.push(note)
            continue
          } else if (bDist != null && bDist <= maxJump && (tDist == null || bDist < tDist)) {
            bCol.push(note)
            continue
          }
        }

        if (noteRow >= middleC) {
          tCol.push(note)
        } else {
          bCol.push(note)
        }
      }

      trebleNotes.push(tCol)
      bassNotes.push(bCol)
    })

    return [trebleNotes, bassNotes]
  }

  // TODO: there's no point in having this array hold the generator, this
  // method should just take a generator instance
  pushRandom() {
    return this.push(this.generator.nextNote());
  }

  fillBuffer(count) {
    for (let i = 0; i < count; i++) {
      this.pushRandom();
    }
  }

  // must be an array of notes
  matchesHead(notes, anyOctave=false) {
    let first = this[0]

    if (!Array.isArray(notes)) {
      throw new Error("matchesHead: notes should be an array")
    }

    if (Array.isArray(first)) {
      if (first.length != notes.length) {
        return false;
      }
      if (anyOctave) {
        let noteSet = {}
        notes.forEach((n) => noteSet[n.replace(/\d+$/, "")] = true)
        return first.every((n) => noteSet[n.replace(/\d+$/, "")])
      } else {
        const pitches = notes.map(parseNote)
        return first.map(parseNote).every((n) => pitches.indexOf(n) >= 0)
      }
    } else {
      if (anyOctave) {
        return notes.length == 1 && notesSame(notes[0], first)
      } else {
        return notes.length == 1 && parseNote(notes[0]) == parseNote(first)
      }

    }
  }

  currentColumn() {
    let first = this[0];
    if (Array.isArray(first)) {
      return first;
    } else {
      return [first];
    }
  }

  // if single note is in head
  inHead(note) {
    let first = this[0];
    if (Array.isArray(first)) {
      return first.some((n) => n == note);
    } else {
      return note == first
    }
  }

  toString() {
    return this.map((n) => n.join(" ")).join(", ")
  }

  // converts it to serialize list of note numbers for quick comparisons
  toNoteString() {
    return this.map((n) => n.map(parseNote).join(" ")).join(", ")
  }
}

