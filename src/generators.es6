
export class RandomNotes {
  constructor(notes) {
    this.notes = notes;
    this.generator = new MersenneTwister();
  }

  nextNote() {
    return this.notes[this.generator.int() % this.notes.length];
  }
}

// for debugging staves
export class StepNotes {
  constructor(notes) {
    this.notes = notes;
    this.i = 0
  }

  nextNote() {
    return this.notes[this.i++ % this.notes.length];
  }
}

export class MiniSteps {
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

export class Double {
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

