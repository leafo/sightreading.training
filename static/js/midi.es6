export const MIDDLE_C_PITCH = 60

export const NOTE_EVENTS = {
  [144]: "noteOn",
  [128]: "noteOff"
}

export class MidiChannel {
  constructor(output, channel) {
    this.output = output

    if (channel > 15 || channel < 0) {
      throw "invalid channel:" + channel
    }

    this.channel = channel
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
      9 << 4 + this.channel,
      pitch,
      velocity
    ])
  }

  noteOff(pitch) {
    this.output.send([
      8 << 4 + this.channel,
      pitch,
      0
    ])
  }
}

