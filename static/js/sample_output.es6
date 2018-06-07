
import {noteName, parseNote} from "st/music"
import {Soundfont} from "lib"

export class SampleOutput {
  static getInstance() {
    if (!this.instance) {
      this.instance = new SampleOutput()
    }
    return this.instance
  }

  constructor(instrumentName="acoustic_grand_piano") {
    this.loading = true
    this.currentlyPlaying = {}

    this.promise = Soundfont.instrument(
      new AudioContext(),
      instrumentName
    )
      
    this.promise.then((instrument) => {
      this.loading = false
      this.instrument = instrument
    })
  }

  noteOn(pitch, velocity) {
    if (!this.instrument) {
      return
    }

    let note = noteName(pitch - 12)
    this.noteOff(pitch)

    if (velocity == 0) { return }

    this.currentlyPlaying[pitch] = this.instrument.play(note, 0, {
      gain: velocity / 127
    })
  }

  noteOff(pitch) {
    let node = this.currentlyPlaying[pitch]
    if (node) {
      delete this.currentlyPlaying[pitch]
      node.stop()
    }
  }

  getMetronome() {
    if (!this.metronome) {
      this.metronome = new SampleOutputMetronome()
    }
    return this.metronome
  }
}

export class SampleOutputMetronome extends SampleOutput {
  constructor() {
    super("woodblock")
  }

  tick() {
    this.noteOn(parseNote("G5"), 100)
  }

  tock() {
    this.noteOn(parseNote("C5"), 70)
  }
}
