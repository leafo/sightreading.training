import {Chord, MajorScale, MinorScale, MajorBluesScale, HarmonicMinorScale, KeySignature} from "st/music"
import {MersenneTwister} from "lib"
import {dithered, shuffled} from "st/util"

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
        case "natural minor":
          this.scale = new MinorScale(keySignature.name())
          break
        case "harmonic minor":
          this.scale = new HarmonicMinorScale(keySignature.name())
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
    if (!this.keySignature.isChromatic()) {
      return this.scale.allChords(this.noteCount)
    }

    let out = []

    let shapes = this.noteCount == 3 ? ["M", "m"] : ["M7", "7", "m7"]
    for (let i = 0; i < this.scale.steps.length; i++) {
      let degree = i + 1
      let root = this.scale.degreeToName(degree)

      shapes.forEach(s => {
        out.push(new Chord(root, s))
      })
    }

    return out
  }


  nextChord() {
    if (!this.chords) {
      this.chords = this.allChords()
      this.chordOccurrences = new Map
    }

    let availableChords = []
    this.chords.forEach(chord => {
      if (this.lastChord && (this.lastChord.toString() == chord.toString())) {
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

    let groupedByOccurence = {}
    availableChords.forEach(chord => {
      let count = this.chordOccurrences.get(chord.toString()) || 0;
      groupedByOccurence[count] = groupedByOccurence[count] || []
      groupedByOccurence[count].push(chord)
    })

    let chordGroups = Object.keys(groupedByOccurence).map(key =>
      [+key, shuffled(groupedByOccurence[key], this.generator)]
    )

    chordGroups.sort((a,b) => a[0] - b[0])
    availableChords = chordGroups.reduce((list, group) => list.concat(group[1]), [])

    this.lastChord = dithered(availableChords, 3, this.generator)[0]
    this.chordOccurrences.set(this.lastChord.toString(), (this.chordOccurrences.get(this.lastChord.toString()) || 0) + 1)

    return this.lastChord
  }
}

// chord generator that moves between all keys
export class MultiKeyChordGenerator extends ChordGenerator {
  constructor(keySignature, opts={}) {
    super(keySignature, opts)

    let keys = KeySignature.allKeySignatures()
    this.chordToKeys = {}
    for (let key of keys) {
      for (let chord of new MajorScale(key).allChords(this.noteCount)) {
        let cName = chord.toString()
        this.chordToKeys[cName] = this.chordToKeys[cName] || []
        this.chordToKeys[cName].push(key)
      }
    }
  }

  // find another key that uses the chord, that isn't the current key
  changeKeyFromChord(chord=this.lastChord) {
    // common key modulation
    let keys = this.chordToKeys[chord.toString()]

    keys = keys.filter(key => key.name() != this.keySignature.name())
    if (!keys.length) {
      // some chords are only in one key
      return
    }

    let newKey = keys[this.generator.int() % keys.length]

    // console.warn(`Going from ${this.keySignature.name()} to ${newKey.name()}`)
    this.keySignature = newKey
    this.scale = this.keySignature.defaultScale()
    this.chords = null
  }

  nextChord() {
    if (this.lastChord) {
      // time to change keys?
      let r = this.generator.random()

      if (r < 0.2) {
        if (this.lastChord.isDominant() && r < 0.15) {
          let targets = this.lastChord.getSecondaryDominantTargets(this.noteCount)

          targets = targets.filter(t => {
            let name = t.toString()
            return !this.chords.find(other => other.toString() == name)
          })

          let target = targets[this.generator.int() % targets.length]
          this.changeKeyFromChord(target)
        } else {
          this.changeKeyFromChord(this.lastChord)
        }
      }
    }

    return super.nextChord()
  }
}

