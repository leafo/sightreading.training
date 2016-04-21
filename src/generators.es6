
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
export class SweepRangeNotes {
  constructor(notes) {
    this.notes = notes;
    this.i = 0;
    this.ascending = true;
  }

  nextNote() {
    if (this.i < 0) {
      this.i = 1;
      this.ascending = !this.ascending;
    }

    if (this.i >= this.notes.length) {
      this.i = this.notes.length - 2;
      this.ascending = !this.ascending;
    }

    if (this.ascending) {
      return this.notes[this.i++ % this.notes.length];
    } else {
      return this.notes[this.i-- % this.notes.length];
    }
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

export class DualRandomNotes {
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


export class ShapeGenerator {
  constructor() {
    this.generator = new MersenneTwister()
  }

  nextNote() {
    let shape = this.shapes[this.generator.int() % this.shapes.length]
    let shapeMax = Math.max(...shape)

    if (shapeMax > this.notes.length) {
      throw "shape too big for available notes";
    }

    let bass = this.generator.int() % (this.notes.length - shapeMax)

    return shape.map((offset) => this.notes[(bass + offset) % this.notes.length])
  }

  // get the shape and all the inversions for it
  inversions(shape) {
    shape = [...shape]
    shape.sort((a,b) => a - b)

    let out = [shape]
    let count = shape.length - 1

    while (count > 0) {
      let dupe = [...out[out.length - 1]]
      dupe.push(dupe.shift() + 7)
      dupe.sort((a,b) => a - b)

      while (dupe[0] > 0) {
        for (let i in dupe) {
          dupe[i] -= 1
        }
      }
      out.push(dupe)
      count--;
    }

    return out
  }
}

export class TriadNotes extends ShapeGenerator {
  constructor(notes) {
    super()
    this.notes = notes
    this.shapes = this.inversions([0,2,4])
  }
}

export class SevenOpenNotes extends ShapeGenerator {
  constructor(notes) {
    super()
    this.notes = notes;
    // some random inversions spaced apart
    this.shapes = [
      // root on bottom 
      [0, 4, 9, 13],
      [0, 6, 9, 11],

      // third on bottom
      [2 - 2, 6 - 2, 11 - 2, 14 - 2],
      [2 - 2, 7 - 2, 11 - 2, 13 - 2],

      // fifth on bottom
      [4 - 4, 6 - 4, 9 - 4, 14 - 4],
      [4 - 4, 7 - 4, 9 - 4, 13 - 4],

    ]
  }
}

export class ProgressionGenerator {
  constructor(scale, range, progression) {
    this.position = 0
    this.progression = progression
    this.generator = new MersenneTwister()

    // calculate all the roots we can use to build chords on top of
    let roots = scale.getLooseRange(...range)
    this.rootsByDegree = {}

    for (let r of roots) {
      let degree = scale.getDegree(r)
      this.rootsByDegree[degree] = this.rootsByDegree[degree] || []
      this.rootsByDegree[degree].push(r)
    }
  }

  buildChord(root, intervals) {
    return intervals.map((i) => noteName(parseNote(root) + i))
  }

  buildInversion(root, intervals, inv) {
    if (inv == 0) {
      return buildChord(root, intervals)
    } else if (inv > 0) {
      let expanded = this.buildChord(root, intervals).concat(this.buildChord(addInterval(root, OCTAVE_SIZE), intervals))
      return expanded.slice(inv, inv + intervals.length)
    } else {
      let expanded = this.buildChord(addInterval(root, -OCTAVE_SIZE), intervals).concat(this.buildChord(root, intervals))
      let start = intervals.length + inv
      return expanded.slice(start, start + intervals.length)
    }
  }

  nextNote() {
    let [degree, chord] = this.progression[this.position % this.progression.length]
    this.position += 1

    let chordIntervals = CHORDS[chord]

    if (!chordIntervals) {
      throw new Error("invalid chord: " + chord)
    }

    let availableRoots = this.rootsByDegree[degree]

    if (!availableRoots) {
      throw new Error("chord doesn't fit in scale range")
    }

    return this.buildInversion(availableRoots[0], chordIntervals, -1)
  }
}

