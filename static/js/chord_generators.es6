import {Chord, MajorScale, MinorScale, MajorBluesScale} from "st/music"
import {MersenneTwister} from "lib"

export class ChordGenerator {
  constructor(keySignature, opts={}) {
    this.noteCount = opts.notes || 3

    this.generator = new MersenneTwister()

    if (keySignature.isChromatic()) {
      this.scale = keySignature.defaultScale()
    } else {
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
        default:
          this.scale = keySignature.defaultScale()
      }
    }
  }

  allChords() {
    let out = []

    for (let i = 0; i < this.scale.steps.length; i++) {
      let degree = i + 1

      let root = this.scale.degreeToName(degree)
      let steps = this.scale.buildChordSteps(degree, this.noteCount - 1)
      out.push(new Chord(root, steps))
    }

    return out
  }

  nextChord() {
    let degree = null

    for (;;) {
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
