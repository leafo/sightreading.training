
import {MIDDLE_C_PITCH, parseNote, noteName} from "st/music"

export const NOTE_EVENTS = {
  [144]: "noteOn",
  [128]: "noteOff",
  [176]: "dataEntry"
}

export function parseMidiMessage(message) {
  let [raw, pitch, velocity] = message.data

  let channel = raw & 0xf
  let type = raw & 0xf0

  let n = noteName(pitch)

  if (NOTE_EVENTS[type] == "dataEntry") {
    return ["dataEntry"]
  }

  if (NOTE_EVENTS[type] == "noteOn") {
    if (velocity == 0) {
      return ["noteOff", n]
    } else {
      return ["noteOn", n, channel, velocity]
    }
  }

  if (NOTE_EVENTS[type] == "noteOff") {
    return ["noteOff", n]
  }
}

// takes input, transforms it into note events
export class MidiInput {
  constructor(opts={}) {
    this.sustainPedalEnabled = opts.sustainPedalEnabled
    this.heldNotes = {}
    this.sustainPedalOn = false
    this.opts = opts
  }

  noteOn(name, velocity) {
    if (this.heldNotes[name]) {
      return
    }

    this.heldNotes[name] = { held: true }

    if (this.opts.noteOn) {
      this.opts.noteOn(name, velocity)
    }
  }

  noteOff(name) {
    if (!this.heldNotes[name]) {
      return
    }

    if (this.sustainPedalOn) {
      this.heldNotes[name].held = false
      this.heldNotes[name].sustain = true
    } else {
      delete this.heldNotes[name]

      if (this.opts.noteOff) {
        this.opts.noteOff(name)
      }
    }
  }

  pedalOn() {
    if (!this.sustainPedalEnabled) { return }
    this.sustainPedalOn = true
  }

  pedalOff() {
    if (!this.sustainPedalEnabled || !this.sustainPedalOn) { return }
    this.sustainPedalOn = false

    // see who to turn off
    let toTurnOff = Object.keys(this.heldNotes).filter(name => this.heldNotes[name].sustain && !this.heldNotes[name].held)
    for (let name of toTurnOff) {
      delete this.heldNotes[name]

      if (this.opts.noteOff) {
        this.opts.noteOff(name)
      }
    }
  }

  onMidiMessage(message) {
    let [raw, pitch, velocity] = message.data;

    let cmd = raw >> 4,
      channel = raw & 0xf,
      type = raw & 0xf0;

    let n = noteName(pitch)

    if (NOTE_EVENTS[type] == "noteOn") {
      if (velocity == 0) {
        this.noteOff(n);
      } else if (!document.hidden) { // ignore when the browser tab isn't active
        this.noteOn(n, velocity);
      }
    }

    if (NOTE_EVENTS[type] == "noteOff") {
      this.noteOff(n);
    }

    if (NOTE_EVENTS[type] == "dataEntry") {
      if (pitch == 64) {
        if (velocity > 0) {
          this.pedalOn()
        } else {
          this.pedalOff()
        }
      }
    }
  }
}


export class MidiChannel {
  constructor(output, channel) {
    this.output = output

    if (channel > 15 || channel < 0) {
      throw "invalid channel:" + channel
    }

    this.channel = channel
  }

  setInstrument(programNumber) {
    this.output.send([
      (12 << 4) + this.channel,
      programNumber
    ])
  }

  playNoteList(list, delay=500) {
    list = [...list] // copy to avoid edits
    let idx = 0
    return new Promise((resolve) => {
      let playNextColumn = () => {
        if (idx >= list.length) {
          resolve()
          return
        }

        let col = list[idx]
        for (let note of col) {
          this.noteOn(parseNote(note), 100)
        }

        setTimeout(() => {
          let col = list[idx]
          for (let note of col) {
            this.noteOff(parseNote(note))
          }
          idx += 1
          playNextColumn()
        }, delay)
      }
      playNextColumn()
    })
  }

  testNote() {
    // play middle C for 1 second
    console.log("playing test note")
    this.noteOn(MIDDLE_C_PITCH, 100)
    setTimeout(() => {
      console.log("stopping test note")
      this.noteOff(MIDDLE_C_PITCH)
    }, 500)
  }

  noteOn(pitch, velocity) {
    this.output.send([
      (9 << 4) + this.channel,
      pitch,
      velocity
    ])
  }

  noteOff(pitch) {
    this.output.send([
      (8 << 4) + this.channel,
      pitch,
      0
    ])
  }

  getMetronome() {
    return new Metronome(this.output)
  }
}

export class Metronome extends MidiChannel {
  constructor(output) {
    super(output, 9)
  }

  hit(n, v=100) {
    this.noteOn(n, v)
    setTimeout(() => this.noteOff(n), 10)
  }

  tick() {
    this.hit(75)
  }

  tock() {
    this.hit(76)
  }
}

