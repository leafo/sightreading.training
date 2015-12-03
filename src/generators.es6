
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

class RandomNotes {
  constructor(notes) {
    this.notes = notes;
    this.generator = new MersenneTwister();
  }

  nextNote() {
    return this.notes[this.generator.int() % this.notes.length];
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

class MiniSteps {
  constructor(notes) {
    this.notes = notes;
    this.generator = new MersenneTwister();
  }

  nextStep() {
    return {
      position: this.generator.int() % this.notes.length,
      remaining: 2 + this.generator.int() % 2,
      direction: this.generator.int() % 2 == 0 ? 1 : -1,
    };
  }

  nextNote() {
    if (!this.currentStep || this.currentStep.remaining == 0) {
      this.currentStep = this.nextStep();
    }

    let position = this.currentStep.position + this.notes.length;
    this.currentStep.position += this.currentStep.direction;
    this.currentStep.remaining -= 1;

    return this.notes[position % this.notes.length];
  }
}

class Double {
  constructor(upper, lower) {
    this.upperNotes = upper;
    this.lowerNotes = lower;

    this.generator = new MersenneTwister();
  }

  nextNote() {
    return [
      this.upperNotes[this.generator.int() % this.upperNotes.length],
      this.lowerNotes[this.generator.int() % this.lowerNotes.length]
    ];
  }
}

