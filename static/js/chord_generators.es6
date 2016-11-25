
class ChordGenerator {
  constructor(keySignature, opts={}) {
    this.generator = new MersenneTwister()
    this.scale = new MajorScale(keySignature.name())
  }

  nextChord() {
    let degree = (this.generator.int() % this.scale.steps.length) + 1
    let steps = this.scale.buildChordSteps(degree, 2)
    let root = this.scale.degreeToName(degree)

    return new Chord(root, steps)
  }
}
