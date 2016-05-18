
export function testRandomNotes() {
  let scale = new MajorScale("C")
  // let notes = scale.getLooseRange("A4", "C7")
  let notes = scale.getLooseRange("C3", "C7")

  let r = new RandomNotes(notes, {})

  let total_count = 0
  let counts = {}
  for (let note of notes) {
    counts[note] = 0
  }

  for (let i = 0; i < 10000; i++) {
    for (let group of r.handGroups()) {
      for (let n of group) {
        counts[n] += 1
      }
    }
    total_count += 1
  }

  console.log("total", total_count, counts)
  let ratios = {}

  for (let note of notes) {
    ratios[note] = counts[note] / total_count * 100
  }

  console.log("ratios", ratios)
}

// TODO: add hand size
export class RandomNotes {
  handSize = 11

  constructor(notes, opts={}) {
    this.generator = new MersenneTwister()
    this.notes = notes
    this.scale = opts.scale

    const groupsCount = opts.notes || 1
    this.groups = []

    if (groupsCount == 1) {
      this.groups.push(this.notes)
    } else {
      const groupSize = Math.floor(this.notes.length / groupsCount)
      if (groupSize < 1) {
        throw new Error("Invalid notes size for number of notes")
      }

      for (let i = 0; i < groupsCount; i++) {
        if (i == groupsCount - 1) {
          this.groups.push(this.notes.slice(i * groupSize))
        } else {
          this.groups.push(this.notes.slice(i * groupSize, (i + 1) * groupSize))
        }
      }
    }

    this.handGroups()
  }


  // divide up items into n groups, pick a item from each group
  pickNDist(items, n) {
  }

  getNotesForHand(pitches, left) {
    let start = pitches[0] + left
    return pitches.map(p => p - start)
      .filter(p => p >= 0 && p < this.handSize)
      .map(p => p + start) // put it back
  }

  handGroups() {
    let pitches = this.notes.map(parseNote)
    pitches.sort((a, b) => a - b)

    let range = pitches[pitches.length - 1] - pitches[0]

    // how much space between hands if hands are at ends
    let handSpace = range - 2 * this.handSize + 1
    let firstHandMovement = handSpace > 0 ? this.generator.int() % handSpace : 0
    let remainingSpace = handSpace - firstHandMovement
    let secondHandMovement = remainingSpace > 0 ? this.generator.int() % remainingSpace : 0

    let rightHandStart = range - this.handSize + 1
    let moveLeftFirst = this.generator.int() % 2 == 0

    let leftHand, rightHand

    if (moveLeftFirst) {
      leftHand = this.getNotesForHand(pitches, firstHandMovement)
      rightHand = this.getNotesForHand(pitches, rightHandStart - secondHandMovement)
    } else {
      leftHand = this.getNotesForHand(pitches, secondHandMovement)
      rightHand = this.getNotesForHand(pitches, rightHandStart - firstHandMovement)
    }

    // resolve overlaps
    if (leftHand[leftHand.leftHand - 1] > rightHand[0]) {
      console.warn("fixing overlap")
      let mid = leftHand[leftHand.leftHand - 1] + rightHand[0] / 2
      leftHand = leftHand.filter(n => n <= mid)
      rightHand = rightHand.filter(n => n > mid)
    }

    return [
      leftHand.map(noteName),
      rightHand.map(noteName),
    ]
  }

  nextNote() {
    // if we have a scale then we generate each column using notes from a
    // random chord in the scale
    if (this.scale) {
      let degree = 1 + this.generator.int() % this.scale.steps.length
      let steps = this.scale.buildChordSteps(degree, 3) // seven chords
      let chord = new Chord(this.scale.degreeToName(degree), steps)
      return this.groups.map(g => {
        let notes = g.filter(n => chord.containsNote(n))
        return notes[this.generator.int() % notes.length]
      })

    } else {
      return this.groups.map(g => g[this.generator.int() % g.length])
    }
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

  nextNote() {
    let [degree, chord] = this.progression[this.position % this.progression.length]
    let availableRoots = this.rootsByDegree[degree]
    this.position += 1

    if (!availableRoots) {
      throw new Error("chord doesn't fit in scale range")
    }

    return Chord.notes(availableRoots[0], chord)
  }
}

