
class SimpleRandomNotes {
  constructor() {
    this.generator = new MersenneTwister();
  }

  nextNote() {
    let available = ["C5", "D5", "E5", "F5", "G5", "A5", "B5", "C6", ["C5", "G5"]];
    return available[this.generator.int() % available.length]
  }
}

// for debugging staves
class StepNotes {
  constructor(min, max) {
    this.min = min || 60;
    this.max = max || min + 12;
    this.i = 0
  }

  nextNote() {
    let n = this.min + this.i++ % (this.min - this.max);
    let note = noteName(n);

    if (note.match(/[#b]/)) {
      // fix it to c for now
      return this.nextNote();
    }

    return note;
  }
}
