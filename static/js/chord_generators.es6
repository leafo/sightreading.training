
class ChordGenerator {
  constructor(keySignature, opts={}) {
    this.noteCount = opts.notes

    this.generator = new MersenneTwister()

    switch (opts.scale) {
      case "major":
        this.scale = new MajorScale(keySignature.name())
        break
      case "minor":
        this.scale = new MinorScale(keySignature.name())
        break
      case "major blues":
        this.scale = new MajorBluesScale(keySignature.name())
        break
    }

  }

  nextChord() {
    let degree

    while (true) {
      degree = (this.generator.int() % this.scale.steps.length) + 1
      if (degree != this.lastDegree) {
        break
      }
    }

    this.lastDegree = degree

    let steps = this.scale.buildChordSteps(degree, this.noteCount - 1)
    let root = this.scale.degreeToName(degree)

    return new Chord(root, steps)
  }
}
