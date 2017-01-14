
import {parseNote, noteName, MajorScale, Chord} from "st/music"
import {MersenneTwister} from "lib"

export function testRandomNotes() {
  let scale = new MajorScale("C")
  // let notes = scale.getLooseRange("A4", "C7")
  let notes = scale.getLooseRange("C3", "C7")

  let r = new RandomNotes(notes, {})

  let totalCount = 0
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
    totalCount += 1
  }

  console.log("total", totalCount, counts)
  let ratios = {}

  for (let note of notes) {
    ratios[note] = counts[note] / totalCount * 100
  }

  console.log("ratios", ratios)
}


export function testSkewRand(iterations=1) {
  let r = new RandomNotes([], {})
  let counts = {}

  let totalCount = 0
  for (let i = 0; i < 10000; i++) {
    let k = r.skewRand(5, iterations)
    counts[k] = (counts[k] || 0) + 1
    totalCount++
  }

  console.log(counts)
}


class Generator {
  constructor(opts={}) {
    this.smoothness = opts.smoothness || 0
  }

  averagePitch(notes) {
    if (notes.length == 0) {
      throw new Error("trying to find average of empty note list")
    }

    let pitches = notes.map(parseNote)
    return pitches.reduce((a, b) => a + b, 0) / pitches.length
  }

  _nextNote() {
    throw new Error("missing _nextNote implementation")
  }

  nextNote() {
    return this.nextNoteSmooth(this.smoothness + 1, this._nextNote.bind(this))
  }

  // sort by minimizing min pitch difference
  sortedCandidatesIndividual(iterations=1, nextNote) {
    if (iterations == 1) {
      return nextNote()
    }

    if (!this.lastNotes) {
      this.lastNotes = nextNote()
      return this.lastNotes
    }

    let pitches = this.lastNotes.map(parseNote)

    let candidates = []
    for (let i = 0; i < iterations; i++) {
      let c = nextNote()
      let score = 0

      for (let n of c) {
        let scores = pitches.map(p => Math.abs(p - parseNote(n)))
        score += Math.min(...scores)
      }

      candidates.push([score, c])
    }

    candidates.sort(([a], [b]) => a - b)
    return candidates
  }

  // sorts by minimizing average pitch
  sortedCandidatesAverage(iterations, nextNote) {
    let target = this.averagePitch(this.lastNotes)

    let candidates = []
    for (let i = 0; i < iterations; i++) {
      let c = nextNote()
      let avg = this.averagePitch(c)

      candidates.push([
        Math.abs(avg - target), c
      ])
    }

    candidates.sort(([a], [b]) => a - b)
    return candidates
  }

  nextNoteSmooth(iterations=1, nextNote) {
    // not smoothing, don't care
    if (iterations == 1) {
      return nextNote()
    }

    if (!this.lastNotes) {
      this.lastNotes = nextNote()
      return this.lastNotes
    }

    let candidates = this.sortedCandidatesIndividual(iterations, nextNote)
    let out = candidates[0][1] // abandon case

    for (let [diff, notes] of candidates) {
      // no repeats
      if (diff == 0 && notes.sort().join("-") == this.lastNotes.sort().join("-")) {
        continue
      }

      out = notes
      break
    }

    this.lastNotes = out
    return out
  }
}

export class RandomNotes extends Generator {
  handSize = 11

  constructor(notes, opts={}) {
    super(opts)
    this.generator = new MersenneTwister()
    this.notes = notes
    this.notesPerColumn = opts.notes || 1
    this.scale = opts.scale
    this.hands = opts.hands || 2
  }

  // divide up items into n groups, pick a item from each group
  // items: list of items
  // n: number of groups (and items selected)
  pickNDist(items, n) {
    if (!items.length) {
      return []
    }

    if (n == 0) {
      return []
    }

    if (n == 1) {
      return [items[this.generator.int() % items.length]]
    }

    let groups = []

    for (let k = 0; k < items.length; k++) {
      let group = Math.min(n - 1, Math.floor(k / (items.length - 1) * n))

      if (!groups[group]) {
        groups[group] = []
      }

      groups[group].push(items[k])
    }

    return groups.map(g => g[this.generator.int() % g.length])
  }

  getNotesForHand(pitches, left) {
    let start = pitches[0] + left
    return pitches.map(p => p - start)
      .filter(p => p >= 0 && p < this.handSize)
      .map(p => p + start) // put it back
  }

  // generate random number [0,n[ with skew towards 0 based on normal dist
  // iterations controls how normal the normal dist is, 1 is flat dist
  skewRand(n, iterations=1) {
    let r = 0

    for (let i = 0; i < iterations; i++) {
      r += this.generator.random()
    }

    // from 0 to 1 with bias towards 0
    r = Math.abs((r / iterations - 0.5) * 2)
    return Math.floor(n * r)
  }

