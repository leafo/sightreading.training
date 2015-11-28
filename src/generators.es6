
class Scale {
  // root should be letter without octave
  constructor(root) {
    if (!root.match(/^[A-C][b#]?$/)) {
      throw "scale root not properly formed"
    }

    this.root = root;
  }

  getRange(octave, count, offset=0) {
    let current = parseNote(`${this.root}${octave}`);
    let range = [];

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

class MajorScale extends Scale {
  constructor(root) {
    super(root);
    this.steps = [2, 2, 1, 2, 2, 2, 1];
  }
}

class SimpleRandomNotes {
  constructor() {
    this.generator = new MersenneTwister();
  }

  nextNote() {
    let available = new MajorScale("C").getRange(4, 16);
    return available[this.generator.int() % available.length]
  }
}

// for debugging staves
class StepNotes {
  constructor(notes) {
    this.notes = notes;
    this.i = 0
  }

  nextNote() {
    return this.notes[this.i++ % this.notes.length];
  }
}
