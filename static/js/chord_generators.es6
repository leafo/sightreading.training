import {Chord, MajorScale, MinorScale, MajorBluesScale} from "st/music"
import {MersenneTwister} from "lib"

export class ChordGenerator {
  constructor(keySignature, opts={}) {
    this.noteCount = opts.notes || 3
    this.keySignature = keySignature
    if (opts.commonNotes > 0) {
      this.commonNotes = opts.commonNotes
    }

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
      if (this.keySignature.isChromatic()) {
        let shapes = this.noteCount == 3 ? ["M", "m"] : ["M7", "7", "m7"]
        shapes.forEach(s => {
          out.push(new Chord(root, s))
        })
      } else {
        let steps = this.scale.buildChordSteps(degree, this.noteCount - 1)
        out.push(new Chord(root, steps))
      }
    }

    return out
  }


  nextChord() {
    if (!this.chords) {
      this.chords = this.allChords()
    }

    let availableChords = []
    this.chords.forEach(chord => {
      if (this.lastChord == chord) {
        return
      }

      if (this.commonNotes && this.lastChord) {
        let common = this.lastChord.countSharedNotes(chord)
        if (common < this.commonNotes) {
          return
        }
      }

      availableChords.push(chord)
    })

    this.lastChord = availableChords[this.generator.int() % availableChords.length]
    return this.lastChord
  }
}