  handGroups(notes=this.notes) {
    let pitches = notes.map(parseNote)
    pitches.sort((a, b) => a - b)

    let range = pitches[pitches.length - 1] - pitches[0]

    // rake a random hand if we only need one
    if (this.hands == 1) {
      let rootRange = range - this.handSize
      return [
        this.getNotesForHand(pitches, this.generator.int() % rootRange).map(noteName)
      ]
    }

    // how much space between hands if hands are at ends
    let handSpace = range - 2 * this.handSize + 1
    let firstHandMovement = handSpace > 0 ? this.skewRand(handSpace, 2) : 0
    let remainingSpace = handSpace - firstHandMovement
    let secondHandMovement = remainingSpace > 0 ? this.skewRand(remainingSpace, 2) : 0

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

  notesInRandomChord() {
    let degree = 1 + this.generator.int() % this.scale.steps.length
    let steps = this.scale.buildChordSteps(degree, 3) // seven chords
    let chord = new Chord(this.scale.degreeToName(degree), steps)
    this.lastChord = chord
    return this.notes.filter(n => chord.containsNote(n))
  }

  nextNoteWithoutAnnotation() {
    this.lastChord = null
    let notes = this.scale ? this.notesInRandomChord() : this.notes

    if (this.notesPerColumn < (this.hands == 1 ? 2 : 3)) {
      // skip the hand stuff since it messes with the distribution
      return this.pickNDist(notes, this.notesPerColumn)
    }

    let hands = this.handGroups(notes)

    if (hands.length == 1) {
      return this.pickNDist(hands[0], this.notesPerColumn)
    }

    // take some notes from each hand group
    let notesForLeft = Math.floor(this.notesPerColumn / 2)
    let notesForRight = Math.floor(this.notesPerColumn / 2)

    // odd amount, randomly assign last note
    if (this.notesPerColumn % 2 == 1) {
      if (this.generator.int() % 2 == 0) {
        notesForLeft += 1
      } else {
        notesForRight += 1
      }
    }

    return this.pickNDist(hands[0], notesForLeft)
      .concat(this.pickNDist(hands[1], notesForRight))
  }

  _nextNote() {
    let out = this.nextNoteWithoutAnnotation()

    // // how to annotate chords:
    // if (this.lastChord) {
    //   out.annotation = this.lastChord.root + this.lastChord.chordShapeName()
    // }

    return out
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

export class ShapeGenerator extends Generator {
  constructor(opts) {
    super(opts)
    this.generator = new MersenneTwister()
  }

  _nextNote() {
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
  constructor(notes, opts) {
    super(opts)
    this.notes = notes
    this.shapes = this.inversions([0,2,4])
  }
}

export class SevenOpenNotes extends ShapeGenerator {
  constructor(notes, opts) {
    super(opts)

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

export class ProgressionGenerator extends Generator {
  constructor(scale, range, progression, opts) {
    super(opts)
    this.position = 0
    this.progression = progression
    this.generator = new MersenneTwister()
    this.scale = scale;
    this.range = range;

    // calculate all the roots we can use to build chords on top of
    let roots = scale.getLooseRange(...range)
    this.rootsByDegree = {}

    for (let r of roots) {
      let degree = scale.getDegree(r)
      this.rootsByDegree[degree] = this.rootsByDegree[degree] || []
      this.rootsByDegree[degree].push(r)
    }
  }

  _nextNote() {
    let [degree, shape] = this.progression[this.position % this.progression.length]
    this.position += 1

    let name = this.scale.degreeToName(degree)
    let chord = new Chord(name, shape)
    let notes = this.scale.getLooseRange(...this.range).filter(n => chord.containsNote(n))

    let notesPerChord = 4
    let starts = notes.length - notesPerChord

    let p = this.generator.int() % starts

    return notes.slice(p, p + notesPerChord)
  }

  nextNoteOld() {
    let [degree, chord] = this.progression[this.position % this.progression.length]
    let availableRoots = this.rootsByDegree[degree]
    this.position += 1

    if (!availableRoots) {
      throw new Error("chord doesn't fit in scale range")
    }

    // console.log("availalbe roots", availableRoots)
    // console.log(chord)

    return Chord.notes(availableRoots[this.generator.int() % availableRoots.length], chord)
  }
}

// a generator that generates series of notes from positions
export class PositionGenerator extends Generator {
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      let j = this.generator.int() % (i+1)
      let a = array[j]
      let b = array[i]
      array[i] = a
      array[j] = b
    }

    return array
  }

  constructor(notes, opts) {
    super(opts)
    this.notes = notes
    this.generator = new MersenneTwister()
  }

  getFingerSet() {
    // choose a finger
    let offset = this.generator.int() % (this.notes.length - 5)
    return [0].concat(this.shuffle([1,2,3,4])).map(i => this.notes[offset + i])
  }

  nextNote() {
    let first = false

    if (!this.fingerSet || !this.fingerSet.length) {
      this.fingerSet = this.getFingerSet()
      first = true
    }

    let out = [this.fingerSet.shift()]
    if (first) {
      out.annotation = "1"
    }

    return out
  }
}


